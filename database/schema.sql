-- ====================================================================
-- Best Heritage - Multi-Branch Inventory & POS System
-- MySQL Relational Database Schema & Initial Data
-- Character Set: utf8mb4 (Supports Bengali text & English seamlessly)
-- ====================================================================

CREATE DATABASE IF NOT EXISTS `best_heritage_db`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `best_heritage_db`;

-- --------------------------------------------------------------------
-- 1. Branches Table
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `branches` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `address` TEXT,
  `phone` VARCHAR(30),
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 2. Users Table
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(30),
  `role` ENUM('super_admin', 'admin', 'manager') NOT NULL,
  `branch_id` VARCHAR(50) NULL,
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_users_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 3. Categories Table
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `categories` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 4. Products Table
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `products` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL,
  `sku` VARCHAR(50) NOT NULL UNIQUE,
  `barcode` VARCHAR(50) NULL UNIQUE,
  `category_id` VARCHAR(50) NOT NULL,
  `subcategory` VARCHAR(100) NULL,
  `purchase_price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `selling_price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `opening_stock` INT NOT NULL DEFAULT 0,
  `min_alert_level` INT NOT NULL DEFAULT 5,
  `unit_of_measure` VARCHAR(30) DEFAULT 'pcs',
  `package_size` DECIMAL(10, 2) NULL,
  `package_unit` VARCHAR(20) NULL,
  `bottle_capacity_ml` DECIMAL(10, 2) NULL,
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 5. Branch Stocks Table (Real-time Inventory & Decant ml Remaining)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `branch_stocks` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `branch_id` VARCHAR(50) NOT NULL,
  `product_id` VARCHAR(50) NOT NULL,
  `opening_stock` INT NOT NULL DEFAULT 0,
  `stock_in` INT NOT NULL DEFAULT 0,
  `sales_return` INT NOT NULL DEFAULT 0,
  `stock_out` INT NOT NULL DEFAULT 0,
  `quantity_sold` INT NOT NULL DEFAULT 0,
  `purchase_return` INT NOT NULL DEFAULT 0,
  `current_stock` INT NOT NULL DEFAULT 0,
  `open_bottle_ml_remaining` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `min_alert_level` INT NOT NULL DEFAULT 5,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `idx_branch_product` (`branch_id`, `product_id`),
  CONSTRAINT `fk_bs_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bs_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 6. Stock In Transactions Table
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `stock_ins` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `reference_no` VARCHAR(50) NOT NULL UNIQUE,
  `date` DATE NOT NULL,
  `branch_id` VARCHAR(50) NOT NULL,
  `supplier_name` VARCHAR(150) NULL,
  `supplier_invoice_no` VARCHAR(100) NULL,
  `remarks` TEXT NULL,
  `total_quantity` INT NOT NULL DEFAULT 0,
  `total_purchase_cost` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `created_by_user_id` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_sin_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_sin_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `stock_in_items` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `stock_in_id` VARCHAR(50) NOT NULL,
  `product_id` VARCHAR(50) NOT NULL,
  `quantity` INT NOT NULL,
  `unit_purchase_price` DECIMAL(12, 2) NOT NULL,
  `total_cost` DECIMAL(14, 2) NOT NULL,
  CONSTRAINT `fk_sii_stock_in` FOREIGN KEY (`stock_in_id`) REFERENCES `stock_ins` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sii_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 7. Stock Out Transactions Table (Damaged / Lost / Internal Use)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `stock_outs` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `reference_no` VARCHAR(50) NOT NULL UNIQUE,
  `date` DATE NOT NULL,
  `branch_id` VARCHAR(50) NOT NULL,
  `reason` ENUM('Damaged Product', 'Internal Use', 'Lost Product', 'Authorized Adjustment') NOT NULL,
  `reference_doc_no` VARCHAR(100) NULL,
  `remarks` TEXT NULL,
  `total_quantity` INT NOT NULL DEFAULT 0,
  `created_by_user_id` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_sout_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_sout_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `stock_out_items` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `stock_out_id` VARCHAR(50) NOT NULL,
  `product_id` VARCHAR(50) NOT NULL,
  `quantity` INT NOT NULL,
  CONSTRAINT `fk_soi_stock_out` FOREIGN KEY (`stock_out_id`) REFERENCES `stock_outs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_soi_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 8. Sales Transactions Table (POS & Invoices with Discount & Decant)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sales` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `invoice_no` VARCHAR(50) NOT NULL UNIQUE,
  `date` DATE NOT NULL,
  `branch_id` VARCHAR(50) NOT NULL,
  `customer_name` VARCHAR(150) NOT NULL DEFAULT 'Walk-in Customer',
  `customer_phone` VARCHAR(30) NULL,
  `payment_method` ENUM('Cash', 'bKash', 'Nagad', 'Bank Transfer', 'Card') NOT NULL,
  `notes` TEXT NULL,
  `total_quantity_sold` INT NOT NULL DEFAULT 0,
  `subtotal` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `discount_type` ENUM('fixed', 'percentage') NULL,
  `discount_value` DECIMAL(10, 2) NULL,
  `discount_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `total_cost_of_goods_sold` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `total_sales_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `gross_profit` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `created_by_user_id` VARCHAR(50) NOT NULL,
  `status` ENUM('completed', 'cancelled') NOT NULL DEFAULT 'completed',
  `cancellation_reason` TEXT NULL,
  `cancelled_at` DATETIME NULL,
  `cancelled_by_name` VARCHAR(150) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_sales_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_sales_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sale_items` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `sale_id` VARCHAR(50) NOT NULL,
  `product_id` VARCHAR(50) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `purchase_cost` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `selling_price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `total_cost` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `total_sales` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `gross_profit` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `is_decant` TINYINT(1) DEFAULT 0,
  `decant_variant_name` VARCHAR(100) NULL,
  `decant_ml_amount` DECIMAL(10, 2) NULL,
  CONSTRAINT `fk_si_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_si_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 9. Branch Transfers Table
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `branch_transfers` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `transfer_no` VARCHAR(50) NOT NULL UNIQUE,
  `date` DATE NOT NULL,
  `source_branch_id` VARCHAR(50) NOT NULL,
  `destination_branch_id` VARCHAR(50) NOT NULL,
  `product_id` VARCHAR(50) NOT NULL,
  `quantity` INT NOT NULL,
  `unit_purchase_cost` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `total_transfer_cost` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `status` ENUM('Pending', 'Dispatched', 'Received', 'Cancelled') NOT NULL DEFAULT 'Pending',
  `notes` TEXT NULL,
  `dispatched_by` VARCHAR(150) NULL,
  `dispatched_at` DATETIME NULL,
  `received_by` VARCHAR(150) NULL,
  `received_at` DATETIME NULL,
  `cancelled_by` VARCHAR(150) NULL,
  `cancelled_at` DATETIME NULL,
  `cancellation_reason` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_bt_source` FOREIGN KEY (`source_branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_bt_dest` FOREIGN KEY (`destination_branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_bt_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 10. Operating Expenses Table
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `operating_expenses` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `voucher_no` VARCHAR(50) NOT NULL UNIQUE,
  `date` DATE NOT NULL,
  `branch_id` VARCHAR(50) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `payment_source` ENUM('Physical Cash', 'Bank Account') NOT NULL,
  `description` TEXT NOT NULL,
  `vendor_name` VARCHAR(150) NULL,
  `recorded_by_user_id` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_exp_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `fk_exp_user` FOREIGN KEY (`recorded_by_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 11. Stock Movement Audit Trail Table
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `stock_movements` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `date` DATE NOT NULL,
  `branch_id` VARCHAR(50) NOT NULL,
  `product_id` VARCHAR(50) NOT NULL,
  `sku` VARCHAR(50) NOT NULL,
  `type` ENUM('opening', 'stock_in', 'stock_out', 'sale', 'sale_cancellation', 'transfer_out', 'transfer_in') NOT NULL,
  `quantity_change` INT NOT NULL,
  `balance_after` INT NOT NULL,
  `reference_no` VARCHAR(50) NOT NULL,
  `notes` TEXT NULL,
  `user_id` VARCHAR(50) NOT NULL,
  `user_name` VARCHAR(150) NOT NULL,
  INDEX `idx_sm_branch_product` (`branch_id`, `product_id`),
  INDEX `idx_sm_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Initial Seed Data
-- ====================================================================

-- 1. Single Branch (Aftabnagar Branch)
INSERT INTO `branches` (`id`, `name`, `code`, `address`, `phone`, `status`) VALUES
('br_aftabnagar', 'আফতাবনগর ব্রাঞ্চ', 'AFT-01', 'আফতাবনগর, বাড্ডা, ঢাকা', '+880 1700-000000', 'active')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- 2. Main Categories
INSERT INTO `categories` (`id`, `name`, `description`, `is_active`) VALUES
('cat_perfumes', 'Perfume Products', 'Fragrances, Attars, Eau de Parfum, Decants', 1),
('cat_food', 'Food Products', 'Pure honey, aromatic rice, cold-pressed oils, organic teas', 1),
('cat_cosmetics', 'Cosmetic Products', 'Skincare, serums, cleansers, creams, beauty essentials', 1)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- 3. Users (Super Admin, Admin, Branch Manager)
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `phone`, `role`, `branch_id`, `status`) VALUES
('usr_super', 'বেস্ট হেরিটেজ', 'admin@bestheritage.com', '$2b$10$YourHashedPasswordHere', '+880 1700-000001', 'super_admin', NULL, 'active'),
('usr_admin', 'সুমন', 'sumon@bestheritage.com', '$2b$10$YourHashedPasswordHere', '+880 1700-000002', 'admin', NULL, 'active'),
('usr_manager', 'সোহেল আহমেদ', 'sohel@bestheritage.com', '$2b$10$YourHashedPasswordHere', '+880 1700-000003', 'manager', 'br_aftabnagar', 'active')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);
