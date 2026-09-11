import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSeller } from '../context/SellerContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { api } from '../services/api'
import MobileHeader from './MobileHeader.jsx'
import MobileProductCard from './MobileProductCard.jsx'
import { REVIEWS_ENABLED } from '../data/flags'
import { openLoginSheet } from './MobileAuthSheet.jsx'

function normalizeProducts(list) {
  return (list || []).map(p => ({
    ...p,
    id: p._id,
    image: p.image || (p.images && p.images[0]) || '',
    reviews: Array.isArray(p.reviews) ? p.reviews.length : (p.reviews || 0),
  }))
}

export default function MobileSellerProfile() {
  const navigate = useNavigate()
  const { selectedSeller, openChat } = useSeller()
  const { user } = useAuth()
  const { t } = useSettings()
  const { id } = useParams()

  const [apiSeller, setApiSeller] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('products')
  const [descExpanded, setDescExpanded] = useState(false)

  const load = useCallback(async () => {
    if (!id && !selectedSeller) return
    setLoading(true)
    try {
      if (id) {
        const data = await api.sellers.get(id)
        setApiSeller(data.seller)
        setProducts(normalizeProducts(data.products))
      } else if (selectedSeller) {
        setProducts(normalizeProducts(selectedSeller.products))
      }
    } catch (err) {
      console.error('Load seller error:', err)
    } finally {
      setLoading(false)
    }
  }, [id, selectedSeller])

  useEffect(() => { load() }, [load])

  const s = id ? (apiSeller || null) : (selectedSeller || apiSeller)
  if (loading && !s) return <div className="mob"><MobileHeader /><div className="mob_loader"><div className="mob_spinner" /></div></div>
  if (!s) return <div className="mob" onClick={() => navigate('/')}>Topilmadi</div>

  const chat = () => { if (!user) { openLoginSheet(); return } openChat(s) }
  const handleMap = () => {
    if (!s) return
    navigate('/stores-map', { state: { focusSellerId: s._id, focusSeller: s } })
  }
  const desc = s.description || s.shopName || ''

  return (
    <div className="mob">
      <MobileHeader />
      <div className="mob_page_head">
        <button className="mob_back" onClick={() => navigate(-1)} aria-label="Orqaga">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div className="mob_page_title">{t('sellerProducts') || "Do'kon"}</div>
      </div>

      <div className="mob_section" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <div className="mob_avatar" style={{ width: 68, height: 68, borderRadius: 20, background: s.color || 'var(--mob-accent)', fontSize: 26 }}>
          {s.avatar?.startsWith('/') ? <img src={s.avatar} alt="" /> : (s.avatar || s.shopName?.[0] || s.name?.[0] || '?')}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mob_person_name" style={{ fontSize: 17 }}>
            {s.shopName || s.name}
            {s.verified && (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" style={{ verticalAlign: -2 }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            )}
          </div>
          {s.verified && (
            <span className="mob_verified_badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              {t('verifiedSeller')}
            </span>
          )}
          <div className="mob_person_meta" style={{ marginTop: 6 }}>
            {REVIEWS_ENABLED && <span style={{ color: 'var(--mob-amber)', fontWeight: 700 }}>★ {s.rating || 0}</span>}
            {REVIEWS_ENABLED && <span>({s.reviewCount || 0} {t('reviews') || 'sharh'})</span>}
          </div>
          <div className="mob_person_meta">
            {s.location && <span>{s.location}</span>}
            {s.workingHours && <span>· {s.workingHours}</span>}
          </div>
        </div>
      </div>

      <div className="mob_seller_actions">
        <button className="mob_seller_map" onClick={handleMap}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          {t('viewOnMap') || "Xaritada ko'rish"}
        </button>
        <button className="mob_seller_chat" onClick={chat}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          {t('chatWithSeller') || 'Sotuvchi bilan chat'}
        </button>
      </div>

      <div className="mob_seller_stats">
        {REVIEWS_ENABLED && (
        <div className="mob_seller_stat">
          <strong>★ {s.rating || 0}</strong>
          <span>{t('rating') || 'Reyting'}</span>
        </div>
        )}
        <div className="mob_seller_stat">
          <strong>{products.length}</strong>
          <span>{t('products') || 'Mahsulot'}</span>
        </div>
        {REVIEWS_ENABLED && (
        <div className="mob_seller_stat">
          <strong>{s.reviewCount || 0}</strong>
          <span>{t('reviews') || 'Sharh'}</span>
        </div>
        )}
      </div>

      <div className="mob_sec_tabs">
        <button className={`mob_sec_tab${tab === 'products' ? ' mob_sec_tab_active' : ''}`} onClick={() => setTab('products')}>
          {t('sellerProducts') || 'Mahsulotlar'} ({products.length})
        </button>
        <button className={`mob_sec_tab${tab === 'info' ? ' mob_sec_tab_active' : ''}`} onClick={() => setTab('info')}>
          {t('aboutSeller') || 'Ma\'lumot'}
        </button>
      </div>

      {tab === 'products' ? (
        products.length === 0 ? (
          <div className="mob_empty"><div className="mob_empty_title">Mahsulotlar yo'q</div></div>
        ) : (
          <div className="mob_grid">
            {products.map(p => <MobileProductCard key={p._id || p.id} product={p} />)}
          </div>
        )
      ) : (
        <div className="mob_section">
          <div className="mob_seller_contact">
            <div className="mob_seller_contact_title">{t('contactInfo') || 'Bog\'lanish'}</div>
            {s.phone && (
              <a className="mob_about_row" href={`tel:${s.phone}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--mob-accent)" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                <span>{s.phone}</span>
              </a>
            )}
            {s.location && (
              <div className="mob_about_row">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--mob-accent)" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>{s.location}</span>
              </div>
            )}
            {s.workingHours && (
              <div className="mob_about_row">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--mob-accent)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>{s.workingHours}</span>
              </div>
            )}
          </div>
          <div className="mob_seller_contact" style={{ marginTop: 10 }}>
            <div className="mob_seller_contact_title">{t('sellerDescription') || 'Do\'kon haqida'}</div>
            <p className={desc && desc.length > 120 && !descExpanded ? 'mob_desc_clamped' : ''} style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--mob-text-2)' }}>
              {desc || "Do'kon haqida ma'lumot mavjud emas."}
            </p>
            {desc.length > 120 && (
              <button className="mob_desc_toggle" onClick={() => setDescExpanded(!descExpanded)}>
                {descExpanded ? 'Kamroq' : "Ko'proq"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}