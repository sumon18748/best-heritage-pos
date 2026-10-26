import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './views/DashboardView';
import { ProductsView } from './views/ProductsView';
import { StockInView } from './views/StockInView';
import { StockOutView } from './views/StockOutView';
import { SalesEntryView } from './views/SalesEntryView';
import { SalesHistoryView } from './views/SalesHistoryView';
import { CurrentStockView } from './views/CurrentStockView';
import { StockAlertsView } from './views/StockAlertsView';
import { BranchManagementView } from './views/BranchManagementView';
import { BranchTransfersView } from './views/BranchTransfersView';
import { CashBankExpensesView } from './views/CashBankExpensesView';
import { ReportsView } from './views/ReportsView';
import { UserManagementView } from './views/UserManagementView';
import { SettingsView } from './views/SettingsView';
import { LoginView } from './views/LoginView';
import { Menu, X, LayoutDashboard, ShoppingCart, Boxes, AlertTriangle, Lock } from 'lucide-react';

const MainContent: React.FC = () => {
  const { activeTab, setActiveTab, currentUser, userPermissions, isAuthenticated } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const renderActiveView = () => {
    // Check permission for active tab
    const isAllowed = currentUser.role === 'super_admin' || (userPermissions?.allowedTabs && userPermissions.allowedTabs.includes(activeTab));

    if (!isAllowed) {
      return (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center max-w-lg mx-auto shadow-xs mt-10">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Module Access Restricted</h2>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Your user account has not been granted permission to access the <strong>{activeTab.replace('-', ' ')}</strong> module. Please contact the Super Administrator.
          </p>
          {userPermissions.allowedTabs.length > 0 && (
            <button
              onClick={() => setActiveTab(userPermissions.allowedTabs[0])}
              className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Go to {userPermissions.allowedTabs[0].replace('-', ' ')}
            </button>
          )}
        </div>
      );
    }
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'products':
        return <ProductsView />;
      case 'stock-in':
        return <StockInView />;
      case 'stock-out':
        return <StockOutView />;
      case 'sales-entry':
        return <SalesEntryView />;
      case 'sales-history':
        return <SalesHistoryView />;
      case 'current-stock':
        return <CurrentStockView />;
      case 'stock-alerts':
        return <StockAlertsView />;
      case 'branches':
        return <BranchManagementView />;
      case 'transfers':
        return <BranchTransfersView />;
      case 'expenses':
        return <CashBankExpensesView />;
      case 'reports':
        return <ReportsView />;
      case 'users':
        return <UserManagementView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="h-[100dvh] w-full max-w-full overflow-hidden bg-slate-100 flex flex-col font-sans text-slate-800 antialiased selection:bg-emerald-500 selection:text-white">
      <Header />

      {/* Mobile Top Sub-bar */}
      <div className="md:hidden shrink-0 bg-slate-900 border-b border-slate-800 px-3 py-2 flex items-center justify-between text-white">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex items-center space-x-2 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 transition-colors cursor-pointer"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X className="w-4 h-4 text-emerald-400" /> : <Menu className="w-4 h-4 text-emerald-400" />}
          <span className="capitalize">{activeTab.replace('-', ' ')}</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('sales-entry')}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="New Sale (POS)"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold">POS</span>
          </button>
          <button
            onClick={() => setActiveTab('stock-alerts')}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-rose-400 transition-colors cursor-pointer"
            title="Stock Alerts"
          >
            <AlertTriangle className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Desktop Sidebar: stays pinned on the left */}
        <div className="hidden md:block shrink-0 h-full overflow-hidden">
          <Sidebar />
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-50 md:hidden bg-black/60 flex animate-in fade-in duration-150"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              className="w-72 max-w-[85vw] bg-slate-900 h-full overflow-y-auto shadow-2xl animate-in slide-in-from-left duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <Sidebar onItemClick={() => setMobileMenuOpen(false)} />
            </div>
          </div>
        )}

        {/* Main Workspace Body: Only this part scrolls */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 p-3 sm:p-5 lg:p-6">
          <div className="max-w-7xl mx-auto w-full">
            {renderActiveView()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
