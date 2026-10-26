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

