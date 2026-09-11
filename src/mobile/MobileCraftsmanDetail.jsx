import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useSeller } from '../context/SellerContext.jsx'
import { api } from '../services/api'
import { openLoginSheet } from './MobileAuthSheet.jsx'
import MobileHeader from './MobileHeader.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { SERVICE_TYPES } from '../data/craftsmen.js'
import { normalizeCraftsman } from '../utils/craftsman'
import { REVIEWS_ENABLED } from '../data/flags'

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00']

export default function MobileCraftsmanDetail() {
  const navigate = useNavigate()
  const { selectedCraftsman, openChat } = useSeller()
  const { user } = useAuth()
  const { id } = useParams()
  const { t, lang } = useSettings()

  const [apiC, setApiC] = useState(null)
  const [apiError, setApiError] = useState(null)
  const [activeTab, setActiveTab] = useState('about')
  const [bookingOpen, setBookingOpen] = useState(false)
  const [form, setForm] = useState({ date: '', time: '', address: '', description: '', phone: '', service: '' })
  const [bLoading, setBLoading] = useState(false)
  const [bDone, setBDone] = useState(false)
  const [bError, setBError] = useState(null)

  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewDist, setReviewDist] = useState({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })
  const [galleryIndices, setGalleryIndices] = useState({})
  const [lightboxWork, setLightboxWork] = useState(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)

