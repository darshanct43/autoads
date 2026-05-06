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
  getDocFromServer,
  getDocsFromServer,
  writeBatch,
  orderBy,
  deleteDoc,
  collectionGroup as firestoreCollectionGroup
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
  rcNumber?: string;
  dlNumber?: string;
  aadharNumber?: string;
  deviceId?: string;
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
  vNo?: string;
  city?: string;
  aadharPhoto?: string;
  rcPhoto?: string;
  dlPhoto?: string;
}

export interface AdCampaign {
  id: string;
  title: string;
  clientName?: string;
  description?: string;
  mediaUrl: string;
  mediaType: 'VIDEO' | 'IMAGE';
  status: 'PENDING' | 'ACTIVE' | 'REJECTED';
  durationDays?: number;
  hoursPerDay?: number;
  maxAutos?: number;
  targetArea?: string;
  createdBy: string;
  approvedBy?: string;
  assignedDrivers: string[];
  createdAt: any;
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
  driverId: string;
  driverName?: string;
  title: string;
  subject?: string;
  description: string;
  imageUrl?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  type?: 'DEVICE' | 'CUSTOMER';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  category?: string;
  createdAt: any;
  updatedAt?: any;
  resolvedAt?: any;
  lastMessage?: string;
  unreadCount?: number;
}

