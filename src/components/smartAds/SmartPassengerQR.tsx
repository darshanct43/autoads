import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
import { Baby, Users, Shield, Sparkles, Heart } from 'lucide-react';

interface SmartPassengerQRProps {
  deviceId: string;
}

const ROTATIONS = [
  {
    id: 0,
    header: "👶 Kids in Ride?",
    sub: "Scan for Family Safe Mode",
    icon: "Baby"
  },
  {
    id: 1,
    header: "👨‍👩‍👧 Family Ride?",
    sub: "Customize Your Ride Experience",
    icon: "Users"
  },
  {
    id: 2,
    header: "Traveling with Kids?",
    sub: "Enable Safe Ride Mode",
    icon: "Shield"
  }
];

export default function SmartPassengerQR({ deviceId }: SmartPassengerQRProps) {
  const [index, setIndex] = useState(0);

  // Rotate headers every 5 seconds for visual focus without clutter
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % ROTATIONS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const current = ROTATIONS[index];

  // Dynamic passenger destination web app link
  const qrUrl = `${window.location.protocol}//${window.location.host}/#passenger?deviceId=${encodeURIComponent(deviceId || 'ACTIVE')}`;

  const renderIcon = (name: string) => {
    const props = { className: "w-8 h-8 text-amber-400 shrink-0 select-none animate-pulse", strokeWidth: 2.5 };
    switch (name) {
      case "Baby": return <Baby {...props} />;
      case "Users": return <Users {...props} />;
      case "Shield": return <Shield {...props} />;
      default: return <Sparkles {...props} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="absolute top-10 right-10 z-50 overflow-hidden w-[420px] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 border border-slate-800 rounded-[2.5rem] shadow-2xl shadow-indigo-950/40 p-5 select-none font-sans"
    >
      {/* Background elegant slow glowing sphere */}
      <div className="absolute -top-12 -left-12 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main card grid */}
      <div className="flex items-center gap-5">
        
        {/* LEFT: Large QR Code with glow, high-contrast frame, and vertical red/amber laser scanning line */}
        <div className="relative p-3 bg-slate-950/90 rounded-3xl border border-white/10 shadow-inner flex items-center justify-center shrink-0">
          
          {/* Pulsing glow ring around QR container */}
          <div className="absolute inset-0 rounded-3xl border border-amber-500/30 animate-ping opacity-25 pointer-events-none" />
          <div className="absolute -inset-[3px] rounded-[26px] bg-gradient-to-tr from-amber-500 to-indigo-500 opacity-60 z-0 blur-[3px] pointer-events-none" />
          
          {/* White QR background for maximum legibility and strict scanner performance */}
          <div className="relative z-10 w-[150px] h-[150px] bg-white p-2.5 rounded-2xl flex items-center justify-center overflow-hidden">
            <QRCodeSVG
              value={qrUrl}
              size={130}
              bgColor="#FFFFFF"
              fgColor="#020617" // Deep Indigo slate matching the background theme
              level="M"
              includeMargin={false}
            />

            {/* Slow elegant scanning laser bar effect */}
            <motion.div 
              animate={{ 
                top: ["2%", "96%", "2%"] 
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent z-20 pointer-events-none shadow-[0_0_8px_rgba(245,158,11,1)]"
            />
          </div>
        </div>

        {/* RIGHT: Short emotional copy with rotating transitions */}
        <div className="flex-1 flex flex-col justify-between h-[150px] py-1 text-left">
          
          <div className="space-y-4">
            {/* Soft decorative header chip */}
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 w-fit px-2.5 py-1 rounded-full">
              <Sparkles className="w-3 h-3 text-amber-500 animate-spin" style={{ animationDuration: '4s' }} />
              <span className="text-[8px] font-black tracking-widest text-slate-300 uppercase leading-none">Auto Smart Screen</span>
            </div>

            {/* Rotating contents container */}
            <div className="h-16 relative flex items-start gap-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-1.5 flex-1"
                >
                  <h3 className="text-xl font-black text-white tracking-tight antialiased leading-tight">
                    {current.header}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] font-bold text-amber-400 tracking-wide uppercase leading-none">
                    {current.sub}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Quick interactive note */}
          <div className="flex items-center gap-2 pl-0.5">
            {renderIcon(current.icon)}
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-relaxed">
              Scan QR to configure <br/>
              cabin filters instantly 🌟
            </p>
          </div>

        </div>
      </div>

      {/* BOTTOM: Elegant footer partition line */}
      <div className="mt-4 pt-3.5 border-t border-white/5 flex items-center justify-between text-[9px] font-black text-slate-500 uppercase tracking-wider">
        <div className="flex items-center gap-1">
          <Heart className="w-2.5 h-2.5 text-rose-500 fill-rose-500" />
          <span>SAFE ENVIRONMENT</span>
        </div>
        <span>•</span>
        <span>FAMILY FRIENDLY</span>
        <span>•</span>
        <span>SMART RIDE</span>
      </div>
    </motion.div>
  );
}
