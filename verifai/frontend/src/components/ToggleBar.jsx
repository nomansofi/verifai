import { cn } from '../lib/cn.js'

export default function ToggleBar({ value, onChange, options, size = 'sm' }) {
  const pad = size === 'lg' ? 'p-1.5' : 'p-1'
  const btn = size === 'lg' ? 'px-4 py-2 text-sm' : 'px-3 py-1.5 text-xs'
  return (
    <div className={cn('inline-flex items-center rounded-xl border', pad)} style={{ borderColor: 'var(--verifai-border)', background: 'var(--verifai-card)' }}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn('rounded-lg font-semibold transition', btn, active ? 'text-white' : '')}
            style={
              active
                ? { background: 'var(--verifai-primary)', boxShadow: '0 0 0 1px rgba(37,99,235,0.18), 0 10px 24px rgba(37,99,235,0.18)' }
                : { background: 'transparent', color: 'var(--verifai-text)' }
            }
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

