# AGENTS.md

Guidance for AI coding agents working on **Auto Repair Hub**, a DBMS course project: an auto repair shop management system (customers, cars, employees, parts, service jobs, invoices, analytics).

Read this file first. For depth, see `README.md`, `design.md` and the specs in `.spec/` (`product`, `architecture`, `api`, `database`, `security`, `testing`). If a spec disagrees with the code, the code is the truth: fix the spec in the same change.

## Stack

- **Backend:** Node.js, Express 4, MySQL/MariaDB via `mysql2`, JWT auth in HttpOnly cookies, `bcryptjs`, `helmet`, `cors`, `express-rate-limit`, `express-validator`, `pdfkit` (invoices)
- **Frontend:** vanilla HTML + JS in `public/`, Tailwind, Chart.js on the analytics page, Material Symbols icons. No framework, no bundler.
- **Tests:** Jest + Supertest in `tests/`

## Commands

```bash
npm install
cp .env.example .env     # then fill in real values
mysql -u <user> -p < database/schema.sql
npm run seed             # creates demo users and data (dev only)
npm run dev              # nodemon on src/server.js
npm start                # production start
npm test                 # jest --detectOpenHandles --forceExit
```

Run `npm test` before declaring any task done. If tests need a database and none is available, say so instead of claiming they passed.

## Project layout

```
src/
  server.js              app setup: helmet, cors, rate limits, routes, static files
  config/env.js          environment loading and validation
  config/database.js     MySQL connection pool
  routes/*.js            one file per resource; attaches auth and role middleware
  controllers/*.js       request handlers and SQL
  middleware/
    authMiddleware.js    verifyToken, requireRole, requireAdmin
    validationMiddleware.js  express-validator rules
    errorMiddleware.js   central error handler
database/
  schema.sql             tables and constraints
  seed.js                demo data
public/
  *.html                 index (dashboard), login, customer, cars, employee, parts, services, analytics, 404
  js/                    api.js (fetch wrapper), idle.js, modal.js, toast.js
  css/style.css          shared styles and design tokens
tests/                   one test file per resource, plus auth and database
.spec/                   product, architecture, API, database, security and testing specs
```

A top-level `server.js` also exists. Check which entry point `package.json` uses (`src/server.js`) before editing server setup.

## Roles and permissions

Roles are `admin`, `staff` and `mechanic`.

- Every API route must have `verifyToken` and an explicit role check. Never add an unauthenticated route unless it is `/api/auth/login`.
- **Authorization is enforced on the server.** Hiding a button or page in the UI is never access control. When you restrict something in the UI, restrict it in the route too.
- Never trust a `role`, `user_id` or `employee_id` coming from the request body for authorization decisions. Take identity from the verified token and, where it matters, re-check the database.

## Security rules (non-negotiable)

1. **SQL:** always use `?` placeholders. Never concatenate user input into SQL. `ORDER BY` and `LIMIT` values must come from a whitelist or be validated integers.
2. **Secrets:** never hardcode JWT secrets, passwords or credentials. Read them from environment variables via `src/config/env.js`. Never commit `.env`. Do not add fallback secrets.
3. **Passwords:** hash with bcrypt, never log or return password hashes, never put default credentials in UI text, console output or docs.
4. **Tokens:** auth lives in HttpOnly, SameSite cookies. Do not accept tokens in URLs, do not return them in JSON bodies, do not store them in `localStorage` or `sessionStorage`.
5. **Registration:** account creation is admin-only. Never let a request choose its own privilege level.
6. **Errors:** do not send raw `err.message`, SQL errors or stack traces to clients on 5xx. Log details server-side.
7. **Input:** validate every body, query and param with `express-validator` rules in `validationMiddleware.js`. Reject unknown roles and statuses.
8. **XSS:** escape every dynamic value placed into HTML with the shared `escapeHTML` helper (escapes `& < > " '`). Prefer `textContent` over `innerHTML`. Do not add inline `onclick` handlers or inline `<script>` blocks; use `addEventListener` or `data-action` delegation so a strict CSP stays possible.
9. **Third-party scripts:** pin exact versions, prefer self-hosting, and add integrity hashes for anything loaded from a CDN.
10. **Rate limiting:** keep limiters on login and refresh. New auth-related endpoints get a limiter too.

Known open issues are tracked in the review doc "Auto Repair Hub: Frontend and Security Review". Do not reintroduce any of them, and do not copy patterns from code you know is flawed.

## Backend conventions

- Controllers are `async` handlers wrapped so errors reach `errorMiddleware`. Do not swallow errors.
- Keep route files thin: path, middleware, controller. SQL belongs in controllers.
- Use consistent JSON responses, and correct status codes (400 validation, 401 unauthenticated, 403 forbidden, 404 missing, 409 conflict).
- Schema changes go in `database/schema.sql` and must be reflected in `.spec/database-spec.md` and `seed.js`. Keep ENUMs, validators and `ALLOWED_ROLES` in sync (a mismatch has caused insert errors before).
- Money fields use `DECIMAL`, never floats.

## Frontend conventions

- **Design system:** "Fidelity Modern", defined in `design.md`. Use the existing color tokens and CSS variables. Do not introduce new hex colors inline.
- **Shared code:** put shared helpers in `public/js/` (one `escapeHTML`, one toast system, one modal). Do not copy a helper into a page.
- **Pages** should keep scripts in `public/js/<page>.js` and styles in `public/css/`, not inline.
- **API calls** go through `public/js/api.js` only. It handles cookies, 401 refresh and redirects.
- **Auth guard:** hide page content until auth resolves, and redirect unauthorized roles before rendering.
- **Accessibility:** icon-only buttons need `aria-label`; tables need `<caption>` and `scope="col"`; modals trap focus and restore it on close; toasts use `aria-live="polite"`; interactive elements need a visible `:focus-visible` style.
- **Responsive:** verify at 360px, 768px and 1280px. Wide tables scroll inside their own container, not the page.
- **Performance:** no images over about 100 KB in the UI, no duplicate font links, no runtime CSS compilation in production.
- **States:** every list view needs loading, empty and error states.

## Testing expectations

- Every new or changed endpoint needs tests in the matching `tests/*.test.js`: success, validation failure, 401 without a cookie, and 403 for the wrong role.
- Any security fix needs a regression test proving the bad behavior is now rejected.
- Do not weaken or delete a test to make it pass. If a test encodes insecure behavior, change it and explain why.
- Tests must not depend on seeded production-like data or leave data behind.

## Working agreement

- Make small, focused changes. Do not refactor unrelated code in the same change.
- Do not add dependencies without asking, except as the task explicitly requires.
- Match existing naming and formatting. Use 2-space indentation, `const`/`let`, and single quotes in JS.
- Update docs (`README.md`, `.spec/*`) whenever behavior changes. Docs must describe what is implemented, not what is planned.
- Never run destructive database commands (`DROP`, `TRUNCATE`, mass `DELETE`) against anything but a local dev database, and never point tests at a shared database.
- In your final message, list the files you changed, what you verified (tests, manual checks), and anything you could not verify.

## Definition of done

- [ ] `npm test` passes, with new or updated tests for the change
- [ ] No secrets, default passwords or tokens in code, logs, URLs or UI
- [ ] Server-side role checks exist for every new or changed route
- [ ] All SQL parameterized; all inserted HTML escaped
- [ ] No inline event handlers or inline scripts added
- [ ] Docs and specs updated to match behavior