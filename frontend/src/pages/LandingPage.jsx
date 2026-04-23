import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, MessageSquare, Smartphone, BarChart3, Shield, PlayCircle, UserPlus, HelpCircle } from 'lucide-react'
import ThemeToggle from '../components/ui/ThemeToggle'
import { useAuthStore } from '../stores/authStore'
import { resolvePostLoginRoute } from '../utils/onboarding'

const highlights = [
  { icon: MessageSquare, title: 'Atendimento organizado', text: 'Filas por setor, prioridade, transferencia e retomada em um so lugar.' },
  { icon: Smartphone, title: 'WhatsApp conectado', text: 'Instancias, QR Code e reconexao para manter sua operacao rodando.' },
  { icon: BarChart3, title: 'Gestao em tempo real', text: 'Dashboard operacional, SLA, relatorios e auditoria para acompanhar tudo.' },
]

const steps = [
  'Crie sua conta ou entre com um acesso ja liberado',
  'Conecte o WhatsApp e configure seus setores',
  'Convide o time e comece a atender com visao clara',
]

export default function LandingPage() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const loadMe = useAuthStore((s) => s.loadMe)

  useEffect(() => {
    let mounted = true

    const ensureLogged = async () => {
      if (!token) return
      const currentUser = user || (await loadMe())
      if (mounted && currentUser) {
        navigate(resolvePostLoginRoute(currentUser), { replace: true })
      }
    }

    ensureLogged()
    return () => {
      mounted = false
    }
  }, [token, user, loadMe, navigate])

  if (token && !user) {
    return <div className="flex min-h-screen items-center justify-center bg-surface-0 text-sm text-muted">Carregando...</div>
  }

  return (
    <div className="min-h-screen overflow-hidden bg-surface-0 text-white">
      <div className="absolute right-4 top-4 z-10"><ThemeToggle /></div>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-0 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-brand-600/12 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <header className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/20">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-subtle">ZapTalk</p>
            <p className="text-sm text-muted">Atendimento inteligente no WhatsApp</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/login')} className="rounded-xl border border-surface bg-surface-1 px-4 py-2 text-sm text-slate-300 transition-colors hover:border-brand-500/30 hover:text-white">Entrar</button>
          <button onClick={() => navigate('/sign-up')} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-500">Criar conta <ArrowRight className="h-4 w-4" /></button>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-6 pb-16 pt-8 lg:px-8 lg:pt-12">
        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-[11px] font-medium text-brand-300">
              <Shield className="h-3.5 w-3.5" />
              Feito para operacao real, sem complicar a entrada
            </span>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white lg:text-6xl">Organize seu atendimento no WhatsApp com clareza desde o primeiro dia.</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted lg:text-lg">
              ZapTalk junta filas, setores, transferencia, notas internas, dashboard e relatorios em um fluxo simples para quem quer comecar sem perder tempo.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={() => navigate('/sign-up')} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-500">Criar conta <ArrowRight className="h-4 w-4" /></button>
              <button onClick={() => navigate('/login')} className="inline-flex items-center gap-2 rounded-xl border border-surface bg-surface-1 px-5 py-3 text-sm text-slate-300 transition-colors hover:border-brand-500/30 hover:text-white"><UserPlus className="h-4 w-4" />Já tenho conta</button>
              <button onClick={() => navigate('/request-access')} className="inline-flex items-center gap-2 rounded-xl border border-surface bg-surface-1 px-5 py-3 text-sm text-slate-300 transition-colors hover:border-brand-500/30 hover:text-white"><Shield className="h-4 w-4" />Pedir acesso comercial</button>
              <button onClick={() => navigate('/help')} className="inline-flex items-center gap-2 rounded-xl border border-surface bg-surface-1 px-5 py-3 text-sm text-slate-300 transition-colors hover:border-brand-500/30 hover:text-white"><HelpCircle className="h-4 w-4" />Ajuda</button>
              <a href="#como-funciona" className="inline-flex items-center gap-2 rounded-xl border border-surface bg-surface-1 px-5 py-3 text-sm text-slate-300 transition-colors hover:border-brand-500/30 hover:text-white"><PlayCircle className="h-4 w-4" />Ver como funciona</a>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {highlights.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.title} className="rounded-[22px] border border-surface bg-surface-1/90 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.14)]">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.03] text-brand-300"><Icon className="h-5 w-5" /></div>
                    <h3 className="mt-4 text-sm font-medium text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{item.text}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-[30px] border border-surface bg-surface-1/90 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
            <div className="rounded-[24px] border border-white/5 bg-gradient-to-br from-surface-2 via-surface-2 to-surface-1 p-6">
              <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">Como comecar</p>
              <div className="mt-5 space-y-4">
                {steps.map((step, index) => (
                  <div key={step} className="flex items-start gap-4 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-sm font-medium text-brand-300">{index + 1}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{step}</p>
                      <p className="mt-1 text-xs leading-5 text-muted">
                        {index === 0 && 'Use o login ou peca acesso ao seu admin.'}
                        {index === 1 && 'O QR Code e os setores colocam sua operacao em ordem.'}
                        {index === 2 && 'A equipe ja entra com visao clara de fila e atendimento.'}
                      </p>
                    </div>
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-300" />
                  </div>
                ))}
              </div>
            </div>

            <div id="como-funciona" className="mt-5 rounded-[24px] border border-surface bg-surface-2 p-6">
              <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">O que voce ve depois de entrar</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4">
                  <p className="text-sm font-medium text-white">Painel operacional</p>
                  <p className="mt-1 text-xs leading-5 text-muted">Fila, atendimento, alertas e produtividade em tempo real.</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4">
                  <p className="text-sm font-medium text-white">Gestao completa</p>
                  <p className="mt-1 text-xs leading-5 text-muted">Usuarios, setores, respostas rapidas, auditoria e relatorios.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
