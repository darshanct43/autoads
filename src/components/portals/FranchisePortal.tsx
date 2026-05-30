import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Tablet, 
  TrendingUp, 
  MapPin, 
  Activity, 
  FileText, 
  LogOut, 
  Plus, 
  Check, 
  X, 
  Clock, 
  Shield, 
  DollarSign, 
  ChevronRight, 
  AlertCircle, 
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  TrendingDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  setDoc,
  updateDoc, 
  doc, 
  onSnapshot,
  orderBy,
  limit
} from 'firebase/firestore';
import { getCityName, getFranchiseName } from '@/modules/cityManagement/cities';
import { writeAuditLog } from '@/modules/support/supportDashboardService';

interface FranchisePortalProps {
  onLogout: () => void;
}

export default function FranchisePortal({ onLogout }: FranchisePortalProps) {
  const [activeTab, setActiveTab] = useState<'METRICS' | 'DRIVERS' | 'CAMPAIGNS' | 'TICKETS' | 'AUDIT'>('METRICS');
  
  // Scoping metrics
  const [userProfile, setUserProfile] = useState<any>(null);
  const [cityId, setCityId] = useState<string>('mysore'); // fallback
  const [franchiseId, setFranchiseId] = useState<string>('fr-mys-01'); // fallback

  const [drivers, setDrivers] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Modals / Input states
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [newDriver, setNewDriver] = useState({
    name: '',
    email: '',
    phone: '',
    upi: '',
    aadhaar: '',
    license: ''
  });
  
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    message: '',
    priority: 'HIGH'
  });

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch current user scope
  useEffect(() => {
    const fetchUserScope = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userSnap = await getDocs(query(collection(db, 'users'), where('email', '==', user.email)));
          if (!userSnap.empty) {
            const data = userSnap.docs[0].data();
            setUserProfile({ id: userSnap.docs[0].id, ...data });
            if (data.cityId) setCityId(data.cityId);
            if (data.franchiseId) setFranchiseId(data.franchiseId);
          } else {
            // Check fallback for demo account
            setUserProfile({
              name: 'Franchise Partner',
              email: user.email,
              role: 'FRANCHISE_OWNER',
              cityId: 'mysore',
              franchiseId: 'fr-mys-01'
            });
          }
        } catch (err) {
          console.warn('[FRANCHISE] Error loading profile scope:', err);
        }
      }
    };
    fetchUserScope();
  }, []);

  // Listen to scoped Drivers, Devices, Campaigns, Support Tickets, Activity Logs
  useEffect(() => {
    if (!cityId || !franchiseId) return;

    // Listen to drivers scoped to this city/franchis
    const drQuery = query(collection(db, 'drivers'), where('cityId', '==', cityId));
    const unsubDrivers = onSnapshot(drQuery, (snap) => {
      let items: any[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (items.length === 0 && userProfile?.email === 'franchise@autoads.in') {
        items = [
          { id: 'mock-dr-1', driverId: 'mock-dr-1', name: 'Sanjay Gowda', phone: '9876543210', email: 'sanjay@example.com', kycStatus: 'APPROVED', status: 'ACTIVE', upiId: 'sanjay@ybl', cityId },
          { id: 'mock-dr-2', driverId: 'mock-dr-2', name: 'Ramesh Babu', phone: '9876588210', email: 'ramesh@example.com', kycStatus: 'PENDING', status: 'PENDING', cityId },
          { id: 'mock-dr-3', driverId: 'mock-dr-3', name: 'Arun Kumar', phone: '9988776655', email: 'arun@example.com', kycStatus: 'APPROVED', status: 'ACTIVE', upiId: 'arun@axl', cityId },
        ];
      }
      setDrivers(items);
    }, (err) => console.warn('[FRANCHISE] Listen drivers err:', err));

    // Listen to devices
    const devQuery = query(collection(db, 'devices'), where('cityId', '==', cityId));
    const unsubDevices = onSnapshot(devQuery, (snap) => {
      let items: any[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (items.length === 0 && userProfile?.email === 'franchise@autoads.in') {
        items = [
          { id: 'DEV-MYS-001', driverId: 'mock-dr-1', status: 'ONLINE', cityId, earnings: 450 },
          { id: 'DEV-MYS-002', driverId: 'mock-dr-3', status: 'ONLINE', cityId, earnings: 320 },
          { id: 'DEV-MYS-003', driverId: null, status: 'OFFLINE', cityId, earnings: 0 },
        ];
      }
      setDevices(items);
    });

    // Listen to campaigns targeted to this city
    const campQuery = query(collection(db, 'campaigns'), where('cityId', '==', cityId));
    const unsubCampaigns = onSnapshot(campQuery, (snap) => {
      let items: any[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (items.length === 0 && userProfile?.email === 'franchise@autoads.in') {
        items = [
          { id: 'CAMP-M-1', title: 'Mysore Dasara Festivities', status: 'LIVE', mediaType: 'IMAGE', mediaUrl: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=800', safeContent: true, kidsSafe: true, categoryTags: ['tourism'] },
          { id: 'CAMP-M-2', title: 'Local Bakery Ads', status: 'PENDING', mediaType: 'VIDEO', mediaUrl: 'https://cdn.pixabay.com/video/2019/02/08/21262-316499880_tiny.mp4', safeContent: true, kidsSafe: true, categoryTags: ['food'] }
        ];
      }
      setCampaigns(items);
    });

    // Listen to localized support tickets
    const ticketQuery = query(collection(db, 'supportTickets'), where('cityId', '==', cityId));
    const unsubTickets = onSnapshot(ticketQuery, (snap) => {
      let items: any[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (items.length === 0 && userProfile?.email === 'franchise@autoads.in') {
        items = [
          { id: 'TKT-M-01', subject: 'Device Screen Glitch', message: 'The screen is flickering on bumpy roads.', priority: 'HIGH', status: 'OPEN', createdAt: new Date().toISOString() },
          { id: 'TKT-M-02', subject: 'Payout Delay', message: 'Last week payment not reflected in account.', priority: 'MEDIUM', status: 'IN_PROGRESS', createdAt: new Date(Date.now() - 86400000).toISOString() }
        ];
      }
      setTickets(items);
    });

    // Listen to localized audit logs
    const logQuery = query(
      collection(db, 'activityLogs'), 
      where('cityId', '==', cityId),
      orderBy('timestamp', 'desc'),
      limit(25)
    );
    const unsubLogs = onSnapshot(logQuery, (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAuditLogs(items);
    }, (err) => {
      // Fail gracefully if index is missing
      console.warn('[FRANCHISE] Log index warning:', err.message);
    });

    return () => {
      unsubDrivers();
      unsubDevices();
      unsubCampaigns();
      unsubTickets();
      unsubLogs();
    };
  }, [cityId, franchiseId]);

  // Handle local driver registration under the city scope
  const handleRegisterDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriver.name || !newDriver.phone || !newDriver.email) {
      showToast('All primary details are required', 'error');
      return;
    }

    try {
      // 1. Create User authentication Profile document
      const uidTemp = `dr_${Date.now()}`;
      await setDoc(doc(db, 'users', uidTemp), {
        id: uidTemp,
        name: newDriver.name,
        email: newDriver.email,
        phone: newDriver.phone,
        role: 'DRIVER',
        cityId,
        franchiseId,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      });

      // 2. Create corresponding Drivers Profiling document
      await setDoc(doc(db, 'drivers', uidTemp), {
        driverId: uidTemp,
        cityId,
        franchiseId,
        payoutEnabled: false,
        adminApproved: false,
        kycStatus: 'PENDING',
        status: 'PENDING',
        documents: {
          aadhaar: newDriver.aadhaar || 'unprovided_offline',
          drivingLicense: newDriver.license || 'unprovided_offline',
          selfie: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
        },
        upiId: newDriver.upi || 'unprovided',
        registeredAt: new Date().toISOString()
      });

      // Audit Logger
      await writeAuditLog(
        'franchise_driver_registered',
        uidTemp,
        cityId,
        franchiseId,
        `Enrolled new driver ${newDriver.name} on franchise ledger`
      );

      showToast(`Driver ${newDriver.name} registered under ${getCityName(cityId)}! Pending Support KYC Review.`);
      setShowAddDriver(false);
      setNewDriver({ name: '', email: '', phone: '', upi: '', aadhaar: '', license: '' });
    } catch (err: any) {
      showToast(err.message || 'Driver enrollment failed', 'error');
    }
  };

  const handleRaiseTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.subject || !newTicket.message) {
      showToast('Need subject and issue description', 'error');
      return;
    }
    try {
      await addDoc(collection(db, 'supportTickets'), {
        subject: newTicket.subject,
        message: newTicket.message,
        priority: newTicket.priority,
        status: 'OPEN',
        cityId,
        franchiseId,
        createdAt: new Date().toISOString()
      });
      showToast('Ticket escalated to Global Headquarters successfully!');
      setShowTicketModal(false);
      setNewTicket({ subject: '', message: '', priority: 'HIGH' });
    } catch (err: any) {
      showToast('Failed to raise ticket', 'error');
    }
  };

  // Switch ticket status locally
  const updateTicketStatus = async (id: string, newStatus: 'OPEN' | 'IN_PROGRESS' | 'CLOSED') => {
    try {
      await updateDoc(doc(db, 'supportTickets', id), {
        status: newStatus
      });
      await writeAuditLog(
        'franchise_ticket_updated',
        id,
        cityId,
        franchiseId,
        `Franchise owner adjusted local issue ticket status to ${newStatus}`
      );
      showToast('Local issue adjusted resolved successfully');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Local calculation summaries
  const onlineDevicesCount = devices.filter(d => d.status === 'ONLINE' || d.status === 'ACTIVE').length;
  const activeAutosCount = drivers.filter(dr => dr.status === 'ACTIVE' || dr.adminApproved).length;
  const potentialEarnings = activeAutosCount * 12500; // Mock calculation based on local rides
  const localComplaintCount = tickets.filter(t => t.status !== 'CLOSED').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/30">
      
      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl border shadow-xl ${
              toast.type === 'success' 
                ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200' 
                : 'bg-rose-950/90 border-rose-500/30 text-rose-200'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle size={20} className="text-emerald-400" /> : <AlertTriangle size={20} className="text-rose-400" />}
            <span className="text-xs font-semibold tracking-wide">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Rail */}
      <header className="border-b border-indigo-900/40 bg-[#0A0B10]/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg shadow-indigo-500/20 border border-indigo-500/30">
            <img src="/mayaan_logo.svg" alt="Mayaan Logo" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = "/mayaan_logo.jpeg")} />
          </div>
          <div>
            <h1 className="text-lg font-black italic text-white uppercase tracking-tighter flex items-center gap-1.5 leading-none shadow-sm">
              Mayaan <span className="text-amber-400 tracking-widest text-xs px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20 not-italic">FRANCHISE COMMAND</span>
            </h1>
            <p className="text-[10px] font-black text-indigo-300 tracking-widest uppercase mt-1 flex items-center gap-1">
              <MapPin size={10} className="text-amber-400" /> {getCityName(cityId)} REGION — Mapped to {getFranchiseName(franchiseId)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end border-r border-indigo-900/50 pr-6 mr-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Targeting Franchise</span>
            <span className="text-xs font-bold text-white tracking-widest">{userProfile?.name?.toUpperCase() || 'FRANCHISE HOLDER'}</span>
          </div>
          <button 
            type="button" 
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-950 hover:bg-rose-950/40 hover:text-rose-400 text-indigo-300 rounded-xl transition-all border border-indigo-800/50 hover:border-rose-900/50 text-xs font-black uppercase tracking-widest"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Stand Down</span>
          </button>
        </div>
      </header>

      {/* Main Core View Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Navigation Sidebar Drawer */}
        <aside className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900/60 border border-slate-900 rounded-3xl p-5 space-y-5 shadow-sm">
            <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">Control Command Panel</h2>
            <div className="flex flex-col gap-1.5">
              {[
                { id: 'METRICS', label: 'Operations & Rev', icon: Activity },
                { id: 'DRIVERS', label: 'City Autos & Drivers', icon: Users },
                { id: 'CAMPAIGNS', label: 'Compliance Campaigns', icon: FileText },
                { id: 'TICKETS', label: 'Local Support issues', icon: HelpCircle },
                { id: 'AUDIT', label: 'Franchise Audit Log', icon: Shield }
              ].map((item: any) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3.5 px-4.5 py-4.5 rounded-2xl text-xs font-black uppercase tracking-wider text-left transition-all ${
                      isActive 
                        ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/10 scale-[1.02]' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-slate-800'
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-800/60 space-y-3.5">
              <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl">
                <div>
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none mb-1">Status Check</p>
                  <p className="text-[9px] font-bold text-slate-400">Franchise Online</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              <div className="p-3.5 bg-slate-950/60 border border-slate-900 rounded-2xl">
                <span className="text-[8.5px] font-black text-slate-500 tracking-wider uppercase mb-1 block">Live Playback GPS Nodes</span>
                <span className="text-[11px] font-black text-white">{onlineDevicesCount} Active / {devices.length} Total</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Dynamic View Tab Contents */}
        <main className="lg:col-span-3 space-y-6">

          {/* Core Metrics Tab View */}
          {activeTab === 'METRICS' && (
            <div className="space-y-6">
              
              {/* Statistics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/50 border border-slate-900 rounded-2xl p-5 shadow-sm hover:border-slate-800 transition-all">
                  <span className="text-[10px] font-black leading-none uppercase text-slate-500 tracking-wider">Total Drivers (City)</span>
                  <div className="flex items-baseline gap-2 mt-3">
                    <span className="text-3xl font-black italic text-white tracking-tighter">{drivers.length}</span>
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-wide">+{drivers.filter(d => d.kycStatus === 'PENDING').length} Pnd</span>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-[9px] font-bold text-slate-400">
                    <Users size={12} className="text-amber-500" /> Managed city ledger
                  </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-900 rounded-2xl p-5 shadow-sm hover:border-slate-800 transition-all">
                  <span className="text-[10px] font-black leading-none uppercase text-slate-500 tracking-wider">Media Devices</span>
                  <div className="flex items-baseline gap-2 mt-3">
                    <span className="text-3xl font-black italic text-white tracking-tighter">{devices.length}</span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{onlineDevicesCount} Active</span>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-[9px] font-bold text-slate-400">
                    <Tablet size={12} className="text-amber-500" /> Active digital screens
                  </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-900 rounded-2xl p-5 shadow-sm hover:border-slate-800 transition-all animate-none">
                  <span className="text-[10px] font-black leading-none uppercase text-slate-500 tracking-wider">Localized Campaigns</span>
                  <div className="flex items-baseline gap-2 mt-3">
                    <span className="text-3xl font-black italic text-white tracking-tighter">{campaigns.length}</span>
                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-wide">{campaigns.filter(c => c.status === 'LIVE').length} Live</span>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-[9px] font-bold text-slate-400">
                    <FileText size={12} className="text-amber-500" /> City targeted campaigns
                  </div>
                </div>

                <div className="bg-gradient-to-br from-slate-900/80 to-amber-950/20 border border-amber-900/20 rounded-2xl p-5 shadow-sm hover:border-amber-500/20 transition-all">
                  <span className="text-[10px] font-black leading-none uppercase text-amber-500 tracking-wider">Settled Revenue Share</span>
                  <div className="flex items-baseline gap-1 mt-3">
                    <span className="text-3xl font-black italic text-white tracking-tighter">₹{potentialEarnings.toLocaleString()}</span>
                    <span className="text-[8px] font-black text-emerald-400">EST.</span>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-[9px] font-bold text-amber-400">
                    <DollarSign size={12} /> Local settlements (80/20)
                  </div>
                </div>
              </div>

              {/* Graphical Segment - local engagement meters & active terminals */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Local analytics chart panel */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 md:col-span-2 space-y-4 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-black italic text-white uppercase tracking-wider">Ride & Playback Analytics</h3>
                      <p className="text-[9px] font-bold text-slate-400">Localized active screen impressions per hour</p>
                    </div>
                    <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg uppercase tracking-widest leading-none">REALTIME FEED</span>
                  </div>

                  {/* SVG Chart */}
                  <div className="h-56 w-full flex items-end justify-between px-2 pt-6 relative border-b border-l border-slate-800">
                    {/* Background Grids */}
                    <div className="absolute inset-0 flex flex-col justify-between py-2 pointer-events-none opacity-20">
                      <div className="border-t border-slate-700 w-full" />
                      <div className="border-t border-slate-700 w-full" />
                      <div className="border-t border-slate-700 w-full" />
                    </div>

                    {[
                      { label: '08:00', val: 320, active: 15 },
                      { label: '10:00', val: 780, active: 18 },
                      { label: '12:00', val: 512, active: 22 },
                      { label: '14:00', val: 690, active: 20 },
                      { label: '16:00', val: 940, active: 25 },
                      { label: '18:00', val: 1210, active: 28 },
                      { label: '20:00', val: 840, active: 21 },
                    ].map((chartData, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center group relative z-10 px-1">
                        {/* Tooltip */}
                        <div className="absolute -top-12 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white font-black text-[9px] tracking-wider opacity-0 group-hover:opacity-100 transition-all shadow-xl leading-none z-20 pointer-events-none whitespace-nowrap">
                          {chartData.val} Imps ({chartData.active} Autos)
                        </div>

                        {/* Chart bar */}
                        <div 
                          className="w-full bg-slate-800 select-none group-hover:bg-amber-500 rounded-t-lg transition-all duration-300 relative overflow-hidden"
                          style={{ height: `${(chartData.val / 1300) * 160}px` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-t from-[#05070a]/10 to-transparent" />
                        </div>
                        
                        <span className="text-[8px] font-black text-slate-500 tracking-wider mt-3 uppercase">{chartData.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Localized Terminal Monitor sidebar list */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 space-y-4 overflow-hidden flex flex-col justify-between shadow-sm">
                  <div>
                    <h3 className="text-sm font-black italic text-white uppercase tracking-wider">Device Health Monitor</h3>
                    <p className="text-[9px] font-bold text-slate-400">Real-time status of mounted displays</p>
                  </div>

                  <div className="space-y-2.5 overflow-y-auto max-h-[180px] pr-1.5 scrollbar-thin scrollbar-thumb-slate-800">
                    {devices.length === 0 ? (
                      <div className="p-4 text-center border border-dashed border-slate-800 rounded-2xl text-slate-500">
                        <Tablet size={24} className="mx-auto text-slate-600 mb-1.5" />
                        <span className="text-[9px] font-bold tracking-widest uppercase">No devices deployed yet</span>
                      </div>
                    ) : (
                      devices.map((dev: any) => (
                        <div key={dev.id} className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-900 rounded-1.5xl">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-2.5 h-2.5 rounded-full ${dev.status === 'ONLINE' || dev.status === 'ACTIVE' ? 'bg-green-400 animate-pulse' : 'bg-rose-400'}`} />
                            <div>
                              <p className="text-[10px] font-black text-white leading-none mb-1">ID: {dev.id}</p>
                              <p className="text-[8px] font-bold text-slate-500">Driver ID: {dev.driverId || 'Unassigned'}</p>
                            </div>
                          </div>
                          <span className="text-[8px] font-black uppercase text-slate-400 bg-white/5 border border-slate-800 px-2 py-0.5 rounded-md leading-none">
                            {dev.earnings ? `₹${dev.earnings}` : '₹0'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div className="pt-3 border-t border-slate-800 mt-2 flex justify-between items-center text-[9px] font-bold text-slate-400">
                    <span>Terminal coverage</span>
                    <span className="text-emerald-400 font-extrabold uppercase">
                      {devices.length > 0 ? `${Math.round((onlineDevicesCount / devices.length) * 100)}% online` : '0%'}
                    </span>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* Scoped City Autos & Drivers Module */}
          {activeTab === 'DRIVERS' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h3 className="text-base font-black italic text-white uppercase tracking-wider">City Franchise Drivers List</h3>
                  <p className="text-[10px] font-bold text-slate-400">Local drivers registered and managed under {getCityName(cityId)} Franchise.</p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddDriver(true)}
                  className="flex items-center gap-2 px-4.5 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-500/10 transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  Add Local Driver
                </button>
              </div>

              {/* Add Driver Drawer Modal Dialog */}
              <AnimatePresence>
                {showAddDriver && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddDriver(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }} 
                      animate={{ scale: 1, opacity: 1 }} 
                      exit={{ scale: 0.9, opacity: 0 }} 
                      className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl space-y-5 text-white"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Users className="text-amber-500" size={18} />
                          <h4 className="text-lg font-black italic text-white uppercase tracking-tighter">Add Local Driver Account</h4>
                        </div>
                        <button onClick={() => setShowAddDriver(false)} className="text-slate-400 hover:text-white p-2 hover:bg-white/5 rounded-xl transition-all"><X size={18} /></button>
                      </div>

                      <form onSubmit={handleRegisterDriver} className="space-y-4">
                        <div>
                          <label className="text-[8px] font-black tracking-widest uppercase text-slate-400 block mb-1">Driver Full Name</label>
                          <input 
                            type="text" 
                            required 
                            placeholder="e.g. Ramesh Kumar" 
                            value={newDriver.name}
                            onChange={(e) => setNewDriver({...newDriver, name: e.target.value})}
                            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-amber-500 focus:outline-none transition-all font-semibold text-xs text-slate-200 placeholder-slate-700" 
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3.5">
                          <div>
                            <label className="text-[8px] font-black tracking-widest uppercase text-slate-400 block mb-1">Mobile Phone (Primary)</label>
                            <input 
                              type="tel" 
                              required 
                              placeholder="e.g. 9876543210" 
                              value={newDriver.phone}
                              onChange={(e) => setNewDriver({...newDriver, phone: e.target.value})}
                              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-amber-500 focus:outline-none transition-all font-semibold text-xs text-slate-200 placeholder-slate-700" 
                            />
                          </div>
                          <div>
                            <label className="text-[8px] font-black tracking-widest uppercase text-slate-400 block mb-1">Email Account</label>
                            <input 
                              type="email" 
                              required 
                              placeholder="e.g. ramesh@gmail.com" 
                              value={newDriver.email}
                              onChange={(e) => setNewDriver({...newDriver, email: e.target.value})}
                              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-amber-500 focus:outline-none transition-all font-semibold text-xs text-slate-200 placeholder-slate-700" 
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3.5">
                          <div>
                            <label className="text-[8px] font-black tracking-widest uppercase text-slate-400 block mb-1">Aadhaar Card No (Offline Reg)</label>
                            <input 
                              type="text" 
                              placeholder="12 Digit No" 
                              value={newDriver.aadhaar}
                              onChange={(e) => setNewDriver({...newDriver, aadhaar: e.target.value})}
                              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-amber-500 focus:outline-none transition-all font-semibold text-xs text-slate-200 placeholder-slate-700" 
                            />
                          </div>
                          <div>
                            <label className="text-[8px] font-black tracking-widest uppercase text-slate-400 block mb-1">Driving License No (Offline Reg)</label>
                            <input 
                              type="text" 
                              placeholder="KA-09-202X-012" 
                              value={newDriver.license}
                              onChange={(e) => setNewDriver({...newDriver, license: e.target.value})}
                              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-amber-500 focus:outline-none transition-all font-semibold text-xs text-slate-200 placeholder-slate-700" 
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[8px] font-black tracking-widest uppercase text-slate-400 block mb-1">Payment Settlement UPI ID</label>
                          <input 
                            type="text" 
                            placeholder="ramesh@okhdfcbank" 
                            value={newDriver.upi}
                            onChange={(e) => setNewDriver({...newDriver, upi: e.target.value})}
                            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-amber-500 focus:outline-none transition-all font-semibold text-xs text-slate-200 placeholder-slate-700" 
                          />
                        </div>

                        <button 
                          type="submit"
                          className="w-full mt-4 py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg cursor-pointer"
                        >
                          Enroll Driver to Database
                        </button>
                      </form>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Drivers database table view */}
              <div className="bg-slate-900/50 border border-slate-900 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800/80 bg-slate-950/40">
                        <th className="px-6 py-4.5 text-[8.5px] font-black tracking-widest uppercase text-slate-500">Driver info</th>
                        <th className="px-6 py-4.5 text-[8.5px] font-black tracking-widest uppercase text-slate-500">KYC Verify status</th>
                        <th className="px-6 py-4.5 text-[8.5px] font-black tracking-widest uppercase text-slate-500">Device linked</th>
                        <th className="px-6 py-4.5 text-[8.5px] font-black tracking-widest uppercase text-slate-500">Payout details</th>
                        <th className="px-6 py-4.5 text-[8.5px] font-black tracking-widest uppercase text-slate-500">Current state</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-xs">
                      {drivers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-10 text-slate-500">
                            <Users size={28} className="mx-auto text-slate-600 mb-2" />
                            No drivers registered under this city franchise yet.
                          </td>
                        </tr>
                      ) : (
                        drivers.map((drv: any) => {
                          const linkedDevice = devices.find(dv => dv.driverId === drv.driverId || dv.driverId === drv.id);
                          return (
                            <tr key={drv.id} className="hover:bg-white/[0.01] transition-all">
                              <td className="px-6 py-4">
                                <div>
                                  <p className="font-extrabold text-white text-xs">{drv.name}</p>
                                  <p className="text-[9px] text-slate-500 font-medium tracking-wide mt-0.5">{drv.email} | {drv.phone || 'No phone'}</p>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[8.5px] font-black uppercase tracking-wider ${
                                  drv.kycStatus === 'APPROVED' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' :
                                  drv.kycStatus === 'REJECTED' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' :
                                  'bg-amber-500/10 border border-amber-500/20 text-amber-500'
                                }`}>
                                  ● {drv.kycStatus || 'PENDING'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {linkedDevice ? (
                                  <div className="flex items-center gap-1.5">
                                    <Tablet size={13} className="text-slate-400" />
                                    <span className="font-mono text-[10px] text-white font-extrabold">{linkedDevice.id}</span>
                                  </div>
                                ) : (
                                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Unassigned</span>
                                )}
                              </td>
                              <td className="px-6 py-4 font-mono text-[10.5px] text-slate-400 font-medium">
                                {drv.upiId || 'No Settlement Account'}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                                  drv.status === 'ACTIVE' || drv.adminApproved ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-500'
                                }`}>
                                  {drv.status === 'ACTIVE' || drv.adminApproved ? '● Active' : '● Idle / pending'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* Compliance Campaigns Tab */}
          {activeTab === 'CAMPAIGNS' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-black italic text-white uppercase tracking-wider">Localized Targeted Campaigns</h3>
                <p className="text-[10px] font-bold text-slate-400">Marketing campaigns active or scheduled for the {getCityName(cityId)} area.</p>
              </div>

              <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 space-y-4">
                {campaigns.length === 0 ? (
                  <div className="p-10 text-center text-slate-500 border border-dashed border-slate-800 rounded-2.5rem">
                    <FileText size={32} className="mx-auto text-slate-600 mb-2" />
                    No targeted campaigns mapped to this city franchise yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {campaigns.map((camp: any) => (
                      <div key={camp.id} className="p-5 bg-slate-950/60 border border-slate-900 rounded-2xl flex flex-col justify-between space-y-4">
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <span className="text-[8px] font-black tracking-widest bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-md uppercase">
                              {camp.mediaType || 'IMAGE'}
                            </span>
                            <h4 className="text-xs font-black uppercase text-white mt-1 leading-snug">{camp.title}</h4>
                            <p className="text-[9px] text-slate-500 mt-1">Campaign ID: <span className="font-mono">{camp.id}</span></p>
                          </div>
                          
                          <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider border ${
                            camp.status === 'APPROVED' || camp.status === 'LIVE' 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                          }`}>
                            {camp.status || 'PENDING'}
                          </span>
                        </div>

                        {/* Media Preview inside the sandbox card safely */}
                        <div className="h-44 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative flex items-center justify-center">
                          {camp.mediaUrl ? (
                            camp.mediaType === 'VIDEO' ? (
                              <video src={camp.mediaUrl} className="w-full h-full object-cover" muted loop autoPlay />
                            ) : (
                              <img src={camp.mediaUrl} className="w-full h-full object-cover" alt="Campaign visual" referrerPolicy="no-referrer" />
                            )
                          ) : (
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">No visual media provided</span>
                          )}
                        </div>

                        {/* Category Compliance flags as mapped by support team */}
                        <div className="pt-3 border-t border-slate-900/80 flex flex-wrap gap-1.5">
                          <span className={`text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${camp.safeContent ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            {camp.safeContent ? '✓ Safe Content Verified' : '⚠ Flagged Content'}
                          </span>
                          <span className={`text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${camp.kidsSafe ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-450'}`}>
                            {camp.kidsSafe ? '✓ Kids-Safe' : '15+ restriction'}
                          </span>
                          {camp.categoryTags?.map((tag: string, i: number) => (
                            <span key={i} className="text-[8.5px] font-black uppercase tracking-wider bg-slate-900 text-slate-400 border border-slate-800 px-2.5 py-0.5 rounded">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Local Support Issues management */}
          {activeTab === 'TICKETS' && (
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-base font-black italic text-white uppercase tracking-wider">Complaint Handling & Global Escalation</h3>
                  <p className="text-[10px] font-bold text-indigo-300 tracking-wider">Issues reported inside {getCityName(cityId)} scope, or escalate to global support HQ.</p>
                </div>
                <button
                  onClick={() => setShowTicketModal(true)}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all font-black uppercase text-xs tracking-wider"
                >
                  <AlertCircle size={14} />
                  Escalate an Issue
                </button>
              </div>

              <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 space-y-4">
                {tickets.length === 0 ? (
                  <div className="p-10 text-center text-slate-500 border border-dashed border-slate-800 rounded-2.5rem">
                    <CheckCircle size={32} className="mx-auto text-slate-600 mb-2" />
                    No local support complaints mapped to this city franchise currently.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tickets.map((t: any) => (
                      <div key={t.id} className="p-4 bg-slate-950/60 border border-slate-900 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              t.priority === 'HIGH' ? 'bg-rose-500 animate-pulse' :
                              t.priority === 'MEDIUM' ? 'bg-amber-500' : 'bg-blue-500'
                            }`} />
                            <h4 className="text-xs font-black uppercase text-white">{t.subject}</h4>
                          </div>
                          <p className="text-[10px] text-slate-450 mt-1 font-semibold leading-relaxed max-w-xl">{t.message}</p>
                          <p className="text-[9px] text-slate-500 mt-2">Opened at: {new Date(t.createdAt).toLocaleDateString()} | Ticket: <span className="font-mono">{t.id}</span></p>
                        </div>

                        <div className="flex items-center gap-2 mt-2 md:mt-0 w-full md:w-auto justify-end">
                          <span className={`px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-lg border ${
                            t.status === 'CLOSED' ? 'bg-slate-900 border-slate-800 text-slate-500' :
                            t.status === 'IN_PROGRESS' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                            'bg-rose-500/10 border-rose-500/20 text-rose-500'
                          }`}>
                            {t.status || 'OPEN'}
                          </span>

                          <div className="flex items-center h-8 gap-1 ml-2">
                            {t.status !== 'CLOSED' && (
                              <button
                                onClick={() => updateTicketStatus(t.id, 'CLOSED')}
                                className="p-1 px-2.5 h-full bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/20 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Close Ticket
                              </button>
                            )}
                            {t.status === 'OPEN' && (
                              <button
                                onClick={() => updateTicketStatus(t.id, 'IN_PROGRESS')}
                                className="p-1 px-2.5 h-full bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-slate-950 border border-amber-500/20 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Progress
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Localized Audit Logs View */}
          {activeTab === 'AUDIT' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-black italic text-white uppercase tracking-wider">Franchise Local Audit Log</h3>
                <p className="text-[10px] font-bold text-slate-400">Cryptographically sound activity ledger capturing actions bound to this franchise.</p>
              </div>

              <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6.5">
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2.5 scrollbar-thin scrollbar-thumb-slate-800">
                  {auditLogs.length === 0 ? (
                    <div className="p-10 text-center text-slate-500 border border-dashed border-slate-800 rounded-2.5rem">
                      <Shield size={32} className="mx-auto text-slate-600 mb-2" />
                      No local audit tracks saved yet for this franchise zone.
                    </div>
                  ) : (
                    auditLogs.map((log: any) => (
                      <div key={log.id} className="p-4 bg-slate-950/60 border border-slate-900 rounded-2xl flex flex-col md:flex-row justify-between md:items-center gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[8.5px] font-black text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded uppercase leading-none">
                              {log.action}
                            </span>
                            <span className="text-[9.5px] font-extrabold text-white">Target: <span className="font-mono text-slate-400">{log.targetId}</span></span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-semibold">{log.details || 'Operational record updated.'}</p>
                          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Performer: {log.performedByName || log.performedBy}</p>
                        </div>
                        
                        <div className="flex items-center gap-2.5 text-right font-mono text-[9px] text-slate-400 leading-none">
                          <Clock size={12} className="text-slate-500" />
                          {log.timestamp ? (log.timestamp.toDate ? log.timestamp.toDate().toLocaleString() : new Date(log.timestamp).toLocaleString()) : 'Pending Ledger synced'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Ticket Upload Modal */}
      <AnimatePresence>
        {showTicketModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-indigo-950/80 border border-indigo-500/30 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="px-6 py-5 border-b border-indigo-900/50 flex justify-between items-center bg-indigo-900/20">
                <h3 className="text-sm font-black text-white italic uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle size={16} className="text-indigo-400" />
                  Escalate Issue to Global Support
                </h3>
                <button onClick={() => setShowTicketModal(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-900/50 text-slate-400 hover:text-white transition-all cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[70vh]">
                <form id="franchise-ticket-form" onSubmit={handleRaiseTicket} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black tracking-widest text-indigo-300 uppercase">Issue Subject / Category</label>
                    <input 
                      type="text"
                      className="w-full bg-slate-900/50 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                      placeholder="e.g., Payout Delay, Technical Glitch, Supply Request"
                      value={newTicket.subject}
                      onChange={e => setNewTicket({...newTicket, subject: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black tracking-widest text-indigo-300 uppercase">Issue Priority</label>
                    <select
                      className="w-full bg-slate-900/50 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium appearance-none"
                      value={newTicket.priority}
                      onChange={e => setNewTicket({...newTicket, priority: e.target.value})}
                    >
                      <option value="LOW">Low - General Inquiry</option>
                      <option value="MEDIUM">Medium - Performance Impacts</option>
                      <option value="HIGH">High - Urgent / Critical Error</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black tracking-widest text-indigo-300 uppercase">Issue Description / Logs</label>
                    <textarea 
                      className="w-full bg-slate-900/50 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium resize-none"
                      placeholder="Please fully detail your issue to help Global Support respond effectively..."
                      rows={5}
                      value={newTicket.message}
                      onChange={e => setNewTicket({...newTicket, message: e.target.value})}
                      required
                    />
                  </div>
                </form>
              </div>

              <div className="px-6 py-5 border-t border-indigo-900/50 bg-slate-950 flex gap-3">
                <button type="button" onClick={() => setShowTicketModal(false)} className="flex-1 py-3 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl transition-all cursor-pointer">
                  Cancel
                </button>
                <button type="submit" form="franchise-ticket-form" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/20 text-xs font-black uppercase tracking-widest transition-all cursor-pointer">
                  Escalate Request
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
