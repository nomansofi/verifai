from __future__ import annotations

from datetime import datetime
from typing import Any

try:
    import face_recognition  # type: ignore
    import cv2  # type: ignore
    import numpy as np  # type: ignore
except Exception:  # pragma: no cover
    face_recognition = None  # type: ignore
    cv2 = None  # type: ignore
    np = None  # type: ignore


class VerifAI:
    def __init__(self) -> None:
        self.known_encodings: list[Any] = []
        self.known_names: list[str] = []

    def enroll_face(self, image: str, name: str, user_id: str) -> dict[str, Any]:
        # image is expected to be a base64 data URL in this demo.
        # In production: decode -> detect face -> compute embedding -> store in DB.
        self.known_names.append(f"{name} ({user_id})")
        return {"ok": True, "name": name, "user_id": user_id}

    def recognize_face(self, frame: str | None) -> dict[str, Any]:
        # In production: run face recognition + return box + confidence.
        return {"name": "Aarav Mehta", "confidence": 0.94, "status": "PRESENT", "box": [80, 70, 220, 210]}

    def mark_attendance(self, name: str, user_id: str, method: str = "FACE") -> dict[str, Any]:
        return {"ok": True, "name": name, "user_id": user_id, "method": method, "timestamp": datetime.utcnow().isoformat()}

    def detect_liveness(self, frame: str | None) -> dict[str, Any]:
        # Basic liveness placeholder (anti-spoofing). Replace with blink/texture/depth checks.
        return {"ok": True, "is_live": True, "confidence": 0.7}


verifai = VerifAI()

