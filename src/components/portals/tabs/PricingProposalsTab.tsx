import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sliders, Check, Zap, AlertCircle, RefreshCw } from "lucide-react";
import { firebaseService } from "@/services/firebaseService";

interface PricingProposalsTabProps {
  plans: any[];
  showToast: (msg: string, type?: any) => void;
}

export const PricingProposalsTab: React.FC<PricingProposalsTabProps> = ({
  plans,
  showToast,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    proposedPrice: 0,
    designerPrice: 0,
    videoMakerPrice: 0,
    features: "", // Combined features text
    description: "",
    reason: ""
  });

  const handlePropose = async (type: 'price' | 'designerPrice' | 'videoMakerPrice' | 'features' | 'description') => {
    if (!selectedPlan) return;
    if (form.reason.length < 5) {
      showToast("Please provide a valid reason for the change.", "error");
      return;
    }

    const newValue = 
      type === 'designerPrice' ? form.designerPrice : 
      type === 'videoMakerPrice' ? form.videoMakerPrice : 
      type === 'features' ? form.features :
      type === 'description' ? form.description :
      form.proposedPrice;

    const currentVal = 
      type === 'designerPrice' ? selectedPlan.designerPrice : 
      type === 'videoMakerPrice' ? selectedPlan.videoMakerPrice : 
      type === 'features' ? (selectedPlan.features || []).join('\n') :
      type === 'description' ? selectedPlan.description :
      selectedPlan.price;

    setIsSubmitting(true);
    try {
      await firebaseService.proposePlanChange({
        planId: selectedPlan.id,
        currentPrice: currentVal || 0,
        proposedPrice: newValue,
        type,
        reason: form.reason
      });
      showToast(`Proposal for ${selectedPlan.name} (${type}) submitted for Admin approval.`, "success");
      setForm({ ...form, reason: "" });
    } catch (e) {
      showToast("Proposed change failed.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 text-left">
      <div className="bg-slate-900 p-8 rounded-[3rem] text-white relative overflow-hidden shadow-2xl border border-slate-800">
        <div className="absolute right-0 top-0 w-64 h-64 bg-amber-500/10 blur-3xl rounded-full" />
        <div className="relative z-10">
          <h2 className="text-3xl font-black italic uppercase text-amber-500">Pricing Control</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 tracking-tighter">Propose rate & feature changes for Admin approval</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Plan Selection */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest ml-2">Select Target Plan</h3>
          <div className="space-y-3">
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => {
                  setSelectedPlan(plan);
                  setForm({
                    proposedPrice: plan.price || 0,
                    designerPrice: plan.designerPrice || 0,
                    videoMakerPrice: plan.videoMakerPrice || 0,
                    features: (plan.features || []).join('\n'),
                    description: plan.description || "",
                    reason: ""
                  });
                }}
                className={cn(
                  "w-full p-6 rounded-[2rem] border transition-all text-left group relative overflow-hidden",
                  selectedPlan?.id === plan.id
                    ? "bg-slate-900 border-amber-500 shadow-xl shadow-amber-500/10"
                    : "bg-white border-slate-100 hover:border-slate-200"
                )}
              >
                <div className="relative z-10">
                  <h4 className={cn(
                    "text-lg font-black uppercase italic tracking-tight",
                    selectedPlan?.id === plan.id ? "text-amber-500" : "text-slate-900"
                  )}>{plan.name}</h4>
                  <div className="flex items-center gap-4 mt-2">
                    <p className={cn(
                      "text-[10px] font-black uppercase tracking-widest",
                      selectedPlan?.id === plan.id ? "text-slate-400" : "text-slate-400"
                    )}>Base: ₹{plan.price}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Design: ₹{plan.designerPrice || 0}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Propose Form */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedPlan ? (
              <motion.div
                key={selectedPlan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl space-y-8"
              >
                <div className="flex items-center gap-4 pb-6 border-b border-slate-50">
                   <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600">
                      <Sliders size={20} />
                   </div>
                   <div>
                     <h3 className="text-xl font-black text-slate-900 uppercase italic">Configure Proposal: {selectedPlan.name}</h3>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Changes remain hidden until Admin grants permission</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">New Base Price (₹)</label>
                      <div className="flex gap-3">
                        <input
                          type="number"
                          value={form.proposedPrice}
                          onChange={(e) => setForm({ ...form, proposedPrice: Number(e.target.value) })}
                          className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        />
                        <button
                          onClick={() => handlePropose('price')}
                          disabled={isSubmitting}
                          className="px-6 bg-slate-900 text-amber-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                        >
                          Propose
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">New Designer Price (₹)</label>
                      <div className="flex gap-3">
                        <input
                          type="number"
                          value={form.designerPrice}
                          onChange={(e) => setForm({ ...form, designerPrice: Number(e.target.value) })}
                          className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        />
                        <button
                          onClick={() => handlePropose('designerPrice')}
                          disabled={isSubmitting}
                          className="px-6 bg-slate-900 text-amber-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                        >
                          Propose
                        </button>
                      </div>
                    </div>

                      <div className="space-y-6">
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Edit Plan Description</label>
                          <textarea
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-[10px] font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 h-24 resize-none"
                            placeholder="Brief marketing description..."
                          />
                          <button
                            onClick={() => handlePropose('description')}
                            disabled={isSubmitting}
                            className="w-full mt-2 py-3 bg-slate-900 text-amber-500 rounded-xl text-[10px] font-black uppercase tracking-widest"
                          >
                            Propose Description Change
                          </button>
                        </div>

                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Edit Plan Features (One per line)</label>
                          <textarea
                            value={form.features}
                            onChange={(e) => setForm({ ...form, features: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-[10px] font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 h-32 resize-none"
                          />
                          <button
                            onClick={() => handlePropose('features')}
                            disabled={isSubmitting}
                            className="w-full mt-2 py-3 bg-slate-900 text-amber-500 rounded-xl text-[10px] font-black uppercase tracking-widest"
                          >
                            Propose Feature Changes
                          </button>
                        </div>
                      </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Justification / Reason</label>
                      <textarea
                        value={form.reason}
                        onChange={(e) => setForm({ ...form, reason: e.target.value })}
                        placeholder="Why is this change necessary? (e.g. Festival demand...)"
                        className="w-full bg-slate-50 border border-slate-100 rounded-3xl p-6 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 h-[340px] resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-amber-50 border border-amber-100 rounded-2xl flex gap-4">
                  <AlertCircle className="text-amber-600 shrink-0" size={20} />
                  <p className="text-[10px] font-bold text-amber-900 leading-relaxed uppercase">
                    Verification Note: Proposing a change will NOT affect customer pricing immediately. 
                    The Admin will review your proposal in the "Pricing Approvals" queue.
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="h-full min-h-[400px] bg-slate-50 border border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center gap-4 opacity-60 italic">
                <RefreshCw size={48} className="text-slate-300" />
                <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Select a plan to start configuration</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const cn = (...classes: any[]) => classes.filter(Boolean).join(" ");
