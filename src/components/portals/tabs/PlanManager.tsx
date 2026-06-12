import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { firebaseService } from "@/services/firebaseService";
import { auth } from "@/lib/firebase";
import { Send, CheckCircle2, DollarSign, Palette, Video, AlertCircle } from "lucide-react";
import { serverTimestamp } from "firebase/firestore";

interface PlanConfig {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  maxScreens: number;
  isDesignerService: boolean;
}

const DEFAULT_PLANS: PlanConfig[] = [
  { id: 'BASIC', name: 'Basic Plan', price: 999, durationDays: 1, maxScreens: 3, isDesignerService: false },
  { id: 'STARTER', name: 'Starter Plan', price: 1999, durationDays: 5, maxScreens: 5, isDesignerService: false },
  { id: 'PRO', name: 'Pro Plan', price: 4999, durationDays: 7, maxScreens: 10, isDesignerService: false },
  { id: 'DESIGNER', name: 'Designer Plan', price: 1000, durationDays: 0, maxScreens: 0, isDesignerService: true },
  { id: 'VIDEOMAK', name: 'Video Ad Service', price: 2000, durationDays: 0, maxScreens: 0, isDesignerService: true },
];

export const PlanManager: React.FC = () => {
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [proposedPrices, setProposedPrices] = useState<Record<string, string>>({});
  const [proposalSent, setProposalSent] = useState<Record<string, boolean>>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = firebaseService.subscribeToPlanConfigurations((data) => {
      if (data && data.length > 0) {
        // Map data but ensure all 5 standard IDs are present or used
        const merged = DEFAULT_PLANS.map(def => {
          const dbPlan = data.find(p => p.id === def.id);
          return dbPlan ? { ...def, ...dbPlan } : def;
        });
        setPlans(merged);
      } else {
        setPlans(DEFAULT_PLANS);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const triggerToast = (msg: string, type: "success" | "error") => {
    if (type === "success") {
      setSuccess(msg);
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(msg);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleProposePrice = async (planId: string) => {
    const newPrice = proposedPrices[planId];
    if (!newPrice || isNaN(parseInt(newPrice))) {
      triggerToast("Invalid price amount", "error");
      return;
    }

    const user = auth.currentUser;
    const plan = plans.find(p => p.id === planId);

    try {
      setLoading(true);
      await firebaseService.proposePlanChange({
        planId,
        currentPrice: plan?.price || 0,
        proposedPrice: parseInt(newPrice),
        userId: user?.uid,
        userEmail: user?.email,
        status: 'PENDING',
        createdAt: serverTimestamp()
      } as any);
      
      setProposalSent(prev => ({ ...prev, [planId]: true }));
      triggerToast("Requested admin approval for price change", "success");
    } catch (e: any) {
      triggerToast("Proposal failed: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-3xl rounded-full" />
        <div className="relative z-10 space-y-2">
          <h2 className="text-2xl font-black italic uppercase text-amber-500 tracking-tight">Support Plan Management</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Modify pricing tiers & request administrator verification</p>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
          <CheckCircle2 size={14} /> {success}
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Plans List - Simplified Small Cards */}
      <div className="grid grid-cols-1 gap-4">
        {plans.map((plan) => (
          <div 
            key={plan.id}
            className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-slate-200 transition-all group"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg",
                  plan.isDesignerService ? (plan.id === 'VIDEOMAK' ? 'bg-rose-500' : 'bg-amber-500') : 'bg-slate-900'
                )}>
                  {plan.id === 'VIDEOMAK' ? <Video size={20} /> : plan.isDesignerService ? <Palette size={20} /> : <DollarSign size={20} />}
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-900 uppercase italic tracking-tight">{plan.name}</h4>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-black text-slate-950 italic tabular-nums">₹{plan.price}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">{plan.id}</span>
                  </div>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-3">
                {!proposalSent[plan.id] ? (
                  <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-100 gap-1.5 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">₹</span>
                      <input 
                        type="number" 
                        placeholder="New Price..."
                        className="w-full md:w-28 bg-white pl-6 pr-3 py-2.5 text-[10px] font-black uppercase text-slate-900 focus:outline-none rounded-lg border border-transparent focus:border-amber-500/30"
                        value={proposedPrices[plan.id] || ''}
                        onChange={(e) => setProposedPrices(prev => ({ ...prev, [plan.id]: e.target.value }))}
                      />
                    </div>
                    <button 
                      onClick={() => handleProposePrice(plan.id)}
                      className="px-5 py-2.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-800 transition-all flex items-center gap-2 whitespace-nowrap active:scale-95"
                    >
                      <Send size={12} className="text-amber-500" />
                      Propose Fix
                    </button>
                  </div>
                ) : (
                  <div className="px-6 py-3 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-2 italic">
                    <CheckCircle2 size={16} /> Final Audit Pending
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
