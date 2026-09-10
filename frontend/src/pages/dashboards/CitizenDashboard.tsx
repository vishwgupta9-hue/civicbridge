import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../config/api";
import {
  LogOut,
  User as UserIcon,
  MapPin,
  AlertCircle,
  PlusCircle,
  Layers,
  RotateCcw,
  Search,
  Flame,
  Users,
  AlertTriangle,
  Clock,
  Compass,
  CheckCircle2,
  Activity,
  X,
} from "lucide-react";
import { CitizenFeedCard, CitizenFeedProblem } from "../../components/problem/CitizenFeedCard";
import { CitizenProfileView } from "../../components/problem/CitizenProfileView";
import { NotificationsPopover } from "../../components/notifications/NotificationsPopover";

const JHARKHAND_DISTRICTS = [
  "All Districts",
  "East Singhbhum",
  "Ranchi",
  "Dhanbad",
  "Bokaro",
  "Hazaribagh",
  "Palamu",
  "Deoghar",
  "Giridih",
  "Ramgarh",
  "Saraikela Kharsawan",
  "West Singhbhum",
  "Dumka",
  "Koderma",
];

const CATEGORIES = [
  "ALL",
  "Water & Sanitation",
  "Rural Roads & Transport",
  "Environment & Pollution",
  "Public Healthcare & Clinics",
  "Agriculture & Irrigation",
  "Power & Renewable Energy",
  "Civic Infrastructure",
];

type FeedFilterType =
  | "ALL"
  | "NEARBY"
  | "TRENDING"
  | "MOST_AFFECTED"
  | "URGENT"
  | "RECENT"
  | "IN_PROGRESS"
  | "RESOLVED";

