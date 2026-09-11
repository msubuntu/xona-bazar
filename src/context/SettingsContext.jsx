import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import { useAuth } from './AuthContext.jsx'
import { api, getToken } from '../services/api'
import translations from '../data/translations.js'

const SettingsContext = createContext()

const STORAGE_KEY = 'xona-settings'

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

const DEFAULTS = {
  lang: 'uz',
  currency: 'uzs',
  notifEmail: true,
  notifSms: true,
  notifPromo: false,
  twoFactor: false,
}

const RATES = { uzs: 1, usd: 0.000078, eur: 0.000072 }

export function SettingsProvider({ children }) {
  const saved = loadSettings()
  const [settings, setSettings] = useState({ ...DEFAULTS, ...saved })
  const { user } = useAuth()

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  // Serverdan sozlamalarni yuklash (kirish o'zgarganda)
  useEffect(() => {
    if (!getToken()) return
    let active = true
    api.auth.me()
      .then(({ user: u }) => {
        if (!active || !u) return
        setSettings(s => ({
          ...s,
          notifEmail: typeof u.notifEmail === 'boolean' ? u.notifEmail : s.notifEmail,
          notifSms: typeof u.notifSms === 'boolean' ? u.notifSms : s.notifSms,
          notifPromo: typeof u.notifPromo === 'boolean' ? u.notifPromo : s.notifPromo,
          twoFactor: typeof u.twoFactor === 'boolean' ? u.twoFactor : s.twoFactor,
        }))
      })
      .catch(() => {})
    return () => { active = false }
  }, [user?._id])

  // Optimistik yangilash + serverga saqlash, muvaffaqiyatsiz bo'lsa qaytarish
  const makeNotifSetter = useCallback((key) => (v) => {
    setSettings(prev => {
      const before = prev[key]
      if (getToken()) {
        api.auth.notifications({ [key]: v })
          .catch(() => setSettings(s => ({ ...s, [key]: before })))
      }
      return { ...prev, [key]: v }
    })
  }, [])

  const setNotifEmail = makeNotifSetter('notifEmail')
  const setNotifSms = makeNotifSetter('notifSms')
  const setNotifPromo = makeNotifSetter('notifPromo')

  const setLang = useCallback((lang) => {
    setSettings(s => ({ ...s, lang }))
  }, [])

  const setCurrency = useCallback((currency) => {
    setSettings(s => ({ ...s, currency }))
  }, [])

  const setTwoFactor = useCallback((v) => {
    setSettings(prev => {
      const before = prev.twoFactor
      if (getToken()) {
        api.auth.notifications({ twoFactor: v })
          .catch(() => setSettings(s => ({ ...s, twoFactor: before })))
      }
      return { ...prev, twoFactor: v }
    })
  }, [])

  const convertPrice = useCallback((priceUzs) => {
    const rate = RATES[settings.currency] || 1
    const converted = Math.round(priceUzs * rate)
    const symbols = { uzs: "so'm", usd: '$', eur: '€' }
    return `${converted.toLocaleString()} ${symbols[settings.currency]}`
  }, [settings.currency])

  const t = useCallback((key) => {
    return translations[settings.lang]?.[key] || translations['uz']?.[key] || key
  }, [settings.lang])

  const value = useMemo(() => ({
    ...settings,
    setLang, setCurrency,
    setNotifEmail, setNotifSms, setNotifPromo,
    setTwoFactor, convertPrice, t, RATES,
  }), [settings, setLang, setCurrency, setNotifEmail, setNotifSms, setNotifPromo, setTwoFactor, convertPrice, t])

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}