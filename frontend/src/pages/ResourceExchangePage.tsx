import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config/api";
import { NavigationBar } from "../components/layout/NavigationBar";
import { CreateNeedModal } from "../components/exchange/CreateNeedModal";
import { CreateOfferModal } from "../components/exchange/CreateOfferModal";
import { MatchDrawerModal } from "../components/exchange/MatchDrawerModal";
import { RequestCollabModal } from "../components/exchange/RequestCollabModal";
import {
  ArrowRightLeft,
  PlusCircle,
  Sparkles,
  Building2,
  MapPin,
  RotateCcw,
  Handshake,
  AlertTriangle,
} from "lucide-react";
import { NeedItem, OfferItem, OfferCategory } from "../types";

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

export const ResourceExchangePage: React.FC = () => {
  const { user, token } = useAuth();

  const [activeTab, setActiveTab] = useState<"needs" | "offers">("needs");
  const [needs, setNeeds] = useState<NeedItem[]>([]);
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");

  // Modals
  const [showCreateNeedModal, setShowCreateNeedModal] = useState(false);
  const [showCreateOfferModal, setShowCreateOfferModal] = useState(false);

  // Matching Drawer
  const [activeMatchTarget, setActiveMatchTarget] = useState<{
    type: "need" | "offer";
    id: string;
    title: string;
  } | null>(null);

  // Collab Request Modal
  const [collabRequestTarget, setCollabRequestTarget] = useState<{
    needId?: string;
    offerId?: string;
    targetOrgId: string;
    targetOrgName: string;
    itemTitle: string;
  } | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.append("category", selectedCategory);
      if (selectedDistrict) params.append("district", selectedDistrict);

      const endpoint =
        activeTab === "needs"
          ? `${API_BASE_URL}/needs?${params.toString()}`
          : `${API_BASE_URL}/offers?${params.toString()}`;

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load exchange items.");
      }

      if (activeTab === "needs") {
        setNeeds(data.needs || []);
      } else {
        setOffers(data.offers || []);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred loading items.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, selectedCategory, selectedDistrict, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const canPost = !!user?.organizationId;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <NavigationBar activeSection="exchange" />

      {/* Hero Banner */}
      <section className="bg-white border-b border-slate-200 py-6 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Statewide Bilateral Resource Exchange
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Institutional Resource Exchange
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
              Match civic challenges and university research with lab facilities, student talent, incubation spaces, and industry CSR grants across Jharkhand.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canPost && (
              <>
                <button
                  onClick={() => setShowCreateNeedModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow-xs"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Post Need</span>
                </button>
                <button
                  onClick={() => setShowCreateOfferModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Post Offer</span>
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* Navigation Tabs and Filter Bar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            {/* View Switcher Tabs */}
            <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-bold w-fit">
              <button
                onClick={() => setActiveTab("needs")}
                className={`px-4 py-1.5 rounded-md transition-all ${
                  activeTab === "needs"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Resource Needs ({needs.length})
              </button>
              <button
                onClick={() => setActiveTab("offers")}
                className={`px-4 py-1.5 rounded-md transition-all ${
                  activeTab === "offers"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Resource Offers ({offers.length})
              </button>
            </div>

            {/* Quick Helper text */}
            <span className="text-[11px] text-slate-500">
              {activeTab === "needs"
                ? "Looking for lab access, CSR grants, or technical mentorship"
                : "Institutional solvers offering capacity, equipment, and expertise"}
            </span>
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="font-bold text-slate-600 block mb-1">Filter by Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 bg-white"
              >
                <option value="">All 10 Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-600 block mb-1">Filter by District</label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 bg-white"
              >
                <option value="">All 24 Districts</option>
                {JHARKHAND_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedCategory("");
                  setSelectedDistrict("");
                }}
                className="w-full py-2 px-3 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            </div>
          </div>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="py-16 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-500 font-medium">Querying statewide resource exchange...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && (activeTab === "needs" ? needs.length === 0 : offers.length === 0) && (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm max-w-lg mx-auto space-y-3">
            <ArrowRightLeft className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">
              No matching {activeTab === "needs" ? "resource needs" : "resource offers"} found
            </h3>
            <p className="text-xs text-slate-500">
              Try adjusting your category or district filter to discover opportunities across Jharkhand.
            </p>
          </div>
        )}

        {/* Cards Grid */}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeTab === "needs"
              ? needs.map((need) => (
                  <div
                    key={need.id}
                    className="bg-white rounded-xl border border-slate-200 hover:border-amber-300 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                          {need.category.replace(/_/g, " ")}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700">
                          {need.urgency} Urgency
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 leading-snug">{need.title}</h3>

                      <p className="text-xs text-slate-600 line-clamp-3">{need.details}</p>

                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {need.creatorOrg?.name || "Requesting Org"}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {need.district}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() =>
                          setActiveMatchTarget({
                            type: "need",
                            id: need.id,
                            title: need.title,
                          })
                        }
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-purple-200"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                        <span>Find Matching Offers</span>
                      </button>

                      {canPost && user?.organizationId !== need.creatorOrgId && (
                        <button
                          onClick={() =>
                            setCollabRequestTarget({
                              needId: need.id,
                              targetOrgId: need.creatorOrgId,
                              targetOrgName: need.creatorOrg?.name || "Partner Organization",
                              itemTitle: need.title,
                            })
                          }
                          className="py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs transition-colors"
                        >
                          <Handshake className="w-3.5 h-3.5" />
                          <span>Collaborate</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              : offers.map((offer) => (
                  <div
                    key={offer.id}
                    className="bg-white rounded-xl border border-slate-200 hover:border-emerald-300 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
                          {offer.category.replace(/_/g, " ")}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {offer.status}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 leading-snug">{offer.title}</h3>

                      <p className="text-xs text-slate-600 line-clamp-3">{offer.specifications}</p>

                      {offer.capacityTerms && (
                        <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 line-clamp-2">
                          <strong>Terms: </strong> {offer.capacityTerms}
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {offer.providerOrg?.name || "Provider Org"}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {offer.district}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() =>
                          setActiveMatchTarget({
                            type: "offer",
                            id: offer.id,
                            title: offer.title,
                          })
                        }
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-purple-200"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                        <span>Find Matching Needs</span>
                      </button>

                      {canPost && user?.organizationId !== offer.providerOrgId && (
                        <button
                          onClick={() =>
                            setCollabRequestTarget({
                              offerId: offer.id,
                              targetOrgId: offer.providerOrgId,
                              targetOrgName: offer.providerOrg?.name || "Partner Organization",
                              itemTitle: offer.title,
                            })
                          }
                          className="py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs transition-colors"
                        >
                          <Handshake className="w-3.5 h-3.5" />
                          <span>Request</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
          </div>
        )}
      </main>

      {/* Create Need Modal */}
      <CreateNeedModal
        isOpen={showCreateNeedModal}
        onClose={() => setShowCreateNeedModal(false)}
        onSuccess={() => fetchData()}
      />

      {/* Create Offer Modal */}
      <CreateOfferModal
        isOpen={showCreateOfferModal}
        onClose={() => setShowCreateOfferModal(false)}
        onSuccess={() => fetchData()}
      />

      {/* Matching Drawer Modal */}
      {activeMatchTarget && (
        <MatchDrawerModal
          type={activeMatchTarget.type}
          id={activeMatchTarget.id}
          title={activeMatchTarget.title}
          isOpen={true}
          onClose={() => setActiveMatchTarget(null)}
        />
      )}

      {/* Direct Collab Request Modal */}
      {collabRequestTarget && (
        <RequestCollabModal
          needId={collabRequestTarget.needId}
          offerId={collabRequestTarget.offerId}
          targetOrgId={collabRequestTarget.targetOrgId}
          targetOrgName={collabRequestTarget.targetOrgName}
          itemTitle={collabRequestTarget.itemTitle}
          isOpen={true}
          onClose={() => setCollabRequestTarget(null)}
          onSuccess={() => {
            setCollabRequestTarget(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

export default ResourceExchangePage;
