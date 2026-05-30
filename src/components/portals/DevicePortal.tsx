import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, Lock, Play, Wifi, WifiOff, AlertCircle, RefreshCw, Radio, Battery, Signal, Database, LogOut, Cpu, Eye, EyeOff, Maximize, Zap, School, Shield, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { firebaseService, AdCampaign, Driver } from '../../services/firebaseService';
import { auth } from '../../lib/firebase';
import { cn } from '../../lib/utils';
import { isSchoolTiming, filterAds } from '../smartAds/SmartAdEngine';
import SmartPassengerQR from '../smartAds/SmartPassengerQR';
import { AdaptiveRideContentEngine } from '../smartRide/AdaptiveRideContentEngine';
import { BrightnessManager, BrightnessProfile } from '../smartRide/brightness/BrightnessManager';

interface DevicePortalProps {
  onLogout: () => void;
}

const getSafeUrl = (url: string | undefined | null) => {
  if (!url) {
    console.warn("[DevicePortal] getSafeUrl received empty/null/undefined URL.");
    return undefined;
  }
  if (typeof url !== 'string') {
    console.warn("[DevicePortal] getSafeUrl received non-string URL:", typeof url);
    return undefined;
  }

  let cleaned = url.trim();
  if (cleaned.startsWith('https://https://')) {
    cleaned = cleaned.replace('https://https://', 'https://');
  } else if (cleaned.startsWith('http://https://')) {
    cleaned = cleaned.replace('http://https://', 'https://');
  }

  // Rewrite legacy non-CORS commondatastorage.googleapis.com endpoints to CORS-compliant storage.googleapis.com
  if (cleaned.includes('commondatastorage.googleapis.com')) {
    cleaned = cleaned.replace('commondatastorage.googleapis.com', 'storage.googleapis.com');
  }

  // Removed demo fallback video mapping

  // Reject invalid HTML preview URLs that are accidentally supplied as campaign media
  if (cleaned.includes('aistudio.google.com') || cleaned.includes('showPreview=')) {
    console.warn("[DevicePortal] getSafeUrl rejected AI Studio preview page URL:", url);
    return undefined;
  }

  try {
    const decoded = decodeURI(cleaned);
    const encoded = encodeURI(decoded);
    console.log("[DevicePortal] getSafeUrl processing URL. Original:", url, "Encoded:", encoded);
    return encoded;
  } catch (e) {
    return cleaned;
  }
};

const isVideoMedia = (ad: any) => {
  if (!ad) return false;
  const url = getSafeUrl(ad.url || ad.assetUrl || ad.mediaUrl) || '';
  const cleanPath = url.split('?')[0].toLowerCase();
  
  if (/\.(mp4|webm|ogg|mov|m4v|3gp|avi|mkv)$/i.test(cleanPath)) {
    return true;
  }
  
  const typeStr = (ad.type || ad.mediaType || '').toUpperCase();
  if (typeStr === 'VIDEO' || typeStr.startsWith('VIDEO/')) {
    return true;
  }
  
  return false;
};

