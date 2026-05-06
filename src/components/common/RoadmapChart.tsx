import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Circle, Clock, Layout, Users, Smartphone, ShieldCheck, Target, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoadmapItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  status: 'DONE' | 'IN_PROGRESS' | 'PLANNED';
  features: string[];
  color: string;
}

const roadmapItems: RoadmapItem[] = [
  {
    id: 'ADMIN',
    title: 'Admin Command',
    icon: <ShieldCheck size={20} />,
    status: 'DONE',
    features: ['Live Fleet Tracking', 'Financial Analytics', 'Revenue Breakdown', 'Staff Oversight'],
    color: 'bg-slate-950 text-amber-500'
  },
  {
    id: 'CUSTOMER',
    title: 'Customer Hub',
    icon: <Target size={20} />,
    status: 'DONE',
    features: ['Campaign Booking', 'Real-time Impressions', 'Network Reach Analytics', 'Support Access'],
    color: 'bg-amber-500 text-slate-950'
  },
  {
    id: 'DRIVER',
    title: 'Driver Pilot',
    icon: <Users size={20} />,
    status: 'DONE',
    features: ['Earning Dashboard', 'GPS Telemetry Link', 'Document Verification', 'Payout History'],
    color: 'bg-slate-100 text-slate-900 border-slate-200'
  },
  {
    id: 'STAFF',
    title: 'Operations HQ',
    icon: <Layout size={20} />,
    status: 'DONE',
    features: ['Ticket Management', 'System Diagnosis', 'Maintenance Logs', 'Service Reports'],
    color: 'bg-slate-900 text-slate-100'
  },
  {
    id: 'DEVICE',
    title: 'Hardware Link',
    icon: <Smartphone size={20} />,
    status: 'DONE',
    features: ['Auto-Ads Rendering', 'Offline Edge Logic', 'Battery/Sync Telemetry', 'Remote Commands'],
    color: 'bg-slate-200 text-slate-800'
  }
];

export default function RoadmapChart({ onClose }: { onClose?: () => void }) {
  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Zap size={18} className="text-amber-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Project Architecture</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter text-slate-900 uppercase">
            Product <span className="text-amber-500">Roadmap</span>
          </h2>
        </div>
        <div className="flex items-center gap-6">
           <div className="text-right">
              <p className="text-2xl font-black text-slate-900 italic tracking-tighter leading-none">100%</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Phase 1 Delivery</p>
           </div>
           {onClose && (
             <button 
               onClick={onClose}
               className="p-3 bg-slate-950 text-white rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl font-black text-[10px] uppercase tracking-widest px-6"
             >
               Exit Audit
             </button>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roadmapItems.map((item, idx) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={cn(
              "group relative p-6 rounded-[2.5rem] overflow-hidden border border-transparent transition-all hover:shadow-2xl hover:shadow-amber-500/10",
              item.id === 'ADMIN' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-100 shadow-xl'
            )}
          >
            <div className="flex items-start justify-between mb-6">
              <div className={cn(
                "p-4 rounded-3xl",
                item.color
              )}>
                {item.icon}
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full scale-90 origin-right">
                <CheckCircle2 size={12} className="text-green-500" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{item.status}</span>
              </div>
            </div>

            <h3 className={cn(
              "text-lg font-black italic uppercase tracking-tight mb-4",
              item.id === 'ADMIN' ? 'text-white' : 'text-slate-900'
            )}>
              {item.title}
            </h3>

            <div className="space-y-2.5">
              {item.features.map((feature, fIdx) => (
                <div key={fIdx} className="flex items-center gap-2">
                   <div className={cn("w-1 h-1 rounded-full", item.id === 'ADMIN' ? 'bg-amber-500/50' : 'bg-amber-500')} />
                   <p className={cn(
                     "text-[10px] font-bold uppercase tracking-tight italic",
                     item.id === 'ADMIN' ? 'text-slate-500' : 'text-slate-400'
                   )}>
                     {feature}
                   </p>
                </div>
              ))}
            </div>

            {/* Status Bar */}
            <div className="mt-8 pt-6 border-t border-slate-100/10">
               <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Login Interface</span>
                  <span className="text-[8px] font-black text-green-500 uppercase tracking-widest">Active</span>
               </div>
               <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ delay: idx * 0.2 + 0.5, duration: 1 }}
                    className="h-full bg-amber-500"
                  />
               </div>
            </div>
          </motion.div>
        ))}

        {/* Future Card */}
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="group relative p-6 rounded-[2.5rem] bg-amber-500 border border-amber-400 flex flex-col justify-center items-center text-center shadow-2xl shadow-amber-500/20"
          >
            <div className="mb-4">
              <Clock size={32} className="text-slate-950 animate-spin-slow" />
            </div>
            <h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-950 mb-2">Next Phase</h3>
            <p className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] italic max-w-[150px]">
              AI Dynamic Optimization & Edge Delivery
            </p>
            <div className="mt-6 px-4 py-2 bg-slate-950 rounded-full">
               <span className="text-[8px] font-black text-white uppercase tracking-widest">Q3 2026 Target</span>
            </div>
          </motion.div>
      </div>
    </div>
  );
}
