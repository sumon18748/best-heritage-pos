import { BranchOpeningBalance, SaleTransaction, OperatingExpense } from '../types';

export interface StockCalculationParams {
  openingStock: number;
  stockIn: number;
  stockOut: number;
  quantitySold: number;
  salesReturn?: number;
  purchaseReturn?: number;
}

/**
 * Formula:
 * Current Stock = Opening Stock + Stock In + Sales Return − Stock Out − Quantity Sold − Purchase Return
 */
export function calculateCurrentStock(params: StockCalculationParams): number {
  const opening = Number(params.openingStock) || 0;
  const inQty = Number(params.stockIn) || 0;
  const sReturn = Number(params.salesReturn) || 0;
  const outQty = Number(params.stockOut) || 0;
  const soldQty = Number(params.quantitySold) || 0;
  const pReturn = Number(params.purchaseReturn) || 0;

  return opening + inQty + sReturn - outQty - soldQty - pReturn;
}

export type StockAlertStatus = 'out_of_stock' | 'low_stock' | 'healthy';

export function calculateStockAlertStatus(currentStock: number, minAlertLevel: number): StockAlertStatus {
  if (currentStock <= 0) {
    return 'out_of_stock';
  }
  if (currentStock <= minAlertLevel) {
    return 'low_stock';
  }
  return 'healthy';
}

export function canStockOut(currentStock: number, requestedQty: number): { allowed: boolean; message?: string } {
  if (requestedQty <= 0) {
    return { allowed: false, message: 'Quantity must be greater than zero.' };
  }
  if (requestedQty > currentStock) {
    return {
      allowed: false,
      message: `Requested quantity (${requestedQty}) exceeds available current stock (${currentStock}).`,
    };
  }
  return { allowed: true };
}

export function calculateStockInCost(quantity: number, unitPurchasePrice: number): number {
  const qty = Math.max(0, Number(quantity) || 0);
  const price = Math.max(0, Number(unitPurchasePrice) || 0);
  return Number((qty * price).toFixed(2));
}

export interface SaleItemCalculation {
  quantity: number;
  purchaseCost: number; // cost of goods sold per unit
  sellingPrice: number;
}

export interface SaleItemTotals {
  totalSales: number;
  totalCost: number;
  grossProfit: number;
  subtotal?: number;
  discountAmount?: number;
}

export function calculateSaleItemTotals(item: SaleItemCalculation): SaleItemTotals {
  const qty = Math.max(0, Number(item.quantity) || 0);
  const cost = Math.max(0, Number(item.purchaseCost) || 0);
  const price = Math.max(0, Number(item.sellingPrice) || 0);

  const totalSales = Number((qty * price).toFixed(2));
  const totalCost = Number((qty * cost).toFixed(2));
  const grossProfit = Number((totalSales - totalCost).toFixed(2));

  return { totalSales, totalCost, grossProfit };
}

export function calculateDiscountAmount(
  subtotal: number,
  discountType: 'fixed' | 'percentage',
  discountValue: number
): number {
  const sub = Math.max(0, Number(subtotal) || 0);
  const val = Math.max(0, Number(discountValue) || 0);

  if (val <= 0 || sub <= 0) return 0;

  if (discountType === 'percentage') {
    const raw = (sub * val) / 100;
    return Number(Math.min(sub, Math.max(0, raw)).toFixed(2));
  } else {
    // Fixed / Cash discount
    return Number(Math.min(sub, val).toFixed(2));
  }
}

export function calculateSaleTotals(
  items: SaleItemCalculation[],
  discountAmount: number = 0
): SaleItemTotals & { subtotal: number; discountAmount: number } {
  let subtotal = 0;
  let totalCost = 0;

  for (const item of items) {
    const res = calculateSaleItemTotals(item);
    subtotal += res.totalSales;
    totalCost += res.totalCost;
  }

  const roundedSubtotal = Number(subtotal.toFixed(2));
  const roundedCost = Number(totalCost.toFixed(2));
  const validDiscount = Math.min(roundedSubtotal, Math.max(0, Number(discountAmount) || 0));
  const roundedDiscount = Number(validDiscount.toFixed(2));
  const netSales = Number((roundedSubtotal - roundedDiscount).toFixed(2));
  const grossProfit = Number((netSales - roundedCost).toFixed(2));

  return {
    subtotal: roundedSubtotal,
    discountAmount: roundedDiscount,
    totalSales: netSales,
    totalCost: roundedCost,
    grossProfit,
  };
}

