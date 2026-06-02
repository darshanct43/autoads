import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Film, Utensils, AlertTriangle, Heart, QrCode } from 'lucide-react';
import { firebaseService } from '@/services/firebaseService';

export default function StaticImpactVideos() {
  const [urls, setUrls] = useState<Record<string, string>>({
    qr: "/uploads/showcase_qr_showcase.mp4",
    couples: "/uploads/showcase_couples_showcase.mp4",
    food: "/uploads/showcase_food_showcase.mp4",
    awareness: "/uploads/showcase_awareness_showcase.mp4",
    film: "/uploads/showcase_film_showcase.mp4"
  });
  const [activeTab, setActiveTab] = useState<string>('qr');
  const [isNoteExpanded, setIsNoteExpanded] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastErrorTimeRef = useRef<number>(0);

  // Sync back-end URLs in the background to ensure consistency
  useEffect(() => {
    let active = true;
    const fetchVideos = async () => {
      try {
        const data = await firebaseService.getShowcaseVideos();
        if (active && data) {
          const updatedUrls = { ...urls };
          let changed = false;
          for (const key of Object.keys(urls)) {
            if (data[key] && data[key] !== urls[key]) {
              updatedUrls[key] = data[key];
              changed = true;
            }
          }
          if (changed) {
            setUrls(updatedUrls);
            console.log("[StaticImpactVideos] Sync Showcase URLs:", updatedUrls);
          }
        }
      } catch (err) {
        console.error("[StaticImpactVideos] Background sync failed", err);
      }
    };
    fetchVideos();
    return () => { active = false; };
  }, []);

  const impactCategories = useMemo(() => [
    {
      id: 'qr',
      title: "QR Campaigns",
      shortDesc: "Instant interaction and conversion",
      icon: <QrCode className="w-5 h-5 text-orange-500" />
    },
    {
      id: 'couples',
      title: "Couples & Families",
      shortDesc: "Creates emotional engagement",
      icon: <Heart className="w-5 h-5 text-orange-500" />
    },
    {
      id: 'food',
      title: "Food Ads",
      shortDesc: "Turns hunger into instant visits",
      icon: <Utensils className="w-5 h-5 text-orange-500" />
    },
    {
      id: 'awareness',
      title: "Public Awareness",
      shortDesc: "Helps society through smart alerts",
      icon: <AlertTriangle className="w-5 h-5 text-orange-500" />
    },
    {
      id: 'film',
      title: "Film Promotion",
      shortDesc: "Converts excitement into ticket sales",
      icon: <Film className="w-5 h-5 text-orange-500" />
    }
  ], []);

  const currentVideo = useMemo(() => {
    const matchedCategory = impactCategories.find(c => c.id === activeTab);
    return {
      url: urls[activeTab] || `/uploads/${activeTab}_showcase.mp4`,
      title: matchedCategory?.title || activeTab
    };
  }, [activeTab, urls, impactCategories]);

  // Log active state changes
  useEffect(() => {
    if (currentVideo.url) {
      console.log("Playing:", currentVideo.title);
    }
  }, [currentVideo]);

  const playNextVideo = (isError: boolean = false) => {
    setActiveTab(current => {
      const currentIndex = impactCategories.findIndex(c => c.id === current);
      const nextIndex = (currentIndex + 1) % impactCategories.length;
      console.log("Current Video:", currentIndex);
      if (isError) {
        console.log("Video Error");
      } else {
        console.log("Video Ended");
      }
      console.log("Next Video:", nextIndex);
      return impactCategories[nextIndex].id;
    });
  };

  const handleEnded = () => {
    playNextVideo(false);
  };

  const handleError = () => {
    const now = Date.now();
    // Prevent infinite rapid failure loop if network/source gets interrupted
    if (now - lastErrorTimeRef.current < 500) {
      console.log("Video Error (Throttled)");
      return;
    }
    lastErrorTimeRef.current = now;
    playNextVideo(true);
  };

  // Robust play execution on active item change
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentVideo.url) return;

    let isSubscribed = true;

    const startPlayback = async () => {
      if (!isSubscribed) return;
      try {
        video.muted = true;
        await video.play();
      } catch (error) {
        console.log("[StaticImpactVideos] Autoplay action delayed or blocked. Ready on user interaction.", error);
      }
    };

    video.addEventListener('canplay', startPlayback, { once: true });

    // Force src switch and reload
    video.src = currentVideo.url;
    video.load();

    return () => {
      isSubscribed = false;
      video.removeEventListener('canplay', startPlayback);
    };
  }, [currentVideo.url]);

  return (
    <section className="bg-black text-white py-6 md:py-12 px-2 sm:px-4 md:px-8 flex flex-col items-center justify-center w-full min-h-[80vh] relative overflow-hidden">
      
      {/* Background preloader stream to cache all showcase videos globally in browser engine */}
      <div className="hidden" aria-hidden="true">
        {Object.entries(urls).map(([key, url]) => (
          url ? <video key={key} src={url} preload="auto" muted style={{ display: 'none' }} /> : null
        ))}
      </div>

      <div className="max-w-7xl w-full flex flex-col items-center justify-center text-center z-10 relative">
        <h2 className="text-2xl md:text-5xl lg:text-5xl font-black uppercase tracking-tight mb-2 md:mb-4 text-white">
          AUTO ADS IMPACT
        </h2>
        
        <p className="text-xs md:text-base text-slate-400 font-medium max-w-3xl leading-relaxed mb-6 md:mb-10 mx-auto px-4">
          See how Auto Ads captures attention, creates awareness, drives engagement, and delivers real-world advertising impact across the city.
        </p>

        {/* 16:9 Auto Rickshaw Driver's Seat Back Physical mounting Frame */}
        <div className="relative w-[95%] md:w-[85%] lg:w-[88%] aspect-[16/10] sm:aspect-video rounded-2xl md:rounded-[36px] bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-700/80 md:border-4 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] overflow-hidden flex items-center justify-center p-1 sm:p-2.5 md:p-5">
          
          {/* Driver's Seat Back Padded Leather Texture Backdrop with quilting lines */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#181818] via-[#121212] to-[#0a0a0a] rounded-xl sm:rounded-[32px] overflow-hidden flex flex-col justify-between p-4 z-0 border border-neutral-800">
            {/* Horizontal quilting lines typical of auto rickshaw driver seats */}
            <div className="absolute inset-x-0 h-full flex flex-col justify-around py-4 opacity-35 pointer-events-none">
              <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-neutral-700 to-transparent shadow-sm" />
              <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-neutral-700 to-transparent shadow-sm" />
              <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-neutral-700 to-transparent shadow-sm" />
            </div>
            {/* Classy stitch accents on the leather for hardware feel */}
            <div className="absolute inset-0 opacity-[0.05] bg-neutral-950 pointer-events-none" 
                 style={{ 
                   backgroundImage: `radial-gradient(#f97316 1px, transparent 1px), radial-gradient(#f97316 1px, #121212 1px)`,
                   backgroundSize: '30px 30px',
                   backgroundPosition: '0 0, 15px 15px'
                 }} 
            />
          </div>

          {/* Heavy Duty Passenger-Facing Steel Bracket Mounting Rig */}
          <div className="absolute top-[3%] left-[50%] -translate-x-[50%] w-[80px] sm:w-[140px] h-[6px] sm:h-[12px] bg-gradient-to-r from-neutral-800 via-neutral-500 to-neutral-800 rounded-lg border border-neutral-600 shadow-md opacity-90 z-20" />

          {/* Heavy Duty Passenger-Facing Tablet Bracket Mounting Rig */}
          <div className="relative z-10 w-full h-full aspect-[16/10] sm:aspect-video rounded-xl sm:rounded-[24px] bg-neutral-900 border border-neutral-800/90 sm:border-4 shadow-[0_15px_35px_rgba(0,0,0,0.85)] p-[3px] md:p-[10px] flex flex-col justify-between">
            
            {/* Tablet Outer Bezel & Physical Hardware Accents */}
            <div className="w-full h-full flex flex-col rounded-lg sm:rounded-[16px] bg-black overflow-hidden relative border border-neutral-700/60 shadow-inner">
              
              {/* Top Bezel: Camera, Mic, and active LED status indicator */}
              <div className="absolute top-0 inset-x-0 h-3 md:h-6 bg-neutral-950 flex items-center justify-between px-2 md:px-4 z-20 border-b border-neutral-900">
                <div className="flex items-center gap-1">
                  <span className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                  <span className="text-[5px] md:text-[8px] font-bold text-emerald-500 uppercase tracking-widest">LIVE TRANSIT STREAM</span>
                </div>
                {/* Simulated Lens */}
                <div className="w-1 md:w-2 h-1 md:h-2 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                  <div className="w-0.5 h-0.5 rounded-full bg-blue-600/40" />
                </div>
                <div>
                  <span className="text-[5px] md:text-[8px] font-black text-neutral-500 uppercase tracking-widest font-mono">UNIT #09-B</span>
                </div>
              </div>

              {/* Precise 16:9 Active Video Screen Block with minimized vertical padding to boost display area */}
              <div className="w-full h-full pt-3 md:pt-6 pb-3 md:pb-6 bg-[#010101] flex items-center justify-center relative">
                <video
                  ref={videoRef}
                  controls
                  autoPlay
                  muted
                  playsInline
                  preload="auto"
                  className="w-full h-full object-contain"
                  style={{ background: "#000" }}
                  onEnded={handleEnded}
                  onError={handleError}
                />
              </div>

              {/* Bottom Bezel: Hardware Brand Label */}
              <div className="absolute bottom-0 inset-x-0 h-3 md:h-6 bg-neutral-950 flex items-center justify-center z-20 border-t border-neutral-900">
                <div className="text-[6px] md:text-[10px] font-black tracking-[0.4em] text-neutral-400 uppercase italic font-sans scale-90 sm:scale-100">
                  AUTO ADS HD DISPLAY
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Labels & Notes placed cleanly and permanently below player */}
        <div className="mt-4 md:mt-6 flex flex-col items-center gap-2.5 max-w-4xl px-4 z-10 relative">
          <p className="text-[9px] md:text-xs font-semibold text-orange-500 uppercase tracking-widest bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
            AI Generated Concept Visualization
          </p>
          
          <div className="w-full max-w-md md:max-w-xl text-center">
            <button 
              id="btn-toggle-disclaimer"
              onClick={() => setIsNoteExpanded(!isNoteExpanded)}
              className="inline-flex items-center gap-1.5 text-[10px] md:text-xs font-extrabold uppercase tracking-widest text-neutral-400 hover:text-orange-500 transition-colors"
            >
              <span>Note &amp; Demonstration Details</span>
              <span className="text-[8px] md:text-[9px] text-neutral-500 font-bold">
                {isNoteExpanded ? '▲ (HIDE)' : '▼ (SHOW)'}
              </span>
            </button>
            
            {isNoteExpanded && (
              <div className="mt-2 p-3 text-left sm:text-center rounded-xl bg-neutral-900/60 border border-neutral-800/80 shadow-lg text-[9px] sm:text-xs text-neutral-400 leading-relaxed max-w-2xl mx-auto">
                The camera angles shown in these videos are for cinematic demonstration purposes only.
                <br className="hidden sm:block" />
                In actual AutoAds installations, the display device is mounted behind the driver seat, facing passengers for maximum visibility and engagement.
              </div>
            )}
          </div>
        </div>

        {/* Selection Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-6 w-full z-10 relative">
          {impactCategories.map((cat) => {
            const isActive = activeTab === cat.id;
            return (
              <button
                id={`btn-showcase-${cat.id}`}
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`p-3 rounded-xl border text-left transition-all duration-300 relative overflow-hidden group ${
                  isActive 
                    ? 'bg-slate-900 border-orange-500/85 shadow-[0_8px_30px_rgba(249,115,22,0.15)] ring-1 ring-orange-500/30 bg-gradient-to-br from-slate-900 to-black' 
                    : 'bg-slate-900/30 border-slate-900 hover:border-slate-800 hover:bg-slate-900/50'
                }`}
              >
                <div className={`absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-orange-500 to-amber-500 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`} />

                <div className="flex items-center gap-3 mb-1">
                  <div className={`p-1.5 rounded-lg transition-all duration-300 ${isActive ? 'bg-orange-500/20 scale-110' : 'bg-slate-800/40 group-hover:scale-105'}`}>
                    {cat.icon}
                  </div>
                  <h4 className="font-extrabold text-[10px] md:text-xs tracking-wider uppercase text-white leading-tight">
                    {cat.title}
                  </h4>
                </div>
                <p className={`text-[9px] leading-relaxed transition-colors duration-300 ${isActive ? 'text-slate-300 font-medium' : 'text-slate-500 group-hover:text-slate-400'}`}>
                  — {cat.shortDesc}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
