import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config/api";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  Send,
  AlertTriangle,
  XCircle,
  Copy,
  Info,
} from "lucide-react";

const JHARKHAND_DISTRICTS = [
  "Ranchi", "Dhanbad", "East Singhbhum", "Bokaro", "Hazaribagh",
  "Palamu", "Deoghar", "Giridih", "Ramgarh", "Saraikela Kharsawan",
  "West Singhbhum", "Chatra", "Dumka", "Garhwa", "Godda",
  "Gumla", "Jamtara", "Khunti", "Koderma", "Latehar",
  "Lohardaga", "Pakur", "Sahibganj", "Simdega"
];

const PROBLEM_CATEGORIES = [
  "Water & Sanitation",
  "Rural Roads & Transport",
  "Environment & Pollution",
  "Public Healthcare & Clinics",
  "Agriculture & Irrigation",
  "Power & Renewable Energy",
  "Civic Infrastructure"
];

interface FormState {
  title: string;
  description: string;
  category: string;
  subCategory: string;
  district: string;
  location: string;
  affectedCount: number;
  evidenceUrl: string;
}

type SubmissionStage = "FORM" | "SUBMITTING" | "SCREENING" | "RESULT";

const DEMO_PRESETS = [
  {
    label: "Severe Drinking Water Contamination (High Priority)",
    data: {
      title: "Elevated Fluoride Contamination in Angara Block Handpumps",
      description: "Drinking water handpumps in Nawagarh village are dispensing high-fluoride ground water exceeding 3.8 mg/L. Over 650 villagers suffer from joint stiffness, dental fluorosis, and chronic stomach ailments. Urgent filtration and testing required.",
      category: "Water & Sanitation",
      subCategory: "Drinking Water Quality",
      district: "Ranchi",
      location: "Nawagarh Village, Angara Block, Ward 2",
      affectedCount: 650,
      evidenceUrl: "https://storage.civicbridge.jharkhand.gov.in/evidence/fluoride_test_sample.jpg",
    },
  },
  {
    label: "Ambiguous / Uncertain Report (Flagged Demo)",
    data: {
      title: "Maybe an issue near the highway intersection",
      description: "Someone told me maybe there is an issue with unconfirmed rumors around the road, not sure what happened exactly.",
      category: "Rural Roads & Transport",
      subCategory: "",
      district: "Hazaribagh",
      location: "Near Highway Chowk",
      affectedCount: 5,
      evidenceUrl: "",
    },
  },
  {
    label: "Promotional Spam (Rejected Demo)",
    data: {
      title: "Earn Free Crypto Bitcoin Investment Scheme Click Here Now",
      description: "Join our exclusive telegram casino group and earn 500% weekly return on your crypto investment with free cash bonus guaranteed.",
      category: "Civic Infrastructure",
      subCategory: "",
      district: "Ranchi",
      location: "",
      affectedCount: 1,
      evidenceUrl: "",
    },
  },
];

