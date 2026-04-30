const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  partId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Part', required: true },
  name:     String,
  brand:    String,
  model:    String,
  price:    Number,
  qty:      { type: Number, required: true, min: 1 },
  imageUrl: String,
});

const orderSchema = new mongoose.Schema({
  orderNumber:    { type: String, unique: true },
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  customerName:   String,
  customerEmail:  String,
  customerPhone:  String,
  items:          [orderItemSchema],
  subtotal:       { type: Number, required: true },
  discount:       { type: Number, default: 0 },
  total:          { type: Number, required: true },
  promoCode:      { type: String, default: null },
  paymentMethod:  { type: String, enum: ['UPI', 'Card', 'Net Banking', 'COD'], required: true },
  paymentStatus:  { type: String, enum: ['Pending', 'Paid', 'Refunded'], default: 'Pending' },
  status:         { type: String, enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'], default: 'Pending' },
  address:        { type: String, required: true },
  statusHistory:  [{ status: String, note: String, updatedAt: { type: Date, default: Date.now } }],
}, { timestamps: true });

// Auto-generate order number before save
orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `ORD-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
