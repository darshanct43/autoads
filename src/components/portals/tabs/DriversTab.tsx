import React, { useState, useEffect } from "react";
import { 
  Search, 
  Truck, 
  Phone, 
  User, 
  Tag, 
  Activity, 
  ShieldCheck, 
  RefreshCw, 
  Hash,
  X,
  Plus,
  Wallet,
  Cpu,
  FileText,
  MapPin,
  Eye
} from "lucide-react";
import { firebaseService, Driver } from "@/services/firebaseService";
import { cn } from "@/lib/utils";

interface DriversTabProps {
  isHQ?: boolean;
  isAdmin?: boolean;
  franchiseId?: string;
  setSelectedDriverForEarning?: (driver: any) => void;
  setShowEarningModal?: (show: boolean) => void;
  setSelectedDriverForProvision?: (driver: any) => void;
  setShowProvisionModal?: (show: boolean) => void;
  setSelectedDriverForAgreement?: (driver: any) => void;
  setSelectedDriverForDocs?: (driver: any) => void;
  setShowDocModal?: (show: boolean) => void;
  handleFetchDriverHistory?: (driverId: string) => void;
}

export const DriversTab: React.FC<DriversTabProps> = ({
  isHQ = false,
  isAdmin = false,
  franchiseId,
  setSelectedDriverForEarning,
  setShowEarningModal,
  setSelectedDriverForProvision,
  setShowProvisionModal,
  setSelectedDriverForAgreement,
  setSelectedDriverForDocs,
  setShowDocModal,
  handleFetchDriverHistory,
}) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Set up real-time listener
  useEffect(() => {
    setLoading(true);
    const unsubscribe = firebaseService.subscribeToDrivers((data) => {
      setDrivers(data);
      setLoading(false);
    }, franchiseId, isHQ);
    return () => unsubscribe();
  }, [franchiseId, isHQ]);

  // Manual fallback refresh
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      let data = await firebaseService.getDrivers();
      if (!isHQ && franchiseId) {
        data = data.filter((d: any) => d.franchiseId === franchiseId);
      }
      setDrivers(data);
    } catch (e) {
      console.error("[DriversTab] Manual Refresh Error:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter drivers based on search input
  const filteredDrivers = drivers.filter((driver) => {
    const term = searchTerm.toLowerCase();
    const name = (driver.name || "").toLowerCase();
    const phone = (driver.phone || "").toLowerCase();
    const vNo = (driver.vNo || driver.vehicleNumber || "").toLowerCase();
    const code = (driver.driverCode || (driver as any).code || driver.id || "").toLowerCase();
    
    return (
      name.includes(term) ||
      phone.includes(term) ||
      vNo.includes(term) ||
      code.includes(term)
    );
  });

  // Render high-contrast status badge
  const renderStatusBadge = (status: string | undefined) => {
    const s = (status || "pending_verification").toLowerCase();
    if (s === "active") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Active / Approved
        </span>
      );
    } else if (s === "pending_verification" || s === "pending") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 text-amber-600">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Pending Verification
        </span>
      );
    } else if (s === "disabled" || s === "blocked") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-500/10 border border-rose-500/20 text-rose-600">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Revoked / Suspended
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-500/10 border border-slate-500/20 text-slate-600">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          {s.replace("_", " ")}
        </span>
      );
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Upper Banner Status */}
      <div className="bg-slate-900 p-6 md:p-8 rounded-3xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute right-0 bottom-0 p-8 opacity-5 hover:opacity-10 transition-opacity">
          <Truck size={150} className="text-amber-500" />
        </div>
        
        <div className="relative z-10 space-y-2">
          <h2 className="text-3xl font-black italic uppercase text-amber-500 tracking-tight">
            Drivers Directory
          </h2>
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">
            Network Personnel & Node Assets Command
          </p>
        </div>

        <button
          onClick={handleManualRefresh}
          disabled={loading || isRefreshing}
          className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 text-amber-500 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border border-white/15"
        >
          <RefreshCw size={12} className={cn((loading || isRefreshing) && "animate-spin")} />
          Reload Database
        </button>
      </div>

      {/* Stats Counter Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {[
          { label: "Total Drivers Registry", value: drivers.length, icon: User, color: "text-amber-500 bg-amber-50" },
          { label: "Verified Node Power", value: drivers.filter(d => (d.status || "").toLowerCase() === "active").length, icon: ShieldCheck, color: "text-emerald-500 bg-emerald-50" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", stat.color)}>
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <h4 className="text-2xl font-black text-slate-900 mt-1">{stat.value}</h4>
            </div>
          </div>
        ))}
      </div>

      {/* Control / Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search by Driver Name, Code, Phone, or Vehicle Number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-11 pr-10 py-3.5 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all placeholder-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Showing {filteredDrivers.length} of {drivers.length} personnel nodes
        </div>
      </div>

      {/* Table & Mobile Responsive Layout */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4">
            <RefreshCw size={32} className="text-amber-500 animate-spin" />
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
              Connecting to Firestore Nodes...
            </p>
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div className="p-20 text-center">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">
              No personnel nodes found
            </p>
            <p className="text-xs text-slate-400 font-medium">
              Try updating your filter or query guidelines.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Grid Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest text-slate-400 italic">
                      Driver Personnel
                    </th>
                    <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest text-slate-400 italic">
                      Credential Identification
                    </th>
                    <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest text-slate-400 italic">
                      Communications
                    </th>
                    <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest text-slate-400 italic">
                      Status Node
                    </th>
                    <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest text-slate-400 italic text-right">
                      Operations
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDrivers.map((driver) => {
                    const drvCode = driver.driverCode || (driver as any).code || driver.id || "N/A";
                    return (
                      <tr key={driver.id || driver.uid} className="hover:bg-slate-50 transition-colors">
                        <td className="py-5 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 group hover:scale-105 transition-transform shrink-0">
                              <User size={18} />
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-900">
                                {driver.name || "Unknown Driver"}
                              </h4>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                {driver.email || "No email linked"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-5 px-6">
                          <div className="flex items-center gap-2">
                            <Tag size={12} className="text-amber-500" />
                            <span className="font-mono text-xs font-black bg-slate-50 border border-slate-100 px-2.5 py-1 text-slate-600 rounded-lg select-all">
                              {drvCode}
                            </span>
                          </div>
                        </td>
                        <td className="py-5 px-6">
                          <div className="flex items-center gap-1.5 text-slate-600 text-xs font-bold">
                            <Phone size={13} className="text-slate-400" />
                            <span>{driver.phone || "N/A"}</span>
                          </div>
                        </td>
                        <td className="py-5 px-6">
                          {renderStatusBadge(driver.status)}
                        </td>
                        <td className="py-5 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {setSelectedDriverForEarning && setShowEarningModal && isAdmin && (
                              <button
                                onClick={() => {
                                  setSelectedDriverForEarning(driver);
                                  setShowEarningModal(true);
                                }}
                                className="p-2.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-xl transition-all"
                                title="Wallet & Payouts (Admin Only)"
                              >
                                <Wallet size={14} />
                              </button>
                            )}
                            {setSelectedDriverForDocs && setShowDocModal && (
                              <button
                                onClick={() => {
                                  setSelectedDriverForDocs(driver);
                                  setShowDocModal(true);
                                }}
                                className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl transition-all"
                                title="Identity Documents Preview"
                              >
                                <Eye size={14} />
                              </button>
                            )}
                            {setSelectedDriverForAgreement && (
                              <button
                                onClick={() => setSelectedDriverForAgreement(driver)}
                                className="p-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-all"
                                title="Agreement Vault / KYC Docs"
                              >
                                <FileText size={14} />
                              </button>
                            )}
                            {setSelectedDriverForProvision && setShowProvisionModal && (
                              <button
                                onClick={() => {
                                  console.log("[DEBUG] DriversTab: Provision clicked for driver:", driver.id);
                                  setSelectedDriverForProvision(driver);
                                  setShowProvisionModal(true);
                                }}
                                className="p-2.5 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-xl transition-all"
                                title="Device Provisioning"
                              >
                                <Cpu size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Compact List Cards Grid Layout */}
            <div className="lg:hidden divide-y divide-slate-100">
              {filteredDrivers.map((driver) => {
                const drvCode = driver.driverCode || (driver as any).code || driver.id || "N/A";
                const vehicleNo = driver.vNo || driver.vehicleNumber || "N/A";
                return (
                  <div key={driver.id || driver.uid} className="p-5 space-y-4 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                          <User size={18} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900">
                            {driver.name || "Unknown Driver"}
                          </h4>
                          <span className="font-mono text-[10px] bg-slate-50 border border-slate-100 px-2 py-0.5 text-slate-500 rounded select-all mt-1 inline-block">
                            ID: {drvCode}
                          </span>
                        </div>
                      </div>
                      <div>
                        {renderStatusBadge(driver.status)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                          Phone Contacts
                        </span>
                        <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
                          <Phone size={12} className="text-slate-400 shrink-0" />
                          <span>{driver.phone || "N/A"}</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                          Credential ID
                        </span>
                        <div className="flex items-center gap-1 text-[10px] font-black text-slate-900 tracking-wider">
                          <Tag size={12} className="text-amber-500 shrink-0" />
                          <span>{drvCode}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                      {setSelectedDriverForDocs && setShowDocModal && (
                        <button
                          onClick={() => {
                            setSelectedDriverForDocs(driver);
                            setShowDocModal(true);
                          }}
                          className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all"
                        >
                          <Eye size={12} />
                          Preview
                        </button>
                      )}
                      {setSelectedDriverForAgreement && (
                        <button
                          onClick={() => setSelectedDriverForAgreement(driver)}
                          className="py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all"
                        >
                          <FileText size={12} />
                          KYC Vault
                        </button>
                      )}
                      {setSelectedDriverForProvision && setShowProvisionModal && (
                        <button
                          onClick={() => {
                            setSelectedDriverForProvision(driver);
                            setShowProvisionModal(true);
                          }}
                          className="py-2.5 px-3 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all"
                        >
                          <Cpu size={12} />
                          Provision
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
