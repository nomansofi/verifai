import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Plus, Users, ScanFace, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { usePageTitle } from '../components/layout/pageTitleContext.js'
import ToggleBar from '../components/ToggleBar.jsx'
import { addEvent, listEvents, removeEvent } from '../lib/verifaiDb.js'
import { useToast } from '../components/toastContext.js'
import { cn } from '../lib/cn.js'

const TYPES = ['VIP', 'Public', 'Internal']

function typeBadgeCls(type) {
  if (type === 'VIP') return 'bg-yellow-400/10 text-yellow-200 ring-yellow-400/20'
  if (type === 'Internal') return 'bg-purple-400/10 text-purple-200 ring-purple-400/20'
  return 'bg-[rgba(0,212,255,0.14)] text-[color:var(--verifai-cyan)] ring-[rgba(0,212,255,0.25)]'
}

export default function EventsPage() {
  const { setTitle } = usePageTitle()
  const nav = useNavigate()
  const { push } = useToast()
  const [tab, setTab] = useState('list')
  const [events, setEvents] = useState(() => listEvents())
  const [form, setForm] = useState({
    name: '',
    date: '',
    time: '',
    location: '',
    type: 'Public',
    maxAttendees: 50,
    description: '',
  })

  useEffect(() => setTitle('Events & Conferences'), [setTitle])

  const stats = useMemo(() => {
    const total = events.length
    const todayIso = new Date().toISOString().slice(0, 10)
    const active = events.filter((e) => e.date === todayIso).length
    const checked = events.reduce((s, e) => s + (Array.isArray(e.checkedIn) ? e.checkedIn.length : 0), 0)
    const denied = events.reduce((s, e) => s + (Array.isArray(e.denied) ? e.denied.length : 0), 0)
    return { total, active, checked, denied }
  }, [events])

  return (
    <div className="space-y-4">
      <div className="glass neon-ring p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xl font-semibold">Events & Conferences</div>
            <div className="mt-1 text-sm text-white/65">Manage events, attendees, and AI-powered check-in</div>
            <div className="mt-3">
              <ToggleBar
                value={tab}
                onChange={setTab}
                options={[
                  { value: 'list', label: '📅 My Events' },
                  { value: 'create', label: '+ Create Event' },
                ]}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">Total Events: <span className="font-semibold">{stats.total}</span></div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">Active Today: <span className="font-semibold">{stats.active}</span></div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">Checked In: <span className="font-semibold">{stats.checked}</span></div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">Denied: <span className="font-semibold">{stats.denied}</span></div>
          </div>
        </div>
      </div>

      {tab === 'list' ? (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((e) => {
            const checked = Array.isArray(e.checkedIn) ? e.checkedIn.length : 0
            const max = Math.max(1, Number(e.maxAttendees) || 1)
            const pct = Math.min(100, Math.round((checked / max) * 100))
            return (
              <div key={e.id} className="glass p-5 transition hover:scale-[1.01]">
                <span className={cn('inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ring-1', typeBadgeCls(e.type))}>🎪 {e.type}</span>
                <div className="mt-3 text-lg font-semibold">{e.name}</div>
                <div className="mt-1 text-xs text-white/70">📅 {e.date} {e.time}</div>
                <div className="mt-1 text-xs text-white/70">📍 {e.location}</div>
                <div className="mt-2 line-clamp-2 text-sm text-white/75">{e.description || 'No description'}</div>
                <div className="mt-3">
                  <div className="mb-1 text-xs text-white/70">{checked}/{max} checked in</div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--verifai-green),var(--verifai-cyan))]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" className="btn-ghost" onClick={() => nav(`/events/${e.id}/attendees`)}>
                    <Users className="h-4 w-4" /> Manage Attendees
                  </button>
                  <button type="button" className="btn-primary" onClick={() => nav(`/events/${e.id}/checkin`)}>
                    <ScanFace className="h-4 w-4" /> Start Check-in
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      const next = removeEvent(e.id)
                      setEvents(next)
                      push({ title: 'Event deleted', message: e.name, variant: 'info' })
                    }}
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              </div>
            )
          })}
          {events.length === 0 ? (
            <div className="glass col-span-full p-8 text-center text-sm text-white/60">
              <CalendarDays className="mx-auto mb-2 h-6 w-6" />
              No events yet. Create your first event.
            </div>
          ) : null}
        </div>
      ) : (
        <div className="glass mx-auto max-w-[760px] p-5">
          <div className="mb-4 text-lg font-semibold">📅 Create New Event</div>
          <div className="grid gap-4">
            <label className="text-xs text-white/60">Event Name *
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm" />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs text-white/60">Date *
                <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm" />
              </label>
              <label className="text-xs text-white/60">Time *
                <input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm" />
              </label>
            </div>
            <label className="text-xs text-white/60">Location *
              <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm" />
            </label>
            <div className="text-xs text-white/60">
              Event Type *
              <div className="mt-2 flex flex-wrap gap-3">
                {TYPES.map((t) => (
                  <label key={t} className="inline-flex items-center gap-2">
                    <input type="radio" checked={form.type === t} onChange={() => setForm((f) => ({ ...f, type: t }))} />
                    {t}
                  </label>
                ))}
              </div>
            </div>
            <label className="text-xs text-white/60">Max Attendees
              <input type="number" min={1} value={form.maxAttendees} onChange={(e) => setForm((f) => ({ ...f, maxAttendees: Number(e.target.value || 1) }))} className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm" />
            </label>
            <label className="text-xs text-white/60">Description
              <textarea rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setTab('list')}>Cancel</button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  if (!form.name || !form.date || !form.time || !form.location) {
                    push({ title: 'Missing fields', message: 'Please fill required fields', variant: 'error' })
                    return
                  }
                  const event = {
                    id: Date.now().toString(),
                    name: form.name,
                    date: form.date,
                    time: form.time,
                    location: form.location,
                    type: form.type,
                    maxAttendees: form.maxAttendees,
                    description: form.description,
                    createdAt: new Date().toISOString(),
                    approvedAttendees: [],
                    checkedIn: [],
                    denied: [],
                  }
                  const next = addEvent(event)
                  setEvents(next)
                  setTab('list')
                  push({ title: 'Event created successfully!', message: event.name, variant: 'success' })
                }}
              >
                <Plus className="h-4 w-4" /> Create Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

