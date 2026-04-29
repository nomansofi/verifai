import { useEffect, useMemo, useState } from 'react'
import { RefreshCcw, Download, RotateCcw, Eye } from 'lucide-react'
import { usePageTitle } from '../components/layout/pageTitleContext.js'
import { useToast } from '../components/toastContext.js'
import { cn } from '../lib/cn.js'
import { apiGetWhatsAppLogs, apiSendTestWhatsApp } from '../lib/whatsappApi.js'

function badge(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'delivered') return 'bg-[rgba(0,255,136,0.14)] text-[color:var(--verifai-green)] ring-[rgba(0,255,136,0.25)]'
  if (s === 'failed') return 'bg-red-500/10 text-red-200 ring-red-500/20'
  return 'bg-yellow-400/10 text-yellow-200 ring-yellow-400/20'
}

function downloadCsv(filename, rows) {
  const header = ['Time', 'Recipient', 'Name', 'Phone', 'Subject', 'Status', 'Delivery', 'MessagePreview']
  const csv = [
    header.join(','),
    ...rows.map((r) =>
      [r.timestamp, r.recipient, r.name, r.phone, r.subject, r.status, r.deliveryStatus, r.messagePreview]
        .map((x) => `"${String(x ?? '').replaceAll('"', '""')}"`)
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

function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="glass neon-ring relative w-full max-w-[820px] overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="text-sm font-semibold">{title}</div>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

export default function WhatsappLogs() {
  const { setTitle } = usePageTitle()
  const { push } = useToast()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState([])
  const [filter, setFilter] = useState('All')
  const [recipient, setRecipient] = useState('All')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(null)

  useEffect(() => setTitle('WhatsApp Logs'), [setTitle])

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await apiGetWhatsAppLogs()
      setLogs(Array.isArray(res?.logs) ? res.logs : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh().catch(() => {})
    const t = window.setInterval(() => refresh().catch(() => {}), 30_000)
    return () => window.clearInterval(t)
  }, [])

  const today = useMemo(() => new Date().toDateString(), [])
  const filtered = useMemo(() => {
    const list = Array.isArray(logs) ? logs : []
    return list.filter((l) => {
      if (filter !== 'All') {
        const s = String(l.deliveryStatus || '').toLowerCase()
        if (filter === 'Delivered' && s !== 'delivered') return false
        if (filter === 'Sent' && s !== 'sent') return false
        if (filter === 'Failed' && s !== 'failed') return false
        if (filter === 'Pending' && !['queued', 'accepted', 'scheduled', 'sending'].includes(s)) return false
      }
      if (recipient !== 'All' && String(l.recipient || '').toLowerCase() !== recipient.toLowerCase()) return false
      return true
    })
  }, [logs, filter, recipient])

  const summary = useMemo(() => {
    const list = filtered
    const day = list.filter((l) => {
      const ts = l.timestamp ? new Date(l.timestamp) : null
      return ts && ts.toDateString() === today
    })
    const sent = day.filter((l) => String(l.deliveryStatus).toLowerCase() === 'sent').length
    const delivered = day.filter((l) => String(l.deliveryStatus).toLowerCase() === 'delivered').length
    const failed = day.filter((l) => String(l.deliveryStatus).toLowerCase() === 'failed').length
    const pending = day.filter((l) => ['queued', 'accepted', 'scheduled', 'sending'].includes(String(l.deliveryStatus).toLowerCase())).length
    return { total: day.length, sent, delivered, failed, pending }
  }, [filtered, today])

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Total Sent Today', value: summary.total, tint: 'ring-white/10' },
          { label: 'Delivered', value: summary.delivered, tint: 'ring-[rgba(0,255,136,0.25)] text-[color:var(--verifai-green)]' },
          { label: 'Failed', value: summary.failed, tint: 'ring-red-500/20 text-red-200' },
          { label: 'Pending', value: summary.pending, tint: 'ring-yellow-400/20 text-yellow-200' },
        ].map((c) => (
          <div key={c.label} className="glass p-5">
            <div className="text-xs text-white/60">{c.label}</div>
            <div className={cn('mt-2 text-2xl font-semibold', c.tint)}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="glass neon-ring flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
            {['All', 'Sent', 'Delivered', 'Failed', 'Pending'].map((x) => (
              <button
                key={x}
                type="button"
                onClick={() => setFilter(x)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                  filter === x ? 'bg-[rgba(0,255,136,0.16)] text-white ring-1 ring-[rgba(0,255,136,0.35)]' : 'text-white/70 hover:bg-white/10 hover:text-white',
                )}
              >
                {x}
              </button>
            ))}
          </div>

          <select
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white/85 outline-none"
          >
            <option value="All">All recipients</option>
            <option value="student">Student</option>
            <option value="parent">Parent</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" className="btn-ghost" onClick={() => refresh().catch(() => {})}>
            <RefreshCcw className="h-4 w-4" /> Refresh
          </button>
          <button type="button" className="btn-ghost" onClick={() => downloadCsv(`verifai-whatsapp-logs-${new Date().toISOString().slice(0, 10)}.csv`, filtered)}>
            <Download className="h-4 w-4" /> Export Logs CSV
          </button>
        </div>
      </div>

      <div className="glass overflow-hidden">
        <div className="border-b border-white/10 px-4 py-3">
          <div className="text-sm font-semibold">Logs</div>
          <div className="mt-0.5 text-xs text-white/60">{filtered.length} entries</div>
        </div>
        <div className="overflow-auto">
          <table className="min-w-[1200px] w-full text-left text-sm">
            <thead className="bg-white/5 text-xs text-white/60">
              <tr>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Recipient</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Delivery</th>
                <th className="px-4 py-3 font-medium">Message preview</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3"><div className="skeleton h-4 w-28" /></td>
                      <td className="px-4 py-3"><div className="skeleton h-4 w-16" /></td>
                      <td className="px-4 py-3"><div className="skeleton h-4 w-40" /></td>
                      <td className="px-4 py-3"><div className="skeleton h-4 w-28" /></td>
                      <td className="px-4 py-3"><div className="skeleton h-4 w-28" /></td>
                      <td className="px-4 py-3"><div className="skeleton h-4 w-16" /></td>
                      <td className="px-4 py-3"><div className="skeleton h-6 w-24 rounded-full" /></td>
                      <td className="px-4 py-3"><div className="skeleton h-4 w-[420px]" /></td>
                      <td className="px-4 py-3"><div className="skeleton h-8 w-28 rounded-xl" /></td>
                    </tr>
                  ))
                : filtered.map((l) => (
                    <tr key={l.id} className="hover:bg-white/5">
                      <td className="px-4 py-3 text-white/80">{l.timestamp ? new Date(l.timestamp).toLocaleString() : '—'}</td>
                      <td className="px-4 py-3 text-white/80">{String(l.recipient || '').toUpperCase()}</td>
                      <td className="px-4 py-3 font-medium">{l.name || '—'}</td>
                      <td className="px-4 py-3 text-white/80">{l.phone || '—'}</td>
                      <td className="px-4 py-3 text-white/80">{l.subject || '—'}</td>
                      <td className="px-4 py-3 text-white/80">{String(l.status || '').toUpperCase()}</td>
                      <td className="px-4 py-3">
                        <span className={cn('rounded-full px-2 py-1 text-[11px] font-semibold ring-1', badge(l.deliveryStatus))}>
                          {String(l.deliveryStatus || 'sent').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/70">{l.messagePreview || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => {
                              setActive(l)
                              setOpen(true)
                            }}
                          >
                            <Eye className="h-4 w-4" /> View
                          </button>
                          <button
                            type="button"
                            className={cn('btn-ghost', String(l.deliveryStatus).toLowerCase() !== 'failed' && 'opacity-60')}
                            disabled={String(l.deliveryStatus).toLowerCase() !== 'failed'}
                            onClick={async () => {
                              try {
                                const r = await apiSendTestWhatsApp({ toPhone: l.phone, message: l.fullMessage || l.messagePreview })
                                push({ title: 'Retry sent', message: r?.sid ? `SID ${r.sid}` : 'Message queued', variant: 'success' })
                                refresh().catch(() => {})
                              } catch {
                                push({ title: 'Retry failed', message: 'Backend not reachable', variant: 'error' })
                              }
                            }}
                          >
                            <RotateCcw className="h-4 w-4" /> Retry
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-white/60" colSpan={9}>
                    No logs yet. Start the WhatsApp backend and run a scan to trigger messages.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Full message">
        <pre className="whitespace-pre-wrap rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
          {active?.fullMessage || active?.messagePreview || '—'}
        </pre>
      </Modal>
    </div>
  )
}

