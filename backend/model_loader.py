"""
Model Loader — Roboflow Inference SDK (Local)
==============================================
Loads the parking detection model using Roboflow's
local inference engine. No frames leave your machine.
"""

import os
from inference import get_model as rf_get_model

_model = None


def get_model():
    """
    Lazily load and cache the Roboflow model.
    Uses ROBOFLOW_API_KEY and MODEL_ID from environment.
    """
    global _model

    if _model is None:
        api_key = os.getenv("ROBOFLOW_API_KEY")
        model_id = os.getenv("MODEL_ID", "real-time-car-parking/4")

        if not api_key:
            raise RuntimeError(
                "ROBOFLOW_API_KEY is not set. "
                "Add it to backend/.env or set it as an environment variable."
            )

        try:
            print(f"[INFO] Loading Roboflow model '{model_id}' …")
            _model = rf_get_model(model_id=model_id)
            print("[INFO] Model loaded successfully.")
        except Exception as e:
            print(f"[ERROR] Model loading failed: {e}")
            raise RuntimeError(f"Model loading failed: {e}")

    return _model