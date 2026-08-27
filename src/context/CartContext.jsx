import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'

const CartContext = createContext()

export function CartProvider({ children }) {
  const navigate = useNavigate()
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('xona-cart')) || [] } catch { return [] }
  })
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [orders, setOrders] = useState([])
  const [orderLoading, setOrderLoading] = useState(false)

  useEffect(() => {
    localStorage.setItem('xona-cart', JSON.stringify(items))
  }, [items])

  const addItem = useCallback((product, variant) => {
    const pid = product._id || product.id
    const v = variant && variant._id ? variant : null
    const key = v ? `${pid}__${v._id}` : pid
    setItems(prev => {
      const getKey = (i) => i.cartKey || i._id || i.id
      const exists = prev.find(i => getKey(i) === key)
      if (exists) {
        return prev.map(i => getKey(i) === key ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, {
        ...product,
        cartKey: key,
        price: v ? Number(v.price) : Number(product.price),
        oldPrice: v ? (v.oldPrice ? Number(v.oldPrice) : undefined) : product.oldPrice,
        image: v && v.image ? v.image : product.image,
        variant: v ? { _id: v._id, color: v.color, colorHex: v.colorHex, size: v.size, price: v.price, sku: v.sku } : null,
        qty: 1,
      }]
    })
  }, [])

  const removeItem = useCallback((id) => {
    setItems(prev => prev.filter(i => (i.cartKey || i._id || i.id) !== id))
  }, [])

  const updateQty = useCallback((id, qty) => {
    if (qty <= 0) {
      setItems(prev => prev.filter(i => (i.cartKey || i._id || i.id) !== id))
      return
    }
    setItems(prev => prev.map(i => (i.cartKey || i._id || i.id) === id ? { ...i, qty } : i))
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const createOrder = useCallback(async (address, phone, note) => {
    setOrderLoading(true)
    try {
      const orderItems = items.map(i => ({
        productId: i._id || i.id,
        variantId: i.variant?._id,
        qty: i.qty,
      }))
      const { order } = await api.orders.create({ items: orderItems, address, phone, note })
      setItems([])
      setOrders(prev => [order, ...prev])
      return order
    } finally {
      setOrderLoading(false)
    }
  }, [items])

  const loadOrders = useCallback(async () => {
    try {
      const { orders: list } = await api.orders.list()
      setOrders(list)
    } catch (err) {
      console.error('Load orders error:', err)
    }
  }, [])

  const openProduct = useCallback((product) => {
    setSelectedProduct(product)
    const id = product._id || product.id
    navigate(`/product/${id}`)
    window.scrollTo(0, 0)
  }, [navigate])

  const goHome = useCallback(() => {
    setSelectedProduct(null)
    navigate('/')
  }, [navigate])

  const goCart = useCallback(() => {
    setSelectedProduct(null)
    navigate('/cart')
  }, [navigate])

  const goCraftsmen = useCallback(() => {
    setSelectedProduct(null)
    navigate('/craftsmen')
    window.scrollTo(0, 0)
  }, [navigate])

  const goMessages = useCallback(() => {
    setSelectedProduct(null)
    navigate('/messages')
    window.scrollTo(0, 0)
  }, [navigate])

  const goMap = useCallback(() => {
    setSelectedProduct(null)
    navigate('/stores-map')
    window.scrollTo(0, 0)
  }, [navigate])

  const totalItems = items.reduce((sum, i) => sum + i.qty, 0)
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.qty, 0)

  return (
    <CartContext.Provider value={{
      items, selectedProduct, setSelectedProduct,
      addItem, removeItem, updateQty, clearCart,
      openProduct, goHome, goCart, goCraftsmen, goMessages, goMap,
      totalItems, totalPrice,
      orders, orderLoading, createOrder, loadOrders,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
