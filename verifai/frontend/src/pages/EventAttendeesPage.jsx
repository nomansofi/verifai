import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Search, Camera } from 'lucide-react'
import { getEventById, updateEvent } from '../lib/verifaiDb.js'
import { loadUsersDb, saveUsersDb } from '../lib/usersDb.js'
import { useToast } from '../components/toastContext.js'
import { usePageTitle } from '../components/layout/pageTitleContext.js'

function makeTicketId() {
  return `TKT-${Math.floor(1000 + Math.random() * 9000)}`
}

export default function EventAttendeesPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { push } = useToast()
  const { setTitle } = usePageTitle()
  useEffect(() => setTitle('Manage Event Attendees'), [setTitle])
  const [event, setEvent] = useState(() => getEventById(id))
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All')
  const [newMember, setNewMember] = useState({ name: '', contact: '', accessZone: 'General', photoDataURL: '' })
  const [ticketId] = useState(makeTicketId())

  const users = useMemo(() => loadUsersDb(), [event?.id])
  const approved = new Set((event?.approvedAttendees || []).map((a) => a.id))
  const shown = users.filter((u) => {
    const q = query.toLowerCase()
    const hit = !q || String(u.name).toLowerCase().includes(q) || String(u.username).toLowerCase().includes(q)
    if (!hit) return false
    if (filter === 'Approved') return approved.has(u.id)
    if (filter === 'Pending') return !approved.has(u.id)
    return true
  })

  const persistEvent = (nextEvent) => {
    const res = updateEvent(id, nextEvent)
    if (res.ok) setEvent(res.event)
  }

  if (!event) {
    return <div className="glass p-6 text-sm">Event not found. <button className="btn-ghost" onClick={() => nav('/events')}>Back</button></div>
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="glass p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="text-lg font-semibold">Registered Users</div>
          <button className="btn-ghost" onClick={() => nav('/events')}>Back to Events</button>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <Search className="h-4 w-4 text-white/60" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users..." className="w-full bg-transparent text-sm outline-none" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {['All', 'Approved', 'Pending'].map((x) => (
            <button key={x} className={`btn-ghost ${filter === x ? 'ring-1 ring-[rgba(0,212,255,0.35)]' : ''}`} onClick={() => setFilter(x)}>{x}</button>
          ))}
          <button
            className="btn-ghost"
            onClick={() => {
              persistEvent({ approvedAttendees: users.map((u) => ({ id: u.id, ticketId: u.ticketId || makeTicketId(), accessZone: u.accessZone || 'General' })) })
            }}
          >
            Select All
          </button>
          <button className="btn-ghost" onClick={() => persistEvent({ approvedAttendees: [] })}>Deselect All</button>
          <div className="ml-auto text-xs text-white/70">{approved.size} approved</div>
        </div>
        <div className="mt-3 overflow-auto">
          <table className="min-w-[760px] w-full text-sm">
            <thead className="text-xs text-white/60">
              <tr>
                <th className="px-2 py-2 text-left">Photo</th>
                <th className="px-2 py-2 text-left">Name</th>
                <th className="px-2 py-2 text-left">ID</th>
                <th className="px-2 py-2 text-left">Dept</th>
                <th className="px-2 py-2 text-left">Approved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {shown.map((u) => {
                const on = approved.has(u.id)
                return (
                  <tr key={u.id} className="hover:bg-white/5">
                    <td className="px-2 py-2">
                      <div className="h-8 w-8 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
                        {u.photoDataURL ? <img src={u.photoDataURL} alt={u.name} className="h-full w-full object-cover" /> : null}
                      </div>
                    </td>
                    <td className="px-2 py-2">{u.name}</td>
                    <td className="px-2 py-2">{u.username}</td>
                    <td className="px-2 py-2">{u.department || '—'}</td>
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) => {
                          const prev = Array.isArray(event.approvedAttendees) ? event.approvedAttendees : []
                          const next = e.target.checked
                            ? [...prev.filter((a) => a.id !== u.id), { id: u.id, ticketId: u.ticketId || makeTicketId(), accessZone: u.accessZone || 'General' }]
                            : prev.filter((a) => a.id !== u.id)
                          persistEvent({ approvedAttendees: next })
                        }}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass p-5">
        <div className="text-lg font-semibold">➕ Add New Member</div>
        <div className="mt-1 text-xs text-white/60">Register someone not in database</div>
        <div className="mt-4 space-y-3">
          <label className="text-xs text-white/60">Full Name *
            <input value={newMember.name} onChange={(e) => setNewMember((m) => ({ ...m, name: e.target.value }))} className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm" />
          </label>
          <label className="text-xs text-white/60">Phone / Email *
            <input value={newMember.contact} onChange={(e) => setNewMember((m) => ({ ...m, contact: e.target.value }))} className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm" />
          </label>
          <label className="text-xs text-white/60">Profile Photo *
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (!f) return
                const r = new FileReader()
                r.onload = () => setNewMember((m) => ({ ...m, photoDataURL: String(r.result) }))
                r.readAsDataURL(f)
              }}
              className="mt-1 block w-full text-xs"
            />
          </label>
          {newMember.photoDataURL ? <img src={newMember.photoDataURL} alt="preview" className="h-24 w-24 rounded-xl object-cover ring-1 ring-white/10" /> : null}
          <div className="text-xs text-white/60">
            Access Zone
            <div className="mt-2 flex gap-3">
              {['General', 'VIP', 'Staff'].map((z) => (
                <label key={z} className="inline-flex items-center gap-2">
                  <input type="radio" checked={newMember.accessZone === z} onChange={() => setNewMember((m) => ({ ...m, accessZone: z }))} />
                  {z}
                </label>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">Ticket ID: <span className="font-semibold">{ticketId}</span></div>
          <button
            className="btn-primary w-full"
            onClick={() => {
              if (!newMember.name || !newMember.contact || !newMember.photoDataURL) {
                push({ title: 'Missing fields', message: 'Name, contact and photo required', variant: 'error' })
                return
              }
              const db = loadUsersDb()
              const idNew = `G-${Math.floor(1000 + Math.random() * 9000)}`
              const user = {
                id: idNew,
                username: idNew,
                role: 'guest',
                name: newMember.name,
                department: 'Guest',
                section: '-',
                phone: newMember.contact,
                email: newMember.contact.includes('@') ? newMember.contact : '',
                photoDataURL: newMember.photoDataURL,
                faceDescriptor: null,
                ticketId,
                accessZone: newMember.accessZone,
              }
              saveUsersDb([user, ...db])
              const nextApproved = [...(event.approvedAttendees || []), { id: idNew, ticketId, accessZone: newMember.accessZone }]
              persistEvent({ approvedAttendees: nextApproved })
              setNewMember({ name: '', contact: '', accessZone: 'General', photoDataURL: '' })
              push({ title: 'Member added and approved!', message: `${user.name} (${ticketId})`, variant: 'success' })
            }}
          >
            <Camera className="h-4 w-4" /> Add & Approve
          </button>
        </div>
      </div>
    </div>
  )
}

