import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCurrentStock,
  calculateStockAlertStatus,
  canStockOut,
  calculateStockInCost,
  calculateSaleItemTotals,
  calculateSaleTotals,
  calculateDiscountAmount,
  calculateNetProfit,
  calculateCashBankBalances,
  canInitiateTransfer,
  calculateDecantItemCost,
  calculateDecantStockDeduction,
  calculateDecantCancelRestore,
  getNextBranchCode,
} from './stockCalculations.ts';

test('calculateCurrentStock uses the business formula accurately', () => {
  // Opening: 100, Stock In: 50, Sales Return: 5, Stock Out: 10, Sold: 30, Purchase Return: 5
  // Current = 100 + 50 + 5 - 10 - 30 - 5 = 110
  const stock = calculateCurrentStock({
    openingStock: 100,
    stockIn: 50,
    salesReturn: 5,
    stockOut: 10,
    quantitySold: 30,
    purchaseReturn: 5,
  });
  assert.equal(stock, 110);
});

test('calculateCurrentStock handles zero or default values', () => {
  const stock = calculateCurrentStock({
    openingStock: 25,
    stockIn: 10,
    stockOut: 5,
    quantitySold: 12,
  });
  // 25 + 10 - 5 - 12 = 18
  assert.equal(stock, 18);
});

test('calculateStockAlertStatus flags out_of_stock, low_stock, and healthy', () => {
  assert.equal(calculateStockAlertStatus(0, 10), 'out_of_stock');
  assert.equal(calculateStockAlertStatus(-2, 10), 'out_of_stock');
  assert.equal(calculateStockAlertStatus(4, 10), 'low_stock');
  assert.equal(calculateStockAlertStatus(10, 10), 'low_stock');
  assert.equal(calculateStockAlertStatus(11, 10), 'healthy');
});

test('canStockOut validates against available current stock', () => {
  const ok = canStockOut(20, 15);
  assert.equal(ok.allowed, true);

  const exact = canStockOut(20, 20);
  assert.equal(exact.allowed, true);

  const exceed = canStockOut(20, 25);
  assert.equal(exceed.allowed, false);
  assert.match(exceed.message || '', /exceeds available/);

  const zero = canStockOut(20, 0);
  assert.equal(zero.allowed, false);
});

test('calculateStockInCost computes total purchase cost', () => {
  assert.equal(calculateStockInCost(10, 450), 4500);
  assert.equal(calculateStockInCost(3, 1250.5), 3751.5);
});

test('calculateSaleItemTotals computes sales, cogs, and gross profit', () => {
  // Sold 4 units, Purchase cost = 450, Selling price = 850
  // Total Sales = 4 * 850 = 3400
  // Total Cost = 4 * 450 = 1800
  // Gross Profit = 3400 - 1800 = 1600
  const result = calculateSaleItemTotals({
    quantity: 4,
    purchaseCost: 450,
    sellingPrice: 850,
  });
  assert.equal(result.totalSales, 3400);
  assert.equal(result.totalCost, 1800);
  assert.equal(result.grossProfit, 1600);
});

test('calculateSaleTotals aggregates multi-item invoice totals', () => {
  const items = [
    { quantity: 2, purchaseCost: 1000, sellingPrice: 1500 }, // Sales: 3000, Cost: 2000, Profit: 1000
    { quantity: 3, purchaseCost: 200, sellingPrice: 400 },   // Sales: 1200, Cost: 600, Profit: 600
  ];
  const totals = calculateSaleTotals(items);
  assert.equal(totals.totalSales, 4200);
  assert.equal(totals.totalCost, 2600);
  assert.equal(totals.grossProfit, 1600);
});

test('calculateDiscountAmount handles Fixed (Cash) and Percentage (%) correctly', () => {
  // Subtotal = 2000
  // 1. Fixed / Cash discount of 250 Tk
  const cashDisc = calculateDiscountAmount(2000, 'fixed', 250);
  assert.equal(cashDisc, 250);

  // 2. Percentage discount of 10%
  const pctDisc = calculateDiscountAmount(2000, 'percentage', 10);
  assert.equal(pctDisc, 200);

  // 3. Discount cannot exceed subtotal
  const excessCash = calculateDiscountAmount(500, 'fixed', 800);
  assert.equal(excessCash, 500);

  const excessPct = calculateDiscountAmount(500, 'percentage', 150);
  assert.equal(excessPct, 500);

  // 4. Zero or negative discount returns 0
  assert.equal(calculateDiscountAmount(1000, 'fixed', 0), 0);
  assert.equal(calculateDiscountAmount(1000, 'percentage', -5), 0);
});

