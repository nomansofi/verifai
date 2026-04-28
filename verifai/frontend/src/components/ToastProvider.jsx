import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '../lib/cn.js'

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const push = useCallback((toast) => {
    const id = crypto.randomUUID()
    const item = {
      id,
      title: toast?.title ?? 'Done',
      message: toast?.message ?? '',
      variant: toast?.variant ?? 'info', // info|success|error
      ttlMs: toast?.ttlMs ?? 3200,
    }
    setToasts((t) => [item, ...t].slice(0, 4))
    window.setTimeout(() => remove(id), item.ttlMs)
  }, [remove])

  const value = useMemo(() => ({ push, remove }), [push, remove])

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[100] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'glass neon-ring overflow-hidden px-4 py-3 text-left',
              t.variant === 'success' && 'border-[color:rgba(0,255,136,0.35)]',
              t.variant === 'error' && 'border-red-500/30',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white">{t.title}</div>
                {t.message ? (
                  <div className="mt-0.5 text-xs text-white/70">{t.message}</div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => remove(t.id)}
                className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

