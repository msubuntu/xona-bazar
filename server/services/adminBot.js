import 'dotenv/config'
import { getServerMetrics } from './metrics.js'
import { blockIp, unblockIp, getBlockedIps, getRecentAlerts, notifyAdmin } from '../middleware/watcher.js'
import User from '../models/User.js'
import Product from '../models/Product.js'
import { esc } from './telegramBot.js'
import { getAppealByMsgId, getAppealByToken } from './appealStore.js'
import { safeUnlink, productFileUrls } from '../utils/fileCleanup.js'

const ADMIN_TOKEN = process.env.ADMIN_BOT_TOKEN || ''
const ADMIN_CHAT_ID = (process.env.ADMIN_CHAT_ID || '').trim()
const USER_TOKEN = process.env.BOT_TOKEN || ''
const API = `https://api.telegram.org/bot${ADMIN_TOKEN}`

let running = false
let offset = 0
let startedAt = Date.now()

async function tgCall(method, payload = {}) {
  if (!ADMIN_TOKEN) return null
  try {
    const res = await fetch(`${API}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!data?.ok) {
      console.error(`[adminBot] ${method} xato:`, res.status, data?.description || '')
    }
    return data
  } catch (err) {
    console.error('[adminBot] tgCall:', err.message)
    return null
  }
}

async function sendAdmin(text, extra = {}) {
  await tgCall('sendMessage', { chat_id: ADMIN_CHAT_ID, text, parse_mode: 'HTML', ...extra })
}

async function replyToUser(chatId, text) {
  if (!USER_TOKEN) return false
  try {
    const res = await fetch(`https://api.telegram.org/bot${USER_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })
    const body = await res.json()
    return Boolean(body && body.ok)
  } catch (err) {
    console.error('[adminBot] replyToUser:', err.message)
    return false
  }
}

function menuKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        [{ text: '👥 /users' }, { text: '📦 /products' }],
        [{ text: '🖥 /status' }, { text: '📋 /logs' }],
        [{ text: '📢 /broadcast' }, { text: '🚫 /blocked' }],
        [{ text: '🧪 /seed-demo' }, { text: '❓ /yordam' }],
      ],
      resize_keyboard: true,
    },
  }
}

const COMMANDS = [
  { command: 'status', description: '🖥 Server va foydalanuvchilar holati' },
  { command: 'users', description: '👥 Foydalanuvchilar ro\'yxati: /users [buyer|seller|craftsman|admin]' },
  { command: 'user', description: '👤 Foydalanuvchi tafsilotlari: /user <id|telefon|email>' },
  { command: 'user_name', description: '✏️ Ism o\'zgartirish: /user_name <id> <yangi ism>' },
  { command: 'user_del', description: '🗑 Foydalanuvchini o\'chirish: /user_del <id>' },
  { command: 'products', description: '📦 Mahsulotlar ro\'yxati: /products [active|paused]' },
  { command: 'product', description: '🔍 Mahsulot tafsilotlari: /product <id|nom>' },
  { command: 'product_price', description: '✏️ Narxni o\'zgartirish: /product_price <id> <narx>' },
  { command: 'product_del', description: '🗑 Mahsulotni o\'chirish: /product_del <id>' },
  { command: 'logs', description: '📋 Oxirgi 5 ta xavfsizlik ogohlantirishi' },
  { command: 'broadcast', description: '📢 Barcha foydalanuvchilarga xabar' },
  { command: 'moderate', description: '🧑‍💼 Tasdiqlash kutilayotgan seller/ustalar' },
  { command: 'approve', description: '✅ Seller/ustani tasdiqlash (masalan: /approve email@misol.uz)' },
  { command: 'reject', description: '❌ Seller/ustani rad etish' },
  { command: 'block', description: '🚫 IP bloklash (masalan: /block 1.2.3.4)' },
  { command: 'unblock', description: '🔓 IP blokdan chiqarish' },
  { command: 'blocked', description: '🚫 Bloklangan IP ro\'yxati' },
  { command: 'javob', description: '💬 Foydalanuvchi murojaatiga javob — /javob <ID> <matn>' },
  { command: 'seed-demo', description: '🧪 Demo foydalanuvchilar va mahsulotlar' },
  { command: 'yordam', description: '❓ Yordam' },
]

