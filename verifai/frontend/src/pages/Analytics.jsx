import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts'
import { TrendingUp, Users, UserMinus } from 'lucide-react'
import { usePageTitle } from '../components/layout/pageTitleContext.js'
import { apiGetAttendance } from '../lib/api.js'
import { MOCK_DEPARTMENTS } from '../data/mock.js'
import { cn } from '../lib/cn.js'
import ToggleBar from '../components/ToggleBar.jsx'

function HeatCell({ value }) {
  const level = value >= 95 ? 4 : value >= 90 ? 3 : value >= 80 ? 2 : value >= 70 ? 1 : 0
  const bg =
    level === 4
      ? 'bg-[rgba(0,255,136,0.30)] ring-[rgba(0,255,136,0.28)]'
      : level === 3
        ? 'bg-[rgba(0,255,136,0.18)] ring-[rgba(0,255,136,0.18)]'
        : level === 2
          ? 'bg-[rgba(0,212,255,0.14)] ring-[rgba(0,212,255,0.16)]'
          : level === 1
            ? 'bg-white/8 ring-white/10'
            : 'bg-white/5 ring-white/10'
  return <div className={cn('h-6 w-6 rounded-md ring-1', bg)} title={`${value}%`} />
}

export default function Analytics() {
  const { setTitle } = usePageTitle()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('trends') // trends | departments

  useEffect(() => setTitle('Analytics'), [setTitle])
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

  const derived = useMemo(() => {
    if (records.length === 0) return null

    const byDate = new Map()
    for (const r of records) {
      if (!byDate.has(r.date)) byDate.set(r.date, { date: r.date, present: 0, late: 0, absent: 0, total: 0 })
      const d = byDate.get(r.date)
      d.total += 1
      if (r.status === 'PRESENT') d.present += 1
      else if (r.status === 'LATE') d.late += 1
      else d.absent += 1
    }
    const dates = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))
    const trend = dates.map((d) => ({
      date: d.date.slice(5),
      rate: Math.round(((d.present + d.late) / d.total) * 100),
    }))

    const deptRate = MOCK_DEPARTMENTS.map((dep) => {
      const depRecords = records.filter((r) => r.department === dep)
      const ok = depRecords.filter((r) => r.status !== 'ABSENT').length
      const rate = depRecords.length ? Math.round((ok / depRecords.length) * 100) : 0
      return { dep, rate }
    })

    const absentCounts = new Map()
    for (const r of records) {
      if (r.status === 'ABSENT') absentCounts.set(r.userId, (absentCounts.get(r.userId) ?? 0) + 1)
    }
    const topAbsent = Array.from(absentCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId, count]) => {
        const any = records.find((x) => x.userId === userId)
        return { userId, name: any?.name ?? userId, count }
      })

    const last7 = trend.slice(-7)
    const prev7 = trend.slice(-14, -7)
    const avg = (arr) => (arr.length ? arr.reduce((s, x) => s + x.rate, 0) / arr.length : 0)
    const thisWeek = Math.round(avg(last7))
    const lastWeek = Math.round(avg(prev7))
    const delta = thisWeek - lastWeek

    // Heatmap: 30 days into 6x5 grid (like a mini calendar)
    const heat = trend.slice(-30).map((x) => x.rate)
    while (heat.length < 30) heat.unshift(0)
    const heatRows = []
    for (let i = 0; i < 5; i++) heatRows.push(heat.slice(i * 6, i * 6 + 6))

    return { trend, deptRate, topAbsent, thisWeek, lastWeek, delta, heatRows }
  }, [records])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold">Analytics</div>
        <ToggleBar
          value={view}
          onChange={setView}
          options={[
            { value: 'trends', label: 'Trends' },
            { value: 'departments', label: 'Departments' },
          ]}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-white/60">30-day trend</div>
              <div className="mt-1 text-xl font-semibold">{derived ? `${derived.thisWeek}%` : '—'}</div>
            </div>
            <div className="rounded-xl bg-[rgba(0,212,255,0.12)] p-2 text-[color:var(--verifai-cyan)] ring-1 ring-[rgba(0,212,255,0.22)]">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-xs text-white/60">
            AI summary: Attendance this week is{' '}
            <span className="text-white/85 font-semibold">{derived ? `${derived.thisWeek}%` : '—'}</span>,{' '}
            {derived ? (derived.delta >= 0 ? 'up' : 'down') : '—'}{' '}
            <span className="text-white/85 font-semibold">{derived ? `${Math.abs(derived.delta)}%` : '—'}</span> from last week.
          </div>
        </div>

        <div className="glass px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-white/60">Most absent (top 5)</div>
              <div className="mt-1 text-xl font-semibold">{derived ? derived.topAbsent[0]?.count ?? 0 : '—'}</div>
            </div>
            <div className="rounded-xl bg-red-500/10 p-2 text-red-300 ring-1 ring-red-500/20">
              <UserMinus className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 space-y-1 text-xs text-white/70">
            {loading ? (
              <div className="skeleton h-4 w-44" />
            ) : (
              (derived?.topAbsent ?? []).map((x) => (
                <div key={x.userId} className="flex items-center justify-between gap-3">
                  <span className="truncate">{x.name}</span>
                  <span className="text-white/55">{x.count} absences</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-white/60">Departments tracked</div>
              <div className="mt-1 text-xl font-semibold">{MOCK_DEPARTMENTS.length}</div>
            </div>
            <div className="rounded-xl bg-[rgba(0,255,136,0.14)] p-2 text-[color:var(--verifai-green)] ring-1 ring-[rgba(0,255,136,0.25)]">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {MOCK_DEPARTMENTS.map((d) => (
              <div key={d} className="rounded-lg bg-white/5 px-2 py-1 text-center text-[11px] text-white/70 ring-1 ring-white/10">
                {d}
              </div>
            ))}
          </div>
        </div>
      </div>

      {view !== 'trends' ? null : (
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass overflow-hidden lg:col-span-2">
          <div className="border-b border-white/10 px-4 py-3">
            <div className="text-sm font-semibold">Attendance trend (last 30 days)</div>
            <div className="mt-0.5 text-xs text-white/60">Verification rate per day</div>
          </div>
          <div className="h-[320px] px-2 py-3">
            {loading || !derived ? (
              <div className="mx-4 mt-4 h-[260px] skeleton" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={derived.trend.slice(-30)} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 12 }} axisLine={false} tickLine={false} width={34} domain={[60, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(10,10,10,0.95)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 12,
                    }}
                    labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
                  />
                  <Line type="monotone" dataKey="rate" stroke="rgba(0,255,136,0.9)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="glass overflow-hidden">
          <div className="border-b border-white/10 px-4 py-3">
            <div className="text-sm font-semibold">Absenteeism heatmap</div>
            <div className="mt-0.5 text-xs text-white/60">Mini calendar (rate per day)</div>
          </div>
          <div className="p-4">
            {loading || !derived ? (
              <div className="grid grid-cols-6 gap-2">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div key={i} className="skeleton h-6 w-6 rounded-md" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {derived.heatRows.map((row, i) => (
                  <div key={i} className="grid grid-cols-6 gap-2">
                    {row.map((v, j) => (
                      <HeatCell key={j} value={v} />
                    ))}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 text-xs text-white/60">
              Higher intensity = better attendance rate.
            </div>
          </div>
        </div>
      </div>
      )}

      {view !== 'departments' ? null : (
      <div className="glass overflow-hidden">
        <div className="border-b border-white/10 px-4 py-3">
          <div className="text-sm font-semibold">Department-wise attendance</div>
          <div className="mt-0.5 text-xs text-white/60">Average rate over last 30 days</div>
        </div>
        <div className="h-[300px] px-2 py-3">
          {loading || !derived ? (
            <div className="mx-4 mt-4 h-[240px] skeleton" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={derived.deptRate} margin={{ left: 12, right: 12, top: 10, bottom: 0 }}>
                <XAxis dataKey="dep" tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 12 }} axisLine={false} tickLine={false} width={34} domain={[60, 100]} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(10,10,10,0.95)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 12,
                  }}
                  labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
                />
                <Bar dataKey="rate" radius={[10, 10, 0, 0]} fill="rgba(0,212,255,0.85)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      )}
    </div>
  )
}

