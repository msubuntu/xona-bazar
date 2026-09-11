import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'
import Product from '../models/Product.js'

dotenv.config()

const CATS = {
  paints: {
    label: "Bo'yoqlar",
    names: ["Mato bo'yoq", 'Yog\'li bo\'yoq', 'Emal bo\'yoq', 'Primer', 'Lak', 'Dekorativ bo\'yoq', 'Fasad bo\'yoq', 'Akril bo\'yoq', 'Anti-korroziya bo\'yoq', 'Suv bazali bo\'yoq'],
  },
  tiles: {
    label: 'G\'isht va Plitka',
    names: ["Kichik kafel", 'Keramogranit 60x60', 'Devor plitkasi', 'Pol plitkasi', 'Mozayka', 'Fasad plitkasi', 'Klinker g\'isht', 'Silikat g\'isht', 'Hammom plitkasi', 'Oshxona fartugi'],
  },
  plumbing: {
    label: 'Sanitariya',
    names: ['Suv isitgich', 'Yuvinish rakovinasi', 'Tushish dushi', 'Krannaya golovka', 'Truba PVC 50', 'Sifon', 'Mixayil kran', 'Bidonet', 'Tualet bachogi', 'Kollektor'],
  },
  electrical: {
    label: 'Elektr',
    names: ['Rozetka bino', 'O\'chirgich', 'Kabel 2x1.5', 'Avtomat 16A', 'LED lenta', 'Energiya lampa', 'Elektr schitok', 'Sigaret rozetkasi', 'Termostat', 'Zaryadka adapteri'],
  },
  tools: {
    label: 'Asboblar',
    names: ['Bolg\'a', 'Otvertka komplekt', 'Peredatka', 'Elektr qabariq', 'Drel ', 'Perforator 800W', 'Shlifmashina', 'Stolbik o\'lchagich', 'Keys asboblar to\'plami', 'Urma kalit komplekt'],
  },
  building: {
    label: 'Qurilish',
    names: ['Sement M500', 'Quruq aralashma', 'Gips Sh-10', 'Keramzit', 'Aroq qipi', 'Armatura 12mm', 'Quturilgan siyqa', 'O\'ra mato', 'Kesper', 'Tirqish yopish shpagatkasi'],
  },
  furniture: {
    label: 'Mebel',
    names: ['Ofis stoli', 'Kreslo', 'Yotoq to\'plami', 'Shkaf 3 eshikli', 'Kitob javoni', 'Mehmon stoli', 'Divan yig\'ma', 'Oshxona stoli', 'Kompyuter stoli', 'Bog\'chasi to\'plam'],
  },
  doors: {
    label: 'Eshik va Deraza',
    names: ['Ichki eshik 80', 'Kirish eshigi temir', 'Suv o\'tkazmas eshik', 'Deraza PVH 1400x1300', 'Balkon eshigi', 'Garaj eshigi', 'Shisha eshik', 'Shkaf eshigi', 'Metall plastik eshik', 'Panjara eshigi'],
  },
  landscape: {
    label: 'Landshaft',
    names: ['Emanni ko\'chat', 'Gazon urug\'i 1kg', 'Dekorativ tosh', 'Bog\' toshagi', 'Fountain kichik', 'Park skameykasi', 'LED bog\' chiroq', 'Devor uchun panjara', 'Barbekyu stoli', 'Bog\' yo\'li plitkasi'],
  },
}

const BRANDS = ['Testmark', 'DemoPro', 'SimTrade', 'Tezkor', 'Asl-Sifat']
const prefix = '[DEMO]'

const rnd = (min, max) => Math.round((min + Math.random() * (max - min)) / 1000) * 1000
const pick = arr => arr[Math.floor(Math.random() * arr.length)]

async function run() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('MongoDB connected')

  const sellers = await User.find({ role: 'seller', name: { $regex: '^\\[DEMO\\]' } })
    .select('_id shopName')
  if (!sellers.length) {
    console.error('Demo sellerlar topilmadi. Avval: node scripts/seed-demo.js')
    process.exit(1)
  }
  console.log(`Foydalaniladigan sellerlar: ${sellers.length} ta`)

  let created = 0
  for (const [catId, cat] of Object.entries(CATS)) {
    for (let i = 0; i < 10; i++) {
      const seller = sellers[(created + i) % sellers.length]
      const product = new Product({
        name: `${prefix} ${cat.names[i]} ${catId}`,
        brand: pick(BRANDS),
        category: catId,
        price: rnd(25000, 1500000),
        image: '',
        sellerId: seller._id,
        description: `Demo mahsulot — "${cat.label}" kategoriyasi uchun test`,
        stock: Math.floor(Math.random() * 200),
        sold: Math.floor(Math.random() * 500),
        rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
        status: 'active',
      })
      await product.save()
      created++
    }
    console.log(`  ${catId.padEnd(11)} (${cat.label}) -> 10 ta`)
  }

  console.log(`Created ${created} demo products (10 x ${Object.keys(CATS).length} kategoriya)`)
  await mongoose.disconnect()
}

run().catch(err => { console.error(err); process.exit(1) })