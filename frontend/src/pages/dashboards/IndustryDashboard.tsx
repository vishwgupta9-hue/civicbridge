import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../config/api";
import {
  Building2,
  Layers,
  LogOut,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  MapPin,
  RefreshCw,
  AlertCircle,
  Activity,
  HelpCircle,
  X,
  PlusCircle,
  ArrowRightLeft,
  Award,
  Wrench,
  Cpu,
  FileText,
  Search,
  Eye,
  Edit3,
  Trash2,
  Boxes,
  TrendingUp,
  ChevronRight,
  Phone,
  Mail,
  Sliders,
} from "lucide-react";
import {
  CapabilityType,
  IndustryCapability,
  IndustryDeploymentProposal,
  OrganizationInfo,
} from "../../types";

interface SupportRequestItem {
  id: string;
  requestType: string;
  details: string;
  status: string;
  createdAt: string;
  problem: {
    id: string;
    title: string;
    category: string;
    district: string;
    priorityScore: number;
    priorityTier: string;
    verificationStatus: string;
  };
  startup?: {
    id: string;
    name: string;
    district?: string | null;
    contactEmail?: string;
  };
}

interface RecommendedOpportunity {
  id: string;
  title: string;
  category: string;
  subCategory?: string | null;
  district: string;
  affectedCount: number;
  priorityScore: number;
  priorityTier: string;
  status: string;
  verificationStatus: string;
  aiSummary?: string | null;
  proposalsCount: number;
  businessConceptsCount: number;
  collaborationsCount: number;
  hasCollaborated: boolean;
  hasProposed?: boolean;
  matchScore: number;
  matchReasons: string[];
}

interface CollaborationItem {
  id: string;
  supportType: string;
  message: string;
  status: string;
  createdAt: string;
  problem: {
    id: string;
    title: string;
    category: string;
    district: string;
    priorityScore: number;
    priorityTier: string;
    status: string;
    verificationStatus: string;
  };
}

interface ActiveDeploymentItem {
  id: string;
  title: string;
  siteLocation: string;
  district: string;
  status: string;
  clearanceStatus: string;
  targetBeneficiaryCount: number;
  actualBeneficiaryCount?: number | null;
  problem?: {
    id: string;
    title: string;
    category: string;
    district: string;
  } | null;
  project?: {
    id: string;
    title: string;
    trackType: string;
    leadOrg?: { id: string; name: string } | null;
  } | null;
  metrics?: Array<{
    id: string;
    metricName: string;
    unit: string;
    baselineValue: number;
    outcomeValue?: number | null;
    status: string;
  }>;
}

interface DashboardData {
  organization: OrganizationInfo & {
    companyType?: string;
    industryCategories: string[];
    certifications: string[];
    deploymentCapacity?: string;
    locationsServed: string[];
    caseStudies?: string;
  };
  metrics: {
    productsCount: number;
    servicesCount: number;
    equipmentCount: number;
    expertiseCount: number;
    totalCapabilities: number;
    totalCollaborations: number;
    activeCollaborations: number;
    activeDeploymentsCount: number;
    submittedProposalsCount: number;
    pendingSupportRequests: number;
    approvedSupportRequests: number;
    recommendedOpportunitiesCount: number;
  };
  capabilities: IndustryCapability[];
  deploymentProposals: IndustryDeploymentProposal[];
  activeDeployments: ActiveDeploymentItem[];
  myCollaborations: CollaborationItem[];
  pendingRequests: SupportRequestItem[];
  recommendedOpportunities: RecommendedOpportunity[];
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    supportType?: string;
    status: string;
    timestamp: string;
    problemId: string;
  }>;
}

const INDUSTRY_CATEGORIES = [
  "Water & Sanitation",
  "Renewable Energy & Solar",
  "Waste Management & Recycling",
  "Environmental Engineering & Remediation",
  "Testing Laboratories & Analytical Testing",
  "Manufacturing & Precision Fabrication",
  "Equipment & Heavy Industrial Machinery",
  "Specialized Technical Expertise",
  "Healthcare, Biotech & Diagnostics",
  "Smart Infrastructure & IoT",
  "Agriculture & Food Processing Tech",
];

