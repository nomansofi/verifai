import { useEffect, useMemo, useRef, useState } from 'react'
import { QrCode, VideoOff } from 'lucide-react'
import { motion } from 'framer-motion'
import * as faceapi from '@vladmandic/face-api'
import { Html5Qrcode } from 'html5-qrcode'
import QRCodeLib from 'react-qr-code'
import { usePageTitle } from '../components/layout/pageTitleContext.js'
import { apiQrCheckin } from '../lib/api.js'
import { useToast } from '../components/toastContext.js'
import { cn } from '../lib/cn.js'
import { addAttendanceForStudentName, loadUsersDb } from '../lib/usersDb.js'
import { confidenceFromDistance, loadFaceModels, parseMatchLabel, toLabeledDescriptors } from '../lib/faceApi.js'
import { triggerWhatsAppAttendanceNotification } from '../lib/whatsappApi.js'
import ScanOverlay from '../components/ScanOverlay.jsx'
import { createSession, findCurrentClass } from '../lib/verifaiDb.js'
import { getCurrentUser } from '../lib/usersDb.js'
import ToggleBar from '../components/ToggleBar.jsx'

const MODES = ['Student', 'Employee']
const QRCodeComp = QRCodeLib?.default ?? QRCodeLib
const MATCH_THRESHOLD = 0.6

const SCAN_MARKS_KEY = 'verifai_scan_marks_v1'

function loadScanMarks() {
  try {
    const raw = localStorage.getItem(SCAN_MARKS_KEY)
    const obj = raw ? JSON.parse(raw) : {}
    return obj && typeof obj === 'object' ? obj : {}
  } catch {
    return {}
  }
}

function saveScanMarks(obj) {
  try {
    localStorage.setItem(SCAN_MARKS_KEY, JSON.stringify(obj))
  } catch {
    // ignore
  }
}

function computeClassWindowKey({ studentId, mode, subjectFallback }) {
  const today = new Date().toDateString()
  const teacher = getCurrentUser()
  const cls = findCurrentClass({ department: teacher?.department, now: new Date() })
  const subject = cls?.subject || subjectFallback || 'General'
  if (cls?.startTime && cls?.endTime) {
    return `${today}|${subject}|${cls.day || ''}|${cls.startTime}-${cls.endTime}|${studentId}`
  }
  // Fallback: treat a “class duration” as 60 minutes buckets
  const bucket = Math.floor(Date.now() / (3 * 60 * 1000))
  return `${today}|${subject}|bucket:${bucket}|${studentId}`
}

function topExpression(expressions) {
  const ex = expressions && typeof expressions === 'object' ? expressions : null
  if (!ex) return null
  let bestK = null
  let bestV = -1
  for (const [k, v] of Object.entries(ex)) {
    const n = typeof v === 'number' ? v : 0
    if (n > bestV) {
      bestV = n
      bestK = k
    }
  }
  if (!bestK) return null
  return { key: bestK, score: bestV }
}

function mapEmotion(exprKey) {
  const k = String(exprKey || '').toLowerCase()
  if (k === 'sad' || k === 'neutral') return { emotion: k, emoji: k === 'sad' ? '😴' : '😊', tone: 'yellow', label: k === 'sad' ? 'Student appears drowsy' : 'Engaged' }
  if (k === 'happy') return { emotion: 'happy', emoji: '😊', tone: 'green', label: 'Engaged' }
  if (k === 'angry' || k === 'disgusted') return { emotion: k, emoji: '😠', tone: 'orange', label: 'Student seems distressed' }
  if (k === 'fearful') return { emotion: 'fearful', emoji: '😨', tone: 'cyan', label: 'Student appears anxious' }
  if (k === 'surprised') return { emotion: 'surprised', emoji: '😮', tone: 'cyan', label: 'Alert' }
  return { emotion: k || 'neutral', emoji: '😊', tone: 'green', label: 'Engaged' }
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n))
}

