import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('xona-theme')
    return saved ? saved === 'dark' : false
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    document.body.style.background = dark ? '#111827' : '#ffffff'
    document.body.style.color = dark ? '#f3f4f6' : '#1a1a2e'
    localStorage.setItem('xona-theme', dark ? 'dark' : 'light')
  }, [dark])

  const toggleTheme = useCallback(() => setDark(p => !p), [])

  return (
    <ThemeContext.Provider value={{ dark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
