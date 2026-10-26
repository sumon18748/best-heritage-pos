export type UserRole = 'super_admin' | 'admin' | 'manager';

export interface UserPermissions {
  allowedTabs: ActiveTab[];
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canViewProfit: boolean;
  canVoidSale: boolean;
}

export type RolePermissionsMap = Record<UserRole, UserPermissions>;

export interface User {
  id: string;
  username?: string;
  name: string;
  email: string;
  role: UserRole;
  branchId?: string; // For manager, strictly restricted to this branch
  branchName?: string;
  avatar?: string;
  phone?: string;
  password?: string;
  status: 'active' | 'inactive';
  permissions?: UserPermissions;
  createdAt: string;
}

export interface Branch {
  id: string;
  code: string;
  name: string;
  address: string;
  contactNumber: string;
  isActive: boolean;
  createdAt: string;
}

export type MainCategoryName = 'Cosmetic Products' | 'Food Products' | 'Perfume Products';

export interface Category {
  id: string;
  name: MainCategoryName;
  description: string;
  iconName?: string;
}

export interface DecantVariant {
  id: string;
  name: string; // e.g. "6 ml", "10 ml", "15 ml", "30 ml", "Full Bottle (100 ml)"
  mlAmount: number; // e.g. 6, 10, 15, 30, 100
  sellingPrice: number; // e.g. 350, 550, 800, 1500, 4500
}

export interface DecantConfig {
  isDecantable: boolean;
  bottleCapacityMl: number; // Total bottle size, e.g. 100 ml
  wastageMl: number; // Wastage / loss allowance during decanting, e.g. 10 ml
  usableMl: number; // Net usable liquid (bottleCapacityMl - wastageMl), e.g. 90 ml
  variants: DecantVariant[];
}

export interface Product {
  id: string;
  name: string;
  sku: string; // Product Code / SKU (unique)
  barcode?: string;
  categoryId: string;
  categoryName: MainCategoryName;
  subcategory?: string;
  purchasePrice: number;
  sellingPrice: number;
  openingStock: number;
  minAlertLevel: number;
  unitOfMeasure?: string;
  status: 'active' | 'inactive';
  packageSize?: number; // Size/weight/volume per unit (e.g. 100 for 100ml, 500 for 500g, 1000 for 1kg)
  packageUnit?: string; // Unit for package size (e.g. 'ml', 'g', 'kg', 'pcs')
  bottleCapacityMl?: number; // Perfume only: full sealed bottle size (e.g. 100ml). Enables decant selling.
  decantConfig?: DecantConfig; // Legacy — kept for backward compat; use bottleCapacityMl/packageSize going forward
  createdAt: string;
  updatedAt?: string;
}

export interface BranchProductStock {
  id: string;
  branchId: string;
  productId: string;
  openingStock: number;
  stockIn: number;
  stockOut: number;
  quantitySold: number;
  salesReturn: number;
  purchaseReturn: number;
  currentStock: number;
  minAlertLevel: number;
  lastUpdated: string;
  openBottleMlRemaining?: number; // Remaining usable ml in currently open shelf bottle
}

export interface StockInItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  categoryName: MainCategoryName;
  quantity: number;
  purchasePrice: number;
  totalCost: number;
  packageSize?: number;
  packageUnit?: string;
  totalVolumeWeight?: string; // e.g. "5000 ml" or "2500 g"
}

export interface StockInTransaction {
  id: string;
  referenceNo: string;
  date: string;
  branchId: string;
  branchName: string;
  supplierName?: string;
  supplierInvoiceNo?: string;
  remarks?: string;
  items: StockInItem[];
  totalQuantity: number;
  totalPurchaseCost: number;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
}

export type StockOutReason = 'Damaged Product' | 'Internal Use' | 'Lost Product' | 'Authorized Adjustment';

export interface StockOutItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  categoryName: MainCategoryName;
  quantity: number;
}

