import React from 'react';
import { Smartphone, Monitor, Info, Sun, Moon, Maximize2, Tv } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStudio } from './StudioContext';

export const PreviewBar: React.FC = () => {
  const { state } = useStudio();
  
  const previews = [
    { id: 'day', label: 'Auto Screen (Day)', icon: Sun, brightness: 100 },
    { id: 'night', label: 'Auto Screen (Night)', icon: Moon, brightness: 40 },
    { id: '19inch', label: '19-inch Monitor', icon: Tv, brightness: 90, isMonitor: true },
    { id: 'mobile', label: 'Mobile App', icon: Smartphone, brightness: 100, isMobile: true },
    { id: 'billboard', label: 'Digital Billboard', icon: Maximize2, brightness: 80 },
  ];

  return (
    <div className="h-[140px] bg-[#0f172a] border-t border-white/5 flex items-center px-6 shrink-0 overflow-x-auto no-scrollbar gap-8 shadow-[0_-10px_30px_rgba(0,0,0,0.3)]">
      {/* Intro Section */}
      <div className="flex items-center gap-5 border-r border-white/10 pr-10 shrink-0">
        <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-500 shadow-[inset_0_0_20px_rgba(59,130,246,0.1)] border border-blue-500/20">
           <Monitor size={32} />
        </div>
        <div>
           <h3 className="text-xs font-black text-white uppercase tracking-widest mb-1">Live Simulcast</h3>
           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Real-time Previews</p>
        </div>
      </div>

      {/* Preview Items */}
      <div className="flex items-center gap-5 py-2">
        {previews.map((item, i) => (
          <div key={item.id} className="flex flex-col gap-2 shrink-0 group">
             <div className="flex items-center gap-2 pl-1">
                <item.icon size={10} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-300 transition-colors">{item.label}</div>
             </div>
             
             <div className={cn(
               "h-[76px] bg-slate-900 rounded-xl border transition-all cursor-pointer relative overflow-hidden group-hover:shadow-[0_0_20px_rgba(59,130,246,0.25)]",
               item.id === 'day' ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-800 hover:border-slate-600",
               item.isMobile ? "w-[50px]" : item.isMonitor ? "w-[130px]" : "w-[150px]"
             )}>
                {/* Simulated Content representing the canvas */}
                <div 
                  className="w-full h-full bg-[#1e293b] flex items-center justify-center p-2"
                  style={{ filter: `brightness(${item.brightness / 100})` }}
                >
                   <div className="w-full h-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                      <div className="w-4 h-1 bg-blue-400/40 rounded-full" />
                   </div>
                </div>
                
                {/* Real-time Indicator */}
                {i === 0 && (
                  <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.8)]" />
                )}
             </div>
          </div>
        ))}
      </div>

      {/* Analytics/Info Card */}
      <div className="ml-auto flex items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-white/5 shadow-inner shrink-0 max-w-[340px]">
         <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 shrink-0">
           <Info size={20} />
         </div>
         <div className="space-y-1">
           <p className="text-[10px] text-slate-300 font-bold leading-tight">Monitor Optimization Active</p>
           <p className="text-[9px] text-slate-500 font-medium leading-relaxed">
             Layout automatically adjusts for <span className="text-blue-400 font-bold">19" advertisement panels</span> to ensure zero clipping in safe zones.
           </p>
         </div>
      </div>
    </div>
  );
};
