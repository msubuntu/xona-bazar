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

const IMAGE_BASE = (process.env.PUBLIC_URL || 'https://xona-bazar.onrender.com').replace(/\/+$/, '')
function imageUrl(path) {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return IMAGE_BASE + (path.startsWith('/') ? path : '/' + path)
}

const menu = {
  keyboard: [
    ['📊 Holat'],
    ['📦 Mening mahsulotlarim', '🛒 Buyurtmalar'],
    ['🖼 Ishlarim', '❓ Yordam'],
  ],
  resize_keyboard: true,
}

const PAGE_SIZE = 20
export const STOCK_LOW_WARNING = 5

async function tgCall(method, payload = {}) {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const desc = body?.description || ''
    throw new Error(`TG ${method}${res.status ? ' ' + res.status : ''}${desc ? ': ' + desc : ''}`)
  }
  return body
}

async function sendMessage(chatId, text, extra = {}) {
  const preview = String(text).split('\n')[0].slice(0, 60)
  try {
    await tgCall('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...extra })
    return true
  } catch (err) {
    const msg = String(err.message || err)
    console.error(`[sendMessage] chat ${chatId} -> "${preview}": ${msg}`)
    if (msg.includes('parse')) {
      try {
        await tgCall('sendMessage', { chat_id: chatId, text: String(text), ...extra })
        return true
      } catch (err2) {
        console.error('[sendMessage] plain retry ham ishlamadi:', String(err2.message || err2).slice(0, 200))
      }
    }
    return false
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
  '🔀 Ro\'yxatlar 20 tadan ko\'p bo\'lsa \u25C0 / \u25B6 tugmalar bilan sahifalanadi.',
  '<b>🛒 /buyurtma 1</b> — buyurtma tafsiloti',
  '<b>📦 /stock 1 150</b> — mahsulot omborini yangilash (sotuvchi)',
  '<b>🖼 /ishlar</b> — tugatgan ishlar (usta)',
  '<b>🖼 /ish 1</b> — ish tafsiloti',
  '<b>🔗 /link KOD</b> — panel sozlamalaridan olingan kod bilan ulash',
  '<b>📢 /broadcast matn</b> — barcha ulanganlarga xabar (admin)',
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

function paginationInline(kind, page, totalPages) {
  const prev = page > 1 ? [{ text: '\u25C0\uFE0F', callback_data: `page:${kind}:${page - 1}` }] : []
  const next = page < totalPages ? [{ text: '\u25B6\uFE0F', callback_data: `page:${kind}:${page + 1}` }] : []
  if (!prev.length && !next.length) return null
  const mid = [{ text: `${page}/${totalPages}`, callback_data: 'page:noop:0' }]
  return { inline_keyboard: [[...prev, ...mid, ...next]] }
}

export async function buildListPage(kind, user, page) {
  const skip = (page - 1) * PAGE_SIZE
  const pagesOf = (total) => Math.max(1, Math.ceil(total / PAGE_SIZE))
  if (kind === 'products') {
    const total = await Product.countDocuments({ sellerId: user._id })
    if (!total) return null
    const items = await Product.find({ sellerId: user._id }).sort({ createdAt: -1 }).skip(skip).limit(PAGE_SIZE)
    if (!items.length) return null
    const text = items.map((p, i) => productLine(p, skip + i + 1)).join('\n\n')
    return {
      text: `<b>\u{1F4E6} Mening mahsulotlarim (${total})</b>\n\n${truncate(text)}\n\nTafsilot: /product &lt;sahifadagi raqam&gt;`,
      totalPages: pagesOf(total),
    }
  }
  if (kind === 'orders' && user.role === 'seller') {
    const total = await Order.countDocuments({ 'items.sellerId': user._id })
    if (!total) return null
    const items = await Order.find({ 'items.sellerId': user._id }).sort({ createdAt: -1 }).skip(skip).limit(PAGE_SIZE)
    if (!items.length) return null
    const text = items.map((o, i) => orderShort(o, skip + i + 1)).join('\n')
    return {
      text: `<b>\u{1F6D2} Buyurtmalar (${total})</b>\n\n${truncate(text)}\n\nTafsilot: /buyurtma &lt;sahifadagi raqam&gt;`,
      totalPages: pagesOf(total),
    }
  }
  if (kind === 'bookings' && user.role === 'craftsman') {
    const total = await Booking.countDocuments({ craftsmanId: user._id })
    if (!total) return null
    const items = await Booking.find({ craftsmanId: user._id }).sort({ createdAt: -1 }).skip(skip).limit(PAGE_SIZE).populate('userId', 'name phone')
    if (!items.length) return null
    const text = items.map((b, i) => bookingShort(b, skip + i + 1)).join('\n')
    return {
      text: `<b>\u{1F6D2} So'rovlar / buyurtmalar (${total})</b>\n\n${truncate(text)}\n\nTafsilot: /buyurtma &lt;sahifadagi raqam&gt;`,
      totalPages: pagesOf(total),
    }
  }
  return null
}

export async function sellerSalesSince(userId, since) {
  const res = await Order.aggregate([
    { $match: { 'items.sellerId': userId, status: { $nin: ['cancelled'] }, createdAt: { $gte: since } } },
    { $unwind: '$items' },
    { $match: { 'items.sellerId': userId } },
    { $group: { _id: null, total: { $sum: { $multiply: ['$items.price', '$items.qty'] } }, count: { $sum: 1 } } },
  ])
  return res[0] ? { total: res[0].total || 0, count: res[0].count || 0 } : { total: 0, count: 0 }
}

export async function topProducts(userId, limit = 5) {
  return Order.aggregate([
    { $match: { 'items.sellerId': userId, status: { $nin: ['cancelled'] } } },
    { $unwind: '$items' },
    { $match: { 'items.sellerId': userId } },
    { $group: { _id: '$items.name', total: { $sum: { $multiply: ['$items.price', '$items.qty'] } }, qty: { $sum: '$items.qty' } } },
    { $sort: { total: -1 } },
    { $limit: limit },
  ])
}

export function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

async function handleStock(chatId, user, arg) {
  if (user.role !== 'seller') {
    await sendMessage(chatId, 'Bu buyruq faqat sotuvchilar uchun.')
    return
  }
  const parts = (arg || '').trim().split(/\s+/)
  const num = Number(parts[0])
  const qty = Number(parts[1])
  if (!parts.length || !Number.isInteger(num) || num < 1 || !Number.isInteger(qty) || qty < 0) {
    await sendMessage(chatId, "Ishlatish: /stock <mahsulot_raqami> <yangi_miqdor>\nMasalan: /stock 3 150")
    return
  }
  const products = await Product.find({ sellerId: user._id }).sort({ createdAt: -1 }).limit(200)
  const p = products[num - 1]
  if (!p) {
    await sendMessage(chatId, "Bunday raqamli mahsulot yo'q. Ro'yxat: /productlar")
    return
  }
  p.stock = qty
  await p.save()
  let msg = [`\u2705 <b>${esc(p.name)}</b>`, `ombor: ${p.stock} dona`].join('\n')
  if (qty <= STOCK_LOW_WARNING) msg += `\n\u26A0\uFE0F Qoldiq past (chegara: ${STOCK_LOW_WARNING} dona) \u2014 sayt panelidan to'ldiring`
  if (p.variants?.length) msg += "\n(ixtiyoriy: variantlar alohida, sayt panelida o'zgartiriladi)"
  await sendMessage(chatId, msg)
}

async function handleBroadcast(chatId, user, arg) {
  if (user.role !== 'admin') {
    await sendMessage(chatId, '\u274C Bu buyruq faqat admin rolidagi foydalanuvchi uchun.')
    return
  }
  const text = (arg || '').trim()
  if (!text) {
    await sendMessage(chatId, "Matn kiriting. Masalan: /broadcast Salom, Xona Bazar jamoasi!")
    return
  }
  const targets = await User.find({ telegramChatId: { $ne: '', $exists: true } }).select('telegramChatId')
  let ok = 0
  const safeText = truncate(text, 3900)
  for (const t of targets) {
    if (await sendMessage(t.telegramChatId, safeText, mainMenu())) ok++
  }
  await sendMessage(chatId, `\u{1F4E2} Xabar yuborildi: ${ok}/${targets.length} ga`)
}

async function findUserByChatId(chatId) {
  return User.findOne({ telegramChatId: chatId }).sort({ updatedAt: -1 })
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
    await sendMessage(chatId, "Kod 6 ta raqamdan iborat bo'lishi kerak. Masalan: /link 123456")
    return
  }
  const user = await User.findOne({
    telegramLinkCode: codeTrim,
    telegramLinkExpiry: { $gt: new Date() },
  })
  if (!user) {
    await sendMessage(chatId, "❌ Kod noto'g'ri yoki muddati o'tgan. Panel sozlamalaridan yangi kod oling va qayta urinib ko'ring.")
    return
  }
  let replaced = null
  const existing = await User.findOne({ telegramChatId: chatId, _id: { $ne: user._id } })
  if (existing) {
    replaced = { name: existing.name, role: existing.role }
    existing.telegramChatId = ''
    await existing.save()
  }
  user.telegramChatId = String(chatId)
  user.telegramLinkCode = undefined
  user.telegramLinkExpiry = undefined
  await user.save()

  const roleMsg = user.role === 'seller' ? 'Sotuvchi' : user.role === 'craftsman' ? 'Usta' : 'Xona Bazar'
  await sendMessage(chatId, [
    '✅ Ulanish muvaffaqiyatli!',
    `Akkaunt: <b>${esc(user.name)}</b> (${roleMsg})`,
    replaced ? `(oldingi: <b>${esc(replaced.name)}</b> akkauntidan ajratildi)` : null,
    '',
    "Endi saytdagi yangi buyurtmalar, suhbatlar va so'rovlar to'g'risidagi xabarlar shu yerga keladi.",
    '',
    HELP_TEXT,
  ].join('\n'), mainMenu())
}

async function handleUnlink(chatId) {
  const user = await findUserByChatId(chatId)
  if (!user) {
    await sendMessage(chatId, "Siz hali hech qanday akkauntga ulanmagansiz.")
    return
  }
  await User.updateMany({ telegramChatId: chatId }, { $set: { telegramChatId: '' } })
  await sendMessage(chatId, "🚫 Ulanish bekor qilindi. Qayta ulash uchun sayt sozlamalaridan yangi kod oling.")
}

async function handleStatus(chatId, user) {
  if (user.role === 'seller') {
    const [products, orders, active, newOrders, usersWithChat, todayS, weekS, top5] = await Promise.all([
      Product.countDocuments({ sellerId: user._id }),
      Order.countDocuments({ 'items.sellerId': user._id }),
      Product.countDocuments({ sellerId: user._id, status: 'active' }),
      Order.countDocuments({ 'items.sellerId': user._id, status: { $ne: 'completed' } }),
      User.findById(user._id).select('reviewCount rating'),
      sellerSalesSince(user._id, startOfToday()),
      sellerSalesSince(user._id, new Date(Date.now() - 7 * 86400000)),
      topProducts(user._id),
    ])
    const lines = [
      `📊 <b>Holat</b> — ${esc(user.shopName || user.name)}`,
      `mahsulotlar: ${products} (faol: ${active})`,
      `buyurtmalar: ${orders} (yangi/ochiq: ${newOrders})`,
      `bugungi savdo: ${fmt(todayS.total)} so'm (${todayS.count} ta pozitsiya)`,
      `haftalik savdo: ${fmt(weekS.total)} so'm`,
      `reyting: ${usersWithChat?.rating || 0} (${usersWithChat?.reviewCount || 0} baho)`,
    ]
    if (top5.length) {
      lines.push('', '<b>Top-5 mahsulotlar:</b>')
      top5.forEach((x, i) => lines.push(`${i + 1}. ${esc(x._id)} — ${fmt(x.total)} so'm (${x.qty} dona)`))
    }
    await sendMessage(chatId, lines.join('\n'))
  } else if (user.role === 'craftsman') {
    const [bookings, completed, pending, weekAgo, todayAgo] = await Promise.all([
      Booking.countDocuments({ craftsmanId: user._id }),
      Booking.countDocuments({ craftsmanId: user._id, status: 'completed' }),
      Booking.countDocuments({ craftsmanId: user._id, status: { $in: ['pending', 'quote_sent'] } }),
      Booking.countDocuments({ craftsmanId: user._id, updatedAt: { $gte: new Date(Date.now() - 7 * 86400000) } }),
      Booking.countDocuments({ craftsmanId: user._id, createdAt: { $gte: startOfToday() } }),
    ])
    await sendMessage(chatId, [
      `📊 <b>Holat</b> — ${esc(user.name)}`,
      `buyurtmalar (so'rovlar): ${bookings}`,
      `kutilyotgan: ${pending} | yakunlangan: ${completed}`,
      `bugun kelgan so'rovlar: ${todayAgo}`,
      `shu hafta yangilangan (ishlar): ${weekAgo}`,
      `bajarilgan ishlar: ${user.completedWorks?.length || 0}`,
      `reyting: ${user.rating || 0} (${user.reviewCount || 0} baho)`,
    ].join('\n'))
  } else {
    await sendMessage(chatId, 'Bu buyruq faqat sotuvchi va ustalar uchun. Sayt panelidan akkauntingizni ulang.')
  }
}

async function handleProducts(chatId, user, page = 1) {
  try {
    const info = await buildListPage('products', user, page)
    if (!info) {
      await sendMessage(chatId, "Hozircha mahsulotlar yo'q.")
      return
    }
    const kb = paginationInline('products', page, info.totalPages)
    await sendMessage(chatId, info.text, kb ? { reply_markup: kb } : {})
  } catch (err) {
    console.error('[handleProducts] xato:', String(err.message || err))
    await sendMessage(chatId, "Ro'yxatni olishda xato yuz berdi. Qayta urinib ko'ring: /productlar")
  }
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

  const fullText = truncate(text.join('\n'))
  const pool = Array.isArray(p.images) && p.images.filter(Boolean).length ? p.images : [p.image]
  const urls = pool.filter(Boolean).map(imageUrl).filter(Boolean)

  if (!urls.length) {
    await sendMessage(chatId, fullText)
    return
  }

  const caption = truncate(fullText, 1024)
  try {
    if (urls.length > 1) {
      const media = urls.slice(0, 10).map((u, i) => ({
        type: 'photo',
        media: u,
        ...(i === 0 ? { caption, parse_mode: 'HTML' } : {}),
      }))
      await tgCall('sendMediaGroup', { chat_id: chatId, media })
    } else {
      await tgCall('sendPhoto', { chat_id: chatId, photo: urls[0], caption, parse_mode: 'HTML' })
    }
  } catch (err) {
    console.error(`[Telegram product photo failed] product=${p._id} urls=${urls.length}: ${String(err.message || err)}`)
    await sendMessage(chatId, fullText)
  }
}

async function handleOrders(chatId, user, page = 1) {
  const kind = user.role === 'seller' ? 'orders' : user.role === 'craftsman' ? 'bookings' : null
  if (!kind) {
    await sendMessage(chatId, 'Bu buyruq faqat sotuvchi va ustalar uchun.')
    return
  }
  const info = await buildListPage(kind, user, page)
  if (!info) {
    await sendMessage(chatId, user.role === 'seller' ? "Hozircha buyurtmalar yo'q." : "Hozircha so'rovlar yo'q.")
    return
  }
  const kb = paginationInline(kind, page, info.totalPages)
  await sendMessage(chatId, info.text, kb ? { reply_markup: kb } : {})
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
        await handleProducts(chatId, user, Math.max(1, Number(parsed.arg) || 1))
        return
      case '/product':
        await handleProduct(chatId, user, parsed.arg)
        return
      case '/buyurtmalar':
        await handleOrders(chatId, user, Math.max(1, Number(parsed.arg) || 1))
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
      case '/stock':
        await handleStock(chatId, user, parsed.arg)
        return
      case '/broadcast':
        await handleBroadcast(chatId, user, parsed.arg)
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
        await handleUpdate(update)
      }
    }
  } catch (err) {
    console.error('Telegram poll error:', err.message)
  }
  setTimeout(poll, 1000)
}

