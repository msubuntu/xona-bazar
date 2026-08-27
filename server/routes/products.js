import { Router } from 'express'
import Product from '../models/Product.js'
import { protect, authorize } from '../middleware/auth.js'
import multer from 'multer'
import { resolve } from 'path'

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4']
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4']

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, resolve('uploads')),
  filename: (req, file, cb) => {
    const ext = (file.originalname.match(/\.\w+$/)?.[0] || '').toLowerCase()
    cb(null, `product-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`)
  },
})
const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = (file.originalname.match(/\.\w+$/)?.[0] || '').toLowerCase()
    if (ALLOWED_MIME.includes(file.mimetype) && ALLOWED_EXT.includes(ext)) cb(null, true)
    else cb(new Error(`Ruxsat etilmagan fayl turi: ${file.mimetype} (${ext})`), false)
  },
})

function parseVariants(raw) {
  if (!raw) return []
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!Array.isArray(parsed)) return []
    return parsed.filter(v => v && typeof v.price === 'number').map(v => ({
      color: v.color || undefined,
      colorHex: v.colorHex || undefined,
      size: v.size || undefined,
      price: Number(v.price),
      oldPrice: v.oldPrice ? Number(v.oldPrice) : undefined,
      image: v.image || '',
      images: Array.isArray(v.images) ? v.images.filter(Boolean) : [],
      stock: v.stock != null ? Number(v.stock) : 0,
      sku: v.sku || undefined,
    }))
  } catch { return [] }
}

