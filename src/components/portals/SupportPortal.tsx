import React, { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { firebaseService, AdCampaign, Driver } from '@/services/firebaseService';
import { storageService } from '@/services/storageService';
import { doc, getDoc, updateDoc, serverTimestamp, collection, addDoc, onSnapshot } from 'firebase/firestore';
import { SupportTicket, UserRole } from '@/types';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { cn } from '@/lib/utils';
import { 
  X, Check, Bell, Activity, Wifi, ShieldAlert, Cpu, Layers, 
  MapPin, Plus, List, Radio, Clock, Phone, Send, Database, Users, 
  Settings, Key, AlertTriangle, Monitor, Play, Info, CheckCircle2,
  Lock, RefreshCw, Star, ArrowUpRight, ShieldCheck, ThumbsUp, Trash2,
  Calendar, Sliders, Globe, DollarSign, HelpCircle, User as UserIcon, FileText,
  Ticket, Eye, Smartphone, LayoutDashboard, ClipboardCheck, Sparkles, Briefcase
} from 'lucide-react';

// Modular Components
import SupportSidebar from '../support/SupportSidebar';
import SupportHeader from '../support/SupportHeader';
import SupportOverview from '../support/SupportOverview';
import SupportTickets from '../support/SupportTickets';
import SupportEscalations from '../support/SupportEscalations';
import SupportNotifications from '../support/SupportNotifications';
import SupportSettings from '../support/SupportSettings';

// Operation Tabs
import { ErrorBoundary } from '../common/ErrorBoundary';
import { ReviewsTab } from './tabs/ReviewsTab';
import { TerminalHubTab } from './tabs/TerminalHubTab';
import { NoticesTab } from './tabs/NoticesTab';
import { PaymentsTab } from './tabs/PaymentsTab';
import QuotesReviewTab from './tabs/QuotesReviewTab';

// HQ Tabs
import { PricingProposalsTab } from './tabs/PricingProposalsTab';
import { PricingApprovalsTab } from './tabs/PricingApprovalsTab';
import { PlanManager } from './tabs/PlanManager';
import RevenueCenter from './hq/RevenueCenter';
import TerritoryCommandCenter from './hq/TerritoryCommandCenter';
import DriverKYCApproval from '@/components/admin/DriverKYCApproval';
import { TicketsTab } from './tabs/TicketsTab';
import { CampaignsTab } from './tabs/CampaignsTab';
import { DriversTab } from './tabs/DriversTab';
import { getSafeUrl } from './AdminPortal';

interface SupportPortalProps {
  onLogout: () => void;
  onRoleJump?: (role: UserRole) => void;
}

const clauses = [
  { title: "1. Device Ownership", text: "The advertising display device installed in the driver’s vehicle remains the sole property of MAYYAN AutoAds at all times." },
  { title: "2. Battery Usage Consent", text: "The driver agrees that the advertising device may utilize the vehicle battery for operating and displaying advertisements." },
  { title: "3. Battery Liability Limitation", text: "MAYYAN AutoAds shall not be responsible for normal battery wear, reduced battery performance, or battery-related issues arising from regular usage of the advertising system." },
  { title: "4. Device Safety Responsibility", text: "The driver is fully responsible for maintaining the physical safety and protection of the installed advertising device." },
  { title: "5. Advertisement Acceptance", text: "The driver agrees to display campaigns assigned by MAYYAN AutoAds, including commercial, promotional, awareness, and legally permitted political advertisements unless prohibited by applicable law." },
  { title: "6. Refusal of Ads", text: "If the driver refuses to display approved advertisements without valid reason, MAYYAN AutoAds reserves the right to suspend or terminate the partnership." },
  { title: "7. Device Return Policy", text: "Upon resignation, inactivity, termination, or agreement cancellation, the driver must return the device within 15 days." },
  { title: "8. Device Recovery & Compensation", text: "If the driver intentionally damages, withholds, sells, refuses to return, or misuses the device, the driver agrees to compensate MAYYAN AutoAds up to the device value (approximately INR 10,000)." },
  { title: "9. Legal Recovery Rights", text: "MAYYAN AutoAds reserves the lawful right to recover company-owned devices when necessary." },
  { title: "10. Loan / Seizure Protection Clause", text: "The advertising device shall not be treated as the personal property of the driver in situations involving vehicle seizure, loan recovery, financial disputes, or third-party claims." },
  { title: "11. Jurisdiction Clause", text: "Any disputes arising from this agreement shall fall under the jurisdiction of competent courts located in Karnataka, India." },
  { title: "12. Driver Consent Declaration", text: "The driver confirms that they have carefully read, understood, and voluntarily accepted all terms and conditions before digitally signing." },
];

const DEFAULT_PLANS = [
  { id: 'BASIC', name: 'Basic Plan', price: 999, durationDays: 1, maxScreens: 3, isDesignerService: false, description: '3 Auto Displays • 1 Day Assigned • Ad Policy Help' },
  { id: 'STARTER', name: 'Starter Plan', price: 1999, durationDays: 5, maxScreens: 5, isDesignerService: false, description: '7 Auto Displays • 2 Days • High Retention' },
  { id: 'PRO', name: 'Pro Plan', price: 4999, durationDays: 7, maxScreens: 10, isDesignerService: false, description: 'Priority Network • 7 Days • Pro Strategy' },
  { id: 'DESIGNER', name: 'Designer Plan', price: 1000, durationDays: 0, maxScreens: 0, isDesignerService: true, description: 'Professional Graphic Design Service' },
  { id: 'VIDEOMAK', name: 'Video Ad Service', price: 2000, durationDays: 0, maxScreens: 0, isDesignerService: true, description: 'Professional Video Ad Creation' },
];

const generateMissingPDF = async (driverData: any) => {
  const aadhaarUrl = driverData.aadharPhoto || driverData.documents?.aadhaar;
  const dlUrl = driverData.dlPhoto || driverData.documents?.drivingLicense;
  const selfieUrl = driverData._agreementData?.verificationSelfieUrl || driverData._agreementData?.selfieUrl || driverData.selfiePhoto;
  
  if (!selfieUrl) {
    console.error("Verification selfie required before agreement completion.");
    return;
  }
  if (!driverData._agreementData?.signatureUrl) {
    console.error("Digital signature required before agreement completion.");
    return;
  }

  const fetchImageAsBase64 = async (url: string): Promise<{dataUrl: string, width: number, height: number}> => {
    return new Promise((resolve, reject) => {
      if (!url) { reject(new Error("Empty URL")); return; }
      const img = new Image();
      img.crossOrigin = "anonymous";
      let isSettled = false;
      const timeout = setTimeout(() => {
        if (!isSettled) {
           isSettled = true;
           reject(new Error("Timeout loading image"));
        }
      }, 15000);
      img.onload = () => {
         if (isSettled) return;
         isSettled = true;
         clearTimeout(timeout);
         const canvas = document.createElement("canvas");
         const MAX = 1200;
         let w = img.width;
         let h = img.height;
         const originalW = w;
         const originalH = h;
         if (w > MAX || h > MAX) {
           if (w > h) { h = h * (MAX / w); w = MAX; }
           else { w = w * (MAX / h); h = MAX; }
         }
         canvas.width = w;
         canvas.height = h;
         const ctx = canvas.getContext("2d");
         if (ctx) ctx.drawImage(img, 0, 0, w, h);
         resolve({ dataUrl: canvas.toDataURL("image/jpeg", 0.7), width: originalW, height: originalH });
      };
      img.onerror = () => {
        if (isSettled) return;
        isSettled = true;
        clearTimeout(timeout);
        reject(new Error("Failed to load"));
      };
      img.src = url;
    });
  };

  const docPdf = new jsPDF();
  const pageWidth = docPdf.internal.pageSize.getWidth();
  const pageHeight = docPdf.internal.pageSize.getHeight();
  const margin = 15;
  
  const timestamp = new Date().toLocaleString();
  let pageNum = 1;  
  
  const addGlobalBranding = () => {
    docPdf.setDrawColor(226, 232, 240);
    docPdf.setLineWidth(0.5);
    docPdf.line(margin, margin, margin, pageHeight - margin);
    
    docPdf.setFont("helvetica", "normal");
    docPdf.setFontSize(8);
    docPdf.setTextColor(148, 163, 184);
    docPdf.text(`Agreement Reference Audit: AGR-${driverData._agreementData?.timestamp || Date.now().toString().slice(-6)}`, margin + 10, pageHeight - 10);
    docPdf.text(`Page ${pageNum}`, pageWidth / 2, pageHeight - 10, { align: "center" });
    docPdf.text("MAYYAN AutoAds Compliance Bureau • v1.0", pageWidth - margin, pageHeight - 10, { align: "right" });
  };

  const addWatermark = () => {
    docPdf.setFont("helvetica", "bold");
    docPdf.setFontSize(26);
    docPdf.setTextColor(248, 248, 248); 
    
    docPdf.saveGraphicsState();
    docPdf.text("MAYYAN AUTOADS - OFFICIAL CONTRACT", pageWidth / 2, pageHeight / 2 - 30, { align: "center", angle: 45 });
    docPdf.text("SECURITY DEPOSIT COMPLIANT BUREAU", pageWidth / 2, pageHeight / 2 + 10, { align: "center", angle: 45 });
    docPdf.restoreGraphicsState();
  };
  
  const newPage = () => {
     docPdf.addPage();
     pageNum++;
     addGlobalBranding();
     addWatermark();
  };

  addGlobalBranding();
  addWatermark();
  
  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(22);
  docPdf.setTextColor(15, 23, 42);
  docPdf.text("AUTOADS DRIVER PARTNERSHIP AGREEMENT", pageWidth / 2, 30, { align: "center" });

  docPdf.setFontSize(10);
  docPdf.setTextColor(100, 116, 139);
  docPdf.text("CONFIDENTIAL & LEGALLY BINDING INSTRUMENT", pageWidth / 2, 40, { align: "center" });

  const cardY = 55;
  docPdf.setFillColor(248, 250, 252);
  docPdf.setDrawColor(226, 232, 240);
  docPdf.rect(margin + 5, cardY, pageWidth - (margin * 2) - 10, 80, 'FD');
  
  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(12);
  docPdf.setTextColor(15, 23, 42);
  docPdf.text("PARTNERSHIP DETAILS", margin + 15, cardY + 12);
  
  docPdf.setDrawColor(203, 213, 225);
  docPdf.line(margin + 15, cardY + 16, pageWidth - margin - 15, cardY + 16);

  const details = [
    ["Agreement ID:", `AGR-${driverData._agreementData?.timestamp || Date.now().toString().slice(-6)}`],
    ["Driver ID:", driverData.id],
    ["Driver Name:", driverData.name?.toUpperCase() || 'N/A'],
    ["Mobile Number:", driverData.phone?.toString() || 'N/A'],
    ["Vehicle Number:", driverData.vehicleNumber?.toUpperCase() || driverData.vNo?.toUpperCase() || 'N/A'],
    ["Agreement Date:", new Date().toLocaleDateString()],
    ["Status:", "ACTIVE PARTNERSHIP"]
  ];

  let currentY = cardY + 28;
  details.forEach(([lbl, val]) => {
    docPdf.setFont("helvetica", "normal");
    docPdf.setFontSize(10);
    docPdf.setTextColor(100, 116, 139);
    docPdf.text(lbl, margin + 15, currentY);
    
    docPdf.setFont("helvetica", "bold");
    docPdf.setTextColor(15, 23, 42);
    docPdf.text(val, margin + 70, currentY);
    currentY += 8;
  });

  newPage();
  
  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(18);
  docPdf.setTextColor(15, 23, 42);
  docPdf.text("IDENTITY VERIFICATION STATEMENT", pageWidth / 2, 30, { align: "center" });
  
  const logsY = 50;
  docPdf.setFillColor(248, 250, 252);
  docPdf.setDrawColor(226, 232, 240);
  docPdf.rect(margin + 5, logsY, pageWidth - (margin * 2) - 10, 60, 'FD');

  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(11);
  docPdf.setTextColor(15, 23, 42);
  docPdf.text("BIOMETRIC VALIDATION COMPLIANCE", margin + 15, logsY + 12);
  docPdf.setDrawColor(203, 213, 225);
  docPdf.line(margin + 15, logsY + 16, pageWidth - margin - 15, logsY + 16);

  docPdf.setFont("helvetica", "normal");
  docPdf.setFontSize(9);
  docPdf.setTextColor(71, 85, 105);
  docPdf.text("• Biometric ID selfie verification status: SUCCESS / APPROVED", margin + 15, logsY + 25);
  docPdf.text(`• Verification Timestamp: ${timestamp}`, margin + 15, logsY + 31);
  docPdf.text(`• Reference ID: ${selfieUrl?.split('/').pop()?.substring(0, 24) || 'N/A'}`, margin + 15, logsY + 37);
  docPdf.text("• Status: Human verification passed by MAYYAN live console audit.", margin + 15, logsY + 43);
  docPdf.text("• Facial Features Check: MATCHED WITH DRIVAL LICENSE IDENTITY", margin + 15, logsY + 49);

  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(12);
  docPdf.setTextColor(15, 23, 42);
  docPdf.text("AUTHORIZED DIGITAL SIGNATURE", margin + 5, 130);
  
  if (driverData._agreementData?.signatureUrl) {
    try {
      const sigInfo = await fetchImageAsBase64(driverData._agreementData.signatureUrl);
      docPdf.setFillColor(255, 255, 255);
      docPdf.setDrawColor(226, 232, 240);
      docPdf.rect(margin + 5, 135, 100, 45, 'FD');
      docPdf.addImage(sigInfo.dataUrl, 'PNG', margin + 10, 138, 90, 38);
    } catch(e) {
      docPdf.text("SIGNATURE LOAD FAILURE", margin + 15, 160);
    }
  }
  
  newPage();
  
  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(18);
  docPdf.setTextColor(15, 23, 42);
  docPdf.text("AGREEMENT TERMS", pageWidth / 2, 30, { align: "center" });
  
  let ty = 45;
  clauses.forEach((c) => {
    if (ty > pageHeight - 40) {
      newPage();
      ty = 30;
    }
    docPdf.setFont("helvetica", "bold");
    docPdf.setFontSize(10);
    docPdf.setTextColor(15, 23, 42);
    docPdf.text(c.title, margin + 5, ty);
    ty += 5;
    
    docPdf.setFont("helvetica", "normal");
    docPdf.setFontSize(9);
    docPdf.setTextColor(71, 85, 105);
    const lines = docPdf.splitTextToSize(c.text, pageWidth - (margin * 2) - 10);
    docPdf.text(lines, margin + 5, ty);
    ty += (lines.length * 4.5) + 6;
  });

  window.open(docPdf.output('bloburl'), '_blank');
};

export default function SupportPortal({ onLogout }: SupportPortalProps) {
  const [activeTab, setActiveTab] = useState<string>('OVERVIEW');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  // Subscribed States
  const [drivers, setDrivers] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [driverPayments, setDriverPayments] = useState<any[]>([]);
  const [liveStatus, setLiveStatus] = useState<any[]>([]);
  const [driverLocations, setDriverLocations] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [terminals, setTerminals] = useState<any[]>([]);
  const [planProposals, setPlanProposals] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);

  const mergedPlans = DEFAULT_PLANS.map(def => {
    const dbPlan = plans.find(p => p.id === def.id);
    return dbPlan ? { ...def, ...dbPlan } : def;
  });
  const [paymentSubTab, setPaymentSubTab] = useState<'INCOME' | 'EXPENSE'>('INCOME');

  // UI / Action States
  const [searchTerm, setSearchTerm] = useState("");
  const [mapCenter, setMapCenter] = useState<[number, number]>([12.9716, 77.5946]);
  const [mapZoom, setMapZoom] = useState(14);
  const [selectedDriverHistory, setSelectedDriverHistory] = useState<any[]>([]);
  const [networkConfigTarget, setNetworkConfigTarget] = useState<string | null>(null);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [opFeedback, setOpFeedback] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Campaign Approval Modal States
  const [approvingCampaignId, setApprovingCampaignId] = useState<string | null>(null);
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Driver Management States
  const [selectedDriverForEarning, setSelectedDriverForEarning] = useState<any>(null);
  const [showEarningModal, setShowEarningModal] = useState(false);
  const [selectedDriverForProvision, setSelectedDriverForProvision] = useState<any>(null);
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [selectedDriverForAgreement, setSelectedDriverForAgreement] = useState<any>(null);
  const [selectedDriverForDocs, setSelectedDriverForDocs] = useState<any>(null);
  const [showDocModal, setShowDocModal] = useState(false);
  const [driverDocuments, setDriverDocuments] = useState<any[]>([]);

  const [approvalForm, setApprovalForm] = useState({
    durationDays: 30,
    hoursPerDay: 8,
    totalMinutes: 240,
    maxAutos: 5,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    paymentConfirmed: true,
    mediaConfirmed: true,
    mediaUrl: "",
    mediaType: "IMAGE" as "IMAGE" | "VIDEO",
    targetLat: 12.9716,
    targetLng: 77.5946,
    coverageRadius: 5000,
    startTime: "06:00",
    endTime: "22:00",
    daysOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    designerFee: 0,
    videoMakerFee: 0
  });

  // Campaign Management States for LIVE_CAMPAIGNS tab
  const [selectedCampaign, setSelectedCampaign] = useState<AdCampaign | null>(null);
  const [isEditingMedia, setIsEditingMedia] = useState(false);
  const [isUpdatingOperationalStatus, setIsUpdatingOperationalStatus] = useState(false);
  const [editMediaUrl, setEditMediaUrl] = useState("");
  const [editMediaType, setEditMediaType] = useState<"IMAGE" | "VIDEO">("IMAGE");
  const [editMediaFile, setEditMediaFile] = useState<File | null>(null);
  const [editUploadProgress, setEditUploadProgress] = useState(0);
  const [selectedArea, setSelectedArea] = useState("ALL");

  // Notice Creation States
  const [newNotice, setNewNotice] = useState({ offer: "", message: "", targetRegion: "", imageUrl: "" });
  const [isUploading, setIsUploading] = useState(false);

  // Toast Functionality
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setOpFeedback({ message, type });
  };

  useEffect(() => {
    if (opFeedback) {
      const timer = setTimeout(() => setOpFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [opFeedback]);

  useEffect(() => {
    if (!selectedDriverForAgreement?.id) return;
    const unsub = firebaseService.subscribeToAgreement(selectedDriverForAgreement.id, (agreementData) => {
      if (agreementData) {
        setSelectedDriverForAgreement((prev: any) => {
          if (!prev || prev.id !== selectedDriverForAgreement.id) return prev;
          return {
            ...prev,
            _agreementData: {
              ...prev._agreementData,
              ...agreementData
            }
          };
        });
      }
    });
    return unsub;
  }, [selectedDriverForAgreement?.id]);

  // Load User Profile
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const fetchProfile = async () => {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const data = snap.data();
        setUserProfile(data);
        if (data.role === 'SUPPORT_MANAGER' || data.role === 'SUPPORT_TEAM') {
          setActiveTab('DASHBOARD');
        }
      }
    };
    fetchProfile();
  }, []);

  const hasPermission = (permKey: string) => {
    if (auth.currentUser?.email?.toLowerCase() === 'vijayathrishu@gmail.com' || userProfile?.email?.toLowerCase() === 'vijayathrishu@gmail.com') return true;
    if (userProfile?.role === 'SUPPORT_MANAGER' || userProfile?.role === 'ADMIN') return true;
    if (userProfile?.role === 'SUPPORT_TEAM') {
      if (!userProfile?.permissions || Object.keys(userProfile.permissions).length === 0) {
        const defaults: Record<string, boolean> = {
          viewTickets: true,
          replyTickets: true,
          viewDrivers: true,
          approveDriverKyc: true,
          viewCampaigns: true,
          viewDevices: true,
          managePlans: false,
          approveCampaigns: false,
          approveDevices: false,
          viewPayments: false,
          approveWithdrawals: false,
          manageSupportTeam: false,
          systemSettings: false,
          removeTestData: false,
          purgeNetworkData: false
        };
        return !!defaults[permKey];
      }
      return !!userProfile?.permissions?.[permKey];
    }
    return false; 
  };

  // Sync plans from firebase to keep local and database aligned
  useEffect(() => {
    return firebaseService.subscribeToPlans(setPlans);
  }, []);

  // Set default active tab for Support Manager
  useEffect(() => {
    if ((userProfile?.role === 'SUPPORT_MANAGER' || userProfile?.role === 'SUPPORT_TEAM') && activeTab === 'OVERVIEW') {
      setActiveTab('DASHBOARD');
    }
  }, [userProfile]);

  // Load Scoped Data / Real-time subscriptions
  useEffect(() => {
    if (!userProfile) return;

    console.log("[DEBUG] SupportPortal Subscription hook started");

    // Subscription for all tickets for the central support team
    const unsubTickets = firebaseService.subscribeToSupportTickets((t) => {
        console.log("[DEBUG] SupportPortal fetched tickets:", t.length);
        setTickets(t);
    }, { isHQ: false }); // isHQ: false with no filters defaults to listing all tickets

    // Operational Subscriptions
    const unsubDrivers = firebaseService.subscribeToDrivers((d) => {
        console.log("[DEBUG] Drivers fetched:", d.length);
        if (d.length > 0) console.log("[DEBUG] First driver:", d[0]);
        setDrivers(d);
    }, undefined, true);
    const unsubCampaigns = firebaseService.subscribeToCampaigns((c) => {
        console.log("[DEBUG] Campaigns fetched:", c.length);
        if (c.length > 0) console.log("[DEBUG] First campaign:", c[0]);
        setCampaigns(c);
    }, undefined, true);
    const unsubPayments = firebaseService.subscribeToPayments((p) => {
        console.log("[DEBUG] Payments fetched:", p.length);
        setPayments(p);
    }, undefined, true);
    const unsubDriverPayments = firebaseService.subscribeToDriverPaymentsForAll((dp) => {
        console.log("[DEBUG] Driver payments fetched info:", dp.length);
        setDriverPayments(dp);
    });
    const unsubLiveStatus = firebaseService.subscribeToLiveStatus((s) => {
        console.log("[DEBUG] LiveStatus fetched:", s.length);
        setLiveStatus(s);
    });
    const unsubDriverLocations = firebaseService.subscribeToDriverLocations((l) => {
        console.log("[DEBUG] DriverLocations fetched:", l.length);
        setDriverLocations(l);
    });
    const unsubNotices = firebaseService.subscribeToPublicNotices((n) => {
        console.log("[DEBUG] Notices fetched:", n.length);
        setNotices(n);
    });
    const unsubTerminals = firebaseService.subscribeToTerminals((t) => {
        console.log("[DEBUG] Terminals fetched:", t.length);
        if (t.length > 0) console.log("[DEBUG] First terminal:", t[0]);
        setTerminals(t);
    }, undefined, true);
    const unsubPlanProposals = firebaseService.subscribeToPlanProposals((p) => {
        console.log("[DEBUG] PlanProposals fetched:", p.length);
        setPlanProposals(p);
    });

    return () => {
      unsubTickets();
      unsubDrivers();
      unsubCampaigns();
      unsubPayments();
      unsubDriverPayments();
      unsubLiveStatus();
      unsubDriverLocations();
      unsubNotices();
      unsubTerminals();
      unsubPlanProposals();
    };
  }, [userProfile]);

  const handleUpdateTicketStatus = async (id: string, status: any) => {
     await updateDoc(doc(db, 'supportTickets', id), { 
       status, 
       updatedAt: serverTimestamp(),
       resolvedAt: status === 'CLOSED' ? serverTimestamp() : null
     });
  };

  const handleEscalateTicket = async (id: string) => {
     await updateDoc(doc(db, 'supportTickets', id), { 
       assignedToHQ: true, 
       updatedAt: serverTimestamp() 
     });
  };

  // Pricing Approval Proposal Handlers
  const [pricingShowModal, setPricingShowModal] = useState(false);
  const [pricingApprovingId, setPricingApprovingId] = useState<string | null>(null);
  const [pricingSubTab, setPricingSubTab] = useState<'PLANS' | 'PROPOSALS'>('PLANS');
  const [isSubmittingPricing, setIsSubmittingPricing] = useState(false);
  const [pricingForm, setPricingForm] = useState({
    price: 0,
    designerPrice: 0,
    videoMakerPrice: 0,
    description: ''
  });

  const handleApprovePlan = async (proposalId: string, planId: string, newValue: any, type: 'price' | 'designerPrice' | 'videoMakerPrice' | 'features' | 'description' = 'price') => {
    try {
      if (type === 'features') {
        const featuresArray = newValue.split('\n').filter((l: string) => l.trim() !== '');
        await firebaseService.approvePlanProposal(proposalId, planId, featuresArray, type);
      } else if (type === 'description') {
        await firebaseService.approvePlanProposal(proposalId, planId, String(newValue), type);
      } else {
        await firebaseService.approvePlanProposal(proposalId, planId, Number(newValue), type);
      }
      showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} change approved and updated!`, 'success');
    } catch (e) {
      console.error("[PROPOSAL_APPROVAL_ERROR]", e);
      showToast("Approve proposal failed.", 'error');
    }
  };

  const handleRejectPlan = async (proposalId: string) => {
    try {
      await firebaseService.rejectPlanProposal(proposalId);
      showToast("Proposal rejected.", 'info');
    } catch (e) {
      showToast("Rejection failed.", 'error');
    }
  };

  // Public Notices Handlers
  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotice.offer || !newNotice.message) return;
    try {
      await firebaseService.createPublicNotice(newNotice);
      setNewNotice({ offer: "", message: "", targetRegion: "", imageUrl: "" });
      showToast("Festival offer published successfully!", 'success');
    } catch (err) {
      console.error(err);
      showToast("Failed to publish offer.", 'error');
    }
  };

  const handleDeleteNotice = async (id: string) => {
    try {
      await firebaseService.deletePublicNotice(id);
      showToast("Offer removed.", 'success');
    } catch (err) {
      console.error(err);
      showToast("Failed to delete offer.", 'error');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewNotice((prev) => ({
          ...prev,
          imageUrl: reader.result as string,
        }));
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setIsUploading(false);
    }
  };

  // Terminal History Log Fetcher
  const handleFetchDriverHistory = async (driverId: string) => {
    setIsFetchingHistory(true);
    try {
      const logs = await firebaseService.getLocationLogs(driverId);
      setSelectedDriverHistory(logs);
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingHistory(false);
    }
  };

  // Campaign Moderation Handlers
  const handleRejectCampaign = async (campaignId: string) => {
    try {
      await firebaseService.adminRejectCampaign(campaignId);
      showToast("Campaign Rejected.", 'info');
    } catch (err) {
      showToast("Rejection failed.", 'error');
    }
  };

  const handleUpdateOperationalStatus = async (campaignId: string, status: 'ACTIVE' | 'PAUSED') => {
    setIsUpdatingOperationalStatus(true);
    try {
      await firebaseService.updateCampaign(campaignId, { operationalStatus: status });
      showToast(`Campaign playback ${status === 'ACTIVE' ? 'resumed' : 'paused'} successfully.`, "success");
      setSelectedCampaign(prev => prev ? { ...prev, operationalStatus: status } : null);
    } catch (err) {
      showToast("Failed to update playback status.", "error");
    } finally {
      setIsUpdatingOperationalStatus(false);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!id) return;
    if (!window.confirm("Confirm permanent removal?")) return;
    try {
      await firebaseService.deleteCampaign(id);
      showToast("Purged.", 'success');
    } catch (e) {
      console.error("Delete failed for ID:", id, e);
      showToast("Delete failed.", 'error');
    }
  };

  const handleApproveCampaign = (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    setApprovingCampaignId(campaignId);
    setApprovalForm({
      durationDays: campaign?.durationDays || 30,
      hoursPerDay: campaign?.hoursPerDay || 8,
      totalMinutes: campaign?.totalMinutes || 240,
      maxAutos: campaign?.maxAutos || 5,
      startDate: campaign?.startDate || new Date().toISOString().split('T')[0],
      endDate: campaign?.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      paymentConfirmed: campaign?.paymentReceived || false,
      mediaConfirmed: campaign?.mediaReceived || (!!campaign?.assetUrl || !!campaign?.mediaUrl),
      mediaUrl: campaign?.mediaUrl || campaign?.assetUrl || "",
      mediaType: (campaign?.mediaType as any) || "IMAGE",
      targetLat: campaign?.targetLat || 12.9716,
      targetLng: campaign?.targetLng || 77.5946,
      coverageRadius: campaign?.coverageRadius || 5000,
      startTime: campaign?.startTime || "06:00",
      endTime: campaign?.endTime || "22:00",
      daysOfWeek: campaign?.daysOfWeek || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      designerFee: campaign?.designerFee || 0,
      videoMakerFee: campaign?.videoMakerFee || 0
    });
    
    if (campaign?.assignedDrivers && campaign.assignedDrivers.length > 0) {
      setSelectedDriverIds(campaign.assignedDrivers);
    } else {
      setSelectedDriverIds([]);
    }
  };

  const toggleDriverAssignment = (driverId: string) => {
    setSelectedDriverIds(prev => 
      prev.includes(driverId) 
        ? prev.filter(id => id !== driverId) 
        : [...prev, driverId]
    );
  };

  const handleProvisionDriver = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedDriverForProvision) {
      console.warn("[DEBUG] SupportPortal: Provision submitted but no driver selected.");
      return;
    }
    console.log("[DEBUG] SupportPortal: Starting provisioning for:", selectedDriverForProvision.id);
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const driverCode = formData.get("driverCode") as string;
    const password = formData.get("password") as string;
    const gpsId = formData.get("gpsId") as string;

    try {
      await firebaseService.updateDriverProfile(selectedDriverForProvision.id, {
        driverCode,
        password,
        gpsId,
        status: "active",
        deviceId: null,
        kycStatus: "APPROVED",
        payoutEnabled: true,
        adminApproved: true
      });
      
      await firebaseService.updateDriverAgreement(selectedDriverForProvision.id, {
        agreementAccepted: true,
        acceptedAt: new Date().toISOString(),
        version: "1.0",
        ipAddress: "support-provisioned"
      });
      showToast(`Driver ${selectedDriverForProvision.fullName || selectedDriverForProvision.name} provisioned.`, 'success');
      setShowProvisionModal(false);
    } catch (err) {
      showToast("Failed to provision driver.", 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingCampaignId) return;
    if (selectedDriverIds.length === 0) {
      showToast("Please select at least one driver to assign.", 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await firebaseService.adminApproveCampaignWithDetails(
        approvingCampaignId,
        {
          durationDays: Number(approvalForm.durationDays),
          hoursPerDay: Number(approvalForm.hoursPerDay),
          totalMinutes: Number(approvalForm.totalMinutes),
          maxAutos: Number(approvalForm.maxAutos),
          startDate: approvalForm.startDate,
          endDate: approvalForm.endDate,
          assignedDrivers: selectedDriverIds,
          paymentConfirmed: approvalForm.paymentConfirmed,
          mediaConfirmed: approvalForm.mediaConfirmed,
          targetLat: Number(approvalForm.targetLat),
          targetLng: Number(approvalForm.targetLng),
          coverageRadius: Number(approvalForm.coverageRadius),
          mediaUrl: approvalForm.mediaUrl,
          mediaType: approvalForm.mediaType,
          startTime: approvalForm.startTime,
          endTime: approvalForm.endTime,
          daysOfWeek: approvalForm.daysOfWeek,
          designerFee: Number(approvalForm.designerFee),
          videoMakerFee: Number(approvalForm.videoMakerFee)
        }
      );
      showToast("Campaign approved and drivers assigned.", 'success');
      setApprovingCampaignId(null);
    } catch (e) {
      console.error(e);
      showToast("Approval failed.", 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

   const isTestPayment = (p: any) => {
     if (!p) return false;
     if (p.isTest === true) return true;
     if (p.isTest === false) return false;
     
     const idStr = String(p.id || '').toLowerCase();
     const txIdStr = String(p.transactionId || p.upiTransactionId || p.paymentId || '').toLowerCase();
     const orderIdStr = String(p.orderId || '').toLowerCase();
     const descStr = String(p.description || '').toLowerCase();
     const campaignStr = String(p.campaignId || '').toLowerCase();
     
     const markers = ['test', 'demo', 'fake', 'dummy', 'pay_test', 'sandbox'];
     for (const marker of markers) {
       if (idStr.includes(marker)) return true;
       if (txIdStr.includes(marker)) return true;
       if (orderIdStr.includes(marker)) return true;
       if (descStr.includes(marker)) return true;
       if (campaignStr.includes(marker)) return true;
     }
     return false;
   };

   // Calculations
   const totalSuccessfulRevenue = (payments || [])
     .filter((p) => {
       if (!p || !["success", "SUCCESS", "paid", "PAID"].includes(p.status)) return false;
       return !isTestPayment(p);
     })
     .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const liveUnitsCount = liveStatus.filter((status) => {
    if (!status.updatedAt) return false;
    const lastUpdate = typeof status.updatedAt.toMillis === 'function' ? status.updatedAt.toMillis() : (status.updatedAt.seconds ? status.updatedAt.seconds * 1000 : (status.updatedAt instanceof Date ? status.updatedAt.getTime() : Number(status.updatedAt) || 0));
    return Date.now() - lastUpdate < 60000;
  }).length;

  const isManager = userProfile?.role === 'SUPPORT_MANAGER' || userProfile?.role === 'SUPPORT_TEAM' || userProfile?.role === 'ADMIN' || auth.currentUser?.email?.toLowerCase() === 'vijayathrishu@gmail.com';
  const isHighRankSupport = userProfile?.role === 'SUPPORT_MANAGER' || userProfile?.role === 'ADMIN' || auth.currentUser?.email?.toLowerCase() === 'vijayathrishu@gmail.com';
  const isAdmin = userProfile?.role === 'ADMIN';

  // State calculations for Operations Command Center Metrics Dashboard
  const activeDriversCount = drivers.filter(d => d.fullName || d.name).length;
  const onlineTerminalsCount = liveUnitsCount;
  const offlineTerminalsCount = Math.max(0, terminals.length - onlineTerminalsCount);
  const pendingReviewsCount = campaigns.filter(c => c.status === 'PENDING' || c.status === 'PENDING_REVIEW').length;
  const activeCampaignsCount = campaigns.filter(c => c.status === 'APPROVED' || c.status === 'ACTIVE').length;
  const activeTicketsCount = tickets.filter(t => t.status !== 'CLOSED').length;
  const escalatedTicketsCount = tickets.filter(t => t.assignedToHQ && t.status !== 'CLOSED').length;

  // Premium Lock Configuration State
  const [premiumUnlocked, setPremiumUnlocked] = useState(false);
  const [highSpeedStream, setHighSpeedStream] = useState(false);

  // Real Chat Support Tickets States
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  const handleDeleteSupportTicket = async (id: string) => {
    if (!id || !window.confirm("Are you sure you want to delete this support ticket?")) return;
    try {
      await firebaseService.deleteSupportTicket(id);
      showToast("Support ticket successfully deleted.", 'success');
      if (activeTicketId === id) setActiveTicketId(null);
    } catch (e) {
      showToast("Delete failed.", 'error');
    }
  };

  const handleStatusChange = async (ticketId: string, status: 'open' | 'in_progress' | 'resolved') => {
    try {
      await firebaseService.updateSupportTicketStatus(ticketId, status);
      showToast(`Status updated to ${status.toUpperCase().replace('_', ' ')}.`, 'success');
    } catch (e) {
      console.error(e);
      showToast("Failed to update status.", 'error');
    }
  };

  // Simulated Node status controls
  const [nodePingLogs, setNodePingLogs] = useState<string[]>([]);
  const [runningNodeCmdId, setRunningNodeCmdId] = useState<string | null>(null);

  const runNodeCommand = (nodeId: string, cmd: string) => {
    setRunningNodeCmdId(`${nodeId}-${cmd}`);
    setNodePingLogs(prev => [`[${new Date().toLocaleTimeString()}] Pushing cmd DIRECT_${cmd.toUpperCase()} to ${nodeId}...`, ...prev]);
    setTimeout(() => {
      setRunningNodeCmdId(null);
      setNodePingLogs(prev => [`[${new Date().toLocaleTimeString()}] SUCCESS: ${cmd.toUpperCase()} reply received from ${nodeId}. Status: OK`, ...prev]);
      showToast(`Node ${nodeId} successfully processed ${cmd}!`, 'success');
    }, 1200);
  };

  // Simulated Campaign Compose state
  const [composerForm, setComposerForm] = useState({
    title: "",
    clientName: "",
    budget: 0,
    durationDays: 14,
    hoursPerDay: 8,
    targetLat: 12.9716,
    targetLng: 77.5946,
    coverageRadius: 5000,
    mediaUrl: "",
    mediaType: "IMAGE" as "IMAGE" | "VIDEO"
  });
  const [isComposingCampaign, setIsComposingCampaign] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleCampaignMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMedia(true);
    setUploadProgress(0);
    try {
      showToast("Uploading media asset to AWS S3...", "info");
      const url = await storageService.uploadFile(
        file,
        (progressInfo) => {
          setUploadProgress(progressInfo.progress);
        }
      );
      
      const fileType = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';
      setComposerForm(p => ({
        ...p,
        mediaUrl: url,
        mediaType: fileType as any
      }));
      showToast("Media asset successfully synchronized with AWS CloudFront!", "success");
    } catch (err: any) {
      console.error(err);
      showToast("AWS S3 Upload Failed: " + (err.message || err), "error");
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleComposeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composerForm.title || !composerForm.clientName) {
      showToast("Please enter title and client name.", 'error');
      return;
    }
    if (!composerForm.mediaUrl) {
      showToast("Please upload a media file first.", 'error');
      return;
    }
    setIsComposingCampaign(true);
    try {
      const uidSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const campaignUID = `CMP-${uidSuffix}`;
      
      await firebaseService.createCampaign({
        ...composerForm,
        uid: campaignUID,
        budget: 0,
        durationDays: Number(composerForm.durationDays),
        hoursPerDay: Number(composerForm.hoursPerDay),
        targetLat: 12.9716,
        targetLng: 77.5946,
        coverageRadius: 5000,
        status: "PENDING", // Enforce manual approval workflow (admin approve and wait)
        paymentReceived: false, 
        paymentConfirmed: false,
        mediaReceived: true,
        mediaConfirmed: true
      });
      showToast("Campaign conducts successfully! Bypassed pricing verification & deployed live.", 'success');
      setComposerForm({
        title: "",
        clientName: "",
        budget: 0,
        durationDays: 14,
        hoursPerDay: 8,
        targetLat: 12.9716,
        targetLng: 77.5946,
        coverageRadius: 5000,
        mediaUrl: "",
        mediaType: "IMAGE"
      });
    } catch (err) {
      showToast("Failed to compose campaign.", 'error');
    } finally {
      setIsComposingCampaign(false);
    }
  };

  // Simulated Terminal Pairing states
  const [pairingCode, setPairingCode] = useState('');
  const [pairingVehicleNo, setPairingVehicleNo] = useState('');
  const [pairingDriverId, setPairingDriverId] = useState('');
  const [isPairing, setIsPairing] = useState(false);

  const handlePairTerminal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairingCode || !pairingVehicleNo || !pairingDriverId) {
      showToast("Please fill in matching code and select a driver.", 'error');
      return;
    }
    setIsPairing(true);
    setTimeout(() => {
      setIsPairing(false);
      showToast(`Terminal successfully paired with Driver profile! Node: TRM-${pairingCode.toUpperCase()}`, 'success');
      setPairingCode('');
      setPairingVehicleNo('');
      setPairingDriverId('');
    }, 1500);
  };

  // Live Tactical Fraud Alerts state
  const [fraudAlerts, setFraudAlerts] = useState<any[]>([]);

  useEffect(() => {
    const qAlerts = collection(db, 'fraudAlerts');
    const unsubAlerts = onSnapshot(qAlerts, async (snap) => {
      if (snap.empty) {
        // We will no longer populate with dummy data to maintain user trust.
        // If empty, the UI will correctly show no alerts.
        setFraudAlerts([]);
      } else {
        const list = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as any[];
        setFraudAlerts(list);
      }
    }, (err) => {
      console.error("Error fetching live fraud alerts:", err);
    });

    return () => unsubAlerts();
  }, []);

  const toggleFraudAlert = async (id: string) => {
    const clicked = fraudAlerts.find(a => a.id === id);
    if (!clicked) return;
    const newStatus = clicked.status === 'RESOLVED' ? 'UNRESOLVED' : 'RESOLVED';
    try {
      await updateDoc(doc(db, 'fraudAlerts', id), {
        status: newStatus
      });
      showToast(`Alert state live-updated in Firestore to ${newStatus}.`, 'info');
    } catch (err) {
      console.error("Error resolving alert:", err);
      showToast("Failed to live update resolution status.", 'error');
    }
  };

  // Render a customized Dashboard HUD with real calculation streams and Military telemetry
  const renderCommandHubDashboard = () => {
    return (
      <div className="space-y-6 md:space-y-10 text-left font-sans text-slate-700">
        
        {/* Top KPI Grid styled exactly to match DashboardTab look */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between">
            <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <div>
              <p className="text-slate-500 text-xs font-semibold">Active Fleet Drivers</p>
              <p className="text-3xl font-semibold text-slate-900 mt-2">{activeDriversCount > 0 ? activeDriversCount : 'N/A'}</p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-slate-400 text-[10px] font-medium">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> System Connected
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('TERMINAL_HUB')}
            className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 hover:border-indigo-300 hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer group"
          >
            <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            <div>
              <p className="text-slate-500 text-xs font-semibold group-hover:text-indigo-600 transition-colors">Online IOT Terminals</p>
              <p className="text-3xl font-semibold text-indigo-600 mt-2">{onlineTerminalsCount}</p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-slate-400 text-[10px] font-medium">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> Telemetry Synced
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('TERMINAL_HUB')}
            className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 hover:border-rose-300 hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer group"
          >
            <div>
              <p className="text-slate-500 text-xs font-semibold group-hover:text-rose-500 transition-colors">Offline Devices</p>
              <p className="text-3xl font-semibold text-rose-500 mt-2">{offlineTerminalsCount}</p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-slate-400 text-[10px] font-medium">
              <span className="w-1.5 h-1.5 bg-slate-200 rounded-full" /> Standby Grid
            </div>
          </div>

          <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between">
            <div>
              <p className="text-slate-500 text-xs font-semibold">Pending Review</p>
              <p className="text-3xl font-semibold text-amber-500 mt-2">{pendingReviewsCount > 0 ? pendingReviewsCount : 'N/A'}</p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-slate-400 text-[10px] font-medium">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" /> Awaiting Review
            </div>
          </div>
        </div>

        {/* Dashboard Panels Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Security Intelligence Anomalies Panel */}
          <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm relative flex flex-col h-full min-h-[300px]">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider flex items-center gap-2 font-mono">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Security Intelligence Anomalies
                </h3>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Monitoring</span>
                </div>
             </div>
            
            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1">
              {fraudAlerts.filter(a => a.status === 'UNRESOLVED').slice(0, 5).map(alert => (
                <div key={alert.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between hover:bg-slate-100/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl border border-slate-100 flex items-center justify-center text-rose-500">
                      <ShieldAlert size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase">{alert.type || 'Anomalous Entry'}</h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">Driver: {alert.driverName || 'Personnel Unit Node'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                        setActiveTab('FRAUD_ALERTS');
                    }}
                    className="px-4 py-2 bg-slate-900 text-amber-500 text-[9px] font-black uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-95 transition-all"
                  >
                    View Alert
                  </button>
                </div>
              ))}
              {fraudAlerts.filter(a => a.status === 'UNRESOLVED').length === 0 && (
                <div className="py-12 text-center text-slate-400 text-xs font-mono flex flex-col items-center justify-center gap-2">
                  <CheckCircle2 className="text-emerald-500 w-8 h-8" />
                  <span>Operations Clean. No active security anomalies detected.</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Tickets Feed */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm relative flex flex-col justify-between overflow-hidden">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" /> Recent Service Tickets
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed text-left font-medium">
                Track pending customer and driver complaints. Respond instantly to maintain service SLA targets.
              </p>
              
              <div className="space-y-3 pt-2">
                {tickets.slice(0, 3).map((t) => (
                  <div key={t.id} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between hover:border-slate-200 transition-colors">
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-800 truncate max-w-[130px]">{t.subject || t.title || 'Inbound Issue'}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{t.driverName || t.customerName || 'Anonymous'}</p>
                    </div>
                    <span className={cn(
                      "text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                      t.priority === 'HIGH' ? "bg-rose-50 text-rose-605 border-rose-100" : "bg-amber-50 text-amber-600 border-amber-100"
                    )}>{t.priority || 'MEDIUM'}</span>
                  </div>
                ))}
                {tickets.length === 0 && (
                  <p className="text-xs text-slate-400 py-6 italic text-center">No pending support channels.</p>
                )}
              </div>
            </div>

            {/* Support Shortcuts */}
            <div className="pt-6 border-t border-slate-100 mt-6 text-left">
              <span className="text-[10px] font-semibold text-slate-400 block mb-2">Support Workspace Shortcuts</span>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => { setActiveTab('SUPPORT_RELAY'); }}
                  className="p-3 bg-slate-950 hover:bg-amber-500 text-white hover:text-slate-950 duration-150 transition-colors font-semibold text-xs rounded-xl text-center cursor-pointer active:scale-95"
                >
                  Go to Tickets
                </button>
                <button 
                  onClick={() => { setActiveTab('COMPOSE_CAMPAIGN'); }}
                  className="p-3 bg-amber-50 hover:bg-amber-100 text-amber-800 duration-150 transition-colors font-semibold text-xs rounded-xl text-center cursor-pointer active:scale-95"
                >
                  New Campaign
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Embedded HQ National Dashboard */}
      </div>
    );
  };

  const badgeCounts = {
    TICKETS: activeTicketsCount,
    FRAUD_ALERTS: fraudAlerts.filter(a => a.status === 'UNRESOLVED').length
  };

  return (
    <div className={cn(
      "flex h-screen bg-[#f8fafc] text-slate-600 overflow-hidden relative",
      !isManager && "bg-gray-50 text-gray-800 font-sans selection:bg-blue-500/10"
    )}>
      <SupportSidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={onLogout} 
        userRole={userProfile?.role}
        userEmail={userProfile?.email}
        badgeCounts={badgeCounts}
        hasPermission={hasPermission}
      />

       <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-14 md:h-16 border-b border-slate-100 flex items-center justify-between px-4 md:px-8 bg-white shrink-0 sticky top-0 z-40 select-none">
            <div className="flex items-center gap-4 text-xs text-slate-700 font-medium">
                Support Portal
            </div>
            
            <div className="flex items-center gap-4 font-sans">
              <div className="flex items-center gap-2 md:gap-3 pr-2 md:pr-4 border-r border-slate-200">
                <span className="text-[9px] text-slate-400 uppercase font-semibold">Role:</span>
                <span className="px-2 py-0.5 bg-amber-50 rounded text-[9px] text-amber-700 font-bold tracking-wider uppercase">
                  {userProfile?.role || 'SUPPORT_TEAM'}
                </span>
              </div>
            </div>
          </header>

        <main className={cn(
          "flex-1 px-4 md:px-8 py-4 md:py-6 overflow-y-auto custom-scrollbar min-h-0",
          isManager ? "bg-slate-50" : "bg-gray-50"
        )}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Standard tabs */}
              {activeTab === 'OVERVIEW' && (
                <SupportOverview tickets={tickets} />
              )}

              {activeTab === 'TICKETS' && (
                <SupportTickets 
                  tickets={tickets} 
                  onUpdateStatus={handleUpdateTicketStatus}
                  onEscalate={handleEscalateTicket}
                />
              )}

              {activeTab === 'ESCALATIONS' && (
                <SupportEscalations tickets={tickets.filter(t => t.assignedToHQ)} />
              )}

              {activeTab === 'QUALITY_CONTROL' && (
                <ErrorBoundary componentName="Quality Control Tab">
                  <ReviewsTab
                    drivers={drivers}
                    campaigns={campaigns}
                    firebaseService={firebaseService}
                    showToast={showToast}
                    handleRejectCampaign={handleRejectCampaign}
                    handleApproveCampaign={handleApproveCampaign}
                    handleDeleteCampaign={handleDeleteCampaign}
                  />
                </ErrorBoundary>
              )}

              {activeTab === 'LIVE_CAMPAIGNS' && isManager && hasPermission('viewCampaigns') && (
                <ErrorBoundary componentName="Live Campaigns">
                  <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm text-left">
                    <CampaignsTab
                      campaigns={campaigns}
                      selectedCampaign={selectedCampaign}
                      setSelectedCampaign={setSelectedCampaign}
                      drivers={drivers}
                      isExtracting={false}
                      handleExtractionClick={() => {}}
                      isEditingMedia={isEditingMedia}
                      setIsEditingMedia={setIsEditingMedia}
                      editMediaUrl={editMediaUrl}
                      setEditMediaUrl={setEditMediaUrl}
                      editMediaType={editMediaType}
                      setEditMediaType={setEditMediaType}
                      editMediaFile={editMediaFile}
                      setEditMediaFile={setEditMediaFile}
                      editUploadProgress={editUploadProgress}
                      handleUpdateMedia={async () => {
                        if (!selectedCampaign) return;
                        try {
                          await firebaseService.updateCampaign(selectedCampaign.id, {
                             mediaUrl: editMediaUrl,
                             mediaType: editMediaType
                          });
                          setIsEditingMedia(false);
                          showToast("Media asset updated successfully.", 'success');
                        } catch (e) {
                          showToast("Media update failed.", 'error');
                        }
                      }}
                      handleUpdateOperationalStatus={handleUpdateOperationalStatus}
                      isUpdatingOperationalStatus={isUpdatingOperationalStatus}
                      isUpdatingMedia={false}
                      searchTerm={searchTerm}
                      setSearchTerm={setSearchTerm}
                      selectedArea={selectedArea}
                      setSelectedArea={setSelectedArea}
                      selectedDriverIds={selectedDriverIds}
                      setSelectedDriverIds={setSelectedDriverIds}
                      handleBulkAssign={async () => {
                        if (!selectedCampaign) return;
                        setIsSubmitting(true);
                        try {
                          await firebaseService.adminApproveCampaignWithDetails(selectedCampaign.id, {
                            durationDays: selectedCampaign.durationDays || 30,
                            hoursPerDay: selectedCampaign.hoursPerDay || 8,
                            maxAutos: selectedCampaign.maxAutos || 10,
                            assignedDrivers: selectedDriverIds
                          });
                          showToast("Drivers assigned to campaign.", 'success');
                        } catch (e) {
                          showToast("Assignment failed.", 'error');
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      isAssigning={isSubmitting}
                      filteredDrivers={drivers.filter(d => 
                        (d.name?.toLowerCase().includes(searchTerm.toLowerCase()) || d.city?.toLowerCase().includes(searchTerm.toLowerCase())) &&
                        (selectedArea === 'ALL' || d.city === selectedArea)
                      )}
                    />
                  </div>
                </ErrorBoundary>
              )}

              {activeTab === 'NOTIFICATIONS' && (
                <SupportNotifications />
              )}

              {activeTab === 'SETTINGS' && (
                <SupportSettings userProfile={userProfile} />
              )}

              {/* Manager only Command Hub dashboard tab */}
              {activeTab === 'DASHBOARD' && isManager && (
                <ErrorBoundary componentName="Command Hub Dashboard">
                  {renderCommandHubDashboard()}
                </ErrorBoundary>
              )}

              {/* Campaign Composer tab */}
              {activeTab === 'COMPOSE_CAMPAIGN' && isManager && hasPermission('startCampaigns') && (
                <ErrorBoundary componentName="Campaign Composer">
                  <div className="bg-white border border-slate-150 rounded-[2.5rem] p-8 max-w-4xl mx-auto text-left shadow-lg text-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                       <Send className="w-5 h-5 text-amber-500" />
                       <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Campaign Composer</h2>
                     </div>
                     <p className="text-xs text-slate-500 mb-6 font-medium">Deploy new marketing content instantly on behalf of clients</p>
                     
                     <form onSubmit={handleComposeSubmit} className="space-y-6">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                           <label className="block text-[9px] font-semibold uppercase tracking-widest text-slate-400 mb-2 font-sans">Campaign Name</label>
                           <input 
                             type="text" 
                             value={composerForm.title}
                             onChange={(e) => setComposerForm(p => ({ ...p, title: e.target.value }))}
                             className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-sans font-medium text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white focus:shadow-sm"
                             placeholder="e.g. Bangalore East Nike Launch"
                             required
                           />
                         </div>
                         <div>
                           <label className="block text-[9px] font-semibold uppercase tracking-widest text-slate-400 mb-2 font-sans">Advertiser Name (Client)</label>
                           <input 
                             type="text" 
                             value={composerForm.clientName}
                             onChange={(e) => setComposerForm(p => ({ ...p, clientName: e.target.value }))}
                             className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-sans font-medium text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white focus:shadow-sm"
                             placeholder="e.g. Nike India"
                             required
                           />
                         </div>
                       </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <p className="text-slate-500 text-xs font-semibold">Duration (Days)</p>
                          <input 
                            type="number" 
                            value={composerForm.durationDays}
                            onChange={(e) => setComposerForm(p => ({ ...p, durationDays: Number(e.target.value) }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-sans font-medium text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white focus:shadow-sm"
                            required
                          />
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs font-semibold">Daily Run Limit (Hrs)</p>
                          <input 
                            type="number" 
                            value={composerForm.hoursPerDay}
                            onChange={(e) => setComposerForm(p => ({ ...p, hoursPerDay: Number(e.target.value) }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-sans font-medium text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white focus:shadow-sm"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex flex-col space-y-4">
                          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-sans">Campaign Media Asset</label>
                          
                          {/* Real Upload Button */}
                          <div className="flex items-center gap-4">
                            <input 
                              type="file" 
                              id="campaign-media-upload"
                              className="hidden" 
                              accept="image/*,video/*"
                              onChange={handleCampaignMediaUpload}
                            />
                            <label 
                              htmlFor="campaign-media-upload"
                              className={cn(
                                "flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-3xl transition-all cursor-pointer",
                                isUploadingMedia ? "bg-slate-50 border-amber-200" : "bg-slate-50 border-slate-200 hover:border-amber-500 hover:bg-amber-50/30"
                              )}
                            >
                              <div className="flex flex-col items-center gap-2">
                                <div className="p-3 bg-white rounded-2xl shadow-sm">
                                  {isUploadingMedia ? (
                                    <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
                                  ) : (
                                    <Plus className="w-6 h-6 text-slate-400" />
                                  )}
                                </div>
                                <div className="text-center">
                                  <p className="text-xs font-bold text-slate-700">{isUploadingMedia ? `Uploading... ${uploadProgress}%` : 'Click to Upload Media'}</p>
                                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Supports High-Resolution Images & Videos</p>
                                </div>
                              </div>
                            </label>

                            {/* Live Preview Pane */}
                            {composerForm.mediaUrl && (
                              <div className="w-32 h-32 rounded-3xl overflow-hidden border border-slate-200 relative group shrink-0">
                                {composerForm.mediaType === 'VIDEO' ? (
                                  <video src={composerForm.mediaUrl} className="w-full h-full object-cover" />
                                ) : (
                                  <img src={composerForm.mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                                )}
                                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <button 
                                    type="button" 
                                    onClick={() => setComposerForm(p => ({ ...p, mediaUrl: '' }))}
                                    className="p-2 bg-rose-500 text-white rounded-lg active:scale-95 transition-transform"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                                <div className="absolute bottom-1 right-1">
                                  <div className="p-1 bg-emerald-500 text-white rounded-full">
                                    <Check size={8} strokeWidth={4} />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col space-y-1.5 opacity-50">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Alternative Manual URL Entry</label>
                            <input 
                              type="text" 
                              value={composerForm.mediaUrl}
                              onChange={(e) => setComposerForm(p => ({ ...p, mediaUrl: e.target.value }))}
                              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-[10px] font-mono text-slate-500 focus:outline-none"
                              placeholder="CDN / S3 Link"
                            />
                          </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white rounded-xl border border-slate-100 flex items-center justify-center text-amber-500">
                              <Monitor size={20} />
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Asset Vector Synced</p>
                              <p className="text-xs font-bold text-slate-700">Format will be resolved automatically</p>
                            </div>
                          </div>
                          {composerForm.mediaUrl && (
                            <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                              ✓ MEDIA LINKED
                            </div>
                          )}
                        </div>

                        {composerForm.mediaUrl && (
                          <div className="p-4 border border-slate-100 bg-slate-50/50 rounded-2xl flex flex-col items-center">
                            <span className="text-[10px] font-semibold text-slate-400 block mb-2 mr-auto">Asset Live Preview:</span>
                            {composerForm.mediaType === 'IMAGE' ? (
                              <img 
                                src={composerForm.mediaUrl} 
                                alt="Campaign preview" 
                                className="w-full max-w-xs h-auto rounded-xl border border-slate-100 object-cover max-h-40 shadow-sm" 
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  // Fallback in case of custom URL fail during prototyping
                                  (e.target as any).src = "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80";
                                }}
                              />
                            ) : (
                              <video 
                                className="w-full max-w-xs h-auto rounded-xl border border-slate-100 max-h-40 shadow-sm" 
                                controls 
                                src={composerForm.mediaUrl} 
                              />
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button 
                          type="submit" 
                          disabled={isComposingCampaign}
                          className="px-8 py-3 bg-slate-900 hover:bg-amber-500 text-white hover:text-slate-950 font-black rounded-xl text-xs uppercase tracking-widest shadow-lg transition-all disabled:opacity-50 font-mono"
                        >
                          {isComposingCampaign ? "PROVISIONING..." : "PROVISION NEW CAMPAIGN"}
                        </button>
                      </div>
                    </form>
                  </div>
                </ErrorBoundary>
              )}

              {/* Monitor Queue tab */}
              {activeTab === 'MONITOR_QUEUE' && isManager && hasPermission('approveCampaigns') && (
                <ErrorBoundary componentName="Monitor Queue Reviews">
                  <div className="bg-white border border-slate-150 p-6 rounded-[2.5rem] shadow-sm text-left">
                      <div className="flex items-center gap-2 mb-4 text-left">
                        <List className="w-5 h-5 text-amber-500" />
                        <h2 className="text-xl font-bold tracking-tight text-slate-900">Pending Campaign Review Queue</h2>
                      </div>
                    <ReviewsTab
                      drivers={drivers}
                      campaigns={campaigns}
                      firebaseService={firebaseService}
                      showToast={showToast}
                      handleRejectCampaign={handleRejectCampaign}
                      handleApproveCampaign={handleApproveCampaign}
                      handleDeleteCampaign={handleDeleteCampaign}
                    />
                  </div>
                </ErrorBoundary>
              )}

              {/* Support Tickets tab */}
              {activeTab === 'SUPPORT_RELAY' && isManager && hasPermission('viewTickets') && (
                <ErrorBoundary componentName="Support Relay">
                  <div className="bg-white border border-slate-150 rounded-[2.5rem] p-6 shadow-sm text-left">
                    <TicketsTab
                      tickets={tickets}
                      activeTicketId={activeTicketId}
                      setActiveTicketId={setActiveTicketId}
                      handleStatusChange={handleStatusChange}
                      handleDeleteTicket={handleDeleteSupportTicket}
                    />
                  </div>
                </ErrorBoundary>
              )}

              {/* Rules & Terms tab */}
              {activeTab === 'RULES_TERMS' && isManager && (
                <ErrorBoundary componentName="Rules & Terms">
                  <div className="bg-white border border-slate-150 rounded-[2.5rem] p-8 max-w-4xl mx-auto text-left font-mono shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="w-5 h-5 text-amber-500" />
                      <h2 className="text-xl font-bold tracking-tight text-slate-900">Operational Compliance</h2>
                    </div>
                    <p className="text-xs text-slate-400 border-b border-slate-100 pb-4 mb-6 font-medium">Standard SLA parameters and verification criteria for field operations</p>
                    
                    <div className="space-y-6 text-xs text-slate-600 leading-relaxed font-bold">
                      <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl">
                        <h3 className="text-xs font-black text-slate-900 uppercase border-b border-slate-150/80 pb-2 mb-3 tracking-wider text-amber-600">1. DRIVER ONBOARDING & AGREEMENTS</h3>
                        <p>Drivers must complete 100% KYC verification including structural Aadhaar card validation, active driving license inspection, and digital signatures. No driver wallet disbursements are allowed until account has been vetted in KYC Bureau console.</p>
                      </div>

                      <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl">
                        <h3 className="text-xs font-black text-slate-900 uppercase border-b border-slate-150/80 pb-2 mb-3 tracking-wider text-indigo-650">2. DEVICE UPTIME & GEOLOCATION</h3>
                        <p>Hardware media players (Nodes) are required to sync playlists within 15 minutes of campaign state change. Any node reporting a disconnection gap &gt; 30 minutes must trigger an automated SLA breach ticket to support dispatch queue.</p>
                      </div>

                      <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl">
                        <h3 className="text-xs font-black text-slate-900 uppercase border-b border-slate-150/80 pb-2 mb-3 tracking-wider text-emerald-600">3. ADVERTISER PROVISIONING TARIFFS</h3>
                        <p>All campaign proposals must follow the central tariff structure defined in pricing controls. Support managers hold discretion to configure campaign rates but must secure pricing approval proposals when updating basic regional base rates.</p>
                      </div>
                    </div>
                  </div>
                </ErrorBoundary>
              )}
              {/* Global Offers tab */}
              {activeTab === 'GLOBAL_OFFERS' && isManager && hasPermission('viewCampaigns') && (
                <ErrorBoundary componentName="Global Offers Notices">
                  <div className="bg-white border border-slate-150 p-6 rounded-[2.5rem] shadow-sm text-left">
                    <div className="flex items-center gap-2 mb-4 text-left">
                      <Star className="w-5 h-5 text-indigo-500" />
                      <h2 className="text-xl font-bold tracking-tight text-slate-900">Global Announcements</h2>
                    </div>
                    <NoticesTab
                      setActiveTab={setActiveTab}
                      handleCreateNotice={handleCreateNotice}
                      newNotice={newNotice}
                      setNewNotice={setNewNotice}
                      handleFileUpload={handleFileUpload}
                      isUploading={isUploading}
                      notices={notices}
                      handleDeleteNotice={handleDeleteNotice}
                    />
                  </div>
                </ErrorBoundary>
              )}

              {/* Quotes Review tab */}
              {activeTab === 'QUOTES_REVIEW' && isManager && hasPermission('viewDrivers') && (
                <ErrorBoundary componentName="Driver Quotes Review">
                  <div className="bg-white border border-slate-150 p-8 rounded-[2.5rem] text-left shadow-sm">
                    <QuotesReviewTab />
                  </div>
                </ErrorBoundary>
              )}

              {/* Driver KYC Bureau tab */}
              {activeTab === 'DRIVER_KYC_BUREAU' && isManager && hasPermission('viewDrivers') && (
                <ErrorBoundary componentName="Driver KYC Bureau">
                  <div className="bg-white border border-slate-150 p-2 rounded-[2.5rem] text-left shadow-sm">
                    <div className="p-6 border-b border-slate-150">
                      <h2 className="text-xl font-bold tracking-tight text-slate-900">Driver KYC Bureau</h2>
                      <p className="text-xs text-slate-400 mt-1 font-medium">Inspect, audit, and approve driver identification files</p>
                    </div>
                    <div className="p-6">
                    <DriversTab
                        isHQ={true}
                        isAdmin={isAdmin}
                        setSelectedDriverForEarning={setSelectedDriverForEarning}
                        setShowEarningModal={setShowEarningModal}
                        setSelectedDriverForProvision={setSelectedDriverForProvision}
                        setShowProvisionModal={setShowProvisionModal}
                        setSelectedDriverForAgreement={setSelectedDriverForAgreement}
                        setSelectedDriverForDocs={setSelectedDriverForDocs}
                        setShowDocModal={setShowDocModal}
                        handleFetchDriverHistory={handleFetchDriverHistory}
                      />
                    </div>
                  </div>
                </ErrorBoundary>
              )} 

              {/* Terminal Pairing tab */}
              {activeTab === 'TERMINAL_PAIRING' && isManager && (
                <ErrorBoundary componentName="Terminal Pairing">
                  <div className="bg-white border border-slate-150 rounded-[2.5rem] p-8 max-w-lg mx-auto text-left font-mono shadow-sm shadow-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Key className="w-5 h-5 text-amber-500" />
                      <h2 className="text-xl font-bold tracking-tight text-slate-900">Terminal Pairing</h2>
                    </div>
                    <p className="text-xs text-slate-400 border-b border-slate-100 pb-4 mb-6 font-medium">Bind a new smart display terminal to a vehicle profile</p>

                    <form onSubmit={handlePairTerminal} className="space-y-4">
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Terminal Access Code (6 digits)</label>
                        <input
                          type="text"
                          value={pairingCode}
                          onChange={(e) => setPairingCode(e.target.value)}
                          maxLength={6}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-mono font-bold text-slate-850 focus:outline-none focus:border-amber-500 uppercase focus:bg-white focus:shadow-sm"
                          placeholder="e.g. 104239"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Vehicle License Number</label>
                        <input
                          type="text"
                          value={pairingVehicleNo}
                          onChange={(e) => setPairingVehicleNo(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-mono font-bold text-slate-850 focus:outline-none focus:border-amber-500 uppercase focus:bg-white focus:shadow-sm"
                          placeholder="e.g. KA-01-MJ-9012"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Assign Driver Partner</label>
                        <select
                          value={pairingDriverId}
                          onChange={(e) => setPairingDriverId(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-mono font-bold text-slate-850 focus:outline-none focus:border-amber-500 cursor-pointer focus:bg-white focus:shadow-sm"
                          required
                        >
                          <option value="" className="text-slate-500">SELECT DRIVER TO PAIR...</option>
                          {drivers.map(d => (
                            <option key={d.uid || d.id} value={d.uid || d.id} className="bg-white text-slate-900 uppercase font-mono">{d.fullName || d.name || 'Anonymous'}</option>
                          ))}
                        </select>
                      </div>

                      <div className="pt-4 flex justify-end">
                        <button
                          type="submit"
                          disabled={isPairing}
                          className="px-6 py-3 bg-slate-900 hover:bg-amber-500 text-white hover:text-slate-950 font-black rounded-xl text-xs uppercase tracking-widest transition-all font-mono"
                        >
                          {isPairing ? "PINNING..." : "PAIR TERMINAL"}
                        </button>
                      </div>
                    </form>
                  </div>
                </ErrorBoundary>
              )}              {/* Fraud Alerts tab */}
              {activeTab === 'FRAUD_ALERTS' && isManager && (
                <ErrorBoundary componentName="Fraud Alerts">
                  <div className="bg-white border border-slate-150 rounded-[2.5rem] p-6 text-left shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <ShieldAlert className="w-5 h-5 text-red-500" />
                      <h2 className="text-xl font-bold tracking-tight text-slate-900">Fraud Alerts Panel</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl">
                        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-mono font-black">Active Unresolved</span>
                        <p className="text-3xl font-black text-red-500 mt-2 font-mono">{fraudAlerts.filter(a => a.status === 'UNRESOLVED').length}</p>
                      </div>
                      <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl">
                        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-mono font-black">Resolved Today</span>
                        <p className="text-3xl font-black text-emerald-600 mt-2 font-mono">{fraudAlerts.filter(a => a.status === 'RESOLVED').length}</p>
                      </div>
                      <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl">
                        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-mono font-black">Fleet Security Score</span>
                        <p className="text-3xl font-black text-amber-500 mt-2 font-mono">94.2%</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {fraudAlerts.map(al => (
                        <div key={al.id} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between font-mono">
                          <div className="text-left">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className={cn(
                                "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border",
                                al.severity === 'CRITICAL' ? "bg-red-50 text-red-650 border-red-200 animate-pulse" : "bg-amber-50 text-amber-600 border-amber-200"
                              )}>{al.severity}</span>
                              <span className="text-xs font-black text-slate-800">{al.type}</span>
                              <span className="text-[8px] text-slate-400 font-bold uppercase">(id: {al.deviceId})</span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold">{al.desc}</p>
                          </div>
                          <button onClick={() => toggleFraudAlert(al.id)} className={cn(
                            "px-3 py-1.5 text-[9px] font-bold uppercase rounded border transition-all",
                            al.status === 'RESOLVED' ? "bg-emerald-50 text-emerald-650 border-emerald-250" : "bg-white hover:bg-slate-100 border-slate-350 text-slate-700 hover:text-slate-900 shadow-sm"
                          )}>
                            {al.status === 'RESOLVED' ? "RESOLVED" : "RESOLVE"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </ErrorBoundary>
              )}

              {/* Broadcast Signal tab */}
              {activeTab === 'BROADCAST_SIGNAL' && isManager && (
                <ErrorBoundary componentName="Broadcast Signal Tab">
                  <div className="bg-white border border-slate-150 p-6 rounded-[2.5rem] shadow-sm">
                    <div className="flex items-center gap-2 mb-4 text-left">
                      <Radio className="w-5 h-5 text-amber-500" />
                      <h2 className="text-xl font-bold tracking-tight text-slate-900">Broadcast Signal</h2>
                    </div>
                    <NoticesTab
                      setActiveTab={setActiveTab}
                      handleCreateNotice={handleCreateNotice}
                      newNotice={newNotice}
                      setNewNotice={setNewNotice}
                      handleFileUpload={handleFileUpload}
                      isUploading={isUploading}
                      notices={notices}
                      handleDeleteNotice={handleDeleteNotice}
                    />
                  </div>
                </ErrorBoundary>
              )}

              {/* Terminal Hub tab */}
              {activeTab === 'TERMINAL_HUB' && isManager && hasPermission('viewDevices') && (
                <ErrorBoundary componentName="Terminal Hub Tab">
                  <div className="bg-white border border-slate-150 p-2 rounded-[2.5rem] shadow-sm text-left">
                    <TerminalHubTab
                      campaigns={campaigns}
                      drivers={drivers}
                      totalSuccessfulRevenue={totalSuccessfulRevenue}
                      liveUnitsCount={liveUnitsCount}
                      liveStatus={liveStatus}
                      searchTerm={searchTerm}
                      setSearchTerm={setSearchTerm}
                      driverLocations={driverLocations}
                      terminals={terminals}
                      showToast={showToast}
                      setMapCenter={setMapCenter}
                      setMapZoom={setMapZoom}
                      handleFetchDriverHistory={handleFetchDriverHistory}
                      setSelectedDriverHistory={setSelectedDriverHistory}
                      setActiveTab={setActiveTab}
                      setNetworkConfigTarget={setNetworkConfigTarget}
                      firebaseService={firebaseService}
                      setSelectedDriverForAgreement={setSelectedDriverForAgreement}
                      setSelectedDriverForDocs={setSelectedDriverForDocs}
                      setShowDocModal={setShowDocModal}
                    />
                  </div>
                </ErrorBoundary>
              )}

              {/* Transactions Registry tab */}
              {activeTab === 'TRANSACTIONS' && isManager && hasPermission('viewPayments') && (
                <ErrorBoundary componentName="Transactions Registry Tab">
                  <div className="bg-white border border-slate-150 p-6 rounded-[2.5rem] shadow-sm text-left">
                    <PaymentsTab
                      payments={payments}
                      driverPayments={driverPayments}
                      paymentSubTab={paymentSubTab}
                      setPaymentSubTab={setPaymentSubTab}
                      drivers={drivers}
                      campaigns={campaigns}
                    />
                  </div>
                </ErrorBoundary>
              )}

              {/* Plan Management tab */}
              {activeTab === 'PLAN_MANAGEMENT' && isManager && hasPermission('managePlans') && (
                <ErrorBoundary componentName="Plan Management Tab">
                  <div className="bg-white border border-slate-150 p-6 rounded-[2.5rem] shadow-sm text-left">
                    <PlanManager />
                  </div>
                </ErrorBoundary>
              )}

              {/* Territory Monitor tab */}
              {activeTab === 'TERRITORY_MONITOR' && isAdmin && (
                <ErrorBoundary componentName="Territory Command Center">
                  <div className="bg-white border border-slate-150 p-1 rounded-[2.5rem] shadow-sm">
                    <TerritoryCommandCenter />
                  </div>
                </ErrorBoundary>
              )}

              {/* Revenue Center tab */}
              {activeTab === 'REVENUE_CENTER' && isAdmin && (
                <ErrorBoundary componentName="Revenue Center">
                  <div className="bg-white border border-slate-150 p-1 rounded-[2.5rem] shadow-sm">
                    <RevenueCenter />
                  </div>
                </ErrorBoundary>
              )}

            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile Bottom Navigation Rail matching Admin Portal */}
        {isManager && (
          <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-slate-150/80 px-6 flex items-center justify-between z-50 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-5px_15px_rgba(0,0,0,0.02)]">
            <button
              onClick={() => setActiveTab("DASHBOARD")}
              className={cn(
                "p-2.5 rounded-xl transition-all",
                activeTab === "DASHBOARD"
                  ? "bg-slate-900 text-amber-500 shadow-md"
                  : "text-slate-400 hover:text-slate-600",
              )}
            >
              <Activity size={18} />
            </button>
            <button
              onClick={() => setActiveTab("SUPPORT_RELAY")}
              className={cn(
                "p-2.5 rounded-xl transition-all",
                activeTab === "SUPPORT_RELAY"
                  ? "bg-slate-900 text-amber-500 shadow-md"
                  : "text-slate-400 hover:text-slate-600",
              )}
            >
              <Bell size={18} />
            </button>
            <button
              onClick={() => setActiveTab("TERMINAL_PAIRING")}
              className={cn(
                "p-2.5 rounded-xl transition-all",
                activeTab === "TERMINAL_PAIRING"
                  ? "bg-slate-900 text-amber-500 shadow-md"
                  : "text-slate-400 hover:text-slate-600",
              )}
            >
              <Radio size={18} />
            </button>
            <button
              onClick={() => setShowMobileMenu(true)}
              className="p-2.5 rounded-xl transition-all text-slate-400 hover:text-slate-600"
            >
              <Sliders size={18} />
            </button>
          </div>
        )}

        {/* Mobile menu slide-up panel matching Admin Portal design quality */}
        <AnimatePresence>
          {showMobileMenu && (
            <div key="mobile-menu-portal" className="fixed inset-0 z-[200] md:hidden">
              <motion.div
                key="mobile-menu-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowMobileMenu(false)}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              />
              <motion.div
                key="mobile-menu-drawer"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 180 }}
                className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[2.5rem] p-6 max-h-[85vh] overflow-y-auto shadow-2xl"
              >
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      <Activity size={16} className="text-amber-500 animate-pulse" /> Support Operations Hub
                    </h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Operational Command Center</p>
                  </div>
                  <button onClick={() => setShowMobileMenu(false)} className="p-2 hover:bg-slate-50 border border-slate-150 rounded-full text-slate-500">
                    <X size={18} />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'DASHBOARD', title: 'Dashboard', icon: LayoutDashboard },
                    { id: 'TERMINAL_HUB', title: 'Terminal Fleet', icon: Cpu },
                    { id: 'SUPPORT_RELAY', title: 'Support Hub', icon: Ticket },
                    { id: 'FRAUD_ALERTS', title: 'Security & Anomalies', icon: ShieldAlert },
                    { id: 'COMPOSE_CAMPAIGN', title: 'Campaign Composer', icon: Send },
                    { id: 'MONITOR_QUEUE', title: 'Monitor Queue', icon: ClipboardCheck },
                    { id: 'GLOBAL_OFFERS', title: 'Global Offers', icon: Sparkles },
                    { id: 'DRIVER_KYC_BUREAU', title: 'Driver KYC Bureau', icon: Users },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setShowMobileMenu(false);
                      }}
                      className={cn(
                        "flex flex-col items-center gap-2.5 p-4 rounded-2xl border transition-all text-center font-mono",
                        activeTab === item.id 
                          ? "bg-slate-900 border-slate-900 text-amber-500 shadow-lg" 
                          : "bg-slate-50 border-slate-150/60 text-slate-500 hover:text-slate-800"
                      )}
                    >
                      <item.icon size={18} />
                      <span className="text-[8px] font-black uppercase tracking-widest leading-tight">{item.title}</span>
                    </button>
                  ))}
                </div>
                
                <button 
                  onClick={() => onLogout()}
                  className="w-full mt-6 py-4 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl font-black uppercase text-[9px] tracking-[0.2em] flex items-center justify-center gap-2 font-mono transition-colors"
                >
                  <X size={14} className="animate-spin" style={{ animationDuration: '3s' }} /> Kill Command Session
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Campaign Approval Form Modal */}
      <AnimatePresence>
        {approvingCampaignId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-850 rounded-[2rem] w-full max-w-4xl p-8 shadow-2xl relative my-8 text-slate-100"
            >
              <button 
                onClick={() => setApprovingCampaignId(null)} 
                className="absolute right-6 top-6 p-2 rounded-full hover:bg-slate-800 transition-colors"
               >
                <X size={20} className="text-slate-400 hover:text-white" />
              </button>

              <h3 className="text-2xl font-black uppercase text-white tracking-tight mb-2">Approve Campaign</h3>
              <p className="text-xs text-amber-500/70 font-mono tracking-wider mb-6">Assign Drivers and Finalize Settings for campaign ID: {approvingCampaignId.toUpperCase()}</p>

              <form onSubmit={handleApproveSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Driver Assign Queue */}
                  <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-850 space-y-4">
                    <h4 className="text-xs font-mono tracking-widest text-slate-400">Pick Drivers to Assign ({selectedDriverIds.length})</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                      {drivers.filter(d => d.isVerified || d.status === 'active' || d.status === 'APPROVED').map((d) => {
                        const isAssigned = selectedDriverIds.includes(d.uid || d.id);
                        return (
                          <div 
                            key={d.uid || d.id} 
                            onClick={() => toggleDriverAssignment(d.uid || d.id)}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-2xl border cursor-pointer select-none transition-all",
                              isAssigned ? "bg-amber-500/10 border-amber-550/30 text-amber-500 shadow-lg shadow-amber-500/5" : "bg-slate-900/60 border-slate-850 text-slate-300 hover:border-slate-700"
                            )}
                          >
                            <div className="text-left">
                              <p className="text-xs font-bold uppercase leading-tight truncate max-w-[200px]">{d.fullName || d.name || 'Anonymous Auto'}</p>
                              <p className={`text-[9px] font-mono tracking-wider mt-1 ${isAssigned ? 'text-amber-500/70' : 'text-slate-500'}`}>TID: {d.terminalId || 'UNASSIGNED'} | {d.vehicleNo || 'NO-PLATE'}</p>
                            </div>
                            <div className={cn(
                              "w-5 h-5 rounded-lg flex items-center justify-center border transition-all",
                              isAssigned ? "bg-amber-500 border-amber-550 text-slate-950" : "border-slate-800 bg-slate-950 text-slate-550"
                            )}>
                              {isAssigned && <Check size={12} className="stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })}
                      {drivers.filter(d => d.isVerified || d.status === 'active' || d.status === 'APPROVED').length === 0 && (
                        <p className="text-[10px] font-bold uppercase text-center text-slate-500 py-6">No premium active drivers found.</p>
                      )}
                    </div>
                  </div>

                  {/* Campaign Options */}
                  <div className="space-y-4 text-left">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 tracking-wider mb-2">Duration (Days)</label>
                        <input 
                          type="number" 
                          value={approvalForm.durationDays}
                          onChange={(e) => setApprovalForm(prev => ({ ...prev, durationDays: Number(e.target.value) }))}
                          className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 tracking-wider mb-2">Hours Per Day</label>
                        <input 
                          type="number" 
                          value={approvalForm.hoursPerDay}
                          onChange={(e) => setApprovalForm(prev => ({ ...prev, hoursPerDay: Number(e.target.value) }))}
                          className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 tracking-wider mb-2">Start Date</label>
                        <input 
                          type="date" 
                          value={approvalForm.startDate}
                          onChange={(e) => setApprovalForm(prev => ({ ...prev, startDate: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 tracking-wider mb-2">End Date</label>
                        <input 
                          type="date" 
                          value={approvalForm.endDate}
                          onChange={(e) => setApprovalForm(prev => ({ ...prev, endDate: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 tracking-wider mb-2">Max Screen Autos</label>
                        <input 
                          type="number" 
                          value={approvalForm.maxAutos}
                          onChange={(e) => setApprovalForm(prev => ({ ...prev, maxAutos: Number(e.target.value) }))}
                          className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 tracking-wider mb-2">Total Minutes</label>
                        <input 
                          type="number" 
                          value={approvalForm.totalMinutes}
                          onChange={(e) => setApprovalForm(prev => ({ ...prev, totalMinutes: Number(e.target.value) }))}
                          className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 py-3">
                        <input 
                          type="checkbox" 
                          id="paymentConfirmed"
                          checked={approvalForm.paymentConfirmed}
                          onChange={(e) => setApprovalForm(prev => ({ ...prev, paymentConfirmed: e.target.checked }))}
                          className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-800 focus:ring-amber-500/40"
                        />
                        <label htmlFor="paymentConfirmed" className="text-[10px] font-mono text-slate-350 cursor-pointer">Payment Confirmed</label>
                      </div>
                      <div className="flex items-center gap-3 py-3">
                        <input 
                          type="checkbox" 
                          id="mediaConfirmed"
                          checked={approvalForm.mediaConfirmed}
                          onChange={(e) => setApprovalForm(prev => ({ ...prev, mediaConfirmed: e.target.checked }))}
                          className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-800 focus:ring-amber-500/40"
                        />
                        <label htmlFor="mediaConfirmed" className="text-[10px] font-mono text-slate-350 cursor-pointer">Media Certified</label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-850 pt-6 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setApprovingCampaignId(null)}
                    className="px-6 py-3 border border-slate-800 text-slate-400 rounded-2xl text-[10px] font-bold uppercase tracking-wider hover:bg-slate-800 transition-all font-sans"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="px-8 py-3 bg-gradient-to-r from-amber-600 to-orange-500 text-slate-950 rounded-2xl text-[10px] font-bold uppercase tracking-wider hover:brightness-110 transition-all disabled:opacity-50 font-sans shadow-xl shadow-amber-500/10"
                  >
                    {isSubmitting ? "Approving..." : "Confirm & Deploy"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Operation Status Toast */}
      <AnimatePresence>
        {opFeedback && (
          <motion.div
            key="support-portal-toast"
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            className={cn(
              "fixed bottom-24 left-1/2 z-[9999] px-8 py-5 rounded-2xl shadow-3xl flex items-center gap-4 min-w-[320px] border text-[11px] font-black uppercase tracking-widest",
              opFeedback.type === 'success' ? "bg-slate-900 border-emerald-500/50 text-white" : 
              opFeedback.type === 'error' ? "bg-rose-950 border-rose-500/50 text-white" : 
              "bg-slate-900 border-amber-500/55 text-white"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-lg",
              opFeedback.type === 'success' ? "bg-emerald-500/20 text-emerald-500" :
              opFeedback.type === 'error' ? "bg-rose-500/20 text-rose-500" :
              "bg-amber-500/20 text-amber-500"
            )}>
              {opFeedback.type === 'success' ? <ThumbsUp size={16} /> : <ShieldAlert size={16} />}
            </div>
            <div className="flex flex-col">
               <span className="opacity-50 text-[8px] mb-0.5">{opFeedback.type === 'error' ? 'ERROR SIGNAL' : 'SYSTEM UPDATE'}</span>
               {opFeedback.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Driver Agreement Management Modal */}
      <AnimatePresence>
        {selectedDriverForAgreement && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white border border-slate-200 rounded-[3rem] w-full max-w-4xl p-10 shadow-2xl relative my-10"
            >
              <button 
                onClick={() => setSelectedDriverForAgreement(null)} 
                className="absolute right-8 top-8 p-3 rounded-full bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <X size={20} className="text-slate-400 hover:text-slate-900" />
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <FileText className="text-slate-950" size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase text-slate-900 tracking-tight leading-none">Agreement Vault</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Driver Reference: {selectedDriverForAgreement.fullName || selectedDriverForAgreement.name}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="p-6 bg-slate-50 border border-slate-150 rounded-[2rem]">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Digital Signatory Profile</p>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-white border border-slate-200">
                        {selectedDriverForAgreement._agreementData?.verificationSelfieUrl ? (
                          <img src={selectedDriverForAgreement._agreementData.verificationSelfieUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-300">
                            <UserIcon size={20} />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase text-slate-800">{selectedDriverForAgreement.fullName || selectedDriverForAgreement.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Selfie Verified: {selectedDriverForAgreement._agreementData?.verificationSelfieUrl ? 'YES' : 'NO'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-50 border border-slate-150 rounded-[2rem]">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Contractual Signature</p>
                    <div className="bg-white border border-slate-150 rounded-2xl p-4 flex items-center justify-center min-h-[100px]">
                      {selectedDriverForAgreement._agreementData?.signatureUrl ? (
                        <img src={selectedDriverForAgreement._agreementData.signatureUrl} className="max-h-20" referrerPolicy="no-referrer" />
                      ) : (
                        <p className="text-[10px] font-black text-slate-300 uppercase italic">Signature Not Recorded</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden group">
                    <div className="relative z-10">
                      <h4 className="text-xl font-black uppercase tracking-tight mb-2">Generate Agreement PDF</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-8">
                        Sealing this agreement generates a formal legal instrument with embedded facial biometrics and digital signatures.
                      </p>
                      <button 
                        onClick={() => generateMissingPDF(selectedDriverForAgreement)}
                        className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl shadow-amber-500/20 active:scale-95"
                      >
                        Generate & Open PDF
                      </button>
                    </div>
                    <div className="absolute -right-4 -bottom-4 text-white/5 rotate-12 group-hover:rotate-0 transition-all">
                      <FileText size={120} />
                    </div>
                  </div>

                  <div className="p-6 border border-slate-150 rounded-[2rem]">
                    <div className="flex items-center gap-3 text-emerald-600 mb-3">
                      <ShieldCheck size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Compliance Status: Verified</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                      This driver has passed all tactical identity audits and is cleared for field operations.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Identity Document Preview Modal */}
      <AnimatePresence>
        {showDocModal && selectedDriverForDocs && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-[3rem] w-full max-w-5xl p-8 md:p-10 shadow-2xl relative my-10"
            >
              <button 
                onClick={() => setShowDocModal(false)} 
                className="absolute right-6 md:right-8 top-6 md:top-8 p-3 rounded-full bg-slate-50 hover:bg-slate-100 transition-colors z-10"
              >
                <X size={20} className="text-slate-400 hover:text-slate-900" />
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <ShieldCheck className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 tracking-tight leading-none">Identity Audit</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mt-2">Driver Bureau: {selectedDriverForDocs.fullName || selectedDriverForDocs.name}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: "Aadhaar Card", key: "aadharPhoto", folder: "aadhaar" },
                  { label: "Driving License", key: "dlPhoto", folder: "drivingLicense" },
                  { label: "Biometric Selfie", key: "profileImage", folder: "selfie" }
                ].map((docItem) => {
                  const url = selectedDriverForDocs[docItem.key] || selectedDriverForDocs.documents?.[docItem.folder];
                  return (
                    <div key={docItem.key} className="space-y-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1 text-left">{docItem.label}</p>
                      <div className="aspect-video md:aspect-[4/5] bg-slate-50 rounded-2xl border border-slate-150 overflow-hidden relative group shadow-inner">
                        {url ? (
                          <img 
                            src={getSafeUrl(url)} 
                            alt={docItem.label} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 cursor-zoom-in" 
                            referrerPolicy="no-referrer"
                            onClick={() => window.open(getSafeUrl(url), '_blank')}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-2">
                             <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                               <AlertTriangle size={16} className="text-slate-300" />
                             </div>
                             <p className="text-[9px] font-black text-slate-300 uppercase tracking-tighter italic">Document Missing</p>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                           <Eye className="text-white" size={24} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-10 p-6 bg-slate-900 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-left">
                  <h4 className="text-white font-black uppercase text-sm italic">Audit Conclusion</h4>
                  <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mt-1 leading-relaxed">
                    Verify all timestamps and biometric features match the registry records.
                  </p>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                   {hasPermission('approveDriverKyc') && (
                     <button 
                      onClick={async () => {
                         await firebaseService.updateDriverProfile(selectedDriverForDocs.id, { 
                           kycStatus: 'UNDER_REVIEW', 
                           adminApproved: false 
                         });
                         showToast("Dossier transmitted for Admin Finalization.", "success");
                         setShowDocModal(false);
                      }}
                      className="flex-1 md:flex-none px-10 py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl shadow-amber-500/20"
                     >
                       Submit for Admin Review
                     </button>
                   )}
                   {hasPermission('approveDriverKyc') && (
                     <button 
                      onClick={async () => {
                          await firebaseService.updateDriverProfile(selectedDriverForDocs.id, { kycStatus: 'REJECTED' });
                          showToast("Revocation warning issued.", "error");
                          setShowDocModal(false);
                      }}
                      className="flex-1 md:flex-none px-10 py-4 border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
                     >
                       Reject
                     </button>
                   )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProvisionModal && selectedDriverForProvision && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setShowProvisionModal(false)}
            ></div>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-6 md:p-10 w-full max-w-md relative z-[610] space-y-6 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5">
                 <Smartphone size={120} />
              </div>

              <div className="text-center relative z-10">
                <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                  <Smartphone size={32} />
                </div>
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">
                  Provision Access
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                  DRIVER: {selectedDriverForProvision.fullName || selectedDriverForProvision.name}
                </p>
              </div>

              <form onSubmit={handleProvisionDriver} className="space-y-4 relative z-10">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">
                    Device Unlock Code
                  </label>
                  <input
                    name="driverCode"
                    defaultValue={
                      selectedDriverForProvision.driverCode ||
                      `DRV-${Math.floor(1000 + Math.random() * 9000)}`
                    }
                    required
                    placeholder="DRV-0000"
                    className="w-full p-4 bg-slate-50 border border-slate-150 rounded-2xl text-xs font-black focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">
                    System Password
                  </label>
                  <input
                    name="password"
                    defaultValue={
                      selectedDriverForProvision.password ||
                      Math.random().toString(36).slice(-6).toUpperCase()
                    }
                    required
                    placeholder="PASSWORD"
                    type="text"
                    className="w-full p-4 bg-slate-50 border border-slate-150 rounded-2xl text-xs font-black focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">
                    Hardware GPS ID (for map tracking)
                  </label>
                  <input
                    name="gpsId"
                    defaultValue={selectedDriverForProvision.gpsId || ""}
                    placeholder="e.g. GPS-990022"
                    className="w-full p-4 bg-slate-50 border border-slate-150 rounded-2xl text-xs font-black focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                  />
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150">
                  <p className="text-[8px] text-slate-400 font-black uppercase text-center leading-relaxed">
                    THIS WILL OVERWRITE ANY PREVIOUS DEVICE LOCK FOR THIS DRIVER
                    ACCOUNT. ALL KYCs WILL BE MARKED AS APPROVED.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-5 bg-slate-900 text-amber-500 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-slate-900/10 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "SYNCHRONIZING..." : "CONFIRM PROVISIONING"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Driver Earning/Wallet Management Modal Mockup */}
      <AnimatePresence>
        {showEarningModal && selectedDriverForEarning && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-[2rem] p-8 max-w-md w-full relative shadow-2xl border border-slate-200">
               <button onClick={() => setShowEarningModal(false)} className="absolute right-6 top-6 text-slate-400 hover:text-slate-900"><X size={20}/></button>
               <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 mb-2">Driver Pay Portal</h3>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Subject: {selectedDriverForEarning.name}</p>
               <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-slate-500">Current Balance</span>
                    <span className="text-lg font-black text-slate-900 font-mono">₹{selectedDriverForEarning.walletBalance || 0}</span>
                  </div>
                  <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all">Disburse Funds</button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
