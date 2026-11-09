# Architecture Specification: Auto Repair Hub

## 1. High-Level Architecture Diagram
```
[ Browser UI (Glassmorphism CSS / JS API / Chart.js / Idle Tracker) ]
            │
      HTTP / REST API (HttpOnly Dual-Token Cookie Auth)
            │
            ▼
[ Express Server (src/server.js + cookie-parser + CORS + Helmet) ]
            │
  ┌─────────┴─────────┐
  ▼                   ▼
[ Middleware ]   [ MVC Controllers ]
 (JWT / RBAC /    (Customer, Car, Service, Part, Auth, Dashboard)
  Error Handle)       │
                      ▼
             [ MySQL2 Connection Pool & Transactions ]
                      │
                      ▼
             [ MariaDB / MySQL Database ]
```

## 2. Layer Separation
- **`public/`**: Static frontend web interface (Vanilla HTML5, Glassmorphism CSS design system in `style.css`, API client in `api.js`, idle timer in `idle.js`, Modals, Toast notifications, Chart.js analytics).
- **`src/config/`**: Database connection pool setup using `mysql2/promise`.
- **`src/middleware/`**: `HttpOnly` cookie token verification (`verifyToken`), role-based access control (`requireRole`), request validation, and centralized error handling.
- **`src/controllers/`**: Business logic, database query execution, SQL transaction handling (`BEGIN TRANSACTION`, `COMMIT`, `ROLLBACK`), analytics aggregations, and PDF invoice generation (`PDFKit`).
- **`src/routes/`**: RESTful routing mounts (`/api/customers`, `/api/cars`, `/api/services`, `/api/employees`, `/api/parts`, `/api/dashboard`, `/api/auth`).

## Frontend source and build
Pages contain semantic markup and external assets. `common.js` owns HTML escaping, focus handling and list states; `layout.js` renders shared navigation after the server-backed page guard succeeds. Page behavior lives in `public/js/<page>.js`. Tailwind 3.4.17 compiles to committed CSS with `npm run build`; Chart.js and fonts are self-hosted. Helmet enforces a self-only CSP, including no inline style or script attributes.

The login page loads `public/css/password-change.css` for the scoped Fidelity Modern password-change dialog. `API.showChangePasswordModal()` uses the shared modal's focus trap and close behavior, connects field hints to their inputs, and focuses the current-password input when opened.

The common `public/css/ui.css` owns the full-viewport ambient background, solid navigation states, shared action buttons, and hover/focus desktop sidebar. Desktop content reserves the collapsed rail width while expanded navigation overlays content. `API.showChangePasswordModal()` attaches independent visibility toggles to all three password fields. Unfingerprinted HTML/CSS/JS assets revalidate; shared asset URL revisions also invalidate older browser caches.
