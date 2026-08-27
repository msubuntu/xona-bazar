import mongoose from 'mongoose'

const bookingSchema = new mongoose.Schema({
  craftsmanId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  service: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  date: { type: Date, required: true },
  time: { type: String, trim: true },
  address: { type: String, trim: true },
  phone: { type: String, trim: true },
  status: {
    type: String,
    enum: ['pending', 'quote_sent', 'quote_accepted', 'in_progress', 'completed', 'cancelled'],
    default: 'pending',
  },
  quotedPrice: { type: Number, default: 0 },
  finalPrice: { type: Number, default: 0 },
  paymentMethod: { type: String, enum: ['naqd', 'karta', 'online'], default: 'naqd' },
  paymentStatus: { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' },
  rated: { type: Boolean, default: false },
  rating: { type: Number, min: 1, max: 5 },
  review: { type: String, trim: true, default: '' },
  cancelReason: { type: String, trim: true, default: '' },
}, { timestamps: true })

bookingSchema.index({ craftsmanId: 1, createdAt: -1 })
bookingSchema.index({ userId: 1, createdAt: -1 })
bookingSchema.index({ craftsmanId: 1, status: 1 })

export default mongoose.model('Booking', bookingSchema)
