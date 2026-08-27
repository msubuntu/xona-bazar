import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  const setLang = useCallback((lang) => {
    setSettings(s => ({ ...s, lang }))
  }, [])

  const setCurrency = useCallback((currency) => {
    setSettings(s => ({ ...s, currency }))
  }, [])

  const setNotifEmail = useCallback((v) => {
    setSettings(s => ({ ...s, notifEmail: v }))
  }, [])

  const setNotifSms = useCallback((v) => {
    setSettings(s => ({ ...s, notifSms: v }))
  }, [])

  const setNotifPromo = useCallback((v) => {
    setSettings(s => ({ ...s, notifPromo: v }))
  }, [])

  const setTwoFactor = useCallback((v) => {
    setSettings(s => ({ ...s, twoFactor: v }))
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
