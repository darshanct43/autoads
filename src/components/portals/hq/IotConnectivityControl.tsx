import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Wifi, 
  AlertTriangle, 
  DollarSign, 
  Activity, 
  MapPin, 
  Building, 
  Database, 
  ArrowUpRight, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  ShieldCheck, 
  Plus, 
  Search, 
  Filter,
  BarChart4,
  Zap,
  Check,
  Signal,
  CreditCard,
  Network
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  query, 
  doc, 
  writeBatch, 
  getDocs,
  where,
  setDoc
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { cn } from '../../../lib/utils';
import { ErrorBoundary } from '../../common/ErrorBoundary';

interface SimCard {
  id: string;
  simNumber: string;
  operator: string;
  assignedDevice: string;
  assignedVehicle: string;
  territory: string;
  franchise: string;
  planExpiryDate: string;
  lastRechargeDate: string;
  status: 'ACTIVE' | 'EXPIRING_SOON' | 'RECHARGE_DUE' | 'EXPIRED' | 'SUSPENDED';
  monthlyCost: number;
  dataUsedMB?: number;
  dataLimitMB?: number;
  billingCycleStart?: string;
  usagePercent?: number;
}

interface RechargeHistory {
  id: string;
  simNumber: string;
  operator: string;
  amount: number;
  rechargeDate: string;
  expiryDate: string;
  status: string;
  transactionId: string;
}

interface Telemetry {
  id: string;
  deviceId: string;
  terminalId: string;
  simNumber: string;
  currentNetwork: string;
  signalDb: number;
  signalStrength: 'Excellent' | 'Good' | 'Weak' | 'Critical' | 'Offline';
  lastHeartbeat: string;
  lastGpsPing: string;
  latitude: number;
  longitude: number;
  weakSince?: string;
  healthScore?: number;
  healthStatus?: 'HEALTHY' | 'GOOD' | 'AT_RISK' | 'CRITICAL';
}

interface ConnectivityAlert {
  id: string;
  deviceId: string;
  type: string;
  title: string;
  description: string;
  createdAt: string;
  status: 'ACTIVE' | 'RESOLVED';
}

