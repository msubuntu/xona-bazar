const buckets = new Map()
let lastCleanup = Date.now()
let instanceCounter = 0

export function rateLimit({ windowMs = 60000, max = 100, keyFn } = {}) {
  const instance = ++instanceCounter
  return (req, res, next) => {
    const now = Date.now()
    if (now - lastCleanup > 600000) {
      for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k)
      lastCleanup = now
    }

    const rawKey = keyFn ? `${req.ip}|${keyFn(req)}` : req.ip
    const key = `${instance}|${rawKey}`
    const bucket = buckets.get(key)
    if (!bucket || bucket.resetAt < now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs })
      return next()
    }

    bucket.count += 1
    if (bucket.count > max) {
      return res.status(429).json({ message: "Juda ko'p so'rov yuborildi. Keyinroq urinib ko'ring" })
    }
    next()
  }
}