"""
Image / Frame processing utilities
====================================
Handles Roboflow Inference SDK result format:
  result.predictions → list of Prediction objects with
  .class_name, .confidence, .x, .y, .width, .height
"""

import cv2

# Class-name sets — edit these if your model uses different labels
OCCUPIED_CLASSES = {"occupied", "car", "vehicle"}
AVAILABLE_CLASSES = {"empty", "available", "free", "space"}


def process_frame(img, model, confidence=0.5):
    """
    Run inference on a frame and annotate it.

    Args:
        img: numpy BGR image (from OpenCV)
        model: Roboflow inference model instance
        confidence: minimum detection confidence

    Returns:
        (annotated_img, detections_list, occupied_count, available_count)
    """
    # Run local inference
    results = model.infer(img, confidence=confidence)
    result = results[0] if isinstance(results, list) else results

    detections = []
    occupied = 0
    available = 0

    for pred in result.predictions:
        label = pred.class_name.lower()
        conf = float(pred.confidence)

        # Convert center-based coords (x, y, w, h) → corner coords (x1, y1, x2, y2)
        cx, cy = float(pred.x), float(pred.y)
        w, h = float(pred.width), float(pred.height)
        x1 = int(cx - w / 2)
        y1 = int(cy - h / 2)
        x2 = int(cx + w / 2)
        y2 = int(cy + h / 2)

        # Classify slot
        if label in OCCUPIED_CLASSES:
            occupied += 1
            color = (0, 0, 255)       # Red
        elif label in AVAILABLE_CLASSES:
            available += 1
            color = (0, 230, 118)     # Green
        else:
            # Unknown class — count as occupied for safety
            occupied += 1
            color = (0, 165, 255)     # Orange

        # Draw bounding box
        cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)
        cv2.putText(
            img,
            f"{label} {conf:.0%}",
            (x1, y1 - 8),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            color,
            2,
        )

        detections.append({
            "label": label,
            "confidence": round(conf, 2),
            "bbox": [x1, y1, x2, y2],
        })

    return img, detections, occupied, available


# ── Legacy compatibility wrapper ──────────────────────────────────────
# The old `process_image(img, results, model)` signature is no longer
# needed since we now call model.infer() inside process_frame().
# Keeping it as an alias in case any other code references it.
def process_image(img, results, model):
    """Legacy wrapper — not used by the updated endpoints."""
    return process_frame(img, model)