import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useMessages } from '../context/MessagesContext.jsx'
import { getSocket } from '../services/socket'
import { api } from '../services/api'
import Header from './header'
import LocationPicker from './LocationPicker'
import '../components_css/craftsman-dashboard.css'

const SERVICE_TYPES = [
  { id: 'plumber', label: 'Santexnika', icon: '🔧' },
  { id: 'electrician', label: 'Elektrik', icon: '⚡' },
  { id: 'painter', label: "Bo'yoqchi", icon: '🎨' },
  { id: 'tiler', label: 'Kafelchik', icon: '🧱' },
  { id: 'carpenter', label: 'Stolar', icon: '🪚' },
  { id: 'welder', label: 'Payvandchi', icon: '🔥' },
  { id: 'installer', label: "O'rnatuvchi", icon: '🔨' },
  { id: 'cleaner', label: 'Tozalash', icon: '🧹' },
]

const DISTRICTS = [
  'Toshkent, Chilonzor', 'Toshkent, Olmazor', "Toshkent, Mirzo Ulug'bek",
  'Toshkent, Shayxontohur', 'Toshkent, Sergeli', 'Toshkent, Yashnabod',
  'Toshkent, Uchtepa', 'Samarqand', 'Buxoro', 'Namangan',
]

const SECTIONS = [
  { id: 'overview', label: "Umumiy ko'rish", icon: '📊' },
  { id: 'bookings', label: 'Buyurtmalar', icon: '📋' },
  { id: 'works', label: 'Tugatgan ishlar', icon: '🖼' },
  { id: 'settings', label: 'Sozlamalar', icon: '⚙️' },
]

const BOOKING_FILTERS = [
  { value: '', label: 'Barchasi' },
  { value: 'pending', label: '⏳ Kutilayotgan' },
  { value: 'quote_sent', label: '💬 Narx yuborildi' },
  { value: 'quote_accepted', label: '✅ Qabul qilindi' },
  { value: 'in_progress', label: '🔄 Jarayonda' },
  { value: 'completed', label: '✅ Yakunlangan' },
  { value: 'cancelled', label: '❌ Bekor' },
]

const STATUS_LABELS = {
  pending: 'Kutilmoqda', quote_sent: 'Narx yuborildi', quote_accepted: 'Qabul qilindi',
  in_progress: 'Jarayonda', completed: 'Yakunlangan', cancelled: 'Bekor qilindi',
}

