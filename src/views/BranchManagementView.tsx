import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Branch } from '../types';
import {
  Building2,
  Plus,
  MapPin,
  Phone,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Boxes,
  TrendingUp,
  Users,
  X,
  Check,
  Lock,
} from 'lucide-react';
import { formatCurrencyBDT } from '../utils/stockCalculations';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';

export const BranchManagementView: React.FC = () => {
  const {
    branches,
    addBranch,
    updateBranch,
    deleteBranchSafe,
    checkBranchDeletable,
    branchStocks,
    sales,
    users,
    currentUser,
    setSelectedBranchId,
    setActiveTab,
    canAdd,
    canEdit,
    canDelete,
  } = useApp();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  // Safe delete modal state
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [deleteCheckResult, setDeleteCheckResult] = useState<{
    canDelete: boolean;
    reason?: string;
    activeStockUnits?: number;
    transactionCount?: number;
  } | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Super Admin / Admin check
  if (currentUser.role === 'manager') {
    return (
      <div className="bg-white rounded-xl p-8 border border-slate-200 text-center max-w-lg mx-auto shadow-xs">
        <Lock className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-500 mt-1">
          Branch management is restricted to Super Admin and Admin roles.
        </p>
      </div>
    );
  }

  const openAddModal = () => {
    setFormName('');
    setFormCode(`B-BR-${Math.floor(10 + Math.random() * 90)}`);
    setFormAddress('');
    setFormContact('+880 1711-');
    setFormIsActive(true);
    setFormError('');
    setFormSuccess('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (b: Branch) => {
    setEditingBranch(b);
    setFormName(b.name);
    setFormCode(b.code);
    setFormAddress(b.address);
    setFormContact(b.contactNumber);
    setFormIsActive(b.isActive);
    setFormError('');
    setFormSuccess('');
  };

  const handleOpenDelete = (b: Branch) => {
    const check = checkBranchDeletable(b.id);
    setDeleteCheckResult(check);
    setBranchToDelete(b);
  };

  const handleConfirmDelete = () => {
    if (!branchToDelete) return;
    deleteBranchSafe(branchToDelete.id, currentUser.role === 'super_admin' ? 'force_delete' : 'delete');
    setBranchToDelete(null);
  };

  const handleConfirmDeactivate = () => {
    if (!branchToDelete) return;
    deleteBranchSafe(branchToDelete.id, 'deactivate');
    setBranchToDelete(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formName.trim()) {
      setFormError('Branch Name is required.');
      return;
    }
    if (!formCode.trim()) {
      setFormError('Branch Code is required.');
      return;
    }

    if (editingBranch) {
      const res = updateBranch(editingBranch.id, {
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        address: formAddress.trim(),
        contactNumber: formContact.trim(),
        isActive: formIsActive,
      });

      if (res.success) {
        setFormSuccess('Branch updated successfully!');
        setTimeout(() => setEditingBranch(null), 600);
      } else {
        setFormError(res.message);
      }
    } else {
      const res = addBranch({
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        address: formAddress.trim(),
        contactNumber: formContact.trim(),
        isActive: formIsActive,
      });

      if (res.success) {
        setFormSuccess('Branch created successfully!');
        setTimeout(() => setIsAddModalOpen(false), 600);
      } else {
        setFormError(res.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Branch Management — Outlets & Warehouses</h1>
            <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded border border-emerald-200">
              Multi-Branch Architecture
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Maintain retail branches, showroom locations, stock rooms, and central distribution hubs.
          </p>
        </div>

        {(currentUser.role === 'super_admin' || canAdd) && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Branch</span>
          </button>
        )}
      </div>

      {/* Branch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {branches.map((branch) => {
          const branchStockUnits = branchStocks
            .filter((s) => s.branchId === branch.id)
            .reduce((sum, s) => sum + s.currentStock, 0);

          const branchSalesToday = sales
            .filter((s) => s.branchId === branch.id && s.date === '2026-10-24' && s.status === 'completed')
            .reduce((sum, s) => sum + s.totalSalesAmount, 0);

          const assignedStaff = users.filter((u) => u.branchId === branch.id);

          return (
            <div
              key={branch.id}
              className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 hover:shadow-md transition-shadow relative flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 font-bold flex items-center justify-center text-sm shadow-xs">
                      {branch.code.substring(0, 3)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{branch.name}</h3>
                      <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {branch.code}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    {(currentUser.role === 'super_admin' || canEdit) && (
                      <button
                        onClick={() => openEditModal(branch)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                        title="Edit Branch"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {(currentUser.role === 'super_admin' || canDelete) && (
                      <button
                        onClick={() => handleOpenDelete(branch)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                        title="Delete / Deactivate Branch"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        branch.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {branch.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Contact and Location */}
                <div className="py-3 text-xs space-y-1.5 text-slate-600 border-b border-slate-100 mt-2">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{branch.address}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono">{branch.contactNumber}</span>
                  </div>
                </div>

                {/* Stats Footer */}
                <div className="pt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <p className="text-[10px] text-slate-400 font-semibold">Stock On-Hand</p>
                    <p className="font-bold text-slate-900 mt-0.5">{branchStockUnits} units</p>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <p className="text-[10px] text-emerald-700 font-semibold">Sales Today</p>
                    <p className="font-bold text-emerald-800 mt-0.5">{formatCurrencyBDT(branchSalesToday)}</p>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <p className="text-[10px] text-slate-400 font-semibold">Assigned Staff</p>
                    <p className="font-bold text-slate-900 mt-0.5">{assignedStaff.length} user(s)</p>
                  </div>
                </div>
              </div>

              {/* Quick Jump */}
              <div className="mt-4 pt-2 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => {
                    setSelectedBranchId(branch.id);
                    setActiveTab('current-stock');
                  }}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                >
                  View Branch Stock Ledger &rarr;
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Branch Modal */}
      {(isAddModalOpen || editingBranch) && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingBranch(null);
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              <span>{editingBranch ? 'Edit Branch' : 'Add New Branch (Best Heritage)'}</span>
            </h3>

            {formError && (
              <div className="mt-3 p-2 bg-rose-50 text-rose-700 text-xs rounded border border-rose-200">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="mt-3 p-2 bg-emerald-50 text-emerald-700 text-xs rounded border border-emerald-200 flex items-center space-x-1">
                <Check className="w-4 h-4" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Branch Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Uttara Express Outlet"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Branch Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B-UTR-05"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Address *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Sector 7, Rabindra Sarani, Uttara, Dhaka-1230"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="+880 1711-XXXXXX"
                  value={formContact}
                  onChange={(e) => setFormContact(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActiveBranch"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="isActiveBranch" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Active Outlet (Accepts Stock & Sales)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingBranch(null);
                  }}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow"
                >
                  {editingBranch ? 'Update Branch' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Safe Delete Modal */}
      {branchToDelete && deleteCheckResult && (
        <DeleteConfirmationModal
          isOpen={!!branchToDelete}
          title="Delete Branch"
          itemName={branchToDelete.name}
          itemType="Branch"
          canDelete={deleteCheckResult.canDelete}
          blockReason={deleteCheckResult.reason}
          hasHistory={(deleteCheckResult.transactionCount || 0) > 0 || (deleteCheckResult.activeStockUnits || 0) > 0}
          isSuperAdmin={currentUser.role === 'super_admin'}
          onConfirmDelete={handleConfirmDelete}
          onConfirmForceDelete={handleConfirmDelete}
          onConfirmArchive={handleConfirmDeactivate}
          onClose={() => setBranchToDelete(null)}
        />
      )}
    </div>
  );
};
