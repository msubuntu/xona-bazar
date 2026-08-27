import { useState, useEffect, useCallback } from 'react'
import { useCart } from '../context/CartContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useSeller } from '../context/SellerContext.jsx'
import { api } from '../services/api'
import { getGeoErrorMessage } from '../services/geo'
import Header from './header'
import Footer from './Footer'
import StoreMap from './StoreMap'
import '../components_css/storesmap.css'

function StoresMapPage() {
  const { goHome } = useCart()
  const { t } = useSettings()
  const { openSeller } = useSeller()
  const [userLocation, setUserLocation] = useState(null)
  const [geoError, setGeoError] = useState('')
  const [selectedStore, setSelectedStore] = useState(null)
  const [sellers, setSellers] = useState([])
  const [loading, setLoading] = useState(true)

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

  const loadSellers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.sellers.list()
      setSellers((data.sellers || []).filter(s => s.lat && s.lng))
    } catch (err) {
      console.error('Load sellers error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadSellers() }, [loadSellers])

  return (
    <div className="smp">
      <Header />
      <div className="container">
        <div className="smp_breadcrumb">
          <span onClick={goHome}>{t('home')}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          <span className="active">{t('storeOnMap')}</span>
        </div>

        {geoError && (
          <div className="pd_geo_error" style={{ margin: '16px 0' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>{geoError}</span>
            <button onClick={detectLocation}>Qayta urinish</button>
          </div>
        )}

        <div className="smp_body">
          <div className="smp_map_col">
            <StoreMap
              stores={sellers}
              userLocation={userLocation}
              selectedStoreId={selectedStore?._id}
              height="calc(100vh - 200px)"
            />
          </div>
          <div className="smp_list_col">
            <div className="smp_list_header">
              <h2>{t('nearbyStores')}</h2>
              <span className="smp_count">{sellers.length} ta do'kon</span>
            </div>
            <div className="smp_store_list">
              {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Yuklanmoqda...</div>
              ) : sellers.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Joylashuvi belgilangan do'konlar topilmadi</div>
              ) : sellers.map(store => (
                  <div
                    className={`smp_store_card ${selectedStore?._id === store._id ? 'active' : ''}`}
                    key={store._id}
                    onClick={() => { setSelectedStore(store); openSeller(store) }}
                  >
                    <div className="smp_store_top">
                      <div className="smp_store_avatar" style={store.avatar?.startsWith('/') ? { background: 'var(--bg-secondary, #f3f4f6)', overflow: 'hidden' } : { background: 'var(--accent, #2bc32b)' }}>
                        {store.avatar?.startsWith('/') ? (
                          <img src={store.avatar} alt={store.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          store.avatar || store.name?.[0] || '?'
                        )}
                      </div>
                      <div className="smp_store_info">
                        <div className="smp_store_name">
                          {store.shopName || store.name}
                          {store.verified && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                          )}
                        </div>
                        <div className="smp_store_meta">
                          <span className="smp_store_rating">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                            {store.rating || 0}
                          </span>
                          <span>{store.reviewCount || 0} sharh</span>
                        </div>
                      </div>
                    </div>
                    <div className="smp_store_bottom">
                      <span className="smp_store_location">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        {store.location || "Manzil belgilanmagan"}
                      </span>
                      <span className="smp_store_hours">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        {store.workingHours || '09:00 - 18:00'}
                      </span>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default StoresMapPage
