"""
Real-Time Car Parking Occupancy Detection
==========================================
Uses Roboflow Inference SDK (local) + OpenCV + Supervision
Model: real-time-car-parking/4  (Roboflow Universe)

Author : Auto-generated production script
Date   : 2026-04-22
"""

import os
import sys
import time
from typing import Tuple

from dotenv import load_dotenv
from pathlib import Path
env_path = Path(__file__).resolve().parent / "backend" / ".env"
load_dotenv(dotenv_path=env_path)

import cv2
import numpy as np

# ── Roboflow local inference ──────────────────────────────────────────
from inference import get_model

# ── Supervision for annotation ────────────────────────────────────────
import supervision as sv


# =====================================================================
# 1.  CONFIGURATION
# =====================================================================

MODEL_ID: str = "real-time-car-parking/4"      # Roboflow model ID
WEBCAM_INDEX: int = 0                           # 0 = default camera
FRAME_WIDTH: int = 640                          # Resize width  (perf)
FRAME_HEIGHT: int = 480                         # Resize height (perf)
CONFIDENCE_THRESHOLD: float = 0.40              # Min detection confidence
IOU_THRESHOLD: float = 0.50                     # Non-max-suppression IoU
WINDOW_NAME: str = "Parking Detector"

# Class-name mapping  ── adjust these if your model uses different names
OCCUPIED_CLASSES: set = {"occupied", "car", "vehicle"}
AVAILABLE_CLASSES: set = {"empty", "available", "free", "space"}


# =====================================================================
# 2.  HELPER – Validate API key
# =====================================================================

def validate_api_key() -> str:
    """Return the Roboflow API key from the environment, or exit."""
    api_key = os.environ.get("ROBOFLOW_API_KEY")
    if not api_key:
        print(
            "\n[ERROR] ROBOFLOW_API_KEY environment variable is not set.\n"
            "  → Windows (CMD) :  set ROBOFLOW_API_KEY=your_key_here\n"
            "  → Windows (PS)  :  $env:ROBOFLOW_API_KEY='your_key_here'\n"
            "  → Linux / macOS :  export ROBOFLOW_API_KEY=your_key_here\n"
        )
        sys.exit(1)
    return api_key


# =====================================================================
# 3.  HELPER – Load model with error handling
# =====================================================================

def load_model(model_id: str):
    """Load a Roboflow model via local inference SDK."""
    print(f"[INFO] Loading model '{model_id}' …")
    try:
        model = get_model(model_id=model_id)
        print("[INFO] Model loaded successfully.")
        return model
    except Exception as exc:
        print(f"[ERROR] Failed to load model: {exc}")
        print("  → Ensure the inference server is running (inference server start)")
        print("  → Confirm your API key is valid and the model ID is correct.")
        sys.exit(1)


# =====================================================================
# 4.  HELPER – Open webcam with error handling
# =====================================================================

def open_camera(index: int = 0) -> cv2.VideoCapture:
    """Open a webcam and apply initial settings."""
    cap = cv2.VideoCapture(index)
    if not cap.isOpened():
        print(f"[ERROR] Cannot open camera index {index}.")
        print("  → Check that a webcam is connected and not in use by another app.")
        sys.exit(1)

    # Attempt to set resolution (camera may override these values)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Reduce latency

    actual_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    actual_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    print(f"[INFO] Camera opened – resolution {actual_w}×{actual_h}")
    return cap


# =====================================================================
# 5.  HELPER – Count occupied vs available slots
# =====================================================================

def count_slots(detections: sv.Detections, class_names: list) -> Tuple[int, int, int]:
    """
    Count total, occupied, and available parking slots.

    Returns:
        (total, occupied, available)
    """
    occupied = 0
    available = 0

    for name in class_names:
        lower = name.lower()
        if lower in OCCUPIED_CLASSES:
            occupied += 1
        elif lower in AVAILABLE_CLASSES:
            available += 1

    total = occupied + available
    return total, occupied, available


# =====================================================================
# 6.  HELPER – Draw an overlay HUD with slot stats
# =====================================================================

