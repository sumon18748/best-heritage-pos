import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Wallet,
  Plus,
  Coins,
  Building,
  TrendingDown,
  FileSpreadsheet,
  FileText,
  Search,
  Calendar,
  Receipt,
  CheckCircle,
  Edit2,
  Trash2,
  ShieldCheck,
  X,
  AlertTriangle,
} from 'lucide-react';
import { ExpenseCategory, ExpensePaymentSource, OperatingExpense } from '../types';
import { formatCurrencyBDT, calculateCashBankBalances, calculateConsolidatedCashMetrics, BranchCashMetrics } from '../utils/stockCalculations';
import { exportReportToExcel } from '../utils/excelExport';
import { exportReportToPdf } from '../utils/pdfExport';
import { getBangladeshTodayDateString } from '../utils/dateUtils';

export const CashBankExpensesView: React.FC = () => {
  const {
    currentUser,
    branches,
    sales,
    expenses,
    expenseCategories,
    openingBalances,
    addExpense,
    updateExpense,
    deleteExpense,
    recordOpeningBalance,
    selectedBranchId,
  } = useApp();

  const isSuperAdmin = currentUser.role === 'super_admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit Expense State (Super Admin Only)
  const [editingExpense, setEditingExpense] = useState<OperatingExpense | null>(null);
  const [editForm, setEditForm] = useState({
    date: '',
    branchId: '',
    category: 'Packaging & Bags' as ExpenseCategory,
    amount: '',
    paymentSource: 'Physical Cash' as ExpensePaymentSource,
    description: '',
    vendorName: '',
  });

  // Delete Expense State (Super Admin Only)
  const [deletingExpense, setDeletingExpense] = useState<OperatingExpense | null>(null);

  // Opening Balance Modal State (Auto or Manual Float)
  const [showOpeningBalanceModal, setShowOpeningBalanceModal] = useState(false);
  const [obBranchId, setObBranchId] = useState('');
  const [obDate, setObDate] = useState(getBangladeshTodayDateString());
  const [obCashAmount, setObCashAmount] = useState('');
  const [obBankAmount, setObBankAmount] = useState('');
  const [obNotes, setObNotes] = useState('');

  // Expense Form
  const [expenseForm, setExpenseForm] = useState({
    date: getBangladeshTodayDateString(),
    branchId: currentUser.role === 'manager' && currentUser.branchId ? currentUser.branchId : (branches[0]?.id || ''),
    category: 'Packaging & Bags' as ExpenseCategory,
    amount: '',
    paymentSource: 'Physical Cash' as ExpensePaymentSource,
    description: '',
    vendorName: '',
  });

  // Target branch for financial calculations
  const targetBranchId = currentUser.role === 'manager' && currentUser.branchId
    ? currentUser.branchId
    : selectedBranchId;

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (currentUser.role === 'manager' && currentUser.branchId) {
        if (e.branchId !== currentUser.branchId) return false;
      } else if (selectedBranchId !== 'all') {
        if (e.branchId !== selectedBranchId) return false;
      }

      if (selectedCategory !== 'all' && e.category !== selectedCategory) return false;
      if (selectedSource !== 'all' && e.paymentSource !== selectedSource) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          e.voucherNo.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          (e.vendorName && e.vendorName.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [expenses, currentUser, selectedBranchId, selectedCategory, selectedSource, searchQuery]);

  // Financial Balances calculation (Auto-roll over from yesterday's closing cash if not manually set)
  const relevantBranches = targetBranchId === 'all'
    ? branches.map((b) => b.id)
    : [targetBranchId];

  const todayStr = getBangladeshTodayDateString();

  const cashMetrics = useMemo(() => {
    return calculateConsolidatedCashMetrics({
      branchIds: relevantBranches,
      branches,
      targetDate: todayStr,
      openingBalances,
      sales,
      expenses,
    });
  }, [relevantBranches, branches, todayStr, openingBalances, sales, expenses]);

  const balances = useMemo(() => {
    return {
      openingCash: cashMetrics.consolidated.openingCash,
      openingBank: cashMetrics.consolidated.openingBank,
      cashSales: cashMetrics.consolidated.todayCashSales,
      bankSales: cashMetrics.consolidated.todayBankSales,
      cashExpenses: cashMetrics.consolidated.todayCashExpenses,
      bankExpenses: cashMetrics.consolidated.todayBankExpenses,
      physicalCash: cashMetrics.consolidated.currentPhysicalCash,
      bankBalance: cashMetrics.consolidated.currentBankBalance,
      totalExpenses: cashMetrics.consolidated.todayCashExpenses + cashMetrics.consolidated.todayBankExpenses,
      byBranch: cashMetrics.byBranch,
      isAutoFromPreviousDay: cashMetrics.byBranch.some((b) => b.isAutoFromPreviousDay),
    };
  }, [cashMetrics]);

  const handleOpenFloatModal = (branchId?: string) => {
    const defaultBranch =
      branchId ||
      (currentUser.role === 'manager' && currentUser.branchId ? currentUser.branchId : branches[0]?.id || '');
    setObBranchId(defaultBranch);
    setObDate(getBangladeshTodayDateString());

    const existingMetric = cashMetrics.byBranch.find((b) => b.branchId === defaultBranch);
    setObCashAmount(existingMetric ? existingMetric.openingCash.toString() : '0');
    setObBankAmount(existingMetric ? existingMetric.openingBank.toString() : '0');
    setObNotes('');
    setShowOpeningBalanceModal(true);
  };

  const handleSaveOpeningBalance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!obBranchId) {
      setNotification({ type: 'error', message: 'Please select a branch.' });
      return;
    }
    const cashVal = parseFloat(obCashAmount) || 0;
    const bankVal = parseFloat(obBankAmount) || 0;

    const res = recordOpeningBalance({
      branchId: obBranchId,
      date: obDate,
      openingCashAmount: cashVal,
      openingBankAmount: bankVal,
      notes: obNotes || 'Morning float update',
    });

    if (res.success) {
      setNotification({ type: 'success', message: res.message });
      setShowOpeningBalanceModal(false);
    } else {
      setNotification({ type: 'error', message: res.message });
    }
  };

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(expenseForm.amount);
    if (!amountNum || amountNum <= 0) {
      setNotification({ type: 'error', message: 'Please enter a valid expense amount.' });
      return;
    }

    const res = addExpense({
      date: expenseForm.date,
      branchId: expenseForm.branchId,
      category: expenseForm.category,
      amount: amountNum,
      paymentSource: expenseForm.paymentSource,
      description: expenseForm.description,
      vendorName: expenseForm.vendorName,
    });

    if (res.success) {
      setNotification({ type: 'success', message: res.message });
      setShowExpenseModal(false);
      setExpenseForm({
        date: getBangladeshTodayDateString(),
        branchId: currentUser.role === 'manager' && currentUser.branchId ? currentUser.branchId : (branches[0]?.id || ''),
        category: 'Packaging & Bags',
        amount: '',
        paymentSource: 'Physical Cash',
        description: '',
        vendorName: '',
      });
    } else {
      setNotification({ type: 'error', message: res.message });
    }
  };

  // Super Admin Exclusive: Open Edit Modal
  const handleOpenEdit = (exp: OperatingExpense) => {
    setEditingExpense(exp);
    setEditForm({
      date: exp.date,
      branchId: exp.branchId,
      category: exp.category,
      amount: exp.amount.toString(),
      paymentSource: exp.paymentSource,
      description: exp.description,
      vendorName: exp.vendorName || '',
    });
  };

  // Super Admin Exclusive: Save Edited Expense
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    const amountNum = parseFloat(editForm.amount);
    if (!amountNum || amountNum <= 0) {
      setNotification({ type: 'error', message: 'Valid expense amount is required.' });
      return;
    }
    const res = updateExpense(editingExpense.id, {
      date: editForm.date,
      branchId: editForm.branchId,
      category: editForm.category,
      amount: amountNum,
      paymentSource: editForm.paymentSource,
      description: editForm.description.trim(),
      vendorName: editForm.vendorName.trim(),
    });
    if (res.success) {
      setNotification({ type: 'success', message: res.message });
      setEditingExpense(null);
    } else {
      setNotification({ type: 'error', message: res.message });
    }
  };

  // Super Admin Exclusive: Confirm Delete Expense
  const handleConfirmDelete = () => {
    if (!deletingExpense) return;
    const res = deleteExpense(deletingExpense.id);
    if (res.success) {
      setNotification({ type: 'success', message: res.message });
      setDeletingExpense(null);
    } else {
      setNotification({ type: 'error', message: res.message });
    }
  };

  // Dual Export Handlers
  const handleExportExcel = () => {
    const headers = ['Voucher No', 'Date', 'Branch', 'Category', 'Description', 'Vendor', 'Source', 'Amount'];
    const dataRows = filteredExpenses.map((e) => [
      e.voucherNo,
      e.date,
      e.branchName,
      e.category,
      e.description,
      e.vendorName || '—',
      e.paymentSource,
      e.amount,
    ]);

    exportReportToExcel({
      reportTitle: 'Daily Cash & Operating Expenses Report',
      branchName: targetBranchId === 'all' ? 'All Branches' : branches.find((b) => b.id === targetBranchId)?.name || 'Branch',
      generatedBy: currentUser.name,
      headers,
      dataRows,
      summaryStats: [
        { label: 'Physical Cash Balance', value: formatCurrencyBDT(balances.physicalCash) },
        { label: 'Bank Balance', value: formatCurrencyBDT(balances.bankBalance) },
        { label: 'Total Operating Expenses', value: formatCurrencyBDT(balances.totalExpenses) },
      ],
    });
  };

  const handleExportPdf = () => {
    const headers = ['Voucher No', 'Date', 'Branch', 'Category', 'Description', 'Source', 'Amount'];
    const dataRows = filteredExpenses.map((e) => [
      e.voucherNo,
      e.date,
      e.branchName,
      e.category,
      e.description,
      e.paymentSource,
      formatCurrencyBDT(e.amount),
    ]);

    exportReportToPdf({
      reportTitle: 'Daily Cash & Operating Expenses Report',
      branchName: targetBranchId === 'all' ? 'All Branches' : branches.find((b) => b.id === targetBranchId)?.name || 'Branch',
      generatedBy: currentUser.name,
      headers,
      dataRows,
      summaryStats: [
        { label: 'Physical Cash in Till', value: formatCurrencyBDT(balances.physicalCash) },
        { label: 'Bank Balance', value: formatCurrencyBDT(balances.bankBalance) },
        { label: 'Total Operating Expenses', value: formatCurrencyBDT(balances.totalExpenses) },
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Cash, Bank & Operating Expenses</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Financial Reconciliation
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Separate physical till cash from bank balances, maintain daily branch opening floats, and log authorized operating expenses.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center space-x-1.5 shadow-2xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleExportPdf}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center space-x-1.5 shadow-2xs transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            <span>PDF (.pdf)</span>
          </button>

          <button
            onClick={() => handleOpenFloatModal()}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Coins className="w-4 h-4 text-amber-600" />
            <span>Set / Adjust Float</span>
          </button>

          <button
            onClick={() => setShowExpenseModal(true)}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
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

      {/* Financial Health KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Physical Cash */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Physical Cash in Till</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 tracking-tight font-mono">
            {formatCurrencyBDT(balances.physicalCash)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Opening Cash: <span className="font-semibold text-slate-800 font-mono">{formatCurrencyBDT(balances.openingCash)}</span>
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${balances.isAutoFromPreviousDay ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
              {balances.isAutoFromPreviousDay ? '🔄 Auto Roll-over' : '✓ Manual Float'}
            </span>
          </div>
        </div>

        {/* Bank Balance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bank & Digital Balance</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 tracking-tight font-mono">
            {formatCurrencyBDT(balances.bankBalance)}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Opening Bank: <span className="font-semibold text-slate-800 font-mono">{formatCurrencyBDT(balances.openingBank)}</span>
          </div>
        </div>

        {/* Total Operating Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Expenses Logged</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-rose-600 tracking-tight font-mono">
            {formatCurrencyBDT(balances.totalExpenses)}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Cash: {formatCurrencyBDT(balances.cashExpenses)} | Bank: {formatCurrencyBDT(balances.bankExpenses)}
          </div>
        </div>

        {/* Total Collections */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Sales Inflow</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 tracking-tight font-mono">
            {formatCurrencyBDT(balances.cashSales + balances.bankSales)}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Cash: {formatCurrencyBDT(balances.cashSales)} | Digital: {formatCurrencyBDT(balances.bankSales)}
          </div>
        </div>
      </div>

      {/* Super Admin: Branch Cash & Opening Float Summary Table (when All Branches selected) */}
      {targetBranchId === 'all' && balances.byBranch.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <span>🏢 Branch Opening & Till Cash Summary</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                The end-of-day closing cash for each branch automatically rolls over as the next day's Opening Float.
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              {balances.byBranch.length} Branches Consolidated
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">Branch Name</th>
                  <th className="py-2.5 px-3">Opening Float</th>
                  <th className="py-2.5 px-3">Today Cash Sales</th>
                  <th className="py-2.5 px-3">Today Cash Expenses</th>
                  <th className="py-2.5 px-3">Physical Cash (Till)</th>
                  <th className="py-2.5 px-3">Digital / Bank Balance</th>
                  <th className="py-2.5 px-3 text-center">Float Source</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {balances.byBranch.map((bm) => (
                  <tr key={bm.branchId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>{bm.branchName}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-amber-700">
                      {formatCurrencyBDT(bm.openingCash)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-emerald-700">
                      +{formatCurrencyBDT(bm.todayCashSales)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-rose-600">
                      -{formatCurrencyBDT(bm.todayCashExpenses)}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 bg-emerald-50/50">
                      {formatCurrencyBDT(bm.currentPhysicalCash)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-blue-700">
                      {formatCurrencyBDT(bm.currentBankBalance)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        bm.isAutoFromPreviousDay
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {bm.isAutoFromPreviousDay ? '🔄 Yesterday Closing (Auto)' : '✓ Manual Float'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleOpenFloatModal(bm.branchId)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                      >
                        Adjust Float
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manager or Single Branch View Notice */}
      {targetBranchId !== 'all' && (
        <div className="bg-amber-50/80 rounded-xl p-3.5 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-900">
          <div className="flex items-center space-x-2">
            <Coins className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Branch Opening Cash:</strong> Yesterday's closing cash has been automatically set as today's opening cash balance: <strong>{formatCurrencyBDT(balances.openingCash)}</strong>.
            </span>
          </div>
          <button
            onClick={() => handleOpenFloatModal(targetBranchId)}
            className="px-3 py-1 bg-white hover:bg-amber-100 text-amber-800 font-semibold rounded-lg border border-amber-300 shadow-2xs text-[11px] transition-colors cursor-pointer shrink-0"
          >
            Adjust Float
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search voucher, description, vendor..."
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
            <option value="all">All Expense Categories</option>
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          {/* Payment Source Filter */}
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">All Payment Sources</option>
            <option value="Physical Cash">Physical Cash</option>
            <option value="Bank Account">Bank Account</option>
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Voucher No</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Vendor</th>
                <th className="py-3 px-4 text-center">Payment Source</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Logged By</th>
                {isSuperAdmin && (
                  <th className="py-3 px-4 text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 10 : 9} className="py-12 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-xs">No operating expense vouchers found.</p>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">{exp.voucherNo}</td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{exp.date}</td>
                    <td className="py-3 px-4 font-medium text-slate-700">{exp.branchName}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-xs truncate">{exp.description}</td>
                    <td className="py-3 px-4 text-slate-500">{exp.vendorName || '—'}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          exp.paymentSource === 'Physical Cash'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {exp.paymentSource}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                      {formatCurrencyBDT(exp.amount)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 text-[11px]">{exp.recordedByName}</td>
                    {isSuperAdmin && (
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center space-x-1">
                          <button
                            onClick={() => handleOpenEdit(exp)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Edit Expense (Super Admin Exclusive)"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingExpense(exp)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Expense (Super Admin Exclusive)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold">Record Operating Expense</h3>
              </div>
              <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateExpense} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Expense Date</label>
                  <input
                    type="date"
                    required
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Branch</label>
                  <select
                    disabled={currentUser.role === 'manager' && !!currentUser.branchId}
                    value={expenseForm.branchId}
                    onChange={(e) => setExpenseForm({ ...expenseForm, branchId: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Expense Category</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as ExpenseCategory })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none"
                >
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Amount (Tk)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="00"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Payment Source</label>
                  <select
                    value={expenseForm.paymentSource}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paymentSource: e.target.value as ExpensePaymentSource })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none"
                  >
                    <option value="Physical Cash">Physical Cash (Till)</option>
                    <option value="Bank Account">Bank / POS Account</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Description / Memo</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Reason for expenditure..."
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Vendor / Payee Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Local Courier, Utility Board"
                  value={expenseForm.vendorName}
                  onChange={(e) => setExpenseForm({ ...expenseForm, vendorName: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm cursor-pointer"
                >
                  Save Expense Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Expense Modal (Super Admin Exclusive) */}
      {isSuperAdmin && editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold">Edit Expense Voucher ({editingExpense.voucherNo})</h3>
              </div>
              <button onClick={() => setEditingExpense(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Expense Date *</label>
                  <input
                    type="date"
                    required
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Branch *</label>
                  <select
                    value={editForm.branchId}
                    onChange={(e) => setEditForm({ ...editForm, branchId: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Expense Category *</label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value as ExpenseCategory })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Amount (Tk) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="00"
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Payment Channel *</label>
                  <select
                    value={editForm.paymentSource}
                    onChange={(e) => setEditForm({ ...editForm, paymentSource: e.target.value as ExpensePaymentSource })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Physical Cash">Physical Cash (Till)</option>
                    <option value="Bank Account">Bank / POS Account</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Description / Memo *</label>
                <textarea
                  rows={2}
                  required
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Vendor / Payee Name (Optional)</label>
                <input
                  type="text"
                  value={editForm.vendorName}
                  onChange={(e) => setEditForm({ ...editForm, vendorName: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm cursor-pointer"
                >
                  Update Expense Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Super Admin Exclusive) */}
      {isSuperAdmin && deletingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-rose-200 overflow-hidden">
            <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-rose-700">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm font-bold">Delete Expense Voucher</h3>
              </div>
              <button onClick={() => setDeletingExpense(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 text-xs space-y-3">
              <p className="text-slate-600 leading-relaxed">
                Are you sure you want to permanently delete expense voucher <strong className="text-slate-900">{deletingExpense.voucherNo}</strong>?
              </p>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-500">
                  <span>Branch:</span>
                  <span className="font-semibold text-slate-800">{deletingExpense.branchName}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Category:</span>
                  <span className="font-semibold text-slate-800">{deletingExpense.category}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Amount:</span>
                  <span className="font-bold text-rose-600 font-mono">{formatCurrencyBDT(deletingExpense.amount)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Payment Source:</span>
                  <span className="font-semibold text-slate-800">{deletingExpense.paymentSource}</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400">
                * Deleting this voucher will automatically reverse the deduction and update physical till or bank balance.
              </p>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setDeletingExpense(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm cursor-pointer flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirm Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Set / Adjust Opening Float Modal */}
      {showOpeningBalanceModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Coins className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold">Set Opening Cash Float</h3>
              </div>
              <button
                onClick={() => setShowOpeningBalanceModal(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOpeningBalance} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Branch *</label>
                {currentUser.role === 'manager' && currentUser.branchId ? (
                  <input
                    type="text"
                    disabled
                    value={branches.find((b) => b.id === obBranchId)?.name || currentUser.branchName || ''}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-100 text-slate-600 font-semibold cursor-not-allowed"
                  />
                ) : (
                  <select
                    value={obBranchId}
                    onChange={(e) => {
                      const bId = e.target.value;
                      setObBranchId(bId);
                      const m = cashMetrics.byBranch.find((b) => b.branchId === bId);
                      if (m) {
                        setObCashAmount(m.openingCash.toString());
                        setObBankAmount(m.openingBank.toString());
                      }
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                    required
                  >
                    <option value="">Select Branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={obDate}
                  onChange={(e) => setObDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cash in Drawer (Tk) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={obCashAmount}
                    onChange={(e) => setObCashAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-amber-700"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Morning physical till cash</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bank / Digital (Tk)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={obBankAmount}
                    onChange={(e) => setObBankAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-blue-700"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">bKash, bank starting float</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Additional morning till float or change"
                  value={obNotes}
                  onChange={(e) => setObNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowOpeningBalanceModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm transition-colors cursor-pointer flex items-center space-x-1"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Save Float</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
