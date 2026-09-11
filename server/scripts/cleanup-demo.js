import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User.js'
import Product from '../models/Product.js'

dotenv.config()

const prefix = '[DEMO]'

async function run() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('MongoDB connected')

  const demoUsers = await User.find({ name: { $regex: '^\\[DEMO\\]' } })
  const ids = demoUsers.map(u => u._id)
  const delProducts = await Product.deleteMany({ sellerId: { $in: ids } })
  const delUsers = await User.deleteMany({ _id: { $in: ids } })

  console.log(`Removed ${delProducts.deletedCount} demo products, ${delUsers.deletedCount} demo sellers`)
  await mongoose.disconnect()
}

run().catch(err => { console.error(err); process.exit(1) })