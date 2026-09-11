import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'

let openHandler = null
export function openLoginSheet() {
  if (openHandler) openHandler('login')
}
export function openRegisterSheet() {
  if (openHandler) openHandler('register')
}

export default function MobileAuthSheet() {
  const { user, showAuth, login, register, openLogin, openRegister } = useAuth()
  const { t } = useSettings()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [regForm, setRegForm] = useState({ name: '', email: '', phone: '', password: '', role: 'buyer' })

  React.useEffect(() => {
    openHandler = (m) => { setMode(m); setOpen(true); setError(null) }
    return () => { openHandler = null }
  }, [])

  // Desktop AuthModal ochilganda ham bu sheet orqali ishlayveradi (mobil)
  React.useEffect(() => {
    if (showAuth) { setMode('login'); setOpen(true) }
    else setOpen(false)
  }, [showAuth])

  const handleLogin = async () => {
    setLoading(true); setError(null)
    try { await login(loginForm.email, loginForm.password) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleRegister = async () => {
    setLoading(true); setError(null)
    if (regForm.password.length < 6) { setError(t('passwordTooShort')); setLoading(false); return }
    try {
      await register({
        ...regForm,
        phone: regForm.phone ? regForm.phone : undefined,
      })
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  if (!open) return null

  return (
    <div className="mob_overlay" onClick={() => setOpen(false)}>
      <div className="mob_sheet" onClick={(e) => e.stopPropagation()}>
        <div className="mob_sheet_grab" />
        <div className="mob_sheet_title">{mode === 'login' ? t('login') : t('register')}</div>

        <div className="mob_sec_tabs" style={{ marginBottom: '16px' }}>
          <button
            className={`mob_sec_tab${mode === 'login' ? ' mob_sec_tab_active' : ''}`}
            onClick={() => { setMode('login'); setError(null) }}
          >{t('login')}</button>
          <button
            className={`mob_sec_tab${mode === 'register' ? ' mob_sec_tab_active' : ''}`}
            onClick={() => { setMode('register'); setError(null) }}
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
            </div>
            <div className="mob_field">
              <label className="mob_label">{t('password')}</label>
              <input className="mob_input" type="password" placeholder="••••••••" value={loginForm.password}
                onChange={(e) => setLoginForm(f => ({ ...f, password: e.target.value }))} />
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
                onChange={(e) => setRegForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="mob_field">
              <label className="mob_label">{t('email')}</label>
              <input className="mob_input" type="email" placeholder="email@misol.uz" value={regForm.email}
                onChange={(e) => setRegForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="mob_field">
              <label className="mob_label">{t('phone')}</label>
              <input className="mob_input" type="tel" placeholder="+998 90 123 45 67" value={regForm.phone}
                onChange={(e) => setRegForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="mob_field">
              <label className="mob_label">{t('password')}</label>
              <input className="mob_input" type="password" placeholder="••••••••" value={regForm.password}
                onChange={(e) => setRegForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="mob_field">
              <label className="mob_label">{t('roleLabel')}</label>
              <div className="mob_sec_tabs" style={{ padding: 0 }}>
                {[
                  { id: 'buyer', label: t('customer') },
                  { id: 'seller', label: t('seller') },
                  { id: 'craftsman', label: t('craftsman') },
                ].map(r => (
                  <button key={r.id}
                    className={`mob_sec_tab${regForm.role === r.id ? ' mob_sec_tab_active' : ''}`}
                    onClick={() => setRegForm(f => ({ ...f, role: r.id }))}
                  >{r.label}</button>
                ))}
              </div>
            </div>
            <button className="mob_btn" onClick={handleRegister} disabled={loading}>
              {loading ? t('loading') : t('register')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}