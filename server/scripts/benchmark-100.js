/**
 * Performance benchmark — inserts 200+ products, then runs explain() on real queries
 *
 * Run: node server/scripts/benchmark-100.js
 */
import mongoose from 'mongoose'
import Product from '../models/Product.js'

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/xona_bazar'

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

const CATEGORIES = ['santexnika', 'elektr', 'rudo', 'parket', 'bo\'yoq', 'shifer', 'gips', 'profil']
const BRANDS = ['Karcher', 'Bosch', 'Makita', 'DeWalt', 'Stanley', 'Hilti', 'Weber', 'Ceresit']
const STATUSES = ['active', 'active', 'active', 'active', 'paused', 'sold_out']

function printPlan(plan, indent = '') {
  if (!plan) return
  const winning = plan.queryPlanner?.winningPlan
  if (winning) {
    const stage = typeof winning.planSource === 'string' ? winning.planSource : winning.stage
    console.log(`${indent}Plan: ${stage}`)
    if (winning.inputStage) {
      const inp = winning.inputStage
      console.log(`${indent}  → ${inp.stage}${inp.indexName ? ' [' + inp.indexName + ']' : ''}`)
    }
  }
  const ex = plan.executionStats
  if (ex) {
    console.log(`${indent}Time: ${ex.executionTimeMillis}ms | Examined: ${ex.totalDocsExamined} | Returned: ${ex.nReturned} | Keys: ${ex.totalKeysExamined || 0}`)
    if (ex.totalDocsExamined > 0 && ex.nReturned > 0) {
      const ratio = (ex.totalDocsExamined / ex.nReturned).toFixed(1)
      console.log(`${indent}Scan ratio: ${ratio}:1 ${parseFloat(ratio) > 3 ? '⚠️  SLOW — too many docs scanned' : '✅ OK'}`)
    }
  }
}

async function run() {
  await mongoose.connect(MONGO_URI)
  console.log('Connected\n')

  // ── Insert test data ──
  const existing = await Product.countDocuments()
  if (existing >= 200) {
    console.log(`Already ${existing} products — skipping insert`)
  } else {
    const toInsert = []
    for (let i = 0; i < 200; i++) {
      toInsert.push({
        name: `Test mahsulot #${i + 1}`,
        brand: rand(BRANDS),
        category: rand(CATEGORIES),
        price: randInt(5000, 500000),
        stock: randInt(0, 100),
        sold: randInt(0, 200),
        rating: Math.round(Math.random() * 5 * 10) / 10,
        status: rand(STATUSES),
        sellerId: new mongoose.Types.ObjectId(),
        description: 'Test product for benchmark',
        images: [`/uploads/test-${i}.jpg`],
        createdAt: new Date(Date.now() - randInt(0, 90) * 86400000),
      })
    }
    await Product.insertMany(toInsert)
    console.log(`Inserted ${toInsert.length} test products`)
  }

  const total = await Product.countDocuments()
  console.log(`Total products: ${total}\n`)

  // ── Benchmark queries ──
  console.log('═══════════════════════════════════════════════')
  console.log(' BENCHMARK RESULTS')
  console.log('═══════════════════════════════════════════════')

  // Q1: Homepage product list (most common query)
  console.log('\n1️⃣  Homepage list — status=active, sort: createdAt desc, page 1')
  const q1 = await Product.find({ status: 'active' })
    .sort({ createdAt: -1 }).skip(0).limit(20)
    .explain('executionStats')
  printPlan(q1)

  // Q2: Price sort
  console.log('\n2️⃣  Price sort — status=active, sort: price asc')
  const q2 = await Product.find({ status: 'active' })
    .sort({ price: 1 }).skip(0).limit(20)
    .explain('executionStats')
  printPlan(q2)

  // Q3: Category filter
  console.log('\n3️⃣  Category filter — status=active + category=santexnika')
  const q3 = await Product.find({ status: 'active', category: 'santexnika' })
    .sort({ createdAt: -1 }).skip(0).limit(20)
    .explain('executionStats')
  printPlan(q3)

  // Q4: Seller products
  console.log('\n4️⃣  Seller products — sellerId + status=active')
  const sample = await Product.findOne({ status: 'active' }).lean()
  if (sample) {
    const q4 = await Product.find({ sellerId: sample.sellerId, status: 'active' })
      .sort({ createdAt: -1 }).skip(0).limit(20)
      .explain('executionStats')
    printPlan(q4)
  }

  // Q5: Popular sort (sold desc)
  console.log('\n5️⃣  Popular sort — status=active, sort: sold desc')
  const q5 = await Product.find({ status: 'active' })
    .sort({ sold: -1 }).skip(0).limit(20)
    .explain('executionStats')
  printPlan(q5)

  // Q6: Rating sort
  console.log('\n6️⃣  Rating sort — status=active, sort: rating desc')
  const q6 = await Product.find({ status: 'active' })
    .sort({ rating: -1 }).skip(0).limit(20)
    .explain('executionStats')
  printPlan(q6)

  // Q7: Deep pagination (page 10 = skip 180)
  console.log('\n7️⃣  Deep pagination — page 10 (skip 180, limit 20)')
  const t7s = Date.now()
  const q7 = await Product.find({ status: 'active' })
    .sort({ createdAt: -1 }).skip(180).limit(20)
    .explain('executionStats')
  console.log(`Wall time: ${Date.now() - t7s}ms`)
  printPlan(q7)

  // Q8: Text search
  console.log('\n8️⃣  Text search — "mahsulot"')
  const q8 = await Product.find({ $text: { $search: 'mahsulot' } })
    .sort({ createdAt: -1 }).skip(0).limit(20)
    .explain('executionStats')
  printPlan(q8)

  // Q9: Collection stats
  console.log('\n═══════════════════════════════════════════════')
  console.log(' INDEX USAGE STATS')
  console.log('═══════════════════════════════════════════════')
  const stats = await Product.collection.aggregate([{ $indexStats: {} }]).toArray()
  stats.forEach(s => {
    const accessed = s.accesses?.ops || 0
    const bar = '█'.repeat(Math.min(accessed, 30))
    console.log(`  ${s.name.padEnd(28)} ${String(accessed).padStart(4)}x  ${bar}`)
  })

  console.log('\nDone.')
  await mongoose.disconnect()
}

run().catch(err => { console.error(err); process.exit(1) })
