import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Users, Monitor, DollarSign, Activity, MapPin, AlertCircle, CheckCircle2, Search, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { cn } from '@/lib/utils';

const data = [
  { name: 'Gandhadakote', autos: 1200, revenue: 45000 },
  { name: 'Malnad', autos: 850, revenue: 32000 },
  { name: 'Bus Stand', autos: 1540, revenue: 58000 },
  { name: 'City Center', autos: 980, revenue: 41000 },
  { name: 'Industrial Area', autos: 650, revenue: 22000 },
];

export default function AdminPortal() {
  const [activeTab, setActiveTab] = useState('DASHBOARD');

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-600 overflow-hidden">
      {/* Mini Sidebar */}
      <div className="w-20 bg-slate-900 flex flex-col items-center py-8 gap-8 border-r border-slate-800">
        <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-slate-900 font-bold">AA</div>
        <div className="flex flex-col gap-6">
          <button onClick={() => setActiveTab('DASHBOARD')} className={cn("p-3 rounded-xl transition-all", activeTab === 'DASHBOARD' ? "bg-amber-500 text-slate-900" : "text-slate-400 hover:bg-slate-800")}><Activity size={20}/></button>
          <button onClick={() => setActiveTab('MAP')} className={cn("p-3 rounded-xl transition-all", activeTab === 'MAP' ? "bg-amber-500 text-slate-900" : "text-slate-400 hover:bg-slate-800")}><MapPin size={20}/></button>
          <button onClick={() => setActiveTab('TICKETS')} className={cn("p-3 rounded-xl transition-all", activeTab === 'TICKETS' ? "bg-amber-500 text-slate-900" : "text-slate-400 hover:bg-slate-800")}><AlertCircle size={20}/></button>
          <button onClick={() => setActiveTab('USERS')} className={cn("p-3 rounded-xl transition-all", activeTab === 'USERS' ? "bg-amber-500 text-slate-900" : "text-slate-400 hover:bg-slate-800")}><Users size={20}/></button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-slate-200 flex items-center justify-between px-8 bg-white overflow-hidden">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest leading-none">Admin Portal <span className="text-slate-300 font-normal mx-2">/</span> <span className="text-slate-400">National HUB</span></h2>
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-200">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              5,248 Units Online
            </div>
          </div>
          <div className="flex items-center gap-6">
             <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search devices..." className="bg-slate-50 border border-slate-100 rounded-lg py-2 pl-9 pr-4 text-xs focus:ring-1 focus:ring-amber-500 w-48 transition-all" />
             </div>
             <div className="flex items-center gap-3">
                <div className="text-right">
                   <p className="text-xs font-bold text-slate-900">Arjun Gowda</p>
                   <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Main Admin</p>
                </div>
                <div className="w-9 h-9 bg-slate-100 rounded-full border border-slate-200" />
             </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'DASHBOARD' ? (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Active Campaigns', value: '142', delta: '↑ 12% vs last week', color: 'amber', icon: <Monitor /> },
              { label: 'Pending Approvals', value: '28', delta: 'Action Required', color: 'blue', icon: <Activity /> },
              { label: 'Total Revenue', value: '₹4,82,900', delta: 'Current Month', color: 'slate', icon: <DollarSign /> },
              { label: 'Technical Alerts', value: '03', delta: 'Critical Issues', color: 'red', icon: <AlertCircle /> },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white/70 backdrop-blur-sm border border-slate-200 p-5 rounded-2xl group hover:border-amber-500/50 transition-all cursor-pointer shadow-sm hover:shadow-md"
              >
                <div className="flex items-center justify-between mb-3 text-slate-400">
                  <div className={cn("p-2 rounded-lg text-slate-900", stat.color === 'amber' ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-600")}>
                    {React.cloneElement(stat.icon as any, { size: 18 })}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{stat.label}</span>
                </div>
                <div className="space-y-0.5">
                  <h3 className={cn("text-2xl font-bold tracking-tight text-slate-900", stat.color === 'red' && "text-red-500")}>{stat.value}</h3>
                  <p className={cn("text-[10px] font-bold uppercase tracking-widest", 
                    stat.color === 'amber' ? "text-green-600" : 
                    stat.color === 'red' ? "text-red-400" :
                    stat.color === 'blue' ? "text-amber-600" : "text-slate-400"
                  )}>{stat.delta}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Area Chart */}
            <div className="lg:col-span-2 glass-card p-6 rounded-3xl">
               <div className="flex items-center justify-between mb-6">
                 <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Revenue Statistics</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Real-time performance</p>
                 </div>
                 <div className="flex gap-1.5">
                    <button className="px-3 py-1 rounded-md bg-amber-500 text-[10px] font-bold text-slate-900">7D</button>
                    <button className="px-3 py-1 rounded-md bg-slate-50 text-[10px] font-bold text-slate-400 border border-slate-100 uppercase tracking-widest">30D</button>
                 </div>
               </div>
               <div className="h-[280px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={data}>
                     <defs>
                       <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                         <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                       </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                     <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                     <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                     <Tooltip 
                        contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' }}
                     />
                     <Area type="monotone" dataKey="revenue" stroke="#f59e0b" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                   </AreaChart>
                 </ResponsiveContainer>
               </div>
            </div>

            {/* Area Distribution */}
            <div className="glass-card p-6 rounded-3xl">
               <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight mb-6">Area Distribution</h3>
               <div className="space-y-4">
                 {data.map((item, i) => (
                   <div key={i} className="space-y-1.5">
                     <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                       <span className="text-slate-500">{item.name}</span>
                       <span className="text-slate-900">{item.autos}</span>
                     </div>
                     <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                       <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.autos/1600)*100}%` }}
                        className="h-full bg-slate-900 rounded-full" 
                       />
                     </div>
                   </div>
                 ))}
               </div>
               <button className="w-full mt-10 py-3 bg-amber-500 rounded-xl text-slate-900 text-[10px] font-bold uppercase tracking-widest hover:bg-amber-600 transition-all">
                  MASTER DATA EXPORT
               </button>
            </div>
          </div>

          {/* Recent Ad Requests */}
          <div className="glass-card rounded-3xl overflow-hidden shadow-sm">
             <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Recent Ad Requests</h3>
                <button className="text-[10px] font-bold text-amber-600 uppercase tracking-widest hover:underline">View All</button>
             </div>
             <div className="divide-y divide-slate-50">
                {[
                  { id: 'LG-992', company: 'Legacy Real Estate', area: 'Sector 4', units: '20 Autos', status: 'PAID', color: 'blue', time: '14m ago' },
                  { id: 'K1-102', company: 'Kitchen 101 Hotel', area: 'Station Rd', units: '50 Autos', status: 'REVIEW', color: 'red', time: '1h ago' },
                ].map((q, i) => (
                  <div key={i} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                     <div className="flex items-center gap-4">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs uppercase", q.color === 'blue' ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600")}>
                          {q.company.slice(0, 2)}
                        </div>
                        <div>
                           <p className="text-slate-900 font-bold text-xs">{q.company}</p>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">{q.area} • {q.units}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-8">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{q.time}</span>
                        <div className={cn("px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-widest border", 
                           q.status === 'PAID' ? "bg-green-50 text-green-600 border-green-100" :
                           "bg-amber-50 text-amber-600 border-amber-100"
                        )}>
                           {q.status}
                        </div>
                        <button className="text-slate-300 hover:text-amber-500 transition-colors"><Search size={16}/></button>
                     </div>
                  </div>
                ))}
             </div>
          </div>
            </>
          ) : activeTab === 'MAP' ? (
            <div className="h-full space-y-6">
              <div className="flex justify-between items-end">
                <div>
                   <h2 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter">Live Network Map</h2>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time device positioning</p>
                </div>
                <div className="flex gap-2">
                   <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Active: 4,102</span>
                   </div>
                   <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Warning: 142</span>
                   </div>
                </div>
              </div>
              <div className="flex-1 bg-slate-200 rounded-[2.5rem] relative overflow-hidden border-4 border-white shadow-2xl">
                 <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/light-v10/static/76.09,13.01,12,0/800x600?access_token=pk.eyJ1IjoiYm90LWNvZGVyIiwiYSI6ImNreW94...')] bg-center bg-cover opacity-50 grayscale" />
                 <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-4">
                       <MapPin size={48} className="text-amber-500 mx-auto animate-bounce" />
                       <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 bg-white/80 backdrop-blur px-6 py-2 rounded-full shadow-lg">Initializing GPS nodes...</p>
                    </div>
                 </div>
                 {/* Mock UI Markers */}
                 <div className="absolute top-1/4 left-1/3 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
                 <div className="absolute top-1/2 left-2/3 w-3 h-3 bg-amber-500 rounded-full border-2 border-white shadow-lg animate-pulse" delay-animate-1 />
                 <div className="absolute bottom-1/3 left-1/2 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-lg animate-pulse" delay-animate-2 />
              </div>
            </div>
          ) : activeTab === 'TICKETS' ? (
            <div className="h-full space-y-6">
               <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter">Support Hub</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Driver & Advertiser Assistance</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-slate-900 text-amber-500 rounded-xl text-[9px] font-black uppercase tracking-widest">Active Tickets (12)</button>
                    <button className="px-4 py-2 bg-white text-slate-400 border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest uppercase tracking-widest hover:border-slate-300">Resolved</button>
                  </div>
               </div>
               <div className="grid grid-cols-1 gap-4">
                  {[
                    { id: 'T-101', user: 'Driver Manju', type: 'HARDWARE', subject: 'Display screen flickering', priority: 'HIGH', time: '12m ago' },
                    { id: 'T-102', user: 'Advertiser Zomato', type: 'PAYMENT', subject: 'Incentive clearance issue', priority: 'MEDIUM', time: '1h ago' },
                    { id: 'T-103', user: 'Staff Rahul', type: 'ACCESS', subject: 'Permission revocation', priority: 'LOW', time: '4h ago' },
                  ].map((ticket, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="glass-card p-6 rounded-3xl flex items-center justify-between hover:border-amber-500/50 transition-all group"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 font-bold border border-slate-100 group-hover:bg-amber-500 group-hover:text-slate-900 transition-colors">
                           {ticket.type[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                             <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-widest">{ticket.id}</span>
                             <span className={cn("text-[8px] font-black uppercase tracking-widest", ticket.priority === 'HIGH' ? "text-red-500" : ticket.priority === 'MEDIUM' ? "text-amber-600" : "text-blue-500")}>
                               {ticket.priority} PRIORITY
                             </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 italic tracking-tight">{ticket.subject}</h4>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Requested by {ticket.user} • {ticket.time}</p>
                        </div>
                      </div>
                      <button className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-amber-500 transition-all">
                        <ChevronRight size={18} />
                      </button>
                    </motion.div>
                  ))}
               </div>
            </div>
          ) : (
            <div className="h-full space-y-6">
               <div className="flex justify-between items-center text-white bg-slate-900 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter text-amber-500">Fleet Operations</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic opacity-80">Managing 12,482 Active Nodes across India</p>
                  </div>
                  <button className="bg-amber-500 text-slate-900 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all">
                    Register New Device
                  </button>
               </div>
               <div className="glass-card rounded-[2rem] overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Fleet Unit</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Operator</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Region</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {[
                        { id: 'KA-13-4822', user: 'Lokesh K', status: 'ACTIVE', region: 'Bus Stand' },
                        { id: 'KA-13-1102', user: 'Ramesh H', status: 'IDLE', region: 'City Center' },
                        { id: 'KA-13-9001', user: 'Suresh B', status: 'OFFLINE', region: 'Sector 4' },
                      ].map((u, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                           <td className="px-6 py-4">
                              <span className="text-xs font-black text-slate-900 tracking-tighter">{u.id}</span>
                           </td>
                           <td className="px-6 py-4">
                              <span className="text-[11px] font-bold text-slate-600 italic tracking-tight">{u.user}</span>
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                 <div className={cn("w-1.5 h-1.5 rounded-full", u.status === 'ACTIVE' ? "bg-green-500" : u.status === 'IDLE' ? "bg-amber-500" : "bg-red-500")} />
                                 <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{u.status}</span>
                              </div>
                           </td>
                           <td className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{u.region}</td>
                           <td className="px-6 py-4">
                              <button className="text-slate-300 hover:text-amber-500 transition-colors p-1"><Monitor size={14} /></button>
                           </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
