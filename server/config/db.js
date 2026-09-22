import mongoose from 'mongoose'
import Product from '../models/Product.js'

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI)
    console.log(`MongoDB connected: ${conn.connection.host}`)

    // Eski bog'lovchi text index (name+brand) ni o'chirib, yangisiga joy ochish.
    // MongoDB bitta collection uchun faqat bitta text index qo'llaydi.
    try {
      const col = conn.connection.db.collection('products')
      const indexes = await col.indexes()
      for (const idx of indexes) {
        const isText = Object.values(idx.key || {}).some(v => v === 'text')
        if (isText && idx.name !== 'product_text') {
          await col.dropIndex(idx.name)
          console.log(`Dropped old text index: ${idx.name}`)
        }
      }
      await Product.init()
    } catch (dbg) {
      console.log('Index sync:', dbg.message)
    }
  } catch (err) {
    console.error('MongoDB connection error:', err.message)
    process.exit(1)
  }
}

export default connectDB
