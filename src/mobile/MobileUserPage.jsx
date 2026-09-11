import React, { useCallback, useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { useFavorites } from '../context/FavoritesContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { api } from '../services/api'
import './mobile-user.css'

const STATUS_CHIP = {
  pending: 'chip_amber', confirmed: 'chip_blue', shipping: 'chip_amber',
  delivered: 'chip_green', completed: 'chip_green', cancelled: 'chip_red',
}

const SECTION_TITLES = {
  profile: 'myProfile',
  orders: 'myOrders',
  bookings: 'bookingsTitle',
  favorites: 'myFavorites',
  messages: 'messages',
  addresses: 'myAddresses',
  settings: 'settings',
}

const BOOKING_STATUS = {
  pending: { key: 'bk_pending', cls: 'chip_amber' },
  quote_sent: { key: 'bk_quote_sent', cls: 'chip_blue' },
  quote_accepted: { key: 'bk_quote_accepted', cls: 'chip_green' },
  in_progress: { key: 'bk_in_progress', cls: 'chip_blue' },
  completed: { key: 'bk_completed', cls: 'chip_green' },
  cancelled: { key: 'bk_cancelled', cls: 'chip_red' },
}

const Ic = ({ d, size = 20, sw = 2, className = '' }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
)

const ICONS = {
  box: 'M1 3h15l2 3v9H1zM16 8H1M12 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  truck: 'M1 3h15v13H1zM16 8h4l3 3v5h-7M5.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  check: 'M20 6L9 17l-5-5',
  chev: 'M9 18l6-6-6-6',
  back: 'M15 18l-6-6 6-6',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  phone: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z',
  pin: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 13v.01',
  msg: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  heart: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
  wrench: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
  search: 'M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  plus: 'M12 5v14M5 12h14',
  trash: 'M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  panel: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  moon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
}

export default function MobileUserPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, openLogin, logout, updateProfile } = useAuth()
  const { lang, currency, setLang, setCurrency, notifEmail, notifSms, notifPromo, setNotifEmail, setNotifSms, setNotifPromo, twoFactor, setTwoFactor, convertPrice, t } = useSettings()
  const { dark, toggleTheme } = useTheme()
  const { favorites, toggleFavorite } = useFavorites()
  const { addItem } = useCart()

  const [section, setSection] = useState(() => searchParams.get('section') || 'home')
  const [orderFilter, setOrderFilter] = useState('all')

  const [orders, setOrders] = useState([])
  const [bookings, setBookings] = useState([])
  const [conversations, setConversations] = useState([])
  const [msgQuery, setMsgQuery] = useState('')
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [convLoading, setConvLoading] = useState(false)

  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', location: user?.location || '' })
  const [saveMsg, setSaveMsg] = useState(null)
  const [bookingAction, setBookingAction] = useState(null)
  const [pwOpen, setPwOpen] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', newPass: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState(null)
  const [pwSaving, setPwSaving] = useState(false)
  const [addresses, setAddresses] = useState([])
  const [addressesLoading, setAddressesLoading] = useState(false)
  const [addrEditor, setAddrEditor] = useState(null)
  const [addrForm, setAddrForm] = useState({ title: '', address: '', phone: '', isDefault: false })
  const [addrMsg, setAddrMsg] = useState(null)
  const [addrSaving, setAddrSaving] = useState(false)

  useEffect(() => { setForm({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', location: user?.location || '' }) }, [user])
  useEffect(() => {
    const s = searchParams.get('section')
    if (s) setSection(s)
  }, [searchParams])

  const loadOrders = useCallback(async () => {
    if (!user) return
    setOrdersLoading(true)
    try { const d = await api.orders.list(); setOrders(d.orders || []) } catch (err) { console.error('orders', err) }
    finally { setOrdersLoading(false) }
  }, [user])

  const loadBookings = useCallback(async () => {
    if (!user) return
    setBookingsLoading(true)
    try { const d = await api.bookings.my(); setBookings(d.bookings || []) } catch (err) { console.error('bookings', err) }
    finally { setBookingsLoading(false) }
  }, [user])

  const loadConversations = useCallback(async () => {
    if (!user) return
    setConvLoading(true)
    try {
      const { conversations: convs } = await api.conversations.list()
      setConversations(convs.map(c => {
        const s = c.seller
        return {
          id: c._id,
          who: s?.shopName || s?.name || 'Sotuvchi',
          last: c.lastMessage || '',
          time: c.lastTime ? new Date(c.lastTime).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) : '',
          unread: c.unread || 0,
        }
      }))
    } catch (err) { console.error('conv', err) }
    finally { setConvLoading(false) }
  }, [user])

  const loadAddresses = useCallback(async () => {
    if (!user) return
    setAddressesLoading(true)
    try { const d = await api.addresses.list(); setAddresses(d.addresses || []) } catch (err) { console.error('addresses', err) }
    finally { setAddressesLoading(false) }
  }, [user])

  useEffect(() => { if (user) { loadOrders(); loadBookings(); loadConversations(); loadAddresses() } }, [user, loadOrders, loadBookings, loadConversations, loadAddresses])

  const go = (s) => { setSection(s); setOrderFilter('all') }
  const goHome = () => go('home')

  const statusTxt = (st) => t('st_' + st) || st
  const chipCls = (st) => STATUS_CHIP[st] || 'chip_blue'
  const fmtDate = (s) => {
    if (!s) return ''
    const d = new Date(s)
    const loc = lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-US' : 'uz-UZ'
    return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString(loc)
  }

  const handleBookingAction = async (id, action) => {
    setBookingAction(id)
    try {
      await api.bookings.updateStatus(id, action)
      setBookings(prev => prev.map(b => b._id === id ? { ...b, status: action } : b))
    } catch (err) { console.error('booking action', err) }
    finally { setBookingAction(null) }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPwMsg(null)
    if (!pwForm.current || !pwForm.newPass || !pwForm.confirm) {
      setPwMsg({ type: 'err', text: t('fillAllFields') })
      return
    }
    if (pwForm.newPass.length < 6) {
      setPwMsg({ type: 'err', text: t('passwordTooShort') })
      return
    }
    if (pwForm.newPass !== pwForm.confirm) {
      setPwMsg({ type: 'err', text: t('passwordsDontMatch') })
      return
    }
    setPwSaving(true)
    try {
      await api.auth.changePassword({ currentPassword: pwForm.current, newPassword: pwForm.newPass })
      setPwForm({ current: '', newPass: '', confirm: '' })
      setPwMsg({ type: 'ok', text: t('passwordChanged') })
      setTimeout(() => { setPwOpen(false); setPwMsg(null) }, 1600)
    } catch (err) {
      setPwMsg({ type: 'err', text: err?.response?.data?.message || err?.message || t('errorOccurred') })
    } finally {
      setPwSaving(false)
    }
  }

  const handleSave = async () => {
    try { await updateProfile({ name: form.name, email: form.email, phone: form.phone, location: form.location }) } catch (err) { console.error(err) }
    setEditMode(false)
    setSaveMsg(t('profileUpdated'))
    setTimeout(() => setSaveMsg(null), 2500)
  }

  const openAddrEditor = (a = null) => {
    setAddrEditor(a === null ? 'new' : a)
    setAddrMsg(null)
    setAddrForm(a
      ? { title: a.title || '', address: a.address || '', phone: a.phone || '', isDefault: a.isDefault }
      : { title: '', address: '', phone: '', isDefault: false })
  }

  const saveAddr = async () => {
    if (addrSaving) return
    if (!addrForm.address.trim()) { setAddrMsg(t('enterAddressText')); return }
    setAddrMsg(null)
    setAddrSaving(true)
    try {
      if (addrEditor !== 'new') {
        const { address } = await api.addresses.update(addrEditor._id, addrForm)
        setAddresses(prev => prev.map(x => (x._id === addrEditor._id ? address : addrForm.isDefault ? { ...x, isDefault: false } : x)))
      } else {
        const { address } = await api.addresses.create(addrForm)
        setAddresses(prev => addrForm.isDefault ? prev.map(x => ({ ...x, isDefault: false })).concat(address) : [...prev, address])
      }
      setAddrEditor(null)
    } catch (err) { setAddrMsg(err.message) }
    finally { setAddrSaving(false) }
  }

  const deleteAddr = async (id) => {
    const removed = addresses.find(x => x._id === id)
    try {
      await api.addresses.remove(id)
      let next = addresses.filter(x => x._id !== id)
      if (removed?.isDefault && next.length) next = next.map((x, i) => ({ ...x, isDefault: i === 0 }))
      setAddresses(next)
    } catch (err) { console.error('addr delete', err) }
  }

  const setDefaultAddr = async (id) => {
    try {
      const { address } = await api.addresses.setDefault(id)
      setAddresses(prev => prev.map(x => ({ ...x, isDefault: x._id === address._id })))
    } catch (err) { console.error('addr default', err) }
  }

  const OST = [
    { k: 'pending', icon: ICONS.clock, cls: 'amber', count: orders.filter(o => o.status === 'pending').length },
    { k: 'confirmed', icon: ICONS.check, cls: 'blue', count: orders.filter(o => o.status === 'confirmed').length },
    { k: 'completed', icon: ICONS.check, cls: 'green', count: orders.filter(o => o.status === 'completed' || o.status === 'delivered').length },
  ]

  const GRID = [
    { k: 'favorites', lk: 'myFavorites', icon: ICONS.heart, cls: 'pink', badge: favorites.length },
    { k: 'addresses', lk: 'myAddresses', icon: ICONS.pin, cls: 'blue', badge: 2 },
    { k: 'messages', lk: 'messages', icon: ICONS.msg, cls: 'green', badge: conversations.reduce((s, c) => s + c.unread, 0) },
    { k: 'bookings', lk: 'bookingsTitle', icon: ICONS.wrench, cls: 'amber', badge: bookings.filter(b => b.status === 'pending').length },
  ]

  const roleLabel = user?.role === 'craftsman' ? t('craftsman') : user?.role === 'seller' ? t('seller') : t('customer')
  const visibleOrders = orderFilter === 'all' ? orders : orders.filter(o => o.status === orderFilter)

  // ── GUEST ──
  if (!user) {
    return (
      <div className="mua">
        <header className="mua_topbar">
          <span className="mua_logo">{t('cabinet')}</span>
          <span className="mua_topbar_title" />
          <span style={{ width: 38 }} />
        </header>
        <div className="mua_body">
          <div className="mua_guest">
            <div className="mua_guest_icon"><Ic d={ICONS.user} size={34} /></div>
            <h2>{t('login')}</h2>
            <p>{t('guestHint')}</p>
            <button className="mua_guest_btn" onClick={openLogin}>{t('loginReg')}</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mua">
      {/* ── Topbar ── */}
      <header className="mua_topbar">
        {section === 'home' ? (
          <button className="mua_circle" onClick={() => navigate(-1)}><Ic d={ICONS.back} size={19} /></button>
        ) : (
          <button className="mua_circle" onClick={goHome}><Ic d={ICONS.back} size={19} /></button>
        )}
        <span className="mua_topbar_title">{section === 'home' ? t('cabinet') : t(SECTION_TITLES[section] || 'settings')}</span>
        <button className="mua_circle" onClick={() => (section === 'settings' ? goHome() : go('settings'))}><Ic d={ICONS.gear} size={18} /></button>
      </header>

      {/* ════════ HOME ════════ */}
      {section === 'home' && (
        <div className="mua_body">
          <div className="mua_hero">
            <div className="mua_avatar">{user.name?.[0]?.toUpperCase() || '?'}</div>
            <div className="mua_hero_info">
              <div className="mua_name">{user.name}</div>
              <div className="mua_hero_sub">{user.phone || user.email}</div>
              <span className="mua_role">{roleLabel}</span>
            </div>
            <button className="mua_edit" onClick={() => go('profile')}><Ic d={ICONS.user} size={16} /> {t('profile')}</button>
          </div>

          <div className="mua_card mua_orders">
            <div className="mua_card_head">
              <span className="mua_card_title">{t('myOrders')}</span>
              <button className="mua_link" onClick={() => go('orders')}>{t('all')} <Ic d={ICONS.chev} size={13} /></button>
            </div>
            <div className="mua_ostrip">
              {OST.map(s => (
                <button key={s.k} className="mua_os" onClick={() => { setOrderFilter(s.k); go('orders') }}>
                  <span className={`mua_os_icon ${s.cls}`}><Ic d={s.icon} size={21} /></span>
                  <span className="mua_os_count">{s.count}</span>
                  <span className="mua_os_label">{statusTxt(s.k)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mua_card">
            <div className="mua_card_head"><span className="mua_card_title">{t('quickActions')}</span></div>
            <div className="mua_grid">
              {GRID.map(g => (
                <button key={g.k} className="mua_gi" onClick={() => go(g.k)}>
                  <span className={`mua_gi_icon ${g.cls}`}><Ic d={g.icon} size={22} /></span>
                  <span className="mua_gi_label">{t(g.lk)}</span>
                  {g.badge ? <span className="mua_badge">{g.badge}</span> : null}
                </button>
              ))}
            </div>
          </div>

          <div className="mua_card mua_list">
            {['seller', 'craftsman'].includes(user.role) && (
              <button className="mua_li" onClick={() => navigate(user.role === 'craftsman' ? '/craftsman-dashboard' : '/seller-dashboard')}>
                <span className="mua_li_icon"><Ic d={ICONS.panel} size={19} /></span>
                <span className="mua_li_label">{user.role === 'craftsman' ? t('craftsmanPanel') : t('sellerPanel')}</span>
                <Ic d={ICONS.chev} size={16} className="mua_li_chev" />
              </button>
            )}
            <button className="mua_li" onClick={() => go('profile')}>
              <span className="mua_li_icon"><Ic d={ICONS.user} size={19} /></span>
              <span className="mua_li_label">{t('profileSecurity')}</span>
              <Ic d={ICONS.chev} size={16} className="mua_li_chev" />
            </button>
            <button className="mua_li" onClick={() => go('settings')}>
              <span className="mua_li_icon"><Ic d={ICONS.gear} size={19} /></span>
              <span className="mua_li_label">{t('langCurrencyNotif')}</span>
              <Ic d={ICONS.chev} size={16} className="mua_li_chev" />
            </button>
          </div>

          <button className="mua_logout" onClick={() => { logout(); navigate('/') }}>
            <Ic d={ICONS.logout} size={17} /> {t('logout')}
          </button>
        </div>
      )}

      {/* ════════ PROFIL ════════ */}
      {section === 'profile' && (
        <div className="mua_body">
          <div className="mua_card">
            <div className="mua_card_head">
              <span className="mua_card_title">{t('personalData')}</span>
              <button className={`mua_minibtn${editMode ? ' done' : ''}`} onClick={() => editMode ? handleSave() : setEditMode(true)}>
                {editMode ? t('saveBtn') : t('edit')}
              </button>
            </div>
            {editMode ? (
              <div className="mua_form">
                <div className="mua_field"><label>{t('firstName')}</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div className="mua_field"><label>{t('email')}</label><input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div className="mua_field"><label>{t('phone')}</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="mua_field"><label>{t('address')}</label><input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
              </div>
            ) : (
              <div className="mua_rows">
                <div className="mua_row"><span><Ic d={ICONS.user} size={15} /> {t('firstName')}</span><strong>{user.name}</strong></div>
                <div className="mua_row"><span><Ic d={ICONS.msg} size={15} /> {t('email')}</span><strong>{user.email}</strong></div>
                <div className="mua_row"><span><Ic d={ICONS.phone} size={15} /> {t('phone')}</span><strong>{user.phone || '—'}</strong></div>
                <div className="mua_row"><span><Ic d={ICONS.pin} size={15} /> {t('address')}</span><strong>{user.location || '—'}</strong></div>
              </div>
            )}
            {saveMsg && <div className="mua_save_msg">{saveMsg}</div>}
          </div>

          <div className="mua_stats">
            <div className="mua_stat"><strong>{orders.length}</strong><span>{t('ordersWord')}</span></div>
            <div className="mua_stat"><strong>{favorites.length}</strong><span>{t('savedWord')}</span></div>
            <div className="mua_stat"><strong>{bookings.length}</strong><span>{t('servicesWord')}</span></div>
          </div>
        </div>
      )}

      {/* ════════ BUYURTMALAR ════════ */}
      {section === 'orders' && (
        <div className="mua_body">
          <div className="mua_chips">
            {['all', ...OST.map(s => s.k)].map(f => (
              <button key={f} className={`mua_chip${orderFilter === f ? ' on' : ''}`} onClick={() => setOrderFilter(f)}>
                {f === 'all' ? t('allLabel') : statusTxt(f)}
              </button>
            ))}
          </div>
          {ordersLoading ? (
            <div className="mua_center">{t('loading')}</div>
          ) : visibleOrders.length === 0 ? (
            <div className="mua_center">{t('noOrders')}</div>
          ) : (
            visibleOrders.map(o => (
              <div className="mua_order" key={o._id}>
                <div className="mua_order_img"><Ic d={ICONS.box} size={24} /></div>
                <div className="mua_order_body">
                  <div className="mua_order_top">
                    <strong>#{String(o._id).slice(-4).toUpperCase()}</strong>
                    <span className={`chip ${chipCls(o.status)}`}>{statusTxt(o.status)}</span>
                  </div>
                  <div className="mua_order_name">{o.items?.map(i => i.name || t('product')).join(', ')}</div>
                  <div className="mua_order_meta">{o.items?.reduce((s, i) => s + (Number(i.qty) || 1), 0) || 0} {t('itemsWord')} · {o.createdAt ? new Date(o.createdAt).toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-US' : 'uz-UZ') : ''}</div>
                  <div className="mua_order_total">{convertPrice(o.total)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ════════ XIZMAT ════════ */}
      {section === 'bookings' && (
        <div className="mua_body">
          {bookingsLoading ? (
            <div className="mua_center">{t('loading')}</div>
          ) : bookings.length === 0 ? (
            <div className="mua_center">{t('noBookings')}</div>
          ) : (
            bookings.map(b => {
              const st = BOOKING_STATUS[b.status] || BOOKING_STATUS.pending
              return (
                <div className="mua_order" key={b._id}>
                  <div className="mua_order_img alt"><Ic d={ICONS.wrench} size={22} /></div>
                  <div className="mua_order_body">
                    <div className="mua_order_top">
                      <strong>{b.craftsmanId?.name || t('craftsman')}</strong>
                      <span className={`chip ${st.cls}`}>{t(st.key)}</span>
                    </div>
                    <div className="mua_order_name">{b.service || t('serviceNoun')}</div>
                    <div className="mua_order_meta">{fmtDate(b.date)} {b.time || ''}</div>
                    {b.quotedPrice > 0 && <div className="mua_order_total">{convertPrice(b.quotedPrice)}</div>}
                    {b.status === 'pending' && (
                      <div className="mua_quote">
                        <div className="mua_quote_label">{t('awaitingPrice')}</div>
                        <div className="mua_quote_actions">
                          <button className="mua_minibtn danger" disabled={bookingAction === b._id} onClick={() => handleBookingAction(b._id, 'cancelled')}>
                            {bookingAction === b._id ? '...' : t('cancel')}
                          </button>
                        </div>
                      </div>
                    )}
                    {b.status === 'quote_sent' && (
                      <div className="mua_quote">
                        <div className="mua_quote_label">{t('priceOffered')}</div>
                        <div className="mua_quote_price">{convertPrice(b.quotedPrice)}</div>
                        <div className="mua_quote_actions">
                          <button className="mua_minibtn solid" disabled={bookingAction === b._id} onClick={() => handleBookingAction(b._id, 'quote_accepted')}>
                            {bookingAction === b._id ? '...' : t('accept')}
                          </button>
                          <button className="mua_minibtn danger" disabled={bookingAction === b._id} onClick={() => handleBookingAction(b._id, 'cancelled')}>
                            {t('decline')}
                          </button>
                        </div>
                      </div>
                    )}
                    {b.status === 'in_progress' && <div className="mua_note">{t('workInProgress')}</div>}
                    {b.status === 'quote_accepted' && <div className="mua_note ok">{t('priceAcceptedNote')}</div>}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ════════ SAQLANGANLAR ════════ */}
      {section === 'favorites' && (
        <div className="mua_body">
          {favorites.length === 0 ? (
            <div className="mua_center">{t('noFavorites')}</div>
          ) : (
            favorites.map(f => (
              <div className="mua_fav" key={f._id || f.id}>
                <div className="mua_fav_img">{f.image ? <img src={f.image} alt="" /> : (f.name?.[0] || '?')}</div>
                <div className="mua_fav_info" onClick={() => navigate(`/product/${f._id || f.id}`)}>
                  <div className="mua_fav_brand">{f.brand || t('product')}</div>
                  <div className="mua_fav_name">{f.name}</div>
                  <div className="mua_fav_price">{convertPrice(f.price)} {f.oldPrice && <s>{convertPrice(f.oldPrice)}</s>}</div>
                </div>
                <div className="mua_fav_actions">
                  <button className="mua_circle" onClick={() => addItem(f)}><Ic d={ICONS.box} size={15} /></button>
                  <button className="mua_circle red" onClick={() => toggleFavorite(f)}><Ic d={ICONS.trash} size={15} /></button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ════════ XABARLAR ════════ */}
      {section === 'messages' && (
        <div className="mua_body">
          {!convLoading && conversations.length > 0 && (
            <div className="mua_search">
              <Ic d={ICONS.search} size={16} />
              <input placeholder={t('searchMessages')} value={msgQuery} onChange={e => setMsgQuery(e.target.value)} />
            </div>
          )}
          {convLoading ? (
            <div className="mua_center">{t('loading')}</div>
          ) : conversations.length === 0 ? (
            <div className="mua_center">{t('noConversations')}</div>
          ) : (
            conversations.filter(c => (c.who || '').toLowerCase().includes(msgQuery.toLowerCase()) || (c.last || '').toLowerCase().includes(msgQuery.toLowerCase())).map(c => (
              <div className="mua_conv" key={c.id} onClick={() => navigate(`/messages?conv=${c.id}`)}>
                <div className="mua_conv_avatar">{c.who[0]}</div>
                <div className="mua_conv_body">
                  <div className="mua_conv_top"><strong>{c.who}</strong><span>{c.time}</span></div>
                  <div className="mua_conv_last">{c.last}</div>
                </div>
                {c.unread > 0 && <span className="mua_badge">{c.unread}</span>}
              </div>
            ))
          )}
        </div>
      )}

      {/* ════════ MANZILLAR ════════ */}
      {section === 'addresses' && (
        <div className="mua_body">
          <button className="mua_addbtn" onClick={() => openAddrEditor(null)}><Ic d={ICONS.plus} size={18} /> {t('addAddress')}</button>

          {addressesLoading && !addresses.length ? (
            <div className="mua_loading">{t('loading')}</div>
          ) : !addresses.length ? (
            <div className="mua_empty">{t('noAddresses')}</div>
          ) : (
            addresses.map(a => (
              <div className={`mua_addr${a.isDefault ? ' isdef' : ''}`} key={a._id}>
                <div className="mua_addr_top">
                  <strong><Ic d={ICONS.pin} size={16} /> {a.title}</strong>
                  {a.isDefault && <span className="chip chip_green">{t('defaultBadge')}</span>}
                </div>
                <div className="mua_addr_text">{a.address}</div>
                {a.phone && <div className="mua_addr_phone">{a.phone}</div>}
                <div className="mua_addr_actions">
                  <button className="mua_minibtn tiny" onClick={() => openAddrEditor(a)}>{t('edit')}</button>
                  {!a.isDefault && <button className="mua_minibtn tiny" onClick={() => setDefaultAddr(a._id)}>{t('makeDefault')}</button>}
                  <button className="mua_minibtn tiny danger" onClick={() => { if (window.confirm(t('deleteAddrConfirm'))) deleteAddr(a._id) }}>{t('delete')}</button>
                </div>
              </div>
            ))
          )}

          {addrEditor !== null && (
            <div className="mua_sheet_overlay" onClick={() => setAddrEditor(null)}>
              <div className="mua_sheet" onClick={e => e.stopPropagation()}>
                <div className="mua_sheet_title">{addrEditor === 'new' ? t('newAddress') : t('editAddress')}</div>
                <div className="mua_field"><label>{t('nameLabel')}</label>
                  <input value={addrForm.title} onChange={e => setAddrForm(f => ({ ...f, title: e.target.value }))} placeholder={t('addrTitlePlaceholder')} />
                </div>
                <div className="mua_field"><label>{t('address')} *</label>
                  <textarea value={addrForm.address} onChange={e => setAddrForm(f => ({ ...f, address: e.target.value }))} placeholder={t('addrTextPlaceholder')} rows={2} />
                </div>
                <div className="mua_field"><label>{t('phone')}</label>
                  <input value={addrForm.phone} onChange={e => setAddrForm(f => ({ ...f, phone: e.target.value }))} placeholder="+998 90 000 00 00" />
                </div>
                <label className="mua_toggle mua_addr_defrow">
                  <div><strong>{t('mainAddress')}</strong></div>
                  <span className="mua_switch"><input type="checkbox" checked={addrForm.isDefault} onChange={e => setAddrForm(f => ({ ...f, isDefault: e.target.checked }))} /><span></span></span>
                </label>
                {addrMsg && <div className="mua_addr_error">{addrMsg}</div>}
                <div className="mua_sheet_actions">
                  <button className="mua_minibtn" onClick={() => setAddrEditor(null)}>{t('cancel')}</button>
                  <button className="mua_minibtn primary" onClick={saveAddr} disabled={addrSaving}>{addrSaving ? t('saving') : addrEditor === 'new' ? t('addBtn') : t('saveBtn')}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════ SOZLAMALAR ════════ */}
      {section === 'settings' && (
        <div className="mua_body">
          <div className="mua_card">
            <div className="mua_set_title">{t('appearance')}</div>
            <div className="mua_toggle">
              <div><strong>{dark ? t('darkTheme') : t('lightTheme')}</strong><span>{t('themeToggle')}</span></div>
              <label className="mua_switch"><input type="checkbox" checked={dark} onChange={toggleTheme} /><span></span></label>
            </div>
          </div>
          <div className="mua_card">
            <div className="mua_set_title">{t('notifications')}</div>
            <div className="mua_toggle"><div><strong>Email</strong><span>{t('notifEmailDesc')}</span></div><label className="mua_switch"><input type="checkbox" checked={notifEmail} onChange={e => setNotifEmail(e.target.checked)} /><span></span></label></div>
            <div className="mua_toggle"><div><strong>SMS</strong><span>{t('notifSmsDesc')}</span></div><label className="mua_switch"><input type="checkbox" checked={notifSms} onChange={e => setNotifSms(e.target.checked)} /><span></span></label></div>
            <div className="mua_toggle"><div><strong>Promo</strong><span>{t('notifPromoDesc')}</span></div><label className="mua_switch"><input type="checkbox" checked={notifPromo} onChange={e => setNotifPromo(e.target.checked)} /><span></span></label></div>
          </div>
          <div className="mua_card">
            <div className="mua_set_title">{t('security')}</div>
            <div className="mua_toggle"><div><strong>{t('twoFactor')}</strong><span>{t('twoFactorDesc')}</span></div><label className="mua_switch"><input type="checkbox" checked={twoFactor} onChange={e => setTwoFactor(e.target.checked)} /><span></span></label></div>
            <button className="mua_li" onClick={() => setPwOpen(!pwOpen)}>{t('changePassword')}</button>
            {pwOpen && (
              <form className="mua_addr_form" onSubmit={handleChangePassword}>
                <div className="mua_field"><label>{t('currentPassword')}</label>
                  <input type="password" value={pwForm.current} onChange={e => setPwForm({ ...pwForm, current: e.target.value })} placeholder={t('currentPassword')} autoComplete="current-password" />
                </div>
                <div className="mua_field"><label>{t('newPassword')}</label>
                  <input type="password" value={pwForm.newPass} onChange={e => setPwForm({ ...pwForm, newPass: e.target.value })} placeholder={t('newPassword')} autoComplete="new-password" />
                </div>
                <div className="mua_field"><label>{t('repeatNewPassword')}</label>
                  <input type="password" value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} placeholder={t('repeatPasswordPlaceholder')} autoComplete="new-password" />
                </div>
                {pwMsg && <div className={pwMsg.type === 'ok' ? 'mua_pw_ok' : 'mua_addr_error'}>{pwMsg.text}</div>}
                <button type="submit" className="mua_minibtn solid" disabled={pwSaving} style={{ width: '100%' }}>{pwSaving ? t('saving') : t('savePassword')}</button>
              </form>
            )}
          </div>
          <div className="mua_card">
            <div className="mua_set_title">{t('langCurrency')}</div>
            <div className="mua_two">
              <div className="mua_field"><label>{t('language')}</label>
                <select value={lang} onChange={e => setLang(e.target.value)}>
                  <option value="uz">O'zbekcha</option><option value="ru">Русский</option><option value="en">English</option>
                </select>
              </div>
              <div className="mua_field"><label>{t('currency')}</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)}>
                  <option value="uzs">So'm</option><option value="usd">USD</option><option value="eur">EUR</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}