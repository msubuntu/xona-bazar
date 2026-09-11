import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { useMessages } from '../context/MessagesContext.jsx'
import { getSocket } from '../services/socket'
import { api } from '../services/api'
import TelegramBotLink from './TelegramBotLink'
import Header from './header'
import LocationPicker from './LocationPicker'
import { SERVICE_TYPES, DISTRICTS } from '../data/craftsmen'
import { REVIEWS_ENABLED } from '../data/flags'
import { PasswordModal, TwoFactorModal } from './SettingsModals'
import '../components_css/craftsman-dashboard.css'

const SECTIONS = [
  { id: 'overview', labelKey: 'overview', icon: '📊' },
  { id: 'bookings', labelKey: 'bookings', icon: '📋' },
  { id: 'works', labelKey: 'completedWorks', icon: '🖼' },
  { id: 'messages', labelKey: 'messages', icon: '💬' },
  { id: 'settings', labelKey: 'settings', icon: '⚙️' },
]

const BOOKING_FILTERS = [
  { value: '', labelKey: 'all' },
  { value: 'pending', labelKey: 'filterPending' },
  { value: 'quote_sent', labelKey: 'filterQuoteSent' },
  { value: 'quote_accepted', labelKey: 'filterQuoteAccepted' },
  { value: 'in_progress', labelKey: 'filterInProgress' },
  { value: 'completed', labelKey: 'filterCompleted' },
  { value: 'cancelled', labelKey: 'filterCancelled' },
]

const getStatusLabels = (t) => ({
  pending: t('statusPending'), quote_sent: t('statusQuoteSent'), quote_accepted: t('statusQuoteAccepted'),
  in_progress: t('statusInProgress'), completed: t('statusCompleted'), cancelled: t('statusCancelled'),
})

