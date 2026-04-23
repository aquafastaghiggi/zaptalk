import { useEffect, useState } from 'react'
import api from '../../services/api'
import { Plus, Eye, EyeOff, Trash2, Loader2, XCircle } from 'lucide-react'
import clsx from 'clsx'
import { emitToast } from '../../utils/toast'

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

export default function UsersTab({ sectors }) {
  const [users, setUsers] = useState([])
  const [modal, setModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [showPass, setShowPass] = useState(false)
  const [tempPasswordInfo, setTempPasswordInfo] = useState(null)
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
        const { data } = await api.post('/users', { ...payload, password: form.password || undefined })
        if (data?.temp_password) {
          setTempPasswordInfo({
            name: data.user?.name || form.name,
            email: data.user?.email || form.email,
            password: data.temp_password,
          })
        }
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
      emitToast({
        title: 'Senha atualizada',
        message: `A senha de ${user.name} foi redefinida.`,
        variant: 'success',
      })
    } catch (err) {
      emitToast({
        title: 'Falha ao redefinir senha',
        message: err.response?.data?.detail || 'Erro ao redefinir senha',
        variant: 'error',
      })
    }
  }

  const handleDelete = async (user) => {
    if (!confirm(`Remover o usuario "${user.name}"? Isso vai desativar o acesso.`)) return
    setDeletingId(user.id)
    try {
      await api.delete(`/users/${user.id}`)
      await load()
    } catch (err) {
      emitToast({
        title: 'Falha ao remover usuário',
        message: err.response?.data?.detail || 'Erro ao remover usuario',
        variant: 'error',
      })
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
                  required={false}
                  placeholder={editingUser ? 'Opcional' : 'Deixe vazio para gerar automaticamente'}
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

      {tempPasswordInfo && (
        <Modal title="Senha temporária gerada" onClose={() => setTempPasswordInfo(null)}>
          <div className="space-y-4">
            <div className="rounded-xl border border-brand-500/20 bg-brand-500/10 px-4 py-3 text-sm text-slate-200">
              A senha temporária de <span className="font-medium text-white">{tempPasswordInfo.name}</span> foi gerada agora e só pode ser vista uma vez.
            </div>
            <div className="rounded-xl border border-surface bg-surface-2 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-subtle">Senha temporária</p>
              <p className="mt-2 break-all text-sm font-medium text-white">{tempPasswordInfo.password}</p>
            </div>
            <p className="text-xs text-muted">{tempPasswordInfo.email}</p>
            <button
              type="button"
              onClick={() => setTempPasswordInfo(null)}
              className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-500"
            >
              Entendi
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
