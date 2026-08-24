# API Specification: Auto Repair Hub

## 1. Authentication APIs
- **`POST /api/auth/login`**: Authenticate user credentials and set `HttpOnly` dual tokens (`access_token` and `refresh_token`).
- **`POST /api/auth/refresh`**: Verify `refresh_token` cookie and rotate access & refresh tokens.
- **`POST /api/auth/logout`**: Clear authentication cookies and terminate session.
- **`POST /api/auth/register`**: Register new staff/admin user account with bcrypt password hashing.
- **`GET /api/auth/me`**: Get current logged-in user profile & role.

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
