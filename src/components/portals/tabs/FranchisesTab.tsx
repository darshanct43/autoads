import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Shield, 
  Building2, 
  Globe, 
  Search, 
  Settings, 
  Save, 
  Activity, 
  Grid, 
  PlusCircle, 
  Check, 
  MapPin, 
  Edit3, 
  TrendingUp, 
  Cpu, 
  Users,
  Mail,
  Copy,
  Plus,
  Trash2,
  ExternalLink
} from "lucide-react";
import { firebaseService } from "@/services/firebaseService";
import { db } from "@/lib/firebase";
import { doc, deleteDoc } from "firebase/firestore";

interface FranchisesTabProps {
  setActiveTab: (tab: string) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export const FranchisesTab: React.FC<FranchisesTabProps> = ({ setActiveTab, showToast }) => {
  const [franchises, setFranchises] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [cityFilter, setCityFilter] = useState<string>("ALL");

  // Selection states for editing
  const [editingFranchise, setEditingFranchise] = useState<any | null>(null);
  const [editingCity, setEditingCity] = useState<any | null>(null);
  const [showAddCityModal, setShowAddCityModal] = useState(false);
  const [newCity, setNewCity] = useState({ id: "", name: "", description: "" });

  const [activeSubView, setActiveSubView] = useState<'REGISTRY' | 'INVITATIONS'>('REGISTRY');
  const [showWizardModal, setShowWizardModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState({
    cityId: "",
    franchiseId: "",
    ownerName: "",
    ownerEmail: "",
    revenueModel: "50/50 Split",
    totalDevices: 0,
    totalDrivers: 0,
  });
  const [generatedInviteCode, setGeneratedInviteCode] = useState("");

  // Subscriptions on mount
  useEffect(() => {
    setLoading(true);
    const unsubFranchises = firebaseService.subscribeToFranchises((data) => {
      setFranchises(data);
      setLoading(false);
    });

    const unsubCities = firebaseService.subscribeToCities((data) => {
      setCities(data);
    });

    const unsubInvitations = firebaseService.subscribeToInvitations((data) => {
      setInvitations(data);
    });

    return () => {
      unsubFranchises();
      unsubCities();
      unsubInvitations();
    };
  }, []);

  // Pre-seed wizard default city and franchiseId
  useEffect(() => {
    if (cities.length > 0 && !wizardData.cityId) {
      const defaultCity = cities[0].id;
      setWizardData(prev => ({
        ...prev,
        cityId: defaultCity,
        franchiseId: `FRAN-${defaultCity.toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`
      }));
    }
  }, [cities, wizardData.cityId]);

  const handleCityChangeInWizard = (cityId: string) => {
    setWizardData(prev => ({
      ...prev,
      cityId,
      franchiseId: `FRAN-${cityId.toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`
    }));
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wizardData.franchiseId || !wizardData.ownerEmail || !wizardData.ownerName) {
      showToast("Please fill all required representative coordinates", "error");
      return;
    }

    // Check if franchise ID already exists in actual active registry
    if (franchises.some(f => f.id.toUpperCase() === wizardData.franchiseId.toUpperCase() && f.status === 'ACTIVE')) {
      showToast("A Franchise with this exact ID already exists in active register.", "error");
      return;
    }

    try {
      // 1. Generate unique key code, e.g. INV-BLR-83A
      const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const code = `INV-${wizardData.cityId.substring(0, 3).toUpperCase()}-${suffix}`;

      // 2. Build secure invitation object
      const selectedCity = cities.find(c => c.id === wizardData.cityId);
      const invitePayload = {
        id: code,
        franchiseId: wizardData.franchiseId.trim().toUpperCase(),
        cityId: wizardData.cityId,
        cityName: selectedCity ? selectedCity.name : wizardData.cityId,
        ownerName: wizardData.ownerName.trim(),
        ownerEmail: wizardData.ownerEmail.trim().toLowerCase(),
        status: "PENDING",
        role: "FRANCHISE_OWNER",
        specialization: "FRANCHISE_OWNER",
        revenueModel: wizardData.revenueModel,
        totalDevices: wizardData.totalDevices || 0,
        totalDrivers: wizardData.totalDrivers || 0,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days expiration
      };

      // 3. Save invitation to firebase
      await firebaseService.saveInvitation(invitePayload);

      // 4. Create PENDING skeleton draft franchise record for immediate dashboard projection
      await firebaseService.saveFranchise({
        id: invitePayload.franchiseId,
        cityId: invitePayload.cityId,
        cityName: invitePayload.cityName,
        ownerName: invitePayload.ownerName,
        ownerEmail: invitePayload.ownerEmail,
        status: "PENDING",
        revenueModel: invitePayload.revenueModel,
        totalDevices: invitePayload.totalDevices,
        totalDrivers: invitePayload.totalDrivers,
        createdAt: invitePayload.createdAt,
      });

      setGeneratedInviteCode(code);
      setWizardStep(3); // Advance to summary copy step
      showToast(`Onboarding invite code ${code} initialized!`, "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to launch owner onboarding.", "error");
    }
  };

  const handleDeleteInvitation = async (id: string) => {
    if (!window.confirm(`Are you absolutely sure you want to revoke and delete invitation ${id}?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, "invitations", id));
      showToast(`Invitation ${id} deleted successfully.`, "success");
    } catch (err: any) {
      showToast(`Failed to delete invitation.`, "error");
    }
  };

  const handleUpdateFranchise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFranchise) return;

    try {
      // Find proper city name if cityId changed
      const selectedCity = cities.find(c => c.id === editingFranchise.cityId);
      const updatedFr = {
        ...editingFranchise,
        cityName: selectedCity ? selectedCity.name : editingFranchise.cityName,
        totalDevices: parseInt(String(editingFranchise.totalDevices)) || 0,
        totalDrivers: parseInt(String(editingFranchise.totalDrivers)) || 0,
      };

      await firebaseService.saveFranchise(updatedFr);
      showToast(`Franchise config ${editingFranchise.id} updated successfully!`, "success");
      setEditingFranchise(null);
    } catch (err: any) {
      showToast(`Failed to update franchise parameters.`, "error");
    }
  };

  const handleSaveCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCity) return;

    try {
      await firebaseService.saveCity(editingCity);
      showToast(`City configuration ${editingCity.id} updated!`, "success");
      setEditingCity(null);
    } catch (err: any) {
      showToast(`Failed to update city config.`, "error");
    }
  };

  const handleCreateCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCity.id || !newCity.name) {
      showToast("City ID and Name are required.", "error");
      return;
    }

    const normalizedId = newCity.id.trim().toLowerCase().replace(/\s+/g, '-');
    try {
      await firebaseService.saveCity({
        id: normalizedId,
        name: newCity.name.trim(),
        description: newCity.description.trim()
      });
      showToast(`Operational city region "${newCity.name}" launched successfully!`, "success");
      setNewCity({ id: "", name: "", description: "" });
      setShowAddCityModal(false);
    } catch (err: any) {
      showToast(`Failed to create operating city.`, "error");
    }
  };

  // Stats derivation
  const totalDriversCount = franchises.reduce((acc, f) => acc + (f.totalDrivers || 0), 0);
  const totalDevicesCount = franchises.reduce((acc, f) => acc + (f.totalDevices || 0), 0);
  const activeFranchisesCount = franchises.filter(f => f.status === "ACTIVE").length;

  const filteredFranchises = franchises.filter(f => {
    const matchesSearch = 
      f.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.ownerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.cityName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "ALL" || f.status === statusFilter;
    const matchesCity = cityFilter === "ALL" || f.cityId === cityFilter;

    return matchesSearch && matchesStatus && matchesCity;
  });

  return (
    <div className="fixed inset-0 left-0 md:left-20 z-20 bg-[#f8fafc] p-6 md:p-10 overflow-y-auto min-h-[100dvh] pb-32 custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Title Header Bar */}
        <div className="bg-slate-900 p-6 md:p-8 rounded-3xl text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[radial-gradient(circle_at_100%_0%,rgba(245,158,11,0.08),transparent)] border border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="text-amber-500" size={24} />
              <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tight text-white">
                Franchise <span className="text-amber-500">Foundation</span>
              </h2>
            </div>
            <p className="text-[10px] font-mono uppercase text-slate-400 mt-1">
              Multi-city collection orchestration and status audit registry
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setWizardStep(1);
                if (cities.length > 0) {
                  const defaultCity = cities[0].id;
                  setWizardData({
                    cityId: defaultCity,
                    franchiseId: `FRAN-${defaultCity.toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
                    ownerName: "",
                    ownerEmail: "",
                    revenueModel: "50/50 Split",
                    totalDevices: 0,
                    totalDrivers: 0,
                  });
                }
                setShowWizardModal(true);
              }}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer font-sans"
            >
              <Mail size={12} className="text-amber-500" />
              Invite Owner
            </button>
            <button 
              onClick={() => setShowAddCityModal(true)}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 cursor-pointer font-sans"
            >
              <PlusCircle size={14} />
              Launch City
            </button>
            <button
              onClick={() => setActiveTab("DASHBOARD")}
              className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-slate-300 hover:text-white"
              title="Return to Main Overview"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Audit Metric Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/15 rounded-2xl flex items-center justify-center text-amber-500 shadow-sm">
              <Building2 size={24} />
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase text-slate-400 tracking-widest">Active Franchises</p>
              <h4 className="text-2xl font-black text-slate-900 font-mono mt-0.5">{activeFranchisesCount} <span className="text-xs text-slate-400">/ {franchises.length}</span></h4>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/15 rounded-2xl flex items-center justify-center text-blue-500 shadow-sm">
              <Globe size={24} />
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase text-slate-400 tracking-widest">Operational Cities</p>
              <h4 className="text-2xl font-black text-slate-900 font-mono mt-0.5">{cities.length}</h4>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/15 rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm">
              <Cpu size={24} />
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase text-slate-400 tracking-widest">Network Screen Units</p>
              <h4 className="text-2xl font-black text-slate-900 font-mono mt-0.5">{totalDevicesCount} Units</h4>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-500/15 rounded-2xl flex items-center justify-center text-purple-500 shadow-sm">
              <Users size={24} />
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase text-slate-400 tracking-widest">Registered Drivers</p>
              <h4 className="text-2xl font-black text-slate-900 font-mono mt-0.5">{totalDriversCount}</h4>
            </div>
          </div>
        </div>

