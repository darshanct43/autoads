import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check,
  PlusCircle, 
  List, 
  Upload, 
  Image as ImageIcon, 
  Video, 
  Send, 
  CheckCircle, 
  AlertCircle,
  Zap,
  Layout,
  LogOut,
  User as UserIcon,
  MessageSquare,
  ChevronRight,
  Radio,
  X,
  Plus,
  Search,
  RefreshCw,
  Database,
  Monitor,
  ShieldCheck,
  IndianRupee,
  Activity,
  ChevronLeft,
  Truck,
  Gift,
  Trash2,
  Download,
  Info,
  Shield,
  FileText,
  Paperclip,
  Crown,
  Loader2
} from 'lucide-react';
import { FileUpload } from '@/components/common/FileUpload';
import { cn } from '@/lib/utils';
import { firebaseService, AdCampaign, SupportTicket, ChatMessage, Driver } from '@/services/firebaseService';
import { storageService } from '@/services/storageService';
import { auth } from '@/lib/firebase';
import { UserRole } from '@/types';
import AdminAssistant from '../common/AdminAssistant';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import ComplianceContent, { CompliancePage } from '../common/ComplianceContent';
import NotificationCenter from '../common/NotificationCenter';
import { INITIAL_CITIES, INITIAL_FRANCHISES, getCityName, getFranchiseName } from '@/modules/cityManagement/cities';
import { approveDriverProfile, approveCampaignWithMetadata, approveAndMapDevice } from '@/modules/support/supportDashboardService';
import { hasPermission } from '@/modules/rbac/permissions';

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

interface SupportPortalProps {
  onLogout: () => void;
  onRoleJump?: (role: UserRole) => void;
  onOpenStudio?: () => void;
}

