"""
WhatsApp Business Cloud API Integration Service for TouchSpeak AI / SignConnect.
Provides official API messaging, template support, error handling, and credential management.
"""

import os
import json
import urllib.request
import urllib.error
from datetime import datetime
from typing import Any, Dict, List, Optional

# Load .env environment variables if python-dotenv is available, or read from os.environ
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


class WhatsAppService:
    def __init__(self) -> None:
        self.access_token = os.getenv("WHATSAPP_ACCESS_TOKEN", "").strip()
        self.phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "").strip()
        self.api_version = os.getenv("WHATSAPP_API_VERSION", "v20.0").strip()
        self.template_name = os.getenv("WHATSAPP_TEMPLATE_NAME", "").strip()

    def is_configured(self) -> bool:
        return bool(self.access_token and self.phone_number_id)

    def clean_phone_number(self, phone: str) -> str:
        """Strips non-digit characters except leading plus, formatting for WhatsApp API (e.g. 15550102233)."""
        if not phone:
            return ""
        cleaned = "".join([c for c in phone if c.isdigit()])
        return cleaned

    def send_text_message(self, to_phone: str, message_body: str) -> Dict[str, Any]:
        """
        Sends a text message using official Meta WhatsApp Business Cloud API.
        POST https://graph.facebook.com/{version}/{phone_number_id}/messages
        """
        clean_phone = self.clean_phone_number(to_phone)
        if not clean_phone:
            return {"ok": False, "error": "Invalid or missing recipient phone number."}

        if not self.is_configured():
            return {
                "ok": False,
                "configured": False,
                "error": "WhatsApp Cloud API credentials not configured in backend .env. Please set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID."
            }

        url = f"https://graph.facebook.com/{self.api_version}/{self.phone_number_id}/messages"
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_phone,
            "type": "text",
            "text": {
                "preview_url": False,
                "body": message_body
            }
        }

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

        try:
            req_data = json.dumps(payload).encode("utf-8")
            request = urllib.request.Request(url, data=req_data, headers=headers, method="POST")
            
            with urllib.request.urlopen(request, timeout=12) as response:
                res_body = response.read().decode("utf-8")
                res_json = json.loads(res_body)
                return {
                    "ok": True,
                    "configured": True,
                    "phone": clean_phone,
                    "message_id": res_json.get("messages", [{}])[0].get("id", ""),
                    "response": res_json
                }
        except urllib.error.HTTPError as err:
            err_text = ""
            try:
                err_text = err.read().decode("utf-8")
                err_json = json.loads(err_text)
                meta_error = err_json.get("error", {}).get("message") or err_text
            except Exception:
                meta_error = str(err)
            
            # NEVER expose or log the access token in output
            print(f"[WhatsApp API Error] HTTP {err.code}: {meta_error}")
            return {
                "ok": False,
                "configured": True,
                "code": err.code,
                "error": f"WhatsApp API Error (HTTP {err.code}): {meta_error}"
            }
        except Exception as exc:
            print(f"[WhatsApp Service Error] {exc}")
            return {
                "ok": False,
                "configured": True,
                "error": f"Network/Service failure: {str(exc)}"
            }

    def send_communication_message(self, to_phone: str, user_name: str, phrase_text: str) -> Dict[str, Any]:
        """
        Formats and sends a standard AAC Communication message to caregiver.
        """
        current_time = datetime.now().strftime("%I:%M %p, %b %d, %Y")
        formatted_msg = (
            f"🔔 TouchSpeak AI\n\n"
            f"User: {user_name}\n\n"
            f"Request:\n\"{phrase_text}\"\n\n"
            f"Time: {current_time}"
        )
        return self.send_text_message(to_phone, formatted_msg)

    def send_sos_emergency_message(self, to_phone: str, user_name: str, google_maps_link: str) -> Dict[str, Any]:
        """
        Formats and sends an urgent Emergency SOS WhatsApp alert.
        """
        current_time = datetime.now().strftime("%I:%M %p, %b %d, %Y")
        formatted_msg = (
            f"🚨 EMERGENCY ALERT\n\n"
            f"User: {user_name}\n\n"
            f"The user has pressed the SOS button and needs immediate assistance.\n\n"
            f"Location:\n{google_maps_link}\n\n"
            f"Time:\n{current_time}"
        )
        return self.send_text_message(to_phone, formatted_msg)


# Singleton instance
whatsapp_service = WhatsAppService()
