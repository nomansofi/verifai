const express = require('express')
const cors = require('cors')
const cron = require('node-cron')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

const { sendWhatsApp } = require('./whatsapp')
const { logMessage, getLogs, updateLogBySid } = require('./logger')
const { v4: uuidv4 } = require('uuid')
const { sendDailyBroadcast } = require('./broadcast')

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

const OPT_OUT_FILE = path.join(__dirname, 'optedout.json')

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2))
}

function isOptedOut(studentId) {
  if (!studentId) return false
  const arr = readJson(OPT_OUT_FILE, [])
  return Array.isArray(arr) && arr.includes(studentId)
}

// ─── SEND ATTENDANCE NOTIFICATION ───────────────────
app.post('/api/notify/attendance', async (req, res) => {
  const {
    studentId,
    studentName,
    studentPhone,
    parentPhone,
    subject,
    date,
    time,
    status, // 'present' or 'absent'
    attendancePercent,
    notifyParent,
    optedOut,
    customStudentMessage,
    customParentMessage,
  } = req.body || {}

  // Check opt-out
  const optedOutEffective = Boolean(optedOut) || isOptedOut(studentId)
  if (optedOutEffective) {
    return res.json({ success: false, reason: 'Student has opted out of notifications' })
  }

  const pct = Number(attendancePercent ?? 100)
  const st = String(status || '').toLowerCase() === 'absent' ? 'absent' : 'present'
  const subj = subject || 'General'

  // Build message based on status
  const studentMessage =
    customStudentMessage ||
    (st === 'present'
      ? `Hello ${studentName}! ✅\n\nYour attendance has been successfully marked as *Present* for *${subj}* on ${date} at ${time}.\n\n📊 Current Attendance: ${pct}%\n\nKeep it up! Great work. 🎓\n\n— VERIFAI Attendance System`
      : `Hello ${studentName}! ⚠️\n\nYou were marked *Absent* for *${subj}* on ${date}.\n\n📊 Current Attendance: ${pct}%\n\n${
          pct < 75
            ? '🚨 *Warning:* Your attendance is below 75%. Please improve regularity to avoid being barred from exams.\n\n'
            : ''
        }Please ensure regular attendance. If this is an error, contact your teacher.\n\n— VERIFAI Attendance System`)

  const parentMessage =
    customParentMessage ||
    (st === 'present'
      ? `Dear Parent/Guardian,\n\nYour ward *${studentName}* has been marked *Present* ✅ for *${subj}* on ${date} at ${time}.\n\n📊 Attendance: ${pct}%\n\n— VERIFAI Attendance System`
      : `Dear Parent/Guardian,\n\n⚠️ Your ward *${studentName}* was marked *Absent* for *${subj}* on ${date}.\n\n📊 Attendance: ${pct}%\n\n${
          pct < 75 ? '🚨 Attendance is below 75%. Immediate attention required.\n\n' : ''
        }Please ensure regular attendance.\n\n— VERIFAI Attendance System`)

  const results = []
  const payload = {
    studentId: studentId ?? null,
    studentName,
    studentPhone,
    parentPhone: parentPhone || null,
    subject: subj,
    date,
    time,
    status: st,
    attendancePercent: pct,
    notifyParent: Boolean(notifyParent),
  }

  // Send to student
  try {
    const studentResult = await sendWhatsApp(studentPhone, studentMessage)
    const log = {
      id: uuidv4(),
      recipient: 'student',
      name: studentName,
      phone: studentPhone,
      subject: subj,
      status: st,
      messageSid: studentResult.sid,
      deliveryStatus: 'sent',
      messagePreview: String(studentMessage).slice(0, 220),
      fullMessage: String(studentMessage),
      payload,
      timestamp: new Date().toISOString(),
    }
    logMessage(log)
    results.push({ recipient: 'student', success: true, sid: studentResult.sid })
  } catch (err) {
    // Retry once after 2 seconds
    try {
      await new Promise((r) => setTimeout(r, 2000))
      const retry = await sendWhatsApp(studentPhone, studentMessage)
      const log = {
        id: uuidv4(),
        recipient: 'student',
        name: studentName,
        phone: studentPhone,
        subject: subj,
        status: st,
        messageSid: retry.sid,
        deliveryStatus: 'sent',
        messagePreview: String(studentMessage).slice(0, 220),
        fullMessage: String(studentMessage),
        payload,
        retried: true,
        timestamp: new Date().toISOString(),
      }
      logMessage(log)
      results.push({ recipient: 'student', success: true, sid: retry.sid, retried: true })
    } catch (retryErr) {
      const log = {
        id: uuidv4(),
        recipient: 'student',
        name: studentName,
        phone: studentPhone,
        subject: subj,
        status: st,
        deliveryStatus: 'failed',
        error: retryErr.message,
        messagePreview: String(studentMessage).slice(0, 220),
        fullMessage: String(studentMessage),
        payload,
        timestamp: new Date().toISOString(),
      }
      logMessage(log)
      results.push({ recipient: 'student', success: false, error: retryErr.message })
    }
  }

  // Send to parent if requested
  if (notifyParent && parentPhone) {
    try {
      const parentResult = await sendWhatsApp(parentPhone, parentMessage)
      const log = {
        id: uuidv4(),
        recipient: 'parent',
        name: `Parent of ${studentName}`,
        phone: parentPhone,
        subject: subj,
        status: st,
        messageSid: parentResult.sid,
        deliveryStatus: 'sent',
        messagePreview: String(parentMessage).slice(0, 220),
        fullMessage: String(parentMessage),
        payload,
        timestamp: new Date().toISOString(),
      }
      logMessage(log)
      results.push({ recipient: 'parent', success: true, sid: parentResult.sid })
    } catch (err) {
      const log = {
        id: uuidv4(),
        recipient: 'parent',
        name: `Parent of ${studentName}`,
        phone: parentPhone,
        subject: subj,
        status: st,
        deliveryStatus: 'failed',
        error: err.message,
        messagePreview: String(parentMessage).slice(0, 220),
        fullMessage: String(parentMessage),
        payload,
        timestamp: new Date().toISOString(),
      }
      logMessage(log)
      results.push({ recipient: 'parent', success: false, error: err.message })
    }
  }

  res.json({ success: true, results })
})

