import { useEffect, useMemo, useRef, useState } from 'react'
import { format } from 'date-fns'
import { useChatStore } from '../../stores/chatStore'
import { useAuthStore } from '../../stores/authStore'
import api from '../../services/api'
import clsx from 'clsx'
import TransferModal from './TransferModal'
import { emitToast } from '../../utils/toast'
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
  MoreHorizontal,
} from 'lucide-react'

const QUICK_EMOJIS = ['ð', 'ð', 'ð', 'â', 'ð¥', 'ð¬', 'ð', 'â­']

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

function isEditableTarget(target) {
  if (!target || !target.tagName) return false
  const tagName = target.tagName.toLowerCase()
  return tagName === 'input' || tagName === 'textarea' || target.isContentEditable
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
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-muted" data-tour="chat-empty-state">
      <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center shadow-inner">
        <Phone className="w-7 h-7 opacity-30" />
      </div>
      <div className="text-center">
        <p className="text-sm text-slate-200">Selecione uma conversa para começar</p>
        <p className="mt-1 text-xs leading-5 text-muted">
          A conversa escolhida aparece no centro e o contexto do contato fica no painel lateral.
        </p>
      </div>
      <div className="w-full max-w-md rounded-2xl border border-white/5 bg-surface-1/70 px-4 py-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-subtle">O que fazer agora</p>
        <ul className="mt-2 space-y-1.5 text-xs leading-5 text-muted">
          <li>• Use a barra lateral para escolher uma conversa da fila.</li>
          <li>• Se não houver conversa, troque de aba ou limpe filtros avançados.</li>
          <li>• Depois, teste respostas rápidas, nota interna e transferência.</li>
        </ul>
      </div>
    </div>
  )
}