useEffect(() => {
    if (id && id.length === 24 && /^[0-9a-f]{24}$/i.test(id)) {
      api.sellers.get(id).then(d => { if (d.seller) setApiC(normalizeCraftsman(d.seller)) }).catch(err => setApiError(err.message || t('errorOccurred')))
    }
  }, [id])

  const today = new Date().toISOString().slice(0, 10)

  const c = apiC || selectedCraftsman
  const sellerId = (c && (c._id || c.id)) || (id || '')

  useEffect(() => {
    if (activeTab !== 'reviews' || !sellerId) return
    setReviewsLoading(true)
    api.sellers.reviews(sellerId)
      .then(data => {
        setReviews(data.reviews || [])
        setReviewDist(data.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })
      })
      .catch(() => {})
      .finally(() => setReviewsLoading(false))
  }, [activeTab, sellerId])

  useEffect(() => {
    if (!lightboxWork) return
    const onKey = (e) => {
      if (e.key === 'Escape') setLightboxWork(null)
      if (e.key === 'ArrowLeft') setLightboxIndex(i => (i - 1 + (lightboxWork.images || []).length) % (lightboxWork.images || []).length)
      if (e.key === 'ArrowRight') setLightboxIndex(i => (i + 1) % (lightboxWork.images || []).length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxWork])

  if (apiError && !c) return (
    <div className="mob">
      <MobileHeader />
      <div className="mob_empty">
        <div className="mob_empty_title">{t('errorOccurred')}</div>
        <p style={{ fontSize: 13 }}>{apiError}</p>
      </div>
    </div>
  )

  if (!c) return <div className="mob"><MobileHeader /><div className="mob_loader"><div className="mob_spinner" /></div></div>

  const serviceLabels = (c.services || []).map(sid => SERVICE_TYPES.find(s => s.id === sid)?.label || sid)

  const slideImages = (workId, images, dir) => {
    setGalleryIndices(prev => {
      const cur = prev[workId] || 0
      return { ...prev, [workId]: (cur + dir + images.length) % images.length }
    })
  }

  const openBooking = () => {
    if (!user) { openLoginSheet(); return }
    setBookingOpen(true)
  }

  const submitBooking = async () => {
    setBLoading(true); setBError(null)
    try {
      await api.bookings.create({
        craftsmanId: c._id,
        service: form.service || c.services?.[0] || 'general',
        date: form.date, time: form.time || '10:00',
        address: form.address, description: form.description,
        phone: form.phone || user?.phone,
      })
      setBDone(true)
      setTimeout(() => { setBDone(false); setBookingOpen(false); navigate(-1) }, 1600)
    } catch (e) { setBError(e.message) }
    finally { setBLoading(false) }
  }

  return (
    <div className="mob">
      <MobileHeader />
      <div className="mob_page_head">
        <button className="mob_back" onClick={() => navigate(-1)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div className="mob_page_title">{t('craftsman')}</div>
      </div>

      <div className="mob_section" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <div className="mob_avatar" style={{ width: 68, height: 68, borderRadius: 20, background: c.color, fontSize: 26 }}>
          {c.avatar?.startsWith('/') ? <img src={c.avatar} alt="" /> : c.avatar}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mob_person_name" style={{ fontSize: 17 }}>
            {c.name}
            {c.verified && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d97b" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
          </div>
          <div className="mob_person_meta">
            {REVIEWS_ENABLED && <span style={{ color: 'var(--mob-amber)' }}>★ {c.rating || 0}</span>}
            {REVIEWS_ENABLED && <span>({c.reviewCount || 0})</span>}
            {c.experience !== '—' && <span>{c.experience} {t('yearsExperience')}</span>}
          </div>
          <div className="mob_person_meta">{c.district || c.location}</div>
        </div>
      </div>

      <div className="mob_sec_tabs">
        {[
          ['portfolio', `${t('completedWorks')} (${(c.completedWorks || []).length})`],
          ...(REVIEWS_ENABLED ? [['reviews', `${t('sortTabReviews')} (${c.reviewCount || 0})`]] : []),
          ['about', t('info')],
        ].map(([val, label]) => (
          <button key={val} className={`mob_sec_tab${activeTab === val ? ' mob_sec_tab_active' : ''}`} onClick={() => setActiveTab(val)}>{label}</button>
        ))}
      </div>

      {activeTab === 'portfolio' && (
        (c.completedWorks && c.completedWorks.length > 0) ? (
          <div className="mob_list" style={{ paddingTop: 2 }}>
            {(c.completedWorks || []).map(work => {
              const booking = work.bookingId
              const imgs = work.images || []
              const idx = galleryIndices[work._id] || 0
              const hasMany = imgs.length > 1
              return (
                <div className="mob_work_card" key={work._id}>
                  {imgs.length > 0 && (
                    <div className="mob_work_img_wrap">
                      <img
                        className="mob_work_img"
                        src={imgs[idx] || imgs[0]}
                        alt={work.title || t('workNoun')}
                        onClick={() => { setLightboxWork(work); setLightboxIndex(idx) }}
                      />
                      {hasMany && (
                        <>
                          <button className="mob_work_arrow mob_work_arrow_left" onClick={() => slideImages(work._id, imgs, -1)} aria-label="Oldingi">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
                          </button>
                          <button className="mob_work_arrow mob_work_arrow_right" onClick={() => slideImages(work._id, imgs, 1)} aria-label="Keyingi">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
                          </button>
                        </>
                      )}
                      {hasMany && (
                        <div className="mob_work_dots">
                          {imgs.map((_, i) => (
                            <span key={i} className={`mob_work_dot${i === idx ? ' active' : ''}`} onClick={() => setGalleryIndices(prev => ({ ...prev, [work._id]: i }))} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {hasMany && (
                    <div className="mob_work_thumbs">
                      {imgs.map((src, i) => (
                        <div key={i} className={`mob_work_thumb${i === idx ? ' active' : ''}`} onClick={() => setGalleryIndices(prev => ({ ...prev, [work._id]: i }))}>
                          <img src={src} alt="" />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mob_work_info">
                    {work.title && <div className="mob_work_title">{work.title}</div>}
                    {work.description && <div style={{ fontSize: 13, color: 'var(--mob-text-2)', lineHeight: 1.6 }}>{work.description}</div>}
                    <div className="mob_work_meta">
                      {work.service && <span className="mob_work_service">{SERVICE_TYPES.find(s => s.id === work.service)?.icon || '🔧'} {SERVICE_TYPES.find(s => s.id === work.service)?.label || work.service}</span>}
                      {booking?.address && <span className="mob_work_address">📍 {booking.address}</span>}
                    </div>
                    {work.completedAt && <div className="mob_work_date">{new Date(work.completedAt).toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-US' : 'uz')}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="mob_empty">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <div className="mob_empty_title">{t('portfolio')}</div>
            <p style={{ fontSize: 13 }}>{t('noWorksYet')}</p>
          </div>
        )
      )}

      {REVIEWS_ENABLED && activeTab === 'reviews' && (
        <div>
          {c.rating > 0 && (
            <div className="mob_rev_summary">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="mob_rev_number">{c.rating}</span>
                <div>
                  <div className="mob_rev_stars">
                    {[1, 2, 3, 4, 5].map(s => (
                      <svg key={s} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={s <= Math.round(c.rating) ? '#f59e0b' : 'none'} stroke="#f59e0b" strokeWidth="2">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    ))}
                  </div>
                  <div className="mob_rev_total">{c.reviewCount} {t('reviewsWord')}</div>
                </div>
              </div>
              <div className="mob_rev_dist">
                {[5, 4, 3, 2, 1].map(star => {
                  const count = reviewDist[star] || 0
                  const pct = c.reviewCount > 0 ? Math.round((count / c.reviewCount) * 100) : 0
                  return (
                    <div className="mob_dist_row" key={star}>
                      <span className="mob_dist_label">{star}</span>
                      <div className="mob_dist_bar">
                        <div className="mob_dist_fill" style={{ width: pct + '%' }} />
                      </div>
                      <span className="mob_dist_count">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {reviewsLoading ? (
            <div className="mob_loader"><div className="mob_spinner" />{t('loading')}...</div>
          ) : reviews.length === 0 ? (
            <div className="mob_empty">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <div className="mob_empty_title">{t('noReviewsYet')}</div>
            </div>
          ) : (
            <div className="mob_list" style={{ paddingTop: 2 }}>
              {reviews.map(r => (
                <div className="mob_rev_card" key={r._id}>
                  <div className="mob_rev_header">
                    <div className="mob_rev_user">
                      <div className="mob_rev_avatar">{(r.userName || 'M')[0].toUpperCase()}</div>
                      <div style={{ minWidth: 0 }}>
                        <div className="mob_rev_name">{r.userName}</div>
                        <div className="mob_rev_service">{SERVICE_TYPES.find(s => s.id === r.service)?.icon || '🔧'} {SERVICE_TYPES.find(s => s.id === r.service)?.label || r.service}</div>
                      </div>
                    </div>
                    <div className="mob_rev_right">
                      <div className="mob_rev_stars">
                        {[1, 2, 3, 4, 5].map(s => (
                          <svg key={s} xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill={s <= r.rating ? '#f59e0b' : 'none'} stroke="#f59e0b" strokeWidth="2">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                        ))}
                      </div>
                      <span className="mob_rev_date">{r.date ? new Date(r.date).toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-US' : 'uz') : ''}</span>
                    </div>
                  </div>
                  {r.review && <div className="mob_rev_text">{r.review}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'about' && (
        <div style={{ padding: '0 16px' }}>
          <div className="mob_section" style={{ margin: '0 0 12px' }}>
            <div className="mob_page_title" style={{ fontSize: 16, marginBottom: 8 }}>{t('services')}</div>
            <div className="mob_cats" style={{ padding: 0 }}>
              {serviceLabels.length > 0 ? serviceLabels.map((l, i) => <span key={i} className="mob_cat mob_cat_active" style={{ cursor: 'default' }}>{l}</span>) : <span style={{ color: 'var(--mob-muted)', fontSize: 13 }}>{t('noServices')}</span>}
            </div>
            {c.priceRange && (
              <div className="mob_person_meta" style={{ marginTop: 10 }}>
                <span className="mob_chip mob_chip_green">{c.priceRange}</span>
                <span className="mob_chip mob_chip_amber">{c.workingHours}</span>
                <span className="mob_chip mob_chip_blue">{c.completedJobs} {t('workNounPlural')}</span>
              </div>
            )}
          </div>

          <div className="mob_section" style={{ margin: 0 }}>
            <div className="mob_page_title" style={{ fontSize: 16, marginBottom: 8 }}>{t('description')}</div>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--mob-text-2)' }}>{c.description || t('noCraftsmanInfo')}</div>
          </div>
        </div>
      )}

      <div className="mob_detail_bottom">
        <button className="mob_btn mob_btn_ghost mob_detail_buy" onClick={() => openChat(c)}>{t('messageShort')}</button>
        {c.phone && (
          <a className="mob_btn mob_btn_ghost mob_detail_buy" href={`tel:${c.phone}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            {t('call')}
          </a>
        )}
        <button className="mob_btn mob_detail_buy" onClick={openBooking} disabled={!c.available}>{c.available ? t('bookNow') : t('busy')}</button>
      </div>

      {lightboxWork && (
        <div className="mob_lightbox" onClick={() => setLightboxWork(null)}>
          <img src={(lightboxWork.images || [])[lightboxIndex] || (lightboxWork.images || [])[0]} alt="" onClick={(e) => e.stopPropagation()} />
          {(lightboxWork.images || []).length > 1 && (
            <>
              <button className="mob_lightbox_arrow mob_lightbox_arrow_left" onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => (i - 1 + (lightboxWork.images || []).length) % (lightboxWork.images || []).length) }} aria-label="Oldingi">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <button className="mob_lightbox_arrow mob_lightbox_arrow_right" onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => (i + 1) % (lightboxWork.images || []).length) }} aria-label="Keyingi">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </>
          )}
        </div>
      )}


      {bookingOpen && (
        <div className="mob_overlay" onClick={() => setBookingOpen(false)}>
          <div className="mob_sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mob_sheet_grab" />
            <div className="mob_sheet_title">{t('placeOrder')}</div>
            {bDone ? (
              <div className="mob_empty"><div className="mob_empty_title">✓ {t('bookingSubmitted')}</div></div>
            ) : (
              <>
                <div className="mob_field">
                  <label className="mob_label">{t('selectBookingService')}</label>
                  <select className="mob_input" value={form.service} onChange={(e) => setForm(f => ({ ...f, service: e.target.value }))}>
                    <option value="">{t('chooseService')}</option>
                    {(c.services && c.services.length > 0 ? c.services : SERVICE_TYPES.map(s => s.id)).map(sId => {
                      const st = SERVICE_TYPES.find(s => s.id === sId)
                      return (
                        <option key={sId} value={sId}>{st ? `${st.icon} ${st.label}` : sId}</option>
                      )
                    })}
                  </select>
                </div>
                <div className="mob_field">
                  <label className="mob_label">{t('date')}</label>
                  <input className="mob_input" type="date" min={today} value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="mob_field">
                  <label className="mob_label">{t('time')}</label>
                  <select className="mob_input" value={form.time} onChange={(e) => setForm(f => ({ ...f, time: e.target.value }))}>
                    {TIME_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="mob_field">
                  <label className="mob_label">{t('address')}</label>
                  <input className="mob_input" placeholder={t('addressPlaceholder')} value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} />
                </div>
                <div className="mob_field">
                  <label className="mob_label">{t('phone')}</label>
                  <input className="mob_input" type="tel" placeholder="+998 90 123 45 67" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="mob_field">
                  <label className="mob_label">{t('workDescription')}</label>
                  <textarea className="mob_input mob_textarea" placeholder="Qanday ish kerak?" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                {bError && <div style={{ color: 'var(--mob-red)', fontSize: 13, marginBottom: 12 }}>{bError}</div>}
                <button className="mob_btn" onClick={submitBooking} disabled={bLoading}>{bLoading ? t('loading') : t('send')}</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}