# 🔧 Auto Repair Hub - Production-Grade Management System

A full-stack, secure, modular web application engineered for managing auto repair shop operations, vehicle fleets, mechanic assignments, inventory parts, financial analytics, and automated PDF invoicing.

---

## 🎨 Design System: Fidelity Modern

The application features a complete redesign aligning with the **Fidelity Modern** design system specifications (`design.md`) and the official brand emblem logo:

- **Brand Emblem Integration**: Centered brand emblem badge (`public/images/logo.webp`) featuring the iconic mechanic gear silhouette, crossed wrenches, and glowing cap star integrated into the top-left header navigation and login splash screen.
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
- **Authentication**: Dual-Token JWT (15m Access + 7d Refresh in `HttpOnly`, `SameSite=Strict` cookies), server-side refresh revocation, double-submit CSRF, & `bcryptjs` (cost 12)
- **Frontend**: Modern Vanilla HTML5, Fidelity Modern Glassmorphism CSS (self-hosted Inter font), JavaScript (Async/Fetch)
- **Analytics**: Self-hosted Chart.js 4.4.8 interactive Timeframe Visualizations matching the Fidelity Modern palette
- **PDF Generation**: PDFKit
- **Testing**: Jest and Supertest covering authentication, RBAC, CSRF, refresh rotation, input validation, and business logic

---

## 🛠 Features

- **🔐 Server-Side JWT Cookie Security**: `HttpOnly`, `SameSite=Strict` dual-token authentication with DB-backed refresh rotation/revocation, double-submit CSRF (`csrf_token` cookie + `X-CSRF-Token` header), admin-only registration, forced password change for seeded users, and zero token exposure in JSON bodies or URLs.
- **👥 Multi-Role User Access Control**: Granular UI rendering and backend authorization paths tailored for `Admin`, `Staff`, and `Mechanic` profiles.
- **📦 Automated Inventory Deduction & Restoration**: MySQL transactions automatically decrement stock when parts are assigned to a service job, block zero-stock assignments, and restore inventory upon job deletion or part unlinking.
- **📊 Standalone Financial Analytics**: Dedicated **📊 Analytics** module (`analytics.html`) with timeframe filters (`Today`, `This Week`, `This Month`, `This Year`, `All Time`), Parts vs. Labor revenue breakdown, and Chart.js trend curves.
- **📱 Responsive Navigation & Mobile Drawer**: Sticky top navigation bar across all pages with brand logo, shared mobile navigation toggle for mobile viewports, dark/light theme switching, and live user role badge.
- **⏱️ Automatic Idle Session Timeout**: 30-minute user inactivity tracker with a 2-minute countdown warning modal.
- **📄 Automated PDF Invoicing**: Streamed PDF invoices formatted with customer details, vehicle VINs, technician notes, and itemized material costs (`.btn-sm` action buttons).

---

## 📁 Directory Structure

