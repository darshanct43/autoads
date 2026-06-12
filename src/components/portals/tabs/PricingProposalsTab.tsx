import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
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
    features: "", 
    description: "",
    reason: ""
  });

  const handlePropose = async (type: 'price' | 'designerPrice' | 'videoMakerPrice' | 'features' | 'description') => {
    if (!selectedPlan) return;
    if (form.reason.length < 3) {
      showToast("Please provide a brief justification.", "error");
      return;
    }

    const newValue = 
      type === 'designerPrice' ? form.designerPrice : 
      type === 'videoMakerPrice' ? form.videoMakerPrice : 
      type === 'features' ? form.features :
      type === 'description' ? form.description :
      form.proposedPrice;

    const currentVal = 
      type === 'designerPrice' ? (selectedPlan.designerPrice || 0) : 
      type === 'videoMakerPrice' ? (selectedPlan.videoMakerPrice || 0) : 
      type === 'features' ? (selectedPlan.features || []).join('\n') :
      type === 'description' ? (selectedPlan.description || "") :
      (selectedPlan.price || 0);

    setIsSubmitting(true);
    try {
      await firebaseService.proposePlanChange({
        planId: selectedPlan.id,
        currentPrice: currentVal,
        proposedPrice: newValue,
        type,
        reason: form.reason
      });
      showToast(`${selectedPlan.name} proposal sent.`, "success");
    } catch (e) {
      showToast("Proposal failed.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 text-left">
      <div className="flex items-center justify-between bg-slate-900 px-6 py-4 rounded-3xl text-white shadow-lg border border-slate-800">
        <div>
          <h2 className="text-xl font-black italic uppercase text-amber-500 leading-none">Pricing Controls</h2>
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Configure & Propose Rate Adjustments</p>
        </div>
        <Sliders className="text-amber-500/20" size={32} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Plan List - Compact */}
        <div className="lg:col-span-1 space-y-2">
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => {
                setSelectedPlan(plan);
                setForm({
                  proposedPrice: plan.price || 0,
                  designerPrice: plan.designerPrice || 0,
                  videoMakerPrice: plan.videoMakerPrice || 0,
                  features: Array.isArray(plan.features) ? plan.features.join('\n') : "",
                  description: plan.description || "",
                  reason: ""
                });
              }}
              className={cn(
                "w-full px-4 py-3 rounded-2xl border transition-all text-left flex items-center justify-between",
                selectedPlan?.id === plan.id
                  ? "bg-slate-900 border-amber-500 text-white shadow-md ring-2 ring-amber-500/10"
                  : "bg-white border-slate-100 hover:border-slate-200"
              )}
            >
              <div className="space-y-0.5">
                <h4 className={cn(
                  "text-[10px] font-black uppercase italic leading-none",
                  selectedPlan?.id === plan.id ? "text-amber-500" : "text-slate-900"
                )}>{plan.name}</h4>
                <p className="text-[8px] font-bold text-slate-400 uppercase leading-none">
                  ₹{plan.price} • {plan.maxScreens > 0 ? `${plan.maxScreens} Screens` : 'Service'}
                </p>
              </div>
              <Check size={12} className={cn(selectedPlan?.id === plan.id ? "text-amber-500" : "text-slate-100")} />
            </button>
          ))}
        </div>

        {/* Configuration Area */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {selectedPlan ? (
              <motion.div
                key={selectedPlan.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4"
              >
                <div className="flex items-center gap-3 pb-3 border-b border-slate-50">
                  <span className="text-[9px] font-black bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded italic">EDITING: {selectedPlan.id}</span>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Base Rate: ₹{selectedPlan.price}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-4">
                      {/* Price Control */}
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">New Proposed Price (₹)</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={form.proposedPrice}
                            onChange={(e) => setForm({ ...form, proposedPrice: Number(e.target.value) })}
                            className="w-24 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[11px] font-black focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                          />
                          <button
                            onClick={() => handlePropose('price')}
                            disabled={isSubmitting}
                            className="flex-1 bg-slate-900 text-amber-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50"
                          >
                            Send Proposal
                          </button>
                        </div>
                      </div>

                      {/* Decription */}
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Marketing Description</label>
                        <textarea
                          value={form.description}
                          onChange={(e) => setForm({ ...form, description: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[9px] font-bold focus:outline-none focus:ring-1 focus:ring-amber-500/20 h-16 resize-none"
                        />
                        <button
                          onClick={() => handlePropose('description')}
                          className="w-full py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all"
                        >
                          Update Content
                        </button>
                      </div>
                   </div>

                   <div className="space-y-4">
                      {/* Justification */}
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black text-amber-600 uppercase tracking-widest ml-1 bg-amber-50 px-2 py-0.5 rounded-full inline-block">Reason for Change (Required)</label>
                        <textarea
                          value={form.reason}
                          onChange={(e) => setForm({ ...form, reason: e.target.value })}
                          placeholder="Why adjust rates? (e.g. Market demand, festive promo...)"
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[10px] font-medium focus:outline-none focus:ring-1 focus:ring-amber-500/20 h-28 resize-none"
                        />
                      </div>

                      <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                        <p className="text-[8px] font-bold text-blue-800 leading-tight uppercase font-mono">
                          Changes require Admin approval. Customers will see current rates until authorized.
                        </p>
                      </div>
                   </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-48 bg-slate-50 border border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-2 opacity-50">
                <RefreshCw size={24} className="text-slate-300 animate-spin-slow" />
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Select Plan to modify</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
