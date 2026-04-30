const router = require('express').Router();
const { PartRequest, PromoCode } = require('../models/PartRequest');
const { protect, adminOnly } = require('../middleware/auth');
const { uploadRequest } = require('../utils/cloudinary');

// ═══════════════════════════════════════════════════════════════
//  PART REQUESTS
// ═══════════════════════════════════════════════════════════════

// POST /api/requests — customer submits (no auth needed)
router.post('/', uploadRequest.array('photos', 5), async (req, res) => {
  try {
    const { brand, model, year, partName, category, side, oemNumber, urgency,
            budgetMin, budgetMax, desc, contactName, contactPhone, contactEmail, contactMethod } = req.body;

    if (!brand || !model || !partName || !contactName || !contactPhone) {
      return res.status(400).json({ error: 'brand, model, partName, contactName, contactPhone required' });
    }

    const photos = (req.files || []).map(f => ({ url: f.path, publicId: f.filename }));

    const request = await PartRequest.create({
      brand, model, year: year || '', partName, category: category || '',
      side: side || '', oemNumber: oemNumber || '',
      urgency: urgency || 'flexible',
      budgetMin: budgetMin ? Number(budgetMin) : null,
      budgetMax: budgetMax ? Number(budgetMax) : null,
      desc: desc || '', photos,
      contactName, contactPhone, contactEmail: contactEmail || '',
      contactMethod: contactMethod || 'WhatsApp',
    });

    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/requests — admin only
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const requests = await PartRequest.find(filter).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/requests/:id — admin updates status / quote
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { status, adminNote, quotedPrice } = req.body;
    const updates = {};
    if (status)      updates.status      = status;
    if (adminNote !== undefined) updates.adminNote = adminNote;
    if (quotedPrice) updates.quotedPrice = Number(quotedPrice);

    const request = await PartRequest.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
//  PROMO CODES (admin manage)
// ═══════════════════════════════════════════════════════════════

// GET /api/promo-codes
router.get('/promo-codes', protect, adminOnly, async (req, res) => {
  try {
    const codes = await PromoCode.find().sort({ createdAt: -1 });
    res.json(codes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/promo-codes
router.post('/promo-codes', protect, adminOnly, async (req, res) => {
  try {
    const { code, discount, type, minOrder, maxUses, expiresAt } = req.body;
    if (!code || !discount || !type) return res.status(400).json({ error: 'code, discount, type required' });

    const promo = await PromoCode.create({
      code: code.toUpperCase(),
      discount: Number(discount),
      type, minOrder: minOrder || 0,
      maxUses: maxUses || null,
      expiresAt: expiresAt || null,
    });
    res.status(201).json(promo);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Promo code already exists' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/promo-codes/:id
router.delete('/promo-codes/:id', protect, adminOnly, async (req, res) => {
  try {
    await PromoCode.findByIdAndDelete(req.params.id);
    res.json({ message: 'Promo code deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
