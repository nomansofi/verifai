import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { cn } from '../lib/cn.js'

const KEY = 'verifai_session'

export default function Login() {
  const nav = useNavigate()
  const [role, setRole] = useState('Student')
  const [userId, setUserId] = useState('')
  const [name, setName] = useState('')

  const canSubmit = useMemo(() => userId.trim() && name.trim(), [userId, name])

  return (
    <div className="min-h-dvh bg-[color:var(--verifai-bg)] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,255,136,0.18),transparent_40%),radial-gradient(circle_at_70%_30%,rgba(0,212,255,0.14),transparent_42%),radial-gradient(circle_at_50%_80%,rgba(0,255,136,0.08),transparent_45%)]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-[980px] flex-col gap-6 px-6 py-10">
        <header className="flex items-center justify-between gap-3">
          <Link to="/" className="text-lg font-semibold">
            <span className="neon-text">VerifAi</span>
          </Link>
          <Link to="/" className="btn-ghost">
            Back to home
          </Link>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="glass neon-ring p-6">
            <div className="text-sm font-semibold">Login</div>
            <div className="mt-1 text-xs text-white/60">Students and employees can sign in (demo local session)</div>

            <div className="mt-5">
              <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
                {['Student', 'Employee'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                      role === r ? 'bg-[rgba(0,255,136,0.16)] text-white ring-1 ring-[rgba(0,255,136,0.35)]' : 'text-white/70 hover:bg-white/10 hover:text-white',
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <label className="text-xs text-white/60">
                ID
                <input
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder={role === 'Student' ? 'S-1001' : 'E-2001'}
                  className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-[rgba(0,255,136,0.35)]"
                />
              </label>

              <label className="text-xs text-white/60">
                Name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-[rgba(0,255,136,0.35)]"
                />
              </label>

              <button
                type="button"
                disabled={!canSubmit}
                className={cn('btn-primary w-full', !canSubmit && 'opacity-60')}
                onClick={() => {
                  localStorage.setItem(KEY, JSON.stringify({ role, id: userId.trim(), name: name.trim(), ts: new Date().toISOString() }))
                  nav('/dashboard')
                }}
              >
                Continue
              </button>
            </div>
          </div>

          <div className="glass p-6">
            <div className="text-sm font-semibold">Admin?</div>
            <div className="mt-1 text-xs text-white/60">
              Admin features (enrollment, scanning, exports) live inside the dashboard experience.
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/dashboard" className="btn-ghost">
                Open dashboard
              </Link>
              <Link to="/users" className="btn-ghost">
                Enroll users
              </Link>
              <Link to="/scan" className="btn-ghost">
                Face scan
              </Link>
            </div>
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/65">
              Note: This login is a lightweight demo stored in <code className="text-white/80">localStorage</code>. Wire it to
              real auth (Firebase/Supabase) when you’re ready.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