function ComposerModeButton({ active, icon: Icon, label, onClick, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
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

function ConversationActionsMenu({
  open,
  menuRef,
  conv,
  isFinished,
  onClose,
  onTogglePin,
  onMarkUnread,
  onTransfer,
  onRequeue,
  onReopen,
  onPriorityChange,
}) {
  if (!open) return null

  const priorityValue = conv?.priority ?? 0

  const closeAfter = (handler) => async () => {
    await handler?.()
    onClose?.()
  }

  return (
    <div ref={menuRef} className="absolute right-0 top-full z-30 mt-2 w-80 rounded-2xl border border-surface bg-surface-1 p-3 shadow-2xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-subtle">Mais aÃ§Ãµes</p>
          <p className="mt-1 text-[11px] text-muted">Movimentos secundÃ¡rios da conversa</p>
        </div>
        <button type="button" onClick={onClose} className="text-[11px] text-muted hover:text-white">
          Fechar
        </button>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={closeAfter(onTogglePin)}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-surface bg-surface-2 px-3 py-2 text-left text-xs text-slate-200 transition-colors hover:border-brand-500/30 hover:text-white"
        >
          <span className="inline-flex items-center gap-2">
            <Pin className="h-3.5 w-3.5" />
            {conv?.is_pinned ? 'Desafixar conversa' : 'Fixar conversa'}
          </span>
          <span className="text-[11px] text-muted">{conv?.is_pinned ? 'Ativa' : 'Disponivel'}</span>
        </button>

        <button
          type="button"
          onClick={closeAfter(onMarkUnread)}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-surface bg-surface-2 px-3 py-2 text-left text-xs text-slate-200 transition-colors hover:border-brand-500/30 hover:text-white"
        >
          <span className="inline-flex items-center gap-2">
            <Mail className="h-3.5 w-3.5" />
            Marcar como nao lida
          </span>
          <span className="text-[11px] text-muted">Manter na fila</span>
        </button>

        {!isFinished && (
          <>
            <button
              type="button"
              onClick={closeAfter(onTransfer)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-surface bg-surface-2 px-3 py-2 text-left text-xs text-slate-200 transition-colors hover:border-brand-500/30 hover:text-white"
            >
              <span className="inline-flex items-center gap-2">
                <ArrowRightLeft className="h-3.5 w-3.5" />
                Transferir conversa
              </span>
              <span className="text-[11px] text-muted">Equipe</span>
            </button>

            {conv?.status !== 'waiting' && (
              <button
                type="button"
                onClick={closeAfter(onRequeue)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-surface bg-surface-2 px-3 py-2 text-left text-xs text-slate-200 transition-colors hover:border-brand-500/30 hover:text-white"
              >
                <span className="inline-flex items-center gap-2">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Voltar para fila
                </span>
                <span className="text-[11px] text-muted">Fila do setor</span>
              </button>
            )}
          </>
        )}

        {isFinished && (
          <button
            type="button"
            onClick={closeAfter(onReopen)}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-surface bg-surface-2 px-3 py-2 text-left text-xs text-slate-200 transition-colors hover:border-brand-500/30 hover:text-white"
          >
            <span className="inline-flex items-center gap-2">
              <RotateCcw className="h-3.5 w-3.5" />
              Reabrir atendimento
            </span>
            <span className="text-[11px] text-muted">Restaurar</span>
          </button>
        )}

        <div className="rounded-xl border border-surface bg-surface-2 px-3 py-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs text-slate-200">Prioridade</p>
            <span className="text-[11px] text-muted">
              {priorityValue > 0 ? `Atual: ${priorityValue}` : 'Normal'}
            </span>
          </div>
          <select
            value={priorityValue}
            onChange={async (e) => {
              await onPriorityChange?.(Number(e.target.value))
              onClose?.()
            }}
            className="w-full rounded-lg border border-surface bg-surface-1 px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
          >
            <option value={0}>Normal</option>
            <option value={1}>Baixa</option>
            <option value={2}>Alta</option>
            <option value={3}>Urgente</option>
          </select>
        </div>
      </div>
    </div>
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
  const [actionsOpen, setActionsOpen] = useState(false)
  const [contextOpen, setContextOpen] = useState(true)
  const bottomRef = useRef(null)
  const fileRef = useRef(null)
  const actionsMenuRef = useRef(null)

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
  const contactName = conv?.contact?.name || conv?.contact?.phone || 'â'
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
    setActionsOpen(false)
    setContextOpen(true)
  }, [activeId])

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
    if (!actionsOpen) return undefined
    const handlePointerDown = (event) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target)) {
        setActionsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [actionsOpen])

  useEffect(() => {
    const handleHotkeys = (event) => {
      if (!activeId) return

      const metaPressed = event.ctrlKey || event.metaKey
      const editField = isEditableTarget(event.target)

      if (event.key === 'Escape') {
        if (actionsOpen) {
          setActionsOpen(false)
          return
        }
        if (quickReplyOpen) {
          setQuickReplyOpen(false)
          return
        }
        if (emojiOpen) {
          setEmojiOpen(false)
          return
        }
        if (contextOpen) {
          setContextOpen(false)
        }
        return
      }

      if (event.altKey && !event.shiftKey && !metaPressed) {
        if (event.key === '1') {
          event.preventDefault()
          handleSwitchComposerMode('public')
          return
        }
        if (event.key === '2') {
          event.preventDefault()
          handleSwitchComposerMode('internal')
          return
        }
      }

      if (!metaPressed || !event.shiftKey) return

      const key = event.key.toLowerCase()

      if (key === 'a' && conv?.status === 'waiting' && !isFinished) {
        event.preventDefault()
        handleAssignMe()
        return
      }

      if (key === 'f' && !isFinished) {
        event.preventDefault()
        handleFinish()
        return
      }

      if (key === 'r' && isFinished) {
        event.preventDefault()
        handleReopen()
        return
      }

      if (key === 'm') {
        event.preventDefault()
        handleUnread()
        return
      }

      if (key === 'p') {
        event.preventDefault()
        handlePin()
        return
      }

      if (event.key === 'Enter' && !editField && composerMode === 'public') {
        event.preventDefault()
        handleSend(event)
      }
    }

    window.addEventListener('keydown', handleHotkeys)
    return () => window.removeEventListener('keydown', handleHotkeys)
  }, [
    activeId,
    actionsOpen,
    composerMode,
    contextOpen,
    conv?.status,
    emojiOpen,
    isFinished,
    quickReplyOpen,
  ])

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
        emitToast({
          title: 'Nota salva',
          message: 'A anotação interna foi adicionada ao histórico.',
          variant: 'success',
        })
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
      emitToast({
        title: 'Mensagem enviada',
        message: composerMode === 'public' ? 'A mensagem foi entregue ao cliente.' : 'A nota interna foi registrada.',
        variant: 'success',
      })
    } catch (err) {
      console.error('Erro ao enviar:', err)
      emitToast({
        title: 'Falha ao enviar',
        message: 'Verifique a conexão ou tente novamente.',
        variant: 'error',
      })
    } finally {
      setSending(false)
    }
  }

  const handleAssignMe = async () => {
    if (!activeId || !user) return
    try {
      await assignAgent(activeId, user.id)
      emitToast({
        title: 'Conversa assumida',
        message: 'Ela agora está atribuída a você.',
        variant: 'success',
      })
    } catch (err) {
      console.error(err)
      emitToast({
        title: 'Não foi possível assumir',
        message: 'Tente novamente em instantes.',
        variant: 'error',
      })
    }
  }

  const handleFinish = async () => {
    if (!activeId) return
    if (!confirm('Finalizar este atendimento?')) return
    try {
      await finishConversation(activeId)
      emitToast({
        title: 'Atendimento finalizado',
        message: 'A conversa foi encerrada com sucesso.',
        variant: 'success',
      })
    } catch (err) {
      console.error(err)
      emitToast({
        title: 'Falha ao finalizar',
        message: 'Tente novamente.',
        variant: 'error',
      })
    }
  }

  const handleRequeue = async () => {
    if (!activeId) return
    if (!confirm('Devolver esta conversa para a fila?')) return
    try {
      await requeueConversation(activeId)
      emitToast({
        title: 'Retornada para a fila',
        message: 'A conversa voltou para o atendimento do setor.',
        variant: 'success',
      })
    } catch (err) {
      console.error(err)
      emitToast({
        title: 'Falha ao devolver para a fila',
        message: 'Tente novamente.',
        variant: 'error',
      })
    }
  }

  const handleReopen = async () => {
    if (!activeId) return
    if (!confirm('Reabrir este atendimento?')) return
    try {
      await reopenConversation(activeId)
      emitToast({
        title: 'Atendimento reaberto',
        message: 'A conversa voltou para acompanhamento.',
        variant: 'success',
      })
    } catch (err) {
      console.error(err)
      emitToast({
        title: 'Falha ao reabrir',
        message: 'Tente novamente.',
        variant: 'error',
      })
    }
  }

  const handlePriorityChange = async (nextPriority) => {
    if (!activeId) return
    const priority = typeof nextPriority === 'number' ? nextPriority : Number(nextPriority?.target?.value ?? nextPriority)
    try {
      await setConversationPriority(activeId, priority)
      emitToast({
        title: 'Prioridade atualizada',
        message: 'O n?vel de prioridade foi salvo.',
        variant: 'success',
      })
    } catch (err) {
      console.error(err)
      emitToast({
        title: 'Falha ao alterar prioridade',
        message: 'Tente novamente.',
        variant: 'error',
      })
    }
  }

  const handlePin = async () => {
    if (!activeId) return
    try {
      await pinConversation(activeId)
      emitToast({
        title: conv?.is_pinned ? 'Conversa desafixada' : 'Conversa fixada',
        message: 'A a??o foi aplicada com sucesso.',
        variant: 'success',
      })
    } catch (err) {
      console.error(err)
      emitToast({
        title: 'Falha ao fixar conversa',
        message: 'Tente novamente.',
        variant: 'error',
      })
    }
  }

  const handleUnread = async () => {
    if (!activeId) return
    try {
      await markConversationUnread(activeId)
      emitToast({
        title: 'Marcada como não lida',
        message: 'A conversa continuará destacada.',
        variant: 'success',
      })
    } catch (err) {
      console.error(err)
      emitToast({
        title: 'Falha ao marcar como não lida',
        message: 'Tente novamente.',
        variant: 'error',
      })
    }
  }

  const handleAddNote = async (e) => {
    e.preventDefault()
    if (!activeId || !noteText.trim()) return
    try {
      await api.post(`/conversations/${activeId}/notes`, { content: noteText.trim() })
      setNoteText('')
      await reloadMeta()
      emitToast({
        title: 'Nota adicionada',
        message: 'O histórico da conversa foi atualizado.',
        variant: 'success',
      })
    } catch (err) {
      emitToast({
        title: 'Falha ao salvar nota',
        message: err.response?.data?.detail || 'Tente novamente.',
        variant: 'error',
      })
    }
  }

  const handleAddTag = async (e) => {
    e.preventDefault()
    if (!activeId || !tagText.trim()) return
    try {
      await api.post(`/conversations/${activeId}/tags`, { label: tagText.trim() })
      setTagText('')
      await reloadMeta()
      emitToast({
        title: 'Tag adicionada',
        message: 'A conversa recebeu uma nova etiqueta.',
        variant: 'success',
      })
    } catch (err) {
      emitToast({
        title: 'Falha ao adicionar tag',
        message: err.response?.data?.detail || 'Tente novamente.',
        variant: 'error',
      })
    }
  }

  const handleRemoveNote = async (noteId) => {
    if (!activeId) return
    try {
      await api.delete(`/conversations/${activeId}/notes/${noteId}`)
      await reloadMeta()
      emitToast({
        title: 'Nota removida',
        message: 'O histórico foi atualizado.',
        variant: 'success',
      })
    } catch (err) {
      emitToast({
        title: 'Falha ao remover nota',
        message: err.response?.data?.detail || 'Tente novamente.',
        variant: 'error',
      })
    }
  }

  const handleRemoveTag = async (tagId) => {
    if (!activeId) return
    try {
      await api.delete(`/conversations/${activeId}/tags/${tagId}`)
      await reloadMeta()
      emitToast({
        title: 'Tag removida',
        message: 'A etiqueta saiu da conversa.',
        variant: 'success',
      })
    } catch (err) {
      emitToast({
        title: 'Falha ao remover tag',
        message: err.response?.data?.detail || 'Tente novamente.',
        variant: 'error',
      })
    }
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
      emitToast({
        title: 'CRM salvo',
        message: 'Os dados do contato foram atualizados.',
        variant: 'success',
      })
    } catch (err) {
      setCrmError(err.response?.data?.detail || 'Erro ao salvar CRM')
      emitToast({
        title: 'Falha ao salvar CRM',
        message: err.response?.data?.detail || 'Tente novamente.',
        variant: 'error',
      })
    } finally {
      setCrmSaving(false)
    }
  }

  const handleTriaging = async () => {
    if (!activeId) return
    try {
      await api.post(`/conversations/${activeId}/triage`)
      await loadCrm()
      emitToast({
        title: 'Triagem reexecutada',
        message: 'A conversa foi reavaliada com as regras atuais.',
        variant: 'success',
      })
    } catch (err) {
      setCrmError(err.response?.data?.detail || 'Nao foi possivel executar a triagem.')
      emitToast({
        title: 'Falha na triagem',
        message: err.response?.data?.detail || 'Tente novamente.',
        variant: 'error',
      })
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
    <div className="flex h-full min-w-0 overflow-hidden bg-surface-0">
      <div className="flex min-w-0 flex-1 flex-col border-r border-surface bg-surface-0">
        <div className="flex items-start gap-3 border-b border-surface bg-surface-1/80 px-6 py-4 backdrop-blur">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-medium uppercase text-white">
            {contactName[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{contactName}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="text-xs text-muted">{conv?.contact?.phone}</p>
              {conv?.status && (
                <span
                  className={clsx(
                    'rounded-full px-2 py-0.5 text-[10px] font-medium',
                    conv.status === 'waiting' && 'bg-yellow-500/15 text-yellow-400',
                    conv.status === 'in_progress' && 'bg-brand-500/15 text-brand-400',
                    conv.status === 'finished' && 'bg-slate-500/15 text-slate-400'
                  )}
                >
                  {{ waiting: 'Aguardando', in_progress: 'Em atendimento', finished: 'Finalizado' }[conv.status]}
                </span>
              )}
              {conv?.agent?.name && <span className="text-[10px] text-muted">· {conv.agent.name}</span>}
              {typeof conv?.priority === 'number' && conv.priority > 0 && (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                  Prioridade {conv.priority}
                </span>
              )}
              {conv?.is_pinned && (
                <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-medium text-brand-300">
                  Fixada
                </span>
              )}
            </div>
          </div>

          <div className="relative flex shrink-0 items-center gap-2" data-tour="chat-header-actions">
            {!isFinished ? (
              <>
                {conv?.status === 'waiting' && (
                  <button
                    onClick={handleAssignMe}
                    title="Assumir conversa"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-xs text-white transition-colors hover:bg-brand-500"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    Assumir
                  </button>
                )}
                <button
                  onClick={handleFinish}
                  title="Finalizar atendimento"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-surface bg-surface-2 px-3 py-2 text-xs text-red-300 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-200"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Finalizar
                </button>
              </>
              ) : (
                <button
                  onClick={handleReopen}
                  title="Reabrir atendimento"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-xs text-white transition-colors hover:bg-brand-500"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reabrir
                </button>
              )}

            <button
              type="button"
              onClick={() => setContextOpen((current) => !current)}
              title={contextOpen ? 'Ocultar contexto lateral' : 'Mostrar contexto lateral'}
              className="inline-flex items-center gap-1.5 rounded-xl border border-surface bg-surface-2 px-3 py-2 text-xs text-slate-300 transition-colors hover:border-brand-500/30 hover:text-white"
            >
              {contextOpen ? 'Ocultar contexto' : 'Mostrar contexto'}
            </button>

            <button
              type="button"
              onClick={() => setActionsOpen((current) => !current)}
              className={clsx(
                'inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-colors',
                actionsOpen
                  ? 'border-brand-500/30 bg-brand-500/15 text-brand-300'
                  : 'border-surface bg-surface-2 text-slate-300 hover:border-brand-500/30 hover:text-white'
              )}
              title="Mais ações"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

          <ConversationActionsMenu
              open={actionsOpen}
              menuRef={actionsMenuRef}
              conv={conv}
              isFinished={isFinished}
              onClose={() => setActionsOpen(false)}
              onTogglePin={handlePin}
              onMarkUnread={handleUnread}
              onTransfer={() => setShowTransfer(true)}
              onRequeue={handleRequeue}
              onReopen={handleReopen}
              onPriorityChange={handlePriorityChange}
            />
          </div>
        </div>

        {conv?.contact?.id && (
          <div className="border-b border-surface bg-surface-1/60 px-6 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/5 bg-surface-2/70 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-subtle">Resumo do contato</p>
                <p className="mt-1 text-sm font-medium text-white">
                  {crm?.contact?.company || conv?.contact?.name || conv?.contact?.phone}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {crm?.contact?.origin ? `Origem: ${crm.contact.origin}` : 'Origem não informada'}
                  {crm?.contact?.stage ? ` · Estágio: ${crm.contact.stage}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/5 bg-surface-1 px-2.5 py-1 text-[11px] text-slate-300">
                  Tags: {meta.tags.length}
                </span>
                <span className="rounded-full border border-white/5 bg-surface-1 px-2.5 py-1 text-[11px] text-slate-300">
                  {crm?.contact?.responsible_user_id ? 'Responsável definido' : 'Sem responsável'}
                </span>
                {crm?.summary?.last_touched_at && (
                  <span className="rounded-full border border-white/5 bg-surface-1 px-2.5 py-1 text-[11px] text-slate-300">
                    Atualizado em {format(new Date(crm.summary.last_touched_at), 'dd/MM HH:mm')}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-1">
            {msgs.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted">Nenhuma mensagem ainda</div>
            ) : (
              msgs.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-surface bg-surface-1/85 px-6 py-4 backdrop-blur" data-tour="chat-composer">
            <div className="rounded-3xl border border-surface bg-gradient-to-br from-surface-2 via-surface-2 to-surface-1 p-4 shadow-[0_1px_0_rgba(255,255,255,0.02),0_16px_40px_rgba(0,0,0,0.12)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                  <ComposerModeButton
                    active={composerMode === 'public'}
                    icon={Send}
                    label="Mensagem"
                    title="Enviar mensagem ao cliente"
                    onClick={() => handleSwitchComposerMode('public')}
                  />
                  <ComposerModeButton
                    active={composerMode === 'internal'}
                    icon={Mail}
                    label="Nota interna"
                    title="Escrever apenas para a equipe"
                    onClick={() => handleSwitchComposerMode('internal')}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setQuickReplyOpen((s) => !s)}
                      disabled={composerMode !== 'public'}
                      title="Abrir respostas rápidas"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-surface px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
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
                      title="Inserir emoji"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-surface px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
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
                    title={composerMode === 'internal' ? 'Anexos ficam desativados para nota interna' : 'Adicionar anexo'}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-surface px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    Anexo
                  </button>

                  <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-surface bg-surface-1/70 px-3 py-2 text-[11px] text-muted">
                <span className="font-medium text-slate-300">Atalhos:</span>
                <span><strong className="text-white">Ctrl+Enter</strong> envia</span>
                <span>•</span>
                <span><strong className="text-white">Alt+1</strong> mensagem</span>
                <span>•</span>
                <span><strong className="text-white">Alt+2</strong> nota</span>
                <span>•</span>
                <span><strong className="text-white">Ctrl+Shift+A/F</strong> assumir / finalizar</span>
              </div>

              {attachment && (
                <div className="mt-3 rounded-xl border border-surface bg-surface-2 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-white">{attachment.name}</p>
                      <p className="text-[11px] text-muted">{attachment.type || 'arquivo'}</p>
                    </div>
                    <button type="button" onClick={clearAttachment} className="text-muted transition-colors hover:text-red-400">
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

              <form onSubmit={handleSend} className="mt-3 space-y-2">
                {composerMode === 'internal' ? (
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Escreva uma nota interna"
                    rows={3}
                    className="w-full resize-none rounded-xl border border-surface bg-surface-2 px-3 py-2 text-sm text-white placeholder-gray-600 transition-colors focus:outline-none focus:border-brand-500"
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
                    placeholder="Digite sua mensagem... (Enter para enviar, / para respostas rapidas)"
                    rows={4}
                    className="w-full resize-none rounded-xl border border-surface bg-surface-2 px-3 py-2 text-sm text-white placeholder-gray-600 transition-colors focus:outline-none focus:border-brand-500"
                  />
                )}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] text-muted">
                    {composerMode === 'internal'
                      ? 'Notas internas ficam visiveis apenas para a equipe.'
                      : 'Use mensagens publicas, respostas rapidas e anexos aqui embaixo.'}
                  </p>
                  <button
                    type="submit"
                    title={composerMode === 'internal' ? 'Salvar nota interna' : 'Enviar mensagem'}
                    className="inline-flex items-center gap-1 rounded-lg border border-surface bg-surface-2 px-3 py-2 text-xs text-slate-200 transition-colors hover:bg-surface-3"
                  >
                    {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    {composerMode === 'internal' ? 'Salvar nota' : 'Enviar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <aside
        className={clsx(
          'flex min-h-0 flex-col border-l border-surface bg-surface-1 transition-all duration-200',
          contextOpen ? 'w-[22rem]' : 'w-0 overflow-hidden border-l-0'
        )}
        data-tour="chat-context-panel"
      >
        <div className="flex items-center justify-between gap-3 border-b border-surface px-4 py-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-subtle">Contexto</p>
            <p className="mt-1 text-sm font-medium text-white">CRM, tags e historico</p>
          </div>
          <button
            type="button"
            onClick={() => setContextOpen(false)}
            className="rounded-lg border border-surface bg-surface-2 px-3 py-2 text-xs text-slate-300 transition-colors hover:border-brand-500/30 hover:text-white"
          >
            Ocultar
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div className="space-y-3 rounded-2xl border border-surface bg-surface-2 p-3">
            <div className="flex items-center justify-between gap-2 text-xs text-muted">
              <span>CRM do contato</span>
              <button
                type="button"
                onClick={handleTriaging}
                className="text-brand-400 transition-colors hover:text-brand-300"
              >
                Reexecutar triagem
              </button>
            </div>

            <form onSubmit={handleSaveCrm} className="space-y-3">
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
                className="w-full resize-none rounded-lg border border-surface bg-surface-1 px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-500"
              />
              {crmError && <p className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-[11px] text-red-400">{crmError}</p>}
              <button
                type="submit"
                disabled={crmSaving || crmLoading}
                className="w-full rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-500 disabled:opacity-50"
              >
                {crmSaving ? 'Salvando...' : 'Salvar CRM'}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-surface bg-surface-2 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs text-muted">
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
                <div className="pt-1 text-[11px] text-muted">
                  Ultimo toque: {crm?.summary?.last_touched_at ? format(new Date(crm.summary.last_touched_at), 'dd/MM HH:mm') : 'sem registro'}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-surface bg-surface-2 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs text-muted">
              <Tag className="w-3.5 h-3.5" />
              Tags
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {meta.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 rounded-full border border-brand-500/20 bg-brand-500/15 px-2 py-1 text-[10px] text-brand-300"
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
                className="flex-1 rounded-lg border border-surface bg-surface-1 px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-2 text-xs text-white transition-colors hover:bg-brand-500"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-surface bg-surface-2 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs text-muted">
              <History className="w-3.5 h-3.5" />
              Notas e transferencias
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {meta.notes.length === 0 && meta.transfers.length === 0 && (
                <div className="text-xs text-muted">Sem notas ou historico ainda</div>
              )}
              {meta.notes.map((note) => (
                <div key={note.id} className="rounded-xl border border-surface bg-surface-1 px-3 py-2">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="whitespace-pre-wrap text-xs text-slate-200">{note.content}</p>
                      <p className="mt-1 text-[10px] text-muted">
                        {note.created_by?.name || 'Sistema'} - {note.created_at ? format(new Date(note.created_at), 'dd/MM HH:mm') : ''}
                      </p>
                    </div>
                    <button onClick={() => handleRemoveNote(note.id)} className="text-muted transition-colors hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {meta.transfers.map((transfer) => (
                <div key={transfer.id} className="rounded-xl border border-surface bg-surface-1 px-3 py-2">
                  <p className="text-xs text-slate-200">Transferido por {transfer.created_by?.name || 'Sistema'}</p>
                  <p className="mt-1 text-[10px] text-muted">{transfer.reason || 'Sem motivo informado'}</p>
                  <p className="mt-1 text-[10px] text-muted">
                    {transfer.created_at ? format(new Date(transfer.created_at), 'dd/MM HH:mm') : ''}
                  </p>
                </div>
              ))}
              {metaLoading && <div className="text-xs text-muted">Carregando contexto...</div>}
            </div>
          </div>
        </div>
      </aside>

      {showTransfer && <TransferModal conversationId={activeId} onClose={() => setShowTransfer(false)} />}
    </div>
  )
}
