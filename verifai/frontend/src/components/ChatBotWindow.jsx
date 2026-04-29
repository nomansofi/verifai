import { useEffect, useMemo, useRef, useState } from 'react'
import Groq from 'groq-sdk'

const CHAT_KEY = 'verifai_chat'
const API_KEY_STORAGE = 'verifai_groq_api_key'
const OFF_TOPIC_MSG = 'I can only help with attendance and VerifAI system information. Please ask me about students, attendance records, events, or exams.'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

function loadChatHistory() {
  try {
    const raw = sessionStorage.getItem(CHAT_KEY)
    const arr = raw ? JSON.parse(raw) : []
    if (!Array.isArray(arr)) return []
    return arr.map((m) => ({ ...m, timestamp: m?.timestamp ? new Date(m.timestamp) : new Date() }))
  } catch {
    return []
  }
}

function saveChatHistory(messages) {
  try {
    sessionStorage.setItem(
      CHAT_KEY,
      JSON.stringify(
        messages.map((m) => ({
          ...m,
          timestamp: m?.timestamp ? new Date(m.timestamp).toISOString() : new Date().toISOString(),
        })),
      ),
    )
  } catch {
    // ignore
  }
}

function welcomeMessage() {
  return {
    role: 'assistant',
    content: `👋 Hi! I am VerifAI Assistant powered by Groq AI.

I can help you with:
- 📊 Attendance statistics and reports
- 👥 Student and teacher information
- 🚨 Security alerts and unknown faces
- 📅 Events and exam details
- 📈 Analytics and insights
- ⚠️ At-risk students below 75%

What would you like to know?`,
    timestamp: new Date(),
  }
}

function getFollowUpChips(botResponse) {
  const lower = String(botResponse || '').toLowerCase()
  if (lower.includes('attendance') || lower.includes('present') || lower.includes('absent')) {
    return ['Show at-risk students', "Today's summary", 'Department comparison']
  }
  if (lower.includes('student')) {
    return ['Full attendance record', 'Contact details', 'Submit appeal for them']
  }
  if (lower.includes('event')) {
    return ['Show attendee list', 'Check-in status', 'Create new event']
  }
  if (lower.includes('exam')) {
    return ['Verification status', 'Alerts received', 'Integrity scores']
  }
  return ["Today's attendance", 'At-risk students', 'Recent alerts']
}

function isAttendanceRelated(q) {
  const text = String(q || '').toLowerCase()
  const keys = [
    'attendance',
    'student',
    'teacher',
    'event',
    'exam',
    'appeal',
    'analytics',
    'alert',
    'department',
    'absent',
    'present',
    'risk',
    'verifai',
    'record',
    'report',
    'security',
  ]
  return keys.some((k) => text.includes(k))
}

function parse(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key)
    const val = raw ? JSON.parse(raw) : fallback
    return Array.isArray(val) ? val : fallback
  } catch {
    return fallback
  }
}

