import React, { useState } from "react";
import { X, ArrowRightLeft, AlertTriangle, Plus } from "lucide-react";
import { OfferCategory } from "../../types";
import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

const CATEGORIES: { label: string; value: OfferCategory }[] = [
  { label: "Lab & Research Equipment", value: "LAB_EQUIPMENT" },
  { label: "Testing & Sample Analysis", value: "TESTING_ANALYSIS" },
  { label: "Manufacturing & Fabrication", value: "MANUFACTURING_FABRICATION" },
  { label: "Facility & Field Site Access", value: "FACILITY_SITE_ACCESS" },
  { label: "Domain Expertise & Mentorship", value: "DOMAIN_EXPERTISE_MENTORSHIP" },
  { label: "Hardware Components & Materials", value: "HARDWARE_COMPONENTS" },
];

const JHARKHAND_DISTRICTS = [
  "Ranchi", "Dhanbad", "East Singhbhum", "Bokaro", "Hazaribagh",
  "Palamu", "Deoghar", "Giridih", "Ramgarh", "Saraikela Kharsawan",
  "West Singhbhum", "Chatra", "Dumka", "Garhwa", "Godda",
  "Gumla", "Jamtara", "Khunti", "Koderma", "Latehar",
  "Lohardaga", "Pakur", "Sahibganj", "Simdega"
];

interface CreateOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateOfferModal: React.FC<CreateOfferModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { token, user } = useAuth();

  const [category, setCategory] = useState<OfferCategory>("LAB_EQUIPMENT");
  const [title, setTitle] = useState("");
  const [specifications, setSpecifications] = useState("");
  const [district, setDistrict] = useState(user?.district || "Ranchi");
  const [capacityTerms, setCapacityTerms] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/offers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category,
          title: title.trim(),
          specifications: specifications.trim(),
          district,
          capacityTerms: capacityTerms.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to publish resource offer.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred publishing the offer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Publish Resource Offer</h3>
              <span className="text-[11px] text-slate-500">
                Provide expertise, labs, CSR grants, or facilities to solvers
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
            <label className="font-bold text-slate-700 block mb-1">Resource Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as OfferCategory)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Offer Title</label>
            <input
              type="text"
              required
              minLength={3}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Free NABL Water Quality ICP-MS Lab Testing Capacity"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">District / Jurisdiction</label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {JHARKHAND_DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Specifications & Available Equipment</label>
            <textarea
              required
              minLength={10}
              rows={3}
              value={specifications}
              onChange={(e) => setSpecifications(e.target.value)}
              placeholder="Detail instruments, team expertise, hours, capacity limits, or access rules..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Capacity Terms / Eligibility (Optional)</label>
            <input
              type="text"
              value={capacityTerms}
              onChange={(e) => setCapacityTerms(e.target.value)}
              placeholder="e.g. Up to 100 sample assays per month for student capstones"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? "Publishing..." : "Publish Offer"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
