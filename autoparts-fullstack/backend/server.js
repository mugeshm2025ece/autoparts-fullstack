const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'autoparts_yard_secret_2026_default_key';

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Ensure folders exist ──────────────────────────────────────────────────────
['uploads/parts', 'uploads/requests', 'data'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ─── JSON "Database" (lowdb-style flat files) ──────────────────────────────────
const DB_PATH = './data/db.json';

function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = {
      users: [
        {
          id: 'u1',
          name: 'Admin User',
          email: 'admin@autoparts.com',
          password: bcrypt.hashSync('Admin@123!', 10),
          role: 'admin',
          phone: '+91 9000000000',
          createdAt: new Date().toISOString()
        },
        {
          id: 'u2',
          name: 'Priya Shankar',
          email: 'customer@test.com',
          password: bcrypt.hashSync('Pass@456#', 10),
          role: 'customer',
          phone: '+91 9876543210',
          createdAt: new Date().toISOString()
        }
      ],
      parts: [
        { id: 'p1', name: 'Front Bumper Assembly', brand: 'Maruti Suzuki', model: 'Swift', year: '2018-2022', category: 'Body', condition: 'Good', price: 2800, stock: 2, desc: 'Good condition, minor scuffs on lower edge', icon: '🚗', sku: 'MS-FB-001', images: [], rating: 4.2, reviews: 14, createdAt: new Date().toISOString() },
        { id: 'p2', name: 'Radiator', brand: 'Hyundai', model: 'i20', year: '2016-2020', category: 'Engine', condition: 'Good', price: 3500, stock: 1, desc: 'No leaks, pressure tested', icon: '⚙️', sku: 'HY-RAD-002', images: [], rating: 4.5, reviews: 9, createdAt: new Date().toISOString() },
        { id: 'p3', name: 'Front Left Door', brand: 'Toyota', model: 'Innova', year: '2015-2019', category: 'Body', condition: 'Fair', price: 5500, stock: 1, desc: 'Minor dents on lower panel, glass intact', icon: '🚪', sku: 'TY-DR-003', images: [], rating: 3.8, reviews: 5, createdAt: new Date().toISOString() },
        { id: 'p4', name: 'Alternator 80A', brand: 'Honda', model: 'City', year: '2017-2021', category: 'Electrical', condition: 'Good', price: 4200, stock: 3, desc: 'Output tested 14.2V — normal', icon: '⚡', sku: 'HN-ALT-004', images: [], rating: 4.7, reviews: 22, createdAt: new Date().toISOString() },
        { id: 'p5', name: 'Gearbox 5-Speed', brand: 'Tata', model: 'Nexon', year: '2019-2023', category: 'Transmission', condition: 'Good', price: 18000, stock: 1, desc: 'Smooth shifting, no grinding', icon: '🔧', sku: 'TA-GB-005', images: [], rating: 4.3, reviews: 7, createdAt: new Date().toISOString() },
        { id: 'p6', name: 'Headlight RHS', brand: 'Maruti Suzuki', model: 'Baleno', year: '2019-2023', category: 'Electrical', condition: 'New', price: 2200, stock: 4, desc: 'New old stock, unused', icon: '💡', sku: 'MS-HL-006', images: [], rating: 4.9, reviews: 31, createdAt: new Date().toISOString() },
        { id: 'p7', name: 'AC Compressor', brand: 'Hyundai', model: 'Creta', year: '2020-2023', category: 'AC', condition: 'Good', price: 7500, stock: 1, desc: 'Cooling tested OK, no noise', icon: '❄️', sku: 'HY-AC-007', images: [], rating: 4.1, reviews: 11, createdAt: new Date().toISOString() },
        { id: 'p8', name: 'Brake Caliper Set', brand: 'Maruti Suzuki', model: 'Ertiga', year: '2018-2022', category: 'Brakes', condition: 'Good', price: 1800, stock: 3, desc: 'Piston moves freely, seals good', icon: '🛑', sku: 'MS-BC-008', images: [], rating: 4.6, reviews: 18, createdAt: new Date().toISOString() }
      ],
      orders: [
        { id: 'ORD-001', userId: 'u2', customerName: 'Priya Shankar', customerEmail: 'customer@test.com', customerPhone: '+91 9876543210', items: [{ partId: 'p4', name: 'Alternator 80A', brand: 'Honda', model: 'City', price: 4200, qty: 1 }], subtotal: 4200, discount: 0, total: 4200, paymentMethod: 'UPI', paymentStatus: 'Paid', status: 'Shipped', promoCode: null, address: '42, Anna Nagar, Chennai - 600040', createdAt: '2026-04-22T10:00:00Z', updatedAt: '2026-04-23T08:00:00Z' }
      ],
      partRequests: [],
      promoCodes: [
        { code: 'YARD10', discount: 10, type: 'percent', active: true },
        { code: 'FIRST20', discount: 20, type: 'percent', active: true },
        { code: 'FLAT500', discount: 500, type: 'flat', active: true }
      ],
      activityLog: []
    };
    writeDB(initial);
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function logActivity(db, msg) {
  db.activityLog.unshift({ msg, time: new Date().toISOString() });
  if (db.activityLog.length > 50) db.activityLog = db.activityLog.slice(0, 50);
}

// ─── Multer for image uploads ──────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.path.includes('request') ? 'uploads/requests' : 'uploads/parts';
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    cb(null, uuidv4() + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ─── Auth middleware ───────────────────────────────────────────────────────────
// Note: Passwords support all characters including special chars (!@#$%^&* etc.)
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

// ═══════════════════════════════════════════════════════════════
//  AUTH ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/auth/register
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password required' });

  const db = readDB();
  if (db.users.find(u => u.email === email)) return res.status(409).json({ error: 'Email already registered' });

  const user = {
    id: uuidv4(),
    name, email,
    password: bcrypt.hashSync(password, 10),
    role: 'customer',
    phone: phone || '',
    createdAt: new Date().toISOString()
  };
  db.users.push(user);
  logActivity(db, `New customer registered: ${name} (${email})`);
  writeDB(db);

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone } });
});

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  logActivity(db, `Login: ${user.name} (${user.role})`);
  writeDB(db);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone } });
});