export default function Scan() {
  const { setTitle } = usePageTitle()
  const { push } = useToast()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [mode, setMode] = useState('Student')
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [modelsPct, setModelsPct] = useState(0)
  const [modelsReady, setModelsReady] = useState(false)
  const [aiAvailable, setAiAvailable] = useState(true)
  const [detect, setDetect] = useState({ status: 'STARTING', name: null, confidence: null })
  const [log, setLog] = useState([])
  const [qrOpen, setQrOpen] = useState(false)
  const [qrState, setQrState] = useState({ status: 'IDLE', message: '' }) // IDLE|SCANNING|OK|ERROR
  const qrScannerRef = useRef(null)
  const qrElId = useMemo(() => `verifai-qr-${Math.random().toString(16).slice(2)}`, [])
  const [sessionOpen, setSessionOpen] = useState(false)
  const [session, setSession] = useState(null)
  const [subject, setSubject] = useState('Data Structures')
  const [sessionNow, setSessionNow] = useState(() => Date.now())
  const seenRef = useRef(new Map()) // id -> lastTs
  const marksRef = useRef(loadScanMarks()) // windowKey -> ts (persisted)
  const inFlightRef = useRef(false)
  const matcherRef = useRef({ key: '', at: 0, matcher: null })
  const confirmRef = useRef({ id: null, hits: 0, firstTs: 0, lastTs: 0 })
  const unknownRef = useRef({ lastAt: 0, lastSig: '', hits: 0 })
  const stickyRef = useRef({ id: null, name: null, until: 0, mode: null })
  const motionCanvasRef = useRef(null)
  const motionRef = useRef({ prev: null, lastMotionAt: 0, score: 0 })
  const dynamicsRef = useRef({ prevExpr: null, lastDynamicAt: 0, score: 0 })
  const [motionUi, setMotionUi] = useState({ status: 'IDLE', message: '', tone: 'neutral', score: 0 }) // IDLE|NEED|OK

  useEffect(() => setTitle('Face Scan'), [setTitle])

  const startCamera = async () => {
    setCameraError(null)
    setCameraReady(false)
    setDetect((d) => ({ ...d, status: 'STARTING' }))
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      })

      streamRef.current?.getTracks?.().forEach((t) => t.stop())
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play?.().catch(() => {})
          setCameraReady(true)
        }
      } else {
        setCameraReady(true)
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Camera error:', err)
      setCameraError('Camera access denied. Please allow camera permissions.')
      setCameraReady(false)
      // QR fallback for Student/Employee on camera failure
      if (mode === 'Student' || mode === 'Employee') {
        setQrOpen(true)
        setQrState({ status: 'SCANNING', message: 'QR fallback enabled — scan your code' })
      }
    }
  }

  const loadModels = async () => {
    const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'
    try {
      setModelsReady(false)
      setAiAvailable(true)
      await loadFaceModels({ modelUri: MODEL_URL, onProgress: (p) => setModelsPct(p) })
      setModelsReady(true)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Model load error:', err)
      // Keep camera working even if AI fails.
      setAiAvailable(false)
      setModelsPct(100)
      setModelsReady(true)
    }
  }

  useEffect(() => {
    // Start webcam FIRST so user sees themselves immediately.
    window.setTimeout(() => startCamera(), 0)
    // Load models in background (CDN) to avoid missing-file stalls.
    window.setTimeout(() => {
      loadModels()
    }, 0)
    return () => {
      streamRef.current?.getTracks?.().forEach((t) => t.stop())
    }
  }, [])

  // Teacher session QR: refresh every 1 minute when modal open
  useEffect(() => {
    if (!sessionOpen) return
    const teacherId = getCurrentUser()?.username || 'T-1001'
    const make = () => setSession(createSession({ teacherId, subject, ttlMs: 60_000 }))
    make()
    const t1 = window.setInterval(make, 60_000)
    const t2 = window.setInterval(() => setSessionNow(Date.now()), 250)
    return () => {
      window.clearInterval(t1)
      window.clearInterval(t2)
    }
  }, [sessionOpen, subject])

  // QR scanner lifecycle
  useEffect(() => {
    if (!qrOpen) return
    let alive = true

    async function start() {
      setQrState((s) => ({ ...s, status: 'SCANNING', message: 'Point your camera at the QR code…' }))
      try {
        const scanner = new Html5Qrcode(qrElId)
        qrScannerRef.current = scanner
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 12, qrbox: { width: 260, height: 260 } },
          async (decodedText) => {
            if (!alive) return
            setQrState({ status: 'SCANNING', message: 'Validating…' })
            const res = await apiQrCheckin(decodedText)
            if (res?.ok) {
              setQrState({ status: 'OK', message: 'QR Check-in Recorded' })
              push({ title: 'QR check-in', message: 'QR Check-in Recorded', variant: 'success' })
              setLog((l) =>
                [
                  {
                    id: crypto.randomUUID(),
                    name: 'QR Check-in',
                    status: 'PRESENT',
                    confidence: 1,
                    time: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
                    mode,
                    method: 'QR',
                    ts: new Date().toISOString(),
                  },
                  ...l,
                ].slice(0, 12),
              )
              // stop after success
              try {
                await scanner.stop()
                await scanner.clear()
              } catch {
                // ignore
              }
              qrScannerRef.current = null
              setQrOpen(false)
              setQrState({ status: 'IDLE', message: '' })
            } else {
              const msg = res?.error || 'Invalid QR code'
              setQrState({ status: 'ERROR', message: msg })
              push({ title: 'QR failed', message: msg, variant: 'error' })
            }
          },
          () => {},
        )
      } catch (e) {
        setQrState({ status: 'ERROR', message: 'QR scanner could not start. Check camera permissions.' })
      }
    }

    start()
    return () => {
      alive = false
      const s = qrScannerRef.current
      qrScannerRef.current = null
      if (s) {
        Promise.resolve()
          .then(() => s.stop().catch(() => {}))
          .then(() => s.clear().catch(() => {}))
          .catch(() => {})
      }
    }
  }, [qrOpen, qrElId, mode, push])

  useEffect(() => {
    if (!modelsReady || !cameraReady || !aiAvailable) return
    let alive = true

    const recognizeFace = async () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!alive || !video || !canvas || video.readyState < 2) return
      if (inFlightRef.current) return
      inFlightRef.current = true

      // Keep canvas in sync with the actual video frame size.
      if (video.videoWidth && video.videoHeight) {
        if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth
        if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight
      }

      // ---------------------------
      // BODY MOTION CHECK (replaces anti-proxy liveness)
      // ---------------------------
      const mCan = motionCanvasRef.current ?? document.createElement('canvas')
      motionCanvasRef.current = mCan
      const mw = 64
      const mh = 36
      mCan.width = mw
      mCan.height = mh
      const mCtx = mCan.getContext('2d', { willReadFrequently: true })
      if (mCtx) {
        mCtx.drawImage(video, 0, 0, mw, mh)
        const img = mCtx.getImageData(0, 0, mw, mh).data
        const prev = motionRef.current.prev
        if (prev && prev.length === img.length) {
          let sum = 0
          // sample every 3rd pixel for speed
          for (let i = 0; i < img.length; i += 12) {
            // grayscale-ish: just use R channel (good enough)
            sum += Math.abs(img[i] - prev[i])
          }
          const avg = sum / (img.length / 12)
          // Map avg diff to 0..100
          const score = clamp(Math.round((avg / 18) * 100), 0, 100)
          motionRef.current.score = score
          if (avg > 2.2) {
            motionRef.current.lastMotionAt = Date.now()
          }
          const motionOk = Date.now() - motionRef.current.lastMotionAt < 2500
          setMotionUi({
            status: motionOk ? 'OK' : 'NEED',
            message: motionOk ? '✅ Motion verified' : '🕺 Move slightly to verify you are live',
            tone: motionOk ? 'green' : 'yellow',
            score,
          })
        }
        motionRef.current.prev = new Uint8ClampedArray(img)
      }

      // Role-aware matching by selected mode.
      const enrolled = loadUsersDb().filter((u) => {
        if (!u.faceDescriptor || !u.photoDataURL) return false
        if (mode === 'Student') return u.role === 'student'
        return u.role === 'teacher' || u.role === 'employee'
      })
      if (enrolled.length === 0) {
        setDetect({ status: 'NO_ENROLLED', name: null, confidence: null })
        const ctx = canvas.getContext('2d')
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
        inFlightRef.current = false
        return
      }

      setDetect((d) => ({ ...d, status: 'SCANNING' }))

      const detections = await faceapi
        .detectAllFaces(
          video,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 160, // faster
            scoreThreshold: 0.4,
          }),
        )
        .withFaceLandmarks()
        .withFaceDescriptors()
        .withFaceExpressions()

      const dims = faceapi.matchDimensions(canvas, video, true)
      const resized = faceapi.resizeResults(detections, dims)

      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (resized.length === 0) {
        setDetect({ status: 'NO_FACE', name: null, confidence: null })
        inFlightRef.current = false
        return
      }

      // Cache matcher (descriptor construction is expensive)
      const cacheKey = enrolled.map((u) => u.id).join('|')
      const nowCache = Date.now()
      if (!matcherRef.current.matcher || matcherRef.current.key !== cacheKey || nowCache - matcherRef.current.at > 5000) {
        const labeled = toLabeledDescriptors(enrolled)
        matcherRef.current = { key: cacheKey, at: nowCache, matcher: new faceapi.FaceMatcher(labeled, MATCH_THRESHOLD) }
      }
      const matcher = matcherRef.current.matcher

      let best = null
      for (const det of resized) {
        const match = matcher.findBestMatch(det.descriptor)
        const box = det.detection.box
        const distance = match.distance
        const isUnknown = match.label === 'unknown' || distance > MATCH_THRESHOLD

        const confidencePct = isUnknown
          ? Math.round((1 - Math.min(MATCH_THRESHOLD, distance) / MATCH_THRESHOLD) * 100)
          : confidenceFromDistance(distance, MATCH_THRESHOLD)

        // Draw neon box
        ctx.lineWidth = 3
        ctx.strokeStyle = isUnknown ? 'rgba(255,70,70,0.95)' : 'rgba(0,255,136,0.95)'
        ctx.shadowColor = isUnknown ? 'rgba(255,70,70,0.45)' : 'rgba(0,255,136,0.45)'
        ctx.shadowBlur = 14
        ctx.strokeRect(box.x, box.y, box.width, box.height)
        ctx.shadowBlur = 0

        // Label
        const label = isUnknown ? `UNKNOWN • ${confidencePct}%` : `${parseMatchLabel(match.label).name} • ${confidencePct}%`
        ctx.font = '600 14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
        const pad = 6
        const textW = ctx.measureText(label).width
        const x = box.x
        const y = Math.max(18, box.y - 10)
        ctx.fillStyle = 'rgba(10,10,10,0.75)'
        ctx.fillRect(x, y - 18, textW + pad * 2, 22)
        ctx.strokeStyle = isUnknown ? 'rgba(255,70,70,0.35)' : 'rgba(0,255,136,0.35)'
        ctx.strokeRect(x, y - 18, textW + pad * 2, 22)
        ctx.fillStyle = 'rgba(255,255,255,0.92)'
        ctx.fillText(label, x + pad, y - 2)

        // Emotion badge (below name overlay)
        const top = topExpression(det.expressions)
        if (top) {
          const emo = mapEmotion(top.key)
          const pct = Math.round(top.score * 100)
          const badge = `${emo.emoji} ${emo.emotion} (${pct}%)`
          ctx.font = '600 12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
          const w = ctx.measureText(badge).width
          const bh = 20
          const bx = x
          const by = y + 10
          const tone =
            emo.tone === 'yellow'
              ? 'rgba(255,214,10,0.35)'
              : emo.tone === 'orange'
                ? 'rgba(255,120,60,0.35)'
                : emo.tone === 'cyan'
                  ? 'rgba(0,212,255,0.35)'
                  : 'rgba(0,255,136,0.35)'
          ctx.fillStyle = 'rgba(10,10,10,0.72)'
          ctx.fillRect(bx, by, w + pad * 2, bh)
          ctx.strokeStyle = tone
          ctx.strokeRect(bx, by, w + pad * 2, bh)
          ctx.fillStyle = 'rgba(255,255,255,0.92)'
          ctx.fillText(badge, bx + pad, by + 14)

          // Optional quick hint in log for distressed states
          if (!isUnknown && (emo.emotion === 'sad' || emo.emotion === 'angry' || emo.emotion === 'disgusted' || emo.emotion === 'fearful')) {
            setDetect((d) => ({ ...d, emotionHint: emo.label }))
          }
        }

        if (!best || distance < best.distance) {
          best = { match, distance, confidencePct, expressions: det.expressions, landmarks: det.landmarks, box: det.detection.box }
        }
      }

      if (!best) return

      // Sticky match window to avoid rapid flip/flop UNKNOWN -> KNOWN -> UNKNOWN.
      // If we had a known match very recently and this frame is only slightly above threshold,
      // keep the previous identity for a short grace period.
      const nowTs = Date.now()
      const sticky = stickyRef.current
      const stickyCanHold =
        sticky.id &&
        sticky.mode === mode &&
        nowTs < sticky.until &&
        best.distance <= MATCH_THRESHOLD + 0.06

      if ((best.match.label === 'unknown' || best.distance > MATCH_THRESHOLD) && !stickyCanHold) {
        setDetect({ status: 'UNKNOWN', name: null, confidence: best.confidencePct / 100 })
        // Throttle repeated unknown logs for the same face region.
        const b = best.box
        const sig = `${Math.round((b?.x ?? 0) / 24)}:${Math.round((b?.y ?? 0) / 24)}:${Math.round((b?.width ?? 0) / 24)}:${Math.round((b?.height ?? 0) / 24)}`
        const u = unknownRef.current
        const sameSig = u.lastSig === sig
        const withinBurst = nowTs - u.lastAt < 1600
        if (!(sameSig && withinBurst)) {
          setLog((l) =>
            [
              {
                id: crypto.randomUUID(),
                name: 'Unknown',
                status: 'UNKNOWN',
                confidence: best.confidencePct / 100,
                time: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
                mode,
              },
              ...l,
            ].slice(0, 12),
          )
          unknownRef.current = { lastAt: nowTs, lastSig: sig, hits: sameSig ? u.hits + 1 : 1 }
        }
        return
      }

      const { id, name } = stickyCanHold ? { id: sticky.id, name: sticky.name } : parseMatchLabel(best.match.label)
      // Multi-frame confirmation to prevent “wrong person” flashes.
      // Require 2 hits within 1500ms of the first hit.
      const cf = confirmRef.current
      const nowConfirm = Date.now()
      if (cf.id !== id || nowConfirm - cf.lastTs > 900) {
        cf.id = id
        cf.hits = 1
        cf.firstTs = nowConfirm
        cf.lastTs = nowConfirm
        setDetect({ status: 'SCANNING', name: null, confidence: null })
        inFlightRef.current = false
        return
      }
      cf.hits += 1
      cf.lastTs = nowConfirm
      if (cf.hits < 2 || nowConfirm - cf.firstTs > 1500) {
        inFlightRef.current = false
        return
      }

      const t = topExpression(best.expressions)
      const emo = t ? mapEmotion(t.key) : null
      setDetect({ status: 'PRESENT', name, confidence: best.confidencePct / 100, emotion: emo?.emotion ?? null, emotionPct: t ? Math.round(t.score * 100) : null, emotionHint: emo?.label ?? null })
      stickyRef.current = { id, name, until: Date.now() + 1800, mode }

      // Require BOTH recent body motion and live face dynamics (expression shifts)
      // so a static photo doesn't pass by just moving the phone/paper.
      const motionOk = Date.now() - (motionRef.current.lastMotionAt || 0) < 2500
      const expr = best.expressions && typeof best.expressions === 'object' ? best.expressions : null
      const prevExpr = dynamicsRef.current.prevExpr
      if (expr && prevExpr) {
        const keys = ['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised']
        let delta = 0
        for (const k of keys) delta += Math.abs((expr[k] ?? 0) - (prevExpr[k] ?? 0))
        const score = clamp(Math.round(delta * 100), 0, 100)
        dynamicsRef.current.score = score
        if (delta > 0.08) dynamicsRef.current.lastDynamicAt = Date.now()
      }
      dynamicsRef.current.prevExpr = expr
      const dynamicOk = Date.now() - (dynamicsRef.current.lastDynamicAt || 0) < 2500
      if (!motionOk || !dynamicOk) {
        setMotionUi({
          status: 'NEED',
          message: !motionOk ? '🕺 Move slightly to verify you are live' : '🙂 Change expression naturally to verify live face',
          tone: 'yellow',
          score: motionRef.current.score ?? 0,
        })
        inFlightRef.current = false
        return
      }

      const now = Date.now()
      // Only mark once per “class duration window”
      const windowKey = computeClassWindowKey({ studentId: id, mode, subjectFallback: subject })
      const alreadyMarkedAt = marksRef.current?.[windowKey] ?? 0
      if (alreadyMarkedAt) {
        inFlightRef.current = false
        return
      }

      // Fast UI debounce so we don't spam log/toasts while face stays in frame
      const last = seenRef.current.get(id) ?? 0
      if (now - last > 2500) {
        seenRef.current.set(id, now)
        marksRef.current = { ...(marksRef.current || {}), [windowKey]: now }
        saveScanMarks(marksRef.current)
        const rec = addAttendanceForStudentName(name, {
          status: 'present',
          method: 'FACE',
          confidence: Math.round(best.confidencePct),
          motionVerified: true,
          motionScore: motionRef.current.score ?? null,
          subject: windowKey.split('|')[1] || undefined,
          classWindowKey: windowKey,
        })
        setLog((l) =>
          [
            {
              id: crypto.randomUUID(),
              name,
              status: 'PRESENT',
              confidence: (Math.round(best.confidencePct) || 0) / 100,
              time: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
              mode,
              method: 'FACE',
              ts: new Date().toISOString(),
              dbOk: rec?.ok ?? false,
              motion: true,
              motionScore: motionRef.current.score ?? null,
              dynamicsScore: dynamicsRef.current.score ?? null,
            },
            ...l,
          ].slice(0, 12),
        )

        // Fire-and-forget WhatsApp notification
        triggerWhatsAppAttendanceNotification({ matchedStudentName: name, subject: 'General', status: 'present' })
          .then((r) => {
            if (r.ok) push({ title: '📱 WhatsApp', message: `Notification sent for ${name}`, variant: 'success' })
          })
          .catch(() => {
            push({ title: 'WhatsApp failed', message: 'Backend not reachable (start /backend)', variant: 'error' })
          })
      }
      inFlightRef.current = false
    }

    const t = window.setInterval(() => {
      recognizeFace()
        .catch(() => {})
        .finally(() => {
          inFlightRef.current = false
        })
    }, 140)

    return () => {
      alive = false
      window.clearInterval(t)
    }
  }, [mode, modelsReady, cameraReady, aiAvailable])

  const statusHint = useMemo(() => {
    if (cameraError) return cameraError
    if (!cameraReady && !modelsReady) return 'Starting camera…'
    if (cameraReady && !modelsReady) return `Loading AI… ${modelsPct}%`
    if (cameraReady && modelsReady && !aiAvailable) return 'Camera ready — AI recognition unavailable'
    if (detect.status === 'NO_ENROLLED') return 'No enrolled users with photos — add users in /users'
    if (detect.status === 'NO_FACE') return 'No face detected — look at camera'
    if (detect.status === 'PRESENT') return '✓ Match found — attendance marked'
    if (detect.status === 'UNKNOWN') return '✗ Unknown face detected'
    if (detect.status === 'SCANNING') return 'Ready — look at camera'
    return 'Starting camera…'
  }, [detect.status, modelsPct, cameraReady, modelsReady, aiAvailable, cameraError])

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="glass neon-ring relative overflow-hidden p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold">Live face scan</div>

            <div className="flex flex-wrap items-center gap-2">
              <ToggleBar
                value={mode}
                onChange={setMode}
                options={MODES.map((m) => ({ value: m, label: m }))}
              />

              <button
                type="button"
                className="btn-ghost"
                onClick={async () => {
                  setQrOpen(true)
                  setQrState({ status: 'SCANNING', message: 'QR fallback enabled — scan your code' })
                }}
              >
                <QrCode className="h-4 w-4" />
                Manual QR fallback
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setSessionOpen(true)
                }}
              >
                🔲 Generate Session QR
              </button>
            </div>
          </div>

          <div className="relative mt-4 aspect-video overflow-hidden rounded-3xl bg-black/40">
            <div className="scan-border" />
            {cameraError ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center text-white/75">
                <VideoOff className="h-8 w-8" />
                <div className="text-sm font-semibold">🎥 Camera access needed</div>
                <div className="text-xs text-white/55">{cameraError}</div>
                <button type="button" className="btn-primary" onClick={startCamera}>
                  Try Again
                </button>
                <div className="text-xs text-white/45">Or use browser address bar → click 🔒 → Allow Camera</div>
              </div>
            ) : (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: 24,
                    display: 'block',
                    backgroundColor: '#000',
                    opacity: 0.95,
                  }}
                />
                <canvas
                  ref={canvasRef}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                  }}
                />

                <ScanOverlay
                  status={detect.status === 'SCANNING' ? 'SCANNING' : detect.status}
                  name={detect.name}
                  confidence={detect.confidence}
                  footerMessage={
                    qrOpen
                      ? qrState.status === 'ERROR'
                        ? qrState.message
                        : qrState.status === 'OK'
                          ? 'QR Check-in Recorded'
                          : 'QR scanner active'
                      : motionUi.status === 'NEED'
                        ? motionUi.message
                        : statusHint
                  }
                  footerTone={
                    qrOpen
                      ? qrState.status === 'ERROR'
                        ? 'red'
                        : qrState.status === 'OK'
                          ? 'green'
                          : 'neutral'
                      : motionUi.tone === 'yellow'
                        ? 'yellow'
                        : motionUi.tone === 'green'
                          ? 'green'
                          : 'neutral'
                  }
                  centerMessage={
                    qrOpen
                      ? '📷 Scan Student/Employee QR (valid 60s)'
                      : null
                  }
                  centerTone={qrOpen ? 'neutral' : 'neutral'}
                />

                {!modelsReady ? (
                  <div className="absolute left-4 right-4 top-4 rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-xs text-white/80 backdrop-blur">
                    <div className="flex items-center justify-between">
                      <span>Loading AI… {modelsPct}%</span>
                      <span className="text-white/55">Camera ready</span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,var(--verifai-green),var(--verifai-cyan))] transition-[width] duration-300"
                        style={{ width: `${modelsPct}%` }}
                      />
                    </div>
                  </div>
                ) : null}

                {qrOpen ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="glass neon-ring w-[340px] max-w-[calc(100%-2rem)] p-4">
                      <div className="text-sm font-semibold">QR Scanner</div>
                      <div className="mt-1 text-xs text-white/60">
                        Valid for 60 seconds (server-verified)
                      </div>
                      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                        <div id={qrElId} className="h-[260px] w-full" />
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="text-xs text-white/70">{qrState.message}</div>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => {
                            setQrOpen(false)
                            setQrState({ status: 'IDLE', message: '' })
                          }}
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {sessionOpen ? (
            <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSessionOpen(false)} />
              <div className="glass neon-ring relative w-full max-w-[760px] overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <div className="text-sm font-semibold">Session QR</div>
                  <button type="button" className="btn-ghost" onClick={() => setSessionOpen(false)}>
                    Close
                  </button>
                </div>
                <div className="p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <label className="text-xs text-white/60">
                        Subject
                        <input
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-[rgba(0,255,136,0.35)]"
                        />
                      </label>

                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/70">
                        <div className="font-semibold text-white/85">Auto refresh</div>
                        <div className="mt-1">QR refreshes every 1 minute.</div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/70">
                        <div className="font-semibold text-white/85">Countdown</div>
                        <div className="mt-1">
                          {session?.expiresAt ? (
                            <>
                              QR expires in{' '}
                              <span className="font-semibold text-white">
                                {Math.max(0, Math.floor((session.expiresAt - sessionNow) / 1000))}s
                              </span>
                            </>
                          ) : (
                            'Generating…'
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center">
                      <div className="rounded-3xl border border-white/10 bg-white p-4">
                        {session ? (
                          <QRCodeComp
                            value={JSON.stringify({
                              sessionId: session.sessionId,
                              teacherId: session.teacherId,
                              subject: session.subject,
                              date: session.date,
                              expiresAt: session.expiresAt,
                            })}
                            size={240}
                          />
                        ) : (
                          <div className="h-[240px] w-[240px]" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-4">
            <div
              className={cn(
                'glass neon-ring flex items-center justify-between gap-3 px-4 py-3',
                detect.status === 'PRESENT' && 'ring-1 ring-[rgba(0,255,136,0.35)]',
                detect.status === 'UNKNOWN' && 'ring-1 ring-red-500/25',
                detect.status === 'NO_FACE' && 'ring-1 ring-yellow-400/25',
              )}
            >
              <div className="min-w-0">
                <div className="text-xs text-white/60">Status</div>
                <div className="mt-1 truncate text-sm font-semibold">
                  {detect.status === 'PRESENT' && detect.name ? `✓ ${detect.name} — PRESENT (${Math.round((detect.confidence ?? 0) * 100)}%)` : null}
                  {detect.status === 'UNKNOWN' ? '✗ Unknown Face Detected' : null}
                  {detect.status === 'NO_FACE' ? '👤 No face detected — look at camera' : null}
                  {detect.status === 'NO_ENROLLED' ? 'Add enrolled users in /users first' : null}
                  {detect.status === 'SCANNING' ? 'Ready — look at camera' : null}
                  {!cameraReady && !cameraError ? 'Starting camera…' : null}
                </div>
              </div>
              <span
                className={cn(
                  'rounded-full px-2 py-1 text-[11px] font-semibold ring-1',
                  detect.status === 'PRESENT' && 'bg-[rgba(0,255,136,0.14)] text-[color:var(--verifai-green)] ring-[rgba(0,255,136,0.25)]',
                  detect.status === 'UNKNOWN' && 'bg-red-500/10 text-red-200 ring-red-500/20',
                  detect.status === 'NO_FACE' && 'bg-yellow-400/10 text-yellow-200 ring-yellow-400/20',
                  (detect.status === 'SCANNING' || detect.status === 'NO_ENROLLED') &&
                    'bg-white/5 text-white/70 ring-white/10',
                )}
              >
                {detect.status === 'PRESENT'
                  ? 'PRESENT'
                  : detect.status === 'UNKNOWN'
                    ? 'UNKNOWN'
                    : detect.status === 'NO_FACE'
                      ? 'NO FACE'
                      : detect.status === 'NO_ENROLLED'
                        ? 'NO USERS'
                        : !modelsReady
                          ? 'LOADING AI'
                          : !cameraReady
                            ? 'STARTING'
                            : aiAvailable
                              ? 'READY'
                              : 'CAMERA ONLY'}
              </span>
            </div>
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
                      x.status === 'UNKNOWN' && 'bg-red-500/10 text-red-200 ring-red-500/20',
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
            <li>Face can be detected anywhere in the camera frame.</li>
            <li>Ensure good lighting for higher confidence.</li>
            <li>Use QR fallback for low-connectivity moments.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

