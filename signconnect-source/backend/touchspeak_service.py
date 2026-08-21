"""
TouchSpeak Service Module for SignConnect Unified Backend
Integrates TouchSpeak AAC Communication Board, AI Phrase Prediction, Caregiver Management, SOS Emergency, and Text-to-Speech synthesis.
"""

import os
import io
import time
import base64
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

# Optional MongoDB import with graceful fallback
try:
    from pymongo import MongoClient
    from bson import ObjectId
    HAS_PYMONGO = True
except ImportError:
    HAS_PYMONGO = False

# Shared Category Normalizer
def normalize_category(cat: Optional[str]) -> str:
    if not cat or not str(cat).strip():
        return "Uncategorized"
    s = str(cat).strip().lower()
    if s in ["needs", "cat_needs", "need"]:
        return "Needs"
    if s in ["emotions", "cat_emotions", "emotion"]:
        return "Emotions"
    if s in ["emergency", "cat_emergency"]:
        return "Emergency"
    if s in ["feelings", "cat_feelings", "feeling", "cat_phrases", "phrases", "quick phrases"]:
        return "Feelings"
    print(f"[Category Warning] Unrecognized category '{cat}', returning title case.")
    return str(cat).strip().title()

# Shared Default Categories System
DEFAULT_CATEGORIES = [
    {"id": "Needs", "name": "Needs", "icon": "Utensils", "display_order": 1},
    {"id": "Emotions", "name": "Emotions", "icon": "Smile", "display_order": 2},
    {"id": "Emergency", "name": "Emergency", "icon": "Siren", "display_order": 3},
    {"id": "Feelings", "name": "Feelings", "icon": "Activity", "display_order": 4},
]

