import { create } from 'zustand'
import api from '../services/api'

export const useChatStore = create((set, get) => ({
  conversations: [],
  messages: {},          // { [conversation_id]: Message[] }
  activeId: null,
  activeFilter: null,
  loading: false,

  sortConversations: (items = []) =>
    [...items].sort((a, b) => {
      const pinnedA = a.is_pinned ? 1 : 0
      const pinnedB = b.is_pinned ? 1 : 0
      if (pinnedA !== pinnedB) return pinnedB - pinnedA

      const priorityA = Number(a.priority || 0)
      const priorityB = Number(b.priority || 0)
      if (priorityA !== priorityB) return priorityB - priorityA

      const unreadA = Number(a.unread_count || 0)
      const unreadB = Number(b.unread_count || 0)
      if (unreadA !== unreadB) return unreadB - unreadA

      const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
      const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
      return timeB - timeA
    }),

  // ── Conversas ─────────────────────────────────────────────────────
  fetchConversations: async (params = {}) => {
    set({ loading: true })
    try {
      const { data } = await api.get('/conversations', { params })
      set({ conversations: data, activeFilter: params.status || null })
    } finally {
      set({ loading: false })
    }
  },

  addConversation: (conv) =>
    set((s) => {
      if (s.activeFilter && conv.status !== s.activeFilter) return {}
      return {
        conversations: s.sortConversations([conv, ...s.conversations]),
      }
    }),

  updateConversation: (id, patch) =>
    set((s) => {
      const next = s.conversations
        .map((c) => (c.id === id ? { ...c, ...patch } : c))
        .filter((c) => {
          if (c.id === s.activeId) return true
          return !s.activeFilter || c.status === s.activeFilter
        })
      return { conversations: s.sortConversations(next) }
    }),

  setActive: (id) => set({ activeId: id }),

  // ── Mensagens ─────────────────────────────────────────────────────
  fetchMessages: async (conversationId) => {
    const { data } = await api.get(`/conversations/${conversationId}/messages`)
    set((s) => ({
      messages: { ...s.messages, [conversationId]: data },
    }))
  },

  addMessage: (conversationId, msg) =>
    set((s) => {
      const prev = s.messages[conversationId] || []
      // Evita duplicatas
      if (prev.find((m) => m.id === msg.id)) return {}
      return {
        messages: { ...s.messages, [conversationId]: [...prev, msg] },
      }
    }),

  // ── Ações ─────────────────────────────────────────────────────────
  sendMessage: async (conversationId, content) => {
    const { data } = await api.post(`/conversations/${conversationId}/messages`, {
      content,
      message_type: 'text',
    })
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: [...(s.messages[conversationId] || []), data],
      },
    }))
    return data
  },

  sendAttachment: async (conversationId, file, caption = '') => {
    const form = new FormData()
    form.append('file', file)
    form.append('caption', caption || '')
    const { data } = await api.post(`/conversations/${conversationId}/attachments`, form)
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: [...(s.messages[conversationId] || []), data],
      },
    }))
    return data
  },

  assignAgent: async (conversationId, agentId) => {
    await api.post(`/conversations/${conversationId}/assign`, { agent_id: agentId })
    get().updateConversation(conversationId, { agent_id: agentId, status: 'in_progress' })
  },

  finishConversation: async (conversationId) => {
    await api.post(`/conversations/${conversationId}/finish`)
    get().updateConversation(conversationId, { status: 'finished' })
  },

  reopenConversation: async (conversationId) => {
    await api.post(`/conversations/${conversationId}/reopen`)
    get().updateConversation(conversationId, { status: 'waiting', agent_id: null, unread_count: 0 })
  },

  pinConversation: async (conversationId) => {
    const { data } = await api.post(`/conversations/${conversationId}/pin`)
    get().updateConversation(conversationId, { is_pinned: data.is_pinned })
  },

  markConversationUnread: async (conversationId) => {
    const { data } = await api.post(`/conversations/${conversationId}/mark-unread`)
    get().updateConversation(conversationId, { unread_count: data.unread_count })
  },

  transferConversation: async (conversationId, agentId, sectorId, reason = '') => {
    await api.post(`/conversations/${conversationId}/transfer`, {
      agent_id: agentId || null,
      sector_id: sectorId || null,
      reason: reason || null,
    })
  },

  requeueConversation: async (conversationId) => {
    await api.post(`/conversations/${conversationId}/requeue`)
    get().updateConversation(conversationId, { agent_id: null, status: 'waiting' })
  },

  setConversationPriority: async (conversationId, priority) => {
    await api.post(`/conversations/${conversationId}/priority`, { priority })
    get().updateConversation(conversationId, { priority })
  },
}))