async function handleHelp() {
  await sendAdmin(
[
        '<b>Xona Bazar admin bot</b>',
        '',
        '👤 <b>Foydalanuvchilar</b>',
        '/users — ro\'yxat (yoki /users seller)',
        '/user <id | telefon | email> — tafsilot + tugmalar',
        '/user_name <id> <yangi ism>',
        '/user_del <id> — o\'chirish (tasdiq bilan)',
        '',
        '📦 <b>Mahsulotlar</b>',
        '/products — ro\'yxat',
        '/product <id | nom> — tafsilot + tugmalar',
        '/product_price <id> <narx>',
        '/product_del <id> — o\'chirish (tasdiq bilan)',
        '',
        '🖥 <b>Boshqa</b>',
        '/status — server holati',
        '/logs — xavfsizlik ogohlantirishlari',
        '/broadcast <matn> — barchaga xabar',
        '/moderate — tasdiqlash kutilayotganlar',
        '/approve <email yoki telefon>',
        '/reject <email yoki telefon>',
        '/block <ip> / /unblock <ip> / /blocked',
        '/javob <ID> <matn> — murojaatga javob',
        '/seed-demo — demo ma\'lumotlar',
      ].join('\n'),
      menuKeyboard()
    )
}

async function handleStatus() {
  const metrics = await getServerMetrics()
  const lines = [
    `<b>🖥 Server holati</b>`,
    `uptime: ${metrics.uptime}`,
    `RAM ishlatilmoqda: ${metrics.ram}`,
    `jarayon: node (${process.version})`,
    `bot ishga tushdi: ${new Date(startedAt).toLocaleString('uz-UZ')}`,
    '',
    `<b>👥 Foydalanuvchilar</b>`,
    `jami: ${metrics.users}`,
    `sotuvchilar: ${metrics.sellers}`,
    `ustalar: ${metrics.craftsmen}`,
    `telegram bog'langan: ${metrics.telegramLinked}`,
    '',
    `<b>🚫 Bloklangan IP</b>`,
    getBlockedIps().length ? getBlockedIps().map(ip => `<code>${esc(ip)}</code>`).join(', ') : 'yo\'q',
  ]
  await sendAdmin(lines.join('\n'))
}

async function handleLogs() {
  const logs = getRecentAlerts(5)
  if (!logs.length) {
    await sendAdmin('📋 Hozircha ogohlantirishlar yo\'q.')
    return
  }
  const lines = ['<b>📋 Oxirgi 5 ta xavfsizlik ogohlantirishi</b>', '']
  logs.forEach((l, i) => {
    lines.push(`${i + 1}. ${l.time.toLocaleString('uz-UZ')}\n   ${l.text.split('\n').slice(0, 2).join(' ').slice(0, 120)}`)
  })
  await sendAdmin(lines.join('\n'))
}

async function handleBroadcast(arg) {
  const text = (arg || '').trim()
  if (!text) {
    await sendAdmin('Matn kiriting. Masalan: /broadcast Salom, Xona Bazar jamoasi!')
    return
  }
  if (text.length > 3900) {
    await sendAdmin('Xabar juda uzun (maksimum 3900 belgi).')
    return
  }
  const users = await User.find({ telegramChatId: { $ne: '', $exists: true } }).select('telegramChatId')
  let ok = 0
  for (const u of users) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: u.telegramChatId, text, parse_mode: 'HTML' }),
      })
      const body = await res.json()
      if (body && body.ok) ok++
    } catch (err) {
      console.error('[adminBot] broadcast:', err.message)
    }
  }
  await sendAdmin(`✅ Xabar yuborildi: <b>${ok}/${users.length}</b> ga`)
}

async function handleModerate() {
  const pendingUsers = await User.find({ status: 'pending', role: { $in: ['seller', 'craftsman'] } })
    .select('name email phone role shopName services createdAt')
  if (!pendingUsers.length) {
    await sendAdmin('✅ Tasdiqlash kutilayotganlar yo\'q.')
    return
  }
  const lines = [`<b>🧑‍💼 Tasdiqlash kutilmoqda (${pendingUsers.length})</b>`, '']
  pendingUsers.forEach((u, i) => {
    const role = u.role === 'seller' ? '🏪 Sotuvchi' : '🔧 Usta'
    lines.push(
      `${i + 1}. ${esc(u.name)}\n`,
      `   ${role} | ${esc(u.email)}${u.phone ? ' | ' + esc(u.phone) : ''}\n`,
      u.shopName ? `   do'kon: ${esc(u.shopName)}\n` : '',
      u.services?.length ? `   xizmatlar: ${esc(u.services.slice(0, 3).join(', '))}\n` : '',
      `   /approve ${esc(u.email)} | /reject ${esc(u.email)}`
    )
  })
  await sendAdmin(lines.join(''))
}

