# 🤟 SignConnect

Welcome to **SignConnect**, an interactive AI-powered communication bridge between sign language and text. SignConnect features real-time gesture-to-text recognition (Sign-to-Text) and a 3D animated WebGL player translating English text into sign language sequences (Text-to-Sign).

---

## 🚀 Key Features

*   **Text-to-Sign Translation**: Translates text into sign language sequential animations rendered in real-time by a WebGL 3D avatar.
    *   *Sequencing Engine*: Custom timed animation scheduler that waits for each word's performance before playing the next, ensuring smooth and uniform playback rates.
    *   *Vocabulary Guard*: Dynamic spelling / fingerspelling fallback with safe skipping of untrained lexicon segments.
*   **Sign-to-Text Gesture Recognition**: Processes a live webcam stream to convert hand gestures into English text.
    *   *MediaPipe Integration*: Tracks 21 hand landmarks on a normalized 400x400 canvas.
    *   *Deep Learning Classifier*: Utilizes a custom CNN model to output highly accurate gesture classification groups.
    *   *Stabilized Decoder*: Translates classifications into sentences with continuous feedback, backspacing, and recommendations.

---

## 🛠️ Stack & Architecture

SignConnect is divided into three key sub-projects:

1.  **Frontend Server** (React + TypeScript + Vite + TanStack Start)
    *   *Port*: `8080` (or `5173` depending on configuration)
    *   *Role*: Provides the desktop/mobile client interfaces, canvas rendering for gesture streams, WebGL player, and speed control.
2.  **FastAPI Translation & Prediction Backend** (Python)
    *   *Port*: `8000`
    *   *Role*: Parses English text using the Stanza NLP pipeline, verifies translation dictionary vocabulary, and predicts static upload images.
3.  **Real-Time Gesture WebSocket Server** (Python + MediaPipe)
    *   *Port*: `5005`
    *   *Role*: Captures base64 webcam frames, extracts crop coordinates, generates landmark drawings, and predicts group characters.

---

## 📁 Repository Structure

```
idea/
├── signconnect-source/          # Principal Full-Stack React + FastAPI application
│   ├── src/                     # React Frontend Source Code
│   │   ├── routes/              # Client paths (text-to-sign, live sign-to-text)
│   │   └── components/          # Shared layout and UI elements
│   ├── backend/                 # FastAPI server (main.py, isl_translator.py)
│   └── public/js/               # Client WebGL Avatar Engine (allcsa.js)
├── handgesture-main/            # media processing and ML model training resources
│   └── handgesture-main/        # Real-time WebSocket server (gesture_server.py)
└── text_to_isl-main/            # Reference materials and legacy algorithms
```

---

## 🏁 How to Run SignConnect

### 1. Start the FastAPI Backend
Ensure your Python environment (`mlapi` conda env) is active, navigate to `signconnect-source` and run:
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Start the Gesture WebSocket Server
Navigate to the gesture server directory and run:
```bash
python gesture_server.py
```

### 3. Run the Frontend Development Server
Navigate to the frontend application directory and start the dev client:
```bash
npm run dev
```
Open `http://localhost:8080` in your web browser.

---

## 🤝 Verification & Commit Notes
All recent changes including timing schedules, watchdog bounds, speed control actions, and translation sequence ordering are verified and pushed to the remote repository.
