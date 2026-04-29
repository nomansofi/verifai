import { appendNotificationLog } from './verifaiDb.js'

const CALLMEBOT_URL_KEY = 'verifai_callmebot_url'
const DEFAULT_CALLMEBOT_URL =
  'https://api.callmebot.com/text.php?user=nomansofi&text=This%20is%20a%20test%20from%20Callmebot'

let lastLoc = null
let lastLocAt = 0

export function getCallMeBotUrl() {
  const v = localStorage.getItem(CALLMEBOT_URL_KEY)
  return v || DEFAULT_CALLMEBOT_URL
}

export function setCallMeBotUrl(url) {
  localStorage.setItem(CALLMEBOT_URL_KEY, String(url || '').trim())
}

function buildUrlWithText(baseUrl, text) {
  const u = new URL(baseUrl)
  const pairs = []
  for (const [k, v] of u.searchParams.entries()) {
    if (k !== 'text') pairs.push([k, v])
  }
  pairs.push(['text', text])
  const qs = pairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
  return `${u.origin}${u.pathname}?${qs}`
}

function backendCandidates() {
  const envBase = String(import.meta.env?.VITE_NOTIFY_BASE || '').trim()
  const host = typeof window !== 'undefined' ? window.location.hostname : ''
  const list = []
  if (envBase) list.push(envBase)
  if (host && host !== 'localhost' && host !== '127.0.0.1') list.push(`http://${host}:3001`)
  list.push('http://localhost:3001')
  list.push('http://127.0.0.1:3001')
  return [...new Set(list)]
}

async function tryBackendRelay(payload) {
  const tried = []
  for (const base of backendCandidates()) {
    tried.push(base)
    try {
      const res = await fetch(`${base}/api/notify/telegram-callmebot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => null)
      if (data?.success) return { ok: true, data, via: base, tried }
    } catch {
      // try next base
    }
  }
  return { ok: false, data: null, via: null, tried }
}

function fireDirectCallmebot(endpoint) {
  try {
    const img = new Image()
    img.referrerPolicy = 'no-referrer'
    img.src = endpoint
  } catch {
    // ignore
  }
}

async function getCurrentLocationLine() {
  const now = Date.now()
  if (lastLoc && now - lastLocAt < 2 * 60 * 1000) return lastLoc
  if (!navigator?.geolocation) return 'Location unavailable'
  const pos = await new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 3500, maximumAge: 60_000 },
    )
  })
  if (!pos?.coords) return 'Location unavailable'
  const line = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`
  lastLoc = line
  lastLocAt = now
  return line
}

export async function sendAttendanceTelegram({
  student,
  record,
}) {
  try {
    if (!student || !record) return { ok: false, reason: 'missing' }
    const method = String(record.method || '').toUpperCase()
    const status = String(record.status || '').toLowerCase()
    if (status !== 'present' || (method !== 'FACE' && method !== 'QR')) return { ok: false, reason: 'not-attendance-checkin' }

    const location = await getCurrentLocationLine()
    const callmebotUrl = getCallMeBotUrl()
    const sanityEndpoint = buildUrlWithText(callmebotUrl, 'VerifAi+ping')

    const payload = {
      callmebotUrl,
      studentName: student.name || student.username || 'Student',
      studentId: student.username || student.id || '-',
      department: student.department || '-',
      subject: record.subject || 'General',
      status: String(record.status || '').toUpperCase(),
      method,
      date: record.date || '',
      time: record.timeIn || '',
      confidence: typeof record.confidence === 'number' ? record.confidence : null,
      location,
    }

    const relay = await tryBackendRelay(payload)
    const fallbackEndpoint = buildUrlWithText(
      callmebotUrl,
      `VerifAI Attendance | Name: ${payload.studentName} | ID: ${payload.studentId} | Dept: ${payload.department} | Status: ${payload.status} | Method: ${payload.method} | Sub: ${payload.subject} | Time: ${`${payload.date} ${payload.time}`.trim()} | Loc: Captured on device | Conf: ${typeof payload.confidence === 'number' ? `${payload.confidence}%` : '-'}`,
    )

    const ok = relay.ok
    const raw = relay.data?.response || relay.data?.error || (ok ? 'sent' : 'backend relay unavailable')
    if (!ok) fireDirectCallmebot(fallbackEndpoint)

    appendNotificationLog({
      channel: 'telegram-callmebot',
      status: ok ? 'sent' : 'failed',
      studentName: student.name || student.username,
      method,
      record,
      location,
      response: raw.slice(0, 300),
      debug: ok
        ? `sent via backend relay (${relay.via})`
        : `backend relay failed (${relay.tried.join(', ')}). direct CallMeBot fallback fired. validate authorization + host ${new URL(sanityEndpoint).host}`,
      ts: new Date().toISOString(),
    })

    return { ok, response: raw }
  } catch (error) {
    appendNotificationLog({
      channel: 'telegram-callmebot',
      status: 'error',
      error: String(error?.message || error || 'unknown'),
      ts: new Date().toISOString(),
    })
    return { ok: false, error: String(error?.message || error || 'unknown') }
  }
}

