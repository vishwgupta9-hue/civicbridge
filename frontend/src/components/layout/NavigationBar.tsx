import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth, getDashboardPath } from "../../context/AuthContext";
import {
  Layers,
  ArrowRightLeft,
  Briefcase,
  PlusCircle,
  Menu,
  X,
  ShieldCheck,
  Sparkles,
  LogOut,
  User as UserIcon,
} from "lucide-react";

interface NavigationBarProps {
  activeSection?: "problems" | "projects" | "exchange" | "dashboard";
}

export const NavigationBar: React.FC<NavigationBarProps> = ({ activeSection }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isCurrent = (path: string, section?: string) => {
    if (activeSection) return activeSection === section;
    return location.pathname.startsWith(path);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <Link
              to={user ? getDashboardPath(user.role) : "/"}
              className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-lg"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                CB
              </div>
              <div className="leading-tight">
                <span className="text-base font-bold text-slate-900 block">CivicBridge</span>
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block">
                  Jharkhand V3
                </span>
              </div>
            </Link>

            {/* Parallel Trust Indicator (Advisory vs Verified) */}
            <div className="hidden lg:flex items-center gap-1.5 ml-4 pl-4 border-l border-slate-200 text-xs">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> Govt Verified
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                <Sparkles className="w-3 h-3 text-purple-600" /> AI Screened
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-semibold text-slate-700">
            <Link
              to="/problems"
              className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                isCurrent("/problems", "problems")
                  ? "bg-emerald-50 text-emerald-700 font-bold"
                  : "hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Problem Bank</span>
            </Link>

            <Link
              to="/exchange"
              className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                isCurrent("/exchange", "exchange")
                  ? "bg-emerald-50 text-emerald-700 font-bold"
                  : "hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Resource Exchange</span>
            </Link>

            {user && (
              <Link
                to={getDashboardPath(user.role)}
                className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                  isCurrent("/dashboard", "dashboard")
                    ? "bg-emerald-50 text-emerald-700 font-bold"
                    : "hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>Dashboard ({user.role})</span>
              </Link>
            )}
          </nav>

          {/* Right Action Area */}
          <div className="hidden md:flex items-center gap-2.5">
            {user?.role === "CITIZEN" && (
              <Link
                to="/citizen/report"
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 rounded-lg transition-colors shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Report Problem</span>
              </Link>
            )}

            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="text-right leading-tight">
                  <span className="text-xs font-bold text-slate-800 block truncate max-w-[130px]">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium block">
                    {user.organization?.name || user.district || user.role}
                  </span>
                </div>
                <button
                  onClick={logout}
                  title="Sign out"
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2 rounded-lg transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile Hamburger Button (44px min touch target) */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-200 space-y-2 bg-white animate-in fade-in duration-150">
            <Link
              to="/problems"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 min-h-[44px]"
            >
              <Layers className="w-5 h-5 text-slate-500" />
              <span>Problem Bank</span>
            </Link>

            <Link
              to="/exchange"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 min-h-[44px]"
            >
              <ArrowRightLeft className="w-5 h-5 text-slate-500" />
              <span>Resource Exchange</span>
            </Link>

            {user && (
              <Link
                to={getDashboardPath(user.role)}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 min-h-[44px]"
              >
                <Briefcase className="w-5 h-5 text-slate-500" />
                <span>Dashboard ({user.role})</span>
              </Link>
            )}

            {user?.role === "CITIZEN" && (
              <Link
                to="/citizen/report"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 min-h-[44px]"
              >
                <PlusCircle className="w-5 h-5" />
                <span>Report Problem</span>
              </Link>
            )}

            {user && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between px-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div className="leading-tight">
                    <span className="text-xs font-bold text-slate-800 block">{user.name}</span>
                    <span className="text-[10px] text-slate-500">{user.role}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="flex items-center gap-1 text-xs font-semibold text-rose-600 p-2 min-h-[44px]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
