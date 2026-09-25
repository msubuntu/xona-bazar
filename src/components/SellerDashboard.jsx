import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { useMessages } from '../context/MessagesContext.jsx'
import { api } from '../services/api'
import TelegramBotLink from './TelegramBotLink'
import Header from './header'
import Footer from './Footer'
import LocationPicker from './LocationPicker'
import { REVIEWS_ENABLED } from '../data/flags'
import { subcategoriesFor } from '../data/subcategories'
import { specFieldsFor } from '../data/category-features'
import { PasswordModal } from './SettingsModals'
import '../components_css/seller-dashboard-v2.css'

const INITIAL_FORM = { name: '', brand: '', category: 'flooring', subcategory: '', description: '', price: '', oldPrice: '', stock: '' }
const DEFAULT_PRODUCT_FEATURES = [
  { icon: '🏠', label: 'Do\'kondan oling', desc: 'O\'zingiz qulay vaqtda olib keting' },
  { icon: '🔄', label: '7 kun qaytarish', desc: 'Mahsulotni qaytarish imkoniyati' },
  { icon: '🛡️', label: 'Kafolat', desc: 'Sifat va ishonch kafolati' },
  { icon: '💬', label: 'Maslahat', desc: 'Mutaxassislardan bepul maslahat' },
]
const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const MAX_VIDEO_SIZE = 100 * 1024 * 1024
const MIN_IMAGES = 4
const MAX_IMAGES = 6
const MAX_VIDEOS = 1

