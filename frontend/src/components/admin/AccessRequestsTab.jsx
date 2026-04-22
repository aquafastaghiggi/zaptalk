import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock3, Mail, Phone, Search, XCircle } from 'lucide-react'
import api from '../../services/api'
import clsx from 'clsx'

function Badge({ children, color = 'gray' }) {
  const colors = {
    green: 'bg-green-500/15 text-green-400',
    yellow: 'bg-yellow-500/15 text-yellow-400',
    red: 'bg-red-500/15 text-red-400',
    gray: 'bg-slate-500/15 text-slate-400',
    blue: 'bg-blue-500/15 text-blue-400',
  }

  return <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full', colors[color])}>{children}</span>
}

const STATUS_OPTIONS = [
  { value: 'new', label: 'Nova', color: 'blue' },
  { value: 'contacted', label: 'Contatado', color: 'yellow' },
  { value: 'converted', label: 'Convertido', color: 'green' },
  { value: 'closed', label: 'Encerrado', color: 'red' },
]

export default function AccessRequestsTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('new')

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/public/access-requests')
      setItems(Array.isArray(data) ? data : [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filteredItems = useMemo(() => items.filter((item) => {
    const matchesFilter = filter === 'all' || item.status === filter
    const haystack = `${item.name || ''} ${item.email || ''} ${item.company || ''} ${item.message || ''}`.toLowerCase()
    const matchesQuery = !query || haystack.includes(query.toLowerCase())
    return matchesFilter && matchesQuery
  }), [items, filter, query])

  const updateStatus = async (requestId, status) => {
    await api.patch(`/public/access-requests/${requestId}`, { status })
    await load()
  }

  const statusLabel = (status) => STATUS_OPTIONS.find((option) => option.value === status)?.label || status || 'Nova'
  const statusColor = (status) => STATUS_OPTIONS.find((option) => option.value === status)?.color || 'gray'

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-3xl border border-surface bg-surface-1/90 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.12)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">Solicitações de acesso</p>
          <h3 className="mt-1 text-lg font-medium text-white">Leads e pedidos recebidos do site</h3>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setFilter('all')} className={clsx('rounded-xl px-3 py-2 text-xs transition-colors', filter === 'all' ? 'bg-brand-600 text-white' : 'bg-surface-2 text-slate-300 hover:text-white')}>Todas</button>
          <button onClick={() => setFilter('new')} className={clsx('rounded-xl px-3 py-2 text-xs transition-colors', filter === 'new' ? 'bg-brand-600 text-white' : 'bg-surface-2 text-slate-300 hover:text-white')}>Novas</button>
          <button onClick={() => setFilter('contacted')} className={clsx('rounded-xl px-3 py-2 text-xs transition-colors', filter === 'contacted' ? 'bg-brand-600 text-white' : 'bg-surface-2 text-slate-300 hover:text-white')}>Contatadas</button>
        </div>
      </div>

      <div className="rounded-3xl border border-surface bg-surface-1/90 p-4">
        <div className="flex items-center gap-2 rounded-2xl border border-surface bg-surface-2 px-3 py-2">
          <Search className="h-4 w-4 text-subtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, e-mail, empresa ou mensagem"
            className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-3">
        {loading && <div className="rounded-3xl border border-surface bg-surface-1/90 p-6 text-sm text-muted">Carregando solicitações...</div>}
        {!loading && filteredItems.length === 0 && (
          <div className="rounded-3xl border border-surface bg-surface-1/90 p-10 text-center text-sm text-muted">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-300/60" />
            Nenhuma solicitação encontrada.
          </div>
        )}
        {filteredItems.map((item) => (
          <div key={item.id} className="rounded-3xl border border-surface bg-surface-1/90 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.12)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-base font-medium text-white">{item.name}</h4>
                  <Badge color={statusColor(item.status)}>{statusLabel(item.status)}</Badge>
                  {item.company && <Badge color="blue">{item.company}</Badge>}
                </div>
                <div className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-2">
                  <p className="inline-flex items-center gap-2"><Mail className="h-4 w-4" /> {item.email}</p>
                  {item.phone && <p className="inline-flex items-center gap-2"><Phone className="h-4 w-4" /> {item.phone}</p>}
                  <p className="inline-flex items-center gap-2 sm:col-span-2"><Clock3 className="h-4 w-4" /> {new Date(item.created_at).toLocaleString('pt-BR')}</p>
                </div>
                {item.message && <p className="mt-4 rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-sm leading-6 text-slate-300">{item.message}</p>}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateStatus(item.id, option.value)}
                    className={clsx('rounded-xl px-3 py-2 text-xs font-medium transition-colors', item.status === option.value ? 'bg-brand-600 text-white' : 'border border-surface bg-surface-2 text-slate-300 hover:text-white')}
                  >
                    {option.label}
                  </button>
                ))}
                {item.status !== 'closed' && (
                  <button
                    onClick={() => updateStatus(item.id, 'closed')}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/15"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Encerrar
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
