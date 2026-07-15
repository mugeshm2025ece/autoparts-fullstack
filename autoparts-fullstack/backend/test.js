/**
 * test.js — runs against the dev server (server.js, port 3000)
 * Start the server first: node server.js
 * Then in another terminal: node test.js
 *
 * Or run both together:
 *   node server.js &  sleep 1  &&  node test.js
 */

const http = require('http');

const BASE = 'https://autoparts-api-q317.onrender.com/api/parts';
let adminToken = '';
let customerToken = '';
let createdPartId = '';
let createdOrderId = '';
let createdRequestId = '';
let passed = 0;
let failed = 0;

// ─── HTTP helper ─────────────────────────────────────────────
function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const r = http.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

// ─── Assert helper ────────────────────────────────────────────
function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

// ─── Test suites ─────────────────────────────────────────────
async function testHealth() {
  console.log('\n📡 Health Check');
  const r = await req('GET', '/api/health');
  assert('GET /api/health returns 200', r.status === 200);
  assert('status is ok', r.body.status === 'ok');
  assert('service name present', !!r.body.service);
}

async function testAuth() {
  console.log('\n🔐 Auth Routes');

  // Admin login
  let r = await req('POST', '/api/auth/login', { email: 'admin@autoparts.com', password: 'Admin@123!' });
  assert('Admin login returns 200', r.status === 200, JSON.stringify(r.body));
  assert('Admin login returns token', !!r.body.token);
  assert('Admin role is admin', r.body.user?.role === 'admin');
  adminToken = r.body.token;

  // Customer login
  r = await req('POST', '/api/auth/login', { email: 'customer@test.com', password: 'Pass@456#' });
  assert('Customer login returns 200', r.status === 200);
  assert('Customer login returns token', !!r.body.token);
  assert('Customer role is customer', r.body.user?.role === 'customer');
  customerToken = r.body.token;

  // Wrong password
  r = await req('POST', '/api/auth/login', { email: 'admin@autoparts.com', password: 'wrongpass' });
  assert('Wrong password returns 401', r.status === 401);

  // Register new customer
  const uniq = Date.now();
  r = await req('POST', '/api/auth/register', { name: 'Test User', email: `test${uniq}@test.com`, password: 'pass123', phone: '+91 9999999999' });
  assert('Register new customer returns 201', r.status === 201);
  assert('Register returns token', !!r.body.token);

  // Duplicate register
  r = await req('POST', '/api/auth/register', { name: 'Test User', email: `test${uniq}@test.com`, password: 'pass123' });
  assert('Duplicate email returns 409', r.status === 409);

  // GET /me (authenticated)
  r = await req('GET', '/api/auth/me', null, adminToken);
  assert('GET /api/auth/me returns user', r.status === 200 && r.body.email === 'admin@autoparts.com');

  // GET /me (no token)
  r = await req('GET', '/api/auth/me', null, null);
  assert('GET /api/auth/me without token returns 401', r.status === 401);
}

async function testParts() {
  console.log('\n🔧 Parts Routes');

  // List all parts
  let r = await req('GET', '/api/parts');
  assert('GET /api/parts returns 200', r.status === 200);
  assert('Returns parts array', Array.isArray(r.body.parts));
  assert('Returns total count', typeof r.body.total === 'number');

  // Search
  r = await req('GET', '/api/parts?q=swift');
  assert('Search ?q=swift works', r.status === 200 && r.body.parts.length >= 0);

  // Filter by brand
  r = await req('GET', '/api/parts?brand=Hyundai');
  assert('Filter by brand works', r.status === 200);

  // Sort
  r = await req('GET', '/api/parts?sort=price_asc');
  assert('Sort price_asc works', r.status === 200);

  // Meta
  r = await req('GET', '/api/parts/meta');
  assert('GET /api/parts/meta returns 200', r.status === 200);
  assert('Meta has brands array', Array.isArray(r.body.brands));
  assert('Meta has categories array', Array.isArray(r.body.categories));
  assert('Meta has maxPrice', typeof r.body.maxPrice === 'number');

  // Admin creates a part
  r = await req('POST', '/api/parts', {
    name: 'Test Wiper Motor', brand: 'Test Brand', model: 'TestCar',
    year: '2020-2024', category: 'Electrical', condition: 'Good',
    price: 1500, stock: 2, desc: 'Works perfectly', icon: '⚡'
  }, adminToken);
  assert('Admin POST /api/parts returns 201', r.status === 201, JSON.stringify(r.body));
  assert('Created part has id', !!r.body.id || !!r.body._id);
  createdPartId = r.body.id || r.body._id;

  // Customer cannot create part
  r = await req('POST', '/api/parts', { name: 'Hack', brand: 'X', model: 'Y', price: 100 }, customerToken);
  assert('Customer POST /api/parts returns 403', r.status === 403);

  // Get single part
  if (createdPartId) {
    r = await req('GET', `/api/parts/${createdPartId}`);
    assert('GET /api/parts/:id returns 200', r.status === 200);
    assert('Part name matches', r.body.name === 'Test Wiper Motor');
  }

  // Admin update part
  if (createdPartId) {
    r = await req('PUT', `/api/parts/${createdPartId}`, { price: 1800, stock: 5 }, adminToken);
    assert('Admin PUT /api/parts/:id returns 200', r.status === 200);
    assert('Price updated to 1800', r.body.price === 1800);
  }
}

