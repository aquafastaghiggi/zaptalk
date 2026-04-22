import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Users, Mail, KeyRound } from 'lucide-react'
import api from '../services/api'
import ThemeToggle from '../components/ui/ThemeToggle'

export default function RequestAccessPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')
    try {
      await api.post('/public/access-requests', form)
      setMessage('Recebemos seu pedido. Nossa equipe vai entrar em contato.')
      setForm({ name: '', email: '', company: '', phone: '', message: '' })
    } catch (err) {
      setError(err.response?.data?.detail || 'Nao foi possivel enviar sua solicitacao.')
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
              <Users className="h-6 w-6" />
            </div>
            <p className="mt-5 text-[11px] uppercase tracking-[0.18em] text-subtle">Solicitar acesso</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Peça acesso ao ZapTalk</h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              Preencha seus dados e a equipe te retorna com instruções de acesso ou demonstração.
            </p>
            <div className="mt-6 space-y-3 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">Ideal para quem veio de anúncio e quer começar sem perder tempo.</div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">Você também pode pedir uma demonstração guiada.</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="rounded-[26px] border border-surface bg-surface-2 p-7">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-subtle">Contato</p>
              <h2 className="mt-1 text-2xl font-medium text-white">Solicite acesso comercial</h2>
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-subtle">Empresa</label>
                  <input
                    value={form.company}
                    onChange={(e) => setForm((current) => ({ ...current, company: e.target.value }))}
                    className="w-full rounded-xl border border-surface bg-surface-1 px-4 py-3 text-sm text-white placeholder-gray-600 transition-colors focus:border-brand-500 focus:outline-none"
                    placeholder="Nome da empresa"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-subtle">Telefone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))}
                    className="w-full rounded-xl border border-surface bg-surface-1 px-4 py-3 text-sm text-white placeholder-gray-600 transition-colors focus:border-brand-500 focus:outline-none"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm text-subtle">Mensagem</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm((current) => ({ ...current, message: e.target.value }))}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-surface bg-surface-1 px-4 py-3 text-sm text-white placeholder-gray-600 transition-colors focus:border-brand-500 focus:outline-none"
                  placeholder="Conte rapidamente o que você precisa..."
                />
              </div>

              {error && <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</p>}
              {message && <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">{message}</p>}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-500 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Enviar solicitação
              </button>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full rounded-xl border border-surface bg-surface-1 px-4 py-3 text-sm text-slate-300 transition-colors hover:border-brand-500/30 hover:text-white"
              >
                Já tenho acesso
              </button>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="w-full rounded-xl border border-surface bg-surface-1 px-4 py-3 text-sm text-slate-300 transition-colors hover:border-brand-500/30 hover:text-white"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  Recuperar acesso
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
