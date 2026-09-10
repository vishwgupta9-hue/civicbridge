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
  Send,
  XCircle,
  Info,
  MapPin,
  Upload,
  Camera,
  Trash2,
  Crosshair,
  FileText,
  ChevronRight,
  ChevronLeft,
  Eye,
  Check,
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

const FREQUENCY_OPTIONS = [
  { value: "Constant / Daily", label: "Constant / Daily", desc: "Issue occurs continuously every day" },
  { value: "Periodic / Weekly", label: "Periodic / Weekly", desc: "Occurs multiple times a week or season" },
  { value: "One-time / Rare", label: "One-time / Rare", desc: "Single acute incident or recent occurrence" },
];

interface FormState {
  title: string;
  description: string;
  category: string;
  subCategory: string;
  district: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  affectedCount: number;
  evidenceUrl: string;
  frequency: string;
}

type SubmissionStage = "WIZARD" | "UPLOADING" | "SUBMITTING" | "SCREENING" | "RESULT";

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
      latitude: 23.3641,
      longitude: 85.3322,
      affectedCount: 650,
      evidenceUrl: "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=600&q=80",
      frequency: "Constant / Daily",
    },
  },
  {
    label: "Ambiguous / Uncertain Report (Flagged Demo)",
    data: {
      title: "Maybe an issue near the highway intersection",
      description: "Someone told me maybe there is an issue with unconfirmed rumors around the road, not sure what happened exactly.",
      category: "Rural Roads & Transport",
      subCategory: "Road Maintenance",
      district: "Hazaribagh",
      location: "Near Highway Chowk",
      latitude: null,
      longitude: null,
      affectedCount: 5,
      evidenceUrl: "",
      frequency: "One-time / Rare",
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
      latitude: null,
      longitude: null,
      affectedCount: 1,
      evidenceUrl: "",
      frequency: "One-time / Rare",
    },
  },
];

