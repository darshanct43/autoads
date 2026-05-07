import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink } from 'lucide-react';

export default function BrandPopup() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem('mayaan_brand_popup_seen');
    if (!hasSeen) {
      const timer = setTimeout(() => setShow(true), 2000); // Show after 2s of portal entry
      return () => clearTimeout(timer);
    }
  }, []);

  const close = () => {
    setShow(false);
    localStorage.setItem('mayaan_brand_popup_seen', 'true');
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-md bg-white rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden relative border border-slate-100"
          >
            <button 
              onClick={close}
              className="absolute top-6 right-6 p-2 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-full transition-colors z-20"
            >
              <X size={20} />
            </button>

            <div className="relative h-64 bg-slate-950 flex items-center justify-center overflow-hidden">
               <img 
                 src={`${import.meta.env.BASE_URL}mayaan_logo.jpeg`} 
                 alt="Mayaan Logo" 
                 className="w-80 h-auto object-contain relative z-10 drop-shadow-[0_10px_40px_rgba(255,255,255,0.1)] scale-110" 
               />
            </div>

            <div className="p-10 text-center">
              <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em] mb-3">Parent Brand</h3>
              <h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900 mb-4">
                MAYAAN <span className="text-slate-300">GROUP</span>
              </h2>
              <p className="text-xs font-medium text-slate-500 leading-relaxed max-w-xs mx-auto mb-8">
                Auto Ads is a proud subsidiary of Mayaan Group. Delivering cutting-edge advertising solutions across the ecosystem.
              </p>

              <button 
                onClick={close}
                className="w-full py-4 bg-slate-950 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-amber-500 hover:text-slate-950 transition-all active:scale-[0.98]"
              >
                PROCEED TO DASHBOARD
              </button>

              <div className="mt-6 flex items-center justify-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:text-slate-900 transition-colors">
                Visit Mayaan.in <ExternalLink size={12} />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
