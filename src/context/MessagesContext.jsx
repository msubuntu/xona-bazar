import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { api } from '../services/api'
import { getSocket } from '../services/socket'
import { useAuth } from './AuthContext.jsx'

const MessagesContext = createContext()

export function MessagesProvider({ children }) {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [loading, setLoading] = useState(false)

  const loadConversations = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { conversations: convs } = await api.conversations.list()
      setConversations(convs.map(c => {
        const other = c.seller
        return {
          id: c._id,
          sellerId: other?._id,
          sellerName: other?.name || 'Sotuvchi',
          sellerAvatar: other?.name?.charAt(0) || 'S',
          sellerColor: other?.color || '#3b82f6',
          messages: (c.messages || []).map(m => ({
            id: m._id || m.createdAt,
            from: m.sender === user._id ? 'user' : 'seller',
            text: m.text,
            time: new Date(m.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
            date: new Date(m.createdAt).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' }),
          })),
          lastMessage: c.lastMessage || '',
          lastTime: c.lastTime ? new Date(c.lastTime).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) : '',
          unread: c.unread || 0,
        }
      }))
    } catch (err) {
      console.error('Load conversations error:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  useEffect(() => {
    if (!user) return
    const socket = getSocket()

    const handleNew = ({ conversationId, message }) => {
      const fromUser = message.sender === user._id
      const newMsg = {
        id: message._id || Date.now(),
        from: fromUser ? 'user' : 'seller',
        text: message.text,
        time: new Date(message.createdAt || Date.now()).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
        date: new Date(message.createdAt || Date.now()).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' }),
      }

      setConversations(prev => {
        const exists = prev.find(c => c.id === conversationId)
        if (exists) {
          return prev.map(c => {
            if (c.id !== conversationId) return c
            return {
              ...c,
              messages: [...c.messages, newMsg],
              lastMessage: message.text,
              lastTime: newMsg.time,
              unread: fromUser ? c.unread : c.unread + 1,
            }
          })
        }
        return prev
      })

      setActiveConversation(prev => {
        if (!prev || prev.id !== conversationId) return prev
        return { ...prev, messages: [...prev.messages, newMsg] }
      })
    }

    socket.on('new_message', handleNew)
    return () => socket.off('new_message', handleNew)
  }, [user])

  const sendMessage = useCallback(async (conversationId, text, sellerId) => {
    if (!text.trim()) return
    const now = new Date()
    const time = now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
    const date = now.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })
    const trimmed = text.trim()

    const newMsg = { id: Date.now(), from: 'user', text: trimmed, time, date }

    if (conversationId) {
      setConversations(prev => prev.map(c => {
        if (c.id !== conversationId) return c
        return { ...c, messages: [...c.messages, newMsg], lastMessage: trimmed, lastTime: time }
      }))
      setActiveConversation(prev => {
        if (!prev || prev.id !== conversationId) return prev
        return { ...prev, messages: [...prev.messages, newMsg], lastMessage: trimmed, lastTime: time }
      })

      try {
        await api.conversations.sendMessage(conversationId, trimmed)
      } catch (err) {
        console.error('Send message error:', err)
      }
    } else if (sellerId) {
      try {
        const { conversation } = await api.conversations.create(sellerId, trimmed)
        const newConv = {
          id: conversation._id,
          sellerId,
          sellerName: '',
          sellerAvatar: 'S',
          sellerColor: '#3b82f6',
          messages: [newMsg],
          lastMessage: trimmed,
          lastTime: time,
          unread: 0,
        }
        setConversations(prev => [newConv, ...prev])
        setActiveConversation(newConv)
      } catch (err) {
        console.error('Create conversation error:', err)
      }
    }
  }, [])

  const openConversation = useCallback((conv) => {
    setActiveConversation(conv)
    setConversations(prev => prev.map(c =>
      c.id === conv.id ? { ...c, unread: 0 } : c
    ))
    if (conv.id) {
      api.conversations.markRead(conv.id).catch(() => {})
    }
  }, [])

  const closeConversation = useCallback(() => {
    setActiveConversation(null)
  }, [])

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0)

  return (
    <MessagesContext.Provider value={{
      conversations,
      activeConversation,
      totalUnread,
      loading,
      sendMessage,
      openConversation,
      closeConversation,
      loadConversations,
    }}>
      {children}
    </MessagesContext.Provider>
  )
}

export function useMessages() {
  return useContext(MessagesContext)
}
