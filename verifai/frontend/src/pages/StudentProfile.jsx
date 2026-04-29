import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePageTitle } from '../components/layout/pageTitleContext.js'
import { getCurrentUser, loadUsersDb } from '../lib/usersDb.js'
import { logout } from '../lib/auth.js'

function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?'
}

export default function StudentProfile() {
  const nav = useNavigate()
  const { setTitle } = usePageTitle()
  useEffect(() => setTitle('Student Profile'), [setTitle])

  const student = useMemo(() => {
    const current = getCurrentUser()
    const db = loadUsersDb()
    return db.find((u) => u.id === current?.id) ?? null
  }, [])

  return (
    <div style={{ padding: '12px 16px 12px' }}>
      <button
        type="button"
        onClick={() => nav('/student-dashboard')}
        style={{ background: 'none', border: 'none', color: '#00d4ff', fontSize: 14, padding: '8px 0', display: 'flex', alignItems: 'center', gap: 6 }}
      >
        ← Back to Home
      </button>

      <div style={{ textAlign: 'center', padding: '24px 0 20px' }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          {student?.photoDataURL ? (
            <img
              src={student.photoDataURL}
              alt={student.name}
              style={{ width: 110, height: 110, borderRadius: '50%', objectFit: 'cover', border: '4px solid #00ff88', boxShadow: '0 0 30px rgba(0,255,136,0.3)' }}
            />
          ) : (
            <div
              style={{
                width: 110,
                height: 110,
                borderRadius: '50%',
                border: '4px solid #00ff88',
                boxShadow: '0 0 30px rgba(0,255,136,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#1a1d2e',
                color: '#fff',
                fontSize: 30,
                fontWeight: 700,
              }}
            >
              {initials(student?.name)}
            </div>
          )}
          <div
            style={{
              position: 'absolute',
              bottom: 4,
              right: 4,
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: '#00ff88',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              color: '#111827',
            }}
          >
            ✓
          </div>
        </div>
        <h2 style={{ color: '#fff', margin: '12px 0 4px', fontSize: 22 }}>{student?.name ?? 'Student'}</h2>
        <p style={{ color: '#9ca3af', margin: 0, fontSize: 14 }}>
          {student?.username ?? '—'} • {student?.department ?? '—'}
        </p>
      </div>

      {[
        { label: 'Student ID', value: student?.username || '—', icon: '🆔' },
        { label: 'Department', value: student?.department || '—', icon: '🏫' },
        { label: 'Section', value: student?.section || 'N/A', icon: '📚' },
        { label: 'Email', value: student?.email || 'Not provided', icon: '📧' },
        { label: 'Phone', value: student?.phone || 'Not provided', icon: '📱' },
        { label: 'Date of Birth', value: student?.dob || 'Not provided', icon: '🎂' },
      ].map((item) => (
        <div
          key={item.label}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: 16,
            marginBottom: 8,
            background: '#1a1d2e',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <span style={{ fontSize: 22, width: 32, textAlign: 'center' }}>{item.icon}</span>
          <div>
            <p style={{ margin: 0, color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.label}</p>
            <p style={{ margin: '2px 0 0', color: '#fff', fontSize: 15, fontWeight: 600 }}>{item.value}</p>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => {
          logout()
          nav('/')
        }}
        style={{
          width: '100%',
          padding: 16,
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 16,
          color: '#ef4444',
          fontSize: 15,
          fontWeight: 700,
          marginTop: 8,
        }}
      >
        🚪 Logout
      </button>
    </div>
  )
}

