import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config/api";
import { NavigationBar } from "../components/layout/NavigationBar";
import {
  Handshake,
  CheckCircle2,
  XCircle,
  Clock,
  PlusCircle,
  AlertTriangle,
  RotateCcw,
  Briefcase,
  ArrowRightLeft,
  MessageSquare,
} from "lucide-react";
import { CollaborationRecord } from "../types";

export const CollaborationDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, token } = useAuth();

  const [collab, setCollab] = useState<CollaborationRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & Action loading
  const [isActing, setIsActing] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);

  // Form states
  const [milestoneForm, setMilestoneForm] = useState({
    title: "",
    description: "",
    targetDate: "",
  });

  const [progressForm, setProgressForm] = useState({
    updateText: "",
    status: "IN_PROGRESS",
  });

  const fetchCollaboration = useCallback(async () => {
    if (!token || !id) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/collaborations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 404) {
        throw new Error(`Collaboration #${id} was not found.`);
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load collaboration.");
      }

      setCollab(data.collaboration);
    } catch (err: any) {
      setError(err.message || "Failed to load collaboration details.");
    } finally {
      setIsLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    fetchCollaboration();
  }, [fetchCollaboration]);

  // Provider Accept
  const handleAccept = async () => {
    if (!token || !id) return;
    setIsActing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/collaborations/${id}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to accept collaboration");
      await fetchCollaboration();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsActing(false);
    }
  };

  // Provider Reject
  const handleReject = async () => {
    if (!token || !id) return;
    const reason = prompt("Enter reason for declining this request:") || "Provider unavailable";
    setIsActing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/collaborations/${id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to decline collaboration");
      await fetchCollaboration();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsActing(false);
    }
  };

  // Complete Collaboration
  const handleComplete = async () => {
    if (!token || !id) return;
    if (!confirm("Are you sure you want to mark this collaboration as completed?")) return;
    setIsActing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/collaborations/${id}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to complete collaboration");
      await fetchCollaboration();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsActing(false);
    }
  };

  // Add Milestone
  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !id) return;
    setIsActing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/milestones`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          collaborationId: id,
          title: milestoneForm.title.trim(),
          description: milestoneForm.description.trim() || undefined,
          targetDate: milestoneForm.targetDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to add milestone");
      setShowMilestoneModal(false);
      setMilestoneForm({ title: "", description: "", targetDate: "" });
      await fetchCollaboration();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsActing(false);
    }
  };

  // Post Progress
  const handlePostProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !id) return;
    setIsActing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/progress-updates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          collaborationId: id,
          updateText: progressForm.updateText.trim(),
          status: progressForm.status,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to post progress update");
      setShowProgressModal(false);
      setProgressForm({ updateText: "", status: "IN_PROGRESS" });
      await fetchCollaboration();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsActing(false);
    }
  };

  const isProvider = user?.organizationId && collab?.providerOrgId === user.organizationId;
  const isParticipant =
    user?.role === "ADMIN" ||
    (user?.organizationId &&
      (collab?.providerOrgId === user.organizationId ||
        collab?.recipientOrgId === user.organizationId));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <NavigationBar activeSection="exchange" />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-500 font-medium">Loading Collaboration...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !collab) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <NavigationBar activeSection="exchange" />
        <div className="flex-1 max-w-xl mx-auto w-full p-6 flex items-center">
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center space-y-4 w-full">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Collaboration Not Found</h2>
              <p className="text-xs text-slate-500 mt-1">{error || "Could not load collaboration details."}</p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              <Link
                to="/exchange"
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Back to Exchange
              </Link>
              <button
                onClick={() => fetchCollaboration()}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "ACTIVE":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "COMPLETED":
        return "bg-purple-50 text-purple-800 border-purple-200";
      case "CANCELLED":
        return "bg-rose-50 text-rose-800 border-rose-200";
      case "INITIATED":
      default:
        return "bg-amber-50 text-amber-800 border-amber-200";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <NavigationBar activeSection="exchange" />

      {/* Header Banner */}
      <div className="bg-white border-b border-slate-200 py-6 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <Link
              to="/exchange"
              className="inline-flex items-center gap-1.5 text-slate-600 hover:text-emerald-700 font-semibold transition-colors"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Back to Resource Exchange</span>
            </Link>

            <span className="font-mono text-slate-400">
              Collaboration ID: {collab.id.slice(0, 8)}...{collab.id.slice(-4)}
            </span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase ${getStatusBadge(
                    collab.status
                  )}`}
                >
                  {collab.status}
                </span>
                <span className="text-xs text-slate-500">
                  Established {new Date(collab.createdAt).toLocaleDateString()}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Handshake className="w-7 h-7 text-emerald-600 shrink-0" />
                <span>
                  {collab.providerOrg?.name} ↔ {collab.recipientOrg?.name}
                </span>
              </h1>
            </div>

            {/* Provider Action Buttons when INITIATED */}
            {collab.status === "INITIATED" && isProvider && (
              <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <button
                  onClick={handleAccept}
                  disabled={isActing}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Accept Collaboration</span>
                </button>
                <button
                  onClick={handleReject}
                  disabled={isActing}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Decline</span>
                </button>
              </div>
            )}

            {/* Complete Action when ACTIVE */}
            {collab.status === "ACTIVE" && isParticipant && (
              <button
                onClick={handleComplete}
                disabled={isActing}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5 self-start"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark Completed</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (8 cols): Scope, Connected Project/Need/Offer, Milestones */}
          <div className="lg:col-span-8 space-y-6">
            {/* Agreement Terms */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Collaboration Scope & Agreed Terms
              </h3>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-lg border border-slate-100">
                {collab.terms || "Standard inter-institutional resource sharing terms apply."}
              </p>
            </div>

            {/* Connected Project / Need / Offer Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Linked Need */}
              {collab.need && (
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 uppercase">
                    Connected Resource Need
                  </span>
                  <h4 className="text-xs font-bold text-slate-900">{collab.need.title}</h4>
                  <p className="text-[11px] text-slate-600 line-clamp-2">{collab.need.details}</p>
                </div>
              )}

              {/* Linked Offer */}
              {collab.offer && (
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 uppercase">
                    Connected Resource Offer
                  </span>
                  <h4 className="text-xs font-bold text-slate-900">{collab.offer.title}</h4>
                  <p className="text-[11px] text-slate-600 line-clamp-2">{collab.offer.specifications}</p>
                </div>
              )}
            </div>

            {/* Linked Project */}
            {collab.project && (
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 uppercase">
                    Addressing Project
                  </span>
                  <h4 className="text-sm font-bold text-slate-900">{collab.project.title}</h4>
                </div>
                <Link
                  to={`/projects/${collab.project.id}`}
                  className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <Briefcase className="w-4 h-4" />
                  <span>View Project</span>
                </Link>
              </div>
            )}

            {/* Milestones Roadmap */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Bilateral Milestones ({(collab.milestones || []).length})
                  </h3>
                </div>

                {isParticipant && collab.status === "ACTIVE" && (
                  <button
                    onClick={() => setShowMilestoneModal(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Milestone</span>
                  </button>
                )}
              </div>

              {(!collab.milestones || collab.milestones.length === 0) ? (
                <p className="text-xs text-slate-500 text-center py-6">
                  No milestones scheduled yet. Add milestones to track joint progress.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {collab.milestones.map((m) => (
                    <div key={m.id} className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{m.title}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-slate-800 border">
                          {m.status}
                        </span>
                      </div>
                      {m.description && <p className="text-slate-600">{m.description}</p>}
                      {m.targetDate && (
                        <span className="text-[10px] text-slate-400 block">
                          Target Date: {new Date(m.targetDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (4 cols): Participating Organizations & Progress Feed */}
          <div className="lg:col-span-4 space-y-6">
            {/* Organizations Profile */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Participating Institutions
              </h3>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Provider / Host</span>
                <span className="font-bold text-slate-900 text-sm block">{collab.providerOrg?.name}</span>
                <span className="text-slate-500 block">
                  {collab.providerOrg?.type} • {collab.providerOrg?.district || "Jharkhand"}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Recipient / Solver</span>
                <span className="font-bold text-slate-900 text-sm block">{collab.recipientOrg?.name}</span>
                <span className="text-slate-500 block">
                  {collab.recipientOrg?.type} • {collab.recipientOrg?.district || "Jharkhand"}
                </span>
              </div>
            </div>

            {/* Progress Updates Feed */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Activity Logs
                  </h3>
                </div>

                {isParticipant && collab.status === "ACTIVE" && (
                  <button
                    onClick={() => setShowProgressModal(true)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
                  >
                    + Log Update
                  </button>
                )}
              </div>

              {(!collab.progressUpdates || collab.progressUpdates.length === 0) ? (
                <p className="text-xs text-slate-500 py-3 text-center">No activity logged yet.</p>
              ) : (
                <div className="space-y-3 text-xs">
                  {collab.progressUpdates.map((u) => (
                    <div key={u.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                      <p className="text-slate-800">{u.updateText}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                        <span>{u.postedBy?.name || "Participant"} ({u.postedBy?.role})</span>
                        <span>{new Date(u.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Add Milestone Modal */}
      {showMilestoneModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Add Collaboration Milestone</h3>
              <button onClick={() => setShowMilestoneModal(false)}>
                <XCircle className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleAddMilestone} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Milestone Title</label>
                <input
                  type="text"
                  required
                  value={milestoneForm.title}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                  placeholder="e.g. Complete Phase 1 Water Lab Assays"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Target Completion Date</label>
                <input
                  type="date"
                  value={milestoneForm.targetDate}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, targetDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={milestoneForm.description}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMilestoneModal(false)}
                  className="px-3 py-1.5 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActing}
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg font-bold"
                >
                  Save Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Post Progress Modal */}
      {showProgressModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Post Activity Log</h3>
              <button onClick={() => setShowProgressModal(false)}>
                <XCircle className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handlePostProgress} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Activity Summary</label>
                <textarea
                  required
                  rows={3}
                  value={progressForm.updateText}
                  onChange={(e) => setProgressForm({ ...progressForm, updateText: e.target.value })}
                  placeholder="Detail results, sample counts, equipment usage..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProgressModal(false)}
                  className="px-3 py-1.5 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActing}
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg font-bold"
                >
                  Post Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaborationDetailsPage;
