import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  password: { type: String, required: true, minlength: 6 },
  avatar: { type: String, default: '' },
  role: { type: String, enum: ['buyer', 'seller', 'craftsman'], default: 'buyer' },
  shopName: { type: String, trim: true },
  location: { type: String, trim: true },
  lat: { type: Number },
  lng: { type: Number },
  description: { type: String, trim: true },
  services: [String],
  experience: { type: String, trim: true },
  district: { type: String, trim: true },
  priceRange: { type: String, trim: true },
  verified: { type: Boolean, default: false },
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  workingHours: { type: String, default: '09:00 - 18:00' },
  available: { type: Boolean, default: true },
  completedJobs: { type: Number, default: 0 },
  passwordChangedAt: { type: Date },
  completedWorks: [{
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    title: { type: String, trim: true },
  description: { type: String, trim: true },
  color: { type: String, trim: true },
    images: [String],
    service: { type: String, trim: true },
    completedAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true })

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.passwordChangedAt = new Date(Date.now() - 1000)
  this.password = await bcrypt.hash(this.password, 10)
  if (!this.avatar) this.avatar = this.name.charAt(0).toUpperCase()
  next()
})

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password)
}

userSchema.methods.toJSON = function () {
  const obj = this.toObject()
  delete obj.password
  return obj
}

export default mongoose.model('User', userSchema)