export const CitizenDashboard: React.FC = () => {
  const { user, token, logout } = useAuth();

  // Primary view: Community Social Feed vs My Civic Profile
  const [mainView, setMainView] = useState<"FEED" | "PROFILE">("FEED");

  // Feed State
  const [feedProblems, setFeedProblems] = useState<CitizenFeedProblem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [selectedFilter, setSelectedFilter] = useState<FeedFilterType>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("All Districts");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeSearch, setActiveSearch] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchFeed = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append("filter", selectedFilter);
      params.append("page", String(page));
      params.append("limit", "12");

      if (selectedCategory && selectedCategory !== "ALL") {
        params.append("category", selectedCategory);
      }

      if (selectedDistrict && selectedDistrict !== "All Districts" && selectedFilter !== "NEARBY") {
        params.append("district", selectedDistrict);
      }

      if (activeSearch.trim()) {
        params.append("search", activeSearch.trim());
      }

      const res = await fetch(`${API_BASE_URL}/citizen/feed?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        throw new Error(`Failed to load community problem feed (HTTP ${res.status}).`);
      }

      const data = await res.json();
      if (data.success) {
        setFeedProblems(data.problems || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
      } else {
        throw new Error(data.error || "Unable to parse feed data.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while fetching feed.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedFilter, selectedCategory, selectedDistrict, activeSearch, page, token]);

  useEffect(() => {
    if (mainView === "FEED") {
      fetchFeed();
    }
  }, [fetchFeed, mainView]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchQuery);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setActiveSearch("");
    setPage(1);
  };

  const userDistrict = user?.district || "East Singhbhum";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 1. Header Navigation Bar */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & Platform Badge */}
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard/citizen"
              className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-lg"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                CB
              </div>
              <div className="leading-tight">
                <span className="text-base font-bold text-slate-900 block">CivicBridge</span>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.2 rounded-full inline-block">
                  Citizen Community Network
                </span>
              </div>
            </Link>
          </div>

          {/* Right Navigation Actions */}
          <div className="flex items-center gap-2">
            {/* Problem Bank Link */}
            <Link
              to="/problems"
              className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-colors min-h-[44px]"
            >
              <Layers className="w-4 h-4 text-slate-500" />
              <span>Problem Bank</span>
            </Link>

            {/* Notifications Bell */}
            <NotificationsPopover />

            {/* Report a Problem CTA */}
            <Link
              to="/citizen/report"
              className="flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 rounded-xl transition-colors shadow-sm min-h-[44px]"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Report a Problem</span>
              <span className="sm:hidden">Report</span>
            </Link>

            {/* User Dropdown / Logout */}
            <button
              onClick={logout}
              title="Logout"
              className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors min-h-[44px]"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Container */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* Banner with Citizen Context & Mode Switch */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-black text-xl shadow-xs">
                {user?.name?.charAt(0) || "C"}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-bold text-slate-900 leading-tight">
                    Welcome, {user?.name}
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                    CITIZEN
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Statewide Civic Problem Network • Connecting local ground-truth to universities and industry solvers.
                </p>
              </div>
            </div>

            {/* Primary View Switcher: Feed vs Profile */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setMainView("FEED")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all min-h-[40px] ${
                  mainView === "FEED"
                    ? "bg-white text-emerald-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>Community Feed</span>
              </button>

              <button
                type="button"
                onClick={() => setMainView("PROFILE")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all min-h-[40px] ${
                  mainView === "PROFILE"
                    ? "bg-white text-emerald-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <UserIcon className="w-4 h-4" />
                <span>My Civic Profile</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Conditional View: FEED or PROFILE */}
        {mainView === "PROFILE" ? (
          <CitizenProfileView />
        ) : (
          <div className="space-y-6">
            {/* Search & Secondary Filter Controls */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Search Bar */}
                <form onSubmit={handleSearchSubmit} className="flex-1 relative">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search community issues by keyword, title, locality, or water/road challenges..."
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400 transition-all min-h-[44px]"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={handleClearSearch}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </form>

                {/* Category & District Dropdowns */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setPage(1);
                    }}
                    className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                  >
                    <option value="ALL">All Categories</option>
                    {CATEGORIES.filter((c) => c !== "ALL").map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedDistrict}
                    onChange={(e) => {
                      setSelectedDistrict(e.target.value);
                      if (selectedFilter === "NEARBY") setSelectedFilter("ALL");
                      setPage(1);
                    }}
                    className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                  >
                    {JHARKHAND_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Social Filter Tabs (Scrollable on mobile) */}
              <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto pb-1">
                {/* 1. All Problems */}
                <button
                  onClick={() => {
                    setSelectedFilter("ALL");
                    setPage(1);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors min-h-[40px] flex items-center gap-1.5 ${
                    selectedFilter === "ALL"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>All Problems</span>
                </button>

                {/* 2. Nearby */}
                <button
                  onClick={() => {
                    setSelectedFilter("NEARBY");
                    setPage(1);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors min-h-[40px] flex items-center gap-1.5 ${
                    selectedFilter === "NEARBY"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Nearby ({userDistrict})</span>
                </button>

                {/* 3. Trending */}
                <button
                  onClick={() => {
                    setSelectedFilter("TRENDING");
                    setPage(1);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors min-h-[40px] flex items-center gap-1.5 ${
                    selectedFilter === "TRENDING"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>Trending</span>
                </button>

                {/* 4. Most Affected */}
                <button
                  onClick={() => {
                    setSelectedFilter("MOST_AFFECTED");
                    setPage(1);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors min-h-[40px] flex items-center gap-1.5 ${
                    selectedFilter === "MOST_AFFECTED"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Most Affected</span>
                </button>

                {/* 5. Urgent */}
                <button
                  onClick={() => {
                    setSelectedFilter("URGENT");
                    setPage(1);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors min-h-[40px] flex items-center gap-1.5 ${
                    selectedFilter === "URGENT"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  <span>Urgent</span>
                </button>

                {/* 6. Recently Reported */}
                <button
                  onClick={() => {
                    setSelectedFilter("RECENT");
                    setPage(1);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors min-h-[40px] flex items-center gap-1.5 ${
                    selectedFilter === "RECENT"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Recently Reported</span>
                </button>

                {/* 7. In Progress */}
                <button
                  onClick={() => {
                    setSelectedFilter("IN_PROGRESS");
                    setPage(1);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors min-h-[40px] flex items-center gap-1.5 ${
                    selectedFilter === "IN_PROGRESS"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>In Progress</span>
                </button>

                {/* 8. Resolved */}
                <button
                  onClick={() => {
                    setSelectedFilter("RESOLVED");
                    setPage(1);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors min-h-[40px] flex items-center gap-1.5 ${
                    selectedFilter === "RESOLVED"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Resolved</span>
                </button>
              </div>
            </div>

            {/* Results Header Info */}
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>
                Showing <strong className="text-slate-800">{feedProblems.length}</strong> of{" "}
                <strong className="text-slate-800">{totalCount}</strong> community problems
                {selectedFilter === "NEARBY" && ` in ${userDistrict}`}
                {activeSearch && ` matching "${activeSearch}"`}
              </span>
              <button
                onClick={fetchFeed}
                className="font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Refresh Feed</span>
              </button>
            </div>

            {/* Loading Skeleton */}
            {isLoading && (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3 shadow-xs">
                <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs font-semibold text-slate-600">Loading civic problem network...</p>
              </div>
            )}

            {/* Error Message */}
            {error && !isLoading && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-3 shadow-xs">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">Failed to load feed</span>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && feedProblems.length === 0 && (
              <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 shadow-sm max-w-md mx-auto space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <Compass className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">No Problems Found</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    No community problems match your current filter criteria. Try clearing search filters or report the first issue in your locality.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedFilter("ALL");
                      setSelectedCategory("ALL");
                      setSelectedDistrict("All Districts");
                      setActiveSearch("");
                      setSearchQuery("");
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all min-h-[40px]"
                  >
                    Reset Filters
                  </button>
                  <Link
                    to="/citizen/report"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs min-h-[40px] flex items-center gap-1.5"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Report a Problem</span>
                  </Link>
                </div>
              </div>
            )}

            {/* Problem Feed Cards List */}
            {!isLoading && !error && feedProblems.length > 0 && (
              <div className="space-y-6">
                {feedProblems.map((problem) => (
                  <CitizenFeedCard
                    key={problem.id}
                    problem={problem}
                    onRefresh={fetchFeed}
                  />
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && !isLoading && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 min-h-[40px]"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-600 font-medium">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 min-h-[40px]"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default CitizenDashboard;
