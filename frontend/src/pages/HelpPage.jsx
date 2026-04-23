import { useNavigate } from 'react-router-dom'
import { ArrowLeft, HelpCircle, KeyRound, Mail, MessageSquare, QrCode, UserPlus } from 'lucide-react'
import ThemeToggle from '../components/ui/ThemeToggle'

const faqs = [
  {
    question: 'Como eu crio minha conta?',
    answer: 'Use a pagina Criar conta ou solicite acesso para seu time. Depois voce confirma os dados e entra no sistema.',
  },
  {
    question: 'Esqueci minha senha. O que faço?',
    answer: 'Clique em Esqueci minha senha, digite seu e-mail e abra o link de redefinicao que aparece na tela ou chega no e-mail.',
  },
  {
    question: 'Como funciona o convite por e-mail?',
    answer: 'O admin envia um convite para seu e-mail. Voce abre o link, define a senha e confirma o cadastro em poucos passos.',
  },
  {
    question: 'O que preciso para conectar o WhatsApp?',
    answer: 'Abra o admin, crie a instancia e escaneie o QR Code com o WhatsApp do celular para liberar o atendimento.',
  },
]

const quickSteps = [
  { icon: UserPlus, title: 'Criar conta', text: 'Se voce esta testando, comece pela criacao de conta.' },
  { icon: Mail, title: 'Recuperar acesso', text: 'Use o fluxo de senha para voltar a entrar rapidamente.' },
  { icon: QrCode, title: 'Conectar WhatsApp', text: 'Depois do login, o admin guia o pareamento com QR.' },
]

export default function HelpPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen overflow-hidden bg-surface-0 px-4 py-8 text-white">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/3 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-brand-600/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-6 rounded-[30px] border border-surface bg-surface-1/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur lg:grid-cols-[0.92fr_1.08fr] lg:p-8">
          <div className="rounded-[26px] border border-surface bg-gradient-to-br from-surface-2 via-surface-2 to-surface-1 p-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600/20 text-brand-300 ring-1 ring-brand-500/20">
              <HelpCircle className="h-6 w-6" />
            </div>
            <p className="mt-5 text-[11px] uppercase tracking-[0.18em] text-subtle">Ajuda rapida</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">FAQ curto para comecar sem travar</h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              Aqui estao as respostas mais comuns para quem acabou de conhecer o ZapTalk e quer testar o fluxo inteiro.
            </p>
            <div className="mt-6 space-y-3 text-sm text-slate-300">
              {quickSteps.map((step) => {
                const Icon = step.icon
                return (
                  <div key={step.title} className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{step.title}</p>
                      <p className="mt-1 text-xs leading-5 text-muted">{step.text}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-[26px] border border-surface bg-surface-2 p-7">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-subtle">Perguntas frequentes</p>
              <h2 className="mt-1 text-2xl font-medium text-white">O que costuma gerar duvida</h2>
            </div>

            <div className="mt-6 space-y-4">
              {faqs.map((faq) => (
                <div key={faq.question} className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4">
                  <p className="text-sm font-medium text-white">{faq.question}</p>
                  <p className="mt-2 text-sm leading-6 text-muted">{faq.answer}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-surface bg-surface-1 px-4 py-4 text-sm text-slate-300">
              <p className="text-[11px] uppercase tracking-[0.16em] text-brand-300">Dica</p>
              <p className="mt-2 leading-6">
                Se voce estiver testando agora, use a landing, crie uma conta, entre no sistema e siga o wizard de primeiro acesso.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-500"
              >
                <MessageSquare className="h-4 w-4" />
                Ir para login
              </button>
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
                Recuperar acesso
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 rounded-xl border border-surface bg-surface-1 px-4 py-3 text-sm text-slate-300 transition-colors hover:border-brand-500/30 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
