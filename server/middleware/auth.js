import jwt from 'jsonwebtoken'
import User from '../models/User.js'

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
