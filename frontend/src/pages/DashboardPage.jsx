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
    blue: 'text-blue-400 bg-blue-500/15',
    green: 'text-green-400 bg-green-500/15',
    yellow: 'text-yellow-400 bg-yellow-500/15',
    red: 'text-red-400 bg-red-500/15',
    slate: 'text-slate-300 bg-slate-500/15',
  }

  return (
    <div className="bg-surface-2 border border-surface rounded-2xl p-4 min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-subtle">{label}</p>
          <p className="text-2xl font-semibold text-white mt-1">{value}</p>
          {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
        </div>
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', tones[tone])}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
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
    <div className="border-b border-surface bg-surface-1/90 backdrop-blur">
      <div className="px-6 py-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-subtle">Painel operacional</p>
            <h2 className="text-sm font-medium text-white">Resumo da operação em tempo real</h2>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={load}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-white transition-colors border border-surface rounded-lg px-3 py-2"
            >
              <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
              Atualizar
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
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

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
          <div className="bg-surface-2 border border-surface rounded-2xl p-4 xl:col-span-1">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-sm font-medium text-white">Alertas SLA</h3>
              <span className="text-[11px] text-muted">{summary.sla_overdue || 0} pendencia(s)</span>
            </div>
            {alerts.length === 0 ? (
              <div className="text-xs text-muted bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2">
                Nenhum alerta ativo no momento.
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.key} className="rounded-xl border border-surface bg-surface-3/60 p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-xs font-medium text-white">{alert.label}</p>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">{alert.count}</span>
                    </div>
                    <div className="space-y-2">
                      {alert.items.map((item) => (
                        <div key={item.conversation_id} className="text-[11px] text-muted border border-surface rounded-lg px-2.5 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-white font-medium">{item.contact_name}</span>
                            <span>{item.priority > 0 ? `Prioridade ${item.priority}` : 'Normal'}</span>
                          </div>
                          <p className="mt-1">
                            {item.agent_name ? `${item.agent_name} · ` : ''}
                            {item.sector || 'Sem setor'} · {item.minutes_open ?? item.minutes_idle} min
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-surface-2 border border-surface rounded-2xl p-4">
            <h3 className="text-sm font-medium text-white mb-3">Por status</h3>
            <div className="space-y-2">
              {statusBreakdown.map((item) => (
                <div key={item.status} className="flex items-center justify-between gap-3 text-sm bg-surface-3/60 rounded-xl px-3 py-2">
                  <span className="text-muted">{item.label}</span>
                  <span className="text-white font-medium">{item.count}</span>
                </div>
              ))}
            </div>

            <h3 className="text-sm font-medium text-white mt-5 mb-3">Por agente</h3>
            <div className="space-y-2 max-h-56 overflow-auto pr-1">
              {byAgent.length === 0 ? (
                <p className="text-xs text-muted">Sem dados de agentes para exibir.</p>
              ) : (
                byAgent.map((item) => (
                  <div key={item.id || item.name} className="flex items-center justify-between gap-3 text-xs bg-surface-3/60 rounded-xl px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-white truncate">{item.name}</p>
                      <p className="text-muted truncate">{item.sector || 'Sem setor'}</p>
                    </div>
                    <span className="text-white font-medium shrink-0">{item.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-surface-2 border border-surface rounded-2xl p-4">
            <h3 className="text-sm font-medium text-white mb-3">Por setor</h3>
            <div className="space-y-2 max-h-72 overflow-auto pr-1">
              {bySector.length === 0 ? (
                <p className="text-xs text-muted">Sem dados de setores para exibir.</p>
              ) : (
                bySector.map((item) => (
                  <div key={item.id || item.name} className="flex items-center justify-between gap-3 text-xs bg-surface-3/60 rounded-xl px-3 py-2">
                    <span className="text-white truncate">{item.name}</span>
                    <span className="text-white font-medium shrink-0">{item.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
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
