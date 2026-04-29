import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePageTitle } from '../components/layout/pageTitleContext.js'
import { getCurrentUser, loadUsersDb } from '../lib/usersDb.js'
import { logout } from '../lib/auth.js'

function computeStreak(records) {
  const arr = Array.isArray(records) ? records : []
  if (arr.length === 0) return 0
  // Treat records as chronological by insert order; convert to date set for present
  const byDay = new Map()
  for (const r of arr) byDay.set(r.date, r.status)
  let streak = 0
  for (let i = 0; i < 120; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toDateString()
    const st = byDay.get(key)
    if (st === 'present') streak += 1
    else break
  }
  return streak
}

function monthGrid(records) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const first = new Date(y, m, 1)
  const startDow = first.getDay() // 0-6
  const daysInMonth = new Date(y, m + 1, 0).getDate()

  const map = new Map()
  for (const r of records || []) map.set(r.date, r.status)

  const today = now.getDate()
  const cells = []
  for (let i = 0; i < startDow; i++) cells.push({ date: null, status: 'none', isToday: false })
  for (let d = 1; d <= daysInMonth; d++) {
    const key = new Date(y, m, d).toDateString()
    const status = map.get(key) ?? 'none'
    cells.push({ date: d, status, isToday: d === today })
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, status: 'none', isToday: false })
  return cells
}

