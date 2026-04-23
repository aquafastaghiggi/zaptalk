import { useEffect, useRef, useState } from 'react'
import api from '../../services/api'
import { Plus, XCircle, Sparkles } from 'lucide-react'
import clsx from 'clsx'

const VARIABLE_TOKENS = [
  { label: 'Nome', token: '{{name}}', help: 'Nome do contato' },
  { label: 'Telefone', token: '{{phone}}', help: 'Telefone do contato' },
  { label: 'Atendente', token: '{{agent}}', help: 'Nome do agente logado' },
  { label: 'Setor', token: '{{sector}}', help: 'Nome do setor da conversa' },
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

export default function QuickRepliesTab({ sectors }) {
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
  const contentRef = useRef(null)

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

  const insertToken = (token) => {
    const textarea = contentRef.current
    if (!textarea) {
      setForm((current) => ({ ...current, content: `${current.content || ''}${token}` }))
      return
    }

    const start = textarea.selectionStart ?? form.content.length
    const end = textarea.selectionEnd ?? form.content.length
    const next = `${form.content.slice(0, start)}${token}${form.content.slice(end)}`
    setForm((current) => ({ ...current, content: next }))

    window.requestAnimationFrame(() => {
      textarea.focus()
      const caret = start + token.length
      textarea.setSelectionRange(caret, caret)
    })
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
                ref={contentRef}
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                rows={5}
                className="w-full bg-surface-2 border border-surface rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors resize-none"
                placeholder="Use variaveis como {{name}}, {{phone}}, {{agent}} e {{sector}}"
                required
              />
              <div className="mt-3 rounded-2xl border border-white/5 bg-surface-2/70 p-3">
                <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-subtle">
                  <Sparkles className="h-3 w-3" />
                  Variáveis visuais
                </div>
                <div className="flex flex-wrap gap-2">
                  {VARIABLE_TOKENS.map((variable) => (
                    <button
                      key={variable.token}
                      type="button"
                      onClick={() => insertToken(variable.token)}
                      className="inline-flex items-center gap-2 rounded-full border border-surface bg-surface-1 px-3 py-1.5 text-[11px] text-slate-300 transition-colors hover:border-brand-500/30 hover:text-white"
                      title={variable.help}
                    >
                      <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-brand-300">{variable.label}</span>
                      <code className="text-[10px] text-muted">{variable.token}</code>
                    </button>
                  ))}
                </div>
              </div>
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
