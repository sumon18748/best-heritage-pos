import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Product, ProductDetailInfo } from '../types';
import {
  BookOpen,
  Search,
  Sparkles,
  Flame,
  Apple,
  Pencil,
  Copy,
  Check,
  Building2,
  AlertTriangle,
  Info,
  Layers,
  HeartPulse,
  Droplets,
  ShieldAlert,
  Users,
  Archive,
  X,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { formatCurrencyBDT } from '../utils/stockCalculations';

export const ProductDetailsView: React.FC = () => {
  const { products, branchStocks, branches, updateProduct, currentUser, canEdit } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'has_details' | 'needs_details'>('all');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Edit Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<ProductDetailInfo>({});
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Determine if current user can edit product details (Super Admin or Users with edit permission)
  const isSuperAdmin = currentUser.role === 'super_admin';
  const canModify = isSuperAdmin || canEdit || currentUser.role === 'manager';

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => p.status !== 'inactive')
      .filter((p) => {
        const matchesCategory = selectedCategory === 'all' || p.categoryName === selectedCategory;
        const matchesSearch =
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (p.subcategory && p.subcategory.toLowerCase().includes(searchTerm.toLowerCase()));

        const hasDetails = !!(
          p.productDetails &&
          (p.productDetails.benefits ||
            p.productDetails.usageInstructions ||
            p.productDetails.overview ||
            p.productDetails.sideEffectsPrecautions)
        );

        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'has_details' && hasDetails) ||
          (statusFilter === 'needs_details' && !hasDetails);

        return matchesCategory && matchesSearch && matchesStatus;
      });
  }, [products, selectedCategory, searchTerm, statusFilter]);

  // Currently selected product
  const selectedProduct = useMemo(() => {
    if (!selectedProductId && filteredProducts.length > 0) {
      return filteredProducts[0];
    }
    return products.find((p) => p.id === selectedProductId) || filteredProducts[0] || null;
  }, [products, selectedProductId, filteredProducts]);

  // Multi-branch stock calculation for the selected product
  const branchStockDetails = useMemo(() => {
    if (!selectedProduct) return [];
    return branches
      .filter((b) => b.isActive && b.code !== '0001') // Exclude inactive and Head Office
      .map((branch) => {
        const stock = branchStocks.find(
          (s) => s.productId === selectedProduct.id && s.branchId === branch.id
        );
        return {
          branchName: branch.name,
          branchCode: branch.code,
          currentStock: stock ? Number(stock.currentStock) || 0 : 0,
          openBottleMl: stock ? Number(stock.openBottleMlRemaining) || 0 : 0,
        };
      });
  }, [selectedProduct, branches, branchStocks]);

  // Open Edit Modal
  const openEditModal = (product: Product) => {
    setProductToEdit(product);
    setEditForm({
      overview: product.productDetails?.overview || '',
      benefits: product.productDetails?.benefits || '',
      usageInstructions: product.productDetails?.usageInstructions || '',
      sideEffectsPrecautions: product.productDetails?.sideEffectsPrecautions || '',
      ingredients: product.productDetails?.ingredients || '',
      suitableFor: product.productDetails?.suitableFor || '',
      storageTips: product.productDetails?.storageTips || '',
    });
    setSaveFeedback(null);
    setIsEditing(true);
  };

  // Handle Save
  const handleSaveDetails = () => {
    if (!productToEdit) return;

    const updatedDetails: ProductDetailInfo = {
      ...editForm,
      lastUpdated: new Date().toLocaleDateString('bn-BD', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      updatedBy: currentUser.name,
    };

    const res = updateProduct(productToEdit.id, {
      productDetails: updatedDetails,
    });

    if (res.success) {
      setSaveFeedback('প্রোডাক্ট ডিটেইলস সফলভাবে সংরক্ষণ করা হয়েছে!');
      setTimeout(() => {
        setIsEditing(false);
        setSaveFeedback(null);
      }, 900);
    } else {
      setSaveFeedback('সংরক্ষণ ব্যর্থ হয়েছে: ' + res.message);
    }
  };

  // Copy product details to clipboard (For customer WhatsApp/SMS)
  const handleCopySummary = () => {
    if (!selectedProduct) return;
    const d = selectedProduct.productDetails;
    let text = `📦 পণ্য: ${selectedProduct.name} (${selectedProduct.sku})\n`;
    text += `💰 বিক্রয় মূল্য: ${formatCurrencyBDT(selectedProduct.sellingPrice)}\n`;

    if (d?.overview) text += `\n📌 পরিচিতি:\n${d.overview}\n`;
    if (d?.benefits) text += `\n🌿 কার্যকারিতা ও উপকারিতা:\n${d.benefits}\n`;
    if (d?.usageInstructions) text += `\n🧴 ব্যবহারবিধি:\n${d.usageInstructions}\n`;
    if (d?.suitableFor) text += `\n🎯 কাদের জন্য প্রযোজ্য:\n${d.suitableFor}\n`;
    if (d?.sideEffectsPrecautions) text += `\n⚠️ সতর্কতা:\n${d.sideEffectsPrecautions}\n`;
    if (d?.storageTips) text += `\n📦 সংরক্ষণ:\n${d.storageTips}\n`;

    text += `\n— Best Heritage Foods & Perfumes`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName) {
      case 'Cosmetic Products':
        return <Sparkles className="w-4 h-4 text-pink-500" />;
      case 'Food Products':
        return <Apple className="w-4 h-4 text-emerald-500" />;
      case 'Perfume Products':
        return <Flame className="w-4 h-4 text-purple-500" />;
      default:
        return <Layers className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-slate-50">
      {/* ── Top Header & Filter Bar ── */}
      <div className="bg-white border-b border-slate-200/80 px-4 py-3 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold text-slate-900 tracking-tight">
                  প্রোডাক্ট ডিটেইলস (Product Details)
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  নলেজ বেস ও ব্যবহারবিধি
                </span>
              </div>
              <p className="text-xs text-slate-500">
                কাস্টমারদের প্রশ্নের তাৎক্ষণিক উত্তর ও পণ্যের সম্পূর্ণ তথ্যাবলি (কার্যকারিতা, ব্যবহারবিধি, উপকারিতা ও সতর্কতা)
              </p>
            </div>
          </div>

          {/* Quick Search */}
          <div className="flex items-center gap-2">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="প্রোডাক্ট নাম, SKU বা বারকোড দিয়ে সার্চ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Category & Status Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              সব পণ্য ({products.filter((p) => p.status !== 'inactive').length})
            </button>
            <button
              onClick={() => setSelectedCategory('Cosmetic Products')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center space-x-1 cursor-pointer ${
                selectedCategory === 'Cosmetic Products'
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200/60'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Cosmetics</span>
            </button>
            <button
              onClick={() => setSelectedCategory('Food Products')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center space-x-1 cursor-pointer ${
                selectedCategory === 'Food Products'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
              }`}
            >
              <Apple className="w-3 h-3" />
              <span>Foods</span>
            </button>
            <button
              onClick={() => setSelectedCategory('Perfume Products')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center space-x-1 cursor-pointer ${
                selectedCategory === 'Perfume Products'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/60'
              }`}
            >
              <Flame className="w-3 h-3" />
              <span>Perfumes</span>
            </button>
          </div>

          <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              সকল
            </button>
            <button
              onClick={() => setStatusFilter('has_details')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === 'has_details' ? 'bg-white text-emerald-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              তথ্য সম্পন্ন
            </button>
            <button
              onClick={() => setStatusFilter('needs_details')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === 'needs_details' ? 'bg-white text-amber-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              তথ্য বাকি
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Two-Pane Split Layout ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Product List */}
        <div className="w-full md:w-84 lg:w-96 bg-white border-r border-slate-200/80 flex flex-col shrink-0">
          <div className="p-2.5 bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 flex justify-between items-center">
            <span>পণ্য তালিকা ({filteredProducts.length})</span>
            {filteredProducts.length === 0 && <span className="text-rose-500">কোনো পণ্য মেলেনি</span>}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredProducts.map((prod) => {
              const isSelected = selectedProduct?.id === prod.id;
              const hasInfo = !!(
                prod.productDetails &&
                (prod.productDetails.benefits ||
                  prod.productDetails.usageInstructions ||
                  prod.productDetails.overview)
              );

              return (
                <div
                  key={prod.id}
                  onClick={() => setSelectedProductId(prod.id)}
                  className={`p-3 text-left transition-all cursor-pointer flex items-start justify-between gap-2 select-none ${
                    isSelected
                      ? 'bg-emerald-50/80 border-l-4 border-l-emerald-600'
                      : 'hover:bg-slate-50/90'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5 mb-1">
                      {getCategoryIcon(prod.categoryName)}
                      <span className="font-mono text-[10px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.2 rounded">
                        {prod.sku}
                      </span>
                      {hasInfo ? (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          ✓ তথ্য প্রস্তুত
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                          + তথ্য বাকি
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-xs text-slate-900 truncate">
                      {prod.name}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-between">
                      <span className="font-bold text-slate-700">
                        {formatCurrencyBDT(prod.sellingPrice)}
                      </span>
                      {prod.packageSize && (
                        <span>
                          {prod.packageSize} {prod.packageUnit || (prod.categoryName === 'Perfume Products' ? 'ml' : 'g')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                কোনো পণ্য খুঁজে পাওয়া যায়নি। সার্চ পরিবর্তন করুন।
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Selected Product Details & Guide */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-100/70">
          {selectedProduct ? (
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Top Banner Card */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {getCategoryIcon(selectedProduct.categoryName)}
                        <span>{selectedProduct.categoryName}</span>
                      </span>
                      {selectedProduct.subcategory && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
                          {selectedProduct.subcategory}
                        </span>
                      )}
                      <span className="font-mono text-xs text-slate-500 font-semibold">
                        SKU: {selectedProduct.sku}
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                      {selectedProduct.name}
                    </h2>

                    <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-600">
                      <div>
                        <span className="text-slate-400">বিক্রয় মূল্য: </span>
                        <span className="text-base font-bold text-emerald-700">
                          {formatCurrencyBDT(selectedProduct.sellingPrice)}
                        </span>
                      </div>
                      {selectedProduct.packageSize && (
                        <div>
                          <span className="text-slate-400">সাইজ / ক্যাপাসিটি: </span>
                          <span className="font-semibold text-slate-800">
                            {selectedProduct.packageSize} {selectedProduct.packageUnit || (selectedProduct.categoryName === 'Perfume Products' ? 'ml' : 'g')}
                          </span>
                        </div>
                      )}
                      {selectedProduct.barcode && (
                        <div>
                          <span className="text-slate-400">বারকোড: </span>
                          <span className="font-mono text-slate-700">{selectedProduct.barcode}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions (Edit & Copy) */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={handleCopySummary}
                      title="কাস্টমারকে পাঠানোর জন্য সম্পূর্ণ বিবরণ কপি করুন"
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer border border-slate-200"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span className="text-emerald-700">কপি হয়েছে!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-slate-500" />
                          <span>কপি করুন (WhatsApp/SMS)</span>
                        </>
                      )}
                    </button>

                    {canModify && (
                      <button
                        onClick={() => openEditModal(selectedProduct)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>তথ্য এডিট / আপডেট</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Live Stock in Outlets */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>আউটলেট সমূহে বর্তমান স্টক স্ট্যাটাস (Branch Stocks)</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {branchStockDetails.map((b) => (
                      <div
                        key={b.branchCode}
                        className="p-2 bg-slate-50 rounded-lg border border-slate-200/70 text-xs"
                      >
                        <div className="font-medium text-slate-700 truncate">{b.branchName}</div>
                        <div className="mt-0.5 flex items-baseline justify-between">
                          <span
                            className={`font-bold ${
                              b.currentStock > 0 ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            {b.currentStock} পিস
                          </span>
                          {b.openBottleMl > 0 && (
                            <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 px-1 rounded">
                              ওপেন: {b.openBottleMl}ml
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Structured Detail Cards ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Benefits & Effectiveness (কার্যকারিতা ও উপকারিতা) */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col">
                  <div className="flex items-center space-x-2 text-emerald-800 font-bold text-sm mb-3 pb-2 border-b border-emerald-50">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                      <HeartPulse className="w-4 h-4" />
                    </div>
                    <span>কার্যকারিতা ও উপকারিতা (Benefits)</span>
                  </div>
                  <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line flex-1">
                    {selectedProduct.productDetails?.benefits ? (
                      selectedProduct.productDetails.benefits
                    ) : (
                      <span className="text-slate-400 italic">
                        এখনো কার্যকারিতা বা উপকারিতা যোগ করা হয়নি। উপরে "তথ্য এডিট / আপডেট" বাটনে ক্লিক করে লিখে রাখুন।
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Usage Instructions (ব্যবহারবিধি ও নিয়মাবলী) */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col">
                  <div className="flex items-center space-x-2 text-blue-800 font-bold text-sm mb-3 pb-2 border-b border-blue-50">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                      <Droplets className="w-4 h-4" />
                    </div>
                    <span>ব্যবহারবিধি ও প্রয়োগপদ্ধতি (How to Use)</span>
                  </div>
                  <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line flex-1">
                    {selectedProduct.productDetails?.usageInstructions ? (
                      selectedProduct.productDetails.usageInstructions
                    ) : (
                      <span className="text-slate-400 italic">
                        ব্যবহারবিধি যোগ করা হয়নি। কীভাবে ব্যবহার করতে হবে তা লিখে রাখলে যেকোনো ম্যানেজার কাস্টমারকে বলতে পারবে।
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Precautions & Side Effects (সতর্কতা ও অপকারিতা) */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col">
                  <div className="flex items-center space-x-2 text-rose-800 font-bold text-sm mb-3 pb-2 border-b border-rose-50">
                    <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <span>সতর্কতা ও অপকারিতা (Precautions & Side Effects)</span>
                  </div>
                  <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line flex-1">
                    {selectedProduct.productDetails?.sideEffectsPrecautions ? (
                      selectedProduct.productDetails.sideEffectsPrecautions
                    ) : (
                      <span className="text-slate-400 italic">
                        কোনো সতর্কতা বা অপকারিতা উল্লেখ করা নেই। (যেমন: এলার্জি থাকলে বা চোখের সংস্পর্শ ইত্যাদি সতর্কতা লিখে রাখুন)।
                      </span>
                    )}
                  </div>
                </div>

                {/* 4. Target Audience / Suitable For (কাদের জন্য প্রযোজ্য) */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col">
                  <div className="flex items-center space-x-2 text-teal-800 font-bold text-sm mb-3 pb-2 border-b border-teal-50">
                    <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700">
                      <Users className="w-4 h-4" />
                    </div>
                    <span>কাদের জন্য প্রযোজ্য (Suitable For / Target)</span>
                  </div>
                  <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line flex-1">
                    {selectedProduct.productDetails?.suitableFor ? (
                      selectedProduct.productDetails.suitableFor
                    ) : (
                      <span className="text-slate-400 italic">
                        কোন ত্বকের জন্য উপযোগী, বয়সসীমা বা পুরুষ/মহিলাদের জন্য প্রযোজ্য কিনা তা লিখে রাখুন।
                      </span>
                    )}
                  </div>
                </div>

                {/* 5. Ingredients & Notes (মূল উপাদান ও সুবাস নোট) */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col">
                  <div className="flex items-center space-x-2 text-purple-800 font-bold text-sm mb-3 pb-2 border-b border-purple-50">
                    <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <span>মূল উপাদান বা ঘ্রাণ বিবরণ (Ingredients & Notes)</span>
                  </div>
                  <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line flex-1">
                    {selectedProduct.productDetails?.ingredients ? (
                      selectedProduct.productDetails.ingredients
                    ) : (
                      <span className="text-slate-400 italic">
                        মূল উপাদান, হার্বাল উপাদান বা পারফিউমের সুবাস নোটস (Top, Heart, Base) লিখে রাখুন।
                      </span>
                    )}
                  </div>
                </div>

                {/* 6. Storage & Shelf Life (সংরক্ষণ পদ্ধতি ও সাধারণ পরিচিতি) */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col">
                  <div className="flex items-center space-x-2 text-amber-800 font-bold text-sm mb-3 pb-2 border-b border-amber-50">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                      <Archive className="w-4 h-4" />
                    </div>
                    <span>সংরক্ষণ পদ্ধতি ও সাধারণ বিবরণ (Storage & Overview)</span>
                  </div>
                  <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line flex-1 space-y-2">
                    {selectedProduct.productDetails?.storageTips && (
                      <div>
                        <strong className="text-slate-800">সংরক্ষণ: </strong>
                        <span>{selectedProduct.productDetails.storageTips}</span>
                      </div>
                    )}
                    {selectedProduct.productDetails?.overview && (
                      <div>
                        <strong className="text-slate-800">বিবরণ: </strong>
                        <span>{selectedProduct.productDetails.overview}</span>
                      </div>
                    )}
                    {!selectedProduct.productDetails?.storageTips &&
                      !selectedProduct.productDetails?.overview && (
                        <span className="text-slate-400 italic">
                          সরাসরি রোদ থেকে দূরে বা ঠান্ডা স্থানে রাখার মতো সাধারণ সংরক্ষণ টিপস লিখে রাখুন।
                        </span>
                      )}
                  </div>
                </div>
              </div>

              {/* Footer info */}
              {selectedProduct.productDetails?.lastUpdated && (
                <div className="text-right text-[11px] text-slate-400 pt-2">
                  সর্বশেষ আপডেট: {selectedProduct.productDetails.lastUpdated}
                  {selectedProduct.productDetails.updatedBy && ` (দ্বারা: ${selectedProduct.productDetails.updatedBy})`}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center max-w-md shadow-xs">
                <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">কোনো প্রোডাক্ট সিলেক্ট করা নেই</h3>
                <p className="text-xs text-slate-500 mt-1">
                  বাম পাশের তালিকা থেকে একটি প্রোডাক্টে ক্লিক করুন অথবা উপরের সার্চ বক্সে নাম লিখুন।
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Edit Product Details Modal ── */}
      {isEditing && productToEdit && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative border border-slate-200 my-8">
            <button
              onClick={() => setIsEditing(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 text-emerald-800 font-bold text-base mb-1">
              <BookOpen className="w-5 h-5 text-emerald-600" />
              <span>প্রোডাক্ট ডিটেইলস ও ব্যবহারবিধি সম্পাদনা</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              {productToEdit.name} ({productToEdit.sku})
            </p>

            <div className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
              {/* 1. Benefits */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  🌿 কার্যকারিতা ও উপকারিতা (Benefits & Key Effects) *
                </label>
                <textarea
                  rows={3}
                  value={editForm.benefits || ''}
                  onChange={(e) => setEditForm({ ...editForm, benefits: e.target.value })}
                  placeholder="যেমন: এই পণ্যটি নিয়মিত ব্যবহারে ত্বক উজ্জ্বল ও মসৃণ হয়, ত্বকের আর্দ্রতা বজায় রাখে..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              {/* 2. Usage Instructions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  🧴 ব্যবহারবিধি ও নিয়মাবলী (How to Use & Directions) *
                </label>
                <textarea
                  rows={3}
                  value={editForm.usageInstructions || ''}
                  onChange={(e) => setEditForm({ ...editForm, usageInstructions: e.target.value })}
                  placeholder="যেমন: প্রতিদিন সকালে ও রাতে মুখ পরিষ্কার করে ৩-৪ ফোঁটা আলতোভাবে ম্যাসাজ করুন..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              {/* 3. Precautions & Side Effects */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ⚠️ সতর্কতা ও অপকারিতা (Precautions, Side Effects & Cautions)
                </label>
                <textarea
                  rows={2}
                  value={editForm.sideEffectsPrecautions || ''}
                  onChange={(e) => setEditForm({ ...editForm, sideEffectsPrecautions: e.target.value })}
                  placeholder="যেমন: শুধুমাত্র বাহ্যিক ব্যবহারের জন্য। চোখের সংস্পর্শ থেকে দূরে রাখুন। সেনসিটিভ ত্বকে ব্যবহারের আগে প্যাচ টেস্ট করুন..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              {/* 4. Target Audience / Suitable For */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    🎯 কাদের জন্য প্রযোজ্য (Suitable For)
                  </label>
                  <input
                    type="text"
                    value={editForm.suitableFor || ''}
                    onChange={(e) => setEditForm({ ...editForm, suitableFor: e.target.value })}
                    placeholder="যেমন: সকল ত্বকের জন্য, শুষ্ক ত্বক, পুরুষ ও মহিলা উভয়ের জন্য"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    📦 সংরক্ষণ পদ্ধতি (Storage Instructions)
                  </label>
                  <input
                    type="text"
                    value={editForm.storageTips || ''}
                    onChange={(e) => setEditForm({ ...editForm, storageTips: e.target.value })}
                    placeholder="যেমন: সরাসরি রোদ ও গরম থেকে দূরে ঠান্ডা স্থানে রাখুন"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* 5. Ingredients & Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  🧪 মূল উপাদান বা সুবাস নোটস (Ingredients / Fragrance Notes)
                </label>
                <input
                  type="text"
                  value={editForm.ingredients || ''}
                  onChange={(e) => setEditForm({ ...editForm, ingredients: e.target.value })}
                  placeholder="যেমন: ভিটামিন সি, অ্যালোভেরা, অথবা পারফিউমের ক্ষেত্রে Top: Bergamot, Base: Oud & Amber"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              {/* 6. Overview */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  📝 সাধারণ সংক্ষিপ্ত পরিচিতি (Overview)
                </label>
                <textarea
                  rows={2}
                  value={editForm.overview || ''}
                  onChange={(e) => setEditForm({ ...editForm, overview: e.target.value })}
                  placeholder="পণ্যটির বিশেষ বৈশিষ্ট্য বা সংক্ষেপ পরিচয়..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>
            </div>

            {saveFeedback && (
              <div
                className={`mt-3 p-2.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 ${
                  saveFeedback.includes('সফল')
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{saveFeedback}</span>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4 mt-3 border-t border-slate-100">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                বাতিল
              </button>
              <button
                onClick={handleSaveDetails}
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>সংরক্ষণ করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
