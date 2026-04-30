const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName:  String,
  rating:    { type: Number, min: 1, max: 5, required: true },
  comment:   String,
}, { timestamps: true });

const partSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  brand:      { type: String, required: true, trim: true },
  model:      { type: String, required: true, trim: true },
  year:       { type: String, default: '' },
  category:   { type: String, required: true, enum: ['Body','Engine','Electrical','Transmission','Brakes','AC','Drivetrain','Steering','Fuel System','Exhaust','Interior','Suspension','Other'] },
  condition:  { type: String, required: true, enum: ['New', 'Good', 'Fair'] },
  price:      { type: Number, required: true, min: 0 },
  stock:      { type: Number, required: true, default: 1, min: 0 },
  desc:       { type: String, default: '' },
  icon:       { type: String, default: '🔧' },
  sku:        { type: String, unique: true },
  images:     [{ url: String, publicId: String }],   // Cloudinary url + publicId
  reviews:    [reviewSchema],
  rating:     { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
  isActive:   { type: Boolean, default: true },
}, { timestamps: true });

// Auto-compute rating avg when reviews change
partSchema.methods.computeRating = function () {
  if (this.reviews.length === 0) { this.rating = 0; this.numReviews = 0; return; }
  const sum = this.reviews.reduce((acc, r) => acc + r.rating, 0);
  this.rating = Math.round((sum / this.reviews.length) * 10) / 10;
  this.numReviews = this.reviews.length;
};

// Text index for full-text search
partSchema.index({ name: 'text', brand: 'text', model: 'text', category: 'text' });
partSchema.index({ brand: 1, category: 1, condition: 1, price: 1 });

module.exports = mongoose.model('Part', partSchema);
