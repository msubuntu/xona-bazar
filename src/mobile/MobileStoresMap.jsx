import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { getGeoErrorMessage } from '../services/geo'
import StoreMap from '../components/StoreMap.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { REVIEWS_ENABLED } from '../data/flags'
import { CATEGORIES } from '../components/kategories.jsx'
// import MobileHeader from './MobileHeader.jsx'

export default function MobileStoresMap() {
  const { t, convertPrice } = useSettings()
  const [sellers, setSellers] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState(null)
  const [geoError, setGeoError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sectionMode, setSectionMode] = useState('stores')
  const [selectedStore, setSelectedStore] = useState(null)
  const [showList, setShowList] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const focusId = location.state?.focusSellerId
    if (!focusId) return
    const found = sellers.find(s => (s._id || s.id) === focusId)
    if (found) {
      setSelectedStore(found)
      setSectionMode('stores')
      setSelectedCategory('all')
      const fly = () => {
        const el = mapWrapRef.current?.querySelector('.store-map')
        const map = el?._leaflet_map
        if (map && found.lat && found.lng) {
          map.setView([found.lat, found.lng], 16)
          return true
        }
        return false
      }
      if (!fly()) setTimeout(fly, 600)
    }
  }, [location.state, sellers])

  // Mahsulotlar rejimi uchun: barcha do'konlarning mahsulotlari
  const sellerIdToName = useMemo(() => {
    const m = {}
    sellers.forEach(s => { m[s._id || s.id] = (s.shopName || s.name || '') })
    return m
  }, [sellers])

  const sellerProducts = useMemo(() => {
    return allProducts.map(p => {
      const pr = { ...p }
      pr._id = p._id || p.id
      pr.id = p._id || p.id
      pr.sellerId = p.sellerId?._id || p.sellerId
      pr.sellerName = p.sellerId?.name || sellerIdToName[pr.sellerId] || ''
      pr.image = p.image || (p.images && p.images[0]) || ''
      pr.reviews = Array.isArray(p.reviews) ? p.reviews.length : (p.reviews || 0)
      return pr
    })
  }, [allProducts, sellerIdToName])

  // Qidiruv oynasi uchun: faqat nom/manzil bo'yicha filtr (kategoriyadan qat'i nazar)
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (sectionMode === 'products') {
      let res = sellerProducts
      if (q) res = res.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.sellerName || '').toLowerCase().includes(q)
      )
      return res
    }
    if (!q) return sellers
    return sellers.filter(s =>
      (s.shopName || s.name || '').toLowerCase().includes(q) ||
      (s.location || '').toLowerCase().includes(q)
    )
  }, [sellers, sellerProducts, searchQuery, sectionMode])

  const selectFromSearch = (store) => {
    setSelectedStore(store)
    setShowList(false)
    setSearchOpen(false)
  }

  const geoTimerRef = useRef(null)
  const centerOnLocateRef = useRef(false)
  const mapWrapRef = useRef(null)

  // Geo xabarlar doimiy emas — 5 soniyadan keyin avtomatik yo'qoladi
  const showGeoNotice = useCallback((message) => {
    setGeoError(message)
    if (geoTimerRef.current) clearTimeout(geoTimerRef.current)
    geoTimerRef.current = setTimeout(() => setGeoError(''), 5000)
  }, [])

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      showGeoNotice('Brauzeringiz joylashuvni qo\u2018llab-quvvatlamaydi')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoError('') },
      (err) => showGeoNotice(getGeoErrorMessage(err)),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    )
  }, [showGeoNotice])

  useEffect(() => { detectLocation() }, [detectLocation])

  useEffect(() => () => { if (geoTimerRef.current) clearTimeout(geoTimerRef.current) }, [])

  // "Joylashuvim" tugmasi bosilganda — koordinata kelgach xaritani o'sha joyga markazlash
  useEffect(() => {
    if (!userLocation || !centerOnLocateRef.current) return
    centerOnLocateRef.current = false
    const el = document.querySelector('.store-map')
    const map = el && el._leaflet_map
    if (map) {
      setTimeout(() => { try { map.setView([userLocation.lat, userLocation.lng], 15) } catch {} }, 150)
    }
  }, [userLocation])

  const loadSellers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.sellers.list()
      setSellers((data.sellers || []).filter(s => s.lat && s.lng))
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  const loadProducts = useCallback(async () => {
    try {
      const data = await api.products.list({ limit: 500 })
      setAllProducts(data.products || [])
    } catch (err) { console.error(err) }
  }, [])

  useEffect(() => { loadSellers() }, [loadSellers])
  useEffect(() => { loadProducts() }, [loadProducts])

  const categories = useMemo(() => {
    const map = {}
    sellers.forEach(s => (s.products || []).forEach(p => { if (p.category) map[p.category] = (map[p.category] || 0) + 1 }))
    return Object.entries(map).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count)
  }, [sellers])

  const filteredSellers = useMemo(() => {
    let result = sellers
    if (sectionMode === 'products' && selectedCategory !== 'all') {
      result = result.filter(s => (s.products || []).some(p => p.category === selectedCategory))
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(s =>
        (s.shopName || s.name || '').toLowerCase().includes(q) ||
        (s.location || '').toLowerCase().includes(q)
      )
    }
    return result
  }, [sellers, selectedCategory, sectionMode, searchQuery])

  const filteredProducts = useMemo(() => {
    let result = sellerProducts
    if (selectedCategory !== 'all') result = result.filter(p => p.category === selectedCategory)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.sellerName || '').toLowerCase().includes(q)
      )
    }
    return result
  }, [sellerProducts, selectedCategory, searchQuery])

  return (
    <>
    <div className="mob" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', paddingBottom: 0 }}>
      {/* <MobileHeader /> */}
      {/* Xarita — qolgan bo'sh joyni egallaydi */}
      <div ref={mapWrapRef} className="smp_map_wrap" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <StoreMap
          stores={filteredSellers}
          userLocation={userLocation}
          selectedStoreId={selectedStore?._id}
          height="100%"
          cluster
          mode={sectionMode}
          products={sectionMode === 'products' ? filteredProducts : null}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          onSectionModeChange={setSectionMode}
          currentProduct={null}
          search={searchQuery}
        />

        {/* Overlay: yuqori panel */}
        <div className="smp_map_overlay" style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
          padding: '10px 12px 20px',
          background: 'var(--mob-map-overlay)',
          pointerEvents: 'none',
        }}>
          <div style={{ pointerEvents: 'auto' }}>
            {/* Orqaga + qidiruv */}
            <div style={{ display: 'flex', alignItems: 'center', height: 48, gap: 8 }}>
              <button
                onClick={() => window.history.back()}
                style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0 }}
                aria-label={t('back')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div
                className="mob_search"
                onClick={() => setSearchOpen(true)}
                onTouchStart={(e) => { e.stopPropagation(); setSearchOpen(true) }}
                style={{
                  flex: 1, height: 44, margin: 0, borderRadius: 14,
                  background: 'var(--mob-map-glass)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  cursor: 'pointer',
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--mob-accent)" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  readOnly
                  placeholder={sectionMode === 'stores' ? t('searchStores') : t('searchProduct')}
                  value={searchQuery}
                  style={{ cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Tablar: Do'konlar / Mahsulotlar + ro'yxat tugmasi — alohida qator */}
            <div style={{ display: 'flex', gap: 6, paddingBottom: 4 }}>
              <button
                onClick={() => setSectionMode('stores')}
                className="mob_cat"
                style={{ background: sectionMode === 'stores' ? 'var(--mob-accent)' : 'var(--mob-bg1)', color: sectionMode === 'stores' ? '#fff' : 'var(--mob-text-2)' }}
              >
                {t('tabStores')}
              </button>
              <button
                onClick={() => setSectionMode('products')}
                className="mob_cat"
                style={{ background: sectionMode === 'products' ? 'var(--mob-accent)' : 'var(--mob-bg1)', color: sectionMode === 'products' ? '#fff' : 'var(--mob-text-2)' }}
              >
                {t('products')}
              </button>
              <button
                onClick={() => setShowList(!showList)}
                className="mob_btn mob_btn_sm"
                style={{
                  flexShrink: 0,
                  marginLeft: 'auto',
                  background: showList ? 'var(--mob-accent)' : 'var(--mob-map-glass)',
                  color: showList ? '#fff' : 'var(--mob-text)',
                  border: '1px solid var(--mob-border)',
                  borderRadius: 12, padding: '10px 14px', fontSize: 13, fontWeight: 600,
                  boxShadow: showList ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
                }}
              >
                {showList ? t('navMap') : `${t('listWord')} (${sectionMode === 'products' ? filteredProducts.length : filteredSellers.length})`}
              </button>
            </div>

            {/* Kategoriyalar — faqat "Mahsulotlar" bosilganda, tablardan PASTDA alohida qator */}
            {sectionMode === 'products' && (
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', marginTop: 2 }}>
                <button
                  onClick={() => setSelectedCategory('all')}
                  className="mob_cat"
                  style={{ flexShrink: 0, background: selectedCategory === 'all' ? 'var(--mob-accent-2)' : 'var(--mob-bg1)', color: selectedCategory === 'all' ? '#fff' : 'var(--mob-text-2)' }}
                >
                  {t('allServices')}
                </button>
                {categories.slice(0, 8).map(c => (
                  <button
                    key={c.category}
                    onClick={() => setSelectedCategory(c.category)}
                    className="mob_cat"
                    style={{ flexShrink: 0, background: selectedCategory === c.category ? 'var(--mob-accent-2)' : 'var(--mob-bg1)', color: selectedCategory === c.category ? '#fff' : 'var(--mob-text-2)' }}
                  >
                    {CATEGORIES.find(k => k.id === c.category)?.label || c.category}
                    <span className="mob_cat_count" style={{ background: selectedCategory === c.category ? 'rgba(255,255,255,0.2)' : 'var(--mob-bg2)' }}>{c.count}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Geo xato */}
            {geoError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0 0', marginTop: 6 }}>
                <span style={{ color: 'var(--mob-amber)', fontSize: 12, flex: 1 }}>{geoError}</span>
                <button onClick={detectLocation} className="mob_btn mob_btn_sm" style={{ background: 'var(--mob-bg2)', color: 'var(--mob-text)' }}>{t('retryWord')}</button>
              </div>
            )}
          </div>
        </div>

        {/* Overlay: Google Maps uslubidagi "Joylashuvim" tugmasi (doim ko'rinadi) */}
        <button
          style={{
            position: 'absolute', bottom: 30, right: 15, zIndex: 10,
            width: 44, height: 44, borderRadius: '50%',
            background: 'var(--mob-bg1)', border: '1px solid var(--mob-border)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
            color: userLocation ? 'var(--mob-accent)' : 'var(--mob-text-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => {
            if (userLocation) {
              // Joylashuv allaqachon bor — xaritani o'sha joyga markazlash
              const el = document.querySelector('.store-map')
              const map = el && el._leaflet_map
              if (map) { try { map.setView([userLocation.lat, userLocation.lng], 15) } catch {} }
            } else {
              // Joylashuv yo'q — brauzerdan so'raladi, kelgach avtomatik markazlanadi
              centerOnLocateRef.current = true
              detectLocation()
            }
          }}
          aria-label={t('myLocation')}
          title={t('myLocation')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v4m0 12v4m-10-10h4m12 0h4"/>
          </svg>
        </button>

        {/* Overlay: pastki ro'yxat */}
        {showList && (
          <div className="mob_sheet" style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
            maxHeight: '60vh', overflowY: 'auto', borderRadius: '20px 20px 0 0',
            background: 'var(--mob-bg1)', border: '1px solid var(--mob-border)',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
          }}>
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--mob-border)' }} />
            </div>
            <div className="mob_sheet_title" style={{ fontSize: 16, marginBottom: 10 }}>
                {sectionMode === 'products'
                  ? `${filteredProducts.length} ${t('products')}`
                  : `${filteredSellers.length} ${t('storesWord')}`}
              </div>

            {loading ? (
              <div className="mob_loader">
                <div className="mob_spinner" />
                {t('loading')}
              </div>
            ) : sectionMode === 'products' ? (
              filteredProducts.length === 0 ? (
                <div className="mob_empty" style={{ padding: '30px 20px' }}>
                  <div className="mob_empty_title">{t('noProducts') || 'Mahsulot topilmadi'}</div>
                </div>
              ) : (
                <div style={{ padding: '0 0 20px' }}>
                  {filteredProducts.map(p => (
                    <div
                      key={p._id || p.id}
                      onClick={() => navigate(`/product/${p._id || p.id}`)}
                      className="mob_row"
                      style={{ padding: '12px 16px', margin: 0, borderBottom: '1px solid var(--mob-border)', cursor: 'pointer' }}
                    >
                      <div className="mob_row_icon" style={{ background: 'var(--mob-bg2)', overflow: 'hidden' }}>
                        <img src={p.image || '/placeholder.png'} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div className="mob_row_body">
                        <div className="mob_row_title" style={{ fontSize: 14, fontWeight: 600 }}>
                          {p.name}
                        </div>
                        {p.sellerName && <div className="mob_row_sub" style={{ marginTop: 2, fontSize: 12 }}>{p.sellerName}</div>}
                        <div className="mob_row_sub" style={{ marginTop: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: 'var(--mob-accent)', fontWeight: 600 }}>{convertPrice(p.price)}</span>
                          {p.oldPrice > p.price && <s style={{ color: 'var(--mob-muted)' }}>{convertPrice(p.oldPrice)}</s>}
                          {REVIEWS_ENABLED && <span style={{ color: 'var(--mob-amber)', fontSize: 12 }}>&#9733; {p.rating || 0}</span>}
                        </div>
                      </div>
                      <div className="mob_chevron">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : filteredSellers.length === 0 ? (
              <div className="mob_empty" style={{ padding: '30px 20px' }}>
                <div className="mob_empty_title">{t('noStoresFound')}</div>
              </div>
            ) : (
              <div style={{ padding: '0 0 20px' }}>
                {filteredSellers.map(store => (
                  <div
                    key={store._id}
                    onClick={() => { setSelectedStore(store); setShowList(false) }}
                    className="mob_row"
                    style={{ padding: '12px 16px', margin: 0, borderBottom: '1px solid var(--mob-border)', cursor: 'pointer' }}
                  >
                    <div className="mob_row_icon" style={{
                      background: store.color || 'var(--mob-accent)',
                      color: '#fff', overflow: 'hidden',
                    }}>
                      {store.avatar?.startsWith('/') ? <img src={store.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (store.avatar || store.shopName?.[0] || store.name?.[0] || '?')}
                    </div>
                    <div className="mob_row_body">
                      <div className="mob_row_title" style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {store.shopName || store.name}
                        {store.verified && <span style={{ color: '#16a34a', fontSize: 12 }}>&#10003;</span>}
                      </div>
                      <div className="mob_row_sub" style={{ display: 'flex', gap: 10, marginTop: 3 }}>
                        {REVIEWS_ENABLED && <span style={{ color: 'var(--mob-amber)' }}>&#9733; {store.rating || 0}</span>}
                        <span>{store.workingHours || '09:00-18:00'}</span>
                      </div>
                    </div>
                    <div className="mob_chevron">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>

      {/* ═══ To'liq ekranli QIDIRUV OYNASI ═══ */}
      {searchOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'var(--mob-bg1)', display: 'flex', flexDirection: 'column' }}>
          {/* Yuqori panel: orqaga + qidiruv maydoni */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px 10px', borderBottom: '1px solid var(--mob-border)' }}>
            <button
              style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0 }}
              onClick={() => setSearchOpen(false)}
aria-label={t('back')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <div className="mob_search" style={{ flex: 1, margin: 0, height: 44, background: 'var(--mob-bg2)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mob-muted)" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                autoFocus
                placeholder={sectionMode === 'products' ? t('searchProduct') : t('searchStores')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} aria-label={t('clear')} style={{ background: 'none', padding: 4, display: 'flex', alignItems: 'center', color: 'var(--mob-muted)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              )}
            </div>
          </div>

          {/* Natijalar ro'yxati */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0 90px' }}>
            {loading ? (
              <div className="mob_loader"><div className="mob_spinner" />{t('loading')}</div>
            ) : sectionMode === 'products' ? (
                  filteredProducts.length === 0 ? (
                    <div className="mob_empty">
                      <div className="mob_empty_title">{t('nothingFound')}</div>
                      <div style={{ fontSize: 13, color: 'var(--mob-text-2)' }}>&laquo;{searchQuery}&raquo; {t('storeNotFoundHint')}</div>
                    </div>
                  ) : (
                    <>
                      <div style={{ padding: '6px 16px', fontSize: 12, fontWeight: 700, color: 'var(--mob-text-2)' }}>
                        {filteredProducts.length} {t('resultsFound')}
                      </div>
                      {filteredProducts.map(p => (
                        <div
                          key={p._id || p.id}
                          onClick={() => { setSearchOpen(false); navigate(`/product/${p._id || p.id}`) }}
                          className="mob_row"
                          style={{ padding: '12px 16px', margin: 0, borderBottom: '1px solid var(--mob-border)', cursor: 'pointer' }}
                        >
                          <div className="mob_row_icon" style={{ background: 'var(--mob-bg2)', overflow: 'hidden' }}>
                            <img src={p.image || '/placeholder.png'} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                          <div className="mob_row_body">
                            <div className="mob_row_title" style={{ fontSize: 14 }}>{p.name}</div>
                            {p.sellerName && <div className="mob_row_sub" style={{ fontSize: 12 }}>{p.sellerName}</div>}
                            <div className="mob_row_sub" style={{ display: 'flex', gap: 8, marginTop: 3 }}>
                              <span style={{ color: 'var(--mob-accent)', fontWeight: 600 }}>{convertPrice(p.price)}</span>
                              {p.oldPrice > p.price && <s style={{ color: 'var(--mob-muted)' }}>{convertPrice(p.oldPrice)}</s>}
                            </div>
                          </div>
                          <div className="mob_chevron">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                          </div>
                        </div>
                      ))}
                    </>
                  )
                ) : searchResults.length === 0 ? (
              <div className="mob_empty">
                <div className="mob_empty_title">{t('nothingFound')}</div>
                <div style={{ fontSize: 13, color: 'var(--mob-text-2)' }}>&laquo;{searchQuery}&raquo; {t('storeNotFoundHint')}</div>
              </div>
            ) : (
              <>
                <div style={{ padding: '6px 16px', fontSize: 12, fontWeight: 700, color: 'var(--mob-text-2)' }}>
                  {searchResults.length} {t('resultsFound')}
                </div>
                {searchResults.map(store => (
                  <div
                    key={store._id || store.id}
                    onClick={() => selectFromSearch(store)}
                    className="mob_row"
                    style={{ padding: '12px 16px', margin: 0, borderBottom: '1px solid var(--mob-border)', cursor: 'pointer' }}
                  >
                    <div className="mob_row_icon" style={{ background: store.color || 'var(--mob-accent)', color: '#fff', overflow: 'hidden' }}>
                      {store.avatar?.startsWith('/') ? <img src={store.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (store.avatar || store.shopName?.[0] || store.name?.[0] || '?')}
                    </div>
                    <div className="mob_row_body">
                      <div className="mob_row_title" style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {store.shopName || store.name}
                        {store.verified && <span style={{ color: '#16a34a', fontSize: 12 }}>&#10003;</span>}
                      </div>
                      <div className="mob_row_sub" style={{ display: 'flex', gap: 10, marginTop: 3 }}>
                        {REVIEWS_ENABLED && <span style={{ color: 'var(--mob-amber)' }}>&#9733; {store.rating || 0}</span>}
                        <span>{store.location || store.workingHours || '09:00-18:00'}</span>
                      </div>
                    </div>
                    <div className="mob_chevron">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
