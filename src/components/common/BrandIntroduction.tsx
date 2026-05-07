import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { Truck, ChevronRight, Check, Zap, Map } from 'lucide-react';

interface BrandIntroductionProps {
  onComplete: () => void;
}

export default function BrandIntroduction({ onComplete }: BrandIntroductionProps) {
  const [step, setStep] = useState(0);

  const slides = [
    {
      title: "Mayaan Presents",
      subtitle: "AUTO ADS",
      tagline: "Smart Ads. Maximum Reach. Real Results.",
      isSplash: true
    },
    {
      title: "FOR DRIVERS",
      icon: Truck,
      description: "INCREASE YOUR DAILY EARNINGS BY HOSTING AD DISPLAYS. SMART TRACKING, GUARANTEED PAYOUTS.",
      points: ["PASSIVE INCOME", "EASY TECH SETUP", "FLEXIBLE WORKING HOURS"]
    },
    {
      title: "FOR BRANDS",
      icon: Zap,
      description: "REACH THOUSANDS OF POTENTIAL CUSTOMERS IN TRANSIT. REAL-TIME ANALYTICS AND PERFORMANCE TRACKING.",
      points: ["GEO-TARGETED ADS", "VERIFIED IMPRESSIONS", "SMART SCHEDULING"]
    },
    {
       title: "FLEET TRACKING",
       icon: Map,
       description: "MANAGE YOUR ENTIRE FLEET WITH OUR ADVANCED GPS MONITORING AND PERFORMANCE DASHBOARD.",
       points: ["REAL-TIME LOCATION", "DEVICE HEALTH MODS", "EARNING REPORTS"]
    }
  ];

  const handleNext = () => {
    if (step < slides.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const current = slides[step];

  if (current.isSplash) {
    return (
      <div 
        className="fixed inset-0 bg-black z-[150] flex flex-col items-center justify-center font-sans overflow-hidden cursor-pointer selection:none"
        onClick={handleNext}
      >
        {/* Background Atmosphere */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 blur-[120px] rounded-full animate-pulse" />
          
          {/* Editorial Massive Background Text */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.03, scale: 1 }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[35vw] font-black italic tracking-tighter select-none pointer-events-none"
          >
            MAYAAN
          </motion.div>
        </div>

        <div className="relative z-10 flex flex-col items-center">
          {/* INTRODUCING - Micro tag */}
          <motion.div
             initial={{ opacity: 0, y: -20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 1, delay: 0.2 }}
             className="text-amber-500 font-bold uppercase tracking-[0.4em] text-[10px] mb-8"
          >
            {current.title}
          </motion.div>
  
          {/* Logo Container - Premium Isolation */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-[80vw] max-w-[500px] aspect-video flex items-center justify-center p-8"
          >
            
            <img 
              src={`${import.meta.env.BASE_URL}mayaan_logo.jpeg`} 
              alt="Mayaan Logo" 
              className="w-full h-auto object-contain relative z-10 drop-shadow-[0_20px_60px_rgba(0,0,0,0.6)] scale-110" 
            />
          </motion.div>
  
          {/* MAYAAN ADS - High Impact Editorial */}
          <motion.div
             initial={{ opacity: 0, y: 30 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 1.2, delay: 0.6 }}
             className="text-center mt-12 px-6"
          >
            <h1 className="text-white text-5xl md:text-7xl font-black italic tracking-tighter uppercase leading-none mb-4">
              {current.subtitle}
            </h1>
            
            <p className="text-white/40 text-xs md:text-sm font-medium tracking-[0.2em] uppercase max-w-xs mx-auto">
              {current.tagline}
            </p>
          </motion.div>
        </div>

        {/* Pulse Interactive Hint */}
        <motion.div 
          animate={{ opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-16 text-white/40 text-[9px] uppercase tracking-[0.8em] font-bold"
        >
          Tap to start
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-[150] flex items-center justify-center p-6 md:p-12 font-sans selection:bg-amber-500/30 overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] bg-amber-500/5 blur-[150px] rounded-full" />
        <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] bg-amber-500/5 blur-[150px] rounded-full" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm aspect-[9/19] max-h-[85vh] bg-[#050505] rounded-[3.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,1)] overflow-hidden flex flex-col border border-white/5 relative z-10"
        >
          {/* Top Visual Section */}
          <div className="relative h-2/5 bg-gradient-to-b from-amber-500/10 to-transparent flex items-center justify-center overflow-hidden">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="relative z-10"
            >
              <current.icon size={80} strokeWidth={1} className="text-amber-500 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]" />
            </motion.div>
            
            {/* Geometric accents */}
            <div className="absolute inset-0 opacity-5">
               <div className="absolute -top-10 -right-10 w-40 h-40 border-2 border-amber-500 rounded-full" />
               <div className="absolute top-20 -left-10 w-32 h-32 border-2 border-amber-500 rounded-full" />
            </div>
          </div>

          {/* Bottom Content Section */}
          <div className="flex-1 p-8 flex flex-col text-center">
            <div className="mb-6">
              <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase leading-none">
                {current.title}
              </h1>
              <div className="h-1 w-8 bg-amber-500 mx-auto mt-3 rounded-full" />
            </div>
            
            <p className="text-xs font-medium text-slate-500 uppercase tracking-[0.15em] leading-relaxed mb-8 text-center px-4">
              {current.description}
            </p>

            <div className="space-y-3 flex-1 text-left px-4">
              {current.points.map((point, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + (idx * 0.1) }}
                  key={point} 
                  className="flex items-center gap-4 group"
                >
                  <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover:bg-amber-500/20 transition-all">
                    <Check size={10} className="text-amber-500 stroke-[4]" />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-white transition-colors">{point}</span>
                </motion.div>
              ))}
            </div>

            {/* Footer Navigation */}
            <div className="flex items-center justify-between mt-8 p-2">
              <button 
                onClick={onComplete}
                className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] hover:text-amber-500 transition-colors"
              >
                SKIP
              </button>

              <div className="flex gap-2.5">
                {slides.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1 rounded-full transition-all duration-500 ${
                      i === step ? "w-8 bg-amber-500" : "w-2 bg-white/10"
                    }`} 
                  />
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleNext}
                className="w-14 h-14 bg-amber-500 text-black rounded-3xl flex items-center justify-center shadow-[0_10px_30px_rgba(245,158,11,0.3)] hover:bg-white transition-all transform"
              >
                <ChevronRight size={20} className="stroke-[3]" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

