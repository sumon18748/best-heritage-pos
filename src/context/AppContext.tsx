import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  User,
  UserRole,
  Branch,
  Category,
  Product,
  BranchProductStock,
  StockInTransaction,
  StockOutTransaction,
  SaleTransaction,
  StockMovement,
  ActiveTab,
  StockOutReason,
  PaymentMethod,
  DiscountType,
  BranchTransfer,
  BranchOpeningBalance,
  OperatingExpense,
  ExpenseCategory,
  ExpenseCategoryItem,
  ExpensePaymentSource,
  UserPermissions,
} from '../types';
import { getDefaultPermissionsForRole, INITIAL_ROLE_PERMISSIONS } from '../utils/permissionUtils';
import {
  INITIAL_USERS,
  INITIAL_BRANCHES,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_BRANCH_STOCKS,
  INITIAL_STOCK_INS,
  INITIAL_STOCK_OUTS,
  INITIAL_SALES,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_TRANSFERS,
  INITIAL_OPENING_BALANCES,
  INITIAL_EXPENSES,
  INITIAL_EXPENSE_CATEGORIES,
} from '../data/mockData';
import {
  calculateSaleTotals,
  calculateDiscountAmount,
  canInitiateTransfer,
  calculateDecantItemCost,
  calculateDecantStockDeduction,
  calculateDecantCancelRestore,
} from '../utils/stockCalculations';

interface AppContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedBranchId: string; // 'all' or branchId
  setSelectedBranchId: (branchId: string) => void;

  // Active Category filter (null means all 3 categories)
  selectedCategoryName: string | null;
  setSelectedCategoryName: (cat: string | null) => void;

  users: User[];
  branches: Branch[];
  categories: Category[];
  products: Product[];
  branchStocks: BranchProductStock[];
  stockIns: StockInTransaction[];
  stockOuts: StockOutTransaction[];
  sales: SaleTransaction[];
  stockMovements: StockMovement[];
  transfers: BranchTransfer[];
  openingBalances: BranchOpeningBalance[];
  expenses: OperatingExpense[];
  expenseCategories: ExpenseCategoryItem[];

  // Role & Permissions
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isManager: boolean;
  canViewProfit: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canVoidSale: boolean;
  userPermissions: UserPermissions;
  rolePermissions: Record<UserRole, UserPermissions>;

  // Actions
  updateRolePermissions: (role: 'admin' | 'manager', permissions: UserPermissions, applyToExistingUsers?: boolean) => { success: boolean; message: string };
  updateUserPermissions: (userId: string, permissions: UserPermissions) => { success: boolean; message: string };
  addProduct: (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => { success: boolean; message: string; product?: Product };
  updateProduct: (id: string, productData: Partial<Product>) => { success: boolean; message: string };
  checkProductDeletable: (productId: string) => { canDelete: boolean; hasHistory: boolean; canForceDelete?: boolean; reason?: string };
  deleteProductSafe: (productId: string, action: 'delete' | 'archive' | 'force_delete') => { success: boolean; message: string };

  addBranch: (branchData: Omit<Branch, 'id' | 'createdAt'>) => { success: boolean; message: string; branch?: Branch };
  updateBranch: (id: string, branchData: Partial<Branch>) => { success: boolean; message: string };
  checkBranchDeletable: (branchId: string) => { canDelete: boolean; canForceDelete?: boolean; reason?: string };
  deleteBranchSafe: (branchId: string, action: 'delete' | 'deactivate' | 'force_delete') => { success: boolean; message: string };

  addUser: (userData: Omit<User, 'id' | 'createdAt'>) => { success: boolean; message: string };
  updateUser: (id: string, userData: Partial<User>) => { success: boolean; message: string };
  checkUserDeletable: (userId: string) => { canDelete: boolean; reason?: string };
  deleteUserSafe: (userId: string) => { success: boolean; message: string };

  createStockIn: (data: {
    date: string;
    branchId: string;
    supplierName?: string;
    supplierInvoiceNo?: string;
    remarks?: string;
    items: { productId: string; quantity: number; purchasePrice: number }[];
  }) => { success: boolean; message: string; transaction?: StockInTransaction };

  createStockOut: (data: {
    date: string;
    branchId: string;
    reason: StockOutReason;
    referenceDocNo?: string;
    remarks?: string;
    items: { productId: string; quantity: number }[];
  }) => { success: boolean; message: string; transaction?: StockOutTransaction };

  createSale: (data: {
    date: string;
    branchId: string;
    customerName: string;
    customerPhone?: string;
    paymentMethod: PaymentMethod;
    discountType?: DiscountType;
    discountValue?: number;
    notes?: string;
    items: {
      productId: string;
      quantity: number;
      sellingPrice: number;
      isDecant?: boolean;
      decantVariantName?: string;
      decantMlAmount?: number;
    }[];
  }) => { success: boolean; message: string; sale?: SaleTransaction };

  cancelSale: (saleId: string, reason: string) => { success: boolean; message: string };

  createTransfer: (data: {
    date: string;
    sourceBranchId: string;
    destinationBranchId: string;
    productId: string;
    quantity: number;
    notes?: string;
  }) => { success: boolean; message: string; transfer?: BranchTransfer };

  receiveTransfer: (transferId: string) => { success: boolean; message: string };
  cancelTransfer: (transferId: string, reason: string) => { success: boolean; message: string };

  recordOpeningBalance: (data: {
    branchId: string;
    date: string;
    openingCashAmount: number;
    openingBankAmount: number;
    notes?: string;
  }) => { success: boolean; message: string };

  addExpense: (data: {
    branchId: string;
    date: string;
    category: ExpenseCategory;
    amount: number;
    paymentSource: ExpensePaymentSource;
    description: string;
    vendorName?: string;
  }) => { success: boolean; message: string };

  updateExpense: (id: string, data: Partial<OperatingExpense>) => { success: boolean; message: string };
  deleteExpense: (id: string) => { success: boolean; message: string };

  addExpenseCategory: (name: string, description?: string) => { success: boolean; message: string; category?: ExpenseCategoryItem };
  updateExpenseCategory: (id: string, name: string, description?: string) => { success: boolean; message: string };
  deleteExpenseCategory: (id: string) => { success: boolean; message: string };



  getProductStockForBranch: (productId: string, branchId: string) => BranchProductStock | undefined;
  getProductTotalStockAcrossBranches: (productId: string) => number;
  resetAllDataToDefault: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'bestheritage_inventory_v2';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUserState] = useState<User>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_user`);
      return saved ? JSON.parse(saved) : INITIAL_USERS[0];
    } catch {
      return INITIAL_USERS[0];
    }
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);

  const [selectedBranchId, setSelectedBranchIdState] = useState<string>(() => {
    return currentUser.role === 'manager' && currentUser.branchId ? currentUser.branchId : 'all';
  });

  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_users`);
      return saved ? JSON.parse(saved) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  const [branches, setBranches] = useState<Branch[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_branches`);
      return saved ? JSON.parse(saved) : INITIAL_BRANCHES;
    } catch {
      return INITIAL_BRANCHES;
    }
  });

  const [categories] = useState<Category[]>(INITIAL_CATEGORIES);

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_products`);
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [branchStocks, setBranchStocks] = useState<BranchProductStock[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_branch_stocks`);
      return saved ? JSON.parse(saved) : INITIAL_BRANCH_STOCKS;
    } catch {
      return INITIAL_BRANCH_STOCKS;
    }
  });

  const [stockIns, setStockIns] = useState<StockInTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_stock_ins`);
      return saved ? JSON.parse(saved) : INITIAL_STOCK_INS;
    } catch {
      return INITIAL_STOCK_INS;
    }
  });

  const [stockOuts, setStockOuts] = useState<StockOutTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_stock_outs`);
      return saved ? JSON.parse(saved) : INITIAL_STOCK_OUTS;
    } catch {
      return INITIAL_STOCK_OUTS;
    }
  });

  const [sales, setSales] = useState<SaleTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_sales`);
      return saved ? JSON.parse(saved) : INITIAL_SALES;
    } catch {
      return INITIAL_SALES;
    }
  });

  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_movements`);
      return saved ? JSON.parse(saved) : INITIAL_STOCK_MOVEMENTS;
    } catch {
      return INITIAL_STOCK_MOVEMENTS;
    }
  });

  const [transfers, setTransfers] = useState<BranchTransfer[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_transfers`);
      return saved ? JSON.parse(saved) : INITIAL_TRANSFERS;
    } catch {
      return INITIAL_TRANSFERS;
    }
  });

  const [openingBalances, setOpeningBalances] = useState<BranchOpeningBalance[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_opening_balances`);
      return saved ? JSON.parse(saved) : INITIAL_OPENING_BALANCES;
    } catch {
      return INITIAL_OPENING_BALANCES;
    }
  });

  const [expenses, setExpenses] = useState<OperatingExpense[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_expenses`);
      return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
    } catch {
      return INITIAL_EXPENSES;
    }
  });

  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_expense_categories`);
      return saved ? JSON.parse(saved) : INITIAL_EXPENSE_CATEGORIES;
    } catch {
      return INITIAL_EXPENSE_CATEGORIES;
    }
  });

  // Global Role-Based Permissions (Super Admin can configure role defaults for manager and admin)
  const [rolePermissions, setRolePermissions] = useState<Record<UserRole, UserPermissions>>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_role_permissions`);
      return saved ? JSON.parse(saved) : INITIAL_ROLE_PERMISSIONS;
    } catch {
      return INITIAL_ROLE_PERMISSIONS;
    }
  });

  // LocalStorage synchronizations
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_user`, JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(users));
    localStorage.setItem(`${STORAGE_KEY}_branches`, JSON.stringify(branches));
    localStorage.setItem(`${STORAGE_KEY}_products`, JSON.stringify(products));
    localStorage.setItem(`${STORAGE_KEY}_branch_stocks`, JSON.stringify(branchStocks));
    localStorage.setItem(`${STORAGE_KEY}_stock_ins`, JSON.stringify(stockIns));
    localStorage.setItem(`${STORAGE_KEY}_stock_outs`, JSON.stringify(stockOuts));
    localStorage.setItem(`${STORAGE_KEY}_sales`, JSON.stringify(sales));
    localStorage.setItem(`${STORAGE_KEY}_movements`, JSON.stringify(stockMovements));
    localStorage.setItem(`${STORAGE_KEY}_transfers`, JSON.stringify(transfers));
    localStorage.setItem(`${STORAGE_KEY}_opening_balances`, JSON.stringify(openingBalances));
    localStorage.setItem(`${STORAGE_KEY}_expenses`, JSON.stringify(expenses));
    localStorage.setItem(`${STORAGE_KEY}_expense_categories`, JSON.stringify(expenseCategories));
    localStorage.setItem(`${STORAGE_KEY}_role_permissions`, JSON.stringify(rolePermissions));
  }, [users, branches, products, branchStocks, stockIns, stockOuts, sales, stockMovements, transfers, openingBalances, expenses, expenseCategories, rolePermissions]);

  // Role booleans
  const isSuperAdmin = currentUser.role === 'super_admin';
  const isAdmin = currentUser.role === 'admin';
  const isManager = currentUser.role === 'manager';

  // Dynamic user permissions (Super admin has all permissions; others respect custom permissions or role defaults)
  const userPermissions = useMemo<UserPermissions>(() => {
    if (currentUser.role === 'super_admin') {
      return rolePermissions.super_admin || getDefaultPermissionsForRole('super_admin');
    }
    if (currentUser.permissions) {
      return currentUser.permissions;
    }
    return rolePermissions[currentUser.role] || getDefaultPermissionsForRole(currentUser.role);
  }, [currentUser, rolePermissions]);

  const canViewProfit = isSuperAdmin || userPermissions.canViewProfit;
  const canAdd = isSuperAdmin || userPermissions.canAdd;
  const canEdit = isSuperAdmin || userPermissions.canEdit;
  const canDelete = isSuperAdmin || userPermissions.canDelete;
  const canVoidSale = isSuperAdmin || userPermissions.canVoidSale || userPermissions.canDelete;

  // Auto-enforce menu permissions if activeTab is not allowed for the non-super_admin user
  useEffect(() => {
    if (currentUser.role !== 'super_admin') {
      const allowed = userPermissions.allowedTabs;
      if (allowed && allowed.length > 0 && !allowed.includes(activeTab)) {
        setActiveTab(allowed[0]);
      }
    }
  }, [currentUser, userPermissions, activeTab]);

  // Update permissions globally for an entire role (Super Admin only: Manager, Admin)
  const updateRolePermissions = (
    role: 'admin' | 'manager',
    permissions: UserPermissions,
    applyToExistingUsers: boolean = true
  ) => {
    if (!isSuperAdmin) {
      return { success: false, message: 'Unauthorized: Only Super Admin can modify role permissions.' };
    }

    setRolePermissions((prev) => ({
      ...prev,
      [role]: permissions,
    }));

    if (applyToExistingUsers) {
      setUsers((prev) =>
        prev.map((u) => (u.role === role ? { ...u, permissions } : u))
      );
      if (currentUser.role === role) {
        setCurrentUserState((prev) => ({
          ...prev,
          permissions,
        }));
      }
    }

    return {
      success: true,
      message: `Menu and action permissions for "${role === 'admin' ? 'Administrator' : 'Branch Manager'}" role updated successfully!`,
    };
  };

  // Update permissions for a specific user (Super Admin only)
  const updateUserPermissions = (userId: string, permissions: UserPermissions) => {
    if (!isSuperAdmin) {
      return { success: false, message: 'Unauthorized: Only Super Admin can modify user permissions.' };
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, permissions } : u))
    );
    if (currentUser.id === userId) {
      setCurrentUserState((prev) => ({
        ...prev,
        permissions,
      }));
    }
    return { success: true, message: 'Permissions updated successfully.' };
  };

  // Enforce branch constraint for manager
  const setCurrentUser = (user: User) => {
    setCurrentUserState(user);
    if (user.role === 'manager' && user.branchId) {
      setSelectedBranchIdState(user.branchId);
    }
  };

  const setSelectedBranchId = (branchId: string) => {
    if (currentUser.role === 'manager' && currentUser.branchId) {
      setSelectedBranchIdState(currentUser.branchId);
      return;
    }
    setSelectedBranchIdState(branchId);
  };

  const getProductStockForBranch = (productId: string, branchId: string): BranchProductStock | undefined => {
    return branchStocks.find((s) => s.productId === productId && s.branchId === branchId);
  };

  const getProductTotalStockAcrossBranches = (productId: string): number => {
    return branchStocks
      .filter((s) => s.productId === productId)
      .reduce((sum, s) => sum + s.currentStock, 0);
  };

  // Safe Deletion checks
  const checkProductDeletable = (productId: string) => {
    const hasSales = sales.some((s) => s.items.some((i) => i.productId === productId));
    const hasStockIn = stockIns.some((s) => s.items.some((i) => i.productId === productId));
    const hasStockOut = stockOuts.some((s) => s.items.some((i) => i.productId === productId));
    const hasTransfers = transfers.some((t) => t.productId === productId);
    const totalStock = getProductTotalStockAcrossBranches(productId);

    const hasHistory = hasSales || hasStockIn || hasStockOut || hasTransfers;

    if (totalStock > 0) {
      return {
        canDelete: false,
        canForceDelete: isSuperAdmin,
        hasHistory,
        reason: `This product has ${totalStock} units of active stock across branches.`,
      };
    }

    if (hasHistory) {
      return {
        canDelete: false,
        canForceDelete: isSuperAdmin,
        hasHistory: true,
        reason: 'This product has historical sales or stock transaction records.',
      };
    }

    return { canDelete: true, canForceDelete: isSuperAdmin, hasHistory: false };
  };

  const deleteProductSafe = (productId: string, action: 'delete' | 'archive' | 'force_delete') => {
    if (!isSuperAdmin) {
      return { success: false, message: 'Unauthorized: Only Super Admin can delete or archive master products.' };
    }

    const prod = products.find((p) => p.id === productId);
    if (!prod) return { success: false, message: 'Product not found.' };

    if (action === 'archive') {
      setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, status: 'inactive' } : p)));
      return { success: true, message: `Product "${prod.name}" has been deactivated. It will no longer appear in POS or active stock.` };
    }

    if (action === 'force_delete' || (action === 'delete' && isSuperAdmin)) {
      // Super Admin explicit master deletion: removes product and associated branch stocks
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      setBranchStocks((prev) => prev.filter((s) => s.productId !== productId));
      return { success: true, message: `Product "${prod.name}" permanently deleted by Super Admin.` };
    }

    const check = checkProductDeletable(productId);
    if (!check.canDelete) {
      return { success: false, message: check.reason || 'Cannot delete product.' };
    }

    // Safe to permanently delete
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    setBranchStocks((prev) => prev.filter((s) => s.productId !== productId));
    return { success: true, message: `Product "${prod.name}" permanently deleted.` };
  };

  const checkBranchDeletable = (branchId: string) => {
    const hasSales = sales.some((s) => s.branchId === branchId);
    const hasStocks = branchStocks.some((s) => s.branchId === branchId && s.currentStock > 0);
    const hasMovements = stockMovements.some((m) => m.branchId === branchId);
    const hasUsers = users.some((u) => u.branchId === branchId);

    if (hasStocks) {
      return { canDelete: false, canForceDelete: isSuperAdmin, reason: 'This branch currently holds active inventory.' };
    }
    if (hasSales || hasMovements || hasUsers) {
      return { canDelete: false, canForceDelete: isSuperAdmin, reason: 'This branch has associated sales or staff records.' };
    }
    return { canDelete: true, canForceDelete: isSuperAdmin };
  };

  const deleteBranchSafe = (branchId: string, action: 'delete' | 'deactivate' | 'force_delete') => {
    if (!isSuperAdmin) {
      return { success: false, message: 'Unauthorized: Only Super Admin can manage branch deletion.' };
    }

    const branch = branches.find((b) => b.id === branchId);
    if (!branch) return { success: false, message: 'Branch not found.' };

    if (action === 'deactivate') {
      setBranches((prev) => prev.map((b) => (b.id === branchId ? { ...b, isActive: false } : b)));
      return { success: true, message: `Branch "${branch.name}" is now inactive.` };
    }

    if (action === 'force_delete' || (action === 'delete' && isSuperAdmin)) {
      setBranches((prev) => prev.filter((b) => b.id !== branchId));
      setBranchStocks((prev) => prev.filter((s) => s.branchId !== branchId));
      return { success: true, message: `Branch "${branch.name}" permanently deleted by Super Admin.` };
    }

    const check = checkBranchDeletable(branchId);
    if (!check.canDelete) {
      return { success: false, message: check.reason || 'Cannot delete branch.' };
    }

    setBranches((prev) => prev.filter((b) => b.id !== branchId));
    setBranchStocks((prev) => prev.filter((s) => s.branchId !== branchId));
    return { success: true, message: `Branch "${branch.name}" permanently deleted.` };
  };

  const checkUserDeletable = (userId: string) => {
    if (userId === currentUser.id) {
      return { canDelete: false, reason: 'You cannot delete your own currently active account.' };
    }
    const targetUser = users.find((u) => u.id === userId);
    if (targetUser?.role === 'super_admin') {
      const superAdminCount = users.filter((u) => u.role === 'super_admin' && u.status === 'active').length;
      if (superAdminCount <= 1) {
        return { canDelete: false, reason: 'System must have at least one active Super Admin account.' };
      }
    }
    return { canDelete: true };
  };

  const deleteUserSafe = (userId: string) => {
    if (!isSuperAdmin) {
      return { success: false, message: 'Unauthorized: Only Super Admin can delete users.' };
    }
    const check = checkUserDeletable(userId);
    if (!check.canDelete) {
      return { success: false, message: check.reason || 'Cannot delete user.' };
    }

    setUsers((prev) => prev.filter((u) => u.id !== userId));
    return { success: true, message: 'User account deleted successfully.' };
  };

  // Add Product
  const addProduct = (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const existingSku = products.find((p) => p.sku.toLowerCase() === productData.sku.toLowerCase());
    if (existingSku) {
      return { success: false, message: `Product with SKU "${productData.sku}" already exists.` };
    }

    const newProductId = `prod_${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];
    const category = categories.find((c) => c.id === productData.categoryId);

    const newProduct: Product = {
      ...productData,
      id: newProductId,
      categoryName: category?.name || 'Cosmetic Products',
      createdAt: today,
    };

    setProducts((prev) => [newProduct, ...prev]);

    // Initialize branch stock records for all active branches
    const newBranchStocks: BranchProductStock[] = branches.map((branch, idx) => ({
      id: `bps_${Date.now()}_${idx}`,
      branchId: branch.id,
      productId: newProductId,
      openingStock: idx === 0 ? productData.openingStock : 0,
      stockIn: 0,
      stockOut: 0,
      quantitySold: 0,
      salesReturn: 0,
      purchaseReturn: 0,
      currentStock: idx === 0 ? productData.openingStock : 0,
      minAlertLevel: productData.minAlertLevel,
      lastUpdated: new Date().toLocaleString(),
    }));

    setBranchStocks((prev) => [...prev, ...newBranchStocks]);

    if (productData.openingStock > 0 && branches.length > 0) {
      const initialMovement: StockMovement = {
        id: `mov_${Date.now()}`,
        timestamp: new Date().toLocaleString(),
        date: today,
        branchId: branches[0].id,
        branchName: branches[0].name,
        productId: newProductId,
        productName: newProduct.name,
        sku: newProduct.sku,
        type: 'opening',
        quantityChange: productData.openingStock,
        balanceAfter: productData.openingStock,
        referenceNo: 'INIT-OPENING',
        notes: 'Initial opening stock setup',
        userId: currentUser.id,
        userName: currentUser.name,
      };
      setStockMovements((prev) => [initialMovement, ...prev]);
    }

    return { success: true, message: `Product "${newProduct.name}" created successfully.`, product: newProduct };
  };

  // Update Product (Master updates propagate cleanly)
  const updateProduct = (id: string, productData: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const category = productData.categoryId ? categories.find((c) => c.id === productData.categoryId) : undefined;
        return {
          ...p,
          ...productData,
          categoryName: category ? category.name : p.categoryName,
          updatedAt: new Date().toISOString().split('T')[0],
        };
      })
    );

    if (productData.minAlertLevel !== undefined) {
      setBranchStocks((prev) =>
        prev.map((s) => (s.productId === id ? { ...s, minAlertLevel: productData.minAlertLevel! } : s))
      );
    }

    return { success: true, message: 'Product updated successfully.' };
  };

  // Add Branch
  const addBranch = (branchData: Omit<Branch, 'id' | 'createdAt'>) => {
    const existingCode = branches.find((b) => b.code.toLowerCase() === branchData.code.toLowerCase());
    if (existingCode) {
      return { success: false, message: `Branch Code "${branchData.code}" already exists.` };
    }

    const newBranchId = `br_${Date.now()}`;
    const newBranch: Branch = {
      ...branchData,
      id: newBranchId,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setBranches((prev) => [...prev, newBranch]);

    const newStocks: BranchProductStock[] = products.map((prod, idx) => ({
      id: `bps_${Date.now()}_${idx}`,
      branchId: newBranchId,
      productId: prod.id,
      openingStock: 0,
      stockIn: 0,
      stockOut: 0,
      quantitySold: 0,
      salesReturn: 0,
      purchaseReturn: 0,
      currentStock: 0,
      minAlertLevel: prod.minAlertLevel,
      lastUpdated: new Date().toLocaleString(),
    }));

    setBranchStocks((prev) => [...prev, ...newStocks]);

    return { success: true, message: `Branch "${newBranch.name}" created successfully.`, branch: newBranch };
  };

  // Update Branch
  const updateBranch = (id: string, branchData: Partial<Branch>) => {
    setBranches((prev) => prev.map((b) => (b.id === id ? { ...b, ...branchData } : b)));
    return { success: true, message: 'Branch updated successfully.' };
  };

  // Add User
  const addUser = (userData: Omit<User, 'id' | 'createdAt'>) => {
    const existingEmail = users.find((u) => u.email.toLowerCase() === userData.email.toLowerCase());
    if (existingEmail) {
      return { success: false, message: `User with email "${userData.email}" already exists.` };
    }

    const branch = branches.find((b) => b.id === userData.branchId);

    const newUser: User = {
      ...userData,
      id: `usr_${Date.now()}`,
      branchName: branch?.name,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setUsers((prev) => [...prev, newUser]);
    return { success: true, message: `User "${newUser.name}" added successfully.` };
  };

  const updateUser = (id: string, userData: Partial<User>) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        const branch = userData.branchId ? branches.find((b) => b.id === userData.branchId) : undefined;
        return {
          ...u,
          ...userData,
          branchName: userData.branchId ? (branch ? branch.name : u.branchName) : u.branchName,
        };
      })
    );

    if (id === currentUser.id) {
      setCurrentUserState((prev) => {
        const branch = userData.branchId ? branches.find((b) => b.id === userData.branchId) : undefined;
        return {
          ...prev,
          ...userData,
          branchName: userData.branchId ? (branch ? branch.name : prev.branchName) : prev.branchName,
        };
      });
    }

    return { success: true, message: 'User updated successfully.' };
  };

  // Stock In (Automatic Stock Increase + Movements)
  const createStockIn = (data: {
    date: string;
    branchId: string;
    supplierName?: string;
    supplierInvoiceNo?: string;
    remarks?: string;
    items: { productId: string; quantity: number; purchasePrice: number }[];
  }) => {
    if (currentUser.role === 'manager' && currentUser.branchId && data.branchId !== currentUser.branchId) {
      return { success: false, message: 'Security Violation: You cannot record Stock In for another branch.' };
    }

    const branch = branches.find((b) => b.id === data.branchId);
    if (!branch) return { success: false, message: 'Invalid branch selected.' };
    if (!data.items || data.items.length === 0) return { success: false, message: 'No items provided for Stock In.' };

    const refNo = `SIN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    let totalQuantity = 0;
    let totalPurchaseCost = 0;
    const itemsWithDetails = data.items.map((item, idx) => {
      const prod = products.find((p) => p.id === item.productId);
      const cost = Number((item.quantity * item.purchasePrice).toFixed(2));
      totalQuantity += item.quantity;
      totalPurchaseCost += cost;

      const pkgSize = prod?.packageSize || prod?.bottleCapacityMl || prod?.decantConfig?.bottleCapacityMl;
      const pkgUnit = prod?.packageUnit || (prod?.categoryName === 'Perfume Products' ? 'ml' : 'g');
      const totalVolWeight = pkgSize ? `${pkgSize * item.quantity} ${pkgUnit}` : undefined;

      return {
        id: `sii_${Date.now()}_${idx}`,
        productId: item.productId,
        productName: prod?.name || 'Product',
        sku: prod?.sku || 'SKU',
        categoryName: prod?.categoryName || 'Cosmetic Products',
        quantity: item.quantity,
        purchasePrice: item.purchasePrice,
        totalCost: cost,
        packageSize: pkgSize,
        packageUnit: pkgUnit,
        totalVolumeWeight: totalVolWeight,
      };
    });

    const newTx: StockInTransaction = {
      id: `stk_in_${Date.now()}`,
      referenceNo: refNo,
      date: data.date,
      branchId: data.branchId,
      branchName: branch.name,
      supplierName: data.supplierName || 'General Supplier',
      supplierInvoiceNo: data.supplierInvoiceNo || '',
      remarks: data.remarks || '',
      items: itemsWithDetails,
      totalQuantity,
      totalPurchaseCost: Number(totalPurchaseCost.toFixed(2)),
      createdByUserId: currentUser.id,
      createdByName: currentUser.name,
      createdAt: new Date().toLocaleString(),
    };

    const movementsToAdd: StockMovement[] = [];

    setBranchStocks((prev) => {
      const updated = [...prev];
      for (const item of itemsWithDetails) {
        const index = updated.findIndex((s) => s.branchId === data.branchId && s.productId === item.productId);
        const prod = products.find((p) => p.id === item.productId);
        if (index >= 0) {
          const current = updated[index];
          const newCurrentStock = current.currentStock + item.quantity;
          updated[index] = {
            ...current,
            stockIn: current.stockIn + item.quantity,
            currentStock: newCurrentStock,
            lastUpdated: new Date().toLocaleString(),
          };

          movementsToAdd.push({
            id: `mov_${Date.now()}_${item.productId}`,
            timestamp: new Date().toLocaleString(),
            date: data.date,
            branchId: data.branchId,
            branchName: branch.name,
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            type: 'stock_in',
            quantityChange: item.quantity,
            balanceAfter: newCurrentStock,
            referenceNo: refNo,
            notes: data.supplierName ? `From: ${data.supplierName}` : data.remarks,
            userId: currentUser.id,
            userName: currentUser.name,
          });
        } else {
          const newCurrentStock = item.quantity;
          updated.push({
            id: `bps_${Date.now()}_${item.productId}`,
            branchId: data.branchId,
            productId: item.productId,
            openingStock: 0,
            stockIn: item.quantity,
            stockOut: 0,
            quantitySold: 0,
            salesReturn: 0,
            purchaseReturn: 0,
            currentStock: newCurrentStock,
            minAlertLevel: prod?.minAlertLevel || 10,
            lastUpdated: new Date().toLocaleString(),
          });

          movementsToAdd.push({
            id: `mov_${Date.now()}_${item.productId}`,
            timestamp: new Date().toLocaleString(),
            date: data.date,
            branchId: data.branchId,
            branchName: branch.name,
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            type: 'stock_in',
            quantityChange: item.quantity,
            balanceAfter: newCurrentStock,
            referenceNo: refNo,
            notes: data.supplierName ? `From: ${data.supplierName}` : data.remarks,
            userId: currentUser.id,
            userName: currentUser.name,
          });
        }
      }
      return updated;
    });

    setStockIns((prev) => [newTx, ...prev]);
    setStockMovements((prev) => [...movementsToAdd, ...prev]);

    return { success: true, message: `Stock In recorded successfully. Ref: ${refNo}`, transaction: newTx };
  };

  // Stock Out (With validation against available stock)
  const createStockOut = (data: {
    date: string;
    branchId: string;
    reason: StockOutReason;
    referenceDocNo?: string;
    remarks?: string;
    items: { productId: string; quantity: number }[];
  }) => {
    if (currentUser.role === 'manager' && currentUser.branchId && data.branchId !== currentUser.branchId) {
      return { success: false, message: 'Security Violation: You cannot record Stock Out for another branch.' };
    }

    const branch = branches.find((b) => b.id === data.branchId);
    if (!branch) return { success: false, message: 'Invalid branch selected.' };
    if (!data.items || data.items.length === 0) return { success: false, message: 'No items provided for Stock Out.' };

    for (const item of data.items) {
      const stock = branchStocks.find((s) => s.branchId === data.branchId && s.productId === item.productId);
      const available = stock ? stock.currentStock : 0;
      const prod = products.find((p) => p.id === item.productId);
      const pName = prod ? prod.name : 'Selected product';

      if (item.quantity <= 0) {
        return { success: false, message: `Quantity for "${pName}" must be greater than zero.` };
      }

      if (item.quantity > available) {
        return {
          success: false,
          message: `Cannot stock out ${item.quantity} units of "${pName}". Only ${available} available in ${branch.name}.`,
        };
      }
    }

    const refNo = `SOUT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    let totalQuantity = 0;
    const itemsWithDetails = data.items.map((item, idx) => {
      const prod = products.find((p) => p.id === item.productId);
      totalQuantity += item.quantity;
      return {
        id: `soi_${Date.now()}_${idx}`,
        productId: item.productId,
        productName: prod?.name || 'Product',
        sku: prod?.sku || 'SKU',
        categoryName: prod?.categoryName || 'Cosmetic Products',
        quantity: item.quantity,
      };
    });

    const newTx: StockOutTransaction = {
      id: `stk_out_${Date.now()}`,
      referenceNo: refNo,
      date: data.date,
      branchId: data.branchId,
      branchName: branch.name,
      reason: data.reason,
      referenceDocNo: data.referenceDocNo,
      remarks: data.remarks,
      items: itemsWithDetails,
      totalQuantity,
      createdByUserId: currentUser.id,
      createdByName: currentUser.name,
      createdAt: new Date().toLocaleString(),
    };

    const movementsToAdd: StockMovement[] = [];

    setBranchStocks((prev) => {
      const updated = [...prev];
      for (const item of itemsWithDetails) {
        const index = updated.findIndex((s) => s.branchId === data.branchId && s.productId === item.productId);
        if (index >= 0) {
          const current = updated[index];
          const newCurrentStock = current.currentStock - item.quantity;
          updated[index] = {
            ...current,
            stockOut: current.stockOut + item.quantity,
            currentStock: newCurrentStock,
            lastUpdated: new Date().toLocaleString(),
          };

          movementsToAdd.push({
            id: `mov_${Date.now()}_${item.productId}`,
            timestamp: new Date().toLocaleString(),
            date: data.date,
            branchId: data.branchId,
            branchName: branch.name,
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            type: 'stock_out',
            quantityChange: -item.quantity,
            balanceAfter: newCurrentStock,
            referenceNo: refNo,
            notes: `${data.reason}: ${data.remarks || 'Stock Out adjustment'}`,
            userId: currentUser.id,
            userName: currentUser.name,
          });
        }
      }
      return updated;
    });

    setStockOuts((prev) => [newTx, ...prev]);
    setStockMovements((prev) => [...movementsToAdd, ...prev]);

    return { success: true, message: `Stock Out completed successfully. Ref: ${refNo}`, transaction: newTx };
  };

  // Sales Entry
  const createSale = (data: {
    date: string;
    branchId: string;
    customerName: string;
    customerPhone?: string;
    paymentMethod: PaymentMethod;
    discountType?: DiscountType;
    discountValue?: number;
    notes?: string;
    items: {
      productId: string;
      quantity: number;
      sellingPrice: number;
      isDecant?: boolean;
      decantVariantName?: string;
      decantMlAmount?: number;
    }[];
  }) => {
    if (currentUser.role === 'manager' && currentUser.branchId && data.branchId !== currentUser.branchId) {
      return { success: false, message: 'Security Violation: You cannot create sales for another branch.' };
    }

    const branch = branches.find((b) => b.id === data.branchId);
    if (!branch) return { success: false, message: 'Invalid branch selected.' };
    if (!data.paymentMethod) return { success: false, message: 'Payment method is required.' };
    if (!data.items || data.items.length === 0) return { success: false, message: 'No items in sale.' };

    for (const item of data.items) {
      const prod = products.find((p) => p.id === item.productId);
      const pName = prod ? prod.name : 'Selected product';

      if (prod?.status === 'inactive') {
        return { success: false, message: `Cannot sell "${pName}": product is inactive.` };
      }

      const stock = branchStocks.find((s) => s.branchId === data.branchId && s.productId === item.productId);
      const available = stock ? stock.currentStock : 0;

      if (item.quantity <= 0) {
        return { success: false, message: `Quantity for "${pName}" must be greater than zero.` };
      }

      if (item.isDecant && item.decantMlAmount) {
        const prod2 = prod;
        const capacity = prod2?.bottleCapacityMl || prod2?.decantConfig?.bottleCapacityMl || 100;
        const totalMlNeeded = item.decantMlAmount * item.quantity;
        const currentOpenMl = stock?.openBottleMlRemaining || 0;
        const totalAvailableMl = currentOpenMl + (available * capacity);

        if (totalMlNeeded > totalAvailableMl) {
          return {
            success: false,
            message: `Cannot sell ${item.decantMlAmount} ml of "${pName}". Only ${totalAvailableMl} ml available (open + sealed bottles) in ${branch.name}.`,
          };
        }
      } else {
        if (item.quantity > available) {
          return {
            success: false,
            message: `Cannot sell ${item.quantity} units of "${pName}". Only ${available} available in ${branch.name}.`,
          };
        }
      }
    }

    const invoiceNo = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    let totalQuantitySold = 0;
    const saleItems = data.items.map((item, idx) => {
      const prod = products.find((p) => p.id === item.productId);
      let purchaseCost = prod ? prod.purchasePrice : 0;

      if (item.isDecant && item.decantMlAmount) {
        const capacity = prod?.bottleCapacityMl || prod?.decantConfig?.bottleCapacityMl || 100;
        purchaseCost = calculateDecantItemCost(prod?.purchasePrice || 0, capacity, item.decantMlAmount);
      }

      const sellingPrice = item.sellingPrice;
      const totalCost = Number((item.quantity * purchaseCost).toFixed(2));
      const totalSales = Number((item.quantity * sellingPrice).toFixed(2));
      const grossProfit = Number((totalSales - totalCost).toFixed(2));

      totalQuantitySold += item.quantity;

      return {
        id: `sli_${Date.now()}_${idx}`,
        productId: item.productId,
        productName: prod?.name || 'Product',
        sku: prod?.sku || 'SKU',
        categoryName: prod?.categoryName || 'Cosmetic Products',
        quantity: item.quantity,
        purchaseCost,
        sellingPrice,
        totalCost,
        totalSales,
        grossProfit,
        isDecant: item.isDecant,
        decantVariantName: item.decantVariantName,
        decantMlAmount: item.decantMlAmount,
      };
    });

    const subtotal = Number(saleItems.reduce((acc, si) => acc + si.totalSales, 0).toFixed(2));
    const discType = data.discountType || 'fixed';
    const discVal = Math.max(0, Number(data.discountValue) || 0);
    const discAmount = calculateDiscountAmount(subtotal, discType, discVal);

    const totals = calculateSaleTotals(
      saleItems.map((si) => ({
        quantity: si.quantity,
        purchaseCost: si.purchaseCost,
        sellingPrice: si.sellingPrice,
      })),
      discAmount
    );

    const newSale: SaleTransaction = {
      id: `sale_${Date.now()}`,
      invoiceNo,
      date: data.date,
      branchId: data.branchId,
      branchName: branch.name,
      customerName: data.customerName.trim() || 'Walk-in Customer',
      customerPhone: data.customerPhone?.trim(),
      paymentMethod: data.paymentMethod,
      notes: data.notes,
      items: saleItems,
      totalQuantitySold,
      subtotal: totals.subtotal,
      discountType: discVal > 0 ? discType : undefined,
      discountValue: discVal > 0 ? discVal : undefined,
      discountAmount: totals.discountAmount,
      totalCostOfGoodsSold: totals.totalCost,
      totalSalesAmount: totals.totalSales,
      grossProfit: totals.grossProfit,
      createdByUserId: currentUser.id,
      createdByName: currentUser.name,
      status: 'completed',
      createdAt: new Date().toLocaleString(),
    };

    const movementsToAdd: StockMovement[] = [];

    setBranchStocks((prev) => {
      const updated = [...prev];
      for (const item of saleItems) {
        const index = updated.findIndex((s) => s.branchId === data.branchId && s.productId === item.productId);
        if (index >= 0) {
          const current = updated[index];
          const prod = products.find((p) => p.id === item.productId);

          if (item.isDecant && item.decantMlAmount) {
            const capacity = prod?.bottleCapacityMl || prod?.decantConfig?.bottleCapacityMl || 100;
            const mlSold = item.decantMlAmount * item.quantity;

            const decantRes = calculateDecantStockDeduction({
              currentStock: current.currentStock,
              currentOpenBottleMl: current.openBottleMlRemaining,
              bottleCapacityMl: capacity,
              wastageMl: 0,
              mlSold,
            });

            updated[index] = {
              ...current,
              currentStock: decantRes.newCurrentStock,
              openBottleMlRemaining: decantRes.newOpenBottleMl,
              quantitySold: current.quantitySold + decantRes.bottlesDecremented,
              lastUpdated: new Date().toLocaleString(),
            };

            movementsToAdd.push({
              id: `mov_${Date.now()}_${item.productId}`,
              timestamp: new Date().toLocaleString(),
              date: data.date,
              branchId: data.branchId,
              branchName: branch.name,
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              type: 'sale',
              quantityChange: -decantRes.bottlesDecremented,
              balanceAfter: decantRes.newCurrentStock,
              referenceNo: invoiceNo,
              notes: `Decanted sale: ${item.quantity}x ${item.decantVariantName || ''} (${mlSold}ml). Open bottle: ${decantRes.newOpenBottleMl}ml remaining. Sold to: ${newSale.customerName} (${data.paymentMethod})`,
              userId: currentUser.id,
              userName: currentUser.name,
            });
          } else {
            const newCurrentStock = current.currentStock - item.quantity;
            updated[index] = {
              ...current,
              quantitySold: current.quantitySold + item.quantity,
              currentStock: newCurrentStock,
              lastUpdated: new Date().toLocaleString(),
            };

            movementsToAdd.push({
              id: `mov_${Date.now()}_${item.productId}`,
              timestamp: new Date().toLocaleString(),
              date: data.date,
              branchId: data.branchId,
              branchName: branch.name,
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              type: 'sale',
              quantityChange: -item.quantity,
              balanceAfter: newCurrentStock,
              referenceNo: invoiceNo,
              notes: `Sold to: ${newSale.customerName} (${data.paymentMethod})`,
              userId: currentUser.id,
              userName: currentUser.name,
            });
          }
        }
      }
      return updated;
    });

    setSales((prev) => [newSale, ...prev]);
    setStockMovements((prev) => [...movementsToAdd, ...prev]);

    return { success: true, message: `Sale completed! Invoice: ${invoiceNo}`, sale: newSale };
  };

  // Void Sale
  const cancelSale = (saleId: string, reason: string) => {
    if (!isSuperAdmin && !canVoidSale && !canDelete) {
      return { success: false, message: 'Unauthorized: You do not have permission to void sales invoices. Contact Super Admin.' };
    }

    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return { success: false, message: 'Sale not found.' };
    if (sale.status === 'cancelled') return { success: false, message: 'Sale is already cancelled.' };

    const movementsToAdd: StockMovement[] = [];

    setBranchStocks((prev) => {
      const updated = [...prev];
      for (const item of sale.items) {
        const index = updated.findIndex((s) => s.branchId === sale.branchId && s.productId === item.productId);
        if (index >= 0) {
          const current = updated[index];
          const prod = products.find((p) => p.id === item.productId);

          if (item.isDecant && item.decantMlAmount) {
            const capacity = prod?.bottleCapacityMl || prod?.decantConfig?.bottleCapacityMl || 100;
            const mlRestored = item.decantMlAmount * item.quantity;

            const restoreRes = calculateDecantCancelRestore({
              currentStock: current.currentStock,
              currentOpenBottleMl: current.openBottleMlRemaining,
              bottleCapacityMl: capacity,
              wastageMl: 0,
              mlRestored,
            });

            updated[index] = {
              ...current,
              currentStock: restoreRes.newCurrentStock,
              openBottleMlRemaining: restoreRes.newOpenBottleMl,
              quantitySold: Math.max(0, current.quantitySold - restoreRes.bottlesIncremented),
              lastUpdated: new Date().toLocaleString(),
            };

            movementsToAdd.push({
              id: `mov_cancel_${Date.now()}_${item.productId}`,
              timestamp: new Date().toLocaleString(),
              date: new Date().toISOString().split('T')[0],
              branchId: sale.branchId,
              branchName: sale.branchName,
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              type: 'sale_cancellation',
              quantityChange: restoreRes.bottlesIncremented,
              balanceAfter: restoreRes.newCurrentStock,
              referenceNo: sale.invoiceNo,
              notes: `Void Decant Sale: Restored ${mlRestored}ml (${restoreRes.bottlesIncremented} bottle restored). Reason: ${reason}`,
              userId: currentUser.id,
              userName: currentUser.name,
            });
          } else {
            const restoredCurrentStock = current.currentStock + item.quantity;
            updated[index] = {
              ...current,
              quantitySold: Math.max(0, current.quantitySold - item.quantity),
              currentStock: restoredCurrentStock,
              lastUpdated: new Date().toLocaleString(),
            };

            movementsToAdd.push({
              id: `mov_cancel_${Date.now()}_${item.productId}`,
              timestamp: new Date().toLocaleString(),
              date: new Date().toISOString().split('T')[0],
              branchId: sale.branchId,
              branchName: sale.branchName,
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              type: 'sale_cancellation',
              quantityChange: item.quantity,
              balanceAfter: restoredCurrentStock,
              referenceNo: sale.invoiceNo,
              notes: `Void Sale Invoice: ${reason}`,
              userId: currentUser.id,
              userName: currentUser.name,
            });
          }
        }
      }
      return updated;
    });

    setSales((prev) =>
      prev.map((s) =>
        s.id === saleId
          ? {
              ...s,
              status: 'cancelled',
              cancellationReason: reason,
              cancelledAt: new Date().toLocaleString(),
              cancelledByName: currentUser.name,
            }
          : s
      )
    );

    setStockMovements((prev) => [...movementsToAdd, ...prev]);

    return { success: true, message: `Sale ${sale.invoiceNo} cancelled. Stock restored to ${sale.branchName}.` };
  };


  // Branch Transfer Workflow
  const createTransfer = (data: {
    date: string;
    sourceBranchId: string;
    destinationBranchId: string;
    productId: string;
    quantity: number;
    notes?: string;
  }) => {
    if (data.sourceBranchId === data.destinationBranchId) {
      return { success: false, message: 'Source and destination branches cannot be the same.' };
    }

    if (currentUser.role === 'manager' && currentUser.branchId && data.sourceBranchId !== currentUser.branchId) {
      return { success: false, message: 'You can only dispatch transfers originating from your assigned branch.' };
    }

    const sourceBranch = branches.find((b) => b.id === data.sourceBranchId);
    const destBranch = branches.find((b) => b.id === data.destinationBranchId);
    const prod = products.find((p) => p.id === data.productId);

    if (!sourceBranch || !destBranch || !prod) {
      return { success: false, message: 'Invalid transfer details.' };
    }

    const sourceStock = branchStocks.find((s) => s.branchId === data.sourceBranchId && s.productId === data.productId);
    const available = sourceStock ? sourceStock.currentStock : 0;

    const check = canInitiateTransfer(available, data.quantity);
    if (!check.allowed) {
      return { success: false, message: check.message || 'Transfer quantity invalid.' };
    }

    const transferNo = `TRF-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    const unitPurchaseCost = prod.purchasePrice;
    const totalTransferCost = Number((data.quantity * unitPurchaseCost).toFixed(2));

    const newTransfer: BranchTransfer = {
      id: `trf_${Date.now()}`,
      transferNo,
      date: data.date,
      sourceBranchId: data.sourceBranchId,
      sourceBranchName: sourceBranch.name,
      destinationBranchId: data.destinationBranchId,
      destinationBranchName: destBranch.name,
      productId: data.productId,
      productName: prod.name,
      sku: prod.sku,
      categoryName: prod.categoryName,
      quantity: data.quantity,
      unitPurchaseCost,
      totalTransferCost,
      status: 'Dispatched', // Automatically deducts from source branch upon dispatch
      notes: data.notes || '',
      dispatchedBy: currentUser.name,
      dispatchedAt: new Date().toLocaleString(),
      createdAt: new Date().toLocaleString(),
    };

    // Decrement source branch stock immediately
    let newSourceStock = 0;
    setBranchStocks((prev) =>
      prev.map((s) => {
        if (s.branchId === data.sourceBranchId && s.productId === data.productId) {
          newSourceStock = s.currentStock - data.quantity;
          return {
            ...s,
            stockOut: s.stockOut + data.quantity,
            currentStock: newSourceStock,
            lastUpdated: new Date().toLocaleString(),
          };
        }
        return s;
      })
    );

    // Movement for dispatch
    const movement: StockMovement = {
      id: `mov_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      date: data.date,
      branchId: data.sourceBranchId,
      branchName: sourceBranch.name,
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      type: 'transfer_out',
      quantityChange: -data.quantity,
      balanceAfter: newSourceStock,
      referenceNo: transferNo,
      notes: `Transfer dispatched to: ${destBranch.name}`,
      userId: currentUser.id,
      userName: currentUser.name,
    };

    setTransfers((prev) => [newTransfer, ...prev]);
    setStockMovements((prev) => [movement, ...prev]);

    return {
      success: true,
      message: `Transfer ${transferNo} dispatched: ${data.quantity} units of ${prod.name} sent to ${destBranch.name}.`,
      transfer: newTransfer,
    };
  };

  const receiveTransfer = (transferId: string) => {
    const trf = transfers.find((t) => t.id === transferId);
    if (!trf) return { success: false, message: 'Transfer not found.' };
    if (trf.status !== 'Dispatched') {
      return { success: false, message: `Cannot receive transfer with status "${trf.status}".` };
    }

    if (currentUser.role === 'manager' && currentUser.branchId && trf.destinationBranchId !== currentUser.branchId) {
      return { success: false, message: 'You can only receive transfers addressed to your assigned branch.' };
    }

    const prod = products.find((p) => p.id === trf.productId);

    // Increment destination branch stock
    let newDestStock = 0;
    setBranchStocks((prev) => {
      const updated = [...prev];
      const index = updated.findIndex((s) => s.branchId === trf.destinationBranchId && s.productId === trf.productId);
      if (index >= 0) {
        newDestStock = updated[index].currentStock + trf.quantity;
        updated[index] = {
          ...updated[index],
          stockIn: updated[index].stockIn + trf.quantity,
          currentStock: newDestStock,
          lastUpdated: new Date().toLocaleString(),
        };
      } else {
        newDestStock = trf.quantity;
        updated.push({
          id: `bps_${Date.now()}`,
          branchId: trf.destinationBranchId,
          productId: trf.productId,
          openingStock: 0,
          stockIn: trf.quantity,
          stockOut: 0,
          quantitySold: 0,
          salesReturn: 0,
          purchaseReturn: 0,
          currentStock: newDestStock,
          minAlertLevel: prod?.minAlertLevel || 10,
          lastUpdated: new Date().toLocaleString(),
        });
      }
      return updated;
    });

    const movement: StockMovement = {
      id: `mov_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      date: new Date().toISOString().split('T')[0],
      branchId: trf.destinationBranchId,
      branchName: trf.destinationBranchName,
      productId: trf.productId,
      productName: trf.productName,
      sku: trf.sku,
      type: 'transfer_in',
      quantityChange: trf.quantity,
      balanceAfter: newDestStock,
      referenceNo: trf.transferNo,
      notes: `Transfer received from: ${trf.sourceBranchName}`,
      userId: currentUser.id,
      userName: currentUser.name,
    };

    setTransfers((prev) =>
      prev.map((t) =>
        t.id === transferId
          ? {
              ...t,
              status: 'Received',
              receivedBy: currentUser.name,
              receivedAt: new Date().toLocaleString(),
            }
          : t
      )
    );

    setStockMovements((prev) => [movement, ...prev]);

    return { success: true, message: `Transfer ${trf.transferNo} received! Stock added to ${trf.destinationBranchName}.` };
  };

  const cancelTransfer = (transferId: string, reason: string) => {
    const trf = transfers.find((t) => t.id === transferId);
    if (!trf) return { success: false, message: 'Transfer not found.' };
    if (trf.status !== 'Dispatched') {
      return { success: false, message: 'Only active dispatched transfers can be cancelled.' };
    }

    // Restore stock back to source branch
    let restoredStock = 0;
    setBranchStocks((prev) =>
      prev.map((s) => {
        if (s.branchId === trf.sourceBranchId && s.productId === trf.productId) {
          restoredStock = s.currentStock + trf.quantity;
          return {
            ...s,
            stockOut: Math.max(0, s.stockOut - trf.quantity),
            currentStock: restoredStock,
            lastUpdated: new Date().toLocaleString(),
          };
        }
        return s;
      })
    );

    const movement: StockMovement = {
      id: `mov_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      date: new Date().toISOString().split('T')[0],
      branchId: trf.sourceBranchId,
      branchName: trf.sourceBranchName,
      productId: trf.productId,
      productName: trf.productName,
      sku: trf.sku,
      type: 'transfer_in',
      quantityChange: trf.quantity,
      balanceAfter: restoredStock,
      referenceNo: `${trf.transferNo}-CANCEL`,
      notes: `Transfer cancelled & returned: ${reason}`,
      userId: currentUser.id,
      userName: currentUser.name,
    };

    setTransfers((prev) =>
      prev.map((t) =>
        t.id === transferId
          ? {
              ...t,
              status: 'Cancelled',
              cancelledBy: currentUser.name,
              cancelledAt: new Date().toLocaleString(),
              cancellationReason: reason,
            }
          : t
      )
    );

    setStockMovements((prev) => [movement, ...prev]);

    return { success: true, message: `Transfer ${trf.transferNo} cancelled. Stock restored to ${trf.sourceBranchName}.` };
  };

  // Opening Balance Recording
  const recordOpeningBalance = (data: {
    branchId: string;
    date: string;
    openingCashAmount: number;
    openingBankAmount: number;
    notes?: string;
  }) => {
    const branch = branches.find((b) => b.id === data.branchId);
    if (!branch) return { success: false, message: 'Invalid branch.' };

    const newRec: BranchOpeningBalance = {
      id: `ob_${Date.now()}`,
      branchId: data.branchId,
      branchName: branch.name,
      date: data.date,
      openingCashAmount: Number(data.openingCashAmount) || 0,
      openingBankAmount: Number(data.openingBankAmount) || 0,
      notes: data.notes || '',
      setByUserId: currentUser.id,
      setByName: currentUser.name,
      createdAt: new Date().toLocaleString(),
    };

    setOpeningBalances((prev) => [newRec, ...prev]);
    return { success: true, message: `Opening balance for ${branch.name} saved successfully.` };
  };

  // Add Expense
  const addExpense = (data: {
    branchId: string;
    date: string;
    category: ExpenseCategory;
    amount: number;
    paymentSource: ExpensePaymentSource;
    description: string;
    vendorName?: string;
  }) => {
    if (currentUser.role === 'manager' && currentUser.branchId && data.branchId !== currentUser.branchId) {
      return { success: false, message: 'You can only record operating expenses for your assigned branch.' };
    }

    const branch = branches.find((b) => b.id === data.branchId);
    if (!branch) return { success: false, message: 'Invalid branch.' };
    if (!data.amount || data.amount <= 0) return { success: false, message: 'Expense amount must be greater than zero.' };

    const voucherNo = `VCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    const newExp: OperatingExpense = {
      id: `exp_${Date.now()}`,
      voucherNo,
      date: data.date,
      branchId: data.branchId,
      branchName: branch.name,
      category: data.category,
      amount: Number(data.amount.toFixed(2)),
      paymentSource: data.paymentSource,
      description: data.description.trim(),
      vendorName: data.vendorName?.trim(),
      recordedByUserId: currentUser.id,
      recordedByName: currentUser.name,
      createdAt: new Date().toLocaleString(),
    };

    setExpenses((prev) => [newExp, ...prev]);
    return { success: true, message: `Expense recorded: ${voucherNo} (Tk ${data.amount}) from ${data.paymentSource}.` };
  };

  // Update Operating Expense (Strictly Super Admin Only)
  const updateExpense = (id: string, data: Partial<OperatingExpense>) => {
    if (!isSuperAdmin) {
      return { success: false, message: 'Unauthorized: Only Super Admin can edit operating expenses.' };
    }

    const existing = expenses.find((e) => e.id === id);
    if (!existing) {
      return { success: false, message: 'Expense record not found.' };
    }

    if (data.amount !== undefined && (data.amount <= 0 || isNaN(data.amount))) {
      return { success: false, message: 'Expense amount must be greater than zero.' };
    }

    let branchName = existing.branchName;
    if (data.branchId && data.branchId !== existing.branchId) {
      const b = branches.find((br) => br.id === data.branchId);
      if (b) branchName = b.name;
    }

    setExpenses((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              ...data,
              branchName,
              amount: data.amount !== undefined ? Number(data.amount.toFixed(2)) : e.amount,
            }
          : e
      )
    );

    return { success: true, message: `Expense voucher ${existing.voucherNo} updated successfully.` };
  };

  // Delete Operating Expense (Strictly Super Admin Only)
  const deleteExpense = (id: string) => {
    if (!isSuperAdmin) {
      return { success: false, message: 'Unauthorized: Only Super Admin can delete operating expenses.' };
    }

    const target = expenses.find((e) => e.id === id);
    if (!target) {
      return { success: false, message: 'Expense record not found.' };
    }

    setExpenses((prev) => prev.filter((e) => e.id !== id));
    return { success: true, message: `Expense voucher ${target.voucherNo} (Tk ${target.amount}) deleted successfully.` };
  };

  // Add Expense Category / Head (Strictly Super Admin Only)
  const addExpenseCategory = (name: string, description?: string) => {
    if (!isSuperAdmin) {
      return { success: false, message: 'Unauthorized: Only Super Admin can add expense categories.' };
    }

    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false, message: 'Expense category name cannot be empty.' };
    }

    const exists = expenseCategories.some(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      return { success: false, message: `Expense category "${trimmed}" already exists.` };
    }

    const newCat: ExpenseCategoryItem = {
      id: `exp_cat_${Date.now()}`,
      name: trimmed,
      description: description?.trim() || '',
      createdAt: new Date().toISOString().slice(0, 10),
      isDefault: false,
    };

    setExpenseCategories((prev) => [newCat, ...prev]);
    return { success: true, message: `Expense category "${trimmed}" created successfully.`, category: newCat };
  };

  // Update Expense Category / Head (Strictly Super Admin Only)
  const updateExpenseCategory = (id: string, name: string, description?: string) => {
    if (!isSuperAdmin) {
      return { success: false, message: 'Unauthorized: Only Super Admin can update expense categories.' };
    }

    const target = expenseCategories.find((c) => c.id === id);
    if (!target) {
      return { success: false, message: 'Expense category not found.' };
    }

    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false, message: 'Expense category name cannot be empty.' };
    }

    const duplicate = expenseCategories.some(
      (c) => c.id !== id && c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      return { success: false, message: `Another expense category with name "${trimmed}" already exists.` };
    }

    const oldName = target.name;
    setExpenseCategories((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              name: trimmed,
              description: description !== undefined ? description.trim() : c.description,
            }
          : c
      )
    );

    // If the category name changed, update existing vouchers referencing the old name
    if (oldName !== trimmed) {
      setExpenses((prev) =>
        prev.map((e) => (e.category === oldName ? { ...e, category: trimmed } : e))
      );
    }

    return { success: true, message: `Expense category "${trimmed}" updated successfully.` };
  };

  // Delete Expense Category / Head (Strictly Super Admin Only)
  const deleteExpenseCategory = (id: string) => {
    if (!isSuperAdmin) {
      return { success: false, message: 'Unauthorized: Only Super Admin can delete expense categories.' };
    }

    const target = expenseCategories.find((c) => c.id === id);
    if (!target) {
      return { success: false, message: 'Expense category not found.' };
    }

    // Safety check: is this category used by any existing expense voucher?
    const usageCount = expenses.filter((e) => e.category === target.name).length;
    if (usageCount > 0) {
      return {
        success: false,
        message: `Cannot delete "${target.name}": It is currently used in ${usageCount} recorded expense voucher(s). Please reassign or delete those vouchers first.`,
      };
    }

    setExpenseCategories((prev) => prev.filter((c) => c.id !== id));
    return { success: true, message: `Expense category "${target.name}" deleted successfully.` };
  };

  const resetAllDataToDefault = () => {
    localStorage.removeItem(`${STORAGE_KEY}_user`);
    localStorage.removeItem(`${STORAGE_KEY}_users`);
    localStorage.removeItem(`${STORAGE_KEY}_branches`);
    localStorage.removeItem(`${STORAGE_KEY}_products`);
    localStorage.removeItem(`${STORAGE_KEY}_branch_stocks`);
    localStorage.removeItem(`${STORAGE_KEY}_stock_ins`);
    localStorage.removeItem(`${STORAGE_KEY}_stock_outs`);
    localStorage.removeItem(`${STORAGE_KEY}_sales`);
    localStorage.removeItem(`${STORAGE_KEY}_movements`);
    localStorage.removeItem(`${STORAGE_KEY}_transfers`);
    localStorage.removeItem(`${STORAGE_KEY}_opening_balances`);
    localStorage.removeItem(`${STORAGE_KEY}_expenses`);

    setCurrentUserState(INITIAL_USERS[0]);
    setSelectedBranchIdState('all');
    setSelectedCategoryName(null);
    setUsers(INITIAL_USERS);
    setBranches(INITIAL_BRANCHES);
    setProducts(INITIAL_PRODUCTS);
    setBranchStocks(INITIAL_BRANCH_STOCKS);
    setStockIns(INITIAL_STOCK_INS);
    setStockOuts(INITIAL_STOCK_OUTS);
    setSales(INITIAL_SALES);
    setStockMovements(INITIAL_STOCK_MOVEMENTS);
    setTransfers(INITIAL_TRANSFERS);
    setOpeningBalances(INITIAL_OPENING_BALANCES);
    setExpenses(INITIAL_EXPENSES);
    setActiveTab('dashboard');
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        activeTab,
        setActiveTab,
        selectedBranchId,
        setSelectedBranchId,
        selectedCategoryName,
        setSelectedCategoryName,
        users,
        branches,
        categories,
        products,
        branchStocks,
        stockIns,
        stockOuts,
        sales,
        stockMovements,
        transfers,
        openingBalances,
        expenses,
        expenseCategories,
        isSuperAdmin,
        isAdmin,
        isManager,
        canViewProfit,
        canAdd,
        canEdit,
        canDelete,
        canVoidSale,
        userPermissions,
        rolePermissions,
        updateRolePermissions,
        updateUserPermissions,
        addProduct,
        updateProduct,
        checkProductDeletable,
        deleteProductSafe,
        addBranch,
        updateBranch,
        checkBranchDeletable,
        deleteBranchSafe,
        addUser,
        updateUser,
        checkUserDeletable,
        deleteUserSafe,
        createStockIn,
        createStockOut,
        createSale,
        cancelSale,
        createTransfer,
        receiveTransfer,
        cancelTransfer,
        recordOpeningBalance,
        addExpense,
        updateExpense,
        deleteExpense,
        addExpenseCategory,
        updateExpenseCategory,
        deleteExpenseCategory,
        getProductStockForBranch,
        getProductTotalStockAcrossBranches,
        resetAllDataToDefault,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
