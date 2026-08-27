/**
 * MongoDB Index Migration Script
 * Adds missing compound indexes for frequently queried fields
 *
 * Run: node server/scripts/add-indexes.js
 * Safe to run multiple times (idempotent)
 */
import mongoose from 'mongoose'
import Product from '../models/Product.js'
import Order from '../models/Order.js'
import User from '../models/User.js'
import Booking from '../models/Booking.js'
import Conversation from '../models/Conversation.js'

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/xona_bazar'

async function run() {
  await mongoose.connect(MONGO_URI)
  console.log('Connected to MongoDB')
  const db = mongoose.connection.db

  console.log('\n--- Current indexes ---')

  const collections = {
    products: Product.collection,
    orders: Order.collection,
    users: User.collection,
    bookings: Booking.collection,
    conversations: Conversation.collection,
  }

  for (const [name, coll] of Object.entries(collections)) {
    const indexes = await coll.indexes()
    console.log(`\n${name}: ${indexes.length} indexes`)
    indexes.forEach(idx => {
      const keys = Object.entries(idx.key).map(([k, v]) => `${k}:${v}`).join(', ')
      console.log(`  - ${idx.name || 'unnamed'}: {${keys}}${idx.unique ? ' [unique]' : ''}`)
    })
  }

  console.log('\n--- Adding missing indexes ---')

  // Product: status + createdAt compound (pagination on active products)
  // Product: status + createdAt + price (for price sort on active products)
  // Product: sellerId + status (seller's active products)
  // Product: sellerId + createdAt (seller dashboard product list)
  // Product: status + sold (popular sort)
  // Product: status + rating (rating sort)
  await Product.collection.createIndex({ status: 1, createdAt: -1 }, { name: 'idx_status_createdAt' })
  await Product.collection.createIndex({ status: 1, price: 1 }, { name: 'idx_status_price_asc' })
  await Product.collection.createIndex({ status: 1, price: -1 }, { name: 'idx_status_price_desc' })
  await Product.collection.createIndex({ status: 1, sold: -1 }, { name: 'idx_status_sold' })
  await Product.collection.createIndex({ status: 1, rating: -1 }, { name: 'idx_status_rating' })
  await Product.collection.createIndex({ sellerId: 1, status: 1 }, { name: 'idx_sellerId_status' })
  await Product.collection.createIndex({ sellerId: 1, createdAt: -1 }, { name: 'idx_sellerId_createdAt' })
  console.log('✓ Product: 7 new indexes added')

  // Order: status index (for aggregation $match)
  await Order.collection.createIndex({ status: 1 }, { name: 'idx_status' })
  // Order: userId + status (buyer order list filtered by status)
  await Order.collection.createIndex({ userId: 1, status: 1 }, { name: 'idx_userId_status' })
  console.log('✓ Order: 2 new indexes added')

  // User: role index (seller/craftsman listing)
  await User.collection.createIndex({ role: 1, rating: -1 }, { name: 'idx_role_rating' })
  await User.collection.createIndex({ role: 1 }, { name: 'idx_role' })
  console.log('✓ User: 2 new indexes added')

  // Conversation: compound participants + lastTime (sorted message list)
  await Conversation.collection.createIndex({ participants: 1, lastTime: -1 }, { name: 'idx_participants_lastTime' })
  console.log('✓ Conversation: 1 new index added')

  console.log('\n--- Final index counts ---')
  for (const [name, coll] of Object.entries(collections)) {
    const count = await coll.indexes()
    console.log(`${name}: ${count.length} indexes`)
  }

  console.log('\nDone.')
  await mongoose.disconnect()
}

run().catch(err => { console.error(err); process.exit(1) })
