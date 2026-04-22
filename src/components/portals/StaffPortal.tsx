import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Clock, CheckCircle, AlertOctagon, Phone, User, MessageCircle, Send, X, ChevronRight, Database, Search, FileText, MapPin, Grid, List as ListIcon, Zap, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StaffPortal() {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SUPPORT' | 'BROADCAST' | 'FLEET' | 'SYSTEM'>('OVERVIEW');
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [activePromotions, setActivePromotions] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('autoAd_promotions') || '[]');
    setActivePromotions(data);
  }, [activeTab]);

  // New Announcement State
  const [announcement, setAnnouncement] = useState({
    price: '',
    adCount: '',
    autoCount: '',
    offer: '',
    media: null as string | null,
    mediaType: 'IMAGE' as 'IMAGE' | 'VIDEO',
    targetRegion: 'ALL INDIA'
  });

  const INDIAN_CITIES = [
    'ALL INDIA', 'BANGALORE', 'MUMBAI', 'DELHI', 'HYDERABAD', 'CHENNAI', 'KOLKATA', 'PUNE', 'AHMEDABAD', 
    'JAIPUR', 'LUCKNOW', 'CHANDIGARH', 'KOCHI', 'COIMBATORE', 'INDORE', 'BHOPAL', 'PATNA',
    'LUDHIANA', 'AGRA', 'NASHIK', 'VADODARA', 'MYSURU', 'HUBLI', 'BELAGAVI', 'MANGALURU', 'ARASIKERE'
  ];

  const handleAnnounce = () => {
    if (!announcement.price || !announcement.offer) {
      alert('Please enter price and offer details');
      return;
    }
    const data = { ...announcement, id: Date.now(), timestamp: new Date().toISOString() };
    const updated = [data, ...activePromotions];
    localStorage.setItem('autoAd_promotions', JSON.stringify(updated));
    setActivePromotions(updated);
    alert('Announcement Broadcasted Successfully!');
    setAnnouncement({ price: '', adCount: '', autoCount: '', offer: '', media: null, mediaType: 'IMAGE', targetRegion: 'ALL INDIA' });
  };

  const handleDeleteAnnouncement = (id: number) => {
    const updated = activePromotions.filter(p => p.id !== id);
    localStorage.setItem('autoAd_promotions', JSON.stringify(updated));
    setActivePromotions(updated);
  };

  const drivers = [
    { 
      name: 'Manjunatha K', 
      vNo: 'KA-01-AA-2024', 
      phone: '9123456780', 
      status: 'VERIFIED',
      location: 'Regional Hub',
      joined: '12 Oct 2023',
      bio: 'Professional driver with 10+ years experience. Expert in city routes.',
      docs: ['Aadhar', 'DL', 'RC', 'Insurance']
    },
    { 
      name: 'Raju Gowda', 
      vNo: 'KA-13-B-4822', 
      phone: '9876543210', 
      status: 'PENDING',
      location: 'Arasikere',
      joined: '05 Jan 2024',
      bio: 'New to the platform. Interested in late-night ad slots.',
      docs: ['Aadhar', 'DL']
    },
    { 
      name: 'Suresh Kumar', 
      vNo: 'KA-01-EE-9901', 
      phone: '8102938475', 
      status: 'SUSPENDED',
      location: 'Channarayapatna',
      joined: '22 Feb 2024',
      bio: 'Flagged for hardware tampering. Under review.',
      docs: ['Aadhar', 'DL', 'RC']
    },
  ];

  const queries = [
    { id: 'Q1', from: 'Driver Manju', type: 'TECH', subject: 'Display Blackout', status: 'URGENT', time: '10m ago' },
    { id: 'Q2', from: 'Ad-User Kavya', type: 'BILLING', subject: 'Refund Request', status: 'PENDING', time: '1h ago' },
    { id: 'Q3', from: 'Driver Raju', type: 'QUERY', subject: 'Incentive Claim', status: 'PROCESSED', time: '4h ago' },
  ];

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans relative">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Navigation */}
      <div className={cn(
        "fixed inset-y-0 left-0 w-64 border-r border-slate-200 bg-white p-6 space-y-8 flex flex-col z-50 transition-transform duration-300 lg:relative lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-amber-500 font-bold shadow-lg shadow-slate-200">S</div>
            <h2 className="font-bold text-slate-900 tracking-tight text-sm uppercase tracking-widest leading-none">Support Hub<br/><span className="text-slate-400 font-medium whitespace-nowrap">India Central Hub</span></h2>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="p-2 lg:hidden text-slate-400 hover:text-slate-900">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-1">
          <button 
            onClick={() => { setActiveTab('OVERVIEW'); setIsSidebarOpen(false); }}
            className={cn("w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all", activeTab === 'OVERVIEW' ? "bg-slate-900 text-amber-500 shadow-xl" : "text-slate-400 hover:bg-slate-50")}
          >
            Terminal Overview
          </button>
          <button 
            onClick={() => { setActiveTab('SUPPORT'); setIsSidebarOpen(false); }}
            className={cn("w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all", activeTab === 'SUPPORT' ? "bg-slate-900 text-amber-500 shadow-xl" : "text-slate-400 hover:bg-slate-50")}
          >
            Incident Queue
          </button>
          <button 
            onClick={() => { setActiveTab('BROADCAST'); setIsSidebarOpen(false); }}
            className={cn("w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-between", activeTab === 'BROADCAST' ? "bg-slate-900 text-amber-500 shadow-xl" : "text-slate-400 hover:bg-slate-50")}
          >
            Broadcast Center
            <Zap size={12} className={cn(activeTab === 'BROADCAST' ? "text-amber-500 animate-pulse" : "text-slate-300")} />
          </button>
          <button 
            onClick={() => { setActiveTab('FLEET'); setIsSidebarOpen(false); }}
            className={cn("w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all", activeTab === 'FLEET' ? "bg-slate-900 text-amber-500 shadow-xl" : "text-slate-400 hover:bg-slate-50")}
          >
            Fleet Assets
          </button>
          <button 
            onClick={() => { setActiveTab('SYSTEM'); setIsSidebarOpen(false); }}
            className={cn("w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all", activeTab === 'SYSTEM' ? "bg-slate-900 text-amber-500 shadow-xl" : "text-slate-400 hover:bg-slate-50")}
          >
            Audit Logs
          </button>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-100">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
             <div className="w-9 h-9 bg-slate-200 rounded-lg overflow-hidden">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Operator" alt="Avatar" />
             </div>
             <div className="overflow-hidden">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Senior Operator</p>
                <p className="text-xs font-bold text-slate-900 truncate tracking-tight">Active Operator</p>
             </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main Header / Search */}
        <header className="h-20 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between gap-4">
           <div className="flex items-center gap-4 flex-1">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 -ml-2 text-slate-400 hover:text-slate-900 lg:hidden"
              >
                <Grid size={20} />
              </button>
              <div className="relative flex-1 max-w-96">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                 <input 
                   type="text" 
                   placeholder={activeTab === 'QUEUE' ? "Search tickets..." : "Search by Vehicle No..."}
                   className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-12 pr-4 text-[11px] font-bold uppercase tracking-tight focus:ring-1 focus:ring-amber-500 focus:outline-none"
                 />
              </div>
           </div>
           <div className="hidden sm:flex gap-4">
              <button className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-900 transition-all"><Grid size={18} /></button>
              <button className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-900 transition-all"><ListIcon size={18} /></button>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 font-sans">
          <AnimatePresence mode="wait">
            {activeTab === 'OVERVIEW' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-8 pb-10"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 lg:h-[500px]">
                   <div className="col-span-1 md:col-span-8 glass-card p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-slate-900 text-white relative overflow-hidden shadow-2xl flex flex-col justify-between group outline outline-1 outline-white/5 min-h-[300px] md:min-h-0">
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent pointer-events-none" />
                      <div className="relative z-10 flex flex-col md:flex-row justify-between gap-6">
                         <div className="space-y-2 text-center md:text-left">
                            <h2 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase leading-none">Global Network<br/>Uptime Monitor</h2>
                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em]">Status: Operational & Synchronized</p>
                         </div>
                         <div className="w-12 h-12 md:w-16 md:h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform mx-auto md:mx-0">
                            <Database size={24} className="text-amber-500 md:w-8 md:h-8" />
                         </div>
                      </div>
                      <div className="relative z-10 flex flex-col sm:flex-row items-center md:items-end justify-between gap-6 mt-8 md:mt-0">
                         <div className="flex gap-4">
                            <div className="p-3 md:p-4 bg-white/5 rounded-2xl border border-white/10 flex-1 sm:flex-none text-center sm:text-left">
                               <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Active Nodes</p>
                               <p className="text-lg md:text-xl font-black italic">1,240 <span className="text-[10px] text-green-500">↑</span></p>
                            </div>
                            <div className="p-3 md:p-4 bg-white/5 rounded-2xl border border-white/10 flex-1 sm:flex-none text-center sm:text-left">
                               <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Daily Cap %</p>
                               <p className="text-lg md:text-xl font-black italic">84.2%</p>
                            </div>
                         </div>
                         <div className="text-center md:text-right w-full sm:w-auto">
                            <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Network Load</p>
                            <div className="flex gap-1 justify-center md:justify-end">
                               {[1,2,3,4,5,6,3,4,5].map((h, i) => (
                                 <div key={i} className="w-1 bg-amber-500/40 rounded-full" style={{ height: h * 4 }} />
                               ))}
                            </div>
                         </div>
                      </div>
                   </div>
                   <div className="col-span-1 md:col-span-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 md:grid-rows-2 gap-6 md:gap-8">
                      <div className="glass-card p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm space-y-4 flex flex-col justify-center">
                         <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 border border-amber-100">
                            <Zap size={24} />
                         </div>
                         <div>
                            <h4 className="text-sm font-black italic uppercase tracking-tight text-slate-900">Broadcast Center</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">3 active campaigns live</p>
                         </div>
                         <button onClick={() => setActiveTab('BROADCAST')} className="text-[10px] font-black text-amber-600 uppercase tracking-widest hover:underline text-left italic">Manage Signals →</button>
                      </div>
                      <div className="glass-card p-8 rounded-[2.5rem] bg-amber-500 text-slate-900 border border-amber-400 shadow-lg shadow-amber-500/10 space-y-4 flex flex-col justify-center group overflow-hidden relative">
                         <Clock size={120} className="absolute -bottom-10 -right-10 text-slate-900/10 rotate-12 group-hover:scale-110 transition-transform duration-700" />
                         <div className="relative z-10 space-y-4">
                            <h4 className="text-sm font-black italic uppercase tracking-tight">Active Support</h4>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Avg delay: 4m 12s</p>
                            <button onClick={() => setActiveTab('SUPPORT')} className="w-full py-4 bg-slate-900 text-amber-500 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl">Audit Queue</button>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                   <div className="col-span-1 md:col-span-2 glass-card p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-white border border-slate-100 shadow-sm space-y-6">
                      <div className="flex items-center justify-between">
                         <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest italic flex items-center gap-2"><Clock size={14} className="text-amber-500" /> System Activity Stream</h4>
                         <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Live Cloud Sync</span>
                      </div>
                      <div className="space-y-4">
                         {[
                           { t: '12:04:12', msg: 'Broadcast: Monsoon Sale push to 500 nodes successful.', type: 'SYNC' },
                           { t: '11:58:30', msg: 'System Audit: Hardware self-test passed for Arasikere Hub.', type: 'AUDIT' },
                           { t: '11:45:00', msg: 'Fleet: 12 new driver verifications pending in Central Zone.', type: 'FLEET' },
                         ].map((l, i) => (
                           <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-amber-200 transition-all gap-4">
                              <div className="flex items-center gap-4">
                                 <span className="text-[9px] font-black text-slate-400 italic font-mono">{l.t}</span>
                                 <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{l.msg}</p>
                              </div>
                              <span className="text-[8px] font-black text-amber-600 px-2 py-1 bg-amber-50 rounded-lg self-end sm:self-auto">{l.type}</span>
                           </div>
                         ))}
                      </div>
                   </div>
                   <div className="glass-card p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-white border border-slate-100 shadow-sm flex flex-col justify-between gap-6 min-h-[250px]">
                      <div className="space-y-4">
                         <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest italic leading-tight">Identity Management</h4>
                         <div className="flex -space-x-3">
                            {[1,2,3,4,5].map(i => (
                              <img key={i} src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} className="w-10 h-10 rounded-full border-2 border-white bg-slate-100" />
                            ))}
                         </div>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">38 Operators Currently Syncing Globally</p>
                      </div>
                      <button className="w-full py-4 border border-slate-200 text-slate-500 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all italic">Network Directory →</button>
                   </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'SUPPORT' && (
              <motion.div 
                key="queue"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-10"
              >
                {/* Support Hub Metrics Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                   <div className="glass-card p-4 md:p-6 rounded-2xl md:rounded-3xl border border-red-100 bg-red-50/20 shadow-sm flex flex-col gap-1">
                      <p className="text-[8px] font-black text-red-400 uppercase tracking-widest italic">Live Alerts</p>
                      <h4 className="text-lg md:text-xl font-black italic tracking-tighter text-red-600">03 Urgent</h4>
                   </div>
                   <div className="glass-card p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 bg-white shadow-sm flex flex-col gap-1">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">Avg. Response</p>
                      <h4 className="text-lg md:text-xl font-black italic tracking-tighter text-slate-900">4.2 Mins</h4>
                   </div>
                   <div className="glass-card p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 bg-white shadow-sm flex flex-col gap-1">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">Resolved Today</p>
                      <h4 className="text-lg md:text-xl font-black italic tracking-tighter text-slate-900">142 Cases</h4>
                   </div>
                   <div className="glass-card p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 bg-white shadow-sm flex flex-col gap-1">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">Operator Score</p>
                      <h4 className="text-lg md:text-xl font-black italic tracking-tighter text-amber-600">98% KPI</h4>
                   </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                   <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2 leading-none italic">
                     <MessageCircle size={16} className="text-amber-500" /> Technical System Monitor
                   </h3>
                   <div className="flex items-center gap-4 w-full sm:w-auto">
                      <span className="text-[9px] font-bold px-3 py-1 bg-slate-900 text-white rounded-full tracking-widest uppercase italic shadow-lg shadow-slate-200">5 LIVE TICKETS</span>
                      <div className="flex bg-slate-100 p-1 rounded-lg">
                         <button className="px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-md bg-white shadow-sm border border-slate-200 text-slate-900">Queue View</button>
                         <button className="px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-md text-slate-400 hover:text-slate-600">History</button>
                      </div>
                   </div>
                </div>

                <div className="glass-card rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 overflow-x-auto shadow-2xl bg-white relative">
                   <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                       <tr className="bg-slate-50/50 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                          <th className="px-10 py-6">Incident Author</th>
                          <th className="px-10 py-6">Category & Issue</th>
                          <th className="px-10 py-6 text-center">Threat Level</th>
                          <th className="px-10 py-6"></th>
                       </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                       {queries.map((q) => (
                         <tr key={q.id} className="hover:bg-slate-50/30 transition-all group cursor-pointer" onClick={() => setActiveQuery(q.id)}>
                           <td className="px-10 py-7">
                             <div className="flex items-center gap-5">
                               <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 uppercase text-[12px] font-black shadow-inner group-hover:bg-white group-hover:text-amber-500 group-hover:border-amber-200 transition-all italic">{q.from[0]}</div>
                               <div>
                                  <p className="text-xs font-black text-slate-900 uppercase tracking-tight leading-none mb-1.5">{q.from}</p>
                                  <div className="flex items-center gap-2">
                                     <Clock size={10} className="text-slate-300" />
                                     <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest leading-none">{q.time}</p>
                                  </div>
                               </div>
                             </div>
                           </td>
                           <td className="px-10 py-7">
                              <div className="flex flex-col gap-1">
                                 <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest italic">{q.type}</span>
                                 <span className="text-xs font-black text-slate-700 uppercase tracking-tighter leading-tight italic">{q.subject}</span>
                              </div>
                           </td>
                           <td className="px-10 py-7">
                              <div className="flex justify-center">
                                 <span className={cn("text-[9px] font-black px-4 py-1.5 rounded-xl uppercase tracking-[0.15em] border shadow-sm",
                                    q.status === 'URGENT' ? "bg-red-500 text-white border-red-600 shadow-red-200" :
                                    q.status === 'PENDING' ? "bg-amber-400 text-slate-900 border-amber-500 shadow-amber-100" :
                                    "bg-slate-100 text-slate-400 border-slate-200 shadow-inner"
                                 )}>
                                    {q.status}
                                 </span>
                              </div>
                           </td>
                           <td className="px-10 py-7 text-right">
                              <button className="w-10 h-10 flex items-center justify-center bg-slate-50 group-hover:bg-slate-900 group-hover:text-amber-500 rounded-xl transition-all shadow-inner"><ChevronRight size={20} /></button>
                           </td>
                         </tr>
                       ))}
                      </tbody>
                   </table>
                   {/* Decorative Mesh Gradient Background for the table holder */}
                   <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-transparent pointer-events-none -z-10" />
                </div>
              </motion.div>
            )}

            {activeTab === 'FLEET' && (
              <motion.div 
                key="fleet"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-10"
              >
                 <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="space-y-1 text-center sm:text-left">
                       <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center justify-center sm:justify-start gap-2 leading-none italic">
                         <Database size={16} className="text-amber-500" /> Enterprise Fleet Assets
                       </h3>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest sm:ml-6">Total Fleet: 1,240 Units • Nationwide Cluster</p>
                    </div>
                    <div className="flex gap-4">
                       <div className="px-4 md:px-6 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm text-center">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Verified</p>
                          <p className="text-xs md:text-sm font-black italic tracking-tighter text-slate-900">1.1k Unit</p>
                       </div>
                       <div className="px-4 md:px-6 py-3 bg-red-600 rounded-2xl shadow-lg shadow-red-200 text-center">
                          <p className="text-[8px] font-black text-white/60 uppercase tracking-widest mb-0.5">Action Req</p>
                          <p className="text-xs md:text-sm font-black italic tracking-tighter text-white">42 Flagged</p>
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
                    {drivers.map((driver, i) => (
                       <div key={i} className="glass-card p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-slate-200 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all h-full bg-white flex flex-col justify-between group overflow-hidden relative">
                          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                             <Database size={120} />
                          </div>
                          
                          <div className="space-y-8 relative z-10">
                             <div className="flex justify-between items-start">
                                <div className="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-amber-500 overflow-hidden shadow-2xl relative border border-white/5">
                                   <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${driver.name}`} alt="Avatar" className="w-full h-full object-cover" />
                                   <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
                                </div>
                                <span className={cn("text-[8px] md:text-[9px] font-black px-3 md:px-4 py-1.5 rounded-xl uppercase tracking-[0.2em] border shadow-sm", 
                                  driver.status === 'VERIFIED' ? "bg-green-50 text-green-600 border-green-100" :
                                  driver.status === 'SUSPENDED' ? "bg-red-50 text-red-600 border-red-100" :
                                  "bg-amber-50 text-amber-600 border-amber-100"
                                )}>
                                   {driver.status}
                                </span>
                             </div>
                             
                             <div className="space-y-2">
                                <h4 className="text-lg md:text-xl font-black text-slate-900 italic tracking-tighter leading-none">{driver.name}</h4>
                                <div className="flex items-center gap-3">
                                   <MapPin size={10} className="text-amber-600" />
                                   <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] italic">{driver.vNo}</p>
                                </div>
                             </div>

                             <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 md:p-5 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col gap-1">
                                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">Node Hub</p>
                                   <p className="text-[10px] md:text-[11px] font-black text-slate-900 truncate tracking-tight uppercase leading-none">{driver.location}</p>
                                </div>
                                <div className="p-3 md:p-5 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col gap-1">
                                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">Contact Link</p>
                                   <p className="text-[10px] md:text-[11px] font-black text-slate-900 tracking-tight leading-none">+{driver.phone.slice(0,2)} {driver.phone.slice(2)}</p>
                                </div>
                             </div>

                             <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none italic">Asset Documents</p>
                                   <span className="text-[8px] font-black text-green-500 uppercase tracking-widest italic">Compliant</span>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                   {driver.docs.map((doc, idx) => (
                                      <div key={idx} className="px-2 md:px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[8px] md:text-[9px] font-black uppercase text-slate-600 italic tracking-tighter">
                                         {doc}
                                      </div>
                                   ))}
                                </div>
                             </div>
                          </div>

                          <div className="pt-8">
                             <button className="w-full py-4 md:py-5 bg-slate-900 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-slate-300 relative overflow-hidden group/btn">
                                <FileText size={16} className="text-amber-500 group-hover/btn:scale-125 transition-transform" /> 
                                Full Inventory ID
                                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                             </button>
                          </div>
                       </div>
                    ))}
                 </div>
              </motion.div>
            )}

            {activeTab === 'BROADCAST' && (
              <motion.div 
                key="broadcast"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10 pb-20"
              >
                 {/* Dashboard Stats Bar */}
                 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {[
                      { label: 'Active Promotions', val: activePromotions.length, color: 'text-amber-600' },
                      { label: 'Network Reach', val: '~45k', color: 'text-slate-900' },
                      { label: 'Active Autos', val: '1,240', color: 'text-slate-900' },
                      { label: 'Uptime', val: '99.9%', color: 'text-green-600' },
                    ].map((s, i) => (
                      <div key={i} className="glass-card p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 bg-white shadow-sm flex flex-col gap-1">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">{s.label}</p>
                        <h4 className={cn("text-lg md:text-xl font-black italic tracking-tighter", s.color)}>{s.val}</h4>
                      </div>
                    ))}
                 </div>

                 <div className="flex flex-col xl:flex-row gap-10">
                    {/* Left: Composer (60%) */}
                    <div className="w-full xl:flex-[1.5] space-y-6">
                       <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2 italic">
                            <Send size={16} className="text-amber-500" /> New Offer Composer
                          </h3>
                       </div>

                       <div className="glass-card p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-slate-200 shadow-2xl bg-white space-y-10 relative overflow-hidden group">
                          {/* Decorative Background Element */}
                          <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-50 rounded-full blur-3xl opacity-50 group-hover:bg-amber-100 transition-all duration-700" />
                          
                          <div className="relative z-10 space-y-8">
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 text-black">
                                <div className="space-y-3">
                                   <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1 flex items-center gap-2">
                                      Price Point <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                   </label>
                                   <input 
                                     type="text" 
                                     placeholder="e.g. ₹12,999"
                                     value={announcement.price}
                                     onChange={e => setAnnouncement({...announcement, price: e.target.value})}
                                     className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-6 py-4 md:py-5 text-sm font-black tracking-tighter focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all outline-none"
                                   />
                                </div>
                                <div className="space-y-3">
                                   <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Campaign Headline</label>
                                   <input 
                                     type="text" 
                                     placeholder="e.g. SUMMER MEGA FEST"
                                     value={announcement.offer}
                                     onChange={e => setAnnouncement({...announcement, offer: e.target.value})}
                                     className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-6 py-4 md:py-5 text-sm font-black tracking-tighter focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all outline-none"
                                   />
                                </div>
                             </div>

                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
                                <div className="space-y-3">
                                   <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Total Impressions</label>
                                   <input 
                                     type="number" 
                                     placeholder="e.g. 50000"
                                     value={announcement.adCount}
                                     onChange={e => setAnnouncement({...announcement, adCount: e.target.value})}
                                     className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-6 py-4 md:py-5 text-sm font-black tracking-tighter focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all outline-none"
                                   />
                                </div>
                                <div className="space-y-3">
                                   <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Vehicle Deployment (Autos)</label>
                                   <input 
                                     type="number" 
                                     placeholder="e.g. 250"
                                     value={announcement.autoCount}
                                     onChange={e => setAnnouncement({...announcement, autoCount: e.target.value})}
                                     className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-6 py-4 md:py-5 text-sm font-black tracking-tighter focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all outline-none"
                                   />
                                </div>
                             </div>

                             <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Target Regional Node (Pan-India)</label>
                                <select 
                                  value={announcement.targetRegion}
                                  onChange={e => setAnnouncement({...announcement, targetRegion: e.target.value})}
                                  className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-6 py-5 text-sm font-black tracking-tighter focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all outline-none appearance-none cursor-pointer"
                                >
                                   {INDIAN_CITIES.map(city => (
                                     <option key={city} value={city}>{city}</option>
                                   ))}
                                </select>
                             </div>

                             <div className="space-y-6 pt-6 border-t border-slate-100">
                                <div className="flex items-center justify-between">
                                   <div className="space-y-1">
                                      <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Media Asset Pipeline</label>
                                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1">Optimized for 4K Playback</p>
                                   </div>
                                   <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                                      <button 
                                       onClick={() => setAnnouncement({...announcement, mediaType: 'IMAGE'})}
                                       className={cn("px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all", announcement.mediaType === 'IMAGE' ? "bg-slate-900 text-amber-500 shadow-xl" : "text-slate-400 hover:text-slate-600")}
                                      >
                                        4K Static
                                      </button>
                                      <button 
                                       onClick={() => setAnnouncement({...announcement, mediaType: 'VIDEO'})}
                                       className={cn("px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all", announcement.mediaType === 'VIDEO' ? "bg-slate-900 text-amber-500 shadow-xl" : "text-slate-400 hover:text-slate-600")}
                                      >
                                        HD Motion
                                      </button>
                                   </div>
                                </div>
                                
                                <div 
                                 onClick={() => setAnnouncement({...announcement, media: 'SIMULATED_DATA_LOADED'})}
                                 className="w-full h-56 bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-800 flex flex-col items-center justify-center cursor-pointer hover:border-amber-500 group/drop transition-all hover:bg-slate-800 overflow-hidden relative shadow-inner"
                                >
                                   {announcement.media ? (
                                     <div className="flex flex-col items-center gap-4 relative z-10">
                                       <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/20 shadow-2xl">
                                          <CheckCircle className="text-amber-500" size={32} />
                                       </div>
                                       <div className="text-center">
                                          <span className="block text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] italic mb-1">{announcement.mediaType} ASSET SYNCED</span>
                                          <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Ready for cloud distribution</span>
                                       </div>
                                       <button onClick={(e) => { e.stopPropagation(); setAnnouncement({...announcement, media: null}); }} className="mt-4 px-4 py-2 bg-red-500/10 text-red-500 rounded-lg text-[8px] font-black uppercase tracking-widest border border-red-500/20 hover:bg-red-500 transition-all hover:text-white">Purge Asset</button>
                                     </div>
                                   ) : (
                                     <>
                                       <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-4 group-hover/drop:scale-110 group-hover/drop:bg-amber-500/10 transition-all duration-500 border border-slate-700">
                                          <Plus className="text-slate-600 group-hover/drop:text-amber-500" size={32} />
                                       </div>
                                       <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover/drop:text-white transition-colors">Initialize Asset Injection</span>
                                       <span className="text-[8px] text-slate-600 font-bold uppercase mt-2 tracking-widest">Max Scale: 4096px (Lossless)</span>
                                     </>
                                   )}
                                   {/* Decorative Grid Overlay */}
                                   <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                                </div>
                             </div>

                             <button 
                               onClick={handleAnnounce}
                               className="w-full py-8 bg-slate-900 text-amber-500 font-black rounded-[2rem] text-[12px] uppercase tracking-[0.4em] shadow-2xl shadow-slate-300 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-4 group/btn relative overflow-hidden"
                             >
                                <Zap size={22} className="group-hover/btn:scale-125 transition-transform duration-500" /> 
                                EXECUTE LIVE BROADCAST
                                <div className="absolute inset-0 bg-white/5 skew-x-12 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                             </button>
                          </div>
                       </div>
                    </div>

                    {/* Right: Management (40%) */}
                    <div className="w-full xl:flex-1 space-y-6">
                       <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2 italic">
                            <ListIcon size={16} className="text-slate-400" /> Active Registry
                          </h3>
                          <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">LIVE OVER-THE-AIR</span>
                       </div>

                       <div className="space-y-4 max-h-[720px] overflow-y-auto pr-4 custom-scrollbar">
                          <AnimatePresence>
                             {activePromotions.length === 0 ? (
                               <div className="p-12 text-center glass-card rounded-[2.5rem] border border-dashed border-slate-200">
                                  <Database className="mx-auto text-slate-100 mb-4" size={48} />
                                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">No Active Broadcasts</p>
                               </div>
                             ) : (
                               activePromotions.map((promo) => (
                                 <motion.div 
                                   key={promo.id}
                                   initial={{ opacity: 0, scale: 0.9 }}
                                   animate={{ opacity: 1, scale: 1 }}
                                   exit={{ opacity: 0, scale: 0.9, x: 20 }}
                                   className="glass-card p-8 rounded-[2.5rem] border border-slate-100 bg-white hover:border-amber-200 transition-all group relative shadow-sm"
                                 >
                                    <div className="flex items-center gap-5">
                                       <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-amber-500 font-black italic shadow-2xl relative overflow-hidden flex-shrink-0">
                                          {promo.price[0]}
                                          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                                       </div>
                                       <div className="flex-1 min-w-0">
                                          <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight truncate leading-tight mb-1">{promo.offer}</p>
                                          <div className="flex items-center gap-3">
                                             <div className="flex items-center gap-1.5 text-amber-600">
                                                <span className="text-[10px] font-black italic tracking-tighter">{promo.price}</span>
                                             </div>
                                             <div className="w-1 h-1 rounded-full bg-slate-200" />
                                             <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest">{promo.targetRegion || 'ALL INDIA'}</span>
                                             <div className="w-1 h-1 rounded-full bg-slate-200" />
                                             <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{promo.autoCount} UNITS</span>
                                          </div>
                                       </div>
                                       <button 
                                         onClick={() => handleDeleteAnnouncement(promo.id)}
                                         className="w-10 h-10 flex items-center justify-center text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                       >
                                          <Trash2 size={16} />
                                       </button>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-[8px] font-bold text-slate-300 uppercase italic tracking-widest">
                                       <span>Status: Synchronized</span>
                                       <span>ID: {promo.id.toString().slice(-6)}</span>
                                    </div>
                                 </motion.div>
                               ))
                             )}
                          </AnimatePresence>
                       </div>
                    </div>
                 </div>
              </motion.div>
            )}
            {activeTab === 'SYSTEM' && (
              <motion.div 
                key="system"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8 h-full"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2 leading-none italic">
                    <FileText size={16} className="text-amber-500" /> Executive Audit Logs
                  </h3>
                  <div className="flex gap-2">
                     <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                     <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Real-time Stream Active</span>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 text-white font-mono text-[9px] md:text-[11px] space-y-6 border border-white/5 shadow-2xl h-[calc(100vh-280px)] md:h-[calc(100vh-320px)] relative group overflow-y-auto overflow-x-hidden">
                   {/* Decorative Terminal Header */}
                   <div className="absolute top-0 left-0 right-0 h-10 md:h-12 bg-white/5 border-b border-white/5 px-6 md:px-10 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500/50" />
                      <div className="w-2 h-2 rounded-full bg-amber-500/50" />
                      <div className="w-2 h-2 rounded-full bg-green-500/50" />
                      <span className="ml-4 text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">staff_audit_live_v2.0</span>
                   </div>

                   <div className="pt-8 space-y-4">
                      <div className="flex flex-wrap md:flex-nowrap gap-x-6 gap-y-2 text-green-400/80 group-hover:text-green-400 transition-colors">
                         <span className="opacity-40 leading-none">04:23:10</span>
                         <span className="uppercase font-black tracking-widest leading-none">SYS_READY</span>
                         <span className="italic leading-none">Cloud delivery system synchronized at Regional Node South-1.</span>
                      </div>
                      <div className="flex flex-wrap md:flex-nowrap gap-x-6 gap-y-2 text-amber-400/80 group-hover:text-amber-400 transition-colors">
                         <span className="opacity-40 leading-none">04:23:05</span>
                         <span className="uppercase font-black tracking-widest leading-none">BCST_UPDT</span>
                         <span className="italic leading-none">New Ad-Package detected for region: BLR_CENTRAL. Distributing...</span>
                      </div>
                      <div className="flex flex-wrap md:flex-nowrap gap-x-6 gap-y-2 text-white/40">
                         <span className="opacity-40 leading-none">04:22:50</span>
                         <span className="uppercase font-black tracking-widest leading-none">SCAN_HUB</span>
                         <span className="italic leading-none">Scanning 1,240 active units for hardware health indices.</span>
                      </div>
                      <div className="flex flex-wrap md:flex-nowrap gap-x-6 gap-y-2 text-green-400/80">
                         <span className="opacity-40 leading-none">04:22:00</span>
                         <span className="uppercase font-black tracking-widest leading-none">O_SYNC_OK</span>
                         <span className="italic leading-none">Ad download initiated for 45 local autos in Arasikere.</span>
                      </div>
                      <div className="flex flex-wrap md:flex-nowrap gap-x-6 gap-y-2 text-red-400 animate-pulse">
                         <span className="opacity-40 leading-none">04:15:22</span>
                         <span className="uppercase font-black tracking-widest leading-none">ERR_THROT</span>
                         <span className="italic leading-none">Thermal throttling detected on Node #4822. Logged.</span>
                      </div>
                   </div>

                   <div className="absolute bottom-6 md:bottom-12 left-6 md:left-12 flex items-center gap-4 text-white/20">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-bounce" />
                      <span className="text-[10px] font-black tracking-[0.4em] uppercase italic">{`>>`} LISTENING FOR GLOBAL SIGNALS...</span>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Query Detail Panel (Side) */}
        <AnimatePresence>
          {activeQuery && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-96 bg-white border-l border-slate-200 shadow-2xl z-[100] p-8 flex flex-col"
            >
              <div className="flex justify-between items-center mb-10">
                 <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Detail View</h4>
                 <button onClick={() => setActiveQuery(null)} className="p-2 hover:bg-slate-50 rounded-full transition-all text-slate-400 hover:text-slate-900"><X size={20}/></button>
              </div>

              <div className="space-y-8 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                 <div className="glass-card p-8 rounded-[2.5rem] space-y-6 border border-slate-100 shadow-sm relative overflow-hidden bg-slate-900 text-white">
                    <div className="relative z-10 flex items-center gap-4">
                       <div className="w-14 h-14 bg-white/10 text-amber-500 rounded-2xl flex items-center justify-center font-bold shadow-xl border border-white/5">M</div>
                       <div>
                          <p className="text-sm font-bold text-white uppercase tracking-tight">Manju K</p>
                          <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest italic">KA-01-AA-2024</p>
                       </div>
                    </div>
                    <div className="relative z-10 space-y-2">
                       <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">STATED INCIDENT</p>
                       <p className="text-xs text-white/90 leading-relaxed font-bold uppercase tracking-tight italic">"The display flickered for 5 mins and now its completely black. Losing earnings."</p>
                    </div>
                    <div className="absolute top-0 right-0 p-4">
                       <Clock size={100} className="text-white/5 -mr-10 -mt-10" />
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h5 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">System Action Desk</h5>
                    <div className="grid grid-cols-2 gap-3">
                       <button className="p-4 bg-white border border-slate-200 text-slate-900 rounded-2xl text-[9px] font-bold uppercase tracking-widest flex flex-col items-center gap-3 hover:bg-slate-50 transition-all shadow-sm">
                          <CheckCircle size={18} className="text-green-500" /> Mark Resolved
                       </button>
                       <button className="p-4 bg-white border border-slate-200 text-slate-900 rounded-2xl text-[9px] font-bold uppercase tracking-widest flex flex-col items-center gap-3 hover:bg-slate-50 transition-all shadow-sm">
                          <AlertOctagon size={18} className="text-amber-500" /> Escalate
                       </button>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h5 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Support Log Notes</h5>
                    <textarea 
                      placeholder="Enter technical observations..." 
                      className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] p-5 text-[11px] font-bold uppercase tracking-tight focus:ring-1 focus:ring-amber-500 focus:outline-none min-h-[160px] shadow-inner"
                    />
                    <button className="w-full py-5 bg-slate-900 text-white font-bold rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-2">
                       <Send size={14} /> Submit Update
                    </button>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
