import { useEffect, useMemo, useRef, useState } from 'react'
import { format } from 'date-fns'
import { useChatStore } from '../../stores/chatStore'
import { useAuthStore } from '../../stores/authStore'
import api from '../../services/api'
import clsx from 'clsx'
import TransferModal from './TransferModal'
import {
  Send,
  CheckCheck,
  UserCheck,
  XCircle,
  ArrowRightLeft,
  Phone,
  Loader2,
  RotateCcw,
  Plus,
  Tag,
  History,
  Trash2,
  Paperclip,
  Smile,
  Star,
  Pin,
  Mail,
  FileText,
  Image as ImageIcon,
} from 'lucide-react'

const QUICK_EMOJIS = ['😀', '👍', '🙏', '✅', '🔥', '💬', '📎', '⭐']

const REPLY_VARIABLES = {
  name: (conv) => conv?.contact?.name || conv?.contact?.phone || '',
  phone: (conv) => conv?.contact?.phone || '',
  agent: (_conv, user) => user?.name || '',
  sector: (conv) => conv?.sector?.name || conv?.sector_name || '',
}

function applyReplyVariables(text, conv, user) {
  return (text || '').replace(/\{\{\s*(name|phone|agent|sector)\s*\}\}/gi, (_, key) => {
    const getter = REPLY_VARIABLES[key.toLowerCase()]
    return getter ? getter(conv, user) : ''
  })
}

function formatMediaLabel(msg) {
  const type = (msg.message_type || '').toLowerCase()
  if (type === 'image') return 'Imagem'
  if (type === 'document') return 'Documento'
  if (type === 'audio') return 'Audio'
  if (type === 'video') return 'Video'
  return 'Arquivo'
}

function MediaPreview({ msg }) {
  if (!msg.media_url) return null
  const type = (msg.message_type || '').toLowerCase()
  const src = msg.media_url

  if (type === 'image') {
    return (
      <a href={src} target="_blank" rel="noreferrer" className="block mb-2 overflow-hidden rounded-xl border border-white/10">
        <img src={src} alt={msg.content || 'anexo'} className="max-h-56 w-full object-cover bg-black/20" />
      </a>
    )
  }

  if (type === 'document') {
    return (
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        className="mb-2 flex items-center gap-3 rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-xs text-white"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/15 text-brand-300">
          <FileText className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium">{formatMediaLabel(msg)}</p>
          <p className="truncate text-[11px] text-white/60">{msg.content || src}</p>
        </div>
      </a>
    )
  }

  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      className="mb-2 flex items-center gap-3 rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-xs text-white"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/15 text-brand-300">
        <ImageIcon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium">{formatMediaLabel(msg)}</p>
        <p className="truncate text-[11px] text-white/60">{msg.content || src}</p>
      </div>
    </a>
  )
}

function MessageBubble({ msg }) {
  const isOut = msg.direction === 'outbound'
  const time = msg.created_at ? format(new Date(msg.created_at), 'HH:mm') : ''

  return (
    <div className={clsx('flex mb-2', isOut ? 'justify-end' : 'justify-start')}>
      <div
        className={clsx(
          'max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isOut ? 'bg-brand-600 text-white rounded-br-sm' : 'bg-surface-3 text-slate-200 rounded-bl-sm'
        )}
      >
        <MediaPreview msg={msg} />
        {msg.content || !msg.media_url ? (
          msg.content || (
            <span className="italic text-xs opacity-60">[{msg.message_type}]</span>
          )
        ) : null}
        <div className={clsx('flex items-center gap-1 mt-1', isOut ? 'justify-end' : 'justify-start')}>
          <span className="text-[10px] opacity-50">{time}</span>
          {isOut && <CheckCheck className="w-3 h-3 opacity-50" />}
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted">
      <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center">
        <Phone className="w-7 h-7 opacity-30" />
      </div>
      <p className="text-sm">Selecione uma conversa para comecar</p>
    </div>
  )
}

function ComposerModeButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors',
        active
          ? 'border-brand-500 bg-brand-500/15 text-brand-300'
          : 'border-surface text-slate-300 hover:bg-surface-2'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}