function buildSystemDataPrompt() {
  const usersDb = parse('verifai_users_db', [])
  const events = parse('verifai_events', [])
  const exams = parse('verifai_exams', [])
  const appeals = parse('verifai_appeals', [])
  const timetable = parse('verifai_timetable', [])
  const notificationsLog = parse('verifai_notifications_log', [])

  const students = usersDb.filter((u) => u.role === 'student')
  const teachers = usersDb.filter((u) => u.role === 'teacher')
  const today = new Date().toDateString()

  const studentStats = students.map((s) => {
    const records = Array.isArray(s.attendanceRecords) ? s.attendanceRecords : []
    const present = records.filter((r) => String(r.status).toLowerCase() === 'present').length
    const absent = records.filter((r) => String(r.status).toLowerCase() === 'absent').length
    const total = records.length
    const attendancePercent = total > 0 ? Math.round((present / total) * 100) : 0
    const todayRecord = records.find((r) => r.date === today)
    return {
      name: s.name,
      id: s.username,
      department: s.department,
      section: s.section,
      phone: s.phone,
      email: s.email,
      attendancePercent,
      totalClasses: total,
      present,
      absent,
      todayStatus: todayRecord?.status || 'not marked',
      isAtRisk: attendancePercent < 75 && total > 0,
    }
  })

  const atRiskStudents = studentStats.filter((s) => s.isAtRisk)
  const presentToday = studentStats.filter((s) => String(s.todayStatus).toLowerCase() === 'present')
  const absentToday = studentStats.filter((s) => String(s.todayStatus).toLowerCase() === 'absent')
  const notMarkedToday = studentStats.filter((s) => String(s.todayStatus).toLowerCase() === 'not marked')
  const depts = ['CSE', 'ECE', 'MBA', 'Admin', 'Security']
  const deptStats = depts
    .map((d) => {
      const rows = studentStats.filter((s) => s.department === d)
      const avgAttendance = rows.length ? Math.round(rows.reduce((sum, r) => sum + r.attendancePercent, 0) / rows.length) : 0
      return { department: d, studentCount: rows.length, avgAttendance }
    })
    .filter((d) => d.studentCount > 0)
  const topAbsentees = [...studentStats].sort((a, b) => a.attendancePercent - b.attendancePercent).slice(0, 5)
  const topPerformers = [...studentStats].sort((a, b) => b.attendancePercent - a.attendancePercent).slice(0, 5)
  const pendingAppeals = appeals.filter((a) => String(a.status).toLowerCase() === 'pending')
  const activeEvents = events.filter((e) => new Date(e.date || 0) >= new Date())
  const activeExams = exams.filter((e) => ['active', 'upcoming'].includes(String(e.status || '').toLowerCase()))
  const recentAlerts = notificationsLog.slice(0, 10)

  return `You are VerifAI Assistant, an AI chatbot embedded in VerifAI for ADMIN.

STRICT RULES:
- Only answer attendance/system questions (attendance, students, teachers, alerts, events, exams, appeals, analytics).
- If unrelated, answer exactly: "${OFF_TOPIC_MSG}"
- Be concise and professional.
- Use bullet points for data.
- Never invent data.

CURRENT DATE: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

OVERVIEW:
- Total Students: ${students.length}
- Total Teachers: ${teachers.length}
- Total Users: ${usersDb.length}
- Timetable Rows: ${timetable.length}

TODAY ATTENDANCE:
- Present: ${presentToday.length}
- Absent: ${absentToday.length}
- Not Marked: ${notMarkedToday.length}
- Present Names: ${presentToday.map((s) => s.name).join(', ') || 'None'}
- Absent Names: ${absentToday.map((s) => s.name).join(', ') || 'None'}

AT-RISK (<75%):
${atRiskStudents.map((s) => `- ${s.name} (${s.id}): ${s.attendancePercent}%`).join('\n') || 'None'}

ALL STUDENTS:
${studentStats.map((s) => `- ${s.name} (${s.id}) ${s.department}: ${s.attendancePercent}% | today=${s.todayStatus}`).join('\n') || 'No students'}

TOP PERFORMERS:
${topPerformers.map((s, i) => `${i + 1}. ${s.name} ${s.attendancePercent}%`).join('\n') || 'No data'}

TOP ABSENTEES:
${topAbsentees.map((s, i) => `${i + 1}. ${s.name} ${s.attendancePercent}%`).join('\n') || 'No data'}

DEPARTMENT STATS:
${deptStats.map((d) => `- ${d.department}: ${d.studentCount} students, avg ${d.avgAttendance}%`).join('\n') || 'No data'}

TEACHERS:
${teachers.map((t) => `- ${t.name} (${t.username}) ${t.department}`).join('\n') || 'No teachers'}

PENDING APPEALS:
${pendingAppeals.map((a) => `- ${a.studentName}: ${a.reason} on ${a.date}`).join('\n') || 'None'}

UPCOMING EVENTS:
${activeEvents.map((e) => `- ${e.name} on ${e.date}`).join('\n') || 'None'}

UPCOMING EXAMS:
${activeExams.map((e) => `- ${e.name} ${e.subject} on ${e.date}`).join('\n') || 'None'}

RECENT ALERTS:
${recentAlerts.map((a) => `- ${a.channel || 'system'}: ${a.status || '-'} ${a.studentName || ''}`).join('\n') || 'None'}

FEATURES:
1) Face Scan
2) Users
3) Attendance
4) Analytics
5) Events
6) Exams
7) Access Control
8) Reports
9) Telegram notifications
10) Appeals
`
}