export async function notifyUser(userId, text, extra = {}) {
  if (!BOT_TOKEN) return false
  try {
    const user = await User.findById(userId).select('telegramChatId notifTelegram')
    if (!user || !user.telegramChatId || user.notifTelegram === false) return false
    await sendMessage(user.telegramChatId, text, extra)
    return true
  } catch (err) {
    console.error('Telegram notify error:', err.message)
    return false
  }
}

// Parol tiklash kodi yuborish. notifTelegram flag'iga bog'liq emas — har doim yuboriladi.
export async function sendPasswordResetCode(user, code) {
  if (!BOT_TOKEN || !user.telegramChatId) return false
  try {
    await sendMessage(user.telegramChatId, [
      `\u{1F511} <b>Parolni tiklash kodi</b>`,
      '',
      `Sizning tasdiqlash kodingiz: <b>${code}</b>`,
      `Kod <b>10 daqiqa</b> davomida amal qiladi.`,
      '',
      `Agar siz bu so'rovni yubormagan bo'lsangiz, ushbu xabarga e'tibor bermang.`,
    ].join('\n'))
    return true
  } catch (err) {
    console.error('Telegram reset code error:', err.message)
    return false
  }
}

function newMessagePreview(rawText, max = 80) {
  const out = String(rawText || '')
    .split('\n').slice(0, 2)
    .map(l => l.trim()).filter(Boolean)
    .join(' / ')
  return out.length > max ? out.slice(0, max - 3).trimEnd() + '...' : out
}

