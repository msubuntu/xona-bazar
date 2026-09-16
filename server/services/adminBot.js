import 'dotenv/config'
import { getServerMetrics } from './metrics.js'
import { blockIp, unblockIp, getBlockedIps, getRecentAlerts, notifyAdmin } from '../middleware/watcher.js'
import User from '../models/User.js'
import Product from '../models/Product.js'
import { esc } from './telegramBot.js'

const ADMIN_TOKEN = process.env.ADMIN_BOT_TOKEN || ''
const ADMIN_CHAT_ID = (process.env.ADMIN_CHAT_ID || '').trim()
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

function menuKeyboard() {
  return {
    reply_markup: {
      keyboard: [
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
  { command: 'logs', description: '📋 Oxirgi 5 ta xavfsizlik ogohlantirishi' },
  { command: 'broadcast', description: '📢 Barcha foydalanuvchilarga xabar' },
  { command: 'block', description: '🚫 IP bloklash (masalan: /block 1.2.3.4)' },
  { command: 'unblock', description: '🔓 IP blokdan chiqarish' },
  { command: 'blocked', description: '🚫 Bloklangan IP ro\'yxati' },
  { command: 'seed-demo', description: '🧪 Demo foydalanuvchilar va mahsulotlar' },
  { command: 'yordam', description: '❓ Yordam' },
]

async function handleHelp() {
  await sendAdmin(
    [
      '<b>Xona Bazar admin bot</b>',
      '',
      '/status — server va foydalanuvchilar holati',
      '/logs — oxirgi 5 ta xavfsizlik ogohlantirishi',
      '/broadcast <matn> — barcha foydalanuvchilarga xabar',
      '/block <ip> — IP bloklash',
      '/unblock <ip> — IP blokdan chiqarish',
      '/blocked — bloklangan IP ro\'yxati',
      '/seed-demo — demo foydalanuvchilar va mahsulotlar',
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
  { name: 'Demo Akril bo\'yoq Aqua (9L)', brand: 'TashAkril', category: 'paints', price: 850000, stock: 14, description: 'Fasad va ichki ishlar uchun suv bazali akril bo\'yoq. 9 litrlik chelak.' },
  { name: 'Demo Keramik plitka 60x60', brand: 'FerganaTile', category: 'tiles', price: 45000, stock: 60, description: 'Pol uchun keramik plitka, o\'lcham 60x60 sm.' },
  { name: 'Demo Dush kolonkasi to\'plami', brand: 'AlfaPlast', category: 'plumbing', price: 320000, stock: 9, description: 'Zanglamaydigan po\'latdan kolonna + shlang + uya.' },
  { name: 'Demo Rozetka to\'plami (5 dona)', brand: 'Ekler', category: 'electrical', price: 60000, stock: 25, description: 'Ichki o\'rnatma rozetka, 16A. Oq rang, 5 dona.' },
  { name: 'Demo Perforator uchi 6mm', brand: 'UstaTools', category: 'tools', price: 18000, stock: 40, description: 'SDS-plus perforator uchi, beton uchun, 6 mm.' },
  { name: 'Demo Sement M400 50kg', brand: 'QarshiSement', category: 'building', price: 62000, stock: 120, description: 'Portlandsement M400, 50 kg qop.' },
  { name: 'Demo Ovqatlanish stoli 1.2m', brand: 'MebelPlus', category: 'furniture', price: 480000, stock: 6, description: 'To\'rt kishilik ovqatlanish stoli, laminat yuzali.' },
  { name: 'Demo Ichki eshik MDF', brand: 'EshikUsta', category: 'doors', price: 390000, stock: 8, description: 'Ichki eshik MDF, oq, o\'lcham 200x80 sm.' },
]

async function handleSeedDemo() {
  await sendAdmin('⏳ Demo foydalanuvchilar yaratilmoqda...')
  try {
    const accounts = [
      { name: 'Demo Do\'konchi', email: 'demo-seller@xona.demo', phone: '+998901234500', role: 'seller', shopName: 'Demo Do\'kon', location: 'Toshkent, Chilonzor', description: 'Demo do\'kon — sinab ko\'rish uchun.', verified: true },
      { name: 'Demo Xaridor', email: 'demo-buyer@xona.demo', phone: '+998901234501', role: 'buyer' },
      { name: 'Demo Usta', email: 'demo-craftsman@xona.demo', phone: '+998901234502', role: 'craftsman', services: ['plumber', 'electrician', 'installer'], experience: '5 yil', district: 'Toshkent, Chilonzor', verified: true },
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
    case '/seed-demo':
      await handleSeedDemo()
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
      body: JSON.stringify({ offset, timeout: 30, allowed_updates: ['message'] }),
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
        const chatId = String(update.message?.chat?.id || '')
        if (chatId === ADMIN_CHAT_ID && update.message?.text !== undefined) {
          await dispatch(update.message.text)
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