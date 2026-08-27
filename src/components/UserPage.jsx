import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useMessages } from '../context/MessagesContext.jsx'
import { useFavorites } from '../context/FavoritesContext.jsx'
import { getSocket } from '../services/socket'
import { api } from '../services/api'
import Header from './header'
import Footer from './Footer'
import CustomSelect from './CustomSelect'
import LoginPrompt from './LoginPrompt'
import { PasswordModal, TwoFactorModal, DeleteAccountModal } from './SettingsModals'
import LocationPicker from './LocationPicker'
import '../components_css/userpage.css'

const ADDRESSES = [
  { id: 1, titleKey: 'homeAddr', address: "Toshkent shahri, Mirzo Ulug'bek tumani, 5-kvartal, 12-uy", phone: '+998 90 123 45 67', isDefault: true },
  { id: 2, titleKey: 'workAddr', address: "Toshkent shahri, Amir Temur ko'chasi, 78-uy, 3-qavat", phone: '+998 91 987 65 43', isDefault: false },
]

const STATUS_MAP = {
  pending: { bg: 'var(--warning-bg)', color: 'var(--warning)', label: 'Kutilmoqda', ru: 'Ожидает', en: 'Pending' },
  confirmed: { bg: 'var(--info-bg, #dbeafe)', color: 'var(--info, #3b82f6)', label: 'Tasdiqlangan', ru: 'Подтверждён', en: 'Confirmed' },
  shipping: { bg: 'var(--warning-bg)', color: 'var(--warning)', label: 'Yetkazilmoqda', ru: 'V puti', en: 'In Transit' },
  delivered: { bg: 'var(--accent-bg)', color: 'var(--accent)', label: 'Yetkazildi', ru: 'Доставлен', en: 'Delivered' },
  cancelled: { bg: 'var(--danger-bg)', color: 'var(--danger)', label: 'Bekor qilindi', ru: 'Отменён', en: 'Cancelled' },
}

