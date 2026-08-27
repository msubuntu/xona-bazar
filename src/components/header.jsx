import React, { useState, useRef, useEffect, useMemo } from "react"
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useMessages } from '../context/MessagesContext.jsx'
import { useFavorites } from '../context/FavoritesContext.jsx'
import { useSeller } from '../context/SellerContext.jsx'
import '../components_css/header.css'

const SEARCH_SUGGESTIONS = [
  "Bo'yoq lateks 10L",
  "Plitka granit 60x60",
  "Bosch perforator",
  "Vanna kranlari",
  "Rozetka + uzilgich",
  "Laminat pol 8mm",
  "Ishchi eshik oq",
  "Penoplast izolyatsiya",
  "Sement 50 kg",
  "Armatura 12mm",
  "LED lampalar",
  "Kanizatsiya trubasi",
  "Mikser kran",
  "Quruq qorishma",
  "Shpaklyovka",
  "Gipsokarton",
]

function Header() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { totalItems } = useCart()
    const { user, openLogin, logout } = useAuth()
    const { t } = useSettings()
    const { totalUnread } = useMessages()
    const { totalFavorites } = useFavorites()
    const { setSelectedCraftsman, setSelectedSeller } = useSeller()
    const [showDropdown, setShowDropdown] = useState(false)
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [selectedIdx, setSelectedIdx] = useState(-1)
    const [inputValue, setInputValue] = useState(searchParams.get('q') || '')
    const menuRef = useRef(null)
    const searchRef = useRef(null)
    const inputRef = useRef(null)

    useEffect(() => {
      setInputValue(searchParams.get('q') || '')
    }, [searchParams])

    const suggestions = useMemo(() => {
        if (!inputValue || inputValue.length < 1) return []
        const q = inputValue.toLowerCase()
        return SEARCH_SUGGESTIONS
            .filter(s => s.toLowerCase().includes(q))
            .slice(0, 7)
    }, [inputValue])

    useEffect(() => {
        if (!showDropdown) return
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowDropdown(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [showDropdown])

    useEffect(() => {
        const handler = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setShowSuggestions(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const goTo = (section) => {
        setSelectedSeller(null)
        setSelectedCraftsman(null)
        navigate(`/user?section=${section}`)
        setShowDropdown(false)
        window.scrollTo(0, 0)
    }

    const executeSearch = (query) => {
        const q = (query || '').trim()
        setShowSuggestions(false)
        setSelectedIdx(-1)
        if (q) {
            navigate(`/?q=${encodeURIComponent(q)}`)
        } else {
            navigate('/')
        }
    }

    const handleSearchChange = (e) => {
        const val = e.target.value
        setInputValue(val)
        setShowSuggestions(val.length > 0)
        setSelectedIdx(-1)
    }

    const handleSearchClear = () => {
        setInputValue('')
        setShowSuggestions(false)
        setSelectedIdx(-1)
        navigate('/')
        setTimeout(() => inputRef.current?.focus(), 50)
    }

    const selectSuggestion = (text) => {
        setInputValue(text)
        setShowSuggestions(false)
        setSelectedIdx(-1)
        executeSearch(text)
    }

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            if (showSuggestions && selectedIdx >= 0 && suggestions[selectedIdx]) {
                selectSuggestion(suggestions[selectedIdx])
            } else {
                executeSearch(inputValue)
            }
            inputRef.current?.blur()
            return
        }

        if (!showSuggestions || suggestions.length === 0) return

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIdx(p => p < suggestions.length - 1 ? p + 1 : 0)
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIdx(p => p > 0 ? p - 1 : suggestions.length - 1)
        } else if (e.key === 'Escape') {
            setShowSuggestions(false)
        }
    }

    const highlightMatch = (text, query) => {
        if (!query) return text
        const idx = text.toLowerCase().indexOf(query.toLowerCase())
        if (idx === -1) return text
        return (
            <>
                {text.slice(0, idx)}
                <strong>{text.slice(idx, idx + query.length)}</strong>
                {text.slice(idx + query.length)}
            </>
        )
    }

    return (
    <>
        <header>
            <div className="logo" onClick={() => { setSelectedCraftsman(null); setSelectedSeller(null); navigate('/') }} style={{ cursor: 'pointer' }}>
                <span>Xona</span><p>Bazar</p>
            </div>
            <div className="search" ref={searchRef}>
                <input
                    ref={inputRef}
                    type="text"
                    placeholder={t('search')}
                    value={inputValue}
                    onChange={handleSearchChange}
                    onFocus={() => inputValue && setShowSuggestions(true)}
                    onKeyDown={handleSearchKeyDown}
                    autoComplete="off"
                />
                {inputValue ? (
                    <button className="search_btn search_clear" onClick={handleSearchClear}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                ) : (
                    <button className="search_btn" onClick={() => executeSearch(inputValue)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                    </button>
                )}

                {showSuggestions && suggestions.length > 0 && (
                    <div className="search_suggestions">
                        {suggestions.map((s, i) => (
                            <button
                                key={i}
                                className={`search_suggestion ${i === selectedIdx ? 'selected' : ''}`}
                                onClick={() => selectSuggestion(s)}
                                onMouseEnter={() => setSelectedIdx(i)}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                                </svg>
                                <span>{highlightMatch(s, inputValue)}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <div className="login">
                <button className="cart_btn ustalar_nav" onClick={() => { setSelectedCraftsman(null); setSelectedSeller(null); navigate('/craftsmen') }} title={t('craftsmen')}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                    </svg>
                </button>
                <button className="cart_btn ustalar_nav" onClick={() => { setSelectedCraftsman(null); setSelectedSeller(null); navigate('/stores-map') }} title={t('storeOnMap')}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                </button>
                <button className="cart_btn header-cart" onClick={() => { setSelectedSeller(null); setSelectedCraftsman(null); navigate('/cart') }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="9" cy="21" r="1"/>
                        <circle cx="20" cy="21" r="1"/>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                    </svg>
                    {totalItems > 0 && <span className="cart_badge">{totalItems}</span>}
                </button>

                {user && (
                    <>
                        <button className="cart_btn header-favorites" title={t('myFavorites')} onClick={() => goTo('favorites')}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                            </svg>
                            {totalFavorites > 0 && <span className="cart_badge">{totalFavorites}</span>}
                        </button>
                        <button className="cart_btn header-messages" title={t('messages')} onClick={() => { setSelectedSeller(null); setSelectedCraftsman(null); navigate('/messages') }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                            {totalUnread > 0 && <span className="cart_badge">{totalUnread}</span>}
                        </button>
                    </>
                )}

                {user ? (
                    <div className="user_menu" ref={menuRef}>
                        <button className="user_avatar" onClick={() => setShowDropdown(!showDropdown)}>
                            {user.avatar}
                        </button>
                        {showDropdown && (
                            <div className="user_dropdown">
                                <div className="user_dropdown_header">
                                    <div className="user_dropdown_avatar">{user.avatar}</div>
                                    <div>
                                        <strong>{user.name}</strong>
                                        <span>{user.email}</span>
                                    </div>
                                </div>
                                <div className="user_dropdown_divider"></div>
                                <button className="user_dropdown_item" onClick={() => goTo('profile')}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                                    </svg>
                                    {t('profile')}
                                </button>
                                <button className="user_dropdown_item" onClick={() => goTo('orders')}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                                    </svg>
                                    {t('myOrders')}
                                </button>
                                <button className="user_dropdown_item" onClick={() => goTo('favorites')}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                                    </svg>
                                    {t('myFavorites')}
                                </button>
                                <button className="user_dropdown_item" onClick={() => { setSelectedSeller(null); setSelectedCraftsman(null); navigate('/messages'); setShowDropdown(false); window.scrollTo(0, 0) }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                    </svg>
                                    {t('messages')}
                                </button>
                                {(user?.role === 'seller' || user?.role === 'craftsman') && (
                                <button className="user_dropdown_item" onClick={() => { setSelectedSeller(null); setSelectedCraftsman(null); navigate(user?.role === 'craftsman' ? '/craftsman-dashboard' : '/seller-dashboard'); setShowDropdown(false); window.scrollTo(0, 0) }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                                    </svg>
                                    {user?.role === 'craftsman' ? 'Usta paneli' : t('sellerDashboard')}
                                </button>
                                )}
                                <button className="user_dropdown_item" onClick={() => goTo('settings')}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
                                    </svg>
                                    {t('settings')}
                                </button>
                                <div className="user_dropdown_divider"></div>
                                <button className="user_dropdown_item logout" onClick={() => { setShowLogoutConfirm(true); setShowDropdown(false) }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                                    </svg>
                                    {t('logout')}
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <button className="login_btn" onClick={openLogin}>{t('login')}</button>
                    </>
                )}
            </div>
        </header>
        {showLogoutConfirm && (
          <div className="logout_confirm_overlay" onClick={() => setShowLogoutConfirm(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:9000,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div onClick={e => e.stopPropagation()} style={{background:'var(--bg-card,#fff)',borderRadius:16,padding:'28px 24px',maxWidth:360,width:'90%',boxShadow:'0 20px 60px rgba(0,0,0,0.2)',textAlign:'center'}}>
              <div style={{width:48,height:48,borderRadius:'50%',background:'#fef2f2',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </div>
              <h3 style={{margin:'0 0 8px',fontSize:17,fontWeight:700,color:'var(--text,#1a1a2e)'}}>{t('logout')}?</h3>
              <p style={{margin:'0 0 20px',fontSize:14,color:'var(--text-muted,#9ca3af)'}}>{t('logoutConfirm') || 'Tizimdan chiqishni xohlaysizmi?'}</p>
              <div style={{display:'flex',gap:10}}>
                <button onClick={() => setShowLogoutConfirm(false)} style={{flex:1,padding:'10px 0',border:'1.5px solid var(--border,#e5e7eb)',borderRadius:10,background:'var(--bg-card,#fff)',color:'var(--text,#1a1a2e)',fontSize:14,fontWeight:600,cursor:'pointer'}}>{t('cancel')}</button>
                <button onClick={() => { logout(); setShowLogoutConfirm(false); setSelectedSeller(null); setSelectedCraftsman(null); navigate('/') }} style={{flex:1,padding:'10px 0',border:'none',borderRadius:10,background:'linear-gradient(135deg,#ef4444,#dc2626)',color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer'}}>{t('logout')}</button>
              </div>
            </div>
          </div>
        )}
    </>
    )
}

export default Header;
