import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { jsPDF } from 'jspdf'
import { usePageTitle } from '../components/layout/pageTitleContext.js'
import { getExamById } from '../lib/verifaiDb.js'
import { loadUsersDb } from '../lib/usersDb.js'

function downloadCsv(filename, rows) {
  const header = ['Name', 'ID', 'Score', 'Status', 'Alerts']
  const csv = [header.join(','), ...rows.map((r) => [r.name, r.id, r.score, r.status, r.alerts].map((x) => `"${String(x).replaceAll('"', '""')}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function ExamReportPage() {
  const { id } = useParams()
  const nav = useNavigate()
  usePageTitle().setTitle('Exam Report')
  const exam = getExamById(id)
  const db = loadUsersDb()

  const rows = useMemo(() => {
    if (!exam) return []
    const alerts = exam.proctorLog || []
    return (exam.allowedStudents || []).map((sid) => {
      const u = db.find((x) => x.id === sid)
      const alertCount = alerts.filter((a) => a.studentId === sid && !a.dismissed).length
      const score = Math.max(0, 100 - alertCount * 12)
      return {
        name: u?.name || sid,
        id: u?.username || sid,
        score,
        status: score > 80 ? 'Safe' : score > 60 ? 'Warn' : 'Blocked',
        alerts: alertCount,
      }
    })
  }, [exam, db])

  if (!exam) return <div className="glass p-6 text-sm">Exam not found.</div>

  const totalAlerts = (exam.proctorLog || []).length
  const critical = (exam.proctorLog || []).filter((a) => a.severity === 'critical').length
  const warning = (exam.proctorLog || []).filter((a) => a.severity === 'warning').length
  const alert = (exam.proctorLog || []).filter((a) => a.severity === 'alert').length
  const flagged = rows.filter((r) => r.status !== 'Safe').length
  const blocked = rows.filter((r) => r.status === 'Blocked').length
  const integrity = rows.length ? Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length) : 100

  return (
    <div className="space-y-4">
      <div className="glass neon-ring p-5">
        <div className="text-xl font-semibold">📊 Exam Report — {exam.name}</div>
        <div className="mt-1 text-xs text-white/60">Duration: {exam.duration}h | Date: {exam.date}</div>
        <div className="mt-4 text-sm">Overall Integrity: <span className="font-semibold">{integrity}%</span></div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--verifai-green),var(--verifai-cyan))]" style={{ width: `${integrity}%` }} />
        </div>
        <div className="mt-4 grid gap-2 text-sm md:grid-cols-2 xl:grid-cols-4">
          <div>Students Appeared: <span className="font-semibold">{rows.length}/{exam.allowedStudents?.length || 0}</span></div>
          <div>Fully Verified: <span className="font-semibold">{exam.verifiedStudents?.length || 0}</span></div>
          <div>Flagged: <span className="font-semibold">{flagged}</span></div>
          <div>Blocked: <span className="font-semibold">{blocked}</span></div>
          <div>Total Alerts: <span className="font-semibold">{totalAlerts}</span></div>
          <div>Critical: <span className="font-semibold">{critical}</span></div>
          <div>Warning: <span className="font-semibold">{warning}</span></div>
          <div>Alert: <span className="font-semibold">{alert}</span></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="btn-primary"
            onClick={() => {
              const doc = new jsPDF({ unit: 'pt', format: 'a4' })
              doc.setFontSize(18)
              doc.text(`Exam Report - ${exam.name}`, 40, 50)
              doc.setFontSize(11)
              doc.text(`Integrity: ${integrity}% | Alerts: ${totalAlerts}`, 40, 72)
              let y = 98
              for (const r of rows.slice(0, 40)) {
                doc.text(`${r.name} (${r.id})  |  ${r.score}%  |  ${r.status}  | alerts=${r.alerts}`, 40, y)
                y += 16
                if (y > 780) {
                  doc.addPage()
                  y = 50
                }
              }
              doc.save(`verifai-exam-report-${exam.id}.pdf`)
            }}
          >
            📄 Export PDF Report
          </button>
          <button className="btn-ghost" onClick={() => downloadCsv(`verifai-exam-report-${exam.id}.csv`, rows)}>📊 Export CSV</button>
          <button className="btn-ghost" onClick={() => nav('/exams')}>Back</button>
        </div>
      </div>

      <div className="glass overflow-hidden">
        <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold">Student Integrity Table</div>
        <div className="overflow-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="text-xs text-white/60">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Score</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Alerts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">{r.id}</td>
                  <td className="px-3 py-2">{r.score}%</td>
                  <td className="px-3 py-2">{r.status}</td>
                  <td className="px-3 py-2">{r.alerts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

