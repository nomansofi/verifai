import { loadUsersDb, saveUsersDb } from './usersDb.js'

const KEYS = {
  sessions: 'verifai_sessions', // QR attendance sessions
  appeals: 'verifai_appeals',
  notificationsLog: 'verifai_notifications_log',
  timetable: 'verifai_timetable',
  proctorState: 'verifai_proctor_state',
  uiPrefs: 'verifai_ui_prefs',
  events: 'verifai_events',
  exams: 'verifai_exams',
}

function safeJsonParse(raw, fallback) {
  try {
    const v = raw ? JSON.parse(raw) : fallback
    return v ?? fallback
  } catch {
    return fallback
  }
}

function loadKey(key, fallback) {
  return safeJsonParse(localStorage.getItem(key), fallback)
}

function saveKey(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function getUiPrefs() {
  return loadKey(KEYS.uiPrefs, {})
}

export function setUiPrefs(patch) {
  const prev = getUiPrefs()
  const next = { ...prev, ...patch }
  saveKey(KEYS.uiPrefs, next)
  return next
}

export function listAllStudents() {
  return loadUsersDb().filter((u) => u.role === 'student')
}

export function listAllTeachers() {
  return loadUsersDb().filter((u) => u.role === 'teacher')
}

export function listAllAttendanceFlat() {
  const db = loadUsersDb()
  const rows = []
  for (const u of db) {
    if (u.role !== 'student') continue
    const recs = Array.isArray(u.attendanceRecords) ? u.attendanceRecords : []
    for (const r of recs) {
      rows.push({
        id: r.id ?? `${u.id}-${r.date}-${r.timeIn || ''}-${r.method || ''}`,
        studentId: u.id,
        name: u.name,
        userId: u.username,
        department: u.department,
        section: u.section,
        ...r,
        status: String(r.status || '').toUpperCase(),
        method: String(r.method || '').toUpperCase(),
      })
    }
  }
  return rows
}

export function todayKey() {
  return new Date().toDateString()
}

export function isSameDayRecord(r, key = todayKey()) {
  return r?.date === key
}

export function computeAttendancePct(records) {
  const arr = Array.isArray(records) ? records : []
  const present = arr.filter((r) => String(r.status).toLowerCase() === 'present').length
  return Math.round((present / Math.max(arr.length, 1)) * 100)
}

export function computeStreak(records) {
  const arr = Array.isArray(records) ? records : []
  if (arr.length === 0) return 0
  const byDay = new Map()
  for (const r of arr) byDay.set(r.date, String(r.status || '').toLowerCase())
  let streak = 0
  for (let i = 0; i < 365; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toDateString()
    const st = byDay.get(key)
    if (st === 'present') streak += 1
    else break
  }
  return streak
}

export function upsertStudentParentContact(studentId, patch) {
  const db = loadUsersDb()
  const idx = db.findIndex((u) => u.id === studentId && u.role === 'student')
  if (idx === -1) return { ok: false }
  db[idx] = {
    ...db[idx],
    parentName: patch.parentName ?? db[idx].parentName ?? '',
    parentPhone: patch.parentPhone ?? db[idx].parentPhone ?? '',
    parentEmail: patch.parentEmail ?? db[idx].parentEmail ?? '',
    parentNotifyPref: patch.parentNotifyPref ?? db[idx].parentNotifyPref ?? 'Email',
  }
  saveUsersDb(db)
  return { ok: true, student: db[idx] }
}

// ---------------------------
// QR Sessions
// ---------------------------
export function listSessions() {
  const arr = loadKey(KEYS.sessions, [])
  return Array.isArray(arr) ? arr : []
}

export function createSession({ teacherId, subject, department = null, ttlMs = 60 * 1000 } = {}) {
  const now = Date.now()
  const session = {
    sessionId: crypto.randomUUID(),
    teacherId: teacherId ?? 'T-1001',
    subject: subject ?? 'Data Structures',
    department,
    date: new Date().toISOString().slice(0, 10),
    createdAt: now,
    expiresAt: now + ttlMs,
  }
  const list = listSessions()
  const next = [session, ...list].slice(0, 60)
  saveKey(KEYS.sessions, next)
  return session
}

export function findValidSession(sessionId) {
  const s = listSessions().find((x) => x.sessionId === sessionId) ?? null
  if (!s) return { ok: false, reason: 'invalid' }
  if (Date.now() > s.expiresAt) return { ok: false, reason: 'expired', session: s }
  return { ok: true, session: s }
}

// ---------------------------
// Appeals
// ---------------------------
export function listAppeals() {
  const arr = loadKey(KEYS.appeals, [])
  return Array.isArray(arr) ? arr : []
}

export function saveAppeals(arr) {
  saveKey(KEYS.appeals, Array.isArray(arr) ? arr : [])
}

export function addAppeal(appeal) {
  const list = listAppeals()
  const next = [{ ...appeal }, ...list].slice(0, 500)
  saveAppeals(next)
  return next
}

export function updateAppeal(id, patch) {
  const list = listAppeals()
  const idx = list.findIndex((a) => a.id === id)
  if (idx === -1) return { ok: false, appeals: list }
  list[idx] = { ...list[idx], ...patch }
  saveAppeals(list)
  return { ok: true, appeal: list[idx], appeals: list }
}

// ---------------------------
// Notifications log
// ---------------------------
export function listNotificationLogs() {
  const arr = loadKey(KEYS.notificationsLog, [])
  return Array.isArray(arr) ? arr : []
}

export function appendNotificationLog(entry) {
  const list = listNotificationLogs()
  const next = [{ id: crypto.randomUUID(), ...entry }, ...list].slice(0, 800)
  saveKey(KEYS.notificationsLog, next)
  return next
}

// ---------------------------
// Timetable
// ---------------------------
export function listTimetable() {
  const arr = loadKey(KEYS.timetable, [])
  return Array.isArray(arr) ? arr : []
}

export function saveTimetable(rows) {
  saveKey(KEYS.timetable, Array.isArray(rows) ? rows : [])
  return rows
}

export function upsertTimetableRow(row) {
  const list = listTimetable()
  const r = { ...row, id: row.id ?? crypto.randomUUID() }
  const idx = list.findIndex((x) => x.id === r.id)
  const next = idx === -1 ? [r, ...list] : list.map((x) => (x.id === r.id ? r : x))
  saveTimetable(next.slice(0, 500))
  return r
}

export function deleteTimetableRow(id) {
  const next = listTimetable().filter((x) => x.id !== id)
  saveTimetable(next)
  return next
}

export function findCurrentClass({ department, now = new Date() } = {}) {
  if (!department) return null
  const day = now.toLocaleDateString(undefined, { weekday: 'short' }) // e.g. "Tue"
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const cur = `${hh}:${mm}`
  const rows = listTimetable().filter((r) => r.department === department && String(r.day).toLowerCase() === String(day).toLowerCase())
  // naive lexical compare works for HH:mm
  const hit = rows.find((r) => cur >= r.startTime && cur <= r.endTime) ?? null
  return hit
}

// ---------------------------
// Proctor state (alerts + verified snapshots)
// ---------------------------
export function loadProctorState() {
  const v = loadKey(KEYS.proctorState, null)
  return v && typeof v === 'object' ? v : { alerts: [], students: [], examName: 'Midterm Exam', startedAt: null, soundOn: true }
}

export function saveProctorState(next) {
  saveKey(KEYS.proctorState, next)
  return next
}

export function appendProctorAlert(alert) {
  const st = loadProctorState()
  const next = {
    ...st,
    alerts: [{ id: crypto.randomUUID(), ...alert }, ...(Array.isArray(st.alerts) ? st.alerts : [])].slice(0, 300),
  }
  saveProctorState(next)
  return next
}

// ---------------------------
// Events & Conferences
// ---------------------------
export function listEvents() {
  const arr = loadKey(KEYS.events, [])
  return Array.isArray(arr) ? arr : []
}

export function saveEvents(events) {
  saveKey(KEYS.events, Array.isArray(events) ? events : [])
  return events
}

export function addEvent(event) {
  const list = listEvents()
  const next = [{ ...event }, ...list].slice(0, 300)
  saveEvents(next)
  return next
}

export function updateEvent(eventId, patch) {
  const list = listEvents()
  const idx = list.findIndex((e) => e.id === eventId)
  if (idx === -1) return { ok: false, events: list }
  list[idx] = { ...list[idx], ...patch }
  saveEvents(list)
  return { ok: true, event: list[idx], events: list }
}

export function removeEvent(eventId) {
  const next = listEvents().filter((e) => e.id !== eventId)
  saveEvents(next)
  return next
}

export function getEventById(eventId) {
  return listEvents().find((e) => e.id === eventId) ?? null
}

// ---------------------------
// Exams & Assessments
// ---------------------------
export function listExams() {
  const arr = loadKey(KEYS.exams, [])
  return Array.isArray(arr) ? arr : []
}

export function saveExams(exams) {
  saveKey(KEYS.exams, Array.isArray(exams) ? exams : [])
  return exams
}

export function addExam(exam) {
  const list = listExams()
  const next = [{ ...exam }, ...list].slice(0, 300)
  saveExams(next)
  return next
}

export function updateExam(examId, patch) {
  const list = listExams()
  const idx = list.findIndex((e) => e.id === examId)
  if (idx === -1) return { ok: false, exams: list }
  list[idx] = { ...list[idx], ...patch }
  saveExams(list)
  return { ok: true, exam: list[idx], exams: list }
}

export function removeExam(examId) {
  const next = listExams().filter((e) => e.id !== examId)
  saveExams(next)
  return next
}

export function getExamById(examId) {
  return listExams().find((e) => e.id === examId) ?? null
}