function SellerDashboard() {
  const { user, updateProfile } = useAuth()
  const { t, convertPrice, lang, setLang } = useSettings()
  const CATEGORIES = [
    { value: 'flooring', label: t('catFlooring') },
    { value: 'walls', label: t('catWalls') },
    { value: 'ceiling', label: t('catCeiling') },
    { value: 'tiles', label: t('catTiles') },
    { value: 'doors', label: t('catDoors') },
    { value: 'plumbing', label: t('catPlumbing') },
    { value: 'electrical', label: t('catElectrical') },
    { value: 'furniture', label: t('catFurniture') },
  ]
  const SECTIONS = [
    { id: 'overview', label: t('overview'), icon: '\u{1F4CA}' },
    { id: 'products', label: t('myProducts'), icon: '\u{1F4E6}' },
    { id: 'orders', label: t('ordersTab'), icon: '\u{1F6D2}' },
    ...(REVIEWS_ENABLED ? [{ id: 'reviews', label: t('allReviews'), icon: '\u{2B50}' }] : []),
    { id: 'settings', label: t('settings'), icon: '\u{2699}\u{FE0F}' },
  ]
  const { dark, toggleTheme } = useTheme()
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
  const [contactingOrderId, setContactingOrderId] = useState(null)

  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewsError, setReviewsError] = useState(null)
  const [reviewRatingFilter, setReviewRatingFilter] = useState(0)

  const [showAddForm, setShowAddForm] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const [form, setForm] = useState(INITIAL_FORM)
  const [features, setFeatures] = useState([])
  const [specs, setSpecs] = useState({})
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

  const [profileForm, setProfileForm] = useState({ name: '', shopName: '', location: '', description: '', lat: null, lng: null, workingHours: '09:00 - 18:00', available: true, social: { telegram: '', instagram: '', website: '' } })
  const [profileSaveMsg, setProfileSaveMsg] = useState(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)

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
      setError(err.message || t('loadDataError'))
    } finally {
      setLoading(false)
    }
  }, [t])

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
      setOrdersError(err.message || t('loadOrdersError'))
    } finally {
      setOrdersLoading(false)
    }
  }, [t])

  const loadReviews = useCallback(async (ratingFilter = 0) => {
    setReviewsLoading(true)
    setReviewsError(null)
    try {
      const params = { page: 1, limit: 50 }
      if (ratingFilter) params.rating = ratingFilter
      const data = await api.sellers.myReviews(params)
      setReviews(data.reviews || [])
    } catch (err) {
      console.error('Reviews load error:', err)
      setReviewsError(err.message || t('loadReviewsError'))
    } finally {
      setReviewsLoading(false)
    }
  }, [t])

  useEffect(() => { if (user?.role === 'seller') loadDashboard() }, [loadDashboard, user?.role])
  useEffect(() => { if (user?.role === 'seller') loadMyProducts() }, [loadMyProducts, user?.role])
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
        workingHours: user.workingHours || '09:00 - 18:00',
        available: user.available !== false,
        social: user.social || { telegram: '', instagram: '', website: '' },
      })
    }
  }, [user])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const urls = imagePreviews.filter(p => p.startsWith('blob:'))
    return () => { urls.forEach(u => URL.revokeObjectURL(u)) }
  }, [])

  const filteredProducts = myProducts.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.brand.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const resetForm = () => {
    setForm(INITIAL_FORM)
    setFeatures(DEFAULT_PRODUCT_FEATURES)
    setSpecs({})
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
      category: product.category || 'flooring',
      subcategory: product.subcategory || '',
      description: product.description || '',
      price: product.price || '',
      oldPrice: product.oldPrice || '',
      stock: product.stock || '',
    })
    setFeatures((product.features && product.features.length > 0) ? product.features.map(f => ({ icon: f.icon || '', label: f.label || '', desc: f.desc || '' })) : DEFAULT_PRODUCT_FEATURES)
    setSpecs((product.specs && typeof product.specs === 'object') ? Object.fromEntries(Object.entries(product.specs).filter(([, v]) => v != null && String(v).trim() !== '')) : {})
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
        errors.push(`${t('maxImages')} ${MAX_IMAGES} ${t('imagesUploadSuffix')}`)
        break
      }
      if (!file.type.startsWith('image/')) {
        errors.push(`${file.name}: ${t('imageFilesOnly')}`)
        continue
      }
      if (file.size > MAX_IMAGE_SIZE) {
        errors.push(`${file.name}: ${t('imageTooLarge')}`)
        continue
      }
      newFiles.push(file)
      newPreviews.push(URL.createObjectURL(file))
    }

    if (errors.length) {
      setFormErrors(prev => ({ ...prev, image: errors.join('; ') }))
    } else {
      setFormErrors(prev => { const { image: _image, ...rest } = prev; return rest })
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
      setFormErrors(prev => ({ ...prev, video: t('mp4Only') }))
      if (e.target) e.target.value = ''
      return
    }
    if (file.size > MAX_VIDEO_SIZE) {
      setFormErrors(prev => ({ ...prev, video: t('videoTooLarge') }))
      if (e.target) e.target.value = ''
      return
    }
    if (videoPreview && videoPreview.startsWith('blob:')) URL.revokeObjectURL(videoPreview)
    setVideoFile(file)
    setVideoPreview(URL.createObjectURL(file))
    setEditVideoUrl('')
    setFormErrors(prev => { const { video: _video, ...rest } = prev; return rest })
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
        errors.push(`${t('variant')} ${idx + 1}: ${t('maxImages')} ${MAX_IMAGES} ${t('imagesUploadSuffix')}`)
        break
      }
      if (!file.type.startsWith('image/')) {
        errors.push(`${file.name}: ${t('imageFilesOnly')}`)
        continue
      }
      if (file.size > MAX_IMAGE_SIZE) {
        errors.push(`${file.name}: ${t('imageTooLarge')}`)
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

  // ── Features (pd_features — xaridorni jalb qiluvchi afzalliklar) ──
  const updateFeature = (idx, key, value) => {
    setFeatures(prev => prev.map((f, i) => i === idx ? ({ ...f, [key]: value }) : f))
  }

  const removeFeature = (idx) => {
    setFeatures(prev => prev.filter((_, i) => i !== idx))
  }

  const addFeature = () => {
    setFeatures(prev => [...prev, { icon: '✅', label: '', desc: '' }])
  }

  const FEATURE_ICONS = ['✅', '🏠', '🔄', '🛡️', '💬', '🚚', '📦', '💰', '⭐', '🔩', '👷', '🎨']


  const validateStep = (step) => {
    const errors = {}
    if (step === 1) {
      if (!form.name.trim()) errors.name = t('enterProductName')
      if (!form.brand.trim()) errors.brand = t('enterBrand')
      if (!form.description.trim()) errors.description = t('enterDescription')
      // Features: majburiy, kamida 2 ta (label to'ldirilgan holatda)
      const validFeatures = features.filter(f => f.label && f.label.trim())
      if (validFeatures.length < 2) {
        errors.features = t('minFeatures2')
      } else {
        const emptyDesc = validFeatures.find(f => !f.desc || !f.desc.trim())
        if (emptyDesc) errors.features = t('featureDescRequired')
      }
    }
    if (step === 2) {
      const specFields = specFieldsFor(form.category)
      const missingSpecs = specFields.filter(f => f.required && !(specs[f.key] || '').trim())
      if (missingSpecs.length > 0) {
        errors.specs = t('specRequiredError')
      }
      if (hasVariants) {
        if (variants.length === 0) {
          errors.variants = t('addAtLeastOneVariant')
        } else {
          const invalidPrice = variants.find(v => !v.price || Number(v.price) <= 0)
          if (invalidPrice) errors.variants = t('variantPricePositive')
          variants.forEach((v, i) => {
            const n = (v.previews || []).length
            if (n < MIN_IMAGES || n > MAX_IMAGES) {
              if (!errors.variants) errors.variants = ''
              errors['variant_' + i] = `${t('variant')} #${i + 1}: ${MIN_IMAGES}-${MAX_IMAGES} ${t('imagesUploaded')} (${t('currently')} ${n} ${t('countShort')})`
            }
          })
        }
      } else {
        if (!form.price || Number(form.price) <= 0) errors.price = t('enterPrice')
        const n = imagePreviews.length
        if (n < MIN_IMAGES || n > MAX_IMAGES) {
          errors.image = `${MIN_IMAGES}-${MAX_IMAGES} ${t('imagesUploaded')} (${t('currently')} ${n} ${t('countShort')})`
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
    fd.append('subcategory', form.subcategory || '')
    fd.append('description', form.description.trim())
    fd.append('price', Number(form.price))
    if (form.oldPrice) fd.append('oldPrice', Number(form.oldPrice))
    fd.append('stock', Number(form.stock) || 0)
    fd.append('specs', JSON.stringify(specs))
    const cleanedFeatures = features
      .filter(f => f.label && f.label.trim())
      .map(f => ({ icon: f.icon || '', label: f.label.trim(), desc: (f.desc || '').trim() }))
    fd.append('features', JSON.stringify(cleanedFeatures))
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
        setSubmitMsg({ type: 'success', text: t('productUpdated') })
      } else {
        await api.products.create(fd)
        setSubmitMsg({ type: 'success', text: t('productAdded') })
      }
      loadDashboard()
      loadMyProducts()
      setTimeout(() => { setShowAddForm(false); resetForm() }, 1200)
    } catch (err) {
      setSubmitMsg({ type: 'error', text: err.message || t('errorOccurred') })
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
        workingHours: profileForm.workingHours,
        available: profileForm.available,
        social: profileForm.social,
      })
      setProfileSaveMsg({ type: 'success', text: t('saved') })
      setTimeout(() => setProfileSaveMsg(null), 3000)
    } catch (err) {
      setProfileSaveMsg({ type: 'error', text: err.message || t('error') })
    }
  }

  // ── Joylashuv ↔ manzil matni ikki tomonlama sinxronizatsiya ──
  // Koordinata → manzil matni (xaritada belgilanganda matn maydoni ham yangilanadi)
  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=17&accept-language=uz`)
      const data = await res.json()
      return data?.display_name || ''
    } catch { return '' }
  }

  // Manzil matni → koordinata (matn yozilganda xarita markerni ko'chiradi)
  const geocodeAddress = async (address) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&accept-language=uz`)
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
      }
      return null
    } catch { return null }
  }

  const handleLocationChange = async ({ lat, lng }) => {
    setProfileForm(prev => ({ ...prev, lat, lng }))
    const address = await reverseGeocode(lat, lng)
    if (address) setProfileForm(prev => ({ ...prev, location: address }))
  }

  const handleAddressGeocode = async () => {
    const address = (profileForm.location || '').trim()
    if (address.length < 5) return
    const coords = await geocodeAddress(address)
    if (coords) setProfileForm(prev => ({ ...prev, lat: coords.lat, lng: coords.lng }))
  }

  const setSocial = (field, value) => {
    setProfileForm(prev => ({ ...prev, social: { ...prev.social, [field]: value } }))
  }

  const goToProducts = () => {
    setActiveSection('products')
    openAddForm()
  }

  const categoryLabel = (val) => CATEGORIES.find(c => c.value === val)?.label || val
  const subcategoryLabel = (cat, sub) => {
    const sc = subcategoriesFor(cat).find(x => x.id === sub)
    return sc ? t(sc.labelKey) : ''
  }

  const STEP_LABELS = [t('stepBasic'), t('stepPriceImages'), t('stepConfirm')]

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
    setFormErrors(prev => { const { variants: _variants, price: _price, ...rest } = prev; return rest })
  }

  /* ──────── Multi-step form modal ──────── */

  const renderFormStep1 = () => (
    <div className="sdv2-step-fields">
      <div className="sdv2-form-field">
        <label>{t('productName')} *</label>
        <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t('productNamePlaceholder')} />
        {formErrors.name && <span className="sdv2-field-error">{formErrors.name}</span>}
      </div>
      <div className="sdv2-form-field">
        <label>{t('brand')} *</label>
        <input type="text" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} placeholder={t('brandPlaceholder')} />
        {formErrors.brand && <span className="sdv2-field-error">{formErrors.brand}</span>}
      </div>
      <div className="sdv2-form-field">
        <label>{t('category')}</label>
        <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value, subcategory: '' })}>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>
      <div className="sdv2-form-field">
        <label>{t('subcategory')}</label>
        <select value={form.subcategory} onChange={e => setForm({ ...form, subcategory: e.target.value })}>
          <option value="">{t('selectSubcategory')}</option>
          {subcategoriesFor(form.category).map(sc => (
            <option key={sc.id} value={sc.id}>{t(sc.labelKey)}</option>
          ))}
        </select>
      </div>
      <div className="sdv2-form-field">
        <label>{t('shortDescription')} *</label>
        <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={t('shortDescriptionPlaceholder')} />
        {formErrors.description && <span className="sdv2-field-error">{formErrors.description}</span>}
      </div>

      <div className="sdv2-form-field">
        <label>{t('productFeatures')} <span style={{ color: '#ef4444' }}>*</span> <small>(kamida 2 ta)</small></label>
        <div className="sdv2-features-list">
          {features.map((f, idx) => (
            <div className="sdv2-feature-row" key={idx}>
              <div className="sdv2-feature-icon">
                <input type="text" value={f.icon} maxLength={4}
                  onChange={e => updateFeature(idx, 'icon', e.target.value)}
                  placeholder="🎁" />
              </div>
              <div className="sdv2-feature-inputs">
                <input type="text" value={f.label} placeholder="Masalan: Do\'kondan oling"
                  onChange={e => updateFeature(idx, 'label', e.target.value)} />
                <input type="text" value={f.desc} placeholder="Qisqa tushuntirish"
                  onChange={e => updateFeature(idx, 'desc', e.target.value)} />
              </div>
              <button type="button" className="sdv2-feature-remove" onClick={() => removeFeature(idx)} title={t('delete')}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="sdv2-feature-add-btn" onClick={addFeature}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {t('addFeature')}
        </button>
        {formErrors.features && <span className="sdv2-field-error">{formErrors.features}</span>}
      </div>
    </div>
  )

  const renderFormStep2 = () => (
    <div className="sdv2-step-fields">
      <div className="sdv2-upload-limits">
        <div className="sdv2-upload-limits-title">📋 {t('mediaLimitsTitle')}</div>
        <div className="sdv2-upload-limits-row">🖼 {t('mediaLimitsImageSize')} · {MIN_IMAGES}–{MAX_IMAGES} {t('images')}</div>
        <div className="sdv2-upload-limits-row">🎥 {t('mediaLimitsVideoSize')}</div>
      </div>
      <div className="sdv2-specs-section">
        <div className="sdv2-specs-title">
          <span>{t('specSectionTitle')}</span>
          <small>{t('specRequiredHint')}</small>
        </div>
        <div className="sdv2-form-row">
          {specFieldsFor(form.category).map(field => (
            <div className="sdv2-form-field" key={field.key}>
              <label>{t(field.labelKey)}{field.required && <span style={{ color: '#ef4444' }}> *</span>}</label>
              <input
                type="text"
                value={specs[field.key] || ''}
                onChange={e => setSpecs(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={t(field.placeholderKey)}
              />
            </div>
          ))}
        </div>
        {formErrors.specs && <span className="sdv2-field-error">{formErrors.specs}</span>}
      </div>
      <div className="sdv2-variant-toggle">
        <label className="sdv2-toggle-label">
          <span className="sdv2-toggle-track" data-active={hasVariants} onClick={toggleHasVariants}>
            <span className="sdv2-toggle-thumb" />
          </span>
          <span className="sdv2-toggle-text">
            <strong>{t('hasVariants')}</strong>
            <span>{t('addVariantsHint')}</span>
          </span>
        </label>
      </div>

      {formErrors.variants && <span className="sdv2-field-error" style={{ marginBottom: 12, display: 'block' }}>{formErrors.variants}</span>}

      {!hasVariants ? (
        <>
          <div className="sdv2-form-row">
            <div className="sdv2-form-field">
              <label>{t('priceInUzs')} *</label>
              <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="1500000" />
              {formErrors.price && <span className="sdv2-field-error">{formErrors.price}</span>}
            </div>
            <div className="sdv2-form-field">
              <label>{t('oldPriceOptional')}</label>
              <input type="number" value={form.oldPrice} onChange={e => setForm({ ...form, oldPrice: e.target.value })} placeholder="1800000" />
            </div>
                    </div>
          <div className="sdv2-form-field">
            <label>{t('stockCount')}</label>
            <input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} placeholder="10" />
          </div>
          <div className="sdv2-form-field">
            <label>{t('productImages')} ({imagePreviews.length}/{MAX_IMAGES}) *</label>
            <div className="sdv2-upload-grid">
              {imagePreviews.map((preview, i) => (
                <div className="sdv2-upload-thumb" key={i}>
                  {preview ? <img src={preview} alt={`${t('image')} ${i + 1}`} /> : (
                    <div className="sdv2-upload-thumb-empty">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-muted)' }}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                    </div>
                  )}
                  {i === 0 && <span className="sdv2-thumb-badge">{t('defaultBadge')}</span>}
                  <button type="button" className="sdv2-upload-remove-sm" onClick={() => removeImage(i)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
              {imagePreviews.length < MAX_IMAGES && (
                <div className="sdv2-upload-add" onClick={() => fileInputRef.current?.click()}>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="sdv2-file-input" />
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)' }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  <span>{t('addBtn')}</span>
                </div>
              )}
            </div>
            <span className="sdv2-upload-hint">JPG, PNG, WEBP - {t('eachMax5MB')}, {MIN_IMAGES}-{MAX_IMAGES} {t('images')} | {t('squareFormatHint')} (1000x1000px) {t('recommended')}</span>
            {formErrors.image && <span className="sdv2-field-error">{formErrors.image}</span>}
          </div>
        </>
      ) : (
        <div className="sdv2-variants-list">
          {variants.map((v, idx) => (
            <div className="sdv2-variant-card" key={v._id || idx}>
              <div className="sdv2-variant-card-header">
                <span className="sdv2-variant-num">#{idx + 1}</span>
                <button type="button" className="sdv2-variant-remove" onClick={() => removeVariant(idx)} title={t('delete')}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div className="sdv2-variant-fields">
                <div className="sdv2-variant-row">
                  <div className="sdv2-form-field" style={{ flex: 1 }}>
                    <label>{t('colorName')}</label>
                    <input type="text" value={v.color} onChange={e => updateVariant(idx, 'color', e.target.value)} placeholder={t('colorPlaceholder')} />
                  </div>
                  <div className="sdv2-form-field" style={{ flex: '0 0 auto' }}>
                    <label>{t('color')}</label>
                    <div className="sdv2-color-input-wrap">
                      <input type="color" value={v.colorHex || '#800020'} onChange={e => updateVariant(idx, 'colorHex', e.target.value)} className="sdv2-color-input" />
                      {v.colorHex && <span className="sdv2-color-dot" style={{ background: v.colorHex }} />}
                    </div>
                  </div>
                  <div className="sdv2-form-field" style={{ flex: 1 }}>
                    <label>{t('size')}</label>
                    <input type="text" value={v.size} onChange={e => updateVariant(idx, 'size', e.target.value)} placeholder={t('sizePlaceholder')} />
                  </div>
                </div>
                <div className="sdv2-variant-row">
                  <div className="sdv2-form-field" style={{ flex: 1 }}>
                    <label>{t('priceInUzs')} *</label>
                    <input type="number" value={v.price} onChange={e => updateVariant(idx, 'price', e.target.value)} placeholder="80000" />
                  </div>
                  <div className="sdv2-form-field" style={{ flex: 1 }}>
                    <label>{t('oldPrice')}</label>
                    <input type="number" value={v.oldPrice} onChange={e => updateVariant(idx, 'oldPrice', e.target.value)} placeholder="95000" />
                  </div>
                  <div className="sdv2-form-field" style={{ flex: 1 }}>
                    <label>{t('stockWord')}</label>
                    <input type="number" value={v.stock} onChange={e => updateVariant(idx, 'stock', e.target.value)} placeholder="10" />
                  </div>
                </div>
                <div className="sdv2-variant-row">
                  <div className="sdv2-form-field" style={{ flex: 1 }}>
                    <label>{t('skuOptional')}</label>
                    <input type="text" value={v.sku} onChange={e => updateVariant(idx, 'sku', e.target.value)} placeholder={t('skuPlaceholder')} />
                  </div>
                                    <div className="sdv2-form-field">
                    <label>{t('variant')} #{idx + 1} {t('variantImages')} ({(v.previews || []).length}/{MAX_IMAGES}) *</label>
                    <div className="sdv2-upload-grid">
                      {(v.previews || []).map((prev, pi) => (
                        <div className="sdv2-upload-thumb" key={pi}>
                          {prev ? <img src={prev} alt={`${t('variant')} ${idx + 1} ${t('image')} ${pi + 1}`} /> : (
                            <div className="sdv2-upload-thumb-empty">
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-muted)' }}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                            </div>
                          )}
                          {pi === 0 && <span className="sdv2-thumb-badge">{t('defaultBadge')}</span>}
                          <button type="button" className="sdv2-upload-remove-sm" onClick={() => removeVariantImage(idx, pi)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </div>
                      ))}
                      {(v.previews || []).length < MAX_IMAGES && (
                        <div className="sdv2-upload-add" onClick={() => document.getElementById(`variant-img-${idx}`)?.click()}>
                          <input id={`variant-img-${idx}`} type="file" accept="image/*" multiple onChange={(e) => handleVariantImageSelect(idx, e)} className="sdv2-file-input" />
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)' }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          <span>{t('addBtn')}</span>
                        </div>
                      )}
                    </div>
                    <span className="sdv2-upload-hint">{t('perVariantImages')} {MIN_IMAGES}-{MAX_IMAGES} {t('images')} | {t('squareFormatRecommended')}</span>
                    {formErrors['variant_' + idx] && <span className="sdv2-field-error">{formErrors['variant_' + idx]}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button type="button" className="sdv2-variant-add-btn" onClick={addVariant}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {t('addVariant')}
          </button>
        </div>
      )}

            {/* ── Butun mahsulotga 1 ta video (MP4) ── */}
      <div className="sdv2-form-field">
        <label>{t('productVideo')}</label>
        {(videoPreview && videoPreview.startsWith('/uploads/')) || videoFile ? (
          <div className="sdv2-video-preview">
            <video src={videoFile ? videoPreview : (editVideoUrl || videoPreview)} controls />
            <div className="sdv2-video-meta">
              <span className="sdv2-video-name">{videoFile ? videoFile.name : (editVideoUrl || videoPreview).split('/').pop()}</span>
              <button type="button" className="sdv2-upload-remove-sm" onClick={removeVideo} title={t('delete')}>
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
            <span>{t('uploadVideo')}</span>
          </div>
        )}
        <span className="sdv2-upload-hint">{t('videoHint')}</span>
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
          <h4>{form.name || t('unnamedProduct')}</h4>
          <span className="sdv2-confirm-category">{categoryLabel(form.category)}{form.subcategory ? ` · ${subcategoryLabel(form.category, form.subcategory)}` : ''}</span>
          {form.description && <p className="sdv2-confirm-desc">{form.description}</p>}
          {!hasVariants ? (
            <div className="sdv2-confirm-prices">
              <span className="sdv2-confirm-price">{form.price ? convertPrice(Number(form.price)) : '\u2014'}</span>
              {form.oldPrice && <span className="sdv2-confirm-old">{convertPrice(Number(form.oldPrice))}</span>}
            </div>
          ) : (
            <div className="sdv2-confirm-variants">
              <span className="sdv2-confirm-variants-title">{t('variants')} ({variants.length}):</span>
              {variants.map((v, i) => (
                <div className="sdv2-confirm-variant" key={v._id || i}>
                  <span className="sdv2-confirm-variant-dot" style={{ background: v.colorHex || '#94a3b8' }} />
                  <span className="sdv2-confirm-variant-info">
                    {[v.color, v.size].filter(Boolean).join(' / ') || `${t('variant')} ${i + 1}`}
                  </span>
                  <span className="sdv2-confirm-variant-price">
                    {v.price ? convertPrice(Number(v.price)) : '—'}
                    {v.oldPrice && <s>{convertPrice(Number(v.oldPrice))}</s>}
                  </span>
                  {v.stock != null && v.stock !== '' && <span className="sdv2-confirm-variant-stock">{v.stock} {t('countShort')}</span>}
                </div>
              ))}
            </div>
          )}
          {form.stock && !hasVariants && <span className="sdv2-confirm-stock">{t('inStock')}: {form.stock} {t('countShort')}</span>}
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
          <button className="sdv2-primary-btn" onClick={loadDashboard}>{t('retry')}</button>
        </div>
      )
    }

const ORDER_STATUS_LABELS = { pending: t('st_pending'), confirmed: t('st_confirmed'), shipping: t('st_shipping'), delivered: t('st_delivered'), completed: t('st_completed'), cancelled: t('st_cancelled') }

    return (
    <div className="sdv2-overview">
      <div className="sdv2-stats">
        <div className="sdv2-stat-card">
          <div className="sdv2-stat-icon blue">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
          </div>
          <div className="sdv2-stat-info">
            <span className="sdv2-stat-value">{stats.totalProducts}</span>
            <span className="sdv2-stat-label">{t('products')}</span>
          </div>
        </div>
        <div className="sdv2-stat-card">
          <div className="sdv2-stat-icon green">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
          </div>
          <div className="sdv2-stat-info">
            <span className="sdv2-stat-value">{stats.totalOrders}</span>
            <span className="sdv2-stat-label">{t('ordersTab')}</span>
            {stats.pendingOrders > 0 && <span className="sdv2-stat-badge">{stats.pendingOrders} {t('new')}</span>}
          </div>
        </div>
        <div className="sdv2-stat-card">
          <div className="sdv2-stat-icon amber">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
          </div>
          <div className="sdv2-stat-info">
            <span className="sdv2-stat-value">{convertPrice(stats.totalRevenue)}</span>
            <span className="sdv2-stat-label">{t('revenue')}</span>
          </div>
        </div>
        {REVIEWS_ENABLED && (
        <div className="sdv2-stat-card">
          <div className="sdv2-stat-icon purple">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <div className="sdv2-stat-info">
            <span className="sdv2-stat-value">{stats.averageRating > 0 ? stats.averageRating : '\u2014'}</span>
            <span className="sdv2-stat-label">{t('averageRating')}</span>
          </div>
        </div>
        )}
      </div>

      <div className="sdv2-recent-grid">
        <div className="sdv2-recent">
          <div className="sdv2-recent-header">
            <h3>{t('recentProducts')}</h3>
            <button className="sdv2-link-btn" onClick={() => setActiveSection('products')}>{t('viewAll')}</button>
          </div>
          {recentProducts.length === 0 ? (
            <div className="sdv2-empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-muted)' }}>
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
              </svg>
              <p>{t('noProductsYet')}</p>
              <button className="sdv2-primary-btn" onClick={goToProducts}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                {t('addProduct')}
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
                    <span className={`sdv2-recent-status ${p.status}`}>{p.status === 'active' ? t('active') : t('paused')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sdv2-recent">
          <div className="sdv2-recent-header">
            <h3>{t('recentOrders')}</h3>
            <button className="sdv2-link-btn" onClick={() => setActiveSection('orders')}>{t('viewAll')}</button>
          </div>
          {recentOrders.length === 0 ? (
            <div className="sdv2-empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{color:'var(--text-muted)'}}>
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
              </svg>
              <p>{t('noOrdersYet')}</p>
            </div>
          ) : (
            <div className="sdv2-recent-list">
              {recentOrders.map(o => (
                <div className="sdv2-recent-item" key={o._id}>
                  <div className="sdv2-order-avatar">{o.buyer?.name?.[0] || '?'}</div>
                  <div className="sdv2-recent-info">
                    <span className="sdv2-recent-brand">{o.buyer?.name || t('unknown')}</span>
                    <span className="sdv2-recent-name">{o.items.length} {t('items')} · {convertPrice(o.total)}</span>
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
          <input type="text" placeholder={t('searchProduct')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <button className="sdv2-primary-btn" onClick={openAddForm}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
{t('newProduct')}
        </button>
      </div>

      <div className="sdv2-products-table">
        <div className="sdv2-table-header">
          <span className="sdv2-col-img">{t('image')}</span>
          <span className="sdv2-col-name">{t('nameLabel')}</span>
          <span className="sdv2-col-price">{t('price')}</span>
          <span className="sdv2-col-stock">{t('stockWord')}</span>
          <span className="sdv2-col-sold">{t('soldWord')}</span>
          <span className="sdv2-col-status">{t('status')}</span>
          <span className="sdv2-col-actions">{t('actions')}</span>
        </div>

        {loading ? (
          <div className="sdv2-no-data">{t('loading')}</div>
        ) : filteredProducts.length === 0 ? (
          <div className="sdv2-no-data">{t('noProducts')}</div>
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
                  return <span className={`sdv2-stock ${totalStock < 10 ? 'low' : ''}`}>{totalStock} {t('countShort')}</span>
                })()}
              </div>
              <div className="sdv2-col-sold">{p.sold || 0}</div>
              <div className="sdv2-col-status">
                <span className={`sdv2-status-badge ${p.status}`}>{p.status === 'active' ? t('active') : t('paused')}</span>
              </div>
              <div className="sdv2-col-actions">
                <button className="sdv2-action edit" onClick={() => openEditForm(p)} title={t('edit')}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button className={`sdv2-action toggle ${p.status === 'active' ? 'pause' : 'play'}`} onClick={() => toggleStatus(p)} title={p.status === 'active' ? t('pause') : t('enable')}>
                  {p.status === 'active' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  )}
                </button>
                <button className="sdv2-action delete" onClick={() => handleDelete(p._id)} title={t('delete')}>
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
    { value: '', label: t('all') },
    { value: 'pending', label: t('st_pending') },
    { value: 'confirmed', label: t('st_confirmed') },
    { value: 'completed', label: t('filterCompleted') },
    { value: 'cancelled', label: t('st_cancelled') },
  ]

  const ORDER_STATUS_LABELS = { pending: t('st_pending'), confirmed: t('st_confirmed'), shipping: t('st_shipping'), delivered: t('st_delivered'), completed: t('st_completed'), cancelled: t('st_cancelled') }

  const STATUS_FLOW = ['pending', 'confirmed', 'completed']

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

  const handleContactBuyer = async (order) => {
    if (!order?.buyer?._id) return
    setContactingOrderId(order._id)
    try {
      const { conversation } = await api.conversations.start(order.buyer._id)
      navigate(`/messages?conv=${conversation._id}`)
    } catch (err) {
      console.error('Contact buyer error:', err)
    } finally {
      setContactingOrderId(null)
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
          <button className="sdv2-primary-btn" onClick={() => loadOrders(orderStatusFilter)}>{t('retry')}</button>
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
          <p>{orderStatusFilter ? t('noOrdersForFilter') : t('noOrdersYet')}</p>
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
                      <strong>{order.buyer?.name || t('unknown')}</strong>
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
                  <span className="sdv2-order-total">{t('total')}: {convertPrice(order.total)}</span>
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
                    {order.status !== 'cancelled' && order.status !== 'delivered' && order.status !== 'completed' && (
                      <button
                        className="sdv2-cancel-btn sm"
                        disabled={updatingOrderId === order._id}
                        onClick={() => handleStatusUpdate(order._id, 'cancelled')}
                      >
{t('cancel')}
                      </button>
                    )}
                    <button
                      className="sdv2-primary-btn sm ghost"
                      disabled={contactingOrderId === order._id}
                      onClick={() => handleContactBuyer(order)}
                    >
                      {contactingOrderId === order._id ? '...' : t('writeMessageBtn')}
                    </button>
                  </div>
                </div>

                {order.address && <div className="sdv2-order-address">{t('address')}: {order.address}</div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
    )
  }

  const REVIEW_RATING_FILTERS = [
    { value: 0, label: t('all') },
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
          <button className="sdv2-primary-btn" onClick={() => loadReviews(reviewRatingFilter)}>{t('retry')}</button>
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
          <p>{reviewRatingFilter ? t('noReviewsForRating') : t('noReviews')}</p>
        </div>
      ) : (
        <div className="sdv2-reviews-list">
          {reviews.map(review => (
            <div className="sdv2-review-card" key={review._id}>
              <div className="sdv2-review-top">
                <div className="sdv2-order-avatar">{review.buyerName?.[0] || 'U'}</div>
                <div className="sdv2-review-meta">
                  <strong>{review.buyerName || t('unknown')}</strong>
                  <span className="sdv2-review-product">{review.productName || t('product')}</span>
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

  useEffect(() => {
    if (user?.role === 'craftsman') {
      navigate('/craftsman-dashboard', { replace: true })
    }
  }, [user, navigate])

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
    return null
  }

  const handleSellerSend = () => {
    if (!msgInput.trim() || !activeConversation) return
    sendMessage(activeConversation.id, msgInput.trim(), activeConversation.sellerId)
    setMsgInput('')
  }

  const renderMessages = () => (
    <div className="sdv2-messages">
      <div className="sdv2-msg_sidebar">
        <div className="sdv2-msg_sidebar_header">
          <h3>{t('messages')}</h3>
          <span className="sdv2-msg_count">{conversations.length}</span>
        </div>
        <div className="sdv2-msg_list">
          {conversations.length === 0 ? (
            <div className="sdv2-msg_empty">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ color: 'var(--text-muted)' }}>
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
              <p>{t('noChats')}</p>
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
                    <span className="sdv2-msg_item_name">{conv.sellerName || t('user')}</span>
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
            <h3>{t('selectConversation')}</h3>
            <p>{t('selectChatFromLeft')}</p>
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
                  <h4>{activeConversation.sellerName || t('user')}</h4>
                  <span className="sdv2-msg_online"><span className="sdv2-msg_online_dot"></span>{' '}{t('online')}</span>
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
                placeholder={t('writeMessage')}
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
        <h3>{t('shopInfo')}</h3>
        <form onSubmit={handleSaveProfile}>
          <div className="sdv2-form-row">
            <div className="sdv2-form-field">
              <label>{t('firstName')}</label>
              <input type="text" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} placeholder={t('yourName')} />
            </div>
            <div className="sdv2-form-field">
              <label>{t('shopName')}</label>
              <input type="text" value={profileForm.shopName} onChange={e => setProfileForm({ ...profileForm, shopName: e.target.value })} placeholder={t('shopName')} />
            </div>
          </div>
          <div className="sdv2-form-row">
            <div className="sdv2-form-field">
              <label>{t('locationText')}</label>
              <input
                type="text"
                value={profileForm.location}
                onChange={e => setProfileForm({ ...profileForm, location: e.target.value })}
                onBlur={handleAddressGeocode}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddressGeocode() } }}
                placeholder={t('locationTextPlaceholder')}
              />
            </div>
          </div>
          <div className="sdv2-form-field">
            <label>{t('description')}</label>
            <textarea rows={4} value={profileForm.description} onChange={e => setProfileForm({ ...profileForm, description: e.target.value })} placeholder={t('sellerDescPlaceholder')} />
          </div>

          <div className="sdv2-settings-divider" />

          <div className="sdv2-form-field">
            <label>{t('shopLocation')}</label>
            <LocationPicker
              lat={profileForm.lat}
              lng={profileForm.lng}
              onChange={handleLocationChange}
            />
          </div>

          <div className="sdv2-settings-divider" />

          <div className="sdv2-form-row">
            <div className="sdv2-form-field">
              <label>{t('workingHours')}</label>
              <input type="text" value={profileForm.workingHours} onChange={e => setProfileForm({ ...profileForm, workingHours: e.target.value })} placeholder="09:00 - 18:00" />
            </div>
            <div className="sdv2-form-field">
              <label>{t('status')}</label>
              <button
                type="button"
                className={`sdv2-availability-toggle ${profileForm.available ? 'available' : 'busy'}`}
                onClick={() => setProfileForm(prev => ({ ...prev, available: !prev.available }))}
              >
                <span className="sdv2-toggle-dot" />
                {profileForm.available ? `🟢 ${t('open')}` : `🔴 ${t('closed')}`}
              </button>
            </div>
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
            <button type="submit" className="sdv2-primary-btn">{t('saveBtn')}</button>
          </div>
        </form>
      </div>

      <div className="sdv2-settings-card" style={{ marginTop: 20 }}>
        <h3>{t('socialLinks')}</h3>
        <form onSubmit={handleSaveProfile}>
          <div className="sdv2-form-row">
            <div className="sdv2-form-field">
              <label>{t('telegram')}</label>
              <input type="text" value={profileForm.social.telegram} onChange={e => setSocial('telegram', e.target.value)} placeholder={t('telegramPlaceholder')} />
            </div>
            <div className="sdv2-form-field">
              <label>{t('instagram')}</label>
              <input type="text" value={profileForm.social.instagram} onChange={e => setSocial('instagram', e.target.value)} placeholder={t('instagramPlaceholder')} />
            </div>
          </div>
          <div className="sdv2-form-field">
            <label>{t('website')}</label>
            <input type="text" value={profileForm.social.website} onChange={e => setSocial('website', e.target.value)} placeholder={t('websitePlaceholder')} />
          </div>
          <div className="sdv2-settings-hint">{t('socialLinksHint')}</div>
          <div className="sdv2-form-actions" style={{ marginTop: 12 }}>
            <button type="submit" className="sdv2-primary-btn">{t('saveBtn')}</button>
          </div>
        </form>
      </div>

      <div className="sdv2-settings-card" style={{ marginTop: 20 }}>
        <h3>{t('accountSecurity')}</h3>
        <div className="sdv2-security-row">
          <button
            type="button"
            className="sdv2-security-btn"
            onClick={() => setShowPasswordModal(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            {t('changePassword')}
          </button>
        </div>
      </div>

      <div className="sdv2-settings-card" style={{ marginTop: 20 }}>
        <h3>{t('appSettings')}</h3>
        <div className="sdv2-form-row">
          <div className="sdv2-form-field">
            <label>{t('chooseLanguage')}</label>
            <select value={lang} onChange={e => setLang(e.target.value)}>
              <option value="uz">{t('langUzbek')}</option>
              <option value="ru">{t('ru')}</option>
              <option value="en">{t('en')}</option>
            </select>
          </div>
          <div className="sdv2-form-field">
            <label>{t('viewMode')}</label>
            <button type="button" className={`sdv2-security-btn ${dark ? 'active' : ''}`} onClick={toggleTheme} style={{ width: '100%' }}>
              {dark ? `🌙 ${t('darkModeLabel')}` : `☀️ ${t('lightModeLabel')}`}
            </button>
          </div>
        </div>
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <TelegramBotLink />
        </div>
      </div>

      {showPasswordModal && <PasswordModal onClose={() => setShowPasswordModal(false)} />}
    </div>
  )

  const renderContent = () => {
    if (user?.status === 'pending') {
      return (
        <div className="sdv2-pending-block">
          <div className="sdv2-pending-card">
            <div className="sdv2-pending-icon">⏳</div>
            <h3>{t('moderationPendingTitle')}</h3>
            <p>{t('moderationPendingDesc')}</p>
          </div>
        </div>
      )
    }
    if (user?.status === 'rejected') {
      return (
        <div className="sdv2-pending-block">
          <div className="sdv2-pending-card">
            <div className="sdv2-pending-icon">🚫</div>
            <h3>{t('moderationRejectedTitle')}</h3>
            <p>{t('moderationRejectedDesc')}</p>
          </div>
        </div>
      )
    }
    switch (activeSection) {
      case 'overview': return renderOverview()
      case 'products': return renderProducts()
      case 'orders': return renderOrders()
      case 'reviews': return REVIEWS_ENABLED ? renderReviews() : renderOverview()
      case 'settings': return renderSettings()
      default: return renderOverview()
    }
  }

  return (
    <div className="sd-v2">
      <Header />

      {/* Breadcrumb olib tashlandi — lekin joyi (hajmi) saqlanadi */}
      <div className="sdv2-breadcrumb" aria-hidden="true" />

      <div className="sdv2-layout">
        <div className={`sdv2-sidebar-overlay${sidebarOpen ? ' visible' : ''}`} onClick={() => setSidebarOpen(false)} />

        <aside className={`sdv2-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sdv2-sidebar-header">
            <span style={{fontWeight:700,fontSize:16}}>{t('menu')}</span>
            <button className="sdv2-sidebar-close" onClick={() => setSidebarOpen(false)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="sdv2-sidebar-user">
            <div className="sdv2-avatar">{(user.name || 'S')[0].toUpperCase()}</div>
            <div className="sdv2-sidebar-user-info">
              <span className="sdv2-sidebar-user-name">{user.name || t('seller')}</span>
              <span className="sdv2-sidebar-user-role">{user.role === 'craftsman' ? t('craftsman') : t('seller')}</span>
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
              <h2>{editProduct ? t('editProduct') : t('addNewProduct')}</h2>
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
                  {t('back')}
                </button>
              )}
              <div className="sdv2-modal-footer-right">
                <button type="button" className="sdv2-cancel-btn" onClick={() => { setShowAddForm(false); setEditProduct(null) }}>{t('cancel')}</button>
                {formStep < 3 ? (
                  <button type="button" className="sdv2-primary-btn" onClick={nextStep}>
                    {t('forward')}
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </button>
                ) : (
                  <button type="button" className="sdv2-primary-btn" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? t('loading') : (editProduct ? t('saveBtn') : t('addBtn'))}
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