# Default Communication Cards aligned with official category system
DEFAULT_CARDS = [
    # Needs Category
    {
        "id": "card_hungry",
        "category": "Needs",
        "category_id": "Needs",
        "title": "Food",
        "phrase": "I want food.",
        "spoken_phrase": "I want food.",
        "icon": "Utensils",
        "display_order": 1,
        "translations": {
            "en": "I want food.",
            "ta": "எனக்கு சாப்பாடு வேண்டும்.",
            "hi": "मुझे खाना चाहिए।"
        }
    },
    {
        "id": "card_water",
        "category": "Needs",
        "category_id": "Needs",
        "title": "Water",
        "phrase": "I want water.",
        "spoken_phrase": "I want water.",
        "icon": "Droplet",
        "display_order": 2,
        "translations": {
            "en": "I want water.",
            "ta": "எனக்கு தண்ணீர் வேண்டும்.",
            "hi": "मुझे पानी चाहिए।"
        }
    },
    {
        "id": "card_medicine",
        "category": "Needs",
        "category_id": "Needs",
        "title": "Medicine",
        "phrase": "I need my medicine.",
        "spoken_phrase": "I need my medicine.",
        "icon": "Pill",
        "display_order": 3,
        "translations": {
            "en": "I need my medicine.",
            "ta": "எனக்கு மருந்து வேண்டும்.",
            "hi": "मुझे दवा चाहिए।"
        }
    },
    {
        "id": "card_restroom",
        "category": "Needs",
        "category_id": "Needs",
        "title": "Restroom",
        "phrase": "I want to go to the restroom.",
        "spoken_phrase": "I want to go to the restroom.",
        "icon": "Bath",
        "display_order": 4,
        "translations": {
            "en": "I want to go to the restroom.",
            "ta": "எனக்கு கழிப்பறைக்கு செல்ல வேண்டும்.",
            "hi": "मुझे शौचालय जाना है।"
        }
    },
    {
        "id": "card_sleep",
        "category": "Needs",
        "category_id": "Needs",
        "title": "Sleep",
        "phrase": "I want to sleep.",
        "spoken_phrase": "I want to sleep.",
        "icon": "Moon",
        "display_order": 5,
        "translations": {
            "en": "I want to sleep.",
            "ta": "நான் தூங்க வேண்டும்.",
            "hi": "मैं सोना चाहता हूँ।"
        }
    },
    {
        "id": "card_caregiver",
        "category": "Needs",
        "category_id": "Needs",
        "title": "Caregiver",
        "phrase": "I need my caregiver.",
        "spoken_phrase": "I need my caregiver.",
        "icon": "Hand",
        "display_order": 6,
        "translations": {
            "en": "I need my caregiver.",
            "ta": "எனக்கு என் பராமரிப்பாளர் வேண்டும்.",
            "hi": "मुझे अपने देखभालकर्ता की आवश्यकता है।"
        }
    },

    # Emotions Category
    {
        "id": "card_happy",
        "category": "Emotions",
        "category_id": "Emotions",
        "title": "Happy",
        "phrase": "I am feeling happy.",
        "spoken_phrase": "I am feeling happy.",
        "icon": "Smile",
        "display_order": 7,
        "translations": {
            "en": "I am feeling happy.",
            "ta": "நான் மகிழ்ச்சியாக உணர்கிறேன்.",
            "hi": "मैं खुश महसूस कर रहा हूँ।"
        }
    },
    {
        "id": "card_sad",
        "category": "Emotions",
        "category_id": "Emotions",
        "title": "Sad",
        "phrase": "I am feeling sad.",
        "spoken_phrase": "I am feeling sad.",
        "icon": "Frown",
        "display_order": 8,
        "translations": {
            "en": "I am feeling sad.",
            "ta": "நான் வருத்தமாக இருக்கிறேன்.",
            "hi": "मैं उदास महसूस कर रहा हूँ।"
        }
    },
    {
        "id": "card_thankful",
        "category": "Emotions",
        "category_id": "Emotions",
        "title": "Thank You",
        "phrase": "Thank you very much.",
        "spoken_phrase": "Thank you very much.",
        "icon": "Heart",
        "display_order": 9,
        "translations": {
            "en": "Thank you very much.",
            "ta": "மிக்க நன்றி.",
            "hi": "आपका बहुत-बहुत धन्यवाद।"
        }
    },

    # Emergency Category
    {
        "id": "card_emergency_help",
        "category": "Emergency",
        "category_id": "Emergency",
        "title": "Emergency Help",
        "phrase": "I need help",
        "spoken_phrase": "I need help",
        "icon": "Siren",
        "display_order": 10,
        "is_emergency": True,
        "translations": {
            "en": "I need help",
            "ta": "எனக்கு உதவி வேண்டும்",
            "hi": "मुझे मदद चाहिए"
        }
    },
    {
        "id": "card_call_doctor",
        "category": "Emergency",
        "category_id": "Emergency",
        "title": "Call Doctor",
        "phrase": "Please call a doctor.",
        "spoken_phrase": "Please call a doctor.",
        "icon": "PhoneCall",
        "display_order": 11,
        "translations": {
            "en": "Please call a doctor.",
            "ta": "தயவுசெய்து மருத்துவரை அழைக்கவும்.",
            "hi": "कृपया डॉक्टर को बुलाएं।"
        }
    },

    # Feelings Category
    {
        "id": "card_pain",
        "category": "Feelings",
        "category_id": "Feelings",
        "title": "Pain",
        "phrase": "I am in pain.",
        "spoken_phrase": "I am in pain.",
        "icon": "Activity",
        "display_order": 13,
        "translations": {
            "en": "I am in pain.",
            "ta": "எனக்கு வலிக்கிறது.",
            "hi": "मुझे दर्द हो रहा है।"
        }
    },
    {
        "id": "card_scared",
        "category": "Feelings",
        "category_id": "Feelings",
        "title": "Scared",
        "phrase": "I am feeling scared.",
        "spoken_phrase": "I am feeling scared.",
        "icon": "ShieldAlert",
        "display_order": 14,
        "translations": {
            "en": "I am feeling scared.",
            "ta": "எனக்கு பயமாக இருக்கிறது.",
            "hi": "मुझे डर लग रहा है।"
        }
    }
]



DEFAULT_CAREGIVERS = [
    {
        "id": "cg_1",
        "name": "Sarah Johnson",
        "relation": "Primary Caregiver",
        "phone": "+15550102233",
        "email": "sarah@example.com",
        "is_primary": True
    },
    {
        "id": "cg_2",
        "name": "Dr. Michael Chen",
        "relation": "Doctor",
        "phone": "+15550104477",
        "email": "chen@example.com",
        "is_primary": False
    }
]


