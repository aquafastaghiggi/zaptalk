import { useEffect, useState } from 'react'
import api from '../../services/api'
import { CalendarDays, Download, TrendingUp } from 'lucide-react'
import clsx from 'clsx'

function Input({ label, ...props }) {
  return (
    <div>
      <label className="block text-xs text-subtle mb-1.5">{label}</label>
      <input
        className="w-full bg-surface-2 border border-surface rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
        {...props}
      />
    </div>
  )
}

function BadgeCard({ label, value, tone = 'blue' }) {
  const tones = {
    blue: 'text-blue-400 bg-blue-500/15',
    green: 'text-green-400 bg-green-500/15',
    yellow: 'text-yellow-400 bg-yellow-500/15',
    red: 'text-red-400 bg-red-500/15',
    slate: 'text-slate-300 bg-slate-500/15',
  }

  return (
    <div className="bg-surface-2 border border-surface rounded-2xl p-4 min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-subtle">{label}</p>
      <div className="flex items-center justify-between gap-3 mt-2">
        <p className="text-2xl font-semibold text-white">{value}</p>
        <span className={clsx('w-9 h-9 rounded-xl flex items-center justify-center', tones[tone])}>
          <TrendingUp className="w-4 h-4" />
        </span>
      </div>
    </div>
  )
}

export default function ReportsTab() {
  const [filters, setFilters] = useState({
    date_from: '',
    date_to: '',
  })
  const [draft, setDraft] = useState({
    date_from: '',
    date_to: '',
  })
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const load = async (nextFilters = filters) => {
    setLoading(true)
    try {
      const params = {}
      if (nextFilters.date_from) params.date_from = nextFilters.date_from
      if (nextFilters.date_to) params.date_to = nextFilters.date_to
      const { data } = await api.get('/reports/overview', { params })
      setReport(data)
    } catch {
      setReport(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const applyFilters = async (e) => {
    e.preventDefault()
    setFilters(draft)
    await load(draft)
  }

  const clearFilters = async () => {
    const next = { date_from: '', date_to: '' }
    setDraft(next)
    setFilters(next)
    await load(next)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const params = {}
      if (filters.date_from) params.date_from = filters.date_from
      if (filters.date_to) params.date_to = filters.date_to
      const response = await api.get('/reports/export.csv', {
        params,
        responseType: 'blob',
      })
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'zaptalk-relatorio.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const summary = report?.summary || {}

  return (
    <div className="space-y-4">
      <form onSubmit={applyFilters} className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Input label="Data inicial" type="date" value={draft.date_from} onChange={e => setDraft(f => ({ ...f, date_from: e.target.value }))} />
        <Input label="Data final" type="date" value={draft.date_to} onChange={e => setDraft(f => ({ ...f, date_to: e.target.value }))} />
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-brand-600 hover:bg-brand-500 text-white px-3 py-2.5 rounded-lg transition-colors"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Filtrar
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs px-3 py-2.5 rounded-lg border border-surface text-slate-300 hover:bg-surface-3 transition-colors"
          >
            Limpar
          </button>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="w-full flex items-center justify-center gap-1.5 text-xs bg-surface-2 hover:bg-surface-3 border border-surface text-slate-200 px-3 py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? 'Exportando...' : 'Exportar CSV'}
          </button>
        </div>
      </form>

      <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
        <BadgeCard label="Conversas" value={summary.total_conversations ?? '-'} tone="blue" />
        <BadgeCard label="Fila" value={summary.waiting ?? '-'} tone="yellow" />
        <BadgeCard label="Em atendimento" value={summary.in_progress ?? '-'} tone="blue" />
        <BadgeCard label="Finalizadas" value={summary.finished ?? '-'} tone="green" />
        <BadgeCard label="Entrantes" value={summary.inbound_messages ?? '-'} tone="slate" />
        <BadgeCard label="Saídas" value={summary.outbound_messages ?? '-'} tone="slate" />
      </div>

      {loading && <p className="text-xs text-muted">Carregando relatórios...</p>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="bg-surface-2 border border-surface rounded-2xl p-4">
          <h3 className="text-sm font-medium text-white mb-3">Volume por dia</h3>
          <div className="space-y-2 max-h-72 overflow-auto pr-1">
            {(report?.by_day || []).map((row) => (
              <div key={row.date} className="flex items-center justify-between gap-3 text-xs bg-surface-3/60 rounded-xl px-3 py-2">
                <span className="text-muted">{row.date}</span>
                <span className="text-white font-medium">{row.count}</span>
              </div>
            ))}
            {!(report?.by_day || []).length && !loading && <p className="text-xs text-muted">Sem dados para o periodo.</p>}
          </div>
        </div>

        <div className="bg-surface-2 border border-surface rounded-2xl p-4">
          <h3 className="text-sm font-medium text-white mb-3">Por agente</h3>
          <div className="space-y-2 max-h-72 overflow-auto pr-1">
            {(report?.by_agent || []).map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-3 text-xs bg-surface-3/60 rounded-xl px-3 py-2">
                <div className="min-w-0">
                  <p className="text-white truncate">{row.name}</p>
                  <p className="text-muted truncate">{row.sector || 'Sem setor'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-white font-medium">{row.conversations}</p>
                  <p className="text-muted">final: {row.finished}</p>
                </div>
              </div>
            ))}
            {!(report?.by_agent || []).length && !loading && <p className="text-xs text-muted">Sem dados para o periodo.</p>}
          </div>
        </div>

        <div className="bg-surface-2 border border-surface rounded-2xl p-4">
          <h3 className="text-sm font-medium text-white mb-3">Por setor</h3>
          <div className="space-y-2 max-h-72 overflow-auto pr-1">
            {(report?.by_sector || []).map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-3 text-xs bg-surface-3/60 rounded-xl px-3 py-2">
                <div className="min-w-0">
                  <p className="text-white truncate">{row.name}</p>
                  <p className="text-muted truncate">fila {row.waiting} · andamento {row.in_progress}</p>
                </div>
                <span className="text-white font-medium shrink-0">{row.conversations}</span>
              </div>
            ))}
            {!(report?.by_sector || []).length && !loading && <p className="text-xs text-muted">Sem dados para o periodo.</p>}
          </div>
        </div>
      </div>

      <div className="bg-surface-2 border border-surface rounded-2xl p-4">
        <h3 className="text-sm font-medium text-white mb-3">Estagio do CRM</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-2">
          {(report?.by_stage || []).map((row) => (
            <div key={row.stage} className="flex items-center justify-between gap-3 text-xs bg-surface-3/60 rounded-xl px-3 py-2">
              <span className="text-muted truncate">{row.stage}</span>
              <span className="text-white font-medium">{row.count}</span>
            </div>
          ))}
          {!(report?.by_stage || []).length && !loading && <p className="text-xs text-muted">Sem dados para o periodo.</p>}
        </div>
      </div>
    </div>
  )
}
