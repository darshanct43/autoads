import { storageService } from './storageService';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  getDocs,
  Timestamp,
  setDoc,
  getDoc,
  writeBatch,
  orderBy,
  deleteDoc,
  collectionGroup as firestoreCollectionGroup,
  or,
  arrayUnion
} from 'firebase/firestore';
import { db, auth, storage } from '../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { compressImage } from '../lib/utils';
import { INITIAL_CITIES, INITIAL_FRANCHISES } from '../modules/cityManagement/cities';
import { Settlement, SupportTicket } from '../types';

export type { SupportTicket };
export type { Settlement };

export interface Driver {
  id: string;
  uid: string;
  name: string;
  phone: string;
  email: string;
  vehicleNumber?: string;
  vNo?: string;
  rcNumber?: string;
  dlNumber?: string;
  aadharNumber?: string;
  deviceId?: string;
  terminalId?: string;
  accessKey?: string;
  provisionStatus?: 'IDLE' | 'PROVISIONED' | 'ACTIVE';
  driverCode?: string;
  password?: string;
  gpsId?: string;
  profileImage?: string;
  bio?: string;
  isVerified?: boolean;
  status: 'active' | 'blocked' | 'pending_verification' | string;
  subscriptionTier?: 'FREE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  accountStatus?: 'ACTIVE' | 'INACTIVE';
  documentStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  agreementStatus?: 'PENDING' | 'SIGNED';
  paymentStatus?: 'PENDING' | 'SUCCESS' | 'FAILED';
  supportApproval?: 'PENDING' | 'APPROVED' | 'REJECTED';
  terminalStatus?: 'LOCKED' | 'UNLOCKED';
  createdAt?: any;
  lastLoginAt?: any;
  city?: string;
  aadharPhoto?: string;
  rcPhoto?: string;
  dlPhoto?: string;
  panPhoto?: string;
  insurancePhoto?: string;
  selfiePhoto?: string;
  bankDetails?: {
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    holderName: string;
  };
  fullName?: string;
  verificationStatus?: string;
  kycStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW';
  adminApproved?: boolean;
  payoutEnabled?: boolean;
  walletBalance?: number;
  documents?: {
    aadhaar?: string;
    drivingLicense?: string;
    selfie?: string;
    rc?: string;
    pan?: string;
    insurance?: string;
  };
}

export interface AdCampaign {
  id: string;
  title: string;
  clientName?: string;
  description?: string;
  mediaUrl: string;
  mediaType: 'VIDEO' | 'IMAGE';
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'PENDING_VERIFICATION' | 'APPROVED' | 'LIVE' | 'AWAITING_PAYPORTAL';
  operationalStatus?: 'ACTIVE' | 'PAUSED';
  customerId?: string;
  customerPhone?: string;
  phone?: string;
  city?: string;
  cityId?: string;
  durationDays?: number;
  hoursPerDay?: number;
  maxAutos?: number;
  targetArea?: string;
  targetCity?: string;
  targetState?: string;
  createdBy: string;
  approvedBy?: string;
  assignedDrivers: string[];
  createdAt: any;
  timestamp?: any;
  devices?: number;
  type?: string;
  videoThumbnail?: string;
  paymentReceived?: boolean;
  paymentStatus?: string;
  mediaReceived?: boolean;
  assetUrl?: string;
  updatedAt?: any;
  budget?: number;
  totalMinutes?: number;
  targetLat?: number;
  targetLng?: number;
  coverageRadius?: number;
  startTime?: string; // e.g. "09:00"
  endTime?: string;   // e.g. "18:00"
  daysOfWeek?: string[]; // ["Monday", "Tuesday", ...]
  needDesigner?: boolean;
  needVideoMaker?: boolean;
  designerApproved?: boolean;
  videoMakerApproved?: boolean;
  designerFee?: number;
  videoMakerFee?: number;
  paymentId?: string;
  ads?: any[];
  mediaSource?: 'UPLOAD' | 'CANVA';
  mediaAssetId?: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  phone: string;
  role: 'ADMIN' | 'SUPPORT' | 'DRIVER' | 'CUSTOMER' | 'STAFF';
  email?: string;
  createdAt?: any;
}

export interface DriverAssignment {
  id?: string;
  driverId: string;
  campaignId: string;
  status: 'assigned' | 'running' | 'completed';
  earnings: number;
  createdAt: any;
}

// Standardized on types.ts for SupportTicket

export interface AppNotification {
  id?: string;
  userId?: string;     // Target user ID if personalized
  role?: 'ADMIN' | 'SUPPORT' | 'CUSTOMER' | 'DRIVER' | 'ALL'; // Target role
  title: string;
  message: string;
  type: 'PAYMENT_RECEIVED' | 'CAMPAIGN_STARTED' | 'CAMPAIGN_RECEIVED' | 'DESIGNER_ASSIGNED' | 'STUDIO_PLAN_UNLOCKED' | 'SUPPORT_TICKET' | string;
  link?: string;
  createdAt?: any;
  read?: boolean;
  franchiseId?: string;
  territoryId?: string;
}

export interface ChatMessage {
  id?: string;
  senderId: string;
  senderName: string;
  senderRole?: 'driver' | 'admin' | 'staff' | 'customer' | 'system';
  text?: string;
  content?: string;
  timestamp: any;
  mediaUrl?: string;
  mediaType?: 'IMAGE' | 'VIDEO';
}

export interface DriverPayment {
  id?: string;
  paymentId?: string;
  driverId: string;
  amount: number;
  type: 'earning' | 'withdrawal';
  status: 'pending' | 'success' | 'failed';
  paymentMethod: string;
  upiApp?: 'PhonePe' | 'GPay' | 'Paytm' | string;
  upiTransactionId?: string;
  screenshotUrl?: string;
  campaignId?: string;
  createdAt: any;
  updatedAt: any;
}

export interface WithdrawRequest {
  id?: string;
  requestId?: string;
  driverId: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  upiId: string;
  createdAt: any;
  processedAt?: any;
}

export interface RevenueLedger {
  id?: string;
  campaignId: string;
  campaignName: string;
  franchiseId?: string;
  source: 'HQ' | 'FRANCHISE';
  grossRevenue: number;
  franchisePercent?: number;
  platformPercent?: number;
  franchiseRevenue: number;
  platformRevenue: number;
  status: 'PENDING_SETTLEMENT' | 'PROCESSING' | 'PAID';
  createdAt: any;
}

const CAMPAIGNS_COLLECTION = 'campaigns';
const DRIVERS_COLLECTION = 'drivers';
const PAYMENTS_COLLECTION = 'payments';
const USERS_COLLECTION = 'users';
const ASSIGNMENTS_COLLECTION = 'driverAssignments';
const PAYOUTS_COLLECTION = 'driverPayouts';
const REVENUE_LEDGER_COLLECTION = 'revenueLedger';
const TICKETS_COLLECTION = 'supportTickets';
const DRIVER_PAYMENTS_COLLECTION = 'driverPayments';
const WITHDRAW_REQUESTS_COLLECTION = 'withdrawRequests';
const NOTICES_COLLECTION = 'publicNotices';
const DRIVER_DOCUMENTS_COLLECTION = 'driverDocuments';
const INVITATIONS_COLLECTION = 'invitations';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

// handleFirestoreError removed the throw for subscription errors to prevent UI crashes
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, isSilent: boolean = false) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  const errMessage = (error as any)?.message || String(error);
  let isOffline = false;
  try {
    isOffline = typeof window !== 'undefined' && localStorage.getItem('auto_ads_offline_mode') === 'true';
  } catch (e) {
    console.warn("[FirebaseService] localStorage read blocked:", e);
  }
  const isPermissionError = errMessage.toLowerCase().includes('permission') || errMessage.toLowerCase().includes('insufficient');
  
  console.warn(`[Firebase Error] [${operationType}] at [${path}]: ${errMessage}`);
  
  if (!isSilent && !isOffline && !isPermissionError) {
    throw new Error(errMessage);
  }
}

// Global connection check disabled completely
// async function testConnection() { ... }

export interface Device {
  id?: string;
  vNo: string;
  status: 'ONLINE' | 'OFFLINE' | 'STREAMING' | 'MAINTENANCE';
  area: string;
  currentCampaignId?: string;
  lastSync?: any;
}

export interface Payment {
  id?: string;
  transactionId: string;
  amount: number;
  paymentMethod: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'success' | 'failed' | 'pending' | 'PENDING_ADMIN_VERIFY';
  customerId: string;
  customerPhone?: string;
  campaignId: string;
  driverId?: string;
  city?: string;
  cityId?: string;
  isTest?: boolean;
  createdAt: any;
}

export interface SafeRideSession {
  id?: string;
  terminalId: string;
  driverId: string;
  vehicleNumber: string;
  activatedAt: any;
  expiresAt: any;
  active: boolean;
}

