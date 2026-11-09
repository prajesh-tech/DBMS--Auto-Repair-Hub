# Testing Specification: Auto Repair Hub

## Automated checks
Run `npm test` for Jest and Supertest suites. Database calls are mocked: these checks exercise HTTP status codes, server role checks, auth cookies, CSRF, refresh/replay failure handling, password validation, mechanic assignment predicates, inventory operations, strict CSP headers, HTML escaping, and shared frontend refresh behavior.

Tests use isolated fixtures and do not require seed data. Test-only JWT secrets are configured by `tests/setupEnv.js`, not application fallbacks. Mutating authenticated test requests include both the cookie and CSRF header.

## Disposable local database verification
`RUN_LOCAL_DB_TESTS=1 node scripts/verify-local-database.js` requires a loopback DB_HOST and credentials allowed to create a database. It creates a randomly named test database, upgrades a legacy schema twice, verifies preserved shop/account records, tests concurrent refresh rotation and replay revocation, then removes that database. Application database contents remain untouched.

## Frontend verification
Run `npm run build` to compile the pinned Tailwind CLI configuration. Static security tests reject inline scripts, event attributes, inline styles, remote page assets, and permissive CSP. Shared escaping and confirmation text have XSS regressions; the API wrapper has a concurrent-refresh test.

Browser rendering, keyboard focus behavior, and console CSP checks at 360px, 768px, and 1280px are not verified by Jest. Manual browser verification remains outstanding; no browser tooling dependency was authorized.