export const ReportProblemPage: React.FC = () => {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormState>({
    title: "",
    description: "",
    category: "Water & Sanitation",
    subCategory: "",
    district: "Ranchi",
    location: "",
    affectedCount: 20,
    evidenceUrl: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [stage, setStage] = useState<SubmissionStage>("FORM");
  const [createdProblem, setCreatedProblem] = useState<any>(null);
  const [aiResult, setAiResult] = useState<any>(null);
  const [activeStepText, setActiveStepText] = useState<string>("Submitting problem record...");

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.title.trim() || formData.title.trim().length < 5) {
      errors.title = "Title must be at least 5 characters.";
    } else if (formData.title.trim().length > 200) {
      errors.title = "Title cannot exceed 200 characters.";
    }

    if (!formData.description.trim() || formData.description.trim().length < 15) {
      errors.description = "Description must be at least 15 characters to explain the problem clearly.";
    } else if (formData.description.trim().length > 3000) {
      errors.description = "Description cannot exceed 3000 characters.";
    }

    if (!formData.category.trim()) {
      errors.category = "Please select a category.";
    }

    if (!formData.district.trim()) {
      errors.district = "Please select a district.";
    }

    if (formData.affectedCount < 1) {
      errors.affectedCount = "Affected count must be at least 1.";
    }

    if (formData.evidenceUrl && formData.evidenceUrl.trim() !== "") {
      try {
        new URL(formData.evidenceUrl.trim());
      } catch {
        errors.evidenceUrl = "Please provide a valid URL format (e.g. https://...).";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleApplyPreset = (preset: typeof DEMO_PRESETS[0]) => {
    setFormData(preset.data);
    setFieldErrors({});
    setGeneralError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validateForm()) {
      return;
    }

    if (!token) {
      logout();
      navigate("/login");
      return;
    }

    // Step 1: Submit Problem (POST /api/problems)
    setStage("SUBMITTING");
    setActiveStepText("Registering problem in CivicBridge database...");

    let newProblem: any = null;

    try {
      const createRes = await fetch(`${API_BASE_URL}/problems`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: formData.category,
          subCategory: formData.subCategory.trim() || undefined,
          district: formData.district,
          location: formData.location.trim() || undefined,
          affectedCount: Number(formData.affectedCount),
          evidenceUrl: formData.evidenceUrl.trim() || undefined,
        }),
      });

      if (createRes.status === 401) {
        logout();
        navigate("/login");
        return;
      }

      const createData = await createRes.json();

      if (!createRes.ok || !createData.success) {
        if (createData.details) {
          const mappedErrors: Record<string, string> = {};
          for (const [key, val] of Object.entries(createData.details)) {
            mappedErrors[key] = Array.isArray(val) ? val[0] : String(val);
          }
          setFieldErrors(mappedErrors);
        }
        throw new Error(createData.error || "Failed to submit civic problem.");
      }

      newProblem = createData.problem;
      setCreatedProblem(newProblem);
    } catch (err: any) {
      setGeneralError(err.message || "Failed to communicate with server.");
      setStage("FORM");
      return;
    }

    // Step 2: Trigger AI Screening Pipeline (POST /api/problems/:id/process-ai)
    setStage("SCREENING");
    setActiveStepText("Running AI relevance screening & 5-factor priority calculation...");

    try {
      const aiRes = await fetch(`${API_BASE_URL}/problems/${newProblem.id}/process-ai`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (aiRes.status === 401) {
        logout();
        navigate("/login");
        return;
      }

      const aiData = await aiRes.json();

      if (!aiRes.ok || !aiData.success) {
        throw new Error(aiData.error || "AI processing pipeline encountered an error.");
      }

      setCreatedProblem(aiData.problem);
      setAiResult(aiData.aiAnalysis);
      setStage("RESULT");
    } catch (err: any) {
      setGeneralError(`Problem created (ID: ${newProblem.id}), but AI screening failed: ${err.message}`);
      setStage("RESULT");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "Water & Sanitation",
      subCategory: "",
      district: "Ranchi",
      location: "",
      affectedCount: 20,
      evidenceUrl: "",
    });
    setFieldErrors({});
    setGeneralError(null);
    setCreatedProblem(null);
    setAiResult(null);
    setStage("FORM");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard/citizen"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title="Return to Citizen Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">Report a Civic Problem</h1>
              <p className="text-xs text-slate-500">Crowdsourced Societal Challenge Submission — Jharkhand</p>
            </div>
          </div>
          <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
            Citizen Mode
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* Stage 1: Form Input */}
        {stage === "FORM" && (
          <div className="space-y-6">
            {/* General Error Banner */}
            {generalError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-sm">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <span>{generalError}</span>
              </div>
            )}

            {/* Quick-fill Presets for Hackathon Testing */}
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                  Quick-Fill Test Scenarios (Demo Presets)
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {DEMO_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="text-left px-3 py-2 rounded-lg bg-white hover:bg-amber-50 border border-amber-200 text-xs font-medium text-slate-800 shadow-sm transition-all truncate"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Problem Submission Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-5">
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-xs font-bold text-slate-800 mb-1">
                  Problem Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Broken Handpump Foot Valve in Namkum Panchayat"
                  className={`block w-full px-3.5 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors ${
                    fieldErrors.title ? "border-red-300 bg-red-50/30" : "border-slate-300"
                  }`}
                />
                {fieldErrors.title && <p className="mt-1 text-xs text-red-600">{fieldErrors.title}</p>}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-xs font-bold text-slate-800 mb-1">
                  Detailed Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the issue, how long it has persisted, who is affected, and why it requires intervention..."
                  className={`block w-full px-3.5 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors ${
                    fieldErrors.description ? "border-red-300 bg-red-50/30" : "border-slate-300"
                  }`}
                />
                <div className="flex justify-between mt-1 text-xs text-slate-400">
                  {fieldErrors.description ? (
                    <span className="text-red-600">{fieldErrors.description}</span>
                  ) : (
                    <span>Minimum 15 characters. Be specific about the local impact.</span>
                  )}
                  <span>{formData.description.length}/3000</span>
                </div>
              </div>

              {/* Category & District Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="category" className="block text-xs font-bold text-slate-800 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="block w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  >
                    {PROBLEM_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="district" className="block text-xs font-bold text-slate-800 mb-1">
                    District <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="district"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="block w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  >
                    {JHARKHAND_DISTRICTS.map((dist) => (
                      <option key={dist} value={dist}>
                        {dist}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sub-Category & Location Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="subCategory" className="block text-xs font-bold text-slate-800 mb-1">
                    Sub-Category <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="subCategory"
                    type="text"
                    value={formData.subCategory}
                    onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                    placeholder="e.g. Drinking Water Supply"
                    className="block w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label htmlFor="location" className="block text-xs font-bold text-slate-800 mb-1">
                    Specific Location / Landmark <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="location"
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Ward 4, Near Govt Middle School"
                    className="block w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Affected Count & Evidence URL Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="affectedCount" className="block text-xs font-bold text-slate-800 mb-1">
                    Estimated Affected People <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="affectedCount"
                    type="number"
                    min={1}
                    value={formData.affectedCount}
                    onChange={(e) => setFormData({ ...formData, affectedCount: parseInt(e.target.value, 10) || 1 })}
                    className="block w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <span className="text-[11px] text-slate-400">Used by AI pipeline to assess societal scale factor.</span>
                </div>

                <div>
                  <label htmlFor="evidenceUrl" className="block text-xs font-bold text-slate-800 mb-1">
                    Evidence URL <span className="text-slate-400 font-normal">(Photo / Document Link)</span>
                  </label>
                  <input
                    id="evidenceUrl"
                    type="url"
                    value={formData.evidenceUrl}
                    onChange={(e) => setFormData({ ...formData, evidenceUrl: e.target.value })}
                    placeholder="https://..."
                    className={`block w-full px-3.5 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      fieldErrors.evidenceUrl ? "border-red-300 bg-red-50/30" : "border-slate-300"
                    }`}
                  />
                  {fieldErrors.evidenceUrl ? (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.evidenceUrl}</p>
                  ) : (
                    <span className="text-[11px] text-slate-400">Publicly accessible photo, report, or cloud link.</span>
                  )}
                </div>
              </div>

              {/* Submission CTA */}
              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  Upon submission, your issue will immediately enter the autonomous AI relevance screening pipeline.
                </p>
                <button
                  type="submit"
                  className="w-full sm:w-auto h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit & Run AI Screening</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Stage 2 & 3: Loading / Screening Animation */}
        {(stage === "SUBMITTING" || stage === "SCREENING") && (
          <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm text-center max-w-lg mx-auto space-y-6">
            <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {stage === "SUBMITTING" ? "Submitting Problem..." : "AI Problem Triage In Progress"}
              </h2>
              <p className="text-sm text-slate-500 mt-1">{activeStepText}</p>
            </div>

            {/* Pipeline progress steps */}
            <div className="space-y-3 text-left bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center gap-2.5 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>1. Stored Problem with initial PENDING status</span>
              </div>
              <div className={`flex items-center gap-2.5 ${stage === "SCREENING" ? "text-emerald-700 font-semibold" : "text-slate-400"}`}>
                {stage === "SCREENING" ? (
                  <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Clock className="w-4 h-4" />
                )}
                <span>2. AI Spam & Relevance Triage</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-400">
                <Clock className="w-4 h-4" />
                <span>3. 5-Factor Priority Scoring & Advisory Duplicate Detection</span>
              </div>
            </div>
          </div>
        )}

        {/* Stage 4: Result Display */}
        {stage === "RESULT" && createdProblem && (
          <div className="space-y-6">
            {/* Status Header Banner */}
            {createdProblem.filterStatus === "PASSED" && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-5 shadow-sm space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-200 text-emerald-900 rounded-full uppercase tracking-wide">
                      AI Screening Passed
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                      Problem Published to the CivicBridge Problem Bank
                    </h2>
                  </div>
                </div>
                <p className="text-xs text-slate-700 pl-13 leading-relaxed">
                  Your civic problem is legitimate and has entered the statewide Problem Bank. Universities can now submit research proposals, startups can develop commercial solutions, and industry can offer mentorship/prototyping resources.
                </p>
                {createdProblem.priorityTier === "HIGH" && (
                  <div className="mt-2 p-2.5 rounded-lg bg-emerald-100/70 text-emerald-950 text-xs font-medium flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>
                      High-Priority Flagged: This problem scores in the top tier ({createdProblem.priorityScore}/100) and has also been routed to the parallel Government Review Queue.
                    </span>
                  </div>
                )}
              </div>
            )}

            {createdProblem.filterStatus === "FLAGGED" && (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 shadow-sm space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-200 text-amber-900 rounded-full uppercase tracking-wide">
                      Flagged For Manual Review
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                      Enqueued for Government Administrator Triage
                    </h2>
                  </div>
                </div>
                <p className="text-xs text-slate-700 pl-13 leading-relaxed">
                  The AI screener found the description ambiguous or lacking verifiable details. In accordance with platform policy, your problem has <strong>not been published to the open Problem Bank</strong> yet, and has been placed in the Administrative Triage queue for manual inspection.
                </p>
                <div className="p-3 bg-white/80 rounded-lg border border-amber-200 text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">Reason: </span>
                  {createdProblem.filterReason || "Ambiguous problem description requiring human triage."}
                </div>
              </div>
            )}

            {createdProblem.filterStatus === "REJECTED" && (
              <div className="bg-red-50 border border-red-300 rounded-2xl p-5 shadow-sm space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <XCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="px-2.5 py-0.5 text-xs font-bold bg-red-200 text-red-900 rounded-full uppercase tracking-wide">
                      Rejected by AI Filter
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                      Submission Not Eligible for Problem Bank
                    </h2>
                  </div>
                </div>
                <p className="text-xs text-slate-700 pl-13 leading-relaxed">
                  This submission was classified as promotional spam, automated gibberish, or commercial advertisement. It has <strong>not been published</strong> and will not appear in the Problem Bank.
                </p>
                <div className="p-3 bg-white/80 rounded-lg border border-red-200 text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">Filter Reason: </span>
                  {createdProblem.filterReason}
                </div>
              </div>
            )}

            {/* Advisory Duplicate Warning Banner */}
            {aiResult?.isDuplicate && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-xs text-blue-900">
                <Copy className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">Advisory Duplicate Notice</span>
                  <p className="text-blue-800 leading-relaxed">
                    The AI detected potential similarity ({Math.round((aiResult.duplicateSimilarity || 0) * 100)}% token match) with an existing problem in the system. Per CivicBridge guidelines, your submission has <strong>not been rejected</strong> and remains active for review and cross-referencing.
                  </p>
                  {aiResult.similarProblemIds?.length > 0 && (
                    <span className="text-[11px] text-blue-600 font-mono block">
                      Matched Candidate IDs: {aiResult.similarProblemIds.slice(0, 2).join(", ")}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Summary & Analysis Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Problem Metadata Card */}
              <div className="md:col-span-2 bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                  <Info className="w-4 h-4 text-emerald-600" />
                  <span>Submission Summary</span>
                </h3>

                <div className="space-y-2">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Title</span>
                    <p className="text-sm font-bold text-slate-900">{createdProblem.title}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">AI 2-Sentence Summary</span>
                    <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
                      {aiResult?.aiSummary || createdProblem.description}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Category</span>
                      <span className="font-semibold text-slate-800">{createdProblem.category}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">District</span>
                      <span className="font-semibold text-slate-800">{createdProblem.district}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">Affected Scale</span>
                      <span className="font-semibold text-slate-800">{createdProblem.affectedCount || 1} people</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Priority & Factors Card */}
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                  Priority Assessment
                </h3>

                {/* Main Score & Tier */}
                <div className="text-center py-2 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {createdProblem.priorityScore || 0}
                  </span>
                  <span className="text-xs text-slate-400 block">/ 100 Priority Score</span>
                  <div className="mt-2">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                        createdProblem.priorityTier === "HIGH"
                          ? "bg-red-100 text-red-800 border border-red-200"
                          : createdProblem.priorityTier === "MEDIUM"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      Tier: {createdProblem.priorityTier}
                    </span>
                  </div>
                </div>

                {/* Factor Breakdown */}
                {aiResult && (
                  <div className="space-y-1.5 text-xs">
                    <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                      Normalized Factors (0–100)
                    </span>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">Severity (25%)</span>
                      <span className="font-semibold text-slate-900">{aiResult.severityScore}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">Affected Scale (25%)</span>
                      <span className="font-semibold text-slate-900">{aiResult.affectedPeopleScore}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">Frequency (15%)</span>
                      <span className="font-semibold text-slate-900">{aiResult.frequencyScore}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">Evidence Quality (15%)</span>
                      <span className="font-semibold text-slate-900">{aiResult.evidenceScore}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-600">Urgency Factor (20%)</span>
                      <span className="font-semibold text-slate-900">{aiResult.urgencyScore}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <Link
                to="/dashboard/citizen"
                className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-lg text-center transition-colors"
              >
                Return to Citizen Dashboard
              </Link>
              <button
                type="button"
                onClick={resetForm}
                className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm text-center transition-colors"
              >
                Report Another Problem
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