// ─── SEND BULK NOTIFICATIONS ────────────────────────
app.post('/api/notify/bulk', async (req, res) => {
  const { students } = req.body || {}
  const list = Array.isArray(students) ? students : []

  const results = []

  // Send all simultaneously using Promise.allSettled
  const promises = list.map((student) =>
    sendWhatsApp(
      student.studentPhone,
      student.status === 'present'
        ? `Hello ${student.studentName}! ✅ Marked Present for ${student.subject} on ${student.date}. Attendance: ${student.attendancePercent}% 📊 — VERIFAI`
        : `Hello ${student.studentName}! ⚠️ Marked Absent for ${student.subject} on ${student.date}. Attendance: ${student.attendancePercent}% 📊 — VERIFAI`,
    )
      .then((result) => ({
        studentName: student.studentName,
        success: true,
        sid: result.sid,
      }))
      .catch((err) => ({
        studentName: student.studentName,
        success: false,
        error: err.message,
      })),
  )

  const settled = await Promise.allSettled(promises)
  settled.forEach((r) => results.push(r.value || r.reason))

  res.json({ success: true, total: list.length, results })
})

// ─── DAILY BROADCAST (bulk present/absent) ───────────
app.post('/api/notify/broadcast/daily', async (req, res) => {
  const { students, todayKey, subject, templates, paceMs } = req.body || {}
  const list = Array.isArray(students) ? students : []
  if (!list.length) return res.json({ success: false, error: 'No students provided' })

  const now = new Date()
  const dateLabel = now.toLocaleDateString('en-IN')
  const timeLabel = now.toLocaleTimeString('en-IN')

  try {
    const results = await sendDailyBroadcast({
      students: list,
      todayKey: todayKey || new Date().toDateString(),
      subject: subject || 'General',
      templates,
      dateLabel,
      timeLabel,
      paceMs: Number(paceMs || 500),
    })
    const sent = results.filter((r) => r.success).length
    const failed = results.filter((r) => r.success === false).length
    const skipped = results.filter((r) => r.skipped).length
    res.json({ success: true, total: list.length, sent, failed, skipped, results })
  } catch (err) {
    res.json({ success: false, error: err.message })
  }
})

