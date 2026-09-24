import { Router } from 'express'
import multer from 'multer'
import crypto from 'crypto'
import User from '../models/User.js'
import { generateToken, protect } from '../middleware/auth.js'
import { rateLimit } from '../middleware/rate-limit.js'
import { getBotConfig, notifyAdminAboutNewUser, sendPasswordResetCode } from '../services/telegramBot.js'

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

// Telegram Login Widget uchun bot username (public — widget render qilish uchun)
router.get('/telegram/config', async (req, res) => {
  const bot = await getBotConfig()
  res.json({
    botUsername: bot.username,
    botTokenSet: bot.tokenSet,
  })
})

const loginEmailKey = (req) => {
  const email = String(req.body?.email || req.body?.login || '').trim().toLowerCase()
  return email || 'no-email'
}

// ── Telefon raqam normalizatsiyasi ──
// DB'da telefon lar turli formatda saqlangan bo'lishi mumkin: +998901234567, 998901234567, 901234567, +998 90 123 45 67.
// Yagona standart: +998 + 9 raqam (masalan +998901234567).
const phoneDigits = (v) => String(v || '').replace(/\D/g, '')

const normalizePhone = (v) => {
  const d = phoneDigits(v)
  if (!d) return v
  if (d.length === 12 && d.startsWith('998')) return `+${d}`          // +998901234567
  if (d.length === 9) return `+998${d}`                                // 901234567 -> +998901234567
  if (d.length === 12) return `+${d}`                                  // boshqa davlat kodi +994...
  return v
}

// Login'da user har xil formatda kiritishi mumkin — barcha variantlarni qidiramiz
const loginVariants = (v) => {
  const raw = String(v || '').trim().toLowerCase()
  const d = phoneDigits(raw)
  const variants = [raw]
  if (d) {
    variants.push(d)
    if (d.length === 9) variants.push(`+998${d}`, `998${d}`)
    else if (d.length === 12 && d.startsWith('998')) variants.push(`+${d}`)
  }
  return [...new Set(variants.filter(Boolean))]
}

// IP/hisob bo'yicha urinish chegarasi (brute-force/credential-stuffing himoyasi)
const loginIpLimit = rateLimit({ windowMs: 60_000, max: 60 })
const loginAccountLimit = rateLimit({ windowMs: 60_000, max: 10, keyFn: loginEmailKey })

