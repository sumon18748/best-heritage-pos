import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowDownToLine,
  Plus,
  Search,
  Calendar,
  Building2,
  Trash2,
  Check,
  X,
  FileText,
  DollarSign,
  Package,
  FileSpreadsheet,
  Download,
  Sparkles,
  Apple,
  Flame,
} from 'lucide-react';
import { formatCurrencyBDT, calculateStockInCost } from '../utils/stockCalculations';
import { exportReportToExcel } from '../utils/excelExport';
import { exportReportToPdf } from '../utils/pdfExport';
import { MainCategoryName } from '../types';

interface ItemRow {
  productId: string;
  quantity: number;
  purchasePrice: number;
}

export const StockInView: React.FC = () => {
  const {
    products,
    branches,
    stockIns,
    createStockIn,
    currentUser,
    selectedBranchId,
    selectedCategoryName,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>(selectedCategoryName || 'all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const todayStr = new Date().toISOString().split('T')[0];
  const [formDate, setFormDate] = useState(todayStr);
  const [formBranchId, setFormBranchId] = useState(
    currentUser.role === 'manager' && currentUser.branchId ? currentUser.branchId : branches[0]?.id || ''
  );
  const [formCategory, setFormCategory] = useState<MainCategoryName>('Cosmetic Products');
  const [formSupplier, setFormSupplier] = useState('');
  const [formInvoiceRef, setFormInvoiceRef] = useState('');
  const [formRemarks, setFormRemarks] = useState('');

  // Products eligible in selected form category
  const categoryProducts = useMemo(() => {
    return products.filter((p) => p.categoryName === formCategory && p.status === 'active');
  }, [products, formCategory]);

  const [rows, setRows] = useState<ItemRow[]>([
    {
      productId: '',
      quantity: 10,
      purchasePrice: 0,
    },
  ]);

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // When form category changes, reset product row
  const handleCategoryChange = (newCat: MainCategoryName) => {
    setFormCategory(newCat);
    const catProds = products.filter((p) => p.categoryName === newCat && p.status === 'active');
    setRows([
      {
        productId: catProds[0]?.id || '',
        quantity: 10,
        purchasePrice: catProds[0]?.purchasePrice || 0,
      },
    ]);
  };

  const handleProductChange = (index: number, newProductId: string) => {
    const prod = products.find((p) => p.id === newProductId);
    const updated = [...rows];
    updated[index] = {
      ...updated[index],
      productId: newProductId,
      purchasePrice: prod ? prod.purchasePrice : 0,
    };
    setRows(updated);
  };

  const handleQtyChange = (index: number, qtyStr: string) => {
    const qty = Math.max(1, parseInt(qtyStr) || 1);
    const updated = [...rows];
    updated[index].quantity = qty;
    setRows(updated);
  };

  const handlePriceChange = (index: number, priceStr: string) => {
    const price = Math.max(0, parseFloat(priceStr) || 0);
    const updated = [...rows];
    updated[index].purchasePrice = price;
    setRows(updated);
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        productId: categoryProducts[0]?.id || '',
        quantity: 10,
        purchasePrice: categoryProducts[0]?.purchasePrice || 0,
      },
    ]);
  };

  const removeRow = (index: number) => {
    if (rows.length > 1) {
      setRows((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const totalCost = rows.reduce(
    (sum, r) => sum + calculateStockInCost(r.quantity, r.purchasePrice),
    0
  );
  const totalQty = rows.reduce((sum, r) => sum + r.quantity, 0);

  const openNewStockIn = (preselectedCategory?: MainCategoryName) => {
    const cat = preselectedCategory || (activeCategoryTab !== 'all' ? (activeCategoryTab as MainCategoryName) : 'Cosmetic Products');
    setFormCategory(cat);
    const catProds = products.filter((p) => p.categoryName === cat && p.status === 'active');
    setRows([
      {
        productId: catProds[0]?.id || '',
        quantity: 10,
        purchasePrice: catProds[0]?.purchasePrice || 0,
      },
    ]);
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError('');
    setFormSuccess('');

    if (!formBranchId) {
      setFormError('Please select a destination branch.');
      return;
    }

    if (rows.some((r) => !r.productId)) {
      setFormError('Please ensure all items have a valid product selected.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = createStockIn({
        date: formDate,
        branchId: formBranchId,
        supplierName: formSupplier.trim() || undefined,
        supplierInvoiceNo: formInvoiceRef.trim() || undefined,
        remarks: formRemarks.trim() || undefined,
        items: rows,
      });

      if (res.success) {
        setFormSuccess(res.message);
        setTimeout(() => {
          setIsModalOpen(false);
          setFormSupplier('');
          setFormInvoiceRef('');
          setFormRemarks('');
        }, 600);
      } else {
        setFormError(res.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBranchRestricted = currentUser.role === 'manager' && !!currentUser.branchId;
  const effectiveBranchId = isBranchRestricted ? currentUser.branchId! : selectedBranchId;

  // Filter history
  const filteredStockIns = useMemo(() => {
    return stockIns.filter((stk) => {
      const matchesBranch = effectiveBranchId === 'all' || stk.branchId === effectiveBranchId;
      const matchesCategory =
        activeCategoryTab === 'all' ||
        stk.items.some((i) => i.categoryName === activeCategoryTab);

      const matchesSearch =
        stk.referenceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (stk.supplierName && stk.supplierName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (stk.supplierInvoiceNo && stk.supplierInvoiceNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        stk.items.some((i) => i.productName.toLowerCase().includes(searchTerm.toLowerCase()) || i.sku.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchesBranch && matchesCategory && matchesSearch;
    });
  }, [stockIns, effectiveBranchId, activeCategoryTab, searchTerm]);

  const activeBranchLabel = isBranchRestricted
    ? currentUser.branchName || 'Assigned Branch'
    : effectiveBranchId === 'all'
    ? 'All Branches (Consolidated)'
    : branches.find((b) => b.id === effectiveBranchId)?.name || 'Selected Branch';

  const exportHeaders = ['Date', 'SIN Ref', 'Branch', 'Category', 'Supplier', 'Invoice Ref', 'Items', 'Total Qty', 'Total Cost', 'Remarks', 'Recorded By'];
  const exportRows = filteredStockIns.map((tx) => [
    tx.date,
    tx.referenceNo,
    tx.branchName,
    tx.items[0]?.categoryName || 'General',
    tx.supplierName || '—',
    tx.supplierInvoiceNo || '—',
    tx.items.map((i) => `${i.productName} (x${i.quantity} @ ${formatCurrencyBDT(i.purchasePrice)})`).join('; '),
    tx.totalQuantity,
    formatCurrencyBDT(tx.totalPurchaseCost),
    tx.remarks || '—',
    tx.createdByName,
  ]);

  const handleExportExcel = () => {
    const totalUnits = filteredStockIns.reduce((sum, t) => sum + t.totalQuantity, 0);
    const totalCostAmt = filteredStockIns.reduce((sum, t) => sum + t.totalPurchaseCost, 0);

    exportReportToExcel({
      reportTitle: 'Stock In & Procurement Report',
      branchName: activeBranchLabel,
      categoryFilter: activeCategoryTab === 'all' ? 'All Categories' : activeCategoryTab,
      generatedBy: `${currentUser.name} (${currentUser.role.replace('_', ' ')})`,
      headers: exportHeaders,
      dataRows: exportRows,
      summaryStats: [
        { label: 'Total Inward Transactions', value: `${filteredStockIns.length} shipments` },
        { label: 'Total Units Stocked In', value: `${totalUnits} units` },
        { label: 'Total Procurement Cost', value: formatCurrencyBDT(totalCostAmt) },
      ],
    });
  };

  const handleExportPdf = () => {
    const totalUnits = filteredStockIns.reduce((sum, t) => sum + t.totalQuantity, 0);
    const totalCostAmt = filteredStockIns.reduce((sum, t) => sum + t.totalPurchaseCost, 0);

    const pdfHeaders = ['Date', 'SIN Ref', 'Branch', 'Category', 'Supplier', 'Qty', 'Total Cost', 'Recorded By'];
    const pdfRows = filteredStockIns.map((tx) => [
      tx.date,
      tx.referenceNo,
      tx.branchName,
      tx.items[0]?.categoryName || 'General',
      tx.supplierName || '—',
      tx.totalQuantity,
      formatCurrencyBDT(tx.totalPurchaseCost),
      tx.createdByName,
    ]);

    exportReportToPdf({
      reportTitle: 'Stock In & Procurement Report',
      branchName: activeBranchLabel,
      categoryFilter: activeCategoryTab === 'all' ? 'All Categories' : activeCategoryTab,
      generatedBy: currentUser.name,
      headers: pdfHeaders,
      dataRows: pdfRows,
      summaryStats: [
        { label: 'Total Inward Records', value: filteredStockIns.length },
        { label: 'Total Units Stocked In', value: totalUnits },
        { label: 'Total Procurement Cost', value: formatCurrencyBDT(totalCostAmt) },
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Stock In — Goods Receipt & Procurement</h1>
            <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2.5 py-0.5 rounded-full border border-blue-200">
              Procurement & Restock
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Category-wise goods receipt for Cosmetic Products, Food Products, and Perfume Products into Best Heritage branches.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleExportPdf}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <FileText className="w-4 h-4 text-rose-600" />
            <span>PDF (.pdf)</span>
          </button>

          <button
            onClick={() => openNewStockIn()}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Stock In Entry</span>
          </button>
        </div>
      </div>

      {/* Category Selection Tabs for Stock In */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-1.5 bg-slate-100/80 p-1 rounded-xl">
          <button
            onClick={() => setActiveCategoryTab('all')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeCategoryTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Stock Ins ({stockIns.length})
          </button>

          <button
            onClick={() => setActiveCategoryTab('Cosmetic Products')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-all ${
              activeCategoryTab === 'Cosmetic Products'
                ? 'bg-pink-600 text-white shadow-xs'
                : 'text-pink-700 hover:bg-pink-50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Cosmetic Products</span>
          </button>

          <button
            onClick={() => setActiveCategoryTab('Food Products')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-all ${
              activeCategoryTab === 'Food Products'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-800 hover:bg-amber-50'
            }`}
          >
            <Apple className="w-3.5 h-3.5" />
            <span>Food Products</span>
          </button>

          <button
            onClick={() => setActiveCategoryTab('Perfume Products')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-all ${
              activeCategoryTab === 'Perfume Products'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-purple-800 hover:bg-purple-50'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Perfume Products</span>
          </button>
        </div>

        {/* Fast Category-Specific Stock In Quick Buttons */}
        <div className="hidden lg:flex items-center space-x-1.5 pr-2">
          <span className="text-[11px] text-slate-400 font-medium">Quick In:</span>
          <button
            onClick={() => openNewStockIn('Cosmetic Products')}
            className="px-2.5 py-1 text-[11px] font-semibold text-pink-700 bg-pink-50 hover:bg-pink-100 rounded-lg border border-pink-200"
          >
            + Cosmetic
          </button>
          <button
            onClick={() => openNewStockIn('Food Products')}
            className="px-2.5 py-1 text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200"
          >
            + Food
          </button>
          <button
            onClick={() => openNewStockIn('Perfume Products')}
            className="px-2.5 py-1 text-[11px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200"
          >
            + Perfume
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by SIN Reference, supplier name, invoice, product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
          />
        </div>
      </div>

      {/* Stock In History Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Ref No & Date</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Supplier & Invoice</th>
                <th className="py-3 px-4">Items Summary</th>
                <th className="py-3 px-4 text-center">Total Quantity</th>
                <th className="py-3 px-4 text-right">Total Purchase Cost</th>
                <th className="py-3 px-4 text-right">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStockIns.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 font-mono block">{tx.referenceNo}</span>
                    <span className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      <span>{tx.date}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-800">{tx.branchName}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                      {tx.items[0]?.categoryName || 'General'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-800">{tx.supplierName || '—'}</div>
                    {tx.supplierInvoiceNo && (
                      <div className="text-[11px] text-slate-400 font-mono">Inv: {tx.supplierInvoiceNo}</div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      {tx.items.map((it) => (
                        <div key={it.id} className="text-[11px] flex items-center space-x-2">
                          <span className="font-semibold text-slate-800">{it.productName}</span>
                          <span className="text-slate-400 font-mono">({it.quantity} × {formatCurrencyBDT(it.purchasePrice)})</span>
                          {it.totalVolumeWeight && (
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-1 rounded border border-indigo-200">
                              ⚖️ {it.totalVolumeWeight}
                            </span>
                          )}
                        </div>
                      ))}
                      {tx.remarks && (
                        <div className="text-[10px] text-slate-400 italic">Note: {tx.remarks}</div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      +{tx.totalQuantity} units
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                    {formatCurrencyBDT(tx.totalPurchaseCost)}
                  </td>
                  <td className="py-3 px-4 text-right text-[11px] text-slate-500">
                    {tx.createdByName}
                  </td>
                </tr>
              ))}

              {filteredStockIns.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No stock in records found matching selected category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Stock In Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <ArrowDownToLine className="w-5 h-5 text-blue-600" />
              <span>Stock In — Add Products to Inventory</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select category and add incoming products with purchase costs. Stock updates automatically.
            </p>

            {formError && (
              <div className="mt-3 p-2 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="mt-3 p-2 bg-emerald-50 text-emerald-700 text-xs rounded-lg border border-emerald-200 flex items-center space-x-1">
                <Check className="w-4 h-4" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Category Selector in Modal */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1.5">
                  Select Main Category for Stock In *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCategoryChange('Cosmetic Products')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 border transition-all ${
                      formCategory === 'Cosmetic Products'
                        ? 'bg-pink-600 text-white border-pink-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Cosmetics</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCategoryChange('Food Products')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 border transition-all ${
                      formCategory === 'Food Products'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Apple className="w-3.5 h-3.5" />
                    <span>Food</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCategoryChange('Perfume Products')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 border transition-all ${
                      formCategory === 'Perfume Products'
                        ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>Perfumes</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Stock In Date *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Destination Branch *</label>
                  {currentUser.role === 'manager' ? (
                    <div className="px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-semibold">
                      {currentUser.branchName}
                    </div>
                  ) : (
                    <select
                      value={formBranchId}
                      onChange={(e) => setFormBranchId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none bg-white font-medium"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Heritage Botanicals Ltd."
                    value={formSupplier}
                    onChange={(e) => setFormSupplier(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier Invoice No</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-9042"
                    value={formInvoiceRef}
                    onChange={(e) => setFormInvoiceRef(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Items Table filtered by category */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    {formCategory} to Add
                  </label>
                  <button
                    type="button"
                    onClick={addRow}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {rows.map((row, idx) => {
                    const rowCost = calculateStockInCost(row.quantity, row.purchasePrice);
                    return (
                      <div key={idx} className="flex flex-col sm:flex-row items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                        <div className="flex-1 w-full sm:w-auto">
                          <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Product</label>
                          <select
                            value={row.productId}
                            onChange={(e) => handleProductChange(idx, e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none bg-white font-medium"
                          >
                            <option value="">-- Select Product --</option>
                            {categoryProducts.map((p) => {
                              const size = p.packageSize || p.bottleCapacityMl || p.decantConfig?.bottleCapacityMl;
                              const unit = p.packageUnit || (p.categoryName === 'Perfume Products' ? 'ml' : 'g');
                              return (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.sku}){size ? ` [⚖️ ${size} ${unit}]` : ''}
                                </option>
                              );
                            })}
                          </select>
                          {(() => {
                            const p = products.find((pr) => pr.id === row.productId);
                            const size = p?.packageSize || p?.bottleCapacityMl || p?.decantConfig?.bottleCapacityMl;
                            const unit = p?.packageUnit || (p?.categoryName === 'Perfume Products' ? 'ml' : 'g');
                            if (!size) return null;
                            const totalVol = (size * (row.quantity || 0)).toFixed(0);
                            return (
                              <div className="text-[10px] text-blue-600 font-semibold mt-1 flex items-center space-x-1">
                                <span>📦 Net Volume/Weight:</span>
                                <span className="bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded font-mono font-bold">
                                  {size} {unit} × {row.quantity} = {totalVol} {unit}
                                </span>
                              </div>
                            );
                          })()}
                        </div>

                        <div className="w-24">
                          <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            value={row.quantity}
                            onChange={(e) => handleQtyChange(idx, e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg text-center font-bold focus:outline-none"
                          />
                        </div>

                        <div className="w-28">
                          <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Cost/Unit (Tk)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.purchasePrice}
                            onChange={(e) => handlePriceChange(idx, e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg text-right font-bold focus:outline-none"
                          />
                        </div>

                        <div className="w-28 text-right">
                          <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Total Cost</label>
                          <div className="text-xs font-bold text-slate-900 py-1.5 font-mono">
                            {formatCurrencyBDT(rowCost)}
                          </div>
                        </div>

                        <div className="pt-4 sm:pt-0">
                          {rows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeRow(idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-600">
                    Total Quantity: <span className="text-slate-900 font-bold">{totalQty} units</span>
                  </span>
                  <span className="font-semibold text-slate-600">
                    Total Purchase Cost:{' '}
                    <span className="text-slate-900 font-bold text-sm font-mono">{formatCurrencyBDT(totalCost)}</span>
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks / Quality Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Batch inspected, sealed packages verified"
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                >
                  {isSubmitting ? 'Recording...' : `Confirm & Stock In (${formCategory.replace(' Products', '')})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
