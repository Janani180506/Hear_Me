from __future__ import annotations

import base64
import json
import math
import os
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from tensorflow.keras.models import load_model

try:
    from .isl_translator import ISLTranslator
    from .touchspeak_service import touchspeak_service
    from .whatsapp_service import whatsapp_service
except ImportError:
    from isl_translator import ISLTranslator
    from touchspeak_service import touchspeak_service
    from whatsapp_service import whatsapp_service

try:
    from cvzone.HandTrackingModule import HandDetector
except ImportError as exc:
    raise RuntimeError(f"Missing dependency for hand detection: {exc}") from exc


ROOT_DIR = Path(__file__).resolve().parent
MODEL_PATH = ROOT_DIR / "model" / "cnn8grps_rad1_model.h5"
if not MODEL_PATH.exists():
    ALT_PATH = Path("d:/HearMe Project/HandGesture/cnn8grps_rad1_model.h5")
    if ALT_PATH.exists():
        MODEL_PATH = ALT_PATH

WORD_MODEL_DIR = ROOT_DIR / "model" / "word_sign"
WORD_MODEL_PATH = WORD_MODEL_DIR / "sign_word_lstm.keras"
if not WORD_MODEL_PATH.exists():
    WORD_MODEL_PATH = ROOT_DIR / "model" / "word_model.keras"

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
        print(f"[Gesture Service] Loading Alphabet Model from {MODEL_PATH}...")
        self.model = load_model(str(MODEL_PATH))
        self.detector = HandDetector(maxHands=1, detectionCon=0.1)
        self.detector2 = HandDetector(maxHands=1, detectionCon=0.1)
        
        self.word_model = None
        self.word_label_map = {}
        if WORD_MODEL_PATH.exists():
            try:
                print(f"[Gesture Service] Loading Word-Level Model from {WORD_MODEL_PATH}...")
                self.word_model = load_model(str(WORD_MODEL_PATH))
                label_map_path = WORD_MODEL_PATH.parent / "label_map.json"
                if label_map_path.exists():
                    with open(label_map_path, "r", encoding="utf-8") as f:
                        self.word_label_map = json.load(f)
                print("[Gesture Service] Word-Level Model loaded successfully.")
            except Exception as e:
                print(f"[Gesture Service] Could not load Word-Level Model: {e}")
        else:
            print(f"[Gesture Service] Whole-Word Model not found at {WORD_MODEL_PATH}. Video recognition mode will report 'model_not_configured'.")

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

    @staticmethod
    def distance(pt1: list[int], pt2: list[int]) -> float:
        return math.sqrt(((pt1[0] - pt2[0]) ** 2) + ((pt1[1] - pt2[1]) ** 2))

    def classify_gesture_letter(self, class_index: int, ch2: int, pts: list[list[int]]) -> str:
        """
        Applies HandGesture heuristic rules on CNN prediction group and 21 hand landmarks (pts).
        """
        ch1: Any = class_index
        pl = [ch1, ch2]

        # Condition for [A, E, M, N, S, T]
        l1 = [[5, 2], [5, 3], [3, 5], [3, 6], [3, 0], [3, 2], [6, 4], [6, 1], [6, 2], [6, 6], [6, 7], [6, 0], [6, 5],
              [4, 1], [1, 0], [1, 1], [6, 3], [1, 6], [5, 6], [5, 1], [4, 5], [1, 4], [1, 5], [2, 0], [2, 6], [4, 6],
              [1, 0], [5, 7], [1, 6], [6, 1], [7, 6], [2, 5], [7, 1], [5, 4], [7, 0], [7, 5], [7, 2]]
        if pl in l1 and len(pts) >= 21:
            if pts[6][1] < pts[8][1] and pts[10][1] < pts[12][1] and pts[14][1] < pts[16][1] and pts[18][1] < pts[20][1]:
                ch1 = 0

        # Condition for [O, S]
        if pl in [[2, 2], [2, 1]] and len(pts) >= 21:
            if pts[5][0] < pts[4][0]:
                ch1 = 0

        # Subgroup mapping for group 0
        if ch1 == 0 and len(pts) >= 21:
            ch1 = 'S'
            if pts[4][0] < pts[6][0] and pts[4][0] < pts[10][0] and pts[4][0] < pts[14][0] and pts[4][0] < pts[18][0]:
                ch1 = 'A'
            if pts[4][0] > pts[6][0] and pts[4][0] < pts[10][0] and pts[4][0] < pts[14][0] and pts[4][0] < pts[18][0] and pts[4][1] < pts[14][1] and pts[4][1] < pts[18][1]:
                ch1 = 'T'
            if pts[4][1] > pts[8][1] and pts[4][1] > pts[12][1] and pts[4][1] > pts[16][1] and pts[4][1] > pts[20][1]:
                ch1 = 'E'
            if pts[4][0] > pts[6][0] and pts[4][0] > pts[10][0] and pts[4][0] > pts[14][0] and pts[4][1] < pts[18][1]:
                ch1 = 'M'
            if pts[4][0] > pts[6][0] and pts[4][0] > pts[10][0] and pts[4][1] < pts[18][1] and pts[4][1] < pts[14][1]:
                ch1 = 'N'

        # Subgroup mapping for group 2 [C, O]
        elif ch1 == 2 and len(pts) >= 21:
            if self.distance(pts[12], pts[4]) > 42:
                ch1 = 'C'
            else:
                ch1 = 'O'

        # Subgroup mapping for group 3 [G, H]
        elif ch1 == 3 and len(pts) >= 21:
            if self.distance(pts[8], pts[12]) > 72:
                ch1 = 'G'
            else:
                ch1 = 'H'

        # Subgroup mapping for group 7 [Y, J]
        elif ch1 == 7 and len(pts) >= 21:
            if self.distance(pts[8], pts[4]) > 42:
                ch1 = 'Y'
            else:
                ch1 = 'J'

        # Subgroup mapping for group 4 [L]
        elif ch1 == 4:
            ch1 = 'L'

        # Subgroup mapping for group 6 [X]
        elif ch1 == 6:
            ch1 = 'X'

        # Subgroup mapping for group 5 [P, Q, Z]
        elif ch1 == 5 and len(pts) >= 21:
            if pts[4][0] > pts[12][0] and pts[4][0] > pts[16][0] and pts[4][0] > pts[20][0]:
                if pts[8][1] < pts[5][1]:
                    ch1 = 'Z'
                else:
                    ch1 = 'Q'
            else:
                ch1 = 'P'

        # Subgroup mapping for group 1 [B, D, F, I, W, K, U, V, R]
        elif ch1 == 1 and len(pts) >= 21:
            if pts[6][1] > pts[8][1] and pts[10][1] > pts[12][1] and pts[14][1] > pts[16][1] and pts[18][1] > pts[20][1]:
                ch1 = 'B'
            elif pts[6][1] > pts[8][1] and pts[10][1] < pts[12][1] and pts[14][1] < pts[16][1] and pts[18][1] < pts[20][1]:
                ch1 = 'D'
            elif pts[6][1] < pts[8][1] and pts[10][1] > pts[12][1] and pts[14][1] > pts[16][1] and pts[18][1] > pts[20][1]:
                ch1 = 'F'
            elif pts[6][1] < pts[8][1] and pts[10][1] < pts[12][1] and pts[14][1] < pts[16][1] and pts[18][1] > pts[20][1]:
                ch1 = 'I'
            elif pts[6][1] > pts[8][1] and pts[10][1] > pts[12][1] and pts[14][1] > pts[16][1] and pts[18][1] < pts[20][1]:
                ch1 = 'W'
            elif pts[6][1] > pts[8][1] and pts[10][1] > pts[12][1] and pts[14][1] < pts[16][1] and pts[18][1] < pts[20][1] and pts[4][1] < pts[9][1]:
                ch1 = 'K'
            elif (self.distance(pts[8], pts[12]) - self.distance(pts[6], pts[10])) < 8 and pts[6][1] > pts[8][1] and pts[10][1] > pts[12][1]:
                ch1 = 'U'
            elif (self.distance(pts[8], pts[12]) - self.distance(pts[6], pts[10])) >= 8 and pts[6][1] > pts[8][1] and pts[10][1] > pts[12][1]:
                ch1 = 'V'
            else:
                ch1 = 'R'

        return str(ch1)

    def predict_image(self, image: np.ndarray) -> dict[str, Any]:
        image_flipped = cv2.flip(image, 1)
        hands = self._first_hand(self.detector.findHands(image_flipped, draw=False, flipType=True))
        if not hands:
            return {"ok": False, "error": "No hand detected in image. Please provide a clear view of a hand."}

        x, y, width, height = hands["bbox"]
        offset = 29
        x1 = max(x - offset, 0)
        y1 = max(y - offset, 0)

        pts = [[pt[0] - x1, pt[1] - y1] for pt in hands["lmList"]]
        canvas = np.ones((400, 400, 3), np.uint8) * 255
        offset_x = ((400 - width) // 2) - 15
        offset_y = ((400 - height) // 2) - 15

        connections = [
            (0, 1), (1, 2), (2, 3), (3, 4),
            (5, 6), (6, 7), (7, 8),
            (9, 10), (10, 11), (11, 12),
            (13, 14), (14, 15), (15, 16),
            (17, 18), (18, 19), (19, 20),
            (5, 9), (9, 13), (13, 17), (0, 5), (0, 17)
        ]

        for start, end in connections:
            cv2.line(
                canvas,
                (pts[start][0] + offset_x, pts[start][1] + offset_y),
                (pts[end][0] + offset_x, pts[end][1] + offset_y),
                (0, 255, 0),
                3
            )

        for pt in pts:
            cv2.circle(canvas, (pt[0] + offset_x, pt[1] + offset_y), 2, (0, 0, 255), 1)

        prediction = np.array(self.model.predict(canvas.reshape(1, 400, 400, 3), verbose=0)[0], dtype="float32")
        class_index = int(np.argmax(prediction))
        confidence = float(prediction[class_index])
        prediction[class_index] = 0
        ch2 = int(np.argmax(prediction))

        letter = self.classify_gesture_letter(class_index, ch2, pts)

        return {
            "ok": True,
            "predicted_class": GROUP_LABELS[class_index] if class_index < len(GROUP_LABELS) else f"Group {class_index}",
            "letter": letter,
            "confidence": confidence,
            "class_index": class_index,
            "landmarks": pts
        }


app = FastAPI(title="SignConnect Unified API & Gesture Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

service: GestureModelService | None = None
translator_service: ISLTranslator | None = None


class TranslateRequest(BaseModel):
    text: str


class CardCreateRequest(BaseModel):
    title: str
    phrase: Optional[str] = None
    spoken_phrase: Optional[str] = None
    phrase_en: Optional[str] = None
    phrase_ta: Optional[str] = None
    phrase_hi: Optional[str] = None
    category: Optional[str] = None
    category_id: Optional[str] = None
    icon: Optional[str] = "MessageSquare"
    translations: Optional[Dict[str, str]] = None
    phrases: Optional[Dict[str, str]] = None


class CardClickRequest(BaseModel):
    user_id: str
    card_id: str
    phrase: str


class CaregiverCreateRequest(BaseModel):
    name: str
    relation: Optional[str] = "Caregiver"
    phone: str
    email: Optional[str] = ""
    is_primary: Optional[bool] = False


class SOSRequest(BaseModel):
    user_id: Optional[str] = "user_default"
    caregiver_name: Optional[str] = None
    caregiver_phone: Optional[str] = None
    location: Optional[Dict[str, float]] = None
    message: Optional[str] = None
    status: Optional[str] = "Active"


class WhatsAppSendRequest(BaseModel):
    user_id: Optional[str] = "user_default"
    user_name: Optional[str] = "Janani"
    message: str
    card_title: Optional[str] = None


class TTSRequest(BaseModel):
    text: str
    language: Optional[str] = "en"


@app.on_event("startup")
def startup() -> None:
    global service, translator_service
    service = GestureModelService()
    translator_service = ISLTranslator()
    print("[SignConnect Unified Backend] Service startup complete.")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "SignConnect Unified Platform"}


# --- GESTURE RECOGNITION REST API ---
@app.post("/predict")
async def predict(file: UploadFile = File(...)) -> JSONResponse:
    if service is None:
        return JSONResponse(status_code=503, content={"ok": False, "error": "Model service is not ready"})

    contents = await file.read()
    if not contents:
        return JSONResponse(status_code=200, content={"ok": False, "error": "Uploaded file is empty"})

    np_arr = np.frombuffer(contents, dtype=np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if image is None:
        return JSONResponse(status_code=200, content={"ok": False, "error": "Unable to decode uploaded image"})

    result = service.predict_image(image)
    # Always return HTTP 200 so hand detection status is passed cleanly without triggering HTTP 400 errors
    return JSONResponse(status_code=200, content=result)


# --- VIDEO GESTURE RECOGNITION API (WHOLE-WORD ASL MODEL) ---
@app.post("/predict-video")
async def predict_video(file: UploadFile = File(...)) -> JSONResponse:
    if service is None:
        raise HTTPException(status_code=503, detail="Model service is not ready")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded video file is empty")

    if service.word_model is None:
        return JSONResponse(
            status_code=200,
            content={
                "ok": False,
                "status": "model_not_configured",
                "message": "Word recognition model is not configured yet.",
                "detail": "Whole-word ASL video recognition requires a trained temporal model (e.g., LSTM/GRU). Please place sign_word_lstm.keras in backend/model/word_sign/ to activate whole-word video recognition."
            }
        )

    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        cap = cv2.VideoCapture(tmp_path)
        frames_landmarks = []
        frame_count = 0
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            frame_count += 1
            # Process frames with HandDetector
            hands = service._first_hand(service.detector.findHands(frame, draw=False))
            if hands and "lmList" in hands:
                pts = hands["lmList"]
                # Flatten 21 2D landmarks (42 features) or center relative to wrist
                wrist = pts[0]
                norm_pts = []
                for pt in pts:
                    norm_pts.extend([(pt[0] - wrist[0]) / 400.0, (pt[1] - wrist[1]) / 400.0])
                frames_landmarks.append(norm_pts)

        cap.release()

        if not frames_landmarks:
            return JSONResponse(content={
                "ok": False,
                "error": "No clear hand gesture sequence detected in uploaded video."
            })

        # Resample landmark sequence to fixed 30 frames
        target_seq_len = 30
        curr_len = len(frames_landmarks)
        if curr_len >= target_seq_len:
            indices = np.linspace(0, curr_len - 1, target_seq_len, dtype=int)
            seq_tensor = np.array([frames_landmarks[i] for i in indices], dtype=np.float32)
        else:
            # Pad with last frame
            seq_tensor = np.zeros((target_seq_len, len(frames_landmarks[0])), dtype=np.float32)
            seq_tensor[:curr_len] = np.array(frames_landmarks, dtype=np.float32)
            for i in range(curr_len, target_seq_len):
                seq_tensor[i] = frames_landmarks[-1]

        input_batch = np.expand_dims(seq_tensor, axis=0)
        prediction = service.word_model.predict(input_batch, verbose=0)[0]
        class_idx = int(np.argmax(prediction))
        confidence = float(prediction[class_idx])

        word_label = str(class_idx)
        if service.word_label_map and str(class_idx) in service.word_label_map:
            word_label = service.word_label_map[str(class_idx)]

        return JSONResponse(content={
            "ok": True,
            "transcription": word_label,
            "word": word_label,
            "confidence": confidence,
            "word_level": True,
            "frame_count": frame_count
        })
    except Exception as exc:
        return JSONResponse(status_code=500, content={"ok": False, "error": f"Video recognition error: {exc}"})
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


# --- REAL-TIME GESTURE WEBSOCKET API ---
@app.websocket("/ws/gesture")
async def websocket_gesture(websocket: WebSocket):
    await websocket.accept()
    print("[WebSocket] Client connected for gesture stream.")
    try:
        while True:
            data_str = await websocket.receive_text()
            try:
                data = json.loads(data_str)
                frame_data = data.get("frame")
                if not frame_data:
                    continue

                if "," in frame_data:
                    frame_data = frame_data.split(",")[1]

                img_bytes = base64.b64decode(frame_data)
                nparr = np.frombuffer(img_bytes, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

                if frame is not None and service is not None:
                    res = service.predict_image(frame)
                    if res.get("ok"):
                        res["status"] = "success"
                        res["current_symbol"] = res["letter"]
                    await websocket.send_json(res)
                else:
                    await websocket.send_json({"ok": False, "status": "error", "error": "Invalid frame"})
            except Exception as e:
                await websocket.send_json({"ok": False, "status": "error", "error": str(e)})
    except WebSocketDisconnect:
        print("[WebSocket] Client disconnected.")


# --- TEXT TO ISL TRANSLATOR API ---
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


# --- TOUCHSPEAK AAC COMMUNICATION BOARD APIs ---
@app.get("/api/communication/categories")
async def get_categories() -> List[Dict[str, Any]]:
    return touchspeak_service.get_categories()


@app.get("/api/communication/cards")
async def get_cards(category_id: Optional[str] = None) -> List[Dict[str, Any]]:
    return touchspeak_service.get_cards(category_id)


@app.get("/api/communication/board/{user_id}")
async def get_communication_board(user_id: str) -> Dict[str, Any]:
    categories = touchspeak_service.get_categories()
    cards = touchspeak_service.get_cards()
    predictions = touchspeak_service.predict_next_phrases(user_id, top_n=3)
    return {
        "user_id": user_id,
        "categories": categories,
        "cards": cards,
        "predictions": predictions
    }


@app.post("/api/communication/card-click")
async def record_card_click(req: CardClickRequest) -> Dict[str, Any]:
    touchspeak_service.record_card_click(req.user_id, req.card_id, req.phrase)
    return {"status": "success", "message": "Card click recorded"}


@app.post("/api/communication/cards")
async def create_card(req: CardCreateRequest) -> Dict[str, Any]:
    card = touchspeak_service.add_card(req.dict())
    return {"status": "success", "card": card}


@app.delete("/api/communication/cards/{card_id}")
async def delete_card(card_id: str) -> Dict[str, Any]:
    touchspeak_service.delete_card(card_id)
    return {"status": "success", "message": "Card deleted"}


@app.get("/api/predict-phrases/{user_id}")
async def predict_phrases(user_id: str, top_n: int = 3) -> Dict[str, Any]:
    predictions = touchspeak_service.predict_next_phrases(user_id, top_n)
    return {"user_id": user_id, "predictions": predictions}


# --- CAREGIVER MANAGEMENT APIs ---
@app.get("/api/caregivers")
async def get_caregivers() -> List[Dict[str, Any]]:
    return touchspeak_service.get_caregivers()


@app.post("/api/caregivers")
async def add_caregiver(req: CaregiverCreateRequest) -> Dict[str, Any]:
    cg = touchspeak_service.add_caregiver(req.dict())
    return {"status": "success", "caregiver": cg}


@app.delete("/api/caregivers/{caregiver_id}")
async def delete_caregiver(caregiver_id: str) -> Dict[str, Any]:
    touchspeak_service.delete_caregiver(caregiver_id)
    return {"status": "success", "message": "Caregiver deleted"}


# --- WHATSAPP CLOUD API MESSAGING API ---
@app.post("/api/send-whatsapp")
async def send_whatsapp(req: WhatsAppSendRequest) -> Dict[str, Any]:
    caregivers = touchspeak_service.get_caregivers()
    if not caregivers:
        return JSONResponse(
            status_code=400,
            content={
                "ok": False,
                "status": "failed",
                "error": "No registered caregiver found. Please add a caregiver first."
            }
        )

    # Select primary caregiver or first available caregiver with phone
    caregiver = next((c for c in caregivers if c.get("is_primary") and c.get("phone")), None) or next((c for c in caregivers if c.get("phone")), None)

    if not caregiver or not caregiver.get("phone"):
        return JSONResponse(
            status_code=400,
            content={
                "ok": False,
                "status": "failed",
                "error": "Registered caregiver is missing a valid WhatsApp phone number."
            }
        )

    user_display_name = req.user_name or "Janani"
    res = whatsapp_service.send_communication_message(
        to_phone=caregiver["phone"],
        user_name=user_display_name,
        phrase_text=req.message
    )

    # Record communication attempt log in DB if available
    log_entry = {
        "user_id": req.user_id,
        "user_name": user_display_name,
        "caregiver_name": caregiver.get("name"),
        "caregiver_phone": caregiver.get("phone"),
        "message": req.message,
        "card_title": req.card_title,
        "result": res,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    if touchspeak_service.db is not None:
        try:
            touchspeak_service.db.whatsapp_logs.insert_one(dict(log_entry))
        except Exception as e:
            print(f"[WhatsApp Log DB Error] {e}")

    if not res.get("ok"):
        return JSONResponse(
            status_code=200,
            content={
                "ok": False,
                "status": "failed",
                "caregiver": caregiver.get("name"),
                "phone": caregiver.get("phone"),
                "configured": res.get("configured", True),
                "error": res.get("error", "WhatsApp Cloud API delivery failed.")
            }
        )

    return {
        "ok": True,
        "status": "sent",
        "caregiver": caregiver.get("name"),
        "phone": caregiver.get("phone"),
        "message_id": res.get("message_id")
    }


# --- TOUCHSPEAK EMERGENCY / SOS APIs ---
@app.post("/api/emergency/sos")
async def trigger_sos(req: SOSRequest) -> Dict[str, Any]:
    log = touchspeak_service.trigger_sos(
        user_id=req.user_id or "user_default",
        location=req.location,
        message=req.message,
        caregiver_name=req.caregiver_name,
        caregiver_phone=req.caregiver_phone,
        status=req.status or "Active"
    )

    # Also dispatch official WhatsApp Cloud API emergency alert to all registered caregivers
    caregivers = touchspeak_service.get_caregivers()
    wa_results = []
    if caregivers:
        lat = req.location.get("latitude", 0.0) if req.location else 0.0
        lng = req.location.get("longitude", 0.0) if req.location else 0.0
        maps_url = f"https://www.google.com/maps?q={lat},{lng}"
        user_name = req.user_id or "Janani"

        for cg in caregivers:
            if cg.get("phone"):
                wa_res = whatsapp_service.send_sos_emergency_message(
                    to_phone=cg["phone"],
                    user_name=user_name,
                    google_maps_link=maps_url
                )
                wa_results.append({"caregiver": cg.get("name"), "result": wa_res})

    return {"status": "success", "log": log, "whatsapp_alerts": wa_results}


@app.get("/api/emergency/logs")
async def get_sos_logs(user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    return touchspeak_service.get_sos_logs(user_id)


# --- TEXT TO SPEECH API ---
@app.post("/api/tts/speak")
async def tts_speak(req: TTSRequest) -> Dict[str, Any]:
    res = touchspeak_service.synthesize_tts(req.text, req.language or "en")
    if not res.get("ok"):
        raise HTTPException(status_code=400, detail=res.get("error", "TTS synthesis failed"))
    return res
