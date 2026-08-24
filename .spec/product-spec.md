# Product Specification: Auto Repair Hub

## 1. Product Vision
**Auto Repair Hub** is a lightweight, enterprise-ready web application designed for auto repair shop owners, service managers, and mechanics to manage daily shop operations, vehicle fleets, customer records, inventory parts, financial analytics, and automated PDF invoicing efficiently.

## 2. Target Personas & Role Access
- **Admin**: Full oversight of shop operations, revenue analytics, salary metrics, inventory management, user registration, and deletion permissions.
- **Staff / Service Advisor**: Manages customer intake, schedules vehicle repair jobs, assigns mechanics, manages inventory, and generates PDF invoices (Restricted from employee salary data and user deletion).
- **Mechanic**: Updates repair job status (Pending -> In Progress -> Completed), logs diagnostic descriptions, and views assigned work orders (Restricted from financial reporting, salary data, and management pages).

## 3. Core Capabilities
- **Customer Management**: Maintain customer contact records.
- **Vehicle Fleet Management**: Track vehicles linked to owners by VIN, Make, Model, Year, Color.
- **Employee Directory**: Track staff roles, phone numbers, and salary metrics.
- **Service Job Tracking**: Manage work orders, status workflow, and technician assignment.
- **Automated Inventory Deduction**: Automatic stock decrement on part assignment, stock validation, negative inventory prevention, and stock restoration on job deletion.
- **Financial Analytics & PDF Invoicing**: Standalone **📊 Analytics** module (`analytics.html`) featuring timeframe filters (`Today`, `This Week`, `This Month`, `This Year`, `All Time`), Parts Sales vs Labor Revenue breakdown, Chart.js trend curves, and automated PDF invoice generation.
- **Glassmorphism & Mobile Responsiveness**: Frosted glass panels (`backdrop-filter: blur(20px)`), responsive grid layouts, mobile drawer navigation, and light/dark theme toggle.
- **Idle Session Security**: 30-minute inactivity tracker with a 2-minute countdown warning modal.

## 4. Key Performance Indicators (KPIs)
- API response time < 50ms for local queries.
- Zero raw SQL error leaks to client interfaces.
- 100% pass rate across automated test suites (`npm test`).
- Zero `localStorage` token storage (100% `HttpOnly` dual-token cookie protection).
