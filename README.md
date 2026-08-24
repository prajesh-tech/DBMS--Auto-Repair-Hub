# 🔧 Auto Repair Hub - Production-Grade Management System

A full-stack, secure, modular web application engineered for managing auto repair shop operations, vehicle fleets, mechanic assignments, inventory parts, financial analytics, and automated PDF invoicing.

---

## 🚀 Tech Stack

- **Backend**: Node.js, Express.js (MVC Architecture)
- **Database**: MariaDB / MySQL (`mysql2/promise` connection pool with transactions)
- **Authentication**: Dual-Token JWT (15m Access + 7d Refresh in `HttpOnly`, `SameSite=Strict` cookies) & `bcryptjs`
- **Frontend**: Modern Vanilla HTML5, Glassmorphism CSS Design System (Google Inter font), JavaScript (Async/Fetch)
- **Analytics**: Chart.js Interactive Timeframe Visualizations
- **PDF Generation**: PDFKit
- **Testing**: Jest, Supertest (20/20 tests passing across 6 test suites)

---

## 🛠 Features

- **🔐 Server-Side JWT Cookie Security**: `HttpOnly`, `SameSite=Strict` dual-token authentication with automatic token rotation, CSRF protection, and zero `localStorage` token exposure.
- **👥 Multi-Role User Access Control**: Granular UI rendering and backend authorization paths tailored for `Admin`, `Staff`, and `Mechanic` profiles.
- **📦 Automated Inventory Deduction & Restoration**: MySQL transactions automatically decrement stock when parts are assigned to a service job, block zero-stock assignments, and restore inventory upon job deletion or part unlinking.
- **📊 Standalone Financial Analytics**: Dedicated **📊 Analytics** module (`analytics.html`) with timeframe filters (`Today`, `This Week`, `This Month`, `This Year`, `All Time`), Parts vs. Labor revenue breakdown, and Chart.js trend curves.
- **📱 Mobile-First Glassmorphism UI**: Frosted glass panels (`backdrop-filter: blur(20px)`), mobile hamburger drawer navigation, touch-optimized target sizes (`>= 44px`), and light/dark theme switching.
- **⏱️ Automatic Idle Session Timeout**: 30-minute user inactivity tracker with a 2-minute countdown warning modal.
- **📄 Automated PDF Invoicing**: Streamed PDF invoices formatted with customer details, vehicle VINs, technician notes, and itemized material costs.

---

## 📁 Directory Structure

```text
Auto_Repair_Hub/
├── database/
│   └── schema.sql              # Database creation & seed data migration script
├── public/                     # Static frontend web assets
│   ├── css/
│   │   └── style.css           # Glassmorphism design system (Google Inter, blurs, responsive drawer)
│   ├── js/
│   │   ├── api.js              # Centralized API fetch wrapper with cookie auth & role restrictions
│   │   ├── idle.js             # 30-minute inactivity tracker & warning modal countdown
│   │   ├── modal.js            # Custom modal dialog helper
│   │   └── toast.js            # Toast notification helper
│   ├── login.html              # Authenticated login page
│   ├── index.html              # Operational Dashboard Overview
│   ├── analytics.html          # Financial Analytics & Chart.js Visualization
│   ├── customer.html           # Customer Management UI
│   ├── employee.html           # Employee Directory UI (Admin only)
│   ├── cars.html               # Vehicle Fleet Management UI
│   ├── services.html           # Service Jobs & PDF Invoice Management UI
│   └── parts.html              # Inventory Parts Management UI
├── src/                        # Modular backend code (MVC)
│   ├── config/
│   │   └── database.js         # mysql2/promise pool connection
│   ├── controllers/            # Business logic & SQL query handlers
│   │   ├── authController.js   # Dual-token cookie auth, refresh, & logout
│   │   ├── customerController.js
│   │   ├── employeeController.js
│   │   ├── carController.js
│   │   ├── serviceController.js # Transactional stock deduction & PDF invoices
│   │   ├── partController.js
│   │   └── dashboardController.js # Analytics & timeframe financial statistics
│   ├── middleware/             # Express middlewares
│   │   ├── authMiddleware.js   # Cookie token verification & requireRole RBAC
│   │   ├── errorMiddleware.js  # Centralized error handler & SQL leakage protection
│   │   └── validationMiddleware.js
│   ├── routes/                 # REST API endpoints
│   │   ├── authRoutes.js
│   │   ├── customerRoutes.js
│   │   ├── employeeRoutes.js
│   │   ├── carRoutes.js
│   │   ├── serviceRoutes.js
│   │   ├── partRoutes.js
│   │   └── dashboardRoutes.js
│   └── server.js               # Express application entry point (cookie-parser, CORS, Helmet)
├── tests/                      # Jest test suite (100% pass rate)
│   ├── database.test.js
│   ├── auth.test.js
│   ├── customer.test.js
│   ├── services.test.js
│   ├── cars.test.js
│   └── parts.test.js
├── .spec/                      # SpecKit technical documentation
│   ├── product-spec.md
│   ├── architecture-spec.md
│   ├── database-spec.md
│   ├── api-spec.md
│   ├── security-spec.md
│   └── testing-spec.md
├── .env                        # Local environment configuration
├── .env.example                # Environment template
├── package.json
└── README.md
```

---

## ⚡ Quick Start & Installation

### 1. Prerequisites
- Node.js (v18+)
- MySQL or MariaDB Server running locally

### 2. Database Migration Setup
Log into MySQL / MariaDB and execute the schema script to create tables and seed default data:

```bash
mysql -u root -proot < database/schema.sql
```

### 3. Environment Setup
Verify `.env` configuration:

```env
PORT=3000
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=root
DB_NAME=auto_repair_hub
JWT_SECRET=auto_repair_hub_jwt_secret_key_2026_super_secure
JWT_REFRESH_SECRET=auto_repair_hub_jwt_refresh_secret_key_2026_super_secure
```

### 4. Start the Application
Run the start command:

```bash
npm start
```

Open your browser and navigate to:
**[http://localhost:3000/login.html](http://localhost:3000/login.html)**

### Default Profile Logins:
- **Admin**: Username `admin` | Password `1234`
- **Staff**: Username `staff` | Password `1234`
- **Mechanic**: Username `mechanic` | Password `1234`

---

## 🧪 Running Automated Tests

To execute the full Jest test suite across all 6 test files:

```bash
npm test
```

---

## 📄 License
ISC License © Auto Repair Hub Team
