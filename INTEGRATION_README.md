# SignConnect — Single Unified Assistive Platform

SignConnect is a single, unified web application integrating:
1. **HandGesture Recognition Engine** (Real-time gesture recognition using Keras CNN `cnn8grps_rad1_model.h5` model & MediaPipe hand landmarks).
2. **TouchSpeakAI Assistive AAC Suite** (Interactive AAC Communication Board, Multi-Language Translations EN/TA/HI, AI Next-Phrase Predictor, Caregiver Dashboard, Emergency SOS alerts, and Text-to-Speech).
3. **SignConnect Platform** (Modern React 19 + Vite Frontend, FastAPI Unified Backend, Stanza Text-to-ISL translator).

---

## Folder Structure

```text
HearMe Project/
├── HandGesture/                ← Original standalone project (UNTOUCHED)
├── TouchSpeak/                 ← Original standalone project (UNTOUCHED)
└── SignConnect/                ← UNIFIED APPLICATION
    ├── run_all.py              ← Single-command launcher for complete platform
    ├── .env.example            ← Environment configuration example
    ├── INTEGRATION_README.md   ← Integration documentation & usage guide
    │
    └── signconnect-source/
        ├── backend/            ← FastAPI Unified Python Backend
        │   ├── main.py         ← FastAPI App (WS, REST, TouchSpeak, ISL)
        │   ├── touchspeak_service.py ← AAC Board, Card Management, AI & TTS
        │   ├── isl_translator.py     ← Stanza Text to ISL NLP translator
        │   └── model/          ← Trained Keras model (cnn8grps_rad1_model.h5)
        │
        └── frontend/           ← React 19 + Vite + TanStack Router Frontend
            ├── src/
            │   ├── routes/
            │   │   ├── index.tsx              ← Home Page
            │   │   ├── sign-to-text.tsx       ← Gesture Camera Recognition
            │   │   ├── text-to-sign.tsx       ← Text to ISL Sign Avatar
            │   │   ├── communication-board.tsx← TouchSpeak AAC Board (NEW)
            │   │   ├── caregiver.tsx          ← Caregiver Dashboard (NEW)
            │   │   ├── emergency.tsx          ← Emergency SOS Alert Panel
            │   │   └── ...
```

---

## Integrated Features & Workflow

### 1. Unified Communication Pipeline
- **Hand Gesture → Text → Sentence Builder → Text-to-Speech (Voice)**
- **Touch Card → Multi-Language Text (EN/TA/HI) → AI Next-Phrase Suggestion → Text-to-Speech (Voice)**

### 2. Gesture Recognition
- Webcam frame stream via WebSocket (`/ws/gesture`) or REST upload (`/predict`).
- Extracts 21 hand landmarks, renders skeleton canvas, and runs CNN model + heuristic rules for letter determination (`A-Z`, `Space`, `Next`, `Backspace`).

### 3. TouchSpeak AAC Communication Board (`/communication-board`)
- Interactive categories: Needs, Emotions, Emergency, Quick Phrases.
- Cards with multi-language text (English, Tamil, Hindi).
- Integrated Sentence Builder bar with AI next-phrase prediction buttons.
- Voice synthesis button powered by gTTS / Google Cloud TTS / Web Speech API.

### 4. Caregiver Dashboard (`/caregiver`)
- Add custom communication cards with titles, phrases, and category tags.
- Monitor real-time Emergency SOS alert logs and GPS locations.

---

## How to Run the Unified Application

### Single-Command Run (Recommended):
From the root of `SignConnect`:

```bash
python run_all.py
```

This automatically launches:
- **Unified Backend**: `http://localhost:8000` (FastAPI + WebSocket + AAC + TTS)
- **Unified Frontend**: `http://localhost:5173` (Vite React 19 SPA)

---

## API Endpoints

- `GET /health` — Service health check
- `POST /predict` — Image upload gesture prediction
- `WS /ws/gesture` — WebSocket real-time camera gesture stream
- `POST /translate` — Text to Indian Sign Language sequence
- `GET /api/communication/categories` — AAC categories
- `GET /api/communication/cards` — AAC cards
- `GET /api/communication/board/{user_id}` — AAC Board payload & AI predictions
- `POST /api/communication/card-click` — Record card click for AI training
- `POST /api/communication/cards` — Create custom card
- `GET /api/predict-phrases/{user_id}` — Top AI phrase predictions
- `POST /api/emergency/sos` — Trigger SOS alert
- `GET /api/emergency/logs` — SOS alert history
- `POST /api/tts/speak` — Text-to-speech audio synthesis
