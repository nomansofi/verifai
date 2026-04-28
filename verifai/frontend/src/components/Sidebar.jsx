import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  Camera,
  DoorOpen,
  LayoutDashboard,
  Settings,
  Users,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '../lib/cn.js'

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/scan', label: 'Face Scan', icon: Camera },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/attendance', label: 'Attendance', icon: ClipboardList },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/access', label: 'Access Control', icon: DoorOpen },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ collapsed, setCollapsed }) {
  return (
    <aside
      className={cn(
        'glass neon-ring sticky top-4 h-[calc(100dvh-2rem)] w-[270px] overflow-hidden',
        'flex flex-col',
        collapsed && 'w-[78px]',
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4">
        <div className={cn('min-w-0', collapsed && 'opacity-0')}>
          <div className="text-lg font-semibold leading-none">
            <span className="neon-text">VERIFAI</span>
          </div>
          <div className="mt-1 text-[11px] text-white/60">Smarter Tracking. Stronger Future.</div>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/70 hover:bg-white/10 hover:text-white"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {nav.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-[rgba(0,255,136,0.12)] text-white ring-1 ring-[rgba(0,255,136,0.35)]'
                    : 'text-white/75 hover:bg-white/5 hover:text-white',
                )
              }
            >
              <Icon className="h-[18px] w-[18px] text-[color:var(--verifai-cyan)] opacity-90 group-hover:opacity-100" />
              <span className={cn('truncate', collapsed && 'hidden')}>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className={cn('rounded-xl bg-white/5 px-3 py-2 text-xs text-white/70', collapsed && 'hidden')}>
          <div className="font-semibold text-white/85">Status</div>
          <div className="mt-1 flex items-center justify-between">
            <span>API</span>
            <span className="text-[color:var(--verifai-green)]">Mock-ready</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