async function handleModeration(action, arg) {
  const query = (arg || '').trim().toLowerCase()
  if (!query) {
    await sendAdmin('Email yoki telefon kiriting. Masalan: /approve email@misol.uz')
    return
  }
  const user = await User.findOne({
    $or: [{ email: query }, { phone: query }],
    role: { $in: ['seller', 'craftsman'] },
  })
  if (!user) {
    await sendAdmin('Bunday seller/usta topilmadi.')
    return
  }
  if (action === 'approve') {
    user.status = 'active'
    await user.save()
    const roleLabel = user.role === 'seller' ? 'Sotuvchi' : 'Usta'
    await sendAdmin(`✅ <b>${esc(user.name)}</b> (${roleLabel}) tasdiqlandi.`)
    const { notifyUser } = await import('./telegramBot.js')
    if (user.telegramId || user.telegramChatId) {
      await notifyUser(user._id, [
        `✅ <b>Hisobingiz tasdiqlandi!</b>`,
        `Endi Xona Bazar'da ${roleLabel.toLowerCase()} sifatida ishlashingiz mumkin.`,
      ].join('\n')).catch(() => {})
    }
  } else if (action === 'reject') {
    user.status = 'rejected'
    await user.save()
    await sendAdmin(`❌ <b>${esc(user.name)}</b> rad etildi.`)
  } else {
    await sendAdmin('Noma\'lum amal. /approve yoki /reject')
  }
}

async function handleBlock(arg) {
  const ip = (arg || '').trim()
  if (!ip) {
    await sendAdmin('IP kiriting. Masalan: /block 192.168.1.10')
    return
  }
  blockIp(ip)
  await notifyAdmin(`🚫 Admin tomonidan IP bloklandi: <code>${esc(ip)}</code>`)
  await sendAdmin(`🚫 IP bloklandi: <code>${esc(ip)}</code>`)
}

async function handleUnblock(arg) {
  const ip = (arg || '').trim()
  if (!ip) {
    await sendAdmin('IP kiriting. Masalan: /unblock 192.168.1.10')
    return
  }
  unblockIp(ip)
  await sendAdmin(`✅ IP blokdan chiqarildi: <code>${esc(ip)}</code>`)
}

async function handleBlocked() {
  await sendAdmin(getBlockedIps().length
    ? '🚫 Bloklangan IP: ' + getBlockedIps().map(ip => `<code>${esc(ip)}</code>`).join(', ')
    : 'Hozircha bloklangan IP yo\'q.')
}

const SEED_PASSWORD = 'Demo1234'

const SEED_PRODUCTS = [
  { name: 'Demo Akril bo\'yoq Aqua (9L)', brand: 'TashAkril', category: 'walls', price: 850000, stock: 14, description: 'Fasad va ichki ishlar uchun suv bazali akril bo\'yoq. 9 litrlik chelak.' },
  { name: 'Demo Keramik plitka 60x60', brand: 'FerganaTile', category: 'tiles', price: 45000, stock: 60, description: 'Pol uchun keramik plitka, o\'lcham 60x60 sm.' },
  { name: 'Demo Dush kolonkasi to\'plami', brand: 'AlfaPlast', category: 'plumbing', price: 320000, stock: 9, description: 'Zanglamaydigan po\'latdan kolonna + shlang + uya.' },
  { name: 'Demo Rozetka to\'plami (5 dona)', brand: 'Ekler', category: 'electrical', price: 60000, stock: 25, description: 'Ichki o\'rnatma rozetka, 16A. Oq rang, 5 dona.' },
  { name: 'Demo Gipsokarton varag\'i 120x250', brand: 'GipBoard', category: 'ceiling', price: 95000, stock: 40, description: 'Shift va devor uchun gipsokarton varag\'i, namlikka chidamli.' },
  { name: 'Demo Laminat SPC (2.2 m²)', brand: 'Tarkett', category: 'flooring', price: 189000, stock: 120, description: 'SPC laminat, 32-sinf, namlikka chidamli. Paket 2.2 m².' },
  { name: 'Demo Ovqatlanish stoli 1.2m', brand: 'MebelPlus', category: 'furniture', price: 480000, stock: 6, description: 'To\'rt kishilik ovqatlanish stoli, laminat yuzali.' },
  { name: 'Demo Ichki eshik MDF', brand: 'EshikUsta', category: 'doors', price: 390000, stock: 8, description: 'Ichki eshik MDF, oq, o\'lcham 200x80 sm.' },
]

