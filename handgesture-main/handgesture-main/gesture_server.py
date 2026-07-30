import asyncio
import websockets
import json
import base64
import cv2
import numpy as np
import os
import math
import traceback
from keras.models import load_model
from cvzone.HandTrackingModule import HandDetector
import enchant

# Setup directories and paths
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(CURRENT_DIR, "cnn8grps_rad1_model.h5")

# Initialize models and detectors
print("Loading Keras model from:", MODEL_PATH)
model = load_model(MODEL_PATH)
print("Model loaded successfully.")

hd = HandDetector(maxHands=1)
hd2 = HandDetector(maxHands=1)
enchant_dict = enchant.Dict("en-US")

# Global state for predictions
class SignState:
    def __init__(self):
        self.sentence = ""
        self.current_symbol = "none"
        self.word = ""
        self.word1 = ""
        self.word2 = ""
        self.word3 = ""
        self.word4 = ""
        self.prev_char = ""
        self.count = -1
        self.ten_prev_char = [" "] * 10

    def reset(self):
        self.sentence = ""
        self.current_symbol = "none"
        self.word = ""
        self.word1 = ""
        self.word2 = ""
        self.word3 = ""
        self.word4 = ""
        self.prev_char = ""
        self.count = -1
        self.ten_prev_char = [" "] * 10

    def distance(self, x, y):
        return math.sqrt(((x[0] - y[0]) ** 2) + ((x[1] - y[1]) ** 2))

    def update_suggestions(self):
        if len(self.sentence.strip()) != 0:
            st = self.sentence.rfind(" ")
            ed = len(self.sentence)
            word = self.sentence[st+1:ed].strip()
            self.word = word
            if len(word) != 0:
                try:
                    enchant_dict.check(word)
                    suggestions = enchant_dict.suggest(word)
                    lenn = len(suggestions)
                    self.word1 = suggestions[0] if lenn >= 1 else ""
                    self.word2 = suggestions[1] if lenn >= 2 else ""
                    self.word3 = suggestions[2] if lenn >= 3 else ""
                    self.word4 = suggestions[3] if lenn >= 4 else ""
                except Exception as e:
                    print("Suggestions error:", e)
                    self.word1 = self.word2 = self.word3 = self.word4 = ""
            else:
                self.word1 = self.word2 = self.word3 = self.word4 = ""
        else:
            self.word1 = self.word2 = self.word3 = self.word4 = ""

    def process_symbol(self, ch1, pts):
        # Apply the transition and sentence accumulation logic
        # ch1 is the raw symbol detected in the current frame (e.g. 'A', 'B', 'Space', 'Backspace', 'next')
        self.pts = pts

        # space conversion
        if ch1 in (1, 'E', 'S', 'X', 'Y', 'B'):
            if (self.pts[6][1] > self.pts[8][1] and self.pts[10][1] < self.pts[12][1] and self.pts[14][1] < self.pts[16][1] and self.pts[18][1] > self.pts[20][1]):
                ch1 = " "

        # next conversion
        if ch1 in ('E', 'Y', 'B'):
            if (self.pts[4][0] < self.pts[5][0]) and (self.pts[6][1] > self.pts[8][1] and self.pts[10][1] > self.pts[12][1] and self.pts[14][1] > self.pts[16][1] and self.pts[18][1] > self.pts[20][1]):
                ch1 = "next"

        # backspace conversion
        if ch1 in ('Next', 'next', 'B', 'C', 'H', 'F', 'X'):
            if (self.pts[0][0] > self.pts[8][0] and self.pts[0][0] > self.pts[12][0] and self.pts[0][0] > self.pts[16][0] and self.pts[0][0] > self.pts[20][0]) and (self.pts[4][1] < self.pts[8][1] and self.pts[4][1] < self.pts[12][1] and self.pts[4][1] < self.pts[16][1] and self.pts[4][1] < self.pts[20][1]) and (self.pts[4][1] < self.pts[6][1] and self.pts[4][1] < self.pts[10][1] and self.pts[4][1] < self.pts[14][1] and self.pts[4][1] < self.pts[18][1]):
                ch1 = 'Backspace'

        # Stable confirmation logic
        if ch1 == "next" and self.prev_char != "next":
            if self.ten_prev_char[(self.count-2)%10] != "next":
                if self.ten_prev_char[(self.count-2)%10] == "Backspace":
                    self.sentence = self.sentence[0:-1]
                else:
                    if self.ten_prev_char[(self.count - 2) % 10] != "Backspace":
                        self.sentence = self.sentence + self.ten_prev_char[(self.count-2)%10]
            else:
                if self.ten_prev_char[(self.count - 0) % 10] != "Backspace":
                    self.sentence = self.sentence + self.ten_prev_char[(self.count - 0) % 10]

        if ch1 == "  " and self.prev_char != "  ":
            self.sentence = self.sentence + "  "

        self.prev_char = ch1
        self.current_symbol = ch1
        self.count += 1
        self.ten_prev_char[self.count % 10] = ch1

        self.update_suggestions()

    def select_suggestion(self, index):
        # Replace the last word in the sentence with the selected suggestion
        st = self.sentence.rfind(" ")
        self.sentence = self.sentence[:st+1]
        
        selected = ""
        if index == 1:
            selected = self.word1
        elif index == 2:
            selected = self.word2
        elif index == 3:
            selected = self.word3
        elif index == 4:
            selected = self.word4
            
        self.sentence += selected.upper()
        self.update_suggestions()

