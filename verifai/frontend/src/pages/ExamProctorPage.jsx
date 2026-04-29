import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { usePageTitle } from '../components/layout/pageTitleContext.js'
import { getExamById, updateExam } from '../lib/verifaiDb.js'
import { loadUsersDb } from '../lib/usersDb.js'

const ALERT_TYPES = [
  { message: 'Multiple faces detected in frame', severity: 'critical' },
  { message: 'Face mismatch detected', severity: 'critical' },
  { message: 'Phone detected in frame', severity: 'warning' },
  { message: 'Looking away from screen repeatedly', severity: 'warning' },
  { message: 'Face left frame for >10 seconds', severity: 'alert' },
  { message: 'Low confidence face match', severity: 'alert' },
]

function sevCls(sev) {
  if (sev === 'critical') return 'border-red-500/35 bg-red-500/10'
  if (sev === 'warning') return 'border-yellow-400/35 bg-yellow-400/10'
  return 'border-orange-400/35 bg-orange-400/10'
}

export default function ExamProctorPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { setTitle } = usePageTitle()
  const [exam, setExam] = useState(() => getExamById(id))
  const [alerts, setAlerts] = useState(() => exam?.proctorLog || [])
  const [examActive, setExamActive] = useState(true)
  const [soundOn, setSoundOn] = useState(true)
  const [startedAt] = useState(() => Date.now())
  const [scores, setScores] = useState(() => Object.fromEntries((exam?.allowedStudents || []).map((sid) => [sid, 100])))

  useEffect(() => setTitle('Live Proctoring'), [setTitle])

  const db = useMemo(() => loadUsersDb(), [exam?.id])
  const students = useMemo(
    () => (exam?.allowedStudents || []).map((sid) => db.find((u) => u.id === sid)).filter(Boolean),
    [exam?.allowedStudents, db],
  )

  useEffect(() => {
    if (!examActive || !exam) return
    const interval = setInterval(() => {
      if (!students.length || Math.random() >= 0.3) return
      const st = students[Math.floor(Math.random() * students.length)]
      const al = ALERT_TYPES[Math.floor(Math.random() * ALERT_TYPES.length)]
      const newAlert = {
        id: Date.now().toString(),
        studentId: st.id,
        studentName: st.name,
        message: al.message,
        severity: al.severity,
        timestamp: new Date().toLocaleTimeString(),
        dismissed: false,
      }
      setAlerts((prev) => [newAlert, ...prev].slice(0, 120))
      setScores((prev) => ({
        ...prev,
        [st.id]: Math.max(0, (prev[st.id] || 100) - (al.severity === 'critical' ? 20 : 10)),
      }))
      if (soundOn) {
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)()
          const o = ctx.createOscillator()
          const g = ctx.createGain()
          o.connect(g)
          g.connect(ctx.destination)
          o.frequency.value = al.severity === 'critical' ? 280 : 420
          g.gain.value = 0.03
          o.start()
          o.stop(ctx.currentTime + 0.12)
        } catch {
          // ignore
        }
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [examActive, students, soundOn, exam])

  useEffect(() => {
    if (!exam) return
    const res = updateExam(id, { proctorLog: alerts, status: examActive ? 'active' : 'completed' })
    if (res.ok) setExam(res.exam)
  }, [alerts, examActive, id])

  if (!exam) return <div className="glass p-6 text-sm">Exam not found.</div>

  const elapsedSec = Math.floor((Date.now() - startedAt) / 1000)
  const hh = String(Math.floor(elapsedSec / 3600)).padStart(2, '0')
  const mm = String(Math.floor((elapsedSec % 3600) / 60)).padStart(2, '0')
  const ss = String(elapsedSec % 60).padStart(2, '0')
  const openAlerts = alerts.filter((a) => !a.dismissed)
  const integrity = Math.round(
    students.length
      ? students.reduce((s, st) => s + (scores[st.id] ?? 100), 0) / students.length
      : 100,
  )

  return (
    <div className="space-y-4">
      <div className="glass neon-ring p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold">🧠 {exam.name} | ⏱ {hh}:{mm}:{ss}</div>
          <div className="text-xs">Students: {students.length} | Verified: {exam.verifiedStudents?.length || 0} | 🚨 Alerts: {openAlerts.length}</div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost" onClick={() => setSoundOn((v) => !v)}>{soundOn ? '🔕 Mute' : '🔔 Unmute'}</button>
            <button className="btn-primary" onClick={() => { setExamActive(false); nav(`/exams/${id}/report`) }}>🔴 End Exam</button>
          </div>
        </div>
        <div className="mt-2 text-xs">Integrity: {integrity}%</div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--verifai-green),var(--verifai-cyan))]" style={{ width: `${integrity}%` }} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {students.slice(0, 8).map((s) => {
            const score = scores[s.id] ?? 100
            const state = score < 50 ? 'critical' : score < 80 ? 'warning' : 'safe'
            return (
              <div key={s.id} className={`glass p-3 ${state === 'safe' ? 'border-[rgba(0,255,136,0.3)]' : state === 'warning' ? 'border-orange-400/30' : 'border-red-500/30'}`}>
                <div className="h-28 rounded-xl bg-black/35 ring-1 ring-white/10" />
                <div className="mt-2 text-sm font-semibold">{s.name} — {s.username}</div>
                <div className="mt-1 text-xs">{state === 'safe' ? '✅ Verified — Safe' : state === 'warning' ? '⚠️ Warning' : '🔴 Critical alert'}</div>
                <div className="mt-1 text-[11px] text-white/60">Last check: {Math.floor(Math.random() * 3) + 1} min ago</div>
              </div>
            )
          })}
        </div>

        <div className="glass p-4">
          <div className="text-sm font-semibold">🚨 Live Alerts</div>
          <div className="mt-3 max-h-[560px] space-y-2 overflow-auto">
            {openAlerts.map((a) => (
              <div key={a.id} className={`rounded-xl border p-3 ${sevCls(a.severity)}`}>
                <div className="text-xs font-semibold">{a.severity.toUpperCase()} — {a.timestamp}</div>
                <div className="mt-1 text-sm">{a.studentName}</div>
                <div className="mt-1 text-xs">{a.message}</div>
                <div className="mt-2 flex gap-2">
                  <button className="btn-ghost" onClick={() => setAlerts((p) => p.map((x) => (x.id === a.id ? { ...x, dismissed: true } : x)))}>Dismiss</button>
                  <button className="btn-ghost">Flag Student</button>
                </div>
              </div>
            ))}
            {openAlerts.length === 0 ? <div className="text-xs text-white/60">No active alerts.</div> : null}
          </div>
        </div>
      </div>

      <div className="glass overflow-hidden">
        <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold">Per Student Integrity Table</div>
        <div className="overflow-auto">
          <table className="min-w-[940px] w-full text-sm">
            <thead className="text-xs text-white/60">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Score</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Alerts</th>
                <th className="px-3 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {students.map((s) => {
                const score = scores[s.id] ?? 100
                const count = openAlerts.filter((a) => a.studentId === s.id).length
                return (
                  <tr key={s.id}>
                    <td className="px-3 py-2">{s.name}</td>
                    <td className="px-3 py-2">{s.username}</td>
                    <td className="px-3 py-2">{score}%</td>
                    <td className="px-3 py-2">{score < 50 ? '🔴 Block' : score < 80 ? '⚠️ Warn' : '✅ Safe'}</td>
                    <td className="px-3 py-2">{count}</td>
                    <td className="px-3 py-2">
                      {score < 50 ? <button className="btn-ghost">Block</button> : <button className="btn-ghost">View</button>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <details className="p-4 text-xs">
          <summary className="cursor-pointer">Live JSON output</summary>
          <pre className="mt-2 overflow-auto rounded-xl border border-white/10 bg-black/30 p-3">
            {JSON.stringify(
              students.map((s) => ({
                studentName: s.name,
                studentId: s.username,
                matchScore: scores[s.id] ?? 100,
                identityStatus: (scores[s.id] ?? 100) > 70 ? 'verified' : 'mismatch',
                alerts: openAlerts.filter((a) => a.studentId === s.id).map((a) => a.message),
                integrityLevel: (scores[s.id] ?? 100) > 80 ? 'high' : 'compromised',
                confidenceDetails: (scores[s.id] ?? 100) > 70 ? 'Facial match strong, no extra person detected' : 'Possible mismatch or suspicious behavior',
              })),
              null,
              2,
            )}
          </pre>
        </details>
      </div>
    </div>
  )
}

