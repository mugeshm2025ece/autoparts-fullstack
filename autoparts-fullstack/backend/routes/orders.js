const router = require('express').Router();
const Order = require('../models/Order');
const Part  = require('../models/Part');
const { PromoCode } = require('../models/PartRequest');
const { protect, adminOnly } = require('../middleware/auth');

// POST /api/orders/validate-promo
router.post('/validate-promo', async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    if (!code) return res.status(400).json({ error: 'code required' });

    const promo = await PromoCode.findOne({ code: code.toUpperCase(), active: true });
    if (!promo) return res.status(404).json({ error: 'Invalid or expired promo code' });
    if (promo.expiresAt && promo.expiresAt < new Date()) return res.status(400).json({ error: 'Promo code has expired' });
    if (promo.maxUses && promo.usedCount >= promo.maxUses) return res.status(400).json({ error: 'Promo code usage limit reached' });
    if (promo.minOrder && subtotal < promo.minOrder) return res.status(400).json({ error: `Minimum order ₹${promo.minOrder} required for this code` });

    const discount = promo.type === 'percent'
      ? Math.round(subtotal * promo.discount / 100)
      : promo.discount;

    res.json({ code: promo.code, discount, type: promo.type, value: promo.discount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders — place an order (authenticated)
router.post('/', protect, async (req, res) => {
  try {
    const { items, address, paymentMethod, promoCode } = req.body;
    if (!items?.length || !address || !paymentMethod) {
      return res.status(400).json({ error: 'items, address, paymentMethod required' });
    }

    // Validate parts and compute subtotal
    let subtotal = 0;
    const orderItems = [];
    for (const item of items) {
      const part = await Part.findById(item.partId);
      if (!part || !part.isActive) return res.status(404).json({ error: `Part ${item.partId} not found` });
      if (part.stock < item.qty) return res.status(400).json({ error: `Insufficient stock for "${part.name}" (available: ${part.stock})` });
      subtotal += part.price * item.qty;
      orderItems.push({
        partId: part._id,
        name: part.name,
        brand: part.brand,
        model: part.model,
        price: part.price,
        qty: item.qty,
        imageUrl: part.images[0]?.url || '',
      });
    }

    // Apply promo
    let discount = 0;
    let usedPromo = null;
    if (promoCode) {
      const promo = await PromoCode.findOne({ code: promoCode.toUpperCase(), active: true });
      if (promo) {
        discount = promo.type === 'percent' ? Math.round(subtotal * promo.discount / 100) : promo.discount;
        usedPromo = promo.code;
        promo.usedCount += 1;
        await promo.save();
      }
    }

    const total = Math.max(0, subtotal - discount);

    // Deduct stock atomically
    for (const item of orderItems) {
      await Part.findByIdAndUpdate(item.partId, { $inc: { stock: -item.qty } });
    }

    const order = await Order.create({
      userId:        req.user._id,
      customerName:  req.user.name,
      customerEmail: req.user.email,
      customerPhone: req.user.phone || '',
      items:         orderItems,
      subtotal,
      discount,
      total,
      promoCode:     usedPromo,
      paymentMethod,
      paymentStatus: paymentMethod === 'COD' ? 'Pending' : 'Paid',
      address,
      statusHistory: [{ status: 'Pending', note: 'Order placed' }],
    });

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders — my orders (customer) or all (admin)
router.get('/', protect, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { userId: req.user._id };
    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.id });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (req.user.role !== 'admin' && String(order.userId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/orders/:id/status — admin updates status
router.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, note } = req.body;
    const valid = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const order = await Order.findOne({ orderNumber: req.params.id });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // If cancelling, restore stock
    if (status === 'Cancelled' && order.status !== 'Cancelled') {
      for (const item of order.items) {
        await Part.findByIdAndUpdate(item.partId, { $inc: { stock: item.qty } });
      }
    }

    order.status = status;
    order.statusHistory.push({ status, note: note || '', updatedAt: new Date() });
    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
