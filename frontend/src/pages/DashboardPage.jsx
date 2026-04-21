import { useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import Sidebar from '../components/layout/Sidebar'
import ChatArea from '../components/chat/ChatArea'
import { useWebSocket } from '../hooks/useWebSocket'
import { useAuthStore } from '../stores/authStore'
import { AlertTriangle, BarChart3, Clock3, RefreshCw, Timer, Users } from 'lucide-react'
import clsx from 'clsx'
import ThemeToggle from '../components/ui/ThemeToggle'

function MetricCard({ label, value, hint, icon: Icon, tone = 'blue' }) {
  const tones = {
    blue: 'text-blue-300 bg-blue-500/12 ring-blue-400/15',
    green: 'text-green-300 bg-green-500/12 ring-green-400/15',
    yellow: 'text-yellow-300 bg-yellow-500/12 ring-yellow-400/15',
    red: 'text-red-300 bg-red-500/12 ring-red-400/15',
    slate: 'text-slate-200 bg-slate-500/12 ring-slate-400/15',
  }

  return (
    <div className="group relative min-w-0 overflow-hidden rounded-3xl border border-surface bg-gradient-to-br from-surface-2 via-surface-2 to-surface-1 p-5 shadow-[0_1px_0_rgba(255,255,255,0.02),0_10px_30px_rgba(0,0,0,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500/20">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent opacity-60 pointer-events-none" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-subtle">{label}</p>
          <p className="mt-2 text-[2rem] leading-none font-semibold text-white tracking-tight">{value}</p>
          {hint && <p className="mt-3 text-[11px] leading-5 text-muted">{hint}</p>}
        </div>
        <div className={clsx('w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ring-1 backdrop-blur-sm', tones[tone])}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  )
}

function SectionShell({ title, subtitle, action, children, className = '' }) {
  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-3xl border border-surface bg-gradient-to-br from-surface-2 via-surface-2 to-surface-1 p-4 shadow-[0_1px_0_rgba(255,255,255,0.02),0_16px_40px_rgba(0,0,0,0.12)]',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.03),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.015),transparent_42%)]" />
      <div className="relative mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-white">{title}</h3>
          {subtitle && <p className="mt-1 text-[11px] leading-5 text-muted">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="relative">{children}</div>
    </div>
  )
}

function ProgressRow({ label, count, max = 0, meta, tone = 'blue' }) {
  const tones = {
    blue: 'from-blue-400/55 via-blue-400/35 to-blue-400/15',
    green: 'from-green-400/55 via-green-400/35 to-green-400/15',
    yellow: 'from-amber-400/55 via-amber-400/35 to-amber-400/15',
    red: 'from-red-400/55 via-red-400/35 to-red-400/15',
    slate: 'from-slate-400/55 via-slate-400/35 to-slate-400/15',
  }
  const width = max > 0 ? Math.max(8, Math.round((count / max) * 100)) : 0

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-white">{label}</p>
          {meta && <p className="mt-0.5 text-[11px] leading-4 text-muted">{meta}</p>}
        </div>
        <span className="shrink-0 rounded-full border border-white/5 bg-surface-0/70 px-2.5 py-1 text-[11px] font-medium text-white">
          {count}
        </span>
      </div>
      {max > 0 && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
          <div
            className={clsx('h-full rounded-full bg-gradient-to-r', tones[tone])}
            style={{ width: `${width}%` }}
          />
        </div>
      )}
    </div>
  )
}

function OperationalDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const { data: payload } = await api.get('/dashboard/overview')
      setData(payload)
    } catch (err) {
      setError(err.response?.data?.detail || 'Nao foi possivel carregar o painel operacional.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const timer = window.setInterval(load, 60000)
    return () => window.clearInterval(timer)
  }, [])

  const updatedAt = useMemo(() => {
    if (!data?.generated_at) return ''
    return new Date(data.generated_at).toLocaleString('pt-BR')
  }, [data])

  const summary = data?.summary || {}
  const alerts = data?.alerts || []
  const statusBreakdown = data?.status_breakdown || []
  const byAgent = data?.by_agent || []
  const bySector = data?.by_sector || []

  return (
    <div className="relative overflow-hidden border-b border-surface bg-gradient-to-b from-surface-1 via-surface-1/95 to-surface-0 backdrop-blur">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="px-6 py-5 space-y-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">Painel operacional</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h2 className="text-sm font-medium text-white">Resumo da operação em tempo real</h2>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-surface bg-surface-2 px-2.5 py-1 text-[11px] text-muted">
                <span className={clsx('h-1.5 w-1.5 rounded-full bg-green-400', loading && 'animate-pulse')} />
                Atualiza a cada 60s
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />
            <button
              onClick={load}
              className="inline-flex items-center gap-1.5 rounded-lg border border-surface bg-surface-2 px-3 py-2 text-xs text-muted transition-colors hover:border-brand-500/30 hover:text-white"
            >
              <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
              Atualizar
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-xs text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6 xl:gap-5">
          <MetricCard label="Na fila" value={summary.waiting ?? '-'} icon={BarChart3} tone="yellow" hint="Conversas aguardando" />
          <MetricCard label="Em atendimento" value={summary.in_progress ?? '-'} icon={Users} tone="blue" hint="Atendimentos ativos" />
          <MetricCard label="Finalizadas hoje" value={summary.finished_today ?? '-'} icon={Clock3} tone="green" hint="Encerradas no dia" />
          <MetricCard label="Agentes online" value={summary.online_agents ?? '-'} icon={Users} tone="slate" hint="Disponibilidade atual" />
          <MetricCard
            label="1a resposta"
            value={summary.avg_first_response_minutes != null ? `${summary.avg_first_response_minutes} min` : '-'}
            icon={Timer}
            tone="yellow"
            hint="Média entre entrada e resposta"
          />
          <MetricCard
            label="Resolução"
            value={summary.avg_resolution_minutes != null ? `${summary.avg_resolution_minutes} min` : '-'}
            icon={Timer}
            tone="green"
            hint="Média de encerramento"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <SectionShell
            title="Alertas SLA"
            subtitle="Chamados que precisam de atenção imediata."
            action={<span className="rounded-full border border-white/5 bg-surface-0/70 px-2.5 py-1 text-[11px] text-muted">{summary.sla_overdue || 0} pendencia(s)</span>}
            className="xl:col-span-1"
          >
            {alerts.length === 0 ? (
              <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/8 px-3 py-3 text-xs text-emerald-100/85">
                Nenhum alerta ativo no momento. Tudo está dentro do esperado.
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.key} className="rounded-2xl border border-white/5 bg-white/[0.03] p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white">{alert.label}</p>
                        <p className="mt-0.5 text-[11px] text-muted">Itens com risco de atraso</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-red-500/15 px-2.5 py-1 text-[11px] font-medium text-red-300">
                        {alert.count}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {alert.items.map((item) => (
                        <div
                          key={item.conversation_id}
                          className="rounded-xl border border-white/5 bg-surface-0/50 px-3 py-2.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-white">{item.contact_name}</p>
                              <p className="mt-1 text-[11px] leading-4 text-muted">
                                {item.agent_name ? `${item.agent_name} - ` : ''}
                                {item.sector || 'Sem setor'} - {item.minutes_open ?? item.minutes_idle} min
                              </p>
                            </div>
                            <span
                              className={clsx(
                                'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium',
                                item.priority > 0
                                  ? 'bg-amber-500/15 text-amber-300'
                                  : 'bg-slate-500/15 text-slate-300'
                              )}
                            >
                              {item.priority > 0 ? `Prioridade ${item.priority}` : 'Normal'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionShell>

          <SectionShell
            title="Por status"
            subtitle="Distribuição das conversas no momento."
            className="xl:col-span-1"
          >
            <div className="space-y-2.5">
              {statusBreakdown.length === 0 ? (
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] px-3 py-3 text-xs text-muted">
                  Sem dados de status para exibir.
                </div>
              ) : (
                statusBreakdown.map((item) => (
                  <ProgressRow
                    key={item.status}
                    label={item.label}
                    count={item.count}
                    max={Math.max(...statusBreakdown.map((entry) => entry.count || 0), 1)}
                    meta={item.status}
                    tone={item.status === 'in_progress' ? 'blue' : item.status === 'waiting' ? 'yellow' : 'green'}
                  />
                ))
              )}
            </div>

            <div className="mt-5">
              <h4 className="text-xs font-medium uppercase tracking-[0.16em] text-subtle">Por agente</h4>
              <div className="mt-2 space-y-2 max-h-56 overflow-auto pr-1">
                {byAgent.length === 0 ? (
                  <div className="rounded-2xl border border-white/5 bg-white/[0.02] px-3 py-3 text-xs text-muted">
                    Sem dados de agentes para exibir.
                  </div>
                ) : (
                  byAgent.map((item) => (
                    <ProgressRow
                      key={item.id || item.name}
                      label={item.name}
                      count={item.count}
                      max={Math.max(...byAgent.map((entry) => entry.count || 0), 1)}
                      meta={item.sector || 'Sem setor'}
                      tone="slate"
                    />
                  ))
                )}
              </div>
            </div>
          </SectionShell>

          <SectionShell
            title="Por setor"
            subtitle="Carga distribuída entre setores."
            className="xl:col-span-1"
          >
            <div className="space-y-2 max-h-[30rem] overflow-auto pr-1">
              {bySector.length === 0 ? (
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] px-3 py-3 text-xs text-muted">
                  Sem dados de setores para exibir.
                </div>
              ) : (
                bySector.map((item) => (
                  <ProgressRow
                    key={item.id || item.name}
                    label={item.name}
                    count={item.count}
                    max={Math.max(...bySector.map((entry) => entry.count || 0), 1)}
                    tone={item.count > 0 ? 'green' : 'slate'}
                  />
                ))
              )}
            </div>
          </SectionShell>
        </div>

        <div className="flex items-center justify-between gap-3 text-[11px] text-muted">
          <span>Atualizado em {updatedAt || 'agora'}</span>
          {loading && <span>Recarregando painel...</span>}
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  useWebSocket()
  const loadMe = useAuthStore((s) => s.loadMe)
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    loadMe()
  }, [])

  const canSeeDashboard = user && ['admin', 'manager'].includes(user.role)

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface-0">
      {canSeeDashboard && <OperationalDashboard />}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <ChatArea />
      </div>
    </div>
  )
}

