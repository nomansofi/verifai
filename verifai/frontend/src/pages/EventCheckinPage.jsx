import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as faceapi from '@vladmandic/face-api'
import { usePageTitle } from '../components/layout/pageTitleContext.js'
import { useToast } from '../components/toastContext.js'
import { getEventById, updateEvent } from '../lib/verifaiDb.js'
import { loadUsersDb } from '../lib/usersDb.js'
import { loadFaceModels, parseMatchLabel, toLabeledDescriptors } from '../lib/faceApi.js'
import ToggleBar from '../components/ToggleBar.jsx'

function handleCheckin({ matchedName, confidence, eventId }) {
  const events = JSON.parse(localStorage.getItem('verifai_events') || '[]')
  const event = events.find((e) => e.id === eventId)
  const db = JSON.parse(localStorage.getItem('verifai_users_db') || '[]')
  const user = db.find((u) => u.name === matchedName)

  if (!event || !user) return { status: 'unknown', message: 'Face not found in database' }
  const isApproved = (event.approvedAttendees || []).some((a) => a.id === user.id)
  if (!isApproved) {
    const denied = {
      id: user.id,
      attendeeName: user.name,
      status: 'denied',
      accessZone: user.accessZone || 'General',
      timestamp: new Date().toISOString(),
      message: 'Not on approved attendee list',
    }
    event.denied = [denied, ...(event.denied || [])].slice(0, 300)
    events[events.findIndex((e) => e.id === event.id)] = event
    localStorage.setItem('verifai_events', JSON.stringify(events))
    return denied
  }
  const alreadyIn = (event.checkedIn || []).some((c) => c.id === user.id)
  if (alreadyIn) {
    return {
      status: 'duplicate',
      attendeeName: user.name,
      message: 'Already checked in',
      accessZone: user.accessZone || 'General',
      timestamp: new Date().toISOString(),
    }
  }

  const checkInRecord = {
    id: user.id,
    attendeeName: user.name,
    ticketId: user.ticketId || 'TKT-WALK',
    status: 'checked-in',
    accessZone: user.accessZone || 'General',
    matchConfidence: confidence,
    greeting: `Welcome to the conference, ${user.name.split(' ')[0]}!`,
    timestamp: new Date().toISOString(),
  }
  event.checkedIn = [...(event.checkedIn || []), checkInRecord]
  events[events.findIndex((e) => e.id === event.id)] = event
  localStorage.setItem('verifai_events', JSON.stringify(events))
  return checkInRecord
}

