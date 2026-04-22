import { useEffect, useState } from 'react'
import api from '../../services/api'
import { Search } from 'lucide-react'
import clsx from 'clsx'

function Badge({ children, color = 'gray' }) {
  const colors = {
    green: 'bg-green-500/15 text-green-400',
    yellow: 'bg-yellow-500/15 text-yellow-400',
    red: 'bg-red-500/15 text-red-400',
    gray: 'bg-slate-500/15 text-slate-400',
    blue: 'bg-blue-500/15 text-blue-400',
  }
  return (
    <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full', colors[color])}>
      {children}
    </span>
  )
}

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

function Select({ label, children, ...props }) {
  return (
    <div>
      <label className="block text-xs text-subtle mb-1.5">{label}</label>
      <select
        className="w-full bg-surface-2 border border-surface rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
        {...props}
      >
        {children}
      </select>
    </div>
  )
}

function formatAuditAction(action) {
  if (!action) return 'Ação'
  return action.replaceAll('.', ' / ').replaceAll('_', ' ')
}

export default function AuditTab() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    action: '',
    entity_type: '',
    limit: 50,
  })
  const [draft, setDraft] = useState({
    action: '',
    entity_type: '',
    limit: 50,
  })

  const load = async (nextFilters = filters) => {
    setLoading(true)
    try {
      const params = {
        limit: Number(nextFilters.limit) || 50,
      }
      if (nextFilters.action.trim()) params.action = nextFilters.action.trim()
      if (nextFilters.entity_type.trim()) params.entity_type = nextFilters.entity_type.trim()

      const { data } = await api.get('/audit', { params })
      setLogs(Array.isArray(data) ? data : [])
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
    const next = { action: '', entity_type: '', limit: 50 }
    setDraft(next)
    setFilters(next)
    await load(next)
  }

  return (
    <div>
      <form onSubmit={applyFilters} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <Input
          label="Ação"
          value={draft.action}
          onChange={e => setDraft(f => ({ ...f, action: e.target.value }))}
          placeholder="conversation.transferred"
        />
        <Input
          label="Entidade"
          value={draft.entity_type}
          onChange={e => setDraft(f => ({ ...f, entity_type: e.target.value }))}
          placeholder="conversation, user, sector"
        />
        <Select
          label="Limite"
          value={draft.limit}
          onChange={e => setDraft(f => ({ ...f, limit: Number(e.target.value) }))}
        >
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={200}>200</option>
        </Select>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-brand-600 hover:bg-brand-500 text-white px-3 py-2.5 rounded-lg transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
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
      </form>

      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted">{logs.length} registro(s)</p>
        {loading && <p className="text-xs text-muted">Carregando...</p>}
      </div>

      <div className="space-y-2 max-h-[62vh] overflow-auto pr-1">
        {logs.length === 0 && !loading && (
          <div className="text-center py-10 text-muted text-sm bg-surface-2 border border-surface rounded-2xl">
            Nenhum registro encontrado.
          </div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="bg-surface-2 border border-surface rounded-xl px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-white font-medium truncate">{formatAuditAction(log.action)}</p>
                <p className="text-xs text-muted truncate">
                  {log.entity_type}
                  {log.entity_id ? ` · ${log.entity_id}` : ''}
                </p>
              </div>
              <p className="text-[11px] text-muted shrink-0">{new Date(log.created_at).toLocaleString('pt-BR')}</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap mt-2">
              {log.actor ? (
                <Badge color="blue">{log.actor.name}</Badge>
              ) : (
                <Badge color="gray">Sistema</Badge>
              )}
              {log.actor?.role && <Badge color="gray">{log.actor.role}</Badge>}
            </div>

            {log.details && Object.keys(log.details).length > 0 && (
              <pre className="mt-3 text-[11px] text-muted bg-surface-3 rounded-lg p-3 whitespace-pre-wrap break-words">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
