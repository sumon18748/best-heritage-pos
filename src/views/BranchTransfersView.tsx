import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeftRight,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  FileSpreadsheet,
  FileText,
  Building2,
  Package,
} from 'lucide-react';
import { MainCategoryName } from '../types';
import { formatCurrencyBDT } from '../utils/stockCalculations';
import { exportReportToExcel } from '../utils/excelExport';
import { exportReportToPdf } from '../utils/pdfExport';

export const BranchTransfersView: React.FC = () => {
  const {
    currentUser,
    branches,
    products,
    branchStocks,
    transfers,
    createTransfer,
    receiveTransfer,
    cancelTransfer,
    selectedBranchId,
    canViewProfit,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    sourceBranchId: currentUser.role === 'manager' && currentUser.branchId ? currentUser.branchId : (branches[0]?.id || ''),
    destinationBranchId: branches[1]?.id || '',
    categoryFilter: 'all',
    productId: '',
    quantity: 1,
    notes: '',
  });

  const [cancelModalTrfId, setCancelModalTrfId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Filter transfers based on active branch selection and user role
  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      // Role & selected branch restrictions
      if (currentUser.role === 'manager' && currentUser.branchId) {
        if (t.sourceBranchId !== currentUser.branchId && t.destinationBranchId !== currentUser.branchId) {
          return false;
        }
      } else if (selectedBranchId !== 'all') {
        if (t.sourceBranchId !== selectedBranchId && t.destinationBranchId !== selectedBranchId) {
          return false;
        }
      }

      if (selectedCategory !== 'all' && t.categoryName !== selectedCategory) return false;
      if (selectedStatus !== 'all' && t.status !== selectedStatus) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          t.transferNo.toLowerCase().includes(q) ||
          t.productName.toLowerCase().includes(q) ||
          t.sku.toLowerCase().includes(q) ||
          t.sourceBranchName.toLowerCase().includes(q) ||
          t.destinationBranchName.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [transfers, currentUser, selectedBranchId, selectedCategory, selectedStatus, searchQuery]);

  // Available source stock for modal form
  const availableSourceStock = useMemo(() => {
    if (!formData.sourceBranchId || !formData.productId) return 0;
    const stock = branchStocks.find(
      (s) => s.branchId === formData.sourceBranchId && s.productId === formData.productId
    );
    return stock ? stock.currentStock : 0;
  }, [branchStocks, formData.sourceBranchId, formData.productId]);

  // Filtered products for modal
  const eligibleProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.status === 'inactive') return false;
      if (formData.categoryFilter !== 'all' && p.categoryName !== formData.categoryFilter) return false;
      return true;
    });
  }, [products, formData.categoryFilter]);

  const handleCreateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productId) {
      setNotification({ type: 'error', message: 'Please select a product to transfer.' });
      return;
    }
    if (formData.sourceBranchId === formData.destinationBranchId) {
      setNotification({ type: 'error', message: 'Source and destination branches cannot be the same.' });
      return;
    }

    const res = createTransfer({
      date: formData.date,
      sourceBranchId: formData.sourceBranchId,
      destinationBranchId: formData.destinationBranchId,
      productId: formData.productId,
      quantity: Number(formData.quantity),
      notes: formData.notes,
    });

    if (res.success) {
      setNotification({ type: 'success', message: res.message });
      setShowModal(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        sourceBranchId: currentUser.role === 'manager' && currentUser.branchId ? currentUser.branchId : (branches[0]?.id || ''),
        destinationBranchId: branches[1]?.id || '',
        categoryFilter: 'all',
        productId: '',
        quantity: 1,
        notes: '',
      });
    } else {
      setNotification({ type: 'error', message: res.message });
    }
  };

  const handleReceive = (trfId: string) => {
    const res = receiveTransfer(trfId);
    if (res.success) {
      setNotification({ type: 'success', message: res.message });
    } else {
      setNotification({ type: 'error', message: res.message });
    }
  };

  const handleConfirmCancel = () => {
    if (!cancelModalTrfId) return;
    const res = cancelTransfer(cancelModalTrfId, cancelReason || 'Cancelled by staff');
    if (res.success) {
      setNotification({ type: 'success', message: res.message });
    } else {
      setNotification({ type: 'error', message: res.message });
    }
    setCancelModalTrfId(null);
    setCancelReason('');
  };

  // Export handlers
  const handleExportExcel = () => {
    const headers = canViewProfit
      ? ['Transfer No', 'Date', 'Source Branch', 'Destination Branch', 'Product', 'SKU', 'Category', 'Quantity', 'Unit Cost', 'Total Cost', 'Status', 'Notes']
      : ['Transfer No', 'Date', 'Source Branch', 'Destination Branch', 'Product', 'SKU', 'Category', 'Quantity', 'Status', 'Notes'];

    const dataRows = filteredTransfers.map((t) => {
      if (canViewProfit) {
        return [
          t.transferNo,
          t.date,
          t.sourceBranchName,
          t.destinationBranchName,
          t.productName,
          t.sku,
          t.categoryName,
          t.quantity,
          t.unitPurchaseCost,
          t.totalTransferCost,
          t.status,
          t.notes || '',
        ];
      }
      return [
        t.transferNo,
        t.date,
        t.sourceBranchName,
        t.destinationBranchName,
        t.productName,
        t.sku,
        t.categoryName,
        t.quantity,
        t.status,
        t.notes || '',
      ];
    });

    exportReportToExcel({
      reportTitle: 'Branch Transfer Report',
      branchName: selectedBranchId === 'all' ? 'All Branches' : branches.find((b) => b.id === selectedBranchId)?.name || 'Branch',
      categoryFilter: selectedCategory === 'all' ? 'All Categories' : selectedCategory,
      generatedBy: currentUser.name,
      headers,
      dataRows,
      summaryStats: [
        { label: 'Total Transfers', value: filteredTransfers.length },
        { label: 'Total Units Transferred', value: filteredTransfers.reduce((sum, t) => sum + t.quantity, 0) },
      ],
    });
  };

  const handleExportPdf = () => {
    const headers = canViewProfit
      ? ['Transfer No', 'Date', 'From Branch', 'To Branch', 'Product', 'Category', 'Qty', 'Unit Cost', 'Status']
      : ['Transfer No', 'Date', 'From Branch', 'To Branch', 'Product', 'Category', 'Qty', 'Status'];

    const dataRows = filteredTransfers.map((t) => {
      if (canViewProfit) {
        return [
          t.transferNo,
          t.date,
          t.sourceBranchName,
          t.destinationBranchName,
          t.productName,
          t.categoryName,
          t.quantity,
          formatCurrencyBDT(t.unitPurchaseCost),
          t.status,
        ];
      }
      return [
        t.transferNo,
        t.date,
        t.sourceBranchName,
        t.destinationBranchName,
        t.productName,
        t.categoryName,
        t.quantity,
        t.status,
      ];
    });

    exportReportToPdf({
      reportTitle: 'Branch Transfer Report',
      branchName: selectedBranchId === 'all' ? 'All Branches' : branches.find((b) => b.id === selectedBranchId)?.name || 'Branch',
      categoryFilter: selectedCategory === 'all' ? 'All Categories' : selectedCategory,
      generatedBy: currentUser.name,
      headers,
      dataRows,
      summaryStats: [
        { label: 'Total Transfers', value: filteredTransfers.length },
        { label: 'Total Units Transferred', value: filteredTransfers.reduce((sum, t) => sum + t.quantity, 0) },
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Branch-to-Branch Stock Transfers</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Inter-Branch Logistics
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dispatch and receive stock between Best Heritage branches while tracking in-transit status and preserving unit purchase costs.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center space-x-1.5 shadow-2xs transition-colors"
            title="Export to Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleExportPdf}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center space-x-1.5 shadow-2xs transition-colors"
            title="Export to PDF (.pdf)"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            <span>PDF (.pdf)</span>
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center space-x-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Stock Transfer</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between shadow-xs border ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="font-bold ml-4">✕</button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search transfer no, product, SKU, branch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">All 3 Categories</option>
            <option value="Cosmetic Products">Cosmetic Products</option>
            <option value="Food Products">Food Products</option>
            <option value="Perfume Products">Perfume Products</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="Dispatched">In-Transit (Dispatched)</option>
            <option value="Received">Completed (Received)</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Transfers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Transfer No</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Source Branch</th>
                <th className="py-3 px-4">Destination Branch</th>
                <th className="py-3 px-4">Product & Category</th>
                <th className="py-3 px-4 text-center">Quantity</th>
                {canViewProfit && <th className="py-3 px-4 text-right">Unit Cost</th>}
                {canViewProfit && <th className="py-3 px-4 text-right">Total Cost</th>}
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={canViewProfit ? 10 : 8} className="py-12 text-center text-slate-400">
                    <ArrowLeftRight className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-xs">No stock transfers found for current filters.</p>
                  </td>
                </tr>
              ) : (
                filteredTransfers.map((t) => {
                  const canReceive =
                    t.status === 'Dispatched' &&
                    (currentUser.role === 'super_admin' ||
                      currentUser.role === 'admin' ||
                      currentUser.branchId === t.destinationBranchId);

                  const canCancel =
                    t.status === 'Dispatched' &&
                    (currentUser.role === 'super_admin' ||
                      currentUser.role === 'admin' ||
                      currentUser.branchId === t.sourceBranchId);

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800">{t.transferNo}</td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{t.date}</td>
                      <td className="py-3 px-4 font-medium text-slate-700">{t.sourceBranchName}</td>
                      <td className="py-3 px-4 font-medium text-slate-700">{t.destinationBranchName}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{t.productName}</div>
                        <div className="text-[11px] text-slate-400 flex items-center space-x-1">
                          <span>{t.sku}</span>
                          <span>•</span>
                          <span className="font-medium text-emerald-600">{t.categoryName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800">{t.quantity}</td>
                      {canViewProfit && (
                        <td className="py-3 px-4 text-right text-slate-600 font-mono">
                          {formatCurrencyBDT(t.unitPurchaseCost)}
                        </td>
                      )}
                      {canViewProfit && (
                        <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                          {formatCurrencyBDT(t.totalTransferCost)}
                        </td>
                      )}
                      <td className="py-3 px-4 text-center">
                        {t.status === 'Dispatched' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            <span>In-Transit</span>
                          </span>
                        )}
                        {t.status === 'Received' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Received</span>
                          </span>
                        )}
                        {t.status === 'Cancelled' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3" />
                            <span>Cancelled</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          {canReceive && (
                            <button
                              onClick={() => handleReceive(t.id)}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs transition-colors"
                            >
                              Receive
                            </button>
                          )}
                          {canCancel && (
                            <button
                              onClick={() => setCancelModalTrfId(t.id)}
                              className="px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                          {!canReceive && !canCancel && (
                            <span className="text-[11px] text-slate-400">Archived</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Transfer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Send className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold">Initiate Stock Transfer</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Transfer Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Category Filter</label>
                  <select
                    value={formData.categoryFilter}
                    onChange={(e) => setFormData({ ...formData, categoryFilter: e.target.value, productId: '' })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="all">All 3 Categories</option>
                    <option value="Cosmetic Products">Cosmetic Products</option>
                    <option value="Food Products">Food Products</option>
                    <option value="Perfume Products">Perfume Products</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Source Branch (From)</label>
                  <select
                    disabled={currentUser.role === 'manager' && !!currentUser.branchId}
                    value={formData.sourceBranchId}
                    onChange={(e) => setFormData({ ...formData, sourceBranchId: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Destination Branch (To)</label>
                  <select
                    value={formData.destinationBranchId}
                    onChange={(e) => setFormData({ ...formData, destinationBranchId: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {branches
                      .filter((b) => b.id !== formData.sourceBranchId)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-600">Select Product</label>
                  {formData.productId && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      Available at Source: {availableSourceStock} units
                    </span>
                  )}
                </div>
                <select
                  required
                  value={formData.productId}
                  onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">-- Choose Product to Transfer --</option>
                  {eligibleProducts.map((p) => {
                    const st = branchStocks.find((s) => s.branchId === formData.sourceBranchId && s.productId === p.id);
                    const qty = st ? st.currentStock : 0;
                    return (
                      <option key={p.id} value={p.id}>
                        [{p.categoryName.replace(' Products', '')}] {p.name} ({p.sku}) — Stock: {qty}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Transfer Quantity</label>
                <input
                  type="number"
                  min="1"
                  max={availableSourceStock}
                  required
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Logistics / Dispatch Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional delivery details, courier slip, or purpose..."
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={availableSourceStock <= 0}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl shadow-sm transition-colors"
                >
                  Dispatch Stock Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Transfer Confirmation Modal */}
      {cancelModalTrfId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Cancel Stock Transfer?</h3>
            <p className="text-xs text-slate-500">
              The dispatched quantity will be restored immediately to the source branch stock.
            </p>
            <input
              type="text"
              placeholder="Reason for cancellation..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none"
            />
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setCancelModalTrfId(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Back
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-3.5 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm"
              >
                Confirm Cancel & Restore Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
