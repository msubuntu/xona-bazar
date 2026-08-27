import { useState, useRef, useEffect } from 'react'
import { useSeller } from '../context/SellerContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useMessages } from '../context/MessagesContext.jsx'
import '../components_css/chat.css'

function ChatPanel() {
  const { chatSeller, showChat, closeChat } = useSeller()
  const { user } = useAuth()
  const { t } = useSettings()
  const { conversations, sendMessage } = useMessages()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [conversationId, setConversationId] = useState(null)
  const [sending, setSending] = useState(false)
  const messagesEnd = useRef(null)
  const sellerId = chatSeller?._id || chatSeller?.id

  useEffect(() => {
    if (!showChat || !chatSeller || !sellerId) return
    if (user && sellerId === user._id) { closeChat(); return }
    const existing = conversations.find(c => c.sellerId === sellerId)
    if (existing) {
      setConversationId(existing.id)
      setMessages(existing.messages || [])
    } else {
      setConversationId(null)
      setMessages([{
        id: 'greeting',
        from: 'seller',
        text: `Salom! Men ${chatSeller.name || chatSeller.shopName || 'Sotuvchi'}. Qanday yordam bera olaman?`,
        time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
      }])
    }
  }, [showChat, chatSeller, sellerId, conversations])

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!conversationId) return
    const existing = conversations.find(c => c.id === conversationId)
    if (existing) setMessages(existing.messages || [])
  }, [conversations, conversationId])

  const handleSend = async () => {
    if (!input.trim() || sending) return
    const text = input.trim()
    setInput('')
    setSending(true)

    setMessages(prev => [...prev, {
      id: Date.now(),
      from: 'user',
      text,
      time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
    }])

    try {
      await sendMessage(conversationId, text, sellerId)
      if (!conversationId) {
        const newConv = conversations.find(c => c.sellerId === sellerId)
        if (newConv) setConversationId(newConv.id)
      }
    } catch (err) {
      console.error('Chat send error:', err)
    } finally {
      setSending(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!showChat || !chatSeller) return null
  const s = chatSeller

  return (
    <div className="chat_overlay" onClick={closeChat}>
      <div className="chat_panel" onClick={e => e.stopPropagation()}>
        <div className="chat_header">
          <div className="chat_seller">
            <div className="chat_avatar" style={{ background: s.color || '#3b82f6' }}>{s.avatar || s.name?.[0] || 'S'}</div>
            <div>
              <h3>{s.name || s.shopName || 'Sotuvchi'}</h3>
              <span className="chat_status">
                <span className="chat_online"></span>
                {t('online') || 'Online'}
              </span>
            </div>
          </div>
          <button className="chat_close" onClick={closeChat}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="chat_messages">
          {messages.map(m => (
            <div className={`chat_msg ${m.from === 'user' ? 'user' : 'seller'}`} key={m.id}>
              {m.from === 'seller' && (
                <div className="chat_msg_avatar" style={{ background: s.color || '#3b82f6' }}>{s.avatar || s.name?.[0] || 'S'}</div>
              )}
              <div className="chat_msg_bubble">
                <p>{m.text}</p>
                <span>{m.time}</span>
              </div>
              {m.from === 'user' && (
                <div className="chat_msg_avatar user_avatar">
                  {user?.avatar || user?.name?.[0] || 'U'}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEnd} />
        </div>

        <div className="chat_input">
          <input
            type="text"
            placeholder={t('chatPlaceholder') || 'Xabar yozing...'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={sending}
          />
          <button onClick={handleSend} disabled={!input.trim() || sending}>
            {sending ? '...' : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatPanel
