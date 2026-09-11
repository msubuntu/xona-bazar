import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { api } from '../services/api'
import MobileHeader from './MobileHeader.jsx'
import { SERVICE_TYPES, DISTRICTS } from '../data/craftsmen.js'
import { REVIEWS_ENABLED } from '../data/flags'
import { PasswordModal, TwoFactorModal } from '../components/SettingsModals.jsx'
import TelegramBotLink from '../components/TelegramBotLink'

const TABS = (t) => [
  { id: 'overview', label: t('overview'), icon: '\u{1F4CA}' },
  { id: 'bookings', label: t('bookings'), icon: '\u{1F4CB}' },
  { id: 'works', label: t('works'), icon: '\u{1F5BC}' },
  { id: 'settings', label: t('settings'), icon: '\u2699\uFE0F' },
]

const STATUS_LABELS = (t) => ({
  pending: t('status_pending'), quote_sent: t('status_quote_sent'), quote_accepted: t('status_quote_accepted'),
  in_progress: t('status_in_progress'), completed: t('status_completed'), cancelled: t('status_cancelled'),
})
const STATUS_CHIP = {
  pending: 'mob_chip_amber', quote_sent: 'mob_chip_blue', quote_accepted: 'mob_chip_green',
  in_progress: 'mob_chip_amber', completed: 'mob_chip_green', cancelled: 'mob_chip_red',
}
const FILTERS = (t) => [
  ['', t('all')], ['pending', t('status_pending')], ['quote_sent', t('status_quote_sent')],
  ['quote_accepted', t('status_quote_accepted')], ['in_progress', t('status_in_progress')], ['completed', t('status_completed')],
]

function serviceIcon(id) {
  const s = SERVICE_TYPES.find(x => x.id === id)
  return s ? s.icon : '\u{1F527}'
}
function serviceLabel(id) {
  const s = SERVICE_TYPES.find(x => x.id === id)
  return s ? s.label : id
}

