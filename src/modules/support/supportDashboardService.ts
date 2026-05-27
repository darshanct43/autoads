import { db, auth } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc,
  setDoc,
  serverTimestamp 
} from 'firebase/firestore';

export interface AuditLog {
  action: string;
  performedBy: string; // user id or user email
  performedByName?: string;
  targetId: string;
  cityId?: string;
  franchiseId?: string;
  timestamp: any;
  details?: string;
}

/**
 * Log an action to the central firestore audit ledger
 */
export async function writeAuditLog(
  action: string, 
  targetId: string, 
  cityId?: string, 
  franchiseId?: string,
  details?: string
) {
  try {
    const user = auth.currentUser;
    const log: AuditLog = {
      action,
      performedBy: user?.uid || 'SYSTEM',
      performedByName: user?.email || 'System Daemon',
      targetId,
      cityId: cityId || 'global',
      franchiseId: franchiseId || 'global',
      timestamp: serverTimestamp(),
      details
    };
    await addDoc(collection(db, 'activityLogs'), log);
  } catch (e: any) {
    console.error('[SUPPORT SERVICE] Failed to write Audit Log:', e.message);
  }
}

/**
 * Approve list of drivers under a specific City + Franchise
 */
export async function approveDriverProfile(
  driverId: string,
  cityId: string,
  franchiseId: string,
  approvingAgentRole: string
) {
  try {
    const driverRef = doc(db, 'drivers', driverId);
    await updateDoc(driverRef, {
      adminApproved: true,
      kycStatus: 'APPROVED',
      status: 'ACTIVE',
      cityId,
      franchiseId,
      approvedBy: auth.currentUser?.email || auth.currentUser?.uid || 'UNKNOWN'
    });

    const userRef = doc(db, 'users', driverId);
    try {
      await updateDoc(userRef, {
        role: 'DRIVER',
        status: 'ACTIVE',
        cityId,
        franchiseId
      });
    } catch(err) {
      // In case the user doc is in different location
      await setDoc(userRef, {
        role: 'DRIVER',
        status: 'ACTIVE',
        cityId,
        franchiseId,
        email: driverId + '@autoads.in'
      }, { merge: true });
    }

    await writeAuditLog(
      'approved_driver', 
      driverId, 
      cityId, 
      franchiseId, 
      `Driver approved under ${cityId} / ${franchiseId} by ${approvingAgentRole}`
    );
    return { success: true };
  } catch (e: any) {
    console.error('[SUPPORT SERVICE] Error approving driver:', e);
    throw e;
  }
}

/**
 * Moderates local customer campaigns and sets category classification
 */
export async function approveCampaignWithMetadata(
  campaignId: string,
  cityId: string,
  franchiseId: string,
  tags: string[],
  safeContent: boolean,
  kidsSafe: boolean
) {
  try {
    const campaignRef = doc(db, 'campaigns', campaignId);
    await updateDoc(campaignRef, {
      status: 'APPROVED',
      cityId,
      franchiseId,
      categoryTags: tags,
      safeContent,
      kidsSafe,
      approvedBy: auth.currentUser?.email || auth.currentUser?.uid || 'UNKNOWN'
    });

    await writeAuditLog(
      'approved_campaign',
      campaignId,
      cityId,
      franchiseId,
      `Campaign moderation approved. Tags: ${tags.join(', ')}. SafeContent: ${safeContent}, KidsSafe: ${kidsSafe}`
    );
    return { success: true };
  } catch (e: any) {
    console.error('[SUPPORT SERVICE] Error moderating campaign:', e);
    throw e;
  }
}

/**
 * Registers / Verifies a new smart media device and binds it to a city franchise
 */
export async function approveAndMapDevice(
  deviceId: string,
  driverId: string,
  cityId: string,
  franchiseId: string
) {
  try {
    const deviceRef = doc(db, 'devices', deviceId);
    
    // Check if device already exists to prevent duplication
    const snap = await getDoc(deviceRef);
    if (snap.exists()) {
      await updateDoc(deviceRef, {
        status: 'ACTIVE',
        driverId,
        cityId,
        franchiseId,
        approvedBy: auth.currentUser?.email || auth.currentUser?.uid || 'UNKNOWN'
      });
    } else {
      await setDoc(deviceRef, {
        id: deviceId,
        driverId,
        cityId,
        franchiseId,
        location: { lat: 12.9716, lng: 77.5946 }, // Default (Bangalore center)
        status: 'ACTIVE',
        todayRides: 0,
        earnings: 0,
        approvedBy: auth.currentUser?.email || auth.currentUser?.uid || 'UNKNOWN'
      });
    }

    await writeAuditLog(
      'approved_device',
      deviceId,
      cityId,
      franchiseId,
      `Activated Terminal Device and scoped to city ${cityId} mapped to driver ${driverId}`
    );
    return { success: true };
  } catch (e: any) {
    console.error('[SUPPORT SERVICE] Error validating device assignment:', e);
    throw e;
  }
}
