import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  AlertTriangle,
  XCircle,
  CheckCircle2,
  ArrowDownToLine,
  Building2,
  Search,
  Package,
  FileSpreadsheet,
  FileText,
  Download,
  ShieldAlert,
} from 'lucide-react';
import {
  calculateStockAlertStatus,
  formatCurrencyBDT,
} from '../utils/stockCalculations';
import { exportReportToExcel } from '../utils/excelExport';
import { exportReportToPdf } from '../utils/pdfExport';
import { MainCategoryName } from '../types';

export const StockAlertsView: React.FC = () => {
  const {
    products,
    branches,
    branchStocks,
    currentUser,
    selectedBranchId,
    setActiveTab,
    canViewProfit,
  } = useApp();

  const [activeTabFilter, setActiveTabFilter] = useState<'all_alerts' | 'low_stock' | 'out_of_stock' | 'healthy'>('all_alerts');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const isBranchLocked = currentUser.role === 'manager' && !!currentUser.branchId;
  const [filterBranchId, setFilterBranchId] = useState<string>(
    isBranchLocked ? currentUser.branchId! : selectedBranchId
  );
  const [searchTerm, setSearchTerm] = useState('');

  const effectiveBranchId = isBranchLocked ? currentUser.branchId! : filterBranchId;

  // Build items with alert status
  const alertItems = branchStocks
    .map((stock) => {
      const product = products.find((p) => p.id === stock.productId);
      const branch = branches.find((b) => b.id === stock.branchId);
      const status = calculateStockAlertStatus(stock.currentStock, stock.minAlertLevel);

      return {
        ...stock,
        productName: product?.name || 'Product',
        sku: product?.sku || 'SKU',
        categoryName: product?.categoryName || 'General',
        purchasePrice: product?.purchasePrice || 0,
        sellingPrice: product?.sellingPrice || 0,
        branchName: branch?.name || 'Branch',
        alertStatus: status,
        shortage: Math.max(0, stock.minAlertLevel - stock.currentStock),
      };
    })
    .filter((item) => {
      const matchesBranch = effectiveBranchId === 'all' || item.branchId === effectiveBranchId;
      const matchesCategory = selectedCategory === 'all' || item.categoryName === selectedCategory;
      const matchesSearch =
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesBranch || !matchesCategory || !matchesSearch) return false;

      if (activeTabFilter === 'all_alerts') {
        return item.alertStatus === 'low_stock' || item.alertStatus === 'out_of_stock';
      }
      if (activeTabFilter === 'low_stock') {
        return item.alertStatus === 'low_stock';
      }
      if (activeTabFilter === 'out_of_stock') {
        return item.alertStatus === 'out_of_stock';
      }
      if (activeTabFilter === 'healthy') {
        return item.alertStatus === 'healthy';
      }
      return true;
    });

  // Calculate totals for active branch filter
  const branchFilteredAll = branchStocks
    .filter((s) => effectiveBranchId === 'all' || s.branchId === effectiveBranchId)
    .filter((s) => {
      const p = products.find((prod) => prod.id === s.productId);
      return selectedCategory === 'all' || p?.categoryName === selectedCategory;
    });

  const outOfStockCount = branchFilteredAll.filter(
    (s) => calculateStockAlertStatus(s.currentStock, s.minAlertLevel) === 'out_of_stock'
  ).length;

  const lowStockCount = branchFilteredAll.filter(
    (s) => calculateStockAlertStatus(s.currentStock, s.minAlertLevel) === 'low_stock'
  ).length;

  const healthyCount = branchFilteredAll.filter(
    (s) => calculateStockAlertStatus(s.currentStock, s.minAlertLevel) === 'healthy'
  ).length;

  const activeBranchLabel = isBranchLocked
    ? currentUser.branchName || 'Assigned Branch'
    : effectiveBranchId === 'all'
    ? 'All Branches (Consolidated)'
    : branches.find((b) => b.id === effectiveBranchId)?.name || 'Selected Branch';

  const exportHeaders = canViewProfit
    ? ['Product Name', 'SKU', 'Category', 'Branch', 'Current Stock', 'Min Alert Level', 'Shortage', 'Status', 'Purchase Price', 'Est. Restock Cost']
    : ['Product Name', 'SKU', 'Category', 'Branch', 'Current Stock', 'Min Alert Level', 'Shortage', 'Status', 'Selling Price'];

  const exportRows = alertItems.map((item) =>
    canViewProfit
      ? [
          item.productName,
          item.sku,
          item.categoryName,
          item.branchName,
          item.currentStock,
          item.minAlertLevel,
          item.shortage,
          item.alertStatus === 'out_of_stock' ? 'OUT OF STOCK' : item.alertStatus === 'low_stock' ? 'LOW STOCK' : 'AVAILABLE',
          formatCurrencyBDT(item.purchasePrice),
          formatCurrencyBDT(item.shortage * item.purchasePrice),
        ]
      : [
          item.productName,
          item.sku,
          item.categoryName,
          item.branchName,
          item.currentStock,
          item.minAlertLevel,
          item.shortage,
          item.alertStatus === 'out_of_stock' ? 'OUT OF STOCK' : item.alertStatus === 'low_stock' ? 'LOW STOCK' : 'AVAILABLE',
          formatCurrencyBDT(item.sellingPrice),
        ]
  );

  const handleExportExcel = () => {
    exportReportToExcel({
      reportTitle: `Stock Alerts Report — ${activeTabFilter.replace('_', ' ').toUpperCase()}`,
      branchName: activeBranchLabel,
      categoryFilter: selectedCategory === 'all' ? 'All 3 Categories' : selectedCategory,
      generatedBy: `${currentUser.name} (${currentUser.role.replace('_', ' ')})`,
      headers: exportHeaders,
      dataRows: exportRows,
      summaryStats: [
        { label: 'Out of Stock Items', value: `${outOfStockCount} items` },
        { label: 'Low Stock Items', value: `${lowStockCount} items` },
        { label: 'Filtered Alert Items', value: `${alertItems.length} items` },
      ],
      fileName: `BestHeritage_Stock_Alerts_${new Date().toISOString().slice(0, 10)}.xlsx`,
    });
  };

  const handleExportPdf = () => {
    exportReportToPdf({
      reportTitle: `Stock Alerts Report — ${activeTabFilter.replace('_', ' ').toUpperCase()}`,
      branchName: activeBranchLabel,
      categoryFilter: selectedCategory === 'all' ? 'All 3 Categories' : selectedCategory,
      generatedBy: `${currentUser.name} (${currentUser.role.replace('_', ' ')})`,
      headers: exportHeaders,
      dataRows: exportRows,
      summaryStats: [
        { label: 'Out of Stock Items', value: `${outOfStockCount} items` },
        { label: 'Low Stock Items', value: `${lowStockCount} items` },
        { label: 'Filtered Alert Items', value: `${alertItems.length} items` },
      ],
      fileName: `BestHeritage_Stock_Alerts_${new Date().toISOString().slice(0, 10)}.pdf`,
    });
  };

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        exportHeaders.map((h) => `"${h}"`).join(','),
        ...exportRows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BestHeritage_Stock_Alerts_${new Date().toISOString().slice(0, 10)}.csv`);
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
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Stock Alerts — Threshold & Shortages</h1>
            <span className="text-xs bg-rose-50 text-rose-700 font-semibold px-2 py-0.5 rounded border border-rose-200">
              Threshold Warnings
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time monitoring of items equal to or below minimum alert thresholds. Immediate action required.
          </p>
          {!canViewProfit && (
            <div className="mt-2 inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Manager Mode: Purchase prices and restock cost estimates are masked for profit privacy.</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
            title="Download formatted Excel workbook (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export to Excel (.xlsx)</span>
          </button>
          <button
            onClick={handleExportPdf}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors"
            title="Download print-ready PDF (.pdf)"
          >
            <FileText className="w-4 h-4" />
            <span>Export to PDF (.pdf)</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-900 text-white shadow-xs transition-colors"
            title="Download CSV spreadsheet (.csv)"
          >
            <Download className="w-3.5 h-3.5 text-slate-300" />
            <span>CSV</span>
          </button>
          <button
            onClick={() => setActiveTab('stock-in')}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
          >
            <ArrowDownToLine className="w-4 h-4" />
            <span>Go to Stock In</span>
          </button>
        </div>
      </div>

      {/* Category Tabs */}
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

      {/* Alert Severity Filter Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveTabFilter('all_alerts')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTabFilter === 'all_alerts'
              ? 'bg-rose-50/50 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Action Items</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{outOfStockCount + lowStockCount}</p>
          <p className="text-[11px] text-rose-600 font-medium mt-1">Requires Stock Replenishment</p>
        </button>

        <button
          onClick={() => setActiveTabFilter('out_of_stock')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTabFilter === 'out_of_stock'
              ? 'bg-rose-50/50 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Out of Stock (Zero)</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-2">{outOfStockCount}</p>
          <p className="text-[11px] text-slate-500 mt-1">Stock = 0 units (Urgent)</p>
        </button>

        <button
          onClick={() => setActiveTabFilter('low_stock')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTabFilter === 'low_stock'
              ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Low Stock Alert</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">{lowStockCount}</p>
          <p className="text-[11px] text-slate-500 mt-1">Below Min Threshold Level</p>
        </button>

        <button
          onClick={() => setActiveTabFilter('healthy')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTabFilter === 'healthy'
              ? 'bg-emerald-50/50 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Available (Healthy)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{healthyCount}</p>
          <p className="text-[11px] text-slate-500 mt-1">Sufficient Safety Cushion</p>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search alerts by product name or SKU..."
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
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Product & Category</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4 text-center">Current Stock</th>
                <th className="py-3 px-4 text-center">Min Alert Level</th>
                <th className="py-3 px-4 text-center">Shortage</th>
                <th className="py-3 px-4 text-center">Status</th>
                {canViewProfit ? (
                  <>
                    <th className="py-3 px-4 text-right">Purchase Price</th>
                    <th className="py-3 px-4 text-right">Est. Reorder Cost</th>
                  </>
                ) : (
                  <th className="py-3 px-4 text-right">Selling Price</th>
                )}
                <th className="py-3 px-4 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {alertItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{item.productName}</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{item.sku}</span>
                      <span className="ml-1.5 text-slate-400">({item.categoryName})</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800">
                    {item.branchName}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold ${
                        item.alertStatus === 'out_of_stock'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : item.alertStatus === 'low_stock'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {item.currentStock} units
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-slate-600 font-semibold">
                    {item.minAlertLevel} units
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-rose-600">
                    {item.shortage > 0 ? `-${item.shortage}` : '—'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        item.alertStatus === 'out_of_stock'
                          ? 'bg-rose-100 text-rose-800'
                          : item.alertStatus === 'low_stock'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {item.alertStatus === 'out_of_stock'
                        ? 'Out of Stock'
                        : item.alertStatus === 'low_stock'
                        ? 'Low Stock'
                        : 'Available'}
                    </span>
                  </td>
                  {canViewProfit ? (
                    <>
                      <td className="py-3 px-4 text-right text-slate-700 font-medium">
                        {formatCurrencyBDT(item.purchasePrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatCurrencyBDT(item.shortage * item.purchasePrice)}
                      </td>
                    </>
                  ) : (
                    <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                      {formatCurrencyBDT(item.sellingPrice)}
                    </td>
                  )}
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setActiveTab('stock-in')}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors inline-flex items-center space-x-1"
                    >
                      <ArrowDownToLine className="w-3 h-3" />
                      <span>Stock In</span>
                    </button>
                  </td>
                </tr>
              ))}

              {alertItems.length === 0 && (
                <tr>
                  <td colSpan={canViewProfit ? 9 : 8} className="py-12 text-center text-slate-400 text-xs">
                    No items found matching the selected alert and filter criteria.
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