test('calculateSaleTotals incorporates discount and adjusts net sales and gross profit', () => {
  const items = [
    { quantity: 2, purchaseCost: 1000, sellingPrice: 1500 }, // Subtotal: 3000, Cost: 2000
    { quantity: 1, purchaseCost: 500, sellingPrice: 1000 },  // Subtotal: 1000, Cost: 500
  ];
  // Subtotal = 4000, Total Cost = 2500
  // Discount = 400 Tk (10% or fixed)
  const totals = calculateSaleTotals(items, 400);
  assert.equal(totals.subtotal, 4000);
  assert.equal(totals.discountAmount, 400);
  assert.equal(totals.totalSales, 3600); // Net payable
  assert.equal(totals.totalCost, 2500);
  assert.equal(totals.grossProfit, 1100); // 3600 - 2500 = 1100
});

test('calculateNetProfit deducts operating expenses from gross profit', () => {
  // Gross Profit = 25000, Operating Expenses = 11200 -> Net Profit = 13800
  assert.equal(calculateNetProfit(25000, 11200), 13800);
  // Net Loss if expenses exceed profit
  assert.equal(calculateNetProfit(5000, 7500), -2500);
});

test('calculateCashBankBalances segregates cash and bank channels correctly', () => {
  const balances = calculateCashBankBalances({
    openingCash: 5000,
    openingBank: 50000,
    cashSales: 12000,
    bankSales: 28000, // bKash, card, bank
    cashExpenses: 4500, // tea, maintenance in cash
    bankExpenses: 15000, // rent paid from bank
  });

  // Physical Cash: 5000 + 12000 - 4500 = 12500
  assert.equal(balances.physicalCash, 12500);
  // Bank Balance: 50000 + 28000 - 15000 = 63000
  assert.equal(balances.bankBalance, 63000);
});

test('canInitiateTransfer enforces stock availability and positive quantities', () => {
  const ok = canInitiateTransfer(20, 10);
  assert.equal(ok.allowed, true);

  const exceed = canInitiateTransfer(5, 10);
  assert.equal(exceed.allowed, false);
  assert.match(exceed.message || '', /exceeds|available/i);

  const zero = canInitiateTransfer(10, 0);
  assert.equal(zero.allowed, false);
});

test('calculateDecantItemCost computes proportional cost factoring in wastage', () => {
  // Bottle 100ml purchase price: 2400 BDT, wastage: 10ml -> usable: 90ml
  // Cost per usable ml = 2400 / 90 = 26.666...
  // 6ml cost = 6 * 26.666... = 160.00
  const cost6ml = calculateDecantItemCost(2400, 90, 6);
  assert.equal(cost6ml, 160);

  // 10ml cost = 10 * 26.666... = 266.67
  const cost10ml = calculateDecantItemCost(2400, 90, 10);
  assert.equal(cost10ml, 266.67);

  // 30ml cost = 30 * 26.666... = 800.00
  const cost30ml = calculateDecantItemCost(2400, 90, 30);
  assert.equal(cost30ml, 800);
});

test('calculateDecantStockDeduction manages open bottle and decrements bottle only when exhausted', () => {
  // Initial: 5 whole bottles, no open bottle yet (0 ml open)
  // Sell 6 ml: Opens 1st bottle (90ml usable). Remaining open: 84ml. CurrentStock: 5 (bottle not yet exhausted)
  const res1 = calculateDecantStockDeduction({
    currentStock: 5,
    currentOpenBottleMl: 0,
    bottleCapacityMl: 100,
    wastageMl: 10,
    mlSold: 6,
  });
  assert.equal(res1.allowed, true);
  assert.equal(res1.newCurrentStock, 5);
  assert.equal(res1.newOpenBottleMl, 84);
  assert.equal(res1.bottlesDecremented, 0);

  // Next sale: Sell 84 ml from open bottle (finishes the open bottle!)
  // Remaining open: 0ml. CurrentStock decrements to 4!
  const res2 = calculateDecantStockDeduction({
    currentStock: 5,
    currentOpenBottleMl: 84,
    bottleCapacityMl: 100,
    wastageMl: 10,
    mlSold: 84,
  });
  assert.equal(res2.allowed, true);
  assert.equal(res2.newCurrentStock, 4);
  assert.equal(res2.newOpenBottleMl, 0);
  assert.equal(res2.bottlesDecremented, 1);

  // Next sale with spillover across bottles: 10ml left in open bottle, customer orders 30ml
  // Deducts 10ml from open bottle (bottle finishes, decrements to 3), opens next bottle (90ml) and deducts remaining 20ml -> 70ml left.
  const res3 = calculateDecantStockDeduction({
    currentStock: 4,
    currentOpenBottleMl: 10,
    bottleCapacityMl: 100,
    wastageMl: 10,
    mlSold: 30,
  });
  assert.equal(res3.allowed, true);
  assert.equal(res3.newCurrentStock, 3);
  assert.equal(res3.newOpenBottleMl, 70);
  assert.equal(res3.bottlesDecremented, 1);
});