export const IndustryDashboard: React.FC = () => {
  const { user, token, logout } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    "overview" | "catalog" | "opportunities" | "proposals" | "deployments" | "requests" | "marketplace" | "profile"
  >("overview");

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Capability Catalog State
  const [catalogFilter, setCatalogFilter] = useState<"ALL" | CapabilityType>("ALL");
  const [showCapabilityModal, setShowCapabilityModal] = useState(false);
  const [editingCapabilityId, setEditingCapabilityId] = useState<string | null>(null);
  const [capabilityForm, setCapabilityForm] = useState<{
    type: CapabilityType;
    title: string;
    category: string;
    description: string;
    availability: string;
    locationsServed: string;
    caseStudies: string;
    specParam1Name: string;
    specParam1Val: string;
    specParam2Name: string;
    specParam2Val: string;
  }>({
    type: "PRODUCT",
    title: "",
    category: "Manufacturing & Precision Fabrication",
    description: "",
    availability: "AVAILABLE",
    locationsServed: "East Singhbhum, Ranchi, Statewide Jharkhand",
    caseStudies: "",
    specParam1Name: "Capacity / Throughput",
    specParam1Val: "",
    specParam2Name: "Operating Standard",
    specParam2Val: "",
  });

  // "How can we contribute?" / Deployment Proposal Modal State
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [selectedProblemForProposal, setSelectedProblemForProposal] = useState<RecommendedOpportunity | null>(null);
  const [proposalForm, setProposalForm] = useState({
    selectedCapabilityId: "",
    providedItems: "",
    technicalCapability: "",
    relevantProductService: "",
    previousDeployment: "",
    deploymentRequirements: "",
    expectedTimeline: "4-6 Weeks",
    estimatedCost: "CSR Funded (INR 0 to Govt)",
    expectedCivicImpact: "",
  });

  // Startup Support Request Response Modal
  const [showRespondModal, setShowRespondModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SupportRequestItem | null>(null);
  const [respondForm, setRespondForm] = useState({
    status: "APPROVED" as "APPROVED" | "REJECTED",
    responseNotes: "",
  });

  // Partner Marketplace State
  const [marketplaceItems, setMarketplaceItems] = useState<IndustryCapability[]>([]);
  const [marketplaceLoading, setMarketplaceLoading] = useState(false);
  const [marketplaceSearch, setMarketplaceSearch] = useState("");
  const [marketplaceType, setMarketplaceType] = useState<string>("ALL");
  const [selectedMarketplaceItem, setSelectedMarketplaceItem] = useState<IndustryCapability | null>(null);

  // Profile Edit State
  const [profileForm, setProfileForm] = useState({
    companyType: "",
    industryCategories: [] as string[],
    certifications: "",
    deploymentCapacity: "",
    locationsServed: "",
    caseStudies: "",
    contactEmail: "",
    contactPhone: "",
    district: "",
  });

  // Fetch Dashboard data
  const fetchDashboard = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/industry/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load industry dashboard data.");
      }
      setData(json.data);

      // Populate profile form
      const org = json.data.organization;
      setProfileForm({
        companyType: org.companyType || "Enterprise Solution Partner",
        industryCategories: org.industryCategories || [],
        certifications: (org.certifications || []).join("\n"),
        deploymentCapacity: org.deploymentCapacity || "",
        locationsServed: (org.locationsServed || []).join(", "),
        caseStudies: org.caseStudies || "",
        contactEmail: org.contactEmail || "",
        contactPhone: org.contactPhone || "",
        district: org.district || "East Singhbhum",
      });
    } catch (err: any) {
      setError(err.message || "Failed to connect to backend service.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Fetch Marketplace items
  const fetchMarketplace = useCallback(async () => {
    if (!token) return;
    try {
      setMarketplaceLoading(true);
      const params = new URLSearchParams();
      if (marketplaceType !== "ALL") params.append("type", marketplaceType);
      if (marketplaceSearch.trim()) params.append("search", marketplaceSearch.trim());

      const res = await fetch(`${API_BASE_URL}/industry/capabilities/marketplace?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setMarketplaceItems(json.capabilities || []);
      }
    } catch (err) {
      console.warn("Marketplace fetch error:", err);
    } finally {
      setMarketplaceLoading(false);
    }
  }, [token, marketplaceType, marketplaceSearch]);

  useEffect(() => {
    if (activeTab === "marketplace") {
      fetchMarketplace();
    }
  }, [activeTab, fetchMarketplace]);

  // Open Publish Capability Modal
  const handleOpenAddCapability = (presetType?: CapabilityType) => {
    setEditingCapabilityId(null);
    setCapabilityForm({
      type: presetType || "PRODUCT",
      title: "",
      category: presetType === "SERVICE" ? "Testing Laboratories & Analytical Testing" : presetType === "EQUIPMENT_FACILITY" ? "Equipment & Heavy Industrial Machinery" : presetType === "TECHNICAL_EXPERTISE" ? "Specialized Technical Expertise" : "Manufacturing & Precision Fabrication",
      description: "",
      availability: "AVAILABLE",
      locationsServed: data?.organization.locationsServed?.join(", ") || "East Singhbhum, Ranchi, Statewide Jharkhand",
      caseStudies: "",
      specParam1Name: presetType === "SERVICE" ? "Turnaround Time" : presetType === "EQUIPMENT_FACILITY" ? "Laboratory Equipment" : presetType === "TECHNICAL_EXPERTISE" ? "Engineering Domains" : "Output / Throughput Capacity",
      specParam1Val: "",
      specParam2Name: presetType === "SERVICE" ? "Certified Parameters" : presetType === "EQUIPMENT_FACILITY" ? "Calibration Traceability" : presetType === "TECHNICAL_EXPERTISE" ? "Team Size / Senior Fellows" : "Service Life & Specs",
      specParam2Val: "",
    });
    setShowCapabilityModal(true);
  };

  // Open Edit Capability Modal
  const handleOpenEditCapability = (cap: IndustryCapability) => {
    setEditingCapabilityId(cap.id);
    const specs = cap.specifications || {};
    const keys = Object.keys(specs);

    setCapabilityForm({
      type: cap.type,
      title: cap.title,
      category: cap.category,
      description: cap.description,
      availability: cap.availability,
      locationsServed: (cap.locationsServed || []).join(", "),
      caseStudies: cap.caseStudies || "",
      specParam1Name: keys[0] || "Specification 1",
      specParam1Val: keys[0] ? String(specs[keys[0]]) : "",
      specParam2Name: keys[1] || "Specification 2",
      specParam2Val: keys[1] ? String(specs[keys[1]]) : "",
    });
    setShowCapabilityModal(true);
  };

  // Submit Capability (Create or Edit)
  const handleSaveCapability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (capabilityForm.title.trim().length < 3) {
      setError("Capability title must be at least 3 characters.");
      return;
    }
    if (capabilityForm.description.trim().length < 10) {
      setError("Please describe this capability with at least 10 characters.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setActionSuccess(null);

    const specs: Record<string, string> = {};
    if (capabilityForm.specParam1Name.trim() && capabilityForm.specParam1Val.trim()) {
      specs[capabilityForm.specParam1Name.trim()] = capabilityForm.specParam1Val.trim();
    }
    if (capabilityForm.specParam2Name.trim() && capabilityForm.specParam2Val.trim()) {
      specs[capabilityForm.specParam2Name.trim()] = capabilityForm.specParam2Val.trim();
    }

    const locationsArray = capabilityForm.locationsServed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      type: capabilityForm.type,
      title: capabilityForm.title.trim(),
      category: capabilityForm.category,
      description: capabilityForm.description.trim(),
      availability: capabilityForm.availability,
      locationsServed: locationsArray,
      caseStudies: capabilityForm.caseStudies.trim() || null,
      specifications: Object.keys(specs).length > 0 ? specs : null,
    };

    try {
      const url = editingCapabilityId
        ? `${API_BASE_URL}/industry/capabilities/${editingCapabilityId}`
        : `${API_BASE_URL}/industry/capabilities`;
      const method = editingCapabilityId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || "Failed to save capability.");
      }

      setActionSuccess(
        editingCapabilityId
          ? `Capability "${capabilityForm.title}" updated successfully!`
          : `New ${capabilityForm.type.replace("_", " ")} published to capability catalog!`
      );
      setShowCapabilityModal(false);
      await fetchDashboard();
    } catch (err: any) {
      setError(err.message || "Failed to save capability.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Capability
  const handleDeleteCapability = async (id: string, title: string) => {
    if (!token) return;
    if (!window.confirm(`Are you sure you want to remove "${title}" from your capability catalog?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/industry/capabilities/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || "Failed to remove capability.");
      }
      setActionSuccess(`Capability "${title}" removed successfully.`);
      await fetchDashboard();
    } catch (err: any) {
      setError(err.message || "Failed to delete capability.");
    }
  };

  // Open "How can we contribute?" Modal
  const handleOpenProposalModal = (problem: RecommendedOpportunity) => {
    setSelectedProblemForProposal(problem);

    // Pick top matching capability if any
    const firstCap = data?.capabilities[0];
    setProposalForm({
      selectedCapabilityId: firstCap ? firstCap.id : "",
      providedItems: firstCap ? `Deployment of ${firstCap.title} with full field mounting` : "",
      technicalCapability: firstCap ? firstCap.description : "",
      relevantProductService: firstCap ? firstCap.title : "",
      previousDeployment: firstCap?.caseStudies || data?.organization.caseStudies || "",
      deploymentRequirements: "Site clearance from local administration; basic civil plinth at discharge location.",
      expectedTimeline: "4-6 Weeks",
      estimatedCost: "CSR Funded (INR 0 to Govt)",
      expectedCivicImpact: `Immediate stabilization of civic issue for ${problem.affectedCount.toLocaleString()} affected residents in ${problem.district}.`,
    });
    setShowProposalModal(true);
  };

  // When capability is selected in proposal modal, prefill fields
  const handleSelectCapabilityForProposal = (capId: string) => {
    const cap = data?.capabilities.find((c) => c.id === capId);
    if (!cap) {
      setProposalForm({
        ...proposalForm,
        selectedCapabilityId: "",
      });
      return;
    }

    setProposalForm({
      ...proposalForm,
      selectedCapabilityId: cap.id,
      relevantProductService: cap.title,
      providedItems: `Deployment & commissioning of ${cap.title}`,
      technicalCapability: cap.description,
      previousDeployment: cap.caseStudies || proposalForm.previousDeployment,
    });
  };

  // Submit Capability & Deployment Proposal
  const handleProposalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedProblemForProposal) return;

    if (proposalForm.providedItems.trim().length < 5) {
      setError("Please describe what your organization will provide.");
      return;
    }
    if (proposalForm.technicalCapability.trim().length < 5) {
      setError("Please explain the technical capability deployed.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`${API_BASE_URL}/industry/proposals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          problemId: selectedProblemForProposal.id,
          capabilityId: proposalForm.selectedCapabilityId || null,
          providedItems: proposalForm.providedItems.trim(),
          technicalCapability: proposalForm.technicalCapability.trim(),
          relevantProductService: proposalForm.relevantProductService.trim() || null,
          previousDeployment: proposalForm.previousDeployment.trim() || null,
          deploymentRequirements: proposalForm.deploymentRequirements.trim() || null,
          expectedTimeline: proposalForm.expectedTimeline.trim(),
          estimatedCost: proposalForm.estimatedCost.trim() || null,
          expectedCivicImpact: proposalForm.expectedCivicImpact.trim(),
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || "Failed to submit deployment proposal.");
      }

      setActionSuccess(
        `Capability & Deployment proposal submitted successfully for "${selectedProblemForProposal.title}"!`
      );
      setShowProposalModal(false);
      setSelectedProblemForProposal(null);
      await fetchDashboard();
      setActiveTab("proposals");
    } catch (err: any) {
      setError(err.message || "Failed to submit proposal.");
    } finally {
      setSubmitting(false);
    }
  };

  // Save Partner Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSubmitting(true);
    setError(null);
    setActionSuccess(null);

    const certsArray = profileForm.certifications
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const locationsArray = profileForm.locationsServed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetch(`${API_BASE_URL}/industry/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          companyType: profileForm.companyType,
          industryCategories: profileForm.industryCategories,
          certifications: certsArray,
          deploymentCapacity: profileForm.deploymentCapacity,
          locationsServed: locationsArray,
          caseStudies: profileForm.caseStudies,
          contactEmail: profileForm.contactEmail,
          contactPhone: profileForm.contactPhone,
          district: profileForm.district,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || "Failed to update industry profile.");
      }

      setActionSuccess("Industry Partner Profile updated successfully!");
      await fetchDashboard();
    } catch (err: any) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Respond to Startup Support Request
  const handleRespondSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedRequest) return;
    setSubmitting(true);
    setActionSuccess(null);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/industry/support-requests/${selectedRequest.id}/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: respondForm.status,
          responseNotes: respondForm.responseNotes,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || "Failed to respond to support request.");
      }

      setActionSuccess(`Support request marked as ${respondForm.status}!`);
      setShowRespondModal(false);
      setSelectedRequest(null);
      setRespondForm({ status: "APPROVED", responseNotes: "" });
      await fetchDashboard();
    } catch (err: any) {
      setError(err.message || "Failed to respond to support request.");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper formatting badges
  const getCapabilityBadge = (type: CapabilityType) => {
    switch (type) {
      case "PRODUCT":
        return {
          label: "Industrial Product",
          color: "bg-blue-50 text-blue-800 border-blue-200",
          icon: Boxes,
        };
      case "SERVICE":
        return {
          label: "Testing & Engineering Service",
          color: "bg-purple-50 text-purple-800 border-purple-200",
          icon: Wrench,
        };
      case "EQUIPMENT_FACILITY":
        return {
          label: "Equipment & Lab Facility",
          color: "bg-emerald-50 text-emerald-800 border-emerald-200",
          icon: Cpu,
        };
      case "TECHNICAL_EXPERTISE":
      default:
        return {
          label: "Technical Expertise",
          color: "bg-amber-50 text-amber-800 border-amber-200",
          icon: Award,
        };
    }
  };

  const getPriorityBadge = (tier: string) => {
    switch (tier) {
      case "HIGH":
        return "bg-rose-50 text-rose-800 border-rose-200";
      case "MEDIUM":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "LOW":
      default:
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
    }
  };

  const filteredCapabilities =
    data?.capabilities.filter((c) => (catalogFilter === "ALL" ? true : c.type === catalogFilter)) || [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-700 to-emerald-600 flex items-center justify-center text-white font-black text-xl shadow-md">
              CB
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-slate-900 leading-tight">CivicBridge</h1>
                <span className="px-2.5 py-0.5 text-xs font-bold bg-teal-100 text-teal-900 rounded-full border border-teal-200 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-teal-700" />
                  Industry & Solution Partners
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Industrial Products, Equipment, Testing Facilities, Engineering & Field Deployments
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("marketplace")}
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl border transition-colors min-h-[44px] ${
                activeTab === "marketplace"
                  ? "bg-teal-600 text-white border-teal-700 shadow-xs"
                  : "text-teal-900 bg-teal-50 hover:bg-teal-100 border-teal-200"
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>Partner Marketplace</span>
            </button>
            <Link
              to="/exchange"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3.5 py-2 rounded-xl transition-colors min-h-[44px]"
            >
              <ArrowRightLeft className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">Resource Exchange</span>
            </Link>
            <Link
              to="/problems"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3.5 py-2 rounded-xl transition-colors min-h-[44px]"
            >
              <Layers className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">Problem Bank</span>
            </Link>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 px-3 py-2 rounded-xl transition-colors min-h-[44px]"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* Banner Feedback */}
        {actionSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-emerald-900 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-semibold">{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-rose-900 animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Enterprise Partner Profile Hero Card */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-900 via-teal-900 to-emerald-800 text-white flex items-center justify-center font-bold text-2xl shadow-md shrink-0">
                <Building2 className="w-8 h-8 text-teal-200" />
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                    {data?.organization.name || user?.name}
                  </h2>
                  <span className="px-2.5 py-0.5 text-xs font-bold bg-teal-50 text-teal-800 rounded-md border border-teal-200">
                    {data?.organization.companyType || "Industry & Solution Partner"}
                  </span>
                  {data?.organization.regCode && (
                    <span className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-600 rounded border border-slate-200">
                      CIN/REG: {data.organization.regCode}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500">
                  <span className="flex items-center gap-1 font-medium text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-teal-600" />
                    {data?.organization.district || "East Singhbhum"}, {data?.organization.state || "Jharkhand"}
                  </span>
                  {data?.organization.contactEmail && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {data.organization.contactEmail}
                    </span>
                  )}
                  {data?.organization.contactPhone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {data.organization.contactPhone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button
                onClick={() => setActiveTab("profile")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold rounded-xl transition-colors min-h-[44px]"
              >
                <Edit3 className="w-4 h-4 text-teal-700" />
                <span>Edit Partner Profile</span>
              </button>
              <button
                onClick={fetchDashboard}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors min-h-[44px]"
                title="Sync Dashboard Data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Sync</span>
              </button>
            </div>
          </div>

          {/* Certifications & Deployment Capacity Row */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-600" />
                Accreditations & Certifications:
              </span>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {data?.organization.certifications && data.organization.certifications.length > 0 ? (
                  data.organization.certifications.map((cert, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded text-[11px] font-semibold"
                    >
                      {cert}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 italic">No formal certifications listed yet</span>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Field Deployment Capacity:
              </span>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                {data?.organization.deploymentCapacity ||
                  "Industrial engineering capacity available for rapid mobilization across Jharkhand."}
              </p>
            </div>
          </div>
        </div>

        {/* HERO SECTION: "What can this company contribute to CivicBridge?" */}
        <div className="bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-400" />
                <h3 className="text-base sm:text-lg font-black tracking-wide">
                  What Can {data?.organization.name || "Your Company"} Contribute to CivicBridge?
                </h3>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Publish real industrial capabilities so universities, civic startups, and district administrations can co-deploy your solutions on the ground.
              </p>
            </div>
            <button
              onClick={() => handleOpenAddCapability("PRODUCT")}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-transform active:scale-95 shrink-0 min-h-[44px]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Publish New Capability</span>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            <button
              onClick={() => handleOpenAddCapability("PRODUCT")}
              className="p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all group space-y-1"
            >
              <div className="flex items-center justify-between">
                <Boxes className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
                <span className="text-lg font-black text-white">{data?.metrics.productsCount || 0}</span>
              </div>
              <h4 className="text-xs font-bold text-white">Industrial Products</h4>
              <p className="text-[10px] text-slate-300">Filters, treatment units, sensors</p>
              <span className="text-[11px] font-bold text-teal-400 pt-1 inline-flex items-center gap-0.5">
                + Add Product <ChevronRight className="w-3 h-3" />
              </span>
            </button>

            <button
              onClick={() => handleOpenAddCapability("SERVICE")}
              className="p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all group space-y-1"
            >
              <div className="flex items-center justify-between">
                <Wrench className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
                <span className="text-lg font-black text-white">{data?.metrics.servicesCount || 0}</span>
              </div>
              <h4 className="text-xs font-bold text-white">Technical Services</h4>
              <p className="text-[10px] text-slate-300">NABL hydro-testing, soil assays</p>
              <span className="text-[11px] font-bold text-teal-400 pt-1 inline-flex items-center gap-0.5">
                + Offer Service <ChevronRight className="w-3 h-3" />
              </span>
            </button>

            <button
              onClick={() => handleOpenAddCapability("EQUIPMENT_FACILITY")}
              className="p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all group space-y-1"
            >
              <div className="flex items-center justify-between">
                <Cpu className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="text-lg font-black text-white">{data?.metrics.equipmentCount || 0}</span>
              </div>
              <h4 className="text-xs font-bold text-white">Equipment & Labs</h4>
              <p className="text-[10px] text-slate-300">Spectrometry, pilot test rigs</p>
              <span className="text-[11px] font-bold text-teal-400 pt-1 inline-flex items-center gap-0.5">
                + Register Lab <ChevronRight className="w-3 h-3" />
              </span>
            </button>

            <button
              onClick={() => handleOpenAddCapability("TECHNICAL_EXPERTISE")}
              className="p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all group space-y-1"
            >
              <div className="flex items-center justify-between">
                <Award className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="text-lg font-black text-white">{data?.metrics.expertiseCount || 0}</span>
              </div>
              <h4 className="text-xs font-bold text-white">Engineering Expertise</h4>
              <p className="text-[10px] text-slate-300">Principal engineers, design review</p>
              <span className="text-[11px] font-bold text-teal-400 pt-1 inline-flex items-center gap-0.5">
                + Add Expertise <ChevronRight className="w-3 h-3" />
              </span>
            </button>
          </div>
        </div>

        {/* Summary Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Catalog Assets</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {data?.metrics.totalCapabilities ?? (loading ? "..." : 0)}
              </span>
              <button
                onClick={() => setActiveTab("catalog")}
                className="text-[11px] font-bold text-teal-700 hover:underline"
              >
                View Catalog
              </button>
            </div>
            <p className="text-[11px] text-slate-500">Products, services & facilities</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Active Field Pilots</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
                {data?.metrics.activeDeploymentsCount ?? (loading ? "..." : 0)}
              </span>
              <button
                onClick={() => setActiveTab("deployments")}
                className="text-[11px] font-bold text-emerald-700 hover:underline"
              >
                Track Pilots
              </button>
            </div>
            <p className="text-[11px] text-slate-500">Field deployments on the ground</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Deployment Proposals</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-indigo-600">
                {data?.metrics.submittedProposalsCount ?? (loading ? "..." : 0)}
              </span>
              <button
                onClick={() => setActiveTab("proposals")}
                className="text-[11px] font-bold text-indigo-700 hover:underline"
              >
                View Proposals
              </button>
            </div>
            <p className="text-[11px] text-slate-500">Submitted to civic problems</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Matched Civic Issues</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-teal-700">
                {data?.metrics.recommendedOpportunitiesCount ?? (loading ? "..." : 0)}
              </span>
              <button
                onClick={() => setActiveTab("opportunities")}
                className="text-[11px] font-bold text-teal-700 hover:underline"
              >
                Explore
              </button>
            </div>
            <p className="text-[11px] text-slate-500">AI-matched to your capabilities</p>
          </div>
        </div>

        {/* Main Tabbed Interface */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Navigation Bar */}
          <div className="flex items-center gap-1 border-b border-slate-200 px-4 sm:px-6 pt-3 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-2 px-3.5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap min-h-[44px] ${
                activeTab === "overview"
                  ? "border-teal-600 text-teal-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab("catalog")}
              className={`flex items-center gap-2 px-3.5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap min-h-[44px] ${
                activeTab === "catalog"
                  ? "border-teal-600 text-teal-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Boxes className="w-4 h-4 text-blue-600" />
              <span>My Capability Catalog</span>
              {data?.capabilities && data.capabilities.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded-full">
                  {data.capabilities.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("opportunities")}
              className={`flex items-center gap-2 px-3.5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap min-h-[44px] ${
                activeTab === "opportunities"
                  ? "border-teal-600 text-teal-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Civic Opportunities</span>
              {data?.recommendedOpportunities && data.recommendedOpportunities.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-900 rounded-full">
                  {data.recommendedOpportunities.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("proposals")}
              className={`flex items-center gap-2 px-3.5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap min-h-[44px] ${
                activeTab === "proposals"
                  ? "border-teal-600 text-teal-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Deployment Proposals</span>
              {data?.deploymentProposals && data.deploymentProposals.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-800 rounded-full">
                  {data.deploymentProposals.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("deployments")}
              className={`flex items-center gap-2 px-3.5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap min-h-[44px] ${
                activeTab === "deployments"
                  ? "border-teal-600 text-teal-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Active Field Deployments</span>
              {data?.activeDeployments && data.activeDeployments.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
                  {data.activeDeployments.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("requests")}
              className={`flex items-center gap-2 px-3.5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap min-h-[44px] ${
                activeTab === "requests"
                  ? "border-teal-600 text-teal-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <HelpCircle className="w-4 h-4 text-slate-500" />
              <span>Partner Requests</span>
              {data?.metrics.pendingSupportRequests ? (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full">
                  {data.metrics.pendingSupportRequests}
                </span>
              ) : null}
            </button>

            <button
              onClick={() => setActiveTab("marketplace")}
              className={`flex items-center gap-2 px-3.5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap min-h-[44px] ${
                activeTab === "marketplace"
                  ? "border-teal-600 text-teal-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Boxes className="w-4 h-4 text-teal-600" />
              <span>Statewide Marketplace</span>
            </button>

            <button
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-2 px-3.5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap min-h-[44px] ${
                activeTab === "profile"
                  ? "border-teal-600 text-teal-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Sliders className="w-4 h-4 text-slate-500" />
              <span>Partner Profile</span>
            </button>
          </div>

          <div className="p-4 sm:p-6">
            {/* TAB: OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Zero-Gate Trust Banner */}
                <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-4 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-extrabold text-teal-950 uppercase tracking-wide">
                      Zero-Gate Institutional Collaboration Architecture
                    </h4>
                    <p className="text-xs text-teal-900 leading-relaxed">
                      All civic problems passing automated AI screening are discoverable and immediately eligible for industry solution proposals. Government verification is a parallel trust signal, <strong>never a gate or barrier</strong>.
                    </p>
                  </div>
                </div>

                {/* Published Capabilities Snapshot */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Your Published Capabilities</h3>
                      <p className="text-xs text-slate-500">Solutions currently discoverable by universities and government</p>
                    </div>
                    <button
                      onClick={() => setActiveTab("catalog")}
                      className="text-xs font-bold text-teal-700 hover:underline flex items-center gap-1"
                    >
                      <span>Manage all {data?.capabilities.length}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data?.capabilities.slice(0, 4).map((cap) => {
                      const badge = getCapabilityBadge(cap.type);
                      const BadgeIcon = badge.icon;
                      return (
                        <div
                          key={cap.id}
                          className="p-4 rounded-xl border border-slate-200 hover:border-teal-300 bg-white hover:shadow-xs transition-all space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-md border ${badge.color}`}>
                              <BadgeIcon className="w-3 h-3" />
                              {badge.label}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {cap.availability}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-slate-900 leading-snug">{cap.title}</h4>
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{cap.description}</p>

                          {cap.specifications && typeof cap.specifications === "object" && (
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex flex-wrap gap-2 text-[11px]">
                              {Object.entries(cap.specifications).slice(0, 2).map(([k, v]) => (
                                <span key={k} className="text-slate-600">
                                  <strong>{k}:</strong> {String(v)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top Recommended Civic Problems */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Priority Civic Opportunities</h3>
                      <p className="text-xs text-slate-500">High-impact issues matched to your domain and district</p>
                    </div>
                    <button
                      onClick={() => setActiveTab("opportunities")}
                      className="text-xs font-bold text-teal-700 hover:underline flex items-center gap-1"
                    >
                      <span>View all {data?.recommendedOpportunities.length}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {data?.recommendedOpportunities.slice(0, 3).map((opp) => (
                      <div
                        key={opp.id}
                        className="p-4 rounded-xl border border-slate-200 hover:border-teal-300 bg-white transition-all space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPriorityBadge(opp.priorityTier)}`}>
                                {opp.priorityTier} PRIORITY ({opp.priorityScore}/100)
                              </span>
                              <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                {opp.district}
                              </span>
                              <span className="text-[11px] font-medium text-slate-500">
                                {opp.affectedCount.toLocaleString()} affected citizens
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900">{opp.title}</h4>
                          </div>

                          <button
                            onClick={() => handleOpenProposalModal(opp)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 min-h-[44px]"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>How Can We Contribute?</span>
                          </button>
                        </div>

                        {opp.matchReasons && opp.matchReasons.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {opp.matchReasons.map((reason, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-100 rounded text-[10px] font-semibold"
                              >
                                ✓ {reason}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: CAPABILITY CATALOG */}
            {activeTab === "catalog" && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Industrial Capability Catalog</h3>
                    <p className="text-xs text-slate-500">
                      Publish products, services, laboratory equipment, and engineering expertise for civic deployment.
                    </p>
                  </div>
                  <button
                    onClick={() => handleOpenAddCapability()}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 min-h-[44px]"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>+ Publish Capability</span>
                  </button>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-2 flex-wrap border-b border-slate-100 pb-3">
                  {[
                    { id: "ALL", label: "All Capabilities" },
                    { id: "PRODUCT", label: "Products" },
                    { id: "SERVICE", label: "Services" },
                    { id: "EQUIPMENT_FACILITY", label: "Equipment & Labs" },
                    { id: "TECHNICAL_EXPERTISE", label: "Technical Expertise" },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setCatalogFilter(filter.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors min-h-[36px] ${
                        catalogFilter === filter.id
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                {/* Capabilities List */}
                {filteredCapabilities.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                    <Boxes className="w-10 h-10 text-slate-400 mx-auto" />
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-800">No capabilities published in this category yet</h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        Add your company’s industrial hardware, laboratory facilities, or technical testing services.
                      </p>
                    </div>
                    <button
                      onClick={() => handleOpenAddCapability()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-xl shadow-xs"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Publish First Capability</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredCapabilities.map((cap) => {
                      const badge = getCapabilityBadge(cap.type);
                      const BadgeIcon = badge.icon;
                      return (
                        <div
                          key={cap.id}
                          className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-teal-300 shadow-xs space-y-4 transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-md border ${badge.color}`}>
                              <BadgeIcon className="w-3.5 h-3.5" />
                              {badge.label}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                {cap.availability}
                              </span>
                              <button
                                onClick={() => handleOpenEditCapability(cap)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Edit Capability"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteCapability(cap.id, cap.title)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Remove Capability"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div>
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                              {cap.category}
                            </span>
                            <h4 className="text-base font-extrabold text-slate-900 mt-0.5 leading-snug">{cap.title}</h4>
                            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{cap.description}</p>
                          </div>

                          {/* Specifications Box */}
                          {cap.specifications && typeof cap.specifications === "object" && (
                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5 text-xs">
                              <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wide">
                                Technical Specifications:
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                                {Object.entries(cap.specifications).map(([key, val]) => (
                                  <div key={key} className="text-slate-600">
                                    <span className="font-semibold text-slate-800">{key}:</span> {String(val)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Locations & Case Studies */}
                          <div className="space-y-1 text-xs">
                            {cap.locationsServed && cap.locationsServed.length > 0 && (
                              <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                                <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                                <span>Locations Served: <strong>{cap.locationsServed.join(", ")}</strong></span>
                              </div>
                            )}
                            {cap.caseStudies && (
                              <div className="text-[11px] text-slate-600 italic bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                                <strong>Track Record:</strong> {cap.caseStudies}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB: CIVIC OPPORTUNITIES */}
            {activeTab === "opportunities" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Recommended Civic Opportunities</h3>
                  <p className="text-xs text-slate-500">
                    AI-screened community problems prioritized for industrial technology deployment and corporate engineering partnership.
                  </p>
                </div>

                <div className="space-y-4">
                  {data?.recommendedOpportunities.map((opp) => (
                    <div
                      key={opp.id}
                      className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-teal-300 shadow-xs space-y-4 transition-all"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPriorityBadge(opp.priorityTier)}`}>
                              {opp.priorityTier} PRIORITY ({opp.priorityScore}/100)
                            </span>
                            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-teal-600" />
                              {opp.district}
                            </span>
                            <span className="text-xs font-medium text-slate-500">
                              {opp.affectedCount.toLocaleString()} affected residents
                            </span>
                            {opp.verificationStatus === "GOVERNMENT_VERIFIED" && (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded border border-emerald-200">
                                ✓ Govt Verified
                              </span>
                            )}
                          </div>
                          <h4 className="text-base font-bold text-slate-900 leading-snug">{opp.title}</h4>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Link
                            to={`/problems/${opp.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors min-h-[44px]"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Problem</span>
                          </Link>
                          <button
                            onClick={() => handleOpenProposalModal(opp)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors min-h-[44px]"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>How Can We Contribute?</span>
                          </button>
                        </div>
                      </div>

                      {opp.aiSummary && (
                        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                          {opp.aiSummary}
                        </p>
                      )}

                      {opp.matchReasons && opp.matchReasons.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
                          <span className="text-slate-400 font-semibold text-[11px]">Match Factors:</span>
                          {opp.matchReasons.map((reason, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-0.5 bg-teal-50 text-teal-800 border border-teal-100 rounded-md text-[11px] font-semibold"
                            >
                              ✓ {reason}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: PROPOSALS */}
            {activeTab === "proposals" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Submitted Capability & Deployment Proposals</h3>
                    <p className="text-xs text-slate-500">
                      Industrial solutions and physical equipment proposed for civic problems across Jharkhand.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("opportunities")}
                    className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:underline"
                  >
                    <span>+ Propose on Another Problem</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {data?.deploymentProposals && data.deploymentProposals.length > 0 ? (
                  <div className="space-y-4">
                    {data.deploymentProposals.map((prop) => (
                      <div
                        key={prop.id}
                        className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3.5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div>
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                              Problem Target:
                            </span>
                            <h4 className="text-sm sm:text-base font-extrabold text-slate-900">
                              {prop.problem?.title || "Civic Problem"}
                            </h4>
                            <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-teal-600" />
                              {prop.problem?.district || "Jharkhand"}
                            </span>
                          </div>

                          <span className="px-3 py-1 text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-full shrink-0">
                            Status: {prop.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="space-y-1">
                            <span className="font-bold text-slate-700">What Company Provides:</span>
                            <p className="text-slate-600">{prop.providedItems}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="font-bold text-slate-700">Technical Capability Deployed:</span>
                            <p className="text-slate-600">{prop.technicalCapability}</p>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Timeline</span>
                            <span className="font-semibold text-slate-800">{prop.expectedTimeline}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Estimated Cost</span>
                            <span className="font-semibold text-slate-800">{prop.estimatedCost || "CSR Funded"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Linked Catalog Item</span>
                            <span className="font-semibold text-teal-800">{prop.capability?.title || "Custom Solution"}</span>
                          </div>
                        </div>

                        {prop.expectedCivicImpact && (
                          <div className="text-xs text-emerald-900 bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
                            <strong>Expected Civic Impact:</strong> {prop.expectedCivicImpact}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                    <FileText className="w-10 h-10 text-slate-400 mx-auto" />
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-800">No deployment proposals submitted yet</h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        Browse recommended civic opportunities and click "How Can We Contribute?" to submit your first solution proposal.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab("opportunities")}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-xl shadow-xs"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Browse Opportunities</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB: ACTIVE FIELD DEPLOYMENTS */}
            {activeTab === "deployments" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Active Field Deployments & Pilots</h3>
                  <p className="text-xs text-slate-500">
                    On-the-ground engineering testbeds, pilot installations, and verified civic impact metrics.
                  </p>
                </div>

                {data?.activeDeployments && data.activeDeployments.length > 0 ? (
                  <div className="space-y-4">
                    {data.activeDeployments.map((deployment) => (
                      <div
                        key={deployment.id}
                        className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-md border border-emerald-200">
                                {deployment.status}
                              </span>
                              <span className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-700 rounded border border-slate-200">
                                Admin Clearance: {deployment.clearanceStatus}
                              </span>
                            </div>
                            <h4 className="text-base font-extrabold text-slate-900">{deployment.title}</h4>
                            <p className="text-xs text-slate-500 flex items-center gap-2">
                              <span className="flex items-center gap-1 font-medium text-slate-700">
                                <MapPin className="w-3.5 h-3.5 text-teal-600" />
                                {deployment.siteLocation}, {deployment.district}
                              </span>
                              <span>•</span>
                              <span>Target: {deployment.targetBeneficiaryCount.toLocaleString()} citizens</span>
                            </p>
                          </div>

                          {deployment.problem && (
                            <Link
                              to={`/problems/${deployment.problem.id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors shrink-0 min-h-[44px]"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Linked Problem</span>
                            </Link>
                          )}
                        </div>

                        {/* Metrics Table Preview */}
                        {deployment.metrics && deployment.metrics.length > 0 && (
                          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 space-y-2">
                            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                              Verified Field Sensor & Lab Metrics:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                              {deployment.metrics.map((m) => (
                                <div key={m.id} className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                                  <span className="font-bold text-slate-800 block text-xs">{m.metricName}</span>
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-slate-400 text-[11px]">Baseline: {m.baselineValue} {m.unit}</span>
                                    {m.outcomeValue !== null && m.outcomeValue !== undefined && (
                                      <span className="text-emerald-600 font-extrabold text-xs">
                                        Outcome: {m.outcomeValue} {m.unit}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                    <ShieldCheck className="w-10 h-10 text-slate-400 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-800">No active field pilot deployments yet</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Field pilots are established when universities or district administrations accept your capability proposals.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: PARTNER REQUESTS */}
            {activeTab === "requests" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Startup & University Support Requests</h3>
                  <p className="text-xs text-slate-500">
                    Requests from civic startups seeking access to testing laboratories, technical mentorship, and manufacturing equipment.
                  </p>
                </div>

                {data?.pendingRequests && data.pendingRequests.length > 0 ? (
                  <div className="space-y-3">
                    {data.pendingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded border border-amber-200 uppercase">
                              {req.status}
                            </span>
                            <span className="text-xs font-bold text-slate-800">{req.requestType}</span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900">
                            From: {req.startup?.name || "Civic Startup"}
                          </h4>
                          <p className="text-xs text-slate-600">{req.details}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              setSelectedRequest(req);
                              setRespondForm({ status: "APPROVED", responseNotes: "Accepted by Industry Partner" });
                              setShowRespondModal(true);
                            }}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs min-h-[44px]"
                          >
                            Grant Support
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRequest(req);
                              setRespondForm({ status: "REJECTED", responseNotes: "Capacity currently full" });
                              setShowRespondModal(true);
                            }}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl min-h-[44px]"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                    <HelpCircle className="w-10 h-10 text-slate-400 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-800">No pending support requests</h4>
                    <p className="text-xs text-slate-500">When civic startups request laboratory access or technical guidance, they will appear here.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: STATEWIDE MARKETPLACE */}
            {activeTab === "marketplace" && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Statewide Solution Partner Marketplace</h3>
                    <p className="text-xs text-slate-500">
                      Explore industrial products, testing laboratories, and engineering facilities available across Jharkhand.
                    </p>
                  </div>
                  <button
                    onClick={fetchMarketplace}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl min-h-[44px]"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${marketplaceLoading ? "animate-spin" : ""}`} />
                    <span>Refresh Marketplace</span>
                  </button>
                </div>

                {/* Search and Filters Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={marketplaceSearch}
                      onChange={(e) => setMarketplaceSearch(e.target.value)}
                      placeholder="Search products, services, ICP-MS equipment, testing facilities..."
                      className="w-full pl-9 pr-3 py-2 bg-white text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none min-h-[44px]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={marketplaceType}
                      onChange={(e) => setMarketplaceType(e.target.value)}
                      className="px-3 py-2 bg-white text-xs border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none min-h-[44px]"
                    >
                      <option value="ALL">All Categories</option>
                      <option value="PRODUCT">Products</option>
                      <option value="SERVICE">Services</option>
                      <option value="EQUIPMENT_FACILITY">Equipment & Labs</option>
                      <option value="TECHNICAL_EXPERTISE">Expertise</option>
                    </select>
                  </div>
                </div>

                {/* Marketplace Items Grid */}
                {marketplaceLoading ? (
                  <div className="text-center py-12 text-slate-500 text-xs flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                    <span>Loading partner marketplace...</span>
                  </div>
                ) : marketplaceItems.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                    <Boxes className="w-10 h-10 text-slate-400 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-800">No partner capabilities match your criteria</h4>
                    <p className="text-xs text-slate-500">Try clearing your search query or selecting "All Categories".</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {marketplaceItems.map((item) => {
                      const badge = getCapabilityBadge(item.type);
                      const BadgeIcon = badge.icon;
                      return (
                        <div
                          key={item.id}
                          className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-teal-300 shadow-xs flex flex-col justify-between space-y-3 transition-all"
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-md border ${badge.color}`}>
                                <BadgeIcon className="w-3 h-3" />
                                {badge.label}
                              </span>
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {item.availability}
                              </span>
                            </div>

                            <h4 className="text-sm font-extrabold text-slate-900 leading-snug">{item.title}</h4>
                            <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{item.description}</p>
                          </div>

                          <div className="pt-3 border-t border-slate-100 space-y-2">
                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                              <span className="font-bold text-slate-700">{item.organization?.name || "Solution Partner"}</span>
                              <span>{item.organization?.district || "Jharkhand"}</span>
                            </div>

                            <button
                              onClick={() => setSelectedMarketplaceItem(item)}
                              className="w-full py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold text-xs rounded-xl transition-colors min-h-[44px]"
                            >
                              View Specifications & Connect
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB: PARTNER PROFILE */}
            {activeTab === "profile" && (
              <div className="space-y-5 max-w-3xl">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Industry & Solution Partner Profile</h3>
                  <p className="text-xs text-slate-500">
                    Ensure your company's capabilities, certifications, and deployment capacity are accurate to maximize match scores.
                  </p>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Company / Organization Name</label>
                      <input
                        type="text"
                        disabled
                        value={data?.organization.name || ""}
                        className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Company Type</label>
                      <select
                        value={profileForm.companyType}
                        onChange={(e) => setProfileForm({ ...profileForm, companyType: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 min-h-[44px]"
                      >
                        <option value="Public Limited (Large Enterprise)">Public Limited (Large Enterprise)</option>
                        <option value="Private Engineering Firm">Private Engineering Firm</option>
                        <option value="Accredited Testing Facility / NABL Lab">Accredited Testing Facility / NABL Lab</option>
                        <option value="Industrial Equipment Supplier / OEM">Industrial Equipment Supplier / OEM</option>
                        <option value="Environmental & Civil Engineering Contractor">Environmental & Civil Engineering Contractor</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Primary District</label>
                      <input
                        type="text"
                        value={profileForm.district}
                        onChange={(e) => setProfileForm({ ...profileForm, district: e.target.value })}
                        placeholder="e.g. East Singhbhum"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Contact Email</label>
                      <input
                        type="email"
                        value={profileForm.contactEmail}
                        onChange={(e) => setProfileForm({ ...profileForm, contactEmail: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Contact Phone</label>
                      <input
                        type="text"
                        value={profileForm.contactPhone}
                        onChange={(e) => setProfileForm({ ...profileForm, contactPhone: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Industry Categories</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      {INDUSTRY_CATEGORIES.map((cat) => {
                        const checked = profileForm.industryCategories.includes(cat);
                        return (
                          <label key={cat} className="flex items-center gap-2 cursor-pointer text-slate-700">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setProfileForm({
                                    ...profileForm,
                                    industryCategories: [...profileForm.industryCategories, cat],
                                  });
                                } else {
                                  setProfileForm({
                                    ...profileForm,
                                    industryCategories: profileForm.industryCategories.filter((c) => c !== cat),
                                  });
                                }
                              }}
                              className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                            />
                            <span>{cat}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Certifications & Accreditations (One per line)
                    </label>
                    <textarea
                      rows={3}
                      value={profileForm.certifications}
                      onChange={(e) => setProfileForm({ ...profileForm, certifications: e.target.value })}
                      placeholder="e.g. ISO 9001:2015 Quality Management&#10;ISO 14001:2015 Environmental Management&#10;NABL Accredited Laboratory"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Field Deployment Capacity</label>
                    <textarea
                      rows={2}
                      value={profileForm.deploymentCapacity}
                      onChange={(e) => setProfileForm({ ...profileForm, deploymentCapacity: e.target.value })}
                      placeholder="e.g. 50,000 community liters/day water treatment units; 3 dedicated field testing vans"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Locations Served (Comma-separated)</label>
                    <input
                      type="text"
                      value={profileForm.locationsServed}
                      onChange={(e) => setProfileForm({ ...profileForm, locationsServed: e.target.value })}
                      placeholder="East Singhbhum, Ranchi, Dhanbad, Statewide Jharkhand"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Case Studies & Past Deployments</label>
                    <textarea
                      rows={3}
                      value={profileForm.caseStudies}
                      onChange={(e) => setProfileForm({ ...profileForm, caseStudies: e.target.value })}
                      placeholder="Describe previous successful civic deployments, CSR projects, or industrial pilot implementations."
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-3">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors min-h-[44px]"
                    >
                      {submitting ? "Saving..." : "Save Partner Profile"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: PUBLISH / EDIT CAPABILITY MODAL                                 */}
      {/* ========================================================================= */}
      {showCapabilityModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in my-8">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {editingCapabilityId ? "Edit Industrial Capability" : "Publish to Capability Catalog"}
                </h3>
              </div>
              <button
                onClick={() => setShowCapabilityModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCapability} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Capability Type *</label>
                  <select
                    value={capabilityForm.type}
                    onChange={(e) => setCapabilityForm({ ...capabilityForm, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-medium min-h-[44px]"
                  >
                    <option value="PRODUCT">Industrial Product</option>
                    <option value="SERVICE">Testing & Technical Service</option>
                    <option value="EQUIPMENT_FACILITY">Equipment & Laboratory Facility</option>
                    <option value="TECHNICAL_EXPERTISE">Specialized Technical Expertise</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category *</label>
                  <select
                    value={capabilityForm.category}
                    onChange={(e) => setCapabilityForm({ ...capabilityForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-medium min-h-[44px]"
                  >
                    {INDUSTRY_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Title / Capability Name *</label>
                <input
                  type="text"
                  required
                  value={capabilityForm.title}
                  onChange={(e) => setCapabilityForm({ ...capabilityForm, title: e.target.value })}
                  placeholder="e.g. Industrial Slag & Carbon Adsorption Filter Media Unit"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 min-h-[44px]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Technical Description *</label>
                <textarea
                  required
                  rows={3}
                  value={capabilityForm.description}
                  onChange={(e) => setCapabilityForm({ ...capabilityForm, description: e.target.value })}
                  placeholder="Describe the engineering functionality, capacity, and civic problem-solving application..."
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Dynamic Technical Specs Inputs */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2">
                <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wide">
                  Key Technical Specifications:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <input
                      type="text"
                      value={capabilityForm.specParam1Name}
                      onChange={(e) => setCapabilityForm({ ...capabilityForm, specParam1Name: e.target.value })}
                      placeholder="Param 1 Name (e.g. Throughput)"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] mb-1 font-semibold"
                    />
                    <input
                      type="text"
                      value={capabilityForm.specParam1Val}
                      onChange={(e) => setCapabilityForm({ ...capabilityForm, specParam1Val: e.target.value })}
                      placeholder="Param 1 Value (e.g. 2,500 L/hr)"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px]"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={capabilityForm.specParam2Name}
                      onChange={(e) => setCapabilityForm({ ...capabilityForm, specParam2Name: e.target.value })}
                      placeholder="Param 2 Name (e.g. Service Life)"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] mb-1 font-semibold"
                    />
                    <input
                      type="text"
                      value={capabilityForm.specParam2Val}
                      onChange={(e) => setCapabilityForm({ ...capabilityForm, specParam2Val: e.target.value })}
                      placeholder="Param 2 Value (e.g. 18 Months)"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Availability</label>
                  <select
                    value={capabilityForm.availability}
                    onChange={(e) => setCapabilityForm({ ...capabilityForm, availability: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-medium min-h-[44px]"
                  >
                    <option value="AVAILABLE">AVAILABLE (Immediate Mobilization)</option>
                    <option value="SCHEDULED">SCHEDULED (2-4 Weeks Notice)</option>
                    <option value="UPON_REQUEST">UPON_REQUEST (Custom Configuration)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Locations Served (Comma-separated)</label>
                  <input
                    type="text"
                    value={capabilityForm.locationsServed}
                    onChange={(e) => setCapabilityForm({ ...capabilityForm, locationsServed: e.target.value })}
                    placeholder="East Singhbhum, Ranchi, Statewide Jharkhand"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Case Studies / Deployment Track Record</label>
                <textarea
                  rows={2}
                  value={capabilityForm.caseStudies}
                  onChange={(e) => setCapabilityForm({ ...capabilityForm, caseStudies: e.target.value })}
                  placeholder="e.g. Deployed in Jamshedpur industrial belt with 94.8% effluent purity confirmed by pollution board."
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCapabilityModal(false)}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-bold min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-xs min-h-[44px]"
                >
                  {submitting ? "Saving..." : editingCapabilityId ? "Update Capability" : "Publish Capability"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: "HOW CAN WE CONTRIBUTE?" (CAPABILITY & DEPLOYMENT PROPOSAL)      */}
      {/* ========================================================================= */}
      {showProposalModal && selectedProblemForProposal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in my-8">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-teal-900 to-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-400" />
                <div>
                  <h3 className="text-sm font-bold">How Can We Contribute? — Solution & Deployment Proposal</h3>
                  <p className="text-[11px] text-teal-200">
                    Propose industrial products, equipment, and field deployment directly for this civic problem
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowProposalModal(false)}
                className="text-slate-300 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Problem Target Snapshot */}
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Target Problem</span>
                <h4 className="font-extrabold text-slate-900">{selectedProblemForProposal.title}</h4>
                <span className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-teal-600" />
                  {selectedProblemForProposal.district} • {selectedProblemForProposal.affectedCount.toLocaleString()} affected residents
                </span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPriorityBadge(selectedProblemForProposal.priorityTier)}`}>
                {selectedProblemForProposal.priorityTier} PRIORITY
              </span>
            </div>

            <form onSubmit={handleProposalSubmit} className="p-5 space-y-4 text-xs">
              {/* Select from catalog */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  1. Link a Published Capability (Optional 1-Click Pre-fill)
                </label>
                <select
                  value={proposalForm.selectedCapabilityId}
                  onChange={(e) => handleSelectCapabilityForProposal(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-teal-50/50 border border-teal-200 rounded-xl text-teal-950 font-medium focus:ring-2 focus:ring-teal-500 min-h-[44px]"
                >
                  <option value="">-- Custom Engineering Deployment (No Catalog Link) --</option>
                  {data?.capabilities.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.type}] {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">2. What the Company Provides *</label>
                  <textarea
                    required
                    rows={2}
                    value={proposalForm.providedItems}
                    onChange={(e) => setProposalForm({ ...proposalForm, providedItems: e.target.value })}
                    placeholder="e.g. 3x Industrial Slag & Carbon Adsorption Units with complete piping manifolds"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">3. Technical Capability *</label>
                  <textarea
                    required
                    rows={2}
                    value={proposalForm.technicalCapability}
                    onChange={(e) => setProposalForm({ ...proposalForm, technicalCapability: e.target.value })}
                    placeholder="e.g. Continuous chemical effluent neutralization and heavy metal precipitation"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">4. Relevant Product / Service Name</label>
                  <input
                    type="text"
                    value={proposalForm.relevantProductService}
                    onChange={(e) => setProposalForm({ ...proposalForm, relevantProductService: e.target.value })}
                    placeholder="e.g. Industrial Adsorption Filter Unit TS-ADS-2500"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">5. Previous Deployment Track Record</label>
                  <input
                    type="text"
                    value={proposalForm.previousDeployment}
                    onChange={(e) => setProposalForm({ ...proposalForm, previousDeployment: e.target.value })}
                    placeholder="e.g. Deployed in 14 panchayats in Subarnarekha corridor"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">6. Deployment Requirements</label>
                <input
                  type="text"
                  value={proposalForm.deploymentRequirements}
                  onChange={(e) => setProposalForm({ ...proposalForm, deploymentRequirements: e.target.value })}
                  placeholder="e.g. Site clearance from District Collector; 15 sqm concrete base at culvert"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">7. Expected Timeline *</label>
                  <input
                    type="text"
                    required
                    value={proposalForm.expectedTimeline}
                    onChange={(e) => setProposalForm({ ...proposalForm, expectedTimeline: e.target.value })}
                    placeholder="e.g. 4-6 Weeks"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">8. Estimated Cost / CSR Commitment</label>
                  <input
                    type="text"
                    value={proposalForm.estimatedCost}
                    onChange={(e) => setProposalForm({ ...proposalForm, estimatedCost: e.target.value })}
                    placeholder="e.g. CSR Funded (INR 0 cost to Govt)"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">9. Expected Civic Impact *</label>
                <textarea
                  required
                  rows={2}
                  value={proposalForm.expectedCivicImpact}
                  onChange={(e) => setProposalForm({ ...proposalForm, expectedCivicImpact: e.target.value })}
                  placeholder="e.g. Neutralizes runoff for 1,500 residents; restores water safety to agricultural irrigation and livestock."
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProposalModal(false)}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-bold min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-xs min-h-[44px]"
                >
                  {submitting ? "Submitting..." : "Submit Deployment Proposal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: MARKETPLACE ITEM DETAIL & CONNECT MODAL                          */}
      {/* ========================================================================= */}
      {selectedMarketplaceItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in my-8">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900">Partner Solution Details</h3>
              </div>
              <button
                onClick={() => setSelectedMarketplaceItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">
                  {selectedMarketplaceItem.category}
                </span>
                <h4 className="text-base font-extrabold text-slate-900 mt-0.5">{selectedMarketplaceItem.title}</h4>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{selectedMarketplaceItem.description}</p>
              </div>

              {/* Specifications */}
              {selectedMarketplaceItem.specifications && typeof selectedMarketplaceItem.specifications === "object" && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1.5">
                  <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wide block">
                    Technical Specifications:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                    {Object.entries(selectedMarketplaceItem.specifications).map(([k, v]) => (
                      <div key={k} className="text-slate-600">
                        <span className="font-semibold text-slate-800">{k}:</span> {String(v)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Provider Info */}
              <div className="bg-teal-50/50 p-3.5 rounded-xl border border-teal-100 space-y-1.5">
                <span className="font-bold text-teal-950 text-[11px] uppercase tracking-wide block">
                  Provided By Partner:
                </span>
                <h5 className="font-extrabold text-slate-900 text-sm">
                  {selectedMarketplaceItem.organization?.name}
                </h5>
                <p className="text-[11px] text-slate-600">
                  {selectedMarketplaceItem.organization?.companyType || "Enterprise Solution Partner"} • {selectedMarketplaceItem.organization?.district}, Jharkhand
                </p>
                {selectedMarketplaceItem.organization?.contactEmail && (
                  <p className="text-[11px] text-teal-800 font-medium">
                    Contact: {selectedMarketplaceItem.organization.contactEmail}
                  </p>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedMarketplaceItem(null)}
                  className="px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs min-h-[44px]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: STARTUP SUPPORT REQUEST RESPONSE MODAL                           */}
      {/* ========================================================================= */}
      {showRespondModal && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Respond to Support Request</h3>
              <button onClick={() => setShowRespondModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRespondSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Decision</label>
                <select
                  value={respondForm.status}
                  onChange={(e) => setRespondForm({ ...respondForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium min-h-[44px]"
                >
                  <option value="APPROVED">APPROVE — Grant Facility / Mentorship Access</option>
                  <option value="REJECTED">DECLINE — Currently at Full Capacity</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Response Notes / Onboarding Details</label>
                <textarea
                  rows={3}
                  value={respondForm.responseNotes}
                  onChange={(e) => setRespondForm({ ...respondForm, responseNotes: e.target.value })}
                  placeholder="Provide instructions, facility access protocols, or contact person details..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRespondModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-teal-600 text-white font-bold rounded-xl shadow-xs min-h-[44px]"
                >
                  {submitting ? "Saving..." : "Submit Decision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IndustryDashboard;
