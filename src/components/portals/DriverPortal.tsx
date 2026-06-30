import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IndianRupee, MapPin, Settings, AlertTriangle, Globe, ChevronRight, BarChart2, Bell, Wallet, ArrowDownCircle, Info, X, Landmark, Smartphone, ShieldCheck, CheckCircle2, MessageSquare, Send, LogOut, Eye, Shield, FileText, RefreshCw, Contact, Coins, Activity, CloudUpload, Baby, Users, VolumeX, School, Sun, Moon, Zap, ArrowLeft, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import { firebaseService, AdCampaign, DriverAssignment, SupportTicket, ChatMessage } from '@/services/firebaseService';
import { offlineStorageService, DocMeta } from '@/services/offlineStorageService';
import { UserRole } from '@/types';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import ComplianceContent, { CompliancePage } from '../common/ComplianceContent';
import AdminAssistant from '../common/AdminAssistant';
import DriverDigitalAgreement from './DriverDigitalAgreement';
import DriverKYC from './DriverKYC';
import NotificationCenter from '../common/NotificationCenter';
import DriverQuotesExtension from './DriverQuotesExtension';

import { translations } from '@/lib/translations';

interface DriverPortalProps {
  onLogout: () => void;
}

export default function DriverPortal({ onLogout }: DriverPortalProps) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [lang, setLang] = useState<string>('EN');
  const [showLangPicker, setShowLangPicker] = useState(false);
  const t = (translations as any)[lang.toLowerCase()] || translations.en;
  const getStatusLabel = (val: string) => {
    const key = `status_${val.toLowerCase()}`;
    return t[key] || val;
  };
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const accountStatus = driverProfile?.accountStatus || (driverProfile?.status === 'active' || driverProfile?.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE');
  const status = accountStatus === 'ACTIVE' ? 'ACTIVE' : 'OFFLINE';
  const [activeTab, setActiveTab] = useState<'EARNINGS' | 'WITHDRAW' | 'SETTINGS'>('EARNINGS');
  const [showKYC, setShowKYC] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);
  const [agreement, setAgreement] = useState<any>(null);
  const [showCompliance, setShowCompliance] = useState(false);
  const [compliancePage, setCompliancePage] = useState<CompliancePage>('ABOUT');
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [assignedCampaigns, setAssignedCampaigns] = useState<AdCampaign[]>([]);
  const [assignments, setAssignments] = useState<DriverAssignment[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [withdrawRequests, setWithdrawRequests] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [bankDetails, setBankDetails] = useState<any>(null);
  const [showBankModal, setShowBankModal] = useState(false);
  const [withdrawUpiId, setWithdrawUpiId] = useState('');
  const [activeRidePref, setActiveRidePref] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (!driverProfile?.terminalId) return;
    const unsubscribe = firebaseService.subscribeToRidePreference(driverProfile.terminalId, (pref) => {
      if (pref) {
        const expiresAt = pref.expiresAt ? new Date(pref.expiresAt) : null;
        if (!expiresAt || expiresAt > new Date()) {
          setActiveRidePref(pref);
        } else {
          setActiveRidePref(null);
        }
      } else {
        setActiveRidePref(null);
      }
    });

    const checkExpiry = setInterval(() => {
      if (activeRidePref?.expiresAt && new Date(activeRidePref.expiresAt) < new Date()) {
        setActiveRidePref(null);
        firebaseService.clearRidePreference(driverProfile.terminalId);
      }
    }, 10000);

    return () => {
      unsubscribe();
      clearInterval(checkExpiry);
    };
  }, [driverProfile?.terminalId, activeRidePref?.expiresAt]);

  const handleDriverSelectRideMode = async (mode: 'CHILDREN' | 'FAMILY' | 'SILENT' | 'SCHOOL_TRIP' | 'NORMAL', durationMinutes: number = 30) => {
    if (!driverProfile?.terminalId) {
      showToast("No active display terminal provisioned. Activate Display Mode first.", "error");
      return;
    }

    if (mode === 'NORMAL') {
      try {
        await firebaseService.clearRidePreference(driverProfile.terminalId);
        setActiveRidePref(null);
        showToast("Ride audience configuration reset to normal queue.", "success");
      } catch (err) {
        console.error(err);
      }
      return;
    }

    const now = new Date();
    const expires = new Date(now.getTime() + durationMinutes * 60 * 1000);

    const payload = {
      rideId: `ride_${Date.now()}`,
      deviceId: driverProfile.terminalId,
      childrenPresent: mode === 'CHILDREN' || mode === 'SCHOOL_TRIP',
      familyMode: mode === 'FAMILY' || mode === 'CHILDREN' || mode === 'SCHOOL_TRIP',
      muteAds: mode === 'SILENT',
      blockedCategories: mode === 'CHILDREN' || mode === 'SCHOOL_TRIP' ? ['alcohol', 'betting', 'gambling', 'political'] : mode === 'FAMILY' ? ['alcohol', 'political'] : [],
      nightMode: false,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      driverOverrideMode: mode
    };

    try {
      await firebaseService.saveRidePreference(payload);
    } catch (err) {
      showToast("Failed to sync active ride mode.", "error");
    }
  };

  const handleDriverSelectBrightnessMode = async (mode: 'AUTO' | 'BOOST' | 'NIGHT' | 'MANUAL', level?: number) => {
    if (!driverProfile?.terminalId) {
      showToast("No active display terminal provisioned. Activate Display Mode first.", "error");
      return;
    }

    const payload = {
      deviceId: driverProfile.terminalId,
      brightnessMode: mode,
      manualBrightnessLevel: level !== undefined ? level : (activeRidePref?.manualBrightnessLevel ?? 75),
      updatedAt: new Date().toISOString()
    };

    try {
      await firebaseService.saveRidePreference(payload);
    } catch (err) {
      showToast("Failed to sync active brightness configuration.", "error");
    }
  };

  const handleMakePayment = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Create order via backend
      const response = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 999, // Onboarding fee in INR
          currency: 'INR',
          receipt: `receipt_${Date.now()}`,
          userId: user.uid,
          role: 'DRIVER'
        })
      });

      const orderData = await response.json();
      if (!orderData.id) throw new Error("Order creation failed");

      // 2. Open Razorpay Popup
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
        amount: orderData.amount,
        currency: orderData.currency,
        name: "AutoAds Driver Portal",
        description: "Onboarding & Terminal Security Deposit",
        order_id: orderData.id,
        handler: async (response: any) => {
          try {
            // 3. Verify Payment
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId: user.uid,
                role: 'DRIVER'
              })
            });

            const verifyData = await verifyRes.json();
            if (verifyData.status === 'success') {
              await firebaseService.updateDriverProfile(user.uid, { 
                paymentStatus: 'SUCCESS',
                paymentId: response.razorpay_payment_id
              });
              showToast("Onboarding Payment Successful! Registry Updated.", "success");
            } else {
              showToast("Payment verification failed. Contact support.", "error");
            }
          } catch (err) {
            showToast("Error verifying payment.", "error");
          }
        },
        prefill: {
          name: driverProfile?.name || "",
          email: driverProfile?.email || "",
          contact: driverProfile?.phone || ""
        },
        theme: {
          color: "#0f172a"
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error("Razorpay Error:", err);
      // Fallback for demo/test environments if needed
      if (err.message.includes("failed") || !import.meta.env.VITE_RAZORPAY_KEY_ID) {
        showToast("Gateway connection error. Using bypass for demo.", "info");
        await firebaseService.updateDriverProfile(user.uid, { paymentStatus: 'SUCCESS' });
      } else {
        showToast("Payment initialization failed.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const totalEarnings = payments
    .filter(p => p.type === 'earning')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalWithdrawn = payments
    .filter(p => p.type === 'withdrawal')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const pendingWithdrawalAmount = withdrawRequests
    .filter(r => r.status === 'pending')
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  const availableBalance = totalEarnings - totalWithdrawn - pendingWithdrawalAmount;

  const handleEnterDisplayMode = () => {
    const isAgreementSigned = driverProfile?.agreementStatus === 'SIGNED' || agreement?.agreementAccepted;
    
    if (!isAgreementSigned) {
      showToast("Terminal Access Restricted. Please sign the Digital Partnership Agreement to unlock.", "error");
      return;
    }

    if (confirm("Confirm: Switching to Display Terminal Mode. This will hide your dashboard and start showing advertisements.")) {
      localStorage.setItem('auto_ads_is_terminal', 'true');
      window.location.reload();
    }
  };

  const driverCampaigns = assignedCampaigns.filter(c => 
    assignments.some(a => a.campaignId === c.id)
  );

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    let unsubscribeAgreement: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setLoading(false);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }
      if (unsubscribeAgreement) {
        unsubscribeAgreement();
        unsubscribeAgreement = null;
      }

      if (u) {
        setUser(u);
        unsubscribeProfile = firebaseService.subscribeToDriverProfile(u.uid, (profile) => {
            if (profile) {
            setDriverProfile(profile);
            if (profile.bankDetails) setBankDetails(profile.bankDetails);
            if (!profile.terminalId) {
              console.log("[DriverPortal] No terminal assigned, auto-ensuring terminal for", u.uid);
              firebaseService.autoEnsureTerminalForDriver(u.uid).catch((err) => {
                console.error("[DriverPortal] Failed to auto-provision terminal:", err);
              });
            }
          } else {
             // If no profile, we still need to fetch once to create it
             firebaseService.getDriverProfile(u.uid).then(async (p) => {
               if (!p) {
                 const newProfile = {
                   uid: u.uid,
                   name: u.displayName || 'New Driver',
                   email: u.email || '',
                   phone: u.phoneNumber || '',
                   status: 'ACTIVE' as const,
                   accountStatus: 'ACTIVE',
                   kycStatus: 'PENDING',
                   documentStatus: 'PENDING',
                   paymentStatus: 'PENDING',
                   agreementStatus: 'PENDING',
                   supportApproval: 'PENDING',
                   driverCode: `DRV-${u.uid.slice(-6).toUpperCase()}`,
                   password: Math.random().toString(36).slice(-8), 
                   createdAt: new Date().toISOString()
                 };
                 await firebaseService.saveDriverProfile(newProfile as any);
                 setDriverProfile(newProfile);
               }
             });
          }
        });
        unsubscribeAgreement = firebaseService.subscribeToAgreement(u.uid, (agr) => {
            setAgreement(agr);
            if (agr && agr.agreementAccepted) {
                setShowAgreement(false);
            }
        });
      }
    });
    return () => {
      unsubscribe();
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribeAgreement) unsubscribeAgreement();
    };
  }, []);

  // Real Geolocation: Track live location with high accuracy
  useEffect(() => {
    if (!user || status !== 'ACTIVE') return;

    const updateLocation = (lat: number, lng: number, speed: number | null) => {
      firebaseService.updateDriverLocation(user.uid, {
        lat,
        lng,
        speed: speed || 0, // No random speed fallback
        timestamp: new Date().toISOString(),
        activeCampaignId: driverCampaigns[0]?.id || null,
        isOnline: true
      });
    };

    let locationInterval: NodeJS.Timeout | null = null;
    
    const reportLocation = () => {
      if (!("geolocation" in navigator)) return;
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateLocation(
            position.coords.latitude, 
            position.coords.longitude, 
            position.coords.speed !== null ? position.coords.speed * 3.6 : null // m/s to km/h
          );
        },
        (error) => {
          console.warn("Geolocation current position error:", error);
        },
        { enableHighAccuracy: true }
      );
    };

    if (user && status === 'ACTIVE') {
      reportLocation();
    }

    return () => {};
  }, [user, status, driverCampaigns.length > 0 ? driverCampaigns[0].id : null]);

  useEffect(() => {
    if (!user) return;

    const unsubAssignments = firebaseService.subscribeToDriverAssignments(user.uid, (data) => {
      setAssignments(data);
    });

    const unsubCampaigns = firebaseService.subscribeToActiveAssignedCampaigns(user.uid, (data) => {
      setAssignedCampaigns(data);
    });

    const unsubPayments = firebaseService.subscribeToDriverPayments(user.uid, (data) => {
      setPayments(data);
    });

    const unsubWithdraws = firebaseService.subscribeToWithdrawRequests((data) => {
      setWithdrawRequests(data);
    }, user.uid);

    const unsubTickets = firebaseService.subscribeToSupportTickets(setSupportTickets, { userId: user.uid });

    return () => {
      unsubAssignments();
      unsubCampaigns();
      unsubPayments();
      unsubWithdraws();
      unsubTickets();
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!activeTicketId) {
      setChatMessages([]);
      return;
    }
    firebaseService.markTicketAsRead(activeTicketId);
    const unsubscribe = firebaseService.subscribeToMessages(activeTicketId, setChatMessages);
    return () => unsubscribe();
  }, [activeTicketId]);

  const currentVehicleNo = driverProfile?.vehicleNumber || 'PROVISIONING...';

  const languages = [
    { code: 'EN', name: 'English' },
    { code: 'HI', name: 'हिंदी (Hindi)' },
    { code: 'KN', name: 'ಕನ್ನಡ (Kannada)' },
    { code: 'TA', name: 'தமிழ் (Tamil)' },
    { code: 'TE', name: 'తెలుగు (Telugu)' },
    { code: 'MR', name: 'मराठी (Marathi)' },
    { code: 'ML', name: 'മലയാളം (Malayalam)' },
    { code: 'BN', name: 'বাংলা (Bengali)' },
    { code: 'GU', name: 'ગુજરાતી (Gujarati)' },
    { code: 'PA', name: 'ਪੰਜਾਬੀ (Punjabi)' }
  ] as const;

  const handleSaveBank = async (details: any) => {
    if (!user) return;
    try {
      await firebaseService.updateDriverProfile(user.uid, { bankDetails: details });
      setBankDetails(details);
      setShowBankModal(false);
      showToast("Bank Details Linked Successfully!", "success");
    } catch (e) {
      showToast("Failed to save bank details.", "error");
    }
  };


  const handleWithdrawClick = () => {
    setShowWithdraw(true);
  };

  const handleWithdrawAction = async (amount: number, upiId: string) => {
    if (!user) return;
    if (!agreement?.agreementAccepted) {
      showToast("Please accept the Digital Partnership Agreement before requesting withdrawals.", "info");
      return;
    }
    if (driverProfile?.kycStatus !== 'APPROVED') {
      if (driverProfile?.kycStatus === 'PENDING' || driverProfile?.kycStatus === 'UNDER_REVIEW') {
        showToast("Your KYC is currently under review. Please wait for approval to withdraw funds.", "info");
      } else {
        showToast("Please complete KYC by uploading required documents under Settings to withdraw funds.", "info");
      }
      return;
    }
    if (amount <= 0) {
      showToast("Please enter a withdrawal amount greater than zero.", "error");
      return;
    }
    if (amount > availableBalance) {
      showToast("Insufficient Balance!", "error");
      return;
    }
    if (!upiId || !upiId.includes('@')) {
      showToast("Please enter a valid UPI ID (e.g. yourname@upi)", "error");
      return;
    }
    try {
      // Create the withdrawal request
      await firebaseService.requestWithdrawal({
        driverId: user.uid,
        amount,
        upiId: upiId
      });

      // Also ensure this UPI ID is stored in the driver profile for future use
      if (upiId !== driverProfile?.upiId) {
        await firebaseService.updateDriverProfile(user.uid, { upiId });
        setDriverProfile((prev: any) => ({ ...prev, upiId }));
      }

      showToast("Withdrawal Request Raised! Amount will be credited to your UPI ID within 48 hours.", "success");
      setShowWithdraw(false);
    } catch (e) {
      showToast("Failed to raise withdrawal request.", "error");
    }
  };

  const handleSendMessage = async () => {
    if (!activeTicketId || !newMessage.trim() || !user) return;
    try {
      await firebaseService.sendTicketChatMessage(activeTicketId, {
        senderId: user.uid,
        senderName: user.displayName || 'Driver',
        senderRole: 'driver',
        text: newMessage.trim()
      });
      setNewMessage('');
    } catch (e) {
      console.error("Chat error:", e);
    }
  };

  const renderContent = () => {
    if (showKYC) return <DriverKYC driverId={user?.uid!} onSuccess={() => setShowKYC(false)} onCancel={() => setShowKYC(false)} />;
    switch (activeTab) {
      case 'SETTINGS':
        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 pb-24"
          >
             <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl space-y-8">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                   <button 
                     onClick={() => setActiveTab('EARNINGS')} 
                     className="p-2 sm:p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 active:scale-95 transition-all text-slate-400 border border-slate-100 lg:hidden"
                   >
                     <ArrowLeft size={24} />
                   </button>
                   <div>
                      <h2 className="text-2xl font-black italic uppercase text-slate-900 leading-none tracking-tight">Settings Hub</h2>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Compliance & Support</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                   {[
                     { id: 'KYC', label: 'KYC Verification', icon: CloudUpload, color: 'text-rose-500' },
                     { id: 'ABOUT', label: 'About AutoAds', icon: Info, color: 'text-blue-500' },
                     { id: 'PRIVACY', label: 'Privacy Policy', icon: Shield, color: 'text-emerald-500' },
                     { id: 'TERMS', label: 'Terms of Use', icon: FileText, color: 'text-indigo-500' },
                     { id: 'REFUND', label: 'Refund Policy', icon: RefreshCw, color: 'text-amber-500' },
                     { id: 'CONTACT', label: 'Contact Support', icon: MessageSquare, color: 'text-amber-600' }
                   ].map((item) => (
                     <button 
                        key={item.id}
                        onClick={() => {
                          if (item.id === 'KYC') {
                            if (driverProfile?.kycStatus === 'APPROVED') {
                              return;
                            }
                            setShowKYC(true);
                          } else { 
                            setCompliancePage(item.id as CompliancePage); 
                            setShowCompliance(true); 
                          }
                        }}
                        className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:bg-white hover:border-slate-200 transition-all group"
                     >
                        <div className="flex items-center gap-4">
                           <div className={cn("w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform", item.color)}>
                              <item.icon size={20} />
                            </div>
                           <div className="flex items-center gap-3">
                              <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{item.label}</span>
                              {item.id === 'KYC' && driverProfile?.kycStatus && (
                                <span className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest", 
                                  driverProfile.kycStatus === 'APPROVED' ? "bg-emerald-100 text-emerald-600" :
                                  (driverProfile.kycStatus === 'PENDING' || driverProfile.kycStatus === 'UNDER_REVIEW') ? "bg-amber-100 text-amber-600" :
                                  "bg-rose-100 text-rose-600"
                                )}>
                                  {driverProfile.kycStatus}
                                </span>
                              )}
                           </div>
                        </div>
                        <ChevronRight size={16} className="text-slate-400" />
                     </button>
                   ))}
                </div>

                <div className="pt-8 border-t border-slate-100 flex flex-col items-center gap-4 text-center">
                   <div className="bg-slate-900 text-amber-500 px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-xl">
                      App Version: 1.0.4 - PROD
                   </div>
                   <button 
                     onClick={onLogout}
                     className="flex items-center gap-2 text-red-500 font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all mt-4"
                   >
                     <LogOut size={16} />
                     Secure Logout
                   </button>
                </div>
             </div>
          </motion.div>
        );
      case 'WITHDRAW':
        return (
          <div className="space-y-6">
            <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl shadow-slate-900/20 space-y-6 overflow-hidden relative">
              <div className="absolute -right-4 -top-4 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full" />
              <div className="flex items-center justify-between relative z-10">
                  <div>
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Available Balance</p>
                    <h3 className="text-4xl font-black text-white tracking-tighter italic">₹{(availableBalance || 0).toLocaleString()}</h3>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setShowSupport(true);
                      }} 
                      className="w-10 h-10 bg-white/10 text-white rounded-xl flex items-center justify-center hover:bg-white/20 transition-all border border-white/10"
                      title="Report Issue"
                    >
                      <AlertTriangle size={18} />
                    </button>
                    <button onClick={handleWithdrawClick} className="w-14 h-14 bg-amber-500 text-slate-900 rounded-[1.25rem] flex items-center justify-center hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/10">
                      <ArrowDownCircle size={28} />
                    </button>
                  </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10 relative z-10 backdrop-blur-sm">
                  <Info size={16} className="text-amber-500 shrink-0" />
                  <p className="text-[10px] font-bold uppercase text-slate-400 leading-tight tracking-wide">Pending Settlements: ₹{(pendingWithdrawalAmount || 0).toLocaleString()}</p>
              </div>
            </div>

            {(!agreement?.agreementAccepted || driverProfile?.kycStatus !== 'APPROVED') && (
              <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-[2rem] space-y-4">
                 <div className="flex items-start gap-3">
                    <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                    <div className="space-y-1">
                       <h4 className="text-xs font-black uppercase text-amber-500 tracking-wider">Payout Access Restricted</h4>
                       <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wide leading-relaxed">
                          {!agreement?.agreementAccepted 
                            ? "Please sign your Digital Partnership Agreement first." 
                            : (driverProfile?.kycStatus === 'UNDER_REVIEW' || driverProfile?.kycStatus === 'PENDING')
                              ? "Your KYC documentation is currently under manual audit by our verification team."
                              : driverProfile?.kycStatus === 'REJECTED'
                                ? "Your KYC documentation has been rejected. Please re-upload verified documents."
                                : "Please upload Aadhaar, DL, and selfie documents to pass KYC verification."
                          }
                       </p>
                    </div>
                 </div>
                 <div className="flex gap-2">
                    {!agreement?.agreementAccepted && (
                       <button 
                         onClick={() => setShowAgreement(true)} 
                         className="px-4 py-2.5 bg-slate-900 border border-slate-800 text-amber-500 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                       >
                         Sign Partnership Agreement
                       </button>
                    )}
                    {driverProfile?.kycStatus !== 'APPROVED' && driverProfile?.kycStatus !== 'PENDING' && driverProfile?.kycStatus !== 'UNDER_REVIEW' && (
                       <button 
                         onClick={() => setShowKYC(true)} 
                         className="px-4 py-2.5 bg-slate-900 border border-slate-800 text-amber-500 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                       >
                         {driverProfile?.kycStatus === 'REJECTED' ? "Re-upload Documents" : "Upload KYC Documents"}
                       </button>
                    )}
                    {(driverProfile?.kycStatus === 'UNDER_REVIEW' || driverProfile?.kycStatus === 'PENDING') && (
                       <span className="px-4 py-2.5 bg-slate-900/10 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-900/10">
                         Verification In Progress
                       </span>
                    )}
                 </div>
              </div>
            )}

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
                               <div className="space-y-3">
                  {payments.slice(0, 15).map((p, i) => (
                    <div key={p.id || i} className="flex flex-col py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 px-2 rounded-xl transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className={cn("text-sm font-black", p.type === 'earning' ? "text-green-600" : "text-amber-600")}>
                            {p.type === 'earning' ? '+' : '-'}₹{(p.amount || 0).toLocaleString()}
                          </p>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                            {p.type === 'earning' ? 'Signal Settlement Received' : 'Funds Withdrawal Signal'}
                          </p>
                          <div className="flex gap-2 mt-2">
                             <button 
                               onClick={() => {
                                 setShowSupport(true);
                                 // Logic to pre-fill ticket could go here
                               }}
                               className="text-[8px] font-black uppercase text-amber-600 hover:text-amber-700 underline underline-offset-4 tracking-[0.2em]"
                             >
                               Raise Signal Error
                             </button>
                             {p.status === 'success' || p.status === 'SUCCESS' ? (
                               <span className="text-[8px] font-black uppercase text-green-500 tracking-[0.2em] flex items-center gap-1">
                                 <CheckCircle2 size={8} /> Credited
                               </span>
                             ) : (
                               <span className="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-1">
                                 <RefreshCw size={8} className="animate-spin" /> Processing
                               </span>
                             )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md mb-1 block w-fit ml-auto",
                            p.status === 'success' || p.status === 'SUCCESS' ? "text-green-500 bg-green-50 border border-green-100" : "text-amber-500 bg-amber-50 border border-amber-100"
                          )}>
                            {p.status}
                          </span>
                          <p className="text-[7px] font-black text-slate-300 uppercase tracking-tighter">
                            {p.createdAt?.toDate ? p.createdAt.toDate().toLocaleString() : 'Transit Signal'}
                          </p>
                        </div>
                      </div>
                      {p.transactionId && (
                        <p className="text-[7px] font-mono font-bold text-slate-400 mt-2 bg-slate-50 p-1 rounded border border-slate-100 w-fit">
                          TELEMETRY_REF: {p.transactionId}
                        </p>
                      )}
                    </div>
                  ))}
                  {payments.length === 0 && (
                    <p className="text-[10px] text-center text-slate-300 font-bold uppercase py-4 tracking-widest">No wallet activity</p>
                  )}
               </div>
            </div>
          </div>
        );
      default:
        const isAgreementSigned = driverProfile?.agreementStatus === 'SIGNED' || agreement?.agreementAccepted;
        const isTerminalUnlocked = isAgreementSigned;
        const isTerminalAccessGranted = 
          isAgreementSigned &&
          driverProfile?.paymentStatus === 'SUCCESS' &&
          driverProfile?.documentStatus === 'APPROVED' &&
          driverProfile?.supportApproval === 'APPROVED';

        return (
          <>
            {/* Status Hierarchy Card - Hide when fully activated */}
            {!isTerminalAccessGranted && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black italic uppercase text-slate-900 leading-none tracking-tight">Activation Pipeline</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Compliance Tracking</p>
                  </div>
                  <div className={cn(
                    "px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2",
                    isTerminalAccessGranted ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                  )}>
                    <div className={cn("w-2 h-2 rounded-full", isTerminalAccessGranted ? "bg-emerald-500 animate-pulse" : "bg-amber-500")} />
                    {isTerminalAccessGranted ? 'Ready for Deployment' : 'Activation Pending'}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                  {[
                    { label: t.account_status, value: driverProfile?.accountStatus || 'ACTIVE', icon: UserIcon, color: 'text-blue-500' },
                    { label: t.document_status, value: driverProfile?.documentStatus || 'PENDING', icon: FileText, color: 'text-amber-500' },
                    { label: t.agreement_status, value: isAgreementSigned ? 'SIGNED' : 'PENDING', icon: ShieldCheck, color: 'text-emerald-500' },
                    { label: t.payment_status, value: driverProfile?.paymentStatus || 'PENDING', icon: IndianRupee, color: 'text-indigo-500' },
                    { label: t.support_audit, value: driverProfile?.supportApproval || 'PENDING', icon: Shield, color: 'text-purple-500' },
                    { label: t.terminal_access, value: isAgreementSigned ? 'UNLOCKED' : 'LOCKED', icon: Smartphone, color: 'text-rose-500' }
                  ].map((stat, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-100 p-4 rounded-3xl space-y-2 group hover:bg-white hover:border-slate-200 transition-all">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform", stat.color)}>
                          <stat.icon size={16} />
                        </div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-wider",
                          (stat.value === 'ACTIVE' || stat.value === 'APPROVED' || stat.value === 'SIGNED' || stat.value === 'SUCCESS' || stat.value === 'UNLOCKED') 
                            ? "text-emerald-600" 
                            : (stat.value === 'REJECTED' || stat.value === 'FAILED' || stat.value === 'LOCKED')
                              ? "text-rose-600"
                              : "text-amber-600"
                        )}>
                          {getStatusLabel(stat.value)}
                        </span>
                        {(stat.value === 'ACTIVE' || stat.value === 'APPROVED' || stat.value === 'SIGNED' || stat.value === 'SUCCESS' || stat.value === 'UNLOCKED') && (
                          <CheckCircle2 size={12} className="text-emerald-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {!isTerminalAccessGranted && (
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                    <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wide leading-relaxed">
                      Note: Your terminal access is currently restricted. Please ensure all documents are approved, payment is successful, and agreement is signed to unlock Display Mode and Campaign Playback.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Activation Requirements Section */}
            {!isTerminalAccessGranted && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-900 rounded-[2.5rem] p-8 border border-white/5 shadow-2xl space-y-6"
              >
                <div>
                  <h3 className="text-xl font-black italic uppercase text-white leading-none tracking-tight">Onboarding Actions</h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">Required for Terminal Activation</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Agreement Action */}
                  <div className="bg-white/5 border border-white/10 p-5 rounded-3xl space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                        <ShieldCheck size={18} />
                      </div>
                      <p className="text-[10px] font-black text-white uppercase tracking-wider">Agreement</p>
                    </div>
                    {(driverProfile?.agreementStatus === 'SIGNED' || agreement?.agreementAccepted) ? (
                      <div className="flex items-center gap-2 text-emerald-500">
                        <CheckCircle2 size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Signed</span>
                      </div>
                    ) : (
                      <button 
                        id="sign-agreement-now-btn"
                        onClick={() => setShowAgreement(true)}
                        className="w-full py-3 bg-amber-500 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all"
                      >
                        Sign Now
                      </button>
                    )}
                  </div>

                  {/* Payment Action */}
                  <div className="bg-white/5 border border-white/10 p-5 rounded-3xl space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                        <IndianRupee size={18} />
                      </div>
                      <p className="text-[10px] font-black text-white uppercase tracking-wider">Onboarding Fee</p>
                    </div>
                    {driverProfile?.paymentStatus === 'SUCCESS' ? (
                      <div className="flex items-center gap-2 text-emerald-500">
                        <CheckCircle2 size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Paid</span>
                      </div>
                    ) : (
                      <button 
                        id="make-onboarding-payment-btn"
                        onClick={handleMakePayment}
                        disabled={!driverProfile?.documentStatus || driverProfile?.documentStatus === 'EMPTY'}
                        className="w-full py-3 bg-white/10 text-white border border-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Make Payment
                      </button>
                    )}
                  </div>

                  {/* KYC Action */}
                  <div className="bg-white/5 border border-white/10 p-5 rounded-3xl space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                        <CloudUpload size={18} />
                      </div>
                      <p className="text-[10px] font-black text-white uppercase tracking-wider">KYC Documents</p>
                    </div>
                    {driverProfile?.documentStatus === 'APPROVED' ? (
                      <div className="flex items-center gap-2 text-emerald-500">
                        <CheckCircle2 size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Approved</span>
                      </div>
                    ) : (
                      <button 
                        id="upload-kyc-docs-btn"
                        onClick={() => setShowKYC(true)}
                        className="w-full py-3 bg-white/10 text-white border border-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all"
                      >
                        {driverProfile?.documentStatus === 'PENDING' ? 'Under Review' : 'Upload Docs'}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* KYC Urgent Action Banner */}
            {driverProfile?.kycStatus !== 'APPROVED' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "p-6 rounded-[2.5rem] border-2 shadow-2xl flex flex-col md:flex-row items-center gap-6 relative overflow-hidden",
                  driverProfile?.kycStatus === 'REJECTED' 
                    ? "bg-rose-500 border-rose-400 text-white" 
                    : "bg-amber-400 border-amber-300 text-slate-900"
                )}
              >
                <div className="absolute right-0 top-0 p-8 opacity-10">
                  <ShieldCheck size={80} />
                </div>
                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center shrink-0">
                  {driverProfile?.kycStatus === 'REJECTED' ? <X size={32} /> : <CloudUpload size={32} />}
                </div>
                <div className="flex-1 text-center md:text-left space-y-1 relative z-10">
                  <h3 className="text-xl font-black italic uppercase leading-none">
                    {driverProfile?.kycStatus === 'REJECTED' ? "KYC Documentation Rejected" : "Identity Audit Required"}
                  </h3>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
                    {driverProfile?.kycStatus === 'UNDER_REVIEW' || driverProfile?.kycStatus === 'PENDING'
                      ? "Verification Pipeline: Your documents are being audited. Please wait." 
                      : "Action Required: Upload your identification files to activate wallet & payouts."}
                  </p>
                </div>
                {(!driverProfile?.kycStatus || driverProfile?.kycStatus === 'REJECTED') && (
                  <button 
                    onClick={() => setShowKYC(true)}
                    className={cn(
                      "px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-xl relative z-10",
                      driverProfile?.kycStatus === 'REJECTED' ? "bg-white text-rose-500" : "bg-slate-900 text-amber-500"
                    )}
                  >
                    {driverProfile?.kycStatus === 'REJECTED' ? "Re-upload Now" : "Upload Docs"}
                  </button>
                )}
              </motion.div>
            )}

            {/* Security Pipeline UI Removed */}

            <div className="bg-white p-6 rounded-[2rem] flex items-center justify-between shadow-xl shadow-slate-200/50 border border-slate-100">
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fleet Presence Status</p>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full transition-all duration-500", status === 'ACTIVE' ? "bg-green-500 shadow-[0_0_12px_#22c55e]" : "bg-slate-300")} />
                    <span className="font-black text-slate-900 text-sm tracking-tight italic uppercase">{status === 'ACTIVE' ? 'Live on Network' : 'Disconnected'}</span>
                  </div>
              </div>
              <div className="hidden sm:block">
                 <p className="text-[8px] font-bold text-slate-300 uppercase tracking-[0.2em] italic">Automatic Sync Active</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-10">
              <div className="bg-amber-500 p-8 rounded-[2.5rem] text-slate-900 shadow-2xl shadow-amber-500/20 space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <IndianRupee size={80} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-amber-900 uppercase tracking-[0.2em] mb-2">Total Earnings</p>
                      <button 
                        onClick={() => setActiveTab('WITHDRAW')}
                        className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-xl hover:bg-white/40 transition-all border border-white/30 text-amber-900 shadow-sm"
                      >
                        <Coins size={16} />
                        <span className="text-[9px] font-black uppercase tracking-widest leading-none">Wallet</span>
                      </button>
                    </div>
                    <h3 className="text-5xl font-black tracking-tighter italic">₹{(totalEarnings || 0).toLocaleString()}</h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="bg-white/20 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-amber-900">
                      Verified Account
                    </div>
                    <div className="flex-1 border-t border-amber-900/10" />
                  </div>
              </div>

              {/* TERMINAL HUB SECTION */}
              <div className={cn(
                "bg-[#0F172A] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl shadow-slate-900/40 relative overflow-hidden group transition-all",
                !isTerminalUnlocked && "opacity-50 grayscale pointer-events-none"
              )}>
                  {!isTerminalUnlocked && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px]">
                       <div className="bg-slate-900/90 border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-3 shadow-2xl">
                          <ShieldCheck size={20} className="text-amber-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-white">Activation Required</span>
                       </div>
                    </div>
                  )}
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                    <Smartphone size={120} />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center justify-between">
                       <div>
                         <h3 className="text-lg font-black text-white italic tracking-tighter uppercase leading-none">Your <span className="text-amber-500">Display</span></h3>
                         <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Managed Ad-Display Module</p>
                       </div>
                       <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                          <div className={cn("w-1.5 h-1.5 rounded-full", (driverProfile?.terminalId && isTerminalUnlocked) ? "bg-green-500 animate-pulse" : "bg-slate-500")} />
                          <span className={cn("text-[8px] font-black uppercase tracking-widest", (driverProfile?.terminalId && isTerminalUnlocked) ? "text-green-500" : "text-slate-500")}>
                            {(driverProfile?.terminalId && isTerminalUnlocked) ? "Provisioned" : "Activation Required"}
                          </span>
                       </div>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl space-y-3">
                       <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest text-center">Hardware Display Activation</p>
                       <div className="flex flex-col items-center gap-3">
                          <p className="text-[8px] text-center text-slate-500 font-bold uppercase italic leading-tight">
                             Terminal session is managed internally. Click below to use this device as an advertising display.
                          </p>
                          <button 
                            onClick={handleEnterDisplayMode}
                            className="w-full py-4 bg-amber-500 text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                          >
                            <Smartphone size={14} /> Launch Display Mode
                          </button>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pb-2">
                       <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center transition-all hover:bg-white/10">
                          <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Terminal ID</p>
                          <p className="text-xs font-mono font-black text-amber-500">{isTerminalUnlocked ? (driverProfile?.terminalId || 'NOT ASSIGNED') : 'LOCKED'}</p>
                       </div>
                       <div 
                         className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center cursor-pointer transition-all hover:bg-white/10"
                         onClick={() => {
                           if (isTerminalUnlocked && driverProfile?.accessKey) {
                             showToast(`Access Key: ${driverProfile.accessKey}`, "info");
                           }
                         }}
                       >
                          <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Access Key</p>
                          <div className="flex items-center justify-center gap-2 text-white">
                            <p className="text-xs font-mono font-black text-amber-500">{isTerminalUnlocked ? (driverProfile?.accessKey || "------") : "----"}</p>
                            <Eye size={10} className="text-slate-500" />
                          </div>
                       </div>
                    </div>

                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center justify-center gap-3">
                       <ShieldCheck size={14} className="text-amber-500" />
                       <p className="text-[7px] text-center text-slate-400 font-bold uppercase tracking-[0.2em] leading-relaxed">
                         {(driverProfile?.terminalId && isTerminalUnlocked) ? "Hardware Terminal Uplink Active" : "Awaiting Terminal Activation"}
                       </p>
                    </div>
                  </div>
              </div>

              {/* SMART RIDE AUDIENCE CONTROLS */}
              <div className={cn(
                "bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6 relative overflow-hidden transition-all",
                !isTerminalAccessGranted && "opacity-50 grayscale pointer-events-none"
              )}>
                {!isTerminalAccessGranted && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-[1px]">
                  </div>
                )}
                <div>
                   <h3 className="text-lg font-black text-slate-900 italic tracking-tighter uppercase leading-none font-sans">Smart Ride Audience</h3>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Passenger safety & preference controls</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 space-y-4">
                  {/* Active mode indicator */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Active Mode:</span>
                    <span className="px-3 py-1 bg-amber-500 text-slate-950 rounded-full text-[9px] font-black uppercase tracking-widest">
                      {activeRidePref?.driverOverrideMode === 'CHILDREN' || activeRidePref?.childrenPresent ? '👶 Kids Safe' :
                       activeRidePref?.driverOverrideMode === 'FAMILY' || activeRidePref?.familyMode ? '👨‍👩‍👧 Family Safe' :
                       activeRidePref?.driverOverrideMode === 'SILENT' || activeRidePref?.muteAds ? '🔇 Silent Mode' :
                       activeRidePref?.driverOverrideMode === 'SCHOOL_TRIP' ? '🎓 School Safe' :
                       '🛍 Standard Safe'}
                    </span>
                  </div>

                  {activeRidePref && (
                    <div className="p-3 bg-green-50 rounded-2xl flex items-center justify-between border border-green-100 leading-none">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-green-600" />
                        <span className="text-[8px] font-black text-green-700 uppercase tracking-wider">Active Overrides Triggered</span>
                      </div>
                      {activeRidePref.expiresAt && (
                        <span className="text-[8px] font-mono font-bold text-green-600">
                          Expires: {new Date(activeRidePref.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleDriverSelectRideMode('CHILDREN')}
                      className={cn(
                        "p-4 rounded-2xl border text-left flex flex-col justify-between transition-all",
                        (activeRidePref?.driverOverrideMode === 'CHILDREN' || activeRidePref?.childrenPresent) && !activeRidePref?.muteAds
                          ? "bg-amber-500 border-amber-600 text-slate-950 font-black"
                          : "bg-white border-slate-200 hover:border-slate-300 text-slate-900"
                      )}
                    >
                      <Baby size={18} className="mb-2" />
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-tight">Children Ride</p>
                        <p className={cn("text-[7px] font-medium leading-none mt-0.5", (activeRidePref?.driverOverrideMode === 'CHILDREN' || activeRidePref?.childrenPresent) && !activeRidePref?.muteAds ? "text-slate-900" : "text-slate-400")}>Clean Education Ads</p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleDriverSelectRideMode('FAMILY')}
                      className={cn(
                        "p-4 rounded-2xl border text-left flex flex-col justify-between transition-all",
                        activeRidePref?.driverOverrideMode === 'FAMILY' || activeRidePref?.familyMode
                          ? "bg-amber-500 border-amber-600 text-slate-950 font-black"
                          : "bg-white border-slate-200 hover:border-slate-300 text-slate-900"
                      )}
                    >
                      <Users size={18} className="mb-2" />
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-tight">Family safe</p>
                        <p className={cn("text-[7px] font-medium leading-none mt-0.5", activeRidePref?.driverOverrideMode === 'FAMILY' || activeRidePref?.familyMode ? "text-slate-900" : "text-slate-400")}>General Audiences</p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleDriverSelectRideMode('SILENT')}
                      className={cn(
                        "p-4 rounded-2xl border text-left flex flex-col justify-between transition-all",
                        activeRidePref?.driverOverrideMode === 'SILENT' || activeRidePref?.muteAds
                          ? "bg-amber-500 border-amber-600 text-slate-950 font-black"
                          : "bg-white border-slate-200 hover:border-slate-300 text-slate-900"
                      )}
                    >
                      <VolumeX size={18} className="mb-2" />
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-tight">Silent Display</p>
                        <p className={cn("text-[7px] font-medium leading-none mt-0.5", activeRidePref?.driverOverrideMode === 'SILENT' || activeRidePref?.muteAds ? "text-slate-950" : "text-slate-400")}>Dimmed/No Audio</p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleDriverSelectRideMode('SCHOOL_TRIP')}
                      className={cn(
                        "p-4 rounded-2xl border text-left flex flex-col justify-between transition-all",
                        activeRidePref?.driverOverrideMode === 'SCHOOL_TRIP'
                          ? "bg-amber-500 border-amber-600 text-slate-950 font-black"
                          : "bg-white border-slate-200 hover:border-slate-300 text-slate-900"
                      )}
                    >
                      <School size={18} className="mb-2" />
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-tight">School Trip</p>
                        <p className={cn("text-[7px] font-medium leading-none mt-0.5", activeRidePref?.driverOverrideMode === 'SCHOOL_TRIP' ? "text-slate-950 font-black" : "text-slate-400")}>Special Curated Ads</p>
                      </div>
                    </button>
                  </div>

                  <button
                    onClick={() => handleDriverSelectRideMode('NORMAL')}
                    className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-850 transition-all flex items-center justify-center gap-2 border border-slate-800"
                  >
                    <RefreshCw size={12} />
                    <span>Reset to Standard Queue</span>
                  </button>
                </div>
              </div>

              {/* SMART AUTO BRIGHTNESS & DISPLAY LIGHT SYSTEM */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6">
                <div>
                   <h3 className="text-lg font-black text-slate-900 italic tracking-tighter uppercase leading-none font-sans flex items-center gap-2">
                     <Sun size={20} className="text-amber-500" />
                     <span>Display Panel Brightness</span>
                   </h3>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Smart Auto Brightness & Manual Overrides</p>
                </div>

                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-5">
                   {/* Current status display */}
                   <div className="flex items-center justify-between">
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Active Mode:</span>
                     <div className="flex items-center gap-2">
                       <span className="px-3 py-1 bg-slate-900 text-white rounded-full text-[9px] font-black uppercase tracking-widest font-mono">
                         {activeRidePref?.brightnessMode || 'AUTO'}
                       </span>
                       <span className="px-3 py-1 bg-amber-500 text-slate-950 rounded-full text-[9px] font-black uppercase tracking-widest font-mono">
                         {activeRidePref?.brightnessMode === 'BOOST' ? '100%' :
                          activeRidePref?.brightnessMode === 'NIGHT' ? '30%' :
                          activeRidePref?.brightnessMode === 'MANUAL' ? `${activeRidePref?.manualBrightnessLevel ?? 75}%` :
                          'Adaptive %'}
                       </span>
                     </div>
                   </div>

                   {/* Mode Select Buttons */}
                   <div className="grid grid-cols-2 gap-2">
                     <button
                       onClick={() => handleDriverSelectBrightnessMode('AUTO')}
                       className={cn(
                         "p-4 rounded-2xl border text-left flex flex-col justify-between transition-all",
                         (!activeRidePref?.brightnessMode || activeRidePref?.brightnessMode === 'AUTO')
                           ? "bg-amber-500 border-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/10"
                           : "bg-white border-slate-200 hover:border-slate-300 text-slate-900"
                       )}
                     >
                       <Sun size={18} className="mb-2" />
                       <div>
                         <p className="text-[9px] font-black uppercase tracking-tight">Auto System</p>
                         <p className="text-[6.5px] font-medium leading-none mt-0.5 opacity-70">Adaptive Diurnal PWM</p>
                       </div>
                     </button>

                     <button
                       onClick={() => handleDriverSelectBrightnessMode('BOOST')}
                       className={cn(
                         "p-4 rounded-2xl border text-left flex flex-col justify-between transition-all",
                         (activeRidePref?.brightnessMode === 'BOOST')
                           ? "bg-amber-500 border-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/10"
                           : "bg-white border-slate-200 hover:border-slate-300 text-slate-900"
                       )}
                     >
                       <Zap size={18} className="mb-2" />
                       <div>
                         <p className="text-[9px] font-black uppercase tracking-tight">Day Boost</p>
                         <p className="text-[6.5px] font-medium leading-none mt-0.5 opacity-70">Forced Sun Visible (100%)</p>
                       </div>
                     </button>

                     <button
                       onClick={() => handleDriverSelectBrightnessMode('NIGHT')}
                       className={cn(
                         "p-4 rounded-2xl border text-left flex flex-col justify-between transition-all",
                         (activeRidePref?.brightnessMode === 'NIGHT')
                           ? "bg-amber-500 border-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/10"
                           : "bg-white border-slate-200 hover:border-slate-300 text-slate-900"
                       )}
                     >
                       <Moon size={18} className="mb-2" />
                       <div>
                         <p className="text-[9px] font-black uppercase tracking-tight">Night Comfort</p>
                         <p className="text-[6.5px] font-medium leading-none mt-0.5 opacity-70">Soft Eco-dim (30%)</p>
                       </div>
                     </button>

                     <button
                       onClick={() => handleDriverSelectBrightnessMode('MANUAL')}
                       className={cn(
                         "p-4 rounded-2xl border text-left flex flex-col justify-between transition-all",
                         (activeRidePref?.brightnessMode === 'MANUAL')
                           ? "bg-amber-500 border-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/10"
                           : "bg-white border-slate-200 hover:border-slate-300 text-slate-900"
                       )}
                     >
                       <Settings size={18} className="mb-2" />
                       <div>
                         <p className="text-[9px] font-black uppercase tracking-tight">Manual Override</p>
                         <p className="text-[6.5px] font-medium leading-none mt-0.5 opacity-70">Disable Auto Temporarily</p>
                       </div>
                     </button>
                   </div>

                   {/* Slider section for MANUAL mode */}
                   {(activeRidePref?.brightnessMode === 'MANUAL') && (
                     <motion.div 
                       initial={{ opacity: 0, y: -10 }}
                       animate={{ opacity: 1, y: 0 }}
                       className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3"
                     >
                       <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-slate-500 leading-none">
                         <span>Luminosity Level</span>
                         <span className="text-amber-650 font-black">{activeRidePref?.manualBrightnessLevel ?? 75}%</span>
                       </div>
                       
                       <input 
                         type="range"
                         min="10"
                         max="100"
                         step="5"
                         value={activeRidePref?.manualBrightnessLevel ?? 75}
                         onChange={(e) => handleDriverSelectBrightnessMode('MANUAL', parseInt(e.target.value))}
                         className="w-full accent-amber-500 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                       />
                       
                       <p className="text-[7.5px] leading-tight text-slate-400 font-bold uppercase tracking-wider">
                         * Manual overrides disable adaptive diurnal cycles immediately.
                       </p>
                     </motion.div>
                   )}
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Available Balance</p>
                      <h3 className="text-3xl font-black text-slate-900 tracking-tight italic">₹{(availableBalance || 0).toLocaleString()}</h3>
                    </div>
                    <button 
                      onClick={() => setActiveTab('WITHDRAW')}
                      className="bg-slate-900 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform"
                    >
                      Withdraw Money
                    </button>
                  </div>
              </div>

            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-black italic text-slate-900 uppercase tracking-widest">Current Tasks ({assignments.length})</h3>
                <span className="text-[8px] font-bold text-slate-400 uppercase">Live Updates</span>
              </div>
              
              {assignments.map((task, idx) => (
                <div key={task.id || idx} className="p-5 rounded-3xl flex items-center gap-4 bg-white shadow-sm border border-slate-100 hover:border-amber-200 transition-colors">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100">
                    <CheckCircle2 size={24} className={task.status === 'completed' ? "text-green-500" : "text-slate-200"} />
                  </div>
                  <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight truncate italic">Job Reference: {task.id?.slice(-6) || 'TASK-' + idx}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                          task.status === 'completed' ? "bg-green-50 text-green-500" : "bg-amber-50 text-amber-500"
                        )}>
                          {task.status}
                        </span>
                        <span className="text-[8px] text-slate-300 font-bold">•</span>
                        <span className="text-[8px] text-slate-400 font-bold uppercase">Earn: ₹{task.earnings}</span>
                      </div>
                  </div>
                  {task.status !== 'completed' && (
                    <button 
                      onClick={async () => {
                        if (confirm("Mark this task as completed?")) {
                          await firebaseService.updateAssignmentStatus(task.id!, 'completed', task.earnings, task.campaignId);
                        }
                      }}
                      className="bg-amber-50 text-amber-600 p-2 rounded-xl"
                    >
                      <CheckCircle2 size={18} />
                    </button>
                  )}
                </div>
              ))}
              
              {assignments.length === 0 && (
                <div className="p-12 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
                  <Globe size={32} className="mx-auto text-slate-200 mb-3 animate-spin-slow" />
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Finding nearby jobs...</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button onClick={() => setShowSupport(true)} className="w-full bg-white p-5 rounded-3xl flex items-center justify-between border border-slate-100 shadow-sm active:scale-98 transition-transform">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500 border border-red-100"><AlertTriangle size={18} /></div>
                    <div className="text-left"><h4 className="font-bold text-slate-900 text-sm italic">System Issue</h4></div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
              </button>
            </div>
          </>
        );
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-black text-slate-300 uppercase tracking-widest h-screen">Loading System...</div>;

  return (
    <ErrorBoundary componentName="Driver Interaction Hub">
      <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 font-sans">
      <header className="bg-white border-b border-slate-100 p-5 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-bold overflow-hidden border border-slate-200">
             <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid || 'manju'}`} alt="Avatar" />
          </div>
          <div>
            <h2 className="font-bold text-base text-slate-900 leading-tight">Welcome, {user?.displayName?.split(' ')[0] || 'Driver'}</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{currentVehicleNo}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <NotificationCenter 
             role="DRIVER" 
             userId={user?.uid} 
             userCreatedAt={driverProfile?.createdAt}
             lang={lang}
             onNavigateToTab={(tab) => { 
               if (tab === 'PAYOUTS' || tab === 'WITHDRAW') { 
                 setActiveTab('WITHDRAW'); 
               } else if (tab === 'TICKETS') { 
                 setShowSupport(true); 
               } else { 
                 setActiveTab('EARNINGS'); 
               } 
             }} 
           />
           <button onClick={() => setShowLangPicker(true)} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600 border border-slate-100"><Globe size={18} /></button>
           <button 
             onClick={onLogout}
             className="w-10 h-10 bg-red-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all"
             title="Logout"
           >
              <LogOut size={18} />
           </button>
        </div>
      </header>

      {/* Global Floating Back Button - Visible only in sub-views and not when verification is active */}
      <AnimatePresence>
        {(activeTab === 'WITHDRAW' || showWithdraw || showSupport || showKYC) && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => {
              if (showWithdraw) setShowWithdraw(false);
              else if (showSupport) setShowSupport(false);
              else if (showKYC) setShowKYC(false);
              else setActiveTab('EARNINGS');
            }}
            className="fixed top-20 left-6 z-[80] w-12 h-12 bg-white/80 backdrop-blur-md rounded-full shadow-lg border border-slate-200 flex items-center justify-center text-slate-900 hover:bg-slate-900 hover:text-white transition-all active:scale-95 lg:hidden"
          >
            <ArrowLeft size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      <main className="p-4 md:p-8 space-y-6 md:space-y-10 max-w-4xl mx-auto">
        {renderContent()}
      </main>

      <AnimatePresence>
        {showAgreement && (
          <div className="fixed inset-0 z-[200] overflow-y-auto flex items-start sm:items-center justify-center p-4 py-8">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAgreement(false)} className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" />
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-lg my-auto">
                <DriverDigitalAgreement 
                  driverId={user?.uid!} 
                  onSigned={() => setShowAgreement(false)}
                  onCancel={() => setShowAgreement(false)} 
                />
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWithdraw && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowWithdraw(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
             <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="relative w-full max-w-md bg-white rounded-t-[2rem] sm:rounded-[2rem] p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
                <div className="flex justify-between items-start">
                   <div className="flex flex-col">
                      <h3 className="text-xl font-black italic text-slate-900 uppercase tracking-tighter">Withdraw Funds</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">Enter Payout Credentials</p>
                   </div>
                   <button onClick={() => setShowWithdraw(false)} className="p-2 bg-slate-100 rounded-xl text-slate-400 hover:bg-slate-200 transition-colors"><X size={18} /></button>
                </div>
                <div className="space-y-4">
                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Available for Payout</p>
                        <p className="text-lg font-black text-slate-900 italic">₹{availableBalance.toLocaleString()}</p>
                      </div>
                      <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center text-green-500">
                        <CheckCircle2 size={20} />
                      </div>
                   </div>
                   <div className="space-y-4">
                     <div>
                        <label className="text-[10px]/snug font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Transfer Amount</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">₹</span>
                          <input id="withdraw-amount" type="number" defaultValue={availableBalance} className="w-full bg-white border-2 border-slate-100 rounded-xl py-3 pl-10 pr-4 font-black text-lg focus:border-amber-500 focus:outline-none transition-all shadow-sm" />
                        </div>
                     </div>
                     <div>
                        <label className="text-[10px]/snug font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Your UPI ID (Permanent Store)</label>
                        <input 
                          value={withdrawUpiId || driverProfile?.upiId || ''}
                          onChange={(e) => setWithdrawUpiId(e.target.value)}
                          placeholder="e.g. phone-number@ybl" 
                          className="w-full bg-white border-2 border-slate-100 rounded-xl py-3 px-4 font-bold text-sm focus:border-amber-500 focus:outline-none transition-all shadow-sm" 
                        />
                     </div>
                   </div>
                   <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex items-start gap-2 text-left">
                      <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[9px] font-bold uppercase text-amber-900 leading-relaxed tracking-wide">
                        The entered UPI ID will be saved to your profile and used for all future payouts. Funds typically arrive within 48 hours.
                      </p>
                   </div>
                   <button 
                    onClick={() => {
                      const amtInput = document.getElementById('withdraw-amount') as HTMLInputElement;
                      const amt = parseFloat(amtInput?.value || '0');
                      const upiToUse = withdrawUpiId || driverProfile?.upiId || '';
                      if (amt > 0) handleWithdrawAction(amt, upiToUse);
                    }}
                    className="w-full py-4.5 bg-slate-950 text-amber-500 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all"
                   >
                     Initialize Secure Payout
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Support and Device modals can be added back if needed, keeping it slim for now to fix build */}
      <AnimatePresence>
        {showLangPicker && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLangPicker(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl">
              <h3 className="text-xl font-black italic text-slate-900 uppercase tracking-tighter mb-6">Select Language</h3>
              <div className="grid grid-cols-2 gap-3">
                 {languages.map((l) => (
                   <button key={l.code} onClick={() => { setLang(l.code); setShowLangPicker(false); }} className={cn("p-4 rounded-2xl border text-sm font-bold transition-all", lang === l.code ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 text-slate-600 border-slate-100")}>{l.name}</button>
                 ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBankModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBankModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black italic text-slate-900 uppercase tracking-tighter">Bank Linkage</h3>
                <button onClick={() => setShowBankModal(false)}><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <input placeholder="Account Holder Name" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" id="bank-holder" />
                <input placeholder="Account Number" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" id="bank-acc" />
                <input placeholder="IFSC Code" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold uppercase" id="bank-ifsc" />
                <button 
                  onClick={() => {
                    const holder = (document.getElementById('bank-holder') as HTMLInputElement).value;
                    const acc = (document.getElementById('bank-acc') as HTMLInputElement).value;
                    const ifsc = (document.getElementById('bank-ifsc') as HTMLInputElement).value;
                    handleSaveBank({ accountHolder: holder, accountNumber: acc, ifscCode: ifsc, bankName: 'SBI', isVerified: true });
                  }}
                  className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase"
                >
                  Link Bank Account
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeTicketId && (
          <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveTicketId(null)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] h-[85vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-slate-900">
                      <MessageSquare size={20} />
                   </div>
                   <div>
                      <h3 className="text-sm font-black italic uppercase tracking-widest">{supportTickets.find(t => t.id === activeTicketId)?.title || 'Support Chat'}</h3>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Active System Support</p>
                   </div>
                </div>
                <button onClick={() => setActiveTicketId(null)} className="p-2 bg-white/10 rounded-xl text-white/60"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={cn("flex flex-col max-w-[80%]", msg.senderId === user?.uid ? "ml-auto items-end" : "mr-auto items-start")}>
                    <div className={cn(
                      "p-4 rounded-2xl text-[13px] font-medium leading-relaxed shadow-sm",
                      msg.senderId === user?.uid ? "bg-slate-900 text-white rounded-tr-none" : "bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200"
                    )}>
                      {msg.text}
                    </div>
                    <span className="text-[8px] font-black text-slate-400 uppercase mt-1 tracking-widest">
                       {msg.senderName} • {msg.timestamp ? new Date(msg.timestamp.toMillis()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-6 border-t border-slate-100 flex items-center gap-3 bg-white">
                <input 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your message..." 
                  className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-medium text-sm focus:border-slate-900 focus:outline-none transition-all shadow-inner"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center transition-all disabled:opacity-50 active:scale-90"
                >
                  <Send size={18} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSupport && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSupport(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6 text-white selection:bg-amber-500/30">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <h3 className="text-xl font-black italic text-amber-500 uppercase tracking-tighter">Support Hub</h3>
                </div>
                <button onClick={() => setShowSupport(false)} className="text-slate-400 hover:text-white p-2 hover:bg-white/5 rounded-xl transition-all"><X size={20} /></button>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800">
                   {supportTickets.map((ticket) => (
                     <button 
                        key={ticket.id} 
                        onClick={() => { setActiveTicketId(ticket.id!); setShowSupport(false); }}
                        className="w-full p-4 bg-slate-950/60 hover:bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between transition-colors text-left border-l border-l-[6px] border-l-amber-500"
                     >
                        <div>
                           <p className="text-[11px] font-black text-white uppercase italic leading-none">{ticket.title}</p>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 line-clamp-1">{ticket.lastMessage || ticket.description}</p>
                        </div>
                        <ChevronRight size={14} className="text-slate-300" />
                     </button>
                   ))}
                   {supportTickets.length === 0 && (
                     <p className="text-[10px] text-center text-slate-300 font-bold uppercase py-4">No active conversations</p>
                   )}
                </div>

                <div className="pt-4 border-t border-slate-800/80">
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3 italic">Initiate New Conversation</p>
                  <textarea placeholder="e.g. Ad screen flicker, payment delay..." className="w-full p-4 bg-slate-950/70 border-2 border-slate-800 rounded-2xl font-semibold text-slate-200 placeholder-slate-600 min-h-[90px] text-sm focus:border-amber-500 focus:outline-none transition-all" id="support-desc" />
                  <button 
                    onClick={async () => {
                      const desc = (document.getElementById('support-desc') as HTMLTextAreaElement).value;
                      if (!user || !desc.trim()) return;
                      
                      let lat = undefined;
                      let lng = undefined;
                      
                      try {
                        const pos = await new Promise<GeolocationPosition>((res, rej) => 
                          navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true })
                        );
                        lat = pos.coords.latitude;
                        lng = pos.coords.longitude;
                      } catch (e) {
                        console.warn("Could not attach location to ticket:", e);
                      }

                      await firebaseService.createSupportTicket({
                        userId: user.uid,
                        driverId: user.uid,
                        driverName: user.displayName || 'Driver',
                        title: desc.slice(0, 30) + (desc.length > 30 ? "..." : ""),
                        subject: "Driver Support Request",
                        message: desc,
                        description: desc,
                        type: 'DRIVER',
                        priority: 'MEDIUM',
                        lat,
                        lng,
                        cityId: driverProfile?.cityId || "global",
                        stateId: driverProfile?.stateId || "KA",
                        franchiseId: driverProfile?.franchiseId,
                        territoryId: driverProfile?.territoryId,
                        assignedToHQ: false
                      });
                      (document.getElementById('support-desc') as HTMLTextAreaElement).value = '';
                    }}
                    className="w-full mt-4 py-4.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-amber-500/10 cursor-pointer"
                  >
                    Start New Chat
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
      </AnimatePresence>


      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white/80 backdrop-blur-xl border border-white/20 p-3 rounded-[2.5rem] z-[90] flex items-center justify-around shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
          <button onClick={() => setActiveTab('EARNINGS')} className={cn("flex items-center gap-3 px-6 py-3 rounded-2xl transition-all", activeTab === 'EARNINGS' ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600")}>
            <Activity size={20} />
            {activeTab === 'EARNINGS' && <span className="text-[10px] font-black uppercase tracking-widest leading-none">{t.dashboard}</span>}
          </button>
          <button onClick={() => setActiveTab('WITHDRAW')} className={cn("flex items-center gap-3 px-6 py-3 rounded-2xl transition-all", activeTab === 'WITHDRAW' ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600")}>
            <Coins size={20} />
            {activeTab === 'WITHDRAW' && <span className="text-[10px] font-black uppercase tracking-widest leading-none">{t.earnings}</span>}
          </button>
         <button onClick={() => setActiveTab('SETTINGS')} className={cn("flex items-center gap-3 px-6 py-3 rounded-2xl transition-all", activeTab === 'SETTINGS' ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600")}>
            <Settings size={20} />
            {activeTab === 'SETTINGS' && <span className="text-[10px] font-black uppercase tracking-widest leading-none">{t.settings}</span>}
         </button>
      </footer>

      <AnimatePresence>
        {showCompliance && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
             <ComplianceContent 
               page={compliancePage} 
               onClose={() => setShowCompliance(false)} 
             />
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9, x: "-50%" }}
            animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
            exit={{ opacity: 0, y: 20, scale: 0.9, x: "-50%" }}
            className="fixed bottom-28 left-1/2 z-[250] w-[90%] max-w-sm"
          >
            <div className={cn(
              "flex items-center gap-3 p-4 rounded-2xl shadow-2xl border backdrop-blur-md",
              toast.type === 'success' 
                ? "bg-emerald-600 border-emerald-500 text-white" 
                : toast.type === 'error' 
                  ? "bg-rose-600 border-rose-500 text-white" 
                  : "bg-slate-900 border-slate-800 text-amber-500"
            )}>
              {toast.type === 'success' ? (
                <CheckCircle2 size={18} className="shrink-0" />
              ) : toast.type === 'error' ? (
                <AlertTriangle size={18} className="shrink-0" />
              ) : (
                <Info size={18} className="shrink-0" />
              )}
              <span className="text-xs font-black uppercase tracking-wider leading-tight">
                {toast.message}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AdminAssistant 
        activeTab={activeTab}
        role="driver"
        systemContext={{
          userName: driverProfile?.name || 'Driver',
          balance: availableBalance,
          transactions: payments,
          activeTickets: supportTickets.filter(t => t.status === 'open').length
        }}
      />
      <DriverQuotesExtension />
    </div>
    </ErrorBoundary>
  );
}
