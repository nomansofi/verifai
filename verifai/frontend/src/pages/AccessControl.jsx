import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, XCircle, Plus, MapPin, AlertTriangle } from 'lucide-react'
import { usePageTitle } from '../components/layout/pageTitleContext.js'
import { apiGetAccessLogs, apiGetAlerts } from '../lib/api.js'
import { cn } from '../lib/cn.js'
import { useToast } from '../components/toastContext.js'

function AccessPill({ access }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-1 text-[11px] font-semibold ring-1',
        access === 'GRANTED' &&
          'bg-[rgba(0,255,136,0.14)] text-[color:var(--verifai-green)] ring-[rgba(0,255,136,0.25)]',
        access === 'DENIED' && 'bg-red-500/10 text-red-300 ring-red-500/20',
      )}
    >
      {access}
    </span>
  )
}

export default function AccessControl() {
  const { setTitle } = usePageTitle()
  const { push } = useToast()
  const [logs, setLogs] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [zones, setZones] = useState(['Main Gate', 'Lab Block', 'Admin Wing', 'Exam Hall'])
  const [newZone, setNewZone] = useState('')

  useEffect(() => setTitle('Access Control'), [setTitle])

  useEffect(() => {
    let alive = true
    async function run() {
      setLoading(true)
      const [l, a] = await Promise.all([apiGetAccessLogs(), apiGetAlerts()])
      if (!alive) return
      setLogs(l)
      setAlerts(a.slice(0, 3))
      setLoading(false)
    }
    run()
    return () => {
      alive = false
    }
  }, [])

  const denied = useMemo(() => logs.filter((x) => x.access === 'DENIED'), [logs])

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="glass overflow-hidden lg:col-span-2">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <div className="text-sm font-semibold">Live entry log</div>
            <div className="mt-0.5 text-xs text-white/60">Entry/exit events across zones</div>
          </div>
          <div className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/70 ring-1 ring-white/10">
            {denied.length} denied
          </div>
        </div>

        <div className="overflow-auto">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-white/5 text-xs text-white/60">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Access</th>
                <th className="px-4 py-3 font-medium">Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3">
                        <div className="skeleton h-4 w-40" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="skeleton h-4 w-16" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="skeleton h-4 w-28" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="skeleton h-6 w-24 rounded-full" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="skeleton h-8 w-40" />
                      </td>
                    </tr>
                  ))
                : logs.map((x) => (
                    <tr key={x.id} className="hover:bg-white/5">
                      <td className="px-4 py-3 font-medium">{x.name}</td>
                      <td className="px-4 py-3 text-white/80">{x.time}</td>
                      <td className="px-4 py-3 text-white/80">{x.location}</td>
                      <td className="px-4 py-3">
                        <AccessPill access={x.access} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => push({ title: 'Override', message: `Access GRANTED for ${x.name}`, variant: 'success' })}
                          >
                            <CheckCircle2 className="h-4 w-4" /> Grant
                          </button>
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => push({ title: 'Override', message: `Access DENIED for ${x.name}`, variant: 'error' })}
                          >
                            <XCircle className="h-4 w-4" /> Deny
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4">
        <div className="glass overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 text-orange-300" />
              Unknown face alerts
            </div>
            <div className="text-xs text-white/60">{alerts.length} items</div>
          </div>

          <div className="divide-y divide-white/10">
            {alerts.map((a) => (
              <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                <div className="h-12 w-12 flex-none rounded-xl bg-orange-400/10 ring-1 ring-orange-400/20" />
                <div className="min-w-0">
                  <div className="text-sm font-medium">{a.location}</div>
                  <div className="mt-0.5 text-xs text-white/60">{a.time}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" className="btn-ghost" onClick={() => push({ title: 'Granted', message: 'Manual grant logged', variant: 'success' })}>
                      <CheckCircle2 className="h-4 w-4" /> Grant
                    </button>
                    <button type="button" className="btn-ghost" onClick={() => push({ title: 'Denied', message: 'Manual deny logged', variant: 'error' })}>
                      <XCircle className="h-4 w-4" /> Deny
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {alerts.length === 0 ? <div className="px-4 py-6 text-sm text-white/60">No alerts.</div> : null}
          </div>
        </div>

        <div className="glass p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Zone management</div>
              <div className="mt-0.5 text-xs text-white/60">Add locations/zones for access control</div>
            </div>
            <MapPin className="h-4 w-4 text-[color:var(--verifai-cyan)]" />
          </div>

          <div className="mt-4 flex gap-2">
            <input
              value={newZone}
              onChange={(e) => setNewZone(e.target.value)}
              placeholder="Add a zone…"
              className="h-10 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/35 outline-none focus:ring-2 focus:ring-[rgba(0,255,136,0.35)]"
            />
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                const z = newZone.trim()
                if (!z) return
                setZones((s) => (s.includes(z) ? s : [...s, z]))
                setNewZone('')
                push({ title: 'Zone added', message: z, variant: 'success' })
              }}
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {zones.map((z) => (
              <span key={z} className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/70 ring-1 ring-white/10">
                {z}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