def draw_hud(
    frame: np.ndarray,
    fps: float,
    total: int,
    occupied: int,
    available: int,
) -> np.ndarray:
    """Render a translucent HUD bar at the top of the frame."""
    h, w = frame.shape[:2]
    overlay = frame.copy()

    # ── Semi-transparent dark strip ───────────────────────────────────
    bar_height = 110
    cv2.rectangle(overlay, (0, 0), (w, bar_height), (20, 20, 20), -1)
    frame = cv2.addWeighted(overlay, 0.70, frame, 0.30, 0)

    # ── Text rendering ────────────────────────────────────────────────
    font = cv2.FONT_HERSHEY_SIMPLEX
    white = (255, 255, 255)
    green = (0, 230, 118)
    red = (80, 80, 255)
    cyan = (255, 200, 0)

    cv2.putText(frame, f"FPS: {fps:.1f}", (15, 30), font, 0.7, cyan, 2)
    cv2.putText(frame, f"Total Slots: {total}", (15, 60), font, 0.7, white, 2)
    cv2.putText(frame, f"Occupied: {occupied}", (15, 90), font, 0.7, red, 2)
    cv2.putText(frame, f"Available: {available}", (250, 90), font, 0.7, green, 2)

    # ── Occupancy bar ─────────────────────────────────────────────────
    if total > 0:
        pct = occupied / total
        bar_x, bar_y, bar_w, bar_h = w - 220, 20, 200, 20
        cv2.rectangle(frame, (bar_x, bar_y), (bar_x + bar_w, bar_y + bar_h), (80, 80, 80), -1)
        fill_w = int(bar_w * pct)
        bar_color = green if pct < 0.75 else (0, 165, 255) if pct < 0.90 else red
        cv2.rectangle(frame, (bar_x, bar_y), (bar_x + fill_w, bar_y + bar_h), bar_color, -1)
        cv2.putText(
            frame,
            f"{pct * 100:.0f}% full",
            (bar_x, bar_y + bar_h + 22),
            font, 0.6, white, 1,
        )

    return frame


# =====================================================================
# 7.  MAIN DETECTION LOOP
# =====================================================================

def main() -> None:
    # ── Step A: Validate API key ──────────────────────────────────────
    validate_api_key()

    # ── Step B: Load model locally ────────────────────────────────────
    model = load_model(MODEL_ID)

    # ── Step C: Open camera ───────────────────────────────────────────
    cap = open_camera(WEBCAM_INDEX)

    # ── Step D: Configure Supervision annotators ──────────────────────
    box_annotator = sv.BoxAnnotator(
        thickness=2,
    )
    label_annotator = sv.LabelAnnotator(
        text_scale=0.5,
        text_thickness=1,
        text_padding=4,
    )

    # ── FPS tracker ───────────────────────────────────────────────────
    fps = 0.0
    prev_time = time.time()
    frame_count = 0

    print("[INFO] Starting detection loop – press 'q' to quit.")

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("[WARN] Empty frame – retrying …")
                continue

            # ── Resize for performance (optional) ─────────────────────
            frame = cv2.resize(frame, (FRAME_WIDTH, FRAME_HEIGHT))

            # ── Run inference (LOCAL, not cloud) ──────────────────────
            results = model.infer(
                frame,
                confidence=CONFIDENCE_THRESHOLD,
                iou_threshold=IOU_THRESHOLD,
            )

            # ── Convert results → Supervision Detections ─────────────
            # The inference SDK returns a list; take the first result
            result = results[0] if isinstance(results, list) else results
            detections = sv.Detections.from_inference(result)

            # ── Build human-readable labels ───────────────────────────
            class_names = [
                result.predictions[i].class_name
                for i in range(len(result.predictions))
            ] if hasattr(result, "predictions") else []

            labels = [
                f"{name} {conf:.0%}"
                for name, conf in zip(class_names, detections.confidence)
            ]

            # ── Annotate frame ────────────────────────────────────────
            annotated = box_annotator.annotate(
                scene=frame.copy(), detections=detections
            )
            annotated = label_annotator.annotate(
                scene=annotated, detections=detections, labels=labels
            )

            # ── Slot counting ─────────────────────────────────────────
            total, occupied, available = count_slots(detections, class_names)

            # ── FPS calculation (smoothed) ────────────────────────────
            frame_count += 1
            now = time.time()
            elapsed = now - prev_time
            if elapsed >= 1.0:
                fps = frame_count / elapsed
                frame_count = 0
                prev_time = now

            # ── Draw HUD overlay ──────────────────────────────────────
            annotated = draw_hud(annotated, fps, total, occupied, available)

            # ── Show result ───────────────────────────────────────────
            cv2.imshow(WINDOW_NAME, annotated)

            # ── Quit on 'q' ──────────────────────────────────────────
            if cv2.waitKey(1) & 0xFF == ord("q"):
                print("[INFO] Quitting …")
                break

    except KeyboardInterrupt:
        print("\n[INFO] Interrupted by user.")

    finally:
        cap.release()
        cv2.destroyAllWindows()
        print("[INFO] Resources released. Goodbye.")


# =====================================================================
# 8.  ENTRY POINT
# =====================================================================

if __name__ == "__main__":
    main()
