import { useEffect, useMemo, useState } from 'react'
import { Download, FileText, CalendarDays, Filter } from 'lucide-react'
import { usePageTitle } from '../components/layout/AppLayout.jsx'
import { apiGetAttendance } from '../lib/api.js'
import { MOCK_DEPARTMENTS } from '../data/mock.js'
import { useToast } from '../components/ToastProvider.jsx'
import { cn } from '../lib/cn.js'

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

export default function Attendance() {
  const { setTitle } = usePageTitle()
  const { push } = useToast()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [dept, setDept] = useState('All')
  const [status, setStatus] = useState('All')
  const [method, setMethod] = useState('All')

  useEffect(() => setTitle('Attendance'), [setTitle])

  useEffect(() => {
    let alive = true
    async function run() {
      setLoading(true)
      const data = await apiGetAttendance()
      if (!alive) return
      setRecords(data)
      setLoading(false)
    }
    run()
    return () => {
      alive = false
    }
  }, [])

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const okDate = !date || r.date === date
      const okDept = dept === 'All' || r.department === dept
      const okStatus = status === 'All' || r.status === status
      const okMethod = method === 'All' || r.method === method
      return okDate && okDept && okStatus && okMethod
    })
  }, [records, date, dept, status, method])

  return (
    <div className="space-y-4">
      <div className="glass neon-ring flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
            <CalendarDays className="h-4 w-4 text-[color:var(--verifai-cyan)]" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-white/85 outline-none"
            />
          </div>

          <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
            <Filter className="h-4 w-4 text-[color:var(--verifai-green)]" />
            <select value={dept} onChange={(e) => setDept(e.target.value)} className="bg-transparent text-white/85 outline-none">
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
              className="bg-transparent text-white/85 outline-none"
            >
              <option value="All">All status</option>
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="LATE">Late</option>
            </select>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="bg-transparent text-white/85 outline-none"
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
            className="btn-ghost"
            onClick={() => downloadCsv(`verifai-attendance-${date || 'all'}.csv`, filtered)}
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => push({ title: 'PDF export', message: 'Mock action — wire a PDF generator next', variant: 'info' })}
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
                    // eslint-disable-next-line react/no-array-index-key
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