function CraftsmanDashboard() {
  const { user, updateProfile } = useAuth()
  const { t, convertPrice } = useSettings()
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

  const [profileForm, setProfileForm] = useState({
    name: '', services: [], experience: '', district: '', priceRange: '',
    workingHours: '09:00 - 18:00', available: true, location: '', lat: null, lng: null,
    description: '',
  })
  const [profileSaveMsg, setProfileSaveMsg] = useState(null)

  const [works, setWorks] = useState([])
  const [availableBookings, setAvailableBookings] = useState([])
  const [worksLoading, setWorksLoading] = useState(false)
  const [showAddWork, setShowAddWork] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [workForm, setWorkForm] = useState({ title: '', description: '', service: '' })
  const [workImages, setWorkImages] = useState([])
  const [workImagePreviews, setWorkImagePreviews] = useState([])
  const [workSaving, setWorkSaving] = useState(false)

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
    URL.revokeObjectURL(workImagePreviews[idx])
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
      setWorkImages([])
      setWorkImagePreviews([])
      setShowAddWork(false)
    } catch (err) {
      alert(err.message || 'Xatolik')
    } finally {
      setWorkSaving(false)
    }
  }

  const handleDeleteWork = async (workId) => {
    if (!confirm("Ishni o'chirmoqchimisiz?")) return
    try {
      await api.sellers.completedWorks.delete(workId)
      setWorks(prev => prev.filter(w => w._id !== workId))
    } catch (err) {
      alert(err.message || 'Xatolik')
    }
  }

  useEffect(() => {
    return () => { workImagePreviews.forEach(u => URL.revokeObjectURL(u)) }
  }, [])

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.sellers.craftsmanDashboard()
      setStats(data.stats)
      setRecentBookings(data.recentBookings || [])
    } catch (err) {
      setError(err.message || "Ma'lumotlarni yuklashda xatolik")
    } finally {
      setLoading(false)
    }
  }, [])

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
      })
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
      setBookingsError(err.message || "Buyurtmalarni yuklashda xatolik")
    } finally {
      setBookingsLoading(false)
    }
  }, [])

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

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setProfileSaveMsg(null)
    try {
      await updateProfile(profileForm)
      setProfileSaveMsg({ type: 'success', text: 'Saqlandi!' })
    } catch (err) {
      setProfileSaveMsg({ type: 'error', text: err.message || 'Xatolik' })
    }
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

  const BOOKING_STATUS_FLOW = ['pending', 'quote_sent', 'quote_accepted', 'in_progress', 'completed']

  const getBookingActions = (booking) => {
    if (booking.status === 'completed' || booking.status === 'cancelled') return []
    if (booking.status === 'pending') return []
    if (booking.status === 'quote_sent') return []
    if (booking.status === 'quote_accepted') return [{ label: 'Ishni boshladim', status: 'in_progress', className: 'primary' }]
    if (booking.status === 'in_progress') return [{ label: 'Yakunladim', status: 'completed', className: 'primary' }]
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
          <button className="cd-primary-btn" onClick={loadDashboard}>Qayta urinish</button>
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
              <span className="cd-stat-label">Jami buyurtmalar</span>
            </div>
          </div>
          <div className="cd-stat-card">
            <div className="cd-stat-icon amber">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div className="cd-stat-info">
              <span className="cd-stat-value">{stats.pendingBookings}</span>
              <span className="cd-stat-label">Kutilayotgan</span>
              {stats.pendingBookings > 0 && <span className="cd-stat-badge">{stats.pendingBookings} yangi</span>}
            </div>
          </div>
          <div className="cd-stat-card">
            <div className="cd-stat-icon green">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            </div>
            <div className="cd-stat-info">
              <span className="cd-stat-value">{convertPrice(stats.totalRevenue)}</span>
              <span className="cd-stat-label">Daromad</span>
            </div>
          </div>
          <div className="cd-stat-card">
            <div className="cd-stat-icon purple">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <div className="cd-stat-info">
              <span className="cd-stat-value">{stats.averageRating > 0 ? stats.averageRating : '—'}</span>
              <span className="cd-stat-label">Reyting</span>
            </div>
          </div>
        </div>

        <div className="cd-recent">
          <div className="cd-recent-header">
            <h3>So'nggi buyurtmalar</h3>
            <button className="cd-link-btn" onClick={() => setActiveSection('bookings')}>Hammasini korish</button>
          </div>
          {recentBookings.length === 0 ? (
            <div className="cd-empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ color: 'var(--text-muted)' }}>
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
              <p>Hali buyurtma yo'q</p>
            </div>
          ) : (
            <div className="cd-recent-list">
              {recentBookings.slice(0, 5).map(b => (
                <div className="cd-recent-item" key={b._id}>
                  <div className="cd-order-avatar">{b.userId?.name?.[0] || '?'}</div>
                  <div className="cd-recent-info">
                    <span className="cd-recent-name">{b.userId?.name || "Noma'lum"}</span>
                    <span className="cd-recent-meta">{b.service} &middot; {b.date ? new Date(b.date).toLocaleDateString('uz-UZ') : ''}</span>
                  </div>
                  <div className="cd-recent-right">
                    <span className={`cd-status-chip ${b.status}`}>{STATUS_LABELS[b.status]}</span>
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
          <button className="cd-primary-btn" onClick={() => loadBookings(bookingFilter)}>Qayta urinish</button>
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
            >{f.label}</button>
          ))}
        </div>

        {bookings.length === 0 ? (
          <div className="cd-empty-state">
            <p>{bookingFilter ? 'Bu holatda buyurtma yo\'q' : "Hali buyurtma yo'q"}</p>
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
                        <strong>{booking.userId?.name || "Noma'lum"}</strong>
                        <span>{booking.userId?.phone || booking.phone || ''}</span>
                      </div>
                    </div>
                    <div className="cd-booking-meta">
                      <span className={`cd-status-chip ${booking.status}`}>{STATUS_LABELS[booking.status]}</span>
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
                        placeholder="Narx (so'm)"
                        value={priceInputs[booking._id] || ''}
                        onChange={e => setPriceInputs(prev => ({ ...prev, [booking._id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') handleSetPrice(booking._id) }}
                      />
                      <button
                        className="cd-primary-btn sm"
                        disabled={updatingBookingId === booking._id || !priceInputs[booking._id]}
                        onClick={() => handleSetPrice(booking._id)}
                      >
                        {updatingBookingId === booking._id ? '...' : 'Taklif yuborish'}
                      </button>
                    </div>
                  )}

                  {booking.status === 'quote_sent' && booking.quotedPrice > 0 && (
                    <div className="cd-booking-price-sent">
                      <span>Taklif narx: <strong>{convertPrice(booking.quotedPrice)}</strong></span>
                      <span className="cd-waiting-text">Mijoz javobini kutmoqda...</span>
                    </div>
                  )}

                  {booking.status === 'completed' && (
                    <div className="cd-booking-completed">
                      <span className="cd-completed-price">Yakunlangan — {convertPrice(booking.finalPrice || booking.quotedPrice)}</span>
                      {booking.rated && (
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
                        onClick={() => handleBookingStatus(booking._id, 'cancelled')}
                      >
                        Bekor qilish
                      </button>
                    </div>
                  )}

                  {booking.status === 'pending' && (
                    <div className="cd-booking-actions">
                      <button
                        className="cd-cancel-btn sm"
                        disabled={updatingBookingId === booking._id}
                        onClick={() => handleBookingStatus(booking._id, 'cancelled')}
                      >
                        Bekor qilish
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
          <h3>Xabarlar</h3>
          <span className="cd-msg_count">{conversations.length}</span>
        </div>
        <div className="cd-msg_list">
          {conversations.length === 0 ? (
            <div className="cd-msg_empty">
              <p>Hali suhbat yo'q</p>
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
                placeholder="Xabar yozing..."
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
            <p>Suhbatni tanlang</p>
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
          <h3>Tugatgan ishlarim</h3>
          <span className="cd-works-count">{works.length} ta ish</span>
        </div>

        {showAddWork && selectedBooking && (
          <div className="cd-work-form-card">
            <div className="cd-work-form-booking-info">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <div>
                <strong>Tanlangan buyurtma:</strong>
                <span>{selectedBooking.userId?.name || 'Mijoz'} — {SERVICE_LABELS[selectedBooking.service] || selectedBooking.service || 'Umumiy'}</span>
                {selectedBooking.address && <span className="cd-work-form-address">📍 {selectedBooking.address}</span>}
              </div>
            </div>
            <form onSubmit={handleAddWork}>
              <div className="cd-form-field">
                <label>Ish nomi *</label>
                <input type="text" required value={workForm.title} onChange={e => setWorkForm({...workForm, title: e.target.value})} placeholder="Masalan: Santexnika ta'mirlash" />
              </div>
              <div className="cd-form-field">
                <label>Izoh</label>
                <textarea rows="3" value={workForm.description} onChange={e => setWorkForm({...workForm, description: e.target.value})} placeholder="Qilgan ishingiz haqida qisqacha..." />
              </div>
              <div className="cd-form-field">
                <label>Rasmlar (max. 6 ta)</label>
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
                      <span>Rasm qo'shish</span>
                      <input type="file" accept="image/*" multiple onChange={handleWorkImageSelect} hidden />
                    </label>
                  )}
                </div>
              </div>
              <div className="cd-work-form-actions">
                <button type="button" className="cd-cancel" onClick={() => { setShowAddWork(false); setSelectedBooking(null); setWorkImages([]); setWorkImagePreviews([]); setWorkForm({ title: '', description: '', service: '' }) }}>Bekor</button>
                <button type="submit" className="cd-submit" disabled={workSaving || !workForm.title.trim()}>
                  {workSaving ? 'Saqlanmoqda...' : "Saqlash"}
                </button>
              </div>
            </form>
          </div>
        )}

        {!showAddWork && availableBookings.length > 0 && (
          <div className="cd-works-available">
            <h4>Qo'shish mumkin bo'lgan tugatilgan buyurtmalar ({availableBookings.length})</h4>
            <div className="cd-works-available-list">
              {availableBookings.map(b => (
                <div className="cd-works-available-card" key={b._id}>
                  <div className="cd-works-available-info">
                    <strong>{b.userId?.name || 'Mijoz'}</strong>
                    <span>{SERVICE_LABELS[b.service] || b.service || 'Umumiy xizmat'}</span>
                    {b.address && <span className="cd-works-available-addr">📍 {b.address}</span>}
                  </div>
                  <button className="cd-works-add-btn sm" onClick={() => selectBookingForWork(b)}>
                    + Ish qo'shish
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!showAddWork && availableBookings.length === 0 && works.length > 0 && (
          <div className="cd-works-all-used">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Barcha tugatilgan buyurtmalar uchun ish qo'shildi
          </div>
        )}

        {worksLoading ? (
          <div className="cd-works-loading">Yuklanmoqda...</div>
        ) : works.length === 0 && availableBookings.length === 0 ? (
          <div className="cd-works-empty">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
            <p>Hali tugatgan ishlar yo'q</p>
            <span>Mijozlar bilan ish tugagach, bu yerda rasmlar bilan ko'rsatishingiz mumkin</span>
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
                    {booking && <span className="cd-work-card-client">👤 {booking.userId?.name || 'Mijoz'}</span>}
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
        <h3>Usta profili</h3>
        <form onSubmit={handleSaveProfile}>
          <div className="cd-form-row">
            <div className="cd-form-field">
              <label>Ism</label>
              <input type="text" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} placeholder="Ismingiz" />
            </div>
          </div>

          <div className="cd-form-field">
            <label>Xizmat turlari</label>
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
              <label>Tajriba</label>
              <input type="text" value={profileForm.experience} onChange={e => setProfileForm({ ...profileForm, experience: e.target.value })} placeholder="Masalan: 10 yil" />
            </div>
            <div className="cd-form-field">
              <label>Tuman</label>
              <select value={profileForm.district} onChange={e => setProfileForm({ ...profileForm, district: e.target.value })}>
                <option value="">Tanlang</option>
                {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="cd-form-row">
            <div className="cd-form-field">
              <label>Narx oralig'i</label>
              <input type="text" value={profileForm.priceRange} onChange={e => setProfileForm({ ...profileForm, priceRange: e.target.value })} placeholder="50 000 - 500 000 so'm" />
            </div>
            <div className="cd-form-field">
              <label>Ish vaqti</label>
              <input type="text" value={profileForm.workingHours} onChange={e => setProfileForm({ ...profileForm, workingHours: e.target.value })} placeholder="09:00 - 18:00" />
            </div>
          </div>

          <div className="cd-form-field">
            <label>Holat</label>
            <button
              type="button"
              className={`cd-availability-toggle ${profileForm.available ? 'available' : 'busy'}`}
              onClick={() => setProfileForm(prev => ({ ...prev, available: !prev.available }))}
            >
              <span className="cd-toggle-dot" />
              {profileForm.available ? '🟢 Mavjud' : '🔴 Band'}
            </button>
          </div>

          <div className="cd-settings-divider" />

          <div className="cd-form-field">
            <label>O'zingiz haqida</label>
            <textarea rows={4} value={profileForm.description} onChange={e => setProfileForm({ ...profileForm, description: e.target.value })} placeholder="O'zingiz haqida qisqacha ma'lumot..." />
          </div>

          <div className="cd-form-field">
            <label>Manzil</label>
            <input type="text" value={profileForm.location} onChange={e => setProfileForm({ ...profileForm, location: e.target.value })} placeholder="Manzilingizni kiriting" />
          </div>

          <div className="cd-form-field">
            <label>Joylashuv (xarita)</label>
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
            <button type="submit" className="cd-primary-btn">Saqlash</button>
          </div>
        </form>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeSection) {
      case 'overview': return renderOverview()
      case 'bookings': return renderBookings()
      case 'works': return renderCompletedWorks()
      case 'settings': return renderSettings()
      default: return renderOverview()
    }
  }

  return (
    <div className="cd">
      <Header />

      <div className="cd-breadcrumb">
        <span onClick={() => navigate('/')}>{t('home')}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        <span className="active">Usta paneli</span>
      </div>

      <div className="cd-layout">
        <div className={`cd-sidebar-overlay${sidebarOpen ? ' visible' : ''}`} onClick={() => setSidebarOpen(false)} />

        <aside className={`cd-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="cd-sidebar-header">
            <span style={{fontWeight:700,fontSize:16}}>Menyu</span>
            <button className="cd-sidebar-close" onClick={() => setSidebarOpen(false)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="cd-sidebar-user">
            <div className="cd-avatar">{(user.name || 'U')[0].toUpperCase()}</div>
            <div className="cd-sidebar-user-info">
              <span className="cd-sidebar-user-name">{user.name || 'Usta'}</span>
              <span className="cd-sidebar-user-role">🔧 Usta</span>
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
                <span className="cd-nav-label">{sec.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="cd-main">
          <div className="cd-mobile-header">
            <button className="cd-menu-toggle" onClick={() => setSidebarOpen(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <h2 className="cd-mobile-title">{SECTIONS.find(s => s.id === activeSection)?.label}</h2>
          </div>
          {renderContent()}
        </main>
      </div>
    </div>
  )
}

export default CraftsmanDashboard
