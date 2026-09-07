import React, { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth, getDashboardPath } from "../context/AuthContext";
import {
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Building2,
  Users,
  MapPin,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Sparkles,
  Info,
  Copy,
  XCircle,
} from "lucide-react";

const JHARKHAND_DISTRICTS = [
  "Ranchi", "Dhanbad", "East Singhbhum", "Bokaro", "Hazaribagh",
  "Palamu", "Deoghar", "Giridih", "Ramgarh", "Saraikela Kharsawan",
  "West Singhbhum", "Chatra", "Dumka", "Garhwa", "Godda",
  "Gumla", "Jamtara", "Khunti", "Koderma", "Latehar",
  "Lohardaga", "Pakur", "Sahibganj", "Simdega"
];

const CATEGORIES = [
  "Water & Sanitation",
  "Roads & Infrastructure",
  "Healthcare & Nutrition",
  "Education & Youth",
  "Renewable Energy & Power",
  "Agriculture & Livelihoods",
  "Sanitation & Waste",
  "Civic Infrastructure",
];

interface ProblemItem {
  id: string;
  title: string;
  description: string;
  category: string;
  subCategory?: string | null;
  district: string;
  locationText?: string | null;
  affectedCount: number;
  priorityScore: number;
  priorityTier: "HIGH" | "MEDIUM" | "LOW";
  verificationStatus: "AI_SCREENED" | "GOVERNMENT_VERIFIED" | "DECLINED_BY_GOVT";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  createdAt: string;
  aiAnalysis?: {
    aiSummary?: string;
    predictedCategory?: string;
    isDuplicate?: boolean;
    duplicateSimilarity?: number | null;
    severityScore?: number;
    affectedPeopleScore?: number;
    frequencyScore?: number;
    evidenceScore?: number;
    urgencyScore?: number;
  } | null;
  submittedBy?: {
    id: string;
    name: string;
    role: string;
    district: string;
  } | null;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const ProblemBankPage: React.FC = () => {
  const { user, token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [district, setDistrict] = useState(searchParams.get("district") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [priorityTier, setPriorityTier] = useState(searchParams.get("priorityTier") || "");
  const [verificationStatus, setVerificationStatus] = useState(searchParams.get("verificationStatus") || "");
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1", 10));

  // Data & State
  const [problems, setProblems] = useState<ProblemItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 9,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProblems = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (district) params.set("district", district);
      if (category) params.set("category", category);
      if (priorityTier) params.set("priorityTier", priorityTier);
      if (verificationStatus) params.set("verificationStatus", verificationStatus);
      params.set("page", String(page));
      params.set("limit", "9");

      // Update URL query parameters
      setSearchParams(params, { replace: true });

      const res = await fetch(`http://localhost:5000/api/problems?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch Problem Bank (Status: ${res.status})`);
      }

      const data = await res.json();
      if (data.success) {
        setProblems(data.problems || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        throw new Error(data.error || "Failed to load problems.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while loading problems.");
    } finally {
      setIsLoading(false);
    }
  }, [token, search, district, category, priorityTier, verificationStatus, page, setSearchParams]);

  useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProblems();
  };

  const handleResetFilters = () => {
    setSearch("");
    setDistrict("");
    setCategory("");
    setPriorityTier("");
    setVerificationStatus("");
    setPage(1);
  };

