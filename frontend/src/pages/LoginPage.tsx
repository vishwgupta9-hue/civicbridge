import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, getDashboardPath } from "../context/AuthContext";
import { Shield, Lock, Mail, AlertCircle, Sparkles, Check } from "lucide-react";

interface DemoAccount {
  role: string;
  badge: string;
  badgeColor: string;
  name: string;
  email: string;
  password: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: "CITIZEN",
    badge: "Citizen",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    name: "Sunita Soren",
    email: "citizen.sunita@civicbridge.dev",
    password: "CivicPass123!",
  },
  {
    role: "ADMIN",
    badge: "Government / Admin",
    badgeColor: "bg-amber-100 text-amber-900 border-amber-200",
    name: "Rajeshwar Verma (DC Office)",
    email: "admin.verma@civicbridge.gov.in",
    password: "AdminPass123!",
  },
  {
    role: "UNIVERSITY",
    badge: "University",
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
    name: "Dr. Ananya (BIT Mesra)",
    email: "faculty.ananya@bitmesra.ac.in",
    password: "UniPass123!",
  },
  {
    role: "INDUSTRY",
    badge: "Industry",
    badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
    name: "Vikram Sengupta (Tata Steel)",
    email: "vikram.sengupta@tatasteel.com",
    password: "IndustryPass123!",
  },
  {
    role: "STARTUP",
    badge: "Startup",
    badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-200",
    name: "Amit Murmu (JharJal CleanTech)",
    email: "founder.amit@jharjal.in",
    password: "StartupPass123!",
  },
];

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If already logged in, redirect to respective dashboard
  useEffect(() => {
    if (user) {
      const from = (location.state as any)?.from?.pathname || getDashboardPath(user.role);
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setSubmitting(true);
    const result = await login(email.trim(), password);
    setSubmitting(false);

    if (result.success && result.role) {
      const destination = getDashboardPath(result.role);
      navigate(destination, { replace: true });
    } else {
      setErrorMessage(result.error || "Authentication failed. Please check your credentials.");
    }
  };

  const handleSelectDemo = (account: DemoAccount) => {
    setEmail(account.email);
    setPassword(account.password);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 mb-3">
          <Shield className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          CivicBridge Jharkhand
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          SIH PS 26043 — Community Problem-Solving Platform
        </p>
      </div>

      {/* Main Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-5 sm:px-10 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">Sign In to Your Account</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Access your role-specific dashboard and workspace.
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@organization.com"
                  className="block w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white text-slate-900"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 h-11 flex items-center justify-center py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-md shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </div>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Development Quick-Fill Demo Section */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Demo Accounts (Seeded)
              </span>
              <span className="text-[11px] text-slate-400">Click to autofill</span>
            </div>

            <div className="space-y-1.5">
              {DEMO_ACCOUNTS.map((acc) => {
                const isSelected = email === acc.email;
                return (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => handleSelectDemo(acc)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between text-xs ${
                      isSelected
                        ? "bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${acc.badgeColor}`}>
                        {acc.badge}
                      </span>
                      <div className="truncate">
                        <span className="font-semibold text-slate-800 block truncate">{acc.name}</span>
                        <span className="text-[11px] text-slate-500 block truncate">{acc.email}</span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
