import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useSettings } from '../context/SettingsContext.jsx'
import { api } from '../services/api'
import MobileHeader from './MobileHeader.jsx'
import MobileBanner from './MobileBanner.jsx'
import MobileFooter from './MobileFooter.jsx'
import MobileFilterPanel from './MobileFilterPanel.jsx'
import MobileProductCard from './MobileProductCard.jsx'
import MobileProductSkeleton from './MobileProductSkeleton.jsx'
import { CATEGORIES } from '../components/kategories.jsx'

const PAGE_SIZE = 24

export default function MobileHome() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useSettings()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [sort, setSort] = useState('popular')
  const [filters, setFilters] = useState({ priceMin: '', priceMax: '', minRating: 0, onSale: false })
  const [apiProducts, setApiProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState(null)
  const [didYouMean, setDidYouMean] = useState(null)
  const pageRef = useRef(1)
  const debounceRef = useRef(null)
  const sentinelRef = useRef(null)
  const loadingRef = useRef(false)

  const buildSortParam = (s) => {
    switch (s) {
      case 'price-asc': return 'price_low'
      case 'price-desc': return 'price_high'
      case 'rating': return 'rating'
      case 'reviews': return 'popular'
      default: return ''
    }
  }

  const normalize = (products) => products.map(p => ({
    ...p,
    id: p._id,
    reviews: Array.isArray(p.reviews) ? p.reviews.length : (p.reviews || 0),
    sellerId: p.sellerId?._id || p.sellerId,
    sellerName: p.sellerId?.name || '',
    image: p.image || (p.images && p.images[0]) || '',
  }))

  const loadProducts = useCallback(async (pageNum, append, query, category, srt) => {
    const params = { page: pageNum, limit: PAGE_SIZE }
    if (category !== 'all') params.category = category
    if (query && query.trim()) params.search = query.trim()
    const sp = buildSortParam(srt)
    if (sp) params.sort = sp
    try {
      const data = await api.products.list(params)
      const normalized = normalize(data.products)
      pageRef.current = pageNum
      setHasMore(pageNum < data.pages)
      setDidYouMean(data.didYouMean || null)
      setApiProducts(prev => append ? [...prev, ...normalized] : normalized)
    } catch (err) {
      console.error('Mobile home load error:', err)
      setError(err.message)
      if (!append) setApiProducts([])
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        setApiProducts([])
        pageRef.current = 1
        const params = { page: 1, limit: PAGE_SIZE }
        if (selectedCategory !== 'all') params.category = selectedCategory
        if (searchQuery && searchQuery.trim()) params.search = searchQuery.trim()
        const sp = buildSortParam(sort)
        if (sp) params.sort = sp
        const data = await api.products.list(params)
        if (cancelled) return
        const normalized = normalize(data.products)
        setHasMore(1 < data.pages)
        setDidYouMean(data.didYouMean || null)
        setApiProducts(normalized)
      } catch (err) {
        if (cancelled) return
        setError(err.message)
        setApiProducts([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 300)
    return () => { cancelled = true; if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [selectedCategory, searchQuery, sort])

  const filteredProducts = useMemo(() => {
    let result = [...apiProducts]
    if (filters.priceMin) result = result.filter(p => p.price >= Number(filters.priceMin))
    if (filters.priceMax) result = result.filter(p => p.price <= Number(filters.priceMax))
    if (filters.minRating > 0) result = result.filter(p => p.rating >= filters.minRating)
    if (filters.onSale) result = result.filter(p => p.oldPrice)
    return result
  }, [apiProducts, filters])

  useEffect(() => {
    loadingRef.current = loading || loadingMore
  }, [loading, loadingMore])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return
      if (loadingRef.current || !hasMore) return
      setLoadingMore(true)
      loadProducts(pageRef.current + 1, true, searchQuery, selectedCategory, sort).finally(() => setLoadingMore(false))
    }, { rootMargin: '400px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore, selectedCategory, searchQuery, sort, loadProducts])

  return (
    <div className="mob">
      <MobileHeader />
      <div className="mob_search">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input placeholder={t('search') || 'Mahsulot izlash...'} value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      <MobileBanner onExplore={setSelectedCategory} />

      {didYouMean && (
        <div className="mob_didyoumean">
          <span style={{ opacity: 0.75, fontSize: 13 }}>
            <strong style={{ opacity: 1 }}>"{searchQuery}"</strong>&nbsp;topilmadi. Demoqchisiz:
          </span>
          <button onClick={() => { setDidYouMean(null); setSearchQuery(didYouMean) }}>"{didYouMean}"</button>
        </div>
      )}

      <div className="mob_cats">
        {CATEGORIES.map(cat => (
          <button key={cat.id}
            className={`mob_cat${selectedCategory === cat.id ? ' mob_cat_active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >{cat.label}</button>
        ))}
      </div>

      <MobileFilterPanel
        filters={filters}
        onFilterChange={setFilters}
        onSortChange={setSort}
        sort={sort}
        productCount={filteredProducts.length}
      />

      {error && (
        <div className="mob_error">{error}</div>
      )}

      {filteredProducts.length === 0 && !loading && !error && (
        <div className="mob_empty">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <div className="mob_empty_title">{t('noProducts') || 'Mahsulot topilmadi'}</div>
          <p style={{ fontSize: 13 }}>{t('tryOtherCategory')}</p>
        </div>
      )}

      {filteredProducts.length > 0 && (
        <div className="mob_grid">
          {filteredProducts.map(p => <MobileProductCard key={p._id || p.id} product={p} />)}
        </div>
      )}

      {loading && apiProducts.length === 0 && (
        <div className="mob_grid">
          {Array.from({ length: 8 }).map((_, i) => <MobileProductSkeleton key={i} />)}
        </div>
      )}

      <div ref={sentinelRef} className="mob_loader">
        {loadingMore ? <div className="mob_spinner" /> : !hasMore && filteredProducts.length > 0 ? `${t('allLoaded')} · ${filteredProducts.length}` : ''}
      </div>

      <MobileFooter />
    </div>
  )
}