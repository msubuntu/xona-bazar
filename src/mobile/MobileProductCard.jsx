import React, { useState } from 'react'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useFavorites } from '../context/FavoritesContext.jsx'
import { REVIEWS_ENABLED } from '../data/flags'
import { openLoginSheet } from './MobileAuthSheet.jsx'

export default function MobileProductCard({ product }) {
  const { addItem, openProduct } = useCart()
  const { user } = useAuth()
  const { convertPrice } = useSettings()
  const { toggleFavorite, isFavorite } = useFavorites()

  const pid = product._id || product.id
  const liked = isFavorite(pid)
  const discount = product.oldPrice
    ? Math.round((1 - product.price / product.oldPrice) * 100)
    : 0

  const handleAdd = (e) => {
    e.stopPropagation()
    if (!user) { openLoginSheet(); return }
    addItem(product)
  }

  const handleLike = (e) => {
    e.stopPropagation()
    if (!user) { openLoginSheet(); return }
    toggleFavorite(product)
  }

  const svg = (p) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  )

  return (
    <div className="mob_card" onClick={() => openProduct(product)}>
      <div className="mob_card_img">
        <img src={product.image || '/placeholder.png'} alt={product.name} loading="lazy" />
        {discount > 0 && <span className="mob_card_discount">-{discount}%</span>}
        <button className={`mob_card_like${liked ? ' liked' : ''}`} onClick={handleLike} aria-label="Saqlash">
          {svg({ fill: liked ? 'currentColor' : 'none' })}
        </button>
        <button className="mob_card_add" onClick={handleAdd} aria-label="Savatga">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>
      <div className="mob_card_body">
        <div className="mob_card_name">{product.name}</div>
        {REVIEWS_ENABLED && (
        <div className="mob_card_rating">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          <span>{product.rating || 0}</span>
          <span style={{ color: 'var(--mob-muted)', marginLeft: '2px' }}>
            ({Array.isArray(product.reviews) ? product.reviews.length : product.reviews || 0})
          </span>
        </div>
        )}
        <div>
          <span className="mob_card_price">{convertPrice(product.price)}</span>
          {product.oldPrice && <span className="mob_card_oldprice">{convertPrice(product.oldPrice)}</span>}
        </div>
      </div>
    </div>
  )
}