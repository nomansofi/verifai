import {
  MOCK_ALERTS,
  MOCK_ATTENDANCE,
  MOCK_USERS,
  getTodaySnapshot,
  makeAccessLogs,
  makeLiveFeed,
  makeWeeklyBars,
} from '../data/mock.js'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

async function safeFetch(path, init) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch {
    return null
  }
}

export async function apiGetUsers() {
  const data = await safeFetch('/api/users')
  return data?.users ?? MOCK_USERS.map((u) => ({ ...u, photoUrl: null }))
}

export async function apiGetAlerts() {
  const data = await safeFetch('/api/alerts')
  return data?.alerts ?? MOCK_ALERTS
}

export async function apiGetAttendance(params = {}) {
  const qs = new URLSearchParams(params).toString()
  const data = await safeFetch(`/api/attendance${qs ? `?${qs}` : ''}`)
  return data?.records ?? MOCK_ATTENDANCE
}

export async function apiGetAnalytics() {
  const data = await safeFetch('/api/analytics')
  if (data) return data
  const snap = getTodaySnapshot()
  return {
    snapshot: snap,
    weekly: makeWeeklyBars(),
    liveFeed: makeLiveFeed(10),
    departments: [
      { name: 'CSE', rate: 92 },
      { name: 'ECE', rate: 88 },
      { name: 'MBA', rate: 85 },
      { name: 'Admin', rate: 90 },
      { name: 'Security', rate: 86 },
    ],
  }
}

export async function apiRecognize(imageBase64, mode = 'Student') {
  const data = await safeFetch('/api/recognize', {
    method: 'POST',
    body: JSON.stringify({ image: imageBase64, mode }),
  })
  if (data) return data
  const feed = makeLiveFeed(1)[0]
  return { name: feed.name, confidence: feed.confidence, status: feed.status }
}

export async function apiEnroll({ name, userId, role, department, imageBase64 }) {
  const data = await safeFetch('/api/enroll', {
    method: 'POST',
    body: JSON.stringify({ name, user_id: userId, role, department, image: imageBase64 }),
  })
  return data ?? { ok: true }
}

export async function apiQrCheckin(code) {
  const data = await safeFetch('/api/qr-checkin', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
  return data ?? { ok: true, status: 'PRESENT' }
}

export async function apiGetAccessLogs() {
  const data = await safeFetch('/api/access-logs')
  return data?.logs ?? makeAccessLogs(14)
}

