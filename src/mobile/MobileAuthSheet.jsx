import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { SERVICE_TYPES, DISTRICTS } from '../data/craftsmen.js'

let openHandler = null
export function openLoginSheet() {
  if (openHandler) openHandler('login')
}
export function openRegisterSheet() {
  if (openHandler) openHandler('register')
}

const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

function EyeIcon({ open }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

export default function MobileAuthSheet() {
  const { showAuth, login, register } = useAuth()
  const { t } = useSettings()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [errors, setErrors] = useState({})
  const [showPass, setShowPass] = useState(false)

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [regForm, setRegForm] = useState({
    name: '', email: '', phone: '', password: '', confirm: '', role: 'buyer',
    shopName: '', location: '', description: '',
    services: [], experience: '', district: '', priceRange: '',
  })

  React.useEffect(() => {
    openHandler = (m) => { setMode(m); setOpen(true); setError(null); setErrors({}) }
    return () => { openHandler = null }
  }, [])

  React.useEffect(() => {
    if (showAuth) { setMode('login'); setOpen(true) }
    else setOpen(false)
  }, [showAuth])

  const handleLogin = async () => {
    const errs = {}
    if (!loginForm.email) errs.email = t('enterEmail')
    else if (!validateEmail(loginForm.email)) errs.email = t('wrongEmail')
    if (!loginForm.password) errs.password = t('enterPassword')
    else if (loginForm.password.length < 6) errs.password = t('minChars6')
    setErrors(errs)
    if (Object.keys(errs).length) return
    setLoading(true); setError(null)
    try { await login(loginForm.email, loginForm.password) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleRegister = async () => {
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

    setErrors(errs)
    if (Object.keys(errs).length) return
    setLoading(true); setError(null)

    const extra = {}
    if (regForm.role === 'seller') {
      extra.shopName = regForm.shopName.trim()
      extra.location = regForm.location.trim()
      extra.description = regForm.description.trim()
    } else if (regForm.role === 'craftsman') {
      extra.services = regForm.services
      extra.experience = regForm.experience
      extra.district = regForm.district
      extra.priceRange = regForm.priceRange
    }

    try {
      await register({
        name: regForm.name.trim(),
        email: regForm.email,
        phone: regForm.phone,
        password: regForm.password,
        role: regForm.role,
        ...extra,
      })
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const setRole = (role) => { setRegForm(f => ({ ...f, role })); setErrors({}) }
  const toggleService = (id) => setRegForm(f => ({
    ...f,
    services: f.services.includes(id) ? f.services.filter(s => s !== id) : [...f.services, id],
  }))

  const setField = (key) => (e) => { setErrors(prev => ({ ...prev, [key]: undefined })); setRegForm(f => ({ ...f, [key]: e.target.value })) }

  if (!open) return null

  return (
    <div className="mob_overlay" onClick={() => setOpen(false)}>
      <div className="mob_sheet" onClick={(e) => e.stopPropagation()}>
        <div className="mob_sheet_grab" />
        <div className="mob_sheet_title">{mode === 'login' ? t('login') : t('register')}</div>

        <div className="mob_sec_tabs" style={{ marginBottom: '16px' }}>
          <button
            className={`mob_sec_tab${mode === 'login' ? ' mob_sec_tab_active' : ''}`}
            onClick={() => { setMode('login'); setError(null); setErrors({}) }}
          >{t('login')}</button>
          <button
            className={`mob_sec_tab${mode === 'register' ? ' mob_sec_tab_active' : ''}`}
            onClick={() => { setMode('register'); setError(null); setErrors({}) }}
          >{t('register')}</button>
        </div>

        {error && (
          <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(255,107,107,0.14)', color: 'var(--mob-red)', fontSize: 13, marginBottom: 14 }}>
            {error}
          </div>
        )}

        {mode === 'login' ? (
          <>
            <div className="mob_field">
              <label className="mob_label">{t('email')}</label>
              <input className="mob_input" type="email" placeholder="email@misol.uz" value={loginForm.email}
                onChange={(e) => setLoginForm(f => ({ ...f, email: e.target.value }))} />
              {errors.email && <div className="mob_field_error">{errors.email}</div>}
            </div>
            <div className="mob_field">
              <label className="mob_label">{t('password')}</label>
              <div className="mob_input_wrap">
                <input className="mob_input" type={showPass ? 'text' : 'password'} placeholder="••••••••" value={loginForm.password}
                  onChange={(e) => setLoginForm(f => ({ ...f, password: e.target.value }))} />
                <button type="button" className="mob_eye_btn" onClick={() => setShowPass(v => !v)}>
                  <EyeIcon open={showPass} />
                </button>
              </div>
              {errors.password && <div className="mob_field_error">{errors.password}</div>}
            </div>
            <button className="mob_btn" onClick={handleLogin} disabled={loading}>
              {loading ? t('loading') : t('login')}
            </button>
          </>
        ) : (
          <>
            <div className="mob_field">
              <label className="mob_label">{t('firstName')}</label>
              <input className="mob_input" placeholder={t('yourNamePlaceholder')} value={regForm.name}
                onChange={(e) => setField('name')(e)} />
              {errors.name && <div className="mob_field_error">{errors.name}</div>}
            </div>
            <div className="mob_field">
              <label className="mob_label">{t('email')}</label>
              <input className="mob_input" type="email" placeholder="email@misol.uz" value={regForm.email}
                onChange={(e) => setField('email')(e)} />
              {errors.email && <div className="mob_field_error">{errors.email}</div>}
            </div>
            <div className="mob_field">
              <label className="mob_label">{t('phone')}</label>
              <div className="mob_phone_wrap">
                <span className="mob_prefix">+998</span>
                <input className="mob_input" type="tel" placeholder="90 123 45 67" value={regForm.phone}
                  onChange={(e) => setField('phone')(e)} />
              </div>
              {errors.phone && <div className="mob_field_error">{errors.phone}</div>}
            </div>
            <div className="mob_field">
              <label className="mob_label">{t('password')}</label>
              <div className="mob_input_wrap">
                <input className="mob_input" type={showPass ? 'text' : 'password'} placeholder={t('minChars6')} value={regForm.password}
                  onChange={(e) => setField('password')(e)} />
                <button type="button" className="mob_eye_btn" onClick={() => setShowPass(v => !v)}>
                  <EyeIcon open={showPass} />
                </button>
              </div>
              {errors.password && <div className="mob_field_error">{errors.password}</div>}
            </div>
            <div className="mob_field">
              <label className="mob_label">{t('confirmPassword')}</label>
              <div className="mob_input_wrap">
                <input className="mob_input" type={showPass ? 'text' : 'password'} placeholder={t('confirmPassword')} value={regForm.confirm}
                  onChange={(e) => setField('confirm')(e)} />
                <button type="button" className="mob_eye_btn" onClick={() => setShowPass(v => !v)}>
                  <EyeIcon open={showPass} />
                </button>
              </div>
              {errors.confirm && <div className="mob_field_error">{errors.confirm}</div>}
            </div>
            <div className="mob_field">
              <label className="mob_label">{t('roleLabel')}</label>
              <div className="mob_sec_tabs" style={{ padding: 0 }}>
                {[
                  { id: 'buyer', label: t('customer') },
                  { id: 'seller', label: t('seller') },
                  { id: 'craftsman', label: t('craftsman') },
                ].map(r => (
                  <button key={r.id} type="button"
                    className={`mob_sec_tab${regForm.role === r.id ? ' mob_sec_tab_active' : ''}`}
                    onClick={() => setRole(r.id)}
                  >{r.label}</button>
                ))}
              </div>
            </div>

            {regForm.role === 'seller' && (
              <>
                <div className="mob_section_title"><span>🏪</span> {t('sellerInfo')}</div>
                <div className="mob_field">
                  <label className="mob_label">{t('shopName')}</label>
                  <input className="mob_input" placeholder={t('shopNamePlaceholder')} value={regForm.shopName}
                    onChange={(e) => setField('shopName')(e)} />
                  {errors.shopName && <div className="mob_field_error">{errors.shopName}</div>}
                </div>
                <div className="mob_field">
                  <label className="mob_label">{t('location')}</label>
                  <input className="mob_input" placeholder={t('locationPlaceholder')} value={regForm.location}
                    onChange={(e) => setField('location')(e)} />
                  {errors.location && <div className="mob_field_error">{errors.location}</div>}
                </div>
                <div className="mob_field">
                  <label className="mob_label">{t('shopDescription')}</label>
                  <textarea className="mob_input mob_textarea" rows={3} placeholder={t('sellerDescPlaceholder')} value={regForm.description}
                    onChange={(e) => setField('description')(e)} />
                </div>
              </>
            )}

            {regForm.role === 'craftsman' && (
              <>
                <div className="mob_section_title"><span>🔧</span> {t('craftsmanInfo')}</div>
                <div className="mob_field">
                  <label className="mob_label">{t('serviceType')}</label>
                  <div className="mob_chips">
                    {SERVICE_TYPES.map(s => (
                      <button key={s.id} type="button"
                        className={`mob_chip${regForm.services.includes(s.id) ? ' mob_chip_active' : ''}`}
                        onClick={() => toggleService(s.id)}>
                        <span>{s.icon}</span> {s.label}
                      </button>
                    ))}
                  </div>
                  {errors.services && <div className="mob_field_error">{errors.services}</div>}
                </div>
                <div className="mob_field">
                  <label className="mob_label">{t('experience')}</label>
                  <input className="mob_input" placeholder={t('experiencePlaceholder')} value={regForm.experience}
                    onChange={(e) => setField('experience')(e)} />
                </div>
                <div className="mob_field">
                  <label className="mob_label">{t('district')}</label>
                  <select className="mob_input" value={regForm.district} onChange={(e) => setField('district')(e)}>
                    <option value="">{t('selectDistrict')}</option>
                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  {errors.district && <div className="mob_field_error">{errors.district}</div>}
                </div>
                <div className="mob_field">
                  <label className="mob_label">{t('priceRangeLabel')}</label>
                  <input className="mob_input" placeholder={t('priceRangePlaceholder')} value={regForm.priceRange}
                    onChange={(e) => setField('priceRange')(e)} />
                </div>
              </>
            )}

            <label className="mob_checkbox">
              <input type="checkbox" />
              <span>{t('termsPrefix')} <a href="#">{t('terms1')}</a> va <a href="#">{t('terms2')}</a> {t('termsSuffix')}</span>
            </label>

            <button className="mob_btn" onClick={handleRegister} disabled={loading}>
              {loading ? t('loading') : t('register')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}