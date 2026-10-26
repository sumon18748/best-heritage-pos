import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Package,
  Boxes,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
  XCircle,
  Building2,
  PlusCircle,
  Clock,
  ArrowRight,
  Filter,
  Sparkles,
  Apple,
  Flame,
  Coins,
  Building,
  Receipt,
  ArrowLeftRight,
  X,
  Check,
} from 'lucide-react';
import { MainCategoryName } from '../types';
import { calculateStockAlertStatus, formatCurrencyBDT, calculateNetProfit, calculateCashBankBalances, calculateConsolidatedCashMetrics } from '../utils/stockCalculations';
import { getBangladeshTodayDateString } from '../utils/dateUtils';

export const DashboardView: React.FC = () => {
  const {
    products,
    branches,
    selectedBranchId,
    setSelectedBranchId,
    branchStocks,
    sales,
    stockIns,
    stockOuts,
    transfers,
    expenses,
    openingBalances,
    recordOpeningBalance,
    currentUser,
    setActiveTab,
    canViewProfit,
    isManager,
    setSelectedCategoryName,
  } = useApp();

  const [recentTxTab, setRecentTxTab] = useState<'sales' | 'stock_in' | 'stock_out' | 'transfers'>('sales');

  // Recent transactions tab state

  const isSuperAdmin = currentUser.role === 'super_admin';
  const isBranchRestricted = currentUser.role === 'manager' && !!currentUser.branchId;
  const effectiveBranchId = isBranchRestricted ? currentUser.branchId! : selectedBranchId;
  const isAllBranches = effectiveBranchId === 'all';

  const relevantStocks = isAllBranches
    ? branchStocks
    : branchStocks.filter((s) => s.branchId === effectiveBranchId);

  const todayStr = getBangladeshTodayDateString();

  const relevantSales = sales.filter((s) => {
    const branchMatch = isAllBranches || s.branchId === effectiveBranchId;
    return branchMatch && s.status === 'completed';
  });
  const todaySales = relevantSales.filter((s) => s.date === todayStr);

  const relevantStockIns = stockIns.filter((s) => isAllBranches || s.branchId === effectiveBranchId);
  const todayStockIns = relevantStockIns.filter((s) => s.date === todayStr);

  const relevantStockOuts = stockOuts.filter((s) => isAllBranches || s.branchId === effectiveBranchId);
  const todayStockOuts = relevantStockOuts.filter((s) => s.date === todayStr);

  const relevantTransfers = transfers.filter((t) => {
    if (isAllBranches) return true;
    return t.sourceBranchId === effectiveBranchId || t.destinationBranchId === effectiveBranchId;
  });

  const relevantExpenses = expenses.filter((e) => isAllBranches || e.branchId === effectiveBranchId);
  const todayExpenses = relevantExpenses.filter((e) => e.date === todayStr);

  // Financial & inventory totals
  const totalProducts = products.filter((p) => p.status === 'active').length;
  const totalStockUnits = relevantStocks.reduce((sum, s) => sum + s.currentStock, 0);

  const totalSalesAmount = relevantSales.reduce((sum, s) => sum + s.totalSalesAmount, 0);
  const totalCOGS = relevantSales.reduce((sum, s) => sum + s.totalCostOfGoodsSold, 0);
  const totalGrossProfit = relevantSales.reduce((sum, s) => sum + s.grossProfit, 0);
  const totalExpensesAmount = relevantExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = calculateNetProfit(totalGrossProfit, totalExpensesAmount);

  const todaySalesAmount = todaySales.reduce((sum, s) => sum + s.totalSalesAmount, 0);
  const todayGrossProfit = todaySales.reduce((sum, s) => sum + s.grossProfit, 0);
  const todayExpensesAmount = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Cash and Bank Balances (Auto-roll over from yesterday's closing cash if not manually set)
  const activeBranchList = isAllBranches ? branches.map((b) => b.id) : [effectiveBranchId];

  const cashMetrics = useMemo(() => {
    return calculateConsolidatedCashMetrics({
      branchIds: activeBranchList,
      branches,
      targetDate: todayStr,
      openingBalances,
      sales,
      expenses,
    });
  }, [activeBranchList, branches, todayStr, openingBalances, sales, expenses]);

  const openingCash = cashMetrics.consolidated.openingCash;
  const openingBank = cashMetrics.consolidated.openingBank;
  const cashSales = cashMetrics.consolidated.todayCashSales;
  const bankSales = cashMetrics.consolidated.todayBankSales;
  const cashExpenses = cashMetrics.consolidated.todayCashExpenses;
  const bankExpenses = cashMetrics.consolidated.todayBankExpenses;

  const cashBankBalances = {
    physicalCash: cashMetrics.consolidated.currentPhysicalCash,
    bankBalance: cashMetrics.consolidated.currentBankBalance,
  };

  // Comprehensive Alerts
  const targetBranchesForAlerts = isAllBranches ? branches : branches.filter((b) => b.id === effectiveBranchId);
  const lowStockItems: Array<{
    id: string;
    productId: string;
    branchId: string;
    currentStock: number;
    minAlertLevel: number;
  }> = [];

  const outOfStockItems: Array<{
    id: string;
    productId: string;
    branchId: string;
    currentStock: number;
    minAlertLevel: number;
  }> = [];

  products.filter((p) => p.status !== 'inactive').forEach((prod) => {
    targetBranchesForAlerts.forEach((branch) => {
      const stock = branchStocks.find((s) => s.productId === prod.id && s.branchId === branch.id);
      const currentStock = stock ? Number(stock.currentStock) || 0 : 0;
      const minAlertLevel = (stock && stock.minAlertLevel !== undefined && stock.minAlertLevel > 0)
        ? stock.minAlertLevel
        : (prod.minAlertLevel || 5);
      const status = calculateStockAlertStatus(currentStock, minAlertLevel);

      const alertRecord = {
        id: stock?.id || `alert_${prod.id}_${branch.id}`,
        productId: prod.id,
        branchId: branch.id,
        currentStock,
        minAlertLevel,
      };

      if (status === 'out_of_stock') {
        outOfStockItems.push(alertRecord);
      } else if (status === 'low_stock') {
        lowStockItems.push(alertRecord);
      }
    });
  });

  const activeBranchObj = branches.find((b) => b.id === effectiveBranchId);

  // Category Metrics for 3 Main Categories
  const categoryStats = useMemo(() => {
    const categoriesList: { name: MainCategoryName; icon: typeof Sparkles; color: string; bg: string; border: string }[] = [
      { name: 'Cosmetic Products', icon: Sparkles, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200' },
      { name: 'Food Products', icon: Apple, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
      { name: 'Perfume Products', icon: Flame, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
    ];

    return categoriesList.map((cat) => {
      const catProducts = products.filter((p) => p.categoryName === cat.name && p.status === 'active');
      const prodIds = new Set(catProducts.map((p) => p.id));

      const catStocks = relevantStocks.filter((s) => prodIds.has(s.productId));
      const totalUnits = catStocks.reduce((sum, s) => sum + s.currentStock, 0);

      const catLowStock = catStocks.filter((s) => {
        const st = calculateStockAlertStatus(s.currentStock, s.minAlertLevel);
        return st === 'low_stock' || st === 'out_of_stock';
      }).length;

      // Category today sales
      let todayCategoryRevenue = 0;
      for (const sale of todaySales) {
        for (const item of sale.items) {
          if (item.categoryName === cat.name || prodIds.has(item.productId)) {
            todayCategoryRevenue += item.totalSales;
          }
        }
      }

      return {
        ...cat,
        productCount: catProducts.length,
        stockUnits: totalUnits,
        lowStockCount: catLowStock,
        todaySales: todayCategoryRevenue,
      };
    });
  }, [products, relevantStocks, todaySales]);

  const handleCategoryClick = (categoryName: MainCategoryName) => {
    setSelectedCategoryName(categoryName);
    setActiveTab('products');
  };

  return (
    <div className="space-y-6">
      {/* 1. PROMINENT THREE CATEGORIES SECTION (HIDDEN FOR MANAGER AS REQUESTED) */}
      {!isManager && (
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Main Product Categories</h2>
              <span className="text-[11px] text-slate-400 font-medium">Cosmetic, Food & Perfume Division</span>
            </div>
            <button
              onClick={() => {
                setSelectedCategoryName(null);
                setActiveTab('products');
              }}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1"
            >
              <span>Browse All Catalog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {categoryStats.map((cat) => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.name}
                  onClick={() => handleCategoryClick(cat.name)}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Division</span>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors mt-0.5">
                        {cat.name}
                      </h3>
                    </div>
                    <div className={`p-2.5 rounded-xl ${cat.bg} ${cat.color} border ${cat.border}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Total Products</span>
                      <span className="font-bold text-slate-800 text-base">{cat.productCount} SKUs</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Available Stock</span>
                      <span className="font-bold text-slate-800 text-base">{cat.stockUnits} units</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Today's Sales</span>
                      <span className="font-bold text-emerald-700 font-mono">{formatCurrencyBDT(cat.todaySales)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Stock Alerts</span>
                      {cat.lowStockCount > 0 ? (
                        <span className="font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-[11px]">
                          {cat.lowStockCount} items
                        </span>
                      ) : (
                        <span className="font-semibold text-emerald-600 text-[11px]">Healthy</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 text-[11px] font-semibold text-emerald-700 group-hover:underline flex items-center justify-between">
                    <span>Open {cat.name.replace(' Products', '')} Hub</span>
                    <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. ROLE-BASED OPERATIONAL & FINANCIAL KPI CARDS */}
      {isManager ? (
        /* DEDICATED MANAGER CASH RECONCILIATION CARDS (EXACTLY 4 PROMINENT CASH CARDS) */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                <span>Manager Daily Cash & Balance Reconciliation</span>
              </h2>
              <p className="text-xs text-slate-500">
                Assigned Branch: <span className="font-semibold text-slate-800">{currentUser.branchName || 'Assigned Branch'}</span>
              </p>
            </div>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Opening Cash */}
            <div
              onClick={() => setActiveTab('expenses')}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-amber-300 transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Starting Balance</span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">Opening Cash</h3>
                  <p className="text-xs text-slate-400">{isAllBranches ? 'Consolidated All Branches' : 'Morning Drawer Float'}</p>
                </div>
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-200">
                  <Coins className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100">
                <p className="text-2xl font-bold text-amber-600 font-mono tracking-tight">
                  {formatCurrencyBDT(openingCash)}
                </p>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    {cashMetrics.byBranch.some((b) => b.isAutoFromPreviousDay)
                      ? '🔄 গতকালের ক্লোজিং থেকে অটো যুক্ত'
                      : 'নির্ধারিত ওপেনিং ব্যালেন্স'}
                  </span>
                  <span className="text-emerald-700 font-semibold group-hover:underline">Update Float →</span>
                </div>
              </div>
            </div>

            {/* 2. Physical Cash */}
            <div
              onClick={() => setActiveTab('expenses')}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-emerald-300 transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cash in Hand</span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">Physical Cash</h3>
                  <p className="text-xs text-slate-400">Till Physical Cash</p>
                </div>
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
                  <Coins className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100">
                <p className="text-2xl font-bold text-emerald-700 font-mono tracking-tight">
                  {formatCurrencyBDT(cashBankBalances.physicalCash)}
                </p>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Physical Cash in Till</span>
                  <span className="text-slate-500 font-medium">Expenses: {formatCurrencyBDT(cashExpenses)}</span>
                </div>
              </div>
            </div>

            {/* 3. Bank & Card Cash */}
            <div
              onClick={() => setActiveTab('expenses')}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-blue-300 transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Digital & POS</span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">Bank & Card Cash</h3>
                  <p className="text-xs text-slate-400">bKash, Card & A/C</p>
                </div>
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-200">
                  <Building className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100">
                <p className="text-2xl font-bold text-blue-700 font-mono tracking-tight">
                  {formatCurrencyBDT(cashBankBalances.bankBalance)}
                </p>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>bKash, Card & Bank</span>
                  <span className="text-slate-500 font-medium">Sales: {formatCurrencyBDT(bankSales)}</span>
                </div>
              </div>
            </div>

            {/* 4. Total Cash */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Total Liquidity</span>
                  <h3 className="text-base font-bold text-white mt-0.5">Total Cash</h3>
                  <p className="text-xs text-slate-300">Physical + Bank Total</p>
                </div>
                <div className="p-2.5 bg-white/10 text-emerald-400 rounded-xl border border-white/10">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10">
                <p className="text-2xl font-bold text-emerald-400 font-mono tracking-tight">
                  {formatCurrencyBDT(cashBankBalances.physicalCash + cashBankBalances.bankBalance)}
                </p>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-300">
                  <span>Physical + Bank Total</span>
                  <span className="text-emerald-300 font-medium">Reconciled</span>
                </div>
              </div>
            </div>
          </div>

          {/* Supplementary Quick Overview Strip for Manager */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[11px] font-medium text-slate-400">Today's Sales</span>
                <p className="text-lg font-bold text-slate-900 font-mono">{formatCurrencyBDT(todaySalesAmount)}</p>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                {todaySales.length} invoices
              </span>
            </div>

            <div className="bg-white rounded-xl p-3.5 border border-slate-200 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[11px] font-medium text-slate-400">Today's Operating Expenses</span>
                <p className="text-lg font-bold text-rose-600 font-mono">{formatCurrencyBDT(todayExpensesAmount)}</p>
              </div>
              <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                {todayExpenses.length} vouchers
              </span>
            </div>

            <div className="bg-white rounded-xl p-3.5 border border-slate-200 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[11px] font-medium text-slate-400">Branch Inventory Stock</span>
                <p className="text-lg font-bold text-slate-800">{totalStockUnits} Units</p>
              </div>
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                {totalProducts} SKUs
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* SUPER ADMIN & ADMIN VIEW: Full Performance & Consolidated KPIs */
        <div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 px-1">
            Consolidated Performance & Financial Health
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Today's Sales */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Today's Sales</p>
                <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">{formatCurrencyBDT(todaySalesAmount)}</p>
                <span className="text-[11px] text-emerald-600 font-medium">{todaySales.length} invoices generated today</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5" />
              </div>
            </div>

            {/* Physical Cash in Till */}
            <div
              onClick={() => setActiveTab('expenses')}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between cursor-pointer hover:border-emerald-300 transition-colors"
            >
              <div>
                <p className="text-xs font-medium text-slate-500">Physical Cash in Till</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1 font-mono">{formatCurrencyBDT(cashBankBalances.physicalCash)}</p>
                <span className="text-[11px] text-slate-400">
                  Opening: {formatCurrencyBDT(openingCash)} ({cashMetrics.byBranch.some((b) => b.isAutoFromPreviousDay) ? 'Auto' : 'Set'})
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Coins className="w-5 h-5" />
              </div>
            </div>

            {/* Bank & Digital Balance */}
            <div
              onClick={() => setActiveTab('expenses')}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between cursor-pointer hover:border-blue-300 transition-colors"
            >
              <div>
                <p className="text-xs font-medium text-slate-500">Bank & POS Balance</p>
                <p className="text-2xl font-bold text-blue-700 mt-1 font-mono">{formatCurrencyBDT(cashBankBalances.bankBalance)}</p>
                <span className="text-[11px] text-slate-400">bKash, Card & A/C</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Building className="w-5 h-5" />
              </div>
            </div>

            {/* Operating Expenses */}
            <div
              onClick={() => setActiveTab('expenses')}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between cursor-pointer hover:border-rose-300 transition-colors"
            >
              <div>
                <p className="text-xs font-medium text-slate-500">Today's Operating Expenses</p>
                <p className="text-2xl font-bold text-rose-600 mt-1 font-mono">{formatCurrencyBDT(todayExpensesAmount)}</p>
                <span className="text-[11px] text-slate-400">Total: {formatCurrencyBDT(totalExpensesAmount)}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
            </div>

            {/* Current Stock Units */}
            <div
              onClick={() => setActiveTab('current-stock')}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors"
            >
              <div>
                <p className="text-xs font-medium text-slate-500">Current Stock Quantity</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{totalStockUnits}</p>
                <span className="text-[11px] text-slate-400">{totalProducts} active SKUs</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Boxes className="w-5 h-5" />
              </div>
            </div>

            {/* Low Stock Alert Count */}
            <div
              onClick={() => setActiveTab('stock-alerts')}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between cursor-pointer hover:border-amber-300 transition-colors group"
            >
              <div>
                <p className="text-xs font-medium text-slate-500">Low Stock Alerts</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{lowStockItems.length}</p>
                <span className="text-[11px] text-slate-400 group-hover:text-amber-600">Action needed</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            {/* Out of Stock Count */}
            <div
              onClick={() => setActiveTab('stock-alerts')}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between cursor-pointer hover:border-rose-300 transition-colors group"
            >
              <div>
                <p className="text-xs font-medium text-slate-500">Out of Stock</p>
                <p className="text-2xl font-bold text-rose-600 mt-1">{outOfStockItems.length}</p>
                <span className="text-[11px] text-slate-400 group-hover:text-rose-600">Zero inventory</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
            </div>

            {/* Transfers in Transit */}
            <div
              onClick={() => setActiveTab('transfers')}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between cursor-pointer hover:border-indigo-300 transition-colors"
            >
              <div>
                <p className="text-xs font-medium text-slate-500">Inter-Branch In-Transit</p>
                <p className="text-2xl font-bold text-indigo-600 mt-1">
                  {relevantTransfers.filter((t) => t.status === 'Dispatched').length}
                </p>
                <span className="text-[11px] text-slate-400">Transfers pending receipt</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
            </div>

            {/* PROFIT & FINANCIAL METRICS: STRICTLY HIDDEN FOR MANAGERS */}
            {canViewProfit && (
              <>
                {/* Total Sales Revenue */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Total Sales Revenue</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1 font-mono">{formatCurrencyBDT(totalSalesAmount)}</p>
                    <span className="text-[11px] text-slate-400">Lifetime completed sales</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>

                {/* Cost of Goods Sold (COGS) */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Cost of Goods Sold (COGS)</p>
                    <p className="text-2xl font-bold text-slate-700 mt-1 font-mono">{formatCurrencyBDT(totalCOGS)}</p>
                    <span className="text-[11px] text-slate-400">Historical purchase costs</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>

                {/* Total Gross Profit */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Total Gross Profit</p>
                    <p className="text-2xl font-bold text-teal-700 mt-1 font-mono">+{formatCurrencyBDT(totalGrossProfit)}</p>
                    <span className="text-[11px] text-teal-600 font-medium">+{formatCurrencyBDT(todayGrossProfit)} today</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>

                {/* Net Profit / Loss */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Net Profit / Loss</p>
                    <p className={`text-2xl font-bold mt-1 font-mono ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {netProfit >= 0 ? `+${formatCurrencyBDT(netProfit)}` : formatCurrencyBDT(netProfit)}
                    </p>
                    <span className="text-[11px] text-slate-400">Gross Profit − Operating Expenses</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Super Admin: Branch Cash & Opening Float Quick Strip */}
          {isSuperAdmin && isAllBranches && cashMetrics.byBranch.length > 0 && (
            <div className="mt-4 bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Coins className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-slate-800">
                    🏢 শাখাভিত্তিক প্রারম্ভিক ক্যাশ ও চলতি ড্রয়ার ক্যাশ (Branch Opening & Till Cash)
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('expenses')}
                  className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                >
                  ক্যাশ ও ব্যাংক বিস্তারিত →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                {cashMetrics.byBranch.map((bm) => (
                  <div
                    key={bm.branchId}
                    onClick={() => setActiveTab('expenses')}
                    className="p-3 bg-slate-50 hover:bg-emerald-50/50 rounded-xl border border-slate-200 hover:border-emerald-200 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span>{bm.branchName}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        {bm.isAutoFromPreviousDay ? '🔄 Auto Roll-over' : '✓ Manual Float'}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-slate-200/60 font-mono">
                      <div>
                        <span className="text-slate-400 block text-[10px]">ওপেনিং ক্যাশ</span>
                        <span className="font-bold text-amber-700">{formatCurrencyBDT(bm.openingCash)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">চলতি ড্রয়ার ক্যাশ</span>
                        <span className="font-bold text-emerald-700">{formatCurrencyBDT(bm.currentPhysicalCash)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Urgent Alerts & Recent Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Critical Stock Alerts */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-xs border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-800">Critical Stock Alerts</h3>
              </div>
              <button
                onClick={() => setActiveTab('stock-alerts')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                View All
              </button>
            </div>

            <div className="divide-y divide-slate-100 mt-2 max-h-[360px] overflow-y-auto">
              {outOfStockItems.length === 0 && lowStockItems.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  All products in this branch are well-stocked!
                </div>
              ) : (
                <>
                  {outOfStockItems.map((item) => {
                    const prod = products.find((p) => p.id === item.productId);
                    const branch = branches.find((b) => b.id === item.branchId);
                    return (
                      <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="pr-2">
                          <p className="font-semibold text-slate-800 truncate max-w-[170px]">{prod?.name}</p>
                          <p className="text-[10px] text-slate-500">
                            [{prod?.categoryName.replace(' Products', '')}] • {isAllBranches ? branch?.name : prod?.sku}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            0 In Stock
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {lowStockItems.map((item) => {
                    const prod = products.find((p) => p.id === item.productId);
                    const branch = branches.find((b) => b.id === item.branchId);
                    return (
                      <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="pr-2">
                          <p className="font-semibold text-slate-800 truncate max-w-[170px]">{prod?.name}</p>
                          <p className="text-[10px] text-slate-500">
                            [{prod?.categoryName.replace(' Products', '')}] • Min: {item.minAlertLevel} • {isAllBranches ? branch?.name : prod?.sku}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            {item.currentStock} Left
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-2">
            {!isManager ? (
              <button
                onClick={() => setActiveTab('stock-in')}
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors flex items-center justify-center space-x-1"
              >
                <ArrowDownToLine className="w-3.5 h-3.5 text-blue-600" />
                <span>Restock Items Now</span>
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('stock-alerts')}
                className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-xl border border-amber-200 transition-colors flex items-center justify-center space-x-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>View All Stock Alerts</span>
              </button>
            )}
          </div>
        </div>

        {/* Right: Recent Transactions Table */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-xs border border-slate-200 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-slate-800">Recent Transactions</h3>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs">
                <button
                  onClick={() => setRecentTxTab('sales')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    recentTxTab === 'sales' ? 'bg-white text-emerald-700 font-semibold shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Sales ({relevantSales.length})
                </button>
                <button
                  onClick={() => setRecentTxTab('stock_in')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    recentTxTab === 'stock_in' ? 'bg-white text-blue-700 font-semibold shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Stock In ({relevantStockIns.length})
                </button>
                <button
                  onClick={() => setRecentTxTab('stock_out')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    recentTxTab === 'stock_out' ? 'bg-white text-amber-700 font-semibold shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Stock Out ({relevantStockOuts.length})
                </button>
                <button
                  onClick={() => setRecentTxTab('transfers')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    recentTxTab === 'transfers' ? 'bg-white text-indigo-700 font-semibold shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Transfers ({relevantTransfers.length})
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                if (recentTxTab === 'sales') setActiveTab('sales-history');
                else if (recentTxTab === 'stock_in') setActiveTab('stock-in');
                else if (recentTxTab === 'stock_out') setActiveTab('stock-out');
                else setActiveTab('transfers');
              }}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto mt-2">
            {recentTxTab === 'sales' && (
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3">Invoice No</th>
                    <th className="py-2.5 px-3">Branch</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3 text-center">Items</th>
                    <th className="py-2.5 px-3 text-right">Total Amount</th>
                    {canViewProfit && <th className="py-2.5 px-3 text-right">Gross Profit</th>}
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {relevantSales.slice(0, 6).map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 font-mono">{sale.invoiceNo}</td>
                      <td className="py-2.5 px-3 text-slate-600 truncate max-w-[130px]">{sale.branchName}</td>
                      <td className="py-2.5 px-3">
                        <p className="font-medium text-slate-800">{sale.customerName}</p>
                        <p className="text-[10px] text-slate-400">{sale.paymentMethod}</p>
                      </td>
                      <td className="py-2.5 px-3 text-center font-medium">{sale.totalQuantitySold}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                        {formatCurrencyBDT(sale.totalSalesAmount)}
                      </td>
                      {canViewProfit && (
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-600 font-mono">
                          +{formatCurrencyBDT(sale.grossProfit)}
                        </td>
                      )}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            sale.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {sale.status === 'completed' ? 'Completed' : 'Cancelled'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {relevantSales.length === 0 && (
                    <tr>
                      <td colSpan={canViewProfit ? 7 : 6} className="py-8 text-center text-slate-400 text-xs">
                        No sales records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {recentTxTab === 'stock_in' && (
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3">Reference No</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Branch</th>
                    <th className="py-2.5 px-3">Supplier</th>
                    <th className="py-2.5 px-3 text-center">Total Qty</th>
                    <th className="py-2.5 px-3 text-right">Cost</th>
                    <th className="py-2.5 px-3 text-right">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {relevantStockIns.slice(0, 6).map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 font-mono">{tx.referenceNo}</td>
                      <td className="py-2.5 px-3 text-slate-600">{tx.date}</td>
                      <td className="py-2.5 px-3 text-slate-600 truncate max-w-[130px]">{tx.branchName}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{tx.supplierName || '—'}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          +{tx.totalQuantity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                        {formatCurrencyBDT(tx.totalPurchaseCost)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500 text-[11px]">{tx.createdByName}</td>
                    </tr>
                  ))}
                  {relevantStockIns.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        No Stock In records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {recentTxTab === 'stock_out' && (
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3">Reference No</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Branch</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3 text-center">Qty Deducted</th>
                    <th className="py-2.5 px-3">Remarks</th>
                    <th className="py-2.5 px-3 text-right">Authorized By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {relevantStockOuts.slice(0, 6).map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 font-mono">{tx.referenceNo}</td>
                      <td className="py-2.5 px-3 text-slate-600">{tx.date}</td>
                      <td className="py-2.5 px-3 text-slate-600 truncate max-w-[130px]">{tx.branchName}</td>
                      <td className="py-2.5 px-3 font-medium text-amber-700">{tx.reason}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          -{tx.totalQuantity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 truncate max-w-[150px]">{tx.remarks || '—'}</td>
                      <td className="py-2.5 px-3 text-right text-slate-500 text-[11px]">{tx.createdByName}</td>
                    </tr>
                  ))}
                  {relevantStockOuts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        No Stock Out records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {recentTxTab === 'transfers' && (
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3">Transfer No</th>
                    <th className="py-2.5 px-3">From</th>
                    <th className="py-2.5 px-3">To</th>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {relevantTransfers.slice(0, 6).map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 font-mono">{t.transferNo}</td>
                      <td className="py-2.5 px-3 text-slate-700 truncate max-w-[100px]">{t.sourceBranchName}</td>
                      <td className="py-2.5 px-3 text-slate-700 truncate max-w-[100px]">{t.destinationBranchName}</td>
                      <td className="py-2.5 px-3">
                        <p className="font-medium text-slate-800 truncate max-w-[150px]">{t.productName}</p>
                        <p className="text-[10px] text-slate-400">{t.sku}</p>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold">{t.quantity}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            t.status === 'Received'
                              ? 'bg-emerald-100 text-emerald-800'
                              : t.status === 'Dispatched'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {relevantTransfers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                        No transfer records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
