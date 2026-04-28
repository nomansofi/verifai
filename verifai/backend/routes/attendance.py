from __future__ import annotations

from datetime import date
from typing import Literal, Optional

from fastapi import APIRouter, Query

from ..mock_data import ATTENDANCE

router = APIRouter(prefix="/api", tags=["attendance"])


Status = Literal["PRESENT", "ABSENT", "LATE"]
Method = Literal["FACE", "QR"]


@router.get("/attendance")
def get_attendance(
    department: Optional[str] = None,
    status: Optional[Status] = None,
    method: Optional[Method] = None,
    date_eq: Optional[date] = Query(default=None, alias="date"),
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
):
    records = ATTENDANCE

    if department:
        records = [r for r in records if r.get("department") == department]
    if status:
        records = [r for r in records if r.get("status") == status]
    if method:
        records = [r for r in records if r.get("method") == method]

    if date_eq:
        ds = date_eq.isoformat()
        records = [r for r in records if r.get("date") == ds]

    if start_date or end_date:
        sd = start_date.isoformat() if start_date else "0000-01-01"
        ed = end_date.isoformat() if end_date else "9999-12-31"
        records = [r for r in records if sd <= r.get("date", "") <= ed]

    return {"records": records}

