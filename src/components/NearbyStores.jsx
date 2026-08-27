import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useSettings } from '../context/SettingsContext.jsx'
import { useSeller } from '../context/SellerContext.jsx'
import { api } from '../services/api'
import { getGeoErrorMessage } from '../services/geo'
import '../components_css/nearbystores.css'

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

function estimateTime(km) {
  const walkingMin = Math.round(km / 5 * 60)
  if (walkingMin < 2) return 'Hozir yetasiz'
  if (walkingMin < 60) return `~${walkingMin} daqiqa piyoda`
  const hours = Math.floor(walkingMin / 60)
  const mins = walkingMin % 60
  return `~${hours} soat ${mins > 0 ? mins + ' daq' : ''}`
}

function StoreAvatar({ store, size = 40 }) {
  const isImage = store.avatar && store.avatar.startsWith('/')
  return (
    <div className="ns_card_avatar" style={{ width: size, height: size, background: isImage ? 'var(--bg-secondary, #f3f4f6)' : (store.color || 'var(--accent, #2bc32b)') }}>
      {isImage ? (
        <img src={store.avatar} alt={store.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
      ) : (
        store.avatar || (store.name || '?')[0].toUpperCase()
      )}
    </div>
  )
}

function NearbyStores({ currentProduct, userLocation, compact = false }) {
  const { t, convertPrice } = useSettings()
  const { openSeller } = useSeller()
  const [userLoc, setUserLoc] = useState(userLocation || null)
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState('')
  const [sortBy, setSortBy] = useState('distance')
  const [allSellers, setAllSellers] = useState([])

  const loadSellers = useCallback(async () => {
    try {
      const data = await api.sellers.list()
      setAllSellers(data.sellers || [])
    } catch (err) {
      console.error('Load sellers error:', err)
    }
  }, [])

  useEffect(() => { loadSellers() }, [loadSellers])

  const geoAttempted = useRef(false)

  useEffect(() => {
    if (userLoc || geoAttempted.current) return
    if (!navigator.geolocation) return
    geoAttempted.current = true
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGeoError('')
      },
      (err) => setGeoError(getGeoErrorMessage(err)),
      { timeout: 8000, maximumAge: 300000 }
    )
  }, [userLoc])

  const storesWithInfo = useMemo(() => {
    return allSellers.map(store => {
      const storeId = store._id || store.id
      const currentSellerId = currentProduct?.sellerId?._id || currentProduct?.sellerId
      const storeProduct = currentSellerId === storeId
        ? currentProduct
        : null

      let distance = null
      let distanceText = ''
      let walkTime = ''
      if (userLoc && store.lat && store.lng) {
        distance = getDistance(userLoc.lat, userLoc.lng, store.lat, store.lng)
        distanceText = formatDistance(distance)
        walkTime = estimateTime(distance)
      }

      return {
        ...store,
        id: storeId,
        distance,
        distanceText,
        walkTime,
        hasProduct: !!storeProduct,
        storeProduct: storeProduct || null,
        price: storeProduct?.price || null,
        isCurrentStore: currentSellerId === storeId,
      }
    })
  }, [currentProduct, allSellers, userLoc])

  const sortedStores = useMemo(() => {
    const list = [...storesWithInfo]
    switch (sortBy) {
      case 'distance':
        list.sort((a, b) => {
          if (a.distance !== null && b.distance !== null) return a.distance - b.distance
          if (a.distance !== null) return -1
          if (b.distance !== null) return 1
          return 0
        })
        break
      case 'cheapest':
        list.sort((a, b) => {
          if (a.price && b.price) return a.price - b.price
          if (a.price) return -1
          if (b.price) return 1
          return 0
        })
        break
      case 'rating':
        list.sort((a, b) => b.rating - a.rating)
        break
      default:
        break
    }
    return list
  }, [storesWithInfo, sortBy])

  const withProduct = sortedStores.filter(s => s.hasProduct)
  const withoutProduct = sortedStores.filter(s => !s.hasProduct)

  if (!currentProduct) return null

  return (
    <div className={`nearby-stores ${compact ? 'compact' : ''}`}>
      <div className="ns_header">
        <h3>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          {t('nearbyStores')}
        </h3>
        {!userLoc && (
          <button className="ns_locate_btn" onClick={() => {
            setLocating(true)
            setGeoError('')
            navigator.geolocation?.getCurrentPosition(
              (pos) => {
                setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude })
                setLocating(false)
                setGeoError('')
              },
              (err) => {
                setLocating(false)
                setGeoError(getGeoErrorMessage(err))
              },
              { timeout: 8000, maximumAge: 300000 }
            )
          }} disabled={locating}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v4m0 12v4m-10-10h4m12 0h4"/>
            </svg>
            {locating ? t('locating') : t('findMe')}
          </button>
        )}
      </div>

      {geoError && !userLoc && (
        <div className="ns_geo_error">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>{geoError}</span>
          <button onClick={() => {
            setLocating(true)
            setGeoError('')
            navigator.geolocation?.getCurrentPosition(
              (pos) => {
                setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude })
                setLocating(false)
              },
              (err) => {
                setLocating(false)
                setGeoError(getGeoErrorMessage(err))
              },
              { timeout: 8000, maximumAge: 300000 }
            )
          }}>Qayta urinish</button>
        </div>
      )}

      {userLoc && (
        <div className="ns_sort_bar">
          <span className="ns_sort_label">Saralash:</span>
          <div className="ns_sort_btns">
            <button className={sortBy === 'distance' ? 'active' : ''} onClick={() => setSortBy('distance')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              Eng yaqin
            </button>
            <button className={sortBy === 'cheapest' ? 'active' : ''} onClick={() => setSortBy('cheapest')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Eng arzon
            </button>
            <button className={sortBy === 'rating' ? 'active' : ''} onClick={() => setSortBy('rating')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              Eng yaxshi
            </button>
          </div>
        </div>
      )}

      {withProduct.length > 0 && (
        <div className="ns_section">
          <h4>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            {t('storesWithProduct')} ({withProduct.length})
          </h4>
          <div className="ns_list">
            {withProduct.map(store => (
              <div
                className={`ns_card ${store.isCurrentStore ? 'current' : ''} ${store.distance !== null && store.distance < 1 ? 'ns_near' : ''}`}
                key={store.id}
                onClick={() => openSeller(store)}
              >
                <div className="ns_card_left">
                  <StoreAvatar store={store} />
                  <div className="ns_card_info">
                    <div className="ns_card_name">
                      {store.name}
                      {store.isCurrentStore && <span className="ns_current_badge">{t('currentStore')}</span>}
                    </div>
                    <div className="ns_card_meta">
                      {store.distanceText && (
                        <span className="ns_distance">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                          </svg>
                          {store.distanceText}
                        </span>
                      )}
                      {store.walkTime && (
                        <span className="ns_walk_time">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          {store.walkTime}
                        </span>
                      )}
                      <span className="ns_rating">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                        {store.rating}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="ns_card_right">
                  <div className="ns_price">{convertPrice(store.price)}</div>
                  {store.isCurrentStore && <span className="ns_here">{t('here')}</span>}
                  {!store.isCurrentStore && store.price < currentProduct.price && (
                    <span className="ns_cheaper">
                      -{Math.round((1 - store.price / currentProduct.price) * 100)}%
                    </span>
                  )}
                  {!store.isCurrentStore && store.price > currentProduct.price && (
                    <span className="ns_expensive">
                      +{Math.round((store.price / currentProduct.price - 1) * 100)}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {withoutProduct.length > 0 && (
        <div className="ns_section ns_other">
          <h4>{t('otherStores')} ({withoutProduct.length})</h4>
          <div className="ns_list">
            {withoutProduct.map(store => (
              <div className="ns_card other" key={store.id} onClick={() => openSeller(store)}>
                <div className="ns_card_left">
                  <StoreAvatar store={store} />
                  <div className="ns_card_info">
                    <div className="ns_card_name">{store.name}</div>
                    <div className="ns_card_meta">
                      {store.distanceText && (
                        <span className="ns_distance">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                          </svg>
                          {store.distanceText}
                        </span>
                      )}
                      <span>{store.location}</span>
                    </div>
                  </div>
                </div>
                <div className="ns_card_right">
                  <span className="ns_no_product">{t('noProduct')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export { getDistance, formatDistance }
export default NearbyStores
