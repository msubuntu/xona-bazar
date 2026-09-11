import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useMessages } from '../context/MessagesContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import MobileHeader from './MobileHeader.jsx'
import { openLoginSheet } from './MobileAuthSheet.jsx'

export default function MobileMessages() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { t } = useSettings()
  const { conversations, activeConversation, sendMessage, openConversation, closeConversation, loadConversations, loading } = useMessages()
  const [input, setInput] = useState('')
  const [view, setView] = useState('list')
  const messagesEnd = useRef(null)
  const convRetriedRef = useRef(false)
  const convHandledRef = useRef(null)

  const openConv = (conv) => { openConversation(conv); setView('chat') }
  const closeConv = () => { closeConversation(); setView('list') }

  useEffect(() => {
    const cid = searchParams.get('conv')
    if (!cid || view !== 'list') return
    if (convHandledRef.current === cid) return
    const conv = conversations.find(c => String(c.id) === cid)
    if (!conv) {
      if (!loading && !convRetriedRef.current) {
        convRetriedRef.current = true
        loadConversations()
      }
      return
    }
    convHandledRef.current = cid
    openConversation(conv)
    setView('chat')
    navigate('/messages', { replace: true })
  }, [searchParams, conversations, view, openConversation, navigate, loadConversations, loading])

  // Xabar maydoni: har 28 belgida yangi qatorga o'tadi
  // Jami 1 martada yozish mumkin bo'lgan belgilar soni — 220
  const CHARS_PER_ROW = 28
  const MAX_CHARS = 220
  const MAX_ROWS = Math.ceil(MAX_CHARS / CHARS_PER_ROW)   // 8 qator
  const inputRows = Math.min(
    MAX_ROWS,
    Math.max(1, Math.ceil(input.length / CHARS_PER_ROW))
  )

  useEffect(() => {
    if (messagesEnd.current) messagesEnd.current.scrollIntoView({ behavior: 'smooth' })
  }, [activeConversation?.messages?.length])

  if (!user) {
    return (
      <div className="mob">
        <MobileHeader />
        <div className="mob_empty">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <div className="mob_empty_title">{t('loginForMessages')}</div>
          <button className="mob_empty_btn" onClick={openLoginSheet}>{t('login')}</button>
        </div>
      </div>
    )
  }

  const handleSend = () => {
    if (!input.trim() || !activeConversation) return
    sendMessage(activeConversation.id, input, activeConversation.sellerId)
    setInput('')
  }

  return (
    <div className={`mob${view === 'chat' ? ' mob_chat_page' : ''}`}>
      <MobileHeader />

      {view === 'list' && (
        <>
          <div className="mob_page_head">
            <div className="mob_page_title">{t('messages')}</div>
            <span className="mob_chip mob_chip_green" style={{ marginLeft: 'auto' }}>{conversations.length} {t('countShort')}</span>
          </div>
          <div className="mob_list">
            {conversations.length === 0 && (
              <div className="mob_empty">
                <div className="mob_empty_title">{t('noConversations')}</div>
                <p style={{ fontSize: 13 }}>{t('messagesHint')}</p>
              </div>
            )}
            {conversations.map(c => (
              <div className="mob_conv" key={c.id} onClick={() => openConv(c)}>
                <div className="mob_conv_avatar" style={{ background: c.sellerColor }}>{c.sellerAvatar}</div>
                <div className="mob_conv_body">
                  <div className="mob_conv_name">
                    {c.sellerName}
                    <span className="mob_conv_time">{c.lastTime}</span>
                  </div>
                  <div className="mob_conv_last">
                    {c.lastMessage}
                    {c.unread > 0 && <span className="mob_conv_badge" style={{ marginLeft: 8 }}>{c.unread}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {view === 'chat' && activeConversation && (
        <>
          <div className="mob_page_head" style={{ paddingTop: 12 }}>
            <button className="mob_back" onClick={closeConv}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div className="mob_page_title">{activeConversation.sellerName}</div>
          </div>

          <div className="mob_chat_msgs">
            {activeConversation.messages.map((m, i) => (
              <div key={m.id || i} className={`mob_msg ${m.from === 'user' ? 'mob_msg_out' : 'mob_msg_in'}`}>
                {m.text}
                <span className="mob_msg_time">{m.time}</span>
              </div>
            ))}
            <div ref={messagesEnd} />
          </div>

          <div className="mob_chat_input">
            <textarea
              className="mob_chat_textarea"
              placeholder={t('writeMessage')}
              rows={inputRows}
              maxLength={220}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            />
            <button className="mob_chat_send" onClick={handleSend} aria-label={t('send')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  )
}