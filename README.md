# 🔧 Auto Repair Hub - Production-Grade Management System

A full-stack, secure, modular web application engineered for managing auto repair shop operations, vehicle fleets, mechanic assignments, inventory parts, financial analytics, and automated PDF invoicing.

---

## 🎨 Design System: Fidelity Modern

The application features a complete redesign aligning with the **Fidelity Modern** design system specifications (`design.md`) and the official brand emblem logo:

- **Brand Emblem Integration**: Centered brand emblem badge (`public/images/logo.png`) featuring the iconic mechanic gear silhouette, crossed wrenches, and glowing cap star integrated into the top-left header navigation and login splash screen.
- **Color Palette & Visual Tokens**:
  - **Surfaces**: Clean, high-legibility surfaces (`#fcf8f8`, `#ffffff`, `#f1edec`) and deep dark mode graphite surfaces (`#0d1117`, `#141a24`, `#1e2837`).
  - **Primary & Secondary**: Tech cobalt blue (`#0050d7` / `#2b69fa` / `#3b82f6`) for high-impact interactive controls, buttons, and navigation highlights.
  - **Tertiary & Accents**: High-contrast mechanic green (`#008918` / `#12ff39` / `#10b981`) for completed job statuses and subtle glowing accents.
- **Typography**: Complete typography hierarchy built on **Google Inter** (`headline-lg` 32px/40px, bold weights, readable numeric metrics).
- **Standards & Cross-Browser Compatibility**: Full support for standard properties (such as standard `background-clip: text` alongside `-webkit-background-clip: text` for gradient text) and dual-prefix backdrop filters.

---

## 🚀 Tech Stack

- **Backend**: Node.js, Express.js (MVC Architecture)
- **Database**: MariaDB / MySQL (`mysql2/promise` connection pool with transactions)
- **Authentication**: Dual-Token JWT (15m Access + 7d Refresh in `HttpOnly`, `SameSite=Strict` cookies) & `bcryptjs`
- **Frontend**: Modern Vanilla HTML5, Fidelity Modern Glassmorphism CSS (Google Inter font), JavaScript (Async/Fetch)
- **Analytics**: Chart.js Interactive Timeframe Visualizations matching the Fidelity Modern palette
- **PDF Generation**: PDFKit
- **Testing**: Jest, Supertest (39/39 tests passing across 7 test suites covering auth, RBAC, input validation, and business logic)

---

## 🛠 Features

- **🔐 Server-Side JWT Cookie Security**: `HttpOnly`, `SameSite=Strict` dual-token authentication with automatic token rotation, CSRF protection, and zero `localStorage` token exposure.
- **👥 Multi-Role User Access Control**: Granular UI rendering and backend authorization paths tailored for `Admin`, `Staff`, and `Mechanic` profiles.
- **📦 Automated Inventory Deduction & Restoration**: MySQL transactions automatically decrement stock when parts are assigned to a service job, block zero-stock assignments, and restore inventory upon job deletion or part unlinking.
- **📊 Standalone Financial Analytics**: Dedicated **📊 Analytics** module (`analytics.html`) with timeframe filters (`Today`, `This Week`, `This Month`, `This Year`, `All Time`), Parts vs. Labor revenue breakdown, and Chart.js trend curves.
- **📱 Responsive Navigation & Mobile Drawer**: Sticky top navigation bar across all pages with brand logo, `.hamburger-btn` toggle for mobile viewports, dark/light theme switching, and live user role badge.
- **⏱️ Automatic Idle Session Timeout**: 30-minute user inactivity tracker with a 2-minute countdown warning modal.
- **📄 Automated PDF Invoicing**: Streamed PDF invoices formatted with customer details, vehicle VINs, technician notes, and itemized material costs (`.btn-sm` action buttons).

---

## 📁 Directory Structure

```text
Auto_Repair_Hub/
├── database/
│   └── schema.sql              # Database creation & seed data migration script
├── public/                     # Static frontend web assets
│   ├── css/
│   │   └── style.css           # Fidelity Modern design system (Inter, tokens, dark mode)
│   ├── images/
│   │   ├── logo.png            # Transparent brand emblem logo
│   │   └── logo-raw.jpg        # High-res raw emblem badge
│   ├── js/
│   │   ├── api.js              # Centralized API fetch wrapper, mobile drawer & theme toggle
│   │   ├── idle.js             # 30-minute inactivity tracker & warning modal countdown
│   │   ├── modal.js            # Custom modal dialog helper
│   │   └── toast.js            # Toast notification helper
│   ├── favicon.ico             # Brand favicon icon
│   ├── login.html              # Authenticated splash login page
│   ├── index.html              # Operational Dashboard Overview
│   ├── analytics.html          # Financial Analytics & Chart.js Visualization
│   ├── customer.html           # Customer Management UI
│   ├── employee.html           # Employee Directory UI (Admin only)
│   ├── cars.html               # Vehicle Fleet Management UI
│   ├── services.html           # Service Jobs & PDF Invoice Management UI
│   ├── parts.html              # Inventory Parts Management UI
│   └── 404.html                # Custom Fidelity Modern 404 error page
├── src/                        # Modular backend code (MVC)
│   ├── config/
│   │   ├── database.js         # mysql2/promise pool connection
│   │   └── env.js              # Production fail-fast environment validator
│   ├── controllers/            # Business logic & SQL query handlers
│   │   ├── authController.js   # Dual-token cookie auth, bcrypt verification, refresh, & logout
│   │   ├── customerController.js
│   │   ├── employeeController.js
│   │   ├── carController.js
│   │   ├── serviceController.js # Transactional stock deduction & PDF invoices
│   │   ├── partController.js
│   │   └── dashboardController.js # Analytics & timeframe financial statistics
│   ├── middleware/             # Express middlewares
│   │   ├── authMiddleware.js   # Cookie token verification & requireRole RBAC
│   │   ├── errorMiddleware.js  # Centralized error handler, HTML 404, & SQL leakage protection
│   │   └── validationMiddleware.js # express-validator input sanitization & rules
│   ├── routes/                 # REST API endpoints
│   │   ├── authRoutes.js
│   │   ├── customerRoutes.js
│   │   ├── employeeRoutes.js
│   │   ├── carRoutes.js
│   │   ├── serviceRoutes.js
│   │   ├── partRoutes.js
│   │   └── dashboardRoutes.js
│   └── server.js               # Express application entry point (cookie-parser, CORS, Helmet)
├── tests/                      # Jest test suite (39/39 passing)
│   ├── database.test.js
│   ├── auth.test.js
│   ├── customer.test.js
│   ├── services.test.js
│   ├── cars.test.js
│   ├── parts.test.js
│   └── employee.test.js
├── design.md                   # Fidelity Modern design specifications
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
ALLOWED_ORIGINS=http://localhost:3000
```

### 4. Start the Application
Run the start command:

```bash
npm start
```

Open your browser and navigate to:
**[http://localhost:3000/login.html](http://localhost:3000/login.html)**

### Seeded Database Logins (Strict bcrypt verification, no backdoor bypass):
- **Admin**: Username `admin` | Password `Admin@123`
- **Staff**: Username `staff` | Password `Admin@123`
- **Mechanic**: Username `mechanic` | Password `Admin@123`

---

## 🧪 Running Automated Tests

To execute the Jest test suite:

```bash
npm test
```

---

## 📄 License
ISC License © Auto Repair Hub Team
