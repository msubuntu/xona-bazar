import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { REVIEWS_ENABLED } from '../data/flags'
import { api } from '../services/api'
import MobileHeader from './MobileHeader.jsx'
import { PasswordModal, TwoFactorModal } from '../components/SettingsModals.jsx'
import TelegramBotLink from '../components/TelegramBotLink'

const STATUS_CHIP = {
  pending: 'mob_chip_amber', confirmed: 'mob_chip_blue', shipping: 'mob_chip_amber',
  delivered: 'mob_chip_green', completed: 'mob_chip_green', cancelled: 'mob_chip_red',
}
const STATUS_FLOW = ['pending', 'confirmed', 'completed']
const INITIAL_FORM = { name: '', brand: '', category: 'paints', description: '', price: '', oldPrice: '', stock: '' }
const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const MAX_VIDEO_SIZE = 100 * 1024 * 1024
const MIN_IMAGES = 4
const MAX_IMAGES = 6

const createEmptyVariant = () => ({
  color: '', colorHex: '', size: '', price: '', oldPrice: '', stock: '', sku: '', files: [], previews: [],
})

export default function MobileSellerDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, updateProfile } = useAuth()
  const { convertPrice, lang, setLang, t } = useSettings()
  const { dark, toggleTheme } = useTheme()

  const CATEGORIES = [
    { value: 'paints', label: t('paints') },
    { value: 'tiles', label: t('tiles') },
    { value: 'plumbing', label: t('plumbing') },
    { value: 'electrical', label: t('electrical') },
    { value: 'tools', label: t('tools') },
    { value: 'building', label: t('building') },
    { value: 'furniture', label: t('furniture') },
    { value: 'doors', label: t('doors') },
  ]

  const TABS = [
    { id: 'overview', label: t('overview'), icon: '📊' },
    { id: 'products', label: t('products'), icon: '📦' },
    { id: 'orders', label: t('orders'), icon: '🧾' },
    ...(REVIEWS_ENABLED ? [{ id: 'reviews', label: t('reviews'), icon: '⭐' }] : []),
    { id: 'settings', label: t('settings'), icon: '⚙️' },
  ]

  const ORDER_STATUS_LABELS = {
    pending: t('statusPending'), confirmed: t('statusConfirmed'), shipping: t('statusShipping'),
    delivered: t('statusDelivered'), completed: t('statusDelivered'), cancelled: t('statusCancelled'),
  }
  const ORDER_FILTERS = [
    { value: '', label: t('all') },
    { value: 'pending', label: t('statusPending') },
    { value: 'confirmed', label: t('statusConfirmed') },
    { value: 'completed', label: t('statusCompletedFilter') },
    { value: 'cancelled', label: t('statusCancelledFilter') },
  ]
  const REVIEW_RATING_FILTERS = [
    { value: 0, label: t('all') },
    { value: 5, label: '5 ★' },
    { value: 4, label: '4 ★' },
    { value: 3, label: '3 ★' },
    { value: 2, label: '2 ★' },
    { value: 1, label: '1 ★' },
  ]
  const STEP_LABELS = [t('mainInfo'), t('priceAndImage'), t('confirmation')]

  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState({ totalProducts: 0, totalOrders: 0, pendingOrders: 0, totalRevenue: 0, averageRating: 0 })
  const [recentProducts, setRecentProducts] = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const [myProducts, setMyProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [orderStatusFilter, setOrderStatusFilter] = useState('')
  const [updatingOrderId, setUpdatingOrderId] = useState(null)
  const [contactingOrderId, setContactingOrderId] = useState(null)

  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewRatingFilter, setReviewRatingFilter] = useState(0)

  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
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

  const [profileForm, setProfileForm] = useState({ name: '', shopName: '', location: '', description: '', lat: null, lng: null, workingHours: '09:00 - 18:00', available: true, social: { telegram: '', instagram: '', website: '' } })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [show2FAModal, setShow2FAModal] = useState(false)
  const [twoFactor, setTwoFactor] = useState(false)

  const imgInputRef = useRef(null)
  const videoInputRef = useRef(null)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.sellers.dashboard()
      setStats(d.stats || d.dashboard || {})
      setRecentProducts(d.recentProducts || [])
      setRecentOrders(d.recentOrders || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  const loadMyProducts = useCallback(async () => {
    setProductsLoading(true)
    try {
      const data = await api.sellerProducts.list()
      setMyProducts(data.products || [])
    } catch (err) { console.error(err) }
    finally { setProductsLoading(false) }
  }, [])

  const loadOrders = useCallback(async (statusFilter = '') => {
    setOrdersLoading(true)
    try {
      const params = { page: 1, limit: 50 }
      if (statusFilter) params.status = statusFilter
      const data = await api.sellerOrders.list(params)
      setOrders(data.orders || [])
    } catch (err) { console.error(err) }
    finally { setOrdersLoading(false) }
  }, [])

  const loadReviews = useCallback(async (ratingFilter = 0) => {
    setReviewsLoading(true)
    try {
      const params = { page: 1, limit: 50 }
      if (ratingFilter) params.rating = ratingFilter
      const data = await api.sellers.myReviews(params)
      setReviews(data.reviews || [])
    } catch (err) { console.error(err) }
    finally { setReviewsLoading(false) }
  }, [])

  useEffect(() => {
    if (user && (user.role === 'seller' || user.role === 'craftsman')) {
      if (user.role === 'craftsman') {
        navigate('/craftsman-dashboard', { replace: true })
        return
      }
      loadDashboard()
      loadMyProducts()
    }
  }, [user, loadDashboard, loadMyProducts, navigate])

  useEffect(() => {
    if (location.state?.tab === 'settings') {
      setTab('settings')
      setProfileForm(prev => {
        const next = { ...prev }
        if (location.state.lat && location.state.lng) {
          next.lat = location.state.lat
          next.lng = location.state.lng
        }
        if (location.state.locationName) {
          next.location = location.state.locationName
        }
        return next
      })
    }
  }, [location.state])

  useEffect(() => {
    if (user && (user.role === 'seller' || user.role === 'craftsman') && tab === 'orders') loadOrders(orderStatusFilter)
  }, [user, tab, orderStatusFilter, loadOrders])

  useEffect(() => {
    if (user && (user.role === 'seller' || user.role === 'craftsman') && tab === 'reviews') loadReviews(reviewRatingFilter)
  }, [user, tab, reviewRatingFilter, loadReviews])

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
      setTwoFactor(user.twoFactor === true)
    }
  }, [user])

  useEffect(() => {
    return () => { imagePreviews.forEach(p => { if (p.startsWith('blob:')) URL.revokeObjectURL(p) }) }
  }, [imagePreviews])

  if (!user || (user.role !== 'seller' && user.role !== 'craftsman')) {
    return (
      <div className="mob">
        <MobileHeader />
        <div className="mob_section" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="mob_empty_title">{t('loginRequired')}</div>
          <p style={{ color: 'var(--mob-text-2)', fontSize: 14, marginTop: 8 }}>{t('sellerOnlyPage')}</p>
          <button className="mob_btn" onClick={() => navigate('/user')}>{t('goToCabinet')}</button>
        </div>
      </div>
    )
  }

  const filteredProducts = myProducts.filter(p =>
    (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.brand || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const categoryLabel = (val) => CATEGORIES.find(c => c.value === val)?.label || val

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
    setShowForm(true)
  }

  const openEditForm = (product) => {
    resetForm()
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
    setImagePreviews(rawImages.filter(Boolean))
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
    }
    setShowForm(true)
  }

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const errors = []
    const newFiles = []
    const newPreviews = []
    for (const file of files) {
      if (imageFiles.length + newFiles.length >= MAX_IMAGES) {
        errors.push(t('maxImagesUpload'))
        break
      }
      if (!file.type.startsWith('image/')) {
        errors.push(`${file.name}: ${t('onlyImageFilesAllowed')}`)
        continue
      }
      if (file.size > MAX_IMAGE_SIZE) {
        errors.push(`${file.name}: ${t('fileImageTooLarge')}`)
        continue
      }
      newFiles.push(file)
      newPreviews.push(URL.createObjectURL(file))
    }
    if (errors.length) setFormErrors(prev => ({ ...prev, image: errors.join('; ') }))
    else setFormErrors(prev => { const { image: _image, ...rest } = prev; return rest })
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

  const handleVideoSelect = (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    if (!/^video\/mp4$/.test(file.type) && !file.name.toLowerCase().endsWith('.mp4')) {
      setFormErrors(prev => ({ ...prev, video: t('onlyMp4Video') }))
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
    setFormErrors(prev => { const { video: _v, ...rest } = prev; return rest })
    if (e.target) e.target.value = ''
  }

  const removeVideo = () => {
    if (videoPreview && videoPreview.startsWith('blob:')) URL.revokeObjectURL(videoPreview)
    setVideoFile(null)
    setVideoPreview('')
    setEditVideoUrl('')
  }

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
        errors.push(`${t('variant')} ${idx + 1}: ${t('maxImagesInVariant')} ${MAX_IMAGES}`)
        break
      }
      if (!file.type.startsWith('image/')) {
        errors.push(`${file.name}: ${t('onlyImageFilesAllowed')}`)
        continue
      }
      if (file.size > MAX_IMAGE_SIZE) {
        errors.push(`${file.name}: ${t('fileImageTooLarge')}`)
        continue
      }
      newFiles.push(file)
      newPreviews.push(URL.createObjectURL(file))
    }

    if (errors.length) setFormErrors(prev => ({ ...prev, ['variant_' + idx]: errors.join('; ') }))
    else setFormErrors(prev => { const { ['variant_' + idx]: _, ...rest } = prev; return rest })

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
      if (!form.name.trim()) errors.name = t('enterProductName')
      if (!form.brand.trim()) errors.brand = t('enterBrand')
      if (!form.description.trim()) errors.description = t('enterDescription')
    }
    if (step === 2) {
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
              errors['variant_' + i] = `${t('variant')} #${i + 1}: ${MIN_IMAGES}-${MAX_IMAGES} ${t('uploadImagesCurrent')} ${n}`
            }
          })
        }
      } else {
        if (!form.price || Number(form.price) <= 0) errors.price = t('enterPrice')
        const n = imagePreviews.length
        if (n < MIN_IMAGES || n > MAX_IMAGES) {
          errors.image = `${MIN_IMAGES}-${MAX_IMAGES} ${t('uploadImagesCurrent')} ${n}`
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
    if (videoFile) {
      fd.append('video', videoFile)
    } else if (editVideoUrl) {
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
      setTimeout(() => { setShowForm(false); resetForm() }, 1200)
    } catch (err) {
      setSubmitMsg({ type: 'error', text: err.message || t('errorOccurred') })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm(t('confirmDeleteProduct'))) return
    try {
      await api.products.delete(id)
      loadMyProducts()
      loadDashboard()
    } catch (err) { console.error(err) }
  }

  const toggleStatus = async (product) => {
    try {
      await api.products.update(product._id, { status: product.status === 'active' ? 'paused' : 'active' })
      loadMyProducts()
    } catch (err) { console.error(err) }
  }

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
    setFormErrors(prev => { const { variants: _vs, price: _pr, ...rest } = prev; return rest })
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setProfileSaving(true)
    setProfileMsg(null)
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
      setProfileMsg({ type: 'success', text: t('saved') })
      setTimeout(() => setProfileMsg(null), 3000)
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message || t('errorOccurred') })
    } finally {
      setProfileSaving(false)
    }
  }

  const setSocial = (field, value) => {
    setProfileForm(prev => ({ ...prev, social: { ...prev.social, [field]: value } }))
  }

  const disableTwoFactor = async () => {
    try {
      await api.auth.notifications({ twoFactor: false })
      setTwoFactor(false)
    } catch (err) {
      alert(err?.message || t('errorShort'))
    }
  }

  const getNextStatus = (current) => {    const idx = STATUS_FLOW.indexOf(current)
    if (idx >= 0 && idx < STATUS_FLOW.length - 1) return STATUS_FLOW[idx + 1]
    return null
  }

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdatingOrderId(orderId)
    try {
      await api.sellerOrders.updateStatus(orderId, newStatus)
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o))
      loadDashboard()
    } catch (err) { console.error(err) }
    finally { setUpdatingOrderId(null) }
  }

  const handleContactBuyer = async (order) => {
    if (!order?.buyer?._id) return
    setContactingOrderId(order._id)
    try {
      const { conversation } = await api.conversations.start(order.buyer._id)
      navigate(`/messages?conv=${conversation._id}`)
    } catch (err) { console.error(err) }
    finally { setContactingOrderId(null) }
  }

  const renderStars = (rating) => (
    <div className="mob_review_stars">
      {[1, 2, 3, 4, 5].map(s => (
        <svg key={s} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
          className={s <= rating ? 'mob_review_star filled' : 'mob_review_star'}
          fill={s <= rating ? '#f59e0b' : 'none'} stroke="#f59e0b" strokeWidth="1.5">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  )

  const productImageCount = (p) => {
    if (Array.isArray(p.variants) && p.variants.length > 0) {
      return p.variants.reduce((sum, v) => sum + (v.stock || 0), 0)
    }
    return p.stock || 0
  }

  const renderFormStep1 = () => (
    <div className="mob_pform_fields">
      <div className="mob_field">
        <label className="mob_input_label">{t('productNameRequired')}</label>
        <input className="mob_input" type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t('productNamePlaceholder')} />
        {formErrors.name && <span className="mob_field_error">{formErrors.name}</span>}
      </div>
      <div className="mob_field">
        <label className="mob_input_label">{t('brandRequired')}</label>
        <input className="mob_input" type="text" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} placeholder={t('brandPlaceholder')} />
        {formErrors.brand && <span className="mob_field_error">{formErrors.brand}</span>}
      </div>
      <div className="mob_field">
        <label className="mob_input_label">{t('category')}</label>
        <select className="mob_input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>
      <div className="mob_field">
        <label className="mob_input_label">{t('shortDescriptionRequired')}</label>
        <textarea className="mob_input mob_textarea" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={t('shortDescPlaceholder')} />
        {formErrors.description && <span className="mob_field_error">{formErrors.description}</span>}
      </div>
    </div>
  )

  const renderFormStep2 = () => (
    <div className="mob_pform_fields">
      <div className="mob_pform_variant_toggle">
        <span className={`mob_toggle${hasVariants ? ' on' : ''}`} onClick={toggleHasVariants}>
          <span className="mob_toggle_thumb" />
        </span>
        <div className="mob_toggle_text">
          <strong>{t('productHasVariants')}</strong>
          <span>{t('addVariantHint')}</span>
        </div>
      </div>

      {formErrors.variants && <span className="mob_field_error" style={{ display: 'block', marginBottom: 12 }}>{formErrors.variants}</span>}

      {!hasVariants ? (
        <>
          <div className="mob_pform_row2">
            <div className="mob_field">
              <label className="mob_input_label">{t('priceRequiredLabel')}</label>
              <input className="mob_input" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="1500000" />
              {formErrors.price && <span className="mob_field_error">{formErrors.price}</span>}
            </div>
            <div className="mob_field">
              <label className="mob_input_label">{t('oldPrice')}</label>
              <input className="mob_input" type="number" value={form.oldPrice} onChange={e => setForm({ ...form, oldPrice: e.target.value })} placeholder="1800000" />
            </div>
          </div>
          <div className="mob_field">
            <label className="mob_input_label">{t('stockCount')}</label>
            <input className="mob_input" type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} placeholder="10" />
          </div>
          <div className="mob_field">
            <label className="mob_input_label">{t('productImagesLabel')} ({imagePreviews.length}/{MAX_IMAGES}) *</label>
            <div className="mob_upload_grid">
              {imagePreviews.map((preview, i) => (
                <div className="mob_upload_thumb" key={i}>
                  <img src={preview} alt={`${t('image')} ${i + 1}`} />
                  {i === 0 && <span className="mob_upload_badge">{t('main')}</span>}
                  <button type="button" className="mob_upload_remove" onClick={() => removeImage(i)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
              {imagePreviews.length < MAX_IMAGES && (
                <div className="mob_upload_add" onClick={() => imgInputRef.current?.click()}>
                  <input ref={imgInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="mob_file_input" />
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  <span>{t('add')}</span>
                </div>
              )}
            </div>
            <span className="mob_upload_hint">JPG, PNG, WEBP — {t('eachUpTo5mb')}, {MIN_IMAGES}-{MAX_IMAGES} {t('imagesRecommended')} | {t('squareFormat')}</span>
            {formErrors.image && <span className="mob_field_error" style={{ display: 'block' }}>{formErrors.image}</span>}
          </div>
        </>
      ) : (
        <div className="mob_variants_list">
          {variants.map((v, idx) => (
            <div className="mob_variant_card" key={v._id || idx}>
              <div className="mob_variant_header">
                <span className="mob_variant_num">#{idx + 1}</span>
                <button type="button" className="mob_variant_remove" onClick={() => removeVariant(idx)}>✕</button>
              </div>
              <div className="mob_pform_row2">
                <div className="mob_field" style={{ flex: 1 }}>
                  <label className="mob_input_label">{t('colorName')}</label>
                  <input className="mob_input" type="text" value={v.color} onChange={e => updateVariant(idx, 'color', e.target.value)} placeholder="Bordo" />
                </div>
                <div className="mob_field" style={{ flex: '0 0 auto' }}>
                  <label className="mob_input_label">{t('color')}</label>
                  <div className="mob_color_switch">
                    <input className="mob_color_input" type="color" value={v.colorHex || '#800020'} onChange={e => updateVariant(idx, 'colorHex', e.target.value)} />
                    {v.colorHex && <span className="mob_color_dot" style={{ background: v.colorHex }} />}
                  </div>
                </div>
              </div>
              <div className="mob_field">
                <label className="mob_input_label">{t('size')}</label>
                <input className="mob_input" type="text" value={v.size} onChange={e => updateVariant(idx, 'size', e.target.value)} placeholder="42, 1L, 5L..." />
              </div>
              <div className="mob_pform_row3">
                <div className="mob_field">
                  <label className="mob_input_label">{t('priceRequired')}</label>
                  <input className="mob_input" type="number" value={v.price} onChange={e => updateVariant(idx, 'price', e.target.value)} placeholder="80000" />
                </div>
                <div className="mob_field">
                  <label className="mob_input_label">{t('oldPrice')}</label>
                  <input className="mob_input" type="number" value={v.oldPrice} onChange={e => updateVariant(idx, 'oldPrice', e.target.value)} placeholder="95000" />
                </div>
                <div className="mob_field">
                  <label className="mob_input_label">{t('stock')}</label>
                  <input className="mob_input" type="number" value={v.stock} onChange={e => updateVariant(idx, 'stock', e.target.value)} placeholder="10" />
                </div>
              </div>
              <div className="mob_field">
                <label className="mob_input_label">{t('skuOptional')}</label>
                <input className="mob_input" type="text" value={v.sku} onChange={e => updateVariant(idx, 'sku', e.target.value)} placeholder={t('warehouseCode')} />
              </div>
              <div className="mob_field">
                <label className="mob_input_label">{t('variant')} #{idx + 1} {t('imagesLabel')} ({(v.previews || []).length}/{MAX_IMAGES}) *</label>
                <div className="mob_upload_grid">
                  {(v.previews || []).map((prev, pi) => (
                    <div className="mob_upload_thumb" key={pi}>
                      <img src={prev} alt={`${t('variant')} ${idx + 1} ${t('image')} ${pi + 1}`} />
                      {pi === 0 && <span className="mob_upload_badge">{t('main')}</span>}
                      <button type="button" className="mob_upload_remove" onClick={() => removeVariantImage(idx, pi)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  ))}
                  {(v.previews || []).length < MAX_IMAGES && (
                    <div className="mob_upload_add" onClick={() => document.querySelector(`#mob_var_img_${idx}`)?.click()}>
                      <input id={`mob_var_img_${idx}`} type="file" accept="image/*" multiple onChange={(e) => handleVariantImageSelect(idx, e)} className="mob_file_input" />
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      <span>{t('add')}</span>
                    </div>
                  )}
                </div>
                <span className="mob_upload_hint">{t('perVariantImages')} {MIN_IMAGES}-{MAX_IMAGES} {t('imagesRecommended')} | {t('squareFormat')}</span>
                {formErrors['variant_' + idx] && <span className="mob_field_error" style={{ display: 'block' }}>{formErrors['variant_' + idx]}</span>}
              </div>
            </div>
          ))}
          <button type="button" className="mob_btn mob_btn_ghost mob_variant_add" onClick={addVariant}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {t('addVariant')}
          </button>
        </div>
      )}

      <div className="mob_field">
        <label className="mob_input_label">{t('productVideoLabel')}</label>
        {videoPreview ? (
          <div className="mob_video_preview">
            <video src={videoPreview} controls />
            <button type="button" className="mob_upload_remove_md" onClick={removeVideo}>✕</button>
          </div>
        ) : (
          <div className="mob_video_add" onClick={() => videoInputRef.current?.click()}>
            <input ref={videoInputRef} type="file" accept="video/mp4" onChange={handleVideoSelect} className="mob_file_input" />
            <span>{t('uploadVideo')}</span>
          </div>
        )}
        <span className="mob_upload_hint">MP4, {t('upTo100mb')}, {t('oneVideo')}</span>
        {formErrors.video && <span className="mob_field_error" style={{ display: 'block' }}>{formErrors.video}</span>}
      </div>
    </div>
  )

  const renderFormStep3 = () => (
    <div className="mob_pform_confirm">
      <div className="mob_confirm_card">
        <div className="mob_confirm_gallery">
          {(imagePreviews.length > 0 ? imagePreviews.filter(Boolean) : []).map((src, i) => (
            <img key={i} src={src} alt={`${form.name} ${i + 1}`} className={i === 0 ? 'main' : ''} />
          ))}
        </div>
        <div className="mob_confirm_info">
          <span className="mob_confirm_brand">{form.brand}</span>
          <h4>{form.name || t('unnamedProduct')}</h4>
          <span className="mob_confirm_category">{categoryLabel(form.category)}</span>
          {form.description && <p className="mob_confirm_desc">{form.description}</p>}
          {!hasVariants ? (
            <div className="mob_confirm_prices">
              <span className="mob_confirm_price">{form.price ? convertPrice(Number(form.price)) : '—'}</span>
              {form.oldPrice && <span className="mob_confirm_old">{convertPrice(Number(form.oldPrice))}</span>}
            </div>
          ) : (
            <div className="mob_confirm_variants">
              <span className="mob_confirm_variants_title">{t('variantsTitle')} ({variants.length}):</span>
              {variants.map((v, i) => (
                <div className="mob_confirm_variant" key={v._id || i}>
                  <span className="mob_confirm_variant_dot" style={{ background: v.colorHex || '#94a3b8' }} />
                  <span className="mob_confirm_variant_info">{([v.color, v.size].filter(Boolean).join(' / ')) || `${t('variant')} ${i + 1}`}</span>
                  <span className="mob_confirm_variant_price">{v.price ? convertPrice(Number(v.price)) : '—'}</span>
                </div>
              ))}
            </div>
          )}
          {form.stock && !hasVariants && <span className="mob_confirm_stock">{t('inStock')}: {form.stock} {t('pcs')}</span>}
        </div>
      </div>
    </div>
  )

  const renderOverview = () => (
    <>
      <div className="mob_stats">
        <div className="mob_stat">
          <div className="mob_stat_val">{stats.totalProducts ?? 0}</div>
          <div className="mob_stat_label">{t('products')}</div>
        </div>
        <div className="mob_stat">
          <div className="mob_stat_val">{stats.totalOrders ?? 0}</div>
          <div className="mob_stat_label">{t('orders')}</div>
          {stats.pendingOrders > 0 && <span className="mob_stat_badge">{stats.pendingOrders}</span>}
        </div>
        <div className="mob_stat">
          <div className="mob_stat_val" style={{ color: 'var(--mob-amber)' }}>{convertPrice(stats.totalRevenue ?? 0)}</div>
          <div className="mob_stat_label">{t('revenue')}</div>
        </div>
        {REVIEWS_ENABLED && (
        <div className="mob_stat">
          <div className="mob_stat_val" style={{ color: 'var(--mob-accent)' }}>{stats.averageRating > 0 ? stats.averageRating : '—'}</div>
          <div className="mob_stat_label">{t('rating')}</div>
        </div>
        )}
      </div>

      <div className="mob_section">
        <div className="mob_db_section_head">
          <div className="mob_page_title" style={{ fontSize: 16 }}>{t('recentProducts')}</div>
          <button className="mob_db_link" onClick={() => setTab('products')}>{t('allItems')}</button>
        </div>
        {recentProducts.length === 0 ? (
          <div className="mob_empty">
            <div className="mob_empty_title">{t('noProductsYet')}</div>
            <button className="mob_btn" onClick={openAddForm}>{t('addProduct')}</button>
          </div>
        ) : recentProducts.slice(0, 5).map(p => (
          <div className="mob_row" key={p._id || p.id}>
            <div className="mob_row_icon"><img src={p.image || '/placeholder.png'} alt="" /></div>
            <div className="mob_row_body">
              <div className="mob_row_title">{p.name}</div>
              <div className="mob_row_sub">{p.brand} · {convertPrice(p.price)}</div>
            </div>
            <span className={`mob_chip ${p.status === 'active' ? 'mob_chip_green' : 'mob_chip_red'}`}>{p.status === 'active' ? t('active') : t('paused')}</span>
          </div>
        ))}
      </div>

      <div className="mob_section">
        <div className="mob_db_section_head">
          <div className="mob_page_title" style={{ fontSize: 16 }}>{t('recentOrders')}</div>
          <button className="mob_db_link" onClick={() => setTab('orders')}>{t('allItems')}</button>
        </div>
        {recentOrders.length === 0 ? (
          <div className="mob_empty"><div className="mob_empty_title">{t('noOrders')}</div></div>
        ) : recentOrders.slice(0, 5).map(o => (
          <div className="mob_row" key={o._id || o.id}>
            <div className="mob_row_icon">🧾</div>
            <div className="mob_row_body">
              <div className="mob_row_title">{o.buyer?.name || t('unknown')} · {o.items?.length || 0} {t('items')}</div>
              <div className="mob_row_sub">{convertPrice(o.total ?? o.totalPrice ?? 0)}</div>
            </div>
            <span className={`mob_chip ${STATUS_CHIP[o.status] || 'mob_chip_blue'}`}>{ORDER_STATUS_LABELS[o.status] || o.status}</span>
          </div>
        ))}
      </div>
    </>
  )

  const renderProducts = () => (
    <div className="mob_section">
      <div className="mob_db_section_head" style={{ marginBottom: 10 }}>
        <div className="mob_page_title" style={{ fontSize: 16 }}>{t('myProducts')} ({myProducts.length})</div>
        <button className="mob_btn mob_btn_sm" onClick={openAddForm}>+ {t('add')}</button>
      </div>
      <div className="mob_db_search">
        <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--mob-text-2)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" placeholder={t('searchProducts')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>
      {productsLoading ? (
        <div className="mob_loader"><div className="mob_spinner" /></div>
      ) : filteredProducts.length === 0 ? (
        <div className="mob_empty"><div className="mob_empty_title">{t('noProducts')}</div></div>
      ) : filteredProducts.map(p => (
        <div className="mob_row" key={p._id || p.id}>
          <div className="mob_row_icon"><img src={p.image || '/placeholder.png'} alt="" /></div>
          <div className="mob_row_body">
            <div className="mob_row_title">{p.name}</div>
            <div className="mob_row_sub">{p.brand} · {convertPrice(p.price)}</div>
            <div className="mob_row_sub">{t('stock')}: {productImageCount(p)} {t('pcs')} · {t('soldLabel')}: {p.sold || 0}</div>
            <div className="mob_person_meta" style={{ marginTop: 6 }}>
              <span className={`mob_chip ${p.status === 'active' ? 'mob_chip_green' : 'mob_chip_red'}`}>{p.status === 'active' ? t('active') : t('paused')}</span>
              <div className="mob_row_actions">
                <button className="mob_row_action" onClick={() => openEditForm(p)} title={t('edit')}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button className="mob_row_action" onClick={() => toggleStatus(p)} title={p.status === 'active' ? t('pause') : t('enable')}>
                  {p.status === 'active' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  )}
                </button>
                <button className="mob_row_action danger" onClick={() => handleDelete(p._id)} title={t('delete')}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  const renderOrders = () => (
    <div className="mob_section">
      <div className="mob_db_filter_row">
        {ORDER_FILTERS.map(f => (
          <button key={f.value} className={`mob_filter_chip${orderStatusFilter === f.value ? ' active' : ''}`} onClick={() => setOrderStatusFilter(f.value)}>{f.label}</button>
        ))}
      </div>
      {ordersLoading ? (
        <div className="mob_loader"><div className="mob_spinner" /></div>
      ) : orders.length === 0 ? (
        <div className="mob_empty"><div className="mob_empty_title">{orderStatusFilter ? t('noOrdersForStatus') : t('noOrders')}</div></div>
      ) : orders.map(o => {
        const next = getNextStatus(o.status)
        return (
          <div className="mob_order_card" key={o._id || o.id}>
            <div className="mob_order_top">
              <div className="mob_order_buyer">
                <div className="mob_order_avatar">{(o.buyer?.name || '?')[0]}</div>
                <div>
                  <strong>{o.buyer?.name || t('unknown')}</strong>
                  {o.buyer?.phone && <span>{o.buyer.phone}</span>}
                </div>
              </div>
              <div className="mob_order_meta">
                <span className={`mob_chip ${STATUS_CHIP[o.status] || 'mob_chip_blue'}`}>{ORDER_STATUS_LABELS[o.status] || o.status}</span>
                <span className="mob_order_date">{o.createdAt ? new Date(o.createdAt).toLocaleDateString('uz-UZ') : ''}</span>
              </div>
            </div>
            {(o.items || []).map((item, i) => (
              <div className="mob_order_item" key={i}>
                <img src={item.image || '/placeholder.png'} alt={item.name} />
                <div className="mob_order_item_info">
                  <span className="mob_order_item_name">{item.name}</span>
                  <span className="mob_row_sub">{item.qty} × {convertPrice(item.price)}</span>
                </div>
              </div>
            ))}
            <div className="mob_order_bottom">
              <div className="mob_order_actions">
                {next && (
                  <button className="mob_btn mob_btn_sm" disabled={updatingOrderId === o._id} onClick={() => handleStatusUpdate(o._id, next)}>
                    {updatingOrderId === o._id ? '...' : ORDER_STATUS_LABELS[next]}
                  </button>
                )}
                {o.status !== 'cancelled' && o.status !== 'delivered' && o.status !== 'completed' && (
                  <button className="mob_btn mob_btn_sm mob_btn_outline" disabled={updatingOrderId === o._id} onClick={() => handleStatusUpdate(o._id, 'cancelled')}>{t('cancel')}</button>
                )}
              </div>
            </div>
            <div className="mob_order_footer">
              <span className="mob_order_total" style={{ flex: 1 }}>{t('total')}: {convertPrice(o.total ?? o.totalPrice ?? 0)}</span>
              <button className="mob_btn mob_btn_sm mob_btn_contact" disabled={contactingOrderId === o._id} onClick={() => handleContactBuyer(o)}>
                {contactingOrderId === o._id ? '...' : t('writeMessage')}
              </button>
            </div>
            {o.address && <div className="mob_order_addr">{t('address')}: {o.address}</div>}
          </div>
        )
      })}
    </div>
  )

  const renderReviews = () => (
    <div className="mob_section">
      <div className="mob_db_filter_row">
        {REVIEW_RATING_FILTERS.map(f => (
          <button key={f.value} className={`mob_filter_chip${reviewRatingFilter === f.value ? ' active' : ''}`} onClick={() => setReviewRatingFilter(f.value)}>{f.label}</button>
        ))}
      </div>
      {reviewsLoading ? (
        <div className="mob_loader"><div className="mob_spinner" /></div>
      ) : reviews.length === 0 ? (
        <div className="mob_empty"><div className="mob_empty_title">{reviewRatingFilter ? t('noReviewsForRating') : t('noReviews')}</div></div>
      ) : reviews.map(review => (
        <div className="mob_review_card" key={review._id || review.id}>
          <div className="mob_review_top">
            <div className="mob_order_avatar">{(review.buyerName || 'U')[0]}</div>
            <div className="mob_review_meta">
              <strong>{review.buyerName || t('unknown')}</strong>
              <span className="mob_review_product">{review.productName || t('product')}</span>
            </div>
            <div className="mob_review_right">
              {renderStars(review.rating)}
              <span className="mob_review_date">{review.createdAt ? new Date(review.createdAt).toLocaleDateString('uz-UZ') : ''}</span>
            </div>
          </div>
          {review.text && <p className="mob_review_text">{review.text}</p>}
        </div>
      ))}
    </div>
  )

  const renderSettings = () => (
    <div className="mob_section">
      <div className="mob_page_title" style={{ fontSize: 16, marginBottom: 14 }}>{t('shopInfo')}</div>
      <form onSubmit={handleSaveProfile} className="mob_setting_form">
        <div className="mob_pform_row2">
          <div className="mob_field">
            <label className="mob_input_label">{t('firstName')}</label>
            <input className="mob_input" type="text" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} placeholder={t('yourName')} />
          </div>
          <div className="mob_field">
            <label className="mob_input_label">{t('shopName')}</label>
            <input className="mob_input" type="text" value={profileForm.shopName} onChange={e => setProfileForm({ ...profileForm, shopName: e.target.value })} placeholder={t('shopName')} />
          </div>
        </div>
        <div className="mob_field">
          <label className="mob_input_label">{t('addressText')}</label>
          <input className="mob_input" type="text" value={profileForm.location} onChange={e => setProfileForm({ ...profileForm, location: e.target.value })} placeholder={t('addressExample')} />
        </div>
        <div className="mob_field">
          <label className="mob_input_label">{t('shopLocation')}</label>
          <input className="mob_input" type="text" value={profileForm.location} onChange={e => setProfileForm({ ...profileForm, location: e.target.value })} placeholder={t('addressExample')} />
          <button type="button" className="mob_btn mob_btn_ghost mob_loc_pick_btn" onClick={() => navigate('/location-picker', { state: { lat: profileForm.lat, lng: profileForm.lng } })}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {t('markOnMap')}
          </button>
          {profileForm.lat && profileForm.lng && (
            <span className="mob_loc_saved">{t('markedCoordinates')}: {profileForm.lat.toFixed(5)}, {profileForm.lng.toFixed(5)}</span>
          )}
        </div>
        <div className="mob_field">
          <label className="mob_input_label">{t('description')}</label>
          <textarea className="mob_input mob_textarea" rows={4} value={profileForm.description} onChange={e => setProfileForm({ ...profileForm, description: e.target.value })} placeholder={t('aboutShopPlaceholder')} />
        </div>
        <div className="mob_pform_row2" style={{ marginBottom: 12 }}>
          <div className="mob_field">
            <label className="mob_input_label">{t('workingHours')}</label>
            <input className="mob_input" type="text" value={profileForm.workingHours} onChange={e => setProfileForm({ ...profileForm, workingHours: e.target.value })} placeholder="09:00 - 18:00" />
          </div>
          <div className="mob_field">
            <label className="mob_input_label">{t('status')}</label>
            <button
              type="button"
              className={`sdv2-availability-toggle ${profileForm.available ? 'available' : 'busy'}`}
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => setProfileForm(prev => ({ ...prev, available: !prev.available }))}
            >
              <span className="sdv2-toggle-dot" />
              {profileForm.available ? t('open') : t('closed')}
            </button>
          </div>
        </div>
        {profileMsg && <div className={`mob_submit_msg ${profileMsg.type}`}>{profileMsg.text}</div>}
        <button type="submit" className="mob_btn" disabled={profileSaving}>{profileSaving ? t('saving') : t('save')}</button>
      </form>

      <div className="mob_page_title" style={{ fontSize: 16, margin: '24px 0 14px' }}>{t('socialAndSite')}</div>
      <form onSubmit={handleSaveProfile} className="mob_setting_form">
        <div className="mob_field">
          <label className="mob_input_label">Telegram</label>
          <input className="mob_input" type="text" value={profileForm.social.telegram} onChange={e => setSocial('telegram', e.target.value)} placeholder={t('telegramPlaceholder')} />
        </div>
        <div className="mob_field">
          <label className="mob_input_label">Instagram</label>
          <input className="mob_input" type="text" value={profileForm.social.instagram} onChange={e => setSocial('instagram', e.target.value)} placeholder={t('instagramPlaceholder')} />
        </div>
        <div className="mob_field">
          <label className="mob_input_label">{t('website')}</label>
          <input className="mob_input" type="text" value={profileForm.social.website} onChange={e => setSocial('website', e.target.value)} placeholder="https://dokoningiz.uz" />
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted, #9ca3af)', marginBottom: 12 }}>{t('linksVisiblePublicly')}</div>
        <button type="submit" className="mob_btn" disabled={profileSaving}>{profileSaving ? t('saving') : t('save')}</button>
      </form>

      <div className="mob_page_title" style={{ fontSize: 16, margin: '24px 0 14px' }}>{t('appSettings')}</div>
      <div className="mob_setting_form">
        <div className="mob_field">
          <label className="mob_label">{t('selectLanguage')}</label>
          <select className="mob_input" value={lang} onChange={e => setLang(e.target.value)}>
            <option value="uz">{t('uz')}</option>
            <option value="ru">{t('ru')}</option>
            <option value="en">{t('en')}</option>
          </select>
        </div>
        <button type="button" className={`mob_btn ${dark ? 'mob_btn_success' : 'mob_btn_ghost'}`} style={{ width: '100%' }} onClick={toggleTheme}>
          {dark ? `🌙 ${t('darkMode')}` : `☀️ ${t('lightMode')}`}
        </button>
      </div>
      <div style={{ margin: '14px 0' }}>
        <TelegramBotLink />
      </div>

      <div className="mob_page_title" style={{ fontSize: 16, margin: '24px 0 14px' }}>{t('accountSecurity')}</div>
      <div className="mob_setting_form">
        <button type="button" className="mob_btn mob_btn_ghost" style={{ width: '100%', marginBottom: 10 }} onClick={() => setShowPasswordModal(true)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          {t('changePassword')}
        </button>
        <button
          type="button"
          className={`mob_btn ${twoFactor ? 'mob_btn_success' : 'mob_btn_ghost'}`}
          style={{ width: '100%' }}
          onClick={() => { if (!twoFactor) setShow2FAModal(true); else disableTwoFactor() }}
        >
          {twoFactor ? t('twoFactorOn') : t('enableTwoFactor')}
        </button>
      </div>

      {showPasswordModal && <PasswordModal onClose={() => setShowPasswordModal(false)} />}
      {show2FAModal && <TwoFactorModal onClose={() => setShow2FAModal(false)} onEnable={() => setTwoFactor(true)} />}
    </div>
  )

  return (
    <div className="mob">
      <MobileHeader />
      <div className="mob_page_head">
        <button className="mob_back" onClick={() => navigate(-1)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div className="mob_page_title">{t('sellerPanel')}</div>
      </div>

      <div className="mob_db_tabs">
        {TABS.map(t => (
          <button key={t.id} className={`mob_db_tab${tab === t.id ? ' mob_db_tab_active' : ''}`} onClick={() => setTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading && tab === 'overview' && <div className="mob_loader"><div className="mob_spinner" /></div>}

      {tab === 'overview' && renderOverview()}
      {tab === 'products' && renderProducts()}
      {tab === 'orders' && renderOrders()}
      {tab === 'reviews' && REVIEWS_ENABLED && renderReviews()}
      {tab === 'settings' && renderSettings()}

      {showForm && (
        <div className="mob_pform_overlay">
          <div className="mob_pform">
            <div className="mob_pform_header">
              <h3>{editProduct ? t('editProduct') : t('addProductTitle')}</h3>
              <button className="mob_pform_close" onClick={() => { setShowForm(false); resetForm() }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="mob_pform_steps">
              {STEP_LABELS.map((label, i) => (
                <div key={i} className={`mob_pform_step${formStep > i + 1 ? ' done' : ''}${formStep === i + 1 ? ' active' : ''}`}>
                  <span className="mob_pform_step_dot">{formStep > i + 1 ? '✓' : i + 1}</span>
                  <span className="mob_pform_step_label">{label}</span>
                  {i < STEP_LABELS.length - 1 && <span className="mob_pform_step_line" />}
                </div>
              ))}
            </div>

            <div className="mob_pform_body">
              {formStep === 1 && renderFormStep1()}
              {formStep === 2 && renderFormStep2()}
              {formStep === 3 && renderFormStep3()}
            </div>

            {submitMsg && <div className={`mob_submit_msg ${submitMsg.type}`}>{submitMsg.text}</div>}

            <div className="mob_pform_footer">
              <button type="button" className="mob_btn mob_btn_ghost" onClick={() => { setShowForm(false); resetForm() }}>{t('cancel')}</button>
              {formStep > 1 ? (
                <button type="button" className="mob_btn mob_btn_ghost" onClick={prevStep}>{t('back')}</button>
              ) : (
                <span />
              )}
              {formStep < 3 ? (
                <button type="button" className="mob_btn" onClick={nextStep}>{t('next')}</button>
              ) : (
                <button type="button" className="mob_btn" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? t('uploading') : (editProduct ? t('save') : t('add'))}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}