function effectivePrice(product) {
  if (product.variants && product.variants.length > 0) {
    return Math.min(...product.variants.map(v => v.price))
  }
  return product.price
}

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { search, category, sellerId, sort, page = 1, limit = 20 } = req.query
    const filter = { status: 'active' }

    if (search) filter.$text = { $search: search }
    if (category) filter.category = category
    if (sellerId) filter.sellerId = sellerId

    let sortObj = { createdAt: -1 }
    if (sort === 'price_low') sortObj = { price: 1 }
    else if (sort === 'price_high') sortObj = { price: -1 }
    else if (sort === 'rating') sortObj = { rating: -1 }
    else if (sort === 'popular') sortObj = { sold: -1 }

    const total = await Product.countDocuments(filter)
    const rawProducts = await Product.find(filter)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('sellerId', 'name avatar color shopName rating lat lng location workingHours')

    const products = rawProducts.map(doc => {
      const p = doc.toObject()
      if ((!p.images || p.images.length === 0) && p.image) p.images = [p.image]
      return p
    })

    res.json({ products, total, page: Number(page), pages: Math.ceil(total / limit) })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.get('/mine', protect, authorize('seller', 'craftsman'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query
    const filter = { sellerId: req.user._id }
    if (status) filter.status = status

    const total = await Product.countDocuments(filter)
    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('sellerId', 'name avatar shopName lat lng location')

    res.json({ products, total, page: Number(page), pages: Math.ceil(total / limit) })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('sellerId', 'name avatar color shopName rating verified location phone workingHours lat lng')
    if (!product) return res.status(404).json({ message: 'Mahsulot topilmadi' })

    const p = product.toObject()
    if ((!p.images || p.images.length === 0) && p.image) {
      p.images = [p.image]
    }
    if (p.variants && p.variants.length > 0) {
      p.variants = p.variants.map(v => {
        const vObj = v.toObject ? v.toObject() : { ...v }
        if ((!vObj.images || vObj.images.length === 0) && vObj.image) {
          vObj.images = [vObj.image]
        }
        return vObj
      })
    }

    res.json({ product: p })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.post('/', protect, authorize('seller', 'craftsman'), upload.fields([
  { name: 'images', maxCount: 6 },
  { name: 'variantImages', maxCount: 60 },
  { name: 'video', maxCount: 1 },
]), async (req, res) => {
  try {
    const { name, brand, category, price, oldPrice, description, stock } = req.body
    const files = req.files || {}
    const imageFiles = (files.images || []).map(f => `/uploads/${f.filename}`)
    const videoFile = (files.video && files.video[0]) ? `/uploads/${files.video[0].filename}` : ''

    let variants = parseVariants(req.body.variants)
    const vFiles = files.variantImages || []
    const counts = (() => { try { return JSON.parse(req.body.variantImageCounts || '[]') } catch { return [] } })()
    let cursor = 0
    variants = variants.map((v, i) => {
      const n = counts[i] || 0
      const imgs = vFiles.slice(cursor, cursor + n).map(f => `/uploads/${f.filename}`)
      cursor += n
      return { ...v, image: imgs[0] || v.image || '', images: imgs.length ? imgs : (v.image ? [v.image] : []) }
    })

    const productData = {
      name, brand, category,
      price: Number(price),
      oldPrice: oldPrice ? Number(oldPrice) : undefined,
      description,
      stock: stock ? Number(stock) : 0,
      sellerId: req.user._id,
      image: imageFiles[0] || (variants[0] && variants[0].image) || '',
      images: imageFiles,
      video: videoFile,
      variants,
    }

    if (variants.length > 0) {
      productData.price = effectivePrice(productData)
    }

    const product = await Product.create(productData)
    res.status(201).json({ product })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

router.put('/:id', protect, authorize('seller', 'craftsman'), upload.fields([
  { name: 'images', maxCount: 6 },
  { name: 'variantImages', maxCount: 60 },
  { name: 'video', maxCount: 1 },
]), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) return res.status(404).json({ message: 'Mahsulot topilmadi' })
    if (product.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Bu mahsulot sizniki emas" })
    }

    const files = req.files || {}
    const { name, brand, category, price, oldPrice, description, stock, status, keepImages } = req.body
    if (name) product.name = name
    if (brand) product.brand = brand
    if (category) product.category = category
    if (price) product.price = Number(price)
    if (oldPrice !== undefined) product.oldPrice = oldPrice ? Number(oldPrice) : undefined
    if (description !== undefined) product.description = description
    if (stock !== undefined) product.stock = Number(stock)
    if (status) product.status = status

    // ── Asosiy rasmlar ──
    if (files.images && files.images.length > 0) {
      const newImages = files.images.map(f => `/uploads/${f.filename}`)
      const kept = keepImages ? JSON.parse(keepImages) : []
      product.images = [...kept, ...newImages]
    } else if (keepImages && !req.body.variantsUpdated) {
      const kept = JSON.parse(keepImages)
      product.images = Array.isArray(kept) ? kept : product.images
    }
    product.image = (product.images && product.images[0]) || (product.variants && product.variants[0] && product.variants[0].image) || ''

    // ── Video (butun mahsulotga 1 ta) ──
    if (files.video && files.video[0]) {
      product.video = `/uploads/${files.video[0].filename}`
    } else if (req.body.removeVideo === '1') {
      product.video = ''
    }

    // ── Variantlar (har bir variantga alohida rasmlar) ──
    if (req.body.variants !== undefined) {
      let variants = parseVariants(req.body.variants)
      const vFiles = files.variantImages || []
      const counts = (() => { try { return JSON.parse(req.body.variantImageCounts || '[]') } catch { return [] } })()
      let cursor = 0
      variants = variants.map((v, i) => {
        const n = counts[i] || 0
        const newImgs = vFiles.slice(cursor, cursor + n).map(f => `/uploads/${f.filename}`)
        cursor += n
        const kept = Array.isArray(v.images) ? v.images.filter(Boolean) : []
        const imgs = [...kept, ...newImgs]
        return { ...v, image: imgs[0] || v.image || '', images: imgs }
      })
      product.variants = variants
      if (variants.length > 0) {
        product.price = effectivePrice(product)
      }
    }

    await product.save()
    res.json({ product })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

router.delete('/:id', protect, authorize('seller', 'craftsman'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) return res.status(404).json({ message: 'Mahsulot topilmadi' })
    if (product.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Bu mahsulot sizniki emas" })
    }
    await product.deleteOne()
    res.json({ message: 'O\'chirildi' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.post('/:id/review', protect, async (req, res) => {
  try {
    const { rating, text } = req.body
    const product = await Product.findById(req.params.id)
    if (!product) return res.status(404).json({ message: 'Mahsulot topilmadi' })

    const alreadyReviewed = product.reviews.find(r => r.userId.toString() === req.user._id.toString())
    if (alreadyReviewed) return res.status(400).json({ message: 'Siz allaqachon sharh yozgansiz' })

    product.reviews.push({ userId: req.user._id, userName: req.user.name, rating: Number(rating), text })
    product.rating = product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length

    await product.save()
    res.json({ product })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

export default router
