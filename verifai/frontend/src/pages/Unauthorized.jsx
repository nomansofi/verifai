import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser } from '../lib/usersDb.js'

export default function Unauthorized() {
  const nav = useNavigate()
  const user = getCurrentUser()

  const target = useMemo(() => {
    if (!user) return '/'
    if (user.role === 'admin') return '/dashboard'
    if (user.role === 'teacher') return '/teacher-dashboard'
    if (user.role === 'student') return '/student-dashboard'
    return '/'
  }, [user])

  return (
    <div className="min-h-dvh bg-[color:var(--verifai-bg)] text-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-[900px] items-center justify-center px-6">
        <div className="glass neon-ring w-full max-w-[520px] p-8 text-center">
          <div className="text-5xl">🚫</div>
          <div className="mt-4 text-xl font-semibold">Access Denied</div>
          <div className="mt-2 text-sm text-white/60">You don&apos;t have permission to view this page.</div>
          <button type="button" className="btn-primary mt-6 w-full" onClick={() => nav(target)}>
            Go to My Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
