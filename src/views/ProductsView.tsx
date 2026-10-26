import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Product, MainCategoryName } from '../types';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Building2,
  AlertTriangle,
  X,
  Check,
  Tag,
  DollarSign,
  ArrowDownToLine,
  ArrowUpFromLine,
  ShoppingCart,
  Trash2,
  Sparkles,
  Apple,
  Flame,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { formatCurrencyBDT, calculateStockAlertStatus } from '../utils/stockCalculations';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { exportReportToExcel } from '../utils/excelExport';
import { exportReportToPdf } from '../utils/pdfExport';

export const ProductsView: React.FC = () => {
  const {
    products,
    categories,
    branches,
    branchStocks,
    addProduct,
    updateProduct,
    checkProductDeletable,
    deleteProductSafe,
    currentUser,
    selectedBranchId,
    setActiveTab,
    canViewProfit,
    canAdd,
    canEdit,
    canDelete,
    selectedCategoryName,
    setSelectedCategoryName,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>(selectedCategoryName || 'all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewBranchStockProduct, setViewBranchStockProduct] = useState<Product | null>(null);

  // Safe delete modal state
  const [deleteModalProduct, setDeleteModalProduct] = useState<Product | null>(null);
  const [deleteCheckResult, setDeleteCheckResult] = useState<{ canDelete: boolean; hasHistory: boolean; reason?: string }>({
    canDelete: true,
    hasHistory: false,
  });

  // Form states
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formCategory, setFormCategory] = useState(categories[0]?.id || 'cat_cosmetics');
  const [formSubcategory, setFormSubcategory] = useState('');
  const [formPurchasePrice, setFormPurchasePrice] = useState('');
  const [formSellingPrice, setFormSellingPrice] = useState('');
  const [formOpeningStock, setFormOpeningStock] = useState('10');
  const [formMinAlertLevel, setFormMinAlertLevel] = useState('8');
  const [formUnit, setFormUnit] = useState('Pcs');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formPackageSize, setFormPackageSize] = useState('');
  const [formPackageUnit, setFormPackageUnit] = useState('ml');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory =
        activeCategoryTab === 'all' || p.categoryName === activeCategoryTab;

      const matchesStatus = selectedStatus === 'all' || p.status === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchTerm, activeCategoryTab, selectedStatus]);

  // Generate guaranteed unique SKU based on category and existing products
  const generateUniqueSku = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    const prefix = cat?.name === 'Food Products' ? 'BH-FOD' : cat?.name === 'Perfume Products' ? 'BH-PRF' : 'BH-COS';
    let nextNum = 1;
    const catProds = products.filter((p) => p.sku.startsWith(prefix));
    if (catProds.length > 0) {
      const numbers = catProds.map((p) => {
        const parts = p.sku.split('-');
        const lastPart = parts[parts.length - 1];
        return parseInt(lastPart) || 0;
      });
      nextNum = Math.max(...numbers, 0) + 1;
    }
    const formatted = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
    let candidate = `${prefix}-${formatted}`;
    let counter = nextNum;
    while (products.some((p) => p.sku.toLowerCase() === candidate.toLowerCase())) {
      counter++;
      candidate = `${prefix}-${counter < 10 ? `0${counter}` : counter}`;
    }
    return candidate;
  };

  const generateUniqueBarcode = () => {
    let candidate = '';
    do {
      candidate = `894${Math.floor(100000 + Math.random() * 900000)}`;
    } while (products.some((p) => p.barcode === candidate));
    return candidate;
  };

  const openAddModal = () => {
    const defaultCat = categories.find((c) => c.name === activeCategoryTab) || categories[0];
    const catId = defaultCat?.id || 'cat_cosmetics';

    setFormName('');
    setFormSku(generateUniqueSku(catId));
    setFormBarcode(generateUniqueBarcode());
    setFormCategory(catId);
    setFormSubcategory('');
    setFormPurchasePrice('');
    setFormSellingPrice('');
    setFormOpeningStock('10');
    setFormMinAlertLevel('8');
    setFormUnit('Pcs');
    setFormStatus('active');
    setFormPackageSize(defaultCat?.name === 'Perfume Products' ? '100' : defaultCat?.name === 'Food Products' ? '500' : '');
    setFormPackageUnit(defaultCat?.name === 'Perfume Products' ? 'ml' : defaultCat?.name === 'Food Products' ? 'g' : 'ml');
    setFormError('');
    setFormSuccess('');

    setIsAddModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormSku(p.sku);
    setFormBarcode(p.barcode || '');
    setFormCategory(p.categoryId);
    setFormSubcategory(p.subcategory || '');
    setFormPurchasePrice(p.purchasePrice.toString());
    setFormSellingPrice(p.sellingPrice.toString());
    setFormMinAlertLevel(p.minAlertLevel.toString());
    setFormUnit(p.unitOfMeasure || 'Pcs');
    setFormStatus(p.status);
    const pSize = p.packageSize || p.bottleCapacityMl || p.decantConfig?.bottleCapacityMl;
    setFormPackageSize(pSize ? pSize.toString() : '');
    setFormPackageUnit(p.packageUnit || (p.categoryName === 'Perfume Products' ? 'ml' : p.categoryName === 'Food Products' ? 'g' : 'ml'));
    setFormError('');
    setFormSuccess('');
  };

  const openDeleteModal = (product: Product) => {
    const check = checkProductDeletable(product.id);
    setDeleteCheckResult(check);
    setDeleteModalProduct(product);
  };

  const handleConfirmPermanentDelete = () => {
    if (!deleteModalProduct) return;
    const res = deleteProductSafe(deleteModalProduct.id, currentUser.role === 'super_admin' ? 'force_delete' : 'delete');
    if (res.success) {
      setNotification({ type: 'success', message: res.message });
    } else {
      setNotification({ type: 'error', message: res.message });
    }
    setDeleteModalProduct(null);
  };

  const handleConfirmArchive = () => {
    if (!deleteModalProduct) return;
    const res = deleteProductSafe(deleteModalProduct.id, 'archive');
    if (res.success) {
      setNotification({ type: 'success', message: res.message });
    } else {
      setNotification({ type: 'error', message: res.message });
    }
    setDeleteModalProduct(null);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formName.trim()) {
      setFormError('Product Name is required.');
      return;
    }
    if (!formSku.trim()) {
      setFormError('Product SKU/Code is required.');
      return;
    }

    const oStock = parseInt(formOpeningStock) || 0;
    const mAlert = parseInt(formMinAlertLevel) || 5;

    const targetCategory = categories.find((c) => c.id === formCategory);
    const parsedPkgSize = formPackageSize ? parseFloat(formPackageSize) || undefined : undefined;
    const pkgUnit = formPackageUnit || (targetCategory?.name === 'Perfume Products' ? 'ml' : 'g');

    if (editingProduct) {
      const res = updateProduct(editingProduct.id, {
        name: formName.trim(),
        sku: formSku.trim(),
        barcode: formBarcode.trim() || undefined,
        categoryId: formCategory,
        categoryName: targetCategory?.name || 'Cosmetic Products',
        subcategory: formSubcategory.trim() || undefined,
        purchasePrice: editingProduct.purchasePrice,
        sellingPrice: editingProduct.sellingPrice,
        minAlertLevel: mAlert,
        unitOfMeasure: formUnit,
        status: formStatus,
        packageSize: parsedPkgSize,
        packageUnit: pkgUnit,
        bottleCapacityMl: parsedPkgSize,
        decantConfig: editingProduct.decantConfig,
      });

      if (res.success) {
        setFormSuccess('Product updated successfully!');
        setTimeout(() => setEditingProduct(null), 500);
      } else {
        setFormError(res.message);
      }
    } else {
      const res = addProduct({
        name: formName.trim(),
        sku: formSku.trim(),
        barcode: formBarcode.trim() || undefined,
        categoryId: formCategory,
        categoryName: targetCategory?.name || 'Cosmetic Products',
        subcategory: formSubcategory.trim() || undefined,
        purchasePrice: 0,
        sellingPrice: 0,
        openingStock: oStock,
        minAlertLevel: mAlert,
        unitOfMeasure: formUnit,
        status: formStatus,
        packageSize: parsedPkgSize,
        packageUnit: pkgUnit,
        bottleCapacityMl: parsedPkgSize,
        decantConfig: undefined,
      });

      if (res.success) {
        setFormSuccess('Product created successfully!');
        setTimeout(() => setIsAddModalOpen(false), 500);
      } else {
        setFormError(res.message);
      }
    }
  };

  // Dual Export handlers
  const handleExportExcel = () => {
    const headers = ['Product Name', 'SKU', 'Barcode', 'Category', 'Subcategory', 'Package Size', 'Min Stock Alert', 'Current Stock', 'Status'];

    const dataRows = filteredProducts.map((p) => {
      const stock = selectedBranchId === 'all'
        ? branchStocks.filter((s) => s.productId === p.id).reduce((sum, s) => sum + s.currentStock, 0)
        : branchStocks.find((s) => s.productId === p.id && s.branchId === selectedBranchId)?.currentStock || 0;

      const size = p.packageSize || p.bottleCapacityMl || p.decantConfig?.bottleCapacityMl;
      const unit = p.packageUnit || (p.categoryName === 'Perfume Products' ? 'ml' : 'g');
      const sizeStr = size ? `${size} ${unit}` : '—';

      return [
        p.name,
        p.sku,
        p.barcode || '—',
        p.categoryName,
        p.subcategory || '—',
        sizeStr,
        p.minAlertLevel,
        stock,
        p.status,
      ];
    });

    exportReportToExcel({
      reportTitle: 'Product Catalog Report',
      branchName: selectedBranchId === 'all' ? 'All Branches' : branches.find((b) => b.id === selectedBranchId)?.name || 'Branch',
      categoryFilter: activeCategoryTab === 'all' ? 'All Categories' : activeCategoryTab,
      generatedBy: currentUser.name,
      headers,
      dataRows,
      summaryStats: [
        { label: 'Total Products in Report', value: filteredProducts.length },
      ],
    });
  };

  const handleExportPdf = () => {
    const headers = ['Product Name', 'SKU', 'Category', 'Package Size', 'Min Alert', 'Stock', 'Status'];

    const dataRows = filteredProducts.map((p) => {
      const stock = selectedBranchId === 'all'
        ? branchStocks.filter((s) => s.productId === p.id).reduce((sum, s) => sum + s.currentStock, 0)
        : branchStocks.find((s) => s.productId === p.id && s.branchId === selectedBranchId)?.currentStock || 0;

      const size = p.packageSize || p.bottleCapacityMl || p.decantConfig?.bottleCapacityMl;
      const unit = p.packageUnit || (p.categoryName === 'Perfume Products' ? 'ml' : 'g');
      const sizeStr = size ? `${size} ${unit}` : '—';

      return [
        p.name,
        p.sku,
        p.categoryName,
        sizeStr,
        p.minAlertLevel,
        stock,
        p.status,
      ];
    });

    exportReportToPdf({
      reportTitle: 'Product Catalog Report',
      branchName: selectedBranchId === 'all' ? 'All Branches' : branches.find((b) => b.id === selectedBranchId)?.name || 'Branch',
      categoryFilter: activeCategoryTab === 'all' ? 'All Categories' : activeCategoryTab,
      generatedBy: currentUser.name,
      headers,
      dataRows,
      summaryStats: [
        { label: 'Total Products in Report', value: filteredProducts.length },
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Main Actions */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Product Catalog & Master Management</h1>
            <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200">
              3-Category System
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Centrally manage Cosmetic Products, Food Products, and Perfume Products with branch stock tracking and safe deletion protection.
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

          {canAdd && (
            <button
              onClick={openAddModal}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
          )}
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

      {/* THREE PREDEFINED CATEGORY TABS (Prominent Switcher) */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-1 bg-slate-100/80 p-1 rounded-xl overflow-x-auto no-scrollbar w-full sm:w-auto">
          <button
            onClick={() => {
              setActiveCategoryTab('all');
              setSelectedCategoryName(null);
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeCategoryTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Categories ({products.length})
          </button>

          <button
            onClick={() => {
              setActiveCategoryTab('Cosmetic Products');
              setSelectedCategoryName('Cosmetic Products');
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-all ${
              activeCategoryTab === 'Cosmetic Products'
                ? 'bg-pink-600 text-white shadow-xs'
                : 'text-pink-700 hover:bg-pink-50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Cosmetic Products ({products.filter((p) => p.categoryName === 'Cosmetic Products').length})</span>
          </button>

          <button
            onClick={() => {
              setActiveCategoryTab('Food Products');
              setSelectedCategoryName('Food Products');
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-all ${
              activeCategoryTab === 'Food Products'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-800 hover:bg-amber-50'
            }`}
          >
            <Apple className="w-3.5 h-3.5" />
            <span>Food Products ({products.filter((p) => p.categoryName === 'Food Products').length})</span>
          </button>

          <button
            onClick={() => {
              setActiveCategoryTab('Perfume Products');
              setSelectedCategoryName('Perfume Products');
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-all ${
              activeCategoryTab === 'Perfume Products'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-purple-800 hover:bg-purple-50'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Perfume Products ({products.filter((p) => p.categoryName === 'Perfume Products').length})</span>
          </button>
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-2 pr-2">
          <span className="text-xs text-slate-500 font-medium">Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none bg-slate-50 text-slate-700 cursor-pointer"
          >
            <option value="all">All Products</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive / Archived</option>
          </select>
        </div>
      </div>

      {/* Fast Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Fast search by product name, SKU / product code, or barcode..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3.5 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
          >
            ✕
          </button>
        )}
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Product Name & SKU</th>
                <th className="py-3 px-4">Main Category</th>
                <th className="py-3 px-4 text-center">Net Size / Weight</th>
                <th className="py-3 px-4 text-center">Min Alert Level</th>
                <th className="py-3 px-4 text-center">Current Stock</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Fast Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => {
                const currentStock = selectedBranchId === 'all'
                  ? branchStocks.filter((s) => s.productId === product.id).reduce((sum, s) => sum + s.currentStock, 0)
                  : branchStocks.find((s) => s.productId === product.id && s.branchId === selectedBranchId)?.currentStock || 0;

                const alertStatus = calculateStockAlertStatus(currentStock, product.minAlertLevel);

                return (
                  <tr key={product.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{product.name}</div>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-mono mt-0.5">
                        <span className="bg-slate-100 px-1.5 py-0.2 rounded font-semibold text-slate-700">{product.sku}</span>
                        {product.barcode && <span>Barcode: {product.barcode}</span>}
                        {product.unitOfMeasure && <span>• {product.unitOfMeasure}</span>}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          product.categoryName === 'Cosmetic Products'
                            ? 'bg-pink-50 text-pink-700 border border-pink-200'
                            : product.categoryName === 'Food Products'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}
                      >
                        {product.categoryName}
                      </span>
                      {product.subcategory && (
                        <span className="block text-[10px] text-slate-400 mt-0.5">{product.subcategory}</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {(() => {
                        const size = product.packageSize || product.bottleCapacityMl || product.decantConfig?.bottleCapacityMl;
                        const unit = product.packageUnit || (product.categoryName === 'Perfume Products' ? 'ml' : 'g');
                        if (!size) return <span className="text-slate-400 font-mono">—</span>;
                        return (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            ⚖️ {size} {unit}
                          </span>
                        );
                      })()}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        🔔 {product.minAlertLevel} units
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          alertStatus === 'out_of_stock'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : alertStatus === 'low_stock'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {currentStock} {product.unitOfMeasure || 'units'}
                      </span>
                      {(product.categoryName === 'Perfume Products' || product.packageSize || product.bottleCapacityMl) && (
                        <div className="mt-1">
                          {(() => {
                            const openMl = selectedBranchId === 'all'
                              ? branchStocks.filter(s => s.productId === product.id).reduce((sum, s) => sum + (s.openBottleMlRemaining || 0), 0)
                              : branchStocks.find(s => s.productId === product.id && s.branchId === selectedBranchId)?.openBottleMlRemaining || 0;
                            const unit = product.packageUnit || (product.categoryName === 'Perfume Products' ? 'ml' : 'g');
                            if (openMl <= 0) return null;
                            return (
                              <span className="inline-flex items-center text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                                🧴 Open: {openMl} {unit}
                              </span>
                            );
                          })()}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Min alert: {product.minAlertLevel}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          product.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {product.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center space-x-1.5">
                        {/* Quick Action: Stock In */}
                        <button
                          onClick={() => setActiveTab('stock-in')}
                          title="Stock In this product"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <ArrowDownToLine className="w-3.5 h-3.5" />
                        </button>

                        {/* Quick Action: Stock Out */}
                        <button
                          onClick={() => setActiveTab('stock-out')}
                          title="Stock Out / Adjustment"
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <ArrowUpFromLine className="w-3.5 h-3.5" />
                        </button>

                        {/* Quick Action: Sell / Bill */}
                        <button
                          disabled={product.status === 'inactive' || currentStock <= 0}
                          onClick={() => setActiveTab('sales-entry')}
                          title="Create Bill / Sell"
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-30 rounded-lg transition-colors"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                        </button>

                        {/* Branch Breakdown */}
                        <button
                          onClick={() => setViewBranchStockProduct(product)}
                          title="View branch breakdown"
                          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Building2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Master Edit */}
                        {canEdit && (
                          <button
                            onClick={() => openEditModal(product)}
                            title="Edit product"
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Safe Delete for Permitted Users */}
                        {canDelete && (
                          <button
                            onClick={() => openDeleteModal(product)}
                            title="Delete or Deactivate product"
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No products match your search or category filter.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try clearing search terms or selecting another category.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {(isAddModalOpen || editingProduct) && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl relative my-auto flex flex-col max-h-[90vh] overflow-hidden">
              {/* Modal Sticky Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                  <span>{editingProduct ? 'Edit Master Product' : 'Add New Product to Best Heritage'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingProduct(null);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Scrollable Body */}
              <form id="productForm" onSubmit={handleSaveProduct} className="p-6 overflow-y-auto flex-1 space-y-4">
                {formError && (
                  <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
                    {formError}
                  </div>
                )}
                {formSuccess && (
                  <div className="p-2.5 bg-emerald-50 text-emerald-700 text-xs rounded-lg border border-emerald-200 flex items-center space-x-1">
                    <Check className="w-4 h-4" />
                    <span>{formSuccess}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Oud Eau De Parfum 100ml"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">Product SKU / Code *</label>
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        অটো জেনারেটেড
                      </span>
                    </div>
                    <input
                      type="text"
                      readOnly
                      title="Product Code is automatically generated and unique"
                      value={formSku}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-100 text-slate-700 cursor-not-allowed font-mono font-bold select-all focus:outline-none"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">Barcode *</label>
                      <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                        অটো ইউনিক
                      </span>
                    </div>
                    <input
                      type="text"
                      readOnly
                      title="Barcode is automatically assigned and unique"
                      value={formBarcode}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-100 text-slate-700 cursor-not-allowed font-mono font-bold select-all focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Main Category *</label>
                    <select
                      value={formCategory}
                      onChange={(e) => {
                        const newCatId = e.target.value;
                        setFormCategory(newCatId);
                        if (!editingProduct) {
                          setFormSku(generateUniqueSku(newCatId));
                        }
                      }}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-semibold"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Subcategory (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Skincare, Fragrances, Staples"
                      value={formSubcategory}
                      onChange={(e) => setFormSubcategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {!editingProduct && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Stock (Primary Branch)</label>
                      <input
                        type="number"
                        min="0"
                        value={formOpeningStock}
                        onChange={(e) => setFormOpeningStock(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Min Stock Alert Level *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formMinAlertLevel}
                      onChange={(e) => setFormMinAlertLevel(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Product Status</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as 'active' | 'inactive')}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                    >
                      <option value="active">Active (Available for sale)</option>
                      <option value="inactive">Inactive (Blocked from sales)</option>
                    </select>
                  </div>
                </div>

                {/* Package Size & Weight Specification for All Categories */}
                <div className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-indigo-950">
                      ⚖️ Package Net Size / Weight / Volume (প্যাকেটের মোট ওজন বা মাপ)
                    </label>
                    <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-100 px-2 py-0.5 rounded-full">
                      মাস্টার পরিমাপ
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="e.g. 100, 500, 1000"
                        value={formPackageSize}
                        onChange={(e) => setFormPackageSize(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <select
                        value={formPackageUnit}
                        onChange={(e) => setFormPackageUnit(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white font-semibold text-slate-800"
                      >
                        <option value="ml">ml (মিলিমিটার)</option>
                        <option value="g">g (গ্রাম)</option>
                        <option value="kg">kg (কেজি)</option>
                        <option value="pcs">pcs (পিস)</option>
                        <option value="oz">oz (আউন্স)</option>
                        <option value="L">L (লিটার)</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-[10px] text-indigo-600">
                    প্রতিটি সিল করা বোতল/প্যাকেটের মোট পরিমাণ (যেমন পারফিউম 100ml, ফুড 500g)। স্টক ইন করার সময় মোট হিসাব এবং সেল করার সময় ভেঙে বিক্রির ভিত্তি হিসেবে এটি ব্যবহৃত হবে।
                  </p>
                </div>
              </form>

              {/* Modal Sticky Footer */}
              <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/90 flex items-center justify-end space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingProduct(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="productForm"
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors cursor-pointer"
                >
                  {editingProduct ? 'Update Product Details' : 'Save Product to Master Catalog'}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Branch Stock Breakdown Modal */}
      {viewBranchStockProduct && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl relative my-auto flex flex-col max-h-[85vh] overflow-hidden">
            <div className="p-5 pb-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  <span>Branch Breakdown: {viewBranchStockProduct.name}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  SKU: <span className="font-mono font-semibold">{viewBranchStockProduct.sku}</span> | Category: <span className="font-semibold text-emerald-700">{viewBranchStockProduct.categoryName}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewBranchStockProduct(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {branches.map((branch) => {
                  const stock = branchStocks.find(
                    (s) => s.productId === viewBranchStockProduct.id && s.branchId === branch.id
                  );
                  const currentStock = stock ? stock.currentStock : 0;
                  const status = calculateStockAlertStatus(currentStock, viewBranchStockProduct.minAlertLevel);

                  return (
                    <div key={branch.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div>
                        <p className="font-semibold text-slate-800">{branch.name}</p>
                        <p className="text-[10px] text-slate-400">{branch.code} • {branch.address}</p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            status === 'out_of_stock'
                              ? 'bg-rose-100 text-rose-800'
                              : status === 'low_stock'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {currentStock} units
                        </span>
                        <p className="text-[10px] text-slate-400 capitalize mt-0.5">
                          {status.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setViewBranchStockProduct(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-900 text-white cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safe Delete Confirmation Modal */}
      {deleteModalProduct && (
        <DeleteConfirmationModal
          isOpen={true}
          title="Delete Product"
          itemName={deleteModalProduct.name}
          itemType="Product"
          canDelete={deleteCheckResult.canDelete}
          blockReason={deleteCheckResult.reason}
          hasHistory={deleteCheckResult.hasHistory}
          isSuperAdmin={currentUser.role === 'super_admin'}
          onConfirmDelete={handleConfirmPermanentDelete}
          onConfirmForceDelete={handleConfirmPermanentDelete}
          onConfirmArchive={handleConfirmArchive}
          onClose={() => setDeleteModalProduct(null)}
        />
      )}
    </div>
  );
};
