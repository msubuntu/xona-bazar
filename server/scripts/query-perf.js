/**
 * MongoDB Query Performance Test
 * Measures query plans for the main product/order endpoints
 *
 * Run: node server/scripts/query-perf.js
 */
import mongoose from 'mongoose'
import Product from '../models/Product.js'
import Order from '../models/Order.js'
import Booking from '../models/Booking.js'
import Conversation from '../models/Conversation.js'

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/xona_bazar'

function printPlan(plan, indent = '') {
  if (!plan) return
  const winning = plan.queryPlanner?.winningPlan
  if (winning) {
    console.log(`${indent}Winning plan: ${winning.planSource || JSON.stringify(winning.stage)}`)
    if (winning.inputStage) {
      console.log(`${indent}  Input: ${winning.inputStage.stage}${winning.inputStage.indexName ? ` (${winning.inputStage.indexName})` : ''}`)
    }
  }
  const mem = plan.executionStats
  if (mem) {
    console.log(`${indent}Execution time: ${mem.executionTimeMillis}ms`)
    console.log(`${indent}Docs examined: ${mem.totalDocsExamined} | Returned: ${mem.nReturned}`)
    console.log(`${indent}Keys examined: ${mem.totalKeysExamined || 0}`)
  }
}

async function run() {
  await mongoose.connect(MONGO_URI)
  console.log('Connected to MongoDB\n')

  // Count docs first
  const productCount = await Product.countDocuments()
  const orderCount = await Order.countDocuments()
  console.log(`Products: ${productCount} docs`)
  console.log(`Orders: ${orderCount} docs\n`)

  // ── Test 1: Product list (status=active, sorted by createdAt) ──
  console.log('=== Test 1: Product list — status=active, sort: createdAt desc, page 1 ===')
  const p1 = await Product.find({ status: 'active' })
    .sort({ createdAt: -1 })
    .skip(0).limit(20)
    .explain('executionStats')
  printPlan(p1)

  // ── Test 2: Product list with price sort ──
  console.log('\n=== Test 2: Product list — status=active, sort: price asc ===')
  const p2 = await Product.find({ status: 'active' })
    .sort({ price: 1 })
    .skip(0).limit(20)
    .explain('executionStats')
  printPlan(p2)

  // ── Test 3: Product list with category filter ──
  console.log('\n=== Test 3: Product list — status=active + category filter ===')
  const p3 = await Product.find({ status: 'active', category: 'santexnika' })
    .sort({ createdAt: -1 })
    .skip(0).limit(20)
    .explain('executionStats')
  printPlan(p3)

  // ── Test 4: Seller products ──
  console.log('\n=== Test 4: Seller product list — sellerId + status ===')
  const sampleProduct = await Product.findOne().lean()
  if (sampleProduct?.sellerId) {
    const p4 = await Product.find({ sellerId: sampleProduct.sellerId, status: 'active' })
      .sort({ createdAt: -1 })
      .skip(0).limit(20)
      .explain('executionStats')
    printPlan(p4)
  } else {
    console.log('(skipped — no products in DB)')
  }

  // ── Test 5: Popular products (sold sort) ──
  console.log('\n=== Test 5: Product list — status=active, sort: sold desc ===')
  const p5 = await Product.find({ status: 'active' })
    .sort({ sold: -1 })
    .skip(0).limit(20)
    .explain('executionStats')
  printPlan(p5)

  // ── Test 6: Order aggregation (seller dashboard revenue) ──
  console.log('\n=== Test 6: Order aggregate — sellerId match + status group ===')
  if (sampleProduct?.sellerId) {
    const p6 = await Order.aggregate([
      { $match: { 'items.sellerId': sampleProduct.sellerId } },
      { $unwind: '$items' },
      { $match: { 'items.sellerId': sampleProduct.sellerId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
    console.log(`Result: ${JSON.stringify(p6)}`)
  }

  // ── Test 7: Conversation list ──
  console.log('\n=== Test 7: Conversation list — participants + lastTime sort ===')
  const convCount = await Conversation.countDocuments()
  if (convCount > 0) {
    const sampleConv = await Conversation.findOne().lean()
    const p7 = await Conversation.find({ participants: sampleConv.participants[0] })
      .sort({ lastTime: -1 })
      .limit(20)
      .explain('executionStats')
    printPlan(p7)
  } else {
    console.log('(skipped — no conversations)')
  }

  // ── Test 8: Booking stats ──
  console.log('\n=== Test 8: Booking aggregate — craftsmanId + status group ===')
  const sampleBooking = await Booking.findOne().lean()
  if (sampleBooking?.craftsmanId) {
    const p8 = await Booking.aggregate([
      { $match: { craftsmanId: sampleBooking.craftsmanId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
    console.log(`Result: ${JSON.stringify(p8)}`)
  } else {
    console.log('(skipped — no bookings)')
  }

  // ── Test 9: Stress test — skip to page 50 ──
  console.log('\n=== Test 9: Pagination stress — page 50 (skip 980, limit 20) ===')
  const t9Start = Date.now()
  const p9 = await Product.find({ status: 'active' })
    .sort({ createdAt: -1 })
    .skip(980).limit(20)
    .explain('executionStats')
  const t9Elapsed = Date.now() - t9Start
  printPlan(p9)
  console.log(`Total wall time: ${t9Elapsed}ms`)

  // ── Test 10: Index usage summary ──
  console.log('\n=== Index usage summary ===')
  const productStats = await Product.collection.aggregate([{ $indexStats: {} }]).toArray()
  productStats.forEach(s => {
    console.log(`  ${s.name}: accessed ${s.accesses?.ops || 0} times (since: ${s.accesses?.since || 'unknown'})`)
  })

  console.log('\nDone.')
  await mongoose.disconnect()
}

run().catch(err => { console.error(err); process.exit(1) })