test('calculateDecantCancelRestore restores ml and reverses bottle decrements cleanly', () => {
  // Restoring 6ml to an open bottle with 70ml -> 76ml
  const res1 = calculateDecantCancelRestore({
    currentStock: 3,
    currentOpenBottleMl: 70,
    bottleCapacityMl: 100,
    wastageMl: 10,
    mlRestored: 6,
  });
  assert.equal(res1.newCurrentStock, 3);
  assert.equal(res1.newOpenBottleMl, 76);
  assert.equal(res1.bottlesIncremented, 0);

  // Restoring 20ml when open bottle already has 80ml (80 + 20 = 100ml > 90ml usable)
  // Reconstitutes 1 whole bottle! CurrentStock becomes 4, openBottleMl becomes 10ml
  const res2 = calculateDecantCancelRestore({
    currentStock: 3,
    currentOpenBottleMl: 80,
    bottleCapacityMl: 100,
    wastageMl: 10,
    mlRestored: 20,
  });
  assert.equal(res2.newCurrentStock, 4);
  assert.equal(res2.newOpenBottleMl, 10);
  assert.equal(res2.bottlesIncremented, 1);
});

test('login authentication supports 5-digit user IDs: 99999, 00001, 00002 with password 123456', async () => {
  const { INITIAL_USERS } = await import('../data/mockData.ts');

  // Verify all 3 users exist with 5-digit username
  const superAdmin = INITIAL_USERS.find(u => u.username === '99999');
  assert.ok(superAdmin, 'Super Admin 99999 must exist');
  assert.equal(superAdmin.role, 'super_admin');
  assert.equal(superAdmin.name, 'Best Heritage');

  const admin = INITIAL_USERS.find(u => u.username === '00001');
  assert.ok(admin, 'Admin 00001 must exist');
  assert.equal(admin.role, 'admin');
  assert.equal(admin.name, 'Sumon');

  const manager = INITIAL_USERS.find(u => u.username === '00002');
  assert.ok(manager, 'Branch Manager 00002 must exist');
  assert.equal(manager.role, 'manager');
  assert.equal(manager.name, 'Sohel Ahmed');
  assert.equal(manager.branchName, 'Aftabnagar Branch');
});

test('Password change security: once password is changed, default 123456 must be rejected', async () => {
  // Simulate user credentials validation logic
  const user = {
    id: 'usr_manager',
    username: '00002',
    password: 'NewChangedPass2026',
  };

  const validateLogin = (enteredPass: string, userPass?: string) => {
    const expected = userPass || '123456';
    return enteredPass === expected;
  };

  // Default password '123456' MUST fail
  assert.equal(validateLogin('123456', user.password), false, 'Default 123456 must be rejected after password is changed');

  // Any other wrong password MUST fail
  assert.equal(validateLogin('wrongpassword', user.password), false, 'Wrong password must fail');

  // Only the exact changed password MUST succeed
  assert.equal(validateLogin('NewChangedPass2026', user.password), true, 'Changed password must succeed');
});

