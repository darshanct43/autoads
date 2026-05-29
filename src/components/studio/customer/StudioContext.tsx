import React, { createContext, useContext, useState, useEffect } from 'react';
import { SubscriptionPlan, EditorState, PLANS, AspectRatio } from './types';
import { firebaseService } from '@/services/firebaseService';
import { auth } from '@/lib/firebase';

interface StudioContextType {
  state: EditorState;
  userRole?: string;
  isUpgradeModalOpen: boolean;
  setAspectRatio: (ratio: AspectRatio) => void;
  setSafeZone: (enabled: boolean) => void;
  setBrightness: (val: number) => void;
  setOutdoorMode: (enabled: boolean) => void;
  setActiveCanvas: (type: 'DESIGN' | 'VIDEO') => void;
  useEdit: () => boolean;
  canAccess: (feature: keyof EditorState | 'premium_templates' | 'video_editing' | 'ai_tools') => boolean;
  upgrade: (plan: SubscriptionPlan) => void;
  loadTemplate: (url: string) => void;
  openUpgradeModal: () => void;
  closeUpgradeModal: () => void;
}

const StudioContext = createContext<StudioContextType | undefined>(undefined);

export const StudioProvider: React.FC<{ children: React.ReactNode; userRole?: string }> = ({ children, userRole }) => {
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [state, setState] = useState<EditorState>({
    plan: (userRole === 'ADMIN' || userRole === 'STAFF' || userRole === 'SUPPORT') ? 'GOLD' : 'FREE',
    editsUsed: 0,
    activeCanvas: 'DESIGN',
    aspectRatio: '1:1',
    safeZone: true,
    brightness: 100,
    outdoorMode: false,
  });

  // Load subscription from Firestore if available
  useEffect(() => {
    const fetchStudioPlans = async () => {
      try {
        const dbStudioPlans = await firebaseService.getStudioPlans();
        dbStudioPlans.forEach(p => {
          if (PLANS[p.id as SubscriptionPlan]) {
            PLANS[p.id as SubscriptionPlan].name = p.name || PLANS[p.id as SubscriptionPlan].name;
            PLANS[p.id as SubscriptionPlan].price = p.price || PLANS[p.id as SubscriptionPlan].price;
            if (p.description) {
              // Store full description or split features
              PLANS[p.id as SubscriptionPlan].features = p.description.split(',').map((f: string) => f.trim());
            }
          }
        });
      } catch (e) {
        console.error("Failed to merge dynamic studio plans:", e);
      }
    };
    fetchStudioPlans();

    if (userRole === 'ADMIN' || userRole === 'STAFF' || userRole === 'SUPPORT') {
       setState(prev => ({ ...prev, plan: 'GOLD' }));
       return;
    }
    const user = auth.currentUser;
    const fetchSubscription = async () => {
      if (user) {
        try {
           const profile = await firebaseService.getUserProfile(user.uid);
           if (profile && profile.studioPlan) {
              const validPlans = ['FREE', 'BRASS', 'SILVER', 'GOLD'];
              if (validPlans.includes(profile.studioPlan)) {
                 setState(prev => ({ ...prev, plan: profile.studioPlan as SubscriptionPlan }));
              }
           }
        } catch (e) {
           console.error("Failed to load studio plan:", e);
        }
      }
    };
    fetchSubscription();
  }, []);

  const setAspectRatio = (aspectRatio: AspectRatio) => setState(prev => ({ ...prev, aspectRatio }));
  const setSafeZone = (safeZone: boolean) => setState(prev => ({ ...prev, safeZone }));
  const setBrightness = (brightness: number) => setState(prev => ({ ...prev, brightness }));
  const setOutdoorMode = (outdoorMode: boolean) => setState(prev => ({ ...prev, outdoorMode }));
  const setActiveCanvas = (activeCanvas: 'DESIGN' | 'VIDEO') => {
    if (activeCanvas === 'VIDEO' && !canAccess('video_editing')) {
      alert('Video editing requires Silver or Gold plan.');
      return;
    }
    setState(prev => ({ ...prev, activeCanvas }));
  };

  const canAccess = (feature: string) => {
    if (userRole === 'ADMIN' || userRole === 'STAFF' || userRole === 'SUPPORT') return true;
    const limits = PLANS[state.plan].limits;
    switch (feature) {
      case 'premium_templates': return limits.premiumTemplates;
      case 'video_editing': return limits.videoEditor !== 'none';
      case 'ai_tools': return limits.aiTools;
      default: return true;
    }
  };

  const useEdit = () => {
    if (userRole === 'ADMIN' || userRole === 'STAFF' || userRole === 'SUPPORT') return true;
    const limit = PLANS[state.plan].limits.edits;
    if (state.editsUsed >= limit) {
      alert('Edit limit reached for your current plan. Please upgrade to continue.');
      return false;
    }
    setState(prev => ({ ...prev, editsUsed: prev.editsUsed + 1 }));
    return true;
  };

  const upgrade = (plan: SubscriptionPlan) => {
    setState(prev => ({ ...prev, plan }));
  };

  const loadTemplate = (imageUrl: string) => {
    window.dispatchEvent(new CustomEvent('load_template', { detail: { url: imageUrl } }));
  };

  const openUpgradeModal = () => setIsUpgradeModalOpen(true);
  const closeUpgradeModal = () => setIsUpgradeModalOpen(false);

  return (
    <StudioContext.Provider value={{
      state,
      userRole,
      isUpgradeModalOpen,
      setAspectRatio,
      setSafeZone,
      setBrightness,
      setOutdoorMode,
      setActiveCanvas,
      useEdit,
      canAccess,
      upgrade,
      loadTemplate,
      openUpgradeModal,
      closeUpgradeModal
    }}>
      {children}
    </StudioContext.Provider>
  );
};

export const useStudio = () => {
  const context = useContext(StudioContext);
  if (!context) throw new Error('useStudio must be used within a StudioProvider');
  return context;
};