export function notifyChatMessage(userId, sender, conversationId, rawText) {
  const name = esc((sender && (sender.name || sender.shopName)) || 'Foydalanuvchi')
  const preview = newMessagePreview(rawText)
  const text = `\u{1F4AC} <b>${name}</b> dan yangi xabar${preview ? `: "${esc(preview)}"` : ''}`
  const extra = {
    reply_markup: {
      inline_keyboard: [[{ text: "\u{1F4AC} Suhbatga o'tish", url: `https://xona-bazar-1.onrender.com/messages?conv=${conversationId}` }]],
    },
  }
  return notifyUser(userId, text, extra)
}

export async function notifyLowStock(sellerId, productName, level) {
  return notifyUser(sellerId, [
    `<b>⚠️ Ombor to'kilib boryapti</b>`,
    `mahsulot: ${esc(productName)}`,
    `qoldiq: ${level} dona`,
    "Yangilash: /stock <raqam> <miqdor>",
  ].join('\n'))
}

export async function notifyAdminAboutNewUser(newUser) {
  if (!BOT_TOKEN) return
  try {
    const admins = await User.find({ role: 'admin' }).select('_id')
    if (!admins.length) return
    const roleLabel = newUser.role === 'seller' ? 'Sotuvchi' : newUser.role === 'craftsman' ? 'Usta' : ''
    if (!roleLabel) return
    const text = [
      `<b>🆕 Yangi ${roleLabel} ro'yxatdan o'tdi (tasdiqlash kutilmoqda)</b>`,
      `ism: ${esc(newUser.name)}`,
      `email: ${esc(newUser.email)}`,
      newUser.phone ? `telefon: ${esc(newUser.phone)}` : null,
      newUser.shopName ? `do'kon: ${esc(newUser.shopName)}` : null,
      newUser.services?.length ? `xizmatlar: ${esc(newUser.services.join(', '))}` : null,
      ``,
      `Tasdiqlash: /approve ${esc(newUser.email)} | Rad etish: /reject ${esc(newUser.email)}`,
    ].filter(Boolean).join('\n')
    for (const a of admins) notifyUser(a._id, text)
  } catch (err) {
    console.error('Telegram admin notify:', err.message)
  }
}

