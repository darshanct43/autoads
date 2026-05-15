import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Target, Users, Zap, Image as ImageIcon, Video, ArrowUpRight, BarChart3, Clock, Wallet, Settings, Check, CreditCard, Sparkles, X, Gift, PlayCircle, LogIn, User, Phone, CheckCircle2, CheckCircle, ShieldCheck, Lock, ChevronRight, LogOut, Trash2, Database, AlertCircle, Send, Info, FileText, RefreshCw, MessageSquare, Upload, Activity, Monitor, ArrowLeft, Menu, LayoutDashboard, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { firebaseService, AdCampaign, Device, SupportTicket, ChatMessage } from '@/services/firebaseService';
import { auth, googleLogin, storage, db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { storageService } from '@/services/storageService';
import { compressImage } from '@/lib/utils';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import ComplianceContent, { CompliancePage } from '../common/ComplianceContent';
import AdminAssistant from '../common/AdminAssistant';

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
  const [creationStep, setCreationStep] = useState<'DETAILS' | 'PAYMENT' | 'MEDIA'>('DETAILS');
  const [currentLegalPage, setCurrentLegalPage] = useState<CompliancePage>('ABOUT');
  const [legalPage, setLegalPage] = useState<CompliancePage>('ABOUT');
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'PREMIUM' | 'CAMPAIGNS' | 'DESIGN_HELP' | 'TICKETS' | 'HISTORY' | 'LEGAL'>('DASHBOARD');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [dbPlans, setDbPlans] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [showFloatingOffer, setShowFloatingOffer] = useState(true);
  const [myCampaigns, setMyCampaigns] = useState<AdCampaign[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Analytics Helpers
  const activeDevicesCount = useMemo(() => {
    return (devices || []).filter(d => d.status === 'ONLINE' || d.status === 'STREAMING').length;
  }, [devices]);

  const totalNetworkUnits = useMemo(() => (devices || []).length, [devices]);
  
  const syncScore = useMemo(() => {
    const total = (devices || []).length;
    return total > 0 ? Math.floor((activeDevicesCount / total) * 100) : 0;
  }, [devices, activeDevicesCount]);

  const liveCampaign = useMemo(() => myCampaigns.find(c => c.status === 'ACTIVE' || c.status === 'LIVE'), [myCampaigns]);

  const customerBalance = useMemo(() => {
    return payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [payments]);

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
  
  const [isExtracting, setIsExtracting] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null);
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

  const renderHistoryTab = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black italic uppercase text-slate-900 tracking-tight leading-none">Financial History</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 italic">Historical Archive of Deployment Transactions</p>
        </div>
        <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl flex items-center gap-3 shadow-xl">
           <Wallet className="text-amber-500" size={18} />
           <div className="text-right">
              <p className="text-[7px] font-black uppercase text-slate-400 tracking-[0.2em] leading-none">Net Volume</p>
              <p className="text-sm font-black italic tracking-tight">₹{payments.reduce((acc, curr) => acc + (curr.amount || 0), 0).toLocaleString()}</p>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Transaction Link</th>
                <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Asset Unit</th>
                <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Network Deposit</th>
                <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Signal Status</th>
                <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Sync Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 italic">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-8 py-5">
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{p.transactionId || 'SIGNAL_INIT'}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">{p.paymentMethod || 'RAZORPAY'}</p>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                        <Database size={14} />
                      </div>
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-tight italic">Campaign Hub</p>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-xs font-black text-slate-900">₹{p.amount?.toLocaleString()}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col gap-2">
                      <span className={cn(
                        "text-[8px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border w-fit",
                        p.status === 'SUCCESS' || p.status === 'success' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                      )}>
                        {p.status || 'VERIFIED'}
                      </span>
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
                  <td className="px-8 py-5">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                      {p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'SHORT', year: 'numeric' }) : 'Pending Sync'}
                    </p>
                    <p className="text-[7px] font-black text-slate-300 uppercase tracking-tighter">
                      {p.createdAt?.toDate ? p.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </p>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] italic">No Financial Logs Detected in Current Node</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );

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

  const [orderData, setOrderData] = useState<any>(null);
  const [isPreparingOrder, setIsPreparingOrder] = useState(false);

  const prepareOrder = async () => {
    if (!user) return alert('Please login');
    if (!phone || phone.length < 10) return alert('Contact needed');
    
    setIsPreparingOrder(true);
    setLoading(true);

    const baseAmount = typeof selectedPlan.price === 'string' ? parseFloat(selectedPlan.price.replace(/[^0-9.]/g, '')) : selectedPlan.price;
    const amount = baseAmount + (needDesigner ? 1000 : 0);

    try {
      console.log("[PAYMENT_SYSTEM] Pre-creating order...");
      const orderResponse = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency: 'INR',
          notes: { user_uid: user.uid, title: campaignDetails.title }
        })
      });

      if (!orderResponse.ok) throw new Error("Order creation failed on server");
      const order = await orderResponse.json();
      setOrderData(order);
      console.log("[PAYMENT_SYSTEM] Order ready for secondary gesture.");
    } catch (e: any) {
      alert(`Initialization Error: ${e.message}`);
    } finally {
      setIsPreparingOrder(false);
      setLoading(false);
    }
  };

  const handlePaymentAndSubmit = async () => {
    if (!orderData) {
      return prepareOrder();
    }
    
    const razorpayKey = 'rzp_live_SnZDlb9YCezb2w';
    
    try {
      if (typeof (window as any).Razorpay === 'undefined') {
        alert("Payment SDK still loading. Please wait 2 seconds.");
        return;
      }

      console.log("[PAYMENT_SYSTEM] Opening Modal with Fresh Gesture...");
      const options = {
        key: razorpayKey,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "AutoAds Pro",
        description: `Activation: ${campaignDetails.title}`,
        image: "https://darshanct43.github.io/autoads/logo.png",
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            setLoading(true);
            const verifyResponse = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                uid: user?.uid,
                planData: { amount: orderData.amount / 100, planId: selectedPlan.id },
                campaignData: {
                  title: campaignDetails.title,
                  type: campaignDetails.type,
                  customerId: user?.uid,
                  targetCity: selectedCity === 'Other' ? customCity : selectedCity,
                  targetState: selectedState,
                  duration: campaignDetails.duration,
                  needDesigner: !!needDesigner,
                  paymentStatus: 'PAID',
                  paymentId: response.razorpay_payment_id,
                  paymentReceived: true,
                  createdAt: new Date(),
                  updatedAt: new Date()
                }
              })
            });

            const result = await verifyResponse.json();
            
            // Also explicitly record payment record for history
            await firebaseService.recordPayment({
              transactionId: response.razorpay_payment_id,
              amount: orderData.amount / 100,
              paymentMethod: 'razorpay',
              status: 'SUCCESS',
              customerId: user?.uid || '',
              campaignId: result.campaignId || 'NEW_CAMPAIGN'
            });

            setCreationStep('MEDIA');
            if (result.campaignId) {
               setCreatedCampaignId(result.campaignId);
               localStorage.setItem('last_created_campaign', result.campaignId);
            }
            alert("SUCCESS: Payment Verified! Your campaign is now ACTIVE and waiting for assets.");
            setLoading(false);
            setShowPayment(false);
          } catch (verifyErr: any) {
            console.error(verifyErr);
            alert("Verification Failed. Please contact support.");
            setLoading(false);
          }
        },
        prefill: {
          name: user.displayName || "Client",
          email: user.email || "",
          contact: phone
        },
        theme: { color: "#f59e0b" },
        modal: {
          ondismiss: () => setLoading(false)
        }
      };

      const rzpObj = new (window as any).Razorpay(options);
      rzpObj.open();
    } catch (e: any) {
      alert(`Modal Error: ${e.message}`);
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

    const unsubscribeTickets = firebaseService.subscribeToCustomerTickets(user.uid, setTickets);

    return () => {
      unsubscribeNotices();
      unsubscribeCampaigns();
      unsubscribeDevices();
      unsubscribeTickets();
    };
  }, [user]);

  useEffect(() => {
    if (activeTicketId) {
      const unsubscribeChat = firebaseService.subscribeToMessages(activeTicketId, setChatMessages);
      return () => unsubscribeChat();
    }
  }, [activeTicketId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeTicketId || !user) return;
    try {
      await firebaseService.sendChatMessage(activeTicketId, {
        content: newMessage,
        senderId: user.uid,
        senderName: user.displayName || 'Customer'
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

  const handleUploadMediaToCampaign = async (campaignId: string, file: File) => {
    if (!user) return;
    try {
      setIsUploadingMedia(true);
      setUploadProgress(0);
      
      const res = await storageService.uploadCampaignMedia(campaignId, file, (p) => {
        setUploadProgress(p);
      });

      await firebaseService.updateCampaign(campaignId, {
        assetUrl: res.url,
        mediaUrl: res.url,
        videoThumbnail: res.thumbnailUrl || "",
        mediaType: file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE',
        mediaReceived: true,
        updatedAt: new Date()
      });

      alert("Media uploaded successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Upload failed: " + err.message);
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleExtractionClick = (e: React.MouseEvent, data: any[], fileName: string) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Extraction button clicked", fileName);
    exportToCSV(data, fileName);
  };

  useEffect(() => {
    if (creationStep === 'PAYMENT' && showPayment && !orderData) {
      prepareOrder();
    }
  }, [creationStep, showPayment]);

  const handleActivePlanChange = (planId: string) => {
    setActivePlan(planId);
    setSelectedPlan(plans.find(p => p.id === planId));
    setOrderData(null); // Reset order data when plan changes
  };

  const handleRequestDesign = async (type: string) => {
    if (!user) return alert('Please login');
    try {
      setLoading(true);
      await firebaseService.createSupportTicket({
        customerId: user.uid,
        customerName: user.displayName || 'Customer',
        title: `Design Request: ${type}`,
        description: `Customer is requesting ${type} for their campaigns.`,
        priority: 'MEDIUM',
        category: 'Design Strategy',
        type: 'CUSTOMER'
      });
      alert('Design request submitted! A designer will connect with you via Support Tickets.');
      setActiveTab('TICKETS');
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <ErrorBoundary componentName="Client Command Center">
      <div className="min-h-screen bg-[#f8fafc]">
      {/* Navigation */}
      <nav className="h-16 border-b border-slate-200 flex items-center justify-between px-4 md:px-8 bg-white/80 backdrop-blur-md sticky top-0 z-[100]">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-900 transition-colors z-[110]"
            aria-label="Toggle Menu"
          >
            {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900 tracking-tight text-xs md:text-sm uppercase tracking-widest leading-none">Auto <span className="text-amber-500 italic">Ads</span></span>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mt-1 md:mt-1.5 flex items-center gap-1">
              by <span className="text-slate-600 font-bold uppercase tracking-widest italic">Mayaan</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-6 h-full">
          <div className="hidden md:flex h-full items-center gap-6">
            {[
              { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'CAMPAIGNS', label: 'Campaigns', icon: Target },
              { id: 'HISTORY', label: 'History', icon: History },
              { id: 'TICKETS', label: 'Support', icon: MessageSquare },
              { id: 'DESIGN_HELP', label: 'Designer', icon: Plus }
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)} 
                className={cn(
                  "h-full px-0 transition-all whitespace-nowrap text-[10px] font-black uppercase tracking-widest flex items-center", 
                  activeTab === tab.id ? "text-amber-600 border-b-2 border-amber-500" : "text-slate-400 hover:text-slate-900"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {user && (
            <div className="flex items-center gap-2 md:gap-4 ml-2 md:border-l md:border-slate-100 md:pl-6 shrink-0">
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
      <AnimatePresence>
        {showMobileMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileMenu(false)}
              className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-[55] md:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed top-0 left-0 bottom-0 w-[280px] bg-white z-[60] md:hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-950 text-white">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black uppercase tracking-tighter italic">Auto<span className="text-amber-500">Ads</span> Portal</span>
                </div>
                <button onClick={() => setShowMobileMenu(false)} className="text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {[
                  { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
                  { id: 'CAMPAIGNS', label: 'Campaigns', icon: Target },
                  { id: 'HISTORY', label: 'History', icon: History },
                  { id: 'TICKETS', label: 'Support', icon: MessageSquare },
                  { id: 'DESIGN_HELP', label: 'Designer', icon: Plus }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      setShowMobileMenu(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                      activeTab === item.id ? "bg-slate-900 text-amber-500 shadow-xl" : "text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    <item.icon size={18} />
                    {item.label}
                    {activeTab === item.id && <ChevronRight size={14} className="ml-auto" />}
                  </button>
                ))}
              </div>

              <div className="p-4 border-t border-slate-100 space-y-4">
                 <div className="flex items-center gap-3 px-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                      <User size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-900 uppercase">{user.email?.split('@')[0]}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">Customer Portal</p>
                    </div>
                 </div>
                 <button 
                  onClick={onLogout}
                  className="w-full flex items-center gap-4 px-4 py-4 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-all text-left"
                 >
                    <LogOut size={18} />
                    Logout Session
                 </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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

        {activeTab === 'TICKETS' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("flex bg-white border border-slate-100 rounded-[3rem] overflow-hidden shadow-xl", activeTab === 'TICKETS' ? "h-[calc(100vh-200px)] md:h-[calc(100vh-250px)] min-h-[400px]" : "h-0")}
          >
            {/* Sidebar */}
            <div className={cn(
              "w-80 border-r border-slate-100 flex flex-col bg-slate-50/50 transition-all duration-300",
              activeTicketId ? "hidden md:flex" : "flex w-full md:w-80"
            )}>
               <div className="p-8 border-b border-slate-100 bg-white">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest italic leading-none">Your Help Desk</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Chat with our Team</p>
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
                    <div className="py-20 text-center">
                       <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <MessageSquare className="text-slate-200" size={32} />
                       </div>
                       <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">No support chats started</p>
                    </div>
                  )}
               </div>
            </div>

            {/* Chat Area */}
            <div className={cn(
              "flex-1 flex flex-col bg-white transition-all duration-300",
              !activeTicketId && "hidden md:flex"
            )}>
               {activeTicketId ? (
                 <>
                   <div className="h-20 border-b border-slate-100 px-4 md:px-8 flex items-center justify-between bg-white">
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
                             "px-5 py-4 rounded-[1.5rem] text-[11px] font-bold tracking-tight shadow-sm",
                             msg.senderId === user?.uid 
                               ? "bg-slate-900 text-white rounded-tr-none" 
                               : msg.senderId === 'system' ? "bg-amber-50 border border-amber-100 text-amber-600 rounded-tl-none italic" : "bg-white border border-slate-100 text-slate-600 rounded-tl-none"
                           )}>
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
                      <div className="flex gap-4">
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
                       <h4 className="text-lg font-black italic uppercase text-slate-900 tracking-tight">Signal Relay Inactive</h4>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-relaxed">Select a thread from the secure roster to interface with our coordination team.</p>
                    </div>
                 </div>
               )}
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

        {/* Removed OFFERS tab as requested - consolidated into DASHBOARD */}

        {activeTab === 'HISTORY' && renderHistoryTab()}
        
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
                                 <div className="flex flex-col gap-2">
                                   <span className={cn("text-[8px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border w-fit", 
                                      !ad.paymentReceived && ad.status === 'PENDING' ? "bg-red-50 text-red-600 border-red-100 animate-pulse" :
                                      ad.status === 'PENDING' || ad.status === 'PENDING_VERIFICATION' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                      ad.status === 'APPROVED' ? "bg-green-50 text-green-600 border-green-100" :
                                      ad.status === 'ACTIVE' || ad.status === 'LIVE' ? "bg-slate-900 text-amber-500 border-slate-900 shadow-lg" :
                                      "bg-red-50 text-red-600 border-red-100"
                                   )}>
                                      {!ad.paymentReceived && ad.status === 'PENDING' ? "PAYMENT FAILED / PENDING" :
                                       ad.paymentReceived && !ad.mediaReceived && !ad.needDesigner && ad.status === 'PENDING' ? "WAITING FOR MEDIA" : 
                                       ad.paymentReceived && ad.needDesigner && ad.status === 'PENDING' ? "DESIGNER ASSIGNED" :
                                       ad.paymentReceived && (ad.mediaReceived || ad.mediaUrl || ad.assetUrl) && ad.status === 'PENDING' ? "WAITING FOR TEAM APPROVAL" :
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
                                    {(!ad.assetUrl && !ad.mediaUrl) && (
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
                                            <span className="text-[8px] font-black uppercase">Choose File</span>
                                          </button>
                                       </div>
                                    )}
                                    <button className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm">
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
                      <button 
                         onClick={() => handleRequestDesign('Elite Motion Studio')}
                         className="w-full py-5 bg-amber-500 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-400 transition-all shadow-2xl shadow-amber-500/20 relative z-10"
                      >
                        Hire Motion Expert
                      </button>
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
                  {creationStep !== 'DETAILS' && (
                    <motion.button 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => setCreationStep('DETAILS')}
                      className="p-2 bg-white/20 hover:bg-white/40 rounded-full transition-all flex items-center justify-center"
                    >
                      <ArrowLeft size={18} />
                    </motion.button>
                  )}
                  <div>
                    <h3 className="text-2xl font-black italic tracking-tight uppercase">
                      {creationStep === 'DETAILS' ? "Campaign Config" : creationStep === 'PAYMENT' ? "Secure Payment" : "Media Injection"}
                    </h3>
                    <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest italic tracking-wider">
                      {creationStep === 'DETAILS' ? "Configure Target Signal" : creationStep === 'PAYMENT' ? "Deposit Funds to Network" : "Upload Campaign Creative"}
                    </p>
                  </div>
                </div>
                <button onClick={() => { setShowPayment(false); setCreationStep('DETAILS'); }} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {creationStep === 'DETAILS' ? (
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

                    <div className="space-y-2">
                       <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1">Contact for Deployment</label>
                       <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                          <input 
                             type="tel"
                             placeholder="10-digit Mobile"
                             value={phone}
                             onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                             className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-4 text-xs font-bold tracking-tight outline-none"
                          />
                       </div>
                    </div>

                    <button 
                      onClick={() => {
                        if (!campaignDetails.title || !selectedCity || phone.length < 10) {
                          alert('Please fill all details correctly.');
                          return;
                        }
                        setCreationStep('PAYMENT');
                      }}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                    >
                      Continue to Payment <ChevronRight size={16} />
                    </button>
                  </div>
                ) : creationStep === 'PAYMENT' ? (
                  <div className="space-y-6 py-6">
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
                      <p className="text-center text-[10px] font-black text-green-600 uppercase animate-pulse">Payment Signal Ready. Click above to open gateway.</p>
                    )}
                    
                    <p className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-widest italic opacity-60">Fast Secure Checkout • RBI Compliant</p>
                  </div>
                ) : (
                  <div className="space-y-6 py-4">
                    <div className="text-center space-y-2">
                       <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                          <Check size={24} />
                       </div>
                       <h4 className="text-lg font-black italic uppercase text-slate-900 leading-tight">Payment Confirmed!</h4>
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">You can now optionally upload your ad media</p>
                    </div>

                    <div className="space-y-4">
                       <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                          <button 
                            onClick={() => setCampaignDetails({...campaignDetails, type: 'IMAGE'})}
                            className={cn("flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all", campaignDetails.type === 'IMAGE' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                          >
                            <div className="flex items-center justify-center gap-2">
                               <ImageIcon size={14} /> Poster
                            </div>
                          </button>
                          <button 
                            onClick={() => setCampaignDetails({...campaignDetails, type: 'VIDEO'})}
                            className={cn("flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all", campaignDetails.type === 'VIDEO' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                          >
                            <div className="flex items-center justify-center gap-2">
                               <Video size={14} /> Video
                            </div>
                          </button>
                       </div>

                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Slot Length</label>
                          <select 
                            value={campaignDetails.duration}
                            onChange={(e) => setCampaignDetails({...campaignDetails, duration: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-[11px] font-black uppercase tracking-tight outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                          >
                             <option value="15">15 SECONDS LIGHT SIGNAL</option>
                             <option value="30">30 SECONDS STANDARD SIGNAL</option>
                             <option value="60">60 SECONDS PREMIUM SIGNAL</option>
                          </select>
                       </div>

                       <input 
                         type="file" 
                         id="post-payment-upload" 
                         className="hidden" 
                         accept={campaignDetails.type === 'VIDEO' ? 'video/*' : 'image/*'}
                         onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file && user) {
                               const campaignId = localStorage.getItem('last_created_campaign');
                               if (!campaignId) {
                                  alert("No active campaign found to attach media to. Please check your dashboard.");
                                  return;
                               }
                               
                               // COMPRESSION LOGIC
                               setIsUploadingMedia(true);
                               try {
                                  let finalFile: File | Blob = file;
                                  if (file.type.startsWith('image/')) {
                                     finalFile = await compressImage(file, 1024, 0.6);
                                  }
                                  
                                  const res = await storageService.uploadCampaignMedia(campaignId, finalFile as File, (p) => {
                                     setUploadProgress(p);
                                  });

                                  await firebaseService.updateCampaign(campaignId, {
                                     mediaUrl: res.url,
                                     assetUrl: res.url,
                                     videoThumbnail: res.thumbnailUrl || "",
                                     mediaType: campaignDetails.type,
                                     mediaReceived: true,
                                     updatedAt: new Date()
                                  });
                                  
                                  alert("Media Synced Successfully! Campaign updated.");
                                  setShowPayment(false);
                                  setCreationStep('DETAILS');
                               } catch (err) {
                                  console.error(err);
                                  alert("Media upload failed. You can re-upload from your dashboard.");
                               } finally {
                                  setIsUploadingMedia(false);
                               }
                            }
                         }}
                       />

                       <button 
                         onClick={(e) => {
                           e.preventDefault();
                           document.getElementById('post-payment-upload')?.click();
                         }}
                         disabled={isUploadingMedia}
                         className={cn(
                           "w-full h-44 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 transition-all group/upload bg-slate-50",
                           isUploadingMedia ? "cursor-wait opacity-80" : "hover:border-amber-500 hover:bg-white cursor-pointer"
                         )}
                       >
                         {isUploadingMedia ? (
                            <div className="text-center space-y-4">
                               <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto relative">
                                  <div className="absolute inset-0 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                                  <span className="text-[10px] font-black text-slate-900">{uploadProgress}%</span>
                               </div>
                               <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] animate-pulse">Syncing File...</p>
                            </div>
                         ) : (
                            <>
                               <div className="w-14 h-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-300 group-hover/upload:text-amber-500 transition-all shadow-sm">
                                  <Upload size={24} />
                               </div>
                               <div className="text-center space-y-1">
                                  <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest italic">Choose Photo/Video</p>
                                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.2em]">Select from your device</p>
                               </div>
                            </>
                         )}
                       </button>
                    </div>

                    <button 
                      onClick={() => { setShowPayment(false); setCreationStep('DETAILS'); }}
                      className="w-full py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
                    >
                      Skip For Now, Upload Later
                    </button>
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
                         setActiveTab('DASHBOARD');
                         setShowFloatingOffer(false);
                         setShowPayment(true);
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
                  { id: 'DASHBOARD', icon: Activity, label: 'Home' },
                  { id: 'CAMPAIGNS', icon: Monitor, label: 'Campaigns' },
                  { id: 'HISTORY', icon: Wallet, label: 'Payment Logs' },
                  { id: 'TICKETS', icon: MessageSquare, label: 'Support Tickets' },
                  { id: 'DESIGN_HELP', icon: Sparkles, label: 'Designer Studio' },
                  { id: 'LEGAL', icon: ShieldCheck, label: 'Legal & Info' },
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
                        : "bg-white border-slate-100 text-slate-400"
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

      <AdminAssistant 
        activeTab={activeTab} 
        role="customer" 
        systemContext={{
           userName: user?.displayName || 'Enterprise User',
           balance: customerBalance,
           transactions: payments,
           activeTickets: tickets.filter(t => t.status === 'open' || t.status === 'OPEN').length,
           liveUnitsCount: activeDevicesCount
        }}
      />
    </div>
    </ErrorBoundary>
  );
}
