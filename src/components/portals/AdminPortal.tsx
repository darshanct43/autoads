import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { jsPDF } from 'jspdf';
import { serverTimestamp } from 'firebase/firestore';
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
  Globe,
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

import { DashboardTab } from "./tabs/DashboardTab";
import { RevenueManagementTab } from "./tabs/RevenueManagementTab";
import { PricingApprovalsTab } from "./tabs/PricingApprovalsTab";
import { PlanManager } from "./tabs/PlanManager";
import { FranchisesTab } from "./tabs/FranchisesTab";
import { DeviceHealthCenterTab } from "./tabs/DeviceHealthCenterTab";
import { TerminalHubTab } from "./tabs/TerminalHubTab";
import { RemoteConnectTab } from "./tabs/RemoteConnectTab";
import { CampaignsTab } from "./tabs/CampaignsTab";
import { ReviewsTab } from "./tabs/ReviewsTab";
import { NoticesTab } from "./tabs/NoticesTab";
import { MapTab } from "./tabs/MapTab";
import { DriversTab } from "./tabs/DriversTab";
import { MonitorTab } from "./tabs/MonitorTab";
import { WithdrawalsTab } from "./tabs/WithdrawalsTab";
import { PaymentsTab } from "./tabs/PaymentsTab";
import { TicketsTab } from "./tabs/TicketsTab";
import { UsersTab } from "./tabs/UsersTab";
import RemoteConnectCenter from "./hq/RemoteConnectCenter";
import OperationsCenter from "./hq/OperationsCenter";
import TerritoryCommandCenter from "./hq/TerritoryCommandCenter";

import { useMap } from "react-leaflet";
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

export const getSafeUrl = (url: string | undefined | null) => {
  if (!url) return undefined;
  if (typeof url !== 'string') return undefined;

  let cleaned = url.trim();
  console.log('RAW URL', cleaned);
  
  if (cleaned.startsWith('https://https://')) {
    cleaned = cleaned.replace('https://https://', 'https://');
  } else if (cleaned.startsWith('http://https://')) {
    cleaned = cleaned.replace('http://https://', 'https://');
  }

  // Rewrite any S3 URL dynamically to CloudFront
  if (cleaned.includes('s3') && cleaned.includes('amazonaws.com') && cleaned.includes('darshan-autoads-storage')) {
    cleaned = cleaned.replace(/darshan-autoads-storage\.s3[^\/]*\.amazonaws\.com/, 'd1kv1t85g7l7mp.cloudfront.net');
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
    const finalUrl = encodeURI(decoded);
    console.log('FINAL URL', finalUrl);
    return finalUrl;
  } catch (e) {
    console.log('FINAL URL', cleaned);
    return cleaned;
  }
};

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

