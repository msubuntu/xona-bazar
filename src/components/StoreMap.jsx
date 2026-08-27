import { useEffect, useRef, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '../components_css/storemap.css'

function StoreMap({ stores, userLocation, selectedStoreId, height = '350px', currentProduct = null }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef([])
  const userMarkerRef = useRef(null)
  const storesRef = useRef(stores)

  storesRef.current = stores

  const formatPrice = useCallback((price) => {
    if (!price) return null
    return price.toLocaleString() + " so'm"
  }, [])

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const center = userLocation
      ? [userLocation.lat, userLocation.lng]
      : [41.2995, 69.2401]

    mapInstance.current = L.map(mapRef.current, {
      center,
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
    })

    L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(mapInstance.current)

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [])

  useEffect(() => {
    const map = mapInstance.current
    if (!map) return

    markersRef.current.forEach(m => map.removeLayer(m))
    markersRef.current = []

    stores.forEach(store => {
      if (!store.lat || !store.lng) return

      const isSelected = store.id === selectedStoreId || store._id === selectedStoreId
      const storeColor = store.color || '#16a34a'
      const hasAvatarImage = store.avatar && store.avatar.startsWith('/')
      const storeLetter = (store.name || '?')[0].toUpperCase()
      const storeName = store.shopName || store.name || 'Do\'kon'
      const storePrice = currentProduct && store.storePrice ? store.storePrice : null
      const priceText = storePrice ? formatPrice(storePrice) : null

      const icon = L.divIcon({
        className: 'store-marker',
        html: `
          <div class="marker-container">
            <div class="marker-pin ${isSelected ? 'selected' : ''}" style="background:${hasAvatarImage ? '#fff' : storeColor}">
              ${hasAvatarImage
                ? `<img class="marker-avatar-img" src="${store.avatar}" alt="${storeName}"
                     onerror="this.outerHTML='<span class=&quot;marker-avatar&quot;&gt;${storeLetter}&lt;/span>'" />`
                : `<span class="marker-avatar">${storeLetter}</span>`
              }
            </div>
            <div class="marker-label ${isSelected ? 'selected' : ''}">
              <span class="marker-name">${storeName.length > 14 ? storeName.slice(0, 14) + '...' : storeName}</span>
              ${priceText ? `<span class="marker-price">${priceText}</span>` : ''}
            </div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      })

      const popupContent = `
        <div class="map-popup-card">
          <div class="popup-header">
            <div class="popup-avatar" style="background:${hasAvatarImage ? 'var(--bg-secondary, #f3f4f6)' : storeColor}">
              ${hasAvatarImage
                ? `<img src="${store.avatar}" alt="${storeName}"
                     onerror="this.outerHTML='<span style=&quot;font-weight:700&quot;>${storeLetter}</span>'"
                     style="width:100%;height:100%;object-fit:cover;border-radius:inherit" />`
                : `<span style="font-weight:700">${storeLetter}</span>`
              }
            </div>
            <div class="popup-header-info">
              <strong class="popup-name">${storeName}</strong>
              <span class="popup-location">
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                ${store.location || 'Manzil belgilanmagan'}
              </span>
            </div>
          </div>
          <div class="popup-stats">
            <div class="popup-stat">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <span>${store.rating || 0} <span class="popup-review-count">(${store.reviewCount || 0})</span></span>
            </div>
            ${store.distanceText ? `
            <div class="popup-stat popup-distance">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>${store.distanceText} masofada</span>
            </div>
            ` : ''}
          </div>
          ${storePrice ? `
          <div class="popup-price-row">
            <span class="popup-price-label">Narx:</span>
            <span class="popup-price-value">${formatPrice(storePrice)}</span>
          </div>
          ` : ''}
          <button class="popup-btn" data-store-id="${store._id || store.id}">
            Yo'nalish olish
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      `

      const marker = L.marker([store.lat, store.lng], { icon })
        .addTo(map)
        .bindPopup(popupContent, {
          maxWidth: 280,
          minWidth: 220,
          className: 'store-popup-wrapper',
          closeButton: true,
        })

      marker.on('popupopen', () => {
        const popup = marker.getPopup()
        if (!popup) return
        const el = popup.getElement()
        if (!el) return
        const btn = el.querySelector('.popup-btn')
        if (btn) {
          btn.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            window.__storeMapSelect(String(store._id || store.id))
          })
        }
      })

      marker.on('click', () => {
        const id = String(store._id || store.id)
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}`, '_blank')
      })

      markersRef.current.push(marker)
    })

    if (userLocation) {
      const userIcon = L.divIcon({
        className: 'user-marker',
        html: `
          <div class="user-marker-container">
            <div class="user-marker-ring"></div>
            <div class="user-marker-dot"></div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      })
      const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup('<div class="map-popup-card"><strong>Sizning joylashuvingiz</strong></div>', {
          className: 'store-popup-wrapper',
        })
      userMarkerRef.current = userMarker
      markersRef.current.push(userMarker)
    }

    if (stores.length > 0) {
      const validStores = stores.filter(s => s.lat && s.lng)
      if (validStores.length > 0) {
        const bounds = L.latLngBounds(validStores.map(s => [s.lat, s.lng]))
        if (userLocation) bounds.extend([userLocation.lat, userLocation.lng])
        try { map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 }) } catch {}
      }
    }

    const handleZoom = () => {
      const zoom = map.getZoom()
      const pins = mapRef.current?.querySelectorAll('.marker-pin')
      if (pins) {
        pins.forEach(pin => {
          if (zoom <= 11) pin.classList.add('small')
          else pin.classList.remove('small')
        })
      }
      const labels = mapRef.current?.querySelectorAll('.marker-label')
      if (labels) {
        labels.forEach(label => {
          label.style.display = zoom >= 13 ? 'flex' : 'none'
        })
      }
    }
    map.on('zoomend', handleZoom)
    handleZoom()
  }, [stores, userLocation, selectedStoreId, currentProduct, formatPrice])

  useEffect(() => {
    window.__storeMapSelect = (storeId) => {
      const id = String(storeId)
      const store = storesRef.current.find(s => String(s._id || s.id) === id)
      if (store && store.lat && store.lng) {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}`, '_blank')
      }
    }
    return () => { delete window.__storeMapSelect }
  }, [])

  useEffect(() => {
    const map = mapInstance.current
    if (!map) return
    const t = setTimeout(() => {
      try { map.invalidateSize() } catch {}
    }, 300)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="store-map-wrapper" style={{ height }}>
      <div ref={mapRef} className="store-map" />
      {userLocation && (
        <button className="store-map-center-btn" onClick={() => {
          mapInstance.current?.setView([userLocation.lat, userLocation.lng], 14)
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v4m0 12v4m-10-10h4m12 0h4"/>
          </svg>
        </button>
      )}
    </div>
  )
}

export default StoreMap
