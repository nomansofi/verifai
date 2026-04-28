from __future__ import annotations


class Database:
    """
    Minimal placeholder to swap in Firebase or Supabase.

    For Supabase you would typically:
    - pip install supabase
    - create client with SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
    - implement CRUD methods used by route handlers

    For Firebase you would typically:
    - pip install firebase-admin
    - initialize credentials and use Firestore / Realtime DB
    """

    def __init__(self) -> None:
        self._ready = False

    def is_ready(self) -> bool:
        return self._ready


db = Database()

