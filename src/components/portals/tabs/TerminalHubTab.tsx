import React from "react";
import { motion } from "motion/react";
import { Search, RefreshCw, MapPin, Trash2, ShieldCheck, Monitor, IndianRupee, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { Driver } from "@/services/firebaseService";
import { getSafeUrl } from "../AdminPortal";

interface TerminalHubTabProps {
  campaigns: any[];
  drivers: Driver[];
  totalSuccessfulRevenue: number;
  liveUnitsCount: number;
  liveStatus: any[];
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  driverLocations: any[];
  terminals: any[];
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  setMapCenter: (coords: [number, number]) => void;
  setMapZoom: (zoom: number) => void;
  handleFetchDriverHistory: (driverId: string) => void;
  setSelectedDriverHistory: (history: any[]) => void;
  setActiveTab: (tab: string) => void;
  setNetworkConfigTarget: (terminalId: string | null) => void;
  firebaseService: any;
}

export const TerminalHubTab: React.FC<TerminalHubTabProps> = ({
  campaigns,
  drivers,
  totalSuccessfulRevenue,
  liveUnitsCount,
  liveStatus,
  searchTerm,
  setSearchTerm,
  driverLocations,
  terminals,
  showToast,
  setMapCenter,
  setMapZoom,
  handleFetchDriverHistory,
  setSelectedDriverHistory,
  setActiveTab,
  setNetworkConfigTarget,
  firebaseService,
}) => {
  return (
    <div className="space-y-8 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Active Campaigns", value: campaigns.filter(c => c.status === "ACTIVE").length, sub: "Live Now", icon: Monitor },
          { label: "Cloud Units Ready", value: drivers.filter(d => d.status === "active").length, sub: "Approved Fleet", icon: ShieldCheck },
          { label: "Total Revenue", value: `₹${totalSuccessfulRevenue.toLocaleString()}`, sub: "Cumulative", icon: IndianRupee },
          { label: "Online Now", value: liveUnitsCount, sub: "Real-time Pulse", icon: Activity }
        ].map((stat) => (
          <div key={stat.label} className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
              <stat.icon className="text-amber-500" size={100} />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
                  <stat.icon className="text-amber-500" size={16} />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
              </div>
              <h4 className="text-4xl font-black text-white tracking-tight">{stat.value}</h4>
              <p className="text-[10px] font-black text-amber-500/60 uppercase tracking-widest mt-2">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-black italic uppercase text-slate-900 leading-tight">Terminal Hub</h2>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 italic flex flex-wrap items-center gap-2">
              <span className="text-slate-900">SYSTEM ARCHITECTURE:</span> Every driver requires a Provisioned Terminal to run Ad Campaigns.
              <span className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
              <span className="text-slate-500 underline decoration-slate-200">NOT ASSIGNED:</span> Terminal hardware logic has not been linked to this driver profile yet.
              <span className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
              <span className="text-amber-600 font-bold">AWAITING PROVISIONING:</span> Terminal ID generated but synchronization with physical display unit is pending.
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:flex-initial">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="SEARCH TERMINAL ID..."
                className="w-full md:w-64 pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-amber-500/20"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="p-4 bg-slate-900 text-amber-500 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all">
              <RefreshCw size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {drivers.filter(d => (d.terminalId || "").toUpperCase().includes(searchTerm.toUpperCase())).map((d) => {
            const status = liveStatus.find(s => s.terminalId === d.terminalId);
            const isOnline = status && (Date.now() - (status.updatedAt?.toMillis?.() || 0) < 60000);

            return (
              <motion.div
                key={d.uid}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8 space-y-6 relative group overflow-hidden"
              >
                <div className="absolute top-6 right-6 flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-slate-100 shadow-sm">
                  <div className={cn("w-1.5 h-1.5 rounded-full", isOnline ? "bg-green-500 animate-pulse" : "bg-slate-300")} />
                  <span className="text-[8px] font-black uppercase text-slate-500">
                    {isOnline ? "OPERATIONAL" : "DISCONNECTED"}
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Hardware Instance</p>
                  <div className="flex items-center gap-3">
                    <h4 className="text-xl font-black text-slate-900 font-mono tracking-normal">
                      {d.terminalId || "UNASSIGNED"}
                    </h4>
                    {!d.terminalId && (
                      <button
                        onClick={() => {
                          const newId = `DEVICE-${Math.floor(1000 + Math.random() * 9000)}`;
                          const newKey = Math.floor(1000 + Math.random() * 9000).toString();
                          firebaseService.updateDriverProfile(d.uid, {
                            terminalId: newId,
                            accessKey: newKey,
                            provisionStatus: "PROVISIONED"
                          })
                            .then(() => showToast("Terminal Provisioned", "info"))
                            .catch((err: any) => showToast(err.message, "error"));
                        }}
                        className="text-[8px] font-black bg-amber-500 text-slate-950 px-2 py-1 rounded-md uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                      >
                        Gen UID
                      </button>
                    )}
                  </div>
                </div>

                {status?.currentAdImage && (
                  <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner group/screen">
                    <img
                      src={getSafeUrl(status.currentAdImage)}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/screen:scale-110"
                      alt="Live Display"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/screen:opacity-100 transition-opacity flex items-end p-3">
                      <p className="text-[8px] font-black text-white uppercase tracking-widest">LIVE SCREEN MIRROR</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Access Key</p>
                    <p className="text-lg font-black text-amber-600 font-mono tracking-[0.2em]">{d.accessKey || "------"}</p>
                    {!d.accessKey && (
                      <p className="text-[7px] font-bold text-red-400 uppercase mt-1">Awaiting Provisioning</p>
                    )}
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                    <div className="flex flex-col">
                      <p className={cn(
                        "text-[10px] font-black uppercase",
                        d.provisionStatus === "ACTIVE" ? "text-green-600" : "text-amber-500"
                      )}>
                        {d.provisionStatus || "NOT ASSIGNED"}
                      </p>
                      <p className="text-[6px] font-bold text-slate-400 mt-0.5 leading-tight">
                        {d.provisionStatus === "ACTIVE" ? "Device Fully Synced" :
                         d.provisionStatus === "PROVISIONED" ? "Awaiting First Connection" :
                         "Pending Admin Provisioning"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-slate-200/50">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Driver</span>
                    <span className="text-[10px] font-black text-slate-900 uppercase italic">{d.name}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-200/50">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vehicle</span>
                    <span className="text-[10px] font-black text-slate-900 uppercase italic">{d.vNo || "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-200/50">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Campaign</span>
                    <span className="text-[10px] font-black text-amber-600 uppercase italic">
                      {campaigns.find(c => c.assignedDrivers?.includes(d.uid))?.title || "No Active Ads"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Last Sync</span>
                    <span className="text-[9px] font-black text-slate-500 uppercase">
                      {status?.updatedAt ? new Date(status.updatedAt.toMillis()).toLocaleString() : "Never"}
                    </span>
                  </div>
                </div>

                <div className="pt-4 flex gap-2">
                  <button
                    onClick={() => {
                      window.open(`/device-portal?terminalId=${d.terminalId}&accessKey=${d.accessKey}`, "_blank");
                    }}
                    className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl font-sans"
                  >
                    Open Portal
                  </button>
                  <button
                    onClick={async () => {
                      const loc = driverLocations.find(l => l.driverId === d.uid);
                      if (loc && loc.lat && loc.lng && loc.lat !== 0) {
                        setMapCenter([loc.lat, loc.lng]);
                        setMapZoom(16);
                        handleFetchDriverHistory(d.uid);
                        setActiveTab("MAP");
                      } else {
                        try {
                          showToast("No active fix. Fetching last known...", "info");
                          const logs = await firebaseService.getLocationLogs(d.uid);
                          const valid = logs.filter((l: any) => l.lat && l.lng && l.lat !== 0);
                          if (valid.length > 0) {
                            const last = valid[valid.length - 1];
                            setMapCenter([last.lat, last.lng]);
                            setMapZoom(16);
                            setSelectedDriverHistory(valid);
                            setActiveTab("MAP");
                          } else {
                            showToast("No telemetry data available.", "error");
                          }
                        } catch (e) {
                          showToast("Sync Error.", "error");
                        }
                      }
                    }}
                    className="p-4 bg-amber-500 text-slate-950 rounded-2xl hover:scale-105 transition-all shadow-lg shadow-amber-500/20"
                    title="Track on Map"
                  >
                    <MapPin size={16} />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Revoke access for Terminal ${d.terminalId}?`)) {
                        firebaseService.revokeTerminal(d.terminalId!, d.uid)
                          .then(() => showToast("Terminal credentials revoked.", "info"))
                          .catch((err: any) => showToast(err.message, "error"));
                      }
                    }}
                    className="p-4 border border-slate-200 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {d.terminalId && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setNetworkConfigTarget(d.terminalId)}
                      className="flex-1 py-3 bg-amber-55 text-amber-600 border border-amber-200 rounded-2xl text-[8px] font-black uppercase tracking-[0.2em] hover:bg-amber-100 transition-colors"
                    >
                      Config WiFi
                    </button>
                    {isOnline && (
                      <button
                        onClick={() => {
                          if (window.confirm("Restart this device remotely?")) {
                            const termRefId = terminals.find(t => t.id === d.terminalId)?.id || d.terminalId;
                            firebaseService.updateTerminalCommand(termRefId, "REBOOT")
                              .then(() => showToast("Reboot command sent.", "success"))
                              .catch((err: any) => showToast("Error: " + err.message, "error"));
                          }
                        }}
                        className="flex-1 py-3 bg-red-50 text-red-600 border border-red-200 rounded-2xl text-[8px] font-black uppercase tracking-[0.2em] hover:bg-red-100 transition-colors"
                      >
                        Restart
                      </button>
                    )}
                  </div>
                )}

                <div className="absolute -left-10 -bottom-10 w-24 h-24 bg-amber-500/10 blur-3xl rounded-full" />
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
