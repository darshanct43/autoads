import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, Lock, Play, Wifi, WifiOff, AlertCircle, RefreshCw, Radio, Battery, Signal, Database, LogOut, Cpu, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { firebaseService, AdCampaign, Driver } from '../../services/firebaseService';
import { auth } from '../../lib/firebase';
import { cn } from '../../lib/utils';

interface DevicePortalProps {
  onLogout: () => void;
}

export default function DevicePortal({ onLogout }: DevicePortalProps) {
  const [isLogged, setIsLogged] = useState(false);
  const [driverCode, setDriverCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [playlist, setPlaylist] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [online, setOnline] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [startTime] = useState(Date.now());
  const [statusLogs, setStatusLogs] = useState<string[]>([
    "BOOT: Kernel initialized",
    "NET: Searching for broadcast node...",
    "SEC: Encryption layer active"
  ]);

  const [showGpsPrompt, setShowGpsPrompt] = useState(false);
  const [internalGpsId, setInternalGpsId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const sessionUptime = Math.floor((currentTime.getTime() - startTime) / 1000);
  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isLogged && driver && !driver.gpsId) {
      setShowGpsPrompt(true);
    }
  }, [isLogged, driver]);

  const handleUpdateGpsId = async () => {
    if (!driver || !internalGpsId) return;
    setLoading(true);
    try {
      await firebaseService.updateDriverProfile(driver.uid, { gpsId: internalGpsId });
      setDriver(prev => prev ? { ...prev, gpsId: internalGpsId } : null);
      setShowGpsPrompt(false);
      setStatusLogs(prev => ["GPS: ID LINKED - " + internalGpsId, ...prev]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (playlist.length === 0 && isLogged) {
      const logs = [
        "SYNC: Handshake in progress",
        "NET: Latency 24ms",
        "HUB: Cluster sync OK",
        "SEC: Tunnel verified",
        "CACHE: Verifying integrity",
        "BATT: Power management active",
        "SYS: Awaiting downstream push",
        "GPS: Scanning for satellites...",
        "ZON: Entering High-Yield Sector"
      ];
      const interval = setInterval(() => {
        setStatusLogs(prev => [logs[Math.floor(Math.random() * logs.length)], ...prev.slice(0, 5)]);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [playlist.length, isLogged]);

  // Real-time ad assignments
  useEffect(() => {
    if (!isLogged || !driver?.uid) return;

    setLoading(true);
    const unsubscribe = firebaseService.subscribeToDriverAssignments(driver.uid, async (assignments) => {
      // Filter for active assignments
      const active = assignments.filter(a => ['assigned', 'running', 'approved'].includes(a.status));
      
      const ads = await Promise.all(active.map(async (a) => {
        return await firebaseService.getCampaign(a.campaignId);
      }));
      
      setPlaylist(ads.filter(Boolean));
      setLoading(false);
      if (ads.length > 0) {
        setStatusLogs(prev => ["HUB: manifest received", "AD_SRV: Loading assets...", ...prev]);
      }
    });

    return () => unsubscribe();
  }, [isLogged, driver?.uid]);

  // Real-time location reporting
  useEffect(() => {
    if (!isLogged || !driver?.uid) return;

    // Simulate location movement around Bengaluru
    let lat = 12.9716;
    let lng = 77.5946;
    
    // Check if there's already a location to start from
    firebaseService.getDriverLocations().then(locs => {
       const existing = locs.find(l => l.uid === driver.uid);
       if (existing && existing.lat && existing.lng) {
          lat = existing.lat;
          lng = existing.lng;
       }
    });

    const locationInterval = setInterval(async () => {
      if (online) {
        // Only update if we have a valid baseline, no mock movement
        try {
          const hasAds = playlist.length > 0;
          // Update local tallies (simulating storage)
          const currentTally = JSON.parse(localStorage.getItem(`metrics_${driver.uid}`) || '{"actualRuntime":0,"idleTime":0,"adRuntime":0}');
          currentTally.actualRuntime += 10/60; // 10 seconds in minutes
          if (hasAds) {
            currentTally.adRuntime += 10/60;
          } else {
            currentTally.idleTime += 10/60;
          }
          localStorage.setItem(`metrics_${driver.uid}`, JSON.stringify(currentTally));

          // Use the correct signatures from firebaseService
          await firebaseService.updateDriverLocation(driver.uid, { 
            lat, 
            lng,
            gpsId: driver.gpsId || null,
            actualRuntime: Math.floor(currentTally.actualRuntime),
            idleTime: Math.floor(currentTally.idleTime),
            adRuntime: Math.floor(currentTally.adRuntime),
            paymentDue: Math.floor(currentTally.adRuntime * 2.5) // Example payout rate ₹2.5 per min
          });
          await firebaseService.logLocation({ 
            driverId: driver.uid, 
            lat: lat, 
            lng: lng, 
            speed: 0,
            campaignId: playlist[currentIndex]?.id || 'idle'
          });
        } catch (e) {
          console.error("Location sync failed:", e);
        }
      }
    }, 10000); // Update every 10 seconds

    return () => clearInterval(locationInterval);
  }, [isLogged, driver?.uid, online]);

  // Check shared preferences simulation (localStorage)
  useEffect(() => {
    const savedUid = localStorage.getItem('auto_ads_device_uid');
    if (savedUid) {
      resumeSession(savedUid);
    }

    const handleConnection = () => setOnline(navigator.onLine);
    window.addEventListener('online', handleConnection);
    window.addEventListener('offline', handleConnection);
    return () => {
      window.removeEventListener('online', handleConnection);
      window.removeEventListener('offline', handleConnection);
    };
  }, []);

  const resumeSession = async (uid: string) => {
    try {
      const d = await firebaseService.getDriverProfile(uid);
      if (d) {
        setDriver(d);
        setIsLogged(true);
      }
    } catch (e) {
      localStorage.removeItem('auto_ads_device_uid');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const drivers = await firebaseService.getDrivers();
      let found = drivers.find(d => 
        d.driverCode?.toUpperCase() === driverCode.toUpperCase() && 
        d.password === password
      );

      if (found) {
        const systemDeviceId = "WEB-SIMULATOR-" + window.navigator.userAgent.slice(-10);
        
        // Ensure UID is present
        const uid = found.uid || (found as any).id;
        if (!uid) throw new Error("Missing Driver UID");

        if (found.deviceId && found.deviceId !== systemDeviceId) {
          setError("DEVICE MISMATCH: Account locked to another terminal.");
        } else {
          await firebaseService.updateDriverProfile(uid, { deviceId: systemDeviceId });
          localStorage.setItem('auto_ads_device_uid', uid);
          setDriver({ ...found, uid });
          setIsLogged(true);
        }
      } else {
        setError("Invalid Driver Code or Password.");
      }
    } catch (err: any) {
      setError(err.message || "System connection failure.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAdsManual = async () => {
    if (!driver?.uid) return;
    setLoading(true);
    try {
      const assignments = await firebaseService.getDriverAssignments(driver.uid);
      const active = assignments.filter(a => ['assigned', 'running', 'approved'].includes(a.status));
      const ads = await Promise.all(active.map(async (a) => await firebaseService.getCampaign(a.campaignId)));
      setPlaylist(ads.filter(Boolean));
    } finally {
      setLoading(false);
    }
  };

  // Rotation Logic
  useEffect(() => {
    if (isLogged && playlist.length > 0) {
      const currentAd = playlist[currentIndex];
      const isVideo = currentAd?.assetUrl?.match(/\.(mp4|webm|ogg)$/i) || currentAd?.type === 'VIDEO';
      
      if (!isVideo) {
        const interval = setInterval(() => {
          setCurrentIndex(prev => (prev + 1) % playlist.length);
        }, 12000); // 12s per static ad
        return () => clearInterval(interval);
      }
    }
  }, [isLogged, playlist, currentIndex]);

  if (!isLogged) {
    return (
      <div className="fixed inset-0 bg-[#020617] flex items-center justify-center p-6 font-sans">
        {/* Animated Background Gradients */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/5 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
        </div>

        <div className="w-full max-w-sm relative z-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center mb-12"
          >
            <div className="relative inline-block mb-6">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border border-amber-500/10 rounded-[2.5rem] scale-[1.1]"
              />
            </div>
            <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">Terminal <span className="text-amber-500">Core</span></h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mt-3">Auto Ads Display Node</p>
          </motion.div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1 group">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-amber-500">Node Identifier</label>
              <div className="relative">
                 <input 
                  value={driverCode}
                  onChange={(e) => setDriverCode(e.target.value.toUpperCase())}
                  placeholder="DRV-CORE-0000" 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5 text-white font-mono text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:bg-white/10 transition-all font-bold placeholder:text-slate-700"
                  required
                />
                <Database className="absolute right-5 top-5 text-slate-600" size={18} />
              </div>
            </div>
            <div className="space-y-1 group">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-amber-500">Auth Signature</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5 pr-12 text-white font-mono text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:bg-white/10 transition-all font-bold placeholder:text-slate-700"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-5 text-slate-600 hover:text-amber-500 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-500">
                <AlertCircle size={16} />
                <span className="text-[10px] font-black uppercase tracking-wider">{error}</span>
              </motion.div>
            )}

            <button 
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 h-14 md:h-16 rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 group overflow-hidden relative active:scale-95"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 slant" />
              {loading ? <RefreshCw className="animate-spin" size={18} /> : <>INITIALIZE HUB <Play size={14} fill="currentColor" /></>}
            </button>
          </form>

          <p className="text-center text-[9px] text-slate-700 font-bold uppercase tracking-widest mt-10 leading-relaxed max-w-[80%] mx-auto">
            Authorized node communication encrypted via SHA-256. Terminal binding permanent upon initialization.
          </p>
        </div>
      </div>
    );
  }

  const currentAd = playlist[currentIndex];

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden font-sans select-none">
      {/* SCANLINE / NOISE OVERLAY */}
      <div className="absolute inset-0 pointer-events-none z-[100] opacity-[0.03] scanline" />
      <div className="absolute inset-0 pointer-events-none z-[101] opacity-[0.02] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      {/* GLOBAL HUD LAYER */}
      <div className="absolute inset-0 z-[60] pointer-events-none p-4 md:p-10 flex flex-col justify-between">
        {/* Top Header */}
        <div className="flex justify-between items-start">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 md:gap-4 bg-black/40 backdrop-blur-md p-2 md:p-3 rounded-2xl border border-white/5"
          >
            <div className="w-10 h-10 md:w-14 md:h-14 bg-white/5 backdrop-blur-xl rounded-xl md:rounded-2xl flex items-center justify-center border border-white/10 group pointer-events-auto cursor-pointer relative overflow-hidden" onClick={fetchAdsManual}>
              {driver?.profileImage ? (
                <img src={driver.profileImage} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Profile" />
              ) : (
                <div className="text-white text-sm md:text-lg font-black italic">A<span className="text-amber-500">A</span></div>
              )}
              <div className={cn("w-1.5 h-1.5 md:w-2 md:h-2 rounded-full absolute top-1.5 right-1.5 md:top-2 md:right-2 z-20 shadow-lg", online ? "bg-green-500 animate-pulse shadow-green-500/50" : "bg-red-500 shadow-red-500/50")} />
              {loading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                   <RefreshCw className="text-amber-500 animate-spin" size={16} />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5 md:mb-1">
                <p className="text-[9px] md:text-[11px] font-black text-white uppercase tracking-[0.1em] md:tracking-[0.2em] leading-none">
                  {driver?.name?.split(' ')[0] || 'Authorized'}
                </p>
                <div className="px-1 py-0.5 bg-green-500/10 border border-green-500/20 rounded text-[6px] md:text-[7px] font-black text-green-500 uppercase tracking-tighter">
                  VERIFIED
                </div>
              </div>
              <p className="text-[7px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                ID: <span className="text-amber-500/80">{driver?.driverCode || 'UNIDENTIFIED'}</span> 
              </p>
            </div>
          </motion.div>

          <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             className="flex items-center gap-2 md:gap-4 pointer-events-auto"
          >
            <button 
              onClick={() => onLogout()}
              className="px-3 md:px-5 py-2 md:py-2.5 bg-slate-500/10 hover:bg-red-500/20 border border-white/5 text-slate-400 hover:text-red-500 rounded-xl flex items-center gap-2 transition-all active:scale-95 group shadow-lg"
              title="Sign Out"
            >
               <LogOut size={12} className="group-hover:rotate-12 transition-transform md:w-[14px]" />
               <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest hidden md:inline">Sign Out</span>
            </button>
            <div className="flex gap-2">
               <button 
                 onClick={() => {
                   fetchAdsManual();
                   setStatusLogs(prev => ["CMD: Force check requested", ...prev.slice(0, 5)]);
                 }}
                 className="w-9 h-9 md:w-11 md:h-11 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all group shadow-lg"
               >
                 <RefreshCw size={14} className={cn(loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500')} />
               </button>
            </div>
          </motion.div>
        </div>

        {/* Bottom Footer Info */}
        <div className="flex justify-between items-end flex-row-reverse pb-2 md:pb-0">
           <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-3 md:px-5 py-1.5 md:py-2.5 rounded-xl border border-white/5">
              <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <p className="text-[6px] md:text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] md:tracking-[0.3em] font-mono">NODE_ACTIVE // SESSION_SECURE</p>
           </div>
        </div>
      </div>

      {/* CONTENT LAYER */}
      <div className="absolute inset-0 bg-[#050505]">
        <AnimatePresence mode="wait">
          {playlist.length === 0 ? (
            <motion.div 
              key="standby" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="w-full h-full flex items-center justify-center relative overflow-hidden"
            >
               {/* Standby Dashboard - Map Simulation */}
               <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
                  
                  {/* Animated Map Circles */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] border border-white/5 rounded-full" />
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
                    transition={{ duration: 10, repeat: Infinity }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] border border-white/5 rounded-full" 
                  />
                  
                  {/* Random Map Markers (Simulated) */}
                  {[...Array(12)].map((_, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ 
                        opacity: [0, 0.5, 0],
                        scale: [0.5, 1, 0.5],
                        x: Math.sin(i) * 300,
                        y: Math.cos(i) * 300
                      }}
                      transition={{ 
                        duration: 5 + Math.random() * 5, 
                        repeat: Infinity,
                        delay: i * 0.5
                      }}
                      className="absolute top-1/2 left-1/2 w-2 h-2 bg-amber-500 rounded-full blur-[1px]"
                    />
                  ))}
               </div>

               <div className="w-full max-w-5xl px-4 md:px-10 flex flex-col md:grid md:grid-cols-12 gap-6 md:gap-12 items-center relative z-10 py-20 md:py-0 h-full md:h-auto overflow-y-auto md:overflow-visible no-scrollbar">
                  {/* Left Column: Stats & Status */}
                  <div className="w-full md:col-span-4 space-y-4 md:space-y-6 order-2 md:order-1 px-2 md:px-0">
                     <div className="space-y-2">
                        <p className="text-[8px] md:text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] font-mono">&gt; NODE_STATUS</p>
                        <div className="p-4 md:p-5 bg-white/5 border border-white/5 rounded-2xl md:rounded-3xl backdrop-blur-xl shadow-2xl">
                           <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
                              <div className="w-12 h-8 md:w-16 md:h-10 rounded-lg md:xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 p-1.5 md:p-2">
                              </div>
                              <div>
                                 <p className="text-[10px] md:text-xs font-black text-white uppercase tracking-tight">Active Standby</p>
                                 <p className="text-[7px] md:text-[9px] font-bold text-slate-500 uppercase">Awaiting Assignment</p>
                              </div>
                           </div>
                           <div className="space-y-2.5 md:space-y-3">
                              <div className="flex justify-between items-center text-[7px] md:text-[9px] font-bold uppercase tracking-widest">
                                 <span className="text-slate-500">Sync Status</span>
                                 <span className="text-green-500">OPTIMAL</span>
                              </div>
                              <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                                 <motion.div 
                                    animate={{ x: ["-100%", "100%"] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    className="w-1/2 h-full bg-amber-500"
                                 />
                              </div>
                              <div className="flex justify-between items-center text-[7px] md:text-[9px] font-bold uppercase tracking-widest">
                                 <span className="text-slate-500">Buffer Health</span>
                                 <span className="text-amber-500 text-[6px] md:text-[8px]">OPTIMAL</span>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="space-y-2">
                        <p className="text-[8px] md:text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] font-mono">&gt; SESSION_METRICS</p>
                        <div className="grid grid-cols-2 gap-3">
                           <div className="p-3 md:p-4 bg-white/5 border border-white/5 rounded-xl md:rounded-2xl backdrop-blur-md">
                              <p className="text-[7px] md:text-[8px] font-black text-slate-500 uppercase mb-1">Status</p>
                              <p className="text-xs md:text-sm font-black text-green-500 uppercase">Standby</p>
                           </div>
                           <div className="p-3 md:p-4 bg-white/5 border border-white/5 rounded-xl md:rounded-2xl backdrop-blur-md">
                              <p className="text-[7px] md:text-[8px] font-black text-slate-500 uppercase mb-1">Relay</p>
                              <p className="text-xs md:text-sm font-black text-white">READY</p>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Center Column: Pulse & Big Instruction */}
                  <div className="w-full md:col-span-4 flex flex-col items-center order-1 md:order-2 py-4 md:py-0">
                    <div className="relative group cursor-pointer active:scale-95 transition-transform" onClick={fetchAdsManual}>
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                        className="w-48 h-48 md:w-80 md:h-80 border border-dashed border-amber-500/20 rounded-full flex items-center justify-center"
                      />
                      <motion.div 
                        animate={{ rotate: -360 }}
                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-2 md:inset-4 border border-blue-500/10 rounded-full"
                      />
                      
                      <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 md:space-y-4">
                        <div className="relative">
                          <Radio className="text-amber-500 animate-pulse w-8 h-8 md:w-14 md:h-14" />
                          <div className="absolute inset-0 bg-amber-500/20 blur-xl md:blur-2xl rounded-full animate-ping" />
                        </div>
                        <div className="text-center px-4">
                           <p className="text-[8px] md:text-[10px] font-black text-white uppercase tracking-[0.2em] md:tracking-[0.4em] mb-1 md:mb-2 leading-none">Scanning Network</p>
                           <p className="text-[6px] md:text-[8px] font-black text-slate-500 uppercase tracking-[0.1em] md:tracking-[0.2em] max-w-[100px] md:max-w-[140px] mx-auto leading-relaxed">
                             {loading ? 'Initializing...' : 'Ready for assignment'}
                           </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Log & System */}
                  <div className="w-full md:col-span-4 space-y-4 md:space-y-6 flex flex-col items-end order-3">
                     <div className="w-full space-y-2">
                        <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] font-mono text-center md:text-right">SYSLOG_V2.0 &lt;</p>
                        <div className="p-4 md:p-5 bg-black/40 border border-white/5 rounded-2xl md:rounded-3xl backdrop-blur-xl h-32 md:h-40 overflow-hidden relative">
                           <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none z-10" />
                           <div className="space-y-1.5 md:space-y-2 font-mono relative z-0">
                              {statusLogs.map((log, i) => (
                                <motion.div 
                                  key={log + i}
                                  initial={{ opacity: 0, x: 10 }}
                                  animate={{ opacity: 1 - (i * 0.15), x: 0 }}
                                  className="text-[7px] md:text-[8px] font-bold text-slate-400 uppercase tracking-tight flex items-start gap-2"
                                >
                                  <span className="text-amber-500/50 shrink-0">&gt;</span>
                                  <span className="truncate">{log}</span>
                                </motion.div>
                              ))}
                           </div>
                        </div>
                     </div>

                     <div className="w-full grid grid-cols-2 gap-3 pb-8 md:pb-0">
                        <div className="p-3 md:p-4 bg-white/5 border border-white/5 rounded-xl md:rounded-2xl flex flex-col items-center">
                           <Signal className="text-slate-600 mb-1.5 md:mb-2 w-3 h-3 md:w-4 md:h-4" />
                           <p className="text-[6px] md:text-[7px] font-black text-slate-500 uppercase tracking-widest mb-0.5 md:mb-1">Link</p>
                           <p className="text-[10px] md:text-xs font-black text-white">ADAPTIVE</p>
                        </div>
                        <div className="p-3 md:p-4 bg-white/5 border border-white/5 rounded-xl md:rounded-2xl flex flex-col items-center">
                           <Cpu className="text-slate-600 mb-1.5 md:mb-2 w-3 h-3 md:w-4 md:h-4" />
                           <p className="text-[6px] md:text-[7px] font-black text-slate-500 uppercase tracking-widest mb-0.5 md:mb-1">Process</p>
                           <p className="text-[10px] md:text-xs font-black text-white">SYNC</p>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Bottom Decoration Lines */}
               <div className="absolute bottom-32 md:bottom-40 left-0 w-full flex items-center gap-4 px-6 md:px-10 opacity-20 pointer-events-none">
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white to-transparent" />
                  <div className="text-[6px] md:text-[8px] font-black text-white italic tracking-[0.3em] md:tracking-[1em] uppercase whitespace-nowrap">Peripheral Bridge Active</div>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white to-transparent" />
               </div>
            </motion.div>
          ) : (
            <motion.div 
              key={currentAd?.id || currentIndex}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="w-full h-full relative"
            >
              {/* Scanline Effect */}
              <div className="absolute inset-0 scanline z-20 pointer-events-none opacity-[0.03]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20 z-10 pointer-events-none" />

              {currentAd?.assetUrl?.match(/\.(mp4|webm|ogg)$/i) || currentAd?.type === 'VIDEO' ? (
                <video 
                  ref={videoRef}
                  autoPlay 
                  muted 
                  playsInline
                  className="w-full h-full object-cover"
                  src={currentAd?.assetUrl || null}
                  onEnded={() => setCurrentIndex(prev => (prev + 1) % playlist.length)}
                />
              ) : (
                <img 
                  src={currentAd?.assetUrl || null} 
                  alt="Ad" 
                  className="w-full h-full object-cover" 
                />
              )}
              
              {/* Ad Progress Bar */}
              <div className="absolute bottom-0 left-0 w-full h-2 z-50 bg-black/20">
                <motion.div 
                  key={currentIndex}
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 10, ease: "linear" }}
                  className="h-full bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.6)]"
                />
              </div>

              {/* Campaign Meta Overlay */}
              <div className="absolute bottom-16 left-12 z-50 space-y-2 max-w-[60%]">
                 <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="inline-block px-3 py-1 bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-widest rounded-md skew-x-[-12deg]"
                 >
                   LIVE SPONSORSHIP
                 </motion.div>
                 <motion.h2 
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="text-white text-7xl font-black italic uppercase tracking-tighter mix-blend-difference leading-none drop-shadow-2xl"
                 >
                   {currentAd.title}
                 </motion.h2>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showGpsPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[2.5rem] p-10 w-full max-w-sm text-center space-y-6 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.5)]"
            >
              <div className="w-20 h-20 bg-amber-500/10 rounded-[2.5rem] flex items-center justify-center text-amber-500 mx-auto">
                <Radio size={40} className="animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-950">
                  GPS Calibration
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed px-4">
                  Satellite lock established. Please provide hardware GPS ID as
                  instructed by command center.
                </p>
              </div>
              <div className="space-y-4 pt-4">
                <input
                  type="text"
                  value={internalGpsId}
                  onChange={(e) => setInternalGpsId(e.target.value)}
                  placeholder="ENTER GPS ID"
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl text-center text-sm font-black uppercase tracking-[0.3em] focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all outline-none"
                />
                <button
                  onClick={handleUpdateGpsId}
                  disabled={loading || !internalGpsId}
                  className="w-full py-5 bg-slate-950 text-amber-500 rounded-3xl font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? "CALIBRATING..." : "SYNC WITH CLOUD"}
                </button>
                <button
                  onClick={() => setShowGpsPrompt(false)}
                  className="text-[9px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors tracking-widest"
                >
                  Skip for now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .slant {
          clip-path: polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%);
        }
        .scanline {
          width: 100%;
          height: 100%;
          background: linear-gradient(to bottom, transparent 50%, rgba(255,255,255,0.05) 51%, transparent 51%);
          background-size: 100% 4px;
        }
      `}</style>
    </div>
  );
}