async function handleSeedDemo() {
  await sendAdmin('⏳ Demo foydalanuvchilar yaratilmoqda...')
  try {
    const accounts = [
      { name: 'Demo Do\'konchi', email: 'demo-seller@xona.demo', phone: '+998901234500', role: 'seller', shopName: 'Demo Do\'kon', location: 'Toshkent, Chilonzor', description: 'Demo do\'kon — sinab ko\'rish uchun.', verified: true },
      { name: 'Demo Xaridor', email: 'demo-buyer@xona.demo', phone: '+998901234501', role: 'buyer' },
      { name: 'Demo Usta', email: 'demo-craftsman@xona.demo', phone: '+998901234502', role: 'craftsman', services: ['plumber', 'electrician', 'floorer'], experience: '5 yil', district: 'Toshkent, Chilonzor', verified: true },
      { name: 'Demo Admin', email: 'demo-admin@xona.demo', phone: '+998901234503', role: 'admin' },
    ]
    let created = 0
    for (const a of accounts) {
      const existed = await User.findOne({ email: a.email })
      if (!existed) { await User.create({ ...a, password: SEED_PASSWORD }); created++ }
    }
    const seller = await User.findOne({ email: 'demo-seller@xona.demo' })
    const existingProducts = await Product.countDocuments({ sellerId: seller._id })
    if (existingProducts === 0) {
      for (const p of SEED_PRODUCTS) {
        await Product.create({ ...p, sellerId: seller._id, images: ['/placeholder.png'], status: 'active', sold: Math.floor(Math.random() * 40), rating: +(3.8 + Math.random() * 1.1).toFixed(1) })
      }
    }
    await sendAdmin(
      `✅ <b>Demo tayyor!</b>\n\n` +
      `Foydalanuvchilar: ${created} yangi\n` +
      `Mahsulotlar: ${existingProducts === 0 ? SEED_PRODUCTS.length : existingProducts} (mavjud)\n\n` +
      `<b>Hisoblar (parol: ${SEED_PASSWORD}):</b>\n` +
      `• seller: demo-seller@xona.demo\n` +
      `• buyer: demo-buyer@xona.demo\n` +
      `• usta: demo-craftsman@xona.demo\n` +
      `• admin: demo-admin@xona.demo`
    )
  } catch (err) {
    console.error('[adminBot] seed-demo:', err)
    await sendAdmin(`❌ Xato: ${esc(err.message)}`)
  }
}

const ROLE_LABEL = { buyer: '👤 Xaridor', seller: '🏪 Sotuvchi', craftsman: '🔧 Usta', admin: '🛡 Admin' }
const STATUS_LABEL = { active: '✅ Faol', pending: '⏳ Kutilmoqda', rejected: '❌ Rad etilgan' }
const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

async function findUserByQuery(q) {
  const v = (q || '').trim()
  if (!v) return null
  if (/^[0-9a-f]{24}$/i.test(v)) {
    const byId = await User.findById(v)
    if (byId) return byId
  }
  return User.findOne({
    $or: [
      { email: v.toLowerCase() },
      { phone: v },
      { name: { $regex: new RegExp(escapeRe(v), 'i') } },
    ],
  })
}

function buildUserCardText(u, productCount) {
  return [
    `<b>👤 ${esc(u.name)}</b>`,
    `ID: <code>${u._id}</code>`,
    `Rol: ${ROLE_LABEL[u.role] || u.role} | Holat: ${STATUS_LABEL[u.status] || u.status}`,
    `Telefon: ${u.phone ? esc(u.phone) : '—'}`,
    `Email: ${esc(u.email)}`,
    u.shopName ? `Do'kon: ${esc(u.shopName)}` : '',
    u.location ? `Manzil: ${esc(u.location)}` : '',
    `Mahsulotlar: ${productCount}`,
    u.telegramChatId ? `TG id: <code>${esc(u.telegramChatId)}</code>` : '',
    `Yaratilgan: ${u.createdAt ? new Date(u.createdAt).toLocaleString('uz-UZ') : '—'}`,
    '',
    'Rol / holat / o\'chirish — tugmalar orqali',
    `Ism o'zgartirish: <code>/user_name ${u._id} Yangi ism</code>`,
  ].filter(Boolean).join('\n')
}

function userCardKeyboard(u) {
  return {
    inline_keyboard: [
      [
        { text: '👤 Xaridor', callback_data: `user_role|${u._id}|buyer` },
        { text: '🏪 Sotuvchi', callback_data: `user_role|${u._id}|seller` },
      ],
      [
        { text: '🔧 Usta', callback_data: `user_role|${u._id}|craftsman` },
        { text: '🛡 Admin', callback_data: `user_role|${u._id}|admin` },
      ],
      [
        { text: '✅ Faol', callback_data: `user_status|${u._id}|active` },
        { text: '⏳ Kutilmoqda', callback_data: `user_status|${u._id}|pending` },
        { text: '❌ Rad etilgan', callback_data: `user_status|${u._id}|rejected` },
      ],
      [{ text: '🗑 O\'chirish', callback_data: `user_del|${u._id}` }],
    ],
  }
}

