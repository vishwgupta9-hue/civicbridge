import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../config/api";
import {
  MapPin,
  FileText,
  ThumbsUp,
  Bookmark,
  Camera,
  CheckCircle2,
  ArrowRight,
  Activity,
} from "lucide-react";

interface CitizenProfileData {
  stats: {
    reportedCount: number;
    supportedCount: number;
    followedCount: number;
    affectedCount: number;
    evidenceCount: number;
    resolvedCount: number;
  };
  reportedProblems: any[];
  supportedProblems: any[];
  followedProblems: any[];
  evidenceContributed: any[];
  recentActivity: Array<{
    type: string;
    title: string;
    timestamp: string;
    problemId?: string;
    badge?: string;
  }>;
}

export const CitizenProfileView: React.FC = () => {
  const { user, token } = useAuth();
  const [profileData, setProfileData] = useState<CitizenProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "REPORTED" | "SUPPORTED" | "FOLLOWED" | "EVIDENCE" | "ACTIVITY"
  >("REPORTED");

  const fetchProfile = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/citizen/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setProfileData(data);
        }
      }
    } catch {
      // Non-blocking
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs text-slate-500 font-medium">Loading your citizen civic profile...</p>
      </div>
    );
  }

  const stats = profileData?.stats || {
    reportedCount: 0,
    supportedCount: 0,
    followedCount: 0,
    affectedCount: 0,
    evidenceCount: 0,
    resolvedCount: 0,
  };

  return (
    <div className="space-y-6">
      {/* 1. Profile Header Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-2xl shadow-xs">
              {user?.name?.charAt(0) || "C"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{user?.name}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  CITIZEN
                </span>
              </div>
              <p className="text-xs text-slate-500">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-600">
                <span className="flex items-center gap-1 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  District: {user?.district || "East Singhbhum"}
                </span>
              </div>
            </div>
          </div>

          <Link
            to="/citizen/report"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors min-h-[44px]"
          >
            <FileText className="w-4 h-4" />
            <span>Report New Problem</span>
          </Link>
        </div>
      </div>

      {/* 2. Civic Impact Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center space-y-1">
          <FileText className="w-5 h-5 text-emerald-600 mx-auto" />
          <div className="text-xl font-black text-slate-900">{stats.reportedCount}</div>
          <div className="text-[11px] font-medium text-slate-500">Reported</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center space-y-1">
          <ThumbsUp className="w-5 h-5 text-rose-600 mx-auto" />
          <div className="text-xl font-black text-slate-900">{stats.supportedCount}</div>
          <div className="text-[11px] font-medium text-slate-500">Supported</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center space-y-1">
          <Bookmark className="w-5 h-5 text-indigo-600 mx-auto" />
          <div className="text-xl font-black text-slate-900">{stats.followedCount}</div>
          <div className="text-[11px] font-medium text-slate-500">Followed</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center space-y-1">
          <Camera className="w-5 h-5 text-teal-600 mx-auto" />
          <div className="text-xl font-black text-slate-900">{stats.evidenceCount}</div>
          <div className="text-[11px] font-medium text-slate-500">Evidence Contributed</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center space-y-1 col-span-2 sm:col-span-1">
          <CheckCircle2 className="w-5 h-5 text-blue-600 mx-auto" />
          <div className="text-xl font-black text-slate-900">{stats.resolvedCount}</div>
          <div className="text-[11px] font-medium text-slate-500">Resolved Problems</div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto p-1.5 gap-1">
          <button
            onClick={() => setActiveTab("REPORTED")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors min-h-[44px] ${
              activeTab === "REPORTED"
                ? "bg-emerald-50 text-emerald-800 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            My Reports ({profileData?.reportedProblems.length || 0})
          </button>

          <button
            onClick={() => setActiveTab("SUPPORTED")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors min-h-[44px] ${
              activeTab === "SUPPORTED"
                ? "bg-emerald-50 text-emerald-800 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            Supported ({profileData?.supportedProblems.length || 0})
          </button>

          <button
            onClick={() => setActiveTab("FOLLOWED")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors min-h-[44px] ${
              activeTab === "FOLLOWED"
                ? "bg-emerald-50 text-emerald-800 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            Followed ({profileData?.followedProblems.length || 0})
          </button>

          <button
            onClick={() => setActiveTab("EVIDENCE")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors min-h-[44px] ${
              activeTab === "EVIDENCE"
                ? "bg-emerald-50 text-emerald-800 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            Evidence Updates ({profileData?.evidenceContributed.length || 0})
          </button>

          <button
            onClick={() => setActiveTab("ACTIVITY")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors min-h-[44px] ${
              activeTab === "ACTIVITY"
                ? "bg-emerald-50 text-emerald-800 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            Recent Activity
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5">
          {/* TAB 1: MY REPORTED PROBLEMS */}
          {activeTab === "REPORTED" && (
            <div className="space-y-3">
              {profileData?.reportedProblems.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  You haven't reported any civic problems yet.
                </div>
              ) : (
                profileData?.reportedProblems.map((prob) => (
                  <div
                    key={prob.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">{prob.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                          {prob.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                        <span>{prob.category}</span>
                        <span>•</span>
                        <span>{prob.district}</span>
                        <span>•</span>
                        <span>{prob.affectedCount} affected</span>
                      </div>
                    </div>
                    <Link
                      to={`/problems/${prob.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 min-h-[36px]"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: SUPPORTED PROBLEMS */}
          {activeTab === "SUPPORTED" && (
            <div className="space-y-3">
              {profileData?.supportedProblems.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  You haven't upvoted or supported any community problems yet.
                </div>
              ) : (
                profileData?.supportedProblems.map((prob) => (
                  <div
                    key={prob.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-slate-900">{prob.title}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span>{prob.category}</span>
                        <span>•</span>
                        <span>{prob.district}</span>
                      </div>
                    </div>
                    <Link
                      to={`/problems/${prob.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 min-h-[36px]"
                    >
                      <span>View Problem</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: FOLLOWED PROBLEMS */}
          {activeTab === "FOLLOWED" && (
            <div className="space-y-3">
              {profileData?.followedProblems.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  You are not currently following any civic problems.
                </div>
              ) : (
                profileData?.followedProblems.map((prob) => (
                  <div
                    key={prob.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-slate-900">{prob.title}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span>{prob.category}</span>
                        <span>•</span>
                        <span>{prob.district}</span>
                      </div>
                    </div>
                    <Link
                      to={`/problems/${prob.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 min-h-[36px]"
                    >
                      <span>View Problem</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: EVIDENCE CONTRIBUTED */}
          {activeTab === "EVIDENCE" && (
            <div className="space-y-3">
              {profileData?.evidenceContributed.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  You haven't contributed evidence updates yet.
                </div>
              ) : (
                profileData?.evidenceContributed.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{item.title}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(item.createdAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{item.description}</p>
                    {item.problem && (
                      <div className="pt-1 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">
                          For: {item.problem.title} ({item.problem.district})
                        </span>
                        <Link
                          to={`/problems/${item.problem.id}`}
                          className="text-xs font-bold text-emerald-700 hover:underline"
                        >
                          View Problem
                        </Link>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 5: RECENT ACTIVITY */}
          {activeTab === "ACTIVITY" && (
            <div className="space-y-3">
              {profileData?.recentActivity.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No recent civic activity recorded.
                </div>
              ) : (
                profileData?.recentActivity.map((act, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <Activity className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="font-semibold text-slate-800">{act.title}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-slate-400">
                        {new Date(act.timestamp).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      {act.problemId && (
                        <Link
                          to={`/problems/${act.problemId}`}
                          className="text-emerald-700 font-bold hover:underline"
                        >
                          →
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
