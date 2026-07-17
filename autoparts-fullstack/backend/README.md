# AutoParts Yard — Backend API

A complete Node.js/Express REST API backend for the AutoParts Yard car scrapyard shopping platform.

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start the server
node server.js

# API base URL
https://autoparts-api-q317.onrender.com/api
```

---

## 🔑 Test Credentials

| Role     | Email                   | Password   |
|----------|-------------------------|------------|
| Admin    | admin@autoparts.com     | Admin@123! |
| Customer | customer@test.com       | Pass@456#  |

---

## 🗄️ Database

Uses a **JSON flat-file database** (`data/db.json`) — no setup required. Automatically created on first run with seed data.

Uploaded images are stored in:
- `uploads/parts/` — part images (admin uploaded)
- `uploads/requests/` — customer reference photos

---

## 📡 API Reference

All protected routes require:
```
Authorization: Bearer <token>
```

---

### AUTH

| Method | Endpoint            | Auth     | Description              |
|--------|---------------------|----------|--------------------------|
| POST   | /api/auth/register  | None     | Register new customer    |
| POST   | /api/auth/login     | None     | Login (returns JWT)      |
| GET    | /api/auth/me        | Customer | Get logged-in user info  |

**Register body:**
```json
{ "name": "Ravi Kumar", "email": "ravi@email.com", "password": "mypass", "phone": "+91 9876543210" }
```

**Login body:**
```json
{ "email": "admin@autoparts.com", "password": "Admin@123!" }
```

**Login response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "u1", "name": "Admin User", "email": "admin@autoparts.com", "role": "admin" }
}
```

---

### PARTS (Spare Parts Inventory)

| Method | Endpoint                   | Auth      | Description                    |
|--------|----------------------------|-----------|--------------------------------|
| GET    | /api/parts                 | None      | List/search parts              |
| GET    | /api/parts/meta            | None      | Get brands, categories, maxPrice|
| GET    | /api/parts/:id             | None      | Get single part                |
| POST   | /api/parts                 | Admin     | Add new part                   |
| PUT    | /api/parts/:id             | Admin     | Update part details            |
| DELETE | /api/parts/:id             | Admin     | Delete part                    |
| POST   | /api/parts/:id/images      | Admin     | Upload images (multipart)      |
| DELETE | /api/parts/:id/images      | Admin     | Remove image URL from part     |

**GET /api/parts — Query Parameters:**
```
?q=swift           → full-text search
?brand=Hyundai
?category=Engine
?condition=Good,New
?minPrice=500
?maxPrice=10000
?sort=price_asc | price_desc | name | rating
?rating=4          → minimum rating
```

**POST /api/parts body:**
```json
{
  "name": "Front Bumper Assembly",
  "brand": "Maruti Suzuki",
  "model": "Swift",
  "year": "2018-2022",
  "category": "Body",
  "condition": "Good",
  "price": 2800,
  "stock": 2,
  "desc": "Minor scuffs only",
  "icon": "🚗"
}
```

---

### ORDERS

| Method | Endpoint                     | Auth      | Description                   |
|--------|------------------------------|-----------|-------------------------------|
| POST   | /api/orders/validate-promo   | None      | Validate promo code           |
| POST   | /api/orders                  | Customer  | Place a new order             |
| GET    | /api/orders                  | Customer  | My orders / Admin: all orders |
| GET    | /api/orders/:id              | Customer  | Get order details             |
| PUT    | /api/orders/:id/status       | Admin     | Update order status           |

**POST /api/orders body:**
```json
{
  "items": [
    { "partId": "p1", "qty": 1 }
  ],
  "address": "42, Anna Nagar, Chennai - 600040",
  "paymentMethod": "UPI",
  "promoCode": "YARD10"
}
```

**Order statuses:** Pending → Processing → Shipped → Delivered | Cancelled

---

### PART REQUESTS (Unlisted parts)

| Method | Endpoint          | Auth    | Description                        |
|--------|-------------------|---------|------------------------------------|
| POST   | /api/requests     | None    | Submit a part request (multipart)  |
| GET    | /api/requests     | Admin   | List all part requests             |
| PUT    | /api/requests/:id | Admin   | Update status / add admin note     |

**POST /api/requests (multipart/form-data):**
```
brand, model, year, partName, category, urgency (flexible/soon/urgent),
budgetMin, budgetMax, desc, contactName, contactPhone, contactEmail,
contactMethod (WhatsApp/Phone call/Email), photos[] (files)
```

---

### ADMIN

| Method | Endpoint                | Auth  | Description                        |
|--------|-------------------------|-------|------------------------------------|
| GET    | /api/admin/dashboard    | Admin | Stats, low stock, activity log     |
| GET    | /api/admin/users        | Admin | All registered users               |
| GET    | /api/admin/promo-codes  | Admin | List promo codes                   |
| POST   | /api/admin/promo-codes  | Admin | Create new promo code              |

**Dashboard response includes:**
- Total parts, stock, inventory value
- Total orders, revenue, avg order value
- Pending orders, open requests, customer count
- Category breakdown chart data
- Low stock alerts (stock ≤ 1)
- Recent activity log (last 15)

---

### HEALTH

```
GET /api/health → { status: "ok", timestamp: "...", service: "AutoParts Yard API v1.0" }
```

---

## 🏗️ Project Structure

```
autoparts-backend/
├── server.js          ← Main Express app (all routes)
├── package.json
├── data/
│   └── db.json        ← Auto-created JSON database
├── uploads/
│   ├── parts/         ← Admin-uploaded part images
│   └── requests/      ← Customer reference photos
└── public/            ← Static files (optional frontend build)
```

---

## 🔧 Tech Stack

| Layer        | Technology                       |
|--------------|----------------------------------|
| Runtime      | Node.js                          |
| Framework    | Express.js                       |
| Auth         | JWT (jsonwebtoken) + bcryptjs    |
| Database     | JSON flat-file (db.json)         |
| File uploads | Multer (local disk)              |
| IDs          | UUID v4                          |

---

## 🚢 Deploying to Production

To deploy on a real server (e.g. Railway, Render, VPS):

1. Replace JSON flat-file DB with **MongoDB** or **PostgreSQL**
2. Replace local `uploads/` with **AWS S3** or **Cloudinary**
3. Set `JWT_SECRET` as an environment variable (don't hardcode)
4. Add **rate limiting** (`express-rate-limit`)
5. Add **helmet** for HTTP security headers
6. Use **PM2** to keep the server alive

---

## 📦 Promo Codes (pre-loaded)

| Code    | Discount      |
|---------|---------------|
| YARD10  | 10% off       |
| FIRST20 | 20% off       |
| FLAT500 | ₹500 flat off |
