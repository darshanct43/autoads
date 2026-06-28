import * as React from 'react';
import { useTerminalData } from '../../hooks/useTerminalData';
import { filterAds, isSchoolTiming } from '../smartAds/SmartAdEngine';
import SmartPassengerQR from '../smartAds/SmartPassengerQR';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Zap } from 'lucide-react';

interface TerminalAppProps {
  onLogout: () => void;
}

export default function TerminalApp({ onLogout }: TerminalAppProps) {
  const terminalId = React.useMemo(() => localStorage.getItem('auto_ads_terminal_id') || 'DEMO-TERMINAL', []);
  const { data, loading } = useTerminalData(terminalId);
  const [currentAdIndex, setCurrentAdIndex] = React.useState(0);
  const [isBooting, setIsBooting] = React.useState(true);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  // Filtered Ads based on live preferences
  const filteredAds = data ? filterAds(
    data.campaigns,
    data.currentMode,
    isSchoolTiming(),
    data.passengerPreference
  ) : [];

  // Fallback Ads if nothing from Firebase
  const fallbackAds = [
    { id: 'f1', title: 'TODAY MY DAY BUDDY', mediaUrl: 'https://d1kv1t85g7l7mp.cloudfront.net/campaigns/showcase/video/couples_showcase.mp4', mediaType: 'VIDEO' },
    { id: 'f2', title: 'FAMILY SAFE RIDE', mediaUrl: 'https://d1kv1t85g7l7mp.cloudfront.net/campaigns/showcase/video/food_showcase.mp4', mediaType: 'VIDEO' },
    { id: 'f3', title: 'SMART AD NETWORK', mediaUrl: 'https://d1kv1t85g7l7mp.cloudfront.net/campaigns/showcase/video/awareness_showcase.mp4', mediaType: 'VIDEO' }
  ];

  const adsToPlay = (filteredAds && filteredAds.length > 0) ? filteredAds : fallbackAds;

  React.useEffect(() => {
    setIsBooting(true);
    const timer = setTimeout(() => setIsBooting(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleEnded = () => {
    if (adsToPlay.length === 0) return;
    setCurrentAdIndex((prev) => (prev + 1) % adsToPlay.length);
  };

  if (isBooting) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[9999]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="w-20 h-20 bg-amber-500 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-amber-500/20">
            <Zap size={40} className="text-black" />
          </div>
          <div className="flex flex-col items-center">
            <h1 className="text-2xl font-black text-white italic tracking-tight">AutoAds Terminal</h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-2">Initializing Secure Display</p>
          </div>
        </motion.div>
      </div>
    );
  }

  const currentAd = adsToPlay[currentAdIndex];

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none cursor-none font-sans">
      {/* Main Playback Channel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentAd.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0"
        >
          {currentAd.mediaType === 'VIDEO' ? (
            <video
              ref={videoRef}
              src={currentAd.mediaUrl}
              autoPlay
              muted
              onEnded={handleEnded}
              className="w-full h-full object-cover"
              onError={handleEnded}
            />
          ) : (
            <img 
              src={currentAd.mediaUrl} 
              className="w-full h-full object-cover" 
              alt="Campaign"
              onLoad={() => setTimeout(handleEnded, 10000)}
              onError={handleEnded}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Corporate Branding Overlay */}
      <div className="absolute top-8 left-8 z-[100] flex items-center gap-4">
        <div className="bg-white text-black px-4 py-1.5 rounded-xl font-black text-xs tracking-wider shadow-2xl">
          MAYAAN
        </div>
        <div className="h-6 w-[1.5px] bg-white/20" />
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest opacity-80 decoration-indigo-500">
            LIVE SPONSORSHIP STREAM
          </span>
        </div>
      </div>

      {/* Terminal Metadata Overlay */}
      <div className="absolute bottom-10 left-10 z-[100] max-w-xl">
        <motion.div
          key={currentAd.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-black/40 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl"
        >
          <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] block mb-3">
             ACTIVE CAMPAIGN
          </span>
          <h2 className="text-4xl font-black text-white tracking-tighter leading-none mb-4 uppercase italic">
            {currentAd.title}
          </h2>
          <div className="flex items-center gap-6 mt-6 pt-6 border-t border-white/5">
             <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Operator Node</span>
                <span className="text-[10px] font-bold text-white uppercase mt-1">{data?.driverId || '---'}</span>
             </div>
             <div className="h-4 w-[1px] bg-white/10" />
             <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Terminal Unit</span>
                <span className="text-[10px] font-bold text-white uppercase mt-1">{terminalId}</span>
             </div>
             <div className="h-4 w-[1px] bg-white/10" />
             <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                    <Activity size={12} className="text-emerald-500" />
                </div>
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">System Online</p>
             </div>
          </div>
        </motion.div>
      </div>

      {/* Passenger QR Interaction Hub */}
      <SmartPassengerQR deviceId={terminalId} onLogout={onLogout} />

      {/* Ambient Visual Accents */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/5 blur-[150px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[150px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />
    </div>
  );
}
