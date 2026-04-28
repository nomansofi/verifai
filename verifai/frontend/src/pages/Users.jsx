import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Search, Trash2, Pencil, Upload, Camera } from 'lucide-react'
import { usePageTitle } from '../components/layout/AppLayout.jsx'
import { apiEnroll, apiGetUsers } from '../lib/api.js'
import { MOCK_DEPARTMENTS } from '../data/mock.js'
import { cn } from '../lib/cn.js'
import { useToast } from '../components/ToastProvider.jsx'

function captureBase64(videoEl) {
  if (!videoEl?.videoWidth || !videoEl?.videoHeight) return null
  const c = document.createElement('canvas')
  c.width = videoEl.videoWidth
  c.height = videoEl.videoHeight
  const ctx = c.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(videoEl, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.8)
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return []
  const header = lines[0].split(',').map((x) => x.trim().toLowerCase())
  const idx = (k) => header.indexOf(k)
  const out = []
  for (const line of lines.slice(1)) {
    const cols = line.split(',').map((x) => x.trim())
    const name = cols[idx('name')]
    const id = cols[idx('id')] ?? cols[idx('user_id')]
    const role = cols[idx('role')] ?? 'Student'
    const department = cols[idx('department')] ?? 'CSE'
    if (name && id) out.push({ name, id, role, department })
  }
  return out
}

