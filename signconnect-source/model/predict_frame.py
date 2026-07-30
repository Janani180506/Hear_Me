from __future__ import annotations

import json
import sys
from pathlib import Path

import cv2
import numpy as np

try:
    from cvzone.HandTrackingModule import HandDetector
except ImportError as exc:  # pragma: no cover - runtime dependency check
    print(json.dumps({"ok": False, "error": f"Missing dependency: {exc.name}"}))
    raise SystemExit(0)

try:
    from tensorflow.keras.models import load_model
except ImportError as exc:  # pragma: no cover - runtime dependency check
    print(json.dumps({"ok": False, "error": f"Missing dependency: {exc.name}"}))
    raise SystemExit(0)


MODEL_PATH = Path(__file__).with_name("cnn8grps_rad1_model.h5")
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


def _draw_landmarks(canvas: np.ndarray, points: list[list[int]], offset_x: int, offset_y: int) -> None:
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


def _first_hand(hands: object) -> dict[str, object] | None:
    if isinstance(hands, tuple):
        hands = hands[0]

    if not isinstance(hands, list) or not hands:
        return None

    hand = hands[0]
    if isinstance(hand, list) and hand:
        hand = hand[0]

    return hand if isinstance(hand, dict) else None


def predict_frame(image_path: Path) -> dict[str, object]:
    image = cv2.imread(str(image_path))
    if image is None:
        return {"ok": False, "error": f"Could not read image: {image_path}"}

    detector = HandDetector(maxHands=1)
    hands = _first_hand(detector.findHands(image, draw=False, flipType=True))
    if not hands:
        return {"ok": False, "error": "No hand detected in frame"}

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

    handz = _first_hand(detector.findHands(crop, draw=False, flipType=True))
    if not handz:
        return {"ok": False, "error": "Could not extract hand landmarks"}

    points = handz["lmList"]
    canvas = np.ones((400, 400, 3), np.uint8) * 255
    offset_x = ((400 - width) // 2) - 15
    offset_y = ((400 - height) // 2) - 15
    _draw_landmarks(canvas, points, offset_x, offset_y)

    model = load_model(str(MODEL_PATH))
    prediction = np.array(model.predict(canvas.reshape(1, 400, 400, 3), verbose=0)[0], dtype="float32")
    class_index = int(np.argmax(prediction))
    confidence = float(prediction[class_index])
    label = GROUP_LABELS[class_index] if class_index < len(GROUP_LABELS) else f"Group {class_index}"

    return {
        "ok": True,
        "label": label,
        "confidence": confidence,
        "classIndex": class_index,
    }


def main() -> int:
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "Usage: predict_frame.py <image-path>"}))
        return 0

    result = predict_frame(Path(sys.argv[1]))
    print(json.dumps(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())