// GET /api/auth/me
app.get('/api/auth/me', authMiddleware, (req, res) => {
  const db = readDB();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone });
});

// ═══════════════════════════════════════════════════════════════
//  PARTS ROUTES
// ═══════════════════════════════════════════════════════════════

// GET /api/parts  (public - with search/filter/sort)
app.get('/api/parts', (req, res) => {
  const db = readDB();
  let parts = [...db.parts];
  const { q, brand, category, condition, minPrice, maxPrice, sort, rating } = req.query;

  if (q) {
    const lq = q.toLowerCase();
    parts = parts.filter(p => `${p.name} ${p.brand} ${p.model} ${p.category}`.toLowerCase().includes(lq));
  }
  if (brand) parts = parts.filter(p => p.brand === brand);
  if (category) parts = parts.filter(p => p.category === category);
  if (condition) parts = parts.filter(p => condition.split(',').includes(p.condition));
  if (minPrice) parts = parts.filter(p => p.price >= Number(minPrice));
  if (maxPrice) parts = parts.filter(p => p.price <= Number(maxPrice));
  if (rating) parts = parts.filter(p => p.rating >= Number(rating));

  if (sort === 'price_asc') parts.sort((a, b) => a.price - b.price);
  else if (sort === 'price_desc') parts.sort((a, b) => b.price - a.price);
  else if (sort === 'name') parts.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'rating') parts.sort((a, b) => b.rating - a.rating);

  res.json({ total: parts.length, parts });
});

// GET /api/parts/meta  (brands, categories for filters)
app.get('/api/parts/meta', (req, res) => {
  const db = readDB();
  const brands = [...new Set(db.parts.map(p => p.brand))].sort();
  const categories = [...new Set(db.parts.map(p => p.category))].sort();
  const maxPrice = Math.max(...db.parts.map(p => p.price));
  res.json({ brands, categories, maxPrice });
});

