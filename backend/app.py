from fastapi import FastAPI, File, UploadFile, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from model_loader import get_model
from utils import process_image

import shutil
import cv2
import base64
import os
import numpy as np

app = FastAPI()

# ✅ CORS (allow frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # change later for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ❤️ Health check
@app.get("/health")
def health():
    return {"status": "ok"}


# 📤 IMAGE PREDICTION
@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    try:
        file_path = f"temp_{file.filename}"

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        img = cv2.imread(file_path)

        model = get_model()
        results = model(file_path, conf=0.6)

        img, detections, occupied, available = process_image(img, results, model)

        _, buffer = cv2.imencode(".jpg", img)
        img_base64 = base64.b64encode(buffer).decode()

        os.remove(file_path)

        return {
            "total_slots": occupied + available,
            "occupied": occupied,
            "available": available,
            "image": img_base64
        }

    except Exception as e:
        return {"error": str(e)}


# 🚀 LOAD MODEL ON STARTUP
@app.on_event("startup")
def load_model():
    get_model()


# 📹 LOCAL CAMERA STREAM (optional)
def generate_frames():
    cap = cv2.VideoCapture(0)
    model = get_model()

    while True:
        success, frame = cap.read()
        if not success:
            break

        results = model(frame, conf=0.6)

        for r in results:
            for box in r.boxes:
                conf = float(box.conf[0])
                label = model.names[int(box.cls[0])].lower()

                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())

                color = (0, 0, 255) if "occupied" in label else (0, 255, 0)

                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(
                    frame,
                    f"{label} {conf:.2f}",
                    (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    color,
                    2
                )

        _, buffer = cv2.imencode(".jpg", frame)
        frame_bytes = buffer.tobytes()

        yield (b"--frame\r\n"
               b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n")


@app.get("/live")
def live_stream():
    return StreamingResponse(
        generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


# 🔁 WEBSOCKET REALTIME (PRODUCTION CORE)
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    model = get_model()

    try:
        while True:
            data = await websocket.receive_bytes()

            nparr = np.frombuffer(data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            results = model(frame, conf=0.6)

            frame, detections, occupied, available = process_image(
                frame, results, model
            )

            _, buffer = cv2.imencode(".jpg", frame)
            encoded = base64.b64encode(buffer).decode()

            await websocket.send_json({
                "total_slots": occupied + available,
                "occupied": occupied,
                "available": available,
                "image": encoded
            })

    except:
        await websocket.close()