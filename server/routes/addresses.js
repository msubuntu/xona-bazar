import { Router } from 'express'
import Address from '../models/Address.js'
import { protect } from '../middleware/auth.js'

const router = Router()

// ── Ro'yxat ──
router.get('/', protect, async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user._id }).sort({ isDefault: -1, createdAt: -1 })
    res.json({ addresses })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── Yaratish ──
router.post('/', protect, async (req, res) => {
  try {
    const { title, address, phone, lat, lng, isDefault } = req.body
    if (!address || !address.trim()) {
      return res.status(400).json({ message: 'Manzil matni majburiy' })
    }

    const count = await Address.countDocuments({ user: req.user._id })
    let makeDefault = !!isDefault || count === 0

    if (makeDefault) await Address.updateMany({ user: req.user._id }, { isDefault: false })

    const doc = await Address.create({
      user: req.user._id,
      title: title || 'Manzilim',
      address,
      phone: phone || '',
      lat,
      lng,
      isDefault: makeDefault,
    })

    res.status(201).json({ address: doc })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// ── Tahrirlash ──
router.put('/:id', protect, async (req, res) => {
  try {
    const { title, address, phone, lat, lng, isDefault } = req.body
    const doc = await Address.findOne({ _id: req.params.id, user: req.user._id })
    if (!doc) return res.status(404).json({ message: 'Manzil topilmadi' })

    if (isDefault) await Address.updateMany({ user: req.user._id }, { isDefault: false })

    doc.title = title ?? doc.title
    doc.address = address ?? doc.address
    doc.phone = phone ?? doc.phone
    if (lat !== undefined) doc.lat = lat
    if (lng !== undefined) doc.lng = lng
    if (isDefault !== undefined) doc.isDefault = isDefault
    if (address && !address.trim()) return res.status(400).json({ message: 'Manzil bo\'sh bo\'lishi mumkin emas' })

    await doc.save()
    res.json({ address: doc })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// ── O'chirish ──
router.delete('/:id', protect, async (req, res) => {
  try {
    const doc = await Address.findOneAndDelete({ _id: req.params.id, user: req.user._id })
    if (!doc) return res.status(404).json({ message: 'Manzil topilmadi' })
    if (doc.isDefault) {
      const next = await Address.findOne({ user: req.user._id })
      if (next) { next.isDefault = true; await next.save() }
    }
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── Asosiy qilish ──
router.post('/:id/default', protect, async (req, res) => {
  try {
    const doc = await Address.findOne({ _id: req.params.id, user: req.user._id })
    if (!doc) return res.status(404).json({ message: 'Manzil topilmadi' })
    await Address.updateMany({ user: req.user._id }, { isDefault: false })
    doc.isDefault = true
    await doc.save()
    res.json({ address: doc })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

export default router