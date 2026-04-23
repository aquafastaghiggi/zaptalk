import { useEffect, useState } from 'react'
import { useChatStore } from '../../stores/chatStore'
import { useAuthStore } from '../../stores/authStore'
import { emitToast } from '../../utils/toast'
import api from '../../services/api'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MessageSquare, Clock, CheckCircle, Search, LogOut, Settings, Pin } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'

const TABS = [
  { key: 'waiting',     label: 'Fila',        icon: Clock },
  { key: 'in_progress', label: 'Ativos',      icon: MessageSquare },
  { key: 'finished',    label: 'Finalizados', icon: CheckCircle },
]

const PRIORITY_LABEL = {
  0: 'Normal',
  1: 'Baixa',
  2: 'Alta',
  3: 'Urgente',
}

function Avatar({ name, phone }) {
  const label = name?.[0] || phone?.[0] || '?'
  return (
    <div className="w-10 h-10 rounded-full bg-brand-700 flex items-center justify-center flex-shrink-0 text-white font-medium text-sm uppercase">
      {label}
    </div>
  )
}

function ConversationItem({ conv, active, onClick, onQuickAssume, onQuickPin }) {
  const hasUnread = conv.unread_count > 0
  const name = conv.contact?.name || conv.contact?.phone || '—'
  return (
    <button
      onClick={onClick}
      data-tour="sidebar-conversation-first"
      className={clsx(
        'group relative w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-2 transition-colors',
        active && 'bg-surface-2 border-r-2 border-brand-500'
      )}
    >
      <Avatar name={conv.contact?.name} phone={conv.contact?.phone} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={clsx('text-sm font-medium truncate', active ? 'text-white' : 'text-slate-200')}>
            {name}
          </span>
          {conv.last_message_at && (
            <span className="text-xs text-muted flex-shrink-0">
              {formatDistanceToNow(new Date(conv.last_message_at), { locale: ptBR, addSuffix: false })}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-xs text-muted truncate">{conv.contact?.phone}</span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {conv.is_pinned && (
              <span className="bg-brand-500/15 text-brand-300 text-[10px] font-medium px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
                <Pin className="w-3 h-3" />
                Fixada
              </span>
            )}
            {conv.priority > 0 && (
              <span className="bg-amber-500/15 text-amber-300 text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                {PRIORITY_LABEL[conv.priority] || 'Prioridade'}
              </span>
            )}
            {hasUnread && (
              <span className="bg-brand-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {conv.unread_count}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onQuickAssume?.(conv)
          }}
          title="Assumir esta conversa"
          className="pointer-events-auto rounded-lg border border-surface bg-surface-1 px-2 py-1 text-[10px] text-slate-300 transition-colors hover:border-brand-500/30 hover:text-white"
        >
          Assumir
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onQuickPin?.(conv)
          }}
          title={conv.is_pinned ? 'Desafixar esta conversa' : 'Fixar esta conversa'}
          className="pointer-events-auto rounded-lg border border-surface bg-surface-1 px-2 py-1 text-[10px] text-slate-300 transition-colors hover:border-brand-500/30 hover:text-white"
        >
          {conv.is_pinned ? 'Desafixar' : 'Fixar'}
        </button>
      </div>
    </button>
  )
}

