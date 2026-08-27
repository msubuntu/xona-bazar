import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useMessages } from '../context/MessagesContext.jsx'
import { useFavorites } from '../context/FavoritesContext.jsx'
import LoginPrompt from './LoginPrompt.jsx'
import '../components_css/bottomnav.css'

function BottomNav() {
  const { totalItems } = useCart()
  const { user } = useAuth()
  const { totalUnread } = useMessages()
  const { totalFavorites } = useFavorites()
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  const handleMessagesClick = (e) => {
    if (!user) {
      e.preventDefault()
      setShowLoginPrompt(true)
    }
  }

  const activeClass = ({ isActive }) => `bn_item${isActive ? ' active' : ''}`

  return (
    <>
      <nav className="bottom_nav">
        <NavLink to="/craftsmen" className={activeClass}>
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
          <span>Ustalar</span>
        </NavLink>

        <NavLink to="/stores-map" className={activeClass}>
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <span>Xarita</span>
        </NavLink>

        <NavLink to="/cart" className={activeClass}>
          <div className="bn_icon_wrap">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/>
              <circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            {totalItems > 0 && <span className="bn_badge">{totalItems}</span>}
          </div>
          <span>Savat</span>
        </NavLink>

        <NavLink
          to="/user?section=favorites"
          className={activeClass}
          onClick={(e) => {
            if (!user) {
              e.preventDefault()
              setShowLoginPrompt(true)
            }
          }}
        >
          <div className="bn_icon_wrap">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
            {totalFavorites > 0 && <span className="bn_badge">{totalFavorites}</span>}
          </div>
          <span>Sevimli</span>
        </NavLink>

        <NavLink
          to="/messages"
          className={activeClass}
          onClick={handleMessagesClick}
        >
          <div className="bn_icon_wrap">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {totalUnread > 0 && <span className="bn_badge">{totalUnread}</span>}
          </div>
          <span>Xabarlar</span>
        </NavLink>
      </nav>

      {showLoginPrompt && <LoginPrompt onClose={() => setShowLoginPrompt(false)} />}
    </>
  )
}

export default BottomNav
