import { Router } from 'express'
import multer from 'multer'
import User from '../models/User.js'
import { generateToken, protect } from '../middleware/auth.js'

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
      const ext = file.originalname.split('.').pop()
      cb(null, `avatar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`)
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Fayl rasm bo\'lishi kerak'), false)
  }
})

const router = Router()

router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, role, shopName, location, lat, lng, description, services, experience, district, priceRange } = req.body

    const exists = await User.findOne({ email })
    if (exists) return res.status(400).json({ message: 'Email allaqachon ro\'yxatdan o\'tgan' })

    if (!password || password.length < 6) return res.status(400).json({ message: 'Parol kamida 6 ta belgi bo\'lishi kerak' })
    if (!/[A-Z]/.test(password)) return res.status(400).json({ message: 'Parolda kamida 1 ta katta harf bo\'lishi kerak' })
    if (!/[a-z]/.test(password)) return res.status(400).json({ message: 'Parolda kamida 1 ta kichik harf bo\'lishi kerak' })
    if (!/[0-9]/.test(password)) return res.status(400).json({ message: 'Parolda kamida 1 ta raqam bo\'lishi kerak' })

    const ALLOWED_ROLES = ['buyer', 'seller', 'craftsman']
    const safeRole = ALLOWED_ROLES.includes(role) ? role : 'buyer'

    const userData = { name, email, phone, password, role: safeRole }
    if (safeRole === 'seller') {
      Object.assign(userData, { shopName, location, lat, lng, description })
    } else if (safeRole === 'craftsman') {
      Object.assign(userData, { services, experience, district, priceRange })
    }

    const user = await User.create(userData)
    const token = generateToken(user._id)

    res.status(201).json({ user, token })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ message: 'Email va parolni kiriting' })

    const user = await User.findOne({ email })
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Email yoki parol xato' })
    }

    const token = generateToken(user._id)
    res.json({ user, token })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.get('/me', protect, async (req, res) => {
  res.json({ user: req.user })
})

router.put('/profile', protect, upload.single('avatar'), async (req, res) => {
  try {
    const { name, email, phone, shopName, location, description, lat, lng, services, experience, district, priceRange, workingHours, available } = req.body
    const user = await User.findById(req.user._id)

    if (name) user.name = name
    if (email && email !== user.email) {
      const emailTaken = await User.findOne({ email, _id: { $ne: req.user._id } })
      if (emailTaken) return res.status(409).json({ message: 'Bu email allaqachon boshqa foydalanuvchida mavjud' })
      user.email = email
    }
    if (phone) user.phone = phone
    if (shopName !== undefined) user.shopName = shopName
    if (location !== undefined) user.location = location
    if (lat !== undefined && lat !== '') user.lat = Number(lat)
    if (lng !== undefined && lng !== '') user.lng = Number(lng)
    if (description !== undefined) user.description = description
    if (services) user.services = services
    if (experience !== undefined) user.experience = experience
    if (district !== undefined) user.district = district
    if (priceRange !== undefined) user.priceRange = priceRange
    if (workingHours !== undefined) user.workingHours = workingHours
    if (available !== undefined) user.available = available
    if (req.file) user.avatar = `/uploads/${req.file.filename}`

    await user.save()
    res.json({ user })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Joriy va yangi parol majburiy' })

    const user = await User.findById(req.user._id)
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ message: 'Joriy parol noto\'g\'ri' })
    }

    if (newPassword.length < 6) return res.status(400).json({ message: 'Yangi parol kamida 6 ta belgi bo\'lishi kerak' })
    if (!/[A-Z]/.test(newPassword)) return res.status(400).json({ message: 'Parolda kamida 1 ta katta harf bo\'lishi kerak' })
    if (!/[a-z]/.test(newPassword)) return res.status(400).json({ message: 'Parolda kamida 1 ta kichik harf bo\'lishi kerak' })
    if (!/[0-9]/.test(newPassword)) return res.status(400).json({ message: 'Parolda kamida 1 ta raqam bo\'lishi kerak' })

    user.password = newPassword
    await user.save()

    res.json({ message: 'Parol muvaffaqiyatli o\'zgartirildi. Qaytadan kiring.' })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

export default router
