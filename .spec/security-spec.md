# Security Specification: Auto Repair Hub

## 1. Authentication & Cookie Session Security
- Dual-Token server-side JWT authentication (`jsonwebtoken`).
- **Access Token**: Short-lived 15-minute expiration.
- **Refresh Token**: 7-day expiration with token rotation and invalidation on logout.
- Tokens stored exclusively in **`HttpOnly`**, **`SameSite=Strict`** cookies to prevent XSS token theft. Zero tokens stored in `localStorage`.
- Password hashing using `bcryptjs` with salt rounds = 10.

## 2. API Endpoint Protection & Role-Based Access Control (RBAC)
- Protected routes enforce `verifyToken` Express middleware.
- Endpoint role authorization enforced via `requireRole(['admin'])`, `requireRole(['admin', 'staff'])` middleware.
- Client-side navigation & route protection dynamically hides unauthorized UI tabs and redirects unprivileged roles.

## 3. Session Inactivity Security
- Automated 30-minute inactivity tracker (`idle.js`) monitoring mouse, keyboard, scroll, and touch events.
- 2-minute countdown warning modal at the 28-minute mark prompting session refresh or immediate logout.

## 4. Database & Input Security
- 100% Parameterized SQL queries via `mysql2/promise` (`?` placeholders) preventing SQL Injection (SQLi).
- Connection credentials managed strictly via `.env` environment variables.
- HTML escaping on user input before DOM rendering to prevent Cross-Site Scripting (XSS).
- Centralized error middleware prevents raw database schema or stack trace leakage to clients.
