import { Router } from 'express'
import Booking from '../models/Booking.js'
import User from '../models/User.js'
import { protect, authorize } from '../middleware/auth.js'
import { notifyUser } from '../services/telegramBot.js'

const router = Router()

// ── Mijoz: booking yaratish ──
router.post('/', protect, async (req, res) => {
  try {
    const { craftsmanId, service, description, date, time, address, phone } = req.body
    if (!craftsmanId || !service || !date) {
      return res.status(400).json({ message: 'Xizmat, sana va usta majburiy' })
    }
    if (typeof service !== 'string' || service.length > 100) {
      return res.status(400).json({ message: 'Xizmat noto\'g\'ri kiritildi' })
    }
    if (Number.isNaN(new Date(date).getTime())) {
      return res.status(400).json({ message: 'Sana noto\'g\'ri' })
    }
    if (typeof craftsmanId !== 'string' || !/^[0-9a-f]{24}$/i.test(craftsmanId)) {
      return res.status(400).json({ message: 'Noto\'g\'ri usta ID' })
    }

    const craftsman = await User.findById(craftsmanId)
    if (!craftsman || craftsman.role !== 'craftsman') {
      return res.status(404).json({ message: 'Usta topilmadi' })
    }

    const booking = await Booking.create({
      craftsmanId,
      userId: req.user._id,
      service,
      description: description || '',
      date,
      time: time || '',
      address: address || '',
      phone: phone || req.user.phone || '',
    })

    notifyUser(craftsmanId, [
      `<b>🛠 Yangi so'rov (buyurtma)</b>`,
      `mijoz: ${req.user.name || 'Mijoz'} (${phone || req.user.phone || '-'})`,
      `xizmat: ${service}`,
      `sana: ${new Date(date).toLocaleDateString('uz-UZ')}${time ? ' ' + time : ''}`,
      address ? `manzil: ${address}` : null,
      description ? `izoh: ${description}` : null,
    ].filter(Boolean).join('\n'))

    const populated = await booking.populate('craftsmanId', 'name phone avatar services')

    res.status(201).json({ booking: populated })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// ── Mijoz: o'z buyurtmalari ──
router.get('/my', protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query
    const filter = { userId: req.user._id }
    if (status) filter.status = status

    const total = await Booking.countDocuments(filter)
    const bookings = await Booking.find(filter)
      .populate('craftsmanId', 'name phone avatar services district')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))

    res.json({ bookings, total, page: Number(page), pages: Math.ceil(total / limit) })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── Usta: o'z buyurtmalari ──
router.get('/craftsman', protect, authorize('craftsman'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query
    const filter = { craftsmanId: req.user._id }
    if (status) filter.status = status

    const total = await Booking.countDocuments(filter)
    const bookings = await Booking.find(filter)
      .populate('userId', 'name phone avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))

    res.json({ bookings, total, page: Number(page), pages: Math.ceil(total / limit) })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── Bitta bookingni ko'rish ──
router.get('/:id', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('craftsmanId', 'name phone avatar services district experience priceRange workingHours')
      .populate('userId', 'name phone avatar')

    if (!booking) return res.status(404).json({ message: 'Buyurtma topilmadi' })

    const uid = req.user._id.toString()
    if (booking.userId._id.toString() !== uid && booking.craftsmanId._id.toString() !== uid && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Bu buyurtmani ko'rishga ruxsat yo'q" })
    }

    res.json({ booking })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── Status o'zgartirish ──
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status, cancelReason } = req.body
    const booking = await Booking.findById(req.params.id)
    if (!booking) return res.status(404).json({ message: 'Buyurtma topilmadi' })

    const uid = req.user._id.toString()
    const isCraftsman = booking.craftsmanId.toString() === uid
    const isUser = booking.userId.toString() === uid

    if (!isCraftsman && !isUser) {
      return res.status(403).json({ message: "Ruxsat yo'q" })
    }

    const VALID_TRANSITIONS = {
      pending: ['cancelled', 'quote_sent'],
      quote_sent: ['cancelled', 'quote_accepted'],
      quote_accepted: ['cancelled', 'in_progress'],
      in_progress: ['cancelled', 'completed'],
      completed: [],
      cancelled: [],
    }

    const allowed = VALID_TRANSITIONS[booking.status] || []
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `"${booking.status}" dan "${status}" ga o'tish mumkin emas` })
    }

    if (status === 'cancelled' && cancelReason) {
      booking.cancelReason = cancelReason
    }

    booking.status = status

    if (status === 'completed') {
      booking.finalPrice = booking.quotedPrice || 0
      await User.findByIdAndUpdate(booking.craftsmanId, { $inc: { completedJobs: 1 } })
    }

    await booking.save()

    const populated = await booking.populate([
      { path: 'craftsmanId', select: 'name phone avatar' },
      { path: 'userId', select: 'name phone avatar' },
    ])

    if (req.io && req.onlineUsers) {
      const notifyUserId = isUser ? booking.craftsmanId.toString() : booking.userId.toString()
      if (req.onlineUsers.has(notifyUserId)) {
        req.io.to(req.onlineUsers.get(notifyUserId)).emit('booking_updated', {
          bookingId: booking._id,
          status,
          quotedPrice: booking.quotedPrice,
          userName: populated.userId?.name || 'Mijoz',
          craftsmanName: populated.craftsmanId?.name || 'Usta',
        })
      }
    }

    const notifyTarget = isUser ? booking.craftsmanId.toString() : booking.userId.toString()
    const statusMsgs = {
      quote_sent: 'mijozga narx taklifi yuborildi',
      quote_accepted: 'narx taklifi qabul qilindi',
      in_progress: 'usta ishni boshladi',
      completed: 'ish yakunlandi',
      cancelled: 'buyurtma bekor qilindi',
    }
    notifyUser(notifyTarget, [
      `<b>🛠 Buyurtma holati yangilandi</b>`,
      `xizmat: ${booking.service}`,
      `holat: ${statusMsgs[status] || status}`,
      booking.quotedPrice ? `narx taklifi: ${booking.quotedPrice.toLocaleString('uz-UZ')} so'm` : null,
    ].filter(Boolean).join('\n'))

    res.json({ booking: populated })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// ── Usta: narx taklif yuborish ──
router.put('/:id/price', protect, authorize('craftsman'), async (req, res) => {
  try {
    const { quotedPrice } = req.body
    const booking = await Booking.findById(req.params.id)
    if (!booking) return res.status(404).json({ message: 'Buyurtma topilmadi' })
    if (booking.craftsmanId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Ruxsat yo'q" })
    }
    if (booking.status !== 'pending') {
      return res.status(400).json({ message: 'Faqat kutilayotgan buyurtmaga narx qo\'yish mumkin' })
    }

    const price = Number(quotedPrice)
    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ message: 'Narx noto\'g\'ri kiritildi' })
    }

    booking.quotedPrice = price
    booking.status = 'quote_sent'
    await booking.save()

    const populated = await booking.populate([
      { path: 'craftsmanId', select: 'name phone avatar' },
      { path: 'userId', select: 'name phone avatar' },
    ])

    if (req.io && req.onlineUsers) {
      const userId = booking.userId.toString()
      if (req.onlineUsers.has(userId)) {
        req.io.to(req.onlineUsers.get(userId)).emit('booking_updated', {
          bookingId: booking._id,
          status: 'quote_sent',
          quotedPrice: booking.quotedPrice,
          craftsmanName: populated.craftsmanId?.name || 'Usta',
        })
      }
    }

    notifyUser(booking.userId, [
      `<b>💰 Narx taklifi</b>`,
      `usta: ${populated.craftsmanId?.name || 'Usta'}`,
      `xizmat: ${booking.service}`,
      `narx: ${price.toLocaleString('uz-UZ')} so'm`,
    ].join('\n'))

    res.json({ booking: populated })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// ── To'lov holatini yangilash ──
router.put('/:id/payment', protect, async (req, res) => {
  try {
    const { paymentStatus, paymentMethod } = req.body
    const booking = await Booking.findById(req.params.id)
    if (!booking) return res.status(404).json({ message: 'Buyurtma topilmadi' })

    const uid = req.user._id.toString()
    if (booking.userId.toString() !== uid && booking.craftsmanId.toString() !== uid) {
      return res.status(403).json({ message: "Ruxsat yo'q" })
    }

    if (paymentStatus) booking.paymentStatus = paymentStatus
    if (paymentMethod) booking.paymentMethod = paymentMethod
    await booking.save()

    res.json({ booking })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// ── Mijoz: baholash ──
router.post('/:id/rate', protect, async (req, res) => {
  try {
    const { rating, review } = req.body
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Baholash 1-5 orasida bo\'lishi kerak' })
    }

    const booking = await Booking.findById(req.params.id)
    if (!booking) return res.status(404).json({ message: 'Buyurtma topilmadi' })
    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Ruxsat yo'q" })
    }
    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'Faqat yakunlangan buyurtmani baholash mumkin' })
    }
    if (booking.rated) {
      return res.status(400).json({ message: 'Allaqachon baholangan' })
    }

    booking.rated = true
    booking.rating = Number(rating)
    booking.review = review || ''
    await booking.save()

    const craftsman = await User.findById(booking.craftsmanId)
    if (craftsman) {
      const allRatings = await Booking.find({
        craftsmanId: booking.craftsmanId,
        rated: true,
        status: 'completed',
      }).select('rating')

      const total = allRatings.length
      const avg = total > 0 ? allRatings.reduce((s, b) => s + b.rating, 0) / total : 0

      craftsman.rating = Math.round(avg * 10) / 10
      craftsman.reviewCount = total
      await craftsman.save()
    }

    res.json({ booking })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

export default router
