import { useEffect, useMemo, useState } from 'react'
import { Outlet } from 'react-router-dom'
import RoleSidebar from '../RoleSidebar.jsx'
import TopNavbar from '../TopNavbar.jsx'
import { PageTitleCtx } from './pageTitleContext.js'
import { getCurrentUser } from '../../lib/usersDb.js'
import { getUiPrefs } from '../../lib/verifaiDb.js'
import StudentBottomNav from '../StudentBottomNav.jsx'

export default function RoleLayout() {
  const [title, setTitle] = useState('Dashboard')
  const value = useMemo(() => ({ title, setTitle }), [title])
  const [mobileStudent, setMobileStudent] = useState(false)

  useEffect(() => {
    const tick = () => {
      const u = getCurrentUser()
      const prefs = getUiPrefs()
      setMobileStudent(Boolean(u?.role === 'student' && prefs?.studentMobileView))
    }
    tick()
    const t = window.setInterval(tick, 800)
    return () => window.clearInterval(t)
  }, [])

  return (
    <PageTitleCtx.Provider value={value}>
      <div className="min-h-dvh bg-[color:var(--verifai-bg)]">
        <div className="pointer-events-none fixed inset-0 opacity-40">
          <div className="absolute inset-0 verifai-bgfx" />
        </div>

        {mobileStudent ? (
          <div className="student-app-shell">
            <TopNavbar title={title} studentApp />
            <main className="student-app-content">
              <Outlet />
            </main>
            <StudentBottomNav />
          </div>
        ) : (
          <div className="relative mx-auto grid w-full max-w-[1400px] grid-cols-[auto_1fr] gap-4 px-4 py-4">
            <RoleSidebar />
            <div className="min-w-0">
              <TopNavbar title={title} />
              <main className="mt-4 min-w-0">
                <Outlet />
              </main>
            </div>
          </div>
        )}
      </div>
    </PageTitleCtx.Provider>
  )
}

