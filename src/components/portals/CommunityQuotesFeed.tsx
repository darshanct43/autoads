import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Quote, Sparkles, Heart } from 'lucide-react';

interface CommunityQuotesFeedProps {
  quote: {
    quote: string;
    driverName: string;
    terminalId: string;
  };
  duration: number; // in seconds
  onComplete: () => void;
}

export default function CommunityQuotesFeed({ quote, duration, onComplete }: CommunityQuotesFeedProps) {
  
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, duration * 1000);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <div 
      className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-black z-[100] flex flex-col justify-between p-16 text-white text-left overflow-hidden"
      id="community-quotes-overlay"
    >
      {/* Background ambient radial glowing spots */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Header info bar */}
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
            <Quote size={24} className="text-amber-500 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block leading-none">AutoAds Platform</span>
            <h3 className="font-extrabold text-lg text-slate-100 tracking-tight mt-1 font-sans">Community Inspiration</h3>
          </div>
        </div>
        
        {/* Animated Badge */}
        <div className="flex items-center gap-2 bg-slate-800/40 p-2 px-4 rounded-full border border-slate-700/30">
          <Sparkles className="text-amber-400 shrink-0" size={14} />
          <span className="text-[11px] font-bold text-slate-300 font-sans tracking-wide">Family Friendly Display</span>
        </div>
      </div>

      {/* Middle Quote quote box */}
      <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto space-y-8 py-10">
        
        {/* Animated quote icon background */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          {/* Main Huge quote */}
          <h2 className="text-4xl sm:text-5xl lg:text-5xl font-extrabold italic leading-snug tracking-tight text-white font-serif stroke-slate-50 relative z-10 select-none">
            "{quote.quote}"
          </h2>
        </motion.div>

        {/* Attribution / Signature line */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex items-center gap-4 pt-4 border-t border-slate-800/40 max-w-md"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center font-black text-sm shadow-lg shadow-amber-500/10 shrink-0">
            {quote.driverName.charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="text-sm font-black text-slate-100 font-sans tracking-tight">
              — {quote.driverName}
            </span>
            <span className="text-[10px] font-extrabold text-slate-400 font-mono tracking-wider block mt-0.5 uppercase">
              Partner Driver / {quote.terminalId?.replace('TRM-', '#') || 'AutoAds Fleet'}
            </span>
          </div>
        </motion.div>

      </div>

      {/* Bottom Progress loader & counter */}
      <div className="border-t border-slate-800/60 pt-6 space-y-4 shrink-0">
        <div className="flex justify-between items-center text-[10px] font-mono tracking-wider text-slate-500 uppercase font-bold">
          <span>Resuming sponsorship loop shortly</span>
          <span className="flex items-center gap-1">
            <Heart size={10} className="text-rose-500 animate-pulse" /> Driven by auto partners
          </span>
        </div>

        {/* Progress horizontal */}
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: duration, ease: 'linear' }}
            className="h-full bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
          />
        </div>
      </div>

    </div>
  );
}
