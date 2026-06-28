import * as React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'motion/react';
import { Baby, Users, Shield, Sparkles, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartPassengerQRProps {
  deviceId: string;
  onLogout: () => void;
}

export default function SmartPassengerQR({ deviceId, onLogout }: SmartPassengerQRProps) {
  const [isPopupVisible, setIsPopupVisible] = React.useState(false);
  const [isManualExpanded, setIsManualExpanded] = React.useState(false);

  // Timer logic
  React.useEffect(() => {
    let showTimer: NodeJS.Timeout;
    let hideTimer: NodeJS.Timeout;

    const schedulePopup = (isInitial = false) => {
      showTimer = setTimeout(() => {
        setIsPopupVisible(true);
        // Auto-hide after 8s if not manually kept open
        hideTimer = setTimeout(() => {
          if (!isManualExpanded) {
            setIsPopupVisible(false);
          }
          // Schedule next
          schedulePopup(false);
        }, 8000);
      }, isInitial ? 5000 : 45000 + Math.random() * 15000); // Initial 5s, then 45-60s
    };

    schedulePopup(true);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [isManualExpanded]);

  const rawDeviceId = deviceId || 'ACTIVE';
  // Sanitize: ensure deviceId isn't a URL
  const safeDeviceId = rawDeviceId.includes('://') ? 'ACTIVE' : rawDeviceId;
  const qrValue = `https://autoads.in/family-ride/${encodeURIComponent(safeDeviceId)}`;
  console.log("ACTIVE TERMINAL ID (from props):", deviceId);
  console.log("FINAL QR URL:", qrValue);

  if (!isPopupVisible) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 0.95, scale: 1 }}
      transition={{ duration: 0.3 }}
      onClick={() => setIsManualExpanded(true)}
      className="fixed bottom-4 right-4 z-[9999] overflow-hidden w-[150px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 select-none font-sans cursor-pointer"
    >
      <div className="flex flex-col items-center gap-1.5">
        <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest text-center">
            FAMILY SAFE RIDE
        </h3>
        
        <div className="bg-white p-2 rounded-lg">
            <QRCodeSVG value={qrValue} size={120} bgColor="#FFFFFF" fgColor="#000000" level="H" includeMargin={false} />
        </div>

        <p className="text-[8px] font-bold text-slate-400 text-center truncate w-full">
            {deviceId}
        </p>


        <button 
            onClick={(e) => { 
                console.log("[FORENSIC] Sign Out button clicked");
                e.stopPropagation(); 
                onLogout(); 
                console.log("[FORENSIC] onLogout called");
            }}
            className="w-full py-0.5 mt-0.5 text-[8px] font-black text-slate-500 hover:text-white uppercase tracking-widest bg-slate-800 rounded-md hover:bg-slate-700 transition"
        >
            Sign Out
        </button>
      </div>
    </motion.div>
  );
}