async function testPromo() {
  console.log('\n🎟️  Promo Code Routes');

  // Valid promo
  let r = await req('POST', '/api/orders/validate-promo', { code: 'YARD10', subtotal: 5000 });
  assert('Valid promo YARD10 returns 200', r.status === 200);
  assert('Promo discount is 500 (10% of 5000)', r.body.discount === 500);

  // Invalid promo
  r = await req('POST', '/api/orders/validate-promo', { code: 'FAKECODE', subtotal: 5000 });
  assert('Invalid promo returns 404', r.status === 404);
}

async function testOrders() {
  console.log('\n📦 Order Routes');

  // Need a valid part ID from the parts list
  const partsRes = await req('GET', '/api/parts?limit=1');
  const firstPart = partsRes.body.parts?.[0];

  if (!firstPart) {
    console.log('  ⚠️  No parts found, skipping order tests');
    return;
  }

  const partId = firstPart.id || firstPart._id;

  // Place order as customer
  let r = await req('POST', '/api/orders', {
    items: [{ partId, qty: 1 }],
    address: '42, Test Street, Chennai - 600001',
    paymentMethod: 'COD',
    promoCode: 'YARD10'
  }, customerToken);
  assert('Customer POST /api/orders returns 201', r.status === 201, JSON.stringify(r.body).slice(0, 200));
  assert('Order has orderNumber / id', !!(r.body.orderNumber || r.body.id));
  assert('Order total is computed', typeof r.body.total === 'number');
  assert('Discount applied', r.body.discount >= 0);
  createdOrderId = r.body.orderNumber || r.body.id;

  // Place order without auth
  r = await req('POST', '/api/orders', {
    items: [{ partId, qty: 1 }],
    address: 'Test',
    paymentMethod: 'COD'
  }, null);
  assert('Order without auth returns 401', r.status === 401);

  // Insufficient stock order
  r = await req('POST', '/api/orders', {
    items: [{ partId, qty: 9999 }],
    address: 'Test',
    paymentMethod: 'COD'
  }, customerToken);
  assert('Order with excessive qty returns 400', r.status === 400);

  // Get my orders
  r = await req('GET', '/api/orders', null, customerToken);
  assert('GET /api/orders returns orders array', r.status === 200 && Array.isArray(r.body));

  // Admin gets all orders
  r = await req('GET', '/api/orders', null, adminToken);
  assert('Admin GET /api/orders returns all orders', r.status === 200 && Array.isArray(r.body));

  // Admin updates order status
  if (createdOrderId) {
    r = await req('PUT', `/api/orders/${createdOrderId}/status`, { status: 'Processing', note: 'Started packing' }, adminToken);
    assert('Admin PUT order status returns 200', r.status === 200, JSON.stringify(r.body).slice(0,100));
    assert('Status updated to Processing', r.body.status === 'Processing');
  }
}