const LANG_OPTIONS = [
  { value: 'uz', label: "O'zbek tili", icon: '\u{1f1fa}\u{1f1ff}' },
  { value: 'ru', label: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439', icon: '\u{1f1f7}\u{1f1fa}' },
  { value: 'en', label: 'English', icon: '\u{1f1ec}\u{1f1e7}' },
]

const CURRENCY_OPTIONS = [
  { value: 'uzs', label: "So'm (UZS)", icon: '\u{1f4b5}' },
  { value: 'usd', label: 'Dollar (USD)', icon: '\u{1f4b2}' },
  { value: 'eur', label: 'Euro (EUR)', icon: '\u{1f4b6}' },
]

const STATUS_LABELS = {
  uz: { pending: 'Kutilmoqda', confirmed: 'Tasdiqlangan', shipping: 'Yetkazilmoqda', delivered: 'Yetkazildi', cancelled: 'Bekor qilindi' },
  ru: { pending: 'Ожидает', confirmed: 'Подтверждён', shipping: 'В пути', delivered: 'Доставлен', cancelled: 'Отменён' },
  en: { pending: 'Pending', confirmed: 'Confirmed', shipping: 'In Transit', delivered: 'Delivered', cancelled: 'Cancelled' },
}

const ADDRESSES_TITLE = { uz: 'Manzillarim', ru: 'Мои адреса', en: 'My Addresses' }

function UserPage() {
  const { user, openLogin, logout, updateProfile } = useAuth()
  const { goMessages, totalItems, addItem } = useCart()
  const { dark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { totalUnread } = useMessages()
  const { favorites, toggleFavorite } = useFavorites()
  const {
    lang, currency,
    notifEmail, notifSms, notifPromo,
    twoFactor,
    setLang, setCurrency,
    setNotifEmail, setNotifSms, setNotifPromo,
    setTwoFactor, t, convertPrice,
  } = useSettings()

  const isSeller = user?.role === 'seller' || user?.role === 'craftsman'

  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  const [myBookings, setMyBookings] = useState([])
  const [myBookingsLoading, setMyBookingsLoading] = useState(false)
  const [myBookingsFilter, setMyBookingsFilter] = useState('')
  const [bookingAction, setBookingAction] = useState(null)

  const loadOrders = useCallback(async () => {
    if (!user) return
    setOrdersLoading(true)
    try {
      const data = await api.orders.list()
      setOrders(data.orders || [])
    } catch (err) {
      console.error('Load orders error:', err)
    } finally {
      setOrdersLoading(false)
    }
  }, [user])

  const [section, setSection] = useState(() => {
    const init = searchParams.get('section') || 'profile'
    return !user && init !== 'settings' ? 'settings' : init
  })

  useEffect(() => {
    const s = searchParams.get('section')
    if (s) setSection(s)
  }, [searchParams])

  useEffect(() => { loadOrders() }, [loadOrders])

  const loadMyBookings = useCallback(async (statusFilter = '') => {
    if (!user) return
    setMyBookingsLoading(true)
    try {
      const params = {}
      if (statusFilter) params.status = statusFilter
      const data = await api.bookings.my(params)
      setMyBookings(data.bookings || [])
    } catch (err) {
      console.error('Load bookings error:', err)
    } finally {
      setMyBookingsLoading(false)
    }
  }, [user])

  useEffect(() => { if (section === 'service-bookings') loadMyBookings(myBookingsFilter) }, [section, myBookingsFilter, loadMyBookings])

  useEffect(() => {
    if (!user || section !== 'service-bookings') return
    const interval = setInterval(() => loadMyBookings(myBookingsFilter), 15000)
    return () => clearInterval(interval)
  }, [user, section, myBookingsFilter, loadMyBookings])

  useEffect(() => {
    if (!user) return
    const socket = getSocket()
    const handler = (data) => {
      if (section === 'service-bookings') loadMyBookings(myBookingsFilter)
    }
    socket.on('booking_updated', handler)
    return () => socket.off('booking_updated', handler)
  }, [user, section, myBookingsFilter, loadMyBookings])

  const handleBookingAction = async (bookingId, action) => {
    setBookingAction(bookingId)
    try {
      await api.bookings.updateStatus(bookingId, action)
      setMyBookings(prev => prev.map(b => {
        if (b._id !== bookingId) return b
        const updated = { ...b, status: action }
        if (action === 'completed') updated.finalPrice = b.quotedPrice
        return updated
      }))
    } catch (err) {
      console.error('Booking action error:', err)
    } finally {
      setBookingAction(null)
    }
  }

  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '+998 90 123 45 67', birth: '1995-06-15', gender: 'erkak', location: user?.location || '', lat: user?.lat || null, lng: user?.lng || null })

  const [showPassword, setShowPassword] = useState(false)
  const [show2FA, setShow2FA] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  const handleSaveProfile = () => {
    updateProfile({ name: form.name, email: form.email, phone: form.phone, location: form.location, lat: form.lat, lng: form.lng })
    setEditMode(false)
  }

  const handleDeleteAccount = () => {
    logout()
    navigate('/')
  }

  const getStatusLabel = (status) => STATUS_LABELS[lang]?.[status] || STATUS_LABELS.uz[status]

  const sunIcon = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
  const moonIcon = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>

  const settingsIcon = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>

  const guestMenu = [
    { id: 'settings', label: t('settings'), icon: settingsIcon },
  ]

  const profileIcon = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  const ordersIcon = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
  const heartIcon = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
  const mapIcon = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
  const msgIcon = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
  const bookingIcon = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>

  const BOOKING_STATUS_MAP = {
    pending: { bg: '#fef3c7', color: '#92400e', label: 'Kutilmoqda' },
    quote_sent: { bg: '#dbeafe', color: '#1e40af', label: 'Narx yuborildi' },
    quote_accepted: { bg: '#d1fae5', color: '#065f46', label: 'Qabul qilindi' },
    in_progress: { bg: '#e0e7ff', color: '#3730a3', label: 'Jarayonda' },
    completed: { bg: '#d1fae5', color: '#065f46', label: 'Yakunlangan' },
    cancelled: { bg: '#fee2e2', color: '#991b1b', label: 'Bekor qilindi' },
  }

  const authMenu = [
    { id: 'profile', label: t('personalInfo'), icon: profileIcon },
    { id: 'orders', label: t('myOrders'), icon: ordersIcon, badge: orders.length > 0 ? orders.length : null },
    { id: 'service-bookings', label: 'Xizmat buyurtmalari', icon: bookingIcon, badge: myBookings.filter(b => b.status === 'pending').length > 0 ? myBookings.filter(b => b.status === 'pending').length : null },
    { id: 'favorites', label: t('myFavorites'), icon: heartIcon, badge: favorites.length > 0 ? favorites.length : null },
    { id: 'messages', label: t('messages'), icon: msgIcon, badge: totalUnread > 0 ? totalUnread : null, action: () => goMessages() },
    { id: 'addresses', label: ADDRESSES_TITLE[lang] || ADDRESSES_TITLE.uz, icon: mapIcon },
    { id: 'settings', label: t('settings'), icon: settingsIcon },
  ]

  const menuItems = user ? authMenu : guestMenu

  return (
    <div className="up">
      <Header />
      <div className="container">
        <div className="up_breadcrumb">
          <span onClick={() => navigate('/')}>{t('home')}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          <span className="active">{t('profile')}</span>
        </div>

        <div className="up_layout">
          <aside className="up_sidebar">
            <div className="up_profile_card">
              <div className="up_avatar">{user?.avatar || '?'}</div>
              {user ? (
                <>
                  <h3>{user.name}</h3>
                  <p>{user.email}</p>
                  <div className="up_stats">
                    <div className="up_stat"><strong>{orders.length}</strong><span>{t('orders')}</span></div>
                    <div className="up_stat"><strong>{favorites.length}</strong><span>{t('favorites')}</span></div>
                    <div className="up_stat"><strong>{totalItems}</strong><span>{t('cartCount')}</span></div>
                  </div>
                </>
              ) : (
                <>
                  <h3>{t('guest')}</h3>
                  <p>{t('guestDesc')}</p>
                  <button className="up_guest_login" onClick={openLogin}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                    {t('loginPrompt')}
                  </button>
                </>
              )}
            </div>
            <nav className="up_menu">
              {menuItems.map(item => (
                <button key={item.id} className={`up_menu_item ${section === item.id ? 'active' : ''}`} onClick={() => item.action ? item.action() : setSection(item.id)}>
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge != null && item.badge > 0 && <span className="up_menu_badge">{item.badge}</span>}
                </button>
              ))}
            </nav>
          </aside>

          <main className="up_content">
            {isSeller && (
              <div className="up_seller_panel_card">
                <div className="up_seller_panel_icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                  </svg>
                </div>
                <div className="up_seller_panel_info">
                  <h3>{user?.role === 'craftsman' ? t('craftsmanPanel') : t('sellerPanel')}</h3>
                  <p>{user?.role === 'craftsman' ? t('craftsmanPanelDesc') : t('sellerPanelDesc')}</p>
                </div>
                <button className="up_seller_panel_btn" onClick={() => navigate(user?.role === 'craftsman' ? '/craftsman-dashboard' : '/seller-dashboard')}>
                  {user?.role === 'craftsman' ? t('openCraftsmanPanel') : t('openSellerDashboard')}
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            )}

            {section === 'profile' && (
              <div className="up_section">
                <div className="up_section_header">
                  <h2>{t('personalInfo')}</h2>
                  <button className="up_edit_btn" onClick={() => editMode ? handleSaveProfile() : setEditMode(true)}>
                    {editMode
                      ? <><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg> {t('saveBtn')}</>
                      : <><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> {t('edit')}</>
                    }
                  </button>
                </div>
                <div className="up_form">
                  <div className="up_form_row">
                    <div className="up_field"><label>{t('fullName')}</label><input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} disabled={!editMode} /></div>
                    <div className="up_field"><label>{t('email')}</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} disabled={!editMode} /></div>
                  </div>
                  <div className="up_form_row">
                    <div className="up_field"><label>{t('phone')}</label><input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} disabled={!editMode} /></div>
                    <div className="up_field"><label>{t('birthday')}</label><input type="date" value={form.birth} onChange={e => setForm({...form, birth: e.target.value})} disabled={!editMode} /></div>
                  </div>
                  <div className="up_field">
                    <label>{t('gender')}</label>
                    <div className="up_radio_group">
                      <label className={`up_radio ${form.gender === 'erkak' ? 'active' : ''}`}><input type="radio" name="gender" value="erkak" checked={form.gender === 'erkak'} onChange={e => setForm({...form, gender: e.target.value})} disabled={!editMode} />{t('male')}</label>
                      <label className={`up_radio ${form.gender === 'ayol' ? 'active' : ''}`}><input type="radio" name="gender" value="ayol" checked={form.gender === 'ayol'} onChange={e => setForm({...form, gender: e.target.value})} disabled={!editMode} />{t('female')}</label>
                    </div>
                  </div>
                  <div className="up_field">
                    <label>{t('location')}</label>
                    <input type="text" value={form.location} onChange={e => setForm({...form, location: e.target.value, lat: null, lng: null})} placeholder={t('locationPlaceholder') || 'Manzilingizni kiriting'} disabled={!editMode} />
                  </div>
                  {editMode && (
                    <div className="up_field">
                      <label>{t('coordinates') || 'Joylashuv (xarita)'}</label>
                      <LocationPicker
                        lat={form.lat}
                        lng={form.lng}
                        onChange={({ lat, lng }) => setForm(prev => ({ ...prev, lat, lng }))}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {section === 'orders' && (
              <div className="up_section">
                <div className="up_section_header"><h2>{t('myOrders')}</h2><span className="up_count">{orders.length} {t('items')}</span></div>
                {ordersLoading ? (
                  <div className="up_orders">
                    {[1,2,3].map(i => (
                      <div className="up_order up_order_skeleton" key={i}>
                        <div className="up_skeleton_block" style={{width:64,height:64,borderRadius:8}} />
                        <div style={{flex:1}}>
                          <div className="up_skeleton_block" style={{width:'40%',height:16,marginBottom:8}} />
                          <div className="up_skeleton_block" style={{width:'60%',height:14,marginBottom:6}} />
                          <div className="up_skeleton_block" style={{width:'30%',height:14}} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : orders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <p>{t('noOrders')}</p>
                  </div>
                ) : (
                  <div className="up_orders">
                    {orders.map(order => {
                      const statusInfo = STATUS_MAP[order.status] || STATUS_MAP.pending
                      return (
                        <div className="up_order" key={order._id}>
                          <div className="up_order_left">
                            {order.items?.[0]?.image ? (
                              <img src={order.items[0].image} alt="" className="up_order_img" />
                            ) : (
                              <div className="up_order_img up_order_img_placeholder">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{color:'var(--text-muted)'}}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                              </div>
                            )}
                            <div className="up_order_info">
                              <div className="up_order_top">
                                <strong>#{order._id?.slice(-6).toUpperCase()}</strong>
                                <span className="up_order_status" style={{ background: statusInfo.bg, color: statusInfo.color }}>{getStatusLabel(order.status)}</span>
                              </div>
                              <span className="up_order_date">{new Date(order.createdAt).toLocaleDateString('uz-UZ')} · {order.items?.length || 0} {t('items')}</span>
                              <span className="up_order_total">{convertPrice(order.total)}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {section === 'service-bookings' && (
              <div className="up_section">
                <div className="up_section_header"><h2>Xizmat buyurtmalari</h2></div>
                <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:16}}>
                  {[
                    { value: '', label: 'Barchasi' },
                    { value: 'pending', label: '⏳ Kutilayotgan' },
                    { value: 'quote_sent', label: '💬 Narx kutilmoqda' },
                    { value: 'in_progress', label: '🔄 Jarayonda' },
                    { value: 'completed', label: '✅ Yakunlangan' },
                    { value: 'cancelled', label: '❌ Bekor' },
                  ].map(f => (
                    <button
                      key={f.value}
                      onClick={() => setMyBookingsFilter(f.value)}
                      style={{
                        padding:'6px 14px',borderRadius:20,border:'1.5px solid var(--border, #e5e7eb)',
                        background: myBookingsFilter === f.value ? 'var(--accent, #2bc32b)' : 'var(--bg-card, #fff)',
                        color: myBookingsFilter === f.value ? '#fff' : 'var(--text-secondary, #374151)',
                        fontSize:13,fontWeight:500,cursor:'pointer',whiteSpace:'nowrap',
                      }}
                    >{f.label}</button>
                  ))}
                </div>
                {myBookingsLoading ? (
                  <div style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>Yuklanmoqda...</div>
                ) : myBookings.length === 0 ? (
                  <div style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>
                    <p>{myBookingsFilter ? 'Bu holatda buyurtma yo\'q' : "Hali xizmat buyurtmasi yo'q"}</p>
                  </div>
                ) : (
                  <div className="up_orders">
                    {myBookings.map(b => {
                      const si = BOOKING_STATUS_MAP[b.status] || BOOKING_STATUS_MAP.pending
                      return (
                        <div className="up_order" key={b._id}>
                          <div className="up_order_left">
                            <div className="up_order_img up_order_img_placeholder" style={{background:'var(--accent-bg, #f0fdf4)',color:'var(--accent, #2bc32b)',fontSize:20}}>
                              🔧
                            </div>
                            <div className="up_order_info">
                              <div className="up_order_top">
                                <strong>{b.craftsmanId?.name || "Usta"}</strong>
                                <span className="up_order_status" style={{background:si.bg,color:si.color}}>{si.label}</span>
                              </div>
                              <span className="up_order_date">{b.service} · {b.date ? new Date(b.date).toLocaleDateString('uz-UZ') : ''} {b.time || ''}</span>
                              {b.address && <span className="up_order_date">📍 {b.address}</span>}
                              {b.status === 'quote_sent' && b.quotedPrice > 0 ? (
                                <div style={{marginTop:8,padding:'12px 16px',background:'linear-gradient(135deg,#dbeafe,#eff6ff)',borderRadius:10,border:'1.5px solid #93c5fd'}}>
                                  <div style={{fontSize:12,color:'#1e40af',marginBottom:4,fontWeight:500}}>Usta narx taklif qildi:</div>
                                  <div style={{fontSize:22,fontWeight:700,color:'#1e40af'}}>{convertPrice(b.quotedPrice)}</div>
                                  <div style={{display:'flex',gap:8,marginTop:10}}>
                                    <button
                                      onClick={() => handleBookingAction(b._id, 'quote_accepted')}
                                      disabled={bookingAction === b._id}
                                      style={{
                                        flex:1,padding:'10px 0',background:'#10b981',color:'#fff',border:'none',borderRadius:8,
                                        fontWeight:600,fontSize:14,cursor:'pointer',opacity:bookingAction === b._id ? 0.6 : 1,
                                      }}
                                    >
                                      {bookingAction === b._id ? '...' : '✅ Qabul qilish'}
                                    </button>
                                    <button
                                      onClick={() => handleBookingAction(b._id, 'cancelled')}
                                      disabled={bookingAction === b._id}
                                      style={{
                                        flex:1,padding:'10px 0',background:'#fff',color:'#ef4444',border:'1.5px solid #fca5a5',borderRadius:8,
                                        fontWeight:600,fontSize:14,cursor:'pointer',opacity:bookingAction === b._id ? 0.6 : 1,
                                      }}
                                    >
                                      {bookingAction === b._id ? '...' : '❌ Bekor qilish'}
                                    </button>
                                  </div>
                                </div>
                              ) : b.status === 'quote_accepted' ? (
                                <div style={{marginTop:8,padding:'10px 14px',background:'#d1fae5',borderRadius:8,border:'1px solid #6ee7b7',fontSize:13,color:'#065f46'}}>
                                  ✅ Narx qabul qilindi — usta ishni boshlashini kuting
                                </div>
                              ) : b.status === 'in_progress' ? (
                                <div style={{marginTop:8,padding:'10px 14px',background:'#e0e7ff',borderRadius:8,border:'1px solid #a5b4fc',fontSize:13,color:'#3730a3'}}>
                                  🔄 Usta hozir ish bajarmoqda
                                </div>
                              ) : b.status === 'completed' ? (
                                <div style={{marginTop:8}}>
                                  <span className="up_order_total">{b.finalPrice > 0 ? convertPrice(b.finalPrice) : b.quotedPrice > 0 ? convertPrice(b.quotedPrice) : '—'}</span>
                                </div>
                              ) : (
                                <span className="up_order_total">{b.quotedPrice > 0 ? convertPrice(b.quotedPrice) : 'Narx kutilmoqda'}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {section === 'favorites' && (
              <div className="up_section">
                <div className="up_section_header"><h2>{t('myFavorites')}</h2><span className="up_count">{favorites.length} {t('items')}</span></div>
                <div className="up_favorites">
                  {favorites.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      <p>{t('noFavorites')}</p>
                    </div>
                  ) : favorites.map(fav => (
                    <div className="up_fav" key={fav.id}>
                      <img src={fav.image} alt={fav.name} className="up_fav_img" />
                      <div className="up_fav_info">
                        <span className="up_fav_brand">{fav.brand}</span>
                        <h4>{fav.name}</h4>
                        <div className="up_fav_prices">
                          <strong>{convertPrice(fav.price)}</strong>
                          {fav.oldPrice && <span>{convertPrice(fav.oldPrice)}</span>}
                        </div>
                      </div>
                      <div className="up_fav_actions">
                        <button className="up_fav_cart" onClick={() => addItem(fav)}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>{t('addToCart')}</button>
                        <button className="up_fav_remove" onClick={() => toggleFavorite(fav)}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section === 'addresses' && (
              <div className="up_section">
                <div className="up_section_header">
                  <h2>{ADDRESSES_TITLE[lang] || ADDRESSES_TITLE.uz}</h2>
                  <button className="up_add_btn"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>{t('addAddress')}</button>
                </div>
                <div className="up_addresses">
                  {ADDRESSES.map(addr => (
                    <div className={`up_address ${addr.isDefault ? 'default' : ''}`} key={addr.id}>
                      <div className="up_address_top">
                        <div className="up_address_title"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>{t(addr.titleKey)}</div>
                        {addr.isDefault && <span className="up_default_badge">{t('defaultBadge')}</span>}
                      </div>
                      <p className="up_address_text">{addr.address}</p>
                      <span className="up_address_phone">{addr.phone}</span>
                      <div className="up_address_actions">
                        <button>{t('editAddr')}</button>
                        {!addr.isDefault && <button>{t('makeDefault')}</button>}
                        <button className="danger">{t('deleteAddr')}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section === 'settings' && !user && (
              <div className="up_section">
                <div className="up_section_header"><h2>{t('settings')}</h2><span className="up_count">{t('guest')}</span></div>
                <div className="up_settings">
                  <div className="up_setting_group">
                    <h3>{t('appearance')}</h3>
                    <div className="up_toggle_item">
                      <div className="up_toggle_info">
                        <div className="up_toggle_icon">{dark ? moonIcon : sunIcon}</div>
                        <div><strong>{dark ? t('darkMode') : t('lightMode')}</strong><span>{dark ? t('darkDesc') : t('lightDesc')}</span></div>
                      </div>
                      <label className="up_toggle"><input type="checkbox" checked={dark} onChange={toggleTheme} /><span></span></label>
                    </div>
                  </div>
                  <div className="up_setting_group">
                    <h3>{t('langCurrency')}</h3>
                    <div className="up_form_row">
                      <div className="up_field"><label>{t('language')}</label><CustomSelect options={LANG_OPTIONS} value={lang} onChange={setLang} /></div>
                      <div className="up_field"><label>{t('currency')}</label><CustomSelect options={CURRENCY_OPTIONS} value={currency} onChange={setCurrency} /></div>
                    </div>
                  </div>
                  <div className="up_guest_prompt">
                    <div className="up_guest_prompt_icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></div>
                    <div className="up_guest_prompt_text"><strong>{t('moreFeatures')}</strong><span>{t('moreFeaturesDesc')}</span></div>
                    <button className="up_guest_prompt_btn" onClick={openLogin}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>{t('loginPrompt')}</button>
                  </div>
                </div>
              </div>
            )}

            {section === 'settings' && user && (
              <div className="up_section">
                <div className="up_section_header"><h2>{t('settings')}</h2></div>
                <div className="up_settings">
                  <div className="up_setting_group">
                    <h3>{t('appearance')}</h3>
                    <div className="up_toggle_item">
                      <div className="up_toggle_info">
                        <div className="up_toggle_icon">{dark ? moonIcon : sunIcon}</div>
                        <div><strong>{dark ? t('darkMode') : t('lightMode')}</strong><span>{dark ? t('darkDesc') : t('lightDesc')}</span></div>
                      </div>
                      <label className="up_toggle"><input type="checkbox" checked={dark} onChange={toggleTheme} /><span></span></label>
                    </div>
                  </div>
                  <div className="up_setting_group">
                    <h3>{t('notifications')}</h3>
                    <div className="up_toggle_item">
                      <div><strong>{t('emailNotif')}</strong><span>{t('emailNotifDesc')}</span></div>
                      <label className="up_toggle"><input type="checkbox" checked={notifEmail} onChange={e => setNotifEmail(e.target.checked)} /><span></span></label>
                    </div>
                    <div className="up_toggle_item">
                      <div><strong>{t('smsNotif')}</strong><span>{t('smsNotifDesc')}</span></div>
                      <label className="up_toggle"><input type="checkbox" checked={notifSms} onChange={e => setNotifSms(e.target.checked)} /><span></span></label>
                    </div>
                    <div className="up_toggle_item">
                      <div><strong>{t('promoNotif')}</strong><span>{t('promoNotifDesc')}</span></div>
                      <label className="up_toggle"><input type="checkbox" checked={notifPromo} onChange={e => setNotifPromo(e.target.checked)} /><span></span></label>
                    </div>
                  </div>
                  <div className="up_setting_group">
                    <h3>{t('security')}</h3>
                    <div className="up_setting_btns">
                      <button className="up_setting_btn" onClick={() => setShowPassword(true)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                        {t('changePassword')}
                      </button>
                      <button className={`up_setting_btn ${twoFactor ? 'active-setting' : ''}`} onClick={() => { if (!twoFactor) setShow2FA(true); else setTwoFactor(false); }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        {twoFactor ? t('twoFactorOn') : t('twoFactor')}
                        {twoFactor && <span className="up_setting_active_badge">ON</span>}
                      </button>
                      <button className="up_setting_btn danger" onClick={() => setShowDelete(true)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        {t('deleteAccount')}
                      </button>
                    </div>
                  </div>
                  <div className="up_setting_group">
                    <h3>{t('langCurrency')}</h3>
                    <div className="up_form_row">
                      <div className="up_field"><label>{t('language')}</label><CustomSelect options={LANG_OPTIONS} value={lang} onChange={setLang} /></div>
                      <div className="up_field"><label>{t('currency')}</label><CustomSelect options={CURRENCY_OPTIONS} value={currency} onChange={setCurrency} /></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
      <Footer />

      {showPassword && <PasswordModal onClose={() => setShowPassword(false)} />}
      {show2FA && <TwoFactorModal onClose={() => setShow2FA(false)} onEnable={() => setTwoFactor(true)} />}
      {showDelete && <DeleteAccountModal onClose={() => setShowDelete(false)} onDelete={handleDeleteAccount} />}
      {showLoginPrompt && <LoginPrompt onClose={() => setShowLoginPrompt(false)} />}
    </div>
  )
}

export default UserPage