class TouchSpeakService:
    def __init__(self, mongo_uri: Optional[str] = None):
        self.mongo_uri = mongo_uri or os.getenv("MONGO_URI", "mongodb://localhost:27017/touchspeak")
        self.db = None
        self.in_memory_cards = list(DEFAULT_CARDS)
        self.in_memory_categories = list(DEFAULT_CATEGORIES)
        self.in_memory_caregivers = list(DEFAULT_CAREGIVERS)
        self.in_memory_history: List[Dict[str, Any]] = []
        self.in_memory_sos_logs: List[Dict[str, Any]] = []
        self._init_db()

    def _init_db(self):
        if HAS_PYMONGO:
            try:
                client = MongoClient(self.mongo_uri, serverSelectionTimeoutMS=1500)
                client.admin.command('ping')
                self.db = client.get_database()
                print("[TouchSpeak Service] Connected to MongoDB successfully.")
                self._seed_mongodb()
            except Exception as e:
                print(f"[TouchSpeak Service] MongoDB unavailable ({e}). Using robust In-Memory Database Store.")
                self.db = None
        else:
            print("[TouchSpeak Service] PyMongo not installed. Using robust In-Memory Database Store.")

    def _seed_mongodb(self):
        if self.db is None:
            return
        try:
            if self.db.categories.count_documents({}) == 0:
                self.db.categories.insert_many(DEFAULT_CATEGORIES)
                print("[TouchSpeak Service] Seeded default categories to MongoDB.")
            if self.db.cards.count_documents({}) == 0:
                self.db.cards.insert_many(DEFAULT_CARDS)
                print("[TouchSpeak Service] Seeded default cards to MongoDB.")
            if self.db.caregivers.count_documents({}) == 0:
                self.db.caregivers.insert_many(DEFAULT_CAREGIVERS)
                print("[TouchSpeak Service] Seeded default caregivers to MongoDB.")
        except Exception as e:
            print(f"[TouchSpeak Service] MongoDB seed error: {e}")

    def get_categories(self) -> List[Dict[str, Any]]:
        if self.db is not None:
            try:
                cats = list(self.db.categories.find({}, {"_id": 0}).sort("display_order", 1))
                if cats:
                    return cats
            except Exception:
                pass
        return self.in_memory_categories

    def get_cards(self, category_id: Optional[str] = None) -> List[Dict[str, Any]]:
        cards = []
        if self.db is not None:
            try:
                cards = list(self.db.cards.find({}, {"_id": 0}).sort("display_order", 1))
            except Exception:
                pass

        if not cards:
            cards = list(self.in_memory_cards)

        # Always normalize categories and ensure valid translations structure
        for c in cards:
            raw_cat = c.get("category") or c.get("category_id") or "Needs"
            norm_cat = normalize_category(raw_cat)
            c["category"] = norm_cat
            c["category_id"] = norm_cat
            
            # Ensure spoken_phrase and phrase compatibility
            if "spoken_phrase" not in c or not c["spoken_phrase"]:
                c["spoken_phrase"] = c.get("phrase", "")
            if "phrase" not in c or not c["phrase"]:
                c["phrase"] = c.get("spoken_phrase", "")

            # Ensure Emergency Help card strictly has phrase 'I need help'
            if c.get("id") == "card_emergency_help" or c.get("title") == "Emergency Help":
                c["phrase"] = "I need help"
                c["spoken_phrase"] = "I need help"
                c["translations"] = {
                    "en": "I need help",
                    "ta": "எனக்கு உதவி வேண்டும்",
                    "hi": "मुझे मदद चाहिए"
                }

            # Ensure translations object with en, ta, hi
            trans = c.get("translations") or c.get("phrases") or {}
            en_val = trans.get("en") or c.get("phrase_en") or c.get("phrase") or c.get("spoken_phrase") or ""
            ta_val = trans.get("ta") or c.get("phrase_ta") or ""
            hi_val = trans.get("hi") or c.get("phrase_hi") or ""
            c["translations"] = {
                "en": en_val,
                "ta": ta_val,
                "hi": hi_val
            }
            c["phrases"] = c["translations"]

        if category_id and category_id.lower() != "all":
            norm_target = normalize_category(category_id)
            cards = [c for c in cards if c.get("category") == norm_target]

        return cards

    def add_card(self, card_data: Dict[str, Any]) -> Dict[str, Any]:
        raw_cat = card_data.get("category") or card_data.get("category_id") or "Needs"
        norm_cat = normalize_category(raw_cat)

        card_id = card_data.get("id") or f"card_{int(time.time()*1000)}"

        # Extract multilingual phrases from translations dict, phrases dict, or top-level params
        trans_input = card_data.get("translations") or card_data.get("phrases") or {}
        en_phrase = trans_input.get("en") or card_data.get("phrase_en") or card_data.get("phrase") or card_data.get("spoken_phrase") or ""
        ta_phrase = trans_input.get("ta") or card_data.get("phrase_ta") or ""
        hi_phrase = trans_input.get("hi") or card_data.get("phrase_hi") or ""

        card = {
            "id": card_id,
            "category": norm_cat,
            "category_id": norm_cat,
            "title": card_data.get("title", "Custom Card"),
            "phrase": en_phrase,
            "spoken_phrase": en_phrase,
            "icon": card_data.get("icon", "MessageSquare"),
            "display_order": card_data.get("display_order", len(self.in_memory_cards) + 1),
            "translations": {
                "en": en_phrase,
                "ta": ta_phrase,
                "hi": hi_phrase
            },
            "phrases": {
                "en": en_phrase,
                "ta": ta_phrase,
                "hi": hi_phrase
            }
        }

        if self.db is not None:
            try:
                db_payload = dict(card)
                self.db.cards.update_one({"id": card_id}, {"$set": db_payload}, upsert=True)
            except Exception as e:
                print(f"[TouchSpeak Service] Error inserting card to DB: {e}")

        # Update in-memory copy without _id
        card_copy = dict(card)
        card_copy.pop("_id", None)
        self.in_memory_cards = [c for c in self.in_memory_cards if c["id"] != card_id]
        self.in_memory_cards.append(card_copy)
        return card_copy

    def delete_card(self, card_id: str) -> bool:
        if self.db is not None:
            try:
                self.db.cards.delete_one({"id": card_id})
            except Exception as e:
                print(f"[TouchSpeak Service] Error deleting card from DB: {e}")

        self.in_memory_cards = [c for c in self.in_memory_cards if c["id"] != card_id]
        return True

    def record_card_click(self, user_id: str, card_id: str, phrase: str) -> None:
        log_entry = {
            "user_id": user_id,
            "card_id": card_id,
            "phrase": phrase,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        if self.db is not None:
            try:
                self.db.communication_history.insert_one(dict(log_entry))
            except Exception:
                pass
        self.in_memory_history.append(log_entry)

    def predict_next_phrases(self, user_id: str, top_n: int = 3) -> List[Dict[str, Any]]:
        user_history = [h for h in self.in_memory_history if h.get("user_id") == user_id]
        if self.db is not None:
            try:
                db_history = list(self.db.communication_history.find({"user_id": user_id}))
                if db_history:
                    user_history = db_history
            except Exception:
                pass

        if not user_history:
            cold_ids = ["card_water", "card_hungry", "card_thankful"]
            results = []
            for c_id in cold_ids[:top_n]:
                card = next((c for c in self.in_memory_cards if c["id"] == c_id), None)
                if card:
                    results.append({
                        "card_id": card["id"],
                        "title": card["title"],
                        "phrase": card["phrase"],
                        "icon": card["icon"],
                        "score": 0.95
                    })
            return results

        scores: Dict[str, float] = {}
        for idx, item in enumerate(user_history):
            c_id = item.get("card_id")
            if not c_id:
                continue
            recency_weight = (idx + 1) / len(user_history)
            scores[c_id] = scores.get(c_id, 0.0) + 1.0 + (recency_weight * 0.5)

        sorted_ids = sorted(scores.keys(), key=lambda k: scores[k], reverse=True)
        predictions = []
        for c_id in sorted_ids[:top_n]:
            card = next((c for c in self.in_memory_cards if c["id"] == c_id), None)
            if card:
                predictions.append({
                    "card_id": card["id"],
                    "title": card["title"],
                    "phrase": card["phrase"],
                    "icon": card["icon"],
                    "score": round(scores[c_id], 2)
                })

        return predictions

    def get_caregivers(self) -> List[Dict[str, Any]]:
        if self.db is not None:
            try:
                cgs = list(self.db.caregivers.find({}, {"_id": 0}))
                if cgs:
                    return cgs
            except Exception:
                pass
        return self.in_memory_caregivers

    def add_caregiver(self, caregiver_data: Dict[str, Any]) -> Dict[str, Any]:
        cg_id = caregiver_data.get("id") or f"cg_{int(time.time()*1000)}"
        caregiver = {
            "id": cg_id,
            "name": caregiver_data.get("name", "Caregiver"),
            "relation": caregiver_data.get("relation", "Caregiver"),
            "phone": caregiver_data.get("phone", ""),
            "email": caregiver_data.get("email", ""),
            "is_primary": caregiver_data.get("is_primary", False)
        }
        if self.db is not None:
            try:
                self.db.caregivers.insert_one(dict(caregiver))
            except Exception as e:
                print(f"[TouchSpeak Service] Error inserting caregiver to DB: {e}")

        cg_copy = dict(caregiver)
        cg_copy.pop("_id", None)
        self.in_memory_caregivers = [c for c in self.in_memory_caregivers if c["id"] != cg_id]
        self.in_memory_caregivers.append(cg_copy)
        return cg_copy

    def delete_caregiver(self, caregiver_id: str) -> bool:
        if self.db is not None:
            try:
                self.db.caregivers.delete_one({"id": caregiver_id})
            except Exception as e:
                print(f"[TouchSpeak Service] Error deleting caregiver: {e}")

        self.in_memory_caregivers = [c for c in self.in_memory_caregivers if c.get("id") != caregiver_id]
        return True

    def trigger_sos(
        self,
        user_id: str,
        location: Optional[Dict[str, float]] = None,
        message: Optional[str] = None,
        caregiver_name: Optional[str] = None,
        caregiver_phone: Optional[str] = None,
        status: Optional[str] = "Active"
    ) -> Dict[str, Any]:
        lat = location.get("latitude", 0.0) if location else 0.0
        lng = location.get("longitude", 0.0) if location else 0.0
        maps_link = f"https://www.google.com/maps?q={lat},{lng}"

        sos_entry = {
            "sos_id": f"sos_{int(time.time()*1000)}",
            "user_id": user_id or "Alex Rivera",
            "caregiver_name": caregiver_name or "Registered Caregiver",
            "caregiver_phone": caregiver_phone or "N/A",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "location": location or {"latitude": lat, "longitude": lng},
            "google_maps_link": maps_link,
            "message": message or "🚨 EMERGENCY SOS\n\nI need immediate assistance.\n\nMy current location:\n" + maps_link + "\n\nPlease help me immediately.",
            "status": status or "Active"
        }

        if self.db is not None:
            try:
                self.db.emergency_logs.insert_one(dict(sos_entry))
            except Exception as e:
                print(f"[TouchSpeak Service] DB SOS insert error: {e}")

        sos_copy = dict(sos_entry)
        sos_copy.pop("_id", None)
        self.in_memory_sos_logs.insert(0, sos_copy)
        print(f"[TouchSpeak SOS ALERT] Triggered for user '{user_id}': {sos_copy['message']}")
        return sos_copy

    def get_sos_logs(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        logs = []
        if self.db is not None:
            try:
                query = {"user_id": user_id} if user_id else {}
                logs = list(self.db.emergency_logs.find(query, {"_id": 0}).sort("timestamp", -1))
            except Exception:
                pass

        if not logs:
            logs = list(self.in_memory_sos_logs)
            if user_id:
                logs = [l for l in logs if l.get("user_id") == user_id]

        return logs

    def synthesize_tts(self, text: str, language: str = "en") -> Dict[str, Any]:
        if not text.strip():
            return {"ok": False, "error": "Empty text provided"}

        lang_code = language.lower()
        if lang_code not in ["en", "ta", "hi"]:
            lang_code = "en"

        try:
            from gtts import gTTS
            tts = gTTS(text=text, lang=lang_code)
            fp = io.BytesIO()
            tts.write_to_fp(fp)
            fp.seek(0)
            audio_b64 = base64.b64encode(fp.read()).decode("utf-8")
            return {
                "ok": True,
                "audio_base64": audio_b64,
                "mime_type": "audio/mp3",
                "engine": "gTTS"
            }
        except Exception as e:
            print(f"[TouchSpeak TTS Error] gTTS failed ({e}). Returning fallback audio indicator.")
            return {
                "ok": True,
                "audio_base64": "",
                "mime_type": "audio/mp3",
                "engine": "web_speech_fallback",
                "warning": f"Server-side TTS fallback: {e}"
            }


# Singleton service instance
touchspeak_service = TouchSpeakService()
