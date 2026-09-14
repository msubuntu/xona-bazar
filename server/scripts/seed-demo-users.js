import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'
import Product from '../models/Product.js'

dotenv.config()

const IMAGES = [
  '/uploads/1787199921975-Screenshot From 2026-08-17 16-13-30.png',
  '/uploads/1787205947351-Screenshot From 2026-08-20 09-06-32.png',
  '/uploads/1787206542934-Screenshot From 2026-08-18 14-59-59.png',
  '/uploads/1787206542937-Screenshot From 2026-08-19 11-47-50.png',
]

const PASSWORD = 'Demo1234'

const PRODUCTS = [
  {
    name: 'Demo Akril bo\'yoq Aqua (9L)', brand: 'TashAkril', category: 'paints', price: 850000,
    description: 'Fasad va ichki ishlar uchun suv bazali akril bo\'yoq. 9 litrlik chelak.',
    stock: 14, image: IMAGES[0],
    variants: [
      { color: 'Oq', price: 850000, stock: 8 },
      { color: 'Krem', price: 900000, stock: 4 },
      { color: 'Kulrang', price: 880000, stock: 2 },
    ],
  },
  {
    name: 'Demo Keramik plitka 60x60', brand: 'FerganaTile', category: 'tiles', price: 45000,
    description: 'Pol uchun keramik plitka, o\'lcham 60x60 sm. Paxta (box 1.44 m²).',
    stock: 60, image: IMAGES[1],
    variants: [
      { size: '60x60', price: 45000, stock: 40 },
      { size: '80x80', price: 68000, stock: 20 },
    ],
  },
  {
    name: 'Demo Dush kolonkasi to\'plami', brand: 'AlfaPlast', category: 'plumbing', price: 320000,
    description: 'Zanglamaydigan po\'latdan kolonna + shlang + uya. Simverni to\'liq to\'plam.',
    stock: 9, image: IMAGES[2],
  },
  {
    name: 'Demo Rozetka to\'plami (5 dona)', brand: 'Ekler', category: 'electrical', price: 60000,
    description: 'Ichki o\'rnatma rozetka, 16A. Oq rang, 5 dona.',
    stock: 25, image: IMAGES[3],
  },
  {
    name: 'Demo Perforator uchi 6mm', brand: 'UstaTools', category: 'tools', price: 18000,
    description: 'SDS-plus perforator uchi, beton uchun, 6 mm.',
    stock: 40, image: IMAGES[0],
  },
  {
    name: 'Demo Sement M400 50kg', brand: 'QarshiSement', category: 'building', price: 62000,
    description: 'Portlandsement M400, 50 kg qop.',
    stock: 120, image: IMAGES[1],
  },
  {
    name: 'Demo Ovqatlanish stoli 1.2m', brand: 'MebelPlus', category: 'furniture', price: 480000,
    description: 'To\'rt kishilik ovqatlanish stoli, 120x80 sm, laminat yuzali.',
    stock: 6, image: IMAGES[2],
  },
  {
    name: 'Demo Ichki eshik MDF', brand: 'EshikUsta', category: 'doors', price: 390000,
    description: 'Ichki eshik MDF, oq, o\'lcham 200x80 sm, gardishsiz.',
    stock: 8, image: IMAGES[3],
  },
  {
    name: 'Demo Suniy maysa 2x4m', brand: 'GreenZone', category: 'landscape', price: 189000,
    description: 'Yopiq maysa qoplamasi, o\'lcham 2x4 m, 10 mm.',
    stock: 12, image: IMAGES[0],
  },
]

async function run() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('MongoDB connected')

  const prev = await User.find({ email: /@xona\.demo$/ }).select('_id')
  const prevIds = prev.map(u => u._id)
  await Product.deleteMany({ sellerId: { $in: prevIds } })
  await User.deleteMany({ email: /@xona\.demo$/ })

  const seller = await User.create({
    name: 'Demo Do\'konchi', email: 'demo-seller@xona.demo', phone: '+998901234500',
    password: PASSWORD, role: 'seller',
    shopName: 'Demo Do\'kon', location: 'Toshkent, Chilonzor',
    lat: 41.29, lng: 69.24,
    description: 'Demo do\'kon — sinab ko\'rish uchun yaratilgan.',
    verified: true, workingHours: '09:00 - 20:00',
    social: { telegram: '@demo_shop', instagram: 'demo_shop', website: '' },
  })

  const buyer = await User.create({
    name: 'Demo Xaridor', email: 'demo-buyer@xona.demo', phone: '+998901234501',
    password: PASSWORD, role: 'buyer',
  })

  const craftsman = await User.create({
    name: 'Demo Usta', email: 'demo-craftsman@xona.demo', phone: '+998901234502',
    password: PASSWORD, role: 'craftsman',
    services: ['plumber', 'electrician', 'installer'],
    experience: '5 yil', district: 'Toshkent, Chilonzor', priceRange: '100 000 - 500 000 so\'m',
    verified: true, workingHours: '09:00 - 18:00',
  })

  let created = 0
  for (const p of PRODUCTS) {
    const product = new Product({
      name: p.name, brand: p.brand, category: p.category, price: p.price,
      oldPrice: Math.round(p.price * 1.15),
      image: p.image, images: [p.image].filter(Boolean),
      sellerId: seller._id, description: p.description,
      stock: p.stock, sold: Math.floor(Math.random() * 40),
      rating: Math.round((3.8 + Math.random() * 1.1) * 10) / 10,
      status: 'active',
    })
    if (p.variants) {
      product.variants = p.variants.map(v => ({ ...v, sku: 'VAR-' + Math.random().toString(36).slice(2, 8).toUpperCase() }))
    }
    await product.save()
    created++
  }

  console.log(`OK: ${created} products, seller/buyer/craftsman created`)
  console.log('EMAILS (password: ' + PASSWORD + '):')
  console.log('  buyer     -> demo-buyer@xona.demo')
  console.log('  seller    -> demo-seller@xona.demo')
  console.log('  craftsman -> demo-craftsman@xona.demo')
  console.log('To remove: node scripts/cleanup-test.js')

  await mongoose.disconnect()
}

run().catch(err => { console.error(err); process.exit(1) })