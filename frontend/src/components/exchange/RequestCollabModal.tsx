import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Handshake, AlertTriangle, Send } from "lucide-react";
import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

interface RequestCollabModalProps {
  needId?: string;
  offerId?: string;
  targetOrgId: string;
  targetOrgName: string;
  itemTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RequestCollabModal: React.FC<RequestCollabModalProps> = ({
  needId,
  offerId,
  targetOrgId,
  targetOrgName,
  itemTitle,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [terms, setTerms] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !user?.organizationId) {
      setError("Only authenticated users belonging to an organization can initiate bilateral collaborations.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Determine recipient vs provider
      // If we have needId, the requester is recipientOrgId (needs help), target is providerOrgId.
      // If we have offerId and no needId, requester is providerOrgId, target is recipientOrgId.
      const payload: any = {
        needId: needId || undefined,
        offerId: offerId || undefined,
        providerOrgId: needId ? targetOrgId : user.organizationId,
        recipientOrgId: needId ? user.organizationId : targetOrgId,
        contributionScope: terms.trim(),
        terms: terms.trim(),
      };

      const res = await fetch(`${API_BASE_URL}/collaborations/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to initiate collaboration request.");
      }

      onClose();
      if (onSuccess) onSuccess();
      navigate(`/collaborations/${data.collaboration.id}`);
    } catch (err: any) {
      setError(err.message || "An error occurred initiating collaboration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <Handshake className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Initiate Collaboration</h3>
              <span className="text-[11px] text-slate-500">
                Formal bilateral institutional connection
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <span className="text-slate-500 block">Target Organization:</span>
            <span className="font-bold text-slate-900 text-sm block">{targetOrgName}</span>
            <span className="text-slate-600 block mt-1">Resource Context: {itemTitle}</span>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Collaboration Scope & Proposed Terms
            </label>
            <textarea
              required
              rows={4}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Detail your collaborative commitment, expected timeline, lab access dates, deliverables, or MOU terms..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? "Submitting..." : "Send Request"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
