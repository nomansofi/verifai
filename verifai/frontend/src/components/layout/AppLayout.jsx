import { createContext, useMemo, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../Sidebar.jsx'
import Navbar from '../Navbar.jsx'

const TitleCtx = createContext(null)

export default function AppLayout() {
  const [title, setTitle] = useState('Dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const value = useMemo(() => ({ title, setTitle }), [title])

  return (
    <TitleCtx.Provider value={value}>
      <div className="min-h-dvh bg-[color:var(--verifai-bg)]">
        <div className="pointer-events-none fixed inset-0 opacity-40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,255,136,0.18),transparent_40%),radial-gradient(circle_at_70%_30%,rgba(0,212,255,0.14),transparent_42%),radial-gradient(circle_at_50%_80%,rgba(0,255,136,0.08),transparent_45%)]" />
        </div>

        <div className="relative mx-auto grid w-full max-w-[1400px] grid-cols-[auto_1fr] gap-4 px-4 py-4">
          <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

          <div className="min-w-0">
            <Navbar
              title={title}
              sidebarCollapsed={sidebarCollapsed}
              onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
            />
            <main className="mt-4 min-w-0">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </TitleCtx.Provider>
  )
}

