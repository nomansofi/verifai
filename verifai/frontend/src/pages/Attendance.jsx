import { useEffect, useMemo, useState } from 'react'
import { Download, FileText, CalendarDays, Filter, Send } from 'lucide-react'
import { jsPDF } from 'jspdf'
import { usePageTitle } from '../components/layout/pageTitleContext.js'
import { apiGetAttendance } from '../lib/api.js'
import { MOCK_DEPARTMENTS } from '../data/mock.js'
import { useToast } from '../components/toastContext.js'
import { cn } from '../lib/cn.js'
import { loadUsersDb } from '../lib/usersDb.js'
import { loadWhatsAppTemplates } from '../lib/whatsappTemplates.js'

function StatusPill({ status }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-1 text-[11px] font-semibold ring-1',
        status === 'PRESENT' &&
          'bg-[rgba(0,255,136,0.14)] text-[color:var(--verifai-green)] ring-[rgba(0,255,136,0.25)]',
        status === 'ABSENT' && 'bg-red-500/10 text-red-300 ring-red-500/20',
        status === 'LATE' && 'bg-yellow-400/10 text-yellow-200 ring-yellow-400/20',
      )}
    >
      {status}
    </span>
  )
}

function downloadCsv(filename, rows) {
  const header = ['Name', 'ID', 'Department', 'Date', 'Time In', 'Time Out', 'Status', 'Method']
  const csv = [
    header.join(','),
    ...rows.map((r) =>
      [r.name, r.userId, r.department, r.date, r.timeIn || '', r.timeOut || '', r.status, r.method]
        .map((x) => `"${String(x).replaceAll('"', '""')}"`)
        .join(','),
    ),
  ].join('\n')
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

async function blobToDataUrl(blob) {
  return await new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('Failed to read blob'))
    r.readAsDataURL(blob)
  })
}

async function loadLogoDataUrl() {
  const res = await fetch('/verifai-logo.png', { cache: 'force-cache' })
  const blob = await res.blob()
  return await blobToDataUrl(blob)
}

