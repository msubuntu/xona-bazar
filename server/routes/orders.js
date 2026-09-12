import { Router } from 'express'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import { protect, authorize } from '../middleware/auth.js'
import { notifyUser, esc } from '../services/telegramBot.js'

const router = Router()

router.get('/seller', protect, authorize('seller', 'craftsman'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query
    const filter = { 'items.sellerId': req.user._id }
    if (status) filter.status = status

    const total = await Order.countDocuments(filter)
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('userId', 'name phone avatar')

    const result = orders.map(order => {
      const sellerItems = order.items.filter(
        item => item.sellerId.toString() === req.user._id.toString()
      )
      const sellerTotal = sellerItems.reduce((sum, item) => sum + item.price * item.qty, 0)
      return {
        _id: order._id,
        buyer: order.userId ? { _id: order.userId._id, name: order.userId.name, phone: order.userId.phone, avatar: order.userId.avatar } : null,
        items: sellerItems,
        total: sellerTotal,
        status: order.status,
        address: order.address,
        phone: order.phone,
        note: order.note,
        createdAt: order.createdAt,
      }
    })

    res.json({ orders: result, total, page: Number(page), pages: Math.ceil(total / limit) })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.get('/', protect, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 })
    res.json({ orders })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.post('/', protect, async (req, res) => {
  try {
    const { items, address, phone, note } = req.body
    if (!items?.length) return res.status(400).json({ message: "Savat bo'sh" })

    let total = 0
    const orderItems = []

    for (const item of items) {
      const product = await Product.findById(item.productId)
      if (!product) return res.status(400).json({ message: `Mahsulot topilmadi: ${item.productId}` })

      let unitPrice = product.price
      let variantInfo = null
      let unitImage = product.image

      if (item.variantId && product.variants && product.variants.length > 0) {
        const variant = product.variants.find(v => v._id.toString() === item.variantId)
        if (!variant) return res.status(400).json({ message: `Variant topilmadi: ${item.variantId}` })
        unitPrice = Number(variant.price)
        unitImage = variant.image || product.image
        variantInfo = {
          _id: variant._id,
          color: variant.color || '',
          colorHex: variant.colorHex || '',
          size: variant.size || '',
          sku: variant.sku || '',
        }
        variant.stock = Math.max(0, (variant.stock != null ? variant.stock : 0) - item.qty)
      } else {
        product.stock = Math.max(0, product.stock - item.qty)
      }

      orderItems.push({
        productId: product._id,
        sellerId: product.sellerId,
        name: product.name,
        price: unitPrice,
        image: unitImage,
        variant: variantInfo,
        qty: item.qty,
      })
      total += unitPrice * item.qty

      product.sold += item.qty
      await product.save()
    }

    const order = await Order.create({
      userId: req.user._id,
      items: orderItems,
      total,
      address,
      phone: phone || req.user.phone,
      note,
    })

    const buyerName = req.user.name || 'Mijoz'
    orderItems.forEach(item => {
      notifyUser(item.sellerId, [
        `<b>📦 Yangi buyurtma!</b>`,
        `mijoz: ${esc(buyerName)}`,
        `mahsulot: ${esc(item.name)} × ${item.qty}`,
        `summa: ${(item.price * item.qty).toLocaleString('uz-UZ')} so'm`,
        `manzil: ${address?.city ? esc(address.city) + (address.street ? ', ' + esc(address.street) : '') : ''}`,
        `holat: yangi buyurtma`,
      ].filter(Boolean).join('\n'))
    })

    res.status(201).json({ order })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

router.put('/:id/status', protect, authorize('seller', 'craftsman'), async (req, res) => {
  try {
    const { status } = req.body
    const order = await Order.findOne({ _id: req.params.id, 'items.sellerId': req.user._id })
    if (!order) return res.status(404).json({ message: 'Buyurtma topilmadi' })
    order.status = status
    await order.save()

    const sellerItems = order.items.filter(item => item.sellerId.toString() === req.user._id.toString())
    const statusMsgs = {
      confirmed: 'tasdiqlandi ✅',
      shipping: 'yetkazishga chiqdi 🚚',
      delivered: 'yetkazib berildi 📦',
      completed: 'yakunlandi ✅',
      cancelled: 'bekor qilindi ❌',
      pending: 'kutilmoqda',
    }
    notifyUser(order.userId, [
      `<b>📦 Buyurtma holati yangilandi</b>`,
      ...sellerItems.map(item => `mahsulot: ${esc(item.name)} x ${item.qty}`),
      `holat: ${statusMsgs[status] || status}`,
    ].filter(Boolean).join('\n'))

    if (req.io && req.onlineUsers && req.onlineUsers.has(order.userId.toString())) {
      req.io.to(req.onlineUsers.get(order.userId.toString())).emit('order_updated', {
        orderId: order._id,
        status,
      })
    }

    res.json({ order })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

export default router