        {/* Central Layout Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Franchise Registry Section */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Dual Sub-Tabs Selector */}
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                onClick={() => { setActiveSubView('REGISTRY'); setSearchTerm(''); }}
                className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider text-center transition-all rounded-xl font-sans cursor-pointer ${
                  activeSubView === 'REGISTRY' ? 'bg-white text-slate-950 shadow-sm animate-fade-in' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Franchise Registry ({franchises.length})
              </button>
              <button
                onClick={() => { setActiveSubView('INVITATIONS'); setSearchTerm(''); }}
                className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider text-center transition-all rounded-xl font-sans cursor-pointer ${
                  activeSubView === 'INVITATIONS' ? 'bg-white text-slate-950 shadow-sm animate-fade-in' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Pending Owner Invitations ({invitations.length})
              </button>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              
              {activeSubView === 'REGISTRY' ? (
                <>
                  {/* Filter controls */}
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full sm:max-w-xs">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <Search size={16} />
                      </span>
                      <input
                        type="text"
                        placeholder="Search Franchise ID, Owner or City..."
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 pl-10 pr-4 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-sans"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    
                    <div className="flex w-full sm:w-auto items-center gap-3 justify-end">
                      <select
                        className="bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-[10px] font-black uppercase tracking-wider text-slate-500 outline-none focus:ring-2 focus:ring-amber-500/20 font-sans"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="ALL">All Status</option>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="PENDING">PENDING</option>
                        <option value="DISABLED">DISABLED</option>
                      </select>

                      <select
                        className="bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-[10px] font-black uppercase tracking-wider text-slate-500 outline-none focus:ring-2 focus:ring-amber-500/20 font-sans"
                        value={cityFilter}
                        onChange={(e) => setCityFilter(e.target.value)}
                      >
                        <option value="ALL">All Cities</option>
                        {cities.map((city) => (
                          <option key={city.id} value={city.id}>{city.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Franchise Cards Grid */}
                  {loading ? (
                    <div className="py-20 text-center text-sm font-semibold text-slate-400 font-mono text-xs uppercase tracking-widest">Loading franchise telemetry...</div>
                  ) : filteredFranchises.length === 0 ? (
                    <div className="py-20 text-center text-sm font-semibold text-slate-400 font-mono text-xs uppercase tracking-widest">No franchises found matching queries.</div>
                  ) : (
                    <div className="space-y-4">
                      {filteredFranchises.map((item) => (
                        <div 
                          key={item.id} 
                          className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100/80 hover:border-slate-200 hover:bg-slate-50 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono bg-slate-900 text-white px-2 py-0.5 rounded-md font-semibold">{item.id}</span>
                              <span className="text-xs font-mono text-slate-400">@{item.cityId}</span>
                              <span className={`text-[8px] font-mono px-2 py-0.5 rounded-full font-black tracking-wider uppercase ${
                                item.status === 'ACTIVE' 
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/10' 
                                  : item.status === 'DISABLED'
                                  ? 'bg-red-500/10 text-red-500 border border-red-500/10'
                                  : 'bg-amber-500/10 text-amber-500 border border-amber-500/10'
                              }`}>
                                {item.status}
                              </span>
                            </div>
                            <h4 className="text-sm font-black text-slate-800 uppercase italic mt-1 font-sans">{item.ownerName}</h4>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-bold text-slate-500 font-mono">
                              <span>Email: {item.ownerEmail}</span>
                              <span>Split: <strong className="text-amber-500">{item.revenueModel}</strong></span>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                            <div className="flex items-center gap-4 font-mono text-xs">
                              <div className="text-right">
                                <span className="text-[9px] font-black text-slate-400 uppercase block">Screens</span>
                                <span className="font-extrabold text-slate-700">{item.totalDevices} Devices</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[9px] font-black text-slate-400 uppercase block">Staff</span>
                                <span className="font-extrabold text-slate-700">{item.totalDrivers} Drivers</span>
                              </div>
                            </div>

                            <button 
                              onClick={() => setEditingFranchise(item)}
                              className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-amber-500 hover:border-amber-300 transition-all cursor-pointer shadow-sm"
                              title="Audit Franchise Config"
                            >
                              <Edit3 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Invitation Search header */}
                  <div className="flex items-center justify-between">
                    <div className="relative w-full max-w-xs">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <Search size={16} />
                      </span>
                      <input
                        type="text"
                        placeholder="Search Dispatched Invites..."
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-sans"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <span className="text-[9px] font-mono uppercase text-slate-400 font-extrabold tracking-widest hidden sm:inline-block">Buffered Ledger</span>
                  </div>

                  {/* Invitation lists */}
                  {invitations.length === 0 ? (
                    <div className="py-20 text-center text-xs font-semibold text-slate-400 font-mono uppercase tracking-widest">No dispatched invitations found.</div>
                  ) : (
                    <div className="space-y-4">
                      {invitations
                        .filter(invite => 
                          invite.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          invite.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          invite.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          invite.cityName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          invite.franchiseId.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((invite) => {
                          const isExpired = invite.expiresAt && new Date(invite.expiresAt) < new Date();
                          const finalStatus = isExpired && invite.status === "PENDING" ? "EXPIRED" : invite.status;

                          return (
                            <div 
                              key={invite.id} 
                              className="p-5 bg-slate-50/70 rounded-2xl border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-200 transition-all"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-mono bg-slate-900 text-amber-400 px-2.5 py-0.5 rounded font-black tracking-wider uppercase select-all">{invite.id}</span>
                                  <span className={`text-[8px] font-mono px-2 py-0.5 rounded-full font-black tracking-widest uppercase ${
                                    finalStatus === 'CLAIMED' 
                                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/10' 
                                      : finalStatus === 'EXPIRED'
                                      ? 'bg-red-500/10 text-red-500 border border-red-500/10'
                                      : 'bg-amber-500/10 text-amber-500 border border-amber-500/10'
                                  }`}>
                                    {finalStatus}
                                  </span>
                                </div>
                                <h4 className="text-sm font-black text-slate-800 uppercase italic mt-1 font-sans">{invite.ownerName}</h4>
                                <div className="flex flex-col gap-1 text-[10px] font-semibold text-slate-500 font-mono leading-relaxed">
                                  <span>Email: <strong className="text-slate-700 select-all font-bold lowercase">{invite.ownerEmail}</strong></span>
                                  <div className="flex flex-wrap items-center gap-x-4">
                                    <span>Citadel: <strong className="uppercase text-slate-600 font-sans">{invite.cityName}</strong></span>
                                    <span>Terms: <strong className="text-slate-600">{invite.revenueModel}</strong></span>
                                    <span>For node: <strong className="text-slate-800 font-sans bg-slate-200/50 px-1 rounded">{invite.franchiseId}</strong></span>
                                  </div>
                                  <span className="text-[9px] text-slate-400">Expires: {new Date(invite.expiresAt).toLocaleDateString()}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                                {finalStatus === 'PENDING' && (
                                  <button
                                    onClick={() => {
                                      const claimLink = `${window.location.origin}/#claim?code=${invite.id}`;
                                      navigator.clipboard.writeText(claimLink);
                                      showToast("Copied secure claim link to clipboard!", "success");
                                    }}
                                    className="px-3 py-2 bg-white hover:bg-amber-500 hover:text-slate-950 border border-slate-200 hover:border-amber-400 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer text-slate-600 font-sans shadow-sm"
                                    title="Copy claim link"
                                  >
                                    <Copy size={11} />
                                    Copy Link
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteInvitation(invite.id)}
                                  className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-red-500 hover:border-red-200 transition-all cursor-pointer shadow-sm"
                                  title="Revoke / Delete invitation record"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </>
              )}

            </div>
          </div>

          {/* Sidebar Area: Operating Cities Config */}
          <div className="space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div>
                <h3 className="text-md font-black text-slate-900 uppercase italic tracking-tight flex items-center gap-2">
                  <MapPin size={16} className="text-amber-500" />
                  Operational Citadels
                </h3>
                <p className="text-[9px] font-mono uppercase text-slate-400 mt-1">Multi-city coverage coordinates</p>
              </div>

              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {cities.map((city) => (
                  <div key={city.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-800 uppercase italic">{city.name}</span>
                        <span className="text-[8px] font-mono bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-semibold">{city.id}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold leading-normal">{city.description}</p>
                    </div>
                    <button 
                      onClick={() => setEditingCity(city)}
                      className="p-1.5 bg-white border rounded hover:text-amber-500 hover:border-amber-500/30 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                    >
                      <Settings size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Edit Franchise Audit Config modal */}
      <AnimatePresence>
        {editingFranchise && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setEditingFranchise(null)}></div>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-lg relative z-10 space-y-6 border border-slate-100/40 shadow-2xl"
            >
              <div>
                <span className="text-[9px] font-mono bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-black tracking-widest uppercase">Franchise Override</span>
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 mt-2">Audit Parameter Controls</h3>
                <p className="text-[10px] font-mono text-slate-400">Configure parameters for {editingFranchise.id}</p>
              </div>

              <form onSubmit={handleUpdateFranchise} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono uppercase text-slate-400">Owner Name</label>
                    <input 
                      type="text" 
                      required
                      className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800"
                      value={editingFranchise.ownerName || ""}
                      onChange={(e) => setEditingFranchise({ ...editingFranchise, ownerName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono uppercase text-slate-400">Owner Email</label>
                    <input 
                      type="email" 
                      required
                      className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800"
                      value={editingFranchise.ownerEmail || ""}
                      onChange={(e) => setEditingFranchise({ ...editingFranchise, ownerEmail: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono uppercase text-slate-400">Operational Region (City)</label>
                    <select
                      className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800"
                      value={editingFranchise.cityId || ""}
                      onChange={(e) => setEditingFranchise({ ...editingFranchise, cityId: e.target.value })}
                    >
                      {cities.map((city) => (
                        <option key={city.id} value={city.id}>{city.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono uppercase text-slate-400">Revenue Split Model</label>
                    <input 
                      type="text" 
                      required
                      className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800"
                      value={editingFranchise.revenueModel || ""}
                      onChange={(e) => setEditingFranchise({ ...editingFranchise, revenueModel: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono uppercase text-slate-400">Total Assigned Devices</label>
                    <input 
                      type="number" 
                      className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800"
                      value={editingFranchise.totalDevices ?? 0}
                      onChange={(e) => setEditingFranchise({ ...editingFranchise, totalDevices: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono uppercase text-slate-400">Total Drivers</label>
                    <input 
                      type="number" 
                      className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800"
                      value={editingFranchise.totalDrivers ?? 0}
                      onChange={(e) => setEditingFranchise({ ...editingFranchise, totalDrivers: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-mono uppercase text-slate-400">Status</label>
                  <select 
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800"
                    value={editingFranchise.status}
                    onChange={(e) => setEditingFranchise({ ...editingFranchise, status: e.target.value })}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PENDING">PENDING</option>
                    <option value="DISABLED">DISABLED</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setEditingFranchise(null)}
                    className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider text-center"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    <Save size={12} />
                    Commit Override
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit City Modal */}
      <AnimatePresence>
        {editingCity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setEditingCity(null)}></div>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-sm relative z-10 space-y-4"
            >
              <div>
                <span className="text-[9px] font-mono bg-blue-500 text-white px-2 py-0.5 rounded font-black tracking-widest uppercase text-center">City Override</span>
                <h3 className="text-xl font-black uppercase text-slate-900 mt-2">Adjust City Attributes</h3>
                <p className="text-[10px] font-mono text-slate-400">Settings for regional hub "{editingCity.id}"</p>
              </div>

              <form onSubmit={handleSaveCity} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-mono uppercase text-slate-400">City Name</label>
                  <input 
                    type="text" 
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                    value={editingCity.name || ""}
                    onChange={(e) => setEditingCity({ ...editingCity, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono uppercase text-slate-400">Description</label>
                  <textarea 
                    rows={3}
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                    value={editingCity.description || ""}
                    onChange={(e) => setEditingCity({ ...editingCity, description: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setEditingCity(null)}
                    className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl text-[10px] font-black uppercase text-center"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-wider"
                  >
                    Save Config
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Launch New City Modal */}
      <AnimatePresence>
        {showAddCityModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowAddCityModal(false)}></div>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-sm relative z-10 space-y-4"
            >
              <div>
                <span className="text-[9px] font-mono bg-emerald-500 text-white px-2 py-0.5 rounded font-black tracking-widest uppercase text-center">New Citadel</span>
                <h3 className="text-xl font-black uppercase text-slate-900 mt-2">Scale Operating Hub</h3>
                <p className="text-[10px] font-mono text-slate-400">Deploy a new operating region collection</p>
              </div>

              <form onSubmit={handleCreateCity} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-mono uppercase text-slate-400">City ID (e.g. "hublive")</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. hublive"
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                    value={newCity.id}
                    onChange={(e) => setNewCity({ ...newCity, id: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono uppercase text-slate-400">City Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Bangalore"
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                    value={newCity.name}
                    onChange={(e) => setNewCity({ ...newCity, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono uppercase text-slate-400">Description</label>
                  <textarea 
                    rows={3}
                    placeholder="Region specifications"
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                    value={newCity.description}
                    onChange={(e) => setNewCity({ ...newCity, description: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowAddCityModal(false)}
                    className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl text-[10px] font-black uppercase text-center"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-wider"
                  >
                    Deploy Region
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Franchise Wizard Modal */}
      <AnimatePresence>
        {showWizardModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md" onClick={() => setShowWizardModal(false)}></div>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-sm relative z-10 space-y-6 max-h-[90vh] overflow-y-auto border border-slate-100 shadow-2xl custom-scrollbar"
            >
              {/* Header section with stepper */}
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[8px] font-mono bg-amber-500 text-slate-500 px-2.5 py-1 rounded font-black tracking-widest uppercase text-slate-950">
                    Onboarding Protocol
                  </span>
                  <h3 className="text-xl font-bold uppercase tracking-tight text-slate-900 mt-2 font-sans">
                    Franchise Setup Wizard
                  </h3>
                  <p className="text-[10px] font-mono text-slate-400 mt-1 select-none">
                    Phase 1: Owner Invitation (Step {wizardStep}/3)
                  </p>
                </div>
                <button 
                  onClick={() => setShowWizardModal(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Progress Indicator line */}
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((stepNum) => (
                  <div key={stepNum} className="flex-1 flex items-center gap-1.5">
                    <div className={`h-1 flex-1 rounded-full transition-all ${
                      wizardStep >= stepNum ? "bg-amber-500" : "bg-slate-100"
                    }`} />
                    <span className={`text-[9px] font-mono font-bold ${
                      wizardStep === stepNum ? "text-amber-500" : "text-slate-300"
                    }`}>
                      0{stepNum}
                    </span>
                  </div>
                ))}
              </div>

              <form onSubmit={handleCreateInvitation} className="space-y-4">
                {/* STEP 1: Operational Base Hub & ID */}
                {wizardStep === 1 && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono uppercase text-slate-400 font-extrabold">1. Operating Citadel</label>
                      <select 
                        required
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        value={wizardData.cityId}
                        onChange={(e) => handleCityChangeInWizard(e.target.value)}
                      >
                        {cities.length === 0 ? (
                          <option value="">No Active Citadels Launched</option>
                        ) : (
                          cities.map(c => <option key={c.id} value={c.id}>{c.name} (@{c.id})</option>)
                        )}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-mono uppercase text-slate-400 font-extrabold flex justify-between">
                        <span>2. Unique Franchise ID Node</span>
                        <span className="text-amber-500 lowercase">must be unique key</span>
                      </label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. FRAN-BLR-001"
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20 uppercase animate-fade-in"
                        value={wizardData.franchiseId}
                        onChange={(e) => setWizardData({ ...wizardData, franchiseId: e.target.value.toUpperCase() })}
                      />
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-[10px] text-slate-500 leading-relaxed font-sans">
                      <strong className="text-slate-850 block mb-0.5">Automated Suggestion</strong>
                      You may customize this Node ID before dispatching the invitation block. Standard identifiers keep audit lines robust and trackable.
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button 
                        type="button" 
                        onClick={() => setShowWizardModal(false)}
                        className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl text-[10px] font-black uppercase text-center font-sans"
                      >
                        Close
                      </button>
                      <button 
                        type="button" 
                        disabled={cities.length === 0}
                        onClick={() => setWizardStep(2)}
                        className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-wider text-center font-sans disabled:opacity-50"
                      >
                        Next: Credentials
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: Representative Info & Revenue terms */}
                {wizardStep === 2 && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono uppercase text-slate-400 font-extrabold font-sans">Representative Full Name</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. Jane Doe"
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        value={wizardData.ownerName}
                        onChange={(e) => setWizardData({ ...wizardData, ownerName: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-mono uppercase text-slate-400 font-extrabold font-sans">Corporate Email Address</label>
                      <input 
                        type="email" 
                        required
                        placeholder="jane@franchise.in"
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 lowercase"
                        value={wizardData.ownerEmail}
                        onChange={(e) => setWizardData({ ...wizardData, ownerEmail: e.target.value.toLowerCase() })}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2 space-y-1">
                        <label className="text-[9px] font-mono uppercase text-slate-400 font-extrabold font-sans">Revenue Agreement</label>
                        <select 
                          className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-800 focus:outline-none"
                          value={wizardData.revenueModel}
                          onChange={(e) => setWizardData({ ...wizardData, revenueModel: e.target.value })}
                        >
                          <option value="50/50 Split">50/50 Split Model</option>
                          <option value="60/40 Split">60/40 Split Model</option>
                          <option value="70/30 Split">70/30 Split Model</option>
                          <option value="80/20 Model">80/20 Pilot Model</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-mono uppercase text-slate-400 font-extrabold font-sans">Screens</label>
                        <input 
                          type="number"
                          min="0"
                          title="Screens assigned"
                          className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-800 focus:outline-none"
                          value={wizardData.totalDevices}
                          onChange={(e) => setWizardData({ ...wizardData, totalDevices: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                      <button 
                        type="button" 
                        onClick={() => setWizardStep(1)}
                        className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl text-[10px] font-black uppercase text-center font-sans"
                      >
                        Back
                      </button>
                      <button 
                        type="submit" 
                        className="flex-1 py-3 bg-amber-500 text-slate-950 font-sans hover:bg-amber-600 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/10 cursor-pointer"
                      >
                        <Shield size={12} />
                        Invite Owner
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Dispatch Confirmation */}
                {wizardStep === 3 && (
                  <div className="space-y-4 animate-fade-in text-center py-4">
                    <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
                      <Check size={32} strokeWidth={3} />
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-lg font-black text-slate-900 uppercase">Invitation Active!</h4>
                      <p className="text-[10px] font-mono text-slate-400">The boarding code is registered as pending claim.</p>
                    </div>

                    <div className="p-4 bg-slate-900 text-left rounded-2xl border border-slate-800 space-y-3 font-mono">
                      <div>
                        <span className="text-[8px] text-slate-400 uppercase tracking-widest block mb-0.5">Invitation Claim Code</span>
                        <div className="text-amber-400 text-sm font-black tracking-wider uppercase select-all bg-slate-950 p-2 rounded border border-slate-800">{generatedInviteCode}</div>
                      </div>

                      <div>
                        <span className="text-[8px] text-slate-400 uppercase tracking-widest block mb-0.5">Secure Invitation Link</span>
                        <div className="text-[10px] text-slate-300 select-all truncate bg-slate-950 p-2 rounded border border-slate-800 break-all">{window.location.origin}/#claim?code={generatedInviteCode}</div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => {
                          const link = `${window.location.origin}/#claim?code=${generatedInviteCode}`;
                          navigator.clipboard.writeText(link);
                          showToast("Copied secure link to clipboard!", "success");
                        }}
                        className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider font-sans transition-all flex items-center justify-center gap-1.5"
                      >
                        <Copy size={12} />
                        Copy Link
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          setShowWizardModal(false);
                          setActiveSubView('INVITATIONS');
                        }}
                        className="flex-1 py-3 bg-slate-900 text-white font-sans rounded-xl text-[10px] font-black uppercase tracking-wider"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
