import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { firebaseService } from "@/services/firebaseService";
import { db, auth } from "@/lib/firebase";
import { getAuth } from "firebase/auth";
import { getDoc, doc, collection } from "firebase/firestore";
import { 
  Send, CheckCircle2, DollarSign, Calendar, Layers, MapPin, 
  CheckCircle, Plus, Trash2, Edit2, X, AlertTriangle, ListFilter, Lock,
  FileText, Sparkles, Eye, Check, RefreshCw, ChevronRight, HelpCircle
} from "lucide-react";

interface PlanConfig {
  id: string;
  name: string;
  price: number;
  description: string;
  category: "BASIC" | "ENTERPRISE" | "AGENCY" | "SERVICES";
  features: string[];
  maxScreens?: number;
  durationDays?: number;
  citiesSupported?: string;
  fleetSize?: string;
  clients?: string;
  revenueShare?: string;
  deliveryTime?: string;
  videoDuration?: string;
  visible?: boolean;
}

export const PlanManager: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const [products, setProducts] = useState<PlanConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<"BASIC" | "ENTERPRISE" | "AGENCY" | "SERVICES">("BASIC");
  
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    price: number;
    description: string;
    maxScreens: number;
    durationDays: number;
    citiesSupported: string;
    deliveryTime: string;
    videoDuration: string;
    features: string[];
    visible: boolean;
    newFeatureText: string;
  }>({
    name: "",
    price: 0,
    description: "",
    maxScreens: 3,
    durationDays: 30,
    citiesSupported: "",
    deliveryTime: "",
    videoDuration: "",
    features: [],
    visible: true,
    newFeatureText: ""
  });

  // Track edits list
  const [planEdits, setPlanEdits] = useState<any[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Rejection state modal
  const [rejectingEditId, setRejectingEditId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    const authInstance = getAuth();
    const user = authInstance.currentUser;
    if (user) {
      setUserEmail(user.email || "");
      if (user.email?.toLowerCase() === 'darshanct43@gmail.com') {
        setIsAdmin(true);
        setCanManage(true);
      }
      getDoc(doc(db, "users", user.uid)).then((snap) => {
        if (snap.exists()) {
          const uData = snap.data();
          if (uData.role === 'ADMIN' || user.email?.toLowerCase() === 'darshanct43@gmail.com') {
            setIsAdmin(true);
            setCanManage(true);
          } else if (uData.role === 'SUPPORT_MANAGER' || uData.role === 'SUPPORT_TEAM' || user.email?.toLowerCase() === 'vijayathrishu@gmail.com') {
            setCanManage(true);
          }
        }
      }).catch(console.error);
    }

    const unsubscribePlans = firebaseService.subscribeToPlans((data) => {
      setProducts(data);
      setLoading(false);
    });

    const unsubscribeEdits = firebaseService.subscribeToPlanEdits((edits) => {
      setPlanEdits(edits);
    });

    return () => {
      unsubscribePlans();
      unsubscribeEdits();
    };
  }, []);

  const triggerToast = (msg: string, type: "success" | "error") => {
    if (type === "success") {
      setSuccess(msg);
      setTimeout(() => setSuccess(null), 3500);
    } else {
      setError(msg);
      setTimeout(() => setError(null), 3500);
    }
  };

  const startEditing = (prod: PlanConfig) => {
    setEditingId(prod.id);
    
    // Look for any existing DRAFT for this product to restore it
    const existingDraft = planEdits.find(e => e.planId === prod.id && e.status === 'DRAFT');
    const baseSource = existingDraft ? { ...prod, ...existingDraft.newData } : prod;

    setEditForm({
      name: baseSource.name || "",
      price: baseSource.price || 0,
      description: baseSource.description || "",
      maxScreens: baseSource.maxScreens || baseSource.autoCount || 3,
      durationDays: baseSource.durationDays || baseSource.campaignDuration || 30,
      citiesSupported: baseSource.citiesSupported || "",
      deliveryTime: baseSource.deliveryTime || "",
      videoDuration: baseSource.videoDuration || "",
      features: [...(baseSource.features || [])],
      visible: baseSource.visible !== false,
      newFeatureText: ""
    });

    if (existingDraft) {
      triggerToast("Restored your unsaved DRAFT edits for this item.", "success");
    }
  };

  const addFeature = () => {
    if (!editForm.newFeatureText.trim()) return;
    setEditForm(prev => ({
      ...prev,
      features: [...prev.features, prev.newFeatureText.trim()],
      newFeatureText: ""
    }));
  };

  const removeFeature = (idx: number) => {
    setEditForm(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== idx)
    }));
  };

  const handleSaveEdit = async (status: "DRAFT" | "PENDING_APPROVAL") => {
    if (!canManage) {
      triggerToast("You lack permissions to modify plans.", "error");
      return;
    }

    const originalProd = products.find(p => p.id === editingId);
    if (!originalProd) return;

    try {
      setLoading(true);
      
      const newData: any = {
        name: editForm.name,
        price: Number(editForm.price),
        description: editForm.description,
        features: editForm.features,
        visible: editForm.visible,
        category: originalProd.category,
        id: originalProd.id
      };

      if (originalProd.category !== 'SERVICES') {
        newData.maxScreens = Number(editForm.maxScreens);
        newData.durationDays = Number(editForm.durationDays);
        newData.citiesSupported = editForm.citiesSupported;
      } else {
        if (originalProd.id === 'designer_service') {
          newData.deliveryTime = editForm.deliveryTime;
        } else {
          newData.videoDuration = editForm.videoDuration;
        }
      }

      await firebaseService.submitPlanEdit({
        planId: originalProd.id,
        itemId: originalProd.id,
        category: originalProd.category,
        itemType: originalProd.category === 'SERVICES' ? 'service' : 'plan',
        oldData: originalProd,
        newData,
        status
      });

      triggerToast(
        status === 'DRAFT' 
          ? `Draft configuration saved for "${editForm.name}".` 
          : `Configuration proposal for "${editForm.name}" submitted for approval!`, 
        "success"
      );
      setEditingId(null);
    } catch (err: any) {
      triggerToast("Action failed: " + (err.message || err), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (edit: any) => {
    try {
      setLoading(true);
      await firebaseService.approvePlanEdit(edit.id, edit.planId, edit.newData);
      triggerToast(`Successfully approved and published edits for "${edit.newData?.name || edit.planId}"!`, "success");
    } catch (err: any) {
      triggerToast("Approval failed: " + (err.message || err), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectingEditId) return;
    try {
      setLoading(true);
      await firebaseService.rejectPlanEdit(rejectingEditId, rejectionReason || "No reason specified");
      triggerToast("Proposal rejected successfully.", "success");
      setRejectingEditId(null);
      setRejectionReason("");
    } catch (err: any) {
      triggerToast("Rejection failed: " + (err.message || err), "error");
    } finally {
      setLoading(false);
    }
  };

  // Compute diffs for Admin dashboard
  const pendingApprovals = planEdits.filter(e => e.status === 'PENDING_APPROVAL');

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 blur-3xl rounded-full" />
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
            <span className="text-[10px] bg-amber-500/10 text-amber-400 font-bold px-3 py-1 rounded-full border border-amber-500/20 uppercase tracking-widest">Single Source of Truth</span>
          </div>
          <h2 className="text-3xl font-black uppercase text-white tracking-tight">Plan Management Center</h2>
          <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
            Manage the complete pricing matrix of 11 core products (9 subscription plans + 2 designer services). Support-team modifications are staged as drafts or pending edits. Administrators can perform side-by-side verification and approve live deployments instantly.
          </p>
        </div>
      </div>

      {/* Toast Notifications */}
      <AnimatePresence mode="popLayout">
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-500" /> {success}
          </motion.div>
        )}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg"
          >
            <AlertTriangle className="w-5 h-5 text-rose-500" /> {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Review Center */}
      {isAdmin && pendingApprovals.length > 0 && (
        <div className="bg-slate-50 border-2 border-amber-500/20 rounded-[2.5rem] p-6 space-y-6 text-left shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-2xl rounded-full" />
          <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
            <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center border border-amber-500/20">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-base font-black uppercase text-slate-900 tracking-tight flex items-center gap-2">
                Pending Admin Reviews
                <span className="bg-amber-500 text-slate-900 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                  {pendingApprovals.length}
                </span>
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Review proposed changes and sync directly to Customer Portal</p>
            </div>
          </div>

          <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
            {pendingApprovals.map((edit) => {
              const priceDiff = (edit.newData?.price || 0) - (edit.oldData?.price || 0);
              const addedFeatures = (edit.newData?.features || []).filter((f: string) => !(edit.oldData?.features || []).includes(f));
              const removedFeatures = (edit.oldData?.features || []).filter((f: string) => !(edit.newData?.features || []).includes(f));

              return (
                <div key={edit.id} className="bg-white rounded-3xl p-6 border border-slate-150 shadow-md space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[9px] bg-indigo-100 text-indigo-700 font-black uppercase px-2.5 py-1 rounded-full border border-indigo-200 tracking-wider">
                        {edit.category || "PLAN"}
                      </span>
                      <h4 className="text-sm font-black text-slate-900 uppercase mt-1">
                        {edit.newData?.name || edit.planId}
                      </h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                        Submitted by: {edit.editedBy}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApprove(edit)}
                        className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 cursor-pointer"
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button
                        onClick={() => setRejectingEditId(edit.id)}
                        className="px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-rose-500/10 cursor-pointer"
                      >
                        <X size={14} /> Reject
                      </button>
                    </div>
                  </div>

                  {/* Diff Analysis */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Value Changes */}
                    <div className="space-y-2">
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Property Diffs</h5>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 font-medium">Price:</span>
                          <div className="font-mono font-bold flex items-center gap-1.5">
                            <span className="text-slate-400 line-through">₹{edit.oldData?.price}</span>
                            <ChevronRight size={12} className="text-slate-300" />
                            <span className="text-slate-900 font-black">₹{edit.newData?.price}</span>
                            {priceDiff !== 0 && (
                              <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded font-black",
                                priceDiff > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                              )}>
                                {priceDiff > 0 ? "+" : ""}₹{priceDiff}
                              </span>
                            )}
                          </div>
                        </div>

                        {edit.category !== 'SERVICES' ? (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400 font-medium">Auto Count (maxScreens):</span>
                              <div className="font-bold flex items-center gap-1.5">
                                <span className="text-slate-400 line-through">{edit.oldData?.maxScreens || edit.oldData?.autoCount || 0}</span>
                                <ChevronRight size={12} className="text-slate-300" />
                                <span className="text-slate-950">{edit.newData?.maxScreens || 0}</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400 font-medium">Campaign Duration:</span>
                              <div className="font-bold flex items-center gap-1.5">
                                <span className="text-slate-400 line-through">{edit.oldData?.durationDays || edit.oldData?.campaignDuration || 0} Days</span>
                                <ChevronRight size={12} className="text-slate-300" />
                                <span className="text-slate-950">{edit.newData?.durationDays} Days</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400 font-medium">Cities:</span>
                              <div className="font-bold flex items-center gap-1.5">
                                <span className="text-slate-400 line-through">{edit.oldData?.citiesSupported || "None"}</span>
                                <ChevronRight size={12} className="text-slate-300" />
                                <span className="text-slate-950">{edit.newData?.citiesSupported || "None"}</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            {edit.planId === 'designer_service' && (
                              <div className="flex justify-between items-center">
                                <span className="text-slate-400 font-medium">Delivery Time:</span>
                                <div className="font-bold flex items-center gap-1.5">
                                  <span className="text-slate-400 line-through">{edit.oldData?.deliveryTime || "None"}</span>
                                  <ChevronRight size={12} className="text-slate-300" />
                                  <span className="text-slate-950">{edit.newData?.deliveryTime || "None"}</span>
                                </div>
                              </div>
                            )}
                            {edit.planId === 'video_ads_service' && (
                              <div className="flex justify-between items-center">
                                <span className="text-slate-400 font-medium">Video Duration:</span>
                                <div className="font-bold flex items-center gap-1.5">
                                  <span className="text-slate-400 line-through">{edit.oldData?.videoDuration || "None"}</span>
                                  <ChevronRight size={12} className="text-slate-300" />
                                  <span className="text-slate-950">{edit.newData?.videoDuration || "None"}</span>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        
                        <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                          <span className="text-slate-400 font-medium">Visible in Portal:</span>
                          <span className={cn(
                            "font-black uppercase text-[10px] px-2 py-0.5 rounded-full",
                            edit.newData?.visible !== false ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                          )}>
                            {edit.newData?.visible !== false ? "Visible" : "Hidden"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Feature Changes */}
                    <div className="space-y-2">
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Feature Changes</h5>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3 min-h-[110px]">
                        {addedFeatures.length === 0 && removedFeatures.length === 0 ? (
                          <p className="text-slate-400 italic">No features added or removed in this revision.</p>
                        ) : (
                          <div className="space-y-2 text-[10px] font-bold">
                            {addedFeatures.map((f: string, i: number) => (
                              <div key={i} className="flex items-center gap-1.5 text-emerald-600">
                                <span className="bg-emerald-100 text-emerald-800 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px]">+</span>
                                <span>{f}</span>
                              </div>
                            ))}
                            {removedFeatures.map((f: string, i: number) => (
                              <div key={i} className="flex items-center gap-1.5 text-rose-500 line-through">
                                <span className="bg-rose-100 text-rose-700 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px]">-</span>
                                <span>{f}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200/60 shadow-inner">
        {(["BASIC", "ENTERPRISE", "AGENCY", "SERVICES"] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setActiveCategory(cat);
              setEditingId(null);
            }}
            className={cn(
              "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap",
              activeCategory === cat 
                ? "bg-slate-900 text-white shadow-lg shadow-slate-950/20" 
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            {cat} PLANS
          </button>
        ))}
      </div>

      {/* Products List Grid */}
      <div className={cn(
        "grid grid-cols-1 gap-6",
        activeCategory === 'SERVICES' ? "md:grid-cols-2" : "md:grid-cols-3"
      )}>
        {products.filter(p => p.category === activeCategory).map((product) => {
          const isEditing = editingId === product.id;
          
          // Check for existing state badges
          const activeDraft = planEdits.find(e => e.planId === product.id && e.status === 'DRAFT');
          const activePending = planEdits.find(e => e.planId === product.id && e.status === 'PENDING_APPROVAL');

          return (
            <div 
              key={product.id}
              className="bg-white p-6 rounded-[2rem] border border-slate-150 shadow-sm hover:shadow-md transition-all text-left relative overflow-hidden flex flex-col justify-between"
            >
              {/* Status Ribbon & Highlights */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                {activePending && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-full text-[8px] font-black uppercase tracking-wider animate-pulse">
                    Pending Verification
                  </span>
                )}
                {activeDraft && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-full text-[8px] font-black uppercase tracking-wider">
                    Draft Configuration
                  </span>
                )}
                {product.visible === false && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 border border-slate-200 text-slate-500 rounded-full text-[8px] font-black uppercase tracking-wider">
                    Hidden in Portal
                  </span>
                )}
              </div>

              {/* Top Accent line */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-900" />

              {!isEditing ? (
                // View Mode
                <div className="flex flex-col h-full justify-between gap-6 pt-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1 bg-slate-900 rounded-full text-white text-[9px] font-black uppercase tracking-widest">
                        {product.id}
                      </div>
                      <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">{product.name}</h3>
                    </div>

                    <p className="text-xs font-semibold text-slate-500 italic">
                      {product.description}
                    </p>

                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                      <div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Price</span>
                        <span className="text-base font-black text-slate-900 font-mono">₹{product.price.toLocaleString()}</span>
                      </div>

                      {product.category !== 'SERVICES' ? (
                        <>
                          <div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Duration</span>
                            <span className="text-xs font-bold text-slate-800">{product.durationDays} Days</span>
                          </div>
                          <div className="col-span-2 pt-1.5 border-t border-slate-200/60 flex justify-between items-center text-xs">
                            <div>
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Fleet Size</span>
                              <span className="font-bold text-slate-800">{product.fleetSize || `${product.maxScreens} Autos`}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Cities Covered</span>
                              <span className="font-bold text-slate-800">{product.citiesSupported || "1 City"}</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          {product.id === 'designer_service' && (
                            <div>
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Delivery Time</span>
                              <span className="text-xs font-bold text-slate-800">{product.deliveryTime || "24-48 Hours"}</span>
                            </div>
                          )}
                          {product.id === 'video_ads_service' && (
                            <div>
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Duration Specs</span>
                              <span className="text-xs font-bold text-slate-800">{product.videoDuration || "30 Seconds"}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Features & Deliverables</span>
                      <div className="flex flex-wrap gap-1.5">
                        {product.features?.map((feat, fidx) => (
                          <span 
                            key={fidx} 
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-[9px] font-semibold text-slate-600"
                          >
                            <CheckCircle className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate max-w-[150px]" title={feat}>{feat}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 pt-4 border-t border-slate-100">
                    {canManage ? (
                      <button
                        onClick={() => startEditing(product)}
                        className="w-full px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-slate-950/10 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-amber-500" /> 
                        {activeDraft ? "Continue Draft Edit" : "Propose Edit"}
                      </button>
                    ) : (
                      <div className="w-full px-4 py-2 bg-slate-50 border border-slate-100 text-slate-400 text-[9px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed">
                        <Lock className="w-3.5 h-3.5 text-slate-400" /> Read Only
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Edit Form Mode (Inline Card Style)
                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between border-b border-slate-150 pb-2">
                    <div className="flex flex-col">
                      <span className="text-[8px] bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-full px-2.5 py-0.5 w-fit font-black uppercase tracking-widest">
                        Propose Config
                      </span>
                      <h3 className="text-sm font-black text-slate-900 uppercase mt-1">
                        Edit: {product.name}
                      </h3>
                    </div>
                    <button 
                      onClick={() => setEditingId(null)}
                      className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {/* Name */}
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Plan Name</label>
                      <input 
                        type="text" 
                        value={editForm.name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 transition-all focus:bg-white"
                      />
                    </div>

                    {/* Price */}
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Price (₹)</label>
                      <input 
                        type="number" 
                        value={editForm.price}
                        onChange={(e) => setEditForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 transition-all focus:bg-white font-mono"
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Description</label>
                      <textarea 
                        rows={2}
                        value={editForm.description}
                        onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 transition-all focus:bg-white resize-none"
                      />
                    </div>

                    {product.category !== 'SERVICES' ? (
                      <div className="grid grid-cols-2 gap-2">
                        {/* maxScreens */}
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Screens Limit</label>
                          <input 
                            type="number" 
                            value={editForm.maxScreens}
                            onChange={(e) => setEditForm(prev => ({ ...prev, maxScreens: Number(e.target.value) }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 transition-all focus:bg-white font-mono"
                          />
                        </div>

                        {/* durationDays */}
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Duration (Days)</label>
                          <input 
                            type="number" 
                            value={editForm.durationDays}
                            onChange={(e) => setEditForm(prev => ({ ...prev, durationDays: Number(e.target.value) }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 transition-all focus:bg-white font-mono"
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        {product.id === 'designer_service' && (
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Delivery Time</label>
                            <input 
                              type="text" 
                              value={editForm.deliveryTime}
                              onChange={(e) => setEditForm(prev => ({ ...prev, deliveryTime: e.target.value }))}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 transition-all focus:bg-white"
                            />
                          </div>
                        )}
                        {product.id === 'video_ads_service' && (
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Video Duration Spec</label>
                            <input 
                              type="text" 
                              value={editForm.videoDuration}
                              onChange={(e) => setEditForm(prev => ({ ...prev, videoDuration: e.target.value }))}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 transition-all focus:bg-white"
                            />
                          </div>
                        )}
                      </>
                    )}

                    {/* Visibility */}
                    <div className="flex items-center gap-2 py-2 bg-slate-50 px-3 rounded-xl border border-slate-150">
                      <input 
                        type="checkbox" 
                        id={`visible-check-${product.id}`}
                        checked={editForm.visible}
                        onChange={(e) => setEditForm(prev => ({ ...prev, visible: e.target.checked }))}
                        className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-900 cursor-pointer"
                      />
                      <label htmlFor={`visible-check-${product.id}`} className="text-[10px] font-black uppercase text-slate-600 tracking-wider cursor-pointer select-none">
                        Visible in Portal
                      </label>
                    </div>

                    {/* Features List */}
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Add Feature / Deliverable</label>
                      <div className="flex gap-1">
                        <input 
                          type="text"
                          value={editForm.newFeatureText}
                          onChange={(e) => setEditForm(prev => ({ ...prev, newFeatureText: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                          placeholder="Add new..."
                        />
                        <button 
                          type="button"
                          onClick={addFeature}
                          className="px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1 max-h-[100px] overflow-y-auto mt-1 p-2 bg-slate-50 rounded-xl border border-slate-100">
                        {editForm.features.length === 0 ? (
                          <span className="text-[9px] text-slate-400 italic">No features defined.</span>
                        ) : (
                          editForm.features.map((feat, idx) => (
                            <span 
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-200/80 hover:bg-rose-50 hover:text-rose-600 border border-slate-300 rounded-full text-[9px] font-bold text-slate-600 transition-colors cursor-pointer"
                              onClick={() => removeFeature(idx)}
                              title="Click to remove"
                            >
                              <span className="truncate max-w-[120px]">{feat}</span>
                              <Trash2 className="w-2.5 h-2.5 text-slate-400 shrink-0 ml-1" />
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 pt-3 border-t border-slate-150">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveEdit("DRAFT")}
                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-black uppercase tracking-widest rounded-xl cursor-pointer transition-all"
                      >
                        Save Draft
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="py-2 px-3 border border-slate-200 text-slate-500 hover:bg-slate-50 text-[9px] font-black uppercase tracking-widest rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit("PENDING_APPROVAL")}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[9px] font-black uppercase tracking-widest rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10"
                    >
                      <Send className="w-3.5 h-3.5" /> Submit For Approval
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* History Registry */}
      <div className="bg-white border border-slate-150 rounded-[2.5rem] p-6 shadow-sm text-left mt-8">
        <div className="flex items-center gap-2 border-b border-slate-150 pb-4 mb-4">
          <ListFilter className="w-5 h-5 text-slate-900" />
          <div>
            <h3 className="text-base font-bold text-slate-900">Change Proposal History</h3>
            <p className="text-[10px] text-slate-400 font-medium">Audit trace logs of submitted plan edits and authorization statuses</p>
          </div>
        </div>

        {planEdits.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-[10px] font-black uppercase tracking-wider bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            No proposal records found in the network
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-black uppercase tracking-wider text-[8px]">
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Old Price</th>
                  <th className="py-3 px-4">Proposed Price</th>
                  <th className="py-3 px-4">Submitted By</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {planEdits.map((edit) => {
                  const dateText = edit.createdAt?.seconds 
                    ? new Date(edit.createdAt.seconds * 1000).toLocaleDateString()
                    : "Pending Sync";
                  const status = (edit.status || "PENDING_APPROVAL").toUpperCase();
                  
                  return (
                    <tr key={edit.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-black text-slate-900 uppercase">
                        {edit.newData?.name || edit.planId}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[9px] font-black uppercase">
                          {edit.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold uppercase text-slate-400 text-[9px]">
                        {edit.itemType || "plan"}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-500">₹{edit.oldData?.price?.toLocaleString() || "N/A"}</td>
                      <td className="py-3.5 px-4 font-mono font-black text-indigo-600">₹{edit.newData?.price?.toLocaleString() || "N/A"}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">{edit.editedBy}</td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono font-bold">{dateText}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col items-center justify-center gap-1">
                          {status === "PENDING_APPROVAL" && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-full text-[8px] font-black uppercase tracking-wider animate-pulse">
                              Pending Admin
                            </span>
                          )}
                          {status === "DRAFT" && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 border border-slate-200 text-slate-600 rounded-full text-[8px] font-black uppercase tracking-wider">
                              Draft
                            </span>
                          )}
                          {status === "APPROVED" && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-full text-[8px] font-black uppercase tracking-wider">
                              Approved
                            </span>
                          )}
                          {status === "REJECTED" && (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full text-[8px] font-black uppercase tracking-wider">
                                Rejected
                              </span>
                              {edit.rejectionReason && (
                                <span className="text-[8px] text-rose-400 font-bold max-w-[120px] truncate" title={edit.rejectionReason}>
                                  Reason: {edit.rejectionReason}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rejection Modal Dialog */}
      {rejectingEditId && (
        <div className="fixed inset-0 z-[100] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 border border-slate-200 shadow-2xl text-left space-y-4">
            <h3 className="text-lg font-black text-slate-900 uppercase">Specify Rejection Reason</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Please enter a brief explanation for rejecting this plan configuration proposal. This feedback will be visible to the submitting Support Team member.
            </p>
            <textarea
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
              placeholder="e.g. Price increase violates category policy constraints."
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRejectingEditId(null);
                  setRejectionReason("");
                }}
                className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 text-[10px] font-black uppercase tracking-widest rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl cursor-pointer shadow-lg shadow-rose-500/10"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
