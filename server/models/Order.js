import mongoose from 'mongoose'

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String },
  variant: {
    _id: { type: mongoose.Schema.Types.ObjectId },
    color: { type: String },
    colorHex: { type: String },
    size: { type: String },
    sku: { type: String },
  },
  qty: { type: Number, required: true, min: 1 },
}, { _id: false })

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema],
  total: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'], default: 'pending' },
  address: { type: String, trim: true },
  phone: { type: String, trim: true },
  note: { type: String, trim: true },
}, { timestamps: true })

orderSchema.index({ userId: 1, createdAt: -1 })
orderSchema.index({ 'items.sellerId': 1, createdAt: -1 })

export default mongoose.model('Order', orderSchema)
