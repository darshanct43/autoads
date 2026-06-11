import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { X, Zap } from "lucide-react";

interface PackagesTabProps extends Record<string, any> {
  setActiveTab: (tab: string) => void;
  onPushToNetwork: (plan: any) => Promise<void>;
  plans?: any[];
}

export const PackagesTab: React.FC<PackagesTabProps> = ({ 
  setActiveTab, 
  onPushToNetwork, 
  plans = [] 
}) => {
  const [localPlans, setLocalPlans] = useState<any[]>([]);

  useEffect(() => {
    const defaultList = [
      { id: "BASIC", name: "Elite Starter", price: 999, description: "3 Auto Displays • 1 Day Assigned • Ad Policy Help" },
      { id: "STARTER", name: "Brand Velocity", price: 1999, description: "7 Auto Displays • 2 Days • High Retention" },
      { id: "PRO", name: "Dominion Pro", price: 4999, description: "Priority Network • 7 Days • Pro Strategy" }
    ];

    const merged = defaultList.map(def => {
      const dbPlan = plans.find(p => p.id === def.id);
      return dbPlan ? { ...def, ...dbPlan } : def;
    });

    setLocalPlans(merged);
  }, [plans]);

  const handlePriceChange = (id: string, value: string) => {
    const num = parseFloat(value) || 0;
    setLocalPlans(prev => prev.map(p => p.id === id ? { ...p, price: num } : p));
  };

  const handleDescChange = (id: string, value: string) => {
    setLocalPlans(prev => prev.map(p => p.id === id ? { ...p, description: value } : p));
  };

  return (
    <div className="fixed inset-0 left-0 md:left-20 z-20 bg-slate-55 p-6 md:p-10 overflow-y-auto min-h-[100dvh] pb-42" style={{ backgroundColor: "#f8fafc" }}>
      <div className="max-w-6xl mx-auto space-y-8 text-left">
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
            {localPlans.map((p) => (
              <div key={p.id} className="bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl pointer-events-none group-hover:bg-amber-500/10 transition-all" />
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-amber-500 shrink-0 shadow-xl shadow-slate-900/20">
                    <Zap size={28} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tight truncate">{p.name}</h3>
                    <div className="flex items-center gap-1 mt-1.5 bg-slate-50 border border-slate-100 px-2 py-1 rounded-xl max-w-[120px]">
                      <span className="text-[10px] font-black text-amber-500">₹</span>
                      <input
                        type="number"
                        value={p.price}
                        onChange={(e) => handlePriceChange(p.id, e.target.value)}
                        className="w-full text-xs font-black text-amber-500 bg-transparent outline-none border-none p-0 focus:ring-0 cursor-text select-text block"
                        title="Edit Plan Price"
                        placeholder="Price"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Display Parameters</label>
                    <textarea
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all cursor-text min-h-[100px] h-28"
                      value={p.description || ""}
                      onChange={(e) => handleDescChange(p.id, e.target.value)}
                      rows={4}
                      placeholder="Enter subscription details and parameters..."
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visibility state</span>
                    <div className="w-12 h-6 bg-amber-500 rounded-full relative shadow-inner">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-md" />
                    </div>
                  </div>
                  <button 
                    onClick={() => onPushToNetwork(p)}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all mt-4 active:scale-95"
                  >
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
