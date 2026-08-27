import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useMessages } from '../context/MessagesContext.jsx'
import { api } from '../services/api'
import Header from './header'
import Footer from './Footer'
import LocationPicker from './LocationPicker'
import '../components_css/seller-dashboard-v2.css'

const CATEGORIES = [
  { value: 'paints', label: "Bo'yoqlar" },
  { value: 'tiles', label: "G'isht va Plitka" },
  { value: 'plumbing', label: 'Sanitariya' },
  { value: 'electrical', label: 'Elektr' },
  { value: 'tools', label: 'Asboblar' },
  { value: 'building', label: 'Qurilish' },
  { value: 'furniture', label: 'Mebel' },
  { value: 'doors', label: 'Eshik va Deraza' },
]

const SECTIONS = [
  { id: 'overview', label: "Umumiy ko'rish", icon: '\u{1F4CA}' },
  { id: 'products', label: 'Mahsulotlarim', icon: '\u{1F4E6}' },
  { id: 'orders', label: 'Buyurtmalar', icon: '\u{1F6D2}' },
  { id: 'reviews', label: 'Sharhlar', icon: '\u{2B50}' },
  { id: 'settings', label: 'Sozlamalar', icon: '\u{2699}\u{FE0F}' },
]

const INITIAL_FORM = { name: '', brand: '', category: 'paints', description: '', price: '', oldPrice: '', stock: '' }
const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const MAX_VIDEO_SIZE = 100 * 1024 * 1024
const MIN_IMAGES = 4
const MAX_IMAGES = 6
const MAX_VIDEOS = 1

