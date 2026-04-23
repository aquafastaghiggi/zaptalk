import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Copy, HelpCircle, LogIn, ShieldCheck } from 'lucide-react'
import ThemeToggle from '../components/ui/ThemeToggle'
import { emitToast } from '../utils/toast'

function CopyButton({ value, label = 'Copiar' }) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      emitToast({
        title: 'Copiado',
        message: 'O valor foi copiado para a area de transferencia.',
        variant: 'success',
      })
    } catch {
      emitToast({
        title: 'Nao foi possivel copiar',
        message: 'Copie manualmente o conteudo mostrado na tela.',
        variant: 'error',
      })
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-2 rounded-xl border border-surface bg-surface-1 px-4 py-2.5 text-sm text-slate-300 transition-colors hover:border-brand-500/30 hover:text-white"
    >
      <Copy className="h-4 w-4" />
      {label}
    </button>
  )
}

export default function SignupConfirmedPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const source = searchParams.get('source') || 'signup'
  const state = location.state || {}

  const name = state.name || (source === 'invite' ? 'novo usuario' : 'usuario')
  const email = state.email || ''
  const tempPassword = state.tempPassword || state.temp_password || ''
  const inviteAccepted = source === 'invite'

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
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/20">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="mt-5 text-[11px] uppercase tracking-[0.18em] text-subtle">Cadastro concluido</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              {inviteAccepted ? 'Convite aceito com sucesso' : 'Sua conta esta pronta'}
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              {inviteAccepted
                ? 'Agora basta entrar com seu e-mail e a senha que voce acabou de definir.'
                : 'Use os dados abaixo para entrar pela primeira vez e seguir o fluxo normal do ZapTalk.'}
            </p>
            <div className="mt-6 space-y-3 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">Se precisar de ajuda, a pagina de FAQ explica os proximos passos.</div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">Depois do login, o sistema direciona voce para o lugar certo automaticamente.</div>
            </div>
          </div>

          <div className="rounded-[26px] border border-surface bg-surface-2 p-7">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-subtle">Resumo final</p>
              <h2 className="mt-1 text-2xl font-medium text-white">Pronto para entrar</h2>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-surface bg-surface-1 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-brand-300">Nome</p>
                <p className="mt-1 text-sm font-medium text-white">{name}</p>
              </div>

              {email && (
                <div className="rounded-2xl border border-surface bg-surface-1 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-brand-300">E-mail</p>
                  <p className="mt-1 text-sm font-medium text-white break-all">{email}</p>
                </div>
              )}

              {tempPassword && (
                <div className="rounded-2xl border border-brand-500/20 bg-brand-500/10 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-brand-300">Senha temporaria</p>
                  <p className="mt-2 font-mono text-sm tracking-[0.18em] text-white break-all">{tempPassword}</p>
                </div>
              )}

              {!tempPassword && (
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                  Agora voce pode usar sua senha definida no convite ou no cadastro.
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-500"
                >
                  <LogIn className="h-4 w-4" />
                  Ir para login
                </button>
                {(tempPassword || email) && (
                  <CopyButton
                    value={tempPassword || email}
                    label={tempPassword ? 'Copiar senha' : 'Copiar e-mail'}
                  />
                )}
                <button
                  type="button"
                  onClick={() => navigate('/help')}
                  className="inline-flex items-center gap-2 rounded-xl border border-surface bg-surface-1 px-4 py-3 text-sm text-slate-300 transition-colors hover:border-brand-500/30 hover:text-white"
                >
                  <HelpCircle className="h-4 w-4" />
                  Abrir ajuda
                </button>
              </div>

              <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 text-xs leading-5 text-muted">
                <span className="inline-flex items-center gap-2 text-brand-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Seguranca
                </span>
                <p className="mt-2">
                  {inviteAccepted
                    ? 'Seu convite foi marcado como utilizado e nao pode ser reutilizado.'
                    : 'Se o cadastro foi feito com senha temporaria, troque-a no primeiro acesso.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
