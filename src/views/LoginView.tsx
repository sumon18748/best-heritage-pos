import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ShieldCheck,
  Building2,
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useApp();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const result = login(identifier, password);
    if (!result.success) {
      setErrorMessage(result.message);
      setIsSubmitting(false);
    } else {
      setSuccessMessage(result.message);
    }
  };

  const handleQuickFill = (userId: string) => {
    setIdentifier(userId);
    setPassword('123456');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex flex-col justify-center items-center p-4 sm:p-6 select-none">
      {/* Brand / Logo Top */}
      <div className="w-full max-w-md text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-xl shadow-emerald-500/20 mb-3 border border-emerald-400/30">
          <Sparkles className="w-8 h-8 text-amber-200" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          BEST HERITAGE
        </h1>
        <p className="text-xs sm:text-sm text-emerald-300/80 font-medium mt-1">
          মাল্টি-ব্রাঞ্চ ইনভেন্টরি ও পিওএস ম্যানেজমেন্ট সিস্টেম
        </p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-6 sm:p-8 text-slate-800">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Lock className="w-5 h-5 text-emerald-600" />
            <span>লগইন করুন</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            আপনার অ্যাকাউন্টে প্রবেশ করতে ইউজার আইডি ও পাসওয়ার্ড দিন
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-2.5 text-rose-700 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="text-xs font-semibold leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start space-x-2.5 text-emerald-800 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span className="text-xs font-semibold leading-relaxed">{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ইউজার আইডি বা ইমেইল (User ID / Email)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="যেমন: bestheritage, sumon, sohel"
                className="w-full pl-10 pr-4 py-2.5 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all bg-slate-50/50"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              পাসওয়ার্ড (Password)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="পাসওয়ার্ড লিখুন (ডিফল্ট: 123456)"
                className="w-full pl-10 pr-10 py-2.5 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all bg-slate-50/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.99] disabled:opacity-50"
          >
            <span>লগইন করুন</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Login Presets Helper */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center justify-between">
            <span>দ্রুত লগইন করার অ্যাকাউন্টসমূহ</span>
            <span className="text-[10px] text-emerald-600 font-semibold lowercase">পাসওয়ার্ড: 123456</span>
          </p>

          <div className="space-y-2">
            {/* Super Admin */}
            <button
              type="button"
              onClick={() => handleQuickFill('bestheritage')}
              className="w-full p-2.5 rounded-xl border border-slate-100 hover:border-emerald-200 bg-slate-50 hover:bg-emerald-50/50 transition-all text-left flex items-center justify-between group cursor-pointer"
            >
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold text-slate-800">বেস্ট হেরিটেজ</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                    সুপার অ্যাডমিন
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  আইডি: <strong className="text-slate-700">bestheritage</strong>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 group-hover:translate-x-0.5 transition-transform">
                ফিল করুন →
              </span>
            </button>

            {/* Admin */}
            <button
              type="button"
              onClick={() => handleQuickFill('sumon')}
              className="w-full p-2.5 rounded-xl border border-slate-100 hover:border-emerald-200 bg-slate-50 hover:bg-emerald-50/50 transition-all text-left flex items-center justify-between group cursor-pointer"
            >
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold text-slate-800">সুমন</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                    অ্যাডমিন
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  আইডি: <strong className="text-slate-700">sumon</strong>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 group-hover:translate-x-0.5 transition-transform">
                ফিল করুন →
              </span>
            </button>

            {/* Branch Manager */}
            <button
              type="button"
              onClick={() => handleQuickFill('sohel')}
              className="w-full p-2.5 rounded-xl border border-slate-100 hover:border-emerald-200 bg-slate-50 hover:bg-emerald-50/50 transition-all text-left flex items-center justify-between group cursor-pointer"
            >
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold text-slate-800">সোহেল আহমেদ</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                    আফতাবনগর ব্রাঞ্চ ম্যানেজার
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  আইডি: <strong className="text-slate-700">sohel</strong>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 group-hover:translate-x-0.5 transition-transform">
                ফিল করুন →
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-6 text-center text-slate-400 text-xs">
        <p className="flex items-center justify-center space-x-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>নিরাপদ সিস্টেম • সর্বমোট ১টি ব্রাঞ্চ (আফতাবনগর) ও ৩ জন অনুমোদিত ইউজার</span>
        </p>
      </div>
    </div>
  );
};