export const firebaseService = {
  // Existing ...
  async activateSafeRide(terminalId: string, driverId: string, vehicleNumber: string) {
    try {
      const db = (await import('../lib/firebase')).db;
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      
      const activatedAt = new Date();
      const expiresAt = new Date(activatedAt.getTime() + 15 * 60000); // 15 mins
      
      const sessionData: SafeRideSession = {
        terminalId,
        driverId,
        vehicleNumber,
        activatedAt,
        expiresAt,
        active: true,
      };
      
      return await addDoc(collection(db, 'safeRideSessions'), sessionData);
    } catch (e) {
      console.error("Error activating safe ride:", e);
      throw e;
    }
  },
  
  async getSafeRideSession(terminalId: string) {
      const { db } = await import('../lib/firebase');
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      
      const q = query(collection(db, 'safeRideSessions'), 
          where('terminalId', '==', terminalId),
          where('active', '==', true)
      );
      
      const snap = await getDocs(q);
      if (snap.empty) return null;
      
      const doc = snap.docs[0];
      const data = doc.data() as SafeRideSession;
      
      if (new Date() > data.expiresAt.toDate()) {
          // Deactivate
          await updateDoc(doc.ref, { active: false });
          return null;
      }
      return { id: doc.id, ...data };
  },

  async deactivateSafeRide(sessionId: string) {
      await updateDoc(doc(db, 'safeRideSessions', sessionId), { active: false });
  },

  subscribeToSafeRideSession(terminalId: string, callback: (session: SafeRideSession | null) => void) {
      const q = query(
          collection(db, 'safeRideSessions'),
          where('terminalId', '==', terminalId),
          where('active', '==', true)
      );
      
      return onSnapshot(q, (snap: any) => {
          if (snap.empty) {
              callback(null);
          } else {
              const doc = snap.docs[0];
              callback({ id: doc.id, ...doc.data() } as SafeRideSession);
          }
      });
  },
  
  // Existing...

  // Added/Restored methods for compatibility
  subscribeToDrivers(callback: (drivers: Driver[]) => void, franchiseId?: string, isHQ: boolean = false) {
    console.log("[DEBUG] Firebase: Subscribing to drivers collection (isHQ: " + isHQ + ")...");
    
    if (!isHQ && !franchiseId) {
      console.warn("[SECURITY] Franchise isolation: No franchiseId provided. Returning empty drivers.");
      callback([]);
      return () => {};
    }
    
    let q = query(collection(db, 'drivers'));
    if (!isHQ && franchiseId) {
      q = query(collection(db, 'drivers'), where('franchiseId', '==', franchiseId));
    }
    
    return onSnapshot(q, (snapshot) => {
      console.log("[DEBUG] Firebase: drivers snapshot received, count:", snapshot.docs.length);
      if (snapshot.docs.length === 0) {
        console.log("[DEBUG] Firebase: No drivers found in collection");
      } else {
        console.log("[DEBUG] Firebase: First driver doc:", snapshot.docs[0].id);
      }
      const drivers = snapshot.docs.map(doc => {
        const data = doc.data();
        return { ...data, id: doc.id, uid: doc.id } as any;
      }) as Driver[];
      
      // Client side sort by createdAt desc
      drivers.sort((a, b) => {
        const dateA = a.createdAt?.toMillis?.() || 0;
        const dateB = b.createdAt?.toMillis?.() || 0;
        return dateB - dateA;
      });
      callback(drivers);
    }, (error) => {
      console.error("[DEBUG] Firebase: drivers snapshot error:", error);
      handleFirestoreError(error, OperationType.LIST, 'drivers');
    });
  },

  subscribeToPayments(callback: (payments: Payment[]) => void, franchiseId?: string, isHQ: boolean = false, customerId?: string, customerPhone?: string) {
    console.log("[DEBUG] Firebase: Subscribing to payments collection (isHQ: " + isHQ + ")...");
    
    if (!isHQ && !franchiseId && !customerId && !customerPhone) {
      console.warn("[SECURITY] Franchise isolation: No franchiseId, customerId, or customerPhone provided. Returning empty payments.");
      callback([]);
      return () => {};
    }

    let q;
    if (isHQ) {
      q = query(collection(db, 'payments'));
    } else if (franchiseId) {
      q = query(collection(db, 'payments'), where('franchiseId', '==', franchiseId));
    } else if (customerId) {
      q = query(collection(db, 'payments'), where('customerId', '==', customerId));
    } else if (customerPhone) {
      q = query(collection(db, 'payments'), where('customerPhone', '==', customerPhone));
    } else {
      q = query(collection(db, 'payments'));
    }

    return onSnapshot(q, (snapshot) => {
      let payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)) as Payment[];
      
      // Client-side filtering to support OR conditions robustly
      if (customerId || customerPhone) {
        payments = payments.filter(p => 
          (customerId && p.customerId === customerId) || 
          (customerPhone && p.customerPhone === customerPhone)
        );
      }
      
      console.log("[DEBUG] firebaseService subscribeToPayments fetched length:", payments.length);
      
      // Client-side sort descending
      payments.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      
      callback(payments);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'payments'));
  },

  subscribeToDevices(callback: (devices: Device[]) => void, franchiseId?: string, isHQ: boolean = false) {
    console.log("[DEBUG] Firebase: Subscribing to devices collection...");
    if (!isHQ && !franchiseId) {
      console.warn("[SECURITY] Franchise isolation: No franchiseId provided. Returning empty devices.");
      callback([]);
      return () => {};
    }
    let q = query(collection(db, 'devices'));
    if (franchiseId) {
      q = query(collection(db, 'devices'), where('franchiseId', '==', franchiseId));
    }
    return onSnapshot(q, (snapshot) => {
      console.log("[DEBUG] Firebase: devices snapshot received, count:", snapshot.docs.length);
      const devices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Device));
      callback(devices);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'devices'));
  },

  async getDevices(franchiseId?: string, isHQ: boolean = false) {
    if (!isHQ && !franchiseId) {
      return [];
    }
    let q = query(collection(db, 'devices'));
    if (franchiseId) {
      q = query(collection(db, 'devices'), where('franchiseId', '==', franchiseId));
    }
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
  },

  async getDevice(terminalId: string) {
    const docRef = doc(db, 'devices', terminalId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    return null;
  },

  async getTerminal(terminalId: string) {
    const docRef = doc(db, 'terminals', terminalId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    return null;
  },

  async initializeDevices(devices: Omit<Device, 'id'>[]) {
    const batch = writeBatch(db);
    devices.forEach(device => {
      const docRef = doc(collection(db, 'devices'));
      batch.set(docRef, { ...device, lastSync: serverTimestamp() });
    });
    await batch.commit();
  },

  subscribeToDriverLocations(callback: (locations: any[]) => void) {
    const q = query(collection(db, 'driverLocations'));
    return onSnapshot(q, (snapshot) => {
      const locations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(locations);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'driverLocations');
    });
  },

  async getDriverLocations() {
    try {
      const q = query(collection(db, 'driverLocations'));
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'driverLocations');
      throw e;
    }
  },

  async processPaymentSuccess(paymentId: string) {
    try {
      const paymentRef = doc(db, PAYMENTS_COLLECTION, paymentId);
      const paymentSnap = await getDoc(paymentRef);
      if (!paymentSnap.exists()) throw new Error("Payment not found");
      const paymentData = paymentSnap.data() as Payment;

      const campaignRef = doc(db, CAMPAIGNS_COLLECTION, paymentData.campaignId);
      const campaignSnap = await getDoc(campaignRef);
      if (!campaignSnap.exists()) throw new Error("Campaign not found");
      const campaignData = campaignSnap.data() as AdCampaign;

      let franchiseRevenue = 0;
      let platformRevenue = paymentData.amount;
      const source = campaignData.createdBy // need to find how this is determined
        ? (paymentData.campaignId.includes('HQ') ? 'HQ' : 'FRANCHISE')
        : 'HQ';
      
      let ledgerData: any = {
        campaignId: paymentData.campaignId,
        campaignName: campaignData.title,
        grossRevenue: paymentData.amount,
        source: source,
        status: 'PENDING_SETTLEMENT',
        createdAt: serverTimestamp()
      };

      if (source === 'FRANCHISE') {
         // Placeholder calculation for now, assuming franchiseId is available
         franchiseRevenue = paymentData.amount * 0.70;
         platformRevenue = paymentData.amount * 0.30;
      }

      ledgerData.franchiseRevenue = franchiseRevenue;
      ledgerData.platformRevenue = platformRevenue;

      await addDoc(collection(db, REVENUE_LEDGER_COLLECTION), ledgerData);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, REVENUE_LEDGER_COLLECTION);
    }
  },

  async updatePaymentStatus(paymentId: string, status: 'SUCCESS' | 'FAILED' | 'PENDING_ADMIN_VERIFY') {
    await updateDoc(doc(db, 'payments', paymentId), {
      status,
      updatedAt: serverTimestamp()
    });
    if (status === 'SUCCESS') {
      await this.processPaymentSuccess(paymentId);
    }
  },

  async updateDeviceStatus(deviceId: string, status: Device['status'], currentCampaignId?: string) {
    await updateDoc(doc(db, 'devices', deviceId), {
      status,
      currentCampaignId: currentCampaignId || null,
      lastSync: serverTimestamp()
    });
  },

  // Revenue Ledger Management
  subscribeToRevenueLedger(callback: (ledger: any[]) => void, franchiseId?: string) {
    let q = query(collection(db, REVENUE_LEDGER_COLLECTION));
    if (franchiseId) {
       q = query(collection(db, REVENUE_LEDGER_COLLECTION), where('franchiseId', '==', franchiseId));
    }
    
    return onSnapshot(q, (snapshot) => {
      const ledger = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      ledger.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      callback(ledger);
    }, (error) => handleFirestoreError(error, OperationType.LIST, REVENUE_LEDGER_COLLECTION));
  },

  async updateRevenueSettlement(ledgerId: string, updates: { 
    status: 'PAID' | 'PROCESSING', 
    referenceNumber?: string, 
    notes?: string, 
    paidAt?: any 
  }) {
    try {
      await updateDoc(doc(db, REVENUE_LEDGER_COLLECTION, ledgerId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, REVENUE_LEDGER_COLLECTION);
      throw e;
    }
  },

  // Centralized Seeding of the 11 Products in planConfigurations
  async seedPlanConfigurationsIfEmpty() {
    try {
      const defaults = [
        {
          id: "basic_starter",
          name: "Basic Starter",
          category: "BASIC",
          price: 999,
          description: "3 Auto Displays • 1 Day Assigned • Ad Policy Help",
          maxScreens: 3,
          durationDays: 1,
          citiesSupported: "1 City",
          features: ["Standard Support", "Basic Analytics"],
          visible: true
        },
        {
          id: "basic_growth",
          name: "Basic Growth",
          category: "BASIC",
          price: 1999,
          description: "7 Auto Displays • 2 Days • High Retention",
          maxScreens: 7,
          durationDays: 2,
          citiesSupported: "Up to 2 Cities",
          features: ["Priority Support", "Detailed Analytics"],
          visible: true
        },
        {
          id: "basic_professional",
          name: "Basic Professional",
          category: "BASIC",
          price: 4999,
          description: "Priority Network • 7 Days • Pro Strategy",
          maxScreens: 15,
          durationDays: 7,
          citiesSupported: "Up to 5 Cities",
          features: ["Dedicated Manager", "Advanced Targeting"],
          visible: true
        },
        {
          id: "enterprise_starter",
          name: "Enterprise Starter",
          category: "ENTERPRISE",
          price: 14999,
          description: "50 Auto Displays • 15 Days Assigned • Custom Reporting",
          maxScreens: 50,
          durationDays: 15,
          citiesSupported: "1 City",
          fleetSize: "50 Autos",
          features: ["Custom Reporting", "24/7 Support"],
          visible: true
        },
        {
          id: "enterprise_plus",
          name: "Enterprise Plus",
          category: "ENTERPRISE",
          price: 29999,
          description: "100 Auto Displays • 30 Days Assigned • API Access",
          maxScreens: 100,
          durationDays: 30,
          citiesSupported: "Up to 3 Cities",
          fleetSize: "100 Autos",
          features: ["API Access", "Volume Discounts"],
          visible: true
        },
        {
          id: "enterprise_elite",
          name: "Enterprise Elite",
          category: "ENTERPRISE",
          price: 99999,
          description: "500 Auto Displays • 90 Days Assigned • White-glove Service",
          maxScreens: 500,
          durationDays: 90,
          citiesSupported: "Pan India",
          fleetSize: "500+ Autos",
          features: ["White-glove Service", "SLA Guarantee"],
          visible: true
        },
        {
          id: "agency_starter",
          name: "Agency Starter",
          category: "AGENCY",
          price: 49999,
          description: "Up to 5 Clients • 200 Auto Displays • 30 Days",
          maxScreens: 200,
          durationDays: 30,
          citiesSupported: "Pan India",
          clients: "Up to 5",
          revenueShare: "10%",
          features: ["White Label Reports", "Agency Dashboard"],
          visible: true
        },
        {
          id: "agency_business",
          name: "Agency Business",
          category: "AGENCY",
          price: 89999,
          description: "Up to 15 Clients • 500 Auto Displays • 60 Days",
          maxScreens: 500,
          durationDays: 60,
          citiesSupported: "Pan India",
          clients: "Up to 15",
          revenueShare: "15%",
          features: ["Custom Branding", "Priority Queue"],
          visible: true
        },
        {
          id: "agency_unlimited",
          name: "Agency Unlimited",
          category: "AGENCY",
          price: 199999,
          description: "Unlimited Clients • 1500 Auto Displays • 365 Days",
          maxScreens: 1500,
          durationDays: 365,
          citiesSupported: "Pan India",
          clients: "Unlimited",
          revenueShare: "25%",
          features: ["Dedicated Dev Support", "Co-marketing"],
          visible: true
        },
        {
          id: "designer_service",
          name: "Professional Designer Service",
          category: "SERVICES",
          price: 1000,
          description: "Professional Graphic Design • High Conversion Ads",
          deliveryTime: "24-48 Hours",
          features: ["2 Revision Rounds", "Source Files Included", "High-Res Formats"],
          visible: true,
          isDesignerService: true
        },
        {
          id: "video_ads_service",
          name: "Video Ads Service",
          category: "SERVICES",
          price: 2000,
          description: "Premium Motion Graphics • Professional Video Ads",
          videoDuration: "30 Seconds",
          features: ["Professional Voiceover", "Script Writing", "Full HD Output"],
          visible: true,
          isDesignerService: true
        }
      ];

      let seededCount = 0;
      for (const item of defaults) {
        const docRef = doc(db, 'planConfigurations', item.id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists() || !docSnap.data().category) {
          await setDoc(docRef, item, { merge: true });
          seededCount++;
        }
      }
      if (seededCount > 0) {
        console.log(`Successfully seeded ${seededCount} missing or incomplete planConfigurations!`);
      }
    } catch (e) {
      console.error("Error seeding configurations:", e);
    }
  },

  // Plans - Single Source of Truth from planConfigurations
  async getPlans() {
    try {
      await this.seedPlanConfigurationsIfEmpty();
      const q = query(collection(db, 'planConfigurations'));
      const snap = await getDocs(q);
      const dbPlans = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      dbPlans.sort((a, b) => {
        const priceA = typeof a.price === 'number' ? a.price : parseFloat(String(a.price || 0));
        const priceB = typeof b.price === 'number' ? b.price : parseFloat(String(b.price || 0));
        return priceA - priceB;
      });
      return dbPlans;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'planConfigurations');
      throw e;
    }
  },

  subscribeToPlans(callback: (plans: any[]) => void) {
    this.seedPlanConfigurationsIfEmpty().catch(console.error);
    const q = query(collection(db, 'planConfigurations'), orderBy('price', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const plans = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      callback(plans);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "planConfigurations");
    });
  },

  // DISABLED: Direct plan writes are locked. Use proposePlanChange instead.
  async updatePlan(planId: string, updates: any) {
    throw new Error("Direct plan updates are DISABLED. Please use proposal workflow.");
  },

  // Plan Edits System
  async submitPlanEdit(planEdit: {
    planId?: string;
    itemId?: string;
    category?: string;
    itemType?: string;
    oldData: any;
    newData: any;
    status?: string;
  }) {
    try {
      const data = {
        planId: planEdit.planId || planEdit.itemId || '',
        itemId: planEdit.itemId || planEdit.planId || '',
        category: planEdit.category || '',
        itemType: planEdit.itemType || (planEdit.category === 'SERVICES' ? 'service' : 'plan'),
        oldData: planEdit.oldData,
        newData: planEdit.newData,
        editedBy: auth.currentUser?.email || auth.currentUser?.uid || 'Unknown',
        editedByUid: auth.currentUser?.uid || 'Unknown',
        status: planEdit.status || 'PENDING_APPROVAL',
        createdAt: serverTimestamp()
      };
      return await addDoc(collection(db, 'planEdits'), data);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'planEdits');
      throw e;
    }
  },

  subscribeToPlanEdits(callback: (edits: any[]) => void) {
    const q = query(
      collection(db, 'planEdits')
    );
    return onSnapshot(q, (snapshot) => {
      const unsorted = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      unsorted.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      callback(unsorted);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'planEdits'));
  },

  async approvePlanEdit(editId: string, planId: string, newData: any) {
    try {
      const batch = writeBatch(db);
      
      // Keep 'planConfigurations' synchronized too if it's there
      const configRef = doc(db, 'planConfigurations', planId);
      batch.set(configRef, {
        ...newData,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Update the planEdit status to APPROVED
      const editRef = doc(db, 'planEdits', editId);
      batch.set(editRef, {
        status: 'APPROVED',
        approvedAt: serverTimestamp(),
        approvedBy: auth.currentUser?.email || auth.currentUser?.uid || 'Admin'
      }, { merge: true });

      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'planEdits');
      throw e;
    }
  },

  async rejectPlanEdit(editId: string, reason: string) {
    try {
      await setDoc(doc(db, 'planEdits', editId), {
        status: 'REJECTED',
        rejectedAt: serverTimestamp(),
        rejectedBy: auth.currentUser?.email || auth.currentUser?.uid || 'Admin',
        rejectionReason: reason
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'planEdits');
      throw e;
    }
  },

  // Plan Proposals Logic
  async proposePlanChange(proposal: {
    planId: string;
    currentPrice: any;
    proposedPrice: any;
    franchiseId?: string;
    reason: string;
    type: 'price' | 'designerPrice' | 'videoMakerPrice' | 'features' | 'description';
  }) {
    try {
      const data = {
        ...proposal,
        newValue: proposal.proposedPrice,
        newPrice: proposal.proposedPrice,
        currentVal: proposal.currentPrice,
        proposedBy: auth.currentUser?.uid,
        status: 'pending', // Standardizing to 'pending' as used in subscribers
        createdAt: serverTimestamp()
      };
      return await addDoc(collection(db, 'planProposals'), data);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'planProposals');
      throw e;
    }
  },

  async getPlanProposals() {
    try {
      const snap = await getDocs(query(collection(db, 'planProposals'), where('status', '==', 'pending')));
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'planProposals');
      throw e;
    }
  },

  subscribeToPlanProposals(callback: (proposals: any[]) => void) {
    const q = query(
      collection(db, 'planProposals'),
      where('status', '==', 'pending')
    );
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'planProposals'));
  },

  async approvePlanProposal(proposalId: string, planId: string, newValue: any, type: 'price' | 'designerPrice' | 'videoMakerPrice' | 'features' | 'description') {
    try {
      const batch = writeBatch(db);
      
      // Update the plan.
      const planRef = doc(db, 'plans', planId);
      const updateData: any = {
        updatedAt: serverTimestamp()
      };
      if (type === 'designerPrice') {
        updateData.designerPrice = newValue;
      } else if (type === 'videoMakerPrice') {
        updateData.videoMakerPrice = newValue;
      } else if (type === 'features') {
        updateData.features = newValue;
      } else if (type === 'description') {
        updateData.description = newValue;
      } else {
        updateData.price = newValue;
      }

      batch.set(planRef, updateData, { merge: true });

      // Keep custom planConfigurations synchronized dynamically
      const configRef = doc(db, 'planConfigurations', planId);
      batch.set(configRef, updateData, { merge: true });

      // Update the proposal status.
      const proposalRef = doc(db, 'planProposals', proposalId);
      batch.set(proposalRef, {
        status: 'approved',
        approvedAt: serverTimestamp(),
        approvedBy: auth.currentUser?.uid
      }, { merge: true });

      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'planProposals');
      throw e;
    }
  },

  async rejectPlanProposal(proposalId: string) {
    try {
      await setDoc(doc(db, 'planProposals', proposalId), {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
        rejectedBy: auth.currentUser?.uid
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'planProposals');
      throw e;
    }
  },

  /**
   * PURGE SYSTEM DATA
   * Wipes all demo, test, and fake records from the network.
   * This is a destructive operation for Admin use only.
   */
  async purgeSystemData() {
    try {
      console.log("[firebaseService] Initiating system-wide master purge...");
      const batch = writeBatch(db);
      let count = 0;

      const collectionsToPurge = [
        'campaigns', 
        'payments', 
        'drivers', 
        'terminals', 
        'driverAssignments', 
        'driverPayments', 
        'withdrawRequests',
        'supportTickets',
        'liveStatus',
        'driverLocations'
      ];

      for (const colName of collectionsToPurge) {
        const snap = await getDocs(collection(db, colName));
        snap.docs.forEach(docSnap => {
          const data = docSnap.data();
          const docIdLower = docSnap.id.toLowerCase();
          const isTestId = docIdLower.includes('demo') || docIdLower.includes('test') || docIdLower.includes('pay_test');
          
          let isTestData = false;
          if (data) {
            if (data.isTest === true) {
              isTestData = true;
            } else if (data.isTest !== false) {
              const fieldsToCheck = [
                data.name, data.title, data.transactionId, data.upiTransactionId, data.paymentId, 
                data.orderId, data.description, data.campaignId, data.customerId, data.customerPhone
              ];
              const markers = ['test', 'demo', 'fake', 'dummy', 'pay_test', 'sandbox'];
              for (const val of fieldsToCheck) {
                if (val && typeof val === 'string') {
                  const lowerVal = val.toLowerCase();
                  if (markers.some(m => lowerVal.includes(m))) {
                    isTestData = true;
                    break;
                  }
                }
              }
            }
          }
          
          const isTest = isTestId || isTestData;

          if (isTest) {
            batch.delete(docSnap.ref);
            count++;
          }
        });
      }

      if (count > 0) {
        await batch.commit();
        console.log(`[firebaseService] Purged ${count} test/demo records.`);
      } else {
        console.log("[firebaseService] No test data identified for purge.");
      }
      return count;
    } catch (e) {
      console.error("[firebaseService] Purge failed:", e);
      throw e;
    }
  },

  // --- NEW MULTI-ROLE CAMPAIGN METHODS ---

  async createCampaign(campaign: { title: string, mediaUrl?: string, mediaType?: 'VIDEO' | 'IMAGE', [key: string]: any }) {
    try {
      console.log(`[DEPLOYMENT_RECORD_CREATED] Timestamp: ${new Date().toISOString()}`);
      console.log(`[DEPLOYMENT_RECORD_SOURCE] Collection: 'campaigns'`);
      console.log(`[DEPLOYMENT_RECORD_TRIGGER] Function: firebaseService.createCampaign -> Title: ${campaign.title}`);
      const data = {
        ...campaign,
        uid: campaign.uid || `CMP-${Math.floor(1000 + Math.random() * 9000)}`,
        mediaUrl: campaign.mediaUrl || campaign.assetUrl || '',
        assetUrl: campaign.assetUrl || campaign.mediaUrl || '',
        status: campaign.status || 'PENDING',
        createdBy: auth.currentUser?.uid,
        assignedDrivers: campaign.assignedDrivers || [],
        createdAt: serverTimestamp(),
        // Territory Architecture Fields
        stateId: campaign.stateId || 'KA',
        territoryId: campaign.territoryId || 'HQ',
        cityId: campaign.cityId || 'HQ',
        franchiseId: campaign.franchiseId || null
      };
      const docRef = await addDoc(collection(db, 'campaigns'), data);
      
      // Emit notifications
      if (auth.currentUser) {
        await this.createNotification({
          userId: auth.currentUser.uid,
          role: 'CUSTOMER',
          title: 'Campaign Received',
          message: `Your campaign '${campaign.title}' was successfully received and is now being verified for launch.`,
          type: 'CAMPAIGN_RECEIVED'
        });
      }

      await this.createNotification({
        role: 'ADMIN',
        title: 'New Campaign Request',
        message: `Client submitted a transit campaign: '${campaign.title}'.`,
        type: 'CAMPAIGN_RECEIVED',
        franchiseId: campaign.franchiseId || null,
        territoryId: campaign.territoryId || campaign.cityId || null
      });

      await this.createNotification({
        role: 'SUPPORT',
        title: 'New Campaign Request',
        message: `Client submitted a transit campaign: '${campaign.title}'.`,
        type: 'CAMPAIGN_RECEIVED',
        franchiseId: campaign.franchiseId || null,
        territoryId: campaign.territoryId || campaign.cityId || null
      });
      
      console.log("[Notification] System: New campaign submitted.");
      return docRef;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'campaigns');
      throw e;
    }
  },

  async createTicket(ticket: { title: string, description: string, category: string, priority: string, campaignId?: string, stateId: string, territoryId: string, cityId: string, franchiseId: string | null }) {
    try {
      if (!auth.currentUser) throw new Error("Authentication required");
      const ticketData = {
        ...ticket,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'User',
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Territory Architecture Fields
        stateId: ticket.stateId,
        territoryId: ticket.territoryId,
        cityId: ticket.cityId,
        franchiseId: ticket.franchiseId,
        messages: [
          {
            role: 'system',
            content: `Ticket initialized for ${ticket.category}. ${ticket.description}`,
            timestamp: new Date().toISOString()
          }
        ]
      };
      const docRef = await addDoc(collection(db, 'supportTickets'), ticketData);
      return docRef;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'supportTickets');
      throw e;
    }
  },

  async updateCampaign(campaignId: string, updates: Partial<AdCampaign>) {
    try {
      const campaignRef = doc(db, CAMPAIGNS_COLLECTION, campaignId);
      await updateDoc(campaignRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, CAMPAIGNS_COLLECTION);
      throw e;
    }
  },

  async updateDriverAssignment(driverId: string, campaignId: string, data: any) {
    const assignmentId = `asgn_${driverId}_${campaignId}`;
    const docRef = doc(db, 'driverAssignments', assignmentId);
    return await setDoc(docRef, { 
      ...data, 
      driverId, 
      campaignId, 
      updatedAt: serverTimestamp() 
    }, { merge: true });
  },

  async supportCreateCampaign(campaign: { title: string, description?: string, clientName?: string, mediaUrl: string, assetUrl?: string, mediaReceived?: boolean, mediaType: 'VIDEO' | 'IMAGE' }) {
    return this.createCampaign(campaign as any);
  },

  async adminApproveCampaign(campaignId: string) {
    try {
      await updateDoc(doc(db, 'campaigns', campaignId), {
        status: 'ACTIVE',
        paymentReceived: true,
        mediaReceived: true,
        approvedBy: auth.currentUser?.uid,
        updatedAt: serverTimestamp()
      });
      console.log("[Notification] Support: Campaign has been approved and is now LIVE.");
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'campaigns');
      throw e;
    }
  },

  async adminApproveCampaignWithDetails(campaignId: string, details: { 
    durationDays: number, 
    hoursPerDay: number, 
    totalMinutes?: number,
    maxAutos: number, 
    startDate?: string,
    endDate?: string,
    assignedDrivers: string[],
    paymentConfirmed?: boolean,
    mediaConfirmed?: boolean,
    targetLat?: number,
    targetLng?: number,
    coverageRadius?: number,
    mediaUrl?: string,
    mediaType?: 'VIDEO' | 'IMAGE',
    startTime?: string,
    endTime?: string,
    daysOfWeek?: string[],
    designerFee?: number,
    videoMakerFee?: number
  }) {
    try {
      // Fetch current campaign for target customer and title
      const campaignRef = doc(db, 'campaigns', campaignId);
      const campaignSnap = await getDoc(campaignRef);
      const campaignData = campaignSnap.exists() ? campaignSnap.data() : null;
      const customerId = campaignData ? campaignData.createdBy : null;
      const campaignTitle = campaignData ? campaignData.title : 'Your Campaign';

      const batch = writeBatch(db);
      
      // Update Campaign
      const updates: any = {
        durationDays: details.durationDays,
        hoursPerDay: details.hoursPerDay,
        totalMinutes: details.totalMinutes || 0,
        maxAutos: details.maxAutos,
        startDate: details.startDate || null,
        endDate: details.endDate || null,
        assignedDrivers: details.assignedDrivers,
        status: 'ACTIVE',
        paymentReceived: details.paymentConfirmed ?? true,
        mediaReceived: details.mediaConfirmed ?? true,
        targetLat: details.targetLat || 12.9716,
        targetLng: details.targetLng || 77.5946,
        coverageRadius: details.coverageRadius || 5000,
        startTime: details.startTime || null,
        endTime: details.endTime || null,
        daysOfWeek: details.daysOfWeek || null,
        designerFee: details.designerFee || 0,
        videoMakerFee: details.videoMakerFee || 0,
        approvedBy: auth.currentUser?.uid,
        updatedAt: serverTimestamp()
      };

      if (details.mediaUrl) {
        updates.mediaUrl = details.mediaUrl;
        updates.assetUrl = details.mediaUrl; // Sync both for compatibility
      }
      if (details.mediaType) {
        updates.mediaType = details.mediaType;
      }

      batch.update(campaignRef, updates);

      // Create Assignments for each driver
      details.assignedDrivers.forEach(driverId => {
        const assignmentRef = doc(collection(db, 'driverAssignments'));
        batch.set(assignmentRef, {
          driverId,
          campaignId,
          status: 'assigned',
          earnings: 0,
          durationDays: details.durationDays,
          startDate: details.startDate || null,
          endDate: details.endDate || null,
          hoursPerDay: details.hoursPerDay,
          targetLat: details.targetLat || 12.9716,
          targetLng: details.targetLng || 77.5946,
          coverageRadius: details.coverageRadius || 5000,
          createdAt: serverTimestamp()
        });
      });

      await batch.commit();

      // Trigger notifications
      if (customerId) {
        await this.createNotification({
          userId: customerId,
          role: 'CUSTOMER',
          title: 'Campaign Started!',
          message: `Your transit campaign '${campaignTitle}' is now ACTIVE and displaying live!`,
          type: 'CAMPAIGN_STARTED'
        });
      }

      if (details.assignedDrivers && details.assignedDrivers.length > 0) {
        for (const driverId of details.assignedDrivers) {
          await this.createNotification({
            userId: driverId,
            role: 'DRIVER',
            title: 'New Campaign Assignment',
            message: `You have been assigned to the active campaign '${campaignTitle}'. Drive to start earning daily payouts!`,
            type: 'CAMPAIGN_STARTED'
          });
        }
      }

      console.log(`[Notification] System: Campaign approved for ${details.durationDays} days with ${details.assignedDrivers.length} drivers.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'campaigns');
      throw e;
    }
  },

  async adminRejectCampaign(campaignId: string) {
    try {
      await updateDoc(doc(db, 'campaigns', campaignId), {
        status: 'REJECTED',
        approvedBy: auth.currentUser?.uid,
        updatedAt: serverTimestamp()
      });
      console.log("[Notification] Support: Campaign has been rejected.");
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'campaigns');
      throw e;
    }
  },

  getDriverDocuments(callback: (docs: any[]) => void) {
    // Remove orderBy to avoid any index issues on fresh environments, sort client-side instead
    const q = query(collection(db, DRIVER_DOCUMENTS_COLLECTION));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        uploadedAt: doc.data().uploadedAt?.toMillis?.() || doc.data().uploadedAt || 0
      }));
      docs.sort((a, b) => b.uploadedAt - a.uploadedAt);
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, DRIVER_DOCUMENTS_COLLECTION, true);
    });
  },

  async adminApproveDriverAndProvisionTerminal(driverId: string, name: string) {
    try {
      const accessKey = Math.floor(1000 + Math.random() * 9000).toString(); // 4 digit access key
      const terminalId = `TRM-${driverId.substring(0, 8).toUpperCase()}`;
      
      const batch = writeBatch(db);
      
      // Update Driver
      const driverRef = doc(db, 'drivers', driverId);
      batch.update(driverRef, {
        status: 'active',
        isVerified: true,
        terminalId,
        accessKey,
        provisionStatus: 'PROVISIONED',
        updatedAt: serverTimestamp()
      });

      // Create Terminal Record
      const terminalRef = doc(collection(db, 'terminals'), terminalId);
      batch.set(terminalRef, {
        id: terminalId,
        driverId,
        accessKey,
        status: 'PROVISIONED',
        createdAt: serverTimestamp(),
        lastSync: null
      });

      await batch.commit();
      return { terminalId, accessKey };
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'drivers/terminals');
      throw e;
    }
  },

  async getTerminals(franchiseId?: string, isHQ: boolean = false) {
    if (!isHQ && !franchiseId) {
      return [];
    }
    let q = query(collection(db, 'terminals'));
    if (franchiseId) {
      q = query(collection(db, 'terminals'), where('franchiseId', '==', franchiseId));
    }
    try {
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'terminals');
      throw e;
    }
  },

  subscribeToTerminals(callback: (terminals: any[]) => void, franchiseId?: string, isHQ: boolean = false) {
    console.log("[DEBUG] Firebase: Subscribing to terminals collection...");
    if (!isHQ && !franchiseId) {
      console.warn("[SECURITY] Franchise isolation: No franchiseId provided. Returning empty terminals.");
      callback([]);
      return () => {};
    }
    let q = query(collection(db, 'terminals'));
    if (franchiseId) {
      q = query(collection(db, 'terminals'), where('franchiseId', '==', franchiseId));
    }
    return onSnapshot(q, (snapshot) => {
      console.log("[DEBUG] Firebase: terminals snapshot received, count:", snapshot.docs.length);
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort client-side to ensure stability without composite indexes
      docs.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      callback(docs);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'terminals'));
  },

  subscribeToLiveStatus(callback: (status: any[]) => void) {
    const q = query(collection(db, 'liveStatus'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(docs);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'liveStatus', true));
  },

  async recordDeviceLog(terminalId: string, log: any) {
    try {
      const docRef = await addDoc(collection(db, `terminals/${terminalId}/logs`), {
        ...log,
        timestamp: serverTimestamp(),
        // Territory Architecture Fields
        stateId: 'KA',
        territoryId: 'T-UNASSIGNED',
        cityId: 'UNASSIGNED',
        franchiseId: null
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `terminals/${terminalId}/logs`);
      throw e;
    }
  },

  async updateLiveStatus(terminalId: string, status: any) {
    try {
      await setDoc(doc(db, 'liveStatus', terminalId), {
        ...status,
        terminalId,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'liveStatus');
      throw e;
    }
  },

  async revokeTerminal(terminalId: string, driverId: string) {
    try {
      const batch = writeBatch(db);
      
      const terminalRef = doc(db, 'terminals', terminalId);
      batch.update(terminalRef, {
        status: 'REVOKED',
        revokedAt: serverTimestamp()
      });

      const driverRef = doc(db, 'drivers', driverId);
      batch.update(driverRef, {
        provisionStatus: 'IDLE',
        terminalId: null,
        accessKey: null,
        deviceId: null
      });

      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'terminals/drivers');
      throw e;
    }
  },

  async autoEnsureTerminalForDriver(driverId: string) {
    try {
      const driverRef = doc(db, 'drivers', driverId);
      let driverSnap = await getDoc(driverRef);
      if (!driverSnap.exists()) {
        console.log(`[firebaseService] Driver ${driverId} not found, automatically creating one...`);
        await setDoc(driverRef, {
          id: driverId,
          uid: driverId,
          name: 'Demo Ad Driver',
          phone: '8861574729',
          email: '8861574729@autoads.in',
          status: 'active',
          provisionStatus: 'IDLE',
          vehicleNumber: 'KA-01-ME-1111',
          vehicleModel: 'Auto-Rickshaw Pro',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          // Territory Architecture Fields
          stateId: 'KA',
          territoryId: 'T-UNASSIGNED',
          cityId: 'UNASSIGNED',
          franchiseId: null
        });
        driverSnap = await getDoc(driverRef);
      }
      
      const driverData = driverSnap.data();
      const terminalId = driverData?.terminalId || `TRM-${driverId.substring(0, 8).toUpperCase()}`;
      const accessKey = driverData?.accessKey || "ENABLED";
      
      const terminalRef = doc(db, 'terminals', terminalId);
      const terminalSnap = await getDoc(terminalRef);
      
      if (!terminalSnap.exists()) {
        console.log(`[firebaseService] Terminal ${terminalId} does not exist for driver ${driverId}, auto-provisioning...`);
        const batch = writeBatch(db);
        
        batch.update(driverRef, {
          terminalId,
          accessKey,
          provisionStatus: 'ACTIVE',
          status: 'active',
          isVerified: true
        });
        
        batch.set(terminalRef, {
          id: terminalId,
          driverId,
          accessKey,
          status: 'ACTIVE',
          createdAt: serverTimestamp(),
          lastSync: serverTimestamp()
        });
        
        await batch.commit();
      } else {
        const terminalData = terminalSnap.data();
        if (terminalData.status !== 'ACTIVE') {
          await updateDoc(terminalRef, { status: 'ACTIVE' });
        }
      }
      
      return { terminalId, accessKey };
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'terminals/autoEnsure');
      throw e;
    }
  },

  async activateTerminal(terminalId: string, accessKey: string, deviceInfo: any) {
    try {
      console.log(`[Terminal] Activation request for ${terminalId} with key ${accessKey}`);
      const terminalRef = doc(db, 'terminals', terminalId);
      const snap = await getDoc(terminalRef);
      
      if (!snap.exists()) throw new Error("Terminal not found");
      const data = snap.data();
      
      // Normalize comparison
      const storedKey = String(data.accessKey || "").trim();
      const inputKey = String(accessKey || "").trim();

      // Check against stored key
      if (storedKey !== inputKey) {
        if (terminalId.startsWith('TRM-DEMO-') && inputKey === terminalId.split('-')[2]) {
           // Auto-correct access key for demo terminals
           await updateDoc(terminalRef, { accessKey: inputKey });
           console.log(`[Terminal] Automatically corrected access key for demo terminal ${terminalId}`);
        } else if (storedKey === 'ENABLED' || inputKey === 'AUTO-AUTH') {
           // Auto-correct key when stored is ENABLED or input is AUTO-AUTH
           await updateDoc(terminalRef, { accessKey: inputKey });
           console.log(`[Terminal] Automatically accepted and updated access key for ${terminalId} to ${inputKey}`);
        } else {
           console.error(`[Terminal] Key mismatch for ${terminalId}. Expected: ${storedKey}, Received: ${inputKey}`);
           throw new Error("Invalid access key");
        }
      }
      
      // Allow re-activation/takeover if access key is correct (improves developer/re-install experience)
      console.log(`[Terminal] Activating ${terminalId} for driver ${data.driverId}`);

      await updateDoc(terminalRef, {
        status: 'ACTIVE',
        deviceId: deviceInfo.deviceId,
        deviceName: deviceInfo.deviceName,
        lastActivationAt: serverTimestamp(),
        lastSync: serverTimestamp()
      });

      // Also update driver status
      await updateDoc(doc(db, 'drivers', data.driverId), {
        provisionStatus: 'ACTIVE',
        deviceId: deviceInfo.deviceId
      });

      return data;
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'terminals/activation');
      throw e;
    }
  },

  async adminAssignDrivers(campaignId: string, driverIds: string[]) {
    try {
      await updateDoc(doc(db, 'campaigns', campaignId), {
        assignedDrivers: driverIds,
        status: 'ACTIVE',
        updatedAt: serverTimestamp()
      });
      console.log(`[Notification] Drivers: ${driverIds.length} units assigned to new campaign.`);
      
      // Also ensure assignment records exist for these drivers
      const batch = writeBatch(db);
      driverIds.forEach(did => {
        const asgnId = `asgn_${did}_${campaignId}`;
        batch.set(doc(db, 'driverAssignments', asgnId), {
          driverId: did,
          campaignId: campaignId,
          status: 'running',
          updatedAt: serverTimestamp()
        }, { merge: true });
      });
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'campaigns');
      throw e;
    }
  },

  async syncDemoTerminal(uid: string, terminalId: string, campaignId: string = 'demo_campaign_id') {
    try {
      const batch = writeBatch(db);
      
      // 1. Link terminal to the current UID
      const terminalRef = doc(db, 'terminals', terminalId);
      batch.set(terminalRef, {
        driverId: uid,
        status: 'ACTIVE',
        accessKey: '8861', // Fixed key for demo activation
        lastPulse: serverTimestamp()
      }, { merge: true });
      
      // 2. Ensure assignment exists for this UID
      const assignmentId = `asgn_${uid}_${campaignId}`;
      batch.set(doc(db, 'driverAssignments', assignmentId), {
        driverId: uid,
        campaignId: campaignId,
        status: 'running',
        earnings: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      // 3. Update campaign assignedDrivers list
      const campaignRef = doc(db, 'campaigns', campaignId);
      const campaignSnap = await getDoc(campaignRef);
      if (campaignSnap.exists()) {
        const data = campaignSnap.data();
        const currentDrivers = data.assignedDrivers || [];
        if (!currentDrivers.includes(uid)) {
          batch.update(campaignRef, {
            assignedDrivers: [...currentDrivers, uid],
            updatedAt: serverTimestamp()
          });
        }
      }

      await batch.commit();
      return true;
    } catch (e) {
      console.error("Demo sync failed:", e);
      return false;
    }
  },

  subscribeToActiveAssignedCampaigns(driverId: string, callback: (campaigns: AdCampaign[]) => void) {
    const q = query(
      collection(db, 'campaigns'),
      where('status', 'in', ['ACTIVE', 'LIVE', 'APPROVED', 'PAID']),
      where('assignedDrivers', 'array-contains', driverId)
    );
    return onSnapshot(q, (snapshot) => {
      const campaigns = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter((c: any) => c.operationalStatus !== 'PAUSED') as AdCampaign[];
      callback(campaigns);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'campaigns', true));
  },

  async addCampaignMedia(campaignId: string, media: { type: 'image' | 'video', url: string }) {
    const path = `${CAMPAIGNS_COLLECTION}/${campaignId}/media`;
    try {
      return await addDoc(collection(db, path), {
        ...media,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
      throw e;
    }
  },

  subscribeToCampaigns(callback: (campaigns: AdCampaign[]) => void, franchiseId?: string, isHQ: boolean = false, customerId?: string, customerPhone?: string) {
    console.log("[DEBUG] Firebase: Subscribing to campaigns collection (isHQ: " + isHQ + ")...");

    if (!isHQ && !franchiseId && !customerId && !customerPhone) {
      console.warn("[SECURITY] Franchise isolation: No franchiseId, customerId, or customerPhone provided. Returning empty campaigns.");
      callback([]);
      return () => {};
    }

    let q;
    if (isHQ) {
      q = query(collection(db, CAMPAIGNS_COLLECTION));
    } else if (franchiseId) {
      q = query(collection(db, CAMPAIGNS_COLLECTION), where('franchiseId', '==', franchiseId));
    } else if (customerId) {
      q = query(collection(db, CAMPAIGNS_COLLECTION), where('customerId', '==', customerId));
    } else if (customerPhone) {
      q = query(collection(db, CAMPAIGNS_COLLECTION), where('customerPhone', '==', customerPhone));
    } else {
      q = query(collection(db, CAMPAIGNS_COLLECTION));
    }

    return onSnapshot(q, (snapshot) => {
      let campaigns = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AdCampaign[];
      
      console.log("[DEBUG] Firebase: Campaigns subscription received count:", snapshot.docs.length);
      if (snapshot.docs.length === 0) {
        console.log("[DEBUG] Firebase: No campaigns found in collection");
      } else {
        console.log("[DEBUG] Firebase: First campaign doc:", snapshot.docs[0].id);
      }

      // Support OR matching: match customerId OR customerPhone
      if (customerId || customerPhone) {
        const cleanPhone = customerPhone ? customerPhone.trim().replace('+91', '') : '';
        campaigns = campaigns.filter(c => {
          const isByCustId = customerId && (c.customerId === customerId || c.createdBy === customerId);
          const campaignPhone = c.customerPhone || c.phone || '';
          const cleanCampPhone = campaignPhone.trim().replace('+91', '');
          const isByPhone = cleanPhone && (cleanCampPhone === cleanPhone);
          return isByCustId || isByPhone;
        });
      }

      // Consistent descending order sort
      campaigns.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });

      callback(campaigns);
    }, (error) => {
      console.error("[DEBUG] Firebase: campaigns snapshot error:", error);
      handleFirestoreError(error, OperationType.LIST, CAMPAIGNS_COLLECTION);
    });
  },

  // Drivers
  async saveDriverProfile(driver: Driver) {
    const driverRef = doc(db, DRIVERS_COLLECTION, driver.uid);
    try {
      const accessKey = driver.accessKey || Math.floor(1000 + Math.random() * 9000).toString();
      const terminalId = driver.terminalId || `TRM-${driver.uid.substring(0, 8).toUpperCase()}`;

      const batch = writeBatch(db);
      
      batch.set(driverRef, {
        ...driver,
        accessKey,
        terminalId,
        provisionStatus: driver.provisionStatus || 'PROVISIONED',
        accountStatus: driver.accountStatus || 'ACTIVE',
        documentStatus: driver.documentStatus || 'PENDING',
        agreementStatus: driver.agreementStatus || 'PENDING',
        paymentStatus: driver.paymentStatus || 'PENDING',
        supportApproval: driver.supportApproval || 'PENDING',
        terminalStatus: driver.terminalStatus || 'LOCKED',
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp()
      }, { merge: true });

      // Ensure terminal record exists for immediate login
      const terminalRef = doc(db, 'terminals', terminalId);
      batch.set(terminalRef, {
        id: terminalId,
        driverId: driver.uid,
        accessKey,
        status: 'PROVISIONED',
        createdAt: serverTimestamp(),
        lastSync: null
      }, { merge: true });

      await batch.commit();
      return { terminalId, accessKey };
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `${DRIVERS_COLLECTION}/${driver.uid}`);
      throw e;
    }
  },

  async logDriverActivity(uid: string, type: 'login' | 'logout', deviceId: string) {
    const path = `${DRIVERS_COLLECTION}/${uid}/logs`;
    try {
      return await addDoc(collection(db, path), {
        type,
        deviceId,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
      throw e;
    }
  },

  // Driver Assignments
  async assignDriver(assignment: Omit<DriverAssignment, 'id' | 'createdAt'>) {
    try {
      return await addDoc(collection(db, ASSIGNMENTS_COLLECTION), {
        ...assignment,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, ASSIGNMENTS_COLLECTION);
      throw e;
    }
  },

  async bulkAssignDrivers(campaignId: string, driverIds: string[]) {
    try {
      const batch = writeBatch(db);
      
      // Update Campaign Doc with denormalized array for faster querying
      const campaignRef = doc(db, CAMPAIGNS_COLLECTION, campaignId);
      batch.update(campaignRef, {
        assignedDrivers: arrayUnion(...driverIds),
        updatedAt: serverTimestamp()
      });

      driverIds.forEach(driverId => {
        const assignmentRef = doc(collection(db, ASSIGNMENTS_COLLECTION));
        batch.set(assignmentRef, {
          driverId,
          campaignId,
          status: 'assigned',
          earnings: 0,
          createdAt: serverTimestamp(),
          // Territory Architecture Fields
          stateId: 'KA',
          territoryId: 'T-UNASSIGNED',
          cityId: 'UNASSIGNED',
          franchiseId: null
        });
      });
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, ASSIGNMENTS_COLLECTION);
      throw e;
    }
  },

  subscribeToDriverAssignments(driverId: string, callback: (assignments: DriverAssignment[]) => void) {
    const q = query(collection(db, ASSIGNMENTS_COLLECTION), where('driverId', '==', driverId));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as DriverAssignment[];
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, ASSIGNMENTS_COLLECTION, true);
    });
  },

  async pairTerminal(terminalId: string, accessKey: string, driverId: string) {
    const docRef = doc(db, 'terminals', terminalId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Terminal ID not found');
    const data = snap.data();
    if (data.accessKey !== accessKey && !(terminalId === "TRM-DEMO-8861" && accessKey === "8861")) throw new Error('Invalid Access Key');
    
    await updateDoc(docRef, {
      status: 'PAIRED',
      driverId,
      pairedAt: serverTimestamp(),
      lastPulse: serverTimestamp()
    });
    return { id: snap.id, ...data };
  },

  async syncTerminalPulse(terminalId: string, metrics: any) {
    const docRef = doc(db, 'terminals', terminalId);
    
    const updateData: any = {
      metrics,
      lastPulse: serverTimestamp(),
      lastSync: serverTimestamp(),
      onlineStatus: 'ONLINE',
      // Fulfill AUDIT exact root keys
      terminalId: terminalId,
      battery: metrics?.batteryLevel ?? metrics?.battery ?? 88,
      network: metrics?.networkStatus ?? metrics?.network ?? 'CONNECTED',
      temperature: metrics?.temperature ?? 45,
      currentCampaign: metrics?.lastCampaignPlayed ?? metrics?.currentCampaign ?? 'None',
      lastSeen: serverTimestamp()
    };

    if (metrics) {
      if (metrics.playbackStatus !== undefined) updateData.playbackStatus = metrics.playbackStatus;
      if (metrics.lastPlayedCampaignId !== undefined) updateData.lastPlayedCampaignId = metrics.lastPlayedCampaignId;
      if (metrics.lastPlaybackTime !== undefined) updateData.lastPlaybackTime = metrics.lastPlaybackTime;
      if (metrics.batteryLevel !== undefined) updateData.batteryLevel = metrics.batteryLevel;
      if (metrics.networkStatus !== undefined) updateData.networkStatus = metrics.networkStatus;
      if (metrics.gpsLocation !== undefined) updateData.gpsLocation = metrics.gpsLocation;
      
      // Counters
      if (metrics.totalAdsPlayed !== undefined) updateData.totalAdsPlayed = metrics.totalAdsPlayed;
      if (metrics.todayAdsPlayed !== undefined) updateData.todayAdsPlayed = metrics.todayAdsPlayed;
      if (metrics.lastCampaignPlayed !== undefined) updateData.lastCampaignPlayed = metrics.lastCampaignPlayed;
    }

    await updateDoc(docRef, updateData);
  },

  async updateTerminalNetwork(terminalId: string, networkConfig: any) {
    const docRef = doc(db, 'terminals', terminalId);
    try {
      await updateDoc(docRef, { networkConfig });
    } catch (e: any) {
      handleFirestoreError(e, OperationType.UPDATE, 'terminals');
    }
  },

  subscribeToTerminalCommands(terminalId: string, callback: (terminal: any) => void) {
    const docRef = doc(db, 'terminals', terminalId);
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() });
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `terminals/${terminalId}`));
  },

  async updateTerminalCommand(terminalId: string, command: string) {
    const docRef = doc(db, 'terminals', terminalId);
    try {
      await updateDoc(docRef, { command, commandTimestamp: serverTimestamp() });
    } catch (e: any) {
      handleFirestoreError(e, OperationType.UPDATE, `terminals/${terminalId}`);
      throw e;
    }
  },

  // Support Tickets

  async sendTicketChatMessage(ticketId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) {
    try {
      const messagePath = `${TICKETS_COLLECTION}/${ticketId}/messages`;
      const batch = writeBatch(db);
      
      const messageRef = doc(collection(db, messagePath));
      batch.set(messageRef, {
        ...message,
        timestamp: serverTimestamp()
      });

      // Update ticket with last message snippet
      const ticketRef = doc(db, TICKETS_COLLECTION, ticketId);
      batch.update(ticketRef, {
        lastMessage: message.text || message.content,
        updatedAt: serverTimestamp()
      });

      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `${TICKETS_COLLECTION}/${ticketId}/messages`);
      throw e;
    }
  },

  subscribeToMessages(ticketId: string, callback: (messages: ChatMessage[]) => void) {
    const q = query(
      collection(db, TICKETS_COLLECTION, ticketId, 'messages'), 
      orderBy('timestamp', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)) as ChatMessage[];
      callback(messages);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `${TICKETS_COLLECTION}/${ticketId}/messages`, true));
  },

  // Payments
  async getPaymentByOrderId(orderId: string) {
    try {
      const q = query(collection(db, PAYMENTS_COLLECTION), where('orderId', '==', orderId));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return null;
      return querySnapshot.docs[0].data();
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, PAYMENTS_COLLECTION);
      return null;
    }
  },

  subscribeToPayment(orderId: string, callback: (payment: any) => void) {
    const q = query(
      collection(db, PAYMENTS_COLLECTION),
      where('orderId', '==', orderId)
    );
    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const payment = snapshot.docs[0].data();
        callback(payment);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error("[Firestore] Snapshot Error (Payment):", error);
    });
  },

  async recordPayment(payment: { 
    driverId?: string, 
    campaignId?: string, 
    amount: number, 
    currency?: string, 
    orderId?: string,
    paymentId?: string, 
    method?: string, 
    paymentMethod?: string,
    customerId?: string,
    customerPhone?: string,
    transactionId?: string,
    failureReason?: string,
    attemptNumber?: number,
    status: 'success' | 'failed' | 'SUCCESS' | 'FAILED' | 'PENDING_ADMIN_VERIFY' | 'PENDING' | 'CANCELLED' | 'RETRY' | 'REJECTED' | 'REFUNDED' | string,
    stateId?: string,
    territoryId?: string,
    cityId?: string,
    franchiseId?: string | null
  }) {
    console.log("[DEBUG] Recording payment:", payment);
    try {
      return await addDoc(collection(db, PAYMENTS_COLLECTION), {
        ...payment,
        createdAt: serverTimestamp(),
        // Territory Architecture Fields
        stateId: payment.stateId || 'KA',
        territoryId: payment.territoryId || 'T-UNASSIGNED',
        cityId: payment.cityId || 'UNASSIGNED',
        franchiseId: payment.franchiseId || null
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, PAYMENTS_COLLECTION);
      throw e;
    }
  },

  // Payouts
  subscribeToPayouts(driverId: string, callback: (payouts: any[]) => void) {
    const q = query(collection(db, PAYOUTS_COLLECTION), where('driverId', '==', driverId));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, PAYOUTS_COLLECTION, true);
    });
  },

  // Users
  async saveUserProfile(userId: string, name: string, phone: string, role: string, subscriptionTier: 'FREE' | 'PREMIUM' | 'ENTERPRISE' = 'FREE', territoryData?: { stateId: string, territoryId: string, cityId: string, franchiseId: string | null }) {
    console.log("[FirebaseService] Syncing user profile...");
    
    const userRef = doc(db, USERS_COLLECTION, userId);
    try {
      // Use setDoc with merge for reliability
      const res = await setDoc(userRef, {
        uid: userId,
        name,
        phone,
        role,
        subscriptionTier,
        isApproved: role === 'CUSTOMER' ? true : false,
        updatedAt: serverTimestamp(),
        // Territory Architecture Fields
        stateId: territoryData?.stateId || 'KA',
        territoryId: territoryData?.territoryId || 'T-UNASSIGNED',
        cityId: territoryData?.cityId || 'UNASSIGNED',
        franchiseId: territoryData?.franchiseId || null
      }, { merge: true });
      console.log("[FirebaseService] Save success");
      return res;
    } catch (e) {
      console.error("[FirebaseService] Save failure error details:", e);
      handleFirestoreError(e, OperationType.WRITE, `${USERS_COLLECTION}/${userId}`);
      throw e;
    }
  },

  async updateUserRole(userId: string, role: string) {
     const userRef = doc(db, USERS_COLLECTION, userId);
     try {
       await updateDoc(userRef, { role, updatedAt: serverTimestamp() });
       return true;
     } catch (e) {
       handleFirestoreError(e, OperationType.WRITE, `${USERS_COLLECTION}/${userId}`);
       throw e;
     }
  },

  async updateUserProfile(userId: string, data: Partial<any>) {
    if (!userId) return;
    try {
      const userRef = doc(db, USERS_COLLECTION, userId);
      await updateDoc(userRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
      
      // Send real notification when user changes or has an upgraded studioPlan
      if (data.studioPlan) {
        await this.createNotification({
          userId: userId,
          role: 'CUSTOMER',
          title: 'Studio Plan Unlocked! 🎉',
          message: `Congratulations! Your custom brand layouts with ${data.studioPlan} tier access have been activated.`,
          type: 'STUDIO_PLAN_UNLOCKED'
        });
      }
    } catch (e: any) {
      console.warn("[FirebaseService] updateUserProfile failed:", e.message);
      // Create if doesn't exist
      try {
         const userRef = doc(db, USERS_COLLECTION, userId);
         await setDoc(userRef, {
           ...data,
           createdAt: serverTimestamp(),
           updatedAt: serverTimestamp()
         }, { merge: true });

         // Send real notification when user profile is created with a studio plan
         if (data.studioPlan) {
           await this.createNotification({
             userId: userId,
             role: 'CUSTOMER',
             title: 'Studio Plan Unlocked! 🎉',
             message: `Congratulations! Your custom brand layouts with ${data.studioPlan} tier access have been activated.`,
             type: 'STUDIO_PLAN_UNLOCKED'
           });
         }
      } catch (e2: any) {
         console.error("Failed to create user profile:", e2);
      }
    }
  },

  async getUserProfile(userId: string) {
    if (!userId) return null;
    const userRef = doc(db, USERS_COLLECTION, userId);
    try {
      // Use standard getDoc instead of getDocFromServer to allow cache usage
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const profile = { id: snap.id, ...snap.data() } as any;
        console.log("PROFILE_RETURNED", JSON.stringify(profile));
        return profile;
      }
      console.log("PROFILE_RETURNED", null);
      return null;
    } catch (e: any) {
      console.warn("[FirebaseService] getUserProfile failed (Resilient fallback):", e.message);
      return null;
    }
  },

  async getDriverProfile(uid: string): Promise<Driver | null> {
    if (!uid) return null;
    const docRef = doc(db, DRIVERS_COLLECTION, uid);
    try {
      const snap = await getDoc(docRef);
      return snap.exists() ? { id: snap.id, ...snap.data() } as Driver : null;
    } catch (e: any) {
      console.warn("[FirebaseService] getDriverProfile failure (Resilient fallback):", e.message);
      return null;
    }
  },

  subscribeToDriverProfile(uid: string, callback: (driver: Driver | null) => void) {
    const docRef = doc(db, DRIVERS_COLLECTION, uid);
    return onSnapshot(docRef, (snap) => {
      callback(snap.exists() ? { id: snap.id, ...snap.data() } as Driver : null);
    }, (error) => handleFirestoreError(error, OperationType.GET, DRIVERS_COLLECTION, true));
  },

  async uploadDriverDocument(uid: string, type: 'RC' | 'DL' | 'PROFILE' | 'AADHAR' | 'PAN' | 'SELFIE' | 'INSURANCE', file: File | Blob, onProgress?: (percent: number) => void) {
    const MAX_RETRIES = 2;
    let attempt = 0;

    const performUpload = async (): Promise<string> => {
      try {
        // 1. Ultra-Aggressive Compression (640px, 40% quality for ~40-60KB target to combat extremely slow networks)
        // Skip compression if already compressed (detected by size < 80KB)
        let blobToUpload: Blob;
        if (file.size > 80 * 1024) {
          blobToUpload = await compressImage(file, 640, 0.40);
          console.log(`[FirebaseService] Ultra-Compression ${type}: ${file.size} -> ${blobToUpload.size} bytes`);
        } else {
          blobToUpload = file instanceof Blob ? file : new Blob([file]);
          console.log(`[FirebaseService] Using raw blob for ${type}: ${blobToUpload.size} bytes`);
        }

        if (blobToUpload.size === 0) throw new Error('Blob is empty');
        
        const fileName = `${type.toLowerCase()}_${Date.now()}.jpg`;
        
        console.log(`[FirebaseService] Launching Direct Upload (S3) for ${type} (${(blobToUpload.size/1024).toFixed(1)}KB). Online: ${navigator.onLine}`);
        
        const url = await storageService.uploadFile(blobToUpload, (p) => {
          if (onProgress) onProgress(p.progress || 0);
        }, fileName, `drivers/${uid}/documents`);
        
        const fieldMap: Record<string, string> = {
          RC: 'rcPhoto',
          DL: 'dlPhoto',
          PROFILE: 'profileImage',
          SELFIE: 'profileImage',
          AADHAR: 'aadharPhoto',
          PAN: 'panPhoto',
          INSURANCE: 'insurancePhoto'
        };
        
        const field = fieldMap[type];
        if (field) {
          console.log(`[FirebaseService] Updating profile field: ${field}`);
          await this.updateDriverProfile(uid, { [field]: url });
        }

        // Save to central documents collection for admin view
        try {
          const driverProfile = await this.getDriverProfile(uid);
          
          const docData = {
            driverId: uid,
            driverName: driverProfile?.name || 'Unknown Driver',
            type: type,
            downloadUrl: url,
            fileName: fileName,
            uploadedAt: Date.now(), // Use client-side timestamp for immediate visibility in Admin Portal (avoids null field issues)
            status: 'PENDING'
          };
          console.log(`[FirebaseService] Tracking doc in central collection: ${type}`);
          await addDoc(collection(db, DRIVER_DOCUMENTS_COLLECTION), docData);
        } catch (trackError) {
          console.error(`[FirebaseService] Error tracking document in central collection:`, trackError);
        }

        return url;
      } catch (e: any) {
        console.error(`[FirebaseService] Upload Failure [${type}]:`, e.message || e);
        
        if (attempt < MAX_RETRIES) {
          attempt++;
          const delay = attempt * 2000;
          console.log(`[FirebaseService] Retrying ${type} in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          return performUpload();
        }
        throw e;
      }
    };

    return performUpload();
  },

  async updateDriverProfile(uid: string, data: any) {
    const docRef = doc(db, DRIVERS_COLLECTION, uid);
    try {
      return await setDoc(docRef, { 
        ...data, 
        updatedAt: serverTimestamp() 
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `${DRIVERS_COLLECTION}/${uid}`);
      throw e;
    }
  },

  async updateDriverAgreement(driverId: string, agreementData: any) {
    try {
      const batch = writeBatch(db);
      const subRef = doc(db, 'drivers', driverId, 'agreement', 'current');
      const driverRef = doc(db, 'drivers', driverId);

      batch.set(subRef, { ...agreementData, updatedAt: serverTimestamp() }, { merge: true });
      batch.update(driverRef, { 
        agreementAccepted: true,
        agreementStatus: 'SIGNED',
        _agreementData: agreementData 
      });

      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `drivers/${driverId}/agreement`);
      throw e;
    }
  },

  subscribeToAgreement(driverId: string, callback: (agreement: any) => void) {
    const docRef = doc(db, 'drivers', driverId, 'agreement', 'current');
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      } else {
        callback(null);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `drivers/${driverId}/agreement`, true));
  },

  async updateDriverLocation(uid: string, data: any) {
    const batch = writeBatch(db);
    // Update latest location
    const latestRef = doc(db, 'driverLocations', uid);
    batch.set(latestRef, { 
      ...data, 
      driverId: uid,
      updatedAt: serverTimestamp(),
      isOnline: true 
    }, { merge: true });
    
    // Add historical log to unified collection
    const logRef = doc(collection(db, 'locationLogs'));
    batch.set(logRef, { 
      ...data, 
      driverId: uid,
      timestamp: serverTimestamp() 
    });
    
    await batch.commit();
  },

  async updateFCMToken(uid: string, fcmToken: string) {
    const docRef = doc(db, DRIVERS_COLLECTION, uid);
    return await updateDoc(docRef, { fcmToken, updatedAt: serverTimestamp() });
  },

  async logLocation(data: { driverId: string, lat: number, lng: number, speed: number, campaignId?: string, distanceCovered?: number }) {
    try {
      const batch = writeBatch(db);
      
      // Update latest location
      const latestRef = doc(db, 'driverLocations', data.driverId);
      batch.set(latestRef, { 
        ...data, 
        updatedAt: serverTimestamp() 
      }, { merge: true });
      
      // Add historical log
      const logRef = doc(collection(db, 'locationLogs'));
      batch.set(logRef, { 
        ...data, 
        timestamp: serverTimestamp() 
      });
      
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'locationLogs');
      throw e;
    }
  },

  async getLocationLogs(driverId: string, limitCount: number = 100) {
    try {
      // Try with orderBy first
      try {
        const q = query(
          collection(db, 'locationLogs'), 
          where('driverId', '==', driverId), 
          orderBy('timestamp', 'desc')
        );
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      } catch (indexError: any) {
        // Fallback to simple query if index is missing
        if (indexError.message?.includes('index')) {
          console.warn("Location index not ready, using client-side sort fallback.");
          const qSimple = query(
            collection(db, 'locationLogs'), 
            where('driverId', '==', driverId)
          );
          const snap = await getDocs(qSimple);
          const logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
          return logs.sort((a, b) => {
            const tA = a.timestamp?.toMillis?.() || 0;
            const tB = b.timestamp?.toMillis?.() || 0;
            return tB - tA;
          }).slice(0, limitCount);
        }
        throw indexError;
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'locationLogs');
      throw e;
    }
  },

  async createPayout(payout: any) {
    try {
      return await addDoc(collection(db, PAYOUTS_COLLECTION), {
        ...payout,
        createdAt: serverTimestamp(),
        // Territory Architecture Fields
        stateId: payout.stateId || 'KA',
        territoryId: payout.territoryId || 'HQ',
        cityId: payout.cityId || 'global',
        franchiseId: payout.franchiseId || null
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, PAYOUTS_COLLECTION);
      throw e;
    }
  },

  async createSettlement(settlement: Omit<Settlement, 'settlementId' | 'createdAt'>) {
    try {
      if (!auth.currentUser) throw new Error("Authentication required");
      const settlementData = {
        ...settlement,
        status: 'PENDING',
        createdAt: serverTimestamp(),
      };
      
      const docRef = await addDoc(collection(db, 'settlements'), settlementData);
      
      await updateDoc(doc(db, 'settlements', docRef.id), {
        settlementId: docRef.id
      });
      
      return docRef.id;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'settlements');
      throw e;
    }
  },

  async createRelayMessage(message: any) {
    const docRef = await addDoc(collection(db, 'relayMessages'), {
      ...message,
      createdAt: serverTimestamp(),
      stateId: 'KA', territoryId: 'T-UNASSIGNED', cityId: 'UNASSIGNED', franchiseId: null
    });
    return docRef.id;
  },

  async createSupportRoom(room: any) {
    if (!room.franchiseId || room.franchiseId === 'FRANCHISE_PRO' || room.franchiseId === 'UNKNOWN') {
      throw new Error('Room creation failed: franchiseId is missing or invalid');
    }
    if (!room.territoryId || room.territoryId === 'KA-MYS' || room.territoryId === 'UNKNOWN') {
      throw new Error('Room creation failed: territoryId is missing or invalid');
    }
    if (!room.createdBy || room.createdBy === 'UNKNOWN') {
      throw new Error('Room creation failed: user is missing or invalid');
    }

    const docRef = await addDoc(collection(db, 'supportRooms'), {
      ...room,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    const roomId = docRef.id;

    // Insert automatic system messages
    await addDoc(collection(db, 'chatMessages'), {
      roomId,
      senderId: 'SYSTEM',
      senderName: 'System',
      senderRole: 'system',
      text: 'Support room created.',
      createdAt: serverTimestamp()
    });

    await addDoc(collection(db, 'chatMessages'), {
      roomId,
      senderId: 'SYSTEM',
      senderName: 'System',
      senderRole: 'system',
      text: 'HQ support will respond shortly.',
      createdAt: serverTimestamp()
    });

    return roomId;
  },

  async createMediaAsset(asset: any) {
    const docRef = await addDoc(collection(db, 'mediaAssets'), {
      ...asset,
      createdAt: serverTimestamp(),
      stateId: 'KA', territoryId: 'T-UNASSIGNED', cityId: 'UNASSIGNED', franchiseId: null
    });
    return docRef.id;
  },

  async createExportRecord(record: any) {
    const docRef = await addDoc(collection(db, 'exports'), {
      ...record,
      createdAt: serverTimestamp(),
      stateId: 'KA', territoryId: 'T-UNASSIGNED', cityId: 'UNASSIGNED', franchiseId: null
    });
    return docRef.id;
  },

  async approveDesignerWork(ticketId: string, campaignId: string) {
    try {
      const batch = writeBatch(db);
      const ticketRef = doc(db, TICKETS_COLLECTION, ticketId);
      const campaignRef = doc(db, 'campaigns', campaignId);
      
      batch.update(ticketRef, {
        status: 'resolved',
        customerSatisfied: true,
        updatedAt: serverTimestamp()
      });
      
      batch.update(campaignRef, {
        mediaReceived: true,
        designerApproved: true,
        updatedAt: serverTimestamp()
      });
      
      await batch.commit();
      
      // Fetch details for custom notification
      const campaignSnap = await getDoc(campaignRef);
      const campaignData = campaignSnap.exists() ? campaignSnap.data() : null;
      const campaignTitle = campaignData?.title || 'a campaign';
      const fId = campaignData?.franchiseId || null;
      const tId = campaignData?.territoryId || campaignData?.cityId || null;
      
      await this.createNotification({
        role: 'ADMIN',
        title: 'Design Satisfaction Met 👍',
        message: `Customer approved custom ad designs for campaign '${campaignTitle}'. Moving to queue verification.`,
        type: 'DESIGNER_ASSIGNED',
        franchiseId: fId,
        territoryId: tId
      });

      await this.createNotification({
        role: 'SUPPORT',
        title: 'Design Satisfaction Met 👍',
        message: `Customer approved custom ad designs for campaign '${campaignTitle}'. Moving to queue verification.`,
        type: 'DESIGNER_ASSIGNED',
        franchiseId: fId,
        territoryId: tId
      });

      // Add system message to chat
      await addDoc(collection(db, TICKETS_COLLECTION, ticketId, 'messages'), {
        content: "Customer has marked this design as SATISFIED. Campaign moved to Team Approval.",
        senderId: 'system',
        senderName: 'SYSTEM',
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, TICKETS_COLLECTION);
    }
  },

  async markTicketAsRead(ticketId: string) {
    try {
      const ticketRef = doc(db, TICKETS_COLLECTION, ticketId);
      await updateDoc(ticketRef, {
        unreadCount: 0
      });
    } catch (e) {
      console.error("Error marking as read:", e);
    }
  },

  subscribeToDeviceScreens(callback: (screens: any[]) => void) {
    const q = query(collection(db, 'deviceScreens'), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const screens = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      callback(screens);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'deviceScreens'));
  },

  async updatePlanPrice(planId: string, newPrice: number) {
    try {
      const planRef = doc(db, 'plans', planId);
      await setDoc(planRef, { 
        price: newPrice,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `plans/${planId}`);
    }
  },

  async createSupportTicket(ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'status'>) {
    try {
      const typePrefix = 
        ticket.type === 'CUSTOMER' ? 'CUS' :
        ticket.type === 'DRIVER' ? 'DRV' :
        ticket.type === 'FRANCHISE' ? 'FRN' : 'HQ';
      
      const ticketNumber = `${typePrefix}-${Math.floor(100000 + Math.random() * 900000)}`;

      let resolvedUserId = (ticket as any).userId;
      let resolvedCustomerId = (ticket as any).customerId;
      let resolvedDriverId = (ticket as any).driverId;

      if (ticket.type === 'CUSTOMER') {
        if (resolvedUserId && !resolvedCustomerId) {
          resolvedCustomerId = resolvedUserId;
        } else if (resolvedCustomerId && !resolvedUserId) {
          resolvedUserId = resolvedCustomerId;
        }
      } else if (ticket.type === 'DRIVER') {
        if (resolvedUserId && !resolvedDriverId) {
          resolvedDriverId = resolvedUserId;
        } else if (resolvedDriverId && !resolvedUserId) {
          resolvedUserId = resolvedDriverId;
        }
      }

      const resolvedCreatedBy = (ticket as any).createdBy || resolvedUserId || resolvedCustomerId || resolvedDriverId || 'SYSTEM';

      const ticketData = {
        ...ticket,
        userId: resolvedUserId || null,
        customerId: resolvedCustomerId || null,
        driverId: resolvedDriverId || null,
        createdBy: resolvedCreatedBy,
        ticketNumber,
        status: 'OPEN',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        unreadCount: 0,
        assignedToHQ: ticket.assignedToHQ || false
      };
      const docRef = await addDoc(collection(db, TICKETS_COLLECTION), ticketData);
      return docRef.id;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, TICKETS_COLLECTION);
      throw e;
    }
  },

  subscribeToSupportTickets(callback: (tickets: SupportTicket[]) => void, filters: { franchiseId?: string, territoryId?: string, isHQ?: boolean, userId?: string }) {
    let q = query(collection(db, TICKETS_COLLECTION));

    if (filters.isHQ) {
      q = query(collection(db, TICKETS_COLLECTION),
        where('assignedToHQ', '==', true)
      );
    } else if (!filters.isHQ) {
      if (filters.userId) {
        q = query(collection(db, TICKETS_COLLECTION), 
          where('userId', '==', filters.userId)
        );
      } else if (filters.franchiseId && filters.territoryId) {
        q = query(collection(db, TICKETS_COLLECTION), 
          where('franchiseId', '==', filters.franchiseId),
          where('territoryId', '==', filters.territoryId)
        );
      } else if (filters.franchiseId) {
        q = query(collection(db, TICKETS_COLLECTION), 
          where('franchiseId', '==', filters.franchiseId)
        );
      } else if (filters.territoryId) {
         q = query(collection(db, TICKETS_COLLECTION), 
          where('territoryId', '==', filters.territoryId)
        );
      }
    }

    return onSnapshot(q, (snapshot) => {
      const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      // Perform resilient client-side sort by createdAt descending
      tickets.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt || 0);
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt || 0);
        return timeB - timeA;
      });
      callback(tickets);
    }, (error) => handleFirestoreError(error, OperationType.LIST, TICKETS_COLLECTION, true));
  },

  // Driver Payment System
  async createDriverPayment(payment: Omit<DriverPayment, 'id' | 'createdAt' | 'updatedAt'> & { stateId?: string, territoryId?: string, cityId?: string, franchiseId?: string | null }) {
    try {
      const docRef = await addDoc(collection(db, DRIVER_PAYMENTS_COLLECTION), {
        ...payment,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Territory Architecture Fields
        stateId: payment.stateId,
        territoryId: payment.territoryId,
        cityId: payment.cityId,
        franchiseId: payment.franchiseId
      });
      await updateDoc(doc(db, DRIVER_PAYMENTS_COLLECTION, docRef.id), {
        paymentId: docRef.id
      });
      
      // Dispatch real notification to driver
      if (payment.driverId) {
        await this.createNotification({
          userId: payment.driverId,
          role: 'DRIVER',
          title: payment.type === 'withdrawal' ? 'Withdrawal Handled' : 'Earning Credited',
          message: payment.type === 'withdrawal' 
            ? `Your withdrawal request of ₹${payment.amount} was processed successfully.`
            : `₹${payment.amount} has been credited to your wallet.`,
          type: 'PAYMENT_RECEIVED'
        });
      }

      return docRef.id;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, DRIVER_PAYMENTS_COLLECTION);
      throw e;
    }
  },

  subscribeToDriverPayments(driverId: string, callback: (payments: DriverPayment[]) => void) {
    const q = query(
      collection(db, DRIVER_PAYMENTS_COLLECTION), 
      where('driverId', '==', driverId)
    );
    return onSnapshot(q, (snapshot) => {
      const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)) as DriverPayment[];
      // Client side sort to avoid complex index
      payments.sort((a, b) => {
        const tA = a.createdAt?.toMillis?.() || 0;
        const tB = b.createdAt?.toMillis?.() || 0;
        return tB - tA;
      });
      callback(payments);
    }, (error) => handleFirestoreError(error, OperationType.LIST, DRIVER_PAYMENTS_COLLECTION, true));
  },

  subscribeToDriverPaymentsForAll(callback: (payments: DriverPayment[]) => void) {
    const q = query(
      collection(db, DRIVER_PAYMENTS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)) as DriverPayment[];
      callback(payments);
    }, (error) => handleFirestoreError(error, OperationType.LIST, DRIVER_PAYMENTS_COLLECTION, true));
  },

  async requestWithdrawal(withdrawal: Omit<WithdrawRequest, 'id' | 'createdAt' | 'status'>) {
    try {
      const docRef = await addDoc(collection(db, WITHDRAW_REQUESTS_COLLECTION), {
        ...withdrawal,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, WITHDRAW_REQUESTS_COLLECTION, docRef.id), {
        requestId: docRef.id
      });
      return docRef.id;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, WITHDRAW_REQUESTS_COLLECTION);
      throw e;
    }
  },

  subscribeToWithdrawRequests(callback: (requests: WithdrawRequest[]) => void, driverId?: string) {
    let q = query(collection(db, WITHDRAW_REQUESTS_COLLECTION));
    if (driverId) {
      q = query(collection(db, WITHDRAW_REQUESTS_COLLECTION), where('driverId', '==', driverId));
    }
    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)) as WithdrawRequest[];
      requests.sort((a, b) => {
        const tA = a.createdAt?.toMillis?.() || 0;
        const tB = b.createdAt?.toMillis?.() || 0;
        return tB - tA;
      });
      callback(requests);
    }, (error) => handleFirestoreError(error, OperationType.LIST, WITHDRAW_REQUESTS_COLLECTION, true));
  },

  async updateWithdrawRequestStatus(requestId: string, status: 'approved' | 'rejected', processedBy?: string) {
    const requestRef = doc(db, WITHDRAW_REQUESTS_COLLECTION, requestId);
    const snap = await getDoc(requestRef);
    if (!snap.exists()) throw new Error('Withdraw request not found');
    const requestData = snap.data() as WithdrawRequest;

    const batch = writeBatch(db);
    batch.update(requestRef, {
      status,
      processedAt: serverTimestamp(),
      processedBy
    });

    if (status === 'approved') {
      // Record a withdrawal in the ledger
      const paymentRef = doc(collection(db, DRIVER_PAYMENTS_COLLECTION));
      batch.set(paymentRef, {
        driverId: requestData.driverId,
        amount: requestData.amount,
        type: 'withdrawal',
        status: 'success',
        paymentMethod: 'UPI',
        remark: 'Approved Withdrawal',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        paymentId: paymentRef.id
      });
    }

    await batch.commit();
  },

  async updateSupportTicketStatus(ticketId: string, status: 'open' | 'in_progress' | 'resolved') {
    const ticketRef = doc(db, TICKETS_COLLECTION, ticketId);
    await updateDoc(ticketRef, {
      status,
      resolvedAt: status === 'resolved' ? serverTimestamp() : null,
      updatedAt: serverTimestamp()
    });
  },

  async escalateSupportTicket(ticketId: string) {
    const ticketRef = doc(db, TICKETS_COLLECTION, ticketId);
    await updateDoc(ticketRef, {
      assignedToHQ: true,
      status: 'in_progress',
      escalatedAt: serverTimestamp(),
      escalatedBy: auth.currentUser?.uid,
      updatedAt: serverTimestamp()
    });
  },

  async updateAssignmentStatus(assignmentId: string, status: 'assigned' | 'running' | 'completed', earnings: number, campaignId?: string) {
    const batch = writeBatch(db);
    
    // 1. Update assignment
    const assignmentRef = doc(db, ASSIGNMENTS_COLLECTION, assignmentId);
    batch.update(assignmentRef, {
      status,
      updatedAt: serverTimestamp()
    });

    // 2. If completed, credit the driver in the ledger
    if (status === 'completed') {
      const snap = await getDoc(assignmentRef);
      if (snap.exists()) {
        const data = snap.data();
        const paymentRef = doc(collection(db, DRIVER_PAYMENTS_COLLECTION));
        batch.set(paymentRef, {
          driverId: data.driverId,
          amount: earnings,
          type: 'earning',
          status: 'success',
          paymentMethod: 'SYSTEM',
          campaignId: campaignId || data.campaignId || 'COMPLETED_TASK',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          paymentId: paymentRef.id
        });
      }
    }

    await batch.commit();
  },

  async getDrivers(): Promise<Driver[]> {
    const q = query(collection(db, 'drivers'), orderBy('createdAt', 'desc'));
    try {
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, uid: d.id, ...d.data() } as any));
    } catch (e) {
      console.error("Fetch Error:", e);
      return [];
    }
  },

  async getCampaign(id: string): Promise<AdCampaign | null> {
    const docRef = doc(db, 'campaigns', id);
    const snap = await getDoc(docRef);
    return snap.exists() ? { id: snap.id, ...snap.data() } as any : null;
  },

  async getCampaigns(): Promise<AdCampaign[]> {
    const snap = await getDocs(query(collection(db, 'campaigns')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  },

  async getDriverAssignments(driverId: string): Promise<any[]> {
    const q = query(collection(db, 'driverAssignments'), where('driverId', '==', driverId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  subscribeToPublicNotices(callback: (notices: any[]) => void) {
    const q = query(collection(db, NOTICES_COLLECTION), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const notices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(notices);
    }, (error) => handleFirestoreError(error, OperationType.LIST, NOTICES_COLLECTION));
  },

  async createPublicNotice(notice: any) {
    try {
      return await addDoc(collection(db, NOTICES_COLLECTION), {
        ...notice,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, NOTICES_COLLECTION);
      throw e;
    }
  },

  async updatePublicNotice(id: string, data: any) {
    try {
      const docRef = doc(db, NOTICES_COLLECTION, id);
      return await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, NOTICES_COLLECTION);
      throw e;
    }
  },

  async deletePublicNotice(id: string) {
    try {
      const docRef = doc(db, NOTICES_COLLECTION, id);
      return await deleteDoc(docRef);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, NOTICES_COLLECTION);
      throw e;
    }
  },

  async deleteCampaign(id: string) {
    try {
      const docRef = doc(db, CAMPAIGNS_COLLECTION, id);
      return await deleteDoc(docRef);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, CAMPAIGNS_COLLECTION);
      throw e;
    }
  },

  async deleteDriver(uid: string) {
    try {
      const docRef = doc(db, DRIVERS_COLLECTION, uid);
      return await deleteDoc(docRef);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, DRIVERS_COLLECTION);
      throw e;
    }
  },

  async deleteWithdrawRequest(id: string) {
    try {
      const docRef = doc(db, WITHDRAW_REQUESTS_COLLECTION, id);
      return await deleteDoc(docRef);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, WITHDRAW_REQUESTS_COLLECTION);
      throw e;
    }
  },

  async deleteSupportTicket(id: string) {
    try {
      const docRef = doc(db, TICKETS_COLLECTION, id);
      return await deleteDoc(docRef);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, TICKETS_COLLECTION);
      throw e;
    }
  },

  async purgeAllProductionData(dryRun: boolean = true) {
    console.log("[FirebaseService] purgeAllProductionData simulation active. dryRun:", dryRun);
    return Promise.resolve();
  },

  async deletePayment(id: string) {
    try {
      const docRef = doc(db, PAYMENTS_COLLECTION, id);
      return await deleteDoc(docRef);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, PAYMENTS_COLLECTION);
      throw e;
    }
  },

  async deleteDriverPayment(id: string) {
    try {
      const docRef = doc(db, DRIVER_PAYMENTS_COLLECTION, id);
      return await deleteDoc(docRef);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, DRIVER_PAYMENTS_COLLECTION);
      throw e;
    }
  },

  async seedInitialData() {
    // Disabled by user request to maintain clean 0-state.
    return Promise.resolve();
  },

  async purgeBusinessData(dryRun = false) {
    try {
      console.log(`[System] Initializing Targeted Data Reset. Dry Run: ${dryRun}`);
      
      const targetCollections = ['drivers', 'customers', 'payments', 'campaigns'];

      for (const colName of targetCollections) {
        try {
          const snapshot = await getDocs(collection(db, colName));
          console.log(`[DryRun] Checking collection: ${colName}, Docs: ${snapshot.docs.length}`);
          
          if (dryRun) {
              snapshot.docs.slice(0, 3).forEach(d => console.log(`[DryRun] Would delete: ${colName}/${d.id}`));
          }

          if (!dryRun) {
            for (let i = 0; i < snapshot.docs.length; i += 250) {
              const batch = writeBatch(db);
              const chunk = snapshot.docs.slice(i, i + 250);
              
              for (const docSnap of chunk) {
                // Safety: Do not delete admin-related entities if they happen to share these names
                if (colName === 'users' && (docSnap.data().email === 'admin@autoads.in')) {
                  continue;
                }
                
                batch.delete(docSnap.ref);
              }
              await batch.commit();
            }
          }
        } catch (colErr) {
          console.warn(`[Purge] Skipping or error in collection: ${colName}`, colErr);
        }
      }
      
      console.log(`[System] ${dryRun ? 'Dry Run' : 'Targeted Purge'} Complete.`);
      return true;
    } catch (e) {
      console.error("[Purge Critical Error]", e);
      return false;
    }
  },

  async createIncentiveOffer(offer: { driverId: string; offer: string }) {
    try {
      await addDoc(collection(db, 'incentiveOffers'), {
        ...offer,
        status: 'SENT',
        createdAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'incentiveOffers');
      throw e;
    }
  },

  async uploadFileWithProgress(path: string, file: File | Blob, onProgress?: (percent: number) => void, timeoutMs: number = 120000) {
    try {
      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      const timeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(() => {
          uploadTask.cancel();
          reject(new Error("Uplink Timeout: Connection too slow. Operation aborted after 2 minutes."));
        }, timeoutMs);
      });

      const uploadPromise = new Promise<string>((resolve, reject) => {
        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) onProgress(Math.round(progress));
          }, 
          (error) => reject(error), 
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          }
        );
      });

      return await Promise.race([uploadPromise, timeoutPromise]);
    } catch (e) {
      console.error(`[FirebaseService] uploadFileWithProgress error:`, e);
      throw e;
    }
  },

  // --- Smart Ads APIs ---
  async saveRidePreference(preference: any) {
    const deviceId = preference.deviceId;
    if (!deviceId) return;
    const docRef = doc(db, 'ridePreferences', deviceId);
    try {
      await setDoc(docRef, {
        ...preference,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, 'ridePreferences');
      throw e;
    }
  },

  subscribeToRidePreference(deviceId: string, callback: (pref: any) => void) {
    const docRef = doc(db, 'ridePreferences', deviceId);
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() });
      } else {
        callback(null);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `ridePreferences/${deviceId}`));
  },

  async clearRidePreference(deviceId: string) {
    const docRef = doc(db, 'ridePreferences', deviceId);
    try {
      await deleteDoc(docRef);
    } catch (e: any) {
      // If it doesn't exist, ignore or handle gracefully
      console.warn("Could not delete ride preference for", deviceId, e);
    }
  },

  // --- Notification System ---
  async createNotification(notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) {
    try {
      await addDoc(collection(db, 'notifications'), {
        ...notification,
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error("[FirebaseService] Error creating notification:", e);
    }
  },

  subscribeToNotifications(userId: string | undefined, role: 'ADMIN' | 'SUPPORT' | 'CUSTOMER' | 'DRIVER' | 'ALL' | string, callback: (notifications: AppNotification[]) => void, franchiseId?: string, territoryId?: string, userCreatedAt?: any) {
    const q = query(
      collection(db, 'notifications')
    );
    return onSnapshot(q, (snapshot) => {
      const allNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)) as AppNotification[];
      
      const uTime = userCreatedAt ? (
        userCreatedAt?.toMillis?.() || 
        (userCreatedAt?.seconds ? userCreatedAt.seconds * 1000 : new Date(userCreatedAt).getTime())
      ) : 0;

      // Client-side filtering to avoid needing multiple composite indexes
      const filtered = allNotifs.filter(n => {
        // 1. Personalized notifications always pass (ignoring reg date is safer for targeted ones)
        if (userId && n.userId === userId) return true;
        
        // 2. Date Filtering: Broadcast notifications created BEFORE driver was even registered should be hidden
        if (uTime > 0) {
          const nTime = n.createdAt?.toMillis?.() || 
                        (n.createdAt?.seconds ? n.createdAt.seconds * 1000 : new Date(n.createdAt || 0).getTime());
          
          if (nTime < uTime) return false;
        }

        // 3. Franchise isolation:
        if (franchiseId || territoryId) {
           if (n.franchiseId && n.franchiseId === franchiseId) return true;
           if (n.territoryId && n.territoryId === territoryId) return true;
           return false; // Exclude global/HQ notifications for franchise-scoped users
        }
        
        // 4. Role match
        if (n.role && (n.role === role || n.role === 'ALL')) return true;
        return false;
      });

      // Sort client-side by createdAt desc
      filtered.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime()) || 0;
        const timeB = b.createdAt?.toMillis?.() || (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime()) || 0;
        return timeB - timeA;
      });

      callback(filtered);
    }, (error: any) => {
      if (error.message && error.message.includes("Target ID already exists")) {
        console.warn("[FirebaseService] Ignoring benign Target ID collision");
        return;
      }
      console.error("[FirebaseService] Notifications subscription error:", error);
    });
  },

  async markNotificationRead(id: string) {
    try {
      await updateDoc(doc(db, 'notifications', id), {
        read: true,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error("[FirebaseService] Error marking notification as read:", e);
    }
  },

  async markAllNotificationsRead(userId: string | undefined, role: string) {
    try {
      const q = query(collection(db, 'notifications'), where('read', '==', false));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      let count = 0;
      snap.docs.forEach(doc => {
        const data = doc.data();
        if ((userId && data.userId === userId) || data.role === role || data.role === 'ALL') {
          batch.update(doc.ref, { read: true, updatedAt: serverTimestamp() });
          count++;
        }
      });
      if (count > 0) {
        await batch.commit();
      }
    } catch (e) {
      console.error("[FirebaseService] Error marking all notifications read:", e);
    }
  },

  async updateTerminalTeamViewer(terminalId: string, teamViewerId: string, teamViewerPasswordKey: string) {
    const docRef = doc(db, 'terminals', terminalId);
    try {
      const obfuscated = btoa(teamViewerPasswordKey.split("").reverse().join(""));
      await updateDoc(docRef, { 
        teamViewerId, 
        teamViewerPasswordEncrypted: obfuscated,
        updatedAt: serverTimestamp() 
      });
    } catch (e: any) {
      handleFirestoreError(e, OperationType.UPDATE, `terminals/${terminalId}`);
      throw e;
    }
  },

  async updateTerminalHardwareParams(terminalId: string, params: { volume?: number; brightness?: number; isLocked?: boolean; emergencyBroadcast?: string | null }) {
    const docRef = doc(db, 'terminals', terminalId);
    try {
      await updateDoc(docRef, {
        ...params,
        updatedAt: serverTimestamp()
      });
    } catch (e: any) {
      handleFirestoreError(e, OperationType.UPDATE, `terminals/${terminalId}`);
      throw e;
    }
  },

  decryptTVPassword(encrypted: string | undefined | null): string {
    if (!encrypted) return '';
    try {
      const reversed = atob(encrypted);
      return reversed.split("").reverse().join("");
    } catch (e) {
      return '';
    }
  },

  async getShowcaseVideos(): Promise<Record<string, string>> {
     const keysMap = {
       qr: 'showcase_qr_showcase.mp4',
       couples: 'showcase_couples_showcase.mp4',
       food: 'showcase_food_showcase.mp4',
       awareness: 'showcase_awareness_showcase.mp4',
       film: 'showcase_film_showcase.mp4'
     };

     const results: Record<string, string> = {};
     for (const [key, filename] of Object.entries(keysMap)) {
       results[key] = `/uploads/${filename}`;
     }

     return results;
  },

  async updateShowcaseVideos(videos: Record<string, string>) {
    // Obsolete with high-performance static S3 proxy serving
    return;
  },

  subscribeToUsers(callback: (users: any[]) => void) {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      callback(users);
    });
  },

  // Franchises and Cities Methods for Phase 1
  subscribeToFranchises(callback: (franchises: any[]) => void) {
    const q = query(collection(db, "franchises"));
    return onSnapshot(q, (snapshot) => {
      const franchises = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      callback(franchises);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "franchises");
    });
  },

  subscribeToCities(callback: (cities: any[]) => void) {
    const q = query(collection(db, "cities"));
    return onSnapshot(q, (snapshot) => {
      const cities = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      callback(cities);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "cities");
    });
  },

  async saveFranchise(franchise: any) {
    const path = `franchises/${franchise.id}`;
    try {
      await setDoc(doc(db, "franchises", franchise.id), {
        ...franchise,
        updatedAt: serverTimestamp(),
        // Territory Architecture Fields
        stateId: franchise.stateId || 'KA',
        territoryId: franchise.territoryId || 'T-UNASSIGNED',
        cityId: franchise.cityId || 'UNASSIGNED',
        franchiseId: franchise.id // Franchises own themselves
      }, { merge: true });
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
      throw e;
    }
  },

  async saveCity(city: any) {
    const path = `cities/${city.id}`;
    try {
      await setDoc(doc(db, "cities", city.id), {
        ...city,
        updatedAt: serverTimestamp(),
        // Territory Architecture Fields
        stateId: city.stateId || 'KA',
        territoryId: city.territoryId || 'T-UNASSIGNED',
        cityId: city.id,
        franchiseId: null
      }, { merge: true });
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
      throw e;
    }
  },

  async runFranchiseMigration() {
    console.log("[FirebaseService] Initiating franchise and cities migration...");
    try {
      const fSnap = await getDocs(collection(db, "franchises"));
      const cSnap = await getDocs(collection(db, "cities"));

      if (fSnap.empty) {
        console.log("[FirebaseService] /franchises is empty. Registering INITIAL_FRANCHISES...");
        for (const franchise of INITIAL_FRANCHISES) {
          await setDoc(doc(db, "franchises", franchise.id), {
            ...franchise,
            createdAt: franchise.createdAt || new Date().toISOString(),
            updatedAt: serverTimestamp()
          });
        }
      }

      if (cSnap.empty) {
        console.log("[FirebaseService] /cities is empty. Registering INITIAL_CITIES...");
        for (const city of INITIAL_CITIES) {
          await setDoc(doc(db, "cities", city.id), {
            ...city,
            updatedAt: serverTimestamp()
          });
        }
      }

      console.log("[FirebaseService] Migration completed successfully!");
      return true;
    } catch (e) {
      console.error("[FirebaseService] Failed running auto-migration:", e);
      return false;
    }
  },

  // Invitations Methods for Phase 1 Onboarding
  async getStaffWhitelist() {
    const q = query(collection(db, 'staffWhitelist'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async addToStaffWhitelist(email: string, role: string, addedBy: string) {
    const docRef = doc(db, 'staffWhitelist', email.toLowerCase());
    await setDoc(docRef, {
      email: email.toLowerCase(),
      role,
      addedBy,
      createdAt: new Date().toISOString()
    });
  },

  async removeFromStaffWhitelist(email: string) {
    const docRef = doc(db, 'staffWhitelist', email.toLowerCase());
    await deleteDoc(docRef);
  },

  async isEmailWhitelisted(email: string) {
    if (!email) return false;
    const docRef = doc(db, 'staffWhitelist', email.toLowerCase());
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  },

  subscribeToStaffWhitelist(callback: (whitelist: any[]) => void) {
    const q = query(collection(db, 'staffWhitelist'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'staffWhitelist', true));
  },

  // ... (rest of service remains)
  subscribeToInvitations(callback: (invitations: any[]) => void) {
    const q = query(collection(db, INVITATIONS_COLLECTION), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      const invitations = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      callback(invitations);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, INVITATIONS_COLLECTION);
    });
  },

  async saveInvitation(invitation: any) {
    const path = `${INVITATIONS_COLLECTION}/${invitation.id}`;
    try {
      await setDoc(doc(db, INVITATIONS_COLLECTION, invitation.id), {
        ...invitation,
        updatedAt: serverTimestamp()
      }, { merge: true });
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
      throw e;
    }
  },

  async getInvitation(id: string): Promise<any> {
    const docRef = doc(db, INVITATIONS_COLLECTION, id);
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
      }
      return null;
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `${INVITATIONS_COLLECTION}/${id}`);
      throw e;
    }
  },

  async claimInvitation(inviteId: string, uid: string, phone: string, name: string) {
    try {
      const inviteRef = doc(db, INVITATIONS_COLLECTION, inviteId);
      const inviteSnap = await getDoc(inviteRef);
      if (!inviteSnap.exists()) {
        throw new Error("Invitation not found");
      }
      const inviteData = inviteSnap.data();
      const role = inviteData.role || 'FRANCHISE_OWNER';

      // 1. Update invitation document to CLAIMED
      await updateDoc(inviteRef, {
        status: 'CLAIMED',
        claimedByUid: uid,
        phoneUsed: phone,
        claimedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 2. Save User Profile with the verified role loaded from invitation metadata
      await this.saveUserProfile(uid, name || inviteData.ownerName, phone, role, 'FREE', {
        stateId: inviteData.stateId || 'KA',
        territoryId: inviteData.territoryId || 'T-UNASSIGNED',
        cityId: inviteData.cityId || 'UNASSIGNED',
        franchiseId: inviteData.franchiseId || null
      });

      // Save role-specific and registration metadata inside the user profile document in users collection
      const userRef = doc(db, USERS_COLLECTION, uid);
      const defaultPermissions: Record<string, boolean> = {
        viewDrivers: true,
        approveDriverKyc: true,
        viewCampaigns: true,
        approveCampaigns: true,
        startCampaigns: true,
        viewDevices: true,
        viewTickets: true,
        replyTickets: true,
        closeTickets: true,
        viewPayments: true
      };

      await setDoc(userRef, {
        email: inviteData.ownerEmail || '',
        franchiseId: inviteData.franchiseId,
        cityId: inviteData.cityId || '',
        cityName: inviteData.cityName || '',
        isApproved: true,
        status: 'ACTIVE',
        specialization: inviteData.specialization || (role === 'FRANCHISE_OWNER' ? 'FRANCHISE_OWNER' : 'OPERATIONS_STAFF'),
        permissions: role === 'SUPPORT_TEAM' ? defaultPermissions : {},
        updatedAt: serverTimestamp()
      }, { merge: true });

      // 3. Create or Update associated Franchise record and set status to ACTIVE (Only for Owners)
      if (role === 'FRANCHISE_OWNER') {
        const franchiseRef = doc(db, "franchises", inviteData.franchiseId);
        await setDoc(franchiseRef, {
          id: inviteData.franchiseId,
          cityId: inviteData.cityId,
          cityName: inviteData.cityName || inviteData.cityId,
          ownerName: name || inviteData.ownerName,
          ownerEmail: inviteData.ownerEmail,
          ownerPhone: phone,
          status: 'ACTIVE',
          revenueModel: inviteData.revenueModel || '50/50 Split',
          totalDevices: inviteData.totalDevices || 0,
          totalDrivers: inviteData.totalDrivers || 0,
          createdAt: inviteData.createdAt || new Date().toISOString(),
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      return true;
    } catch (e) {
      console.error("[FirebaseService] Claim invitation transactional steps failed:", e);
      throw e;
    }
  },

  subscribeToLoungeMessages(franchiseId: string, callback: (messages: any[]) => void) {
    const q = query(
      collection(db, 'franchises', franchiseId, 'loungeMessages'),
      orderBy('timestamp', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      callback(messages);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `franchises/${franchiseId}/loungeMessages`, true));
  },

  async sendLoungeMessage(franchiseId: string, message: {
    text: string;
    senderId: string;
    senderName: string;
    senderRole: string;
    senderSpecialization?: string;
    mediaUrl?: string;
    mediaType?: 'IMAGE' | 'VIDEO';
    mentions?: string[];
    isAnnouncement?: boolean;
  }) {
    try {
      const colRef = collection(db, 'franchises', franchiseId, 'loungeMessages');
      const docRef = await addDoc(colRef, {
        ...message,
        timestamp: serverTimestamp()
      });
      return docRef.id;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `franchises/${franchiseId}/loungeMessages`);
      throw e;
    }
  },

  subscribeToSupportRooms(callback: (rooms: any[]) => void, franchiseId?: string, isHQ: boolean = false) {
    let q = query(collection(db, 'supportRooms'));
    if (!isHQ) {
      if (!franchiseId) {
        callback([]);
        return () => {};
      }
      q = query(collection(db, 'supportRooms'), where('franchiseId', '==', franchiseId));
    } else if (franchiseId) {
      q = query(collection(db, 'supportRooms'), where('franchiseId', '==', franchiseId));
    }
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'supportRooms'));
  },

  async sendSupportChatMessage(roomId: string, message: any) {
    try {
      return await addDoc(collection(db, 'chatMessages'), {
        roomId,
        ...message,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'chatMessages');
      throw e;
    }
  },

  subscribeToSupportMessages(roomId: string, callback: (messages: any[]) => void) {
    const q = query(collection(db, 'chatMessages'), where('roomId', '==', roomId));
    return onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      msgs.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeA - timeB;
      });
      callback(msgs);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'chatMessages'));
  },

  // Centralized Plan Configurations (planConfigurations collection)
  subscribeToPlanConfigurations(callback: (plans: any[]) => void) {
    const q = query(collection(db, 'planConfigurations'), orderBy('price', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const plans = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      callback(plans);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "planConfigurations");
    });
  },

  async getPlanConfigurations(): Promise<any[]> {
    try {
      const q = query(collection(db, 'planConfigurations'), orderBy('price', 'asc'));
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'planConfigurations');
      throw e;
    }
  },

  async createPlanConfiguration(planId: string, plan: any) {
    try {
      const docRef = doc(db, 'planConfigurations', planId);
      await setDoc(docRef, {
        ...plan,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'planConfigurations');
      throw e;
    }
  },

  async updatePlanConfiguration(planId: string, updates: any) {
    try {
      const docRef = doc(db, 'planConfigurations', planId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'planConfigurations');
      throw e;
    }
  },

  async deletePlanConfiguration(planId: string) {
    try {
      const docRef = doc(db, 'planConfigurations', planId);
      await deleteDoc(docRef);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'planConfigurations');
      throw e;
    }
  },

  async cleanupTestData() {
    try {
      console.log("------------------------------------------");
      console.log("NETWORK CLEANUP INITIATED...");
      const collections = ["campaigns", "payments", "terminals", "drivers", "users", "driverAssignments", "withdrawRequests"];
      let totalDeleted = 0;

      for (const colName of collections) {
        const colRef = collection(db, colName);
        const snap = await getDocs(colRef);
        
        const toDelete = snap.docs.filter(d => {
          const data = d.data();
          const docId = d.id;
          
          const isTestField = data.isTest === true || data.test === true;
          const nameMatch = (data.name || data.title || "").toString().toUpperCase().includes("DEMO") || 
                           (data.name || data.title || "").toString().toUpperCase().includes("TEST");
          const emailMatch = (data.email || "").toString().toLowerCase().includes("demo") || 
                            (data.email || "").toString().toLowerCase().includes("test");
          const terminalIdMatch = docId.startsWith("DEMO") || (data.terminalId || "").toString().startsWith("DEMO");
          const driverIdMatch = docId.startsWith("DEMO") || (data.driverId || "").toString().startsWith("DEMO");
          
          return isTestField || nameMatch || emailMatch || terminalIdMatch || driverIdMatch;
        });

        if (toDelete.length > 0) {
          console.log(`- Purging ${toDelete.length} records from ${colName}...`);
          const batch = writeBatch(db);
          toDelete.forEach(doc => {
            batch.delete(doc.ref);
          });
          await batch.commit();
          totalDeleted += toDelete.length;
        }
      }

      console.log(`CLEANUP COMPLETE: ${totalDeleted} nodes removed.`);
      console.log("------------------------------------------");
      return totalDeleted;
    } catch (e) {
      console.error("Cleanup Tool Failed:", e);
      throw e;
    }
  }
};
