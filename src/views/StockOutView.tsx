import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { StockOutReason, MainCategoryName, StockOutTransaction } from '../types';
import {
  ArrowUpFromLine,
  Plus,
  Search,
  Calendar,
  AlertTriangle,
  Check,
  X,
  FileText,
  Boxes,
  FileSpreadsheet,
  Download,
  Sparkles,
  Apple,
  Flame,
  Pencil,
  Trash2,
  ShoppingCart,
} from 'lucide-react';
import { canStockOut } from '../utils/stockCalculations';
import { exportReportToExcel } from '../utils/excelExport';
import { exportReportToPdf } from '../utils/pdfExport';
import { getBangladeshTodayDateString, sortByNewestFirst } from '../utils/dateUtils';

export interface UnifiedStockOutItem {
  id: string;
  sourceType: 'sale' | 'manual';
  referenceNo: string;
  date: string;
  createdAt?: string;
  branchId: string;
  branchName: string;
  categoryName: string;
  reason: string;
  items: {
    id: string;
    productName: string;
    sku: string;
    categoryName?: string;
    quantity: number;
    isDecant?: boolean;
    decantVariantName?: string;
  }[];
  totalQuantity: number;
  referenceDocNo?: string;
  remarks?: string;
  createdByName: string;
  originalManual?: StockOutTransaction;
}

