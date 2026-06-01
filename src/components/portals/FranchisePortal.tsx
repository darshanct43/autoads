import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Tablet, 
  TrendingUp, 
  MapPin, 
  Activity, 
  FileText, 
  LogOut, 
  Plus, 
  Check, 
  X, 
  Clock, 
  Shield, 
  DollarSign, 
  ChevronRight, 
  AlertCircle, 
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  TrendingDown,
  Lock,
  Settings,
  Zap,
  Power,
  Coins,
  Mail,
  UserCheck,
  ShieldAlert,
  Key,
  RefreshCw,
  MessageSquare,
  Send,
  Volume2,
  Paperclip
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '@/lib/firebase';
import { firebaseService } from '@/services/firebaseService';
import { storageService } from '@/services/storageService';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc,
  addDoc, 
  setDoc,
  updateDoc, 
  doc, 
  onSnapshot,
  orderBy,
  limit
} from 'firebase/firestore';
import { getCityName, getFranchiseName } from '@/modules/cityManagement/cities';
import { writeAuditLog } from '@/modules/support/supportDashboardService';

interface FranchisePortalProps {
  onLogout: () => void;
}

export default function FranchisePortal({ onLogout }: FranchisePortalProps) {
  const [activeTab, setActiveTab] = useState<'METRICS' | 'DRIVERS' | 'CAMPAIGNS' | 'TICKETS' | 'AUDIT' | 'STAFF' | 'SETTINGS' | 'LOUNGE'>('METRICS');
  
  // Scoping metrics
  const [userProfile, setUserProfile] = useState<any>(null);
  const [cityId, setCityId] = useState<string>('mysore'); // fallback
  const [franchiseId, setFranchiseId] = useState<string>('fr-mys-01'); // fallback

  const [drivers, setDrivers] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [franchiseDoc, setFranchiseDoc] = useState<any>(null);
  const [staffList, setStaffList] = useState<any[]>([]);

  // Staff Lounge Chat States
  const [loungeMessages, setLoungeMessages] = useState<any[]>([]);
  const [loungeText, setLoungeText] = useState('');
  const [loungeAnnouncement, setLoungeAnnouncement] = useState(false);
  const [loungeMediaUrl, setLoungeMediaUrl] = useState('');
  const [isLoungeUploading, setIsLoungeUploading] = useState(false);
  const [loungeProgress, setLoungeProgress] = useState(0);
  const loungeFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Real-time listener for Lounge messages
  useEffect(() => {
    if (!franchiseId || activeTab !== 'LOUNGE') return;
    const unsubLounge = firebaseService.subscribeToLoungeMessages(franchiseId, setLoungeMessages);
    return () => unsubLounge();
  }, [franchiseId, activeTab]);

  const handleSendLoungeMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!loungeText.trim() && !loungeMediaUrl) return;

    try {
      const senderName = userProfile?.name || userProfile?.email || 'Unknown Staff';
      const senderRole = userProfile?.role || 'FRANCHISE_STAFF';
      const senderSpecialization = userProfile?.specialization || 'OPERATIONS_STAFF';

      const mentions: string[] = [];
      const mentionRegex = /@(\w+)/g;
      let match;
      while ((match = mentionRegex.exec(loungeText)) !== null) {
        mentions.push(match[1]);
      }

      await firebaseService.sendLoungeMessage(franchiseId, {
        text: loungeText,
        senderId: auth.currentUser?.uid || 'anonymous',
        senderName,
        senderRole,
        senderSpecialization,
        mediaUrl: loungeMediaUrl || undefined,
        mediaType: loungeMediaUrl ? 'IMAGE' : undefined,
        mentions,
        isAnnouncement: loungeAnnouncement
      });

      // Write to activity logs
      await addDoc(collection(db, 'activityLogs'), {
        action: 'LOUNGE_MESSAGE_SENT',
        targetId: franchiseId,
        details: `${senderName} (${senderSpecialization}) sent a lounge message${loungeAnnouncement ? ' (ANNOUNCEMENT)' : ''}.`,
        performedBy: auth.currentUser?.uid,
        performedByName: senderName,
        timestamp: new Date().toISOString()
      });

      // Send a system notification
      await firebaseService.createNotification({
        title: loungeAnnouncement ? '📢 Urgent Franchise Lounge Announcement' : '💬 New Lounge Signal',
        message: `${senderName}: ${loungeText.slice(0, 100)}`,
        userId: '',
        role: 'SUPPORT',
        type: 'SYSTEM'
      });

      setLoungeText('');
      setLoungeAnnouncement(false);
      setLoungeMediaUrl('');
    } catch (err: any) {
      showToast(`Failed to send message: ${err.message}`, 'error');
    }
  };

  const handleLoungeFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast("Invalid Type: Use an image file (JPG, PNG)", "error");
      return;
    }

    setIsLoungeUploading(true);
    setLoungeProgress(0);
    try {
      showToast("Uploading media...", "success");
      const url = await storageService.uploadFile(file, (p) => {
        setLoungeProgress(p.progress || 0);
      });
      setLoungeMediaUrl(url);
      showToast("Media attached!", "success");
    } catch (err: any) {
      showToast(`Upload failed: ${err.message}`, "error");
    } finally {
      setIsLoungeUploading(false);
    }
  };

  // Modals / Input states
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [newDriver, setNewDriver] = useState({
    name: '',
    email: '',
    phone: '',
    upi: '',
    aadhaar: '',
    license: ''
  });
  
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    message: '',
    priority: 'HIGH'
  });

  // Staff and Transfer UI States
  const [staffNameInput, setStaffNameInput] = useState('');
  const [staffEmailInput, setStaffEmailInput] = useState('');
  const [staffSpecInput, setStaffSpecInput] = useState<'OPERATIONS_STAFF' | 'DRIVER_VERIFICATION_STAFF' | 'SUPPORT_STAFF' | 'FINANCE_STAFF'>('OPERATIONS_STAFF');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteModalData, setInviteModalData] = useState<{ 
    email: string; 
    role: 'FRANCHISE_STAFF' | 'FRANCHISE_OWNER'; 
    code: string; 
    claimUrl: string; 
    specialization?: string; 
  } | null>(null);

  const [transferEmail, setTransferEmail] = useState('');
  const [transferName, setTransferName] = useState('');
  
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);

  // Settlement workflow states
  const [isProcessingSettle, setIsProcessingSettle] = useState(false);
  const [settledMonthValue, setSettledMonthValue] = useState('June 2026');
  const [isSettlementProcessed, setIsSettlementProcessed] = useState(false);

  // Revenue split helper (TODO: move to shared service if needed)
  const getRevenueSplitPercentages = () => ({ franchisePercent: 70 });

  // Campaign Revenue Ledger
  const [revenueLedger, setRevenueLedger] = useState<any[]>([]);

  useEffect(() => {
    if (!franchiseId) return;
    const unsubLedger = firebaseService.subscribeToRevenueLedger((data) => {
      setRevenueLedger(data);
    }, franchiseId);
    return () => unsubLedger();
  }, [franchiseId]);


  // Handle triggered settlement workflow for the current month
  const handleTriggerSettlement = async () => {
    setIsProcessingSettle(true);
    try {
      const totalFranchiseShare = revenueLedger.reduce((acc, curr) => acc + curr.franchiseShare, 0);
      
      // Write action to activity log
      await addDoc(collection(db, 'activityLogs'), {
        action: 'CAMPAIGN_REVENUE_SETTLED',
        targetId: franchiseId,
        details: `Monthly Campaign Revenue Settlement processed for ${settledMonthValue}. Local Franchise Share of ₹${totalFranchiseShare.toLocaleString()} cleared.`,
        performedBy: auth.currentUser?.uid || 'system',
        performedByName: userProfile?.name || 'Franchise Finance Manager',
        timestamp: new Date().toISOString()
      });

      // Send a system notification
      await firebaseService.createNotification({
        title: '📊 Campaign Monthly Revenue Settled',
        message: `Settlement ledger completed for ${settledMonthValue}. Total franchise share: ₹${totalFranchiseShare.toLocaleString()}`,
        userId: '',
        role: 'SUPPORT',
        type: 'SYSTEM'
      });

      setTimeout(() => {
        setIsSettlementProcessed(true);
        setIsProcessingSettle(false);
        showToast(`Revenue settlement for ${settledMonthValue} finalized & closed!`, 'success');
      }, 1000);
    } catch (err: any) {
      setIsProcessingSettle(false);
      showToast(`Settlement failed: ${err.message}`, 'error');
    }
  };

  // Compile ledger dataset to CSV and download in browser
  const downloadPayoutReport = () => {
    const headers = ['Campaign ID', 'Title', 'Client', 'Source', 'Budget (INR)', 'Franchise Share (INR)', 'Platform Share (INR)', 'Terms', 'Date', 'Status'];
    const rows = revenueLedger.map(e => [
      e.id,
      `"${e.title.replace(/"/g, '""')}"`,
      `"${e.clientName.replace(/"/g, '""')}"`,
      e.source,
      e.budget,
      e.franchiseShare,
      e.platformShare,
      e.terms,
      e.date,
      e.status
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Campaign_Revenue_Report_${franchiseId || 'global'}_${settledMonthValue.replace(' ', '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`Payout Report for ${settledMonthValue} compiled & downloaded!`, 'success');
  };

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch current user scope
  useEffect(() => {
    const fetchUserScope = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDocSnap = await getDoc(doc(db, 'users', user.uid));
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            setUserProfile({ id: user.uid, ...data });
            if (data.cityId) setCityId(data.cityId);
            if (data.franchiseId) setFranchiseId(data.franchiseId);
          } else {
            // Check fallback for demo account / email query
            const userSnap = await getDocs(query(collection(db, 'users'), where('email', '==', user.email)));
            if (!userSnap.empty) {
              const data = userSnap.docs[0].data();
              setUserProfile({ id: userSnap.docs[0].id, ...data });
              if (data.cityId) setCityId(data.cityId);
              if (data.franchiseId) setFranchiseId(data.franchiseId);
            } else {
              setUserProfile({
                name: 'Franchise Partner',
                email: user.email,
                role: 'FRANCHISE_OWNER',
                cityId: 'mysore',
                franchiseId: 'fr-mys-01'
              });
            }
          }
        } catch (err) {
          console.warn('[FRANCHISE] Error loading profile scope:', err);
        }
      }
    };
    fetchUserScope();
  }, []);

  // Real-time listener for current franchise document
  useEffect(() => {
    if (!franchiseId) return;
    const unsubFr = onSnapshot(doc(db, 'franchises', franchiseId), (snap) => {
      if (snap.exists()) {
        setFranchiseDoc(snap.data());
      }
    }, (error) => {
      console.warn('[FRANCHISE] Franchise document snapshot error:', error);
    });
    return () => unsubFr();
  }, [franchiseId]);

  // Real-time listener for staff list
  useEffect(() => {
    if (!franchiseId || userProfile?.role !== 'FRANCHISE_OWNER') return;
    const staffQuery = query(
      collection(db, 'users'),
      where('franchiseId', '==', franchiseId),
      where('role', '==', 'FRANCHISE_STAFF')
    );
    const unsubStaff = onSnapshot(staffQuery, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setStaffList(items);
    }, (error) => {
      console.warn('[FRANCHISE] Staff fetch error:', error);
    });
    return () => unsubStaff();
  }, [franchiseId, userProfile]);

  // Real-time listener for pending withdrawals under high-payout metrics
  useEffect(() => {
    if (!cityId) return;
    const q = query(
      collection(db, 'withdrawRequests'),
      where('status', '==', 'pending')
    );
    const unsubWithdrawals = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Filter in-memory for safety check
      setPendingWithdrawals(items);
    }, (error) => {
      console.warn('[FRANCHISE] Withdrawals fetch error:', error);
    });
    return () => unsubWithdrawals();
  }, [cityId]);

  // Listen to scoped Drivers, Devices, Campaigns, Support Tickets, Activity Logs
  useEffect(() => {
    if (!cityId || !franchiseId) return;

    // Listen to drivers scoped to this city/franchis
    const drQuery = query(collection(db, 'drivers'), where('cityId', '==', cityId));
    const unsubDrivers = onSnapshot(drQuery, (snap) => {
      let items: any[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (items.length === 0 && userProfile?.email === 'franchise@autoads.in') {
        items = [
          { id: 'mock-dr-1', driverId: 'mock-dr-1', name: 'Sanjay Gowda', phone: '9876543210', email: 'sanjay@example.com', kycStatus: 'APPROVED', status: 'ACTIVE', upiId: 'sanjay@ybl', cityId },
          { id: 'mock-dr-2', driverId: 'mock-dr-2', name: 'Ramesh Babu', phone: '9876588210', email: 'ramesh@example.com', kycStatus: 'PENDING', status: 'PENDING', cityId },
          { id: 'mock-dr-3', driverId: 'mock-dr-3', name: 'Arun Kumar', phone: '9988776655', email: 'arun@example.com', kycStatus: 'APPROVED', status: 'ACTIVE', upiId: 'arun@axl', cityId },
        ];
      }
      setDrivers(items);
    }, (err) => console.warn('[FRANCHISE] Listen drivers err:', err));

    // Listen to devices
    const devQuery = query(collection(db, 'devices'), where('cityId', '==', cityId));
    const unsubDevices = onSnapshot(devQuery, (snap) => {
      let items: any[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (items.length === 0 && userProfile?.email === 'franchise@autoads.in') {
        items = [
          { id: 'DEV-MYS-001', driverId: 'mock-dr-1', status: 'ONLINE', cityId, earnings: 450 },
          { id: 'DEV-MYS-002', driverId: 'mock-dr-3', status: 'ONLINE', cityId, earnings: 320 },
          { id: 'DEV-MYS-003', driverId: null, status: 'OFFLINE', cityId, earnings: 0 },
        ];
      }
      setDevices(items);
    });

    // Listen to campaigns targeted to this city
    const campQuery = query(collection(db, 'campaigns'), where('cityId', '==', cityId));
    const unsubCampaigns = onSnapshot(campQuery, (snap) => {
      let items: any[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (items.length === 0 && userProfile?.email === 'franchise@autoads.in') {
        items = [
          { id: 'CAMP-M-1', title: 'Mysore Dasara Festivities', status: 'LIVE', mediaType: 'IMAGE', mediaUrl: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=800', safeContent: true, kidsSafe: true, categoryTags: ['tourism'] },
          { id: 'CAMP-M-2', title: 'Local Bakery Ads', status: 'PENDING', mediaType: 'VIDEO', mediaUrl: 'https://cdn.pixabay.com/video/2019/02/08/21262-316499880_tiny.mp4', safeContent: true, kidsSafe: true, categoryTags: ['food'] }
        ];
      }
      setCampaigns(items);
    });

    // Listen to localized support tickets
    const ticketQuery = query(collection(db, 'supportTickets'), where('cityId', '==', cityId));
    const unsubTickets = onSnapshot(ticketQuery, (snap) => {
      let items: any[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (items.length === 0 && userProfile?.email === 'franchise@autoads.in') {
        items = [
          { id: 'TKT-M-01', subject: 'Device Screen Glitch', message: 'The screen is flickering on bumpy roads.', priority: 'HIGH', status: 'OPEN', createdAt: new Date().toISOString() },
          { id: 'TKT-M-02', subject: 'Payout Delay', message: 'Last week payment not reflected in account.', priority: 'MEDIUM', status: 'IN_PROGRESS', createdAt: new Date(Date.now() - 86400000).toISOString() }
        ];
      }
      setTickets(items);
    });

    // Listen to localized audit logs
    const logQuery = query(
      collection(db, 'activityLogs'), 
      where('cityId', '==', cityId),
      orderBy('timestamp', 'desc'),
      limit(25)
    );
    const unsubLogs = onSnapshot(logQuery, (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAuditLogs(items);
    }, (err) => {
      // Fail gracefully if index is missing
      console.warn('[FRANCHISE] Log index warning:', err.message);
    });

    return () => {
      unsubDrivers();
      unsubDevices();
      unsubCampaigns();
      unsubTickets();
      unsubLogs();
    };
  }, [cityId, franchiseId]);

  // Handle local driver registration under the city scope
  const handleRegisterDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriver.name || !newDriver.phone || !newDriver.email) {
      showToast('All primary details are required', 'error');
      return;
    }

    try {
      // 1. Create User authentication Profile document
      const uidTemp = `dr_${Date.now()}`;
      await setDoc(doc(db, 'users', uidTemp), {
        id: uidTemp,
        name: newDriver.name,
        email: newDriver.email,
        phone: newDriver.phone,
        role: 'DRIVER',
        cityId,
        franchiseId,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      });

      // 2. Create corresponding Drivers Profiling document
      await setDoc(doc(db, 'drivers', uidTemp), {
        driverId: uidTemp,
        cityId,
        franchiseId,
        payoutEnabled: false,
        adminApproved: false,
        kycStatus: 'PENDING',
        status: 'PENDING',
        documents: {
          aadhaar: newDriver.aadhaar || 'unprovided_offline',
          drivingLicense: newDriver.license || 'unprovided_offline',
          selfie: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
        },
        upiId: newDriver.upi || 'unprovided',
        registeredAt: new Date().toISOString()
      });

      // Audit Logger
      await writeAuditLog(
        'franchise_driver_registered',
        uidTemp,
        cityId,
        franchiseId,
        `Enrolled new driver ${newDriver.name} on franchise ledger`
      );

      showToast(`Driver ${newDriver.name} registered under ${getCityName(cityId)}! Pending Support KYC Review.`);
      setShowAddDriver(false);
      setNewDriver({ name: '', email: '', phone: '', upi: '', aadhaar: '', license: '' });
    } catch (err: any) {
      showToast(err.message || 'Driver enrollment failed', 'error');
    }
  };

  const handleRaiseTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.subject || !newTicket.message) {
      showToast('Need subject and issue description', 'error');
      return;
    }
    try {
      await addDoc(collection(db, 'supportTickets'), {
        subject: newTicket.subject,
        message: newTicket.message,
        priority: newTicket.priority,
        status: 'OPEN',
        cityId,
        franchiseId,
        createdAt: new Date().toISOString()
      });
      showToast('Ticket escalated to Global Headquarters successfully!');
      setShowTicketModal(false);
      setNewTicket({ subject: '', message: '', priority: 'HIGH' });
    } catch (err: any) {
      showToast('Failed to raise ticket', 'error');
    }
  };

  // Switch ticket status locally
  const updateTicketStatus = async (id: string, newStatus: 'OPEN' | 'IN_PROGRESS' | 'CLOSED') => {
    try {
      await updateDoc(doc(db, 'supportTickets', id), {
        status: newStatus
      });
      await writeAuditLog(
        'franchise_ticket_updated',
        id,
        cityId,
        franchiseId,
        `Franchise owner adjusted local issue ticket status to ${newStatus}`
      );
      showToast('Local issue adjusted resolved successfully');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Local calculation summaries
  const onlineDevicesCount = devices.filter(d => d.status === 'ONLINE' || d.status === 'ACTIVE').length;
  const activeAutosCount = drivers.filter(dr => dr.status === 'ACTIVE' || dr.adminApproved).length;
  const potentialEarnings = activeAutosCount * 12500; // Mock calculation based on local rides
  const localComplaintCount = tickets.filter(t => t.status !== 'CLOSED').length;

  const isOwner = userProfile?.role === 'FRANCHISE_OWNER';
  const isStaff = userProfile?.role === 'FRANCHISE_STAFF';
  const specialization = userProfile?.specialization;

  const checkAccess = (tab: string): { canWrite: boolean; msg: string | null } => {
    if (isOwner) return { canWrite: true, msg: null };
    if (!isStaff) return { canWrite: false, msg: 'Administrative authorization check failed.' };

    switch (specialization) {
      case 'OPERATIONS_STAFF':
        // Allowed to manage devices inside metrics/health tab, restricted on other write operations
        if (tab === 'DEVICE_CONTROL') {
          return { canWrite: true, msg: null };
        }
        return { canWrite: false, msg: 'Read-only: Restricted to Operations Staff protocols. (Specialization scope enforcement)' };
      case 'DRIVER_VERIFICATION_STAFF':
        // Allowed to verify/add drivers, restricted elsewhere
        if (tab === 'DRIVERS') {
          return { canWrite: true, msg: null };
        }
        return { canWrite: false, msg: 'Read-only: Restricted to Driver Verification Staff protocols. (Specialization scope enforcement)' };
      case 'SUPPORT_STAFF':
        // Allowed to process and escalate support tickets
        if (tab === 'TICKETS') {
          return { canWrite: true, msg: null };
        }
        return { canWrite: false, msg: 'Read-only: Restricted to Support Staff protocols. (Specialization scope enforcement)' };
      case 'FINANCE_STAFF':
        // Allowed to settle ledger settlements/payouts
        if (tab === 'FINANCE') {
          return { canWrite: true, msg: null };
        }
        return { canWrite: false, msg: 'Read-only: Restricted to Finance Staff protocols. (Specialization scope enforcement)' };
      default:
        return { canWrite: false, msg: 'Read-only: Specialization permissions lock is active.' };
    }
  };

  const handleCreateStaffInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) {
      showToast('Only Franchise Owners are authorised to invite operational staff', 'error');
      return;
    }
    if (!staffNameInput || !staffEmailInput) {
      showToast('All staff details (name and email) are required.', 'error');
      return;
    }
    try {
      const codeSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const code = `STF-${cityId.substring(0, 3).toUpperCase()}-${codeSuffix}`;

      await setDoc(doc(db, 'invitations', code), {
        id: code,
        franchiseId,
        cityId,
        cityName: getCityName(cityId),
        ownerName: staffNameInput,
        ownerEmail: staffEmailInput.trim().toLowerCase(),
        status: 'PENDING',
        role: 'FRANCHISE_STAFF',
        specialization: staffSpecInput,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });

      await writeAuditLog(
        'franchise_staff_invited',
        code,
        cityId,
        franchiseId,
        `Created staff onboarding token for ${staffNameInput} under ${staffSpecInput} specialization`
      );

      setInviteModalData({
        email: staffEmailInput,
        role: 'FRANCHISE_STAFF',
        code: code,
        claimUrl: `/register?type=staff&code=${code}`,
        specialization: staffSpecInput
      });
      setShowInviteModal(true);
      setStaffNameInput('');
      setStaffEmailInput('');
      showToast(`Token ${code} successfully formulated and saved!`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdateStaffStatus = async (staffId: string, newStatus: 'ACTIVE' | 'SUSPENDED' | 'DISABLED') => {
    if (!isOwner) {
      showToast('Only the primary Franchise Owner may adjust staff access controls.', 'error');
      return;
    }
    try {
      await updateDoc(doc(db, 'users', staffId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      await writeAuditLog(
        'franchise_staff_status_updated',
        staffId,
        cityId,
        franchiseId,
        `Franchise owner adjusted staff status parameter to ${newStatus}`
      );
      showToast(`Staff member status successfully mutated to ${newStatus}.`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleChangeStaffSpecialization = async (staffId: string, spec: string) => {
    if (!isOwner) {
      showToast('Only the primary Franchise Owner may shift staff specializations.', 'error');
      return;
    }
    try {
      await updateDoc(doc(db, 'users', staffId), {
        specialization: spec,
        updatedAt: new Date().toISOString()
      });

      await writeAuditLog(
        'franchise_staff_role_updated',
        staffId,
        cityId,
        franchiseId,
         `Franchise owner adjusted staff specialization parameter to ${spec}`
      );
      showToast(`Specialization shifted to ${spec} successfully.`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleToggleFranchiseStatus = async () => {
    if (!isOwner) {
      showToast('Settings restricted to Franchise Owner only.', 'error');
      return;
    }
    const currentStatus = franchiseDoc?.status || 'ACTIVE';
    const targetStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await updateDoc(doc(db, 'franchises', franchiseId), {
        status: targetStatus,
        updatedAt: new Date().toISOString()
      });

      await writeAuditLog(
        'franchise_status_toggled',
        franchiseId,
        cityId,
        franchiseId,
        `Owner manually toggled whole franchise status to ${targetStatus}`
      );
      showToast(`Franchise state successfully set to ${targetStatus}`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleTransferOwnership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) {
      showToast('Settings restricted to Franchise Owner only.', 'error');
      return;
    }
    if (!transferEmail || !transferName) {
      showToast('Provide new owner full name and email coordinates.', 'error');
      return;
    }
    try {
      const codeSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const code = `INV-${cityId.substring(0, 3).toUpperCase()}-${codeSuffix}`;

      await setDoc(doc(db, 'invitations', code), {
        id: code,
        franchiseId,
        cityId,
        cityName: getCityName(cityId),
        ownerName: transferName,
        ownerEmail: transferEmail.trim().toLowerCase(),
        status: 'PENDING',
        role: 'FRANCHISE_OWNER',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });

      await updateDoc(doc(db, 'franchises', franchiseId), {
        ownerName: transferName,
        ownerEmail: transferEmail.trim().toLowerCase(),
        status: 'PENDING',
        updatedAt: new Date().toISOString()
      });

      await writeAuditLog(
        'franchise_ownership_transferred',
        franchiseId,
        cityId,
        franchiseId,
        `Ownership transfer initiated: assigned to ${transferName} (${transferEmail})`
      );

      setInviteModalData({
        email: transferEmail,
        role: 'FRANCHISE_OWNER',
        code: code,
        claimUrl: `/claim?code=${code}`
      });
      setShowInviteModal(true);
      setTransferEmail('');
      setTransferName('');
      showToast(`Transfer proposed! Invitation code ${code} initialized.`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleRebootDevice = async (deviceId: string) => {
    const access = checkAccess('OPERATIONS_STAFF');
    if (!access.canWrite) {
      showToast(access.msg || 'Access restricted', 'error');
      return;
    }
    try {
      await updateDoc(doc(db, 'devices', deviceId), {
        command: 'REBOOT',
        commandTimestamp: new Date().toISOString()
      });
      
      await writeAuditLog(
        'device_reboot_command',
        deviceId,
        cityId,
        franchiseId,
        `Operations Staff triggered remote hardware reboot signal`
      );
      showToast(`Reboot sequence broadcast to node ${deviceId}.`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleToggleDeviceOffline = async (deviceId: string, currentStatus: string) => {
    const access = checkAccess('OPERATIONS_STAFF');
    if (!access.canWrite) {
      showToast(access.msg || 'Access restricted', 'error');
      return;
    }
    const targetStatus = currentStatus === 'ONLINE' || currentStatus === 'ACTIVE' ? 'OFFLINE' : 'ONLINE';
    try {
      await updateDoc(doc(db, 'devices', deviceId), {
        status: targetStatus,
        updatedAt: new Date().toISOString()
      });

      await writeAuditLog(
        'device_status_toggled',
        deviceId,
        cityId,
        franchiseId,
        `Operations Staff adjusted device status parameter to ${targetStatus}`
      );
      showToast(`Device ${deviceId} mutated to ${targetStatus} successfully.`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleApproveDriverKYC = async (driverId: string, approval: boolean) => {
    const access = checkAccess('DRIVERS');
    if (!access.canWrite) {
      showToast(access.msg || 'Access restricted', 'error');
      return;
    }
    const kycTarget = approval ? 'APPROVED' : 'REJECTED';
    const statusTarget = approval ? 'ACTIVE' : 'PENDING';
    try {
      await updateDoc(doc(db, 'drivers', driverId), {
        kycStatus: kycTarget,
        status: statusTarget,
        updatedAt: new Date().toISOString()
      });
      await updateDoc(doc(db, 'users', driverId), {
        status: statusTarget,
        updatedAt: new Date().toISOString()
      });

      await writeAuditLog(
        'driver_kyc_status_updated',
        driverId,
        cityId,
        franchiseId,
        `Verification Staff marked driver KYC as ${kycTarget}`
      );
      showToast(`Driver KYC status mutated to ${kycTarget}!`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleProcessWithdrawal = async (requestId: string, driverId: string, amount: number) => {
    const access = checkAccess('FINANCE');
    if (!access.canWrite) {
      showToast(access.msg || 'Access restricted', 'error');
      return;
    }
    try {
      await updateDoc(doc(db, 'withdrawRequests', requestId), {
        status: 'approved',
        processedAt: new Date().toISOString()
      });

      await addDoc(collection(db, 'driverPayments'), {
        driverId,
        amount,
        type: 'withdrawal',
        status: 'success',
        paymentMethod: 'UPI',
        processedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      await writeAuditLog(
        'withdrawal_request_settled',
        requestId,
        cityId,
        franchiseId,
        `Finance Staff cleared driver payout request of ₹${amount} via standard UPI settlement`
      );
      showToast(`Settlement approved! ₹${amount} cleared.`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  if (franchiseDoc?.status === 'SUSPENDED' || franchiseDoc?.status === 'DISABLED') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-[2.5rem] p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-500 animate-pulse">
            <ShieldAlert size={32} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white uppercase tracking-tighter">Franchise Terminal Suspended</h1>
            <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mt-1">Status: {franchiseDoc.status}</p>
            <p className="text-xs text-slate-400 mt-4 leading-relaxed">
              This regional node has been placed under administrative {franchiseDoc.status} protocol by corporate headquarters.
            </p>
            <p className="text-[10px] text-slate-500 mt-2 font-semibold">
              All active media terminals, driver payout streams, and dashboard permission gates remain locked. Contact AutoAds Executive Compliance to petition.
            </p>
          </div>
          <button 
            type="button"
            onClick={onLogout}
            className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut size={14} /> Stand Down Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/30">
      
      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl border shadow-xl ${
              toast.type === 'success' 
                ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200' 
                : 'bg-rose-950/90 border-rose-500/30 text-rose-200'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle size={20} className="text-emerald-400" /> : <AlertTriangle size={20} className="text-rose-400" />}
            <span className="text-xs font-semibold tracking-wide">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Rail */}
      <header className="border-b border-indigo-900/40 bg-[#0A0B10]/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg shadow-indigo-500/20 border border-indigo-500/30">
            <img src="/mayaan_logo.svg" alt="Mayaan Logo" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = "/mayaan_logo.jpeg")} />
          </div>
          <div>
            <h1 className="text-lg font-black italic text-white uppercase tracking-tighter flex items-center gap-1.5 leading-none shadow-sm">
              Mayaan <span className="text-amber-400 tracking-widest text-xs px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20 not-italic">FRANCHISE COMMAND</span>
            </h1>
            <p className="text-[10px] font-black text-indigo-300 tracking-widest uppercase mt-1 flex items-center gap-1">
              <MapPin size={10} className="text-amber-400" /> {getCityName(cityId)} REGION — Mapped to {getFranchiseName(franchiseId)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end border-r border-indigo-900/50 pr-6 mr-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Targeting Franchise</span>
            <span className="text-xs font-bold text-white tracking-widest">{userProfile?.name?.toUpperCase() || 'FRANCHISE HOLDER'}</span>
          </div>
          <button 
            type="button" 
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-950 hover:bg-rose-950/40 hover:text-rose-400 text-indigo-300 rounded-xl transition-all border border-indigo-800/50 hover:border-rose-900/50 text-xs font-black uppercase tracking-widest"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Stand Down</span>
          </button>
        </div>
      </header>

      {/* Main Core View Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Navigation Sidebar Drawer */}
        <aside className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900/60 border border-slate-900 rounded-3xl p-5 space-y-5 shadow-sm">
            <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">Control Command Panel</h2>
            <div className="flex flex-col gap-1.5">
              {[
                { id: 'METRICS', label: 'Operations & Rev', icon: Activity, visible: true },
                { id: 'DRIVERS', label: 'City Autos & Drivers', icon: Users, visible: true },
                { id: 'CAMPAIGNS', label: 'Compliance Campaigns', icon: FileText, visible: true },
                { id: 'TICKETS', label: 'Local Support issues', icon: HelpCircle, visible: true },
                { id: 'LOUNGE', label: 'Staff Lounge Chat', icon: MessageSquare, visible: true },
                { id: 'STAFF', label: 'Staff Management', icon: UserCheck, visible: isOwner },
                { id: 'SETTINGS', label: 'Franchise Controls', icon: Settings, visible: isOwner },
                { id: 'AUDIT', label: 'Franchise Audit Log', icon: Shield, visible: true }
              ].filter(item => item.visible).map((item: any) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3.5 px-4.5 py-4.5 rounded-2xl text-xs font-black uppercase tracking-wider text-left transition-all ${
                      isActive 
                        ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/10 scale-[1.02]' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-slate-800'
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-800/60 space-y-3.5">
              <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl">
                <div>
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none mb-1">Status Check</p>
                  <p className="text-[9px] font-bold text-slate-400">Franchise Online</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              {isStaff && (
                <div className="p-3.5 bg-indigo-950/40 border border-indigo-900/30 rounded-2xl">
                  <span className="text-[8px] font-black text-indigo-400 tracking-widest uppercase mb-1 block">Staff Division</span>
                  <span className="text-[9px] font-black text-white uppercase tracking-wider">{specialization?.replace('_', ' ')}</span>
                </div>
              )}

              <div className="p-3.5 bg-slate-950/60 border border-slate-900 rounded-2xl">
                <span className="text-[8.5px] font-black text-slate-500 tracking-wider uppercase mb-1 block">Live Playback GPS Nodes</span>
                <span className="text-[11px] font-black text-white">{onlineDevicesCount} Active / {devices.length} Total</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Dynamic View Tab Contents */}
        <main className="lg:col-span-3 space-y-6">

          {/* Core Metrics Tab View */}
          {activeTab === 'METRICS' && (
            <div className="space-y-6">
              
              {/* Statistics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/50 border border-slate-900 rounded-2xl p-5 shadow-sm hover:border-slate-800 transition-all">
                  <span className="text-[10px] font-black leading-none uppercase text-slate-500 tracking-wider">Total Drivers (City)</span>
                  <div className="flex items-baseline gap-2 mt-3">
                    <span className="text-3xl font-black italic text-white tracking-tighter">{drivers.length}</span>
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-wide">+{drivers.filter(d => d.kycStatus === 'PENDING').length} Pnd</span>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-[9px] font-bold text-slate-400">
                    <Users size={12} className="text-amber-500" /> Managed city ledger
                  </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-900 rounded-2xl p-5 shadow-sm hover:border-slate-800 transition-all">
                  <span className="text-[10px] font-black leading-none uppercase text-slate-500 tracking-wider">Media Devices</span>
                  <div className="flex items-baseline gap-2 mt-3">
                    <span className="text-3xl font-black italic text-white tracking-tighter">{devices.length}</span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{onlineDevicesCount} Active</span>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-[9px] font-bold text-slate-400">
                    <Tablet size={12} className="text-amber-500" /> Active digital screens
                  </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-900 rounded-2xl p-5 shadow-sm hover:border-slate-800 transition-all animate-none">
                  <span className="text-[10px] font-black leading-none uppercase text-slate-500 tracking-wider">Localized Campaigns</span>
                  <div className="flex items-baseline gap-2 mt-3">
                    <span className="text-3xl font-black italic text-white tracking-tighter">{campaigns.length}</span>
                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-wide">{campaigns.filter(c => c.status === 'LIVE').length} Live</span>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-[9px] font-bold text-slate-400">
                    <FileText size={12} className="text-amber-500" /> City targeted campaigns
                  </div>
                </div>

                <div className="bg-gradient-to-br from-slate-900/80 to-amber-950/20 border border-amber-900/20 rounded-2xl p-5 shadow-sm hover:border-amber-500/20 transition-all">
                  <span className="text-[10px] font-black leading-none uppercase text-amber-500 tracking-wider">Settled Revenue Share</span>
                  <div className="flex items-baseline gap-1 mt-3">
                    <span className="text-3xl font-black italic text-white tracking-tighter">₹{potentialEarnings.toLocaleString()}</span>
                    <span className="text-[8px] font-black text-emerald-400">EST.</span>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-[9px] font-bold text-amber-400">
                    <DollarSign size={12} /> Local settlements (80/20)
                  </div>
                </div>
              </div>

              {/* Graphical Segment - local engagement meters & active terminals */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Local analytics chart panel */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 md:col-span-2 space-y-4 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-black italic text-white uppercase tracking-wider">Ride & Playback Analytics</h3>
                      <p className="text-[9px] font-bold text-slate-400">Localized active screen impressions per hour</p>
                    </div>
                    <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg uppercase tracking-widest leading-none">REALTIME FEED</span>
                  </div>

                  {/* SVG Chart */}
                  <div className="h-56 w-full flex items-end justify-between px-2 pt-6 relative border-b border-l border-slate-800">
                    {/* Background Grids */}
                    <div className="absolute inset-0 flex flex-col justify-between py-2 pointer-events-none opacity-20">
                      <div className="border-t border-slate-700 w-full" />
                      <div className="border-t border-slate-700 w-full" />
                      <div className="border-t border-slate-700 w-full" />
                    </div>

                    {[
                      { label: '08:00', val: 320, active: 15 },
                      { label: '10:00', val: 780, active: 18 },
                      { label: '12:00', val: 512, active: 22 },
                      { label: '14:00', val: 690, active: 20 },
                      { label: '16:00', val: 940, active: 25 },
                      { label: '18:00', val: 1210, active: 28 },
                      { label: '20:00', val: 840, active: 21 },
                    ].map((chartData, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center group relative z-10 px-1">
                        {/* Tooltip */}
                        <div className="absolute -top-12 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white font-black text-[9px] tracking-wider opacity-0 group-hover:opacity-100 transition-all shadow-xl leading-none z-20 pointer-events-none whitespace-nowrap">
                          {chartData.val} Imps ({chartData.active} Autos)
                        </div>

                        {/* Chart bar */}
                        <div 
                          className="w-full bg-slate-800 select-none group-hover:bg-amber-500 rounded-t-lg transition-all duration-300 relative overflow-hidden"
                          style={{ height: `${(chartData.val / 1300) * 160}px` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-t from-[#05070a]/10 to-transparent" />
                        </div>
                        
                        <span className="text-[8px] font-black text-slate-500 tracking-wider mt-3 uppercase">{chartData.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Localized Terminal Monitor sidebar list */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 space-y-4 overflow-hidden flex flex-col justify-between shadow-sm">
                  <div>
                    <h3 className="text-sm font-black italic text-white uppercase tracking-wider">Device Health Monitor</h3>
                    <p className="text-[9px] font-bold text-slate-400">Real-time status of mounted displays</p>
                  </div>

                  <div className="space-y-2.5 overflow-y-auto max-h-[180px] pr-1.5 scrollbar-thin scrollbar-thumb-slate-800">
                    {devices.length === 0 ? (
                      <div className="p-4 text-center border border-dashed border-slate-800 rounded-2xl text-slate-500">
                        <Tablet size={24} className="mx-auto text-slate-600 mb-1.5" />
                        <span className="text-[9px] font-bold tracking-widest uppercase">No devices deployed yet</span>
                      </div>
                    ) : (
                      devices.map((dev: any) => (
                        <div key={dev.id} className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-900 rounded-1.5xl">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-2.5 h-2.5 rounded-full ${dev.status === 'ONLINE' || dev.status === 'ACTIVE' ? 'bg-green-400 animate-pulse' : 'bg-rose-400'}`} />
                            <div>
                              <p className="text-[10px] font-black text-white leading-none mb-1">ID: {dev.id}</p>
                              <p className="text-[8px] font-bold text-slate-500">Driver ID: {dev.driverId || 'Unassigned'}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {checkAccess('DEVICE_CONTROL').canWrite ? (
                              <div className="flex items-center gap-1 text-[9px]">
                                <button
                                  onClick={() => handleToggleDeviceOffline(dev.id, dev.status)}
                                  className="p-1 px-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-slate-950 border border-rose-500/20 rounded-md transition-all cursor-pointer"
                                  title="Toggle Device Active Status"
                                >
                                  <Power size={11} />
                                </button>
                                <button
                                  onClick={() => handleRebootDevice(dev.id)}
                                  className="p-1 px-1.5 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-slate-950 border border-indigo-500/20 rounded-md transition-all cursor-pointer"
                                  title="Remote Reboot command"
                                >
                                  <RefreshCw size={11} />
                                </button>
                              </div>
                            ) : null}
                            <span className="text-[8px] font-black uppercase text-slate-400 bg-white/5 border border-slate-800 px-2 py-0.5 rounded-md leading-none">
                              {dev.earnings ? `₹${dev.earnings}` : '₹0'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div className="pt-3 border-t border-slate-800 mt-2 flex justify-between items-center text-[9px] font-bold text-slate-400">
                    <span>Terminal coverage</span>
                    <span className="text-emerald-400 font-extrabold uppercase">
                      {devices.length > 0 ? `${Math.round((onlineDevicesCount / devices.length) * 100)}% online` : '0%'}
                    </span>
                  </div>
                </div>

              </div>

              {/* Financial Settlement Ledger - Scoped to Franchise City */}
              <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6.5 space-y-4 shadow-sm">
                <div className="flex justify-between items-center pb-3 border-b border-slate-800/60">
                  <div>
                    <h3 className="text-sm font-black italic text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Coins size={16} className="text-amber-500" /> Driver Payout & Withdrawal Claims
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400">Process instant UPI settlement clearances for active drivers in the region.</p>
                  </div>
                  <span className="text-[10px] font-black text-slate-500 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 uppercase tracking-widest leading-none">
                    {pendingWithdrawals.length} Pending requests
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                  {pendingWithdrawals.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      <CheckCircle size={24} className="mx-auto text-slate-600 mb-1.5" />
                      <span className="text-[10px] font-bold tracking-widest uppercase block mb-1">Settlement Ledger Clear</span>
                      <p className="text-[9px] text-slate-500">All regional driver payouts have been fully reconciled and paid.</p>
                    </div>
                  ) : (
                    pendingWithdrawals.map((req: any) => (
                      <div key={req.id} className="p-3 bg-slate-950/60 border border-slate-900 rounded-2xl flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black text-white font-mono">Driver ID: {req.driverId?.substring(0, 8)}</span>
                            <span className="px-1.5 py-0.5 text-[8px] font-black bg-amber-500/15 text-amber-500 rounded uppercase">PENDING PAYOUT</span>
                          </div>
                          <p className="text-[9px] text-slate-550 mt-0.5 font-bold">UPI Destination: {req.upiId || 'UPI not linked'} | Requested {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'Today'}</p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-white italic">₹{req.amount}</span>
                          {checkAccess('FINANCE').canWrite ? (
                            <button
                              onClick={() => handleProcessWithdrawal(req.id, req.driverId, req.amount)}
                              className="px-3 py-2 bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-extrabold uppercase rounded-lg text-[9px] tracking-wide transition-all cursor-pointer shadow-md"
                            >
                              Dispatch UPI
                            </button>
                          ) : (
                            <span className="text-[9.5px] font-black text-slate-500 bg-white/5 px-2.5 py-1 rounded-md border border-slate-800 uppercase tracking-wider">
                              Read-Only
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Campaign Revenue Settlements & Ledger */}
              <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6.5 space-y-6 shadow-sm">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 pb-4 border-b border-slate-800/60">
                  <div>
                    <h3 className="text-sm font-black italic text-white uppercase tracking-wider flex items-center gap-2">
                      <Coins size={16} className="text-amber-500 animate-pulse" />
                      Campaign Revenue Settlement Center
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400">
                      Determine campaign sources (HQ vs Local Franchise), calculate split shares dynamically from franchise terms, generate local ledgers, and trigger monthly payouts.
                    </p>
                  </div>
                  
                  {/* Select month selection dropdown */}
                  <div className="flex items-center gap-2 self-start md:self-auto">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Settlement Period:</span>
                    <select
                      value={settledMonthValue}
                      onChange={(e) => {
                        setSettledMonthValue(e.target.value);
                        setIsSettlementProcessed(false);
                      }}
                      className="bg-slate-950 border border-slate-900 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase text-amber-500 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="May 2026">May 2026 (Active)</option>
                      <option value="April 2026">April 2026</option>
                      <option value="March 2026">March 2026</option>
                    </select>
                  </div>
                </div>

                {/* Sub-grid of KPIs representing split logic and accumulated revenues */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-2xl flex flex-col justify-between">
                    <div>
                      <span className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider block">Gross Ledger Revenue</span>
                      <span className="text-xl font-mono font-black italic text-white mt-1 block">
                        ₹{revenueLedger.reduce((acc: number, curr: any) => acc + curr.budget, 0).toLocaleString()}
                      </span>
                    </div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-2">Combined Campaign Budgets</span>
                  </div>

                  <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-2xl flex flex-col justify-between">
                    <div>
                      <span className="text-[8.5px] font-black text-indigo-400 uppercase tracking-wider block font-semibold">HQ / Corporate Share</span>
                      <span className="text-xl font-mono font-black italic text-indigo-400 mt-1 block font-semibold">
                        ₹{revenueLedger.reduce((acc: number, curr: any) => acc + curr.platformShare, 0).toLocaleString()}
                      </span>
                    </div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-2">
                      {revenueLedger.filter((e: any) => e.source === 'HQ').length} HQ Campaigns (100% Corp)
                    </span>
                  </div>

                  <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-2xl flex flex-col justify-between">
                    <div>
                      <span className="text-[8.5px] font-black text-amber-500 uppercase tracking-wider block">Franchise Local Share</span>
                      <span className="text-xl font-mono font-black italic text-amber-500 mt-1 block">
                        ₹{revenueLedger.reduce((acc: number, curr: any) => acc + curr.franchiseShare, 0).toLocaleString()}
                      </span>
                    </div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-2">
                      {revenueLedger.filter((e: any) => e.source === 'FRANCHISE').length} Local Campaigns ({getRevenueSplitPercentages().franchisePercent}% model)
                    </span>
                  </div>

                  <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-2xl flex flex-col justify-between">
                    <div>
                      <span className="text-[8.5px] font-black text-emerald-400 uppercase tracking-wider block">Settlement Status</span>
                      <span className={`inline-block text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider mt-1.5 ${
                        isSettlementProcessed 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse'
                      }`}>
                        {isSettlementProcessed ? '✓ Settled & Disbursed' : '⚠ Action Required'}
                      </span>
                    </div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-2">Period: {settledMonthValue}</span>
                  </div>
                </div>

                {/* Main section: Revenue Ledger & Control desks split */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Ledger Board (Left/Middle cols) */}
                  <div className="lg:col-span-2 space-y-3">
                    <div className="flex justify-between items-center bg-slate-950/30 p-3 rounded-xl border border-slate-900">
                      <span className="text-[10px] font-black text-white uppercase tracking-wider">Campaign Revenue Ledger</span>
                      <span className="text-[8px] font-bold text-slate-500">Auto-Generated from source tags</span>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-slate-800">
                      {revenueLedger.length === 0 ? (
                        <div className="p-10 text-center border border-dashed border-slate-800 rounded-2xl text-slate-500">
                          No ledger records compiled.
                        </div>
                      ) : (
                        revenueLedger.map((item: any, idx: number) => (
                          <div key={idx} className="p-3.5 bg-slate-950/60 border border-slate-900 rounded-xl hover:border-slate-800 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-[11px] font-black text-white uppercase leading-none">{item.title}</h4>
                                <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                                  item.source === 'HQ' 
                                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                                    : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                }`}>
                                  {item.source} Sourced
                                </span>
                              </div>
                              <p className="text-[9px] text-slate-400 font-semibold">Client: {item.clientName} | Split Terms: <span className="font-mono text-amber-500">{item.terms}</span></p>
                              <p className="text-[8px] text-slate-500 font-mono">Date: {item.date} | ID: {item.id}</p>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-4 min-w-[150px] border-t sm:border-t-0 border-slate-900 pt-2 sm:pt-0">
                              <div className="text-left sm:text-right">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none font-sans">Gross Budget</p>
                                <p className="text-xs font-black text-white font-mono mt-1">₹{item.budget.toLocaleString()}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest leading-none font-sans">Your Share</p>
                                <p className="text-xs font-black text-emerald-400 font-mono mt-1">
                                  ₹{item.franchiseShare.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Actions desk, monthly settlement, report generation (Right column) */}
                  <div className="bg-slate-950/40 border border-slate-900 p-5 rounded-3xl space-y-5 flex flex-col justify-between">
                    
                    {/* Monthly Settlement routine Card */}
                    <div className="space-y-3.5">
                      <div className="pb-2.5 border-b border-slate-900">
                        <span className="text-[10px] font-black text-white uppercase tracking-wider block">Period settlement desk</span>
                        <p className="text-[8.5px] font-semibold text-slate-400 mt-1 leading-snug">Review and reconcile localized advertiser payments to finalize payout balances.</p>
                      </div>

                      <div className="space-y-1.5 bg-slate-950/80 p-3 rounded-2xl border border-slate-900 text-[10px] font-semibold">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Subtotal Local Revenue:</span>
                          <span className="text-white font-mono">
                            ₹{revenueLedger.reduce((acc: number, curr: any) => acc + curr.franchiseShare, 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-sans font-semibold">Corporate Share Retained:</span>
                          <span className="text-white font-mono font-semibold">
                            ₹{revenueLedger.reduce((acc: number, curr: any) => acc + curr.platformShare, 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1.5 border-t border-slate-900">
                          <span className="text-amber-500 font-black uppercase">Net Franchise Payout:</span>
                          <span className="text-emerald-400 font-black font-mono">
                            ₹{revenueLedger.reduce((acc: number, curr: any) => acc + curr.franchiseShare, 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Operational control buttons */}
                    <div className="space-y-2.5 pt-3">
                      {!isSettlementProcessed ? (
                        <button
                          type="button"
                          onClick={handleTriggerSettlement}
                          disabled={isProcessingSettle || revenueLedger.length === 0}
                          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-xl text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-55"
                        >
                          {isProcessingSettle ? (
                            <>
                              <RefreshCw size={12} className="animate-spin" />
                              Reconciling Ledger...
                            </>
                          ) : (
                            <>
                              <CheckCircle size={12} />
                              Run Monthly Settlement
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center space-y-1">
                          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block">Settlement locked</span>
                          <p className="text-[8px] text-slate-400 font-medium">Reconciled to UPI destination on {new Date().toLocaleDateString()}</p>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={downloadPayoutReport}
                        disabled={revenueLedger.length === 0}
                        className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-[9px] border border-slate-800 hover:border-slate-700 uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <FileText size={12} className="text-amber-500" />
                        Download Payout Report
                      </button>
                    </div>

                  </div>

                </div>

              </div>

            </div>
          )}

          {/* Scoped City Autos & Drivers Module */}
          {activeTab === 'DRIVERS' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h3 className="text-base font-black italic text-white uppercase tracking-wider">City Franchise Drivers List</h3>
                  <p className="text-[10px] font-bold text-slate-400">Local drivers registered and managed under {getCityName(cityId)} Franchise.</p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddDriver(true)}
                  className="flex items-center gap-2 px-4.5 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-500/10 transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  Add Local Driver
                </button>
              </div>

              {/* Add Driver Drawer Modal Dialog */}
              <AnimatePresence>
                {showAddDriver && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddDriver(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }} 
                      animate={{ scale: 1, opacity: 1 }} 
                      exit={{ scale: 0.9, opacity: 0 }} 
                      className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl space-y-5 text-white"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Users className="text-amber-500" size={18} />
                          <h4 className="text-lg font-black italic text-white uppercase tracking-tighter">Add Local Driver Account</h4>
                        </div>
                        <button onClick={() => setShowAddDriver(false)} className="text-slate-400 hover:text-white p-2 hover:bg-white/5 rounded-xl transition-all"><X size={18} /></button>
                      </div>

                      <form onSubmit={handleRegisterDriver} className="space-y-4">
                        <div>
                          <label className="text-[8px] font-black tracking-widest uppercase text-slate-400 block mb-1">Driver Full Name</label>
                          <input 
                            type="text" 
                            required 
                            placeholder="e.g. Ramesh Kumar" 
                            value={newDriver.name}
                            onChange={(e) => setNewDriver({...newDriver, name: e.target.value})}
                            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-amber-500 focus:outline-none transition-all font-semibold text-xs text-slate-200 placeholder-slate-700" 
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3.5">
                          <div>
                            <label className="text-[8px] font-black tracking-widest uppercase text-slate-400 block mb-1">Mobile Phone (Primary)</label>
                            <input 
                              type="tel" 
                              required 
                              placeholder="e.g. 9876543210" 
                              value={newDriver.phone}
                              onChange={(e) => setNewDriver({...newDriver, phone: e.target.value})}
                              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-amber-500 focus:outline-none transition-all font-semibold text-xs text-slate-200 placeholder-slate-700" 
                            />
                          </div>
                          <div>
                            <label className="text-[8px] font-black tracking-widest uppercase text-slate-400 block mb-1">Email Account</label>
                            <input 
                              type="email" 
                              required 
                              placeholder="e.g. ramesh@gmail.com" 
                              value={newDriver.email}
                              onChange={(e) => setNewDriver({...newDriver, email: e.target.value})}
                              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-amber-500 focus:outline-none transition-all font-semibold text-xs text-slate-200 placeholder-slate-700" 
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3.5">
                          <div>
                            <label className="text-[8px] font-black tracking-widest uppercase text-slate-400 block mb-1">Aadhaar Card No (Offline Reg)</label>
                            <input 
                              type="text" 
                              placeholder="12 Digit No" 
                              value={newDriver.aadhaar}
                              onChange={(e) => setNewDriver({...newDriver, aadhaar: e.target.value})}
                              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-amber-500 focus:outline-none transition-all font-semibold text-xs text-slate-200 placeholder-slate-700" 
                            />
                          </div>
                          <div>
                            <label className="text-[8px] font-black tracking-widest uppercase text-slate-400 block mb-1">Driving License No (Offline Reg)</label>
                            <input 
                              type="text" 
                              placeholder="KA-09-202X-012" 
                              value={newDriver.license}
                              onChange={(e) => setNewDriver({...newDriver, license: e.target.value})}
                              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-amber-500 focus:outline-none transition-all font-semibold text-xs text-slate-200 placeholder-slate-700" 
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[8px] font-black tracking-widest uppercase text-slate-400 block mb-1">Payment Settlement UPI ID</label>
                          <input 
                            type="text" 
                            placeholder="ramesh@okhdfcbank" 
                            value={newDriver.upi}
                            onChange={(e) => setNewDriver({...newDriver, upi: e.target.value})}
                            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-amber-500 focus:outline-none transition-all font-semibold text-xs text-slate-200 placeholder-slate-700" 
                          />
                        </div>

                        <button 
                          type="submit"
                          className="w-full mt-4 py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg cursor-pointer"
                        >
                          Enroll Driver to Database
                        </button>
                      </form>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Drivers database table view */}
              <div className="bg-slate-900/50 border border-slate-900 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800/80 bg-slate-950/40">
                        <th className="px-6 py-4.5 text-[8.5px] font-black tracking-widest uppercase text-slate-500">Driver info</th>
                        <th className="px-6 py-4.5 text-[8.5px] font-black tracking-widest uppercase text-slate-500">KYC Verify status</th>
                        <th className="px-6 py-4.5 text-[8.5px] font-black tracking-widest uppercase text-slate-500">Device linked</th>
                        <th className="px-6 py-4.5 text-[8.5px] font-black tracking-widest uppercase text-slate-500">Payout details</th>
                        <th className="px-6 py-4.5 text-[8.5px] font-black tracking-widest uppercase text-slate-500">Current state</th>
                        <th className="px-6 py-4.5 text-[8.5px] font-black tracking-widest uppercase text-slate-500 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-xs">
                      {drivers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-10 text-slate-500">
                            <Users size={28} className="mx-auto text-slate-600 mb-2" />
                            No drivers registered under this city franchise yet.
                          </td>
                        </tr>
                      ) : (
                        drivers.map((drv: any) => {
                          const linkedDevice = devices.find(dv => dv.driverId === drv.driverId || dv.driverId === drv.id);
                          return (
                            <tr key={drv.id} className="hover:bg-white/[0.01] transition-all">
                              <td className="px-6 py-4">
                                <div>
                                  <p className="font-extrabold text-white text-xs">{drv.name}</p>
                                  <p className="text-[9px] text-slate-500 font-medium tracking-wide mt-0.5">{drv.email} | {drv.phone || 'No phone'}</p>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[8.5px] font-black uppercase tracking-wider ${
                                  drv.kycStatus === 'APPROVED' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' :
                                  drv.kycStatus === 'REJECTED' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' :
                                  'bg-amber-500/10 border border-amber-500/20 text-amber-500'
                                }`}>
                                  ● {drv.kycStatus || 'PENDING'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {linkedDevice ? (
                                  <div className="flex items-center gap-1.5">
                                    <Tablet size={13} className="text-slate-400" />
                                    <span className="font-mono text-[10px] text-white font-extrabold">{linkedDevice.id}</span>
                                  </div>
                                ) : (
                                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Unassigned</span>
                                )}
                              </td>
                              <td className="px-6 py-4 font-mono text-[10.5px] text-slate-400 font-medium">
                                {drv.upiId || 'No Settlement Account'}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                                  drv.status === 'ACTIVE' || drv.adminApproved ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-500'
                                }`}>
                                  {drv.status === 'ACTIVE' || drv.adminApproved ? '● Active' : '● Idle / pending'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                {checkAccess('DRIVER_VERIFICATION').canWrite && drv.kycStatus !== 'APPROVED' ? (
                                  <button
                                    onClick={() => handleApproveDriverKYC(drv.id, true)}
                                    className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-[8.5px] uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                                  >
                                    Approve KYC
                                  </button>
                                ) : (
                                  <span className="text-[8.5px] font-black text-slate-550 uppercase tracking-wider">Approved</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* Compliance Campaigns Tab */}
          {activeTab === 'CAMPAIGNS' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-black italic text-white uppercase tracking-wider">Localized Targeted Campaigns</h3>
                <p className="text-[10px] font-bold text-slate-400">Marketing campaigns active or scheduled for the {getCityName(cityId)} area.</p>
              </div>

              <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 space-y-4">
                {campaigns.length === 0 ? (
                  <div className="p-10 text-center text-slate-500 border border-dashed border-slate-800 rounded-2.5rem">
                    <FileText size={32} className="mx-auto text-slate-600 mb-2" />
                    No targeted campaigns mapped to this city franchise yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {campaigns.map((camp: any) => (
                      <div key={camp.id} className="p-5 bg-slate-950/60 border border-slate-900 rounded-2xl flex flex-col justify-between space-y-4">
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <span className="text-[8px] font-black tracking-widest bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-md uppercase">
                              {camp.mediaType || 'IMAGE'}
                            </span>
                            <h4 className="text-xs font-black uppercase text-white mt-1 leading-snug">{camp.title}</h4>
                            <p className="text-[9px] text-slate-500 mt-1">Campaign ID: <span className="font-mono">{camp.id}</span></p>
                          </div>
                          
                          <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider border ${
                            camp.status === 'APPROVED' || camp.status === 'LIVE' 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                          }`}>
                            {camp.status || 'PENDING'}
                          </span>
                        </div>

                        {/* Media Preview inside the sandbox card safely */}
                        <div className="h-44 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative flex items-center justify-center">
                          {camp.mediaUrl ? (
                            camp.mediaType === 'VIDEO' ? (
                              <video src={camp.mediaUrl} className="w-full h-full object-cover" muted loop autoPlay />
                            ) : (
                              <img src={camp.mediaUrl} className="w-full h-full object-cover" alt="Campaign visual" referrerPolicy="no-referrer" />
                            )
                          ) : (
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">No visual media provided</span>
                          )}
                        </div>

                        {/* Category Compliance flags as mapped by support team */}
                        <div className="pt-3 border-t border-slate-900/80 flex flex-wrap gap-1.5">
                          <span className={`text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${camp.safeContent ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            {camp.safeContent ? '✓ Safe Content Verified' : '⚠ Flagged Content'}
                          </span>
                          <span className={`text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${camp.kidsSafe ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-450'}`}>
                            {camp.kidsSafe ? '✓ Kids-Safe' : '15+ restriction'}
                          </span>
                          {camp.categoryTags?.map((tag: string, i: number) => (
                            <span key={i} className="text-[8.5px] font-black uppercase tracking-wider bg-slate-900 text-slate-400 border border-slate-800 px-2.5 py-0.5 rounded">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Local Support Issues management */}
          {activeTab === 'TICKETS' && (
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-base font-black italic text-white uppercase tracking-wider">Complaint Handling & Global Escalation</h3>
                  <p className="text-[10px] font-bold text-indigo-300 tracking-wider">Issues reported inside {getCityName(cityId)} scope, or escalate to global support HQ.</p>
                </div>
                <button
                  onClick={() => setShowTicketModal(true)}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all font-black uppercase text-xs tracking-wider"
                >
                  <AlertCircle size={14} />
                  Escalate an Issue
                </button>
              </div>

              <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 space-y-4">
                {tickets.length === 0 ? (
                  <div className="p-10 text-center text-slate-500 border border-dashed border-slate-800 rounded-2.5rem">
                    <CheckCircle size={32} className="mx-auto text-slate-600 mb-2" />
                    No local support complaints mapped to this city franchise currently.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tickets.map((t: any) => (
                      <div key={t.id} className="p-4 bg-slate-950/60 border border-slate-900 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              t.priority === 'HIGH' ? 'bg-rose-500 animate-pulse' :
                              t.priority === 'MEDIUM' ? 'bg-amber-500' : 'bg-blue-500'
                            }`} />
                            <h4 className="text-xs font-black uppercase text-white">{t.subject}</h4>
                          </div>
                          <p className="text-[10px] text-slate-450 mt-1 font-semibold leading-relaxed max-w-xl">{t.message}</p>
                          <p className="text-[9px] text-slate-500 mt-2">Opened at: {new Date(t.createdAt).toLocaleDateString()} | Ticket: <span className="font-mono">{t.id}</span></p>
                        </div>

                        <div className="flex items-center gap-2 mt-2 md:mt-0 w-full md:w-auto justify-end">
                          <span className={`px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-lg border ${
                            t.status === 'CLOSED' ? 'bg-slate-900 border-slate-800 text-slate-500' :
                            t.status === 'IN_PROGRESS' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                            'bg-rose-500/10 border-rose-500/20 text-rose-500'
                          }`}>
                            {t.status || 'OPEN'}
                          </span>

                          <div className="flex items-center h-8 gap-1 ml-2">
                            {t.status !== 'CLOSED' && (
                              <button
                                onClick={() => updateTicketStatus(t.id, 'CLOSED')}
                                className="p-1 px-2.5 h-full bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/20 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Close Ticket
                              </button>
                            )}
                            {t.status === 'OPEN' && (
                              <button
                                onClick={() => updateTicketStatus(t.id, 'IN_PROGRESS')}
                                className="p-1 px-2.5 h-full bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-slate-950 border border-amber-500/20 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Progress
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Localized Audit Logs View */}
          {activeTab === 'AUDIT' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-black italic text-white uppercase tracking-wider">Franchise Local Audit Log</h3>
                <p className="text-[10px] font-bold text-slate-400">Cryptographically sound activity ledger capturing actions bound to this franchise.</p>
              </div>

              <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6.5">
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2.5 scrollbar-thin scrollbar-thumb-slate-800">
                  {auditLogs.length === 0 ? (
                    <div className="p-10 text-center text-slate-500 border border-dashed border-slate-800 rounded-2.5rem">
                      <Shield size={32} className="mx-auto text-slate-600 mb-2" />
                      No local audit tracks saved yet for this franchise zone.
                    </div>
                  ) : (
                    auditLogs.map((log: any) => (
                      <div key={log.id} className="p-4 bg-slate-950/60 border border-slate-900 rounded-2xl flex flex-col md:flex-row justify-between md:items-center gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[8.5px] font-black text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded uppercase leading-none">
                              {log.action}
                            </span>
                            <span className="text-[9.5px] font-extrabold text-white">Target: <span className="font-mono text-slate-400">{log.targetId}</span></span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-semibold">{log.details || 'Operational record updated.'}</p>
                          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Performer: {log.performedByName || log.performedBy}</p>
                        </div>
                        
                        <div className="flex items-center gap-2.5 text-right font-mono text-[9px] text-slate-400 leading-none">
                          <Clock size={12} className="text-slate-500" />
                          {log.timestamp ? (log.timestamp.toDate ? log.timestamp.toDate().toLocaleString() : new Date(log.timestamp).toLocaleString()) : 'Pending Ledger synced'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Staff Onboarding and Management Dashboard */}
          {activeTab === 'STAFF' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h3 className="text-base font-black italic text-white uppercase tracking-wider">Delegated Operational Staff Ledger</h3>
                  <p className="text-[10px] font-bold text-slate-400">Onboard and control specialized personnel for your region's micro-service gates.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Invite Staff Form Column */}
                <div className="lg:col-span-1 bg-slate-900/40 border border-slate-900 rounded-3xl p-6 space-y-4">
                  <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5 border-b border-slate-800/60 pb-3">
                    <UserCheck size={14} className="text-amber-500" /> Convert New Personnel
                  </h4>
                  
                  <form onSubmit={handleCreateStaffInvitation} className="space-y-4">
                    <div>
                      <label className="text-[8px] font-black tracking-widest uppercase text-slate-400 block mb-1">Staff Legal Name</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. Anand Hegde" 
                        value={staffNameInput}
                        onChange={e => setStaffNameInput(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-amber-500 focus:outline-none transition-all font-semibold text-xs text-slate-200" 
                      />
                    </div>

                    <div>
                      <label className="text-[8px] font-black tracking-widest uppercase text-slate-400 block mb-1">Corporate Email Address</label>
                      <input 
                        type="email" 
                        required 
                        placeholder="e.g. anand@autoads.in" 
                        value={staffEmailInput}
                        onChange={e => setStaffEmailInput(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-amber-500 focus:outline-none transition-all font-semibold text-xs text-slate-200" 
                      />
                    </div>

                    <div>
                      <label className="text-[8px] font-black tracking-widest uppercase text-slate-400 block mb-1">Delegated Division</label>
                      <select 
                        value={staffSpecInput}
                        onChange={e => setStaffSpecInput(e.target.value as any)}
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-amber-500 focus:outline-none transition-all font-semibold text-xs text-slate-200 cursor-pointer"
                      >
                        <option value="OPERATIONS_STAFF">Operations & Devices</option>
                        <option value="DRIVER_VERIFICATION_STAFF">Driver KYC & Onboarding</option>
                        <option value="SUPPORT_STAFF">User Support & Tickets</option>
                        <option value="FINANCE_STAFF">Revenue & Settlements</option>
                      </select>
                    </div>

                    <button 
                      type="submit" 
                      className="w-full py-4.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-lg cursor-pointer animate-none"
                    >
                      <Plus size={12} /> Issue Staff Invitation Token
                    </button>
                  </form>
                </div>

                {/* Active Staff List Column */}
                <div className="lg:col-span-2 bg-slate-900/40 border border-slate-900 rounded-3xl p-6 space-y-4">
                  <h4 className="text-xs font-black uppercase text-white tracking-wider border-b border-slate-800/60 pb-3">
                    Active Regional Personnel
                  </h4>

                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {staffList.length === 0 ? (
                      <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                        <Users size={28} className="mx-auto mb-2 text-slate-600" />
                        No staff members claimed under your franchise domain yet.
                      </div>
                    ) : (
                      staffList.map((st: any) => (
                        <div key={st.id} className="p-4 bg-slate-950/60 border border-slate-900 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-black text-white">{st.name}</span>
                              <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                st.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                              }`}>
                                {st.status || 'ACTIVE'}
                              </span>
                            </div>
                            <p className="text-[9px] text-slate-500 font-semibold">{st.email} | Joined On {st.createdAt ? new Date(st.createdAt).toLocaleDateString() : 'N/A'}</p>
                            
                            {/* Specialization selector */}
                            <div className="mt-2.5 flex items-center gap-2">
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Division:</span>
                              <select
                                value={st.specialization || 'OPERATIONS_STAFF'}
                                onChange={e => handleChangeStaffSpecialization(st.id, e.target.value)}
                                className="bg-slate-900 border border-slate-800 text-[9px] font-extrabold uppercase text-amber-500 px-2 py-1 rounded focus:outline-none cursor-pointer"
                              >
                                <option value="OPERATIONS_STAFF">Operations Staff</option>
                                <option value="DRIVER_VERIFICATION_STAFF">KYC Verification Staff</option>
                                <option value="SUPPORT_STAFF">Support Staff</option>
                                <option value="FINANCE_STAFF">Finance Staff</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {st.status !== 'SUSPENDED' ? (
                              <button
                                onClick={() => handleUpdateStaffStatus(st.id, 'SUSPENDED')}
                                className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-slate-950 border border-rose-500/20 hover:border-transparent rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Suspend Staff
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateStaffStatus(st.id, 'ACTIVE')}
                                className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/20 hover:border-transparent rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Reactivate
                              </button>
                            )}

                            <button
                              onClick={() => handleUpdateStaffStatus(st.id, 'DISABLED')}
                              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                            >
                              Deactivate
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Staff Collaboration Lounge Tab */}
          {activeTab === 'LOUNGE' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-black italic text-white uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare size={18} className="text-amber-500" />
                  Staff Collaboration Lounge
                </h3>
                <p className="text-[10px] font-bold text-slate-400">
                  Secure real-time coordination terminal for {franchiseDoc?.cityName || getCityName(cityId)} franchise zone.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* Personnel Directory Panel */}
                <div className="lg:col-span-1 bg-slate-900/40 border border-slate-900 rounded-3xl p-5 space-y-4">
                  <div className="border-b border-slate-800 pb-3">
                    <h4 className="text-xs font-black uppercase text-white tracking-wider">Zone Personnel</h4>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Scoped within region</p>
                  </div>

                  <div className="space-y-3 max-h-[300px] lg:max-h-[450px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800">
                    {/* Owner */}
                    <div className="p-3 bg-slate-950/50 border border-slate-800/40 rounded-xl flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-black text-white truncate flex items-center gap-1.5 flex-wrap">
                          {franchiseDoc?.ownerName || 'Franchise Owner'}
                          {userProfile?.role === 'FRANCHISE_OWNER' && (
                            <span className="text-[8px] font-black text-slate-500 uppercase">● YOU</span>
                          )}
                        </div>
                        <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Franchise Owner</span>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                    </div>

                    {/* Staff List */}
                    {staffList.length === 0 ? (
                      <div className="p-4 text-center text-slate-600 font-bold text-[9px] uppercase tracking-widest bg-slate-950/20 rounded-xl border border-dashed border-slate-900">
                        No active staff registered
                      </div>
                    ) : (
                      staffList.map((st: any) => {
                        const isSelf = userProfile?.id === st.id;
                        let specLabel = 'Operations';
                        let specColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                        if (st.specialization === 'DRIVER_VERIFICATION_STAFF') {
                          specLabel = 'KYC Verification';
                          specColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
                        } else if (st.specialization === 'FINANCE_STAFF') {
                          specLabel = 'Finance';
                          specColor = 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
                        } else if (st.specialization === 'SUPPORT_STAFF') {
                          specLabel = 'User Support';
                          specColor = 'text-amber-500 bg-amber-500/10 border-amber-500/20';
                        }

                        return (
                          <div key={st.id} className="p-3 bg-slate-950/30 border border-slate-900 rounded-xl flex items-center justify-between gap-3 hover:border-slate-800 transition-all">
                            <div className="min-w-0">
                              <div className="text-[11px] font-black text-slate-300 truncate flex items-center gap-1.5 flex-wrap">
                                {st.name}
                                {isSelf && (
                                  <span className="text-[8px] font-black text-slate-500 uppercase">● YOU</span>
                                )}
                              </div>
                              <span className={`inline-block text-[7.5px] font-black uppercase tracking-widest mt-1 border px-1.5 py-0.5 rounded ${specColor}`}>
                                {specLabel}
                              </span>
                            </div>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-2xl space-y-1.5">
                    <span className="text-[8.5px] font-black text-indigo-400 uppercase tracking-widest block">Operational Mentions</span>
                    <p className="text-[9px] text-slate-400 leading-relaxed font-semibold">
                      Tag departments in chat messages to trigger automatic notification relays:
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="text-[7.5px] font-bold font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded">@Owner</span>
                      <span className="text-[7.5px] font-bold font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded">@Operations</span>
                      <span className="text-[7.5px] font-bold font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded">@Verification</span>
                      <span className="text-[7.5px] font-bold font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded">@Finance</span>
                      <span className="text-[7.5px] font-bold font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded">@Support</span>
                    </div>
                  </div>
                </div>

                {/* Secure Chat Terminal */}
                <div className="lg:col-span-3 flex flex-col bg-slate-900/40 border border-slate-900 rounded-3xl overflow-hidden min-h-[500px]">
                  
                  {/* Chat message list area */}
                  <div className="flex-1 p-6 space-y-4 max-h-[420px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
                    {loungeMessages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-10 mt-15">
                        <div className="w-12 h-12 rounded-full bg-slate-950 flex items-center justify-center border border-slate-800 text-slate-500 mb-3 animate-pulse">
                          <MessageSquare size={18} />
                        </div>
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">No transmitted signals</h4>
                        <p className="text-[9.5px] text-slate-500 font-semibold max-w-xs mt-1">
                          Terminal channel is empty. Type a message below to broadcast securely to this franchise zone.
                        </p>
                      </div>
                    ) : (
                      loungeMessages.map((msg: any) => {
                        const isSelf = msg.senderId === auth.currentUser?.uid;
                        
                        let badgeColor = "bg-slate-950 text-slate-400 border-slate-800";
                        let specLabel = "Staff";
                        if (msg.senderRole === "FRANCHISE_OWNER") {
                          badgeColor = "bg-amber-500/10 text-amber-500 border-amber-500/20";
                          specLabel = "Owner";
                        } else if (msg.senderSpecialization === "OPERATIONS_STAFF") {
                          badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                          specLabel = "Operations";
                        } else if (msg.senderSpecialization === "DRIVER_VERIFICATION_STAFF") {
                          badgeColor = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                          specLabel = "Verification";
                        } else if (msg.senderSpecialization === "FINANCE_STAFF") {
                          badgeColor = "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
                          specLabel = "Finance";
                        } else if (msg.senderSpecialization === "SUPPORT_STAFF") {
                          badgeColor = "bg-amber-500/10 text-amber-500 border-amber-500/20";
                          specLabel = "Support";
                        }

                        // Parse mentions in message text
                        const highlightText = (text: string) => {
                          if (!text) return "";
                          const parts = text.split(/(@\w+)/g);
                          return parts.map((part, i) => {
                            if (part.startsWith('@')) {
                              return (
                                <span key={i} className="text-amber-500 font-bold bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded text-[9px] font-mono mx-0.5">
                                  {part}
                                </span>
                              );
                            }
                            return part;
                          });
                        };

                        return (
                          <div 
                            key={msg.id} 
                            className={`flex flex-col space-y-1.5 max-w-[85%] ${isSelf ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[9.5px] font-black text-white">{msg.senderName}</span>
                              <span className={`text-[7px] font-black uppercase tracking-widest border px-1.5 py-0.5 rounded-md ${badgeColor}`}>
                                {specLabel}
                              </span>
                              <span className="text-[8px] font-black text-slate-500 font-mono">
                                {msg.timestamp ? (msg.timestamp.toDate ? msg.timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})) : 'Just now'}
                              </span>
                            </div>

                            {msg.isAnnouncement ? (
                              <div className="p-4 bg-amber-500/10 border-l-4 border-amber-500 rounded-r-2xl rounded-bl-2xl space-y-2">
                                <div className="flex items-center gap-2 text-amber-500 font-black text-[9px] uppercase tracking-widest">
                                  <Volume2 size={12} className="animate-pulse" /> Broadcast Announcement
                                </div>
                                <p className="text-xs text-white font-semibold leading-relaxed">
                                  {highlightText(msg.text)}
                                </p>
                                {msg.mediaUrl && (
                                  <div className="mt-2.5 overflow-hidden rounded-xl border border-slate-800">
                                    <img 
                                      src={msg.mediaUrl} 
                                      alt="Announcement media" 
                                      referrerPolicy="no-referrer"
                                      className="max-h-[160px] object-cover w-full cursor-pointer hover:scale-[1.03] transition-all" 
                                    />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className={`p-3 rounded-2xl space-y-2 ${isSelf ? 'bg-slate-800 border border-slate-700/60 text-slate-100 rounded-tr-none' : 'bg-slate-950/60 border border-slate-900 text-slate-300 rounded-tl-none'}`}>
                                <p className="text-[11.5px] leading-relaxed font-semibold break-words">
                                  {highlightText(msg.text)}
                                </p>
                                {msg.mediaUrl && (
                                  <div className="mt-2.5 max-w-[240px] overflow-hidden rounded-xl border border-slate-800">
                                    <img 
                                      src={msg.mediaUrl} 
                                      alt="Lounge media" 
                                      referrerPolicy="no-referrer"
                                      className="object-contain w-full cursor-pointer hover:scale-[1.03] transition-all" 
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Attachment indicator bar if present */}
                  {loungeMediaUrl && (
                    <div className="px-6 py-2 bg-slate-950 border-t border-slate-900 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-800">
                          <img src={loungeMediaUrl} alt="Thumbnail preview" className="object-cover w-full h-full" referrerPolicy="no-referrer" />
                        </div>
                        <span className="text-[9px] font-black text-amber-500 uppercase tracking-wider">Image Attachment Attached</span>
                      </div>
                      <button 
                        onClick={() => setLoungeMediaUrl('')}
                        className="text-[9px] font-black text-slate-400 hover:text-white uppercase tracking-widest border border-slate-800 hover:border-slate-700 px-3 py-1 rounded-xl transition-all cursor-pointer bg-transparent"
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  {/* Message Composer Area */}
                  <form onSubmit={handleSendLoungeMessage} className="p-5 border-t border-slate-900 bg-slate-950/40 space-y-4">
                    
                    {/* Floating helper mentions */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider mr-1">Tag:</span>
                      {['Owner', 'Operations', 'Verification', 'Finance', 'Support', 'all'].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setLoungeText(prev => prev + `@${m} `)}
                          className="px-2.5 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-white rounded-lg text-[8.5px] font-mono transition-all cursor-pointer"
                        >
                          @{m}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-3">
                      
                      {/* Paperclip upload button */}
                      <div className="relative flex-none">
                        <input 
                          type="file" 
                          ref={loungeFileInputRef}
                          className="hidden" 
                          accept="image/*" 
                          onChange={handleLoungeFileUpload} 
                        />
                        <button 
                          type="button"
                          onClick={() => loungeFileInputRef.current?.click()}
                          disabled={isLoungeUploading}
                          className={`w-11 h-11 rounded-2xl bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white border border-slate-900 hover:border-slate-800 flex items-center justify-center transition-all cursor-pointer ${isLoungeUploading ? 'opacity-50' : ''}`}
                        >
                          <Paperclip size={16} className={isLoungeUploading ? 'animate-pulse text-amber-500' : ''} />
                        </button>
                      </div>

                      {/* Message Input field */}
                      <div className="flex-1">
                        <input 
                          type="text"
                          placeholder={isLoungeUploading ? `Uploading progress: ${loungeProgress}%...` : "Transmit secure broadcast..."}
                          value={loungeText}
                          onChange={(e) => setLoungeText(e.target.value)}
                          disabled={isLoungeUploading}
                          className="w-full bg-slate-950 border border-slate-900 rounded-2xl px-5 py-3.5 text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all font-sans"
                        />
                      </div>

                      {/* Send button */}
                      <button 
                        type="submit"
                        disabled={isLoungeUploading || (!loungeText.trim() && !loungeMediaUrl)}
                        className={`px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        <Send size={12} />
                        Transmit
                      </button>
                    </div>

                    {/* Announcement toggle box */}
                    {(userProfile?.role === 'FRANCHISE_OWNER' || userProfile?.specialization === 'SUPPORT_STAFF') && (
                      <div className="flex items-center gap-2 pl-1 select-none">
                        <input 
                          type="checkbox" 
                          id="announcement-chk"
                          checked={loungeAnnouncement}
                          onChange={(e) => setLoungeAnnouncement(e.target.checked)}
                          className="rounded border-slate-850 bg-slate-950 text-amber-500 focus:ring-amber-500 cursor-pointer w-4 h-4"
                        />
                        <label 
                          htmlFor="announcement-chk"
                          className="text-[9.5px] font-black text-slate-400 hover:text-slate-300 uppercase tracking-widest cursor-pointer"
                        >
                          📢 Elevate message as High-Alert Board Announcement
                        </label>
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Franchise Settings and Controls Tab */}
          {activeTab === 'SETTINGS' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-black italic text-white uppercase tracking-wider">Franchise Management & Executive Controls</h3>
                <p className="text-[10px] font-bold text-slate-400">Perform direct regional status adjustments, or propose structured corporate ownership transfers.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Status Toggle Card */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6.5 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                      <Power size={14} className="text-rose-50 animate-pulse" /> Self-Imposed Operational Pause
                    </h4>
                    <p className="text-[10.5px] leading-relaxed text-slate-400 font-semibold">
                      Toggling status places this franchise region under administrative sleep. All connected media devices will halt display playbacks and driver earnings calculations immediately.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950/60 border border-slate-900 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[8px] font-black text-slate-500 tracking-wider uppercase block mb-1">Current Franchise State</span>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${franchiseDoc?.status === 'ACTIVE' ? 'text-emerald-400' : 'text-amber-500'}`}>
                        ● {franchiseDoc?.status || 'ACTIVE'}
                      </span>
                    </div>

                    <button 
                      type="button"
                      onClick={handleToggleFranchiseStatus}
                      className={`px-4.5 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 shadow-md cursor-pointer ${
                        franchiseDoc?.status === 'ACTIVE' 
                          ? 'bg-rose-950/40 hover:bg-rose-500 text-rose-450 hover:text-slate-950 border border-rose-900/35 hover:border-transparent' 
                          : 'bg-emerald-900/30 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/25 hover:border-transparent'
                      }`}
                    >
                      {franchiseDoc?.status === 'ACTIVE' ? 'Deactivate / Suspend Franchise' : 'Initiate Active Duty'}
                    </button>
                  </div>
                </div>

                {/* Ownership Transfer Card */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6.5 space-y-4">
                  <div>
                    <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                      <Key size={14} className="text-amber-500" /> Executive Ownership Transfer
                    </h4>
                    <p className="text-[10.5px] leading-relaxed text-slate-400 font-semibold">
                      Transferring ownership delegates full franchise privileges to a new executive partner. Once validated, your access token is revoked and transferred.
                    </p>
                  </div>

                  <form onSubmit={handleTransferOwnership} className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <label className="text-[8px] font-black tracking-widest uppercase text-slate-400 block mb-1">New Exec Name</label>
                        <input 
                          type="text" 
                          required 
                          placeholder="Vikram Shah" 
                          value={transferName}
                          onChange={e => setTransferName(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-amber-500 focus:outline-none transition-all font-semibold text-xs text-slate-200" 
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-black tracking-widest uppercase text-slate-400 block mb-1">New Exec Email</label>
                        <input 
                          type="email" 
                          required 
                          placeholder="vikram@autoads.in" 
                          value={transferEmail}
                          onChange={e => setTransferEmail(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-amber-500 focus:outline-none transition-all font-semibold text-xs text-slate-200" 
                        />
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      className="w-full py-4 bg-slate-950 hover:bg-amber-500 text-amber-500 hover:text-slate-950 border border-amber-500/20 hover:border-transparent rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg cursor-pointer"
                    >
                      Process Ownership Transfer Sequence & Lock Link
                    </button>
                  </form>
                </div>

              </div>
            </div>
          )}

        </main>
      </div>

      {/* Ticket Upload Modal */}
      <AnimatePresence>
        {showTicketModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-indigo-950/80 border border-indigo-500/30 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="px-6 py-5 border-b border-indigo-900/50 flex justify-between items-center bg-indigo-900/20">
                <h3 className="text-sm font-black text-white italic uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle size={16} className="text-indigo-400" />
                  Escalate Issue to Global Support
                </h3>
                <button onClick={() => setShowTicketModal(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-900/50 text-slate-400 hover:text-white transition-all cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[70vh]">
                <form id="franchise-ticket-form" onSubmit={handleRaiseTicket} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black tracking-widest text-indigo-300 uppercase">Issue Subject / Category</label>
                    <input 
                      type="text"
                      className="w-full bg-slate-900/50 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                      placeholder="e.g., Payout Delay, Technical Glitch, Supply Request"
                      value={newTicket.subject}
                      onChange={e => setNewTicket({...newTicket, subject: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black tracking-widest text-indigo-300 uppercase">Issue Priority</label>
                    <select
                      className="w-full bg-slate-900/50 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium appearance-none"
                      value={newTicket.priority}
                      onChange={e => setNewTicket({...newTicket, priority: e.target.value})}
                    >
                      <option value="LOW">Low - General Inquiry</option>
                      <option value="MEDIUM">Medium - Performance Impacts</option>
                      <option value="HIGH">High - Urgent / Critical Error</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black tracking-widest text-indigo-300 uppercase">Issue Description / Logs</label>
                    <textarea 
                      className="w-full bg-slate-900/50 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium resize-none"
                      placeholder="Please fully detail your issue to help Global Support respond effectively..."
                      rows={5}
                      value={newTicket.message}
                      onChange={e => setNewTicket({...newTicket, message: e.target.value})}
                      required
                    />
                  </div>
                </form>
              </div>

              <div className="px-6 py-5 border-t border-indigo-900/50 bg-slate-950 flex gap-3">
                <button type="button" onClick={() => setShowTicketModal(false)} className="flex-1 py-3 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl transition-all cursor-pointer">
                  Cancel
                </button>
                <button type="submit" form="franchise-ticket-form" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/20 text-xs font-black uppercase tracking-widest transition-all cursor-pointer">
                  Escalate Request
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invitation and Ownership Claim Modal */}
      <AnimatePresence>
        {showInviteModal && inviteModalData && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-amber-500/30 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
                <h3 className="text-xs font-black text-white italic uppercase tracking-wider flex items-center gap-2">
                  <UserCheck size={16} className="text-amber-500" />
                  Invitation Credentials Generated
                </h3>
                <button onClick={() => setShowInviteModal(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-950/50 text-slate-400 hover:text-white transition-all cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs font-medium text-slate-300">
                <p>
                  Copy and distribute the credentials below to the onboarding personnel (<span className="text-white font-bold">{inviteModalData.email}</span>). 
                  They must visit the link and enter the claim code to verify.
                </p>

                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4.5 space-y-3 font-mono text-[11px] select-all">
                  <div>
                    <span className="text-[8px] font-black text-slate-500 block uppercase tracking-wider font-sans mb-1">Onboarding Role</span>
                    <span className="text-amber-500 font-bold text-xs font-sans uppercase">
                      {inviteModalData.role === 'FRANCHISE_STAFF' ? `FRANCHISE STAFF (${inviteModalData.specialization?.replace('_', ' ')})` : 'FRANCHISE OWNER'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[8px] font-black text-slate-500 block uppercase tracking-wider font-sans mb-1">Onboarding Claim Code</span>
                    <span className="text-white font-extrabold text-sm tracking-wider">{inviteModalData.code || 'INV-CODE-ERR'}</span>
                  </div>

                  <div>
                    <span className="text-[8px] font-black text-slate-500 block uppercase tracking-wider font-sans mb-1">Onboarding Claim URL Path</span>
                    <span className="text-slate-400 font-semibold break-all text-[10px]">{inviteModalData.claimUrl || '/register'}</span>
                  </div>
                </div>

                <div className="p-3 bg-indigo-950/30 border border-indigo-900/30 rounded-xl text-[10px] text-indigo-300">
                  ⚠️ For strict security, are you sure this is the intended recipient? Unclaimed invitations expire or can be self-deactivated.
                </div>
              </div>

              <div className="px-6 py-5 border-t border-slate-800 bg-slate-950 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => {
                    navigator.clipboard.writeText(`Role: ${inviteModalData.role}\nCode: ${inviteModalData.code}\nLink: ${window.location.origin}${inviteModalData.claimUrl}`);
                    showToast('Invitation payload copied to clipboard!');
                    setShowInviteModal(false);
                  }} 
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-widest transition-all cursor-pointer shadow-md"
                >
                  Copy Fully Formatted Link Payload
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
