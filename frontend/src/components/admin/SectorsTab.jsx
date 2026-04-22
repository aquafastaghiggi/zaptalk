import { useState } from 'react'
import api from '../../services/api'
import { Plus, Building2, XCircle } from 'lucide-react'
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

export default function SectorsTab({ sectors, reload }) {
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
