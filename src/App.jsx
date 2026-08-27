import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Routes, Route, useSearchParams } from 'react-router-dom'
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
import productsData from './data/products'

function HomePage() {
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [apiProducts, setApiProducts] = useState([])
  const [apiError, setApiError] = useState(null)
  const { t } = useSettings()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [filters, setFilters] = useState({ priceMin: '', priceMax: '', minRating: 0, onSale: false })
  const [sort, setSort] = useState('popular')
  const debounceRef = useRef(null)

  useEffect(() => {
    const q = searchParams.get('q') || ''
    setSearchQuery(q)
  }, [searchParams])

  const loadProducts = useCallback(async (query) => {
    setLoading(true)
    setApiError(null)
    try {
      const params = {}
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
      setApiProducts(normalized)
    } catch (err) {
      console.error('API products load error:', err)
      setApiError(err.message)
      setApiProducts(productsData)
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, sort])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      loadProducts(searchQuery)
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

  return (
    <>
      <Header />
      <Banner />
      <Kategories selected={selectedCategory} onSelect={setSelectedCategory} />
      <FilterPanel
        filters={filters}
        onFilterChange={setFilters}
        onSortChange={setSort}
        sort={sort}
        productCount={filteredProducts.length}
      />
      <section className="py-4">
        <h2 className="mb-4 text-xl font-bold" style={{ color: 'var(--text, #1f2937)' }}>
          {selectedCategory === 'all' ? t('popularProducts') : selectedCategory}
        </h2>
        {filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted, #9ca3af)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <p style={{ fontSize: '16px', margin: '16px 0 6px' }}>Mahsulot topilmadi</p>
            <p style={{ fontSize: '13px' }}>Boshqa kategoriya yoki qidiruv so'zini sinab ko'ring</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)
                : filteredProducts.map((p) => <ProductCard key={p._id || p.id} product={p} />)}
          </div>
        )}
      </section>
      <Footer />
    </>
  )
}

function App() {
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
        <Route path="/seller-dashboard" element={<SellerDashboard />} />
        <Route path="/craftsman-dashboard" element={<CraftsmanDashboard />} />
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
