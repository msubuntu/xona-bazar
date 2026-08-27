import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '../components_css/locationpicker.css'

const TASHKENT = [41.2995, 69.2401]

function LocationPicker({ lat, lng, onChange }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markerRef = useRef(null)
  const [geoError, setGeoError] = useState(null)
  const [detecting, setDetecting] = useState(false)

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const center = (lat && lng) ? [lat, lng] : TASHKENT
    const zoom = (lat && lng) ? 14 : 12

    const map = L.map(mapRef.current, { center, zoom, zoomControl: false })
    L.control.zoom({ position: 'topright' }).addTo(map)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map)

    if (lat && lng) {
      markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map)
      markerRef.current.on('dragend', (e) => {
        const pos = e.target.getLatLng()
        onChange?.({ lat: pos.lat, lng: pos.lng })
      })
    }

    map.on('click', (e) => {
      const { lat: newLat, lng: newLng } = e.latlng
      if (markerRef.current) {
        markerRef.current.setLatLng([newLat, newLng])
      } else {
        markerRef.current = L.marker([newLat, newLng], { draggable: true }).addTo(map)
        markerRef.current.on('dragend', (ev) => {
          const pos = ev.target.getLatLng()
          onChange?.({ lat: pos.lat, lng: pos.lng })
        })
      }
      onChange?.({ lat: newLat, lng: newLng })
    })

    mapInstance.current = map

    return () => {
      map.remove()
      mapInstance.current = null
      markerRef.current = null
    }
  }, [])

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation qo\'llab-quvvatlanmaydi')
      return
    }
    setDetecting(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: newLat, longitude: newLng } = pos.coords
        const map = mapInstance.current
        if (!map) return
        map.setView([newLat, newLng], 15)
        if (markerRef.current) {
          markerRef.current.setLatLng([newLat, newLng])
        } else {
          markerRef.current = L.marker([newLat, newLng], { draggable: true }).addTo(map)
          markerRef.current.on('dragend', (e) => {
            const p = e.target.getLatLng()
            onChange?.({ lat: p.lat, lng: p.lng })
          })
        }
        onChange?.({ lat: newLat, lng: newLng })
        setDetecting(false)
      },
      () => {
        setGeoError('Joylashuvni aniqlab bo\'lmadi, xaritadan qo\'lda belgilang')
        setDetecting(false)
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  return (
    <div className="lp">
      <button className="lp_gps" type="button" onClick={detectLocation} disabled={detecting}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v4m0 12v4m-10-10h4m12 0h4"/>
        </svg>
        {detecting ? 'Aniqlanmoqda...' : '📍 Joriy joylashuvimni aniqlash'}
      </button>
      {geoError && <p className="lp_error">{geoError}</p>}
      <div className="lp_map_wrap">
        <div ref={mapRef} className="lp_map" />
      </div>
      {lat && lng && (
        <div className="lp_coords">
          <span>{lat.toFixed(5)}, {lng.toFixed(5)}</span>
        </div>
      )}
      <p className="lp_hint">Xaritaga bosib yoki marker surib joylashuvni belgilang</p>
    </div>
  )
}

export default LocationPicker