export default function ChatBotWindow({ onClose }) {
  const initial = useMemo(() => {
    const existing = loadChatHistory()
    return existing.length ? existing : [welcomeMessage()]
  }, [])
  const [messages, setMessages] = useState(initial)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    saveChatHistory(messages)
  }, [messages])

  const lastAssistant = useMemo(() => [...messages].reverse().find((m) => m.role === 'assistant'), [messages])
  const topChips = ["Today's attendance", 'At-risk students', 'Top absentees', 'Recent alerts', 'Department stats']

  const handleSend = async (quickMessage = null) => {
    const userMessage = String(quickMessage || input || '').trim()
    if (!userMessage || loading) return
    const userMsg = { role: 'user', content: userMessage, timestamp: new Date() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')

    if (!isAttendanceRelated(userMessage)) {
      setMessages((prev) => [...prev, { role: 'assistant', content: OFF_TOPIC_MSG, timestamp: new Date(), followUps: ["Today's attendance", 'At-risk students', 'Recent alerts'] }])
      return
    }

    setLoading(true)
    try {
      const apiKey = localStorage.getItem(API_KEY_STORAGE) || String(import.meta.env.VITE_GROQ_API_KEY || '').trim()
      if (!apiKey) throw new Error('Missing API key')
      const groq = new Groq({
        apiKey,
        dangerouslyAllowBrowser: true,
      })

      const conversationHistory = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }))

      const completion = await groq.chat.completions.create({
        model: GROQ_MODEL,
        max_tokens: 1024,
        messages: [
          { role: 'system', content: buildSystemDataPrompt() },
          ...conversationHistory,
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        stream: false,
      })
      const botReply = completion.choices?.[0]?.message?.content || 'Sorry, I could not process that.'

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: botReply,
          timestamp: new Date(),
          followUps: getFollowUpChips(botReply),
        },
      ])
    } catch (err) {
      const detail =
        err?.error?.message ||
        err?.message ||
        'Unknown Groq error'
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Sorry, I encountered an error. Please check your Groq API key in .env and try again.\n\nDetails: ${detail}`,
          timestamp: new Date(),
          followUps: ["Today's attendance", 'At-risk students', 'Recent alerts'],
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 32,
        right: 32,
        width: 400,
        height: 580,
        background: '#1a1d2e',
        borderRadius: 24,
        border: '1px solid rgba(0,255,136,0.2)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, rgba(0,255,136,0.1), rgba(0,212,255,0.1))',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, #00ff88, #00d4ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🤖</div>
          <div>
            <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 15 }}>VerifAI Assistant</p>
            <p style={{ margin: 0, color: '#00ff88', fontSize: 11 }}>● Groq AI — Ultra Fast Responses</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => setMessages([welcomeMessage()])}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: '#ddd', cursor: 'pointer', padding: '0 10px', fontSize: 12 }}
          >
            🗑 Clear
          </button>
          <button
            type="button"
            onClick={async () => {
              const txt = lastAssistant?.content || ''
              if (!txt) return
              try {
                await navigator.clipboard.writeText(txt)
              } catch {
                // ignore
              }
            }}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: '#ddd', cursor: 'pointer', padding: '0 10px', fontSize: 12 }}
          >
            📋 Copy Last
          </button>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: '#888', cursor: 'pointer', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
            ✕
          </button>
        </div>
      </div>

      <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {topChips.map((chip) => (
          <button key={chip} type="button" onClick={() => handleSend(chip)} style={{ padding: '6px 12px', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 20, color: '#00d4ff', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {chip}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((msg, idx) => (
          <div key={`${idx}-${msg.timestamp?.toString?.() || idx}`} className="chat-message">
            <div style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-end' }}>
              {msg.role === 'assistant' ? (
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #00ff88, #00d4ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🤖</div>
              ) : null}
              <div
                style={{
                  maxWidth: '78%',
                  padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: msg.role === 'user' ? 'linear-gradient(135deg, #00ff88, #00d4ff)' : 'rgba(255,255,255,0.06)',
                  color: msg.role === 'user' ? '#000' : '#fff',
                  fontSize: 13,
                  lineHeight: 1.5,
                  border: msg.role === 'assistant' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {msg.content}
                <div style={{ fontSize: 10, color: msg.role === 'user' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.3)', marginTop: 4, textAlign: 'right' }}>
                  {msg.timestamp?.toLocaleTimeString?.([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              {msg.role === 'user' ? (
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>👤</div>
              ) : null}
            </div>
            {msg.role === 'assistant' && Array.isArray(msg.followUps) && msg.followUps.length ? (
              <div style={{ marginTop: 8, marginLeft: 36, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {msg.followUps.map((chip) => (
                  <button key={`${idx}-${chip}`} type="button" onClick={() => handleSend(chip)} style={{ padding: '6px 10px', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 16, color: '#00d4ff', fontSize: 11, cursor: 'pointer' }}>
                    {chip}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ))}

        {loading ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #00ff88, #00d4ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🤖</div>
            <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.06)', borderRadius: '18px 18px 18px 4px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 6, alignItems: 'center' }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#00ff88', animation: `bounce 1s infinite ${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        ) : null}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="Ask about attendance, students, alerts..."
          rows={1}
          style={{ flex: 1, padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: '#fff', fontSize: 13, resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: 1.4, maxHeight: 80, overflow: 'auto' }}
        />
        <button type="button" onClick={() => handleSend()} disabled={loading || !input.trim()} style={{ width: 40, height: 40, borderRadius: '50%', background: input.trim() ? 'linear-gradient(135deg, #00ff88, #00d4ff)' : 'rgba(255,255,255,0.1)', border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: input.trim() ? '#000' : '#888' }}>
          ➤
        </button>
      </div>
    </div>
  )
}