// GET /api/parts/:id
app.get('/api/parts/:id', (req, res) => {
  const db = readDB();
  const part = db.parts.find(p => p.id === req.params.id);
  if (!part) return res.status(404).json({ error: 'Part not found' });
  res.json(part);
});

// POST /api/parts  (admin only)
app.post('/api/parts', authMiddleware, adminOnly, (req, res) => {
  const { name, brand, model, year, category, condition, price, stock, desc, icon } = req.body;
  if (!name || !brand || !model || !price) return res.status(400).json({ error: 'name, brand, model, price required' });

  const db = readDB();
  const skuPrefix = brand.slice(0, 2).toUpperCase() + '-' + category.slice(0, 2).toUpperCase();
  const skuNum = String(db.parts.length + 1).padStart(3, '0');

  const part = {
    id: uuidv4(),
    name, brand, model,
    year: year || '',
    category: category || 'Body',
    condition: condition || 'Good',
    price: Number(price),
    stock: Number(stock) || 1,
    desc: desc || '',
    icon: icon || '🔧',
    sku: `${skuPrefix}-${skuNum}`,
    images: [],
    rating: 0,
    reviews: 0,
    createdAt: new Date().toISOString()
  };
  db.parts.push(part);
  logActivity(db, `New part added: ${name} (${brand} ${model}) by admin`);
  writeDB(db);
  res.status(201).json(part);
});

// PUT /api/parts/:id  (admin only)
app.put('/api/parts/:id', authMiddleware, adminOnly, (req, res) => {
  const db = readDB();
  const idx = db.parts.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Part not found' });

  const allowed = ['name', 'brand', 'model', 'year', 'category', 'condition', 'price', 'stock', 'desc', 'icon'];
  allowed.forEach(k => { if (req.body[k] !== undefined) db.parts[idx][k] = req.body[k]; });
  if (req.body.price) db.parts[idx].price = Number(req.body.price);
  if (req.body.stock !== undefined) db.parts[idx].stock = Number(req.body.stock);
  db.parts[idx].updatedAt = new Date().toISOString();

  logActivity(db, `Part updated: ${db.parts[idx].name}`);
  writeDB(db);
  res.json(db.parts[idx]);
});

// DELETE /api/parts/:id  (admin only)
app.delete('/api/parts/:id', authMiddleware, adminOnly, (req, res) => {
  const db = readDB();
  const part = db.parts.find(p => p.id === req.params.id);
  if (!part) return res.status(404).json({ error: 'Part not found' });
  db.parts = db.parts.filter(p => p.id !== req.params.id);
  logActivity(db, `Part deleted: ${part.name}`);
  writeDB(db);
  res.json({ message: 'Deleted successfully' });
});

// POST /api/parts/:id/images  (admin - upload images)
app.post('/api/parts/:id/images', authMiddleware, adminOnly, upload.array('images', 10), (req, res) => {
  const db = readDB();
  const part = db.parts.find(p => p.id === req.params.id);
  if (!part) return res.status(404).json({ error: 'Part not found' });

  const urls = req.files.map(f => `/uploads/parts/${f.filename}`);
  part.images.push(...urls);
  writeDB(db);
  res.json({ images: part.images });
});

// DELETE /api/parts/:id/images  (admin - remove image)
app.delete('/api/parts/:id/images', authMiddleware, adminOnly, (req, res) => {
  const { url } = req.body;
  const db = readDB();
  const part = db.parts.find(p => p.id === req.params.id);
  if (!part) return res.status(404).json({ error: 'Part not found' });
  part.images = part.images.filter(img => img !== url);
  writeDB(db);
  res.json({ images: part.images });
});

// ═══════════════════════════════════════════════════════════════
//  ORDERS ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/orders/validate-promo
app.post('/api/orders/validate-promo', (req, res) => {
  const { code } = req.body;
  const db = readDB();
  const promo = db.promoCodes.find(p => p.code === code?.toUpperCase() && p.active);
  if (!promo) return res.status(404).json({ error: 'Invalid or expired promo code' });
  res.json({ code: promo.code, discount: promo.discount, type: promo.type });
});

