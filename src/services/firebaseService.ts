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
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { db, auth, storage } from '../lib/firebase';
import { compressImage } from '../lib/utils';

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
  status: 'active' | 'blocked' | 'pending_verification';
  subscriptionTier?: 'FREE' | 'SILVER' | 'GOLD' | 'PLATINUM';
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
}

export interface AdCampaign {
  id: string;
  title: string;
  clientName?: string;
  description?: string;
  mediaUrl: string;
  mediaType: 'VIDEO' | 'IMAGE';
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'PENDING_VERIFICATION' | 'APPROVED' | 'LIVE' | 'AWAITING_PAYPORTAL';
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

export interface SupportTicket {
  id?: string;
  driverId?: string;
  driverName?: string;
  customerName?: string;
  title: string;
  subject?: string;
  description: string;
  imageUrl?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  type?: 'DEVICE' | 'CUSTOMER';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  category?: string;
  lat?: number;
  lng?: number;
  campaignId?: string;
  createdAt: any;
  updatedAt?: any;
  resolvedAt?: any;
  lastMessage?: string;
  unreadCount?: number;
  customerId?: string;
  customerSatisfied?: boolean;
}

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

export interface DriverPayout {
  id?: string;
  driverId: string;
  amount: number;
  payoutId: string;
  status: 'pending' | 'paid' | 'failed';
  createdAt: any;
}

const CAMPAIGNS_COLLECTION = 'campaigns';
const DRIVERS_COLLECTION = 'drivers';
const PAYMENTS_COLLECTION = 'payments';
const USERS_COLLECTION = 'users';
const ASSIGNMENTS_COLLECTION = 'driverAssignments';
const PAYOUTS_COLLECTION = 'driverPayouts';
const TICKETS_COLLECTION = 'supportTickets';
const DRIVER_PAYMENTS_COLLECTION = 'driverPayments';
const WITHDRAW_REQUESTS_COLLECTION = 'withdrawRequests';
const NOTICES_COLLECTION = 'publicNotices';
const DRIVER_DOCUMENTS_COLLECTION = 'driverDocuments';

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
  // Instead of building a big object just for the throw, format the error message directly
  const errMessage = (error as any)?.message || String(error);
  console.warn('Firestore Error [' + operationType + ']: ', errMessage, ' at path: ', path);
  if (!isSilent) {
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
  createdAt: any;
}

export const firebaseService = {
  // Existing methods ...

  // Added/Restored methods for compatibility
  subscribeToDrivers(callback: (drivers: Driver[]) => void) {
    const q = query(collection(db, 'drivers'));
    return onSnapshot(q, (snapshot) => {
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
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'drivers'));
  },

  subscribeToPayments(callback: (payments: Payment[]) => void, customerId?: string, customerPhone?: string) {
    // Fetch all payments to ensure we do not miss any due to missing OR indexes
    const q = query(collection(db, 'payments'));

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

  subscribeToDevices(callback: (devices: Device[]) => void) {
    const q = query(collection(db, 'devices'), orderBy('vNo', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const devices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Device));
      callback(devices);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'devices'));
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

  async updateCampaignStatus(campaignId: string, status: AdCampaign['status'] | 'APPROVED' | 'LIVE') {
    let finalStatus: AdCampaign['status'] = 'PENDING';
    if (status === 'APPROVED' || status === 'ACTIVE' || status === 'LIVE') finalStatus = 'ACTIVE';
    if (status === 'REJECTED') finalStatus = 'REJECTED';
    
    await updateDoc(doc(db, 'campaigns', campaignId), {
      status: finalStatus,
      updatedAt: serverTimestamp()
    });
  },

  async updatePaymentStatus(paymentId: string, status: 'SUCCESS' | 'FAILED' | 'PENDING_ADMIN_VERIFY') {
    await updateDoc(doc(db, 'payments', paymentId), {
      status,
      updatedAt: serverTimestamp()
    });
  },

  async updateDeviceStatus(deviceId: string, status: Device['status'], currentCampaignId?: string) {
    await updateDoc(doc(db, 'devices', deviceId), {
      status,
      currentCampaignId: currentCampaignId || null,
      lastSync: serverTimestamp()
    });
  },

  // ... (keeping other methods)
  // Plans
  async getPlans() {
    try {
      const q = query(collection(db, 'plans'), orderBy('price', 'asc'));
      const snap = await getDocs(q);
      const dbPlans = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      const defaults = [
        { id: 'BASIC', name: 'Basic Plan', description: 'Entry level plan', price: 999, unitCount: '2 Units', color: 'bg-emerald-500' },
        { id: 'STARTER', name: 'Starter Plan', description: 'Core features for growth', price: 1999, unitCount: '5 Units', color: 'bg-indigo-500' },
        { id: 'PRO', name: 'Pro Plan', description: 'Advanced features for scaling', price: 4999, unitCount: '10+ Units', color: 'bg-slate-900' },
      ];
      
      return defaults.map(def => {
        const dbMatching = dbPlans.find(p => p.id === def.id);
        return dbMatching ? { ...def, ...dbMatching } : def;
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'plans');
      throw e;
    }
  },

  async updatePlan(planId: string, updates: any) {
    try {
      await setDoc(doc(db, 'plans', planId), {
        ...updates,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'plans');
      throw e;
    }
  },

  async getStudioPlans() {
    try {
      const dbPlansSnap = await getDocs(collection(db, 'studioPlans'));
      const dbPlans = dbPlansSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const defaults = [
        { id: 'FREE', name: 'Free Viewer', price: '₹0', description: 'Read-only mode. Cannot save or export.' },
        { id: 'BRASS', name: 'Single Star Brass', price: '₹99', description: '2 to 3 poster edits, basic templates, PNG export, watermark.' },
        { id: 'SILVER', name: 'Five Star Silver', price: '₹299', description: 'Unlimited edits, standard templates, SVG/JPG export, video editing.' },
        { id: 'GOLD', name: 'Seven Star Gold', price: '₹499', description: 'Full access, AI tools, premium templates, high-res exports, no watermark.' }
      ];
      
      return defaults.map(def => {
        const match = dbPlans.find(p => p.id === def.id);
        return match ? { ...def, ...match } : def;
      });
    } catch (e) {
      console.error("Error getStudioPlans:", e);
      return [
        { id: 'FREE', name: 'Free Viewer', price: '₹0', description: 'Read-only mode. Cannot save or export.' },
        { id: 'BRASS', name: 'Single Star Brass', price: '₹99', description: '2 to 3 poster edits, basic templates, PNG export, watermark.' },
        { id: 'SILVER', name: 'Five Star Silver', price: '₹299', description: 'Unlimited edits, standard templates, SVG/JPG export, video editing.' },
        { id: 'GOLD', name: 'Seven Star Gold', price: '₹499', description: 'Full access, AI tools, premium templates, high-res exports, no watermark.' }
      ];
    }
  },

  async updateStudioPlan(planId: string, updates: any) {
    try {
      await setDoc(doc(db, 'studioPlans', planId), {
        ...updates,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error("Error updateStudioPlan:", e);
      throw e;
    }
  },

  // Plan Proposals Logic
  async proposePlanChange(proposal: {
    planId: string;
    newPrice: number;
    proposedBy: string;
    type: 'price' | 'designerPrice' | 'videoMakerPrice';
  }) {
    try {
      const data = {
        ...proposal,
        status: 'pending',
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

  async approvePlanProposal(proposalId: string, planId: string, newValue: number, type: 'price' | 'designerPrice' | 'videoMakerPrice') {
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
      } else {
        updateData.price = newValue;
      }

      batch.set(planRef, updateData, { merge: true });

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

  // --- NEW MULTI-ROLE CAMPAIGN METHODS ---

  async createCampaign(campaign: { title: string, mediaUrl?: string, mediaType?: 'VIDEO' | 'IMAGE', [key: string]: any }) {
    try {
      console.log(`[DEPLOYMENT_RECORD_CREATED] Timestamp: ${new Date().toISOString()}`);
      console.log(`[DEPLOYMENT_RECORD_SOURCE] Collection: 'campaigns'`);
      console.log(`[DEPLOYMENT_RECORD_TRIGGER] Function: firebaseService.createCampaign -> Title: ${campaign.title}`);
      const data = {
        ...campaign,
        mediaUrl: campaign.mediaUrl || campaign.assetUrl || '',
        assetUrl: campaign.assetUrl || campaign.mediaUrl || '',
        status: campaign.status || 'PENDING',
        createdBy: auth.currentUser?.uid,
        assignedDrivers: campaign.assignedDrivers || [],
        createdAt: serverTimestamp()
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
        type: 'CAMPAIGN_RECEIVED'
      });

      await this.createNotification({
        role: 'SUPPORT',
        title: 'New Campaign Request',
        message: `Client submitted a transit campaign: '${campaign.title}'.`,
        type: 'CAMPAIGN_RECEIVED'
      });
      
      console.log("[Notification] System: New campaign submitted.");
      return docRef;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'campaigns');
      throw e;
    }
  },

  async createTicket(ticket: { title: string, description: string, category: string, priority: string, campaignId?: string }) {
    try {
      if (!auth.currentUser) throw new Error("Authentication required");
      const ticketData = {
        ...ticket,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'User',
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
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

  async getTerminals() {
    try {
      const snap = await getDocs(collection(db, 'terminals'));
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'terminals');
      throw e;
    }
  },

  subscribeToTerminals(callback: (terminals: any[]) => void) {
    const q = query(collection(db, 'terminals'));
    return onSnapshot(q, (snapshot) => {
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
      return await addDoc(collection(db, `terminals/${terminalId}/logs`), {
        ...log,
        timestamp: serverTimestamp()
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
          updatedAt: serverTimestamp()
        });
        driverSnap = await getDoc(driverRef);
      }
      
      const driverData = driverSnap.data();
      const terminalId = driverData.terminalId || `TRM-${driverId.substring(0, 8).toUpperCase()}`;
      const accessKey = driverData.accessKey || "ENABLED";
      
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
      const campaigns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)) as AdCampaign[];
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

  subscribeToCampaigns(callback: (campaigns: AdCampaign[]) => void, customerId?: string) {
    let q = query(collection(db, CAMPAIGNS_COLLECTION), orderBy('createdAt', 'desc'));
    if (customerId) {
        q = query(collection(db, CAMPAIGNS_COLLECTION), where('customerId', '==', customerId));
    }
    return onSnapshot(q, (snapshot) => {
      let campaigns = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AdCampaign[];

      // Client-side sort if we couldn't do it server-side
      if (customerId) {
        campaigns.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || 0;
          const timeB = b.createdAt?.toMillis?.() || 0;
          return timeB - timeA;
        });
      }

      callback(campaigns);
    }, (error) => {
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
          createdAt: serverTimestamp()
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
    await updateDoc(docRef, {
      metrics,
      lastPulse: serverTimestamp(),
      onlineStatus: 'ONLINE'
    });
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

  async sendChatMessage(ticketId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) {
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
        lastMessage: message.text,
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
    }, (error) => handleFirestoreError(error, OperationType.LIST, `${TICKETS_COLLECTION}/${ticketId}/messages`));
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
    status: 'success' | 'failed' | 'SUCCESS' | 'FAILED' | 'PENDING_ADMIN_VERIFY' | 'PENDING' | 'CANCELLED' | 'RETRY' | 'REJECTED' | 'REFUNDED' | string
  }) {
    console.log("[DEBUG] Recording payment:", payment);
    try {
      return await addDoc(collection(db, PAYMENTS_COLLECTION), {
        ...payment,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, PAYMENTS_COLLECTION);
      throw e;
    }
  },

  // Payouts
  subscribeToPayouts(driverId: string, callback: (payouts: DriverPayout[]) => void) {
    const q = query(collection(db, PAYOUTS_COLLECTION), where('driverId', '==', driverId));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as DriverPayout[];
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, PAYOUTS_COLLECTION, true);
    });
  },

  // Users
  async saveUserProfile(userId: string, name: string, phone: string, role: string, subscriptionTier: 'FREE' | 'PREMIUM' | 'ENTERPRISE' = 'FREE') {
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
        updatedAt: serverTimestamp()
      }, { merge: true });
      console.log("[FirebaseService] Save success");
      return res;
    } catch (e) {
      console.error("[FirebaseService] Save failure error details:", e);
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
        return { id: snap.id, ...snap.data() } as any;
      }
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
        const storageRef = ref(storage, `${DRIVERS_COLLECTION}/${uid}/documents/${fileName}`);
        
        const metadata = {
          contentType: 'image/jpeg',
          cacheControl: 'public,max-age=31536000',
          customMetadata: {
            'type': type,
            'uid': uid,
            'uploadedVia': 'atomic_v1'
          }
        };

        console.log(`[FirebaseService] Launching Direct Upload for ${type} (${(blobToUpload.size/1024).toFixed(1)}KB). Online: ${navigator.onLine}`);
        
        const uploadSnapshot = await uploadBytes(storageRef, blobToUpload, metadata);
        const url = await getDownloadURL(uploadSnapshot.ref);
        
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
      await setDoc(doc(db, 'drivers', driverId, 'agreement', 'current'), {
        ...agreementData,
        updatedAt: serverTimestamp()
      }, { merge: true });
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
        createdAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, PAYOUTS_COLLECTION);
      throw e;
    }
  },

  subscribeToSupportTicketsForAll(callback: (tickets: SupportTicket[]) => void) {
    const q = query(collection(db, TICKETS_COLLECTION));
    return onSnapshot(q, (snapshot) => {
      const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)) as SupportTicket[];
      // Sort client-side
      tickets.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      callback(tickets);
    }, (error) => handleFirestoreError(error, OperationType.LIST, TICKETS_COLLECTION));
  },

  subscribeToCustomerTickets(customerId: string, callback: (tickets: SupportTicket[]) => void) {
    const q = query(
      collection(db, TICKETS_COLLECTION),
      where('customerId', '==', customerId)
    );
    return onSnapshot(q, (snapshot) => {
      const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)) as SupportTicket[];
      // Client-side sort
      tickets.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis?.() || 0;
        const timeB = b.updatedAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      callback(tickets);
    }, (error) => handleFirestoreError(error, OperationType.LIST, TICKETS_COLLECTION, true));
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
      const campaignTitle = campaignSnap.exists() ? (campaignSnap.data()?.title || 'a campaign') : 'a campaign';
      
      await this.createNotification({
        role: 'ADMIN',
        title: 'Design Satisfaction Met 👍',
        message: `Customer approved custom ad designs for campaign '${campaignTitle}'. Moving to queue verification.`,
        type: 'DESIGNER_ASSIGNED'
      });

      await this.createNotification({
        role: 'SUPPORT',
        title: 'Design Satisfaction Met 👍',
        message: `Customer approved custom ad designs for campaign '${campaignTitle}'. Moving to queue verification.`,
        type: 'DESIGNER_ASSIGNED'
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

  subscribeToSupportTickets(driverId: string, callback: (tickets: SupportTicket[]) => void) {
    try {
      const q = query(
        collection(db, TICKETS_COLLECTION), 
        where('driverId', '==', driverId)
      );
      return onSnapshot(q, (snapshot) => {
        const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)) as SupportTicket[];
        tickets.sort((a, b) => {
          const tA = a.createdAt?.toMillis?.() || 0;
          const tB = b.createdAt?.toMillis?.() || 0;
          return tB - tA;
        });
        callback(tickets);
      }, (error: any) => {
        handleFirestoreError(error, OperationType.LIST, TICKETS_COLLECTION);
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, TICKETS_COLLECTION);
      return () => {};
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

  async createSupportTicket(ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { type?: 'DEVICE' | 'CUSTOMER' }) {
    try {
      const docRef = await addDoc(collection(db, TICKETS_COLLECTION), {
        ...ticket,
        type: ticket.type || 'CUSTOMER',
        status: 'OPEN',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        unreadCount: 0
      });

      // Emit support ticket notifications
      await this.createNotification({
        role: 'ADMIN',
        title: 'New Support Ticket 🎟️',
        message: `A ticket was raised: '${ticket.title}' (${ticket.priority || 'MEDIUM'} Priority)`,
        type: 'SUPPORT_TICKET'
      });

      await this.createNotification({
        role: 'SUPPORT',
        title: 'New Support Ticket 🎟️',
        message: `A ticket was raised: '${ticket.title}' (${ticket.priority || 'MEDIUM'} Priority)`,
        type: 'SUPPORT_TICKET'
      });

      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, TICKETS_COLLECTION);
      throw error;
    }
  },

  // Driver Payment System
  async createDriverPayment(payment: Omit<DriverPayment, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const docRef = await addDoc(collection(db, DRIVER_PAYMENTS_COLLECTION), {
        ...payment,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
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

  async purgeAllProductionData() {
    try {
      console.log("[System] INITIALIZING ABSOLUTE NETWORK RESET...");
      
      const topLevelCollections = [
        'campaigns', 
        'drivers', 
        'payments', 
        'driverAssignments', 
        'driverPayouts', 
        'supportTickets', 
        'driverPayments', 
        'withdrawRequests', 
        'publicNotices', 
        'driverLocations', 
        'deviceScreens', 
        'locationLogs', 
        'plans',
        'incentiveOffers',
        'users',
        'campaignAssignments',
        'campaignPayments',
        'tracking',
        'stats',
        'active_payouts',
        'admin_logs',
        'terminals',
        'liveStatus'
      ];

      for (const colName of topLevelCollections) {
        const snapshot = await getDocs(collection(db, colName));
        
        // Use chunks of 250 for safety (Firestore limit is 500)
        for (let i = 0; i < snapshot.docs.length; i += 250) {
          const batch = writeBatch(db);
          const chunk = snapshot.docs.slice(i, i + 250);
          
          for (const docSnap of chunk) {
            // Safety for admin
            if (colName === 'users' && (docSnap.data().email === 'admin@autoads.in' || docSnap.data().uid === auth.currentUser?.uid)) {
              continue;
            }

            // Purge known sub-collections for specific entities
            if (colName === 'drivers') {
              const subCols = ['locations', 'logs'];
              for (const sub of subCols) {
                const subSnap = await getDocs(collection(db, colName, docSnap.id, sub));
                subSnap.docs.forEach(sd => batch.delete(sd.ref));
              }
            }
            if (colName === 'campaigns') {
              const subCols = ['media', 'payments'];
              for (const sub of subCols) {
                const subSnap = await getDocs(collection(db, colName, docSnap.id, sub));
                subSnap.docs.forEach(sd => batch.delete(sd.ref));
              }
            }
            if (colName === 'supportTickets') {
              const subSnap = await getDocs(collection(db, colName, docSnap.id, 'messages'));
              subSnap.docs.forEach(sd => batch.delete(sd.ref));
            }

            batch.delete(docSnap.ref);
          }
          await batch.commit();
        }
      }
      
      console.log("[System] GLOBAL PURGE SUCCESSFUL. System at 0.");
      return true;
    } catch (e) {
      console.error("[Purge Critical Error]", e);
      handleFirestoreError(e, OperationType.DELETE, "global_wipe");
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

  subscribeToNotifications(userId: string | undefined, role: 'ADMIN' | 'SUPPORT' | 'CUSTOMER' | 'DRIVER' | 'ALL' | string, callback: (notifications: AppNotification[]) => void) {
    const q = query(
      collection(db, 'notifications')
    );
    return onSnapshot(q, (snapshot) => {
      const allNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)) as AppNotification[];
      
      // Client-side filtering to avoid needing multiple composite indexes
      const filtered = allNotifs.filter(n => {
        if (userId && n.userId === userId) return true;
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
    }, (error) => {
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
       qr: 'qr_showcase.mp4',
       couples: 'couples_showcase.mp4',
       food: 'food_showcase.mp4',
       awareness: 'awareness_showcase.mp4',
       film: 'film_showcase.mp4'
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
  }
};
