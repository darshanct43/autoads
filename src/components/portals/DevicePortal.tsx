import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, Lock, Play, Wifi, WifiOff, AlertCircle, RefreshCw, Radio, Battery, Signal, Database, LogOut, Cpu, Eye, EyeOff, Maximize } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { firebaseService, AdCampaign, Driver } from '../../services/firebaseService';
import { auth } from '../../lib/firebase';
import { cn } from '../../lib/utils';

interface DevicePortalProps {
  onLogout: () => void;
}

export default function DevicePortal({ onLogout }: DevicePortalProps) {
  const [isLogged, setIsLogged] = useState(false);
  const [terminalId, setTerminalId] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [activeTerminal, setActiveTerminal] = useState<any>(null);
  const [playlist, setPlaylist] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [online, setOnline] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [systemMetrics, setSystemMetrics] = useState({
    cpu: 18,
    ram: 42,
    storage: 0.8, // GB used
    battery: 88
  });
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
  const [showComplianceNotice, setShowComplianceNotice] = useState(false);
  const sessionUptime = Math.floor((currentTime.getTime() - startTime) / 1000);
  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };
  const videoRef = useRef<HTMLVideoElement>(null);
  const posRef = useRef({ lat: 12.9716, lng: 77.5946 });

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

  // Remote Commands & Heartbeat
  useEffect(() => {
    if (!isLogged || !activeTerminal?.id) return;

    // 1. Listen for Remote Commands (REBOOT, DISABLE, etc)
    const unsubscribeCommand = firebaseService.subscribeToTerminalCommands(activeTerminal.id, (terminal) => {
      if (terminal?.status === 'DISABLED') {
         setStatusLogs(prev => ["CMD: REMOTE DISABLE RECEIVED", "SYS: HALTING PROCESSES", ...prev]);
         setTimeout(() => onLogout(), 3000);
      }
      if (terminal?.remoteCommand === 'REBOOT') {
         setStatusLogs(prev => ["CMD: REMOTE REBOOT RECEIVED", "SYS: WARM RESTARTING...", ...prev]);
         setTimeout(() => window.location.reload(), 2000);
      }
      if (terminal?.remoteCommand === 'CLEAR_CACHE') {
         setStatusLogs(prev => ["CMD: CLEAR_CACHE RECEIVED", "SYS: PURGING ASSETS", ...prev]);
         setPlaylist([]);
         setStatusLogs(prev => ["SYS: CACHE PURGED", ...prev]);
      }
    });

    // 2. Periodic Heartbeat System
    const interval = setInterval(async () => {
       if (online) {
          const metrics = {
             online: true,
             lastHeartbeat: new Date().toISOString(),
             battery: Math.floor(Math.random() * 5 + 85),
             ramUsage: Math.floor(Math.random() * 10 + 40) + '%',
             cpuTemp: Math.floor(Math.random() * 5 + 42) + '°C',
             signal: 'STRONG',
             storageAvailable: '12.4 GB'
          };
          setSystemMetrics(prev => ({
            ...prev,
            battery: metrics.battery,
            ram: parseInt(metrics.ramUsage)
          }));
          await firebaseService.syncTerminalPulse(activeTerminal.id, metrics);
       }
    }, 30000);

    return () => {
       unsubscribeCommand();
       clearInterval(interval);
    };
  }, [isLogged, activeTerminal?.id, online]);

  // Asset Download Simulation (Offline Caching)
  useEffect(() => {
    if (playlist.length > 0 && !downloading) {
       setDownloading(true);
       setDownloadProgress(0);
       setStatusLogs(prev => ["IO: ASSET CACHE START", ...prev]);
       
       const progressInterval = setInterval(() => {
          setDownloadProgress(prev => {
             if (prev >= 100) {
                clearInterval(progressInterval);
                setDownloading(false);
                setStatusLogs(prevLogs => ["IO: ASSET CACHE SYNC COMPLETE", ...prevLogs]);
                return 100;
             }
             return prev + 5;
          });
       }, 500);
       return () => clearInterval(progressInterval);
    }
  }, [playlist.length]);

  // Real-time location reporting - Optimized to 12s
  useEffect(() => {
    if (!isLogged || !driver?.uid || !activeTerminal?.id) return;

    let locationInterval: NodeJS.Timeout | null = null;

    const reportLocation = async () => {
      if (!("geolocation" in navigator)) return;
      
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude, speed } = position.coords;
        posRef.current = { lat: latitude, lng: longitude };

        try {
          const hasAds = playlist.length > 0;
          const currentTally = JSON.parse(localStorage.getItem(`metrics_${driver.uid}`) || '{"actualRuntime":0,"idleTime":0,"adRuntime":0}');
          
          const now = Date.now();
          const lastUpdate = (localStorage.getItem(`last_loc_update_${driver.uid}`) || now);
          const diffMs = now - Number(lastUpdate);

          // Only update if at least 5 seconds passed since last one
          if (diffMs < 5000) return;

          const diffMins = diffMs / 60000;
          localStorage.setItem(`last_loc_update_${driver.uid}`, now.toString());

          currentTally.actualRuntime += diffMins;
          if (hasAds) {
            currentTally.adRuntime += diffMins;
          } else {
            currentTally.idleTime += diffMins;
          }
          localStorage.setItem(`metrics_${driver.uid}`, JSON.stringify(currentTally));

          // Sync to Cloud
          await firebaseService.updateDriverLocation(driver.uid, { 
            lat: latitude, 
            lng: longitude,
            gpsId: driver.gpsId || null,
            actualRuntime: Math.floor(currentTally.actualRuntime),
            idleTime: Math.floor(currentTally.idleTime),
            adRuntime: Math.floor(currentTally.adRuntime),
            paymentDue: Math.floor(currentTally.adRuntime * 2.5),
            speed: speed ? Math.floor(speed * 3.6) : 0,
            isOnline: true,
            lastSeen: new Date().toISOString()
          });

          await firebaseService.syncTerminalPulse(activeTerminal.id, {
            online: true,
            currentAd: playlist[currentIndex]?.title || 'IDLE',
            currentAdImage: playlist[currentIndex]?.imageUrl || null,
            lat: latitude,
            lng: longitude,
            battery: Math.floor(80 + Math.random() * 20),
            signal: 'STRONG'
          });

          await firebaseService.logLocation({ 
            driverId: driver.uid, 
            lat: latitude, 
            lng: longitude, 
            speed: speed ? Math.floor(speed * 3.6) : 0,
            campaignId: playlist[currentIndex]?.id || 'idle'
          });
          
          setStatusLogs(prev => [`GPS: FIX - ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, ...prev.slice(0, 5)]);
        } catch (e) {
          console.error("Location sync failed:", e);
        }
      }, (err) => {
        console.error("GPS Error:", err);
        setStatusLogs(prev => [`GPS: ERROR ${err.code} - ${err.message}`, ...prev.slice(0, 5)]);
      }, { enableHighAccuracy: true });
    };

    reportLocation();
    locationInterval = setInterval(reportLocation, 12000);

    return () => {
      if (locationInterval) clearInterval(locationInterval);
    };
  }, [isLogged, driver?.uid, online, activeTerminal?.id, playlist, currentIndex]);

  // Check shared preferences simulation (localStorage)
  useEffect(() => {
    const savedTerminalId = localStorage.getItem('auto_ads_terminal_id');
    if (savedTerminalId) {
      resumeTerminalSession(savedTerminalId);
    }

    const handleConnection = () => setOnline(navigator.onLine);
    window.addEventListener('online', handleConnection);
    window.addEventListener('offline', handleConnection);
    return () => {
      window.removeEventListener('online', handleConnection);
      window.removeEventListener('offline', handleConnection);
    };
  }, []);

  const resumeTerminalSession = async (tid: string) => {
    try {
      setLoading(true);
      const terminals: any[] = await firebaseService.getTerminals();
      const term = terminals.find(t => t.id === tid);
      if (term && term.status === 'ACTIVE') {
        setActiveTerminal(term);
        const d = await firebaseService.getDriverProfile(term.driverId);
        if (d) {
          setDriver(d);
          setIsLogged(true);
          setShowComplianceNotice(true);
        }
      } else {
        localStorage.removeItem('auto_ads_terminal_id');
      }
    } catch (e) {
      localStorage.removeItem('auto_ads_terminal_id');
    } finally {
      setLoading(false);
    }
  };

  // Auto-Reboot simulation for 2GB RAM devices
  useEffect(() => {
    const memoryChecker = setInterval(() => {
       if (systemMetrics.ram > 90) {
          setStatusLogs(prev => ["SYS: CRITICAL MEMORY SATURATION", "SYS: INITIATING AUTO-RECOVERY REBOOT", ...prev]);
          setTimeout(() => window.location.reload(), 3000);
       }
    }, 60000);
    return () => clearInterval(memoryChecker);
  }, [systemMetrics.ram]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driver?.uid) {
       setError("No Driver Session Found. Login to App first.");
       return;
    }
    setLoading(true);
    setError('');

    try {
      const systemDeviceId = "NODE-" + Math.random().toString(36).substr(2, 6).toUpperCase();
      const result = await firebaseService.activateTerminal(terminalId, accessKey, {
        deviceId: systemDeviceId,
        deviceName: 'Android Kiosk Box',
        pairedDriverId: driver.uid,
        pairedAt: new Date().toISOString()
      });

      if (result.success) {
        localStorage.setItem('auto_ads_terminal_id', terminalId);
        await resumeTerminalSession(terminalId);
        setShowComplianceNotice(true);
        setStatusLogs(prev => ["SYS: PAIRING COMPLETE", `SYS: NODE ID ${terminalId} ACTIVE`, ...prev]);
      } else {
        setError(result.error || "Activation failed.");
      }
    } catch (err: any) {
      setError(err.message || "Activation logic error.");
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

          <form onSubmit={handleActivation} className="space-y-4">
            <div className="space-y-1 group">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-amber-500">Terminal Identifier</label>
              <div className="relative">
                 <input 
                  value={terminalId}
                  onChange={(e) => setTerminalId(e.target.value.toUpperCase())}
                  placeholder="DRV-CORE-0000" 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5 text-white font-mono text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:bg-white/10 transition-all font-bold placeholder:text-slate-700"
                  required
                />
                <Database className="absolute right-5 top-5 text-slate-600" size={18} />
              </div>
            </div>
            <div className="space-y-1 group">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-amber-500">Access Key</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  placeholder="••••••" 
                  maxLength={6}
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
              {loading ? <RefreshCw className="animate-spin" size={18} /> : <>ACTIVATE TERMINAL <Play size={14} fill="currentColor" /></>}
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
                <div className="px-1 py-0.5 bg-green-500/10 border border-green-500/20 rounded text-[6px] md:text-[7px] font-black text-green-500 uppercase tracking-normal">
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
        <div className="flex justify-between items-end flex-row-reverse pb-2 md:pb-0 pointer-events-auto">
           <div className="flex items-center gap-3">
              <button 
                 onClick={toggleFullscreen}
                 className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/5 flex items-center gap-2 hover:bg-white/5 transition-all group"
              >
                 <Maximize size={12} className="text-amber-500 group-hover:scale-110 transition-transform" />
                 <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Kiosk Force</span>
              </button>
              <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-3 md:px-5 py-1.5 md:py-2.5 rounded-xl border border-white/5">
                <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <p className="text-[6px] md:text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] md:tracking-[0.3em] font-mono">NODE_ACTIVE // SESSION_SECURE</p>
              </div>
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
                  
                  {/* Animated Atmosphere */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] border border-white/5 rounded-full" />
                  <motion.div 
                    animate={{ scale: [1, 1.1, 1], opacity: [0.05, 0.1, 0.05] }}
                    transition={{ duration: 15, repeat: Infinity }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] border border-white/5 rounded-full" 
                  />
               </div>

               <div className="w-full max-w-5xl px-4 md:px-10 flex flex-col md:grid md:grid-cols-12 gap-6 md:gap-12 items-center relative z-10 py-20 md:py-0 h-full md:h-auto overflow-y-auto md:overflow-visible no-scrollbar">
                  {/* Left Column: Stats & Status */}
                  <div className="w-full md:col-span-4 space-y-4 md:space-y-6 order-2 md:order-1 px-2 md:px-0">
                     <div className="space-y-2">
                        <p className="text-[8px] md:text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] font-mono">&gt; NODE_STATUS</p>
                        <div className="p-4 md:p-5 bg-white/5 border border-white/5 rounded-2xl md:rounded-3xl backdrop-blur-xl shadow-2xl relative overflow-hidden">
                           {downloading && (
                             <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center space-y-4">
                                <RefreshCw className="text-amber-500 animate-spin" size={24} />
                                <div>
                                   <p className="text-[10px] font-black text-white uppercase tracking-widest">Caching Ad Assets</p>
                                   <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">{downloadProgress}% Synchronized</p>
                                </div>
                                <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                                   <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${downloadProgress}%` }}
                                      className="h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                                   />
                                </div>
                             </div>
                           )}
                           <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
                              <div className="w-12 h-8 md:w-16 md:h-10 rounded-lg md:xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 p-1.5 md:p-2">
                                 <Smartphone className="text-amber-500" size={20} />
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
                                 <span className="text-slate-500">Storage Use</span>
                                 <span className="text-blue-500 text-[6px] md:text-[8px]">{systemMetrics.storage}GB / 16GB</span>
                              </div>
                              <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                                 <div className="h-full bg-blue-500/50" style={{ width: `${(systemMetrics.storage / 16) * 100}%` }} />
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="space-y-2">
                        <p className="text-[8px] md:text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] font-mono">&gt; HARDWARE_METRICS</p>
                        <div className="grid grid-cols-2 gap-3">
                           <div className="p-3 md:p-4 bg-white/5 border border-white/5 rounded-xl md:rounded-2xl backdrop-blur-md">
                              <p className="text-[7px] md:text-[8px] font-black text-slate-500 uppercase mb-1">RAM Usage</p>
                              <p className="text-xs md:text-sm font-black text-white">{systemMetrics.ram}%</p>
                              <div className="w-full bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden">
                                 <div className="h-full bg-blue-500" style={{ width: `${systemMetrics.ram}%` }} />
                              </div>
                           </div>
                           <div className="p-3 md:p-4 bg-white/5 border border-white/5 rounded-xl md:rounded-2xl backdrop-blur-md">
                              <p className="text-[7px] md:text-[8px] font-black text-slate-500 uppercase mb-1">Battery</p>
                              <p className={cn("text-xs md:text-sm font-black", systemMetrics.battery < 20 ? "text-red-500" : "text-green-500")}>
                                 {systemMetrics.battery}%
                              </p>
                              <div className="w-full bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden">
                                 <div className={cn("h-full", systemMetrics.battery < 20 ? "bg-red-500" : "bg-green-500")} style={{ width: `${systemMetrics.battery}%` }} />
                              </div>
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

      <AnimatePresence>
        {showComplianceNotice && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[200] flex items-center justify-center p-6 sm:px-10">
             <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               className="bg-white rounded-[2.5rem] p-10 max-w-xl shadow-2xl relative overflow-hidden"
             >
                <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />
                
                <div className="space-y-6">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-900">
                         <Database size={24} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black italic uppercase text-slate-900 leading-none">Terminal Compliance</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Legal Disclosure & Usage Notice</p>
                      </div>
                   </div>

                   <div className="space-y-4 max-h-[300px] overflow-y-auto pr-4 text-sm text-slate-600 leading-relaxed custom-scrollbar">
                      <section>
                         <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">Kiosk Mode & Auto-Start</h4>
                         <p>This application is optimized for Kiosk mode. Long-press the 'AA' logo in maintenance area to unlock technician settings. Ensure 'Auto-Start on Boot' is enabled in Android settings for persistent uptime.</p>
                      </section>
                      <section>
                         <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">GPS & Tracking Disclosure</h4>
                         <p>This terminal is equipped with persistent GPS tracking to verify ad impression authenticity. Location data is logged every 10-60 seconds while the unit is active.</p>
                      </section>
                      <section>
                         <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">Content Moderation</h4>
                         <p>Only approved media from the AutoAds Cloud will be displayed. Any attempt to modify system files or display custom content will result in immediate hardware deauthorization.</p>
                      </section>
                      <section>
                         <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">Offline Connectivity</h4>
                         <p>The device may cache ads. However, impression payouts require a network heartbeat to sync verified display counts to the ledger.</p>
                      </section>
                   </div>

                   <button 
                     onClick={() => setShowComplianceNotice(false)}
                     className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all active:scale-95"
                   >
                     I Accept & Initialize Terminal
                   </button>
                </div>
             </motion.div>
          </div>
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
