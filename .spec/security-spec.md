# Security Specification: Auto Repair Hub

## 1. Authentication & Cookie Session Security
- Dual-Token server-side JWT authentication (`jsonwebtoken`).
- **Access Token**: Short-lived 15-minute expiration in an `HttpOnly`, `SameSite=Strict` cookie (`access_token`).
- **Refresh Token**: 7-day expiration in an `HttpOnly`, `SameSite=Strict` cookie (`refresh_token`), with a server-side `RefreshToken` row keyed by JWT `jti`.
- Refresh tokens are rotated on every `POST /api/auth/refresh` (old `jti` revoked). Reuse of a revoked refresh token revokes all refresh tokens for that user.
- Logout revokes the presented refresh `jti` and clears auth cookies.
- Tokens are never accepted from query strings or returned in JSON response bodies. Auth is cookie-only.
- Password hashing uses `bcryptjs` with cost factor 12. Passwords are capped at 72 bytes.
- Seeded and newly registered users have `must_change_password=TRUE` and cannot use business APIs until they complete `POST /api/auth/change-password`.

## 2. CSRF Protection
- Double-submit CSRF: non-HttpOnly `csrf_token` cookie plus matching `X-CSRF-Token` request header.
- Enforced on `POST`, `PUT`, `DELETE`, and `PATCH` under the API. `SameSite=Strict` remains on auth cookies.
- The frontend (`public/js/api.js`) reads the CSRF cookie and sends the header on mutating requests.

## 3. API Endpoint Protection & Role-Based Access Control (RBAC)
- Protected routes enforce `verifyToken`, which reloads the user from the database and rejects missing/deleted users.
- Endpoint role authorization uses `requireRole([...])` / `requireAdmin`.
- `POST /api/auth/register` is admin-only (`verifyToken` + `requireAdmin`). Allowed roles: `admin`, `staff`, `mechanic` (no `customer`).
- Client-side navigation hides unauthorized UI; authorization is always enforced on the server.

## 4. Rate Limiting & Lockout
- Global limiter on `/api` (300 requests / 15 minutes / IP).
- Stricter limiters on `/api/auth/login`, `/api/auth/refresh`, and `/api/auth/register`.
- Per-username login lockout/backoff after repeated failed attempts (in-memory).
- `trust proxy` is controlled by the `TRUST_PROXY` environment variable.

## 5. Secrets & Environment
- `JWT_SECRET` and `JWT_REFRESH_SECRET` are required in all modes except `NODE_ENV=test` (test-only values set in Jest setup).
- No hardcoded JWT fallback secrets. Database credentials have no `root`/`root` defaults outside test.
- Cookie `secure` is driven by `COOKIE_SECURE`. CORS allows only origins listed in `ALLOWED_ORIGINS` (same-origin browser requests need no CORS).

## 6. Session Inactivity Security
- Automated 30-minute inactivity tracker (`idle.js`) monitoring mouse, keyboard, scroll, and touch events.
- 2-minute countdown warning modal at the 28-minute mark prompting session refresh or immediate logout.

## 7. Database & Input Security
- Parameterized SQL queries via `mysql2/promise` (`?` placeholders).
- Connection credentials managed via `.env` environment variables.
- HTML escaping on user input before DOM rendering to prevent XSS.
- Centralized error middleware: responses with status ≥ 500 return a generic `Internal Server Error` message; details are logged server-side only.

Refresh rotation locks the user and token rows in a transaction. Password changes revoke existing refresh sessions and issue replacement cookies. Frontend requests share one refresh operation. COOKIE_SECURE defaults to true.

Mechanics require an active employee link. Reads and writes include the employee assignment predicate in SQL; only status/description can change. Financial/contact fields and management endpoints are excluded. Employee links are administered by admins, with a database unique constraint.


## Frontend policy and accessible shared components
Helmet emits a self-only CSP for scripts, styles, fonts, images, and connections. Inline script/style attributes and objects are prohibited. All page code/styles are external, with build-time Tailwind and locally hosted fonts/Chart.js. Shared escaping handles all five HTML metacharacters; modal confirmation text is escaped. The shared guard waits for the server profile and redirects before rendering unauthorized pages. Dialog focus trapping/restoration and polite toast announcements are implemented; browser behavior still requires manual verification.

## Operational limits
Username lockouts and IP limiters are in-memory and reset on restart; deployments with multiple processes do not share those counters. Refresh revocation is durable in the database. Existing access tokens last up to 15 minutes after logout/password change; every protected request reloads current user role and password-change requirements. No stack trace is returned to clients, including in development. COOKIE_SECURE=false is intended only for localhost HTTP; HTTPS deployments must use true. TRUST_PROXY=true trusts one proxy hop and requires a correctly isolated proxy deployment.
