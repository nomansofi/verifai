import { useEffect, useState } from 'react'
import ChatBotWindow from './ChatBotWindow.jsx'
import { getCurrentUser } from '../lib/usersDb.js'

export default function FloatingChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [hasUnread, setHasUnread] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const tick = () => {
      const u = getCurrentUser()
      setIsAdmin(u?.role === 'admin')
    }
    tick()
    const t = window.setInterval(tick, 1200)
    return () => window.clearInterval(t)
  }, [])

  if (!isAdmin) return null

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true)
          setHasUnread(false)
        }}
        style={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
          border: 'none',
          cursor: 'pointer',
          display: isOpen ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 30px rgba(0,255,136,0.4)',
          zIndex: 1000,
          animation: 'pulse 2s infinite',
        }}
      >
        <span style={{ fontSize: 26 }}>🤖</span>
        {hasUnread ? (
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              color: '#fff',
              fontWeight: 700,
            }}
          >
            1
          </div>
        ) : null}
      </button>

      {isOpen ? <ChatBotWindow onClose={() => setIsOpen(false)} /> : null}
    </>
  )
}

