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

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

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

// Features: min 2 ta, har biri label talab qiladi
function parseFeatures(raw) {
  if (!raw) return []
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(f => f && f.label && String(f.label).trim())
      .map(f => ({
        icon: f.icon ? String(f.icon).trim() : '',
        label: String(f.label).trim(),
        desc: f.desc ? String(f.desc).trim() : '',
      }))
  } catch { return [] }
}

function effectivePrice(product) {
  if (product.variants && product.variants.length > 0) {
    return Math.min(...product.variants.map(v => v.price))
  }
  return product.price
}

// Specs (asosiy xususiyatlar): { key: "value", ... } kabi ob'ekt
function parseSpecs(raw) {
  if (!raw) return {}
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
        .map(([k, v]) => [String(k).trim(), String(v).trim()])
    )
  } catch { return {} }
}

// Levenshtein masofa: 2 ta so'z qanchalik yaqinligini hisoblash.
// "lempa" → "lampa" = 1 (bitta harf almashgan)
function levenshtein(a, b) {
  const m = a.length, n = b.length
  if (!m) return n
  if (!n) return m
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[m][n]
}

// 0 natija bo'lganida: eng yaqin mahsulot nomi/brendini topish.
// Masofa kichik bo'lgan (<=2) taklif qaytaradi.
async function suggestCorrection(rawQuery, limit = 200) {
  const q = String(rawQuery || '').trim().toLowerCase()
  if (q.length < 3) return null

  const samples = await Product.find({ status: 'active' })
    .select('name brand')
    .lean()
    .limit(limit)

  const queryWords = q.split(/\s+/).filter(w => w.length >= 3)

  let best = null
  let bestDist = Infinity
  for (const p of samples) {
    const words = `${p.name} ${p.brand}`.toLowerCase()
      .replace(/[^a-zа-яёўқғҳ',.\s-]/gi, ' ') // o'zbekcha harflar + lotin
      .split(/\s+/)
    for (const qw of queryWords) {
      for (const w of words) {
        if (!w || Math.abs(w.length - qw.length) > 2) continue
        const dist = levenshtein(qw, w)
        if (dist < bestDist) { bestDist = dist; best = w }
      }
    }
  }

  if (best && bestDist <= 2) return best
  return null
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
    let rawProducts = await Product.find(filter)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('sellerId', 'name avatar color shopName rating lat lng location workingHours')

    let didYouMean = null

    // Qidiruv hech narsa topmasa — harf xatosiga "Did you mean" taklifi
    if (search && rawProducts.length === 0) {
      const suggestion = await suggestCorrection(search)
      if (suggestion && suggestion !== String(search).trim().toLowerCase()) {
        const corrected = await Product.find({ $text: { $search: suggestion }, status: 'active' })
          .sort({ sold: -1 })
          .limit(Number(limit))
          .populate('sellerId', 'name avatar color shopName rating lat lng location workingHours')
        if (corrected.length > 0) {
          didYouMean = suggestion
          rawProducts = corrected
        }
      }
    }

    const products = rawProducts.map(doc => {
      const p = doc.toObject()
      if ((!p.images || p.images.length === 0) && p.image) p.images = [p.image]
      if (p.specs && typeof p.specs === 'object' && !Array.isArray(p.specs)) {
        p.specs = p.specs instanceof Map ? Object.fromEntries(p.specs) : p.specs
      }
      return p
    })

    res.json({ products, total: didYouMean ? products.length : total, page: Number(page), pages: 1, didYouMean })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Header autocomplete: real mahsulot nomi/brendidan takliflar
router.get('/suggestions', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim()
    if (!q) return res.json({ suggestions: [] })

    const regex = new RegExp(escapeRegex(q), 'i')
    const docs = await Product.find({
      status: 'active',
      $or: [
        { name: { $regex: regex } },
        { brand: { $regex: regex } },
        { name: { $regex: q.toLowerCase(), $options: 'i' } },
      ],
    })
      .select('name brand category')
      .sort({ sold: -1, createdAt: -1 })
      .limit(10)
      .lean()

    const suggestions = docs.map(p => ({
      text: p.brand ? `${p.brand} ${p.name}` : p.name,
      name: p.name,
      brand: p.brand || '',
    }))
    res.json({ suggestions })
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

    // specs Map bo'lib kelishini oldini olish: JS obyektiga aylantirish
    if (p.specs && typeof p.specs === 'object' && !Array.isArray(p.specs)) {
      p.specs = p.specs instanceof Map ? Object.fromEntries(p.specs) : p.specs
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
    const { name, brand, category, subcategory, price, oldPrice, description, stock } = req.body
    const files = req.files || {}
    const specs = parseSpecs(req.body.specs)
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

    // Features: majburiy, kamida 2 ta
    const features = parseFeatures(req.body.features)
    if (features.length < 2) {
      return res.status(400).json({ message: 'Kamida 2 ta xususiyat (features) qo\'shish majburiy' })
    }

    const productData = {
      name, brand, category, subcategory: subcategory || '',
      price: Number(price),
      oldPrice: oldPrice ? Number(oldPrice) : undefined,
      description,
      stock: stock ? Number(stock) : 0,
      sellerId: req.user._id,
      image: imageFiles[0] || (variants[0] && variants[0].image) || '',
      images: imageFiles,
      video: videoFile,
      variants,
      features,
      specs,
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
    const { name, brand, category, subcategory, price, oldPrice, description, stock, status, keepImages } = req.body
    if (name) product.name = name
    if (brand) product.brand = brand
    if (category) product.category = category
    if (subcategory !== undefined) product.subcategory = subcategory
    if (price) product.price = Number(price)
    if (oldPrice !== undefined) product.oldPrice = oldPrice ? Number(oldPrice) : undefined
    if (description !== undefined) product.description = description
    if (stock !== undefined) product.stock = Number(stock)
    if (status) product.status = status
    if (req.body.specs !== undefined) product.specs = parseSpecs(req.body.specs)

    // Features: majburiy, kamida 2 ta
    if (req.body.features !== undefined) {
      const features = parseFeatures(req.body.features)
      if (features.length < 2) {
        return res.status(400).json({ message: 'Kamida 2 ta xususiyat (features) qo\'shish majburiy' })
      }
      product.features = features
    }

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
