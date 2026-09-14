import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import mongoSanitize from 'express-mongo-sanitize'
import { resolve } from 'path'
import { mkdirSync } from 'fs'
import connectDB from './config/db.js'
import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js'
import orderRoutes from './routes/orders.js'
import conversationRoutes from './routes/conversations.js'
import sellerRoutes from './routes/sellers.js'
import bookingRoutes from './routes/bookings.js'
import addressRoutes from './routes/addresses.js'
import Conversation from './models/Conversation.js'
import { initTelegramBot, notifyUser, handleUpdate, esc } from './services/telegramBot.js'

const app = express()

mkdirSync(resolve('uploads'), { recursive: true })
const server = createServer(app)
const CLIENT_URLS = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map(s => s.trim()).filter(Boolean)
const io = new Server(server, { cors: { origin: CLIENT_URLS, credentials: true } })
const onlineUsers = new Map()

await connectDB()

initTelegramBot()

const isProd = process.env.NODE_ENV === 'production'

const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: isProd ? ["'self'"] : ["'self'", "'unsafe-inline'"],
  styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://fonts.googleapis.com"],
  imgSrc: ["'self'", "data:", "blob:", "https://*.tile.openstreetmap.org", "https://unpkg.com"],
  fontSrc: ["'self'", "https://fonts.gstatic.com"],
  connectSrc: ["'self'", "ws:", "wss:"],
  frameSrc: ["'none'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
}
if (isProd) cspDirectives.upgradeInsecureRequests = []

app.use(helmet({
  contentSecurityPolicy: { directives: cspDirectives },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || CLIENT_URLS.includes(origin)),
  credentials: true,
}))
app.use(express.json())

// ── Telegram webhook (BOT_WEBHOOK_URL o'rnatilgan bo'lsa ishlaydi) ──
app.post('/telegram/webhook', (req, res) => {
  const sent = req.headers['x-telegram-bot-api-secret-token']
  const expected = process.env.BOT_WEBHOOK_SECRET
  if (expected && sent !== expected) {
    return res.status(403).json({ ok: false, error: 'forbidden' })
  }
  handleUpdate(req.body || {})
  res.json({ ok: true })
})

app.use(mongoSanitize({ replaceWith: '_' }))

const BLOCKED_EXT = ['.php', '.phtml', '.php3', '.php4', '.php5', '.js', '.mjs', '.html', '.htm', '.exe', '.bat', '.cmd', '.sh', '.bash', '.py', '.rb', '.pl', '.cgi', '.asp', '.aspx', '.jsp']
app.use('/uploads', (req, res, next) => {
  const ext = (req.path.match(/\.\w+$/)?.[0] || '').toLowerCase()
  if (BLOCKED_EXT.includes(ext)) return res.status(403).json({ message: 'Ruxsat etilmagan fayl turi' })
  next()
}, express.static(resolve('uploads')))

app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/conversations', (req, res, next) => { req.io = io; req.onlineUsers = onlineUsers; next() }, conversationRoutes)
app.use('/api/sellers', sellerRoutes)
app.use('/api/bookings', (req, res, next) => { req.io = io; req.onlineUsers = onlineUsers; next() }, bookingRoutes)
app.use('/api/addresses', addressRoutes)

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

app.use((err, req, res, next) => {
  if (err && err.name === 'MulterError') {
    const msg =
      err.code === 'LIMIT_FILE_SIZE' ? 'Fayl hajmi chegaradan oshib ketdi' :
      err.code === 'LIMIT_FILE_COUNT' ? "Fayllar soni chegaradan oshib ketdi" :
      err.code === 'LIMIT_UNEXPECTED_FILE' ? "Fayl maydoni noto'g'ri" :
      'Fayl yuklashda xato yuz berdi'
    return res.status(400).json({ message: msg })
  }
  if (err.message?.includes('Ruxsat etilmagan fayl turi')) return res.status(400).json({ message: err.message })
  next(err)
})

io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  socket.on('join', (userId) => {
    onlineUsers.set(userId, socket.id)
    socket.join(userId)
  })

  socket.on('send_message', async ({ conversationId, senderId, text }) => {
    try {
      const conversation = await Conversation.findById(conversationId)
      if (!conversation) return

      const msg = { sender: senderId, text, read: false, createdAt: new Date() }
      conversation.messages.push(msg)
      conversation.lastMessage = text
      conversation.lastTime = new Date()
      await conversation.save()

      conversation.participants.forEach(pid => {
        const uid = pid.toString()
        if (onlineUsers.has(uid)) {
          io.to(onlineUsers.get(uid)).emit('new_message', {
            conversationId,
            message: { ...msg, _id: msg.createdAt.getTime().toString() },
          })
        }
        if (uid !== senderId.toString()) {
          notifyUser(uid, `<b>💬 Yangi xabar</b>\n${esc(text)}`)
        }
      })
    } catch (err) {
      console.error('Socket message error:', err)
    }
  })

  socket.on('join_conversation', (conversationId) => {
    socket.join(conversationId)
  })

  socket.on('typing', ({ conversationId, userId }) => {
    socket.to(conversationId).emit('user_typing', { userId })
  })

  socket.on('stop_typing', ({ conversationId, userId }) => {
    socket.to(conversationId).emit('user_stop_typing', { userId })
  })

  socket.on('disconnect', () => {
    for (const [userId, socketId] of onlineUsers) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId)
        break
      }
    }
  })
})

const PORT = process.env.PORT || 5000
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`))
