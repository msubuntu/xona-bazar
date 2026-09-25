import { unlink } from 'fs/promises'
import { basename, join, resolve } from 'path'

const UPLOADS_DIR = resolve('uploads')

// /uploads/<fayl>.jpg, avatar-, work- URL'larni qabul qiladi va diskdan xavfsiz o'chiradi.
// Firebase/generator xatoliklarini bostirmay, faqat real urinishlarni log qiladi.
export function safeUnlink(urls) {
  const seen = new Set()
  for (const u of Array.isArray(urls) ? urls : [urls]) {
    if (!u || typeof u !== 'string') continue
    const clean = String(u).split('?')[0]
    const name = basename(clean)
    if (!name || name === '.' || name === '..' || name.includes('/') || name.includes('\\') || seen.has(name)) continue
    seen.add(name)
    unlink(join(UPLOADS_DIR, name)).catch((err) => {
      if (err && err.code !== 'ENOENT') {
        console.error(`[cleanup] fayl o'chirilmadi: ${name}: ${err.message}`)
      }
    })
  }
}

// Mahsulotga tegishli barcha fayl URL'larini yig'adi (asosiy rasm, galereya, video, variant rasmlari).
export function productFileUrls(product) {
  if (!product) return []
  const urls = []
  if (product.image) urls.push(product.image)
  if (Array.isArray(product.images)) urls.push(...product.images)
  if (product.video) urls.push(product.video)
  if (Array.isArray(product.variants)) {
    for (const v of product.variants) {
      if (v && v.image) urls.push(v.image)
      if (v && Array.isArray(v.images)) urls.push(...v.images)
    }
  }
  return urls.filter(Boolean)
}