async function downloadPdf(filename, rows, meta) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const left = 40
  let y = 48
  const logo = await loadLogoDataUrl().catch(() => null)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  if (logo) {
    doc.addImage(logo, 'PNG', left, y - 22, 28, 28)
  }
  doc.text('VerifAi — Attendance Records', left + (logo ? 36 : 0), y)
  y += 18

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Exported: ${new Date().toLocaleString()}`, left, y)
  y += 14
  doc.text(`Filters: ${meta}`, left, y)
  y += 18

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Name', left, y)
  doc.text('ID', left + 180, y)
  doc.text('Date', left + 290, y)
  doc.text('Status', left + 360, y)
  doc.text('Method', left + 430, y)
  y += 12
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(0.5)
  doc.setDrawColor(60, 60, 60)
  doc.line(left, y, 560, y)
  y += 12

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const pageBottom = 780
  const maxRows = Math.min(rows.length, 120)
  for (let i = 0; i < maxRows; i++) {
    const r = rows[i]
    if (y > pageBottom) {
      doc.addPage()
      y = 48
    }
    doc.text(String(r.name).slice(0, 28), left, y)
    doc.text(String(r.userId), left + 180, y)
    doc.text(String(r.date), left + 290, y)
    doc.text(String(r.status), left + 360, y)
    doc.text(String(r.method), left + 430, y)
    y += 14
  }
  if (rows.length > maxRows) {
    if (y > pageBottom) {
      doc.addPage()
      y = 48
    }
    doc.setFontSize(9)
    doc.text(`… truncated (${rows.length - maxRows} more rows)`, left, y)
  }

  doc.save(filename)
}

export default function Attendance() {
  const { setTitle } = usePageTitle()
  const { push } = useToast()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [broadcasting, setBroadcasting] = useState(false)

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [dept, setDept] = useState('All')
  const [status, setStatus] = useState('All')
  const [method, setMethod] = useState('All')

  useEffect(() => setTitle('Attendance'), [setTitle])

  useEffect(() => {
    let alive = true
    async function run() {
      setLoading(true)
      const params = {
        ...(dept !== 'All' ? { department: dept } : {}),
        ...(status !== 'All' ? { status } : {}),
        ...(method !== 'All' ? { method } : {}),
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {}),
      }
      const data = await apiGetAttendance(params)
      if (!alive) return
      setRecords(data)
      setLoading(false)
    }
    run()
    return () => {
      alive = false
    }
  }, [dept, status, method, startDate, endDate])

  const filtered = useMemo(() => {
    return records
  }, [records])

  return (
    <div className="space-y-4">
      <div className="glass neon-ring flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--verifai-border)] bg-[color:var(--verifai-card)] px-3 py-2 text-xs text-[color:var(--verifai-muted)]">
            <CalendarDays className="h-4 w-4 text-[color:var(--verifai-cyan)]" />
            <div className="flex items-center gap-2">
              <span className="text-[color:var(--verifai-muted)]">From</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-[color:var(--verifai-text)] outline-none"
              />
              <span className="text-[color:var(--verifai-muted)]">To</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-[color:var(--verifai-text)] outline-none"
              />
              <button type="button" className="btn-ghost !px-3 !py-1.5" onClick={() => { setStartDate(today); setEndDate(today) }}>
                Today
              </button>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--verifai-border)] bg-[color:var(--verifai-card)] px-3 py-2 text-xs text-[color:var(--verifai-muted)]">
            <Filter className="h-4 w-4 text-[color:var(--verifai-green)]" />
            <select value={dept} onChange={(e) => setDept(e.target.value)} className="bg-transparent text-[color:var(--verifai-text)] outline-none">
              <option value="All">All depts</option>
              {MOCK_DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-transparent text-[color:var(--verifai-text)] outline-none"
            >
              <option value="All">All status</option>
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="LATE">Late</option>
            </select>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="bg-transparent text-[color:var(--verifai-text)] outline-none"
            >
              <option value="All">All methods</option>
              <option value="FACE">Face</option>
              <option value="QR">QR</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className={cn('btn-primary', broadcasting && 'opacity-60')}
            disabled={broadcasting}
            onClick={async () => {
              setBroadcasting(true)
              try {
                const db = loadUsersDb()
                const students = db.filter((u) => u.role === 'student')
                const templates = loadWhatsAppTemplates()
                const todayKey = new Date().toDateString()

                push({ title: 'Broadcast started', message: `Sending to ${students.length} students…`, variant: 'info' })
                const res = await fetch('http://localhost:3001/api/notify/broadcast/daily', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    students,
                    todayKey,
                    subject: 'General',
                    templates,
                    paceMs: 500,
                  }),
                }).then((r) => r.json())

                if (!res?.success) {
                  push({ title: 'Broadcast failed', message: res?.error || 'Unknown error', variant: 'error' })
                  return
                }
                push({
                  title: 'Broadcast complete',
                  message: `${res.sent} sent • ${res.failed} failed • ${res.skipped} skipped`,
                  variant: res.failed ? 'error' : 'success',
                })
              } catch {
                push({ title: 'Broadcast failed', message: 'Backend not reachable (start /backend)', variant: 'error' })
              } finally {
                setBroadcasting(false)
              }
            }}
          >
            <Send className="h-4 w-4" /> Send All Notifications
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => downloadCsv(`verifai-attendance-${startDate || 'all'}_to_${endDate || 'all'}.csv`, filtered)}
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              ;(async () => {
                try {
                const meta = [
                  startDate && endDate ? `${startDate} → ${endDate}` : 'all dates',
                  dept !== 'All' ? `dept=${dept}` : null,
                  status !== 'All' ? `status=${status}` : null,
                  method !== 'All' ? `method=${method}` : null,
                ].filter(Boolean).join(' • ')
                await downloadPdf(`verifai-attendance-${startDate || 'all'}_to_${endDate || 'all'}.pdf`, filtered, meta || 'none')
                push({ title: 'PDF exported', message: `${Math.min(filtered.length, 120)} rows`, variant: 'success' })
                } catch {
                push({ title: 'PDF export failed', message: 'Try CSV export or reload the page', variant: 'error' })
                }
              })()
            }}
          >
            <FileText className="h-4 w-4" /> Export PDF
          </button>
        </div>
      </div>

      <div className="glass overflow-hidden">
        <div className="border-b border-white/10 px-4 py-3">
          <div className="text-sm font-semibold">Attendance records</div>
          <div className="mt-0.5 text-xs text-white/60">{filtered.length} rows</div>
        </div>

        <div className="overflow-auto">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead className="bg-white/5 text-xs text-white/60">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Time In</th>
                <th className="px-4 py-3 font-medium">Time Out</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading
                ? Array.from({ length: 12 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3">
                        <div className="skeleton h-4 w-40" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="skeleton h-4 w-24" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="skeleton h-4 w-16" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="skeleton h-4 w-16" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="skeleton h-4 w-16" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="skeleton h-6 w-20 rounded-full" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="skeleton h-4 w-16" />
                      </td>
                    </tr>
                  ))
                : filtered.slice(0, 250).map((r) => (
                    <tr key={r.id} className="hover:bg-white/5">
                      <td className="px-4 py-3 font-medium">{r.name}</td>
                      <td className="px-4 py-3 text-white/80">{r.userId}</td>
                      <td className="px-4 py-3 text-white/80">{r.department}</td>
                      <td className="px-4 py-3 text-white/80">{r.timeIn ?? '—'}</td>
                      <td className="px-4 py-3 text-white/80">{r.timeOut ?? '—'}</td>
                      <td className="px-4 py-3">
                        <StatusPill status={r.status} />
                      </td>
                      <td className="px-4 py-3 text-white/80">{r.method}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

