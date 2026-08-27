import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  text: { type: String, trim: true },
}, { timestamps: true })

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  brand: { type: String, required: true, trim: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  oldPrice: { type: Number },
  image: { type: String, default: '' },
  images: [{ type: String }],
  video: { type: String, default: '' },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, default: '' },
  specs: { type: Map, of: String, default: {} },
  stock: { type: Number, default: 0 },
  sold: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  reviews: [reviewSchema],
  status: { type: String, enum: ['active', 'paused', 'sold_out'], default: 'active' },
  variants: [
    {
      _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
      color: { type: String, trim: true },
      colorHex: { type: String, trim: true },
      size: { type: String, trim: true },
      price: { type: Number, required: true },
      oldPrice: { type: Number },
      image: { type: String, default: '' },
      images: [{ type: String }],
      stock: { type: Number, default: 0 },
      sku: { type: String, trim: true },
    }
  ],
}, { timestamps: true })

productSchema.index({ name: 'text', brand: 'text' })
productSchema.index({ category: 1 })
productSchema.index({ sellerId: 1 })

export default mongoose.model('Product', productSchema)