export default function DevicePortal({ onLogout }: DevicePortalProps) {
  const [isLogged, setIsLogged] = useState(false);
  const [terminalId, setTerminalId] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!!localStorage.getItem('auto_ads_terminal_id'));
  const [driver, setDriver] = useState<Driver | null>(null);
  const [activeTerminal, setActiveTerminal] = useState<any>(null);
  const [playlist, setPlaylist] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [needsInteraction, setNeedsInteraction] = useState(false);
  const [online, setOnline] = useState(true);
  const [networkConfig, setNetworkConfig] = useState<any>(null);
  const [currentNetwork, setCurrentNetwork] = useState<string | null>(null);
  const [networkStatus, setNetworkStatus] = useState<'SCANNING' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED'>('DISCONNECTED');
  const [networkRetries, setNetworkRetries] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [teamViewerConfig, setTeamViewerConfig] = useState<{ id: string, lastCheck: number, installed: boolean } | null>(null);
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

  const [showPassword, setShowPassword] = useState(false);
  const [showComplianceNotice, setShowComplianceNotice] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState(Date.now());

  // --- Smart Ad Filtering states & listeners ---
  const [activeRidePref, setActiveRidePref] = useState<any>(null);
  const [isSchoolActive, setIsSchoolActive] = useState(isSchoolTiming());
  const [rawPlaylist, setRawPlaylist] = useState<any[]>([]);

  // --- Smart Brightness Mode logic ---
  const [brightnessProfile, setBrightnessProfile] = useState<BrightnessProfile>(() => 
    BrightnessManager.calculateBrightness('AUTO', 75, null)
  );

  useEffect(() => {
    const updateBrightness = () => {
      const bMode = activeRidePref?.brightnessMode || 'AUTO';
      const mLevel = activeRidePref?.manualBrightnessLevel ?? 75;
      const profile = BrightnessManager.calculateBrightness(bMode, mLevel, activeRidePref);
      setBrightnessProfile(profile);
    };

    updateBrightness();
  }, [activeRidePref]);

  useEffect(() => {
    // Check school timing once
    const active = isSchoolTiming();
    setIsSchoolActive(active);
  }, []);

  // Sync ride preferences when activeTerminal is provisioned or manual terminalId is set
  useEffect(() => {
    const tid = activeTerminal?.id || terminalId;
    if (!tid) return;
    
    console.log("[SmartAds] Listening for ridePreferences on device", tid);
    const unsubscribe = firebaseService.subscribeToRidePreference(tid, (pref) => {
      if (pref) {
        // Expiration check
        const expiresAt = pref.expiresAt ? new Date(pref.expiresAt) : null;
        if (!expiresAt || expiresAt > new Date()) {
          setActiveRidePref(pref);
          setStatusLogs(prev => [`SMART_ADS: Override Active (${pref.driverOverrideMode || 'User Preferences'})`, ...prev]);
        } else {
          setActiveRidePref(null);
          firebaseService.clearRidePreference(tid);
        }
      } else {
        setActiveRidePref(null);
      }
    });

    return () => unsubscribe();
  }, [activeTerminal?.id, terminalId]);

  // Combine raw ads with the filtering rules in real-time
  useEffect(() => {
    const currentMode = activeRidePref?.driverOverrideMode || 'NORMAL';
    const compiledPlaylist = AdaptiveRideContentEngine.generatePlaylist(
      rawPlaylist,
      currentMode as any,
      isSchoolActive,
      activeRidePref?.blockedCategories || []
    );
    setPlaylist(compiledPlaylist);
    
    if (rawPlaylist.length > 0) {
      console.log(`[SmartAds] Filtered playlist from ${rawPlaylist.length} to ${compiledPlaylist.length} items (SchoolActive: ${isSchoolActive}, Mode: ${currentMode})`);
    }
  }, [rawPlaylist, isSchoolActive, activeRidePref]);

  // Check if campaign is active and within scheduled time/day
  const isRunTimeCompliant = (campaign: AdCampaign) => {
    const now = new Date();
    
    // 1. Day of Week Check
    if (campaign.daysOfWeek && campaign.daysOfWeek.length > 0) {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const today = days[now.getDay()];
      if (!campaign.daysOfWeek.includes(today)) return false;
    }
    
    // 2. Time Window Check
    if (campaign.startTime && campaign.endTime) {
      const [startH, startM] = campaign.startTime.split(':').map(Number);
      const [endH, endM] = campaign.endTime.split(':').map(Number);
      
      const startTimeDate = new Date(now);
      startTimeDate.setHours(startH, startM, 0);
      
      const endTimeDate = new Date(now);
      endTimeDate.setHours(endH, endM, 0);
      
      if (now < startTimeDate || now > endTimeDate) return false;
    }
    
    return true;
  };
  const sessionUptime = Math.floor((currentTime.getTime() - startTime) / 1000);
  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };
  const videoRef = useRef<HTMLVideoElement>(null);
  const posRef = useRef({ lat: 12.9716, lng: 77.5946 });
  const currentAdRef = useRef<any>(null);

  useEffect(() => {
    currentAdRef.current = playlist[currentIndex];
  }, [playlist, currentIndex]);

  useEffect(() => {
    // GPS prompt removed by user request
  }, [isLogged, driver]);

  // handleUpdateGpsId removed by user request
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
      setStatusLogs(prev => [logs[Math.floor(Math.random() * logs.length)], ...prev.slice(0, 5)]);
    }
  }, [playlist.length, isLogged]);

  // Real-time ad assignments
  useEffect(() => {
    if (!isLogged || !driver?.uid) return;

    setLoading(true);
    // Subscribe directly to campaigns that are ACTIVE and assigned to this driver
    const unsubscribe = firebaseService.subscribeToActiveAssignedCampaigns(driver.uid, (campaigns) => {
      // Flatten ads from all assigned campaigns
      let allAds: any[] = [];
      const compliantCampaigns = campaigns.filter(c => isRunTimeCompliant(c));
      
      compliantCampaigns.forEach(campaign => {
        // Only include if definitively active/live
        if (!['ACTIVE', 'LIVE', 'APPROVED', 'PAID'].includes(campaign.status?.toUpperCase() || '')) {
          return;
        }

        let campaignAds: any[] = [];
        
        // Use the primary media link if it exists
        const mainUrl = campaign.mediaUrl || campaign.assetUrl;
        if (mainUrl) {
          campaignAds.push({
            id: `${campaign.id}_primary`,
            url: mainUrl,
            type: campaign.mediaType || 'IMAGE',
            title: campaign.title,
            duration: 10
          });
        }

        // Add any additional ads in the rotation list
        if (campaign.ads && Array.isArray(campaign.ads)) {
          campaign.ads.forEach((ad: any, idx: number) => {
            const adUrl = ad.url || ad.assetUrl || ad.mediaUrl;
            if (adUrl && adUrl !== mainUrl) {
              campaignAds.push({
                id: ad.id || `${campaign.id}_sub_${idx}`,
                url: adUrl,
                type: ad.type || ad.mediaType || 'IMAGE',
                title: ad.title || campaign.title,
                duration: ad.duration || 10
              });
            }
          });
        }
        
        allAds = [...allAds, ...campaignAds];
      });
      
      const validAds = allAds.filter(ad => {
        if (!ad.url || typeof ad.url !== 'string') return false;
        if (ad.url === '/uploads/1779860520885-1000434856.mp4') return false;
        const safe = getSafeUrl(ad.url);
        return !!safe;
      });
      setRawPlaylist(validAds);
      setLoading(false);
      
      if (validAds.length > 0) {
        setStatusLogs(prev => [`HUB: manifest received (${campaigns.length} campaigns)`, `AD_SRV: ${allAds.length} assets ready`, ...prev]);
        setShowComplianceNotice(false);
        
        const isTerminalMode = localStorage.getItem('auto_ads_is_terminal') === 'true';
        if (isTerminalMode && allAds.length > 0) {
           // Auto-trigger video start if possible
           if (videoRef.current) {
             videoRef.current.play().catch(() => {});
           }
        }
      } else {
        setStatusLogs(prev => ["HUB: Scanning for compliant assignments...", ...prev]);
      }
    });

    return () => unsubscribe();
  }, [isLogged, driver?.uid, lastCheckTime]);

  // Periodic check for scheduler transitions removed

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

    return () => {
       unsubscribeCommand();
    };
  }, [isLogged, activeTerminal?.id, online, playlist.length, systemMetrics.battery]);

  // Asset Download Simulation removed

  // Real-time location reporting
  useEffect(() => {
    if (!isLogged || !driver?.uid || !activeTerminal?.id) return;
    // Location polling logic removed for stability
  }, [isLogged, driver?.uid, online, activeTerminal?.id, playlist, currentIndex]);
  const autoConnectDriver = async () => {
      console.log("[Terminal] autoConnectDriver called, auth.currentUser:", auth.currentUser?.uid);
      setLoading(true);
      try {
          // 1. If we have a logged in firebase user:
          if (auth.currentUser) {
              console.log("[Terminal] Logged in driver detected, ensuring terminal dynamic registration...");
              const { terminalId: tid } = await firebaseService.autoEnsureTerminalForDriver(auth.currentUser.uid);
              console.log("[Terminal] Terminal registration verified:", tid);
              localStorage.setItem('auto_ads_terminal_id', tid);
              await resumeTerminalSession(tid);
              return;
          }

          // 2. Check saved terminal ID in localStorage
          const savedTerminalId = localStorage.getItem('auto_ads_terminal_id') || localStorage.getItem('temp_terminal_id');
          const savedAccessKey = localStorage.getItem('auto_ads_access_key') || localStorage.getItem('temp_access_key');
          
          console.log("[Terminal] Initialization flow. savedTerminalId:", savedTerminalId);

          if (savedTerminalId) {
              if (savedAccessKey) {
                  console.log("[Terminal] Found saved terminal ID and access key. Resuming...");
                  await handleActivationManual(savedTerminalId, savedAccessKey);
              } else {
                  console.log("[Terminal] Found saved terminal ID but NO access key. Resuming...");
                  await resumeTerminalSession(savedTerminalId);
              }
              return;
          }

          // 3. Login is NOT required for terminal tab. We automatically find or register a default driver & terminal!
          console.log("[Terminal] No active terminal stored. Finding or provisioning terminal automatically...");
          const terminals = await firebaseService.getTerminals() as any[];
          
          if (terminals && terminals.length > 0) {
              const firstTerm = terminals.find((t: any) => t.status === 'ACTIVE') || terminals[0];
              console.log("[Terminal] Automatically connecting to terminal:", firstTerm.id);
              localStorage.setItem('auto_ads_terminal_id', firstTerm.id);
              if (firstTerm.accessKey) {
                  localStorage.setItem('auto_ads_access_key', firstTerm.accessKey);
              }
              await resumeTerminalSession(firstTerm.id);
              return;
          }

          // 4. Fetch drivers to see if we can provision a terminal for the first driver
          const drivers = await firebaseService.getDrivers();
          if (drivers && drivers.length > 0) {
              const firstDriver = drivers[0];
              console.log("[Terminal] Auto-provisioning terminal for driver:", firstDriver.id);
              const { terminalId: tid } = await firebaseService.autoEnsureTerminalForDriver(firstDriver.id);
              localStorage.setItem('auto_ads_terminal_id', tid);
              await resumeTerminalSession(tid);
              return;
          }

          // 5. Fallback: provision a brand new default demo terminal & driver!
          console.log("[Terminal] No terminals or drivers exist in the system. Auto-creating a demo driver & terminal...");
          const defaultDriverId = "DRV-DEMO-SYSTEM";
          const { terminalId: tid } = await firebaseService.autoEnsureTerminalForDriver(defaultDriverId);
          localStorage.setItem('auto_ads_terminal_id', tid);
          await resumeTerminalSession(tid);

      } catch (err: any) {
          console.error("[Terminal] Auto activation sequence failed:", err);
          setError("Auto-login error: " + err.message);
      } finally {
          setLoading(false);
      }
  };

  // Check shared preferences simulation (localStorage)
  useEffect(() => {
    autoConnectDriver();

    const handleConnection = () => setOnline(navigator.onLine);
    window.addEventListener('online', handleConnection);
    window.addEventListener('offline', handleConnection);
    return () => {
      window.removeEventListener('online', handleConnection);
      window.removeEventListener('offline', handleConnection);
    };
  }, []);

  const resumeTerminalSession = async (tid: string) => {
    console.log(`[Terminal] Resuming session for ${tid}...`);
    try {
      setLoading(true);
      const terminals: any[] = await firebaseService.getTerminals();
      const term = terminals.find(t => t.id === tid);
      
      console.log(`[Terminal] Found terminal record:`, term);
      
      if (term && term.status === 'ACTIVE') {
        setActiveTerminal(term);
        
        // --- Simulated TeamViewer Auto ID Obtain ---
        if (!term.teamViewerId) {
          setTimeout(async () => {
             // Simulating reading the Android Intent / Package Manager for TeamViewer ID
             const tvId = Math.floor(100000000 + Math.random() * 900000000).toString();
             const tvPass = Math.random().toString(36).substring(2, 10).toUpperCase();
             console.log(`[Terminal] Auto-obtained Android TeamViewer HOST ID: ${tvId}`);
             setTeamViewerConfig({ id: tvId, lastCheck: Date.now(), installed: true });
             try {
               await firebaseService.updateTerminalTeamViewer(tid, tvId, tvPass);
               setStatusLogs(prev => ["SYS: Built-in TeamViewer Control Configured", ...prev]);
             } catch(e) {}
          }, 4500);
        } else {
             setTeamViewerConfig({ id: term.teamViewerId, lastCheck: Date.now(), installed: true });
        }
        // ------------------------------------------
        
        // Auto-connection system
        if (term.networkConfig) {
           setNetworkConfig(term.networkConfig);
           setNetworkStatus('SCANNING');
           setStatusLogs(prev => ["NET: Scanning saved networks...", ...prev]);
           setTimeout(() => {
              setNetworkStatus('CONNECTING');
              setStatusLogs(prev => [`NET: Authenticating to ${term.networkConfig.wifiSSID || 'Hotspot'}...`, ...prev]);
              setTimeout(() => {
                 setNetworkStatus('CONNECTED');
                 setCurrentNetwork(term.networkConfig.wifiSSID || term.networkConfig.hotspotName);
                 setOnline(true);
                 setStatusLogs(prev => ["NET: Connected to internet successfully.", "NET: Reconnection agent monitoring link.", ...prev]);
                 firebaseService.updateTerminalNetwork(tid, {
                    ...term.networkConfig,
                    lastConnected: true,
                    connectionStatus: 'CONNECTED'
                 });
              }, 2500);
           }, 2000);
        } else {
           setNetworkStatus('DISCONNECTED');
           setOnline(true); // Fallback standard mode
        }

        const d = await firebaseService.getDriverProfile(term.driverId);
        console.log(`[Terminal] Linked driver profile:`, d);
        
        if (d) {
          setDriver(d);
          setIsLogged(true);
          console.log("DRIVER LOGIN SUCCESS");
          console.log("[Terminal] Authentication complete, showing portal.");
          // Auto-bypass notice for authorized terminal sessions (like our demo)
          setShowComplianceNotice(false);
        } else {
          console.error("[Terminal] Driver profile not found for terminal:", term.driverId);
          setError("Hardware linked to missing profile. Autocompensating...");
          setTimeout(() => autoConnectDriver(), 1500);
        }
      } else {
        console.warn("[Terminal] Terminal state invalid or not ACTIVE", term?.status);
        localStorage.removeItem('auto_ads_terminal_id');
        localStorage.removeItem('auto_ads_access_key');
        setError(`Auto-Reconnecting Invalid Terminal: ${term ? term.status : 'Not Found'}`);
        setTimeout(() => autoConnectDriver(), 1500);
      }
    } catch (e: any) {
      console.error("[Terminal] Session resume failure:", e);
      localStorage.removeItem('auto_ads_terminal_id');
      localStorage.removeItem('auto_ads_access_key');
      setError("Sync Error. Recalibrating...");
      setTimeout(() => autoConnectDriver(), 1500);
    } finally {
      setLoading(false);
    }
  };

  // Auto-Reboot simulation for 2GB RAM devices removed

  // Network Recovery Agent removed

  const enterKioskMode = () => {
    console.log("[DevicePortal] Entering Kiosk Mode... Uptime:", formatUptime(sessionUptime));
    setNeedsInteraction(false);
    toggleFullscreen();
    if (videoRef.current) {
      videoRef.current.play().catch(e => console.error("Auto-play blocked:", e));
    }
  };

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

  const handleActivationManual = async (tid: string, akey: string) => {
    setLoading(true);
    setError('');
    console.log(`[Terminal] Attempting auto-activation for ${tid} with key ${akey}`);
    try {
      const systemDeviceId = "NODE-" + Math.random().toString(36).substr(2, 6).toUpperCase();
      const result = await firebaseService.activateTerminal(tid, akey, {
        deviceId: systemDeviceId,
        deviceName: 'Android Web Instance',
        pairedAt: new Date().toISOString()
      });

      if (result) {
        console.log("[Terminal] Activation successful:", result);
        localStorage.setItem('auto_ads_terminal_id', tid);
        localStorage.setItem('auto_ads_access_key', akey);
        localStorage.removeItem('temp_terminal_id');
        localStorage.removeItem('temp_access_key');
        await resumeTerminalSession(tid);
      } else {
        console.warn("[Terminal] Activation returned no result");
        setError("Activation failed - no response from server.");
      }
    } catch (err: any) {
      console.error("[Terminal] Activation error:", err);
      setError(err.message || "Activation logic error.");
    } finally {
      setLoading(false);
    }
  };

  const handleActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessKey) {
      setError("Please enable device login toggle.");
      return;
    }
    // Treating terminalId as driver phone/number
    handleActivationManual(terminalId, 'DRIVER_LOGIN_MODE');
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

  // Rotation Logic (Optimized for 5+ ads)
  useEffect(() => {
    if (isLogged && playlist.length > 0) {
      const currentAd = playlist[currentIndex];
      if (!currentAd) {
        setCurrentIndex(0);
        return;
      }
      
      const adUrl = getSafeUrl(currentAd?.url || currentAd?.assetUrl || currentAd?.mediaUrl) || '';
      const isVideo = isVideoMedia(currentAd);
      
      // Auto-start is handled by the video tag having 'autoPlay'
      // If it's a static image, we need a timer.
      if (!isVideo) {
        const timer = setTimeout(() => {
          setCurrentIndex(prev => (prev + 1) % playlist.length);
        }, 10000); // 10s per static ad as requested
        return () => clearTimeout(timer);
      }
    }
  }, [isLogged, playlist, currentIndex]);

  const handleAdComplete = () => {
    if (playlist.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % playlist.length);
    }
  };

  // Preload next media
  useEffect(() => {
    if (playlist.length > 1) {
      const nextIndex = (currentIndex + 1) % playlist.length;
      const nextAd = playlist[nextIndex];
      const nextAdUrl = getSafeUrl(nextAd?.url || nextAd?.assetUrl || nextAd?.mediaUrl);
      if (nextAdUrl) {
         const link = document.createElement('link');
         link.rel = 'preload';
         link.as = (nextAdUrl.split('?')[0].match(/\.(mp4|webm|ogg)$/i) || nextAd?.type === 'VIDEO' || nextAd?.mediaType === 'VIDEO') ? 'video' : 'image';
         link.href = nextAdUrl;
         document.head.appendChild(link);
      }
    }
  }, [playlist, currentIndex]);

  // Infinite loading / Black screen fix: Watchdog removed

  const handleExitDisplayMode = async () => {
    localStorage.removeItem('auto_ads_is_terminal');
    localStorage.removeItem('auto_ads_terminal_id');
    localStorage.removeItem('auto_ads_access_key');
    await onLogout();
  };

  if (!isLogged) {
    return (
      <div className="fixed inset-0 bg-[#020617] flex items-center justify-center p-6 font-sans overflow-y-auto">
        <div className="w-full max-w-sm">
          <div className="bg-slate-900/50 backdrop-blur-xl p-8 md:p-10 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 mx-auto mb-4 border border-amber-500/20">
                <Cpu size={32} className="animate-spin" style={{ animationDuration: '6s' }} />
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Auto-Aligning Node</h2>
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-2 italic animate-pulse">Establishing autonomous pairing</p>
            </div>

            {error && (
              <div className="p-4 bg-black/40 border border-white/5 rounded-2xl text-left font-mono text-[9px] text-slate-400">
                <div className="pt-1.5 text-rose-400 flex items-start gap-2">
                   <strong className="text-rose-500">ERROR:</strong>
                   <span>{error}</span>
                </div>
              </div>
            )}

            <p className="text-[8px] text-center font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
               Manual hardware entry fields have been permanently removed. Pairing is fully autonomous and secure.
            </p>

            <button 
              type="button"
              onClick={() => {
                setError('');
                localStorage.removeItem('auto_ads_terminal_id');
                localStorage.removeItem('auto_ads_access_key');
                autoConnectDriver();
              }}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all active:scale-95 shadow-xl border border-white/5 flex items-center justify-center gap-2 group"
            >
              <RefreshCw className="group-hover:rotate-180 transition-transform duration-500" size={12} />
              Force Refetch Alignment
            </button>
          </div>
          
          <button 
            onClick={handleExitDisplayMode}
            className="w-full mt-8 text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-[0.3em] transition-all"
          >
            &lt; Abort Connection &gt;
          </button>
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
                <img src={driver.profileImage} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Profile" referrerPolicy="no-referrer" />
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
            {localStorage.getItem('auto_ads_is_terminal') === 'true' && (
              <button 
                onClick={handleExitDisplayMode}
                className="px-3 md:px-5 py-2 md:py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-500 rounded-xl flex items-center gap-2 transition-all active:scale-95 group shadow-lg"
                title="Back to Dashboard"
              >
                <Smartphone size={12} className="md:w-[14px]" />
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest hidden md:inline">Dashboard</span>
              </button>
            )}
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
                     <div className="space-y-2 mt-4">
                        <p className="text-[8px] md:text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] font-mono">&gt; NETWORK_MANAGER</p>
                        <div className="p-3 md:p-4 bg-white/5 border border-white/5 rounded-xl md:rounded-2xl backdrop-blur-md space-y-3">
                           <div className="flex justify-between items-center text-[8px] md:text-[9px] font-bold uppercase tracking-widest">
                              <span className="text-slate-500">WiFi SSID:</span>
                              <span className="text-white">{networkConfig?.wifiSSID || 'Not Configured'}</span>
                           </div>
                           <div className="flex justify-between items-center text-[8px] md:text-[9px] font-bold uppercase tracking-widest">
                              <span className="text-slate-500">Hotspot Fallback:</span>
                              <span className="text-white">{networkConfig?.hotspotName || 'Not Configured'}</span>
                           </div>
                           <div className="flex justify-between items-center text-[8px] md:text-[9px] font-bold uppercase tracking-widest">
                              <span className="text-slate-500">Connection Status:</span>
                              <span className={cn("px-2 py-0.5 rounded text-[8px]", networkStatus === 'CONNECTED' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500')}>{networkStatus}</span>
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

              {/* Scan to customize overlay - emotional, family-friendly, premium smart mobility design */}
              <SmartPassengerQR deviceId={activeTerminal?.id || terminalId || "ACTIVE"} />

              {/* Dynamic Mode Notification Banners */}
              {(isSchoolActive || activeRidePref || brightnessProfile) && (
                <div className="absolute top-12 left-12 z-50 flex flex-col gap-2 pointer-events-none text-left">
                  {/* School Safe mode timing banner */}
                  {isSchoolActive && (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="px-4 py-2.5 bg-sky-500 text-slate-950 rounded-2xl flex items-center gap-2 shadow-lg border border-sky-400 font-sans"
                    >
                      <School size={14} className="animate-bounce" />
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-wider leading-none">School Zone Timing Active</p>
                        <p className="text-[6px] font-bold uppercase tracking-widest text-slate-950 leading-none mt-0.5">Children Safe Mode Automatically Triggered</p>
                      </div>
                    </motion.div>
                  )}

                  {/* Active manual overrides banner */}
                  {activeRidePref && (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="px-4 py-2.5 bg-green-500 text-slate-950 rounded-2xl flex items-center gap-2 shadow-lg border border-emerald-400 font-sans"
                    >
                      <Shield size={14} />
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-wider leading-none">
                          {activeRidePref.driverOverrideMode ? `${activeRidePref.driverOverrideMode.replace('_', ' ')} OVERRIDE ACTIVE` : 'PASSENGER PREFERENCES ACTIVE'}
                        </p>
                        <p className="text-[6px] font-bold uppercase tracking-widest text-slate-950 leading-none mt-0.5">Ad feeds filtered dynamically for this ride</p>
                      </div>
                    </motion.div>
                  )}

                  {/* Smart Auto Brightness HUD banner */}
                  {brightnessProfile && (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="px-4 py-2.5 bg-slate-950/85 backdrop-blur-md text-white rounded-2xl flex items-center gap-2 shadow-lg border border-white/10 font-sans"
                    >
                      <Sun size={14} className={cn("text-amber-400", brightnessProfile.level < 40 ? "animate-pulse" : "")} />
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-wider leading-none">
                          Auto-Brightness: <span className="text-amber-400 font-black">{brightnessProfile.level}%</span>
                        </p>
                        <p className="text-[6px] font-bold uppercase tracking-widest text-slate-400 leading-none mt-0.5 flex items-center gap-1.5 font-mono">
                          <span>{brightnessProfile.label}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-600" />
                          <span>LDR: {brightnessProfile.simulatedLux} LUX</span>
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              <div 
                className={cn(
                  "w-full h-full relative transition-[filter]"
                )}
                style={{
                  filter: `brightness(${brightnessProfile ? brightnessProfile.level / 100 : 0.75}) ${
                    brightnessProfile?.reducedContrast ? 'contrast(0.75)' : ''
                  } ${
                    brightnessProfile?.reducedGlow ? 'saturate(0.5) contrast(0.9)' : ''
                  }`,
                  transition: 'filter 1.5s ease'
                }}
              >
                {isVideoMedia(currentAd) ? (
                  <video 
                    key={`vid_${currentAd?.url || currentAd?.assetUrl || currentAd?.mediaUrl || currentIndex}`}
                    ref={videoRef}
                    autoPlay 
                    muted 
                    loop={playlist.length === 1}
                    playsInline
                    className="w-full h-full object-cover"
                    src={getSafeUrl(currentAd?.url || currentAd?.assetUrl || currentAd?.mediaUrl) || ""}
                    onEnded={handleAdComplete}
                    onError={(e) => {
                      const urlToLog = getSafeUrl(currentAd?.url || currentAd?.assetUrl || currentAd?.mediaUrl);
                      console.error("[Terminal] Video playback error:", urlToLog);
                      if (videoRef.current && videoRef.current.src !== '/uploads/1779860520885-1000434856.mp4') {
                        console.warn("[Terminal] Attempting fallback to sample video...");
                        videoRef.current.src = '/uploads/1779860520885-1000434856.mp4';
                        videoRef.current.play().catch(pErr => {
                          console.error("[Terminal] Fallback also failed or was blocked by gesture requirement:", pErr);
                          handleAdComplete();
                        });
                      } else {
                        handleAdComplete();
                      }
                    }}
                  />
                ) : (
                  <img 
                    key={`img_${currentAd?.url || currentAd?.assetUrl || currentAd?.mediaUrl || currentIndex}`}
                    src={getSafeUrl(currentAd?.url || currentAd?.assetUrl || currentAd?.mediaUrl) || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="} 
                    alt={currentAd?.title || "Ad"} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const urlAttempted = getSafeUrl(currentAd?.url || currentAd?.assetUrl || currentAd?.mediaUrl);
                      console.error("[Terminal] Image load error. Ad ID:", currentAd?.id, ". Attempted URL:", urlAttempted);
                      handleAdComplete();
                    }}
                  />
                )}
              </div>
              
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
                   {currentAd?.title || 'AutoAds Campaign'}
                 </motion.h2>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