let botUsernameCache = process.env.BOT_USERNAME || ''
let botUsernameCacheAt = 0

async function resolveBotUsername() {
  if (!BOT_TOKEN) return BOT_USERNAME
  if (botUsernameCache && Date.now() - botUsernameCacheAt < 3600_000) return botUsernameCache
  try {
    const res = await fetch(`${API}/getMe`)
    const data = await res.json()
    if (data?.ok && data.result?.username) {
      botUsernameCache = data.result.username
      botUsernameCacheAt = Date.now()
    }
  } catch (err) {
    console.error('Telegram getMe xato:', err.message)
  }
  return botUsernameCache
}

export async function getBotConfig() {
  const username = await resolveBotUsername()
  return { tokenSet: Boolean(BOT_TOKEN), username: username ? `@${username.replace(/^@/, '')}` : '' }
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

export async function dedupeTelegramChats() {
  try {
    const dups = await User.aggregate([
      { $match: { telegramChatId: { $ne: '', $exists: true } } },
      { $group: { _id: '$telegramChatId', ids: { $push: '$_id' } } },
      { $match: { _id: { $ne: null }, 'ids.1': { $exists: true } } },
    ])
    for (const d of dups) {
      const keep = await User.findOne({ _id: { $in: d.ids } }).sort({ updatedAt: -1 }).select('_id')
      if (!keep) continue
      const toClear = d.ids.filter(id => id.toString() !== keep._id.toString())
      const r = await User.updateMany(
        { _id: { $in: toClear }, telegramChatId: d._id },
        { $set: { telegramChatId: '' } }
      )
      if (r.modifiedCount) console.log(`Telegram dedupe: chat ${d._id} -> ${keep._id} (${r.modifiedCount} cleaned)`)
    }
  } catch (err) {
    console.error('Telegram dedupe xato:', err.message)
  }
}

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

registerCallback('page:', async ({ chatId, cq, arg }) => {
  const a = String(arg || '')
  if (a.startsWith('noop')) return answerCallbackQuery(cq.id, '')
  const [kind, ps, _extra] = a.split(':')
  if (!['products', 'orders', 'bookings'].includes(kind)) return answerCallbackQuery(cq.id, '')
  const user = await findUserByChatId(chatId)
  if (!user) return answerCallbackQuery(cq.id, 'Akkaunt topilmadi')
  const page = Math.max(1, Math.min(1000, Number(ps) || 1))
  const info = await buildListPage(kind, user, page)
  if (!info) return answerCallbackQuery(cq.id, "Bunday sahifa yo'q")
  try {
    const kb = paginationInline(kind, page, info.totalPages)
    await tgCall('editMessageText', {
      chat_id: chatId,
      message_id: cq.message?.message_id,
      text: info.text,
      parse_mode: 'HTML',
      ...(kb ? { reply_markup: kb } : {}),
    })
  } catch (err) {
    console.error('Telegram editMessageText:', err.message)
  }
  await answerCallbackQuery(cq.id, '')
})

