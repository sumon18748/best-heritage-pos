import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  User,
  UserRole,
  ActiveTab,
  UserPermissions,
  OperatingExpense,
  ExpenseCategory,
  ExpenseCategoryItem,
  ExpensePaymentSource,
} from '../types';
import {
  Users,
  Plus,
  Shield,
  ShieldCheck,
  UserCheck,
  Building2,
  Mail,
  Phone,
  Edit2,
  Trash2,
  X,
  Check,
  Lock,
  ArrowRightLeft,
  CheckCheck,
  Sliders,
  RotateCcw,
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  ReceiptText,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet,
  FileSpreadsheet,
  Settings,
  Search,
  Receipt,
  TrendingDown,
  Coins,
  Building,
  Tag,
  FolderPlus,
} from 'lucide-react';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import {
  ALL_NAV_MENUS,
  ASSIGNABLE_NAV_MENUS,
  getDefaultPermissionsForRole,
  PERMISSION_PRESETS,
} from '../utils/permissionUtils';
import { formatCurrencyBDT } from '../utils/stockCalculations';

export const UserManagementView: React.FC = () => {
  const {
    users,
    branches,
    addUser,
    updateUser,
    deleteUserSafe,
    checkUserDeletable,
    currentUser,
    setCurrentUser,
    updateUserPermissions,
    rolePermissions,
    updateRolePermissions,
    expenses,
    updateExpense,
    deleteExpense,
    expenseCategories,
    addExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory,
    getNextUserId,
  } = useApp();

  // Super Admin View Tabs: 'role_permissions', 'user_accounts', 'expense_management'
  const [adminSubTab, setAdminSubTab] = useState<'role_permissions' | 'user_accounts' | 'expense_management'>('role_permissions');

  // Role Permissions Configuration State
  const [targetRole, setTargetRole] = useState<'manager' | 'admin'>('manager');
  const [roleAllowedTabs, setRoleAllowedTabs] = useState<ActiveTab[]>(() => {
    return rolePermissions?.manager?.allowedTabs || getDefaultPermissionsForRole('manager').allowedTabs;
  });
  const [roleCanAdd, setRoleCanAdd] = useState<boolean>(() => {
    return rolePermissions?.manager?.canAdd ?? true;
  });
  const [roleCanEdit, setRoleCanEdit] = useState<boolean>(() => {
    return rolePermissions?.manager?.canEdit ?? false;
  });
  const [roleCanDelete, setRoleCanDelete] = useState<boolean>(() => {
    return rolePermissions?.manager?.canDelete ?? false;
  });
  const [roleCanViewProfit, setRoleCanViewProfit] = useState<boolean>(() => {
    return rolePermissions?.manager?.canViewProfit ?? false;
  });
  const [roleCanVoidSale, setRoleCanVoidSale] = useState<boolean>(() => {
    return rolePermissions?.manager?.canVoidSale ?? false;
  });
  const [roleSyncAllUsers, setRoleSyncAllUsers] = useState<boolean>(true);
  const [roleSaveSuccess, setRoleSaveSuccess] = useState<string>('');

  // Individual User Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Safe delete modal state
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteCheckResult, setDeleteCheckResult] = useState<{
    canDelete: boolean;
    reason?: string;
    transactionCount?: number;
  } | null>(null);

  // Individual user permissions modal state
  const [permissionUser, setPermissionUser] = useState<User | null>(null);
  const [permAllowedTabs, setPermAllowedTabs] = useState<ActiveTab[]>([]);
  const [permCanAdd, setPermCanAdd] = useState(true);
  const [permCanEdit, setPermCanEdit] = useState(false);
  const [permCanDelete, setPermCanDelete] = useState(false);
  const [permCanViewProfit, setPermCanViewProfit] = useState(false);
  const [permCanVoidSale, setPermCanVoidSale] = useState(false);
  const [permissionSuccess, setPermissionSuccess] = useState('');

  // Form states for Users
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('manager');
  const [formBranchId, setFormBranchId] = useState<string>(branches[0]?.id || '');
  const [formPhone, setFormPhone] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // ==========================================
  // Super Admin Expense Management State
  // ==========================================
  const [expenseSubMode, setExpenseSubMode] = useState<'vouchers' | 'categories'>('vouchers');
  const [expSearchQuery, setExpSearchQuery] = useState('');
  const [expSelectedBranch, setExpSelectedBranch] = useState('all');
  const [expSelectedCategory, setExpSelectedCategory] = useState('all');
  const [expSelectedSource, setExpSelectedSource] = useState('all');
  const [expNotice, setExpNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit Expense State (Super Admin Only)
  const [editingExpense, setEditingExpense] = useState<OperatingExpense | null>(null);
  const [expEditForm, setExpEditForm] = useState({
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

  // Add / Edit Expense Category Modal state
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<ExpenseCategoryItem | null>(null);
  const [catFormName, setCatFormName] = useState('');
  const [catFormDesc, setCatFormDesc] = useState('');
  const [catFormError, setCatFormError] = useState('');
  const [deletingCat, setDeletingCat] = useState<ExpenseCategoryItem | null>(null);

  // Filtered expenses for Super Admin view
  const filteredSuperAdminExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (expSelectedBranch !== 'all' && e.branchId !== expSelectedBranch) return false;
      if (expSelectedCategory !== 'all' && e.category !== expSelectedCategory) return false;
      if (expSelectedSource !== 'all' && e.paymentSource !== expSelectedSource) return false;
      if (expSearchQuery.trim()) {
        const q = expSearchQuery.toLowerCase();
        const matches =
          e.voucherNo.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          e.branchName.toLowerCase().includes(q) ||
          (e.vendorName && e.vendorName.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [expenses, expSelectedBranch, expSelectedCategory, expSelectedSource, expSearchQuery]);

  // Financial summary for filtered expenses
  const expTotalAmount = useMemo(() => {
    return filteredSuperAdminExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredSuperAdminExpenses]);

  const expCashAmount = useMemo(() => {
    return filteredSuperAdminExpenses
      .filter((e) => e.paymentSource === 'Physical Cash')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [filteredSuperAdminExpenses]);

  const expBankAmount = useMemo(() => {
    return filteredSuperAdminExpenses
      .filter((e) => e.paymentSource === 'Bank Account')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [filteredSuperAdminExpenses]);

  // Sync form when targetRole changes
  const handleSelectTargetRole = (role: 'manager' | 'admin') => {
    setTargetRole(role);
    const perms = rolePermissions[role] || getDefaultPermissionsForRole(role);
    setRoleAllowedTabs([...perms.allowedTabs]);
    setRoleCanAdd(perms.canAdd);
    setRoleCanEdit(perms.canEdit);
    setRoleCanDelete(perms.canDelete);
    setRoleCanViewProfit(perms.canViewProfit);
    setRoleCanVoidSale(perms.canVoidSale);
    setRoleSaveSuccess('');
  };

  // Keep role state in sync if rolePermissions changes externally
  useEffect(() => {
    const perms = rolePermissions[targetRole] || getDefaultPermissionsForRole(targetRole);
    setRoleAllowedTabs([...perms.allowedTabs]);
    setRoleCanAdd(perms.canAdd);
    setRoleCanEdit(perms.canEdit);
    setRoleCanDelete(perms.canDelete);
    setRoleCanViewProfit(perms.canViewProfit);
    setRoleCanVoidSale(perms.canVoidSale);
  }, [targetRole, rolePermissions]);

  // Strictly guard: Only Super Admin can access this panel
  if (currentUser.role !== 'super_admin') {
    return (
      <div className="bg-white rounded-xl p-8 border border-slate-200 text-center max-w-lg mx-auto shadow-xs">
        <Lock className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-500 mt-1">
          Only Super Admin has authorization to access the Super Admin Panel and configure system permissions or edit expenses.
        </p>
      </div>
    );
  }

  // Role tab toggle
  const toggleRoleTab = (tabId: ActiveTab) => {
    setRoleAllowedTabs((prev) =>
      prev.includes(tabId) ? prev.filter((t) => t !== tabId) : [...prev, tabId]
    );
  };

  // Role presets
  const handleSelectAllRoleTabs = () => {
    setRoleAllowedTabs(ASSIGNABLE_NAV_MENUS.map((m) => m.id));
  };

  const handleDeselectAllRoleTabs = () => {
    setRoleAllowedTabs(['dashboard']); // Keep at least dashboard
  };

  const handleApplyRolePreset = (presetPerms: UserPermissions) => {
    setRoleAllowedTabs([...presetPerms.allowedTabs]);
    setRoleCanAdd(presetPerms.canAdd);
    setRoleCanEdit(presetPerms.canEdit);
    setRoleCanDelete(presetPerms.canDelete);
    setRoleCanViewProfit(presetPerms.canViewProfit);
    setRoleCanVoidSale(presetPerms.canVoidSale);
  };

  const handleResetRoleToDefault = () => {
    const defaultPerms = getDefaultPermissionsForRole(targetRole);
    handleApplyRolePreset(defaultPerms);
  };

  // Save role permissions
  const handleSaveRolePermissions = () => {
    const newPerms: UserPermissions = {
      allowedTabs: roleAllowedTabs,
      canAdd: roleCanAdd,
      canEdit: roleCanEdit,
      canDelete: roleCanDelete,
      canViewProfit: roleCanViewProfit,
      canVoidSale: roleCanVoidSale,
    };

    const res = updateRolePermissions(targetRole, newPerms, roleSyncAllUsers);
    if (res.success) {
      setRoleSaveSuccess(res.message);
      setTimeout(() => {
        setRoleSaveSuccess('');
      }, 5000);
    }
  };

  // Helper to get first user of a role for instant live testing
  const firstUserOfTargetRole = users.find((u) => u.role === targetRole && u.status === 'active');

  // Modal handlers for individual users
  const openAddModal = () => {
    setFormName('');
    setFormEmail('');
    setFormRole('manager');
    setFormBranchId(branches[0]?.id || '');
    setFormPhone('+880 1711-');
    setFormStatus('active');
    setFormError('');
    setFormSuccess('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setFormName(u.name);
    setFormEmail(u.email);
    setFormRole(u.role);
    setFormBranchId(u.branchId || branches[0]?.id || '');
    setFormPhone(u.phone || '');
    setFormStatus(u.status);
    setFormError('');
    setFormSuccess('');
  };

  const openPermissionsModal = (u: User) => {
    const currentPerms = u.permissions || rolePermissions[u.role] || getDefaultPermissionsForRole(u.role);
    setPermissionUser(u);
    setPermAllowedTabs([...currentPerms.allowedTabs]);
    setPermCanAdd(currentPerms.canAdd);
    setPermCanEdit(currentPerms.canEdit);
    setPermCanDelete(currentPerms.canDelete);
    setPermCanViewProfit(currentPerms.canViewProfit);
    setPermCanVoidSale(currentPerms.canVoidSale);
    setPermissionSuccess('');
  };

  const toggleIndividualTab = (tabId: ActiveTab) => {
    setPermAllowedTabs((prev) =>
      prev.includes(tabId) ? prev.filter((t) => t !== tabId) : [...prev, tabId]
    );
  };

  const handleSaveIndividualPermissions = () => {
    if (!permissionUser) return;

    const newPermissions: UserPermissions = {
      allowedTabs: permAllowedTabs,
      canAdd: permCanAdd,
      canEdit: permCanEdit,
      canDelete: permCanDelete,
      canViewProfit: permCanViewProfit,
      canVoidSale: permCanVoidSale,
    };

    const res = updateUserPermissions(permissionUser.id, newPermissions);
    if (res.success) {
      setPermissionSuccess('User individual permissions updated successfully!');
      setTimeout(() => {
        setPermissionUser(null);
        setPermissionSuccess('');
      }, 700);
    }
  };

  const handleOpenDelete = (u: User) => {
    const check = checkUserDeletable(u.id);
    setDeleteCheckResult(check);
    setUserToDelete(u);
  };

  const handleConfirmDelete = () => {
    if (!userToDelete) return;
    deleteUserSafe(userToDelete.id);
    setUserToDelete(null);
  };

  const handleConfirmDeactivate = () => {
    if (!userToDelete) return;
    updateUser(userToDelete.id, { status: 'inactive' });
    setUserToDelete(null);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formName.trim()) {
      setFormError('User Name is required.');
      return;
    }

    if (!formEmail.trim() || !formEmail.includes('@')) {
      setFormError('Valid corporate email address is required.');
      return;
    }

    if (editingUser) {
      const res = updateUser(editingUser.id, {
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        role: formRole,
        branchId: formRole === 'manager' ? formBranchId : undefined,
        phone: formPhone.trim(),
        status: formStatus,
      });

      if (res.success) {
        setFormSuccess('User profile updated successfully!');
        setTimeout(() => {
          setEditingUser(null);
          setFormSuccess('');
        }, 500);
      } else {
        setFormError(res.message);
      }
    } else {
      const defaultPerms = rolePermissions[formRole] || getDefaultPermissionsForRole(formRole);
      const res = addUser({
        username: getNextUserId(),
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        role: formRole,
        branchId: formRole === 'manager' ? formBranchId : undefined,
        phone: formPhone.trim(),
        status: formStatus,
        permissions: defaultPerms,
      });

      if (res.success) {
        setFormSuccess('User created successfully!');
        setTimeout(() => {
          setIsAddModalOpen(false);
          setFormSuccess('');
        }, 500);
      } else {
        setFormError(res.message);
      }
    }
  };

  // ==========================================
  // Expense Edit & Delete Handlers (Super Admin)
  // ==========================================
  const handleOpenEditExpense = (exp: OperatingExpense) => {
    setEditingExpense(exp);
    setExpEditForm({
      date: exp.date,
      branchId: exp.branchId,
      category: exp.category,
      amount: exp.amount.toString(),
      paymentSource: exp.paymentSource,
      description: exp.description,
      vendorName: exp.vendorName || '',
    });
  };

  const handleSaveEditExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    const amountNum = parseFloat(expEditForm.amount);
    if (!amountNum || amountNum <= 0) {
      setExpNotice({ type: 'error', message: 'Valid expense amount is required.' });
      return;
    }
    const res = updateExpense(editingExpense.id, {
      date: expEditForm.date,
      branchId: expEditForm.branchId,
      category: expEditForm.category,
      amount: amountNum,
      paymentSource: expEditForm.paymentSource,
      description: expEditForm.description.trim(),
      vendorName: expEditForm.vendorName.trim(),
    });
    if (res.success) {
      setExpNotice({ type: 'success', message: res.message });
      setEditingExpense(null);
      setTimeout(() => setExpNotice(null), 4000);
    } else {
      setExpNotice({ type: 'error', message: res.message });
    }
  };

  const handleConfirmDeleteExpense = () => {
    if (!deletingExpense) return;
    const res = deleteExpense(deletingExpense.id);
    if (res.success) {
      setExpNotice({ type: 'success', message: res.message });
      setDeletingExpense(null);
      setTimeout(() => setExpNotice(null), 4000);
    } else {
      setExpNotice({ type: 'error', message: res.message });
    }
  };

  // ==========================================
  // Category Add / Edit / Delete Handlers
  // ==========================================
  const handleOpenAddCategory = () => {
    setEditingCat(null);
    setCatFormName('');
    setCatFormDesc('');
    setCatFormError('');
    setIsCatModalOpen(true);
  };

  const handleOpenEditCategory = (cat: ExpenseCategoryItem) => {
    setEditingCat(cat);
    setCatFormName(cat.name);
    setCatFormDesc(cat.description || '');
    setCatFormError('');
    setIsCatModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setCatFormError('');

    if (!catFormName.trim()) {
      setCatFormError('Category name is required.');
      return;
    }

    if (editingCat) {
      const res = updateExpenseCategory(editingCat.id, catFormName, catFormDesc);
      if (res.success) {
        setExpNotice({ type: 'success', message: res.message });
        setIsCatModalOpen(false);
        setTimeout(() => setExpNotice(null), 4000);
      } else {
        setCatFormError(res.message);
      }
    } else {
      const res = addExpenseCategory(catFormName, catFormDesc);
      if (res.success) {
        setExpNotice({ type: 'success', message: res.message });
        setIsCatModalOpen(false);
        setTimeout(() => setExpNotice(null), 4000);
      } else {
        setCatFormError(res.message);
      }
    }
  };

  const handleConfirmDeleteCategory = () => {
    if (!deletingCat) return;
    const res = deleteExpenseCategory(deletingCat.id);
    if (res.success) {
      setExpNotice({ type: 'success', message: res.message });
      setDeletingCat(null);
      setTimeout(() => setExpNotice(null), 4000);
    } else {
      setExpNotice({ type: 'error', message: res.message });
      setDeletingCat(null);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">Super Admin</span>;
      case 'admin':
        return <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300">Admin</span>;
      case 'manager':
        return <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">Manager</span>;
    }
  };

  // Group assignable menus for clear presentation
  const coreMenus = ASSIGNABLE_NAV_MENUS.filter((m) => m.category === 'core');
  const opMenus = ASSIGNABLE_NAV_MENUS.filter((m) => m.category === 'operations');
  const financeMenus = ASSIGNABLE_NAV_MENUS.filter((m) => m.category === 'finance');
  const adminMenus = ASSIGNABLE_NAV_MENUS.filter((m) => m.category === 'admin');

  const managersCount = users.filter((u) => u.role === 'manager').length;
  const adminsCount = users.filter((u) => u.role === 'admin').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Super Admin Panel — Master System Control</h1>
            <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200">
              Master Access Control
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure role menu visibility, manage user accounts, and execute exclusive Super Admin actions like editing/deleting expenses or creating expense heads.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
          <button
            onClick={() => setAdminSubTab('role_permissions')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 cursor-pointer ${
              adminSubTab === 'role_permissions'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Role Menu Access</span>
          </button>
          <button
            onClick={() => setAdminSubTab('user_accounts')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 cursor-pointer ${
              adminSubTab === 'user_accounts'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>User Accounts ({users.length})</span>
          </button>
          <button
            onClick={() => setAdminSubTab('expense_management')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 cursor-pointer ${
              adminSubTab === 'expense_management'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Expense Control ({expenses.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ROLE MENU ACCESS CONTROLLER (MANAGER & ADMIN)                      */}
      {/* ========================================================================= */}
      {adminSubTab === 'role_permissions' && (
        <div className="space-y-6">
          {/* Role Selector Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Manager Card */}
            <div
              onClick={() => handleSelectTargetRole('manager')}
              className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                targetRole === 'manager'
                  ? 'bg-amber-50/70 border-amber-400 shadow-md ring-2 ring-amber-400/30'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    targetRole === 'manager' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Branch Manager Role</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Controls menu visibility for all showroom &amp; branch managers</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  {managersCount} Active Managers
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-amber-100/80 flex items-center justify-between text-[11px]">
                <span className="font-medium text-slate-600">
                  Allowed Menus: <strong>{rolePermissions?.manager?.allowedTabs.length || 0}</strong> of {ASSIGNABLE_NAV_MENUS.length}
                </span>
                {targetRole === 'manager' ? (
                  <span className="text-amber-700 font-bold flex items-center space-x-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Currently Editing</span>
                  </span>
                ) : (
                  <span className="text-slate-400 font-medium">Click to configure</span>
                )}
              </div>
            </div>

            {/* Admin Card */}
            <div
              onClick={() => handleSelectTargetRole('admin')}
              className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                targetRole === 'admin'
                  ? 'bg-blue-50/70 border-blue-400 shadow-md ring-2 ring-blue-400/30'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    targetRole === 'admin' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Administrator Role</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Controls menu visibility for central operations administrators</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  {adminsCount} System Admin
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-100/80 flex items-center justify-between text-[11px]">
                <span className="font-medium text-slate-600">
                  Allowed Menus: <strong>{rolePermissions?.admin?.allowedTabs.length || 0}</strong> of {ASSIGNABLE_NAV_MENUS.length}
                </span>
                {targetRole === 'admin' ? (
                  <span className="text-blue-700 font-bold flex items-center space-x-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Currently Editing</span>
                  </span>
                ) : (
                  <span className="text-slate-400 font-medium">Click to configure</span>
                )}
              </div>
            </div>
          </div>

          {/* Configuration Form Card */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${
              targetRole === 'manager' ? 'bg-amber-50/50 border-amber-100' : 'bg-blue-50/50 border-blue-100'
            }`}>
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <span>Allowed Menus &amp; Action Privileges for:</span>
                  <span className={`px-2 py-0.5 rounded text-xs uppercase font-extrabold ${
                    targetRole === 'manager' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-blue-100 text-blue-900 border border-blue-300'
                  }`}>
                    {targetRole === 'manager' ? 'Branch Manager' : 'Administrator'}
                  </span>
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Select which menus this role will see in their sidebar. Unchecked menus are completely hidden and access-blocked.
                </p>
              </div>

              {/* Quick Template Presets */}
              <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleSelectAllRoleTabs}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllRoleTabs}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                >
                  Clear All
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyRolePreset(PERMISSION_PRESETS[2].permissions)}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer shadow-2xs"
                  title="POS Cashier Only Template"
                >
                  POS Cashier Preset
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyRolePreset(PERMISSION_PRESETS[3].permissions)}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer shadow-2xs"
                  title="Inventory Warehouse Clerk Template"
                >
                  Warehouse Clerk Preset
                </button>
                <button
                  type="button"
                  onClick={handleResetRoleToDefault}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 cursor-pointer flex items-center space-x-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Default</span>
                </button>
              </div>
            </div>

            {/* Success alert */}
            {roleSaveSuccess && (
              <div className="m-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center space-x-2 text-xs font-semibold animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{roleSaveSuccess}</span>
              </div>
            )}

            {/* Menu Categories Checklist */}
            <div className="p-5 space-y-6">
              {/* Section 1: Core & Overview Menus */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <LayoutDashboard className="w-3.5 h-3.5 text-emerald-600" />
                  <span>1. Core &amp; Product Directory Menus</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {coreMenus.map((menu) => {
                    const isChecked = roleAllowedTabs.includes(menu.id);
                    return (
                      <label
                        key={menu.id}
                        onClick={() => toggleRoleTab(menu.id)}
                        className={`p-3 rounded-xl border flex items-start space-x-3 cursor-pointer transition-all select-none ${
                          isChecked
                            ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <span className={`font-bold text-xs block ${isChecked ? 'text-slate-900' : 'text-slate-600'}`}>
                            {menu.label}
                          </span>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{menu.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Inventory & Operations Menus */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <Boxes className="w-3.5 h-3.5 text-emerald-600" />
                  <span>2. Inventory Operations Menus</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {opMenus.filter((m) => !['sales-entry', 'sales-history'].includes(m.id)).map((menu) => {
                    const isChecked = roleAllowedTabs.includes(menu.id);
                    return (
                      <label
                        key={menu.id}
                        onClick={() => toggleRoleTab(menu.id)}
                        className={`p-3 rounded-xl border flex items-start space-x-3 cursor-pointer transition-all select-none ${
                          isChecked
                            ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <span className={`font-bold text-xs block ${isChecked ? 'text-slate-900' : 'text-slate-600'}`}>
                            {menu.label}
                          </span>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{menu.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: POS & Sales Billing */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
                  <span>3. Retail POS &amp; Sales Billing Menus</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {opMenus.filter((m) => ['sales-entry', 'sales-history'].includes(m.id)).map((menu) => {
                    const isChecked = roleAllowedTabs.includes(menu.id);
                    return (
                      <label
                        key={menu.id}
                        onClick={() => toggleRoleTab(menu.id)}
                        className={`p-3 rounded-xl border flex items-start space-x-3 cursor-pointer transition-all select-none ${
                          isChecked
                            ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <span className={`font-bold text-xs block ${isChecked ? 'text-slate-900' : 'text-slate-600'}`}>
                            {menu.label}
                          </span>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{menu.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Section 4: Finance & Administration Menus */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>4. Finance, Reports &amp; Administration Menus</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[...financeMenus, ...adminMenus].map((menu) => {
                    const isChecked = roleAllowedTabs.includes(menu.id);
                    return (
                      <label
                        key={menu.id}
                        onClick={() => toggleRoleTab(menu.id)}
                        className={`p-3 rounded-xl border flex items-start space-x-3 cursor-pointer transition-all select-none ${
                          isChecked
                            ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <span className={`font-bold text-xs block ${isChecked ? 'text-slate-900' : 'text-slate-600'}`}>
                            {menu.label}
                          </span>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{menu.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Action & CRUD Rights */}
              <div className="border-t border-slate-200 pt-5">
                <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                  <span>5. Operational &amp; CRUD Action Rights for this Role</span>
                </h4>
                <p className="text-[11px] text-slate-500 mb-3">
                  Control whether users with this role are allowed to add, edit, or delete items, view confidential margins, or void sales invoices.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Can Add */}
                  <label
                    onClick={() => setRoleCanAdd(!roleCanAdd)}
                    className={`p-3 rounded-xl border flex items-start space-x-3 cursor-pointer transition-all select-none ${
                      roleCanAdd ? 'bg-emerald-50/70 border-emerald-300' : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={roleCanAdd}
                      onChange={() => {}}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">+ Add / Create Rights</span>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                        Can add products, stock in/out, create sales, and record expenses.
                      </p>
                    </div>
                  </label>

                  {/* Can Edit */}
                  <label
                    onClick={() => setRoleCanEdit(!roleCanEdit)}
                    className={`p-3 rounded-xl border flex items-start space-x-3 cursor-pointer transition-all select-none ${
                      roleCanEdit ? 'bg-blue-50/70 border-blue-300' : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={roleCanEdit}
                      onChange={() => {}}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">✎ Edit / Update Rights</span>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                        Can edit master product parameters, pricing, and branch details.
                      </p>
                    </div>
                  </label>

                  {/* Can Delete */}
                  <label
                    onClick={() => setRoleCanDelete(!roleCanDelete)}
                    className={`p-3 rounded-xl border flex items-start space-x-3 cursor-pointer transition-all select-none ${
                      roleCanDelete ? 'bg-rose-50/70 border-rose-300' : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={roleCanDelete}
                      onChange={() => {}}
                      className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">🗑 Delete Rights</span>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                        Can delete products and remove records.
                      </p>
                    </div>
                  </label>

                  {/* Can View Profit */}
                  <label
                    onClick={() => setRoleCanViewProfit(!roleCanViewProfit)}
                    className={`p-3 rounded-xl border flex items-start space-x-3 cursor-pointer transition-all select-none ${
                      roleCanViewProfit ? 'bg-amber-50/70 border-amber-300' : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={roleCanViewProfit}
                      onChange={() => {}}
                      className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">$ View Profit &amp; COGS</span>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                        Show purchase cost, gross profit, and margin reports.
                      </p>
                    </div>
                  </label>

                  {/* Can Void Sale */}
                  <label
                    onClick={() => setRoleCanVoidSale(!roleCanVoidSale)}
                    className={`p-3 rounded-xl border flex items-start space-x-3 cursor-pointer transition-all select-none sm:col-span-2 ${
                      roleCanVoidSale ? 'bg-purple-50/70 border-purple-300' : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={roleCanVoidSale}
                      onChange={() => {}}
                      className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">↺ Void / Cancel Sales Invoices</span>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                        Can cancel completed POS sales invoices and return items to inventory balance.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label
                onClick={() => setRoleSyncAllUsers(!roleSyncAllUsers)}
                className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={roleSyncAllUsers}
                  onChange={() => {}}
                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="font-medium">
                  Apply immediately to all existing {targetRole === 'manager' ? 'Branch Managers' : 'Administrators'}
                </span>
              </label>

              <button
                type="button"
                onClick={handleSaveRolePermissions}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save {targetRole === 'manager' ? 'Branch Manager' : 'Administrator'} Permissions</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: USER ACCOUNTS & INDIVIDUAL OVERRIDES                                */}
      {/* ========================================================================= */}
      {adminSubTab === 'user_accounts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">User Accounts Directory</h3>
              <p className="text-xs text-slate-500 mt-0.5">Manage individual credentials, assign branch locations, or override permissions.</p>
            </div>
            <button
              onClick={openAddModal}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New User</span>
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">User Details</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Assigned Branch</th>
                    <th className="py-3 px-4">Menu &amp; Action Privileges</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Session Switch</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => {
                    const perms = u.permissions || rolePermissions[u.role] || getDefaultPermissionsForRole(u.role);
                    const allowedCount = u.role === 'super_admin' ? ALL_NAV_MENUS.length : perms.allowedTabs.length;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* User Details */}
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center text-xs shadow-xs">
                              {u.name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center space-x-1.5">
                                <p className="font-semibold text-slate-900">{u.name}</p>
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-mono border border-slate-200">
                                  ID: {u.username || '99999'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 font-mono">{u.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3 px-4">
                          {getRoleBadge(u.role)}
                        </td>

                        {/* Branch */}
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {u.role === 'manager' ? (
                            <span className="flex items-center space-x-1 text-slate-700">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              <span>{u.branchName || 'Unassigned'}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">All Branches (Global)</span>
                          )}
                        </td>

                        {/* Menu Access & Permissions Badges */}
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                                {allowedCount} of {ALL_NAV_MENUS.length} Menus
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1">
                              {perms.canAdd && (
                                <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                                  +Add
                                </span>
                              )}
                              {perms.canEdit && (
                                <span className="text-[9px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">
                                  ✎Edit
                                </span>
                              )}
                              {perms.canDelete && (
                                <span className="text-[9px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                                  🗑Delete
                                </span>
                              )}
                              {perms.canViewProfit && (
                                <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                                  $Profit
                                </span>
                              )}
                              {perms.canVoidSale && (
                                <span className="text-[9px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.2 rounded">
                                  ↺Void
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                              u.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>

                        {/* Switch Session */}
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setCurrentUser(u)}
                            disabled={currentUser.id === u.id}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded inline-flex items-center space-x-1 cursor-pointer transition-colors ${
                              currentUser.id === u.id
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                            title="Switch active user session to test permissions"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>{currentUser.id === u.id ? 'Current Active' : 'Switch To'}</span>
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center space-x-1">
                            {/* Individual Permissions Override */}
                            <button
                              onClick={() => openPermissionsModal(u)}
                              className="p-1.5 text-emerald-600 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                              title="Customize Individual User Permissions"
                            >
                              <Shield className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => openEditModal(u)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Edit User Info"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleOpenDelete(u)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete / Deactivate User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SUPER ADMIN EXPENSE CONTROL & AUDIT (EDIT / DELETE EXPENSES)       */}
      {/* ========================================================================= */}
      {adminSubTab === 'expense_management' && (
        <div className="space-y-5">
          {/* Header Card */}
          <div className="bg-linear-to-r from-slate-900 via-slate-800 to-emerald-950 p-5 rounded-2xl text-white shadow-md border border-slate-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="p-1.5 bg-emerald-600 text-white rounded-lg">
                    <Wallet className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-bold text-white">Super Admin Expense Master Control</h3>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Exclusive Super Admin privilege: Edit parameters or delete expense vouchers, and add/edit/delete custom expense heads &amp; categories.
                </p>
              </div>

              {/* Sub-mode Switcher: Vouchers vs Categories */}
              <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700 shrink-0">
                <button
                  onClick={() => setExpenseSubMode('vouchers')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
                    expenseSubMode === 'vouchers'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Expense Vouchers ({expenses.length})</span>
                </button>
                <button
                  onClick={() => setExpenseSubMode('categories')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
                    expenseSubMode === 'categories'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Expense Heads / Categories ({expenseCategories.length})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Action Notification Alert */}
          {expNotice && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center justify-between shadow-xs border ${
                expNotice.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{expNotice.message}</span>
              </div>
              <button onClick={() => setExpNotice(null)} className="font-bold text-slate-500 hover:text-slate-700 cursor-pointer">✕</button>
            </div>
          )}

          {/* SUB-VIEW 1: EXPENSE VOUCHERS LIST */}
          {expenseSubMode === 'vouchers' && (
            <div className="space-y-4">
              {/* KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs">
                    <span>Total Expenses Logged</span>
                    <TrendingDown className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="mt-2 text-xl font-bold text-rose-600 font-mono">
                    {formatCurrencyBDT(expTotalAmount)}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{filteredSuperAdminExpenses.length} total vouchers</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs">
                    <span>Physical Cash Outflow</span>
                    <Coins className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="mt-2 text-xl font-bold text-slate-800 font-mono">
                    {formatCurrencyBDT(expCashAmount)}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Deducted from cash till</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs">
                    <span>Bank / Card Outflow</span>
                    <Building className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="mt-2 text-xl font-bold text-slate-800 font-mono">
                    {formatCurrencyBDT(expBankAmount)}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Deducted from bank accounts</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs">
                    <span>Expense Heads Active</span>
                    <Tag className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="mt-2 text-xl font-bold text-slate-800 font-mono">
                    {expenseCategories.length} Categories
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Fully customizable by Super Admin</p>
                </div>
              </div>

              {/* Filter Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search voucher #, description, vendor, branch..."
                    value={expSearchQuery}
                    onChange={(e) => setExpSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Branch Filter */}
                  <select
                    value={expSelectedBranch}
                    onChange={(e) => setExpSelectedBranch(e.target.value)}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>

                  {/* Category Filter */}
                  <select
                    value={expSelectedCategory}
                    onChange={(e) => setExpSelectedCategory(e.target.value)}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Categories</option>
                    {expenseCategories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>

                  {/* Source Filter */}
                  <select
                    value={expSelectedSource}
                    onChange={(e) => setExpSelectedSource(e.target.value)}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Channels</option>
                    <option value="Physical Cash">Physical Cash</option>
                    <option value="Bank Account">Bank Account</option>
                  </select>
                </div>
              </div>

              {/* Expenses Table with Super Admin Edit & Delete Actions */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
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
                        <th className="py-3 px-4 text-center">Channel</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                        <th className="py-3 px-4 text-right">Logged By</th>
                        <th className="py-3 px-4 text-right">Super Admin Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSuperAdminExpenses.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-12 text-center text-slate-400">
                            <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            <p className="font-medium text-xs">No operating expense vouchers matching criteria.</p>
                          </td>
                        </tr>
                      ) : (
                        filteredSuperAdminExpenses.map((exp) => (
                          <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900 font-mono">{exp.voucherNo}</td>
                            <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{exp.date}</td>
                            <td className="py-3 px-4 font-medium text-slate-700">{exp.branchName}</td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                                {exp.category}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-700 max-w-xs truncate" title={exp.description}>
                              {exp.description}
                            </td>
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
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center space-x-1.5">
                                {/* Edit Expense Button */}
                                <button
                                  onClick={() => handleOpenEditExpense(exp)}
                                  className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Expense Voucher (Super Admin Only)"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>

                                {/* Delete Expense Button */}
                                <button
                                  onClick={() => setDeletingExpense(exp)}
                                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Expense Voucher (Super Admin Only)"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-VIEW 2: EXPENSE CATEGORIES / HEADS MANAGEMENT */}
          {expenseSubMode === 'categories' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                    <Tag className="w-4 h-4 text-emerald-600" />
                    <span>Expense Heads &amp; Categories Directory</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Create new expense categories (e.g. Others, Product Cost, Promotions), edit titles, or delete unused heads.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenAddCategory}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Expense Category</span>
                </button>
              </div>

              {/* Categories Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Category / Head Name</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4 text-center">Type</th>
                        <th className="py-3 px-4 text-center">Linked Vouchers</th>
                        <th className="py-3 px-4 text-right">Super Admin Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {expenseCategories.map((cat) => {
                        const usageCount = expenses.filter((e) => e.category === cat.name).length;
                        return (
                          <tr key={cat.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2">
                                <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-md">
                                  <Tag className="w-3.5 h-3.5" />
                                </span>
                                <span className="font-bold text-slate-900">{cat.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-600 max-w-md">
                              {cat.description || <span className="text-slate-400 italic">No description provided</span>}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  cat.isDefault
                                    ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                }`}
                              >
                                {cat.isDefault ? 'Standard Default' : 'Custom Super Admin'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  usageCount > 0
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {usageCount} voucher{usageCount !== 1 ? 's' : ''}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center space-x-1.5">
                                <button
                                  onClick={() => handleOpenEditCategory(cat)}
                                  className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Category Name & Description"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeletingCat(cat)}
                                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Expense Category"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Individual Permissions Modal */}
      {permissionUser && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setPermissionUser(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold flex items-center space-x-2">
                    <span>Individual Access Override</span>
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-slate-800 text-emerald-300 border border-slate-700">
                      {permissionUser.name}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Set custom menu visibility and CRUD permissions for this specific user.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPermissionUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-6 text-xs flex-1">
              {permissionSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center space-x-2 font-semibold">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{permissionSuccess}</span>
                </div>
              )}

              {/* Section 1: Navigation Menus Visibility */}
              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">
                  1. Allowed Navigation Menus ({permAllowedTabs.length} of {ASSIGNABLE_NAV_MENUS.length} selected)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {ASSIGNABLE_NAV_MENUS.map((menu) => {
                    const isChecked = permAllowedTabs.includes(menu.id);
                    return (
                      <label
                        key={menu.id}
                        onClick={() => toggleIndividualTab(menu.id)}
                        className={`p-3 rounded-xl border flex items-start space-x-3 cursor-pointer transition-all select-none ${
                          isChecked
                            ? 'bg-emerald-50/60 border-emerald-300 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 opacity-70'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <span className={`font-bold text-xs ${isChecked ? 'text-slate-900' : 'text-slate-600'}`}>
                            {menu.label}
                          </span>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{menu.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: CRUD & Action Rights */}
              <div className="border-t border-slate-100 pt-4">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">
                  2. Operational &amp; CRUD Action Permissions
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    onClick={() => setPermCanAdd(!permCanAdd)}
                    className={`p-3 rounded-xl border flex items-start space-x-3 cursor-pointer transition-all select-none ${
                      permCanAdd ? 'bg-emerald-50/60 border-emerald-300' : 'bg-slate-50 border-slate-200 opacity-70'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={permCanAdd}
                      onChange={() => {}}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">+ Add / Create Rights</span>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Allow creating records</p>
                    </div>
                  </label>

                  <label
                    onClick={() => setPermCanEdit(!permCanEdit)}
                    className={`p-3 rounded-xl border flex items-start space-x-3 cursor-pointer transition-all select-none ${
                      permCanEdit ? 'bg-blue-50/60 border-blue-300' : 'bg-slate-50 border-slate-200 opacity-70'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={permCanEdit}
                      onChange={() => {}}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">✎ Edit / Update Rights</span>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Allow editing records</p>
                    </div>
                  </label>

                  <label
                    onClick={() => setPermCanDelete(!permCanDelete)}
                    className={`p-3 rounded-xl border flex items-start space-x-3 cursor-pointer transition-all select-none ${
                      permCanDelete ? 'bg-rose-50/60 border-rose-300' : 'bg-slate-50 border-slate-200 opacity-70'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={permCanDelete}
                      onChange={() => {}}
                      className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">🗑 Delete Rights</span>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Allow deleting records</p>
                    </div>
                  </label>

                  <label
                    onClick={() => setPermCanViewProfit(!permCanViewProfit)}
                    className={`p-3 rounded-xl border flex items-start space-x-3 cursor-pointer transition-all select-none ${
                      permCanViewProfit ? 'bg-amber-50/60 border-amber-300' : 'bg-slate-50 border-slate-200 opacity-70'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={permCanViewProfit}
                      onChange={() => {}}
                      className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">$ View Gross Profit</span>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Display purchase costs &amp; margin</p>
                    </div>
                  </label>

                  <label
                    onClick={() => setPermCanVoidSale(!permCanVoidSale)}
                    className={`p-3 rounded-xl border flex items-start space-x-3 cursor-pointer transition-all select-none sm:col-span-2 ${
                      permCanVoidSale ? 'bg-purple-50/70 border-purple-300' : 'bg-slate-50 border-slate-200 opacity-70'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={permCanVoidSale}
                      onChange={() => {}}
                      className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">↺ Void / Cancel Sales Invoices</span>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Allow cancelling sales invoices</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500 font-medium">
                Target User: <strong className="text-slate-800">{permissionUser.name}</strong> ({permissionUser.role})
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setPermissionUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveIndividualPermissions}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Permissions</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit User Account Modal */}
      {(isAddModalOpen || editingUser) && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingUser(null);
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <span>{editingUser ? 'Edit User Account' : 'Add New Best Heritage User'}</span>
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

            <form onSubmit={handleSaveUser} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  User ID (5-Digit Login ID) *
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    disabled
                    value={editingUser ? (editingUser.username || '99999') : getNextUserId()}
                    className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-300 rounded-lg text-slate-800 font-mono font-bold cursor-not-allowed select-none"
                  />
                  <span className="text-[10px] font-bold px-2.5 py-1.5 bg-emerald-100 text-emerald-800 rounded-lg shrink-0 border border-emerald-200">
                    AUTO
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Unique 5-digit ID automatically assigned for user sign in.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="e.g. Arif Hossain"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email (Login Username) *</label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
                  placeholder="arif@bestheritagebd.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role *</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="manager">Branch Manager (Assigned to single branch)</option>
                  <option value="admin">Administrator (Multi-branch oversight)</option>
                  <option value="super_admin">Super Admin (Master system authority)</option>
                </select>
              </div>

              {formRole === 'manager' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Branch *</label>
                  <select
                    value={formBranchId}
                    onChange={(e) => setFormBranchId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="+880 1711-XXXXXX"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Super Admin Edit Expense Modal */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold">Super Admin: Edit Expense ({editingExpense.voucherNo})</h3>
              </div>
              <button onClick={() => setEditingExpense(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditExpense} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Expense Date *</label>
                  <input
                    type="date"
                    required
                    value={expEditForm.date}
                    onChange={(e) => setExpEditForm({ ...expEditForm, date: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Branch *</label>
                  <select
                    value={expEditForm.branchId}
                    onChange={(e) => setExpEditForm({ ...expEditForm, branchId: e.target.value })}
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
                  value={expEditForm.category}
                  onChange={(e) => setExpEditForm({ ...expEditForm, category: e.target.value as ExpenseCategory })}
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
                    value={expEditForm.amount}
                    onChange={(e) => setExpEditForm({ ...expEditForm, amount: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Payment Channel *</label>
                  <select
                    value={expEditForm.paymentSource}
                    onChange={(e) => setExpEditForm({ ...expEditForm, paymentSource: e.target.value as ExpensePaymentSource })}
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
                  value={expEditForm.description}
                  onChange={(e) => setExpEditForm({ ...expEditForm, description: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Vendor / Payee (Optional)</label>
                <input
                  type="text"
                  value={expEditForm.vendorName}
                  onChange={(e) => setExpEditForm({ ...expEditForm, vendorName: e.target.value })}
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

      {/* Super Admin Delete Expense Confirmation Modal */}
      {deletingExpense && (
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
                Are you sure you want to delete expense voucher <strong className="text-slate-900">{deletingExpense.voucherNo}</strong>?
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
                  <span>Channel:</span>
                  <span className="font-semibold text-slate-800">{deletingExpense.paymentSource}</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400">
                * Deletion reverses the cash deduction, immediately updating the cash till or bank balance.
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
                  onClick={handleConfirmDeleteExpense}
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

      {/* Super Admin Add / Edit Expense Category Modal */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Tag className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold">
                  {editingCat ? `Edit Category: ${editingCat.name}` : 'Add New Expense Head / Category'}
                </h3>
              </div>
              <button onClick={() => setIsCatModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-5 space-y-4">
              {catFormError && (
                <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
                  {catFormError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category / Head Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Others, Product Cost, Promotions, Courier"
                  value={catFormName}
                  onChange={(e) => setCatFormName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Explain what kind of expenses fall under this category..."
                  value={catFormDesc}
                  onChange={(e) => setCatFormDesc(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs cursor-pointer flex items-center space-x-1"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingCat ? 'Update Category' : 'Create Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Super Admin Delete Expense Category Confirmation Modal */}
      {deletingCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-rose-200 overflow-hidden">
            <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-rose-700">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm font-bold">Delete Expense Category</h3>
              </div>
              <button onClick={() => setDeletingCat(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 text-xs space-y-3">
              <p className="text-slate-600 leading-relaxed">
                Are you sure you want to delete expense category <strong className="text-slate-900">{deletingCat.name}</strong>?
              </p>

              {expenses.some((e) => e.category === deletingCat.name) ? (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-[11px] font-medium leading-relaxed">
                  ⚠️ This category cannot be deleted because it is currently linked to{' '}
                  <strong>{expenses.filter((e) => e.category === deletingCat.name).length}</strong> recorded expense voucher(s).
                  Please reassign or delete those vouchers first.
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">
                  This category is not used in any active vouchers and can be safely removed.
                </p>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setDeletingCat(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={expenses.some((e) => e.category === deletingCat.name)}
                  onClick={handleConfirmDeleteCategory}
                  className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-sm flex items-center space-x-1 ${
                    expenses.some((e) => e.category === deletingCat.name)
                      ? 'bg-slate-400 cursor-not-allowed opacity-60'
                      : 'bg-rose-600 hover:bg-rose-700 cursor-pointer'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirm Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for Users */}
      {userToDelete && deleteCheckResult && (
        <DeleteConfirmationModal
          isOpen={true}
          title="Delete / Deactivate User Account"
          itemName={userToDelete.name}
          itemType="User"
          canDelete={deleteCheckResult.canDelete}
          blockReason={deleteCheckResult.reason}
          hasHistory={(deleteCheckResult.transactionCount || 0) > 0}
          onConfirmDelete={handleConfirmDelete}
          onConfirmArchive={handleConfirmDeactivate}
          onClose={() => setUserToDelete(null)}
        />
      )}
    </div>
  );
};
