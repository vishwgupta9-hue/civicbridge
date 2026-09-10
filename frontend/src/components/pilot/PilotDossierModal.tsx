import React, { useState, useEffect } from "react";
import { X, Award, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

interface PilotDossierModalProps {
  pilotId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const PilotDossierModal: React.FC<PilotDossierModalProps> = ({
  pilotId,
  isOpen,
  onClose,
}) => {
  const { token } = useAuth();
  const [dossier, setDossier] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !token || !pilotId) return;
    setIsLoading(true);
    setError(null);

    fetch(`${API_BASE_URL}/pilots/${pilotId}/dossier`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.dossier) {
          setDossier(data.dossier);
        } else {
          setError(data.error || "Failed to load impact dossier");
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [isOpen, pilotId, token]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Civic Impact Evidence Dossier
              </h3>
              <span className="text-[11px] text-emerald-800 font-medium">
                Official 10-point evaluation for policy scaling & government fund disbursement
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {isLoading && (
            <div className="py-16 text-center space-y-2">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-slate-500 font-medium">Compiling empirical impact dossier...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
              {error}
            </div>
          )}

          {!isLoading && dossier && (
            <div className="space-y-6">
              {/* Policy Scaling Readiness Scorecard */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Policy Scaling Readiness Verdict
                  </h4>
                  {dossier.readinessChecks?.readyForPolicyScaling ? (
                    <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4" />
                      Ready for Statewide Scaling
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      Pending Full Multi-Stakeholder Evidence
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    {dossier.readinessChecks?.isConcluded ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span>Pilot Concluded</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {dossier.readinessChecks?.hasEmpiricalMetrics ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span>Empirical Metrics Logged</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {dossier.readinessChecks?.hasVerifiedMetrics ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span>Metrics Verified by Expert</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {dossier.readinessChecks?.hasFieldVerifications ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span>Field Audits Performed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {dossier.readinessChecks?.hasSuccessVerifications ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span>Success Confirmed</span>
                  </div>
                </div>
              </div>

              {/* Pilot Metadata Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                  <span className="text-slate-400 font-medium">Pilot Title</span>
                  <div className="font-bold text-slate-900">{dossier.title}</div>
                  <span className="text-slate-500 block">Project: {dossier.projectTitle}</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                  <span className="text-slate-400 font-medium">Field Location</span>
                  <div className="font-bold text-slate-900">
                    {dossier.siteLocation}, {dossier.district}
                  </div>
                  <span className="text-slate-500 block">
                    Beneficiaries: {dossier.actualBeneficiaryCount ?? dossier.targetBeneficiaryCount} Citizens
                  </span>
                </div>
              </div>

              {/* Empirical Metrics Comparison Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  Quantified Empirical Outcomes
                </h4>
                {(!dossier.metrics || dossier.metrics.length === 0) ? (
                  <p className="text-slate-500 italic">No empirical metrics recorded.</p>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5">Metric</th>
                          <th className="p-2.5">Baseline</th>
                          <th className="p-2.5">Target</th>
                          <th className="p-2.5">Measured Outcome</th>
                          <th className="p-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {dossier.metrics.map((m: any, i: number) => (
                          <tr key={i}>
                            <td className="p-2.5 font-semibold text-slate-800">{m.metricName}</td>
                            <td className="p-2.5 font-mono">{m.baselineValue} {m.unit}</td>
                            <td className="p-2.5 font-mono text-slate-500">{m.targetValue ? `${m.targetValue} ${m.unit}` : "—"}</td>
                            <td className="p-2.5 font-mono font-bold text-emerald-700">
                              {m.outcomeValue != null ? `${m.outcomeValue} ${m.unit}` : "Pending"}
                            </td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                m.status === "VERIFIED" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"
                              }`}>
                                {m.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Field Verification Audit Log */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  Independent Field Audits
                </h4>
                {(!dossier.verifications || dossier.verifications.length === 0) ? (
                  <p className="text-slate-500 italic">No field audits recorded.</p>
                ) : (
                  <div className="space-y-2">
                    {dossier.verifications.map((v: any, i: number) => (
                      <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{v.finding.replace(/_/g, " ")}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(v.verifiedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-slate-700">{v.feedbackText}</p>
                        <span className="text-[10px] text-slate-500 block">
                          Verified by {v.verifier?.name || "Auditor"} ({v.verificationRole})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
