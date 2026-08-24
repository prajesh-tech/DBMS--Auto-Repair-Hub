# Project Guidelines: Auto Repair Hub

## Architectural Principles
- **Layer Separation**: 
  - Frontend static web assets belong strictly in `public/`.
  - Backend Node.js/Express MVC components belong in `src/` (`config`, `controllers`, `middleware`, `routes`).
  - Database schema migrations and seed scripts belong in `database/schema.sql`.
- **Backend Entry Point**: `src/server.js` is the Express app entry point.

## Security & Database Standards
- **Database Access**: All SQL queries MUST use parameterized inputs (`mysql2/promise` with `?` placeholders) to prevent SQL Injection.
- **Authentication**: REST API protection requires `HttpOnly` cookie token verification via `verifyToken` middleware. Role-restricted routes must enforce `requireRole(['admin', 'staff', 'mechanic'])`.
- **Password Hashing**: Passwords must be hashed using `bcryptjs` with salt rounds >= 10. Never hardcode unhashed fallbacks.

## UI/UX & Frontend Conventions
- **Glassmorphism Design Tokens**: All styles adhere to CSS variables in `public/css/style.css` (`--card-bg`, `--primary-gradient`, `--glass-blur`, `--text-primary`, etc.).
- **Global Navigation Bar**: Every web page MUST render the full unified navigation bar (`index.html`, `analytics.html`, `customer.html`, `cars.html`, `employee.html`, `services.html`, `parts.html`) featuring module links, mobile hamburger toggle button (`.hamburger-btn`), dark mode toggle (`id="themeToggleBtn"`), user role badge (`id="userBadge"`), and logout.
- **Table Action Controls**: Use `.btn-sm` for table action buttons (`📄 Invoice`, `✏️ Edit`, `🗑 Delete`).