  const getPriorityColor = (tier: string) => {
    switch (tier) {
      case "HIGH":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "MEDIUM":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "LOW":
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 70) return "bg-rose-600 text-white";
    if (score >= 40) return "bg-amber-500 text-white";
    return "bg-slate-600 text-white";
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={user ? getDashboardPath(user.role) : "/"} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                CB
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">CivicBridge</h1>
                <span className="text-xs text-slate-500">Jharkhand Community Platform</span>
              </div>
            </Link>
            <span className="hidden sm:inline-block w-px h-6 bg-slate-200 mx-1"></span>
            <span className="hidden sm:inline-block px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-full">
              Problem Bank
            </span>
          </div>

          <div className="flex items-center gap-2">
            {user?.role === "CITIZEN" && (
              <Link
                to="/citizen/report"
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-2 rounded-lg transition-colors shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Report a Problem</span>
              </Link>
            )}
            <Link
              to={user ? getDashboardPath(user.role) : "/"}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors"
            >
              <span>Dashboard ({user?.role})</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="bg-white border-b border-slate-200 py-6 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200 mb-2">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                Statewide Verified Community Challenges
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                CivicBridge Problem Bank
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
                Explore authentic community problems across all 24 districts of Jharkhand that have passed AI relevance screening. Open for university student projects, startup commercialization, and industry CSR collaboration.
              </p>
            </div>

            {/* Advisory Info Pill */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 max-w-md">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800">Visibility Policy: </span>
                  All problems with <strong className="text-emerald-700">AI Screening Passed</strong> are open and actionable. Government verification is an advisory trust signal and not a participation gate.
                </div>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by keywords, problem title, description, or landmarks..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white shadow-sm"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Search className="w-4 h-4" />
                <span>Search</span>
              </button>
            </form>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 pt-1">
              {/* District Filter */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  District
                </label>
                <select
                  value={district}
                  onChange={(e) => {
                    setDistrict(e.target.value);
                    setPage(1);
                  }}
                  className="w-full text-xs py-2 px-2.5 bg-white rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">All Districts ({JHARKHAND_DISTRICTS.length})</option>
                  {JHARKHAND_DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setPage(1);
                  }}
                  className="w-full text-xs py-2 px-2.5 bg-white rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Priority Tier Filter */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Priority Tier
                </label>
                <select
                  value={priorityTier}
                  onChange={(e) => {
                    setPriorityTier(e.target.value);
                    setPage(1);
                  }}
                  className="w-full text-xs py-2 px-2.5 bg-white rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">All Priority Tiers</option>
                  <option value="HIGH">HIGH (Score 70–100)</option>
                  <option value="MEDIUM">MEDIUM (Score 40–69.9)</option>
                  <option value="LOW">LOW (Score 0–39.9)</option>
                </select>
              </div>

              {/* Verification Status Filter */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Trust Signal
                </label>
                <select
                  value={verificationStatus}
                  onChange={(e) => {
                    setVerificationStatus(e.target.value);
                    setPage(1);
                  }}
                  className="w-full text-xs py-2 px-2.5 bg-white rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">All Trust States</option>
                  <option value="AI_SCREENED">AI Screened (Actionable)</option>
                  <option value="GOVERNMENT_VERIFIED">Government Verified</option>
                  <option value="DECLINED_BY_GOVT">Declined by Govt</option>
                </select>
              </div>

              {/* Reset Button */}
              <div className="col-span-2 sm:col-span-4 lg:col-span-1 flex items-end">
                <button
                  onClick={handleResetFilters}
                  className="w-full py-2 px-3 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filters</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Listing Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* Results Metadata Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-900">{problems.length}</span> of{" "}
            <span className="font-bold text-slate-900">{pagination.total}</span> eligible civic problems
            {district && <span> in <strong className="text-slate-800">{district}</strong></span>}
            {category && <span> under <strong className="text-slate-800">{category}</strong></span>}
            {priorityTier && <span> (<strong className="text-slate-800">{priorityTier}</strong> tier)</span>}
          </div>
          <div className="text-slate-400">
            Sorted by: <span className="font-semibold text-slate-700">Highest Priority Score First</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="py-16 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-500 font-medium">Filtering & loading Problem Bank problems...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && problems.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm max-w-lg mx-auto space-y-4">
            <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Filter className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">No matching civic problems found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No problems matched your current combination of filters. Try broadening your criteria or reset the search filters.
              </p>
            </div>
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear All Filters
            </button>
          </div>
        )}

        {/* Problem Cards Grid */}
        {!isLoading && problems.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {problems.map((problem) => {
              const score = problem.priorityScore || 0;
              return (
                <div
                  key={problem.id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                >
                  {/* Card Header & Content */}
                  <div className="p-5 space-y-3.5">
                    {/* Badges Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                        <Layers className="w-3 h-3 text-slate-500" />
                        {problem.category}
                      </span>

                      {/* Priority Score & Tier */}
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${getScoreBadgeColor(score)}`}>
                          {score}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${getPriorityColor(
                            problem.priorityTier
                          )}`}
                        >
                          {problem.priorityTier}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h2 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug">
                      {problem.title}
                    </h2>

                    {/* AI Summary */}
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-3 leading-relaxed">
                      {problem.aiAnalysis?.aiSummary || problem.description}
                    </p>

                    {/* Advisory Duplicate Notice if applicable */}
                    {problem.aiAnalysis?.isDuplicate && (
                      <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-2 text-[11px] flex items-center gap-1.5">
                        <Copy className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">
                          Advisory Duplicate Match ({Math.round((problem.aiAnalysis.duplicateSimilarity || 0) * 100)}% match) — Active
                        </span>
                      </div>
                    )}

                    {/* Metadata Specs */}
                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-500 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate font-medium text-slate-700">
                          {problem.district}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate font-medium text-slate-700">
                          {problem.affectedCount} people affected
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {new Date(problem.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          Status: <strong className="text-slate-700">{problem.status}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Trust Signal & Details Link */}
                  <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    {/* Trust Signal */}
                    {problem.verificationStatus === "GOVERNMENT_VERIFIED" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                        Govt Verified
                      </span>
                    ) : problem.verificationStatus === "DECLINED_BY_GOVT" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-200/80 px-2 py-0.5 rounded-full">
                        <XCircle className="w-3.5 h-3.5 text-slate-500" />
                        Govt Declined (Active)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        AI Screened
                      </span>
                    )}

                    {/* Details Page Link */}
                    <Link
                      to={`/problems/${problem.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 group/link"
                    >
                      <span>Inspect Details</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {!isLoading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-xs">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <span className="text-slate-600">
              Page <strong className="text-slate-900">{pagination.page}</strong> of{" "}
              <strong className="text-slate-900">{pagination.totalPages}</strong>
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={pagination.page >= pagination.totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default ProblemBankPage;
