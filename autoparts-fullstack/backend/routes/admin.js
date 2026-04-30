const router = require('express').Router();
const User   = require('../models/User');
const Part   = require('../models/Part');
const Order  = require('../models/Order');
const { PartRequest, PromoCode } = require('../models/PartRequest');
const { protect, adminOnly } = require('../middleware/auth');

// All admin routes require auth + admin role
router.use(protect, adminOnly);

// GET /api/admin/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalParts,
      totalStockAgg,
      inventoryValueAgg,
      totalOrders,
      revenueAgg,
      pendingOrders,
      openRequests,
      totalCustomers,
      lowStock,
      categoryBreakdown,
      recentOrders,
      ordersByStatus,
    ] = await Promise.all([
      Part.countDocuments({ isActive: true }),
      Part.aggregate([{ $match: { isActive: true } }, { $group: { _id: null, total: { $sum: '$stock' } } }]),
      Part.aggregate([{ $match: { isActive: true } }, { $group: { _id: null, value: { $sum: { $multiply: ['$price', '$stock'] } } } }]),
      Order.countDocuments(),
      Order.aggregate([{ $match: { status: { $ne: 'Cancelled' } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Order.countDocuments({ status: 'Pending' }),
      PartRequest.countDocuments({ status: 'Open' }),
      User.countDocuments({ role: 'customer' }),
      Part.find({ stock: { $lte: 1 }, isActive: true }).select('name brand model stock price').limit(10),
      Part.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Order.find().sort({ createdAt: -1 }).limit(8),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    const revenue = revenueAgg[0]?.total || 0;

    res.json({
      stats: {
        totalParts,
        totalStock:      totalStockAgg[0]?.total || 0,
        inventoryValue:  inventoryValueAgg[0]?.value || 0,
        totalOrders,
        revenue,
        avgOrderValue:   totalOrders ? Math.round(revenue / totalOrders) : 0,
        pendingOrders,
        openRequests,
        totalCustomers,
      },
      lowStock,
      categoryBreakdown: categoryBreakdown.map(c => ({ category: c._id, count: c.count })),
      ordersByStatus:    ordersByStatus.map(o => ({ status: o._id, count: o.count })),
      recentOrders,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/users/:id/toggle — activate/deactivate user
router.put('/users/:id/toggle', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ id: user._id, isActive: user.isActive });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/reports/revenue — monthly revenue breakdown
router.get('/reports/revenue', async (req, res) => {
  try {
    const monthly = await Order.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          revenue: { $sum: '$total' },
          orders:  { $sum: 1 },
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 },
    ]);
    res.json(monthly);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/reports/top-parts — most ordered parts
router.get('/reports/top-parts', async (req, res) => {
  try {
    const top = await Order.aggregate([
      { $unwind: '$items' },
      { $group: { _id: '$items.partId', name: { $first: '$items.name' }, brand: { $first: '$items.brand' }, totalSold: { $sum: '$items.qty' }, revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } } } },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
    ]);
    res.json(top);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
