import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Loader2, Mail, ShieldCheck, UserPlus, HelpCircle } from 'lucide-react'
import api from '../services/api'
import ThemeToggle from '../components/ui/ThemeToggle'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [resetUrl, setResetUrl] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setResetUrl('')
    try {
      const { data } = await api.post('/auth/forgot-password', { email })
      setMessage(data?.message || 'Se o e-mail existir, enviamos um link de redefinição.')
      setResetUrl(data?.reset_url || '')
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Nao foi possivel processar a solicitação.')
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
        <div className="absolute left-1/2 top-1/3 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-brand-600/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center justify-center">
        <div className="grid w-full gap-6 rounded-[30px] border border-surface bg-surface-1/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur lg:grid-cols-[0.95fr_1.05fr] lg:p-8">
          <div className="rounded-[26px] border border-surface bg-gradient-to-br from-surface-2 via-surface-2 to-surface-1 p-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600/20 text-brand-300 ring-1 ring-brand-500/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="mt-5 text-[11px] uppercase tracking-[0.18em] text-subtle">Recuperacao de acesso</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Esqueceu sua senha?</h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              Digite seu e-mail para gerar um link de redefinição. No ambiente local, o link aparece na tela para facilitar o teste.
            </p>
            <div className="mt-6 space-y-3 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">Você recebe um link de redefinição válido por 2 horas.</div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">Depois, basta definir uma nova senha e entrar normalmente.</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="rounded-[26px] border border-surface bg-surface-2 p-7">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-subtle">Redefinir senha</p>
              <h2 className="mt-1 text-2xl font-medium text-white">Receba seu link por e-mail</h2>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm text-subtle">E-mail cadastrado</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-surface bg-surface-1 px-4 py-3 text-sm text-white placeholder-gray-600 transition-colors focus:border-brand-500 focus:outline-none"
                  placeholder="voce@empresa.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-500 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Gerar link
              </button>

              {message && <p className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 text-sm text-slate-200">{message}</p>}

              {resetUrl && (
                <div className="rounded-xl border border-brand-500/20 bg-brand-500/10 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-brand-300">Link de teste</p>
                  <p className="mt-2 break-all text-sm text-white">{`${window.location.origin}${resetUrl}`}</p>
                  <button
                    type="button"
                    onClick={() => navigate(resetUrl)}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-500"
                  >
                    Abrir redefinição
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full rounded-xl border border-surface bg-surface-1 px-4 py-3 text-sm text-slate-300 transition-colors hover:border-brand-500/30 hover:text-white"
                >
                  Voltar para login
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/request-access')}
                  className="w-full rounded-xl border border-surface bg-surface-1 px-4 py-3 text-sm text-slate-300 transition-colors hover:border-brand-500/30 hover:text-white"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Solicitar acesso
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/help')}
                  className="w-full rounded-xl border border-surface bg-surface-1 px-4 py-3 text-sm text-slate-300 transition-colors hover:border-brand-500/30 hover:text-white"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <HelpCircle className="h-4 w-4" />
                    Ver ajuda
                  </span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
