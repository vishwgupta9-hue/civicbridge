import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LogOut, User as UserIcon, MapPin, AlertCircle, FileText, CheckCircle2, PlusCircle, ArrowRight } from "lucide-react";

export const CitizenDashboard: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              CB
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">CivicBridge</h1>
              <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full">
                Citizen Portal
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/problems"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors"
            >
              <span>Problem Bank</span>
            </Link>
            <Link
              to="/citizen/report"
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 rounded-lg transition-colors shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report a Problem</span>
            </Link>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* User Card */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xl">
                <UserIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{user?.name}</h2>
                <p className="text-sm text-slate-500">{user?.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-md">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                District: {user?.district || "Ranchi"}
              </span>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-md">
                Role: CITIZEN
              </span>
            </div>
          </div>
        </div>

        {/* Action Callout */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl p-5 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-sm">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Phase 4C Active
            </div>
            <h3 className="text-lg font-bold">Have a civic issue in your locality?</h3>
            <p className="text-xs text-emerald-100 max-w-xl">
              Submit your report now. CivicBridge AI will instantly screen for relevance, calculate priority factors, and route it for verification.
            </p>
          </div>
          <Link
            to="/citizen/report"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-lg text-sm font-bold shadow-sm transition-all shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            Report Issue Now
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Feature Previews / Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/citizen/report"
            className="group bg-white p-5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all space-y-2 block"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-sm group-hover:text-emerald-700 transition-colors">
                Report a Civic Problem
              </h3>
              <span className="inline-block text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Active
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Mobile-optimized submission with category selection, district geotagging, and instant AI screening with priority scoring.
            </p>
          </Link>

          <Link
            to="/problems"
            className="group bg-white p-5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all space-y-2 block"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-sm group-hover:text-emerald-700 transition-colors">
                Browse Problem Bank
              </h3>
              <span className="inline-block text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Phase 4D Active
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Explore verified community problems statewide across all 24 districts of Jharkhand with priority scoring and AI summaries.
            </p>
          </Link>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2 opacity-75">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-sm">Track Progress</h3>
              <span className="inline-block text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                Coming Soon
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Monitor university research proposals, student prototypes, and government verification updates on your reported issues.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
