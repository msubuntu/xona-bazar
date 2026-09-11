import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSeller } from '../context/SellerContext.jsx'
import { api } from '../services/api'
import MobileHeader from './MobileHeader.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { SERVICE_TYPES, DISTRICTS } from '../data/craftsmen.js'
import { normalizeCraftsman } from '../utils/craftsman'
import { REVIEWS_ENABLED } from '../data/flags'

export default function MobileCraftsmen() {
  const { openCraftsman } = useSeller()
  const { t } = useSettings()
  const [searchParams] = useSearchParams()
  const [serviceFilter, setServiceFilter] = useState('all')
  const [districtFilter, setDistrictFilter] = useState('all')
  const [filterOpen, setFilterOpen] = useState(null)
  const [districtQuery, setDistrictQuery] = useState('')
  const filterRef = useRef(null)
  const [localSearch, setLocalSearch] = useState(searchParams.get('q') || '')
  const debounceRef = useRef(null)
  const [debouncedSearch, setDebouncedSearch] = useState(localSearch)
  const [sort, setSort] = useState(REVIEWS_ENABLED ? 'rating' : 'experience')
  const [cr, setCr] = useState([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState(null)

  useEffect(() => { setLocalSearch(searchParams.get('q') || '') }, [searchParams])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(localSearch), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [localSearch])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.sellers.list({ role: 'craftsman' })
      .then(data => { if (!cancelled) { setCr((data.sellers || []).map(normalizeCraftsman)); setApiError(null) } })
      .catch(err => { if (!cancelled) { setApiError(err.message || 'Xatolik yuz berdi'); setCr([]) } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const availableDistricts = useMemo(() => [...new Set(cr.map(c => c.district).filter(Boolean))], [cr])

  const serviceCounts = useMemo(() => {
    const m = {}
    cr.forEach(c => (c.services || []).forEach(sid => { m[sid] = (m[sid] || 0) + 1 }))
    return m
  }, [cr])

  const districtCounts = useMemo(() => {
    const m = {}
    cr.forEach(c => { if (c.district) m[c.district] = (m[c.district] || 0) + 1 })
    return m
  }, [cr])

  const districtOptions = useMemo(() => [...new Set([...DISTRICTS, ...availableDistricts])], [availableDistricts])
  const tashkentDistricts = districtOptions.filter(d => d.startsWith('Toshkent, '))
  const regionDistricts = districtOptions.filter(d => !d.startsWith('Toshkent, '))

  const districtMatch = (d) => {
    const q = districtQuery.trim().toLowerCase()
    if (!q) return true
    return d.toLowerCase().includes(q) || d.replace('Toshkent, ', '').toLowerCase().includes(q)
  }
  const filteredDistricts = districtOptions.filter(districtMatch)
  const queryDistricts = districtQuery.trim() ? filteredDistricts : []

  const toggleFilter = (key) => setFilterOpen(prev => (prev === key ? null : key))
  const selectService = (id) => { setServiceFilter(id); setFilterOpen(null) }
  const selectDistrict = (d) => { setDistrictFilter(d); setDistrictQuery(''); setFilterOpen(null) }

  useEffect(() => {
    const onDown = (e) => { if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(null) }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [])

  const checkSvg = (show) => show && (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mob-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
  )

  const districtItem = (d) => (
    <button key={d} className={`mob_drop_item${districtFilter === d ? ' mob_drop_item_active' : ''}`} onClick={() => selectDistrict(d)}>
      <span className="mob_drop_emoji">{d.startsWith('Toshkent, ') ? '🏙️' : '📍'}</span>
      <span className="mob_drop_name">{d.replace('Toshkent, ', '')}</span>
      <span className="mob_drop_count">{districtCounts[d] || 0}</span>
      {checkSvg(districtFilter === d)}
    </button>
  )

  const filtered = useMemo(() => {
    let result = [...cr]
    if (serviceFilter !== 'all') result = result.filter(c => c.services.includes(serviceFilter))
    if (districtFilter !== 'all') result = result.filter(c => c.district === districtFilter)
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase()
      result = result.filter(c => (c.name || '').toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q))
    }
    const s = { rating: (a,b) => (b.rating||0)-(a.rating||0), reviews: (a,b) => (b.reviewCount||0)-(a.reviewCount||0), experience: (a,b) => parseInt(b.experience)-parseInt(a.experience), jobs: (a,b) => (b.completedJobs||0)-(a.completedJobs||0) }
    if (s[sort]) result.sort(s[sort])
    return result
  }, [cr, serviceFilter, districtFilter, debouncedSearch, sort])

  const [searchOpen, setSearchOpen] = useState(false)

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

  // Qidiruv oynasi uchun natijalar: nom, tavsif, tuman va xizmat nomi bo'yicha
  const searchResults = useMemo(() => {
    const q = localSearch.trim().toLowerCase()
    if (!q) return cr
    return cr.filter(c => matchCraftsman(c, q))
  }, [cr, localSearch])

  const selectFromSearch = (c) => { openCraftsman(c); setSearchOpen(false) }

  // ESC bilan yopish
  useEffect(() => {
    if (!searchOpen) return
    const onKey = (e) => { if (e.key === 'Escape') setSearchOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [searchOpen])

  return (
    <>
    <div className="mob">
      <MobileHeader />
      <div className="mob_search">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input readOnly placeholder={t('searchCraftsmen')} value={localSearch} onClick={() => setSearchOpen(true)} onFocus={() => setSearchOpen(true)} />
      </div>

      <div className="mob_filter_wrap" ref={filterRef}>
        <div className="mob_filters">
          <button
            className={`mob_filter_btn${serviceFilter !== 'all' ? ' mob_filter_btn_active' : ''}`}
            onClick={() => toggleFilter('service')}
          >
            <span className="mob_filter_label">{t("filterService")}</span>
            <span className="mob_filter_value">
              {serviceFilter === 'all'
                ? t("allLabel")
                : `${SERVICE_TYPES.find(s => s.id === serviceFilter)?.icon || ''} ${SERVICE_TYPES.find(s => s.id === serviceFilter)?.label || serviceFilter}`}
            </span>
            <svg className={`mob_filter_chev${filterOpen === 'service' ? ' mob_filter_chev_open' : ''}`} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          <button
            className={`mob_filter_btn${districtFilter !== 'all' ? ' mob_filter_btn_active' : ''}`}
            onClick={() => toggleFilter('district')}
          >
            <span className="mob_filter_label">{t("district")}</span>
            <span className="mob_filter_value">{districtFilter === 'all' ? t('allDistricts') : districtFilter.replace('Toshkent, ', '')}</span>
            <svg className={`mob_filter_chev${filterOpen === 'district' ? ' mob_filter_chev_open' : ''}`} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
        </div>

        {filterOpen === 'service' && (
          <div className="mob_drop">
            <div className="mob_drop_header">
              <span>{t('selectBookingService')}</span>
              <span className="mob_drop_header_hint">{cr.length} {t('craftsmenLabel')}</span>
            </div>
            <div className="mob_drop_scroll">
              <button className={`mob_drop_item${serviceFilter === 'all' ? ' mob_drop_item_active' : ''}`} onClick={() => selectService('all')}>
                <span className="mob_drop_emoji">✨</span>
                <span className="mob_drop_name">{t('allLabel')}</span>
                <span className="mob_drop_count">{cr.length}</span>
                {checkSvg(serviceFilter === 'all')}
              </button>
              {SERVICE_TYPES.map(s => (
                <button key={s.id} className={`mob_drop_item${serviceFilter === s.id ? ' mob_drop_item_active' : ''}`} onClick={() => selectService(s.id)}>
                  <span className="mob_drop_emoji">{s.icon}</span>
                  <span className="mob_drop_name">{s.label}</span>
                  <span className="mob_drop_count">{serviceCounts[s.id] || 0}</span>
                  {checkSvg(serviceFilter === s.id)}
                </button>
              ))}
            </div>
          </div>
        )}

        {filterOpen === 'district' && (
          <div className="mob_drop">
            <div className="mob_drop_header">
              <span>{t('locationLabel')}</span>
              <span className="mob_drop_header_hint">{districtOptions.length} {t('placesLabel')}</span>
            </div>
            <div className="mob_drop_search">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--mob-muted)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input placeholder={t('searchDistrict')} value={districtQuery} onChange={e => setDistrictQuery(e.target.value)} />
            </div>
            <div className="mob_drop_scroll">
              <button className={`mob_drop_item${districtFilter === 'all' ? ' mob_drop_item_active' : ''}`} onClick={() => selectDistrict('all')}>
                <span className="mob_drop_emoji">🗺️</span>
                <span className="mob_drop_name">{t('allDistricts')}</span>
                <span className="mob_drop_count">{cr.length}</span>
                {checkSvg(districtFilter === 'all')}
              </button>
              {districtQuery.trim() ? (
                queryDistricts.length === 0 ? (
                  <div className="mob_drop_empty">{t('districtNotFound')}</div>
                ) : queryDistricts.map(districtItem)
              ) : (
                <>
                  <div className="mob_drop_header2">{t('districtHeaderCity')}</div>
                  {tashkentDistricts.map(districtItem)}
                  <div className="mob_drop_header2">{t('districtHeaderRegions')}</div>
                  {regionDistricts.map(districtItem)}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '2px 16px 8px', fontSize: 12, color: 'var(--mob-muted)' }}>
        {loading ? '...' : `${filtered.length} ${t('craftsmenLabel')}`}
      </div>

      <div className="mob_sec_tabs">
        {[...(REVIEWS_ENABLED ? [['rating', t('sortTabRating')], ['reviews', t('sortTabReviews')]] : []), ['experience', t('experience')], ['jobs', t('sortTabJobs')]].map(([val,label]) => (
          <button key={val} className={`mob_sec_tab${sort === val ? ' mob_sec_tab_active' : ''}`} onClick={() => setSort(val)}>{label}</button>
        ))}
      </div>

      {loading ? <div className="mob_loader"><div className="mob_spinner" /></div> :
        apiError ? (
          <div className="mob_empty">
            <div className="mob_empty_title">{t('errorOccurred')}</div>
            <p style={{ fontSize: 13 }}>{apiError}</p>
          </div>
        ) :
        filtered.length === 0 ? (
          <div className="mob_empty">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <div className="mob_empty_title">{t('noCraftsmen')}</div>
          </div>
        ) : (
          <div className="mob_list">
            {filtered.map(c => (
              <div className="mob_person" key={c.id} onClick={() => openCraftsman(c)}>
                <div className="mob_avatar" style={{ background: c.color }}>
                  {c.avatar?.startsWith('/') ? <img src={c.avatar} alt="" /> : c.avatar}
                </div>
                <div className="mob_person_info">
                  <div className="mob_person_name">
                    {c.name}
                    {c.verified && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#34d97b" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    )}
                  </div>
                  <div className="mob_person_meta">
                    {REVIEWS_ENABLED && <span style={{ color: 'var(--mob-amber)' }}>★ {c.rating || 0}</span>}
                    {REVIEWS_ENABLED && <span>({c.reviewCount || 0})</span>}
                    <span>{Array.isArray(c.services) && c.services.length > 0 ? SERVICE_TYPES.find(s => s.id === c.services[0])?.label || c.services[0] : ''}</span>
                    <span>{c.experience !== '—' ? `${c.experience} ${t('yearsShort')}` : ''}</span>
                    <span>{c.district}</span>
                  </div>
                  <div className="mob_person_meta">
                    {c.priceRange && <span className="mob_chip mob_chip_green">{c.priceRange}</span>}
                    <span className={`mob_chip ${c.available ? 'mob_chip_green' : 'mob_chip_red'}`}>{c.available ? t('availMay') : t('busy')}</span>
                  </div>
                </div>
                <div className="mob_chevron"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg></div>
              </div>
            ))}
          </div>
        )}

      {/* ═══ To'liq ekranli QIDIRUV OYNASI (ustalar) ═══ */}
      {searchOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'var(--mob-bg1)', display: 'flex', flexDirection: 'column' }}>
          {/* Yuqori panel: orqaga + qidiruv maydoni */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px 10px', borderBottom: '1px solid var(--mob-border)' }}>
            <button
              style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0 }}
              onClick={() => setSearchOpen(false)}
              aria-label="Orqaga"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <div className="mob_search" style={{ flex: 1, margin: 0, height: 44, background: 'var(--mob-bg2)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mob-muted)" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                autoFocus
                placeholder={t('searchCraftsmen')}
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
              {localSearch && (
                <button onClick={() => setLocalSearch('')} aria-label="Tozalash" style={{ background: 'none', padding: 4, display: 'flex', alignItems: 'center', color: 'var(--mob-muted)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              )}
            </div>
          </div>

          {/* Natijalar ro'yxati */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0 90px' }}>
            {loading ? (
              <div className="mob_loader"><div className="mob_spinner" />{t('loading')}...</div>
            ) : searchResults.length === 0 ? (
              <div className="mob_empty">
                <div className="mob_empty_title">{t('nothingFound')}</div>
                <div style={{ fontSize: 13, color: 'var(--mob-text-2)' }}>&laquo;{localSearch}&raquo; {t('craftsmanNotFound')}</div>
              </div>
            ) : (
              <>
                <div style={{ padding: '6px 16px', fontSize: 12, fontWeight: 700, color: 'var(--mob-text-2)' }}>
                  {searchResults.length} {t('resultsFound')}
                </div>
                {searchResults.map(c => (
                  <div
                    key={c.id}
                    onClick={() => selectFromSearch(c)}
                    className="mob_row"
                    style={{ padding: '12px 16px', margin: 0, borderBottom: '1px solid var(--mob-border)', cursor: 'pointer' }}
                  >
                    <div className="mob_row_icon" style={{ background: c.color, color: '#fff', overflow: 'hidden' }}>
                      {c.avatar?.startsWith('/') ? <img src={c.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : c.avatar}
                    </div>
                    <div className="mob_row_body">
                      <div className="mob_row_title" style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {c.name}
                        {c.verified && (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d97b" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                        )}
                      </div>
                      <div className="mob_row_sub" style={{ display: 'flex', gap: 10, marginTop: 3 }}>
                        {REVIEWS_ENABLED && <span style={{ color: 'var(--mob-amber)' }}>&#9733; {c.rating || 0}</span>}
                        {REVIEWS_ENABLED && <span>({c.reviewCount || 0})</span>}
                        <span>{Array.isArray(c.services) && c.services.length > 0 ? SERVICE_TYPES.find(s => s.id === c.services[0])?.label || c.services[0] : ''}</span>
                        <span>{c.district}</span>
                      </div>
                    </div>
                    <div className="mob_chevron">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  )
}