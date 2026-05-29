import React, { useState, useEffect } from 'react';
import { 
  Undo2, Redo2, Crown, Download, Share2, 
  ChevronDown, Monitor, Smartphone, Maximize2, Cloud,
  Check, Loader2
} from 'lucide-react';
import { useStudio } from './StudioContext';
import { PLANS } from './types';
import { cn } from '@/lib/utils';

interface TopBarProps {
  onClose?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onClose }) => {
  const { state, upgrade, userRole } = useStudio();
  const [isExporting, setIsExporting] = useState(false);
  const [showUpgradePlans, setShowUpgradePlans] = useState(false);
  const [showPurchasePopup, setShowPurchasePopup] = useState(false);
  const isAdminRole = userRole === 'ADMIN' || userRole === 'STAFF' || userRole === 'SUPPORT';
  
  useEffect(() => {
    if (state.plan === 'FREE' && !isAdminRole) {
       setShowPurchasePopup(true);
    }
  }, [state.plan, isAdminRole]);

  const currentPlan = PLANS[state.plan];

  const handleDownload = () => {
    if (state.plan === 'FREE') {
      setShowPurchasePopup(true);
      return;
    }

    setIsExporting(true);
    
    // Create a mock image download synchronously to bypass popup/download blockers
    const canvas = document.createElement("canvas");
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d");
    if (ctx) {
       ctx.fillStyle = "#0f172a";
       ctx.fillRect(0,0, 1920, 1080);
       ctx.font = "bold 80px Inter, sans-serif";
       ctx.fillStyle = "#ffffff";
       ctx.fillText("AutoAds High-Res Export", 450, 500);
       ctx.font = "40px Inter, sans-serif";
       ctx.fillStyle = "#94a3b8";
       ctx.fillText("Premium Mode", 800, 600);
    }
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `autoads_export_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setIsExporting(false);
    setTimeout(() => {
      const winAny = window as any;
      if (typeof winAny.showToast === 'function') {
         winAny.showToast('Design successfully exported to PNG!', 'success');
      } else {
         alert('Design successfully exported to PNG!');
      }
    }, 100);
  };

  const handleShare = () => {
    if (state.plan === 'FREE') {
       setShowPurchasePopup(true);
       return;
    }
    alert('Share link generated and copied to clipboard.');
  };

  return (
    <>
      <div className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900 text-white shrink-0 z-[1100]">
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 border-r border-slate-800 pr-4">
            <button 
              onClick={onClose}
              title="Exit to Portal"
              className="px-3 py-1.5 rounded-lg flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest text-slate-300 hover:text-white border border-slate-800 hover:border-slate-705 hover:bg-slate-800 transition-all active:scale-95"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Exit to Portal
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-900/50">
              A
            </div>
            <span className="font-bold text-lg tracking-tight hidden sm:inline">AutoAds <span className="text-blue-400 font-medium italic">Studio</span></span>
          </div>
          
          <div className="h-6 w-px bg-slate-700 hidden md:block" />
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 group cursor-pointer">
              <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Summer Offer Banner</span>
              <button className="p-1 text-slate-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-widest font-bold bg-slate-800/50 px-2.5 py-1 rounded-md border border-white/5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              <Cloud size={10} className="text-slate-400" />
              <span className="opacity-60">Synced</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Undo/Redo */}
          <div className="flex items-center gap-1 border-r border-slate-700 pr-4 mr-2">
            <button className="p-2 hover:bg-white/10 rounded transition-colors text-slate-400 hover:text-white">
              <Undo2 size={18} />
            </button>
            <button className="p-2 hover:bg-white/10 rounded transition-colors text-slate-400 hover:text-white">
              <Redo2 size={18} />
            </button>
          </div>

          {/* Plan Indicator / Upgrade */}
          <div className="relative">
            {isAdminRole ? (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
              >
                <Crown size={14} fill="currentColor" />
                Team Access
              </div>
            ) : (
              <>
                <button 
                  onClick={() => setShowUpgradePlans(!showUpgradePlans)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                    state.plan === 'GOLD' ? "bg-amber-400/10 border-amber-400/20 text-amber-400" :
                    state.plan === 'SILVER' ? "bg-slate-400/10 border-slate-400/20 text-slate-200" :
                    state.plan === 'FREE' ? "bg-slate-800 border-slate-700 text-slate-400" :
                    "bg-blue-600/10 border-blue-600/20 text-blue-400"
                  )}
                >
                  <Crown size={14} fill="currentColor" className={state.plan === 'BRASS' ? 'text-transparent stroke-blue-400' : ''} />
                  {currentPlan.badge}
                  <ChevronDown size={14} />
                </button>

                {/* Upgrade Dropdown */}
                {showUpgradePlans && (
                  <div className="absolute top-full right-0 mt-2 w-64 bg-[#1e293b] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Your Subscription</h3>
                    </div>
                    <div className="p-2 space-y-1">
                      {(['FREE', 'BRASS', 'SILVER', 'GOLD'] as const).map((p) => (
                        <button 
                          key={p}
                          onClick={() => {
                            upgrade(p);
                            setShowUpgradePlans(false);
                          }}
                          className={cn(
                            "w-full text-left p-3 rounded-xl transition-all flex items-center justify-between group",
                            state.plan === p ? "bg-blue-600 shadow-lg" : "hover:bg-slate-800"
                          )}
                        >
                          <div>
                              <p className={cn("text-xs font-bold", state.plan === p ? "text-white" : "text-slate-200")}>{PLANS[p].name}</p>
                              <p className={cn("text-[10px]", state.plan === p ? "text-blue-100" : "text-slate-500")}>{PLANS[p].price}</p>
                          </div>
                          {state.plan === p && <Check size={16} className="text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <button 
            onClick={handleDownload}
            disabled={isExporting}
            className={cn(
              "bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50",
              isExporting && "animate-pulse"
            )}
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {isExporting ? 'Exporting...' : 'Export'}
          </button>

          <button 
            onClick={handleShare}
            className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white border border-slate-700 active:scale-95"
            title="Share Preview"
          >
            <Share2 size={18} />
          </button>

          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 border border-white/20 p-[2px] overflow-hidden ml-2 shadow-xl cursor-help">
            <div className="w-full h-full rounded-full overflow-hidden bg-[#0f172a]">
              <img 
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" 
                alt="User" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      {showPurchasePopup && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
           <div className="bg-[#1e293b] w-full max-w-sm rounded-[2rem] border border-slate-700 p-8 shadow-2xl relative">
              <button 
                 onClick={() => setShowPurchasePopup(false)}
                 className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors"
              >
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
              
              <div className="w-16 h-16 bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center mb-6 shadow-inner mx-auto">
                 <Crown size={32} />
              </div>
              
              <div className="text-center space-y-2 mb-8">
                 <h2 className="text-xl font-black text-white uppercase tracking-widest italic">Plan Required</h2>
                 <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                   Exporting & Editing require an active subscription plan. You are currently in read-only generic preview mode.
                 </p>
              </div>

              <div className="space-y-4 mb-8 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                 <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">What we provide</h3>
                 <ul className="space-y-3">
                   {['Unlimited poster editing', 'All Premium Templates', 'High-res Exports & Video', 'Premium AI Text & Image Tools'].map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs font-bold text-slate-300">
                         <div className="w-1 h-1 bg-blue-500 rounded-full" />
                         {f}
                      </li>
                   ))}
                 </ul>
              </div>

              <button 
                 onClick={() => {
                   setShowPurchasePopup(false);
                   if (onClose) onClose(); // Take them back to CustomerPortal so they can buy
                 }}
                 className="w-full bg-blue-600 text-white rounded-xl py-4 text-xs font-black uppercase tracking-widest hover:bg-blue-500 shadow-xl shadow-blue-900/40 transition-all active:scale-95"
              >
                 View All Plans
              </button>
           </div>
        </div>
      )}
    </>
  );
};
