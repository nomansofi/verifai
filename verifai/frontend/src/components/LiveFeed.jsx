import { cn } from '../lib/cn.js'

export default function LiveFeed({ items }) {
  return (
    <div className="glass overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="text-sm font-semibold">Recent check-ins</div>
        <div className="text-xs text-white/60">Live</div>
      </div>

      <div className="max-h-[340px] divide-y divide-white/10 overflow-auto">
        {items.map((it) => (
          <div key={it.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-white/10 p-[1px]">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-black/40 text-xs font-semibold">
                  {it.name
                    .split(' ')
                    .slice(0, 2)
                    .map((x) => x[0])
                    .join('')
                    .toUpperCase()}
                </div>
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{it.name}</div>
                <div className="text-xs text-white/60">{it.time}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'rounded-full px-2 py-1 text-[11px] font-semibold ring-1',
                  it.status === 'PRESENT' &&
                    'bg-[rgba(0,255,136,0.14)] text-[color:var(--verifai-green)] ring-[rgba(0,255,136,0.25)]',
                  it.status === 'LATE' &&
                    'bg-yellow-400/10 text-yellow-200 ring-yellow-400/20',
                  it.status === 'UNKNOWN' &&
                    'bg-orange-400/10 text-orange-200 ring-orange-400/20',
                )}
              >
                {it.status}
              </span>
              <span className="text-xs text-white/70">{Math.round(it.confidence * 100)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

