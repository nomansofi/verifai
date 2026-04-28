from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from ..mock_data import USERS

router = APIRouter(prefix="/api", tags=["users"])


class UserCreate(BaseModel):
    id: str
    name: str
    role: str = "Student"
    department: str = "CSE"


@router.get("/users")
def get_users():
    return {"users": USERS}


@router.post("/users")
def add_user(payload: UserCreate):
    USERS.insert(
        0,
        {"id": payload.id, "name": payload.name, "role": payload.role, "department": payload.department},
    )
    return {"ok": True, "user": payload.model_dump()}


@router.delete("/users/{user_id}")
def delete_user(user_id: str):
    before = len(USERS)
    USERS[:] = [u for u in USERS if u["id"] != user_id]
    return {"ok": True, "removed": before - len(USERS)}

