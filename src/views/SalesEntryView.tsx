import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { PaymentMethod, DiscountType, SaleTransaction, Product } from '../types';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Receipt,
  User,
  Phone,
  Sparkles,
  Apple,
  Flame,
  Search,
  X,
  PackageSearch,
  Tag,
} from 'lucide-react';
import {
  calculateSaleItemTotals,
  calculateSaleTotals,
  calculateDiscountAmount,
  formatCurrencyBDT,
  calculateDecantItemCost,
} from '../utils/stockCalculations';
import { InvoiceModal } from '../components/InvoiceModal';

interface SalesRow {
  productId: string;
  quantity: number;
  sellingPrice: number;
  isDecant?: boolean;
  decantVariantId?: string;
  decantVariantName?: string;
  decantMlAmount?: number;
}

export const SalesEntryView: React.FC = () => {
  const {
    products,
    branches,
    branchStocks,
    createSale,
    currentUser,
    canViewProfit,
    selectedCategoryName,
  } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];
  const [salesDate, setSalesDate] = useState(todayStr);
  const [branchId, setBranchId] = useState(
    currentUser.role === 'manager' && currentUser.branchId ? currentUser.branchId : branches[0]?.id || ''
  );
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [discountType, setDiscountType] = useState<DiscountType>('fixed');
  const [discountValue, setDiscountValue] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  // POS Category filter (for quick catalog carousel)
  const [posCategory, setPosCategory] = useState<string>(selectedCategoryName || 'all');
  const [catalogSearch, setCatalogSearch] = useState('');

  // ── Bill rows: starts EMPTY ──
  const [rows, setRows] = useState<SalesRow[]>([]);

  const [errorMessage, setErrorMessage] = useState('');
  const [completedSale, setCompletedSale] = useState<SaleTransaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Add-Item Modal state ──
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [addItemCategory, setAddItemCategory] = useState<string>('all');
  const [addItemSearch, setAddItemSearch] = useState('');

  // Available stock lookup
  const getAvailableStock = (prodId: string) => {
    return (
      branchStocks.find((s) => s.branchId === branchId && s.productId === prodId)?.currentStock || 0
    );
  };

  const getOpenBottleMl = (prodId: string) => {
    return (
      branchStocks.find((s) => s.branchId === branchId && s.productId === prodId)?.openBottleMlRemaining || 0
    );
  };

  // Filter products for quick catalog carousel
  const filteredCatalogProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.status === 'inactive') return false;
      if (posCategory !== 'all' && p.categoryName !== posCategory) return false;
      if (catalogSearch.trim()) {
        const q = catalogSearch.toLowerCase();
        const matches =
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [products, posCategory, catalogSearch]);

  // Filter products for the Add-Item Modal
  const filteredModalProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.status === 'inactive') return false;
      if (addItemCategory !== 'all' && p.categoryName !== addItemCategory) return false;
      if (addItemSearch.trim()) {
        const q = addItemSearch.toLowerCase();
        const matches =
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [products, addItemCategory, addItemSearch]);

  const handleProductChange = (index: number, newProductId: string) => {
    const prod = products.find((p) => p.id === newProductId);
    const updated = [...rows];
    updated[index] = {
      ...updated[index],
      productId: newProductId,
      sellingPrice: prod ? prod.sellingPrice : 0,
      isDecant: false,
      decantVariantId: undefined,
      decantVariantName: undefined,
      decantMlAmount: undefined,
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
    updated[index].sellingPrice = price;
    setRows(updated);
  };

  const handleToggleDecant = (index: number) => {
    const updated = [...rows];
    const row = updated[index];
    const willBeDecant = !row.isDecant;
    updated[index] = {
      ...row,
      isDecant: willBeDecant,
      quantity: 1,
      decantMlAmount: willBeDecant ? (row.decantMlAmount || 10) : undefined,
      decantVariantName: willBeDecant ? (row.decantMlAmount ? `${row.decantMlAmount}ml` : '10ml') : undefined,
    };
    setRows(updated);
  };

  const handleDecantMlChange = (index: number, mlStr: string) => {
    const ml = Math.max(0, parseFloat(mlStr) || 0);
    const updated = [...rows];
    updated[index] = {
      ...updated[index],
      decantMlAmount: ml || undefined,
      decantVariantName: ml ? `${ml}ml` : 'Decant',
    };
    setRows(updated);
  };

  // Add a specific product — used by both carousel and modal
  const handleQuickAddProduct = (prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;

    // If product is already in bill rows (non-decant), increment quantity
    const existingIndex = rows.findIndex((r) => r.productId === prodId && !r.isDecant);
    if (existingIndex >= 0) {
      const updated = [...rows];
      updated[existingIndex].quantity += 1;
      setRows(updated);
      return;
    }

    // Otherwise append new row
    setRows((prev) => [
      ...prev,
      {
        productId: prod.id,
        quantity: 1,
        sellingPrice: prod.sellingPrice,
      },
    ]);
  };

  const removeRow = (index: number) => {
    if (rows.length > 0) {
      setRows((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Open the Add-Item modal
  const openAddItemModal = () => {
    setAddItemSearch('');
    setAddItemCategory('all');
    setShowAddItemModal(true);
  };

  // Handle product selection from modal
  const handleModalProductSelect = (prodId: string) => {
    handleQuickAddProduct(prodId);
    setShowAddItemModal(false);
  };

  // Calculate live line items
  const calculatedItems = rows.map((r) => {
    const prod = products.find((p) => p.id === r.productId);
    let purchaseCost = prod ? prod.purchasePrice : 0;

    if (r.isDecant && r.decantMlAmount) {
      const capacity = prod?.bottleCapacityMl || prod?.decantConfig?.bottleCapacityMl || 100;
      purchaseCost = calculateDecantItemCost(prod?.purchasePrice || 0, capacity, r.decantMlAmount);
    }

    const totals = calculateSaleItemTotals({
      quantity: r.quantity,
      purchaseCost,
      sellingPrice: r.sellingPrice,
    });

    const stock = branchStocks.find((s) => s.branchId === branchId && s.productId === r.productId);
    const availableBottles = stock ? stock.currentStock : 0;
    const openBottleMl = stock?.openBottleMlRemaining || 0;

    return {
      ...r,
      purchaseCost,
      productName: prod?.name || 'Product',
      sku: prod?.sku || 'SKU',
      categoryName: prod?.categoryName || 'Cosmetic Products',
      availableBottles,
      openBottleMl,
      decantConfig: prod?.decantConfig,
      ...totals,
    };
  });

  const rawSubtotal = calculatedItems.reduce((sum, ci) => sum + ci.totalSales, 0);
  const numericDiscountVal = typeof discountValue === 'number' ? Math.max(0, discountValue) : 0;
  const calculatedDiscountAmount = calculateDiscountAmount(rawSubtotal, discountType, numericDiscountVal);

  const grandTotals = calculateSaleTotals(
    calculatedItems.map((ci) => ({
      quantity: ci.quantity,
      purchaseCost: ci.purchaseCost,
      sellingPrice: ci.sellingPrice,
    })),
    calculatedDiscountAmount
  );

  const totalQuantity = rows.reduce((sum, r) => sum + r.quantity, 0);

  const handleCompleteSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage('');

    if (!branchId) {
      setErrorMessage('Please select a sales branch.');
      return;
    }

    if (!paymentMethod) {
      setErrorMessage('পেমেন্ট মেথড নির্বাচন করা হয়নি! বিল তৈরি করার জন্য অবশ্যই পেমেন্ট মেথড সিলেক্ট করতে হবে।');
      return;
    }

    if (rows.length === 0) {
      setErrorMessage('Please add at least one item to the bill before completing the sale.');
      return;
    }

    // Validate stock
    for (const item of calculatedItems) {
      if (item.isDecant && item.decantMlAmount) {
        const prod = products.find((p) => p.id === item.productId);
        const capacity = prod?.bottleCapacityMl || prod?.decantConfig?.bottleCapacityMl || 100;
        const totalMlNeeded = item.decantMlAmount * item.quantity;
        const totalAvailableMl = (item.openBottleMl || 0) + (item.availableBottles * capacity);
        if (totalMlNeeded > totalAvailableMl) {
          setErrorMessage(
            `Cannot sell ${totalMlNeeded} ml of "${item.productName}". Only ${totalAvailableMl} ml available (open + sealed) in this branch.`
          );
          return;
        }
      } else {
        if (item.quantity > item.availableBottles) {
          setErrorMessage(
            `Cannot sell ${item.quantity} units of "${item.productName}". Only ${item.availableBottles} available in this branch.`
          );
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const res = createSale({
        date: salesDate,
        branchId,
        customerName,
        customerPhone,
        paymentMethod: paymentMethod as PaymentMethod,
        discountType: discountValue !== '' && Number(discountValue) > 0 ? discountType : undefined,
        discountValue: discountValue !== '' && Number(discountValue) > 0 ? Number(discountValue) : undefined,
        notes,
        items: rows.map((r) => ({
          productId: r.productId,
          quantity: r.quantity,
          sellingPrice: r.sellingPrice,
          isDecant: r.isDecant,
          decantVariantName: r.decantVariantName,
          decantMlAmount: r.decantMlAmount,
        })),
      });

      if (res.success && res.sale) {
        setCompletedSale(res.sale);
        setCustomerName('Walk-in Customer');
        setCustomerPhone('');
        setPaymentMethod('');
        setDiscountValue('');
        setDiscountType('fixed');
        setNotes('');
        // ── Reset to EMPTY after sale ──
        setRows([]);
      } else {
        setErrorMessage(res.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* POS Top Category Quick-Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-1 bg-slate-100/80 p-1 rounded-xl overflow-x-auto no-scrollbar w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setPosCategory('all')}
            className={`shrink-0 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              posCategory === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setPosCategory('Cosmetic Products')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-all ${
              posCategory === 'Cosmetic Products' ? 'bg-pink-600 text-white shadow-xs' : 'text-pink-700 hover:bg-pink-50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Cosmetics</span>
          </button>
          <button
            type="button"
            onClick={() => setPosCategory('Food Products')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-all ${
              posCategory === 'Food Products' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-800 hover:bg-amber-50'
            }`}
          >
            <Apple className="w-3.5 h-3.5" />
            <span>Foods</span>
          </button>
          <button
            type="button"
            onClick={() => setPosCategory('Perfume Products')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-all ${
              posCategory === 'Perfume Products' ? 'bg-purple-600 text-white shadow-xs' : 'text-purple-800 hover:bg-purple-50'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Perfumes</span>
          </button>
        </div>

        {/* Catalog search */}
        <div className="relative w-full sm:min-w-[240px] sm:w-auto">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2" />
          <input
            type="text"
            placeholder="Quick search product catalog..."
            value={catalogSearch}
            onChange={(e) => setCatalogSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* Main Billing Form Grid */}
      <form onSubmit={handleCompleteSale} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: Invoice Config & Bill Line Items (2 spans) */}
        <div className="xl:col-span-2 space-y-4">
          {/* Metadata Card */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center space-x-1.5">
              <span>1. Customer &amp; Branch Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sales Date *</label>
                <input
                  type="date"
                  required
                  value={salesDate}
                  onChange={(e) => setSalesDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Branch *</label>
                {currentUser.role === 'manager' ? (
                  <div className="px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-800 font-semibold truncate">
                    {currentUser.branchName}
                  </div>
                ) : (
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Payment Method <span className="text-rose-500 font-bold">*</span></span>
                  {!paymentMethod && (
                    <span className="text-[10px] text-amber-600 font-medium">বাধ্যতামূলক</span>
                  )}
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value as PaymentMethod);
                    if (errorMessage) setErrorMessage('');
                  }}
                  className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none bg-white font-medium transition-colors ${
                    !paymentMethod
                      ? 'border-amber-400 bg-amber-50/30 text-amber-900 ring-2 ring-amber-100'
                      : 'border-slate-200 text-slate-800'
                  }`}
                  required
                >
                  <option value="" disabled>-- পেমেন্ট মেথড সিলেক্ট করুন * --</option>
                  <option value="Cash">Cash (Till)</option>
                  <option value="bKash">bKash (Digital)</option>
                  <option value="Nagad">Nagad (Digital)</option>
                  <option value="Card">Credit/Debit Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
                {!paymentMethod && (
                  <p className="text-[10px] text-amber-600 mt-1 font-medium">
                    * বিল তৈরি করতে অবশ্যই পেমেন্ট মেথড সিলেক্ট করতে হবে
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Customer Name</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Walk-in Customer"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Customer Mobile</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 01712-XXXXXX"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Quick Item Picker Carousel */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
              Quick Add From {posCategory === 'all' ? 'All Divisions' : posCategory}
            </span>
            <div className="flex items-center space-x-2 overflow-x-auto pb-1">
              {filteredCatalogProducts.slice(0, 8).map((prod) => {
                const stock = getAvailableStock(prod.id);
                const openMl = getOpenBottleMl(prod.id);
                const isPerfume = prod.categoryName === 'Perfume Products';
                const isOutOfStock = isPerfume ? stock <= 0 && openMl <= 0 : stock <= 0;

                return (
                  <button
                    key={prod.id}
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => handleQuickAddProduct(prod.id)}
                    className="shrink-0 p-2 bg-white hover:bg-slate-100/90 rounded-xl border border-slate-200 text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed group shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="text-[11px] font-bold text-slate-800 truncate max-w-[130px] group-hover:text-emerald-700">
                        {prod.name}
                      </div>
                      {isPerfume && (
                        <span className="text-[9px] bg-indigo-100 text-indigo-700 font-bold px-1 rounded">
                          🧴 Perfume
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 space-x-2">
                      <span className="font-mono font-bold text-slate-900">{formatCurrencyBDT(prod.sellingPrice)}</span>
                      <span className={`px-1 py-0.2 rounded font-semibold ${!isOutOfStock ? 'text-emerald-700 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                        {isPerfume ? (openMl > 0 ? `${openMl}ml open` : `${stock} btl`) : `${stock} left`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sold Items Table Card */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-1.5">
                <span>2. Bill Line Items</span>
                {rows.length > 0 && (
                  <span className="ml-1.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {rows.length}
                  </span>
                )}
              </h3>
              <button
                type="button"
                onClick={openAddItemModal}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors hover:bg-emerald-100"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-3">
              {/* Empty state */}
              {rows.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <PackageSearch className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm font-semibold text-slate-500">No items added yet</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Click <span className="font-bold text-emerald-600">+ Add Item</span> above or use the Quick Add strip to begin billing.
                  </p>
                </div>
              )}

              {calculatedItems.map((row, idx) => {
                const prodObj = products.find((p) => p.id === row.productId);
                const pkgSize = prodObj?.packageSize || prodObj?.bottleCapacityMl || prodObj?.decantConfig?.bottleCapacityMl || 100;
                const pkgUnit = prodObj?.packageUnit || (prodObj?.categoryName === 'Perfume Products' ? 'ml' : 'g');
                const totalMlNeeded = (row.decantMlAmount || 0) * row.quantity;
                const totalAvailableMl = (row.openBottleMl || 0) + (row.availableBottles * pkgSize);
                const isExceeding = row.isDecant && row.decantMlAmount
                  ? totalMlNeeded > totalAvailableMl
                  : row.quantity > row.availableBottles;

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border transition-all ${
                      isExceeding
                        ? 'border-rose-300 bg-rose-50/40'
                        : 'border-slate-200 bg-slate-50/40 hover:border-slate-300'
                    }`}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                      {/* Product Selector */}
                      <div className="sm:col-span-5">
                        <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">
                          Product ({idx + 1})
                        </label>
                        {row.isDecant ? (
                          <div className="p-2 bg-white rounded-lg border border-indigo-200">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 text-xs truncate max-w-[160px]">{row.productName}</span>
                              <button
                                type="button"
                                onClick={() => handleToggleDecant(idx)}
                                className="px-1.5 py-0.5 text-[10px] font-bold rounded border bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700 transition-colors"
                                title="Click to switch back to normal full pack/bottle sale"
                              >
                                🧴 Loose/Decant ✕
                              </button>
                            </div>
                            <div className="mt-1 text-[10px] text-indigo-700">
                              Selling loose/fractional from {pkgSize} {pkgUnit} pack. Enter {pkgUnit} amount and price manually.
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <select
                              value={row.productId}
                              onChange={(e) => handleProductChange(idx, e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none bg-white font-medium"
                            >
                              {products.map((p) => {
                                const stock = getAvailableStock(p.id);
                                const size = p.packageSize || p.bottleCapacityMl || p.decantConfig?.bottleCapacityMl;
                                const unit = p.packageUnit || (p.categoryName === 'Perfume Products' ? 'ml' : 'g');
                                return (
                                  <option key={p.id} value={p.id} disabled={stock <= 0 || p.status === 'inactive'}>
                                    [{p.categoryName.replace(' Products', '')}] {p.name} ({p.sku}){size ? ` - ${size}${unit}` : ''} — Stock: {stock}
                                  </option>
                                );
                              })}
                            </select>
                            {/* Allow Fractional / Loose / Decant Sale for products with package size */}
                            {(() => {
                              const prod = products.find((p) => p.id === row.productId);
                              const size = prod?.packageSize || prod?.bottleCapacityMl || prod?.decantConfig?.bottleCapacityMl;
                              const unit = prod?.packageUnit || (prod?.categoryName === 'Perfume Products' ? 'ml' : 'g');
                              if (size || prod?.categoryName === 'Perfume Products' || prod?.categoryName === 'Food Products') {
                                return (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleDecant(idx)}
                                    className="px-2 py-0.5 text-[10px] font-bold rounded-lg border bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50 transition-all flex items-center space-x-1"
                                  >
                                    <span>⚖️ Switch to Loose / ভেঙে বিক্রি ({unit})</span>
                                  </button>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        )}
                        <div className="flex items-center space-x-2 text-[10px] mt-1 text-slate-500">
                          {row.isDecant ? (
                            <span>
                              Open loose stock: <strong className="text-indigo-700">{row.openBottleMl} {pkgUnit}</strong> • Sealed: <strong className="text-emerald-700">{row.availableBottles} pack</strong>
                            </span>
                          ) : (
                            <span>
                              Available:{' '}
                              <strong className={row.availableBottles > 0 ? 'text-emerald-700' : 'text-rose-600'}>
                                {row.availableBottles} units
                              </strong>
                            </span>
                          )}
                          {canViewProfit && (
                            <>
                              <span>•</span>
                              <span>Unit Cost: {formatCurrencyBDT(row.purchaseCost)}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Quantity / ML Amount */}
                      <div className="sm:col-span-2">
                        {row.isDecant ? (
                          <>
                            <label className="text-[10px] text-indigo-700 font-bold block mb-0.5">Sold Amount ({pkgUnit}) *</label>
                            <input
                              type="number"
                              min="0.1"
                              step="0.1"
                              placeholder={`e.g. 10 ${pkgUnit}`}
                              value={row.decantMlAmount || ''}
                              onChange={(e) => handleDecantMlChange(idx, e.target.value)}
                              className={`w-full px-2 py-1.5 text-xs border rounded-lg text-center font-bold focus:outline-none ${
                                isExceeding
                                  ? 'border-rose-400 text-rose-700 bg-rose-50'
                                  : 'border-indigo-300 text-indigo-900 bg-indigo-50/40'
                              }`}
                            />
                          </>
                        ) : (
                          <>
                            <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Quantity</label>
                            <input
                              type="number"
                              min="1"
                              value={row.quantity}
                              onChange={(e) => handleQtyChange(idx, e.target.value)}
                              className={`w-full px-2 py-1.5 text-xs border rounded-lg text-center font-bold focus:outline-none ${
                                isExceeding
                                  ? 'border-rose-400 text-rose-700 bg-rose-50'
                                  : 'border-slate-300 text-slate-900'
                              }`}
                            />
                          </>
                        )}
                      </div>

                      {/* Selling Price */}
                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">
                          {row.isDecant ? 'Decant Price (Tk) *' : 'Price/Unit (Tk)'}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={row.isDecant ? 'Enter Tk' : '0.00'}
                          value={row.sellingPrice}
                          onChange={(e) => handlePriceChange(idx, e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg text-right font-bold focus:outline-none"
                        />
                      </div>

                      {/* Line Total & Profit (masked for Manager) */}
                      <div className="sm:col-span-2 text-right">
                        <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Line Total</label>
                        <div className="text-xs font-bold text-slate-900 font-mono">
                          {formatCurrencyBDT(row.totalSales)}
                        </div>
                        {canViewProfit && (
                          <div className="text-[10px] text-emerald-600 font-semibold font-mono">
                            +{formatCurrencyBDT(row.grossProfit)}
                          </div>
                        )}
                      </div>

                      {/* Delete */}
                      <div className="sm:col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Invoice Calculation & Profit (Strictly Masked for Manager) */}
        <div className="xl:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 sm:sticky sm:top-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide pb-3 border-b border-slate-100 flex items-center space-x-1.5">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>Bill Summary</span>
            </h3>

            <div className="space-y-3 mt-4 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Unique Items:</span>
                <span className="font-semibold text-slate-900">{rows.length} item(s)</span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>Total Quantity:</span>
                <span className="font-semibold text-slate-900">{totalQuantity} units</span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>Subtotal (মোট মূল্য):</span>
                <span className="font-semibold text-slate-900 font-mono">{formatCurrencyBDT(grandTotals.subtotal)}</span>
              </div>

              {/* Discount Section */}
              <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                    <Tag className="w-3.5 h-3.5 text-indigo-600" />
                    <span>ডিসকাউন্ট (Discount)</span>
                  </label>
                  {calculatedDiscountAmount > 0 && (
                    <span className="text-xs font-bold text-rose-600 font-mono">
                      -{formatCurrencyBDT(calculatedDiscountAmount)}
                    </span>
                  )}
                </div>

                {/* Option Tabs: Cash (Tk) vs Percentage (%) */}
                <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-200/70 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setDiscountType('fixed')}
                    className={`py-1 text-center text-xs font-semibold rounded-md transition-all ${
                      discountType === 'fixed'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Cash (৳)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('percentage')}
                    className={`py-1 text-center text-xs font-semibold rounded-md transition-all ${
                      discountType === 'percentage'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Percentage (%)
                  </button>
                </div>

                {/* Discount Input */}
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max={discountType === 'percentage' ? 100 : grandTotals.subtotal}
                    step={discountType === 'percentage' ? '0.1' : '1'}
                    placeholder={discountType === 'percentage' ? 'e.g. 5% or 10%' : 'e.g. 50 or 100 Tk'}
                    value={discountValue}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                      setDiscountValue(val === '' || isNaN(val) ? '' : Math.max(0, val));
                    }}
                    className="w-full pl-3 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    {discountType === 'percentage' ? '%' : '৳'}
                  </span>
                </div>

                {discountValue !== '' && Number(discountValue) > 0 && (
                  <div className="flex justify-between items-center text-[11px] text-slate-500 pt-0.5">
                    <span>প্রযোজ্য ছাড়:</span>
                    <span className="font-semibold text-rose-600">
                      {discountType === 'percentage'
                        ? `${discountValue}% = ${formatCurrencyBDT(calculatedDiscountAmount)}`
                        : `${formatCurrencyBDT(calculatedDiscountAmount)}`}
                    </span>
                  </div>
                )}
              </div>

              {canViewProfit && (
                <div className="flex justify-between items-center text-slate-600 pt-1">
                  <span>Cost of Goods Sold (COGS):</span>
                  <span className="font-medium text-slate-700 font-mono">{formatCurrencyBDT(grandTotals.totalCost)}</span>
                </div>
              )}

              <div className="h-px bg-slate-100 my-2"></div>

              <div className="flex justify-between items-center text-slate-800 text-sm font-bold">
                <span>Net Payable Amount:</span>
                <span className="text-emerald-700 text-base font-mono">{formatCurrencyBDT(grandTotals.totalSales)}</span>
              </div>

              {canViewProfit && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-emerald-900">Gross Profit on Sale:</span>
                    <span className="font-extrabold text-emerald-700 text-sm font-mono">
                      +{formatCurrencyBDT(grandTotals.grossProfit)}
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-700/80 mt-1">
                    Historical profit snapshot stored in transaction.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Gift packaging requested / discount applied..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || rows.length === 0 || !paymentMethod}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center space-x-2 mt-4 cursor-pointer disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'Processing Transaction...'
                    : rows.length === 0
                    ? 'Add Items to Complete Sale'
                    : !paymentMethod
                    ? 'Select Payment Method to Complete Sale'
                    : 'Complete Sale & Generate Bill'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Invoice Modal after Completion */}
      {completedSale && (
        <InvoiceModal
          sale={completedSale}
          onClose={() => setCompletedSale(null)}
        />
      )}

      {/* ══════════════════════════════════════════════
          Add Item Modal
      ══════════════════════════════════════════════ */}
      {showAddItemModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowAddItemModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">Select Product to Add</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddItemModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Category Tabs */}
            <div className="px-5 pt-4 pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-1.5 bg-slate-100/80 p-1 rounded-xl w-fit">
                <button
                  type="button"
                  onClick={() => setAddItemCategory('all')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    addItemCategory === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Categories
                </button>
                <button
                  type="button"
                  onClick={() => setAddItemCategory('Cosmetic Products')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-all ${
                    addItemCategory === 'Cosmetic Products'
                      ? 'bg-pink-600 text-white shadow-xs'
                      : 'text-pink-700 hover:bg-pink-50'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Cosmetics</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAddItemCategory('Food Products')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-all ${
                    addItemCategory === 'Food Products'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-amber-800 hover:bg-amber-50'
                  }`}
                >
                  <Apple className="w-3.5 h-3.5" />
                  <span>Foods</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAddItemCategory('Perfume Products')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-all ${
                    addItemCategory === 'Perfume Products'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-purple-800 hover:bg-purple-50'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Perfumes</span>
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="px-5 py-3 border-b border-slate-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by name, SKU or barcode..."
                  value={addItemSearch}
                  onChange={(e) => setAddItemSearch(e.target.value)}
                  autoFocus
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
            </div>

            {/* Product List */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {filteredModalProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <PackageSearch className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-xs font-medium">No products found</p>
                  <p className="text-[11px] mt-1">Try a different category or search term.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredModalProducts.map((prod) => {
                    const stock = getAvailableStock(prod.id);
                    const openMl = getOpenBottleMl(prod.id);
                    const isPerfumeP = prod.categoryName === 'Perfume Products';
                    const alreadyInBill = rows.some((r) => r.productId === prod.id);
                    const outOfStock = isPerfumeP ? stock <= 0 && openMl <= 0 : stock <= 0;

                    const categoryColor =
                      prod.categoryName === 'Cosmetic Products'
                        ? 'bg-pink-50 text-pink-700 border-pink-200'
                        : prod.categoryName === 'Food Products'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : prod.categoryName === 'Perfume Products'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200';

                    return (
                      <button
                        key={prod.id}
                        type="button"
                        disabled={outOfStock}
                        onClick={() => handleModalProductSelect(prod.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all ${
                          outOfStock
                            ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200'
                            : alreadyInBill
                            ? 'border-emerald-300 bg-emerald-50/60 hover:bg-emerald-50'
                            : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{prod.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{prod.sku}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-extrabold text-slate-900 font-mono">
                              {formatCurrencyBDT(prod.sellingPrice)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-1">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${categoryColor}`}>
                              {prod.categoryName.replace(' Products', '')}
                            </span>
                            {isPerfumeP && (
                              <span className="text-[9px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded">
                                🧴 Perfume
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-1.5">
                            {alreadyInBill && !outOfStock && (
                              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-1.5 py-0.5 rounded-md">
                                In Bill
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                                outOfStock
                                  ? 'bg-rose-100 text-rose-600'
                                  : stock <= 5
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {outOfStock ? 'Out of Stock' : isPerfumeP ? (openMl > 0 ? `${openMl}ml open (${stock} btl)` : `${stock} btl`) : `${stock} left`}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <p className="text-[11px] text-slate-500">
                {filteredModalProducts.length} product{filteredModalProducts.length !== 1 ? 's' : ''} shown
                {addItemCategory !== 'all' ? ` · ${addItemCategory}` : ''}
              </p>
              <button
                type="button"
                onClick={() => setShowAddItemModal(false)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
