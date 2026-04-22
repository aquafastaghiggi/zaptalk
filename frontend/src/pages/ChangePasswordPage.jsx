import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Loader2, Lock, ShieldCheck, Sparkles } from 'lucide-react'
import api from '../services/api'
import ThemeToggle from '../components/ui/ThemeToggle'
import { useAuthStore } from '../stores/authStore'
import { resolvePostLoginRoute } from '../utils/onboarding'

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const loadMe = useAuthStore((s) => s.loadMe)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('A nova senha e a confirmacao precisam ser iguais.')
      return
    }
    if (newPassword.length < 6) {
      setError('A nova senha precisa ter pelo menos 6 caracteres.')
      return
    }

    setLoading(true)
    try {
      await api.patch('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      const updatedUser = await loadMe()
      navigate(resolvePostLoginRoute(updatedUser || user), { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || 'Nao foi possivel trocar a senha.')
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
        <div className="absolute left-1/2 top-1/3 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-brand-600/10 blur-3xl" />
        <div className="absolute right-1/4 bottom-0 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-6 rounded-[30px] border border-surface bg-surface-1/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur lg:grid-cols-[1.05fr_0.95fr] lg:p-8">
          <div className="relative overflow-hidden rounded-[26px] border border-surface bg-gradient-to-br from-surface-2 via-surface-2 to-surface-1 p-7">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.12),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_45%)]" />
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600/20 text-brand-300 ring-1 ring-brand-500/20">
                <Lock className="h-6 w-6" />
              </div>
              <p className="mt-5 text-[11px] uppercase tracking-[0.18em] text-subtle">Primeiro acesso</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Troque sua senha antes de continuar</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
                Isso protege seu acesso e libera o fluxo correto do sistema. Depois da troca, você segue automaticamente para a próxima tela do seu perfil.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <ShieldCheck className="h-4 w-4 text-emerald-300" />
                    Senha forte
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted">Use uma senha exclusiva para este acesso.</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <Sparkles className="h-4 w-4 text-brand-300" />
                    Fluxo guiado
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted">O sistema decide a tela seguinte sozinho.</p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="rounded-[26px] border border-surface bg-surface-2 p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-subtle">Seguranca</p>
                <h2 className="mt-1 text-xl font-medium text-white">Defina sua nova senha</h2>
              </div>
              <div className="rounded-full border border-white/5 bg-white/[0.03] px-3 py-1 text-[11px] text-muted">
                Requerido no primeiro acesso
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs text-subtle">Senha atual</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-surface bg-surface-1 px-4 py-3 text-sm text-white placeholder-gray-600 transition-colors focus:border-brand-500 focus:outline-none"
                  placeholder="Digite sua senha atual"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-subtle">Nova senha</label>
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
                <label className="mb-1.5 block text-xs text-subtle">Confirmar nova senha</label>
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

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-500 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Continuar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
