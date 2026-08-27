import { Router } from 'express'
import User from '../models/User.js'
import Product from '../models/Product.js'
import Order from '../models/Order.js'
import Booking from '../models/Booking.js'
import { protect, authorize } from '../middleware/auth.js'
import multer from 'multer'
import { resolve } from 'path'

const WORK_ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const WORK_ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif']

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, resolve('uploads')),
  filename: (req, file, cb) => {
    const ext = file.originalname.match(/\.\w+$/)?.[0] || '.jpg'
    cb(null, `work-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`)
  },
})
const workUpload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = (file.originalname.match(/\.\w+$/)?.[0] || '').toLowerCase()
    if (WORK_ALLOWED_MIME.includes(file.mimetype) && WORK_ALLOWED_EXT.includes(ext)) cb(null, true)
    else cb(new Error(`Ruxsat etilmagan fayl turi: ${file.mimetype} (${ext})`), false)
  },
})

const router = Router()

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ── Craftsman dashboard summary ──
router.get('/me/craftsman-dashboard', protect, authorize('craftsman'), async (req, res) => {
  try {
    const craftsmanId = req.user._id

    const [bookingStats, recentBookings] = await Promise.all([
      Booking.aggregate([
        { $match: { craftsmanId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            revenue: {
              $sum: {
                $cond: [{ $eq: ['$status', 'completed'] }, '$finalPrice', 0]
              }
            }
          }
        }
      ]),

      Booking.find({ craftsmanId })
        .populate('userId', 'name phone avatar')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ])

    const totalBookings = bookingStats.reduce((sum, s) => sum + s.count, 0)
    const pendingBookings = bookingStats
      .filter(s => s._id === 'pending' || s._id === 'quote_sent')
      .reduce((sum, s) => sum + s.count, 0)
    const totalRevenue = bookingStats.reduce((sum, s) => sum + s.revenue, 0)

    const user = await User.findById(craftsmanId).select('rating completedJobs')

    res.json({
      stats: {
        totalBookings,
        pendingBookings,
        totalRevenue,
        averageRating: user.rating || 0,
        completedJobs: user.completedJobs || 0,
      },
      recentBookings,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── Seller dashboard summary ──
router.get('/me/dashboard', protect, authorize('seller'), async (req, res) => {
  try {
    const sellerId = req.user._id

    const [totalProducts, orderStats, recentProducts, recentOrders, ratingResult] = await Promise.all([
      Product.countDocuments({ sellerId }),

      Order.aggregate([
        { $match: { 'items.sellerId': sellerId } },
        { $unwind: '$items' },
        { $match: { 'items.sellerId': sellerId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            revenue: {
              $sum: {
                $cond: [{ $in: ['$status', ['delivered', 'shipping', 'confirmed']] }, { $multiply: ['$items.price', '$items.qty'] }, 0]
              }
            }
          }
        }
      ]),

      Product.find({ sellerId }).sort({ createdAt: -1 }).limit(5)
        .select('name brand price image images stock sold rating status createdAt'),

      Order.find({ 'items.sellerId': sellerId }).sort({ createdAt: -1 }).limit(5)
        .populate('userId', 'name phone avatar')
        .lean(),

      Product.aggregate([
        { $match: { sellerId, rating: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: '$rating' } } }
      ])
    ])

    const totalOrders = orderStats.reduce((sum, s) => sum + s.count, 0)
    const pendingOrders = orderStats
      .filter(s => s._id === 'pending' || s._id === 'confirmed')
      .reduce((sum, s) => sum + s.count, 0)
    const totalRevenue = orderStats.reduce((sum, s) => sum + s.revenue, 0)
    const averageRating = ratingResult.length > 0 ? Math.round(ratingResult[0].avg * 10) / 10 : 0

    const formattedOrders = recentOrders.map(order => {
      const sellerItems = order.items.filter(
        item => item.sellerId.toString() === sellerId.toString()
      )
      return {
        _id: order._id,
        buyer: order.userId ? { name: order.userId.name, phone: order.userId.phone, avatar: order.userId.avatar } : null,
        items: sellerItems,
        total: sellerItems.reduce((sum, i) => sum + i.price * i.qty, 0),
        status: order.status,
        createdAt: order.createdAt,
      }
    })

    res.json({
      stats: { totalProducts, totalOrders, pendingOrders, totalRevenue, averageRating },
      recentProducts,
      recentOrders: formattedOrders,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── Seller reviews ──
router.get('/me/reviews', protect, authorize('seller', 'craftsman'), async (req, res) => {
  try {
    const sellerId = req.user._id
    const { page = 1, limit = 20, rating } = req.query

    const products = await Product.find({ sellerId }).select('name reviews').lean()

    let allReviews = []
    for (const product of products) {
      for (const review of product.reviews) {
        allReviews.push({
          _id: review._id,
          productId: product._id,
          productName: product.name,
          userId: review.userId,
          userName: review.userName,
          rating: review.rating,
          text: review.text,
          createdAt: review.createdAt,
        })
      }
    }

    if (rating) {
      allReviews = allReviews.filter(r => r.rating === Number(rating))
    }

    allReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    const total = allReviews.length
    const start = (page - 1) * limit
    const paginated = allReviews.slice(start, start + Number(limit))

    res.json({ reviews: paginated, total, page: Number(page), pages: Math.ceil(total / limit) })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── Craftsman: completed works CRUD ──
router.get('/me/completed-works', protect, authorize('craftsman'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('completedWorks')
    const works = user?.completedWorks || []

    const workBookingIds = works.map(w => w.bookingId?.toString()).filter(Boolean)

    const completedBookings = await Booking.find({
      craftsmanId: req.user._id,
      status: 'completed',
      _id: { $nin: workBookingIds },
    })
      .populate('userId', 'name phone')
      .sort({ updatedAt: -1 })
      .lean()

    res.json({ works, availableBookings: completedBookings })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.post('/me/completed-works', protect, authorize('craftsman'), workUpload.array('images', 6), async (req, res) => {
  try {
    const { bookingId, title, description, service } = req.body
    if (!bookingId) return res.status(400).json({ message: 'Buyurtma tanlash majburiy' })
    if (!title) return res.status(400).json({ message: 'Sarlavha majburiy' })

    const booking = await Booking.findOne({ _id: bookingId, craftsmanId: req.user._id, status: 'completed' })
    if (!booking) return res.status(400).json({ message: 'Tugatilgan buyurtma topilmadi' })

    const alreadyExists = await User.findOne({ _id: req.user._id, 'completedWorks.bookingId': bookingId })
    if (alreadyExists) return res.status(400).json({ message: 'Bu buyurtma uchun allaqachon ish qo\'shilgan' })

    const images = (req.files || []).map(f => `/uploads/${f.filename}`)
    const work = { bookingId, title, description: description || '', service: service || booking.service || '', images, completedAt: booking.updatedAt || new Date() }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $push: { completedWorks: { $each: [work], $position: 0 } } },
      { new: true }
    ).select('completedWorks')

    res.status(201).json({ work: user.completedWorks[user.completedWorks.length - 1] })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

router.delete('/me/completed-works/:workId', protect, authorize('craftsman'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { completedWorks: { _id: req.params.workId } } },
      { new: true }
    ).select('completedWorks')
    res.json({ works: user.completedWorks })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// ── Public: get craftsman reviews from bookings ──
router.get('/:id/reviews', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query

    const bookings = await Booking.find({
      craftsmanId: req.params.id,
      rated: true,
      status: 'completed',
    })
      .populate('userId', 'name avatar')
      .sort({ updatedAt: -1 })
      .lean()

    const reviews = bookings
      .filter(b => b.rating)
      .map(b => ({
        _id: b._id,
        userName: b.userId?.name || 'Mijoz',
      userAvatar: b.userId?.avatar || '',
        rating: b.rating,
        review: b.review || '',
        service: b.service,
        date: b.updatedAt,
      }))

    const total = reviews.length
    const start = (page - 1) * limit
    const paginated = reviews.slice(start, start + Number(limit))

    const agg = await Booking.aggregate([
      { $match: { craftsmanId: require('mongoose').Types.ObjectId.createFromHexString(req.params.id), rated: true, status: 'completed' } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ])

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    agg.forEach(a => { distribution[a._id] = a.count })

    res.json({ reviews: paginated, total, distribution, page: Number(page), pages: Math.ceil(total / limit) })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.get('/', async (req, res) => {
  try {
    const { role = 'seller', district, service, search } = req.query
    const filter = { role }

    if (district) filter.district = district
    if (service) filter.services = service
    if (search) filter.$or = [
      { name: { $regex: escapeRegex(search), $options: 'i' } },
      { shopName: { $regex: escapeRegex(search), $options: 'i' } },
    ]

    const sellers = await User.find(filter).select('-password').sort({ rating: -1 })
    res.json({ sellers })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const seller = await User.findById(req.params.id)
      .select('-password')
      .populate({ path: 'completedWorks.bookingId', select: 'service address updatedAt' })
    if (!seller) return res.status(404).json({ message: 'Sotuvchi topilmadi' })

    const products = await Product.find({ sellerId: seller._id, status: 'active' })
    res.json({ seller, products })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.get('/:id/stats', async (req, res) => {
  try {
    const products = await Product.find({ sellerId: req.params.id })
    const totalProducts = products.length
    const totalSold = products.reduce((sum, p) => sum + p.sold, 0)
    const totalRevenue = products.reduce((sum, p) => sum + (p.price * p.sold), 0)

    res.json({ totalProducts, totalSold, totalRevenue })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

export default router
