import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Loader2, ShieldCheck, KeyRound, HelpCircle } from 'lucide-react'
import api from '../services/api'
import ThemeToggle from '../components/ui/ThemeToggle'

export default function InviteAcceptPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const { data } = await api.get(`/public/invitation/${token}`)
        setPreview(data || null)
      } catch (err) {
        setError(err.response?.data?.detail || 'Convite inválido ou expirado.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('A confirmação precisa ser igual à senha.')
      return
    }

    setSubmitting(true)
    try {
      await api.post('/public/invitation/accept', {
        token,
        password,
      })
      navigate('/signup-confirmed?source=invite', {
        replace: true,
        state: {
          name: preview?.name,
          email: preview?.email,
        },
      })
    } catch (err) {
      setError(err.response?.data?.detail || 'Nao foi possivel concluir o cadastro.')
    } finally {
      setSubmitting(false)
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

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full gap-6 rounded-[30px] border border-surface bg-surface-1/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur lg:grid-cols-[0.95fr_1.05fr] lg:p-8">
          <div className="rounded-[26px] border border-surface bg-gradient-to-br from-surface-2 via-surface-2 to-surface-1 p-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600/20 text-brand-300 ring-1 ring-brand-500/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="mt-5 text-[11px] uppercase tracking-[0.18em] text-subtle">Convite</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Finalize seu acesso</h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              {loading ? 'Carregando convite...' : preview ? `Olá, ${preview.name}. Crie sua senha para entrar no ZapTalk.` : 'Confira o convite para continuar.'}
            </p>
            <div className="mt-6 space-y-3 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">O link do convite expira automaticamente por segurança.</div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">Depois de confirmar, você entra direto no fluxo normal do sistema.</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="rounded-[26px] border border-surface bg-surface-2 p-7">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-subtle">Cadastro confirmado</p>
              <h2 className="mt-1 text-2xl font-medium text-white">Defina sua senha</h2>
            </div>

            <div className="mt-6 space-y-4">
              {preview && (
                <div className="rounded-2xl border border-white/5 bg-surface-1 px-4 py-3 text-sm text-slate-200">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-brand-300">Dados do convite</p>
                  <p className="mt-2 font-medium text-white">{preview.email}</p>
                  <p className="mt-1 text-xs text-muted">Convite válido até {new Date(preview.expires_at).toLocaleString('pt-BR')}</p>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm text-subtle">Nova senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-surface bg-surface-1 px-4 py-3 text-sm text-white placeholder-gray-600 transition-colors focus:border-brand-500 focus:outline-none"
                  placeholder="Crie uma senha segura"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-subtle">Confirmar senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-surface bg-surface-1 px-4 py-3 text-sm text-white placeholder-gray-600 transition-colors focus:border-brand-500 focus:outline-none"
                  placeholder="Repita a senha"
                />
              </div>

              {error && <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</p>}

              <button
                type="submit"
                disabled={submitting || loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-500 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Confirmar cadastro
              </button>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => navigate('/help')}
                  className="w-full rounded-xl border border-surface bg-surface-1 px-4 py-3 text-sm text-slate-300 transition-colors hover:border-brand-500/30 hover:text-white"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <HelpCircle className="h-4 w-4" />
                    Preciso de ajuda
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full rounded-xl border border-surface bg-surface-1 px-4 py-3 text-sm text-slate-300 transition-colors hover:border-brand-500/30 hover:text-white"
                >
                  Já tenho acesso
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
