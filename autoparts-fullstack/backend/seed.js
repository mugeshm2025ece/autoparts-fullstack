/**
 * seed.js — populates MongoDB with initial data
 * Run: node seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Part = require('./models/Part');
const { PromoCode } = require('./models/PartRequest');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/autoparts';

const seedUsers = [
  { name: 'Admin User',    email: 'admin@autoparts.com', password: 'Admin@123!', role: 'admin',    phone: '+91 9000000000' },
  { name: 'Priya Shankar', email: 'customer@test.com',   password: 'pass123',  role: 'customer', phone: '+91 9876543210' },
];

const seedParts = [
  { name: 'Front Bumper Assembly', brand: 'Maruti Suzuki', model: 'Swift',    year: '2018-2022', category: 'Body',         condition: 'Good', price: 2800,  stock: 2, desc: 'Good condition, minor scuffs on lower edge', icon: '🚗', sku: 'MS-BO-001', rating: 4.2, numReviews: 14 },
  { name: 'Radiator',              brand: 'Hyundai',       model: 'i20',      year: '2016-2020', category: 'Engine',        condition: 'Good', price: 3500,  stock: 1, desc: 'No leaks, pressure tested',                icon: '⚙️', sku: 'HY-EN-002', rating: 4.5, numReviews: 9  },
  { name: 'Front Left Door',       brand: 'Toyota',        model: 'Innova',   year: '2015-2019', category: 'Body',         condition: 'Fair', price: 5500,  stock: 1, desc: 'Minor dents on lower panel, glass intact',   icon: '🚪', sku: 'TY-BO-003', rating: 3.8, numReviews: 5  },
  { name: 'Alternator 80A',        brand: 'Honda',         model: 'City',     year: '2017-2021', category: 'Electrical',   condition: 'Good', price: 4200,  stock: 3, desc: 'Output tested 14.2V — normal',              icon: '⚡', sku: 'HN-EL-004', rating: 4.7, numReviews: 22 },
  { name: 'Gearbox 5-Speed',       brand: 'Tata',          model: 'Nexon',    year: '2019-2023', category: 'Transmission', condition: 'Good', price: 18000, stock: 1, desc: 'Smooth shifting, no grinding or slipping',   icon: '🔧', sku: 'TA-TR-005', rating: 4.3, numReviews: 7  },
  { name: 'Headlight RHS',         brand: 'Maruti Suzuki', model: 'Baleno',   year: '2019-2023', category: 'Electrical',   condition: 'New',  price: 2200,  stock: 4, desc: 'Brand new old stock, unused',               icon: '💡', sku: 'MS-EL-006', rating: 4.9, numReviews: 31 },
  { name: 'AC Compressor',         brand: 'Hyundai',       model: 'Creta',    year: '2020-2023', category: 'AC',           condition: 'Good', price: 7500,  stock: 1, desc: 'Cooling tested OK, no noise',               icon: '❄️', sku: 'HY-AC-007', rating: 4.1, numReviews: 11 },
  { name: 'Brake Caliper Set',     brand: 'Maruti Suzuki', model: 'Ertiga',   year: '2018-2022', category: 'Brakes',       condition: 'Good', price: 1800,  stock: 3, desc: 'Piston moves freely, seals intact',          icon: '🛑', sku: 'MS-BR-008', rating: 4.6, numReviews: 18 },
  { name: 'Power Steering Pump',   brand: 'Toyota',        model: 'Fortuner', year: '2017-2022', category: 'Steering',     condition: 'Good', price: 6500,  stock: 2, desc: 'No leaks, full assist working',             icon: '🎯', sku: 'TY-ST-009', rating: 4.4, numReviews: 8  },
  { name: 'Fuel Tank',             brand: 'Honda',         model: 'Amaze',    year: '2018-2022', category: 'Fuel System',  condition: 'Good', price: 4800,  stock: 1, desc: 'Clean inside, no leaks',                    icon: '⛽', sku: 'HN-FS-010', rating: 4.0, numReviews: 6  },
  { name: 'Rear Axle Shaft',       brand: 'Mahindra',      model: 'Scorpio',  year: '2016-2021', category: 'Drivetrain',   condition: 'Fair', price: 9000,  stock: 1, desc: 'Surface rust only, shaft straight',         icon: '🔩', sku: 'MA-DR-011', rating: 3.6, numReviews: 4  },
  { name: 'Dashboard Assembly',    brand: 'Hyundai',       model: 'Venue',    year: '2019-2023', category: 'Interior',     condition: 'Good', price: 8500,  stock: 1, desc: 'All vents and clips intact',                icon: '📊', sku: 'HY-IN-012', rating: 4.2, numReviews: 3  },
];

const seedPromos = [
  { code: 'YARD10',  discount: 10,  type: 'percent', active: true },
  { code: 'FIRST20', discount: 20,  type: 'percent', active: true },
  { code: 'FLAT500', discount: 500, type: 'flat',    active: true, minOrder: 2000 },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB:', MONGO_URI);

  // Clear existing data
  await Promise.all([User.deleteMany(), Part.deleteMany(), PromoCode.deleteMany()]);
  console.log('🗑️  Cleared existing data');

  // Seed users
  for (const u of seedUsers) {
    await User.create(u);
  }
  console.log(`👤 Seeded ${seedUsers.length} users`);

  // Seed parts
  await Part.insertMany(seedParts);
  console.log(`🔧 Seeded ${seedParts.length} parts`);

  // Seed promo codes
  await PromoCode.insertMany(seedPromos);
  console.log(`🎟️  Seeded ${seedPromos.length} promo codes`);

  console.log('\n🎉 Database seeded successfully!\n');
  console.log('Test credentials:');
  console.log('  Admin    → admin@autoparts.com / Admin@123!');
  console.log('  Customer → customer@test.com   / pass123');
  process.exit(0);
}

seed().catch(err => { console.error('Seed error:', err); process.exit(1); });
