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
