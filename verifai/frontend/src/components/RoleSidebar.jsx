import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { LayoutDashboard, Camera, ClipboardList, BarChart3, Users, Settings, DoorOpen, LogOut, UserRound, Bell, MessageSquareText, QrCode, FileText, CalendarDays, Brain, FileBarChart2 } from 'lucide-react'
import { cn } from '../lib/cn.js'
import { logout } from '../lib/auth.js'
import { getCurrentUser } from '../lib/usersDb.js'
import { listAppeals } from '../lib/verifaiDb.js'

const ADMIN_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/scan', label: 'Face Scan', icon: Camera },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/attendance', label: 'Attendance', icon: ClipboardList },
  { to: '/events', label: 'Events & Conferences', icon: CalendarDays },
  { to: '/exams', label: 'Exams & Assessments', icon: Brain },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/reports', label: 'Reports', icon: FileBarChart2 },
  { to: '/access', label: 'Access Control', icon: DoorOpen },
  { to: '/whatsapp-logs', label: 'Telegram Logs', icon: MessageSquareText },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/timetable', label: 'Timetable', icon: CalendarDays },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const TEACHER_NAV = [
  { to: '/teacher-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/scan', label: 'Face Scan', icon: Camera },
  { to: '/attendance', label: 'Attendance', icon: ClipboardList },
  { to: '/exams', label: 'Exams & Assessments', icon: Brain },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/appeals', label: 'Review Appeals', icon: FileText, badgeKey: 'appeals' },
  { to: '/teacher-dashboard#my-students', label: 'My Students', icon: Users },
]

const STUDENT_NAV = [
  { to: '/student-dashboard', label: 'My Dashboard', icon: LayoutDashboard },
  { to: '/student-dashboard#my-attendance', label: 'My Attendance', icon: ClipboardList },
  { to: '/student-qr', label: 'Scan QR', icon: QrCode },
  { to: '/appeals', label: 'My Appeals', icon: FileText },
  { to: '/student-profile', label: 'My Profile', icon: UserRound },
  { to: '/student-dashboard#notifications', label: 'Notifications', icon: Bell },
]

function navFor(role) {
  if (role === 'teacher') return TEACHER_NAV
  if (role === 'student') return STUDENT_NAV
  return ADMIN_NAV
}

export default function RoleSidebar() {
  const nav = useNavigate()
  const user = getCurrentUser()
  const [appealsBadge, setAppealsBadge] = useState(0)
  useEffect(() => {
    if (user?.role !== 'teacher') return
    const tick = () => {
      const dept = user?.department
      const list = listAppeals()
      const pending = list.filter((a) => a.status === 'pending' && (!dept || a.department === dept)).length
      setAppealsBadge(pending)
    }
    tick()
    const t = window.setInterval(tick, 2000)
    return () => window.clearInterval(t)
  }, [user?.role, user?.department])

  const items = navFor(user?.role)
  const badgeFor = useMemo(() => ({ appeals: appealsBadge }), [appealsBadge])

  return (
    <aside className="glass neon-ring sticky top-4 h-[calc(100dvh-2rem)] w-[270px] overflow-hidden">
      <div className="border-b border-white/10 px-4 py-4">
        <div className="text-lg font-semibold leading-none">
          <span className="neon-text">VerifAi</span>
        </div>
        <div className="mt-1 text-[11px] text-white/60">Where Intelligence Confirms Presence.</div>
      </div>

      <nav className="space-y-1 p-2">
        {items.map((item) => {
          const Icon = item.icon
          const badge = item.badgeKey ? badgeFor[item.badgeKey] : 0
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-xl border-l-2 border-transparent px-3 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'border-l-[color:var(--verifai-cyan)] bg-[rgba(0,212,255,0.14)] text-white ring-1 ring-[rgba(0,212,255,0.28)]'
                    : 'text-white/75 hover:border-l-[rgba(0,212,255,0.35)] hover:bg-white/5 hover:text-white',
                )
              }
            >
              <Icon className="h-[18px] w-[18px] text-[color:var(--verifai-cyan)] opacity-90 group-hover:opacity-100" />
              <span className="truncate">{item.label}</span>
              {badge ? (
                <span className="ml-auto rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-200 ring-1 ring-red-500/20">
                  {badge}
                </span>
              ) : null}
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          className="btn-ghost w-full justify-start"
          onClick={() => {
            logout()
            nav('/')
          }}
        >
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </div>
    </aside>
  )
}