function SellerDashboard() {
  const { user, updateProfile } = useAuth()
  const { t, convertPrice } = useSettings()
  const navigate = useNavigate()
  const { conversations, sendMessage, openConversation, activeConversation, closeConversation } = useMessages()
  const fileInputRef = useRef(null)
  const videoInputRef = useRef(null)

  const [activeSection, setActiveSection] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  const [myProducts, setMyProducts] = useState([])
  const [stats, setStats] = useState({ totalProducts: 0, totalOrders: 0, pendingOrders: 0, totalRevenue: 0, averageRating: 0 })
  const [recentProducts, setRecentProducts] = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState(null)
  const [orderStatusFilter, setOrderStatusFilter] = useState('')
  const [updatingOrderId, setUpdatingOrderId] = useState(null)

  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewsError, setReviewsError] = useState(null)
  const [reviewRatingFilter, setReviewRatingFilter] = useState(0)

  const [showAddForm, setShowAddForm] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const [form, setForm] = useState(INITIAL_FORM)
  const [formStep, setFormStep] = useState(1)
  const [formErrors, setFormErrors] = useState({})
  const [imageFiles, setImageFiles] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [videoFile, setVideoFile] = useState(null)
  const [videoPreview, setVideoPreview] = useState('')
  const [editVideoUrl, setEditVideoUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState(null)
  const [hasVariants, setHasVariants] = useState(false)
  const [variants, setVariants] = useState([])

  const [profileForm, setProfileForm] = useState({ name: '', shopName: '', location: '', description: '', lat: null, lng: null })
  const [profileSaveMsg, setProfileSaveMsg] = useState(null)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.sellers.dashboard()
      setStats(data.stats)
      setRecentProducts(data.recentProducts)
      setRecentOrders(data.recentOrders)
    } catch (err) {
      console.error('Dashboard load error:', err)
      setError(err.message || 'Ma\'lumotlarni yuklashda xatolik')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMyProducts = useCallback(async () => {
    try {
      const { products } = await api.sellerProducts.list()
      setMyProducts(products)
    } catch (err) {
      console.error('Load products error:', err)
    }
  }, [])

  const loadOrders = useCallback(async (statusFilter = '') => {
    setOrdersLoading(true)
    setOrdersError(null)
    try {
      const params = { page: 1, limit: 50 }
      if (statusFilter) params.status = statusFilter
      const data = await api.sellerOrders.list(params)
      setOrders(data.orders)
    } catch (err) {
      console.error('Orders load error:', err)
      setOrdersError(err.message || 'Buyurtmalarni yuklashda xatolik')
    } finally {
      setOrdersLoading(false)
    }
  }, [])

  const loadReviews = useCallback(async (ratingFilter = 0) => {
    setReviewsLoading(true)
    setReviewsError(null)
    try {
      const params = { page: 1, limit: 50 }
      if (ratingFilter) params.rating = ratingFilter
      const data = await api.sellers.reviews(params)
      setReviews(data.reviews || [])
    } catch (err) {
      console.error('Reviews load error:', err)
      setReviewsError(err.message || 'Sharhlarni yuklashda xatolik')
    } finally {
      setReviewsLoading(false)
    }
  }, [])

  useEffect(() => { loadDashboard() }, [loadDashboard])
  useEffect(() => { loadMyProducts() }, [loadMyProducts])
  useEffect(() => {
    if (activeSection === 'orders') loadOrders(orderStatusFilter)
  }, [activeSection, orderStatusFilter, loadOrders])

  useEffect(() => {
    if (activeSection === 'reviews') loadReviews(reviewRatingFilter)
  }, [activeSection, reviewRatingFilter, loadReviews])

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        shopName: user.shopName || '',
        location: user.location || '',
        description: user.description || '',
        lat: user.lat || null,
        lng: user.lng || null,
      })
    }
  }, [user])

  useEffect(() => {
    return () => { imagePreviews.forEach(p => { if (p.startsWith('blob:')) URL.revokeObjectURL(p) }) }
  }, [imagePreviews])

  if (!user || (user.role !== 'seller' && user.role !== 'craftsman')) {
    return (
      <>
        <Header />
        <div className="sd-v2" style={{ textAlign: 'center', padding: '80px 20px' }}>
          <h2>{t('accessDenied')}</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>{t('sellerAccessOnly')}</p>
          <button onClick={() => navigate('/')} style={{ marginTop: 16, padding: '10px 24px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
            {t('home')}
          </button>
        </div>
        <Footer />
      </>
    )
  }

  if (user?.role === 'craftsman') {
    navigate('/craftsman-dashboard', { replace: true })
    return null
  }

  const filteredProducts = myProducts.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.brand.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const resetForm = () => {
    setForm(INITIAL_FORM)
    setFormStep(1)
    setFormErrors({})
    imagePreviews.forEach(p => { if (p.startsWith('blob:')) URL.revokeObjectURL(p) })
    setImageFiles([])
    setImagePreviews([])
    if (videoPreview && videoPreview.startsWith('blob:')) URL.revokeObjectURL(videoPreview)
    setVideoFile(null)
    setVideoPreview('')
    setEditVideoUrl('')
    setHasVariants(false)
    setVariants([])
    setSubmitting(false)
    setSubmitMsg(null)
  }

  const openAddForm = () => {
    resetForm()
    setEditProduct(null)
    setShowAddForm(true)
  }

  const openEditForm = (product) => {
    setEditProduct(product)
    setForm({
      name: product.name || '',
      brand: product.brand || '',
      category: product.category || 'paints',
      description: product.description || '',
      price: product.price || '',
      oldPrice: product.oldPrice || '',
      stock: product.stock || '',
    })
    const rawImages = (product.images && product.images.length > 0) ? product.images : (product.image ? [product.image] : [])
    const existingImages = rawImages.filter(Boolean)
    setImageFiles([])
    setImagePreviews(existingImages)
    setVideoFile(null)
    setVideoPreview(product.video || '')
    setEditVideoUrl(product.video || '')
    const productVariants = product.variants || []
    if (productVariants.length > 0) {
      setHasVariants(true)
      setVariants(productVariants.map(v => ({
        _id: v._id,
        color: v.color || '',
        colorHex: v.colorHex || '',
        size: v.size || '',
        price: v.price || '',
        oldPrice: v.oldPrice || '',
        stock: v.stock ?? '',
        sku: v.sku || '',
        files: [],
        previews: (Array.isArray(v.images) && v.images.length ? v.images : (v.image ? [v.image] : [])).filter(Boolean),
      })))
    } else {
      setHasVariants(false)
      setVariants([])
    }
    setFormStep(1)
    setFormErrors({})
    setSubmitMsg(null)
    setShowAddForm(true)
  }

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const errors = []
    const newFiles = []
    const newPreviews = []

    for (const file of files) {
      if (imageFiles.length + newFiles.length >= MAX_IMAGES) {
        errors.push(`Maksimal ${MAX_IMAGES} ta rasm yuklash mumkin`)
        break
      }
      if (!file.type.startsWith('image/')) {
        errors.push(`${file.name}: faqat rasm fayllari qabul qilinadi`)
        continue
      }
      if (file.size > MAX_IMAGE_SIZE) {
        errors.push(`${file.name}: hajmi 5MB dan katta`)
        continue
      }
      newFiles.push(file)
      newPreviews.push(URL.createObjectURL(file))
    }

    if (errors.length) {
      setFormErrors(prev => ({ ...prev, image: errors.join('; ') }))
    } else {
      setFormErrors(prev => { const { image, ...rest } = prev; return rest })
    }

    setImageFiles(prev => [...prev, ...newFiles])
    setImagePreviews(prev => [...prev, ...newPreviews])
    if (e.target) e.target.value = ''
  }

  const removeImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => {
      const url = prev[index]
      if (url && url.startsWith('blob:')) URL.revokeObjectURL(url)
      return prev.filter((_, i) => i !== index)
    })
  }

  // ── Video (butun mahsulotga 1 ta, mp4) ──
  const handleVideoSelect = (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    if (!/^video\/mp4$/.test(file.type) && !file.name.toLowerCase().endsWith('.mp4')) {
      setFormErrors(prev => ({ ...prev, video: 'Faqat MP4 video yuklash mumkin' }))
      if (e.target) e.target.value = ''
      return
    }
    if (file.size > MAX_VIDEO_SIZE) {
      setFormErrors(prev => ({ ...prev, video: 'Video hajmi 100MB dan katta' }))
      if (e.target) e.target.value = ''
      return
    }
    if (videoPreview && videoPreview.startsWith('blob:')) URL.revokeObjectURL(videoPreview)
    setVideoFile(file)
    setVideoPreview(URL.createObjectURL(file))
    setEditVideoUrl('')
    setFormErrors(prev => { const { video, ...rest } = prev; return rest })
    if (e.target) e.target.value = ''
  }

  const removeVideo = () => {
    if (videoPreview && videoPreview.startsWith('blob:')) URL.revokeObjectURL(videoPreview)
    setVideoFile(null)
    setVideoPreview('')
    setEditVideoUrl('')
  }

  // ── Variant rasmlari (har bir variantga alohida) ──
  const handleVariantImageSelect = (idx, e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const variant = variants[idx]
    if (!variant) { if (e.target) e.target.value = ''; return }

    const errors = []
    const newFiles = []
    const newPreviews = []
    const currentCount = (variant.previews || []).length

    for (const file of files) {
      if (currentCount + newFiles.length >= MAX_IMAGES) {
        errors.push(`Variant ${idx + 1}: maksimal ${MAX_IMAGES} ta rasm`)
        break
      }
      if (!file.type.startsWith('image/')) {
        errors.push(`${file.name}: faqat rasm fayllari qabul qilinadi`)
        continue
      }
      if (file.size > MAX_IMAGE_SIZE) {
        errors.push(`${file.name}: hajmi 5MB dan katta`)
        continue
      }
      newFiles.push(file)
      newPreviews.push(URL.createObjectURL(file))
    }

    if (errors.length) {
      setFormErrors(prev => ({ ...prev, ['variant_' + idx]: errors.join('; ') }))
    } else {
      setFormErrors(prev => { const { ['variant_' + idx]: _, ...rest } = prev; return rest })
    }

    setVariants(prev => prev.map((v, i) => i === idx ? {
      ...v,
      files: [...(v.files || []), ...newFiles],
      previews: [...(v.previews || []), ...newPreviews],
    } : v))
    if (e.target) e.target.value = ''
  }

  const removeVariantImage = (idx, imgIdx) => {
    setVariants(prev => prev.map((v, i) => {
      if (i !== idx) return v
      const url = (v.previews || [])[imgIdx]
      if (url && url.startsWith('blob:')) URL.revokeObjectURL(url)
      return {
        ...v,
        files: (v.files || []).filter((_, fi) => fi !== imgIdx),
        previews: (v.previews || []).filter((_, pi) => pi !== imgIdx),
      }
    }))
  }


  const validateStep = (step) => {
    const errors = {}
    if (step === 1) {
      if (!form.name.trim()) errors.name = 'Mahsulot nomini kiriting'
      if (!form.brand.trim()) errors.brand = 'Brendni kiriting'
      if (!form.description.trim()) errors.description = 'Tavsifni kiriting'
    }
    if (step === 2) {
      if (hasVariants) {
        if (variants.length === 0) {
          errors.variants = 'Kamida 1 ta variant qo\'shing'
        } else {
          const invalidPrice = variants.find(v => !v.price || Number(v.price) <= 0)
          if (invalidPrice) errors.variants = 'Har bir variantning narxi musbat son bo\'lishi kerak'
          variants.forEach((v, i) => {
            const n = (v.previews || []).length
            if (n < MIN_IMAGES || n > MAX_IMAGES) {
              if (!errors.variants) errors.variants = ''
              errors['variant_' + i] = `Variant #${i + 1}: ${MIN_IMAGES}-${MAX_IMAGES} ta rasm yuklang (hozir ${n} ta)`
            }
          })
        }
      } else {
        if (!form.price || Number(form.price) <= 0) errors.price = 'Narxni kiriting'
        const n = imagePreviews.length
        if (n < MIN_IMAGES || n > MAX_IMAGES) {
          errors.image = `${MIN_IMAGES}-${MAX_IMAGES} ta rasm yuklang (hozir ${n} ta)`
        }
      }
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const nextStep = () => {
    if (validateStep(formStep)) setFormStep(s => Math.min(s + 1, 3))
  }
  const prevStep = () => setFormStep(s => Math.max(s - 1, 1))

  const buildFormData = () => {
    const fd = new FormData()
    fd.append('name', form.name.trim())
    fd.append('brand', form.brand.trim())
    fd.append('category', form.category)
    fd.append('description', form.description.trim())
    fd.append('price', Number(form.price))
    if (form.oldPrice) fd.append('oldPrice', Number(form.oldPrice))
    fd.append('stock', Number(form.stock) || 0)
    imageFiles.forEach(f => fd.append('images', f))
    if (editProduct) {
      const keptExisting = imagePreviews.filter(p => !p.startsWith('blob:'))
      fd.append('keepImages', JSON.stringify(keptExisting))
    }
    // Video (butun mahsulotga 1 ta)
    if (videoFile) {
      fd.append('video', videoFile)
    } else if (editVideoUrl) {
      // mavjud videoni saqlash: yangi video yuklanmagan
    } else if (editProduct) {
      fd.append('removeVideo', '1')
    }
    if (hasVariants && variants.length > 0) {
      const cleaned = []
      const counts = []
      variants.forEach(v => {
        const kept = (v.previews || []).filter(p => !p.startsWith('blob:'))
        cleaned.push({
          color: v.color || undefined,
          colorHex: v.colorHex || undefined,
          size: v.size || undefined,
          price: Number(v.price),
          oldPrice: v.oldPrice ? Number(v.oldPrice) : undefined,
          image: (v.previews || [])[0] || undefined,
          images: kept,
          stock: v.stock != null ? Number(v.stock) : 0,
          sku: v.sku || undefined,
        })
        counts.push((v.files || []).length)
        ;(v.files || []).forEach(f => fd.append('variantImages', f))
      })
      fd.append('variants', JSON.stringify(cleaned))
      fd.append('variantImageCounts', JSON.stringify(counts))
      fd.append('variantsUpdated', '1')
    } else if (!hasVariants && editProduct) {
      fd.append('variants', '[]')
    }
    return fd
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitMsg(null)
    try {
      const fd = buildFormData()
      if (editProduct) {
        await api.products.update(editProduct._id, fd)
        setSubmitMsg({ type: 'success', text: 'Mahsulot yangilandi!' })
      } else {
        await api.products.create(fd)
        setSubmitMsg({ type: 'success', text: "Mahsulot qoshildi!" })
      }
      loadDashboard()
      loadMyProducts()
      setTimeout(() => { setShowAddForm(false); resetForm() }, 1200)
    } catch (err) {
      setSubmitMsg({ type: 'error', text: err.message || 'Xatolik yuz berdi' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.products.delete(id)
      loadMyProducts()
      loadDashboard()
    } catch (err) {
      console.error('Delete product error:', err)
    }
  }

  const toggleStatus = async (product) => {
    try {
      await api.products.update(product._id, { status: product.status === 'active' ? 'paused' : 'active' })
      loadMyProducts()
    } catch (err) {
      console.error('Toggle status error:', err)
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setProfileSaveMsg(null)
    try {
      await updateProfile({
        name: profileForm.name,
        shopName: profileForm.shopName,
        location: profileForm.location,
        description: profileForm.description,
        lat: profileForm.lat,
        lng: profileForm.lng,
      })
      setProfileSaveMsg({ type: 'success', text: 'Saqlandi!' })
      setTimeout(() => setProfileSaveMsg(null), 3000)
    } catch (err) {
      setProfileSaveMsg({ type: 'error', text: err.message || 'Xatolik' })
    }
  }

  const goToProducts = () => {
    setActiveSection('products')
    openAddForm()
  }

  const categoryLabel = (val) => CATEGORIES.find(c => c.value === val)?.label || val

  const STEP_LABELS = ['Asosiy ma\'lumot', 'Narx va rasm', 'Tasdiqlash']

  const createEmptyVariant = () => ({
    color: '', colorHex: '', size: '', price: '', oldPrice: '', stock: '', sku: '', files: [], previews: [],
  })

  const addVariant = () => setVariants(prev => [...prev, createEmptyVariant()])

  const removeVariant = (idx) => {
    setVariants(prev => {
      const removed = prev[idx]
      if (removed) (removed.previews || []).forEach(p => { if (p.startsWith('blob:')) URL.revokeObjectURL(p) })
      return prev.filter((_, i) => i !== idx)
    })
  }

  const updateVariant = (idx, field, value) => {
    setVariants(prev => prev.map((v, i) => i === idx ? { ...v, [field]: value } : v))
  }

  const toggleHasVariants = () => {
    setHasVariants(prev => {
      if (!prev) setVariants([createEmptyVariant()])
      else {
        variants.forEach(v => (v.previews || []).forEach(p => { if (p.startsWith('blob:')) URL.revokeObjectURL(p) }))
        setVariants([])
      }
      return !prev
    })
    setFormErrors(prev => { const { variants, price, ...rest } = prev; return rest })
  }

  /* ──────── Multi-step form modal ──────── */

  const renderFormStep1 = () => (
    <div className="sdv2-step-fields">
      <div className="sdv2-form-field">
        <label>Mahsulot nomi *</label>
        <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Masalan: Lateks boyog 10L" />
        {formErrors.name && <span className="sdv2-field-error">{formErrors.name}</span>}
      </div>
      <div className="sdv2-form-field">
        <label>Brend *</label>
        <input type="text" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} placeholder="Masalan: Beseda" />
        {formErrors.brand && <span className="sdv2-field-error">{formErrors.brand}</span>}
      </div>
      <div className="sdv2-form-field">
        <label>Kategoriya</label>
        <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>
      <div className="sdv2-form-field">
        <label>Qisqa tavsif *</label>
        <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Mahsulot haqida qisqacha..." />
        {formErrors.description && <span className="sdv2-field-error">{formErrors.description}</span>}
      </div>
    </div>
  )

  const renderFormStep2 = () => (
    <div className="sdv2-step-fields">
      <div className="sdv2-variant-toggle">
        <label className="sdv2-toggle-label">
          <span className="sdv2-toggle-track" data-active={hasVariants} onClick={toggleHasVariants}>
            <span className="sdv2-toggle-thumb" />
          </span>
          <span className="sdv2-toggle-text">
            <strong>Bu mahsulotda variantlar bormi?</strong>
            <span>Rang, o'lcham kabi variantlar qo'shing</span>
          </span>
        </label>
      </div>

      {formErrors.variants && <span className="sdv2-field-error" style={{ marginBottom: 12, display: 'block' }}>{formErrors.variants}</span>}

      {!hasVariants ? (
        <>
          <div className="sdv2-form-row">
            <div className="sdv2-form-field">
              <label>Narx (so'm) *</label>
              <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="1500000" />
              {formErrors.price && <span className="sdv2-field-error">{formErrors.price}</span>}
            </div>
            <div className="sdv2-form-field">
              <label>Eski narx (ixtiyoriy)</label>
              <input type="number" value={form.oldPrice} onChange={e => setForm({ ...form, oldPrice: e.target.value })} placeholder="1800000" />
            </div>
                    </div>
          <div className="sdv2-form-field">
            <label>Ombor soni</label>
            <input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} placeholder="10" />
          </div>
          <div className="sdv2-form-field">
            <label>Mahsulot rasmlari ({imagePreviews.length}/{MAX_IMAGES}) *</label>
            <div className="sdv2-upload-grid">
              {imagePreviews.map((preview, i) => (
                <div className="sdv2-upload-thumb" key={i}>
                  {preview ? <img src={preview} alt={`Rasm ${i + 1}`} /> : (
                    <div className="sdv2-upload-thumb-empty">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-muted)' }}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                    </div>
                  )}
                  {i === 0 && <span className="sdv2-thumb-badge">Asosiy</span>}
                  <button type="button" className="sdv2-upload-remove-sm" onClick={() => removeImage(i)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
              {imagePreviews.length < MAX_IMAGES && (
                <div className="sdv2-upload-add" onClick={() => fileInputRef.current?.click()}>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="sdv2-file-input" />
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)' }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  <span>Qo'shish</span>
                </div>
              )}
            </div>
            <span className="sdv2-upload-hint">JPG, PNG, WEBP - har biri 5MB gacha, {MIN_IMAGES}-{MAX_IMAGES} ta rasm | 1:1 kvadrat format (1000x1000px) tavsiya etiladi</span>
            {formErrors.image && <span className="sdv2-field-error">{formErrors.image}</span>}
          </div>
        </>
      ) : (
        <div className="sdv2-variants-list">
          {variants.map((v, idx) => (
            <div className="sdv2-variant-card" key={v._id || idx}>
              <div className="sdv2-variant-card-header">
                <span className="sdv2-variant-num">#{idx + 1}</span>
                <button type="button" className="sdv2-variant-remove" onClick={() => removeVariant(idx)} title="O'chirish">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div className="sdv2-variant-fields">
                <div className="sdv2-variant-row">
                  <div className="sdv2-form-field" style={{ flex: 1 }}>
                    <label>Rang nomi</label>
                    <input type="text" value={v.color} onChange={e => updateVariant(idx, 'color', e.target.value)} placeholder="Masalan: Bordo" />
                  </div>
                  <div className="sdv2-form-field" style={{ flex: '0 0 auto' }}>
                    <label>Rang</label>
                    <div className="sdv2-color-input-wrap">
                      <input type="color" value={v.colorHex || '#800020'} onChange={e => updateVariant(idx, 'colorHex', e.target.value)} className="sdv2-color-input" />
                      {v.colorHex && <span className="sdv2-color-dot" style={{ background: v.colorHex }} />}
                    </div>
                  </div>
                  <div className="sdv2-form-field" style={{ flex: 1 }}>
                    <label>O'lcham</label>
                    <input type="text" value={v.size} onChange={e => updateVariant(idx, 'size', e.target.value)} placeholder="42, 1L, 5L..." />
                  </div>
                </div>
                <div className="sdv2-variant-row">
                  <div className="sdv2-form-field" style={{ flex: 1 }}>
                    <label>Narx (so'm) *</label>
                    <input type="number" value={v.price} onChange={e => updateVariant(idx, 'price', e.target.value)} placeholder="80000" />
                  </div>
                  <div className="sdv2-form-field" style={{ flex: 1 }}>
                    <label>Eski narx</label>
                    <input type="number" value={v.oldPrice} onChange={e => updateVariant(idx, 'oldPrice', e.target.value)} placeholder="95000" />
                  </div>
                  <div className="sdv2-form-field" style={{ flex: 1 }}>
                    <label>Ombor</label>
                    <input type="number" value={v.stock} onChange={e => updateVariant(idx, 'stock', e.target.value)} placeholder="10" />
                  </div>
                </div>
                <div className="sdv2-variant-row">
                  <div className="sdv2-form-field" style={{ flex: 1 }}>
                    <label>SKU (ixtiyoriy)</label>
                    <input type="text" value={v.sku} onChange={e => updateVariant(idx, 'sku', e.target.value)} placeholder="Ombor kodi" />
                  </div>
                                    <div className="sdv2-form-field">
                    <label>Variant #{idx + 1} rasmlari ({(v.previews || []).length}/{MAX_IMAGES}) *</label>
                    <div className="sdv2-upload-grid">
                      {(v.previews || []).map((prev, pi) => (
                        <div className="sdv2-upload-thumb" key={pi}>
                          {prev ? <img src={prev} alt={`Variant ${idx + 1} Rasm ${pi + 1}`} /> : (
                            <div className="sdv2-upload-thumb-empty">
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-muted)' }}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                            </div>
                          )}
                          {pi === 0 && <span className="sdv2-thumb-badge">Asosiy</span>}
                          <button type="button" className="sdv2-upload-remove-sm" onClick={() => removeVariantImage(idx, pi)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </div>
                      ))}
                      {(v.previews || []).length < MAX_IMAGES && (
                        <div className="sdv2-upload-add" onClick={() => document.getElementById(`variant-img-${idx}`)?.click()}>
                          <input id={`variant-img-${idx}`} type="file" accept="image/*" multiple onChange={(e) => handleVariantImageSelect(idx, e)} className="sdv2-file-input" />
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)' }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          <span>Qo'shish</span>
                        </div>
                      )}
                    </div>
                    <span className="sdv2-upload-hint">Har bir variantga {MIN_IMAGES}-{MAX_IMAGES} ta rasm | 1:1 kvadrat format tavsiya etiladi</span>
                    {formErrors['variant_' + idx] && <span className="sdv2-field-error">{formErrors['variant_' + idx]}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button type="button" className="sdv2-variant-add-btn" onClick={addVariant}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Variant qo'shish
          </button>
        </div>
      )}

            {/* ── Butun mahsulotga 1 ta video (MP4) ── */}
      <div className="sdv2-form-field">
        <label>Mahsulot videosi (MP4, ixtiyoriy — maks 1 ta)</label>
        {(videoPreview && videoPreview.startsWith('/uploads/')) || videoFile ? (
          <div className="sdv2-video-preview">
            <video src={videoFile ? videoPreview : (editVideoUrl || videoPreview)} controls />
            <div className="sdv2-video-meta">
              <span className="sdv2-video-name">{videoFile ? videoFile.name : (editVideoUrl || videoPreview).split('/').pop()}</span>
              <button type="button" className="sdv2-upload-remove-sm" onClick={removeVideo} title="O'chirish">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="sdv2-video-add" onClick={() => videoInputRef.current?.click()}>
            <input ref={videoInputRef} type="file" accept="video/mp4" onChange={handleVideoSelect} className="sdv2-file-input" />
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)' }}>
              <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
            <span>Video yuklash (MP4)</span>
          </div>
        )}
        <span className="sdv2-upload-hint">Faqat MP4, 100MB gacha, 1 ta</span>
        {formErrors.video && <span className="sdv2-field-error">{formErrors.video}</span>}
      </div>
    </div>
  )

  const renderFormStep3 = () => (
    <div className="sdv2-step-confirm">
      <div className="sdv2-confirm-card">
        <div className="sdv2-confirm-images">
          {imagePreviews.length > 0 ? (
            <div className="sdv2-confirm-gallery">
              {imagePreviews.filter(Boolean).map((src, i) => (
                <img key={i} src={src} alt={`${form.name} ${i + 1}`} className={i === 0 ? 'main' : ''} />
              ))}
            </div>
          ) : (
            <div className="sdv2-confirm-no-img">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ color: 'var(--text-muted)' }}>
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
              </svg>
            </div>
          )}
        </div>
        <div className="sdv2-confirm-info">
          <span className="sdv2-confirm-brand">{form.brand}</span>
          <h4>{form.name || 'Nomsiz mahsulot'}</h4>
          <span className="sdv2-confirm-category">{categoryLabel(form.category)}</span>
          {form.description && <p className="sdv2-confirm-desc">{form.description}</p>}
          {!hasVariants ? (
            <div className="sdv2-confirm-prices">
              <span className="sdv2-confirm-price">{form.price ? convertPrice(Number(form.price)) : '\u2014'}</span>
              {form.oldPrice && <span className="sdv2-confirm-old">{convertPrice(Number(form.oldPrice))}</span>}
            </div>
          ) : (
            <div className="sdv2-confirm-variants">
              <span className="sdv2-confirm-variants-title">Variantlar ({variants.length}):</span>
              {variants.map((v, i) => (
                <div className="sdv2-confirm-variant" key={v._id || i}>
                  <span className="sdv2-confirm-variant-dot" style={{ background: v.colorHex || '#94a3b8' }} />
                  <span className="sdv2-confirm-variant-info">
                    {[v.color, v.size].filter(Boolean).join(' / ') || `Variant ${i + 1}`}
                  </span>
                  <span className="sdv2-confirm-variant-price">
                    {v.price ? convertPrice(Number(v.price)) : '—'}
                    {v.oldPrice && <s>{convertPrice(Number(v.oldPrice))}</s>}
                  </span>
                  {v.stock != null && v.stock !== '' && <span className="sdv2-confirm-variant-stock">{v.stock} ta</span>}
                </div>
              ))}
            </div>
          )}
          {form.stock && !hasVariants && <span className="sdv2-confirm-stock">Omborda: {form.stock} ta</span>}
        </div>
      </div>
    </div>
  )

  const renderFormContent = () => {
    switch (formStep) {
      case 1: return renderFormStep1()
      case 2: return renderFormStep2()
      case 3: return renderFormStep3()
      default: return renderFormStep1()
    }
  }

  /* ──────── Section renders ──────── */

  const renderOverview = () => {
    if (loading) {
      return (
        <div className="sdv2-overview">
          <div className="sdv2-stats">
            {[1,2,3,4].map(i => (
              <div className="sdv2-stat-card sdv2-skeleton" key={i}>
                <div className="sdv2-skeleton-box" style={{width:48,height:48,borderRadius:14}} />
                <div className="sdv2-skeleton-lines">
                  <div className="sdv2-skeleton-line" style={{width:60,height:20}} />
                  <div className="sdv2-skeleton-line" style={{width:80,height:14}} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="sdv2-error-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{color:'var(--danger)'}}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>{error}</p>
          <button className="sdv2-primary-btn" onClick={loadDashboard}>Qayta urinish</button>
        </div>
      )
    }

    const ORDER_STATUS_LABELS = { pending: 'Kutilmoqda', confirmed: 'Tasdiqlangan', shipping: 'Yetkazilmoqda', delivered: 'Yetkazildi', cancelled: 'Bekor qilingan' }

    return (
    <div className="sdv2-overview">
      <div className="sdv2-stats">
        <div className="sdv2-stat-card">
          <div className="sdv2-stat-icon blue">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
          </div>
          <div className="sdv2-stat-info">
            <span className="sdv2-stat-value">{stats.totalProducts}</span>
            <span className="sdv2-stat-label">Mahsulotlar</span>
          </div>
        </div>
        <div className="sdv2-stat-card">
          <div className="sdv2-stat-icon green">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
          </div>
          <div className="sdv2-stat-info">
            <span className="sdv2-stat-value">{stats.totalOrders}</span>
            <span className="sdv2-stat-label">Buyurtmalar</span>
            {stats.pendingOrders > 0 && <span className="sdv2-stat-badge">{stats.pendingOrders} yangi</span>}
          </div>
        </div>
        <div className="sdv2-stat-card">
          <div className="sdv2-stat-icon amber">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
          </div>
          <div className="sdv2-stat-info">
            <span className="sdv2-stat-value">{convertPrice(stats.totalRevenue)}</span>
            <span className="sdv2-stat-label">Daromad</span>
          </div>
        </div>
        <div className="sdv2-stat-card">
          <div className="sdv2-stat-icon purple">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <div className="sdv2-stat-info">
            <span className="sdv2-stat-value">{stats.averageRating > 0 ? stats.averageRating : '\u2014'}</span>
            <span className="sdv2-stat-label">O'rtacha reyting</span>
          </div>
        </div>
      </div>

      <div className="sdv2-recent-grid">
        <div className="sdv2-recent">
          <div className="sdv2-recent-header">
            <h3>So'nggi mahsulotlar</h3>
            <button className="sdv2-link-btn" onClick={() => setActiveSection('products')}>Hammasini korish</button>
          </div>
          {recentProducts.length === 0 ? (
            <div className="sdv2-empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-muted)' }}>
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
              </svg>
              <p>Hali mahsulot qoshmagansiz</p>
              <button className="sdv2-primary-btn" onClick={goToProducts}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Mahsulot qoshish
              </button>
            </div>
          ) : (
            <div className="sdv2-recent-list">
              {recentProducts.map(p => (
                <div className="sdv2-recent-item" key={p._id}>
                  <img src={p.image || '/placeholder.png'} alt={p.name} />
                  <div className="sdv2-recent-info">
                    <span className="sdv2-recent-brand">{p.brand}</span>
                    <span className="sdv2-recent-name">{p.name}</span>
                  </div>
                  <div className="sdv2-recent-meta">
                    <span className="sdv2-recent-price">{convertPrice(p.price)}</span>
                    <span className={`sdv2-recent-status ${p.status}`}>{p.status === 'active' ? 'Faol' : "To'xtatilgan"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sdv2-recent">
          <div className="sdv2-recent-header">
            <h3>So'nggi buyurtmalar</h3>
            <button className="sdv2-link-btn" onClick={() => setActiveSection('orders')}>Hammasini korish</button>
          </div>
          {recentOrders.length === 0 ? (
            <div className="sdv2-empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{color:'var(--text-muted)'}}>
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
              </svg>
              <p>Hali buyurtma yo'q</p>
            </div>
          ) : (
            <div className="sdv2-recent-list">
              {recentOrders.map(o => (
                <div className="sdv2-recent-item" key={o._id}>
                  <div className="sdv2-order-avatar">{o.buyer?.name?.[0] || '?'}</div>
                  <div className="sdv2-recent-info">
                    <span className="sdv2-recent-brand">{o.buyer?.name || 'Noma\'lum'}</span>
                    <span className="sdv2-recent-name">{o.items.length} ta mahsulot · {convertPrice(o.total)}</span>
                  </div>
                  <div className="sdv2-recent-meta">
                    <span className={`sdv2-status-chip ${o.status}`}>{ORDER_STATUS_LABELS[o.status] || o.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    )
  }

  const renderProducts = () => (
    <div className="sdv2-products">
      <div className="sdv2-products-toolbar">
        <div className="sdv2-search">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Mahsulot qidirish..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <button className="sdv2-primary-btn" onClick={openAddForm}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Yangi mahsulot
        </button>
      </div>

      <div className="sdv2-products-table">
        <div className="sdv2-table-header">
          <span className="sdv2-col-img">Rasm</span>
          <span className="sdv2-col-name">Nomi</span>
          <span className="sdv2-col-price">Narx</span>
          <span className="sdv2-col-stock">Ombor</span>
          <span className="sdv2-col-sold">Sotilgan</span>
          <span className="sdv2-col-status">Holat</span>
          <span className="sdv2-col-actions">Amallar</span>
        </div>

        {loading ? (
          <div className="sdv2-no-data">Yuklanmoqda...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="sdv2-no-data">Mahsulot topilmadi</div>
        ) : (
          filteredProducts.map(p => (
            <div className="sdv2-table-row" key={p._id}>
              <div className="sdv2-col-img">
                <img src={p.image || '/placeholder.png'} alt={p.name} />
              </div>
              <div className="sdv2-col-name">
                <span className="sdv2-p-brand">{p.brand}</span>
                <h4>{p.name}</h4>
              </div>
              <div className="sdv2-col-price">
                <strong>{convertPrice(p.price)}</strong>
                {p.oldPrice && <span className="sdv2-old-price">{convertPrice(p.oldPrice)}</span>}
              </div>
              <div className="sdv2-col-stock">
                {(() => {
                  const variantStock = Array.isArray(p.variants) && p.variants.length > 0
                    ? p.variants.reduce((sum, v) => sum + (v.stock || 0), 0)
                    : null
                  const totalStock = variantStock !== null ? variantStock : (p.stock || 0)
                  return <span className={`sdv2-stock ${totalStock < 10 ? 'low' : ''}`}>{totalStock} ta</span>
                })()}
              </div>
              <div className="sdv2-col-sold">{p.sold || 0}</div>
              <div className="sdv2-col-status">
                <span className={`sdv2-status-badge ${p.status}`}>{p.status === 'active' ? 'Faol' : "To'xtatilgan"}</span>
              </div>
              <div className="sdv2-col-actions">
                <button className="sdv2-action edit" onClick={() => openEditForm(p)} title="Tahrirlash">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button className={`sdv2-action toggle ${p.status === 'active' ? 'pause' : 'play'}`} onClick={() => toggleStatus(p)} title={p.status === 'active' ? "To'xtatish" : 'Yoqish'}>
                  {p.status === 'active' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  )}
                </button>
                <button className="sdv2-action delete" onClick={() => handleDelete(p._id)} title="O'chirish">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )

  const ORDER_FILTERS = [
    { value: '', label: 'Barchasi' },
    { value: 'pending', label: 'Kutilmoqda' },
    { value: 'confirmed', label: 'Tasdiqlangan' },
    { value: 'shipping', label: 'Yetkazilmoqda' },
    { value: 'delivered', label: 'Yetkazildi' },
    { value: 'cancelled', label: 'Bekor qilingan' },
  ]

  const ORDER_STATUS_LABELS = { pending: 'Kutilmoqda', confirmed: 'Tasdiqlangan', shipping: 'Yetkazilmoqda', delivered: 'Yetkazildi', cancelled: 'Bekor qilingan' }

  const STATUS_FLOW = ['pending', 'confirmed', 'shipping', 'delivered']

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdatingOrderId(orderId)
    try {
      await api.sellerOrders.updateStatus(orderId, newStatus)
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o))
      loadDashboard()
    } catch (err) {
      console.error('Status update error:', err)
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const getNextStatus = (current) => {
    const idx = STATUS_FLOW.indexOf(current)
    if (idx >= 0 && idx < STATUS_FLOW.length - 1) return STATUS_FLOW[idx + 1]
    return null
  }

  const renderOrders = () => {
    if (ordersLoading) {
      return (
        <div className="sdv2-orders-loading">
          {[1,2,3].map(i => (
            <div className="sdv2-skeleton-card" key={i}>
              <div className="sdv2-skeleton-line" style={{width:'40%',height:16}} />
              <div className="sdv2-skeleton-line" style={{width:'70%',height:14}} />
              <div className="sdv2-skeleton-line" style={{width:'30%',height:14}} />
            </div>
          ))}
        </div>
      )
    }

    if (ordersError) {
      return (
        <div className="sdv2-error-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{color:'var(--danger)'}}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>{ordersError}</p>
          <button className="sdv2-primary-btn" onClick={() => loadOrders(orderStatusFilter)}>Qayta urinish</button>
        </div>
      )
    }

    return (
    <div className="sdv2-orders">
      <div className="sdv2-orders-filters">
        {ORDER_FILTERS.map(f => (
          <button
            key={f.value}
            className={`sdv2-filter-chip ${orderStatusFilter === f.value ? 'active' : ''}`}
            onClick={() => setOrderStatusFilter(f.value)}
          >{f.label}</button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="sdv2-empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ color: 'var(--text-muted)' }}>
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
          </svg>
          <p>{orderStatusFilter ? 'Bu holatda buyurtma yo\'q' : 'Hali buyurtma yo\'q'}</p>
        </div>
      ) : (
        <div className="sdv2-orders-list">
          {orders.map(order => {
            const next = getNextStatus(order.status)
            return (
              <div className="sdv2-order-card" key={order._id}>
                <div className="sdv2-order-top">
                  <div className="sdv2-order-buyer">
                    <div className="sdv2-order-avatar">{order.buyer?.name?.[0] || '?'}</div>
                    <div>
                      <strong>{order.buyer?.name || 'Noma\'lum'}</strong>
                      <span>{order.buyer?.phone || order.phone || ''}</span>
                    </div>
                  </div>
                  <div className="sdv2-order-meta">
                    <span className={`sdv2-status-chip ${order.status}`}>{ORDER_STATUS_LABELS[order.status]}</span>
                    <span className="sdv2-order-date">{new Date(order.createdAt).toLocaleDateString('uz-UZ')}</span>
                  </div>
                </div>

                <div className="sdv2-order-items">
                  {order.items.map((item, i) => (
                    <div className="sdv2-order-item" key={i}>
                      <img src={item.image || '/placeholder.png'} alt={item.name} />
                      <div className="sdv2-order-item-info">
                        <span className="sdv2-order-item-name">{item.name}</span>
                        <span>{item.qty} × {convertPrice(item.price)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="sdv2-order-bottom">
                  <span className="sdv2-order-total">Jami: {convertPrice(order.total)}</span>
                  <div className="sdv2-order-actions">
                    {next && (
                      <button
                        className="sdv2-primary-btn sm"
                        disabled={updatingOrderId === order._id}
                        onClick={() => handleStatusUpdate(order._id, next)}
                      >
                        {updatingOrderId === order._id ? '...' : ORDER_STATUS_LABELS[next]}
                      </button>
                    )}
                    {order.status !== 'cancelled' && order.status !== 'delivered' && (
                      <button
                        className="sdv2-cancel-btn sm"
                        disabled={updatingOrderId === order._id}
                        onClick={() => handleStatusUpdate(order._id, 'cancelled')}
                      >
                        Bekor qilish
                      </button>
                    )}
                  </div>
                </div>

                {order.address && <div className="sdv2-order-address">Manzil: {order.address}</div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
    )
  }

  const REVIEW_RATING_FILTERS = [
    { value: 0, label: 'Barchasi' },
    { value: 5, label: '5 \u2605' },
    { value: 4, label: '4 \u2605' },
    { value: 3, label: '3 \u2605' },
    { value: 2, label: '2 \u2605' },
    { value: 1, label: '1 \u2605' },
  ]

  const renderReviews = () => {
    if (reviewsLoading) {
      return (
        <div className="sdv2-orders-loading">
          {[1,2,3].map(i => (
            <div className="sdv2-skeleton-card" key={i}>
              <div className="sdv2-skeleton-line" style={{width:'40%',height:16}} />
              <div className="sdv2-skeleton-line" style={{width:'70%',height:14}} />
              <div className="sdv2-skeleton-line" style={{width:'30%',height:14}} />
            </div>
          ))}
        </div>
      )
    }

    if (reviewsError) {
      return (
        <div className="sdv2-error-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{color:'var(--danger)'}}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>{reviewsError}</p>
          <button className="sdv2-primary-btn" onClick={() => loadReviews(reviewRatingFilter)}>Qayta urinish</button>
        </div>
      )
    }

    return (
    <div className="sdv2-reviews">
      <div className="sdv2-orders-filters">
        {REVIEW_RATING_FILTERS.map(f => (
          <button
            key={f.value}
            className={`sdv2-filter-chip ${reviewRatingFilter === f.value ? 'active' : ''}`}
            onClick={() => setReviewRatingFilter(f.value)}
          >{f.label}</button>
        ))}
      </div>

      {reviews.length === 0 ? (
        <div className="sdv2-empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ color: 'var(--text-muted)' }}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <p>{reviewRatingFilter ? 'Bu reytingda sharh yo\'q' : 'Hali sharh yo\'q'}</p>
        </div>
      ) : (
        <div className="sdv2-reviews-list">
          {reviews.map(review => (
            <div className="sdv2-review-card" key={review._id}>
              <div className="sdv2-review-top">
                <div className="sdv2-order-avatar">{review.buyerName?.[0] || 'U'}</div>
                <div className="sdv2-review-meta">
                  <strong>{review.buyerName || 'Noma\'lum'}</strong>
                  <span className="sdv2-review-product">{review.productName || 'Mahsulot'}</span>
                </div>
                <div className="sdv2-review-right">
                  <div className="sdv2-review-stars">
                    {[1,2,3,4,5].map(s => (
                      <svg key={s} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                        className={s <= review.rating ? 'sdv2-star-filled' : 'sdv2-star-empty'}
                        strokeWidth="1">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    ))}
                  </div>
                  <span className="sdv2-review-date">{review.createdAt ? new Date(review.createdAt).toLocaleDateString('uz-UZ') : ''}</span>
                </div>
              </div>
              {review.text && <p className="sdv2-review-text">{review.text}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
    )
  }

  const [msgInput, setMsgInput] = useState('')
  const messagesEndRef = useRef(null)
  const sellerChatRef = useRef(null)

  useEffect(() => {
    if (sellerChatRef.current) {
      sellerChatRef.current.scrollTop = sellerChatRef.current.scrollHeight
    }
  }, [activeConversation, activeConversation?.messages?.length])

  const handleSellerSend = () => {
    if (!msgInput.trim() || !activeConversation) return
    sendMessage(activeConversation.id, msgInput.trim(), activeConversation.sellerId)
    setMsgInput('')
  }

  const renderMessages = () => (
    <div className="sdv2-messages">
      <div className="sdv2-msg_sidebar">
        <div className="sdv2-msg_sidebar_header">
          <h3>Xabarlar</h3>
          <span className="sdv2-msg_count">{conversations.length}</span>
        </div>
        <div className="sdv2-msg_list">
          {conversations.length === 0 ? (
            <div className="sdv2-msg_empty">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ color: 'var(--text-muted)' }}>
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
              <p>Hali suhbat yo'q</p>
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                className={`sdv2-msg_item ${activeConversation?.id === conv.id ? 'active' : ''}`}
                onClick={() => openConversation(conv)}
              >
                <div className="sdv2-msg_item_avatar" style={{ background: conv.sellerColor || '#3b82f6' }}>
                  {conv.sellerAvatar || 'U'}
                </div>
                <div className="sdv2-msg_item_info">
                  <div className="sdv2-msg_item_top">
                    <span className="sdv2-msg_item_name">{conv.sellerName || 'Foydalanuvchi'}</span>
                    <span className="sdv2-msg_item_time">{conv.lastTime}</span>
                  </div>
                  <div className="sdv2-msg_item_bottom">
                    <span className="sdv2-msg_item_last">{conv.lastMessage}</span>
                    {conv.unread > 0 && <span className="sdv2-msg_item_badge">{conv.unread}</span>}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="sdv2-msg_chat">
        {!activeConversation ? (
          <div className="sdv2-msg_chat_empty">
            <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ color: 'var(--text-muted)' }}>
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <h3>Suhbatni tanlang</h3>
            <p>Chap tomondagi suhbat ro'yxatidan birini tanlang</p>
          </div>
        ) : (
          <>
            <div className="sdv2-msg_chat_header">
              <button className="sdv2-msg_back" onClick={closeConversation}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div className="sdv2-msg_chat_seller">
                <div className="sdv2-msg_chat_avatar" style={{ background: activeConversation.sellerColor || '#3b82f6' }}>
                  {activeConversation.sellerAvatar || 'U'}
                </div>
                <div>
                  <h4>{activeConversation.sellerName || 'Foydalanuvchi'}</h4>
                  <span className="sdv2-msg_online"><span className="sdv2-msg_online_dot"></span> Online</span>
                </div>
              </div>
            </div>

            <div className="sdv2-msg_chat_messages" ref={sellerChatRef}>
              {(activeConversation.messages || []).map(m => (
                <div className={`sdv2-msg_bubble ${m.from === 'user' ? 'seller' : 'user'}`} key={m.id}>
                  {m.from === 'seller' && (
                    <div className="sdv2-msg_bubble_avatar" style={{ background: activeConversation.sellerColor || '#3b82f6' }}>
                      {activeConversation.sellerAvatar || 'U'}
                    </div>
                  )}
                  <div className="sdv2-msg_bubble_content">
                    <p>{m.text}</p>
                    <span>{m.time}</span>
                  </div>
                  {m.from === 'user' && (
                    <div className="sdv2-msg_bubble_avatar seller_avatar">
                      {user?.name?.[0] || 'S'}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="sdv2-msg_chat_input">
              <input
                type="text"
                placeholder="Xabar yozing..."
                value={msgInput}
                onChange={e => setMsgInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSellerSend() } }}
              />
              <button onClick={handleSellerSend} disabled={!msgInput.trim()}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )

  const renderSettings = () => (
    <div className="sdv2-settings">
      <div className="sdv2-settings-card">
        <h3>Do'kon malumotlari</h3>
        <form onSubmit={handleSaveProfile}>
          <div className="sdv2-form-row">
            <div className="sdv2-form-field">
              <label>Ism</label>
              <input type="text" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} placeholder="Ismingiz" />
            </div>
            <div className="sdv2-form-field">
              <label>Do'kon nomi</label>
              <input type="text" value={profileForm.shopName} onChange={e => setProfileForm({ ...profileForm, shopName: e.target.value })} placeholder="Do'kon nomi" />
            </div>
          </div>
          <div className="sdv2-form-row">
            <div className="sdv2-form-field">
              <label>Manzil (matn)</label>
              <input type="text" value={profileForm.location} onChange={e => setProfileForm({ ...profileForm, location: e.target.value })} placeholder="Masalan: Chilonzor tumani, Amir Temur ko'chasi 15" />
            </div>
          </div>
          <div className="sdv2-form-field">
            <label>Tavsif</label>
            <textarea rows={4} value={profileForm.description} onChange={e => setProfileForm({ ...profileForm, description: e.target.value })} placeholder="Do'koningiz haqida qisqacha" />
          </div>

          <div className="sdv2-settings-divider" />

          <div className="sdv2-form-field">
            <label>Do'kon joylashuvi</label>
            <LocationPicker
              lat={profileForm.lat}
              lng={profileForm.lng}
              onChange={({ lat, lng }) => setProfileForm(prev => ({ ...prev, lat, lng }))}
            />
          </div>

          {profileSaveMsg && (
            <div className={`sdv2-submit-msg ${profileSaveMsg.type}`} style={{ marginTop: 12 }}>
              {profileSaveMsg.type === 'success' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              )}
              {profileSaveMsg.text}
            </div>
          )}

          <div className="sdv2-form-actions" style={{ marginTop: 16 }}>
            <button type="submit" className="sdv2-primary-btn">Saqlash</button>
          </div>
        </form>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeSection) {
      case 'overview': return renderOverview()
      case 'products': return renderProducts()
      case 'orders': return renderOrders()
      case 'reviews': return renderReviews()
      case 'settings': return renderSettings()
      default: return renderOverview()
    }
  }

  return (
    <div className="sd-v2">
      <Header />

      <div className="sdv2-breadcrumb">
        <span onClick={() => navigate('/')}>{t('home')}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        <span className="active">Sotuvchi paneli</span>
      </div>

      <div className="sdv2-layout">
        <div className={`sdv2-sidebar-overlay${sidebarOpen ? ' visible' : ''}`} onClick={() => setSidebarOpen(false)} />

        <aside className={`sdv2-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sdv2-sidebar-header">
            <span style={{fontWeight:700,fontSize:16}}>Menyu</span>
            <button className="sdv2-sidebar-close" onClick={() => setSidebarOpen(false)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="sdv2-sidebar-user">
            <div className="sdv2-avatar">{(user.name || 'S')[0].toUpperCase()}</div>
            <div className="sdv2-sidebar-user-info">
              <span className="sdv2-sidebar-user-name">{user.name || 'Sotuvchi'}</span>
              <span className="sdv2-sidebar-user-role">{user.role === 'craftsman' ? 'Usta' : 'Sotuvchi'}</span>
            </div>
          </div>
          <nav className="sdv2-nav">
            {SECTIONS.map(sec => (
              <button
                key={sec.id}
                data-section={sec.id}
                className={`sdv2-nav-item ${activeSection === sec.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveSection(sec.id)
                  setSidebarOpen(false)
                }}
              >
                <span className="sdv2-nav-icon">{sec.icon}</span>
                <span className="sdv2-nav-label">{sec.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="sdv2-main">
          <div className="sdv2-mobile-header">
            <button className="sdv2-menu-toggle" onClick={() => setSidebarOpen(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <h2 className="sdv2-mobile-title">{SECTIONS.find(s => s.id === activeSection)?.label}</h2>
          </div>

          <div className="sdv2-desktop-title">
            <h2>{SECTIONS.find(s => s.id === activeSection)?.label}</h2>
          </div>

          {renderContent()}
        </main>
      </div>

      {showAddForm && (
        <div className="sdv2-modal-overlay" onClick={() => { setShowAddForm(false); setEditProduct(null) }}>
          <div className="sdv2-modal sdv2-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="sdv2-modal-header">
              <h2>{editProduct ? 'Mahsulotni tahrirlash' : "Yangi mahsulot qo'shish"}</h2>
              <button onClick={() => { setShowAddForm(false); setEditProduct(null) }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="sdv2-progress">
              {STEP_LABELS.map((label, i) => (
                <div key={i} className={`sdv2-progress-step ${formStep > i + 1 ? 'done' : ''} ${formStep === i + 1 ? 'active' : ''}`}>
                  <div className="sdv2-progress-dot">
                    {formStep > i + 1 ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : i + 1}
                  </div>
                  <span className="sdv2-progress-label">{label}</span>
                  {i < STEP_LABELS.length - 1 && <div className="sdv2-progress-line" />}
                </div>
              ))}
            </div>

            <div className="sdv2-modal-body">
              {renderFormContent()}
            </div>

            {submitMsg && (
              <div className={`sdv2-submit-msg ${submitMsg.type}`}>
                {submitMsg.type === 'success' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                )}
                {submitMsg.text}
              </div>
            )}

            <div className="sdv2-modal-footer">
              {formStep > 1 && (
                <button type="button" className="sdv2-cancel-btn" onClick={prevStep}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                  Orqaga
                </button>
              )}
              <div className="sdv2-modal-footer-right">
                <button type="button" className="sdv2-cancel-btn" onClick={() => { setShowAddForm(false); setEditProduct(null) }}>Bekor qilish</button>
                {formStep < 3 ? (
                  <button type="button" className="sdv2-primary-btn" onClick={nextStep}>
                    Oldinga
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </button>
                ) : (
                  <button type="button" className="sdv2-primary-btn" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Yuklanmoqda...' : (editProduct ? 'Saqlash' : "Qo'shish")}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  )
}

export default SellerDashboard
