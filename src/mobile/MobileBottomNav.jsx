import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useMessages } from '../context/MessagesContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { isPanelRole, panelDashboard } from '../components/RoleRedirect.jsx'

export default function MobileBottomNav() {
  const { totalItems } = useCart()
  const { user, openLogin } = useAuth()
  const { totalUnread } = useMessages()
  const { t } = useSettings()
  const navigate = useNavigate()
  const panelUser = isPanelRole(user)
  const panelDash = panelDashboard(user)

  const activeCls = ({ isActive }) => `mob_nav_item${isActive ? ' mob_nav_item_active' : ''}`

  const handleMessages = (e) => {
    if (!user) { e.preventDefault(); openLogin(); return }
    navigate('/messages')
  }

  return (
    <nav className="mob_bottomnav">
      {panelUser && (
        <>
          <NavLink to={panelDash} className={activeCls}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
            {user.role === 'craftsman' ? 'Usta paneli' : 'Sotuvchi paneli'}
          </NavLink>
          <NavLink to="/messages" onClick={handleMessages} className={activeCls}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {t("messages")}
            {user && totalUnread > 0 && <span className="mob_nav_badge">{totalUnread}</span>}
          </NavLink>
        </>
      )}

      {!panelUser && (
      <>
      <NavLink to="/" end className={activeCls}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        {t("navHome")}
      </NavLink>

      <NavLink to="/craftsmen" className={activeCls}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        {t("craftsmen")}
      </NavLink>

      <NavLink to="/stores-map" className={activeCls}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
        </svg>
        {t("navMap")}
      </NavLink>

      <NavLink to="/cart" className={activeCls}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
        {t("cart")}
        {totalItems > 0 && <span className="mob_nav_badge">{totalItems}</span>}
      </NavLink>

      <NavLink to="/messages" onClick={handleMessages} className={activeCls}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        {t("messages")}
        {user && totalUnread > 0 && <span className="mob_nav_badge">{totalUnread}</span>}
      </NavLink>
      </>
      )}
    </nav>
  )
}