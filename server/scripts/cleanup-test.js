import mongoose from 'mongoose'
import Product from '../models/Product.js'
await mongoose.connect('mongodb://127.0.0.1:27017/xona_bazar')
const r = await Product.deleteMany({ name: { $regex: /^Test mahsulot/ } })
console.log('Deleted', r.deletedCount, 'test products')
await mongoose.disconnect()
