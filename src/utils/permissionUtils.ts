import { ActiveTab, UserPermissions, UserRole } from '../types';

export interface NavMenuDefinition {
  id: ActiveTab;
  label: string;
  category: 'core' | 'operations' | 'finance' | 'admin';
  description: string;
  superAdminOnly?: boolean;
}

export const ALL_NAV_MENUS: NavMenuDefinition[] = [
  { id: 'dashboard', label: 'Dashboard', category: 'core', description: 'Business overview, real-time KPI metrics and alerts' },
  { id: 'products', label: 'Product Catalog & Categories', category: 'core', description: 'Master product directory, categories, SKU codes, pricing and stock' },
  { id: 'stock-in', label: 'Stock In', category: 'operations', description: 'Inward inventory reception from suppliers' },
  { id: 'stock-out', label: 'Stock Out', category: 'operations', description: 'Damage, loss and authorized stock write-offs' },
  { id: 'sales-entry', label: 'Sales Entry (POS)', category: 'operations', description: 'Retail billing checkout terminal & invoice generation' },
  { id: 'sales-history', label: 'Sales History', category: 'operations', description: 'Past invoices, reprints, and return/void receipts' },
  { id: 'current-stock', label: 'Current Stock', category: 'operations', description: 'Consolidated multi-branch stock ledger' },
  { id: 'stock-alerts', label: 'Stock Alerts', category: 'operations', description: 'Low stock thresholds and out-of-stock monitor' },
  { id: 'transfers', label: 'Branch Transfers', category: 'operations', description: 'Inter-branch stock dispatch & transfer receipts' },
  { id: 'expenses', label: 'Cash & Expenses', category: 'finance', description: 'Operating expense vouchers and physical till cash' },
  { id: 'branches', label: 'Branch Management', category: 'admin', description: 'Manage showrooms, branches and hub warehouses' },
  { id: 'reports', label: 'Reports & Statements', category: 'finance', description: 'Sales, inventory movement & exportable reports' },
  { id: 'settings', label: 'Settings', category: 'admin', description: 'Software configuration and profile specifications' },
  { id: 'users', label: 'Super Admin Panel', category: 'admin', description: 'Role permissions, user security and system controls', superAdminOnly: true },
];

export const ASSIGNABLE_NAV_MENUS = ALL_NAV_MENUS.filter((m) => !m.superAdminOnly);

export const getDefaultPermissionsForRole = (role: UserRole): UserPermissions => {
  if (role === 'super_admin') {
    return {
      allowedTabs: [
        'dashboard',
        'products',
        'stock-in',
        'stock-out',
        'sales-entry',
        'sales-history',
        'current-stock',
        'stock-alerts',
        'transfers',
        'expenses',
        'branches',
        'reports',
        'users',
        'settings',
      ],
      canAdd: true,
      canEdit: true,
      canDelete: true,
      canViewProfit: true,
      canVoidSale: true,
    };
  }

  if (role === 'admin') {
    return {
      allowedTabs: [
        'dashboard',
        'products',
        'stock-in',
        'stock-out',
        'sales-entry',
        'sales-history',
        'current-stock',
        'stock-alerts',
        'transfers',
        'expenses',
        'branches',
        'reports',
        'settings',
      ],
      canAdd: true,
      canEdit: true,
      canDelete: true,
      canViewProfit: true,
      canVoidSale: true,
    };
  }

  // Manager defaults (Strict privacy: No profit view, cannot void sales or delete master items)
  return {
    allowedTabs: [
      'dashboard',
      'products',
      'stock-in',
      'stock-out',
      'sales-entry',
      'sales-history',
      'current-stock',
      'stock-alerts',
      'transfers',
      'expenses',
    ],
    canAdd: true,
    canEdit: false,
    canDelete: false,
    canViewProfit: false,
    canVoidSale: false,
  };
};

export const INITIAL_ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  super_admin: getDefaultPermissionsForRole('super_admin'),
  admin: getDefaultPermissionsForRole('admin'),
  manager: getDefaultPermissionsForRole('manager'),
};

export const PERMISSION_PRESETS: {
  id: string;
  name: string;
  description: string;
  permissions: UserPermissions;
}[] = [
  {
    id: 'full_admin',
    name: 'Full Administrator',
    description: 'Access to all business modules, CRUD actions, and financial reports.',
    permissions: getDefaultPermissionsForRole('admin'),
  },
  {
    id: 'branch_manager',
    name: 'Branch Manager',
    description: 'Standard branch operations, retail POS, stock in/out, and expenses. Profit masked.',
    permissions: getDefaultPermissionsForRole('manager'),
  },
  {
    id: 'pos_cashier',
    name: 'POS Cashier / Sales',
    description: 'Focused strictly on POS billing checkout, sales history, and current stock lookup.',
    permissions: {
      allowedTabs: ['dashboard', 'sales-entry', 'sales-history', 'current-stock', 'stock-alerts'],
      canAdd: true,
      canEdit: false,
      canDelete: false,
      canViewProfit: false,
      canVoidSale: false,
    },
  },
  {
    id: 'inventory_clerk',
    name: 'Inventory & Warehouse Clerk',
    description: 'Focused on product catalog, receiving stock in, stock out write-offs, and transfers.',
    permissions: {
      allowedTabs: ['dashboard', 'products', 'stock-in', 'stock-out', 'current-stock', 'stock-alerts', 'transfers'],
      canAdd: true,
      canEdit: true,
      canDelete: false,
      canViewProfit: false,
      canVoidSale: false,
    },
  },
];
