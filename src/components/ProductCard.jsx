import { useState } from 'react'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useFavorites } from '../context/FavoritesContext.jsx'
import LoginPrompt from './LoginPrompt'
import '../components_css/productcard.css'

export default function ProductCard({ product }) {
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const { addItem, openProduct } = useCart()
  const { user } = useAuth()
  const { t, convertPrice } = useSettings()
  const { toggleFavorite, isFavorite } = useFavorites()

  const pid = product._id || product.id
  const liked = isFavorite(pid)
  const discount = product.oldPrice
    ? Math.round((1 - product.price / product.oldPrice) * 100)
    : 0

  const handleAddToCart = (e) => {
    e.stopPropagation()
    if (!user) { setShowLoginPrompt(true); return }
    addItem(product)
  }

  const handleLike = (e) => {
    e.stopPropagation()
    if (!user) { setShowLoginPrompt(true); return }
    toggleFavorite(product)
  }

  return (
    <>
      <div className="pc_card" onClick={() => openProduct(product)}>
        <div className="pc_img">
          <img src={product.image || '/placeholder.png'} alt={product.name} />

          {discount > 0 && (
            <span className="pc_discount">-{discount}%</span>
          )}

          <button
            className={`pc_like ${liked ? 'liked' : ''}`}
            onClick={handleLike}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>

          <button
            className="pc_cart_hover"
            onClick={handleAddToCart}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            {t('addToCart')}
          </button>

          <button
            className="pc_cart_mobile"
            onClick={handleAddToCart}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>

        <div className="pc_info">
          <span className="pc_brand">{product.brand}</span>
          <h3 className="pc_name">{product.name}</h3>
          <div className="pc_rating">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="1">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <strong>{product.rating}</strong>
            <span>({Array.isArray(product.reviews) ? product.reviews.length : product.reviews || 0})</span>
          </div>
          <div className="pc_prices">
            <span className="pc_price">{convertPrice(product.price)}</span>
            {product.oldPrice && (
              <span className="pc_oldprice">{convertPrice(product.oldPrice)}</span>
            )}
          </div>
        </div>
      </div>
      {showLoginPrompt && <LoginPrompt onClose={() => setShowLoginPrompt(false)} />}
    </>
  )
}