function buildProductCardText(p, sellerName) {
  const statusText = p.status === 'active' ? '✅ Faol' : p.status === 'paused' ? '⏸ Pauza' : '❌ Sotildi'
  return [
    `<b>📦 ${esc(p.name)}</b>`,
    `ID: <code>${p._id}</code>`,
    `Brend: ${esc(p.brand)} | Kategoriya: ${esc(p.category)}${p.subcategory ? ' / ' + esc(p.subcategory) : ''}`,
    `Narx: <b>${p.price.toLocaleString('ru-RU')}</b> so'm${p.oldPrice ? ' | Eski: ' + p.oldPrice.toLocaleString('ru-RU') : ''}`,
    `Holat: ${statusText} | Ombor: ${p.stock} | Sotilgan: ${p.sold}`,
    `Rasmlar: ${(p.images || []).length}${p.video ? ' | 🎥 video' : ''} | Reyting: ${p.rating || '—'}`,
    `Sotuvchi: ${sellerName ? esc(sellerName) : '—'}`,
    `Yaratilgan: ${p.createdAt ? new Date(p.createdAt).toLocaleString('uz-UZ') : '—'}`,
    '',
    `Narx o'zgartirish: <code>/product_price ${p._id} 500000</code>`,
  ].join('\n')
}

function productCardKeyboard(p) {
  return {
    inline_keyboard: [
      [{ text: p.status === 'active' ? '⏸ Pauzaga olish' : '▶️ Faollashtirish', callback_data: `prod_toggle|${p._id}` }],
      [{ text: '🗑 O\'chirish', callback_data: `prod_del|${p._id}` }],
    ],
  }
}

async function handleUsers(arg) {
  const role = (arg || '').trim().toLowerCase()
  const roles = ['buyer', 'seller', 'craftsman', 'admin']
  const q = roles.includes(role) ? { role } : {}
  const users = await User.find(q)
    .sort({ createdAt: -1 })
    .limit(15)
    .select('name email phone role status createdAt')
  if (!users.length) {
    await sendAdmin('Foydalanuvchilar topilmadi.')
    return
  }
  const lines = [`<b>👥 Foydalanuvchilar${role ? ' — ' + ROLE_LABEL[role] : ' (jami)'}</b>`, '']
  users.forEach((u) => {
    lines.push(
      `<code>${u._id}</code> ${esc(u.name)}\n` +
      `   ${ROLE_LABEL[u.role] || u.role} · ${u.phone ? esc(u.phone) : esc(u.email)} · ${STATUS_LABEL[u.status] || u.status}\n` +
      `   /user ${u._id}`
    )
  })
  lines.push('', 'Batafsil: /user <id | telefon | email>')
  await sendAdmin(lines.join('\n'))
}

async function handleUser(arg) {
  const u = await findUserByQuery(arg)
  if (!u) {
    await sendAdmin('Foydalanuvchi topilmadi. /users — ro\'yxat.')
    return
  }
  const productCount = await Product.countDocuments({ sellerId: u._id })
  await sendAdmin(buildUserCardText(u, productCount), { reply_markup: userCardKeyboard(u) })
}

async function handleUserName(arg) {
  const m = (arg || '').trim().match(/^(\S+)\s+(.+)$/)
  if (!m) {
    await sendAdmin('Ishlatish: /user_name <id> <yangi ism>')
    return
  }
  const u = await findUserByQuery(m[1])
  if (!u) {
    await sendAdmin('Foydalanuvchi topilmadi.')
    return
  }
  u.name = m[2].trim()
  await u.save()
  await sendAdmin(`✏️ <b>${esc(m[2].trim())}</b> — ism o'zgartirildi.`)
}

async function deleteUserWithProducts(id) {
  const products = await Product.find({ sellerId: id })
  for (const p of products) safeUnlink(productFileUrls(p))
  await Product.deleteMany({ sellerId: id })
  await User.deleteOne({ _id: id })
  return products.length
}

async function handleUserDel(arg) {
  const u = await findUserByQuery(arg)
  if (!u) {
    await sendAdmin('Foydalanuvchi topilmadi.')
    return
  }
  if (u.role === 'admin') {
    await sendAdmin('🚫 Admin hisobini o\'chirib bo\'lmaydi.')
    return
  }
  const c = await Product.countDocuments({ sellerId: u._id })
  await sendAdmin(
    `❓ <b>${esc(u.name)}</b> (${ROLE_LABEL[u.role] || u.role}) hisobi ${c > 0 ? 'va ' + c + ' ta mahsulot' : ''} o'chirilsinmi?`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Ha, o\'chirish', callback_data: `user_del_yes|${u._id}` }],
          [{ text: '❌ Yo\'q', callback_data: 'nop' }],
        ],
      },
    }
  )
}

