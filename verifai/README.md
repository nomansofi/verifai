## VERIFAI

**Smarter Tracking. Stronger Future.**

AI-powered attendance + access control demo with:

- **Frontend**: React + Tailwind + Framer Motion + Recharts + Lucide icons
- **Backend**: FastAPI (mock endpoints matching the UI)

### Project structure

```
verifai/
  frontend/   # React UI
  backend/    # FastAPI API server (mock data)
```

### Run the backend (FastAPI)

```bash
cd verifai
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
backend/.venv/bin/uvicorn backend.main:app --reload --port 8000
```

Backend will be available at `http://localhost:8000`.

### Run the frontend (React)

```bash
cd verifai/frontend
npm install
npm run dev
```

Frontend will be available at `http://localhost:5173`.

### API base URL (optional)

By default, the frontend calls `http://localhost:8000`. You can override:

```bash
cd verifai/frontend
VITE_API_BASE="http://localhost:8000" npm run dev
```

### Notes

- Face recognition is **stubbed** in `backend/recognition.py` (safe placeholder). Swap in `face_recognition` + OpenCV when you’re ready.
- Database integration is a placeholder (`backend/database.py`). You can wire **Firebase** or **Supabase** there.