export function formatCurrencyBDT(amount: number): string {
  const val = Number(amount) || 0;
  return `Tk ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function calculateNetProfit(grossProfit: number, totalOperatingExpenses: number): number {
  const gp = Number(grossProfit) || 0;
  const opex = Number(totalOperatingExpenses) || 0;
  return Number((gp - opex).toFixed(2));
}

export interface CashBankBalances {
  physicalCash: number;
  bankBalance: number;
}

export function calculateCashBankBalances(params: {
  openingCash: number;
  openingBank: number;
  cashSales: number;
  bankSales: number; // card, bKash, nagad, bank transfer
  cashExpenses: number;
  bankExpenses: number;
}): CashBankBalances {
  const openingCash = Number(params.openingCash) || 0;
  const openingBank = Number(params.openingBank) || 0;
  const cashSales = Number(params.cashSales) || 0;
  const bankSales = Number(params.bankSales) || 0;
  const cashExpenses = Number(params.cashExpenses) || 0;
  const bankExpenses = Number(params.bankExpenses) || 0;

  const physicalCash = Number((openingCash + cashSales - cashExpenses).toFixed(2));
  const bankBalance = Number((openingBank + bankSales - bankExpenses).toFixed(2));

  return { physicalCash, bankBalance };
}

export interface BranchCashMetrics {
  branchId: string;
  branchName: string;
  openingCash: number;
  openingBank: number;
  isAutoFromPreviousDay: boolean;
  todayCashSales: number;
  todayBankSales: number;
  todayCashExpenses: number;
  todayBankExpenses: number;
  currentPhysicalCash: number;
  currentBankBalance: number;
}

/**
 * Calculates a branch's opening cash (automatically rolled over from yesterday's closing cash if not manually set),
 * today's cash sales, today's cash expenses, and current physical cash in till.
 */
export function calculateBranchDailyCashMetrics(params: {
  branchId: string;
  branchName: string;
  targetDate: string; // YYYY-MM-DD
  openingBalances: BranchOpeningBalance[];
  sales: SaleTransaction[];
  expenses: OperatingExpense[];
}): BranchCashMetrics {
  const { branchId, branchName, targetDate, openingBalances, sales, expenses } = params;

  // 1. Explicit opening balance for targetDate
  const explicitToday = openingBalances.find(
    (ob) => ob.branchId === branchId && ob.date === targetDate
  );

  let openingCash = 0;
  let openingBank = 0;
  let isAutoFromPreviousDay = false;

  if (explicitToday) {
    openingCash = Number(explicitToday.openingCashAmount) || 0;
    openingBank = Number(explicitToday.openingBankAmount) || 0;
  } else {
    // 2. Find latest opening balance before targetDate
    const priorObs = openingBalances
      .filter((ob) => ob.branchId === branchId && ob.date < targetDate)
      .sort((a, b) => b.date.localeCompare(a.date));
    const latestPriorOb = priorObs[0];

    const baseCash = latestPriorOb ? Number(latestPriorOb.openingCashAmount) || 0 : 0;
    const baseBank = latestPriorOb ? Number(latestPriorOb.openingBankAmount) || 0 : 0;
    const baseDate = latestPriorOb ? latestPriorOb.date : '1970-01-01';

    // Sum transactions before targetDate and >= baseDate
    const priorCashSales = sales
      .filter(
        (s) =>
          s.branchId === branchId &&
          s.status === 'completed' &&
          s.paymentMethod === 'Cash' &&
          s.date < targetDate &&
          s.date >= baseDate
      )
      .reduce((sum, s) => sum + s.totalSalesAmount, 0);

    const priorBankSales = sales
      .filter(
        (s) =>
          s.branchId === branchId &&
          s.status === 'completed' &&
          s.paymentMethod !== 'Cash' &&
          s.date < targetDate &&
          s.date >= baseDate
      )
      .reduce((sum, s) => sum + s.totalSalesAmount, 0);

    const priorCashExpenses = expenses
      .filter(
        (e) =>
          e.branchId === branchId &&
          e.paymentSource === 'Physical Cash' &&
          e.date < targetDate &&
          e.date >= baseDate
      )
      .reduce((sum, e) => sum + e.amount, 0);

    const priorBankExpenses = expenses
      .filter(
        (e) =>
          e.branchId === branchId &&
          e.paymentSource === 'Bank Account' &&
          e.date < targetDate &&
          e.date >= baseDate
      )
      .reduce((sum, e) => sum + e.amount, 0);

    // Closing Cash from the end of the previous day rolls over as today's Opening Cash
    openingCash = Math.max(0, Number((baseCash + priorCashSales - priorCashExpenses).toFixed(2)));
    openingBank = Math.max(0, Number((baseBank + priorBankSales - priorBankExpenses).toFixed(2)));
    isAutoFromPreviousDay = true;
  }

  // 3. Transactions on targetDate
  const todayCashSales = sales
    .filter(
      (s) =>
        s.branchId === branchId &&
        s.status === 'completed' &&
        s.paymentMethod === 'Cash' &&
        s.date === targetDate
    )
    .reduce((sum, s) => sum + s.totalSalesAmount, 0);

  const todayBankSales = sales
    .filter(
      (s) =>
        s.branchId === branchId &&
        s.status === 'completed' &&
        s.paymentMethod !== 'Cash' &&
        s.date === targetDate
    )
    .reduce((sum, s) => sum + s.totalSalesAmount, 0);

  const todayCashExpenses = expenses
    .filter(
      (e) =>
        e.branchId === branchId &&
        e.paymentSource === 'Physical Cash' &&
        e.date === targetDate
    )
    .reduce((sum, e) => sum + e.amount, 0);

  const todayBankExpenses = expenses
    .filter(
      (e) =>
        e.branchId === branchId &&
        e.paymentSource === 'Bank Account' &&
        e.date === targetDate
    )
    .reduce((sum, e) => sum + e.amount, 0);

  // 4. Current physical cash in till right now
  const currentPhysicalCash = Number((openingCash + todayCashSales - todayCashExpenses).toFixed(2));
  const currentBankBalance = Number((openingBank + todayBankSales - todayBankExpenses).toFixed(2));

  return {
    branchId,
    branchName,
    openingCash,
    openingBank,
    isAutoFromPreviousDay,
    todayCashSales,
    todayBankSales,
    todayCashExpenses,
    todayBankExpenses,
    currentPhysicalCash,
    currentBankBalance,
  };
}

/**
 * Calculates consolidated and per-branch cash metrics across all or selected branches.
 */
export function calculateConsolidatedCashMetrics(params: {
  branchIds: string[];
  branches: { id: string; name: string }[];
  targetDate: string;
  openingBalances: BranchOpeningBalance[];
  sales: SaleTransaction[];
  expenses: OperatingExpense[];
}): {
  consolidated: {
    openingCash: number;
    openingBank: number;
    todayCashSales: number;
    todayBankSales: number;
    todayCashExpenses: number;
    todayBankExpenses: number;
    currentPhysicalCash: number;
    currentBankBalance: number;
  };
  byBranch: BranchCashMetrics[];
} {
  const byBranch = params.branches
    .filter((b) => params.branchIds.includes(b.id))
    .map((b) =>
      calculateBranchDailyCashMetrics({
        branchId: b.id,
        branchName: b.name,
        targetDate: params.targetDate,
        openingBalances: params.openingBalances,
        sales: params.sales,
        expenses: params.expenses,
      })
    );

  const consolidated = byBranch.reduce(
    (acc, bm) => ({
      openingCash: Number((acc.openingCash + bm.openingCash).toFixed(2)),
      openingBank: Number((acc.openingBank + bm.openingBank).toFixed(2)),
      todayCashSales: Number((acc.todayCashSales + bm.todayCashSales).toFixed(2)),
      todayBankSales: Number((acc.todayBankSales + bm.todayBankSales).toFixed(2)),
      todayCashExpenses: Number((acc.todayCashExpenses + bm.todayCashExpenses).toFixed(2)),
      todayBankExpenses: Number((acc.todayBankExpenses + bm.todayBankExpenses).toFixed(2)),
      currentPhysicalCash: Number((acc.currentPhysicalCash + bm.currentPhysicalCash).toFixed(2)),
      currentBankBalance: Number((acc.currentBankBalance + bm.currentBankBalance).toFixed(2)),
    }),
    {
      openingCash: 0,
      openingBank: 0,
      todayCashSales: 0,
      todayBankSales: 0,
      todayCashExpenses: 0,
      todayBankExpenses: 0,
      currentPhysicalCash: 0,
      currentBankBalance: 0,
    }
  );

  return { consolidated, byBranch };
}

export function canInitiateTransfer(
  availableStock: number,
  quantity: number
): { allowed: boolean; message?: string } {
  if (quantity <= 0) {
    return { allowed: false, message: 'Transfer quantity must be greater than zero.' };
  }
  if (quantity > availableStock) {
    return {
      allowed: false,
      message: `Cannot transfer ${quantity} units. Only ${availableStock} units available at the source branch.`,
    };
  }
  return { allowed: true };
}

/**
 * Decanting (Fractional Sale) cost calculation.
 * Factors in wastage so that the purchase cost of the bottle is fully and fairly recovered
 * across the net usable ml sold without any loss.
 */
export function calculateDecantItemCost(
  bottlePurchasePrice: number,
  usableMl: number,
  variantMl: number
): number {
  if (usableMl <= 0 || variantMl <= 0 || bottlePurchasePrice <= 0) return 0;
  const costPerMl = bottlePurchasePrice / usableMl;
  return Number((variantMl * costPerMl).toFixed(2));
}

export interface DecantDeductionParams {
  currentStock: number; // Whole bottles remaining
  currentOpenBottleMl?: number; // Ml remaining in currently open bottle
  bottleCapacityMl: number; // e.g. 100 ml
  wastageMl: number; // e.g. 10 ml
  mlSold: number; // e.g. 6 ml, 10 ml
}

export interface DecantDeductionResult {
  allowed: boolean;
  newCurrentStock: number;
  newOpenBottleMl: number;
  bottlesDecremented: number;
  message?: string;
}

/**
 * Deducts fractional ml from open bottle inventory.
 * When the open bottle's usable ml is exhausted, exactly 1 whole bottle is decremented from stock.
 */
export function calculateDecantStockDeduction(params: DecantDeductionParams): DecantDeductionResult {
  const { currentStock, bottleCapacityMl, wastageMl, mlSold } = params;
  const usableMl = Math.max(1, bottleCapacityMl - wastageMl);
  let openMl = params.currentOpenBottleMl !== undefined ? params.currentOpenBottleMl : 0;
  let remainingBottles = currentStock;

  if (mlSold <= 0) {
    return { allowed: false, newCurrentStock: currentStock, newOpenBottleMl: openMl, bottlesDecremented: 0, message: 'Sold ml must be greater than 0.' };
  }

  // If no open bottle currently exists or open bottle is empty, we must start from a sealed bottle
  if (openMl <= 0) {
    if (remainingBottles <= 0) {
      return {
        allowed: false,
        newCurrentStock: currentStock,
        newOpenBottleMl: openMl,
        bottlesDecremented: 0,
        message: 'No stock available to open a new bottle for decanting.',
      };
    }
    openMl = usableMl;
  }

  let remainingMlToDeduct = mlSold;
  let bottlesDecremented = 0;

  while (remainingMlToDeduct > 0) {
    if (openMl >= remainingMlToDeduct) {
      // Current open bottle has enough ml
      openMl -= remainingMlToDeduct;
      remainingMlToDeduct = 0;
      if (openMl === 0) {
        // Exactly finished this bottle
        bottlesDecremented += 1;
        remainingBottles -= 1;
      }
    } else {
      // Open bottle is partially consumed and finished
      remainingMlToDeduct -= openMl;
      bottlesDecremented += 1;
      remainingBottles -= 1;

      if (remainingBottles > 0) {
        // Open next bottle
        openMl = usableMl;
      } else {
        // No more bottles left in stock to fulfill remaining ml
        if (remainingMlToDeduct > 0) {
          return {
            allowed: false,
            newCurrentStock: currentStock,
            newOpenBottleMl: params.currentOpenBottleMl || 0,
            bottlesDecremented: 0,
            message: `Insufficient stock to fulfill ${mlSold} ml. Only ${params.currentOpenBottleMl || 0} ml available.`,
          };
        }
        openMl = 0;
      }
    }
  }

  return {
    allowed: true,
    newCurrentStock: Math.max(0, remainingBottles),
    newOpenBottleMl: openMl,
    bottlesDecremented,
  };
}

/**
 * Restores decanted ml when an invoice is cancelled / voided.
 */
export function calculateDecantCancelRestore(params: {
  currentStock: number;
  currentOpenBottleMl?: number;
  bottleCapacityMl: number;
  wastageMl: number;
  mlRestored: number;
}): { newCurrentStock: number; newOpenBottleMl: number; bottlesIncremented: number } {
  const { currentStock, bottleCapacityMl, wastageMl, mlRestored } = params;
  const usableMl = Math.max(1, bottleCapacityMl - wastageMl);
  let openMl = (params.currentOpenBottleMl || 0) + mlRestored;
  let bottlesIncremented = 0;

  while (openMl > usableMl) {
    bottlesIncremented += 1;
    openMl -= usableMl;
  }

  return {
    newCurrentStock: currentStock + bottlesIncremented,
    newOpenBottleMl: openMl,
    bottlesIncremented,
  };
}

/**
 * Multi-price Batch Inventory Tracking
 * Represents an inward stock batch (Opening stock or Stock In transaction)
 */
export interface AvailableBatch {
  batchId: string;
  sourceType: 'opening' | 'stock_in';
  referenceNo: string;
  date: string;
  purchasePrice: number;
  initialQuantity: number;
  consumedQuantity: number;
  remainingQuantity: number;
}

export interface BatchSaleAllocation {
  batchId: string;
  referenceNo: string;
  purchasePrice: number;
  quantity: number;
}

export interface StockInLikeItem {
  productId: string;
  quantity: number;
  purchasePrice: number;
}

export interface StockInLikeTransaction {
  id: string;
  referenceNo: string;
  date: string;
  branchId: string;
  items: StockInLikeItem[];
}

/**
 * Computes available batches for a product at a branch, sorted by lowest purchase price first.
 * Then consumes already sold/stock-out quantities so that lower-cost batches are depleted first.
 */
export function getProductBatches(params: {
  branchId: string;
  productId: string;
  openingStock: number;
  defaultPurchasePrice: number;
  stockIns: StockInLikeTransaction[];
  totalConsumedQty: number; // (branchStock.quantitySold || 0) + (branchStock.stockOut || 0)
}): AvailableBatch[] {
  const allBatches: {
    batchId: string;
    sourceType: 'opening' | 'stock_in';
    referenceNo: string;
    date: string;
    purchasePrice: number;
    initialQuantity: number;
  }[] = [];

  // 1. Opening stock batch (if any)
  const openingQty = Math.max(0, Number(params.openingStock) || 0);
  if (openingQty > 0) {
    allBatches.push({
      batchId: `batch_open_${params.productId}`,
      sourceType: 'opening',
      referenceNo: 'Opening Stock',
      date: '1970-01-01',
      purchasePrice: Math.max(0, Number(params.defaultPurchasePrice) || 0),
      initialQuantity: openingQty,
    });
  }

  // 2. Stock In transactions for this branch and product
  const relevantTx = (params.stockIns || []).filter((tx) => tx.branchId === params.branchId);
  for (const tx of relevantTx) {
    for (let i = 0; i < (tx.items || []).length; i++) {
      const it = tx.items[i];
      if (it.productId === params.productId && it.quantity > 0) {
        allBatches.push({
          batchId: `batch_si_${tx.id}_${i}`,
          sourceType: 'stock_in',
          referenceNo: tx.referenceNo || 'Stock In',
          date: tx.date || '',
          purchasePrice: Math.max(0, Number(it.purchasePrice) || 0),
          initialQuantity: Math.max(0, Number(it.quantity) || 0),
        });
      }
    }
  }

  // 3. User's Golden Rule: "Lowest cost batch sells first, followed by higher cost"
  // Primary sort: purchasePrice ASC (lowest cost first).
  // Secondary sort: date ASC (earliest first / FIFO).
  // FIFO: date ASC only — earliest batch out first, price does NOT matter
  allBatches.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  // 4. Deplete already consumed units (sold + stockOut) starting from the lowest price batch first
  let unallocatedConsumed = Math.max(0, Number(params.totalConsumedQty) || 0);

  const batchesWithRemaining: AvailableBatch[] = allBatches.map((b) => {
    const consumed = Math.min(b.initialQuantity, unallocatedConsumed);
    unallocatedConsumed -= consumed;
    const remaining = Math.max(0, b.initialQuantity - consumed);

    return {
      batchId: b.batchId,
      sourceType: b.sourceType,
      referenceNo: b.referenceNo,
      date: b.date,
      purchasePrice: b.purchasePrice,
      initialQuantity: b.initialQuantity,
      consumedQuantity: consumed,
      remainingQuantity: remaining,
    };
  });

  return batchesWithRemaining;
}

/**
 * Allocates requested sale quantity across available batches starting from lowest cost first.
 * If quantity spans multiple batches with different purchase prices, splits into separate allocations.
 */
export function allocateSaleFromLowestCostBatches(
  availableBatches: AvailableBatch[],
  quantityRequested: number,
  fallbackPurchasePrice: number = 0
): BatchSaleAllocation[] {
  let needed = Math.max(0, Number(quantityRequested) || 0);
  const allocations: BatchSaleAllocation[] = [];

  // Filter batches with remaining stock > 0 (already sorted lowest price first)
  const activeBatches = (availableBatches || []).filter((b) => b.remainingQuantity > 0);

  for (const batch of activeBatches) {
    if (needed <= 0) break;
    const take = Math.min(batch.remainingQuantity, needed);
    if (take > 0) {
      allocations.push({
        batchId: batch.batchId,
        referenceNo: batch.referenceNo,
        purchasePrice: batch.purchasePrice,
        quantity: take,
      });
      needed -= take;
    }
  }

  // If there's still quantity needed (e.g. initial stock not explicitly logged as stockIn batch)
  if (needed > 0) {
    allocations.push({
      batchId: 'unrecorded_batch',
      referenceNo: 'General Stock',
      purchasePrice: Math.max(0, Number(fallbackPurchasePrice) || 0),
      quantity: needed,
    });
  }

  return allocations;
}

/**
 * Generates the next sequential 4-digit Branch Code.
 * Rule:
 *  - 1st Branch is always '0001' (Head Office).
 *  - 2nd Branch onwards sequentially auto-increments: '0002', '0003', etc.
 */
export function getNextBranchCode(branches?: { code?: string }[] | null): string {
  if (!branches || branches.length === 0) {
    return '0001';
  }

  const numbers = branches
    .map((b) => {
      const match = (b?.code || '').match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    })
    .filter((n) => !isNaN(n) && n > 0);

  if (numbers.length === 0) {
    return '0001';
  }

  const maxNum = Math.max(...numbers);
  return String(maxNum + 1).padStart(4, '0');
}

export interface BranchLike {
  id: string;
  name: string;
  code: string;
  address?: string;
  contactNumber?: string;
  isActive?: boolean;
  createdAt?: string;
}

/**
 * Normalizes branch list to guarantee:
 * 1. Head Office is always the first branch (code '0001').
 * 2. Any other branch (including any added branch that was assigned '0001' or 'AFT-01')
 *    gets sequential codes starting from '0002'.
 */
export function normalizeBranchList<T extends BranchLike>(
  list: T[],
  defaultHeadOffice?: T
): T[] {
  if (!Array.isArray(list) || list.length === 0) {
    return defaultHeadOffice ? [defaultHeadOffice] : [];
  }

  const rawList = [...list];

  // 1. Find Head Office by ID or by name
  let headOffice = rawList.find(
    (b) => b.id === 'br_head_office' || b.name.trim().toLowerCase().includes('head office')
  );

  if (!headOffice) {
    headOffice = defaultHeadOffice || ({
      id: 'br_head_office',
      name: 'Head Office',
      code: '0001',
      address: 'Head Office, Dhaka, Bangladesh',
      contactNumber: '+880 1700-000001',
      isActive: true,
      createdAt: '2026-01-01',
    } as T);
  } else {
    headOffice = {
      ...headOffice,
      code: '0001',
    };
  }

  // 2. All other branches
  const otherBranches = rawList.filter(
    (b) => b.id !== headOffice!.id && !b.name.trim().toLowerCase().includes('head office')
  );

  // 3. Sequential remapping for non-Head Office branches (starts at 0002)
  const normalizedOthers = otherBranches.map((b, idx) => {
    let code = b.code;
    if (code === '0001' || code === 'AFT-01' || !code) {
      code = String(idx + 2).padStart(4, '0');
    }
    return {
      ...b,
      code,
    };
  });

  return [headOffice, ...normalizedOthers];
}

/**
 * Determines if a branch is an active, physical inventory-holding branch (outlet/warehouse).
 * Head Office (code '0001') is strictly administrative and cannot carry physical stock.
 * Inactive branches are excluded from all inventory operations.
 */
export function isStockableBranch(
  branch?: { id?: string; code?: string; name?: string; isActive?: boolean } | null
): boolean {
  if (!branch) return false;
  if (branch.isActive === false) return false;
  if (branch.id === 'br_head_office') return false;
  if (branch.code === '0001') return false;
  if ((branch.name || '').trim().toLowerCase().includes('head office')) return false;
  return true;
}




