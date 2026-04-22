import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Truck, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingProps {
  onComplete: () => void;
}

const AdIcon = () => (
  <div className="relative w-24 h-24 flex items-center justify-center">
    {/* Animated Glow Backdrop */}
    <motion.div 
      animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
      transition={{ duration: 4, repeat: Infinity }}
      className="absolute inset-0 bg-amber-500 rounded-full blur-2xl"
    />
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="z-10">
      {/* High-Tech Ad Unit */}
      <rect x="10" y="20" width="60" height="40" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="2" />
      <rect x="15" y="25" width="50" height="30" rx="3" fill="#000" />
      {/* Moving Content Bars */}
      <motion.rect 
        x="20" y="30" height="4" rx="1" fill="#f59e0b"
        animate={{ width: [10, 30, 15] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.rect 
        x="20" y="38" height="4" rx="1" fill="#f59e0b"
        animate={{ width: [25, 10, 20] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      />
      <motion.rect 
        x="20" y="46" height="4" rx="1" fill="#f59e0b"
        animate={{ width: [15, 25, 10] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      {/* Signal Waves */}
      <motion.circle cx="40" cy="10" r="2" fill="#f59e0b" animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity }} />
      <motion.path d="M30 10 Q40 0 50 10" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, delay: 0.2 }} />
      <motion.path d="M20 15 Q40 -5 60 15" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, delay: 0.4 }} />
    </svg>
  </div>
);

const AutoRickshawIcon = () => (
  <div className="relative w-32 h-32 flex items-center justify-center">
    <svg width="120" height="80" viewBox="0 0 120 80" fill="none">
      {/* 3-WHEELER SIDE PROFILE */}
      {/* Front Wheel */}
      <circle cx="100" cy="65" r="8" fill="#111827" stroke="white" strokeWidth="2" />
      <circle cx="100" cy="65" r="3" fill="#334155" />
      
      {/* Rear Wheel (Only one visible in true profile, but slightly offset for 3D feel) */}
      <circle cx="25" cy="65" r="10" fill="#111827" stroke="white" strokeWidth="2" />
      <circle cx="25" cy="65" r="4" fill="#334155" />
      
      {/* Main Body (Yellow) */}
      <path 
        d="M20 60 L90 60 L100 45 L95 15 L25 15 Q15 15 15 25 L15 50 Q15 60 20 60Z" 
        fill="#f59e0b" 
      />
      
      {/* Front Mudguard */}
      <path d="M85 60 L110 60 L105 50 L95 50 Z" fill="#1f2937" />
      
      {/* Canopy / Roof (Black) */}
      <path 
        d="M25 15 L95 15 L85 5 L35 5 Q25 5 25 15Z" 
        fill="#1f2937" 
      />
      
      {/* Window / Interior Openings */}
      <path d="M30 20 L80 20 L85 45 L25 45 Z" fill="#0f172a" />
      
      {/* Handlebars / Front Fork */}
      <line x1="100" y1="45" x2="100" y2="65" stroke="#1f2937" strokeWidth="4" strokeLinecap="round" />
      
      {/* Side Mirror */}
      <path d="M85 30 L92 28" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" />
      
      {/* Headlight */}
      <circle cx="102" cy="40" r="4" fill="#fbbf24" className="animate-pulse" />
      
      {/* Digital Ad Display Unit on side */}
      <rect x="35" y="48" width="40" height="12" rx="2" fill="#111827" />
      <motion.rect 
        x="37" y="50" width="36" height="8" rx="1" fill="#f59e0b"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      
      {/* Trim / Details */}
      <path d="M15 40 H95" stroke="white" strokeWidth="1" opacity="0.3" />
    </svg>
  </div>
);

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [index, setIndex] = useState(0);

  const screens = [
    {
      title: "For Advertisers",
      description: "Scale your business with high-visibility digital displays on auto-rickshaws across the city.",
      icon: <AdIcon />,
      color: "bg-slate-900",
      accent: "text-amber-500",
      features: ["Real-time Campaign Stats", "City-wide Coverage", "Cost-effective Pricing"]
    },
    {
      title: "For Drivers",
      description: "Increase your daily earnings by hosting ad displays. Smart tracking, guaranteed payouts.",
      icon: <AutoRickshawIcon />,
      color: "bg-amber-500",
      accent: "text-slate-900",
      features: ["Passive Income", "Easy Tech Setup", "Flexible Working Hours"]
    }
  ];

  const next = () => {
    if (index < screens.length - 1) {
      setIndex(index + 1);
    } else {
      onComplete();
    }
  };

  const screen = screens[index];

  return (
    <div className="fixed inset-0 bg-[#f8fafc] z-[150] flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col"
        >
          <div className={cn("h-64 flex items-center justify-center text-white p-12 transition-colors duration-500", screen.color)}>
            <motion.div
              initial={{ scale: 0.5, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              className={screen.accent}
            >
              {screen.icon}
            </motion.div>
          </div>

          <div className="p-10 flex-1 flex flex-col">
            <div className="space-y-4 mb-10">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">
                {screen.title}
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed font-bold uppercase tracking-tight">
                {screen.description}
              </p>
            </div>

            <div className="space-y-3 mb-12">
              {screen.features.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center shrink-0">
                    <Check size={14} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">{f}</span>
                </div>
              ))}
            </div>

            <div className="mt-auto flex items-center justify-between">
              <button 
                onClick={onComplete}
                className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
              >
                Skip Intro
              </button>
              
              <div className="flex gap-2">
                {screens.map((_, i) => (
                  <div 
                    key={i} 
                    className={cn("h-1.5 rounded-full transition-all duration-300", 
                      i === index ? "w-8 bg-amber-500" : "w-2 bg-slate-200"
                    )} 
                  />
                ))}
              </div>

              <button 
                onClick={next}
                className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
