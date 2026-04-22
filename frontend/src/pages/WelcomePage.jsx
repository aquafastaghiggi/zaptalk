import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Loader2, Sparkles, BadgeCheck, MessagesSquare } from 'lucide-react'
import api from '../services/api'
import ThemeToggle from '../components/ui/ThemeToggle'
import { useAuthStore } from '../stores/authStore'
import { resolvePostLoginRoute } from '../utils/onboarding'

export default function WelcomePage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const loadMe = useAuthStore((s) => s.loadMe)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleStart = async () => {
    setLoading(true)
    setError('')
    try {
      await api.patch('/auth/first-login-done')
      const updatedUser = await loadMe()
      navigate(resolvePostLoginRoute(updatedUser || user), { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || 'Nao foi possivel concluir as boas-vindas.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen overflow-hidden bg-surface-0 px-4 py-8 text-white">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/3 h-[24rem] w-[24rem] -translate-x-1/2 rounded-full bg-brand-600/10 blur-3xl" />
        <div className="absolute right-1/4 bottom-0 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-6 rounded-[30px] border border-surface bg-surface-1/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur lg:grid-cols-[0.95fr_1.05fr] lg:p-8">
          <div className="rounded-[26px] border border-surface bg-gradient-to-br from-surface-2 via-surface-2 to-surface-1 p-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600/20 text-brand-300 ring-1 ring-brand-500/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <p className="mt-5 text-[11px] uppercase tracking-[0.18em] text-subtle">Primeiro acesso concluido</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Bem-vindo ao ZapTalk</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
              Seu perfil já está pronto para operar. Clique em continuar para entrar na fila e começar a atender.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <BadgeCheck className="h-4 w-4 text-emerald-300" />
                  Credenciais ativadas
                </div>
                <p className="mt-2 text-xs leading-5 text-muted">Seus dados e permissões já foram carregados.</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <MessagesSquare className="h-4 w-4 text-brand-300" />
                  Pronto para atender
                </div>
                <p className="mt-2 text-xs leading-5 text-muted">A partir daqui voce cai direto na sua area de trabalho.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[26px] border border-surface bg-surface-2 p-7">
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-subtle">Seu acesso</p>
              <h2 className="mt-2 text-2xl font-medium text-white">{user?.name || 'Atendente'}</h2>
              <p className="mt-1 text-sm text-muted">{user?.email}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-brand-500/15 px-3 py-1 text-[11px] font-medium text-brand-300">
                  {user?.role || 'agent'}
                </span>
                {user?.sector_id ? (
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-medium text-emerald-300">
                    Setor vinculado
                  </span>
                ) : (
                  <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] font-medium text-muted">
                    Sem setor definido
                  </span>
                )}
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                {user?.sector_id ? 'Seu setor já foi associado e o sistema está pronto para distribuir conversas.' : 'O admin pode associar o seu setor depois, sem bloquear seu acesso.'}
              </p>
            </div>

            {error && <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</p>}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4 text-sm text-slate-300">
                <p className="font-medium text-white">O que acontece agora</p>
                <p className="mt-1 text-xs leading-5 text-muted">Voce entra na lista de conversas e pode começar a atender imediatamente.</p>
              </div>
              <button
                type="button"
                onClick={handleStart}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-4 text-sm font-medium text-white transition-colors hover:bg-brand-500 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Começar a atender
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
