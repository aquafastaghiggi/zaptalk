import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Sparkles, X } from 'lucide-react'
import clsx from 'clsx'

function readDismissed(storageKey) {
  try {
    return window.localStorage.getItem(storageKey) === '1'
  } catch {
    return false
  }
}

function writeDismissed(storageKey) {
  try {
    window.localStorage.setItem(storageKey, '1')
  } catch {
    // ignore storage failures
  }
}

export default function FirstRunTour({
  storageKey = 'zaptalk:first-run-tour-dismissed',
  steps = [],
  enabled = true,
}) {
  const [mounted, setMounted] = useState(false)
  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [highlight, setHighlight] = useState(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !enabled || readDismissed(storageKey) || steps.length === 0) return
    const timer = window.setTimeout(() => setActive(true), 450)
    return () => window.clearTimeout(timer)
  }, [mounted, enabled, storageKey, steps.length])

  const currentStep = useMemo(() => steps[Math.min(stepIndex, Math.max(steps.length - 1, 0))], [steps, stepIndex])

  useEffect(() => {
    if (!active || !currentStep?.selector) return undefined

    let cancelled = false

    const measure = () => {
      const target = document.querySelector(currentStep.selector)
      if (!target) {
        setHighlight(null)
        return false
      }

      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })

      window.requestAnimationFrame(() => {
        if (cancelled) return
        const rect = target.getBoundingClientRect()
        setHighlight({
          top: Math.max(8, rect.top - 8),
          left: Math.max(8, rect.left - 8),
          width: rect.width + 16,
          height: rect.height + 16,
          radius: window.getComputedStyle(target).borderRadius || '18px',
        })
      })

      return true
    }

    const initialTimer = window.setTimeout(measure, 120)
    const handleResize = () => measure()
    const handleScroll = () => measure()

    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, true)

    return () => {
      cancelled = true
      window.clearTimeout(initialTimer)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [active, currentStep])

  const finish = () => {
    setActive(false)
    writeDismissed(storageKey)
  }

  const goNext = () => {
    if (stepIndex >= steps.length - 1) {
      finish()
      return
    }
    setStepIndex((current) => current + 1)
  }

  const goBack = () => {
    setStepIndex((current) => Math.max(0, current - 1))
  }

  if (!active || !currentStep) return null

  return (
    <div className="fixed inset-0 z-[90] pointer-events-none">
      <div className="absolute inset-0 bg-surface-0/55 backdrop-blur-[1px]" />

      {highlight && (
        <div
          className="absolute border border-brand-400/75 shadow-[0_0_0_9999px_rgba(0,0,0,0.68),0_0_0_4px_rgba(59,130,246,0.35)] transition-all duration-200"
          style={{
            top: `${highlight.top}px`,
            left: `${highlight.left}px`,
            width: `${highlight.width}px`,
            height: `${highlight.height}px`,
            borderRadius: highlight.radius,
          }}
        />
      )}

      <div className="absolute bottom-5 left-1/2 w-[min(92vw,34rem)] -translate-x-1/2 pointer-events-auto">
        <div className="rounded-3xl border border-white/8 bg-surface-1/95 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/15 bg-brand-500/8 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-brand-300">
                <Sparkles className="h-3 w-3" />
                Primeiro uso
              </div>
              <h3 className="mt-2 text-sm font-medium text-white">{currentStep.title}</h3>
              <p className="mt-1 text-xs leading-5 text-muted">{currentStep.description}</p>
            </div>
            <button
              type="button"
              onClick={finish}
              className="rounded-lg border border-surface bg-surface-2 p-2 text-muted transition-colors hover:border-brand-500/30 hover:text-white"
              title="Fechar tour"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted">
              Passo {stepIndex + 1} de {steps.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goBack}
                disabled={stepIndex === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-surface bg-surface-2 px-3 py-2 text-xs text-slate-300 transition-colors hover:border-brand-500/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar
              </button>
              <button
                type="button"
                onClick={goNext}
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                  stepIndex >= steps.length - 1
                    ? 'bg-brand-600 text-white hover:bg-brand-500'
                    : 'bg-brand-600 text-white hover:bg-brand-500'
                )}
              >
                {stepIndex >= steps.length - 1 ? 'Concluir' : 'Próximo'}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
