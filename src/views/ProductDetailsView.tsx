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
  Eye,
  X,
  Save,
  CheckCircle2,
  Globe2,
  Tag,
  FileText,
  Info,
  ChevronLeft,
} from 'lucide-react';
import { formatCurrencyBDT } from '../utils/stockCalculations';

// ── Full-Page Detail View ─────────────────────────────────────────────────
const ProductDetailPage: React.FC<{
  product: Product;
  onBack: () => void;
  onEdit: () => void;
  canModify: boolean;
}> = ({ product, onBack, onEdit, canModify }) => {
  const d = product.productDetails;

  const InfoRow: React.FC<{ label: string; value?: string; icon?: React.ReactNode }> = ({
    label,
    value,
    icon,
  }) => {
    if (!value) return null;
    return (
      <div className="flex gap-3 py-3 border-b border-slate-100 last:border-0">
        <div className="shrink-0 w-5 mt-0.5 text-slate-400">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
            {label}
          </div>
          <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">{value}</div>
        </div>
      </div>
    );
  };

  const categoryColor =
    product.categoryName === 'Cosmetic Products'
      ? 'bg-pink-100 text-pink-700 border-pink-200'
      : product.categoryName === 'Food Products'
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : 'bg-purple-100 text-purple-700 border-purple-200';

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Back + Edit Header */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={onBack}
            className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>প্রোডাক্ট তালিকায় ফিরুন</span>
          </button>
          {canModify && (
            <button
              onClick={onEdit}
              className="flex items-center space-x-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>তথ্য আপডেট</span>
            </button>
          )}
        </div>

        {/* Product Title Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 mb-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border mb-2 ${categoryColor}`}
              >
                {product.categoryName === 'Cosmetic Products' && <Sparkles className="w-3 h-3 mr-1" />}
                {product.categoryName === 'Food Products' && <Apple className="w-3 h-3 mr-1" />}
                {product.categoryName === 'Perfume Products' && <Flame className="w-3 h-3 mr-1" />}
                {product.categoryName}
              </span>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">{product.name}</h1>
              {product.subcategory && (
                <p className="text-xs text-slate-500 mt-1">{product.subcategory}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className="text-xl font-bold text-emerald-700">
                {formatCurrencyBDT(product.sellingPrice)}
              </div>
              {product.packageSize && (
                <div className="text-xs text-slate-500">
                  {product.packageSize}{' '}
                  {product.packageUnit ||
                    (product.categoryName === 'Perfume Products' ? 'ml' : 'g')}
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-4 text-xs text-slate-600">
            <div>
              <span className="text-slate-400">SKU: </span>
              <span className="font-mono font-bold text-slate-800">{product.sku}</span>
            </div>
            {product.barcode && (
              <div>
                <span className="text-slate-400">বারকোড: </span>
                <span className="font-mono text-slate-700">{product.barcode}</span>
              </div>
            )}
            {d?.countryOfOrigin && (
              <div className="flex items-center space-x-1">
                <Globe2 className="w-3.5 h-3.5 text-blue-500" />
                <span className="font-semibold text-blue-800">{d.countryOfOrigin}</span>
              </div>
            )}
            {d?.brand && (
              <div className="flex items-center space-x-1">
                <Tag className="w-3.5 h-3.5 text-purple-500" />
                <span className="font-semibold text-purple-800">{d.brand}</span>
              </div>
            )}
          </div>
        </div>

        {/* Detail Info Card */}
        {d && d.description ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <InfoRow
              label="বিবরণ (Description)"
              value={d.description}
              icon={<FileText className="w-4 h-4" />}
            />

            {d.lastUpdated && (
              <p className="text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-100 text-right">
                সর্বশেষ আপডেট: {d.lastUpdated}
                {d.updatedBy ? ` (দ্বারা: ${d.updatedBy})` : ''}
              </p>
            )}
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
            <Info className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-amber-800">এখনো কোনো বিস্তারিত তথ্য যোগ করা হয়নি।</p>
            <p className="text-xs text-amber-600 mt-1">
              {canModify
                ? '"তথ্য আপডেট" বাটনে ক্লিক করে দেশ, ব্র্যান্ড ও বিবরণ যোগ করুন।'
                : 'অ্যাডমিন পণ্যের বিস্তারিত তথ্য যোগ করলে এখানে দেখা যাবে।'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Product Details List View ───────────────────────────────────────
export const ProductDetailsView: React.FC = () => {
  const { products, updateProduct, currentUser, canEdit } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<ProductDetailInfo>({});
  const [saveFeedback, setSaveFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const isSuperAdmin = currentUser.role === 'super_admin';
  const canModify = isSuperAdmin || canEdit || currentUser.role === 'admin' || currentUser.role === 'manager';

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => p.status !== 'inactive')
      .filter((p) => {
        const matchesCat =
          selectedCategory === 'all' || p.categoryName === selectedCategory;
        const matchesSearch =
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (p.productDetails?.brand &&
            p.productDetails.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (p.productDetails?.countryOfOrigin &&
            p.productDetails.countryOfOrigin.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesCat && matchesSearch;
      });
  }, [products, selectedCategory, searchTerm]);

  const openEdit = (p: Product) => {
    setProductToEdit(p);
    setEditForm({ ...(p.productDetails || {}) });
    setSaveFeedback(null);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!productToEdit) return;
    const updated: ProductDetailInfo = {
      ...editForm,
      lastUpdated: new Date().toLocaleDateString('bn-BD', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      updatedBy: currentUser.name,
    };
    const res = updateProduct(productToEdit.id, { productDetails: updated });
    if (res.success) {
      setSaveFeedback({ ok: true, msg: 'সফলভাবে সংরক্ষণ করা হয়েছে!' });
      // Update viewProduct in memory if it's the same
      if (viewProduct?.id === productToEdit.id) {
        setViewProduct({ ...viewProduct, productDetails: updated });
      }
      setTimeout(() => {
        setIsEditing(false);
        setSaveFeedback(null);
      }, 900);
    } else {
      setSaveFeedback({ ok: false, msg: 'ব্যর্থ: ' + res.message });
    }
  };

  const getCategoryDot = (name: string) => {
    if (name === 'Cosmetic Products') return 'bg-pink-500';
    if (name === 'Food Products') return 'bg-emerald-500';
    return 'bg-purple-500';
  };

  // ── Full-page View Mode ──────────────────────────────────────────────
  if (viewProduct) {
    return (
      <div className="h-full overflow-y-auto">
        <ProductDetailPage
          product={
            // Always read the latest version from products state
            products.find((p) => p.id === viewProduct.id) || viewProduct
          }
          onBack={() => setViewProduct(null)}
          onEdit={() => openEdit(products.find((p) => p.id === viewProduct.id) || viewProduct)}
          canModify={canModify}
        />
        {/* Edit Modal (shown over detail page) */}
        {isEditing && productToEdit && (
          <EditModal
            product={productToEdit}
            form={editForm}
            setForm={setEditForm}
            onSave={handleSave}
            onClose={() => setIsEditing(false)}
            feedback={saveFeedback}
          />
        )}
      </div>
    );
  }

  // ── List / Grid Mode ─────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200/80 px-4 py-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 tracking-tight">
                প্রোডাক্ট ডিটেইলস (Product Details)
              </h1>
              <p className="text-[11px] text-slate-500">
                প্রতিটি প্রোডাক্টের দেশ, ব্র্যান্ড ও বিবরণ — কাস্টমারকে তাৎক্ষণিক তথ্য দিন
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="নাম, SKU, দেশ বা ব্র্যান্ড..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white placeholder:text-slate-400 transition-all"
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

        {/* Category Filters */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {[
            { id: 'all', label: `সকল (${products.filter((p) => p.status !== 'inactive').length})` },
            { id: 'Cosmetic Products', label: 'Cosmetics' },
            { id: 'Food Products', label: 'Foods' },
            { id: 'Perfume Products', label: 'Perfumes' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">কোনো প্রোডাক্ট পাওয়া যায়নি।</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map((prod) => {
              const d = prod.productDetails;
              const hasInfo = !!(d?.description || d?.countryOfOrigin || d?.brand);

              return (
                <div
                  key={prod.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col hover:shadow-md hover:border-slate-300 transition-all"
                >
                  {/* Category dot + name */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-start space-x-2 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full mt-1 shrink-0 ${getCategoryDot(prod.categoryName)}`}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                          {prod.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{prod.sku}</p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                        hasInfo
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {hasInfo ? '✓' : '—'}
                    </span>
                  </div>

                  {/* Country / Brand chips */}
                  <div className="flex flex-wrap gap-1.5 mb-3 min-h-[22px]">
                    {d?.countryOfOrigin && (
                      <span className="inline-flex items-center space-x-1 text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 rounded-md">
                        <Globe2 className="w-2.5 h-2.5" />
                        <span>{d.countryOfOrigin}</span>
                      </span>
                    )}
                    {d?.brand && (
                      <span className="inline-flex items-center space-x-1 text-[10px] font-semibold bg-purple-50 text-purple-800 border border-purple-200 px-1.5 py-0.5 rounded-md">
                        <Tag className="w-2.5 h-2.5" />
                        <span>{d.brand}</span>
                      </span>
                    )}
                    {!d?.countryOfOrigin && !d?.brand && (
                      <span className="text-[10px] text-slate-400 italic">তথ্য বাকি</span>
                    )}
                  </div>

                  {/* Short description */}
                  {d?.description ? (
                    <p className="text-[11px] text-slate-600 leading-relaxed mb-3 line-clamp-2 flex-1">
                      {d.description}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic mb-3 flex-1">
                      কোনো বিবরণ যোগ করা হয়নি।
                    </p>
                  )}

                  {/* Price */}
                  <div className="text-xs font-bold text-emerald-700 mb-3">
                    {formatCurrencyBDT(prod.sellingPrice)}
                    {prod.packageSize && (
                      <span className="text-slate-400 font-normal ml-1">
                        / {prod.packageSize}
                        {prod.packageUnit || (prod.categoryName === 'Perfume Products' ? 'ml' : 'g')}
                      </span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-auto">
                    <button
                      onClick={() => setViewProduct(prod)}
                      className="flex-1 flex items-center justify-center space-x-1.5 py-1.5 text-[11px] font-semibold bg-slate-900 hover:bg-slate-700 text-white rounded-xl transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>
                    {canModify && (
                      <button
                        onClick={() => openEdit(prod)}
                        className="flex items-center justify-center px-3 py-1.5 text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditing && productToEdit && (
        <EditModal
          product={productToEdit}
          form={editForm}
          setForm={setEditForm}
          onSave={handleSave}
          onClose={() => setIsEditing(false)}
          feedback={saveFeedback}
        />
      )}
    </div>
  );
};

// ── Shared Edit Modal ─────────────────────────────────────────────────────
const EditModal: React.FC<{
  product: Product;
  form: ProductDetailInfo;
  setForm: React.Dispatch<React.SetStateAction<ProductDetailInfo>>;
  onSave: () => void;
  onClose: () => void;
  feedback: { ok: boolean; msg: string } | null;
}> = ({ product, form, setForm, onSave, onClose, feedback }) => {
  const field = (
    label: string,
    key: keyof ProductDetailInfo,
    placeholder: string,
    isTextarea = false,
    rows = 2
  ) => (
    <div>
      <label className="block text-xs font-bold text-slate-700 mb-1">{label}</label>
      {isTextarea ? (
        <textarea
          rows={rows}
          value={(form[key] as string) || ''}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          placeholder={placeholder}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white resize-none"
        />
      ) : (
        <input
          type="text"
          value={(form[key] as string) || ''}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          placeholder={placeholder}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
        />
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 mb-1">
          <BookOpen className="w-5 h-5 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-900">প্রোডাক্ট তথ্য আপডেট</h2>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          {product.name}{' '}
          <span className="font-mono font-bold text-slate-700">({product.sku})</span>
        </p>

        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            {field('🌍 উৎপত্তির দেশ (Country of Origin)', 'countryOfOrigin', 'e.g. France, UAE, Bangladesh, India')}
            {field('🏷️ ব্র্যান্ড / কোম্পানি (Brand)', 'brand', 'e.g. L\'Oréal, Rasasi, Local Brand')}
          </div>

          {field(
            '📝 সংক্ষিপ্ত বিবরণ (Description) — কাস্টমারকে যা বলবেন',
            'description',
            'এই পণ্যটি সম্পর্কে সংক্ষেপে লিখুন যা ম্যানেজার কাস্টমারকে বলতে পারবেন...',
            true,
            3
          )}
        </div>

        {feedback && (
          <div
            className={`mt-3 p-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
              feedback.ok
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback.msg}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 mt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors"
          >
            বাতিল
          </button>
          <button
            onClick={onSave}
            className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center space-x-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>সংরক্ষণ করুন</span>
          </button>
        </div>
      </div>
    </div>
  );
};
