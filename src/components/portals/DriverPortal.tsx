import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IndianRupee, MapPin, Settings, AlertTriangle, Globe, ChevronRight, BarChart2, Bell, Wallet, ArrowDownCircle, Info, X, Landmark, Smartphone, ShieldCheck, CheckCircle2, MessageSquare, Send, LogOut, Eye, Shield, FileText, RefreshCw, Contact, Coins, Activity, CloudUpload } from 'lucide-react';
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

interface DriverPortalProps {
  onLogout: () => void;
}

export default function DriverPortal({ onLogout }: DriverPortalProps) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [lang, setLang] = useState<'EN' | 'HI' | 'KN' | 'TA' | 'TE' | 'MR' | 'ML' | 'BN' | 'GU' | 'PA'>('EN');
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const status = (driverProfile?.status === 'active' || driverProfile?.status === 'ACTIVE') ? 'ACTIVE' : 'OFFLINE';
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
    if (!agreement?.agreementAccepted) {
      alert("Please accept the Driver Agreement in the Digital Partnership Hub (under Settings if not shown) before launching Display Mode.");
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
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setLoading(false);
      
      if (u) {
        setUser(u);
        const unsubscribeProfile = firebaseService.subscribeToDriverProfile(u.uid, (profile) => {
            if (profile) {
            setDriverProfile(profile);
            if (profile.bankDetails) setBankDetails(profile.bankDetails);
          } else {
             // If no profile, we still need to fetch once to create it
             firebaseService.getDriverProfile(u.uid).then(async (p) => {
               if (!p) {
                 const newProfile = {
                   uid: u.uid,
                   name: u.displayName || 'New Driver',
                   email: u.email || '',
                   phone: u.phoneNumber || '',
                   status: 'pending_verification' as const,
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
        const unsubscribeAgreement = firebaseService.subscribeToAgreement(u.uid, (agr) => {
            setAgreement(agr);
            if (agr && agr.agreementAccepted) {
                setShowAgreement(false);
            } else {
                setShowAgreement(true);
            }
        });

        return () => {
          unsubscribe();
          unsubscribeProfile();
          unsubscribeAgreement();
        }
      }
    });
    return () => unsubscribe();
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
      locationInterval = setInterval(reportLocation, 60000); // 60s instead of 12s
    }

    return () => {
      if (locationInterval) clearInterval(locationInterval);
    };
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

    const unsubTickets = firebaseService.subscribeToSupportTickets(user.uid, setSupportTickets);

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

  const t: any = {
    EN: {
      earnings: 'Earnings',
      rides: 'Live Ads Run',
      repair: 'Report issue',
      status: 'Current Status',
      active: 'Online',
      offline: 'Offline',
      welcome: 'Welcome, Driver',
      map: 'Ad Hotspots',
      withdraw: 'Withdraw Cash',
      balance: 'Available Balance',
      trending: '↑ Trending Up',
      cap: "Today's Cap",
      supportDesc: "Requests processed within 48 hours to bank.",
      instantSupport: "Instant Support Connect",
      hwStatus: "Hardware Status",
      raiseWithdraw: "Raise Withdrawal",
      enterAmount: "Enter Amount",
      linkedPayout: "Linked Payout Method",
      confirmOtp: "Confirm via OTP",
      bankNote: "Payment within 48 hours.",
      reportIssue: "Report Issue",
      issueDesc: "Describe the device problem.",
      submitTicket: "Submit Ticket",
      selectLanguage: "Select Language",
      highDensity: "High Ad Density",
      settings: "Configuration"
    }
  };


  const handleSaveBank = async (details: any) => {
    if (!user) return;
    try {
      await firebaseService.updateDriverProfile(user.uid, { bankDetails: details });
      setBankDetails(details);
      setShowBankModal(false);
      alert("Bank Details Linked Successfully!");
    } catch (e) {
      alert("Failed to save bank details.");
    }
  };


  const handleWithdrawClick = () => {
    if (!agreement?.agreementAccepted) {
      alert("Please accept the Digital Partnership Agreement before requesting withdrawals.");
      return;
    }
    if (driverProfile?.kycStatus !== 'APPROVED') {
        alert("Please complete KYC by uploading required documents under Settings to withdraw funds.");
        return;
    }
    setShowWithdraw(true);
  };

  const handleWithdrawAction = async (amount: number, upiId: string) => {
    if (!user) return;
    if (amount > availableBalance) {
      alert("Insufficient Balance!");
      return;
    }
    if (!upiId || !upiId.includes('@')) {
      alert("Please enter a valid UPI ID (e.g. yourname@upi)");
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
        setDriverProfile(prev => ({ ...prev, upiId }));
      }

      alert("Withdrawal Request Raised! Amount will be credited to your UPI ID within 48 hours.");
      setShowWithdraw(false);
    } catch (e) {
      alert("Failed to raise withdrawal request.");
    }
  };

  const handleSendMessage = async () => {
    if (!activeTicketId || !newMessage.trim() || !user) return;
    try {
      await firebaseService.sendChatMessage(activeTicketId, {
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
    if (showKYC) return <DriverKYC driverId={user?.uid!} onSuccess={() => setShowKYC(false)} />;
    switch (activeTab) {
      case 'SETTINGS':
        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 pb-24"
          >
             <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl space-y-8">
                <div className="flex items-center justify-between">
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
                          if (item.id === 'KYC') setShowKYC(true);
                          else { setCompliancePage(item.id as CompliancePage); setShowCompliance(true); }
                        }}
                        className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:bg-white hover:border-slate-200 transition-all group"
                     >
                        <div className="flex items-center gap-4">
                           <div className={cn("w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform", item.color)}>
                              <item.icon size={20} />
                            </div>
                           <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{item.label}</span>
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
        return (
          <>
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
              <div className="bg-[#0F172A] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl shadow-slate-900/40 relative overflow-hidden group">
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
                          <div className={cn("w-1.5 h-1.5 rounded-full", driverProfile?.terminalId ? "bg-green-500 animate-pulse" : "bg-slate-500")} />
                          <span className={cn("text-[8px] font-black uppercase tracking-widest", driverProfile?.terminalId ? "text-green-500" : "text-slate-500")}>
                            {driverProfile?.terminalId ? "Provisioned" : "Activation Required"}
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
                          <p className="text-xs font-mono font-black text-amber-500">{driverProfile?.terminalId || 'NOT ASSIGNED'}</p>
                       </div>
                       <div 
                         className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center cursor-pointer transition-all hover:bg-white/10"
                         onClick={() => {
                           if (driverProfile?.accessKey) {
                             alert(`Your Terminal Access Key is: ${driverProfile.accessKey} (Visible on Dashboard)`);
                           }
                         }}
                       >
                          <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Access Key</p>
                          <div className="flex items-center justify-center gap-2 text-white">
                            <p className="text-xs font-mono font-black text-amber-500">{driverProfile?.accessKey || "------"}</p>
                            <Eye size={10} className="text-slate-500" />
                          </div>
                       </div>
                    </div>

                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center justify-center gap-3">
                       <ShieldCheck size={14} className="text-amber-500" />
                       <p className="text-[7px] text-center text-slate-400 font-bold uppercase tracking-[0.2em] leading-relaxed">
                         {driverProfile?.terminalId ? "Hardware Terminal Uplink Active" : "Awaiting Terminal Provisioning"}
                       </p>
                    </div>
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
        {(activeTab === 'WITHDRAW' || showWithdraw || showSupport) && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => {
              if (showWithdraw) setShowWithdraw(false);
              else if (showSupport) setShowSupport(false);
              else setActiveTab('EARNINGS');
            }}
            className="fixed top-20 left-6 z-[80] w-12 h-12 bg-white/80 backdrop-blur-md rounded-full shadow-lg border border-slate-200 flex items-center justify-center text-slate-900 hover:bg-slate-900 hover:text-white transition-all active:scale-95"
          >
            <ChevronRight size={24} className="rotate-180" />
          </motion.button>
        )}
      </AnimatePresence>

      <main className="p-4 md:p-8 space-y-6 md:space-y-10 max-w-4xl mx-auto">
        {renderContent()}
      </main>

      <AnimatePresence>
        {showAgreement && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" />
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl">
                <DriverDigitalAgreement 
                  driverId={user?.uid!} 
                  onSigned={() => setShowAgreement(false)} 
                />
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWithdraw && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowWithdraw(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
             <motion.div initial={{ y: '100% '}} animate={{ y: 0 }} exit={{ y: '100%' }} className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] p-8 shadow-2xl space-y-8">
                <div className="flex justify-between items-start">
                   <div className="flex flex-col">
                      <h3 className="text-2xl font-black italic text-slate-900 uppercase tracking-tighter">Withdraw Funds</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">Enter Payout Credentials</p>
                   </div>
                   <button onClick={() => setShowWithdraw(false)} className="p-3 bg-slate-100 rounded-2xl text-slate-400 hover:bg-slate-200 transition-colors"><X size={20} /></button>
                </div>
                <div className="space-y-6">
                   <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Available for Payout</p>
                        <p className="text-xl font-black text-slate-900 italic">₹{availableBalance.toLocaleString()}</p>
                      </div>
                      <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center text-green-500">
                        <CheckCircle2 size={24} />
                      </div>
                   </div>
                   <div className="space-y-4">
                     <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block ml-1">Transfer Amount</label>
                        <div className="relative">
                          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">₹</span>
                          <input id="withdraw-amount" type="number" defaultValue={availableBalance} className="w-full bg-white border-2 border-slate-100 rounded-2xl py-5 pl-12 pr-6 font-black text-xl focus:border-amber-500 focus:outline-none transition-all shadow-sm" />
                        </div>
                     </div>
                     <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block ml-1">Your UPI ID (Permanent Store)</label>
                        <input 
                          value={withdrawUpiId || driverProfile?.upiId || ''}
                          onChange={(e) => setWithdrawUpiId(e.target.value)}
                          placeholder="e.g. phone-number@ybl" 
                          className="w-full bg-white border-2 border-slate-100 rounded-2xl py-5 px-6 font-black text-sm focus:border-amber-500 focus:outline-none transition-all shadow-sm" 
                        />
                     </div>
                   </div>
                   <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-start gap-3">
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
                    className="w-full py-6 bg-slate-950 text-amber-500 rounded-[1.75rem] font-black text-[11px] uppercase tracking-[0.25em] shadow-2xl shadow-slate-200 active:scale-95 transition-all"
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSupport(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black italic text-slate-900 uppercase tracking-tighter">Support Hub</h3>
                <button onClick={() => setShowSupport(false)}><X size={20} /></button>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                   {supportTickets.map((ticket) => (
                     <button 
                        key={ticket.id} 
                        onClick={() => { setActiveTicketId(ticket.id!); setShowSupport(false); }}
                        className="w-full p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 flex items-center justify-between transition-colors text-left"
                     >
                        <div>
                           <p className="text-[10px] font-black text-slate-900 uppercase italic leading-none">{ticket.title}</p>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 line-clamp-1">{ticket.lastMessage || ticket.description}</p>
                        </div>
                        <ChevronRight size={14} className="text-slate-300" />
                     </button>
                   ))}
                   {supportTickets.length === 0 && (
                     <p className="text-[10px] text-center text-slate-300 font-bold uppercase py-4">No active conversations</p>
                   )}
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 italic">Initiate New Conversation</p>
                  <textarea placeholder="e.g. Ad screen flicker, payment delay..." className="w-full p-4 bg-slate-50 border rounded-2xl font-medium min-h-[100px] text-sm" id="support-desc" />
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
                        driverId: user.uid,
                        driverName: user.displayName || 'Driver',
                        title: desc.slice(0, 30) + (desc.length > 30 ? "..." : ""),
                        description: desc,
                        type: 'DEVICE',
                        priority: 'MEDIUM',
                        lat,
                        lng
                      });
                      (document.getElementById('support-desc') as HTMLTextAreaElement).value = '';
                    }}
                    className="w-full mt-4 py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase shadow-xl transition-all active:scale-95"
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
            {activeTab === 'EARNINGS' && <span className="text-[10px] font-black uppercase tracking-widest leading-none">Dashboard</span>}
          </button>
          <button onClick={() => setActiveTab('WITHDRAW')} className={cn("flex items-center gap-3 px-6 py-3 rounded-2xl transition-all", activeTab === 'WITHDRAW' ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600")}>
            <Coins size={20} />
            {activeTab === 'WITHDRAW' && <span className="text-[10px] font-black uppercase tracking-widest leading-none">Wallet</span>}
          </button>
         <button onClick={() => setActiveTab('SETTINGS')} className={cn("flex items-center gap-3 px-6 py-3 rounded-2xl transition-all", activeTab === 'SETTINGS' ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600")}>
            <Settings size={20} />
            {activeTab === 'SETTINGS' && <span className="text-[10px] font-black uppercase tracking-widest leading-none">Setup</span>}
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
    </div>
    </ErrorBoundary>
  );
}
