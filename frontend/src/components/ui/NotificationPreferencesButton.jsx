import { useEffect, useRef, useState } from 'react'
import { Bell, BellOff, Volume2, X, AlertCircle } from 'lucide-react'
import clsx from 'clsx'

const STORAGE_KEY = 'zaptalk:notification-prefs'

const DEFAULT_PREFS = {
  soundEnabled: true,
  visualEnabled: true,
  priorityOnly: false,
  minPriority: 2,
  fontScale: 100,
}

function readPrefs() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PREFS
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_PREFS
  }
}

function savePrefs(next) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore storage errors
  }
}

export default function NotificationPreferencesButton() {
  const [open, setOpen] = useState(false)
  const [prefs, setPrefs] = useState(DEFAULT_PREFS)
  const rootRef = useRef(null)

  useEffect(() => {
    setPrefs(readPrefs())
  }, [])

  useEffect(() => {
    document.documentElement.style.fontSize = `${prefs.fontScale || 100}%`
    return () => {
      document.documentElement.style.fontSize = '100%'
    }
  }, [prefs.fontScale])

  useEffect(() => {
    if (!open) return undefined
    const handleOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  const updatePrefs = (patch) => {
    setPrefs((current) => {
      const next = { ...current, ...patch }
      savePrefs(next)
      return next
    })
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-2 rounded-lg border border-surface bg-surface-1 px-3 py-2 text-xs text-slate-300 transition-colors hover:bg-surface-2"
        title="Personalizar notificações"
        aria-label="Personalizar notificações"
      >
        <Bell className="h-3.5 w-3.5" />
        Notificações
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 rounded-2xl border border-surface bg-surface-1 p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">Preferências de alerta</p>
              <p className="mt-1 text-[11px] leading-5 text-muted">Escolha quando tocar, mostrar e chamar atenção.</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-surface bg-surface-2 p-2 text-muted transition-colors hover:text-white"
              title="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-surface-2 px-3 py-3">
              <span className="flex items-center gap-2 text-xs text-slate-200">
                <Volume2 className="h-4 w-4 text-brand-300" />
                Som das notificações
              </span>
              <input
                type="checkbox"
                checked={prefs.soundEnabled}
                onChange={(e) => updatePrefs({ soundEnabled: e.target.checked })}
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-surface-2 px-3 py-3">
              <span className="flex items-center gap-2 text-xs text-slate-200">
                <BellOff className="h-4 w-4 text-brand-300" />
                Notificações visuais
              </span>
              <input
                type="checkbox"
                checked={prefs.visualEnabled}
                onChange={(e) => updatePrefs({ visualEnabled: e.target.checked })}
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-surface-2 px-3 py-3">
              <span className="flex items-center gap-2 text-xs text-slate-200">
                <AlertCircle className="h-4 w-4 text-brand-300" />
                Apenas alta prioridade
              </span>
              <input
                type="checkbox"
                checked={prefs.priorityOnly}
                onChange={(e) => updatePrefs({ priorityOnly: e.target.checked })}
              />
            </label>

            <div className="rounded-2xl border border-white/5 bg-surface-2 px-3 py-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-200">Prioridade mínima</p>
                <span className="text-[11px] text-muted">{prefs.minPriority}</span>
              </div>
              <input
                type="range"
                min="0"
                max="3"
                step="1"
                value={prefs.minPriority}
                onChange={(e) => updatePrefs({ minPriority: Number(e.target.value) })}
                className={clsx('w-full accent-brand-500', !prefs.priorityOnly && 'opacity-50')}
                disabled={!prefs.priorityOnly}
              />
              <p className="mt-2 text-[11px] leading-5 text-muted">
                0 = todas as notificações. Quando marcar alta prioridade, o app responde apenas a atendimentos mais críticos.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-surface-2 px-3 py-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-200">Tamanho do texto</p>
                <span className="text-[11px] text-muted">{prefs.fontScale || 100}%</span>
              </div>
              <input
                type="range"
                min="90"
                max="120"
                step="5"
                value={prefs.fontScale || 100}
                onChange={(e) => updatePrefs({ fontScale: Number(e.target.value) })}
                className="w-full accent-brand-500"
              />
              <p className="mt-2 text-[11px] leading-5 text-muted">
                Aumenta ou reduz a leitura geral da interface sem alterar o conteúdo.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
