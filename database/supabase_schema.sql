-- ====================================================================
-- Best Heritage - Multi-Branch Inventory & POS Management System
-- Supabase PostgreSQL Relational Database Schema & Seed Data
-- ====================================================================

-- 1. Branches Table
CREATE TABLE IF NOT EXISTS public.branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  address TEXT,
  contact_number TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
  branch_name TEXT,
  phone TEXT,
  password TEXT DEFAULT '123456',
  status TEXT DEFAULT 'active',
  permissions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  barcode TEXT,
  category_id TEXT REFERENCES public.categories(id),
  category_name TEXT NOT NULL,
  subcategory TEXT,
  purchase_price NUMERIC(12, 2) DEFAULT 0.00,
  selling_price NUMERIC(12, 2) DEFAULT 0.00,
  opening_stock INT DEFAULT 0,
  min_alert_level INT DEFAULT 5,
  unit_of_measure TEXT DEFAULT 'pcs',
  package_size NUMERIC(10, 2),
  package_unit TEXT,
  bottle_capacity_ml NUMERIC(10, 2),
  is_decant_allowed BOOLEAN DEFAULT FALSE,
  decant_variants JSONB,
  decant_config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Branch Stocks Table (Real-time Inventory)
CREATE TABLE IF NOT EXISTS public.branch_stocks (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  opening_stock INT DEFAULT 0,
  stock_in INT DEFAULT 0,
  sales_return INT DEFAULT 0,
  stock_out INT DEFAULT 0,
  quantity_sold INT DEFAULT 0,
  purchase_return INT DEFAULT 0,
  current_stock INT DEFAULT 0,
  open_bottle_ml_remaining NUMERIC(10, 2) DEFAULT 0.00,
  min_alert_level INT DEFAULT 5,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_branch_product UNIQUE (branch_id, product_id)
);

