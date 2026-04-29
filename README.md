# VerifAi

AI-powered attendance and proctoring demo platform with face scan, QR check-in, appeals, events/exams modules, notifications, and an admin AI chatbot.

## Monorepo layout

```txt
VerifAi/
├─ backend/                 # Node.js notification backend (Twilio + CallMeBot relay)
├─ verifai/
│  ├─ backend/              # FastAPI backend (mock/service endpoints)
│  └─ frontend/             # React + Vite frontend app
└─ README.md
```

## Tech stack

- Frontend: React, Vite, Tailwind CSS, Framer Motion, Recharts
- Face/QR: `@vladmandic/face-api`, `html5-qrcode`, `react-qr-code`
- Exports: `jsPDF`
- AI chatbot: Groq SDK (`llama-3.3-70b-versatile`)
- Notifications: Node.js + Express + Twilio + CallMeBot
- Secondary API: FastAPI (Python)
- Storage: browser `localStorage` (project data), `sessionStorage` (chat history)

## Prerequisites

- Node.js 18+ (recommended)
- npm 9+
- Python 3.11+ (for FastAPI backend)

## 1) Run frontend

```bash
cd verifai/frontend
npm install
npm run dev
```

Frontend default URL: `http://localhost:5173`

## 2) Run notification backend (Node)

```bash
cd backend
npm install
# create backend/.env from backend/.env.example
npm run dev
```

Node backend URL: `http://localhost:3001`

Used for:
- WhatsApp test/send
- CallMeBot Telegram relay

## 3) Run FastAPI backend (optional for mock endpoints)

```bash
cd verifai
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
backend/.venv/bin/uvicorn backend.main:app --reload --port 8000
```

FastAPI URL: `http://localhost:8000`

## Environment variables

### Frontend (`verifai/frontend/.env`)

```env
VITE_GROQ_API_KEY=your_groq_key_here
```

### Node backend (`backend/.env`)

```env
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=
PORT=3001
```

## Core features

- Face scan attendance with anti-proxy checks
  - motion + dynamics + blink verification
- QR session attendance (teacher generates, student scans)
- Attendance records, analytics, and exports
- Attendance appeals (student submit, teacher review)
- Events and exams modules
- Telegram text notifications via CallMeBot
- Admin AI chatbot (Groq-powered, attendance/system scoped)

## Troubleshooting

- **Chatbot says API key error**
  - Make sure `VITE_GROQ_API_KEY` is set in `verifai/frontend/.env`
  - Restart Vite after env changes

- **Telegram/CallMeBot not sending**
  - Ensure Node backend is running on `:3001`
  - Confirm your CallMeBot user has been authorized with `@CallMeBot_txtbot`

- **Push blocked by GitHub Push Protection**
  - Remove secrets from tracked files/history (e.g. `.env`, logs with keys)
  - Keep `.env` and credential files ignored in git

## Security notes

- Do **not** commit API keys, SID/token values, or `.env` files.
- Rotate credentials immediately if exposed.