export interface ChatMessage {
  id?: string;
  senderId: string;
  senderName: string;
  senderRole: 'driver' | 'admin' | 'staff';
  text: string;
  timestamp: any;
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
  }
  console.warn('Firestore Error [' + operationType + ']: ', JSON.stringify(errInfo));
  if (!isSilent) {
    throw new Error(JSON.stringify(errInfo));
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
  campaignId: string;
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

  subscribeToPayments(callback: (payments: Payment[]) => void, customerId?: string) {
    let q = query(collection(db, 'payments'), orderBy('createdAt', 'desc'));
    if (customerId) {
      // Use simpler query to avoid composite index requirement
      q = query(collection(db, 'payments'), where('customerId', '==', customerId));
    }
    return onSnapshot(q, (snapshot) => {
      let payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)) as Payment[];
      
      // Client-side sort if we couldn't do it server-side
      if (customerId) {
        payments.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || 0;
          const timeB = b.createdAt?.toMillis?.() || 0;
          return timeB - timeA;
        });
      }
      
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
      const plans = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      if (plans.length === 0) {
        return [
          { id: 'BASIC', name: 'Starter', price: 0, unitCount: '2 Units', color: 'bg-emerald-500' },
          { id: 'PRO', name: 'Standard', price: 1000, unitCount: '5 Units', color: 'bg-indigo-500' },
          { id: 'ULTRA', name: 'Premium', price: 2500, unitCount: '10+ Units', color: 'bg-slate-900' },
        ];
      }
      return plans;
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

  // --- NEW MULTI-ROLE CAMPAIGN METHODS ---

  async createCampaign(campaign: { title: string, mediaUrl?: string, mediaType?: 'VIDEO' | 'IMAGE', [key: string]: any }) {
    try {
      const data = {
        ...campaign,
        status: campaign.status || 'PENDING',
        createdBy: auth.currentUser?.uid,
        assignedDrivers: campaign.assignedDrivers || [],
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'campaigns'), data);
      
      console.log("[Notification] System: New campaign submitted.");
      return docRef;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'campaigns');
      throw e;
    }
  },

  async supportCreateCampaign(campaign: { title: string, description?: string, clientName?: string, mediaUrl: string, mediaType: 'VIDEO' | 'IMAGE' }) {
    return this.createCampaign(campaign);
  },

  async adminApproveCampaign(campaignId: string) {
    try {
      await updateDoc(doc(db, 'campaigns', campaignId), {
        status: 'ACTIVE',
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
    maxAutos: number, 
    startDate?: string,
    endDate?: string,
    assignedDrivers: string[] 
  }) {
    try {
      const batch = writeBatch(db);
      
      // Update Campaign
      const campaignRef = doc(db, 'campaigns', campaignId);
      batch.update(campaignRef, {
        durationDays: details.durationDays,
        hoursPerDay: details.hoursPerDay,
        maxAutos: details.maxAutos,
        startDate: details.startDate || null,
        endDate: details.endDate || null,
        status: 'ACTIVE',
        approvedBy: auth.currentUser?.uid,
        updatedAt: serverTimestamp()
      });

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
          createdAt: serverTimestamp()
        });
      });

      await batch.commit();
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

  async adminAssignDrivers(campaignId: string, driverIds: string[]) {
    try {
      await updateDoc(doc(db, 'campaigns', campaignId), {
        assignedDrivers: driverIds,
        updatedAt: serverTimestamp()
      });
      console.log(`[Notification] Drivers: ${driverIds.length} units assigned to new campaign.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'campaigns');
      throw e;
    }
  },

  subscribeToActiveAssignedCampaigns(driverId: string, callback: (campaigns: AdCampaign[]) => void) {
    const q = query(
      collection(db, 'campaigns'),
      where('status', '==', 'ACTIVE'),
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
      return await setDoc(driverRef, {
        ...driver,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp()
      }, { merge: true });
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
  async recordPayment(payment: { 
    driverId?: string, 
    campaignId?: string, 
    amount: number, 
    currency?: string, 
    paymentId?: string, 
    method?: string, 
    paymentMethod?: string,
    customerId?: string,
    transactionId?: string,
    status: 'success' | 'failed' | 'SUCCESS' | 'FAILED' | 'PENDING_ADMIN_VERIFY'
  }) {
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
    console.log("[FirebaseService] Attempting to save user profile for:", userId);
    console.log("[FirebaseService] Current Auth UID:", auth.currentUser?.uid);
    console.log("[FirebaseService] Current Auth Email:", auth.currentUser?.email);
    console.log("[FirebaseService] Rules should be wide open right now.");
    
    const userRef = doc(db, USERS_COLLECTION, userId);
    try {
      // Use setDoc with merge for reliability
      const res = await setDoc(userRef, {
        uid: userId,
        name,
        phone,
        role,
        subscriptionTier,
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

  async getUserProfile(userId: string) {
    if (!userId) return null;
    const userRef = doc(db, USERS_COLLECTION, userId);
    try {
      const snap = await getDocFromServer(userRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as any;
      }
      return null;
    } catch (e: any) {
      console.warn("[FirebaseService] getUserProfile error:", e.message);
      return null;
    }
  },

  async getDriverProfile(uid: string) {
    const docRef = doc(db, DRIVERS_COLLECTION, uid);
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : null;
  },

  async uploadDriverDocument(uid: string, type: 'RC' | 'DL' | 'PROFILE' | 'AADHAR', file: File, onProgress?: (percent: number) => void) {
    // Retry logic as requested
    const MAX_RETRIES = 1;
    let attempt = 0;

    const performUpload = async (): Promise<string> => {
      try {
        // 1. Optimized Compression (1024px, 55% quality for < 200KB target)
        const compressedBlob = await compressImage(file, 1024, 0.55);
        console.log(`[FirebaseService] Image ready for ${type}: ${compressedBlob.size} bytes`);

        if (compressedBlob.size === 0) {
          throw new Error('Compressed image is empty');
        }
        
        const fileName = `${type.toLowerCase()}_${Date.now()}.jpg`;
        const storageRef = ref(storage, `${DRIVERS_COLLECTION}/${uid}/${fileName}`);
        
        // 2. Upload to Storage with explicit metadata
        const metadata = {
          contentType: 'image/jpeg',
          customMetadata: {
            'type': type,
            'uid': uid,
            'originalSize': file.size.toString()
          }
        };

        console.log(`[FirebaseService] Attempting uploadBytes for ${type}...`);
        
        // Using uploadBytes instead of uploadBytesResumable for potentially better reliability
        // on networks that might have issues with the resumable protocol.
        // We simulate a 50% progress for UI feedback since uploadBytes is atomic.
        if (onProgress) onProgress(50);
        
        // Add a race with a timeout for uploadBytes
        const uploadPromise = uploadBytes(storageRef, compressedBlob, metadata);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Upload atomic timeout (90s)')), 90000);
        });

        const snapshot = await Promise.race([uploadPromise, timeoutPromise]) as any;
        console.log(`[FirebaseService] Upload completed for ${type}. Metadata:`, snapshot.metadata);
        
        if (onProgress) onProgress(100);
        
        const url = await getDownloadURL(snapshot.ref);
        
        // 3. Update firestore (fire-and-forget)
        const fieldMap: Record<string, string> = {
          RC: 'rcPhoto',
          DL: 'dlPhoto',
          PROFILE: 'profileImage',
          AADHAR: 'aadharPhoto'
        };
        
        const field = fieldMap[type];
        if (field) {
          this.updateDriverProfile(uid, { [field]: url }).catch(e => {
            console.error(`[FirebaseService] Deferred sync error for ${field}:`, e);
          });
        }
        return url;
      } catch (e: any) {
        console.error(`[FirebaseService] Error in performUpload for ${type}:`, e.message || e);
        
        if (e.message.indexOf('timeout') !== -1) {
          console.error(`[FirebaseService] UPLOAD STALLED. Possible causes: 
            1. CORS blocked (run gsutil cors set)
            2. Storage bucket not initialized 
            3. Network blocking binary PUT requests`);
        }
        if (attempt < MAX_RETRIES) {
          attempt++;
          console.log(`[FirebaseService] Retrying upload for ${type} (Attempt ${attempt})...`);
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
    const q = query(collection(db, TICKETS_COLLECTION), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)) as SupportTicket[];
      callback(tickets);
    }, (error) => handleFirestoreError(error, OperationType.LIST, TICKETS_COLLECTION));
  },

  subscribeToSupportTickets(driverId: string, callback: (tickets: SupportTicket[]) => void) {
    // Try with orderBy first
    try {
      const q = query(
        collection(db, TICKETS_COLLECTION), 
        where('driverId', '==', driverId),
        orderBy('createdAt', 'desc')
      );
      return onSnapshot(q, (snapshot) => {
        const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)) as SupportTicket[];
        callback(tickets);
      }, (error: any) => {
        if (error.message?.includes('index')) {
          console.warn("SupportTickets index not ready, using fallback simple query.");
          const qSimple = query(
            collection(db, TICKETS_COLLECTION), 
            where('driverId', '==', driverId)
          );
          onSnapshot(qSimple, (snapshot) => {
            const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)) as SupportTicket[];
            tickets.sort((a, b) => {
              const tA = a.createdAt?.toMillis?.() || 0;
              const tB = b.createdAt?.toMillis?.() || 0;
              return tB - tA;
            });
            callback(tickets);
          }, (err) => handleFirestoreError(err, OperationType.LIST, TICKETS_COLLECTION));
        } else {
          handleFirestoreError(error, OperationType.LIST, TICKETS_COLLECTION);
        }
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
      await updateDoc(planRef, { 
        price: newPrice,
        updatedAt: serverTimestamp()
      });
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
      const snap = await getDocsFromServer(q);
      return snap.docs.map(d => ({ id: d.id, uid: d.id, ...d.data() } as any));
    } catch (e) {
      console.error("Fetch Error:", e);
      const snap = await getDocs(q); // Fallback to standard getDocs
      return snap.docs.map(d => ({ id: d.id, uid: d.id, ...d.data() } as any));
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
        'admin_logs'
      ];

      for (const colName of topLevelCollections) {
        const snapshot = await getDocs(collection(db, colName));
        
        // Use chunks of 250 for safety (Firestore limit is 500)
        for (let i = 0; i < snapshot.docs.length; i += 250) {
          const batch = writeBatch(db);
          const chunk = snapshot.docs.slice(i, i + 250);
          
          for (const docSnap of chunk) {
            // Safety for admin
            if (colName === 'users' && (docSnap.data().email === 'darshanct43@gmail.com' || docSnap.data().uid === auth.currentUser?.uid)) {
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

  async uploadFileWithProgress(path: string, file: File | Blob, onProgress?: (percent: number) => void) {
    try {
      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      return new Promise<string>((resolve, reject) => {
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
    } catch (e) {
      console.error(`[FirebaseService] uploadFileWithProgress error:`, e);
      throw e;
    }
  }
};
