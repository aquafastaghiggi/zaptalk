import { useEffect, useState } from 'react'
import api from '../services/api'
import QRCode from 'qrcode'
import ThemeToggle from '../components/ui/ThemeToggle'
import {
  Users, Building2, Smartphone, Plus, RefreshCw, QrCode,
  CheckCircle, XCircle, Loader2, ChevronLeft, Eye, EyeOff, ClipboardList, Search, MessageSquarePlus, Trash2,
  BarChart3, Download, CalendarDays, TrendingUp, Sparkles
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import clsx from 'clsx'

const TABS = [
  { key: 'users', label: 'Atendentes', icon: Users },
  { key: 'sectors', label: 'Setores', icon: Building2 },
  { key: 'quick_replies', label: 'Respostas', icon: MessageSquarePlus },
  { key: 'reports', label: 'Relatorios', icon: BarChart3 },
  { key: 'instances', label: 'WhatsApp', icon: Smartphone },
  { key: 'audit', label: 'Auditoria', icon: ClipboardList },
  { key: 'ai', label: 'IA', icon: Sparkles, badge: 'Em breve' },
]

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

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-1 border border-surface rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface">
          <h2 className="text-white font-medium text-sm">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-white transition-colors">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
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

function UsersTab({ sectors }) {
  const [users, setUsers] = useState([])
  const [modal, setModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'agent',
    sector_id: '',
    is_active: true,
  })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    const { data } = await api.get('/users')
    setUsers(data)
  }

  useEffect(() => {
    load()
  }, [])

  const openCreate = () => {
    setEditingUser(null)
    setForm({ name: '', email: '', password: '', role: 'agent', sector_id: '', is_active: true })
    setShowPass(false)
    setError('')
    setModal(true)
  }

  const openEdit = (user) => {
    setEditingUser(user)
    setForm({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'agent',
      sector_id: user.sector_id || '',
      is_active: user.is_active,
    })
    setShowPass(false)
    setError('')
    setModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        email: form.email,
        role: form.role,
        sector_id: form.sector_id || null,
        is_active: form.is_active,
      }
      if (form.password.trim()) payload.password = form.password

      if (editingUser) {
        await api.patch(`/users/${editingUser.id}`, payload)
      } else {
        await api.post('/users', { ...payload, password: form.password })
      }

      setModal(false)
      setEditingUser(null)
      await load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao salvar usuario')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (user) => {
    await api.patch(`/users/${user.id}`, { is_active: !user.is_active })
    await load()
  }

  const handleResetPassword = async (user) => {
    const nextPassword = prompt(`Nova senha para ${user.name}`)
    if (!nextPassword) return
    try {
      await api.post(`/users/${user.id}/reset-password`, { password: nextPassword })
      alert('Senha atualizada')
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao redefinir senha')
    }
  }

  const handleDelete = async (user) => {
    if (!confirm(`Remover o usuario "${user.name}"? Isso vai desativar o acesso.`)) return
    setDeletingId(user.id)
    try {
      await api.delete(`/users/${user.id}`)
      await load()
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao remover usuario')
    } finally {
      setDeletingId('')
    }
  }

  const roleColor = { admin: 'blue', manager: 'yellow', agent: 'gray' }
  const roleLabel = { admin: 'Admin', manager: 'Gestor', agent: 'Atendente' }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted">{users.length} usuario(s)</p>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 text-xs bg-brand-600 hover:bg-brand-500 text-white px-3 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Novo usuario
        </button>
      </div>

      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="flex items-center gap-3 bg-surface-2 border border-surface rounded-xl px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-medium uppercase flex-shrink-0">
              {u.name?.[0] || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm text-white font-medium truncate">{u.name}</p>
                <Badge color={roleColor[u.role]}>{roleLabel[u.role]}</Badge>
                {!u.is_active && <Badge color="red">Inativo</Badge>}
                {u.is_online && <Badge color="green">Online</Badge>}
              </div>
              <p className="text-xs text-muted truncate">{u.email}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => openEdit(u)}
                className="text-xs px-3 py-1.5 rounded-lg border border-surface text-slate-300 hover:bg-surface-3 transition-colors"
              >
                Editar
              </button>
              <button
                onClick={() => handleResetPassword(u)}
                className="text-xs px-3 py-1.5 rounded-lg border border-surface text-slate-300 hover:bg-surface-3 transition-colors"
              >
                Reset senha
              </button>
              <button
                onClick={() => handleDelete(u)}
                disabled={deletingId === u.id || u.id === undefined}
                className="text-xs px-3 py-1.5 rounded-lg border border-surface text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                {deletingId === u.id ? 'Removendo...' : 'Remover'}
              </button>
              <button
                onClick={() => handleToggle(u)}
                className={clsx(
                  'text-xs px-3 py-1.5 rounded-lg border transition-colors',
                  u.is_active
                    ? 'border-surface text-red-400 hover:bg-red-500/10'
                    : 'border-surface text-green-400 hover:bg-green-500/10'
                )}
              >
                {u.is_active ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <Modal title={editingUser ? 'Editar usuario' : 'Novo usuario'} onClose={() => setModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="Nome completo"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
              placeholder="Joao Silva"
            />
            <Input
              label="E-mail"
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
              placeholder="joao@empresa.com"
            />
            <div>
              <label className="block text-xs text-subtle mb-1.5">Senha {editingUser ? '(opcional)' : ''}</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required={!editingUser}
                  placeholder="Minimo 6 caracteres"
                  className="w-full bg-surface-2 border border-surface rounded-xl px-3 py-2.5 pr-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
                />
                <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Select label="Perfil" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="agent">Atendente</option>
              <option value="manager">Gestor</option>
              <option value="admin">Administrador</option>
            </Select>
            <Select label="Setor" value={form.sector_id} onChange={e => setForm(f => ({ ...f, sector_id: e.target.value }))}>
              <option value="">Sem setor</option>
              {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <label className="flex items-center gap-2 text-xs text-subtle">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
              />
              Usuario ativo
            </label>

            {error && <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModal(false)}
                className="flex-1 text-sm text-muted border border-surface rounded-xl py-2.5 hover:bg-surface-2 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 text-sm bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl py-2.5 transition-colors flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {editingUser ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function SectorsTab({ sectors, reload }) {
  const [modal, setModal] = useState(false)
  const [editingSector, setEditingSector] = useState(null)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [keywords, setKeywords] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')

  const openCreate = () => {
    setEditingSector(null)
    setName('')
    setDesc('')
    setKeywords('')
    setModal(true)
  }

  const openEdit = (sector) => {
    setEditingSector(sector)
    setName(sector.name || '')
    setDesc(sector.description || '')
    setKeywords(sector.routing_keywords || '')
    setModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { name, description: desc || null, routing_keywords: keywords || null }
      if (editingSector) {
        await api.patch(`/sectors/${editingSector.id}`, payload)
      } else {
        await api.post('/sectors', payload)
      }
      setModal(false)
      await reload()
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (sector) => {
    await api.patch(`/sectors/${sector.id}`, { is_active: !sector.is_active })
    await reload()
  }

  const handleDelete = async (sector) => {
    if (!confirm(`Remover o setor "${sector.name}"? Isso vai desativar o setor.`)) return
    setDeletingId(sector.id)
    try {
      await api.delete(`/sectors/${sector.id}`)
      await reload()
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao remover setor')
    } finally {
      setDeletingId('')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted">{sectors.length} setor(es)</p>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 text-xs bg-brand-600 hover:bg-brand-500 text-white px-3 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Novo setor
        </button>
      </div>

      <div className="space-y-2">
        {sectors.map((s) => (
          <div key={s.id} className="flex items-center gap-3 bg-surface-2 border border-surface rounded-xl px-4 py-3">
            <div className="w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-muted" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm text-white font-medium">{s.name}</p>
                <Badge color={s.is_active ? 'green' : 'red'}>{s.is_active ? 'Ativo' : 'Inativo'}</Badge>
                {s.routing_keywords && <Badge color="blue">Triagem</Badge>}
              </div>
              {s.description && <p className="text-xs text-muted">{s.description}</p>}
              {s.routing_keywords && <p className="text-[11px] text-slate-400 mt-1">Palavras-chave: {s.routing_keywords}</p>}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => openEdit(s)}
                className="text-xs px-3 py-1.5 rounded-lg border border-surface text-slate-300 hover:bg-surface-3 transition-colors"
              >
                Editar
              </button>
              <button
                onClick={() => handleToggle(s)}
                className={clsx(
                  'text-xs px-3 py-1.5 rounded-lg border transition-colors',
                  s.is_active
                    ? 'border-surface text-red-400 hover:bg-red-500/10'
                    : 'border-surface text-green-400 hover:bg-green-500/10'
                )}
              >
                {s.is_active ? 'Desativar' : 'Ativar'}
              </button>
              <button
                onClick={() => handleDelete(s)}
                disabled={deletingId === s.id}
                className="text-xs px-3 py-1.5 rounded-lg border border-surface text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                {deletingId === s.id ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <Modal title={editingSector ? 'Editar setor' : 'Novo setor'} onClose={() => setModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <Input label="Nome do setor" value={name} onChange={e => setName(e.target.value)} required placeholder="ex: Suporte, Vendas..." />
            <Input label="Descricao (opcional)" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descricao curta" />
            <Input
              label="Palavras-chave de triagem"
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              placeholder="ex: boleto, financeiro, pagamento; entrega, prazo"
            />
            <p className="text-[11px] text-muted -mt-2">Separe por virgula ou ponto e virgula. A Evolution vai usar isso para direcionar a conversa ao setor certo.</p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModal(false)}
                className="flex-1 text-sm text-muted border border-surface rounded-xl py-2.5 hover:bg-surface-2 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 text-sm bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl py-2.5 transition-colors"
              >
                {saving ? 'Salvando...' : editingSector ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function formatAuditAction(action) {
  if (!action) return 'Ação'
  return action.replaceAll('.', ' / ').replaceAll('_', ' ')
}

function AuditTab() {
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

function QuickRepliesTab({ sectors }) {
  const [replies, setReplies] = useState([])
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [editingReply, setEditingReply] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    shortcut: '',
    content: '',
    sector_id: '',
    is_active: true,
  })

  const load = async (query = search) => {
    try {
      const { data } = await api.get('/quick-replies', {
        params: { search: query || undefined, include_inactive: true },
      })
      setReplies(Array.isArray(data) ? data : [])
    } catch {
      setReplies([])
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openCreate = () => {
    setEditingReply(null)
    setForm({
      title: '',
      shortcut: '',
      content: '',
      sector_id: '',
      is_active: true,
    })
    setModal(true)
  }

  const openEdit = (reply) => {
    setEditingReply(reply)
    setForm({
      title: reply.title || '',
      shortcut: reply.shortcut || '',
      content: reply.content || '',
      sector_id: reply.sector_id || '',
      is_active: reply.is_active,
    })
    setModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        title: form.title,
        shortcut: form.shortcut,
        content: form.content,
        sector_id: form.sector_id || null,
        is_active: form.is_active,
      }
      if (editingReply) {
        await api.patch(`/quick-replies/${editingReply.id}`, payload)
      } else {
        await api.post('/quick-replies', payload)
      }
      setModal(false)
      await load()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (reply) => {
    if (!confirm(`Remover a resposta rapida "${reply.title}"?`)) return
    await api.delete(`/quick-replies/${reply.id}`)
    await load()
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-xs text-muted">{replies.length} resposta(s) rapida(s)</p>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              load(e.target.value).catch(() => setReplies([]))
            }}
            placeholder="Buscar..."
            className="w-44 bg-surface-2 border border-surface rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
          />
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 text-xs bg-brand-600 hover:bg-brand-500 text-white px-3 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Nova resposta
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {replies.length === 0 && (
          <div className="text-center py-10 text-muted text-sm bg-surface-2 border border-surface rounded-2xl">
            Nenhuma resposta rapida cadastrada.
          </div>
        )}
        {replies.map((reply) => (
          <div key={reply.id} className="bg-surface-2 border border-surface rounded-xl px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm text-white font-medium truncate">{reply.title}</p>
                  {!reply.is_active && <Badge color="red">Inativa</Badge>}
                  {reply.sector_id && <Badge color="blue">{sectors.find((s) => s.id === reply.sector_id)?.name || 'Setor'}</Badge>}
                </div>
                <p className="text-xs text-muted mt-1">/{reply.shortcut}</p>
                <p className="text-xs text-slate-300 mt-2 whitespace-pre-wrap">{reply.content}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => openEdit(reply)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-surface text-slate-300 hover:bg-surface-3 transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(reply)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-surface text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Remover
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <Modal title={editingReply ? 'Editar resposta rapida' : 'Nova resposta rapida'} onClose={() => setModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="Titulo"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
              placeholder="ex: saudacao inicial"
            />
            <Input
              label="Atalho"
              value={form.shortcut}
              onChange={e => setForm(f => ({ ...f, shortcut: e.target.value.replace(/\s/g, '').toLowerCase() }))}
              required
              placeholder="ex: ola"
            />
            <Select label="Setor" value={form.sector_id} onChange={e => setForm(f => ({ ...f, sector_id: e.target.value }))}>
              <option value="">Global</option>
              {sectors.map((sector) => (
                <option key={sector.id} value={sector.id}>
                  {sector.name}
                </option>
              ))}
            </Select>
            <div>
              <label className="block text-xs text-subtle mb-1.5">Conteudo</label>
              <textarea
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                rows={5}
                className="w-full bg-surface-2 border border-surface rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors resize-none"
                placeholder="Use variaveis como {{name}}, {{phone}}, {{agent}} e {{sector}}"
                required
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-subtle">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
              />
              Resposta ativa
            </label>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModal(false)}
                className="flex-1 text-sm text-muted border border-surface rounded-xl py-2.5 hover:bg-surface-2 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 text-sm bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl py-2.5 transition-colors"
              >
                {saving ? 'Salvando...' : editingReply ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
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

function ReportsTab() {
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

function InstancesTab() {
  const [instances, setInstances] = useState([])
  const [modal, setModal] = useState(false)
  const [instName, setInstName] = useState('')
  const [creating, setCreating] = useState(false)
  const [qrModal, setQrModal] = useState(null)
  const [error, setError] = useState('')
  const [busyInstance, setBusyInstance] = useState('')

  const normalizeQrSource = (value) => {
    if (typeof value !== 'string') return null
    const trimmed = value.trim().replace(/\s+/g, '')
    if (!trimmed) return null

    if (trimmed.startsWith('data:image/')) {
      return trimmed
    }

    return `data:image/png;base64,${trimmed}`
  }

  const buildBlobQrSource = (value) => {
    if (typeof value !== 'string') return null
    const trimmed = value.trim().replace(/\s+/g, '')
    if (!trimmed) return null

    let base64Payload = trimmed
    let mimeType = 'image/png'

    if (trimmed.startsWith('data:')) {
      const commaIndex = trimmed.indexOf(',')
      if (commaIndex === -1) return null
      const header = trimmed.slice(0, commaIndex)
      base64Payload = trimmed.slice(commaIndex + 1)
      const mimeMatch = header.match(/^data:([^;]+);base64$/i)
      if (mimeMatch?.[1]) {
        mimeType = mimeMatch[1]
      }
    }

    try {
      const binary = atob(base64Payload)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: mimeType })
      return URL.createObjectURL(blob)
    } catch {
      return null
    }
  }

  const buildGeneratedQrSource = async (value) => {
    if (typeof value !== 'string' || !value.trim()) return null

    try {
      return await QRCode.toDataURL(value.trim(), {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 320,
        color: {
          dark: '#111827',
          light: '#ffffff',
        },
      })
    } catch {
      return null
    }
  }

  const load = async () => {
    try {
      const { data } = await api.get('/instances')
      setInstances(Array.isArray(data) ? data : [])
    } catch {
      setInstances([])
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    setCreating(true)
    try {
      const normalizedName = instName.trim().toLowerCase().replace(/\s+/g, '_')
      if (!/^[a-z][a-z0-9_]{2,29}$/.test(normalizedName)) {
        throw new Error('Use um nome com pelo menos 3 caracteres, começando com letra e usando apenas letras, números e underscore.')
      }

      const { data } = await api.post('/instances', { name: normalizedName })
      setModal(false)
      setInstName('')
      await load()

      const base64 = data?.base64 || data?.qrcode?.base64 || null
      const pairingCode = data?.pairing_code || data?.pairingCode || data?.qrcode?.pairingCode || null
      const code = data?.code || data?.qrcode?.code || null
      const imageSource = buildBlobQrSource(base64) || normalizeQrSource(base64)
      const generatedSource = code ? await buildGeneratedQrSource(code) : null
      const status = data?.status || (imageSource ? 'qr' : pairingCode || code ? 'pairing_code' : 'pending')
      setQrModal({
        name: normalizedName,
        base64,
        imageSource,
        generatedSource,
        pairingCode,
        code,
        status,
        raw: data,
      })
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Erro ao criar instancia')
    } finally {
      setCreating(false)
    }
  }

  const handleQr = async (name) => {
    setQrModal({ name, base64: null, status: 'loading' })
    try {
      const { data } = await api.get(`/instances/${name}/qrcode`)
      const base64 = data?.base64 || data?.qrcode?.base64 || null
      const pairingCode = data?.pairing_code || data?.pairingCode || data?.qrcode?.pairingCode || null
      const code = data?.code || data?.qrcode?.code || null
      const imageSource = buildBlobQrSource(base64) || normalizeQrSource(base64)
      const generatedSource = code ? await buildGeneratedQrSource(code) : null
      const status = data?.status || (imageSource ? 'qr' : pairingCode || code ? 'pairing_code' : 'pending')
      setQrModal({
        name,
        base64,
        imageSource,
        generatedSource,
        pairingCode,
        code,
        status,
        raw: data,
      })
    } catch {
      setQrModal({ name, base64: null, status: 'error' })
    }
  }

  const handleLogout = async (name) => {
    if (!confirm(`Desconectar a instancia "${name}"?`)) return
    setBusyInstance(name)
    try {
      await api.delete(`/instances/${name}/logout`)
      await load()
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao desconectar instancia')
    } finally {
      setBusyInstance('')
    }
  }

  const handleRestart = async (name) => {
    if (!confirm(`Reiniciar a instancia "${name}"?`)) return
    setBusyInstance(name)
    try {
      await api.put(`/instances/${name}/restart`)
      await load()
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao reiniciar instancia')
    } finally {
      setBusyInstance('')
    }
  }

  const handleDelete = async (name) => {
    if (!confirm(`Excluir a instancia "${name}"? Isso remove a sessão da Evolution.`)) return
    setBusyInstance(name)
    try {
      await api.delete(`/instances/${name}`)
      setInstances((current) => current.filter((inst) => {
        const instName = inst.instance?.instanceName || inst.name || inst.instanceName
        return instName !== name
      }))
      await load()
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao excluir instancia')
    } finally {
      setBusyInstance('')
    }
  }

  const statusColor = (s) => {
    if (s === 'open') return 'green'
    if (s === 'connecting') return 'yellow'
    return 'red'
  }

  const statusLabel = (s) => ({ open: 'Conectado', connecting: 'Conectando', close: 'Desconectado' }[s] || s || 'Desconhecido')

  useEffect(() => {
    return () => {
      if (qrModal?.imageSource && qrModal.imageSource.startsWith('blob:')) {
        URL.revokeObjectURL(qrModal.imageSource)
      }
    }
  }, [qrModal?.imageSource])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted">{instances.length} instancia(s)</p>
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-1.5 text-xs bg-brand-600 hover:bg-brand-500 text-white px-3 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Nova instancia
        </button>
      </div>

      <div className="space-y-2">
        {instances.length === 0 && (
          <div className="text-center py-10 text-muted text-sm">
            <Smartphone className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Nenhuma instancia criada
          </div>
        )}
        {instances.map((inst) => {
          const name = inst.instance?.instanceName || inst.name || inst.instanceName
          const state = inst.instance?.state || inst.state || inst.connectionStatus
          return (
            <div key={name} className="flex items-center gap-3 bg-surface-2 border border-surface rounded-xl px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-4 h-4 text-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm text-white font-medium">{name}</p>
                  <Badge color={statusColor(state)}>{statusLabel(state)}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleQr(name)}
                  className="flex items-center gap-1 text-xs border border-surface text-slate-300 hover:border-brand-500 hover:text-brand-400 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  QR Code
                </button>
                <button
                  onClick={() => handleRestart(name)}
                  disabled={busyInstance === name}
                  className="flex items-center gap-1 text-xs border border-surface text-slate-300 hover:border-brand-500 hover:text-brand-400 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reiniciar
                </button>
                <button
                  onClick={() => load()}
                  className="text-muted hover:text-white transition-colors p-1.5"
                  title="Atualizar status"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleLogout(name)}
                  disabled={busyInstance === name}
                  className="text-muted hover:text-red-400 transition-colors p-1.5 disabled:opacity-50"
                  title="Desconectar"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              <button
                onClick={() => handleDelete(name)}
                disabled={busyInstance === name}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 border border-surface hover:border-red-400/40 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                title="Excluir sessão"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir
              </button>
            </div>
          </div>
        )
      })}
      </div>

      {modal && (
        <Modal title="Nova instancia WhatsApp" onClose={() => setModal(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Nome da instancia"
              value={instName}
              onChange={e => setInstName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').replace(/\s/g, '_'))}
              required
              placeholder="ex: principal, suporte, vendas"
            />
            <p className="text-xs text-muted">Comece com letra. Use apenas letras minusculas, numeros e underscore. Minimo 3 caracteres.</p>
            {error && <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(false)} className="flex-1 text-sm text-muted border border-surface rounded-xl py-2.5 hover:bg-surface-2 transition-colors">Cancelar</button>
              <button type="submit" disabled={creating} className="flex-1 text-sm bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl py-2.5 transition-colors flex items-center justify-center gap-2">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Criar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {qrModal && (
        <Modal title={`QR Code - ${qrModal.name}`} onClose={() => setQrModal(null)}>
          <div className="flex flex-col items-center gap-4">
            {qrModal.status === 'loading' && (
              <div className="py-8 flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                <p className="text-sm text-muted">Gerando QR Code...</p>
              </div>
            )}
            {qrModal.status === 'connected' && (
              <div className="py-8 flex flex-col items-center gap-3">
                <CheckCircle className="w-10 h-10 text-green-400" />
                <p className="text-sm text-white font-medium">WhatsApp ja conectado!</p>
                <p className="text-xs text-muted text-center">Esta instancia ja esta autenticada. Nao e necessario escanear novamente.</p>
              </div>
            )}
            {qrModal.status === 'pending' && (
              <div className="py-8 flex flex-col items-center gap-3 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                <p className="text-sm text-white font-medium">Aguardando QR Code</p>
                <p className="text-xs text-muted max-w-xs">
                  A Evolution ainda está preparando a sessão. Isso pode levar alguns segundos em ambiente local.
                </p>
                <button
                  onClick={() => handleQr(qrModal.name)}
                  className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
                </button>
              </div>
            )}
            {qrModal.status === 'qr' && (qrModal.generatedSource || qrModal.imageSource) && (
              <>
                <div className="bg-white p-3 rounded-xl">
                  <img
                    src={qrModal.generatedSource || qrModal.imageSource}
                    alt="QR Code WhatsApp"
                    className="w-52 h-52"
                  />
                </div>
                <p className="text-xs text-muted text-center">
                  Abra o WhatsApp no celular - Dispositivos conectados - Conectar dispositivo
                </p>
                <button
                  onClick={() => handleQr(qrModal.name)}
                  className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Gerar novo QR Code
                </button>
              </>
            )}
            {qrModal.status === 'pairing_code' && (
              <div className="py-6 flex flex-col items-center gap-3 text-center">
                <CheckCircle className="w-10 h-10 text-yellow-400" />
                <p className="text-sm text-white font-medium">Apareceu um código de pareamento</p>
                <p className="text-xs text-muted max-w-xs">
                  Algumas versões da Evolution retornam código de pareamento em vez do QR direto.
                  Use esse código no fluxo de conexão do WhatsApp.
                </p>
                <div className="bg-surface-3 border border-surface rounded-xl px-4 py-3">
                  <p className="text-[11px] text-muted mb-1">Código</p>
                  <p className="text-base font-mono tracking-[0.25em] text-white">
                    {qrModal.pairingCode || qrModal.code || 'N/D'}
                  </p>
                </div>
                <button
                  onClick={() => handleQr(qrModal.name)}
                  className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Buscar QR novamente
                </button>
              </div>
            )}
            {qrModal.status === 'error' && (
              <div className="py-6 flex flex-col items-center gap-3">
                <XCircle className="w-8 h-8 text-red-400" />
                <p className="text-sm text-muted text-center">Nao foi possivel gerar o QR Code.<br />Verifique se a Evolution API esta rodando.</p>
                <button onClick={() => handleQr(qrModal.name)} className="text-xs text-brand-400 hover:text-brand-300">Tentar novamente</button>
              </div>
            )}
            {qrModal.status === 'qr' && !qrModal.generatedSource && !qrModal.imageSource && (
              <div className="py-8 flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                <p className="text-sm text-muted">Gerando QR Code...</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

function AITab({ aiStatus }) {
  const features = [
    {
      title: 'Resumo de conversa',
      description: 'Resumo curto com pontos-chave, contexto e proxima acao.',
    },
    {
      title: 'Sugestao de resposta',
      description: 'Resposta assistida para o atendente revisar antes de enviar.',
    },
    {
      title: 'Classificacao e triagem',
      description: 'Assunto, urgencia, tags e setor sugerido com saida estruturada.',
    },
    {
      title: 'Transferencia e sentimento',
      description: 'Resumo para repasse e leitura de risco/insatisfacao na conversa.',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="bg-surface-2 border border-surface rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-brand-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-white font-medium text-base">IA</h3>
              <Badge color={aiStatus?.enabled ? 'green' : 'yellow'}>
                {aiStatus?.enabled ? 'Ativa' : 'Em breve'}
              </Badge>
            </div>
            <p className="text-sm text-muted mt-2 max-w-2xl">
              O fluxo de IA ja esta preparado no backend com a Responses API da OpenAI,
              mas permanece desativado por padrao. Para liberar, defina `AI_ENABLED=true`
              e configure `OPENAI_API_KEY` no ambiente.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
          {features.map((feature) => (
            <div key={feature.title} className="bg-surface-3/60 border border-surface rounded-xl p-4">
              <p className="text-sm text-white font-medium">{feature.title}</p>
              <p className="text-xs text-muted mt-1">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-surface-3/60 border border-surface rounded-xl p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted">Status</p>
            <p className="text-sm text-white mt-1">
              {aiStatus?.enabled ? 'Disponivel' : 'Bloqueado em producao'}
            </p>
          </div>
          <div className="bg-surface-3/60 border border-surface rounded-xl p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted">Provedor</p>
            <p className="text-sm text-white mt-1">{aiStatus?.provider || 'openai'}</p>
          </div>
          <div className="bg-surface-3/60 border border-surface rounded-xl p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted">Modelo base</p>
            <p className="text-sm text-white mt-1">{aiStatus?.models?.summary || 'gpt-5.4-mini'}</p>
          </div>
        </div>
      </div>

      {!aiStatus?.enabled && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
          <p className="text-sm text-yellow-300 font-medium">Em breve</p>
          <p className="text-xs text-yellow-100/80 mt-1">
            O menu ja esta pronto, mas a IA fica desligada ate voce habilitar as variaveis de ambiente.
            Nada sera chamado por engano no ambiente atual.
          </p>
        </div>
      )}
    </div>
  )
}

export default function AdminPage() {
  const [tab, setTab] = useState('users')
  const [sectors, setSectors] = useState([])
  const [aiStatus, setAiStatus] = useState({ enabled: false, configured: false, reason: 'disabled', models: {} })
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const loadSectors = async () => {
    const { data } = await api.get('/sectors', { params: { include_inactive: true } })
    setSectors(data)
  }

  const loadAiStatus = async () => {
    try {
      const { data } = await api.get('/ai/status')
      setAiStatus(data || { enabled: false, configured: false, reason: 'unknown', models: {} })
    } catch (err) {
      setAiStatus({
        enabled: false,
        configured: false,
        reason: err.response?.status === 503 ? 'disabled' : 'unavailable',
        models: {},
      })
    }
  }

  useEffect(() => {
    loadSectors()
    loadAiStatus()
  }, [])

  if (user && user.role === 'agent') {
    navigate('/')
    return null
  }

  return (
    <div className="min-h-screen bg-surface-0">
      <div className="bg-surface-1 border-b border-surface px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="text-muted hover:text-white transition-colors flex items-center gap-1.5 text-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar ao painel
        </button>
        <div className="w-px h-4 bg-surface" />
        <h1 className="text-white font-medium text-sm">Administracao</h1>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex gap-1 bg-surface-2 p-1 rounded-xl mb-6">
          {TABS.map(({ key, label, icon: Icon, badge }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-colors',
                tab === key ? 'bg-surface-3 text-white' : 'text-muted hover:text-slate-300',
                key === 'ai' && !aiStatus.enabled && 'opacity-80'
              )}
              title={key === 'ai' && !aiStatus.enabled ? 'Em breve' : label}
            >
              <Icon className="w-4 h-4" />
              {label}
              {badge && (
                <span
                  className={clsx(
                    'text-[10px] font-medium px-2 py-0.5 rounded-full',
                    key === 'ai' && aiStatus.enabled
                      ? 'bg-green-500/15 text-green-300'
                      : 'bg-yellow-500/15 text-yellow-300'
                  )}
                >
                  {key === 'ai' ? (aiStatus.enabled ? 'Ativa' : 'Em breve') : badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'users' && <UsersTab sectors={sectors} />}
        {tab === 'sectors' && <SectorsTab sectors={sectors} reload={loadSectors} />}
        {tab === 'quick_replies' && <QuickRepliesTab sectors={sectors} />}
        {tab === 'reports' && <ReportsTab />}
        {tab === 'instances' && <InstancesTab />}
        {tab === 'audit' && <AuditTab />}
        {tab === 'ai' && <AITab aiStatus={aiStatus} />}
      </div>
    </div>
  )
}
