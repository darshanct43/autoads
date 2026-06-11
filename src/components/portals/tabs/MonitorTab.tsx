import React from "react";
import { motion } from "motion/react";
import { 
  Activity, 
  Smartphone, 
  Wifi, 
  Battery, 
  ShieldAlert, 
  Clock, 
  User, 
  Image, 
  Signal, 
  Zap, 
  HardDrive,
  Eye,
  Tv,
  Sliders
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Driver } from "@/services/firebaseService";
import { getSafeUrl } from "../AdminPortal";

interface MonitorTabProps {
  terminals: any[];
  liveStatus: any[];
  deviceScreens: any[];
  drivers: Driver[];
  setViewingUnit: (unit: any) => void;
  setNetworkConfigTarget: (terminalId: string | null) => void;
  startTVSession: (terminal: any) => void;
  handleRemoteCommand: (terminalId: string, cmd: string, params?: any) => void;
}

export const MonitorTab: React.FC<MonitorTabProps> = ({
  terminals = [],
  liveStatus = [],
  deviceScreens = [],
  drivers = [],
  setViewingUnit,
  setNetworkConfigTarget,
  startTVSession,
  handleRemoteCommand,
}) => {
  // Determine online helper
  const isTerminalOnline = (t: any) => {
    // 1. Check liveStatus collection
    const status = liveStatus.find(s => s.terminalId === t.id || s.id === t.id);
    if (status) {
      if (status.isOnline === true) return true;
      if (status.status === 'ONLINE' || status.status === 'ACTIVE' || status.status === 'STREAMING') return true;
      if (status.updatedAt) {
        const lastUpdate = status.updatedAt.toMillis ? status.updatedAt.toMillis() : new Date(status.updatedAt).getTime();
        if (Date.now() - lastUpdate < 60000) return true;
      }
    }
    // 2. Check terminal metrics/pulse
    if (t.metrics?.online === true || t.onlineStatus === 'ONLINE') return true;
    const ts = t.metrics?.lastHeartbeat || t.lastPulse;
    if (ts) {
      const lastUpdate = ts.toMillis ? ts.toMillis() : new Date(ts).getTime();
      if (Date.now() - lastUpdate < 60000) return true;
    }
    return false;
  };

  const getHeartbeatString = (t: any) => {
    // 1. Check liveStatus collection first
    const status = liveStatus.find(s => s.terminalId === t.id || s.id === t.id);
    let ts = status?.updatedAt || t.metrics?.lastHeartbeat || t.lastPulse;
    if (!ts) return "Never";
    const lastUpdate = ts.toMillis ? ts.toMillis() : new Date(ts).getTime();
    const diff = Math.floor((Date.now() - lastUpdate) / 1000);
    if (diff < 5) return "Just now";
    if (diff < 60) return `${diff}s ago`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
  };

  // Stats calculation
  const totalTerminals = terminals.length;
  const onlineCount = terminals.filter(isTerminalOnline).length;
  const offlineCount = Math.max(0, totalTerminals - onlineCount);
  const activeScreensCount = terminals.filter((t) => {
    const hasImage = t.metrics?.currentAdImage || liveStatus.find(s => s.terminalId === t.id || s.id === t.id)?.currentAdImage;
    return !!hasImage;
  }).length;

  return (
    <div className="space-y-8 pb-20">
      {/* 1. Live Statistics Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            label: "Live Units", 
            value: onlineCount, 
            sub: `${totalTerminals} Provisioned`, 
            icon: Activity, 
            color: "text-emerald-500", 
            badge: "Streaming Now" 
          },
          { 
            label: "Active Screens", 
            value: activeScreensCount, 
            sub: `${deviceScreens.length} Frame Buffers`, 
            icon: Smartphone, 
            color: "text-amber-500", 
            badge: "Sync Active" 
          },
          { 
            label: "Offline Units", 
            value: offlineCount, 
            sub: "Requires Attention", 
            icon: ShieldAlert, 
            color: "text-red-500", 
            badge: offlineCount > 0 ? "Check Signal" : "Zero Errors" 
          },
          { 
            label: "Pulse Spectrum", 
            value: `${totalTerminals > 0 ? Math.round((onlineCount / totalTerminals) * 100) : 0}%`, 
            sub: "Average Availability", 
            icon: Signal, 
            color: "text-blue-500", 
            badge: "Operational" 
          },
        ].map((stat) => (
          <div 
            key={stat.label} 
            className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
              <stat.icon className={stat.color} size={100} />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
                    <stat.icon className={stat.color} size={16} />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {stat.label}
                  </span>
                </div>
                <span className="text-[8px] font-bold px-2 py-1 bg-white/5 text-slate-400 rounded-full tracking-wider uppercase">
                  {stat.badge}
                </span>
              </div>
              <h4 className="text-4xl font-black text-white tracking-tight">{stat.value}</h4>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
                {stat.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 2. Terminal Live Directory Grid */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl space-y-8">
        <div>
          <h2 className="text-3xl font-black italic uppercase text-slate-900 leading-tight">Live Fleet Monitor</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 italic">
            REAL-TIME HARDWARE PING AND NETWORK RECOVERY DIRECTORY (READ-ONLY REPORT)
          </p>
        </div>

        {totalTerminals === 0 ? (
          <div className="text-center py-20 border border-dashed border-slate-100 rounded-3xl bg-slate-50">
            <Smartphone className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-xs font-black uppercase text-slate-400 tracking-wider">No Terminals Provisioned Yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {terminals.map((terminal) => {
              const online = isTerminalOnline(terminal);
              const driver = drivers.find((d) => d.id === terminal.driverId || d.terminalId === terminal.id);
              const heartbeat = getHeartbeatString(terminal);
              
              // Device metric info
              const battery = terminal.metrics?.batteryLevel ?? 100;
              const wifi = terminal.networkConfig?.wifiSSID || "Cell Network";
              const currentAd = terminal.metrics?.currentAdImage;
              const adType = terminal.metrics?.currentAdType || "IMAGE";

              return (
                <div 
                  key={terminal.id} 
                  className={cn(
                    "rounded-[2rem] border transition-all duration-300 overflow-hidden flex flex-col justify-between h-full bg-white",
                    online 
                      ? "border-emerald-100/60 shadow-lg shadow-emerald-500/5 hover:border-emerald-200" 
                      : "border-slate-100 shadow-md hover:border-slate-200 hover:shadow-lg"
                  )}
                >
                  {/* Card Header Status */}
                  <div className="p-6 pb-4 border-b border-slate-50 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono font-black text-slate-400 uppercase">
                        #{terminal.id.slice(0, 8).toUpperCase()}
                      </span>
                      <div className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                        online 
                          ? "bg-emerald-50 text-emerald-600 animate-pulse-slow" 
                          : "bg-slate-100 text-slate-400"
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", online ? "bg-emerald-500" : "bg-slate-400")} />
                        {online ? "Online" : "Offline"}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-650 shrink-0">
                        <User size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900 truncate uppercase tracking-tight">
                          {driver ? driver.name : "Unassigned Operator"}
                        </p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                          Code: {driver?.driverCode || "None"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Device Metrics & Screen Snapshot */}
                  <div className="px-6 py-4 space-y-4 flex-1">
                    {/* Live Preview Area */}
                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center group">
                      {currentAd ? (
                        <img 
                          src={getSafeUrl(currentAd)} 
                          alt="Device Canvas Preview" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="text-center p-4">
                          <Image className="mx-auto text-slate-850 mb-1" size={24} />
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                            No Active Campaign Canvas
                          </p>
                        </div>
                      )}
                      <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded-lg border border-slate-800 text-[7px] font-black text-white tracking-widest uppercase">
                        {adType} CAMPAIGN
                      </div>
                    </div>

                    {/* Meta Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                        <span className="flex items-center gap-1.5 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                          <Wifi size={10} className="text-slate-400" /> Network
                        </span>
                        <p className="text-[10px] font-black text-slate-800 truncate uppercase">
                          {wifi}
                        </p>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                        <span className="flex items-center gap-1.5 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                          <Battery size={10} className="text-slate-400" /> Battery
                        </span>
                        <p className="text-[10px] font-black text-slate-800">
                          {battery}%
                        </p>
                      </div>
                    </div>

                    {/* Action buttons section */}
                    <div className="grid grid-cols-3 gap-2.5 pt-4 border-t border-slate-100">
                      <button
                        onClick={() => setViewingUnit(terminal)}
                        className="py-2.5 px-3 bg-slate-50 hover:bg-amber-500/10 hover:text-amber-600 border border-slate-100 hover:border-amber-200 text-slate-600 rounded-xl transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
                        title="View Screen"
                      >
                        <Eye size={14} className="text-amber-500" />
                        <span className="text-[8px] font-black uppercase tracking-widest">View</span>
                      </button>

                      <button
                        onClick={() => startTVSession(terminal)}
                        className="py-2.5 px-3 bg-slate-50 hover:bg-blue-500/10 hover:text-blue-600 border border-slate-100 hover:border-blue-200 text-slate-600 rounded-xl transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
                        title="TeamViewer Session"
                      >
                        <Tv size={14} className="text-blue-500" />
                        <span className="text-[8px] font-black uppercase tracking-widest">Remote</span>
                      </button>

                      <button
                        onClick={() => setNetworkConfigTarget(terminal.id)}
                        className="py-2.5 px-3 bg-slate-50 hover:bg-emerald-500/10 hover:text-emerald-500 border border-slate-100 hover:border-emerald-200 text-slate-600 rounded-xl transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
                        title="Configure Network"
                      >
                        <Sliders size={14} className="text-emerald-500" />
                        <span className="text-[8px] font-black uppercase tracking-widest">Conf</span>
                      </button>
                    </div>
                  </div>

                  {/* Footer Heartbeat */}
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[9px] font-black uppercase text-slate-400 tracking-wider">
                    <span className="flex items-center gap-1 mt-0.5">
                      <Clock size={12} /> LAST PULSE:
                    </span>
                    <span className={cn(
                      "font-mono font-bold", 
                      online ? "text-emerald-600" : "text-slate-400"
                    )}>
                      {heartbeat}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