function Modal({ open, onClose, children, title }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="glass neon-ring relative w-full max-w-[720px] overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="text-sm font-semibold">{title}</div>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

export default function Users() {
  const { setTitle } = usePageTitle()
  const { push } = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [dept, setDept] = useState('All')
  const [role, setRole] = useState('All')

  const [enrollOpen, setEnrollOpen] = useState(false)
  const [enrollForm, setEnrollForm] = useState({ name: '', id: '', role: 'Student', department: 'CSE' })
  const [photo, setPhoto] = useState(null)

  const videoRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => setTitle('Users'), [setTitle])

  useEffect(() => {
    let alive = true
    async function run() {
      setLoading(true)
      const data = await apiGetUsers()
      if (!alive) return
      setUsers(data)
      setLoading(false)
    }
    run()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    async function startCam() {
      if (!enrollOpen) return
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
      } catch {
        // ignore
      }
    }
    startCam()
    return () => {
      streamRef.current?.getTracks?.().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [enrollOpen])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter((u) => {
      const okQ = !q || u.name.toLowerCase().includes(q) || u.id.toLowerCase().includes(q)
      const okD = dept === 'All' || u.department === dept
      const okR = role === 'All' || u.role === role
      return okQ && okD && okR
    })
  }, [users, query, dept, role])

  return (
    <div className="space-y-4">
      <div className="glass neon-ring flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or ID…"
              className="h-10 w-[260px] rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 text-sm text-white placeholder:text-white/35 outline-none focus:ring-2 focus:ring-[rgba(0,255,136,0.35)]"
            />
          </div>

          <select
            value={dept}
            onChange={(e) => setDept(e.target.value)}
            className="h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white/85 outline-none"
          >
            <option value="All">All departments</option>
            {MOCK_DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white/85 outline-none"
          >
            <option value="All">All roles</option>
            <option value="Student">Student</option>
            <option value="Employee">Employee</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="btn-ghost cursor-pointer">
            <Upload className="h-4 w-4" />
            Bulk CSV import
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const text = await file.text()
                const rows = parseCsv(text)
                setUsers((u) => [
                  ...rows.map((r) => ({ id: r.id, name: r.name, role: r.role, department: r.department, photoUrl: null })),
                  ...u,
                ])
                push({ title: 'CSV imported', message: `${rows.length} users added`, variant: 'success' })
                e.target.value = ''
              }}
            />
          </label>

          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setEnrollForm({ name: '', id: '', role: 'Student', department: 'CSE' })
              setPhoto(null)
              setEnrollOpen(true)
            }}
          >
            <Plus className="h-4 w-4" /> Enroll New Face
          </button>
        </div>
      </div>

      <div className="glass overflow-hidden">
        <div className="border-b border-white/10 px-4 py-3">
          <div className="text-sm font-semibold">Enrolled users</div>
          <div className="mt-0.5 text-xs text-white/60">{filtered.length} users</div>
        </div>

        <div className="overflow-auto">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-white/5 text-xs text-white/60">
              <tr>
                <th className="px-4 py-3 font-medium">Photo</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <tr key={i}>
                    <td className="px-4 py-3">
                      <div className="skeleton h-9 w-9 rounded-full" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="skeleton h-4 w-40" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="skeleton h-4 w-24" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="skeleton h-4 w-20" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="skeleton h-4 w-20" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="skeleton h-8 w-24" />
                    </td>
                  </tr>
                ))
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div className="h-9 w-9 rounded-full bg-white/10 p-[1px]">
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-black/40 text-xs font-semibold">
                          {u.name
                            .split(' ')
                            .slice(0, 2)
                            .map((x) => x[0])
                            .join('')
                            .toUpperCase()}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-white/80">{u.id}</td>
                    <td className="px-4 py-3 text-white/80">{u.role}</td>
                    <td className="px-4 py-3 text-white/80">{u.department}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => push({ title: 'Edit user', message: 'Mock UI — backend wiring next', variant: 'info' })}
                        >
                          <Pencil className="h-4 w-4" /> Edit
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => {
                            setUsers((x) => x.filter((y) => y.id !== u.id))
                            push({ title: 'User removed', message: u.name, variant: 'success' })
                          }}
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={enrollOpen}
        onClose={() => setEnrollOpen(false)}
        title="Enroll new face"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-black/40">
              <video ref={videoRef} className="h-full w-full object-cover opacity-90" playsInline muted />
              <div className="scan-border" />
              {photo ? (
                <img src={photo} alt="Captured" className="absolute inset-0 h-full w-full object-cover" />
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  const b64 = captureBase64(videoRef.current)
                  if (!b64) {
                    push({ title: 'Capture failed', message: 'No camera frame available', variant: 'error' })
                    return
                  }
                  setPhoto(b64)
                  push({ title: 'Captured', message: 'Face image saved', variant: 'success' })
                }}
              >
                <Camera className="h-4 w-4" /> Capture
              </button>
              <button type="button" className="btn-ghost" onClick={() => setPhoto(null)}>
                Retake
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid gap-3">
              <label className="text-xs text-white/60">
                Name
                <input
                  value={enrollForm.name}
                  onChange={(e) => setEnrollForm((s) => ({ ...s, name: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-[rgba(0,255,136,0.35)]"
                />
              </label>
              <label className="text-xs text-white/60">
                ID
                <input
                  value={enrollForm.id}
                  onChange={(e) => setEnrollForm((s) => ({ ...s, id: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-[rgba(0,255,136,0.35)]"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-white/60">
                  Role
                  <select
                    value={enrollForm.role}
                    onChange={(e) => setEnrollForm((s) => ({ ...s, role: e.target.value }))}
                    className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white/85 outline-none"
                  >
                    <option value="Student">Student</option>
                    <option value="Employee">Employee</option>
                  </select>
                </label>
                <label className="text-xs text-white/60">
                  Department
                  <select
                    value={enrollForm.department}
                    onChange={(e) => setEnrollForm((s) => ({ ...s, department: e.target.value }))}
                    className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white/85 outline-none"
                  >
                    {MOCK_DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/65">
              Captured face images are stored as enrollment embeddings in production. This demo uses mock endpoints.
            </div>

            <button
              type="button"
              className={cn('btn-primary w-full', (!enrollForm.name || !enrollForm.id || !photo) && 'opacity-60')}
              disabled={!enrollForm.name || !enrollForm.id || !photo}
              onClick={async () => {
                await apiEnroll({
                  name: enrollForm.name,
                  userId: enrollForm.id,
                  role: enrollForm.role,
                  department: enrollForm.department,
                  imageBase64: photo,
                })
                setUsers((u) => [
                  { id: enrollForm.id, name: enrollForm.name, role: enrollForm.role, department: enrollForm.department, photoUrl: null },
                  ...u,
                ])
                push({ title: 'Enrolled', message: `${enrollForm.name} added`, variant: 'success' })
                setEnrollOpen(false)
              }}
            >
              <Plus className="h-4 w-4" /> Enroll
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

