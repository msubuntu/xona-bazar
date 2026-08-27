import { useCart } from '../context/CartContext.jsx'
import '../components_css/cart.css'

function CartPanel() {
  const { items, open, setOpen, removeItem, updateQty, totalItems, totalPrice } = useCart()

  if (!open) return null

  return (
    <div className="cart_overlay" onClick={() => setOpen(false)}>
      <div className="cart_panel" onClick={(e) => e.stopPropagation()}>
        <div className="cart_header">
          <div className="cart_header_left">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/>
              <circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <h2>Savat</h2>
            {totalItems > 0 && <span className="cart_count">{totalItems} ta mahsulot</span>}
          </div>
          <button className="cart_close" onClick={() => setOpen(false)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="cart_empty">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/>
              <circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <p>Savatingiz bo'sh</p>
            <span>Mahsulotlarni savatga qo'shing</span>
          </div>
        ) : (
          <>
            <div className="cart_items">
              {items.map(item => {
                const id = item.cartKey || item._id || item.id
                return (
                <div className="cart_item" key={id}>
                  <img src={item.image || '/placeholder.png'} alt={item.name} className="cart_item_img" />
                  <div className="cart_item_info">
                    <span className="cart_item_brand">{item.brand}</span>
                    <h4 className="cart_item_name">{item.name}</h4>
                    {item.variant && (
                      <span className="cart_item_variant">
                        {[item.variant.color, item.variant.size].filter(Boolean).join(' / ')}
                      </span>
                    )}
                    <span className="cart_item_price">{item.price.toLocaleString()} so'm</span>
                    <div className="cart_item_actions">
                      <div className="qty_control">
                        <button onClick={() => updateQty(id, item.qty - 1)}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        </button>
                        <span>{item.qty}</span>
                        <button onClick={() => updateQty(id, item.qty + 1)}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        </button>
                      </div>
                      <button className="cart_item_remove" onClick={() => removeItem(id)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                )
              })}
            </div>

            <div className="cart_footer">
              <div className="cart_summary">
                <div className="cart_summary_row">
                  <span>Mahsulotlar ({totalItems})</span>
                  <span>{totalPrice.toLocaleString()} so'm</span>
                </div>
                <div className="cart_summary_row">
                  <span>Yetkazish</span>
                  <span className="free_delivery">Bepul</span>
                </div>
                <div className="cart_summary_total">
                  <span>Jami</span>
                  <span>{totalPrice.toLocaleString()} so'm</span>
                </div>
              </div>
              <button className="cart_checkout">
                Buyurtma berish
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default CartPanel
