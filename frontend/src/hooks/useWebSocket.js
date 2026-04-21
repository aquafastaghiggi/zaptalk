import { useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useChatStore } from '../stores/chatStore'

export function useWebSocket() {
  const ws = useRef(null)
  const pingInterval = useRef(null)
  const { token } = useAuthStore()
  const { addMessage, addConversation, updateConversation } = useChatStore()

  const connect = useCallback(() => {
    if (!token) return
    if (ws.current?.readyState === WebSocket.OPEN) return

    const url = `ws://localhost:8000/ws?token=${token}`
    ws.current = new WebSocket(url)

    ws.current.onopen = () => {
      console.log('✅ WebSocket conectado')
      // Ping a cada 25s para manter conexão viva
      pingInterval.current = setInterval(() => {
        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send('ping')
        }
      }, 25_000)
    }

    ws.current.onmessage = (e) => {
      try {
        const { event, data } = JSON.parse(e.data)
        if (event === 'pong') return

        handleEvent(event, data)
      } catch (err) {
        console.warn('WS parse error:', err)
      }
    }

    ws.current.onclose = () => {
      console.log('⚠️ WebSocket desconectado — reconectando em 3s')
      clearInterval(pingInterval.current)
      setTimeout(connect, 3_000)
    }

    ws.current.onerror = (err) => {
      console.error('WS error:', err)
      ws.current.close()
    }
  }, [token])

  function handleEvent(event, data) {
    switch (event) {
      case 'new_message':
        addMessage(data.conversation_id, data.message)
        updateConversation(data.conversation_id, {
          last_message_at: data.message.created_at,
          unread_count: data.unread_count,
        })
        break

      case 'new_conversation':
        addConversation(data)
        break

      case 'conversation_assigned':
      case 'conversation_transferred':
      case 'conversation_finished':
      case 'conversation_requeued':
      case 'conversation_priority_changed':
      case 'conversation_pinned':
      case 'conversation_marked_unread':
      case 'conversation_reopened':
        updateConversation(data.conversation_id, data)
        window.dispatchEvent(
          new CustomEvent('zaptalk:conversation-meta-changed', {
            detail: { conversationId: data.conversation_id, event },
          })
        )
        break

      case 'conversation_note_added':
      case 'conversation_tag_added':
        window.dispatchEvent(
          new CustomEvent('zaptalk:conversation-meta-changed', {
            detail: { conversationId: data.conversation_id, event },
          })
        )
        break

      default:
        console.debug('WS event ignorado:', event)
    }
  }

  useEffect(() => {
    connect()
    return () => {
      clearInterval(pingInterval.current)
      ws.current?.close()
    }
  }, [connect])
}
