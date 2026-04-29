import { useMemo, useState } from 'react'
import { Bell, LogOut, Moon, Sun } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../lib/cn.js'
import { getCurrentUser } from '../lib/usersDb.js'
import { logout } from '../lib/auth.js'
import { getEffectiveTheme, setTheme } from '../lib/theme.js'

function rolePill(role) {
  if (role === 'admin') return { label: 'ADMIN', cls: 'bg-purple-500/10 text-purple-200 ring-purple-500/20' }
  if (role === 'teacher') return { label: 'TEACHER', cls: 'bg-[rgba(0,255,136,0.14)] text-[color:var(--verifai-green)] ring-[rgba(0,255,136,0.25)]' }
  return { label: 'STUDENT', cls: 'bg-[rgba(0,212,255,0.14)] text-[color:var(--verifai-cyan)] ring-[rgba(0,212,255,0.22)]' }
}

function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?'
}

export default function TopNavbar({ title, studentApp = false }) {
  const nav = useNavigate()
  const user = getCurrentUser()
  const pill = useMemo(() => rolePill(user?.role), [user?.role])
  const [theme, setThemeState] = useState(() => getEffectiveTheme())

  if (studentApp && user?.role === 'student') {
    return (
      <header className="student-top-bar">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 overflow-hidden rounded-lg bg-white/5 ring-1 ring-white/10">
            <img src="/verifai-logo.png" alt="VerifAi logo" className="h-full w-full object-contain" />
          </div>
          <span className="text-[16px] font-bold tracking-wide">VerifAI</span>
          <span className="rounded-full bg-[rgba(0,212,255,0.15)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--verifai-cyan)]">
            STUDENT
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" className="student-icon-btn" aria-label="Notifications">
            <Bell className="h-5 w-5" />
          </button>
          <div className="h-9 w-9 overflow-hidden rounded-full ring-2 ring-[color:var(--verifai-cyan)]">
            {user?.photoDataURL ? (
              <img src={user.photoDataURL} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#00ff88,#00d4ff)] text-sm font-bold text-black">
                {initials(user?.name)}
              </div>
            )}
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="glass neon-ring flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10">
            <img src="/verifai-logo.png" alt="VerifAi logo" className="h-full w-full object-contain" />
          </div>
          <div className="text-sm font-semibold">
            <span className="neon-text">VerifAi</span>
          </div>
        </div>
      </div>

      <div className="min-w-0 text-center">
        <div className="truncate text-sm font-semibold">{title}</div>
      </div>

      <div className="flex items-center gap-2">
        {user?.role ? (
          <span className={cn('rounded-full px-2 py-1 text-[11px] font-semibold ring-1', pill.cls)}>{pill.label}</span>
        ) : null}

        <button
          type="button"
          className="btn-ghost !p-2"
          aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
          onClick={() => {
            const next = theme === 'light' ? 'dark' : 'light'
            setThemeState(next)
            setTheme(next)
          }}
        >
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>

        <div className="hidden items-center gap-2 rounded-xl border border-[color:var(--verifai-border)] bg-[color:var(--verifai-card)]/70 px-3 py-2 md:flex">
          <div className="h-7 w-7 overflow-hidden rounded-full bg-[color:var(--verifai-bg)] ring-1 ring-[color:var(--verifai-border)]">
            {user?.photoDataURL ? (
              <img src={user.photoDataURL} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold">{initials(user?.name)}</div>
            )}
          </div>
          <div className="text-xs font-semibold">{user?.name ?? 'User'}</div>
        </div>

        <button type="button" className="btn-ghost !p-2" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </button>

        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            logout()
            nav('/')
          }}
        >
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </div>
    </header>
  )
}

