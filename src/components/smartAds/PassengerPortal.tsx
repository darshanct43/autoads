import React, { useState, useEffect } from 'react';
import { firebaseService } from '../../services/firebaseService';
import { Shield, Sparkles, Check, VolumeX, Baby, Users, Ban, Moon, Heart, Clock, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PassengerPortalProps {
  deviceIdFromUrl?: string;
  onClose?: () => void;
}

const LANGUAGES = {
  EN: {
    title: "EcoDrive Premium",
    subtitle: "Improve Your Travel Experience",
    welcomeTitle: "Travel Comfortably & Safely",
    welcomeSub: "Optimize the vehicle screen for a perfect, safe family commute.",
    kidsMode: "Kids Mode",
    kidsModeSub: "👶 Clean, educational, kid-friendly ecosystem",
    schoolMode: "School Trip",
    schoolModeSub: "🏫 Special curated educational ads",
    familyMode: "Family Mode",
    familyModeSub: "👨‍👩‍👧 Relax with family-friendly content",
    quietRide: "Quiet Ride",
    quietRideSub: "🔇 Reduce sound levels and relax during transit",
    nightRide: "Night Comfort",
    nightRideSub: "🌙 Eye-friendly dimmed screen for evening commutes",
    activeStatus: "Safe Ride Activated!",
    resetButton: "Reset to Standard Ride",
    expireNotice: "Settings revert automatically at the end of the ride",
    invalidUrl: "Auto Code Required",
    invalidUrlSub: "Please scan a physical QR code inside an AutoAds vehicle to link your settings.",
    backToApp: "Back to Home",
    connecting: "Connecting to vehicle...",
    syncing: "Optimizing ride environment...",
    connectedHeader: "Uplink Secure"
  },
  KN: {
    title: "EcoDrive ಪ್ರೀಮಿಯಂ",
    subtitle: "ನಿಮ್ಮ ಪ್ರಯಾಣದ ಸುಖವನ್ನು ಹೆಚ್ಚಿಸಿ",
    welcomeTitle: "ಆರಾಮದಾಯಕ ಮತ್ತು ಸುರಕ್ಷಿತ ಪ್ರಯಾಣ",
    welcomeSub: "ನಿಮ್ಮ ಕುಟುಂಬದ ಪ್ರಯಾಣದ ಸುಖಕ್ಕಾಗಿ ವಾಹನದ ಸ್ಕ್ರೀನ್ ಸೆಟ್ಟಿಂಗ್ಸ್ ಬದಲಾಯಿಸಿ.",
    kidsMode: "ಕಿಡ್ಸ್ ಮೋಡ್",
    kidsModeSub: "👶 ಮಕ್ಕಳಿಗೆ ಸುರಕ್ಷಿತ, ಕಲಿಯುವ ಪರಿಸರ",
    schoolMode: "ಸ್ಕೂಲ್ ಟ್ರಿಪ್",
    schoolModeSub: "🏫 ವಿಶೇಷ ಕ್ಯುರೇಟೆಡ್ ಶೈಕ್ಷಣಿಕ ಜಾಹೀರಾತುಗಳು",
    familyMode: "ಫ್ಯಾಮಿಲಿ ಮೋಡ್",
    familyModeSub: "👨‍👩‍👧 ಕುಟುಂಬದವರೊಂದಿಗೆ ಆರಾಮದಾಯಕ ಮತ್ತು ಸುರಕ್ಷಿತ ವೀಕ್ಷಣೆ",
    quietRide: "ಕ್ವಯಟ್ ರೈಡ್",
    quietRideSub: "🔇 ವಾಲ್ಯೂಮ್ ಕಡಿಮೆ ಮಾಡಿ ನೆಮ್ಮದಿಯಿಂದ ದಾರಿ ಸಾಗಿ",
    nightRide: "ನೈಟ್ ಕಂಫರ್ಟ್",
    nightRideSub: "🌙 ಕಣ್ಣಿನ ರಕ್ಷಣೆಗಾಗಿ ಮೃದುವಾದ ಬೆಳಕು",
    activeStatus: "ಕ್ಯಾಬಿನ್ ಮೋಡ್ ಯಶಸ್ವಿಯಾಗಿ ಆಕ್ಟಿವೇಟ್ ಆಗಿದೆ!",
    resetButton: "ಸಾಮಾನ್ಯ ಪ್ರಯಾಣಕ್ಕೆ ಮರಳಿ",
    expireNotice: "ರೈಡ್ ಮುಗಿದ ನಂತರ ತಾನಾಗಿಯೇ ಹಳೆಯ ಸ್ಥಿತಿಗೆ ಮರಳುತ್ತದೆ",
    invalidUrl: "ಕ್ಯೂಆರ್ ಕೋಡ್ ಅತ್ಯಗತ್ಯ",
    invalidUrlSub: "ದಯವಿಟ್ಟು ನಿಮ್ಮ ವಾಹನದ ಐಡಿ ಲಿಂಕ್ ಮಾಡಲು ವಾಹನದಲ್ಲಿರುವ ಕ್ಯೂಆರ್ ಕೋಡ್ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ.",
    backToApp: "ಮುಖಪುಟಕ್ಕೆ ಮರಳಿ",
    connecting: "ಸಂಪರ್ಕಿಸಲಾಗುತ್ತಿದೆ...",
    syncing: "ವಾಹನದ ಸ್ಕ್ರೀನ್ ಅಪ್‌ಡೇಟ್ ಆಗುತ್ತಿದೆ...",
    connectedHeader: "ಲಿಂಕ್ ಸುರಕ್ಷಿತವಾಗಿದೆ"
  },
  HI: {
    title: "EcoDrive प्रीमियम",
    subtitle: "अपनी यात्रा का आनंद बढ़ाएं",
    welcomeTitle: "सुखद एवं सुरक्षित सफर",
    welcomeSub: "अपने परिवार के आरामदायक सफर के लिए स्क्रीन को अनुकूलित करें।",
    kidsMode: "किड्स मोड",
    kidsModeSub: "👶 बच्चों के लिए स्वच्छ, सुरक्षित और उपयोगी मनोरंजन",
    schoolMode: "स्कूल ट्रिप",
    schoolModeSub: "🏫 विशेष क्यूरेटेड शैक्षिक विज्ञापन",
    familyMode: "फैमिली मोड",
    familyModeSub: "👨‍👩‍👧 परिवार के साथ सुखद और सुरक्षित मनोरंजन",
    quietRide: "शांत सवारी",
    quietRideSub: "🔇 डिब्बे की आवाज धीमी करें और तनावमुक्त सफर करें",
    nightRide: "नाइट मोड",
    nightRideSub: "🌙 आंखों की सुरक्षा के लिए हल्की स्क्रीन चमक",
    activeStatus: "सवारी सेटिंग तुरंत बदल दी गई है!",
    resetButton: "सामान्य यात्रा पर लौटें",
    expireNotice: "सवारी पूरी होने पर सेटिंग्स अपने आप रीसेट हो जाएंगी",
    invalidUrl: "क्यूआर स्कैन आवश्यक है",
    invalidUrlSub: "कृपया ऑटो के अंदर लगे असली क्यूआर कोड को फिर से स्कैन करें।",
    backToApp: "मुख्य पृष्ठ पर जाएं",
    connecting: "गाड़ी के स्क्रीन से जुड़ रहा है...",
    syncing: "यात्रा सुखद की जा रही है...",
    connectedHeader: "सुरक्षित लिंक संस्थापित"
  }
};

export default function PassengerPortal({ deviceIdFromUrl, onClose }: PassengerPortalProps) {
  const [lang, setLang] = useState<'EN' | 'KN' | 'HI'>('EN');
  const [deviceId, setDeviceId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  
  // Real-time synchronization state tracker
  const [activeOverrideMode, setActiveOverrideMode] = useState<string>('NORMAL');
  const [localNightMode, setLocalNightMode] = useState<boolean>(false);

  // New interactive confirmation state tracks
  const [tempSelection, setTempSelection] = useState<'KIDS' | 'SCHOOL' | 'FAMILY' | 'QUIET' | 'NIGHT' | null>(null);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [confirmedMode, setConfirmedMode] = useState<'KIDS' | 'SCHOOL' | 'FAMILY' | 'QUIET' | 'NIGHT' | null>(null);

  // Extract linked device ID from URL params or location hashes
  useEffect(() => {
    if (deviceIdFromUrl) {
      setDeviceId(deviceIdFromUrl);
      return;
    }

    const currentHash = window.location.hash;
    const searchParams = new URLSearchParams(window.location.search);
    
    if (currentHash.includes('?')) {
      const qStr = currentHash.split('?')[1];
      const hashParams = new URLSearchParams(qStr);
      const devId = hashParams.get('deviceId') || hashParams.get('driverId') || hashParams.get('terminalId');
      if (devId) setDeviceId(devId);
    } else {
      const devId = searchParams.get('deviceId') || searchParams.get('driverId') || searchParams.get('terminalId');
      if (devId) setDeviceId(devId);
    }
  }, [deviceIdFromUrl]);

  // Listen for the active preferences from Firestore to mirror them in real-time in the passenger's hands
  useEffect(() => {
    if (!deviceId) return;
    const unsub = firebaseService.subscribeToRidePreference(deviceId, (pref) => {
      if (pref) {
        const expiresAt = pref.expiresAt ? new Date(pref.expiresAt) : null;
        if (!expiresAt || expiresAt > new Date()) {
          setActiveOverrideMode(pref.driverOverrideMode || 'CUSTOM');
          setLocalNightMode(!!pref.nightMode);
        } else {
          setActiveOverrideMode('NORMAL');
          setLocalNightMode(false);
        }
      } else {
        setActiveOverrideMode('NORMAL');
        setLocalNightMode(false);
      }
    });
    return () => unsub();
  }, [deviceId]);

  // One-tap direct execution helper. Completes and updates Firestore instantly in < 1 sec
  const handleSelectCabinMode = async (mode: 'KIDS' | 'SCHOOL' | 'FAMILY' | 'QUIET' | 'NIGHT' | 'RESET') => {
    if (!deviceId) return;
    setIsSubmitting(true);
    setStatusMessage(null);

    if (mode === 'RESET') {
      try {
        await firebaseService.clearRidePreference(deviceId);
        setActiveOverrideMode('NORMAL');
        setLocalNightMode(false);
        setTempSelection(null);
        setStatusMessage("Reverted to default cabin mode.");
        setTimeout(() => setStatusMessage(null), 3000);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const now = new Date();
    const expires = new Date(now.getTime() + 15 * 60 * 1000); // Expiries automatically after 15 minutes

    let payload: any = {
      rideId: `ride_${Date.now()}`,
      deviceId,
      childrenPresent: false,
      familyMode: false,
      muteAds: false,
      blockedCategories: [],
      nightMode: false,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      driverOverrideMode: 'NORMAL'
    };

    if (mode === 'KIDS') {
      payload.childrenPresent = true;
      payload.familyMode = true;
      payload.blockedCategories = ['alcohol', 'betting', 'gambling', 'political'];
      payload.driverOverrideMode = 'CHILDREN';
    } else if (mode === 'SCHOOL') {
      payload.childrenPresent = true;
      payload.familyMode = true;
      payload.blockedCategories = ['alcohol', 'gambling', 'political', 'dating', 'adult'];
      payload.driverOverrideMode = 'SCHOOL_TRIP';
    } else if (mode === 'FAMILY') {
      payload.familyMode = true;
      payload.blockedCategories = ['alcohol', 'political'];
      payload.driverOverrideMode = 'FAMILY';
    } else if (mode === 'QUIET') {
      payload.muteAds = true;
      payload.driverOverrideMode = 'SILENT';
    } else if (mode === 'NIGHT') {
      payload.nightMode = true;
      payload.muteAds = true;
      payload.driverOverrideMode = 'SILENT';
    }

    try {
      await firebaseService.saveRidePreference(payload);
      setActiveOverrideMode(mode === 'KIDS' ? 'CHILDREN' : mode === 'QUIET' ? 'SILENT' : mode);
      setLocalNightMode(mode === 'NIGHT');
      setStatusMessage(t.activeStatus);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmSafeRide = async () => {
    if (!tempSelection) return;
    const selected = tempSelection;
    setConfirmedMode(selected);
    setShowSuccess(true);
    // Submit in background
    await handleSelectCabinMode(selected);
    setTempSelection(null);
    // Display the gorgeous toast/frame for 2.5 seconds
    setTimeout(() => {
      setShowSuccess(false);
    }, 2800);
  };

  const t = LANGUAGES[lang];

  // Helper flags matching either temporary selections or currently active firebase profiles
  const isKidsSelected = tempSelection === 'KIDS' || (tempSelection === null && activeOverrideMode === 'CHILDREN');
  const isSchoolSelected = tempSelection === 'SCHOOL' || (tempSelection === null && activeOverrideMode === 'SCHOOL');
  const isFamilySelected = tempSelection === 'FAMILY' || (tempSelection === null && activeOverrideMode === 'FAMILY');
  const isQuietSelected = tempSelection === 'QUIET' || (tempSelection === null && activeOverrideMode === 'SILENT');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-slate-950 p-4 sm:p-6 justify-between select-none pb-28">
      
      {/* Upper Brand bar */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between mb-5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-orange-500/20">
            <Sparkles size={16} className="animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div>
            <span className="text-xs font-black tracking-widest uppercase leading-none block text-slate-200">{t.title}</span>
            <span className="text-[7px] text-slate-500 uppercase tracking-widest">{t.subtitle}</span>
          </div>
        </div>

        {/* Translation Tabs */}
        <div className="flex bg-slate-900 border border-white/5 rounded-xl p-0.5 gap-1">
          {(['EN', 'HI', 'KN'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1 text-[9px] font-black uppercase rounded-lg transition-all ${lang === l ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!deviceId ? (
          <motion.div 
            key="invalid-url"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-6 my-auto"
          >
            <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-[2rem] flex items-center justify-center animate-pulse border border-amber-500/25">
              <Shield size={36} />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-black text-white uppercase tracking-wider">{t.invalidUrl}</h1>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                {t.invalidUrlSub}
              </p>
            </div>
            {onClose && (
              <button 
                onClick={onClose}
                className="w-full py-4 bg-slate-900 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-850 transition-all text-slate-300"
              >
                {t.backToApp}
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="preferences-workspace"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 w-full max-w-md mx-auto flex flex-col justify-between space-y-6"
          >
            {/* Title Section */}
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-black text-white tracking-tight leading-none mt-2">
                {t.welcomeTitle}
              </h2>
              <p className="text-[11px] font-medium text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                {t.welcomeSub}
              </p>
              
              <div className="inline-flex items-center gap-1.5 bg-slate-900/80 border border-white/5 px-3.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider text-green-400 mt-3">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                <span>{t.connectedHeader}: Auto-{(deviceId).slice(-6).toUpperCase()}</span>
              </div>
            </div>

            {/* BIG ACTION BUTTONS */}
            <div className="grid grid-cols-1 gap-3.5 flex-1 py-1 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin">
              
              {/* Kids Mode Card */}
              <button
                onClick={() => setTempSelection('KIDS')}
                className={`group relative p-5 rounded-3xl border text-left transition-all overflow-hidden ${
                  isKidsSelected 
                    ? 'bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-slate-900/80 border-amber-400 shadow-xl shadow-amber-500/5 scale-[1.02] translate-y-[-1px]' 
                    : 'bg-slate-900/45 border-white/5 hover:border-white/15'
                }`}
              >
                {/* Visual selected highlight status */}
                {isKidsSelected && (
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-orange-500 text-slate-950 text-[9px] font-black uppercase tracking-widest px-3.5 py-1 rounded-bl-xl flex items-center gap-1.5 shadow-md">
                    <span className="w-1.5 h-1.5 bg-slate-950 rounded-full animate-ping" />
                    <span>SELECTED</span>
                  </div>
                )}
                
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-active:scale-95 ${
                    isKidsSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}>
                    <Baby size={22} className="shrink-0" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">{t.kidsMode}</h3>
                    <p className="text-[10px] font-medium text-slate-400 mt-0.5 leading-tight">{t.kidsModeSub}</p>
                  </div>
                </div>
              </button>

              {/* School Trip Card */}
              <button
                onClick={() => setTempSelection('SCHOOL')}
                className={`group relative p-5 rounded-3xl border text-left transition-all overflow-hidden ${
                  isSchoolSelected 
                    ? 'bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-slate-900/80 border-amber-400 shadow-xl shadow-amber-500/5 scale-[1.02] translate-y-[-1px]' 
                    : 'bg-slate-900/45 border-white/5 hover:border-white/15'
                }`}
              >
                {isSchoolSelected && (
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-orange-500 text-slate-950 text-[9px] font-black uppercase tracking-widest px-3.5 py-1 rounded-bl-xl flex items-center gap-1.5 shadow-md">
                    <span className="w-1.5 h-1.5 bg-slate-950 rounded-full animate-ping" />
                    <span>SELECTED</span>
                  </div>
                )}
                
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-active:scale-95 ${
                    isSchoolSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}>
                    <School size={22} className="shrink-0" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">{t.schoolMode}</h3>
                    <p className="text-[10px] font-medium text-slate-400 mt-0.5 leading-tight">{t.schoolModeSub}</p>
                  </div>
                </div>
              </button>

              {/* Family Mode Card */}
              <button
                onClick={() => setTempSelection('FAMILY')}
                className={`group relative p-5 rounded-3xl border text-left transition-all overflow-hidden ${
                  isFamilySelected 
                    ? 'bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-slate-900/80 border-amber-400 shadow-xl shadow-amber-500/5 scale-[1.02] translate-y-[-1px]' 
                    : 'bg-slate-900/45 border-white/5 hover:border-white/15'
                }`}
              >
                {isFamilySelected && (
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-orange-500 text-slate-950 text-[9px] font-black uppercase tracking-widest px-3.5 py-1 rounded-bl-xl flex items-center gap-1.5 shadow-md">
                    <span className="w-1.5 h-1.5 bg-slate-950 rounded-full animate-ping" />
                    <span>SELECTED</span>
                  </div>
                )}
                
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-active:scale-95 ${
                    isFamilySelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}>
                    <Users size={22} className="shrink-0" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">{t.familyMode}</h3>
                    <p className="text-[10px] font-medium text-slate-400 mt-0.5 leading-tight">{t.familyModeSub}</p>
                  </div>
                </div>
              </button>

              {/* Quiet Ride Card */}
              <button
                onClick={() => setTempSelection('QUIET')}
                className={`group relative p-5 rounded-3xl border text-left transition-all overflow-hidden ${
                  isQuietSelected 
                    ? 'bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-slate-900/80 border-amber-400 shadow-xl shadow-amber-500/5 scale-[1.02] translate-y-[-1px]' 
                    : 'bg-slate-900/45 border-white/5 hover:border-white/15'
                }`}
              >
                {isQuietSelected && (
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-orange-500 text-slate-950 text-[9px] font-black uppercase tracking-widest px-3.5 py-1 rounded-bl-xl flex items-center gap-1.5 shadow-md">
                    <span className="w-1.5 h-1.5 bg-slate-950 rounded-full animate-ping" />
                    <span>SELECTED</span>
                  </div>
                )}
                
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-active:scale-95 ${
                    isQuietSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}>
                    <VolumeX size={22} className="shrink-0" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">{t.quietRide}</h3>
                    <p className="text-[10px] font-medium text-slate-400 mt-0.5 leading-tight">{t.quietRideSub}</p>
                  </div>
                </div>
              </button>

              {/* Night Comfort Card */}
              <button
                onClick={() => setTempSelection('NIGHT')}
                className={`group relative p-5 rounded-3xl border text-left transition-all overflow-hidden ${
                  isNightSelected 
                    ? 'bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-slate-900/80 border-amber-400 shadow-xl shadow-amber-500/5 scale-[1.02] translate-y-[-1px]' 
                    : 'bg-slate-900/45 border-white/5 hover:border-white/15'
                }`}
              >
                {isNightSelected && (
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-orange-500 text-slate-950 text-[9px] font-black uppercase tracking-widest px-3.5 py-1 rounded-bl-xl flex items-center gap-1.5 shadow-md">
                    <span className="w-1.5 h-1.5 bg-slate-950 rounded-full animate-ping" />
                    <span>SELECTED</span>
                  </div>
                )}
                
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-active:scale-95 ${
                    isNightSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}>
                    <Moon size={22} className="shrink-0" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">{t.nightRide}</h3>
                    <p className="text-[10px] font-medium text-slate-400 mt-0.5 leading-tight">{t.nightRideSub}</p>
                  </div>
                </div>
              </button>

            </div>

            {/* Bottom Actions section */}
            <div className="shrink-0 pt-2 space-y-4">
              <AnimatePresence mode="wait">
                {statusMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3 bg-green-500/10 border border-green-500/25 text-green-400 text-[10px] font-black uppercase tracking-widest text-center rounded-2xl shadow-lg"
                  >
                    🚀 {statusMessage}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleSelectCabinMode('RESET')}
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-center flex items-center justify-center gap-2 shadow-inner active:scale-95"
                >
                  <RefreshCw size={12} className={isSubmitting ? "animate-spin" : ""} />
                  <span>{t.resetButton}</span>
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[8px] font-bold uppercase tracking-widest text-slate-500 text-center leading-none py-1">
                <Clock size={10} className="text-slate-600" />
                <span>{t.expireNotice}</span>
              </div>
            </div>
            
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONFIRMATION OVERLAY STICKY BAR */}
      <AnimatePresence>
        {tempSelection && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-5 bg-slate-900/95 backdrop-blur-lg border-t border-white/10 shadow-[0_-12px_40px_rgba(0,0,0,0.5)] flex items-center justify-between max-w-md mx-auto rounded-t-[2.2rem]"
          >
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-extrabold text-amber-500 tracking-wider uppercase leading-none mb-1">Comfort Preference</span>
              <span className="text-xs font-black text-white tracking-tight flex items-center gap-1">
                {tempSelection === 'KIDS' && "👶 Kids Mode"}
                {tempSelection === 'SCHOOL' && "🏫 School Trip"}
                {tempSelection === 'FAMILY' && "👨‍👩‍👧 Family Mode"}
                {tempSelection === 'QUIET' && "🔇 Quiet Ride"}
                <span className="text-slate-400 text-[10px] font-medium leading-none ml-1">selected</span>
              </span>
            </div>

            <button
              onClick={handleConfirmSafeRide}
              disabled={isSubmitting}
              className="px-5 py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 font-black text-[10px] uppercase tracking-widest text-slate-950 rounded-2xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <span>CONFIRM SAFE RIDE</span>
              <Check size={12} strokeWidth={4} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULL SCREEN SUCCESS POPUP */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none"
          >
            {/* Ambient glowing circles */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 bg-gradient-to-tr from-amber-500/10 to-orange-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-72 h-72 bg-gradient-to-tr from-green-500/10 to-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative space-y-7 flex flex-col items-center max-w-sm">
              <motion.div
                initial={{ scale: 0.4, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                className="w-24 h-24 bg-gradient-to-tr from-green-500 to-emerald-400 text-slate-950 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-green-500/20"
              >
                <Check size={48} strokeWidth={4} className="text-slate-950" />
              </motion.div>

              <div className="space-y-3">
                <h2 className="text-3xl font-black text-white tracking-tight uppercase">Safe Ride Activated</h2>
                <p className="text-sm font-black text-amber-400 tracking-wide">
                  {confirmedMode === 'KIDS' && "Kid-friendly content is now active"}
                  {confirmedMode === 'SCHOOL' && "School-safe content is now active"}
                  {confirmedMode === 'FAMILY' && "Family-safe viewing enabled"}
                  {confirmedMode === 'QUIET' && "Reduced sound mode enabled"}
                </p>
              </div>

              <div className="pt-2">
                <div className="flex items-center gap-2 bg-white/5 border border-white/5 px-4.5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest text-green-400 shadow-md">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span>Synchronizing vehicle screen...</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
