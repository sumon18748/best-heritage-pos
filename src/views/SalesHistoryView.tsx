import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SaleTransaction } from '../types';
import {
  ReceiptText,
  Search,
  Calendar,
  Building2,
  Eye,
  RotateCcw,
  AlertTriangle,
  X,
  Check,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  FileText,
  Download,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { formatCurrencyBDT } from '../utils/stockCalculations';
import { exportReportToExcel } from '../utils/excelExport';
import { exportReportToPdf } from '../utils/pdfExport';
import { InvoiceModal } from '../components/InvoiceModal';

export const SalesHistoryView: React.FC = () => {
  const {
    sales,
    branches,
    cancelSale,
    deleteSale,
    currentUser,
    selectedBranchId,
    setActiveTab,
    canViewProfit,
    canVoidSale,
    canDelete,
  } = useApp();

  const isSuperAdmin = currentUser.role === 'super_admin';

  const [searchTerm, setSearchTerm] = useState('');
  const isBranchLocked = currentUser.role === 'manager' && !!currentUser.branchId;
  const [filterBranchId, setFilterBranchId] = useState<string>(
    isBranchLocked ? currentUser.branchId! : selectedBranchId
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedSaleForView, setSelectedSaleForView] = useState<SaleTransaction | null>(null);

  // Cancellation modal
  const [saleToCancel, setSaleToCancel] = useState<SaleTransaction | null>(null);
  const [cancelReason, setCancelReason] = useState('Customer returned goods in original condition');
  const [cancelFeedback, setCancelFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Delete modal (Super Admin only)
  const [saleToDelete, setSaleToDelete] = useState<SaleTransaction | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const effectiveBranchId = isBranchLocked ? currentUser.branchId! : filterBranchId;

  const filteredSales = sales.filter((s) => {
    const matchesBranch = effectiveBranchId === 'all' || s.branchId === effectiveBranchId;
    const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
    const matchesCategory =
      selectedCategory === 'all' ||
      s.items.some((i) => i.categoryName === selectedCategory);
    const matchesSearch =
      s.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.customerPhone && s.customerPhone.includes(searchTerm)) ||
      s.items.some((i) => i.productName.toLowerCase().includes(searchTerm.toLowerCase()) || i.sku.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesBranch && matchesStatus && matchesCategory && matchesSearch;
  });

  const totalSalesAmount = filteredSales
    .filter((s) => s.status === 'completed')
    .reduce((sum, s) => sum + s.totalSalesAmount, 0);

  const totalCostOfGoods = filteredSales
    .filter((s) => s.status === 'completed')
    .reduce((sum, s) => sum + s.totalCostOfGoodsSold, 0);

  const totalGrossProfit = filteredSales
    .filter((s) => s.status === 'completed')
    .reduce((sum, s) => sum + s.grossProfit, 0);

  const activeBranchLabel = isBranchLocked
    ? currentUser.branchName || 'Assigned Branch'
    : effectiveBranchId === 'all'
    ? 'All Branches (Consolidated)'
    : branches.find((b) => b.id === effectiveBranchId)?.name || 'Selected Branch';

  const exportHeaders = canViewProfit
    ? ['Date', 'Invoice No', 'Branch', 'Customer', 'Phone', 'Payment', 'Items Details', 'Qty Sold', 'COGS', 'Sales Revenue', 'Gross Profit', 'Status']
    : ['Date', 'Invoice No', 'Branch', 'Customer', 'Phone', 'Payment', 'Items Details', 'Qty Sold', 'Sales Revenue', 'Status'];

  const exportRows = filteredSales.map((s) =>
    canViewProfit
      ? [
          s.date,
          s.invoiceNo,
          s.branchName,
          s.customerName,
          s.customerPhone || '—',
          s.paymentMethod,
          s.items.map((i) => `${i.productName} (x${i.quantity} @ ${formatCurrencyBDT(i.sellingPrice)})`).join('; '),
          s.totalQuantitySold,
          formatCurrencyBDT(s.totalCostOfGoodsSold),
          formatCurrencyBDT(s.totalSalesAmount),
          `+${formatCurrencyBDT(s.grossProfit)}`,
          s.status.toUpperCase(),
        ]
      : [
          s.date,
          s.invoiceNo,
          s.branchName,
          s.customerName,
          s.customerPhone || '—',
          s.paymentMethod,
          s.items.map((i) => `${i.productName} (x${i.quantity} @ ${formatCurrencyBDT(i.sellingPrice)})`).join('; '),
          s.totalQuantitySold,
          formatCurrencyBDT(s.totalSalesAmount),
          s.status.toUpperCase(),
        ]
  );

  const summaryStats = canViewProfit
    ? [
        { label: 'Completed Invoices', value: `${filteredSales.filter((s) => s.status === 'completed').length}` },
        { label: 'Gross Revenue', value: formatCurrencyBDT(totalSalesAmount) },
        { label: 'Total COGS', value: formatCurrencyBDT(totalCostOfGoods) },
        { label: 'Total Gross Profit', value: formatCurrencyBDT(totalGrossProfit) },
      ]
    : [
        { label: 'Completed Invoices', value: `${filteredSales.filter((s) => s.status === 'completed').length}` },
        { label: 'Gross Revenue', value: formatCurrencyBDT(totalSalesAmount) },
        { label: 'Branch Scope', value: activeBranchLabel },
      ];

  const handleExportExcel = () => {
    exportReportToExcel({
      reportTitle: 'Sales History & Invoices Ledger',
      branchName: activeBranchLabel,
      categoryFilter: selectedCategory === 'all' ? 'All 3 Categories' : selectedCategory,
      generatedBy: `${currentUser.name} (${currentUser.role.replace('_', ' ')})`,
      headers: exportHeaders,
      dataRows: exportRows,
      summaryStats,
      fileName: `BestHeritage_SalesHistory_${new Date().toISOString().slice(0, 10)}.xlsx`,
    });
  };

  const handleExportPdf = () => {
    exportReportToPdf({
      reportTitle: 'Sales History & Invoices Ledger',
      branchName: activeBranchLabel,
      categoryFilter: selectedCategory === 'all' ? 'All 3 Categories' : selectedCategory,
      generatedBy: `${currentUser.name} (${currentUser.role.replace('_', ' ')})`,
      headers: exportHeaders,
      dataRows: exportRows,
      summaryStats,
      fileName: `BestHeritage_SalesHistory_${new Date().toISOString().slice(0, 10)}.pdf`,
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
    link.setAttribute('download', `BestHeritage_SalesHistory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmCancel = () => {
    if (!saleToCancel) return;
    const res = cancelSale(saleToCancel.id, cancelReason);
    setCancelFeedback(res);
    if (res.success) {
      setTimeout(() => {
        setSaleToCancel(null);
        setCancelFeedback(null);
      }, 1500);
    }
  };

  const handleConfirmDelete = () => {
    if (!saleToDelete) return;
    const res = deleteSale(saleToDelete.id);
    setDeleteFeedback(res);
    if (res.success) {
      setTimeout(() => {
        setSaleToDelete(null);
        setDeleteFeedback(null);
      }, 1500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sales History & Invoices</h1>
            <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded border border-emerald-200">
              Audit Trail
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete record of sales invoices, customer receipts, and stock-restoring void cancellations.
          </p>
          {!canViewProfit && (
            <div className="mt-2 inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Manager Mode: Sensitive COGS and Gross Profit figures are privacy-protected.</span>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Completed Invoices</p>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {filteredSales.filter((s) => s.status === 'completed').length} bills
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Total Sales Revenue</p>
          <p className="text-xl font-bold text-blue-700 mt-1">{formatCurrencyBDT(totalSalesAmount)}</p>
        </div>
        {canViewProfit ? (
          <>
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
              <p className="text-xs text-slate-500 font-medium">Cost of Goods Sold (COGS)</p>
              <p className="text-xl font-bold text-slate-700 mt-1">{formatCurrencyBDT(totalCostOfGoods)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
              <p className="text-xs text-slate-500 font-medium">Realized Gross Profit</p>
              <p className="text-xl font-bold text-emerald-700 mt-1">+{formatCurrencyBDT(totalGrossProfit)}</p>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs sm:col-span-2">
            <p className="text-xs text-slate-500 font-medium">Branch Scope</p>
            <p className="text-sm font-bold text-slate-800 mt-2 truncate">{activeBranchLabel}</p>
          </div>
        )}
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice number, customer name, phone, or product..."
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
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled (Void)</option>
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Invoice & Date</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Products & Units</th>
                {canViewProfit && <th className="py-3 px-4 text-right">Cost (COGS)</th>}
                <th className="py-3 px-4 text-right">Total Amount</th>
                {canViewProfit && <th className="py-3 px-4 text-right">Gross Profit</th>}
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-900 font-mono block">{sale.invoiceNo}</span>
                    <span className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      <span>{sale.date}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800">
                    {sale.branchName}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{sale.customerName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {sale.customerPhone || 'Walk-in'} • {sale.paymentMethod}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      {sale.items.map((it) => (
                        <div key={it.id} className="text-[11px] text-slate-800">
                          {it.quantity}x {it.productName}
                        </div>
                      ))}
                    </div>
                  </td>
                  {canViewProfit && (
                    <td className="py-3 px-4 text-right text-slate-500">
                      {formatCurrencyBDT(sale.totalCostOfGoodsSold)}
                    </td>
                  )}
                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    <div>{formatCurrencyBDT(sale.totalSalesAmount)}</div>
                    {sale.discountAmount && sale.discountAmount > 0 ? (
                      <div className="text-[10px] text-rose-600 font-normal">
                        Disc: -{formatCurrencyBDT(sale.discountAmount)}
                      </div>
                    ) : null}
                  </td>
                  {canViewProfit && (
                    <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                      +{formatCurrencyBDT(sale.grossProfit)}
                    </td>
                  )}
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        sale.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {sale.status === 'completed' ? 'Completed' : 'Cancelled'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center space-x-1.5">
                      <button
                        onClick={() => setSelectedSaleForView(sale)}
                        title="View / Print Invoice"
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {sale.status === 'completed' && (currentUser.role === 'super_admin' || canVoidSale || canDelete) && (
                        <button
                          onClick={() => {
                            setSaleToCancel(sale);
                            setCancelReason('Customer returned item in good condition');
                          }}
                          title="Void / Cancel Sale (Restores Stock)"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}

                      {/* Permanent Delete — Super Admin Only */}
                      {isSuperAdmin && (
                        <button
                          onClick={() => {
                            setSaleToDelete(sale);
                            setDeleteFeedback(null);
                          }}
                          title="Permanently Delete Invoice (Super Admin Only)"
                          className="p-1.5 text-slate-300 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={canViewProfit ? 9 : 7} className="py-12 text-center text-slate-400 text-xs">
                    No sales invoices found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Invoice Modal */}
      {selectedSaleForView && (
        <InvoiceModal
          sale={selectedSaleForView}
          onClose={() => setSelectedSaleForView(null)}
        />
      )}

      {/* Cancel Sale Modal */}
      {saleToCancel && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSaleToCancel(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <RotateCcw className="w-5 h-5 text-rose-600" />
              <span>Void Sale & Restore Stock</span>
            </h3>

            <p className="text-xs text-slate-500 mt-2">
              Cancelling invoice <strong>{saleToCancel.invoiceNo}</strong> will reverse the transaction and immediately restore the items to the branch inventory.
            </p>

            {cancelFeedback && (
              <div
                className={`mt-3 p-3 rounded-lg text-xs font-medium ${
                  cancelFeedback.success ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                }`}
              >
                {cancelFeedback.message}
              </div>
            )}

            {!cancelFeedback && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cancellation Reason:
                  </label>
                  <textarea
                    rows={3}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="Enter reason for voiding this invoice..."
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    onClick={() => setSaleToCancel(null)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                  >
                    Keep Invoice
                  </button>
                  <button
                    onClick={handleConfirmCancel}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
                  >
                    Confirm Void & Restore Stock
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Permanent Delete Modal — Super Admin Only */}
      {saleToDelete && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl relative border-2 border-red-200">
            <button
              onClick={() => setSaleToDelete(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-red-700 flex items-center space-x-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              <span>Permanently Delete Invoice</span>
            </h3>

            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
              ⚠️ এই ইনভয়েসটি সম্পূর্ণভাবে ডাটাবেজ থেকে মুছে ফেলা হবে। এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না!
            </div>

            <div className="mt-3 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span className="font-semibold">Invoice No:</span>
                <span className="font-mono font-bold text-slate-900">{saleToDelete.invoiceNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Customer:</span>
                <span>{saleToDelete.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Amount:</span>
                <span className="font-bold text-red-600">{formatCurrencyBDT(saleToDelete.totalSalesAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Branch:</span>
                <span>{saleToDelete.branchName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Status:</span>
                <span className={saleToDelete.status === 'completed' ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                  {saleToDelete.status === 'completed' ? 'Completed (Stock will be restored)' : 'Already Cancelled'}
                </span>
              </div>
            </div>

            {deleteFeedback && (
              <div
                className={`mt-3 p-3 rounded-lg text-xs font-semibold ${
                  deleteFeedback.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {deleteFeedback.message}
              </div>
            )}

            {!deleteFeedback && (
              <div className="flex justify-end space-x-2 pt-4 mt-2 border-t border-slate-100">
                <button
                  onClick={() => setSaleToDelete(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  বাতিল করুন
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg flex items-center space-x-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>হ্যাঁ, চিরতরে ডিলিট করুন</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
