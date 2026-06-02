import React, { useState, useEffect, useMemo, useRef, useReducer } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Palette, Target, Users, Zap, Image as ImageIcon, Video, ArrowUpRight, BarChart3, Clock, Wallet, Settings, Check, CreditCard, Sparkles, X, Gift, PlayCircle, LogIn, User, Phone, CheckCircle2, CheckCircle, ShieldCheck, Lock, ChevronRight, LogOut, Trash2, Database, AlertCircle, Send, Info, FileText, RefreshCw, MessageSquare, Upload, Activity, Monitor, ArrowLeft, Menu, LayoutDashboard, History, Paperclip, Download, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { firebaseService, AdCampaign, Device, SupportTicket, ChatMessage } from '@/services/firebaseService';
import { auth, googleLogin, storage, db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, onSnapshot, getDoc, getDocFromServer, enableNetwork } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { storageService } from '@/services/storageService';
import { compressImage } from '@/lib/utils';
/* ... */
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import ComplianceContent, { CompliancePage } from '../common/ComplianceContent';
import AdminAssistant from '../common/AdminAssistant';
import StaticImpactVideos from '../StaticImpactVideos';
import NotificationCenter from '../common/NotificationCenter';

declare const Razorpay: any;

const plans = [
  { id: 'BASIC', name: 'Elite Starter', price: '₹999', description: '3 Auto Displays • 1 Day Assigned • Ad Policy Help', color: 'bg-emerald-500' },
  { id: 'STARTER', name: 'Brand Velocity', price: '₹1999', description: '7 Auto Displays • 2 Days • High Retention', color: 'bg-indigo-500' },
  { id: 'PRO', name: 'Dominion Pro', price: '₹4999', description: 'Priority Network • 7 Days • Pro Strategy', color: 'bg-slate-900' },
];

const getSafeUrl = (url: string | undefined | null) => {
  if (!url) return undefined;
  if (typeof url !== 'string') return undefined;

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
    return undefined;
  }

  try {
    const decoded = decodeURI(cleaned);
    return encodeURI(decoded);
  } catch (e) {
    return cleaned;
  }
};

const getCampaignExpiration = (campaign: any) => {
  if (!campaign) return null;
  let baseDate = new Date();
  const timeSource = campaign.updatedAt || campaign.createdAt;
  if (timeSource) {
    if (typeof timeSource.toDate === 'function') {
      baseDate = timeSource.toDate();
    } else if (timeSource.seconds) {
      baseDate = new Date(timeSource.seconds * 1000);
    } else {
      const parsed = new Date(timeSource);
      if (!isNaN(parsed.getTime())) {
        baseDate = parsed;
      }
    }
  } else {
    return null;
  }

  const durationDays = campaign.durationDays || 30;
  const expirationDate = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diffTime = expirationDate.getTime() - now.getTime();

  if (diffTime <= 0) {
    return {
      expired: true,
      formattedDate: expirationDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      timeLeftStr: "Expired"
    };
  }

  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const diffMins = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));

  let timeLeftStr = "";
  if (diffDays > 0) {
    timeLeftStr = `${diffDays}d ${diffHours}h left`;
  } else if (diffHours > 0) {
    timeLeftStr = `${diffHours}h ${diffMins}m left`;
  } else {
    timeLeftStr = `${diffMins}m left`;
  }

  return {
    expired: false,
    formattedDate: expirationDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    timeLeftStr
  };
};

interface Plan {
  id: string;
  name: string;
  price: string | number;
  designerPrice?: number;
  description?: string;
  color: string;
  unitCount?: string;
}

interface CustomerPortalProps {
  onLogout: () => void;
}