```text
Auto_Repair_Hub/
├── database/
│   └── schema.sql              # Destructive local demo setup; use migrate.js for upgrades
├── public/                     # Static frontend web assets
│   ├── css/
│   │   └── style.css           # Fidelity Modern design system (Inter, tokens, dark mode)
│   ├── images/
│   │   └── logo.webp           # 10 KB navigation emblem
│   ├── js/
│   │   ├── api.js              # Cookie/CSRF API wrapper with shared refresh operation
│   │   ├── common.js           # Shared escaping, dialog focus and list states
│   │   ├── layout.js           # Shared role-aware navigation and header
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
├── tests/                      # Jest and Supertest regression suites
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

### 2. Environment Setup
Copy `.env.example` to `.env` and fill in real values (JWT secrets, DB credentials, `SEED_PASSWORD`, `ALLOWED_ORIGINS`, `COOKIE_SECURE`, `TRUST_PROXY`). There are no default JWT secrets or `root`/`root` DB credentials outside test mode.

### 3. Fresh local demo setup (resets configured database)
With MariaDB/MySQL running and `.env` configured (including `SEED_PASSWORD`):

```bash
npm run seed
```

This applies `database/schema.sql` and creates `admin`, `staff`, and `mechanic` users. The seed password is never printed; those users must change password on first login (`must_change_password`).

### 4. Build CSS and start the application
```bash
npm run build
npm start
```

Open **[http://localhost:3000/login.html](http://localhost:3000/login.html)**.

---

## 🧪 Running Automated Tests

To execute the Jest test suite:

```bash
npm test
```

---

## 📄 License
ISC License © Auto Repair Hub Team

### Existing database upgrades
Run `npm run migrate` against the configured database before starting an upgraded server.
This preserves shop records; `npm run seed` resets the local demo database and must not be used for upgrades.
Cookies default to Secure; set `COOKIE_SECURE=false` only for local HTTP development.
Required password changes are enforced by the API, not just the login UI. Refresh rotation uses row locks and transactions; logout revocation errors are reported as generic server errors.

Admins can link existing accounts using `PUT /api/auth/users/:id/employee` with an `employee_id` (or null to unlink), through a cookie-authenticated, CSRF-protected request. Registration also accepts this optional field. Mechanics without a link cannot access jobs; linked mechanics only read assigned jobs and edit status/notes.


### Seeded accounts and initial passwords

| Username | Role | Initial password |
| --- | --- | --- |
| `admin` | Admin | The `SEED_PASSWORD` chosen in your local `.env` |
| `staff` | Staff | The `SEED_PASSWORD` chosen in your local `.env` |
| `mechanic` | Mechanic | The `SEED_PASSWORD` chosen in your local `.env` |

There are no built-in default passwords. Numeric user IDs are assigned by the database and may differ between installations. All three seeded accounts must replace the initial password on first login. After that, each account uses its own chosen password. To replace unknown development credentials, choose a new local `SEED_PASSWORD` and seed only if resetting the demo database is intended. Never put actual credentials in this README.

### Frontend assets and security

Run `npm ci` and `npm run build` after checkout or template/class changes. Tailwind CSS 3.4.17 runs only at build time; generated `public/css/tailwind.css` is committed. Inter, the required Material Symbols subset, and Chart.js 4.4.8 are served locally with license notices in `public/fonts/` and `public/vendor/`. Pages use external scripts/styles and a self-only Content-Security-Policy. Images and fonts cache for one day with validators; HTML, CSS, and JavaScript revalidate on each request.

The shared page guard resolves the server profile before showing protected content. Mechanics use assigned service jobs only; staff may fetch a salary-free technician list through `/api/services/technicians`. Account links are never taken from token claims or request bodies for authorization.

First-login password changes use a Fidelity Modern popup with Inter typography, theme-aware surfaces, cobalt actions, password requirements, inline errors, and a compact mobile layout. Keyboard focus starts in the current-password field; closing the required-change dialog logs out.

### Verification

`npm test` uses mocked database calls. For additional real database checks, run `RUN_LOCAL_DB_TESTS=1 node scripts/verify-local-database.js` with loopback database credentials able to create a database. This creates a randomly named disposable test database, verifies migration preservation/idempotence and concurrent refresh rotation/replay, and removes only that test database. It never resets the configured application database.

Browser checks at 360px, 768px, and 1280px, keyboard interaction, and browser-console CSP violations remain unverified in this environment; no browser dependency was added. See `SECURITY_REMEDIATION.md` for the issue checklist and verification evidence.


The shared blue/green ambient background fills the viewport on every page. Desktop navigation collapses to an icon/logo rail and expands on hover or keyboard focus; mobile retains the drawer and bottom navigation. Active page labels use solid cobalt backgrounds and white text. Table actions, theme controls, and logout use the Fidelity Modern button styles. Each password-change field has an independent, labelled show/hide control.