-- 6. Stock In Transactions Table
CREATE TABLE IF NOT EXISTS public.stock_ins (
  id TEXT PRIMARY KEY,
  reference_no TEXT NOT NULL UNIQUE,
  date TEXT NOT NULL,
  branch_id TEXT NOT NULL REFERENCES public.branches(id),
  branch_name TEXT,
  supplier_name TEXT,
  supplier_invoice_no TEXT,
  remarks TEXT,
  total_quantity INT DEFAULT 0,
  total_purchase_cost NUMERIC(14, 2) DEFAULT 0.00,
  created_by_user_id TEXT,
  created_by_name TEXT,
  items JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Stock Out Transactions Table
CREATE TABLE IF NOT EXISTS public.stock_outs (
  id TEXT PRIMARY KEY,
  reference_no TEXT NOT NULL UNIQUE,
  date TEXT NOT NULL,
  branch_id TEXT NOT NULL REFERENCES public.branches(id),
  branch_name TEXT,
  reason TEXT NOT NULL,
  reference_doc_no TEXT,
  remarks TEXT,
  total_quantity INT DEFAULT 0,
  created_by_user_id TEXT,
  created_by_name TEXT,
  items JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Sales Transactions Table
CREATE TABLE IF NOT EXISTS public.sales (
  id TEXT PRIMARY KEY,
  invoice_no TEXT NOT NULL UNIQUE,
  date TEXT NOT NULL,
  branch_id TEXT NOT NULL REFERENCES public.branches(id),
  branch_name TEXT,
  customer_name TEXT DEFAULT 'Walk-in Customer',
  customer_phone TEXT,
  payment_method TEXT NOT NULL,
  notes TEXT,
  total_quantity_sold INT DEFAULT 0,
  subtotal NUMERIC(14, 2) DEFAULT 0.00,
  discount_type TEXT,
  discount_value NUMERIC(10, 2),
  discount_amount NUMERIC(12, 2) DEFAULT 0.00,
  total_cost_of_goods_sold NUMERIC(14, 2) DEFAULT 0.00,
  total_sales_amount NUMERIC(14, 2) DEFAULT 0.00,
  gross_profit NUMERIC(14, 2) DEFAULT 0.00,
  created_by_user_id TEXT,
  created_by_name TEXT,
  status TEXT DEFAULT 'completed',
  items JSONB NOT NULL,
  cancellation_reason TEXT,
  cancelled_at TEXT,
  cancelled_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Branch Transfers Table
CREATE TABLE IF NOT EXISTS public.branch_transfers (
  id TEXT PRIMARY KEY,
  transfer_no TEXT NOT NULL UNIQUE,
  date TEXT NOT NULL,
  source_branch_id TEXT NOT NULL REFERENCES public.branches(id),
  source_branch_name TEXT,
  destination_branch_id TEXT NOT NULL REFERENCES public.branches(id),
  destination_branch_name TEXT,
  product_id TEXT NOT NULL REFERENCES public.products(id),
  product_name TEXT,
  product_sku TEXT,
  quantity INT NOT NULL,
  unit_purchase_cost NUMERIC(12, 2) DEFAULT 0.00,
  total_transfer_cost NUMERIC(14, 2) DEFAULT 0.00,
  status TEXT DEFAULT 'Pending',
  notes TEXT,
  dispatched_by TEXT,
  dispatched_at TEXT,
  received_by TEXT,
  received_at TEXT,
  cancelled_by TEXT,
  cancelled_at TEXT,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Operating Expenses Table
CREATE TABLE IF NOT EXISTS public.operating_expenses (
  id TEXT PRIMARY KEY,
  voucher_no TEXT NOT NULL UNIQUE,
  date TEXT NOT NULL,
  branch_id TEXT NOT NULL REFERENCES public.branches(id),
  branch_name TEXT,
  category TEXT NOT NULL,
  amount NUMERIC(12, 2) DEFAULT 0.00,
  payment_source TEXT NOT NULL,
  description TEXT NOT NULL,
  vendor_name TEXT,
  recorded_by_user_id TEXT,
  recorded_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Expense Categories Table
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_default BOOLEAN DEFAULT TRUE
);

-- 12. Branch Opening Balances Table
CREATE TABLE IF NOT EXISTS public.branch_opening_balances (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES public.branches(id),
  branch_name TEXT,
  set_date TEXT NOT NULL,
  cash_in_hand NUMERIC(14, 2) DEFAULT 0.00,
  bank_balance NUMERIC(14, 2) DEFAULT 0.00,
  set_by_user_id TEXT,
  set_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Stock Movement Audit Trail Table
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  date TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  branch_name TEXT,
  product_id TEXT NOT NULL,
  product_name TEXT,
  sku TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity_change INT NOT NULL,
  balance_after INT NOT NULL,
  reference_no TEXT NOT NULL,
  notes TEXT,
  user_id TEXT,
  user_name TEXT
);

-- ====================================================================
-- Disable Row Level Security (RLS) for Seamless Direct Client Access
-- ====================================================================
ALTER TABLE public.branches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_stocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_ins DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_outs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_transfers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.operating_expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_opening_balances DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements DISABLE ROW LEVEL SECURITY;

-- ====================================================================
-- Initial Seed Data Insertion
-- ====================================================================

-- 1. Single Branch (Aftabnagar Branch)
INSERT INTO public.branches (id, name, code, address, contact_number, is_active)
VALUES ('br_aftabnagar', 'Aftabnagar Branch', 'AFT-01', 'Aftabnagar, Badda, Dhaka', '+880 1700-000000', TRUE)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code;

-- 2. Initial Categories
INSERT INTO public.categories (id, name, description, icon_name)
VALUES 
  ('cat_cosmetics', 'Cosmetic Products', 'Skincare, serums, cleansers, creams, lipsticks, and beauty essentials', 'Sparkles'),
  ('cat_food', 'Food Products', 'Pure honey, aromatic rice, cold-pressed oils, organic teas, and gourmet foods', 'Apple'),
  ('cat_perfumes', 'Perfume Products', 'Royal oud, artisan attars, eau de parfum, and oriental concentrated fragrances', 'Flame')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 3. The 3 System Users (Super Admin 99999, Admin 00001, Branch Manager 00002)
INSERT INTO public.users (id, username, name, email, role, branch_id, branch_name, phone, password, status)
VALUES
  ('usr_super', '99999', 'Best Heritage', 'admin@bestheritage.com', 'super_admin', NULL, NULL, '+880 1700-000001', '123456', 'active'),
  ('usr_admin', '00001', 'Sumon', 'sumon@bestheritage.com', 'admin', NULL, NULL, '+880 1700-000002', '123456', 'active'),
  ('usr_manager', '00002', 'Sohel Ahmed', 'sohel@bestheritage.com', 'manager', 'br_aftabnagar', 'Aftabnagar Branch', '+880 1700-000003', '123456', 'active')
ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, name = EXCLUDED.name, password = EXCLUDED.password;

-- 4. Initial Expense Categories
INSERT INTO public.expense_categories (id, name, description, is_default)
VALUES
  ('exp_cat_1', 'Shop Rent & Lease', 'Monthly retail shop or warehouse rent', TRUE),
  ('exp_cat_2', 'Staff Salaries & Allowances', 'Staff wages, commissions, and bonuses', TRUE),
  ('exp_cat_3', 'Electricity & Utility Bills', 'Electricity, water, gas, and power bills', TRUE),
  ('exp_cat_4', 'Packaging & Bags', 'Custom shopping bags, bubble wraps, shipping boxes', TRUE),
  ('exp_cat_5', 'Internet & Phone Bills', 'Broadband internet, POS SIM card, telephone', TRUE),
  ('exp_cat_6', 'Courier & Delivery Charges', 'RedX, Steadfast, Pathao, or local transport', TRUE),
  ('exp_cat_7', 'Office Supplies & Stationery', 'POS printer paper rolls, pens, office goods', TRUE),
  ('exp_cat_8', 'Marketing & Social Media Ads', 'Facebook ads, boosted posts, printed flyers', TRUE),
  ('exp_cat_9', 'Tea, Snacks & Entertainment', 'Staff refreshments, client tea, daily entertainment', TRUE),
  ('exp_cat_10', 'Maintenance & Repairs', 'AC servicing, electrical repairs, fixture repairs', TRUE)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
