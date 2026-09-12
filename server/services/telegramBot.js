import 'dotenv/config'
import User from '../models/User.js'
import Product from '../models/Product.js'
import Order from '../models/Order.js'
import Booking from '../models/Booking.js'

const BOT_TOKEN = process.env.BOT_TOKEN || ''
const BOT_USERNAME = process.env.BOT_USERNAME || ''
const API = `https://api.telegram.org/bot${BOT_TOKEN}`

let pollOffset = 0
let running = false
let botMode = 'poll'

const BOT_WEBHOOK_URL = (process.env.BOT_WEBHOOK_URL || '').trim()
const BOT_WEBHOOK_SECRET = process.env.BOT_WEBHOOK_SECRET || ''

const fmt = (n) => {
  const v = Number(n) || 0
  return v.toLocaleString('uz-UZ')
}

export function esc(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const menu = {
  keyboard: [
    ['📊 Holat'],
    ['📦 Mening mahsulotlarim', '🛒 Buyurtmalar'],
    ['🖼 Ishlarim', '❓ Yordam'],
  ],
  resize_keyboard: true,
}

async function tgCall(method, payload = {}) {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`TG ${method}: ${res.status}`)
  return res.json()
}

async function sendMessage(chatId, text, extra = {}) {
  try {
    await tgCall('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...extra })
  } catch (err) {
    console.error('Telegram sendMessage error:', err.message)
  }
}

function truncate(text, max = 4000) {
  if (text.length <= max) return text
  return text.slice(0, max - 3) + '...'
}

function mainMenu() {
  return { reply_markup: menu }
}

const HELP_TEXT = [
  'Xona Bazar bot — buyruqlar:',
  '',
  '<b>📊 /holat</b> — ishlar bo\'yicha qisqacha',
  '<b>📦 /productlar</b> — mahsulotlar ro\'yxati (sotuvchi)',
  '<b>📦 /product 1</b> — mahsulot tafsiloti',
  '<b>🛒 /buyurtmalar</b> — buyurtmalar ro\'yxati',
  '<b>🛒 /buyurtma 1</b> — buyurtma tafsiloti',
  '<b>🖼 /ishlar</b> — tugatgan ishlar (usta)',
  '<b>🖼 /ish 1</b> — ish tafsiloti',
  '<b>🔗 /link KOD</b> — panel sozlamalaridan olingan kod bilan ulash',
  '<b>🚫 /unlink</b> — ulanishni bekor qilish',
].join('\n')

function productLine(p, i) {
  const status = p.status === 'active' ? 'faol' : p.status === 'paused' ? 'to\'xtatilgan' : 'tugagan'
  return `${i}. <b>${esc(p.name)}</b>\n   narx: ${fmt(p.price)} so'm | ombor: ${p.stock} | sotilgan: ${p.sold} | ${esc(status)}`
}

function orderShort(o, i) {
  return `${i}. #${String(o._id).slice(-6)} — ${esc(o.status)} | ${o.items.reduce((s, it) => s + it.qty, 0)} dona`
}

function bookingShort(b, i) {
  const st = b.status === 'pending' ? 'kutilmoqda' : b.status === 'quote_sent' ? 'narx yuborilgan' : b.status === 'quote_accepted' ? 'narx qabul qilingan' : b.status === 'in_progress' ? 'bajarilmoqda' : b.status === 'completed' ? 'yakunlangan' : 'bekor qilingan'
  return `${i}. ${esc(b.service)} — ${st}`
}

function bookingDetail(b) {
  const date = b.date ? new Date(b.date).toLocaleDateString('uz-UZ') : '-'
  const st = b.status === 'pending' ? 'kutilmoqda' : b.status === 'quote_sent' ? 'narx yuborilgan' : b.status === 'quote_accepted' ? 'narx qabul qilingan' : b.status === 'in_progress' ? 'bajarilmoqda' : b.status === 'completed' ? 'yakunlangan' : 'bekor qilingan'
  return truncate([
    `<b>🛠 ${esc(b.service)}</b>`,
    `holat: ${st}`,
    `mijoz: ${esc(b.userId?.name) || '-'} (${esc(b.userId?.phone) || '-'})`,
    `sana: ${date} ${b.time ? b.time : ''}`,
    b.address ? `manzil: ${esc(b.address)}` : null,
    b.description ? `izoh: ${esc(b.description)}` : null,
    b.quotedPrice ? `narx taklifi: ${fmt(b.quotedPrice)} so'm` : null,
    b.finalPrice ? `yakuniy narx: ${fmt(b.finalPrice)} so'm` : null,
    b.cancelReason ? `bekor sababi: ${esc(b.cancelReason)}` : null,
  ].filter(Boolean).join('\n'))
}

async function findUserByChatId(chatId) {
  return User.findOne({ telegramChatId: chatId })
}

async function handleStart(chatId, firstName) {
  const existing = await findUserByChatId(chatId)
  if (existing) {
    const roleMsg = existing.role === 'seller' ? 'Sotuvchi paneli ulangan.' : existing.role === 'craftsman' ? 'Usta paneli ulangan.' : 'Xona Bazar akkauntingiz ulangan.'
    await sendMessage(chatId, `Xush kelibsiz, ${esc(firstName) || 'do\'st'}! ✅\n${roleMsg}\n\n${HELP_TEXT}`, mainMenu())
    return
  }
  await sendMessage(chatId, [
    `Xush kelibsiz, ${esc(firstName) || 'do\'st'}! 👋`,
    'Bu Xona Bazar boti. Sotuvchi va ustalarga saytdagi xabarlar (yangi buyurtma, suhbat, so\'rovlar) shu yerga keladi.',
    '',
    '<b>Ulashish uchun:</b>',
    '1. Saytda Sotuvchi/Usta panelingizning Sozlamalar bo\'limiga o\'ting',
    '2. «Telegram bot» qismidan <b>«Ulash kodi olish»</b> tugmasini bosing',
    '3. Olingan kodni shu yerga yozing: <b>/link 123456</b>',
    '',
    HELP_TEXT,
  ].join('\n'), mainMenu())
}

async function handleLink(chatId, code, _firstName) {
  const codeTrim = (code || '').trim()
  if (!/^\d{6}$/.test(codeTrim)) {
    await sendMessage(chatId, 'Kod 6 ta raqamdan iborat bo\'lishi kerak. Masalan: /link 123456')
    return
  }
  const user = await User.findOne({
    telegramLinkCode: codeTrim,
    telegramLinkExpiry: { $gt: new Date() },
  })
  if (!user) {
    await sendMessage(chatId, '❌ Kod noto\'g\'ri yoki muddati o\'tgan. Panel sozlamalaridan yangi kod oling va qayta urinib ko\'ring.')
    return
  }
  const existing = await User.findOne({ telegramChatId: chatId, _id: { $ne: user._id } })
  if (existing) {
    await sendMessage(chatId, '⚠️ Bu Telegram akkauntingiz boshqa akkauntga ulangan. Avval /unlink ni yuboring.')
    return
  }
  user.telegramChatId = String(chatId)
  user.telegramLinkCode = undefined
  user.telegramLinkExpiry = undefined
  await user.save()

  const roleMsg = user.role === 'seller' ? 'Sotuvchi' : user.role === 'craftsman' ? 'Usta' : 'Xona Bazar'
  await sendMessage(chatId, [
    `✅ Ulanish muvaffaqiyatli!`,
    `Akkaunt: <b>${esc(user.name)}</b> (${roleMsg})`,
    '',
    'Endi saytdagi yangi buyurtmalar, suhbatlar va so\'rovlar to\'g\'risidagi xabarlar shu yerga keladi.',
    '',
    HELP_TEXT,
  ].join('\n'), mainMenu())
}

async function handleUnlink(chatId) {
  const user = await findUserByChatId(chatId)
  if (!user) {
    await sendMessage(chatId, 'Siz hali hech qanday akkauntga ulanmagansiz.')
    return
  }
  user.telegramChatId = ''
  await user.save()
  await sendMessage(chatId, '🚫 Ulanish bekor qilindi. Qayta ulash uchun sayt sozlamalaridan yangi kod oling.')
}

async function handleStatus(chatId, user) {
  if (user.role === 'seller') {
    const [products, orders] = await Promise.all([
      Product.countDocuments({ sellerId: user._id }),
      Order.countDocuments({ 'items.sellerId': user._id }),
    ])
    const active = await Product.countDocuments({ sellerId: user._id, status: 'active' })
    const newOrders = await Order.countDocuments({ 'items.sellerId': user._id, status: { $ne: 'completed' } })
    const usersWithChat = await User.findById(user._id).select('reviewCount rating')
    await sendMessage(chatId, [
      `📊 <b>Holat</b> — ${esc(user.shopName || user.name)}`,
      `mahsulotlar: ${products} (faol: ${active})`,
      `buyurtmalar: ${orders} (yangi/ochiq: ${newOrders})`,
      `reyting: ${usersWithChat?.rating || 0} (${usersWithChat?.reviewCount || 0} baho)`,
    ].join('\n'))
  } else if (user.role === 'craftsman') {
    const [bookings, completed] = await Promise.all([
      Booking.countDocuments({ craftsmanId: user._id }),
      Booking.countDocuments({ craftsmanId: user._id, status: 'completed' }),
    ])
    const pending = await Booking.countDocuments({ craftsmanId: user._id, status: { $in: ['pending', 'quote_sent'] } })
    await sendMessage(chatId, [
      `📊 <b>Holat</b> — ${esc(user.name)}`,
      `buyurtmalar (so'rovlar): ${bookings}`,
      `kutilyotgan: ${pending} | yakunlangan: ${completed}`,
      `bajarilgan ishlar: ${user.completedWorks?.length || 0}`,
      `reyting: ${user.rating || 0} (${user.reviewCount || 0} baho)`,
    ].join('\n'))
  } else {
    await sendMessage(chatId, 'Bu buyruq faqat sotuvchi va ustalar uchun. Sayt panelidan akkauntingizni ulang.')
  }
}

async function handleProducts(chatId, user) {
  const products = await Product.find({ sellerId: user._id }).sort({ createdAt: -1 }).limit(20)
  if (!products.length) {
    await sendMessage(chatId, 'Hozircha mahsulotlar yo\'q.')
    return
  }
  const text = products.map((p, i) => productLine(p, i + 1)).join('\n\n')
  await sendMessage(chatId, `<b>📦 Mening mahsulotlarim (${products.length})</b>\n\n${truncate(text)}\n\nTafsilot uchun: <b>/product 1</b>`)
}

async function handleProduct(chatId, user, num) {
  const products = await Product.find({ sellerId: user._id }).sort({ createdAt: -1 }).limit(100)
  const idx = Number(num)
  const p = Number.isInteger(idx) && idx >= 1 ? products[idx - 1] : products[0]
  if (!p) {
    await sendMessage(chatId, 'Mahsulot topilmadi. Ro\'yxat uchun: /productlar')
    return
  }
  let text = [
    `<b>📦 ${esc(p.name)}</b>`,
    `narx: ${fmt(p.price)} so'm`,
    p.oldPrice ? `chegirma: ${fmt(p.oldPrice)} so'm` : null,
    `ombor: ${p.stock} | sotilgan: ${p.sold}`,
    `holat: ${p.status === 'active' ? 'faol' : p.status === 'paused' ? 'to\'xtatilgan' : 'tugagan'}`,
    `reyting: ${p.rating || 0} (${p.reviews?.length || 0} baho)`,
  ].filter(Boolean)
  if (p.variants?.length) {
    text.push('')
    text.push('variantlar:')
    p.variants.slice(0, 10).forEach((v, vi) => {
      text.push(`  ${vi + 1}. ${v.color ? esc(v.color) + ' ' : ''}${v.size ? esc(v.size) + ' ' : ''}— ${fmt(v.price)} so'm, ombor ${v.stock ?? 0}`)
    })
  }
  if (p.description) text.push('', esc(p.description))
  await sendMessage(chatId, truncate(text.join('\n')))
}

async function handleOrders(chatId, user) {
  if (user.role === 'seller') {
    const orders = await Order.find({ 'items.sellerId': user._id }).sort({ createdAt: -1 }).limit(20)
    if (!orders.length) {
      await sendMessage(chatId, 'Hozircha buyurtmalar yo\'q.')
      return
    }
    const text = orders.map((o, i) => orderShort(o, i + 1)).join('\n')
    await sendMessage(chatId, `<b>🛒 Buyurtmalar (${orders.length})</b>\n\n${truncate(text)}\n\nTafsilot uchun: <b>/buyurtma 1</b>`)
  } else if (user.role === 'craftsman') {
    const bookings = await Booking.find({ craftsmanId: user._id }).sort({ createdAt: -1 }).limit(20)
    if (!bookings.length) {
      await sendMessage(chatId, 'Hozircha so\'rovlar yo\'q.')
      return
    }
    const text = bookings.map((b, i) => bookingShort(b, i + 1)).join('\n')
    await sendMessage(chatId, `<b>🛒 So'rovlar / buyurtmalar (${bookings.length})</b>\n\n${truncate(text)}\n\nTafsilot uchun: <b>/buyurtma 1</b>`)
  } else {
    await sendMessage(chatId, 'Bu buyruq faqat sotuvchi va ustalar uchun.')
  }
}

async function handleOrderDetail(chatId, user, num) {
  if (user.role === 'seller') {
    const orders = await Order.find({ 'items.sellerId': user._id }).sort({ createdAt: -1 }).limit(100)
    const idx = Number(num)
    const o = Number.isInteger(idx) && idx >= 1 ? orders[idx - 1] : orders[0]
    if (!o) {
      await sendMessage(chatId, 'Buyurtma topilmadi. Ro\'yxat uchun: /buyurtmalar')
      return
    }
    const date = new Date(o.createdAt).toLocaleDateString('uz-UZ')
    const st = o.status === 'pending' ? 'kutilmoqda' : o.status === 'confirmed' ? 'tasdiqlangan' : o.status === 'completed' ? 'yakunlangan' : o.status === 'cancelled' ? 'bekor qilingan' : o.status
    let text = [
      `<b>🛒 Buyurtma #${String(o._id).slice(-6)}</b>`,
      `sana: ${date}`,
      `holat: ${st}`,
      `mijoz: ${esc(o.userId?.name) || '-'} (${esc(o.userId?.phone) || '-'})`,
      o.address?.city ? `manzil: ${esc(o.address.city)}, ${esc(o.address.street || '')}` : null,
      o.phone ? `telefon: ${esc(o.phone)}` : null,
      o.note ? `izoh: ${esc(o.note)}` : null,
      '',
      '<b>Mahsulotlar:</b>',
    ]
    let total = 0
    o.items.forEach(it => {
      total += (it.price || 0) * it.qty
      text.push(`• ${esc(it.name)} × ${it.qty} — ${fmt(it.price * it.qty)} so'm`)
    })
    text.push('', `jami: <b>${fmt(total)} so'm</b>`)
    await sendMessage(chatId, truncate(text.join('\n'), 3500), { reply_markup: orderActionsInline(o) })
  } else if (user.role === 'craftsman') {
    const bookings = await Booking.find({ craftsmanId: user._id }).sort({ createdAt: -1 }).limit(100).populate('userId', 'name phone avatar')
    const idx = Number(num)
    const b = Number.isInteger(idx) && idx >= 1 ? bookings[idx - 1] : bookings[0]
    if (!b) {
      await sendMessage(chatId, 'So\'rov topilmadi. Ro\'yxat uchun: /buyurtmalar')
      return
    }
    await sendMessage(chatId, bookingDetail(b), { reply_markup: bookingActionsInline(b) })
  } else {
    await sendMessage(chatId, 'Bu buyruq faqat sotuvchi va ustalar uchun.')
  }
}

async function handleWorks(chatId, user) {
  if (user.role !== 'craftsman') {
    await sendMessage(chatId, 'Bu buyruq faqat ustalar uchun.')
    return
  }
  const works = user.completedWorks || []
  if (!works.length) {
    await sendMessage(chatId, 'Hozircha tugatgan ishlar yo\'q.')
    return
  }
  const text = works.slice(0, 20).map((w, i) => `${i + 1}. ${esc(w.title)} — ${esc(w.service || '')}`.trim()).join('\n')
  await sendMessage(chatId, `<b>🖼 Tugatgan ishlar (${works.length})</b>\n\n${truncate(text)}\n\nTafsilot uchun: <b>/ish 1</b>`)
}

async function handleWorkDetail(chatId, user, num) {
  if (user.role !== 'craftsman') {
    await sendMessage(chatId, 'Bu buyruq faqat ustalar uchun.')
    return
  }
  const works = user.completedWorks || []
  const idx = Number(num)
  const w = Number.isInteger(idx) && idx >= 1 ? works[idx - 1] : works[0]
  if (!w) {
    await sendMessage(chatId, 'Ish topilmadi.')
    return
  }
  const date = w.completedAt ? new Date(w.completedAt).toLocaleDateString('uz-UZ') : '-'
  let text = [
    `<b>🖼 ${esc(w.title)}</b>`,
    w.service ? `xizmat: ${esc(w.service)}` : null,
    w.color ? `rang: ${esc(w.color)}` : null,
    `bajarilgan sana: ${date}`,
    w.description ? `izoh: ${esc(w.description)}` : null,
  ].filter(Boolean)
  await sendMessage(chatId, truncate(text.join('\n')))
}

function parseCommand(raw) {
  if (!raw) return null
  let t = raw.trim()
  t = t.replace(/@\w+/, '').trim()
  if (!t.startsWith('/')) return null
  const [cmd, ...rest] = t.split(/\s+/)
  return { cmd: cmd.toLowerCase(), arg: rest.join(' ').trim() }
}

async function dispatchMessage(chatId, msg) {
  const firstName = msg.from?.first_name || ''
  const text = (msg.text || '').trim()

  const pendingQuote = pendingPriceInput.get(chatId)
  if (pendingQuote) {
    const clean = text.replace(/[^\d]/g, '')
    if (/^\d{2,}$/.test(clean)) {
      const price = Number(clean)
      pendingPriceInput.delete(chatId)
      await applyQuote(chatId, pendingQuote, price)
      return
    }
    await sendMessage(chatId, "Narxni faqat raqam bilan yozing (so'mda), masalan: 150000")
    return
  }

  const aliasMap = {
    '📊 holat': '/holat',
    "📦 mening mahsulotlarim": '/productlar',
    '🛒 buyurtmalar': '/buyurtmalar',
    '🖼 ishlarim': '/ishlar',
    '❓ yordam': '/yordam',
  }
  const normalized = aliasMap[text.toLowerCase()] || text

  if (normalized === '/start') {
    await handleStart(chatId, firstName)
    return
  }
  if (normalized === '/link') {
    await handleLink(chatId, '', firstName)
    return
  }

  const parsed = parseCommand(normalized)
  if (parsed) {
    if (parsed.cmd === '/link') {
      await handleLink(chatId, parsed.arg, firstName)
      return
    }
    const user = await findUserByChatId(chatId)
    if (!user) {
      await sendMessage(chatId, 'Siz hali akkauntga ulanmagansiz. 📱 Sayt paneli → Sozlamalar → Telegram bot bo\'limidan ulanish kodini oling va /link KOD deb yozing.')
      return
    }
    switch (parsed.cmd) {
      case '/unlink':
        await handleUnlink(chatId)
        return
      case '/yordam':
        await sendMessage(chatId, HELP_TEXT, mainMenu())
        return
      case '/holat':
        await handleStatus(chatId, user)
        return
      case '/productlar':
        await handleProducts(chatId, user)
        return
      case '/product':
        await handleProduct(chatId, user, parsed.arg)
        return
      case '/buyurtmalar':
        await handleOrders(chatId, user)
        return
      case '/buyurtma':
        await handleOrderDetail(chatId, user, parsed.arg)
        return
      case '/ishlar':
        await handleWorks(chatId, user)
        return
      case '/ish':
        await handleWorkDetail(chatId, user, parsed.arg)
        return
      default:
        await sendMessage(chatId, 'Noma\'lum buyruq. Yordam: /yordam')
    }
    return
  }

  // Bog'langan bo'lsa, erkin matn — yordam ko'rsatish
  const user = await findUserByChatId(chatId)
  if (user) {
    await sendMessage(chatId, HELP_TEXT, mainMenu())
  } else {
    await sendMessage(chatId, 'Ulanish uchun: /link KOD — sayt paneli Sozlamalar → Telegram bot bo\'limidan kodingizni oling.')
  }
}

async function poll() {
  if (!running || botMode !== 'poll' || !BOT_TOKEN) return
  try {
    const res = await fetch(`${API}/getUpdates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offset: pollOffset, timeout: 30, allowed_updates: ['message'] }),
    })
    if (!res.ok) {
      console.error(`Telegram getUpdates: ${res.status}`)
      setTimeout(poll, 10000)
      return
    }
    const data = await res.json()
    if (data.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        pollOffset = update.update_id + 1
        handleUpdate(update)
      }
    }
  } catch (err) {
    console.error('Telegram poll error:', err.message)
  }
  setTimeout(poll, 1000)
}

export async function notifyUser(userId, text) {
  if (!BOT_TOKEN) return false
  try {
    const user = await User.findById(userId).select('telegramChatId notifTelegram')
    if (!user || !user.telegramChatId || user.notifTelegram === false) return false
    await sendMessage(user.telegramChatId, text)
    return true
  } catch (err) {
    console.error('Telegram notify error:', err.message)
    return false
  }
}

export function getBotConfig() {
  return { tokenSet: Boolean(BOT_TOKEN), username: BOT_USERNAME || '' }
}

// ── webhook ──
async function setWebhook(url) {
  const body = {
    url,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: false,
  }
  if (BOT_WEBHOOK_SECRET) body.secret_token = BOT_WEBHOOK_SECRET
  const res = await fetch(`${API}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`TG setWebhook: ${res.status}`)
  const data = await res.json()
  if (!data.ok) throw new Error(`TG setWebhook: ${data.description || 'xato'}`)
  return data
}

async function deleteWebhook() {
  try {
    await tgCall('deleteWebhook', {})
  } catch (err) {
    console.error('Telegram deleteWebhook:', err.message)
  }
}

function telegramUpdateMiddleware(fn) {
  return (update) => Promise.resolve(fn(update)).catch(err => {
    console.error('Telegram update error:', err.message)
  })
}

const callbackHandlers = []

export function registerCallback(prefix, handler) {
  callbackHandlers.push({ prefix, handler })
}

async function answerCallbackQuery(queryId, text) {
  try {
    await tgCall('answerCallbackQuery', {
      callback_query_id: queryId,
      ...(text ? { text } : {}),
    })
  } catch (err) {
    console.error('Telegram answerCallbackQuery:', err.message)
  }
}

export function getBotMode() {
  return botMode
}

export const handleUpdate = telegramUpdateMiddleware(async (update) => {
  if (!update) return
  if (update.callback_query) {
    const cq = update.callback_query
    const chatId = String(cq.message?.chat?.id || cq.from?.id)
    const data = String(cq.data || '')
    for (const { prefix, handler } of callbackHandlers) {
      if (data === prefix || data.startsWith(prefix)) {
        await handler({ chatId, cq, data, arg: data.slice(String(prefix).length) })
        return
      }
    }
    await answerCallbackQuery(cq.id, '')
    return
  }
  if (update.message && update.message.text !== undefined) {
    await dispatchMessage(String(update.message.chat.id), update.message)
  }
})

export async function initTelegramBot() {
  if (!BOT_TOKEN) {
    console.log("Telegram bot: BOT_TOKEN sozlanmagan — bot kutish rejimida (server .env ga BOT_TOKEN qo'shing)")
    return 'disabled'
  }
  if (running) return botMode
  running = true

  if (BOT_WEBHOOK_URL) {
    try {
      await setWebhook(BOT_WEBHOOK_URL)
      botMode = 'webhook'
    } catch (err) {
      console.error("Telegram webhook sozlashda xato, poll rejimiga o'tamiz:", err.message)
      botMode = 'poll'
      await deleteWebhook()
      setTimeout(poll, 500)
    }
  } else {
    await deleteWebhook()
    botMode = 'poll'
    setTimeout(poll, 100)
  }

  console.log(`Telegram bot ishga tushdi${BOT_USERNAME ? ` (@${BOT_USERNAME})` : ''} [${botMode}]`)
  return botMode
}

// ── Inline tugmalar: buyurtma / booking boshqaruvi ──
const pendingPriceInput = new Map()

function bookingActionsInline(b) {
  const rows = []
  if (b.status === 'pending') {
    rows.push([
      { text: '✅ Qabul qilish', callback_data: `bj_accept:${b._id}` },
      { text: '❌ Rad etish', callback_data: `bj_cancel:${b._id}` },
    ])
    rows.push([{ text: '💬 Narx taklifi', callback_data: `bj_price:${b._id}` }])
  } else if (b.status === 'quote_accepted') {
    rows.push([
      { text: '▶️ Ishni boshlash', callback_data: `bj_start:${b._id}` },
      { text: '❌ Bekor qilish', callback_data: `bj_cancel:${b._id}` },
    ])
  } else if (b.status === 'in_progress') {
    rows.push([
      { text: '✅ Yakunlash', callback_data: `bj_done:${b._id}` },
      { text: '❌ Bekor qilish', callback_data: `bj_cancel:${b._id}` },
    ])
  }
  if (!rows.length) return {}
  return { inline_keyboard: rows }
}

function orderActionsInline(o) {
  const rows = []
  if (o.status === 'pending') {
    rows.push([
      { text: '✅ Tasdiqlash', callback_data: `ord_accept:${o._id}` },
      { text: '❌ Bekor qilish', callback_data: `ord_cancel:${o._id}` },
    ])
  } else if (o.status === 'confirmed') {
    rows.push([
      { text: '✅ Yakunlash', callback_data: `ord_done:${o._id}` },
      { text: '❌ Bekor qilish', callback_data: `ord_cancel:${o._id}` },
    ])
  }
  if (!rows.length) return {}
  return { inline_keyboard: rows }
}

async function loadBooking(token) {
  return Booking.findById(token)
    .populate('userId', 'name phone avatar')
    .populate('craftsmanId', 'name phone avatar services')
}

const bookingStatusMsg = {
  quote_accepted: 'qabul qilindi ✅',
  in_progress: 'bajarilmoqda ▶️',
  completed: 'yakunlandi ✅',
  cancelled: 'bekor qilindi ❌',
}

const orderStatusMsg = {
  confirmed: 'tasdiqlandi ✅',
  completed: 'yakunlandi ✅',
  cancelled: 'bekor qilindi ❌',
}

async function handleBookingCallback(action, token, ctx) {
  const { cq, chatId } = ctx
  const user = await findUserByChatId(chatId)
  if (!user || user.role !== 'craftsman') {
    return answerCallbackQuery(cq.id, '❌ Faqat usta ulangan akkaunt uchun')
  }
  const booking = await loadBooking(token)
  if (!booking) return answerCallbackQuery(cq.id, 'Buyurtma topilmadi')
  const ownerId = booking.craftsmanId?._id ? String(booking.craftsmanId._id) : String(booking.craftsmanId)
  if (ownerId !== String(user._id)) {
    return answerCallbackQuery(cq.id, "Bu sizning buyurtmangiz emas")
  }

  if (action === 'price') {
    pendingPriceInput.set(chatId, String(booking._id))
    return answerCallbackQuery(cq.id, "Narxni so'mda yozing (masalan: 150000)")
  }

  const allowed = {
    accept: ['pending'],
    start: ['quote_accepted'],
    done: ['in_progress'],
    cancel: ['pending', 'quote_accepted', 'in_progress'],
  }
  if (!allowed[action]?.includes(booking.status)) {
    return answerCallbackQuery(cq.id, `Hozirgi holat: ${booking.status}`)
  }

  if (action === 'accept') booking.status = 'quote_accepted'
  else if (action === 'start') booking.status = 'in_progress'
  else if (action === 'done') {
    booking.status = 'completed'
    await User.findByIdAndUpdate(booking.craftsmanId, { $inc: { completedJobs: 1 } }).catch(() => {})
  } else if (action === 'cancel') booking.status = 'cancelled'
  try {
    await booking.save()
  } catch (e) {
    return answerCallbackQuery(cq.id, 'Saqlashda xato: ' + e.message)
  }
  const msg = bookingStatusMsg[booking.status] || booking.status
  await answerCallbackQuery(cq.id, `✅ ${msg}`)
  notifyUser(booking.userId, [
    `<b>🛠 Buyurtma holati</b>`,
    `xizmat: ${esc(booking.service)}`,
    `holat: ${msg}`,
    booking.quotedPrice ? `narx taklifi: ${fmt(booking.quotedPrice)} so'm` : null,
  ].filter(Boolean).join('\n'))
  await sendMessage(chatId, bookingDetail(booking), { reply_markup: bookingActionsInline(booking) })
}

async function handleOrderCallback(action, token, ctx) {
  const { cq, chatId } = ctx
  const user = await findUserByChatId(chatId)
  if (!user || user.role !== 'seller') {
    return answerCallbackQuery(cq.id, '❌ Faqat sotuvchi ulangan akkaunt uchun')
  }
  const order = await Order.findById(token).populate('userId', 'name phone')
  if (!order) return answerCallbackQuery(cq.id, 'Buyurtma topilmadi')
  const ownerItem = order.items.find(it => String(it.sellerId) === String(user._id))
  if (!ownerItem) return answerCallbackQuery(cq.id, "Bu sizning buyurtmangiz emas")

  const allowed = {
    accept: ['pending'],
    done: ['confirmed'],
    cancel: ['pending', 'confirmed'],
  }
  if (!allowed[action]?.includes(order.status)) {
    return answerCallbackQuery(cq.id, `Hozirgi holat: ${order.status}`)
  }

  if (action === 'accept') order.status = 'confirmed'
  else if (action === 'done') order.status = 'completed'
  else if (action === 'cancel') order.status = 'cancelled'
  await order.save()

  const msg = orderStatusMsg[order.status] || order.status
  await answerCallbackQuery(cq.id, `✅ ${msg}`)
  notifyUser(order.userId, [
    `<b>📦 Buyurtma holati</b>`,
    `mahsulot: ${esc(ownerItem.name)}`,
    `holat: ${msg}`,
  ].join('\n'))
  await sendMessage(chatId, `<b>🛒 Buyurtma #${String(order._id).slice(-6)}</b> — ${msg}`, { reply_markup: orderActionsInline(order) })
}

async function applyQuote(chatId, bookingId, price) {
  try {
    const booking = await loadBooking(bookingId)
    if (!booking) {
      await sendMessage(chatId, 'Buyurtma topilmadi')
      return
    }
    if (booking.status !== 'pending') {
      await sendMessage(chatId, `Holat o'zgargan: ${booking.status}`)
      return
    }
    booking.quotedPrice = price
    booking.status = 'quote_sent'
    await booking.save()
    const craftsmanName = booking.craftsmanId?.name || 'Usta'
    notifyUser(booking.userId, [
      `<b>💰 Narx taklifi</b>`,
      `usta: ${esc(craftsmanName)}`,
      `xizmat: ${esc(booking.service)}`,
      `narx: ${fmt(price)} so'm`,
      'holat: mijozdan javob kutilmoqda',
    ].join('\n'))
    await sendMessage(chatId, `✅ Narx taklifi yuborildi: ${fmt(price)} so'm`, { reply_markup: bookingActionsInline(booking) })
  } catch (err) {
    console.error('applyQuote error:', err.message)
  }
}

for (const name of ['accept', 'cancel', 'start', 'done', 'price']) {
  registerCallback(`bj_${name}:`, (c) => handleBookingCallback(name, c.arg, c))
}
for (const name of ['accept', 'cancel', 'done']) {
  registerCallback(`ord_${name}:`, (c) => handleOrderCallback(name, c.arg, c))
}

