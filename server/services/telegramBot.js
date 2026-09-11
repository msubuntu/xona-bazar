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

const fmt = (n) => {
  const v = Number(n) || 0
  return v.toLocaleString('uz-UZ')
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
  return `${i}. <b>${p.name}</b>\n   narx: ${fmt(p.price)} so'm | ombor: ${p.stock} | sotilgan: ${p.sold} | ${status}`
}

function orderShort(o, i) {
  return `${i}. #${String(o._id).slice(-6)} — ${o.status} | ${o.items.reduce((s, it) => s + it.qty, 0)} dona`
}

function bookingShort(b, i) {
  const st = b.status === 'pending' ? 'kutilmoqda' : b.status === 'quote_sent' ? 'narx yuborilgan' : b.status === 'quote_accepted' ? 'narx qabul qilingan' : b.status === 'in_progress' ? 'bajarilmoqda' : b.status === 'completed' ? 'yakunlangan' : 'bekor qilingan'
  return `${i}. ${b.service} — ${st}`
}

function bookingDetail(b) {
  const date = b.date ? new Date(b.date).toLocaleDateString('uz-UZ') : '-'
  const st = b.status === 'pending' ? 'kutilmoqda' : b.status === 'quote_sent' ? 'narx yuborilgan' : b.status === 'quote_accepted' ? 'narx qabul qilingan' : b.status === 'in_progress' ? 'bajarilmoqda' : b.status === 'completed' ? 'yakunlangan' : 'bekor qilingan'
  return truncate([
    `<b>🛠 ${b.service}</b>`,
    `holat: ${st}`,
    `mijoz: ${b.userId?.name || '-'} (${b.userId?.phone || '-'})`,
    `sana: ${date} ${b.time ? b.time : ''}`,
    b.address ? `manzil: ${b.address}` : null,
    b.description ? `izoh: ${b.description}` : null,
    b.quotedPrice ? `narx taklifi: ${fmt(b.quotedPrice)} so'm` : null,
    b.finalPrice ? `yakuniy narx: ${fmt(b.finalPrice)} so'm` : null,
    b.cancelReason ? `bekor sababi: ${b.cancelReason}` : null,
  ].filter(Boolean).join('\n'))
}

async function findUserByChatId(chatId) {
  return User.findOne({ telegramChatId: chatId })
}

async function handleStart(chatId, firstName) {
  const existing = await findUserByChatId(chatId)
  if (existing) {
    const roleMsg = existing.role === 'seller' ? 'Sotuvchi paneli ulangan.' : existing.role === 'craftsman' ? 'Usta paneli ulangan.' : 'Xona Bazar akkauntingiz ulangan.'
    await sendMessage(chatId, `Xush kelibsiz, ${firstName || 'do\'st'}! ✅\n${roleMsg}\n\n${HELP_TEXT}`, mainMenu())
    return
  }
  await sendMessage(chatId, [
    `Xush kelibsiz, ${firstName || 'do\'st'}! 👋`,
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
    `Akkaunt: <b>${user.name}</b> (${roleMsg})`,
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
      `📊 <b>Holat</b> — ${user.shopName || user.name}`,
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
      `📊 <b>Holat</b> — ${user.name}`,
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
    `<b>📦 ${p.name}</b>`,
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
      text.push(`  ${vi + 1}. ${v.color ? v.color + ' ' : ''}${v.size ? v.size + ' ' : ''}— ${fmt(v.price)} so'm, ombor ${v.stock ?? 0}`)
    })
  }
  if (p.description) text.push('', p.description)
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
      `mijoz: ${o.userId?.name || '-'} (${o.userId?.phone || '-'})`,
      o.address?.city ? `manzil: ${o.address.city}, ${o.address.street || ''}` : null,
      o.phone ? `telefon: ${o.phone}` : null,
      o.note ? `izoh: ${o.note}` : null,
      '',
      '<b>Mahsulotlar:</b>',
    ]
    let total = 0
    o.items.forEach(it => {
      total += (it.price || 0) * it.qty
      text.push(`• ${it.name} × ${it.qty} — ${fmt(it.price * it.qty)} so'm`)
    })
    text.push('', `jami: <b>${fmt(total)} so'm</b>`)
    await sendMessage(chatId, truncate(text.join('\n'), 3500))
  } else if (user.role === 'craftsman') {
    const bookings = await Booking.find({ craftsmanId: user._id }).sort({ createdAt: -1 }).limit(100).populate('userId', 'name phone avatar')
    const idx = Number(num)
    const b = Number.isInteger(idx) && idx >= 1 ? bookings[idx - 1] : bookings[0]
    if (!b) {
      await sendMessage(chatId, 'So\'rov topilmadi. Ro\'yxat uchun: /buyurtmalar')
      return
    }
    await sendMessage(chatId, bookingDetail(b))
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
  const text = works.slice(0, 20).map((w, i) => `${i + 1}. ${w.title} — ${w.service || ''}`.trim()).join('\n')
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
    `<b>🖼 ${w.title}</b>`,
    w.service ? `xizmat: ${w.service}` : null,
    w.color ? `rang: ${w.color}` : null,
    `bajarilgan sana: ${date}`,
    w.description ? `izoh: ${w.description}` : null,
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
  if (!running || !BOT_TOKEN) return
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
        if (update.message?.text !== undefined) {
          dispatchMessage(String(update.message.chat.id), update.message).catch(err => {
            console.error('Telegram dispatch error:', err.message)
          })
        }
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

export function initTelegramBot() {
  if (!BOT_TOKEN) {
    console.log('Telegram bot: BOT_TOKEN sozlanmagan — bot kutish rejimida (server .env ga BOT_TOKEN qo\'shing)')
    return
  }
  if (running) return
  running = true
  poll()
  console.log(`Telegram bot ishga tushdi${BOT_USERNAME ? ` (@${BOT_USERNAME})` : ''}`)
}