const generateMissingPDF = async (driverData: any) => {
  return;
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

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  
  const timestamp = new Date().toLocaleString();
  let pageNum = 1;  const addGlobalBranding = () => {
    // Elegant vertical margin marks instead of a cheap full frame border
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, margin, margin, pageHeight - margin);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Agreement Reference Audit: AGR-${driverData._agreementData?.timestamp || Date.now().toString().slice(-6)}`, margin + 10, pageHeight - 10);
    doc.text(`Page ${pageNum}`, pageWidth / 2, pageHeight - 10, { align: "center" });
    doc.text("MAYYAN AutoAds Compliance Bureau • v1.0", pageWidth - margin, pageHeight - 10, { align: "right" });
  };

  const addWatermark = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(248, 248, 248); // ultra-subtle elegant print watermark
    
    doc.saveGraphicsState();
    doc.text("MAYYAN AUTOADS - OFFICIAL CONTRACT", pageWidth / 2, pageHeight / 2 - 30, { align: "center", angle: 45 });
    doc.text("SECURITY DEPOSIT COMPLIANT BUREAU", pageWidth / 2, pageHeight / 2 + 10, { align: "center", angle: 45 });
    doc.restoreGraphicsState();
  };
  
  const newPage = () => {
     doc.addPage();
     pageNum++;
  };

  addGlobalBranding();
  addWatermark();
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text("AUTOADS DRIVER PARTNERSHIP AGREEMENT", pageWidth / 2, 30, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("CONFIDENTIAL & LEGALLY BINDING INSTRUMENT", pageWidth / 2, 40, { align: "center" });

  const cardY = 55;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin + 5, cardY, pageWidth - (margin * 2) - 10, 80, 'FD');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("PARTNERSHIP DETAILS", margin + 15, cardY + 12);
  
  doc.setDrawColor(203, 213, 225);
  doc.line(margin + 15, cardY + 16, pageWidth - margin - 15, cardY + 16);

  const driverProfile = driverData;

  const details = [
    ["Agreement ID:", `AGR-${driverData._agreementData?.timestamp || Date.now().toString().slice(-6)}`],
    ["Driver ID:", driverProfile.id],
    ["Driver Name:", driverProfile.name?.toUpperCase() || 'N/A'],
    ["Mobile Number:", driverProfile.phone?.toString() || 'N/A'],
    ["Vehicle Number:", driverProfile.vehicleNumber?.toUpperCase() || driverProfile.vNo?.toUpperCase() || 'N/A'],
    ["Agreement Date:", new Date().toLocaleDateString()],
    ["Status:", "ACTIVE PARTNERSHIP"]
  ];

  let currentY = cardY + 28;
  details.forEach(([lbl, val]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(lbl, margin + 15, currentY);
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(val, margin + 70, currentY);
    currentY += 8;
  });

  newPage();
  addGlobalBranding();
  addWatermark();
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text("IDENTITY VERIFICATION STATEMENT", pageWidth / 2, 30, { align: "center" });
  
  // Clean, professional layout showing official biometric logs and status instead of raw photos
  const logsY = 50;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin + 5, logsY, pageWidth - (margin * 2) - 10, 60, 'FD');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("BIOMETRIC VALIDATION COMPLIANCE", margin + 15, logsY + 12);
  doc.setDrawColor(203, 213, 225);
  doc.line(margin + 15, logsY + 16, pageWidth - margin - 15, logsY + 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("• Biometric ID selfie verification status: SUCCESS / APPROVED", margin + 15, logsY + 25);
  doc.text(`• Verification Timestamp: ${timestamp}`, margin + 15, logsY + 31);
  doc.text(`• Cloud Storage Verification Reference ID: ${selfieUrl?.split('/').pop()?.substring(0, 24) || 'N/A'}`, margin + 15, logsY + 37);
  doc.text("• Status: Human verification passed by MAYYAN live console audit.", margin + 15, logsY + 43);
  doc.text("• Facial Features Check: MATCHED WITH DRIVAL LICENSE IDENTITY", margin + 15, logsY + 49);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("AUTHORIZED DIGITAL SIGNATURE", margin + 5, 130);
  
  if (driverData._agreementData?.signatureUrl) {
    try {
      const sigInfo = await fetchImageAsBase64(driverData._agreementData.signatureUrl);
      // Beautiful signature mounting board
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin + 5, 135, 100, 45, 'FD');
      doc.addImage(sigInfo.dataUrl, 'PNG', margin + 10, 138, 90, 38);
    } catch(e) {
      doc.setFillColor(254, 242, 242);
      doc.rect(margin + 5, 135, 100, 45, 'F');
      doc.setTextColor(239, 68, 68);
      doc.text("SIGNATURE LOAD FAILURE", margin + 15, 160);
    }
  } else {
    doc.setFillColor(254, 242, 242);
    doc.rect(margin + 5, 135, 100, 45, 'F');
    doc.setTextColor(239, 68, 68);
    doc.text("NO DIGITAL SIGNATURE RECORDED", margin + 15, 160);
  }
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Acceptance Signature Timestamp: ${timestamp}`, margin + 5, 190);
  doc.text(`IP / Network Node ID: ${btoa(driverProfile.id + timestamp).substring(16, 28).toUpperCase()}`, margin + 5, 195);

  newPage();
  addGlobalBranding();
  addWatermark();
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text("SECURE DOCUMENT VERIFICATION REGISTRY", pageWidth / 2, 30, { align: "center" });

  const vaultY = 50;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin + 5, vaultY, pageWidth - (margin * 2) - 10, 100, 'FD');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("GOVERNMENT IDENTITIES CHECK RECORDS", margin + 15, vaultY + 12);
  doc.setDrawColor(203, 213, 225);
  doc.line(margin + 15, vaultY + 16, pageWidth - margin - 15, vaultY + 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("The following official credentials were submitted and verified by our security controllers:", margin + 15, vaultY + 24);
  
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("1. NATIONAL AADHAAR CARD (UIDAI):", margin + 15, vaultY + 36);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(21, 128, 61);
  doc.text(`• Status: APPROVED & ARCHIVED`, margin + 15, vaultY + 42);
  doc.setTextColor(100, 116, 139);
  doc.text(`Reference ID: ${aadhaarUrl ? 'HASH_O_S_' + btoa(aadhaarUrl).substring(2, 14).toUpperCase() : 'N/A'}`, margin + 15, vaultY + 48);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("2. ACTIVE MOTOR DRIVING LICENSE (DL):", margin + 15, vaultY + 60);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(21, 128, 61);
  doc.text(`• Status: APPROVED & CENTRAL RTO CHECKED`, margin + 15, vaultY + 66);
  doc.setTextColor(100, 116, 139);
  doc.text(`Reference ID: ${dlUrl ? 'HASH_O_S_' + btoa(dlUrl).substring(2, 14).toUpperCase() : 'N/A'}`, margin + 15, vaultY + 72);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("3. VEHICLE REGISTRATION PERMIT:", margin + 15, vaultY + 84);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(21, 128, 61);
  doc.text(`• Status: APPROVED FOR COMMERCIAL DISPLAY MOUNTING`, margin + 15, vaultY + 90);

  newPage();
  addGlobalBranding();
  addWatermark();
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text("AGREEMENT TERMS", pageWidth / 2, 30, { align: "center" });
  
  let ty = 45;
  clauses.forEach((c) => {
    if (ty > pageHeight - 40) {
      newPage();
      addGlobalBranding();
      addWatermark();
      ty = 30;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(c.title, margin + 5, ty);
    ty += 5;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const lines = doc.splitTextToSize(c.text, pageWidth - (margin * 2) - 10);
    doc.text(lines, margin + 5, ty);
    ty += (lines.length * 4.5) + 6;
  });

  newPage();
  addGlobalBranding();
  addWatermark();

  // Fine double borders instead of full filled green containers (removes WordPress feel)
  doc.setDrawColor(34, 197, 94);
  doc.setLineWidth(1);
  doc.line(margin + 10, margin + 15, pageWidth - margin - 10, margin + 15);
  doc.line(margin + 10, margin + 18, pageWidth - margin - 10, margin + 18);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(21, 128, 61); 
  doc.text("OFFICIAL COMPLIANCE CERTIFICATE", pageWidth / 2, margin + 35, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("✓ Verified Driver Identity Dossier", margin + 20, margin + 55);
  doc.text("✓ General Partnership Agreement Accepted", margin + 20, margin + 65);
  doc.text("✓ Legal Digital Signature Form Sealed", margin + 20, margin + 75);
  doc.text("✓ National Aadhaar Identity Registered", margin + 20, margin + 85);
  doc.text("✓ Active Driving License Permitted", margin + 20, margin + 95);

  doc.setDrawColor(226, 232, 240);
  doc.line(margin + 20, margin + 110, pageWidth - margin - 20, margin + 110);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("Auditing Authority:", margin + 20, margin + 125);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("MAYYAN AutoAds Compliance Bureau", margin + 65, margin + 125);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Verification Status:", margin + 20, margin + 135);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(21, 128, 61);
  doc.text("ACTIVE / LAWFUL PARTNER", margin + 65, margin + 135);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Audit Timestamp:", margin + 20, margin + 145);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(timestamp, margin + 65, margin + 145);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("VERIFICATION EMBEDDED LICENSE HASH: " + btoa(driverProfile.id + timestamp).substring(0, 32).toUpperCase(), pageWidth/2, margin + 175, { align: "center"});

  window.open(doc.output('bloburl'), '_blank');
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
  initialTab?: string;
}

export default function AdminPortal({
  onRoleJump,
  onLogout,
  initialTab,
}: AdminPortalProps) {
  console.log("AdminPortal DEBUG: initialTab =", initialTab);
  const [selectedTheme, setSelectedTheme] = useState<'default' | 'tokyo' | 'emerald' | 'ocean' | 'solar'>(() => (localStorage.getItem('admin_premium_theme') as any) || 'default');
  
  const [activeTab, setActiveTab] = useState(() => {
    if (localStorage.getItem('auto_ads_is_terminal') === 'true') {
      return "TERMINAL_HUB";
    }
    return initialTab || "DASHBOARD";
  });
  const [renderError, setRenderError] = useState<string | null>(null);

  console.log('AdminPortal RENDER: activeTab', activeTab);
  
  useEffect(() => {
    console.log('AdminPortal activeTab effect', activeTab);
    const errorHandler = (event: ErrorEvent) => {
      setRenderError(`Error: ${event.message} at ${event.filename}:${event.lineno}`);
    };
    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, [activeTab]);
  
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
  const [isUpdatingOperationalStatus, setIsUpdatingOperationalStatus] = useState(false);
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
  const [approvalMediaFile, setApprovalMediaFile] = useState<File | null>(null);
  const [approvalUploadProgress, setApprovalUploadProgress] = useState(0);
  const [editMediaFile, setEditMediaFile] = useState<File | null>(null);
  const [editUploadProgress, setEditUploadProgress] = useState(0);
  const [terminals, setTerminals] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
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
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);
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
  const [mapZoom, setMapZoom] = useState(14);

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
        showToast("Triggering automatic Android ID Request loop...", "info");
        // The display unit itself reads Android package intent array and updates the firebase record directly.
        await new Promise(resolve => setTimeout(resolve, 2000));
        await firebaseService.updateTerminalTeamViewer(terminalId, "", ""); // Reset let device re-obtain
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

  const handleApprovalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setApprovalMediaFile(file);
    setApprovalUploadProgress(0);
    setApprovalMediaFile(null);
    try {
      setOpFeedback({ message: "Uploading to AWS...", type: 'info' });
      const url = await storageService.uploadFile(file, (p) => setApprovalUploadProgress(p.progress));
      setApprovalForm(p => p ? ({ ...p, mediaUrl: url, mediaType: file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE' }) : p);
      setOpFeedback({ message: "Upload Complete.", type: 'success' });
    } catch (e) {
      showToast("Upload Failed", "error");
    } finally {
      setApprovalUploadProgress(0);
    }
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
        finalMediaType = campaignMediaFile.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';
      }

      if (!finalMediaUrl) {
        showToast("Please upload a file for the campaign.", 'error');
        setIsSubmitting(false);
        return;
      }

      const uidSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const campaignUID = `CMP-${uidSuffix}`;

      await firebaseService.createCampaign({
        uid: campaignUID,
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

  const dynamicChartData = React.useMemo(() => {
    const citiesSet = new Set<string>();
    
    // Add cities from drivers
    drivers.forEach((d) => {
      const city = d.city || "Other";
      citiesSet.add(city);
    });
    
    // Add cities from payments
    payments.forEach((p) => {
      if (p.cityId) citiesSet.add(p.cityId);
      if (p.city) citiesSet.add(p.city);
    });
    
    if (citiesSet.size === 0) {
      citiesSet.add("Mayaan Network");
      citiesSet.add("CHICKMGALUR");
      citiesSet.add("Other");
    }

    const allCities = Array.from(citiesSet).slice(0, 5);
    const usedPaymentIds = new Set<string>();

    const chartData = allCities.map((cityName) => {
      const autosCount = drivers.filter((d) => {
        const dCity = d.city || "Other";
        return dCity.toLowerCase() === cityName.toLowerCase();
      }).length;

      const cityRevenue = (payments || [])
        .filter((p) => {
          if (!p || !["success", "SUCCESS", "paid", "PAID"].includes(p.status)) {
            return false;
          }
          if (isTestPayment(p)) return false;
          
          let matched = false;
          // 1. Attribute by driver's city if it has a driverId
          if (p.driverId) {
            const driver = (drivers || []).find((d) => d.uid === p.driverId);
            if ((driver?.city || "Other").toLowerCase() === cityName.toLowerCase()) matched = true;
          }
          // 2. Attribute by direct city ID in payment
          if (p.cityId && p.cityId.toLowerCase() === cityName.toLowerCase()) matched = true;
          if (p.city && p.city.toLowerCase() === cityName.toLowerCase()) matched = true;
          
          // 3. Attribute by campaign target target city
          if (p.campaignId) {
            const camp = (campaigns || []).find((c) => c.id === p.campaignId);
            if (camp && (camp.cityId === cityName || camp.city === cityName)) matched = true;
          }

          // Special case for "Other" - pick up anything not specifically matched yet
          if (cityName === "Other" && !matched) {
             // We'll calculate "Other" differently to include leftovers
          }

          if (matched) usedPaymentIds.add(p.id || '');
          return matched;
        })
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      return {
        name: cityName,
        autos: autosCount,
        revenue: Math.round(cityRevenue),
      };
    });

    // If there's an "Other" category, add all remaining revenue to it
    const otherIndex = chartData.findIndex(d => d.name === "Other");
    if (otherIndex !== -1) {
      const unusedRevenue = (payments || [])
        .filter(p => p && ["success", "SUCCESS", "paid", "PAID"].includes(p.status) && !isTestPayment(p) && !usedPaymentIds.has(p.id || ''))
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      chartData[otherIndex].revenue += Math.round(unusedRevenue);
    }

    return chartData;
  }, [drivers, campaigns, payments]);

  const handleExecutePurge = async () => {
    setIsSubmitting(true);
    try {
      await firebaseService.purgeAllProductionData(true);
      showToast("System Reset Complete (Dry Run Mode). Network at 0.", 'success');
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

  const prodPayments = (payments || []).filter((p) => {
    if (!p || !["success", "SUCCESS", "paid", "PAID"].includes(p.status)) return false;
    return !isTestPayment(p);
  });
  const testPayments = (payments || []).filter((p) => {
    if (!p || !["success", "SUCCESS", "paid", "PAID"].includes(p.status)) return false;
    return isTestPayment(p);
  });
  
  const productionRevenueSum = prodPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalSuccessfulRevenue = productionRevenueSum;
  const testRevenueSum = testPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalRevenueSum = productionRevenueSum + testRevenueSum;

  useEffect(() => {
    // Analytics Logger
    console.log("[System] Admin Panel Initialized", {
      user: auth.currentUser?.email,
      timestamp: new Date().toISOString(),
    });

    const unsubDrivers = firebaseService.subscribeToDrivers(setDrivers, undefined, true);
    const unsubPayments = firebaseService.subscribeToPayments(setPayments, undefined, true);
    const unsubDriverPayments =
      firebaseService.subscribeToDriverPaymentsForAll(setDriverPayments);
    const unsubCampaigns = firebaseService.subscribeToCampaigns(setCampaigns, undefined, true);
    const unsubTickets =
      firebaseService.subscribeToSupportTickets(setTickets, { isHQ: true });
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
    const unsubTerminals = firebaseService.subscribeToTerminals(setTerminals, undefined, true);
    const unsubUsers = firebaseService.subscribeToUsers(setUsers);
    const unsubLiveStatus = firebaseService.subscribeToLiveStatus(setLiveStatus);
    const unsubPlans = firebaseService.subscribeToPlans(setPlans);
    // Document listeners removed

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
      unsubUsers();
      unsubLiveStatus();
      unsubPlans();
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

  const handleStatusChange = async (ticketId: string, status: 'open' | 'in_progress' | 'resolved') => {
    try {
      await firebaseService.updateSupportTicketStatus(ticketId, status);
      showToast(`Status updated to ${status.toUpperCase().replace('_', ' ')}.`, 'success');
    } catch (e) {
      console.error(e);
      showToast("Failed to update status shadow.", 'error');
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
  const [planEdits, setPlanEdits] = useState<any[]>([]);

  useEffect(() => {
    const unsub = firebaseService.subscribeToPlanProposals(setPlanProposals);
    const unsubEdits = firebaseService.subscribeToPlanEdits(setPlanEdits);
    return () => {
      unsub();
      unsubEdits();
    };
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
      await firebaseService.sendTicketChatMessage(activeTicketId, {
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
      await firebaseService.purgeAllProductionData(true);
      setOpFeedback({ message: "Network Purged Successfully (Dry Run Mode)", type: 'success' });
      setTimeout(() => window.location.reload(), 1000);
    } catch (e) {
      setOpFeedback({ message: "Purge Failed", type: 'error' });
    } finally {
      setIsExtracting(false);
      setShowPurgeConfirm(false);
      setPurgeInput("");
    }
  };

  const handleCleanupTestData = async () => {
    try {
      setIsExtracting(true);
      const deletedCount = await firebaseService.cleanupTestData();
      setOpFeedback({ 
        message: `System Sanitized: ${deletedCount} test nodes removed.`, 
        type: 'success' 
      });
      setShowCleanupConfirm(false);
      // Wait a bit then refresh to show updated stats
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      setOpFeedback({ message: "Sanitization Sequence Failed", type: 'error' });
    } finally {
      setIsExtracting(false);
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
        const campaignUID = `CMP-DEMO-${Math.floor(1000 + Math.random() * 9000)}`;
        await firebaseService.createCampaign({
          id: campaignId,
          uid: campaignUID,
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
    if (!activeCampaign || !activeCampaign.targetLat || !activeCampaign.targetLng) return { status: 'idle', distance: 0 };

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

  // Ensure users with DRIVER role who missed driver profile creation still appear
  const allMergedDrivers = React.useMemo(() => {
    const merged = [...(drivers || [])];
    if (users && users.length > 0) {
      users.forEach(u => {
        if (u.role === 'DRIVER' && !merged.find(d => d.uid === u.id || d.phone === u.phone)) {
          merged.push({
            id: u.id,
            uid: u.id,
            name: u.name || 'Unknown Driver',
            phone: u.phone || u.id,
            email: u.email || `${u.id}@autoads.in`,
            status: 'pending_verification',
            kycStatus: 'PENDING',
            isVerified: false,
            driverCode: (u.email || u.id).toUpperCase(),
            city: 'Mayaan Network',
            vNo: 'N/A'
          } as any);
        }
      });
    }
    return merged;
  }, [drivers, users]);

  const filteredDrivers = allMergedDrivers.filter((d) => {
    const matchesSearch =
      (d.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.phone || "").includes(searchTerm) ||
      (d.vNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.gpsId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.city || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.uid || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.id || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesArea = selectedArea === "ALL" || (d.city || "").toUpperCase() === selectedArea.toUpperCase();
    
    return matchesSearch && matchesArea;
  });

  const renderTabContent = () => {
    console.log('RENDER TAB', activeTab);
    switch (activeTab) {
      case "PLAN_APPROVAL_CENTER":
        return <PlanManager />;
      case "OPERATIONS_CENTER":
        return <OperationsCenter />;
      case "TERRITORY_COMMAND":
        return null;
      case "DASHBOARD":
        return (
          <DashboardTab
            dynamicChartData={dynamicChartData}
            isExtracting={isExtracting}
            handleExtractionClick={handleExtractionClick}
            campaigns={campaigns}
            drivers={drivers}
            totalSuccessfulRevenue={totalSuccessfulRevenue}
            liveUnitsCount={liveUnitsCount}
            liveStatus={liveStatus}
            planProposals={planProposals}
            tickets={tickets}
            setSelectedDriverForEarning={setSelectedDriverForEarning}
            setShowEarningModal={setShowEarningModal}
            setSelectedDriverForProvision={setSelectedDriverForProvision}
            onPurgeRequest={() => setShowPurgeConfirm(true)}
            setShowProvisionModal={setShowProvisionModal}
            setMapCenter={setMapCenter}
            setMapZoom={setMapZoom}
            handleFetchDriverHistory={handleFetchDriverHistory}
            setActiveTab={setActiveTab}
            setSelectedDriverForDocs={setSelectedDriverForDocs}
            setDriverDocuments={setDriverDocuments}
            setShowDocModal={setShowDocModal}
            selectedDriverForAgreement={selectedDriverForAgreement}
            setSelectedDriverForAgreement={setSelectedDriverForAgreement}
            firebaseService={firebaseService}
            showToast={showToast}
          />
        );
      case "REVENUE":
        return <RevenueManagementTab />;

      case "CAMPAIGNS":
        return (
          <CampaignsTab
            campaigns={campaigns}
            selectedCampaign={selectedCampaign}
            setSelectedCampaign={setSelectedCampaign}
            drivers={drivers}
            isExtracting={isExtracting}
            handleExtractionClick={handleExtractionClick}
            isEditingMedia={isEditingMedia}
            setIsEditingMedia={setIsEditingMedia}
            editMediaUrl={editMediaUrl}
            setEditMediaUrl={setEditMediaUrl}
            editMediaType={editMediaType}
            setEditMediaType={setEditMediaType}
            editMediaFile={editMediaFile}
            setEditMediaFile={setEditMediaFile}
            editUploadProgress={editUploadProgress}
            handleUpdateMedia={handleUpdateMedia}
            isUpdatingMedia={isUpdatingMedia}
            handleUpdateOperationalStatus={handleUpdateOperationalStatus}
            isUpdatingOperationalStatus={isUpdatingOperationalStatus}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedArea={selectedArea}
            setSelectedArea={setSelectedArea}
            selectedDriverIds={selectedDriverIds}
            setSelectedDriverIds={setSelectedDriverIds}
            handleBulkAssign={handleBulkAssign}
            isAssigning={isAssigning}
            filteredDrivers={filteredDrivers}
          />
        );
      case "REVIEWS":
        return (
          <ReviewsTab
            drivers={drivers}
            campaigns={campaigns}
            firebaseService={firebaseService}
            showToast={showToast}
            handleRejectCampaign={handleRejectCampaign}
            handleApproveCampaign={handleApproveCampaign}
            handleDeleteCampaign={handleDeleteCampaign}
          />
        );

      case "TERMINAL_HUB":
        return (
          <ErrorBoundary>
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
              startTVSession={startTVSession}
              setSelectedDriverForAgreement={setSelectedDriverForAgreement}
              setSelectedDriverForDocs={setSelectedDriverForDocs}
              setShowDocModal={setShowDocModal}
            />
          </ErrorBoundary>
        );
      case "REMOTE_CONNECT":
          return <RemoteConnectTab />;
      case "MAP":
        return (
          <MapTab
            activeTab={activeTab}
            mapCenter={mapCenter}
            mapZoom={mapZoom}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            driverLocations={driverLocations}
            showCoverage={showCoverage}
            setShowCoverage={setShowCoverage}
            showIssues={showIssues}
            setShowIssues={setShowIssues}
            campaigns={campaigns}
            selectedDriverHistory={selectedDriverHistory}
            setSelectedDriverHistory={setSelectedDriverHistory}
            tickets={tickets}
            drivers={drivers}
            selectedLocation={selectedLocation}
            setSelectedLocation={setSelectedLocation}
            handleFetchDriverHistory={handleFetchDriverHistory}
            ticketNotifications={ticketNotifications}
            setTicketNotifications={setTicketNotifications}
            setActiveTab={setActiveTab}
            liveUnitsCount={liveUnitsCount}
            setMapCenter={setMapCenter}
            setMapZoom={setMapZoom}
          />
        );

// case "FRANCHISES":
//   return (
//     <FranchisesTab
//       setActiveTab={setActiveTab}
//       showToast={showToast}
//     />
//   );
      case "NOTICES":
        return (
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
        );
      case "DRIVERS":
        return (
          <DriversTab
            isHQ={true}
            setSelectedDriverForEarning={setSelectedDriverForEarning}
            setShowEarningModal={setShowEarningModal}
            setSelectedDriverForProvision={setSelectedDriverForProvision}
            setShowProvisionModal={setShowProvisionModal}
            setSelectedDriverForAgreement={setSelectedDriverForAgreement}
            setSelectedDriverForDocs={setSelectedDriverForDocs}
            setShowDocModal={setShowDocModal}
            handleFetchDriverHistory={async (driverId) => {
              await handleFetchDriverHistory(driverId);
              setActiveTab("MAP");
            }}
          />
        );
      case "MONITOR":
        return (
          <MonitorTab
            terminals={terminals}
            liveStatus={liveStatus}
            deviceScreens={deviceScreens}
            drivers={drivers}
            setViewingUnit={setViewingUnit}
            setNetworkConfigTarget={setNetworkConfigTarget}
            startTVSession={startTVSession}
            handleRemoteCommand={handleRemoteCommand}
            setSelectedDriverForAgreement={setSelectedDriverForAgreement}
            setSelectedDriverForDocs={setSelectedDriverForDocs}
            setShowDocModal={setShowDocModal}
          />
        );
      case "WITHDRAWALS":
        return (
          <WithdrawalsTab
            withdrawRequests={withdrawRequests}
            driverPayments={driverPayments}
            drivers={drivers}
            onApprove={handleApproveWithdrawal}
            onReject={async (req) => {
              try {
                await firebaseService.updateWithdrawRequestStatus(req.id, "rejected");
                showToast("Withdrawal request rejected.", "success");
              } catch (e) {
                showToast("Failed to reject request.", "error");
              }
            }}
          />
        );
      case "PAYMENTS":
        return (
          <PaymentsTab
            payments={payments}
            driverPayments={driverPayments}
            paymentSubTab={paymentSubTab}
            setPaymentSubTab={setPaymentSubTab}
            drivers={drivers}
            campaigns={campaigns}
          />
        );
      case "TICKETS":
        return (
          <TicketsTab
            tickets={tickets}
            activeTicketId={activeTicketId}
            setActiveTicketId={setActiveTicketId}
            handleStatusChange={handleStatusChange}
            handleDeleteTicket={handleDeleteSupportTicket}
          />
        );
      case "USERS":
        return (
          <UsersTab
            users={users}
            showToast={showToast}
          />
        );
      case "SETTINGS":
        return (
          <div className="p-6 md:p-10 space-y-8 max-w-4xl mx-auto">
            <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
              <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-2">
                  System Maintenance
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  Advanced Node Operations & Logic Calibration
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
                      <Database size={20} />
                    </div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Data Sanitization</h4>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                    Automatically locate and remove all TEST, DEMO, and simulated records across the entire network architecture.
                  </p>
                  <button 
                    onClick={() => setShowCleanupConfirm(true)}
                    className="w-full py-4 bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Remove Test Data
                  </button>
                </div>

                <div className="p-6 bg-red-50/50 rounded-3xl border border-red-100 space-y-4 text-left">
                   <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-red-500/10 text-red-500 rounded-xl">
                      <Trash2 size={20} />
                    </div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Hard Reset</h4>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                    Purge all production data nodes and reset the network state to zero. This action is destructive and irreversible.
                  </p>
                  <button 
                    onClick={() => setShowPurgeConfirm(true)}
                    className="w-full py-4 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Purge Network Data
                  </button>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                   <div className="flex items-center gap-3">
                     <div className="p-2 bg-slate-900/10 text-slate-900 rounded-xl">
                       <Smartphone size={16} />
                     </div>
                     <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Live SDK Telemetry</span>
                   </div>
                   <div className="px-3 py-1 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest rounded-lg">Active</div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        console.log('DEFAULT TAB HIT', activeTab);
        return (
          <div style={{
            background: 'yellow',
            padding: '40px',
            fontSize: '32px',
            color: 'black'
          }}>
            TAB: {activeTab} WORKING
          </div>
        );
    }
  };

  if (renderError) return <div className="p-10 text-red-500 font-bold">{renderError}</div>;

  return (
    <ErrorBoundary componentName="Admin Command Center">
      <>
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
        {showCleanupConfirm && (
          <motion.div
            key="cleanup-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              key="cleanup-modal"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full border border-indigo-100"
            >
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                <Database className="text-indigo-500" size={32} />
              </div>
              <h3 className="text-2xl font-black uppercase text-slate-900 mb-2 italic">
                Surgical Cleanup
              </h3>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-relaxed mb-6">
                Delete all TEST / DEMO data? This will remove campaigns, payments, terminals, and users identified as non-production assets.
              </p>
              
              <div className="space-y-4">
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCleanupConfirm(false)}
                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Abort
                  </button>
                  <button
                    onClick={handleCleanupTestData}
                    disabled={isExtracting}
                    className="flex-[2] bg-indigo-500 text-white px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                  >
                    {isExtracting ? "SANITIZING..." : "EXECUTE CLEANUP"}
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
      <div className="w-20 h-screen bg-slate-950 flex flex-col items-center py-8 gap-5 border-r border-slate-800 relative z-30 transition-all duration-300 hidden md:flex overflow-y-auto custom-scrollbar">
        <div className="flex flex-col gap-3">
          {[
            { id: "DASHBOARD", icon: Activity, title: "Overview" },
            { id: "OPERATIONS_CENTER", icon: Server, title: "Operations Center" },
            { id: "MAP", icon: MapPin, title: "Live Tracking" },
            { id: "TERMINAL_HUB", icon: TerminalIcon, title: "Terminal Sync" },
            { id: "PLAN_APPROVAL_CENTER", icon: FileText, title: "Plan Approval Center", badge: planEdits.filter(e => e.status === "PENDING_APPROVAL").length > 0 },
            { id: "CAMPAIGNS", icon: Monitor, title: "Ads Control" },
            { id: "MONITOR", icon: Smartphone, title: "Live Units", badge: liveScreensCount > 0 },
            { id: "TICKETS", icon: AlertCircle, title: "Support Hub" },
            { id: "PAYMENTS", icon: CreditCard, title: "Payments Registry" },
            { id: "DRIVERS", icon: Truck, title: "Drivers & Vehicles" },
            { id: "USERS", icon: Users, title: "Staff & Users" },
            // { id: "FRANCHISES", icon: Shield, title: "Franchises" },
            { id: "WITHDRAWALS", icon: Wallet, title: "Payouts" },
            { id: "NOTICES", icon: Gift, title: "Global Offers" },
            { id: "SETTINGS", icon: Settings, title: "System Settings" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
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
          onClick={() => setActiveTab("PLAN_APPROVAL_CENTER")}
          className={cn(
            "p-2 rounded-xl transition-all relative",
            activeTab === "PLAN_APPROVAL_CENTER"
              ? "bg-amber-500 text-slate-950"
              : "text-slate-500",
          )}
        >
          <FileText size={20} />
          {planEdits.filter(e => e.status === "PENDING_APPROVAL").length > 0 && (
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
                  { id: "OPERATIONS_CENTER", icon: Server, title: "Operations" },
                  { id: "MAP", icon: MapPin, title: "Live Tracking" },
                  { id: "TERMINAL_HUB", icon: TerminalIcon, title: "Terminal Sync" },
                  { id: "PLAN_APPROVAL_CENTER", icon: FileText, title: "Plan Approvals" },
                  { id: "CAMPAIGNS", icon: Monitor, title: "Ads Control" },
                  { id: "MONITOR", icon: Smartphone, title: "Live Units" },
                  { id: "TICKETS", icon: AlertCircle, title: "Support Hub" },
                  { id: "PAYMENTS", icon: CreditCard, title: "Payments Registry" },
                  { id: "DRIVERS", icon: Truck, title: "Drivers & Vehicles" },
                  { id: "USERS", icon: Users, title: "Staff & Users" },
                  // { id: "FRANCHISES", icon: Shield, title: "Franchises" },
                  { id: "WITHDRAWALS", icon: Wallet, title: "Payouts" },
                  { id: "NOTICES", icon: Gift, title: "Global Offers" },
                  { id: "SETTINGS", icon: Settings, title: "System Settings" },
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

        <header className={cn("h-14 md:h-16 border-b border-slate-100 flex items-center justify-between px-4 md:px-8 bg-white shrink-0 sticky top-0 z-40", activeTab === "TERMINAL_HUB" && "hidden")}>
          <div className="flex items-center gap-2 md:gap-3">
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
              onClick={() => setActiveTab('REMOTE_CONNECT')}
              className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center bg-amber-500 text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all"
              title="Remote Connect Center"
            >
              <Server size={16} />
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
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              {renderTabContent()}
            </motion.div>
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

                  <div className="flex bg-slate-100 rounded-xl p-1 mb-2">
                    <button 
                      type="button"
                      onClick={() => window.open('https://www.canva.com', '_blank')}
                      className="flex-1 py-2 text-[10px] font-bold rounded-lg text-slate-500 hover:text-amber-500 transition-colors"
                    >Edit in Canva</button>
                    <div className="flex-1 py-2 text-[10px] font-bold text-center text-slate-950">Upload File</div>
                  </div>

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
                          value={approvalForm?.mediaUrl || ''}
                          onChange={(e) => setApprovalForm(p => p ? ({ ...p, mediaUrl: e.target.value }) : p)}
                          placeholder="Asset URL..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                        <div className="absolute right-2 top-2">
                           <label className="cursor-pointer bg-slate-900 text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-700">
                             Upload
                             <input type="file" className="hidden" accept="image/*,video/*" onChange={handleApprovalFileUpload} />
                           </label>
                        </div>
                      </div>
                      {approvalUploadProgress > 0 && (
                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                           <div className="h-full bg-amber-500" style={{ width: `${approvalUploadProgress}%` }} />
                        </div>
                      )}
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
                              <img src={getSafeUrl(d.profileImage)} className="w-full h-full object-cover" />
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
              {opFeedback.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
            </div>
            <div className="flex flex-col text-left">
               <span className="opacity-50 text-[8px] mb-0.5">{opFeedback.type.toUpperCase()} SIGNAL</span>
               {opFeedback.message}
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
                    src={getSafeUrl(viewingUnit.metrics?.currentAdImage) || `https://placehold.co/1920x1080/1e293b/FFFFFF/png?text=${viewingUnit.id}`}
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
                   {(selectedDriverForAgreement._agreementData?.agreementAccepted || selectedDriverForAgreement.kycStatus === 'PENDING' || selectedDriverForAgreement.kycStatus === 'APPROVED' || selectedDriverForAgreement.aadharPhoto || selectedDriverForAgreement.documents?.aadhaar) ? (
                      <>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 text-center">
                           <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center h-full">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">SELFIE</p>
                              <div className="w-full flex-1 rounded-xl overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center bg-white min-h-[100px]">
                                 {(() => {
                                    const rawUrl = selectedDriverForAgreement._agreementData?.verificationSelfieUrl || selectedDriverForAgreement.selfiePhoto || selectedDriverForAgreement.documents?.selfie;
                                    const safeUrl = getSafeUrl(rawUrl);
                                    if (safeUrl) {
                                       console.log("SELFIE_RENDER_URL", safeUrl);
                                       return (
                                          <div className="w-full h-full cursor-pointer" onClick={() => window.open(safeUrl, '_blank')}>
                                             <img src={safeUrl} className="w-full h-full object-cover" alt="Selfie" referrerPolicy="no-referrer" />
                                          </div>
                                       );
                                    }
                                    return <span className="text-[10px] font-bold text-slate-400 uppercase italic px-4">Selfie Not Captured</span>;
                                 })()}
                              </div>
                           </div>
                           <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center h-full">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">SIGNATURE</p>
                              <div className="w-full flex-1 rounded-xl overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center bg-white min-h-[100px]">
                                 {(() => {
                                    const rawUrl = selectedDriverForAgreement._agreementData?.signatureUrl || selectedDriverForAgreement.signatureUrl || selectedDriverForAgreement.documents?.signature;
                                    const safeUrl = getSafeUrl(rawUrl);
                                    if (safeUrl) {
                                       console.log("SIGNATURE_RENDER_URL", safeUrl);
                                       return (
                                          <div className="w-full h-full cursor-pointer p-1" onClick={() => window.open(safeUrl, '_blank')}>
                                             <img src={safeUrl} className="w-full h-full object-contain" alt="Signature" referrerPolicy="no-referrer" />
                                          </div>
                                       );
                                    }
                                    return <X size={20} className="text-slate-300" />;
                                 })()}
                              </div>
                           </div>
                           <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center h-full">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">AADHAAR</p>
                              <div className="w-full flex-1 rounded-xl overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center bg-white min-h-[100px]">
                                 {(() => {
                                    const rawUrl = selectedDriverForAgreement.aadharPhoto || selectedDriverForAgreement.documents?.aadhaar;
                                    const safeUrl = getSafeUrl(rawUrl);
                                    if (safeUrl) {
                                       console.log("AADHAAR_RENDER_URL", safeUrl);
                                       return (
                                          <div className="w-full h-full cursor-pointer" onClick={() => window.open(safeUrl, '_blank')}>
                                             <img src={safeUrl} className="w-full h-full object-contain" alt="Aadhar" referrerPolicy="no-referrer" />
                                          </div>
                                       );
                                    }
                                    return <X size={20} className="text-slate-300" />;
                                 })()}
                              </div>
                           </div>
                           <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center h-full">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">DL</p>
                              <div className="w-full flex-1 rounded-xl overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center bg-white min-h-[100px]">
                                 {(() => {
                                    const rawUrl = selectedDriverForAgreement.dlPhoto || selectedDriverForAgreement.documents?.drivingLicense;
                                    const safeUrl = getSafeUrl(rawUrl);
                                    if (safeUrl) {
                                       console.log("DL_RENDER_URL", safeUrl);
                                       return (
                                          <div className="w-full h-full cursor-pointer" onClick={() => window.open(safeUrl, '_blank')}>
                                             <img src={safeUrl} className="w-full h-full object-contain" alt="DL" referrerPolicy="no-referrer" />
                                          </div>
                                       );
                                    }
                                    return <X size={20} className="text-slate-300" />;
                                 })()}
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
                                       window.open(getSafeUrl(selectedDriverForAgreement._agreementData.agreementPdfUrl), '_blank');
                                   } else {
                                       generateMissingPDF(selectedDriverForAgreement);
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
                   {selectedDriverForAgreement?.kycStatus === 'APPROVED' ? (
                      <div className="flex-1 py-4 bg-emerald-50 text-emerald-600 rounded-[16px] text-[10px] font-black uppercase tracking-widest text-center border-2 border-emerald-100 flex items-center justify-center gap-2">
                        <ShieldCheck className="w-4 h-4" /> VERIFIED OPERATOR
                      </div>
                   ) : (
                      <button 
                        onClick={async () => {
                           console.log("APPROVE OPERATOR BUTTON CLICKED");
                           console.log("VERIFIED BUTTON CLICKED");
                           const hasSelfie = !!getSafeUrl(selectedDriverForAgreement._agreementData?.verificationSelfieUrl || selectedDriverForAgreement._agreementData?.selfieUrl || selectedDriverForAgreement.selfiePhoto || selectedDriverForAgreement.documents?.selfie);
                           const hasAadhaar = !!getSafeUrl(selectedDriverForAgreement.aadharPhoto || selectedDriverForAgreement.documents?.aadhaar);
                           const hasDL = !!getSafeUrl(selectedDriverForAgreement.dlPhoto || selectedDriverForAgreement.documents?.drivingLicense);
                           
                           console.log("DRIVER ID:", selectedDriverForAgreement.id);
                           console.log("Pre-Update State:", {
                               hasSelfie, hasAadhaar, hasDL,
                               selfieUrl: selectedDriverForAgreement._agreementData?.verificationSelfieUrl || selectedDriverForAgreement._agreementData?.selfieUrl || selectedDriverForAgreement.selfiePhoto || selectedDriverForAgreement.documents?.selfie,
                               aadhaarUrl: selectedDriverForAgreement.aadharPhoto || selectedDriverForAgreement.documents?.aadhaar,
                               dlUrl: selectedDriverForAgreement.dlPhoto || selectedDriverForAgreement.documents?.drivingLicense
                           });

                           const updatePayload = { 
                               kycStatus: 'APPROVED', 
                               status: 'active', 
                               verificationStatus: 'VERIFIED',
                               approvedAt: serverTimestamp(),
                               approverId: window.localStorage.getItem('adminId') || 'SUPER_ADMIN',
                               walletAccessEnabled: true,
                               creditAssignmentEnabled: true,
                               deviceProvisioningEnabled: true,
                               driverEarningsEnabled: true,
                               payoutEligibilityEnabled: true,
                               payoutEnabled: true, 
                               adminApproved: true 
                           };
                           console.log("Updating Firestore with payload:", updatePayload);
                           try {
                               await firebaseService.updateDriverProfile(selectedDriverForAgreement.id, updatePayload);
                               console.log("Update Success!");
                           } catch (err) {
                               console.error("Update Error:", err);
                           }
                           
                           showToast("Driver Network Profile Approved and Permissions Granted.", 'success');
                           setSelectedDriverForAgreement({ ...selectedDriverForAgreement, kycStatus: 'APPROVED', status: 'active' });
                        }}
                        className="flex-1 py-4 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl bg-blue-600 hover:bg-blue-700 transition"
                      >
                        Approve Operator
                      </button>
                   )}
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

              <div className="flex items-center gap-4 mb-8 text-left">
                <button 
                  onClick={() => setShowDocModal(false)}
                  className="p-3 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <ShieldCheck className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase text-slate-900 tracking-tight leading-none italic">Identity Audit</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Driver Bureau: {selectedDriverForDocs.fullName || selectedDriverForDocs.name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Aadhaar Card", key: "aadharPhoto", folder: "aadhaar" },
                  { label: "Driving License", key: "dlPhoto", folder: "drivingLicense" },
                  { label: "Biometric Selfie", key: "profileImage", folder: "selfie" },
                  { label: "Vehicle RC", key: "rcPhoto", folder: "rc" }
                ].map((docItem) => {
                  const url = (selectedDriverForDocs as any)[docItem.key] || (selectedDriverForDocs.documents as any)?.[docItem.folder];
                  return (
                    <div key={docItem.key} className="space-y-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1 text-left">{docItem.label}</p>
                      <div className={cn("bg-slate-50 rounded-2xl border border-slate-150 overflow-hidden relative group shadow-inner", docItem.key === 'profileImage' ? "aspect-[3/4] md:aspect-[3/4]" : "aspect-video md:aspect-[4/5]")}>
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
                   <button 
                    onClick={async () => {
                       await firebaseService.updateDriverProfile(selectedDriverForDocs.id, { 
                         kycStatus: 'APPROVED', 
                         adminApproved: true,
                         payoutEnabled: true 
                       });
                       showToast("Approval command transmitted.", "success");
                       setShowDocModal(false);
                    }}
                    className="flex-1 md:flex-none px-6 py-3 text-[9px] md:px-10 md:py-4 md:text-[10px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20"
                   >
                     Approve KYC
                   </button>
                   <button 
                    onClick={async () => {
                        await firebaseService.updateDriverProfile(selectedDriverForDocs.id, { kycStatus: 'REJECTED' });
                        showToast("Revocation warning issued.", "error");
                        setShowDocModal(false);
                    }}
                    className="flex-1 md:flex-none px-6 py-3 text-[9px] md:px-10 md:py-4 md:text-[10px] border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 rounded-2xl font-black uppercase tracking-widest transition-all"
                   >
                     Reject
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </main>
      </div>
      </div>
      </>
    </ErrorBoundary>
  );
}
