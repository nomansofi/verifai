import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Search, Trash2, Pencil, KeyRound, Eye, Camera, ImageUp, LoaderCircle } from 'lucide-react'
import { usePageTitle } from '../components/layout/pageTitleContext.js'
import { cn } from '../lib/cn.js'
import { useToast } from '../components/toastContext.js'
import { DEPARTMENTS, addUserToDb, deleteUserFromDb, loadUsersDb, updateUserInDb } from '../lib/usersDb.js'
import { descriptorFromDataUrl, loadFaceModels } from '../lib/faceApi.js'

function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?'
}

function captureBase64(videoEl) {
  if (!videoEl?.videoWidth || !videoEl?.videoHeight) return null
  const c = document.createElement('canvas')
  c.width = videoEl.videoWidth
  c.height = videoEl.videoHeight
  const ctx = c.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(videoEl, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.85)
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

function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('glass neon-ring relative w-full overflow-hidden', wide ? 'max-w-[980px]' : 'max-w-[720px]')}>
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

function Field({ label, children }) {
  return (
    <label className="text-xs text-white/60">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  )
}

export default function Users() {
  const { setTitle } = usePageTitle()
  const { push } = useToast()

  const [tab, setTab] = useState('student') // student | teacher
  const [query, setQuery] = useState('')
  const [db, setDb] = useState(() => loadUsersDb())

  const [modelsPct, setModelsPct] = useState(0)
  const [modelsReady, setModelsReady] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [mode, setMode] = useState('add') // add | edit
  const [photoPick, setPhotoPick] = useState('none') // none | camera | upload
  const [photoDataURL, setPhotoDataURL] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    id: null, // internal db id
    fullName: '',
    loginId: '',
    password: '',
    confirmPassword: '',
    department: 'CSE',
    section: '',
    subjects: '',
    phone: '',
    email: '',
    dob: '',
    parentName: '',
    parentPhone: '',
    notifyParent: false,
    optedOut: false,
  })

  const [resetOpen, setResetOpen] = useState(false)
  const [resetUser, setResetUser] = useState(null)
  const [resetPw, setResetPw] = useState('')

  const [profileOpen, setProfileOpen] = useState(false)
  const [profileUser, setProfileUser] = useState(null)

  const videoRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => setTitle('User Management'), [setTitle])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        await loadFaceModels({
          modelUri: 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model',
          onProgress: (p) => alive && setModelsPct(p),
        })
        if (!alive) return
        setModelsReady(true)
      } catch {
        // Allow user management even if models fail (faceDescriptor stays null).
        if (!alive) return
        setModelsReady(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    async function startCam() {
      if (!modalOpen || photoPick !== 'camera') return
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
  }, [modalOpen, photoPick])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return db
      .filter((u) => u.role === tab)
      .filter((u) => {
        if (!q) return true
        return (u.name || '').toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q)
      })
  }, [db, tab, query])

  const tabLabel = tab === 'student' ? 'Students' : 'Teachers'
  const addLabel = tab === 'student' ? '+ Add Student' : '+ Add Teacher'

  const openAdd = () => {
    setMode('add')
    setPhotoPick('none')
    setPhotoDataURL(null)
    setForm({
      id: null,
      fullName: '',
      loginId: '',
      password: '',
      confirmPassword: '',
      department: 'CSE',
      section: '',
      subjects: '',
      phone: '',
      email: '',
      dob: '',
      parentName: '',
      parentPhone: '',
      notifyParent: false,
      optedOut: false,
    })
    setModalOpen(true)
  }

  const openEdit = (u) => {
    setMode('edit')
    setPhotoPick('none')
    setPhotoDataURL(u.photoDataURL ?? null)
    setForm({
      id: u.id,
      fullName: u.name ?? '',
      loginId: u.username ?? '',
      password: '',
      confirmPassword: '',
      department: u.department ?? 'CSE',
      section: u.section ?? '',
      subjects: Array.isArray(u.subjects) ? u.subjects.join(', ') : u.subjects ?? '',
      phone: u.phone ?? '',
      email: u.email ?? '',
      dob: u.dob ?? '',
      parentName: u.parentName ?? '',
      parentPhone: u.parentPhone ?? '',
      notifyParent: Boolean(u.notifyParent),
      optedOut: Boolean(u.optedOut),
    })
    setModalOpen(true)
  }

  const saveUser = async () => {
    const role = tab
    if (!form.fullName.trim() || !form.loginId.trim()) {
      push({ title: 'Missing fields', message: 'Full Name and ID are required', variant: 'error' })
      return
    }
    if (mode === 'add') {
      if (!form.password) {
        push({ title: 'Missing password', message: 'Password is required', variant: 'error' })
        return
      }
      if (form.password !== form.confirmPassword) {
        push({ title: 'Password mismatch', message: 'Passwords must match', variant: 'error' })
        return
      }
    } else if (form.password || form.confirmPassword) {
      if (form.password !== form.confirmPassword) {
        push({ title: 'Password mismatch', message: 'Passwords must match', variant: 'error' })
        return
      }
    }

    setSaving(true)
    try {
      const now = new Date().toISOString()
      let descriptor = null
      if (modelsReady && photoDataURL) {
        descriptor = await descriptorFromDataUrl(photoDataURL)
      }

      if (mode === 'add') {
        const newUser = {
          id: Date.now().toString(),
          username: form.loginId.trim(),
          password: form.password,
          name: form.fullName.trim(),
          role,
          department: form.department,
          section: role === 'student' ? form.section : '',
          subjects: role === 'teacher' ? form.subjects.split(',').map((s) => s.trim()).filter(Boolean) : [],
          phone: form.phone,
          email: form.email,
          dob: role === 'student' ? form.dob : '',
          parentName: role === 'student' ? form.parentName : '',
          parentPhone: role === 'student' ? form.parentPhone : '',
          notifyParent: role === 'student' ? Boolean(form.notifyParent) : false,
          optedOut: role === 'student' ? Boolean(form.optedOut) : false,
          photoDataURL: photoDataURL,
          faceDescriptor: descriptor, // null if model fails / no face detected
          createdAt: now,
          attendanceRecords: [],
        }
        const next = addUserToDb(newUser)
        setDb(next)
        push({ title: 'User added successfully', message: `${newUser.name}`, variant: 'success' })
        setModalOpen(false)
      } else {
        const patch = {
          username: form.loginId.trim(),
          ...(form.password ? { password: form.password } : {}),
          name: form.fullName.trim(),
          role,
          department: form.department,
          section: role === 'student' ? form.section : '',
          subjects: role === 'teacher' ? form.subjects.split(',').map((s) => s.trim()).filter(Boolean) : [],
          phone: form.phone,
          email: form.email,
          dob: role === 'student' ? form.dob : '',
          parentName: role === 'student' ? form.parentName : '',
          parentPhone: role === 'student' ? form.parentPhone : '',
          notifyParent: role === 'student' ? Boolean(form.notifyParent) : false,
          optedOut: role === 'student' ? Boolean(form.optedOut) : false,
          photoDataURL,
          ...(descriptor ? { faceDescriptor: descriptor } : {}),
        }
        const res = updateUserInDb(form.id, patch)
        setDb(res.db)
        push({ title: 'Saved successfully', message: 'User updated', variant: 'success' })
        setModalOpen(false)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="glass neon-ring flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <div className="text-sm font-semibold">User Management</div>
          <div className="mt-0.5 text-xs text-white/60">Manage Students and Teachers (localStorage)</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className={cn('btn-ghost', tab === 'student' && 'ring-1 ring-[rgba(0,255,136,0.25)]')}
            onClick={() => setTab('student')}
          >
            Students
          </button>
          <button
            type="button"
            className={cn('btn-ghost', tab === 'teacher' && 'ring-1 ring-[rgba(0,212,255,0.25)]')}
            onClick={() => setTab('teacher')}
          >
            Teachers
          </button>
          <button type="button" className="btn-primary" onClick={openAdd}>
            <Plus className="h-4 w-4" /> {addLabel}
          </button>
        </div>
      </div>

      <div className="glass neon-ring flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${tabLabel.toLowerCase()}…`}
            className="h-10 w-[260px] rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 text-sm text-white placeholder:text-white/35 outline-none focus:ring-2 focus:ring-[rgba(0,255,136,0.35)]"
          />
        </div>

        <div className="text-xs text-white/60">
          AI models: {modelsReady ? <span className="text-[color:var(--verifai-green)]">ready</span> : <span>loading ({modelsPct}%)</span>}
        </div>
      </div>

      <div className="glass overflow-hidden">
        <div className="border-b border-white/10 px-4 py-3">
          <div className="text-sm font-semibold">{tabLabel}</div>
          <div className="mt-0.5 text-xs text-white/60">{rows.length} users</div>
        </div>

        <div className="overflow-auto">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead className="bg-white/5 text-xs text-white/60">
              <tr>
                <th className="px-4 py-3 font-medium">Photo</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">{tab === 'student' ? 'Section' : 'Subjects'}</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.map((u) => (
                <tr key={u.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="h-10 w-10 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
                      {u.photoDataURL ? (
                        <img src={u.photoDataURL} alt={u.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white/80">
                          {initials(u.name)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-white/80">{u.username}</td>
                  <td className="px-4 py-3 text-white/80">{u.department}</td>
                  <td className="px-4 py-3 text-white/80">{tab === 'student' ? u.section || '—' : (u.subjects || []).join(', ') || '—'}</td>
                  <td className="px-4 py-3 text-white/80">{u.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" className="btn-ghost" onClick={() => openEdit(u)}>
                        <Pencil className="h-4 w-4" /> Edit
                      </button>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => {
                          setProfileUser(u)
                          setProfileOpen(true)
                        }}
                      >
                        <Eye className="h-4 w-4" /> View
                      </button>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => {
                          setResetUser(u)
                          setResetPw('')
                          setResetOpen(true)
                        }}
                      >
                        <KeyRound className="h-4 w-4" /> Reset PW
                      </button>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => {
                          if (!window.confirm(`Delete ${u.name}?`)) return
                          const next = deleteUserFromDb(u.id)
                          setDb(next)
                          push({ title: 'User deleted', message: u.name, variant: 'success' })
                        }}
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-white/60" colSpan={7}>
                    No {tabLabel.toLowerCase()} yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={mode === 'add' ? (tab === 'student' ? 'Add Student' : 'Add Teacher') : 'Edit User'}
        wide
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-1">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold">Profile Photo</div>
              <div className="mt-1 text-xs text-white/60">Take photo or upload</div>

              <div className="mt-4">
                <div className="relative aspect-video overflow-hidden rounded-2xl bg-black/40 ring-1 ring-white/10">
                  {photoPick === 'camera' ? (
                    <video ref={videoRef} className="h-full w-full object-cover" autoPlay muted playsInline style={{ transform: 'scaleX(-1)' }} />
                  ) : photoDataURL ? (
                    <img src={photoDataURL} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-white/60">No photo</div>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="btn-ghost" onClick={() => setPhotoPick('camera')}>
                  <Camera className="h-4 w-4" /> Take Photo
                </button>
                <label className="btn-ghost cursor-pointer">
                  <ImageUp className="h-4 w-4" /> Upload Photo
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      const url = await fileToDataUrl(f)
                      setPhotoDataURL(url)
                      setPhotoPick('upload')
                      e.target.value = ''
                    }}
                  />
                </label>
                {photoPick === 'camera' ? (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      const b64 = captureBase64(videoRef.current)
                      if (!b64) {
                        push({ title: 'Capture failed', message: 'No camera frame available', variant: 'error' })
                        return
                      }
                      setPhotoDataURL(b64)
                      setPhotoPick('none')
                      push({ title: 'Photo captured', message: 'Preview updated', variant: 'success' })
                    }}
                  >
                    Capture
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-4 lg:col-span-2">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Full Name (required)">
                <input
                  value={form.fullName}
                  onChange={(e) => setForm((s) => ({ ...s, fullName: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-[rgba(0,255,136,0.35)]"
                />
              </Field>
              <Field label={`${tab === 'student' ? 'Student ID' : 'Teacher ID'} (required)`}>
                <input
                  value={form.loginId}
                  onChange={(e) => setForm((s) => ({ ...s, loginId: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-[rgba(0,255,136,0.35)]"
                />
              </Field>

              <Field label="Password (required for new user)">
                <input
                  value={form.password}
                  onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                  type="password"
                  className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-[rgba(0,255,136,0.35)]"
                />
              </Field>
              <Field label="Confirm Password (required for new user)">
                <input
                  value={form.confirmPassword}
                  onChange={(e) => setForm((s) => ({ ...s, confirmPassword: e.target.value }))}
                  type="password"
                  className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-[rgba(0,255,136,0.35)]"
                />
              </Field>

              <Field label="Department">
                <select
                  value={form.department}
                  onChange={(e) => setForm((s) => ({ ...s, department: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white/85 outline-none"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>

              {tab === 'student' ? (
                <Field label="Class/Section (e.g. CSE-A)">
                  <input
                    value={form.section}
                    onChange={(e) => setForm((s) => ({ ...s, section: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-[rgba(0,255,136,0.35)]"
                  />
                </Field>
              ) : (
                <Field label="Subjects Taught (comma separated)">
                  <input
                    value={form.subjects}
                    onChange={(e) => setForm((s) => ({ ...s, subjects: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-[rgba(0,255,136,0.35)]"
                  />
                </Field>
              )}

              <Field label="Phone Number">
                <input
                  value={form.phone}
                  onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-[rgba(0,255,136,0.35)]"
                />
              </Field>
              <Field label="Email">
                <input
                  value={form.email}
                  onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-[rgba(0,255,136,0.35)]"
                />
              </Field>

              {tab === 'student' ? (
                <Field label="Date of Birth">
                  <input
                    value={form.dob}
                    onChange={(e) => setForm((s) => ({ ...s, dob: e.target.value }))}
                    type="date"
                    className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-[rgba(0,255,136,0.35)]"
                  />
                </Field>
              ) : (
                <div />
              )}

              {tab === 'student' ? (
                <Field label="Parent Name">
                  <input
                    value={form.parentName}
                    onChange={(e) => setForm((s) => ({ ...s, parentName: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-[rgba(0,255,136,0.35)]"
                  />
                </Field>
              ) : (
                <div />
              )}

              {tab === 'student' ? (
                <Field label="Parent Phone Number">
                  <input
                    value={form.parentPhone}
                    onChange={(e) => setForm((s) => ({ ...s, parentPhone: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-[rgba(0,255,136,0.35)]"
                  />
                </Field>
              ) : (
                <div />
              )}
            </div>

            {tab === 'student' ? (
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                  <span className="text-white/80">Notify Parent on attendance</span>
                  <input
                    type="checkbox"
                    checked={form.notifyParent}
                    onChange={(e) => setForm((s) => ({ ...s, notifyParent: e.target.checked }))}
                    className="h-4 w-4 accent-[color:var(--verifai-cyan)]"
                  />
                </label>
                <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                  <span className="text-white/80">WhatsApp Notifications</span>
                  <input
                    type="checkbox"
                    checked={!form.optedOut}
                    onChange={(e) => setForm((s) => ({ ...s, optedOut: !e.target.checked }))}
                    className="h-4 w-4 accent-[color:var(--verifai-cyan)]"
                  />
                </label>
              </div>
            ) : null}

            <button type="button" className={cn('btn-primary w-full', saving && 'opacity-60')} disabled={saving} onClick={saveUser}>
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null} Save
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title={`Reset Password — ${resetUser?.name ?? ''}`}
      >
        <div className="space-y-3">
          <Field label="New password">
            <input
              value={resetPw}
              onChange={(e) => setResetPw(e.target.value)}
              type="password"
              className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-[rgba(0,255,136,0.35)]"
            />
          </Field>
          <button
            type="button"
            className={cn('btn-primary w-full', !resetPw.trim() && 'opacity-60')}
            disabled={!resetPw.trim()}
            onClick={() => {
              updateUserInDb(resetUser.id, { password: resetPw })
              setDb(loadUsersDb())
              push({ title: 'Saved successfully', message: 'Password updated', variant: 'success' })
              setResetOpen(false)
            }}
          >
            Save new password
          </button>
        </div>
      </Modal>

      <Modal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        title="User Profile"
        wide
      >
        {profileUser ? (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-1">
              <div className="h-[260px] w-full overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10">
                {profileUser.photoDataURL ? <img src={profileUser.photoDataURL} alt={profileUser.name} className="h-full w-full object-cover" /> : null}
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs text-white/60">Name</div>
                  <div className="mt-1 text-sm font-semibold">{profileUser.name}</div>
                </div>
                <div>
                  <div className="text-xs text-white/60">Role</div>
                  <div className="mt-1 text-sm font-semibold">{profileUser.role}</div>
                </div>
                <div>
                  <div className="text-xs text-white/60">Username</div>
                  <div className="mt-1 text-sm font-semibold">{profileUser.username}</div>
                </div>
                <div>
                  <div className="text-xs text-white/60">Department</div>
                  <div className="mt-1 text-sm font-semibold">{profileUser.department}</div>
                </div>
                <div>
                  <div className="text-xs text-white/60">{profileUser.role === 'student' ? 'Section' : 'Subjects'}</div>
                  <div className="mt-1 text-sm font-semibold">
                    {profileUser.role === 'student' ? profileUser.section || '—' : (profileUser.subjects || []).join(', ') || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-white/60">Phone</div>
                  <div className="mt-1 text-sm font-semibold">{profileUser.phone || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-white/60">Email</div>
                  <div className="mt-1 text-sm font-semibold">{profileUser.email || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-white/60">DOB</div>
                  <div className="mt-1 text-sm font-semibold">{profileUser.dob || '—'}</div>
                </div>
              </div>
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/65">
                Face descriptor: {Array.isArray(profileUser.faceDescriptor) ? <span className="text-[color:var(--verifai-green)]">stored</span> : <span>not available</span>}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

