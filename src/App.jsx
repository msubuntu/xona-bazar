import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Routes, Route, useSearchParams, useNavigate } from 'react-router-dom'
import './App.css'
import { useSettings } from './context/SettingsContext.jsx'
import { api } from './services/api'
import Header from './components/header'
import Kategories from './components/kategories'
import Banner from './components/Banner'
import FilterPanel from './components/FilterPanel'
import ProductCard from './components/ProductCard'
import ProductSkeleton from './components/ProductSkeleton'
import ProductDetail from './components/ProductDetail'
import CartPage from './components/CartPage'
import UserPage from './components/UserPage'
import SellerProfile from './components/SellerProfile'
import SellerDashboard from './components/SellerDashboard'
import CraftsmanDashboard from './components/CraftsmanDashboard'
import CraftsmenPage from './components/CraftsmenPage'
import CraftsmanDetail from './components/CraftsmanDetail'
import AuthModal from './components/AuthModal'
import ChatPanel from './components/ChatPanel'
import MessagesPage from './components/MessagesPage'
import StoresMapPage from './components/StoresMapPage'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import NotFound from './components/NotFound'
import BottomNav from './components/BottomNav'
import BookingListener from './components/BookingListener'
import useIsMobile from "./mobile/useIsMobile"
import MobileApp from "./mobile/MobileApp"

function HomePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [apiProducts, setApiProducts] = useState([])
  const [apiError, setApiError] = useState(null)
  const [didYouMean, setDidYouMean] = useState(null)
  const { t } = useSettings()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [filters, setFilters] = useState({ priceMin: '', priceMax: '', minRating: 0, onSale: false })
  const [sort, setSort] = useState('popular')
  const debounceRef = useRef(null)
  const PAGE_SIZE = 24
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const pageRef = useRef(1)
  const sentinelRef = useRef(null)

  useEffect(() => {
    const q = searchParams.get('q') || ''
    setSearchQuery(q)
  }, [searchParams])

  const loadProducts = useCallback(async (query, pageNum = 1, append = false) => {
    if (pageNum <= 1) setLoading(true)
    else setLoadingMore(true)
    setApiError(null)
    try {
      const params = { page: pageNum, limit: PAGE_SIZE }
      if (selectedCategory !== 'all') params.category = selectedCategory
      if (query?.trim()) params.search = query.trim()
      if (sort === 'price_asc') params.sort = 'price_low'
      else if (sort === 'price_desc') params.sort = 'price_high'
      else if (sort === 'rating') params.sort = 'rating'
      else if (sort === 'reviews') params.sort = 'popular'

      const data = await api.products.list(params)
      const normalized = data.products.map(p => ({
        ...p,
        id: p._id,
        reviews: Array.isArray(p.reviews) ? p.reviews.length : (p.reviews || 0),
        sellerId: p.sellerId?._id || p.sellerId,
        sellerName: p.sellerId?.name || '',
        image: p.image || (p.images && p.images[0]) || '',
      }))
      pageRef.current = pageNum
      setPage(pageNum)
      setHasMore(pageNum < data.pages)
      setDidYouMean(data.didYouMean || null)
      setApiProducts(prev => append ? [...prev, ...normalized] : normalized)
    } catch (err) {
      console.error('API products load error:', err)
      setApiError(err.message)
      if (!append) setApiProducts([])
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [selectedCategory, sort])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      loadProducts(searchQuery, 1, false)
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchQuery, selectedCategory, sort, loadProducts])

  const filteredProducts = useMemo(() => {
    let result = [...apiProducts]

    if (filters.priceMin) {
      result = result.filter(p => p.price >= Number(filters.priceMin))
    }
    if (filters.priceMax) {
      result = result.filter(p => p.price <= Number(filters.priceMax))
    }
    if (filters.minRating > 0) {
      result = result.filter(p => p.rating >= filters.minRating)
    }
    if (filters.onSale) {
      result = result.filter(p => p.oldPrice)
    }

    return result
  }, [apiProducts, filters])

  const loadingRef = useRef(false)
  useEffect(() => {
    loadingRef.current = loading || loadingMore
  }, [loading, loadingMore])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return
      if (loadingRef.current || !hasMore) return
      loadProducts(searchQuery, pageRef.current + 1, true)
    }, { rootMargin: '400px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, searchQuery, selectedCategory, sort, loadProducts, loading, apiProducts.length])

  return (
    <>
      <Header />
      <Banner
        onExplore={(cat) => {
          setSelectedCategory(cat)
          document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' })
        }}
      />
      <Kategories selected={selectedCategory} onSelect={setSelectedCategory} />
      <FilterPanel
        filters={filters}
        onFilterChange={setFilters}
        onSortChange={setSort}
        sort={sort}
        productCount={filteredProducts.length}
      />
      <section id="products-section" className="py-4">
        <h2 className="mb-4 text-xl font-bold" style={{ color: 'var(--text, #1f2937)' }}>
          {selectedCategory === 'all' ? t('popularProducts') : selectedCategory}
        </h2>
        {didYouMean && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px',
            padding: '10px 14px', borderRadius: '10px', fontSize: '14px',
            background: 'var(--accent-bg, rgba(43,195,43,0.08))', color: 'var(--text, #1f2937)',
            border: '1px solid var(--accent, #2bc32b)',
          }}>
            <span>🔍</span>
            <span>
              <strong>"{searchQuery}"</strong> topilmadi. Demoqchisiz:
            </span>
            <button
              onClick={() => { navigate(`/?q=${encodeURIComponent(didYouMean)}`) }}
              style={{
                border: 'none', background: 'var(--accent, #2bc32b)', color: '#fff',
                padding: '5px 12px', borderRadius: '7px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
              }}
            >
              {didYouMean}
            </button>
          </div>
        )}
        {filteredProducts.length === 0 && !loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted, #9ca3af)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <p style={{ fontSize: '16px', margin: '16px 0 6px' }}>Mahsulot topilmadi</p>
            <p style={{ fontSize: '13px' }}>Boshqa kategoriya yoki qidiruv so'zini sinab ko'ring</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {loading && apiProducts.length === 0
              ? Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)
                : filteredProducts.map((p) => <ProductCard key={p._id || p.id} product={p} />)}
          </div>
        )}
        {filteredProducts.length > 0 && (
          <div ref={sentinelRef} style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted, #9ca3af)', fontSize: '14px' }}>
            {loadingMore
              ? 'Yuklanmoqda...'
              : !hasMore
                ? t('allProductsLoaded') || 'Barcha mahsulotlar yuklandi'
                : ''}
          </div>
        )}
      </section>
      <Footer />
    </>
  )
}

function App() {
  const isMobile = useIsMobile()
  if (isMobile) return <MobileApp />
  return (
    <div className="container">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/seller/:id" element={<SellerProfile />} />
        <Route path="/craftsmen" element={<CraftsmenPage />} />
        <Route path="/craftsman/:id" element={<CraftsmanDetail />} />
        <Route path="/stores-map" element={<StoresMapPage />} />
        <Route path="/user" element={
          <ProtectedRoute><UserPage /></ProtectedRoute>
        } />
        <Route path="/messages" element={
          <ProtectedRoute><MessagesPage /></ProtectedRoute>
        } />
        <Route path="/seller-dashboard" element={
          <ProtectedRoute roles={['seller']}><SellerDashboard /></ProtectedRoute>
        } />
        <Route path="/craftsman-dashboard" element={
          <ProtectedRoute roles={['craftsman']}><CraftsmanDashboard /></ProtectedRoute>
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <AuthModal />
      <ChatPanel />
      <BookingListener />
      <BottomNav />
    </div>
  )
}

export default App