async function handleProducts(arg) {
  const status = (arg || '').trim().toLowerCase()
  const q = ['active', 'paused', 'sold_out'].includes(status) ? { status } : {}
  const items = await Product.find(q)
    .sort({ createdAt: -1 })
    .limit(15)
    .populate('sellerId', 'name shopName')
    .select('name brand price status stock sold createdAt')
  if (!items.length) {
    await sendAdmin('Mahsulotlar topilmadi.')
    return
  }
  const lines = [`<b>📦 Mahsulotlar${status ? ' — ' + status : ''}</b>`, '']
  items.forEach((p) => {
    const seller = p.sellerId?.name || p.sellerId?.shopName || '—'
    const st = p.status === 'active' ? '✅' : p.status === 'paused' ? '⏸' : '❌'
    lines.push(
      `<code>${p._id}</code> ${esc(p.name)}\n` +
      `   ${st} ${p.price.toLocaleString('ru-RU')} so'm · ${esc(seller)} · ombor ${p.stock}\n` +
      `   /product ${p._id}`
    )
  })
  lines.push('', 'Batafsil: /product <id | nom | brend>')
  await sendAdmin(lines.join('\n'))
}

async function findProductByQuery(q) {
  const v = (q || '').trim()
  if (!v) return null
  if (/^[0-9a-f]{24}$/i.test(v)) {
    const byId = await Product.findById(v)
    if (byId) return byId
  }
  const re = new RegExp(escapeRe(v), 'i')
  return Product.findOne({ $or: [{ name: re }, { brand: re }] })
}

async function handleProduct(arg) {
  const p = await findProductByQuery(arg)
  if (!p) {
    await sendAdmin('Mahsulot topilmadi. /products — ro\'yxat.')
    return
  }
  const seller = p.sellerId ? await User.findById(p.sellerId).select('name shopName') : null
  await sendAdmin(buildProductCardText(p, seller ? (seller.shopName || seller.name) : ''), {
    reply_markup: productCardKeyboard(p),
  })
}

async function handleProductPrice(arg) {
  const m = (arg || '').trim().match(/^(\S+)\s+(\d+(?:[.,]\d+)?)$/)
  if (!m) {
    await sendAdmin('Ishlatish: /product_price <id> <yangi narx>')
    return
  }
  const p = await findProductByQuery(m[1])
  if (!p) {
    await sendAdmin('Mahsulot topilmadi.')
    return
  }
  const price = Number(String(m[2]).replace(',', '.'))
  if (!(price > 0)) {
    await sendAdmin('Narx noto\'g\'ri formatda.')
    return
  }
  p.price = price
  await p.save()
  await sendAdmin(`✏️ <b>${esc(p.name)}</b> narxi <b>${price.toLocaleString('ru-RU')}</b> so'mga o'zgartirildi.`)
}

async function handleProductDel(arg) {
  const p = await findProductByQuery(arg)
  if (!p) {
    await sendAdmin('Mahsulot topilmadi.')
    return
  }
  await sendAdmin(`❓ <b>${esc(p.name)}</b> mahsuloti o'chirilsinmi?`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ Ha, o\'chirish', callback_data: `prod_del_yes|${p._id}` }],
        [{ text: '❌ Yo\'q', callback_data: 'nop' }],
      ],
    },
  })
}

