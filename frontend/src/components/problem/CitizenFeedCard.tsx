import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../config/api";
import {
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
  ThumbsUp,
  MessageSquare,
  Share2,
  Bookmark,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { CommentsSection } from "./CommentsSection";

export interface CitizenFeedProblem {
  id: string;
  title: string;
  description: string;
  category: string;
  subCategory?: string | null;
  district: string;
  locationText?: string | null;
  affectedCount: number;
  evidenceUrl?: string | null;
  videoUrl?: string | null;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  filterStatus: "PENDING" | "PASSED" | "REJECTED" | "FLAGGED";
  verificationStatus: "AI_SCREENED" | "GOVERNMENT_VERIFIED" | "DECLINED_BY_GOVT";
  verificationNotes?: string | null;
  priorityScore: number;
  priorityTier: "HIGH" | "MEDIUM" | "LOW";
  createdAt: string;
  submittedBy?: {
    id: string;
    name: string;
    role: string;
    district?: string | null;
  } | null;
  commentCount: number;
  evidenceCount: number;
  supportCount: number;
  followCount: number;
  affectedReactionCount: number;
  userReactions?: {
    hasAffected: boolean;
    hasSupported: boolean;
    hasFollowed: boolean;
  };
}

interface CitizenFeedCardProps {
  problem: CitizenFeedProblem;
  onRefresh?: () => void;
}

export const CitizenFeedCard: React.FC<CitizenFeedCardProps> = ({ problem, onRefresh }) => {
  const { token } = useAuth();

  // Reaction states with optimistic updates
  const [hasAffected, setHasAffected] = useState(!!problem.userReactions?.hasAffected);
  const [affectedCount, setAffectedCount] = useState(problem.affectedCount);

  const [hasSupported, setHasSupported] = useState(!!problem.userReactions?.hasSupported);
  const [supportCount, setSupportCount] = useState(problem.supportCount);

  const [hasFollowed, setHasFollowed] = useState(!!problem.userReactions?.hasFollowed);

  const [commentCount, setCommentCount] = useState(problem.commentCount);
  const [showComments, setShowComments] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isReacting, setIsReacting] = useState(false);

  // Toggle reaction API helper
  const toggleReaction = async (type: "AFFECTED" | "SUPPORT" | "FOLLOW") => {
    if (!token) {
      alert("Please sign in to react to community problems.");
      return;
    }
    if (isReacting) return;

    // Optimistic UI update
    if (type === "AFFECTED") {
      const nextActive = !hasAffected;
      setHasAffected(nextActive);
      setAffectedCount((prev) => (nextActive ? prev + 1 : Math.max(1, prev - 1)));
    } else if (type === "SUPPORT") {
      const nextActive = !hasSupported;
      setHasSupported(nextActive);
      setSupportCount((prev) => (nextActive ? prev + 1 : Math.max(0, prev - 1)));
    } else if (type === "FOLLOW") {
      setHasFollowed(!hasFollowed);
    }

    setIsReacting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/problems/${problem.id}/react`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (type === "AFFECTED") {
            setHasAffected(data.active);
            setAffectedCount(data.affectedCount);
          } else if (type === "SUPPORT") {
            setHasSupported(data.active);
            setSupportCount(data.supportCount);
          } else if (type === "FOLLOW") {
            setHasFollowed(data.active);
          }
          if (onRefresh) onRefresh();
        }
      }
    } catch {
      // Revert if error
      if (type === "AFFECTED") {
        setHasAffected(hasAffected);
        setAffectedCount(problem.affectedCount);
      } else if (type === "SUPPORT") {
        setHasSupported(hasSupported);
        setSupportCount(problem.supportCount);
      }
    } finally {
      setIsReacting(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/problems/${problem.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: problem.title,
          text: `Check out this civic problem in ${problem.district}: ${problem.title}`,
          url,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2200);
    } catch {
      alert(`Problem link: ${url}`);
    }
  };

  const getPriorityBadge = (tier: string) => {
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "RESOLVED":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "IN_PROGRESS":
        return "bg-blue-50 text-blue-800 border-blue-200";
      case "CLOSED":
        return "bg-slate-100 text-slate-600 border-slate-200";
      case "OPEN":
      default:
        return "bg-amber-50 text-amber-800 border-amber-200";
    }
  };

  return (
    <article className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col">
      {/* 1. Header: Submitter, Location, Category, Verification Badge */}
      <div className="p-4 sm:p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
              {problem.submittedBy?.name?.charAt(0) || "C"}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-900">
                  {problem.submittedBy?.name || "Verified Citizen"}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                  {problem.submittedBy?.role || "CITIZEN"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                <span className="flex items-center gap-1 font-medium text-slate-600">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {problem.district} {problem.locationText ? `• ${problem.locationText}` : ""}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-400">
                  <Clock className="w-3 h-3" />
                  {new Date(problem.createdAt).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Verification Badge */}
          <div>
            {problem.verificationStatus === "GOVERNMENT_VERIFIED" ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Govt Verified</span>
              </span>
            ) : problem.verificationStatus === "DECLINED_BY_GOVT" ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                <XCircle className="w-3.5 h-3.5 text-slate-500" />
                <span>Govt Declined</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>AI Screened</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Problem Title & Description */}
      <div className="px-4 sm:px-5 space-y-2">
        <Link
          to={`/problems/${problem.id}`}
          className="group block"
        >
          <h2 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors leading-snug">
            {problem.title}
          </h2>
        </Link>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-3">
          {problem.description}
        </p>

        {/* Category & Subcategory tags */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {problem.category}
          </span>
          {problem.subCategory && (
            <span className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
              {problem.subCategory}
            </span>
          )}
        </div>
      </div>

      {/* 3. Photo / Evidence Preview */}
      {problem.evidenceUrl ? (
        <div className="mt-3.5 px-4 sm:px-5">
          <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video max-h-72 w-full">
            <img
              src={problem.evidenceUrl}
              alt={problem.title}
              className="w-full h-full object-cover hover:scale-102 transition-transform duration-300"
              loading="lazy"
              onError={(e) => {
                // Graceful fallback for broken image URLs
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          </div>
        </div>
      ) : null}

      {/* 4. Priority & Scale Indicators */}
      <div className="px-4 sm:px-5 pt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${getPriorityBadge(
              problem.priorityTier
            )}`}
          >
            <span>Priority: {problem.priorityTier}</span>
            <span className="opacity-75 font-mono">({Math.round(problem.priorityScore)})</span>
          </span>

          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getStatusBadge(
              problem.status
            )}`}
          >
            Status: {problem.status.replace("_", " ")}
          </span>
        </div>

        {/* Affected Citizens Highlight */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
            hasAffected
              ? "bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          <Users className="w-3.5 h-3.5 text-slate-600" />
          <span>{affectedCount.toLocaleString()} Citizens Affected</span>
        </div>
      </div>

      {/* 5. Civic Social Action Bar */}
      <div className="mt-4 pt-3 pb-3 px-4 sm:px-5 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2">
        {/* Left Action Buttons: Affected Me, Support, Comment, Follow */}
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          {/* Affected Me Action */}
          <button
            type="button"
            onClick={() => toggleReaction("AFFECTED")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
              hasAffected
                ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/40"
                : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
            }`}
          >
            <CheckCircle2 className={`w-4 h-4 ${hasAffected ? "text-white" : "text-emerald-600"}`} />
            <span>{hasAffected ? "I Am Affected" : "Affected Me"}</span>
          </button>

          {/* Support / Upvote */}
          <button
            type="button"
            onClick={() => toggleReaction("SUPPORT")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all min-h-[44px] ${
              hasSupported
                ? "bg-rose-50 text-rose-700 border border-rose-200"
                : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
            }`}
          >
            <ThumbsUp className={`w-4 h-4 ${hasSupported ? "fill-rose-600 text-rose-600" : "text-slate-500"}`} />
            <span>{supportCount} Support</span>
          </button>

          {/* Comments Toggle */}
          <button
            type="button"
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors min-h-[44px]"
          >
            <MessageSquare className="w-4 h-4 text-slate-500" />
            <span>{commentCount} Discuss</span>
            {showComments ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* Follow Toggle */}
          <button
            type="button"
            onClick={() => toggleReaction("FOLLOW")}
            title={hasFollowed ? "Unfollow problem updates" : "Follow problem updates"}
            className={`p-2 rounded-xl border transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
              hasFollowed
                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                : "bg-white hover:bg-slate-100 text-slate-500 border-slate-200"
            }`}
          >
            <Bookmark className={`w-4 h-4 ${hasFollowed ? "fill-indigo-600 text-indigo-600" : ""}`} />
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={handleShare}
            title="Share problem"
            className="p-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center relative"
          >
            <Share2 className="w-4 h-4 text-slate-500" />
            {isCopied && (
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900 text-white text-[10px] font-bold rounded shadow-md whitespace-nowrap animate-in fade-in">
                Link copied!
              </span>
            )}
          </button>
        </div>

        {/* View Problem Deep Link */}
        <Link
          to={`/problems/${problem.id}`}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-xl transition-colors min-h-[44px]"
        >
          <span>View Problem</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* 6. Inline Community Discussion Dropdown */}
      {showComments && (
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <CommentsSection
            problemId={problem.id}
            onCommentCountChange={(newCount) => setCommentCount(newCount)}
          />
        </div>
      )}
    </article>
  );
};
