import React, { useState } from "react";
import { X, Activity, AlertTriangle, Plus } from "lucide-react";
import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

const JHARKHAND_DISTRICTS = [
  "Ranchi", "Dhanbad", "East Singhbhum", "Bokaro", "Hazaribagh",
  "Palamu", "Deoghar", "Giridih", "Ramgarh", "Saraikela Kharsawan",
  "West Singhbhum", "Chatra", "Dumka", "Garhwa", "Godda",
  "Gumla", "Jamtara", "Khunti", "Koderma", "Latehar",
  "Lohardaga", "Pakur", "Sahibganj", "Simdega"
];

interface CreatePilotModalProps {
  projectId: string;
  problemId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreatePilotModal: React.FC<CreatePilotModalProps> = ({
  projectId,
  problemId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { token, user } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [siteLocation, setSiteLocation] = useState("");
  const [district, setDistrict] = useState(user?.district || "Ranchi");
  const [targetBeneficiaries, setTargetBeneficiaries] = useState(100);
  const [clearanceStatus, setClearanceStatus] = useState<"NOT_REQUIRED" | "REQUIRED">("NOT_REQUIRED");
  const [risksRequirements, setRisksRequirements] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/pilots`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId,
          problemId: problemId || undefined,
          title: title.trim(),
          description: description.trim() || undefined,
          siteLocation: siteLocation.trim(),
          district,
          targetBeneficiaryCount: Number(targetBeneficiaries),
          clearanceStatus,
          risksRequirements: risksRequirements.trim() || undefined,
          evidenceDocumentUrl: evidenceUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to propose pilot deployment.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred proposing the pilot.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Propose Field Execution Pilot</h3>
              <span className="text-[11px] text-slate-500">
                Empirical real-world deployment testbed
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

          <div>
            <label className="font-bold text-slate-700 block mb-1">Pilot Deployment Title</label>
            <input
              type="text"
              required
              minLength={3}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 50-Unit Biosand Filter Deployment in Sukri Village"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">District</label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {JHARKHAND_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Target Beneficiary Count</label>
              <input
                type="number"
                min={1}
                required
                value={targetBeneficiaries}
                onChange={(e) => setTargetBeneficiaries(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Specific Field Site / Location</label>
            <input
              type="text"
              required
              minLength={2}
              value={siteLocation}
              onChange={(e) => setSiteLocation(e.target.value)}
              placeholder="e.g. Sukri Primary Health Centre & 3 Community Wells"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Government Clearance / NOC Requirement</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setClearanceStatus("NOT_REQUIRED")}
                className={`py-2 px-3 rounded-lg border text-center transition-all ${
                  clearanceStatus === "NOT_REQUIRED"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-800 font-bold"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                No Official NOC Required
              </button>
              <button
                type="button"
                onClick={() => setClearanceStatus("REQUIRED")}
                className={`py-2 px-3 rounded-lg border text-center transition-all ${
                  clearanceStatus === "REQUIRED"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-800 font-bold"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                Government NOC Required
              </button>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {clearanceStatus === "REQUIRED"
                ? "Pilot cannot be activated on-ground until a district administrator formally approves the clearance request."
                : "Standard research or private deployment. Can be activated directly once preparation is complete."}
            </span>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Deployment Scope / Objectives</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Primary testbed objective and implementation methodology..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Risks & Site Requirements (Optional)</label>
            <input
              type="text"
              value={risksRequirements}
              onChange={(e) => setRisksRequirements(e.target.value)}
              placeholder="e.g. Electricity access, local panchayat consent"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Testbed Protocol Document URL (Optional)</label>
            <input
              type="url"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://example.com/pilot-protocol.pdf"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
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
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? "Proposing..." : "Propose Pilot"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
