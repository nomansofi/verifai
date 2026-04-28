import { AlertTriangle } from 'lucide-react'

export default function AlertPanel({ alerts }) {
  return (
    <div className="glass overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4 text-orange-300" />
          Security alerts
        </div>
        <div className="text-xs text-white/60">{alerts.length} active</div>
      </div>

      <div className="divide-y divide-white/10">
        {alerts.map((a) => (
          <div key={a.id} className="flex items-start gap-3 px-4 py-3">
            <div className="mt-0.5 h-10 w-10 flex-none rounded-xl bg-orange-400/10 ring-1 ring-orange-400/20" />
            <div className="min-w-0">
              <div className="text-sm font-medium">{a.title}</div>
              <div className="mt-0.5 text-xs text-white/60">
                {a.location} • {a.time}
              </div>
              <div className="mt-2 inline-flex rounded-full bg-orange-400/10 px-2 py-1 text-[11px] font-semibold text-orange-200 ring-1 ring-orange-400/20">
                UNKNOWN FACE DETECTED
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

