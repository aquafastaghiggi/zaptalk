import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Loader2, ShieldCheck, UserPlus, KeyRound, LogIn } from 'lucide-react'
import api from '../services/api'
import ThemeToggle from '../components/ui/ThemeToggle'

export default function SignUpPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    setCreated(null)
    try {
      const { data } = await api.post('/public/signup', {
        name: form.name,
        email: form.email,
        password: form.password || undefined,
        role: 'agent',
      })
      setCreated(data)
      setForm({ name: '', email: '', password: '' })
    } catch (err) {
      setError(err.response?.data?.detail || 'Nao foi possivel criar a conta.')
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

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full gap-6 rounded-[30px] border border-surface bg-surface-1/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur lg:grid-cols-[0.95fr_1.05fr] lg:p-8">
          <div className="rounded-[26px] border border-surface bg-gradient-to-br from-surface-2 via-surface-2 to-surface-1 p-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600/20 text-brand-300 ring-1 ring-brand-500/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="mt-5 text-[11px] uppercase tracking-[0.18em] text-subtle">Criar conta</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Comece seu teste agora</h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              Crie uma conta para testar o fluxo real: entrar, trocar senha no primeiro acesso e seguir para o painel.
            </p>
            <div className="mt-6 space-y-3 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">Depois de criar a conta, você recebe os dados para entrar imediatamente.</div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">Se já tem conta, o login fica a um clique de distância.</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="rounded-[26px] border border-surface bg-surface-2 p-7">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-subtle">Cadastro rápido</p>
              <h2 className="mt-1 text-2xl font-medium text-white">Preencha seus dados</h2>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm text-subtle">Seu nome</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                  required
                  className="w-full rounded-xl border border-surface bg-surface-1 px-4 py-3 text-sm text-white placeholder-gray-600 transition-colors focus:border-brand-500 focus:outline-none"
                  placeholder="Como podemos te chamar?"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-subtle">E-mail</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                  required
                  className="w-full rounded-xl border border-surface bg-surface-1 px-4 py-3 text-sm text-white placeholder-gray-600 transition-colors focus:border-brand-500 focus:outline-none"
                  placeholder="voce@empresa.com"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-subtle">Senha opcional</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))}
                  className="w-full rounded-xl border border-surface bg-surface-1 px-4 py-3 text-sm text-white placeholder-gray-600 transition-colors focus:border-brand-500 focus:outline-none"
                  placeholder="Se preferir, defina agora. Se não, geramos uma temporária."
                />
              </div>

              {error && <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</p>}

              {created && (
                <div className="rounded-2xl border border-brand-500/20 bg-brand-500/10 px-4 py-4 text-sm">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-brand-300">Conta criada</p>
                  <p className="mt-2 text-slate-200">Use este e-mail para entrar:</p>
                  <p className="mt-1 font-medium text-white break-all">{created.user?.email}</p>
                  <p className="mt-3 text-slate-200">Senha temporária:</p>
                  <div className="mt-2 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 font-mono text-base tracking-[0.18em] text-white break-all">
                    {created.temp_password}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-muted">No primeiro acesso, o sistema vai te levar para trocar a senha.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-500"
                    >
                      <LogIn className="h-3.5 w-3.5" />
                      Ir para login
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/forgot-password')}
                      className="inline-flex items-center gap-2 rounded-xl border border-surface bg-surface-1 px-4 py-2 text-xs text-slate-300 transition-colors hover:border-brand-500/30 hover:text-white"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Esqueci minha senha
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-500 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Criar conta
              </button>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full rounded-xl border border-surface bg-surface-1 px-4 py-3 text-sm text-slate-300 transition-colors hover:border-brand-500/30 hover:text-white"
                >
                  Já tenho conta
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/request-access')}
                  className="w-full rounded-xl border border-surface bg-surface-1 px-4 py-3 text-sm text-slate-300 transition-colors hover:border-brand-500/30 hover:text-white"
                >
                  Pedir acesso comercial
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
