import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import Header from './header'
import Footer from './Footer'
import '../components_css/cartpage.css'

function CartPage() {
  const { items, removeItem, updateQty, totalItems, totalPrice, createOrder, orderLoading } = useCart()
  const { user, openLogin } = useAuth()
  const { t, convertPrice } = useSettings()
  const navigate = useNavigate()
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [orderError, setOrderError] = useState(null)
  const [address, setAddress] = useState(user?.address || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [note, setNote] = useState('')

  const handlePlaceOrder = async () => {
    if (!user) { openLogin(); return }
    if (!address.trim()) { setOrderError(t('deliveryAddress') || 'Manzilni kiriting'); return }
    setOrderError(null)
    try {
      await createOrder(address.trim(), phone.trim(), note.trim())
      setOrderPlaced(true)
    } catch (err) {
      setOrderError(err.message)
    }
  }

  const getItemId = (item) => item.cartKey || item._id || item.id

  return (
    <div className="cartpage">
      <Header />
      <div className="container">
        <div className="cartpage_breadcrumb">
          <span onClick={() => navigate('/')}>{t('home')}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          <span className="active">{t('cart')}</span>
        </div>

        <h1 className="cartpage_title">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          {t('cart')}
          {totalItems > 0 && <span className="cartpage_title_count">{totalItems} {t('items')}</span>}
        </h1>

        {orderPlaced ? (
          <div className="cartpage_empty">
            <div className="cartpage_empty_icon" style={{ color: 'var(--accent)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h2>{t('orderSuccess')}</h2>
            <p>{t('orderSuccessDesc')}</p>
            <button className="cartpage_back" onClick={() => navigate('/')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
              {t('continueShopping')}
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="cartpage_empty">
            <div className="cartpage_empty_icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"/>
                <circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
            </div>
            <h2>{t('emptyCart')}</h2>
            <p>{t('emptyCartDesc')}</p>
            <button className="cartpage_back" onClick={() => navigate('/')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
              {t('startShopping')}
            </button>
          </div>
        ) : (
          <div className="cartpage_layout">
            <div className="cartpage_items">
              {items.map(item => {
                const id = getItemId(item)
                return (
                  <div className="cartpage_item" key={id}>
                    <img src={item.image || '/placeholder.png'} alt={item.name} className="cartpage_item_img" />
                    <div className="cartpage_item_info">
                      <div className="cartpage_item_top">
                        <div>
                          <span className="cartpage_item_brand">{item.brand}</span>
                          <h3 className="cartpage_item_name">{item.name}</h3>
                          {item.variant && (
                            <span className="cartpage_item_variant">
                              {[item.variant.color, item.variant.size].filter(Boolean).join(' / ')}
                            </span>
                          )}
                        </div>
                        <button className="cartpage_item_remove" onClick={() => removeItem(id)}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                      <div className="cartpage_item_bottom">
                        <div className="cartpage_qty">
                          <button onClick={() => updateQty(id, item.qty - 1)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          </button>
                          <span>{item.qty}</span>
                          <button onClick={() => updateQty(id, item.qty + 1)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          </button>
                        </div>
                        <div className="cartpage_item_prices">
                          <span className="cartpage_item_price">{convertPrice(item.price * item.qty)}</span>
                          {item.oldPrice && (
                            <span className="cartpage_item_oldprice">{convertPrice(item.oldPrice * item.qty)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="cartpage_summary">
              <h3>{t('orderSummary')}</h3>
              <div className="cartpage_summary_rows">
                <div className="cartpage_summary_row">
                  <span>{t('products')} ({totalItems})</span>
                  <span>{convertPrice(totalPrice)}</span>
                </div>
                <div className="cartpage_summary_row">
                  <span>{t('pickup')}</span>
                  <span className="free">{t('free')}</span>
                </div>
                <div className="cartpage_summary_row total">
                  <span>{t('total')}</span>
                  <span>{convertPrice(totalPrice)}</span>
                </div>
              </div>

              <div className="cartpage_checkout_form">
                <div className="cartpage_field">
                  <label>{t('deliveryAddress') || 'Yetkazish manzili'} *</label>
                  <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Manzilni kiriting..." />
                </div>
                <div className="cartpage_field">
                  <label>{t('phone') || 'Telefon'} *</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+998 90 123 45 67" />
                </div>
                <div className="cartpage_field">
                  <label>{t('note') || 'Izoh'} ({t('optional') || 'ixtiyoriy'})</label>
                  <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Qo'shimcha izoh..." />
                </div>
              </div>

              {orderError && <p className="cartpage_error" style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{orderError}</p>}
              <button className="cartpage_checkout" onClick={handlePlaceOrder} disabled={orderLoading}>
                {orderLoading ? '...' : t('placeOrder')}
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
              <button className="cartpage_continue" onClick={() => navigate('/')}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"/>
                  <polyline points="12 19 5 12 12 5"/>
                </svg>
                {t('continueShopping')}
              </button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}

export default CartPage