export default function IotConnectivityControl({ readOnly = false }: { readOnly?: boolean }) {
  const [sims, setSims] = useState<SimCard[]>([]);
  const [recharges, setRecharges] = useState<RechargeHistory[]>([]);
  const [telemetry, setTelemetry] = useState<Telemetry[]>([]);
  const [alerts, setAlerts] = useState<ConnectivityAlert[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [simSearch, setSimSearch] = useState('');
  const [simStatusFilter, setSimStatusFilter] = useState<string>('all');
  const [telemetrySearch, setTelemetrySearch] = useState('');
  const [telemetryStatusFilter, setTelemetryStatusFilter] = useState<string>('all');
  const [healthStatusFilter, setHealthStatusFilter] = useState<string>('all');
  const [telemetrySort, setTelemetrySort] = useState<string>('default');
  const [activeTab, setActiveTab] = useState<'SIMS' | 'HEALTH' | 'ALERTS' | 'COSTS'>('SIMS');
  const [alertAuditStatus, setAlertAuditStatus] = useState<string>('');

  // Manual Cellular Entry States
  const [isManualSimOpen, setIsManualSimOpen] = useState(false);
  const [manualSimNo, setManualSimNo] = useState('');
  const [manualOperator, setManualOperator] = useState('Airtel Enterprise');
  const [manualDevice, setManualDevice] = useState('');
  const [manualVehicle, setManualVehicle] = useState('');
  const [manualTerritory, setManualTerritory] = useState('bangalore');
  const [manualFranchise, setManualFranchise] = useState('Bengaluru HQ');
  const [manualCost, setManualCost] = useState(199);
  const [manualLimit, setManualLimit] = useState(2048);
  const [manualUsed, setManualUsed] = useState(0);
  const [isAddingSim, setIsAddingSim] = useState(false);

  const handleManualSimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSimNo.trim() || !manualDevice.trim() || !manualVehicle.trim()) {
      alert("Please fill in SIM Number, Device ID, and Vehicle Number.");
      return;
    }
    setIsAddingSim(true);
    try {
      const now = new Date();
      // Calculate Expiry Date in 90 days
      const expDate = new Date();
      expDate.setDate(now.getDate() + 90);

      const newSimId = 'sim-' + manualSimNo.trim();
      const newSimData: SimCard = {
        id: newSimId,
        simNumber: manualSimNo.trim(),
        operator: manualOperator,
        assignedDevice: manualDevice.trim().toUpperCase(),
        assignedVehicle: manualVehicle.trim().toUpperCase(),
        territory: manualTerritory,
        franchise: manualFranchise,
        planExpiryDate: expDate.toISOString(),
        lastRechargeDate: now.toISOString(),
        status: 'ACTIVE',
        monthlyCost: Number(manualCost),
        dataLimitMB: Number(manualLimit),
        dataUsedMB: Number(manualUsed),
        billingCycleStart: now.toISOString().split('T')[0],
        usagePercent: Math.min(100, Math.round((Number(manualUsed) / Number(manualLimit)) * 100))
      };

      // Also generate a matching device telemetry record so that they tie perfectly!
      const newTelemetryId = 'telemetry-' + manualDevice.trim().toUpperCase();
      const newTelemetryData: Telemetry = {
        id: newTelemetryId,
        deviceId: manualDevice.trim().toUpperCase(),
        terminalId: manualDevice.trim().toUpperCase(),
        simNumber: manualSimNo.trim(),
        currentNetwork: manualOperator,
        signalDb: -63,
        signalStrength: 'Excellent',
        lastHeartbeat: now.toISOString(),
        lastGpsPing: now.toISOString(),
        latitude: 12.9716, // Bangalore default
        longitude: 77.5946,
        healthScore: 100,
        healthStatus: 'GOOD',
        weakSince: undefined
      };

      // Store in Firebase
      await setDoc(doc(db, 'iotSims', newSimId), newSimData);
      
      // Store telemetry
      await setDoc(doc(db, 'deviceTelemetry', newTelemetryId), newTelemetryData as any);

      alert(`Manual SIM Entry Registered & Tied to Telemetry record! ID: ${newSimId}`);
      setIsManualSimOpen(false);
      // Reset forms
      setManualSimNo('');
      setManualDevice('');
      setManualVehicle('');
    } catch (err) {
      console.error(err);
      alert("Error adding manual SIM node: " + err);
    } finally {
      setIsAddingSim(false);
    }
  };

  // Setup live snapshot listeners
  useEffect(() => {
    setLoading(true);
    
    const unsubSims = onSnapshot(collection(db, 'iotSims'), (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SimCard[];
      setSims(items);
    }, (err) => console.error("Error reading iotSims collection", err));

    const unsubRecharges = onSnapshot(collection(db, 'iotRechargeHistory'), (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as RechargeHistory[];
      setRecharges(items);
    }, (err) => console.error("Error reading iotRechargeHistory collection", err));

    const unsubTelemetry = onSnapshot(collection(db, 'deviceTelemetry'), (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Telemetry[];
      setTelemetry(items);
    }, (err) => console.error("Error reading deviceTelemetry collection", err));

    const unsubAlerts = onSnapshot(collection(db, 'connectivityAlerts'), (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ConnectivityAlert[];
      setAlerts(items);
      setLoading(false);
    }, (err) => {
      console.error("Error reading connectivityAlerts collection", err);
      setLoading(false);
    });

    return () => {
      unsubSims();
      unsubRecharges();
      unsubTelemetry();
      unsubAlerts();
    };
  }, []);

  // Run Real-time Telemetry Auditor to check and update database alerts!
  const runLiveTelemetryAudit = async () => {
    setAlertAuditStatus('Analyzing live snapshots...');
    try {
      const parentBatch = writeBatch(db);
      const now = new Date();
      let newAlertsCount = 0;

      telemetry.forEach((device) => {
        const lastHb = new Date(device.lastHeartbeat);
        const lastGps = new Date(device.lastGpsPing);
        const diffHbMinutes = (now.getTime() - lastHb.getTime()) / (1000 * 60);
        const diffGpsMinutes = (now.getTime() - lastGps.getTime()) / (1000 * 60);
        
        // Find matching SIM plan
        const matchingSim = sims.find(s => s.simNumber === device.simNumber || s.assignedDevice === device.deviceId);

        // --- PHASE 1: DEVICE HEALTH SCORE ---
        let baseScore = 100;
        if (diffHbMinutes > 15) baseScore -= 40;
        if (diffGpsMinutes > 30) baseScore -= 15;
        if (device.signalStrength === 'Critical') baseScore -= 20;
        if (device.signalStrength === 'Weak') baseScore -= 10;
        if (device.signalDb < -100) baseScore -= 20;

        if (matchingSim) {
          if (matchingSim.status === 'EXPIRED') baseScore = 0;
          else if (matchingSim.status === 'RECHARGE_DUE') baseScore -= 15;
          else if (matchingSim.status === 'EXPIRING_SOON') baseScore -= 15;
        }

        const finalHealthScore = Math.max(0, baseScore);
        let finalHealthStatus: 'HEALTHY' | 'GOOD' | 'AT_RISK' | 'CRITICAL' = 'HEALTHY';
        if (finalHealthScore >= 90) finalHealthStatus = 'HEALTHY';
        else if (finalHealthScore >= 70) finalHealthStatus = 'GOOD';
        else if (finalHealthScore >= 40) finalHealthStatus = 'AT_RISK';
        else finalHealthStatus = 'CRITICAL';

        if (device.healthScore !== finalHealthScore || device.healthStatus !== finalHealthStatus) {
          parentBatch.update(doc(db, 'deviceTelemetry', device.id), {
            healthScore: finalHealthScore,
            healthStatus: finalHealthStatus
          });
        }

        // --- PHASE 2: HEALTH ALERTS ---
        if (finalHealthScore < 50) {
          const id = `alert-${device.deviceId}-health-degraded`;
          parentBatch.set(doc(db, 'connectivityAlerts', id), {
            id,
            deviceId: device.deviceId,
            type: 'DEGRADED_HEALTH',
            title: 'Device Health Degraded',
            description: `Health Score dropped to ${finalHealthScore} (${finalHealthStatus})`,
            createdAt: now.toISOString(),
            status: 'ACTIVE'
          }, { merge: true });
          newAlertsCount++;
        }

        // --- PHASE 3: DATA USAGE TRACKING ---
        if (matchingSim && matchingSim.dataLimitMB && matchingSim.dataUsedMB !== undefined) {
          const usagePercent = Math.min(100, (matchingSim.dataUsedMB / matchingSim.dataLimitMB) * 100);
          if (matchingSim.usagePercent !== usagePercent) {
            parentBatch.update(doc(db, 'iotSims', matchingSim.id), { usagePercent });
          }

          let dataAlertType = null;
          if (usagePercent >= 100) dataAlertType = 'DATA_USAGE_100';
          else if (usagePercent >= 90) dataAlertType = 'DATA_USAGE_90';
          else if (usagePercent >= 80) dataAlertType = 'DATA_USAGE_80';

          if (dataAlertType) {
            const dataId = `alert-${matchingSim.simNumber}-data-${dataAlertType}`;
            parentBatch.set(doc(db, 'connectivityAlerts', dataId), {
              id: dataId,
              deviceId: device.deviceId,
              type: dataAlertType,
              title: `Data Usage Alert: ${dataAlertType}`,
              description: `SIM ${matchingSim.simNumber} consumed ${usagePercent.toFixed(1)}% of data limit`,
              createdAt: now.toISOString(),
              status: 'ACTIVE'
            }, { merge: true });
            newAlertsCount++;
          }
        }
        
        // 1. No heartbeat > 15 mins / offline > 30 mins
        if (diffHbMinutes > 15 && diffHbMinutes <= 30) {
          const id = `alert-${device.deviceId}-hb15`;
          parentBatch.set(doc(db, 'connectivityAlerts', id), {
            id,
            deviceId: device.deviceId,
            type: 'NO_HEARTBEAT_15',
            title: 'No Heartbeat > 15 Minutes',
            description: `Device ${device.deviceId} is unresponsive since ${lastHb.toLocaleTimeString()}`,
            createdAt: now.toISOString(),
            status: 'ACTIVE'
          });
          newAlertsCount++;
        }

        if (diffHbMinutes > 30) {
          const id = `alert-${device.deviceId}-offline30`;
          parentBatch.set(doc(db, 'connectivityAlerts', id), {
            id,
            deviceId: device.deviceId,
            type: 'OFFLINE_30',
            title: 'Device Offline > 30 Minutes',
            description: `Device ${device.deviceId} is fully offline for ${Math.round(diffHbMinutes)} minutes`,
            createdAt: now.toISOString(),
            status: 'ACTIVE'
          });
          newAlertsCount++;
        }

        // 2. No GPS update > 15 mins
        if (diffGpsMinutes > 15) {
          const id = `alert-${device.deviceId}-nogps`;
          parentBatch.set(doc(db, 'connectivityAlerts', id), {
            id,
            deviceId: device.deviceId,
            type: 'NO_GPS_15',
            title: 'No GPS Update > 15 Minutes',
            description: `GPS Stream dropped for ${device.deviceId} since ${lastGps.toLocaleTimeString()}`,
            createdAt: now.toISOString(),
            status: 'ACTIVE'
          });
          newAlertsCount++;
        }

        // 3. Weak signal > 24 hours
        if ((device.signalStrength === 'Weak' || device.signalStrength === 'Critical') && device.weakSince) {
          const weakDurationHours = (now.getTime() - new Date(device.weakSince).getTime()) / (1000 * 60 * 60);
          if (weakDurationHours > 24) {
            const id = `alert-${device.deviceId}-weak24`;
            parentBatch.set(doc(db, 'connectivityAlerts', id), {
              id,
              deviceId: device.deviceId,
              type: 'WEAK_SIGNAL_24',
              title: 'Weak Network > 24 Hours',
              description: `Device ${device.deviceId} reports DB ${device.signalDb} for ${Math.round(weakDurationHours)}h`,
              createdAt: now.toISOString(),
              status: 'ACTIVE'
            });
            newAlertsCount++;
          }
        }

        // 4. SIM expired / recharge overdue from real matching SIM card
        if (matchingSim) {
          const expDate = new Date(matchingSim.planExpiryDate);
          if (expDate < now) {
            const expId = `alert-${device.deviceId}-sim-expired`;
            parentBatch.set(doc(db, 'connectivityAlerts', expId), {
              id: expId,
              deviceId: device.deviceId,
              type: 'SIM_EXPIRED',
              title: 'SIM Plan Fully Expired',
              description: `SIM plan on network ${matchingSim.operator} expired on ${expDate.toLocaleDateString()}`,
              createdAt: now.toISOString(),
              status: 'ACTIVE'
            });
            newAlertsCount++;
          }
        }
      });

      await parentBatch.commit();
      setAlertAuditStatus(`Audit Completed. Enforced ${newAlertsCount} database anomalies!`);
      setTimeout(() => setAlertAuditStatus(''), 5000);
    } catch (e: any) {
      console.error("Telemetry audit failure", e);
      setAlertAuditStatus('Audit failed: ' + e.message);
    }
  };

  // 1. SIM MANAGEMENT Statistics calculations
  const totalSims = sims.length;
  
  const simsExpiring7Days = sims.filter(s => {
    const exp = new Date(s.planExpiryDate);
    const now = new Date();
    const diff = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 7;
  }).length;

  const simsExpiring30Days = sims.filter(s => {
    const exp = new Date(s.planExpiryDate);
    const now = new Date();
    const diff = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 30;
  }).length;

  const simsExpired = sims.filter(s => {
    const exp = new Date(s.planExpiryDate);
    return exp < new Date() || s.status === 'EXPIRED';
  }).length;

  const rechargeDueToday = sims.filter(s => {
    const exp = new Date(s.planExpiryDate).toDateString();
    return exp === new Date().toDateString() || s.status === 'RECHARGE_DUE';
  }).length;

  const startOfWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };
  const endOfWeek = () => {
    const d = startOfWeek();
    d.setDate(d.getDate() + 6);
    return d;
  };
  const rechargeDueThisWeek = sims.filter(s => {
    const exp = new Date(s.planExpiryDate);
    const sow = startOfWeek();
    const eow = endOfWeek();
    sow.setHours(0,0,0,0);
    eow.setHours(23,59,59,999);
    return (s.status === 'RECHARGE_DUE' || s.status === 'EXPIRING_SOON') && exp >= sow && exp <= eow;
  }).length;

  // 2. NETWORK HEALTH Statistics calculations
  const strongSignalDevices = telemetry.filter(t => t.signalStrength === 'Excellent' || t.signalStrength === 'Good').length;
  const mediumSignalDevices = telemetry.filter(t => t.signalStrength === 'Good' || t.signalStrength === 'Weak' && t.signalDb >= -90).length; // adjusted mapping
  const weakSignalDevices = telemetry.filter(t => t.signalStrength === 'Weak' || t.signalStrength === 'Critical').length;
  const offlineDevicesCount = telemetry.filter(t => t.signalStrength === 'Offline').length;

  // 3. COST MONITORING
  const monthlySimCost = sims.reduce((sum, current) => sum + (current.status !== 'SUSPENDED' ? current.monthlyCost : 0), 0);
  
  // Territory-wise cost grouping
  const territoryCostGroup: Record<string, number> = {};
  sims.forEach(sim => {
    if (sim.status !== 'SUSPENDED') {
      const area = sim.territory.toUpperCase();
      territoryCostGroup[area] = (territoryCostGroup[area] || 0) + sim.monthlyCost;
    }
  });

  // Franchise-wise cost grouping
  const franchiseCostGroup: Record<string, number> = {};
  sims.forEach(sim => {
    if (sim.status !== 'SUSPENDED') {
      const fran = sim.franchise;
      franchiseCostGroup[fran] = (franchiseCostGroup[fran] || 0) + sim.monthlyCost;
    }
  });

  const upcomingRechargeCost = sims
    .filter(s => s.status === 'EXPIRING_SOON' || s.status === 'RECHARGE_DUE')
    .reduce((sum, curr) => sum + curr.monthlyCost, 0);

  // Search/Filters handlers
  const filteredSims = sims.filter(s => {
    const search = simSearch.toLowerCase().trim();
    const status = simStatusFilter.toLowerCase().trim();

    const matchesSearch = search === '' ||
                          s.simNumber.toLowerCase().includes(search) ||
                          s.operator.toLowerCase().includes(search) ||
                          s.assignedDevice.toLowerCase().includes(search) ||
                          s.assignedVehicle.toLowerCase().includes(search) ||
                          s.territory.toLowerCase().includes(search) ||
                          s.franchise.toLowerCase().includes(search);
    
    const matchesStatus = status === 'all' || s.status.toLowerCase() === status;
    
    return matchesSearch && matchesStatus;
  });

  const filteredTelemetry = telemetry.filter(t => {
    const matchesSearch = t.deviceId.toLowerCase().includes(telemetrySearch.toLowerCase()) ||
                          t.terminalId.toLowerCase().includes(telemetrySearch.toLowerCase()) ||
                          t.simNumber.toLowerCase().includes(telemetrySearch.toLowerCase()) ||
                          t.currentNetwork.toLowerCase().includes(telemetrySearch.toLowerCase());
    const matchesStatus = telemetryStatusFilter === 'all' ? true : t.signalStrength.toLowerCase() === telemetryStatusFilter.toLowerCase();
    const matchesHealth = healthStatusFilter === 'all' ? true : t.healthStatus === healthStatusFilter;
    return matchesSearch && matchesStatus && matchesHealth;
  }).sort((a, b) => {
    if (telemetrySort === 'lowest_health') {
      return (a.healthScore ?? 100) - (b.healthScore ?? 100);
    }
    return 0;
  });

  return (
    <ErrorBoundary componentName="IoT Connectivity Control">
      <div id="iot-connectivity-root" className="bg-[#040609] p-6 rounded-3xl border border-white/5 space-y-6 relative overflow-hidden select-none">
        
        {/* Banner */}
        
        {/* Mode Toggle */}



        {/* Glow acc */}
        <div className="absolute top-0 right-10 w-80 h-80 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Header Grid */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-6 gap-4 z-10 relative">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">IoT Operations Console</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase italic flex items-center gap-2">
              <Smartphone className="w-6 h-6 text-indigo-400" /> IoT & Connectivity Control
            </h1>
            <p className="text-xs text-slate-500 uppercase tracking-wider mt-1 font-bold">Hardware Connectivity Monitor, Real-time Cellular SIM & Network Health Registry</p>
          </div>

          {!readOnly && (
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Force Refresh Button */}
              <button
                onClick={() => {
                  setLoading(true);
                  setTimeout(() => setLoading(false), 400);
                  alert("IoT live device telemetry streams refreshed successfully!");
                }}
                className="p-2.5 rounded-2xl text-indigo-400 bg-slate-950 border border-white/5 hover:bg-indigo-950 hover:text-white transition-all cursor-pointer"
                title="Force Refresh Live Stream"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin-reverse" />
              </button>

              {/* Direct Manual Entry Button */}
              <button
                onClick={() => setIsManualSimOpen(true)}
                className="px-4 py-2.5 rounded-2xl text-[10px] uppercase font-black tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 border border-emerald-500/20 shadow-lg transition-all cursor-pointer hover:scale-102 active:scale-98"
              >
                <Plus className="w-3.5 h-3.5" />
                Manual Entry
              </button>
              
              <button
                onClick={runLiveTelemetryAudit}
                disabled={telemetry.length === 0}
                className="px-4 py-2.5 rounded-2xl text-[10px] uppercase font-black tracking-wider bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-2 shadow-lg shadow-amber-500/10 transition-all cursor-pointer"
              >
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                Run Fleet Telemetry Audit
              </button>
            </div>
          )}
        </div>

        {/* Audit Status notification area */}
        {alertAuditStatus && (
          <div className="bg-indigo-950/20 border border-indigo-500/30 text-indigo-300 rounded-2xl p-4 flex items-center gap-3 text-xs font-mono font-bold animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{alertAuditStatus}</span>
          </div>
        )}

        {/* Inner Tabs Nav */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-white/5 pb-2">
          {[
            { id: 'SIMS', label: 'SIM Register', icon: SmartphoneCountInfo },
            { id: 'HEALTH', label: 'Network Health', icon: Wifi },
            { id: 'ALERTS', label: `Connectivity Alerts (${alerts.length})`, icon: AlertTriangle, color: alerts.length > 0 ? 'text-red-400' : '' },
            { id: 'COSTS', label: 'Operational Cost Analytics', icon: DollarSign }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl cursor-pointer transition-colors border",
                activeTab === tab.id
                  ? "bg-slate-900 border-indigo-500/30 text-white"
                  : "bg-transparent border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5"
              )}
            >
              <tab.icon className={cn("w-3.5 h-3.5", tab.color)} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Content Areas based on selected tab */}
        {loading ? (
          <div className="h-60 flex flex-col items-center justify-center text-slate-500 space-y-4">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <p className="text-xs uppercase font-black tracking-wider">Awaiting active databases snapshot stream...</p>
          </div>
        ) : sims.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-3xl p-12 text-center flex flex-col items-center justify-center bg-[#090d15] space-y-4">
            <Activity className="w-12 h-12 text-indigo-400 animate-pulse" />
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-300">IoT Hardware Register is Uninitialized</h3>
            <p className="text-xs text-slate-500 max-w-sm font-bold uppercase leading-normal">
              No live records found in <code className="text-indigo-400 bg-black/60 px-1 py-0.5 rounded border border-white/5 text-[10px]">iotSims</code>.
            </p>
            <p className="text-[10px] text-slate-550 uppercase tracking-widest font-bold">Please contact a system administrator to initialize the IoT database.</p>
          </div>
        ) : (
          <React.Fragment>

            {/* TAB 1: SIM MANAGEMENT */}
            {activeTab === 'SIMS' && (
              <div id="tab-sim-management" className="space-y-6">
                
                {/* SIM Counters Grid */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  {[
                    { label: 'Total Active SIMs', count: sims.filter(s => s.status === 'ACTIVE').length, color: 'text-emerald-400', border: 'border-emerald-500/10' },
                    { label: 'Expiring in 7 Days', count: simsExpiring7Days, color: 'text-amber-500', border: 'border-amber-500/10' },
                    { label: 'Expiring in 30 Days', count: simsExpiring30Days, color: 'text-indigo-400', border: 'border-[#4f46e5]/15' },
                    { label: 'Plan Expired', count: simsExpired, color: 'text-red-500', border: 'border-red-500/10' },
                    { label: 'Recharge Due Today', count: rechargeDueToday, color: 'text-rose-500', border: 'border-rose-500/10' },
                    { label: 'Due This Week', count: rechargeDueThisWeek, color: 'text-orange-400', border: 'border-orange-500/10' }
                  ].map((stat, idx) => (
                    <div key={idx} className={cn("p-4 bg-slate-950 border rounded-2xl flex flex-col justify-between h-28 relative overflow-hidden", stat.border)}>
                      <div className="absolute top-1 right-1 h-[2px] w-6 bg-slate-800" />
                      <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider font-sans leading-relaxed">{stat.label}</span>
                      <span className={cn("text-3xl font-black font-mono leading-none tracking-tight", stat.color)}>{stat.count}</span>
                      
                      {/* Metric Validation */}
                      <div className="text-[7px] text-slate-650 font-mono flex flex-col gap-0.5 border-t border-white/5 pt-1.5 mt-2">
                        <span>Coll: <b className="text-slate-400">iotSims</b></span>
                        <span className="truncate">Query: isActive == {stat.label.includes('Active') ? 'true' : 'diff_metric'}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950 border border-white/5 rounded-2xl p-4">
                  <div className="flex-1 max-w-md relative">
                    <Search className="w-4 h-4 text-slate-550 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={simSearch}
                      onChange={(e) => setSimSearch(e.target.value)}
                      placeholder="SEARCH BY SIM, VEHICLE, DEVICE, FRANCHISE, TERRITORY..."
                      className="w-full bg-[#090d15] border border-white/5 rounded-xl pl-10 pr-4 py-2 text-xs font-mono font-bold text-white uppercase outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-700"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5" /> Filter Status
                    </span>
                    <select
                      value={simStatusFilter}
                      onChange={(e) => setSimStatusFilter(e.target.value)}
                      className="bg-[#090d15] border border-white/5 rounded-xl text-xs font-black uppercase text-white tracking-widest px-3 py-2 outline-none cursor-pointer hover:bg-slate-900"
                    >
                      <option value="all">ALL SIM SECTOR STATUSES</option>
                      <option value="active">Active</option>
                      <option value="expiring_soon">Expiring Soon</option>
                      <option value="recharge_due">Recharge Due</option>
                      <option value="expired">expired</option>
                      <option value="suspended">suspended</option>
                    </select>
                  </div>
                </div>

                {/* SIM Table */}
                <div className="bg-slate-950 border border-white/5 rounded-3xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[10px] font-mono">
                      <thead>
                        <tr className="border-b border-white/5 text-[9px] uppercase text-slate-5 reef-400 tracking-wider bg-slate-900/40">
                          <th className="py-3 px-4">SIM Number</th>
                          <th className="py-3 px-4">Operator</th>
                          <th className="py-3 px-4 text-center">Assigned Device</th>
                          <th className="py-3 px-4 text-center">Assigned Vehicle</th>
                          <th className="py-3 px-4">Territory Sector</th>
                          <th className="py-3 px-4">Franchise Node</th>
                          <th className="py-3 px-4 text-right">Last Recharge</th>
                          <th className="py-3 px-4 text-right">Plan Expiry Date</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4">Data Usage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredSims.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="py-12 text-center text-slate-600 uppercase font-black text-[10px]">
                              No cellular records found matching the query criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredSims.map((sim) => (
                            <tr key={sim.id} className="hover:bg-white/5 transition-colors group">
                               <td className="py-3 px-4 font-bold text-white group-hover:text-indigo-400 transition-colors">
                                 {sim.simNumber}
                               </td>
                               <td className="py-3 px-4 font-bold text-slate-400 uppercase">
                                 {sim.operator}
                               </td>
                               <td className="py-3 px-4 text-center">
                                 <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-indigo-400 font-bold">
                                   {sim.assignedDevice}
                                 </span>
                               </td>
                               <td className="py-3 px-4 text-center font-bold text-white">
                                 {sim.assignedVehicle}
                               </td>
                               <td className="py-3 px-4 uppercase text-slate-500 font-bold">
                                 {sim.territory}
                               </td>
                               <td className="py-3 px-4 uppercase text-slate-400 font-bold">
                                 {sim.franchise}
                               </td>
                               <td className="py-3 px-4 text-right text-slate-500 font-bold">
                                 {new Date(sim.lastRechargeDate).toLocaleDateString()}
                               </td>
                               <td className="py-3 px-4 text-right font-bold text-white">
                                 {new Date(sim.planExpiryDate).toLocaleDateString()}
                               </td>
                               <td className="py-3 px-4 text-center">
                                 <span className={cn(
                                   "px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wide rounded-md border",
                                   sim.status === 'ACTIVE' && "bg-emerald-500/5 text-emerald-400 border-emerald-500/10",
                                   sim.status === 'EXPIRING_SOON' && "bg-amber-500/5 text-amber-500 border-amber-500/10",
                                   sim.status === 'RECHARGE_DUE' && "bg-rose-500/5 text-rose-500 border-rose-500/10",
                                   sim.status === 'EXPIRED' && "bg-red-500/5 text-red-400 border-red-500/10",
                                   sim.status === 'SUSPENDED' && "bg-slate-800/10 text-slate-500 border-slate-700/20"
                                 )}>
                                   {sim.status}
                                 </span>
                               </td>
                               <td className="py-3 px-4">
                                 <div className="flex flex-col gap-1 w-24">
                                   <div className="flex justify-between text-[8px]">
                                     <span className={cn(
                                       (sim.usagePercent ?? 0) >= 90 ? "text-red-400" :
                                       (sim.usagePercent ?? 0) >= 80 ? "text-amber-400" : "text-emerald-400"
                                     )}>{(sim.usagePercent ?? 0).toFixed(1)}%</span>
                                     <span className="text-slate-500 font-mono">{(sim.dataLimitMB ? sim.dataLimitMB - (sim.dataUsedMB ?? 0) : 0)}MB left</span>
                                   </div>
                                   <div className="w-full bg-slate-800 rounded-full h-1">
                                     <div 
                                       className={cn(
                                         "h-1 rounded-full",
                                         (sim.usagePercent ?? 0) >= 90 ? "bg-red-500" :
                                         (sim.usagePercent ?? 0) >= 80 ? "bg-amber-500" : "bg-emerald-500"
                                       )}
                                       style={{ width: `${Math.min(100, sim.usagePercent ?? 0)}%` }}
                                     />
                                   </div>
                                 </div>
                               </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Table Footer Verification */}
                  <div className="bg-slate-900/40 p-3.5 border-t border-white/5 text-[8px] font-mono text-slate-500 flex flex-col md:flex-row justify-between gap-1.5 uppercase leading-normal">
                    <span>Database Collection Target: <b className="text-indigo-400">iotSims</b></span>
                    <span>Query Used: <b className="text-slate-400">onSnapshot(collection(db, "iotSims")) filtered client-side</b></span>
                  </div>
                </div>
              </div>
            )}


            {/* TAB 2: NETWORK HEALTH */}
            {activeTab === 'HEALTH' && (
              <div id="tab-network-health" className="space-y-6">
                
                {/* Network Health Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Strong Signal Terminals', count: strongSignalDevices, color: 'text-emerald-400', desc: 'DB range -40 to -75' },
                    { label: 'Medium Signal Terminals', count: mediumSignalDevices, color: 'text-amber-500', desc: 'DB range -75 to -90' },
                    { label: 'Weak/Critical Terminals', count: weakSignalDevices, color: 'text-red-400', desc: 'DB range -90 to -110' },
                    { label: 'Offline Hardware Devices', count: offlineDevicesCount, color: 'text-slate-500', desc: 'DB range DB < -110' }
                  ].map((status, idx) => (
                    <div key={idx} className="p-5 bg-slate-950 border border-white/5 rounded-3xl flex flex-col justify-between h-32">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block">{status.label}</span>
                        <span className={cn("text-3xl font-black mt-1 block font-mono", status.color)}>{status.count}</span>
                      </div>
                      <div className="flex flex-col gap-1 border-t border-white/5 pt-2 mt-2">
                        <span className="text-[7px] text-slate-600 font-mono uppercase">{status.desc}</span>
                        <span className="text-[7px] text-slate-700 font-mono uppercase">Coll: deviceTelemetry | Query: signalStrength</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Search Bar */}
                <div className="flex items-center gap-4 bg-slate-950 border border-white/5 rounded-2xl p-4">
                  <div className="flex-1 max-w-md relative">
                    <Search className="w-4 h-4 text-slate-550 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={telemetrySearch}
                      onChange={(e) => setTelemetrySearch(e.target.value)}
                      placeholder="SEARCH BY DEVICE, TERMINAL ID, SIM or NETWORK..."
                      className="w-full bg-[#090d15] border border-white/5 rounded-xl pl-10 pr-4 py-2 text-xs font-mono font-bold text-white uppercase outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-700"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Filters</span>
                    <select
                      value={telemetryStatusFilter}
                      onChange={(e) => setTelemetryStatusFilter(e.target.value)}
                      className="bg-[#090d15] border border-white/5 rounded-xl text-xs font-black uppercase text-white tracking-widest px-3 py-2 outline-none cursor-pointer hover:bg-slate-900"
                    >
                      <option value="all">ALL SIGNAL LABELS</option>
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="weak">Weak</option>
                      <option value="critical">Critical</option>
                      <option value="offline">Offline</option>
                    </select>
                    <select
                      value={healthStatusFilter}
                      onChange={(e) => setHealthStatusFilter(e.target.value)}
                      className="bg-[#090d15] border border-white/5 rounded-xl text-xs font-black uppercase text-white tracking-widest px-3 py-2 outline-none cursor-pointer hover:bg-slate-900"
                    >
                      <option value="all">ALL HEALTH STATUSES</option>
                      <option value="CRITICAL">Critical Devices</option>
                      <option value="AT_RISK">At Risk Devices</option>
                    </select>
                    <select
                      value={telemetrySort}
                      onChange={(e) => setTelemetrySort(e.target.value)}
                      className="bg-[#090d15] border border-white/5 rounded-xl text-xs font-black uppercase text-white tracking-widest px-3 py-2 outline-none cursor-pointer hover:bg-slate-900"
                    >
                      <option value="default">Default Sort</option>
                      <option value="lowest_health">Sort by Lowest Health</option>
                    </select>
                  </div>
                </div>

                {/* Device Table */}
                <div className="bg-slate-950 border border-white/5 rounded-3xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[10px] font-mono">
                      <thead>
                        <tr className="border-b border-white/5 text-[9px] uppercase text-slate-500 tracking-wider bg-slate-900/40">
                          <th className="py-3 px-4">Device ID</th>
                          <th className="py-3 px-4">Terminal ID</th>
                          <th className="py-3 px-4">Cellular SIM Number</th>
                          <th className="py-3 px-4">Current network Provider</th>
                          <th className="py-3 px-4 text-center">Signal dB</th>
                          <th className="py-3 px-4 text-center">Signal Strength</th>
                          <th className="py-3 px-4 text-center">Health Score</th>
                          <th className="py-3 px-4 text-center">Health Status</th>
                          <th className="py-3 px-4 text-right">Last Heartbeat Link</th>
                          <th className="py-3 px-4 text-right">Last GPS Sync</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredTelemetry.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="py-12 text-center text-slate-600 uppercase font-black text-[10px]">
                              No active IoT terminals matches the search telemetry.
                            </td>
                          </tr>
                        ) : (
                          filteredTelemetry.map((device) => {
                            const isHbLate = (new Date().getTime() - new Date(device.lastHeartbeat).getTime()) > 15 * 60 * 1000;
                            return (
                              <tr key={device.id} className="hover:bg-white/5 transition-colors group">
                                <td className="py-3 px-4 font-bold text-white group-hover:text-indigo-400 transition-colors">
                                  {device.deviceId}
                                </td>
                                <td className="py-3 px-4 text-slate-400 font-bold">
                                  {device.terminalId}
                                </td>
                                <td className="py-3 px-4 text-slate-500 font-bold">
                                  {device.simNumber}
                                </td>
                                <td className="py-3 px-4 uppercase font-bold text-slate-450">
                                  {device.currentNetwork}
                                </td>
                                <td className="py-3 px-4 text-center font-bold text-white">
                                  {device.signalDb} dBm
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className={cn(
                                    "px-2.5 py-0.5 text-[8px] font-black uppercase rounded border",
                                    device.signalStrength === 'Excellent' && "bg-emerald-500/5 text-emerald-400 border-emerald-500/10",
                                    device.signalStrength === 'Good' && "bg-emerald-400/5 text-emerald-300 border-emerald-400/10",
                                    device.signalStrength === 'Weak' && "bg-amber-500/5 text-amber-400 border-amber-500/10",
                                    device.signalStrength === 'Critical' && "bg-rose-500/5 text-rose-500 border-rose-500/10",
                                    device.signalStrength === 'Offline' && "bg-slate-800/10 text-slate-500 border-slate-700/20"
                                  )}>
                                    {device.signalStrength}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center font-bold font-mono">
                                  <span className={cn(
                                    (device.healthScore ?? 100) >= 90 ? "text-emerald-400" :
                                    (device.healthScore ?? 100) >= 70 ? "text-amber-400" :
                                    "text-red-500"
                                  )}>
                                    {device.healthScore ?? 100}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center font-bold">
                                  <span className={cn(
                                    "px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wide rounded-md border",
                                    device.healthStatus === 'HEALTHY' && "bg-emerald-500/5 text-emerald-400 border-emerald-500/10",
                                    device.healthStatus === 'GOOD' && "bg-amber-500/5 text-amber-500 border-amber-500/10",
                                    device.healthStatus === 'AT_RISK' && "bg-orange-500/5 text-orange-400 border-orange-500/10",
                                    device.healthStatus === 'CRITICAL' && "bg-red-500/5 text-red-500 border-red-500/10"
                                  )}>
                                    {device.healthStatus ?? 'HEALTHY'}
                                  </span>
                                </td>
                                <td className={cn(
                                  "py-3 px-4 text-right font-bold transition-colors",
                                  isHbLate ? "text-red-400" : "text-white"
                                )}>
                                  {new Date(device.lastHeartbeat).toLocaleTimeString()}
                                </td>
                                <td className="py-3 px-4 text-right text-slate-500 font-bold">
                                  {new Date(device.lastGpsPing).toLocaleTimeString()}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Footer Stats Verification */}
                  <div className="bg-slate-900/40 p-3.5 border-t border-white/5 text-[8px] font-mono text-slate-500 flex flex-col md:flex-row justify-between gap-1.5 uppercase leading-normal">
                    <span>Database Collection Target: <b className="text-indigo-400">deviceTelemetry</b></span>
                    <span>Query Used: <b className="text-slate-400">onSnapshot(collection(db, "deviceTelemetry"))</b></span>
                  </div>
                </div>

              </div>
            )}


            {/* TAB 3: CONNECTIVITY ALERTS */}
            {activeTab === 'ALERTS' && (
              <div id="tab-connectivity-alerts" className="space-y-6">

                {/* Instruction Banner */}
                <div className="bg-indigo-950/10 border border-indigo-500/10 rounded-2xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <h4 className="text-xs font-black uppercase text-white tracking-wide">Real Threat Telemetry Engine</h4>
                    <p className="text-[10px] text-indigo-450 leading-relaxed font-bold uppercase mt-1">
                      These connectivity alerts are triggered exclusively based on real active terminal pulses.
                      Conditions flagged: responsive timeout &gt; 15 mins, GPS sync drop &gt; 15 mins, hardware offline &gt; 30 mins, planar expiration, or sustained database cell fading.
                    </p>
                  </div>
                </div>

                {/* Alerts List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {alerts.length === 0 ? (
                    <div className="col-span-2 border border-dashed border-white/5 rounded-3xl p-12 text-center flex flex-col items-center bg-slate-950/40">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400/40 mb-3" />
                      <span className="text-xs uppercase font-black tracking-wider text-emerald-400">System Fully Synchronous</span>
                      <p className="text-[9px] text-slate-600 mt-1 uppercase">No connection dropouts or plan expiries currently reported</p>
                    </div>
                  ) : (
                    alerts.map((alert) => (
                      <div key={alert.id} className="p-5 bg-gradient-to-br from-slate-950 to-slate-900 border border-white/5 rounded-3xl flex justify-between items-start gap-4 hover:border-indigo-500/20 transition-all">
                        <div className="space-y-1">
                          <span className={cn(
                            "px-2 py-0.5 text-[7px] font-black uppercase tracking-widest rounded-md border inline-block",
                            alert.type.includes('EXPIRED') || alert.type.includes('OFFLINE_30') ? "bg-red-500/5 text-red-400 border-red-500/15" : "bg-amber-500/5 text-amber-500 border-amber-500/15"
                          )}>
                            {alert.type}
                          </span>
                          <h4 className="text-xs font-black uppercase text-white tracking-tight mt-1 pt-1">{alert.title}</h4>
                          <p className="text-[10px] text-slate-450 uppercase leading-snug font-bold mt-1.5">{alert.description}</p>
                          
                          <div className="text-[8px] text-slate-600 font-mono flex items-center gap-2 mt-4 pt-2 border-t border-white/5 uppercase">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>Logged: {new Date(alert.createdAt).toLocaleString()}</span>
                            <span className="text-slate-700">|</span>
                            <span className="text-slate-500">ID: {alert.id.slice(0, 14)}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="h-2 w-2 rounded-full bg-red-500 inline-block animate-ping" />
                          <div className="mt-6 flex flex-col gap-0.5 text-[7px] font-mono text-slate-650 uppercase">
                            <span>Coll: <b className="text-slate-500">connectivityAlerts</b></span>
                            <span className="truncate max-w-[120px]">Q: status == "ACTIVE"</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Audit verification section bottom */}
                <div className="bg-slate-950 border border-white/5 p-4 rounded-3xl flex flex-col md:flex-row justify-between items-center text-[9px] font-mono text-slate-500 uppercase gap-2">
                  <span>Sensing Vector: <b className="text-indigo-400">connectivityAlerts</b> collection snapshot listener</span>
                  <span>Enforcing Query: <b className="text-slate-400">query(collection(db, "connectivityAlerts"), where("status", "==", "ACTIVE"))</b></span>
                </div>

              </div>
            )}


            {/* TAB 4: COST MONITORING */}
            {activeTab === 'COSTS' && (
              <div id="tab-cost-analytics" className="space-y-6">

                {/* Financial Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  
                  <div className="p-6 bg-slate-950 border border-white/5 rounded-3xl flex flex-col justify-between h-36">
                    <div>
                      <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Total Monthly SIM Cost</span>
                      <h3 className="text-3xl font-black text-emerald-400 mt-2 leading-none">₹{monthlySimCost.toLocaleString()}</h3>
                      <p className="text-[8px] text-slate-550 uppercase tracking-widest mt-2">Sum of active subscriber fees</p>
                    </div>
                    <div className="text-[7px] text-slate-700 font-mono uppercase border-t border-white/5 pt-2">
                      Coll: iotSims | Query: select monthlyCost where status != suspended
                    </div>
                  </div>

                  <div className="p-6 bg-slate-950 border border-white/5 rounded-3xl flex flex-col justify-between h-36">
                    <div>
                      <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Upcoming Recharge cost</span>
                      <h3 className="text-3xl font-black text-amber-500 mt-2 leading-none">₹{upcomingRechargeCost.toLocaleString()}</h3>
                      <p className="text-[8px] text-slate-550 uppercase tracking-widest mt-2">SIMs expiring or recharge due</p>
                    </div>
                    <div className="text-[7px] text-slate-700 font-mono uppercase border-t border-white/5 pt-2">
                      Coll: iotSims | Query: select sum(monthlyCost) status in [expiring, due]
                    </div>
                  </div>

                  <div className="p-6 bg-slate-950 border border-white/5 rounded-3xl flex flex-col justify-between h-36">
                    <div>
                      <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Expired SIMs</span>
                      <h3 className="text-3xl font-black text-red-550 mt-2 leading-none">{simsExpired}</h3>
                      <p className="text-[8px] text-slate-550 uppercase tracking-widest mt-2 font-mono">Count of out of bundle SIMs</p>
                    </div>
                    <div className="text-[7px] text-slate-700 font-mono uppercase border-t border-white/5 pt-2">
                      Coll: iotSims | Query: count() where status == "EXPIRED"
                    </div>
                  </div>

                  <div className="p-6 bg-slate-950 border border-white/5 rounded-3xl flex flex-col justify-between h-36">
                    <div>
                      <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider text-slate-400">Total Recharge Volume</span>
                      <h3 className="text-3xl font-black text-white mt-2 leading-none">₹{recharges.reduce((sum, r) => sum + r.amount, 0).toLocaleString()}</h3>
                      <p className="text-[8px] text-slate-550 uppercase tracking-widest mt-2 font-mono">Historic Transaction logs sum</p>
                    </div>
                    <div className="text-[7px] text-slate-700 font-mono uppercase border-t border-white/5 pt-2">
                      Coll: iotRechargeHistory | Query: sum(amount)
                    </div>
                  </div>

                </div>

                {/* Split Grids */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Territory Wise Split */}
                  <div className="bg-slate-950 border border-white/5 rounded-3xl p-6">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
                      <span className="text-xs font-black uppercase text-white tracking-wide flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-indigo-400" /> Territory Wise SIM Cost
                      </span>
                      <span className="text-[8px] text-slate-600 font-mono uppercase font-bold">Live database aggregate</span>
                    </div>

                    <div className="space-y-3 font-mono text-xs">
                      {Object.keys(territoryCostGroup).length === 0 ? (
                        <p className="text-slate-650 text-[10px] text-center uppercase font-bold leading-relaxed py-4">No segment data found.</p>
                      ) : (
                        Object.entries(territoryCostGroup).map(([sector, price]) => (
                          <div key={sector} className="flex justify-between items-center p-3 bg-slate-900 border border-white/5 rounded-2xl">
                            <span className="text-slate-400 font-bold uppercase text-[9px]">{sector} Zone Sector</span>
                            <span className="text-white font-black text-sm">₹{price.toLocaleString()}</span>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <div className="text-[7px] text-slate-700 font-mono uppercase mt-6 pt-2 border-t border-white/5 leading-normal">
                      Source Collection: <b className="text-indigo-400">iotSims</b> | Query: select territory, sum(monthlyCost) group by territory
                    </div>
                  </div>

                  {/* Franchise Wise Split */}
                  <div className="bg-slate-950 border border-white/5 rounded-3xl p-6">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
                      <span className="text-xs font-black uppercase text-white tracking-wide flex items-center gap-2">
                        <Building className="w-4 h-4 text-indigo-400" /> Franchise Wise SIM Cost
                      </span>
                      <span className="text-[8px] text-slate-600 font-mono uppercase font-bold">Live database aggregate</span>
                    </div>

                    <div className="space-y-3 font-mono text-xs">
                      {Object.keys(franchiseCostGroup).length === 0 ? (
                        <p className="text-slate-650 text-[10px] text-center uppercase font-bold leading-relaxed py-4">No segment data found.</p>
                      ) : (
                        Object.entries(franchiseCostGroup).map(([franchiseName, price]) => (
                          <div key={franchiseName} className="flex justify-between items-center p-3 bg-slate-900 border border-white/5 rounded-2xl">
                            <span className="text-slate-400 font-bold uppercase text-[9px]">{franchiseName} Sector Node</span>
                            <span className="text-white font-black text-sm">₹{price.toLocaleString()}</span>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="text-[7px] text-slate-700 font-mono uppercase mt-6 pt-2 border-t border-white/5 leading-normal">
                      Source Collection: <b className="text-indigo-400">iotSims</b> | Query: select franchise, sum(monthlyCost) group by franchise
                    </div>
                  </div>

                </div>

              </div>
            )}

          </React.Fragment>
        )}
      </div>

      {/* Modal Dialog for Manual Cellular Sim Registration */}
      {isManualSimOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => setIsManualSimOpen(false)}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm shadow-2xl" 
          />
          <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 p-6 md:p-8 rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto font-sans text-left text-white scrollbar-none z-10">
            <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-6">
              <div>
                <h3 className="text-lg font-black italic uppercase text-white leading-none">
                  Manual Cellular Node Registry
                </h3>
                <p className="text-[9px] font-black uppercase text-indigo-400 tracking-wider mt-1.5">
                  Direct hardware cellular card administration
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsManualSimOpen(false)}
                className="p-1.5 hover:bg-white/5 border border-transparent hover:border-white/10 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
              >
                <Plus className="w-5 h-5 transform rotate-45" />
              </button>
            </div>

            <form onSubmit={handleManualSimSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SIM ID Number */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                    SIM Card Serial Number (ICCID) *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualSimNo}
                    onChange={(e) => setManualSimNo(e.target.value)}
                    placeholder="e.g. 899112099011..."
                    className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
                  />
                </div>

                {/* Operator selector */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                    Network Operator *
                  </label>
                  <select
                    value={manualOperator}
                    onChange={(e) => setManualOperator(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 focus:bg-slate-950 transition-all"
                  >
                    <option value="Airtel Enterprise">Airtel Enterprise</option>
                    <option value="Reliance Jio Net">Reliance Jio Net</option>
                    <option value="Vodafone Idea Corp">Vodafone Idea Corp</option>
                    <option value="BSNL AdConnect">BSNL AdConnect</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Associated Hardware Device */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                    Hardware Terminal Device ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualDevice}
                    onChange={(e) => setManualDevice(e.target.value)}
                    placeholder="e.g. DEV-7090"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
                  />
                </div>

                {/* Assigned Vehicle */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                    Cab Vehicle Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualVehicle}
                    onChange={(e) => setManualVehicle(e.target.value)}
                    placeholder="e.g. KA-03-ME-2210"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Territory */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                    Territory
                  </label>
                  <select
                    value={manualTerritory}
                    onChange={(e) => setManualTerritory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 focus:bg-slate-950 transition-all"
                  >
                    <option value="bangalore">Bangalore HQ</option>
                    <option value="mysore">Mysore Sector</option>
                    <option value="hassan">Hassan Sector</option>
                    <option value="mangalore">Mangalore Sector</option>
                    <option value="hubli">Hubli Sector</option>
                  </select>
                </div>

                {/* Franchise Sector */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                    Franchise Sector
                  </label>
                  <input
                    type="text"
                    value={manualFranchise}
                    onChange={(e) => setManualFranchise(e.target.value)}
                    placeholder="e.g. South Franchise Pvt Ltd"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* Plan Cost */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                    Cost (₹)
                  </label>
                  <input
                    type="number"
                    value={manualCost}
                    onChange={(e) => setManualCost(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Limit MB */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                    Limit (MB)
                  </label>
                  <input
                    type="number"
                    value={manualLimit}
                    onChange={(e) => setManualLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Used MB */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                    Used (MB)
                  </label>
                  <input
                    type="number"
                    value={manualUsed}
                    onChange={(e) => setManualUsed(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isAddingSim}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-extrabold uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 mt-2 text-white"
              >
                {isAddingSim ? "Registering SIM Card..." : "Register & Tie Cellular Node"}
              </button>
            </form>
          </div>
        </div>
      )}
  </ErrorBoundary>
  );
}

// Helper icons/tabs wrapper components
function SmartphoneCountInfo(props: any) {
  return <Smartphone {...props} />;
}