export default function ChatArea() {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [meta, setMeta] = useState({ notes: [], tags: [], transfers: [] })
  const [crm, setCrm] = useState(null)
  const [crmLoading, setCrmLoading] = useState(false)
  const [crmSaving, setCrmSaving] = useState(false)
  const [crmError, setCrmError] = useState('')
  const [crmUsers, setCrmUsers] = useState([])
  const [noteText, setNoteText] = useState('')
  const [tagText, setTagText] = useState('')
  const [metaLoading, setMetaLoading] = useState(false)
  const [composerMode, setComposerMode] = useState('public')
  const [quickReplies, setQuickReplies] = useState([])
  const [quickSearch, setQuickSearch] = useState('')
  const [quickReplyOpen, setQuickReplyOpen] = useState(false)
  const [attachment, setAttachment] = useState(null)
  const [attachmentPreview, setAttachmentPreview] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const bottomRef = useRef(null)
  const fileRef = useRef(null)

  const {
    activeId,
    conversations,
    messages,
    fetchMessages,
    sendMessage,
    sendAttachment,
    finishConversation,
    assignAgent,
    requeueConversation,
    reopenConversation,
    markConversationUnread,
    pinConversation,
    setConversationPriority,
  } = useChatStore()
  const { user } = useAuthStore()

  const conv = conversations.find((c) => c.id === activeId)
  const msgs = messages[activeId] || []
  const isFinished = conv?.status === 'finished'
  const contactName = conv?.contact?.name || conv?.contact?.phone || '—'
  const filteredQuickReplies = useMemo(() => {
    const query = quickSearch.trim().toLowerCase()
    return quickReplies.filter((reply) => {
      if (!query) return true
      return (
        reply.title?.toLowerCase().includes(query) ||
        reply.shortcut?.toLowerCase().includes(query) ||
        reply.content?.toLowerCase().includes(query)
      )
    })
  }, [quickReplies, quickSearch])

  const reloadMeta = async () => {
    if (!activeId) return
    const { data } = await api.get(`/conversations/${activeId}/meta`)
    setMeta(data || { notes: [], tags: [], transfers: [] })
  }

  const loadCrm = async () => {
    if (!conv?.contact?.id) return
    setCrmLoading(true)
    setCrmError('')
    try {
      const { data } = await api.get(`/contacts/${conv.contact.id}/crm/details`)
      setCrm(data || null)
    } catch (err) {
      setCrmError(err.response?.data?.detail || 'Nao foi possivel carregar o CRM.')
      setCrm(null)
    } finally {
      setCrmLoading(false)
    }
  }

  const loadQuickReplies = async () => {
    try {
      const { data } = await api.get('/quick-replies', {
        params: {
          sector_id: conv?.sector_id || undefined,
        },
      })
      setQuickReplies(Array.isArray(data) ? data : [])
    } catch {
      setQuickReplies([])
    }
  }

  useEffect(() => {
    if (activeId) fetchMessages(activeId)
  }, [activeId])

  useEffect(() => {
    if (!activeId) return
    setMetaLoading(true)
    reloadMeta()
      .catch(() => setMeta({ notes: [], tags: [], transfers: [] }))
      .finally(() => setMetaLoading(false))
  }, [activeId])

  useEffect(() => {
    if (!activeId) return
    loadCrm()
  }, [activeId, conv?.contact?.id])

  useEffect(() => {
    if (!activeId) return
    loadQuickReplies()
  }, [activeId, conv?.sector_id])

  useEffect(() => {
    if (!user || user.role === 'agent') return
    api.get('/users')
      .then(({ data }) => setCrmUsers(Array.isArray(data) ? data.filter((item) => item.is_active) : []))
      .catch(() => setCrmUsers([]))
  }, [user])

  useEffect(() => {
    const handleMetaChange = (event) => {
      if (event.detail?.conversationId === activeId) {
        reloadMeta().catch(() => {})
      }
    }

    window.addEventListener('zaptalk:conversation-meta-changed', handleMetaChange)
    return () => window.removeEventListener('zaptalk:conversation-meta-changed', handleMetaChange)
  }, [activeId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs.length])

  useEffect(() => {
    return () => {
      if (attachmentPreview) URL.revokeObjectURL(attachmentPreview)
    }
  }, [attachmentPreview])

  const clearAttachment = () => {
    if (attachmentPreview) URL.revokeObjectURL(attachmentPreview)
    setAttachment(null)
    setAttachmentPreview('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!activeId) return

    if (composerMode === 'internal') {
      if (!noteText.trim() && !text.trim()) return
      setSending(true)
      try {
        await api.post(`/conversations/${activeId}/notes`, { content: (noteText || text).trim() })
        setNoteText('')
        setText('')
        await reloadMeta()
      } finally {
        setSending(false)
      }
      return
    }

    if (!text.trim() && !attachment) return
    setSending(true)
    try {
      if (attachment) {
        await sendAttachment(activeId, attachment, text.trim())
        clearAttachment()
      } else {
        await sendMessage(activeId, text.trim())
      }
      setText('')
    } catch (err) {
      console.error('Erro ao enviar:', err)
    } finally {
      setSending(false)
    }
  }

  const handleAssignMe = async () => {
    if (!activeId || !user) return
    try {
      await assignAgent(activeId, user.id)
    } catch (err) {
      console.error(err)
    }
  }

  const handleFinish = async () => {
    if (!activeId) return
    if (!confirm('Finalizar este atendimento?')) return
    try {
      await finishConversation(activeId)
    } catch (err) {
      console.error(err)
    }
  }

  const handleRequeue = async () => {
    if (!activeId) return
    if (!confirm('Devolver esta conversa para a fila?')) return
    try {
      await requeueConversation(activeId)
    } catch (err) {
      console.error(err)
    }
  }

  const handleReopen = async () => {
    if (!activeId) return
    if (!confirm('Reabrir este atendimento?')) return
    try {
      await reopenConversation(activeId)
    } catch (err) {
      console.error(err)
    }
  }

  const handlePriorityChange = async (e) => {
    if (!activeId) return
    const priority = Number(e.target.value)
    try {
      await setConversationPriority(activeId, priority)
    } catch (err) {
      console.error(err)
    }
  }

  const handlePin = async () => {
    if (!activeId) return
    try {
      await pinConversation(activeId)
    } catch (err) {
      console.error(err)
    }
  }

  const handleUnread = async () => {
    if (!activeId) return
    try {
      await markConversationUnread(activeId)
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddNote = async (e) => {
    e.preventDefault()
    if (!activeId || !noteText.trim()) return
    await api.post(`/conversations/${activeId}/notes`, { content: noteText.trim() })
    setNoteText('')
    await reloadMeta()
  }

  const handleAddTag = async (e) => {
    e.preventDefault()
    if (!activeId || !tagText.trim()) return
    await api.post(`/conversations/${activeId}/tags`, { label: tagText.trim() })
    setTagText('')
    await reloadMeta()
  }

  const handleRemoveNote = async (noteId) => {
    if (!activeId) return
    await api.delete(`/conversations/${activeId}/notes/${noteId}`)
    await reloadMeta()
  }

  const handleRemoveTag = async (tagId) => {
    if (!activeId) return
    await api.delete(`/conversations/${activeId}/tags/${tagId}`)
    await reloadMeta()
  }

  const handleSaveCrm = async (e) => {
    e.preventDefault()
    if (!crm?.contact?.id) return
    setCrmSaving(true)
    setCrmError('')
    try {
      const payload = {
        name: crm.contact.name || '',
        company: crm.contact.company || null,
        origin: crm.contact.origin || null,
        stage: crm.contact.stage || null,
        notes: crm.contact.notes || null,
        responsible_user_id: crm.contact.responsible_user_id || null,
      }
      const { data } = await api.patch(`/contacts/${crm.contact.id}/crm`, payload)
      setCrm(data)
      if (conv?.contact?.id === crm.contact.id) {
        useChatStore.getState().updateConversation(activeId, {
          contact: {
            ...conv.contact,
            name: data.contact?.name || crm.contact.name,
            company: data.contact?.company || crm.contact.company,
            origin: data.contact?.origin || crm.contact.origin,
            stage: data.contact?.stage || crm.contact.stage,
            notes: data.contact?.notes || crm.contact.notes,
            responsible_user_id: data.contact?.responsible_user_id || crm.contact.responsible_user_id,
          },
        })
      }
    } catch (err) {
      setCrmError(err.response?.data?.detail || 'Erro ao salvar CRM')
    } finally {
      setCrmSaving(false)
    }
  }

  const handleTriaging = async () => {
    if (!activeId) return
    try {
      await api.post(`/conversations/${activeId}/triage`)
      await loadCrm()
    } catch (err) {
      setCrmError(err.response?.data?.detail || 'Nao foi possivel executar a triagem.')
    }
  }

  const handleQuickReplyPick = (reply) => {
    const resolved = applyReplyVariables(reply.content, conv, user)
    setText((current) => {
      const base = current.trim()
      return base ? `${base}\n${resolved}` : resolved
    })
    setQuickReplyOpen(false)
    setQuickSearch('')
  }

  const handleEmojiInsert = (emoji) => {
    setText((current) => `${current}${emoji}`)
    setEmojiOpen(false)
  }

  const handleSwitchComposerMode = (mode) => {
    if (mode === 'internal') {
      if (attachment) clearAttachment()
      setQuickReplyOpen(false)
      setEmojiOpen(false)
      setNoteText((current) => current || text)
      setText('')
      setComposerMode('internal')
      return
    }

    setQuickReplyOpen(false)
    setEmojiOpen(false)
    setText((current) => current || noteText)
    setNoteText('')
    setComposerMode('public')
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (attachmentPreview) URL.revokeObjectURL(attachmentPreview)
    setAttachment(file)
    setAttachmentPreview(URL.createObjectURL(file))
  }

  if (!activeId) return <EmptyState />

  return (
    <div className="flex-1 flex flex-col min-w-0 h-screen">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-surface bg-surface-1 flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-brand-700 flex items-center justify-center text-white font-medium text-sm uppercase flex-shrink-0">
          {contactName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm truncate">{contactName}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-muted text-xs">{conv?.contact?.phone}</p>
            {conv?.status && (
              <span
                className={clsx(
                  'text-[10px] font-medium px-2 py-0.5 rounded-full',
                  conv.status === 'waiting' && 'bg-yellow-500/15 text-yellow-400',
                  conv.status === 'in_progress' && 'bg-brand-500/15 text-brand-400',
                  conv.status === 'finished' && 'bg-slate-500/15 text-slate-400'
                )}
              >
                {{ waiting: 'Aguardando', in_progress: 'Em atendimento', finished: 'Finalizado' }[conv.status]}
              </span>
            )}
            {conv?.agent?.name && <span className="text-[10px] text-muted">• {conv.agent.name}</span>}
            {typeof conv?.priority === 'number' && conv.priority > 0 && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300">
                Prioridade {conv.priority}
              </span>
            )}
            {conv?.is_pinned && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-300">
                Fixada
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={handlePin}
            className={clsx(
              'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors border',
              conv?.is_pinned
                ? 'bg-brand-500/15 text-brand-300 border-brand-500/30'
                : 'border-surface text-slate-300 hover:border-brand-500 hover:text-brand-400'
            )}
          >
            <Pin className="w-3.5 h-3.5" />
            {conv?.is_pinned ? 'Desafixar' : 'Fixar'}
          </button>
          <button
            onClick={handleUnread}
            className="flex items-center gap-1.5 text-xs border border-surface text-slate-300 hover:border-brand-500 hover:text-brand-400 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Mail className="w-3.5 h-3.5" />
            Nao lida
          </button>
          {!isFinished ? (
            <>
              {conv?.status === 'waiting' && (
                <button
                  onClick={handleAssignMe}
                  className="flex items-center gap-1.5 text-xs bg-brand-600 hover:bg-brand-500 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  <UserCheck className="w-3.5 h-3.5" /> Assumir
                </button>
              )}
              <button
                onClick={() => setShowTransfer(true)}
                className="flex items-center gap-1.5 text-xs border border-surface text-slate-300 hover:border-brand-500 hover:text-brand-400 px-3 py-1.5 rounded-lg transition-colors"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" /> Transferir
              </button>
              {conv?.status !== 'waiting' && (
                <button
                  onClick={handleRequeue}
                  className="flex items-center gap-1.5 text-xs border border-surface text-slate-300 hover:border-brand-500 hover:text-brand-400 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Voltar para fila
                </button>
              )}
              <button
                onClick={handleFinish}
                className="flex items-center gap-1.5 text-xs bg-surface-3 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg transition-colors border border-surface"
              >
                <XCircle className="w-3.5 h-3.5" /> Finalizar
              </button>
            </>
          ) : (
            <button
              onClick={handleReopen}
              className="flex items-center gap-1.5 text-xs bg-brand-600 hover:bg-brand-500 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reabrir
            </button>
          )}
          <select
            value={conv?.priority ?? 0}
            onChange={handlePriorityChange}
            className="bg-surface-2 border border-surface rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500 transition-colors"
            title="Prioridade da conversa"
          >
            <option value={0}>Normal</option>
            <option value={1}>Baixa</option>
            <option value={2}>Alta</option>
            <option value={3}>Urgente</option>
          </select>
        </div>
      </div>

      <div className="border-b border-surface bg-surface-1 px-6 py-4">
        <div className="grid gap-4 xl:grid-cols-4">
          <div className="xl:col-span-1 space-y-3">
            <div className="flex items-center justify-between gap-2 text-xs text-muted">
              <span>CRM do contato</span>
              <button
                type="button"
                onClick={handleTriaging}
                className="text-brand-400 hover:text-brand-300 transition-colors"
              >
                Reexecutar triagem
              </button>
            </div>

            <form onSubmit={handleSaveCrm} className="space-y-3 rounded-2xl border border-surface bg-surface-2 p-3">
              <input
                value={crm?.contact?.name || ''}
                onChange={(e) => setCrm((current) => ({ ...(current || {}), contact: { ...(current?.contact || {}), name: e.target.value } }))}
                placeholder="Nome do contato"
                className="w-full rounded-lg border border-surface bg-surface-1 px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-500"
              />
              <input
                value={crm?.contact?.company || ''}
                onChange={(e) => setCrm((current) => ({ ...(current || {}), contact: { ...(current?.contact || {}), company: e.target.value } }))}
                placeholder="Empresa"
                className="w-full rounded-lg border border-surface bg-surface-1 px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-500"
              />
              <input
                value={crm?.contact?.origin || ''}
                onChange={(e) => setCrm((current) => ({ ...(current || {}), contact: { ...(current?.contact || {}), origin: e.target.value } }))}
                placeholder="Origem"
                className="w-full rounded-lg border border-surface bg-surface-1 px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-500"
              />
              <input
                value={crm?.contact?.stage || ''}
                onChange={(e) => setCrm((current) => ({ ...(current || {}), contact: { ...(current?.contact || {}), stage: e.target.value } }))}
                placeholder="Estagio"
                className="w-full rounded-lg border border-surface bg-surface-1 px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-500"
              />
              {user?.role !== 'agent' && crmUsers.length > 0 && (
                <select
                  value={crm?.contact?.responsible_user_id || ''}
                  onChange={(e) => setCrm((current) => ({ ...(current || {}), contact: { ...(current?.contact || {}), responsible_user_id: e.target.value } }))}
                  className="w-full rounded-lg border border-surface bg-surface-1 px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="">Responsavel atual</option>
                  {crmUsers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              )}
              <textarea
                value={crm?.contact?.notes || ''}
                onChange={(e) => setCrm((current) => ({ ...(current || {}), contact: { ...(current?.contact || {}), notes: e.target.value } }))}
                rows={3}
                placeholder="Notas do contato"
                className="w-full rounded-lg border border-surface bg-surface-1 px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 resize-none"
              />
              {crmError && <p className="text-[11px] text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{crmError}</p>}
              <button
                type="submit"
                disabled={crmSaving || crmLoading}
                className="w-full rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-500 disabled:opacity-50"
              >
                {crmSaving ? 'Salvando...' : 'Salvar CRM'}
              </button>
            </form>

            <div className="rounded-2xl border border-surface bg-surface-2 p-3">
              <div className="flex items-center gap-2 mb-2 text-xs text-muted">
                <History className="w-3.5 h-3.5" />
                Historico consolidado
              </div>
              {crmLoading ? (
                <div className="text-xs text-muted">Carregando CRM...</div>
              ) : (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Conversas</span>
                    <span className="text-white">{crm?.summary?.total_conversations ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Abertas</span>
                    <span className="text-white">{crm?.summary?.open_conversations ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Finalizadas</span>
                    <span className="text-white">{crm?.summary?.finished_conversations ?? 0}</span>
                  </div>
                  <div className="text-[11px] text-muted pt-1">
                    Ultimo toque: {crm?.summary?.last_touched_at ? format(new Date(crm.summary.last_touched_at), 'dd/MM HH:mm') : 'sem registro'}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-surface bg-surface-2 p-3">
              <div className="flex items-center gap-2 mb-2 text-xs text-muted">
                <History className="w-3.5 h-3.5" />
                Ultimas conversas
              </div>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {(crm?.history || []).map((item) => (
                  <div key={item.id} className="rounded-xl border border-surface bg-surface-1 px-3 py-2">
                    <p className="text-white text-[11px] font-medium truncate">{item.sector_name || 'Sem setor'}</p>
                    <p className="text-[10px] text-muted">{item.status} · {item.agent_name || 'Sem atendente'}</p>
                    <p className="text-[10px] text-muted">{item.started_at ? format(new Date(item.started_at), 'dd/MM HH:mm') : ''}</p>
                  </div>
                ))}
                {(crm?.history || []).length === 0 && !crmLoading && (
                  <p className="text-xs text-muted">Nenhuma conversa anterior encontrada.</p>
                )}
              </div>
            </div>
          </div>

          <div className="xl:col-span-1">
            <div className="flex items-center gap-2 mb-3 text-xs text-muted">
              <Tag className="w-3.5 h-3.5" />
              Tags
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {meta.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-brand-500/15 text-brand-300 border border-brand-500/20"
                >
                  {tag.label}
                  <button onClick={() => handleRemoveTag(tag.id)} className="text-brand-300/70 hover:text-white">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {meta.tags.length === 0 && <span className="text-xs text-muted">Nenhuma tag</span>}
            </div>
            <form onSubmit={handleAddTag} className="flex gap-2">
              <input
                value={tagText}
                onChange={(e) => setTagText(e.target.value)}
                placeholder="Nova tag"
                className="flex-1 bg-surface-2 border border-surface rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 bg-brand-600 hover:bg-brand-500 text-white rounded-lg px-3 py-2 text-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </button>
            </form>
          </div>

          <div className="xl:col-span-2">
            <div className="flex items-center gap-2 mb-3 text-xs text-muted">
              <History className="w-3.5 h-3.5" />
              Notas internas e transferencias
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <ComposerModeButton
                    active={composerMode === 'public'}
                    icon={Send}
                    label="Mensagem"
                    onClick={() => handleSwitchComposerMode('public')}
                  />
                  <ComposerModeButton
                    active={composerMode === 'internal'}
                    icon={Mail}
                    label="Nota interna"
                    onClick={() => handleSwitchComposerMode('internal')}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setQuickReplyOpen((s) => !s)}
                      disabled={composerMode !== 'public'}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-surface px-3 py-1.5 text-xs text-slate-300 hover:bg-surface-2"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Respostas rapidas
                    </button>
                    {quickReplyOpen && (
                      <div className="absolute left-0 top-full z-20 mt-2 w-80 rounded-xl border border-surface bg-surface-1 p-3 shadow-xl">
                        <input
                          value={quickSearch}
                          onChange={(e) => setQuickSearch(e.target.value)}
                          placeholder="Buscar resposta..."
                          className="mb-3 w-full rounded-lg border border-surface bg-surface-2 px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-500"
                        />
                        <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                          {filteredQuickReplies.length === 0 ? (
                            <p className="text-xs text-muted">Nenhuma resposta encontrada.</p>
                          ) : (
                            filteredQuickReplies.map((reply) => (
                              <button
                                key={reply.id}
                                type="button"
                                onClick={() => handleQuickReplyPick(reply)}
                                className="block w-full rounded-lg border border-surface bg-surface-2 px-3 py-2 text-left hover:bg-surface-3"
                              >
                                <p className="text-xs font-medium text-white">{reply.title}</p>
                                <p className="mt-0.5 text-[11px] text-muted">/{reply.shortcut}</p>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setEmojiOpen((s) => !s)}
                      disabled={composerMode !== 'public'}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-surface px-3 py-1.5 text-xs text-slate-300 hover:bg-surface-2"
                    >
                      <Smile className="h-3.5 w-3.5" />
                      Emojis
                    </button>
                    {emojiOpen && (
                      <div className="absolute left-0 top-full z-20 mt-2 rounded-xl border border-surface bg-surface-1 p-3 shadow-xl">
                        <div className="grid grid-cols-4 gap-2">
                          {QUICK_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleEmojiInsert(emoji)}
                              className="h-10 w-10 rounded-lg border border-surface bg-surface-2 text-lg hover:bg-surface-3"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={composerMode === 'internal'}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-surface px-3 py-1.5 text-xs text-slate-300 hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    Anexo
                  </button>

                  <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
                </div>

                {attachment && (
                  <div className="rounded-xl border border-surface bg-surface-2 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate">{attachment.name}</p>
                        <p className="text-[11px] text-muted">{attachment.type || 'arquivo'}</p>
                      </div>
                      <button type="button" onClick={clearAttachment} className="text-muted hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {attachmentPreview && attachment.type?.startsWith('image/') && (
                      <img src={attachmentPreview} alt={attachment.name} className="mt-3 max-h-40 rounded-lg object-cover" />
                    )}
                    {attachmentPreview && attachment.type === 'application/pdf' && (
                      <div className="mt-3 flex items-center gap-2 rounded-lg border border-surface bg-surface-1 px-3 py-2 text-xs text-muted">
                        <FileText className="h-4 w-4" />
                        Preview de PDF pronto para envio
                      </div>
                    )}
                  </div>
                )}

                <form onSubmit={handleSend} className="space-y-2">
                  {composerMode === 'internal' ? (
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Escreva uma nota interna"
                      rows={3}
                      className="w-full bg-surface-2 border border-surface rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors resize-none"
                    />
                  ) : (
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === '/' && text === '' && composerMode === 'public') {
                          e.preventDefault()
                          setQuickReplyOpen(true)
                        } else if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSend(e)
                        }
                      }}
                      placeholder="Digite sua mensagem... (Enter para enviar, / para respostas rápidas)"
                      rows={4}
                      className="w-full bg-surface-2 border border-surface rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors resize-none"
                    />
                  )}
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 bg-surface-2 hover:bg-surface-3 border border-surface text-slate-200 rounded-lg px-3 py-2 text-xs transition-colors"
                  >
                    {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    {composerMode === 'internal' ? 'Salvar nota' : 'Enviar'}
                  </button>
                </form>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {meta.notes.length === 0 && meta.transfers.length === 0 && (
                  <div className="text-xs text-muted">Sem notas ou historico ainda</div>
                )}
                {meta.notes.map((note) => (
                  <div key={note.id} className="bg-surface-2 border border-surface rounded-xl p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-200 whitespace-pre-wrap">{note.content}</p>
                        <p className="text-[10px] text-muted mt-1">
                          {note.created_by?.name || 'Sistema'} - {note.created_at ? format(new Date(note.created_at), 'dd/MM HH:mm') : ''}
                        </p>
                      </div>
                      <button onClick={() => handleRemoveNote(note.id)} className="text-muted hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {meta.transfers.map((transfer) => (
                  <div key={transfer.id} className="bg-surface-2 border border-surface rounded-xl p-3">
                    <p className="text-xs text-slate-200">Transferido por {transfer.created_by?.name || 'Sistema'}</p>
                    <p className="text-[10px] text-muted mt-1">{transfer.reason || 'Sem motivo informado'}</p>
                    <p className="text-[10px] text-muted mt-1">
                      {transfer.created_at ? format(new Date(transfer.created_at), 'dd/MM HH:mm') : ''}
                    </p>
                  </div>
                ))}
                {metaLoading && <div className="text-xs text-muted">Carregando contexto...</div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
        {msgs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted text-sm">Nenhuma mensagem ainda</div>
        ) : (
          msgs.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
        )}
        <div ref={bottomRef} />
      </div>

      {isFinished ? (
        <div className="px-6 py-4 border-t border-surface bg-surface-1 text-center text-muted text-sm">
          Conversa finalizada
        </div>
      ) : (
        <div className="px-6 py-4 border-t border-surface bg-surface-1 flex-shrink-0 text-xs text-muted">
          Use a area de composicao acima para mensagens publicas, notas internas, emojis, anexos e respostas rapidas.
        </div>
      )}

      {showTransfer && (
        <TransferModal conversationId={activeId} onClose={() => setShowTransfer(false)} />
      )}
    </div>
  )
}