export default function Sidebar() {
  const [tab, setTab] = useState('waiting')
  const [sectorId, setSectorId] = useState('')
  const [sectors, setSectors] = useState([])
  const [search, setSearch] = useState('')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [agentId, setAgentId] = useState('')
  const [tag, setTag] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [pinnedOnly, setPinnedOnly] = useState(false)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [agents, setAgents] = useState([])
  const [tags, setTags] = useState([])
  const { conversations, fetchConversations, activeId, setActive, assignAgent, pinConversation } = useChatStore()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const advancedFilterCount = [agentId, tag, dateFrom, dateTo, pinnedOnly, unreadOnly].filter(Boolean).length
  const hasActiveFilters = Boolean(
    search || sectorId || agentId || tag || dateFrom || dateTo || pinnedOnly || unreadOnly
  )

  useEffect(() => {
    api.get('/sectors').then(({ data }) => setSectors(Array.isArray(data) ? data : [])).catch(() => setSectors([]))
    api.get('/conversations/filters')
      .then(({ data }) => {
        setAgents(Array.isArray(data?.agents) ? data.agents : [])
        setTags(Array.isArray(data?.tags) ? data.tags : [])
      })
      .catch(() => {
        setAgents([])
        setTags([])
      })
  }, [])

  useEffect(() => {
    fetchConversations({
      status: tab,
      sector_id: sectorId || undefined,
      agent_id: agentId || undefined,
      search: search || undefined,
      tag: tag || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      pinned: pinnedOnly ? true : undefined,
      unread: unreadOnly ? true : undefined,
    })
  }, [tab, sectorId, agentId, search, tag, dateFrom, dateTo, pinnedOnly, unreadOnly])

  const filtered = conversations.filter((c) => {
    const q = search.toLowerCase()
    return (
      c.contact?.name?.toLowerCase().includes(q) ||
      c.contact?.phone?.includes(q)
    )
  })

  const isAdmin = user?.role === 'admin' || user?.role === 'manager'

  const handleQuickAssume = async (conv) => {
    if (!user?.id || !conv?.id) return
    try {
      await assignAgent(conv.id, user.id)
      setActive(conv.id)
      emitToast({
        title: 'Conversa assumida',
        message: `${conv.contact?.name || conv.contact?.phone || 'Atendimento'} agora está com você.`,
        variant: 'success',
      })
    } catch (err) {
      emitToast({
        title: 'Falha ao assumir',
        message: err.response?.data?.detail || 'Tente novamente.',
        variant: 'error',
      })
    }
  }

  const handleQuickPin = async (conv) => {
    if (!conv?.id) return
    try {
      await pinConversation(conv.id)
      emitToast({
        title: conv.is_pinned ? 'Conversa desafixada' : 'Conversa fixada',
        message: 'A ação foi aplicada com sucesso.',
        variant: 'success',
      })
    } catch (err) {
      emitToast({
        title: 'Falha ao fixar conversa',
        message: err.response?.data?.detail || 'Tente novamente.',
        variant: 'error',
      })
    }
  }

  return (
    <aside className="w-72 flex-shrink-0 bg-surface-1 border-r border-surface flex flex-col h-screen">
      <div className="px-4 pt-5 pb-3 border-b border-surface">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" strokeWidth={1.5} />
            </div>
            <span className="text-white font-semibold text-sm">ZapTalk</span>
          </div>
          <div className="flex items-center gap-1">
            {isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="text-muted hover:text-white transition-colors p-1"
                title="Administração"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={logout}
              className="text-muted hover:text-white transition-colors p-1"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-full bg-surface-3 flex items-center justify-center text-xs text-white font-medium uppercase">
            {user?.name?.[0] || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-white font-medium truncate">{user?.name}</p>
            <p className="text-[10px] text-muted capitalize">{user?.role}</p>
          </div>
          <span className="ml-auto w-2 h-2 rounded-full bg-brand-500 animate-pulse-dot flex-shrink-0" />
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar contato..."
            title="Buscar por nome ou telefone"
            data-tour="sidebar-search"
            className="w-full bg-surface-2 border border-surface rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        <div className="mt-3">
          <label className="block text-[10px] uppercase tracking-wide text-muted mb-1">Fila por setor</label>
          <select
            value={sectorId}
            onChange={(e) => setSectorId(e.target.value)}
            title="Filtrar conversas por setor"
            data-tour="sidebar-sector"
            className="w-full bg-surface-2 border border-surface rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 transition-colors"
          >
            <option value="">Todos os setores</option>
            {sectors.map((sector) => (
              <option key={sector.id} value={sector.id}>
                {sector.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setAdvancedOpen((current) => !current)}
            title="Mostrar ou ocultar filtros avançados"
            className="inline-flex items-center gap-2 rounded-lg border border-surface bg-surface-2 px-3 py-2 text-[11px] text-slate-300 transition-colors hover:border-brand-500/30 hover:text-white"
          >
            Filtros avancados
            <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] text-brand-300">{advancedFilterCount}</span>
          </button>
          {advancedFilterCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setAgentId('')
                setTag('')
                setDateFrom('')
                setDateTo('')
                setPinnedOnly(false)
                setUnreadOnly(false)
              }}
              title="Limpar filtros avançados"
              className="text-[11px] text-muted transition-colors hover:text-white"
            >
              Limpar
            </button>
          )}
        </div>

        {advancedOpen && (
          <div className="mt-3 space-y-3 rounded-2xl border border-surface bg-surface-2 p-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 rounded-lg border border-surface bg-surface-1 px-3 py-2 text-[10px] text-muted">
                <input type="checkbox" checked={pinnedOnly} onChange={(e) => setPinnedOnly(e.target.checked)} />
                Fixadas
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-surface bg-surface-1 px-3 py-2 text-[10px] text-muted">
                <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />
                Nao lidas
              </label>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                title="Filtrar por agente"
                className="w-full rounded-lg border border-surface bg-surface-1 px-3 py-2 text-xs text-white transition-colors focus:outline-none focus:border-brand-500"
              >
                <option value="">Todos os agentes</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
              <select
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                title="Filtrar por tag"
                className="w-full rounded-lg border border-surface bg-surface-1 px-3 py-2 text-xs text-white transition-colors focus:outline-none focus:border-brand-500"
              >
                <option value="">Todas as tags</option>
                {tags.map((currentTag) => (
                  <option key={currentTag} value={currentTag}>
                    {currentTag}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  title="Data inicial"
                  className="w-full rounded-lg border border-surface bg-surface-1 px-3 py-2 text-[11px] text-white transition-colors focus:outline-none focus:border-brand-500"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  title="Data final"
                  className="w-full rounded-lg border border-surface bg-surface-1 px-3 py-2 text-[11px] text-white transition-colors focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

        <div className="flex border-b border-surface">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              title={`Filtrar conversas em ${label.toLowerCase()}`}
              data-tour={`sidebar-tab-${key}`}
              className={clsx(
                'flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors',
                tab === key ? 'text-brand-400 border-b-2 border-brand-500' : 'text-muted hover:text-slate-300'
              )}
            >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto" data-tour="sidebar-list">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 px-4 text-muted text-xs gap-3 text-center">
            <MessageSquare className="w-6 h-6 opacity-30" />
            <div>
              <span className="block text-slate-200">
                {hasActiveFilters ? 'Nenhuma conversa encontrada com estes filtros' : 'Nenhuma conversa para exibir'}
              </span>
              <p className="mt-1 text-[11px] leading-5 text-muted">
                Use a busca principal, troque de aba ou abra os filtros avançados para refinar a fila.
              </p>
            </div>
          </div>
        ) : (
          filtered.map((conv) => (
            <ConversationItem
              key={conv.id}
              conv={conv}
              active={conv.id === activeId}
              onClick={() => setActive(conv.id)}
              onQuickAssume={handleQuickAssume}
              onQuickPin={handleQuickPin}
            />
          ))
        )}
      </div>
    </aside>
  )
}
