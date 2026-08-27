import { createContext, useContext, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const SellerContext = createContext()

export function SellerProvider({ children }) {
  const navigate = useNavigate()
  const [selectedSeller, setSelectedSeller] = useState(null)
  const [selectedCraftsman, setSelectedCraftsman] = useState(null)
  const [chatSeller, setChatSeller] = useState(null)
  const [showChat, setShowChat] = useState(false)

  const openSeller = useCallback((seller) => {
    setSelectedSeller(seller)
    const id = seller._id || seller.id
    navigate(`/seller/${id}`)
    window.scrollTo(0, 0)
  }, [navigate])

  const openCraftsman = useCallback((craftsman) => {
    setSelectedCraftsman(craftsman)
    const id = craftsman._id || craftsman.id
    navigate(`/craftsman/${id}`)
    window.scrollTo(0, 0)
  }, [navigate])

  const openChat = useCallback((seller) => {
    setChatSeller(seller)
    setShowChat(true)
  }, [])

  const closeChat = useCallback(() => {
    setShowChat(false)
    setChatSeller(null)
  }, [])

  return (
    <SellerContext.Provider value={{
      selectedSeller, setSelectedSeller,
      selectedCraftsman, setSelectedCraftsman,
      openCraftsman,
      chatSeller, showChat,
      openSeller, openChat, closeChat
    }}>
      {children}
    </SellerContext.Provider>
  )
}

export function useSeller() {
  return useContext(SellerContext)
}
