# ShopAdmin – Lab 5 (Exercises 2, 3 + Homework)

The Lab 4 ShopAdmin backend moved to **MongoDB + Mongoose** (Exercise 3 asks for the MongoDB Aggregation Framework)
and extended with:

| Part | What | Main files |
|---|---|---|
| Exercise 2 | Real-time product updates with Socket.IO (JWT handshake, `products` room), new-user broadcast to the `admins` room, reconnect handling | `socket.js`, `controllers/product.controller.js`, `controllers/auth.controller.js` |
| Exercise 3 | Daily inventory report per category (`$group` → `$lookup` → `$project` → `$sort`) and hourly auto-archive of out-of-stock products | `jobs/dailyInventoryReport.js`, `jobs/autoArchiveProducts.js` |
| Homework 1 | Orders: `POST /orders`, `GET /orders/mine`, `GET /orders` (admin), `PATCH /orders/:id/status` (admin) | `models/order.model.js`, `controllers/order.controller.js` |
| Homework 2 | Sign in with Google: `POST /auth/google { idToken }` verified with google-auth-library, find-or-create by email | `controllers/auth.controller.js` |
| Homework 3 | Live order status: `io.to('user:<id>').emit('orderStatusUpdated', …)` | `controllers/order.controller.js` |
| Homework 4 | Real emails through Gmail SMTP (order confirmation + status update) | `services/emailService.js` |
| Homework 5 | Daily revenue report of yesterday's completed orders at midnight | `jobs/dailyRevenueReport.js` |

```
lab5-shopadmin/
├── backend/
│   ├── config/db.js            MongoDB connection
│   ├── models/                 User, Category, Product (status active/archived), Order
│   ├── controllers/            auth, user, category, product, order
│   ├── middleware/             auth (protect/adminOnly), upload (Multer), validateObjectId, errorHandler
│   ├── routes/                 auth, user, category, product, order
│   ├── services/emailService.js
│   ├── jobs/                   dailyInventoryReport, autoArchiveProducts, dailyRevenueReport, index
│   ├── scripts/seed.js         demo data
│   ├── socket.js               Socket.IO + rooms
│   ├── .env.example
│   └── server.js               http.Server + Express + Socket.IO + cron
└── frontend/                   the provided ShopAdmin Web UI
```

## Setup

1. Install Node.js 18+ and MongoDB Community Server (local, `mongodb://127.0.0.1:27017`).
2. Backend:
   ```bash
   cd lab5-shopadmin/backend
   npm install
   cp .env.example .env     # then fill in JWT_SECRET, GOOGLE_CLIENT_ID, GMAIL_USER, GMAIL_APP_PASSWORD
   npm run seed             # optional demo data (categories, products, yesterday's orders)
   npm run dev              # or: npm start
   ```
3. Frontend: put the same Google Client ID in `frontend/config.js` → `GOOGLE_CLIENT_ID`, then open
   `frontend/index.html` with Live Server (`http://127.0.0.1:5500`).

### Google Client ID
Google Cloud Console → Google Auth Platform → Clients → Create client → *Web application*.
Authorized JavaScript origins: `http://127.0.0.1:5500`, `http://localhost:5500`, `http://localhost`. No redirect URI.

### Gmail App Password
Google Account → Security → 2-Step Verification (must be on) → App passwords → create one and put the
16 characters in `GMAIL_APP_PASSWORD`. Never commit `.env`.

### Testing the cron jobs
In `.env` set `INVENTORY_REPORT_CRON='* * * * *'`, `ARCHIVE_CRON='* * * * *'`, `ARCHIVE_AFTER_MINUTES=2`,
`REVENUE_REPORT_CRON='* * * * *'` and restart. Empty values = production schedules
(midnight, every hour / 24 h, midnight).

## API

Base URL `http://localhost:4000/api/v1` – JSON `{ success, message?, data? }`.

| Method | Endpoint | Access |
|---|---|---|
| POST | `/auth/register`, `/auth/login`, `/auth/google` | public |
| GET | `/auth/me` | logged in |
| PUT / POST | `/users/me`, `/users/me/avatar` | logged in |
| GET | `/categories`, `/products?categoryId=`, `/products/:id` | logged in |
| POST / PUT / DELETE | `/categories(/:id)`, `/products(/:id)` | admin |
| POST | `/orders` | logged in |
| GET | `/orders/mine` | logged in |
| GET | `/orders` | admin |
| PATCH | `/orders/:id/status` | admin |

### Socket.IO
Connect with `io('http://localhost:4000', { auth: { token } })`. Rooms: `user:<id>` (every user),
`admins` (admins only), `products` (joined with `products:join`). Events: `productUpdated`,
`newUserRegistered`, `orderStatusUpdated`.
