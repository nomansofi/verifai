import { useMemo, useState } from 'react'
import { Eye, EyeOff, ArrowLeft, LoaderCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { cn } from '../lib/cn.js'
import { login, MASTER_ADMIN } from '../lib/auth.js'
import { useToast } from '../components/toastContext.js'

const ROLES = [
  { key: 'admin', title: 'Admin', emoji: '🛡️', desc: 'Full system control', glow: 'ring-purple-500/30', tint: 'bg-purple-500/10 text-purple-200' },
  { key: 'teacher', title: 'Teacher', emoji: '👨‍🏫', desc: 'Manage classes & attendance', glow: 'ring-[rgba(0,255,136,0.35)]', tint: 'bg-[rgba(0,255,136,0.14)] text-[color:var(--verifai-green)]' },
  { key: 'student', title: 'Student', emoji: '🎓', desc: 'View your attendance', glow: 'ring-[rgba(0,212,255,0.35)]', tint: 'bg-[rgba(0,212,255,0.14)] text-[color:var(--verifai-cyan)]' },
]

function placeholder(role) {
  if (role === 'admin') return 'Admin Username'
  if (role === 'teacher') return 'Teacher ID (e.g. T-1001)'
  return 'Student ID (e.g. S-1001)'
}

function redirectForRole(role) {
  if (role === 'admin') return '/dashboard'
  if (role === 'teacher') return '/teacher-dashboard'
  return '/student-dashboard'
}

export default function LoginPage() {
  const nav = useNavigate()
  const { push } = useToast()
  const [selected, setSelected] = useState(null) // role key
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const roleMeta = useMemo(() => ROLES.find((r) => r.key === selected) ?? null, [selected])
  const canSubmit = useMemo(() => username.trim() && password, [username, password])

  return (
    <div className="relative min-h-dvh bg-[color:var(--verifai-bg)] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,255,136,0.18),transparent_40%),radial-gradient(circle_at_70%_30%,rgba(0,212,255,0.14),transparent_42%),radial-gradient(circle_at_50%_80%,rgba(0,255,136,0.08),transparent_45%)]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-[1200px] flex-col px-6 py-10">
        <div className="text-center">
          <div className="text-4xl font-semibold tracking-tight">
            <span className="neon-text">VerifAi</span>
          </div>
          <div className="mt-2 text-sm text-white/70">Where Intelligence Confirms Presence.</div>
          <div className="mt-6 text-sm font-semibold text-white/85">Select your role to continue</div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {ROLES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => {
                setSelected(r.key)
                setUsername('')
                setPassword('')
                setError('')
              }}
              className={cn(
                'glass group relative p-6 text-left transition',
                'hover:scale-[1.01] hover:bg-white/7',
                'ring-1',
                r.glow,
              )}
            >
              <div className="text-3xl">{r.emoji}</div>
              <div className="mt-3 text-lg font-semibold">{r.title}</div>
              <div className="mt-1 text-sm text-white/60">{r.desc}</div>
              <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                <div className="absolute inset-0 rounded-2xl shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_0_40px_rgba(0,255,136,0.12)]" />
              </div>
            </button>
          ))}
        </div>

        <AnimatePresence>
          {selected ? (
            <motion.div
              key="login-form"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.35 }}
              className="mt-8 flex justify-center"
            >
              <div className="glass neon-ring w-full max-w-[520px] p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-white/10', roleMeta?.tint)}>
                    <span>{roleMeta?.emoji}</span>
                    <span>{roleMeta?.title}</span>
                  </div>
                  <button
                    type="button"
                    className="btn-ghost !px-3 !py-2"
                    onClick={() => {
                      setSelected(null)
                      setError('')
                    }}
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                </div>

                <div className="mt-5 grid gap-3">
                  <label className="text-xs text-white/60">
                    Username
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={placeholder(selected)}
                      className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-[rgba(0,255,136,0.35)]"
                    />
                  </label>

                  <label className="text-xs text-white/60">
                    Password
                    <div className="mt-1 flex h-11 items-center rounded-xl border border-white/10 bg-white/5 px-3 focus-within:ring-2 focus-within:ring-[rgba(0,255,136,0.35)]">
                      <input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        type={showPw ? 'text' : 'password'}
                        className="h-full flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
                      />
                      <button type="button" className="text-white/65 hover:text-white" onClick={() => setShowPw((v) => !v)} aria-label="Toggle password visibility">
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </label>

                  {selected === 'admin' ? (
                    <div className="text-xs text-white/55">
                      Hint: Default: <span className="text-white/80 font-semibold">{MASTER_ADMIN.username}</span> /{' '}
                      <span className="text-white/80 font-semibold">{MASTER_ADMIN.password}</span>
                    </div>
                  ) : (
                    <div className="text-xs text-white/55">Hint: Use credentials set by your Admin</div>
                  )}

                  {error ? <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div> : null}

                  <button
                    type="button"
                    disabled={!canSubmit || loading}
                    className={cn('btn-primary mt-2 w-full', (!canSubmit || loading) && 'opacity-60')}
                    onClick={async () => {
                      setLoading(true)
                      setError('')
                      try {
                        const res = login({ role: selected, username, password })
                        if (!res.ok) {
                          setError(res.message)
                          push({ title: 'Login failed', message: res.message, variant: 'error' })
                          return
                        }
                        nav(redirectForRole(selected))
                      } finally {
                        setLoading(false)
                      }
                    }}
                  >
                    {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                    Login
                  </button>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}