async function handleCallback(cq) {
  const chatId = String(cq?.message?.chat?.id || '')
  if (chatId !== ADMIN_CHAT_ID) return
  const data = String(cq?.data || '')
  const [action, id, param] = data.split('|')
  const msg = cq.message
  try {
    if (action === 'user_role') {
      const u = await User.findById(id)
      if (!u) { await sendAdmin('Foydalanuvchi topilmadi (o\'chirilgan).'); return }
      u.role = param
      await u.save()
      const c = await Product.countDocuments({ sellerId: u._id })
      await tgCall('editMessageText', {
        chat_id: msg.chat.id, message_id: msg.message_id,
        text: buildUserCardText(u, c), parse_mode: 'HTML',
        reply_markup: userCardKeyboard(u),
      })
      await answerCallback(cq.id, `Rol: ${ROLE_LABEL[u.role] || u.role}`)
    } else if (action === 'user_status') {
      const u = await User.findById(id)
      if (!u) { await sendAdmin('Foydalanuvchi topilmadi (o\'chirilgan).'); return }
      u.status = param
      await u.save()
      const c = await Product.countDocuments({ sellerId: u._id })
      await tgCall('editMessageText', {
        chat_id: msg.chat.id, message_id: msg.message_id,
        text: buildUserCardText(u, c), parse_mode: 'HTML',
        reply_markup: userCardKeyboard(u),
      })
      await answerCallback(cq.id, `Holat: ${STATUS_LABEL[u.status] || u.status}`)
    } else if (action === 'user_del') {
      const u = await User.findById(id)
      if (!u) { await sendAdmin('Foydalanuvchi topilmadi (o\'chirilgan).'); return }
      if (u.role === 'admin') { await answerCallback(cq.id, 'Admin o\'chirilmaydi'); return }
      const c = await Product.countDocuments({ sellerId: u._id })
      await sendAdmin(
        `❓ <b>${esc(u.name)}</b> (${ROLE_LABEL[u.role] || u.role}) hisobi ${c > 0 ? 'va ' + c + ' ta mahsulot' : ''} o'chirilsinmi?`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ Ha, o\'chirish', callback_data: `user_del_yes|${u._id}` }],
              [{ text: '❌ Yo\'q', callback_data: 'nop' }],
            ],
          },
        }
      )
      await answerCallback(cq.id)
    } else if (action === 'user_del_yes') {
      const u = await User.findById(id)
      const label = u ? esc(u.name) : String(id).slice(0, 8)
      if (u && u.role === 'admin') { await answerCallback(cq.id, 'Admin o\'chirilmaydi'); return }
      const cnt = await deleteUserWithProducts(id)
      await sendAdmin(`🗑 <b>${label}</b> o'chirildi (${cnt} ta mahsulot bilan).`)
      await answerCallback(cq.id)
    } else if (action === 'prod_toggle') {
      const p = await Product.findById(id)
      if (!p) { await sendAdmin('Mahsulot topilmadi (o\'chirilgan).'); return }
      p.status = p.status === 'active' ? 'paused' : 'active'
      await p.save()
      const seller = p.sellerId ? await User.findById(p.sellerId).select('name shopName') : null
      await tgCall('editMessageText', {
        chat_id: msg.chat.id, message_id: msg.message_id,
        text: buildProductCardText(p, seller ? (seller.shopName || seller.name) : ''), parse_mode: 'HTML',
        reply_markup: productCardKeyboard(p),
      })
      await answerCallback(cq.id, p.status === 'active' ? 'Faollashtirildi' : 'Pauzaga olindi')
    } else if (action === 'prod_del') {
      const p = await Product.findById(id)
      if (!p) { await sendAdmin('Mahsulot topilmadi (o\'chirilgan).'); return }
      await sendAdmin(`❓ <b>${esc(p.name)}</b> o'chirilsinmi?`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Ha, o\'chirish', callback_data: `prod_del_yes|${p._id}` }],
            [{ text: '❌ Yo\'q', callback_data: 'nop' }],
          ],
        },
      })
      await answerCallback(cq.id)
    } else if (action === 'prod_del_yes') {
      const p = await Product.findById(id)
      const label = p ? esc(p.name) : String(id).slice(0, 8)
      if (p) safeUnlink(productFileUrls(p))
      await Product.deleteOne({ _id: id })
      await sendAdmin(`🗑 <b>${label}</b> mahsuloti o'chirildi.`)
      await answerCallback(cq.id)
    } else if (action === 'nop') {
      await answerCallback(cq.id, 'Bekor qilindi')
    }
  } catch (err) {
    console.error('[adminBot] callback:', err)
    await sendAdmin('❌ Xato: ' + esc(err.message || 'noma\'lum'))
  }
}

async function answerCallback(id, text = '') {
  await tgCall('answerCallbackQuery', text ? { callback_query_id: id, text } : { callback_query_id: id })
}

async function replyToAppeal(appeal, text) {
  const sent = await replyToUser(appeal.userChatId, [
    `💬 <b>Qo'llab-quvvatlash javobi</b>`,
    '',
    `${esc(text)}`,
  ].join('\n'))
  if (sent) {
    await sendAdmin(`✅ <b>${esc(appeal.userName)}</b> ga javob yuborildi.`)
  } else {
    await sendAdmin('❌ Javob yuborilmadi (BOT_TOKEN sozlanmagan yoki foydalanuvchi botni boshlatmagan).')
  }
}

