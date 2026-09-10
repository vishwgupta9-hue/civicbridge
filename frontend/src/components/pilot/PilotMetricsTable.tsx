import React, { useState } from "react";
import {
  TrendingUp,
  PlusCircle,
  ShieldCheck,
  Clock,
  X,
} from "lucide-react";
import { PilotMetricRecord, Role } from "../../types";
import { API_BASE_URL } from "../../config/api";

interface PilotMetricsTableProps {
  pilotId: string;
  metrics: PilotMetricRecord[];
  userRole?: Role;
  isLeadOrResponsible: boolean;
  token?: string | null;
  onRefresh: () => Promise<void>;
}

export const PilotMetricsTable: React.FC<PilotMetricsTableProps> = ({
  pilotId,
  metrics,
  userRole,
  isLeadOrResponsible,
  token,
  onRefresh,
}) => {
  const canVerify =
    userRole === "ADMIN" ||
    userRole === "UNIVERSITY" ||
    userRole === "INDUSTRY" ||
    userRole === "STARTUP";

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [outcomeTarget, setOutcomeTarget] = useState<PilotMetricRecord | null>(null);

  // Add metric form
  const [metricName, setMetricName] = useState("");
  const [unit, setUnit] = useState("");
  const [baselineValue, setBaselineValue] = useState<number>(0);
  const [targetValue, setTargetValue] = useState<number | undefined>();
  const [evidenceUrl, setEvidenceUrl] = useState("");

  // Outcome form
  const [outcomeValue, setOutcomeValue] = useState<number>(0);
  const [outcomeEvidenceUrl, setOutcomeEvidenceUrl] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/pilots/${pilotId}/metrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          metricName: metricName.trim(),
          unit: unit.trim(),
          baselineValue: Number(baselineValue),
          targetValue: targetValue != null ? Number(targetValue) : undefined,
          evidenceUrl: evidenceUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to record metric");
      setShowAddModal(false);
      setMetricName("");
      setUnit("");
      setBaselineValue(0);
      setTargetValue(undefined);
      setEvidenceUrl("");
      await onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !outcomeTarget) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/pilots/metrics/${outcomeTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          outcomeValue: Number(outcomeValue),
          evidenceUrl: outcomeEvidenceUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to record outcome");
      setOutcomeTarget(null);
      setOutcomeValue(0);
      setOutcomeEvidenceUrl("");
      await onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyMetric = async (metricId: string) => {
    if (!token) return;
    if (!confirm("Confirm verification of this field outcome metric based on audit evidence?")) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/pilots/metrics/${metricId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to verify metric");
      await onRefresh();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Empirical Field Metrics ({metrics.length})
            </h3>
            <span className="text-[11px] text-slate-500">
              Quantitative baseline vs measured outcome tracking
            </span>
          </div>
        </div>

        {isLeadOrResponsible && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Metric</span>
          </button>
        )}
      </div>

      {metrics.length === 0 ? (
        <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200 space-y-1">
          <TrendingUp className="w-6 h-6 text-slate-400 mx-auto" />
          <p className="text-xs text-slate-600 font-medium">No metrics recorded yet.</p>
          <p className="text-[11px] text-slate-500">
            Define quantitative parameters (e.g. water arsenic ppb, road roughness IRI, energy output).
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Metric Name</th>
                <th className="py-2.5 px-3">Baseline</th>
                <th className="py-2.5 px-3">Target</th>
                <th className="py-2.5 px-3">Outcome</th>
                <th className="py-2.5 px-3">Trust State</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-3 font-bold text-slate-900">
                    {m.metricName}
                    <span className="text-slate-400 font-normal ml-1">({m.unit})</span>
                  </td>
                  <td className="py-3 px-3 text-slate-700 font-mono">
                    {m.baselineValue} {m.unit}
                  </td>
                  <td className="py-3 px-3 text-slate-500 font-mono">
                    {m.targetValue != null ? `${m.targetValue} ${m.unit}` : "—"}
                  </td>
                  <td className="py-3 px-3 font-mono">
                    {m.outcomeValue != null ? (
                      <span className="font-bold text-emerald-700">
                        {m.outcomeValue} {m.unit}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Not recorded yet</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {m.status === "VERIFIED" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Reported
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                    {m.outcomeValue == null && isLeadOrResponsible && (
                      <button
                        onClick={() => {
                          setOutcomeTarget(m);
                          setOutcomeValue(m.targetValue ?? m.baselineValue);
                        }}
                        className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded transition-colors"
                      >
                        Record Outcome
                      </button>
                    )}

                    {m.outcomeValue != null && m.status === "REPORTED" && canVerify && (
                      <button
                        onClick={() => handleVerifyMetric(m.id)}
                        disabled={isSubmitting}
                        className="text-[11px] font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded transition-colors"
                      >
                        Verify
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Metric Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Define Baseline Field Metric</h3>
              <button onClick={() => setShowAddModal(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            {error && <div className="p-2 bg-rose-50 text-rose-700 rounded">{error}</div>}
            <form onSubmit={handleAddMetric} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Metric Name</label>
                <input
                  type="text"
                  required
                  value={metricName}
                  onChange={(e) => setMetricName(e.target.value)}
                  placeholder="e.g. Arsenic Contamination Level"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Measurement Unit</label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="ppb, mg/L, %, users"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Baseline Value</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={baselineValue}
                    onChange={(e) => setBaselineValue(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Target Value (Optional)</label>
                <input
                  type="number"
                  step="any"
                  value={targetValue ?? ""}
                  onChange={(e) => setTargetValue(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Target goal to achieve"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Evidence Lab Report URL (Optional)</label>
                <input
                  type="url"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder="https://example.com/baseline-test.pdf"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg font-bold"
                >
                  {isSubmitting ? "Recording..." : "Record Metric"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Outcome Modal */}
      {outcomeTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Record Measured Outcome: {outcomeTarget.metricName}
              </h3>
              <button onClick={() => setOutcomeTarget(null)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            {error && <div className="p-2 bg-rose-50 text-rose-700 rounded">{error}</div>}
            <form onSubmit={handleRecordOutcome} className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-lg flex justify-between">
                <span>Baseline: {outcomeTarget.baselineValue} {outcomeTarget.unit}</span>
                {outcomeTarget.targetValue != null && (
                  <span>Target: {outcomeTarget.targetValue} {outcomeTarget.unit}</span>
                )}
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Empirical Outcome Value ({outcomeTarget.unit})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={outcomeValue}
                  onChange={(e) => setOutcomeValue(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg font-bold text-emerald-800"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Outcome Evidence Report URL</label>
                <input
                  type="url"
                  value={outcomeEvidenceUrl}
                  onChange={(e) => setOutcomeEvidenceUrl(e.target.value)}
                  placeholder="https://example.com/final-water-test.pdf"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOutcomeTarget(null)}
                  className="px-3 py-1.5 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-bold"
                >
                  {isSubmitting ? "Saving..." : "Save Outcome"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