export default function CustomerPortal({ onLogout }: CustomerPortalProps) {
  const triggerToast = (msg: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    console.log(`[TOAST] [${type.toUpperCase()}] ${msg}`);
    if (typeof (window as any).showToast === 'function') {
      (window as any).showToast(msg, type);
    } else {
      const mockToastEvent = new CustomEvent('showtoast', { detail: { message: msg, type } });
      window.dispatchEvent(mockToastEvent);
    }
  };

  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(() => localStorage.getItem('last_created_campaign'));
  const [isFirestoreOffline, setIsFirestoreOffline] = useState(false);
  const [activeCampaignData, setActiveCampaignData] = useState<any>(null);
  const [editablePlans, setEditablePlans] = useState<Plan[]>(plans.map(p => ({...p})));
  const [activePlan, setActivePlan] = useState('BASIC');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showPayment, setShowPaymentState] = useState(false);
  const hasUserInitiatedPayment = useRef(false);

  // Legacy State Compatibility Shims for Single Source of Truth
  const [creationStep, _setCreationStep] = useState<string>('DETAILS');
  const setCreationStep = (val: string) => {
    _setCreationStep(val);
    console.log("[COMPATIBILITY_SHIM] setCreationStep called with key:", val);
    if (val === 'DETAILS') {
      dispatch({ type: 'INIT_DETAILS' });
    } else if (val === 'VERIFYING') {
      dispatch({ type: 'SET_PAYMENT_PROCESSING' });
    } else if (val === 'SUCCESS') {
      dispatch({ type: 'SET_ACTIVE' });
    } else if (val === 'FAILED') {
      dispatch({ type: 'SET_FAILED', error: 'Payment failed' });
    }
  };

  const [localPaymentSuccess, setLocalPaymentSuccess] = useState<boolean>(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState<boolean>(false);
  const [successDismissed, setSuccessDismissed] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  const setShowPayment = (value: boolean) => {
    if (value) {
      if (hasUserInitiatedPayment.current) {
        setShowPaymentState(true);
      } else {
        console.warn("BLOCKED AUTOMATIC PAYMENT OPEN");
      }
    } else {
      hasUserInitiatedPayment.current = false;
      setShowPaymentState(false);
    }
  };

  const openPaymentModal = (campaignId?: string) => {
    if (showPayment) return; // Prevent repeated opening
    console.log("[PAYMENT_SYSTEM] Opening payment modal, campaignId:", campaignId);
    if (campaignId) {
      setCreatedCampaignId(campaignId);
      localStorage.setItem('last_created_campaign', campaignId);
      
      const foundAd = myCampaigns?.find(c => c.id === campaignId) as any;
      if (foundAd) {
         setCampaignDetails({
            title: foundAd.title || '',
            type: (foundAd.type || foundAd.mediaType || 'IMAGE') as 'IMAGE' | 'VIDEO',
            asset: foundAd.assetUrl || foundAd.mediaUrl || '',
            budget: String(foundAd.budget || ''),
            duration: String(foundAd.duration || '30')
         });
         setNeedDesigner(!!foundAd.needDesigner);
         const matchedPlan = mergedPlans.find(p => p.id === foundAd.planId) || 
                             plans.find(p => p.id === foundAd.planId) || 
                             (foundAd.duration === 7 ? (mergedPlans.find(p => p.id === 'PRO') || plans[2]) : 
                              foundAd.duration === 2 ? (mergedPlans.find(p => p.id === 'STARTER') || plans[1]) : 
                              (mergedPlans.find(p => p.id === 'BASIC') || plans[0]));
         setSelectedPlan(matchedPlan);
         if (foundAd.targetCity) {
            setSelectedCity(foundAd.targetCity);
            localStorage.setItem('last_selected_city', foundAd.targetCity);
         }
         if (foundAd.targetState) {
            setSelectedState(foundAd.targetState);
            localStorage.setItem('last_selected_state', foundAd.targetState);
         }
      }
      dispatch({ type: 'SET_AWAITING_PAYMENT' });
    } else {
      // Clear storage and state for a brand new campaign
      localStorage.removeItem('last_created_campaign');
      setCreatedCampaignId(null);
      setActiveCampaignData(null);
      setCampaignDetails({
         title: '',
         type: 'IMAGE',
         asset: '',
         budget: '',
         duration: '30'
      });
      setSelectedCity('');
      setSelectedState('');
      setCustomCity('');
      setNeedDesigner(null);
      dispatch({ type: 'INIT_DETAILS' });
    }
    hasUserInitiatedPayment.current = true;
    setShowPayment(true);
  };
  const [needDesigner, setNeedDesigner] = useState<boolean | null>(null);
  const [selectedState, setSelectedState] = useState(() => localStorage.getItem('last_selected_state') || '');
  const [selectedCity, setSelectedCity] = useState(() => localStorage.getItem('last_selected_city') || '');
  const [customCity, setCustomCity] = useState(() => localStorage.getItem('last_custom_city') || '');
  const [targetArea, setTargetArea] = useState('');
  const [paymentStage, setPaymentStage] = useState<'SELECTION' | 'PREPARATION'>('SELECTION');
  const [manualTxnId, setManualTxnId] = useState('');

  const states = {
    'Karnataka': ['Bengaluru', 'Mysore', 'Hassan', 'Hubli', 'Mangalore', 'Belgaum', 'Shimoga', 'Tumkur', 'Other'],
    'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Thane', 'Aurangabad', 'Solapur', 'Other'],
    'Delhi': ['New Delhi', 'North Delhi', 'South Delhi', 'West Delhi', 'East Delhi', 'Other'],
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Trichy', 'Tiruppur', 'Other'],
    'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar', 'Other'],
    'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Other'],
    'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Other'],
    'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut', 'Prayagraj', 'Noida', 'Other'],
    'Rajasthan': ['Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur', 'Other'],
    'Madhya Pradesh': ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Other'],
    'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Tirupati', 'Other'],
    'Kerala': ['Kochi', 'Thiruvananthapuram', 'Kozhikode', 'Thrissur', 'Kollam', 'Other'],
    'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Other'],
    'Haryana': ['Faridabad', 'Gurugram', 'Panipat', 'Ambala', 'Yamunanagar', 'Other'],
    'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Other'],
    'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Other'],
    'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Sambalpur', 'Other'],
    'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Other'],
    'Jharkhand': ['Jamshedpur', 'Ranchi', 'Dhanbad', 'Bokaro', 'Other'],
    'Uttarakhand': ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Other'],
    'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Other'],
    'Himachal Pradesh': ['Shimla', 'Dharamshala', 'Solan', 'Other'],
    'Jammu & Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Other'],
    'Others': ['Select "Other" below and specify city', 'Other']
  };

  useEffect(() => {
    if (selectedState) {
      localStorage.setItem('last_selected_state', selectedState);
    } else {
      localStorage.removeItem('last_selected_state');
    }
  }, [selectedState]);

  useEffect(() => {
    if (selectedCity) {
      localStorage.setItem('last_selected_city', selectedCity);
    } else {
      localStorage.removeItem('last_selected_city');
    }
  }, [selectedCity]);

  useEffect(() => {
    if (customCity) {
      localStorage.setItem('last_custom_city', customCity);
    } else {
      localStorage.removeItem('last_custom_city');
    }
  }, [customCity]);

  useEffect(() => {
    const handleOnline = async () => {
      setIsFirestoreOffline(false);
      try {
        await enableNetwork(db);
      } catch (err) {
        console.error("[FIREBASE_RECOVERY] Failed to enable Firestore network:", err);
      }
    };
    
    const handleOffline = () => {
      setIsFirestoreOffline(true);
    };

    if (!navigator.onLine) {
      setIsFirestoreOffline(true);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const [paymentResult, setPaymentResult] = useState<{status: string, txId?: string, orderId?: string, amount?: number, campaignId?: string, error?: string} | null>(null);
  const [currentLegalPage, setCurrentLegalPage] = useState<CompliancePage>('ABOUT');
  const [legalPage, setLegalPage] = useState<CompliancePage>('ABOUT');
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'PREMIUM' | 'CAMPAIGNS' | 'DESIGN_HELP' | 'TICKETS' | 'HISTORY' | 'LEGAL' | 'IMPACT'>('DASHBOARD');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    title: '',
    description: '',
    category: 'Campaign Assistance',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH'
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [dbPlans, setDbPlans] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [showFloatingOffer, setShowFloatingOffer] = useState(true);
  const [myCampaigns, setMyCampaigns] = useState<AdCampaign[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [terminals, setTerminals] = useState<any[]>([]);
  const [liveStatus, setLiveStatus] = useState<any[]>([]);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const shortenId = (id: string | null | undefined) => {
    if (!id) return '---';
    return id.substring(0, 6).toUpperCase();
  };
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Analytics Helpers
  const activeDevicesCount = useMemo(() => {
    if (liveStatus && liveStatus.length > 0) {
      return liveStatus.filter((status) => {
        const lastSeen = status.updatedAt?.toMillis?.() || (status.updatedAt?.seconds ? status.updatedAt.seconds * 1000 : status.updatedAt || 0);
        const isOnline = status.status === 'ONLINE' || status.status === 'ACTIVE' || status.status === 'STREAMING';
        const isRecent = Date.now() - lastSeen < 600000; // 10 minutes window
        return isOnline && isRecent;
      }).length;
    }
    return (devices || []).filter(d => d.status === 'ONLINE' || d.status === 'STREAMING').length;
  }, [devices, liveStatus]);

  const totalNetworkUnits = useMemo(() => {
    if (terminals && terminals.length > 0) {
      return terminals.length;
    }
    return (devices || []).length;
  }, [devices, terminals]);
  
  const syncScore = useMemo(() => {
    const total = totalNetworkUnits;
    return total > 0 ? Math.floor((activeDevicesCount / total) * 100) : 0;
  }, [totalNetworkUnits, activeDevicesCount]);

  const liveCampaign = useMemo(() => myCampaigns.find(c => c.status === 'ACTIVE' || c.status === 'LIVE'), [myCampaigns]);

  const customerBalance = useMemo(() => {
    return payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [payments]);

  const mergedPlans = useMemo(() => {
    if (dbPlans.length > 0) {
      return dbPlans.map(p => {
        const fallback = plans.find(f => f.id === p.id);
        return {
          id: p.id,
          name: p.name || fallback?.name || 'Unknown',
          price: p.price,
          designerPrice: p.designerPrice,
          videoMakerPrice: p.videoMakerPrice,
          description: p.description || fallback?.description || 'A great plan',
          color: fallback?.color || 'bg-slate-900'
        };
      });
    }
    return editablePlans;
  }, [dbPlans, editablePlans]);

  // SINGLE SOURCE OF TRUTH REDUCER STATE MACHINE
  type WorkflowState = 'DETAILS' | 'AWAITING_PAYMENT' | 'PAYMENT_PROCESSING' | 'ACTIVE' | 'FAILED';

  type MachineState = {
    workflowState: WorkflowState;
    error: string | null;
  };

  type MachineAction = 
    | { type: 'INIT_DETAILS' }
    | { type: 'SET_AWAITING_PAYMENT' }
    | { type: 'SET_PAYMENT_PROCESSING' }
    | { type: 'SET_ACTIVE' }
    | { type: 'SET_FAILED'; error: string | null };

  const machineReducer = (state: MachineState, action: MachineAction): MachineState => {
    switch (action.type) {
      case 'INIT_DETAILS':
        return { workflowState: 'DETAILS', error: null };
      case 'SET_AWAITING_PAYMENT':
        return { workflowState: 'AWAITING_PAYMENT', error: null };
      case 'SET_PAYMENT_PROCESSING':
        return { workflowState: 'PAYMENT_PROCESSING', error: null };
      case 'SET_ACTIVE':
        return { workflowState: 'ACTIVE', error: null };
      case 'SET_FAILED':
        return { workflowState: 'FAILED', error: action.error };
      default:
        return state;
    }
  };

  const [machineState, dispatch] = useReducer(machineReducer, {
    workflowState: 'DETAILS',
    error: null
  });

  const workflowState = machineState.workflowState;

  // Realtime Firestore Campaign Status listener (Engine 1)
  useEffect(() => {
    const activeId = createdCampaignId || localStorage.getItem('last_created_campaign');
    if (!activeId) {
      return;
    }

    if (!user) {
      return;
    }

    const docRef = doc(db, 'campaigns', activeId);

    // Engine 1: Realtime Snapshot Listener
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const campaign = docSnap.data();
        setActiveCampaignData(campaign);

        if (campaign.status === 'ACTIVE' || campaign.status === 'APPROVED' || campaign.status === 'LIVE') {
          dispatch({ type: 'SET_ACTIVE' });
        } else if (campaign.status === 'PENDING_VERIFICATION' || campaign.status === 'VERIFYING' || campaign.status === 'PAYMENT_PROCESSING') {
          dispatch({ type: 'SET_PAYMENT_PROCESSING' });
        } else if (campaign.status === 'FAILED' || campaign.status === 'REJECTED') {
          dispatch({ type: 'SET_FAILED', error: campaign.failureReason || 'Verification failed. Please check payment logs.' });
        } else {
          dispatch({ type: 'SET_AWAITING_PAYMENT' });
        }
      } else {
         dispatch({ type: 'SET_AWAITING_PAYMENT' });
      }
    }, (err) => {
      console.error("Firestore onSnapshot Error:", err);
      if (err.message?.includes('offline') || err.code === 'unavailable') {
        setIsFirestoreOffline(true);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [createdCampaignId, user?.uid, showPayment]);

  // Handle auto-destruction of payment modal and stopping loaders upon finding ACTIVE state
  useEffect(() => {
    if (workflowState === 'ACTIVE') {
      console.log("[PAYMENT_STRICT_DEBUG] ACTIVE state detected: closing checkout modal, stopping loaders.");
      
      // Close active Razorpay Modal if any reference is held
      if (activeRazorpayRef.current && typeof activeRazorpayRef.current.close === 'function') {
        try {
          activeRazorpayRef.current.close();
          console.log("[PAYMENT_STRICT_DEBUG] Closed active Razorpay modal.");
        } catch (err) {
          console.error("[PAYMENT_STRICT_DEBUG] Razorpay Close Error:", err);
        }
        activeRazorpayRef.current = null;
      }

      setShowPaymentState(false);
      setLoading(false);

      if (typeof (window as any).showToast === 'function') {
        (window as any).showToast("Campaign activated successfully!", "success");
      }


    }
  }, [workflowState, user?.uid]);

  // Backup global handler hook
  const handleSuccessTransition = (campaign: any, activeId: string) => {
    console.log("[PAYMENT_STRICT_DEBUG] handleSuccessTransition backup helper invoked.");
    dispatch({ type: 'SET_ACTIVE' });
  };

  useEffect(() => {
    (window as any)._handleSuccessTransition = handleSuccessTransition;
  }, []);

  const updatePlanPrice = (planId: string, newPrice: string) => {
    // Editing disabled in Customer Portal
  };

  const [selectedPlan, setSelectedPlan] = useState<any>(plans[1]);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const paymentProcessedRef = useRef(false);
  const activeRazorpayRef = useRef<any>(null);

  useEffect(() => {
    const plan = mergedPlans.find(p => p.id === activePlan);
    if (plan) setSelectedPlan(plan);
  }, [activePlan, mergedPlans]);
  
  const [isExtracting, setIsExtracting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
  const [uploadTimeLeft, setUploadTimeLeft] = useState(120);
  const uploadTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isUploadingMedia) {
      setUploadTimeLeft(120);
      uploadTimerRef.current = setInterval(() => {
        setUploadTimeLeft(prev => {
          if (prev <= 1) {
            if (uploadTimerRef.current) clearInterval(uploadTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (uploadTimerRef.current) {
        clearInterval(uploadTimerRef.current);
        uploadTimerRef.current = null;
      }
    }
    return () => {
      if (uploadTimerRef.current) clearInterval(uploadTimerRef.current);
    };
  }, [isUploadingMedia]);

  const [phone, setPhone] = useState('9876543210');
  
  // States for optional upload before paying
  const [optionalUploadFile, setOptionalUploadFile] = useState<File | null>(null);
  const [optionalUploadProgress, setOptionalUploadProgress] = useState<number>(0);
  const [isUploadingOptional, setIsUploadingOptional] = useState<boolean>(false);
  const [campaignDetails, setCampaignDetails] = useState({
    title: '',
    type: 'VIDEO' as 'IMAGE' | 'VIDEO',
    asset: null as string | null,
    budget: '',
    duration: '30'
  });

  const renderHistoryTab = () => (
    <div
      className="space-y-8 bg-slate-50 min-h-[500px] p-6 rounded-[2rem] border border-slate-200"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black italic uppercase text-slate-900 tracking-tight leading-none flex items-center gap-2">
            <Wallet className="text-amber-500" /> Financial History
          </h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 italic">History of Transactions and Campaigns</p>
        </div>
        <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl flex items-center gap-3 shadow-xl">
           <Wallet className="text-amber-500" size={24} />
           <div className="text-right">
              <p className="text-[7px] font-black uppercase text-slate-400 tracking-[0.2em] leading-none">Net Volume</p>
              <p className="text-xl font-black italic tracking-tight">₹{(payments || []).filter(p => ['SUCCESS', 'success', 'PAID', 'paid'].includes(p.status)).reduce((acc, curr) => acc + (curr.amount || 0), 0).toLocaleString()}</p>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden block w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-50/50">
              <tr className="border-b border-slate-100">
                <th className="px-5 sm:px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Transaction ID</th>
                <th className="px-5 sm:px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Type</th>
                <th className="px-5 sm:px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] hidden sm:table-cell">Campaign</th>
                <th className="px-5 sm:px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Amount Paid</th>
                <th className="px-5 sm:px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Payment Status</th>
                <th className="px-5 sm:px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] hidden sm:table-cell">Payment Date</th>
                <th className="px-5 sm:px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 italic">
              {(!payments || payments.length === 0) ? (
                <tr>
                  <td colSpan={7} className="px-5 py-24 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                        <Database className="text-slate-300" size={32} />
                      </div>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em] italic">No Financial Logs Detected</p>
                    </div>
                  </td>
                </tr>
              ) : payments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-5 sm:px-8 py-5">
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight break-all max-w-[120px] sm:max-w-none">{p.transactionId === 'UNKNOWN' ? (p.orderId ? `ORD:${p.orderId.substring(0,8)}` : 'SIGNAL_INIT') : (p.transactionId || 'SIGNAL_INIT')}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">{p.paymentMethod || 'RAZORPAY'}</p>
                  </td>
                  <td className="px-5 sm:px-8 py-5">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[8px] font-black uppercase tracking-widest leading-none">
                      {p.orderId?.startsWith('sub_') ? 'Subscription' : 'Campaign'}
                    </span>
                  </td>
                  <td className="px-5 sm:px-8 py-5 hidden sm:table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                        {p.orderId?.startsWith('sub_') ? <Zap size={14} /> : <Database size={14} />}
                      </div>
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-tight italic">
                        {p.orderId?.startsWith('sub_') ? p.orderId.split('_')[1]?.toUpperCase() + ' PLAN' : (p.campaignId ? shortenId(p.campaignId) : 'Campaign Hub')}
                      </p>
                    </div>
                  </td>
                  <td className="px-5 sm:px-8 py-5">
                    <span className="text-xs font-black text-slate-900">₹{p.amount?.toLocaleString()}</span>
                  </td>
                  <td className="px-5 sm:px-8 py-5">
                    <div className="flex flex-col gap-2">
                       <div>
                          <span className={cn(
                            "text-[8px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border w-fit",
                            p.status === 'SUCCESS' || p.status === 'success' || p.status === 'PAID' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : (p.status === 'FAILED' ? "bg-red-50 text-red-600 border-red-100" : (p.status === 'CANCELLED' ? "bg-slate-100 text-slate-500 border-slate-200" : "bg-amber-50 text-amber-600 border-amber-100"))
                          )}>
                            {p.status || 'VERIFIED'}
                          </span>
                          {p.failureReason && (
                             <p className="text-[7px] text-red-500 font-bold mt-1 uppercase sm:max-w-[120px] max-w-[80px] leading-tight truncate" title={p.failureReason}>
                                {p.failureReason}
                             </p>
                          )}
                       </div>
                      <button 
                        onClick={() => {
                          setActiveTab('TICKETS');
                        }}
                        className="text-[7px] font-black text-slate-400 uppercase tracking-widest hover:text-amber-500 transition-colors flex items-center gap-1"
                      >
                         <AlertCircle size={8} /> Raise Ticket
                      </button>
                    </div>
                  </td>
                  <td className="px-5 sm:px-8 py-5 hidden sm:table-cell">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                      {p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Pending Sync'}
                    </p>
                    <p className="text-[7px] font-black text-slate-300 uppercase tracking-tighter">
                      {p.createdAt?.toDate ? p.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </p>
                  </td>
                  <td className="px-5 sm:px-8 py-5">
                     {(p.status === 'SUCCESS' || p.status === 'success' || p.status === 'PAID') && (
                         <button onClick={() => window.print()} title="Download Receipt" className="p-2 bg-slate-100 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                            <Download size={14} />
                         </button>
                     )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {payments && payments.length > itemsPerPage && (
            <div className="flex items-center justify-between p-6 border-t border-slate-50">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="px-4 py-2 bg-slate-100 text-slate-900 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all disabled:opacity-50"
                  >Previous</button>
                <span className="text-[10px] font-black text-slate-400 uppercase">Page {currentPage} of {Math.ceil(payments.length / itemsPerPage)}</span>
                <button 
                  disabled={currentPage === Math.ceil(payments.length / itemsPerPage)}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="px-4 py-2 bg-slate-100 text-slate-900 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all disabled:opacity-50"
                  >Next</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Removed renderSubscriptionTab


  const handlePaymentSuccess = async (txnId?: string) => {
    try {
      setLoading(true);
      // 1. Record Campaign
      const campaignRef = await firebaseService.createCampaign({
        title: campaignDetails.title,
        status: 'PENDING',
        type: campaignDetails.type,
        assetUrl: campaignDetails.asset || '',
        videoThumbnail: videoThumbnail || '',
        customerId: user?.uid || '',
        targetCity: selectedCity === 'Other' ? customCity : selectedCity,
        targetState: selectedState,
        duration: campaignDetails.duration,
        needDesigner: !!needDesigner,
        paymentReceived: true
      });

      // 2. Record Payment
      const baseAmount = typeof selectedPlan.price === 'string' ? parseFloat(selectedPlan.price.replace(/[^0-9.]/g, '')) : selectedPlan.price;
      const designerCharge = needDesigner ? 1000 : 0;
      
      await firebaseService.recordPayment({
        campaignId: campaignRef.id,
        amount: baseAmount + designerCharge,
        currency: 'INR',
        status: 'SUCCESS',
        paymentMethod: 'system',
        transactionId: txnId || `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        customerId: user?.uid || '',
        customerPhone: phone || '',
      });

      dispatch({ type: 'SET_ACTIVE' });
      setCreatedCampaignId(campaignRef.id);
      localStorage.setItem('last_created_campaign', campaignRef.id);
      
      setPaymentStage('SELECTION');
      setManualTxnId('');
      if (typeof (window as any).showToast === 'function') {
         (window as any).showToast("Campaign Submitted successfully!", "success");
      } else {
         triggerToast("Campaign Submitted successfully!", "success");
      }
      setLoading(false);
    } catch (e: any) {
      console.error(e);
      let errorMsg = 'Cloud sync failed.';
      try {
        const errObj = JSON.parse(e.message);
        errorMsg = `Sync Error: ${errObj.error} (Path: ${errObj.path})`;
      } catch (parseError) {
        errorMsg = e.message || errorMsg;
      }
      triggerToast(errorMsg, "error");
      setLoading(false);
    }
  };

  const [orderData, setOrderData] = useState<any>(null);
  const [isPreparingOrder, setIsPreparingOrder] = useState(false);

  const prepareOrder = async (campaignId?: string) => {
    if (isPreparingOrder) return orderData;
    if (!user) { 
      triggerToast('Authentication required. Please log in.', 'error'); 
      return null; 
    }

    const activeCid = campaignId || createdCampaignId || localStorage.getItem('last_created_campaign');
    if (!activeCid) {
      triggerToast('No active campaign detected. First launch/create a campaign to pay.', 'error');
      return null;
    }

    const currentCity = selectedCity === 'Other' ? customCity : selectedCity;
    if (!currentCity || !currentCity.trim()) {
      triggerToast('Please select a target city before proceeding.', 'error');
      return null;
    }

    const baseAmount = typeof selectedPlan.price === 'string' ? parseFloat(selectedPlan.price.replace(/[^0-9.]/g, '')) : selectedPlan.price;
    const amount = baseAmount + (needDesigner ? 1000 : 0);
    if (!amount || amount <= 0) {
      triggerToast('Invalid order amount.', 'error');
      return null;
    }
    
    console.log("FRONTEND AMOUNT:", amount);

    setIsPreparingOrder(true);
    setLoading(true);
    
    try {
      const response = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency: 'INR',
          notes: { 
             user_uid: user.uid, 
             customerId: user.uid,
             title: campaignDetails.title,
             campaignId: campaignId || ''
          }
        })
      });

      const data = await response.json();

      console.log("SERVER RESPONSE:", data);
      console.log("CREATE ORDER RESPONSE:", data);

      if (!response.ok) {
        throw new Error(
          data?.description ||
          data?.message ||
          "Payment failed"
        );
      }
      
      const order = data.order || data;
      const keyId = data.key_id || order.key_id || data.key || order.key;
      const finalOrderData = {
        ...order,
        key_id: keyId
      };
      
      console.log(finalOrderData.id);
      
      if (finalOrderData.amount < 100) {
        throw new Error("Invalid order amount. Minimum charge not met.");
      }
      setOrderData(finalOrderData);
      setActiveOrderId(finalOrderData.id);
      return finalOrderData;
    } catch (e: any) {
      console.error(`Server initialization failed: ${e.message}`);
      throw e;
    } finally {
      setIsPreparingOrder(false);
      setLoading(false);
    }
  };

  const handlePaymentAndSubmit = async () => {
    console.log("[PAYMENT_SYSTEM] Payment button clicked debug");
    if (isPreparingOrder || paymentProcessedRef.current) return;
    console.log("[PAYMENT_SYSTEM] Payment button clicked");
    console.log("[PAYMENT_SYSTEM] Opening Modal from:", new Error().stack);
    let currentOrderData = orderData;
    if (!currentOrderData) {
      currentOrderData = await prepareOrder(createdCampaignId || localStorage.getItem('last_created_campaign') || undefined);
    }
    
    if (!currentOrderData) return;
    
    const razorpayKey = currentOrderData.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID;
    
    try {
      if (!(window as any).Razorpay) {
        console.error("Razorpay SDK not loaded");
        throw new Error("Razorpay SDK not loaded");
      }

      const options = {
        key: razorpayKey,
        amount: currentOrderData.amount,
        currency: currentOrderData.currency,
        name: "AutoAds Pro",
        description: "Campaign Payment",
        order_id: currentOrderData.id,
        // redirect: true, // Removed to prevent interference with handler
        handler: async function (response: any) {
          alert("RAZORPAY CALLBACK FIRED");
          console.log("RAZORPAY CALLBACK SUCCESS", response);
          localStorage.setItem("payment_pending", currentOrderData.id);
          setLoading(true);
          try {
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                ...response,
                uid: user?.uid,
                campaignId: createdCampaignId
              })
            });
            const verifyData = await verifyRes.json();
            console.log("VERIFY RESULT:", verifyData);

            if (verifyData.success) {
              localStorage.removeItem("payment_pending");
              setShowPaymentState(false);
              triggerToast("Payment successful!", "success");
              dispatch({ type: 'SET_ACTIVE' });
            } else {
              throw new Error(verifyData.error || "Verification failed");
            }
          } catch (err) {
            console.error("VERIFY ERROR:", err);
            triggerToast("Payment verification failed.", "error");
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            console.log("PAYMENT CANCELLED");
          }
        },
        prefill: {
          name: user?.displayName || "",
          email: user?.email || "",
          contact: phone || user?.phoneNumber?.replace('+91', '') || ""
        },
        theme: {
          color: "#2563eb"
        }
      };

      localStorage.setItem("pending_order", currentOrderData.id);
      const razor = new (window as any).Razorpay(options);
      razor.on('payment.success', function(resp: any) {
        console.log("EVENT SUCCESS", resp);
      });
      razor.open();
    } catch (e: any) {
      triggerToast(`Modal Error: ${e.message}`, "error");
    }
  };


  useEffect(() => {
    firebaseService.getPlans().then(setDbPlans).catch(console.error);

    // Pre-load Razorpay script
    if (typeof (window as any).Razorpay === 'undefined') {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u?.phoneNumber) {
        setPhone(u.phoneNumber.replace('+91', ''));
      }
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    firebaseService.getUserProfile(user.uid).then((prof) => {
       setUserProfile(prof);
       if (prof?.mobile && !phone) {
         setPhone(prof.mobile.replace('+91', ''));
       } else if (prof?.phone && !phone) {
         setPhone(prof.phone.replace('+91', ''));
       }
    }).catch(console.error);

    const unsubscribeNotices = firebaseService.subscribeToPublicNotices((notices) => {
      setPromotions(notices);
    });
    
    const unsubscribeCampaigns = firebaseService.subscribeToCampaigns((campaigns) => {
      setMyCampaigns(campaigns);
    }, user.uid);

    const unsubscribePayments = firebaseService.subscribeToPayments((payDocs) => {
      setPayments(payDocs);
    }, user.uid, phone);

    const unsubscribeDevices = firebaseService.subscribeToDevices((devs) => {
      setDevices(devs);
    });

    const unsubscribeTerminals = firebaseService.subscribeToTerminals((terms) => {
      setTerminals(terms || []);
    });

    const unsubscribeLiveStatus = firebaseService.subscribeToLiveStatus((statuses) => {
      setLiveStatus(statuses || []);
    });

    const unsubscribeTickets = firebaseService.subscribeToCustomerTickets(user.uid, setTickets);

    return () => {
      unsubscribeNotices();
      unsubscribeCampaigns();
      unsubscribePayments();
      unsubscribeDevices();
      unsubscribeTerminals();
      unsubscribeLiveStatus();
      unsubscribeTickets();
    };
  }, [user?.uid, phone]);

  useEffect(() => {
    if (activeTicketId) {
      const unsubscribeChat = firebaseService.subscribeToMessages(activeTicketId, setChatMessages);
      return () => unsubscribeChat();
    }
  }, [activeTicketId]);

  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!ticketForm.title.trim() || !ticketForm.description.trim()) {
      alert("Please fill out all fields.");
      return;
    }
    
    setLoading(true);
    try {
      const ticketId = await firebaseService.createSupportTicket({
        customerId: user.uid,
        customerName: userProfile?.name || user.displayName || user.email || 'Customer',
        title: ticketForm.title,
        description: ticketForm.description,
        priority: ticketForm.priority,
        category: ticketForm.category,
        type: 'CUSTOMER'
      });
      
      setIsCreateTicketOpen(false);
      setTicketForm({
        title: '',
        description: '',
        category: 'Campaign Assistance',
        priority: 'MEDIUM'
      });
      setActiveTicketId(ticketId);
      setActiveTab('TICKETS');
      triggerToast("Support ticket raised successfully! Connecting to Help Desk chat...", "success");
    } catch (err: any) {
      console.error(err);
      alert("Failed to create ticket: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeTicketId || !user) return;
    try {
      await firebaseService.sendChatMessage(activeTicketId, {
        content: newMessage,
        senderId: user.uid,
        senderName: userProfile?.name || user.displayName || 'Customer'
      });
      setNewMessage('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleApproveDesign = async (ticket: SupportTicket) => {
    if (!ticket.campaignId) return;
    const confirm = window.confirm("Are you satisfied with the design? This will move your campaign for final team approval and launch.");
    if (!confirm) return;
    
    try {
      setLoading(true);
      await firebaseService.approveDesignerWork(ticket.id!, ticket.campaignId);
      alert("DESIGN APPROVED! Your campaign is now moving to team for final approval.");
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this campaign? This cannot be undone.")) return;
    try {
      await firebaseService.deleteCampaign(id);
    } catch (err) {
      alert("Failed to delete campaign.");
    }
  };

  const handleCampaignSubmit = async () => {
    if (!user) {
      alert('Please Login to Submit Campaign');
      return;
    }
    if (!campaignDetails.title) {
      alert('Please provide campaign title');
      return;
    }
    
    try {
      await firebaseService.createCampaign({
        title: campaignDetails.title,
        status: 'PENDING',
        type: campaignDetails.type,
        assetUrl: campaignDetails.asset || '',
        customerId: user.uid,
        targetCity: selectedCity === 'Other' ? customCity : selectedCity,
        targetState: selectedState,
        duration: campaignDetails.duration
      });
      
      setShowPayment(false);
      alert('Campaign Submitted Successfully to Cloud! Waiting for Staff Verification.');
      setCampaignDetails({ title: '', type: 'VIDEO', asset: null, budget: '', duration: '30' });
    } catch (e: any) {
      console.error("Submission failed:", e);
      let errorMsg = 'Cloud Sync Failed. Please check your connection.';
      try {
        const errObj = JSON.parse(e.message);
        errorMsg = `Sync Error: ${errObj.error} (Path: ${errObj.path})`;
      } catch (parseError) {
        errorMsg = e.message || errorMsg;
      }
      alert(errorMsg);
    }
  };

  const exportToCSV = (data: any[], fileName: string) => {
    try {
      setIsExtracting(true);
      console.log(`[Extraction] Processing request for: ${fileName}`);
      
      const sourceData = (data && data.length > 0) ? data : [
        { SYSTEM_MESSAGE: "EMPTY_SET_TEMPLATE", TIMESTAMP: new Date().toISOString(), INSTRUCTION: "No records found. Start a new deployment to generate report data." }
      ];

      const allKeys = Array.from(new Set(sourceData.flatMap(item => Object.keys(item || {}))));
      const rows = sourceData.map(item => {
        return allKeys.map(key => {
          let val = item[key];
          if (val === undefined || val === null) return '""';
          if (val && typeof val === 'object' && ('seconds' in val || val instanceof Date)) {
            val = val instanceof Date ? val.toISOString() : new Date(val.seconds * 1000).toISOString();
          } else if (typeof val === 'object') {
            val = String(val);
          }
          const strVal = String(val).replace(/"/g, '""');
          return `"${strVal}"`;
        }).join(",");
      });

      const csvContent = "\ufeff" + [allKeys.join(","), ...rows].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.style.display = 'none';
      link.href = url;
      link.setAttribute("download", `${fileName.replace(/[^a-z0-9]/gi, '_')}.csv`);
      document.body.appendChild(link);
      
      console.log("[Extraction] Triggering download sequence...");
      link.click();
      
      setTimeout(() => {
        if (document.body.contains(link)) document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        setIsExtracting(false);
        console.log(`[Extraction] Success: Exported ${rows.length} records.`);
      }, 1000);

    } catch (error) {
      setIsExtracting(false);
      console.error("[Extraction] Global Failure:", error);
      alert("Extraction failed. Please check browser permissions.");
    }
  };

  const handleUploadMediaToCampaign = async (campaignId: string, file: File) => {
    if (!user) return;
    try {
      setIsUploadingMedia(true);
      setUploadProgress(0);
      
      const res = await storageService.uploadCampaignMedia(campaignId, file, (p) => {
        setUploadProgress(p);
      });

      const mediaType = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';

      await firebaseService.updateCampaign(campaignId, {
        assetUrl: res.url,
        mediaUrl: res.url,
        videoThumbnail: res.thumbnailUrl || "",
        mediaType: mediaType,
        type: mediaType, // Keep both for safety
        mediaReceived: true,
        updatedAt: new Date()
      });

      alert("Media uploaded successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Upload failed: " + err.message);
    } finally {
      setIsUploadingMedia(false);
      setUploadProgress(0);
    }
  };

  const handleExtractionClick = (e: React.MouseEvent, data: any[], fileName: string) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Extraction button clicked", fileName);
    exportToCSV(data, fileName);
  };

  // Removed the automatic prepareOrder() useEffect. 
  // It now only triggers when the user manually initiates the payment flow.

  const handleActivePlanChange = (planId: string) => {
    setActivePlan(planId);
    setSelectedPlan(mergedPlans.find(p => p.id === planId) || plans.find(p => p.id === planId));
    setOrderData(null); // Reset order data when plan changes
  };

  const handleRequestDesign = async (type: string) => {
    if (!user) return alert('Please login');
    try {
      setLoading(true);
      
      // Auto-configure the campaign flow
      setNeedDesigner(true);
      if (type.includes('Video')) {
        setActivePlan('PRO');
        setSelectedPlan(mergedPlans.find(p => p.id === 'PRO') || plans[2]);
      } else {
        setActivePlan('STARTER');
        setSelectedPlan(mergedPlans.find(p => p.id === 'STARTER') || plans[1]);
      }
      
      // Switch to Ads tab and trigger checkout
      setActiveTab('CAMPAIGNS');
      openPaymentModal();
      setCreationStep('DETAILS');
      
      // Also log the interest via support ticket for tracking
      await firebaseService.createSupportTicket({
        customerId: user.uid,
        customerName: userProfile?.name || user.displayName || 'Customer',
        title: `Design Request: ${type}`,
        description: `Customer clicked ${type} and was directed to checkout.`,
        priority: 'MEDIUM',
        category: 'Design Strategy',
        type: 'CUSTOMER'
      });
      
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col relative overflow-x-hidden">
      {/* Immersive Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#f8fafc]">
        {/* Futuristic Grid */}
        <div className="absolute inset-0 opacity-[0.03]" 
             style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        
        {/* Dynamic Orbs */}
        <motion.div 
          animate={{ 
            x: [0, 100, 0], 
            y: [0, -50, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] rounded-full bg-blue-500/10 blur-[160px]" 
        />
        <motion.div 
          animate={{ 
            x: [0, -80, 0], 
            y: [0, 100, 0],
            scale: [1, 1.3, 1]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-30%] right-[-10%] w-[70%] h-[70%] rounded-full bg-amber-500/10 blur-[160px]" 
        />
        
        {/* Floating Particles */}
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 0.4, 0], 
              scale: [0.5, 1.5, 0.5],
              y: [-100, -1000],
              x: Math.random() * 1000
            }}
            transition={{ 
              duration: 10 + Math.random() * 10, 
              repeat: Infinity, 
              delay: Math.random() * 20 
            }}
            className="absolute w-1 h-1 bg-blue-400 rounded-full blur-[2px]"
            style={{ left: `${Math.random() * 100}%`, bottom: '-10px' }}
          />
        ))}
      </div>

      {/* Top Announcement Bar */}
      <div className="bg-slate-950 text-white h-8 flex items-center justify-center px-4 overflow-hidden relative z-[110]">
         <div className="flex items-center gap-6 animate-marquee whitespace-nowrap">
            <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
               <Zap size={10} className="text-amber-500" /> New Expansion Live: Bangalore Central District Screens Active Now!
            </span>
            <span className="w-2 h-2 bg-slate-700 rounded-full" />
            <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2 text-amber-400">
               <Sparkles size={10} /> Exclusive Offer: Get 20% extra impressions on all Pro Plans this week!
            </span>
            <span className="w-2 h-2 bg-slate-700 rounded-full" />
            <span className="text-[9px] font-black uppercase tracking-widest">
               Latest Driver Stats: 450+ Verified Terminals Syncing Globally.
            </span>
         </div>
      </div>

      {/* Navigation */}
      <nav className="h-16 border-b border-slate-200 flex items-center justify-between px-4 md:px-8 bg-white/80 backdrop-blur-md sticky top-0 z-[100]">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden p-3 -ml-3 text-slate-500 hover:text-slate-900 transition-colors z-[110]"
            aria-label="Toggle Menu"
          >
            {showMobileMenu ? <X size={26} /> : <Menu size={26} />}
          </button>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 tracking-tight text-xs md:text-sm uppercase tracking-widest leading-none">Auto <span className="text-amber-500 italic">Ads</span></span>
            </div>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mt-1 md:mt-1.5 flex items-center gap-1">
              by <span className="text-slate-600 font-bold uppercase tracking-widest italic">Mayaan</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-6 h-full">
          <div className="hidden md:flex h-full items-center gap-6">
            {[
              { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'IMPACT', label: 'Impact', icon: PlayCircle },
              { id: 'CAMPAIGNS', label: 'Campaigns', icon: Target },
              { id: 'HISTORY', label: 'History', icon: History },
              { id: 'TICKETS', label: 'Support', icon: MessageSquare },
              { id: 'STUDIO', label: 'Studio', icon: Palette },
              { id: 'DESIGN_HELP', label: 'Experts', icon: Sparkles },
              { id: 'SUBSCRIPTIONS', label: 'Plans', icon: Zap }
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                }} 
                className={cn(
                  "h-full px-0 transition-all whitespace-nowrap text-[10px] font-black uppercase tracking-widest flex items-center gap-1", 
                  activeTab === tab.id ? "text-amber-600 border-b-2 border-amber-500" : "text-slate-400 hover:text-slate-900",
                  (tab as any).special && "text-blue-600 hover:text-blue-800"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {user && (
            <div className="flex items-center gap-2 md:gap-4 ml-2 md:border-l md:border-slate-100 md:pl-6 shrink-0">
               <NotificationCenter role="CUSTOMER" userId={user?.uid} onNavigateToTab={(tab) => { setActiveTab(tab as any); }} />
               <div className="hidden sm:flex flex-col items-end mr-2 text-right">
                  <span className="text-[9px] font-black text-slate-900 uppercase tracking-tighter">{userProfile?.name || user.displayName || user.email?.split('@')[0] || 'Customer'}</span>
                  <div className="flex items-center gap-1">
                     {userProfile?.studioPlan === 'GOLD' ? (
                       <>
                         <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" className="text-amber-500 mb-0.5"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                         <span className="text-[7px] font-black text-amber-500 uppercase tracking-widest leading-none mt-0.5">Gold Member</span>
                       </>
                     ) : userProfile?.studioPlan === 'SILVER' ? (
                       <>
                         <ShieldCheck width="10" height="10" className="text-slate-500 mb-0.5" />
                         <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none mt-0.5">Silver Member</span>
                       </>
                     ) : userProfile?.studioPlan === 'BRASS' ? (
                       <>
                         <Star width="10" height="10" className="text-amber-700 mb-0.5" />
                         <span className="text-[7px] font-black text-amber-700 uppercase tracking-widest leading-none mt-0.5">Brass Member</span>
                       </>
                     ) : (
                       <>
                         <span className="w-1 h-1 bg-green-500 rounded-full animate-ping mb-0.5" />
                         <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mt-0.5">Network Verified</span>
                       </>
                     )}
                  </div>
               </div>
               <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl group cursor-pointer overflow-hidden relative border-2 border-white">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid || 'default'}`} alt="Avatar" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
               </div>
               <button 
                onClick={() => onLogout()} 
                className="p-1 px-2 md:px-4 md:py-2 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all flex items-center gap-2"
              >
                 <LogOut size={14} />
                 <span className="hidden md:inline text-[9px] font-black uppercase tracking-widest">Exit</span>
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-4 md:space-y-8 flex flex-col">
        {activeTab === 'LEGAL' && (
          <div 
            className="space-y-8 pb-32"
          >
             <div>
                <h2 className="text-3xl font-black italic uppercase text-slate-900 leading-none tracking-tight">Legal & Compliance</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Platform Rules, Privacy & Support</p>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1 space-y-2">
                   {[
                      { id: 'ABOUT', label: 'About Network', icon: Info },
                      { id: 'PRIVACY', label: 'Privacy Policy', icon: ShieldCheck },
                      { id: 'TERMS', label: 'Terms of Use', icon: FileText },
                      { id: 'CONTACT', label: 'Support Center', icon: MessageSquare }
                   ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setLegalPage(item.id as CompliancePage)}
                        className={cn(
                          "w-full flex items-center gap-4 p-6 rounded-3xl border transition-all text-left",
                          legalPage === item.id 
                            ? "bg-slate-900 border-slate-900 text-amber-500 shadow-xl" 
                            : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                        )}
                      >
                        <item.icon size={20} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                      </button>
                   ))}
                </div>
                <div className="lg:col-span-3 bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden min-h-[500px]">
                   <ComplianceContent page={legalPage} isEmbed />
                </div>
             </div>
          </div>
        )}

        {activeTab === 'IMPACT' && (
          <StaticImpactVideos />
        )}

        {activeTab === 'TICKETS' && (
          <div 
            className={cn("flex bg-white/50 backdrop-blur-xl border border-slate-200/50 rounded-[3rem] overflow-hidden shadow-2xl relative", activeTab === 'TICKETS' ? "h-[calc(100vh-200px)] md:h-[calc(100vh-250px)] min-h-[400px]" : "h-0")}
          >
            {/* Background elements for chat */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 blur-[100px] pointer-events-none rounded-full" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 blur-[100px] pointer-events-none rounded-full" />
            
            {/* Sidebar */}
            <div className={cn(
              "w-80 border-r border-slate-100 flex flex-col bg-white/50 backdrop-blur-md transition-all duration-300 relative z-10",
              activeTicketId ? "hidden md:flex" : "flex w-full md:w-80"
            )}>
               <div className="p-8 border-b border-slate-100 bg-white flex justify-between items-center">
                  <div>
                     <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest italic leading-none">Your Help Desk</h3>
                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Chat with our Team</p>
                  </div>
                  <button
                    onClick={() => setIsCreateTicketOpen(true)}
                    className="p-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center group"
                    title="Create Support Ticket"
                  >
                    <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                  </button>
               </div>
               <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {tickets.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTicketId(t.id!)}
                      className={cn(
                        "w-full p-6 rounded-3xl border transition-all text-left relative group",
                        activeTicketId === t.id 
                          ? "bg-slate-900 border-slate-900 text-white shadow-xl md:translate-x-2" 
                          : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn("text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border", 
                          t.status?.toLowerCase() === 'open' ? "bg-amber-100 border-amber-200 text-amber-600" :
                          t.status?.toLowerCase() === 'resolved' ? "bg-green-100 border-green-200 text-green-600" :
                          "bg-blue-100 border-blue-200 text-blue-600"
                        )}>
                          {t.status}
                        </span>
                        {t.priority === 'HIGH' && <AlertCircle size={12} className="text-red-500 animate-pulse" />}
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-tight line-clamp-1 mb-1">{t.title}</p>
                      <p className="text-[8px] font-bold opacity-60 line-clamp-1 italic">{t.description}</p>
                    </button>
                  ))}
                  {tickets.length === 0 && (
                    <div className="py-20 text-center px-4">
                       <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <MessageSquare className="text-slate-200" size={32} />
                       </div>
                       <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-4">No support chats started</p>
                       <button
                         onClick={() => setIsCreateTicketOpen(true)}
                         className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 transition-all inline-flex items-center gap-2"
                       >
                         <Plus size={12} /> Start Ticket
                       </button>
                    </div>
                  )}
               </div>
            </div>

            {/* Chat Area */}
            <div className={cn(
              "flex-1 flex flex-col bg-transparent relative z-10 transition-all duration-300",
              !activeTicketId && "hidden md:flex"
            )}>
               {activeTicketId ? (
                 <>
                   <div className="h-20 border-b border-slate-100 px-4 md:px-8 flex items-center justify-between bg-white/60 backdrop-blur-md">
                      <div className="flex items-center gap-2 md:gap-4">
                         <button 
                           onClick={() => setActiveTicketId(null)}
                           className="p-2.5 bg-slate-900 border border-slate-800 text-amber-500 rounded-xl transition-all shadow-xl hover:bg-slate-800 active:scale-95 flex items-center justify-center group"
                           title="Back to Tickets"
                         >
                           <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                         </button>
                         <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-amber-500 shadow-md">
                            <User size={18} />
                         </div>
                         <div>
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight italic">
                              {tickets.find(t => t.id === activeTicketId)?.title}
                            </h4>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Support Conversation</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-3">
                         {tickets.find(t => t.id === activeTicketId)?.category === 'Design Strategy' && tickets.find(t => t.id === activeTicketId)?.status !== 'resolved' && (
                           <button 
                             onClick={() => handleApproveDesign(tickets.find(t => t.id === activeTicketId)!)}
                             disabled={loading}
                             className="px-4 py-2 bg-green-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-green-500/20 hover:scale-105 transition-all flex items-center gap-2"
                           >
                              <CheckCircle2 size={14} /> SATISFIED & APPROVE
                           </button>
                         )}
                         <span className="text-[10px] font-black text-slate-300 uppercase">#{activeTicketId.slice(-6).toUpperCase()}</span>
                      </div>
                   </div>

                   <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/30">
                      {chatMessages.map((msg, i) => (
                        <div 
                          key={i}
                          className={cn(
                            "flex flex-col max-w-[80%]",
                            msg.senderId === user?.uid ? "ml-auto items-end" : "items-start"
                          )}
                        >
                           <div className={cn(
                             "px-5 py-4 rounded-[1.5rem] text-[11px] font-bold tracking-tight shadow-sm flex flex-col gap-2",
                             msg.senderId === user?.uid 
                               ? "bg-slate-900 text-white rounded-tr-none" 
                               : msg.senderId === 'system' ? "bg-amber-50 border border-amber-100 text-amber-600 rounded-tl-none italic" : "bg-white border border-slate-100 text-slate-600 rounded-tl-none"
                           )}>
                              {msg.mediaUrl && (
                                msg.mediaType === 'VIDEO' || msg.mediaUrl.split('?')[0].match(/\.(mp4|webm|ogg)$/i) ? (
                                  <video src={getSafeUrl(msg.mediaUrl)} controls className="max-w-[200px] md:max-w-[300px] rounded-xl" />
                                ) : (
                                  <img src={getSafeUrl(msg.mediaUrl)} alt="Attachment" className="max-w-[200px] md:max-w-[300px] rounded-xl object-contain" />
                                )
                              )}
                              {msg.content || msg.text}
                           </div>
                           <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-2 px-2">
                             {msg.senderName} • {typeof msg.timestamp === 'object' && msg.timestamp?.seconds ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                           </span>
                        </div>
                      ))}
                      {chatMessages.length === 0 && (
                        <div className="h-full flex items-center justify-center">
                           <div className="text-center space-y-4 max-w-xs">
                              <Sparkles className="mx-auto text-slate-200" size={48} />
                              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-relaxed italic">Wait for designer response...</p>
                           </div>
                        </div>
                      )}
                   </div>

                   <div className="p-6 border-t border-slate-100 bg-white">
                      <div className="flex gap-4 items-center">
                         <label className="w-14 h-14 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center hover:bg-slate-200 transition-all cursor-pointer shadow-sm relative">
                            {isUploadingMedia ? (
                              <div className="absolute inset-0 flex items-center justify-center bg-slate-100 rounded-2xl">
                                <span className="text-[10px] font-black">{uploadProgress}%</span>
                              </div>
                            ) : (
                              <Paperclip size={20} />
                            )}
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*,video/mp4,video/webm"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file || !activeTicketId) return;
                                
                                setIsUploadingMedia(true);
                                setUploadProgress(0);
                                try {
                                  let mediaUrl = "";
                                  const isVideo = file.type.startsWith('video');
                                  
                                  mediaUrl = await storageService.uploadFile(file, (p) => {
                                    setUploadProgress(p.progress || 0);
                                  });
                                  
                                  await firebaseService.sendChatMessage(activeTicketId, {
                                    senderId: user?.uid || 'CUSTOMER',
                                    senderName: user?.displayName || 'Customer',
                                    senderRole: 'customer',
                                    text: "Sent an attachment",
                                    mediaUrl,
                                    mediaType: isVideo ? 'VIDEO' : 'IMAGE'
                                  });
                                } catch (err) {
                                  console.error("Attachment upload error:", err);
                                  alert("Failed to upload attachment: " + (err instanceof Error ? err.message : "Unknown error"));
                                } finally {
                                  setIsUploadingMedia(false);
                                  setUploadProgress(0);
                                  e.target.value = '';
                                }
                              }}
                              disabled={isUploadingMedia}
                            />
                         </label>
                         <input 
                           type="text"
                           value={newMessage}
                           onChange={(e) => setNewMessage(e.target.value)}
                           onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                           placeholder="Type your feedback to the designer..."
                           className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-xs font-bold tracking-tight outline-none"
                         />
                         <button 
                           onClick={handleSendMessage}
                           className="w-14 h-14 bg-slate-900 text-amber-500 rounded-2xl flex items-center justify-center hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                         >
                            <Send size={20} />
                         </button>
                      </div>
                   </div>
                 </>
               ) : (
                 <div className="flex-1 flex flex-col items-center justify-center space-y-6 p-12 text-center">
                    <div className="w-24 h-24 bg-slate-50 rounded-[3rem] flex items-center justify-center text-slate-200 border-4 border-dashed border-slate-100">
                       <MessageSquare size={48} />
                    </div>
                    <div className="space-y-2 max-w-sm">
                       <h4 className="text-lg font-black italic uppercase text-slate-900 tracking-tight">No Active Conversation</h4>
                        <button
                          onClick={() => setIsCreateTicketOpen(true)}
                          className="mt-4 px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 active:scale-95 transition-all inline-flex items-center gap-2"
                        >
                          <Plus size={16} /> Open Support Ticket
                        </button>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-relaxed">Select a ticket from the list to view your conversation history or get in touch with our team.</p>
                    </div>
                 </div>
               )}
            </div>
          </div>
        )}

        {activeTab === 'DASHBOARD' && (
          <div
            className="space-y-8 min-h-[500px]"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between bg-white px-8 py-10 rounded-3xl md:rounded-[3rem] border border-slate-100 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl group-hover:bg-amber-500/10 transition-all pointer-events-none" />
                  <div className="space-y-2 relative z-10">
                    <div className="flex items-center gap-3">
                       <h1 className="text-3xl font-black text-slate-900 uppercase italic leading-none tracking-tight">Campaign Console</h1>
                       <div className="px-3 py-1 bg-amber-500 text-[10px] font-black text-slate-950 rounded-full uppercase tracking-widest shadow-lg shadow-amber-500/20">Active Network</div>
                    </div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em]">Mission Control & Real-time Signal Monitoring</p>
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="flex flex-col items-end">
                       <p className={cn("text-sm font-black tabular-nums tracking-widest", activeDevicesCount > 0 ? "text-green-500" : "text-slate-400")}>
                          {activeDevicesCount > 0 ? 'STATUS: ONLINE' : 'STATUS: SYNCING'}
                       </p>
                       <div className="flex items-center gap-2 mt-1">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                          <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Global Ingress Live</p>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Live Activity / Promotions Banner */}
                {promotions.length > 0 && (
                  <div className="flex flex-wrap gap-4 pb-2">
                    {promotions.map((promo) => (
                      <div key={promo.id} className="min-w-[300px] bg-amber-500 p-6 rounded-[2rem] text-slate-950 relative overflow-hidden shrink-0 shadow-lg shadow-amber-500/10">
                        <div className="relative z-10 space-y-2">
                          <div className="flex items-center gap-2">
                            <Gift size={14} className="animate-bounce" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Exclusive Offer</span>
                          </div>
                          <h3 className="text-lg font-black italic uppercase leading-none">{promo.offer}</h3>
                          <div className="flex items-center gap-2 pt-2">
                            <button 
                              onClick={() => {
                                setCreationStep('DETAILS');
                                openPaymentModal();
                              }}
                              className="px-4 py-1.5 bg-slate-950 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                            >
                              Claim Now
                            </button>
                            <span className="text-[8px] font-black text-slate-900/40 uppercase tracking-widest">Target: {promo.targetRegion || 'Global'}</span>
                          </div>
                        </div>
                        <Zap size={100} className="absolute -right-4 -bottom-4 opacity-10 rotate-12" />
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { label: 'Available Screens', value: totalNetworkUnits.toLocaleString(), icon: <Target size={14} className="text-amber-500" /> },
                    { label: 'Online Screens', value: activeDevicesCount, icon: <Users size={14} className="text-slate-900" /> },
                    { label: 'Uptime Rate', value: `${syncScore}%`, icon: <Zap size={14} className="text-orange-500" /> },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white px-3 py-2.5 rounded-2xl border border-slate-100 flex items-center gap-2.5 shadow-sm hover:border-amber-200 transition-all group overflow-hidden">
                      <div className="p-1.5 bg-slate-50 rounded-lg group-hover:bg-amber-50 transition-colors uppercase shrink-0">{stat.icon}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[6.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5 truncate leading-none">{stat.label}</p>
                        <h3 className="text-xs font-black text-slate-900 tracking-tight italic leading-none truncate">{stat.value}</h3>
                      </div>
                    </div>
                  ))}
                </div>

                {liveCampaign ? (
                  <div className="bg-slate-950 rounded-2xl md:rounded-[2rem] p-4 md:p-8 text-white relative overflow-hidden border border-slate-900 shadow-xl">
                     <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-3">
                           <span className="px-2 py-0.5 bg-amber-500 text-black rounded text-[8px] font-black uppercase tracking-widest italic animate-pulse">ACTIVE CAMPAIGN</span>
                           <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic">Ad ID: {liveCampaign.id.slice(-6)}</span>
                        </div>
                        <h2 className="text-2xl font-black italic text-white uppercase">{liveCampaign.title}</h2>
                           <div className="flex gap-10">
                              <div>
                                 <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest mb-1 italic">Active Screens</p>
                                 <p className="text-white font-black text-lg italic tabular-nums">{(liveCampaign.assignedDrivers?.length || 0)} Screens</p>
                              </div>
                              <div>
                                 <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest mb-1 italic">Target Area</p>
                                 <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50" />
                                    <p className="text-white font-black text-lg uppercase italic">{liveCampaign.targetArea || 'Global'}</p>
                                 </div>
                              </div>
                           </div>
                     </div>
                     <div className="absolute top-1/2 -right-6 -translate-y-1/2 opacity-[0.05] rotate-12 scale-125">
                        <BarChart3 size={150} />
                     </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl md:rounded-[2rem] p-4 md:p-8 text-slate-900 relative overflow-hidden border border-slate-100 shadow-sm">
                     <div className="relative z-10 space-y-4 max-w-xs">
                        <span className="px-2 py-0.5 bg-slate-900 text-white rounded text-[8px] font-black uppercase tracking-widest italic">Ready to Start</span>
                        <h2 className="text-xl font-black italic text-slate-900 uppercase">Launch Ad Campaign</h2>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed italic text-balance">Create a custom campaign to display your ads on available vehicle screens.</p>
                        <button 
                          onClick={() => {
                            setCreationStep('DETAILS');
                            openPaymentModal();
                          }}
                          className="px-4 py-2 bg-amber-500 text-slate-950 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/10 hover:bg-amber-400 transition-all active:scale-95"
                        >
                          Launch New Campaign
                        </button>
                     </div>
                     <div className="absolute top-1/2 -right-8 -translate-y-1/2 opacity-5 rotate-12">
                        <Zap size={180} />
                     </div>
                  </div>
                )}

                {/* Compact Recent Activity Instead of Full Table */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest italic">Recent Campaigns</h3>
                    <button onClick={() => setActiveTab('CAMPAIGNS')} className="text-[8px] font-black text-amber-600 uppercase tracking-widest hover:underline">View All</button>
                  </div>
                  <div className="bg-white border border-slate-100 rounded-2xl divide-y divide-slate-50 overflow-hidden">
                        {myCampaigns.slice(0, 3).map((ad) => (
                          <div key={ad.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-amber-500">
                                 {ad.mediaType === 'VIDEO' ? <PlayCircle size={14} /> : <ImageIcon size={14} />}
                              </div>
                              <div>
                             <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{ad.title}</p>
                             <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">ID: {shortenId(ad.id)} | {ad.targetArea || 'Global'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={cn("px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest", 
                                ad.status === 'ACTIVE' || ad.status === 'LIVE' ? "bg-slate-900 text-amber-500" :
                                ad.status === 'AWAITING_PAYPORTAL' || !ad.paymentReceived ? "bg-amber-50 text-amber-600 border border-amber-100 animate-pulse" :
                                "bg-slate-100 text-slate-400"
                              )}>
                                {ad.status === 'AWAITING_PAYPORTAL' || !ad.paymentReceived ? "Awaiting Payment" : ad.status}
                              </div>
                              {!ad.paymentReceived && (
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    openPaymentModal(ad.id);
                                  }}
                                  className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[7px] uppercase tracking-wider rounded transition-all flex items-center gap-1 shadow"
                                >
                                  <CreditCard size={10} />
                                  <span>Pay Now</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                    {myCampaigns.length === 0 && (
                      <div className="p-8 text-center space-y-4">
                        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest italic">No Global Events Registered</p>
                        <button 
                          onClick={() => firebaseService.seedInitialData()}
                          className="mx-auto flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all"
                        >
                          <Database size={10} />
                          Seed Sample Data
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className={cn("space-y-1 p-6 rounded-[2rem] border shadow-sm transition-all duration-500 relative overflow-hidden", 
                  activePlan === 'BASIC' ? "bg-emerald-50/50 border-emerald-100" : 
                  activePlan === 'PRO' ? "bg-indigo-50/50 border-indigo-100" : 
                  "bg-slate-50 border-slate-200"
                )}>
                   <div className={cn("absolute top-0 right-0 w-24 h-24 blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2", selectedPlan?.color)} />
                   <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest italic relative z-10">Targeting Subscription</h3>
                   <div className="flex items-center gap-2 relative z-10">
                      <div className={cn("w-2 h-2 rounded-full animate-pulse", selectedPlan?.color)} />
                      <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest italic">Active Tier: {selectedPlan?.name}</p>
                   </div>
                </div>
            
                <div className="space-y-2">
                  {mergedPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className={cn(
                        "w-full p-4 bg-white rounded-2xl border transition-all text-left relative overflow-hidden group",
                        activePlan === plan.id 
                          ? cn("ring-2 shadow-md translate-x-1", 
                               plan.id === 'REEL' ? "border-emerald-500 ring-emerald-50" : 
                               plan.id === 'EDIT' ? "border-indigo-500 ring-indigo-50" : 
                               plan.id === 'MOTION' ? "border-violet-500 ring-violet-50" :
                               "border-slate-900 ring-slate-50")
                          : "border-slate-100 hover:border-slate-300 shadow-sm hover:translate-x-1"
                      )}
                    >
                      <button className="w-full text-left" onClick={() => handleActivePlanChange(plan.id)}>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-start justify-between">
                            <div className="space-y-0.5">
                              <h4 className="text-xs font-black text-slate-900 tracking-tight uppercase italic leading-tight">{plan.name}</h4>
                              <p className="text-[7px] text-slate-400 font-bold uppercase tracking-widest italic">{plan.unitCount || 'Standard Access'}</p>
                            </div>
                            <div className="flex flex-col items-end">
                              <input 
                                type="text"
                                value={plan.price}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => updatePlanPrice(plan.id, e.target.value)}
                                className="w-20 text-right text-base font-black text-slate-900 italic tracking-tight tabular-nums leading-tight bg-transparent border-b border-slate-300 focus:border-amber-500 outline-none"
                              />
                              <p className="text-[7px] text-slate-400 font-bold uppercase mt-0.5">/ cycle</p>
                            </div>
                          </div>
                        </div>
                      </button>
                      {activePlan === plan.id && (
                        <motion.div layoutId="plan-pulse-small" className="absolute -top-6 -right-6 w-16 h-16 bg-amber-500/10 rounded-full blur-xl" />
                      )}
                    </div>
                  ))}
                </div>

                <div className="p-6 bg-slate-950 rounded-[2rem] space-y-6 text-white shadow-xl relative overflow-hidden border border-slate-900">
                   <div className="relative z-10">
                      <button 
                        onClick={() => {
                          setCreationStep('DETAILS');
                          openPaymentModal();
                        }}
                        className="w-full bg-amber-500 text-slate-950 rounded-xl py-4 font-black text-[10px] uppercase tracking-[0.15em] hover:bg-amber-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                      >
                        Initiate Payment <ArrowUpRight size={14} />
                      </button>
                   </div>
                   <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-32 h-32 bg-amber-500/5 blur-3xl pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Removed OFFERS tab as requested - consolidated into DASHBOARD */}

        {activeTab === 'HISTORY' && renderHistoryTab()}
        {/* Removed Studio and Subs tabs */}

        
        {activeTab === 'CAMPAIGNS' && (
          <div
            className="space-y-8 bg-slate-50 min-h-[500px] p-6 lg:p-12 rounded-[2rem] border border-slate-200"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
               <div>
                  <h1 className="text-3xl font-black italic uppercase text-slate-900 tracking-tight leading-none flex items-center gap-2">
                     <Target className="text-amber-500" /> Campaign Portfolio
                  </h1>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Tracking and managing your active signals</p>
               </div>
               <div className="flex gap-3">
                  <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase text-slate-400 hover:text-slate-900 transition-colors">Active Only</button>
                  <button 
                    onClick={(e) => handleExtractionClick(e, myCampaigns, "My_Campaign_Report")}
                    disabled={isExtracting}
                    className={cn(
                      "px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                      isExtracting ? "opacity-50 animate-pulse" : "hover:bg-slate-800"
                    )}
                  >
                    {isExtracting ? "Extracting..." : "Export Report"}
                  </button>
               </div>
            </div>

            <div className="glass-card rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm">
               <div className="w-full">
                  <table className="w-full text-left border-collapse">
                     <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100 italic">
                           <th className="px-10 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Network Signal</th>
                           <th className="px-10 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Geo-Target Zone</th>
                           <th className="px-10 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Uptime Meta</th>
                           <th className="px-10 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Command Center</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 text-slate-900">
                        {myCampaigns.map((ad, i) => (
                           <tr key={ad.id} className="hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-all group cursor-pointer italic">
                              <td className="px-10 py-12">
                                 <div className="flex items-center gap-6">
                                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-amber-500 overflow-hidden shrink-0">
                                       {ad.mediaType === 'VIDEO' ? <PlayCircle size={20} /> : <ImageIcon size={20} />}
                                    </div>
                                    <div>
                                       <p className="text-sm font-bold text-slate-900 tracking-tight leading-none mb-1 uppercase italic">{ad.title}</p>
                                       <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest italic">{ad.timestamp ? new Date(ad.timestamp).toLocaleDateString() : 'N/A'}</p>
                                       {(() => {
                                         const exp = getCampaignExpiration(ad);
                                         if (!exp) return null;
                                         return (
                                           <div className="mt-1.5 flex flex-wrap items-center gap-1.5 leading-none">
                                             <span className={cn(
                                               "text-[7px] font-extrabold uppercase px-1 py-0.5 rounded tracking-wider leading-none",
                                               exp.expired 
                                                 ? "bg-rose-50 text-rose-600 border border-rose-100" 
                                                 : "bg-blue-50 text-blue-600 border border-blue-100 animate-pulse"
                                             )}>
                                               {exp.timeLeftStr}
                                             </span>
                                             <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                               (Expires {exp.formattedDate})
                                             </span>
                                           </div>
                                         );
                                       })()}
                                    </div>
                                 </div>
                              </td>
                              <td className="px-10 py-12">
                                 <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-slate-600 uppercase italic">{ad.targetCity}</span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{ad.targetState}</span>
                                 </div>
                              </td>

                              <td className="px-8 py-6">
                                 <div className="flex flex-col gap-2">
                                   <span className={cn("text-[8px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border w-fit", 
                                      !ad.paymentReceived && ad.status === 'PENDING' ? "bg-red-50 text-red-600 border-red-100 animate-pulse" :
                                      ad.status === 'PENDING' || ad.status === 'PENDING_VERIFICATION' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                      ad.status === 'APPROVED' ? "bg-green-50 text-green-600 border-green-100" :
                                      ad.status === 'ACTIVE' || ad.status === 'LIVE' ? "bg-slate-900 text-amber-500 border-slate-900 shadow-lg" :
                                      "bg-red-50 text-red-600 border-red-100"
                                   )}>
                                      {!ad.paymentReceived && (ad.status === 'PENDING' || ad.status === 'AWAITING_PAYPORTAL') ? "PAYMENT FAILED / INCOMPLETE" :
                                       ad.paymentReceived && !ad.mediaReceived && !ad.needDesigner && ad.status === 'PENDING' ? "WAITING FOR MEDIA" : 
                                       ad.paymentReceived && ad.needDesigner && ad.status === 'PENDING' ? "DESIGNER ASSIGNED" :
                                       ad.paymentReceived && (ad.mediaReceived || ad.mediaUrl || ad.assetUrl) && (ad.status === 'PENDING' || ad.status === 'PENDING_VERIFICATION') ? "PENDING TEAM APPROVAL" :
                                       ad.status === 'REJECTED' ? "REJECTED (RE-UPLOAD)" :
                                       ad.status?.replace('_', ' ')}
                                   </span>
                                   {ad.paymentReceived && (
                                      <span className="text-[7px] font-black text-green-600 uppercase tracking-widest bg-green-50 px-2 py-0.5 rounded w-fit flex items-center gap-1">
                                         <CheckCircle size={8} /> Payment Verified
                                      </span>
                                   )}
                                   {ad.paymentId && (
                                     <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded w-fit">
                                       Pay ID: {ad.paymentId}
                                     </span>
                                   )}
                                   {ad.needDesigner && ad.status === 'PENDING' && (
                                     <span className="text-[7px] font-black text-blue-500 uppercase tracking-widest italic">
                                       Designer Assigned via Ticket
                                     </span>
                                   )}
                                 </div>
                              </td>
<td className="px-8 py-6">
                                 <div className="flex items-center gap-2">
                                    {!ad.paymentReceived ? (
                                       <button 
                                         onClick={(e) => {
                                           e.preventDefault();
                                           e.stopPropagation();
                                           openPaymentModal(ad.id);
                                         }}
                                         className="cursor-pointer px-4.5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl hover:from-amber-600 hover:to-amber-700 hover:shadow-lg transition-all text-[8px] font-black uppercase tracking-widest flex items-center gap-2"
                                       >
                                         <CreditCard size={14} />
                                         <span>Pay Now</span>
                                       </button>
                                    ) : (
                                       (!ad.assetUrl && !ad.mediaUrl) && (
                                          <div 
                                            className="flex items-center gap-2"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                             <input 
                                               type="file" 
                                               id={`upload-${ad.id}`}
                                               className="hidden" 
                                               accept="image/*,video/*"
                                               onChange={(e) => {
                                                 const file = e.target.files?.[0];
                                                 if (file) handleUploadMediaToCampaign(ad.id, file);
                                               }}
                                             />
                        <button 
                                               onClick={(e) => {
                                                 e.preventDefault();
                                                 document.getElementById(`upload-${ad.id}`)?.click();
                                               }}
                                               className="cursor-pointer p-2.5 bg-amber-100 text-amber-600 rounded-xl hover:bg-amber-500 hover:text-white transition-all shadow-sm flex items-center gap-2"
                                             >
                                               <Upload size={14} />
                                               <span className="text-[8px] font-black uppercase">{(ad.assetUrl || ad.mediaUrl) ? "Replace" : "Choose File"}</span>
                                             </button>
                                          </div>
                                       )
                                    )}
                                    <button className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                                       <ArrowUpRight size={16} />
                                    </button>
                                 </div>
                              </td>
                           </tr>
                        ))}
                        {myCampaigns.length === 0 && (
                           <tr>
                              <td colSpan={4} className="px-8 py-16 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest italic leading-relaxed">Disconnected from Active Network. Launch New Campaign to Sync.</td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>

            {/* Assets Grid */}
            <div className="space-y-6 pt-12 border-t border-slate-100">
               <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] italic underline decoration-amber-500 underline-offset-8">Creative Assets Library</h3>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">{myCampaigns.length} Integrated Assets</p>
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div 
                    onClick={() => {
                      setCreationStep('DETAILS');
                      openPaymentModal();
                    }}
                    className="aspect-[4/3] bg-white border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-slate-50 hover:border-amber-300 group transition-all"
                  >
                     <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-amber-500 group-hover:rotate-90 transition-transform shadow-lg shadow-slate-200">
                        <Plus size={20} />
                     </div>
                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-8 text-center leading-relaxed italic">Deposit Funds to Upload Assets</p>
                  </div>
                  
                  {myCampaigns.map((ad) => (
                     <div key={`asset-${ad.id}`} className="aspect-[4/3] bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative">
                        <div className="h-full w-full bg-slate-950 relative">
                           <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                               {((ad.mediaType || ad.type) === 'VIDEO') ? (
                                 (ad.assetUrl || ad.mediaUrl) ? (
                                   <video src={getSafeUrl(ad.assetUrl || ad.mediaUrl)} className="w-full h-full object-cover" muted playsInline loop onMouseOver={(e) => e.currentTarget.play()} onMouseOut={(e) => e.currentTarget.pause()} />
                                 ) : (
                                   <PlayCircle className="text-slate-800" size={48} />
                                 )
                               ) : (
                                 (ad.assetUrl || ad.mediaUrl) ? (
                                   <img src={getSafeUrl(ad.assetUrl || ad.mediaUrl)} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt={ad.title} />
                                 ) : (
                                   <ImageIcon className="text-slate-800" size={48} />
                                 )
                               )}
                           </div>
                           
                           {(!ad.assetUrl && !ad.mediaUrl) && (
                             <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-slate-950/20 backdrop-blur-[2px]">
                                <input 
                                   type="file" 
                                   id={`q-up-${ad.id}`}
                                   className="hidden" 
                                   accept="image/*,video/*"
                                   onChange={(e) => {
                                     const file = e.target.files?.[0];
                                     if (file) handleUploadMediaToCampaign(ad.id, file);
                                   }}
                                />
                                <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     document.getElementById(`q-up-${ad.id}`)?.click();
                                   }}
                                   className="px-4 py-2 bg-amber-500 text-slate-950 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all"
                                >
                                   Upload Media
                                </button>
                                <p className="text-[7px] font-bold text-amber-500 uppercase mt-2 tracking-widest">Awaiting Data</p>
                             </div>
                           )}

                           <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 to-transparent">
                              <p className="text-[9px] font-black text-white uppercase tracking-tight truncate italic">{ad.title}</p>
                              <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest italic">{ad.type} • {ad.targetCity}</p>
                              {(() => {
                                const exp = getCampaignExpiration(ad);
                                if (!exp) return null;
                                return (
                                  <p className={cn("text-[7px] font-black uppercase tracking-wider mt-0.5", exp.expired ? "text-rose-500" : "text-amber-500")}>
                                    {exp.timeLeftStr} ({exp.formattedDate})
                                  </p>
                                );
                              })()}
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'DESIGN_HELP' && (
          <div
            className="space-y-8 bg-slate-50 min-h-[500px] p-6 lg:p-12 rounded-[2rem] border border-slate-200"
          >
             <div className="max-w-4xl mx-auto space-y-10 py-10 opacity-100">
                <div className="text-center space-y-4">
                   <div className="w-20 h-20 bg-amber-500/10 rounded-[2rem] flex items-center justify-center text-amber-500 mx-auto border border-amber-500/20 shadow-2xl shadow-amber-500/5">
                      <Sparkles size={40} />
                   </div>
                   <div className="space-y-2">
                      <h2 className="text-3xl font-black italic text-slate-900 uppercase tracking-tight leading-relaxed">Professional Designer Service</h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Scale your story with expert design strategy</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="glass-card p-10 rounded-[3rem] bg-white border border-slate-100 shadow-xl space-y-8">
                      <div className="space-y-4">
                         <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest italic leading-none">Standard Creative</h4>
                         <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Perfect for quick announcements, offers, and regional targeting.</p>
                         <h3 className="text-3xl font-black italic text-slate-900 tracking-tight">₹1000</h3>
                      </div>
                      <ul className="space-y-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                         <li className="flex items-center gap-3"><CheckCircle2 size={14} className="text-amber-500" /> Professional 4K Static Design</li>
                         <li className="flex items-center gap-3"><CheckCircle2 size={14} className="text-amber-500" /> Single Revision Cycle</li>
                         <li className="flex items-center gap-3"><CheckCircle2 size={14} className="text-amber-500" /> Ad Policy Compliance Check</li>
                         <li className="flex items-center gap-3"><CheckCircle2 size={14} className="text-amber-500" /> 24-Hour Signal Ready Delivery</li>
                      </ul>
                      <button 
                         onClick={() => handleRequestDesign('Standard Creative')}
                         className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200"
                      >
                        Request Strategy
                      </button>
                   </div>

                   <div className="glass-card p-10 rounded-[3rem] bg-slate-900 border border-slate-800 shadow-2xl space-y-8 relative overflow-hidden group">
                      <div className="absolute -top-10 -right-10 bg-amber-500/10 w-40 h-40 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-all" />
                      <div className="space-y-4 relative z-10">
                         <h4 className="text-sm font-black text-amber-500 uppercase tracking-widest italic leading-none">Video Ads Service</h4>
                         <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">High-Impact 1080p motion graphics to grab maximum network attention.</p>
                         <h3 className="text-3xl font-black italic text-white tracking-tight">₹2000</h3>
                      </div>
                      <ul className="space-y-4 text-[10px] font-black uppercase text-slate-300 tracking-widest relative z-10">
                         <li className="flex items-center gap-3"><CheckCircle2 size={14} className="text-amber-500" /> Custom Motion Narrative (15s)</li>
                         <li className="flex items-center gap-3"><CheckCircle2 size={14} className="text-amber-500" /> Multi-Layered Visual Brand FX</li>
                         <li className="flex items-center gap-3"><CheckCircle2 size={14} className="text-amber-500" /> Strategic CTA Optimization</li>
                         <li className="flex items-center gap-3"><CheckCircle2 size={14} className="text-amber-500" /> 72-Hour Prime Delivery</li>
                      </ul>
                      <button 
                         onClick={async () => {
                           // Raise the ticket automatically
                           if (!user) return;
                           const ticketId = await firebaseService.createSupportTicket({
                             customerId: user.uid,
                             customerName: user.displayName || 'Customer',
                             title: 'New Video Ad Request',
                             description: 'Customer requested professional video ad creation service.',
                             priority: 'HIGH',
                             category: 'Design Strategy',
                             type: 'CUSTOMER'
                           });
                           setActiveTicketId(ticketId);
                           setActiveTab('TICKETS');
                           triggerToast("Our video team will contact you shortly!", "success");
                         }}
                         className="w-full py-5 bg-amber-500 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-400 transition-all shadow-2xl shadow-amber-500/20 relative z-10"
                      >
                        Start Expert Consultation
                      </button>
                   </div>
                </div>
             </div>
          </div>
        )}
        {/* Production Footer Section */}
        <div className="pt-20 pb-10 mt-auto">
          <div className="bg-slate-900 rounded-[3rem] p-12 text-center space-y-8 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
             <h2 className="text-4xl font-black text-white italic uppercase tracking-tight">GROW YOUR BRAND</h2>
             <p className="text-slate-400 max-w-md mx-auto text-sm font-medium tracking-tight">Smart vehicle advertising for your business. Verified reach on the move.</p>
             <button 
               onClick={() => openPaymentModal()}
               className="px-10 py-5 bg-amber-500 text-slate-900 rounded-2xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-amber-500/20"
             >
               START NEW CAMPAIGN
             </button>

             {/* Compliance Directory */}
             <div className="pt-12 mt-12 border-t border-white/5 grid grid-cols-2 lg:grid-cols-4 gap-8 text-left">
                <div className="col-span-2 space-y-4 pr-12">
                   <div className="flex items-center gap-2">
                       <span className="text-sm font-black text-white uppercase italic tracking-tighter shrink-0">AutoAds / <span className="text-amber-500">Mayaan</span></span>
                   </div>
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">India's smartest advertising grid. Leveraging AI-driven location intelligence to deliver deep brand impact in transit.</p>
                   <div className="flex items-center gap-4 pt-2">
                      <div className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[6px] font-black text-slate-400 uppercase">Razorpay Integrated</div>
                      <div className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[6px] font-black text-slate-400 uppercase">AES-256 Verified</div>
                   </div>
                </div>
                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest leading-none">Resources</h4>
                   <ul className="space-y-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <li className="hover:text-white cursor-pointer transition-colors" onClick={() => { setLegalPage('ABOUT'); setActiveTab('LEGAL'); window.scrollTo(0,0); }}>Company Map</li>
                      <li className="hover:text-white cursor-pointer transition-colors" onClick={() => { setLegalPage('CONTACT'); setActiveTab('LEGAL'); window.scrollTo(0,0); }}>Contact Help</li>
                   </ul>
                </div>
                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest leading-none">Rules</h4>
                   <ul className="space-y-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <li className="hover:text-white cursor-pointer transition-colors" onClick={() => { setLegalPage('PRIVACY'); setActiveTab('LEGAL'); window.scrollTo(0,0); }}>Privacy Center</li>
                      <li className="hover:text-white cursor-pointer transition-colors" onClick={() => { setLegalPage('TERMS'); setActiveTab('LEGAL'); window.scrollTo(0,0); }}>Platform Terms</li>
                      <li className="hover:text-white cursor-pointer transition-colors" onClick={() => { setLegalPage('CONTACT'); setActiveTab('LEGAL'); window.scrollTo(0,0); }}>Support Center</li>
                   </ul>
                </div>
             </div>
             
             <div className="pt-8 flex flex-col sm:flex-row justify-between items-center border-t border-white/5 gap-4">
                <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em]">© 2026 AUTOADS NETWORK LIVE / MAYAAN GROUP</p>
                <div className="flex gap-4 opacity-40 grayscale">
                   <img src="https://img.icons8.com/color/48/razorpay.png" className="h-4" alt="Razorpay" />
                   <img src="/mayaan_logo.svg" className="h-4" alt="Mayaan Group" />
                </div>
             </div>
          </div>
        </div>
      </main>

      {/* Success Modal */}
      <AnimatePresence>
        {(paymentConfirmed || localPaymentSuccess) && (
          <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-[300] bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-4"
          >
             <motion.div
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="bg-white p-10 rounded-[3rem] shadow-2xl text-center space-y-6 max-w-sm w-full"
             >
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-green-500/10">
                   <CheckCircle size={40} />
                </div>
                <div className="space-y-2">
                   <h2 className="text-2xl font-black italic uppercase text-slate-900">Success!</h2>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment verified and campaign activated.</p>
                </div>
                <button 
                  onClick={() => {
                    setSuccessDismissed(true);
                    setLocalPaymentSuccess(false);
                    setShowSuccessModal(false);
                    setCreationStep('MEDIA');
                  }}
                  className="w-full py-4 bg-amber-500 text-slate-950 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-400 transition-all"
                >
                   Continue to Media
                </button>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment & Designer Portal Modal */}
      <AnimatePresence>
        {showPayment && (
          <div className="fixed inset-0 z-[200] overflow-y-auto flex items-start justify-center p-4 sm:p-6 lg:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPayment(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              key={workflowState}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden my-auto"
            >
              <div className={cn("p-8 text-white flex items-center justify-between relative", selectedPlan?.color)}>
                <div className="flex items-center gap-4">
                  {workflowState !== 'DETAILS' && (
                    <motion.button 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => {
                        setCreatedCampaignId(null);
                        setActiveCampaignData(null);
                      }}
                      className="p-2 bg-white/20 hover:bg-white/40 rounded-full transition-all flex items-center justify-center"
                    >
                      <ArrowLeft size={18} />
                    </motion.button>
                  )}
                  <div>
                    <h3 className="text-2xl font-black italic tracking-tight uppercase flex items-center gap-2">
                      {workflowState === 'DETAILS' ? "Campaign Config" : "Secure Payment"}
                      {isFirestoreOffline && (
                        <span className="text-[8px] bg-amber-500 text-white font-black px-2 py-0.5 rounded uppercase tracking-widest animate-pulse flex items-center gap-1">
                          <Activity size={10} /> RECONNECTING
                        </span>
                      )}
                    </h3>
                    <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest italic tracking-wider">
                      {isFirestoreOffline ? "Offline. Restoring services gracefully..." : (workflowState === 'DETAILS' ? "Configure Target Audience" : "Process Secure Payment")}
                    </p>
                  </div>
                </div>
                <button onClick={() => { setShowPayment(false); setCreatedCampaignId(null); setActiveCampaignData(null); }} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {workflowState === 'DETAILS' ? (
                  <div className="space-y-6">
                    {/* ... (Existing detail fields) */}
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1">Campaign Title</label>
                      <input 
                        type="text"
                        value={campaignDetails.title}
                        onChange={(e) => setCampaignDetails({...campaignDetails, title: e.target.value})}
                        placeholder="e.g. Summer Mega Sale 2026"
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-bold tracking-tight focus:ring-1 focus:ring-amber-500 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Select State</label>
                          <select 
                            value={selectedState}
                            onChange={(e) => {
                              setSelectedState(e.target.value);
                              setSelectedCity(states[e.target.value as keyof typeof states][0]);
                            }}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-bold uppercase tracking-tight focus:ring-1 focus:ring-amber-500 outline-none text-slate-900 shadow-sm"
                          >
                            <option value="">Choose State</option>
                            {Object.keys(states).map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Select City</label>
                          <select 
                            value={selectedCity}
                            onChange={(e) => setSelectedCity(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-bold uppercase tracking-tight focus:ring-1 focus:ring-amber-500 outline-none text-slate-900 shadow-sm"
                          >
                            {selectedState && states[selectedState as keyof typeof states] ? (
                              states[selectedState as keyof typeof states].map(c => <option key={c} value={c}>{c}</option>)
                            ) : (
                              <option value="">First pick state</option>
                            )}
                          </select>
                        </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl border border-amber-100">
                        <div className="flex flex-col">
                           <p className="text-[10px] font-bold text-slate-900 uppercase tracking-tight leading-none">Selected Tier</p>
                           <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-1">{selectedPlan.name} • {selectedPlan.unitCount}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-lg font-black text-slate-900 tracking-tight italic leading-tight">{selectedPlan.price}</p>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                               <div className="w-8 h-8 bg-white border rounded-lg flex items-center justify-center text-amber-500 shadow-sm">
                                  <Sparkles size={14} />
                               </div>
                               <div>
                                  <p className="text-[10px] font-bold text-slate-900 uppercase">Need Creative Help?</p>
                                  <p className="text-[8px] text-slate-400 uppercase">₹1,000 for Professional Design</p>
                               </div>
                            </div>
                            <button 
                              onClick={() => setNeedDesigner(!needDesigner)}
                              className={cn("px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all", needDesigner ? "bg-slate-900 text-white" : "bg-white text-slate-400 border border-slate-200")}
                            >
                              {needDesigner ? 'Added' : 'Add'}
                            </button>
                         </div>
                      </div>
                    </div>



                    {/* Optional Media Payload Attachment */}
                    <div className="space-y-2 p-5 bg-slate-50 border border-slate-100 rounded-2xl relative">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                         Creative payload (Optional)
                       </label>
                       
                       {!optionalUploadFile ? (
                          <div 
                            onClick={() => document.getElementById('optional-creative-file')?.click()}
                            className="border-2 border-dashed border-slate-250 hover:border-amber-500/40 bg-white rounded-xl p-6 text-center cursor-pointer transition-all hover:bg-slate-50/50 flex flex-col items-center gap-2"
                          >
                             <Upload size={20} className="text-slate-400 group-hover:text-amber-500" />
                             <p className="text-[10px] font-bold text-slate-700 uppercase">Attach file for ad screening</p>
                             <p className="text-[8px] text-slate-400 uppercase">(Image or Video up to 100MB)</p>
                             <input 
                               type="file" 
                               id="optional-creative-file" 
                               className="hidden" 
                               accept="image/*,video/*" 
                               onChange={(e) => {
                                 const f = e.target.files?.[0];
                                 if (f) setOptionalUploadFile(f);
                               }}
                             />
                          </div>
                       ) : (
                          <div className="flex flex-col gap-2">
                             <div className="flex items-center justify-between bg-slate-950 text-white rounded-xl p-3 shadow-md">
                                <div className="flex items-center gap-3">
                                   <div className="p-2 bg-white/10 rounded-lg text-amber-500">
                                      {optionalUploadFile.type.startsWith('video/') ? <PlayCircle size={16} /> : <ImageIcon size={16} />}
                                   </div>
                                   <div className="text-left">
                                      <p className="text-[9px] font-bold uppercase tracking-tight max-w-[150px] truncate">{optionalUploadFile.name}</p>
                                      <p className="text-[7px] text-slate-400 uppercase">Size: {(optionalUploadFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                                   </div>
                                </div>
                                <button 
                                  onClick={() => setOptionalUploadFile(null)}
                                  className="p-1.5 hover:bg-white/10 text-rose-450 hover:text-rose-550 rounded-lg transition-colors"
                                >
                                   <X size={14} />
                                </button>
                             </div>
                             {isUploadingOptional && (
                                <div className="space-y-1">
                                   <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${optionalUploadProgress}%` }} />
                                   </div>
                                   <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest text-right">Uploading: {optionalUploadProgress}%</p>
                                </div>
                             )}
                          </div>
                       )}
                       <p className="text-[8px] text-slate-400 uppercase leading-relaxed">
                         Note: Leaving this blank allows you to upload media later or have support design it for you.
                       </p>
                    </div>

                    <button 
                      onClick={async () => {
                        const isValidIndianPhone = /^[6-9]\d{9}$/.test(phone);
                        if (!campaignDetails.title) {
                          triggerToast('Please enter a campaign title.', 'error');
                          return;
                        }
                        if (!selectedCity) {
                          triggerToast('Please select a target city.', 'error');
                          return;
                        }
                        if (!isValidIndianPhone) {
                          triggerToast('Please enter a valid 10-digit Indian mobile number (starting with 6-9).', 'error');
                          return;
                        }
                        try {
                           setLoading(true);
                           
                           // Create the campaign on Firestore first
                           const campaignRef = await firebaseService.createCampaign({
                             title: campaignDetails.title,
                             status: 'AWAITING_PAYPORTAL',
                             type: campaignDetails.type,
                             assetUrl: campaignDetails.asset || '',
                             videoThumbnail: videoThumbnail || '',
                             customerId: user?.uid || '',
                             targetCity: selectedCity === 'Other' ? customCity : selectedCity,
                             targetState: selectedState,
                             duration: campaignDetails.duration,
                             needDesigner: !!needDesigner,
                             paymentReceived: false
                           });

                           setCreatedCampaignId(campaignRef.id);
                           localStorage.setItem('last_created_campaign', campaignRef.id);

                           // If file is selected, upload to S3 first
                           if (optionalUploadFile) {
                             try {
                               setIsUploadingOptional(true);
                               setOptionalUploadProgress(0);
                               triggerToast('Uploading optional campaign creative payload to AWS S3...', 'info');
                               
                               const res = await storageService.uploadCampaignMedia(campaignRef.id, optionalUploadFile, (p) => {
                                 setOptionalUploadProgress(p);
                               });
                               
                               const mediaType = optionalUploadFile.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';
                               
                               await firebaseService.updateCampaign(campaignRef.id, {
                                 assetUrl: res.url,
                                 mediaUrl: res.url,
                                 videoThumbnail: res.thumbnailUrl || "",
                                 mediaType: mediaType,
                                 type: mediaType,
                                 mediaReceived: true
                               });
                               
                               triggerToast('Optional ad media uploaded to AWS!', 'success');
                               setOptionalUploadFile(null); // Reset
                             } catch (uploadErr) {
                               console.error("AWS Upload error:", uploadErr);
                               triggerToast('Failed optional S3 uploading, proceeding with regular configuration.', 'error');
                             } finally {
                               setIsUploadingOptional(false);
                               setOptionalUploadProgress(0);
                             }
                           }
                           
                           openPaymentModal(campaignRef.id);
                           await prepareOrder(campaignRef.id);
                         } catch (err: any) {
                           console.error("Campaign pre-creation error:", err);
                           triggerToast("Campaign setup failed: " + err.message, "error");
                         } finally {
                           setLoading(false);
                         }
                      }}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                    >
                      Launch Campaign <ChevronRight size={16} />
                    </button>
                  </div>
                ) : workflowState === 'PAYMENT_PROCESSING' ? (
                  <div className="space-y-6 py-12 flex flex-col items-center text-center">
                    <motion.div
                       animate={{ rotate: 360 }}
                       transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                       className="w-16 h-16 border-4 border-amber-500 border-t-white rounded-full mx-auto"
                    />
                    <div>
                       <h4 className="text-xl font-black italic uppercase tracking-tight text-slate-900 mt-4">Verifying Payment</h4>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Please wait. Do not close this window.</p>
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Checking cryptographic signatures...</p>
                    </div>
                  </div>
                ) : workflowState === 'FAILED' ? (
                  <div className="space-y-6 py-8 text-center font-sans">
                     <div className="w-20 h-20 bg-red-100 text-red-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-red-500/20">
                        <AlertCircle size={40} />
                     </div>
                     <div>
                        <h4 className="text-2xl font-black italic uppercase tracking-tight text-slate-900">Payment Failed</h4>
                        <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mt-1">Verification could not be completed</p>
                     </div>
                     <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-red-800 text-[11px] font-mono">
                        {paymentResult?.error || 'Unknown error occurred during payment verification.'}
                     </div>
                     <div className="pt-4">
                        <button onClick={() => {
                          setCreatedCampaignId(null);
                          setActiveCampaignData(null);
                        }} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-all">
                           Try Again
                        </button>
                     </div>
                  </div>
                ) : (
                  <div className="space-y-6 py-6 font-sans">
                    <div className="text-center space-y-4">
                       <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-[2rem] flex items-center justify-center mx-auto">
                          <CreditCard size={32} />
                       </div>
                       <div>
                          <h4 className="text-xl font-black italic uppercase tracking-tight text-slate-900">Gateway Ready</h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Complete your transaction to unlock media upload</p>
                       </div>
                    </div>

                    <div className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] space-y-4">
                       <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 pb-3">
                          <span>Description</span>
                          <span>Value</span>
                       </div>
                       <div className="flex justify-between items-center text-[11px] font-black uppercase text-slate-900">
                          <span>{selectedPlan.name} Tier</span>
                          <span>{selectedPlan.price}</span>
                       </div>
                       {needDesigner && (
                         <div className="flex justify-between items-center text-[11px] font-black uppercase text-amber-600 font-extrabold italic">
                            <span>Creative Strategy Fee</span>
                            <span>₹1,000</span>
                         </div>
                       )}
                       <div className="flex justify-between items-center pt-3 border-t-2 border-slate-200 text-lg font-black italic uppercase text-slate-900">
                          <span>Total Deployment Fee</span>
                          <span>₹{(typeof selectedPlan.price === 'string' ? parseFloat(selectedPlan.price.replace(/[^0-9.]/g, '')) : selectedPlan.price) + (needDesigner ? 1000 : 0)}</span>
                       </div>
                    </div>

                                         <button 
                      onClick={handlePaymentAndSubmit}
                      disabled={loading}
                      className={cn(
                        "w-full py-5 rounded-2xl font-black text-[14px] uppercase tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-3",
                        orderData 
                          ? "bg-green-600 text-white hover:bg-green-500 shadow-green-500/20" 
                          : "bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-amber-500/20"
                      )}
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-slate-900/20 border-t-slate-900 rounded-full animate-spin" />
                      ) : (
                        <>
                          {orderData ? "LAUNCH PAYMENT PORTAL" : "PAY NOW"} <Zap size={16} fill="currentColor" />
                        </>
                      )}
                    </button>
                    {orderData && (
                      <p className="text-center text-[10px] font-black text-green-600 uppercase animate-pulse">Payment is ready. Click above to complete checkout.</p>
                    )}
                    

                    <p className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-widest italic opacity-60">Fast Secure Checkout • RBI Compliant</p>


                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FLOATING OFFER HUB */}
      <AnimatePresence>
        {showFloatingOffer && promotions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 100, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5, filter: 'blur(10px)' }}
            className="fixed bottom-6 right-6 z-50 w-full max-w-[320px] pointer-events-none"
          >
            <div className="pointer-events-auto bg-slate-950 p-6 rounded-[2.5rem] shadow-2xl border border-white/10 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-500">
                  <Gift size={80} className="text-amber-500" />
               </div>
               
               <button 
                 onClick={() => setShowFloatingOffer(false)}
                 className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors p-1"
               >
                  <X size={16} />
               </button>

               <div className="space-y-4 relative z-10">
                  <div className="flex items-center gap-2">
                     <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                     <span className="text-[9px] font-black text-amber-500 uppercase tracking-[0.2em] italic">Exclusive Offer</span>
                  </div>
                  
                  <div className="space-y-1">
                     <h3 className="text-xl font-black italic uppercase text-white leading-none pr-4">{promotions[0].offer}</h3>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest line-clamp-2">{promotions[0].message}</p>
                  </div>

                  {promotions[0].imageUrl && (
                    <div className="rounded-2xl overflow-hidden aspect-video border border-white/5 bg-white/10">
                       <img src={getSafeUrl(promotions[0].imageUrl)} alt={promotions[0].offer} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}

                  <div className="pt-4 flex items-center justify-between gap-4">
                     <div className="space-y-0.5">
                        <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Target Hub</p>
                        <p className="text-[9px] font-black text-white uppercase italic">{promotions[0].targetRegion || 'PAN-INDIA'}</p>
                     </div>
                     <button 
                       onClick={() => {
                         setActiveTab('DASHBOARD');
                         setShowFloatingOffer(false);
                         setCreationStep('DETAILS');
                         openPaymentModal();
                       }}
                       className="flex-1 py-3 bg-white text-slate-950 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-500 transition-all active:scale-95"
                     >
                        Claim Now
                     </button>
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-slate-200 px-6 flex items-center justify-between z-[100] pb-safe">
        {[
          { id: 'DASHBOARD', icon: Activity, label: 'Home' },
          { id: 'CAMPAIGNS', icon: Monitor, label: 'Ads' },
          { id: 'STUDIO', icon: Palette, label: 'Studio' },
          { id: 'TICKETS', icon: MessageSquare, label: 'Help' },
          { id: 'DESIGN_HELP', icon: Sparkles, label: 'Studio' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              activeTab === tab.id ? "text-amber-500" : "text-slate-400"
            )}
          >
            <tab.icon size={20} className={cn(activeTab === tab.id ? "scale-110" : "scale-100")} />
            <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
        <button
          onClick={() => setShowMobileMenu(true)}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            showMobileMenu ? "text-amber-500" : "text-slate-400"
          )}
        >
          <Settings size={20} />
          <span className="text-[8px] font-black uppercase tracking-widest">More</span>
        </button>
      </div>

      {/* Customer Mobile Menu Drawer */}
      <AnimatePresence>
        {showMobileMenu && (
          <div className="fixed inset-0 z-[200] md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileMenu(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[3rem] p-8 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black italic uppercase text-slate-900">Control Panel</h3>
                <button onClick={() => setShowMobileMenu(false)} className="p-2 bg-slate-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'DASHBOARD', icon: Activity, label: 'Control' },
                  { id: 'IMPACT', icon: PlayCircle, label: 'Impact' },
                  { id: 'CAMPAIGNS', icon: Monitor, label: 'Campaigns' },
                  { id: 'HISTORY', icon: Wallet, label: 'Billing' },
                  { id: 'STUDIO', icon: Palette, label: 'Studio' },
                  { id: 'SUBSCRIPTIONS', icon: Zap, label: 'Plans' },
                  { id: 'TICKETS', icon: MessageSquare, label: 'Support' },
                  { id: 'DESIGN_HELP', icon: Sparkles, label: 'Experts' },
                  { id: 'LEGAL', icon: ShieldCheck, label: 'Legal' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      setShowMobileMenu(false);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-3 p-6 rounded-3xl border transition-all",
                      activeTab === item.id 
                        ? "bg-slate-900 border-slate-900 text-amber-500 shadow-xl" 
                        : "bg-white border-slate-100 text-slate-400",
                    )}
                  >
                    <item.icon size={24} />
                    <span className="text-[9px] font-black uppercase tracking-widest text-center">{item.label}</span>
                  </button>
                ))}
              </div>
              <button 
                onClick={() => onLogout()}
                className="w-full mt-8 p-6 bg-red-50 text-red-500 rounded-3xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3"
              >
                <LogOut size={20} /> END SESSION
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Support Ticket Modal */}
      <AnimatePresence>
        {isCreateTicketOpen && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateTicketOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 md:p-10 border border-slate-100 flex flex-col relative z-10 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-black italic uppercase text-slate-900 leading-none">New Support Ticket</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Submit an inquiry with our team</p>
                </div>
                <button
                  onClick={() => setIsCreateTicketOpen(false)}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateTicketSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Inquiry Subject / Title</label>
                  <input
                    type="text"
                    required
                    value={ticketForm.title}
                    onChange={(e) => setTicketForm({...ticketForm, title: e.target.value})}
                    placeholder="e.g., Campaign Approval is Delayed, Hardware Inactive, Designer Strategy Inquiry"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-xs font-bold tracking-tight text-slate-950 outline-none focus:border-amber-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Category</label>
                    <select
                      value={ticketForm.category}
                      onChange={(e) => setTicketForm({...ticketForm, category: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-xs font-bold tracking-tight text-slate-950 outline-none focus:border-amber-500 transition-all cursor-pointer appearance-none"
                    >
                      <option value="Campaign Assistance">Campaign Assistance</option>
                      <option value="System Issue">System Issue</option>
                      <option value="Billing & Invoices">Billing & Invoices</option>
                      <option value="Technical Support">Technical Support</option>
                      <option value="Hardware / Installation">Hardware / Installation</option>
                      <option value="Designer Inquiry">Designer Inquiry</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Priority Level</label>
                    <select
                      value={ticketForm.priority}
                      onChange={(e) => setTicketForm({...ticketForm, priority: e.target.value as any})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-xs font-bold tracking-tight text-slate-950 outline-none focus:border-amber-500 transition-all cursor-pointer"
                    >
                      <option value="LOW">Low - General Question</option>
                      <option value="MEDIUM">Medium - Normal Support</option>
                      <option value="HIGH">High - System Blocker</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Describe Your Issue / Question</label>
                  <textarea
                    required
                    rows={4}
                    value={ticketForm.description}
                    onChange={(e) => setTicketForm({...ticketForm, description: e.target.value})}
                    placeholder="Provide full description of your requirement or problem. Our coordinators will review and reply directly."
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-xs font-bold tracking-tight text-slate-950 outline-none focus:border-amber-500 transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-amber-500/20 active:scale-[0.99]"
                >
                  {loading ? "Registering Inquiry..." : "Submit Support Ticket"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      
    </div>
  );
}
