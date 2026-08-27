import { Router } from 'express'
import Conversation from '../models/Conversation.js'
import { protect } from '../middleware/auth.js'

const router = Router()

router.get('/', protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user._id })
      .populate('participants', 'name avatar color shopName')
      .sort({ lastTime: -1 })

    const result = conversations.map(c => {
      const other = c.participants.find(p => p._id.toString() !== req.user._id.toString())
      const unread = c.messages.filter(m => !m.read && m.sender.toString() !== req.user._id.toString()).length
      return {
        _id: c._id,
        seller: other,
        messages: c.messages,
        lastMessage: c.lastMessage,
        lastTime: c.lastTime,
        unread,
      }
    })

    res.json({ conversations: result })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.post('/', protect, async (req, res) => {
  try {
    const { sellerId, text } = req.body
    if (!sellerId || !text) return res.status(400).json({ message: "sellerId va text majburiy" })

    if (sellerId === req.user._id.toString()) {
      return res.status(400).json({ message: "O'zingizga xabar yozib bo'lmaydi" })
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, sellerId], $size: 2 }
    })

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, sellerId],
        messages: [{ sender: req.user._id, text }],
        lastMessage: text,
        lastTime: new Date(),
      })
    } else {
      conversation.messages.push({ sender: req.user._id, text })
      conversation.lastMessage = text
      conversation.lastTime = new Date()
      await conversation.save()
    }

    const savedMsg = conversation.messages[conversation.messages.length - 1]

    if (req.io && req.onlineUsers) {
      conversation.participants.forEach(pid => {
        const uid = pid.toString()
        if (uid !== req.user._id.toString() && req.onlineUsers.has(uid)) {
          req.io.to(req.onlineUsers.get(uid)).emit('new_message', {
            conversationId: conversation._id,
            message: { _id: savedMsg._id || Date.now().toString(), sender: req.user._id, text, read: false, createdAt: savedMsg.createdAt || new Date() },
          })
        }
      })
    }

    res.status(201).json({ conversation })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

router.post('/:id/messages', protect, async (req, res) => {
  try {
    const { text } = req.body
    if (!text) return res.status(400).json({ message: "Xabar matni bo'sh bo'lishi mumkin emas" })

    const conversation = await Conversation.findById(req.params.id)
    if (!conversation) return res.status(404).json({ message: 'Suhbat topilmadi' })

    const uid = req.user._id.toString()
    if (!conversation.participants.some(p => p.toString() === uid)) {
      return res.status(403).json({ message: "Bu suhbatga yozishga ruxsat yo'q" })
    }

    const msg = { sender: req.user._id, text, read: false }
    conversation.messages.push(msg)
    conversation.lastMessage = text
    conversation.lastTime = new Date()
    await conversation.save()

    const savedMsg = conversation.messages[conversation.messages.length - 1]

    if (req.io && req.onlineUsers) {
      conversation.participants.forEach(pid => {
        const pidStr = pid.toString()
        if (pidStr !== uid && req.onlineUsers.has(pidStr)) {
          req.io.to(req.onlineUsers.get(pidStr)).emit('new_message', {
            conversationId: conversation._id,
            message: { _id: savedMsg._id || Date.now().toString(), sender: uid, text, read: false, createdAt: savedMsg.createdAt || new Date() },
          })
        }
      })
    }

    res.json({ message: msg, conversation })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

router.put('/:id/read', protect, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
    if (!conversation) return res.status(404).json({ message: 'Suhbat topilmadi' })

    const uid = req.user._id.toString()
    if (!conversation.participants.some(p => p.toString() === uid)) {
      return res.status(403).json({ message: "Bu suhbatni o'qishga ruxsat yo'q" })
    }

    conversation.messages.forEach(m => {
      if (m.sender.toString() !== uid) m.read = true
    })
    await conversation.save()

    res.json({ success: true })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

export default router