state = SignState()

def predict_gesture(cv_frame):
    # Runs the actual mediapipe and CNN model process to classify hand gesture
    hands = hd.findHands(cv_frame, draw=False, flipType=True)
    if not hands or not hands[0]:
        return None, None

    # Get first detected hand
    hand_dict = hands[0][0] # Since findHands returns (hands_list, img)
    x, y, w, h = hand_dict['bbox']
    offset = 29

    # Add bounds validation
    h_f, w_f, _ = cv_frame.shape
    y1, y2 = max(0, y - offset), min(h_f, y + h + offset)
    x1, x2 = max(0, x - offset), min(w_f, x + w + offset)
    
    if y2 <= y1 or x2 <= x1:
        return None, None

    crop_img = cv_frame[y1:y2, x1:x2]
    if crop_img.size == 0:
        return None, None

    # Hand detector on cropped image
    handz = hd2.findHands(crop_img, draw=False, flipType=True)
    if not handz or not handz[0]:
        return None, None

    hand_map = handz[0][0]
    pts = hand_map['lmList']

    # Draw skeleton centered on a 400x400 white canvas
    white = np.ones((400, 400, 3), dtype=np.uint8) * 255
    os_x = ((400 - w) // 2) - 15
    os_y = ((400 - h) // 2) - 15

    # Lines drawing
    line_groups = [
        (0, 4),   # Thumb
        (5, 8),   # Index
        (9, 12),  # Middle
        (13, 16), # Ring
        (17, 20)  # Pinky
    ]
    for start, end in line_groups:
        for t in range(start, end):
            cv2.line(white, 
                     (pts[t][0] + os_x, pts[t][1] + os_y), 
                     (pts[t+1][0] + os_x, pts[t+1][1] + os_y), 
                     (0, 255, 0), 3)

    # Connections between finger bases
    cv2.line(white, (pts[5][0] + os_x, pts[5][1] + os_y), (pts[9][0] + os_x, pts[9][1] + os_y), (0, 255, 0), 3)
    cv2.line(white, (pts[9][0] + os_x, pts[9][1] + os_y), (pts[13][0] + os_x, pts[13][1] + os_y), (0, 255, 0), 3)
    cv2.line(white, (pts[13][0] + os_x, pts[13][1] + os_y), (pts[17][0] + os_x, pts[17][1] + os_y), (0, 255, 0), 3)
    cv2.line(white, (pts[0][0] + os_x, pts[0][1] + os_y), (pts[5][0] + os_x, pts[5][1] + os_y), (0, 255, 0), 3)
    cv2.line(white, (pts[0][0] + os_x, pts[0][1] + os_y), (pts[17][0] + os_x, pts[17][1] + os_y), (0, 255, 0), 3)

    # Landmark circles
    for i in range(21):
        cv2.circle(white, (pts[i][0] + os_x, pts[i][1] + os_y), 2, (0, 0, 255), 1)

    # Reshape and predict
    white_input = white.reshape(1, 400, 400, 3)
    prob = np.array(model.predict(white_input, verbose=0)[0], dtype='float32')
    
    ch1 = np.argmax(prob, axis=0)
    prob[ch1] = 0
    ch2 = np.argmax(prob, axis=0)
    prob[ch2] = 0
    ch3 = np.argmax(prob, axis=0)
    prob[ch3] = 0

    pl = [ch1, ch2]

    # Model subgroup classifications using self.pts logic
    # Group [Aemnst]
    l = [[5, 2], [5, 3], [3, 5], [3, 6], [3, 0], [3, 2], [6, 4], [6, 1], [6, 2], [6, 6], [6, 7], [6, 0], [6, 5],
         [4, 1], [1, 0], [1, 1], [6, 3], [1, 6], [5, 6], [5, 1], [4, 5], [1, 4], [1, 5], [2, 0], [2, 6], [4, 6],
         [1, 0], [5, 7], [1, 6], [6, 1], [7, 6], [2, 5], [7, 1], [5, 4], [7, 0], [7, 5], [7, 2]]
    if pl in l:
        if (pts[6][1] < pts[8][1] and pts[10][1] < pts[12][1] and pts[14][1] < pts[16][1] and pts[18][1] < pts[20][1]):
            ch1 = 0

    # Group [o][s]
    l = [[2, 2], [2, 1]]
    if pl in l:
        if (pts[5][0] < pts[4][0]):
            ch1 = 0

    # Group [c0][aemnst]
    l = [[0, 0], [0, 6], [0, 2], [0, 5], [0, 1], [0, 7], [5, 2], [7, 6], [7, 1]]
    pl = [ch1, ch2]
    if pl in l:
        if (pts[0][0] > pts[8][0] and pts[0][0] > pts[4][0] and pts[0][0] > pts[12][0] and pts[0][0] > pts[16][0] and pts[0][0] > pts[20][0]) and pts[5][0] > pts[4][0]:
            ch1 = 2

    # Group [c0][aemnst]
    l = [[6, 0], [6, 6], [6, 2]]
    pl = [ch1, ch2]
    if pl in l:
        if math.sqrt(((pts[8][0] - pts[16][0]) ** 2) + ((pts[8][1] - pts[16][1]) ** 2)) < 52:
            ch1 = 2

    # Group [gh][bdfikruvw]
    l = [[1, 4], [1, 5], [1, 6], [1, 3], [1, 0]]
    pl = [ch1, ch2]
    if pl in l:
        if pts[6][1] > pts[8][1] and pts[14][1] < pts[16][1] and pts[18][1] < pts[20][1] and pts[0][0] < pts[8][0] and pts[0][0] < pts[12][0] and pts[0][0] < pts[16][0] and pts[0][0] < pts[20][0]:
            ch1 = 3

    # Group [gh][l]
    l = [[4, 6], [4, 1], [4, 5], [4, 3], [4, 7]]
    pl = [ch1, ch2]
    if pl in l:
        if pts[4][0] > pts[0][0]:
            ch1 = 3

    # Group [gh][pqz]
    l = [[5, 3], [5, 0], [5, 7], [5, 4], [5, 2], [5, 1], [5, 5]]
    pl = [ch1, ch2]
    if pl in l:
        if pts[2][1] + 15 < pts[16][1]:
            ch1 = 3

    # Group [l][x]
    l = [[6, 4], [6, 1], [6, 2]]
    pl = [ch1, ch2]
    if pl in l:
        if math.sqrt(((pts[4][0] - pts[11][0]) ** 2) + ((pts[4][1] - pts[11][1]) ** 2)) > 55:
            ch1 = 4

    # Group [l][d]
    l = [[1, 4], [1, 6], [1, 1]]
    pl = [ch1, ch2]
    if pl in l:
        if (math.sqrt(((pts[4][0] - pts[11][0]) ** 2) + ((pts[4][1] - pts[11][1]) ** 2)) > 50) and (
                pts[6][1] > pts[8][1] and pts[10][1] < pts[12][1] and pts[14][1] < pts[16][1] and pts[18][1] < pts[20][1]):
            ch1 = 4

    # Group [l][gh]
    l = [[3, 6], [3, 4]]
    pl = [ch1, ch2]
    if pl in l:
        if (pts[4][0] < pts[0][0]):
            ch1 = 4

    # Group [l][c0]
    l = [[2, 2], [2, 5], [2, 4]]
    pl = [ch1, ch2]
    if pl in l:
        if (pts[1][0] < pts[12][0]):
            ch1 = 4

    # Group [gh][z]
    l = [[3, 6], [3, 5], [3, 4]]
    pl = [ch1, ch2]
    if pl in l:
        if (pts[6][1] > pts[8][1] and pts[10][1] < pts[12][1] and pts[14][1] < pts[16][1] and pts[18][1] < pts[20][1]) and pts[4][1] > pts[10][1]:
            ch1 = 5

    # Group [gh][pq]
    l = [[3, 2], [3, 1], [3, 6]]
    pl = [ch1, ch2]
    if pl in l:
        if pts[4][1] + 17 > pts[8][1] and pts[4][1] + 17 > pts[12][1] and pts[4][1] + 17 > pts[16][1] and pts[4][1] + 17 > pts[20][1]:
            ch1 = 5

    # Group [l][pqz]
    l = [[4, 4], [4, 5], [4, 2], [7, 5], [7, 6], [7, 0]]
    pl = [ch1, ch2]
    if pl in l:
        if pts[4][0] > pts[0][0]:
            ch1 = 5

    # Group [pqz][aemnst]
    l = [[0, 2], [0, 6], [0, 1], [0, 5], [0, 0], [0, 7], [0, 4], [0, 3], [2, 7]]
    pl = [ch1, ch2]
    if pl in l:
        if pts[0][0] < pts[8][0] and pts[0][0] < pts[12][0] and pts[0][0] < pts[16][0] and pts[0][0] < pts[20][0]:
            ch1 = 5

    # Group [pqz][yj]
    l = [[5, 7], [5, 2], [5, 6]]
    pl = [ch1, ch2]
    if pl in l:
        if pts[3][0] < pts[0][0]:
            ch1 = 7

    # Group [l][yj]
    l = [[4, 6], [4, 2], [4, 4], [4, 1], [4, 5], [4, 7]]
    pl = [ch1, ch2]
    if pl in l:
        if pts[6][1] < pts[8][1]:
            ch1 = 7

    # Group [x][yj]
    l = [[6, 7], [0, 7], [0, 1], [0, 0], [6, 4], [6, 6], [6, 5], [6, 1]]
    pl = [ch1, ch2]
    if pl in l:
        if pts[18][1] > pts[20][1]:
            ch1 = 7

    # Group [x][aemnst]
    l = [[0, 4], [0, 2], [0, 3], [0, 1], [0, 6]]
    pl = [ch1, ch2]
    if pl in l:
        if pts[5][0] > pts[16][0]:
            ch1 = 6

    # Group [yj][x]
    l = [[7, 2]]
    pl = [ch1, ch2]
    if pl in l:
        if pts[18][1] < pts[20][1] and pts[8][1] < pts[10][1]:
            ch1 = 6

    # Group [c0][x]
    l = [[2, 1], [2, 2], [2, 6], [2, 7], [2, 0]]
    pl = [ch1, ch2]
    if pl in l:
        if math.sqrt(((pts[8][0] - pts[16][0]) ** 2) + ((pts[8][1] - pts[16][1]) ** 2)) > 50:
            ch1 = 6

    # Group [l][x]
    l = [[4, 6], [4, 2], [4, 1], [4, 4]]
    pl = [ch1, ch2]
    if pl in l:
        if math.sqrt(((pts[4][0] - pts[11][0]) ** 2) + ((pts[4][1] - pts[11][1]) ** 2)) < 60:
            ch1 = 6

    # Group [x][d]
    l = [[1, 4], [1, 6], [1, 0], [1, 2]]
    pl = [ch1, ch2]
    if pl in l:
        if pts[5][0] - pts[4][0] - 15 > 0:
            ch1 = 6

    # Group [b][pqz]
    l = [[5, 0], [5, 1], [5, 4], [5, 5], [5, 6], [6, 1], [7, 6], [0, 2], [7, 1], [7, 4], [6, 6], [7, 2], [5, 0],
         [6, 3], [6, 4], [7, 5], [7, 2]]
    pl = [ch1, ch2]
    if pl in l:
        if (pts[6][1] > pts[8][1] and pts[10][1] > pts[12][1] and pts[14][1] > pts[16][1] and pts[18][1] > pts[20][1]):
            ch1 = 1

    # Group [f][pqz]
    l = [[6, 1], [6, 0], [0, 3], [6, 4], [2, 2], [0, 6], [6, 2], [7, 6], [4, 6], [4, 1], [4, 2], [0, 2], [7, 1],
         [7, 4], [6, 6], [7, 2], [7, 5], [7, 2]]
    pl = [ch1, ch2]
    if pl in l:
        if (pts[6][1] < pts[8][1] and pts[10][1] > pts[12][1] and pts[14][1] > pts[16][1] and pts[18][1] > pts[20][1]):
            ch1 = 1

    l = [[6, 1], [6, 0], [4, 2], [4, 1], [4, 6], [4, 4]]
    pl = [ch1, ch2]
    if pl in l:
        if (pts[10][1] > pts[12][1] and pts[14][1] > pts[16][1] and pts[18][1] > pts[20][1]):
            ch1 = 1

    # Group [d][pqz]
    l = [[5, 0], [3, 4], [3, 0], [3, 1], [3, 5], [5, 5], [5, 4], [5, 1], [7, 6]]
    pl = [ch1, ch2]
    if pl in l:
        if ((pts[6][1] > pts[8][1] and pts[10][1] < pts[12][1] and pts[14][1] < pts[16][1] and
             pts[18][1] < pts[20][1]) and (pts[2][0] < pts[0][0]) and pts[4][1] > pts[14][1]):
            ch1 = 1

    l = [[4, 1], [4, 2], [4, 4]]
    pl = [ch1, ch2]
    if pl in l:
        if (math.sqrt(((pts[4][0] - pts[11][0]) ** 2) + ((pts[4][1] - pts[11][1]) ** 2)) < 50) and (
                pts[6][1] > pts[8][1] and pts[10][1] < pts[12][1] and pts[14][1] < pts[16][1] and pts[18][1] < pts[20][1]):
            ch1 = 1

    l = [[3, 4], [3, 0], [3, 1], [3, 5], [3, 6]]
    pl = [ch1, ch2]
    if pl in l:
        if ((pts[6][1] > pts[8][1] and pts[10][1] < pts[12][1] and pts[14][1] < pts[16][1] and
             pts[18][1] < pts[20][1]) and (pts[2][0] < pts[0][0]) and pts[14][1] < pts[4][1]):
            ch1 = 1

    l = [[6, 6], [6, 4], [6, 1], [6, 2]]
    pl = [ch1, ch2]
    if pl in l:
        if pts[5][0] - pts[4][0] - 15 < 0:
            ch1 = 1

    # Group [i][pqz]
    l = [[5, 4], [5, 5], [5, 1], [0, 3], [0, 7], [5, 0], [0, 2], [6, 2], [7, 5], [7, 1], [7, 6], [7, 7]]
    pl = [ch1, ch2]
    if pl in l:
        if (pts[6][1] < pts[8][1] and pts[10][1] < pts[12][1] and pts[14][1] < pts[16][1] and pts[18][1] > pts[20][1]):
            ch1 = 1

    # Group [yj][bfdi]
    l = [[1, 5], [1, 7], [1, 1], [1, 6], [1, 3], [1, 0]]
    pl = [ch1, ch2]
    if pl in l:
        if (pts[4][0] < pts[5][0] + 15) and ((pts[6][1] < pts[8][1] and pts[10][1] < pts[12][1] and pts[14][1] < pts[16][1] and pts[18][1] > pts[20][1])):
            ch1 = 7

    # Group [uvr]
    l = [[5, 5], [5, 0], [5, 4], [5, 1], [4, 6], [4, 1], [7, 6], [3, 0], [3, 5]]
    pl = [ch1, ch2]
    if pl in l:
        if ((pts[6][1] > pts[8][1] and pts[10][1] > pts[12][1] and pts[14][1] < pts[16][1] and
             pts[18][1] < pts[20][1])) and pts[4][1] > pts[14][1]:
            ch1 = 1

    # Group [w]
    fg = 13
    l = [[3, 5], [3, 0], [3, 6], [5, 1], [4, 1], [2, 0], [5, 0], [5, 5]]
    pl = [ch1, ch2]
    if pl in l:
        if not (pts[0][0] + fg < pts[8][0] and pts[0][0] + fg < pts[12][0] and pts[0][0] + fg < pts[16][0] and pts[0][0] + fg < pts[20][0]) and not (
                pts[0][0] > pts[8][0] and pts[0][0] > pts[12][0] and pts[0][0] > pts[16][0] and pts[0][0] > pts[20][0]) and math.sqrt(((pts[4][0] - pts[11][0]) ** 2) + ((pts[4][1] - pts[11][1]) ** 2)) < 50:
            ch1 = 1

    # Group [w]
    l = [[5, 0], [5, 5], [0, 1]]
    pl = [ch1, ch2]
    if pl in l:
        if pts[6][1] > pts[8][1] and pts[10][1] > pts[12][1] and pts[14][1] > pts[16][1]:
            ch1 = 1

    # Subgroups final mapping
    if ch1 == 0:
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

    elif ch1 == 2:
        if math.sqrt(((pts[12][0] - pts[4][0]) ** 2) + ((pts[12][1] - pts[4][1]) ** 2)) > 42:
            ch1 = 'C'
        else:
            ch1 = 'O'

    elif ch1 == 3:
        if math.sqrt(((pts[8][0] - pts[12][0]) ** 2) + ((pts[8][1] - pts[12][1]) ** 2)) > 72:
            ch1 = 'G'
        else:
            ch1 = 'H'

    elif ch1 == 7:
        if math.sqrt(((pts[8][0] - pts[4][0]) ** 2) + ((pts[8][1] - pts[4][1]) ** 2)) > 42:
            ch1 = 'Y'
        else:
            ch1 = 'J'

    elif ch1 == 4:
        ch1 = 'L'

    elif ch1 == 6:
        ch1 = 'X'

    elif ch1 == 5:
        if pts[4][0] > pts[12][0] and pts[4][0] > pts[16][0] and pts[4][0] > pts[20][0]:
            if pts[8][1] < pts[5][1]:
                ch1 = 'Z'
            else:
                ch1 = 'Q'
        else:
            ch1 = 'P'

    elif ch1 == 1:
        if (pts[6][1] > pts[8][1] and pts[10][1] > pts[12][1] and pts[14][1] > pts[16][1] and pts[18][1] > pts[20][1]):
            ch1 = 'B'
        if (pts[6][1] > pts[8][1] and pts[10][1] < pts[12][1] and pts[14][1] < pts[16][1] and pts[18][1] < pts[20][1]):
            ch1 = 'D'
        if (pts[6][1] < pts[8][1] and pts[10][1] > pts[12][1] and pts[14][1] > pts[16][1] and pts[18][1] > pts[20][1]):
            ch1 = 'F'
        if (pts[6][1] < pts[8][1] and pts[10][1] < pts[12][1] and pts[14][1] < pts[16][1] and pts[18][1] > pts[20][1]):
            ch1 = 'I'
        if (pts[6][1] > pts[8][1] and pts[10][1] > pts[12][1] and pts[14][1] > pts[16][1] and pts[18][1] < pts[20][1]):
            ch1 = 'W'
        if (pts[6][1] > pts[8][1] and pts[10][1] > pts[12][1] and pts[14][1] < pts[16][1] and pts[18][1] < pts[20][1]) and pts[4][1] < pts[9][1]:
            ch1 = 'K'
        if ((math.sqrt(((pts[8][0] - pts[12][0]) ** 2) + ((pts[8][1] - pts[12][1]) ** 2)) - math.sqrt(((pts[6][0] - pts[10][0]) ** 2) + ((pts[6][1] - pts[10][1]) ** 2))) < 8) and (
                pts[6][1] > pts[8][1] and pts[10][1] > pts[12][1] and pts[14][1] < pts[16][1] and pts[18][1] < pts[20][1]):
            ch1 = 'U'
        if ((math.sqrt(((pts[8][0] - pts[12][0]) ** 2) + ((pts[8][1] - pts[12][1]) ** 2)) - math.sqrt(((pts[6][0] - pts[10][0]) ** 2) + ((pts[6][1] - pts[10][1]) ** 2))) >= 8) and (
                pts[6][1] > pts[8][1] and pts[10][1] > pts[12][1] and pts[14][1] < pts[16][1] and pts[18][1] < pts[20][1]) and (pts[4][1] > pts[9][1]):
            ch1 = 'V'
        if (pts[8][0] > pts[12][0]) and (
                pts[6][1] > pts[8][1] and pts[10][1] > pts[12][1] and pts[14][1] < pts[16][1] and pts[18][1] < pts[20][1]):
            ch1 = 'R'

    return ch1, pts

async def handle_connection(websocket):
    print("Client connected.")
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                action = data.get("action")
                
                if action == "clear":
                    state.reset()
                    await websocket.send(json.dumps({
                        "status": "cleared",
                        "sentence": state.sentence,
                        "suggestions": []
                    }))
                    continue
                
                elif action == "select_suggestion":
                    idx = data.get("index") # 1, 2, 3, or 4
                    if idx in (1, 2, 3, 4):
                        state.select_suggestion(idx)
                    await websocket.send(json.dumps({
                        "status": "success",
                        "current_symbol": state.current_symbol,
                        "sentence": state.sentence,
                        "word": state.word,
                        "suggestions": [state.word1, state.word2, state.word3, state.word4]
                    }))
                    continue
                
                # Default behavior: Process image frame
                frame_data = data.get("frame")
                if not frame_data:
                    continue
                
                # Base64 decode
                if "," in frame_data:
                    frame_data = frame_data.split(",")[1]
                img_bytes = base64.b64decode(frame_data)
                nparr = np.frombuffer(img_bytes, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                frame = cv2.flip(frame, 1) # Align horizontal flip

                raw_symbol, pts = predict_gesture(frame)
                
                if raw_symbol and pts:
                    # Update sentence state using stabilized confirmation rules
                    state.process_symbol(raw_symbol, pts)
                
                # Construct response
                response = {
                    "status": "success",
                    "current_symbol": state.current_symbol,
                    "sentence": state.sentence,
                    "word": state.word,
                    "suggestions": [w for w in [state.word1, state.word2, state.word3, state.word4] if w.strip()]
                }
                await websocket.send(json.dumps(response))
                
            except Exception as e:
                # traceback.print_exc()
                await websocket.send(json.dumps({
                    "status": "error",
                    "message": str(e)
                }))
    except websockets.exceptions.ConnectionClosedOK:
        print("Client disconnected normally.")
    except Exception as e:
        print("Connection error:", e)

async def main():
    async with websockets.serve(handle_connection, "localhost", 5005):
        print("Sign Language Recognition server running on ws://localhost:5005")
        await asyncio.Future() # run forever

if __name__ == "__main__":
    asyncio.run(main())
