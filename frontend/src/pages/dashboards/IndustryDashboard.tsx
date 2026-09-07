import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LogOut, Building2, CheckCircle2, Handshake, Shield, Sparkles, Layers, ArrowRight } from "lucide-react";

export const IndustryDashboard: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              CB
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">CivicBridge</h1>
              <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-teal-100 text-teal-900 rounded-full">
                Industry Portal
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/problems"
              className="flex items-center gap-1.5 text-xs font-semibold text-teal-900 bg-teal-100 hover:bg-teal-200 px-3 py-2 rounded-lg transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Browse Problem Bank</span>
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
              <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xl">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{user?.name}</h2>
                <p className="text-sm text-slate-500">{user?.email}</p>
                {user?.organization && (
                  <p className="text-xs font-medium text-teal-700 mt-0.5">
                    Enterprise: {user.organization.name}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-teal-50 text-teal-800 border border-teal-200 text-xs font-semibold rounded-md">
                Role: INDUSTRY
              </span>
              <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-md">
                CSR & Sustainability Lead
              </span>
            </div>
          </div>
        </div>

        {/* Status Banner */}
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-teal-900">Phase 3 Industry Session Active</h3>
            <p className="text-xs text-teal-800 mt-0.5">
              Authenticated with Industry privileges. In Phase 9, institutional collaboration registration across mentorship, technical testing, and prototyping support will be unlocked.
            </p>
          </div>
        </div>

        {/* Problem Bank Callout */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-block text-[11px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
              Phase 4D Problem Bank Active
            </span>
            <h3 className="text-base font-bold text-slate-900">Statewide Verified Civic Challenges</h3>
            <p className="text-xs text-slate-500 max-w-xl">
              Inspect AI-screened community issues across all 24 Jharkhand districts eligible for corporate mentorship, pilot facilities, and CSR collaboration.
            </p>
          </div>
          <Link
            to="/problems"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition-colors shadow-sm shrink-0"
          >
            <span>Open Problem Bank</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Feature Previews */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Handshake className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-800 text-sm">Register Support</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Offer Mentorship, Technical Resources, Prototyping Labs, or General Collaboration Interest.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-800 text-sm">Review Active Ventures</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Review student projects and startup business concepts seeking industry domain validation.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-800 text-sm">Zero Funding Gate</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Transparent institutional engagement without financial intermediaries or funding bottlenecks.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
