import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import MobileHeader from './MobileHeader.jsx'
import { openLoginSheet } from './MobileAuthSheet.jsx'

export default function MobileCart() {
  const { items, removeItem, updateQty, totalItems, totalPrice, createOrder, orderLoading } = useCart()
  const { user } = useAuth()
  const { t, convertPrice } = useSettings()
  const navigate = useNavigate()
  const [placed, setPlaced] = useState(false)
  const [error, setError] = useState(null)
  const [address, setAddress] = useState(user?.address || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [note, setNote] = useState('')

  const handleOrder = async () => {
    if (!user) { openLoginSheet(); return }
    if (!address.trim()) { setError(t('enterAddress')); return }
    setError(null)
    try { await createOrder(address.trim(), phone.trim(), note.trim()); setPlaced(true) }
    catch (e) { setError(e.message) }
  }

  const getItemId = (i) => i.cartKey || i._id || i.id

  return (
    <div className="mob">
      <MobileHeader />
      <div className="mob_page_head">
        <button className="mob_back" onClick={() => navigate('/')}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div className="mob_page_title">{t('cart')}</div>
        <div className="mob_chip mob_chip_green" style={{ marginLeft: 'auto' }}>{totalItems} {t('itemsWord')}</div>
      </div>

      {placed ? (
        <div className="mob_empty">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <div className="mob_empty_title">{t('orderSuccess')}</div>
          <p style={{ fontSize: 13 }}>{t('orderSentNote')}</p>
          <button className="mob_empty_btn" onClick={() => navigate('/')}>{t('continueShopping')}</button>
        </div>
      ) : items.length === 0 ? (
        <div className="mob_empty">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <div className="mob_empty_title">{t('emptyCart')}</div>
          <p style={{ fontSize: 13 }}>{t('emptyCartDesc')}</p>
          <button className="mob_empty_btn" onClick={() => navigate('/')}>{t('startShopping') || 'Xarid qilish'}</button>
        </div>
      ) : (
        <>
          <div className="mob_cart_summary">
            <div className="mob_cart_sum_head">{t('orderBundle')}</div>
            <div className="mob_cart_sum_row">
              <span className="mob_cart_sum_label">{t('products')} · {totalItems} {t('itemsWord')}</span>
              <span className="mob_cart_sum_price">{convertPrice(totalPrice)}</span>
            </div>
            <div className="mob_cart_sum_divider" />
            <div className="mob_cart_sum_row">
              <span className="mob_cart_sum_total">{t('total')}</span>
              <span className="mob_cart_sum_total_price">{convertPrice(totalPrice)}</span>
            </div>

            <div className="mob_cart_note">{t('orderSentNote')}</div>

            <div className="mob_field">
              <label className="mob_label">{t('address')}</label>
              <input className="mob_input" placeholder={t('addressPlaceholder')} value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="mob_field">
              <label className="mob_label">{t('phone')}</label>
              <input className="mob_input" type="tel" placeholder="+998 90 123 45 67" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="mob_field">
              <label className="mob_label">{t('commentLabel')}</label>
              <textarea className="mob_input mob_textarea" rows={2} placeholder={t('commentPlaceholder')} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            {error && <div className="mob_cart_error">{error}</div>}
            <button className="mob_btn" onClick={handleOrder} disabled={orderLoading}>
              {orderLoading ? t('loading') : `${t('placeOrder')} · ${convertPrice(totalPrice)}`}
            </button>
          </div>

          <div className="mob_list">
            {items.map(item => (
              <div className="mob_cart_item" key={getItemId(item)}>
                <img src={item.image || '/placeholder.png'} alt={item.name} />
                <div className="mob_cart_info">
                  <div className="mob_cart_name">{item.name}</div>
                  {item.brand && <div className="mob_cart_brand">{item.brand}</div>}
                  {item.variant && (item.variant.color || item.variant.size) && (
                    <div className="mob_cart_variant">
                      {item.variant.color && <span>{item.variant.colorHex && <i style={{ background: item.variant.colorHex }} />}{item.variant.color}</span>}
                      {item.variant.size && <span>· {item.variant.size}</span>}
                    </div>
                  )}
                  <div className="mob_cart_price">
                    {item.oldPrice > item.price && <s className="mob_cart_old">{convertPrice(item.oldPrice)}</s>}
                    {convertPrice(item.price * item.qty)}
                  </div>
                  <div className="mob_qty">
                    <button onClick={() => updateQty(getItemId(item), item.qty - 1)}>−</button>
                    <span>{item.qty}</span>
                    <button onClick={() => updateQty(getItemId(item), item.qty + 1)}>+</button>
                  </div>
                </div>
                <button className="mob_cart_del" onClick={() => removeItem(getItemId(item))} aria-label={t('delete')}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}