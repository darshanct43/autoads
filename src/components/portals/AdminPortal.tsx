import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  Monitor,
  IndianRupee,
  Activity,
  MapPin,
  AlertCircle,
  Search,
  ChevronRight,
  Download,
  CreditCard,
  Image as ImageIcon,
  Truck,
  Wallet,
  Check,
  X,
  Smartphone,
  Zap,
  Wifi,
  Trash2,
  MessageSquare,
  Send,
  Settings,
  Video,
  ShieldCheck,
  Shield,
  FileText,
  Lock,
  Gift,
  LogOut,
  MousePointer2,
  Database,
  Radio,
  RefreshCw,
  Terminal as TerminalIcon,
  AlertTriangle,
  ArrowLeft,
  Eye,
  ExternalLink,
  Play,
  Tv,
  Cast,
  Power,
  Maximize2,
  Maximize,
  Volume2,
  Sun,
  MoreVertical,
  Cpu,
  Server,
  Cloud,
  Film,
} from "lucide-react";
import {
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  firebaseService,
  Driver,
  Payment,
  AdCampaign,
  SupportTicket,
  ChatMessage,
} from "@/services/firebaseService";
import { storageService } from "@/services/storageService";
import { auth } from "@/lib/firebase";
import { UserRole } from "@/types";
import RoadmapChart from "../common/RoadmapChart";
import AdminAssistant from "../common/AdminAssistant";
import { ErrorBoundary } from "../common/ErrorBoundary";
import NotificationCenter from "../common/NotificationCenter";
import { AdminStudioConfig } from "../studio/admin/AdminStudioConfig";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polyline,
  useMap,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