async function handleAppealReply(msg) {
  const reply = msg.reply_to_message
  let appeal = null
  if (reply?.message_id !== undefined) appeal = getAppealByMsgId(reply.message_id) || null
  if (!appeal) {
    await sendAdmin('Javob berilgan xabar murojaat sifatida tanilmadi.')
    return
  }
  const text = (msg.text || '').trim()
  if (!text) {
    await sendAdmin("Javob matni bo'sh bo'lishi mumkin emas.")
    return
  }
  if (text.length > 3500) {
    await sendAdmin('Javob juda uzun (maksimum 3500 belgi).')
    return
  }
  await replyToAppeal(appeal, text)
}

async function handleReply(arg) {
  const parts = (arg || '').trim().split(/\s+/)
  const id = parts[0] || ''
  const text = parts.slice(1).join(' ').trim()
  if (!id || !text) {
    await sendAdmin("Ishlatish: /javob <ID> <matn>\nID murojaat xabarida ko'rsatilgan (masalan: /javob abc123 Raxmat, hal qilamiz!)")
    return
  }
  if (text.length > 3500) {
    await sendAdmin('Javob juda uzun (maksimum 3500 belgi).')
    return
  }
  const appeal = getAppealByToken(id) || null
  if (!appeal) {
    await sendAdmin('Murojaat topilmadi (ID xato yoki server qayta ishga tushgan).')
    return
  }
  await replyToAppeal(appeal, text)
}

async function dispatch(text) {
  const clean = (text || '').trim().replace(/@\w+/, '').trim()
  if (!clean.startsWith('/')) {
    await sendAdmin('Buyruq tanlang: /yordam')
    return
  }
  const [cmd, ...rest] = clean.split(/\s+/)
  const arg = rest.join(' ').trim()
  switch (cmd.toLowerCase()) {
    case '/start':
    case '/yordam':
      await handleHelp()
      break
    case '/status':
      await handleStatus()
      break
    case '/logs':
      await handleLogs()
      break
    case '/broadcast':
      await handleBroadcast(arg)
      break
    case '/block':
      await handleBlock(arg)
      break
    case '/unblock':
      await handleUnblock(arg)
      break
    case '/blocked':
      await handleBlocked()
      break
    case '/javob':
      await handleReply(arg)
      break
    case '/moderate':
      await handleModerate()
      break
    case '/approve':
      await handleModeration('approve', arg)
      break
    case '/reject':
      await handleModeration('reject', arg)
      break
    case '/seed-demo':
      await handleSeedDemo()
      break
    case '/users':
      await handleUsers(arg)
      break
    case '/user':
      await handleUser(arg)
      break
    case '/user_name':
      await handleUserName(arg)
      break
    case '/user_del':
      await handleUserDel(arg)
      break
    case '/products':
      await handleProducts(arg)
      break
    case '/product':
      await handleProduct(arg)
      break
    case '/product_price':
      await handleProductPrice(arg)
      break
    case '/product_del':
      await handleProductDel(arg)
      break
    default:
      await sendAdmin('Noma\'lum buyruq. /yordam')
  }
}

async function poll() {
  if (!running || !ADMIN_TOKEN || !ADMIN_CHAT_ID) return
  try {
    const res = await fetch(`${API}/getUpdates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offset, timeout: 30, allowed_updates: ['message', 'callback_query'] }),
    })
    if (!res.ok) {
      console.error(`[adminBot] getUpdates: ${res.status}`)
      setTimeout(poll, 10000)
      return
    }
    const data = await res.json()
    if (data.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        offset = update.update_id + 1
        if (update.callback_query) {
          const cqChat = String(update.callback_query?.message?.chat?.id || '')
          if (cqChat === ADMIN_CHAT_ID) await handleCallback(update.callback_query)
          continue
        }
        const message = update.message
        const chatId = String(message?.chat?.id || '')
        if (chatId === ADMIN_CHAT_ID && message?.text !== undefined) {
          if (message.reply_to_message) {
            await handleAppealReply(message)
          } else {
            await dispatch(message.text)
          }
        }
      }
    }
  } catch (err) {
    console.error('[adminBot] poll error:', err.message)
  }
  setTimeout(poll, 1000)
}

export async function initAdminBot() {
  if (!ADMIN_TOKEN) {
    console.log('Admin bot: ADMIN_BOT_TOKEN sozlanmagan — o\'chirilgan')
    return 'disabled'
  }
  if (!ADMIN_CHAT_ID) {
    console.log('Admin bot: ADMIN_CHAT_ID sozlanmagan — xabar qabul qilmaydi')
  }
  try {
    await tgCall('setMyCommands', { commands: COMMANDS })
    console.log('Admin bot: komandalar ro\'yxatdan o\'tkazildi')
  } catch (err) {
    console.error('Admin bot: setMyCommands xato:', err.message)
  }
  running = true
  setTimeout(poll, 500)
  return 'poll'
}