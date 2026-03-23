from ultralytics import YOLO
from huggingface_hub import hf_hub_download
import os

model = None

def get_model():
    global model

    if model is None:
        try:
            print("Downloading model from Hugging Face...")

            model_path = hf_hub_download(
                repo_id="FGArmy/Parking_AI",
                filename="best.pt",
                token=os.getenv("HF_TOKEN")  # optional if private
            )

            print("Model downloaded at:", model_path)

            model = YOLO(model_path)

        except Exception as e:
            print("❌ Model download failed:", e)
            raise RuntimeError(f"Model loading failed: {str(e)}")

    return model