function CraftsmanDashboard() {
  const { user, updateProfile } = useAuth()
  const { t, convertPrice, lang, setLang } = useSettings()
  const { dark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const { conversations, sendMessage, openConversation, activeConversation, closeConversation } = useMessages()

  const [activeSection, setActiveSection] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  const [stats, setStats] = useState({ totalBookings: 0, pendingBookings: 0, totalRevenue: 0, averageRating: 0, completedJobs: 0 })
  const [recentBookings, setRecentBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [bookings, setBookings] = useState([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [bookingsError, setBookingsError] = useState(null)
  const [bookingFilter, setBookingFilter] = useState('')
  const [updatingBookingId, setUpdatingBookingId] = useState(null)
  const [priceInputs, setPriceInputs] = useState({})
  const [cancellingBooking, setCancellingBooking] = useState(null)
  const [cancelReason, setCancelReason] = useState('')

  const [profileForm, setProfileForm] = useState({
    name: '', services: [], experience: '', district: '', priceRange: '',
    workingHours: '09:00 - 18:00', available: true, location: '', lat: null, lng: null,
    description: '', social: { telegram: '', instagram: '', website: '' },
  })
  const [profileSaveMsg, setProfileSaveMsg] = useState(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [show2FAModal, setShow2FAModal] = useState(false)
  const [twoFactor, setTwoFactor] = useState(false)

  const [works, setWorks] = useState([])
  const [availableBookings, setAvailableBookings] = useState([])
  const [worksLoading, setWorksLoading] = useState(false)
  const [showAddWork, setShowAddWork] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [workForm, setWorkForm] = useState({ title: '', description: '', service: '' })
  const [workImages, setWorkImages] = useState([])
  const [workImagePreviews, setWorkImagePreviews] = useState([])
  const [workSaving, setWorkSaving] = useState(false)
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

  const loadWorks = useCallback(async () => {
    setWorksLoading(true)
    try {
      const data = await api.sellers.completedWorks.list()
      setWorks(data.works || [])
      setAvailableBookings(data.availableBookings || [])
    } catch (err) {
      console.error('Failed to load works:', err)
    } finally {
      setWorksLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeSection === 'works') loadWorks()
  }, [activeSection, loadWorks])

  const selectBookingForWork = (booking) => {
    setSelectedBooking(booking)
    const serviceName = booking.service || ''
    setWorkForm({ title: '', description: '', service: serviceName })
    setShowAddWork(true)
  }

  const handleWorkImageSelect = (e) => {
    const files = Array.from(e.target.files || [])
    const remaining = 6 - workImages.length
    const toAdd = files.slice(0, remaining)
    setWorkImages(prev => [...prev, ...toAdd])
    const newPreviews = toAdd.map(f => URL.createObjectURL(f))
    setWorkImagePreviews(prev => [...prev, ...newPreviews])
  }

  const removeWorkImage = (idx) => {
    const url = workImagePreviews[idx]
    if (url.startsWith('blob:')) URL.revokeObjectURL(url)
    setWorkImages(prev => prev.filter((_, i) => i !== idx))
    setWorkImagePreviews(prev => prev.filter((_, i) => i !== idx))
  }

  const handleAddWork = async (e) => {
    e.preventDefault()
    if (!selectedBooking || !workForm.title.trim()) return
    setWorkSaving(true)
    try {
      const fd = new FormData()
      fd.append('bookingId', selectedBooking._id)
      fd.append('title', workForm.title)
      fd.append('description', workForm.description)
      fd.append('service', workForm.service)
      workImages.forEach(img => fd.append('images', img))
      const data = await api.sellers.completedWorks.create(fd)
      setWorks(prev => [data.work, ...prev])
      setAvailableBookings(prev => prev.filter(b => b._id !== selectedBooking._id))
      setWorkForm({ title: '', description: '', service: '' })
      setSelectedBooking(null)
      clearWorkImages()
      setShowAddWork(false)
    } catch (err) {
      alert(err.message || t('error'))
    } finally {
      setWorkSaving(false)
    }
  }

  const handleDeleteWork = async (workId) => {
    if (!confirm(t('confirmDeleteWork'))) return
    try {
      await api.sellers.completedWorks.delete(workId)
      setWorks(prev => prev.filter(w => w._id !== workId))
    } catch (err) {
      alert(err.message || t('error'))
    }
  }

  useEffect(() => {
    return () => { workPreviewRef.current.forEach(u => { if (typeof u === 'string' && u.startsWith('blob:')) URL.revokeObjectURL(u) }) }
  }, [])

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.sellers.craftsmanDashboard()
      setStats(data.stats)
      setRecentBookings(data.recentBookings || [])
    } catch (err) {
      setError(err.message || t('errorLoadingData'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        services: user.services || [],
        experience: user.experience || '',
        district: user.district || '',
        priceRange: user.priceRange || '',
        workingHours: user.workingHours || '09:00 - 18:00',
        available: user.available !== false,
        location: user.location || '',
        lat: user.lat || null,
        lng: user.lng || null,
        description: user.description || '',
        social: user.social || { telegram: '', instagram: '', website: '' },
      })
      setTwoFactor(user.twoFactor === true)
    }
  }, [user])

  const loadBookings = useCallback(async (statusFilter = '') => {
    setBookingsLoading(true)
    setBookingsError(null)
    try {
      const params = {}
      if (statusFilter) params.status = statusFilter
      const data = await api.bookings.craftsman(params)
      setBookings(data.bookings || [])
    } catch (err) {
      setBookingsError(err.message || t('errorLoadingBookings'))
    } finally {
      setBookingsLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (activeSection === 'bookings') loadBookings(bookingFilter)
  }, [activeSection, bookingFilter, loadBookings])

  useEffect(() => {
    if (!user) return
    const socket = getSocket()
    const handler = () => {
      if (activeSection === 'bookings') loadBookings(bookingFilter)
    }
    socket.on('booking_updated', handler)
    return () => socket.off('booking_updated', handler)
  }, [user, activeSection, bookingFilter, loadBookings])

  const handleSetPrice = async (bookingId) => {
    const price = Number(priceInputs[bookingId])
    if (!price || price <= 0) return
    setUpdatingBookingId(bookingId)
    try {
      await api.bookings.setPrice(bookingId, price)
      setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, quotedPrice: price, status: 'quote_sent' } : b))
      setPriceInputs(prev => { const n = { ...prev }; delete n[bookingId]; return n })
    } catch (err) {
      console.error('Price set error:', err)
    } finally {
      setUpdatingBookingId(null)
    }
  }

  const handleBookingStatus = async (bookingId, newStatus) => {
    setUpdatingBookingId(bookingId)
    try {
      await api.bookings.updateStatus(bookingId, newStatus)
      setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, status: newStatus } : b))
      loadDashboard()
    } catch (err) {
      console.error('Booking status error:', err)
    } finally {
      setUpdatingBookingId(null)
    }
  }

  const handleCancelBooking = async () => {
    if (!cancellingBooking) return
    setUpdatingBookingId(cancellingBooking._id)
    try {
      const reason = cancelReason.trim()
      await api.bookings.updateStatus(cancellingBooking._id, 'cancelled', reason || undefined)
      setBookings(prev => prev.map(b => b._id === cancellingBooking._id ? { ...b, status: 'cancelled', cancelReason: reason } : b))
      loadDashboard()
      setCancellingBooking(null)
      setCancelReason('')
    } catch (err) {
      console.error('Booking cancel error:', err)
    } finally {
      setUpdatingBookingId(null)
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setProfileSaveMsg(null)
    try {
      await updateProfile(profileForm)
      setProfileSaveMsg({ type: 'success', text: t('saved') })
    } catch (err) {
      setProfileSaveMsg({ type: 'error', text: err.message || t('error') })
    }
  }

  const disableTwoFactor = async () => {
    try {
      await api.auth.notifications({ twoFactor: false })
      setTwoFactor(false)
    } catch (err) {
      alert(err?.message || t('error'))
    }
  }

  const setSocial = (field, value) => {
    setProfileForm(prev => ({ ...prev, social: { ...prev.social, [field]: value } }))
  }

  const toggleService = (id) => {
    setProfileForm(prev => ({
      ...prev,
      services: prev.services.includes(id) ? prev.services.filter(s => s !== id) : [...prev.services, id],
    }))
  }

  const [msgInput, setMsgInput] = useState('')
  const chatRef = useRef(null)

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [activeConversation, activeConversation?.messages?.length])

  const handleSend = () => {
    if (!msgInput.trim() || !activeConversation) return
    sendMessage(activeConversation.id, msgInput.trim(), activeConversation.sellerId)
    setMsgInput('')
  }

  const getBookingActions = (booking) => {
    if (booking.status === 'completed' || booking.status === 'cancelled') return []
    if (booking.status === 'pending') return []
    if (booking.status === 'quote_sent') return []
    if (booking.status === 'quote_accepted') return [{ label: t('startWork'), status: 'in_progress', className: 'primary' }]
    if (booking.status === 'in_progress') return [{ label: t('finishedWork'), status: 'completed', className: 'primary' }]
    return []
  }

  const renderOverview = () => {
    if (loading) {
      return (
        <div className="cd-stats">
          {[1,2,3,4].map(i => (
            <div className="cd-skeleton-card" key={i}>
              <div className="cd-skeleton-line" style={{width:'50%',height:24}} />
              <div className="cd-skeleton-line" style={{width:'70%',height:14}} />
            </div>
          ))}
        </div>
      )
    }

    if (error) {
      return (
        <div className="cd-error-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{color:'var(--danger)'}}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>{error}</p>
          <button className="cd-primary-btn" onClick={loadDashboard}>{t('retry')}</button>
        </div>
      )
    }

    return (
      <div className="cd-overview">
        <div className="cd-stats">
          <div className="cd-stat-card">
            <div className="cd-stat-icon blue">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div className="cd-stat-info">
              <span className="cd-stat-value">{stats.totalBookings}</span>
              <span className="cd-stat-label">{t('totalBookings')}</span>
            </div>
          </div>
          <div className="cd-stat-card">
            <div className="cd-stat-icon amber">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div className="cd-stat-info">
              <span className="cd-stat-value">{stats.pendingBookings}</span>
              <span className="cd-stat-label">{t('pending')}</span>
              {stats.pendingBookings > 0 && <span className="cd-stat-badge">{stats.pendingBookings} {t('new')}</span>}
            </div>
          </div>
          <div className="cd-stat-card">
            <div className="cd-stat-icon green">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            </div>
            <div className="cd-stat-info">
              <span className="cd-stat-value">{convertPrice(stats.totalRevenue)}</span>
              <span className="cd-stat-label">{t('revenue')}</span>
            </div>
          </div>
          {REVIEWS_ENABLED && (
          <div className="cd-stat-card">
            <div className="cd-stat-icon purple">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <div className="cd-stat-info">
              <span className="cd-stat-value">{stats.averageRating > 0 ? stats.averageRating : '—'}</span>
              <span className="cd-stat-label">{t('rating')}</span>
            </div>
          </div>
        )}
        </div>

        <div className="cd-recent">
          <div className="cd-recent-header">
            <h3>{t('recentBookings')}</h3>
            <button className="cd-link-btn" onClick={() => setActiveSection('bookings')}>{t('viewAll')}</button>
          </div>
          {recentBookings.length === 0 ? (
            <div className="cd-empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ color: 'var(--text-muted)' }}>
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
              <p>{t('noBookingsYet')}</p>
            </div>
          ) : (
            <div className="cd-recent-list">
              {recentBookings.slice(0, 5).map(b => (
                <div className="cd-recent-item" key={b._id}>
                  <div className="cd-order-avatar">{b.userId?.name?.[0] || '?'}</div>
                  <div className="cd-recent-info">
                    <span className="cd-recent-name">{b.userId?.name || t('unknown')}</span>
                    <span className="cd-recent-meta">{b.service} &middot; {b.date ? new Date(b.date).toLocaleDateString('uz-UZ') : ''}</span>
                  </div>
                  <div className="cd-recent-right">
                    <span className={`cd-status-chip ${b.status}`}>{getStatusLabels(t)[b.status]}</span>
                    {b.quotedPrice > 0 && <span className="cd-recent-price">{convertPrice(b.quotedPrice)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderBookings = () => {
    if (bookingsLoading) {
      return (
        <div className="cd-bookings-loading">
          {[1,2,3].map(i => (
            <div className="cd-skeleton-card" key={i}>
              <div className="cd-skeleton-line" style={{width:'40%',height:16}} />
              <div className="cd-skeleton-line" style={{width:'70%',height:14}} />
              <div className="cd-skeleton-line" style={{width:'30%',height:14}} />
            </div>
          ))}
        </div>
      )
    }

    if (bookingsError) {
      return (
        <div className="cd-error-state">
          <p>{bookingsError}</p>
          <button className="cd-primary-btn" onClick={() => loadBookings(bookingFilter)}>{t('retry')}</button>
        </div>
      )
    }

    return (
      <div className="cd-bookings">
        <div className="cd-filters">
          {BOOKING_FILTERS.map(f => (
            <button
              key={f.value}
              className={`cd-filter-chip ${bookingFilter === f.value ? 'active' : ''}`}
              onClick={() => setBookingFilter(f.value)}
            >{t(f.labelKey)}</button>
          ))}
        </div>

        {bookings.length === 0 ? (
          <div className="cd-empty-state">
            <p>{bookingFilter ? t('noBookingsInStatus') : t('noBookingsYet')}</p>
          </div>
        ) : (
          <div className="cd-bookings-list">
            {bookings.map(booking => {
              const actions = getBookingActions(booking)
              return (
                <div className="cd-booking-card" key={booking._id}>
                  <div className="cd-booking-top">
                    <div className="cd-booking-buyer">
                      <div className="cd-order-avatar">{booking.userId?.name?.[0] || '?'}</div>
                      <div>
                        <strong>{booking.userId?.name || t('unknown')}</strong>
                        <span>{booking.userId?.phone || booking.phone || ''}</span>
                      </div>
                    </div>
                    <div className="cd-booking-meta">
                      <span className={`cd-status-chip ${booking.status}`}>{getStatusLabels(t)[booking.status]}</span>
                      <span className="cd-booking-date">{booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('uz-UZ') : ''}</span>
                    </div>
                  </div>

                  <div className="cd-booking-details">
                    <div className="cd-booking-detail">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
                      <span>{booking.service}</span>
                    </div>
                    {booking.date && (
                      <div className="cd-booking-detail">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        <span>{new Date(booking.date).toLocaleDateString('uz-UZ')}{booking.time ? `, ${booking.time}` : ''}</span>
                      </div>
                    )}
                    {booking.address && (
                      <div className="cd-booking-detail">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        <span>{booking.address}</span>
                      </div>
                    )}
                  </div>

                  {booking.description && <p className="cd-booking-desc">{booking.description}</p>}

                  {booking.status === 'pending' && (
                    <div className="cd-price-input-row">
                      <input
                        type="number"
                        placeholder={t('pricePlaceholder')}
                        value={priceInputs[booking._id] || ''}
                        onChange={e => setPriceInputs(prev => ({ ...prev, [booking._id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') handleSetPrice(booking._id) }}
                      />
                      <button
                        className="cd-primary-btn sm"
                        disabled={updatingBookingId === booking._id || !priceInputs[booking._id]}
                        onClick={() => handleSetPrice(booking._id)}
                      >
                        {updatingBookingId === booking._id ? '...' : t('sendQuote')}
                      </button>
                    </div>
                  )}

                  {booking.status === 'quote_sent' && booking.quotedPrice > 0 && (
                    <div className="cd-booking-price-sent">
                      <span>{t('quotedPrice')}: <strong>{convertPrice(booking.quotedPrice)}</strong></span>
                      <span className="cd-waiting-text">{t('waitingClientResponse')}</span>
                    </div>
                  )}

                  {booking.status === 'completed' && (
                    <div className="cd-booking-completed">
                      <span className="cd-completed-price">{t('completed')} — {convertPrice(booking.finalPrice || booking.quotedPrice)}</span>
                      {booking.rated && REVIEWS_ENABLED && (
                        <div className="cd-rating-display">
                          {[1,2,3,4,5].map(s => (
                            <svg key={s} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                              className={s <= booking.rating ? 'cd-star-filled' : 'cd-star-empty'} strokeWidth="1">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                          ))}
                          {booking.review && <span className="cd-review-text">{booking.review}</span>}
                        </div>
                      )}
                    </div>
                  )}

                  {actions.length > 0 && (
                    <div className="cd-booking-actions">
                      {actions.map(a => (
                        <button
                          key={a.status}
                          className={`cd-${a.className}-btn sm`}
                          disabled={updatingBookingId === booking._id}
                          onClick={() => handleBookingStatus(booking._id, a.status)}
                        >
                          {updatingBookingId === booking._id ? '...' : a.label}
                        </button>
                      ))}
                      <button
                        className="cd-cancel-btn sm"
                        disabled={updatingBookingId === booking._id}
                        onClick={() => { setCancelReason(''); setCancellingBooking(booking) }}
                      >
                        {t('cancel')}
                      </button>
                    </div>
                  )}

                  {booking.status === 'pending' && (
                    <div className="cd-booking-actions">
                      <button
                        className="cd-cancel-btn sm"
                        disabled={updatingBookingId === booking._id}
                        onClick={() => { setCancelReason(''); setCancellingBooking(booking) }}
                      >
                        {t('cancel')}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const renderMessages = () => (
    <div className="cd-messages">
      <div className="cd-msg_sidebar">
        <div className="cd-msg_sidebar_header">
          <h3>{t('messages')}</h3>
          <span className="cd-msg_count">{conversations.length}</span>
        </div>
        <div className="cd-msg_list">
          {conversations.length === 0 ? (
            <div className="cd-msg_empty">
              <p>{t('noConversationsYet')}</p>
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                className={`cd-msg_item ${activeConversation?.id === conv.id ? 'active' : ''}`}
                onClick={() => openConversation(conv)}
              >
                <div className="cd-msg_item_avatar" style={{ background: conv.sellerColor || '#3b82f6' }}>
                  {conv.sellerAvatar || 'U'}
                </div>
                <div className="cd-msg_item_info">
                  <span className="cd-msg_item_name">{conv.sellerName}</span>
                  <span className="cd-msg_item_last">{conv.lastMessage || '...'}</span>
                </div>
                {conv.unread > 0 && <span className="cd-msg_item_badge">{conv.unread}</span>}
              </button>
            ))
          )}
        </div>
      </div>
      <div className="cd-msg_chat">
        {activeConversation ? (
          <>
            <div className="cd-msg_chat_header">
              <button className="cd-msg_back" onClick={closeConversation}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div className="cd-msg_chat_user">
                <div className="cd-msg_item_avatar sm" style={{ background: activeConversation.sellerColor || '#3b82f6' }}>
                  {activeConversation.sellerAvatar || 'U'}
                </div>
                <span>{activeConversation.sellerName}</span>
              </div>
            </div>
            <div className="cd-msg_chat_messages" ref={chatRef}>
              {(activeConversation.messages || []).map(m => (
                <div className={`cd-msg_bubble ${m.from === 'user' ? 'mine' : ''}`} key={m.id}>
                  <p>{m.text}</p>
                  <span className="cd-msg_time">{m.time || ''}</span>
                </div>
              ))}
            </div>
            <div className="cd-msg_chat_input">
              <input
                type="text"
                placeholder={t('typeMessage')}
                value={msgInput}
                onChange={e => setMsgInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              />
              <button onClick={handleSend} disabled={!msgInput.trim()}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </>
        ) : (
          <div className="cd-msg_empty_chat">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ color: 'var(--text-muted)' }}>
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <p>{t('selectConversation')}</p>
          </div>
        )}
      </div>
    </div>
  )

  const renderCompletedWorks = () => {
    const SERVICE_LABELS = Object.fromEntries(SERVICE_TYPES.map(s => [s.id, `${s.icon} ${s.label}`]))

    return (
      <div className="cd-works">
        <div className="cd-works-header">
          <h3>{t('myCompletedWorks')}</h3>
          <span className="cd-works-count">{works.length} {t('items')}</span>
        </div>

        {showAddWork && selectedBooking && (
          <div className="cd-work-form-card">
            <div className="cd-work-form-booking-info">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <div>
                <strong>{t('selectedBooking')}</strong>
                <span>{selectedBooking.userId?.name || t('client')} — {SERVICE_LABELS[selectedBooking.service] || selectedBooking.service || t('general')}</span>
                {selectedBooking.address && <span className="cd-work-form-address">📍 {selectedBooking.address}</span>}
              </div>
            </div>
            <form onSubmit={handleAddWork}>
              <div className="cd-form-field">
                <label>{t('workTitle')} *</label>
                <input type="text" required value={workForm.title} onChange={e => setWorkForm({...workForm, title: e.target.value})} placeholder={t('workTitlePlaceholder')} />
              </div>
              <div className="cd-form-field">
                <label>{t('description')}</label>
                <textarea rows="3" value={workForm.description} onChange={e => setWorkForm({...workForm, description: e.target.value})} placeholder={t('workDescriptionPlaceholder')} />
              </div>
              <div className="cd-form-field">
                <label>{t('images')} (max. 6)</label>
                <div className="cd-work-images-grid">
                  {workImagePreviews.map((src, i) => (
                    <div className="cd-work-img-preview" key={i}>
                      <img src={src} alt="" />
                      <button type="button" className="cd-work-img-remove" onClick={() => removeWorkImage(i)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  ))}
                  {workImages.length < 6 && (
                    <label className="cd-work-img-add">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      <span>{t('addImage')}</span>
                      <input type="file" accept="image/*" multiple onChange={handleWorkImageSelect} hidden />
                    </label>
                  )}
                </div>
              </div>
              <div className="cd-work-form-actions">
                <button type="button" className="cd-cancel" onClick={() => { setShowAddWork(false); setSelectedBooking(null); clearWorkImages(); setWorkForm({ title: '', description: '', service: '' }) }}>{t('cancel')}</button>
                <button type="submit" className="cd-submit" disabled={workSaving || !workForm.title.trim()}>
                  {workSaving ? t('saving') : t('save')}
                </button>
              </div>
            </form>
          </div>
        )}

        {!showAddWork && availableBookings.length > 0 && (
          <div className="cd-works-available">
            <h4>{t('addableCompletedBookings')} ({availableBookings.length})</h4>
            <div className="cd-works-available-list">
              {availableBookings.map(b => (
                <div className="cd-works-available-card" key={b._id}>
                  <div className="cd-works-available-info">
                    <strong>{b.userId?.name || t('client')}</strong>
                    <span>{SERVICE_LABELS[b.service] || b.service || t('generalService')}</span>
                    {b.address && <span className="cd-works-available-addr">📍 {b.address}</span>}
                  </div>
                  <button className="cd-works-add-btn sm" onClick={() => selectBookingForWork(b)}>
                    + {t('addWork')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!showAddWork && availableBookings.length === 0 && works.length > 0 && (
          <div className="cd-works-all-used">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            {t('allCompletedBookingsDone')}
          </div>
        )}

        {worksLoading ? (
          <div className="cd-works-loading">{t('loading')}</div>
        ) : works.length === 0 && availableBookings.length === 0 ? (
          <div className="cd-works-empty">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
            <p>{t('noCompletedWorksYet')}</p>
            <span>{t('noCompletedWorksHint')}</span>
          </div>
        ) : (
          <div className="cd-works-grid">
            {works.map(work => {
              const booking = work.bookingId
              return (
                <div className="cd-work-card" key={work._id}>
                  <div className="cd-work-card-images">
                    {(work.images || []).length > 0 ? (
                      <img src={work.images[0]} alt={work.title} />
                    ) : (
                      <div className="cd-work-card-placeholder">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                        </svg>
                      </div>
                    )}
                    <button className="cd-work-card-delete" onClick={() => handleDeleteWork(work._id)}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                  <div className="cd-work-card-info">
                    <h4>{work.title}</h4>
                    {work.description && <p>{work.description}</p>}
                    {booking && <span className="cd-work-card-client">👤 {booking.userId?.name || t('client')}</span>}
                    {work.service && <span className="cd-work-card-service">{SERVICE_LABELS[work.service] || work.service}</span>}
                    {work.completedAt && <span className="cd-work-card-date">{new Date(work.completedAt).toLocaleDateString('uz')}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const renderSettings = () => (
    <div className="cd-settings">
      <div className="cd-settings-card">
        <h3>{t('craftsmanProfile')}</h3>
        <form onSubmit={handleSaveProfile}>
          <div className="cd-form-row">
            <div className="cd-form-field">
              <label>{t('name')}</label>
              <input type="text" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} placeholder={t('yourName')} />
            </div>
          </div>

          <div className="cd-form-field">
            <label>{t('serviceTypes')}</label>
            <div className="cd-services-grid">
              {SERVICE_TYPES.map(s => (
                <button
                  key={s.id}
                  type="button"
                  className={`cd-service-chip ${profileForm.services.includes(s.id) ? 'active' : ''}`}
                  onClick={() => toggleService(s.id)}
                >
                  <span>{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="cd-form-row">
            <div className="cd-form-field">
              <label>{t('experience')}</label>
              <input type="text" value={profileForm.experience} onChange={e => setProfileForm({ ...profileForm, experience: e.target.value })} placeholder={t('experiencePlaceholder')} />
            </div>
            <div className="cd-form-field">
              <label>{t('district')}</label>
              <select value={profileForm.district} onChange={e => setProfileForm({ ...profileForm, district: e.target.value })}>
                <option value="">{t('select')}</option>
                {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="cd-form-row">
            <div className="cd-form-field">
              <label>{t('priceRange')}</label>
              <input type="text" value={profileForm.priceRange} onChange={e => setProfileForm({ ...profileForm, priceRange: e.target.value })} placeholder={t('priceRangePlaceholder')} />
            </div>
            <div className="cd-form-field">
              <label>{t('workingHours')}</label>
              <input type="text" value={profileForm.workingHours} onChange={e => setProfileForm({ ...profileForm, workingHours: e.target.value })} placeholder="09:00 - 18:00" />
            </div>
          </div>

          <div className="cd-form-field">
            <label>{t('status')}</label>
            <button
              type="button"
              className={`cd-availability-toggle ${profileForm.available ? 'available' : 'busy'}`}
              onClick={() => setProfileForm(prev => ({ ...prev, available: !prev.available }))}
            >
              <span className="cd-toggle-dot" />
              {profileForm.available ? `🟢 ${t('available')}` : `🔴 ${t('busy')}`}
            </button>
          </div>

          <div className="cd-settings-divider" />

          <div className="cd-form-field">
            <label>{t('aboutYou')}</label>
            <textarea rows={4} value={profileForm.description} onChange={e => setProfileForm({ ...profileForm, description: e.target.value })} placeholder={t('aboutYouPlaceholder')} />
          </div>

          <div className="cd-form-field">
            <label>{t('address')}</label>
            <input type="text" value={profileForm.location} onChange={e => setProfileForm({ ...profileForm, location: e.target.value })} placeholder={t('addressPlaceholder')} />
          </div>

          <div className="cd-form-field">
            <label>{t('locationMap')}</label>
            <LocationPicker
              lat={profileForm.lat}
              lng={profileForm.lng}
              onChange={({ lat, lng }) => setProfileForm(prev => ({ ...prev, lat, lng }))}
            />
          </div>

          {profileSaveMsg && (
            <div className={`cd-submit-msg ${profileSaveMsg.type}`}>
              {profileSaveMsg.type === 'success' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              )}
              {profileSaveMsg.text}
            </div>
          )}

          <div className="cd-form-actions">
            <button type="submit" className="cd-primary-btn">{t('save')}</button>
          </div>
        </form>
      </div>

      <div className="cd-settings-card" style={{ marginTop: 20 }}>
        <h3>{t('socialAndWebsite')}</h3>
        <form onSubmit={handleSaveProfile}>
          <div className="cd-form-row">
            <div className="cd-form-field">
              <label>{t('telegram')}</label>
              <input type="text" value={profileForm.social.telegram} onChange={e => setSocial('telegram', e.target.value)} placeholder={t('telegramPlaceholder')} />
            </div>
            <div className="cd-form-field">
              <label>{t('instagram')}</label>
              <input type="text" value={profileForm.social.instagram} onChange={e => setSocial('instagram', e.target.value)} placeholder={t('instagramPlaceholder')} />
            </div>
          </div>
          <div className="cd-form-field">
            <label>{t('website')}</label>
            <input type="text" value={profileForm.social.website} onChange={e => setSocial('website', e.target.value)} placeholder={t('websitePlaceholder')} />
          </div>
          <div className="cd-settings-hint">{t('socialLinksHint')}</div>
          <div className="cd-form-actions">
            <button type="submit" className="cd-primary-btn">{t('save')}</button>
          </div>
        </form>
      </div>

      <div className="cd-settings-card" style={{ marginTop: 20 }}>
        <h3>{t('accountSecurity')}</h3>
        <div className="cd-security-row">
          <button type="button" className="cd-security-btn" onClick={() => setShowPasswordModal(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            {t('changePassword')}
          </button>
          <button
            type="button"
            className={`cd-security-btn ${twoFactor ? 'active' : ''}`}
            onClick={() => { if (!twoFactor) setShow2FAModal(true); else disableTwoFactor() }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            {twoFactor ? `${t('twoFactor')} (${t('off')})` : t('twoFactor')}
            {twoFactor && <span className="cd-active-badge">ON</span>}
          </button>
        </div>
      </div>

      <div className="cd-settings-card" style={{ marginTop: 20 }}>
        <h3>{t('appSettings')}</h3>
        <div className="cd-settings-grid">
          <div className="cd-settings-field">
            <label>{t('selectLanguage')}</label>
            <select className="cd-select" value={lang} onChange={e => setLang(e.target.value)}>
              <option value="uz">{t('uzbek')}</option>
              <option value="ru">{t('russian')}</option>
              <option value="en">{t('english')}</option>
            </select>
          </div>
          <div className="cd-settings-field">
            <label>{t('displayMode')}</label>
            <button type="button" className={`cd-security-btn ${dark ? 'active' : ''}`} onClick={toggleTheme} style={{ width: '100%' }}>
              {dark ? `🌙 ${t('darkMode')}` : `☀️ ${t('lightMode')}`}
            </button>
          </div>
        </div>
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <TelegramBotLink />
        </div>
      </div>

      {showPasswordModal && <PasswordModal onClose={() => setShowPasswordModal(false)} />}
      {show2FAModal && <TwoFactorModal onClose={() => setShow2FAModal(false)} onEnable={() => setTwoFactor(true)} />}
    </div>
  )

  const renderContent = () => {
    switch (activeSection) {
      case 'overview': return renderOverview()
      case 'bookings': return renderBookings()
      case 'works': return renderCompletedWorks()
      case 'messages': return renderMessages()
      case 'settings': return renderSettings()
      default: return renderOverview()
    }
  }

  return (
    <div className="cd">
      <Header />

      {/* Breadcrumb olib tashlandi — lekin joyi (hajmi) saqlanadi */}
      <div className="cd-breadcrumb" aria-hidden="true" />

      <div className="cd-layout">
        <div className={`cd-sidebar-overlay${sidebarOpen ? ' visible' : ''}`} onClick={() => setSidebarOpen(false)} />

        <aside className={`cd-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="cd-sidebar-header">
            <span style={{fontWeight:700,fontSize:16}}>{t('menu')}</span>
            <button className="cd-sidebar-close" onClick={() => setSidebarOpen(false)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="cd-sidebar-user">
            <div className="cd-avatar">{(user.name || 'U')[0].toUpperCase()}</div>
            <div className="cd-sidebar-user-info">
              <span className="cd-sidebar-user-name">{user.name || t('craftsman')}</span>
              <span className="cd-sidebar-user-role">🔧 {t('craftsman')}</span>
            </div>
          </div>
          <nav className="cd-nav">
            {SECTIONS.map(sec => (
              <button
                key={sec.id}
                data-section={sec.id}
                className={`cd-nav-item ${activeSection === sec.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveSection(sec.id)
                  setSidebarOpen(false)
                }}
              >
                <span className="cd-nav-icon">{sec.icon}</span>
                <span className="cd-nav-label">{t(sec.labelKey)}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="cd-main">
          <div className="cd-mobile-header">
            <button className="cd-menu-toggle" onClick={() => setSidebarOpen(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <h2 className="cd-mobile-title">{t(SECTIONS.find(s => s.id === activeSection)?.labelKey)}</h2>
          </div>
          {renderContent()}
        </main>
      </div>

      {cancellingBooking && (
        <div className="cd-cancel-overlay" onClick={() => { if (updatingBookingId !== cancellingBooking._id) setCancellingBooking(null) }}>
          <div className="cd-cancel-modal" onClick={e => e.stopPropagation()}>
            <div className="cd-cancel-modal-header">
              <h3>{t('cancelBooking')}</h3>
              <button onClick={() => setCancellingBooking(null)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <p className="cd-cancel-modal-text">
              <strong>{cancellingBooking.userId?.name || t('client')}</strong> {t('bookingWillBeCancelled')}
              {t('provideCancelReason')}
            </p>
            <textarea
              className="cd-cancel-modal-textarea"
              rows={3}
              placeholder={t('cancelReasonPlaceholder')}
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
            />
            <div className="cd-cancel-modal-actions">
              <button className="cd-cancel-btn" onClick={() => setCancellingBooking(null)}>{t('close')}</button>
              <button
                className="cd-primary-btn"
                disabled={updatingBookingId === cancellingBooking._id}
                onClick={handleCancelBooking}
              >
                {updatingBookingId === cancellingBooking._id ? '...' : t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CraftsmanDashboard
