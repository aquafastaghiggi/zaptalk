import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Info, X, AlertTriangle, Sparkles } from 'lucide-react'
import clsx from 'clsx'

const VARIANT_META = {
  success: {
    icon: CheckCircle2,
    ring: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200',
    dot: 'bg-emerald-400',
  },
  warning: {
    icon: AlertTriangle,
    ring: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
    dot: 'bg-amber-400',
  },
  error: {
    icon: AlertTriangle,
    ring: 'border-red-400/20 bg-red-500/10 text-red-100',
    dot: 'bg-red-400',
  },
  info: {
    icon: Info,
    ring: 'border-brand-400/20 bg-brand-500/10 text-brand-100',
    dot: 'bg-brand-400',
  },
}

export default function ToastHost() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const handleToast = (event) => {
      const payload = event.detail || {}
      const id = payload.id || (crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`)
      const toast = {
        id,
        title: payload.title || 'Atualização',
        message: payload.message || '',
        variant: payload.variant || 'info',
        duration: typeof payload.duration === 'number' ? payload.duration : 3800,
      }

      setToasts((current) => [...current, toast])

      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== id))
      }, toast.duration)
    }

    window.addEventListener('zaptalk:toast', handleToast)
    return () => window.removeEventListener('zaptalk:toast', handleToast)
  }, [])

  const renderedToasts = useMemo(() => toasts.slice(-4), [toasts])

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-3">
      {renderedToasts.map((toast) => {
        const meta = VARIANT_META[toast.variant] || VARIANT_META.info
        const Icon = meta.icon || Sparkles
        return (
          <div
            key={toast.id}
            className={clsx(
              'pointer-events-auto overflow-hidden rounded-2xl border px-4 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.22)] backdrop-blur',
              meta.ring
            )}
          >
            <div className="flex items-start gap-3">
              <div className={clsx('mt-0.5 h-8 w-8 shrink-0 rounded-xl flex items-center justify-center', meta.dot)}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{toast.title}</p>
                {toast.message && <p className="mt-1 text-xs leading-5 text-slate-200/90">{toast.message}</p>}
              </div>
              <button
                type="button"
                onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
                className="mt-0.5 rounded-lg p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Fechar notificação"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