// ─── DAILY SUMMARY (scheduled 6 PM every day) ───────
cron.schedule('0 18 * * *', async () => {
  // For demo: just log it
  // eslint-disable-next-line no-console
  console.log('Daily summary sent at', new Date().toISOString())
})

// ─── SEND DAILY SUMMARY MANUALLY ────────────────────
app.post('/api/notify/daily-summary', async (req, res) => {
  const { teacherPhone, teacherName, department, presentCount, absentCount, totalCount, date } = req.body || {}

  const percent = Math.round((Number(presentCount || 0) / Math.max(Number(totalCount || 0), 1)) * 100)
  const message = `📊 *Daily Attendance Summary*\n\nHello ${teacherName},\n\nHere is your attendance summary for *${department}* on ${date}:\n\n✅ Present: ${presentCount}/${totalCount}\n❌ Absent: ${absentCount}/${totalCount}\n📈 Rate: ${percent}%\n\n${
    percent < 75 ? '⚠️ Low attendance today. Please follow up with absent students.' : '🎉 Good attendance today!'
  }\n\n— VERIFAI Attendance System`

  try {
    const result = await sendWhatsApp(teacherPhone, message)
    res.json({ success: true, sid: result.sid })
  } catch (err) {
    res.json({ success: false, error: err.message })
  }
})

// ─── SEND TEST MESSAGE ──────────────────────────────
app.post('/api/notify/test', async (req, res) => {
  const { toPhone, message } = req.body || {}
  try {
    const result = await sendWhatsApp(toPhone, message || '✅ VERIFAI test message — WhatsApp is connected.')
    res.json({ success: true, sid: result.sid })
  } catch (err) {
    res.json({ success: false, error: err.message })
  }
})

// ─── OPT OUT ────────────────────────────────────────
app.post('/api/notify/optout', (req, res) => {
  const { studentId } = req.body || {}
  let optedOut = readJson(OPT_OUT_FILE, [])
  if (!Array.isArray(optedOut)) optedOut = []
  if (studentId && !optedOut.includes(studentId)) optedOut.push(studentId)
  writeJson(OPT_OUT_FILE, optedOut)
  res.json({ success: true, message: 'Student opted out of notifications' })
})

app.post('/api/notify/optin', (req, res) => {
  const { studentId } = req.body || {}
  let optedOut = readJson(OPT_OUT_FILE, [])
  if (!Array.isArray(optedOut)) optedOut = []
  optedOut = optedOut.filter((id) => id !== studentId)
  writeJson(OPT_OUT_FILE, optedOut)
  res.json({ success: true, message: 'Student opted back in to notifications' })
})

// ─── GET MESSAGE LOGS ────────────────────────────────
app.get('/api/notify/logs', (req, res) => {
  const logs = getLogs()
  res.json({ success: true, logs })
})

// ─── WEBHOOK for Twilio delivery status ─────────────
app.post('/api/notify/webhook', (req, res) => {
  const { MessageSid, MessageStatus, To } = req.body || {}
  // eslint-disable-next-line no-console
  console.log(`Delivery update: ${MessageSid} → ${MessageStatus} → ${To}`)
  if (MessageSid && MessageStatus) {
    updateLogBySid(MessageSid, { deliveryStatus: MessageStatus, deliveredTo: To || null, deliveryUpdatedAt: new Date().toISOString() })
  }
  res.sendStatus(200)
})

app.listen(process.env.PORT || 3001, () => {
  // eslint-disable-next-line no-console
  console.log('VERIFAI WhatsApp backend running on port', process.env.PORT || 3001)
})

