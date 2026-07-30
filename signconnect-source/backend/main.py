from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from tensorflow.keras.models import load_model
from pydantic import BaseModel
from .isl_translator import ISLTranslator

try:
    from cvzone.HandTrackingModule import HandDetector
except ImportError as exc:  # pragma: no cover - runtime dependency check
    raise RuntimeError(f"Missing dependency for hand detection: {exc}") from exc


ROOT_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = ROOT_DIR / "model" / "cnn8grps_rad1_model.h5"

GROUP_LABELS = [
    "A / E / M / N / S / T",
    "B / F / D / I / U / V / W / K / R",
    "C / O",
    "G / H",
    "L",
    "P / Q / Z",
    "X",
    "Y / J",
]


class GestureModelService:
    def __init__(self) -> None:
        self.model = load_model(str(MODEL_PATH))
        self.detector = HandDetector(maxHands=1, detectionCon=0.1)

    @staticmethod
    def _first_hand(hands: object) -> dict[str, object] | None:
        if isinstance(hands, tuple):
            hands = hands[0]

        if not isinstance(hands, list) or not hands:
            return None

        hand = hands[0]
        if isinstance(hand, list) and hand:
            hand = hand[0]

        return hand if isinstance(hand, dict) else None

    def predict_image_bytes(self, image_bytes: bytes) -> dict[str, Any]:
        import os
        import time
        
        np_arr = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if image is None:
            return {"ok": False, "error": "Unable to decode uploaded image"}

        # 1. Flip horizontally to align webcam coordinate layout mirroring
        image = cv2.flip(image, 1)

        # Create debug directory
        os.makedirs("debug_frames", exist_ok=True)
        timestamp = int(time.time() * 1000)

        # Log incoming frame metadata
        print(f"[DEBUG LOG] Incoming frame size: {image.shape}")
        print(f"[DEBUG LOG] Channels: {image.shape[2] if len(image.shape) > 2 else 1}")
        print(f"[DEBUG LOG] Data type: {image.dtype}")
        print(f"[DEBUG LOG] Pixel range: {image.min()} - {image.max()}")

        # Save original frame
        cv2.imwrite(f"debug_frames/original_{timestamp}.jpg", image)

        hands = self._first_hand(self.detector.findHands(image, draw=False, flipType=True))
        if not hands:
            return {"ok": False, "error": "No hand detected in image. Upload an image with a visible hand for prediction."}

        hand = hands
        x, y, width, height = hand["bbox"]
        offset = 29
        x1 = max(x - offset, 0)
        y1 = max(y - offset, 0)
        x2 = min(x + width + offset, image.shape[1])
        y2 = min(y + height + offset, image.shape[0])

        crop = image[y1:y2, x1:x2]
        if crop.size == 0:
            return {"ok": False, "error": "Empty crop from hand bounding box"}

        # Save cropped hand image
        cv2.imwrite(f"debug_frames/crop_{timestamp}.jpg", crop)

        # Display both side by side in a combined debug image
        h_orig, w_orig = image.shape[:2]
        crop_resized = cv2.resize(crop, (int(crop.shape[1] * h_orig / crop.shape[0]), h_orig))
        side_by_side = np.hstack((image, crop_resized))
        cv2.imwrite(f"debug_frames/side_by_side_{timestamp}.jpg", side_by_side)

        # Directly use the landmarks from the first full-frame detection, offsetted by the crop coordinates (x1, y1).
        # This prevents the second findHands call on the crop from failing due to MediaPipe context loss.
        points = [[pt[0] - x1, pt[1] - y1] for pt in hands["lmList"]]

        canvas = np.ones((400, 400, 3), np.uint8) * 255
        offset_x = ((400 - width) // 2) - 15
        offset_y = ((400 - height) // 2) - 15

        connections = [
            (0, 1),
            (1, 2),
            (2, 3),
            (3, 4),
            (5, 6),
            (6, 7),
            (7, 8),
            (9, 10),
            (10, 11),
            (11, 12),
            (13, 14),
            (14, 15),
            (15, 16),
            (17, 18),
            (18, 19),
            (19, 20),
            (5, 9),
            (9, 13),
            (13, 17),
            (0, 5),
            (0, 17),
        ]

        for start, end in connections:
            cv2.line(
                canvas,
                (points[start][0] + offset_x, points[start][1] + offset_y),
                (points[end][0] + offset_x, points[end][1] + offset_y),
                (0, 255, 0),
                3,
            )

        for point in points:
            cv2.circle(canvas, (point[0] + offset_x, point[1] + offset_y), 2, (0, 0, 255), 1)

        cv2.imwrite(f"debug_frames/canvas_{timestamp}.jpg", canvas)

        prediction = np.array(self.model.predict(canvas.reshape(1, 400, 400, 3), verbose=0)[0], dtype="float32")
        class_index = int(np.argmax(prediction))
        confidence = float(prediction[class_index])
        label = GROUP_LABELS[class_index] if class_index < len(GROUP_LABELS) else f"Group {class_index}"

        # Print predictions in stdout/logs
        print(f"[DEBUG LOG] Predicted class index: {class_index}")
        print(f"[DEBUG LOG] Predicted label: {label}")
        print(f"[DEBUG LOG] Confidence: {confidence * 100:.2f}%")
        
        # Sort prediction values to print top 5 classes
        sorted_probs = np.argsort(prediction)[::-1]
        print("[DEBUG LOG] Predictions Probabilities (Top 5):")
        for rank, idx in enumerate(sorted_probs[:5]):
            label_name = GROUP_LABELS[idx] if idx < len(GROUP_LABELS) else f"Group {idx}"
            prob = float(prediction[idx])
            print(f"  {rank+1}. Index {idx} ({label_name}): {prob * 100:.2f}%")

        return {
            "ok": True,
            "predicted_class": label,
            "confidence": confidence,
            "class_index": class_index,
        }


app = FastAPI(title="Sign Gesture CNN API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
service: GestureModelService | None = None
translator_service: ISLTranslator | None = None


class TranslateRequest(BaseModel):
    text: str


@app.on_event("startup")
def startup() -> None:
    global service, translator_service
    service = GestureModelService()
    translator_service = ISLTranslator()


@app.post("/predict")
async def predict(file: UploadFile = File(...)) -> JSONResponse:
    if service is None:
        raise HTTPException(status_code=503, detail="Model service is not ready")

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    result = service.predict_image_bytes(contents)
    if not result.get("ok"):
        raise HTTPException(status_code=400, detail=result.get("error", "Prediction failed"))

    return JSONResponse(content={
        "predicted_class": result["predicted_class"],
        "confidence": result["confidence"],
        "class_index": result["class_index"],
    })


@app.post("/translate")
async def translate(req: TranslateRequest) -> dict[str, Any]:
    if translator_service is None:
        raise HTTPException(status_code=503, detail="Translator service is not ready")

    try:
        sequence = translator_service.translate(req.text)
        return {
            "ok": True,
            "original_text": req.text,
            "sequence": sequence,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