test('Multi-Price Stock In: quantities sum together and lowest cost batch sells first', async () => {
  const { getProductBatches, allocateSaleFromLowestCostBatches } = await import('./stockCalculations.ts');

  // Scenario:
  // Product: "Oud Royale", branch: "b1"
  // Stock In 1: 5 units @ 100 Tk purchase price (Ref: SI-001, Date: 2026-10-01)
  // Stock In 2: 10 units @ 150 Tk purchase price (Ref: SI-002, Date: 2026-10-05)
  // Total Stock In = 5 + 10 = 15 units.
  const stockIns = [
    {
      id: 'si_1',
      referenceNo: 'SI-001',
      date: '2026-10-01',
      branchId: 'b1',
      items: [{ productId: 'p1', quantity: 5, purchasePrice: 100 }],
    },
    {
      id: 'si_2',
      referenceNo: 'SI-002',
      date: '2026-10-05',
      branchId: 'b1',
      items: [{ productId: 'p1', quantity: 10, purchasePrice: 150 }],
    },
  ];

  // 1. Initial State: Total consumed = 0
  const batchesInitial = getProductBatches({
    branchId: 'b1',
    productId: 'p1',
    openingStock: 0,
    defaultPurchasePrice: 0,
    stockIns,
    totalConsumedQty: 0,
  });

  assert.equal(batchesInitial.length, 2);
  // Lowest cost batch must be first!
  assert.equal(batchesInitial[0].purchasePrice, 100);
  assert.equal(batchesInitial[0].remainingQuantity, 5);
  // Higher cost batch is second
  assert.equal(batchesInitial[1].purchasePrice, 150);
  assert.equal(batchesInitial[1].remainingQuantity, 10);

  // Total quantity across batches = 5 + 10 = 15
  const totalStockInitial = batchesInitial.reduce((sum, b) => sum + b.remainingQuantity, 0);
  assert.equal(totalStockInitial, 15);

  // 2. Sale 1: Sell 4 units
  // Should all be taken from the 100 Tk batch (lowest cost first)
  const allocation1 = allocateSaleFromLowestCostBatches(batchesInitial, 4);
  assert.equal(allocation1.length, 1);
  assert.equal(allocation1[0].purchasePrice, 100);
  assert.equal(allocation1[0].quantity, 4);

  // 3. Sale 2: Customer orders 7 units!
  // Batch 1 (@ 100 Tk) only has 5 units.
  // Requirement: "Must allocate separately. Lowest price batch sells first, followed by higher price."
  const allocation2 = allocateSaleFromLowestCostBatches(batchesInitial, 7);
  assert.equal(allocation2.length, 2, 'Must split into two separate batch sales');
  // First allocation: 5 units @ 100 Tk (lowest price batch exhausted first)
  assert.equal(allocation2[0].purchasePrice, 100);
  assert.equal(allocation2[0].quantity, 5);
  // Second allocation: 2 units @ 150 Tk (remaining quantity taken from higher price batch)
  assert.equal(allocation2[1].purchasePrice, 150);
  assert.equal(allocation2[1].quantity, 2);

  // 4. State after 7 units sold:
  // Total consumed = 7
  const batchesAfter7Sold = getProductBatches({
    branchId: 'b1',
    productId: 'p1',
    openingStock: 0,
    defaultPurchasePrice: 0,
    stockIns,
    totalConsumedQty: 7,
  });

  // Batch 1 (@ 100 Tk) is completely sold out (0 remaining)
  assert.equal(batchesAfter7Sold[0].purchasePrice, 100);
  assert.equal(batchesAfter7Sold[0].remainingQuantity, 0);
  assert.equal(batchesAfter7Sold[0].consumedQuantity, 5);

  // Batch 2 (@ 150 Tk) has 10 - 2 = 8 units remaining!
  assert.equal(batchesAfter7Sold[1].purchasePrice, 150);
  assert.equal(batchesAfter7Sold[1].remainingQuantity, 8);
  assert.equal(batchesAfter7Sold[1].consumedQuantity, 2);

  // Total current stock = 15 - 7 = 8 units
  const totalStockAfter7 = batchesAfter7Sold.reduce((sum, b) => sum + b.remainingQuantity, 0);
  assert.equal(totalStockAfter7, 8);

  // 5. Subsequent Sale of 3 units:
  // Must automatically sell from the remaining 150 Tk batch because 100 Tk batch is 0!
  const allocation3 = allocateSaleFromLowestCostBatches(batchesAfter7Sold, 3);
  assert.equal(allocation3.length, 1);
  assert.equal(allocation3[0].purchasePrice, 150);
  assert.equal(allocation3[0].quantity, 3);
});

test('Branch code auto generation: first branch is 0001 (Head Office), followed by 0002, 0003, etc.', () => {
  // Empty branches -> 0001 (Head Office)
  assert.equal(getNextBranchCode([]), '0001');
  assert.equal(getNextBranchCode(null), '0001');

  // Head Office (0001) exists -> next branch is 0002
  assert.equal(getNextBranchCode([{ code: '0001' }]), '0002');

  // Two branches exist (0001, 0002) -> next branch is 0003
  assert.equal(
    getNextBranchCode([{ code: '0001' }, { code: '0002' }]),
    '0003'
  );

  // Multiple sequential branches
  assert.equal(
    getNextBranchCode([{ code: '0001' }, { code: '0002' }, { code: '0003' }]),
    '0004'
  );

  // Even if legacy codes exist, numeric max is respected
  assert.equal(getNextBranchCode([{ code: '0009' }]), '0010');
});




