import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { SERVICE_TYPES, DISTRICTS } from '../data/craftsmen.js'
import { getGeoErrorMessage } from '../services/geo'
import '../components_css/auth.css'

function AuthModal() {
  const { showAuth, authMode, login, register, switchMode, setShowAuth, loading, error } = useAuth()
  const { t } = useSettings()
  const [showPass, setShowPass] = useState(false)

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [regForm, setRegForm] = useState({
    name: '', email: '', phone: '', password: '', confirm: '',
    role: 'buyer',
    shopName: '', location: '', description: '', lat: null, lng: null,
    services: [], experience: '', district: '', priceRange: '',
  })
  const [errors, setErrors] = useState({})

  const [showMap, setShowMap] = useState(false)
  const [mapLoading, setMapLoading] = useState(false)
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)

  const regFormRef = useRef(regForm)
  regFormRef.current = regForm

  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=uz,ru,en`)
      const data = await res.json()
      if (data && data.display_name) {
        const parts = data.display_name.split(', ')
        const short = parts.slice(0, 3).join(', ')
        setRegForm(prev => ({ ...prev, location: short, lat, lng }))
        return short
      }
    } catch {}
    setRegForm(prev => ({ ...prev, lat, lng }))
    return null
  }, [])

  useEffect(() => {
    if (!showMap || !mapContainerRef.current) return
    if (mapInstanceRef.current) return

    const L = window.L
    if (!L) return

    const defaultLat = regFormRef.current.lat || 41.2995
    const defaultLng = regFormRef.current.lng || 69.2401

    mapInstanceRef.current = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(mapInstanceRef.current)

    L.control.zoom({ position: 'topright' }).addTo(mapInstanceRef.current)

    if (regFormRef.current.lat && regFormRef.current.lng) {
      markerRef.current = L.marker([regFormRef.current.lat, regFormRef.current.lng])
        .addTo(mapInstanceRef.current)
    }

    mapInstanceRef.current.on('click', (e) => {
      const { lat, lng } = e.latlng
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
      } else {
        markerRef.current = L.marker([lat, lng]).addTo(mapInstanceRef.current)
      }
      reverseGeocode(lat, lng)
    })

    setTimeout(() => {
      if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize()
    }, 200)

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        markerRef.current = null
      }
    }
  }, [showMap, reverseGeocode])

  const handleLocateMe = () => {
    if (!navigator.geolocation) return
    setMapLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 16)
          const L = window.L
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng])
          } else if (L) {
            markerRef.current = L.marker([lat, lng]).addTo(mapInstanceRef.current)
          }
        }
        reverseGeocode(lat, lng)
        setMapLoading(false)
      },
      (err) => {
        setMapLoading(false)
        console.warn('Geo error:', getGeoErrorMessage(err))
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  if (!showAuth) return null

  const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

  const handleLogin = (e) => {
    e.preventDefault()
    const errs = {}
    if (!loginForm.email) errs.email = t('enterEmail')
    else if (!validateEmail(loginForm.email)) errs.email = t('wrongEmail')
    if (!loginForm.password) errs.password = t('enterPassword')
    else if (loginForm.password.length < 6) errs.password = t('minChars6')

    if (Object.keys(errs).length) { setErrors(errs); return }
    login(loginForm.email, loginForm.password)
  }

  const handleRegister = (e) => {
    e.preventDefault()
    const errs = {}
    if (!regForm.name.trim()) errs.name = t('enterName')
    if (!regForm.email) errs.email = t('enterEmail')
    else if (!validateEmail(regForm.email)) errs.email = t('wrongEmail')
    if (!regForm.phone) errs.phone = t('enterPhone')
    else if (regForm.phone.length < 9) errs.phone = t('minDigits9')
    if (!regForm.password) errs.password = t('enterPassword')
    else if (regForm.password.length < 6) errs.password = t('minChars6')
    if (regForm.password !== regForm.confirm) errs.confirm = t('passwordsNoMatch')

    if (regForm.role === 'seller') {
      if (!regForm.shopName.trim()) errs.shopName = t('enterShopName')
      if (!regForm.location.trim()) errs.location = t('enterLocation')
    }
    if (regForm.role === 'craftsman') {
      if (!regForm.services.length) errs.services = t('selectService')
      if (!regForm.district) errs.district = t('selectDistrict')
    }

    if (Object.keys(errs).length) { setErrors(errs); return }

    const extra = {}
    if (regForm.role === 'seller') {
      extra.shopName = regForm.shopName.trim()
      extra.location = regForm.location.trim()
      extra.description = regForm.description.trim()
      if (regForm.lat && regForm.lng) {
        extra.lat = regForm.lat
        extra.lng = regForm.lng
      }
    } else if (regForm.role === 'craftsman') {
      extra.services = regForm.services
      extra.experience = regForm.experience
      extra.district = regForm.district
      extra.priceRange = regForm.priceRange
    }

    register({
      name: regForm.name.trim(),
      email: regForm.email,
      phone: regForm.phone,
      password: regForm.password,
      role: regForm.role,
      ...extra,
    })
  }

  const close = () => {
    setShowAuth(false)
    setErrors({})
    setShowPass(false)
    setShowMap(false)
  }

  const toggleService = (id) => {
    setRegForm(prev => ({
      ...prev,
      services: prev.services.includes(id)
        ? prev.services.filter(s => s !== id)
        : [...prev.services, id],
    }))
  }

  const setRole = (role) => {
    setRegForm(prev => ({ ...prev, role }))
    setErrors({})
    setShowMap(false)
  }

  const toggleMap = () => {
    setShowMap(prev => !prev)
  }

  return (
    <div className="auth_overlay" onClick={close}>
      <div className="auth_modal" onClick={e => e.stopPropagation()}>
        <button className="auth_close" onClick={close}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div className="auth_header">
          <div className="auth_logo">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
          </div>
          <h2>{authMode === 'login' ? t('loginTitle') : t('registerTitle')}</h2>
          <p>{authMode === 'login' ? t('loginDesc') : t('registerDesc')}</p>
        </div>

        {authMode === 'register' && (
          <div className="auth_roles">
            <button type="button" className={`auth_role_card ${regForm.role === 'buyer' ? 'active' : ''}`} onClick={() => setRole('buyer')}>
              <span className="auth_role_icon">👤</span>
              <span className="auth_role_label">{t('roleBuyer')}</span>
              <span className="auth_role_desc">{t('roleBuyerDesc')}</span>
            </button>
            <button type="button" className={`auth_role_card ${regForm.role === 'seller' ? 'active' : ''}`} onClick={() => setRole('seller')}>
              <span className="auth_role_icon">🏪</span>
              <span className="auth_role_label">{t('roleSeller')}</span>
              <span className="auth_role_desc">{t('roleSellerDesc')}</span>
            </button>
            <button type="button" className={`auth_role_card ${regForm.role === 'craftsman' ? 'active' : ''}`} onClick={() => setRole('craftsman')}>
              <span className="auth_role_icon">🔧</span>
              <span className="auth_role_label">{t('roleCraftsman')}</span>
              <span className="auth_role_desc">{t('roleCraftsmanDesc')}</span>
            </button>
          </div>
        )}

        <div className="auth_socials">
          <button className="auth_social google">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </button>
          <button className="auth_social facebook">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Facebook
          </button>
        </div>

        <div className="auth_divider">
          <span>{t('or')}</span>
        </div>

        {error && <div className="auth_error_global" style={{ color: '#ef4444', textAlign: 'center', fontSize: 13, marginBottom: 8 }}>{error}</div>}

        {authMode === 'login' ? (
          <form className="auth_form" onSubmit={handleLogin}>
            <div className={`auth_field ${errors.email ? 'error' : ''}`}>
              <label>{t('email')}</label>
              <div className="auth_input_wrap">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <input type="email" placeholder="email@example.com"
                  value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})} />
              </div>
              {errors.email && <span className="auth_error">{errors.email}</span>}
            </div>

            <div className={`auth_field ${errors.password ? 'error' : ''}`}>
              <label>{t('password')}</label>
              <div className="auth_input_wrap">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                <input type={showPass ? 'text' : 'password'} placeholder={t('minChars6')}
                  value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
                <button type="button" className="auth_eye" onClick={() => setShowPass(!showPass)}>
                  {showPass ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              {errors.password && <span className="auth_error">{errors.password}</span>}
            </div>

            <div className="auth_options">
              <label className="auth_checkbox">
                <input type="checkbox" /> {t('rememberMe')}
              </label>
              <a href="#" className="auth_forgot">{t('forgotPassword')}</a>
            </div>

            <button type="submit" className="auth_submit" disabled={loading}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              {loading ? '...' : t('loginBtn')}
            </button>
          </form>
        ) : (
          <form className="auth_form" onSubmit={handleRegister}>
            <div className={`auth_field ${errors.name ? 'error' : ''}`}>
              <label>{t('fullName')}</label>
              <div className="auth_input_wrap">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <input type="text" placeholder={t('yourName')}
                  value={regForm.name} onChange={e => setRegForm({...regForm, name: e.target.value})} />
              </div>
              {errors.name && <span className="auth_error">{errors.name}</span>}
            </div>

            <div className={`auth_field ${errors.email ? 'error' : ''}`}>
              <label>{t('email')}</label>
              <div className="auth_input_wrap">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <input type="email" placeholder="email@example.com"
                  value={regForm.email} onChange={e => setRegForm({...regForm, email: e.target.value})} />
              </div>
              {errors.email && <span className="auth_error">{errors.email}</span>}
            </div>

            <div className={`auth_field ${errors.phone ? 'error' : ''}`}>
              <label>{t('phone')}</label>
              <div className="auth_input_wrap">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                </svg>
                <span className="auth_prefix">+998</span>
                <input type="tel" placeholder="90 123 45 67"
                  value={regForm.phone} onChange={e => setRegForm({...regForm, phone: e.target.value})} />
              </div>
              {errors.phone && <span className="auth_error">{errors.phone}</span>}
            </div>

            <div className={`auth_field ${errors.password ? 'error' : ''}`}>
              <label>{t('password')}</label>
              <div className="auth_input_wrap">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                <input type={showPass ? 'text' : 'password'} placeholder={t('minChars6')}
                  value={regForm.password} onChange={e => setRegForm({...regForm, password: e.target.value})} />
                <button type="button" className="auth_eye" onClick={() => setShowPass(!showPass)}>
                  {showPass ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              {errors.password && <span className="auth_error">{errors.password}</span>}
            </div>

            <div className={`auth_field ${errors.confirm ? 'error' : ''}`}>
              <label>{t('confirmPassword')}</label>
              <div className="auth_input_wrap">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <input type={showPass ? 'text' : 'password'} placeholder={t('confirmPassword')}
                  value={regForm.confirm} onChange={e => setRegForm({...regForm, confirm: e.target.value})} />
              </div>
              {errors.confirm && <span className="auth_error">{errors.confirm}</span>}
            </div>

            {regForm.role === 'seller' && (
              <div className="auth_extra_fields">
                <div className="auth_extra_title">
                  <span>🏪</span> {t('sellerInfo')}
                </div>
                <div className={`auth_field ${errors.shopName ? 'error' : ''}`}>
                  <label>{t('shopName')}</label>
                  <div className="auth_input_wrap">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                    <input type="text" placeholder={t('shopNamePlaceholder')}
                      value={regForm.shopName} onChange={e => setRegForm({...regForm, shopName: e.target.value})} />
                  </div>
                  {errors.shopName && <span className="auth_error">{errors.shopName}</span>}
                </div>

                <div className={`auth_field ${errors.location ? 'error' : ''}`}>
                  <label>{t('location')}</label>
                  <div className="auth_input_wrap">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    <input type="text" placeholder={t('locationPlaceholder')}
                      value={regForm.location} onChange={e => setRegForm({...regForm, location: e.target.value, lat: null, lng: null})} />
                  </div>
                  {errors.location && <span className="auth_error">{errors.location}</span>}
                </div>

                <button type="button" className={`auth_map_toggle ${showMap ? 'active' : ''}`} onClick={toggleMap}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                    <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
                  </svg>
                  {showMap ? t('hideMap') : t('pickFromMap')}
                </button>

                {showMap && (
                  <div className="auth_map_picker">
                    <div className="auth_map_bar">
                      <span className="auth_map_hint">{t('mapClickHint')}</span>
                      <button type="button" className="auth_locate_btn" onClick={handleLocateMe} disabled={mapLoading}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
                        </svg>
                        {mapLoading ? t('locating') : t('findMe')}
                      </button>
                    </div>
                    <div className="auth_map_container" ref={mapContainerRef}></div>
                    {regForm.lat && regForm.lng && (
                      <div className="auth_map_coords">
                        {regForm.location || `${regForm.lat.toFixed(5)}, ${regForm.lng.toFixed(5)}`}
                      </div>
                    )}
                  </div>
                )}

                <div className="auth_field">
                  <label>{t('shopDescription')}</label>
                  <div className="auth_input_wrap auth_textarea_wrap">
                    <textarea placeholder={t('sellerDescPlaceholder')} rows={3}
                      value={regForm.description} onChange={e => setRegForm({...regForm, description: e.target.value})} />
                  </div>
                </div>
              </div>
            )}

            {regForm.role === 'craftsman' && (
              <div className="auth_extra_fields">
                <div className="auth_extra_title">
                  <span>🔧</span> {t('craftsmanInfo')}
                </div>
                <div className={`auth_field ${errors.services ? 'error' : ''}`}>
                  <label>{t('serviceType')}</label>
                  <div className="auth_services_grid">
                    {SERVICE_TYPES.map(s => (
                      <button type="button" key={s.id}
                        className={`auth_service_chip ${regForm.services.includes(s.id) ? 'active' : ''}`}
                        onClick={() => toggleService(s.id)}>
                        <span>{s.icon}</span> {s.label}
                      </button>
                    ))}
                  </div>
                  {errors.services && <span className="auth_error">{errors.services}</span>}
                </div>
                <div className="auth_field">
                  <label>{t('experience')}</label>
                  <div className="auth_input_wrap">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <input type="text" placeholder={t('experiencePlaceholder')}
                      value={regForm.experience} onChange={e => setRegForm({...regForm, experience: e.target.value})} />
                  </div>
                </div>
                <div className={`auth_field ${errors.district ? 'error' : ''}`}>
                  <label>{t('district')}</label>
                  <div className="auth_input_wrap">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    <select value={regForm.district} onChange={e => setRegForm({...regForm, district: e.target.value})}>
                      <option value="">{t('selectDistrict')}</option>
                      {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  {errors.district && <span className="auth_error">{errors.district}</span>}
                </div>
                <div className="auth_field">
                  <label>{t('priceRangeLabel')}</label>
                  <div className="auth_input_wrap">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                    </svg>
                    <input type="text" placeholder={t('priceRangePlaceholder')}
                      value={regForm.priceRange} onChange={e => setRegForm({...regForm, priceRange: e.target.value})} />
                  </div>
                </div>
              </div>
            )}

            <label className="auth_checkbox full">
              <input type="checkbox" /> {t('termsPrefix')} <a href="#">{t('terms1')}</a> va <a href="#">{t('terms2')}</a> {t('termsSuffix')}
            </label>

            <button type="submit" className="auth_submit" disabled={loading}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
              </svg>
              {loading ? '...' : t('registerBtn')}
            </button>
          </form>
        )}

        <div className="auth_switch">
          {authMode === 'login' ? (
            <p>{t('noAccount')} <button onClick={switchMode}>{t('register')}</button></p>
          ) : (
            <p>{t('hasAccount')} <button onClick={switchMode}>{t('goToLogin')}</button></p>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuthModal
