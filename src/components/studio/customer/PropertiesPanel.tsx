import React from 'react';
import { 
  Type, Palette, AlignLeft, AlignCenter, AlignRight, 
  Layers, Ghost, Zap, MousePointer2, ChevronRight,
  Maximize, Activity, Sparkles, Hash, Wand2, Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStudio } from './StudioContext';

export const PropertiesPanel: React.FC = () => {
  const { state, openUpgradeModal } = useStudio();

  return (
    <div className="w-[280px] bg-[#0f172a] border-l border-slate-800 flex flex-col shrink-0 z-10 shadow-[-10px_0_30px_rgba(0,0,0,0.3)] border-t border-white/5">
      <div className="h-14 px-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-slate-900/30">
        <div className="flex items-center gap-3">
          <Wand2 size={16} className="text-blue-400" />
          <h2 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Inspector</h2>
        </div>
        <button className="text-slate-500 hover:text-white transition-colors">
          <Settings size={16} />
        </button>
      </div>
      
      <div className="p-6 space-y-8 overflow-y-auto no-scrollbar pb-20">
        {/* Selection Context */}
        <div className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-900/40">
              <Type size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black text-white uppercase tracking-widest">Active Text</p>
              <p className="text-[9px] text-blue-400 font-bold">Layer #1</p>
            </div>
          </div>
        </div>

        {/* Text Appearance */}
        <div className="space-y-5">
           <div className="flex items-center justify-between group cursor-pointer">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Type size={14} />
                Typography
              </span>
              <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-300 transition-colors" />
           </div>
           
           <div className="grid gap-3">
              <div className="space-y-1.5">
                 <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Font Family</label>
                 <select className="w-full bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500/50 appearance-none shadow-inner cursor-pointer">
                    <option>Inter</option>
                    <option>Space Grotesk</option>
                    <option>Outfit</option>
                    <option>JetBrains Mono</option>
                 </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Size</label>
                    <input type="number" defaultValue={48} className="w-full bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500/50 shadow-inner" />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Weight</label>
                    <select className="w-full bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500/50 appearance-none shadow-inner cursor-pointer">
                       <option>Bold</option>
                       <option>Black</option>
                       <option>Medium</option>
                    </select>
                 </div>
              </div>
           </div>
        </div>

        {/* Global Inspector Block */}
        <div className="p-5 bg-slate-900/50 border border-white/5 rounded-2xl space-y-4">
           <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                <Palette size={12} />
                Appearance
              </span>
              <div className="w-4 h-4 bg-orange-500 rounded shadow-lg shadow-orange-900/50" />
           </div>

           <div className="space-y-3">
              <div className="flex items-center justify-between">
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Opacity</span>
                 <span className="text-[10px] font-bold text-white">85%</span>
              </div>
              <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                 <div className="h-full w-[85%] bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
              </div>
           </div>

           <div className="flex items-center justify-between pt-2">
              <button className="flex-1 flex flex-col items-center gap-1.5 p-2 hover:bg-white/5 rounded-lg transition-colors">
                 <Ghost size={14} className="text-slate-400" />
                 <span className="text-[8px] font-black uppercase text-slate-500">Shadow</span>
              </button>
              <button className="flex-1 flex flex-col items-center gap-1.5 p-2 hover:bg-white/5 rounded-lg transition-colors">
                 <Zap size={14} className="text-slate-400" />
                 <span className="text-[8px] font-black uppercase text-slate-500">Glow</span>
              </button>
              <button className="flex-1 flex flex-col items-center gap-1.5 p-2 hover:bg-white/5 rounded-lg transition-colors">
                 <Hash size={14} className="text-slate-400" />
                 <span className="text-[8px] font-black uppercase text-slate-500">Outline</span>
              </button>
           </div>
        </div>

        {/* Placement Tools */}
        <div className="space-y-4">
           <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] border-b border-white/5 pb-2">Arrangement</h3>
           <div className="grid grid-cols-2 gap-2">
              <button className="flex items-center gap-3 bg-slate-900/80 border border-slate-700/50 p-3 rounded-xl hover:border-blue-500/30 transition-all group">
                 <Layers size={14} className="text-slate-500 group-hover:text-blue-400" />
                 <span className="text-[10px] font-bold text-slate-300">Front</span>
              </button>
              <button className="flex items-center gap-3 bg-slate-900/80 border border-slate-700/50 p-3 rounded-xl hover:border-blue-500/30 transition-all group">
                 <Maximize size={14} className="text-slate-500 group-hover:text-blue-400" />
                 <span className="text-[10px] font-bold text-slate-300">Scale</span>
              </button>
           </div>
        </div>

        {/* AI Enhancement Promo for Brass/Silver */}
        {state.plan !== 'GOLD' && (
           <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-900/40 via-blue-900/20 to-transparent border border-blue-500/20 relative overflow-hidden group cursor-pointer shadow-xl">
              <div className="relative z-10">
                <Sparkles size={20} className="text-blue-400 mb-3 animate-pulse" />
                <h4 className="text-xs font-black text-white uppercase tracking-widest mb-1">AI Smart Auto-Fit</h4>
                <p className="text-[9px] text-slate-400 font-medium leading-relaxed">
                   Automatically align text for <span className="text-amber-400">billboard clarity</span> using Golden Ratio spacing.
                </p>
                <button 
                  onClick={() => openUpgradeModal()}
                  className="mt-4 w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] transition-all"
                >
                  Upgrade to Gold
                </button>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};
