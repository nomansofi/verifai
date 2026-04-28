import { useEffect, useMemo, useRef, useState } from 'react'
import { QrCode, RefreshCw, VideoOff } from 'lucide-react'
import { motion } from 'framer-motion'
import ScanOverlay from '../components/ScanOverlay.jsx'
import { usePageTitle } from '../components/layout/AppLayout.jsx'
import { apiQrCheckin, apiRecognize } from '../lib/api.js'
import { useToast } from '../components/ToastProvider.jsx'
import { cn } from '../lib/cn.js'

const MODES = ['Student', 'Employee', 'Event', 'Exam']

function captureBase64(videoEl) {
  if (!videoEl?.videoWidth || !videoEl?.videoHeight) return null
  const c = document.createElement('canvas')
  c.width = videoEl.videoWidth
  c.height = videoEl.videoHeight
  const ctx = c.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(videoEl, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.72)
}

export default function Scan() {
  const { setTitle } = usePageTitle()
  const { push } = useToast()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [mode, setMode] = useState('Student')
  const [cameraOk, setCameraOk] = useState(false)
  const [detect, setDetect] = useState({ status: 'SCANNING', name: null, confidence: null })
  const [log, setLog] = useState([])

  useEffect(() => setTitle('Face Scan'), [setTitle])

  useEffect(() => {
    let alive = true
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
        if (!alive) return
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setCameraOk(true)
      } catch {
        setCameraOk(false)
      }
    }
    start()
    return () => {
      alive = false
      streamRef.current?.getTracks?.().forEach((t) => t.stop())
    }
  }, [])

  useEffect(() => {
    const t = window.setInterval(async () => {
      setDetect((d) => ({ ...d, status: 'SCANNING' }))
      const img = captureBase64(videoRef.current)
      const res = await apiRecognize(img, mode)
      const status = res?.status ?? 'UNKNOWN'
      const name = res?.name ?? null
      const confidence = typeof res?.confidence === 'number' ? res.confidence : null
      setDetect({ status, name, confidence })
      setLog((l) => [
        {
          id: crypto.randomUUID(),
          name: name || 'Unknown',
          status,
          confidence: confidence ?? 0,
          time: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
          mode,
        },
        ...l,
      ].slice(0, 12))
    }, 4200)
    return () => window.clearInterval(t)
  }, [mode])

  const statusHint = useMemo(() => {
    if (detect.status === 'PRESENT') return 'Verified — attendance marked'
    if (detect.status === 'UNKNOWN') return 'Unknown — alert raised'
    return 'Scanning…'
  }, [detect.status])

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="glass neon-ring relative overflow-hidden p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Live face scan</div>
              <div className="mt-0.5 text-xs text-white/60">{statusHint}</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
                {MODES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                      mode === m
                        ? 'bg-[rgba(0,255,136,0.16)] text-white ring-1 ring-[rgba(0,255,136,0.35)]'
                        : 'text-white/70 hover:bg-white/10 hover:text-white',
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="btn-ghost"
                onClick={async () => {
                  const res = await apiQrCheckin('DEMO-QR')
                  push({ title: 'QR check-in', message: res.ok ? 'Check-in recorded' : 'Failed', variant: res.ok ? 'success' : 'error' })
                }}
              >
                <QrCode className="h-4 w-4" />
                Manual QR fallback
              </button>
            </div>
          </div>

          <div className="relative mt-4 aspect-video overflow-hidden rounded-3xl bg-black/40">
            <div className="scan-border" />
            {cameraOk ? (
              <video ref={videoRef} className="h-full w-full object-cover opacity-90" playsInline muted />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-white/70">
                <VideoOff className="h-8 w-8" />
                <div className="text-sm font-semibold">Camera not available</div>
                <div className="text-xs text-white/55">Allow camera permissions and refresh.</div>
                <button type="button" className="btn-ghost" onClick={() => window.location.reload()}>
                  <RefreshCw className="h-4 w-4" /> Reload
                </button>
              </div>
            )}

            <ScanOverlay status={detect.status} name={detect.name} confidence={detect.confidence} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="glass overflow-hidden">
          <div className="border-b border-white/10 px-4 py-3">
            <div className="text-sm font-semibold">Scan log</div>
            <div className="mt-0.5 text-xs text-white/60">Most recent detections</div>
          </div>

          <div className="max-h-[520px] divide-y divide-white/10 overflow-auto">
            {log.map((x) => (
              <motion.div
                key={x.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{x.name}</div>
                  <div className="mt-0.5 text-xs text-white/60">
                    {x.time} • {x.mode}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'rounded-full px-2 py-1 text-[11px] font-semibold ring-1',
                      x.status === 'PRESENT' &&
                        'bg-[rgba(0,255,136,0.14)] text-[color:var(--verifai-green)] ring-[rgba(0,255,136,0.25)]',
                      x.status === 'UNKNOWN' &&
                        'bg-orange-400/10 text-orange-200 ring-orange-400/20',
                      x.status === 'LATE' && 'bg-yellow-400/10 text-yellow-200 ring-yellow-400/20',
                    )}
                  >
                    {x.status}
                  </span>
                  <div className="text-xs text-white/70">{Math.round(x.confidence * 100)}%</div>
                </div>
              </motion.div>
            ))}
            {log.length === 0 ? <div className="px-4 py-6 text-sm text-white/60">Waiting for first scan…</div> : null}
          </div>
        </div>

        <div className="glass p-5">
          <div className="text-sm font-semibold">Tips</div>
          <ul className="mt-2 space-y-2 text-xs text-white/65">
            <li>Keep face centered inside the circular overlay.</li>
            <li>Ensure good lighting for higher confidence.</li>
            <li>Use QR fallback for low-connectivity moments.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

