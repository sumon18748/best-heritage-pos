import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Settings,
  Database,
  Building2,
  Server,
  ShieldCheck,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { branches, products } = useApp();

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
    </div>
  );
};
