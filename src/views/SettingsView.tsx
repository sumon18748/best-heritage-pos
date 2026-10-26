import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Settings,
  Database,
  Building2,
  RefreshCw,
  Server,
  ShieldCheck,
  Check,
  AlertTriangle,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { resetAllDataToDefault, branches, products } = useApp();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const handleReset = () => {
    resetAllDataToDefault();
    setShowResetConfirm(false);
    setResetDone(true);
    setTimeout(() => setResetDone(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-emerald-600" />
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Settings & Architecture</h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Configuration parameters, database schema mapping, and operational profiles for Best Heritage Group.
        </p>
      </div>

      {resetDone && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>All Best Heritage demo branches, products, stock levels, and sales have been restored to factory default.</span>
        </div>
      )}

      {/* Brand Identity & Specs Card */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center space-x-2 border-b border-slate-100 pb-2.5">
          <Building2 className="w-4 h-4 text-emerald-600" />
          <span>Software Identity & Specification</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-400 font-semibold block mb-0.5">Brand Name:</span>
            <span className="font-bold text-slate-900 text-sm">Best Heritage</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-400 font-semibold block mb-0.5">Trade Name:</span>
            <span className="font-bold text-slate-900 text-sm font-serif">Best Heritage (Best Heritage Group)</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-400 font-semibold block mb-0.5">Currency & Format:</span>
            <span className="font-semibold text-slate-800">Bangladeshi Taka (BDT / Tk)</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-400 font-semibold block mb-0.5">Architecture:</span>
            <span className="font-semibold text-emerald-700">Multi-Branch Atomic Stock Tracking</span>
          </div>
        </div>
      </div>

      {/* Database Schema Compliance Card */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-3">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center space-x-2 border-b border-slate-100 pb-2.5">
          <Database className="w-4 h-4 text-blue-600" />
          <span>Section 13: SQL Server Database Entities & Tables</span>
        </h2>
        <p className="text-xs text-slate-500">
          The software schema is mapped to relational SQL Server entities:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
          {[
            'Users',
            'Roles',
            'UserBranches',
            'Branches',
            'Categories',
            'Products',
            'BranchProductStocks',
            'StockInTransactions',
            'StockInItems',
            'StockOutTransactions',
            'StockOutItems',
            'Sales',
            'SaleItems',
            'StockMovements',
          ].map((table) => (
            <div key={table} className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-semibold text-[11px]">{table}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reset & Maintenance */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-3">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center space-x-2 border-b border-slate-100 pb-2.5 text-rose-700">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>System Reset & Testing Data</span>
        </h2>
        <p className="text-xs text-slate-600">
          Restore initial testing catalog for Best Heritage (4 branches, 8 master products, stock-in histories, stock-out adjustments, and sample sales).
        </p>

        <button
          onClick={() => setShowResetConfirm(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Restore Factory Demo Data</span>
        </button>
      </div>

      {/* Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 text-slate-800 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Confirm Reset?</h3>
            <p className="text-xs text-slate-600 mt-2">
              This will overwrite any newly entered products, branches, or sales and restore clean seed records.
            </p>
            <div className="mt-5 flex justify-end space-x-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow"
              >
                Yes, Reset Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
