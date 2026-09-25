// Uploads papkasidagi egasiz (orphan) fayllarni tozalash.
// Baza'dagi hech qanday mahsulot/foydalanuvchi ishini ko'rsatmaydigan fayllarni o'chiradi.
// Ishga tushirish:  cd server && node scripts/cleanup-orphans.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { readdir, unlink, stat } from 'fs/promises'
import { join, resolve, basename } from 'path'
import Product from '../models/Product.js'
import User from '../models/User.js'

dotenv.config()

const UPLOADS_DIR = resolve('uploads')

function addRefs(set, urls) {
  for (const u of urls) {
    if (!u || typeof u !== 'string') continue
    const name = basename(String(u).split('?')[0])
    if (name && name !== '.' && name !== '..' && !name.includes('/') && !name.includes('\\')) set.add(name)
  }
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('MongoDB connected')

  const refs = new Set()

  const products = await Product.find({}).select('image images video variants').lean()
  for (const p of products) {
    addRefs(refs, [p.image, p.video, ...(Array.isArray(p.images) ? p.images : [])])
    for (const v of p.variants || []) addRefs(refs, [v.image, ...(Array.isArray(v.images) ? v.images : [])])
  }
  console.log(`[1/3] Mahsulotlar: ${products.length} ta, ularga tegishli fayllar yig'ildi`)

  const users = await User.find({}).select('avatar completedWorks').lean()
  for (const u of users) {
    addRefs(refs, [u.avatar])
    for (const w of u.completedWorks || []) addRefs(refs, w.images || [])
  }
  console.log(`[2/3] Foydalanuvchilar: ${users.length} ta, avatarlar va ish rasmlari yig'ildi`)

  const entries = await readdir(UPLOADS_DIR)
  const candidates = []
  for (const name of entries) {
    const info = await stat(join(UPLOADS_DIR, name)).catch(() => null)
    if (!info || !info.isFile()) continue
    if (!refs.has(name)) candidates.push(name)
  }

  if (candidates.length === 0) {
    console.log("[3/3] Orphan fayl topilmadi — to'liq toza ✔")
    await mongoose.disconnect()
    return
  }

  console.log(`[3/3] ${candidates.length} ta egasiz fayl topildi, o'chirilmoqda...`)
  let removed = 0
  for (const name of candidates) {
    try {
      await unlink(join(UPLOADS_DIR, name))
      removed++
      console.log(`  - ${name}`)
    } catch (err) {
      console.error(`  Xato: ${name}: ${err.message}`)
    }
  }
  console.log(`Bajarildi: ${removed} ta fayl o'chirildi, ${candidates.length - removed} ta xato`)
  await mongoose.disconnect()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})