export const StockOutView: React.FC = () => {
  const {
    products,
    branches,
    branchStocks,
    stockOuts,
    sales,
    createStockOut,
    updateStockOut,
    deleteStockOut,
    currentUser,
    selectedBranchId,
    selectedCategoryName,
  } = useApp();

  const isSuperAdmin = currentUser.role === 'super_admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>(selectedCategoryName || 'all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'sale' | 'manual'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Super Admin Delete state
  const [stockOutToDelete, setStockOutToDelete] = useState<StockOutTransaction | null>(null);
  const [deleteNotice, setDeleteNotice] = useState<{ success: boolean; message: string } | null>(null);

  // Super Admin Edit state
  const [stockOutToEdit, setStockOutToEdit] = useState<StockOutTransaction | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editReason, setEditReason] = useState<StockOutReason>('Damaged Product');
  const [editReferenceDoc, setEditReferenceDoc] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [editQuantity, setEditQuantity] = useState('1');
  const [editNotice, setEditNotice] = useState<{ success: boolean; message: string } | null>(null);

  // Form state
  const todayStr = getBangladeshTodayDateString();
  const [formDate, setFormDate] = useState(todayStr);
  const [formBranchId, setFormBranchId] = useState(
    currentUser.role === 'manager' && currentUser.branchId ? currentUser.branchId : branches[0]?.id || ''
  );
  const [formCategory, setFormCategory] = useState<MainCategoryName>('Cosmetic Products');
  const [formProductId, setFormProductId] = useState('');
  const [formQuantity, setFormQuantity] = useState('1');
  const [formReason, setFormReason] = useState<StockOutReason>('Damaged Product');
  const [formReferenceDoc, setFormReferenceDoc] = useState('');
  const [formRemarks, setFormRemarks] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Products eligible in selected form category
  const categoryProducts = useMemo(() => {
    return products.filter((p) => p.categoryName === formCategory && p.status === 'active');
  }, [products, formCategory]);

  // When form category changes or modal opens, pick first product
  const handleCategoryChange = (newCat: MainCategoryName) => {
    setFormCategory(newCat);
    const catProds = products.filter((p) => p.categoryName === newCat && p.status === 'active');
    setFormProductId(catProds[0]?.id || '');
  };

  const openNewStockOut = (preselectedCategory?: MainCategoryName) => {
    const cat = preselectedCategory || (activeCategoryTab !== 'all' ? (activeCategoryTab as MainCategoryName) : 'Cosmetic Products');
    setFormCategory(cat);
    const catProds = products.filter((p) => p.categoryName === cat && p.status === 'active');
    setFormProductId(catProds[0]?.id || '');
    setFormQuantity('1');
    setFormReason('Damaged Product');
    setFormReferenceDoc('');
    setFormRemarks('');
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  // Get current stock for selected product and branch
  const selectedProductStock = useMemo(() => {
    if (!formProductId) return 0;
    return branchStocks.find(
      (s) => s.branchId === formBranchId && s.productId === formProductId
    )?.currentStock || 0;
  }, [branchStocks, formBranchId, formProductId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError('');
    setFormSuccess('');

    if (!formProductId) {
      setFormError('Please select a product.');
      return;
    }

    const qty = parseInt(formQuantity) || 0;
    const check = canStockOut(selectedProductStock, qty);
    if (!check.allowed) {
      setFormError(check.message || 'Cannot stock out requested quantity.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = createStockOut({
        date: formDate,
        branchId: formBranchId,
        reason: formReason,
        referenceDocNo: formReferenceDoc.trim() || undefined,
        remarks: formRemarks.trim() || undefined,
        items: [
          {
            productId: formProductId,
            quantity: qty,
          },
        ],
      });

      if (res.success) {
        setFormSuccess(res.message);
        setTimeout(() => {
          setIsModalOpen(false);
          setFormRemarks('');
          setFormReferenceDoc('');
          setFormQuantity('1');
        }, 600);
      } else {
        setFormError(res.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteStockOut = () => {
    if (!stockOutToDelete) return;
    const res = deleteStockOut(stockOutToDelete.id);
    setDeleteNotice(res);
    if (res.success) {
      setTimeout(() => {
        setStockOutToDelete(null);
        setDeleteNotice(null);
      }, 1500);
    }
  };

  const openEditStockOutModal = (tx: StockOutTransaction) => {
    setStockOutToEdit(tx);
    setEditDate(tx.date);
    setEditReason(tx.reason);
    setEditReferenceDoc(tx.referenceDocNo || '');
    setEditRemarks(tx.remarks || '');
    setEditQuantity(String(tx.totalQuantity || 1));
    setEditNotice(null);
  };

  const handleSaveEditStockOut = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockOutToEdit) return;
    const qty = Math.max(1, parseInt(editQuantity) || 1);
    const updatedItems = stockOutToEdit.items.map((it) => ({
      productId: it.productId,
      quantity: qty,
    }));
    const res = updateStockOut(stockOutToEdit.id, {
      date: editDate,
      reason: editReason,
      referenceDocNo: editReferenceDoc,
      remarks: editRemarks,
      items: updatedItems,
    });
    setEditNotice(res);
    if (res.success) {
      setTimeout(() => {
        setStockOutToEdit(null);
        setEditNotice(null);
      }, 1500);
    }
  };

  const isBranchRestricted = currentUser.role === 'manager' && !!currentUser.branchId;
  const effectiveBranchId = isBranchRestricted ? currentUser.branchId! : selectedBranchId;

  // Unify Manual Stock Outs and Sales Deductions
  const allStockOutItems = useMemo<UnifiedStockOutItem[]>(() => {
    const manualList: UnifiedStockOutItem[] = stockOuts.map((stk) => ({
      id: `manual_${stk.id}`,
      sourceType: 'manual',
      referenceNo: stk.referenceNo,
      date: stk.date,
      createdAt: stk.createdAt,
      branchId: stk.branchId,
      branchName: stk.branchName,
      categoryName: stk.items[0]?.categoryName || 'General',
      reason: stk.reason,
      items: stk.items.map((it) => ({
        id: it.id,
        productName: it.productName,
        sku: it.sku,
        quantity: it.quantity,
      })),
      totalQuantity: stk.totalQuantity,
      referenceDocNo: stk.referenceDocNo,
      remarks: stk.remarks,
      createdByName: stk.createdByName,
      originalManual: stk,
    }));

    const salesList: UnifiedStockOutItem[] = sales
      .filter((s) => s.status !== 'cancelled')
      .map((sale) => ({
        id: `sale_${sale.id}`,
        sourceType: 'sale',
        referenceNo: sale.invoiceNo,
        date: sale.date,
        createdAt: sale.createdAt,
        branchId: sale.branchId,
        branchName: sale.branchName,
        categoryName: sale.items[0]?.categoryName || 'General',
        reason: 'Customer Sale (POS Invoice)',
        items: sale.items.map((it) => ({
          id: it.id,
          productName: it.productName,
          sku: it.sku,
          categoryName: it.categoryName,
          quantity: it.quantity,
          isDecant: it.isDecant,
          decantVariantName: it.decantVariantName,
        })),
        totalQuantity: sale.totalQuantitySold,
        referenceDocNo: sale.customerName ? `Customer: ${sale.customerName}` : undefined,
        remarks: sale.notes ? `${sale.notes} (${sale.paymentMethod})` : `Paid via ${sale.paymentMethod}`,
        createdByName: sale.createdByName,
      }));

    const combined = [...manualList, ...salesList];
    return sortByNewestFirst(combined);
  }, [stockOuts, sales]);

  // Filter history
  const filteredStockOuts = useMemo(() => {
    const matches = allStockOutItems.filter((stk) => {
      const matchesSource = sourceFilter === 'all' || stk.sourceType === sourceFilter;
      const matchesBranch = effectiveBranchId === 'all' || stk.branchId === effectiveBranchId;
      const matchesCategory =
        activeCategoryTab === 'all' ||
        stk.items.some((i) => i.categoryName === activeCategoryTab || stk.categoryName === activeCategoryTab);

      const matchesSearch =
        stk.referenceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (stk.referenceDocNo && stk.referenceDocNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        stk.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (stk.remarks && stk.remarks.toLowerCase().includes(searchTerm.toLowerCase())) ||
        stk.items.some((i) => i.productName.toLowerCase().includes(searchTerm.toLowerCase()) || i.sku.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchesSource && matchesBranch && matchesCategory && matchesSearch;
    });

    return sortByNewestFirst(matches);
  }, [allStockOutItems, sourceFilter, effectiveBranchId, activeCategoryTab, searchTerm]);

  const activeBranchLabel = isBranchRestricted
    ? currentUser.branchName || 'Assigned Branch'
    : effectiveBranchId === 'all'
    ? 'All Branches (Consolidated)'
    : branches.find((b) => b.id === effectiveBranchId)?.name || 'Selected Branch';

  const exportHeaders = ['Date', 'Ref No', 'Branch', 'Category', 'Out Type / Reason', 'Ref Doc / Customer', 'Items Deducted', 'Total Quantity', 'Remarks', 'Authorized By'];
  const exportRows = filteredStockOuts.map((tx) => [
    tx.date,
    tx.referenceNo,
    tx.branchName,
    tx.categoryName || 'General',
    tx.sourceType === 'sale' ? 'Sale (POS)' : tx.reason,
    tx.referenceDocNo || '—',
    tx.items.map((i) => `${i.productName} (${i.quantity} units)`).join('; '),
    tx.totalQuantity,
    tx.remarks || '—',
    tx.createdByName,
  ]);

  const handleExportExcel = () => {
    const totalOutQty = filteredStockOuts.reduce((sum, t) => sum + t.totalQuantity, 0);

    exportReportToExcel({
      reportTitle: 'Stock Out & Deductions Report',
      branchName: activeBranchLabel,
      categoryFilter: activeCategoryTab === 'all' ? 'All Categories' : activeCategoryTab,
      generatedBy: `${currentUser.name} (${currentUser.role.replace('_', ' ')})`,
      headers: exportHeaders,
      dataRows: exportRows,
      summaryStats: [
        { label: 'Total Stock Out Events', value: `${filteredStockOuts.length} entries` },
        { label: 'Total Units Deducted', value: `${totalOutQty} units` },
      ],
    });
  };

  const handleExportPdf = () => {
    const totalOutQty = filteredStockOuts.reduce((sum, t) => sum + t.totalQuantity, 0);

    const pdfHeaders = ['Date', 'Ref No', 'Branch', 'Category', 'Reason', 'Qty Deducted', 'Doc / Remarks', 'Authorized By'];
    const pdfRows = filteredStockOuts.map((tx) => [
      tx.date,
      tx.referenceNo,
      tx.branchName,
      tx.categoryName || 'General',
      tx.sourceType === 'sale' ? 'Sale (POS)' : tx.reason,
      tx.totalQuantity,
      tx.remarks || tx.referenceDocNo || '—',
      tx.createdByName,
    ]);

    exportReportToPdf({
      reportTitle: 'Stock Out & Deductions Report',
      branchName: activeBranchLabel,
      categoryFilter: activeCategoryTab === 'all' ? 'All Categories' : activeCategoryTab,
      generatedBy: currentUser.name,
      headers: pdfHeaders,
      dataRows: pdfRows,
      summaryStats: [
        { label: 'Total Stock Out Events', value: filteredStockOuts.length },
        { label: 'Total Units Deducted', value: totalOutQty },
      ],
    });
  };

  const getReasonBadge = (reason: StockOutReason) => {
    switch (reason) {
      case 'Damaged Product':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">Damaged</span>;
      case 'Internal Use':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">Internal Use</span>;
      case 'Lost Product':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800 border border-red-200">Lost</span>;
      case 'Authorized Adjustment':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">Adjustment</span>;
    }
  };

  const renderReasonBadge = (stk: UnifiedStockOutItem) => {
    if (stk.sourceType === 'sale') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center space-x-1">
          <span>🛒</span>
          <span>Sold / POS</span>
        </span>
      );
    }
    return getReasonBadge(stk.reason as StockOutReason);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Stock Out — Deductions & Write-Offs</h1>
            <span className="text-xs bg-amber-50 text-amber-700 font-semibold px-2.5 py-0.5 rounded-full border border-amber-200">
              Adjustment & Write-Off
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Category-wise stock deductions for damaged products, internal samples, or authorized adjustments with zero negative stock enforcement.
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
            onClick={() => openNewStockOut()}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Stock Out Entry</span>
          </button>
        </div>
      </div>

      {/* Category Selection Tabs for Stock Out */}
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
            All Divisions ({allStockOutItems.length})
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
            <span>Cosmetics</span>
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
            <span>Foods</span>
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
            <span>Perfumes</span>
          </button>
        </div>

        {/* Quick Out buttons by category */}
        <div className="hidden lg:flex items-center space-x-1.5 pr-2">
          <span className="text-[11px] text-slate-400 font-medium">Quick Out:</span>
          <button
            onClick={() => openNewStockOut('Cosmetic Products')}
            className="px-2.5 py-1 text-[11px] font-semibold text-pink-700 bg-pink-50 hover:bg-pink-100 rounded-lg border border-pink-200"
          >
            - Cosmetic
          </button>
          <button
            onClick={() => openNewStockOut('Food Products')}
            className="px-2.5 py-1 text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200"
          >
            - Food
          </button>
          <button
            onClick={() => openNewStockOut('Perfume Products')}
            className="px-2.5 py-1 text-[11px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200"
          >
            - Perfume
          </button>
        </div>
      </div>

      {/* Source Type Filter (Sales vs Manual) and Search */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Source Filter Tabs */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setSourceFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              sourceFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Stock Outs ({allStockOutItems.length})
          </button>
          <button
            onClick={() => setSourceFilter('sale')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1 transition-all ${
              sourceFilter === 'sale' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Sales Out / POS ({allStockOutItems.filter(x => x.sourceType === 'sale').length})</span>
          </button>
          <button
            onClick={() => setSourceFilter('manual')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1 transition-all ${
              sourceFilter === 'manual' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-800 hover:bg-amber-50'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Manual Adjustments ({allStockOutItems.filter(x => x.sourceType === 'manual').length})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Invoice / SOUT Ref, product, reason, customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-800"
          />
        </div>
      </div>

      {/* Stock Out History Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Ref No & Date</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Deducted Product</th>
                <th className="py-3 px-4 text-center">Quantity Deducted</th>
                <th className="py-3 px-4">Doc / Remarks</th>
                <th className="py-3 px-4 text-right">Authorized By</th>
                {isSuperAdmin && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStockOuts.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 font-mono block">{tx.referenceNo}</span>
                    <span className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      <span>{tx.date}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800">
                    {tx.branchName}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                      {tx.items[0]?.categoryName || 'General'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {renderReasonBadge(tx)}
                  </td>
                  <td className="py-3 px-4">
                    {tx.items.map((it) => (
                      <div key={it.id} className="text-xs">
                        <span className="font-semibold text-slate-900">{it.productName}</span>
                        <span className="text-slate-500 font-mono ml-1.5 font-bold">(-{it.quantity} units)</span>
                        {it.isDecant && (
                          <span className="ml-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1 rounded border border-indigo-200">
                            🧴 {it.decantVariantName || 'Decant'}
                          </span>
                        )}
                      </div>
                    ))}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        tx.sourceType === 'sale'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      -{tx.totalQuantity} units
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {tx.referenceDocNo && (
                      <div className="font-mono text-[11px] text-slate-700">{tx.referenceDocNo}</div>
                    )}
                    {tx.remarks && <div className="text-[11px] text-slate-500 italic">{tx.remarks}</div>}
                  </td>
                  <td className="py-3 px-4 text-right text-[11px] text-slate-500">
                    {tx.createdByName}
                  </td>
                  {isSuperAdmin && (
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {tx.sourceType === 'manual' && tx.originalManual ? (
                        <div className="inline-flex items-center space-x-1.5">
                          <button
                            onClick={() => openEditStockOutModal(tx.originalManual!)}
                            title="Edit Stock Out (Super Admin Only)"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setStockOutToDelete(tx.originalManual!);
                              setDeleteNotice(null);
                            }}
                            title="Delete Stock Out (Super Admin Only)"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          POS Invoice
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))}

              {filteredStockOuts.length === 0 && (
                <tr>
                  <td colSpan={isSuperAdmin ? 9 : 8} className="py-12 text-center text-slate-400 text-xs">
                    No stock out records found matching current category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Stock Out Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <ArrowUpFromLine className="w-5 h-5 text-amber-600" />
              <span>Stock Out — Deduct Products from Inventory</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select category and product. Deduction strictly validated against available branch stock.
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
              {/* Category selector */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1.5">
                  1. Select Category *
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Branch *</label>
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
                          {b.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">2. Select {formCategory} *</label>
                <select
                  required
                  value={formProductId}
                  onChange={(e) => setFormProductId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none bg-white font-medium"
                >
                  <option value="">-- Choose Product --</option>
                  {categoryProducts.map((p) => {
                    const stock = branchStocks.find(
                      (s) => s.branchId === formBranchId && s.productId === p.id
                    )?.currentStock || 0;
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — Available: {stock} units
                      </option>
                    );
                  })}
                </select>

                <div className="mt-1 flex items-center justify-between text-[11px] px-1">
                  <span className="text-slate-500">Available in branch:</span>
                  <span className={`font-bold ${selectedProductStock > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {selectedProductStock} units on-hand
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity to Deduct *</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedProductStock}
                    required
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Stock Out *</label>
                  <select
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value as StockOutReason)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none bg-white font-medium"
                  >
                    <option value="Damaged Product">Damaged Product</option>
                    <option value="Internal Use">Internal Use</option>
                    <option value="Lost Product">Lost Product</option>
                    <option value="Authorized Adjustment">Authorized Adjustment</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reference Document Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. QC-DMG-012, INT-REQUISITION-4"
                  value={formReferenceDoc}
                  onChange={(e) => setFormReferenceDoc(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks / Explanation</label>
                <textarea
                  rows={2}
                  placeholder="Explain reason for write-off..."
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
                  disabled={selectedProductStock <= 0}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white shadow-sm"
                >
                  Confirm Stock Out
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Stock Out Modal — Super Admin Only */}
      {stockOutToDelete && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl relative border-2 border-red-200">
            <button
              onClick={() => setStockOutToDelete(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-red-700 flex items-center space-x-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              <span>Permanently Delete Stock Out</span>
            </h3>

            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
              ⚠️ Deleting this Stock Out record will automatically restore {stockOutToDelete.totalQuantity} units back to the branch inventory.
            </div>

            <div className="mt-3 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span className="font-semibold">Reference No:</span>
                <span className="font-mono font-bold text-slate-900">{stockOutToDelete.referenceNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Branch:</span>
                <span>{stockOutToDelete.branchName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Reason:</span>
                <span className="font-semibold text-amber-700">{stockOutToDelete.reason}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Deducted Product:</span>
                <span className="font-medium text-slate-800">{stockOutToDelete.items[0]?.productName || 'Product'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Quantity Restored:</span>
                <span className="font-bold text-emerald-700">+{stockOutToDelete.totalQuantity} units</span>
              </div>
            </div>

            {deleteNotice && (
              <div
                className={`mt-3 p-3 rounded-lg text-xs font-semibold ${
                  deleteNotice.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {deleteNotice.message}
              </div>
            )}

            {!deleteNotice && (
              <div className="flex justify-end space-x-2 pt-4 mt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStockOutToDelete(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteStockOut}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg flex items-center space-x-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Yes, Delete & Restore Stock</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Stock Out Modal — Super Admin Only */}
      {stockOutToEdit && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-slate-200 my-8">
            <button
              onClick={() => setStockOutToEdit(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5 text-blue-600 mb-4">
              <div className="p-2 bg-blue-50 rounded-xl">
                <Pencil className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Edit Stock Out: {stockOutToEdit.referenceNo}
                </h3>
                <p className="text-[11px] text-blue-600 font-semibold">Super Admin Permission (Authorized Edit)</p>
              </div>
            </div>

            {editNotice && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs font-semibold ${
                  editNotice.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {editNotice.message}
              </div>
            )}

            <form onSubmit={handleSaveEditStockOut} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reason</label>
                  <select
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value as StockOutReason)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Damaged Product">Damaged Product</option>
                    <option value="Internal Use">Internal Use / Sampling</option>
                    <option value="Lost Product">Lost / Missing</option>
                    <option value="Authorized Adjustment">Authorized Adjustment</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Product</label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <span className="font-bold text-slate-900 block">{stockOutToEdit.items[0]?.productName}</span>
                  <span className="text-[10px] text-slate-400 font-mono">SKU: {stockOutToEdit.items[0]?.sku} • Branch: {stockOutToEdit.branchName}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity Deducted *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ref Document #</label>
                  <input
                    type="text"
                    value={editReferenceDoc}
                    onChange={(e) => setEditReferenceDoc(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks / Quality Notes</label>
                <textarea
                  rows={2}
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStockOutToEdit(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer flex items-center space-x-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Update Stock Out</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
