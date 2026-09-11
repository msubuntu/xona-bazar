import mongoose from 'mongoose'

const addressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, trim: true, default: 'Manzilim' },
  address: { type: String, required: true, trim: true },
  phone: { type: String, trim: true, default: '' },
  lat: { type: Number },
  lng: { type: Number },
  isDefault: { type: Boolean, default: false },
}, { timestamps: true })

export default mongoose.model('Address', addressSchema)