export interface StockOutTransaction {
  id: string;
  referenceNo: string;
  date: string;
  branchId: string;
  branchName: string;
  reason: StockOutReason;
  referenceDocNo?: string;
  remarks?: string;
  items: StockOutItem[];
  totalQuantity: number;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
}

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  categoryName: MainCategoryName;
  quantity: number;
  purchaseCost: number; // Snapshot of cost at sale time
  sellingPrice: number; // Snapshot of price at sale time
  totalCost: number;
  totalSales: number;
  grossProfit: number;
  batchReferenceNo?: string;
  batchPurchasePrice?: number;
  isDecant?: boolean;
  decantVariantName?: string; // e.g. "6 ml", "10 ml", "15 ml", "30 ml", or "Full Bottle (100 ml)"
  decantMlAmount?: number;
}

export type PaymentMethod = 'Cash' | 'bKash' | 'Nagad' | 'Bank Transfer' | 'Card';

export type DiscountType = 'fixed' | 'percentage';

export interface SaleTransaction {
  id: string;
  invoiceNo: string;
  date: string;
  branchId: string;
  branchName: string;
  customerName: string;
  customerPhone?: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  items: SaleItem[];
  totalQuantitySold: number;
  subtotal?: number;
  discountType?: DiscountType;
  discountValue?: number;
  discountAmount?: number;
  totalCostOfGoodsSold: number;
  totalSalesAmount: number;
  grossProfit: number;
  createdByUserId: string;
  createdByName: string;
  status: 'completed' | 'cancelled';
  cancellationReason?: string;
  cancelledAt?: string;
  cancelledByName?: string;
  createdAt: string;
}

export type MovementType =
  | 'opening'
  | 'stock_in'
  | 'stock_out'
  | 'sale'
  | 'sale_cancellation'
  | 'transfer_out'
  | 'transfer_in';

export interface StockMovement {
  id: string;
  timestamp: string;
  date: string;
  branchId: string;
  branchName: string;
  productId: string;
  productName: string;
  sku: string;
  type: MovementType;
  quantityChange: number; // + or -
  balanceAfter: number;
  referenceNo: string;
  notes?: string;
  userId: string;
  userName: string;
}

export type TransferStatus = 'Pending' | 'Dispatched' | 'Received' | 'Cancelled';

export interface BranchTransfer {
  id: string;
  transferNo: string;
  date: string;
  sourceBranchId: string;
  sourceBranchName: string;
  destinationBranchId: string;
  destinationBranchName: string;
  productId: string;
  productName: string;
  sku: string;
  categoryName: MainCategoryName;
  quantity: number;
  unitPurchaseCost: number;
  totalTransferCost: number;
  status: TransferStatus;
  notes?: string;
  dispatchedBy?: string;
  dispatchedAt?: string;
  receivedBy?: string;
  receivedAt?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  createdAt: string;
}

export interface BranchOpeningBalance {
  id: string;
  branchId: string;
  branchName: string;
  date: string; // YYYY-MM-DD
  openingCashAmount: number;
  openingBankAmount: number;
  notes?: string;
  setByUserId: string;
  setByName: string;
  createdAt: string;
}

export type ExpenseCategory = string;

export interface ExpenseCategoryItem {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  isDefault?: boolean;
}

export type ExpensePaymentSource = 'Physical Cash' | 'Bank Account';

export interface OperatingExpense {
  id: string;
  voucherNo: string;
  date: string;
  branchId: string;
  branchName: string;
  category: ExpenseCategory;
  amount: number;
  paymentSource: ExpensePaymentSource;
  description: string;
  vendorName?: string;
  recordedByUserId: string;
  recordedByName: string;
  createdAt: string;
}

export type ActiveTab =
  | 'dashboard'
  | 'products'
  | 'stock-in'
  | 'stock-out'
  | 'sales-entry'
  | 'sales-history'
  | 'current-stock'
  | 'stock-alerts'
  | 'transfers'
  | 'expenses'
  | 'branches'
  | 'reports'
  | 'users'
  | 'settings';
