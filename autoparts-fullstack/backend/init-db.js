// Script to initialize the database
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = './data/db.json';

function createInitialDB() {
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
    orders: [],
    partRequests: [],
    promoCodes: [
      { code: 'YARD10', discount: 10, type: 'percent', active: true },
      { code: 'FIRST20', discount: 20, type: 'percent', active: true },
      { code: 'FLAT500', discount: 500, type: 'flat', active: true }
    ],
    activityLog: []
  };

  // Ensure data directory exists
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
  console.log('✅ Database initialized with fresh data!');
  console.log('📁 File created at:', DB_PATH);
}

createInitialDB();