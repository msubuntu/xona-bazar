import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useSeller } from '../context/SellerContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { api } from '../services/api'
import { getGeoErrorMessage } from '../services/geo'
import Header from './header'
import Footer from './Footer'
import LoginPrompt from './LoginPrompt'
import ProductCard from './ProductCard'
import StoreMap from './StoreMap'
import '../components_css/seller.css'

function SellerProfile() {
  const { selectedSeller, setSelectedSeller, openChat } = useSeller()
  const { goHome } = useCart()
  const { user } = useAuth()
  const { t } = useSettings()
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState('products')
  const [userLocation, setUserLocation] = useState(null)
  const [geoError, setGeoError] = useState('')
  const [apiSeller, setApiSeller] = useState(null)
  const [sellerProducts, setSellerProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [descExpanded, setDescExpanded] = useState(false)

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

  const loadSeller = useCallback(async () => {
    if (selectedSeller) {
      setLoading(false)
      return
    }
    if (!id) return
    setLoading(true)
    try {
      const data = await api.sellers.get(id)
      setApiSeller(data.seller)
      const products = (data.products || []).map(p => ({
        ...p,
        id: p._id,
        image: p.image || (p.images && p.images[0]) || '',
        reviews: Array.isArray(p.reviews) ? p.reviews.length : (p.reviews || 0),
      }))
      setSellerProducts(products)
    } catch (err) {
      console.error('Load seller error:', err)
    } finally {
      setLoading(false)
    }
  }, [id, selectedSeller])

  useEffect(() => { loadSeller() }, [loadSeller])

  const s = selectedSeller || apiSeller

  if (loading && !s) return <><Header /><div style={{textAlign:'center',padding:80}}>Yuklanmoqda...</div><Footer /></>
  if (!s) return null

  return (
    <div className="sp">
      <Header />
      <div className="container">
        <div className="sp_breadcrumb">
          <span onClick={goHome}>{t('home')}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          <span className="active">{s.name}</span>
        </div>

        <div className="sp_profile">
          <div className="sp_avatar" style={s.avatar ? {overflow:'hidden',padding:0} : {}}>
            {s.avatar ? (
              <img src={s.avatar} alt={s.name} style={{width:'100%',height:'100%',objectFit:'cover'}} />
            ) : (
              (s.name || 'S')[0].toUpperCase()
            )}
          </div>
          <div className="sp_info">
            <div className="sp_name_row">
              <h1>{s.name}</h1>
              {s.verified && (
                <span className="sp_verified">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  {t('verifiedSeller')}
                </span>
              )}
            </div>
            <p className={`sp_desc ${!descExpanded ? 'clamped' : ''}`}>{s.description || s.shopName || ''}</p>
            {s.description && s.description.length > 120 && (
              <button className="sp_desc_toggle" onClick={() => setDescExpanded(!descExpanded)}>
                {descExpanded ? "Kamroq" : "Ko'proq"}
              </button>
            )}
            <div className="sp_meta">
              {s.location && (
                <span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {s.location}
                </span>
              )}
              {s.workingHours && (
                <span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {s.workingHours}
                </span>
              )}
            </div>
          </div>
          <div className="sp_actions">
            <button className="sp_chat_btn" onClick={() => { if (!user) { setShowLoginPrompt(true); return } openChat(s) }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              {t('chatWithSeller')}
            </button>
            {s.phone && (
              <button className="sp_call_btn" onClick={() => window.open(`tel:${s.phone}`)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                {t('call')}
              </button>
            )}
          </div>
        </div>

        <div className="sp_stats">
          <div className="sp_stat">
            <div className="sp_stat_icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </div>
            <div>
              <strong>{s.rating || 0}</strong>
              <span>{t('rating')}</span>
            </div>
          </div>
          <div className="sp_stat">
            <div className="sp_stat_icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            </div>
            <div>
              <strong>{sellerProducts.length}</strong>
              <span>{t('products')}</span>
            </div>
          </div>
        </div>

        {s.location && s.lat && s.lng && (
          <div className="sp_map_section">
            <div className="sp_map_header">
              <h3>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                Do'kon joylashuvi
              </h3>
              <span className="sp_map_addr">{s.location}</span>
            </div>
            {geoError && (
              <div className="pd_geo_error">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>{geoError}</span>
                <button onClick={detectLocation}>Qayta urinish</button>
              </div>
            )}
            <div className="sp_map_body">
              <div className="sp_map_wrapper">
                <StoreMap
                  stores={[s]}
                  userLocation={userLocation}
                  selectedStoreId={s._id}
                  height="320px"
                />
              </div>
            </div>
          </div>
        )}

        <div className="sp_tabs">
          <div className="sp_tab_headers">
            <button className={activeTab === 'products' ? 'active' : ''} onClick={() => setActiveTab('products')}>
              {t('sellerProducts')} ({sellerProducts.length})
            </button>
            <button className={activeTab === 'about' ? 'active' : ''} onClick={() => setActiveTab('about')}>
              {t('aboutSeller')}
            </button>
          </div>

          <div className="sp_tab_content">
            {activeTab === 'products' && (
              <div className="sp_products_grid">
                {sellerProducts.length === 0 ? (
                  <div style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>Hali mahsulot yo'q</div>
                ) : sellerProducts.map(p => (
                  <ProductCard key={p._id || p.id} product={p} />
                ))}
              </div>
            )}
            {activeTab === 'about' && (
              <div className="sp_about">
                <div className="sp_about_card">
                  <h3>{t('contactInfo')}</h3>
                  {s.phone && (
                    <div className="sp_about_row">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      <span>{s.phone}</span>
                    </div>
                  )}
                  {s.location && (
                    <div className="sp_about_row">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      <span>{s.location}</span>
                    </div>
                  )}
                  {s.workingHours && (
                    <div className="sp_about_row">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      <span>{s.workingHours}</span>
                    </div>
                  )}
                </div>
                <div className="sp_about_card">
                  <h3>{t('sellerDescription')}</h3>
                  <p>{s.description || s.shopName || "Ma'lumot yo'q"}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <button className="sp_back_btn" onClick={() => setSelectedSeller(null)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          {t('goBack')}
        </button>
      </div>
      <Footer />
      {showLoginPrompt && <LoginPrompt onClose={() => setShowLoginPrompt(false)} />}
    </div>
  )
}

export default SellerProfile
