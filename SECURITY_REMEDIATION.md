# Security remediation checklist

All four implementation phases are delivered. Browser-dependent acceptance checks remain outstanding, as requested; no browser dependency was added.

## Verification evidence

- Final Jest/Supertest result: 116 tests passed across 11 suites.
- `npm run build`: passed; generated Tailwind CSS is committed with source/configuration.
- Disposable local MariaDB checks: migration can run twice without losing fixture/account records; concurrent refresh allows one rotation and replay revokes the replacement; password change issues a replacement session; mechanic reads/updates enforce employee assignments. The disposable database is removed after each run.
- Static checks cover external scripts/styles, no inline event attributes, local page asset existence, strict CSP headers, and five-character HTML escaping.
- Browser console CSP, keyboard interactions and 360px/768px/1280px visual checks: unverified. User declined adding browser tooling.
- Existing application database was not migrated or reset. Run `npm run migrate` before starting the upgraded application.

## Requested issues

| Issue | Status | Implemented behavior / remaining verification | Evidence |
| --- | --- | --- | --- |
| 1.1 | Fixed | Admin-only registration and allowed roles | [src/routes/authRoutes.js:14](src/routes/authRoutes.js#L14); [src/config/env.js:63](src/config/env.js#L63) |
| 1.2 | Fixed | No login presets/password hints; password whitespace preserved; mandatory change enforced | [public/js/login.js:35](public/js/login.js#L35); [src/middleware/authMiddleware.js:63](src/middleware/authMiddleware.js#L63); [database/seed.js:8](database/seed.js#L8) |
| 1.3 | Fixed | Required environment secrets, explicit secure-cookie flag, origins and proxy configuration | [src/config/env.js:20](src/config/env.js#L20); [src/server.js:44](src/server.js#L44); [.env.example:12](.env.example#L12) |
| 1.4 | Fixed | Durable, transactional refresh rotation/replay revocation and current user lookup | [src/controllers/authController.js:150](src/controllers/authController.js#L150); [src/middleware/authMiddleware.js:9](src/middleware/authMiddleware.js#L9); [database/migrations/001-auth.sql:3](database/migrations/001-auth.sql#L3) |
| 1.5 | Fixed | Cookie-only tokens; query tokens rejected; no token JSON | [src/middleware/authMiddleware.js:35](src/middleware/authMiddleware.js#L35); [src/controllers/authController.js:68](src/controllers/authController.js#L68) |
| 1.6 | Fixed | Generic 5xx responses; diagnostics remain server-side | [src/middleware/errorMiddleware.js:3](src/middleware/errorMiddleware.js#L3) |
| 1.7 | Fixed | API/auth/password-change limiters, proxy flag and username backoff | [src/server.js:99](src/server.js#L99); [src/middleware/loginLockout.js:34](src/middleware/loginLockout.js#L34) |
| 1.8 | Fixed | Double-submit CSRF enforced and sent by API wrapper | [src/middleware/csrfMiddleware.js:14](src/middleware/csrfMiddleware.js#L14); [public/js/api.js:122](public/js/api.js#L122) |
| 2.1 | Fixed | Linked active employees; assigned-job SQL scope; restricted fields and APIs | [src/controllers/serviceController.js:9](src/controllers/serviceController.js#L9); [src/controllers/authController.js:333](src/controllers/authController.js#L333); [tests/mechanic.test.js:9](tests/mechanic.test.js#L9) |
| 2.2 | Fixed | Legacy redirects removed; endpoints return 404 | [src/server.js:124](src/server.js#L124); [tests/session-security.test.js:82](tests/session-security.test.js#L82) |
| 2.3 | Fixed | Controller SQL audited; values bound, fixed sorts and validated filters | [src/middleware/validationMiddleware.js:327](src/middleware/validationMiddleware.js#L327); [src/controllers/dashboardController.js:7](src/controllers/dashboardController.js#L7) |
| 2.4 | Fixed | Exact Chart.js 4.4.8 served locally | [public/analytics.html:11](public/analytics.html#L11); [public/vendor/Chart-LICENSE.md:1](public/vendor/Chart-LICENSE.md#L1) |
| 2.5 | Fixed | Bcrypt 12 and 72-byte password limits | [src/config/env.js:62](src/config/env.js#L62); [src/middleware/validationMiddleware.js:265](src/middleware/validationMiddleware.js#L265); [tests/config-security.test.js:6](tests/config-security.test.js#L6) |
| 3.1 | Fixed | One escaping helper, escaped confirmations/statuses and one toast system | [public/js/common.js:2](public/js/common.js#L2); [public/js/modal.js:30](public/js/modal.js#L30); [public/js/index.js:105](public/js/index.js#L105) |
| 3.2 | Fixed | Shared role-aware sidebar/header/mobile navigation | [public/js/layout.js:1](public/js/layout.js#L1) |
| 3.3 | Fixed | External page scripts/styles and delegated events; no inline handlers | [public/js/services.js:7](public/js/services.js#L7); [tests/frontend-security.test.js:23](tests/frontend-security.test.js#L23) |
| 3.4 | Partially fixed | Self-only CSP enabled; browser-console verification outstanding | [src/server.js:29](src/server.js#L29); [tests/frontend-security.test.js:14](tests/frontend-security.test.js#L14) |
| 3.5 | Fixed | Pinned build-time Tailwind and local Inter/Material Symbols with licenses | [package.json:12](package.json#L12); [public/css/fonts.css:2](public/css/fonts.css#L2); [public/fonts/symbols-subset.txt:1](public/fonts/symbols-subset.txt#L1) |
| 3.6 | Fixed | 10,440-byte WebP, source image removals, deduplicated fonts and static cache policy | [public/js/layout.js:14](public/js/layout.js#L14); [src/server.js:69](src/server.js#L69) |
| 3.7 | Fixed | Protected content waits for authoritative authentication and role redirects | [public/js/api.js:40](public/js/api.js#L40); [public/css/style.css:1127](public/css/style.css#L1127) |
| 4.1 | Fixed | Dialog focus trap/restoration/titles/Escape; polite toast region | [public/js/common.js:6](public/js/common.js#L6); [public/js/modal.js:11](public/js/modal.js#L11); [public/js/toast.js:8](public/js/toast.js#L8) |
| 4.2 | Fixed | Table semantics, icon labels and global visible focus styles | [public/customer.html:214](public/customer.html#L214); [public/css/style.css:1130](public/css/style.css#L1130); [public/js/customer.js:129](public/js/customer.js#L129) |
| 4.3 | Fixed | Shared loading, empty, error and retry states across management lists | [public/js/common.js:35](public/js/common.js#L35); [public/js/services.js:130](public/js/services.js#L130) |
| 4.4 | Fixed | Brand-token idle warning; unused remember checkbox removed | [public/js/idle.js:23](public/js/idle.js#L23); [public/css/style.css:1164](public/css/style.css#L1164); [public/login.html:47](public/login.html#L47) |
| 4.5 | Partially fixed | Responsive constraints and table scrolling implemented; actual viewport verification outstanding | [public/css/style.css:1158](public/css/style.css#L1158); [public/services.html:266](public/services.html#L266) |

## SQL audit findings

Reviewed every query in auth, customer, car, employee, part, service and dashboard controllers. Request values use placeholders. Search wildcards are values, pagination is bounded and parameterized, and sort clauses are fixed server constants. Dashboard date fragments are selected from server-owned literals, not concatenated request text. Mechanic SQL projections/predicates are selected from the database-backed role and employee identity.

No raw user-controlled SQL fragment was found. Missing query validation and a `Cancelled` validator/database mismatch were corrected. Custom sort input is rejected because no selectable sort API is implemented. All new account/employee lookups use placeholders; the employee link is unique in the database. Migration/verification database identifiers are internal/configured identifiers rather than request input.

## Deployment and operational notes

- Back up existing data and run `npm run migrate`; do not use the destructive demo seed workflow for upgrades. Existing mechanics remain unlinked until an admin assigns an active employee through the documented endpoint.
- Set real JWT secrets, database credentials and allowed origins. Secure cookies default to true; localhost HTTP development explicitly sets COOKIE_SECURE=false. TRUST_PROXY=true trusts one proxy hop.
- Seed usernames are admin/staff/mechanic. There are no built-in passwords: SEED_PASSWORD is chosen locally and must be changed after login. Numeric IDs are database-assigned.
- Limiters and username lockouts are process-local. Refresh revocation persists in MariaDB. Previously issued access cookies may remain usable for their remaining 15-minute lifetime after logout/password change; user deletion, role changes and forced-password requirements are checked against the database on every request.
- No browser checks are claimed. The CSP is enabled and statically tested, but console behavior, font rendering, chart rendering, focus behavior and viewport overflow need a browser pass.

## UI follow-up

Full-viewport blue/green backgrounds now apply to every page. Active navigation has solid foreground/background contrast. Desktop navigation collapses to a logo/icon rail and expands on hover or keyboard focus. Password fields have independent visibility controls; table actions, refresh, theme, and logout controls use shared Fidelity Modern styles. Revised asset URLs replace stale cached UI; the new HTML/CSS/JS revalidation policy takes effect when the server restarts.

## Changed files

- [.env.example](.env.example)
- [.spec/api-spec.md](.spec/api-spec.md)
- [.spec/architecture-spec.md](.spec/architecture-spec.md)
- [.spec/database-spec.md](.spec/database-spec.md)
- [.spec/product-spec.md](.spec/product-spec.md)
- [.spec/security-spec.md](.spec/security-spec.md)
- [.spec/testing-spec.md](.spec/testing-spec.md)
- [README.md](README.md)
- [SECURITY_REMEDIATION.md](SECURITY_REMEDIATION.md)
- [database/migrate.js](database/migrate.js)
- [database/migrations/001-auth.sql](database/migrations/001-auth.sql)
- [database/schema.sql](database/schema.sql)
- [database/seed.js](database/seed.js)
- [package-lock.json](package-lock.json)
- [package.json](package.json)
- [public/404.html](public/404.html)
- [public/analytics.html](public/analytics.html)
- [public/cars.html](public/cars.html)
- [public/css/extracted.css](public/css/extracted.css)
- [public/css/fonts.css](public/css/fonts.css)
- [public/css/password-change.css](public/css/password-change.css)
- [public/css/style.css](public/css/style.css)
- [public/css/tailwind-input.css](public/css/tailwind-input.css)
- [public/css/tailwind.css](public/css/tailwind.css)
- [public/css/ui.css](public/css/ui.css)
- [public/customer.html](public/customer.html)
- [public/employee.html](public/employee.html)
- [public/fonts/Inter-OFL.txt](public/fonts/Inter-OFL.txt)
- [public/fonts/Material-Symbols-LICENSE.txt](public/fonts/Material-Symbols-LICENSE.txt)
- [public/fonts/inter-1.woff2](public/fonts/inter-1.woff2)
- [public/fonts/inter-2.woff2](public/fonts/inter-2.woff2)
- [public/fonts/inter-3.woff2](public/fonts/inter-3.woff2)
- [public/fonts/inter-4.woff2](public/fonts/inter-4.woff2)
- [public/fonts/inter-5.woff2](public/fonts/inter-5.woff2)
- [public/fonts/inter-6.woff2](public/fonts/inter-6.woff2)
- [public/fonts/inter-7.woff2](public/fonts/inter-7.woff2)
- [public/fonts/symbols-1.ttf](public/fonts/symbols-1.ttf)
- [public/fonts/symbols-subset.txt](public/fonts/symbols-subset.txt)
- [public/images/logo-raw.jpg](public/images/logo-raw.jpg) (removed)
- [public/images/logo.webp](public/images/logo.webp)
- [public/images/logo_cropped.png](public/images/logo_cropped.png) (removed)
- [public/index.html](public/index.html)
- [public/js/404.js](public/js/404.js)
- [public/js/analytics.js](public/js/analytics.js)
- [public/js/api.js](public/js/api.js)
- [public/js/cars.js](public/js/cars.js)
- [public/js/common.js](public/js/common.js)
- [public/js/customer.js](public/js/customer.js)
- [public/js/employee.js](public/js/employee.js)
- [public/js/idle.js](public/js/idle.js)
- [public/js/index.js](public/js/index.js)
- [public/js/layout.js](public/js/layout.js)
- [public/js/login.js](public/js/login.js)
- [public/js/modal.js](public/js/modal.js)
- [public/js/parts.js](public/js/parts.js)
- [public/js/services.js](public/js/services.js)
- [public/js/theme.js](public/js/theme.js)
- [public/js/toast.js](public/js/toast.js)
- [public/login.html](public/login.html)
- [public/parts.html](public/parts.html)
- [public/services.html](public/services.html)
- [public/vendor/Chart-LICENSE.md](public/vendor/Chart-LICENSE.md)
- [public/vendor/chart-4.4.8.umd.min.js](public/vendor/chart-4.4.8.umd.min.js)
- [scripts/verify-local-database.js](scripts/verify-local-database.js)
- [src/config/env.js](src/config/env.js)
- [src/controllers/authController.js](src/controllers/authController.js)
- [src/controllers/serviceController.js](src/controllers/serviceController.js)
- [src/middleware/authMiddleware.js](src/middleware/authMiddleware.js)
- [src/middleware/errorMiddleware.js](src/middleware/errorMiddleware.js)
- [src/middleware/validationMiddleware.js](src/middleware/validationMiddleware.js)
- [src/routes/authRoutes.js](src/routes/authRoutes.js)
- [src/routes/carRoutes.js](src/routes/carRoutes.js)
- [src/routes/customerRoutes.js](src/routes/customerRoutes.js)
- [src/routes/dashboardRoutes.js](src/routes/dashboardRoutes.js)
- [src/routes/employeeRoutes.js](src/routes/employeeRoutes.js)
- [src/routes/partRoutes.js](src/routes/partRoutes.js)
- [src/routes/serviceRoutes.js](src/routes/serviceRoutes.js)
- [src/server.js](src/server.js)
- [tailwind.config.js](tailwind.config.js)
- [tests/auth.test.js](tests/auth.test.js)
- [tests/config-security.test.js](tests/config-security.test.js)
- [tests/frontend-security.test.js](tests/frontend-security.test.js)
- [tests/helpers.js](tests/helpers.js)
- [tests/mechanic.test.js](tests/mechanic.test.js)
- [tests/services.test.js](tests/services.test.js)
- [tests/session-security.test.js](tests/session-security.test.js)
