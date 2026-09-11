import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const TASHKENT = [41.2995, 69.2401]

export default function MobileLocationPicker() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, updateProfile } = useAuth()
  const { t, lang } = useSettings()
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markerRef = useRef(null)

  const [coords, setCoords] = useState(() => {
    const s = location.state
    if (s && s.lat && s.lng) return { lat: s.lat, lng: s.lng }
    return null
  })
  const [detecting, setDetecting] = useState(false)
  const [geoError, setGeoError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const initial = coords || TASHKENT
    const zoom = coords ? 15 : 12

    const map = L.map(mapRef.current, { center: initial, zoom, zoomControl: false })
    L.control.zoom({ position: 'topright' }).addTo(map)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map)

    const placeMarker = (lat, lng) => {
      map.setView([lat, lng], Math.max(map.getZoom(), 15))
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
      } else {
        markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map)
        markerRef.current.on('dragend', (e) => {
          const p = e.target.getLatLng()
          setCoords({ lat: p.lat, lng: p.lng })
        })
      }
      markerRef.current.bindPopup(t('placeHere')).openPopup()
      setCoords({ lat, lng })
    }

    map.on('click', (e) => placeMarker(e.latlng.lat, e.latlng.lng))

    if (coords) placeMarker(coords.lat, coords.lng)

    mapInstance.current = map
    if (mapRef.current) mapRef.current._leaflet_map = map

    return () => {
      map.remove()
      mapInstance.current = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setGeoError(t('geolocationNotSupported'))
      return
    }
    setDetecting(true)
    setGeoError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const map = mapInstance.current
        if (map) {
          map.setView([pos.coords.latitude, pos.coords.longitude], 16)
          if (markerRef.current) {
            markerRef.current.setLatLng([pos.coords.latitude, pos.coords.longitude])
          } else {
            const m = L.marker([pos.coords.latitude, pos.coords.longitude], { draggable: true }).addTo(map)
            m.on('dragend', (e) => {
              const p = e.target.getLatLng()
              setCoords({ lat: p.lat, lng: p.lng })
            })
            markerRef.current = m
          }
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        }
        setDetecting(false)
      },
      () => {
        setGeoError(t('geoFailed'))
        setDetecting(false)
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      const url = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=' + (lang === 'ru' ? 'ru' : lang === 'en' ? 'en' : 'uz') + '&lat=' + lat + '&lon=' + lng
      const res = await fetch(url)
      if (!res.ok) return null
      const data = await res.json()
      if (!data || !data.display_name) return null
      return data.display_name.split(',').slice(0, 3).join(',').trim()
    } catch {
      return null
    }
  }, [])

  const confirm = async () => {
    if (!coords || saving) return
    setSaving(true)
    setSaveError('')
    const placeName = await reverseGeocode(coords.lat, coords.lng)
    try {
      const accepted = placeName || user?.location || ''
      await updateProfile({
        name: user?.name,
        shopName: user?.shopName,
        location: accepted,
        description: user?.description,
        lat: coords.lat,
        lng: coords.lng,
      })
      navigate(location.state?.returnPath || '/seller-dashboard', {
        state: { tab: 'settings', lat: coords.lat, lng: coords.lng, locationName: accepted },
      })
    } catch (err) {
      setSaveError(err.message || t('errorOccurred'))
      setSaving(false)
    }
  }

  return (
    <div className="mob">
      <div className="mob_page_head">
        <button className="mob_back" onClick={() => navigate(location.state?.returnPath || '/seller-dashboard')}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div className="mob_page_title">{t('setLocation')}</div>
      </div>

      <div className="mob_loc_map" ref={mapRef} />

      <div className="mob_loc_sheet">
        <div className="mob_loc_coords">
          {coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : t('pickFromMap')}
        </div>
        {geoError && <div className="mob_field_error" style={{ marginBottom: 8 }}>{geoError}</div>}
        <button type="button" className="mob_btn mob_btn_ghost" onClick={detectLocation} disabled={detecting}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4m-10-10h4m12 0h4"/></svg>
          {detecting ? t('detecting') : t('detectMyLocation')}
        </button>
        {saveError && <div className="mob_field_error" style={{ marginBottom: 8 }}>{saveError}</div>}
        <button type="button" className="mob_btn" onClick={confirm} disabled={!coords || saving}>
          {saving ? t('saving') : t('confirmPlace')}
        </button>
      </div>
    </div>
  )
}