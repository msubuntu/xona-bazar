import 'dotenv/config'

const WINDOW_MS = 60000
const RATE_THRESHOLD = 50
const ALERT_COOLDOWN_MS = 60000

const SQL_RE = /(\bunion\b|\bselect\b|\bdrop\b|\bdelete\b|insert\s+into\b|--|'\s*or\s*'|or\s+1\s*=\s*1)/i
const XSS_RE = /<script|javascript:|onerror\s*=|onclick\s*=|onload\s*=|<\s*(img|iframe|svg|embed)|alert\s*\(/i
const TRAVERSAL_RE = /\.\.\/|\.\.%2f|%2e%2e/i
const PRIVATE_PATH_RE = /\/admin\b|\/\.env\b|\/config\b|\/wp-admin|\/\.git\b|\/\.ssh\b|\/server-status/i

const hitLog = new Map()
const alertSeen = new Map()

function esc(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export async function notifyAdmin(text) {
  const token = process.env.ADMIN_BOT_TOKEN || process.env.BOT_TOKEN || ''
  const chatId = process.env.ADMIN_CHAT_ID || ''
  if (!token || !chatId) {
    console.warn('[watcher] notifyAdmin: ADMIN_BOT_TOKEN / ADMIN_CHAT_ID sozlanmagan')
    return false
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })
    const body = await res.json().catch(() => null)
    if (!res.ok) console.error('[watcher] notifyAdmin:', res.status, body?.description || '')
    return res.ok
  } catch (err) {
    console.error('[watcher] notifyAdmin error:', err.message)
    return false
  }
}

function shouldAlert(key) {
  const now = Date.now()
  const last = alertSeen.get(key) || 0
  if (now - last < ALERT_COOLDOWN_MS) return false
  alertSeen.set(key, now)
  return true
}

export function watcher(req, res, next) {
  const now = Date.now()
  const ip = req.ip || req.socket?.remoteAddress || '?'
  const url = String(req.originalUrl || req.url || '')
  const method = req.method
  const source = `${method} ${url}`

  const entry = hitLog.get(ip) || { times: [] }
  entry.times = entry.times.filter(t => now - t < WINDOW_MS)
  entry.times.push(now)
  hitLog.set(ip, entry)

  if (entry.times.length >= RATE_THRESHOLD && shouldAlert(`rate|${ip}`)) {
    notifyAdmin(
      `<b>🚨 DDoS / brute-force urinishi</b>\n` +
      `IP: <code>${esc(ip)}</code>\n` +
      `1 daqiqada: ${entry.times.length} ta so'rov\n` +
      `oxirgisi: <code>${esc(source.slice(0, 120))}</code>`
    )
  }

  const checks = [
    { key: 'sql', re: SQL_RE, title: 'SQL injection', emoji: '🗄' },
    { key: 'xss', re: XSS_RE, title: 'XSS', emoji: '🧩' },
    { key: 'traversal', re: TRAVERSAL_RE, title: 'Path traversal', emoji: '📂' },
    { key: 'private', re: PRIVATE_PATH_RE, title: 'Maxfiy yo\'l', emoji: '🔐' },
  ]

  for (const c of checks) {
    const m = c.re.test(url)
    c.re.lastIndex = 0
    if (m && shouldAlert(`${c.key}|${ip}|${url.slice(0, 80)}`)) {
      notifyAdmin(
        `<b>${c.emoji} ${c.title} urinishi</b>\n` +
        `IP: <code>${esc(ip)}</code>\n` +
        `URL: <code>${esc(url.slice(0, 200))}</code>`
      )
    }
  }

  if (hitLog.size > 2000) {
    for (const [k, e] of hitLog) {
      e.times = e.times.filter(t => now - t < WINDOW_MS)
      if (!e.times.length) hitLog.delete(k)
    }
  }

  next()
}