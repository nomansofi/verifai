import { useEffect, useMemo, useState } from 'react'
import { Brain, Plus, ShieldCheck, Trash2, Video } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { usePageTitle } from '../components/layout/pageTitleContext.js'
import ToggleBar from '../components/ToggleBar.jsx'
import { addExam, listExams, removeExam } from '../lib/verifaiDb.js'
import { loadUsersDb } from '../lib/usersDb.js'
import { useToast } from '../components/toastContext.js'

export default function ExamsPage() {
  const { setTitle } = usePageTitle()
  const nav = useNavigate()
  const { push } = useToast()
  const [tab, setTab] = useState('list')
  const [exams, setExams] = useState(() => listExams())
  const students = useMemo(() => loadUsersDb().filter((u) => u.role === 'student'), [exams.length])
  const [form, setForm] = useState({
    name: '',
    subject: '',
    date: '',
    time: '',
    duration: 3,
    department: 'CSE',
    allowedStudents: [],
    options: { multiFace: true, phone: true, lookAway: true, mismatch: true },
  })

  useEffect(() => setTitle('Exams & Assessments'), [setTitle])
  const deptStudents = students.filter((s) => s.department === form.department)
  const stats = useMemo(() => {
    const total = exams.length
    const active = exams.filter((e) => e.status === 'active').length
    const verified = exams.reduce((s, e) => s + (Array.isArray(e.verifiedStudents) ? e.verifiedStudents.length : 0), 0)
    const alerts = exams.reduce((s, e) => s + (Array.isArray(e.proctorLog) ? e.proctorLog.filter((a) => !a.dismissed).length : 0), 0)
    return { total, active, verified, alerts }
  }, [exams])

  return (
    <div className="space-y-4">
      <div className="glass neon-ring p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xl font-semibold">Exams & Assessments</div>
            <div className="mt-1 text-sm text-white/65">AI-powered identity verification and live proctoring</div>
            <div className="mt-3">
              <ToggleBar
                value={tab}
                onChange={setTab}
                options={[
                  { value: 'list', label: '📝 My Exams' },
                  { value: 'create', label: '+ Create Exam' },
                ]}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">Total Exams: <span className="font-semibold">{stats.total}</span></div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">Active Now: <span className="font-semibold">{stats.active}</span></div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">Students Verified: <span className="font-semibold">{stats.verified}</span></div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">Alerts: <span className="font-semibold">{stats.alerts}</span></div>
          </div>
        </div>
      </div>

      {tab === 'list' ? (
        <div className="grid gap-4 md:grid-cols-2">
          {exams.map((e) => {
            const verified = e.verifiedStudents?.length || 0
            const allowed = e.allowedStudents?.length || 0
            const score = Math.max(0, Math.min(100, Math.round((verified / Math.max(allowed, 1)) * 100)))
            return (
              <div key={e.id} className="glass p-5 transition hover:scale-[1.01]">
                <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ${
                  e.status === 'active'
                    ? 'bg-[rgba(0,255,136,0.14)] text-[color:var(--verifai-green)] ring-[rgba(0,255,136,0.25)] animate-pulse'
                    : e.status === 'completed'
                      ? 'bg-white/10 text-white/70 ring-white/10'
                      : 'bg-[rgba(0,212,255,0.14)] text-[color:var(--verifai-cyan)] ring-[rgba(0,212,255,0.25)]'
                }`}>🧠 {e.status || 'upcoming'}</span>
                <div className="mt-3 text-lg font-semibold">{e.name}</div>
                <div className="mt-1 text-sm text-white/70">{e.subject}</div>
                <div className="mt-1 text-xs text-white/65">⏱ Duration: {e.duration} hours</div>
                <div className="mt-1 text-xs text-white/65">👥 Allowed Students: {allowed}</div>
                <div className="mt-1 text-xs text-white/65">📅 {e.date} {e.time}</div>
                <div className="mt-3 text-xs text-white/70">Integrity Score: {score}%</div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--verifai-green),var(--verifai-cyan))]" style={{ width: `${score}%` }} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="btn-ghost" onClick={() => nav(`/exams/${e.id}/verify`)}>
                    <ShieldCheck className="h-4 w-4" /> Verify Students
                  </button>
                  <button className="btn-primary" onClick={() => nav(`/exams/${e.id}/proctor`)}>
                    <Video className="h-4 w-4" /> Start Proctor
                  </button>
                  <button className="btn-ghost" onClick={() => { const next = removeExam(e.id); setExams(next); }}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="glass mx-auto max-w-[840px] p-5">
          <div className="text-lg font-semibold">🧠 Create New Exam</div>
          <div className="mt-4 grid gap-4">
            <label className="text-xs text-white/60">Exam Name *
              <input className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </label>
            <label className="text-xs text-white/60">Subject *
              <input className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs text-white/60">Date *
                <input type="date" className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              </label>
              <label className="text-xs text-white/60">Time *
                <input type="time" className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} />
              </label>
            </div>
            <label className="text-xs text-white/60">Duration (hours) *
              <input type="number" min={1} className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm" value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: Number(e.target.value || 1) }))} />
            </label>
            <label className="text-xs text-white/60">Department *
              <select className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value, allowedStudents: [] }))}>
                <option value="CSE">CSE</option>
                <option value="ECE">ECE</option>
                <option value="ME">ME</option>
              </select>
            </label>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-2 text-xs text-white/60">Allowed Students</div>
              <div className="space-y-1">
                {deptStudents.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.allowedStudents.includes(s.id)}
                      onChange={(e) => setForm((f) => ({ ...f, allowedStudents: e.target.checked ? [...f.allowedStudents, s.id] : f.allowedStudents.filter((id) => id !== s.id) }))}
                    />
                    {s.name} — {s.username}
                  </label>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <button className="btn-ghost" onClick={() => setForm((f) => ({ ...f, allowedStudents: deptStudents.map((s) => s.id) }))}>Select All</button>
                <button className="btn-ghost" onClick={() => setForm((f) => ({ ...f, allowedStudents: [] }))}>Deselect All</button>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-2 text-xs text-white/60">Proctoring Options</div>
              {[
                ['multiFace', 'Multiple face detection'],
                ['phone', 'Phone detection alerts'],
                ['lookAway', 'Looking away detection'],
                ['mismatch', 'Face mismatch blocking'],
              ].map(([k, label]) => (
                <label key={k} className="mb-1 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.options[k]} onChange={(e) => setForm((f) => ({ ...f, options: { ...f.options, [k]: e.target.checked } }))} />
                  {label}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setTab('list')}>Cancel</button>
              <button
                className="btn-primary"
                onClick={() => {
                  if (!form.name || !form.subject || !form.date || !form.time) {
                    push({ title: 'Missing fields', message: 'Please fill all required fields', variant: 'error' })
                    return
                  }
                  const exam = {
                    id: Date.now().toString(),
                    name: form.name,
                    subject: form.subject,
                    date: form.date,
                    time: form.time,
                    duration: form.duration,
                    department: form.department,
                    allowedStudents: form.allowedStudents,
                    proctoringOptions: form.options,
                    status: 'upcoming',
                    verifiedStudents: [],
                    proctorLog: [],
                    createdAt: new Date().toISOString(),
                  }
                  setExams(addExam(exam))
                  setTab('list')
                  push({ title: 'Exam created', message: exam.name, variant: 'success' })
                }}
              >
                <Plus className="h-4 w-4" /> Create Exam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

