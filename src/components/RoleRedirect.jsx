import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const PANEL_ONLY = ['seller', 'craftsman']
const ALLOWED_PATHS = ['/messages', '/location-picker']

function dashboardFor(role) {
  return role === 'seller' ? '/seller-dashboard' : '/craftsman-dashboard'
}

export function isPanelRole(user) {
  return user && PANEL_ONLY.includes(user.role)
}

export function panelDashboard(user) {
  return isPanelRole(user) ? dashboardFor(user.role) : '/'
}

function RoleRedirect() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!isPanelRole(user)) return
    const dashboard = dashboardFor(user.role)
    if (location.pathname === dashboard || ALLOWED_PATHS.includes(location.pathname)) return
    navigate(dashboard, { replace: true })
  }, [user, location.pathname, navigate])

  return null
}

export default RoleRedirect