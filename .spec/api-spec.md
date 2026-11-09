# API Specification: Auto Repair Hub

## 1. Authentication APIs
- **`POST /api/auth/login`**: Authenticate user credentials; set `HttpOnly` dual tokens (`access_token`, `refresh_token`) and return user JSON (no JWT in body). Requires CSRF header.
- **`POST /api/auth/refresh`**: Verify `refresh_token` cookie, rotate tokens (revoke old `jti`), reload current role from DB. No JWT in body.
- **`POST /api/auth/logout`**: Revoke presented refresh `jti` and clear authentication cookies.
- **`POST /api/auth/register`**: Admin-only. Create user with role `admin|staff|mechanic` and `must_change_password=TRUE`.
- **`POST /api/auth/change-password`**: Authenticated. Set a new password and clear `must_change_password`.
- **`GET /api/auth/me`**: Current user profile from cookie + DB lookup (rejects deleted users).

## 2. Customer APIs
- **`GET /api/customers?page=1&limit=10&search=term`**: Get paginated customer list with search.
- **`GET /api/customers/:id`**: Fetch customer details by ID.
- **`POST /api/customers`**: Create a new customer record.
- **`PUT /api/customers/:id`**: Update existing customer record.
- **`DELETE /api/customers/:id`**: Delete customer and associated vehicles.

## 3. Vehicle (Car) APIs
- **`GET /api/cars?page=1&limit=10&search=term`**: Get paginated vehicle list joined with owner customer.
- **`GET /api/cars/:id`**: Fetch car details by ID.
- **`POST /api/cars`**: Add a new car linked to customer.
- **`PUT /api/cars/:id`**: Update car record.
- **`DELETE /api/cars/:id`**: Delete car record.

## 4. Service Job & Inventory APIs
- **`GET /api/services?page=1&limit=10&search=term&status=Completed`**: Get paginated service jobs with owner & vehicle details.
- **`GET /api/services/:id/invoice`**: Download generated PDF invoice for service job.
- **`POST /api/services`**: Create a new service job.
- **`POST /api/services/:id/parts`**: Assign inventory part to service job with automated transactional stock deduction.
- **`DELETE /api/services/:id/parts/:jobPartId`**: Unlink part from service job and restore stock.
- **`PUT /api/services/:id`**: Update service job status, assigned employee, cost, description.
- **`DELETE /api/services/:id`**: Delete service job and restore all assigned parts.

## 5. Financial Analytics APIs
- **`GET /api/dashboard/stats?timeframe=all|today|week|month|year`**: Fetch financial statistics, Parts vs. Labor revenue breakdown, average invoice metrics, and Chart.js trend time series.

## Employee account links and mechanic access
`PUT /api/auth/users/:id/employee` is admin-only; body `{ "employee_id": 1 }` links an active employee, or `null` unlinks. Registration optionally accepts `employee_id`. Duplicate links return 409, missing employees 400, and missing users 404.
Mechanics require a link and may only list/read assigned service jobs and update status/description. Job responses omit customer contacts and financial fields; inaccessible jobs return 404. Customers, cars, parts, analytics, invoices, and inventory mutations require admin/staff.

`GET /api/services/technicians` is admin/staff-only and returns active `employee_id`, `name`, and `role` choices without salary fields. `GET /api/health` requires an authenticated admin/staff user.
Business APIs return 403 with `code: PASSWORD_CHANGE_REQUIRED` until required password changes complete. Profile, password change, refresh, and logout remain available.
List query validation rejects invalid pagination, filter statuses, timeframe values, and custom sort parameters. Service statuses match the database: Pending, In Progress, Completed.
