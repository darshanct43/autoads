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
  Truck,
  Wallet,
  Check,
  X,
  Smartphone,
  Zap,
  Trash2,
  MessageSquare,
  Send,
  Settings,
  Video,
  ShieldCheck,
  Lock,
  Gift,
  LogOut,
  MousePointer2,
  Database,
  Radio,
  RefreshCw,
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
import { auth } from "@/lib/firebase";
import { UserRole } from "@/types";
import RoadmapChart from "../common/RoadmapChart";
import AdminAssistant from "../common/AdminAssistant";
import { ErrorBoundary } from "../common/ErrorBoundary";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

interface AdminPortalProps {
  onRoleJump?: (role: UserRole) => void;
  onLogout: () => void;
}

export default function AdminPortal({
  onRoleJump,
  onLogout,
}: AdminPortalProps) {
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
  const liveScreensCount = deviceScreens.filter((s) => {
    if (!s.timestamp) return false;
    const lastUpdate = s.timestamp.toMillis?.() || 0;
    return Date.now() - lastUpdate < 30000; // 30 seconds for screen live stat
  }).length;
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState<string | null>(null);
  const [selectedDriverHistory, setSelectedDriverHistory] = useState<any[]>([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
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
    maxAutos: 5,
    startDate: "",
    endDate: "",
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDriverForDocs, setSelectedDriverForDocs] = useState<Driver | null>(null);
  const [showDocModal, setShowDocModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [opFeedback, setOpFeedback] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [terminals, setTerminals] = useState<any[]>([]);
  const [liveStatus, setLiveStatus] = useState<any[]>([]);

  useEffect(() => {
    if (opFeedback) {
      const timer = setTimeout(() => setOpFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [opFeedback]);

  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [purgeInput, setPurgeInput] = useState("");

  const liveUnitsCount = liveStatus.filter((status) => {
    if (!status.updatedAt) return false;
    const lastUpdate = status.updatedAt.toMillis?.() || 0;
    return Date.now() - lastUpdate < 60000; // 1 minute window for live status
  }).length;
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    20.5937, 78.9629,
  ]);
  const [mapZoom, setMapZoom] = useState(5);

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

  const handleCreateCampaign = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    try {
      await firebaseService.createCampaign({
        title: formData.get("title") as string,
        description: (formData.get("description") as string) || "",
        assetUrl: formData.get("assetUrl") as string,
        budget: parseFloat(formData.get("budget") as string),
        targetLat: parseFloat(formData.get("targetLat") as string) || 0,
        targetLng: parseFloat(formData.get("targetLng") as string) || 0,
        coverageRadius:
          parseFloat(formData.get("coverageRadius") as string) || 5000,
        status: "PENDING",
        customerId: "SYSTEM_ADMIN",
      });
      setShowCampaignModal(false);
    } catch (err) {
      console.error(err);
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
    .filter((p) => p && (p.status === "success" || p.status === "SUCCESS"))
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
    const fetchProposals = async () => {
      const ps = await firebaseService.getPlanProposals();
      setPlanProposals(ps);
    };
    fetchProposals();
  }, []);

  const handleApprovePlan = async (proposalId: string, planId: string, newPrice: number) => {
    try {
      await firebaseService.approvePlanProposal(proposalId, planId, newPrice);
      const up = await firebaseService.getPlans();
      setPlans(up);
      const props = await firebaseService.getPlanProposals();
      setPlanProposals(props);
      showToast("Plan rate updated successfully!", 'success');
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

  const handleApproveCampaign = async (campaignId: string) => {
    setApprovingCampaignId(campaignId);
    setShowApprovalModal(true);
    // Reset selection when starting approval
    setSelectedDriverIds([]);
  };

  const handleConfirmApproval = async () => {
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
          durationDays: approvalForm.durationDays,
          hoursPerDay: approvalForm.hoursPerDay,
          maxAutos: approvalForm.maxAutos,
          startDate: approvalForm.startDate,
          endDate: approvalForm.endDate,
          assignedDrivers: selectedDriverIds,
        },
      );
      showToast("Campaign Approved and Drivers Assigned!", 'success');
      setShowApprovalModal(false);
      setApprovingCampaignId(null);
    } catch (err) {
      showToast("Approval sync failed. Check cloud rules.", 'error');
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
    setIsAssigning(true);
    try {
      await firebaseService.adminAssignDrivers(
        selectedCampaign.id,
        selectedDriverIds,
      );
      showToast(`Success! Campaign assigned to ${selectedDriverIds.length} drivers.`, 'success');
      setSelectedCampaign(null);
      setSelectedDriverIds([]);
    } catch (e) {
      showToast("Assignment failed.", 'error');
    } finally {
      setIsAssigning(false);
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

  // Simulation Heartbeat Disabled by request to maintain operational integrity.
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
            try { val = JSON.stringify(val); } catch (e) { val = "[Object]"; }
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

  const filteredDrivers = (drivers || []).filter(
    (d) =>
      (d.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.phone || "").includes(searchTerm) ||
      (d.vNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.gpsId || "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <ErrorBoundary componentName="Admin Command Center">
      <div className="flex h-screen bg-[#f8fafc] text-slate-600 overflow-hidden relative">
      <AnimatePresence>
        {showPurgeConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
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
        <div className="flex flex-col gap-5">
          <button
            onClick={() => setActiveTab("DASHBOARD")}
            className={cn(
              "p-3 rounded-2xl transition-all relative group",
              activeTab === "DASHBOARD"
                ? "bg-amber-500 text-slate-950"
                : "text-slate-500 hover:bg-white/5 hover:text-white",
            )}
            title="Dashboard"
          >
            <Activity size={20} />
            {activeTab === "DASHBOARD" && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-amber-500 rounded-l-full translate-x-4"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab("MAP")}
            className={cn(
              "p-3 rounded-2xl transition-all relative group",
              activeTab === "MAP"
                ? "bg-amber-500 text-slate-950"
                : "text-slate-500 hover:bg-white/5 hover:text-white",
            )}
            title="Live Map"
          >
            <MapPin size={20} />
            {activeTab === "MAP" && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-amber-500 rounded-l-full translate-x-4"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab("CAMPAIGNS")}
            className={cn(
              "p-3 rounded-2xl transition-all relative group",
              activeTab === "CAMPAIGNS"
                ? "bg-amber-500 text-slate-950"
                : "text-slate-500 hover:bg-white/5 hover:text-white",
            )}
            title="Ad Campaigns"
          >
            <Monitor size={20} />
            {activeTab === "CAMPAIGNS" && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-amber-500 rounded-l-full translate-x-4"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab("REVIEWS")}
            className={cn(
              "p-3 rounded-2xl transition-all relative group",
              activeTab === "REVIEWS"
                ? "bg-amber-500 text-slate-950"
                : "text-slate-500 hover:bg-white/5 hover:text-white",
            )}
            title="Campaign Reviews"
          >
            <Zap size={20} />
            {activeTab === "REVIEWS" && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-amber-500 rounded-l-full translate-x-4"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab("MONITOR")}
            className={cn(
              "p-3 rounded-2xl transition-all relative group",
              activeTab === "MONITOR"
                ? "bg-amber-500 text-slate-950"
                : "text-slate-500 hover:bg-white/5 hover:text-white",
            )}
            title="Live Unit Screens"
          >
            <Smartphone size={20} />
            {activeTab === "MONITOR" && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-amber-500 rounded-l-full translate-x-4"></div>
            )}
            {liveScreensCount > 0 && (
              <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("TICKETS")}
            className={cn(
              "p-3 rounded-2xl transition-all relative group",
              activeTab === "TICKETS"
                ? "bg-amber-500 text-slate-950"
                : "text-slate-500 hover:bg-white/5 hover:text-white",
            )}
            title="Support"
          >
            <AlertCircle size={20} />
            {activeTab === "TICKETS" && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-amber-500 rounded-l-full translate-x-4"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab("DASHBOARD")}
            className={cn(
              "flex flex-col items-center gap-1 p-3 rounded-2xl transition-all relative group",
              activeTab === "DASHBOARD"
                ? "bg-amber-500 text-slate-950"
                : "text-slate-500 hover:bg-white/5 hover:text-white",
            )}
            title="Dashboard"
          >
            <Activity size={20} />
            <span className={cn("text-[7px] font-black uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity", activeTab === "DASHBOARD" && "opacity-100")}>Stats</span>
            {activeTab === "DASHBOARD" && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-amber-500 rounded-l-full translate-x-4"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab("MAP")}
            className={cn(
              "flex flex-col items-center gap-1 p-3 rounded-2xl transition-all relative group",
              activeTab === "MAP"
                ? "bg-amber-500 text-slate-950"
                : "text-slate-500 hover:bg-white/5 hover:text-white",
            )}
            title="Live Tracking Map"
          >
            <MapPin size={20} />
            <span className={cn("text-[7px] font-black uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity", activeTab === "MAP" && "opacity-100")}>Map</span>
            {activeTab === "MAP" && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-amber-500 rounded-l-full translate-x-4"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab("TERMINAL_HUB")}
            className={cn(
              "flex flex-col items-center gap-1 p-3 rounded-2xl transition-all relative group",
              activeTab === "TERMINAL_HUB"
                ? "bg-amber-500 text-slate-950"
                : "text-slate-500 hover:bg-white/5 hover:text-white",
            )}
            title="Terminal Management"
          >
            <Terminal size={20} />
            <span className={cn("text-[7px] font-black uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity", activeTab === "TERMINAL_HUB" && "opacity-100")}>Terminal</span>
            {activeTab === "TERMINAL_HUB" && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-amber-500 rounded-l-full translate-x-4"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab("CAMPAIGNS")}
            className={cn(
              "flex flex-col items-center gap-1 p-3 rounded-2xl transition-all relative group",
              activeTab === "CAMPAIGNS"
                ? "bg-amber-500 text-slate-950"
                : "text-slate-500 hover:bg-white/5 hover:text-white",
            )}
            title="Campaign Management"
          >
            <Monitor size={20} />
            <span className={cn("text-[7px] font-black uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity", activeTab === "CAMPAIGNS" && "opacity-100")}>Ads</span>
            {activeTab === "CAMPAIGNS" && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-amber-500 rounded-l-full translate-x-4"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab("MONITOR")}
            className={cn(
              "flex flex-col items-center gap-1 p-3 rounded-2xl transition-all relative group",
              activeTab === "MONITOR"
                ? "bg-amber-500 text-slate-950"
                : "text-slate-500 hover:bg-white/5 hover:text-white",
            )}
            title="Live Monitoring"
          >
            <Smartphone size={20} />
            <span className={cn("text-[7px] font-black uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity", activeTab === "MONITOR" && "opacity-100")}>Live</span>
            {activeTab === "MONITOR" && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-amber-500 rounded-l-full translate-x-4"></div>
            )}
            {liveScreensCount > 0 && (
              <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("PRICING")}
            className={cn(
              "flex flex-col items-center gap-1 p-3 rounded-2xl transition-all relative group",
              activeTab === "PRICING"
                ? "bg-amber-500 text-slate-950"
                : "text-slate-500 hover:bg-white/5 hover:text-white",
            )}
            title="Market Pricing"
          >
            <IndianRupee size={20} />
            <span className={cn("text-[7px] font-black uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity", activeTab === "PRICING" && "opacity-100")}>Rates</span>
            {activeTab === "PRICING" && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-amber-500 rounded-l-full translate-x-4"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab("PAYMENTS")}
            className={cn(
              "flex flex-col items-center gap-1 p-3 rounded-2xl transition-all relative group",
              activeTab === "PAYMENTS"
                ? "bg-amber-500 text-slate-950"
                : "text-slate-500 hover:bg-white/5 hover:text-white",
            )}
            title="Payments Registry"
          >
            <CreditCard size={20} />
            <span className={cn("text-[7px] font-black uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity", activeTab === "PAYMENTS" && "opacity-100")}>Pay</span>
            {activeTab === "PAYMENTS" && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-amber-500 rounded-l-full translate-x-4"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab("FLEET")}
            className={cn(
              "flex flex-col items-center gap-1 p-3 rounded-2xl transition-all relative group",
              activeTab === "FLEET"
                ? "bg-amber-500 text-slate-950"
                : "text-slate-500 hover:bg-white/5 hover:text-white",
            )}
            title="Fleet Management"
          >
            <Truck size={20} />
            <span className={cn("text-[7px] font-black uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity", activeTab === "FLEET" && "opacity-100")}>Fleet</span>
            {activeTab === "FLEET" && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-amber-500 rounded-l-full translate-x-4"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab("WITHDRAWALS")}
            className={cn(
              "p-3 rounded-2xl transition-all relative group",
              activeTab === "WITHDRAWALS"
                ? "bg-amber-500 text-slate-950"
                : "text-slate-500 hover:bg-white/5 hover:text-white",
            )}
            title="Withdrawal Requests"
          >
            <Wallet size={20} />
            {activeTab === "WITHDRAWALS" && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-amber-500 rounded-l-full translate-x-4"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab("NOTICES")}
            className={cn(
              "p-3 rounded-2xl transition-all relative group",
              activeTab === "NOTICES"
                ? "bg-amber-500 text-slate-950"
                : "text-slate-500 hover:bg-white/5 hover:text-white",
            )}
            title="Global Offers"
          >
            <Gift size={20} />
            {activeTab === "NOTICES" && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-amber-500 rounded-l-full translate-x-4"></div>
            )}
          </button>
        </div>
        <div className="mt-auto flex flex-col items-center gap-4 pb-4">
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

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800 z-50 flex items-center justify-around py-3 px-2">
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
          onClick={() => setActiveTab("MONITOR")}
          className={cn(
            "p-2 rounded-xl transition-all relative",
            activeTab === "MONITOR"
              ? "bg-amber-500 text-slate-950"
              : "text-slate-500",
          )}
        >
          <Smartphone size={20} />
          {liveScreensCount > 0 && (
            <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("TERMINAL_HUB")}
          className={cn(
            "p-2 rounded-xl transition-all",
            activeTab === "TERMINAL_HUB"
              ? "bg-amber-500 text-slate-950"
              : "text-slate-500",
          )}
        >
          <Terminal size={20} />
        </button>
        <button
          onClick={() => setActiveTab("FLEET")}
          className={cn(
            "p-2 rounded-xl transition-all",
            activeTab === "FLEET"
              ? "bg-amber-500 text-slate-950"
              : "text-slate-500",
          )}
        >
          <Truck size={20} />
        </button>
        <button
          onClick={() => setActiveTab("PAYMENTS")}
          className={cn(
            "p-2 rounded-xl transition-all",
            activeTab === "PAYMENTS"
              ? "bg-amber-500 text-slate-950"
              : "text-slate-500",
          )}
        >
          <CreditCard size={20} />
        </button>
        <button
          onClick={() => setActiveTab("WITHDRAWALS")}
          className={cn(
            "p-2 rounded-xl transition-all",
            activeTab === "WITHDRAWALS"
              ? "bg-amber-500 text-slate-950"
              : "text-slate-500",
          )}
        >
          <Wallet size={20} />
        </button>
      </div>

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
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
               <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
               <span className="text-[9px] font-black text-slate-800 uppercase tracking-widest italic">Mayaan Network Live</span>
            </div>
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
                {(liveUnitsCount || 0).toLocaleString()} Nodes Online
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

        <main className="flex-1 overflow-y-auto px-8 py-8 md:px-12 md:py-10 space-y-10 md:space-y-12 custom-scrollbar">
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
              ].map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
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
                        dynamicChartData.map((item, i) => (
                          <div key={i} className="space-y-2">
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
                             Awaiting New Node Sync...
                           </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-slate-950 rounded-full animate-ping"></span>
                          <span className="text-[11px] font-black uppercase">
                            Processing Live Nodes...
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
                      {campaigns.filter((c) => c.status === "ACTIVE").length}{" "}
                      Units
                    </span>
                  </div>
                  <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto">
                    {campaigns
                      .filter((c) => c.status === "ACTIVE")
                      .map((c, i) => (
                        <div
                          key={i}
                          className={cn(
                            "p-6 flex items-center justify-between hover:bg-slate-50 transition-all cursor-pointer group",
                            selectedCampaign?.id === c.id &&
                              "bg-amber-50 border-r-4 border-amber-500",
                          )}
                          onClick={() => setSelectedCampaign(c)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-12 bg-slate-900 rounded-xl overflow-hidden relative border border-slate-800">
                              {c.mediaType === "IMAGE" ? (
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
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                Assigned: {c.assignedDrivers?.length || 0} Units
                              </p>
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
                  <div className="p-4 border-b border-slate-50 bg-slate-50/30">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-black text-slate-900 uppercase italic">
                        Inventory Configuration
                      </h3>
                      <span className="px-3 py-1 bg-green-100 text-green-600 text-[8px] font-black uppercase rounded-lg">
                        Target: Active
                      </span>
                    </div>
                    <div className="relative">
                      <Search
                        size={14}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type="text"
                        placeholder="Search network nodes..."
                        className="w-full bg-white border border-slate-200 p-4 pl-12 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto max-h-[400px] p-6 space-y-2">
                    {filteredDrivers.map((d, i) => (
                      <label
                        key={i}
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
                          <div>
                            <span className="text-[11px] font-black uppercase text-slate-900 block leading-none">
                              {d.name}
                            </span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                              {d.vNo || "Unit ID: " + d.uid.slice(0, 6)}
                            </span>
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
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Pending Driver Onboarding ({drivers.filter(d => d.status === 'pending_verification').length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {drivers.filter(d => d.status === 'pending_verification').map((d, i) => (
            <motion.div
              key={i}
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
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Aadhaar', key: 'aadharPhoto' },
                    { label: 'RC', key: 'rcPhoto' },
                    { label: 'License', key: 'dlPhoto' },
                    { label: 'PAN', key: 'panPhoto' },
                    { label: 'Insurance', key: 'insurancePhoto' }
                  ].map(doc => (
                    <div key={doc.key} className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex flex-col items-center justify-center gap-1">
                      <span className="text-[7px] font-black uppercase text-slate-400">{doc.label}</span>
                      {d[doc.key as keyof Driver] ? (
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
                      setSelectedDriverForDocs(d);
                      setShowDocModal(true);
                    }}
                    className="py-4 border border-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all font-sans"
                  >
                    Review Docs
                  </button>
                  <button
                    onClick={() => firebaseService.updateDriverProfile(d.id, { status: 'active', isVerified: true })}
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
                    .map((c, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all flex flex-col h-full group"
                      >
                        <div className="h-56 bg-slate-950 relative overflow-hidden shrink-0 italic">
                          {c.mediaType === "IMAGE" ? (
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
                          <div className="absolute top-6 right-6">
                            <span className="bg-amber-500/20 backdrop-blur-md border border-amber-500/30 text-amber-500 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-2xl">
                              Awaiting Review
                            </span>
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
        ) : activeTab === "TERMINAL_HUB" ? (
          <div className="space-y-8 pb-20">
            {/* Header Stats From Screenshot */}
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
                      {/* Status Badge */}
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
                                .then(() => showToast("Terminal credentials revoked.", 'info'))
                                .catch(e => showToast(e.message, 'error'));
                            }
                          }}
                          className="p-4 border border-slate-200 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      
                      {/* Decorative Element */}
                      <div className="absolute -left-10 -bottom-10 w-24 h-24 bg-amber-500/10 blur-3xl rounded-full" />
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : activeTab === "PRICING" ? (
            <div className="space-y-8">
              <div className="bg-slate-900 p-6 md:p-8 rounded-3xl flex items-center justify-between text-white">
                <div>
                  <h2 className="text-3xl font-black italic uppercase text-amber-500">
                    Marketplace Economics
                  </h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Pricing Strategy Module
                  </p>
                </div>
                <IndianRupee className="text-amber-500" size={32} />
              </div>

              {/* Proposals Section */}
              {planProposals && planProposals.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Pending Rate Adjustments (From Support)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {planProposals.map((proposal, i) => {
                      const plan = plans.find(p => p.id === proposal.planId);
                      return (
                        <div key={i} className="bg-amber-50 p-6 rounded-2xl border border-amber-100 shadow-sm space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest leading-none mb-1">Proposed Change</p>
                              <h4 className="text-sm font-black text-slate-900 uppercase">{plan?.name || "Unknown Plan"}</h4>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Old: ₹{plan?.price || 0}</p>
                              <p className="text-lg font-black text-amber-600 decoration-amber-500">→ ₹{proposal.newPrice}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleApprovePlan(proposal.id, proposal.planId, proposal.newPrice).catch(() => {})}
                              className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all font-sans"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => handleRejectPlan(proposal.id).catch(() => {})}
                              className="flex-1 py-3 border border-slate-200 text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all font-sans"
                            >
                              Ignore
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {plans.map((plan, i) => (
                  <div
                    key={i}
                    className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-slate-900 uppercase">
                        {plan.name}
                      </h3>
                      <span className="text-xl font-black italic">
                        ₹{plan.price}
                      </span>
                    </div>
                    <div className="space-y-2 text-center opacity-40">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Support Team Proposals Only</p>
                      <Zap size={16} className="mx-auto mt-2" />
                    </div>
                  </div>
                ))}
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
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 relative">
                <div className="bg-slate-100 rounded-[2rem] md:rounded-[2.5rem] relative overflow-hidden border border-slate-100 shadow-xl h-[450px] md:flex-1 md:h-full z-10">
                  <MapContainer
                    key={activeTab}
                    center={mapCenter}
                    zoom={mapZoom}
                    className="h-full w-full outline-none"
                    zoomControl={true}
                    dragging={true}
                    touchZoom={true}
                    scrollWheelZoom={false}
                    doubleClickZoom={true}
                    boxZoom={true}
                    keyboard={true}
                  >
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />
                    <ChangeView center={mapCenter} zoom={mapZoom} />

                    {/* Render Campaign Coverage Areas */}
                    {campaigns
                      .filter(
                        (c) => c.status === "ACTIVE",
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

                    {/* Render Driver Markers */}
                    {driverLocations
                      .filter(
                        (loc) =>
                          typeof loc.lat === "number" &&
                          typeof loc.lng === "number" &&
                          loc.lat !== 0 && loc.lng !== 0,
                      )
                      .map((loc) => (
                        <Marker
                          key={loc.id}
                          position={[loc.lat, loc.lng]}
                          icon={autoIcon(loc.isOnline)}
                          eventHandlers={{
                            click: () => {
                              setSelectedLocation(loc);
                              setMapCenter([loc.lat, loc.lng]);
                              setMapZoom(16);
                              handleFetchDriverHistory(loc.driverId);
                            },
                          }}
                        >
                          <Popup closeButton={false}>
                            <div className="p-3 w-48 font-sans">
                              {/* Popup content */}
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-slate-950 rounded-lg flex items-center justify-center text-amber-500 shadow-lg border border-white/5">
                                  <Truck size={20} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[11px] font-black italic text-slate-900 uppercase truncate">
                                    {drivers.find((d) => d.uid === loc.driverId)
                                      ?.fullName || `Unit (${loc.driverId?.slice(-6)})`}
                                  </p>
                                  <div className="flex items-center gap-1.5">
                                    <div
                                      className={cn(
                                        "w-1.5 h-1.5 rounded-full",
                                        loc.isOnline
                                          ? "bg-green-500 animate-pulse"
                                          : "bg-slate-300",
                                      )}
                                    />
                                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">
                                      {loc.isOnline
                                        ? "TELEMETRY LIVE"
                                        : "LOST GPS FIX"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <button 
                                onClick={() => handleFetchDriverHistory(loc.driverId)}
                                className="w-full py-2 bg-slate-950 text-amber-500 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"
                              >
                                SHOW TRAIL <Zap size={10} />
                              </button>
                            </div>
                          </Popup>
                        </Marker>
                      ))}

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
                    <div className="absolute top-6 left-6 z-[1000] space-y-4">
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
                              .map((loc, idx) => {
                                const driver = drivers.find(d => d.uid === loc.driverId);
                                return (
                                  <div key={idx} className="flex flex-col bg-white/10 p-2 rounded-lg border border-white/10">
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
                            key={i}
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
                          ].map((item, i) => (
                            <div
                              key={i}
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
                      ? "Revenue Ledger"
                      : "Expense Ledger"}
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
                        `Fleet_${paymentSubTab}_Ledger`,
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
                        ? payments.map((p, i) => (
                            <tr
                              key={i}
                              className="hover:bg-slate-50 transition-all border-b border-slate-50"
                            >
                              <td className="px-8 py-5 text-[10px] font-mono text-slate-400">
                                {p.transactionId || p.id?.slice(0, 8)}
                              </td>
                              <td className="px-8 py-5 text-sm font-black text-slate-900 italic">
                                ₹{p.amount?.toLocaleString()}
                              </td>
                              <td className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                {p.customerId || "Customer"}
                              </td>
                              <td className="px-8 py-5">
                                <span className="px-3 py-1 bg-green-50 text-green-500 rounded-full text-[8px] font-black uppercase">
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
                        : driverPayments.map((p, i) => (
                            <tr
                              key={i}
                              className="hover:bg-slate-50 transition-all border-b border-slate-50"
                            >
                              <td className="px-8 py-5 text-[10px] font-mono text-slate-400">
                                {p.paymentId || p.id?.slice(0, 8)}
                              </td>
                              <td className="px-8 py-5 text-sm font-black text-slate-900 italic">
                                ₹{p.amount?.toLocaleString()}
                              </td>
                              <td className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                {p.driverId?.slice(0, 8)}
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
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
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
                      <button
                        key={t.id}
                        onClick={() => setActiveTicketId(t.id!)}
                        className={cn(
                          "w-full p-6 text-left hover:bg-slate-50 transition-all group relative",
                          activeTicketId === t.id && "bg-amber-50",
                        )}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="text-[11px] font-black text-slate-900 uppercase italic tracking-tighter truncate leading-none">
                            {t.driverName || "Driver " + t.driverId?.slice(-4)}
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
                      </button>
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
                <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 shadow-sm flex flex-col overflow-hidden relative">
                  {activeTicketId ? (
                    <>
                      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <div>
                          <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tighter">
                            {tickets.find((t) => t.id === activeTicketId)
                              ?.driverName || "Operator Chat"}
                          </h3>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">
                            Secure Hub Line
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            firebaseService.updateSupportTicketStatus(
                              activeTicketId,
                              "resolved",
                            )
                          }
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
            <div className="flex flex-col space-y-6">
              <div className="bg-slate-950 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-2xl border border-slate-800 text-white relative overflow-hidden shrink-0">
                <div className="absolute right-0 top-0 w-64 h-64 bg-amber-500/10 blur-3xl rounded-full" />
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <h2 className="text-xl md:text-3xl font-black italic uppercase text-amber-500 mb-2">
                      Remote Cloud Monitoring
                    </h2>
                    <p className="text-[10px] md:text-[12px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono">
                      Live Visual Verification Protocol
                    </p>
                  </div>
                  <div className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/10">
                    <div className="w-10 h-10 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500">
                      <Activity size={20} className="animate-pulse" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-white italic">
                        {deviceScreens.length} Units Pipeline
                      </p>
                      <p className="text-[9px] font-black text-slate-500 tracking-widest uppercase">
                        Real-time Stream Sync
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                  {(deviceScreens || []).map((screen, i) => {
                    const driver = (drivers || []).find(
                      (d) => d.uid === screen.driverId,
                    );
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm hover:shadow-2xl transition-all group overflow-hidden relative"
                      >
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-950 rounded-2xl flex items-center justify-center text-amber-500 font-black text-xs italic">
                              {(driver?.name || "??").slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="text-[11px] font-black text-slate-900 uppercase italic tracking-tighter">
                                {driver?.name || `Unknown Unit (${screen.driverId?.slice(-6) || "ID_MISSING"})`}
                              </h4>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                ID: {screen.driverId?.slice(0, 8)}
                              </p>
                            </div>
                          </div>
                          <div
                            className={cn(
                              "text-[7px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 shadow-sm",
                              screen.status === "playing"
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-500/5"
                                : screen.status === "error"
                                  ? "bg-red-50 text-red-600 border-red-100"
                                  : "bg-slate-50 text-slate-400 border-slate-100",
                            )}
                          >
                            <div
                              className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                screen.status === "playing"
                                  ? "bg-emerald-500 animate-pulse"
                                  : screen.status === "error"
                                    ? "bg-red-500"
                                    : "bg-slate-300",
                              )}
                            />
                            {screen.status?.toUpperCase()}
                          </div>
                        </div>

                        <div className="aspect-[16/9] w-full bg-slate-100 rounded-3xl overflow-hidden relative cursor-zoom-in border border-slate-100 mb-6 group-hover:scale-[1.02] transition-transform duration-500">
                          <img
                            src={screen.imageUrl}
                            alt="Device Snapshot"
                            className="w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-700"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                            <button className="w-full py-2 bg-white/20 backdrop-blur-md border border-white/20 rounded-xl text-white text-[8px] font-black uppercase tracking-widest">
                              Expand Vision
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="text-slate-400 uppercase tracking-widest">
                              Transmitted at
                            </span>
                            <span className="text-slate-900 font-mono italic">
                              {screen.timestamp
                                ? new Date(
                                    screen.timestamp.toMillis?.() ||
                                      screen.timestamp,
                                  ).toLocaleString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })
                                : "Processing..."}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="text-slate-400 uppercase tracking-widest">
                              Latency Spectrum
                            </span>
                            <span className="text-amber-500 font-mono italic underline decoration-amber-500/30">
                              Stable 54ms
                            </span>
                          </div>
                          <button className="w-full mt-2 py-4 bg-slate-50 text-slate-900 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] border border-slate-100 hover:bg-slate-950 hover:text-white transition-all group-hover:shadow-[0_15px_30px_-10px_rgba(0,0,0,0.1)]">
                            CAPTURE LIVE FRAME
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                  {deviceScreens.length === 0 && (
                    <div className="col-span-full h-96 flex flex-col items-center justify-center bg-white rounded-[3rem] border border-dashed border-slate-200">
                      <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200 mb-6">
                        <Activity size={40} />
                      </div>
                      <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest leading-none mb-4">
                        No Streams Connected
                      </h3>
                      <p className="max-w-xs text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-relaxed px-12">
                        Activate remote monitoring protocols on your Android
                        fleet nodes to initiate visual communication uplink.
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
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl md:text-3xl font-black italic uppercase tracking-tighter text-amber-500">
                      Fleet Operations
                    </h2>
                    <p className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest italic opacity-80">
                      Network Personnel Cluster
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleExtractionClick(e, drivers, "Network_Fleet_Directory")}
                    disabled={isExtracting}
                    className="bg-amber-500 text-slate-950 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isExtracting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                    {isExtracting ? "Processing..." : "Extract Data"}
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left sm:table">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-left">
                          Operator Name
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
                      {filteredDrivers.map((d, i) => (
                        <tr
                          key={i}
                          className="hover:bg-slate-50/50 transition-all group"
                        >
                          <td className="px-8 py-5">
                            <span className="text-[11px] md:text-sm font-black text-slate-900 italic tracking-tighter">
                              {d.name}
                            </span>
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
                                  setSelectedDriverForEarning(d);
                                  setShowEarningModal(true);
                                }}
                                className="text-[8px] font-black bg-slate-100 text-slate-600 px-3 py-2 rounded-lg uppercase tracking-widest hover:bg-slate-200 transition-all font-mono"
                              >
                                Credit
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedDriverForDocs(d);
                                  setShowDocModal(true);
                                }}
                                className="text-[8px] font-black bg-slate-100 text-slate-600 px-3 py-2 rounded-lg uppercase tracking-widest hover:bg-slate-200 transition-all font-mono"
                              >
                                Docs
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
                    {filteredDrivers.map((d, i) => (
                      <div
                        key={i}
                        className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-black text-slate-900 italic tracking-tighter leading-none">
                              {d.name}
                            </h4>
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
                        <div className="grid grid-cols-3 gap-2 bg-white/50 p-4 rounded-2xl border border-slate-50">
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
                withdrawRequests.map((req, i) => {
                  const driver = drivers.find((d) => d.uid === req.driverId);
                  return (
                    <div
                      key={i}
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
            onClick={() => setShowCampaignModal(false)}
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
              <input
                name="assetUrl"
                required
                placeholder="Asset URL"
                className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-bold"
              />
              <input
                name="budget"
                type="number"
                required
                placeholder="Budget"
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Days to Run
                  </label>
                  <input
                    type="number"
                    value={approvalForm.durationDays}
                    onChange={(e) =>
                      setApprovalForm({
                        ...approvalForm,
                        durationDays: parseInt(e.target.value),
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
                    value={approvalForm.hoursPerDay}
                    onChange={(e) =>
                      setApprovalForm({
                        ...approvalForm,
                        hoursPerDay: parseInt(e.target.value),
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
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Select Active Units ({selectedDriverIds.length} chosen)
                  </label>
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      placeholder="Filter autos..."
                      className="bg-slate-50 border border-slate-100 rounded-xl py-2 pl-9 pr-4 text-[10px] font-bold w-48"
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {drivers
                    .filter(
                      (d) =>
                        d.name
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase()) ||
                        d.vNo
                          ?.toLowerCase()
                          .includes(searchTerm.toLowerCase()) ||
                        d.city
                          ?.toLowerCase()
                          .includes(searchTerm.toLowerCase()),
                    )
                    .map((d, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          if (selectedDriverIds.includes(d.uid)) {
                            setSelectedDriverIds(
                              selectedDriverIds.filter((id) => id !== d.uid),
                            );
                          } else {
                            setSelectedDriverIds([...selectedDriverIds, d.uid]);
                          }
                        }}
                        className={cn(
                          "p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group",
                          selectedDriverIds.includes(d.uid)
                            ? "bg-amber-50 border-amber-500"
                            : "bg-white border-slate-100 hover:bg-slate-50",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full",
                              d.status === "active"
                                ? "bg-green-500"
                                : "bg-slate-300",
                            )}
                          />
                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-900">
                              {d.name}
                            </p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                              {d.vNo || "Unit ID: " + d.uid.slice(0, 4)} •{" "}
                              {d.city || "Anywhere"}
                            </p>
                          </div>
                        </div>
                        <div
                          className={cn(
                            "w-4 h-4 rounded border flex items-center justify-center transition-all",
                            selectedDriverIds.includes(d.uid)
                              ? "bg-amber-500 border-amber-500"
                              : "border-slate-200 group-hover:border-slate-400",
                          )}
                        >
                          {selectedDriverIds.includes(d.uid) && (
                            <Check size={10} className="text-slate-950" />
                          )}
                        </div>
                      </div>
                    ))}
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
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-3xl">
            <motion.div
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

      <AnimatePresence>
        {showDocModal && selectedDriverForDocs && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDocModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-slate-950">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase italic leading-none">Document Review</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Verification Pipeline: {selectedDriverForDocs.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDocModal(false)}
                  className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {[
                    { label: 'Profile Photo / Selfie', key: 'profileImage' },
                    { label: 'Aadhaar Card', key: 'aadharPhoto' },
                    { label: 'Vehicle RC', key: 'rcPhoto' },
                    { label: 'Driving License', key: 'dlPhoto' },
                    { label: 'PAN Card', key: 'panPhoto' },
                    { label: 'Vehicle Insurance', key: 'insurancePhoto' }
                  ].map((docItem) => (
                    <div key={docItem.key} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">{docItem.label}</span>
                        {!selectedDriverForDocs[docItem.key as keyof Driver] && (
                          <span className="text-[8px] font-black text-red-500 uppercase tracking-widest bg-red-50 px-2 py-1 rounded-lg">Missing Document</span>
                        )}
                      </div>
                      <div className="aspect-[4/3] bg-slate-200 rounded-[2rem] overflow-hidden border border-slate-100 relative group shadow-sm bg-white cursor-zoom-in">
                        {selectedDriverForDocs[docItem.key as keyof Driver] ? (
                          <img 
                            src={selectedDriverForDocs[docItem.key as keyof Driver] as string} 
                            alt={docItem.label}
                            className="w-full h-full object-contain filter group-hover:brightness-90 transition-all"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center grayscale opacity-20">
                            <Truck size={48} className="mb-2" />
                            <p className="text-[9px] font-black uppercase tracking-widest">Awaiting Upload</p>
                          </div>
                        )}
                        {selectedDriverForDocs[docItem.key as keyof Driver] && (
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <a 
                              href={selectedDriverForDocs[docItem.key as keyof Driver] as string} 
                              target="_blank" 
                              rel="noreferrer"
                              className="px-6 py-3 bg-white text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl"
                            >
                              Open Original
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-8 border-t border-slate-100 bg-white grid grid-cols-2 gap-4 shrink-0">
                <button
                  onClick={() => setShowDocModal(false)}
                  className="py-5 border border-slate-200 text-slate-400 rounded-3xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-slate-50 transition-all italic"
                >
                  Close Pipeline
                </button>
                <button
                  onClick={async () => {
                    await firebaseService.adminApproveDriverAndProvisionTerminal(selectedDriverForDocs.id, selectedDriverForDocs.name);
                    showToast(`${selectedDriverForDocs.name} Verified & Terminal Provisioned Successfully`, 'success');
                    setShowDocModal(false);
                  }}
                  className="py-5 bg-slate-950 text-amber-500 rounded-3xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all italic"
                >
                  Verify & Activate Node
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {opFeedback && (
          <motion.div
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
    </div>
    </ErrorBoundary>
  );
}
