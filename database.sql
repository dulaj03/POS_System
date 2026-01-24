-- PUB CINNAMON POS System Database Schema
-- Import this into phpMyAdmin for your MySQL database

CREATE DATABASE IF NOT EXISTS pub_cinnamon;
USE pub_cinnamon;

-- ===== USERS TABLE =====
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'cashier') NOT NULL DEFAULT 'cashier',
    pin VARCHAR(4) NOT NULL UNIQUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ===== PRODUCTS TABLE =====
CREATE TABLE products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    cost_price DECIMAL(10, 2) DEFAULT 0,
    stock INT NOT NULL DEFAULT 0,
    is_deposit_enabled BOOLEAN DEFAULT FALSE,
    deposit_amount DECIMAL(10, 2) DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_name (name)
) ENGINE=InnoDB;

-- ===== PROMOTIONS TABLE =====
CREATE TABLE promotions (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type ENUM('PERCENTAGE', 'FIXED') NOT NULL,
    value DECIMAL(10, 2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_active (is_active),
    INDEX idx_dates (start_date, end_date)
) ENGINE=InnoDB;

-- ===== PROMOTION ITEMS (Junction table for products in promotions) =====
CREATE TABLE promotion_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    promotion_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_promo_product (promotion_id, product_id)
) ENGINE=InnoDB;

-- ===== SALES TABLE =====
CREATE TABLE sales (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0,
    tax DECIMAL(10, 2) DEFAULT 0,
    deposit_total DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    bottles_exchanged INT DEFAULT 0,
    payment_methods JSON,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_date (date),
    INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- ===== SALE ITEMS TABLE =====
CREATE TABLE sale_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    cost_price DECIMAL(10, 2) DEFAULT 0,
    qty INT NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    INDEX idx_sale (sale_id),
    INDEX idx_product (product_id)
) ENGINE=InnoDB;

-- ===== EMPTY BOTTLES TABLE =====
CREATE TABLE empty_bottles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('SALE_RETURN', 'EXCHANGE', 'PURCHASE', 'RETURN_TO_SUPPLIER') NOT NULL,
    quantity INT NOT NULL,
    cost DECIMAL(10, 2) DEFAULT 0,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_date (date),
    INDEX idx_type (type)
) ENGINE=InnoDB;

-- ===== EMPTY BOTTLES SUMMARY TABLE =====
CREATE TABLE empty_bottles_summary (
    id INT PRIMARY KEY DEFAULT 1,
    total_in_hand INT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Insert initial summary record
INSERT INTO empty_bottles_summary (id, total_in_hand) VALUES (1, 0);

-- ===== SUPPLIER PAYMENTS TABLE =====
CREATE TABLE supplier_payments (
    id BIGINT PRIMARY KEY,
    supplier VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_date (date),
    INDEX idx_supplier (supplier)
) ENGINE=InnoDB;

-- ===== SYSTEM SETTINGS TABLE =====
CREATE TABLE system_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Insert default settings
INSERT INTO system_settings (setting_key, setting_value) VALUES 
('theme', 'dark'),
('currency', 'LKR'),
('service_charge_rate', '10'),
('tax_rate', '8');

-- ===== CASHIER COMMISSIONS TABLE =====
CREATE TABLE cashier_commissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    commission_percentage FLOAT NOT NULL DEFAULT 0,
    month DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_month (user_id, month),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_month (month),
    INDEX idx_user_month (user_id, month)
) ENGINE=InnoDB;

-- ===== SEED DATA =====

-- Users
INSERT INTO users (id, name, role, pin) VALUES 
('u1', 'Admin User', 'admin', '1234'),
('u2', 'Cashier One', 'cashier', '0000');

-- Products
INSERT INTO products (id, name, category, price, cost_price, stock, is_deposit_enabled, deposit_amount) VALUES 
('p1', 'Old Reserve Arrack 750ml', 'Liquor', 4500, 3800, 50, TRUE, 100),
('p2', 'Lion Lager 625ml', 'Beer', 900, 750, 120, TRUE, 50),
('p3', 'Coca Cola 1.5L', 'Chaser', 450, 350, 30, TRUE, 100),
('p4', 'Soda 500ml', 'Chaser', 150, 100, 100, FALSE, 0),
('p5', 'Fried Rice (Chicken)', 'Kitchen', 1200, 800, 999, FALSE, 0),
('p6', 'Devilled Chicken', 'Kitchen', 1500, 1000, 999, FALSE, 0),
('p7', 'French Fries', 'Kitchen', 800, 400, 999, FALSE, 0),
('p8', 'Rockland Dry Gin', 'Liquor', 6500, 5500, 20, TRUE, 100);
