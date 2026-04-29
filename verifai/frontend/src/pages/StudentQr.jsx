import { useEffect, useMemo, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { usePageTitle } from '../components/layout/pageTitleContext.js'
import { useToast } from '../components/toastContext.js'
import { cn } from '../lib/cn.js'
import { getCurrentUser, addAttendanceForStudentId, loadUsersDb } from '../lib/usersDb.js'
import { findValidSession } from '../lib/verifaiDb.js'

function safeParseJson(str) {
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}

export default function StudentQr() {
  const nav = useNavigate()
  const { setTitle } = usePageTitle()
  const { push } = useToast()
  const [status, setStatus] = useState({ kind: 'idle', message: '' }) // idle|scanning|ok|error
  const [successMeta, setSuccessMeta] = useState(null)
  const [flash, setFlash] = useState(false)
  const scannerRef = useRef(null)
  const elId = useMemo(() => `verifai-student-qr-${Math.random().toString(16).slice(2)}`, [])

  useEffect(() => setTitle('Scan QR'), [setTitle])

  useEffect(() => {
    let alive = true

    async function start() {
      setStatus({ kind: 'scanning', message: 'Point your camera at the QR code…' })
      const scanner = new Html5Qrcode(elId)
      scannerRef.current = scanner
      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 12, qrbox: { width: 260, height: 260 } },
          async (decodedText) => {
            if (!alive) return
            setStatus({ kind: 'scanning', message: 'Validating session…' })

            const payload = safeParseJson(decodedText)
            if (!payload || typeof payload !== 'object') {
              setStatus({ kind: 'error', message: 'Invalid QR code' })
              push({ title: 'QR failed', message: 'Invalid QR code', variant: 'error' })
              return
            }

            const sessionId = payload.sessionId
            const expiresAt = Number(payload.expiresAt || 0)
            const subject = payload.subject || 'General'
            const now = Date.now()

            if (!sessionId) {
              setStatus({ kind: 'error', message: 'Invalid session QR' })
              push({ title: 'QR failed', message: 'Invalid session QR', variant: 'error' })
              return
            }
            if (!expiresAt || now > expiresAt) {
              setStatus({ kind: 'error', message: 'Session expired. Ask teacher for new QR' })
              push({ title: 'Expired', message: 'Session expired. Ask teacher for new QR', variant: 'error' })
              return
            }

            const v = findValidSession(sessionId)
            if (!v.ok) {
              setStatus({ kind: 'error', message: v.reason === 'expired' ? 'Session expired. Ask teacher for new QR' : 'Invalid sessionId' })
              push({ title: 'QR failed', message: 'Session invalid or expired', variant: 'error' })
              return
            }

            const current = getCurrentUser()
            if (!current?.username) {
              setStatus({ kind: 'error', message: 'Not logged in' })
              push({ title: 'QR failed', message: 'Not logged in', variant: 'error' })
              return
            }

            const db = loadUsersDb()
            const me = db.find((u) => u.role === 'student' && u.username === current.username) ?? null
            const recs = Array.isArray(me?.attendanceRecords) ? me.attendanceRecords : []
            if (recs.some((r) => r?.sessionId === sessionId && String(r.status).toLowerCase() === 'present')) {
              setStatus({ kind: 'error', message: 'Already marked present' })
              push({ title: 'Already marked', message: 'Already marked present', variant: 'info' })
              return
            }

            addAttendanceForStudentId(current.username, {
              status: 'present',
              method: 'QR',
              confidence: 100,
              subject,
              sessionId,
            })

            const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            const dateLine = new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })
            setStatus({ kind: 'ok', message: `✅ Attendance marked for ${subject} — ${time}` })
            setSuccessMeta({ subject, time, dateLine })
            setFlash(true)
            window.setTimeout(() => setFlash(false), 320)
            push({ title: 'Attendance marked', message: `${subject} • ${time}`, variant: 'success' })

            try {
              await scanner.stop()
              await scanner.clear()
            } catch {
              // ignore
            }
          },
          () => {},
        )
      } catch {
        setStatus({ kind: 'error', message: 'Scanner could not start. Check camera permissions.' })
        push({ title: 'QR scanner failed', message: 'Camera permission required', variant: 'error' })
      }
    }

    start()

    return () => {
      alive = false
      const s = scannerRef.current
      scannerRef.current = null
      if (s) {
        Promise.resolve()
          .then(() => s.stop().catch(() => {}))
          .then(() => s.clear().catch(() => {}))
          .catch(() => {})
      }
    }
  }, [elId, push])

  return (
    <div style={{ position: 'relative', minHeight: 'calc(100dvh - 154px)', background: '#0f1117' }}>
      {flash ? <div className="qr-success-flash" /> : null}

      <div style={{ position: 'relative', height: 'calc(100dvh - 154px)', overflow: 'hidden', background: '#000' }}>
        <div id={elId} style={{ height: '100%', width: '100%' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.42)' }} />

        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 260,
            height: 260,
            borderRadius: 16,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.34)',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, border: '1px solid rgba(255,255,255,0.18)', borderRadius: 16 }} />
          <div className="qr-scan-line" />
          {[
            { top: -2, left: -2, borderRight: 'none', borderBottom: 'none' },
            { top: -2, right: -2, borderLeft: 'none', borderBottom: 'none' },
            { bottom: -2, left: -2, borderRight: 'none', borderTop: 'none' },
            { bottom: -2, right: -2, borderLeft: 'none', borderTop: 'none' },
          ].map((corner, idx) => (
            <div key={idx} style={{ position: 'absolute', width: 32, height: 32, border: '4px solid #22c55e', borderRadius: 6, ...corner }} />
          ))}
        </div>

        <p
          style={{
            position: 'absolute',
            top: 'calc(50% + 150px)',
            width: '100%',
            textAlign: 'center',
            color: '#d1d5db',
            fontSize: 14,
            fontWeight: 600,
            padding: '0 16px',
          }}
        >
          Point camera at QR code
        </p>

        <div style={{ position: 'absolute', left: 16, right: 16, top: 16 }}>
          <div
            className={cn(
              'rounded-2xl border px-4 py-3 text-sm font-semibold',
              status.kind === 'ok' && 'border-[rgba(0,255,136,0.25)] bg-[rgba(0,255,136,0.12)] text-white',
              status.kind === 'error' && 'border-red-500/25 bg-red-500/10 text-red-100',
              status.kind === 'scanning' && 'border-white/10 bg-black/40 text-white/90',
              status.kind === 'idle' && 'border-white/10 bg-black/40 text-white/80',
            )}
          >
            <div className="flex items-center gap-2">
              {status.kind === 'ok' ? <CheckCircle2 className="h-4 w-4 text-[color:var(--verifai-green)]" /> : null}
              {status.kind === 'error' ? <XCircle className="h-4 w-4 text-red-200" /> : null}
              <span>{status.message || 'Ready to scan.'}</span>
            </div>
          </div>
        </div>
      </div>

      {successMeta ? (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 'calc(74px + env(safe-area-inset-bottom))',
            width: 'calc(100% - 24px)',
            maxWidth: 406,
            background: '#101827',
            border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: 20,
            padding: 18,
            zIndex: 120,
            boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
          }}
        >
          <p style={{ margin: 0, fontSize: 22 }}>✅</p>
          <p style={{ margin: '6px 0 12px', color: '#22c55e', fontWeight: 800, fontSize: 18 }}>Attendance Marked!</p>
          <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 15 }}>{successMeta.subject}</p>
          <p style={{ margin: '4px 0 10px', color: '#9ca3af', fontSize: 13 }}>
            {successMeta.dateLine} • {successMeta.time}
          </p>
          <p style={{ margin: 0, color: '#d1d5db', fontSize: 13 }}>Your attendance has been recorded as PRESENT for this session.</p>
          <button
            type="button"
            onClick={() => nav('/student-dashboard')}
            style={{ marginTop: 14, width: '100%', padding: '12px 14px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #00ff88, #00d4ff)', color: '#000', fontWeight: 800 }}
          >
            Back to Home
          </button>
        </div>
      ) : null}
    </div>
  )
}

