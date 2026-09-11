import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettings } from '../context/SettingsContext.jsx'

export default function MobileFooter() {
  const { t } = useSettings()
  const navigate = useNavigate()

  const shop = ['Bo\'yoqlar', 'Plitka', 'Asboblar', 'Sanitariya', 'Qurilish']
  const info = [
    { label: t('aboutUs') || 'Biz haqimizda', to: '/' },
    { label: t('helpCenter') || 'Yordam markazi', to: '/' },
    { label: t('craftsmen') || 'Ustalar', to: '/craftsmen' },
    { label: t('returnPolicy') || 'Qaytarish shartlari', to: '/' },
    { label: t('faq') || 'Savol-javob', to: '/' },
  ]

  return (
    <footer className="mobf">
      <div className="mobf_grid">
        <div className="mobf_col">
          <div className="mobf_col_title">Do'kon</div>
          {shop.map((s, i) => <span key={i} className="mobf_link" onClick={() => navigate(`/?q=${encodeURIComponent(s)}`)}>{s}</span>)}
        </div>
        <div className="mobf_col">
          <div className="mobf_col_title">Ma'lumot</div>
          {info.map((l, i) => <span key={i} className="mobf_link" onClick={() => navigate(l.to)}>{l.label}</span>)}
        </div>
      </div>

      <div className="mobf_contact">
        <a className="mobf_contact_row" href="tel:+998901234567">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          +998 90 123 45 67
        </a>
        <a className="mobf_contact_row" href="mailto:info@xonabazar.uz">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>
          info@xonabazar.uz
        </a>
      </div>

      <div className="mobf_apps">
        <a className="mobf_badge" href="#"><span className="mobf_badge_top">Tez orada</span> App Store</a>
        <a className="mobf_badge" href="#"><span className="mobf_badge_top">Tez orada</span> Google Play</a>
      </div>

      <div className="mobf_pay">
        <span className="mobf_pay_c">VISA</span>
        <span className="mobf_pay_c">MasterCard</span>
        <span className="mobf_pay_c">Payme</span>
        <span className="mobf_pay_c">Click</span>
      </div>

      <div className="mobf_copy">© 2026 Xona Bazar. Barcha huquqlar himoyalangan</div>
    </footer>
  )
}