export const ReportProblemPage: React.FC = () => {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  // Wizard Step: 1, 2, or 3
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const [formData, setFormData] = useState<FormState>({
    title: "",
    description: "",
    category: "Water & Sanitation",
    subCategory: "",
    district: "Ranchi",
    location: "",
    latitude: null,
    longitude: null,
    affectedCount: 50,
    evidenceUrl: "",
    frequency: "Constant / Daily",
  });

  // Photo / File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Submission pipeline stages
  const [stage, setStage] = useState<SubmissionStage>("WIZARD");
  const [activeStepText, setActiveStepText] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Result state
  const [createdProblem, setCreatedProblem] = useState<any>(null);
  const [aiResult, setAiResult] = useState<any>(null);

  // =========================================================================
  // FILE HANDLING & VALIDATION
  // =========================================================================
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGeneralError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // File size check: 5MB
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setGeneralError("Selected file exceeds the 5MB limit. Please choose a smaller photo.");
      return;
    }

    // MIME type check
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "application/pdf"];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setGeneralError("Invalid file format. Please upload a JPEG, PNG, WebP image or PDF document.");
      return;
    }

    setSelectedFile(file);

    // Create thumbnail preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
  };

  // =========================================================================
  // GPS GEOLOCATION
  // =========================================================================
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setGeneralError("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setGeneralError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Math.round(position.coords.latitude * 10000) / 10000;
        const lng = Math.round(position.coords.longitude * 10000) / 10000;
        setFormData((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          location: prev.location ? prev.location : `GPS: ${lat}, ${lng}`,
        }));
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        setGeneralError(`Could not detect GPS location: ${err.message}`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // =========================================================================
  // STEP VALIDATION
  // =========================================================================
  const validateStep1 = () => {
    const errors: Record<string, string> = {};
    if (!formData.title.trim()) {
      errors.title = "Problem title is required.";
    } else if (formData.title.trim().length < 5) {
      errors.title = "Title must be at least 5 characters.";
    } else if (formData.title.trim().length > 200) {
      errors.title = "Title cannot exceed 200 characters.";
    }

    if (!formData.description.trim()) {
      errors.description = "Detailed problem description is required.";
    } else if (formData.description.trim().length < 15) {
      errors.description = "Description must be at least 15 characters so AI can accurately triage it.";
    }

    if (!formData.category) {
      errors.category = "Please select a category.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = () => {
    const errors: Record<string, string> = {};
    if (!formData.district) {
      errors.district = "District selection is required.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    setGeneralError(null);
    if (currentStep === 1) {
      if (validateStep1()) setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateStep2()) setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    setGeneralError(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3);
    }
  };

  const handleApplyPreset = (preset: typeof DEMO_PRESETS[0]) => {
    setFormData(preset.data);
    setSelectedFile(null);
    setFilePreview(preset.data.evidenceUrl || null);
    setFieldErrors({});
    setGeneralError(null);
  };

  // =========================================================================
  // SUBMISSION & AI SCREENING WORKFLOW
  // =========================================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validateStep1() || !validateStep2()) {
      return;
    }

    if (!token) {
      logout();
      navigate("/login");
      return;
    }

    let finalEvidenceUrl = formData.evidenceUrl.trim() || undefined;

    // Sub-stage 1: Upload file if selected
    if (selectedFile) {
      setStage("UPLOADING");
      setActiveStepText("Uploading photo evidence to CivicBridge storage...");

      try {
        const uploadBody = new FormData();
        uploadBody.append("file", selectedFile);

        const uploadRes = await fetch(`${API_BASE_URL}/upload`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: uploadBody,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.success) {
          throw new Error(uploadData.error || "Failed to upload photo evidence.");
        }

        finalEvidenceUrl = uploadData.url;
      } catch (err: any) {
        setGeneralError(`Photo upload failed: ${err.message}. You can retry or proceed without the photo.`);
        setStage("WIZARD");
        return;
      }
    }

    // Sub-stage 2: Submit Problem Record
    setStage("SUBMITTING");
    setActiveStepText("Registering problem in Statewide Problem Bank...");

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
          locationText: formData.location.trim() || undefined,
          latitude: formData.latitude || undefined,
          longitude: formData.longitude || undefined,
          affectedCount: Number(formData.affectedCount) || 1,
          evidenceUrl: finalEvidenceUrl,
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
      setStage("WIZARD");
      return;
    }

    // Sub-stage 3: Autonomous AI Screening & Normalized Priority Scoring
    setStage("SCREENING");
    setActiveStepText("AI Screening: verifying civic relevance, detecting duplicates & computing 5-factor priority score...");

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
      setGeneralError(err.message || "AI triage pipeline error. Problem saved with PENDING status.");
      setStage("RESULT");
    }
  };

  // Helper colors
  const getTierColor = (tier?: string) => {
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

  const getScoreColor = (score: number) => {
    if (score >= 70) return "bg-rose-600 text-white";
    if (score >= 40) return "bg-amber-500 text-white";
    return "bg-slate-600 text-white";
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-20 shadow-xs">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link
            to="/dashboard/citizen"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 min-h-[44px] px-2 -ml-2 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800">Report Problem</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              Mobile Wizard
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full p-4 sm:p-6 space-y-5">
        {/* Quick Demo Scenario Bar */}
        {stage === "WIZARD" && (
          <div className="bg-slate-100/80 rounded-xl p-3 border border-slate-200 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Quick Demo Scenarios
              </span>
              <span className="text-[10px] text-slate-400">Click to autofill</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
              {DEMO_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="text-left p-2 rounded-lg bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-[11px] font-medium text-slate-700 hover:text-emerald-900 transition-colors truncate"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {generalError && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-800 text-xs shadow-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>{generalError}</span>
          </div>
        )}

        {/* =================================================================== */}
        {/* STAGE A: 3-STEP MOBILE WIZARD */}
        {/* =================================================================== */}
        {stage === "WIZARD" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Step Progress Stepper */}
            <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3.5">
              <div className="flex items-center justify-between max-w-md mx-auto">
                {/* Step 1 Pill */}
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className={`flex items-center gap-2 text-xs font-bold transition-colors ${
                    currentStep === 1
                      ? "text-emerald-700"
                      : currentStep > 1
                      ? "text-emerald-600"
                      : "text-slate-400"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      currentStep === 1
                        ? "bg-emerald-600 text-white"
                        : currentStep > 1
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {currentStep > 1 ? <Check className="w-3.5 h-3.5" /> : "1"}
                  </div>
                  <span className="hidden sm:inline">Overview</span>
                </button>

                <div className={`h-0.5 flex-1 mx-2 ${currentStep >= 2 ? "bg-emerald-500" : "bg-slate-200"}`}></div>

                {/* Step 2 Pill */}
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep1()) setCurrentStep(2);
                  }}
                  className={`flex items-center gap-2 text-xs font-bold transition-colors ${
                    currentStep === 2
                      ? "text-emerald-700"
                      : currentStep > 2
                      ? "text-emerald-600"
                      : "text-slate-400"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      currentStep === 2
                        ? "bg-emerald-600 text-white"
                        : currentStep > 2
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {currentStep > 2 ? <Check className="w-3.5 h-3.5" /> : "2"}
                  </div>
                  <span className="hidden sm:inline">Location & Evidence</span>
                </button>

                <div className={`h-0.5 flex-1 mx-2 ${currentStep >= 3 ? "bg-emerald-500" : "bg-slate-200"}`}></div>

                {/* Step 3 Pill */}
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep1() && validateStep2()) setCurrentStep(3);
                  }}
                  className={`flex items-center gap-2 text-xs font-bold transition-colors ${
                    currentStep === 3 ? "text-emerald-700" : "text-slate-400"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      currentStep === 3
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    3
                  </div>
                  <span className="hidden sm:inline">Impact & Review</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-6">
              {/* =========================================================== */}
              {/* STEP 1: ISSUE OVERVIEW */}
              {/* =========================================================== */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="border-b border-slate-100 pb-3">
                    <h2 className="text-base font-bold text-slate-900">Step 1: Problem Overview</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Describe the core civic or environmental challenge in your community.
                    </p>
                  </div>

                  {/* Title */}
                  <div>
                    <label htmlFor="probTitle" className="block text-xs font-semibold text-slate-700 mb-1">
                      Problem Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="probTitle"
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Broken Culvert Bridge on Angara-Gondli Rural Road"
                      className="block w-full px-3.5 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white text-slate-900 min-h-[44px]"
                    />
                    {fieldErrors.title && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.title}</p>
                    )}
                  </div>

                  {/* Category & Subcategory */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="probCategory" className="block text-xs font-semibold text-slate-700 mb-1">
                        Category <span className="text-rose-500">*</span>
                      </label>
                      <select
                        id="probCategory"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="block w-full px-3.5 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white text-slate-900 min-h-[44px]"
                      >
                        {PROBLEM_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.category && (
                        <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.category}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="probSubCategory" className="block text-xs font-semibold text-slate-700 mb-1">
                        Subcategory <span className="text-slate-400">(Optional)</span>
                      </label>
                      <input
                        id="probSubCategory"
                        type="text"
                        value={formData.subCategory}
                        onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                        placeholder="e.g. Bridge Collapse, Drainage, Handpump"
                        className="block w-full px-3.5 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white text-slate-900 min-h-[44px]"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="probDesc" className="block text-xs font-semibold text-slate-700">
                        Detailed Description <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-slate-400">
                        {formData.description.length} / 3000 chars
                      </span>
                    </div>
                    <textarea
                      id="probDesc"
                      rows={5}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Explain what is happening, exact landmarks, how long it has persisted, and the direct danger or disruption to residents..."
                      className="block w-full p-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white text-slate-900"
                    />
                    {fieldErrors.description && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.description}</p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-1">
                      Our AI pipeline analyzes this narrative to compute severity, affected count, and duplicate similarity.
                    </p>
                  </div>

                  {/* Step 1 Next Button */}
                  <div className="pt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="min-h-[44px] px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <span>Next: Location & Evidence</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* =========================================================== */}
              {/* STEP 2: LOCATION & EVIDENCE UPLOAD */}
              {/* =========================================================== */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="border-b border-slate-100 pb-3">
                    <h2 className="text-base font-bold text-slate-900">Step 2: Location & Evidence</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Specify where the issue is located and upload supporting photo evidence.
                    </p>
                  </div>

                  {/* District */}
                  <div>
                    <label htmlFor="probDistrict" className="block text-xs font-semibold text-slate-700 mb-1">
                      District (Jharkhand) <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="probDistrict"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      className="block w-full px-3.5 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white text-slate-900 min-h-[44px]"
                    >
                      {JHARKHAND_DISTRICTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.district && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.district}</p>
                    )}
                  </div>

                  {/* Specific Location & GPS Button */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="probLocation" className="block text-xs font-semibold text-slate-700">
                        Specific Location / Landmark
                      </label>
                      <button
                        type="button"
                        onClick={handleGetLocation}
                        disabled={isLocating}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 min-h-[32px] px-2 rounded-md hover:bg-emerald-50 transition-colors"
                      >
                        <Crosshair className={`w-3.5 h-3.5 ${isLocating ? "animate-spin" : ""}`} />
                        <span>{isLocating ? "Detecting GPS..." : "Use Current GPS"}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <input
                        id="probLocation"
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="e.g. Ward 4, Near Primary Health Center, Gondli Village"
                        className="block w-full pl-10 pr-3.5 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white text-slate-900 min-h-[44px]"
                      />
                    </div>
                    {formData.latitude && formData.longitude && (
                      <p className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Tagged GPS Coordinates: {formData.latitude}° N, {formData.longitude}° E</span>
                      </p>
                    )}
                  </div>

                  {/* Photo / Evidence Upload Area */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Photo / Document Evidence
                    </label>

                    {!selectedFile && !filePreview ? (
                      <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center transition-all bg-slate-50/50 hover:bg-emerald-50/20">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2.5">
                          <Camera className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-bold text-slate-800 mb-0.5">
                          Tap to take photo or choose file from phone
                        </p>
                        <p className="text-[11px] text-slate-500 mb-3">
                          Supports JPEG, PNG, WebP photos or PDF documents up to 5MB
                        </p>
                        <label
                          htmlFor="evidenceFileInput"
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-300 hover:border-emerald-500 text-slate-700 text-xs font-bold rounded-xl shadow-xs cursor-pointer min-h-[44px] transition-colors"
                        >
                          <Upload className="w-4 h-4 text-emerald-600" />
                          <span>Select Photo / File</span>
                        </label>
                        <input
                          id="evidenceFileInput"
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </div>
                    ) : (
                      /* Live Preview Card */
                      <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {filePreview ? (
                            <img
                              src={filePreview}
                              alt="Evidence Preview"
                              className="w-16 h-16 rounded-xl object-cover border border-emerald-200 shrink-0 bg-white"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                              <FileText className="w-8 h-8" />
                            </div>
                          )}
                          <div className="truncate text-xs">
                            <span className="font-bold text-slate-900 block truncate">
                              {selectedFile?.name || "Attached Photo Evidence"}
                            </span>
                            <span className="text-slate-500 block text-[11px]">
                              {selectedFile
                                ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                                : "Evidence image ready"}
                            </span>
                            <span className="text-emerald-700 font-semibold text-[10px] inline-flex items-center gap-1 mt-0.5">
                              <CheckCircle2 className="w-3 h-3" />
                              Ready for submission
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-colors shrink-0"
                          title="Remove photo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Secondary URL toggle */}
                    <div className="mt-2.5">
                      <button
                        type="button"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        className="text-[11px] text-slate-500 hover:text-slate-800 underline font-medium"
                      >
                        {showUrlInput ? "Hide web URL input" : "Or link an external photo URL"}
                      </button>

                      {showUrlInput && (
                        <div className="mt-2">
                          <input
                            type="url"
                            value={formData.evidenceUrl}
                            onChange={(e) => {
                              setFormData({ ...formData, evidenceUrl: e.target.value });
                              if (e.target.value.startsWith("http")) {
                                setFilePreview(e.target.value);
                              }
                            }}
                            placeholder="https://example.com/photo.jpg"
                            className="block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="pt-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="min-h-[44px] px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="min-h-[44px] px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <span>Next: Impact & Review</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* =========================================================== */}
              {/* STEP 3: IMPACT & FINAL REVIEW */}
              {/* =========================================================== */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="border-b border-slate-100 pb-3">
                    <h2 className="text-base font-bold text-slate-900">Step 3: Impact Scale & Final Review</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Confirm the population scale and review your submission before AI screening.
                    </p>
                  </div>

                  {/* Affected Count */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="affectedCount" className="block text-xs font-semibold text-slate-700">
                        Estimated Citizens Affected
                      </label>
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {formData.affectedCount} citizens
                      </span>
                    </div>
                    <input
                      id="affectedCount"
                      type="range"
                      min={1}
                      max={1500}
                      step={5}
                      value={formData.affectedCount}
                      onChange={(e) => setFormData({ ...formData, affectedCount: Number(e.target.value) })}
                      className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg cursor-pointer my-2"
                    />
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>1 (Individual)</span>
                      <span>50 (Neighborhood)</span>
                      <span>500 (Village Block)</span>
                      <span>1000+ (Regional)</span>
                    </div>
                  </div>

                  {/* Frequency Radio Cards */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Occurrence Frequency
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {FREQUENCY_OPTIONS.map((f) => {
                        const isSelected = formData.frequency === f.value;
                        return (
                          <button
                            key={f.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, frequency: f.value })}
                            className={`p-3 rounded-xl border text-left transition-all min-h-[44px] ${
                              isSelected
                                ? "bg-emerald-50/80 border-emerald-500 ring-1 ring-emerald-500/30 text-emerald-950"
                                : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold">{f.label}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                            </div>
                            <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                              {f.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Submission Preview Card */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <Eye className="w-4 h-4 text-emerald-600" />
                      <span>Review Before Submitting</span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div>
                        <span className="text-slate-400 text-[11px] block">Title:</span>
                        <p className="font-bold text-slate-900">{formData.title || "—"}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-400 block">Category:</span>
                          <span className="font-semibold text-slate-800">{formData.category}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">District:</span>
                          <span className="font-semibold text-slate-800">{formData.district}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 text-[11px] block">Description:</span>
                        <p className="text-slate-700 line-clamp-2 text-[11px] leading-relaxed">
                          {formData.description || "—"}
                        </p>
                      </div>

                      {/* Photo Thumbnail in Review */}
                      {filePreview && (
                        <div className="pt-1 flex items-center gap-2">
                          <img
                            src={filePreview}
                            alt="Attachment preview"
                            className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                          />
                          <span className="text-[11px] text-emerald-800 font-semibold">
                            Photo Evidence Attached
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Navigation & Submit Buttons */}
                  <div className="pt-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="min-h-[44px] px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                    <button
                      type="submit"
                      className="min-h-[44px] px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>Submit Problem & Run AI</span>
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}

        {/* =================================================================== */}
        {/* STAGE B: ASYNCHRONOUS PIPELINE PROGRESS (UPLOADING / SUBMITTING / AI) */}
        {/* =================================================================== */}
        {(stage === "UPLOADING" || stage === "SUBMITTING" || stage === "SCREENING") && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center space-y-4">
            <div className="w-12 h-12 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                {stage === "UPLOADING"
                  ? "Uploading Photo Evidence"
                  : stage === "SUBMITTING"
                  ? "Creating Problem Record"
                  : "Running AI Pipeline"}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">{activeStepText}</p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Zero-Gate Parallel Trust Pipeline</span>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STAGE C: AI SCREENING RESULT DISPLAY */}
        {/* =================================================================== */}
        {stage === "RESULT" && createdProblem && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 animate-in fade-in">
            {/* Outcome Header */}
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  createdProblem.filterStatus === "PASSED"
                    ? "bg-emerald-100 text-emerald-700"
                    : createdProblem.filterStatus === "FLAGGED"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-rose-100 text-rose-700"
                }`}
              >
                {createdProblem.filterStatus === "PASSED" ? (
                  <CheckCircle2 className="w-7 h-7" />
                ) : createdProblem.filterStatus === "FLAGGED" ? (
                  <Clock className="w-7 h-7" />
                ) : (
                  <XCircle className="w-7 h-7" />
                )}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">
                    {createdProblem.filterStatus === "PASSED"
                      ? "Problem Published to Problem Bank!"
                      : createdProblem.filterStatus === "FLAGGED"
                      ? "Problem Enqueued for Manual Review"
                      : "Submission Rejected by AI Filter"}
                  </h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      createdProblem.filterStatus === "PASSED"
                        ? "bg-emerald-100 text-emerald-800"
                        : createdProblem.filterStatus === "FLAGGED"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {createdProblem.filterStatus}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {createdProblem.filterStatus === "PASSED"
                    ? "Your report has cleared AI screening and is now open for university proposals and startup ventures."
                    : createdProblem.filterStatus === "FLAGGED"
                    ? "Our AI classifier detected ambiguous information. An administrator will review your report shortly."
                    : "The submission was identified as promotional marketing, spam, or non-civic content."}
                </p>
              </div>
            </div>

            {/* AI Summary Box */}
            {aiResult && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>AI Triage Summary</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">{aiResult.aiSummary}</p>

                {/* Priority Breakdown Pills */}
                <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-2 text-xs">
                  <span className={`px-2.5 py-1 rounded-md font-bold text-xs ${getScoreColor(createdProblem.priorityScore)}`}>
                    Priority Score: {createdProblem.priorityScore}
                  </span>
                  <span className={`px-2.5 py-1 rounded-md font-extrabold text-xs border ${getTierColor(createdProblem.priorityTier)}`}>
                    Tier {createdProblem.priorityTier}
                  </span>
                  <span className="px-2.5 py-1 rounded-md font-semibold text-xs bg-slate-200 text-slate-700">
                    Category: {createdProblem.category}
                  </span>
                  {aiResult.isDuplicate && (
                    <span className="px-2.5 py-1 rounded-md font-bold text-xs bg-purple-100 text-purple-800">
                      Duplicate Match ({Math.round((aiResult.duplicateSimilarity || 0) * 100)}%)
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Zero-Gate Trust Assurance Notice */}
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2 text-xs text-blue-900">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong>Parallel Trust Model Active:</strong> Institutions (Universities, Startups, Industry) do not need to wait for government verification to view your problem or submit technical proposals.
              </div>
            </div>

            {/* Next Steps Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <Link
                to="/problems"
                className="min-h-[44px] px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <span>View in Problem Bank</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                to="/dashboard/citizen"
                className="min-h-[44px] px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
              >
                <span>Go to Citizen Dashboard</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ReportProblemPage;
