import { applyTemplate, loadWhatsAppTemplates } from './whatsappTemplates.js'
import { loadUsersDb } from './usersDb.js'

const BASE = 'http://localhost:3001'

export async function apiSendTestWhatsApp({ toPhone, message }) {
  const res = await fetch(`${BASE}/api/notify/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toPhone, message }),
  })
  return await res.json()
}

export async function apiGetWhatsAppLogs() {
  const res = await fetch(`${BASE}/api/notify/logs`)
  return await res.json()
}

export async function apiOptOutStudent(studentId) {
  const res = await fetch(`${BASE}/api/notify/optout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId }),
  })
  return await res.json()
}

export async function apiOptInStudent(studentId) {
  const res = await fetch(`${BASE}/api/notify/optin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId }),
  })
  return await res.json()
}

export async function triggerWhatsAppAttendanceNotification({ matchedStudentName, subject, status }) {
  const db = loadUsersDb()
  const student = db.find((u) => u.role === 'student' && u.name === matchedStudentName) ?? null
  if (!student || !student.phone) return { ok: false, reason: 'missing_phone' }

  const records = Array.isArray(student.attendanceRecords) ? student.attendanceRecords : []
  const presentCount = records.filter((r) => String(r.status).toLowerCase() === 'present').length
  const attendancePercent = records.length > 0 ? Math.round((presentCount / records.length) * 100) : 100

  const now = new Date()
  const date = now.toLocaleDateString('en-IN')
  const time = now.toLocaleTimeString('en-IN')
  const subj = subject || 'General'
  const st = String(status || '').toLowerCase() === 'absent' ? 'absent' : 'present'

  const warning =
    attendancePercent < 75
      ? '🚨 *Warning:* Your attendance is below 75%. Please improve regularity to avoid being barred from exams.\n\n'
      : ''

  const t = loadWhatsAppTemplates()
  const vars = { name: student.name, subject: subj, date, time, percent: attendancePercent, warning }

  const customStudentMessage =
    st === 'present' ? applyTemplate(t.presentStudent, vars) : applyTemplate(t.absentStudent, vars)

  const customParentMessage =
    st === 'present' ? applyTemplate(t.presentParent, vars) : applyTemplate(t.absentParent, vars)

  const notifyParent = Boolean(student.notifyParent)
  const optedOut = Boolean(student.optedOut)

  const resp = await fetch(`${BASE}/api/notify/attendance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studentId: student.id,
      studentName: student.name,
      studentPhone: student.phone,
      parentPhone: student.parentPhone || null,
      subject: subj,
      date,
      time,
      status: st,
      attendancePercent,
      notifyParent,
      optedOut,
      customStudentMessage,
      customParentMessage,
    }),
  })
  const data = await resp.json()
  return { ok: Boolean(data?.success), data }
}

