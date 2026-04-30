const mongoose = require('mongoose');

// ─── Part Request (unlisted parts) ────────────────────────────
const partRequestSchema = new mongoose.Schema({
  requestNumber: { type: String, unique: true },
  brand:         { type: String, required: true },
  model:         { type: String, required: true },
  year:          String,
  partName:      { type: String, required: true },
  category:      String,
  side:          String,
  oemNumber:     String,
  urgency:       { type: String, enum: ['flexible', 'soon', 'urgent'], default: 'flexible' },
  budgetMin:     Number,
  budgetMax:     Number,
  desc:          String,
  photos:        [{ url: String, publicId: String }],
  contactName:   { type: String, required: true },
  contactPhone:  { type: String, required: true },
  contactEmail:  String,
  contactMethod: { type: String, enum: ['WhatsApp', 'Phone call', 'Email'], default: 'WhatsApp' },
  status:        { type: String, enum: ['Open', 'In Progress', 'Quoted', 'Closed'], default: 'Open' },
  adminNote:     String,
  quotedPrice:   Number,
}, { timestamps: true });

partRequestSchema.pre('save', async function (next) {
  if (!this.requestNumber) {
    const count = await mongoose.model('PartRequest').countDocuments();
    this.requestNumber = `REQ-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// ─── Promo Code ───────────────────────────────────────────────
const promoCodeSchema = new mongoose.Schema({
  code:       { type: String, required: true, unique: true, uppercase: true },
  discount:   { type: Number, required: true },
  type:       { type: String, enum: ['percent', 'flat'], required: true },
  minOrder:   { type: Number, default: 0 },
  maxUses:    { type: Number, default: null },
  usedCount:  { type: Number, default: 0 },
  active:     { type: Boolean, default: true },
  expiresAt:  { type: Date, default: null },
}, { timestamps: true });

module.exports = {
  PartRequest: mongoose.model('PartRequest', partRequestSchema),
  PromoCode:   mongoose.model('PromoCode', promoCodeSchema),
};
