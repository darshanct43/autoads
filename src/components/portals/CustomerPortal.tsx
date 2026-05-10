import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Target, Users, Zap, Image as ImageIcon, Video, ArrowUpRight, BarChart3, Clock, Wallet, Settings, Check, CreditCard, Sparkles, X, Gift, PlayCircle, LogIn, User, Phone, CheckCircle2, ShieldCheck, Lock, ChevronRight, LogOut, Trash2, Database, AlertCircle, Send, Info, FileText, RefreshCw, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { firebaseService, AdCampaign, Device } from '@/services/firebaseService';
import { auth, googleLogin, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { storageService } from '@/services/storageService';
import { compressImage } from '@/lib/utils';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import ComplianceContent, { CompliancePage } from '../common/ComplianceContent';

declare const Razorpay: any;

const plans = [
  { id: 'BASIC', name: 'Starter', price: '₹0', unitCount: '2 Units', color: 'bg-emerald-500' },
  { id: 'PRO', name: 'Standard', price: '₹0', unitCount: '5 Units', color: 'bg-indigo-500' },
  { id: 'ULTRA', name: 'Premium', price: '₹0', unitCount: '10+ Units', color: 'bg-slate-900' },
];

interface CustomerPortalProps {
  onLogout: () => void;
}

export default function CustomerPortal({ onLogout }: CustomerPortalProps) {
  const [activePlan, setActivePlan] = useState('PRO');
  const [showPayment, setShowPayment] = useState(false);
  const [needDesigner, setNeedDesigner] = useState<boolean | null>(null);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [customCity, setCustomCity] = useState('');
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

  const [step, setStep] = useState<'DASHBOARD' | 'CREATE' | 'FLEET' | 'SUPPORT' | 'LEGAL'>('DASHBOARD');
  const [currentLegalPage, setCurrentLegalPage] = useState<CompliancePage>('ABOUT');
  const [legalPage, setLegalPage] = useState<CompliancePage>('ABOUT');
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'PREMIUM' | 'CAMPAIGNS' | 'DESIGN_HELP' | 'OFFERS' | 'LEGAL'>('DASHBOARD');
  const [dbPlans, setDbPlans] = useState<any[]>([]);
  
  const mergedPlans = useMemo(() => {
    return plans.map(p => {
      const dbPlan = dbPlans.find(dbp => dbp.id === p.id);
      return {
        ...p,
        price: dbPlan?.price !== undefined ? `₹${dbPlan.price}` : p.price
      };
    });
  }, [dbPlans]);

  const [selectedPlan, setSelectedPlan] = useState<any>(plans[1]);
  
  useEffect(() => {
    const plan = mergedPlans.find(p => p.id === activePlan);
    if (plan) setSelectedPlan(plan);
  }, [activePlan, mergedPlans]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [showFloatingOffer, setShowFloatingOffer] = useState(true);
  const [myCampaigns, setMyCampaigns] = useState<AdCampaign[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
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

  const [phone, setPhone] = useState('');
  const [campaignDetails, setCampaignDetails] = useState({
    title: '',
    type: 'VIDEO' as 'IMAGE' | 'VIDEO',
    asset: null as string | null,
    budget: '',
    duration: '30'
  });

  // Analytics Helpers
  const activeDevicesCount = devices.filter(d => d.status === 'ONLINE' || d.status === 'STREAMING').length;
  const totalNetworkUnits = devices.length;
  const syncScore = devices.length > 0 ? Math.floor((activeDevicesCount / devices.length) * 100) : 0;
  const liveCampaign = myCampaigns.find(c => c.status === 'ACTIVE' || c.status === 'LIVE');

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
        needDesigner: !!needDesigner
      });

      // 2. Record Payment
      const baseAmount = typeof selectedPlan.price === 'string' ? parseFloat(selectedPlan.price.replace(/[^0-9.]/g, '')) : selectedPlan.price;
      const designerCharge = needDesigner ? 1000 : 0;
      
      await firebaseService.recordPayment({
        campaignId: campaignRef.id,
        amount: baseAmount + designerCharge,
        currency: 'INR',
        status: 'PENDING_ADMIN_VERIFY',
        paymentMethod: 'razorpay',
        transactionId: txnId || `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        customerId: user?.uid || '',
      });

      setShowPayment(false);
      setPaymentStage('SELECTION');
      setManualTxnId('');
      alert('Payment Logged & Verification Pending! Our team will verify the transaction and activate your campaign within 2-4 hours.');
      setCampaignDetails({ title: '', type: 'VIDEO', asset: null, budget: '', duration: '30' });
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
      alert(errorMsg);
      setLoading(false);
    }
  };

  const handlePaymentAndSubmit = async () => {
    if (!user) {
      alert('Please login to complete payment');
      return;
    }

    if (!phone || phone.length < 10) {
      alert('Please enter a 10-digit contact number');
      return;
    }

    if (!campaignDetails.title) {
      alert('Please enter a Campaign Title first');
      return;
    }
    if (!campaignDetails.asset && !needDesigner) {
      alert('Please upload an Ad Asset or choose "Need Designer Help"');
      return;
    }
    if (!selectedState || !selectedCity) {
      alert('Please select a Target Region (State & City)');
      return;
    }

    const baseAmount = typeof selectedPlan.price === 'string' ? parseFloat(selectedPlan.price.replace(/[^0-9.]/g, '')) : selectedPlan.price;
    const designerCharge = needDesigner ? 1000 : 0;
    const amount = baseAmount + designerCharge;

    setLoading(true);

    if (amount <= 0) {
      // Handle free or zero amount plans directly
      await handlePaymentSuccess('FREE_PLAN_AUTO');
      return;
    }

    const razorpayKey = (import.meta.env.VITE_RAZORPAY_KEY_ID as string) || 'rzp_live_SnZDlb9YCezb2w';
    
    try {
      // 1. Create Order on Server
      const orderResponse = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency: 'INR',
          notes: {
            user_uid: user.uid,
            campaign_title: campaignDetails.title
          }
        })
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.error || 'Failed to initialize order');
      }

      const order = await orderResponse.json();

      // 2. Configure Razorpay Options
      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency,
        name: "AutoAds Pro",
        description: `Campaign: ${selectedPlan.name}`,
        image: "https://darshanct43.github.io/autoads/logo.png",
        order_id: order.id,
        handler: async function (response: any) {
          try {
            setLoading(true);
            // 3. Verify Payment on Server
            const verifyResponse = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                uid: user.uid,
                planData: { amount, planId: selectedPlan.id },
                campaignData: {
                  title: campaignDetails.title,
                  type: campaignDetails.type,
                  assetUrl: campaignDetails.asset || '',
                  videoThumbnail: videoThumbnail || '',
                  customerId: user.uid,
                  targetCity: selectedCity === 'Other' ? customCity : selectedCity,
                  targetState: selectedState,
                  duration: campaignDetails.duration,
                  needDesigner: !!needDesigner
                }
              })
            });

            if (!verifyResponse.ok) {
              const errorData = await verifyResponse.json();
              throw new Error(errorData.error || 'Payment verification failed');
            }

            const result = await verifyResponse.json();
            
            // 4. Finalize UI State
            setShowPayment(false);
            setPaymentStage('SELECTION');
            setManualTxnId('');
            alert('Payment Verified & Campaign Activated! Syncing with network nodes...');
            setCampaignDetails({ title: '', type: 'VIDEO', asset: null, budget: '', duration: '30' });
            setLoading(false);
          } catch (verifyErr: any) {
            console.error("[Verification] Error:", verifyErr);
            alert(`Verification Error: ${verifyErr.message}`);
            setLoading(false);
          }
        },
        prefill: {
          name: user.displayName || user.email?.split('@')[0] || "Client",
          email: user.email || "",
          contact: phone.length === 10 ? `+91${phone}` : phone
        },
        notes: {
          campaign_title: campaignDetails.title,
          plan: selectedPlan.id,
          user_uid: user.uid,
          designer: needDesigner ? "YES" : "NO"
        },
        modal: {
          confirm_close: true,
          ondismiss: function() {
            setLoading(false);
            console.log("[Razorpay] Checkout closed by user");
          },
          escape: true,
          backdropclose: false
        },
        theme: {
          color: "#f59e0b"
        }
      };

      const rzpObj = new Razorpay(options);
      rzpObj.on('payment.failed', function (response: any) {
        console.error("[Razorpay] Payment Failed:", response.error);
        alert(`Payment Failed: ${response.error.description}\nCode: ${response.error.code}`);
      });
      rzpObj.open();
    } catch (e: any) {
      console.error("Order init error:", e);
      alert(`Initialization Error: ${e.message}`);
      setLoading(false);
    }
  };

  useEffect(() => {
    firebaseService.getPlans().then(setDbPlans).catch(console.error);
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubscribeNotices = firebaseService.subscribeToPublicNotices((notices) => {
      setPromotions(notices);
    });
    
    const unsubscribeCampaigns = firebaseService.subscribeToCampaigns((campaigns) => {
      setMyCampaigns(campaigns);
    }, user.uid);

    const unsubscribeDevices = firebaseService.subscribeToDevices((devs) => {
      setDevices(devs);
    });

    return () => {
      unsubscribeNotices();
      unsubscribeCampaigns();
      unsubscribeDevices();
    };
  }, [user]);

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
            try { val = JSON.stringify(val); } catch (e) { val = "[Object]"; }
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

  const handleExtractionClick = (e: React.MouseEvent, data: any[], fileName: string) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Extraction button clicked", fileName);
    exportToCSV(data, fileName);
  };

  const handleActivePlanChange = (planId: string) => {
    setActivePlan(planId);
    setSelectedPlan(plans.find(p => p.id === planId));
  };

  return (
    <ErrorBoundary componentName="Client Command Center">
      <div className="min-h-screen bg-[#f8fafc]">
      {/* Navigation */}
      <nav className="h-16 border-b border-slate-200 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <span className="font-bold text-slate-900 tracking-tight text-sm uppercase tracking-widest leading-none">Auto <span className="text-amber-500 italic">Ads</span></span>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mt-1.5 flex items-center gap-1">
              by <span className="text-slate-600">Mayaan Group</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest">{user.displayName || 'Enterprise User'}</p>
                <p className="text-[7px] font-bold text-slate-400 uppercase tracking-[0.2em] opacity-60">Verified Command Account</p>
              </div>
              <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} className="w-9 h-9 rounded-full border border-slate-200 p-0.5" />
              <button 
                onClick={() => onLogout()} 
                className="px-4 py-2 bg-red-50 text-red-500 border border-red-100 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-sm flex items-center gap-2"
              >
                 <LogOut size={14} />
                 <span className="hidden lg:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <button 
              onClick={googleLogin}
              className="flex items-center gap-2 text-[10px] font-black text-slate-900 uppercase tracking-widest hover:text-amber-600 transition-colors"
            >
              <LogIn size={14} /> Login
            </button>
          )}
          <div className="hidden md:flex gap-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <button 
              onClick={() => setActiveTab('DASHBOARD')} 
              className={cn("transition-colors", activeTab === 'DASHBOARD' ? "text-amber-600" : "hover:text-slate-900")}
            >
              Monitor
            </button>
            <button 
              onClick={() => setActiveTab('OFFERS')} 
              className={cn("transition-colors flex items-center gap-1.5", activeTab === 'OFFERS' ? "text-amber-600" : "hover:text-slate-900")}
            >
              <Gift size={12} className="animate-pulse" /> Festival Offers
            </button>
            <button 
              onClick={() => setActiveTab('CAMPAIGNS')} 
              className={cn("transition-colors", activeTab === 'CAMPAIGNS' ? "text-amber-600" : "hover:text-slate-900")}
            >
              Campaigns
            </button>
            <button 
              onClick={() => setActiveTab('DESIGN_HELP')} 
              className={cn("transition-colors focus:outline-none", activeTab === 'DESIGN_HELP' ? "text-amber-600 underline decoration-2 underline-offset-4" : "hover:text-slate-900")}
            >
              Help
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-4 md:space-y-8">
        {activeTab === 'LEGAL' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
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
                      { id: 'REFUND', label: 'Refund Policy', icon: RefreshCw },
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
          </motion.div>
        )}

        {activeTab === 'DASHBOARD' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-slate-100 shadow-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                       <h1 className="text-xl font-black text-slate-900 uppercase italic leading-none">Command Center</h1>
                       <div className="px-2 py-0.5 bg-amber-500 text-[8px] font-black text-slate-950 rounded uppercase tracking-widest">Active</div>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Active Campaign Control Hub</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex flex-col items-end">
                       <p className={cn("text-xs font-black tabular-nums", activeDevicesCount > 0 ? "text-green-500" : "text-slate-400")}>
                         {activeDevicesCount > 0 ? 'UPLINK_ACTIVE' : 'IDLE'}
                       </p>
                       <p className="text-[7px] text-slate-400 font-black uppercase tracking-widest">Network Pulse</p>
                    </div>
                  </div>
                </div>

                {/* Live Activity / Promotions Banner */}
                {promotions.length > 0 && (
                  <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
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
                              onClick={() => setShowPayment(true)}
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
                    { label: 'Fleet Network', value: totalNetworkUnits.toLocaleString(), icon: <Target size={14} className="text-amber-500" /> },
                    { label: 'Live Nodes', value: activeDevicesCount, icon: <Users size={14} className="text-slate-900" /> },
                    { label: 'Sync Score', value: `${syncScore}%`, icon: <Zap size={14} className="text-orange-500" /> },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white px-3 py-2.5 rounded-2xl border border-slate-100 flex items-center gap-2.5 shadow-sm hover:border-amber-200 transition-all group overflow-hidden">
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
                           <span className="px-2 py-0.5 bg-amber-500 text-black rounded text-[8px] font-black uppercase tracking-widest italic animate-pulse">LIVE SIGNAL</span>
                           <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic">Node-ID: {liveCampaign.id.slice(-6)}</span>
                        </div>
                        <h2 className="text-2xl font-black italic text-white uppercase">{liveCampaign.title}</h2>
                           <div className="flex gap-10">
                              <div>
                                 <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest mb-1 italic">Network Load</p>
                                 <p className="text-white font-black text-lg italic tabular-nums">{(liveCampaign.assignedDrivers?.length || 0)} Units</p>
                              </div>
                              <div>
                                 <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest mb-1 italic">Target City</p>
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
                        <span className="px-2 py-0.5 bg-slate-900 text-white rounded text-[8px] font-black uppercase tracking-widest italic">System Ready</span>
                        <h2 className="text-xl font-black italic text-slate-900 uppercase">Deploy Network Signal</h2>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed italic text-balance">The network is synchronized and waiting for instructions.</p>
                        <button 
                          onClick={() => setShowPayment(true)}
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
                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest italic">Recent Signal Events</h3>
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
                                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{ad.targetArea || 'Global'}</p>
                              </div>
                            </div>
                            <div className={cn("px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest", 
                              ad.status === 'ACTIVE' ? "bg-slate-900 text-amber-500" : "bg-slate-100 text-slate-400"
                            )}>
                              {ad.status}
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
                    <button
                      key={plan.id}
                      onClick={() => handleActivePlanChange(plan.id)}
                      className={cn(
                        "w-full p-4 bg-white rounded-2xl border transition-all text-left relative overflow-hidden group",
                        activePlan === plan.id 
                          ? cn("ring-2 shadow-md translate-x-1", 
                              plan.id === 'BASIC' ? "border-emerald-500 ring-emerald-50" : 
                              plan.id === 'PRO' ? "border-indigo-500 ring-indigo-50" : 
                              "border-slate-900 ring-slate-50")
                          : "border-slate-100 hover:border-slate-300 shadow-sm hover:translate-x-1"
                      )}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start justify-between">
                          <div className="space-y-0.5">
                            <h4 className="text-xs font-black text-slate-900 tracking-tight uppercase italic leading-tight">{plan.name}</h4>
                            <p className="text-[7px] text-slate-400 font-bold uppercase tracking-widest italic">{plan.unitCount} Access</p>
                          </div>
                          <div className="flex flex-col items-end">
                             <p className="text-base font-black text-slate-900 italic tracking-tight tabular-nums leading-tight">{plan.price}</p>
                             <p className="text-[7px] text-slate-400 font-bold uppercase mt-0.5">/ cycle</p>
                          </div>
                        </div>
                      </div>
                      {activePlan === plan.id && (
                        <motion.div layoutId="plan-pulse-small" className="absolute -top-6 -right-6 w-16 h-16 bg-amber-500/10 rounded-full blur-xl" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="p-6 bg-slate-950 rounded-[2rem] space-y-6 text-white shadow-xl relative overflow-hidden border border-slate-900">
                   <div className="relative z-10">
                      <button 
                        onClick={() => setShowPayment(true)}
                        className="w-full bg-amber-500 text-slate-950 rounded-xl py-4 font-black text-[10px] uppercase tracking-[0.15em] hover:bg-amber-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                      >
                        Initiate Payment <ArrowUpRight size={14} />
                      </button>
                   </div>
                   <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-32 h-32 bg-amber-500/5 blur-3xl pointer-events-none" />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'OFFERS' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12 pb-20"
          >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-3xl font-black italic uppercase text-slate-950">Festival Offer Hub</h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Exclusive seasonal campaign packages & rewards</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 px-6 py-3 rounded-2xl">
                 <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest italic">{promotions.length} Offers Currently Active</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               {promotions.length === 0 ? (
                 <div className="col-span-full py-24 text-center glass-card bg-white rounded-[3rem] border-2 border-dashed border-slate-100 shadow-sm">
                    <Gift className="mx-auto text-slate-200 mb-6" size={64} />
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">No Active Festival Offers</h3>
                    <p className="text-[10px] font-bold text-slate-300 uppercase mt-2">Special occasion offers will appear here automatically.</p>
                 </div>
               ) : (
                 promotions.map((promo) => (
                   <motion.div 
                     key={promo.id}
                     whileHover={{ y: -5 }}
                     className="glass-card p-10 rounded-[3rem] border border-slate-100 shadow-xl bg-white space-y-8 flex flex-col justify-between relative overflow-hidden group hover:border-amber-500 transition-all"
                   >
                      <div className="absolute top-0 right-0 p-8">
                         <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 transform group-hover:rotate-12 transition-transform">
                            <Zap size={32} />
                         </div>
                      </div>

                      <div className="space-y-4">
                         <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-500/10 px-4 py-1.5 rounded-full italic border border-amber-500/20">Active Festival Signal</span>
                         <h2 className="text-3xl font-black italic tracking-tight uppercase text-slate-900 leading-tight pr-12">{promo.offer}</h2>
                         {promo.imageUrl && (
                           <div className="rounded-3xl overflow-hidden border border-slate-100 aspect-video bg-slate-50 mt-4">
                              <img src={promo.imageUrl} alt={promo.offer} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                           </div>
                         )}
                         <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed tracking-widest">{promo.message || 'Unlock strategic growth with this seasonal specialized ad deployment package.'}</p>
                      </div>

                      <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                         <div className="space-y-1">
                            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Valid For Region</p>
                            <p className="text-[11px] font-black text-slate-900 uppercase italic">{promo.targetRegion || 'PAN-INDIA HUB'}</p>
                         </div>
                         <button 
                           onClick={() => setShowPayment(true)}
                           className="bg-slate-950 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-slate-950 transition-all active:scale-95 shadow-2xl"
                         >
                            Claim Offer
                         </button>
                      </div>
                   </motion.div>
                 ))
               )}
            </div>
          </motion.div>
        )}

        {activeTab === 'CAMPAIGNS' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between">
               <div>
                  <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Campaign Portfolio</h1>
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
               <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                     <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                           <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Campaign Signal</th>
                           <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Targeting</th>
                           <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Deployment</th>
                           <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                           <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Action</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50 text-slate-900">
                        {myCampaigns.map((ad, i) => (
                           <tr key={ad.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-8 py-6">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-amber-500 overflow-hidden shrink-0">
                                       {ad.mediaType === 'VIDEO' ? <PlayCircle size={20} /> : <ImageIcon size={20} />}
                                    </div>
                                    <div>
                                       <p className="text-sm font-bold text-slate-900 tracking-tight leading-none mb-1 uppercase italic">{ad.title}</p>
                                       <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest italic">{ad.timestamp ? new Date(ad.timestamp).toLocaleDateString() : 'N/A'}</p>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-8 py-6">
                                 <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-slate-600 uppercase italic">{ad.targetCity}</span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{ad.targetState}</span>
                                 </div>
                              </td>
                              <td className="px-8 py-6">
                                 <div className="flex items-center gap-2">
                                    <Zap size={12} className={cn(ad.status === 'LIVE' ? "text-amber-500 animate-pulse" : "text-slate-300")} />
                                    <span className="text-[10px] font-bold text-slate-600 uppercase">{ad.assignedDrivers?.length || 0} Nodes</span>
                                 </div>
                              </td>
                              <td className="px-8 py-6">
                                 <span className={cn("text-[8px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border", 
                                    ad.status === 'PENDING' || ad.status === 'PENDING_VERIFICATION' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                    ad.status === 'APPROVED' ? "bg-green-50 text-green-600 border-green-100" :
                                    ad.status === 'ACTIVE' || ad.status === 'LIVE' ? "bg-slate-900 text-amber-500 border-slate-900 shadow-lg" :
                                    "bg-red-50 text-red-600 border-red-100"
                                 )}>
                                    {ad.status?.replace('_', ' ')}
                                 </span>
                              </td>
                              <td className="px-8 py-6">
                                 <div className="flex items-center gap-2">
                                    <button className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all group-hover:scale-105 active:scale-95 shadow-sm">
                                       <ArrowUpRight size={16} />
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleDeleteCampaign(ad.id); }}
                                      className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-500 hover:text-white transition-all group-hover:scale-105 active:scale-95 shadow-sm"
                                      title="Delete Campaign"
                                    >
                                       <Trash2 size={16} />
                                    </button>
                                 </div>
                              </td>
                           </tr>
                        ))}
                        {myCampaigns.length === 0 && (
                           <tr>
                              <td colSpan={5} className="px-8 py-16 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest italic leading-relaxed">Disconnected from Active Network. Launch New Campaign to Sync.</td>
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
                    onClick={() => setShowPayment(true)}
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
                              {ad.type === 'VIDEO' ? <PlayCircle className="text-slate-800" size={48} /> : <ImageIcon className="text-slate-800" size={48} />}
                           </div>
                           <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 to-transparent">
                              <p className="text-[9px] font-black text-white uppercase tracking-tight truncate italic">{ad.title}</p>
                              <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest italic">{ad.type} • {ad.targetCity}</p>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'DESIGN_HELP' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
             <div className="max-w-4xl mx-auto space-y-10 py-10">
                <div className="text-center space-y-4">
                   <div className="w-20 h-20 bg-amber-500/10 rounded-[2rem] flex items-center justify-center text-amber-500 mx-auto border border-amber-500/20 shadow-2xl shadow-amber-500/5">
                      <Sparkles size={40} />
                   </div>
                   <div className="space-y-2">
                      <h2 className="text-3xl font-black italic text-slate-900 uppercase tracking-tight leading-relaxed">Designer Help</h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Scale your story with expert design strategy</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="glass-card p-10 rounded-[3rem] bg-white border border-slate-100 shadow-xl space-y-8">
                      <div className="space-y-4">
                         <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest italic leading-none">Standard Creative</h4>
                         <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Perfect for quick announcements, offers, and regional targeting.</p>
                         <h3 className="text-3xl font-black italic text-slate-900 tracking-tight">₹0</h3>
                      </div>
                      <ul className="space-y-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                         <li className="flex items-center gap-3"><CheckCircle2 size={14} className="text-amber-500" /> Professional 4K Static Design</li>
                         <li className="flex items-center gap-3"><CheckCircle2 size={14} className="text-amber-500" /> Single Revision Cycle</li>
                         <li className="flex items-center gap-3"><CheckCircle2 size={14} className="text-amber-500" /> Ad Policy Compliance Check</li>
                         <li className="flex items-center gap-3"><CheckCircle2 size={14} className="text-amber-500" /> 24-Hour Signal Ready Delivery</li>
                      </ul>
                      <button className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200">Request Strategy</button>
                   </div>

                   <div className="glass-card p-10 rounded-[3rem] bg-slate-900 border border-slate-800 shadow-2xl space-y-8 relative overflow-hidden group">
                      <div className="absolute -top-10 -right-10 bg-amber-500/10 w-40 h-40 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-all" />
                      <div className="space-y-4 relative z-10">
                         <h4 className="text-sm font-black text-amber-500 uppercase tracking-widest italic leading-none">Elite Motion Studio</h4>
                         <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">High-Impact 1080p motion graphics to grab maximum network attention.</p>
                         <h3 className="text-3xl font-black italic text-white tracking-tight">₹0</h3>
                      </div>
                      <ul className="space-y-4 text-[10px] font-black uppercase text-slate-300 tracking-widest relative z-10">
                         <li className="flex items-center gap-3"><CheckCircle2 size={14} className="text-amber-500" /> Custom Motion Narrative (15s)</li>
                         <li className="flex items-center gap-3"><CheckCircle2 size={14} className="text-amber-500" /> Multi-Layered Visual Brand FX</li>
                         <li className="flex items-center gap-3"><CheckCircle2 size={14} className="text-amber-500" /> Strategic CTA Optimization</li>
                         <li className="flex items-center gap-3"><CheckCircle2 size={14} className="text-amber-500" /> 72-Hour Prime Delivery</li>
                      </ul>
                      <button className="w-full py-5 bg-amber-500 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-400 transition-all shadow-2xl shadow-amber-500/20 relative z-10">Hire Motion Expert</button>
                   </div>
                </div>
             </div>
          </motion.div>
        )}
        {/* Production Footer Section */}
        <div className="pt-20 pb-10">
          <div className="bg-slate-900 rounded-[3rem] p-12 text-center space-y-8 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
             <h2 className="text-4xl font-black text-white italic uppercase tracking-tight">Lead the Network Surge</h2>
             <p className="text-slate-400 max-w-md mx-auto text-sm font-medium tracking-tight">India's Premimum Digital Transit Advertising Ecosystem. Hardware-verified impressions for modern brand precision.</p>
             <button 
               onClick={() => setShowPayment(true)}
               className="px-10 py-5 bg-amber-500 text-slate-900 rounded-2xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-amber-500/20"
             >
               Launch New Node
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
                      <li className="hover:text-white cursor-pointer transition-colors" onClick={() => { setLegalPage('REFUND'); setActiveTab('LEGAL'); window.scrollTo(0,0); }}>Refund Policy</li>
                   </ul>
                </div>
             </div>
             
             <div className="pt-8 flex flex-col sm:flex-row justify-between items-center border-t border-white/5 gap-4">
                <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em]">© 2026 AUTOADS NETWORK LIVE / MAYAAN GROUP</p>
                <div className="flex gap-4 opacity-40 grayscale">
                   <img src="https://img.icons8.com/color/48/razorpay.png" className="h-4" alt="Razorpay" />
                </div>
             </div>
          </div>
        </div>
      </main>

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
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden my-auto"
            >
              <div className={cn("p-8 text-white flex items-center justify-between relative", selectedPlan?.color)}>
                <div className="flex items-center gap-4">
                  {paymentStage === 'PREPARATION' && (
                    <motion.button 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => setPaymentStage('SELECTION')}
                      className="p-2 bg-white/20 hover:bg-white/40 rounded-full transition-all"
                    >
                      <ChevronRight size={18} className="rotate-180" />
                    </motion.button>
                  )}
                  <div>
                    <h3 className="text-2xl font-black italic tracking-tight uppercase">Order Summary</h3>
                    <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">Plan: {selectedPlan?.name}</p>
                  </div>
                </div>
                <button onClick={() => setShowPayment(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {paymentStage === 'SELECTION' ? (
                  <>
                    {/* Campaign Basics */}
                    <div className="space-y-4">
                      <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Campaign Configuration</h4>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1">Campaign Headline</label>
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
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Asset Type</label>
                              <div className="flex bg-slate-100 p-1 rounded-xl">
                                 <button 
                                   onClick={() => setCampaignDetails({...campaignDetails, type: 'IMAGE'})}
                                   className={cn("flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all", campaignDetails.type === 'IMAGE' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}
                                 >
                                   Image
                                 </button>
                                 <button 
                                   onClick={() => setCampaignDetails({...campaignDetails, type: 'VIDEO'})}
                                   className={cn("flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all", campaignDetails.type === 'VIDEO' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}
                                 >
                                   Video
                                 </button>
                              </div>
                           </div>
                           <div className="space-y-2">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Slot Duration</label>
                              <select 
                                value={campaignDetails.duration}
                                onChange={(e) => setCampaignDetails({...campaignDetails, duration: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-[10px] font-bold uppercase tracking-tight focus:ring-1 focus:ring-amber-500 outline-none text-slate-900 shadow-sm"
                              >
                                 <option value="15">15 Seconds</option>
                                 <option value="30">30 Seconds</option>
                                 <option value="60">60 Seconds</option>
                              </select>
                           </div>
                        </div>
                      </div>
                    </div>

                    {/* Asset Upload */}
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Campaign Asset Upload</h4>
                       <input 
                         type="file" 
                         id="asset-upload" 
                         key={campaignDetails.type}
                         className="hidden" 
                         accept={campaignDetails.type === 'VIDEO' ? 'video/*' : 'image/*'}
                         onChange={async (e) => {
                           const file = e.target.files?.[0];
                           if (file && user) {
                             const localUrl = URL.createObjectURL(file);
                             setCampaignDetails(prev => ({ ...prev, asset: localUrl }));
                             setIsUploadingMedia(true);
                             setUploadProgress(0);
                             
                             try {
                               // Generate and upload video thumbnail if it's a video
                               if (file.type.startsWith('video/')) {
                                 try {
                                   const thumbBlob = await storageService.generateVideoThumbnail(file);
                                   const thumbFile = new File([thumbBlob], `thumb_${file.name}.jpg`, { type: 'image/jpeg' });
                                   const thumbPath = storageService.getCampaignMediaPath(user.uid, 'videos', `thumb_${Date.now()}.jpg`);
                                   const thumbUrl = await storageService.uploadFile(thumbPath, thumbFile);
                                   setVideoThumbnail(thumbUrl);
                                   console.log("[CustomerPortal] Video thumbnail generated and uploaded:", thumbUrl);
                                 } catch (thumbErr) {
                                   console.error("[CustomerPortal] Failed to generate video thumbnail:", thumbErr);
                                 }
                               }

                               const fileName = `${Date.now()}_${file.name}`;
                               const mediaType = file.type.startsWith('video/') ? 'videos' : 'posters';
                               const storagePath = storageService.getCampaignMediaPath(user.uid, mediaType, fileName);
                               
                               const url = await storageService.uploadFile(storagePath, file, (p) => {
                                 setUploadProgress(p.progress);
                               });
                               
                               setCampaignDetails(prev => ({ ...prev, asset: url }));
                               console.log("[CustomerPortal] Asset uploaded to storage:", url);
                             } catch (err: any) {
                               console.error("[CustomerPortal] Asset upload failed:", err);
                               alert(err.message || "Failed to upload campaign asset. Please try again.");
                               setCampaignDetails(prev => ({...prev, asset: null}));
                             } finally {
                               setIsUploadingMedia(false);
                               URL.revokeObjectURL(localUrl);
                             }
                           }
                         }}
                       />
                       <div 
                        onClick={() => !loading && document.getElementById('asset-upload')?.click()}
                        className={cn(
                          "w-full h-40 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-slate-50 hover:border-amber-500 transition-all group/asset",
                          loading && "opacity-50 cursor-wait"
                        )}
                       >
                         {campaignDetails.asset ? (
                           <div className="text-center space-y-2">
                              <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-100">
                                 <Check size={24} />
                              </div>
                              <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Asset Ready for Injection</p>
                              <button onClick={(e) => { e.stopPropagation(); setCampaignDetails({...campaignDetails, asset: null}); }} className="text-[9px] font-bold text-red-500 uppercase hover:underline">Remove</button>
                           </div>
                         ) : (
                           <div className="text-center space-y-3">
                              {isUploadingMedia ? (
                                <>
                                   <div className="relative w-16 h-16 mx-auto">
                                      <svg className="w-full h-full rotate-[-90deg]">
                                         <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-100" />
                                         <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-amber-500" strokeDasharray={176} strokeDashoffset={176 - (176 * uploadProgress) / 100} strokeLinecap="round" />
                                      </svg>
                                      <div className="absolute inset-0 flex items-center justify-center">
                                         <span className="text-[10px] font-black text-slate-900">{uploadProgress}%</span>
                                      </div>
                                   </div>
                                   <div className="space-y-1">
                                      <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">Uplinking Asset...</p>
                                      <p className={cn("text-[8px] font-bold uppercase tracking-widest", uploadTimeLeft < 30 ? "text-red-500 animate-pulse" : "text-slate-400")}>
                                         Limit: {Math.floor(uploadTimeLeft / 60)}:{(uploadTimeLeft % 60).toString().padStart(2, '0')}
                                      </p>
                                   </div>
                                </>
                              ) : (
                                <>
                                   <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover/asset:text-amber-500 transition-colors mx-auto">
                                      {loading ? <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /> : (campaignDetails.type === 'VIDEO' ? <Video size={20} /> : <ImageIcon size={20} />)}
                                   </div>
                                   <div className="text-center">
                                      <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{loading ? 'Processing...' : 'Click to Inject Asset'}</p>
                                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Required: High DPI {campaignDetails.type === 'VIDEO' ? 'MP4' : 'JPEG/PNG'}</p>
                                   </div>
                                </>
                              )}
                           </div>
                         )}
                       </div>
                    </div>

                    {/* Area Targeting Section */}
                    <div className="space-y-6">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                        Target Geography
                        <span className="text-amber-600 italic">Network Config</span>
                      </h4>
                      
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
                              <option value="">Select State First</option>
                            )}
                          </select>
                        </div>
                      </div>

                      {selectedCity === 'Other' && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-2">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 text-amber-600">Specify City Name</label>
                          <input 
                            type="text"
                            value={customCity}
                            onChange={(e) => setCustomCity(e.target.value)}
                            placeholder="Type city name here..."
                            className="w-full bg-amber-50/50 border border-amber-100 rounded-xl px-4 py-3 text-[10px] font-bold tracking-tight focus:ring-1 focus:ring-amber-500 outline-none"
                          />
                        </motion.div>
                      )}

                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Pinpoint Specific Area/Address</label>
                        <input 
                          type="text"
                          value={targetArea}
                          onChange={(e) => setTargetArea(e.target.value)}
                          placeholder="e.g. Indiranagar 80ft Road, Sector 4..."
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-4 text-[10px] font-bold tracking-tight focus:ring-1 focus:ring-amber-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* Designer Help Section */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Custom Creative Strategy</h4>
                      <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                              <Sparkles size={20} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900 uppercase tracking-tight">Need a Professional Designer?</p>
                              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">We help create your campaign story</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setNeedDesigner(true)}
                              className={cn("px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all", needDesigner === true ? "bg-slate-900 text-white" : "bg-white text-slate-400 border border-slate-200")}
                            >
                              Yes
                            </button>
                            <button 
                              onClick={() => setNeedDesigner(false)}
                              className={cn("px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all", needDesigner === false ? "bg-slate-900 text-white" : "bg-white text-slate-400 border border-slate-200")}
                            >
                              No
                            </button>
                          </div>
                        </div>

                        {needDesigner && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              className="overflow-hidden space-y-4 pt-4 border-t-2 border-amber-100"
                            >
                              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
                                 <p className="text-[10px] text-amber-700 font-extrabold uppercase tracking-tight italic flex items-center gap-2">
                                   <AlertCircle size={12} />
                                   PROFESSIONAL DESIGN SERVICE ENABLED
                                 </p>
                                 <p className="text-[10px] text-amber-900 font-bold mt-2 leading-relaxed">
                                   Our studio experts will draft your campaign visuals. <span className="font-extrabold text-amber-600 underline underline-offset-2">Designer Charge: ₹1,000</span> is added to your total.
                                 </p>
                              </div>
                              <div className="space-y-2">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Requirements for Design Request:</p>
                              <ul className="text-[10px] space-y-1.5 text-slate-700 font-medium">
                                <li className="flex items-center gap-2"><div className="w-1 h-1 bg-amber-500 rounded-full" /> Business Story/Concept details</li>
                                <li className="flex items-center gap-2"><div className="w-1 h-1 bg-amber-500 rounded-full" /> High-Resolution Product Images</li>
                                <li className="flex items-center gap-2"><div className="w-1 h-1 bg-amber-500 rounded-full" /> Brand Guidelines & Logo Assets</li>
                              </ul>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>

                    {/* Final Checkout */}
                    <div className="space-y-6">
                      <div className="space-y-4">
                         <div className="space-y-2">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
                               Contact Number
                               <span className="text-amber-600 italic">For Coordination</span>
                            </label>
                            <div className="relative">
                               <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                               <input 
                                  type="tel"
                                  placeholder="Enter 10-digit number"
                                  value={phone}
                                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                  className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-4 text-xs font-bold tracking-tight focus:ring-1 focus:ring-amber-500 outline-none text-slate-900"
                               />
                            </div>
                         </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl border border-amber-100 flex-col sm:flex-row gap-4">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-500 text-slate-900 rounded-xl flex items-center justify-center font-bold italic tracking-tight shadow-lg shadow-amber-500/10">TOTAL</div>
                            <div>
                               <p className="text-[10px] font-bold text-slate-900 uppercase tracking-tight leading-none">Order Details</p>
                               <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">
                                 {selectedPlan.name} Plan {needDesigner ? '+ Designer Review' : ''}
                               </p>
                            </div>
                         </div>
                         <div className="text-right">
                            <p className="text-lg font-black text-slate-900 tracking-tight italic leading-tight">
                              ₹{(typeof selectedPlan.price === 'string' ? parseFloat(selectedPlan.price.replace(/[^0-9.]/g, '')) : selectedPlan.price) + (needDesigner ? 1000 : 0)}
                            </p>
                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Total Payable</p>
                         </div>
                      </div>

                      <div className="space-y-3">
                        <button 
                          onClick={handlePaymentAndSubmit}
                          disabled={phone.length < 10 || loading}
                          className={cn(
                            "w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 group/btn",
                            phone.length >= 10 ? "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200" : "bg-slate-100 text-slate-300 cursor-not-allowed"
                          )}
                        >
                          {loading ? (
                            <div className="flex items-center gap-2">
                               <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                               <span>Processing...</span>
                            </div>
                          ) : isUploadingMedia ? (
                            <div className="flex items-center gap-2">
                               <div className="w-4 h-4 border-2 border-slate-300 border-t-amber-500 rounded-full animate-spin" />
                               <span>Uplinking Asset {uploadProgress}% (Proceed Anyway)</span>
                            </div>
                          ) : (
                            <>
                              <CheckCircle2 size={18} className={cn(phone.length >= 10 ? "text-amber-500" : "text-slate-300")} />
                              INITIATE SECURE PAYMENT
                            </>
                          )}
                        </button>
                        
                        <div className="flex flex-col gap-2">
                           <p className="text-center text-[9px] text-slate-400 font-medium italic">Secure 256-bit SSL encrypted transaction via Razorpay.</p>
                        </div>
                     </div>
                    </div>
                  </>
                ) : (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8 py-10">
                    <div className="text-center space-y-4">
                       <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-[2.5rem] flex items-center justify-center mx-auto border border-emerald-200 shadow-sm">
                          <ShieldCheck size={40} />
                       </div>
                       <div>
                          <h4 className="text-2xl font-black italic uppercase tracking-tight text-slate-900">Payment Initiated</h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Process in Progress</p>
                       </div>
                    </div>
                    <div className="text-center">
                       <button onClick={() => setShowPayment(false)} className="px-8 py-4 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-widest text-[10px]">Return to Portal</button>
                    </div>
                  </motion.div>
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
                     <span className="text-[9px] font-black text-amber-500 uppercase tracking-[0.2em] italic">Live Signal Hub</span>
                  </div>
                  
                  <div className="space-y-1">
                     <h3 className="text-xl font-black italic uppercase text-white leading-none pr-4">{promotions[0].offer}</h3>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest line-clamp-2">{promotions[0].message}</p>
                  </div>

                  {promotions[0].imageUrl && (
                    <div className="rounded-2xl overflow-hidden aspect-video border border-white/5 bg-white/10">
                       <img src={promotions[0].imageUrl} alt={promotions[0].offer} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}

                  <div className="pt-4 flex items-center justify-between gap-4">
                     <div className="space-y-0.5">
                        <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Target Hub</p>
                        <p className="text-[9px] font-black text-white uppercase italic">{promotions[0].targetRegion || 'PAN-INDIA'}</p>
                     </div>
                     <button 
                       onClick={() => {
                         setActiveTab('OFFERS');
                         setShowFloatingOffer(false);
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

    </div>
    </ErrorBoundary>
  );
}