router.post('/register', rateLimit({ windowMs: 60_000, max: 10 }), async (req, res) => {
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

    const userData = { name, email, phone: normalizePhone(phone), password, role: safeRole }
    if (safeRole === 'seller') {
      Object.assign(userData, { shopName, location, lat, lng, description })
    } else if (safeRole === 'craftsman') {
      Object.assign(userData, { services, experience, district, priceRange })
    }
    if (safeRole === 'seller' || safeRole === 'craftsman') {
      userData.status = 'pending'
    }

    const user = await User.create(userData)
    const token = generateToken(user._id)

    if (safeRole === 'seller' || safeRole === 'craftsman') notifyAdminAboutNewUser(user)

    res.status(201).json({ user, token })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

router.post('/login', loginIpLimit, loginAccountLimit, async (req, res) => {
  try {
    const { email, password } = req.body
    const loginValue = String((email || req.body.login || '').trim().toLowerCase())
    if (!loginValue || !password) return res.status(400).json({ message: 'Telefon va parolni kiriting' })

    const variants = loginVariants(loginValue)
    const phoneQuery = variants.map(p => ({ phone: p }))
    // Email bilan kiritilgan eski foydalanuvchilar ham topiladi
    const emailQuery = /@/.test(loginValue) ? [{ email: loginValue }] : []
    const user = await User.findOne({ $or: [...phoneQuery, ...emailQuery] })
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Telefon yoki parol xato' })
    }

    if (user.status === 'pending') {
      return res.status(403).json({ message: 'Hisobingiz admin tomonidan tasdiqlanishi kutilmoqda. Iltimos, keyinroq urinib ko\'ring.' })
    }
    if (user.status === 'rejected') {
      return res.status(403).json({ message: 'Hisobingiz rad etilgan. Qo\'llab-quvvatlash xizmatiga murojaat qiling.' })
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
    const { name, email, phone, shopName, location, description, lat, lng, services, experience, district, priceRange, workingHours, available, social } = req.body
    const user = await User.findById(req.user._id)

    if (name) user.name = name
    if (email && email !== user.email) {
      const emailTaken = await User.findOne({ email, _id: { $ne: req.user._id } })
      if (emailTaken) return res.status(409).json({ message: 'Bu email allaqachon boshqa foydalanuvchida mavjud' })
      user.email = email
    }
    if (phone) user.phone = normalizePhone(phone)
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
    if (social) {
      if (social.telegram !== undefined) user.social.telegram = social.telegram
      if (social.instagram !== undefined) user.social.instagram = social.instagram
      if (social.website !== undefined) user.social.website = social.website
    }
    if (req.file) user.avatar = `/uploads/${req.file.filename}`

    await user.save()
    res.json({ user })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

router.put('/notifications', protect, async (req, res) => {
  try {
    const { notifEmail, notifSms, notifPromo, twoFactor } = req.body
    if (typeof notifEmail !== 'boolean' && typeof notifSms !== 'boolean' && typeof notifPromo !== 'boolean' && typeof twoFactor !== 'boolean') {
      return res.status(400).json({ message: 'Hech qanday sozlama berilmagan' })
    }
    const user = await User.findById(req.user._id)
    if (typeof notifEmail === 'boolean') user.notifEmail = notifEmail
    if (typeof notifSms === 'boolean') user.notifSms = notifSms
    if (typeof notifPromo === 'boolean') user.notifPromo = notifPromo
    if (typeof twoFactor === 'boolean') user.twoFactor = twoFactor
    await user.save()
    res.json({ user })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// ── Telegram bot: ulash kodi olish ──
router.post('/telegram/link-code', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ message: 'Foydalanuvchi topilmadi' })

    const code = String(Math.floor(100000 + Math.random() * 900000))
    user.telegramLinkCode = code
    user.telegramLinkExpiry = new Date(Date.now() + 10 * 60 * 1000)
    await user.save()

    const bot = await getBotConfig()
    res.json({
      code,
      expiresIn: 10,
      botUsername: bot.username,
      botTokenSet: bot.tokenSet,
      message: bot.tokenSet
        ? 'Kod 10 daqiqa davomida amal qiladi. Botga /link KOD deb yuboring'
        : 'Bot hali ishga tushmagan (BOT_TOKEN sozlanmagan). Administratorga murojaat qiling.',
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── Telegram bot: ulanish holati ──
router.get('/telegram/status', protect, async (req, res) => {
  const bot = await getBotConfig()
  res.json({
    linked: Boolean(req.user.telegramChatId),
    chatId: req.user.telegramChatId || '',
    notifTelegram: req.user.notifTelegram !== false,
    botUsername: bot.username,
    botTokenSet: bot.tokenSet,
  })
})

// ── Telegram bot: ajratish ──
router.post('/telegram/unlink', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    user.telegramChatId = ''
    user.notifTelegram = true
    await user.save()
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.post('/telegram/login', rateLimit({ windowMs: 60_000, max: 30 }), async (req, res) => {
  try {
    const { id, first_name, last_name, username, auth_date, hash, role, shopName, location, description, lat, lng, services, experience, district, priceRange, photo_url } = req.body || {}
    if (!id || !hash) return res.status(400).json({ message: 'Telegram ma\'lumotlari to\'liq emas' })

    const secret = crypto.createHash('sha256').update(process.env.BOT_TOKEN || '').digest()
    const dataCheckString = Object.entries({ auth_date, first_name, id, last_name, username, photo_url })
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n')

    const hmac = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex')
    if (hmac !== hash) return res.status(401).json({ message: 'Telegram hash noto\'g\'ri' })

    const authAge = Math.floor(Date.now() / 1000) - Number(auth_date || 0)
    if (authAge > 86400) return res.status(401).json({ message: 'Telegram session muddati tugagan. Qayta kiring' })

    const telegramId = String(id)
    let user = await User.findOne({ telegramId })

    if (!user) {
      const email = `tg_${telegramId}@xona-bazar.local`
      const password = `${telegramId}_${crypto.randomBytes(12).toString('hex')}`
      const ALLOWED_ROLES = ['buyer', 'seller', 'craftsman']
      const safeRole = ALLOWED_ROLES.includes(role) ? role : 'buyer'
      const userName = first_name || username || 'Telegram foydalanuvchi'
      const userData = {
        name: userName,
        email,
        password,
        role: safeRole,
        telegramId,
        telegramChatId: telegramId,
        avatar: photo_url || '',
      }
      if (safeRole === 'seller') {
        Object.assign(userData, { shopName: shopName || '', location: location || '', description: description || '' })
        if (lat !== undefined && lat !== '') userData.lat = Number(lat)
        if (lng !== undefined && lng !== '') userData.lng = Number(lng)
      } else if (safeRole === 'craftsman') {
        Object.assign(userData, { services: services || [], experience: experience || '', district: district || '', priceRange: priceRange || '' })
      }
      if (safeRole === 'seller' || safeRole === 'craftsman') {
        userData.status = 'pending'
      }
      user = await User.create(userData)
      if (safeRole === 'seller' || safeRole === 'craftsman') notifyAdminAboutNewUser(user)
    } else {
      user.telegramChatId = telegramId
      if (first_name && !user.name?.startsWith('Telegram')) user.name = user.name || first_name
      await user.save()
    }

    const token = generateToken(user._id)
    res.json({ user, token })
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

// ── Parolni tiklash: kod so'rash (Telegram orqali) ──
const validatePassword = (newPassword) => {
  if (!newPassword || newPassword.length < 6) return 'Yangi parol kamida 6 ta belgi bo\'lishi kerak'
  if (!/[A-Z]/.test(newPassword)) return 'Parolda kamida 1 ta katta harf bo\'lishi kerak'
  if (!/[a-z]/.test(newPassword)) return 'Parolda kamida 1 ta kichik harf bo\'lishi kerak'
  if (!/[0-9]/.test(newPassword)) return 'Parolda kamida 1 ta raqam bo\'lishi kerak'
  return null
}

const findUserByLogin = async (loginValue) => {
  const variants = loginVariants(loginValue)
  if (!variants.length) return null
  return User.findOne({ $or: variants.map(p => ({ phone: p })) })
}

// 1-qadam: email/telefon bo'yicha hisob topib, Telegram orqali kod yuborish
router.post('/forgot-password', rateLimit({ windowMs: 60_000, max: 5 }), async (req, res) => {
  try {
    const { email, login } = req.body
    const loginValue = email || login
    if (!loginValue) return res.status(400).json({ message: 'Email yoki telefon raqamini kiriting' })

    const user = await findUserByLogin(loginValue)
    // Xavfsizlik: hisob mavjudligini oshkor qilmaslik — har doim "yuborildi" javob
    if (!user) return res.json({ sent: false, message: 'Agar hisob topilsa, kod Telegram orqali yuboriladi' })

    if (!user.telegramChatId) {
      return res.status(400).json({ sent: false, message: 'Hisobingiz Telegram\'ga bog\'lanmagan. Parolni tiklash uchun avval Telegram\'ni ulash kerak.' })
    }

    const code = String(Math.floor(100000 + Math.random() * 900000))
    user.resetCode = code
    user.resetCodeExpiry = new Date(Date.now() + 10 * 60 * 1000)
    await user.save()

    const ok = await sendPasswordResetCode(user, code)
    if (!ok) return res.status(500).json({ sent: false, message: 'Kod yuborilmadi. Telegram bot sozlanmagan bo\'lishi mumkin.' })

    res.json({ sent: true, message: 'Tasdiqlash kodi Telegram orqali yuborildi' })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// 2-qadam: kodni tekshirib, yangi parol o'rnatish
router.post('/reset-password', rateLimit({ windowMs: 60_000, max: 5 }), async (req, res) => {
  try {
    const { email, login, code, newPassword } = req.body
    const loginValue = email || login
    if (!loginValue || !code) return res.status(400).json({ message: 'Email/telefon va kodni kiriting' })

    const passwordError = validatePassword(newPassword)
    if (passwordError) return res.status(400).json({ message: passwordError })

    const user = await findUserByLogin(loginValue)
    if (!user || !user.resetCode || user.resetCode !== String(code).trim()) {
      return res.status(400).json({ message: 'Kod noto\'g\'ri' })
    }
    if (!user.resetCodeExpiry || user.resetCodeExpiry < new Date()) {
      return res.status(400).json({ message: 'Kod muddati tugagan. Qaytadan so\'rang.' })
    }

    user.password = newPassword
    user.resetCode = undefined
    user.resetCodeExpiry = undefined
    await user.save()

    res.json({ message: 'Parol muvaffaqiyatli tiklandi. Yangi parol bilan kiring.' })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

export default router
