from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any


DEPARTMENTS = ["CSE", "ECE", "MBA", "Admin", "Security"]

USERS = [
    {"id": "S-1001", "name": "Aarav Mehta", "role": "Student", "department": "CSE"},
    {"id": "S-1002", "name": "Isha Sharma", "role": "Student", "department": "CSE"},
    {"id": "S-1003", "name": "Kabir Singh", "role": "Student", "department": "ECE"},
    {"id": "S-1004", "name": "Ananya Rao", "role": "Student", "department": "ECE"},
    {"id": "S-1005", "name": "Vihaan Patel", "role": "Student", "department": "MBA"},
    {"id": "S-1006", "name": "Diya Nair", "role": "Student", "department": "MBA"},
    {"id": "E-2001", "name": "Rohan Kapoor", "role": "Employee", "department": "Admin"},
    {"id": "E-2002", "name": "Meera Iyer", "role": "Employee", "department": "Admin"},
    {"id": "E-2003", "name": "Sana Ali", "role": "Employee", "department": "Security"},
    {"id": "E-2004", "name": "Aditya Verma", "role": "Employee", "department": "Security"},
    {"id": "S-1007", "name": "Nikhil Joshi", "role": "Student", "department": "CSE"},
    {"id": "S-1008", "name": "Priya Kulkarni", "role": "Student", "department": "ECE"},
    {"id": "S-1009", "name": "Arjun Menon", "role": "Student", "department": "CSE"},
    {"id": "S-1010", "name": "Neha Gupta", "role": "Student", "department": "MBA"},
    {"id": "E-2005", "name": "Karan Malhotra", "role": "Employee", "department": "Admin"},
    {"id": "E-2006", "name": "Tanya Sen", "role": "Employee", "department": "Security"},
    {"id": "S-1011", "name": "Siddharth Jain", "role": "Student", "department": "ECE"},
    {"id": "S-1012", "name": "Riya Choudhary", "role": "Student", "department": "CSE"},
    {"id": "E-2007", "name": "Farhan Qureshi", "role": "Employee", "department": "Admin"},
    {"id": "E-2008", "name": "Pooja Bansal", "role": "Employee", "department": "Security"},
]

ALERTS = [
    {"id": "A-1", "title": "Unknown face detected", "location": "Main Gate", "time": "09:12 AM"},
    {"id": "A-2", "title": "Repeated unknown entry attempt", "location": "Lab Block", "time": "10:05 AM"},
    {"id": "A-3", "title": "Low-confidence match", "location": "Exam Hall 2", "time": "11:20 AM"},
    {"id": "A-4", "title": "Camera tamper detected", "location": "CSE Floor", "time": "11:48 AM"},
    {"id": "A-5", "title": "Unknown face detected", "location": "Admin Office", "time": "12:08 PM"},
]


def _lcg(seed: int) -> int:
    return (seed * 1664525 + 1013904223) % 2**32


def make_attendance_history(days: int = 30) -> list[dict[str, Any]]:
    today = date.today()
    out: list[dict[str, Any]] = []
    seed = 42

    for i in range(days):
        d = today - timedelta(days=(days - 1 - i))
        date_str = d.isoformat()
        for u in USERS:
            seed = _lcg(seed)
            r = seed / 2**32
            status = "ABSENT" if r < 0.07 else "LATE" if r < 0.18 else "PRESENT"
            method = "FACE" if r < 0.85 else "QR"
            time_in = None if status == "ABSENT" else "09:18" if r < 0.18 else "09:02"
            time_out = None if status == "ABSENT" else "16:45"
            out.append(
                {
                    "id": f"{date_str}-{u['id']}",
                    "date": date_str,
                    "name": u["name"],
                    "userId": u["id"],
                    "department": u["department"],
                    "status": status,
                    "method": method,
                    "timeIn": time_in,
                    "timeOut": time_out,
                }
            )
    return out


ATTENDANCE = make_attendance_history(30)


def today_snapshot() -> dict[str, Any]:
    ds = date.today().isoformat()
    today = [r for r in ATTENDANCE if r["date"] == ds]
    present = sum(1 for r in today if r["status"] == "PRESENT")
    absent = sum(1 for r in today if r["status"] == "ABSENT")
    late = sum(1 for r in today if r["status"] == "LATE")
    unknown = 2
    total = present + absent + late
    pct = round(((present + late) / total) * 100) if total else 0
    return {"dateStr": ds, "present": present, "absent": absent, "late": late, "unknown": unknown, "pct": pct}


def weekly_bars() -> list[dict[str, Any]]:
    out = []
    base = datetime.now()
    for i in range(7):
        d = base - timedelta(days=(6 - i))
        label = d.strftime("%a")
        pct = min(98, 84 + (i % 3) * 3 + (i * 7) % 9)
        out.append({"label": label, "pct": pct})
    return out


def live_feed(n: int = 10) -> list[dict[str, Any]]:
    now = datetime.now()
    out = []
    for i in range(n):
        u = USERS[(i * 3 + 2) % len(USERS)]
        t = now - timedelta(minutes=i * 6)
        status = "UNKNOWN" if i == 2 else "LATE" if i % 6 == 0 else "PRESENT"
        conf = 0.42 if status == "UNKNOWN" else 0.88 if status == "LATE" else 0.94
        out.append(
            {
                "id": f"F-{i}",
                "name": u["name"],
                "time": t.strftime("%I:%M %p").lstrip("0"),
                "status": status,
                "confidence": conf,
            }
        )
    return out


def access_logs(n: int = 14) -> list[dict[str, Any]]:
    now = datetime.now()
    out = []
    locs = ["Main Gate", "Lab Block", "Admin Wing", "Exam Hall"]
    for i in range(n):
        u = USERS[(i * 5 + 1) % len(USERS)]
        t = now - timedelta(minutes=i * 9)
        access = "DENIED" if i % 7 == 0 else "GRANTED"
        out.append(
            {
                "id": f"X-{i}",
                "name": u["name"],
                "time": t.strftime("%I:%M %p").lstrip("0"),
                "location": locs[i % 4],
                "access": access,
            }
        )
    return out

