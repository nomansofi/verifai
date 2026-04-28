import { cn } from '../lib/cn.js'

const variantStyles = {
  green: {
    ring: 'ring-[rgba(0,255,136,0.35)]',
    badge: 'bg-[rgba(0,255,136,0.14)] text-[color:var(--verifai-green)] ring-1 ring-[rgba(0,255,136,0.25)]',
  },
  red: {
    ring: 'ring-red-500/25',
    badge: 'bg-red-500/10 text-red-300 ring-1 ring-red-500/20',
  },
  yellow: {
    ring: 'ring-yellow-400/25',
    badge: 'bg-yellow-400/10 text-yellow-200 ring-1 ring-yellow-400/20',
  },
  blue: {
    ring: 'ring-[rgba(0,212,255,0.30)]',
    badge: 'bg-[rgba(0,212,255,0.12)] text-[color:var(--verifai-cyan)] ring-1 ring-[rgba(0,212,255,0.22)]',
  },
  orange: {
    ring: 'ring-orange-400/25',
    badge: 'bg-orange-400/10 text-orange-200 ring-1 ring-orange-400/20',
  },
}

export default function StatCard({ icon, title, value, changePct, variant = 'green', footer }) {
  const Icon = icon
  const v = variantStyles[variant] ?? variantStyles.green

  return (
    <div className={cn('glass px-4 py-4 ring-1', v.ring)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-white/60">{title}</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</div>
        </div>
        <div className={cn('rounded-xl p-2', v.badge)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-white/60">
        <div className={cn('rounded-full px-2 py-1', v.badge)}>
          {changePct >= 0 ? '+' : ''}
          {changePct}% this week
        </div>
        {footer ? <div className="text-white/55">{footer}</div> : null}
      </div>
    </div>
  )
}

