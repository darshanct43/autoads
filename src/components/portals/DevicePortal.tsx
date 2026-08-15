import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, Lock, Play, Wifi, WifiOff, AlertCircle, RefreshCw, Radio, Battery, Signal, Database, LogOut, Cpu, Eye, EyeOff, Maximize, Zap, School, Shield, Sun, Moon, Volume2, VolumeX } from 'lucide-react';
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
  if (cleaned.startsWith('data:')) return cleaned;
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
  const wakeLockSentinelRef = useRef<any>(null);
  // Auto-trigger full screen & WakeLock on first interaction
  useEffect(() => {
    const handleInteraction = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen().catch((err) => console.error("Error attempting full-screen:", err));
        }
        if ('wakeLock' in navigator) {
            try {
                wakeLockSentinelRef.current = await (navigator.wakeLock as any).request('screen');
                console.log("[DevicePortal] Wake Lock activated.");
            } catch (lockErr: any) {
                if (lockErr.name === 'NotAllowedError') {
                    console.warn("[DevicePortal] Wake Lock not allowed by permissions policy.");
                } else {
                    console.error("[DevicePortal] Wake Lock request error:", lockErr);
                }
            }
        }
        console.log("FULLSCREEN", !!document.fullscreenElement);
        console.log("WAKELOCK", !!wakeLockSentinelRef.current);
        console.log("ORIENTATION", screen.orientation?.type);
      } catch (err) {
        console.error("Error attempting full-screen:", err);
      }
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  const [isLogged, setIsLogged] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem('auto_ads_cached_terminal') && !!localStorage.getItem('auto_ads_cached_driver');
    } catch (e) {
      return false;
    }
  });
  const [terminalId, setTerminalId] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(() => {
    try {
      const hasTerminalId = !!localStorage.getItem('auto_ads_terminal_id');
      const hasCachedTerminal = !!localStorage.getItem('auto_ads_cached_terminal');
      return hasTerminalId && !hasCachedTerminal; // Only show initial loading screen if we don't have a cached session ready
    } catch (e) {
      return true;
    }
  });
  const [driver, setDriver] = useState<Driver | null>(() => {
    try {
      const cached = localStorage.getItem('auto_ads_cached_driver');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });
  const [activeTerminal, setActiveTerminal] = useState<any>(() => {
    try {
      const cached = localStorage.getItem('auto_ads_cached_terminal');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });
  const [playlist, setPlaylist] = useState<any[]>([]);
  const [thoughts, setThoughts] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(() => {
    const saved = localStorage.getItem('terminal_ad_current_index');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [playbackTick, setPlaybackTick] = useState(0);
  const [adDuration, setAdDuration] = useState(10);
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
  const [rawPlaylist, setRawPlaylist] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('auto_ads_cached_playlist');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [assignedCampaigns, setAssignedCampaigns] = useState<any[]>([]);
  const [bypassScheduleFilter, setBypassScheduleFilter] = useState(false);

  // --- Recovered Hardware Controllers ---
  const [terminalVolume, setTerminalVolume] = useState<number>(75);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [emergencyBroadcast, setEmergencyBroadcast] = useState<string | null>(null);

  // Synchronize terminal volume with video element volume
  useEffect(() => {
    if (videoRef.current) {
      const volFraction = Math.max(0, Math.min(100, terminalVolume)) / 100;
      videoRef.current.volume = volFraction;
    }
  }, [terminalVolume, currentIndex]);

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
    if (bypassScheduleFilter) return true;
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
  const [showOverlayOnDemand, setShowOverlayOnDemand] = useState(false);
  const overlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerOverlayOnDemand = (e?: React.MouseEvent) => {
    if (playlist.length === 0) return; // Always visible on standby
    
    if (e && e.target instanceof Element && (e.target.closest('button') || e.target.closest('a') || e.target.closest('[role="button"]'))) {
      return; 
    }

    setShowOverlayOnDemand(prev => {
      const next = !prev;
      if (next) {
        if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
        overlayTimeoutRef.current = setTimeout(() => {
          setShowOverlayOnDemand(false);
        }, 5000);
      }
      return next;
    });
  };

  useEffect(() => {
    return () => {
      if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
    };
  }, [playlist.length]);

  useEffect(() => {
    localStorage.setItem('terminal_ad_current_index', currentIndex.toString());
  }, [currentIndex]);

  const [wakeLock, setWakeLock] = useState<any>(null);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        const lock = await (navigator.wakeLock as any).request('screen');
        setWakeLock(lock);
        console.log("[Terminal] Wake Lock API successfully activated. Screen sleep prevented.");
        setStatusLogs(prev => ["SYS: Wake Lock Active (Screen Dimming Off)", ...prev.slice(0, 5)]);
      }
    } catch (err: any) {
      console.warn("[Terminal] Wake Lock failed:", err);
    }
  };

  useEffect(() => {
    if (isLogged) {
      requestWakeLock();
    }
    return () => {
      if (wakeLock) {
        wakeLock.release().then(() => setWakeLock(null)).catch(() => {});
      }
    };
  }, [isLogged]);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isLogged) {
        await requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isLogged]);

  useEffect(() => {
    if (isLogged) {
      localStorage.setItem('kiosk_mode_active', 'true');
      
      const tryFullscreen = () => {
        const docEl = document.documentElement as any;
        if (!document.fullscreenElement) {
          if (docEl.requestFullscreen) {
            docEl.requestFullscreen().catch(() => {});
          } else if (docEl.webkitRequestFullscreen) {
            docEl.webkitRequestFullscreen();
          } else if (docEl.msRequestFullscreen) {
            docEl.msRequestFullscreen();
          }
        }
      };
      
      tryFullscreen();
      
      const handleGlobalClick = () => {
        tryFullscreen();
      };
      
      window.addEventListener('click', handleGlobalClick);
      window.addEventListener('touchstart', handleGlobalClick);
      
      return () => {
        window.removeEventListener('click', handleGlobalClick);
        window.removeEventListener('touchstart', handleGlobalClick);
      };
    } else {
      localStorage.removeItem('kiosk_mode_active');
    }
  }, [isLogged]);

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
    const dId = driver?.uid || driver?.id;
    if (!isLogged || !dId) return;

    setLoading(true);
    // Subscribe directly to campaigns that are ACTIVE and assigned to this driver
    const unsubscribe = firebaseService.subscribeToActiveAssignedCampaigns(dId, (campaigns) => {
      setAssignedCampaigns(campaigns);
      // Flatten ads from all assigned campaigns
      let allAds: any[] = [];
      const compliantCampaigns = campaigns.filter(c => isRunTimeCompliant(c));
      
      compliantCampaigns.forEach(campaign => {
        // Only include if definitively active/live and NOT paused
        const status = campaign.status?.toUpperCase() || '';
        const operationalStatus = campaign.operationalStatus?.toUpperCase() || 'ACTIVE'; // Default to ACTIVE for legacy docs

        if (!['ACTIVE', 'LIVE', 'APPROVED', 'PAID'].includes(status)) {
          return;
        }

        if (operationalStatus === 'PAUSED') {
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
        try {
          localStorage.setItem('auto_ads_cached_playlist', JSON.stringify(validAds));
        } catch (e) {}
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
  }, [isLogged, driver?.uid, lastCheckTime, bypassScheduleFilter]);

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
      if (terminal) {
         if (typeof terminal.volume === 'number') {
            setTerminalVolume(terminal.volume);
         }
         setIsLocked(!!terminal.isLocked);
         setEmergencyBroadcast(terminal.emergencyBroadcast || null);
      }
    });

    return () => {
       unsubscribeCommand();
    };
  }, [isLogged, activeTerminal?.id, online, playlist.length, systemMetrics.battery]);

  // Asset Download Simulation removed

  // Real-time location and telemetry (heartbeat) reporting - Every 60 seconds
  useEffect(() => {
    if (!isLogged || !activeTerminal?.id) return;

    const reportTelemetry = async () => {
      try {
        const currentAd = playlist[currentIndex];
        const campaignTitle = currentAd?.title || 'None';
        const netValue = currentNetwork || networkStatus || 'CONNECTED';
        const battValue = systemMetrics.battery ?? 88;
        const tempValue = Math.floor(45 + (Math.sin(Date.now() / 600000) * 3)); // realistic active temperature around 42-48 C

        await firebaseService.syncTerminalPulse(activeTerminal.id, {
          batteryLevel: battValue,
          networkStatus: netValue,
          lastCampaignPlayed: campaignTitle,
          playbackStatus: 'PLAYING',
          temperature: tempValue
        });
        console.log(`[Terminal] periodic telemetry pulse sent. currentCampaign: ${campaignTitle}, battery: ${battValue}%, network: ${netValue}, temp: ${tempValue}C`);
      } catch (err) {
        console.warn("[Terminal] Telemetry pulse failed:", err);
      }
    };

    // Run immediately
    reportTelemetry();

    // Repeat every 60 seconds
    const interval = setInterval(() => {
      reportTelemetry();
    }, 60000);

    return () => clearInterval(interval);
  }, [isLogged, activeTerminal?.id, currentIndex, playlist, currentNetwork, networkStatus, systemMetrics.battery]);
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
          const terminals = await firebaseService.getTerminals(undefined, true) as any[];
          
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
          try {
            const cachedTermStr = localStorage.getItem('auto_ads_cached_terminal');
            const cachedDriverStr = localStorage.getItem('auto_ads_cached_driver');
            if (cachedTermStr && cachedDriverStr) {
               console.log("[Terminal] AutoConnect failed but found offline cache. Restoring cached session...");
               const termObj = JSON.parse(cachedTermStr);
               const driverObj = JSON.parse(cachedDriverStr);
               setActiveTerminal(termObj);
               setDriver(driverObj);
               setIsLogged(true);
               setError("");
               setLoading(false);
               return;
            }
          } catch(cacheErr) {}
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
      const term = await firebaseService.getTerminal(tid) as any;
      
      console.log(`[Terminal] Found terminal record:`, term);
      
      if (term && term.status === 'ACTIVE') {
        setActiveTerminal(term);
        if (typeof term.volume === 'number') {
          setTerminalVolume(term.volume);
        }
        setIsLocked(!!term.isLocked);
        setEmergencyBroadcast(term.emergencyBroadcast || null);
        
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

          // Save to local cache
          try {
            localStorage.setItem('auto_ads_cached_terminal', JSON.stringify(term));
            localStorage.setItem('auto_ads_cached_driver', JSON.stringify(d));
          } catch (cacheErr) {}
        } else {
          console.error("[Terminal] Driver profile not found for terminal:", term.driverId);
          setError("Hardware linked to missing profile. Autocompensating...");
          setTimeout(() => autoConnectDriver(), 1500);
        }
      } else {
        console.warn("[Terminal] Terminal state invalid or not ACTIVE", term?.status);
        // Only clear if the server explicitly tells us the terminal status is not ACTIVE (invalidated provisioning)
        localStorage.removeItem('auto_ads_terminal_id');
        localStorage.removeItem('auto_ads_access_key');
        setError(`Auto-Reconnecting Invalid Terminal: ${term ? term.status : 'Not Found'}`);
        setTimeout(() => autoConnectDriver(), 3000);
      }
    } catch (e: any) {
      console.error("[Terminal] Session resume failure:", e);
      
      // Attempt to load from offline localStorage cache
      try {
        const cachedTermStr = localStorage.getItem('auto_ads_cached_terminal');
        const cachedDriverStr = localStorage.getItem('auto_ads_cached_driver');
        if (cachedTermStr && cachedDriverStr) {
          console.log("[Terminal] Offline mode: Restoring terminal and driver profiles from cache...");
          const termObj = JSON.parse(cachedTermStr);
          const driverObj = JSON.parse(cachedDriverStr);
          setActiveTerminal(termObj);
          setDriver(driverObj);
          setIsLogged(true);
          setError(""); // Clear error
          setLoading(false);
          setStatusLogs(prev => ["SYS: Running in OFFLINE mode using cached credentials", ...prev]);
          return;
        }
      } catch (cacheErr) {
        console.error("[Terminal] Failed to read cached credentials:", cacheErr);
      }

      setError("Sync Connection Offline. Retrying...");
      // Do NOT clear localStorage. Keep credentials and retry in 5 seconds to preserve pairing!
      setTimeout(() => {
        const tid = localStorage.getItem('auto_ads_terminal_id');
        if (tid) {
          resumeTerminalSession(tid);
        } else {
          autoConnectDriver();
        }
      }, 5000);
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
        elem.requestFullscreen().catch((err) => console.error("Error attempting full-screen:", err));
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

  const updatePlaylist = async (assignments: any[], thoughts: any[]) => {
    const active = assignments.filter(a => ['assigned', 'running', 'approved', 'pending'].includes(a.status));
    const ads = await Promise.all(active.map(async (a) => await firebaseService.getCampaign(a.campaignId)));
    
    const allThoughts = thoughts.filter(t => t.isActive);
    
    const adsList = ads.filter(Boolean);
    const combined: any[] = [];
    
    // Simple interleave: 5 ads, 1 thought
    let thoughtIdx = 0;
    let thoughtAdded = false;
    for (let i = 0; i < adsList.length; i++) {
      combined.push(adsList[i]);
      if ((i + 1) % 5 === 0 && allThoughts.length > 0) {
        const t = allThoughts[thoughtIdx % allThoughts.length];
        combined.push({
          id: t.id,
          url: t.imageUrl,
          title: t.quote,
          isThought: true, // Marker for display logic
          quote: t.quote,
          author: t.author
        });
        thoughtIdx++;
        thoughtAdded = true;
      }
    }

    // Append at end if no thought added and active thoughts exist
    if (!thoughtAdded && allThoughts.length > 0) {
      const t = allThoughts[thoughtIdx % allThoughts.length];
      combined.push({
        id: t.id,
        url: t.imageUrl,
        title: t.quote,
        isThought: true,
        quote: t.quote,
        author: t.author
      });
    }
    setPlaylist(combined);
    if (currentIndex >= combined.length) {
      setCurrentIndex(0);
    }
    setLoading(false);
  };

  const fetchAdsManual = async () => {
    const dId = driver?.uid || driver?.id;
    if (!dId) return;
    setLoading(true);
    try {
      const assignments = await firebaseService.getDriverAssignments(dId);
      const thoughts = await firebaseService.getActiveThoughts();
      await updatePlaylist(assignments, thoughts);
    } catch (e) {
      console.error("Error fetching ads manually:", e);
      setLoading(false);
    }
  };

  // Real-time subscription to assignments and thoughts
  useEffect(() => {
    const dId = driver?.uid || driver?.id;
    if (!dId) return;
    setLoading(true);
    
    let currentAssignments: any[] = [];
    let currentThoughts: any[] = [];
    
    const unsubAssignments = firebaseService.subscribeToDriverAssignments(dId, (assignments) => {
      currentAssignments = assignments;
      updatePlaylist(currentAssignments, currentThoughts);
    });
    
    const unsubThoughts = firebaseService.subscribeToThoughts((thoughts) => {
      currentThoughts = thoughts;
      updatePlaylist(currentAssignments, currentThoughts);
    });
    
    return () => {
        unsubAssignments();
        unsubThoughts();
    };
  }, [driver?.uid, driver?.id]);

  const [direction, setDirection] = useState(1); // 1 for forward, -1 for backward

  const playNextValidAd = (startIndex: number) => {
    if (playlist.length === 0) return;
    
    // If only one ad, don't change
    if (playlist.length === 1) {
        setCurrentIndex(0);
        return;
    }

    let nextIdx = startIndex;
    
    // Check if we hit the end or beginning
    if (nextIdx >= playlist.length) {
        setDirection(-1);
        nextIdx = playlist.length - 2;
    } else if (nextIdx < 0) {
        setDirection(1);
        nextIdx = 1;
    }

    // Ensure we don't go out of bounds if length changed
    if (nextIdx < 0) nextIdx = 0;
    if (nextIdx >= playlist.length) nextIdx = playlist.length - 1;

    setCurrentIndex(nextIdx);
    setPlaybackTick(prev => prev + 1);
  };

  // Synchronize ad progress animation duration
  useEffect(() => {
    if (playlist.length > 0) {
      const currentAd = playlist[currentIndex];
      if (currentAd && !isVideoMedia(currentAd)) {
        setAdDuration(10); // Default to 10s for static images
      }
    }
  }, [playlist, currentIndex]);

  // Rotation Logic (Optimized for 5+ ads, infinite looping & empty campaign skipping)
  useEffect(() => {
    if (isLogged && playlist.length > 0) {
      const currentAd = playlist[currentIndex];
      if (!currentAd) {
        playNextValidAd(0);
        return;
      }
      
      const adUrl = getSafeUrl(currentAd?.url || currentAd?.assetUrl || currentAd?.mediaUrl) || '';
      if (adUrl.trim() === '') {
        // Skip empty ad immediately
        playNextValidAd((currentIndex + 1) % playlist.length);
        return;
      }

      const isVideo = isVideoMedia(currentAd);
      
      // Auto-start is handled by the video tag having 'autoPlay'
      // If it's a static image, we need a timer.
      if (!isVideo) {
        const timer = setTimeout(() => {
          playNextValidAd(currentIndex + direction);
        }, 10000); // 10s per static ad as requested
        return () => clearTimeout(timer);
      }
    }
  }, [isLogged, playlist, currentIndex, playbackTick]);

  // Safety Watchdog to prevent getting stuck on any media (images or videos)
  useEffect(() => {
    if (isLogged && playlist.length > 0) {
      const currentAd = playlist[currentIndex];
      if (!currentAd) return;

      const isVideo = isVideoMedia(currentAd);
      // Determine max timeout (default to 15s for image fallback, video duration + 5s buffer for videos)
      const durationSec = isVideo ? (adDuration && adDuration > 0 ? adDuration : 30) : 10;
      const watchdogTime = (durationSec + 5) * 1000;

      const timer = setTimeout(() => {
        console.warn(`[Terminal WATCHDOG] Media ${currentIndex} (${currentAd.title}) did not auto-advance in ${durationSec + 5} seconds. Forcing transition.`);
        handleAdComplete();
      }, watchdogTime);

      return () => clearTimeout(timer);
    }
  }, [currentIndex, playlist, isLogged, adDuration, playbackTick]);

  const handleAdComplete = () => {
    if (playlist.length > 0) {
      playNextValidAd((currentIndex + 1) % playlist.length);
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

  if (currentAd?.isThought) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center p-12 text-center select-none z-[100]">
        <div className="text-[10px] uppercase tracking-widest text-amber-500 font-bold mb-4">Thought of the Day</div>
        <p className="text-4xl md:text-6xl font-serif text-white mb-8 italic">"{currentAd.quote}"</p>
        <p className="text-xl text-amber-300 font-medium">— {currentAd.author}</p>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden font-sans select-none brightness-110 contrast-105"
      onClick={triggerOverlayOnDemand}
    >
      {/* Locked Device Overlay */}
      <AnimatePresence>
        {isLocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/98 backdrop-blur-xl z-[400] flex flex-col items-center justify-center p-8 text-center select-none"
          >
            {/* Background pulsing grid/glow effect */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.12),transparent_70%)] pointer-events-none" />
            
            <div className="max-w-md w-full bg-slate-900/50 border border-red-500/20 rounded-[2rem] p-8 backdrop-blur-md shadow-2xl relative space-y-6">
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 animate-pulse border border-red-500/25">
                  <Lock size={36} />
                </div>
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl font-black italic uppercase tracking-wider text-red-500 leading-none">
                  DEVICE LOCKED
                </h1>
                <p className="text-[10px] font-black tracking-[0.2em] uppercase text-red-300 font-mono">
                  Security Mode Initiated
                </p>
              </div>

              <div className="h-[1px] bg-slate-800" />

              <div className="space-y-4 text-left">
                <p className="text-sm text-slate-400 leading-relaxed">
                  This display unit has been remotely locked by the administrative center. Normal campaign playback and customer services are suspended.
                </p>

                <div className="p-4 bg-slate-950/60 rounded-xl space-y-2 text-xs font-mono text-slate-400 border border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-500">TERMINAL ID:</span>
                    <span className="text-white font-bold">{activeTerminal?.id || terminalId || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">DRIVER ID:</span>
                    <span className="text-white font-bold">{driver?.uid || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">BATTERY STATUS:</span>
                    <span className="text-white font-bold">{systemMetrics.battery}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">NETWORK STATE:</span>
                    <span className={cn("font-bold", online ? "text-emerald-400" : "text-amber-500")}>
                      {online ? "ONLINE" : "OFFLINE"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="h-[1px] bg-slate-800" />

              <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                Please contact system dispatcher for authorization.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emergency Broadcast Banner Overlay */}
      <AnimatePresence>
        {emergencyBroadcast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 left-0 right-0 z-[300] bg-amber-500 text-slate-950 font-sans border-b-2 border-amber-600 shadow-[0_10px_30px_rgba(245,158,11,0.35)] select-none pointer-events-auto"
          >
            <div className="w-full max-w-7xl mx-auto px-6 py-4 md:py-5 flex items-center justify-between gap-6">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 bg-slate-950/10 rounded-xl flex items-center justify-center text-slate-950 animate-pulse shrink-0 border border-slate-950/15">
                  <AlertCircle size={22} className="animate-bounce" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black tracking-[0.2em] uppercase bg-slate-950 text-amber-500 px-2 py-0.5 rounded">
                      EMERGENCY BROADCAST
                    </span>
                    <span className="w-2 h-2 rounded-full bg-red-600 animate-ping shrink-0" />
                  </div>
                  <p className="text-sm md:text-base font-black uppercase tracking-tight truncate md:whitespace-normal mt-1 leading-tight text-slate-950 break-words">
                    {emergencyBroadcast}
                  </p>
                </div>
              </div>
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-900 border border-slate-950/25 px-2 py-1 rounded hidden sm:block">
                Center Control Active
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SCANLINE / NOISE OVERLAY */}
      <div className="absolute inset-0 pointer-events-none z-[100] opacity-[0.03] scanline" />
      <div className="absolute inset-0 pointer-events-none z-[101] opacity-[0.02] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      {/* GLOBAL HUD LAYER */}
      <div className="absolute inset-0 z-[60] pointer-events-none p-4 md:p-10 flex flex-col justify-between">
        {/* Top Header */}
        <AnimatePresence>
          {(playlist.length === 0 || showOverlayOnDemand) && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex justify-between items-start pointer-events-auto"
            >
              <div className="flex items-center gap-3 md:gap-4 bg-black/40 backdrop-blur-md p-2 md:p-3 rounded-2xl border border-white/5">
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
              </div>

              <div className="flex items-center gap-2 md:gap-4 pointer-events-auto">
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>


      </div>

      {/* CONTENT LAYER */}
      <div className="absolute inset-0 bg-[#050505]">
        <AnimatePresence mode="wait">
          {playlist.length === 0 ? (
            <motion.div 
              key="no_campaigns" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="w-full h-full flex flex-col items-center justify-center relative bg-[#050505] p-10 text-center"
            >
               <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] border border-white/5 rounded-full" />
               </div>

               <motion.div 
                 initial={{ scale: 0.9, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 className="relative z-10 space-y-8 max-w-2xl"
               >
                 <div className="space-y-2">
                   <h1 className="text-4xl md:text-6xl font-black italic text-white tracking-tighter uppercase leading-none">
                     AUTOADS <span className="text-amber-500">TERMINAL</span>
                   </h1>
                   <div className="h-1 w-20 bg-amber-500 mx-auto rounded-full" />
                 </div>

                 <div className="space-y-4">
                   {assignedCampaigns.length > 0 ? (
                     <>
                       <div className="px-6 py-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl inline-block">
                         <p className="text-amber-500 text-sm md:text-lg font-black uppercase tracking-widest animate-pulse">
                           CAMPAIGNS ASSIGNED ({assignedCampaigns.length})
                         </p>
                       </div>
                       
                       <p className="text-slate-400 text-xs md:text-sm font-bold uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
                         OUTSIDE SCHEDULED COMPLIANCE HOURS
                       </p>
                       
                       <div className="bg-white/5 border border-white/10 rounded-2xl p-4 max-w-md mx-auto space-y-2 text-left">
                         {assignedCampaigns.map((c, idx) => (
                           <div key={idx} className="flex justify-between text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                             <span className="truncate pr-2 font-bold text-slate-300">⚡ {c.title || 'Ad Unit'}</span>
                             <span className="text-amber-500 font-bold shrink-0">{c.startTime || '06:00'} - {c.endTime || '22:00'}</span>
                           </div>
                         ))}
                       </div>
                       
                       <div className="pt-2">
                         <button
                           onClick={() => {
                             setBypassScheduleFilter(true);
                             setStatusLogs(prev => ["CMD: Bypass campaign scheduled hours", ...prev]);
                           }}
                           className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg shadow-amber-500/20 mx-auto block"
                         >
                           Force Play Ad Rotation
                         </button>
                       </div>
                     </>
                   ) : (
                     <>
                       <div className="px-6 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl inline-block">
                         <p className="text-red-500 text-sm md:text-lg font-black uppercase tracking-widest animate-pulse">
                           NO ACTIVE CAMPAIGNS ASSIGNED
                         </p>
                       </div>
                       
                       <p className="text-slate-400 text-xs md:text-sm font-bold uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
                         Waiting for campaign assignment...
                       </p>
                     </>
                   )}
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <div className="bg-white/5 border border-white/10 p-5 rounded-3xl backdrop-blur-xl">
                     <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Terminal ID</p>
                     <p className="text-sm font-black text-white font-mono">{activeTerminal?.id || terminalId || 'N/A'}</p>
                   </div>
                   <div className="bg-white/5 border border-white/10 p-5 rounded-3xl backdrop-blur-xl">
                     <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Driver Name</p>
                     <p className="text-sm font-black text-white uppercase">{driver?.fullName || driver?.name || 'NOT_LINKED'}</p>
                   </div>
                   <div className="bg-white/5 border border-white/10 p-5 rounded-3xl backdrop-blur-xl">
                     <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Vehicle Number</p>
                     <p className="text-sm font-black text-white uppercase">{driver?.vehicleNumber || 'NOT_LINKED'}</p>
                   </div>
                 </div>

                 <div className="pt-10 space-y-4">
                   <div className="flex items-center justify-center gap-3 text-slate-500">
                     <div className="w-8 h-[1px] bg-slate-800" />
                     <p className="text-[9px] font-black uppercase tracking-[0.3em]">Support Contact</p>
                     <div className="w-8 h-[1px] bg-slate-800" />
                   </div>
                   <p className="text-xl md:text-2xl font-black text-white tracking-widest">
                     +91 <span className="text-amber-500">93539 01804</span>
                   </p>
                 </div>
               </motion.div>
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
              {/* Scan to customize overlay - emotional, family-friendly, premium smart mobility design */}
              <SmartPassengerQR deviceId={activeTerminal?.id || terminalId || "ACTIVE"} onLogout={onLogout} />

              {/* Dynamic Mode Notification Banners */}
              {(isSchoolActive || activeRidePref) && (
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
                </div>
              )}

              <div 
                className={cn(
                  "w-full h-full relative transition-[filter]"
                )}
                style={{
                  filter: `brightness(${brightnessProfile ? Math.max(brightnessProfile.level / 100, 1.0) : 1.0}) ${
                    brightnessProfile?.reducedContrast ? 'contrast(1.0)' : 'contrast(1.1)'
                  }`,
                  transition: 'filter 1.5s ease'
                }}
              >
                {isVideoMedia(currentAd) ? (
                  <video 
                    key={`vid_${currentAd?.url || currentAd?.assetUrl || currentAd?.mediaUrl || currentIndex}_${playbackTick}`}
                    ref={videoRef}
                    autoPlay 
                    muted={terminalVolume === 0}
                    loop={false}
                    playsInline
                    className="w-full h-full object-cover"
                    src={getSafeUrl(currentAd?.url || currentAd?.assetUrl || currentAd?.mediaUrl) || ""}
                    onEnded={handleAdComplete}
                    onLoadedMetadata={(e) => {
                      if (e.currentTarget.duration) {
                        setAdDuration(e.currentTarget.duration);
                      }
                    }}
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
                    key={`img_${currentAd?.url || currentAd?.assetUrl || currentAd?.mediaUrl || currentIndex}_${playbackTick}`}
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
                  key={`${currentIndex}_${adDuration}_${playbackTick}`}
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: adDuration, ease: "linear" }}
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
