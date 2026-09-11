import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useSeller } from '../context/SellerContext.jsx'
import { useFavorites } from '../context/FavoritesContext.jsx'
import { api } from '../services/api'
import { openLoginSheet } from './MobileAuthSheet.jsx'
import MobileHeader from './MobileHeader.jsx'
import MobileProductCard from './MobileProductCard.jsx'
import { REVIEWS_ENABLED } from '../data/flags'

export default function MobileProductDetail() {
  const navigate = useNavigate()
  const { selectedProduct, addItem } = useCart()
  const { user } = useAuth()
  const { id } = useParams()
  const { t, convertPrice } = useSettings()
  const { openSeller, openChat } = useSeller()
  const { isFavorite, toggleFavorite } = useFavorites()

  const [apiProduct, setApiProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)
  const [selectedVariantId, setSelectedVariantId] = useState(null)
  const [activeTab, setActiveTab] = useState('desc')
  const [activeMedia, setActiveMedia] = useState(0)
  const [similar, setSimilar] = useState([])
  const [added, setAdded] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewDone, setReviewDone] = useState(false)
  const [reviewError, setReviewError] = useState(null)
  const swipeRef = useRef({ x: 0, y: 0 })

  const loadProduct = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await api.products.get(id)
      const p = data.product
      setApiProduct(p)
      if (p.category) {
        const sim = await api.products.list({ category: p.category, limit: 10 })
        setSimilar(sim.products.filter(sp => sp._id !== p._id))
      }
    } catch (err) { console.error('Load product error:', err) }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { loadProduct() }, [loadProduct])

  useEffect(() => {
    const raw = apiProduct || selectedProduct
    const vs = Array.isArray(raw?.variants) ? raw.variants : []
    setSelectedVariantId(vs.length > 0 ? vs[0]._id : null)
    setQty(1)
    setActiveMedia(0)
  }, [id, apiProduct, selectedProduct])

  const raw = apiProduct || selectedProduct
  if (loading && !raw) {
    return <div className="mob"><MobileHeader /><div className="mob_loader"><div className="mob_spinner" /></div></div>
  }
  if (!raw) return <div className="mob" onClick={() => navigate('/')}>Mahsulot topilmadi</div>

  const pid = raw._id || raw.id
  const p = {
    ...raw,
    id: pid,
    image: raw.image || (raw.images && raw.images[0]) || '',
    reviews: Array.isArray(raw.reviews) ? raw.reviews : [],
  }

  const variants = Array.isArray(p.variants) ? p.variants : []
  const selectedVariant = variants.find(v => v._id === selectedVariantId) || null
  const displayPrice = selectedVariant ? Number(selectedVariant.price) : Number(p.price)
  const displayOldPrice = selectedVariant && selectedVariant.oldPrice ? Number(selectedVariant.oldPrice) : p.oldPrice
  const displayImages = (() => {
    if (selectedVariant) {
      const vi = (selectedVariant.images || []).filter(Boolean)
      return vi.length > 0 ? vi : (selectedVariant.image ? [selectedVariant.image] : [])
    }
    const main = (p.images && p.images.length > 0) ? p.images.filter(Boolean) : []
    return main.length > 0 ? main : (p.image ? [p.image] : [])
  })()
  const displayVideo = p.video || ''
  const media = displayVideo ? [...displayImages, '__VIDEO__'] : displayImages
  const activeSrc = media[activeMedia]
  const discount = displayOldPrice ? Math.round((1 - displayPrice / displayOldPrice) * 100) : 0

  const handleTouchStart = (e) => {
    swipeRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const handleTouchEnd = (e) => {
    if (media.length <= 1) return
    const dx = e.changedTouches[0].clientX - swipeRef.current.x
    const dy = e.changedTouches[0].clientY - swipeRef.current.y
    // Gorizontal swipe: kamida 40px, va vertikal harakatdan ustun bo'lishi kerak
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return
    if (dx < 0) setActiveMedia((prev) => Math.min(media.length - 1, prev + 1))   // chapga → keyingi
    else setActiveMedia((prev) => Math.max(0, prev - 1))                          // o'ngga → oldingi
  }
  const liked = isFavorite(pid)
  const seller = p.sellerId && typeof p.sellerId === 'object' ? p.sellerId : null
  const similarNormalized = similar.map(sp => ({
    ...sp,
    id: sp._id,
    image: sp.image || (sp.images && sp.images[0]) || '',
    reviews: Array.isArray(sp.reviews) ? sp.reviews : [],
  }))

  const handleAdd = () => {
    if (!user) { openLoginSheet(); return }
    for (let i = 0; i < qty; i++) addItem(p, selectedVariant || undefined)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const handleChat = () => {
    if (!user) { openLoginSheet(); return }
    openChat(seller)
  }

  const handleMap = () => {
    if (!seller) return
    navigate('/stores-map', { state: { focusSellerId: seller._id, focusSeller: seller } })
  }

  const submitReview = async (e) => {
    e.preventDefault()
    if (reviewRating === 0 || !pid) return
    setReviewSubmitting(true)
    setReviewError(null)
    try {
      const { product } = await api.products.review(pid, { rating: reviewRating, text: reviewText })
      setReviewDone(true)
      setApiProduct(prev => prev ? { ...prev, reviews: product.reviews } : prev)
    } catch (err) {
      setReviewError(err.message || 'Sharh yuborishda xatolik')
    } finally {
      setReviewSubmitting(false)
    }
  }

  const features = [
    { icon: '🏠', label: t('pickupFree') || "Olib ketish bepul", desc: 'Do\'kondan olib ketish' },
    { icon: '🔄', label: t('return7') || '7 kun qaytarish', desc: '7 kun ichida qaytarish' },
    { icon: '🛡️', label: t('warranty') || '1 yil kafolat', desc: 'Rasmiy kafolat' },
    { icon: '💬', label: t('consultation') || 'Bepul maslahat', desc: 'Bepul maslahat' },
  ]

  const reviewLabel = reviewRating === 5 ? 'Ajoyib' : reviewRating === 4 ? 'Yaxshi' : reviewRating === 3 ? "O'rtacha" : reviewRating === 2 ? 'Yomon' : reviewRating === 1 ? 'Juda yomon' : ''

  return (
    <div className="mob mob_detail">
      <MobileHeader />

      <div className="mob_page_head">
        <button className="mob_back" onClick={() => navigate(-1)} aria-label="Orqaga">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div className="mob_page_title"></div>
        <button style={{ marginLeft: 'auto' }} onClick={() => { if (!user) return openLoginSheet(); toggleFavorite(p) }} aria-label="Saqlash">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            fill={liked ? 'currentColor' : 'none'} style={liked ? { color: 'var(--mob-pink)' } : {}}>
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>

      <div
        className="mob_carousel"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {activeSrc === '__VIDEO__' ? (
          <video key={activeMedia} src={displayVideo} controls className="mob_carousel_video" />
        ) : (
          <img key={activeMedia} src={activeSrc || '/placeholder.png'} alt={p.name} />
        )}
        {discount > 0 && <span className="mob_card_discount">-{discount}%</span>}
        {media.length > 1 && (
          <div className="mob_carousel_dots">
            {media.map((_, i) => (
              <span key={i} className={`mob_carousel_dot${i === activeMedia ? ' mob_carousel_dot_active' : ''}`} />
            ))}
          </div>
        )}
      </div>

      {media.length > 1 && (
        <div className="mob_detail_thumbs">
          {media.map((m, i) => (
            <button
              key={i}
              className={`mob_thumb${i === activeMedia ? ' mob_thumb_active' : ''}`}
              onClick={() => setActiveMedia(i)}
            >
              {m === '__VIDEO__' ? (
                <>
                  <video src={displayVideo} muted />
                  <span className="mob_thumb_play">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  </span>
                </>
              ) : (
                <img src={m} alt="" />
              )}
            </button>
          ))}
        </div>
      )}

      <div className="mob_detail_info">
        <div className="mob_detail_sku_row">
          {p.brand && <span className="mob_detail_brand">{p.brand}</span>}
          <span className="mob_detail_sku">{t('articles') || 'Artikul'}: XP-{String(pid).slice(-4)}</span>
        </div>
        <div className="mob_detail_name">{p.name}</div>
        {REVIEWS_ENABLED && (
        <div className="mob_card_rating" style={{ marginTop: 8 }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          <span>{p.rating || 0} · {p.reviews.length} {t('reviews') || 'sharh'} · {t('soldPlus') || ''}</span>
        </div>
        )}

        {variants.length > 0 && (
          <div className="mob_detail_variants">
            <div className="mob_detail_variants_label">{t('selectOption') || 'Variant tanlang'}:</div>
            <div className="mob_detail_variants_list">
              {variants.map(v => {
                const vActive = selectedVariantId === v._id
                return (
                  <button
                    key={v._id}
                    type="button"
                    className={`mob_variant${vActive ? ' mob_variant_active' : ''}`}
                    onClick={() => { setSelectedVariantId(v._id); setActiveMedia(0) }}
                  >
                    {v.colorHex && <span className="mob_variant_dot" style={{ background: v.colorHex }} />}
                    <span className="mob_variant_label">{[v.color, v.size].filter(Boolean).join(' / ') || 'Variant'}</span>
                    <span className="mob_variant_price">{convertPrice(Number(v.price))}</span>
                  </button>
                )
              })}
            </div>
            {selectedVariant?.sku && <div className="mob_detail_variant_sku">SKU: {selectedVariant.sku}</div>}
          </div>
        )}

        <div className="mob_detail_price_row">
          <span className="mob_detail_price">{convertPrice(displayPrice)}</span>
          {displayOldPrice && <span className="mob_detail_old">{convertPrice(displayOldPrice)}</span>}
        </div>
        {displayOldPrice && (
          <div className="mob_detail_savings">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            {convertPrice(displayOldPrice - displayPrice)} {t('save') || 'tejang!'}
          </div>
        )}

        <div className="mob_detail_features">
          {features.map(f => (
            <div key={f.label} className="mob_detail_feat">
              <b>{f.icon}</b>
              <span className="mob_detail_feat_label">{f.label}</span>
              <span className="mob_detail_feat_desc">{f.desc}</span>
            </div>
          ))}
        </div>

        {seller && (
          <div style={{ marginTop: 16 }}>
            <div className="mob_person">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => openSeller(seller)}>
                <div className="mob_avatar" style={{ background: seller.color || 'var(--mob-accent)' }}>
                  {seller.avatar?.startsWith('/') ? <img src={seller.avatar} alt="" /> : (seller.avatar || seller.shopName?.[0] || seller.name?.[0] || '?')}
                </div>
                <div className="mob_person_info">
                  <div className="mob_person_name">
                    {seller.shopName || seller.name}
                    {seller.verified && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" style={{ marginLeft: 5, verticalAlign: -2 }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    )}
                  </div>
                  <div className="mob_person_meta">
                    {REVIEWS_ENABLED && <span style={{ color: 'var(--mob-amber)' }}>★ {seller.rating || 0}</span>}
                    {REVIEWS_ENABLED && <span>· {seller.reviewCount || 0} sharh</span>}
                    <span>· Do'konga o'tish →</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mob_seller_actions">
              <button className="mob_seller_map" onClick={handleMap}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {t('viewOnMap') || "Xaritada ko'rish"}
              </button>
              <button className="mob_seller_chat" onClick={handleChat}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                {t('chatWithSeller') || 'Sotuvchi bilan chat'}
              </button>
            </div>
          </div>
        )}

        <div className="mob_sec_tabs" style={{ marginTop: 18 }}>
          <button className={`mob_sec_tab${activeTab === 'desc' ? ' mob_sec_tab_active' : ''}`} onClick={() => setActiveTab('desc')}>
            {t('description') || 'Tavsif'}
          </button>
          <button className={`mob_sec_tab${activeTab === 'spec' ? ' mob_sec_tab_active' : ''}`} onClick={() => setActiveTab('spec')}>
            {t('specifications') || 'Xususiyatlar'}
          </button>
          {REVIEWS_ENABLED && <button className={`mob_sec_tab${activeTab === 'reviews' ? ' mob_sec_tab_active' : ''}`} onClick={() => setActiveTab('reviews')}>
            {t('allReviews') || 'Sharhlar'} ({p.reviews.length})
          </button>}
        </div>

        {activeTab === 'desc' && (
          <div className="mob_detail_section">
            <div className="mob_detail_desc">{p.description || 'Tavsif mavjud emas'}</div>
          </div>
        )}

        {activeTab === 'spec' && (
          <div className="mob_detail_section">
            <table className="mob_specs">
              <tbody>
                <tr><td>{t('brand') || 'Brend'}</td><td>{p.brand || '—'}</td></tr>
                <tr><td>{t('productName') || 'Mahsulot'}</td><td>{p.name}</td></tr>
                {REVIEWS_ENABLED && <><tr><td>{t('rating') || 'Reyting'}</td><td>{p.rating || 0} / 5</td></tr><tr><td>{t('reviewsCount') || 'Sharhlar'}</td><td>{p.reviews.length}</td></tr></>}
                <tr><td>{t('price') || 'Narx'}</td><td>{convertPrice(displayPrice)}</td></tr>
                <tr><td>{t('warrantySpec') || 'Kafolat'}</td><td>{t('warranty') || '1 yil kafolat'}</td></tr>
                <tr><td>{t('pickupSpec') || 'Olib ketish'}</td><td>{t('pickupFree') || 'Bepul'}</td></tr>
              </tbody>
            </table>
          </div>
        )}

        {REVIEWS_ENABLED && activeTab === 'reviews' && (
          <div className="mob_detail_section">
            {!user ? (
              <div className="mob_review_login">
                <p>{t('loginRequiredDesc') || 'Sharh yozish uchun tizimga kiring'}</p>
                <button className="mob_empty_btn" onClick={openLoginSheet}>{t('loginPrompt') || 'Kirish'}</button>
              </div>
            ) : reviewDone ? (
              <div className="mob_review_done">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="16 8 10 16 7 13"/></svg>
                <div className="mob_review_done_title">Rahmat!</div>
                <p>Sizning sharhingiz muvaffaqiyatli yuborildi.</p>
              </div>
            ) : (
              <form className="mob_review_form" onSubmit={submitReview}>
                <div className="mob_review_form_title">{p.name} uchun sharh yozing</div>
                <div className="mob_review_stars">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} type="button" className={`mob_review_star${s <= reviewRating ? ' filled' : ''}`} onClick={() => setReviewRating(s)}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="1">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    </button>
                  ))}
                  {reviewLabel && <span className="mob_review_star_label">{reviewLabel}</span>}
                </div>
                <textarea rows={3} placeholder="Sharhingizni yozing... (ixtiyoriy)" value={reviewText} onChange={e => setReviewText(e.target.value)} />
                {reviewError && <p className="mob_review_error">{reviewError}</p>}
                <button type="submit" className="mob_btn mob_detail_buy" disabled={reviewRating === 0 || reviewSubmitting}>
                  {reviewSubmitting ? 'Yuklanmoqda...' : 'Sharh yuborish'}
                </button>
              </form>
            )}

            <div className="mob_reviews_list">
              {p.reviews.map(r => (
                <div className="mob_review" key={r._id || r.id}>
                  <div className="mob_review_top">
                    <div className="mob_review_avatar">{r.userName?.[0] || r.user?.[0] || 'U'}</div>
                    <div>
                      <strong>{r.userName || r.user || 'Foydalanuvchi'}</strong>
                      <div className="mob_review_stars_small">
                        {[1, 2, 3, 4, 5].map(s => (
                          <svg key={s} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="1"
                            className={s <= r.rating ? 'mob_star_filled' : 'mob_star_empty'}>
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                        ))}
                        <span className="mob_review_date">{r.createdAt ? new Date(r.createdAt).toLocaleDateString('uz-UZ') : ''}</span>
                      </div>
                    </div>
                  </div>
                  <p>{r.text}</p>
                </div>
              ))}
              {p.reviews.length === 0 && (
                <div className="mob_review_empty">Hozircha sharhlar yo'q. Birinchi bo'ling!</div>
              )}
            </div>
          </div>
        )}

        {similarNormalized.length > 0 && (
          <div style={{ marginTop: 26 }}>
            <div className="mob_page_title" style={{ fontSize: 17, marginBottom: 12 }}>{t('similarProducts') || "O'xshash mahsulotlar"}</div>
            <div className="mob_grid" style={{ padding: 0 }}>
              {similarNormalized.map(sp => <MobileProductCard key={sp._id || sp.id} product={sp} />)}
            </div>
          </div>
        )}
      </div>

      <div className="mob_detail_bottom">
        <div className="mob_qty" style={{ marginTop: 0 }}>
          <button onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
          <span>{qty}</span>
          <button onClick={() => setQty(q => q + 1)}>+</button>
        </div>
        <button className="mob_btn mob_detail_buy" onClick={handleAdd}>
          {added ? '✓ ' + (t('added') || "Qo'shildi!") : (t('addToCartFull') || 'Savatga qo\'shish')}
        </button>
      </div>
    </div>
  )
}