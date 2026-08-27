import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { api, setToken } from '../services/api'
import { connectSocket, disconnectSocket } from '../services/socket'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('xona-user')) || null } catch { return null }
  })
  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (user) {
      localStorage.setItem('xona-user', JSON.stringify(user))
      connectSocket(user._id)
    } else {
      localStorage.removeItem('xona-user')
      disconnectSocket()
    }
  }, [user])

  const login = useCallback(async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      const { user, token } = await api.auth.login(email, password)
      setToken(token)
      setUser(user)
      setShowAuth(false)
      return user
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (data) => {
    setLoading(true)
    setError(null)
    try {
      const { user, token } = await api.auth.register(data)
      setToken(token)
      setUser(user)
      setShowAuth(false)
      return user
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    disconnectSocket()
  }, [])

  const updateProfile = useCallback(async (updates) => {
    setLoading(true)
    setError(null)
    try {
      const { user } = await api.auth.updateProfile(updates)
      setUser(user)
      return user
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const openLogin = useCallback(() => {
    setAuthMode('login')
    setError(null)
    setShowAuth(true)
  }, [])

  const openRegister = useCallback(() => {
    setAuthMode('register')
    setError(null)
    setShowAuth(true)
  }, [])

  const switchMode = useCallback(() => {
    setAuthMode(prev => prev === 'login' ? 'register' : 'login')
    setError(null)
  }, [])

  useEffect(() => {
    if (showAuth) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [showAuth])

  return (
    <AuthContext.Provider value={{
      user, showAuth, authMode, loading, error,
      login, register, logout, updateProfile,
      openLogin, openRegister, switchMode,
      setShowAuth, setError
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
