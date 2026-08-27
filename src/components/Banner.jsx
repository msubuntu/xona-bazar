import { useState, useEffect, useCallback } from 'react'
import '../components_css/banner.css'

const BANNERS = [
  {
    id: 1,
    gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    title: 'Yozgi Tamirlash Aksiyasi',
    subtitle: 'Bo\'yoq va plitkalarga 25% gacha chegirma',
    badge: 'Aksiya -25%',
    cta: 'Sotib olish',
  },
  {
    id: 2,
    gradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
    title: 'Professional Asboblar',
    subtitle: 'Bosch, Makita, DeWalt — rasmiy kafolat bilan',
    badge: 'Yangi',
    cta: 'Ko\'rish',
  },
  {
    id: 3,
    gradient: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
    title: 'Ustalarni Toping',
    subtitle: 'Plumber, elektrik, usta — 500+ mutaxassis',
    badge: 'Xizmat',
    cta: 'Ustalar',
  },
]

function Banner() {
  const [current, setCurrent] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const next = useCallback(() => {
    setCurrent(p => (p + 1) % BANNERS.length)
  }, [])

  const prev = useCallback(() => {
    setCurrent(p => (p - 1 + BANNERS.length) % BANNERS.length)
  }, [])

  useEffect(() => {
    if (isPaused) return
    const t = setInterval(next, 4500)
    return () => clearInterval(t)
  }, [next, isPaused])

  const b = BANNERS[current]

  return (
    <div
      className="banner"
      style={{ background: b.gradient }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="banner_content">
        <span className="banner_badge">{b.badge}</span>
        <h2 className="banner_title">{b.title}</h2>
        <p className="banner_subtitle">{b.subtitle}</p>
        <button className="banner_cta">{b.cta}</button>
      </div>

      <div className="banner_dots">
        {BANNERS.map((_, i) => (
          <button
            key={i}
            className={`banner_dot ${i === current ? 'active' : ''}`}
            onClick={() => setCurrent(i)}
          />
        ))}
      </div>

      <button className="banner_nav banner_prev" onClick={prev}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <button className="banner_nav banner_next" onClick={next}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
  )
}

export default Banner
