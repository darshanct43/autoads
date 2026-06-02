import React from "react";
import { motion } from "motion/react";
import { Search, RefreshCw, MapPin, Trash2, ShieldCheck, Monitor, IndianRupee, Activity, Link as LinkIcon } from "lucide-react";
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
  React.useEffect(() => {
    console.log("TERMINAL COMPONENT LOADED");
  }, []);
    const [selectedDevice, setSelectedDevice] = React.useState<Driver | null>(null);

    return (
        <div className="space-y-8 pb-20 w-full">
            {selectedDevice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black uppercase tracking-tight">Device Details: {selectedDevice.terminalId}</h3>
                            <button onClick={() => setSelectedDevice(null)} className="text-slate-400 hover:text-slate-900 font-black">CLOSE</button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase">Driver</p>
                                <p className="font-bold">{selectedDevice.name}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase">Vehicle</p>
                                <p className="font-bold">{selectedDevice.vNo || "N/A"}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase">Campaign</p>
                                    <p className="font-bold text-amber-600">
                                        {campaigns.find(c => c.assignedDrivers?.includes(selectedDevice.uid))?.title || "No Active Ads"}
                                    </p>
                                </div>
                                <div>
                                     <p className="text-[10px] font-black text-slate-400 uppercase">Status</p>
                                     <p className="font-bold text-green-600">{selectedDevice.provisionStatus}</p>
                                </div>
                            </div>
                            <button 
                                onClick={async () => {
                                    if (!selectedDevice.terminalId) return;
                                    const deviceRecord = await firebaseService.getDevice(selectedDevice.terminalId);
                                    if (deviceRecord?.remoteAccessUrl) {
                                        window.open(deviceRecord.remoteAccessUrl, "_blank");
                                    } else {
                                        showToast("Remote access not configured", "error");
                                    }
                                }}
                                className="w-full py-3 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[12px] hover:bg-slate-800"
                            >
                                Connect Remote
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
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


        <div className="overflow-x-auto">
          <table className="w-full text-left text-[10px] border-collapse">
            <thead>
                <tr className="text-slate-400 uppercase font-black tracking-widest border-b border-slate-100">
                    <th className="p-3">Device ID</th>
                    <th className="p-3">Driver</th>
                    <th className="p-3">Vehicle</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Battery %</th>
                    <th className="p-3">Signal</th>
                    <th className="p-3">Last Sync</th>
                    <th className="p-3">Campaign</th>
                    <th className="p-3 text-right">Actions</th>
                </tr>
            </thead>
            <tbody>
                {drivers.filter(d => (d.terminalId || "").toUpperCase().includes(searchTerm.toUpperCase())).map((d) => {
                    const status = liveStatus.find(s => s.terminalId === d.terminalId);
                    const isOnline = status && (Date.now() - (status.updatedAt?.toMillis?.() || 0) < 60000);
                    const location = driverLocations.find(l => l.driverId === d.uid);
                    
                    return (
                        <tr key={d.uid} className="border-b border-slate-50 hover:bg-slate-50 text-[10px] text-slate-600">
                            <td className="p-3 font-mono font-bold text-slate-900">{d.terminalId || "---"}</td>
                            <td className="p-3 font-black text-slate-900 uppercase italic">{d.name}</td>
                            <td className="p-3 font-black text-slate-900 uppercase italic">{d.vNo || "N/A"}</td>
                            <td className="p-3">
                                <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-2", isOnline ? "bg-green-500" : "bg-slate-300")} />
                                {isOnline ? "Online" : "Offline"}
                            </td>
                            <td className="p-3">{status?.battery || "N/A"}%</td>
                            <td className="p-3">{status?.signal || "N/A"}</td>
                            <td className="p-3">{status?.updatedAt ? new Date(status.updatedAt.toMillis()).toLocaleTimeString() : "Never"}</td>
                            <td className="p-3 text-amber-600 font-bold">
                                {campaigns.find(c => c.assignedDrivers?.includes(d.uid))?.title || "No Active Ads"}
                            </td>
                            <td className="p-3 text-right flex gap-3 justify-end">
                                <button 
                                    disabled={!d.terminalId}
                                    onClick={() => setSelectedDevice(d)} 
                                    className={cn("text-slate-500 hover:text-amber-500", !d.terminalId && "opacity-30 cursor-not-allowed")}
                                    title={!d.terminalId ? "No Device ID" : "Device Details"}
                                >
                                    <Monitor size={14} />
                                </button>
                                <button 
                                    disabled={!d.terminalId}
                                    onClick={async () => {
                                        if (!d.terminalId) return;
                                        const device = await firebaseService.getDevice(d.terminalId);
                                        
                                        console.log("Debug device:", { terminalId: d.terminalId, remoteAgentId: device?.remoteAgentId, remoteAccessUrl: device?.remoteAccessUrl });

                                        if (!device) {
                                            showToast("Device record not found", "error");
                                            return;
                                        }
                                        if (!device.remoteAgentId) {
                                            showToast("Missing Remote Agent ID", "error");
                                            return;
                                        }
                                        if (!device.remoteAccessUrl) {
                                            showToast("Missing Remote URL", "error");
                                            return;
                                        }
                                        
                                        window.open(device.remoteAccessUrl, "_blank");
                                    }} 
                                    className={cn("text-slate-500 hover:text-amber-500", !d.terminalId && "opacity-30 cursor-not-allowed")}
                                    title={!d.terminalId ? "No Device ID" : "Remote Connect"}
                                >
                                    <LinkIcon size={14} />
                                </button>
                                <button 
                                    disabled={!location?.lat || !location?.lng}
                                    onClick={() => {
                                        if (location?.lat && location?.lng) {
                                            setMapCenter([location.lat, location.lng]);
                                            setMapZoom(16);
                                            handleFetchDriverHistory(d.uid);                
                                            setActiveTab("MAP");
                                        }
                                    }}
                                    className={cn("text-slate-500 hover:text-amber-500", (!location?.lat || !location?.lng) && "opacity-30 cursor-not-allowed")}
                                    title={(!location?.lat || !location?.lng) ? "No Location" : "View on Map"}
                                >
                                    <MapPin size={14} />
                                </button>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
