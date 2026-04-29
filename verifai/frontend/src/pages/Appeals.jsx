import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, XCircle, Clock, Upload, Eye, X, BadgeCheck, Ban } from 'lucide-react'
import { usePageTitle } from '../components/layout/pageTitleContext.js'
import { useToast } from '../components/toastContext.js'
import { cn } from '../lib/cn.js'
import { getCurrentUser, loadUsersDb, addAttendanceForStudentId } from '../lib/usersDb.js'
import { addAppeal, listAppeals, updateAppeal } from '../lib/verifaiDb.js'

const REASONS = ['Medical', 'Family Emergency', 'Transport Issue', 'Event Participation', 'Other']

function StatusPill({ status }) {
  const s = String(status || 'pending').toLowerCase()
  const meta =
    s === 'approved'
      ? { icon: BadgeCheck, cls: 'bg-[rgba(0,255,136,0.14)] text-[color:var(--verifai-green)] ring-[rgba(0,255,136,0.25)]', label: 'APPROVED' }
      : s === 'rejected'
        ? { icon: Ban, cls: 'bg-red-500/10 text-red-200 ring-red-500/20', label: 'REJECTED' }
        : { icon: Clock, cls: 'bg-yellow-400/10 text-yellow-200 ring-yellow-400/20', label: 'PENDING' }
  const Icon = meta.icon
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ring-1', meta.cls)}>
      <Icon className="h-3.5 w-3.5" /> {meta.label}
    </span>
  )
}

function Modal({ open, title, onClose, children, wide }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('glass neon-ring relative w-full overflow-hidden', wide ? 'max-w-[980px]' : 'max-w-[760px]')}>
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="text-sm font-semibold">{title}</div>
          <button type="button" className="btn-ghost" onClick={onClose}>
            <X className="h-4 w-4" /> Close
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

async function fileToDataUrl(file) {
  const buf = await file.arrayBuffer()
  const blob = new Blob([buf], { type: file.type || 'image/jpeg' })
  return await new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onerror = () => reject(new Error('read failed'))
    r.onload = () => resolve(String(r.result))
    r.readAsDataURL(blob)
  })
}

function ymdToDateString(ymd) {
  if (!ymd) return null
  const [y, m, d] = String(ymd).split('-').map((x) => Number(x))
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d).toDateString()
}

