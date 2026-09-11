import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettings } from '../context/SettingsContext.jsx'

const BANNERS = [
  {
    id: 1,
    gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    titleKey: 'banner1Title',
    subtitleKey: 'banner1Subtitle',
    badgeKey: 'banner1Badge',
    ctaKey: 'banner1Cta',
    category: 'paints',
    to: null,
  },
  {
    id: 2,
    gradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
    titleKey: 'banner2Title',
    subtitleKey: 'banner2Subtitle',
    badgeKey: 'banner2Badge',
    ctaKey: 'banner2Cta',
    category: 'tools',
    to: null,
  },
  {
    id: 3,
    gradient: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
    titleKey: 'banner3Title',
    subtitleKey: 'banner3Subtitle',
    badgeKey: 'banner3Badge',
    ctaKey: 'banner3Cta',
    category: null,
    to: '/craftsmen',
  },
]

export default function MobileBanner({ onExplore }) {
  const { t } = useSettings()
  const [current, setCurrent] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const navigate = useNavigate()
  const touchX = useRef(null)

  const next = useCallback(() => setCurrent(p => (p + 1) % BANNERS.length), [])
  const prev = useCallback(() => setCurrent(p => (p - 1 + BANNERS.length) % BANNERS.length), [])

  useEffect(() => {
    if (isPaused) return
    const t = setInterval(next, 4500)
    return () => clearInterval(t)
  }, [next, isPaused])

  const b = BANNERS[current]

  return (
    <div
      className="mob_banner"
      style={{ background: b.gradient }}
      onTouchStart={e => { touchX.current = e.touches[0].clientX; setIsPaused(true) }}
      onTouchEnd={e => {
        if (touchX.current == null) return
        const dx = e.changedTouches[0].clientX - touchX.current
        if (Math.abs(dx) > 40) { if (dx < 0) next(); else prev(); }
        touchX.current = null
        setIsPaused(false)
      }}
    >
      <div className="mob_banner_content">
        <span className="mob_banner_badge">{t(b.badgeKey)}</span>
        <h2 className="mob_banner_title">{t(b.titleKey)}</h2>
        <p className="mob_banner_subtitle">{t(b.subtitleKey)}</p>
        <button
          className="mob_banner_cta"
          onClick={() => {
            if (b.category) onExplore?.(b.category)
            else if (b.to) navigate(b.to)
          }}
        >
          {t(b.ctaKey)}
        </button>
      </div>
      <div className="mob_banner_dots">
        {BANNERS.map((_, i) => (
          <button
            key={i}
            className={`mob_banner_dot${i === current ? ' active' : ''}`}
            onClick={() => setCurrent(i)}
            aria-label={`Banner ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}