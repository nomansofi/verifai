import { cn } from '../lib/cn.js'

export default function ScanOverlay({ status = 'SCANNING', name, confidence }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_50%_35%,rgba(0,212,255,0.10),transparent_55%)]" />

      <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2">
        <div className="absolute inset-0 rounded-full border border-[rgba(0,255,136,0.35)] shadow-[0_0_0_1px_rgba(0,255,136,0.12),0_0_50px_rgba(0,255,136,0.10)]" />
        <div className="absolute inset-4 rounded-full border border-white/10" />
        <div className="absolute inset-0 overflow-hidden rounded-full">
          <div className="absolute left-0 top-0 h-10 w-full bg-[linear-gradient(90deg,transparent,rgba(0,255,136,0.25),transparent)] blur-sm animate-scanline" />
        </div>
        <div className="absolute inset-0 rounded-full ring-1 ring-[rgba(0,255,136,0.20)] animate-pulse" />
      </div>

      <div className="absolute bottom-4 left-4 right-4">
        <div className="glass neon-ring flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="text-xs text-white/60">Detection</div>
            <div className="mt-1 truncate text-sm font-semibold">
              {status === 'SCANNING' ? 'Scanning…' : name || 'Unknown'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {typeof confidence === 'number' ? (
              <div className="text-xs text-white/70">{Math.round(confidence * 100)}%</div>
            ) : null}
            <span
              className={cn(
                'rounded-full px-2 py-1 text-[11px] font-semibold ring-1',
                status === 'PRESENT' &&
                  'bg-[rgba(0,255,136,0.14)] text-[color:var(--verifai-green)] ring-[rgba(0,255,136,0.25)]',
                status === 'UNKNOWN' &&
                  'bg-orange-400/10 text-orange-200 ring-orange-400/20',
                status === 'SCANNING' && 'bg-white/5 text-white/70 ring-white/10',
              )}
            >
              {status}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

