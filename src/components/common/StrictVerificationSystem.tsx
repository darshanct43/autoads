
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, CheckCircle2, AlertCircle, ShieldCheck, XCircle, RefreshCw, Cloud, CloudOff, CloudUpload, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { offlineStorageService, DocMeta } from '@/services/offlineStorageService';
import { compressImage } from '@/lib/utils';

interface StrictVerificationSystemProps {
  uid: string;
  onComplete: () => void;
  onLogout: () => void;
}

const REQUIRED_DOCS = [
  { id: 'rc', label: 'Registration Certificate (RC)', fileName: 'rc.jpg' },
  { id: 'dl', label: 'Driving License (DL)', fileName: 'dl.jpg' },
  { id: 'aadhar', label: 'Aadhar Card', fileName: 'aadhar.jpg' },
  { id: 'selfie', label: 'Driver Selfie', fileName: 'selfie.jpg' },
] as const;

type DocId = typeof REQUIRED_DOCS[number]['id'];

export default function StrictVerificationSystem({ uid, onComplete, onLogout }: StrictVerificationSystemProps) {
  const [meta, setMeta] = useState<DocMeta | null>(null);
  const [activeStep, setActiveStep] = useState<DocId | null>(null);
  const [loading, setLoading] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: any;
    let isMounted = true;
    
    const attachStream = () => {
      if (!isMounted) return;

      if (stream && videoRef.current) {
        if (videoRef.current.srcObject !== stream) {
          videoRef.current.srcObject = stream;
        }
      } else if (stream && activeStep) {
        // More aggressive retry for the first 2 seconds
        timeoutId = setTimeout(attachStream, 100);
      }
    };

    attachStream();
    
    // Also handle resizing/re-attaching if the element becomes visible later
    let observer: ResizeObserver | null = null;
    if (videoRef.current && stream) {
      observer = new ResizeObserver(() => {
        if (videoRef.current && videoRef.current.srcObject !== stream) {
          videoRef.current.srcObject = stream;
        }
      });
      observer.observe(videoRef.current);
    }
    
    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (observer) observer.disconnect();
    };
  }, [stream, activeStep]);

  useEffect(() => {
    loadMeta();
  }, [uid]);

  const loadMeta = async () => {
    try {
      const data = await offlineStorageService.getMeta(uid);
      setMeta(data);
      setLoading(false);
      
      const isLocallyComplete = data.rc === 'uploaded' && data.dl === 'uploaded' && data.aadhar === 'uploaded' && data.selfie === 'uploaded';
      
      // If locally all done, trigger complete
      if (isLocallyComplete) {
        onComplete();
        // If not synced, try sync in background
        if (!data.synced) {
          handleSync();
        }
      }
    } catch (err) {
      console.error("Failed to load meta", err);
    }
  };

  const handleSync = async () => {
    if (!meta || meta.synced || meta.syncing) return;
    const success = await offlineStorageService.syncDocuments(uid);
    if (success) {
      const refreshed = await offlineStorageService.getMeta(uid);
      setMeta(refreshed);
    }
  };

  const startCamera = async (step: DocId) => {
    try {
      setError(null);
      let mediaStream: MediaStream;
      
      const constraints = {
        video: { 
          facingMode: step === 'selfie' ? 'user' : { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr) {
        console.warn("First camera attempt failed, trying fallback:", firstErr);
        // Fallback to basic video without complex constraints
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      setStream(mediaStream);
      setActiveStep(step);
    } catch (err) {
      setError("Camera access denied. Please enable camera in settings.");
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setActiveStep(null);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !activeStep) return;
    
    setIsCapturing(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(videoRef.current, 0, 0);
      
      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9);
      });
      
      // Resize and compress as per specs (1024px, 50-60%)
      // We'll use a file wrapper to pass to compressImage
      const file = new File([blob], `${activeStep}.jpg`, { type: 'image/jpeg' });
      const compressed = await compressImage(file, 1024, 0.55);
      
      // Save to offline storage
      await offlineStorageService.saveDocument(uid, activeStep, compressed as Blob);
      
      // Update meta
      const newMeta = await offlineStorageService.updateMeta(uid, { [activeStep]: 'uploaded' });
      setMeta(newMeta);
      
      stopCamera();
      
      // If all completed, finish
      if (newMeta.rc === 'uploaded' && newMeta.dl === 'uploaded' && newMeta.aadhar === 'uploaded' && newMeta.selfie === 'uploaded') {
        onComplete();
      }
    } catch (err) {
      setError("Capture failed. Try again.");
      console.error(err);
    } finally {
      setIsCapturing(false);
    }
  };

  if (loading || !meta) return null;

  const isLocallyComplete = meta.rc === 'uploaded' && meta.dl === 'uploaded' && meta.aadhar === 'uploaded' && meta.selfie === 'uploaded';

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center p-6 pb-24 text-white overflow-y-auto font-sans">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-0" 
           style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      {/* Top Navigation Rail - Now fixed to top */}
      <div className="fixed top-0 left-0 right-0 p-6 flex items-center justify-between z-50 bg-slate-950/90 backdrop-blur-md border-b border-white/5">
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <ShieldCheck className="text-amber-500 w-5 h-5" />
          </div>
          <div>
            <h1 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">ID Verification</h1>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Status: Active</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="flex items-center gap-2"
        >
          <button 
            type="button"
            onClick={() => onLogout()}
            className="group flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800 hover:border-red-500/30 text-slate-400 hover:text-red-500 rounded-xl transition-all text-[9px] font-bold uppercase tracking-widest"
          >
            <ChevronLeft size={12} className="group-hover:-translate-x-1 transition-transform" />
            Go Back
          </button>
        </motion.div>
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="max-w-md w-full relative z-10 mt-24 mb-10"
      >
        <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-6 sm:p-10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)]">
          {/* Header Section */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Secure Local Storage</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight leading-none mb-3">Complete <span className="italic text-slate-400">ID Check</span></h2>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              Platform security requires high-resolution capture of identity documents. Data is stored encrypted on this device.
            </p>
          </div>

          {/* Checklist */}
          <div className="grid grid-cols-1 gap-3 mb-10 text-left">
            {REQUIRED_DOCS.map((doc, idx) => {
              const isUploaded = meta[doc.id] === 'uploaded';
              return (
                <motion.div 
                  key={doc.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 + idx * 0.1 }}
                  className={cn(
                    "group relative flex items-center justify-between p-5 rounded-[1.5rem] border transition-all duration-500",
                    isUploaded 
                      ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500/80" 
                      : "bg-white/[0.03] border-white/5 hover:border-white/10 text-slate-300"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                      isUploaded ? "bg-emerald-500/20" : "bg-slate-800/50"
                    )}>
                      {isUploaded ? <CheckCircle2 size={20} /> : <AlertCircle size={20} className="text-slate-500" />}
                    </div>
                    <div className="text-left">
                      <span className="text-[10px] font-black uppercase tracking-widest block mb-0.5">{doc.label}</span>
                      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none">{isUploaded ? 'Data Stored Locally' : 'Action Required'}</p>
                    </div>
                  </div>
                  
                  {!isUploaded ? (
                    <button 
                      onClick={() => startCamera(doc.id)}
                      className="px-5 py-2.5 bg-amber-500 text-slate-950 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl shadow-amber-500/10 hover:shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      Capture
                    </button>
                  ) : (
                    <CheckCircle2 size={24} className="text-emerald-500 opacity-50" />
                  )}
                </motion.div>
              );
            })}
          </div>

          <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-5 flex gap-4 items-center text-left">
             <div className="w-10 h-10 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4 h-4 text-slate-500" />
             </div>
             <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                <span className="text-slate-300">Privacy Notice:</span> Your data is encrypted and saved under secure local storage. Payments remain locked until verification is complete.
             </p>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 px-6"
        >
          <button 
            disabled
            className="w-full py-5 bg-slate-900 border border-white/5 text-slate-600 font-black rounded-full text-xs uppercase tracking-[0.2em] opacity-50 cursor-not-allowed shadow-2xl relative overflow-hidden"
          >
            Payment Status: Restricted
          </button>
        </motion.div>
      </motion.div>

      {/* Camera Modal */}
      <AnimatePresence>
        {activeStep && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black flex flex-col"
          >
            <div className="flex items-center justify-between p-6 bg-slate-950/80 backdrop-blur-md">
              <div>
                <h3 className="text-sm font-black text-amber-500 uppercase tracking-[0.1em]">Capture {activeStep.toUpperCase()}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">Hold steady and ensure clear text</p>
              </div>
              <button onClick={stopCamera} className="p-2 text-slate-400 hover:text-white">
                <XCircle size={24} />
              </button>
            </div>

            <div className="flex-1 relative bg-slate-900">
               <video 
                 ref={videoRef} 
                 autoPlay 
                 playsInline 
                 className={cn(
                   "w-full h-full object-cover",
                   activeStep === 'selfie' && "-scale-x-100"
                 )}
               />
               
               {/* Viewfinder Overlays */}
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {activeStep === 'selfie' ? (
                    <div className="w-64 h-80 border-4 border-amber-500/30 rounded-[100px] shadow-[0_0_0_1000px_rgba(0,0,0,0.5)]" />
                  ) : (
                    <div className="w-80 h-56 border-4 border-amber-500/30 rounded-[2rem] shadow-[0_0_0_1000px_rgba(0,0,0,0.5)]" />
                  )}
               </div>

               {error && (
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 p-6 bg-red-500 text-white rounded-3xl text-center shadow-2xl">
                    <XCircle size={40} className="mx-auto mb-3" />
                    <p className="font-bold uppercase tracking-widest text-xs">{error}</p>
                    <button 
                      onClick={() => startCamera(activeStep)}
                      className="mt-4 px-6 py-2 bg-white text-red-500 rounded-xl font-black text-[10px] uppercase tracking-widest"
                    >
                      Retry Camera
                    </button>
                 </div>
               )}
            </div>

            <div className="p-10 bg-slate-950/80 backdrop-blur-md flex flex-col items-center">
              <button 
                onClick={capturePhoto}
                disabled={isCapturing}
                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-2xl shadow-white/10"
              >
                <div className={cn(
                  "w-16 h-16 rounded-full bg-white transition-all",
                  isCapturing ? "animate-pulse scale-75 opacity-50" : "scale-100 opacity-100"
                )} />
              </button>
              <p className="mt-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic tracking-[0.2em]">Capture Document</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
