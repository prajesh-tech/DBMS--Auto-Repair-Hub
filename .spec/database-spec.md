# Database Specification: Auto Repair Hub

## 1. Schema Overview
The database uses InnoDB engine with full Foreign Key enforcement (`ON DELETE CASCADE` / `ON DELETE SET NULL`) to maintain referential integrity.

## 2. Entity Relationship Summary
```
[User] (user_id PK, username UNIQUE, password_hash, role ENUM admin|staff|mechanic, must_change_password)
   │
   └──< [RefreshToken] (jti PK, user_id FK, expires_at, revoked_at)

[Customer] 1 ───< N [Car] (car_id PK, vin UNIQUE, customer_id FK)
                      │
                      1
                      │
                      N
               [ServiceJob] (job_id PK, car_id FK, employee_id FK, status)
                      ▲
                      │
                      N
                      │
                      1
                  [Employee] (employee_id PK, name, role, salary)
```

## 3. Auth-related columns
- `User.must_change_password`: BOOLEAN NOT NULL DEFAULT FALSE — forced password change after seed/admin create.
- `RefreshToken`: stores refresh JWT `jti` values for rotation and revocation.

## 4. Performance Indexes
- `idx_car_customer`: `Car(customer_id)`
- `idx_service_car`: `ServiceJob(car_id)`
- `idx_service_employee`: `ServiceJob(employee_id)`
- `idx_service_status`: `ServiceJob(status)`
- `idx_refresh_user`: `RefreshToken(user_id)`
- `idx_refresh_expires`: `RefreshToken(expires_at)`

`User.employee_id` is nullable and unique, references Employee with ON DELETE SET NULL. Existing installations use `npm run migrate`; it preserves data and leaves existing users unlinked. Demo seed links the mechanic to Alex Rivera.
