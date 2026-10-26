import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Building2,
  Bell,
  RefreshCw,
  ChevronDown,
  Check,
  CheckCheck,
  ShoppingCart,
  AlertTriangle,
  ArrowRight,
  ArrowLeftRight,
  CheckCircle2,
  User,
  KeyRound,
  ShieldCheck,
  UserCog,
  X,
  Eye,
  EyeOff,
  Phone,
  Mail,
  LogOut,
  Clock,
  Calendar,
} from 'lucide-react';
import { calculateStockAlertStatus } from '../utils/stockCalculations';
import { ActiveTab } from '../types';

export const Header: React.FC = () => {
  const {
    currentUser,
    setCurrentUser,
    users,
    branches,
    products,
    selectedBranchId,
    setSelectedBranchId,
    branchStocks,
    transfers,
    setActiveTab,
    logout,
    updateUser,
    isCloudSyncing,
  } = useApp();

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);

  // Profile & Password Modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileTab, setProfileTab] = useState<'profile' | 'password'>('profile');
  const [profileName, setProfileName] = useState(currentUser.name);
  const [profileEmail, setProfileEmail] = useState(currentUser.email);
  const [profilePhone, setProfilePhone] = useState(currentUser.phone || '');
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Real-time live clock state (updates every second)
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = currentDateTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const formattedDate = currentDateTime.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Read Notifications Tracking (Persisted in localStorage)
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('bestheritage_read_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('bestheritage_read_notifications', JSON.stringify(readNotificationIds));
  }, [readNotificationIds]);

  const notificationRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setNotificationDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(target)) {
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const isBranchRestricted = currentUser.role === 'manager';
  const effectiveBranchId = isBranchRestricted && currentUser.branchId ? currentUser.branchId : selectedBranchId;

  // Build notifications list
  const stockNotifications = useMemo(() => {
    const targetBranches = effectiveBranchId === 'all'
      ? branches
      : branches.filter((b) => b.id === effectiveBranchId);

    const alerts: Array<{
      id: string;
      type: 'stock';
      status: 'low_stock' | 'out_of_stock';
      title: string;
      sku: string;
      categoryName: string;
      currentStock: number;
      minAlertLevel: number;
      branchName: string;
      targetTab: ActiveTab;
    }> = [];

    products.filter((p) => p.status !== 'inactive').forEach((prod) => {
      targetBranches.forEach((branch) => {
        const stock = branchStocks.find((s) => s.productId === prod.id && s.branchId === branch.id);
        const currentStock = stock ? Number(stock.currentStock) || 0 : 0;
        const minAlert = (stock && stock.minAlertLevel !== undefined && stock.minAlertLevel > 0)
          ? stock.minAlertLevel
          : (prod.minAlertLevel || 5);
        const status = calculateStockAlertStatus(currentStock, minAlert);

        if (status === 'low_stock' || status === 'out_of_stock') {
          alerts.push({
            id: `stock_${prod.id}_${branch.id}_${status}_${currentStock}`,
            type: 'stock',
            status,
            title: prod.name,
            sku: prod.sku,
            categoryName: prod.categoryName || 'General',
            currentStock,
            minAlertLevel: minAlert,
            branchName: branch.name,
            targetTab: 'stock-alerts',
          });
        }
      });
    });

    return alerts;
  }, [products, branchStocks, branches, effectiveBranchId]);

  const transferNotifications = useMemo(() => {
    return transfers
      .filter((t) => t.status === 'Dispatched')
      .map((t) => ({
        id: `transfer_${t.id}`,
        type: 'transfer' as const,
        status: 'pending_transfer' as const,
        title: `In-Transit: ${t.productName}`,
        sku: t.sku,
        categoryName: t.categoryName,
        currentStock: t.quantity,
        minAlertLevel: 0,
        branchName: `${t.sourceBranchName} → ${t.destinationBranchName}`,
        targetTab: 'transfers' as ActiveTab,
      }));
  }, [transfers]);

  const allNotifications = useMemo(() => {
    return [...stockNotifications, ...transferNotifications];
  }, [stockNotifications, transferNotifications]);

  // Unread notifications calculation
  const unreadNotifications = useMemo(() => {
    return allNotifications.filter((n) => !readNotificationIds.includes(n.id));
  }, [allNotifications, readNotificationIds]);

  const unreadCount = unreadNotifications.length;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">Super Admin</span>;
      case 'admin':
        return <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300">Admin</span>;
      case 'manager':
        return <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">Manager</span>;
      default:
        return null;
    }
  };

  // Mark single item read and navigate
  const handleNotificationClick = (item: { id: string; targetTab: ActiveTab }) => {
    if (!readNotificationIds.includes(item.id)) {
      setReadNotificationIds((prev) => [...prev, item.id]);
    }
    setActiveTab(item.targetTab);
    setNotificationDropdownOpen(false);
  };

  // Mark single notification as read/unread without navigating
  const handleToggleRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReadNotificationIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Mark all as read
  const handleMarkAllAsRead = () => {
    const allIds = allNotifications.map((n) => n.id);
    setReadNotificationIds(Array.from(new Set([...readNotificationIds, ...allIds])));
  };

  // Open profile modal
  const handleOpenProfileModal = (tab: 'profile' | 'password') => {
    setProfileName(currentUser.name);
    setProfileEmail(currentUser.email);
    setProfilePhone(currentUser.phone || '');
    setCurrentPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setFeedback(null);
    setProfileTab(tab);
    setShowProfileModal(true);
    setUserDropdownOpen(false);
  };

  // Save Profile Changes
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      setFeedback({ type: 'error', message: 'Name cannot be empty.' });
      return;
    }
    if (!profileEmail.trim()) {
      setFeedback({ type: 'error', message: 'Email cannot be empty.' });
      return;
    }

    const res = updateUser(currentUser.id, {
      name: profileName.trim(),
      email: profileEmail.trim(),
      phone: profilePhone.trim(),
    });

    if (res.success) {
      setFeedback({ type: 'success', message: 'Profile details updated successfully!' });
      setTimeout(() => setFeedback(null), 3000);
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  // Save Password Changes
  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPasswordInput.length < 6) {
      setFeedback({ type: 'error', message: 'New password must be at least 6 characters long.' });
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setFeedback({ type: 'error', message: 'New password and confirmation do not match.' });
      return;
    }
    if (currentUser.password && currentPasswordInput !== currentUser.password) {
      setFeedback({ type: 'error', message: 'Current password does not match.' });
      return;
    }

    const res = updateUser(currentUser.id, {
      password: newPasswordInput,
    });

    if (res.success) {
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
      setFeedback({ type: 'success', message: 'Password changed successfully!' });
      setTimeout(() => setFeedback(null), 3000);
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-sm w-full shrink-0">
      <div className="w-full px-3 sm:px-4 lg:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Left: Branding */}
        <div
          className="flex items-center space-x-2.5 cursor-pointer select-none shrink-0"
          onClick={() => setActiveTab('dashboard')}
        >
          <img
            src="/logo.jpg"
            alt="Best Heritage"
            className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg object-cover bg-emerald-950 p-0.5 border border-emerald-500/40 shadow-md shrink-0 ring-1 ring-emerald-400/20"
          />
          <div className="min-w-0 hidden sm:block">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base sm:text-lg tracking-tight text-white font-serif whitespace-nowrap">
                BEST HERITAGE
              </span>
              <span className="hidden xl:inline-block text-[10px] bg-emerald-950 text-emerald-300 font-semibold px-2 py-0.5 rounded border border-emerald-700/60 uppercase tracking-wider whitespace-nowrap">
                Foods & Group
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight whitespace-nowrap hidden md:block">
              Multi-Branch Stock & Sales Management
            </p>
          </div>
          {/* Mobile: just show text name */}
          <span className="sm:hidden font-bold text-sm tracking-tight text-white font-serif whitespace-nowrap">BEST HERITAGE</span>
        </div>

        {/* Center: Branch Selector & Live Clock Widget */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1 md:flex-none justify-center">
          {/* Branch Selector */}
          <div className="hidden md:flex items-center space-x-2 bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700 min-w-0 max-w-xs lg:max-w-sm xl:max-w-none">
            <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs text-slate-400 font-medium shrink-0">Branch:</span>
            {isBranchRestricted ? (
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-amber-300 min-w-0">
                <span className="truncate">{currentUser.branchName || 'Assigned Branch'}</span>
                <span className="text-[10px] bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded border border-amber-700/50 shrink-0">
                  Locked
                </span>
              </div>
            ) : (
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                aria-label="Filter active branch"
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer pr-2 min-w-0 w-full"
              >
                <option value="all" className="bg-slate-900 text-white">All Branches (Consolidated)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Real-time Live Clock & Date Widget */}
          <div className="flex items-center space-x-2 bg-slate-800/95 px-3 py-1.5 rounded-lg border border-slate-700 shadow-sm shrink-0 text-white font-mono">
            <div className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[11px] font-medium text-slate-300 whitespace-nowrap">{formattedDate}</span>
              <span className="text-slate-600 font-bold ml-1">•</span>
            </div>
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-xs font-bold text-emerald-300 tracking-wider whitespace-nowrap">{formattedTime}</span>
            </div>
          </div>
        </div>

        {/* Right: New Sale (POS), Notifications & User Profile */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5">
          {/* New Sale (POS) Button — hidden on mobile (available in sub-bar) */}
          <button
            onClick={() => setActiveTab('sales-entry')}
            className="hidden md:inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-xs transition-colors cursor-pointer"
            title="Create New Sale (POS)"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-white" />
            <span className="whitespace-nowrap font-medium">New Sale (POS)</span>
          </button>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => {
                setNotificationDropdownOpen(!notificationDropdownOpen);
                setUserDropdownOpen(false);
              }}
              className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              title="System Notifications"
              aria-label="System Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notificationDropdownOpen && (
              <div className="absolute right-0 mt-2 w-[min(380px,90vw)] sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 py-0 z-50 text-slate-900 overflow-hidden animate-in fade-in duration-150">
                {/* Notification Dropdown Header */}
                <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-rose-600 text-white rounded-full">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>

                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
                      title="Mark all notifications as read"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Mark all read</span>
                    </button>
                  )}
                </div>

                {/* Notification Items List */}
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {allNotifications.length === 0 ? (
                    <div className="py-8 px-4 text-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                      <p className="text-xs font-semibold text-slate-700">All Systems Normal</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        No critical stock alerts or pending transfers for this branch.
                      </p>
                    </div>
                  ) : (
                    allNotifications.map((item) => {
                      const isRead = readNotificationIds.includes(item.id);

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleNotificationClick(item)}
                          className={`p-3 transition-colors cursor-pointer group flex items-start space-x-3 ${
                            isRead ? 'bg-white hover:bg-slate-50 opacity-75' : 'bg-emerald-50/30 hover:bg-emerald-50/60 font-medium'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {item.type === 'transfer' ? (
                              <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                                <ArrowLeftRight className="w-3.5 h-3.5" />
                              </div>
                            ) : item.status === 'out_of_stock' ? (
                              <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                                <AlertTriangle className="w-3.5 h-3.5" />
                              </div>
                            ) : (
                              <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                                <AlertTriangle className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">
                                {item.title}
                              </p>
                              <div className="flex items-center space-x-1.5 shrink-0">
                                {!isRead && (
                                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" title="Unread" />
                                )}
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                    item.type === 'transfer'
                                      ? 'bg-indigo-100 text-indigo-700'
                                      : item.status === 'out_of_stock'
                                      ? 'bg-rose-100 text-rose-700'
                                      : 'bg-amber-100 text-amber-700'
                                  }`}
                                >
                                  {item.type === 'transfer'
                                    ? 'In-Transit'
                                    : item.status === 'out_of_stock'
                                    ? 'Out of Stock'
                                    : 'Low Stock'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-1">
                              <span className="font-mono text-slate-400">{item.sku}</span>
                              <span>•</span>
                              <span>{item.branchName}</span>
                            </div>

                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-[11px] font-bold text-slate-700">
                                {item.type === 'transfer'
                                  ? `${item.currentStock} units being transferred`
                                  : `Available: ${item.currentStock} units (Alert at ${item.minAlertLevel})`}
                              </span>
                              <div className="flex items-center space-x-2">
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleRead(item.id, e)}
                                  className="text-[10px] text-slate-400 hover:text-slate-600 underline cursor-pointer"
                                  title={isRead ? 'Mark as unread' : 'Mark as read'}
                                >
                                  {isRead ? 'Mark unread' : 'Mark read'}
                                </button>
                                <span className="text-[10px] font-semibold text-emerald-600 group-hover:translate-x-0.5 transition-transform flex items-center space-x-0.5">
                                  <span>Open</span>
                                  <ArrowRight className="w-3 h-3 inline" />
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Dropdown Footer */}
                <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => {
                      setActiveTab('stock-alerts');
                      setNotificationDropdownOpen(false);
                    }}
                    className="font-semibold text-emerald-700 hover:text-emerald-800 py-1 px-2 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                  >
                    View All Stock Alerts →
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('transfers');
                      setNotificationDropdownOpen(false);
                    }}
                    className="font-semibold text-slate-600 hover:text-slate-900 py-1 px-2 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    View Transfers
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Cloud Database Status Badge */}
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-950/60 border border-emerald-500/30 rounded-full text-emerald-400 text-[11px] font-semibold shrink-0">
            <span className={`w-1.5 h-1.5 rounded-full ${isCloudSyncing ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`}></span>
            <span className="hidden lg:inline">{isCloudSyncing ? 'Syncing...' : 'Live Cloud DB'}</span>
          </div>

          {/* User Profile & Switcher Dropdown */}
          <div className="relative" ref={userDropdownRef}>
            <button
              onClick={() => {
                setUserDropdownOpen(!userDropdownOpen);
                setNotificationDropdownOpen(false);
              }}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700/80 active:bg-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors text-left cursor-pointer"
              aria-label="User Account Menu"
            >
              <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0">
                {currentUser.name.charAt(0)}
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-medium text-white truncate max-w-[120px]">{currentUser.name}</div>
                <div className="text-[10px] text-slate-400 capitalize">{currentUser.role.replace('_', ' ')}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-[min(288px,90vw)] bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 text-slate-900 animate-in fade-in duration-150">
                {/* Logged in User Card */}
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-[11px] text-slate-400 font-medium">Signed in as:</p>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <p className="text-sm font-bold text-slate-800">{currentUser.name}</p>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                      ID: {currentUser.username || '99999'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                  <div className="mt-1.5 flex items-center space-x-2">
                    {getRoleBadge(currentUser.role)}
                    {currentUser.branchName && (
                      <span className="text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        {currentUser.branchName}
                      </span>
                    )}
                  </div>

                  {/* Edit Profile & Password Trigger */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center space-x-2">
                    <button
                      onClick={() => handleOpenProfileModal('profile')}
                      className="flex-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <UserCog className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Edit Profile</span>
                    </button>
                    <button
                      onClick={() => handleOpenProfileModal('password')}
                      className="flex-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg border border-slate-200 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-slate-600" />
                      <span>Password</span>
                    </button>
                  </div>
                </div>

                {/* Full-width Logout Action (Settings removed as requested) */}
                <div className="pt-2 px-3 border-t border-slate-100 mt-1">
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      logout();
                    }}
                    className="w-full text-xs text-rose-600 hover:text-rose-700 font-bold py-2 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-600" />
                    <span>Sign Out (Logout)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile & Password Modal */}
      {showProfileModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4"
          onClick={() => setShowProfileModal(false)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden text-slate-800 animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                  <UserCog className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">My Account Settings</h3>
                  <p className="text-[11px] text-slate-400">Update personal profile and security credentials</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3 space-x-3 text-xs">
              <button
                type="button"
                onClick={() => { setProfileTab('profile'); setFeedback(null); }}
                className={`pb-2.5 font-bold transition-all border-b-2 flex items-center space-x-1.5 cursor-pointer ${
                  profileTab === 'profile'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Profile Information</span>
              </button>

              <button
                type="button"
                onClick={() => { setProfileTab('password'); setFeedback(null); }}
                className={`pb-2.5 font-bold transition-all border-b-2 flex items-center space-x-1.5 cursor-pointer ${
                  profileTab === 'password'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Change Password</span>
              </button>
            </div>

            {/* Feedback Alert */}
            {feedback && (
              <div
                className={`m-5 mb-0 p-3 rounded-xl text-xs font-semibold flex items-center justify-between ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                <span>{feedback.message}</span>
                <button type="button" onClick={() => setFeedback(null)}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Tab 1: Profile Information */}
            {profileTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="p-5 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-800 font-medium"
                    placeholder="Your Name"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>Email Address *</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-800 font-medium"
                    placeholder="user@bestheritage.com"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>Contact Phone</span>
                  </label>
                  <input
                    type="text"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-800 font-medium"
                    placeholder="+880 17XX-XXXXXX"
                  />
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[11px] text-slate-600">
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-500">System Role:</span>
                    <span className="font-bold text-slate-800 capitalize">{currentUser.role.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-500">Assigned Branch:</span>
                    <span className="font-bold text-slate-800">{currentUser.branchName || 'All Branches (Central)'}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )}

            {/* Tab 2: Change Password */}
            {profileTab === 'password' && (
              <form onSubmit={handleSavePassword} className="p-5 space-y-4 text-xs">
                {currentUser.password && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Current Password *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={currentPasswordInput}
                        onChange={(e) => setCurrentPasswordInput(e.target.value)}
                        className="w-full pl-3 pr-9 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-800 font-medium"
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">New Password (Min 6 characters) *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      className="w-full pl-3 pr-9 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-800 font-medium"
                      placeholder="Enter new strong password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Confirm New Password *</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-800 font-medium"
                    placeholder="Re-enter new password"
                  />
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start space-x-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Keep your password confidential. Once updated, your credentials are saved to this browser session.
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Update Password
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
