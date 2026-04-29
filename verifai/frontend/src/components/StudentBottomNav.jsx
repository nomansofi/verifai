import { useLocation, useNavigate } from 'react-router-dom'

const TABS = [
  { to: '/student-dashboard', label: 'Home', icon: '🏠' },
  { to: '/student-dashboard#my-attendance', label: 'Attendance', icon: '📅' },
  { to: '/student-qr', label: 'QR Scan', icon: '📱' },
  { to: '/appeals', label: 'Appeals', icon: '📝' },
  { to: '/student-profile', label: 'Profile', icon: '👤' },
]

export default function StudentBottomNav() {
  const nav = useNavigate()
  const location = useLocation()

  const isActive = (to) => {
    if (to.includes('#')) {
      return location.pathname === '/student-dashboard' && location.hash === '#my-attendance'
    }
    return location.pathname === to
  }

  return (
    <nav className="student-bottom-nav">
      <div className="student-bottom-nav-inner">
        {TABS.map((t) => {
          const active = isActive(t.to)
          return (
            <button
              key={t.to}
              type="button"
              onClick={() => nav(t.to)}
              className="student-bottom-nav-item"
            >
              <span className="text-[22px] leading-none">{t.icon}</span>
              <span className="text-[10px] leading-none" style={{ color: active ? 'var(--verifai-cyan)' : '#6b7280', fontWeight: active ? 700 : 500 }}>
                {t.label}
              </span>
              {active ? <span className="h-1 w-1 rounded-full bg-[color:var(--verifai-cyan)]" /> : <span className="h-1 w-1" />}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

