# 🧾 POS System (Point of Sale)

A modern web-based Point of Sale (POS) system designed for restaurants, pubs, and retail environments.
The system supports sales processing, inventory management, promotions, commissions, reporting, and thermal receipt printing (XP-80 / 80mm printers).

## 📌 Features
🔹 Core POS

- Fast and intuitive sales interface
- Real-time cart updates
- Multiple payment methods (Cash, Card, Online)
- Automatic tax and discount calculations
- Deposit & bottle exchange handling
- Change and balance calculation
- Receipt generation and printing (80mm thermal printers)

🔹 Inventory Management

- Product CRUD operations
- Category-based filtering
- Stock tracking
- Cost price & selling price management

🔹 Promotions & Discounts

- Percentage-based promotions
- Fixed-amount discounts
- Item-specific promotions
- Manual enable/disable promotions per item

🔹 Commission System

- Cashier commission tracking
- Commission reports per user
- Configurable commission rules

🔹 Reports

- Sales reports
- Commission report
- Summary and detailed views
- Printable reports

🔹 User Management

- User roles (Admin / Cashier)
- Secure user handling
- Cashier-based sale tracking

## 🛠️ Technology Stack
Frontend

- JavaScript (React)
- CSS (custom + utility-based styling)
- Browser-based printing (window.print())

Backend

- PHP (API-based architecture)
- REST-style endpoints

Database

- MySQL
- SQL schema provided