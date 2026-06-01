import React from "react";
import { motion } from "motion/react";
import { X, Zap } from "lucide-react";

interface PackagesTabProps extends Record<string, any> {
  setActiveTab: (tab: string) => void;
}

export const PackagesTab: React.FC<PackagesTabProps> = ({ setActiveTab }) => {
  return (
    <div className="fixed inset-0 left-0 md:left-20 z-20 bg-slate-55 p-6 md:p-10 overflow-y-auto min-h-[100dvh] pb-42" style={{ backgroundColor: "#f8fafc" }}>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="bg-slate-900 p-6 md:p-8 rounded-2xl text-white flex justify-between items-center bg-[radial-gradient(circle_at_100%_0%,rgba(245,158,11,0.1),transparent)]">
          <div>
            <h2 className="text-2xl md:text-3xl font-black italic uppercase text-amber-500">
              Package Configurator
            </h2>
            <p className="text-[10px] font-black uppercase text-slate-400">
              Adjust core network plan parameters
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button className="px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Export Pricing</button>
            <button className="px-5 py-3 bg-amber-500 text-slate-950 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20">Save All Changes</button>
            <button
              onClick={() => setActiveTab("DASHBOARD")}
              className="p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition-all"
              title="Close Tab"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-10"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {[
              { id: "BASIC", name: "Elite Starter", price: "₹999", desc: "3 Auto Displays • 1 Day Assigned" },
              { id: "STARTER", name: "Brand Velocity", price: "₹1999", desc: "7 Auto Displays • 2 Days" },
              { id: "PRO", name: "Dominion Pro", price: "₹4999", desc: "Priority Network • 7 Days" }
            ].map((p) => (
              <div key={p.id} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl pointer-events-none group-hover:bg-amber-500/10 transition-all" />
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-amber-500 shadow-xl shadow-slate-900/20">
                    <Zap size={28} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tight">{p.name}</h3>
                    <p className="text-xs font-black text-amber-500 tracking-widest mt-1">{p.price}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Display Parameters</label>
                    <textarea
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all"
                      defaultValue={p.desc}
                      rows={4}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visibility state</span>
                    <div className="w-12 h-6 bg-amber-500 rounded-full relative shadow-inner">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-md" />
                    </div>
                  </div>
                  <button className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all mt-4">
                    Push to Network
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
