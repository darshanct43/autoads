import React from "react";
import { motion } from "motion/react";
import { Check, Zap } from "lucide-react";

interface PricingApprovalsTabProps {
  [key: string]: any;
}

export const PricingApprovalsTab: React.FC<PricingApprovalsTabProps> = ({
  planProposals = [],
  plans = [],
  handleRejectPlan,
  handleApprovePlan,
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-slate-900 px-6 py-4 rounded-3xl text-white relative overflow-hidden shadow-lg border border-slate-800 flex items-center justify-between">
        <div className="relative z-10">
          <h2 className="text-xl font-black italic uppercase text-amber-500 leading-none">Approval Queue</h2>
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Verify Proposed Pricing Adjustments</p>
        </div>
        <Zap className="text-amber-500/20" size={32} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {planProposals.length === 0 ? (
          <div className="col-span-full py-12 bg-slate-50 border border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center gap-2">
            <Check className="text-slate-200" size={32} />
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pricing Queue Empty</h3>
          </div>
        ) : (
          planProposals.map((prop: any) => {
            const plan = plans.find((p: any) => p.id === prop.planId);
            const finalNewVal = prop.proposedPrice || prop.newValue || 0;
            const finalCurrentVal = prop.currentPrice || 0;
            return (
              <motion.div
                key={prop.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 relative group"
              >
                <div className="flex items-center justify-between">
                  <div className="bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded text-[8px] font-black uppercase italic">
                    {prop.type || "Adjustment"}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase italic leading-none">{plan?.name || prop.planId}</h3>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">By: {prop.proposedBy || prop.userEmail || 'Support'}</p>
                </div>

                <div className="flex items-center gap-3 py-3 bg-slate-50 rounded-xl px-4 border border-slate-100/50">
                  <div className="flex-1">
                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Proposed</p>
                    <p className="text-lg font-black text-amber-500 italic leading-none">₹{finalNewVal}</p>
                  </div>
                  <div className="w-px h-6 bg-slate-200" />
                  <div className="flex-1">
                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Current</p>
                    <p className="text-lg font-black text-slate-300 italic leading-none">₹{finalCurrentVal}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleRejectPlan(prop.id)}
                    className="flex-1 px-3 py-2 bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                  >
                    Discard
                  </button>
                  <button
                    onClick={() => handleApprovePlan(prop.id, prop.planId, finalNewVal, prop.type || "price")}
                    className="flex-1 bg-slate-900 text-amber-500 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest hover:brightness-110 transition-all font-mono"
                  >
                    Approve
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};
