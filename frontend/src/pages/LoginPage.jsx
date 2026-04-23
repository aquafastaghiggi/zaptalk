import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, Loader2, ArrowLeft, KeyRound, UserPlus, HelpCircle } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import ThemeToggle from '../components/ui/ThemeToggle'
import { resolvePostLoginRoute } from '../utils/onboarding'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email, password)
      navigate(resolvePostLoginRoute(user), { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao autenticar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen overflow-hidden bg-surface-0 px-4 py-8 text-white">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-600/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-6 rounded-[30px] border border-surface bg-surface-1/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur lg:grid-cols-[0.95fr_1.05fr] lg:p-8">
          <div className="rounded-[26px] border border-surface bg-gradient-to-br from-surface-2 via-surface-2 to-surface-1 p-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/20">
              <MessageSquare className="h-6 w-6" />
            </div>
            <p className="mt-5 text-[11px] uppercase tracking-[0.18em] text-subtle">Acesso interno</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Entre no painel do ZapTalk</h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              Use seu e-mail e senha para continuar. Se voce ainda nao recebeu acesso, volte para a apresentacao do produto e siga o fluxo de cadastro.
            </p>
            <div className="mt-6 space-y-3 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">Primeiro acesso? Voce sera guiado automaticamente.</div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">Area interna, painel e gestao ficam aqui dentro.</div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-surface bg-surface-1 px-4 py-3 text-sm text-slate-300 transition-colors hover:border-brand-500/30 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para apresentacao
            </button>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate('/sign-up')}
                className="inline-flex items-center gap-2 rounded-xl border border-surface bg-surface-1 px-4 py-3 text-sm text-slate-300 transition-colors hover:border-brand-500/30 hover:text-white"
              >
                <UserPlus className="h-4 w-4" />
                Criar conta
              </button>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="inline-flex items-center gap-2 rounded-xl border border-surface bg-surface-1 px-4 py-3 text-sm text-slate-300 transition-colors hover:border-brand-500/30 hover:text-white"
              >
                <KeyRound className="h-4 w-4" />
                Esqueci minha senha
              </button>
              <button
                type="button"
                onClick={() => navigate('/request-access')}
                className="inline-flex items-center gap-2 rounded-xl border border-surface bg-surface-1 px-4 py-3 text-sm text-slate-300 transition-colors hover:border-brand-500/30 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Pedir acesso comercial
              </button>
              <button
                type="button"
                onClick={() => navigate('/help')}
                className="inline-flex items-center gap-2 rounded-xl border border-surface bg-surface-1 px-4 py-3 text-sm text-slate-300 transition-colors hover:border-brand-500/30 hover:text-white"
              >
                <HelpCircle className="h-4 w-4" />
                Ajuda
              </button>
            </div>
          </div>

          <div className="rounded-[26px] border border-surface bg-surface-2 p-7">
            <div className="mb-6">
              <p className="text-[11px] uppercase tracking-[0.16em] text-subtle">Autenticacao</p>
              <h2 className="mt-1 text-2xl font-medium text-white">Entre com suas credenciais</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm text-subtle">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@zaptalk.com"
                  className="w-full rounded-xl border border-surface bg-surface-1 px-4 py-3 text-sm text-white placeholder-gray-600 transition-colors focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-subtle">Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-surface bg-surface-1 px-4 py-3 text-sm text-white placeholder-gray-600 transition-colors focus:border-brand-500 focus:outline-none"
                />
              </div>

              {error && <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-500 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
