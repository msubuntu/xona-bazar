import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useSeller } from '../context/SellerContext.jsx'
import { useFavorites } from '../context/FavoritesContext.jsx'
import { api } from '../services/api'
import { getGeoErrorMessage } from '../services/geo'
import Header from './header'
import Footer from './Footer'
import LoginPrompt from './LoginPrompt'
import ReviewForm from './ReviewForm'
import StoreMap from './StoreMap'
import NearbyStores from './NearbyStores'
import '../components_css/productdetail.css'

function ProductDetail() {
  const { selectedProduct, goHome, addItem, openProduct } = useCart()
  const { user } = useAuth()
  const { id } = useParams()
  const { t, convertPrice } = useSettings()
  const { openSeller, openChat } = useSeller()
  const { isFavorite, toggleFavorite } = useFavorites()
  const [qty, setQty] = useState(1)
  const [selectedVariantId, setSelectedVariantId] = useState(null)
  const [activeTab, setActiveTab] = useState('desc')
  const [added, setAdded] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [userReviews, setUserReviews] = useState([])
  const [userLocation, setUserLocation] = useState(null)
  const [geoError, setGeoError] = useState('')
  const [activeImageIdx, setActiveImageIdx] = useState(0)
  const scrollRef = useRef(null)

  const [apiProduct, setApiProduct] = useState(null)
  const [similarProducts, setSimilarProducts] = useState([])
  const [loadingProduct, setLoadingProduct] = useState(true)

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) return
    setGeoError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGeoError('')
      },
      (err) => setGeoError(getGeoErrorMessage(err)),
      { timeout: 8000, maximumAge: 300000 }
    )
  }, [])

  useEffect(() => { detectLocation() }, [detectLocation])

  const loadProduct = useCallback(async () => {
    if (!id) return
    setLoadingProduct(true)
    try {
      const data = await api.products.get(id)
      const p = data.product
      setApiProduct(p)
      if (p.category) {
        const simData = await api.products.list({ category: p.category, limit: 10 })
        setSimilarProducts(simData.products.filter(sp => sp._id !== p._id))
      }
    } catch (err) {
      console.error('Load product error:', err)
    } finally {
      setLoadingProduct(false)
    }
  }, [id])

  useEffect(() => { loadProduct() }, [loadProduct])

  useEffect(() => {
    const raw = apiProduct || selectedProduct
    const vs = Array.isArray(raw?.variants) ? raw.variants : []
    if (vs.length > 0) {
      setSelectedVariantId(vs[0]._id)
    } else {
      setSelectedVariantId(null)
    }
    setQty(1)
    setActiveImageIdx(0)
  }, [id, apiProduct, selectedProduct])

  const rawProduct = apiProduct || selectedProduct
  if (loadingProduct && !rawProduct) return <><Header /><div style={{textAlign:'center',padding:80}}>Yuklanmoqda...</div><Footer /></>
  if (!rawProduct) return null

  const pid = rawProduct._id || rawProduct.id
  const p = {
    ...rawProduct,
    id: pid,
    image: rawProduct.image || (rawProduct.images && rawProduct.images[0]) || '',
    reviews: Array.isArray(rawProduct.reviews) ? rawProduct.reviews : [],
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
  const displayImage = displayImages[activeImageIdx] || displayImages[0] || ''
  const displayVideo = p.video || ''

  const discount = displayOldPrice
    ? Math.round((1 - displayPrice / displayOldPrice) * 100)
    : 0

  const similar = similarProducts.map(sp => ({
    ...sp,
    id: sp._id,
    image: sp.image || (sp.images && sp.images[0]) || '',
    reviews: Array.isArray(sp.reviews) ? sp.reviews : [],
  }))

  const seller = p.sellerId && typeof p.sellerId === 'object' ? p.sellerId : null

  const liked = isFavorite(pid)

  const handleAdd = () => {
    if (!user) { setShowLoginPrompt(true); return }
    for (let i = 0; i < qty; i++) addItem(p, selectedVariant || undefined)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const handleLike = () => {
    if (!user) { setShowLoginPrompt(true); return }
    toggleFavorite(p)
  }

  const scrollSimilar = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 280, behavior: 'smooth' })
    }
  }

  const features = [
    { icon: '🏠', label: t('pickupFree'), desc: t('pickupFreeDesc') },
    { icon: '🔄', label: t('return7'), desc: t('return7Desc') },
    { icon: '🛡️', label: t('warranty'), desc: t('warrantyDesc') },
    { icon: '💬', label: t('consultation'), desc: t('consultationDesc') },
  ]

  return (
    <div className="pd">
      <Header />
      <div className="container">
        <div className="pd_breadcrumb">
          <span onClick={goHome}>{t('home')}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          <span>{p.brand}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          <span className="active">{p.name}</span>
        </div>

        <div className="pd_main">
          <div className="pd_gallery">
            <div className="pd_gallery_main">
              {discount > 0 && <span className="pd_discount">-{discount}%</span>}
              {activeImageIdx === -1 && displayVideo ? (
                <video src={displayVideo} controls className="pd_gallery_video" />
              ) : displayImage ? (
                <img src={displayImage} alt={p.name} />
              ) : (
                <div className="pd_gallery_empty">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ color: 'var(--text-muted)' }}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                </div>
              )}
            </div>
            <div className="pd_gallery_thumbs">
              {displayImages.map((img, i) => (
                <div
                  key={i}
                  className={`pd_thumb ${i === activeImageIdx ? 'active' : ''}`}
                  onClick={() => setActiveImageIdx(i)}
                >
                  <img src={img} alt={`${p.name} ${i + 1}`} />
                </div>
              ))}
              {displayVideo && (
                <div
                  className={`pd_thumb pd_thumb_video ${activeImageIdx === -1 ? 'active' : ''}`}
                  onClick={() => setActiveImageIdx(-1)}
                >
                  <video src={displayVideo} muted />
                  <span className="pd_thumb_play">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="pd_info">
            <div className="pd_brand_row">
              <span className="pd_brand">{p.brand}</span>
              <span className="pd_sku">{t('articles')}: XP-{String(p.id).padStart(4,'0')}</span>
            </div>

            <h1 className="pd_name">{p.name}</h1>

            <div className="pd_rating_row">
              <div className="pd_stars">
                {[1,2,3,4,5].map(s => (
                  <svg key={s} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                    className={s <= Math.round(p.rating) ? 'fill-amber-400 stroke-amber-400' : 'fill-gray-200 stroke-gray-200'}
                    strokeWidth="1">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>
              <span className="pd_rating_num">{p.rating}</span>
              <span className="pd_reviews_link">{p.reviews.length.toLocaleString()} {t('reviews')}</span>
              <span className="pd_sold">{t('soldPlus')}</span>
            </div>

            {variants.length > 0 && (
              <div className="pd_variants">
                <div className="pd_variants_label">
                  {t('selectOption') || 'Variant tanlang'}:
                </div>
                <div className="pd_variants_list">
                  {variants.map(v => (
                    <button
                      type="button"
                      key={v._id}
                      className={`pd_variant ${selectedVariantId === v._id ? 'active' : ''}`}
                      onClick={() => { setSelectedVariantId(v._id); setActiveImageIdx(0) }}
                    >
                      {v.colorHex && <span className="pd_variant_dot" style={{ background: v.colorHex }} />}
                      <span className="pd_variant_label">
                        {[v.color, v.size].filter(Boolean).join(' / ') || 'Variant'}
                      </span>
                      <span className="pd_variant_price">{convertPrice(Number(v.price))}</span>
                    </button>
                  ))}
                </div>
                {selectedVariant?.sku && (
                  <div className="pd_variant_sku">SKU: {selectedVariant.sku}</div>
                )}
              </div>
            )}

            <div className="pd_price_block">
              <div className="pd_price_row">
                <span className="pd_price">{convertPrice(displayPrice)}</span>
                {displayOldPrice && (
                  <span className="pd_oldprice">{convertPrice(displayOldPrice)}</span>
                )}
              </div>
              {displayOldPrice && (
                <div className="pd_savings">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                  {convertPrice(displayOldPrice - displayPrice)} {t('save')}
                </div>
              )}
            </div>

            <div className="pd_features">
              {features.map((f, i) => (
                <div className="pd_feature" key={i}>
                  <span className="pd_feature_icon">{f.icon}</span>
                  <div>
                    <strong>{f.label}</strong>
                    <span>{f.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pd_buy_section">
              <div className="pd_qty">
                <button onClick={() => setQty(q => Math.max(1, q - 1))}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
                <span>{qty}</span>
                <button onClick={() => setQty(q => q + 1)}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              </div>
              <button className={`pd_add_btn ${added ? 'added' : ''}`} onClick={handleAdd}>
                {added ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    {t('added')}
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                    </svg>
                    {t('addToCartFull')}
                  </>
                )}
              </button>
              <button className={`pd_like_btn ${liked ? 'liked' : ''}`} onClick={handleLike}>
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
                  className={liked ? 'fill-red-500 stroke-red-500' : 'fill-none stroke-gray-500'}
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            </div>

            <div className="pd_total">
              <span>{t('total')}:</span>
              <span className="pd_total_price">{convertPrice(displayPrice * qty)}</span>
            </div>
          </div>
        </div>

        {seller && (
          <div className="pd_seller">
            <div className="pd_seller_left" onClick={() => openSeller(seller)}>
              <div className="pd_seller_avatar" style={seller.avatar ? {overflow:'hidden',padding:0} : {}}>
                {seller.avatar ? (
                  <img src={seller.avatar} alt={seller.name} style={{width:'100%',height:'100%',objectFit:'cover'}} />
                ) : (
                  (seller.name || 'S')[0]
                )}
              </div>
              <div className="pd_seller_info">
                <div className="pd_seller_name">
                  {seller.name}
                  {seller.verified && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  )}
                </div>
                <div className="pd_seller_meta">
                  <span className="pd_seller_rating">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" className="fill-amber-400 stroke-amber-400" strokeWidth="1"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    {seller.rating || 0}
                  </span>
                </div>
              </div>
              <svg className="pd_seller_arrow" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
            <button className="pd_seller_chat_btn" onClick={() => { if (!user) { setShowLoginPrompt(true); return } openChat(seller) }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              {t('chatWithSeller')}
            </button>
          </div>
        )}

        <div className="pd_stores_section">
          <div className="pd_stores_header">
            <h3 className="pd_section_title">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              {t('storeOnMap')}
            </h3>
            {seller && (
              <span className="pd_stores_current">
                Hozirgi do'kon: <strong>{seller.name}</strong>
              </span>
            )}
          </div>
          {geoError && (
            <div className="pd_geo_error">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>{geoError}</span>
              <button onClick={detectLocation}>Qayta urinish</button>
            </div>
          )}
          <div className="pd_stores_body">
            <div className="pd_map_col">
              <StoreMap
                stores={seller ? [seller] : []}
                userLocation={userLocation}
                selectedStoreId={seller?._id}
                height="380px"
                currentProduct={p}
              />
            </div>
            <div className="pd_nearby_col">
              <NearbyStores currentProduct={p} userLocation={userLocation} />
            </div>
          </div>
        </div>

        <div className="pd_tabs">
          <div className="pd_tab_headers">
            <button className={activeTab === 'desc' ? 'active' : ''} onClick={() => setActiveTab('desc')}>{t('description')}</button>
            <button className={activeTab === 'spec' ? 'active' : ''} onClick={() => setActiveTab('spec')}>{t('specifications')}</button>
            <button className={activeTab === 'reviews' ? 'active' : ''} onClick={() => setActiveTab('reviews')}>{t('allReviews')} ({p.reviews.length})</button>
          </div>

          <div className="pd_tab_content">
            {activeTab === 'desc' && (
              <div className="pd_desc">
                <p>{p.name} — {t('productDesc1')}</p>
                <p>{t('productDesc2')}</p>
              </div>
            )}
            {activeTab === 'spec' && (
              <table className="pd_specs">
                <tbody>
                  <tr><td>{t('brand')}</td><td>{p.brand}</td></tr>
                  <tr><td>{t('productName')}</td><td>{p.name}</td></tr>
                  <tr><td>{t('rating')}</td><td>{p.rating} / 5</td></tr>
                  <tr><td>{t('reviewsCount')}</td><td>{p.reviews.length.toLocaleString()}</td></tr>
                  <tr><td>{t('price')}</td><td>{convertPrice(displayPrice)}</td></tr>
                  <tr><td>{t('warrantySpec')}</td><td>{t('warrantySpecVal')}</td></tr>
                  <tr><td>{t('pickupSpec')}</td><td>{t('pickupSpecVal')}</td></tr>
                </tbody>
              </table>
            )}
            {activeTab === 'reviews' && (
              <div className="pd_reviews">
                <ReviewForm
                  productName={p.name}
                  productId={p._id}
                  onSubmitted={(updatedProduct) => {
                    if (updatedProduct?.reviews) {
                      setApiProduct(prev => prev ? { ...prev, reviews: updatedProduct.reviews } : prev)
                    }
                  }}
                />
                {userReviews.map(r => (
                  <div className="pd_review" key={r.id}>
                    <div className="pd_review_top">
                      <div className="pd_review_avatar">{r.user?.[0] || 'U'}</div>
                      <div>
                        <strong>{r.user}</strong>
                        <div className="pd_review_stars">
                          {[1,2,3,4,5].map(s => (
                            <svg key={s} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                              className={s <= r.rating ? 'fill-amber-400 stroke-amber-400' : 'fill-gray-200 stroke-gray-200'}
                              strokeWidth="1">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          ))}
                          <span>Hozir</span>
                        </div>
                      </div>
                    </div>
                    <p>{r.text}</p>
                  </div>
                ))}
                {p.reviews.map(r => (
                  <div className="pd_review" key={r._id || r.id}>
                    <div className="pd_review_top">
                      <div className="pd_review_avatar">{r.userName?.[0] || 'U'}</div>
                      <div>
                        <strong>{r.userName || 'Foydalanuvchi'}</strong>
                        <div className="pd_review_stars">
                          {[1,2,3,4,5].map(s => (
                            <svg key={s} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                              className={s <= r.rating ? 'fill-amber-400 stroke-amber-400' : 'fill-gray-200 stroke-gray-200'}
                              strokeWidth="1">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          ))}
                          <span>{r.createdAt ? new Date(r.createdAt).toLocaleDateString('uz-UZ') : ''}</span>
                        </div>
                      </div>
                    </div>
                    <p>{r.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {similar.length > 0 && (
          <div className="pd_similar">
            <div className="pd_similar_header">
              <h2>{t('similarProducts')}</h2>
              <div className="pd_similar_nav">
                <button onClick={() => scrollSimilar(-1)}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <button onClick={() => scrollSimilar(1)}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            </div>
            <div className="pd_similar_scroll" ref={scrollRef}>
              {similar.map(item => {
                const d = item.oldPrice ? Math.round((1 - item.price / item.oldPrice) * 100) : 0
                return (
                  <div className="pd_similar_card" key={item._id || item.id} onClick={() => openProduct(item)}>
                    <div className="pd_similar_img">
                      <img src={item.image || '/placeholder.png'} alt={item.name} />
                      {d > 0 && <span className="pd_similar_discount">-{d}%</span>}
                    </div>
                    <div className="pd_similar_info">
                      <span className="pd_similar_brand">{item.brand}</span>
                      <h4>{item.name}</h4>
                      <div className="pd_similar_rating">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" className="fill-amber-400 stroke-amber-400" strokeWidth="1">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        <span>{item.rating}</span>
                        <span className="pd_similar_reviews">({item.reviews.length})</span>
                      </div>
                      <div className="pd_similar_prices">
                        <span className="pd_similar_price">{convertPrice(item.price)}</span>
                        {item.oldPrice && <span className="pd_similar_oldprice">{convertPrice(item.oldPrice)}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
      <Footer />
      {showLoginPrompt && <LoginPrompt onClose={() => setShowLoginPrompt(false)} />}
    </div>
  )
}

export default ProductDetail