export default function EventCheckinPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { push } = useToast()
  const { setTitle } = usePageTitle()
  const [event, setEvent] = useState(() => getEventById(id))
  const [mode, setMode] = useState('Student')
  const [result, setResult] = useState(null)
  const [liveLog, setLiveLog] = useState(() => (getEventById(id)?.checkedIn || []).slice().reverse())
  const [loadingAi, setLoadingAi] = useState(true)
  const videoRef = useRef(null)
  const [cameraErr, setCameraErr] = useState(null)

  useEffect(() => setTitle('AI Event Check-in'), [setTitle])

  useEffect(() => {
    let on = true
    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        if (videoRef.current) videoRef.current.srcObject = stream
        await loadFaceModels({ modelUri: 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model' })
      } catch {
        if (on) setCameraErr('Camera or AI models unavailable')
      } finally {
        if (on) setLoadingAi(false)
      }
    })()
    return () => {
      on = false
      const s = videoRef.current?.srcObject
      s?.getTracks?.().forEach((t) => t.stop())
    }
  }, [])

  const stats = useMemo(() => {
    const checked = liveLog.filter((x) => x.status === 'checked-in').length
    const denied = liveLog.filter((x) => x.status === 'denied').length
    const dup = liveLog.filter((x) => x.status === 'duplicate').length
    return { checked, denied, dup }
  }, [liveLog])

  if (!event) return <div className="glass p-6 text-sm">Event not found.</div>

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.9fr_0.9fr]">
      <div className="glass p-4">
        <div className="text-sm font-semibold">AI Face Check-in — {event.name}</div>
        <div className="mt-3">
          <ToggleBar value={mode} onChange={setMode} options={[{ value: 'Student', label: 'Student' }, { value: 'Staff', label: 'Staff' }, { value: 'VIP', label: 'VIP' }]} />
        </div>
        <div className="relative mt-3 aspect-video overflow-hidden rounded-2xl bg-black/40">
          <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
          <div className="absolute inset-0 rounded-2xl border border-[rgba(0,255,136,0.4)] animate-pulse" />
          <div className="absolute bottom-3 left-3 rounded-xl bg-black/60 px-3 py-2 text-xs text-white/85">🔍 Scanning... look at camera</div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            className="btn-primary"
            disabled={loadingAi || !!cameraErr}
            onClick={async () => {
              try {
                const db = loadUsersDb().filter((u) => Array.isArray(u.faceDescriptor) && u.faceDescriptor.length)
                if (!db.length) throw new Error('No enrolled users with descriptors')
                const labeled = toLabeledDescriptors(db)
                const matcher = new faceapi.FaceMatcher(labeled, 0.6)
                const det = await faceapi
                  .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }))
                  .withFaceLandmarks()
                  .withFaceDescriptor()
                if (!det) {
                  const r = { status: 'unknown', message: 'Face not found in database', timestamp: new Date().toISOString() }
                  setResult(r)
                  setLiveLog((l) => [r, ...l].slice(0, 120))
                  return
                }
                const best = matcher.findBestMatch(det.descriptor)
                if (best.label === 'unknown' || best.distance > 0.6) {
                  const r = { status: 'unknown', message: 'Face not found in database', timestamp: new Date().toISOString() }
                  setResult(r)
                  setLiveLog((l) => [r, ...l].slice(0, 120))
                  return
                }
                const person = parseMatchLabel(best.label).name
                const confidence = Math.round((1 - best.distance / 0.6) * 100)
                const check = handleCheckin({ matchedName: person, confidence, eventId: id })
                setResult(check)
                setLiveLog((l) => [{ ...check, timestamp: check.timestamp || new Date().toISOString() }, ...l].slice(0, 120))
                setEvent(getEventById(id))
                push({
                  title:
                    check.status === 'checked-in'
                      ? 'Access granted'
                      : check.status === 'duplicate'
                        ? 'Already checked in'
                        : check.status === 'denied'
                          ? 'Access denied'
                          : 'Unknown person',
                  message: check.attendeeName || check.message || 'Processed',
                  variant: check.status === 'checked-in' ? 'success' : check.status === 'duplicate' ? 'info' : 'error',
                })
              } catch (e) {
                push({ title: 'Check-in failed', message: e?.message || 'Unknown error', variant: 'error' })
              }
            }}
          >
            🎯 Run AI Check-in
          </button>
          <button className="btn-ghost" onClick={() => nav(`/events/${id}/attendees`)}>Manage Attendees</button>
        </div>
        {cameraErr ? <div className="mt-2 text-xs text-red-300">{cameraErr}</div> : null}
      </div>

      <div className="glass p-4">
        <div className="text-sm font-semibold">Detection Result</div>
        <div
          className={`mt-3 rounded-2xl border p-4 ${
            result?.status === 'checked-in'
              ? 'border-[rgba(0,255,136,0.35)] bg-[rgba(0,255,136,0.10)]'
              : result?.status === 'denied'
                ? 'border-red-500/30 bg-red-500/10'
                : result?.status === 'duplicate'
                  ? 'border-orange-400/30 bg-orange-400/10'
                  : 'border-white/10 bg-white/5'
          }`}
        >
          {!result ? (
            <div className="text-sm text-white/70">No result yet.</div>
          ) : (
            <>
              <div className="text-lg font-semibold">
                {result.status === 'checked-in' ? '✅ ACCESS GRANTED' : result.status === 'denied' ? '❌ ACCESS DENIED' : result.status === 'duplicate' ? '⚠️ ALREADY CHECKED IN' : '👤 UNKNOWN PERSON'}
              </div>
              <div className="mt-2 text-sm">{result.attendeeName || result.message || 'Unknown'}</div>
              {'ticketId' in (result || {}) ? <div className="mt-1 text-xs">Ticket: {result.ticketId}</div> : null}
              {'accessZone' in (result || {}) ? <div className="text-xs">Zone: {result.accessZone}</div> : null}
              {'greeting' in (result || {}) ? <div className="mt-2 text-sm">{result.greeting}</div> : null}
            </>
          )}
        </div>
        <details className="mt-3 text-xs">
          <summary className="cursor-pointer text-white/80">🔧 Raw Output</summary>
          <pre className="mt-2 overflow-auto rounded-xl border border-white/10 bg-black/30 p-3">{JSON.stringify(result, null, 2)}</pre>
        </details>
      </div>

      <div className="glass p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Check-in Log</div>
          <span className="rounded-full bg-[rgba(0,255,136,0.14)] px-2 py-0.5 text-[11px] ring-1 ring-[rgba(0,255,136,0.25)]">Live</span>
        </div>
        <div className="mt-3 max-h-[430px] space-y-2 overflow-auto">
          {liveLog.map((x, i) => (
            <div key={`${x.id || x.attendeeName || 'u'}-${i}`} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs">
              <div className="font-semibold">
                {x.status === 'checked-in' ? '✅' : x.status === 'duplicate' ? '⚠️' : x.status === 'denied' ? '❌' : '👤'} {x.attendeeName || 'Unknown'}
              </div>
              <div className="mt-0.5 text-white/65">{x.accessZone || x.status || 'unknown'} — {new Date(x.timestamp || Date.now()).toLocaleTimeString()}</div>
            </div>
          ))}
          {liveLog.length === 0 ? <div className="text-xs text-white/60">No check-ins yet.</div> : null}
        </div>
        <div className="mt-3 text-xs">✅ Checked In: {stats.checked} | ❌ Denied: {stats.denied} | ⚠️ Duplicates: {stats.dup}</div>
      </div>
    </div>
  )
}

