import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as faceapi from '@vladmandic/face-api'
import { usePageTitle } from '../components/layout/pageTitleContext.js'
import { useToast } from '../components/toastContext.js'
import { getExamById, updateExam } from '../lib/verifaiDb.js'
import { loadUsersDb } from '../lib/usersDb.js'
import { loadFaceModels, parseMatchLabel, toLabeledDescriptors } from '../lib/faceApi.js'

export default function ExamVerifyPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { push } = useToast()
  const { setTitle } = usePageTitle()
  const [exam, setExam] = useState(() => getExamById(id))
  const [result, setResult] = useState(null)
  const videoRef = useRef(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => setTitle('Student Verification'), [setTitle])
  useEffect(() => {
    let on = true
    ;(async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        if (videoRef.current) videoRef.current.srcObject = s
        await loadFaceModels({ modelUri: 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model' })
      } catch {
        if (on) push({ title: 'Camera issue', message: 'Camera or AI unavailable', variant: 'error' })
      } finally {
        if (on) setLoading(false)
      }
    })()
    return () => {
      on = false
      const s = videoRef.current?.srcObject
      s?.getTracks?.().forEach((t) => t.stop())
    }
  }, [push])

  const db = useMemo(() => loadUsersDb(), [exam?.id])
  const allowed = useMemo(() => (exam?.allowedStudents || []).map((sid) => db.find((u) => u.id === sid)).filter(Boolean), [exam?.allowedStudents, db])
  const verifiedMap = useMemo(() => new Map((exam?.verifiedStudents || []).map((x) => [x.studentId, x])), [exam?.verifiedStudents])

  if (!exam) return <div className="glass p-6 text-sm">Exam not found.</div>

  const verify = async () => {
    try {
      const candidates = allowed.filter((u) => Array.isArray(u.faceDescriptor) && u.faceDescriptor.length)
      if (!candidates.length) throw new Error('No allowed students with face descriptors')
      const matcher = new faceapi.FaceMatcher(toLabeledDescriptors(candidates), 0.6)
      const det = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }))
        .withFaceLandmarks()
        .withFaceDescriptor()
      if (!det) {
        setResult({ identityStatus: 'unauthorized_person', confidenceDetails: 'No face detected', matchScore: 0 })
        return
      }
      const best = matcher.findBestMatch(det.descriptor)
      if (best.label === 'unknown' || best.distance > 0.6) {
        setResult({ identityStatus: 'mismatch', confidenceDetails: 'Face does not match allowed list', matchScore: 0 })
        return
      }
      const { id: sid, name } = parseMatchLabel(best.label)
      const score = Math.round((1 - best.distance / 0.6) * 100)
      const out = {
        studentName: name,
        studentId: sid,
        matchScore: score,
        identityStatus: 'verified',
        allowedForExam: true,
        verifiedAt: new Date().toISOString(),
        integrityLevel: score > 80 ? 'high' : 'compromised',
      }
      const verified = exam.verifiedStudents || []
      const nextVerified = [{ ...out }, ...verified.filter((v) => v.studentId !== sid)]
      const res = updateExam(id, { verifiedStudents: nextVerified })
      if (res.ok) setExam(res.exam)
      setResult(out)
      push({ title: 'Student verified ✅', message: `${name} (${score}%)`, variant: 'success' })
    } catch (e) {
      push({ title: 'Verification failed', message: e?.message || 'Unknown error', variant: 'error' })
    }
  }

  const summary = {
    verified: exam.verifiedStudents?.length || 0,
    failed: Math.max(0, (exam.proctorLog || []).filter((x) => x.type === 'verify-fail').length),
    pending: Math.max(0, (exam.allowedStudents?.length || 0) - (exam.verifiedStudents?.length || 0)),
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="glass p-5">
        <div className="text-lg font-semibold">Pre-Exam Identity Verification</div>
        <div className="text-xs text-white/60">Each student must verify before entering exam hall</div>
        <div className="relative mt-3 aspect-video overflow-hidden rounded-2xl bg-black/40">
          <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
          <div className="absolute inset-0 rounded-2xl border border-[rgba(0,255,136,0.35)]" />
        </div>
        <div className="mt-3 flex gap-2">
          <button className="btn-primary" disabled={loading} onClick={verify}>🔍 Verify Identity</button>
          <button className="btn-ghost" onClick={() => nav('/exams')}>Back</button>
        </div>
        {result ? (
          <div className={`mt-3 rounded-2xl border p-4 ${result.identityStatus === 'verified' ? 'border-[rgba(0,255,136,0.35)] bg-[rgba(0,255,136,0.1)]' : 'border-red-500/30 bg-red-500/10'}`}>
            <div className="text-lg font-semibold">{result.identityStatus === 'verified' ? '✅ IDENTITY VERIFIED' : '❌ IDENTITY MISMATCH'}</div>
            <div className="mt-1 text-sm">{result.studentName || result.confidenceDetails}</div>
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer text-white/80">Raw Output</summary>
              <pre className="mt-2 overflow-auto rounded-xl border border-white/10 bg-black/30 p-3">{JSON.stringify(result, null, 2)}</pre>
            </details>
          </div>
        ) : null}
      </div>

      <div className="glass p-5">
        <div className="text-lg font-semibold">Student Verification Status</div>
        <div className="mt-3 overflow-auto">
          <table className="min-w-[520px] w-full text-sm">
            <thead className="text-xs text-white/60">
              <tr>
                <th className="px-2 py-2 text-left">Name</th>
                <th className="px-2 py-2 text-left">ID</th>
                <th className="px-2 py-2 text-left">Status</th>
                <th className="px-2 py-2 text-left">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {allowed.map((s) => {
                const v = verifiedMap.get(s.id)
                return (
                  <tr key={s.id} className="hover:bg-white/5">
                    <td className="px-2 py-2">{s.name}</td>
                    <td className="px-2 py-2">{s.username}</td>
                    <td className="px-2 py-2">{v ? '✅ Done' : '⏳ Wait'}</td>
                    <td className="px-2 py-2">{v ? `${v.matchScore}%` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-xs">Verified: {summary.verified}/{exam.allowedStudents?.length || 0} | Failed: {summary.failed} | Pending: {summary.pending}</div>
        <button className="btn-primary mt-3 w-full" disabled={summary.pending > 0} onClick={() => nav(`/exams/${id}/proctor`)}>
          ▶ Start Exam & Proctoring
        </button>
      </div>
    </div>
  )
}

