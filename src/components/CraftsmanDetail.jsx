import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useSeller } from '../context/SellerContext.jsx'
import { api } from '../services/api'
import Header from './header'
import Footer from './Footer'
import LoginPrompt from './LoginPrompt'
import craftsmenStatic from '../data/craftsmen'
import { SERVICE_TYPES } from '../data/craftsmen'
import '../components_css/craftsmen.css'

const AVATAR_COLORS = ['#10b981','#f59e0b','#3b82f6','#8b5cf6','#ef4444','#ec4899','#06b6d4','#84cc16','#f97316','#14b8a6']
function getAvatarColor(name) {
  let hash = 0
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function normalizeCraftsman(u) {
  return {
    id: u._id,
    _id: u._id,
    name: u.name || "Noma'lum usta",
    avatar: u.avatar || (u.name || '?')[0].toUpperCase(),
    color: u.color || getAvatarColor(u.name),
    verified: u.verified || false,
    rating: u.rating || 0,
    reviewCount: u.reviewCount || 0,
    experience: u.experience || '—',
    district: u.district || '',
    description: u.description || '',
    phone: u.phone || '',
    workingHours: u.workingHours || '09:00 - 18:00',
    services: Array.isArray(u.services) ? u.services : [],
    priceRange: u.priceRange || '',
    completedJobs: u.completedJobs || 0,
    available: u.available !== false,
    portfolio: u.portfolio || [],
    completedWorks: u.completedWorks || [],
    location: u.location || '',
    lat: u.lat,
    lng: u.lng,
  }
}

function CraftsmanDetail() {
  const { selectedCraftsman, setSelectedCraftsman, openChat } = useSeller()
  const { user } = useAuth()
  const { t } = useSettings()
  const navigate = useNavigate()
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState('portfolio')
  const [showBooking, setShowBooking] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [bookingForm, setBookingForm] = useState({
    date: '', time: '', address: '', description: '', phone: '',
  })
  const [bookingSubmitted, setBookingSubmitted] = useState(false)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingError, setBookingError] = useState(null)
  const [apiCraftsman, setApiCraftsman] = useState(null)
  const [apiLoading, setApiLoading] = useState(false)
  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewDist, setReviewDist] = useState({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })
  const [galleryIndices, setGalleryIndices] = useState({})
  const [lightboxWork, setLightboxWork] = useState(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const isMongoId = id && id.length === 24 && /^[0-9a-f]{24}$/i.test(id)

  useEffect(() => {
    if (isMongoId) {
      setApiLoading(true)
      api.sellers.get(id)
        .then(data => {
          if (data.seller) setApiCraftsman(normalizeCraftsman(data.seller))
        })
        .catch(() => {})
        .finally(() => setApiLoading(false))
    }
  }, [id, isMongoId])

  const urlCraftsman = !selectedCraftsman && !apiCraftsman && !isMongoId
    ? craftsmenStatic.find(c => c.id === id)
    : null
  const c = apiCraftsman || selectedCraftsman || urlCraftsman

  useEffect(() => {
    if (activeTab === 'reviews' && c?._id) {
      setReviewsLoading(true)
      api.sellers.reviews(c._id)
        .then(data => {
          setReviews(data.reviews || [])
          setReviewDist(data.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })
        })
        .catch(() => {})
        .finally(() => setReviewsLoading(false))
    }
  }, [activeTab, c?._id])

  useEffect(() => {
    if (!lightboxWork) return
    const onKey = (e) => {
      if (e.key === 'Escape') setLightboxWork(null)
      if (e.key === 'ArrowLeft') setLightboxIndex(i => (i - 1 + lightboxWork.images.length) % lightboxWork.images.length)
      if (e.key === 'ArrowRight') setLightboxIndex(i => (i + 1) % lightboxWork.images.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxWork])

  const slideImages = (workId, images, dir) => {
    setGalleryIndices(prev => {
      const cur = prev[workId] || 0
      return { ...prev, [workId]: (cur + dir + images.length) % images.length }
    })
  }

  if (!c || apiLoading) return <div className="cd"><Header /><div style={{textAlign:'center',padding:'80px 20px'}}>Yuklanmoqda...</div></div>

  const handleBooking = async (e) => {
    e.preventDefault()
    if (!user) { setShowLoginPrompt(true); return }
    setBookingLoading(true)
    setBookingError(null)
    try {
      await api.bookings.create({
        craftsmanId: c._id || c.id,
        service: c.services?.[0] || 'general',
        date: bookingForm.date,
        time: bookingForm.time,
        address: bookingForm.address,
        phone: bookingForm.phone,
        description: bookingForm.description,
      })
      setBookingSubmitted(true)
      setTimeout(() => {
        setBookingSubmitted(false)
        setShowBooking(false)
        setBookingForm({ date: '', time: '', address: '', description: '', phone: '' })
      }, 3000)
    } catch (err) {
      setBookingError(err.message || 'Xatolik')
    } finally {
      setBookingLoading(false)
    }
  }

  const handleChat = () => {
    if (!user) { setShowLoginPrompt(true); return }
    openChat(c)
  }

  const handleCall = () => {
    window.open(`tel:${c.phone}`)
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="cd">
      <Header />
      <div className="container">
        <div className="cd_breadcrumb">
          <span onClick={() => { setSelectedCraftsman(null); navigate('/') }}>{t('home')}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          <span onClick={() => { setSelectedCraftsman(null); navigate('/craftsmen') }}>{t('craftsmen')}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          <span className="active">{c.name}</span>
        </div>

        <div className="cd_profile">
          <div className="cd_avatar" style={{ background: c.color }}>{c.avatar}</div>
          <div className="cd_info">
            <div className="cd_name_row">
              <h1>{c.name}</h1>
              {c.verified && (
                <span className="cd_verified">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  {t('verifiedCraftsman')}
                </span>
              )}
              <span className={`cd_availability ${c.available ? 'available' : 'busy'}`}>
                {c.available ? t('available') : t('busy')}
              </span>
            </div>
            <p className="cd_desc">{c.description}</p>
            <div className="cd_meta">
              <span>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {c.district}
              </span>
              <span>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {c.workingHours}
              </span>
              <span>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                {t('experience')}: {c.experience}
              </span>
            </div>
          </div>
          <div className="cd_actions">
            <button className="cd_book_btn" onClick={() => {
              if (!user) { setShowLoginPrompt(true); return }
              setShowBooking(true)
            }} disabled={!c.available}>
              {c.available ? t('bookCraftsman') : t('currentlyBusy')}
            </button>
            <button className="cd_chat_btn" onClick={handleChat}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              {t('chat')}
            </button>
            <button className="cd_call_btn" onClick={handleCall}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              {t('call')}
            </button>
          </div>
        </div>

        <div className="cd_stats">
          <div className="cd_stat">
            <div className="cd_stat_icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </div>
            <div><strong>{c.rating}</strong><span>{t('rating')}</span></div>
          </div>
          <div className="cd_stat">
            <div className="cd_stat_icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div><strong>{c.reviewCount}</strong><span>{t('reviews')}</span></div>
          </div>
          <div className="cd_stat">
            <div className="cd_stat_icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <div><strong>{c.completedJobs}</strong><span>{t('completedJobs')}</span></div>
          </div>
          <div className="cd_stat">
            <div className="cd_stat_icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            </div>
            <div><strong>{c.priceRange}</strong><span>{t('priceRange')}</span></div>
          </div>
        </div>

        <div className="cd_services_section">
          <h2>{t('services')}</h2>
          <div className="cd_service_list">
            {(c.services || []).length === 0 ? (
              <p style={{ color: 'var(--text-muted, #9ca3af)', fontSize: 14 }}>{t('noServices')}</p>
            ) : (c.services || []).map(sId => {
              const st = SERVICE_TYPES.find(s => s.id === sId)
              return (
                <div className="cd_service_item" key={sId}>
                  <span className="cd_service_icon">{st?.icon || '🔧'}</span>
                  <div>
                    <strong>{st?.label || sId}</strong>
                    <span>{c.priceRange}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="cd_tabs">
          <div className="cd_tab_headers">
            <button className={activeTab === 'portfolio' ? 'active' : ''} onClick={() => setActiveTab('portfolio')}>
              Tugatgan ishlar ({(c.completedWorks || []).length})
            </button>
            <button className={activeTab === 'reviews' ? 'active' : ''} onClick={() => setActiveTab('reviews')}>
              {t('reviews')} ({c.reviewCount || 0})
            </button>
            <button className={activeTab === 'about' ? 'active' : ''} onClick={() => setActiveTab('about')}>
              {t('aboutCraftsman')}
            </button>
          </div>

          <div className="cd_tab_content">
            {activeTab === 'portfolio' && (
              <div className="cd_portfolio">
                {(c.completedWorks || []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted, #9ca3af)', gridColumn: '1 / -1' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <p style={{ margin: '12px 0 0', fontSize: 14 }}>{t('noPortfolio')}</p>
                  </div>
                ) : (c.completedWorks || []).map((work) => {
                  const booking = work.bookingId
                  const imgs = work.images || []
                  const idx = galleryIndices[work._id] || 0
                  const hasMany = imgs.length > 1
                  return (
                    <div className="cd_completed_work_card" key={work._id}>
                      <div className="cd_cw_images">
                        {imgs.length > 0 ? (
                          <>
                            <img
                              src={imgs[idx] || imgs[0]}
                              alt={work.title}
                              className="cd_cw_main_img"
                              onClick={() => { setLightboxWork(work); setLightboxIndex(idx) }}
                            />
                            {hasMany && (
                              <>
                                <button className="cd_cw_arrow cd_cw_arrow_left" onClick={() => slideImages(work._id, imgs, -1)}>
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
                                </button>
                                <button className="cd_cw_arrow cd_cw_arrow_right" onClick={() => slideImages(work._id, imgs, 1)}>
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
                                </button>
                              </>
                            )}
                          </>
                        ) : (
                          <div className="cd_cw_no_image">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                            </svg>
                          </div>
                        )}
                        {hasMany && (
                          <div className="cd_cw_dots">
                            {imgs.map((_, i) => (
                              <span key={i} className={`cd_cw_dot ${i === idx ? 'active' : ''}`} onClick={() => setGalleryIndices(prev => ({ ...prev, [work._id]: i }))} />
                            ))}
                          </div>
                        )}
                      </div>
                      {hasMany && imgs.length > 1 && (
                        <div className="cd_cw_thumbnails">
                          {imgs.map((src, i) => (
                            <div key={i} className={`cd_cw_thumb ${i === idx ? 'active' : ''}`} onClick={() => setGalleryIndices(prev => ({ ...prev, [work._id]: i }))}>
                              <img src={src} alt="" />
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="cd_cw_info">
                        <h4>{work.title}</h4>
                        {work.description && <p>{work.description}</p>}
                        <div className="cd_cw_meta">
                          {work.service && <span className="cd_cw_service">{SERVICE_TYPES.find(s => s.id === work.service)?.icon || '🔧'} {SERVICE_TYPES.find(s => s.id === work.service)?.label || work.service}</span>}
                          {booking?.address && <span className="cd_cw_address">📍 {booking.address}</span>}
                        </div>
                        {work.completedAt && <span className="cd_cw_date">{new Date(work.completedAt).toLocaleDateString('uz')}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {activeTab === 'reviews' && (
              <div className="cd_reviews_tab">
                {c.rating > 0 && (
                  <div className="cd_reviews_summary">
                    <div className="cd_reviews_score">
                      <span className="cd_reviews_number">{c.rating}</span>
                      <div className="cd_reviews_stars">
                        {[1,2,3,4,5].map(s => (
                          <svg key={s} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={s <= Math.round(c.rating) ? '#f59e0b' : 'none'} stroke="#f59e0b" strokeWidth="2">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                        ))}
                      </div>
                      <span className="cd_reviews_total">{c.reviewCount} {t('reviews')}</span>
                    </div>
                    <div className="cd_reviews_distribution">
                      {[5,4,3,2,1].map(star => {
                        const count = reviewDist[star] || 0
                        const pct = c.reviewCount > 0 ? Math.round((count / c.reviewCount) * 100) : 0
                        return (
                          <div className="cd_dist_row" key={star}>
                            <span className="cd_dist_label">{star}</span>
                            <div className="cd_dist_bar">
                              <div className="cd_dist_fill" style={{ width: pct + '%' }} />
                            </div>
                            <span className="cd_dist_count">{count}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {reviewsLoading ? (
                  <div className="cd_reviews_loading">Yuklanmoqda...</div>
                ) : reviews.length === 0 ? (
                  <div className="cd_reviews_empty">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <p>{t('noReviews') || "Hali sharhlar yo'q"}</p>
                  </div>
                ) : (
                  <div className="cd_reviews_list">
                    {reviews.map(r => (
                      <div className="cd_review_card" key={r._id}>
                        <div className="cd_review_header">
                          <div className="cd_review_user">
                            <div className="cd_review_avatar">
                              {(r.userName || 'M')[0].toUpperCase()}
                            </div>
                            <div>
                              <strong>{r.userName}</strong>
                              <span className="cd_review_service">{SERVICE_TYPES.find(s => s.id === r.service)?.icon || '🔧'} {SERVICE_TYPES.find(s => s.id === r.service)?.label || r.service}</span>
                            </div>
                          </div>
                          <div className="cd_review_right">
                            <div className="cd_review_stars">
                              {[1,2,3,4,5].map(s => (
                                <svg key={s} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={s <= r.rating ? '#f59e0b' : 'none'} stroke="#f59e0b" strokeWidth="2">
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                </svg>
                              ))}
                            </div>
                            <span className="cd_review_date">{r.date ? new Date(r.date).toLocaleDateString('uz') : ''}</span>
                          </div>
                        </div>
                        {r.review && <p className="cd_review_text">{r.review}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {activeTab === 'about' && (
              <div className="cd_about">
                <div className="cd_about_card">
                  <h3>{t('contactInfo')}</h3>
                  <div className="cd_about_row">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    <span>{c.phone}</span>
                  </div>
                  <div className="cd_about_row">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span>{c.district}</span>
                  </div>
                  <div className="cd_about_row">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span>{c.workingHours}</span>
                  </div>
                </div>
                <div className="cd_about_card">
                  <h3>{t('aboutCraftsman')}</h3>
                  <p>{c.description || "Usta hozircha o'zi haqida ma'lumot qo'shmagan."}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {showBooking && (
          <div className="cd_modal_overlay" onClick={() => setShowBooking(false)}>
            <div className="cd_modal" onClick={e => e.stopPropagation()}>
              <div className="cd_modal_header">
                <h2>{t('bookCraftsman')} — {c.name}</h2>
                <button onClick={() => setShowBooking(false)}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              {bookingSubmitted ? (
                <div className="cd_booking_success">
                  <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <h3>{t('bookingSubmitted')}</h3>
                  <p>{t('bookingSubmittedDesc')}</p>
                </div>
              ) : (
                <form className="cd_booking_form" onSubmit={handleBooking}>
                  <div className="cd_form_row">
                    <div className="cd_form_field">
                      <label>{t('date')}</label>
                      <input type="date" required min={today} value={bookingForm.date} onChange={e => setBookingForm({...bookingForm, date: e.target.value})} />
                    </div>
                    <div className="cd_form_field">
                      <label>{t('time')}</label>
                      <select required value={bookingForm.time} onChange={e => setBookingForm({...bookingForm, time: e.target.value})}>
                        <option value="">{t('selectTime')}</option>
                        <option value="09:00">09:00</option>
                        <option value="10:00">10:00</option>
                        <option value="11:00">11:00</option>
                        <option value="12:00">12:00</option>
                        <option value="13:00">13:00</option>
                        <option value="14:00">14:00</option>
                        <option value="15:00">15:00</option>
                        <option value="16:00">16:00</option>
                        <option value="17:00">17:00</option>
                        <option value="18:00">18:00</option>
                      </select>
                    </div>
                  </div>
                  <div className="cd_form_field">
                    <label>{t('address')}</label>
                    <input type="text" required placeholder={t('addressPlaceholder')} value={bookingForm.address} onChange={e => setBookingForm({...bookingForm, address: e.target.value})} />
                    {user?.location && !bookingForm.address && (
                      <button type="button" onClick={() => setBookingForm({...bookingForm, address: user.location})} style={{background:'none',border:'none',color:'var(--accent,#2bc32b)',fontSize:12,fontWeight:600,cursor:'pointer',padding:'4px 0',textAlign:'left'}}>
                        📍 {user.location} — foydalanish
                      </button>
                    )}
                  </div>
                  <div className="cd_form_field">
                    <label>{t('phone')}</label>
                    <input type="tel" required placeholder="+998 XX XXX XX XX" value={bookingForm.phone} onChange={e => setBookingForm({...bookingForm, phone: e.target.value})} />
                  </div>
                  <div className="cd_form_field">
                    <label>{t('workDescription')}</label>
                    <textarea rows="3" placeholder={t('workDescriptionPlaceholder')} value={bookingForm.description} onChange={e => setBookingForm({...bookingForm, description: e.target.value})} />
                  </div>
                  {bookingError && <p style={{color:'var(--danger,#ef4444)',fontSize:13,marginBottom:8}}>{bookingError}</p>}
                  <div className="cd_modal_actions">
                    <button type="button" className="cd_cancel" onClick={() => setShowBooking(false)}>{t('cancel')}</button>
                    <button type="submit" className="cd_submit" disabled={bookingLoading}>
                      {bookingLoading ? 'Yuborilmoqda...' : t('confirmBooking')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
      <Footer />
      {showLoginPrompt && <LoginPrompt onClose={() => setShowLoginPrompt(false)} />}
      {lightboxWork && lightboxWork.images && (
        <div className="cd_lightbox" onClick={() => setLightboxWork(null)}>
          <button className="cd_lightbox_close" onClick={() => setLightboxWork(null)}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <button className="cd_lightbox_arrow cd_lightbox_left" onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i - 1 + lightboxWork.images.length) % lightboxWork.images.length) }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <img className="cd_lightbox_img" src={lightboxWork.images[lightboxIndex]} alt={lightboxWork.title} onClick={e => e.stopPropagation()} />
          <button className="cd_lightbox_arrow cd_lightbox_right" onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i + 1) % lightboxWork.images.length) }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </button>
          <div className="cd_lightbox_dots" onClick={e => e.stopPropagation()}>
            {lightboxWork.images.map((_, i) => (
              <span key={i} className={`cd_lightbox_dot ${i === lightboxIndex ? 'active' : ''}`} onClick={() => setLightboxIndex(i)} />
            ))}
          </div>
          <span className="cd_lightbox_counter">{lightboxIndex + 1} / {lightboxWork.images.length}</span>
        </div>
      )}
    </div>
  )
}

export default CraftsmanDetail
