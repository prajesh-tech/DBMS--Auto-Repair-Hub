# Database Specification: Auto Repair Hub

## 1. Schema Overview
The database uses InnoDB engine with full Foreign Key enforcement (`ON DELETE CASCADE` / `ON DELETE SET NULL`) to maintain referential integrity.

## 2. Entity Relationship Summary
```
[User] (user_id PK, username UNIQUE, password_hash, role)

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

## 3. Performance Indexes
- `idx_car_customer`: `Car(customer_id)`
- `idx_service_car`: `ServiceJob(car_id)`
- `idx_service_employee`: `ServiceJob(employee_id)`
- `idx_service_status`: `ServiceJob(status)`
