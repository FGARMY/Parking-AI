"""
FastAPI Backend — ParkSense AI
================================
Endpoints:
  GET  /health          → Health check
  POST /predict          → Single-image prediction
  GET  /live             → MJPEG stream from PC webcam
  WS   /ws               → WebSocket real-time (phone camera → AI → phone)
  GET  /                 → Serves the frontend dashboard

Runs on 0.0.0.0 so phones on the same Wi-Fi can connect.
"""

from fastapi import FastAPI, File, UploadFile, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from model_loader import get_model
from utils import process_frame

import shutil
import cv2
import base64
import os
import numpy as np
from pathlib import Path
from dotenv import load_dotenv

# ── Load .env ─────────────────────────────────────────────────────────
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

app = FastAPI(title="ParkSense AI", version="2.0")

# ── CORS (allow any origin for local-network phone access) ────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Serve frontend static files ───────────────────────────────────────
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"

@app.get("/")
def serve_dashboard():
    """Serve the main dashboard HTML."""
    if not (FRONTEND_DIR / "index.html").exists():
        return {"error": "Frontend build not found. Run npm run build in frontend directory."}
    return FileResponse(FRONTEND_DIR / "index.html")

# Mount static files (moved to bottom of file)


# ❤️ Health check
@app.get("/health")
def health():
    return {"status": "ok", "model": os.getenv("MODEL_ID", "real-time-car-parking/4")}


# ── 📤 IMAGE PREDICTION ──────────────────────────────────────────────
@app.post("/predict")
async def predict(file: UploadFile = File(...), draw_boxes: bool = True):
    try:
        file_path = f"temp_{file.filename}"

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        img = cv2.imread(file_path)
        model = get_model()

        img, detections, occupied, available = process_frame(img, model, draw_boxes=draw_boxes)

        _, buffer = cv2.imencode(".jpg", img)
        img_base64 = base64.b64encode(buffer).decode()

        os.remove(file_path)

        return {
            "total_slots": occupied + available,
            "occupied": occupied,
            "available": available,
            "image": img_base64,
        }

    except Exception as e:
        return {"error": str(e)}


# ── 🚀 LOAD MODEL ON STARTUP ─────────────────────────────────────────
@app.on_event("startup")
def load_model():
    get_model()


# ── 📹 LOCAL CAMERA STREAM (MJPEG) ───────────────────────────────────
def generate_frames(draw_boxes=True):
    """Yield MJPEG frames from the PC's webcam with AI overlay."""
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    model = get_model()

    while True:
        success, frame = cap.read()
        if not success:
            break

        frame = cv2.resize(frame, (640, 480))
        frame, _, _, _ = process_frame(frame, model, draw_boxes=draw_boxes)

        _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
        frame_bytes = buffer.tobytes()

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
        )

    cap.release()


@app.get("/live")
def live_stream(draw_boxes: bool = True):
    return StreamingResponse(
        generate_frames(draw_boxes),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


# ── 🔁 WEBSOCKET REAL-TIME (phone camera → AI → phone) ──────────────
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    model = get_model()
    print("[WS] Client connected")

    draw_boxes = True
    try:
        while True:
            # Receive message (can be text/JSON config or binary JPEG frame)
            data = await websocket.receive()
            
            if "text" in data:
                try:
                    import json
                    msg = json.loads(data["text"])
                    if "draw_boxes" in msg:
                        draw_boxes = bool(msg["draw_boxes"])
                except Exception:
                    pass
                continue
                
            if "bytes" not in data:
                continue
                
            nparr = np.frombuffer(data["bytes"], np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if frame is None:
                await websocket.send_json({"error": "Invalid frame"})
                continue

            # Resize for performance
            frame = cv2.resize(frame, (640, 480))

            # Run AI detection
            frame, detections, occupied, available = process_frame(frame, model, draw_boxes=draw_boxes)

            # Encode annotated frame
            _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            encoded = base64.b64encode(buffer).decode()

            # Send results back to phone
            await websocket.send_json({
                "total_slots": occupied + available,
                "occupied": occupied,
                "available": available,
                "image": encoded,
                "detections": detections,
            })

    except Exception as e:
        print(f"[WS] Disconnected: {e}")

    finally:
        try:
            await websocket.close()
        except Exception:
            pass


# Mount static files for any other assets (images, CSS, JS, etc.)
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="static")


# ── Run with: python app.py ───────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8001"))
    print(f"\n  [P] ParkSense AI starting on http://{host}:{port}")
    print(f"  [>] Open on phone: http://<your-pc-ip>:{port}\n")
    uvicorn.run(app, host=host, port=port)