export default function Appeals() {
  const { setTitle } = usePageTitle()
  const { push } = useToast()
  const current = getCurrentUser()
  const [appeals, setAppeals] = useState(() => listAppeals())
  const [submitOpen, setSubmitOpen] = useState(false)
  const [proofOpen, setProofOpen] = useState(false)
  const [proofSrc, setProofSrc] = useState(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [activeAppeal, setActiveAppeal] = useState(null)

  const [form, setForm] = useState({ dateYmd: '', reason: 'Medical', description: '', proofBase64: '' })
  const fileInputRef = useRef(null)

  useEffect(() => setTitle('Appeals'), [setTitle])

  useEffect(() => {
    const t = window.setInterval(() => setAppeals(listAppeals()), 1500)
    return () => window.clearInterval(t)
  }, [])

  const user = useMemo(() => {
    const db = loadUsersDb()
    return db.find((u) => u.id === current?.id) ?? null
  }, [current?.id])

  const isStudent = current?.role === 'student'
  const isTeacher = current?.role === 'teacher'
  const dept = isTeacher ? current?.department : user?.department

  const myAppeals = useMemo(() => {
    if (!isStudent) return []
    return appeals.filter((a) => a.studentId === current?.id)
  }, [appeals, current?.id, isStudent])

  const pendingForTeacher = useMemo(() => {
    if (!isTeacher) return []
    return appeals.filter((a) => a.status === 'pending' && (!dept || a.department === dept))
  }, [appeals, isTeacher, dept])

  const submitAppeal = async () => {
    const dateStr = ymdToDateString(form.dateYmd)
    if (!dateStr) {
      push({ title: 'Missing date', message: 'Please select the date of absence', variant: 'error' })
      return
    }
    if (!form.reason) {
      push({ title: 'Missing reason', message: 'Please select a reason', variant: 'error' })
      return
    }
    if (!String(form.description || '').trim()) {
      push({ title: 'Missing description', message: 'Please enter a short description', variant: 'error' })
      return
    }

    const appeal = {
      id: Date.now().toString(),
      studentId: current.id,
      studentName: current.name,
      department: user?.department ?? 'CSE',
      date: dateStr,
      reason: form.reason,
      description: form.description,
      proofBase64: form.proofBase64 || '',
      status: 'pending',
      submittedAt: new Date().toISOString(),
      reviewedBy: null,
      reviewNote: '',
    }
    addAppeal(appeal)
    setAppeals(listAppeals())
    setSubmitOpen(false)
    setForm({ dateYmd: '', reason: 'Medical', description: '', proofBase64: '' })
    push({ title: 'Appeal submitted', message: 'Status: Pending', variant: 'success' })
  }

  const approve = (a) => {
    const teacherName = current?.name || 'Teacher'
    const res = updateAppeal(a.id, { status: 'approved', reviewedBy: teacherName, reviewedAt: new Date().toISOString(), reviewNote: '' })
    setAppeals(res.appeals)

    // Add attendance record for that specific date (avoid duplicates)
    const db = loadUsersDb()
    const stu = db.find((u) => u.role === 'student' && u.id === a.studentId) ?? null
    const recs = Array.isArray(stu?.attendanceRecords) ? stu.attendanceRecords : []
    if (!recs.some((r) => r?.date === a.date && String(r?.method || '').toUpperCase() === 'APPEAL')) {
      // addAttendanceForStudentId uses current date/time unless overridden
      addAttendanceForStudentId(stu.username, {
        date: a.date,
        timeIn: new Date().toLocaleTimeString(),
        status: 'present',
        method: 'APPEAL',
        confidence: 100,
        approvedBy: teacherName,
        appealId: a.id,
      })
    }

    push({ title: 'Approved', message: `Attendance added for ${a.studentName}`, variant: 'success' })
  }

  const reject = () => {
    if (!activeAppeal) return
    const note = String(rejectNote || '').trim()
    if (!note) {
      push({ title: 'Add a note', message: 'Please provide a rejection reason', variant: 'error' })
      return
    }
    const teacherName = current?.name || 'Teacher'
    const res = updateAppeal(activeAppeal.id, { status: 'rejected', reviewedBy: teacherName, reviewedAt: new Date().toISOString(), reviewNote: note })
    setAppeals(res.appeals)
    setRejectOpen(false)
    setRejectNote('')
    setActiveAppeal(null)
    push({ title: 'Rejected', message: 'Appeal updated', variant: 'success' })
  }

  return (
    <div className="space-y-4">
      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, color: '#fff', fontSize: 20 }}>{isTeacher ? 'Review Appeals' : 'My Appeals'}</h2>
            <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: 13 }}>
              {isTeacher ? `Pending appeals${dept ? ` • Dept: ${dept}` : ''}` : 'Request attendance corrections'}
            </p>
          </div>
          {isStudent ? (
            <button
              type="button"
              onClick={() => setSubmitOpen(true)}
              style={{
                padding: '10px 16px',
                background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
                border: 'none',
                borderRadius: 12,
                color: '#000',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              + New
            </button>
          ) : null}
        </div>
      </div>

      {isStudent ? (
        <div style={{ padding: '0 16px 8px' }}>
          {myAppeals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <p style={{ fontSize: 48 }}>📝</p>
              <p style={{ color: '#6b7280', fontSize: 15 }}>No appeals submitted yet</p>
              <p style={{ color: '#4b5563', fontSize: 13 }}>Submit an appeal if your attendance was incorrectly marked</p>
            </div>
          ) : (
            myAppeals.map((appeal) => (
              <div
                key={appeal.id}
                style={{
                  padding: 16,
                  marginBottom: 10,
                  background: '#1a1d2e',
                  borderRadius: 16,
                  border: `1px solid ${
                    appeal.status === 'approved' ? 'rgba(0,255,136,0.2)' : appeal.status === 'rejected' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'
                  }`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div>
                    <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 15 }}>{appeal.reason}</p>
                    <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: 12 }}>📅 {appeal.date}</p>
                  </div>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 700,
                      background:
                        appeal.status === 'approved' ? 'rgba(0,255,136,0.15)' : appeal.status === 'rejected' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                      color: appeal.status === 'approved' ? '#00ff88' : appeal.status === 'rejected' ? '#ef4444' : '#f59e0b',
                    }}
                  >
                    {appeal.status === 'approved' ? '✅ Approved' : appeal.status === 'rejected' ? '❌ Rejected' : '⏳ Pending'}
                  </span>
                </div>
                <p style={{ margin: '10px 0 0', color: '#9ca3af', fontSize: 13, lineHeight: 1.4 }}>{appeal.description}</p>
                {appeal.proofBase64 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setProofSrc(appeal.proofBase64)
                      setProofOpen(true)
                    }}
                    style={{ marginTop: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#e5e7eb', borderRadius: 12, padding: '10px 12px', fontSize: 13 }}
                  >
                    View Proof
                  </button>
                ) : null}
                {appeal.reviewNote ? (
                  <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, borderLeft: '3px solid #00d4ff' }}>
                    <p style={{ margin: 0, color: '#00d4ff', fontSize: 12 }}>Teacher note: {appeal.reviewNote}</p>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      ) : null}

      {isTeacher ? (
        <div className="glass overflow-hidden">
          <div className="border-b border-white/10 px-4 py-3">
            <div className="text-sm font-semibold">Pending appeals</div>
            <div className="mt-0.5 text-xs text-white/60">{pendingForTeacher.length} pending</div>
          </div>
          <div className="overflow-auto">
            <table className="min-w-[1150px] w-full text-left text-sm">
              <thead className="bg-white/5 text-xs text-white/60">
                <tr>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Proof</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {pendingForTeacher.map((a) => (
                  <tr key={a.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 font-medium">{a.studentName}</td>
                    <td className="px-4 py-3 text-white/80">{a.date}</td>
                    <td className="px-4 py-3 text-white/80">{a.reason}</td>
                    <td className="px-4 py-3 text-white/80">{a.description}</td>
                    <td className="px-4 py-3">
                      {a.proofBase64 ? (
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => {
                            setProofSrc(a.proofBase64)
                            setProofOpen(true)
                          }}
                        >
                          <Eye className="h-4 w-4" /> View Proof
                        </button>
                      ) : (
                        <span className="text-white/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button" className="btn-primary" onClick={() => approve(a)}>
                          <CheckCircle2 className="h-4 w-4" /> Approve
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => {
                            setActiveAppeal(a)
                            setRejectNote('')
                            setRejectOpen(true)
                          }}
                        >
                          <XCircle className="h-4 w-4" /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pendingForTeacher.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-white/60" colSpan={6}>
                      No pending appeals right now.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {isStudent && submitOpen ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', background: '#1a1d2e', borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: 18 }}>Submit Appeal</h3>
              <button type="button" onClick={() => setSubmitOpen(false)} style={{ background: 'none', border: 'none', color: '#888', fontSize: 22 }}>
                ✕
              </button>
            </div>

            <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 6 }}>Date of Absence</label>
            <input
              type="date"
              value={form.dateYmd}
              onChange={(e) => setForm((s) => ({ ...s, dateYmd: e.target.value }))}
              style={{ width: '100%', padding: '12px 16px', marginBottom: 16, background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }}
            />

            <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 6 }}>Reason</label>
            <select
              value={form.reason}
              onChange={(e) => setForm((s) => ({ ...s, reason: e.target.value }))}
              style={{ width: '100%', padding: '12px 16px', marginBottom: 16, background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }}
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 6 }}>Description</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
              style={{ width: '100%', padding: '12px 16px', marginBottom: 16, background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', resize: 'none' }}
              placeholder="Explain why you were absent..."
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                const b64 = await fileToDataUrl(f)
                setForm((s) => ({ ...s, proofBase64: b64 }))
                e.target.value = ''
                push({ title: 'Proof attached', message: 'Image saved', variant: 'success' })
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => fileInputRef.current?.click()} style={{ padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#e5e7eb', fontSize: 13 }}>
                <Upload className="mr-1 inline h-4 w-4" /> Upload Proof
              </button>
              {form.proofBase64 ? (
                <button
                  type="button"
                  onClick={() => {
                    setProofSrc(form.proofBase64)
                    setProofOpen(true)
                  }}
                  style={{ padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#e5e7eb', fontSize: 13 }}
                >
                  <Eye className="mr-1 inline h-4 w-4" /> Preview
                </button>
              ) : null}
            </div>

            <button
              type="button"
              onClick={submitAppeal}
              style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #00ff88, #00d4ff)', border: 'none', borderRadius: 14, color: '#000', fontWeight: 800, fontSize: 16 }}
            >
              Submit Appeal
            </button>
          </div>
        </div>
      ) : null}

      <Modal open={proofOpen} title="Proof" onClose={() => setProofOpen(false)}>
        {proofSrc ? (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <img src={proofSrc} alt="Proof" className="max-h-[70dvh] w-full object-contain" />
          </div>
        ) : null}
      </Modal>

      <Modal open={rejectOpen} title="Reject appeal" onClose={() => setRejectOpen(false)}>
        <div className="space-y-3">
          <div className="text-xs text-white/60">Add a rejection note (required)</div>
          <textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[rgba(0,255,136,0.35)]"
          />
          <button type="button" className="btn-primary w-full" onClick={reject}>
            <XCircle className="h-4 w-4" /> Reject
          </button>
        </div>
      </Modal>
    </div>
  )
}

