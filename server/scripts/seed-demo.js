import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'
import Product from '../models/Product.js'

dotenv.config()

const prefix = '[DEMO]'

const CLUSTERS = [
  { center: [41.3267, 69.235], dist: 0.003, base: 'QX Chorsu' },
  { center: [41.270, 69.240], dist: 0.004, base: 'QX Minor' },
  { center: [41.350, 69.257], dist: 0.004, base: 'QX Yunusobod' },
]

const CATEGORIES = ['Qurilish', 'Elektronika', 'Uy-ro\'zg\'or', 'Bog\'dorchilik', 'Ofis']
const BRANDS = ['Testmark', 'DemoPro', 'SimTrade', 'Tezkor', 'Asl-Sifat']
const LOCATIONS = [
  'Chorsu bozori, 12', 'Gerogiyat, 5', 'Minor, 31', 'Samarqand darvoza, 8',
  'Chilonzor ko\'chasi, 44', 'Bunyodkor, 2', 'Amir Temur xiyoboni, 17', 'Yunusobod, 21',
  'Mixnat, 9', 'Farobiy, 3', 'Buyuk Ipak Yo\'li, 65', 'Kichik halqa, 27',
]

const rnd = (min, max) => Math.round((min + Math.random() * (max - min)) / 500) * 500
const pick = arr => arr[Math.floor(Math.random() * arr.length)]

async function run() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('MongoDB connected')

  const createdUsers = []
  const createdProducts = []

  let k = 0
  for (const c of CLUSTERS) {
    for (let i = 0; i < 8; i++) {
      k++
      const offLat = (Math.random() - 0.5) * c.dist
      const offLng = (Math.random() - 0.5) * c.dist
      const idx = (k - 1) % LOCATIONS.length
      const priceRange = `${rnd(45000, 250000).toLocaleString()} - ${rnd(300000, 900000).toLocaleString()} so'm`

      const user = new User({
        name: `${prefix} ${c.base} ${i + 1}`,
        email: `demo.seller${k}@xona.test`,
        phone: `+99890${String(1000000 + k).slice(1)}`,
        password: 'demo12345',
        role: 'seller',
        shopName: `${c.base} ${i + 1}`,
        location: LOCATIONS[idx],
        lat: c.center[0] + offLat,
        lng: c.center[1] + offLng,
        description: 'Test do\'kon — cluster/price bo\'limini tekshirish uchun',
        priceRange,
        verified: k % 3 === 0,
        rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
        reviewCount: Math.floor(Math.random() * 80),
        workingHours: '09:00 - 18:00',
      })
      await user.save()
      createdUsers.push(user)

      const product = new Product({
        name: `${pick(['Vinil', 'Drywall', 'Farba', 'Kakel', 'Laminate', 'Trassa', 'Pistolet', 'Teploizol']) } ${c.base} ${i + 1}`,
        brand: pick(BRANDS),
        category: pick(CATEGORIES),
        price: rnd(60000, 700000),
        image: '',
        sellerId: user._id,
        description: 'Demo mahsulot — cluster/price bo\'limini tekshirish uchun',
        stock: Math.floor(Math.random() * 100),
        sold: Math.floor(Math.random() * 300),
        rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
        status: 'active',
      })
      await product.save()
      createdProducts.push(product)
    }
  }

  console.log(`Created ${createdUsers.length} demo sellers, ${createdProducts.length} demo products`)
  console.log('To remove later: node scripts/cleanup-demo.js')
  await mongoose.disconnect()
}

run().catch(err => { console.error(err); process.exit(1) })