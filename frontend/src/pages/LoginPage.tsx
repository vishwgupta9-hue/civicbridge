import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, getDashboardPath } from "../context/AuthContext";
import { Role } from "../types/index";
import {
  Shield,
  Lock,
  Mail,
  AlertCircle,
  Sparkles,
  Check,
  User as UserIcon,
  Phone,
  Building2,
  GraduationCap,
  Rocket,
  Home,
  MapPin,
} from "lucide-react";

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

const JHARKHAND_DISTRICTS = [
  "Ranchi", "Dhanbad", "East Singhbhum", "Bokaro", "Hazaribagh",
  "Palamu", "Deoghar", "Giridih", "Ramgarh", "Saraikela Kharsawan",
  "West Singhbhum", "Chatra", "Dumka", "Garhwa", "Godda",
  "Gumla", "Jamtara", "Khunti", "Koderma", "Latehar",
  "Lohardaga", "Pakur", "Sahibganj", "Simdega"
];

const PUBLIC_ROLES: { role: Role; label: string; description: string; icon: React.FC<{ className?: string }> }[] = [
  {
    role: "CITIZEN",
    label: "Citizen",
    description: "Report & track community issues",
    icon: Home,
  },
  {
    role: "UNIVERSITY",
    label: "University",
    description: "Faculty research & student capstones",
    icon: GraduationCap,
  },
  {
    role: "STARTUP",
    label: "Startup",
    description: "Build scalable civic solutions",
    icon: Rocket,
  },
  {
    role: "INDUSTRY",
    label: "Industry",
    description: "CSR, mentorship & lab support",
    icon: Building2,
  },
];

export const LoginPage: React.FC = () => {
  // Tab: "login" | "register"
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Register form state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState<Role>("CITIZEN");
  const [regDistrict, setRegDistrict] = useState("Ranchi");
  const [regPhone, setRegPhone] = useState("");
  const [regOrgName, setRegOrgName] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { login, register, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If already logged in, redirect to respective dashboard
  useEffect(() => {
    if (user) {
      const from = (location.state as any)?.from?.pathname || getDashboardPath(user.role);
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
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

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    if (regPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    const isInstitutional = ["UNIVERSITY", "STARTUP", "INDUSTRY"].includes(regRole);
    if (isInstitutional && !regOrgName.trim()) {
      setErrorMessage(`Please enter your organization or institution name.`);
      return;
    }

    setSubmitting(true);
    const result = await register({
      name: regName.trim(),
      email: regEmail.trim(),
      password: regPassword,
      role: regRole,
      district: regDistrict,
      phone: regPhone.trim() || undefined,
      organizationName: isInstitutional ? regOrgName.trim() : undefined,
    });
    setSubmitting(false);

    if (result.success && result.role) {
      const destination = getDashboardPath(result.role);
      navigate(destination, { replace: true });
    } else {
      setErrorMessage(result.error || "Registration failed. Please check your inputs.");
    }
  };

  const handleSelectDemo = (account: DemoAccount) => {
    setActiveTab("login");
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
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-7 px-5 sm:px-8 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200">
          {/* Tab Selector */}
          <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab("login");
                setErrorMessage(null);
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === "login"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("register");
                setErrorMessage(null);
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === "register"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Subheader */}
          <div className="mb-5">
            <h2 className="text-base font-bold text-slate-900">
              {activeTab === "login"
                ? "Sign In to Your Account"
                : "Register for CivicBridge"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeTab === "login"
                ? "Access your role-specific dashboard and community projects."
                : "Join citizens and institutions solving civic challenges across Jharkhand."}
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ============================================================= */}
          {/* TAB 1: LOGIN FORM */}
          {/* ============================================================= */}
          {activeTab === "login" ? (
            <>
              <form onSubmit={handleLoginSubmit} className="space-y-4">
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
              <div className="mt-7 pt-5 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Demo Accounts (Pre-configured)
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
            </>
          ) : (
            /* ============================================================= */
            /* TAB 2: REGISTRATION FORM */
            /* ============================================================= */
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Your Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PUBLIC_ROLES.map((r) => {
                    const Icon = r.icon;
                    const isSelected = regRole === r.role;
                    return (
                      <button
                        key={r.role}
                        type="button"
                        onClick={() => setRegRole(r.role)}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            isSelected ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-emerald-600" />}
                        </div>
                        <div>
                          <span className="text-xs font-bold block">{r.label}</span>
                          <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                            {r.description}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label htmlFor="regName" className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    id="regName"
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder={regRole === "CITIZEN" ? "e.g. Ramesh Mahto" : "e.g. Dr. Ramesh / Lead Contact"}
                    className="block w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white text-slate-900"
                  />
                </div>
              </div>

              {/* Organization Name (for Institutional Roles) */}
              {regRole !== "CITIZEN" && (
                <div>
                  <label htmlFor="regOrg" className="block text-xs font-semibold text-slate-700 mb-1">
                    {regRole === "UNIVERSITY"
                      ? "University / College Name"
                      : regRole === "STARTUP"
                      ? "Startup / Venture Name"
                      : "Company / Industry Name"}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <input
                      id="regOrg"
                      type="text"
                      required
                      value={regOrgName}
                      onChange={(e) => setRegOrgName(e.target.value)}
                      placeholder={
                        regRole === "UNIVERSITY"
                          ? "e.g. Ranchi University / BIT Mesra"
                          : regRole === "STARTUP"
                          ? "e.g. GreenRoots CleanTech Pvt Ltd"
                          : "e.g. Tata Power CSR Division"
                      }
                      className="block w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white text-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* Email Address */}
              <div>
                <label htmlFor="regEmail" className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="regEmail"
                    type="email"
                    required
                    autoComplete="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="block w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white text-slate-900"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="regPassword" className="block text-xs font-semibold text-slate-700 mb-1">
                  Password (min. 8 characters)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="regPassword"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="block w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white text-slate-900"
                  />
                </div>
              </div>

              {/* District & Phone (2 columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="regDistrict" className="block text-xs font-semibold text-slate-700 mb-1">
                    District (Jharkhand)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <select
                      id="regDistrict"
                      value={regDistrict}
                      onChange={(e) => setRegDistrict(e.target.value)}
                      className="block w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white text-slate-900"
                    >
                      {JHARKHAND_DISTRICTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="regPhone" className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      id="regPhone"
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+91-9876543210"
                      className="block w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-3 h-11 flex items-center justify-center py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-md shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating Account...</span>
                  </div>
                ) : (
                  `Register as ${PUBLIC_ROLES.find((r) => r.role === regRole)?.label || "User"}`
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
