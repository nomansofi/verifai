import { useEffect, useMemo, useState } from 'react'
import { Bell, PanelLeft, Shield } from 'lucide-react'
import { cn } from '../lib/cn.js'

function formatNow(d) {
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Navbar({ title, onToggleSidebar, sidebarCollapsed }) {
  const [now, setNow] = useState(() => new Date())
  const [notifCount] = useState(3)

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(t)
  }, [])

  const nowText = useMemo(() => formatNow(now), [now])

  return (
    <header className="glass neon-ring flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/70 hover:bg-white/10 hover:text-white"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-white">{title}</div>
          <div className="text-xs text-white/60">{nowText}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 md:flex">
          <Shield className="h-4 w-4 text-[color:var(--verifai-green)]" />
          <span className="text-white/80">Secure mode</span>
        </div>

        <button
          type="button"
          className="relative rounded-xl border border-white/10 bg-white/5 p-2 text-white/70 hover:bg-white/10 hover:text-white"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {notifCount > 0 ? (
            <span
              className={cn(
                'absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold text-black',
                'bg-[color:var(--verifai-cyan)]',
              )}
            >
              {notifCount}
            </span>
          ) : null}
        </button>

        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <div className="h-8 w-8 rounded-full bg-[linear-gradient(135deg,var(--verifai-green),var(--verifai-cyan))] p-[1px]">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-black/70 text-xs font-semibold text-white">
              A
            </div>
          </div>
          <div className="hidden md:block">
            <div className="text-xs font-semibold leading-none">Admin</div>
            <div className="mt-0.5 text-[11px] text-white/60">verifai@local</div>
          </div>
        </div>
      </div>
    </header>
  )
}

