import React from "react";
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area } from "recharts";
import { motion } from "motion/react";
import { Database, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { Driver } from "@/services/firebaseService";

interface DashboardTabProps {
  [key: string]: any;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  dynamicChartData,
  drivers,
  isExtracting,
  handleExtractionClick,
}) => {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 group">
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl transition-all h-full">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm md:text-base font-black text-slate-900 uppercase italic">
                Live Network Performance
              </h3>
              <p className="text-[10px] md:text-[12px] text-slate-400 uppercase tracking-widest font-black opacity-60">
                Active Metric Synchronization
              </p>
            </div>
          </div>
          <div style={{ height: 300, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={dynamicChartData || []}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="colorRev"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#f59e0b"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="#f59e0b"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) =>
                    `₹${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`
                  }
                  dx={-10}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "none",
                    borderRadius: "16px",
                    fontSize: "11px",
                    fontWeight: "900",
                    boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
                    padding: "12px",
                  }}
                  itemStyle={{ color: "#f59e0b" }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#f59e0b"
                  fillOpacity={1}
                  fill="url(#colorRev)"
                  strokeWidth={4}
                  dot={{
                    r: 6,
                    fill: "#f59e0b",
                    strokeWidth: 3,
                    stroke: "#fff",
                  }}
                  activeDot={{ r: 8, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="bg-white p-3 md:p-4 rounded-2xl border border-slate-100 shadow-sm flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-black text-slate-900 uppercase italic">
              Node Activation
            </h3>
          </div>
          <div className="space-y-6">
            {(dynamicChartData || []).length > 0 ? (
              (dynamicChartData || []).map((item: any) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex justify-between text-[10px] md:text-[11px] font-black uppercase tracking-widest">
                    <span className="text-slate-500">{item.name}</span>
                    <span className="text-slate-950 font-mono italic">
                      {item.autos} Units
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width:
                          (drivers || []).length > 0
                            ? `${((item.autos / (drivers || []).length) * 100).toFixed(1)}%`
                            : "0%",
                      }}
                      className="h-full bg-amber-500 rounded-full shadow-[0_0_8px_#f59e0b]"
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 flex flex-col items-center justify-center opacity-20">
                <Database size={32} />
                <p className="text-[9px] font-black uppercase tracking-widest mt-4">No Distribution Data</p>
              </div>
            )}
          </div>
          <button
            onClick={(e) => handleExtractionClick(e, drivers, "Global_Status_Report")}
            disabled={isExtracting}
            className={cn(
              "w-full mt-6 py-4 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] shadow-xl transition-all",
              isExtracting
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-slate-950 text-white hover:bg-amber-500 hover:text-slate-950 active:scale-95"
            )}
          >
            {isExtracting ? "PROCESSING..." : "GENERATE REPORT"}
          </button>
        </div>
        <div className="bg-amber-500 p-4 md:p-6 rounded-2xl shadow-xl shadow-amber-500/10 text-slate-950 flex flex-col justify-between overflow-hidden relative group">
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
            <Activity size={120} />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">
              Fleet Pulse
            </p>
            <h4 className="text-3xl font-black italic">
              NETWORK
              <br />
              ACCELERATED
            </h4>
          </div>
          <div className="mt-8 relative z-10">
            {(drivers || []).length === 0 ? (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-slate-800 rounded-full"></span>
                <span className="text-[11px] font-black uppercase opacity-40">
                  Awaiting Active Screens...
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-slate-950 rounded-full animate-ping"></span>
                <span className="text-[11px] font-black uppercase">
                  Updating Active Screens...
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
