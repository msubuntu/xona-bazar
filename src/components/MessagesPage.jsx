import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useMessages } from '../context/MessagesContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import Header from './header'
import LoginPrompt from './LoginPrompt'
import '../components_css/messages.css'

function MessagesPage() {
  const { user, openLogin } = useAuth()
  const { conversations, activeConversation, sendMessage, openConversation, closeConversation } = useMessages()
  const navigate = useNavigate()
  const { t } = useSettings()

  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [mobileView, setMobileView] = useState('list')
  const messagesEnd = useRef(null)
  const chatContainerRef = useRef(null)

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [activeConversation, activeConversation?.messages?.length])

  const handleOpenConversation = (conv) => {
    openConversation(conv)
    setMobileView('chat')
  }

  const handleCloseConversation = () => {
    closeConversation()
    setMobileView('list')
  }

  if (!user) {
    return (
      <div className="msgpage">
        <Header />
        <div className="container">
          <div className="msgpage_breadcrumb">
            <span onClick={() => navigate('/')}>{t('home')}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            <span className="active">{t('messages')}</span>
          </div>

          <div className="msgpage_empty_auth">
            <div className="msgpage_empty_icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <h2>{t('loginRequired')}</h2>
            <p>{t('loginRequiredDesc')}</p>
            <button className="msgpage_login_btn" onClick={openLogin}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              {t('loginPrompt')}
            </button>
          </div>
        </div>
        {showLoginPrompt && <LoginPrompt onClose={() => setShowLoginPrompt(false)} />}
      </div>
    )
  }

  const handleSend = () => {
    if (!input.trim() || !activeConversation) return
    sendMessage(activeConversation.id, input, activeConversation.sellerId)
    setInput('')
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="msgpage">
      <Header />
      <div className="container">
        <div className="msgpage_breadcrumb">
          <span onClick={() => navigate('/')}>{t('home')}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          <span className="active">{t('messages')}</span>
        </div>

        <div className="msgpage_layout">
          {/* Sidebar — suhbat ro'yxati */}
          <div className={`msgpage_sidebar ${mobileView === 'chat' ? 'hidden' : ''}`}>
            <div className="msgpage_sidebar_header">
              <h2>{t('messages')}</h2>
              <span className="msgpage_count">{conversations.length}</span>
            </div>

            <div className="msgpage_search">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div className="msgpage_conversations">
              {conversations.length === 0 ? (
                <div className="msgpage_no_conv">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <p>{t('noMessages')}</p>
                </div>
              ) : (
                conversations.filter(conv => !search || (conv.sellerName || '').toLowerCase().includes(search.toLowerCase())).map(conv => (
                  <button
                    key={conv.id}
                    className={`msgpage_conv ${activeConversation?.id === conv.id ? 'active' : ''}`}
                    onClick={() => handleOpenConversation(conv)}
                  >
                    <div className="msgpage_conv_avatar" style={{ background: conv.sellerColor }}>
                      {conv.sellerAvatar}
                    </div>
                    <div className="msgpage_conv_info">
                      <div className="msgpage_conv_top">
                        <span className="msgpage_conv_name">{conv.sellerName}</span>
                        <span className="msgpage_conv_time">{conv.lastTime}</span>
                      </div>
                      <div className="msgpage_conv_bottom">
                        <span className="msgpage_conv_last">{conv.lastMessage}</span>
                        {conv.unread > 0 && <span className="msgpage_conv_badge">{conv.unread}</span>}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat qismi */}
          <div className={`msgpage_chat ${mobileView === 'list' && !activeConversation ? 'hidden' : ''}`}>
            {!activeConversation ? (
              <div className="msgpage_chat_empty">
                <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <h3>{t('selectConversation')}</h3>
                <p>{t('selectConversationDesc')}</p>
              </div>
            ) : (
              <>
                <div className="msgpage_chat_header">
                  <button className="msgpage_back_btn" onClick={handleCloseConversation}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <div className="msgpage_chat_seller">
                    <div className="msgpage_chat_avatar" style={{ background: activeConversation.sellerColor }}>
                      {activeConversation.sellerAvatar}
                    </div>
                    <div>
                      <h3>{activeConversation.sellerName}</h3>
                      <span className="msgpage_chat_status">
                        <span className="msgpage_online_dot"></span>
                        {t('online')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="msgpage_chat_messages" ref={chatContainerRef}>
                  {activeConversation.messages.map(m => (
                    <div className={`msgpage_msg ${m.from === 'user' ? 'user' : 'seller'}`} key={m.id}>
                      {m.from === 'seller' && (
                        <div className="msgpage_msg_avatar" style={{ background: activeConversation.sellerColor }}>
                          {activeConversation.sellerAvatar}
                        </div>
                      )}
                      <div className="msgpage_msg_bubble">
                        <p>{m.text}</p>
                        <span className="msgpage_msg_time">{m.time}</span>
                      </div>
                      {m.from === 'user' && (
                        <div className="msgpage_msg_avatar user">{user?.avatar || 'U'}</div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEnd} />
                </div>

                <div className="msgpage_chat_input">
                  <input
                    type="text"
                    placeholder={t('chatPlaceholder')}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKey}
                  />
                  <button onClick={handleSend} disabled={!input.trim()}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13"/>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MessagesPage