export default function SupportPortal({ onLogout, onRoleJump, onOpenStudio }: SupportPortalProps) {
  const [selectedTheme, setSelectedTheme] = useState<'default' | 'tokyo' | 'emerald' | 'ocean' | 'solar'>(() => (localStorage.getItem('support_premium_theme') as any) || 'default');
  
  const selectTheme = (theme: 'default' | 'tokyo' | 'emerald' | 'ocean' | 'solar') => {
    setSelectedTheme(theme);
    localStorage.setItem('support_premium_theme', theme);
  };

  const themeClasses = (() => {
    switch (selectedTheme) {
      case 'tokyo':
        return {
          bg: 'bg-stone-950',
          text: 'text-fuchsia-400',
          accent: 'bg-fuchsia-500',
          border: 'border-fuchsia-500/30',
          card: 'bg-purple-950/40 border-purple-900/40',
          textAccent: 'text-fuchsia-400',
          btn: 'bg-fuchsia-500 text-slate-950 hover:bg-fuchsia-400',
          glow: 'shadow-[0_0_15px_rgba(217,70,239,0.35)]',
          badge: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-400'
        };
      case 'emerald':
        return {
          bg: 'bg-stone-950',
          text: 'text-emerald-400',
          accent: 'bg-emerald-500',
          border: 'border-emerald-500/30',
          card: 'bg-emerald-950/40 border-emerald-900/40',
          textAccent: 'text-emerald-400',
          btn: 'bg-emerald-500 text-slate-950 hover:bg-emerald-400',
          glow: 'shadow-[0_0_15px_rgba(16,185,129,0.35)]',
          badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
        };
      case 'ocean':
        return {
          bg: 'bg-slate-950',
          text: 'text-cyan-400',
          accent: 'bg-cyan-500',
          border: 'border-cyan-500/30',
          card: 'bg-cyan-950/40 border-cyan-900/40',
          textAccent: 'text-cyan-400',
          btn: 'bg-cyan-500 text-slate-950 hover:bg-cyan-400',
          glow: 'shadow-[0_0_15px_rgba(6,182,212,0.35)]',
          badge: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
        };
      case 'solar':
        return {
          bg: 'bg-slate-950',
          text: 'text-yellow-400',
          accent: 'bg-yellow-500',
          border: 'border-yellow-500/30',
          card: 'bg-yellow-950/40 border-yellow-900/40',
          textAccent: 'text-yellow-400',
          btn: 'bg-yellow-500 text-slate-950 hover:bg-yellow-400',
          glow: 'shadow-[0_0_15px_rgba(234,179,8,0.35)]',
          badge: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
        };
      default:
        return {
          bg: 'bg-[#05070a]',
          text: 'text-amber-500',
          accent: 'bg-amber-500',
          border: 'border-amber-500/20',
          card: 'bg-white/5 border-white/5',
          textAccent: 'text-amber-500',
          btn: 'bg-amber-500 text-slate-950 hover:bg-amber-400',
          glow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]',
          badge: 'border-amber-500/20 bg-amber-500/10 text-amber-500'
        };
    }
  })();

  const [activeTab, setActiveTab ] = useState<'CREATE' | 'STATUS' | 'PLANS' | 'TICKETS' | 'NOTICES' | 'TERMINAL_HUB' | 'LEGAL'>('CREATE');
  const [subTab, setSubTab] = useState<'CAMPAIGNS' | 'KYC' | 'TERMINALS' | 'FRAUD'>('CAMPAIGNS');
  const [modTags, setModTags] = useState<string>('ads, fleet, local');
  const [modSafeContent, setModSafeContent] = useState<boolean>(true);
  const [modKidsSafe, setModKidsSafe] = useState<boolean>(true);
  const [selectedCityId, setSelectedCityId] = useState<string>('mysore');
  const [selectedFranchiseId, setSelectedFranchiseId] = useState<string>('fr-mys-01');
  const [newDeviceId, setNewDeviceId] = useState<string>('');
  const [newDeviceDriverId, setNewDeviceDriverId] = useState<string>('');
  const [isSlideMenuOpen, setIsSlideMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [studioPlans, setStudioPlans] = useState<any[]>([]);
  const [legalPage, setLegalPage] = useState<CompliancePage>('ABOUT');
  const [terminals, setTerminals] = useState<any[]>([]);
  const [liveStatus, setLiveStatus] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<'ALL' | 'DEVICE' | 'CUSTOMER' | 'DESIGN'>('ALL');
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [newNotice, setNewNotice] = useState({ offer: '', message: '', targetRegion: '', imageUrl: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState<string | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvingCampaignId, setApprovingCampaignId] = useState<string | null>(null);
  const [selectedDriverForDocs, setSelectedDriverForDocs] = useState<any | null>(null);
  const [showDocModal, setShowDocModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);
  const [approvalForm, setApprovalForm] = useState({
    durationDays: 30,
    hoursPerDay: 8,
    maxAutos: 5,
    designerFee: 0,
    videoMakerFee: 0,
    mediaUrl: '',
    mediaType: 'IMAGE' as 'IMAGE' | 'VIDEO'
  });
  const [newCampaign, setNewCampaign] = useState({
    title: '',
    description: '',
    mediaUrl: '',
    assetUrl: '',
    mediaType: 'IMAGE' as 'IMAGE' | 'VIDEO',
    designerFee: 0,
    videoMakerFee: 0
  });
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [showManualUrlInput, setShowManualUrlInput] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadingCampaignId, setUploadingCampaignId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const createFileInputRef = React.useRef<HTMLInputElement>(null);
  const noticesFileInputRef = React.useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleUploadMediaToCampaign = async (campaignId: string, file: File) => {
    try {
      setUploadingCampaignId(campaignId);
      setIsUploading(true);
      setUploadProgress(0);
      showToast("Initializing Upload...", "success");

      const res = await storageService.uploadCampaignMedia(campaignId, file, (progress) => {
        setUploadProgress(progress);
      });

      const campaign = campaigns.find(c => c.id === campaignId);
      const isAlreadyApproved = campaign?.status === 'ACTIVE' || campaign?.status === 'APPROVED' || campaign?.status === 'LIVE';

      await firebaseService.updateCampaign(campaignId, {
        assetUrl: res.url,
        mediaUrl: res.url,
        videoThumbnail: res.thumbnailUrl || "",
        mediaType: file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE',
        mediaReceived: true,
        status: isAlreadyApproved ? 'ACTIVE' : 'PENDING',
        updatedAt: new Date()
      });

      showToast("Media Uploaded Successfully!", "success");
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 2000);
    } catch (error) {
      console.error("Upload error:", error);
      showToast("Upload failed. Please try again.", "error");
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    const unsub = firebaseService.subscribeToCampaigns((data) => {
      setCampaigns(data);
    });

    const unsubDrivers = firebaseService.subscribeToDrivers(setDrivers);
    const unsubTickets = firebaseService.subscribeToSupportTicketsForAll(setTickets);
    const unsubNotices = firebaseService.subscribeToPublicNotices(setNotices);
    const unsubTerminals = firebaseService.subscribeToTerminals(setTerminals);
    const unsubLiveStatus = firebaseService.subscribeToLiveStatus(setLiveStatus);
    const unsubPayments = firebaseService.subscribeToPayments(setPayments);
    
    firebaseService.getPlans().then(setPlans).catch(console.error);
    firebaseService.getStudioPlans().then(setStudioPlans).catch(console.error);
    
    const fetchProfile = async () => {
      const u = auth.currentUser;
      if (u) {
        try {
          const profile = await firebaseService.getUserProfile(u.uid);
          setUserProfile(profile);
        } catch (e) {
          console.error("Failed to load user profile:", e);
        }
      }
    };
    fetchProfile();

    return () => {
      unsub();
      unsubDrivers();
      unsubTickets();
      unsubNotices();
      unsubTerminals();
      unsubLiveStatus();
      unsubPayments();
    };
  }, []);

  useEffect(() => {
    if (!activeTicketId) {
      setChatMessages([]);
      return;
    }
    firebaseService.markTicketAsRead(activeTicketId);
    const unsubscribe = firebaseService.subscribeToMessages(activeTicketId, setChatMessages);
    return () => unsubscribe();
  }, [activeTicketId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast("Invalid Type: Use an image file (JPG, PNG)", "error");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    try {
      showToast("Uploading announcement...", "success");
      
      // Using storageService for consistency and progress
      const tempId = `notice_${Date.now()}`;
      const res = await storageService.uploadFile(file, (p) => {
        setUploadProgress(p.progress);
      });

      setNewNotice(prev => ({ ...prev, imageUrl: res }));
      showToast("Announcement visual uploaded!", "success");
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 1500);
    } catch (err) {
      console.error(err);
      showToast("Notice upload failed.", "error");
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!activeTicketId || !newMessage.trim()) return;
    try {
      await firebaseService.sendChatMessage(activeTicketId, {
        senderId: 'SUPPORT_AGENT',
        senderName: 'System Agent',
        senderRole: 'staff',
        text: newMessage.trim()
      });
      setNewMessage('');
    } catch (e) {
      console.error("Chat error:", e);
    }
  };

  const handleApproveCampaign = async (campaignId: string) => {
    setApprovingCampaignId(campaignId);
    setShowApprovalModal(true);
    setSelectedDriverIds([]);
  };

  const handleConfirmApproval = async () => {
    if (!approvingCampaignId) return;
    if (selectedDriverIds.length === 0) {
      alert("Please select at least one driver.");
      return;
    }
    setIsSubmitting(true);
    try {
      await firebaseService.adminApproveCampaignWithDetails(approvingCampaignId, {
        ...approvalForm,
        assignedDrivers: selectedDriverIds
      });
      showToast("Campaign Approved!", 'success');
      setShowApprovalModal(false);
    } catch (err) {
      showToast("Approval failed.", 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectCampaign = async (campaignId: string) => {
    if (!confirm("Reject this campaign?")) return;
    try {
      await firebaseService.adminRejectCampaign(campaignId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdatePlanDirect = async (planId: string, newPrice: number) => {
    setIsUpdatingPlan(planId);
    try {
      await firebaseService.updatePlan(planId, { price: newPrice });
      showToast("Plan price updated directly", 'success');
    } catch (e) {
      console.error(e);
      showToast("Update failed", 'error');
    } finally {
      setIsUpdatingPlan(null);
    }
  };

  const handleProposePlan = async (planId: string, type: 'price' | 'designerPrice', newValue: number) => {
    setIsUpdatingPlan(planId);
    try {
      await firebaseService.proposePlanChange({
        planId,
        newPrice: newValue,
        proposedBy: auth.currentUser?.uid || 'SUPPORT',
        type
      });
      showToast(`Proposal for new ${type} submitted for Admin approval`, 'success');
    } catch (e) {
      console.error(e);
      showToast("Proposal failed", 'error');
    } finally {
      setIsUpdatingPlan(null);
    }
  };

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotice.offer || !newNotice.message) return;
    try {
      await firebaseService.createPublicNotice(newNotice);
      setNewNotice({ offer: '', message: '', targetRegion: '', imageUrl: '' });
      showToast("Offer published successfully!", 'success');
    } catch (err) {
      console.error(err);
      showToast("Failed to publish offer.", 'error');
    }
  };

  const handleDeleteNotice = async (id: string) => {
    try {
      await firebaseService.deletePublicNotice(id);
      showToast("Offer deleted", 'success');
    } catch (err) {
      console.error(err);
      showToast("Failed to delete offer.", 'error');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalTitle = newCampaign.title.trim() || `Ad Campaign #${Math.floor(1000 + Math.random() * 9000)}`;
    const finalDescription = newCampaign.description.trim() || 'A dynamically deployed campaign designed for high local coverage.';
    const defaultPlaceholder = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';
    const finalMediaUrl = (newCampaign.mediaUrl || '').trim() || defaultPlaceholder;

    setIsSubmitting(true);
    try {
      await firebaseService.supportCreateCampaign({
        title: finalTitle,
        description: finalDescription,
        mediaUrl: finalMediaUrl,
        assetUrl: finalMediaUrl,
        mediaType: newCampaign.mediaType,
        mediaReceived: true
      });
      showToast("Campaign created and submitted for review", 'success');
      setNewCampaign({ 
        title: '', 
        description: '', 
        mediaUrl: '', 
        assetUrl: '', 
        mediaType: 'IMAGE',
        designerFee: 0,
        videoMakerFee: 0
      });
      setActiveTab('STATUS');
    } catch (err) {
      console.error(err);
      showToast("Failed to create campaign.", 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      showToast("Invalid Type: Use JPG, PNG, MP4, or MOV", "error");
      return;
    }

    try {
      setUploadedFileName(file.name);
      setUploadingCampaignId('new');
      setIsUploading(true);
      setUploadProgress(0);
      showToast("Uploading media...", "success");

      const tempId = `temp_${Date.now()}`;
      const res = await storageService.uploadCampaignMedia(tempId, file, (progress) => {
        setUploadProgress(progress);
      });

      setNewCampaign(prev => ({
        ...prev,
        mediaUrl: res.url,
        assetUrl: res.url,
        mediaType: file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE'
      }));

      showToast("Media Uploaded!", "success");
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 1500);
    } catch (error) {
      console.error("Upload error:", error);
      showToast("Upload failed.", "error");
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      showToast("Invalid Type: Use JPG, PNG, MP4, or MOV", "error");
      return;
    }

    try {
      setUploadedFileName(file.name);
      setUploadingCampaignId('new');
      setIsUploading(true);
      setUploadProgress(0);
      showToast("Uploading media...", "success");

      const tempId = `temp_${Date.now()}`;
      const res = await storageService.uploadCampaignMedia(tempId, file, (progress) => {
        setUploadProgress(progress);
      });

      setNewCampaign(prev => ({
        ...prev,
        mediaUrl: res.url,
        assetUrl: res.url,
        mediaType: file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE'
      }));

      showToast("Media Uploaded!", "success");
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 1500);
    } catch (error) {
      console.error("Upload error:", error);
      showToast("Upload failed.", "error");
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const liveUnitsCount = liveStatus.filter((status) => {
    if (!status.updatedAt) return false;
    const lastUpdate = status.updatedAt.toMillis?.() || 0;
    return Date.now() - lastUpdate < 60000;
  }).length;

  const totalSuccessfulRevenue = payments
    .filter(p => p.status === 'SUCCESS' || p.status === 'success' || p.status === 'captured')
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const user = auth.currentUser;

  return (
    <ErrorBoundary componentName="Support Command Center">
      {/* Dynamic Slide-out Drawer Menu */}
      <AnimatePresence>
        {isSlideMenuOpen && (
          <div className="fixed inset-0 z-[100] overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSlideMenuOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm pointer-events-auto"
            />
            {/* Menu panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 bottom-0 left-0 w-80 max-w-[85vw] bg-[#05070a]/95 border-r border-white/10 shadow-2xl flex flex-col p-6 selection:bg-amber-500/30 overflow-y-auto z-[101]"
            >
              <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-slate-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.3)]">S</div>
                  <div>
                    <h3 className="text-sm font-black text-white italic tracking-widest uppercase">Support Board</h3>
                    <p className="text-[8px] font-bold text-slate-400 tracking-wider uppercase">System Management Hub</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSlideMenuOpen(false)}
                  className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* User profile / details */}
              <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className={"w-11 h-11 border rounded-xl overflow-hidden flex items-center justify-center " + (selectedTheme === 'default' ? 'bg-amber-500/10 border-amber-500/20' : themeClasses.badge)}>
                    <UserIcon className={selectedTheme === 'default' ? 'text-amber-500' : themeClasses.text} size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white uppercase tracking-tighter leading-none mb-1">
                      {userProfile?.name || user?.displayName || 'Support Staff'}
                    </p>
                    <p className={"text-[8px] font-bold uppercase tracking-widest " + (selectedTheme === 'default' ? 'text-amber-500' : themeClasses.text)}>
                      {userProfile?.role || 'SUPPORT AGENT'}
                    </p>
                  </div>
                </div>

                {/* Gold Premium Status */}
                <div className="flex items-center justify-between p-2 bg-gradient-to-r from-amber-500/15 to-yellow-500/5 border border-amber-500/30 rounded-xl">
                  <span className="text-[8.5px] font-black tracking-widest text-amber-400 uppercase italic">👑 PREMIUM UNLOCKED</span>
                  <span className="text-[7.5px] font-black text-green-400 uppercase tracking-widest animate-pulse">● ACTIVE</span>
                </div>

                {/* Theme Selector UI */}
                <div className="pt-2 border-t border-white/5 space-y-2">
                  <p className="text-[8px] font-black text-slate-500 tracking-wider uppercase">Active Command Theme</p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { id: 'default', color: 'bg-amber-500', label: 'Amber' },
                      { id: 'tokyo', color: 'bg-fuchsia-500', label: 'Neon' },
                      { id: 'emerald', color: 'bg-emerald-500', label: 'Green' },
                      { id: 'ocean', color: 'bg-cyan-500', label: 'Cyan' },
                      { id: 'solar', color: 'bg-yellow-500', label: 'Solar' }
                    ].map((themeOpt) => (
                      <button 
                        key={themeOpt.id}
                        type="button"
                        onClick={() => selectTheme(themeOpt.id as any)}
                        className={cn(
                          "w-full h-6 rounded-lg border-2 flex items-center justify-center transition-all bg-slate-950/80",
                          selectedTheme === themeOpt.id ? "border-white scale-110 shadow-lg" : "border-slate-800 opacity-60 hover:opacity-100 hover:scale-105"
                        )}
                        title={themeOpt.label}
                      >
                        <div className={cn("w-3 h-3 rounded-full", themeOpt.color)} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Menu items */}
              <div className="flex-1 space-y-2">
                {[
                  { id: 'CREATE', icon: <Plus size={18} />, label: 'Compose Campaign' },
                  { id: 'STATUS', icon: <Activity size={18} />, label: 'Monitor Queue' },
                  { id: 'TICKETS', icon: <MessageSquare size={18} />, label: 'Support Relay' },
                  { id: 'TERMINAL_HUB', icon: <Database size={18} />, label: 'Nodes Status' },
                  { id: 'LEGAL', icon: <Shield size={18} />, label: 'Rules & Terms' },
                  { id: 'PLANS', icon: <Zap size={18} />, label: 'Pricing Config' },
                  { id: 'NOTICES', icon: <Gift size={18} />, label: 'Global Offers' },
                  { id: 'STUDIO', icon: <PlusCircle size={18} className="text-amber-400" />, label: 'Canva Studio' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setIsSlideMenuOpen(false);
                      if (item.id === 'STUDIO') {
                        onOpenStudio?.();
                      } else {
                        setActiveTab(item.id as any);
                      }
                    }}
                    className={cn(
                      "w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left transition-all border border-transparent font-medium",
                      activeTab === item.id
                        ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/10 font-bold"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    {item.icon}
                    <span className="text-xs uppercase tracking-wider font-bold">{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Role Jump & Logout footer */}
              <div className="pt-6 border-t border-white/5 mt-6 space-y-3">
                {onRoleJump && (
                  <div className="flex flex-col gap-1">
                    <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Quick Role Jump</p>
                    <div className="grid grid-cols-2 gap-1.5 col-span-2">
                      {['CUSTOMER', 'DRIVER', 'ADMIN'].map((r) => (
                        <button
                          key={r}
                          onClick={() => {
                            setIsSlideMenuOpen(false);
                            onRoleJump(r as any);
                          }}
                          className="px-2 py-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-[8px] font-bold uppercase tracking-wider text-center"
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <button
                  onClick={onLogout}
                  className="w-full flex items-center justify-center gap-2 py-3 border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-all text-xs font-black uppercase tracking-widest mt-2"
                >
                  <LogOut size={14} />
                  <span>Log Out</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row h-screen bg-[#020308] text-slate-400 overflow-hidden font-sans selection:bg-amber-500/30 relative">
        {/* Ambient Tech Grid Background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.06),transparent_60%)] pointer-events-none z-0" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.04),transparent_60%)] pointer-events-none z-0" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-0" />
        
        {/* MOBILE HEADER */}
      <div className="md:hidden h-14 bg-[#05070a] border-b border-white/5 flex items-center justify-between px-6 shrink-0 z-40 w-full">
        <div className="flex items-center gap-3">
           <button 
             onClick={() => setIsSlideMenuOpen(true)}
             className="p-2 -ml-2 text-white hover:text-amber-500 transition-colors"
             title="Open Menu"
           >
             <List size={22} className="stroke-[2.5]" />
           </button>
           <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-slate-950 font-black text-xs">S</div>
           <span className="text-[10px] font-black text-white uppercase tracking-widest italic">Command Hub</span>
        </div>
        <div className="flex items-center gap-4">
           <NotificationCenter role="SUPPORT" userId={user?.uid} onNavigateToTab={(tab) => setActiveTab(tab as any)} />
           <button 
             onClick={onLogout}
             className="p-2 bg-red-500 text-white rounded-lg shadow-lg shadow-red-500/20"
           >
              <LogOut size={16} />
           </button>
           <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]" />
        </div>
      </div>

      {/* SIDEBAR / BOTTOM NAV */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-[#05070a]/90 backdrop-blur-xl border-t border-white/5 flex md:flex-col items-center justify-around md:justify-start md:static md:w-20 md:h-full md:py-8 md:gap-8 md:border-r md:border-t-0 z-50 shrink-0">
        <button 
          onClick={() => setIsSlideMenuOpen(true)}
          className="hidden md:flex w-10 h-10 bg-white/5 border border-white/10 rounded-xl items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all shadow-lg active:scale-95"
          title="Open Menu Slide"
        >
          <List size={20} />
        </button>
        <div className="hidden md:flex w-10 h-10 bg-amber-500 rounded-xl items-center justify-center text-[#05070a] font-black shadow-[0_0_20px_rgba(245,158,11,0.2)]">S</div>
        
        <div className="flex md:flex-col gap-2 md:gap-6 w-full md:w-auto px-4 md:px-0 justify-around">
          {[
            { id: 'CREATE', icon: <Plus size={24} />, label: 'Compose' },
            { id: 'STATUS', icon: <Activity size={24} />, label: 'Monitor' },
            { id: 'TICKETS', icon: <MessageSquare size={24} />, label: 'Relay' },
            { id: 'TERMINAL_HUB', icon: <Database size={24} />, label: 'Nodes' },
            { id: 'LEGAL', icon: <Shield size={24} />, label: 'Rules' },
            { id: 'PLANS', icon: <Zap size={24} />, label: 'Pricing' },
            { id: 'NOTICES', icon: <Gift size={24} />, label: 'Offers' },
            { id: 'STUDIO', icon: <PlusCircle size={24} className="text-amber-400" />, label: 'Studio' }
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => {
                if (item.id === 'STUDIO') {
                  onOpenStudio?.();
                } else {
                  setActiveTab(item.id as any);
                }
              }}
              className={cn(
                "p-4 rounded-2xl transition-all relative group flex flex-col items-center gap-1 md:gap-0",
                activeTab === item.id ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20" : "text-slate-600 hover:text-white hover:bg-white/5"
              )}
            >
              {item.icon}
              <span className="md:hidden text-[9px] font-black uppercase tracking-tighter opacity-70">{item.label}</span>
              <div className="hidden md:block absolute left-full ml-4 px-2 py-1 bg-slate-900 text-[8px] font-black uppercase tracking-widest text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 border border-white/10">
                {item.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* DASHBOARD AREA */}
      <div className="flex-1 flex flex-col overflow-hidden relative pb-16 md:pb-0">
        <header className="hidden md:flex h-16 border-b border-white/5 items-center justify-between px-8 bg-[#05070a]/80 backdrop-blur-xl shrink-0 z-20">
          <div className="flex items-center gap-4">
             <div className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-md">
                <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest leading-none">Command Hub</p>
             </div>
             <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] hidden md:block">
               Unified Operational Environment <span className="text-slate-800 mx-2">{" >> "}</span> {activeTab}
             </h2>
          </div>
          <div className="flex items-center gap-3">
             <NotificationCenter shouldSubscribe={false} role="SUPPORT" userId={user?.uid} onNavigateToTab={(tab) => setActiveTab(tab as any)} />
             <div className="text-right">
                <p className="text-[10px] font-black text-white leading-none mb-1">{user?.displayName || 'Support Agent'}</p>
                <p className="text-[8px] text-slate-600 uppercase tracking-widest font-black">Auth Level: Support</p>
             </div>
             <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-800 to-slate-950 border border-white/5 flex items-center justify-center text-[10px] font-black text-white">S</div>
             <button 
               onClick={onLogout}
               className="ml-2 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 flex items-center gap-2"
               title="Logout"
             >
                <LogOut size={14} />
                <span className="text-[9px] font-black uppercase tracking-widest hidden lg:inline">Exit Hub</span>
             </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto relative z-10 bg-[url('https://www.transparenttextures.com/patterns/micro-carbon.png')]">
          <AnimatePresence mode="wait">
            {activeTab === 'CREATE' ? (
              <motion.div 
                key="create"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 md:p-8"
              >
                 <div className="bg-slate-900 p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl">
                    <div className="absolute right-0 top-0 w-64 h-64 bg-amber-500/10 blur-3xl rounded-full" />
                    <div className="relative z-10 space-y-2">
                      <h2 className="text-xl md:text-4xl font-black italic uppercase text-amber-500 leading-none">Create Ads</h2>
                      <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Deployment Pipeline Module</p>
                    </div>
                 </div>

                 <form onSubmit={handleCreate} className="bg-white p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 mt-6">
                   <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Campaign Title</label>
                           <input 
                              type="text" 
                              placeholder="e.g. Summer Promo"
                              value={newCampaign.title}
                              onChange={e => setNewCampaign({...newCampaign, title: e.target.value})}
                              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Campaign Description</label>
                           <textarea 
                              placeholder="Describe the campaign purpose..."
                              rows={1}
                              value={newCampaign.description}
                              onChange={e => setNewCampaign({...newCampaign, description: e.target.value})}
                              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none transition-all resize-none"
                           />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Media Type</label>
                            <div className="flex gap-2">
                               <button 
                                 type="button"
                                 onClick={() => setNewCampaign({...newCampaign, mediaType: 'IMAGE'})}
                                 className={cn(
                                   "flex-1 py-4 px-6 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                                   newCampaign.mediaType === 'IMAGE' ? "bg-slate-950 text-white border-slate-950 shadow-lg" : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
                                 )}
                               >
                                 <ImageIcon size={14} /> Image
                               </button>
                               <button 
                                 type="button"
                                 onClick={() => setNewCampaign({...newCampaign, mediaType: 'VIDEO'})}
                                 className={cn(
                                   "flex-1 py-4 px-6 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                                   newCampaign.mediaType === 'VIDEO' ? "bg-slate-950 text-white border-slate-950 shadow-lg" : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
                                 )}
                               >
                                 <Video size={14} /> Video
                               </button>
                            </div>
                         </div>
                         <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Media Payload Status</label>
                            
                            {!newCampaign.mediaUrl ? (
                              <div className="space-y-4">
                                 {/* Drag / Drop Zone & Browse */}
                                 <div 
                                   onDragOver={handleDragOver}
                                   onDragLeave={handleDragLeave}
                                   onDrop={handleDrop}
                                   onClick={() => createFileInputRef.current?.click()}
                                   className={cn(
                                      "border-2 border-dashed rounded-[2rem] p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-4 group",
                                      isDragging 
                                         ? "border-amber-500 bg-amber-500/5 scale-[1.01]" 
                                         : "border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-amber-500/40"
                                   )}
                                 >
                                    <input 
                                       type="file" 
                                       ref={createFileInputRef}
                                       className="hidden" 
                                       accept=".jpg,.jpeg,.png,.mp4,.mov"
                                       onChange={handleCreateUpload}
                                    />
                                    <div className={cn(
                                       "w-16 h-16 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                                       isUploading ? "bg-amber-500/10 text-amber-500 animate-pulse" : "bg-slate-100 text-slate-400 group-hover:bg-amber-100 group-hover:text-amber-500"
                                    )}>
                                       <Upload size={28} className={isUploading ? "animate-bounce" : ""} />
                                    </div>
                                    <div>
                                       <p className="text-xs font-black text-slate-800 uppercase tracking-wider">
                                          {isUploading ? "Uploading Desktop File..." : "Drag & Drop Media File From Desktop"}
                                       </p>
                                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5 italic">
                                          Supports JPG, PNG, WEBP, MP4, or MOV
                                       </p>
                                    </div>
                                    {!isUploading && (
                                       <button 
                                          type="button"
                                          className="px-6 py-3 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow-md mt-2"
                                       >
                                          Select File from Desktop
                                       </button>
                                    )}
                                 </div>

                                 {/* Toggle for manual URL input */}
                                 <div className="text-center">
                                    <button 
                                       type="button"
                                       onClick={() => setShowManualUrlInput(!showManualUrlInput)}
                                       className="text-[9px] font-black text-amber-500 hover:text-amber-600 uppercase tracking-wider transition-all underline"
                                    >
                                       {showManualUrlInput ? "Hide Direct Link Input" : "Or Paste Direct Media URL Link"}
                                    </button>
                                 </div>

                                 {showManualUrlInput && (
                                    <motion.div 
                                       initial={{ opacity: 0, y: -10 }}
                                       animate={{ opacity: 1, y: 0 }}
                                       className="space-y-1"
                                    >
                                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Paste Media Link</p>
                                       <input 
                                          type="url" 
                                          placeholder="https://example.com/your-ad-image.jpg"
                                          value={newCampaign.mediaUrl}
                                          onChange={e => setNewCampaign({...newCampaign, mediaUrl: e.target.value})}
                                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                                       />
                                    </motion.div>
                                 )}
                              </div>
                            ) : (
                              <div className="bg-[#0F172A] border border-white/5 rounded-[2rem] p-6 space-y-4">
                                 <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                       <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-400 border border-green-500/20">
                                          <Check size={14} />
                                       </div>
                                       <div className="min-w-0">
                                          <div className="flex items-center gap-2">
                                             <p className="text-[8px] font-black text-green-500 uppercase tracking-widest leading-none">UPLINK SUCCESSFUL</p>
                                              <span className="text-[7px] text-slate-400 bg-white/5 px-1 rounded uppercase tracking-widest font-bold">
                                                 {newCampaign.mediaType}
                                              </span>
                                          </div>
                                          <p className="text-[10px] font-mono font-black text-slate-300 tracking-wider truncate max-w-[150px] md:max-w-xs mt-1">
                                             {uploadedFileName || newCampaign.mediaUrl}
                                          </p>
                                       </div>
                                    </div>
                                    
                                    <button 
                                       type="button"
                                       onClick={() => {
                                          setNewCampaign(prev => ({ ...prev, mediaUrl: '', assetUrl: '' }));
                                          setUploadedFileName('');
                                       }}
                                       className="px-4 py-2 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/40 text-red-100 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all"
                                    >
                                       Change File
                                    </button>
                                 </div>

                                 <div className="rounded-2xl overflow-hidden border border-white/5 bg-slate-950 aspect-video relative group w-full max-w-sm mx-auto md:mx-0">
                                    {newCampaign.mediaType === 'IMAGE' ? (
                                       <img src={getSafeUrl(newCampaign.mediaUrl)} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                       <video src={getSafeUrl(newCampaign.mediaUrl)} className="w-full h-full object-cover" controls />
                                    )}
                                 </div>
                              </div>
                            )}

                            {uploadProgress > 0 && (
                              <div className="space-y-1.5">
                                 <div className="flex justify-between items-center px-1">
                                    <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">UPLINK STREAMING</span>
                                    <span className="text-[8px] font-mono font-black text-amber-500">{uploadProgress}%</span>
                                 </div>
                                 <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div 
                                       initial={{ width: 0 }}
                                       animate={{ width: `${uploadProgress}%` }}
                                       className="h-full bg-amber-500"
                                    />
                                 </div>
                              </div>
                            )}
                         </div>
                      </div>
                   </div>

                   <div className="pt-6">
                      <button 
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-6 bg-amber-500 text-slate-950 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.3em] shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 italic"
                      >
                        {isSubmitting ? 'Processing Uplink...' : 'Submit for Admin Review'}
                        <Send size={16} />
                      </button>
                   </div>
                </form>

                <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl flex items-start gap-4">
                   <Zap size={20} className="text-amber-600 shrink-0 mt-1" />
                   <p className="text-xs text-amber-900/70 font-medium leading-relaxed">
                     <span className="font-black uppercase tracking-widest text-amber-600 block mb-1">Workflow:</span>
                     Once submitted, campaigns are set to <span className="font-black">PENDING</span>. The administrator will review media guidelines and approve or reject the ad within 24 hours. Check status tab for live updates.
                   </p>
                </div>
              </motion.div>
            ) : activeTab === 'TICKETS' ? (
              <motion.div 
                key="tickets"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col"
              >
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                   {/* Conversations List */}
                   <div className={cn(
                     "w-full md:w-96 border-r border-slate-800 bg-[#020617] flex flex-col shrink-0 transition-all duration-300",
                     activeTicketId ? "hidden md:flex" : "flex"
                   )}>
                      <div className="p-6 border-b border-white/5 flex flex-col gap-4">
                         <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Active Relay Registry</h3>
                            <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-500">
                              <Radio size={16} className="animate-pulse" />
                            </div>
                         </div>
                         <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                            {(['ALL', 'DEVICE', 'CUSTOMER', 'DESIGN'] as const).map((t) => (
                              <button
                                key={t}
                                onClick={() => setFilterType(t)}
                                className={cn(
                                  "flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all",
                                  filterType === t ? "bg-amber-500 text-slate-950" : "text-slate-500 hover:text-white"
                                )}
                              >{t}</button>
                            ))}
                         </div>
                      </div>
                      <div className="flex-1 overflow-y-auto divide-y divide-white/5 custom-scrollbar pb-20 md:pb-0">
                         {tickets.filter(t => {
                           if (filterType === 'ALL') return true;
                           if (filterType === 'DESIGN') return t.category === 'Design Strategy' || t.title?.includes('Design Order');
                           return t.type === filterType;
                         }).map((ticket, i) => (
                           <div 
                             key={i} 
                             onClick={() => setActiveTicketId(ticket.id!)}
                             className={cn(
                               "p-6 cursor-pointer transition-all hover:bg-white/5 relative group",
                               activeTicketId === ticket.id ? "bg-amber-500/5 border-r-4 border-amber-500" : ""
                             )}
                           >
                              <div className="flex items-start justify-between mb-3">
                                 <div className="space-y-1 overflow-hidden">
                                    <h4 className="text-sm font-black text-white uppercase tracking-tighter truncate pr-2 group-hover:text-amber-500 transition-colors">{ticket.title || 'Inbound Signal'}</h4>
                                    <div className="flex items-center gap-2">
                                       <span className={cn(
                                         "text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                                         ticket.type === 'DEVICE' ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"
                                       )}>
                                         {ticket.type || 'UNCATEGORIZED'}
                                       </span>
                                       <span className="text-[7px] font-bold text-slate-600">UNIT: {ticket.driverName?.slice(0, 3)}***</span>
                                    </div>
                                 </div>
                                 <span className={cn(
                                   "text-[7px] font-black px-2 py-1 rounded-md uppercase tracking-tight",
                                   ticket.status === 'resolved' ? "bg-green-500/20 text-green-500" : "bg-amber-500/20 text-amber-500"
                                 )}>
                                   {ticket.status}
                                 </span>
                              </div>
                              <p className="text-[10px] text-slate-500 line-clamp-1 mb-4 font-bold border-l-2 border-slate-800 pl-3 italic">{ticket.lastMessage || ticket.description}</p>
                              <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-2 opacity-60">
                                    <div className="w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center text-[8px] font-black text-amber-500 border border-white/5">U</div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{ticket.driverName || 'External Unit'}</span>
                                 </div>
                                 <ChevronRight size={14} className="text-slate-700 group-hover:translate-x-1 transition-transform group-hover:text-amber-500" />
                              </div>
                              {ticket.unreadCount && ticket.unreadCount > 0 ? (
                                <div className="absolute top-6 right-6 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50" />
                              ) : null}
                           </div>
                         ))}
                         {tickets.length === 0 && (
                           <div className="py-20 text-center text-slate-300 px-10">
                              <AlertCircle size={32} className="mx-auto mb-4 opacity-20" />
                              <p className="text-[10px] font-black uppercase tracking-widest italic leading-relaxed">No pending requests detected in the current relay.</p>
                           </div>
                         )}
                      </div>
                   </div>

                   {/* Chat Window */}
                   <div className={cn(
                     "flex-1 flex flex-col bg-[#05070a] overflow-hidden transition-all duration-300 relative",
                     !activeTicketId ? "hidden md:flex items-center justify-center bg-[#05070a]/30" : "flex"
                   )}>
                      {activeTicketId ? (
                        <>
                           {/* Chat Header */}
                           <div className="h-16 md:h-20 border-b border-white/5 bg-[#05070a] px-4 md:px-8 flex items-center justify-between shrink-0">
                              <div className="flex items-center gap-3">
                                 <button 
                                   onClick={() => setActiveTicketId(null)}
                                   className="md:hidden p-2 text-slate-500 hover:text-amber-500"
                                 >
                                    <ChevronLeft size={20} />
                                 </button>
                                 <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-900 rounded-xl flex items-center justify-center text-amber-500 relative shrink-0">
                                    <UserIcon size={16} />
                                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#05070a]" />
                                 </div>
                                 <div className="min-w-0">
                                    <h4 className="text-xs md:text-sm font-black text-white uppercase italic leading-none truncate mb-1 pr-2">
                                      {tickets.find(t => t.id === activeTicketId)?.driverName ? "RELAY_NODE_" + tickets.find(t => t.id === activeTicketId)?.driverName.slice(0, 3) : 'Relay Node'}
                                    </h4>
                                    <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest leading-none">Encrypted Tunnel • ID MASKED</p>
                                 </div>
                              </div>
                              <div className="flex gap-2">
                                 <button 
                                   onClick={async () => {
                                      if (activeTicketId) {
                                        await firebaseService.updateSupportTicketStatus(activeTicketId, 'resolved');
                                        setActiveTicketId(null);
                                      }
                                    }}
                                   className="hidden sm:block px-4 py-2 bg-green-500 text-slate-950 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-green-500/10 hover:scale-105 active:scale-95 transition-all"
                                 >
                                   Close Query
                                 </button>
                                 <button className="md:hidden p-2 text-amber-500" onClick={async () => {
                                      if (activeTicketId) {
                                        await firebaseService.updateSupportTicketStatus(activeTicketId, 'resolved');
                                        setActiveTicketId(null);
                                      }
                                    }}>
                                    <CheckCircle size={18} />
                                 </button>
                              </div>
                           </div>

                           {/* Messages View */}
                           <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-6 relative z-10 scrollbar-hide">
                              {chatMessages.length === 0 && (
                                <div className="text-center py-20 flex flex-col items-center">
                                   <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4 animate-pulse">
                                      <Radio size={20} className="text-amber-500" />
                                   </div>
                                   <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] italic">Awaiting secure uplink...</p>
                                </div>
                              )}
                              {chatMessages.map((msg, i) => {
                                const isMe = msg.senderRole === 'staff' || msg.senderRole === 'admin';
                                return (
                                  <motion.div 
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={cn(
                                      "flex flex-col group",
                                      isMe ? "items-end" : "items-start"
                                    )}
                                  >
                                    <div className={cn(
                                      "max-w-[90%] md:max-w-[70%] p-3 md:p-5 rounded-2xl md:rounded-[1.5rem] shadow-sm relative overflow-hidden flex flex-col gap-2",
                                      isMe ? "bg-amber-500 text-slate-950 rounded-tr-none" : "bg-slate-800 text-white rounded-tl-none border border-white/5"
                                    )}>
                                      {msg.mediaUrl && (
                                        msg.mediaType === 'VIDEO' || msg.mediaUrl.split('?')[0].match(/\.(mp4|webm|ogg)$/i) ? (
                                          <video src={getSafeUrl(msg.mediaUrl)} controls className="max-w-[200px] md:max-w-[300px] rounded-xl" />
                                        ) : (
                                          <img src={getSafeUrl(msg.mediaUrl)} alt="Attachment" className="max-w-[200px] md:max-w-[300px] rounded-xl object-contain" />
                                        )
                                      )}
                                      <p className="text-[11px] md:text-sm font-bold leading-relaxed">{msg.text || msg.content}</p>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1.5 px-1 opacity-60">
                                       <span className="text-[7px] md:text-[8px] font-black text-slate-500 uppercase tracking-widest">{isMe ? 'System Agent' : (msg.senderName || 'Unit')}</span>
                                       <span className="text-[7px] md:text-[8px] font-black text-slate-700 italic">
                                         {msg.timestamp?.toDate ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Transit'}
                                       </span>
                                    </div>
                                  </motion.div>
                                );
                              })}
                           </div>

                           {/* Input Area */}
                           <div className="p-4 md:p-6 bg-[#05070a] border-t border-white/5 relative z-10">
                              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-2 pl-4 pr-2 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all">
                                 <label className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white cursor-pointer transition-all relative">
                                    {isUploading ? (
                                       <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/5 rounded-xl">
                                         <Loader2 size={12} className="animate-spin text-amber-500 mb-1" />
                                         <span className="text-[6px] font-black text-amber-500">{uploadProgress}%</span>
                                       </div>
                                    ) : (
                                       <Paperclip size={18} />
                                    )}
                                    <input 
                                      type="file" 
                                      className="hidden" 
                                      accept="image/*,video/mp4,video/webm"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file || !activeTicketId) return;
                                        setIsUploading(true);
                                        try {
                                          let mediaUrl = "";
                                          const isVideo = file.type.startsWith('video');
                                          
                                          mediaUrl = await storageService.uploadFile(file, (p) => {
                                            setUploadProgress(p.progress || 0);
                                          });
                                          
                                          await firebaseService.sendChatMessage(activeTicketId, {
                                            senderId: 'SUPPORT_AGENT',
                                            senderName: 'System Agent',
                                            senderRole: 'staff',
                                            text: "Sent an attachment",
                                            mediaUrl,
                                            mediaType: isVideo ? 'VIDEO' : 'IMAGE'
                                          });
                                        } catch (err) {
                                          console.error("Attachment upload error:", err);
                                          showToast("Failed to upload attachment.", "error");
                                        } finally {
                                          setIsUploading(false);
                                          e.target.value = '';
                                        }
                                      }}
                                      disabled={isUploading}
                                    />
                                 </label>
                                 <input 
                                   type="text" 
                                   placeholder="Type directive..." 
                                   value={newMessage}
                                   onChange={e => setNewMessage(e.target.value)}
                                   onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                   className="flex-1 bg-transparent border-none outline-none text-xs md:text-sm font-bold text-white placeholder:text-slate-600 pl-2"
                                 />
                                 <button 
                                   onClick={handleSendMessage}
                                   className="w-10 h-10 bg-amber-500 text-slate-950 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all shrink-0"
                                 >
                                    <Send size={16} />
                                 </button>
                              </div>
                           </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-6 text-center max-w-sm px-6">
                           <div className="relative">
                              <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center border border-white/10 shadow-inner">
                                 <MessageSquare size={32} className="text-slate-700" strokeWidth={1} />
                              </div>
                              <div className="absolute -inset-4 bg-amber-500/5 blur-3xl rounded-full -z-10" />
                           </div>
                           <div className="space-y-2">
                              <h4 className="text-[10px] font-black text-white uppercase tracking-[0.3em] italic">Relay Stack Empty</h4>
                              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest leading-relaxed">Select a transmission from the registry to initialize full-duplex communication.</p>
                           </div>
                        </div>
                      )}
                   </div>
                </div>
              </motion.div>
            ) : activeTab === 'NOTICES' ? (
              <motion.div 
                key="notices"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-4xl mx-auto space-y-8 p-4 md:p-10"
              >
                 <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex items-center justify-between">
                    <div>
                       <h2 className="text-2xl font-black italic uppercase text-amber-500">Offer Hub</h2>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Customer Engagement Broadcast</p>
                    </div>
                    <Gift className="text-amber-500" size={32} />
                 </div>

                 <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                    <h3 className="text-sm font-black uppercase italic tracking-widest text-slate-900 border-b border-slate-50 pb-4">Broadcast Signal</h3>
                    <form onSubmit={handleCreateNotice} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Headline</label>
                          <input 
                            type="text" 
                            placeholder="e.g. REBATE OFFER 2024"
                            value={newNotice.offer}
                            onChange={e => setNewNotice({...newNotice, offer: e.target.value.toUpperCase()})}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Area</label>
                          <input 
                            type="text" 
                            placeholder="PAN-INDIA"
                            value={newNotice.targetRegion}
                            onChange={e => setNewNotice({...newNotice, targetRegion: e.target.value.toUpperCase()})}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                          />
                       </div>
                       <div className="md:col-span-2 space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Engagement Msg</label>
                          <textarea 
                            rows={2}
                            placeholder="Get up to 50% extra screen time..."
                            value={newNotice.message}
                            onChange={e => setNewNotice({...newNotice, message: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                          />
                       </div>
                    <div className="md:col-span-2 space-y-4">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Offer Visual (Flex/Poster)</label>
                       
                       <div className="flex flex-col md:flex-row gap-4">
                          <div className="flex-1 space-y-2">
                             <input 
                               type="text" 
                               placeholder="https://... (Direct Image URL)"
                               value={newNotice.imageUrl}
                               onChange={e => setNewNotice({...newNotice, imageUrl: e.target.value})}
                               className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                             />
                          </div>
                          
                          <div className="flex items-center">
                             <span className="text-[8px] font-black text-slate-300 uppercase px-2">OR</span>
                             <input 
                               type="file" 
                               ref={noticesFileInputRef}
                               className="hidden" 
                               accept="image/*" 
                               onChange={handleFileUpload} 
                             />
                             <button 
                               type="button"
                               onClick={() => noticesFileInputRef.current?.click()}
                               disabled={isUploading}
                               className={cn(
                                 "cursor-pointer flex flex-col items-center justify-center px-6 py-4 bg-amber-500 text-slate-950 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-amber-600 transition-all border-2 border-transparent relative",
                                 isUploading && "opacity-50 cursor-not-allowed"
                               )}
                             >
                                <div className="flex items-center gap-2">
                                   <Download size={16} className={cn("rotate-180", isUploading && "animate-bounce")} />
                                   {isUploading ? "Uploading..." : "Upload File"}
                                </div>
                             </button>
                          </div>
                       </div>

                       {uploadProgress > 0 && activeTab === 'NOTICES' && (
                         <div className="w-full h-1 bg-slate-100 rounded-full mt-2 mb-4 overflow-hidden">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${uploadProgress}%` }}
                             className="h-full bg-amber-500"
                           />
                         </div>
                       )}

                       {newNotice.imageUrl && (
                         <div className="mt-2 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 aspect-video relative group max-w-sm">
                            <img src={newNotice.imageUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <button 
                              type="button"
                              onClick={() => setNewNotice(prev => ({ ...prev, imageUrl: '' }))}
                              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                               <X size={12} />
                            </button>
                         </div>
                       )}
                    </div>
                       <div className="md:col-span-2 flex justify-end">
                          <button className="px-8 py-4 bg-slate-950 text-amber-500 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all">
                             Publish Broadcast
                          </button>
                       </div>
                    </form>
                 </div>

                 <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic ml-2">Active Signals ({notices.length})</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {notices.map((notice) => (
                         <div key={notice.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative group overflow-hidden">
                            <div className="flex justify-between items-start relative z-10">
                               <div className="space-y-1">
                                  <span className="text-[8px] font-black px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded uppercase tracking-widest">{notice.targetRegion || 'ALL'}</span>
                                  <h4 className="text-base font-black italic uppercase text-slate-900">{notice.offer}</h4>
                               </div>
                               <button onClick={() => handleDeleteNotice(notice.id)} className="p-2 text-slate-200 hover:text-red-500 transition-colors">
                                  <Trash2 size={16} />
                                </button>
                            </div>
                            {notice.imageUrl && (
                               <div className="mt-4 rounded-xl overflow-hidden border border-slate-50 aspect-video relative z-10">
                                  <img src={notice.imageUrl} alt={notice.offer} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                               </div>
                            )}
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-4 relative z-10 leading-relaxed">{notice.message}</p>
                            <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-slate-50 rounded-full text-slate-100 flex items-center justify-center -rotate-12 group-hover:scale-150 transition-transform">
                               <Gift size={32} />
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
              </motion.div>
            ) : activeTab === 'TERMINAL_HUB' ? (
              <motion.div 
                key="terminal_hub"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-8 pb-20 p-4 md:p-10"
              >
                {/* Header Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Active Campaigns', value: campaigns.filter(c => c.status === 'ACTIVE').length, sub: 'Live Now', icon: Monitor },
                    { label: 'Cloud Units Ready', value: drivers.filter(d => d.status === 'active').length, sub: 'Approved Fleet', icon: ShieldCheck },
                    { label: 'Total Revenue', value: `₹${totalSuccessfulRevenue.toLocaleString()}`, sub: 'Cumulative', icon: IndianRupee },
                    { label: 'Online Now', value: liveUnitsCount, sub: 'Real-time Pulse', icon: Activity }
                  ].map((stat, i) => (
                    <div key={i} className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
                      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
                        <stat.icon className="text-amber-500" size={100} />
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 mb-6">
                          <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
                            <stat.icon className="text-amber-500" size={16} />
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
                        </div>
                        <h4 className="text-4xl font-black text-white tracking-tight">{stat.value}</h4>
                        <p className="text-[10px] font-black text-amber-500/60 uppercase tracking-widest mt-2">{stat.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Terminal Management Section */}
                <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl space-y-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h2 className="text-3xl font-black italic uppercase text-slate-900 leading-tight">Terminal Hub</h2>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Global Device Activation & Monitoring</p>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                      <div className="relative flex-1 md:flex-initial">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                          type="text" 
                          placeholder="SEARCH TERMINAL ID..." 
                          className="w-full md:w-64 pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-amber-500/20"
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <button className="p-4 bg-slate-900 text-amber-500 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all">
                        <RefreshCw size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {drivers.filter(d => (d.terminalId || '').toUpperCase().includes(searchTerm.toUpperCase())).map((d, i) => {
                      const status = liveStatus.find(s => s.terminalId === d.terminalId);
                      const isOnline = status && (Date.now() - (status.updatedAt?.toMillis?.() || 0) < 60000);
                      
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8 space-y-6 relative group overflow-hidden"
                        >
                          <div className="absolute top-6 right-6 flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-slate-100 shadow-sm">
                            <div className={cn("w-1.5 h-1.5 rounded-full", isOnline ? "bg-green-500 animate-pulse" : "bg-slate-300")} />
                            <span className="text-[8px] font-black uppercase text-slate-500">
                              {isOnline ? "OPERATIONAL" : "DISCONNECTED"}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Hardware Instance</p>
                            <h4 className="text-xl font-black text-slate-900 font-mono tracking-normal">{d.terminalId || "UNASSIGNED"}</h4>
                          </div>

                          {/* Live Screen Preview */}
                          {status?.currentAdImage && (
                            <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner group/screen">
                              <img 
                                src={status.currentAdImage} 
                                className="w-full h-full object-cover transition-transform duration-500 group-hover/screen:scale-110" 
                                alt="Live Display"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/screen:opacity-100 transition-opacity flex items-end p-3">
                                <p className="text-[8px] font-black text-white uppercase tracking-widest">LIVE SCREEN MIRROR</p>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Access Key</p>
                              <p className="text-lg font-black text-amber-600 font-mono tracking-[0.2em]">{d.accessKey || "------"}</p>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                              <p className="text-[10px] font-black text-slate-900 uppercase">
                                {d.provisionStatus || 'IDLE'}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-slate-200/50">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Driver</span>
                              <span className="text-[10px] font-black text-slate-900 uppercase italic">{d.name}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-200/50">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vehicle</span>
                              <span className="text-[10px] font-black text-slate-900 uppercase italic">{d.vNo || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-200/50">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Campaign</span>
                              <span className="text-[10px] font-black text-amber-600 uppercase italic">
                                {campaigns.find(c => c.assignedDrivers?.includes(d.uid))?.title || 'No Active Ads'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Last Sync</span>
                              <span className="text-[9px] font-black text-slate-500 uppercase">
                                {status?.updatedAt ? new Date(status.updatedAt.toMillis()).toLocaleString() : 'Never'}
                              </span>
                            </div>
                          </div>

                          <div className="pt-4 flex gap-2">
                            <button 
                              onClick={() => {
                                window.open(`/device-portal?terminalId=${d.terminalId}&accessKey=${d.accessKey}`, '_blank');
                              }}
                              className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl font-sans"
                            >
                              Open Portal
                            </button>
                            <button 
                              onClick={() => {
                                setSelectedDriverForDocs(d);
                                setShowDocModal(true);
                              }}
                              className="p-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all text-[8px] font-black uppercase"
                            >
                              Docs
                            </button>
                            <button 
                              onClick={() => {
                                if(window.confirm(`Revoke access for Terminal ${d.terminalId}?`)) {
                                  firebaseService.revokeTerminal(d.terminalId!, d.uid)
                                    .then(() => showToast("Terminal credentials revoked.", 'success'))
                                    .catch(e => showToast(e.message, 'error'));
                                }
                              }}
                              className="p-4 border border-slate-200 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'LEGAL' ? (
              <motion.div 
                key="legal"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-8 pb-20 max-w-6xl mx-auto w-full p-4 md:p-10"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-black italic uppercase text-slate-900 leading-none">Compliance Hub</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Legal, Privacy & Policy Management</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  <div className="lg:col-span-1 space-y-2">
                    {[
                      { id: 'ABOUT', label: 'About Network', icon: Info },
                      { id: 'PRIVACY', label: 'Privacy Policy', icon: Shield },
                      { id: 'TERMS', label: 'Terms of Use', icon: FileText },
                      { id: 'REFUND', label: 'Refund Policy', icon: RefreshCw },
                      { id: 'CONTACT', label: 'Support Nodes', icon: MessageSquare }
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setLegalPage(item.id as CompliancePage)}
                        className={cn(
                          "w-full p-6 rounded-3xl border transition-all flex items-center gap-4 group text-left",
                          legalPage === item.id 
                            ? "bg-slate-900 border-slate-900 text-amber-500 shadow-xl" 
                            : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                        )}
                      >
                        <item.icon size={20} />
                        <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="lg:col-span-3 bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden min-h-[600px] flex flex-col">
                     <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 group-hover:text-amber-500">
                          <Shield size={16} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Compliance Viewer State: LOADED</span>
                     </div>
                     <div className="flex-1 overflow-y-auto">
                        <ComplianceContent page={legalPage} isEmbed />
                     </div>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'PLANS' ? (
              <motion.div 
                key="plans"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-12 pb-24 max-w-6xl mx-auto w-full p-4 md:p-8"
              >
                {/* Header card */}
                <div className="bg-slate-900 md:p-12 p-8 rounded-[3rem] text-white relative overflow-hidden shadow-2xl border border-slate-800">
                  <div className="absolute right-0 top-0 w-64 h-64 bg-amber-500/10 blur-3xl rounded-full" />
                  <div className="relative z-10">
                    <h2 className="text-3xl md:text-5xl font-black italic uppercase text-amber-500 leading-none">System Rate & Plan Management</h2>
                    <p className="text-[10px] md:text-[12px] font-black text-slate-400 uppercase tracking-widest mt-4">Direct Live Database Editing (Full Access Override)</p>
                  </div>
                </div>

                {/* Main section tabs */}
                <div className="space-y-10">
                  
                  {/* Campaign Plans Panel */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black text-xs">C</div>
                      <h3 className="text-lg md:text-2xl font-black italic text-white uppercase leading-none">Driver Ad Campaign Plans</h3>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:gap-8">
                      {plans.map((plan, i) => (
                        <motion.div
                          key={`cplan-${plan.id}-${i}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-6 relative group"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-slate-950 rounded-xl flex items-center justify-center text-amber-500 shadow-md">
                              <Zap size={15} />
                            </div>
                            <h4 className="text-lg md:text-2xl font-black text-slate-900 uppercase italic leading-none">{plan.name}</h4>
                            <span className="ml-auto text-[9px] font-black uppercase text-amber-605 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">Campaign Tier</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                            {/* BASE PLAN COL */}
                            <div className="space-y-4">
                              <h5 className="text-[10px] font-black text-amber-600 uppercase tracking-widest border-b border-slate-50 pb-1">1. Base Plan Rate & Description</h5>
                              
                              <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Base Rate (₹)</label>
                                <input 
                                  type="number" 
                                  defaultValue={plan.price}
                                  id={`support-plan-price-${plan.id}`}
                                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-850 outline-none transition-all focus:ring-4 focus:ring-slate-900/5"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Base Description</label>
                                <input 
                                  type="text" 
                                  defaultValue={plan.description || ''}
                                  id={`support-plan-desc-${plan.id}`}
                                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 outline-none transition-all focus:ring-4 focus:ring-slate-900/5"
                                />
                              </div>
                            </div>

                            {/* DESIGNER / MOTION CREATOR COL */}
                            <div className="space-y-4 border-t md:border-t-0 md:border-l md:pl-6 border-slate-150">
                              <h5 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest border-b border-slate-50 pb-1">2. Designer & Animator Pricing</h5>
                              
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Designer Fee (₹)</label>
                                  <input 
                                    type="number" 
                                    defaultValue={plan.designerPrice || 0}
                                    id={`support-plan-designer-price-${plan.id}`}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-850 outline-none transition-all focus:ring-4 focus:ring-indigo-900/5"
                                  />
                                </div>

                                <div className="space-y-1.5">
                                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Video Maker Fee (₹)</label>
                                  <input 
                                    type="number" 
                                    defaultValue={plan.videoMakerPrice || 0}
                                    id={`support-plan-video-price-${plan.id}`}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-850 outline-none transition-all focus:ring-4 focus:ring-indigo-900/5"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Designer Plan Description</label>
                                <input 
                                  type="text" 
                                  defaultValue={plan.designerDescription || 'Standard custom layouts designed by certified creative professionals'}
                                  id={`support-plan-designer-desc-${plan.id}`}
                                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs text-slate-700 outline-none transition-all focus:ring-4 focus:ring-indigo-900/5"
                                  placeholder="Scope for custom design assignments"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Video Maker Plan Description</label>
                                <input 
                                  type="text" 
                                  defaultValue={plan.videoMakerDescription || 'Professional motion graphics and stunning rich animated campaign elements'}
                                  id={`support-plan-video-desc-${plan.id}`}
                                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs text-slate-700 outline-none transition-all focus:ring-4 focus:ring-indigo-900/5"
                                  placeholder="Scope for motion graphic creators"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4 flex-wrap">
                            <p className="text-[8px] font-black text-slate-450 uppercase tracking-widest italic">Sync ID: campaign_plans/{plan.id}</p>
                            <button 
                              onClick={async () => {
                                const valPrice = parseFloat((document.getElementById(`support-plan-price-${plan.id}`) as HTMLInputElement)?.value);
                                const valDesc = (document.getElementById(`support-plan-desc-${plan.id}`) as HTMLInputElement)?.value;
                                const valDesignerPrice = parseFloat((document.getElementById(`support-plan-designer-price-${plan.id}`) as HTMLInputElement)?.value);
                                const valDesignerDesc = (document.getElementById(`support-plan-designer-desc-${plan.id}`) as HTMLInputElement)?.value;
                                const valVideoPrice = parseFloat((document.getElementById(`support-plan-video-price-${plan.id}`) as HTMLInputElement)?.value);
                                const valVideoDesc = (document.getElementById(`support-plan-video-desc-${plan.id}`) as HTMLInputElement)?.value;

                                if (isNaN(valPrice) || isNaN(valDesignerPrice) || isNaN(valVideoPrice)) {
                                  showToast("Please provide valid rates.", "error");
                                  return;
                                }

                                setIsUpdatingPlan(plan.id);
                                try {
                                  await firebaseService.updatePlan(plan.id, {
                                    price: valPrice,
                                    description: valDesc,
                                    designerPrice: valDesignerPrice,
                                    designerDescription: valDesignerDesc,
                                    videoMakerPrice: valVideoPrice,
                                    videoMakerDescription: valVideoDesc
                                  });
                                  showToast(`${plan.name} updated successfully!`, 'success');
                                  const updated = await firebaseService.getPlans();
                                  setPlans(updated);
                                } catch(e) { 
                                  showToast("Updates Sync Failed", 'error'); 
                                } finally { 
                                  setIsUpdatingPlan(null); 
                                }
                              }}
                              disabled={isUpdatingPlan === plan.id}
                              className="px-6 py-3 bg-slate-905 bg-slate-950 hover:bg-slate-800 text-amber-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-lg"
                            >
                              {isUpdatingPlan === plan.id ? <Loader2 size={12} className="animate-spin text-amber-500" /> : <ShieldCheck size={12} />}
                              <span>Save Campaign & Designer Plan</span>
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Canva Studio Subscription Plans Panel */}
                  <div className="space-y-6 pt-6 animate-in fade-in duration-350">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                      <div className="w-8 h-8 rounded-lg bg-[#6366f1] flex items-center justify-center text-white font-black text-xs">P</div>
                      <h3 className="text-lg md:text-2xl font-black italic text-white uppercase leading-none">Canva Studio Subscription Tiers</h3>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:gap-8">
                      {(studioPlans.length > 0 ? studioPlans : [
                        { id: 'FREE', name: 'Free Viewer', price: '₹0', description: 'Read-only mode. Cannot save or export.' },
                        { id: 'BRASS', name: 'Single Star Brass', price: '₹99', description: '2 to 3 poster edits, basic templates, PNG export, watermark.' },
                        { id: 'SILVER', name: 'Five Star Silver', price: '₹299', description: 'Unlimited edits, standard templates, SVG/JPG export, video editing.' },
                        { id: 'GOLD', name: 'Seven Star Gold', price: '₹499', description: 'Full access, AI tools, premium templates, high-res exports, no watermark.' }
                      ]).map((sp, i) => (
                        <motion.div
                          key={`splan-${sp.id}-${i}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="bg-slate-900 p-6 md:p-10 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-6 relative group text-slate-350"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-indigo-500/15 border border-indigo-500/30 rounded-xl flex items-center justify-center text-indigo-400 shadow-md">
                              <Crown size={15} />
                            </div>
                            <h4 className="text-lg md:text-2xl font-black text-white uppercase italic leading-none">{sp.name || sp.id}</h4>
                            <span className="ml-auto text-[9px] font-black uppercase text-indigo-400 bg-indigo-950 px-2.5 py-1 rounded-full border border-indigo-900">Studio Tier</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                            {/* STUDIO PRICE */}
                            <div className="space-y-4">
                              <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Studio Plan Name</label>
                                <input 
                                  type="text" 
                                  defaultValue={sp.name}
                                  id={`support-studio-name-${sp.id}`}
                                  className="w-full bg-[#121824] border border-white/5 text-white rounded-xl px-4 py-2.5 text-xs font-bold outline-none transition-all focus:ring-4 focus:ring-indigo-500/10"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Studio Plan Price Label (e.g. ₹99 or ₹99/month)</label>
                                <input 
                                  type="text" 
                                  defaultValue={sp.price}
                                  id={`support-studio-price-${sp.id}`}
                                  className="w-full bg-[#121824] border border-white/5 text-white rounded-xl px-4 py-2.5 text-xs font-black italic outline-none transition-all focus:ring-4 focus:ring-indigo-500/10"
                                />
                              </div>
                            </div>

                            {/* STUDIO DESCRIPTION */}
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Studio Plan Features (Comma-separated features list)</label>
                              <textarea 
                                defaultValue={sp.description || (sp.features ? sp.features.join(', ') : '')}
                                id={`support-studio-desc-${sp.id}`}
                                rows={4}
                                className="w-full bg-[#121824] border border-white/5 text-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium outline-none transition-all focus:ring-4 focus:ring-indigo-500/10"
                                placeholder="Feature 1, Feature 2, Feature 3..."
                              />
                            </div>
                          </div>

                          <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-4 flex-wrap">
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic">Sync ID: studio_plans/{sp.id}</p>
                            <button 
                              onClick={async () => {
                                const nameVal = (document.getElementById(`support-studio-name-${sp.id}`) as HTMLInputElement)?.value;
                                const priceVal = (document.getElementById(`support-studio-price-${sp.id}`) as HTMLInputElement)?.value;
                                const descVal = (document.getElementById(`support-studio-desc-${sp.id}`) as HTMLTextAreaElement)?.value;

                                if (!nameVal || !priceVal) {
                                  showToast("Please provide valid Name and Price.", "error");
                                  return;
                                }

                                setIsUpdatingPlan(sp.id);
                                try {
                                  await firebaseService.updateStudioPlan(sp.id, {
                                    name: nameVal,
                                    price: priceVal,
                                    description: descVal
                                  });
                                  showToast(`${sp.id} Studio Subscription updated successfully!`, 'success');
                                  const updatedS = await firebaseService.getStudioPlans();
                                  setStudioPlans(updatedS);
                                } catch(e) { 
                                  showToast("Updates Sync Failed", 'error'); 
                                } finally { 
                                  setIsUpdatingPlan(null); 
                                }
                              }}
                              disabled={isUpdatingPlan === sp.id}
                              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-lg"
                            >
                              {isUpdatingPlan === sp.id ? <Loader2 size={12} className="animate-spin text-white" /> : <ShieldCheck size={12} />}
                              <span>Save Studio Plan Tier</span>
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                </div>
            </motion.div>
          ) : activeTab === 'STATUS' ? (
              <motion.div 
                key="status"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full overflow-y-auto p-4 md:p-10"
              >
                <div className="space-y-8 max-w-7xl mx-auto pb-12">
                   
                   {/* Combined Support Header & Sub-Tabs Switcher */}
                   <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-6 bg-white/5 p-6 rounded-[2rem] border border-white/5 backdrop-blur-md">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
                            <Activity size={24} />
                         </div>
                         <div>
                            <h3 className="text-sm md:text-lg font-black text-white uppercase tracking-[0.2em] leading-none mb-1">
                              System <span className="text-amber-500 italic">Moderation Desk</span>
                            </h3>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                              Role: {userProfile?.role || 'SUPPORT_MANAGER'} — Central Regional Operations Manager
                            </p>
                         </div>
                      </div>

                      {/* Sub-Tabs Grid */}
                      <div className="p-1 bg-white/5 rounded-2xl flex flex-wrap gap-1 border border-white/10 shrink-0">
                         {[
                           { id: 'CAMPAIGNS', label: 'Ad Moderation' },
                           { id: 'KYC', label: 'Driver KYC Bureau' },
                           { id: 'TERMINALS', label: 'Terminal pairing' },
                           { id: 'FRAUD', label: 'Fraud Alerts' }
                         ].map((tabOpt) => (
                           <button 
                             key={tabOpt.id}
                             type="button"
                             onClick={() => setSubTab(tabOpt.id as any)}
                             className={`px-4.5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                               subTab === tabOpt.id 
                                 ? 'bg-amber-500 text-slate-950 font-black shadow-md scale-105' 
                                 : 'text-slate-400 hover:text-white hover:bg-white/5'
                             }`}
                           >
                             {tabOpt.label}
                           </button>
                         ))}
                      </div>
                   </div>

                   {/* Sub-tab CAMPAIGNS: Ad Content Moderation Queue */}
                   {subTab === 'CAMPAIGNS' && (
                     <div className="space-y-6">
                       <div className="bg-slate-900/40 p-5 rounded-2.5xl border border-white/5">
                         <h4 className="text-xs font-black uppercase text-white tracking-widest mb-1">Local Ad Campaigns Compliance Review</h4>
                         <p className="text-[10px] text-slate-400 leading-relaxed">
                           Review local campaign content, set category classification tags, and verify safe content attributes before pushing targeted campaigns live to city routes.
                         </p>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                         {campaigns.length > 0 ? campaigns.map((campaign, i) => (
                           <div key={i} className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all group flex flex-col h-full">
                              <div className="h-48 bg-slate-950 relative overflow-hidden shrink-0">
                                 {campaign.mediaUrl ? (
                                   campaign.mediaType === 'VIDEO' ? (
                                     <video src={getSafeUrl(campaign.mediaUrl)} className="w-full h-full object-cover" muted autoPlay loop />
                                   ) : (
                                     <img src={getSafeUrl(campaign.mediaUrl)} alt={campaign.title} className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-all duration-700" referrerPolicy="no-referrer" />
                                   )
                                 ) : (
                                   <div className="w-full h-full flex items-center justify-center bg-slate-900">
                                     <Video className="text-slate-700 w-12 h-12" />
                                   </div>
                                 )}
                                 <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                                 <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                                    <span className={`text-[8px] font-black px-3 py-1.5 rounded-lg border uppercase tracking-widest shadow-2xl ${
                                      campaign.status === 'APPROVED' || campaign.status === 'LIVE' ? "bg-green-500 text-white border-green-400" :
                                      campaign.status === 'REJECTED' ? "bg-red-500 text-white border-red-400" :
                                      "bg-amber-500 text-slate-950 border-amber-400"
                                    }`}>
                                      {campaign.status}
                                    </span>
                                    <span className="p-1.5 bg-white/10 backdrop-blur-md rounded-lg text-white border border-white/20">
                                      {campaign.mediaType === 'IMAGE' ? <ImageIcon size={12} /> : <Video size={12} />}
                                    </span>
                                 </div>
                              </div>

                              {/* Moderation Controls card body */}
                              <div className="p-6 flex flex-col flex-1 gap-4 text-xs font-sans">
                                 <div className="flex-1 space-y-1">
                                    <h4 className="text-sm font-black text-slate-900 uppercase leading-tight truncate">{campaign.title || 'Regional Ad campaign'}</h4>
                                    <p className="text-[9.5px] text-slate-500 line-clamp-2 leading-relaxed">{campaign.description || 'No campaign description entered.'}</p>
                                 </div>

                                 {/* Interactive Scoping Selection and Moderation inputs */}
                                 {(campaign.status === 'PENDING' || campaign.status === 'PENDING_VERIFICATION') && (
                                   <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                                     <span className="text-[8.5px] font-black text-slate-500 tracking-wider uppercase">Compliance Parameters</span>
                                     
                                     <div className="space-y-2">
                                       <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Category Tags (comma sep)</label>
                                       <input 
                                         type="text" 
                                         placeholder="e.g. food, discount, auto"
                                         value={modTags}
                                         onChange={e => setModTags(e.target.value)}
                                         className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider text-slate-800"
                                       />
                                     </div>

                                     <div className="grid grid-cols-2 gap-3">
                                       <div className="space-y-1">
                                         <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Scope City</label>
                                         <select 
                                           value={selectedCityId}
                                           onChange={e => {
                                             setSelectedCityId(e.target.value);
                                             const relatedFr = INITIAL_FRANCHISES.find(f => f.cityId === e.target.value);
                                             if (relatedFr) setSelectedFranchiseId(relatedFr.id);
                                           }}
                                           className="w-full bg-white border border-slate-200 px-2 py-1 rounded-lg text-[9px] font-black uppercase text-slate-700"
                                         >
                                           {INITIAL_CITIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                         </select>
                                       </div>
                                       <div className="space-y-1">
                                         <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Franchise Key</label>
                                         <select 
                                           value={selectedFranchiseId}
                                           onChange={e => setSelectedFranchiseId(e.target.value)}
                                           className="w-full bg-white border border-slate-200 px-2 py-1 rounded-lg text-[9px] font-black uppercase text-slate-700"
                                         >
                                           {INITIAL_FRANCHISES.filter(f => f.cityId === selectedCityId).map(f => (
                                             <option key={f.id} value={f.id}>{f.cityName} ({f.id})</option>
                                           ))}
                                         </select>
                                       </div>
                                     </div>

                                     <div className="flex gap-4 items-center pt-1.5 border-t border-slate-100">
                                       <label className="flex items-center gap-1.5 cursor-pointer">
                                         <input type="checkbox" checked={modSafeContent} onChange={e => setModSafeContent(e.target.checked)} className="rounded text-amber-500 w-3 h-3" />
                                         <span className="text-[8px] font-black text-slate-600 uppercase">SAFE CONTENT</span>
                                       </label>
                                       <label className="flex items-center gap-1.5 cursor-pointer">
                                         <input type="checkbox" checked={modKidsSafe} onChange={e => setModKidsSafe(e.target.checked)} className="rounded text-amber-500 w-3 h-3" />
                                         <span className="text-[8px] font-black text-slate-600 uppercase">KIDS SAFE</span>
                                       </label>
                                     </div>
                                   </div>
                                 )}

                                 <div className="pt-2 border-t border-slate-50 flex items-center justify-between gap-2.5">
                                    <span className="text-[8.5px] font-bold text-slate-400 font-mono">
                                      {(campaign as any).cityId ? `Zone: ${getCityName((campaign as any).cityId)}` : 'Global Target'}
                                    </span>

                                    <div className="flex items-center gap-1.5">
                                      {(campaign.status === 'PENDING' || campaign.status === 'PENDING_VERIFICATION') ? (
                                        <>
                                          <button 
                                            type="button"
                                            onClick={async () => {
                                              if (window.confirm("Reject this advertisement camp?")) {
                                                await firebaseService.adminRejectCampaign(campaign.id!);
                                                showToast("Advertisement campaign rejected.", 'error');
                                              }
                                            }}
                                            className="px-3.5 py-2 hover:bg-rose-50 border border-slate-200 text-rose-600 font-extrabold uppercase rounded-xl text-[9px] tracking-wider transition-all cursor-pointer"
                                          >
                                            Reject
                                          </button>
                                          <button 
                                            type="button"
                                            onClick={async () => {
                                              const tagList = modTags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
                                              try {
                                                await approveCampaignWithMetadata(
                                                  campaign.id!, 
                                                  selectedCityId, 
                                                  selectedFranchiseId, 
                                                  tagList, 
                                                  modSafeContent, 
                                                  modKidsSafe
                                                );
                                                showToast("Campaign approved, classified, and mapped to city with full compliance!", 'success');
                                              } catch (err: any) {
                                                showToast(err.message, 'error');
                                              }
                                            }}
                                            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase rounded-xl text-[9px] tracking-wider shadow-md transition-all cursor-pointer"
                                          >
                                            Moderate Live
                                          </button>
                                        </>
                                      ) : (
                                        <span className="text-[8.5px] font-extrabold text-emerald-600 uppercase tracking-widest block bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded">Verified Live</span>
                                      )}
                                    </div>
                                 </div>
                              </div>
                           </div>
                         )) : (
                           <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-300 gap-4">
                              <Zap size={48} strokeWidth={1} className="opacity-20" />
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] italic">No active deployments detected currently.</p>
                           </div>
                         )}
                       </div>
                     </div>
                   )}

                   {/* Sub-tab KYC: Driver KYC & Approvals Bureau */}
                   {subTab === 'KYC' && (
                     <div className="space-y-6">
                       <div className="bg-slate-900/40 p-5 rounded-2.5xl border border-white/5">
                         <h4 className="text-xs font-black uppercase text-white tracking-widest mb-1">Driver Verification and Franchise Assignment bureau</h4>
                         <p className="text-[10px] text-slate-400 leading-relaxed">
                           Review driver registrations, inspect uploaded KYC identification papers (Aadhaar, DL, Selfie), choose the target city scope, and approve them onto active local franchises.
                         </p>
                       </div>

                       <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
                         <div className="overflow-x-auto">
                           <table className="w-full text-left font-sans">
                             <thead>
                               <tr className="bg-slate-50 border-b border-slate-100 text-[8.5px] font-black uppercase tracking-widest text-slate-400">
                                 <th className="px-6 py-4">Driver Profile</th>
                                 <th className="px-6 py-4">Status & Action</th>
                                 <th className="px-6 py-4">Verification Scope (City & Franchise Mapping)</th>
                                 <th className="px-6 py-4">Uploaded Credentials</th>
                               </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                               {drivers.length === 0 ? (
                                 <tr>
                                   <td colSpan={4} className="text-center py-10 text-slate-400 font-bold uppercase tracking-wider">
                                     No drivers registered currently.
                                   </td>
                                 </tr>
                               ) : (
                                 drivers.map((drv: any) => (
                                   <tr key={drv.id || drv.uid} className="hover:bg-slate-50/50 transition-colors">
                                     <td className="px-6 py-5">
                                       <div>
                                         <p className="font-extrabold text-slate-900 leading-none">{drv.name}</p>
                                         <p className="text-[9px] text-slate-400 mt-1 font-semibold">{drv.email} | {drv.phone || 'No phone'}</p>
                                         <p className="text-[8px] text-slate-400 font-mono mt-0.5">UID: {drv.id || drv.uid}</p>
                                       </div>
                                     </td>
                                     <td className="px-6 py-5">
                                       <div className="space-y-2">
                                         <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-widest border ${
                                           drv.kycStatus === 'APPROVED' || drv.status === 'ACTIVE' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                                           drv.kycStatus === 'REJECTED' ? 'bg-rose-5 border-rose-100 text-rose-600' :
                                           'bg-amber-50 border-amber-100 text-amber-600 animate-pulse'
                                         }`}>
                                           ● {drv.kycStatus || 'PENDING'}
                                         </span>
                                         
                                         {drv.kycStatus !== 'APPROVED' && drv.status !== 'ACTIVE' && (
                                           <div className="pt-1.5">
                                              <button
                                                type="button"
                                                onClick={async () => {
                                                  try {
                                                    await approveDriverProfile(
                                                      drv.id || drv.uid, 
                                                      selectedCityId, 
                                                      selectedFranchiseId,
                                                      userProfile?.role || 'SUPPORT_MANAGER'
                                                    );
                                                    showToast(`Driver ${drv.name} successfully verified and enrolled!`, 'success');
                                                  } catch (err: any) {
                                                    showToast(err.message, 'error');
                                                  }
                                                }}
                                                className="px-3.5 py-1.5 h-8 bg-slate-950 hover:bg-slate-800 text-amber-500 hover:text-white font-extrabold uppercase rounded-lg text-[8.5px] tracking-wider transition-all cursor-pointer"
                                              >
                                                Verify & Scope
                                              </button>
                                           </div>
                                         )}
                                       </div>
                                     </td>
                                     <td className="px-6 py-5">
                                       {drv.kycStatus !== 'APPROVED' && drv.status !== 'ACTIVE' ? (
                                         <div className="space-y-1.5 max-w-xs">
                                           <div className="flex gap-1.5">
                                             <select 
                                               value={selectedCityId}
                                               onChange={e => {
                                                 setSelectedCityId(e.target.value);
                                                 const relatedFr = INITIAL_FRANCHISES.find(f => f.cityId === e.target.value);
                                                 if (relatedFr) setSelectedFranchiseId(relatedFr.id);
                                               }}
                                               className="bg-white border border-slate-200 px-2 py-1 rounded text-[8.5px] font-black uppercase text-slate-800"
                                             >
                                               {INITIAL_CITIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                             </select>

                                             <select 
                                               value={selectedFranchiseId}
                                               onChange={e => setSelectedFranchiseId(e.target.value)}
                                               className="bg-white border border-slate-200 px-2 py-1 rounded text-[8.5px] font-black uppercase text-slate-800"
                                             >
                                               {INITIAL_FRANCHISES.filter(f => f.cityId === selectedCityId).map(f => (
                                                 <option key={f.id} value={f.id}>{f.cityName} ({f.id})</option>
                                               ))}
                                             </select>
                                           </div>
                                           <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Map scope on verification</span>
                                         </div>
                                       ) : (
                                         <div>
                                           <p className="font-extrabold text-[10px] text-slate-800 uppercase tracking-widest">Zone: {getCityName(drv.cityId || drv.city)}</p>
                                           <p className="text-[9px] text-slate-400 mt-0.5">Franchise Mapped: {getFranchiseName(drv.franchiseId)}</p>
                                         </div>
                                       )}
                                     </td>
                                     <td className="px-6 py-5">
                                       <button
                                         onClick={() => {
                                           setSelectedDriverForDocs(drv);
                                           setShowDocModal(true);
                                         }}
                                         className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold uppercase rounded-lg text-[9px] cursor-pointer"
                                       >
                                         <FileText size={12} /> View Uploads
                                       </button>
                                     </td>
                                   </tr>
                                 ))
                               )}
                             </tbody>
                           </table>
                         </div>
                       </div>
                     </div>
                   )}

                   {/* Sub-tab TERMINALS: Media Terminals Activation */}
                   {subTab === 'TERMINALS' && (
                     <div className="space-y-6">
                       <div className="bg-slate-900/40 p-5 rounded-2.5xl border border-white/5">
                         <h4 className="text-xs font-black uppercase text-white tracking-widest mb-1">Smart Screen Displays Terminal Provisioning Desk</h4>
                         <p className="text-[10px] text-slate-400 leading-relaxed">
                           Activate new display modules, enter their hardware parameters, assign them to an approved verified driver on-board, and link the hardware directly to a regional franchise for automated share calculation.
                         </p>
                       </div>

                       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                         
                         {/* Provisioning Form Card */}
                         <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4 lg:col-span-1">
                           <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Pair & Activate hardware terminal</h4>
                           
                           <form onSubmit={async (e) => {
                             e.preventDefault();
                             if (!newDeviceId || !newDeviceDriverId) {
                               showToast("Device UUID and assigned driver ID are required", "error");
                               return;
                             }
                             try {
                               await approveAndMapDevice(
                                 newDeviceId.trim(),
                                 newDeviceDriverId,
                                 selectedCityId,
                                 selectedFranchiseId
                               );
                               showToast(`Terminal display ${newDeviceId} successfully integrated, mapped to regional franchise, and activated!`, 'success');
                               setNewDeviceId('');
                               setNewDeviceDriverId('');
                             } catch (err: any) {
                               showToast(err.message, 'error');
                             }
                           }} className="space-y-3">
                             <div>
                               <label className="text-[8px] font-black tracking-widest text-slate-400 uppercase block mb-1">Device hardware ID (UUID)</label>
                               <input 
                                 type="text" 
                                 required
                                 placeholder="e.g. TRM-BLR-045"
                                 value={newDeviceId}
                                 onChange={e => setNewDeviceId(e.target.value)}
                                 className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 font-mono focus:ring-1 focus:ring-amber-500"
                               />
                             </div>

                             <div>
                               <label className="text-[8px] font-black tracking-widest text-slate-400 uppercase block mb-1">Target Approved Driver</label>
                               <select 
                                 required
                                 value={newDeviceDriverId}
                                 onChange={e => setNewDeviceDriverId(e.target.value)}
                                 className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs font-semibold text-slate-700"
                               >
                                 <option value="">-- Choose Approved Driver --</option>
                                 {drivers.filter(d => d.kycStatus === 'APPROVED' || d.status === 'ACTIVE').map(d => (
                                   <option key={d.id || d.uid} value={d.id || d.uid}>{d.name} ({getCityName(d.cityId)})</option>
                                 ))}
                               </select>
                             </div>

                             <div className="grid grid-cols-2 gap-3.5">
                               <div>
                                 <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Align Region</label>
                                 <select 
                                   value={selectedCityId}
                                   onChange={e => {
                                     setSelectedCityId(e.target.value);
                                     const relatedFr = INITIAL_FRANCHISES.find(f => f.cityId === e.target.value);
                                     if (relatedFr) setSelectedFranchiseId(relatedFr.id);
                                   }}
                                   className="w-full bg-slate-50 border border-slate-100 p-2 text-[10px] rounded-xl font-bold uppercase text-slate-700"
                                 >
                                   {INITIAL_CITIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                 </select>
                               </div>
                               <div>
                                 <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Franchise Key</label>
                                 <select 
                                   value={selectedFranchiseId}
                                   onChange={e => setSelectedFranchiseId(e.target.value)}
                                   className="w-full bg-slate-50 border border-slate-100 p-2 text-[10px] rounded-xl font-bold uppercase text-slate-700"
                                 >
                                   {INITIAL_FRANCHISES.filter(f => f.cityId === selectedCityId).map(f => (
                                     <option key={f.id} value={f.id}>{f.id}</option>
                                   ))}
                                 </select>
                               </div>
                             </div>

                             <button 
                               type="submit"
                               className="w-full py-3.5 mt-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-widest shadow-md transition-all cursor-pointer"
                             >
                               Provision hardware Display
                             </button>
                           </form>
                         </div>

                         {/* Active Deployed list card */}
                         <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 lg:col-span-2 space-y-4">
                           <h4 className="text-xs font-black uppercase text-white tracking-wider">Live Provisioned Terminal Registry</h4>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {terminals.map((term: any) => (
                               <div key={term.id} className="p-4 bg-slate-950/70 border border-white/5 rounded-2xl flex flex-col justify-between space-y-3 text-xs">
                                 <div className="flex justify-between items-start">
                                   <div>
                                     <h5 className="font-mono text-sm font-extrabold text-amber-500">{term.id}</h5>
                                     <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1 block">
                                       City: {getCityName(term.cityId)}
                                     </span>
                                   </div>
                                    <span className="px-2 py-0.5 rounded text-[8.5px] font-black uppercase bg-green-500/10 text-green-400 border border-green-500/20">Active</span>
                                 </div>
                                 <p className="text-[10px] text-slate-450 font-semibold leading-none">DRIVER INDENT: <span className="font-mono text-slate-350">{term.driverId || 'Awaiting map'}</span></p>
                                 <p className="text-[9px] text-slate-500 border-t border-white/5 pt-2">Settlement Share: {getFranchiseName(term.franchiseId)}</p>
                               </div>
                             ))}
                             {terminals.length === 0 && (
                               <div className="col-span-full py-16 text-center border border-dashed border-white/5 rounded-2xl text-slate-500 font-bold uppercase tracking-widest text-[9.5px]">
                                 No hardware display terminals deployed yet.
                               </div>
                             )}
                           </div>
                         </div>

                       </div>
                     </div>
                   )}

                   {/* Sub-tab FRAUD: Fraud alarms & Global complaint monitors */}
                   {subTab === 'FRAUD' && (
                     <div className="space-y-6">
                       <div className="bg-slate-900/40 p-5 rounded-2.5xl border border-white/5">
                         <h4 className="text-xs font-black uppercase text-white tracking-widest mb-1">AutoAds GPS Geofencing and Anti-Spoofing Operations Dashboard</h4>
                         <p className="text-[10px] text-slate-400 leading-relaxed">
                           Engine monitoring for regional playbacks. Systems identify terminal disconnects, coordinate geofencing errors, and detect irregular mileage patterns automatically.
                         </p>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         
                         {/* Geofence Breach list */}
                         <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-6 space-y-4">
                           <div className="flex items-center gap-2.5">
                             <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                             <h4 className="text-xs font-black uppercase text-white tracking-widest">Live Security breaches & spoof indicators</h4>
                           </div>
                           
                           <div className="space-y-3.5">
                             {[
                               { id: 'AL-102', city: 'Bangalore', type: 'Spoof playbacks', severity: 'SEVERE', text: 'Terminal TRM-BLR-045 coordinates indicate speed > 150km/h (Playback Spoof warning).' },
                               { id: 'AL-105', city: 'Mysore', type: 'Geofence Breach', severity: 'WARNING', text: 'Vehicle driven with terminal TRM-MYS-012 outside heritage zone boundaries.' },
                               { id: 'AL-108', city: 'Mangalore', type: 'Terminal Offline', severity: 'CRITICAL', text: 'Active campaign live displayed lost GPS sync for greater than 45 minutes.' }
                             ].map((al) => (
                               <div key={al.id} className="p-4 bg-slate-950/60 border border-white/5 rounded-2xl space-y-2">
                                 <div className="flex justify-between items-center text-[10px]">
                                   <div className="flex items-center gap-2">
                                     <span className="font-bold text-slate-500">{al.id}</span>
                                     <span className="font-extrabold text-white uppercase tracking-widest text-[8.5px] bg-slate-900 px-2 py-0.5 border border-slate-800 rounded">{al.type}</span>
                                   </div>
                                   <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                     al.severity === 'SEVERE' || al.severity === 'CRITICAL' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20' : 'bg-amber-500/15 text-amber-400'
                                   }`}>{al.severity}</span>
                                 </div>
                                 <p className="text-[10px] font-semibold text-slate-400 leading-relaxed">{al.text}</p>
                                 <div className="flex justify-between items-center text-[8.5px] font-black text-slate-500 pt-1 uppercase">
                                   <span>Zone: {al.city}</span>
                                   <button 
                                     onClick={() => showToast(`Dispatched alert ticket AL-102 to local franchise owner regarding coordinate divergence.`, 'success')}
                                     className="text-amber-500 hover:underline hover:text-amber-400 transition-colors uppercase cursor-pointer"
                                   >
                                     Dispatch alert to Franchise owner
                                   </button>
                                 </div>
                               </div>
                             ))}
                           </div>
                         </div>

                         {/* Complaint Metrics widget */}
                         <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between space-y-4 text-xs">
                           <div>
                             <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Complaint Classification Breakdown</h4>
                             <p className="text-[10px] text-slate-500 leading-relaxed mt-1">Status of support tickets opened, handled, and processed locally across the franchise regions.</p>
                           </div>

                           {/* Interactive Mini Chart of Ticket priority breakdown */}
                           <div className="grid grid-cols-3 gap-3">
                             <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-center">
                               <p className="text-xl font-black text-rose-600 leading-none">2</p>
                               <span className="text-[8.5px] font-black text-rose-500 uppercase block tracking-widest mt-1">High priority</span>
                             </div>
                             <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-center">
                               <p className="text-xl font-black text-amber-600 leading-none">5</p>
                               <span className="text-[8.5px] font-black text-amber-500 uppercase block tracking-widest mt-1">Medium priority</span>
                             </div>
                             <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-center">
                               <p className="text-xl font-black text-blue-600 leading-none">12</p>
                               <span className="text-[8.5px] font-black text-blue-500 uppercase block tracking-widest mt-1">Low priority</span>
                             </div>
                           </div>

                           <div className="p-4 bg-slate-950 text-white rounded-2xl border border-slate-900 space-y-1">
                             <p className="text-[9px] font-black text-slate-400 tracking-wider uppercase leading-none">Audit Compliance rating</p>
                             <div className="flex justify-between items-center pt-1">
                               <span className="text-[11px] font-black text-green-400">99.8% Fleet Verified Compliant</span>
                               <span className="text-[10px] font-mono text-slate-400">Total: {tickets.length} tickets</span>
                             </div>
                           </div>
                         </div>

                       </div>
                     </div>
                   )}

                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </main>

        {showDocModal && selectedDriverForDocs && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
             {(() => {
               const currentDriver = (drivers || []).find(d => d.id === selectedDriverForDocs.id) || selectedDriverForDocs;
               return (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
                >
                   <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tighter">Document Registry</h3>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Verification Profile: {currentDriver.name}</p>
                      </div>
                      <button onClick={() => setShowDocModal(false)} className="p-3 bg-slate-200 text-slate-900 rounded-2xl hover:bg-slate-300 transition-all">
                        <X size={20} />
                      </button>
                   </div>

                   <div className="flex-1 overflow-y-auto p-8 lg:p-12">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                       {[
                         { label: 'Profile Photo / Selfie', key: 'profileImage' },
                         { label: 'Aadhar Card', key: 'aadharPhoto' },
                         { label: 'Vehicle RC', key: 'rcPhoto' },
                         { label: 'Driving License', key: 'dlPhoto' },
                         { label: 'PAN Card', key: 'panPhoto' }
                       ].map((docItem) => (
                         <div key={docItem.key} className="space-y-4">
                           <div className="flex items-center justify-between">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{docItem.label}</p>
                             {currentDriver[docItem.key as keyof Driver] ? (
                               <span className="text-[8px] font-black py-1 px-3 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20 uppercase">SECURE_LINK_ACTIVE</span>
                             ) : (
                               <span className="text-[8px] font-black py-1 px-3 bg-red-500/10 text-red-500 rounded-full border border-red-500/20 uppercase">NOT_UPLOADED</span>
                             )}
                           </div>
                           <div className="bg-slate-50 rounded-[2rem] border border-slate-100 aspect-[4/3] overflow-hidden flex items-center justify-center relative group">
                             {currentDriver[docItem.key as keyof Driver] ? (
                               <>
                                 <img 
                                   src={currentDriver[docItem.key as keyof Driver] as string} 
                                   className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                                   alt={docItem.label}
                                   referrerPolicy="no-referrer"
                                 />
                                 <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <a 
                                     href={currentDriver[docItem.key as keyof Driver] as string} 
                                     target="_blank" 
                                     rel="noreferrer"
                                     className="px-6 py-3 bg-white text-slate-950 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl hover:scale-110 active:scale-95 transition-all"
                                    >
                                      Expand Original
                                    </a>
                                 </div>
                               </>
                             ) : (
                               <div className="flex flex-col items-center gap-3 opacity-20">
                                 <Database size={40} />
                                 <p className="text-[8px] font-black uppercase tracking-widest">Awaiting Data Uplink</p>
                               </div>
                             )}
                           </div>
                         </div>
                       ))}
                      </div>
                   </div>

                   <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
                      <button 
                       onClick={() => setShowDocModal(false)}
                       className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl"
                      >
                        Done Reviewing
                      </button>
                   </div>
                </motion.div>
               );
             })()}
          </div>
        )}
        
        {showApprovalModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
             >
                <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                   <div>
                     <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tighter">Support Approval Desk</h3>
                     <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Configure Deployment Parameters</p>
                   </div>
                   <button onClick={() => setShowApprovalModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><Layout size={20}/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                         <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Duration (Days)</label>
                         <input type="number" className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs font-bold" value={approvalForm.durationDays || ''} onChange={e => setApprovalForm({...approvalForm, durationDays: parseInt(e.target.value) || 0})}/>
                      </div>
                      <div className="space-y-1">
                         <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Hours Per Day</label>
                         <input type="number" className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs font-bold" value={approvalForm.hoursPerDay || ''} onChange={e => setApprovalForm({...approvalForm, hoursPerDay: parseInt(e.target.value) || 0})}/>
                      </div>
                      <div className="space-y-1">
                         <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Max Autos</label>
                         <input type="number" className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs font-bold" value={approvalForm.maxAutos || ''} onChange={e => setApprovalForm({...approvalForm, maxAutos: parseInt(e.target.value) || 0})}/>
                      </div>
                   </div>

                   <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Assigned Drivers ({selectedDriverIds.length})</label>
                        <input type="text" placeholder="Filter Area/Name..." className="text-[8px] p-2 border border-slate-100 rounded-lg w-32" onChange={e => setSearchTerm(e.target.value)} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2">
                        {drivers.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.city?.toLowerCase().includes(searchTerm.toLowerCase())).map((d, i) => (
                           <label key={i} className={cn("p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all", selectedDriverIds.includes(d.uid) ? "bg-amber-50 border-amber-200" : "bg-white border-slate-100")}>
                             <div className="flex items-center gap-2">
                               <input type="checkbox" checked={selectedDriverIds.includes(d.uid)} onChange={e => e.target.checked ? setSelectedDriverIds([...selectedDriverIds, d.uid]) : setSelectedDriverIds(selectedDriverIds.filter(id => id !== d.uid))} className="w-3 h-3 text-amber-500 rounded border-slate-300"/>
                               <div>
                                  <p className="text-[9px] font-black uppercase">{d.name}</p>
                                  <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">{d.city || 'No Area'}</p>
                               </div>
                             </div>
                           </label>
                        ))}
                      </div>
                   </div>
                </div>

                <div className="p-6 bg-slate-900 flex gap-3">
                   <button onClick={() => setShowApprovalModal(false)} className="flex-1 py-3 text-slate-400 text-[10px] font-black uppercase hover:text-white transition-all">Dismiss</button>
                   <button onClick={handleConfirmApproval} disabled={isSubmitting || selectedDriverIds.length === 0} className="flex-1 py-3 bg-amber-500 text-slate-950 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-amber-500/10 disabled:opacity-50">Confirm Approval</button>
                </div>
             </motion.div>
          </div>
        )}
        <AdminAssistant 
          activeTab={activeTab} 
          role="admin" 
          systemContext={{
            userName: user?.displayName || 'Support Staff',
            activeTickets: tickets.filter(t => t.status === 'open').length,
            transactions: payments,
            balance: 0,
            liveUnitsCount: terminals.length
          }}
        />
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className={cn(
                "fixed bottom-24 right-8 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border font-black uppercase text-[10px] tracking-widest",
                toast.type === 'success' ? "bg-green-500 border-green-400 text-white" : "bg-red-500 border-red-400 text-white"
              )}
            >
              {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {toast.message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </ErrorBoundary>
  );
}
