from __future__ import annotations

from fastapi import APIRouter

from ..mock_data import DEPARTMENTS, live_feed, today_snapshot, weekly_bars

router = APIRouter(prefix="/api", tags=["analytics"])


@router.get("/analytics")
def get_analytics():
    snapshot = today_snapshot()
    weekly = weekly_bars()
    feed = live_feed(10)
    departments = [
        {"name": "CSE", "rate": 92},
        {"name": "ECE", "rate": 88},
        {"name": "MBA", "rate": 85},
        {"name": "Admin", "rate": 90},
        {"name": "Security", "rate": 86},
    ]
    return {"snapshot": snapshot, "weekly": weekly, "liveFeed": feed, "departments": departments, "departmentList": DEPARTMENTS}

