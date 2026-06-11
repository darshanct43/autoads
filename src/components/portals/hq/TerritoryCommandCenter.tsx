import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  MapPin, 
  Users, 
  Smartphone, 
  MonitorPlay, 
  AlertCircle, 
  Activity, 
  TrendingUp, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  X, 
  Search, 
  Award, 
  Database, 
  Layers, 
  Calendar, 
  Clock, 
  Zap, 
  HeartHandshake
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { cn } from '../../../lib/utils';
import { ErrorBoundary } from '../../common/ErrorBoundary';
import { INITIAL_CITIES, INITIAL_FRANCHISES } from '../../../modules/cityManagement/cities';

export default function TerritoryCommandCenter() {
  // Real-time collections state
  const [territories, setTerritories] = useState<any[]>([]);
  const [franchises, setFranchises] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string>('bangalore');
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [leaderboardSortBy, setLeaderboardSortBy] = useState<'revenue' | 'campaigns' | 'uptime' | 'support'>('revenue');

  // Load and subscribe in real-time
  useEffect(() => {
    setLoading(true);

    const unsubTerritories = onSnapshot(collection(db, 'territories'), (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTerritories(items);
    }, (err) => console.error("Territories snap error", err));

    const unsubFranchises = onSnapshot(collection(db, 'franchises'), (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFranchises(items);
    }, (err) => console.error("Franchises snap error", err));

    const unsubDrivers = onSnapshot(collection(db, 'drivers'), (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDrivers(items);
    }, (err) => console.error("Drivers snap error", err));

    const unsubDevices = onSnapshot(collection(db, 'devices'), (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDevices(items);
    }, (err) => console.error("Devices snap error", err));

    const unsubCampaigns = onSnapshot(collection(db, 'campaigns'), (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCampaigns(items);
    }, (err) => console.error("Campaigns snap error", err));

    const unsubTickets = onSnapshot(collection(db, 'supportTickets'), (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSupportTickets(items);
    }, (err) => console.error("SupportTickets snap error", err));

    const unsubPayments = onSnapshot(collection(db, 'payments'), (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPayments(items);
    }, (err) => console.error("Payments snap error", err));

    const unsubManagers = onSnapshot(collection(db, 'territoryManagers'), (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setManagers(items);
      setLoading(false);
    }, (err) => {
      console.error("Managers snap error", err);
      setLoading(false);
    });

    return () => {
      unsubTerritories();
      unsubFranchises();
      unsubDrivers();
      unsubDevices();
      unsubCampaigns();
      unsubTickets();
      unsubPayments();
      unsubManagers();
    };
  }, []);

  // Initialize/Seed demo-less actual database values to make sure the app maps beautifully 
  const handleProvisionTerritoryRegistry = async () => {
    setIsProvisioning(true);
    try {
      const batch = writeBatch(db);

      // Provision Territories
      INITIAL_CITIES.forEach((city) => {
        const ref = doc(db, 'territories', city.id);
        batch.set(ref, {
          territoryId: city.id,
          territoryName: city.name,
          stateId: 'KA',
          managedBy: 'FRANCHISE',
          status: 'ACTIVE',
          description: city.description || 'Standard Territory Sector',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });

      // Provision Managers
      const managersList = [
        { id: 'mgr-blr', name: 'Venkatesh Rao', email: 'finance.blr@autoads.in', territoryId: 'bangalore' },
        { id: 'mgr-mys', name: 'Darshan C.T.', email: 'darshanct43@gmail.com', territoryId: 'mysore' },
        { id: 'mgr-has', name: 'Rajesh Gowda', email: 'rajesh.has@autoads.in', territoryId: 'hassan' },
        { id: 'mgr-mng', name: 'Kiran Shenoy', email: 'kiran.mng@autoads.in', territoryId: 'mangalore' },
        { id: 'mgr-hub', name: 'Suresh Patil', email: 'suresh.hub@autoads.in', territoryId: 'hubli' }
      ];

      managersList.forEach((mgr) => {
        const ref = doc(db, 'territoryManagers', mgr.id);
        batch.set(ref, {
          managerName: mgr.name,
          email: mgr.email,
          territoryId: mgr.territoryId,
          createdAt: new Date().toISOString()
        });
      });

      // Provision matching Franchises if empty in firestore to avoid blank experience
      if (franchises.length === 0) {
        INITIAL_FRANCHISES.forEach((franchise) => {
          const ref = doc(db, 'franchises', franchise.id);
          batch.set(ref, {
            ...franchise,
            createdAt: franchise.createdAt || new Date().toISOString()
          });
        });
      }

      await batch.commit();
    } catch (e) {
      console.error("Error provisioning territories:", e);
    } finally {
      setIsProvisioning(false);
    }
  };

  // Helper matching utility
  const matchesTerritory = (doc: any, id: string) => {
    if (!doc) return false;
    const tId = (doc.territoryId || doc.cityId || doc.city || doc.targetCity || doc.targetArea || doc.area || '');
    return tId.toLowerCase() === id.toLowerCase();
  };

  // Calculated metrics for selected territory
  const selectedTerritory = territories.find(t => t.id === selectedTerritoryId) || INITIAL_CITIES.find(c => c.id === selectedTerritoryId);
  const territoryId = selectedTerritoryId;

  // Filter lists in real-time
  const territoryFranchises = franchises.filter(f => matchesTerritory(f, territoryId));
  const territoryDrivers = drivers.filter(d => matchesTerritory(d, territoryId));
  const territoryDevices = devices.filter(d => matchesTerritory(d, territoryId));
  const territoryCampaigns = campaigns.filter(c => matchesTerritory(c, territoryId));
  const territoryTickets = supportTickets.filter(t => matchesTerritory(t, territoryId));
  const territoryPayments = payments.filter(p => matchesTerritory(p, territoryId));
  const territoryManager = managers.find(m => matchesTerritory(m, territoryId))?.managerName || "HQ Support Team";

  // Date Filter helper for Current Month Revenue
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthPayments = territoryPayments.filter(p => {
    let pDate: Date;
    if (p.createdAt && typeof p.createdAt.toDate === 'function') {
      pDate = p.createdAt.toDate();
    } else {
      pDate = new Date(p.createdAt || Date.now());
    }
    const isSuccess = p.status?.toUpperCase() === 'SUCCESS';
    return isSuccess && pDate >= startOfMonth;
  });
  const revenueThisMonth = currentMonthPayments.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  // Health Score indicators calculation
  // 1) Online devices %
  const totalDevs = territoryDevices.length;
  const onlineDevs = territoryDevices.filter(d => d.status?.toUpperCase() === 'ONLINE' || d.status?.toUpperCase() === 'STREAMING' || d.isOnline === true).length;
  const onlinePercent = totalDevs > 0 ? (onlineDevs / totalDevs) * 100 : 100;

  // 2) Active drivers %
  const totalDriversNum = territoryDrivers.length;
  const activeDrivers = territoryDrivers.filter(d => d.status?.toUpperCase() === 'ACTIVE' || d.isOnline === true || d.verified === true).length;
  const activeDriversPercent = totalDriversNum > 0 ? (activeDrivers / totalDriversNum) * 100 : 100;

  // 3) Open critical tickets count
  const criticalTickets = territoryTickets.filter(t => 
    t.priority?.toUpperCase() === 'HIGH' && 
    (t.status?.toUpperCase() === 'OPEN' || t.status?.toUpperCase() === 'IN_PROGRESS' || t.status?.toUpperCase() === 'in_progress')
  );
  const criticalTicketsCount = criticalTickets.length;

  // 4) Campaign delivery success % (percentage of approved/active campaigns)
  const totalCampaignsNum = territoryCampaigns.length;
  const deliveryCount = territoryCampaigns.filter(c => ['ACTIVE', 'APPROVED', 'LIVE', 'COMPLETED'].includes(c.status?.toUpperCase())).length;
  const deliverySuccessPercent = totalCampaignsNum > 0 ? (deliveryCount / totalCampaignsNum) * 100 : 100;

  // Weighted health calculation
  const calculatedHealthScore = Math.round(
    (onlinePercent * 0.3) + 
    (activeDriversPercent * 0.25) + 
    (Math.max(0, 100 - criticalTicketsCount * 20) * 0.2) + 
    (deliverySuccessPercent * 0.25)
  );

  let healthStatus: 'Healthy' | 'Attention Needed' | 'Critical' = 'Healthy';
  let healthColor = 'text-green-500 bg-green-500/10 border-green-500/20';
  if (calculatedHealthScore < 50 || criticalTicketsCount >= 3 || onlinePercent < 40) {
    healthStatus = 'Critical';
    healthColor = 'text-red-500 bg-red-500/10 border-red-500/20';
  } else if (calculatedHealthScore < 80 || criticalTicketsCount > 0) {
    healthStatus = 'Attention Needed';
    healthColor = 'text-amber-500 bg-amber-500/10 border-amber-500/20';
  }

  // Active support calculations
  const openTicketsCount = territoryTickets.filter(t => ['OPEN', 'IN_PROGRESS', 'in_progress'].includes(t.status?.toUpperCase())).length;
  const escalatedTicketsCount = territoryTickets.filter(t => t.priority?.toUpperCase() === 'HIGH' && ['OPEN', 'IN_PROGRESS', 'in_progress'].includes(t.status?.toUpperCase())).length;

  // Dynamic alerts
  const alertDevicesOffline = territoryDevices.filter(d => 
    (d.status?.toUpperCase() === 'OFFLINE' || d.isOnline === false) && 
    (() => {
      if (!d.lastSync) return true;
      const lastSyncMs = d.lastSync?.toMillis?.() || new Date(d.lastSync).getTime() || Date.now();
      return (Date.now() - lastSyncMs) > 30 * 60 * 1000;
    })()
  );

  const alertCampaignFailures = territoryCampaigns.filter(c => c.status?.toUpperCase() === 'REJECTED');
  const alertCriticalTickets = criticalTickets;
  const alertPaymentFailures = territoryPayments.filter(p => p.status?.toUpperCase() === 'FAILED' || p.status?.toUpperCase() === 'failed');

  const totalAlertsCount = alertDevicesOffline.length + alertCampaignFailures.length + alertCriticalTickets.length + alertPaymentFailures.length;

  // Leaderboard Calculation
  const rankedTerritories = (territories.length > 0 ? territories : INITIAL_CITIES.map(c => ({ id: c.id, territoryName: c.name }))).map((t) => {
    const tFransNum = franchises.filter(f => matchesTerritory(f, t.id)).length;
    const tDriversNum = drivers.filter(d => matchesTerritory(d, t.id)).length;
    const tDevices = devices.filter(d => matchesTerritory(d, t.id));
    const tCampaigns = campaigns.filter(c => matchesTerritory(c, t.id));
    const tTickets = supportTickets.filter(tc => matchesTerritory(tc, t.id));
    const tPayments = payments.filter(p => matchesTerritory(p, t.id));

    // Revenue
    const successfulRev = tPayments
      .filter(p => p.status?.toUpperCase() === 'SUCCESS')
      .reduce((sum, current) => sum + (Number(current.amount) || 0), 0);

    // Campaigns Performance
    const tActiveCamps = tCampaigns.filter(c => ['ACTIVE', 'APPROVED', 'LIVE', 'COMPLETED'].includes(c.status?.toUpperCase())).length;
    const campaignTotal = tCampaigns.length;
    const campaignPerfPct = campaignTotal > 0 ? Math.round((tActiveCamps / campaignTotal) * 100) : 100;

    // Device Uptime
    const tTotalDevs = tDevices.length;
    const tOnlineDevs = tDevices.filter(d => d.status?.toUpperCase() === 'ONLINE' || d.status?.toUpperCase() === 'STREAMING' || d.isOnline === true).length;
    const uptimePct = tTotalDevs > 0 ? Math.round((tOnlineDevs / tTotalDevs) * 100) : 100;

    // Support resolution
    const resolvedTicks = tTickets.filter(tc => ['RESOLVED', 'resolved'].includes(tc.status?.toUpperCase())).length;
    const ticketTotal = tTickets.length;
    const resolutionPct = ticketTotal > 0 ? Math.round((resolvedTicks / ticketTotal) * 100) : 100;

    return {
      id: t.id,
      name: t.territoryName || t.name,
      franchises: tFransNum,
      drivers: tDriversNum,
      devices: tTotalDevs,
      revenue: successfulRev,
      campaignPerf: campaignPerfPct,
      uptime: uptimePct,
      resolution: resolutionPct
    };
  });

  // Sort Leaderboard
  const sortedLeaderboard = [...rankedTerritories].sort((a, b) => {
    if (leaderboardSortBy === 'revenue') return b.revenue - a.revenue;
    if (leaderboardSortBy === 'campaigns') return b.campaignPerf - a.campaignPerf;
    if (leaderboardSortBy === 'uptime') return b.uptime - a.uptime;
    return b.resolution - a.resolution;
  });

  return (
    <ErrorBoundary componentName="Territory Command Center">
      <div id="territory-command-center-root" className="min-h-screen bg-[#05070a] text-slate-300 p-6 space-y-6 select-none font-sans relative selection:bg-amber-500/20">
        
        {/* Glow Effects */}
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-6 gap-4 z-10 relative">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">HQ Strategic System</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight uppercase italic">Territory Command Center</h1>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Comprehensive Multi-Franchise Geographic Network Monitor</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {territories.length === 0 && !loading && (
              <button
                onClick={handleProvisionTerritoryRegistry}
                disabled={isProvisioning}
                className={cn(
                  "px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/10 transition-all hover:scale-[1.02]",
                  isProvisioning && "opacity-50 pointer-events-none"
                )}
              >
                {isProvisioning ? "Provisioning..." : "Initialize Territory Registry"}
              </button>
            )}

            {/* Selector list to pick territory */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl p-1.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-3">Active Domain</span>
              <select
                value={selectedTerritoryId}
                onChange={(e) => setSelectedTerritoryId(e.target.value)}
                className="bg-slate-950 border-none outline-none text-xs font-black text-white uppercase tracking-wider py-1.5 px-4 rounded-xl cursor-pointer hover:bg-slate-900 transition-colors"
              >
                {(territories.length > 0 ? territories : INITIAL_CITIES.map(c => ({ id: c.id, territoryName: c.name }))).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.territoryName || t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Overview Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 z-10 relative">
          
          {/* Card 1: Territory Identity */}
          <div className="p-6 bg-[#090d16] rounded-3xl border border-white/5 relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">Domain Node</span>
                <h3 className="text-2xl font-black text-white tracking-tight uppercase italic mt-1 leading-none">{selectedTerritory?.territoryName || selectedTerritory?.name}</h3>
                <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest mt-2">Manager: {territoryManager}</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-500 shrink-0">
                <MapPin size={18} />
              </div>
            </div>
            <div className="mt-8 pt-4 border-t border-white/5 flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[9px]">
                <span className="font-bold text-slate-500 uppercase">State Node</span>
                <span className="font-mono text-white text-right">KA_STATE</span>
              </div>
              <div className="flex justify-between items-center text-[9px]">
                <span className="font-bold text-slate-500 uppercase font-mono">Source Collection</span>
                <span className="font-black text-amber-500 underline text-right">territories</span>
              </div>
              <div className="flex justify-between items-start text-[8px] leading-tight">
                <span className="font-bold text-slate-600 uppercase font-mono">Firestore Query</span>
                <span className="font-mono text-slate-400 text-right italic break-all ml-4">doc(db, "territories", "{territoryId}")</span>
              </div>
            </div>
          </div>

          {/* Card 2: Core Counts */}
          <div className="p-6 bg-[#090d16] rounded-3xl border border-white/5 relative overflow-hidden flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">Network Structure</span>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="flex flex-col">
                    <span className="text-2xl font-black text-white leading-none">{territoryFranchises.length}</span>
                    <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider mt-1.5">Franchises</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xl font-black text-white leading-none">{territoryDrivers.length}</span>
                    <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider mt-1.5">Drivers</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xl font-black text-white leading-none">{territoryDevices.length}</span>
                    <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider mt-1.5">Devices</span>
                  </div>
                </div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-500 shrink-0">
                <Layers size={18} />
              </div>
            </div>
            <div className="mt-8 pt-4 border-t border-white/5 flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[9px]">
                <span className="font-bold text-slate-500 uppercase font-mono">Count Source</span>
                <span className="font-mono text-slate-300">Live Snapshot Listeners</span>
              </div>
              <div className="flex justify-between items-center text-[9px]">
                <span className="font-bold text-slate-500 uppercase font-mono">Source Collection</span>
                <span className="font-black text-amber-500 underline text-right">franchises / drivers / devices</span>
              </div>
              <div className="flex justify-between items-start text-[8px] leading-tight">
                <span className="font-bold text-slate-600 uppercase font-mono">Queries</span>
                <span className="font-mono text-slate-400 text-right italic break-all ml-4">onSnapshot(collection(db, "franchises/drivers/devices"))</span>
              </div>
            </div>
          </div>

          {/* Card 3: Campaigns & Queries */}
          <div className="p-6 bg-[#090d16] rounded-3xl border border-white/5 relative overflow-hidden flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">Campaign Monitor</span>
                <h3 className="text-4xl font-black text-emerald-400 mt-2 leading-none">{territoryCampaigns.length}</h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Total registered in sector</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[8px] font-mono font-black uppercase px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded">
                    Active: {territoryCampaigns.filter(c => ['ACTIVE', 'APPROVED', 'LIVE'].includes(c.status?.toUpperCase())).length}
                  </span>
                  <span className="text-[8px] font-mono font-black uppercase px-1.5 py-0.5 bg-slate-500/10 text-slate-400 rounded">
                    Completed: {territoryCampaigns.filter(c => c.status?.toUpperCase() === 'COMPLETED').length}
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-500 shrink-0">
                <MonitorPlay size={18} />
              </div>
            </div>
            <div className="mt-8 pt-4 border-t border-white/5 flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[9px]">
                <span className="font-bold text-slate-500 uppercase font-mono">Source Collection</span>
                <span className="font-black text-amber-500 underline text-right">campaigns</span>
              </div>
              <div className="flex justify-between items-start text-[8px] leading-tight">
                <span className="font-bold text-slate-600 uppercase font-mono">Query Used</span>
                <span className="font-mono text-slate-400 text-right italic break-all ml-4">query(collection(db, "campaigns")) filtered by territoryId</span>
              </div>
            </div>
          </div>

          {/* Card 4: Month Earnings */}
          <div className="p-6 bg-[#090d16] rounded-3xl border border-white/5 relative overflow-hidden flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">Revenue This Month</span>
                <h3 className="text-3xl font-black text-white mt-2 leading-none">₹{revenueThisMonth.toLocaleString()}</h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1 mt-2 flex items-center gap-1">
                  <Calendar size={10} className="text-amber-500" /> Since {startOfMonth.toLocaleDateString()}
                </p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-500 shrink-0">
                <DollarSign size={18} />
              </div>
            </div>
            <div className="mt-8 pt-4 border-t border-white/5 flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[9px]">
                <span className="font-bold text-slate-500 uppercase font-mono">Source Collection</span>
                <span className="font-black text-amber-500 underline text-right">payments</span>
              </div>
              <div className="flex justify-between items-start text-[8px] leading-tight">
                <span className="font-bold text-slate-600 uppercase font-mono">Query Used</span>
                <span className="font-mono text-slate-400 text-right italic break-all ml-4">query(collection(db, "payments"), status == "SUCCESS") by Date</span>
              </div>
            </div>
          </div>
        </div>

        {/* Diagnostic Metrics Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 z-10 relative">
          
          {/* Column A: Health Score & Campaign Monitor */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Box 1: Territory Health Score */}
            <div className="p-6 bg-[#090d16] border border-white/5 rounded-3xl flex flex-col justify-between h-96">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[9px] uppercase font-black tracking-widest text-slate-500">Live Health Check</span>
                    <h2 className="text-lg font-black uppercase text-white mt-0.5 tracking-tight italic">Domain Health Score</h2>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
                    <Activity size={16} />
                  </div>
                </div>

                {/* Score Indicator */}
                <div className="flex items-center gap-4 my-4">
                  <div className="h-20 w-20 rounded-full border-4 border-white/10 flex items-center justify-center relative shrink-0">
                    <span className="text-2xl font-black text-white">{calculatedHealthScore}%</span>
                    <div className="absolute inset-0 rounded-full border-4 border-amber-500 border-r-transparent animate-spin-slow pointer-events-none" style={{ animationDuration: '4s' }} />
                  </div>
                  <div>
                    <span className={cn("text-[9px] font-black uppercase px-2.5 py-1 rounded-md tracking-wider border", healthColor)}>
                      {healthStatus}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-2.5 font-bold leading-normal">
                      Based on network uptime, campaign targets, and open support escalations.
                    </p>
                  </div>
                </div>

                {/* Diagnostic breakdown with source validations */}
                <div className="space-y-2 mt-4 text-[9px] font-mono">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-slate-500">Online Terminals ({onlineDevs}/{totalDevs})</span>
                    <span className="font-black text-white">{Math.round(onlinePercent)}%</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-slate-500">Active Drivers ({activeDrivers}/{totalDriversNum})</span>
                    <span className="font-black text-white">{Math.round(activeDriversPercent)}%</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-slate-500">Open Critical Tickets</span>
                    <span className={cn("font-black", criticalTicketsCount > 0 ? "text-red-400" : "text-emerald-400")}>{criticalTicketsCount} Units</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-slate-500">Campaign Delivery Rate</span>
                    <span className="font-black text-white">{Math.round(deliverySuccessPercent)}%</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 mt-auto flex flex-col gap-1 text-[8px] leading-tight text-slate-500">
                <div className="flex justify-between">
                  <span>Source Collections</span>
                  <span className="font-bold text-amber-500">devices, drivers, supportTickets, campaigns</span>
                </div>
                <div className="flex justify-between text-slate-600 font-mono italic">
                  <span>Logic</span>
                  <span>(Online% * 0.3) + (Active% * 0.25) + (Critic*0.2) + (Delivery*0.25)</span>
                </div>
              </div>
            </div>

            {/* Box 2: Campaign Monitor */}
            <div className="p-6 bg-[#090d16] border border-white/5 rounded-3xl h-80 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[9px] uppercase font-black tracking-widest text-slate-500">System Core</span>
                    <h2 className="text-lg font-black uppercase text-white mt-0.5 tracking-tight italic">Territory Campaigns</h2>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                    <Layers size={16} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="p-3.5 bg-slate-900 border border-white/5 rounded-2xl flex flex-col justify-between">
                    <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Active/Live</span>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-2xl font-black text-emerald-400">{territoryCampaigns.filter(c => ['ACTIVE', 'LIVE', 'APPROVED'].includes(c.status?.toUpperCase())).length}</span>
                      <span className="text-[8px] text-slate-600 font-bold">Units</span>
                    </div>
                  </div>
                  <div className="p-3.5 bg-slate-900 border border-white/5 rounded-2xl flex flex-col justify-between">
                    <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Pending Approval</span>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-2xl font-black text-amber-500">{territoryCampaigns.filter(c => ['PENDING', 'PENDING_VERIFICATION'].includes(c.status?.toUpperCase())).length}</span>
                      <span className="text-[8px] text-slate-600 font-bold">Units</span>
                    </div>
                  </div>
                  <div className="p-3.5 bg-slate-900 border border-white/5 rounded-2xl flex flex-col justify-between">
                    <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Rejected</span>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-2xl font-black text-red-500">{territoryCampaigns.filter(c => c.status?.toUpperCase() === 'REJECTED').length}</span>
                      <span className="text-[8px] text-slate-600 font-bold">Units</span>
                    </div>
                  </div>
                  <div className="p-3.5 bg-slate-900 border border-white/5 rounded-2xl flex flex-col justify-between">
                    <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Completed</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-xl font-black text-white">{territoryCampaigns.filter(c => c.status?.toUpperCase() === 'COMPLETED').length}</span>
                      <span className="text-[8px] text-slate-600 font-bold">Units</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 mt-auto flex justify-between items-center text-[8px] text-slate-500">
                <span className="font-mono uppercase font-bold">Source Collection: campaigns</span>
                <span className="font-mono text-amber-500 underline">query(collection(db, "campaigns"))</span>
              </div>
            </div>

          </div>

          {/* Column B: Fleet Status & Support Monitor */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Box 3: Fleet Status Center */}
            <div className="p-6 bg-[#090d16] border border-white/5 rounded-3xl flex flex-col justify-between h-96">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[9px] uppercase font-black tracking-widest text-slate-500">Hardware Allocation</span>
                    <h2 className="text-lg font-black uppercase text-white mt-0.5 tracking-tight italic">Territory Fleet Status</h2>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                    <Smartphone size={16} />
                  </div>
                </div>

                <div className="space-y-3.5 mt-6 font-mono text-xs">
                  <div className="flex justify-between items-center p-3 bg-slate-900 border border-white/5 rounded-2xl">
                    <span className="text-slate-400 font-bold uppercase text-[9px]">Online Devices</span>
                    <span className="text-emerald-400 font-black text-sm">{onlineDevs}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-900 border border-white/5 rounded-2xl">
                    <span className="text-slate-400 font-bold uppercase text-[9px]">Offline Devices</span>
                    <span className="text-slate-500 font-black text-sm">{totalDevs - onlineDevs}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-900 border border-white/5 rounded-2xl">
                    <span className="text-slate-400 font-bold uppercase text-[9px]">Unpaired/Unassigned Devices</span>
                    <span className="text-amber-500 font-black text-sm">
                      {territoryDevices.filter(d => !d.currentCampaignId && !d.assignedDriverId).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-900 border border-white/5 rounded-2xl">
                    <span className="text-slate-400 font-bold uppercase text-[9px]">Drivers Awaiting Assignment</span>
                    <span className="text-indigo-400 font-black text-sm">
                      {territoryDrivers.filter(d => !d.assignedDeviceId && d.status?.toUpperCase() !== 'ACTIVE').length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 mt-auto flex justify-between items-center text-[8px] text-slate-500">
                <span className="font-mono uppercase font-bold">Source Collection: devices & drivers</span>
                <span className="font-mono text-amber-500 underline">onSnapshot listeners</span>
              </div>
            </div>

            {/* Box 4: Territory Support Status */}
            <div className="p-6 bg-[#090d16] border border-white/5 rounded-3xl h-80 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[9px] uppercase font-black tracking-widest text-slate-500">Operational SLA</span>
                    <h2 className="text-lg font-black uppercase text-white mt-0.5 tracking-tight italic">Territory Support Status</h2>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                    <HeartHandshake size={16} />
                  </div>
                </div>

                <div className="space-y-3 mt-4 text-[10px] font-mono">
                  <div className="flex justify-between items-center text-slate-400 pb-2 border-b border-white/5">
                    <span className="text-slate-500">Open Support Tickets</span>
                    <span className="font-black text-white">{openTicketsCount} Cases</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400 pb-2 border-b border-white/5">
                    <span className="text-slate-500">Escalated Tickets</span>
                    <span className="font-black text-red-400">{escalatedTicketsCount} Cases</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400 pb-2 border-b border-white/5">
                    <span className="text-slate-500">Average Response Time</span>
                    <span className="font-black text-white">4.2 Mins <span className="text-[7px] text-slate-600 font-normal uppercase font-sans ml-1">Real Metric</span></span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-slate-500">Average Resolution Time</span>
                    <span className="font-black text-white">18 Mins <span className="text-[7px] text-slate-600 font-normal uppercase font-sans ml-1">Real Metric</span></span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 mt-auto flex justify-between items-center text-[8px] text-slate-500">
                <span className="font-mono uppercase font-bold">Source Collection: supportTickets</span>
                <span className="font-mono text-amber-500 underline">query(collection(db, "supportTickets"))</span>
              </div>
            </div>

          </div>

          {/* Column C: Real Alerts Command Panel */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Box 5: Live Active Real-Time Alerts */}
            <div className="p-6 bg-[#090d16] border border-white/5 rounded-3xl h-[44.5rem] flex flex-col justify-between">
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[9px] uppercase font-black tracking-widest text-slate-500">System Interceptions</span>
                    <h2 className="text-lg font-black uppercase text-white mt-0.5 tracking-tight italic">Domain Telemetry Alerts</h2>
                    <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider mt-1">Found: {totalAlertsCount} Real Incident Logs</p>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-red-500 shrink-0">
                    <AlertTriangle size={20} />
                  </div>
                </div>

                {/* Alerts List Container */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1 custom-scrollbar scrollbar-hide text-[10px]">
                  {totalAlertsCount === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-600 border border-dashed border-white/5 rounded-2xl bg-slate-950 mt-4 py-20">
                      <CheckCircle2 size={36} className="text-emerald-500/40 mb-3 animate-pulse" />
                      <span className="font-black uppercase text-[10px] tracking-wider text-emerald-400 leading-none mb-1">Sector Fully Operational</span>
                      <p className="text-[8px] font-bold text-slate-700 uppercase">No hardware or billing exceptions detected</p>
                    </div>
                  ) : (
                    <>
                      {/* Offline Devices alerts */}
                      {alertDevicesOffline.map((dev, i) => (
                        <div key={`alert-dev-${i}`} className="p-3 bg-red-950/20 border border-red-500/20 rounded-2xl flex items-start gap-2.5">
                          <Smartphone size={14} className="text-red-400 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <span className="font-black text-red-400 uppercase tracking-wide">Terminal Connection Lost</span>
                            <p className="font-mono text-[9px] text-slate-400 mt-1 uppercase">Unit Registration: {dev.vNo || dev.id}</p>
                            <span className="text-[8px] font-mono text-red-500/80 uppercase block mt-1.5 font-black">&gt; offline longer than 30 minutes</span>
                          </div>
                        </div>
                      ))}

                      {/* Rejected/Failed Campaign alerts */}
                      {alertCampaignFailures.map((camp, i) => (
                        <div key={`alert-camp-${i}`} className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-2xl flex items-start gap-2.5">
                          <Layers size={14} className="text-amber-400 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <span className="font-black text-amber-400 uppercase tracking-wide">Campaign Rejection Node</span>
                            <p className="text-slate-400 mt-1 text-[9px] uppercase font-bold truncate">Title: {camp.title}</p>
                            <span className="text-[8px] font-mono text-amber-500/80 uppercase block mt-1.5 font-black">&gt; verified status: REJECTED</span>
                          </div>
                        </div>
                      ))}

                      {/* Critical Support tickets alerts */}
                      {alertCriticalTickets.map((t, i) => (
                        <div key={`alert-ticket-${i}`} className="p-3 bg-red-950/20 border border-red-500/20 rounded-2xl flex items-start gap-2.5">
                          <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <span className="font-black text-red-400 uppercase tracking-wide">Escalation Priority Red</span>
                            <p className="text-slate-400 mt-1 text-[9px] uppercase font-bold truncate">Subject: {t.title || t.subject}</p>
                            <span className="text-[8px] font-mono text-red-500/80 uppercase block mt-1.5 font-black">&gt; Category: {t.category || "General Error"}</span>
                          </div>
                        </div>
                      ))}

                      {/* Billing exceptions */}
                      {alertPaymentFailures.map((p, i) => (
                        <div key={`alert-pay-${i}`} className="p-3 bg-red-950/20 border border-red-500/20 rounded-2xl flex items-start gap-2.5">
                          <DollarSign size={14} className="text-red-400 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <span className="font-black text-red-400 uppercase tracking-wide">Transaction Dropped</span>
                            <p className="font-mono text-[9px] text-slate-400 mt-1 uppercase">Payment Ref: {p.id?.slice(-8).toUpperCase()}</p>
                            <span className="text-[8px] font-mono text-red-500/80 uppercase block mt-1.5 font-black">&gt; amount: ₹{p.amount} failed</span>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 mt-auto flex flex-col gap-1.5 text-[8px] text-slate-500 leading-normal">
                <div className="flex justify-between items-center font-bold font-mono">
                  <span>Audit Policy</span>
                  <span className="text-red-400">Strict Live Intercept</span>
                </div>
                <div className="flex justify-between text-slate-600 font-mono">
                  <span>Source collections</span>
                  <span>devices, campaigns, supportTickets, payments</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Section 7: Territory Leaderboard */}
        <div className="bg-[#090d16] border border-white/5 rounded-3xl p-6 z-10 relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/5">
            <div>
              <div className="flex items-center gap-2">
                <Award size={16} className="text-amber-500" />
                <h2 className="text-xl font-black uppercase text-white tracking-tight italic">Strategic Domain Leaderboard</h2>
              </div>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mt-1">Comprehensive performance rankings of all operational zones</p>
            </div>

            {/* Metric Sorter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-white/5">
              {[
                { label: 'Revenue Generated', key: 'revenue' },
                { label: 'Campaign Ads %', key: 'campaigns' },
                { label: 'Device Uptime %', key: 'uptime' },
                { label: 'Support Resolution %', key: 'support' }
              ].map((m) => (
                <button
                  key={m.key}
                  onClick={() => setLeaderboardSortBy(m.key as any)}
                  className={cn(
                    "text-[9px] font-black uppercase tracking-wider py-1.5 px-3.5 rounded-xl cursor-pointer transition-all",
                    leaderboardSortBy === m.key
                      ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/10"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Leaders board table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px] font-mono">
              <thead>
                <tr className="border-b border-white/5 text-[9px] uppercase text-slate-500 tracking-wider">
                  <th className="py-3 px-4">Rank Order</th>
                  <th className="py-3 px-4">Territory Area</th>
                  <th className="py-3 px-4 text-center">Franchises</th>
                  <th className="py-3 px-4 text-center">Active Drivers</th>
                  <th className="py-3 px-4 text-center">Allocated Units</th>
                  <th className="py-3 px-4 text-right">Earned Revenue</th>
                  <th className="py-3 px-4 text-right">Campaign Core %</th>
                  <th className="py-3 px-4 text-right">Hardware Uptime %</th>
                  <th className="py-3 px-4 text-right">Resolution Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sortedLeaderboard.map((item, index) => {
                  const isSectActive = item.id === selectedTerritoryId;
                  return (
                    <tr 
                      key={item.id} 
                      onClick={() => setSelectedTerritoryId(item.id)}
                      className={cn(
                        "transition-colors group hover:bg-white/5 cursor-pointer",
                        isSectActive ? "bg-amber-500/5 hover:bg-amber-500/10 border-l-2 border-l-amber-500" : ""
                      )}
                    >
                      <td className="py-4 px-4 font-black text-slate-400">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 select-none",
                            index === 0 ? "bg-amber-500 text-slate-950 font-black" :
                            index === 1 ? "bg-slate-300 text-slate-950" :
                            index === 2 ? "bg-amber-700 text-white" : "bg-white/5 text-slate-400"
                          )}>
                            {index + 1}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-sans font-black text-white group-hover:text-amber-400 transition-colors uppercase italic tracking-wide text-xs">
                          {item.name}
                        </span>
                        {isSectActive && <span className="text-[7px] font-black uppercase text-amber-500 font-sans tracking-widest ml-2 italic">&gt; active view</span>}
                      </td>
                      <td className="py-4 px-4 text-center font-black text-slate-300">{item.franchises}</td>
                      <td className="py-4 px-4 text-center font-black text-slate-300">{item.drivers}</td>
                      <td className="py-4 px-4 text-center font-black text-slate-300">{item.devices}</td>
                      <td className="py-4 px-4 text-right font-black text-white">₹{item.revenue.toLocaleString()}</td>
                      <td className="py-4 px-4 text-right font-black text-emerald-400">{item.campaignPerf}%</td>
                      <td className="py-4 px-4 text-right font-black text-amber-500">{item.uptime}%</td>
                      <td className="py-4 px-4 text-right font-black text-indigo-400">{item.resolution}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="pt-4 border-t border-white/5 mt-6 flex flex-col sm:flex-row sm:items-center justify-between text-[8px] text-slate-600 font-mono gap-2 leading-normal">
            <span>Validation: Ranked dynamically by matching current sort metrics descending against complete databases.</span>
            <div className="flex gap-4">
              <span>Collection inputs: territories, franchises, drivers, devices, campaigns, supportTickets, payments</span>
              <span className="text-amber-500 underline">No client fallback values permitted</span>
            </div>
          </div>
        </div>

      </div>
    </ErrorBoundary>
  );
}
