import User from '../models/User.js'

function formatUptime(ms) {
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d) return `${d}k ${h}s`
  if (h) return `${h}s ${m}m`
  return `${m}m`
}

function formatBytes(bytes) {
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

export async function getServerMetrics() {
  const [users, sellers, craftsmen, telegramLinked] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'seller' }),
    User.countDocuments({ role: 'craftsman' }),
    User.countDocuments({ telegramChatId: { $ne: '', $exists: true } }),
  ])
  return {
    uptime: formatUptime(process.uptime() * 1000),
    ram: formatBytes(process.memoryUsage().rss),
    users,
    sellers,
    craftsmen,
    telegramLinked,
  }
}