import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Boxes,
  Search,
  Building2,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  FileText,
  ShieldAlert,
} from 'lucide-react';
import {
  calculateCurrentStock,
  calculateStockAlertStatus,
  formatCurrencyBDT,
} from '../utils/stockCalculations';
import { exportReportToExcel } from '../utils/excelExport';
import { exportReportToPdf } from '../utils/pdfExport';
import { MainCategoryName } from '../types';
import { getBangladeshTodayDateString } from '../utils/dateUtils';

export const CurrentStockView: React.FC = () => {
  const {
    products,
    branches,
    branchStocks,
    stockIns,
    stockOuts,
    sales,
    currentUser,
    selectedBranchId,
    canViewProfit,
    getProductBatchesForBranch,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const isBranchLocked = currentUser.role === 'manager' && !!currentUser.branchId;
  const [filterBranchId, setFilterBranchId] = useState<string>(
    isBranchLocked ? currentUser.branchId! : selectedBranchId
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const effectiveBranchId = isBranchLocked ? currentUser.branchId! : filterBranchId;

  // Build rows combining Product details with Branch stock records
  const stockRows = branchStocks
    .map((stock) => {
      const product = products.find((p) => p.id === stock.productId);
      const branch = branches.find((b) => b.id === stock.branchId);

      // Exact calculation based on Product Code (SKU) and Product ID across all transactions
      const prodCode = product?.sku || '';
      const prodId = stock.productId;

      // Sum all Stock In items matching this product code/id for this branch
      const txStockIn = (stockIns || [])
        .filter((si) => si.branchId === stock.branchId)
        .reduce((sum, si) => {
          const itemsSum = (si.items || [])
            .filter((it) => it.productId === prodId || (prodCode && it.sku === prodCode))
            .reduce((itSum, it) => itSum + (Number(it.quantity) || 0), 0);
          return sum + itemsSum;
        }, 0);

      const stockIn = txStockIn > 0 ? txStockIn : (Number(stock.stockIn) || 0);

      // Sum all Stock Out items matching this product code/id for this branch
      const txStockOut = (stockOuts || [])
        .filter((so) => so.branchId === stock.branchId)
        .reduce((sum, so) => {
          const itemsSum = (so.items || [])
            .filter((it) => it.productId === prodId || (prodCode && it.sku === prodCode))
            .reduce((itSum, it) => itSum + (Number(it.quantity) || 0), 0);
          return sum + itemsSum;
        }, 0);

      const stockOut = txStockOut > 0 ? txStockOut : (Number(stock.stockOut) || 0);

      // Sum all Sold items matching this product code/id for this branch
      const txSold = (sales || [])
        .filter((s) => s.branchId === stock.branchId && s.status === 'completed')
        .reduce((sum, s) => {
          const itemsSum = (s.items || [])
            .filter((it) => it.productId === prodId || (prodCode && it.sku === prodCode))
            .reduce((itSum, it) => itSum + (Number(it.quantity) || 0), 0);
          return sum + itemsSum;
        }, 0);

      const quantitySold = txSold > 0 ? txSold : (Number(stock.quantitySold) || 0);

      const openingStock = Number(stock.openingStock) || 0;

      // Golden Business Rule Formula:
      // Current Stock = Opening Stock + Stock In - Stock Out - Sold Qty
      const currentStock = calculateCurrentStock({
        openingStock,
        stockIn,
        stockOut,
        quantitySold,
        salesReturn: stock.salesReturn,
        purchaseReturn: stock.purchaseReturn,
      });

      const batches = getProductBatchesForBranch(stock.branchId, stock.productId);
      const activeBatches = batches.filter((b) => b.remainingQuantity > 0);

      // Calculate total valuation of remaining stock based on active batches and weighted average unit cost
      let stockValue = 0;
      if (activeBatches.length > 0) {
        stockValue = activeBatches.reduce((vSum, b) => vSum + (b.remainingQuantity * b.purchasePrice), 0);
      } else {
        stockValue = currentStock * (product?.purchasePrice || 0);
      }
      stockValue = Number(stockValue.toFixed(2));

      const avgUnitCost = currentStock > 0 ? Number((stockValue / currentStock).toFixed(2)) : (product?.purchasePrice || 0);
      const hasMultipleBatchPrices = activeBatches.length > 1;

      const status = calculateStockAlertStatus(currentStock, stock.minAlertLevel);
      const purchasePrice = avgUnitCost > 0 ? avgUnitCost : (product?.purchasePrice || 0);
      const sellingPrice = product?.sellingPrice || 0;

      return {
        ...stock,
        stockIn,
        stockOut,
        quantitySold,
        currentStock,
        activeBatches,
        hasMultipleBatchPrices,
        avgUnitCost,
        productName: product?.name || 'Unknown',
        sku: product?.sku || 'SKU',
        barcode: product?.barcode,
        categoryId: product?.categoryId || '',
        categoryName: product?.categoryName || 'General',
        purchasePrice,
        sellingPrice,
        branchName: branch?.name || 'Unknown Branch',
        branchCode: branch?.code || '',
        stockValue,
        alertStatus: status,
        decantConfig: product?.decantConfig,
        openBottleMlRemaining: stock.openBottleMlRemaining || 0,
      };
    })
    .filter((row) => {
      const matchesBranch = effectiveBranchId === 'all' || row.branchId === effectiveBranchId;
      const matchesCategory = selectedCategory === 'all' || row.categoryName === selectedCategory;
      const matchesStatus = filterStatus === 'all' || row.alertStatus === filterStatus;
      const matchesSearch =
        row.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (row.barcode && row.barcode.includes(searchTerm));

      return matchesBranch && matchesCategory && matchesStatus && matchesSearch;
    });

  const totalCurrentStockUnits = stockRows.reduce((sum, r) => sum + r.currentStock, 0);
  const totalStockValuation = stockRows.reduce((sum, r) => sum + r.stockValue, 0);

  const branchNameDisplay =
    effectiveBranchId === 'all'
      ? 'All Branches (Consolidated)'
      : branches.find((b) => b.id === effectiveBranchId)?.name || 'Assigned Branch';

  // Excel (.xlsx) Export
  const exportToExcel = () => {
    const headers = canViewProfit
      ? [
          'Product Name',
          'SKU',
          'Category',
          'Branch',
          'Opening Stock',
          'Stock In',
          'Stock Out',
          'Sold Qty',
          'Current Stock',
          'Purchase Price (Tk)',
          'Stock Valuation (Tk)',
          'Status',
        ]
      : [
          'Product Name',
          'SKU',
          'Category',
          'Branch',
          'Opening Stock',
          'Stock In',
          'Stock Out',
          'Sold Qty',
          'Current Stock',
          'Selling Price (Tk)',
          'Status',
        ];

    const dataRows = stockRows.map((r) =>
      canViewProfit
        ? [
            r.productName,
            r.sku,
            r.categoryName,
            r.branchName,
            r.openingStock,
            r.stockIn,
            r.stockOut,
            r.quantitySold,
            r.currentStock,
            formatCurrencyBDT(r.purchasePrice),
            formatCurrencyBDT(r.stockValue),
            r.alertStatus.replace('_', ' ').toUpperCase(),
          ]
        : [
            r.productName,
            r.sku,
            r.categoryName,
            r.branchName,
            r.openingStock,
            r.stockIn,
            r.stockOut,
            r.quantitySold,
            r.currentStock,
            formatCurrencyBDT(r.sellingPrice),
            r.alertStatus.replace('_', ' ').toUpperCase(),
          ]
    );

    const summaryStats = canViewProfit
      ? [
          { label: 'Total On-Hand Stock', value: `${totalCurrentStockUnits} units` },
          { label: 'Total Stock Valuation', value: formatCurrencyBDT(totalStockValuation) },
          { label: 'Total Catalog Records', value: `${stockRows.length} items` },
        ]
      : [
          { label: 'Total On-Hand Stock', value: `${totalCurrentStockUnits} units` },
          { label: 'Total Catalog Records', value: `${stockRows.length} items` },
        ];

    exportReportToExcel({
      reportTitle: 'Current Stock Ledger & Inventory Report',
      branchName: branchNameDisplay,
      categoryFilter: selectedCategory === 'all' ? 'All 3 Categories' : selectedCategory,
      generatedBy: `${currentUser.name} (${currentUser.role.replace('_', ' ')})`,
      headers,
      dataRows,
      summaryStats,
      fileName: `BestHeritage_CurrentStock_${getBangladeshTodayDateString()}.xlsx`,
    });
  };

  // PDF (.pdf) Export
  const exportToPdf = () => {
    const headers = canViewProfit
      ? [
          'Product Name',
          'SKU',
          'Category',
          'Branch',
          'Opening',
          'Stock In',
          'Stock Out',
          'Sold',
          'Current Stock',
          'Unit Cost',
          'Valuation',
          'Status',
        ]
      : [
          'Product Name',
          'SKU',
          'Category',
          'Branch',
          'Opening',
          'Stock In',
          'Stock Out',
          'Sold',
          'Current Stock',
          'Sell Price',
          'Status',
        ];

    const dataRows = stockRows.map((r) =>
      canViewProfit
        ? [
            r.productName,
            r.sku,
            r.categoryName,
            r.branchName,
            r.openingStock,
            r.stockIn,
            r.stockOut,
            r.quantitySold,
            r.currentStock,
            formatCurrencyBDT(r.purchasePrice),
            formatCurrencyBDT(r.stockValue),
            r.alertStatus === 'out_of_stock' ? 'OUT' : r.alertStatus === 'low_stock' ? 'LOW' : 'OK',
          ]
        : [
            r.productName,
            r.sku,
            r.categoryName,
            r.branchName,
            r.openingStock,
            r.stockIn,
            r.stockOut,
            r.quantitySold,
            r.currentStock,
            formatCurrencyBDT(r.sellingPrice),
            r.alertStatus === 'out_of_stock' ? 'OUT' : r.alertStatus === 'low_stock' ? 'LOW' : 'OK',
          ]
    );

    const summaryStats = canViewProfit
      ? [
          { label: 'Total On-Hand Stock', value: `${totalCurrentStockUnits} units` },
          { label: 'Total Stock Valuation', value: formatCurrencyBDT(totalStockValuation) },
        ]
      : [
          { label: 'Total On-Hand Stock', value: `${totalCurrentStockUnits} units` },
        ];

    exportReportToPdf({
      reportTitle: 'Current Stock Ledger & Inventory Report',
      branchName: branchNameDisplay,
      categoryFilter: selectedCategory === 'all' ? 'All 3 Categories' : selectedCategory,
      generatedBy: `${currentUser.name} (${currentUser.role.replace('_', ' ')})`,
      headers,
      dataRows,
      summaryStats,
      fileName: `BestHeritage_CurrentStock_${getBangladeshTodayDateString()}.pdf`,
    });
  };

  // CSV Export
  const exportToCSV = () => {
    const headers = canViewProfit
      ? [
          'Product Name',
          'SKU',
          'Category',
          'Branch',
          'Opening Stock',
          'Stock In',
          'Stock Out',
          'Sold Qty',
          'Current Stock',
          'Purchase Price (BDT)',
          'Total Value (BDT)',
          'Status',
        ]
      : [
          'Product Name',
          'SKU',
          'Category',
          'Branch',
          'Opening Stock',
          'Stock In',
          'Stock Out',
          'Sold Qty',
          'Current Stock',
          'Selling Price (BDT)',
          'Status',
        ];

    const rowsData = stockRows.map((r) =>
      canViewProfit
        ? [
            `"${r.productName.replace(/"/g, '""')}"`,
            r.sku,
            `"${r.categoryName}"`,
            `"${r.branchName}"`,
            r.openingStock,
            r.stockIn,
            r.stockOut,
            r.quantitySold,
            r.currentStock,
            r.purchasePrice.toFixed(2),
            r.stockValue.toFixed(2),
            r.alertStatus,
          ]
        : [
            `"${r.productName.replace(/"/g, '""')}"`,
            r.sku,
            `"${r.categoryName}"`,
            `"${r.branchName}"`,
            r.openingStock,
            r.stockIn,
            r.stockOut,
            r.quantitySold,
            r.currentStock,
            r.sellingPrice.toFixed(2),
            r.alertStatus,
          ]
    );

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rowsData.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BestHeritage_CurrentStock_${getBangladeshTodayDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Current Stock — Branch Inventory Ledger</h1>
            <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded border border-emerald-200">
              Live Stock
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Current Stock = Opening Stock + Stock In − Stock Out − Quantity Sold + Adjustments
          </p>
          {!canViewProfit && (
            <div className="mt-2 inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Manager Mode: Purchase prices and inventory valuation are masked for profit privacy.</span>
            </div>
          )}
        </div>

        {/* Action Buttons: Excel, PDF, and CSV */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={exportToExcel}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
            title="Download formatted Excel workbook (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export to Excel (.xlsx)</span>
          </button>
          <button
            onClick={exportToPdf}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors"
            title="Download print-ready PDF (.pdf)"
          >
            <FileText className="w-4 h-4" />
            <span>Export to PDF (.pdf)</span>
          </button>
          <button
            onClick={exportToCSV}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-900 text-white shadow-xs transition-colors"
            title="Download CSV spreadsheet (.csv)"
          >
            <Download className="w-3.5 h-3.5 text-slate-300" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Category Selection Tabs */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-2">
          Category Scope:
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            All 3 Categories
          </button>
          <button
            onClick={() => setSelectedCategory('Cosmetic Products')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              selectedCategory === 'Cosmetic Products'
                ? 'bg-pink-600 text-white border-pink-600'
                : 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100'
            }`}
          >
            Cosmetic Products
          </button>
          <button
            onClick={() => setSelectedCategory('Food Products')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              selectedCategory === 'Food Products'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
            }`}
          >
            Food Products
          </button>
          <button
            onClick={() => setSelectedCategory('Perfume Products')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              selectedCategory === 'Perfume Products'
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
            }`}
          >
            Perfume Products
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Filtered Records</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{stockRows.length} items</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Total On-Hand Units</p>
          <p className="text-xl font-bold text-blue-700 mt-1">{totalCurrentStockUnits} units</p>
        </div>
        {canViewProfit ? (
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <p className="text-xs text-slate-500 font-medium">Inventory Asset Valuation</p>
            <p className="text-xl font-bold text-emerald-700 mt-1">{formatCurrencyBDT(totalStockValuation)}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <p className="text-xs text-slate-500 font-medium">Branch Scope</p>
            <p className="text-sm font-bold text-slate-800 mt-2 truncate">{branchNameDisplay}</p>
          </div>
        )}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Alert Status</p>
          <p className="text-xs font-semibold text-slate-700 mt-1.5 flex items-center space-x-2">
            <span className="text-amber-600 font-bold">
              {stockRows.filter((r) => r.alertStatus === 'low_stock').length} Low
            </span>
            <span>•</span>
            <span className="text-rose-600 font-bold">
              {stockRows.filter((r) => r.alertStatus === 'out_of_stock').length} Out
            </span>
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by product name, SKU, or barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
          />
        </div>

        {!isBranchLocked && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-medium">Branch:</span>
            <select
              value={filterBranchId}
              onChange={(e) => setFilterBranchId(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 bg-white"
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500 font-medium">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 bg-white"
          >
            <option value="all">All Status</option>
            <option value="healthy">In Stock (Healthy)</option>
            <option value="low_stock">Low Stock Alert</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Product & SKU</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4 text-center">Opening</th>
                <th className="py-3 px-4 text-center">Stock In</th>
                <th className="py-3 px-4 text-center">Stock Out</th>
                <th className="py-3 px-4 text-center">Sold Qty</th>
                <th className="py-3 px-4 text-center">Current Stock</th>
                {canViewProfit ? (
                  <>
                    <th className="py-3 px-4 text-right">Unit Cost</th>
                    <th className="py-3 px-4 text-right">Stock Valuation</th>
                  </>
                ) : (
                  <th className="py-3 px-4 text-right">Selling Price</th>
                )}
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stockRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{row.productName}</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{row.sku}</span>
                      <span className="ml-1.5 text-slate-400">({row.categoryName})</span>
                    </div>
                    {row.activeBatches && row.activeBatches.length > 1 && (
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <span className="text-[10px] text-slate-400 font-medium">ব্যাচ:</span>
                        {row.activeBatches.map((b, bIdx) => (
                          <span
                            key={b.batchId}
                            className={`inline-flex items-center text-[10px] px-1.5 py-0.2 rounded font-mono ${
                              bIdx === 0
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                            title={bIdx === 0 ? 'Lowest Cost Batch: Sells First' : 'Higher Cost Batch'}
                          >
                            {b.remainingQuantity} pcs {canViewProfit ? `@ Tk ${b.purchasePrice}` : ''} {bIdx === 0 ? '(১ম সেল)' : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800">
                    {row.branchName}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-500">{row.openingStock}</td>
                  <td className="py-3 px-4 text-center font-semibold text-blue-600">+{row.stockIn}</td>
                  <td className="py-3 px-4 text-center font-semibold text-amber-600">-{row.stockOut}</td>
                  <td className="py-3 px-4 text-center font-semibold text-rose-600">-{row.quantitySold}</td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold ${
                        row.alertStatus === 'out_of_stock'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : row.alertStatus === 'low_stock'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {row.currentStock} units
                    </span>
                    {row.decantConfig?.isDecantable && (
                      <div className="mt-1">
                        <span className="inline-flex items-center text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                          🧴 Open: {row.openBottleMlRemaining} ml
                        </span>
                      </div>
                    )}
                    <span className="block text-[10px] text-slate-400 mt-0.5">
                      Min Alert: {row.minAlertLevel}
                    </span>
                  </td>
                  {canViewProfit ? (
                    <>
                      <td className="py-3 px-4 text-right text-slate-700 font-medium">
                        {row.avgUnitCost > 0 ? (
                          <div>
                            <div>{formatCurrencyBDT(row.avgUnitCost)}</div>
                            {row.hasMultipleBatchPrices && (
                              <span className="text-[9px] text-emerald-600 font-bold block">(Avg Cost)</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {row.stockValue > 0 ? formatCurrencyBDT(row.stockValue) : <span className="text-slate-300">—</span>}
                      </td>
                    </>
                  ) : (
                    <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                      {row.sellingPrice > 0 ? formatCurrencyBDT(row.sellingPrice) : <span className="text-slate-300">—</span>}
                    </td>
                  )}
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        row.alertStatus === 'out_of_stock'
                          ? 'bg-rose-100 text-rose-800'
                          : row.alertStatus === 'low_stock'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {row.alertStatus === 'out_of_stock'
                        ? 'Out of Stock'
                        : row.alertStatus === 'low_stock'
                        ? 'Low Stock'
                        : 'Healthy'}
                    </span>
                  </td>
                </tr>
              ))}

              {stockRows.length === 0 && (
                <tr>
                  <td colSpan={canViewProfit ? 10 : 9} className="py-12 text-center text-slate-400 text-xs">
                    No stock entries matching your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