async function testRequests() {
  console.log('\n📋 Part Request Routes');

  // Submit a request (no auth needed)
  let r = await req('POST', '/api/requests', {
    brand: 'Maruti Suzuki', model: 'WagonR', year: '2021',
    partName: 'Left side mirror', category: 'Body', urgency: 'soon',
    budgetMin: 500, budgetMax: 1500,
    contactName: 'Ravi Kumar', contactPhone: '+91 9876543210',
    contactEmail: 'ravi@email.com', contactMethod: 'WhatsApp'
  });
  assert('POST /api/requests returns 201', r.status === 201, JSON.stringify(r.body).slice(0,200));
  assert('Request has requestNumber / id', !!(r.body.requestNumber || r.body.id));
  createdRequestId = r.body.id || r.body._id;

  // Missing required fields
  r = await req('POST', '/api/requests', { brand: 'Honda' });
  assert('Request with missing fields returns 400', r.status === 400);

  // Admin views requests
  r = await req('GET', '/api/requests', null, adminToken);
  assert('Admin GET /api/requests returns 200', r.status === 200);
  assert('Returns array of requests', Array.isArray(r.body));

  // Customer cannot view requests
  r = await req('GET', '/api/requests', null, customerToken);
  assert('Customer GET /api/requests returns 403', r.status === 403);

  // Admin updates request status
  if (createdRequestId) {
    r = await req('PUT', `/api/requests/${createdRequestId}`, {
      status: 'In Progress', adminNote: 'Checking our network', quotedPrice: 900
    }, adminToken);
    assert('Admin PUT /api/requests/:id returns 200', r.status === 200);
  }
}

async function testAdminDashboard() {
  console.log('\n📊 Admin Dashboard Routes');

  // Dashboard
  let r = await req('GET', '/api/admin/dashboard', null, adminToken);
  assert('GET /api/admin/dashboard returns 200', r.status === 200);
  assert('Dashboard has stats', !!r.body.stats);
  assert('Stats has totalParts', typeof r.body.stats?.totalParts === 'number');
  assert('Stats has revenue', typeof r.body.stats?.revenue === 'number');
  assert('Stats has totalOrders', typeof r.body.stats?.totalOrders === 'number');
  assert('Has lowStock array', Array.isArray(r.body.lowStock));
  assert('Has categoryBreakdown', Array.isArray(r.body.categoryBreakdown));
  assert('Has recentOrders', Array.isArray(r.body.recentOrders));

  // Customer cannot access dashboard
  r = await req('GET', '/api/admin/dashboard', null, customerToken);
  assert('Customer GET /api/admin/dashboard returns 403', r.status === 403);

  // Users list
  r = await req('GET', '/api/admin/users', null, adminToken);
  assert('Admin GET /api/admin/users returns 200', r.status === 200);
  assert('Returns users array', Array.isArray(r.body));
  assert('No passwords exposed', !JSON.stringify(r.body).includes('"password"'));
}

async function testCleanup() {
  console.log('\n🧹 Cleanup');
  // Admin deletes the test part
  if (createdPartId) {
    const r = await req('DELETE', `/api/parts/${createdPartId}`, null, adminToken);
    assert('Admin DELETE /api/parts/:id returns 200', r.status === 200);
  } else {
    console.log('  ⚠️  No test part to clean up');
  }
}

// ─── Run all tests ────────────────────────────────────────────
async function runAll() {
  console.log('═══════════════════════════════════════════════');
  console.log('  AutoParts Yard — Backend API Test Suite');
  console.log('═══════════════════════════════════════════════');

  try {
    await testHealth();
    await testAuth();
    await testParts();
    await testPromo();
    await testOrders();
    await testRequests();
    await testAdminDashboard();
    await testCleanup();
  } catch (err) {
    console.error('\n💥 Test runner crashed:', err.message);
    failed++;
  }

  const total = passed + failed;
  console.log('\n═══════════════════════════════════════════════');
  console.log(`  Results: ${passed}/${total} passed  |  ${failed} failed`);
  if (failed === 0) {
    console.log('  🎉 All tests passed!');
  } else {
    console.log('  ⚠️  Some tests failed — check output above');
  }
  console.log('═══════════════════════════════════════════════\n');
  process.exit(failed > 0 ? 1 : 0);
}

runAll();
