import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSettings } from '../context/SettingsContext.jsx'
import { useSeller } from '../context/SellerContext.jsx'
import { api } from '../services/api'
import Header from './header'
import Footer from './Footer'
import { SERVICE_TYPES, DISTRICTS } from '../data/craftsmen'
import { REVIEWS_ENABLED } from '../data/flags'
import { normalizeCraftsman } from '../utils/craftsman'
import '../components_css/craftsmen.css'

function CraftsmenPage() {
  const { t } = useSettings()
  const { openCraftsman } = useSeller()
  const [searchParams] = useSearchParams()
  const [serviceFilter, setServiceFilter] = useState('all')
  const [districtFilter, setDistrictFilter] = useState('all')
  const [localSearch, setLocalSearch] = useState(searchParams.get('q') || '')
  const [sort, setSort] = useState(REVIEWS_ENABLED ? 'rating' : 'experience')
  const [apiCraftsmen, setApiCraftsmen] = useState([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState(null)

  useEffect(() => {
    setLocalSearch(searchParams.get('q') || '')
  }, [searchParams])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.sellers.list({ role: 'craftsman' })
      .then(data => {
        if (cancelled) return
        const normalized = (data.sellers || []).map(normalizeCraftsman)
        setApiCraftsmen(normalized)
        setApiError(null)
      })
      .catch(err => {
        if (cancelled) return
        setApiError(err.message)
        setApiCraftsmen([])
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const allCraftsmen = apiCraftsmen

  const matchCraftsman = (c, q) => {
    const services = (c.services || []).map(sId => {
      const st = SERVICE_TYPES.find(s => s.id === sId)
      return (st ? st.label : sId).toLowerCase()
    }).join(' ')
    return (c.name || '').toLowerCase().includes(q)
      || (c.description || '').toLowerCase().includes(q)
      || (c.district || '').toLowerCase().includes(q)
      || services.includes(q)
  }

  const filtered = useMemo(() => {
    let result = [...allCraftsmen]

    if (serviceFilter !== 'all') {
      result = result.filter(c => c.services.includes(serviceFilter))
    }

    if (districtFilter !== 'all') {
      result = result.filter(c => c.district === districtFilter)
    }

    const q = localSearch.trim().toLowerCase()
    if (q) {
      result = result.filter(c => matchCraftsman(c, q))
    }

    switch (sort) {
      case 'rating': result.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break
      case 'reviews': result.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0)); break
      case 'experience': result.sort((a, b) => parseInt(b.experience) - parseInt(a.experience)); break
      case 'jobs': result.sort((a, b) => (b.completedJobs || 0) - (a.completedJobs || 0)); break
      default: break
    }

    return result
  }, [allCraftsmen, serviceFilter, districtFilter, localSearch, sort])

  const [searchOpen, setSearchOpen] = useState(false)

  // Qidiruv oynasi uchun natijalar: nom, tavsif, tuman va xizmat nomi bo'yicha
  const searchResults = useMemo(() => {
    const q = localSearch.trim().toLowerCase()
    if (!q) return allCraftsmen
    return allCraftsmen.filter(c => matchCraftsman(c, q))
  }, [allCraftsmen, localSearch])

  const selectFromSearch = (c) => { openCraftsman(c); setSearchOpen(false) }

  // ESC bilan yopish
  useEffect(() => {
    if (!searchOpen) return
    const onKey = (e) => { if (e.key === 'Escape') setSearchOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [searchOpen])

  return (
    <div className="craftsmen-page">
      <Header />
      <div className="container">
        <div className="cp_hero">
          <h1>{t('craftsmen')}</h1>
          <p>{t('craftsmenDesc')}</p>
        </div>

        <div className="cp_filters">
          <div className="cp_search_row">
            <div className="cp_local_search">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" readOnly placeholder="Usta qidirish..." value={localSearch} onClick={() => setSearchOpen(true)} onFocus={() => setSearchOpen(true)} />
              {localSearch && (
                <button className="cp_search_clear" onClick={() => setLocalSearch('')}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </div>
          </div>
          <div className="cp_filter_row">
            <div className="cp_filter_group">
              <label>{t('serviceType')}</label>
              <div className="cp_filter_chips">
                <button
                  className={`cp_chip ${serviceFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setServiceFilter('all')}
                >
                  {t('allServices')}
                </button>
                {SERVICE_TYPES.map(s => (
                  <button
                    key={s.id}
                    className={`cp_chip ${serviceFilter === s.id ? 'active' : ''}`}
                    onClick={() => setServiceFilter(s.id)}
                  >
                    <span>{s.icon}</span> {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="cp_filter_row_secondary">
              <div className="cp_filter_field">
                <label>{t('district')}</label>
                <select value={districtFilter} onChange={e => setDistrictFilter(e.target.value)}>
                  <option value="all">{t('allDistricts')}</option>
                  {DISTRICTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="cp_filter_field">
                <label>{t('sortBy')}</label>
                <select value={sort} onChange={e => setSort(e.target.value)}>
                  <option value="experience">{t('sortExperience')}</option>
                  <option value="jobs">{t('sortJobs')}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="cp_result_count">
            {loading ? '...' : `${filtered.length} ${t('craftsmenFound')}`}
          </div>
        </div>

        {loading ? (
          <div className="cp_empty">
            <p>Yuklanmoqda...</p>
          </div>
        ) : apiError ? (
          <div className="cp_empty">
            <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <p>{apiError}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="cp_empty">
            <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <p>{t('noCraftsmen')}</p>
          </div>
        ) : (
          <div className="cp_grid">
            {filtered.map(c => (
              <div className="cp_card" key={c._id || c.id} onClick={() => openCraftsman(c)}>
                <div className="cp_card_header">
                  <div className="cp_card_avatar" style={{ background: c.color }}>
                    {c.avatar}
                  </div>
                  <div className="cp_card_badges">
                    {c.verified && (
                      <span className="cp_verified">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                        {t('verified')}
                      </span>
                    )}
                    <span className={`cp_availability ${c.available ? 'available' : 'busy'}`}>
                      {c.available ? t('available') : t('busy')}
                    </span>
                  </div>
                </div>

                <div className="cp_card_body">
                  <h3>{c.name}</h3>
                  <div className="cp_card_services">
                    {c.services.map(sId => {
                      const st = SERVICE_TYPES.find(s => s.id === sId)
                      return st ? <span key={sId} className="cp_service_tag">{st.icon} {st.label}</span> : null
                    })}
                  </div>

                  <div className="cp_card_meta">
                    {REVIEWS_ENABLED && (
                    <span className="cp_card_rating">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" className="fill-amber-400 stroke-amber-400" strokeWidth="1">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      {c.rating}
                    </span>
                    )}
                    {REVIEWS_ENABLED && <span>({c.reviewCount})</span>}
                    <span>•</span>
                    <span>{c.experience}</span>
                  </div>

                  <p className="cp_card_desc">{c.description}</p>

                  <div className="cp_card_footer">
                    <div className="cp_card_location">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                      {c.district}
                    </div>
                    <div className="cp_card_price">{c.priceRange}</div>
                  </div>

                  <div className="cp_card_stats">
                    <span>{c.completedJobs} {t('completedJobs')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />

      {/* ═══ QIDIRUV OYNASI (ustalar) — desktop ═══ */}
      {searchOpen && (
        <div className="cp_search_overlay" onClick={() => setSearchOpen(false)}>
          <div className="cp_search_modal" onClick={e => e.stopPropagation()}>
            {/* Qidiruv maydoni */}
            <div className="cp_search_bar">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input
                autoFocus
                type="text"
                placeholder="Usta qidirish..."
                value={localSearch}
                onChange={e => setLocalSearch(e.target.value)}
                className="cp_search_input"
              />
              {localSearch && (
                <button onClick={() => setLocalSearch('')} aria-label="Tozalash" className="cp_ov_clear">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              )}
              <button onClick={() => setSearchOpen(false)} aria-label="Yopish" className="cp_ov_close">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            {/* Natijalar ro'yxati */}
            <div className="cp_search_list">
              {loading ? (
                <div className="cp_search_hint">Yuklanmoqda...</div>
              ) : searchResults.length === 0 ? (
                <div className="cp_search_hint">
                  <strong>Hech narsa topilmadi</strong>
                  <div>&laquo;{localSearch}&raquo; bo'yicha usta topilmadi</div>
                </div>
              ) : (
                <>
                  <div className="cp_search_count">{searchResults.length} ta natija</div>
                  {searchResults.map(c => (
                    <div
                      key={c._id || c.id}
                      onClick={() => selectFromSearch(c)}
                      className="cp_search_item"
                    >
                      <div className="cp_search_avatar" style={{ background: c.color }}>
                        {c.avatar?.startsWith('/') ? <img src={c.avatar} alt="" /> : c.avatar}
                      </div>
                      <div className="cp_search_info">
                        <div className="cp_search_name">
                          {c.name}
                          {c.verified && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                          )}
                        </div>
                        <div className="cp_search_meta">
                          {REVIEWS_ENABLED && <span className="cp_search_rating">&#9733; {c.rating || 0}</span>}
                          {REVIEWS_ENABLED && <span>({c.reviewCount || 0})</span>}
                          <span>{Array.isArray(c.services) && c.services.length > 0 ? SERVICE_TYPES.find(s => s.id === c.services[0])?.label || c.services[0] : ''}</span>
                          <span>{c.district}</span>
                        </div>
                      </div>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="cp_search_caret"><polyline points="9 18 15 12 9 6" /></svg>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CraftsmenPage
