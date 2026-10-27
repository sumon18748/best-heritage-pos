import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
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
  SaleItem,
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
import { getBangladeshTodayDateString, getBangladeshDateCompact, sortByNewestFirst } from '../utils/dateUtils';
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
  calculateCurrentStock,
  calculateSaleTotals,
  calculateDiscountAmount,
  canInitiateTransfer,
  calculateDecantItemCost,
  calculateDecantStockDeduction,
  calculateDecantCancelRestore,
  getProductBatches,
  allocateSaleFromLowestCostBatches,
  AvailableBatch,
} from '../utils/stockCalculations';
import {
  fetchAllCollections,
  syncProductUpsert,
  syncProductDelete,
  syncBranchStockUpsert,
  syncStockInUpsert,
  syncStockInDelete,
  syncStockOutUpsert,
  syncStockOutDelete,
  syncSaleUpsert,
  syncSaleDelete,
  syncTransferUpsert,
  syncExpenseUpsert,
  syncExpenseDelete,
  syncExpenseCategoryUpsert,
  syncExpenseCategoryDelete,
  syncBranchUpsert,
  syncBranchDelete,
  syncUserUpsert,
  syncRolePermissionsUpsert,
  syncUserDelete,
  syncOpeningBalanceUpsert,
  syncMovementInsert,
} from '../lib/supabaseSync';

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
    items: { productId: string; quantity: number; purchasePrice: number; sellingPrice?: number }[];
  }) => { success: boolean; message: string; transaction?: StockInTransaction };
  updateStockIn: (stockInId: string, data: {
    date?: string;
    supplierName?: string;
    supplierInvoiceNo?: string;
    remarks?: string;
    items?: { productId: string; quantity: number; purchasePrice: number; sellingPrice?: number }[];
  }) => { success: boolean; message: string };
  deleteStockIn: (stockInId: string) => { success: boolean; message: string };

  createStockOut: (data: {
    date: string;
    branchId: string;
    reason: StockOutReason;
    referenceDocNo?: string;
    remarks?: string;
    items: { productId: string; quantity: number }[];
  }) => { success: boolean; message: string; transaction?: StockOutTransaction };
  updateStockOut: (stockOutId: string, data: {
    date?: string;
    reason?: StockOutReason;
    referenceDocNo?: string;
    remarks?: string;
    items?: { productId: string; quantity: number }[];
  }) => { success: boolean; message: string };
  deleteStockOut: (stockOutId: string) => { success: boolean; message: string };

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

  updateSale: (saleId: string, data: {
    customerName?: string;
    customerPhone?: string;
    paymentMethod?: PaymentMethod;
    date?: string;
    notes?: string;
    discountType?: DiscountType;
    discountValue?: number;
    items?: {
      productId: string;
      quantity: number;
      sellingPrice: number;
      isDecant?: boolean;
      decantVariantName?: string;
      decantMlAmount?: number;
    }[];
  }) => { success: boolean; message: string };

  cancelSale: (saleId: string, reason: string) => { success: boolean; message: string };
  deleteSale: (saleId: string) => { success: boolean; message: string };

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
  getProductBatchesForBranch: (branchId: string, productId: string) => AvailableBatch[];
  getProductTotalStockAcrossBranches: (productId: string) => number;
  resetAllDataToDefault: () => void;

  // Authentication & Cloud Sync
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => { success: boolean; message: string };
  logout: () => void;
  getNextUserId: () => string;
  isCloudSyncing: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'bestheritage_live_v4';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUserState] = useState<User>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_user`);
      return saved ? JSON.parse(saved) : INITIAL_USERS[0];
    } catch {
      return INITIAL_USERS[0];
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const savedAuth = localStorage.getItem(`${STORAGE_KEY}_auth`);
      return savedAuth === 'true';
    } catch {
      return false;
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
      if (saved) {
        const parsed: User[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((u) => {
            if (u.id === 'usr_super' || u.role === 'super_admin') {
              return { ...u, username: '99999', password: u.password || '123456', status: 'active' as const };
            }
            if (u.id === 'usr_admin') {
              return { ...u, username: u.username || '00001', password: u.password || '123456', status: 'active' as const };
            }
            if (u.id === 'usr_manager') {
              return { ...u, username: u.username || '00002', password: u.password || '123456', status: 'active' as const };
            }
            return u;
          });
        }
      }
      return INITIAL_USERS;
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

  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  // Cloud Synchronization: Initial load + Real-time Multi-PC live auto-sync
  useEffect(() => {
    let isMounted = true;

    const pullFromCloud = async (showIndicator = false) => {
      try {
        if (showIndicator) setIsCloudSyncing(true);
        const data = await fetchAllCollections();
        if (!isMounted || !data) {
          if (showIndicator) setIsCloudSyncing(false);
          return;
        }

        // ── Branches ──
        if (data.branches && data.branches.length > 0) setBranches(data.branches);

        // ── Users ──
        // Users in Supabase may have null permissions (stored separately in rolePermissions).
        // Resolve each user's effective permissions from rolePermissions before updating state.
        if (data.users && data.users.length > 0) {
          const cloudRolePerms = data.rolePermissions || {};
          setUsers((prevUsers) => {
            return data.users!.map((cloudUser) => {
              const localMatch = prevUsers.find((p) => p.id === cloudUser.id || p.username === cloudUser.username);
              // Preserve changed local password if cloud returned default or empty
              const effectivePassword = (localMatch?.password && localMatch.password !== '123456')
                ? localMatch.password
                : (cloudUser.password || localMatch?.password || '123456');

              let userObj = { ...cloudUser, password: effectivePassword };
              if (userObj.role === 'super_admin') return userObj;
              // If user has individual overrides stored, keep them.
              if (userObj.permissions && userObj.permissions.allowedTabs && userObj.permissions.allowedTabs.length > 0) return userObj;
              // Otherwise fall back to role-level permissions from cloud or local defaults.
              const rolePerm = cloudRolePerms[userObj.role] || getDefaultPermissionsForRole(userObj.role);
              return { ...userObj, permissions: rolePerm };
            });
          });

          // Update the currentUser in-place (name, role, permissions, password) without logging out
          setCurrentUserState((prevUser) => {
            const matched = data.users!.find(
              (u) => u.id === prevUser.id || u.username === prevUser.username
            );
            if (matched) {
              const effectivePassword = (prevUser.password && prevUser.password !== '123456')
                ? prevUser.password
                : (matched.password || prevUser.password || '123456');
              const updated = {
                ...prevUser,
                name: matched.name,
                email: matched.email,
                role: matched.role,
                branchId: matched.branchId,
                branchName: matched.branchName,
                permissions: matched.permissions || prevUser.permissions,
                status: matched.status,
                password: effectivePassword,
              };
              try {
                localStorage.setItem(`${STORAGE_KEY}_user`, JSON.stringify(updated));
              } catch {
                // ignore
              }
              return updated;
            }
            return prevUser;
          });
        }

        // ── Role Permissions ──
        if (data.rolePermissions) {
          setRolePermissions((prev) => ({ ...prev, ...data.rolePermissions }));
        }

        // ── Products: only overwrite if cloud has data, otherwise push local to cloud ──
        if (data.products !== null) {
          if (data.products.length > 0) {
            setProducts(data.products);
          } else {
            // Cloud is empty – upload local data that was entered offline
            setProducts((prevLocal) => {
              if (prevLocal.length > 0) {
                prevLocal.forEach((p) => syncProductUpsert(p));
              }
              return prevLocal;
            });
          }
        }

        const loadedStockIns = data.stockIns !== null ? (data.stockIns.length > 0 ? data.stockIns : []) : [];
        const loadedStockOuts = data.stockOuts !== null ? (data.stockOuts.length > 0 ? data.stockOuts : []) : [];
        const loadedSales = data.sales !== null ? (data.sales.length > 0 ? data.sales : []) : [];

        // ── Branch Stocks (Heal and sync exact Stock In from all transactions) ──
        if (data.branchStocks !== null) {
          if (data.branchStocks.length > 0) {
            const healedStocks = data.branchStocks.map((s) => {
              // Calculate exact sum from all stockIns for this branch and product
              const txStockIn = loadedStockIns
                .filter((si) => si.branchId === s.branchId)
                .reduce((sum, si) => {
                  const iSum = (si.items || [])
                    .filter((it) => it.productId === s.productId)
                    .reduce((sub, it) => sub + (Number(it.quantity) || 0), 0);
                  return sum + iSum;
                }, 0);

              const txStockOut = loadedStockOuts
                .filter((so) => so.branchId === s.branchId)
                .reduce((sum, so) => {
                  const iSum = (so.items || [])
                    .filter((it) => it.productId === s.productId)
                    .reduce((sub, it) => sub + (Number(it.quantity) || 0), 0);
                  return sum + iSum;
                }, 0);

              const txSold = loadedSales
                .filter((sa) => sa.branchId === s.branchId && sa.status === 'completed')
                .reduce((sum, sa) => {
                  const iSum = (sa.items || [])
                    .filter((it) => it.productId === s.productId)
                    .reduce((sub, it) => sub + (Number(it.quantity) || 0), 0);
                  return sum + iSum;
                }, 0);

              const effectiveIn = txStockIn > 0 ? txStockIn : (Number(s.stockIn) || 0);
              const effectiveOut = txStockOut > 0 ? txStockOut : (Number(s.stockOut) || 0);
              const effectiveSold = txSold > 0 ? txSold : (Number(s.quantitySold) || 0);

              const currentStock = calculateCurrentStock({
                openingStock: s.openingStock,
                stockIn: effectiveIn,
                stockOut: effectiveOut,
                quantitySold: effectiveSold,
                salesReturn: s.salesReturn,
                purchaseReturn: s.purchaseReturn,
              });

              const updated = {
                ...s,
                stockIn: effectiveIn,
                stockOut: effectiveOut,
                quantitySold: effectiveSold,
                currentStock,
              };

              // If stock_in or current_stock was corrected, sync to Supabase
              if (s.stockIn !== effectiveIn || s.currentStock !== currentStock) {
                syncBranchStockUpsert(updated);
              }

              return updated;
            });

            setBranchStocks(healedStocks);
          } else {
            setBranchStocks((prevLocal) => {
              if (prevLocal.length > 0) prevLocal.forEach((s) => syncBranchStockUpsert(s));
              return prevLocal;
            });
          }
        }

        // ── Stock Ins ──
        if (data.stockIns !== null) {
          if (data.stockIns.length > 0) {
            setStockIns(sortByNewestFirst(data.stockIns));
          } else {
            setStockIns((prevLocal) => {
              if (prevLocal.length > 0) prevLocal.forEach((si) => syncStockInUpsert(si));
              return sortByNewestFirst(prevLocal);
            });
          }
        }

        // ── Stock Outs ──
        if (data.stockOuts !== null) {
          if (data.stockOuts.length > 0) {
            setStockOuts(sortByNewestFirst(data.stockOuts));
          } else {
            setStockOuts((prevLocal) => {
              if (prevLocal.length > 0) prevLocal.forEach((so) => syncStockOutUpsert(so));
              return sortByNewestFirst(prevLocal);
            });
          }
        }

        // ── Sales ──
        if (data.sales !== null) {
          if (data.sales.length > 0) {
            setSales(sortByNewestFirst(data.sales));
          } else {
            setSales((prevLocal) => {
              if (prevLocal.length > 0) prevLocal.forEach((s) => syncSaleUpsert(s));
              return sortByNewestFirst(prevLocal);
            });
          }
        }

        // ── Transfers ──
        if (data.transfers !== null) {
          if (data.transfers.length > 0) {
            setTransfers(data.transfers);
          } else {
            setTransfers((prevLocal) => {
              if (prevLocal.length > 0) prevLocal.forEach((t) => syncTransferUpsert(t));
              return prevLocal;
            });
          }
        }

        // ── Expenses ──
        if (data.expenses !== null) {
          if (data.expenses.length > 0) {
            setExpenses(data.expenses);
          } else {
            setExpenses((prevLocal) => {
              if (prevLocal.length > 0) prevLocal.forEach((e) => syncExpenseUpsert(e));
              return prevLocal;
            });
          }
        }

        // ── Expense Categories ──
        if (data.expenseCategories && data.expenseCategories.length > 0) {
          setExpenseCategories(data.expenseCategories);
        }

        // ── Opening Balances ──
        if (data.openingBalances !== null) {
          if (data.openingBalances.length > 0) {
            setOpeningBalances(data.openingBalances);
          } else {
            setOpeningBalances((prevLocal) => {
              if (prevLocal.length > 0) prevLocal.forEach((ob) => syncOpeningBalanceUpsert(ob));
              return prevLocal;
            });
          }
        }

        // ── Stock Movements ──
        if (data.movements !== null) {
          if (data.movements.length > 0) {
            setStockMovements(data.movements);
          } else {
            setStockMovements((prevLocal) => {
              if (prevLocal.length > 0) prevLocal.forEach((m) => syncMovementInsert(m));
              return prevLocal;
            });
          }
        }
      } catch (err) {
        console.warn('Real-time sync pull error:', err);
      } finally {
        if (isMounted && showIndicator) setIsCloudSyncing(false);
      }
    };

    // 1. Initial full fetch from Cloud
    pullFromCloud(true);

    // 2. Real-time PostgreSQL Live Stream (Instant push via WebSocket from Supabase)
    const channel = supabase
      .channel('bestheritage-multi-pc-realtime')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        pullFromCloud(false);
      })
      .subscribe();

    // 3. Heartbeat polling every 3 seconds (Guarantees 100% sync across all PCs without reloading)
    const pollInterval = setInterval(() => {
      pullFromCloud(false);
    }, 3000);

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, []);

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

    const updatedRoles = {
      ...rolePermissions,
      [role]: permissions,
    };
    setRolePermissions(updatedRoles);
    syncRolePermissionsUpsert(updatedRoles);

    if (applyToExistingUsers) {
      setUsers((prev) =>
        prev.map((u) => {
          if (u.role === role) {
            const updated = { ...u, permissions };
            syncUserUpsert(updated);
            return updated;
          }
          return u;
        })
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
      prev.map((u) => {
        if (u.id === userId) {
          const updated = { ...u, permissions };
          syncUserUpsert(updated);
          return updated;
        }
        return u;
      })
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

  const getNextUserId = (): string => {
    let maxId = 0;
    for (const u of users) {
      if (u.username && /^\d{5}$/.test(u.username)) {
        const num = parseInt(u.username, 10);
        if (num !== 99999 && num > maxId) {
          maxId = num;
        }
      }
    }
    const nextNum = maxId + 1;
    return String(nextNum).padStart(5, '0');
  };

  const login = (identifier: string, password: string): { success: boolean; message: string } => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanId || !cleanPass) {
      return { success: false, message: 'Please enter both User ID and Password.' };
    }

    let matchedUser = users.find((u) => {
      const matchesUsername = u.username?.toLowerCase() === cleanId;
      const matchesEmail = u.email.toLowerCase() === cleanId;
      const matchesId = u.id.toLowerCase() === cleanId;
      const matchesName = u.name.toLowerCase() === cleanId;
      const isSuperMatch = cleanId === '99999' && (u.role === 'super_admin' || u.id === 'usr_super');
      const isAdminMatch = (cleanId === '00001' || cleanId === '1') && (u.id === 'usr_admin' || u.name.toLowerCase() === 'sumon');
      const isManagerMatch = (cleanId === '00002' || cleanId === '2') && (u.id === 'usr_manager' || u.name.toLowerCase().includes('sohel'));
      return matchesUsername || matchesEmail || matchesId || matchesName || isSuperMatch || isAdminMatch || isManagerMatch;
    });

    if (!matchedUser) {
      if (cleanId === '99999') matchedUser = INITIAL_USERS[0];
      else if (cleanId === '00001' || cleanId === '1') matchedUser = INITIAL_USERS[1];
      else if (cleanId === '00002' || cleanId === '2') matchedUser = INITIAL_USERS[2];
    }

    if (!matchedUser) {
      return { success: false, message: 'Invalid User ID. Please check your 5-digit User ID.' };
    }

    if (matchedUser.status !== 'active') {
      return { success: false, message: 'This user account is inactive. Please contact system administrator.' };
    }

    const expectedPassword = matchedUser.password || '123456';
    if (cleanPass !== expectedPassword) {
      return { success: false, message: 'Incorrect password. Please enter your valid password.' };
    }

    setCurrentUserState(matchedUser);
    setIsAuthenticated(true);
    try {
      localStorage.setItem(`${STORAGE_KEY}_auth`, 'true');
      localStorage.setItem(`${STORAGE_KEY}_user`, JSON.stringify(matchedUser));
    } catch {
      // ignore
    }

    if (matchedUser.role === 'manager' && matchedUser.branchId) {
      setSelectedBranchIdState(matchedUser.branchId);
    } else {
      setSelectedBranchIdState('all');
    }

    return { success: true, message: 'Login successful.' };
  };

  const logout = () => {
    setIsAuthenticated(false);
    try {
      localStorage.removeItem(`${STORAGE_KEY}_auth`);
    } catch {
      // ignore
    }
    setActiveTab('dashboard');
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

  const getProductBatchesForBranch = (branchId: string, productId: string): AvailableBatch[] => {
    const stock = branchStocks.find((s) => s.productId === productId && s.branchId === branchId);
    const prod = products.find((p) => p.id === productId);
    return getProductBatches({
      branchId,
      productId,
      openingStock: stock?.openingStock || 0,
      defaultPurchasePrice: prod?.purchasePrice || 0,
      stockIns,
      totalConsumedQty: (stock?.quantitySold || 0) + (stock?.stockOut || 0),
    });
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
      const updated = { ...prod, status: 'inactive' as const };
      setProducts((prev) => prev.map((p) => (p.id === productId ? updated : p)));
      syncProductUpsert(updated);
      return { success: true, message: `Product "${prod.name}" has been deactivated. It will no longer appear in POS or active stock.` };
    }

    if (action === 'force_delete' || (action === 'delete' && isSuperAdmin)) {
      // Super Admin explicit master deletion: removes product and associated branch stocks
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      setBranchStocks((prev) => prev.filter((s) => s.productId !== productId));
      syncProductDelete(productId);
      return { success: true, message: `Product "${prod.name}" permanently deleted by Super Admin.` };
    }

    const check = checkProductDeletable(productId);
    if (!check.canDelete) {
      return { success: false, message: check.reason || 'Cannot delete product.' };
    }

    // Safe to permanently delete
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    setBranchStocks((prev) => prev.filter((s) => s.productId !== productId));
    syncProductDelete(productId);
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
      const updated = { ...branch, isActive: false };
      setBranches((prev) => prev.map((b) => (b.id === branchId ? updated : b)));
      syncBranchUpsert(updated);
      return { success: true, message: `Branch "${branch.name}" is now inactive.` };
    }

    if (action === 'force_delete' || (action === 'delete' && isSuperAdmin)) {
      setBranches((prev) => prev.filter((b) => b.id !== branchId));
      setBranchStocks((prev) => prev.filter((s) => s.branchId !== branchId));
      syncBranchDelete(branchId);
      return { success: true, message: `Branch "${branch.name}" permanently deleted by Super Admin.` };
    }

    const check = checkBranchDeletable(branchId);
    if (!check.canDelete) {
      return { success: false, message: check.reason || 'Cannot delete branch.' };
    }

    setBranches((prev) => prev.filter((b) => b.id !== branchId));
    setBranchStocks((prev) => prev.filter((s) => s.branchId !== branchId));
    syncBranchDelete(branchId);
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
    syncUserDelete(userId);
    return { success: true, message: 'User account deleted successfully.' };
  };

  // Add Product
  const addProduct = (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const existingSku = products.find((p) => p.sku.toLowerCase() === productData.sku.toLowerCase());
    if (existingSku) {
      return { success: false, message: `Product with SKU "${productData.sku}" already exists.` };
    }

    const newProductId = `prod_${Date.now()}`;
    const today = getBangladeshTodayDateString();
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

    let initialMovement: StockMovement | null = null;
    if (productData.openingStock > 0 && branches.length > 0) {
      initialMovement = {
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
      setStockMovements((prev) => [initialMovement!, ...prev]);
    }

    // Push to Supabase Cloud
    syncProductUpsert(newProduct);
    newBranchStocks.forEach((st) => syncBranchStockUpsert(st));
    if (initialMovement) syncMovementInsert(initialMovement);

    return { success: true, message: `Product "${newProduct.name}" created successfully.`, product: newProduct };
  };

  // Update Product (Master updates propagate cleanly)
  const updateProduct = (id: string, productData: Partial<Product>) => {
    let updatedProd: Product | null = null;
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const category = productData.categoryId ? categories.find((c) => c.id === productData.categoryId) : undefined;
        updatedProd = {
          ...p,
          ...productData,
          categoryName: category ? category.name : p.categoryName,
          updatedAt: getBangladeshTodayDateString(),
        };
        return updatedProd;
      })
    );

    if (updatedProd) {
      syncProductUpsert(updatedProd);
    }

    if (productData.minAlertLevel !== undefined) {
      setBranchStocks((prev) =>
        prev.map((s) => {
          if (s.productId === id) {
            const updatedStock = { ...s, minAlertLevel: productData.minAlertLevel! };
            syncBranchStockUpsert(updatedStock);
            return updatedStock;
          }
          return s;
        })
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
      createdAt: getBangladeshTodayDateString(),
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

    // Push to Supabase Cloud
    syncBranchUpsert(newBranch);
    newStocks.forEach((st) => syncBranchStockUpsert(st));

    return { success: true, message: `Branch "${newBranch.name}" created successfully.`, branch: newBranch };
  };

  // Update Branch
  const updateBranch = (id: string, branchData: Partial<Branch>) => {
    let updatedBranch: Branch | null = null;
    setBranches((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        updatedBranch = { ...b, ...branchData };
        return updatedBranch;
      })
    );
    if (updatedBranch) syncBranchUpsert(updatedBranch);
    return { success: true, message: 'Branch updated successfully.' };
  };

  // Add User
  const addUser = (userData: Omit<User, 'id' | 'createdAt'>) => {
    const existingEmail = users.find((u) => u.email.toLowerCase() === userData.email.toLowerCase());
    if (existingEmail) {
      return { success: false, message: `User with email "${userData.email}" already exists.` };
    }

    const branch = branches.find((b) => b.id === userData.branchId);
    const assignedUsername = userData.username || getNextUserId();

    const newUser: User = {
      ...userData,
      username: assignedUsername,
      password: userData.password || '123456',
      id: `usr_${Date.now()}`,
      branchName: branch?.name,
      createdAt: getBangladeshTodayDateString(),
    };

    setUsers((prev) => [...prev, newUser]);
    syncUserUpsert(newUser);
    return { success: true, message: `User "${newUser.name}" (ID: ${newUser.username}) added successfully.` };
  };

  const updateUser = (id: string, userData: Partial<User>) => {
    let updatedUser: User | null = null;
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        const branch = userData.branchId ? branches.find((b) => b.id === userData.branchId) : undefined;
        updatedUser = {
          ...u,
          ...userData,
          branchName: userData.branchId ? (branch ? branch.name : u.branchName) : u.branchName,
        };
        return updatedUser;
      })
    );

    if (updatedUser) {
      syncUserUpsert(updatedUser);
    }

    if (id === currentUser.id) {
      setCurrentUserState((prev) => {
        const branch = userData.branchId ? branches.find((b) => b.id === userData.branchId) : undefined;
        const updated = {
          ...prev,
          ...userData,
          branchName: userData.branchId ? (branch ? branch.name : prev.branchName) : prev.branchName,
        };
        try {
          localStorage.setItem(`${STORAGE_KEY}_user`, JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
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
    items: { productId: string; quantity: number; purchasePrice: number; sellingPrice?: number }[];
  }) => {
    if (currentUser.role === 'manager' && currentUser.branchId && data.branchId !== currentUser.branchId) {
      return { success: false, message: 'Security Violation: You cannot record Stock In for another branch.' };
    }

    const branch = branches.find((b) => b.id === data.branchId);
    if (!branch) return { success: false, message: 'Invalid branch selected.' };
    if (!data.items || data.items.length === 0) return { success: false, message: 'No items provided for Stock In.' };

    const refNo = `SIN-${getBangladeshDateCompact()}-${Math.floor(100 + Math.random() * 900)}`;

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
        sellingPrice: item.sellingPrice,
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
      createdAt: new Date().toISOString(),
    };

    const movementsToAdd: StockMovement[] = [];
    const changedStocks: BranchProductStock[] = [];

    // Precalculate synchronously so changedStocks is immediately populated for Supabase sync
    const stockMap = new Map<string, BranchProductStock>();
    branchStocks.forEach((s) => stockMap.set(`${s.branchId}_${s.productId}`, s));

    for (const item of itemsWithDetails) {
      const key = `${data.branchId}_${item.productId}`;
      const existing = stockMap.get(key);
      const prod = products.find((p) => p.id === item.productId);

      if (existing) {
        const newStockIn = (existing.stockIn || 0) + item.quantity;
        const newCurrentStock = calculateCurrentStock({
          openingStock: existing.openingStock,
          stockIn: newStockIn,
          stockOut: existing.stockOut,
          quantitySold: existing.quantitySold,
          salesReturn: existing.salesReturn,
          purchaseReturn: existing.purchaseReturn,
        });
        const updatedEntry: BranchProductStock = {
          ...existing,
          stockIn: newStockIn,
          currentStock: newCurrentStock,
          lastUpdated: new Date().toLocaleString(),
        };
        changedStocks.push(updatedEntry);
        stockMap.set(key, updatedEntry);

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
        const newStockIn = item.quantity;
        const newCurrentStock = calculateCurrentStock({
          openingStock: 0,
          stockIn: newStockIn,
          stockOut: 0,
          quantitySold: 0,
        });
        const newEntry: BranchProductStock = {
          id: `bps_${Date.now()}_${item.productId}`,
          branchId: data.branchId,
          productId: item.productId,
          openingStock: 0,
          stockIn: newStockIn,
          stockOut: 0,
          quantitySold: 0,
          salesReturn: 0,
          purchaseReturn: 0,
          currentStock: newCurrentStock,
          minAlertLevel: prod?.minAlertLevel || 10,
          lastUpdated: new Date().toLocaleString(),
        };
        changedStocks.push(newEntry);
        stockMap.set(key, newEntry);

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

    setBranchStocks((prev) => {
      const updated = [...prev];
      changedStocks.forEach((cs) => {
        const idx = updated.findIndex((s) => s.branchId === cs.branchId && s.productId === cs.productId);
        if (idx >= 0) {
          updated[idx] = cs;
        } else {
          updated.push(cs);
        }
      });
      return updated;
    });

    setStockIns((prev) => [newTx, ...prev]);
    setStockMovements((prev) => [...movementsToAdd, ...prev]);

    // Also update product catalog sellingPrice and purchasePrice from Stock In
    setProducts((prev) =>
      prev.map((p) => {
        const inItem = data.items.find((it) => it.productId === p.id);
        if (!inItem) return p;
        const newSellingPrice = inItem.sellingPrice !== undefined && inItem.sellingPrice > 0 ? inItem.sellingPrice : p.sellingPrice;
        const newPurchasePrice = inItem.purchasePrice > 0 ? inItem.purchasePrice : p.purchasePrice;
        if (newSellingPrice === p.sellingPrice && newPurchasePrice === p.purchasePrice) return p;
        const updated = {
          ...p,
          sellingPrice: newSellingPrice,
          purchasePrice: newPurchasePrice,
          updatedAt: getBangladeshTodayDateString(),
        };
        syncProductUpsert(updated);
        return updated;
      })
    );

    // Push to Supabase Cloud immediately
    syncStockInUpsert(newTx);
    changedStocks.forEach((st) => syncBranchStockUpsert(st));
    movementsToAdd.forEach((m) => syncMovementInsert(m));

    return { success: true, message: `Stock In recorded successfully. Ref: ${refNo}`, transaction: newTx };
  };

  // Super Admin: Update Stock In
  const updateStockIn = (stockInId: string, data: {
    date?: string;
    supplierName?: string;
    supplierInvoiceNo?: string;
    remarks?: string;
    items?: { productId: string; quantity: number; purchasePrice: number; sellingPrice?: number }[];
  }) => {
    if (currentUser.role !== 'super_admin') {
      return { success: false, message: 'Unauthorized: Only Super Admin can edit stock-in records.' };
    }

    const tx = stockIns.find((t) => t.id === stockInId);
    if (!tx) return { success: false, message: 'Stock In transaction not found.' };

    const changedStocks: BranchProductStock[] = [];
    const movementsToAdd: StockMovement[] = [];

    let updatedItems = tx.items;
    let totalQuantity = tx.totalQuantity;
    let totalPurchaseCost = tx.totalPurchaseCost;

    if (data.items && data.items.length > 0) {
      const oldItemMap = new Map<string, number>();
      tx.items.forEach((it) => oldItemMap.set(it.productId, (oldItemMap.get(it.productId) || 0) + it.quantity));

      const newItemMap = new Map<string, number>();
      data.items.forEach((it) => newItemMap.set(it.productId, (newItemMap.get(it.productId) || 0) + it.quantity));

      const allProductIds = new Set([...oldItemMap.keys(), ...newItemMap.keys()]);

      for (const prodId of allProductIds) {
        const oldQty = oldItemMap.get(prodId) || 0;
        const newQty = newItemMap.get(prodId) || 0;
        const diff = newQty - oldQty;

        if (diff !== 0) {
          const current = branchStocks.find((s) => s.branchId === tx.branchId && s.productId === prodId);
          const prod = products.find((p) => p.id === prodId);
          if (current) {
            const newCurrentStock = current.currentStock + diff;
            const updatedEntry: BranchProductStock = {
              ...current,
              stockIn: current.stockIn + diff,
              currentStock: newCurrentStock,
              lastUpdated: new Date().toLocaleString(),
            };
            changedStocks.push(updatedEntry);

            movementsToAdd.push({
              id: `mov_edit_sin_${Date.now()}_${prodId}`,
              timestamp: new Date().toLocaleString(),
              date: data.date || tx.date,
              branchId: tx.branchId,
              branchName: tx.branchName,
              productId: prodId,
              productName: prod?.name || 'Product',
              sku: prod?.sku || 'SKU',
              type: diff > 0 ? 'stock_in' : 'stock_out',
              quantityChange: diff,
              balanceAfter: newCurrentStock,
              referenceNo: tx.referenceNo,
              notes: `Super Admin Stock-In Edit: Adjusted by ${diff > 0 ? `+${diff}` : diff} units.`,
              userId: currentUser.id,
              userName: currentUser.name,
            });
          }
        }
      }

      totalQuantity = 0;
      totalPurchaseCost = 0;
      updatedItems = data.items.map((it, idx) => {
        const prod = products.find((p) => p.id === it.productId);
        const itemCost = Number((it.quantity * it.purchasePrice).toFixed(2));
        totalQuantity += it.quantity;
        totalPurchaseCost += itemCost;
        return {
          id: tx.items[idx]?.id || `sii_${Date.now()}_${idx}`,
          productId: it.productId,
          productName: prod?.name || 'Product',
          sku: prod?.sku || 'SKU',
          categoryName: prod?.categoryName || 'Cosmetic Products',
          quantity: it.quantity,
          purchasePrice: it.purchasePrice,
          sellingPrice: it.sellingPrice,
          totalCost: itemCost,
        };
      });

      // Also update master products with updated selling/purchase prices
      setProducts((prev) =>
        prev.map((p) => {
          const inItem = data.items?.find((it) => it.productId === p.id);
          if (!inItem) return p;
          const newSellingPrice = inItem.sellingPrice !== undefined && inItem.sellingPrice > 0 ? inItem.sellingPrice : p.sellingPrice;
          const newPurchasePrice = inItem.purchasePrice > 0 ? inItem.purchasePrice : p.purchasePrice;
          if (newSellingPrice === p.sellingPrice && newPurchasePrice === p.purchasePrice) return p;
          const updated = {
            ...p,
            sellingPrice: newSellingPrice,
            purchasePrice: newPurchasePrice,
            updatedAt: getBangladeshTodayDateString(),
          };
          syncProductUpsert(updated);
          return updated;
        })
      );
    }

    const updatedTx: StockInTransaction = {
      ...tx,
      date: data.date || tx.date,
      supplierName: data.supplierName !== undefined ? data.supplierName : tx.supplierName,
      supplierInvoiceNo: data.supplierInvoiceNo !== undefined ? data.supplierInvoiceNo : tx.supplierInvoiceNo,
      remarks: data.remarks !== undefined ? data.remarks : tx.remarks,
      items: updatedItems,
      totalQuantity,
      totalPurchaseCost: Number(totalPurchaseCost.toFixed(2)),
    };

    setStockIns((prev) => prev.map((t) => (t.id === stockInId ? updatedTx : t)));

    if (changedStocks.length > 0) {
      setBranchStocks((prev) =>
        prev.map((s) => {
          const m = changedStocks.find((cs) => cs.branchId === s.branchId && cs.productId === s.productId);
          return m ? m : s;
        })
      );
      changedStocks.forEach((st) => syncBranchStockUpsert(st));
    }

    if (movementsToAdd.length > 0) {
      setStockMovements((prev) => [...movementsToAdd, ...prev]);
      movementsToAdd.forEach((m) => syncMovementInsert(m));
    }

    syncStockInUpsert(updatedTx);

    return { success: true, message: `Stock In "${tx.referenceNo}" updated successfully.` };
  };

  // Super Admin: Delete Stock In (Reverses added stock)
  const deleteStockIn = (stockInId: string) => {
    if (currentUser.role !== 'super_admin') {
      return { success: false, message: 'Unauthorized: Only Super Admin can delete stock-in records.' };
    }

    const tx = stockIns.find((t) => t.id === stockInId);
    if (!tx) return { success: false, message: 'Stock In transaction not found.' };

    const changedStocks: BranchProductStock[] = [];
    const movementsToAdd: StockMovement[] = [];

    for (const item of tx.items) {
      const current = branchStocks.find((s) => s.branchId === tx.branchId && s.productId === item.productId);
      const prod = products.find((p) => p.id === item.productId);
      if (current) {
        const newCurrentStock = current.currentStock - item.quantity;
        const updatedEntry: BranchProductStock = {
          ...current,
          stockIn: Math.max(0, current.stockIn - item.quantity),
          currentStock: newCurrentStock,
          lastUpdated: new Date().toLocaleString(),
        };
        changedStocks.push(updatedEntry);

        movementsToAdd.push({
          id: `mov_del_sin_${Date.now()}_${item.productId}`,
          timestamp: new Date().toLocaleString(),
          date: getBangladeshTodayDateString(),
          branchId: tx.branchId,
          branchName: tx.branchName,
          productId: item.productId,
          productName: prod?.name || item.productName,
          sku: prod?.sku || item.sku,
          type: 'stock_out',
          quantityChange: -item.quantity,
          balanceAfter: newCurrentStock,
          referenceNo: tx.referenceNo,
          notes: `Super Admin Stock-In Deletion: Inward stock reversed (-${item.quantity} units).`,
          userId: currentUser.id,
          userName: currentUser.name,
        });
      }
    }

    if (changedStocks.length > 0) {
      setBranchStocks((prev) =>
        prev.map((s) => {
          const m = changedStocks.find((cs) => cs.branchId === s.branchId && cs.productId === s.productId);
          return m ? m : s;
        })
      );
      changedStocks.forEach((st) => syncBranchStockUpsert(st));
    }

    if (movementsToAdd.length > 0) {
      setStockMovements((prev) => [...movementsToAdd, ...prev]);
      movementsToAdd.forEach((m) => syncMovementInsert(m));
    }

    setStockIns((prev) => prev.filter((t) => t.id !== stockInId));
    syncStockInDelete(stockInId);

    return { success: true, message: `Stock In "${tx.referenceNo}" permanently deleted and inventory reversed.` };
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

    const refNo = `SOUT-${getBangladeshDateCompact()}-${Math.floor(100 + Math.random() * 900)}`;

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
      createdAt: new Date().toISOString(),
    };

    const movementsToAdd: StockMovement[] = [];
    const changedStocks: BranchProductStock[] = [];

    // Precalculate synchronously so changedStocks is immediately populated for Supabase sync
    for (const item of itemsWithDetails) {
      const current = branchStocks.find((s) => s.branchId === data.branchId && s.productId === item.productId);
      if (current) {
        const newCurrentStock = current.currentStock - item.quantity;
        const updatedEntry: BranchProductStock = {
          ...current,
          stockOut: current.stockOut + item.quantity,
          currentStock: newCurrentStock,
          lastUpdated: new Date().toLocaleString(),
        };
        changedStocks.push(updatedEntry);

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

    setBranchStocks((prev) =>
      prev.map((s) => {
        const matching = changedStocks.find((cs) => cs.branchId === s.branchId && cs.productId === s.productId);
        return matching ? matching : s;
      })
    );

    setStockOuts((prev) => [newTx, ...prev]);
    setStockMovements((prev) => [...movementsToAdd, ...prev]);

    // Push to Supabase Cloud immediately
    syncStockOutUpsert(newTx);
    changedStocks.forEach((st) => syncBranchStockUpsert(st));
    movementsToAdd.forEach((m) => syncMovementInsert(m));

    return { success: true, message: `Stock Out completed successfully. Ref: ${refNo}`, transaction: newTx };
  };

  // Super Admin: Update Stock Out
  const updateStockOut = (stockOutId: string, data: {
    date?: string;
    reason?: StockOutReason;
    referenceDocNo?: string;
    remarks?: string;
    items?: { productId: string; quantity: number }[];
  }) => {
    if (currentUser.role !== 'super_admin') {
      return { success: false, message: 'Unauthorized: Only Super Admin can edit stock-out records.' };
    }

    const tx = stockOuts.find((t) => t.id === stockOutId);
    if (!tx) return { success: false, message: 'Stock Out transaction not found.' };

    const changedStocks: BranchProductStock[] = [];
    const movementsToAdd: StockMovement[] = [];

    let updatedItems = tx.items;
    let totalQuantity = tx.totalQuantity;

    if (data.items && data.items.length > 0) {
      const oldItemMap = new Map<string, number>();
      tx.items.forEach((it) => oldItemMap.set(it.productId, (oldItemMap.get(it.productId) || 0) + it.quantity));

      const newItemMap = new Map<string, number>();
      data.items.forEach((it) => newItemMap.set(it.productId, (newItemMap.get(it.productId) || 0) + it.quantity));

      const allProductIds = new Set([...oldItemMap.keys(), ...newItemMap.keys()]);

      for (const prodId of allProductIds) {
        const oldQty = oldItemMap.get(prodId) || 0;
        const newQty = newItemMap.get(prodId) || 0;
        const diff = newQty - oldQty; // >0: more deducted, <0: less deducted (stock restored)

        if (diff !== 0) {
          const current = branchStocks.find((s) => s.branchId === tx.branchId && s.productId === prodId);
          const prod = products.find((p) => p.id === prodId);
          if (current) {
            const newCurrentStock = current.currentStock - diff;
            const updatedEntry: BranchProductStock = {
              ...current,
              stockOut: Math.max(0, current.stockOut + diff),
              currentStock: newCurrentStock,
              lastUpdated: new Date().toLocaleString(),
            };
            changedStocks.push(updatedEntry);

            movementsToAdd.push({
              id: `mov_edit_sout_${Date.now()}_${prodId}`,
              timestamp: new Date().toLocaleString(),
              date: data.date || tx.date,
              branchId: tx.branchId,
              branchName: tx.branchName,
              productId: prodId,
              productName: prod?.name || 'Product',
              sku: prod?.sku || 'SKU',
              type: diff > 0 ? 'stock_out' : 'stock_in',
              quantityChange: -diff,
              balanceAfter: newCurrentStock,
              referenceNo: tx.referenceNo,
              notes: `Super Admin Stock-Out Edit: Adjusted by ${diff > 0 ? `-${diff}` : `+${Math.abs(diff)}`} units.`,
              userId: currentUser.id,
              userName: currentUser.name,
            });
          }
        }
      }

      totalQuantity = 0;
      updatedItems = data.items.map((it, idx) => {
        const prod = products.find((p) => p.id === it.productId);
        totalQuantity += it.quantity;
        return {
          id: tx.items[idx]?.id || `soi_${Date.now()}_${idx}`,
          productId: it.productId,
          productName: prod?.name || 'Product',
          sku: prod?.sku || 'SKU',
          categoryName: prod?.categoryName || 'Cosmetic Products',
          quantity: it.quantity,
        };
      });
    }

    const updatedTx: StockOutTransaction = {
      ...tx,
      date: data.date || tx.date,
      reason: data.reason || tx.reason,
      referenceDocNo: data.referenceDocNo !== undefined ? data.referenceDocNo : tx.referenceDocNo,
      remarks: data.remarks !== undefined ? data.remarks : tx.remarks,
      items: updatedItems,
      totalQuantity,
    };

    setStockOuts((prev) => prev.map((t) => (t.id === stockOutId ? updatedTx : t)));

    if (changedStocks.length > 0) {
      setBranchStocks((prev) =>
        prev.map((s) => {
          const m = changedStocks.find((cs) => cs.branchId === s.branchId && cs.productId === s.productId);
          return m ? m : s;
        })
      );
      changedStocks.forEach((st) => syncBranchStockUpsert(st));
    }

    if (movementsToAdd.length > 0) {
      setStockMovements((prev) => [...movementsToAdd, ...prev]);
      movementsToAdd.forEach((m) => syncMovementInsert(m));
    }

    syncStockOutUpsert(updatedTx);

    return { success: true, message: `Stock Out "${tx.referenceNo}" updated successfully.` };
  };

  // Super Admin: Delete Stock Out (Restores deducted stock)
  const deleteStockOut = (stockOutId: string) => {
    if (currentUser.role !== 'super_admin') {
      return { success: false, message: 'Unauthorized: Only Super Admin can delete stock-out records.' };
    }

    const tx = stockOuts.find((t) => t.id === stockOutId);
    if (!tx) return { success: false, message: 'Stock Out transaction not found.' };

    const changedStocks: BranchProductStock[] = [];
    const movementsToAdd: StockMovement[] = [];

    for (const item of tx.items) {
      const current = branchStocks.find((s) => s.branchId === tx.branchId && s.productId === item.productId);
      const prod = products.find((p) => p.id === item.productId);
      if (current) {
        const newCurrentStock = current.currentStock + item.quantity;
        const updatedEntry: BranchProductStock = {
          ...current,
          stockOut: Math.max(0, current.stockOut - item.quantity),
          currentStock: newCurrentStock,
          lastUpdated: new Date().toLocaleString(),
        };
        changedStocks.push(updatedEntry);

        movementsToAdd.push({
          id: `mov_del_sout_${Date.now()}_${item.productId}`,
          timestamp: new Date().toLocaleString(),
          date: getBangladeshTodayDateString(),
          branchId: tx.branchId,
          branchName: tx.branchName,
          productId: item.productId,
          productName: prod?.name || item.productName,
          sku: prod?.sku || item.sku,
          type: 'stock_in',
          quantityChange: item.quantity,
          balanceAfter: newCurrentStock,
          referenceNo: tx.referenceNo,
          notes: `Super Admin Stock-Out Deletion: Restored ${item.quantity} units (Stock-In).`,
          userId: currentUser.id,
          userName: currentUser.name,
        });
      }
    }

    if (changedStocks.length > 0) {
      setBranchStocks((prev) =>
        prev.map((s) => {
          const m = changedStocks.find((cs) => cs.branchId === s.branchId && cs.productId === s.productId);
          return m ? m : s;
        })
      );
      changedStocks.forEach((st) => syncBranchStockUpsert(st));
    }

    if (movementsToAdd.length > 0) {
      setStockMovements((prev) => [...movementsToAdd, ...prev]);
      movementsToAdd.forEach((m) => syncMovementInsert(m));
    }

    setStockOuts((prev) => prev.filter((t) => t.id !== stockOutId));
    syncStockOutDelete(stockOutId);

    return { success: true, message: `Stock Out "${tx.referenceNo}" permanently deleted and stock restored (Stock-In).` };
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

    const invoiceNo = `INV-${getBangladeshDateCompact()}-${Math.floor(1000 + Math.random() * 9000)}`;

    let totalQuantitySold = 0;
    const saleItems: SaleItem[] = [];

    // Track simulated consumption within this sale across items of the same product
    const runningProductConsumedMap = new Map<string, number>();

    for (const item of data.items) {
      const prod = products.find((p) => p.id === item.productId);
      const stock = branchStocks.find((s) => s.branchId === data.branchId && s.productId === item.productId);

      if (item.isDecant && item.decantMlAmount) {
        const capacity = prod?.bottleCapacityMl || prod?.decantConfig?.bottleCapacityMl || 100;
        const purchaseCost = calculateDecantItemCost(prod?.purchasePrice || 0, capacity, item.decantMlAmount);
        const sellingPrice = item.sellingPrice;
        const totalCost = Number((item.quantity * purchaseCost).toFixed(2));
        const totalSales = Number((item.quantity * sellingPrice).toFixed(2));
        const grossProfit = Number((totalSales - totalCost).toFixed(2));

        totalQuantitySold += item.quantity;
        saleItems.push({
          id: `sli_${Date.now()}_${saleItems.length}`,
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
          isDecant: true,
          decantVariantName: item.decantVariantName,
          decantMlAmount: item.decantMlAmount,
        });
      } else {
        // FIFO Batch Allocation: earliest batch (by date) sells first.
        // ONE saleItem per original user row — weighted average purchaseCost across batches.
        const baseConsumed = (stock?.quantitySold || 0) + (stock?.stockOut || 0);
        const extraConsumedInThisTx = runningProductConsumedMap.get(item.productId) || 0;
        const totalPriorConsumed = baseConsumed + extraConsumedInThisTx;

        const batches = getProductBatches({
          branchId: data.branchId,
          productId: item.productId,
          openingStock: stock?.openingStock || 0,
          defaultPurchasePrice: prod?.purchasePrice || 0,
          stockIns,
          totalConsumedQty: totalPriorConsumed,
        });

        const allocations = allocateSaleFromLowestCostBatches(batches, item.quantity, prod?.purchasePrice || 0);

        // Compute weighted average purchase cost across all batch allocations
        const totalAllocQty = allocations.reduce((s, a) => s + a.quantity, 0);
        const totalAllocCost = allocations.reduce((s, a) => s + a.quantity * a.purchasePrice, 0);
        const weightedAvgPurchaseCost = totalAllocQty > 0
          ? Number((totalAllocCost / totalAllocQty).toFixed(4))
          : (prod?.purchasePrice || 0);

        // Use user-entered selling price as-is
        const sellingPrice = Math.max(0, Number(item.sellingPrice) || 0);
        const quantity = item.quantity;
        const totalCost = Number((quantity * weightedAvgPurchaseCost).toFixed(2));
        const totalSales = Number((quantity * sellingPrice).toFixed(2));
        const grossProfit = Number((totalSales - totalCost).toFixed(2));
        const firstBatchRef = allocations[0]?.referenceNo || 'Stock';

        totalQuantitySold += quantity;
        saleItems.push({
          id: `sli_${Date.now()}_${saleItems.length}`,
          productId: item.productId,
          productName: prod?.name || 'Product',
          sku: prod?.sku || 'SKU',
          categoryName: prod?.categoryName || 'Cosmetic Products',
          quantity,
          purchaseCost: weightedAvgPurchaseCost,
          sellingPrice,
          totalCost,
          totalSales,
          grossProfit,
          batchReferenceNo: firstBatchRef,
          batchPurchasePrice: weightedAvgPurchaseCost,
          isDecant: false,
        });

        runningProductConsumedMap.set(item.productId, extraConsumedInThisTx + item.quantity);
      }
    }

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
      createdAt: new Date().toISOString(),
    };

    const movementsToAdd: StockMovement[] = [];
    const changedStocks: BranchProductStock[] = [];

    // Group and accumulate product stock adjustments cleanly
    const productDeductionMap = new Map<string, {
      totalSoldUnits: number;
      decantBottles: number;
      decantRemainingMl?: number;
      isDecant: boolean;
      decantMlTotal: number;
      productName: string;
      sku: string;
    }>();

    for (const item of saleItems) {
      const existing = productDeductionMap.get(item.productId);
      if (item.isDecant && item.decantMlAmount) {
        const prod = products.find((p) => p.id === item.productId);
        const current = branchStocks.find((s) => s.branchId === data.branchId && s.productId === item.productId);
        const capacity = prod?.bottleCapacityMl || prod?.decantConfig?.bottleCapacityMl || 100;
        const mlSold = item.decantMlAmount * item.quantity;
        const currentOpenBottle = existing?.decantRemainingMl !== undefined ? existing.decantRemainingMl : (current?.openBottleMlRemaining || 0);
        const currentBottles = existing ? (current?.currentStock || 0) - (existing.decantBottles || 0) : (current?.currentStock || 0);

        const decantRes = calculateDecantStockDeduction({
          currentStock: currentBottles,
          currentOpenBottleMl: currentOpenBottle,
          bottleCapacityMl: capacity,
          wastageMl: 0,
          mlSold,
        });

        productDeductionMap.set(item.productId, {
          totalSoldUnits: (existing?.totalSoldUnits || 0) + decantRes.bottlesDecremented,
          decantBottles: (existing?.decantBottles || 0) + decantRes.bottlesDecremented,
          decantRemainingMl: decantRes.newOpenBottleMl,
          isDecant: true,
          decantMlTotal: (existing?.decantMlTotal || 0) + mlSold,
          productName: item.productName,
          sku: item.sku,
        });
      } else {
        productDeductionMap.set(item.productId, {
          totalSoldUnits: (existing?.totalSoldUnits || 0) + item.quantity,
          decantBottles: 0,
          decantRemainingMl: existing?.decantRemainingMl,
          isDecant: false,
          decantMlTotal: 0,
          productName: item.productName,
          sku: item.sku,
        });
      }
    }

    for (const [prodId, ded] of productDeductionMap.entries()) {
      const current = branchStocks.find((s) => s.branchId === data.branchId && s.productId === prodId);
      if (current) {
        const newSold = (current.quantitySold || 0) + ded.totalSoldUnits;
        const newCurrentStock = calculateCurrentStock({
          openingStock: current.openingStock,
          stockIn: current.stockIn,
          stockOut: current.stockOut,
          quantitySold: newSold,
          salesReturn: current.salesReturn,
          purchaseReturn: current.purchaseReturn,
        });

        const updatedEntry: BranchProductStock = {
          ...current,
          quantitySold: newSold,
          currentStock: newCurrentStock,
          openBottleMlRemaining: ded.isDecant ? ded.decantRemainingMl : current.openBottleMlRemaining,
          lastUpdated: new Date().toLocaleString(),
        };
        changedStocks.push(updatedEntry);

        movementsToAdd.push({
          id: `mov_${Date.now()}_${prodId}`,
          timestamp: new Date().toLocaleString(),
          date: data.date,
          branchId: data.branchId,
          branchName: branch.name,
          productId: prodId,
          productName: ded.productName,
          sku: ded.sku,
          type: 'sale',
          quantityChange: -ded.totalSoldUnits,
          balanceAfter: newCurrentStock,
          referenceNo: invoiceNo,
          notes: ded.isDecant
            ? `Decanted sale (${ded.decantMlTotal}ml). Open bottle: ${ded.decantRemainingMl}ml. Sold to: ${newSale.customerName}`
            : `Sold to: ${newSale.customerName} (${data.paymentMethod})`,
          userId: currentUser.id,
          userName: currentUser.name,
        });
      }
    }

    setBranchStocks((prev) =>
      prev.map((s) => {
        const matching = changedStocks.find((cs) => cs.branchId === s.branchId && cs.productId === s.productId);
        return matching ? matching : s;
      })
    );

    setSales((prev) => [newSale, ...prev]);
    setStockMovements((prev) => [...movementsToAdd, ...prev]);

    // Push to Supabase Cloud immediately
    syncSaleUpsert(newSale);
    changedStocks.forEach((st) => syncBranchStockUpsert(st));
    movementsToAdd.forEach((m) => syncMovementInsert(m));

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
    const changedStocks: BranchProductStock[] = [];

    // Precalculate synchronously so changedStocks is immediately populated for Supabase sync
    for (const item of sale.items) {
      const current = branchStocks.find((s) => s.branchId === sale.branchId && s.productId === item.productId);
      const prod = products.find((p) => p.id === item.productId);

      if (current) {
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

          const updatedEntry: BranchProductStock = {
            ...current,
            currentStock: restoreRes.newCurrentStock,
            openBottleMlRemaining: restoreRes.newOpenBottleMl,
            quantitySold: Math.max(0, current.quantitySold - restoreRes.bottlesIncremented),
            lastUpdated: new Date().toLocaleString(),
          };
          changedStocks.push(updatedEntry);

          movementsToAdd.push({
            id: `mov_cancel_${Date.now()}_${item.productId}`,
            timestamp: new Date().toLocaleString(),
            date: getBangladeshTodayDateString(),
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
          const updatedEntry: BranchProductStock = {
            ...current,
            quantitySold: Math.max(0, current.quantitySold - item.quantity),
            currentStock: restoredCurrentStock,
            lastUpdated: new Date().toLocaleString(),
          };
          changedStocks.push(updatedEntry);

          movementsToAdd.push({
            id: `mov_cancel_${Date.now()}_${item.productId}`,
            timestamp: new Date().toLocaleString(),
            date: getBangladeshTodayDateString(),
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

    setBranchStocks((prev) =>
      prev.map((s) => {
        const matching = changedStocks.find((cs) => cs.branchId === s.branchId && cs.productId === s.productId);
        return matching ? matching : s;
      })
    );

    const updatedSale: SaleTransaction = {
      ...sale,
      status: 'cancelled',
      cancellationReason: reason,
      cancelledAt: new Date().toLocaleString(),
      cancelledByName: currentUser.name,
    };

    setSales((prev) =>
      prev.map((s) => (s.id === saleId ? updatedSale : s))
    );

    setStockMovements((prev) => [...movementsToAdd, ...prev]);

    // Push to Supabase Cloud
    syncSaleUpsert(updatedSale);
    changedStocks.forEach((st) => syncBranchStockUpsert(st));
    movementsToAdd.forEach((m) => syncMovementInsert(m));

    return { success: true, message: `Sale ${sale.invoiceNo} cancelled. Stock restored to ${sale.branchName}.` };
  };

  // Super Admin: Update Sale Invoice
  const updateSale = (saleId: string, data: {
    customerName?: string;
    customerPhone?: string;
    paymentMethod?: PaymentMethod;
    date?: string;
    notes?: string;
    discountType?: DiscountType;
    discountValue?: number;
    items?: {
      productId: string;
      quantity: number;
      sellingPrice: number;
      isDecant?: boolean;
      decantVariantName?: string;
      decantMlAmount?: number;
    }[];
  }) => {
    if (currentUser.role !== 'super_admin') {
      return { success: false, message: 'Unauthorized: Only Super Admin can edit sale invoices.' };
    }

    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return { success: false, message: 'Sale invoice not found.' };

    const changedStocks: BranchProductStock[] = [];
    const movementsToAdd: StockMovement[] = [];

    let updatedSaleItems = sale.items;
    let totalQuantitySold = sale.totalQuantitySold;

    if (data.items && data.items.length > 0 && sale.status === 'completed') {
      const oldItemMap = new Map<string, number>();
      sale.items.forEach((it) => oldItemMap.set(it.productId, (oldItemMap.get(it.productId) || 0) + it.quantity));

      const newItemMap = new Map<string, number>();
      data.items.forEach((it) => newItemMap.set(it.productId, (newItemMap.get(it.productId) || 0) + it.quantity));

      const allProductIds = new Set([...oldItemMap.keys(), ...newItemMap.keys()]);

      for (const prodId of allProductIds) {
        const oldQty = oldItemMap.get(prodId) || 0;
        const newQty = newItemMap.get(prodId) || 0;
        const diff = newQty - oldQty; // >0: sold more, <0: sold less (stock returned)

        if (diff !== 0) {
          const current = branchStocks.find((s) => s.branchId === sale.branchId && s.productId === prodId);
          const prod = products.find((p) => p.id === prodId);
          if (current) {
            const newCurrentStock = current.currentStock - diff;
            const updatedEntry: BranchProductStock = {
              ...current,
              quantitySold: Math.max(0, current.quantitySold + diff),
              currentStock: newCurrentStock,
              lastUpdated: new Date().toLocaleString(),
            };
            changedStocks.push(updatedEntry);

            movementsToAdd.push({
              id: `mov_edit_sale_${Date.now()}_${prodId}`,
              timestamp: new Date().toLocaleString(),
              date: data.date || sale.date,
              branchId: sale.branchId,
              branchName: sale.branchName,
              productId: prodId,
              productName: prod?.name || 'Product',
              sku: prod?.sku || 'SKU',
              type: diff > 0 ? 'stock_out' : 'stock_in',
              quantityChange: -diff,
              balanceAfter: newCurrentStock,
              referenceNo: sale.invoiceNo,
              notes: `Super Admin Sale Edit: Quantity adjusted by ${diff > 0 ? `+${diff}` : diff} units.`,
              userId: currentUser.id,
              userName: currentUser.name,
            });
          }
        }
      }

      totalQuantitySold = 0;
      updatedSaleItems = data.items.map((it, idx) => {
        const prod = products.find((p) => p.id === it.productId);
        const purchaseCost = prod ? prod.purchasePrice : 0;
        const totalCost = Number((it.quantity * purchaseCost).toFixed(2));
        const totalSales = Number((it.quantity * it.sellingPrice).toFixed(2));
        const grossProfit = Number((totalSales - totalCost).toFixed(2));
        totalQuantitySold += it.quantity;

        return {
          id: sale.items[idx]?.id || `sli_${Date.now()}_${idx}`,
          productId: it.productId,
          productName: prod?.name || 'Product',
          sku: prod?.sku || 'SKU',
          categoryName: prod?.categoryName || 'Cosmetic Products',
          quantity: it.quantity,
          purchaseCost,
          sellingPrice: it.sellingPrice,
          totalCost,
          totalSales,
          grossProfit,
          isDecant: it.isDecant,
          decantVariantName: it.decantVariantName,
          decantMlAmount: it.decantMlAmount,
        };
      });
    }

    const subtotal = Number(updatedSaleItems.reduce((acc, si) => acc + si.totalSales, 0).toFixed(2));
    const discType = data.discountType !== undefined ? data.discountType : (sale.discountType || 'fixed');
    const discVal = data.discountValue !== undefined ? Math.max(0, Number(data.discountValue) || 0) : (sale.discountValue || 0);
    const discAmount = calculateDiscountAmount(subtotal, discType, discVal);

    const totals = calculateSaleTotals(
      updatedSaleItems.map((si) => ({
        quantity: si.quantity,
        purchaseCost: si.purchaseCost,
        sellingPrice: si.sellingPrice,
      })),
      discAmount
    );

    const updatedSale: SaleTransaction = {
      ...sale,
      customerName: data.customerName !== undefined ? data.customerName.trim() : sale.customerName,
      customerPhone: data.customerPhone !== undefined ? data.customerPhone.trim() : sale.customerPhone,
      paymentMethod: data.paymentMethod || sale.paymentMethod,
      date: data.date || sale.date,
      notes: data.notes !== undefined ? data.notes : sale.notes,
      items: updatedSaleItems,
      totalQuantitySold,
      subtotal: totals.subtotal,
      discountType: discVal > 0 ? discType : undefined,
      discountValue: discVal > 0 ? discVal : undefined,
      discountAmount: totals.discountAmount,
      totalCostOfGoodsSold: totals.totalCost,
      totalSalesAmount: totals.totalSales,
      grossProfit: totals.grossProfit,
    };

    setSales((prev) => prev.map((s) => (s.id === saleId ? updatedSale : s)));

    if (changedStocks.length > 0) {
      setBranchStocks((prev) =>
        prev.map((s) => {
          const m = changedStocks.find((cs) => cs.branchId === s.branchId && cs.productId === s.productId);
          return m ? m : s;
        })
      );
      changedStocks.forEach((st) => syncBranchStockUpsert(st));
    }

    if (movementsToAdd.length > 0) {
      setStockMovements((prev) => [...movementsToAdd, ...prev]);
      movementsToAdd.forEach((m) => syncMovementInsert(m));
    }

    syncSaleUpsert(updatedSale);

    return { success: true, message: `Invoice "${sale.invoiceNo}" updated successfully.` };
  };

  // Permanently Delete Sale Invoice (Super Admin Only: Auto Stock-In / Restore)
  const deleteSale = (saleId: string) => {
    if (currentUser.role !== 'super_admin') {
      return { success: false, message: 'Unauthorized: Only Super Admin can permanently delete sale invoices.' };
    }

    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return { success: false, message: 'Sale invoice not found.' };

    const movementsToAdd: StockMovement[] = [];
    const changedStocks: BranchProductStock[] = [];

    // If sale was completed, auto stock-in / restore stock back to branch inventory
    if (sale.status === 'completed') {
      for (const item of sale.items) {
        const current = branchStocks.find((s) => s.branchId === sale.branchId && s.productId === item.productId);
        const prod = products.find((p) => p.id === item.productId);

        if (current) {
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

            const updatedEntry: BranchProductStock = {
              ...current,
              currentStock: restoreRes.newCurrentStock,
              openBottleMlRemaining: restoreRes.newOpenBottleMl,
              quantitySold: Math.max(0, current.quantitySold - restoreRes.bottlesIncremented),
              lastUpdated: new Date().toLocaleString(),
            };
            changedStocks.push(updatedEntry);

            movementsToAdd.push({
              id: `mov_del_${Date.now()}_${item.productId}`,
              timestamp: new Date().toLocaleString(),
              date: getBangladeshTodayDateString(),
              branchId: sale.branchId,
              branchName: sale.branchName,
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              type: 'stock_in',
              quantityChange: restoreRes.bottlesIncremented,
              balanceAfter: restoreRes.newCurrentStock,
              referenceNo: sale.invoiceNo,
              notes: `Super Admin Invoice Deletion: Auto stock restored (Stock-In ${mlRestored}ml, ${restoreRes.bottlesIncremented} bottle).`,
              userId: currentUser.id,
              userName: currentUser.name,
            });
          } else {
            const restoredCurrentStock = current.currentStock + item.quantity;
            const updatedEntry: BranchProductStock = {
              ...current,
              quantitySold: Math.max(0, current.quantitySold - item.quantity),
              currentStock: restoredCurrentStock,
              lastUpdated: new Date().toLocaleString(),
            };
            changedStocks.push(updatedEntry);

            movementsToAdd.push({
              id: `mov_del_${Date.now()}_${item.productId}`,
              timestamp: new Date().toLocaleString(),
              date: getBangladeshTodayDateString(),
              branchId: sale.branchId,
              branchName: sale.branchName,
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              type: 'stock_in',
              quantityChange: item.quantity,
              balanceAfter: restoredCurrentStock,
              referenceNo: sale.invoiceNo,
              notes: `Super Admin Invoice Deletion: Auto stock restored (Stock-In +${item.quantity} units).`,
              userId: currentUser.id,
              userName: currentUser.name,
            });
          }
        }
      }
    }

    if (changedStocks.length > 0) {
      setBranchStocks((prev) =>
        prev.map((s) => {
          const matching = changedStocks.find((cs) => cs.branchId === s.branchId && cs.productId === s.productId);
          return matching ? matching : s;
        })
      );
      changedStocks.forEach((st) => syncBranchStockUpsert(st));
    }

    if (movementsToAdd.length > 0) {
      setStockMovements((prev) => [...movementsToAdd, ...prev]);
      movementsToAdd.forEach((m) => syncMovementInsert(m));
    }

    // Permanently remove sale from state
    setSales((prev) => prev.filter((s) => s.id !== saleId));

    // Permanently remove from Supabase online database
    syncSaleDelete(saleId);

    return { success: true, message: `Invoice "${sale.invoiceNo}" permanently deleted and stock auto-restored (Stock-In).` };
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

    const transferNo = `TRF-${getBangladeshDateCompact()}-${Math.floor(100 + Math.random() * 900)}`;
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
    const newSourceStock = sourceStock ? sourceStock.currentStock - data.quantity : 0;
    const changedStockRecord: BranchProductStock | null = sourceStock
      ? {
          ...sourceStock,
          stockOut: sourceStock.stockOut + data.quantity,
          currentStock: newSourceStock,
          lastUpdated: new Date().toLocaleString(),
        }
      : null;

    if (changedStockRecord) {
      setBranchStocks((prev) =>
        prev.map((s) => (s.branchId === data.sourceBranchId && s.productId === data.productId ? changedStockRecord! : s))
      );
    }

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

    // Push to Supabase Cloud immediately
    syncTransferUpsert(newTransfer);
    if (changedStockRecord) syncBranchStockUpsert(changedStockRecord);
    syncMovementInsert(movement);

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
    const destStock = branchStocks.find((s) => s.branchId === trf.destinationBranchId && s.productId === trf.productId);
    const newDestStock = destStock ? destStock.currentStock + trf.quantity : trf.quantity;
    const changedStockRecord: BranchProductStock = destStock
      ? {
          ...destStock,
          stockIn: destStock.stockIn + trf.quantity,
          currentStock: newDestStock,
          lastUpdated: new Date().toLocaleString(),
        }
      : {
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
        };

    setBranchStocks((prev) => {
      const idx = prev.findIndex((s) => s.branchId === trf.destinationBranchId && s.productId === trf.productId);
      if (idx >= 0) {
        return prev.map((s, i) => (i === idx ? changedStockRecord : s));
      }
      return [...prev, changedStockRecord];
    });

    const movement: StockMovement = {
      id: `mov_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      date: getBangladeshTodayDateString(),
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

    const updatedTransfer: BranchTransfer = {
      ...trf,
      status: 'Received',
      receivedBy: currentUser.name,
      receivedAt: new Date().toLocaleString(),
    };

    setTransfers((prev) =>
      prev.map((t) => (t.id === transferId ? updatedTransfer : t))
    );

    setStockMovements((prev) => [movement, ...prev]);

    // Push to Supabase Cloud immediately
    syncTransferUpsert(updatedTransfer);
    syncBranchStockUpsert(changedStockRecord);
    syncMovementInsert(movement);

    return { success: true, message: `Transfer ${trf.transferNo} received! Stock added to ${trf.destinationBranchName}.` };
  };

  const cancelTransfer = (transferId: string, reason: string) => {
    const trf = transfers.find((t) => t.id === transferId);
    if (!trf) return { success: false, message: 'Transfer not found.' };
    if (trf.status !== 'Dispatched') {
      return { success: false, message: 'Only active dispatched transfers can be cancelled.' };
    }

    // Restore stock back to source branch
    const sourceStock = branchStocks.find((s) => s.branchId === trf.sourceBranchId && s.productId === trf.productId);
    const restoredStock = sourceStock ? sourceStock.currentStock + trf.quantity : trf.quantity;
    const changedStockRecord: BranchProductStock | null = sourceStock
      ? {
          ...sourceStock,
          stockOut: Math.max(0, sourceStock.stockOut - trf.quantity),
          currentStock: restoredStock,
          lastUpdated: new Date().toLocaleString(),
        }
      : null;

    if (changedStockRecord) {
      setBranchStocks((prev) =>
        prev.map((s) => (s.branchId === trf.sourceBranchId && s.productId === trf.productId ? changedStockRecord! : s))
      );
    }

    const movement: StockMovement = {
      id: `mov_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      date: getBangladeshTodayDateString(),
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

    const updatedTransfer: BranchTransfer = {
      ...trf,
      status: 'Cancelled',
      cancelledBy: currentUser.name,
      cancelledAt: new Date().toLocaleString(),
      cancellationReason: reason,
    };

    setTransfers((prev) =>
      prev.map((t) => (t.id === transferId ? updatedTransfer : t))
    );

    setStockMovements((prev) => [movement, ...prev]);

    // Push to Supabase Cloud immediately
    syncTransferUpsert(updatedTransfer);
    if (changedStockRecord) syncBranchStockUpsert(changedStockRecord);
    syncMovementInsert(movement);

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
      createdAt: new Date().toISOString(),
    };

    setOpeningBalances((prev) => [newRec, ...prev.filter((ob) => !(ob.branchId === data.branchId && ob.date === data.date))]);
    syncOpeningBalanceUpsert(newRec);
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

    const voucherNo = `VCH-${getBangladeshDateCompact()}-${Math.floor(100 + Math.random() * 900)}`;

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
    syncExpenseUpsert(newExp);
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

    const updatedExp: OperatingExpense = {
      ...existing,
      ...data,
      branchName,
      amount: data.amount !== undefined ? Number(data.amount.toFixed(2)) : existing.amount,
    };

    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? updatedExp : e))
    );

    syncExpenseUpsert(updatedExp);
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
    syncExpenseDelete(id);
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
      createdAt: getBangladeshTodayDateString(),
      isDefault: false,
    };

    setExpenseCategories((prev) => [newCat, ...prev]);
    syncExpenseCategoryUpsert(newCat);
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
    const updatedCat: ExpenseCategoryItem = {
      ...target,
      name: trimmed,
      description: description !== undefined ? description.trim() : target.description,
    };

    setExpenseCategories((prev) =>
      prev.map((c) => (c.id === id ? updatedCat : c))
    );

    syncExpenseCategoryUpsert(updatedCat);

    // If the category name changed, update existing vouchers referencing the old name
    if (oldName !== trimmed) {
      setExpenses((prev) =>
        prev.map((e) => {
          if (e.category === oldName) {
            const upVoucher = { ...e, category: trimmed };
            syncExpenseUpsert(upVoucher);
            return upVoucher;
          }
          return e;
        })
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
    syncExpenseCategoryDelete(id);
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
        updateStockIn,
        deleteStockIn,
        createStockOut,
        updateStockOut,
        deleteStockOut,
        createSale,
        updateSale,
        cancelSale,
        deleteSale,
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
        getProductBatchesForBranch,
        getProductTotalStockAcrossBranches,
        resetAllDataToDefault,
        isAuthenticated,
        login,
        logout,
        getNextUserId,
        isCloudSyncing,
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
