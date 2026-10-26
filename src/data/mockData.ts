import {
  Branch,
  Category,
  Product,
  User,
  StockInTransaction,
  StockOutTransaction,
  SaleTransaction,
  StockMovement,
  BranchProductStock,
  BranchTransfer,
  BranchOpeningBalance,
  OperatingExpense,
  ExpenseCategoryItem,
} from '../types';
import { getDefaultPermissionsForRole } from '../utils/permissionUtils';

// --------------------------------------------------------------------
// 1. Initial 3 Main Product Categories
// --------------------------------------------------------------------
export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'cat_cosmetics',
    name: 'Cosmetic Products',
    description: 'Skincare, serums, cleansers, creams, lipsticks, and beauty essentials',
    iconName: 'Sparkles',
  },
  {
    id: 'cat_food',
    name: 'Food Products',
    description: 'Pure honey, aromatic rice, cold-pressed oils, organic teas, and gourmet foods',
    iconName: 'Apple',
  },
  {
    id: 'cat_perfumes',
    name: 'Perfume Products',
    description: 'Royal oud, artisan attars, eau de parfum, and oriental concentrated fragrances',
    iconName: 'Flame',
  },
];

// --------------------------------------------------------------------
// 2. Initial Users (Super Admin, Operations Admin, Branch Manager)
// --------------------------------------------------------------------
export const INITIAL_USERS: User[] = [
  {
    id: 'usr_super',
    username: '99999',
    name: 'Best Heritage',
    email: 'admin@bestheritage.com',
    role: 'super_admin',
    phone: '+880 1700-000001',
    password: '123456',
    status: 'active',
    permissions: getDefaultPermissionsForRole('super_admin'),
    createdAt: '2026-01-01',
  },
  {
    id: 'usr_admin',
    username: '00001',
    name: 'Sumon',
    email: 'sumon@bestheritage.com',
    role: 'admin',
    phone: '+880 1700-000002',
    password: '123456',
    status: 'active',
    permissions: getDefaultPermissionsForRole('admin'),
    createdAt: '2026-01-10',
  },
  {
    id: 'usr_manager',
    username: '00002',
    name: 'Sohel Ahmed',
    email: 'sohel@bestheritage.com',
    role: 'manager',
    branchId: 'br_aftabnagar',
    branchName: 'Aftabnagar Branch',
    phone: '+880 1700-000003',
    password: '123456',
    status: 'active',
    permissions: getDefaultPermissionsForRole('manager'),
    createdAt: '2026-01-15',
  },
];

// --------------------------------------------------------------------
// 3. Initial Retail Branch (Aftabnagar)
// --------------------------------------------------------------------
export const INITIAL_BRANCHES: Branch[] = [
  {
    id: 'br_aftabnagar',
    name: 'Aftabnagar Branch',
    code: 'AFT-01',
    address: 'Aftabnagar, Badda, Dhaka',
    contactNumber: '+880 1700-000000',
    isActive: true,
    createdAt: '2026-01-01',
  },
];

// --------------------------------------------------------------------
// 4. Products: Empty (Clean slate ready for real entries)
// --------------------------------------------------------------------
export const INITIAL_PRODUCTS: Product[] = [];

// --------------------------------------------------------------------
// 5. Branch Stocks: Empty
// --------------------------------------------------------------------
export const INITIAL_BRANCH_STOCKS: BranchProductStock[] = [];

// --------------------------------------------------------------------
// 6. Stock In Records: Empty
// --------------------------------------------------------------------
export const INITIAL_STOCK_INS: StockInTransaction[] = [];

// --------------------------------------------------------------------
// 7. Stock Out Records: Empty
// --------------------------------------------------------------------
export const INITIAL_STOCK_OUTS: StockOutTransaction[] = [];

// --------------------------------------------------------------------
// 8. Sales Transactions: Empty
// --------------------------------------------------------------------
export const INITIAL_SALES: SaleTransaction[] = [];

// --------------------------------------------------------------------
// 9. Stock Movement Audit Trail: Empty
// --------------------------------------------------------------------
export const INITIAL_STOCK_MOVEMENTS: StockMovement[] = [];

// --------------------------------------------------------------------
// 10. Branch Transfers: Empty
// --------------------------------------------------------------------
export const INITIAL_TRANSFERS: BranchTransfer[] = [];

// --------------------------------------------------------------------
// 11. Branch Opening Balances: Empty
// --------------------------------------------------------------------
export const INITIAL_OPENING_BALANCES: BranchOpeningBalance[] = [];

// --------------------------------------------------------------------
// 12. Standard Operating Expense Categories
// --------------------------------------------------------------------
export const INITIAL_EXPENSE_CATEGORIES: ExpenseCategoryItem[] = [
  { id: 'exp_cat_1', name: 'Showroom Rent & Lease', description: 'Monthly showroom floor rent, advance adjustments', isDefault: true, createdAt: '2026-01-01' },
  { id: 'exp_cat_2', name: 'Electricity & Utilities', description: 'Electricity bills, water supply, generator backup, internet bills', isDefault: true, createdAt: '2026-01-01' },
  { id: 'exp_cat_3', name: 'Staff Salary & Wages', description: 'Monthly showroom staff salaries, commissions & overtime', isDefault: true, createdAt: '2026-01-01' },
  { id: 'exp_cat_4', name: 'Store Maintenance & Repairs', description: 'Air conditioner servicing, lighting, fitting repairs', isDefault: true, createdAt: '2026-01-01' },
  { id: 'exp_cat_5', name: 'Packaging & Bags', description: 'Branded shopping bags, boxes, bubble wraps', isDefault: true, createdAt: '2026-01-01' },
  { id: 'exp_cat_6', name: 'Transportation & Courier', description: 'Stock dispatch courier, van hire, local freight', isDefault: true, createdAt: '2026-01-01' },
  { id: 'exp_cat_7', name: 'Tea & Entertainment', description: 'Customer refreshment, daily staff tea, mineral water', isDefault: true, createdAt: '2026-01-01' },
  { id: 'exp_cat_8', name: 'Office Supplies & Miscellaneous', description: 'POS receipt rolls, stationery, cleaning detergents', isDefault: true, createdAt: '2026-01-01' },
  { id: 'exp_cat_9', name: 'Product Cost & Direct Sourcing', description: 'Ad-hoc sample purchase or local direct procurement', isDefault: false, createdAt: '2026-01-01' },
  { id: 'exp_cat_10', name: 'Others / General Expenses', description: 'Miscellaneous operational expenses not listed above', isDefault: false, createdAt: '2026-01-01' },
];

// --------------------------------------------------------------------
// 13. Operating Expenses: Empty
// --------------------------------------------------------------------
export const INITIAL_EXPENSES: OperatingExpense[] = [];
