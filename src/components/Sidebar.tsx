import React from 'react';
import { useApp } from '../context/AppContext';
import { ActiveTab } from '../types';
import {
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  ShoppingCart,
  ReceiptText,
  Boxes,
  AlertTriangle,
  Building2,
  FileSpreadsheet,
  Users,
  Settings,
  ShieldCheck,
  UserCheck,
  ArrowLeftRight,
  Wallet,
  LogOut,
} from 'lucide-react';
import { calculateStockAlertStatus, isStockableBranch } from '../utils/stockCalculations';

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  badgeColor?: string;
  requiredRole?: 'super_admin' | 'admin';
}

interface SidebarProps {
  onItemClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onItemClick }) => {
  const {
    activeTab,
    setActiveTab,
    currentUser,
    products,
    branches,
    branchStocks,
    selectedBranchId,
    transfers,
    userPermissions,
    logout,
  } = useApp();

  const isBranchLocked = currentUser.role === 'manager' && !!currentUser.branchId;
  const effectiveBranchId = isBranchLocked ? currentUser.branchId! : selectedBranchId;

  const targetBranches = effectiveBranchId === 'all'
    ? branches.filter((b) => b.isActive && isStockableBranch(b))
    : branches.filter((b) => b.id === effectiveBranchId && b.isActive && isStockableBranch(b));

  let alertCount = 0;
  products.filter((p) => p.status !== 'inactive').forEach((prod) => {
    targetBranches.forEach((branch) => {
      const stock = branchStocks.find((s) => s.productId === prod.id && s.branchId === branch.id);
      const currentStock = stock ? Number(stock.currentStock) || 0 : 0;
      const minAlert = (stock && stock.minAlertLevel !== undefined && stock.minAlertLevel > 0)
        ? stock.minAlertLevel
        : (prod.minAlertLevel || 5);
      const status = calculateStockAlertStatus(currentStock, minAlert);
      if (status === 'low_stock' || status === 'out_of_stock') {
        alertCount++;
      }
    });
  });

  const pendingTransferCount = transfers.filter((t) => t.status === 'Dispatched').length;

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Product Catalog', icon: Package },
    { id: 'stock-in', label: 'Stock In', icon: ArrowDownToLine },
    { id: 'stock-out', label: 'Stock Out', icon: ArrowUpFromLine },
    { id: 'sales-entry', label: 'Sales Entry (POS)', icon: ShoppingCart },
    { id: 'sales-history', label: 'Sales History', icon: ReceiptText },
    { id: 'current-stock', label: 'Current Stock', icon: Boxes },
    {
      id: 'stock-alerts',
      label: 'Stock Alerts',
      icon: AlertTriangle,
      badge: alertCount > 0 ? alertCount : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'transfers',
      label: 'Branch Transfers',
      icon: ArrowLeftRight,
      badge: pendingTransferCount > 0 ? pendingTransferCount : undefined,
      badgeColor: 'bg-indigo-500 text-white',
    },
    {
      id: 'expenses',
      label: 'Cash & Expenses',
      icon: Wallet,
    },
    { id: 'branches', label: 'Branch Management', icon: Building2 },
    { id: 'reports', label: 'Reports & Statements', icon: FileSpreadsheet },
    {
      id: 'users',
      label: 'Super Admin Panel',
      icon: ShieldCheck,
      requiredRole: 'super_admin',
    },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 h-full overflow-y-auto">
      <div className="py-4 px-3 space-y-1">
        {/* Mobile Drawer Branding Header */}
        <div className="md:hidden px-3 pt-1 pb-3 mb-2 border-b border-slate-800 flex items-center space-x-2.5">
          <img
            src="/logo.jpg"
            alt="Best Heritage Foods"
            className="w-9 h-9 rounded-lg object-cover bg-emerald-950 p-0.5 border border-emerald-500/40 shrink-0"
          />
          <div>
            <div className="font-bold text-sm text-white font-serif tracking-tight">BEST HERITAGE</div>
            <div className="text-[10px] text-emerald-400 font-medium">Foods & Multi-Branch</div>
          </div>
        </div>

        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Inventory & Sales
        </div>

        {navItems.map((item) => {
          if (currentUser.role !== 'super_admin') {
            if (item.requiredRole === 'super_admin') {
              return null;
            }
            if (userPermissions?.allowedTabs && !userPermissions.allowedTabs.includes(item.id)) {
              return null;
            }
          }

          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                onItemClick?.();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ${
                    item.badgeColor || 'bg-slate-700 text-slate-200'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Logout button at bottom of sidebar */}
      <div className="p-3 border-t border-slate-800">
        <button
          onClick={() => {
            logout();
            onItemClick?.();
          }}
          className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-900/40 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-rose-400" />
          <span>Sign Out</span>
        </button>
      </div>

    </aside>
  );
};
