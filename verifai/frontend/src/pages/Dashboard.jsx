import { useEffect, useMemo, useState } from 'react'
import { Pie, PieChart, ResponsiveContainer, Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import { UserCheck, UserX, AlarmClock, ShieldAlert } from 'lucide-react'
import StatCard from '../components/StatCard.jsx'
import LiveFeed from '../components/LiveFeed.jsx'
import AlertPanel from '../components/AlertPanel.jsx'
import { usePageTitle } from '../components/layout/pageTitleContext.js'
import { apiGetAlerts, apiGetAnalytics } from '../lib/api.js'
import { makeDonut } from '../data/mock.js'
import ToggleBar from '../components/ToggleBar.jsx'

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="glass overflow-hidden">
      <div className="border-b border-white/10 px-4 py-3">
        <div className="text-sm font-semibold">{title}</div>
        {subtitle ? <div className="mt-0.5 text-xs text-white/60">{subtitle}</div> : null}
      </div>
      <div className="h-[280px] px-2 py-3">{children}</div>
    </div>
  )
}

export default function Dashboard() {
  const { setTitle } = usePageTitle()
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [view, setView] = useState('overview') // overview | alerts

  useEffect(() => setTitle('Dashboard'), [setTitle])

  useEffect(() => {
    let alive = true
    async function run() {
      setLoading(true)
      const [a, al] = await Promise.all([apiGetAnalytics(), apiGetAlerts()])
      if (!alive) return
      setAnalytics(a)
      setAlerts(al)
      setLoading(false)
    }
    run()
    return () => {
      alive = false
    }
  }, [])

  const snapshot = analytics?.snapshot
  const donut = useMemo(() => (snapshot ? makeDonut(snapshot.pct) : makeDonut(0)), [snapshot])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold">Overview</div>
        <ToggleBar
          value={view}
          onChange={setView}
          options={[
            { value: 'overview', label: 'Overview' },
            { value: 'alerts', label: 'Alerts' },
          ]}
        />
      </div>

      {view === 'alerts' ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="glass p-5 lg:col-span-2">
            <div className="text-sm font-semibold">Security & system alerts</div>
            <div className="mt-1 text-xs text-[color:var(--verifai-muted)]">Unknown faces, mismatches, and notifications</div>
            <div className="mt-4">
              <AlertPanel alerts={alerts} />
            </div>
          </div>
          <div className="glass p-5">
            <div className="text-sm font-semibold">Live feed</div>
            <div className="mt-1 text-xs text-[color:var(--verifai-muted)]">Recent check-ins</div>
            <div className="mt-4">{analytics?.liveFeed ? <LiveFeed items={analytics.liveFeed} /> : <div className="skeleton h-40 w-full" />}</div>
          </div>
        </div>
      ) : null}

      {view !== 'overview' ? null : (
      <>
      <div className="grid gap-4 md:grid-cols-4">
        {loading || !snapshot ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass p-5">
              <div className="skeleton h-4 w-28" />
              <div className="mt-3 skeleton h-8 w-24" />
              <div className="mt-4 skeleton h-7 w-32 rounded-full" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              icon={UserCheck}
              title="Total Present Today"
              value={snapshot.present}
              changePct={+3.4}
              variant="green"
              footer="Verified"
            />
            <StatCard
              icon={UserX}
              title="Total Absent"
              value={snapshot.absent}
              changePct={-1.2}
              variant="red"
              footer="Needs follow-up"
            />
            <StatCard
              icon={AlarmClock}
              title="Late Arrivals"
              value={snapshot.late}
              changePct={+0.6}
              variant="yellow"
              footer="Time window"
            />
            <StatCard
              icon={ShieldAlert}
              title="Unknown Faces / Alerts"
              value={snapshot.unknown}
              changePct={+2.1}
              variant="orange"
              footer="Security"
            />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Attendance percentage" subtitle="Real-time verification rate">
          {loading || !snapshot ? (
            <div className="mx-auto mt-8 h-44 w-44 rounded-full border border-white/10 bg-white/5" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donut}
                  innerRadius={70}
                  outerRadius={92}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  paddingAngle={2}
                >
                  <Cell fill="rgba(0,255,136,0.95)" />
                  <Cell fill="rgba(255,255,255,0.08)" />
                </Pie>
                <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="26">
                  {snapshot.pct}%
                </text>
                <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.55)" fontSize="12">
                  Present / Late
                </text>
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <div className="lg:col-span-2">
          <ChartCard title="Weekly attendance" subtitle="Last 7 days">
            {loading || !analytics ? (
              <div className="h-full px-4">
                <div className="mt-6 grid h-[220px] grid-cols-7 items-end gap-3">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="skeleton w-full" style={{ height: `${40 + i * 18}px` }} />
                  ))}
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.weekly} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 12 }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(10,10,10,0.95)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 12,
                    }}
                    labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
                  />
                  <Bar dataKey="pct" radius={[10, 10, 0, 0]} fill="rgba(0,212,255,0.85)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">{analytics?.liveFeed ? <LiveFeed items={analytics.liveFeed} /> : <div className="glass p-6"><div className="skeleton h-5 w-40" /><div className="mt-4 space-y-3">{Array.from({length:6}).map((_,i)=>(<div key={i} className="skeleton h-10 w-full" />))}</div></div>}</div>
        <AlertPanel alerts={alerts} />
      </div>
      </>
      )}
    </div>
  )
}

