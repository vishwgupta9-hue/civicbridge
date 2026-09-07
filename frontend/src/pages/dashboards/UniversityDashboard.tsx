import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LogOut, GraduationCap, CheckCircle2, BookOpen, Send, ListChecks, Layers } from "lucide-react";

export const UniversityDashboard: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              CB
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">CivicBridge</h1>
              <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-indigo-100 text-indigo-900 rounded-full">
                University Portal
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/problems"
              className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900 bg-indigo-100 hover:bg-indigo-200 px-3 py-2 rounded-lg transition-colors"
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
              <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xl">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{user?.name}</h2>
                <p className="text-sm text-slate-500">{user?.email}</p>
                {user?.organization && (
                  <p className="text-xs font-medium text-indigo-700 mt-0.5">
                    Institution: {user.organization.name}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-semibold rounded-md">
                Role: UNIVERSITY
              </span>
              <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-md">
                Faculty / Student Lead
              </span>
            </div>
          </div>
        </div>

        {/* Status Banner */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-indigo-900">Phase 3 University Session Active</h3>
            <p className="text-xs text-indigo-800 mt-0.5">
              Authenticated with University privileges. In Phase 7, the Problem Bank exploration and proposal submission engine will be available here.
            </p>
          </div>
        </div>

        {/* Feature Previews */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/problems"
            className="group bg-white p-5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all space-y-2 block"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors">
                Problem Bank
              </h3>
              <span className="inline-block text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                Phase 4D Active
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Explore all AI-passed community problems across Jharkhand regardless of verification status to choose project topics.
            </p>
          </Link>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-800 text-sm">Submit Proposals</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Attach faculty mentors, student roll numbers, methodology, and milestone roadmaps.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <ListChecks className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-800 text-sm">Milestone Updates</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Log progress, test results, and prototype deliveries for citizens and government to observe.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
