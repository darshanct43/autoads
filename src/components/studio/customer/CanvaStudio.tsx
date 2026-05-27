import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { AssetPanel } from './AssetPanel';
import { CanvasArea } from './CanvasArea';
import { PropertiesPanel } from './PropertiesPanel';
import { PreviewBar } from './PreviewBar';
import { StudioProvider, useStudio } from './StudioContext';
import { SubscriptionManager } from '../../subscription/SubscriptionManager';

const UpgradeModalOverlay = () => {
  const { isUpgradeModalOpen, closeUpgradeModal } = useStudio();
  if (!isUpgradeModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 sm:p-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-5xl bg-[#f8fafc] rounded-[2rem] shadow-2xl relative overflow-hidden flex flex-col max-h-full"
      >
        <button 
          onClick={closeUpgradeModal}
          className="absolute top-6 right-6 w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-300 hover:text-slate-800 transition-colors z-50"
        >
          <X size={20} />
        </button>
        <div className="overflow-y-auto no-scrollbar p-2">
          <SubscriptionManager />
        </div>
      </motion.div>
    </div>
  );
};

export const CanvaStudio: React.FC<{ onClose: () => void; userRole?: string }> = ({ onClose, userRole }) => {
  const [activeNav, setActiveNav] = useState('templates');
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const handleNavSelect = (id: string) => {
    if (activeNav === id && isPanelOpen) {
      setIsPanelOpen(false);
    } else {
      setActiveNav(id);
      setIsPanelOpen(true);
    }
  };

  return (
    <StudioProvider userRole={userRole}>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1000] bg-slate-950 text-slate-100 flex flex-col overflow-hidden h-screen w-screen selection:bg-amber-500/30 font-sans shadow-2xl"
      >
        <TopBar onClose={onClose} />
        
        <div className="flex-1 flex overflow-hidden relative">
          <Sidebar active={activeNav} onSelect={handleNavSelect} />

          <AnimatePresence>
            {isPanelOpen && (
              <motion.div
                initial={{ x: -320, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -320, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative z-20"
              >
                <AssetPanel activeCategory={activeNav} onClose={() => setIsPanelOpen(false)} />
              </motion.div>
            )}
          </AnimatePresence>

          <main className="flex-1 flex flex-col overflow-hidden relative min-w-0">
            <div className="flex-1 flex overflow-hidden">
              <CanvasArea />
              <PropertiesPanel />
            </div>
            <PreviewBar />
          </main>
        </div>
        <UpgradeModalOverlay />
      </motion.div>
    </StudioProvider>
  );
};
