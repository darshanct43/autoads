import React from "react";
import { motion } from "motion/react";
import { Check, Zap } from "lucide-react";

interface PricingApprovalsTabProps {
  [key: string]: any;
}

export const PricingApprovalsTab: React.FC<PricingApprovalsTabProps> = ({
  planProposals,
  plans,
  handleRejectPlan,
  handleApprovePlan,
}) => {
  return (
    <div className="space-y-8">
      <div className="bg-slate-900 p-8 rounded-[3rem] text-white relative overflow-hidden shadow-2xl border border-slate-800">
        <div className="absolute right-0 top-0 w-64 h-64 bg-amber-500/10 blur-3xl rounded-full" />
        <div className="relative z-10">
          <h2 className="text-3xl font-black italic uppercase text-amber-500">Price Change Requests</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Designer & Base Pricing Approvals Queue</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {planProposals.length === 0 ? (
          <div className="col-span-full py-20 bg-slate-50 border border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center gap-4">
            <Check className="text-slate-200" size={48} />
            <h3 className="text-sm font-black text-slate-400 uppercase italic">All Pricing Synced</h3>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-1">No pending price proposals from support team</p>
          </div>
        ) : (
          planProposals.map((prop) => {
            const plan = plans.find(p => p.id === prop.planId);
            return (
              <motion.div
                key={prop.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-6 relative group"
              >
                <div className="flex items-center justify-between">
                  <div className="bg-amber-500/10 text-amber-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                    {prop.type === "designerPrice" ? "Designer Rate" : prop.type === "videoMakerPrice" ? "Video Rate" : "Base Rate"}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">
                    {prop.createdAt?.toDate?.()?.toLocaleDateString() || "Today"}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase italic leading-none">{plan?.name || prop.planId}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Proposed by: {prop.proposedBy}</p>
                </div>

                <div className="flex items-baseline gap-4 py-4 bg-slate-50 rounded-2xl px-6">
                  <div className="flex-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Proposed</p>
                    <p className="text-2xl font-black text-amber-500 italic">₹{prop.newValue || prop.newPrice}</p>
                  </div>
                  <div className="w-px h-10 bg-slate-200" />
                  <div className="flex-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Current</p>
                    <p className="text-2xl font-black text-slate-300 italic">
                      ₹{prop.type === "designerPrice" ? plan?.designerPrice : prop.type === "videoMakerPrice" ? plan?.videoMakerPrice : plan?.price}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleRejectPlan(prop.id)}
                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprovePlan(prop.id, prop.planId, prop.newValue || prop.newPrice, prop.type || "price")}
                    className="flex-[2] bg-amber-500 text-slate-950 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all"
                  >
                    Approve Rate
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