export default function StudentDashboard() {
  const nav = useNavigate()
  const { setTitle } = usePageTitle()
  useEffect(() => setTitle('Student Dashboard'), [setTitle])

  useEffect(() => {
    if (window.location.hash === '#my-attendance') {
      window.setTimeout(() => {
        document.getElementById('my-attendance')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
    }
    if (window.location.hash === '#notifications') {
      window.setTimeout(() => {
        document.getElementById('notifications')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
    }
  }, [])

  const derived = useMemo(() => {
    const current = getCurrentUser()
    const db = loadUsersDb()
    const student = db.find((u) => u.id === current?.id) ?? null
    const records = Array.isArray(student?.attendanceRecords) ? student.attendanceRecords : []
    const present = records.filter((r) => r.status === 'present').length
    const absent = records.filter((r) => r.status === 'absent').length
    const pct = Math.round((present / Math.max(records.length, 1)) * 100)
    const streak = computeStreak(records)
    const recentRecords = records.slice().reverse()
    return { student, records: recentRecords, present, absent, pct, streak, grid: monthGrid(records) }
  }, [])

  const s = derived.student

  return (
    <div style={{ padding: '0 0 12px' }}>
      <div
        style={{
          margin: '12px 16px',
          padding: 20,
          background: 'linear-gradient(135deg, rgba(0,255,136,0.1), rgba(0,212,255,0.1))',
          borderRadius: 20,
          border: '1px solid rgba(0,255,136,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img
            src={s?.photoDataURL || '/default-avatar.png'}
            alt={s?.name || 'Student'}
            style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '3px solid #00ff88' }}
          />
          <div>
            <h2 style={{ margin: 0, color: '#fff', fontSize: 20, fontWeight: 700 }}>{s?.name || 'Student'}</h2>
            <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: 13 }}>
              {s?.username || '—'} • {s?.department || '—'}
              {s?.section ? ` • ${s.section}` : ''}
            </p>
          </div>
        </div>
      </div>

      <div style={{ margin: '0 16px 12px', padding: 20, background: '#1a1d2e', borderRadius: 20 }}>
        <p style={{ color: '#9ca3af', fontSize: 12, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: 1 }}>Attendance This Term</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ position: 'relative', width: 100, height: 100 }}>
            <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={derived.pct >= 75 ? '#00ff88' : derived.pct >= 60 ? '#f59e0b' : '#ef4444'}
                strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - derived.pct / 100)}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s ease' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: derived.pct >= 75 ? '#00ff88' : '#ef4444' }}>{derived.pct}%</span>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af', fontSize: 13 }}>Present</span>
              <span style={{ color: '#00ff88', fontWeight: 700 }}>{derived.present}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af', fontSize: 13 }}>Absent</span>
              <span style={{ color: '#ef4444', fontWeight: 700 }}>{derived.absent}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af', fontSize: 13 }}>Streak</span>
              <span style={{ color: '#f59e0b', fontWeight: 700 }}>🔥 {derived.streak} days</span>
            </div>
          </div>
        </div>
      </div>

      {derived.pct < 75 ? (
        <div style={{ margin: '0 16px 12px', padding: '14px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>⚠️</span>
          <div>
            <p style={{ margin: 0, color: '#ef4444', fontWeight: 700, fontSize: 14 }}>Below 75% Threshold</p>
            <p style={{ margin: '2px 0 0', color: '#9ca3af', fontSize: 12 }}>Risk of exam ban. Submit appeals or contact teacher.</p>
          </div>
        </div>
      ) : null}

      <div style={{ margin: '0 16px 12px' }}>
        <p style={{ color: '#9ca3af', fontSize: 12, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 1 }}>Quick Actions</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { icon: '📱', label: 'Scan QR', action: () => nav('/student-qr'), color: '#00d4ff' },
            { icon: '📝', label: 'Appeal', action: () => nav('/appeals'), color: '#f59e0b' },
            { icon: '👤', label: 'Profile', action: () => nav('/student-profile'), color: '#00ff88' },
            { icon: '🚪', label: 'Logout', action: () => { logout(); nav('/') }, color: '#ef4444' },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.action}
              style={{
                padding: 16,
                background: '#1a1d2e',
                border: `1px solid ${item.color}33`,
                borderRadius: 16,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 28 }}>{item.icon}</span>
              <span style={{ color: item.color, fontSize: 13, fontWeight: 600 }}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ margin: '0 16px 12px', padding: 20, background: '#1a1d2e', borderRadius: 20 }}>
        <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: '0 0 4px' }}>Monthly Attendance</p>
        <p style={{ color: '#9ca3af', fontSize: 12, margin: '0 0 16px' }}>🟢 Present  🔴 Absent  🟡 Late  ⬜ No record</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => (
            <div key={d} style={{ textAlign: 'center', color: '#6b7280', fontSize: 11, fontWeight: 600, padding: '4px 0' }}>
              {d}
            </div>
          ))}
          {derived.grid.map((day, idx) => (
            <div
              key={idx}
              style={{
                aspectRatio: '1',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 600,
                background:
                  day.status === 'present'
                    ? 'rgba(0,255,136,0.2)'
                    : day.status === 'absent'
                      ? 'rgba(239,68,68,0.2)'
                      : day.status === 'late'
                        ? 'rgba(245,158,11,0.2)'
                        : 'rgba(255,255,255,0.04)',
                color:
                  day.status === 'present'
                    ? '#00ff88'
                    : day.status === 'absent'
                      ? '#ef4444'
                      : day.status === 'late'
                        ? '#f59e0b'
                        : '#4b5563',
                border: day.isToday ? '2px solid #00d4ff' : '1px solid transparent',
              }}
            >
              {day.date || ''}
            </div>
          ))}
        </div>
      </div>

      <div id="my-attendance" style={{ margin: '0 16px 12px', padding: 20, background: '#1a1d2e', borderRadius: 20 }}>
        <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: '0 0 16px' }}>Recent Records</p>
        {derived.records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ fontSize: 32 }}>📋</p>
            <p style={{ color: '#6b7280', fontSize: 13 }}>No attendance records yet</p>
          </div>
        ) : (
          derived.records.slice(0, 10).map((record, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: idx < Math.min(derived.records.length, 10) - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}
            >
              <div>
                <p style={{ margin: 0, color: '#fff', fontSize: 14, fontWeight: 600 }}>{record.subject || 'General Class'}</p>
                <p style={{ margin: '2px 0 0', color: '#6b7280', fontSize: 12 }}>
                  {record.date} • {record.timeIn || '—'}
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 700,
                    background: record.status === 'present' ? 'rgba(0,255,136,0.15)' : 'rgba(239,68,68,0.15)',
                    color: record.status === 'present' ? '#00ff88' : '#ef4444',
                  }}
                >
                  {String(record.status || '').toUpperCase()}
                </span>
                {record.method ? <span style={{ fontSize: 10, color: '#6b7280' }}>{record.method}</span> : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