// Fix Leaflet marker icon issue
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIconRetina from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom Telemetry Icon for Fleet Units
const autoIcon = (isOnline: boolean) =>
  L.divIcon({
    html: `
    <div class="relative group">
      <div class="w-10 h-10 ${isOnline ? "bg-slate-900 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]" : "bg-slate-800 border-slate-700 opacity-60"} rounded-xl flex items-center justify-center text-amber-500 transition-all duration-300 border-2 transform group-hover:scale-110 active:scale-95 shadow-2xl">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11.6 2 11.8 2 12v4c0 .6.4 1 1 1h2"/>
          <circle cx="7" cy="17" r="2"/>
          <path d="M9 17h6"/>
          <circle cx="17" cy="17" r="2"/>
        </svg>
      </div>
      ${isOnline ? '<div class="absolute -top-1.5 -right-1.5 flex h-4 w-4"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span class="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-white"></span></div>' : ""}
    </div>
  `,
    className: "",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

// Component to fly to specific coordinates
function ChangeView({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();
  const lastCenter = React.useRef(center);

  useEffect(() => {
    // Only fly if coordinates actually changed to avoid snapping during interaction
    if (
      center[0] !== lastCenter.current[0] ||
      center[1] !== lastCenter.current[1]
    ) {
      map.flyTo(center, zoom, { duration: 1.5 });
      lastCenter.current = center;
    }
  }, [center, zoom, map]);
  return null;
}

function InvalidateMap() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 500);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

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

interface AdminPortalProps {
  onRoleJump?: (role: UserRole) => void;
  onLogout: () => void;
  onOpenStudio?: () => void;
}

export default function AdminPortal({
  onRoleJump,
  onLogout,
  onOpenStudio,
}: AdminPortalProps) {
  const [selectedTheme, setSelectedTheme] = useState<'default' | 'tokyo' | 'emerald' | 'ocean' | 'solar'>(() => (localStorage.getItem('admin_premium_theme') as any) || 'default');
  
  const selectTheme = (theme: 'default' | 'tokyo' | 'emerald' | 'ocean' | 'solar') => {
    setSelectedTheme(theme);
    localStorage.setItem('admin_premium_theme', theme);
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
          card: 'bg-emerald-950/40 border-emerald-900/30',
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

  const [activeTab, setActiveTab] = useState("DASHBOARD");
  const [notices, setNotices] = useState<any[]>([]);
  const [newNotice, setNewNotice] = useState({
    offer: "",
    message: "",
    targetRegion: "",
    imageUrl: "",
  });
  const [isUploading, setIsUploading] = useState(false);
  const [paymentSubTab, setPaymentSubTab] = useState<"INCOME" | "EXPENSE">(
    "INCOME",
  );
  const [ticketNotifications, setTicketNotifications] = useState<string[]>([]);
  const [campaignAreas, setCampaignAreas] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [driverPayments, setDriverPayments] = useState<any[]>([]);
  const [deviceScreens, setDeviceScreens] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState<string | null>(null);
  const [selectedDriverHistory, setSelectedDriverHistory] = useState<any[]>([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [driverPaymentsPage, setDriverPaymentsPage] = useState(1);
  const itemsPerPage = 10;
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [withdrawRequests, setWithdrawRequests] = useState<any[]>([]);
  const [driverLocations, setDriverLocations] = useState<any[]>([]);
  const [showEarningModal, setShowEarningModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvingCampaignId, setApprovingCampaignId] = useState<string | null>(
    null,
  );
  const [approvalForm, setApprovalForm] = useState({
    durationDays: 30,
    hoursPerDay: 8,
    totalMinutes: 50,
    maxAutos: 5,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    paymentConfirmed: false,
    mediaConfirmed: false,
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
  const [selectedDriverForEarning, setSelectedDriverForEarning] =
    useState<any>(null);
  const [selectedDriverForProvision, setSelectedDriverForProvision] =
    useState<Driver | null>(null);
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<AdCampaign | null>(
    null,
  );
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isEditingMedia, setIsEditingMedia] = useState(false);
  const [editMediaUrl, setEditMediaUrl] = useState('');
  const [editMediaType, setEditMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [isUpdatingMedia, setIsUpdatingMedia] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDriverForDocs, setSelectedDriverForDocs] = useState<Driver | null>(null);
  const [selectedDriverForAgreement, setSelectedDriverForAgreement] = useState<any | null>(null);
  const [driverDocuments, setDriverDocuments] = useState<any[]>([]);
  const [showDocModal, setShowDocModal] = useState(false);
  const [pricingSubTab, setPricingSubTab] = useState<'BASE' | 'DESIGNER'>('BASE');
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedArea, setSelectedArea] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [opFeedback, setOpFeedback] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [campaignMediaFile, setCampaignMediaFile] = useState<File | null>(null);
  const [campaignMediaType, setCampaignMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [campaignUploadProgress, setCampaignUploadProgress] = useState(0);
  const [editMediaFile, setEditMediaFile] = useState<File | null>(null);
  const [editUploadProgress, setEditUploadProgress] = useState(0);
  const [terminals, setTerminals] = useState<any[]>([]);
  const [viewingUnit, setViewingUnit] = useState<any>(null);
  const [networkConfigTarget, setNetworkConfigTarget] = useState<string | null>(null);
  
  // Fleet Monitor State
  const [selectedDeviceForTV, setSelectedDeviceForTV] = useState<any | null>(null);
  const [isTVConnecting, setIsTVConnecting] = useState(false);
  const [showTVSession, setShowTVSession] = useState(false);
  const [tvPasswordVisible, setTvPasswordVisible] = useState<{ [key: string]: boolean }>({});
  const [commandInProgress, setCommandInProgress] = useState<string | null>(null);

  const toggleTVPassword = (id: string) => {
    setTvPasswordVisible(prev => ({ ...prev, [id]: !prev[id] }));
  };
  
  const liveScreensCount = terminals.filter((t) => {
    if (!t.metrics?.currentAdImage) return false;
    const ts = t.metrics?.lastHeartbeat || t.lastPulse;
    if (!ts) return false;
    // lastPulse might be a firestore timestamp
    const lastUpdate = ts.toMillis ? ts.toMillis() : new Date(ts).getTime();
    return Date.now() - lastUpdate < 60000; // 60 seconds threshold
  }).length;
  const [liveStatus, setLiveStatus] = useState<any[]>([]);

  useEffect(() => {
    if (opFeedback) {
      const timer = setTimeout(() => setOpFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [opFeedback]);

  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [purgeInput, setPurgeInput] = useState("");

  const liveUnitsCount = liveStatus.filter((status) => {
    if (!status.updatedAt) return false;
    const lastUpdate = status.updatedAt.toMillis?.() || 0;
    return Date.now() - lastUpdate < 60000; // 1 minute window for live status
  }).length;
  const [showCoverage, setShowCoverage] = useState(true);
  const [showIssues, setShowIssues] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    12.9716, 77.5946, // Default to Bengaluru if no units
  ]);
  const [mapZoom, setMapZoom] = useState(12);

  // Auto-center map on active units once they are loaded
  useEffect(() => {
    const activeUnits = driverLocations.filter(loc => loc.lat && loc.lng && loc.lat !== 0 && loc.isOnline);
    if (activeUnits.length > 0 && mapZoom === 12 && mapCenter[0] === 12.9716) {
      // Find bounding box or just center on the first one
      const first = activeUnits[0];
      setMapCenter([first.lat, first.lng]);
    }
  }, [driverLocations]);

  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Attempt to center map on Admin's location initially if no units found
    if ("geolocation" in navigator && drivers.length === 0) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setMapCenter([pos.coords.latitude, pos.coords.longitude]);
        setMapZoom(11);
      });
    }
  }, []);

  useEffect(() => {
    // Monitor for new open tickets to trigger notifications
    const openTickets = tickets.filter(
      (t) => t.status === "open" || t.status === "OPEN",
    );
    if (openTickets.length > 0) {
      const newTicketIds = openTickets
        .map((t) => t.id!)
        .filter((id) => !ticketNotifications.includes(id));

      if (newTicketIds.length > 0) {
        setTicketNotifications((prev) => [...prev, ...newTicketIds]);
      }
    }
  }, [tickets, ticketNotifications]);

  const [showRoadmap, setShowRoadmap] = useState(false);
  const handleRemoteCommand = async (terminalId: string, cmd: string, params?: any) => {
    setCommandInProgress(`${terminalId}-${cmd}`);
    try {
      showToast(`Initiating Remote Command: ${cmd.toUpperCase()}`, "info");
      
      if (cmd === 'RESTART_APP') {
        await firebaseService.updateTerminalCommand(terminalId, "RESTART_APP");
      } else if (cmd === 'VOLUME' || cmd === 'BRIGHTNESS' || cmd === 'LOCK') {
        await firebaseService.updateTerminalHardwareParams(terminalId, params);
      } else if (cmd === 'EMERGENCY_BROADCAST') {
        const message = prompt("Enter Emergency Broadcast Message:");
        if (message !== null) {
          await firebaseService.updateTerminalHardwareParams(terminalId, { emergencyBroadcast: message || null });
        }
      } else if (cmd === 'TV_UPDATE') {
        const tvId = prompt("Enter TeamViewer ID:");
        const tvPass = prompt("Enter TeamViewer Password:");
        if (tvId && tvPass) {
          await firebaseService.updateTerminalTeamViewer(terminalId, tvId, tvPass);
        }
      }
      
      setTimeout(() => {
        showToast(`Command ${cmd.toUpperCase()} Executed via secure uplink`, "success");
        setCommandInProgress(null);
      }, 1500);
    } catch (e) {
      showToast("Command Execution Failed", "error");
      setCommandInProgress(null);
    }
  };

  const handleCaptureFrame = (terminal: any) => {
    showToast("Diagnostic frame capture requested from Terminal", "info");
    setTimeout(() => {
      showToast("Live frame successfully captured via secure tunnel", "success");
    }, 2000);
  };

  const startTVSession = (terminal: any) => {
    if (!terminal.teamViewerId) {
      showToast("TeamViewer ID not configured for this unit", "error");
      return;
    }
    
    setSelectedDeviceForTV(terminal);
    setIsTVConnecting(true);
    
    setTimeout(() => {
      setIsTVConnecting(false);
      setShowTVSession(true);
    }, 2500);
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

  const handleCampaignFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCampaignMediaFile(file);
      setCampaignMediaType(file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE');
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setCampaignUploadProgress(0);
    const formData = new FormData(e.currentTarget);

    try {
      let finalMediaUrl = "";
      let finalMediaType = campaignMediaType;

      if (campaignMediaFile) {
        setOpFeedback({ message: "Uploading to AWS S3 / CloudFront...", type: 'info' });
        console.log("[AdminPortal] Initializing AWS upload for:", campaignMediaFile.name);
        
        finalMediaUrl = await storageService.uploadFile(
          campaignMediaFile,
          (progressInfo) => {
            setCampaignUploadProgress(progressInfo.progress);
            if (progressInfo.status === 'ERROR') {
              console.error("[AdminPortal] AWS Upload Failed:", progressInfo.error);
            }
          }
        );
        
        console.log("[AdminPortal] AWS Upload Success. URL:", finalMediaUrl);
        setOpFeedback({ message: "AWS Cloud Link Secured.", type: 'success' });
      }

      if (!finalMediaUrl) {
        showToast("Please upload a file for the campaign.", 'error');
        setIsSubmitting(false);
        return;
      }

      await firebaseService.createCampaign({
        title: formData.get("title") as string,
        clientName: formData.get("clientName") as string,
        description: (formData.get("description") as string) || "",
        assetUrl: finalMediaUrl,
        mediaUrl: finalMediaUrl,
        mediaType: finalMediaType,
        budget: parseFloat(formData.get("budget") as string),
        targetLat: parseFloat(formData.get("targetLat") as string) || 12.9716,
        targetLng: parseFloat(formData.get("targetLng") as string) || 77.5946,
        coverageRadius:
          parseFloat(formData.get("coverageRadius") as string) || 5000,
        status: "PENDING",
        customerId: "SYSTEM_ADMIN",
      });
      setShowCampaignModal(false);
      setCampaignMediaFile(null);
      setCampaignUploadProgress(0);
      showToast("Campaign deployed to network.", 'success');
    } catch (err) {
      console.error(err);
      showToast("Deployment failed.", 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const dynamicChartData = React.useMemo(() => {
    const cityGroups: Record<string, number> = {};
    drivers.forEach((d) => {
      const city = d.city || "Other";
      cityGroups[city] = (cityGroups[city] || 0) + 1;
    });

    const topCities = Object.entries(cityGroups)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if ((topCities || []).length === 0 && (payments || []).length === 0) {
      return [];
    }

    return (topCities || []).map(([name, count]) => {
      const cityRevenue = (payments || [])
        .filter((p) => {
          if (!p || !["success", "SUCCESS", "paid", "PAID"].includes(p.status)) {
            return false;
          }
          // Attribute strictly by driverId
          if (p.driverId) {
            const driver = (drivers || []).find((d) => d.uid === p.driverId);
            return driver?.city === name;
          }
          return false;
        })
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      return {
        name,
        autos: count,
        revenue: Math.round(cityRevenue),
      };
    });
  }, [drivers, campaigns, payments]);

  const handleExecutePurge = async () => {
    setIsSubmitting(true);
    try {
      await firebaseService.purgeAllProductionData();
      showToast("System Reset Complete. Network at 0.", 'success');
      setShowPurgeConfirm(false);
      // Reload to ensure all subscriptions clear properly
      window.location.reload();
    } catch (e) {
      console.error("Purge Error:", e);
      showToast("Purge interrupt.", 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalSuccessfulRevenue = (payments || [])
    .filter((p) => p && ["success", "SUCCESS", "paid", "PAID"].includes(p.status))
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  useEffect(() => {
    // Analytics Logger
    console.log("[System] Admin Panel Initialized", {
      user: auth.currentUser?.email,
      timestamp: new Date().toISOString(),
    });

    const unsubDrivers = firebaseService.subscribeToDrivers(setDrivers);
    const unsubPayments = firebaseService.subscribeToPayments(setPayments);
    const unsubDriverPayments =
      firebaseService.subscribeToDriverPaymentsForAll(setDriverPayments);
    const unsubCampaigns = firebaseService.subscribeToCampaigns(setCampaigns);
    const unsubTickets =
      firebaseService.subscribeToSupportTicketsForAll(setTickets);
    const unsubWithdraws =
      firebaseService.subscribeToWithdrawRequests(setWithdrawRequests);
    const unsubLocations = firebaseService.subscribeToDriverLocations(
      (locs) => {
        setDriverLocations(locs);
        // Auto-center 
        const activeUnits = locs.filter(
          (l) =>
            l.isOnline &&
            typeof l.lat === "number" &&
            typeof l.lng === "number" &&
            Date.now() - new Date(l.timestamp).getTime() < 300000, // 5 min threshold
        );
        const firstActive = activeUnits[0];

        if (firstActive) {
          setMapCenter([firstActive.lat, firstActive.lng]);
          setMapZoom(13);
        } else if (mapCenter[0] === 20.5937 && mapCenter[1] === 78.9629) {
          // Fallback to browser location
          if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                setMapCenter([pos.coords.latitude, pos.coords.longitude]);
                setMapZoom(11);
              },
              (err) => console.warn("Geolocation denied/failed:", err),
              { enableHighAccuracy: false, timeout: 5000 },
            );
          }
        }
      },
    );
    const unsubScreens =
      firebaseService.subscribeToDeviceScreens(setDeviceScreens);
    const unsubNotices = firebaseService.subscribeToPublicNotices(setNotices);
    const unsubTerminals = firebaseService.subscribeToTerminals(setTerminals);
    const unsubLiveStatus = firebaseService.subscribeToLiveStatus(setLiveStatus);
    // Document listeners removed

    firebaseService.getPlans().then(setPlans).catch(console.error);
    
    // Set loading to false after a short delay to allow initial snapshots to land
    const timer = setTimeout(() => setLoading(false), 2000);

    return () => {
      clearTimeout(timer);
      unsubDrivers();
      unsubPayments();
      unsubDriverPayments();
      unsubCampaigns();
      unsubTickets();
      unsubWithdraws();
      unsubLocations();
      unsubScreens();
      unsubNotices();
      unsubTerminals();
      unsubLiveStatus();
      // unsubDocs cleanup removed
    };
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setOpFeedback({ message, type });
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

  const handleDeleteWithdrawRequest = async (id: string) => {
    if (!id || !window.confirm("Delete record?")) return;
    try {
      await firebaseService.deleteWithdrawRequest(id);
      showToast("Purged.", 'success');
    } catch (e) {
      showToast("Delete failed.", 'error');
    }
  };

  const handleDeleteSupportTicket = async (id: string) => {
    if (!id || !window.confirm("Delete thread?")) return;
    try {
      await firebaseService.deleteSupportTicket(id);
      showToast("Purged.", 'success');
    } catch (e) {
      showToast("Delete failed.", 'error');
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!id || !window.confirm("Delete transaction?")) return;
    try {
      await firebaseService.deletePayment(id);
      showToast("Purged.", 'success');
    } catch (e) {
      showToast("Delete failed.", 'error');
    }
  };

  const handleDeleteDriverPayment = async (id: string) => {
    if (!id || !window.confirm("Delete driver record?")) return;
    try {
      await firebaseService.deleteDriverPayment(id);
      showToast("Purged.", 'success');
    } catch (e) {
      showToast("Delete failed.", 'error');
    }
  };

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

  const [planProposals, setPlanProposals] = useState<any[]>([]);

  useEffect(() => {
    const unsub = firebaseService.subscribeToPlanProposals(setPlanProposals);
    return () => unsub();
  }, []);

  const handleApprovePlan = async (proposalId: string, planId: string, newValue: number, type: 'price' | 'designerPrice' | 'videoMakerPrice' = 'price') => {
    try {
      await firebaseService.approvePlanProposal(proposalId, planId, newValue, type);
      const up = await firebaseService.getPlans();
      setPlans(up);
      const props = await firebaseService.getPlanProposals();
      setPlanProposals(props);
      let label = 'Base';
      if (type === 'designerPrice') label = 'Designer';
      if (type === 'videoMakerPrice') label = 'Video Maker';
      showToast(`${label} rate updated successfully!`, 'success');
    } catch (e) {
      console.error(e);
      showToast("Failed to approve plan change.", 'error');
    }
  };

  const handleRejectPlan = async (proposalId: string) => {
    try {
      await firebaseService.rejectPlanProposal(proposalId);
      const props = await firebaseService.getPlanProposals();
      setPlanProposals(props);
      showToast("Plan proposal rejected.", 'info');
    } catch (e) {
      console.error(e);
    }
  };

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

  useEffect(() => {
    if (!activeTicketId) {
      setChatMessages([]);
      return;
    }
    firebaseService.markTicketAsRead(activeTicketId);
    const unsubscribe = firebaseService.subscribeToMessages(
      activeTicketId,
      setChatMessages,
    );
    return () => unsubscribe();
  }, [activeTicketId]);

  const handleSendMessage = async () => {
    if (!activeTicketId || !newMessage.trim()) return;
    try {
      await firebaseService.sendChatMessage(activeTicketId, {
        senderId: "SYSTEM_ADMIN",
        senderName: "System Admin",
        senderRole: "admin",
        text: newMessage.trim(),
      });
      setNewMessage("");
    } catch (e) {
      console.error("Chat error:", e);
    }
  };

  const handleApproveWithdrawal = async (req: any) => {
    if (!req.upiId) {
      showToast("No UPI ID found for this request!", 'error');
      return;
    }
    const upiUrl = `upi://pay?pa=${req.upiId}&pn=Driver&am=${req.amount}&cu=INR`;
    showToast(`Initializing payment process for ${req.upiId}.`, 'info');

    try {
      await firebaseService.updateWithdrawRequestStatus(
        req.id,
        "approved",
        "Manual UPI Payment",
      );
      showToast("Payment record updated successfully!", 'success');
    } catch (e) {
      showToast("Failed to update status shadow.", 'error');
    }
  };

  const handleProvisionDriver = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedDriverForProvision) return;
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
        status: "active", // Use lowercase consistent with interface
        deviceId: null, // Reset device lock when re-provisioning
        kycStatus: "APPROVED",
        payoutEnabled: true,
        adminApproved: true
      });
      
      await firebaseService.updateDriverAgreement(selectedDriverForProvision.id, {
        agreementAccepted: true,
        acceptedAt: new Date().toISOString(),
        version: "1.0",
        ipAddress: "admin-provisioned"
      });
      showToast(`Driver ${selectedDriverForProvision.name} provisioned.`, 'success');
      setShowProvisionModal(false);
    } catch (err) {
      showToast("Failed to provision driver.", 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignEarning = async (
    driverId: string,
    amount: number,
    campaignId?: string,
  ) => {
    try {
      await firebaseService.createDriverPayment({
        driverId,
        amount,
        type: "earning",
        status: "success",
        paymentMethod: "SYSTEM",
        campaignId: campaignId || "ADMIN_ASSIGNED",
      });
      showToast(`Success! Credited ₹${amount} to driver.`, 'success');
      setShowEarningModal(false);
    } catch (e) {
      showToast("Failed to assign earning.", 'error');
    }
  };

  const handleApproveCampaign = async (campaignId: string, preselectedDrivers?: string[]) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    setApprovingCampaignId(campaignId);
    setApprovalForm(prev => ({
      ...prev,
      paymentConfirmed: campaign?.paymentReceived || false,
      mediaConfirmed: campaign?.mediaReceived || (!!campaign?.assetUrl || !!campaign?.mediaUrl),
      mediaUrl: campaign?.mediaUrl || campaign?.assetUrl || "",
      mediaType: (campaign?.mediaType as any) || "IMAGE",
      durationDays: campaign?.durationDays || 30,
      hoursPerDay: campaign?.hoursPerDay || 8,
      totalMinutes: campaign?.totalMinutes || 50,
      maxAutos: campaign?.maxAutos || 5,
      targetLat: campaign?.targetLat || 12.9716,
      targetLng: campaign?.targetLng || 77.5946,
      coverageRadius: campaign?.coverageRadius || 5000,
      startTime: campaign?.startTime || "06:00",
      endTime: campaign?.endTime || "22:00",
      daysOfWeek: campaign?.daysOfWeek || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      designerFee: campaign?.designerFee || 0,
      videoMakerFee: campaign?.videoMakerFee || 0
    }));
    setShowApprovalModal(true);
    // Use preselected if provided, otherwise use existing, else clear
    if (preselectedDrivers && preselectedDrivers.length > 0) {
      setSelectedDriverIds(preselectedDrivers);
    } else if (campaign?.assignedDrivers && campaign.assignedDrivers.length > 0) {
      setSelectedDriverIds(campaign.assignedDrivers);
    } else {
      setSelectedDriverIds([]);
    }
  };

  const handleConfirmApproval = async () => {
    if (!approvingCampaignId) return;
    const campaign = campaigns.find(c => c.id === approvingCampaignId);

    if (!approvalForm.paymentConfirmed || !approvalForm.mediaConfirmed) {
      showToast("Both Payment and Media must be confirmed before approval.", "error");
      return;
    }

    if (!approvalForm.mediaUrl) {
      showToast("A valid media source is required for approval.", "error");
      return;
    }

    if (selectedDriverIds.length === 0) {
      showToast("Please select at least one driver to assign.", 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await firebaseService.adminApproveCampaignWithDetails(
        approvingCampaignId,
        {
          durationDays: approvalForm.durationDays,
          hoursPerDay: approvalForm.hoursPerDay,
          totalMinutes: approvalForm.totalMinutes,
          maxAutos: approvalForm.maxAutos,
          startDate: approvalForm.startDate,
          endDate: approvalForm.endDate,
          assignedDrivers: selectedDriverIds,
          paymentConfirmed: approvalForm.paymentConfirmed,
          mediaConfirmed: approvalForm.mediaConfirmed,
          targetLat: approvalForm.targetLat,
          targetLng: approvalForm.targetLng,
          coverageRadius: approvalForm.coverageRadius,
          mediaUrl: approvalForm.mediaUrl,
          mediaType: approvalForm.mediaType,
          startTime: approvalForm.startTime,
          endTime: approvalForm.endTime,
          daysOfWeek: approvalForm.daysOfWeek,
          designerFee: approvalForm.designerFee,
          videoMakerFee: approvalForm.videoMakerFee
        },
      );
      showToast("Campaign approved and drivers assigned.", 'success');
      setShowApprovalModal(false);
      setApprovingCampaignId(null);
    } catch (e) {
      console.error(e);
      showToast("Approval failed.", 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectCampaign = async (campaignId: string) => {
    try {
      await firebaseService.adminRejectCampaign(campaignId);
      showToast("Campaign Rejected.", 'info');
    } catch (err) {
      showToast("Rejection failed.", 'error');
    }
  };

  const handleBulkAssign = async () => {
    if (!selectedCampaign?.id || selectedDriverIds.length === 0) return;
    // Instead of direct assignment, open the detailed desk
    handleApproveCampaign(selectedCampaign.id, selectedDriverIds);
  };

  const handleUpdateMedia = async () => {
    if (!selectedCampaign?.id) return;
    setIsUpdatingMedia(true);
    setEditUploadProgress(0);
    try {
      let finalUrl = editMediaUrl;
      let finalType = editMediaType;

      if (editMediaFile) {
        setOpFeedback({ message: "Uploading updated asset...", type: 'info' });
        finalUrl = await storageService.uploadFile(
          editMediaFile,
          (p) => setEditUploadProgress(p.progress)
        );
        finalType = editMediaFile.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';
      }

      if (!finalUrl) {
        showToast("No media asset provided.", "error");
        setIsUpdatingMedia(false);
        return;
      }

      await firebaseService.updateCampaign(selectedCampaign.id, {
        mediaUrl: finalUrl,
        assetUrl: finalUrl,
        mediaType: finalType
      });
      showToast("Media assets synchronized with cloud storage successfully.", "success");
      setIsEditingMedia(false);
      setEditMediaFile(null);
      // Refresh local state
      setSelectedCampaign(prev => prev ? { ...prev, mediaUrl: finalUrl, assetUrl: finalUrl, mediaType: finalType } : null);
    } catch (err) {
      showToast("Failed to update media assets.", "error");
    } finally {
      setIsUpdatingMedia(false);
    }
  };

  const [holdPurge, setHoldPurge] = useState(0);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startHold = () => {
    if (holdTimerRef.current) return;
    holdTimerRef.current = setInterval(() => {
      setHoldPurge((prev) => {
        if (prev >= 100) {
          clearInterval(holdTimerRef.current!);
          holdTimerRef.current = null;
          handlePurge();
          return 0;
        }
        return prev + 2;
      });
    }, 30);
  };

  const endHold = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldPurge(0);
  };

  const handlePurge = () => {
    setShowPurgeConfirm(true);
  };

  const executePurge = async () => {
    try {
      setIsExtracting(true);
      await firebaseService.purgeAllProductionData();
      setOpFeedback({ message: "Network Purged Successfully", type: 'success' });
      setTimeout(() => window.location.reload(), 1000);
    } catch (e) {
      setOpFeedback({ message: "Purge Failed", type: 'error' });
    } finally {
      setIsExtracting(false);
      setShowPurgeConfirm(false);
      setPurgeInput("");
    }
  };

  const [isExtracting, setIsExtracting] = useState(false);

  const handleSystemTest = async () => {
    try {
      setIsSubmitting(true);
      showToast("Initializing Deep System Audit...", "info");
      
      // 1. Resolve Demo Driver 8861574729
      const demoDriver = drivers.find(d => d.phone === '8861574729');
      if (!demoDriver) {
        showToast("CRITICAL: Driver 8861574729 not found. Please log in first.", "error");
        return;
      }

      const campaignId = 'demo_campaign_id';
      const terminalId = "TRM-DEMO-8861";

      console.log("[Audit] Syncing Terminal & Driver Profile...");
      // Ensure Terminal exists and is ACTIVE
      await firebaseService.syncDemoTerminal(demoDriver.uid, terminalId, campaignId);
      
      // Ensure DUMMY Campaign exists with standard status logic
      const campaignExists = campaigns.find(c => c.id === campaignId);
      
      const demoAssets = {
        video: "/uploads/1779860520885-1000434856.mp4",
        image: "https://d1234567890.cloudfront.net/demo-image-1.jpg"
      };

      if (!campaignExists) {
        console.log("[Audit] Creating Demo Campaign...");
        await firebaseService.createCampaign({
          id: campaignId,
          title: "SYSTEM_DEMO_LOOP",
          clientName: "System Auditor",
          mediaUrl: demoAssets.video, // Primary for compatibility
          assetUrl: demoAssets.video,
          mediaType: "VIDEO",
          ads: [
             { url: demoAssets.video, type: 'VIDEO', title: 'Demo Video', duration: 30 },
             { url: demoAssets.image, type: 'IMAGE', title: 'Demo Image', duration: 10 }
          ],
          status: "LIVE", // Matches device filter
          durationDays: 365,
          assignedDrivers: [demoDriver.uid],
          paymentReceived: true,
          mediaReceived: true,
          budget: 10000,
          targetLat: 12.9716,
          targetLng: 77.5946,
          coverageRadius: 50000
        } as any);
      } else {
        console.log("[Audit] Updating Demo Campaign...");
        await firebaseService.updateCampaign(campaignId, {
          status: 'LIVE',
          assignedDrivers: [demoDriver.uid],
          mediaUrl: demoAssets.video,
          assetUrl: demoAssets.video,
          mediaReceived: true,
          paymentReceived: true,
          ads: [
             { url: demoAssets.video, type: 'VIDEO', title: 'Demo Video', duration: 30 },
             { url: demoAssets.image, type: 'IMAGE', title: 'Demo Image', duration: 10 }
          ],
        });
      }

      // Ensure assignment is 'running'
      const assignmentId = `asgn_${demoDriver.uid}_${campaignId}`;
      await firebaseService.updateDriverAssignment(demoDriver.uid, campaignId, {
         status: 'running',
         updatedAt: new Date().toISOString()
      });

      // Browser Sync: Pre-seed local storage for seamless terminal switch
      localStorage.setItem('temp_terminal_id', terminalId);
      localStorage.setItem('temp_access_key', '8861');

      console.log("[Audit] Complete. Driver 8861574729 is now LIVE via Terminal TRM-DEMO-8861");
      showToast(`Audit Success. Terminal 8861 is linked and ready. Switch tabs to see ads.`, "success");
      
    } catch (e: any) {
      console.error("[Audit] Fault detected:", e);
      showToast("Audit Failed: " + e.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // in metres
  };

  const getComplianceStatus = (loc: any) => {
    const activeCampaign = campaigns.find(c => c.assignedDrivers?.includes(loc.id) && c.status === 'ACTIVE');
    if (!activeCampaign || !activeCampaign.targetLat) return { status: 'idle', distance: 0 };

    const dist = calculateDistance(loc.lat, loc.lng, activeCampaign.targetLat, activeCampaign.targetLng);
    const isCompliant = dist <= (activeCampaign.coverageRadius || 5000);
    
    return { 
      status: isCompliant ? 'compliant' : 'off-course', 
      distance: Math.round(dist),
      campaign: activeCampaign.title,
      limit: activeCampaign.coverageRadius || 5000
    };
  };
  useEffect(() => {
    // Maintenance loop
  }, []);

  const exportToCSV = (data: any[], fileName: string) => {
    try {
      setIsExtracting(true);
      console.log(`[Extraction] Processing request for: ${fileName}`);
      
      const sourceData = (data && data.length > 0) ? data : [
        { SYSTEM_MESSAGE: "EMPTY_SET_TEMPLATE", TIMESTAMP: new Date().toISOString(), INSTRUCTION: "Add data to the database to populate this report." }
      ];

      const allKeys = Array.from(new Set(sourceData.filter(i => !!i).flatMap(item => Object.keys(item || {}))));
      const rows = sourceData.map(item => {
        if (!item) return "";
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
      }).filter(r => !!r);

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
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        setIsExtracting(false);
        console.log(`[Extraction] Success: Exported ${rows.length} records.`);
      }, 1000);

    } catch (error) {
      setIsExtracting(false);
      console.error("[Extraction] Global Failure:", error);
      setOpFeedback({ message: "Extraction failed. Check browser permissions.", type: 'error' });
    }
  };

  const handleExtractionClick = (e: React.MouseEvent, data: any[], fileName: string) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Extraction button clicked", fileName);
    exportToCSV(data, fileName);
  };

  const filteredDrivers = (drivers || []).filter((d) => {
    const matchesSearch =
      (d.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.phone || "").includes(searchTerm) ||
      (d.vNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.gpsId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.city || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesArea = selectedArea === "ALL" || (d.city || "").toUpperCase() === selectedArea.toUpperCase();
    
    return matchesSearch && matchesArea;
  });

  return (
    <ErrorBoundary componentName="Admin Command Center">
      <div className="flex h-screen bg-[#f8fafc] text-slate-600 overflow-hidden relative">
      <AnimatePresence>
        {showPurgeConfirm && (
          <motion.div
            key="purge-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              key="purge-modal"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full border border-red-100"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
                <Trash2 className="text-red-500" size={32} />
              </div>
              <h3 className="text-2xl font-black uppercase text-slate-900 mb-2 italic">
                System Narrative Wipe
              </h3>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-relaxed mb-6">
                You are about to purge ALL operational data nodes and reset the network state. This action is irreversible.
              </p>
              
              <div className="space-y-4">
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPurgeConfirm(false)}
                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Abort
                  </button>
                  <button
                    onClick={executePurge}
                    disabled={isExtracting}
                    className="flex-[2] bg-red-500 text-white px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                  >
                    {isExtracting ? "PURGING..." : "EXECUTE WIPE"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {opFeedback && (
          <motion.div
            key="op-feedback-top"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "fixed top-6 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border text-[10px] font-black uppercase tracking-widest",
              opFeedback.type === 'success' ? "bg-white border-emerald-100 text-emerald-600" : "bg-white border-red-100 text-red-600"
            )}
          >
            {opFeedback.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
            {opFeedback.message}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="w-20 bg-slate-950 flex flex-col items-center py-8 gap-8 border-r border-slate-800 relative z-30 transition-all duration-300 hidden md:flex overflow-y-auto custom-scrollbar">
        <div className="flex flex-col gap-3">
          {[
            { id: "DASHBOARD", icon: Activity, title: "Overview" },
            { id: "MAP", icon: MapPin, title: "Live Tracking" },
            { id: "TERMINAL_HUB", icon: TerminalIcon, title: "Terminal Sync" },
            { id: "PRICING_APPROVALS", icon: Check, title: "Price Requests", badge: planProposals.length > 0 },
            { id: "CAMPAIGNS", icon: Monitor, title: "Ads Control" },
            { id: "MONITOR", icon: Smartphone, title: "Live Units", badge: liveScreensCount > 0 },
            { id: "TICKETS", icon: AlertCircle, title: "Support Hub" },
            { id: "PAYMENTS", icon: CreditCard, title: "Payments Registry" },
            { id: "FLEET", icon: Truck, title: "Fleet Matrix" },
            { id: "WITHDRAWALS", icon: Wallet, title: "Payouts" },
            { id: "NOTICES", icon: Gift, title: "Global Offers" },
            { id: "PACKAGES", icon: Zap, title: "Package Config" },
            { id: "STUDIO", icon: ImageIcon, title: "Canva Studio" },
            { id: "STUDIO_CONFIG", icon: ImageIcon, title: "Studio Settings" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === "STUDIO") {
                  onOpenStudio?.();
                } else {
                  setActiveTab(tab.id as any);
                }
              }}
              className={cn(
                "p-3 rounded-2xl transition-all relative group",
                activeTab === tab.id
                  ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                  : "text-slate-500 hover:bg-white/5 hover:text-white",
              )}
              title={tab.title}
            >
              <tab.icon size={20} />
              {activeTab === tab.id && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-amber-500 rounded-l-full translate-x-4"></div>
              )}
              {tab.badge && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]" />
              )}
            </button>
          ))}
        </div>

        <div className="mt-auto flex flex-col items-center gap-4 pb-4">
          {/* Gold Premium Seal Badge */}
          <div className="relative group flex flex-col items-center">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center animate-bounce shadow-md shadow-amber-500/5 cursor-help">
              <span className="text-[12px]">👑</span>
            </div>
            <div className="absolute left-full ml-4 px-3 py-2 bg-slate-900 border border-slate-800 text-white text-[8px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50">
              <span className="text-amber-400">👑 Premium Unlocked</span>
            </div>
          </div>

          {/* Vertical Theme Selector Chain */}
          <div className="flex flex-col items-center gap-1.5 p-1.5 bg-white/5 border border-white/10 rounded-2xl">
            {[
              { id: 'default', color: 'bg-amber-500', name: 'Amber' },
              { id: 'tokyo', color: 'bg-fuchsia-500', name: 'Neon' },
              { id: 'emerald', color: 'bg-emerald-500', name: 'Green' },
              { id: 'ocean', color: 'bg-cyan-500', name: 'Cyan' },
              { id: 'solar', color: 'bg-yellow-500', name: 'Solar' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => selectTheme(t.id as any)}
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all hover:scale-125 relative group",
                  selectedTheme === t.id ? "border-white" : "border-transparent opacity-50 hover:opacity-100"
                )}
                title={t.name + " Theme"}
              >
                <div className={cn("w-2.5 h-2.5 rounded-full", t.color)} />
                <div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 border border-slate-800 text-white text-[7px] font-black uppercase tracking-widest rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 whitespace-nowrap z-50">
                  {t.name}
                </div>
              </button>
            ))}
          </div>

          <div className="bg-white/5 p-2 rounded-xl border border-white/10 flex flex-col items-center gap-1 group relative">
            <span className="text-[7px] font-black uppercase text-slate-500 tracking-widest">
              Support
            </span>
            <a
              href="mailto:admin@autoads.in"
              className="text-slate-400 hover:text-white transition-colors"
              title="Contact Technical Support"
            >
              <AlertCircle size={16} />
            </a>
            <div className="absolute left-full ml-4 px-3 py-2 bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              Project: autoads-18b26
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-md border-t border-slate-200 px-6 flex items-center justify-between z-50 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <button
          onClick={() => setActiveTab("DASHBOARD")}
          className={cn(
            "p-2 rounded-xl transition-all",
            activeTab === "DASHBOARD"
              ? "bg-amber-500 text-slate-950"
              : "text-slate-500",
          )}
        >
          <Activity size={20} />
        </button>
        <button
          onClick={() => setActiveTab("MAP")}
          className={cn(
            "p-2 rounded-xl transition-all",
            activeTab === "MAP"
              ? "bg-amber-500 text-slate-950"
              : "text-slate-500",
          )}
        >
          <MapPin size={20} />
        </button>
        <button
          onClick={() => setActiveTab("PRICING_APPROVALS")}
          className={cn(
            "p-2 rounded-xl transition-all relative",
            activeTab === "PRICING_APPROVALS"
              ? "bg-amber-500 text-slate-950"
              : "text-slate-500",
          )}
        >
          <Check size={20} />
          {planProposals.length > 0 && (
            <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("CAMPAIGNS")}
          className={cn(
            "p-2 rounded-xl transition-all",
            activeTab === "CAMPAIGNS"
              ? "bg-amber-500 text-slate-950"
              : "text-slate-500",
          )}
        >
          <Monitor size={20} />
        </button>
        <button
          onClick={() => setShowMobileMenu(true)}
          className={cn(
            "p-2 rounded-xl transition-all",
            showMobileMenu ? "bg-amber-500 text-slate-950" : "text-slate-500",
          )}
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Admin Mobile Menu Drawer */}
      <AnimatePresence>
        {showMobileMenu && (
          <div key="mobile-menu-portal" className="fixed inset-0 z-[200] md:hidden">
            <motion.div
              key="mobile-menu-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileMenu(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              key="mobile-menu-drawer"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[3rem] p-8 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black italic uppercase text-slate-900">System Command</h3>
                <button onClick={() => setShowMobileMenu(false)} className="p-2 bg-slate-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="grid grid-cols-2 xs:grid-cols-3 gap-3 md:gap-4">
                {[
                  { id: "DASHBOARD", icon: Activity, title: "Overview" },
                  { id: "MAP", icon: MapPin, title: "Live Tracking" },
                  { id: "TERMINAL_HUB", icon: TerminalIcon, title: "Terminal Sync" },
                  { id: "PRICING_APPROVALS", icon: Check, title: "Price Requests" },
                  { id: "CAMPAIGNS", icon: Monitor, title: "Ads Control" },
                  { id: "MONITOR", icon: Smartphone, title: "Live Units" },
                  { id: "TICKETS", icon: AlertCircle, title: "Support Hub" },
                  { id: "PAYMENTS", icon: CreditCard, title: "Payments Registry" },
                  { id: "FLEET", icon: Truck, title: "Fleet Matrix" },
                  { id: "WITHDRAWALS", icon: Wallet, title: "Payouts" },
                  { id: "NOTICES", icon: Gift, title: "Global Offers" },
                  { id: "PACKAGES", icon: Zap, title: "Package Config" },
                  { id: "STUDIO", icon: ImageIcon, title: "Canva Studio" },
                  { id: "STUDIO_CONFIG", icon: ImageIcon, title: "Studio Settings" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === "STUDIO") {
                        onOpenStudio?.();
                      } else {
                        setActiveTab(item.id as any);
                      }
                      setShowMobileMenu(false);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-3 p-6 rounded-3xl border transition-all",
                      activeTab === item.id 
                        ? "bg-slate-900 border-slate-900 text-amber-500 shadow-xl" 
                        : "bg-slate-50 border-slate-100 text-slate-400"
                    )}
                  >
                    <item.icon size={24} />
                    <span className="text-[9px] font-black uppercase tracking-widest text-center">{item.title}</span>
                  </button>
                ))}
              </div>
              <button 
                onClick={() => onLogout()}
                className="w-full mt-8 p-6 bg-red-50 text-red-500 rounded-3xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3"
              >
                <LogOut size={20} /> KILL SESSION
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col overflow-hidden pb-20 md:pb-0 relative bg-white">
        {/* Floating Role Switch Button Removed - Unified in App.tsx */}

        <header className="h-14 md:h-16 border-b border-slate-100 flex items-center justify-between px-4 md:px-8 bg-white shrink-0 sticky top-0 z-40">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-200">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              Cloud Sync Active
            </div>
            <div className="md:hidden h-16 flex items-center justify-center p-2"></div>
            <div>
              <h2 className="text-[10px] md:text-sm font-black text-slate-900 uppercase tracking-[0.2em] leading-none mb-0.5">
                Auto <span className="text-amber-500 italic">Ads</span>
              </h2>
              <p className="text-[6px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none flex items-center gap-1">
                by <span className="text-slate-900">Mayaan Group</span>
              </p>
              <div className="flex sm:hidden items-center gap-1 mt-1">
                <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">
                  Network Live
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationCenter role="ADMIN" userId={auth.currentUser?.uid} onNavigateToTab={(tab) => setActiveTab(tab as any)} />
            <button
              onClick={() => setShowPurgeConfirm(true)}
              className="hidden md:flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-red-400 shadow-lg shadow-red-500/10"
            >
              <Trash2 size={14} />
              Wipe Database
            </button>
            <button
              onClick={(e) => handleExtractionClick(e, drivers, "Global_Status_Report")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full border transition-all text-[8px] md:text-[9px] font-black uppercase tracking-widest shadow-lg",
                isExtracting 
                  ? "bg-amber-500 text-slate-950 animate-pulse border-amber-600" 
                  : "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500 hover:text-slate-950"
              )}
              disabled={isExtracting}
              title="Global Network Extraction"
            >
              {isExtracting ? (
                <RefreshCw size={12} className="animate-spin" />
              ) : (
                <Download size={12} className="md:w-3.5 md:h-3.5" />
              )}
              <span className="hidden xs:inline">{isExtracting ? 'Extracting...' : 'Extraction'}</span>
            </button>
            <div className="hidden lg:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]"></span>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                {(liveUnitsCount || 0).toLocaleString()} Screens Online
              </span>
            </div>
            <div className="w-8 h-8 md:w-9 md:h-9 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center text-slate-400">
              <Search size={16} />
            </div>
            <button
              onMouseDown={startHold}
              onMouseUp={endHold}
              onMouseLeave={endHold}
              onTouchStart={startHold}
              onTouchEnd={endHold}
              className="relative w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center bg-slate-900 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all group shadow-lg overflow-hidden"
              title="Hold to Nuclear Purge"
            >
              {holdPurge > 0 && (
                <div 
                  className="absolute bottom-0 left-0 h-full bg-red-500/40 transition-all pointer-events-none"
                  style={{ width: `${holdPurge}%` }}
                />
              )}
              <Trash2 size={16} className="relative z-10 group-hover:scale-125 transition-transform" />
            </button>
            <button
              onClick={onLogout}
              className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-10 space-y-6 md:space-y-12 custom-scrollbar">
          {showRoadmap ? (
            <RoadmapChart onClose={() => setShowRoadmap(false)} />
          ) : activeTab === "DASHBOARD" ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {(drivers.length === 0 && campaigns.length === 0) ? (
                <div className="col-span-full py-20 bg-slate-50 border border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center gap-4">
                  <Activity className="text-slate-200 animate-pulse" size={48} />
                  <div className="text-center">
                    <h3 className="text-sm font-black text-slate-400 uppercase italic">Awaiting Network Synchronization</h3>
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-1">Deploy terminals or approve drivers to see metrics</p>
                  </div>
                </div>
              ) : [
                {
                  label: "Active Campaigns",
                  value: (campaigns || []).filter((c) =>
                    ["active", "ACTIVE", "LIVE"].includes(c.status),
                  ).length,
                  delta: "Live Now",
                  color: "amber",
                  icon: <Monitor />,
                },
                {
                  label: "Cloud Units Ready",
                  value: (drivers || []).filter((d) => 
                    ["ACTIVE", "active"].includes(d.status)
                  ).length,
                  delta: "Approved Fleet",
                  color: "blue",
                  icon: <ShieldCheck />,
                },
                {
                  label: "Total Revenue",
                  value: `₹${(totalSuccessfulRevenue || 0).toLocaleString()}`,
                  delta: "Cumulative",
                  color: "slate",
                  icon: <IndianRupee />,
                },
                {
                  label: "Online Now",
                  value: liveUnitsCount || 0,
                  delta: "Real-time Pulse",
                  color: (liveUnitsCount || 0) > 0 ? "amber" : "slate",
                  icon: <Activity />,
                },
              ].map((stat) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 }}
                    className="bg-slate-950 border border-white/10 p-3 md:p-6 rounded-2xl md:rounded-[2.5rem] group hover:border-amber-500/50 shadow-sm hover:shadow-xl hover:shadow-amber-500/5 transition-all cursor-pointer relative overflow-hidden"
                  >
                    <div className="absolute right-0 top-0 w-24 h-24 bg-amber-500/5 blur-2xl rounded-full -mr-12 -mt-12 group-hover:bg-amber-500/10 transition-colors" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div
                          className={cn(
                            "p-1.5 md:p-3 rounded-xl md:rounded-2xl transition-colors",
                            stat.color === "amber"
                              ? "bg-amber-500 text-slate-950"
                              : "bg-white/10 text-white",
                          )}
                        >
                          {React.cloneElement(stat.icon as any, { size: 18 })}
                        </div>
                        <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-amber-500">
                          {stat.label}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="text-xl md:text-2xl font-black text-white truncate italic tracking-tight">
                          {stat.value}
                        </h3>
                        <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-600 opacity-60">
                          {stat.delta}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 group">
                    <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl transition-all h-full">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm md:text-base font-black text-slate-900 uppercase italic">
                          Live Network Performance
                        </h3>
                        <p className="text-[10px] md:text-[12px] text-slate-400 uppercase tracking-widest font-black opacity-60">
                          Active Metric Synchronization
                        </p>
                      </div>
                    </div>
                    <div className="h-[250px] md:h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={dynamicChartData}
                          margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id="colorRev"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#f59e0b"
                                stopOpacity={0.3}
                              />
                              <stop
                                offset="95%"
                                stopColor="#f59e0b"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#f1f5f9"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="name"
                            stroke="#94a3b8"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                          />
                          <YAxis
                            stroke="#94a3b8"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) =>
                              `₹${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`
                            }
                            dx={-10}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#fff",
                              border: "none",
                              borderRadius: "16px",
                              fontSize: "11px",
                              fontWeight: "900",
                              boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
                              padding: "12px",
                            }}
                            itemStyle={{ color: "#f59e0b" }}
                          />
                          <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="#f59e0b"
                            fillOpacity={1}
                            fill="url(#colorRev)"
                            strokeWidth={4}
                            dot={{
                              r: 6,
                              fill: "#f59e0b",
                              strokeWidth: 3,
                              stroke: "#fff",
                            }}
                            activeDot={{ r: 8, strokeWidth: 0 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="bg-white p-3 md:p-4 rounded-2xl border border-slate-100 shadow-sm flex-1">
                    <div className="flex items-center justify-between mb-2">
                       <h3 className="text-[10px] font-black text-slate-900 uppercase italic">
                        Node Activation
                      </h3>
                    </div>
                    <div className="space-y-6">
                      {dynamicChartData.length > 0 ? (
                        dynamicChartData.map((item) => (
                          <div key={item.name} className="space-y-2">
                            <div className="flex justify-between text-[10px] md:text-[11px] font-black uppercase tracking-widest">
                              <span className="text-slate-500">{item.name}</span>
                              <span className="text-slate-950 font-mono italic">
                                {item.autos} Units
                              </span>
                            </div>
                            <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{
                                  width:
                                    drivers.length > 0
                                      ? `${(item.autos / drivers.length) * 100}%`
                                      : "0%",
                                }}
                                className="h-full bg-amber-500 rounded-full shadow-[0_0_8px_#f59e0b]"
                              />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-12 flex flex-col items-center justify-center opacity-20">
                          <Database size={32} />
                          <p className="text-[9px] font-black uppercase tracking-widest mt-4">No Distribution Data</p>
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={(e) => handleExtractionClick(e, drivers, "Global_Status_Report")}
                      disabled={isExtracting}
                      className={cn(
                        "w-full mt-6 py-4 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] shadow-xl transition-all",
                        isExtracting 
                          ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                          : "bg-slate-950 text-white hover:bg-amber-500 hover:text-slate-950 active:scale-95"
                      )}
                    >
                      {isExtracting ? "PROCESSING..." : "GENERATE REPORT"}
                    </button>
                  </div>
                  <div className="bg-amber-500 p-4 md:p-6 rounded-2xl shadow-xl shadow-amber-500/10 text-slate-950 flex flex-col justify-between overflow-hidden relative group">
                    <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                      <Activity size={120} />
                    </div>
                    <div className="relative z-10">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">
                        Fleet Pulse
                      </p>
                      <h4 className="text-3xl font-black italic">
                        NETWORK
                        <br />
                        ACCELERATED
                      </h4>
                    </div>
                    <div className="mt-8 relative z-10">
                      {drivers.length === 0 ? (
                        <div className="flex items-center gap-2">
                           <span className="w-2 h-2 bg-slate-800 rounded-full"></span>
                           <span className="text-[11px] font-black uppercase opacity-40">
                             Awaiting Active Screens...
                           </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-slate-950 rounded-full animate-ping"></span>
                          <span className="text-[11px] font-black uppercase">
                            Updating Active Screens...
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : activeTab === "CAMPAIGNS" ? (
            <div className="space-y-6">
              <div className="bg-slate-900 p-4 md:p-6 rounded-2xl text-white relative overflow-hidden shadow-2xl">
                <div className="absolute right-0 top-0 w-64 h-64 bg-amber-500/10 blur-3xl rounded-full" />
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg md:text-2xl font-black italic uppercase text-amber-500">
                      Campaign Matrix
                    </h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Global Fleet Deployment Control
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={(e) => handleExtractionClick(e, campaigns, "Campaign_Deployment_Records")}
                      disabled={isExtracting}
                      className="bg-white/10 hover:bg-white/20 text-white px-5 py-3 rounded-xl border border-white/10 text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isExtracting ? <RefreshCw size={14} className="animate-spin text-amber-500" /> : <Download size={14} className="text-amber-500" />}
                      {isExtracting ? "Extracting..." : "Extract Matrix"}
                    </button>
                    {(activeTab === "CAMPAIGNS" || activeTab === "REVIEWS") && (
                      <div className="hidden sm:flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-[10px] font-black text-white uppercase tracking-widest">
                            {
                              campaigns.filter((c) => c.status === "ACTIVE")
                                .length
                            }
                          </p>
                          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                            Active nodes
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-amber-500">
                          <Zap size={24} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                    <h3 className="text-xs font-black text-slate-900 uppercase italic">
                      Live Deployment Inventory
                    </h3>
                    <span className="text-[10px] font-black text-slate-400">
                      {campaigns.filter((c) => c.status === "ACTIVE" && !c.title.toLowerCase().includes('showcase')).length}{" "}
                      Units
                    </span>
                  </div>
                  <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto">
                    {campaigns
                      .filter((c) => c.status === "ACTIVE" && !c.title.toLowerCase().includes('showcase'))
                      .map((c) => (
                        <div
                          key={c.id}
                          className={cn(
                            "p-6 flex items-center justify-between hover:bg-slate-50 transition-all cursor-pointer group",
                            selectedCampaign?.id === c.id &&
                              "bg-amber-50 border-r-4 border-amber-500",
                          )}
                          onClick={() => setSelectedCampaign(c)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-12 bg-slate-900 rounded-xl overflow-hidden relative border border-slate-800">
                              {c?.mediaType === "IMAGE" ? (
                                <img
                                  src={c.mediaUrl}
                                  alt=""
                                  className="w-full h-full object-cover opacity-60"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Video size={16} className="text-slate-600" />
                                </div>
                              )}
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-900 uppercase leading-none mb-1">
                                {c.title}
                              </h4>
                              {(() => {
                                const exp = getCampaignExpiration(c);
                                if (!exp) return null;
                                return (
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span className={cn(
                                      "text-[8px] font-black px-1.5 py-0.5 rounded tracking-wider leading-none",
                                      exp.expired ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600 animate-pulse"
                                    )}>
                                      {exp.timeLeftStr}
                                    </span>
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                      (Exp: {exp.formattedDate})
                                    </span>
                                  </div>
                                );
                              })()}
                              <div className="flex flex-col gap-1.5">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                  Active Area: <span className="text-slate-900">{c.targetCity}, {c.targetState}</span>
                                </p>
                                {c.assignedDrivers && c.assignedDrivers.length > 0 && (
                                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mb-1">Live Terminals:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {c.assignedDrivers.map((driverId: string) => (
                                        <span key={driverId} className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-black text-slate-700 shadow-sm">
                                          {driverId.slice(-4).toUpperCase()}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCampaign(c.id);
                              }}
                              className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                              title="Delete Campaign"
                            >
                              <Trash2 size={16} />
                            </button>
                            <ChevronRight
                              size={16}
                              className={cn(
                                "text-slate-300 transition-transform",
                                selectedCampaign?.id === c.id &&
                                  "translate-x-2 text-amber-500",
                              )}
                            />
                          </div>
                        </div>
                      ))}
                    {campaigns.filter((c) => c.status === "ACTIVE").length ===
                      0 && (
                      <div className="py-20 text-center space-y-4">
                        <Monitor size={48} className="mx-auto text-slate-100" />
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">
                          No active deployments detected.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div
                  className={cn(
                    "bg-white rounded-[2rem] border border-slate-100 shadow-xl flex flex-col transition-all relative overflow-hidden min-h-[500px]",
                  )}
                >
                  {!selectedCampaign ? (
                    <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 md:p-8 text-center space-y-4">
                      <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-[2rem] flex items-center justify-center animate-pulse">
                        <MousePointer2 size={32} />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-sm font-black text-slate-900 uppercase">
                          Selection Required
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] max-w-[200px]">
                          Select a campaign from the deployment inventory to
                          configure node targeting.
                        </p>
                      </div>
                    </div>
                  ) : null}
                  <div className="p-4 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setSelectedCampaign(null)}
                        className="p-2 bg-white text-slate-400 hover:text-slate-900 rounded-xl border border-slate-200 transition-all flex items-center gap-2"
                      >
                         <ArrowLeft size={16} />
                         <span className="text-[9px] font-black uppercase tracking-widest hidden xs:inline">Back</span>
                      </button>
                      <h3 className="text-xs font-black text-slate-900 uppercase italic">
                        Node Activation Desk
                      </h3>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-600 text-[8px] font-black uppercase rounded-lg">
                      Cluster: {selectedCampaign?.title.slice(0, 10)}
                    </span>
                  </div>
                  <div className="p-4 border-b border-slate-50 bg-slate-50/10 space-y-4">
                    {/* Media Edit Section */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Media Content & Type</h4>
                        {!isEditingMedia ? (
                          <button 
                            onClick={() => {
                              setEditMediaUrl(selectedCampaign?.mediaUrl || selectedCampaign?.assetUrl || '');
                              setEditMediaType(selectedCampaign?.mediaType || 'IMAGE');
                              setIsEditingMedia(true);
                            }}
                            className="text-[8px] font-black text-amber-600 uppercase hover:underline"
                          >
                            Edit Media link
                          </button>
                        ) : (
                          <button 
                            onClick={() => setIsEditingMedia(false)}
                            className="text-[8px] font-black text-slate-400 uppercase hover:underline"
                          >
                            Cancel
                          </button>
                        )}
                      </div>

                      {isEditingMedia ? (
                        <div className="space-y-3">
                          <div className="relative group/edit">
                            <input
                              type="file"
                              accept="image/*,video/*"
                              onChange={(e) => setEditMediaFile(e.target.files?.[0] || null)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className={cn(
                              "p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all",
                              editMediaFile ? "border-amber-500 bg-amber-50/10" : "border-slate-100 bg-slate-50/50"
                            )}>
                              {editMediaFile ? (
                                <>
                                  <Check size={20} className="text-amber-500" />
                                  <p className="text-[9px] font-black uppercase text-slate-900 truncate max-w-full px-4">{editMediaFile.name}</p>
                                </>
                              ) : (
                                <>
                                  <RefreshCw size={20} className="text-slate-300" />
                                  <p className="text-[9px] font-black uppercase text-slate-400">Swap with New File</p>
                                </>
                              )}
                            </div>
                          </div>

                          {!editMediaFile && (
                            <>
                              <div className="flex items-center gap-4 py-1">
                                <div className="flex-1 h-px bg-slate-100" />
                                <span className="text-[7px] font-black text-slate-300 uppercase">OR</span>
                                <div className="flex-1 h-px bg-slate-100" />
                              </div>
                              <input 
                                type="text"
                                value={editMediaUrl}
                                onChange={(e) => setEditMediaUrl(e.target.value)}
                                placeholder="External Asset URL..."
                                className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-[10px] font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-mono"
                              />
                            </>
                          )}
                          
                          <div className="flex gap-2">
                             <button 
                               onClick={() => setEditMediaType('IMAGE')}
                               className={cn(
                                 "flex-1 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all",
                                 editMediaType === 'IMAGE' ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-400 border-slate-100"
                               )}
                             >
                               Image
                             </button>
                             <button 
                               onClick={() => setEditMediaType('VIDEO')}
                               className={cn(
                                 "flex-1 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all",
                                 editMediaType === 'VIDEO' ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-400 border-slate-100"
                               )}
                             >
                               Video
                             </button>
                          </div>
                          
                          {editUploadProgress > 0 && editUploadProgress < 100 && (
                            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                               <div className="h-full bg-amber-500" style={{ width: `${editUploadProgress}%` }} />
                            </div>
                          )}

                          <button 
                            onClick={handleUpdateMedia}
                            disabled={isUpdatingMedia}
                            className="w-full py-3 bg-amber-500 text-slate-950 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/10 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                          >
                            {isUpdatingMedia ? 'Processing...' : 'Secure Node Asset'}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-10 bg-slate-900 rounded-lg overflow-hidden border border-slate-200">
                             {selectedCampaign?.mediaType === 'IMAGE' ? (
                               <img src={getSafeUrl(selectedCampaign?.mediaUrl)} className="w-full h-full object-cover opacity-60" />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center"><Video size={14} className="text-slate-600" /></div>
                             )}
                          </div>
                          <div className="flex-1 min-w-0">
                             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-tight truncate">
                               {selectedCampaign?.mediaUrl || 'NOT LINKED'}
                             </p>
                             <p className="text-[7px] font-bold text-amber-600 uppercase mt-0.5">{selectedCampaign?.mediaType || 'NO'} ASSET ACTIVE</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search
                          size={14}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          type="text"
                          placeholder="Search nodes by name, number, city..."
                          className="w-full bg-white border border-slate-200 p-4 pl-12 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all shadow-sm h-14"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <select
                        className="bg-white border border-slate-200 px-4 rounded-2xl text-[9px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-amber-500/20 h-14"
                        value={selectedArea}
                        onChange={(e) => setSelectedArea(e.target.value)}
                      >
                        <option value="ALL">All Areas</option>
                        {Array.from(new Set(drivers.map(d => d.city).filter(Boolean))).map(city => (
                          <option key={city} value={city}>{city?.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto max-h-[400px] p-6 space-y-2">
                    {filteredDrivers.map((d) => (
                      <label
                        key={d.uid}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border",
                          selectedDriverIds.includes(d.uid)
                            ? "bg-amber-50 border-amber-200"
                            : "bg-white border-transparent hover:bg-slate-50",
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                            checked={selectedDriverIds.includes(d.uid)}
                            onChange={(e) =>
                              e.target.checked
                                ? setSelectedDriverIds([
                                    ...selectedDriverIds,
                                    d.uid,
                                  ])
                                : setSelectedDriverIds(
                                    selectedDriverIds.filter(
                                      (id) => id !== d.uid,
                                    ),
                                  )
                            }
                          />
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-amber-500 group-hover:text-white transition-all">
                              <Truck size={20} />
                            </div>
                            <div>
                              <span className="text-[11px] font-black uppercase text-slate-900 block leading-none">
                                {d.name}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 uppercase tracking-widest">
                                  AUTO NO: {d.vNo || 'NOT SET'}
                                </span>
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                  {d.city || 'GLOBAL'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            d.status === "active"
                              ? "bg-green-500"
                              : "bg-slate-300",
                          )}
                        />
                      </label>
                    ))}
                  </div>
                  <div className="p-8 bg-slate-950 border-t border-slate-800">
                    <button
                      onClick={handleBulkAssign}
                      disabled={isAssigning || selectedDriverIds.length === 0}
                      className="w-full py-5 bg-amber-500 text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl shadow-amber-500/10 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 italic"
                    >
                      {isAssigning
                        ? "Synchronizing Cluster..."
                        : `Deploy to ${selectedDriverIds.length} Selective Units`}
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "REVIEWS" ? (
    <div className="space-y-8">
      <div className="bg-amber-500 p-6 md:p-8 rounded-[2rem] shadow-xl shadow-amber-500/10 text-slate-950 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 blur-3xl rounded-full -mr-16 -mt-16" />
        <div className="relative z-10">
          <h2 className="text-2xl md:text-5xl font-black italic uppercase leading-none">
            Quality Control
          </h2>
          <p className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.3em] mt-3 opacity-60">
            Pending Global Verification Queue
          </p>
        </div>
      </div>

      {/* Driver Verification Section */}
      <div className="space-y-4 pb-12">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Pending Driver Onboarding ({drivers.filter(d => d.status === 'pending_verification').length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {drivers.filter(d => d.status === 'pending_verification').map((d) => (
            <motion.div
              key={d.uid}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all flex flex-col group"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-950 rounded-2xl overflow-hidden relative border border-slate-800">
                    <img 
                      src={d.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${d.uid}`} 
                      alt="" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-900 uppercase leading-none mb-1">{d.name}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{d.city || 'Unknown Location'}</p>
                    {d.phone && <p className="text-[10px] font-bold font-mono text-slate-500 mt-1 uppercase">Phone: {d.phone}</p>}
                    {d.email && <p className="text-[9px] font-medium font-mono text-slate-400 truncate max-w-[150px]">{d.email}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {[
                    { label: 'Aadhaar', key: 'aadharPhoto' },
                    { label: 'RC', key: 'rcPhoto' },
                    { label: 'License', key: 'dlPhoto' },
                    { label: 'PAN', key: 'panPhoto' },
                    { label: 'Insurance', key: 'insurancePhoto' },
                    { label: 'Selfie', key: 'profileImage' }
                  ].map(doc => (
                    <div key={doc.key} className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex flex-col items-center justify-center gap-1">
                      <span className="text-[7px] font-black uppercase text-slate-400">{doc.label}</span>
                      {((d as any)[doc.key] || (doc.key === 'aadharPhoto' && (d as any).documents?.aadhaar) || (doc.key === 'dlPhoto' && (d as any).documents?.drivingLicense) || (doc.key === 'profileImage' && (d as any).documents?.selfie)) ? (
                        <Check size={12} className="text-green-500" />
                      ) : (
                        <X size={12} className="text-slate-300" />
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => {
                      const newId = d.terminalId || `DEVICE-${Math.floor(1000 + Math.random() * 9000)}`;
                      const newKey = d.accessKey || Math.floor(1000 + Math.random() * 9000).toString();
                      firebaseService.updateDriverProfile(d.id, { 
                        status: 'active', 
                        isVerified: true,
                        kycStatus: 'APPROVED',
                        payoutEnabled: true,
                        adminApproved: true,
                        terminalId: newId,
                        accessKey: newKey,
                        provisionStatus: 'PROVISIONED'
                      });
                      
                      // Auto-approve the agreement if they are being quick approved
                      firebaseService.updateDriverAgreement(d.id, {
                        agreementAccepted: true,
                        acceptedAt: new Date().toISOString(),
                        version: '1.0',
                        ipAddress: 'admin-provisioned'
                      });
                      showToast("Driver Approved & Terminal Provisioned", 'success');
                    }}
                    className="py-4 bg-slate-900 text-amber-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 font-sans"
                  >
                    Quick Approve
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          {drivers.filter(d => d.status === 'pending_verification').length === 0 && (
            <div className="col-span-full py-12 bg-slate-50 border border-dashed border-slate-200 rounded-[2rem] text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No pending driver verifications</p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4 pt-8">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Campaign Submissions ({campaigns.filter(c => c.status === 'PENDING').length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {campaigns.filter((c) => c.status === "PENDING").length > 0 ? (
            campaigns
              .filter((c) => c.status === "PENDING")
                    .map((c) => (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all flex flex-col h-full group"
                      >
                        <div className="h-56 bg-slate-950 relative overflow-hidden shrink-0 italic">
                          {c?.mediaType === "IMAGE" ? (
                            <img
                              src={c.mediaUrl}
                              alt=""
                              className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-all duration-1000"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900">
                              <Video className="text-slate-700 w-16 h-16 mb-4" />
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                                Video Stream Initialization
                              </span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                          <div className="absolute top-6 right-6 flex flex-col items-end gap-2">
                            <span className="bg-amber-500/20 backdrop-blur-md border border-amber-500/30 text-amber-500 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-2xl">
                              {(() => {
                                if (!c.paymentReceived) return "Awaiting Payment";
                                if ((c as any).needDesigner && !(c as any).designerApproved) return "Waiting for Designer/User Satisfaction";
                                if (c.mediaReceived || c.mediaUrl || c.assetUrl) return "Admin: Recv Payment & Media Ready";
                                return "Awaiting Final Review";
                              })()}
                            </span>
                            {(c as any).needDesigner && (
                              <span className="bg-blue-500/20 backdrop-blur-md border border-blue-500/30 text-blue-500 px-3 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest">
                                Designer Selected
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="p-4 md:p-6 flex flex-col flex-1">
                          <div className="flex-1 space-y-2">
                            <h4 className="text-lg font-black text-slate-900 uppercase leading-none truncate">
                              {c.title}
                            </h4>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
                              ID: {c.id?.slice(-8).toUpperCase()}
                            </p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                              Requested Lifespan: <span className="text-slate-900 font-extrabold">{c.durationDays || 30} Days</span>
                            </p>
                            <div className="flex flex-wrap gap-2 pt-2">
                               <div className={cn(
                                 "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest border",
                                 c.paymentReceived ? "bg-green-50 text-green-500 border-green-100" : "bg-red-50 text-red-500 border-red-100"
                               )}>
                                  {c.paymentReceived ? "PAID" : "UNPAID"}
                               </div>
                               <div className={cn(
                                 "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest border",
                                 (c.mediaReceived || c.mediaUrl || c.assetUrl) ? "bg-green-50 text-green-500 border-green-100" : "bg-amber-50 text-amber-600 border-amber-100"
                               )}>
                                  {(c.mediaReceived || c.mediaUrl || c.assetUrl) ? "READY" : "PENDING"}
                               </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 mt-8">
                            <button
                              onClick={() => handleRejectCampaign(c.id!)}
                              className="py-4 border border-slate-100 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:border-red-100 transition-all"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleApproveCampaign(c.id!)}
                              className="py-4 bg-slate-900 text-amber-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                            >
                              Approve
                            </button>
                          </div>
                          <button
                            onClick={() => handleDeleteCampaign(c.id!)}
                            className="w-full mt-3 py-3 text-slate-400 hover:text-red-500 transition-colors text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                          >
                            <Trash2 size={12} />
                            Purge Submission
                          </button>
                        </div>
                      </motion.div>
                    ))
                ) : (
                  <div className="col-span-full py-24 bg-white border border-slate-50 border-dashed rounded-[3rem] flex flex-col items-center justify-center text-slate-200 gap-6 grayscale">
                    <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center">
                      <Monitor size={40} className="opacity-20" />
                    </div>
                    <div className="text-center space-y-1">
                      <h4 className="text-sm font-black text-slate-400 uppercase italic">
                        Queue Equilibrium Reached
                      </h4>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                        All pending submissions have been processed.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === "PRICING_APPROVALS" ? (
          <div className="space-y-8">
            <div className="bg-slate-900 p-8 rounded-[3rem] text-white relative overflow-hidden shadow-2xl border border-slate-800">
               <div className="absolute right-0 top-0 w-64 h-64 bg-amber-500/10 blur-3xl rounded-full" />
               <div className="relative z-10">
                  <h2 className="text-3xl font-black italic uppercase text-amber-500">Price Change Requests</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Designer & Base Pricing Approvals Queue</p>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
               {planProposals.length === 0 ? (
                 <div className="col-span-full py-20 bg-slate-50 border border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center gap-4">
                    <Check className="text-slate-200" size={48} />
                    <h3 className="text-sm font-black text-slate-400 uppercase italic">All Pricing Synced</h3>
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-1">No pending price proposals from support team</p>
                 </div>
               ) : (
                 planProposals.map((prop) => {
                   const plan = plans.find(p => p.id === prop.planId);
                   return (
                     <motion.div 
                       key={prop.id}
                       initial={{ opacity: 0, scale: 0.95 }}
                       animate={{ opacity: 1, scale: 1 }}
                       className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-6 relative group"
                     >
                        <div className="flex items-center justify-between">
                           <div className="bg-amber-500/10 text-amber-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                              {prop.type === 'designerPrice' ? 'Designer Rate' : prop.type === 'videoMakerPrice' ? 'Video Rate' : 'Base Rate'}
                           </div>
                           <span className="text-[10px] font-bold text-slate-400">{prop.createdAt?.toDate?.()?.toLocaleDateString() || 'Today'}</span>
                        </div>
                        
                        <div>
                           <h3 className="text-xl font-black text-slate-900 uppercase italic leading-none">{plan?.name || prop.planId}</h3>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Proposed by: {prop.proposedBy}</p>
                        </div>

                        <div className="flex items-baseline gap-4 py-4 bg-slate-50 rounded-2xl px-6">
                           <div className="flex-1">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Proposed</p>
                              <p className="text-2xl font-black text-amber-500 italic">₹{prop.newValue || prop.newPrice}</p>
                           </div>
                           <div className="w-px h-10 bg-slate-200" />
                           <div className="flex-1">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Current</p>
                              <p className="text-2xl font-black text-slate-300 italic">₹{prop.type === 'designerPrice' ? plan?.designerPrice : prop.type === 'videoMakerPrice' ? plan?.videoMakerPrice : plan?.price}</p>
                           </div>
                        </div>

                        <div className="flex gap-3">
                           <button 
                             onClick={() => handleRejectPlan(prop.id)}
                             className="flex-1 px-4 py-3 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                           >
                              Reject
                           </button>
                           <button 
                             onClick={() => handleApprovePlan(prop.id, prop.planId, prop.newValue || prop.newPrice, prop.type || 'price')}
                             className="flex-[2] bg-amber-500 text-slate-950 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all"
                           >
                              Approve Rate
                           </button>
                        </div>
                     </motion.div>
                   );
                 })
               )}
            </div>
          </div>
        ) : activeTab === "TERMINAL_HUB" ? (
          <div className="space-y-8 pb-20">
            {/* Header Stats From Screenshot */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Active Campaigns', value: campaigns.filter(c => c.status === 'ACTIVE').length, sub: 'Live Now', icon: Monitor },
                { label: 'Cloud Units Ready', value: drivers.filter(d => d.status === 'active').length, sub: 'Approved Fleet', icon: ShieldCheck },
                { label: 'Total Revenue', value: `₹${totalSuccessfulRevenue.toLocaleString()}`, sub: 'Cumulative', icon: IndianRupee },
                { label: 'Online Now', value: liveUnitsCount, sub: 'Real-time Pulse', icon: Activity }
              ].map((stat) => (
                <div key={stat.label} className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
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
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 italic flex flex-wrap items-center gap-2">
                      <span className="text-slate-900">SYSTEM ARCHITECTURE:</span> Every driver requires a Provisioned Terminal to run Ad Campaigns.
                      <span className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
                      <span className="text-slate-500 underline decoration-slate-200">NOT ASSIGNED:</span> Terminal hardware logic has not been linked to this driver profile yet.
                      <span className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
                      <span className="text-amber-600 font-bold">AWAITING PROVISIONING:</span> Terminal ID generated but synchronization with physical display unit is pending.
                    </p>
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
                {drivers.filter(d => (d.terminalId || '').toUpperCase().includes(searchTerm.toUpperCase())).map((d) => {
                  const status = liveStatus.find(s => s.terminalId === d.terminalId);
                  const isOnline = status && (Date.now() - (status.updatedAt?.toMillis?.() || 0) < 60000);
                  
                  return (
                    <motion.div
                      key={d.uid}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8 space-y-6 relative group overflow-hidden"
                    >
                      {/* Status Badge */}
                      <div className="absolute top-6 right-6 flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-slate-100 shadow-sm">
                        <div className={cn("w-1.5 h-1.5 rounded-full", isOnline ? "bg-green-500 animate-pulse" : "bg-slate-300")} />
                        <span className="text-[8px] font-black uppercase text-slate-500">
                          {isOnline ? "OPERATIONAL" : "DISCONNECTED"}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Hardware Instance</p>
                        <div className="flex items-center gap-3">
                          <h4 className="text-xl font-black text-slate-900 font-mono tracking-normal">
                             {d.terminalId || "UNASSIGNED"}
                          </h4>
                          {!d.terminalId && (
                            <button 
                              onClick={() => {
                                const newId = `DEVICE-${Math.floor(1000 + Math.random() * 9000)}`;
                                const newKey = Math.floor(1000 + Math.random() * 9000).toString();
                                firebaseService.updateDriverProfile(d.uid, { 
                                  terminalId: newId, 
                                  accessKey: newKey,
                                  provisionStatus: 'PROVISIONED' 
                                })
                                  .then(() => showToast("Terminal Provisioned", 'info'))
                                  .catch(e => showToast(e.message, 'error'));
                              }}
                              className="text-[8px] font-black bg-amber-500 text-slate-950 px-2 py-1 rounded-md uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                            >
                              Gen UID
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Live Screen Preview */}
                      {status?.currentAdImage && (
                        <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner group/screen">
                          <img 
                            src={getSafeUrl(status.currentAdImage)} 
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
                          {!d.accessKey && (
                            <p className="text-[7px] font-bold text-red-400 uppercase mt-1">Awaiting Provisioning</p>
                          )}
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                          <div className="flex flex-col">
                            <p className={cn(
                              "text-[10px] font-black uppercase",
                              d.provisionStatus === 'ACTIVE' ? "text-green-600" : "text-amber-500"
                            )}>
                              {d.provisionStatus || 'NOT ASSIGNED'}
                            </p>
                            <p className="text-[6px] font-bold text-slate-400 mt-0.5 leading-tight">
                              {d.provisionStatus === 'ACTIVE' ? "Device Fully Synced" : 
                               d.provisionStatus === 'PROVISIONED' ? "Awaiting First Connection" :
                               "Pending Admin Provisioning"}
                            </p>
                          </div>
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
                          onClick={async () => {
                            const loc = driverLocations.find(l => l.driverId === d.uid);
                            if(loc && loc.lat && loc.lng && loc.lat !== 0) {
                               setMapCenter([loc.lat, loc.lng]);
                               setMapZoom(16);
                               handleFetchDriverHistory(d.uid);
                               setActiveTab("MAP");
                            } else {
                               try {
                                 showToast("No active fix. Fetching last known...", 'info');
                                 const logs = await firebaseService.getLocationLogs(d.uid);
                                 const valid = logs.filter((l: any) => l.lat && l.lng && l.lat !== 0);
                                 if (valid.length > 0) {
                                   const last = valid[valid.length - 1];
                                   setMapCenter([last.lat, last.lng]);
                                   setMapZoom(16);
                                   setSelectedDriverHistory(valid);
                                   setActiveTab("MAP");
                                 } else {
                                   showToast("No telemetry data available.", 'error');
                                 }
                               } catch (e) {
                                 showToast("Sync Error.", 'error');
                               }
                            }
                          }}
                          className="p-4 bg-amber-500 text-slate-950 rounded-2xl hover:scale-105 transition-all shadow-lg shadow-amber-500/20"
                          title="Track on Map"
                        >
                          <MapPin size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            if(window.confirm(`Revoke access for Terminal ${d.terminalId}?`)) {
                              firebaseService.revokeTerminal(d.terminalId!, d.uid)
                                .then(() => showToast("Terminal credentials revoked.", 'info'))
                                .catch(e => showToast(e.message, 'error'));
                            }
                          }}
                          className="p-4 border border-slate-200 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      
                      {d.terminalId && (
                        <div className="flex gap-2">
                           <button 
                               onClick={() => setNetworkConfigTarget(d.terminalId)}
                               className="flex-1 py-3 bg-amber-50 text-amber-600 border border-amber-200 rounded-2xl text-[8px] font-black uppercase tracking-[0.2em] hover:bg-amber-100 transition-colors"
                           >
                              Config WiFi
                           </button>
                           {isOnline && (
                             <button 
                                 onClick={() => {
                                   if (window.confirm("Restart this device remotely?")) {
                                     const termRefId = terminals.find(t => t.id === d.terminalId)?.id || d.terminalId;
                                     firebaseService.updateTerminalCommand(termRefId, "REBOOT")
                                        .then(() => showToast("Reboot command sent.", "success"))
                                        .catch(e => showToast("Error: " + e.message, "error"));
                                   }
                                 }}
                                 className="flex-1 py-3 bg-red-50 text-red-600 border border-red-200 rounded-2xl text-[8px] font-black uppercase tracking-[0.2em] hover:bg-red-100 transition-colors"
                             >
                                Restart
                             </button>
                           )}
                        </div>
                      )}

                      {/* Decorative Element */}
                      <div className="absolute -left-10 -bottom-10 w-24 h-24 bg-amber-500/10 blur-3xl rounded-full" />
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : activeTab === "MAP" ? (
            <div className="flex flex-col space-y-4 relative">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-4 shrink-0 px-1">
                <div>
                  <h2 className="text-base md:text-2xl font-black italic uppercase text-slate-900 leading-none">
                    Active Network Overview
                  </h2>
                  <p className="text-[8px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic mt-1 md:mt-2">
                    Live Fleet Telemetry Cluster
                  </p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <div className="flex-1 md:flex-none relative">
                    <Radio className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="SEARCH GPS ID..."
                      className="w-full md:w-48 pl-10 pr-4 py-2.5 bg-white border border-slate-100 rounded-xl shadow-sm text-[10px] font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-amber-500"
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-100 shadow-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest leading-none">
                      Online: {driverLocations.filter((l) => l.isOnline).length}
                    </span>
                  </div>
                  <div className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-100 shadow-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none">
                      Inactive:{" "}
                      {driverLocations.filter((l) => !l.isOnline).length}
                    </span>
                  </div>
                  <button 
                    onClick={() => setShowCoverage(!showCoverage)}
                    className={cn(
                      "flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition-all shadow-sm",
                      showCoverage ? "bg-amber-500 text-slate-950 border-amber-600" : "bg-white text-slate-400 border-slate-100"
                    )}
                  >
                    <div className={cn("w-1.5 h-1.5 rounded-full", showCoverage ? "bg-slate-950" : "bg-slate-300")} />
                    <span className="text-[9px] font-black uppercase tracking-widest leading-none">
                      Coverage: {showCoverage ? "ON" : "OFF"}
                    </span>
                  </button>

                  <button
                    onClick={() => setShowIssues(!showIssues)}
                    className={cn(
                      "flex items-center gap-3 px-6 py-3 rounded-2xl transition-all shadow-lg active:scale-95 group",
                      showIssues
                        ? "bg-red-500 text-white shadow-red-500/20"
                        : "bg-white text-slate-400 border border-slate-100",
                    )}
                  >
                    <div className={cn("w-1.5 h-1.5 rounded-full", showIssues ? "bg-white" : "bg-slate-300")} />
                    <span className="text-[9px] font-black uppercase tracking-widest leading-none">
                      Issues: {showIssues ? "VISIBLE" : "HIDDEN"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 relative">
                <div className="bg-slate-100 rounded-[2rem] md:rounded-[2.5rem] relative overflow-hidden border border-slate-100 shadow-xl h-[500px] md:h-[650px] lg:h-[750px] md:flex-1 z-10">
                  <MapContainer
                    key={activeTab}
                    center={mapCenter}
                    zoom={mapZoom}
                    className="h-full w-full outline-none"
                    style={{ height: "100%", width: "100%", background: "#f8fafc" }}
                    zoomControl={true}
                    dragging={true}
                    touchZoom={true}
                    scrollWheelZoom={false}
                    doubleClickZoom={true}
                    boxZoom={true}
                    keyboard={true}
                  >
                    <InvalidateMap />
                    <div className="absolute top-2 right-12 z-[1000] bg-white/80 backdrop-blur-md px-2 py-1 rounded text-[7px] font-black uppercase text-slate-400">
                      Map Engine: Leaflet 1.9.4
                    </div>
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <ChangeView center={mapCenter} zoom={mapZoom} />

                    {/* Render Campaign Coverage Areas */}
                    {campaigns
                      .filter(
                        (c) => c.status === "ACTIVE" && showCoverage,
                      )
                      .map((camp: any) => (
                        <Circle
                          key={camp.id}
                          center={
                            camp.targetLat && camp.targetLng
                              ? [camp.targetLat, camp.targetLng]
                              : [
                                  mapCenter[0],
                                  mapCenter[1],
                                ]
                          }
                          radius={camp.coverageRadius || 5000} // Default 5km if not set
                          pathOptions={{
                            color: "#f59e0b",
                            fillColor: "#f59e0b",
                            fillOpacity: 0.1,
                            weight: 1,
                            dashArray: "5, 10",
                          }}
                        >
                          <Popup className="ad-popup">
                            <div className="p-1">
                              <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-1">
                                Ad Campaign
                              </p>
                              <h4 className="text-xs font-black text-slate-900">
                                {camp.title}
                              </h4>
                              <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">
                                {camp.clientName}
                              </p>
                            </div>
                          </Popup>
                        </Circle>
                      ))}

                    {/* Render History Polyline */}
                    {selectedDriverHistory.length > 1 && (
                      <Polyline
                        positions={selectedDriverHistory
                          .filter(h => h.lat && h.lng)
                          .map(h => [h.lat, h.lng]) as [number, number][]}
                        pathOptions={{
                          color: "#3b82f6",
                          weight: 4,
                          opacity: 0.6,
                          dashArray: "10, 10",
                          lineJoin: "round"
                        }}
                      />
                    )}

                    {/* Render Issue Reports */}
                    {showIssues && tickets.filter(t => t.type === 'DEVICE' && t.lat && t.lng).map((ticket) => (
                      <Marker 
                        key={ticket.id}
                        position={[ticket.lat!, ticket.lng!]}
                        icon={L.divIcon({
                          className: 'custom-issue-icon',
                          html: `
                            <div class="relative bg-red-600 w-8 h-8 rounded-lg flex items-center justify-center text-white border-2 border-white shadow-xl animate-bounce">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            </div>
                          `,
                          iconSize: [32, 32],
                          iconAnchor: [16, 16]
                        })}
                      >
                         <Popup>
                            <div className="p-2">
                               <h4 className="text-xs font-black text-red-600 uppercase mb-1">Issue Reported</h4>
                               <p className="text-[10px] font-bold text-slate-900">{ticket.title}</p>
                               <p className="text-[8px] text-slate-400 mt-1">{ticket.status} • {ticket.priority}</p>
                            </div>
                         </Popup>
                      </Marker>
                    ))}

                    <MarkerClusterGroup>
                    {/* Render Driver Markers */}
                    {driverLocations
                      .filter(
                        (loc) =>
                          typeof loc.lat === "number" &&
                          typeof loc.lng === "number" &&
                          loc.lat !== 0 && loc.lng !== 0 &&
                          // Strict live check: only show if updated in last 15 minutes
                          (loc.timestamp ? (Date.now() - new Date(loc.timestamp).getTime() < 900000) : (loc.updatedAt ? (Date.now() - loc.updatedAt.toMillis() < 900000) : true)), // 15 mins
                      )
                      .map((loc) => {
                        const compliance = getComplianceStatus(loc);
                        const driverObj = drivers.find((d) => d.uid === loc.driverId);
                        return (
                          <Marker
                            key={loc.id}
                            position={[loc.lat, loc.lng]}
                            icon={
                              L.divIcon({
                                className: "custom-div-icon",
                                html: `
                                <div class="relative group">
                                  <div class="w-10 h-10 ${loc.isOnline ? "bg-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.4)]" : "bg-slate-800 border-slate-700 opacity-60"} rounded-xl flex items-center justify-center text-white transition-all duration-300 border-2 ${compliance.status === 'compliant' ? 'border-emerald-500' : compliance.status === 'off-course' ? 'border-red-500' : 'border-amber-500'} transform group-hover:scale-110 active:scale-95 shadow-2xl">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11.6 2 11.8 2 12v4c0 .6.4 1 1 1h2"/>
                                      <circle cx="7" cy="17" r="2"/>
                                      <path d="M9 17h6"/>
                                      <circle cx="17" cy="17" r="2"/>
                                    </svg>
                                  </div>
                                  ${loc.isOnline ? `<div class="absolute -top-1.5 -right-1.5 flex h-4 w-4"><span class="animate-ping absolute inline-flex h-full w-full rounded-full ${compliance.status === 'compliant' ? 'bg-emerald-400' : 'bg-green-400'} opacity-75"></span><span class="relative inline-flex rounded-full h-4 w-4 ${compliance.status === 'compliant' ? 'bg-emerald-500' : 'bg-green-500'} border-2 border-white"></span></div>` : ""}
                                  ${loc.gpsId ? `
                                    <div class="absolute -bottom-1 -left-1 w-4 h-4 bg-blue-600 rounded-lg flex items-center justify-center border-2 border-white shadow-xl z-50 overflow-hidden" title="HARDWARE GPS ACTIVE: ${loc.gpsId}">
                                      <div class="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                                      <div class="absolute inset-0 bg-blue-400/20 animate-ping"></div>
                                    </div>
                                  ` : ""}
                                </div>
                              `,
                                iconSize: [40, 40],
                                iconAnchor: [20, 20],
                              })
                            }
                            eventHandlers={{
                              click: () => {
                                setSelectedLocation({ ...loc, compliance });
                                setMapCenter([loc.lat, loc.lng]);
                                setMapZoom(16);
                                handleFetchDriverHistory(loc.driverId);
                              },
                            }}
                          >
                            <Popup closeButton={false}>
                              <div className="p-4 w-64 font-sans bg-white">
                                <div className="flex items-center gap-3 mb-4">
                                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-xl relative overflow-hidden", loc.isOnline ? "bg-slate-900 border border-white/10" : "bg-slate-200")}>
                                     {driverObj?.profileImage ? (
                                       <img src={driverObj.profileImage} className="w-full h-full object-cover" />
                                     ) : (
                                       <Truck size={24} className={loc.isOnline ? "text-amber-500" : "text-slate-400"} />
                                     )}
                                     <div className={cn("absolute top-1 right-1 w-2 h-2 rounded-full border border-white", loc.isOnline ? "bg-green-500" : "bg-red-500")} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[12px] font-black italic text-slate-900 uppercase truncate">
                                      {driverObj?.fullName || `Node [${loc.id.slice(-6)}]`}
                                    </p>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">
                                      ID: {driverObj?.driverCode || 'AUTH_REQD'}
                                    </p>
                                  </div>
                                </div>

                                <div className="space-y-2 border-t border-slate-50 pt-3">
                                  {compliance.status !== 'idle' ? (
                                    <>
                                      <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Stack</span>
                                        <span className="text-[10px] font-black text-slate-900 uppercase truncate max-w-[120px]">{compliance.campaign}</span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target Proximity</span>
                                        <span className={cn("text-[11px] font-black", compliance.status === 'compliant' ? "text-emerald-500" : "text-red-500")}>
                                          {(compliance.distance / 1000).toFixed(2)} KM
                                        </span>
                                      </div>
                                      
                                      <div className={cn(
                                        "p-2 rounded-xl border flex items-center justify-center gap-2 mt-2",
                                        compliance.status === 'compliant' 
                                          ? "bg-emerald-50 border-emerald-100 text-emerald-600" 
                                          : "bg-red-50 border-red-100 text-red-600"
                                      )}>
                                        {compliance.status === 'compliant' ? <Check size={12} className="shrink-0" /> : <AlertTriangle size={12} className="shrink-0" />}
                                        <span className="text-[9px] font-black uppercase tracking-widest">
                                          {compliance.status === 'compliant' ? "Network Compliant" : "Range Violation"}
                                        </span>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="p-3 bg-slate-50 rounded-xl text-center border border-slate-100">
                                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                                        STANDBY MODE<br/><span className="text-slate-300">NO ACTIVE PAYLOAD</span>
                                      </p>
                                    </div>
                                  )}

                                  <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 pt-1">
                                    <span className="uppercase tracking-widest">Velocity</span>
                                    <span className="text-slate-900">{loc.speed || 0} KM/H</span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-4">
                                  <button
                                    onClick={() => handleFetchDriverHistory(loc.driverId)}
                                    className="px-3 py-2.5 bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-600 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                                  >
                                    TRAIL <MapPin size={10} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setMapCenter([loc.lat, loc.lng]);
                                      setMapZoom(18);
                                    }}
                                    className="px-3 py-2.5 bg-slate-950 text-white rounded-xl text-[8px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg active:scale-95"
                                  >
                                    FOCUS
                                  </button>
                                </div>
                              </div>
                            </Popup>
                          </Marker>
                        );
                      })}
                    </MarkerClusterGroup>

                    {/* Static Markers for Offline Units with Last Known Position */}
                    {driverLocations
                      .filter((loc) => (!loc.lat || loc.lat === 0) && loc.isOnline)
                      .map((loc) => {
                         const driver = drivers.find(d => d.uid === loc.driverId);
                         return (
                            <div key={`no-fix-info-${loc.uid}`} /> 
                         );
                      })}

                    {/* GPS Alert for units without fix */}
                    {driverLocations.filter(loc => loc.isOnline && (!loc.lat || loc.lat === 0)).length > 0 && (
                      <div className="absolute bottom-6 right-6 z-[1000] bg-red-500 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest animate-bounce shadow-2xl flex items-center gap-2">
                        <AlertTriangle size={14} />
                        {driverLocations.filter(loc => loc.isOnline && (!loc.lat || loc.lat === 0)).length} Units Missing GPS Fix
                      </div>
                    )}

                    {/* Map Legend */}
                    <div className="absolute top-6 right-16 z-[1000] space-y-4">
                      <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-100 shadow-xl space-y-2 hidden md:block w-48">
                        <div className="flex items-center justify-between mb-2">
                           <span className="text-[10px] font-black uppercase text-slate-900 italic">Map Legend</span>
                           <Activity size={10} className="text-amber-500" />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                          <span className="text-[8px] font-black uppercase text-slate-600">Online Unit</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-slate-300 rounded-full" />
                          <span className="text-[8px] font-black uppercase text-slate-600">Offline/Syncing</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-amber-500/20 border border-amber-500/50 rounded-full" />
                          <span className="text-[8px] font-black uppercase text-slate-600">Ad Coverage Area</span>
                        </div>
                        <div className="flex items-center gap-2 pt-1 border-t border-slate-100 mt-1">
                          <div className="w-3 h-3 bg-blue-600 rounded-sm flex items-center justify-center">
                            <div className="w-1 h-1 bg-white rounded-full"></div>
                          </div>
                          <span className="text-[8px] font-black uppercase text-slate-600">Hardware GPS</span>
                        </div>
                      </div>

                      {/* GPS Fix Tracker Widget */}
                      {driverLocations.filter(loc => loc.isOnline && (!loc.lat || loc.lat === 0)).length > 0 && (
                        <div className="bg-red-500/90 backdrop-blur-md p-4 rounded-2xl border border-red-400 shadow-xl space-y-3 w-48 text-white">
                          <div className="flex items-center gap-2">
                            <AlertTriangle size={14} className="animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-widest">GPS Fix Alert</span>
                          </div>
                          <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                            {driverLocations
                              .filter(loc => loc.isOnline && (!loc.lat || loc.lat === 0))
                              .map((loc) => {
                                const driver = drivers.find(d => d.uid === loc.driverId);
                                return (
                                  <div key={loc.driverId || Math.random().toString()} className="flex flex-col bg-white/10 p-2 rounded-lg border border-white/10">
                                    <span className="text-[8px] font-black uppercase truncate">{driver?.fullName || 'Unknown Unit'}</span>
                                    <span className="text-[6px] font-bold opacity-70 uppercase">ID: {loc.terminalId || 'N/A'}</span>
                                  </div>
                                );
                              })}
                          </div>
                          <p className="text-[7px] font-bold uppercase tracking-tighter leading-tight opacity-80">
                            These units are connected but missing location telemetry.
                          </p>
                        </div>
                      )}
                    </div>

                    {selectedDriverHistory.length > 1 && (
                      <Polyline
                        positions={selectedDriverHistory.map((log) => [
                          log.lat,
                          log.lng,
                        ])}
                        pathOptions={{
                          color: "#f59e0b",
                          weight: 4,
                          opacity: 0.8,
                          dashArray: "10, 10",
                        }}
                      />
                    )}
                  </MapContainer>

                  {/* Movement History Overlay */}
                  {selectedDriverHistory.length > 0 && (
                    <div className="absolute top-6 left-6 z-[1000] w-72 bg-white/95 backdrop-blur-md rounded-[2.5rem] border border-slate-100 shadow-2xl p-8 space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none mb-1">
                            Node History
                          </h4>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                            Live Movement Segment
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedDriverHistory([])}
                          className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="space-y-4 max-h-64 overflow-y-auto pr-3 custom-scrollbar">
                        {selectedDriverHistory.slice(0, 20).map((log, i) => (
                          <div
                            key={log.timestamp?.seconds ? `${log.timestamp.seconds}-${i}` : `log-${i}`}
                            className="flex gap-4 relative pb-4 last:pb-0"
                          >
                            {i < selectedDriverHistory.length - 1 && (
                              <div className="absolute left-2 top-4 bottom-0 w-px bg-slate-100" />
                            )}
                            <div className="w-4 h-4 rounded-full bg-amber-500 border-4 border-white shadow-sm mt-0.5 relative z-10" />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-[10px] font-black text-slate-900">
                                  {new Date(
                                    log.timestamp?.toDate?.() || log.timestamp,
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })}
                                </p>
                                <span className="text-[8px] font-black text-amber-500 italic">
                                  {Math.round(log.speed || 0)} KPH
                                </span>
                              </div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                                {log.activeCampaignId === "idle"
                                  ? "No Ad Pulse"
                                  : "Campaign Active"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-3 rounded-2xl text-center">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            Data Nodes
                          </p>
                          <p className="text-sm font-black text-slate-900 italic">
                            {selectedDriverHistory.length}
                          </p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-2xl text-center">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            Exp Core
                          </p>
                          <p className="text-sm font-black text-amber-500 italic">
                            High
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Overlay Stats */}
                  <div className="absolute top-2 left-2 md:top-6 md:left-6 z-[400] flex flex-col gap-2 md:gap-3 pointer-events-none scale-90 md:scale-100 origin-top-left">
                    {ticketNotifications.length > 0 && (
                      <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="bg-red-500 text-white p-4 rounded-2xl shadow-2xl border border-red-400 flex items-center gap-4 pointer-events-auto cursor-pointer"
                        onClick={() => {
                          setActiveTab("TICKETS");
                          setTicketNotifications([]);
                        }}
                      >
                        <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center animate-pulse">
                          <AlertCircle size={18} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">
                            Issue Reported
                          </p>
                          <p className="text-[9px] font-bold opacity-80 uppercase leading-none">
                            {ticketNotifications.length} Active Driver Tickets
                          </p>
                        </div>
                      </motion.div>
                    )}

                    <div className="bg-slate-950/90 backdrop-blur-xl p-3 md:p-6 rounded-2xl md:rounded-3xl border border-white/10 shadow-2xl flex items-center gap-3 md:gap-4 pointer-events-auto group hover:scale-105 transition-all">
                      <div className="w-8 h-8 md:w-12 md:h-12 bg-amber-500 rounded-xl md:rounded-2xl flex items-center justify-center text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.3)] shrink-0">
                        <Activity size={24} />
                      </div>
                      <div>
                        <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 opacity-60">
                          Avg Velocity
                        </p>
                        <div className="flex items-baseline gap-0.5 md:gap-1">
                          <h4 className="text-lg md:text-2xl font-black text-white italic leading-none">
                            {(
                              driverLocations.reduce(
                                (acc, curr) => acc + (curr.speed || 0),
                                0,
                              ) / (driverLocations.length || 1)
                            ).toFixed(1)}
                          </h4>
                          <span className="text-[10px] font-black text-amber-500 uppercase leading-none">
                            km/h
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Focus Sidebar */}
                <div className="w-full md:w-80 space-y-4 shrink-0 overflow-y-auto max-h-[300px] md:max-h-none">
                  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl space-y-6">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-tighter italic">
                      Selection Focus
                    </h3>
                    {selectedLocation ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                      >
                        <div className="text-center p-6 bg-slate-50 rounded-3xl border border-slate-100 italic relative">
                          <div className="absolute top-4 right-4 text-green-500">
                            <div className="w-2 h-2 rounded-full bg-current animate-ping" />
                          </div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            Assigned Unit
                          </p>
                          <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                            {drivers.find(
                              (d) => d.uid === selectedLocation.driverId,
                            )?.name || "Fleet Node"}
                          </h4>
                          <p className="text-[9px] font-bold text-slate-500 font-mono mt-2 uppercase tracking-widest">
                            REF:{" "}
                            {selectedLocation.driverId?.slice(0, 12) ||
                              "REF_PENDING"}
                          </p>
                        </div>
                        <div className="space-y-3">
                          {[
                            {
                              label: "Current Latitude",
                              value: selectedLocation.lat?.toFixed(6) || "0.0",
                            },
                            {
                              label: "Current Longitude",
                              value: selectedLocation.lng?.toFixed(6) || "0.0",
                            },
                            {
                              label: "Transmission",
                              value: selectedLocation.isOnline
                                ? "ENCRYPTED"
                                : "OFFLINE",
                              highlight: true,
                            },
                            { label: "Last Sync", value: "Active" },
                          ].map((item) => (
                            <div
                              key={item.label}
                              className="flex justify-between items-center bg-slate-50/50 p-3 rounded-xl border border-slate-50"
                            >
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                {item.label}
                              </span>
                              <span
                                className={cn(
                                  "text-[9px] font-bold italic",
                                  item.highlight
                                    ? "text-amber-600"
                                    : "text-slate-900",
                                )}
                              >
                                {item.value}
                              </span>
                            </div>
                          ))}
                        </div>
                        <button
                          className="w-full py-4 bg-slate-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl"
                          onClick={() => setSelectedLocation(null)}
                        >
                          CLEAR FOCUS
                        </button>
                      </motion.div>
                    ) : (
                      <div className="text-center py-12 px-6">
                        <MapPin
                          size={32}
                          className="text-slate-200 mx-auto mb-4"
                        />
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                          Select a live node from the mesh to monitor real-time
                          telemetry
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="bg-amber-500 p-6 rounded-[2rem] shadow-xl shadow-amber-500/10 text-slate-950 relative overflow-hidden group hover:scale-[1.02] transition-transform cursor-pointer">
                    <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-110 transition-transform">
                      <Truck size={120} />
                    </div>
                    <div className="relative z-10">
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">
                        Network Capacity
                      </p>
                      <h4 className="text-2xl font-black italic">
                        UPTIME SECURED
                      </h4>
                    </div>
                    <div className="mt-8 flex items-center justify-between relative z-10">
                      <div className="flex -space-x-2">
                        {[1, 2, 3, 4].map((i) => {
                          const driver = drivers[i % drivers.length];
                          return (
                            <div
                              key={i}
                              className="w-7 h-7 rounded-full bg-slate-900 border-2 border-amber-500 overflow-hidden flex items-center justify-center"
                            >
                              <img
                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${driver?.uid || "fleet" + i}`}
                                alt="Unit"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="text-right">
                        <p className="text-[14px] font-black leading-none">
                          {drivers.length > 0
                            ? ((liveUnitsCount / drivers.length) * 100).toFixed(
                                1,
                              )
                            : "100"}
                          %
                        </p>
                        <p className="text-[8px] font-bold uppercase tracking-widest opacity-60">
                          SLA Pulse
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "PAYMENTS" ? (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 md:p-6 rounded-2xl shadow-2xl border border-slate-800 text-white relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-amber-500/5 blur-3xl rounded-full" />
                <div className="relative z-10">
                  <h2 className="text-lg md:text-xl font-black italic uppercase text-amber-500">
                    {paymentSubTab === "INCOME"
                      ? "Revenue History"
                      : "Expense History"}
                  </h2>
                  <p className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest italic opacity-80">
                    {paymentSubTab === "INCOME"
                      ? "Customer Ad Payments & Hub Income"
                      : "Driver Earnings & Network Payouts"}
                  </p>
                </div>
                <div className="flex gap-4 items-center relative z-10 mt-4 md:mt-0">
                  <div className="bg-white/5 p-1 rounded-xl border border-white/10 flex">
                    <button
                      onClick={() => setPaymentSubTab("INCOME")}
                      className={cn(
                        "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                        paymentSubTab === "INCOME"
                          ? "bg-amber-500 text-slate-950"
                          : "text-slate-400 hover:text-white",
                      )}
                    >
                      Income
                    </button>
                    <button
                      onClick={() => setPaymentSubTab("EXPENSE")}
                      className={cn(
                        "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                        paymentSubTab === "EXPENSE"
                          ? "bg-amber-500 text-slate-950"
                          : "text-slate-400 hover:text-white",
                      )}
                    >
                      Expenses
                    </button>
                  </div>
                  <button
                    onClick={(e) =>
                      handleExtractionClick(
                        e,
                        paymentSubTab === "INCOME" ? payments : driverPayments,
                        `Fleet_${paymentSubTab}_History`,
                      )
                    }
                    className="bg-amber-500 text-slate-950 px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-amber-400 transition-all flex items-center gap-2"
                  >
                    <Download size={14} />
                    EXPORT
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">
                          Transaction ID
                        </th>
                        <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">
                          Volume
                        </th>
                        <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">
                          Entity
                        </th>
                        <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">
                          Status
                        </th>
                        <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {paymentSubTab === "INCOME"
                        ? payments
                            .slice((paymentsPage - 1) * itemsPerPage, paymentsPage * itemsPerPage)
                            .map((p) => (
                            <tr
                              key={p.id}
                              className="hover:bg-slate-50 transition-all border-b border-slate-50"
                            >
                              <td className="px-8 py-5 text-[10px] font-mono text-slate-400">
                                {p.transactionId || p.id?.slice(0, 8)}
                              </td>
                              <td className="px-8 py-5 text-sm font-black text-slate-900 italic">
                                ₹{p.amount?.toLocaleString()}
                              </td>
                              <td className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                {p.customerId || p.customerPhone || "Guest"}
                              </td>
                              <td className="px-8 py-5">
                                <span className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                                  ["SUCCESS", "success", "PAID", "paid"].includes(p.status) 
                                    ? "bg-green-50 text-green-600 border-green-100" 
                                    : ["CANCELLED", "cancelled"].includes(p.status) 
                                      ? "bg-slate-100 text-slate-500 border-slate-200" 
                                      : ["FAILED", "failed"].includes(p.status)
                                        ? "bg-red-50 text-red-600 border-red-100"
                                        : "bg-amber-50 text-amber-600 border-amber-100"
                                }`}>
                                  {p.status}
                                </span>
                              </td>
                              <td className="px-8 py-5">
                                <button
                                  onClick={() => handleDeletePayment(p.id!)}
                                  className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                  title="Delete record"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))
                        : driverPayments
                              .slice((driverPaymentsPage - 1) * itemsPerPage, driverPaymentsPage * itemsPerPage)
                              .map((p) => (
                            <tr
                              key={p.id}
                              className="hover:bg-slate-50 transition-all border-b border-slate-50"
                            >
                              <td className="px-8 py-5 text-[10px] font-mono text-slate-400">
                                {p.paymentId || p.id?.slice(0, 8)}
                              </td>
                              <td className="px-8 py-5 text-sm font-black text-slate-900 italic">
                                ₹{p.amount?.toLocaleString()}
                              </td>
                              <td className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest leading-relaxed">
                                <div className="font-sans text-slate-900 font-bold whitespace-nowrap">
                                  {drivers.find((d) => d.uid === p.driverId || d.id === p.driverId)?.name || `Driver (${p.driverId?.slice(0, 6)})`}
                                </div>
                                {drivers.find((d) => d.uid === p.driverId || d.id === p.driverId)?.phone && (
                                  <div className="text-[8px] text-slate-400 font-bold font-mono tracking-wider mt-0.5">
                                    Phone: {drivers.find((d) => d.uid === p.driverId || d.id === p.driverId)?.phone}
                                  </div>
                                )}
                              </td>
                              <td className="px-8 py-5">
                                <span className="px-3 py-1 bg-amber-50 text-amber-500 rounded-full text-[8px] font-black uppercase">
                                  {p.status}
                                </span>
                              </td>
                              <td className="px-8 py-5">
                                <button
                                  onClick={() =>
                                    handleDeleteDriverPayment(p.id!)
                                  }
                                  className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                    </tbody>
                  </table>
                  {(paymentSubTab === "INCOME" ? payments.length : driverPayments.length) > itemsPerPage && (
                    <div className="flex items-center justify-between p-6 border-t border-slate-50">
                        <button 
                          disabled={paymentSubTab === "INCOME" ? paymentsPage === 1 : driverPaymentsPage === 1}
                          onClick={() => paymentSubTab === "INCOME" ? setPaymentsPage(p => p - 1) : setDriverPaymentsPage(p => p - 1)}
                          className="px-4 py-2 bg-slate-100 text-slate-900 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all disabled:opacity-50"
                          >Previous</button>
                        <span className="text-[10px] font-black text-slate-400 uppercase">Page {paymentSubTab === "INCOME" ? paymentsPage : driverPaymentsPage} of {Math.ceil((paymentSubTab === "INCOME" ? payments.length : driverPayments.length) / itemsPerPage)}</span>
                        <button 
                          disabled={paymentSubTab === "INCOME" ? paymentsPage === Math.ceil(payments.length / itemsPerPage) : driverPaymentsPage === Math.ceil(driverPayments.length / itemsPerPage)}
                          onClick={() => paymentSubTab === "INCOME" ? setPaymentsPage(p => p + 1) : setDriverPaymentsPage(p => p + 1)}
                          className="px-4 py-2 bg-slate-100 text-slate-900 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all disabled:opacity-50"
                          >Next</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === "TICKETS" ? (
            <div className="space-y-6 flex flex-col">
              <div className="flex justify-between items-center bg-slate-900 p-4 md:p-6 rounded-2xl text-white">
                <div>
                  <h2 className="text-xl md:text-2xl font-black uppercase italic text-amber-500">
                    Fleet Operations Support
                  </h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-2">
                    Active Conversations (
                    {tickets.filter((t) => t.status === "open").length})
                  </p>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden min-h-[500px]">
                {/* Ticket List */}
                <div className={cn(
                  "bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col",
                  activeTicketId && "hidden lg:flex"
                )}>
                  <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      Active Threads
                    </span>
                    <div className="flex gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                    {tickets.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setActiveTicketId(t.id!)}
                        className={cn(
                          "w-full p-6 text-left hover:bg-slate-50 transition-all group relative cursor-pointer",
                          activeTicketId === t.id && "bg-amber-50",
                        )}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="text-[11px] font-black text-slate-900 uppercase italic tracking-tighter truncate leading-none">
                            {drivers.find((d) => d.uid === t.driverId || d.id === t.driverId)?.name || t.driverName || "Driver " + t.driverId?.slice(-4)}
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-bold text-slate-400 font-mono uppercase">
                              {t.createdAt
                                ? new Date(
                                    t.createdAt.toMillis(),
                                  ).toLocaleDateString()
                                : ""}
                            </span>
                            {t.unreadCount && t.unreadCount > 0 ? (
                              <span className="w-5 h-5 bg-orange-600 text-white rounded-full flex items-center justify-center text-[9px] font-black shadow-lg shadow-orange-500/20 animate-pulse">
                                {t.unreadCount}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium line-clamp-1 mb-2">
                          {t.lastMessage || t.description}
                        </p>
                        {drivers.find((d) => d.uid === t.driverId || d.id === t.driverId)?.phone && (
                          <p className="text-[9px] font-bold text-slate-400 font-mono tracking-wider uppercase mb-2">
                            Phone: {drivers.find((d) => d.uid === t.driverId || d.id === t.driverId)?.phone}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                              t.status === "open"
                                ? "bg-amber-100 text-amber-600"
                                : "bg-green-100 text-green-600",
                            )}
                          >
                            {t.status}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSupportTicket(t.id!);
                            }}
                            className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                            title="Delete Thread"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        {activeTicketId === t.id && (
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-amber-500 rounded-l-full" />
                        )}
                      </div>
                    ))}
                    {tickets.length === 0 && (
                      <div className="p-12 text-center">
                        <MessageSquare
                          size={32}
                          className="mx-auto text-slate-100 mb-4"
                        />
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                          No support traffic
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Chat Window */}
                <div className={cn(
                  "lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 shadow-sm flex flex-col overflow-hidden relative",
                  !activeTicketId && "hidden lg:flex"
                )}>
                  {activeTicketId ? (
                    <>
                      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setActiveTicketId(null)}
                            className="p-2.5 bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors rounded-xl hover:bg-slate-200"
                          >
                            <ArrowLeft size={18} />
                          </button>
                          <div>
                            <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tighter">
                              {tickets.find((t) => t.id === activeTicketId)
                                ?.driverName || "Operator Chat"}
                            </h3>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">
                              Secure Hub Line
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            if (activeTicketId) {
                              await firebaseService.updateSupportTicketStatus(
                                activeTicketId,
                                "resolved",
                              );
                              setActiveTicketId(null);
                            }
                          }}
                          className="text-[9px] font-black bg-slate-950 text-white px-4 py-2 rounded-xl uppercase tracking-widest shadow-xl shadow-slate-200"
                        >
                          CLOSE THREAD
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
                        {chatMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={cn(
                              "flex flex-col max-w-[80%]",
                              msg.senderRole === "admin"
                                ? "ml-auto items-end"
                                : "mr-auto items-start",
                            )}
                          >
                            <div
                              className={cn(
                                "p-4 rounded-2xl text-[13px] font-medium leading-relaxed shadow-sm",
                                msg.senderRole === "admin"
                                  ? "bg-slate-900 text-white rounded-tr-none"
                                  : "bg-white text-slate-800 rounded-tl-none border border-slate-200",
                              )}
                            >
                              {msg.text}
                            </div>
                            <span className="text-[8px] font-black text-slate-400 uppercase mt-1 tracking-widest">
                              {msg.senderName} •{" "}
                              {msg.timestamp
                                ? new Date(
                                    msg.timestamp.toMillis(),
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "Sending..."}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="p-6 border-t border-slate-100 flex gap-3 bg-white">
                        <input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleSendMessage()
                          }
                          placeholder="Draft response..."
                          className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 font-medium text-sm focus:border-amber-500 focus:outline-none transition-all"
                        />
                        <button
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim()}
                          className="w-12 h-12 bg-slate-950 text-amber-500 rounded-2xl flex items-center justify-center transition-all disabled:opacity-50 active:scale-95 shadow-xl shadow-slate-200"
                        >
                          <Send size={18} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-200 grayscale opacity-50 p-12 text-center">
                      <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-6">
                        <MessageSquare size={40} />
                      </div>
                      <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest italic leading-none">
                        Command Center
                      </h3>
                      <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-4 max-w-xs">
                        Select an active thread from the hub directory to
                        initiate communication protocols.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === "MONITOR" ? (
            <div className="flex flex-col space-y-6 h-full overflow-hidden">
              <div className="bg-slate-950 p-6 rounded-3xl shadow-2xl border border-slate-800 text-white relative overflow-hidden shrink-0">
                <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute left-0 bottom-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full translate-y-1/2 -translate-x-1/2" />
                
                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                  <div>
                    <h2 className="text-2xl md:text-4xl font-black italic uppercase text-white mb-2 tracking-tighter flex items-center gap-3">
                      <Cpu className="text-amber-500" size={32} />
                      Fleet <span className="text-amber-500">Monitor</span> Control
                    </h2>
                    <div className="flex items-center gap-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono flex items-center gap-2">
                        <Server size={12} /> Unit Control Protocol v4.0
                      </p>
                      <div className="h-1 w-1 bg-slate-700 rounded-full" />
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] font-mono flex items-center gap-2">
                        <ShieldCheck size={12} /> Secure Tunnel Active
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="bg-white/5 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 flex items-center gap-4">
                      <div className="text-center border-r border-white/10 pr-4">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Active</p>
                        <p className="text-xl font-black text-amber-500 font-mono">{(terminals || []).length}</p>
                      </div>
                      <div className="text-center border-r border-white/10 px-4">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Online</p>
                        <p className="text-xl font-black text-emerald-500 font-mono">{(terminals || []).filter(t => t.metrics?.online).length}</p>
                      </div>
                      <div className="text-center pl-4">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Alerts</p>
                        <p className="text-xl font-black text-red-500 font-mono">0</p>
                      </div>
                    </div>
                    
                    <select
                      className="bg-slate-900 border border-slate-700 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-amber-500/20 text-white min-w-[180px]"
                      value={selectedArea}
                      onChange={(e) => setSelectedArea(e.target.value)}
                    >
                      <option value="ALL">Global Network</option>
                      {Array.from(new Set(drivers.map(d => d.city).filter(Boolean))).map(city => (
                        <option key={city} value={city}>{city?.toUpperCase()}</option>
                      ) as any)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-2 custom-scrollbar pb-24">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                  {terminals
                    .filter(t => selectedArea === "ALL" || (drivers.find(d => d.uid === t.driverId)?.city || "").toUpperCase() === selectedArea.toUpperCase())
                    .map((t) => {
                    const driver = (drivers || []).find((d) => d.uid === t.driverId);
                    const isOnline = t.metrics?.online;
                    const tvPassword = firebaseService.decryptTVPassword(t.teamViewerPasswordEncrypted);
                    
                    return (
                      <motion.div
                        key={t.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all group overflow-hidden flex flex-col"
                      >
                        {/* Device Header */}
                        <div className="p-6 border-b border-slate-50 flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center text-amber-500 font-bold text-lg relative group-hover:scale-110 transition-transform shadow-lg shadow-slate-200">
                              <Tv size={24} />
                              {isOnline && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
                              )}
                            </div>
                            <div>
                              <h4 className="text-[13px] font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-1">
                                {driver?.name || "UNASSIGNED NODE"}
                              </h4>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                  {driver?.vNo || "AUTO NO-ID"}
                                </span>
                                <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                <span className="text-[8px] font-mono text-slate-300 font-black">
                                  {t.id.slice(0, 12)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                             <div
                              className={cn(
                                "text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border flex items-center gap-1.5 shadow-sm",
                                isOnline
                                  ? "bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-500/5"
                                  : "bg-red-50 text-red-600 border-red-100"
                              )}
                            >
                              {isOnline ? "OPERATIONAL" : "DISCONNECTED"}
                            </div>
                            <span className="text-[7px] font-black text-slate-300 uppercase tracking-[0.2em] font-mono">
                              {driver?.city || "Global"}
                            </span>
                          </div>
                        </div>

                        {/* Snapshot Area */}
                        <div className="relative aspect-video mx-4 mt-2 bg-slate-950 rounded-3xl overflow-hidden group/snap shadow-inner border-4 border-white">
                           {t.metrics?.currentAdImage ? (
                             <>
                               <img
                                  src={getSafeUrl(t.metrics.currentAdImage)}
                                  alt="Device Snapshot"
                                  className="w-full h-full object-cover grayscale-[0.3] hover:grayscale-0 transition-all duration-700 opacity-60 group-hover/snap:opacity-100"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
                             </>
                           ) : (
                             <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-700">
                               <Cast size={32} className="opacity-20" />
                               <span className="text-[8px] font-black uppercase tracking-[0.3em]">No Visual Signal</span>
                             </div>
                           )}
                           
                           <div className="absolute top-4 right-4 flex gap-2">
                             <button 
                               onClick={() => handleCaptureFrame(t)}
                               className="p-2 bg-black/40 backdrop-blur-md border border-white/20 rounded-xl text-white hover:bg-amber-500 hover:text-slate-950 transition-all shadow-xl"
                               title="Capture Live Snapshot"
                             >
                               <Maximize2 size={14} />
                             </button>
                           </div>
                           
                           <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end opacity-0 group-hover/snap:opacity-100 transition-opacity">
                              <div className="bg-black/60 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                                <p className="text-[7px] font-black text-slate-400 uppercase mb-1">Currently Playing</p>
                                <p className="text-[9px] font-black text-white uppercase italic tracking-tighter truncate max-w-[150px]">
                                  {t.metrics?.currentAdTitle || "Diagnostic Loop"}
                                </p>
                              </div>
                           </div>
                        </div>

                        {/* Status Grid */}
                        <div className="p-6 grid grid-cols-2 gap-3 border-b border-slate-50">
                          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col justify-center">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                              <Wifi size={10} className="text-emerald-500" /> Ping Status
                            </p>
                            <p className="text-xs font-black text-slate-900 font-mono">
                              {isOnline ? "54ms" : "---"} <span className="text-[8px] text-slate-400 font-sans ml-1 uppercase">Stable</span>
                            </p>
                          </div>
                          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col justify-center">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                              <Activity size={10} className="text-amber-500" /> Sys Health
                            </p>
                            <p className="text-xs font-black text-slate-900 font-mono">
                              {isOnline ? "Normal" : "CRITICAL"} <span className="text-[8px] text-slate-400 font-sans ml-1 uppercase">Uptime</span>
                            </p>
                          </div>
                        </div>

                        {/* TeamViewer Area */}
                        <div className="p-6 space-y-4">
                           <div className="flex items-center justify-between mb-2">
                             <div className="flex items-center gap-2 text-slate-950">
                               <Tv size={14} className="text-blue-500" />
                               <span className="text-[10px] font-black uppercase tracking-widest">TeamViewer Access</span>
                             </div>
                             <button 
                               onClick={() => handleRemoteCommand(t.id, 'TV_UPDATE')}
                               className="p-1 px-2 border border-slate-200 rounded-lg text-[8px] font-black uppercase hover:bg-slate-50 transition-all"
                             >
                               Update Config
                             </button>
                           </div>
                           
                           <div className="flex gap-2">
                             <div className="flex-1 bg-slate-50 border border-slate-100 p-3 rounded-2xl flex flex-col justify-center">
                               <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider mb-1">ID Protocol</span>
                               <p className="text-[11px] font-black text-slate-900 tracking-widest font-mono truncate">{t.teamViewerId || "UNCONFIGURED"}</p>
                             </div>
                             <div className="flex-1 bg-slate-50 border border-slate-100 p-3 rounded-2xl flex flex-col justify-center relative group/pass">
                               <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider mb-1">Secure Key</span>
                               <div className="flex items-center justify-between">
                                 <p className="text-[11px] font-black text-slate-900 tracking-widest font-mono">
                                   {tvPasswordVisible[t.id] ? tvPassword : "••••••••"}
                                 </p>
                                 <button onClick={() => toggleTVPassword(t.id)} className="text-slate-400 hover:text-slate-900 transition-colors">
                                   {tvPasswordVisible[t.id] ? <Eye size={12} /> : <Eye size={12} className="opacity-40" />}
                                 </button>
                               </div>
                             </div>
                           </div>

                           <button 
                             onClick={() => startTVSession(t)}
                             disabled={isTVConnecting || !t.teamViewerId}
                             className="w-full py-4 bg-[#0a66c2] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                           >
                             <MousePointer2 size={16} />
                             {isTVConnecting ? "Establishing Tunnel..." : "Open TeamViewer Session"}
                           </button>
                        </div>

                        {/* Remote Control Panel */}
                        <div className="p-6 pt-0 mt-auto">
                          <div className="grid grid-cols-4 gap-2">
                            <button 
                              onClick={() => handleRemoteCommand(t.id, 'RESTART_APP')}
                              disabled={commandInProgress === `${t.id}-RESTART_APP`}
                              className="aspect-square flex flex-col items-center justify-center gap-2 bg-slate-50 hover:bg-amber-50 rounded-2xl border border-slate-100 transition-all group/ctrl shadow-sm hover:shadow-lg active:scale-95"
                              title="Restart APK Service"
                            >
                              <RefreshCw size={14} className={cn("text-slate-400 group-hover/ctrl:text-amber-500 transition-colors", commandInProgress === `${t.id}-RESTART_APP` && "animate-spin text-amber-500")} />
                              <span className="text-[7px] font-black uppercase tracking-tighter text-slate-400 group-hover/ctrl:text-amber-500">Restart</span>
                            </button>
                            <button 
                              onClick={() => handleRemoteCommand(t.id, 'VOLUME', { volume: 80 })}
                              className="aspect-square flex flex-col items-center justify-center gap-2 bg-slate-50 hover:bg-blue-50 rounded-2xl border border-slate-100 transition-all group/ctrl shadow-sm hover:shadow-lg active:scale-95"
                              title="Set Default Volume"
                            >
                              <Volume2 size={14} className="text-slate-400 group-hover/ctrl:text-blue-500 transition-colors" />
                              <span className="text-[7px] font-black uppercase tracking-tighter text-slate-400 group-hover/ctrl:text-blue-500">Volume</span>
                            </button>
                            <button 
                              onClick={() => handleRemoteCommand(t.id, 'EMERGENCY_BROADCAST')}
                              className="aspect-square flex flex-col items-center justify-center gap-2 bg-slate-50 hover:bg-red-50 rounded-2xl border border-slate-100 transition-all group/ctrl shadow-sm hover:shadow-lg active:scale-95"
                              title="Push Emergency Text"
                            >
                              <AlertTriangle size={14} className="text-slate-400 group-hover/ctrl:text-red-500 transition-colors" />
                              <span className="text-[7px] font-black uppercase tracking-tighter text-slate-400 group-hover/ctrl:text-red-500">Broadcast</span>
                            </button>
                            <button 
                              onClick={() => handleRemoteCommand(t.id, 'LOCK', { isLocked: true })}
                              className="aspect-square flex flex-col items-center justify-center gap-2 bg-slate-50 hover:bg-slate-950 rounded-2xl border border-slate-100 transition-all group/ctrl shadow-sm hover:shadow-lg active:scale-95"
                              title="Remote Device Lock"
                            >
                              <Lock size={14} className="text-slate-400 group-hover/ctrl:text-white transition-colors" />
                              <span className="text-[7px] font-black uppercase tracking-tighter text-slate-400 group-hover/ctrl:text-white">Lock</span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  
                  {terminals.length === 0 && (
                    <div className="col-span-full h-screen/2 flex flex-col items-center justify-center bg-slate-50 rounded-[4rem] border-4 border-dashed border-white">
                      <div className="w-32 h-32 bg-white rounded-[3rem] flex items-center justify-center text-slate-200 mb-8 shadow-xl">
                        <Activity size={64} className="animate-pulse" />
                      </div>
                      <h3 className="text-2xl font-black text-slate-950 uppercase italic tracking-tighter mb-4">No Network Nodes Found</h3>
                      <p className="max-w-md text-center text-xs font-black text-slate-400 uppercase tracking-widest leading-relaxed px-12">
                        Deployment of Android Smart Screens into auto fleet is required to establish visual communication uplink and telemetry synchronization.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === "FLEET" ? (
            <div className="space-y-6 pb-32">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-950 p-4 md:p-6 rounded-2xl shadow-2xl border border-slate-800 text-white relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/5 blur-3xl rounded-full" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6 w-full">
                  <div className="shrink-0">
                    <h2 className="text-xl md:text-3xl font-black italic uppercase tracking-tighter text-amber-500">
                      Fleet Operations
                    </h2>
                    <p className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest italic opacity-80">
                      Network Personnel Cluster
                    </p>
                  </div>
                  
                  <div className="flex flex-1 gap-3 w-full">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search fleet..."
                        className="w-full bg-white/5 border border-white/10 p-3 pl-10 rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all h-12"
                      />
                    </div>
                    <select
                      className="bg-white/5 border border-white/10 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-amber-500/20 h-12 text-white"
                      value={selectedArea}
                      onChange={(e) => setSelectedArea(e.target.value)}
                    >
                      <option value="ALL" className="bg-slate-900 text-white">All Areas</option>
                      {Array.from(new Set(drivers.map(d => d.city).filter(Boolean))).map(city => (
                        <option key={city} value={city} className="bg-slate-900 text-white">{city?.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={(e) => handleExtractionClick(e, filteredDrivers, "Network_Fleet_Directory")}
                    disabled={isExtracting}
                    className="bg-amber-500 text-slate-950 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50 h-12 shrink-0"
                  >
                    {isExtracting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                    {isExtracting ? "Processing..." : "Extract"}
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left sm:table">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-left">
                          Operator Info
                        </th>
                        <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">
                          Network UUID
                        </th>
                        <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">
                          GPS Tracking ID
                        </th>
                        <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">
                          Status
                        </th>
                        <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredDrivers.map((d) => (
                        <tr
                          key={d.uid}
                          className="hover:bg-slate-50/50 transition-all group"
                        >
                          <td className="px-8 py-5">
                            <div className="flex flex-col">
                              <span className="text-[11px] md:text-sm font-black text-slate-900 italic tracking-tighter leading-none">
                                {d.name}
                              </span>
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                {d.vNo || "Unspecified Unit"}
                              </span>
                              {d.phone && (
                                <span className="text-[9px] font-bold text-slate-500 font-mono tracking-wider mt-0.5">
                                  Phone: {d.phone}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-8 py-5 text-center font-mono text-[9px] font-black text-slate-500 uppercase">
                            {d.uid}
                          </td>
                          <td className="px-8 py-5 text-center font-mono text-[9px] font-black text-amber-600 uppercase">
                            {d.gpsId || "UNLINKED"}
                          </td>
                          <td className="px-8 py-5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  d.status === "active"
                                    ? "bg-green-500 animate-pulse"
                                    : "bg-red-500",
                                )}
                              />
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 italic font-mono">
                                {d.status || "OFFLINE"}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex gap-2 items-center justify-end">
                              <button
                                onClick={() => {
                                  setSelectedDriverForAgreement(d);
                                  firebaseService.subscribeToAgreement(d.id, (agr) => {
                                      setSelectedDriverForAgreement(prev => prev && prev.id === d.id ? { ...prev, _agreementData: agr } : prev);
                                  });
                                }}
                                className="text-[8px] font-black bg-blue-100 text-blue-600 px-3 py-2 rounded-lg uppercase tracking-widest hover:bg-blue-200 transition-all font-mono"
                              >
                                Review
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedDriverForEarning(d);
                                  setShowEarningModal(true);
                                }}
                                className="text-[8px] font-black bg-slate-100 text-slate-600 px-3 py-2 rounded-lg uppercase tracking-widest hover:bg-slate-200 transition-all font-mono"
                              >
                                Credit
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedDriverForProvision(d);
                                  setShowProvisionModal(true);
                                }}
                                className="text-[8px] font-black bg-slate-900 text-amber-500 px-3 py-2 rounded-lg uppercase tracking-widest hover:bg-slate-800 transition-all shadow-sm flex items-center gap-1 font-mono"
                              >
                                <Smartphone size={10} />
                                Provision
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Mobile Card Layout */}
                  <div className="sm:hidden divide-y divide-slate-100 p-4 space-y-4">
                    {filteredDrivers.map((d) => (
                      <div
                        key={d.uid}
                        className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-black text-slate-900 italic tracking-tighter leading-none">
                              {d.name}
                            </h4>
                            {d.phone && (
                              <p className="text-[9px] font-bold text-slate-500 font-mono tracking-wider mt-1">
                                Phone: {d.phone}
                              </p>
                            )}
                          </div>
                          <div className="bg-white px-3 py-1 rounded-full border border-slate-100 flex items-center gap-2">
                            <div
                              className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                d.status === "active"
                                  ? "bg-green-500"
                                  : "bg-red-500",
                              )}
                            />
                            <span className="text-[8px] font-black uppercase text-slate-600">
                              {d.status}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 bg-white/50 p-4 rounded-2xl border border-slate-50">
                          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50/50">
                            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">
                              Network UUID
                            </p>
                            <p className="text-[9px] font-black text-slate-500 font-mono truncate w-full text-center">
                              {d.uid.slice(0, 8)}...
                            </p>
                          </div>
                          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50/50">
                            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">
                              GPS ID
                            </p>
                            <p className="text-[9px] font-black text-amber-600 font-mono italic">
                              {d.gpsId || "N/A"}
                            </p>
                          </div>
                          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50/50">
                            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">
                              Tier
                            </p>
                            <p className="text-[9px] font-black text-amber-600">
                              {d.subscriptionTier || "FREE"}
                            </p>
                          </div>
                          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50/50">
                            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">
                              Vehicle
                            </p>
                            <p className="text-[9px] font-black text-slate-900">
                              {d.vNo || "PENDING"}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedDriverForProvision(d);
                              setShowProvisionModal(true);
                            }}
                            className="flex-1 py-4 bg-slate-950 text-amber-500 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                          >
                            <Smartphone size={12} /> Provision
                          </button>
                          <button
                            onClick={() => {
                              setSelectedDriverForEarning(d);
                              setShowEarningModal(true);
                            }}
                            className="py-4 px-6 bg-slate-100 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest"
                          >
                            Credit
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-300 space-y-4">
              <Truck size={48} strokeWidth={1} />
              <p className="text-xs font-black uppercase tracking-[0.3em]">
                Module Synchronizing...
              </p>
            </div>
          )}
        </main>
      </div>

      {activeTab === "WITHDRAWALS" && (
        <div className="fixed inset-0 left-0 md:left-20 z-20 bg-slate-50 p-6 md:p-10 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-slate-900 p-6 md:p-8 rounded-2xl text-white flex justify-between items-center bg-[radial-gradient(circle_at_100%_0%,rgba(245,158,11,0.1),transparent)]">
              <div>
                <h2 className="text-3xl font-black italic uppercase text-amber-500">
                  Payout Hub
                </h2>
                <p className="text-[10px] font-black uppercase text-slate-400">
                  Manual UPI Clearances
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={(e) => handleExtractionClick(e, withdrawRequests, "Payout_Clearance_Records")}
                  disabled={isExtracting}
                  className="flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-50"
                >
                  {isExtracting ? <RefreshCw size={14} className="animate-spin text-amber-500" /> : <Download size={14} className="text-amber-500" />}
                  {isExtracting ? "Extracting..." : "Extract Records"}
                </button>
                <button
                  onClick={() => setActiveTab("DASHBOARD")}
                  className="p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6">
              {withdrawRequests.length > 0 ? (
                withdrawRequests.map((req) => {
                  const driver = drivers.find((d) => d.uid === req.driverId);
                  return (
                    <div
                      key={req.id}
                      className="bg-white p-8 rounded-[2.5rem] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between border border-slate-100 group hover:border-amber-500/50 transition-all"
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-900 font-black border border-slate-100 shadow-inner group-hover:bg-amber-50">
                          <Truck size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-tighter italic">
                              {driver?.name || `Driver (${req.driverId?.slice(-6) || "???"})`}
                            </h4>
                            <span className="text-[8px] font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-500 font-mono tracking-widest">
                              {req.driverId?.slice(-6).toUpperCase()}
                            </span>
                          </div>
                          {driver?.phone && (
                            <p className="text-[9px] font-bold text-slate-500 font-mono mt-1 uppercase">
                              Phone: {driver.phone}
                            </p>
                          )}
                          {driver?.bankDetails?.accountNumber && (
                            <p className="text-[9px] font-bold text-amber-600 font-mono mt-0.5 uppercase">
                              A/C: {driver.bankDetails.accountNumber} | IFSC: {driver.bankDetails.ifscCode}
                            </p>
                          )}
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            UPI:{" "}
                            <span className="text-slate-900">
                              {req.upiId || "NOT_FOUND"}
                            </span>
                          </p>
                          <p className="text-[8px] text-slate-300 font-bold uppercase mt-0.5">
                            {new Date(
                              req.createdAt?.seconds * 1000,
                            ).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 mt-6 md:mt-0 w-full md:w-auto">
                        <div className="text-right">
                          <p className="text-2xl font-black text-slate-900 italic tracking-tighter">
                            ₹{(req.amount || 0).toLocaleString()}
                          </p>
                          <p className="text-[9px] font-black text-amber-600 uppercase tracking-[0.2em]">
                            {req.status === "pending" ? "UNSETTLED" : "CLEARED"}
                          </p>
                        </div>
                        <div className="h-10 w-px bg-slate-100 hidden md:block"></div>
                        <div className="flex gap-2 flex-1 md:flex-none items-center">
                          {req.status === "pending" ? (
                            <button
                              onClick={() => handleApproveWithdrawal(req)}
                              className="flex-1 md:flex-none px-8 py-4 bg-slate-950 text-amber-500 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-slate-200 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                              Approve & Settle
                            </button>
                          ) : (
                            <div className="px-6 py-4 bg-green-50 text-green-600 rounded-2xl flex items-center gap-2 border border-green-100">
                              <Check size={16} />
                              <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                                Paid
                              </span>
                            </div>
                          )}
                          <button
                            onClick={() => handleDeleteWithdrawRequest(req.id)}
                            className="p-3 text-slate-300 hover:text-red-500 transition-colors"
                            title="Delete Record"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-200">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <IndianRupee className="text-slate-300" size={24} />
                  </div>
                  <p className="text-sm font-black text-slate-900 uppercase italic tracking-tighter">
                    No Pending Clearances
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    All driver payouts are synchronized
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "PACKAGES" && (
        <div className="fixed inset-0 left-0 md:left-20 z-20 bg-slate-50 p-6 md:p-10 overflow-y-auto min-h-[100dvh] pb-42">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="bg-slate-900 p-6 md:p-8 rounded-2xl text-white flex justify-between items-center bg-[radial-gradient(circle_at_100%_0%,rgba(245,158,11,0.1),transparent)]">
              <div>
                <h2 className="text-2xl md:text-3xl font-black italic uppercase text-amber-500">
                  Package Configurator
                </h2>
                <p className="text-[10px] font-black uppercase text-slate-400">
                  Adjust core network plan parameters
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button className="px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Export Pricing</button>
                <button className="px-5 py-3 bg-amber-500 text-slate-950 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20">Save All Changes</button>
                <button
                  onClick={() => setActiveTab("DASHBOARD")}
                  className="p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition-all"
                  title="Close Tab"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <motion.div
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               className="space-y-10"
            >

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {[
                { id: 'BASIC', name: 'Elite Starter', price: '₹999', desc: '3 Auto Displays • 1 Day Assigned' },
                { id: 'STARTER', name: 'Brand Velocity', price: '₹1999', desc: '7 Auto Displays • 2 Days' },
                { id: 'PRO', name: 'Dominion Pro', price: '₹4999', desc: 'Priority Network • 7 Days' }
              ].map((p) => (
                <div key={p.id} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl pointer-events-none group-hover:bg-amber-500/10 transition-all" />
                   <div className="flex items-center gap-4 mb-8">
                      <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-amber-500 shadow-xl shadow-slate-900/20">
                         <Zap size={28} />
                      </div>
                      <div>
                         <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tight">{p.name}</h3>
                         <p className="text-xs font-black text-amber-500 tracking-widest mt-1">{p.price}</p>
                      </div>
                   </div>
                   
                   <div className="space-y-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Display Parameters</label>
                         <textarea 
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all"
                            defaultValue={p.desc}
                            rows={4}
                         />
                      </div>
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visibility state</span>
                         <div className="w-12 h-6 bg-amber-500 rounded-full relative shadow-inner">
                            <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-md" />
                         </div>
                      </div>
                      <button className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all mt-4">
                         Push to Network
                      </button>
                   </div>
                </div>
              ))}
           </div>
        </motion.div>
         </div>
        </div>
      )}

      {activeTab === "STUDIO_CONFIG" && (
         <div className="fixed inset-0 left-0 md:left-20 z-20 bg-slate-50 flex overflow-hidden">
             <AdminStudioConfig />
         </div>
      )}

      {activeTab === "NOTICES" && (
        <div className="fixed inset-0 left-0 md:left-20 z-20 bg-slate-50 p-6 md:p-10 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-slate-900 p-6 md:p-8 rounded-2xl text-white flex justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Zap size={120} />
              </div>
              <div className="relative z-10">
                <h2 className="text-3xl font-black italic uppercase text-amber-500">
                  Offer Hub
                </h2>
                <p className="text-[10px] font-black uppercase text-slate-400">
                  Manage Global Customer Signal Offers
                </p>
              </div>
              <button
                onClick={() => setActiveTab("DASHBOARD")}
                className="p-3 bg-white/10 rounded-2xl relative z-10"
              >
                <X size={20} />
              </button>
            </div>

            <div className="bg-white p-4 md:p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
              <h3 className="text-sm font-black uppercase italic tracking-widest text-slate-900">
                Broadcast New Signal
              </h3>
              <form
                onSubmit={handleCreateNotice}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Offer Headline
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PLATINUM REBATE 20%"
                    value={newNotice.offer}
                    onChange={(e) =>
                      setNewNotice({
                        ...newNotice,
                        offer: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Target Region
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PAN-INDIA / BENGALURU"
                    value={newNotice.targetRegion}
                    onChange={(e) =>
                      setNewNotice({
                        ...newNotice,
                        targetRegion: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Detailed Message
                  </label>
                  <textarea
                    placeholder="Write a compelling call to action..."
                    rows={3}
                    value={newNotice.message}
                    onChange={(e) =>
                      setNewNotice({ ...newNotice, message: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                  />
                </div>
                <div className="md:col-span-2 space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Offer Visual (Flex/Poster)
                  </label>

                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        placeholder="https://... (Direct Image URL)"
                        value={newNotice.imageUrl}
                        onChange={(e) =>
                          setNewNotice({
                            ...newNotice,
                            imageUrl: e.target.value,
                          })
                        }
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                      />
                    </div>

                    <div className="flex items-center">
                      <span className="text-[8px] font-black text-slate-300 uppercase px-2">
                        OR
                      </span>
                      <label className="cursor-pointer flex flex-col items-center justify-center px-6 py-4 bg-amber-500 text-slate-950 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-amber-600 transition-all border-2 border-transparent relative">
                        <div className="flex items-center gap-2">
                          <Download size={16} className="rotate-180" />
                          {isUploading ? "Uploading..." : "Upload File"}
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleFileUpload}
                        />
                      </label>
                    </div>
                  </div>

                  {newNotice.imageUrl && (
                    <div className="mt-2 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 aspect-video relative group max-w-sm">
                      <img
                        src={newNotice.imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setNewNotice((prev) => ({ ...prev, imageUrl: "" }))
                        }
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <button className="px-8 py-4 bg-slate-950 text-amber-500 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-slate-200 hover:scale-[1.02] active:scale-95 transition-all">
                    Publish Hub Offer
                  </button>
                </div>
              </form>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 italic">
                Active Signal Pool ({notices.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {notices.map((notice) => (
                  <div
                    key={notice.id}
                    className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative group overflow-hidden"
                  >
                    <div className="flex justify-between items-start relative z-10">
                      <div className="space-y-1">
                        <span className="text-[8px] font-black px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded uppercase tracking-widest border border-amber-500/20">
                          {notice.targetRegion || "ALL SIGNALS"}
                        </span>
                        <h4 className="text-xl font-black italic uppercase tracking-tighter text-slate-900 leading-tight">
                          {notice.offer}
                        </h4>
                      </div>
                      <button
                        onClick={() => handleDeleteNotice(notice.id)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {notice.imageUrl && (
                      <div className="mt-4 rounded-xl overflow-hidden border border-slate-100 bg-slate-50 aspect-video relative z-10">
                        <img
                          src={notice.imageUrl}
                          alt={notice.offer}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed mt-4 relative z-10">
                      {notice.message}
                    </p>
                    <div className="absolute bottom-0 right-0 w-24 h-24 bg-slate-50 rounded-full translate-x-12 translate-y-12 group-hover:scale-150 transition-transform" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showEarningModal && selectedDriverForEarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setShowEarningModal(false)}
          ></div>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-4 md:p-6 w-full max-w-md relative z-10 space-y-4 md:space-y-6"
          >
            <h3 className="text-2xl font-black italic uppercase tracking-tighter">
              Assign Credit
            </h3>
            <div className="space-y-4">
              <input
                id="earning-amount"
                type="number"
                placeholder="Amount (₹)"
                className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-lg"
              />
              <button
                onClick={() => {
                  const amt = parseFloat(
                    (
                      document.getElementById(
                        "earning-amount",
                      ) as HTMLInputElement
                    ).value,
                  );
                  if (amt > 0)
                    handleAssignEarning(selectedDriverForEarning.id, amt);
                }}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px]"
              >
                Confirm Credit
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showCampaignModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => {
              setShowCampaignModal(false);
              setCampaignMediaFile(null);
              setCampaignUploadProgress(0);
            }}
          ></div>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 md:p-10 w-full max-w-lg relative z-10 space-y-4 md:space-y-6"
          >
            <h3 className="text-2xl font-black italic uppercase text-center">
              New Campaign
            </h3>
            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div className="space-y-4">
                <input
                  name="title"
                  required
                  placeholder="Title"
                  className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-bold"
                />
                <input
                  name="clientName"
                  required
                  placeholder="Client"
                  className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-bold"
                />
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Campaign Media (Photo/Video)</label>
                  <div className="relative group/upload">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleCampaignFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="p-8 border-2 border-dashed border-slate-100 rounded-3xl group-hover/upload:border-amber-500/50 bg-slate-50/50 flex flex-col items-center justify-center gap-3 transition-all">
                      {campaignMediaFile ? (
                        <>
                          <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
                            {campaignMediaType === 'VIDEO' ? <Play size={24} /> : <ImageIcon size={24} />}
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] font-black uppercase text-slate-900 truncate max-w-[200px]">{campaignMediaFile.name}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">Size: {(campaignMediaFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300">
                             <RefreshCw size={24} />
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] font-black uppercase text-slate-900">Click or Drag Upload</p>
                            <p className="text-[8px] font-bold text-slate-300 uppercase mt-1">MP4, JPG, PNG Supported</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  {campaignUploadProgress > 0 && campaignUploadProgress < 100 && (
            <div className="px-2">
              <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500" style={{ width: `${campaignUploadProgress}%` }} />
              </div>
            </div>
          )}
        </div>
        {!campaignMediaFile && (
          <div className="space-y-4">
            <p className="text-[10px] text-center text-slate-400">Please select an image or video file to proceed with campaign deployment.</p>
          </div>
        )}
        <div className="flex gap-2">
           <button 
             type="button"
             onClick={() => setCampaignMediaType('IMAGE')}
             className={cn(
               "flex-1 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all",
               campaignMediaType === 'IMAGE' ? "bg-slate-900 text-white border-slate-900 shadow-lg" : "bg-white text-slate-400 border-slate-100"
             )}
           >
             Link is Image
           </button>
           <button 
             type="button"
             onClick={() => setCampaignMediaType('VIDEO')}
             className={cn(
               "flex-1 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all",
               campaignMediaType === 'VIDEO' ? "bg-slate-900 text-white border-slate-900 shadow-lg" : "bg-white text-slate-400 border-slate-100"
             )}
           >
             Link is Video
           </button>
        </div>
      </div>
              <input
                name="budget"
                type="number"
                required
                placeholder="Budget (INR)"
                className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-bold"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  name="targetLat"
                  type="number"
                  step="any"
                  placeholder="Target Lat (e.g. 12.97)"
                  className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-bold"
                />
                <input
                  name="targetLng"
                  type="number"
                  step="any"
                  placeholder="Target Lng (e.g. 77.59)"
                  className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-bold"
                />
              </div>
              <input
                name="coverageRadius"
                type="number"
                placeholder="Radius (Meters, e.g. 5000)"
                className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-bold"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-5 bg-amber-500 text-slate-900 rounded-2xl font-black uppercase text-[11px]"
              >
                {isSubmitting ? "Processing..." : "Deploy Campaign"}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {showProvisionModal && selectedDriverForProvision && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setShowProvisionModal(false)}
          ></div>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 md:p-10 w-full max-w-md relative z-10 space-y-6"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Smartphone size={32} />
              </div>
              <h3 className="text-2xl font-black italic uppercase tracking-tighter">
                Provision Access
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                DRIVER: {selectedDriverForProvision.name}
              </p>
            </div>
            <form onSubmit={handleProvisionDriver} className="space-y-4">
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
                  className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-bold focus:ring-1 focus:ring-amber-500"
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
                  className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-bold focus:ring-1 focus:ring-amber-500"
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
                  className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-bold focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <p className="text-[8px] text-slate-400 font-bold uppercase text-center px-4 leading-relaxed">
                THIS WILL OVERWRITE ANY PREVIOUS DEVICE LOCK FOR THIS DRIVER
                ACCOUNT.
              </p>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-5 bg-slate-950 text-amber-500 rounded-2xl font-black uppercase text-[11px] shadow-2xl hover:scale-[1.02] transition-all"
              >
                {isSubmitting ? "SYCHRONIZING..." : "CONFIRM PROVISIONING"}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {showApprovalModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
          >
            <div className="p-4 md:p-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-1">
                  Deep Approval Desk
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  Campaign Strategy & Node Alignment
                </p>
              </div>
              <button
                onClick={() => setShowApprovalModal(false)}
                className="p-3 bg-white rounded-2xl border border-slate-100 text-slate-400 hover:text-slate-900 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Campaign Asset Verification</h4>
                    <div className="px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded text-[8px] font-black uppercase tracking-widest">{approvalForm?.mediaType}</div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div className="space-y-4">
                      <div className="relative">
                        <input
                          type="text"
                          value={approvalForm?.mediaUrl || ''}
                          onChange={(e) => setApprovalForm(p => p ? ({ ...p, mediaUrl: e.target.value }) : p)}
                          placeholder="Asset URL..."
                          className="w-full bg-white border border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setApprovalForm(p => p ? ({ ...p, mediaType: 'IMAGE' }) : p)}
                          className={cn("flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all", approvalForm?.mediaType === 'IMAGE' ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-400 border-slate-100")}
                        >
                          Image Mode
                        </button>
                        <button 
                          onClick={() => setApprovalForm(p => p ? ({ ...p, mediaType: 'VIDEO' }) : p)}
                          className={cn("flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all", approvalForm?.mediaType === 'VIDEO' ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-400 border-slate-100")}
                        >
                          Video Mode
                        </button>
                      </div>
                    </div>

                    <div className="aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 relative group shadow-inner">
                      {approvalForm?.mediaUrl ? (
                         approvalForm?.mediaType === 'VIDEO' ? (
                           <video 
                             src={getSafeUrl(approvalForm.mediaUrl)} 
                             className="w-full h-full object-cover" 
                             controls 
                             muted
                           />
                         ) : (
                           <img 
                             src={getSafeUrl(approvalForm.mediaUrl)} 
                             className="w-full h-full object-cover" 
                             alt="Preview" 
                             referrerPolicy="no-referrer"
                           />
                         )
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center gap-2">
                          <ImageIcon className="text-white/10" size={32} />
                          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">No Media Preview</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Daily Start (Hour)
                  </label>
                  <input
                    type="time"
                    value={approvalForm.startTime}
                    onChange={(e) =>
                      setApprovalForm({
                        ...approvalForm,
                        startTime: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Daily End (Hour)
                  </label>
                  <input
                    type="time"
                    value={approvalForm.endTime}
                    onChange={(e) =>
                      setApprovalForm({
                        ...approvalForm,
                        endTime: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div className="md:col-span-2 space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Allowed Days of Week
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (
                      <button
                        key={day}
                        onClick={() => {
                          const current = approvalForm.daysOfWeek || [];
                          const updated = current.includes(day) 
                            ? current.filter(d => d !== day)
                            : [...current, day];
                          setApprovalForm({ ...approvalForm, daysOfWeek: updated });
                        }}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                          (approvalForm.daysOfWeek || []).includes(day)
                            ? "bg-amber-500 text-slate-950 border-amber-500 shadow-md"
                            : "bg-white text-slate-400 border-slate-100 hover:border-amber-200"
                        )}
                      >
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Days to Run
                  </label>
                  <input
                    type="number"
                    value={approvalForm.durationDays || ''}
                    onChange={(e) =>
                      setApprovalForm({
                        ...approvalForm,
                        durationDays: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Hours Per Day
                  </label>
                  <input
                    type="number"
                    value={approvalForm.hoursPerDay || ''}
                    onChange={(e) =>
                      setApprovalForm({
                        ...approvalForm,
                        hoursPerDay: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={approvalForm.startDate}
                    onChange={(e) =>
                      setApprovalForm({
                        ...approvalForm,
                        startDate: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={approvalForm.endDate}
                    onChange={(e) =>
                      setApprovalForm({
                        ...approvalForm,
                        endDate: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Total Runtime (Minutes)
                  </label>
                  <input
                    type="number"
                    value={approvalForm.totalMinutes}
                    onChange={(e) =>
                      setApprovalForm({
                        ...approvalForm,
                        totalMinutes: parseInt(e.target.value),
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="e.g. 50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Unit Quota (Max Autos)
                  </label>
                  <input
                    type="number"
                    value={approvalForm.maxAutos}
                    onChange={(e) =>
                      setApprovalForm({
                        ...approvalForm,
                        maxAutos: parseInt(e.target.value),
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Target Center (Lat)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={approvalForm.targetLat}
                    onChange={(e) =>
                      setApprovalForm({
                        ...approvalForm,
                        targetLat: parseFloat(e.target.value),
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Target Center (Lng)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={approvalForm.targetLng}
                    onChange={(e) =>
                      setApprovalForm({
                        ...approvalForm,
                        targetLng: parseFloat(e.target.value),
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Radius (Metres)
                  </label>
                  <input
                    type="number"
                    value={approvalForm.coverageRadius}
                    onChange={(e) =>
                      setApprovalForm({
                        ...approvalForm,
                        coverageRadius: parseInt(e.target.value),
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Designer Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={approvalForm.designerFee || ''}
                    onChange={(e) =>
                      setApprovalForm({
                        ...approvalForm,
                        designerFee: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Video Maker Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={approvalForm.videoMakerFee || ''}
                    onChange={(e) =>
                      setApprovalForm({
                        ...approvalForm,
                        videoMakerFee: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              {/* Node Distribution Strategy section */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Node Distribution Strategy</h4>
                <div className="bg-slate-950 p-6 rounded-[2rem] border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-500 text-xl font-black italic uppercase tracking-tighter">
                        {selectedDriverIds.length} Selective Units
                      </p>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Target Cluster Size</p>
                    </div>
                    <div className="h-10 w-px bg-slate-800" />
                    <div className="text-right">
                       <p className="text-white text-xl font-black italic uppercase tracking-tighter">
                         ₹{((selectedCampaign?.budget || 0) / (selectedDriverIds.length || 1)).toFixed(0)}
                       </p>
                       <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Est. Per-Unit Yield</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Driver Selection Matrix */}
              <div className="space-y-4">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Select Fleet Nodes ({selectedDriverIds.length}/{approvalForm.maxAutos})
                  </label>
                  {selectedDriverIds.length > 0 && (
                    <button 
                      onClick={() => setSelectedDriverIds([])}
                      className="text-[8px] font-black uppercase text-amber-500 hover:text-amber-600"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-4 max-h-[300px] overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3 custom-scrollbar">
                  {drivers
                    .filter(d => d.status === 'active' && d.isVerified)
                    .map((d) => {
                      const isSelected = selectedDriverIds.includes(d.uid);
                      const isOnline = driverLocations.find(l => l.driverId === d.uid)?.isOnline;
                      
                      return (
                        <div 
                          key={d.uid}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedDriverIds(p => p.filter(id => id !== d.uid));
                            } else {
                              if (selectedDriverIds.length < approvalForm.maxAutos) {
                                setSelectedDriverIds(p => [...p, d.uid]);
                              } else {
                                showToast(`Max quota (${approvalForm.maxAutos}) reached.`, 'info');
                              }
                            }
                          }}
                          className={cn(
                            "p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3 relative overflow-hidden group bg-white",
                            isSelected ? "border-amber-500 shadow-lg" : "border-transparent hover:border-slate-200"
                          )}
                        >
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center relative overflow-hidden px-0", isSelected ? "bg-amber-500 text-slate-950" : "bg-slate-100 text-slate-400")}>
                            {d.profileImage ? (
                              <img src={d.profileImage} className="w-full h-full object-cover" />
                            ) : (
                              <Users size={18} />
                            )}
                            <div className={cn("absolute bottom-1 right-1 w-2 h-2 rounded-full border border-white", isOnline ? "bg-green-500" : "bg-slate-300")} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black text-slate-900 uppercase truncate leading-none mb-1">{d.fullName || d.name}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">Code: {d.driverCode || '---'}</p>
                          </div>
                          {isSelected && (
                            <div className="ml-auto bg-amber-500 text-slate-950 rounded-full p-1 shadow-sm">
                              <Check size={12} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div 
                   onClick={() => setApprovalForm(p => ({ ...p, paymentConfirmed: !p.paymentConfirmed }))}
                   className={cn(
                     "p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3",
                     approvalForm.paymentConfirmed ? "bg-green-50 border-green-500" : "bg-slate-50 border-slate-100"
                   )}
                 >
                    <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", approvalForm.paymentConfirmed ? "bg-green-500 text-white" : "bg-slate-200")}>
                       <CreditCard size={14} />
                    </div>
                    <div>
                       <p className="text-[10px] font-black uppercase text-slate-900">Payment Status</p>
                    </div>
                    <div className="ml-auto">
                       {approvalForm.paymentConfirmed ? <Check size={16} className="text-green-500" /> : <div className="w-4 h-4 rounded border border-slate-300" />}
                    </div>
                 </div>

                 <div 
                   onClick={() => setApprovalForm(p => ({ ...p, mediaConfirmed: !p.mediaConfirmed }))}
                   className={cn(
                     "p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3",
                     approvalForm.mediaConfirmed ? "bg-green-50 border-green-500" : "bg-slate-50 border-slate-100"
                   )}
                 >
                    <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", approvalForm.mediaConfirmed ? "bg-green-500 text-white" : "bg-slate-200")}>
                       <ImageIcon size={14} />
                    </div>
                    <div>
                       <p className="text-[10px] font-black uppercase text-slate-900">Media Status</p>
                    </div>
                    <div className="ml-auto">
                       {approvalForm.mediaConfirmed ? <Check size={16} className="text-green-500" /> : <div className="w-4 h-4 rounded border border-slate-300" />}
                    </div>
                 </div>
              </div>
            </div>

            <div className="p-8 bg-slate-950 flex gap-4">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="flex-1 py-5 bg-white/5 border border-white/10 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white/10 transition-all"
              >
                Cancel Review
              </button>
              <button
                onClick={handleConfirmApproval}
                disabled={isSubmitting || selectedDriverIds.length === 0}
                className="flex-[2] py-5 bg-amber-500 text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl shadow-amber-500/20 hover:scale-[1.02] transition-all disabled:opacity-50"
              >
                {isSubmitting
                  ? "Processing Pipeline..."
                  : `Approve & Deploy to ${selectedDriverIds.length} Nodes`}
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {/* Admin Assistant Bot */}
      <AdminAssistant 
        activeTab={activeTab}
        role="admin"
        systemContext={{
          driversCount: drivers.length,
          campaignsCount: campaigns.length,
          liveUnitsCount: liveUnitsCount,
          pendingWithdrawals: withdrawRequests.filter(r => r.status === 'pending').length,
          activeTickets: tickets.filter(t => t.status === 'open' || t.status === 'OPEN').length,
          totalRevenue: totalSuccessfulRevenue,
          transactions: [...(payments || []), ...(driverPayments || [])].sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)),
          fleetHealth: liveUnitsCount > (drivers.length * 0.7) ? "Optimal (70%+ Online)" : liveUnitsCount > (drivers.length * 0.3) ? "Moderate Network Traffic" : "Critical Latency / Low Node Count"
        }}
      />
      {/* Purge Confirmation Modal */}
      <AnimatePresence>
        {showPurgeConfirm && (
          <div key="purge-nuclear-portal" className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-3xl">
            <motion.div
              key="purge-nuclear-modal"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl border border-red-100 text-center"
            >
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-red-600/10 shadow-xl">
                <Trash2 size={40} />
              </div>
              <h2 className="text-3xl font-black text-slate-950 uppercase italic mb-4">Wipe EVERYTHING Up</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed mb-8 text-balance">
                NO DRAMA. MAKE ALL 0. This will permanently destroy all network data.
              </p>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowPurgeConfirm(false)}
                  className="flex-1 py-5 bg-slate-100 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:bg-slate-200 transition-all"
                >
                  Return
                </button>
                <button 
                  onClick={handleExecutePurge}
                  disabled={isSubmitting}
                  className="flex-1 py-5 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-2xl shadow-red-600/30 hover:bg-red-700 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "WIPING..." : "CONFIRM PURGE"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TeamViewer Remote Session Overlay */}
      <AnimatePresence>
        {isTVConnecting && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-slate-950/95 backdrop-blur-3xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-32 h-32 mx-auto relative mb-8">
                <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <div className="absolute inset-4 bg-slate-900 rounded-full flex items-center justify-center text-blue-500">
                  <Tv size={40} />
                </div>
              </div>
              <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">Establishing Secure Uplink</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] mb-12">TeamViewer Protocol v15.x • Negotiating Handshake</p>
              
              <div className="max-w-xs mx-auto space-y-4">
                <div className="flex items-center gap-4 text-left bg-white/5 p-4 rounded-2xl border border-white/10">
                   <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-500 font-black italic">
                      {selectedDeviceForTV?.teamViewerId?.slice(0, 2)}
                   </div>
                   <div>
                     <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Routing via Global Node</p>
                     <p className="text-xs font-black text-white font-mono">{selectedDeviceForTV?.teamViewerId}</p>
                   </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showTVSession && selectedDeviceForTV && (
          <div className="fixed inset-0 z-[5000] flex flex-col bg-slate-950">
            {/* TV Toolbar */}
            <header className="h-20 bg-slate-900 border-b border-white/10 px-8 flex items-center justify-between shadow-2xl relative z-10">
               <div className="flex items-center gap-6">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                     <MousePointer2 size={20} />
                   </div>
                   <div>
                     <h3 className="text-sm font-black text-white uppercase italic tracking-tighter">Remote Session: {selectedDeviceForTV.id.slice(0, 8)}</h3>
                     <div className="flex items-center gap-2">
                       <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">CONNECTED • HIGH PERFORMANCE MODE</p>
                     </div>
                   </div>
                 </div>
                 <div className="h-8 w-px bg-white/10 mx-2" />
                 <div className="flex gap-2">
                    <button className="p-3 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-all" title="Audio Stream">
                      <Volume2 size={16} />
                    </button>
                    <button className="p-3 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-all" title="Display Settings">
                      <Sun size={16} />
                    </button>
                    <button className="p-3 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-all" title="Shield Protection">
                      <Shield size={16} />
                    </button>
                 </div>
               </div>

               <div className="flex items-center gap-4">
                 <div className="flex flex-col items-end mr-4">
                   <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Latency Spectrum</p>
                   <p className="text-xs font-black text-emerald-500 font-mono italic">24ms (Ultra Low)</p>
                 </div>
                 <button 
                   onClick={() => setShowTVSession(false)}
                   className="bg-red-500 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-red-500/20 hover:bg-red-600 transition-all flex items-center gap-3"
                 >
                   <Power size={16} />
                   Terminiate Session
                 </button>
                 <button 
                   onClick={() => {/* Fullscreen logic */}}
                   className="p-4 rounded-2xl border border-white/20 text-white hover:bg-white/5"
                 >
                   <Maximize size={18} />
                 </button>
               </div>
            </header>

            {/* Session Mirror View */}
            <main className="flex-1 bg-black relative flex items-center justify-center p-8">
               <div className="w-full h-full max-w-6xl aspect-video bg-slate-900 rounded-[3rem] border-8 border-slate-800 shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden relative group">
                  {/* Mock Android Interface */}
                  <img 
                    src={getSafeUrl(selectedDeviceForTV.metrics?.currentAdImage)}
                    className="w-full h-full object-cover blur-md opacity-20"
                    alt="Remote BG"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="w-24 h-24 bg-white/10 backdrop-blur-3xl rounded-full flex items-center justify-center text-white mb-6 border border-white/10 animate-bounce">
                      <MousePointer2 size={40} className="translate-x-1 translate-y-1" />
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 text-center max-w-md shadow-2xl">
                       <h4 className="text-xl font-black text-white uppercase italic tracking-tighter mb-4">Interactive Control Hub</h4>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                          Secure pixel-perfect stream established via TeamViewer cloud. You have full administrative control over this Android node.
                       </p>
                    </div>
                  </div>
                  
                  {/* Floating Interaction Menu */}
                  <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-2xl p-4 rounded-3xl border border-white/20 flex gap-4 shadow-2xl opacity-0 group-hover:opacity-100 transition-all">
                     <button className="flex flex-col items-center gap-2 p-4 hover:bg-white/10 rounded-2xl transition-all">
                        <RefreshCw size={20} className="text-amber-500" />
                        <span className="text-[8px] font-black uppercase text-white tracking-widest">Soft Reset</span>
                     </button>
                     <button className="flex flex-col items-center gap-2 p-4 hover:bg-white/10 rounded-2xl transition-all">
                        <Smartphone size={20} className="text-blue-500" />
                        <span className="text-[8px] font-black uppercase text-white tracking-widest">Home</span>
                     </button>
                     <button className="flex flex-col items-center gap-2 p-4 hover:bg-white/10 rounded-2xl transition-all">
                        <ArrowLeft size={20} className="text-slate-400" />
                        <span className="text-[8px] font-black uppercase text-white tracking-widest">Back</span>
                     </button>
                     <div className="w-px h-10 bg-white/10 my-auto mx-2" />
                     <button className="flex flex-col items-center gap-2 p-4 hover:bg-white/10 rounded-2xl transition-all">
                        <Lock size={20} className="text-red-500" />
                        <span className="text-[8px] font-black uppercase text-white tracking-widest">Lock UI</span>
                     </button>
                  </div>
               </div>
               
               {/* Side Status Bar */}
               <div className="absolute right-12 top-1/2 -translate-y-1/2 flex flex-col gap-4">
                  <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-white/10">
                     <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3">Unit Telemetry</p>
                     <div className="space-y-4">
                        <div>
                          <p className="text-[7px] font-black text-slate-400 uppercase">Memory</p>
                          <p className="text-xs font-black text-white font-mono">1.2GB / 4GB</p>
                        </div>
                        <div>
                          <p className="text-[7px] font-black text-slate-400 uppercase">CPU Load</p>
                          <p className="text-xs font-black text-amber-500 font-mono">12%</p>
                        </div>
                        <div>
                          <p className="text-[7px] font-black text-slate-400 uppercase">Battery</p>
                          <p className="text-xs font-black text-emerald-500 font-mono">Charging (88%)</p>
                        </div>
                     </div>
                  </div>
               </div>
            </main>
          </div>
        )}
      </AnimatePresence>

      {/* Verification Modal Removed */}

      {/* Toast Notification */}
      <AnimatePresence>
        {opFeedback && (
          <motion.div
            key="op-feedback-toast-bottom"
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            className={cn(
              "fixed bottom-8 left-1/2 z-[3000] px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[300px] border",
              opFeedback.type === 'success' ? "bg-slate-900 border-green-500/50 text-white" : 
              opFeedback.type === 'error' ? "bg-red-600 border-white/20 text-white" : 
              "bg-slate-900 border-amber-500/50 text-white"
            )}
          >
            <div className={cn(
              "p-2 rounded-xl",
              opFeedback.type === 'success' ? "bg-green-500/20 text-green-500" :
              opFeedback.type === 'error' ? "bg-white/20 text-white" :
              "bg-amber-500/20 text-amber-500"
            )}>
              {opFeedback.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">{opFeedback.type.toUpperCase()} SIGNAL</span>
              <span className="text-xs font-black uppercase tracking-widest">{opFeedback.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Vision Modal */}
      <AnimatePresence>
        {viewingUnit && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-3xl" onClick={() => setViewingUnit(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-6xl bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden relative z-10 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-md">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center">
                    <Monitor size={24} className="text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-widest">Vision Expanded</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">Unit ID: {viewingUnit.id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setViewingUnit(null)}
                  className="w-12 h-12 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="relative aspect-video w-full bg-black flex items-center justify-center">
                {viewingUnit.metrics?.currentAdType === 'VIDEO' || viewingUnit.metrics?.currentAdImage?.split('?')[0].match(/\.(mp4|webm|ogg)$/i) ? (
                  <video
                    src={getSafeUrl(viewingUnit.metrics.currentAdImage)}
                    className="w-full h-full object-contain"
                    autoPlay
                    muted
                    loop
                    controls
                    playsInline
                  />
                ) : (
                  <img
                    src={getSafeUrl(viewingUnit.metrics?.currentAdImage) || `https://placehold.co/1920x1080/1e293b/FFFFFF/png?text=Unit+${viewingUnit.id.slice(0, 4)}`}
                    alt="Expanded Vision"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                )}
                
                {/* HUD Overlay */}
                <div className="absolute top-6 left-6 flex items-center gap-3">
                  <div className={cn("px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest backdrop-blur-md shadow-2xl flex items-center gap-2", viewingUnit.metrics?.online ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/30" : "bg-red-500/20 text-red-500 border-red-500/30")}>
                     <div className={cn("w-2 h-2 rounded-full", viewingUnit.metrics?.online ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                     Live Status
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {networkConfigTarget && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setNetworkConfigTarget(null)} />
             <motion.div
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-8 relative z-10"
             >
                <div className="flex items-center gap-4 mb-6">
                   <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center">
                      <Wifi size={24} />
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Configure Network</h3>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Terminal {networkConfigTarget}</p>
                   </div>
                </div>

                <form className="space-y-4" onSubmit={async (e) => {
                   e.preventDefault();
                   const fd = new FormData(e.currentTarget);
                   try {
                     await firebaseService.updateTerminalNetwork(networkConfigTarget, {
                        wifiSSID: fd.get('wifiSSID'),
                        wifiPassword: fd.get('wifiPassword'),
                        hotspotName: fd.get('hotspotName'),
                        hotspotPassword: fd.get('hotspotPassword'),
                        lastConnected: false,
                        connectionStatus: 'DISCONNECTED'
                     });
                     showToast("Network configuration saved.", 'success');
                     setNetworkConfigTarget(null);
                   } catch (err: any) {
                     showToast(err.message, 'error');
                   }
                }}>
                   <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <div>
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Primary WiFi (SSID)</label>
                         <input name="wifiSSID" required defaultValue={terminals.find(t => t.id === networkConfigTarget)?.networkConfig?.wifiSSID || ''} placeholder="e.g. Starbucks_WiFi" className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500/20" />
                      </div>
                      <div>
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Primary Password</label>
                         <input name="wifiPassword" type="password" required defaultValue={terminals.find(t => t.id === networkConfigTarget)?.networkConfig?.wifiPassword || ''} placeholder="••••••••" className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500/20" />
                      </div>
                      <div className="pt-2 border-t border-slate-200/50">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Fallback Hotspot (SSID)</label>
                         <input name="hotspotName" placeholder="e.g. JioDongle_1234" defaultValue={terminals.find(t => t.id === networkConfigTarget)?.networkConfig?.hotspotName || ''} className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500/20" />
                      </div>
                      <div>
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Hotspot Password</label>
                         <input name="hotspotPassword" type="password" placeholder="••••••••" defaultValue={terminals.find(t => t.id === networkConfigTarget)?.networkConfig?.hotspotPassword || ''} className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500/20" />
                      </div>
                   </div>

                   <div className="flex justify-end gap-3 pt-4">
                      <button type="button" onClick={() => setNetworkConfigTarget(null)} className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
                      <button type="submit" className="px-8 py-4 bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-amber-500/20">Save Configuration</button>
                   </div>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
      <AnimatePresence>
        {selectedDriverForAgreement && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedDriverForAgreement(null)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center shrink-0">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center">
                         <Shield className="text-white w-6 h-6" />
                      </div>
                      <div>
                         <h3 className="text-xl font-black italic uppercase text-slate-900 leading-none">Agreement Vault</h3>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Operator: {selectedDriverForAgreement.name}</p>
                      </div>
                   </div>
                   <button onClick={() => setSelectedDriverForAgreement(null)} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:bg-slate-100"><X size={20} /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                   {selectedDriverForAgreement._agreementData?.agreementAccepted ? (
                      <>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
                           <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Verification Selfie</p>
                              <div className="w-full aspect-square max-w-[150px] rounded-2xl overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                                 <img src={selectedDriverForAgreement._agreementData?.verificationSelfieUrl || selectedDriverForAgreement.selfiePhoto || selectedDriverForAgreement.profileImage || selectedDriverForAgreement.documents?.selfie} className="w-full h-full object-cover" alt="Selfie" />
                              </div>
                           </div>
                           <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Digital Signature</p>
                              <div className="w-full aspect-square max-w-[150px] rounded-2xl overflow-hidden border-2 border-white shadow-sm flex items-center justify-center bg-white p-4 flex-shrink-0">
                                 <img src={selectedDriverForAgreement._agreementData?.signatureUrl} className="max-w-full max-h-full object-contain" alt="Signature" />
                              </div>
                           </div>
                           <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Aadhar</p>
                              <div className="w-full aspect-video rounded-2xl overflow-hidden border-2 border-white shadow-sm flex items-center justify-center bg-white p-2">
                                 {(selectedDriverForAgreement.aadharPhoto || selectedDriverForAgreement.documents?.aadhaar) ? (
                                   <img src={selectedDriverForAgreement.aadharPhoto || selectedDriverForAgreement.documents?.aadhaar} className="w-full h-full object-contain" alt="Aadhar" />
                                 ) : (
                                   <X size={24} className="text-slate-300" />
                                 )}
                              </div>
                           </div>
                           <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Driving License</p>
                              <div className="w-full aspect-video rounded-2xl overflow-hidden border-2 border-white shadow-sm flex items-center justify-center bg-white p-2">
                                 {(selectedDriverForAgreement.dlPhoto || selectedDriverForAgreement.documents?.drivingLicense) ? (
                                   <img src={selectedDriverForAgreement.dlPhoto || selectedDriverForAgreement.documents?.drivingLicense} className="w-full h-full object-contain" alt="DL" />
                                 ) : (
                                   <X size={24} className="text-slate-300" />
                                 )}
                              </div>
                           </div>
                        </div>

                        <div className="p-6 bg-slate-900 rounded-3xl text-white space-y-4">
                           <div className="flex items-center justify-between">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Digital Contract (PDF)</p>
                              <span className="px-2 py-1 bg-green-500 text-white rounded text-[8px] font-black uppercase">v{selectedDriverForAgreement._agreementData?.version || '1.0'} Signed</span>
                           </div>
                           <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 group hover:bg-white/10 transition-all cursor-pointer" 
                                onClick={() => {
                                   if (selectedDriverForAgreement._agreementData?.agreementPdfUrl) {
                                       window.open(selectedDriverForAgreement._agreementData.agreementPdfUrl, '_blank');
                                   } else {
                                       showToast('PDF not generated for initial quick provisions.', 'info');
                                   }
                                }}>
                              <div className="flex items-center gap-3">
                                 <FileText className="text-amber-500" size={20} />
                                 <span className="text-xs font-black uppercase tracking-tight">Open Generated Contract</span>
                              </div>
                              <ExternalLink size={16} className="text-slate-500 group-hover:text-amber-500 transition-colors" />
                           </div>
                        </div>

                        <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 flex items-center gap-4">
                           <ShieldCheck className="text-blue-500 w-8 h-8" />
                           <div>
                              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Compliance Signal</p>
                              <p className="text-sm font-bold text-slate-700">Driver has legally accepted the partnership agreement and successfully completed biometric verification.</p>
                           </div>
                        </div>
                      </>
                   ) : (
                      <div className="h-64 flex flex-col items-center justify-center text-center space-y-4 grayscale opacity-40">
                         <FileText size={48} className="text-slate-300" strokeWidth={1} />
                         <div>
                            <p className="text-xs font-black text-slate-900 uppercase tracking-widest italic">Awaiting Signature</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Driver has not yet initialized the digital agreement sequence.</p>
                         </div>
                      </div>
                   )}
                </div>

                <div className="p-8 border-t border-slate-100 flex gap-4 shrink-0 bg-white">
                   <button 
                     onClick={() => setSelectedDriverForAgreement(null)}
                     className="flex-1 py-4 bg-slate-100 rounded-2xl text-[10px] font-black uppercase text-slate-400 tracking-widest"
                   >
                     Close Vault
                   </button>
                   {selectedDriverForAgreement._agreementData?.agreementAccepted && selectedDriverForAgreement.kycStatus === 'PENDING' && (
                      <button 
                        onClick={async () => {
                           if (confirm("Approve all documents and driver and enable payouts?")) {
                              await firebaseService.updateDriverProfile(selectedDriverForAgreement.uid, { kycStatus: 'APPROVED', status: 'active', payoutEnabled: true, adminApproved: true });
                              showToast("Driver Network Profile Approved.", 'success');
                              setSelectedDriverForAgreement(null);
                           }
                        }}
                        className="flex-1 py-4 bg-green-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-green-500/20"
                      >
                        Approve Operator
                      </button>
                   )}
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ErrorBoundary>
  );
}
