import { motion } from 'motion/react';
import { useEffect } from 'react';

interface BootAnimationProps {
  onComplete: () => void;
}

export default function BootAnimation({ onComplete }: BootAnimationProps) {
  useEffect(() => {
    // 2-Stroke "Tuk-Tuk" Sound Synthesis
    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    // Don't return early here, as it skips the 3000ms timeout!

    let context: AudioContext | null = null;
    let interval: any = null;

    const startSound = () => {
      try {
        if (!AudioContextClass) return;
        if (!context) context = new AudioContextClass();
        if (context.state === 'suspended') context.resume();

        interval = setInterval(() => {
          if (!context) return;
          const osc = context.createOscillator();
          const gain = context.createGain();
          
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(40 + Math.random() * 8, context.currentTime);
          
          gain.gain.setValueAtTime(0.04, context.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.08);
          
          osc.connect(gain);
          gain.connect(context.destination);
          
          osc.start();
          osc.stop(context.currentTime + 0.08);
        }, 130);
      } catch (e) {
        console.error("Audio failed", e);
      }
    };

    // User interaction required for audio
    const handleInteraction = () => {
      startSound();
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    
    // Auto-attempt
    startSound();

    const timer = setTimeout(() => {
      onComplete();
    }, 3000); // Rickshaw drives off faster now for better UX

    return () => {
      clearTimeout(timer);
      if (interval) clearInterval(interval);
      if (context) context.close();
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, [onComplete]);

  return (
    <div 
      onClick={onComplete}
      className="fixed inset-0 bg-[#f8fafc] z-[200] flex flex-col items-center justify-center overflow-hidden cursor-pointer selection:bg-none"
    >
      {/* The Road */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-x-0 h-40 bg-slate-200/50 bottom-1/4 -skew-x-12 translate-y-20 flex flex-col justify-center overflow-hidden"
      >
        <div className="w-full border-t-4 border-dashed border-white/50" />
      </motion.div>

      {/* The Auto Rickshaw (Dynamic Rear View) */}
      <motion.div
        initial={{ y: 200, x: 0, scale: 2.2, rotate: 0, opacity: 0 }}
        animate={{ 
          y: [200, 0, -20, -30], 
          scale: [2.2, 1.4, 1.2, 1],
          rotate: [0, 0, 0, 90],
          x: [0, 0, 0, 1500],
          opacity: 1
        }}
        transition={{ 
          duration: 3,
          times: [0, 0.4, 0.7, 1],
          ease: "easeInOut"
        }}
        className="relative"
      >
        <div className="relative">
          {/* Professional Rear-View Auto Rickshaw SVG */}
          <svg width="200" height="200" viewBox="0 0 200 200" className="drop-shadow-2xl">
            <ellipse cx="100" cy="175" rx="60" ry="10" fill="black" opacity="0.1" />
            <rect x="35" y="155" width="25" height="30" rx="4" fill="#000" />
            <rect x="140" y="155" width="25" height="30" rx="4" fill="#000" />
            <path d="M30 160 Q100 175 170 160 L175 110 Q175 100 160 100 L40 100 Q25 100 25 110 L30 160Z" fill="#f59e0b" />
            <path d="M40 100 L160 100 Q165 40 100 40 Q35 40 40 100Z" fill="#1f2937" />
            <rect x="55" y="55" width="90" height="40" rx="15" fill="#0f172a" />
            <rect x="60" y="60" width="80" height="30" rx="10" fill="#000" />
            
            {/* Rear Screen with Introduction Text */}
            <rect x="65" y="110" width="70" height="25" rx="3" fill="#111827" stroke="#374151" strokeWidth="1" />
            <rect x="68" y="113" width="64" height="19" rx="1" fill="#000" />
            <foreignObject x="68" y="113" width="64" height="19">
              <div className="w-full h-full flex flex-col items-center justify-center overflow-hidden">
                <motion.div
                  animate={{ y: [0, -20, -40, -60] }}
                  transition={{ duration: 6, repeat: Infinity, times: [0, 0.33, 0.66, 1], ease: "linear" }}
                  className="flex flex-col items-center"
                >
                  <div className="h-[19px] flex items-center justify-center">
                    <span className="text-[4px] font-black text-amber-500 uppercase tracking-tight">Auto Play Ads</span>
                  </div>
                  <div className="h-[19px] flex items-center justify-center">
                    <span className="text-[4px] font-black text-amber-500 uppercase tracking-tight">Maximum Reach</span>
                  </div>
                  <div className="h-[19px] flex items-center justify-center">
                    <span className="text-[4px] font-black text-amber-500 uppercase tracking-tight">Secure System</span>
                  </div>
                  <div className="h-[19px] flex items-center justify-center">
                    <span className="text-[4px] font-black text-amber-500 uppercase tracking-tight">Auto Ads</span>
                  </div>
                </motion.div>
              </div>
            </foreignObject>

            <circle cx="45" cy="140" r="5" fill="#ef4444" />
            <circle cx="155" cy="140" r="5" fill="#ef4444" />
            <rect x="85" y="145" width="30" height="10" fill="#fff" rx="2" />
            <text x="100" y="152" fontSize="5" fontWeight="bold" textAnchor="middle" fill="#000">MAY AAA 001</text>
            <line x1="60" y1="165" x2="140" y2="165" stroke="#374151" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
        
        {/* Exhaust Smoke */}
        <motion.div
          animate={{ scale: [1, 2, 3], opacity: [0.6, 0.3, 0], x: [-5, -15, -25], y: [5, 10, 15] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="absolute bottom-6 left-1/4 w-6 h-4 bg-slate-400 rounded-full blur-md"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="absolute bottom-20 flex flex-col items-center gap-2"
      >
        <h1 className="text-4xl font-black text-slate-800 tracking-tighter uppercase italic">
          Auto <span className="text-amber-500">Ads</span>
        </h1>
        <div className="h-0.5 w-12 bg-amber-500" />
      </motion.div>
    </div>
  );
}
