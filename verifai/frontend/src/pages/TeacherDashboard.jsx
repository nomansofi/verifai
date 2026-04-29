import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, ClipboardList, BarChart3 } from 'lucide-react'
import { usePageTitle } from '../components/layout/pageTitleContext.js'
import { getCurrentUser, loadUsersDb } from '../lib/usersDb.js'

function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?'
}

function pctFromRecords(records) {
  const arr = Array.isArray(records) ? records : []
  const present = arr.filter((r) => r.status === 'present').length
  return Math.round((present / Math.max(arr.length, 1)) * 100)
}

export default function TeacherDashboard() {
  const nav = useNavigate()
  const { setTitle } = usePageTitle()

  useEffect(() => setTitle('Teacher Dashboard'), [setTitle])

  useEffect(() => {
    if (window.location.hash === '#my-students') {
      window.setTimeout(() => {
        document.getElementById('my-students')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
    }
  }, [])

  const derived = useMemo(() => {
    const current = getCurrentUser()
    const db = loadUsersDb()
    const teacher = db.find((u) => u.id === current?.id) ?? null
    const dept = teacher?.department
    const myStudents = dept ? db.filter((u) => u.role === 'student' && u.department === dept) : []

    const todayKey = new Date().toDateString()
    const presentToday = myStudents.filter((s) => (s.attendanceRecords || []).some((r) => r.date === todayKey && r.status === 'present')).length
    const absentToday = Math.max(0, myStudents.length - presentToday)
    const avgAttendance = myStudents.length ? Math.round(myStudents.reduce((sum, s) => sum + pctFromRecords(s.attendanceRecords), 0) / myStudents.length) : 0

    return { teacher, myStudents, presentToday, absentToday, avgAttendance }
  }, [])

  const t = derived.teacher

  return (
    <div className="space-y-4">
      <div className="glass neon-ring p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
              {t?.photoDataURL ? (
                <img src={t.photoDataURL} alt={t.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white/80">{initials(t?.name)}</div>
              )}
            </div>
            <div>
              <div className="text-sm font-semibold">{t?.name ?? 'Teacher'}</div>
              <div className="mt-0.5 text-xs text-white/60">
                {t?.department ?? '—'} • {(Array.isArray(t?.subjects) ? t.subjects.join(', ') : t?.subjects) || '—'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={() => nav('/scan')}>
              <Camera className="h-4 w-4" /> Start Face Scan
            </button>
            <button type="button" className="btn-ghost" onClick={() => nav('/attendance')}>
              <ClipboardList className="h-4 w-4" /> Attendance Sheet
            </button>
            <button type="button" className="btn-ghost" onClick={() => nav('/analytics')}>
              <BarChart3 className="h-4 w-4" /> Analytics
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="glass p-5">
          <div className="text-xs text-white/60">Total Students</div>
          <div className="mt-2 text-2xl font-semibold">{derived.myStudents.length}</div>
        </div>
        <div className="glass p-5">
          <div className="text-xs text-white/60">Present Today</div>
          <div className="mt-2 text-2xl font-semibold text-[color:var(--verifai-green)]">{derived.presentToday}</div>
        </div>
        <div className="glass p-5">
          <div className="text-xs text-white/60">Absent Today</div>
          <div className="mt-2 text-2xl font-semibold text-red-300">{derived.absentToday}</div>
        </div>
        <div className="glass p-5">
          <div className="text-xs text-white/60">Avg Attendance %</div>
          <div className="mt-2 text-2xl font-semibold">{derived.avgAttendance}%</div>
        </div>
      </div>

      <div className="glass overflow-hidden">
        <div className="border-b border-white/10 px-4 py-3">
          <div className="text-sm font-semibold">My Students</div>
          <div className="mt-0.5 text-xs text-white/60">{derived.myStudents.length} students</div>
        </div>
        <div id="my-students" className="overflow-auto">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-white/5 text-xs text-white/60">
              <tr>
                <th className="px-4 py-3 font-medium">Photo</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Section</th>
                <th className="px-4 py-3 font-medium">Attendance %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {derived.myStudents.map((s) => (
                <tr key={s.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="h-9 w-9 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
                      {s.photoDataURL ? (
                        <img src={s.photoDataURL} alt={s.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-white/80">
                          {initials(s.name)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-white/80">{s.username}</td>
                  <td className="px-4 py-3 text-white/80">{s.section || '—'}</td>
                  <td className="px-4 py-3 text-white/80">{pctFromRecords(s.attendanceRecords)}%</td>
                </tr>
              ))}
              {derived.myStudents.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-white/60" colSpan={5}>
                    No students found for your department.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

