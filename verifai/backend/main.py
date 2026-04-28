from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .mock_data import ALERTS, access_logs
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
    return verifai.enroll_face(req.image, req.name, req.user_id)


@app.post("/api/recognize")
def recognize(req: RecognizeRequest):
    return verifai.recognize_face(req.image)


@app.post("/api/qr-checkin")
def qr_checkin(req: QrCheckinRequest):
    # In production: decode QR -> lookup user -> mark attendance.
    return {"ok": True, "code": req.code, "status": "PRESENT"}


@app.get("/api/alerts")
def get_alerts():
    return {"alerts": ALERTS}


@app.get("/api/access-logs")
def get_access_logs():
    return {"logs": access_logs(14)}

