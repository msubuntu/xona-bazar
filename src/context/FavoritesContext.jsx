import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const FavoritesContext = createContext()

const STORAGE_KEY = 'xona-favorites'

function loadFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState(loadFavorites)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
  }, [favorites])

  const toggleFavorite = useCallback((product) => {
    const pid = product._id || product.id
    setFavorites(prev => {
      const exists = prev.find(p => (p._id || p.id) === pid)
      if (exists) return prev.filter(p => (p._id || p.id) !== pid)
      return [...prev, { ...product, addedAt: Date.now() }]
    })
  }, [])

  const isFavorite = useCallback((id) => {
    return favorites.some(p => (p._id || p.id) === id)
  }, [favorites])

  const totalFavorites = favorites.length

  return (
    <FavoritesContext.Provider value={{
      favorites, toggleFavorite, isFavorite, totalFavorites
    }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  return useContext(FavoritesContext)
}
