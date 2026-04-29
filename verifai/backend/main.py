from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import time

from .mock_data import ALERTS, USERS, access_logs
from .recognition import verifai
from .routes.analytics import router as analytics_router
from .routes.attendance import router as attendance_router
from .routes.users import router as users_router


class EnrollRequest(BaseModel):
    image: str
    name: str
    user_id: str
    role: str | None = None
    department: str | None = None


class RecognizeRequest(BaseModel):
    image: str | None = None
    mode: str | None = None


class QrCheckinRequest(BaseModel):
    code: str


app = FastAPI(title="VERIFAI API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
        "http://localhost:5178",
        "http://localhost:5179",
        "http://localhost:5180",
        "http://localhost:5181",
        "http://localhost:5182",
        "http://localhost:5183",
        "http://localhost:5184",
        "http://localhost:5185",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users_router)
app.include_router(attendance_router)
app.include_router(analytics_router)


@app.get("/api/health")
def health():
    return {"ok": True, "service": "verifai-backend"}


@app.post("/api/enroll")
def enroll(req: EnrollRequest):
    # Persist in-memory for the demo so refreshes keep the enrollment.
    if not any(u["id"] == req.user_id for u in USERS):
        USERS.insert(
            0,
            {
                "id": req.user_id,
                "name": req.name,
                "role": req.role or "Student",
                "department": req.department or "CSE",
            },
        )
    verifai.enroll_face(req.image, req.name, req.user_id)
    return {"ok": True, "name": req.name, "user_id": req.user_id}


@app.post("/api/recognize")
def recognize(req: RecognizeRequest):
    return verifai.recognize_face(req.image)


@app.post("/api/qr-checkin")
def qr_checkin(req: QrCheckinRequest):
    # Unified QR handler:
    # - Student/Employee QR: require `ts` and enforce 60s validity window against server time.
    # - Event/Exam QR: standard validation (accept for demo).
    payload = None
    try:
        payload = json.loads(req.code)
    except Exception:
        payload = None

    mode = None
    ts = None
    if isinstance(payload, dict):
        mode = str(payload.get("mode") or payload.get("type") or "").lower()
        ts = payload.get("ts") or payload.get("timestamp")

    # If a mode isn't provided, assume non-student QR for demo.
    if mode in ("student", "employee"):
        try:
            ts_ms = int(ts)
        except Exception:
            return {"ok": False, "error": "Invalid QR code (missing timestamp)", "reason": "missing_ts"}

        now_ms = int(time.time() * 1000)
        diff = abs(now_ms - ts_ms)
        if diff > 60_000:
            return {"ok": False, "error": "Expired QR Code", "reason": "expired", "diffMs": diff}

    return {"ok": True, "code": req.code, "status": "PRESENT"}


@app.get("/api/alerts")
def get_alerts():
    return {"alerts": ALERTS}


@app.get("/api/access-logs")
def get_access_logs():
    return {"logs": access_logs(14)}

