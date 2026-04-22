import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Smartphone,
  Users,
} from 'lucide-react'
import api from '../services/api'
import ThemeToggle from '../components/ui/ThemeToggle'
import { useAuthStore } from '../stores/authStore'

const STEPS = [
  {
    key: 'company',
    label: 'Empresa',
    icon: Building2,
    hint: 'Defina nome, identidade e ponto de partida da operação.',
    details: ['Nome da empresa', 'Marca/logo opcional', 'Ajustes gerais'],
    action: 'Personalize a operação para o time reconhecer o ambiente.',
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    icon: Smartphone,
    hint: 'Crie a instância e conecte o número que vai atender.',
    details: ['Criar instancia', 'Ler QR Code', 'Validar online'],
    action: 'Abra o modulo de instancias e conclua a conexao do WhatsApp.',
  },
  {
    key: 'sectors',
    label: 'Setores',
    icon: MessageSquare,
    hint: 'Separe filas por atendimento e simplifique o roteamento.',
    details: ['Suporte', 'Vendas', 'Financeiro'],
    action: 'Crie os setores que vao receber as conversas inicialmente.',
  },
  {
    key: 'agents',
    label: 'Atendentes',
    icon: Users,
    hint: 'Convide o primeiro time e entregue as credenciais temporarias.',
    details: ['Nome e email', 'Perfil do usuario', 'Senha temporaria'],
    action: 'Cadastre pelo menos um atendente para validar o fluxo real.',
  },
]

export default function SetupWizardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const loadMe = useAuthStore((s) => s.loadMe)
  const [currentStep, setCurrentStep] = useState(0)
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState('')

  const progress = useMemo(() => Math.round(((currentStep + 1) / STEPS.length) * 100), [currentStep])
  const current = STEPS[currentStep]

  const handleFinish = async () => {
    setError('')
    setFinishing(true)
    try {
      await api.patch('/auth/setup-done')
      await loadMe()
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || 'Nao foi possivel concluir o setup.')
    } finally {
      setFinishing(false)
    }
  }

  return (
    <div className="min-h-screen overflow-hidden bg-surface-0 px-4 py-8 text-white">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-0 h-[24rem] w-[24rem] -translate-x-1/2 rounded-full bg-brand-600/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <div className="mb-6 rounded-[30px] border border-surface bg-surface-1/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">Primeiro acesso do administrador</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Vamos preparar o ZapTalk em 4 passos</h1>
              <p className="mt-3 text-sm leading-6 text-muted">
                Esse guia aparece apenas no primeiro acesso do admin. Siga a ordem sugerida para deixar a operação pronta sem perder nenhum detalhe.
              </p>
            </div>
            <div className="rounded-2xl border border-surface bg-surface-2 px-4 py-4 min-w-[18rem]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-subtle">Progresso</p>
                  <p className="mt-1 text-xs text-muted">Passo {currentStep + 1} de {STEPS.length}</p>
                </div>
                <div className="rounded-full bg-brand-500/15 px-3 py-1 text-[11px] font-medium text-brand-300">
                  {progress}%
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-400" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            const active = index === currentStep
            const done = index < currentStep
            return (
              <button
                key={step.key}
                type="button"
                onClick={() => setCurrentStep(index)}
                className={[
                  'rounded-[26px] border p-5 text-left transition-all duration-200',
                  active ? 'border-brand-500/40 bg-brand-500/10 shadow-[0_16px_40px_rgba(59,130,246,0.12)]' : 'border-surface bg-surface-2 hover:border-brand-500/20 hover:bg-surface-2/80',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={[
                    'flex h-12 w-12 items-center justify-center rounded-2xl ring-1',
                    active ? 'bg-brand-500/15 text-brand-300 ring-brand-500/20' : 'bg-white/[0.03] text-slate-300 ring-white/5',
                  ].join(' ')}>
                    <Icon className="h-5 w-5" />
                  </div>
                  {done && <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-medium text-emerald-300">Concluido</span>}
                </div>
                <h2 className="mt-4 text-base font-medium text-white">{step.label}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{step.hint}</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-brand-300">
                  Abrir etapa
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </button>
            )
          })}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[30px] border border-surface bg-surface-1 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-subtle">Etapa atual</p>
                <h2 className="mt-1 text-2xl font-semibold text-white">{current.label}</h2>
              </div>
              <div className="rounded-full border border-white/5 bg-white/[0.03] px-3 py-1 text-[11px] text-muted">
                Clique nos cards acima para navegar
              </div>
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{current.action}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {current.details.map((item) => (
                <div key={item} className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4 text-sm text-slate-200">
                  <CheckCircle2 className="mb-3 h-4 w-4 text-emerald-300" />
                  <p>{item}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-brand-500/10 bg-brand-500/8 px-4 py-4 text-sm text-slate-200">
              <p className="font-medium text-white">Fluxo recomendado</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Empresa ? WhatsApp ? Setores ? Atendentes. Quando terminar, clique em concluir para liberar o uso normal.
              </p>
            </div>

            {error && <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</p>}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => currentStep > 0 && setCurrentStep((s) => s - 1)}
                disabled={currentStep === 0}
                className="rounded-xl border border-surface bg-surface-2 px-4 py-3 text-sm text-slate-300 transition-colors hover:border-brand-500/30 hover:text-white disabled:opacity-40"
              >
                Voltar
              </button>
              {currentStep < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1))}
                  className="rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-500"
                >
                  Próximo passo
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={finishing}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-500 disabled:opacity-50"
                >
                  {finishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  Concluir setup
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4 rounded-[30px] border border-surface bg-surface-1 p-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-subtle">Checklist guiado</p>
              <h3 className="mt-1 text-lg font-medium text-white">O que precisa estar pronto</h3>
            </div>

            <div className="space-y-3">
              {STEPS.map((step, index) => {
                const Icon = step.icon
                const active = index === currentStep
                const done = index < currentStep
                return (
                  <div
                    key={step.key}
                    className={[
                      'rounded-2xl border px-4 py-4 transition-colors',
                      active ? 'border-brand-500/30 bg-brand-500/10' : 'border-surface bg-surface-2',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={[
                          'mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl',
                          done ? 'bg-emerald-500/15 text-emerald-300' : active ? 'bg-brand-500/15 text-brand-300' : 'bg-white/[0.03] text-slate-400',
                        ].join(' ')}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{step.label}</p>
                          <p className="mt-1 text-xs leading-5 text-muted">{step.hint}</p>
                        </div>
                      </div>
                      {done ? (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-medium text-emerald-300">Pronto</span>
                      ) : active ? (
                        <span className="rounded-full bg-brand-500/15 px-2 py-1 text-[10px] font-medium text-brand-300">Agora</span>
                      ) : (
                        <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-medium text-muted">Depois</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4 text-sm text-slate-300">
              <p className="font-medium text-white">Dica rápida</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Se voce já deixou WhatsApp, setores e atendentes prontos, pode pular direto para concluir o setup e voltar depois para ajustes.
              </p>
            </div>
          </div>
        </div>

        {user?.email && (
          <p className="mt-5 text-center text-xs text-muted">Logado como {user.name} · {user.email}</p>
        )}
      </div>
    </div>
  )
}
