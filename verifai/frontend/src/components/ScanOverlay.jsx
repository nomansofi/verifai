import { cn } from '../lib/cn.js'

export default function ScanOverlay({
  status = 'SCANNING',
  name,
  confidence,
  footerMessage,
  footerTone = 'neutral',
  centerMessage,
  centerTone = 'neutral',
}) {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_50%_35%,rgba(0,212,255,0.10),transparent_55%)]" />
      {centerMessage ? (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
          <div
            className={cn(
              'rounded-2xl border bg-black/55 px-4 py-3 text-sm font-semibold backdrop-blur',
              centerTone === 'green' && 'border-[rgba(0,255,136,0.25)] text-[color:var(--verifai-green)]',
              centerTone === 'yellow' && 'border-yellow-400/25 text-yellow-100',
              centerTone === 'red' && 'border-red-500/25 text-red-100',
              centerTone === 'neutral' && 'border-white/10 text-white/85',
            )}
          >
            {centerMessage}
          </div>
        </div>
      ) : null}

      <div className="absolute bottom-4 left-4 right-4">
        <div className="glass neon-ring flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="text-xs text-white/60">Detection</div>
            <div className="mt-1 truncate text-sm font-semibold">
              {status === 'SCANNING' ? 'Scanning…' : name || 'Unknown'}
            </div>
            {footerMessage ? (
              <div
                className={cn(
                  'mt-1 text-xs font-semibold',
                  footerTone === 'green' && 'text-[color:var(--verifai-green)]',
                  footerTone === 'yellow' && 'text-yellow-200',
                  footerTone === 'red' && 'text-red-200',
                  footerTone === 'neutral' && 'text-white/65',
                )}
              >
                {footerMessage}
              </div>
            ) : null}
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

