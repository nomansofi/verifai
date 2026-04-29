const { sendWhatsApp } = require('./whatsapp')
const { logMessage } = require('./logger')
const { v4: uuidv4 } = require('uuid')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function applyTemplate(str, vars) {
  let out = String(str || '')
  for (const [k, v] of Object.entries(vars || {})) {
    out = out.split(`{${k}}`).join(String(v ?? ''))
  }
  return out
}

function computePercent(attendanceRecords) {
  const recs = Array.isArray(attendanceRecords) ? attendanceRecords : []
  const present = recs.filter((r) => String(r.status).toLowerCase() === 'present').length
  return recs.length ? Math.round((present / recs.length) * 100) : 100
}

function isPresentToday(student, todayKey) {
  const recs = Array.isArray(student?.attendanceRecords) ? student.attendanceRecords : []
  return recs.some((r) => r?.date === todayKey && String(r.status).toLowerCase() === 'present')
}

/**
 * sendDailyBroadcast
 * - Fetch students (provided by caller) and determine today's present/absent.
 * - Uses templates (provided by caller; saved in Settings on frontend).
 * - Sends with 500ms pacing to avoid Twilio rate flags.
 */
async function sendDailyBroadcast({ students, todayKey, subject, templates, dateLabel, timeLabel, paceMs = 500 } = {}) {
  const list = Array.isArray(students) ? students : []
  const results = []

  for (const s of list) {
    if (!s?.phone) {
      results.push({ studentId: s?.id || null, studentName: s?.name, skipped: true, reason: 'missing_phone' })
      continue
    }
    if (s?.optedOut) {
      results.push({ studentId: s?.id || null, studentName: s?.name, skipped: true, reason: 'opted_out' })
      continue
    }

    const status = isPresentToday(s, todayKey) ? 'present' : 'absent'
    const percent = computePercent(s.attendanceRecords)
    const warning =
      percent < 75
        ? '🚨 *Warning:* Your attendance is below 75%. Please improve regularity to avoid being barred from exams.\n\n'
        : ''

    const vars = {
      name: s.name,
      subject: subject || 'General',
      date: dateLabel || todayKey,
      time: timeLabel || new Date().toLocaleTimeString('en-IN'),
      percent,
      warning,
    }

    const msg =
      status === 'present'
        ? applyTemplate(templates?.presentStudent, vars)
        : applyTemplate(templates?.absentStudent, vars)

    try {
      const resp = await sendWhatsApp(s.phone, msg)
      logMessage({
        id: uuidv4(),
        recipient: 'student',
        name: s.name,
        phone: s.phone,
        subject: vars.subject,
        status,
        messageSid: resp.sid,
        deliveryStatus: 'sent',
        messagePreview: String(msg).slice(0, 220),
        fullMessage: String(msg),
        payload: { studentId: s.id, todayKey, status, attendancePercent: percent, subject: vars.subject },
        timestamp: new Date().toISOString(),
        broadcast: true,
      })
      results.push({ studentId: s.id, studentName: s.name, success: true, sid: resp.sid, status })
    } catch (err) {
      logMessage({
        id: uuidv4(),
        recipient: 'student',
        name: s.name,
        phone: s.phone,
        subject: vars.subject,
        status,
        deliveryStatus: 'failed',
        error: err.message,
        messagePreview: String(msg).slice(0, 220),
        fullMessage: String(msg),
        payload: { studentId: s.id, todayKey, status, attendancePercent: percent, subject: vars.subject },
        timestamp: new Date().toISOString(),
        broadcast: true,
      })
      results.push({ studentId: s.id, studentName: s.name, success: false, error: err.message, status })
    }

    await sleep(paceMs)
  }

  return results
}

module.exports = { sendDailyBroadcast }

