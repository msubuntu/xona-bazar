import jwt from 'jsonwebtoken'
import User from '../models/User.js'

// Pending/rejected seller-ustalar uchun faqat "login/sozlamalar" yo'l qo'yiladi,
// amaliy endpointlar (mahsulot, buyurtma, booking, chat) bloklanadi.
const MODERATION_ALLOWED_PREFIXES = ['/auth/']
const MODERATION_ALLOWED_ENDPOINTS = ['/me', '/profile', '/notifications', '/change-password', '/telegram/status', '/telegram/link-code', '/telegram/unlink']

export const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ message: 'Token topilmadi' })

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id).select('-password')
    if (!user) return res.status(401).json({ message: 'Foydalanuvchi topilmadi' })

    if (user.passwordChangedAt && decoded.iat) {
      const changedTimestamp = Math.floor(user.passwordChangedAt.getTime() / 1000)
      if (decoded.iat < changedTimestamp) {
        return res.status(401).json({ message: 'Parol o\'zgartirilgan. Qaytadan kiring.' })
      }
    }

    // Modеratsiya: seller/craftsman pending yoki rejected bo'lsa amaliy ishlarni bloklash
    if ((user.role === 'seller' || user.role === 'craftsman') &&
        (user.status === 'pending' || user.status === 'rejected')) {
      const original = req.originalUrl || req.url || ''
      const normalized = original.split('?')[0]
      const isAuth = MODERATION_ALLOWED_PREFIXES.some(p => normalized.includes(p))
      let allowed = false
      if (isAuth) {
        const tail = normalized.split('/auth/')[1] || ''
        allowed = MODERATION_ALLOWED_ENDPOINTS.some(e => tail.startsWith(e.replace(/^\//, '')))
      }
      if (!allowed) {
        const msg = user.status === 'pending'
          ? 'Hisob admin tomonidan tasdiqlanishi kutilmoqda'
          : 'Hisob rad etilgan. Qo\'llab-quvvatlashga murojaat qiling'
        return res.status(403).json({ message: msg })
      }
    }

    req.user = user
    next()
  } catch (err) {
    res.status(401).json({ message: 'Token yaroqsiz' })
  }
}

export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Bu amal uchun ruxsat yo'q" })
  }
  next()
}

export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' })
}