export default function MobileCraftsmanDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, updateProfile } = useAuth()
  const { convertPrice, lang, setLang, t } = useSettings()
  const { dark, toggleTheme } = useTheme()

  const [tab, setTab] = useState('overview')
  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState({ totalBookings: 0, pendingBookings: 0, completedJobs: 0, averageRating: 0, totalRevenue: 0 })
  const [recentBookings, setRecentBookings] = useState([])

  const [bookings, setBookings] = useState([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [bookingFilter, setBookingFilter] = useState('')
  const [priceInputs, setPriceInputs] = useState({})
  const [updatingId, setUpdatingId] = useState(null)

  const [works, setWorks] = useState([])
  const [availableBookings, setAvailableBookings] = useState([])
  const [worksLoading, setWorksLoading] = useState(false)

  const [showAddWork, setShowAddWork] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [workForm, setWorkForm] = useState({ title: '', description: '', service: '' })
  const [workImages, setWorkImages] = useState([])
  const [workImagePreviews, setWorkImagePreviews] = useState([])
  const [workSaving, setWorkSaving] = useState(false)
  const [workBusy, setWorkBusy] = useState(null)
  const workPreviewRef = useRef([])

  useEffect(() => {
    workPreviewRef.current = workImagePreviews
  }, [workImagePreviews])

  useEffect(() => {
    return () => { workPreviewRef.current.forEach(u => { if (typeof u === 'string' && u.startsWith('blob:')) URL.revokeObjectURL(u) }) }
  }, [])

  const clearWorkImages = () => {
    workPreviewRef.current.forEach(u => { if (typeof u === 'string' && u.startsWith('blob:')) URL.revokeObjectURL(u) })
    workPreviewRef.current = []
    setWorkImages([])
    setWorkImagePreviews([])
  }

  const [profileForm, setProfileForm] = useState({
    name: '', services: [], experience: '', district: '', priceRange: '',
    workingHours: '', available: true, description: '', location: '', lat: null, lng: null,
    social: { telegram: '', instagram: '', website: '' },
  })
  const [profileMsg, setProfileMsg] = useState(null)
  const [profileSaving, setProfileSaving] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [show2FAModal, setShow2FAModal] = useState(false)
  const [twoFactor, setTwoFactor] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
const [cancelTarget, setCancelTarget] = useState(null)
const [cancelReason, setCancelReason] = useState('')

  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)
  const showToast = useCallback((msg) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2200)
  }, [])
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

  const isCraftsman = user && user.role === 'craftsman'

  const loadDashboard = useCallback(async () => {
    try {
      const d = await api.sellers.craftsmanDashboard()
      setStats(d.stats || {})
      setRecentBookings(d.recentBookings || [])
    } catch (err) { console.error(err) }
  }, [])

  const loadBookings = useCallback(async (statusFilter) => {
    setBookingsLoading(true)
    try {
      const params = statusFilter ? { status: statusFilter } : {}
      const d = await api.bookings.craftsman(params)
      setBookings(d.bookings || [])
    } catch (err) { console.error(err) }
    finally { setBookingsLoading(false) }
  }, [])

  const loadWorks = useCallback(async () => {
    setWorksLoading(true)
    try {
      const d = await api.sellers.completedWorks.list()
      setWorks(d.works || [])
      setAvailableBookings(d.availableBookings || [])
    } catch (err) { console.error(err) }
    finally { setWorksLoading(false) }
  }, [])

  const boot = useCallback(async () => {
    setLoading(true)
    await Promise.all([loadDashboard(), loadWorks()])
    setLoading(false)
  }, [loadDashboard, loadWorks])

  useEffect(() => {
    if (isCraftsman) boot()
  }, [isCraftsman, boot])

  useEffect(() => {
    if (isCraftsman && tab === 'bookings') loadBookings(bookingFilter)
    if (isCraftsman && tab === 'works') loadWorks()
  }, [isCraftsman, tab, bookingFilter, loadBookings, loadWorks])

  useEffect(() => {
    if (location.state?.tab === 'settings') {
      setTab('settings')
      setProfileForm(prev => {
        const next = { ...prev }
        if (location.state.lat && location.state.lng) {
          next.lat = location.state.lat
          next.lng = location.state.lng
        }
        if (location.state.locationName) next.location = location.state.locationName
        return next
      })
    }
  }, [location.state])

  useEffect(() => {
    if (isCraftsman) {
      setProfileForm({
        name: user.name || '',
        services: Array.isArray(user.services) ? user.services : [],
        experience: user.experience || '',
        district: user.district || '',
        priceRange: user.priceRange || '',
        workingHours: user.workingHours || '09:00 - 18:00',
        available: user.available !== false,
        description: user.description || '',
        location: user.location || '',
        lat: user.lat || null,
        lng: user.lng || null,
        social: user.social || { telegram: '', instagram: '', website: '' },
      })
      setTwoFactor(user.twoFactor === true)
    }
  }, [isCraftsman, user])

  const setPrice = async (bookingId) => {
    const price = Number(priceInputs[bookingId])
    if (!price) return
    setUpdatingId(bookingId)
    try {
      await api.bookings.setPrice(bookingId, price)
      await loadBookings(bookingFilter)
      setPriceInputs(prev => { const n = { ...prev }; delete n[bookingId]; return n })
      showToast(t('status_quote_sent'))
    } catch (err) { showToast(err.message || t('error')) }
    finally { setUpdatingId(null) }
  }

  const updateStatus = async (bookingId, status) => {
    setUpdatingId(bookingId)
    try {
      await api.bookings.updateStatus(bookingId, status)
      await loadBookings(bookingFilter)
      loadDashboard()
      showToast(t('status_updated'))
    } catch (err) { showToast(err.message || t('error')) }
    finally { setUpdatingId(null) }
  }

  const confirmCancelBooking = async () => {
    if (!cancelTarget) return
    setUpdatingId(cancelTarget._id)
    try {
      const reason = cancelReason.trim()
      await api.bookings.updateStatus(cancelTarget._id, 'cancelled', reason || undefined)
      await loadBookings(bookingFilter)
      loadDashboard()
      setCancelTarget(null)
      setCancelReason('')
      showToast(t('booking_cancelled'))
    } catch (err) { showToast(err.message || t('error')) }
    finally { setUpdatingId(null) }
  }

  const statsView = useMemo(() => [
    { label: t('total'), val: stats.totalBookings || 0, color: null },
    { label: t('pending'), val: stats.pendingBookings || 0, color: 'var(--mob-amber)' },
    { label: t('completed'), val: stats.completedJobs || 0, color: 'var(--mob-accent)' },
    ...(REVIEWS_ENABLED ? [{ label: t('rating'), val: `${stats.averageRating || 0} \u2605`, color: 'var(--mob-amber)' }] : []),
  ], [stats, t])

  const handleWorkImageSelect = (e) => {
    const files = Array.from(e.target.files || [])
    const remaining = 6 - workImages.length
    const toAdd = files.slice(0, remaining)
    setWorkImages(prev => [...prev, ...toAdd])
    const newPreviews = toAdd.map(f => URL.createObjectURL(f))
    setWorkImagePreviews(prev => [...prev, ...newPreviews])
  }

  const removeWorkImage = (idx) => {
    if (workImagePreviews[idx]?.startsWith('blob:')) URL.revokeObjectURL(workImagePreviews[idx])
    setWorkImages(prev => prev.filter((_, i) => i !== idx))
    setWorkImagePreviews(prev => prev.filter((_, i) => i !== idx))
  }

  const handleAddWork = async () => {
    if (!selectedBooking || !workForm.title.trim()) return
    setWorkSaving(true)
    try {
      const fd = new FormData()
      fd.append('bookingId', selectedBooking._id)
      fd.append('title', workForm.title)
      fd.append('description', workForm.description)
      fd.append('service', workForm.service)
      workImages.forEach(img => fd.append('images', img))
      await api.sellers.completedWorks.create(fd)
      setShowAddWork(false)
      setSelectedBooking(null)
      setWorkForm({ title: '', description: '', service: '' })
      clearWorkImages()
      await loadWorks()
      await loadDashboard()
      showToast(t('work_added'))
    } catch (err) { showToast(err.message || t('error')) }
    finally { setWorkSaving(false) }
  }

  const handleDeleteWork = async (workId) => {
    setConfirmDelete(null)
    setWorkBusy(workId)
    try {
      await api.sellers.completedWorks.delete(workId)
      await loadWorks()
      await loadDashboard()
      showToast(t('work_deleted'))
    } catch (err) { showToast(err.message || t('error')) }
    finally { setWorkBusy(null) }
  }

  const setSocial = (field, value) => {
    setProfileForm(prev => ({ ...prev, social: { ...prev.social, [field]: value } }))
  }

  const disableTwoFactor = async () => {
    try {
      await api.auth.notifications({ twoFactor: false })
      setTwoFactor(false)
    } catch (err) {
      alert(err?.message || t('error'))
    }
  }

  const saveProfile = async () => {    setProfileSaving(true)
    setProfileMsg(null)
    try {
      await updateProfile(profileForm)
      setProfileMsg({ type: 'success', text: t('saved') })
      setTimeout(() => setProfileMsg(null), 2500)
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message || t('error_occurred') })
    } finally { setProfileSaving(false) }
  }

  return (
    <div className="mob">
      <MobileHeader />
      <div className="mob_page_head">
        <button className="mob_back" onClick={() => navigate(-1)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div className="mob_page_title">{t('craftsman_panel')}</div>
      </div>

      <div className="mob_db_tabs">
        {TABS(t).map(tb => (
          <button key={tb.id} className={`mob_db_tab${tab === tb.id ? ' mob_db_tab_active' : ''}`} onClick={() => setTab(tb.id)}>
            {tb.icon} {tb.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mob_loader"><div className="mob_spinner" /></div>
      ) : (
        <>
          {tab === 'overview' && (
            <>
              <div className="mob_stats">
                {statsView.map((s, i) => (
                  <div className="mob_stat" key={i}>
                    <div className="mob_stat_val" style={s.color ? { color: s.color } : undefined}>{s.val}</div>
                    <div className="mob_stat_label">{s.label}</div>
                  </div>
                ))}
              </div>
              {stats.totalRevenue > 0 && (
                <div className="mob_section" style={{ margin: '12px 16px 0' }}>
                  <div className="mob_person_meta" style={{ justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700 }}>{t('total_revenue')}</span>
                    <span style={{ color: 'var(--mob-accent)', fontWeight: 800 }}>{convertPrice(stats.totalRevenue)}</span>
                  </div>
                </div>
              )}
              <div className="mob_section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div className="mob_page_title" style={{ fontSize: 16, margin: 0 }}>{t('recent_bookings')}</div>
                  <button className="mob_btn_sm mob_btn" onClick={() => setTab('bookings')}>{t('all')}</button>
                </div>
                {recentBookings.length === 0 ? (
                  <div className="mob_empty"><div className="mob_empty_title">{t('no_bookings')}</div></div>
                ) : recentBookings.map(b => (
                  <div className="mob_row" style={{ padding: '12px 14px' }} key={b._id}>
                    <div className="mob_row_icon">{serviceIcon(b.service)}</div>
                    <div className="mob_row_body">
                      <div className="mob_row_title">{b.userId?.name || t('client')}</div>
                      <div className="mob_row_sub">{b.date ? new Date(b.date).toLocaleDateString('uz') : ''} {b.time || ''}</div>
                    </div>
                    <div className="mob_row_chevron" style={{ alignSelf: 'center' }}>
                      <span className={`mob_chip ${STATUS_CHIP[b.status] || 'mob_chip_blue'}`}>{STATUS_LABELS(t)[b.status] || b.status}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mob_section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div className="mob_page_title" style={{ fontSize: 16, margin: 0 }}>{t('completed_works')}</div>
                  <button className="mob_btn_sm mob_btn" onClick={() => setTab('works')}>{t('manage')}</button>
                </div>
                {works.length === 0 ? (
                  <div className="mob_empty"><div className="mob_empty_title">{t('no_works_added')}</div></div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                    {works.slice(0, 4).map(w => (
                      <div key={w._id} className="mob_work_card">
                        {w.images && w.images.length > 0 && (
                          <img className="mob_work_img" src={w.images[0]} alt={w.title} style={{ aspectRatio: '1 / 1' }} />
                        )}
                        <div className="mob_work_info">
                          <div className="mob_work_title" style={{ fontSize: 13 }}>{w.title || t('work')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {tab === 'bookings' && (
            <>
              <div className="mob_cats" style={{ paddingTop: 2 }}>
                {FILTERS(t).map(([val, label]) => (
                  <button key={val} className={`mob_filter_chip${bookingFilter === val ? ' active' : ''}`} onClick={() => setBookingFilter(val)}>{label}</button>
                ))}
              </div>
              {bookingsLoading ? (
                <div className="mob_loader"><div className="mob_spinner" /></div>
              ) : bookings.length === 0 ? (
                <div className="mob_empty">
                  <div className="mob_empty_title">{bookingFilter ? t('no_bookings_for_filter') : t('no_bookings_yet')}</div>
                </div>
              ) : (
                <div style={{ padding: '4px 16px' }}>
                  {bookings.map(b => (
                    <div className="mob_order_card" key={b._id}>
                      <div className="mob_order_top">
                        <div className="mob_order_buyer">
                          <div className="mob_order_avatar">{(b.userId?.name || b.phone || '?')[0].toUpperCase()}</div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{b.userId?.name || t('unknown')}</div>
                            <div style={{ fontSize: 12, color: 'var(--mob-muted)' }}>{b.userId?.phone || b.phone || ''}</div>
                          </div>
                        </div>
                        <div className="mob_order_meta">
                          <span className={`mob_chip ${STATUS_CHIP[b.status] || 'mob_chip_blue'}`}>{STATUS_LABELS(t)[b.status] || b.status}</span>
                          <span className="mob_order_date">{b.createdAt ? new Date(b.createdAt).toLocaleDateString('uz') : ''}</span>
                        </div>
                      </div>
                      <div className="mob_order_item">
                        <span style={{ fontSize: 22 }}>{serviceIcon(b.service)}</span>
                        <div className="mob_order_item_info">
                          <div className="mob_order_item_name">{serviceLabel(b.service)}</div>
                          <div style={{ fontSize: 12, color: 'var(--mob-muted)' }}>
                            {b.date ? new Date(b.date).toLocaleDateString('uz') : ''}{b.time ? `, ${b.time}` : ''}
                          </div>
                          {b.address && <div className="mob_order_addr" style={{ fontSize: 12 }}>{'\u{1F4CD}' + ' ' + b.address}</div>}
                        </div>
                      </div>
                      {b.description && <p style={{ fontSize: 13, color: 'var(--mob-text-2)', lineHeight: 1.6, margin: '8px 0' }}>{b.description}</p>}

                      {b.status === 'pending' && (
                        <div className="mob_person_meta" style={{ marginTop: 10, alignItems: 'center' }}>
                          <input
                            className="mob_input"
                            type="number"
                            inputMode="numeric"
                            placeholder={t('price_som')}
                            style={{ flex: 1, minWidth: 0, padding: '11px 12px', fontSize: 13 }}
                            value={priceInputs[b._id] || ''}
                            onChange={e => setPriceInputs(prev => ({ ...prev, [b._id]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') setPrice(b._id) }}
                          />
                          <button className="mob_btn mob_btn_sm" style={{ flexShrink: 0 }} disabled={updatingId === b._id || !priceInputs[b._id]} onClick={() => setPrice(b._id)}>
                            {updatingId === b._id ? '...' : t('send_offer')}
                          </button>
                        </div>
                      )}

                      {b.status === 'quote_sent' && b.quotedPrice > 0 && (
                        <div className="mob_person_meta" style={{ marginTop: 10 }}>
                          <span style={{ fontSize: 13 }}>{t('offer_price')}: <strong style={{ color: 'var(--mob-accent)' }}>{convertPrice(b.quotedPrice)}</strong></span>
                        </div>
                      )}

                      {b.status === 'completed' && (
                        <div className="mob_order_bottom" style={{ marginTop: 10 }}>
                          <div className="mob_order_total">{t('completed')} — {convertPrice(b.finalPrice || b.quotedPrice || 0)}</div>
                          {b.rated && REVIEWS_ENABLED && (
                            <div style={{ marginTop: 6 }}>
                              <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
                                {[1, 2, 3, 4, 5].map(s => (
                                  <svg key={s} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={s <= (b.rating || 0) ? '#f59e0b' : 'none'} stroke="#f59e0b" strokeWidth="2">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                  </svg>
                                ))}
                              </div>
                              {b.review && <div style={{ fontSize: 12, color: 'var(--mob-text-2)' }}>{b.review}</div>}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mob_order_actions" style={{ marginTop: 12 }}>
                        {b.status === 'quote_accepted' && (
                          <button className="mob_btn mob_btn_sm" disabled={updatingId === b._id} onClick={() => updateStatus(b._id, 'in_progress')}>
                            {updatingId === b._id ? '...' : t('started_work')}
                          </button>
                        )}
                        {b.status === 'in_progress' && (
                          <button className="mob_btn mob_btn_sm" disabled={updatingId === b._id} onClick={() => updateStatus(b._id, 'completed')}>
                            {updatingId === b._id ? '...' : t('completed_work')}
                          </button>
                        )}
                        {(b.status === 'pending' || b.status === 'quote_sent') && (
                          <button className="mob_btn mob_btn_sm mob_btn_ghost" style={{ color: 'var(--mob-red)' }} disabled={updatingId === b._id} onClick={() => { setCancelReason(''); setCancelTarget(b) }}>
                            {updatingId === b._id ? '...' : t('cancel')}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'works' && (
            <>
              <div className="mob_section" style={{ paddingTop: 2 }}>
                <button className="mob_btn" onClick={() => { if (availableBookings.length === 0) { showToast(t('no_completed_booking')); return } setShowAddWork(true) }}>
                  + {t('add_work')}
                </button>
                {availableBookings.length === 0 && works.length > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--mob-muted)', marginTop: 8 }}>{t('no_available_bookings')}</div>
                )}
              </div>
              {worksLoading ? (
                <div className="mob_loader"><div className="mob_spinner" /></div>
              ) : works.length === 0 ? (
                <div className="mob_empty">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <div className="mob_empty_title">{t('no_works')}</div>
                </div>
              ) : (
                <div className="mob_list" style={{ paddingTop: 2 }}>
                  {works.map(w => (
                    <div className="mob_work_card" key={w._id}>
                      {w.images && w.images.length > 0 && (
                        <div className="mob_work_img_wrap">
                          <img className="mob_work_img" src={w.images[0]} alt={w.title || t('work')} />
                          {w.images.length > 1 && (
                            <span style={{ position: 'absolute', right: 10, bottom: 10, background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 11, padding: '3px 8px', borderRadius: 8 }}>
                              {w.images.length} {t('images')}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="mob_work_info">
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <div className="mob_work_title">{w.title || t('work')}</div>
                          <button
                            className="mob_btn mob_btn_sm mob_btn_ghost"
                            style={{ color: 'var(--mob-red)', flexShrink: 0 }}
                            disabled={workBusy === w._id}
                            onClick={() => setConfirmDelete(w)}
                          >
                            {workBusy === w._id ? '...' : t('delete')}
                          </button>
                        </div>
                        {w.description && <div style={{ fontSize: 13, color: 'var(--mob-text-2)', lineHeight: 1.6 }}>{w.description}</div>}
                        <div className="mob_work_meta">
                          {w.service && <span className="mob_work_service">{serviceIcon(w.service)} {serviceLabel(w.service)}</span>}
                          {w.completedAt && <span className="mob_work_date">{new Date(w.completedAt).toLocaleDateString('uz')}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'settings' && (
            <div style={{ padding: '2px 16px 20px' }}>
              <div className="mob_section">
                <div className="mob_page_title" style={{ fontSize: 16, marginBottom: 12 }}>{t('profile')}</div>

                <div className="mob_field">
                  <label className="mob_label">{t('name')}</label>
                  <input className="mob_input" type="text" value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} />
                </div>

                <div className="mob_field">
                  <label className="mob_label">{t('services')}</label>
                  <div className="mob_cats" style={{ padding: 0 }}>
                    {SERVICE_TYPES.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        className={`mob_cat${profileForm.services.includes(s.id) ? ' mob_cat_active' : ''}`}
                        onClick={() => setProfileForm(p => ({
                          ...p,
                          services: p.services.includes(s.id) ? p.services.filter(x => x !== s.id) : [...p.services, s.id],
                        }))}
                      >
                        {s.icon} {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mob_field">
                  <label className="mob_label">{t('experience')}</label>
                  <input className="mob_input" type="text" placeholder={t('exp_placeholder')} value={profileForm.experience} onChange={e => setProfileForm(p => ({ ...p, experience: e.target.value }))} />
                </div>

                <div className="mob_field">
                  <label className="mob_label">{t('district')}</label>
                  <select className="mob_input" value={profileForm.district} onChange={e => setProfileForm(p => ({ ...p, district: e.target.value }))}>
                    <option value="">{t('not_selected')}</option>
                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div className="mob_field">
                  <label className="mob_label">{t('price_range')}</label>
                  <input className="mob_input" type="text" placeholder={t('price_range_placeholder')} value={profileForm.priceRange} onChange={e => setProfileForm(p => ({ ...p, priceRange: e.target.value }))} />
                </div>

                <div className="mob_field">
                  <label className="mob_label">{t('working_hours')}</label>
                  <input className="mob_input" type="text" placeholder="09:00 - 18:00" value={profileForm.workingHours} onChange={e => setProfileForm(p => ({ ...p, workingHours: e.target.value }))} />
                </div>

                <div className="mob_field">
                  <label className="mob_label">{t('availability')}</label>
                  <button
                    type="button"
                    className={`mob_btn mob_btn_sm${profileForm.available ? '' : ' mob_btn_ghost'}`}
                    style={profileForm.available ? { background: 'var(--mob-accent)', color: '#fff' } : {}}
                    onClick={() => setProfileForm(p => ({ ...p, available: !p.available }))}
                  >
                    {profileForm.available ? `\u{1F7E2} ${t('available')}` : `\u{1F534} ${t('busy')}`}
                  </button>
                </div>

                <div className="mob_field">
                  <label className="mob_label">{t('description')}</label>
                  <textarea className="mob_input mob_textarea" rows={4} value={profileForm.description} onChange={e => setProfileForm(p => ({ ...p, description: e.target.value }))} />
                </div>

                <div className="mob_field">
                  <label className="mob_label">{t('address')}</label>
                  <input className="mob_input" type="text" value={profileForm.location} onChange={e => setProfileForm(p => ({ ...p, location: e.target.value }))} />
                  <button type="button" className="mob_btn mob_btn_ghost mob_loc_pick_btn" style={{ marginTop: 8 }} onClick={() => navigate('/location-picker', { state: { returnPath: '/craftsman-dashboard' } })}>
                    {t('mark_on_map')}
                  </button>
                  {profileForm.lat && profileForm.lng && (
                    <span className="mob_loc_saved" style={{ display: 'block', marginTop: 8 }}>{t('marked')}: {Number(profileForm.lat).toFixed(5)}, {Number(profileForm.lng).toFixed(5)}</span>
                  )}
                </div>

                {profileMsg && (
                  <div style={{ fontSize: 13, marginBottom: 10, color: profileMsg.type === 'success' ? 'var(--mob-accent)' : 'var(--mob-red)' }}>{profileMsg.text}</div>
                )}
                <button className="mob_btn" disabled={profileSaving} onClick={saveProfile}>
                  {profileSaving ? t('saving') : t('save')}
                </button>
              </div>

              <div className="mob_section" style={{ marginTop: 16 }}>
                <div className="mob_page_title" style={{ fontSize: 16, marginBottom: 12 }}>{t('social_networks')}</div>
                <div className="mob_field">
                  <label className="mob_label">Telegram</label>
                  <input className="mob_input" type="text" value={profileForm.social.telegram} onChange={e => setSocial('telegram', e.target.value)} placeholder={t('telegram_placeholder')} />
                </div>
                <div className="mob_field">
                  <label className="mob_label">Instagram</label>
                  <input className="mob_input" type="text" value={profileForm.social.instagram} onChange={e => setSocial('instagram', e.target.value)} placeholder={t('instagram_placeholder')} />
                </div>
                <div className="mob_field">
                  <label className="mob_label">{t('website')}</label>
                  <input className="mob_input" type="text" value={profileForm.social.website} onChange={e => setSocial('website', e.target.value)} placeholder={t('website_placeholder')} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--mob-text-2)', marginBottom: 12 }}>{t('links_visible')}</div>
                <button className="mob_btn" disabled={profileSaving} onClick={saveProfile}>
                  {profileSaving ? t('saving') : t('save')}
                </button>
              </div>

              <div className="mob_section" style={{ marginTop: 16 }}>
                <div className="mob_page_title" style={{ fontSize: 16, marginBottom: 12 }}>{t('app_settings')}</div>
                <div className="mob_field">
                  <label className="mob_label">{t('choose_language')}</label>
                  <select className="mob_input" value={lang} onChange={e => setLang(e.target.value)}>
                    <option value="uz">O'zbekcha</option>
                    <option value="ru">Русский</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <button type="button" className={`mob_btn ${dark ? 'mob_btn_success' : 'mob_btn_ghost'}`} style={{ width: '100%' }} onClick={toggleTheme}>
                  {dark ? `🌙 ${t('dark_mode')}` : `☀️ ${t('light_mode')}`}
                </button>
                <div style={{ marginTop: 14 }}>
                  <TelegramBotLink />
                </div>
              </div>

              <div className="mob_section" style={{ marginTop: 16 }}>
                <div className="mob_page_title" style={{ fontSize: 16, marginBottom: 12 }}>{t('account_security')}</div>
                <button type="button" className="mob_btn mob_btn_ghost" style={{ width: '100%', marginBottom: 10 }} onClick={() => setShowPasswordModal(true)}>
                  {t('change_password')}
                </button>
                <button
                  type="button"
                  className={`mob_btn ${twoFactor ? 'mob_btn_success' : 'mob_btn_ghost'}`}
                  style={{ width: '100%' }}
                  onClick={() => { if (!twoFactor) setShow2FAModal(true); else disableTwoFactor() }}
                >
                  {twoFactor ? t('two_factor_on') : t('two_factor_enable')}
                </button>
              </div>

              {showPasswordModal && <PasswordModal onClose={() => setShowPasswordModal(false)} />}
              {show2FAModal && <TwoFactorModal onClose={() => setShow2FAModal(false)} onEnable={() => setTwoFactor(true)} />}
            </div>
          )}
        </>
      )}

      {toast && <div className="mob_toast">{toast}</div>}

      {showAddWork && (
        <div className="mob_overlay" onClick={() => { setShowAddWork(false); clearWorkImages() }}>
          <div className="mob_sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mob_sheet_grab" />
            <div className="mob_sheet_title">{t('add_new_work')}</div>

            <div className="mob_field">
              <label className="mob_label">{t('booking')}</label>
              <select className="mob_input" value={selectedBooking?._id || ''} onChange={e => {
                const b = availableBookings.find(x => x._id === e.target.value)
                setSelectedBooking(b || null)
                setWorkForm(f => ({ ...f, service: b?.service || '' }))
              }}>
                <option value="">{t('select_booking')}</option>
                {availableBookings.map(b => (
                  <option key={b._id} value={b._id}>
                    {serviceLabel(b.service)} — {(b.userId?.name || t('client'))} ({b.date ? new Date(b.date).toLocaleDateString('uz') : ''})
                  </option>
                ))}
              </select>
            </div>

            <div className="mob_field">
              <label className="mob_label">{t('title')}</label>
              <input className="mob_input" type="text" value={workForm.title} onChange={e => setWorkForm(f => ({ ...f, title: e.target.value }))} placeholder={t('title_placeholder')} />
            </div>

            <div className="mob_field">
              <label className="mob_label">{t('service_type')}</label>
              <select className="mob_input" value={workForm.service} onChange={e => setWorkForm(f => ({ ...f, service: e.target.value }))}>
                <option value="">{t('not_selected')}</option>
                {SERVICE_TYPES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>

            <div className="mob_field">
              <label className="mob_label">{t('description')}</label>
              <textarea className="mob_input mob_textarea" rows={3} value={workForm.description} onChange={e => setWorkForm(f => ({ ...f, description: e.target.value }))} placeholder={t('work_desc_placeholder')} />
            </div>

            <div className="mob_field">
              <label className="mob_label">{t('photos')} ({workImages.length}/6)</label>
              <div className="mob_upload_grid">
                {workImagePreviews.map((p, i) => (
                  <div className="mob_upload_thumb" key={i}>
                    <img src={p} alt="" />
                    <span className="mob_upload_badge">#{i + 1}</span>
                    <button className="mob_upload_remove" onClick={() => removeWorkImage(i)} aria-label={t('remove')}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                ))}
                {workImages.length < 6 && (
                  <label className="mob_upload_add">
                    <span style={{ fontSize: 22, lineHeight: 1 }}>+</span>
                    <span>{t('photo')}</span>
                    <input type="file" accept="image/*" multiple hidden onChange={handleWorkImageSelect} />
                  </label>
                )}
              </div>
              <span className="mob_upload_hint">{t('image_hint')}</span>
            </div>

            <button className="mob_btn" style={{ marginTop: 4 }} disabled={workSaving || !selectedBooking || !workForm.title.trim()} onClick={handleAddWork}>
              {workSaving ? t('saving') : t('save_work')}
            </button>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="mob_overlay" onClick={() => setConfirmDelete(null)}>
          <div className="mob_sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mob_sheet_grab" />
            <div className="mob_sheet_title">{t('delete_work')}</div>
            <p style={{ fontSize: 14, color: 'var(--mob-text-2)', margin: '4px 0 16px' }}>"{confirmDelete.title || t('work')}" {t('delete_confirm')}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="mob_btn mob_btn_ghost" style={{ flex: 1 }} onClick={() => setConfirmDelete(null)}>{t('cancel')}</button>
              <button className="mob_btn" style={{ flex: 1, background: 'var(--mob-red)', color: '#fff' }} onClick={() => handleDeleteWork(confirmDelete._id)}>{t('delete')}</button>
            </div>
          </div>
        </div>
      )}

      {cancelTarget && (
        <div className="mob_overlay" onClick={() => { if (updatingId !== cancelTarget._id) setCancelTarget(null) }}>
          <div className="mob_sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mob_sheet_grab" />
            <div className="mob_sheet_title">{t('cancel_booking')}</div>
            <p style={{ fontSize: 14, color: 'var(--mob-text-2)', margin: '4px 0 16px' }}>
              <strong>{cancelTarget.userId?.name || t('client')}</strong> {t('booking_cancel_notice')}
            </p>
            <div className="mob_field" style={{ margin: '0 0 16px' }}>
              <textarea className="mob_input mob_textarea" rows={3} placeholder={t('cancel_reason_placeholder')} value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="mob_btn mob_btn_ghost" style={{ flex: 1 }} onClick={() => setCancelTarget(null)}>{t('cancel')}</button>
              <button className="mob_btn" style={{ flex: 1, background: 'var(--mob-red)', color: '#fff' }} disabled={updatingId === cancelTarget._id} onClick={confirmCancelBooking}>
                {updatingId === cancelTarget._id ? '...' : t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