// POST /api/orders  (authenticated customers)
app.post('/api/orders', authMiddleware, (req, res) => {
  const { items, address, paymentMethod, promoCode } = req.body;
  if (!items?.length || !address || !paymentMethod) {
    return res.status(400).json({ error: 'items, address, paymentMethod required' });
  }

  const db = readDB();
  const user = db.users.find(u => u.id === req.user.id);

  // Validate items & calculate total
  let subtotal = 0;
  const orderItems = [];
  for (const item of items) {
    const part = db.parts.find(p => p.id === item.partId);
    if (!part) return res.status(404).json({ error: `Part ${item.partId} not found` });
    if (part.stock < item.qty) return res.status(400).json({ error: `Insufficient stock for ${part.name}` });
    subtotal += part.price * item.qty;
    orderItems.push({ partId: part.id, name: part.name, brand: part.brand, model: part.model, price: part.price, qty: item.qty });
  }

  // Apply promo
  let discount = 0;
  let usedPromo = null;
  if (promoCode) {
    const promo = db.promoCodes.find(p => p.code === promoCode.toUpperCase() && p.active);
    if (promo) {
      discount = promo.type === 'percent' ? Math.round(subtotal * promo.discount / 100) : promo.discount;
      usedPromo = promo.code;
    }
  }
  const total = Math.max(0, subtotal - discount);

  // Deduct stock
  orderItems.forEach(item => {
    const part = db.parts.find(p => p.id === item.partId);
    part.stock -= item.qty;
  });

  const orderNum = String(db.orders.length + 1).padStart(3, '0');
  const order = {
    id: `ORD-${orderNum}`,
    userId: req.user.id,
    customerName: user.name,
    customerEmail: user.email,
    customerPhone: user.phone || '',
    items: orderItems,
    subtotal,
    discount,
    total,
    paymentMethod,
    paymentStatus: paymentMethod === 'COD' ? 'Pending' : 'Paid',
    status: 'Pending',
    promoCode: usedPromo,
    address,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.orders.push(order);
  logActivity(db, `New order ${order.id} — ₹${total} by ${user.name} via ${paymentMethod}`);
  writeDB(db);
  res.status(201).json(order);
});

// GET /api/orders  (admin = all, customer = own)
app.get('/api/orders', authMiddleware, (req, res) => {
  const db = readDB();
  const orders = req.user.role === 'admin'
    ? db.orders
    : db.orders.filter(o => o.userId === req.user.id);
  res.json(orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

// GET /api/orders/:id
app.get('/api/orders/:id', authMiddleware, (req, res) => {
  const db = readDB();
  const order = db.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (req.user.role !== 'admin' && order.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  res.json(order);
});

// PUT /api/orders/:id/status  (admin only)
app.put('/api/orders/:id/status', authMiddleware, adminOnly, (req, res) => {
  const { status } = req.body;
  const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const db = readDB();
  const order = db.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  order.status = status;
  order.updatedAt = new Date().toISOString();
  logActivity(db, `Order ${order.id} → ${status}`);
  writeDB(db);
  res.json(order);
});

// ═══════════════════════════════════════════════════════════════
//  PART REQUESTS (unlisted parts)
// ═══════════════════════════════════════════════════════════════

// POST /api/requests
app.post('/api/requests', upload.array('photos', 5), (req, res) => {
  const { brand, model, year, partName, category, urgency, budgetMin, budgetMax, desc, contactName, contactPhone, contactEmail, contactMethod } = req.body;
  if (!brand || !model || !partName || !contactName || !contactPhone) {
    return res.status(400).json({ error: 'brand, model, partName, contactName, contactPhone required' });
  }

  const db = readDB();
  const reqNum = String(db.partRequests.length + 1).padStart(4, '0');
  const photos = (req.files || []).map(f => `/uploads/requests/${f.filename}`);

  const request = {
    id: `REQ-${reqNum}`,
    brand, model, year: year || '',
    partName, category: category || '',
    urgency: urgency || 'flexible',
    budgetMin: budgetMin ? Number(budgetMin) : null,
    budgetMax: budgetMax ? Number(budgetMax) : null,
    desc: desc || '',
    contactName, contactPhone,
    contactEmail: contactEmail || '',
    contactMethod: contactMethod || 'WhatsApp',
    photos,
    status: 'Open',
    adminNote: '',
    createdAt: new Date().toISOString()
  };

  db.partRequests.push(request);
  logActivity(db, `Part request ${request.id}: ${partName} for ${brand} ${model}`);
  writeDB(db);
  res.status(201).json(request);
});

// GET /api/requests  (admin only)
app.get('/api/requests', authMiddleware, adminOnly, (req, res) => {
  const db = readDB();
  res.json(db.partRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

// PUT /api/requests/:id  (admin - update status/note)
app.put('/api/requests/:id', authMiddleware, adminOnly, (req, res) => {
  const db = readDB();
  const req2 = db.partRequests.find(r => r.id === req.params.id);
  if (!req2) return res.status(404).json({ error: 'Request not found' });
  if (req.body.status) req2.status = req.body.status;
  if (req.body.adminNote !== undefined) req2.adminNote = req.body.adminNote;
  req2.updatedAt = new Date().toISOString();
  writeDB(db);
  res.json(req2);
});

// ═══════════════════════════════════════════════════════════════
//  ADMIN — DASHBOARD & REPORTS
// ═══════════════════════════════════════════════════════════════

// GET /api/admin/dashboard
app.get('/api/admin/dashboard', authMiddleware, adminOnly, (req, res) => {
  const db = readDB();
  const revenue = db.orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + o.total, 0);
  const catBreakdown = {};
  db.parts.forEach(p => { catBreakdown[p.category] = (catBreakdown[p.category] || 0) + 1; });
  const lowStock = db.parts.filter(p => p.stock <= 1);

  res.json({
    stats: {
      totalParts: db.parts.length,
      totalStock: db.parts.reduce((s, p) => s + p.stock, 0),
      inventoryValue: db.parts.reduce((s, p) => s + p.price * p.stock, 0),
      totalOrders: db.orders.length,
      revenue,
      avgOrderValue: db.orders.length ? Math.round(revenue / db.orders.length) : 0,
      pendingOrders: db.orders.filter(o => o.status === 'Pending').length,
      openRequests: db.partRequests.filter(r => r.status === 'Open').length,
      totalCustomers: db.users.filter(u => u.role === 'customer').length
    },
    categoryBreakdown: catBreakdown,
    lowStock,
    recentActivity: db.activityLog.slice(0, 15),
    recentOrders: db.orders.slice(-5).reverse()
  });
});

// GET /api/admin/users  (admin)
app.get('/api/admin/users', authMiddleware, adminOnly, (req, res) => {
  const db = readDB();
  res.json(db.users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone, createdAt: u.createdAt })));
});

// GET /api/admin/promo-codes
app.get('/api/admin/promo-codes', authMiddleware, adminOnly, (req, res) => {
  const db = readDB();
  res.json(db.promoCodes);
});

// POST /api/admin/promo-codes
app.post('/api/admin/promo-codes', authMiddleware, adminOnly, (req, res) => {
  const { code, discount, type } = req.body;
  if (!code || !discount || !type) return res.status(400).json({ error: 'code, discount, type required' });
  const db = readDB();
  if (db.promoCodes.find(p => p.code === code.toUpperCase())) return res.status(409).json({ error: 'Code already exists' });
  const promo = { code: code.toUpperCase(), discount: Number(discount), type, active: true };
  db.promoCodes.push(promo);
  writeDB(db);
  res.status(201).json(promo);
});

// ═══════════════════════════════════════════════════════════════
//  HEALTH CHECK
// ═══════════════════════════════════════════════════════════════
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'AutoParts Yard API v1.0' });
});

// ─── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🔧 AutoParts Yard Backend running on http://localhost:${PORT}`);
  console.log(`📦 API endpoints ready at http://localhost:${PORT}/api`);
  console.log(`\nTest credentials (special characters enabled):`);
  console.log(`  Admin    → admin@autoparts.com / Admin@123!`);
  console.log(`  Customer → customer@test.com / Pass@456#`);
  console.log(`\n✅ Passwords support special characters: !@#$%^&*()_+-={}[]|:;<>?,./`);
});
