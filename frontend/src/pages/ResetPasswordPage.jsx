import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Loader2, Lock } from 'lucide-react'
import api from '../services/api'
import ThemeToggle from '../components/ui/ThemeToggle'

export default function ResetPasswordPage() {
  const { token: tokenParam } = useParams()
  const [token, setToken] = useState(tokenParam || '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('A confirmação precisa ser igual à nova senha.')
      return
    }

    setLoading(true)
    try {
      const { data } = await api.post('/auth/reset-password', {
        token,
        new_password: newPassword,
      })
      setMessage(data?.ok ? 'Senha redefinida com sucesso.' : 'Senha redefinida.')
      setTimeout(() => navigate('/login', { replace: true }), 900)
    } catch (err) {
      setError(err.response?.data?.detail || 'Nao foi possivel redefinir a senha.')
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
              <Lock className="h-6 w-6" />
            </div>
            <p className="mt-5 text-[11px] uppercase tracking-[0.18em] text-subtle">Nova senha</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Redefina seu acesso</h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              Insira o token recebido e defina uma nova senha para voltar ao sistema.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="rounded-[26px] border border-surface bg-surface-2 p-7">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-subtle">Reconfiguração</p>
              <h2 className="mt-1 text-2xl font-medium text-white">Defina uma nova senha</h2>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm text-subtle">Token de redefinição</label>
                <input
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                  className="w-full rounded-xl border border-surface bg-surface-1 px-4 py-3 text-sm text-white placeholder-gray-600 transition-colors focus:border-brand-500 focus:outline-none"
                  placeholder="Cole o token aqui"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-subtle">Nova senha</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-surface bg-surface-1 px-4 py-3 text-sm text-white placeholder-gray-600 transition-colors focus:border-brand-500 focus:outline-none"
                  placeholder="Mínimo de 6 caracteres"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-subtle">Confirmar nova senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-surface bg-surface-1 px-4 py-3 text-sm text-white placeholder-gray-600 transition-colors focus:border-brand-500 focus:outline-none"
                  placeholder="Repita a nova senha"
                />
              </div>

              {error && <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</p>}
              {message && <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">{message}</p>}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-500 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Redefinir senha
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
