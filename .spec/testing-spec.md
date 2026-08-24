# Testing Specification: Auto Repair Hub

## 1. Testing Framework
- **Jest**: Primary test runner and assertion framework.
- **Supertest**: HTTP assertion library for integration testing Express endpoints.

## 2. Test Suites (6 Passed / 6 Total - 20/20 Tests Passing)
- **`tests/database.test.js`**: Connection pool initialization and query execution tests.
- **`tests/auth.test.js`**: Login authentication, password verification, and endpoint token protection tests.
- **`tests/customer.test.js`**: Customer REST API CRUD and pagination search tests.
- **`tests/services.test.js`**: Work order CRUD, transactional inventory deduction, zero-stock blocking, and stock restoration on job deletion.
- **`tests/cars.test.js`**: Vehicle fleet CRUD, VIN uniqueness, customer linking, and search tests.
- **`tests/parts.test.js`**: Inventory parts CRUD, stock quantity updates, and deletion tests.

## 3. Running Automated Tests
```bash
npm test
```
