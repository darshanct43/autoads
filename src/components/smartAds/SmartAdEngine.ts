/**
 * Smart Family & Children Safe Advertisement System
 * Core Filter Logic and Rule Engine
 */

export interface RidePreference {
  rideId?: string;
  deviceId?: string;
  childrenPresent?: boolean;
  familyMode?: boolean;
  muteAds?: boolean;
  blockedCategories?: string[];
  expiresAt?: string; // ISO Timestamp
  createdAt?: string; // ISO Timestamp
}

export type DriverRideMode = 'CHILDREN' | 'FAMILY' | 'SILENT' | 'SCHOOL_TRIP' | 'NORMAL';

export const ALLOWED_CHILDREN_CATEGORIES = [
  'education', 'snacks', 'toys', 'cartoons', 'school products', 
  'milk products', 'family restaurants', 'stationery', 'educational apps'
];

export const BLOCKED_CHILDREN_CATEGORIES = [
  'alcohol', 'betting', 'gambling', 'adult content', 'violent ads', 
  'unsafe political ads', 'political', 'adult', 'violence', 'betting_ads', 'gambling_ads'
];

/**
 * Built automatic smart ad scheduling based on school timings.
 */
export function isSchoolTiming(date: Date = new Date()): boolean {
  const day = date.getDay(); // 0 is Sunday, 1 is Mon, 6 is Saturday
  if (day === 0) return false; // Sunday is disabled

  // Convert hours/minutes to standard local values
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  if (day >= 1 && day <= 5) {
    // Monday - Friday: Morning: 08:30 AM – 09:30 AM (510 - 570 mins)
    // Monday - Friday: Evening: 04:30 PM – 05:30 PM (990 - 1050 mins)
    const morningStart = 8 * 60 + 30; // 510
    const morningEnd = 9 * 60 + 30;   // 570
    const eveningStart = 16 * 60 + 30; // 990
    const eveningEnd = 17 * 60 + 30;   // 1050

    if ((currentMinutes >= morningStart && currentMinutes <= morningEnd) ||
        (currentMinutes >= eveningStart && currentMinutes <= eveningEnd)) {
      return true;
    }
  } else if (day === 6) {
    // Saturday: 12:30 PM – 02:30 PM (750 - 870 mins)
    const satStart = 12 * 60 + 30; // 750
    const satEnd = 14 * 60 + 30;   // 870
    if (currentMinutes >= satStart && currentMinutes <= satEnd) {
      return true;
    }
  }
  return false;
}

/**
 * Filter ad queue based on current constraints (Priority Order: Ride Override, School Timing, Default Queue).
 */
export function filterAds(
  ads: any[],
  currentMode: DriverRideMode,
  schoolActive: boolean,
  passengerPreference: RidePreference | null
): any[] {
  // Determine final constraints
  const isChildrenOverride = currentMode === 'CHILDREN' || currentMode === 'SCHOOL_TRIP' || (passengerPreference?.childrenPresent ?? false);
  const isFamilyOverride = currentMode === 'FAMILY' || (passengerPreference?.familyMode ?? false);
  const isMuted = currentMode === 'SILENT' || (passengerPreference?.muteAds ?? false);

  // Combine blocked categories
  const customBlocked = passengerPreference?.blockedCategories || [];
  
  return ads.filter(ad => {
    // Clean and normalise category metadata
    const category = (ad.category || ad.metadata?.category || '').toLowerCase().trim();
    const safeForChildren = ad.safeForChildren ?? ad.metadata?.safeForChildren ?? null;
    const familySafe = ad.familySafe ?? ad.metadata?.familySafe ?? null;

    // 1. Check strict rules if Children/School modes are active
    if (isChildrenOverride || schoolActive) {
      // If categories are explicitly blocked, prevent
      if (BLOCKED_CHILDREN_CATEGORIES.includes(category)) {
        return false;
      }
      // If it has children metadata preference
      if (safeForChildren === false) {
        return false;
      }
      // If categories are explicitly allowed, let it play
      if (ALLOWED_CHILDREN_CATEGORIES.includes(category) || safeForChildren === true) {
        return true;
      }
      // Default fallback: If it's a known blocked word, filter out. Else if we only want strictly safe ads in children mode:
      // Let's filter out anything categorized else, or if uncategorized allow standard safe ads.
      if (category && !ALLOWED_CHILDREN_CATEGORIES.includes(category)) {
        return false;
      }
    }

    // 2. Check strict rules if Family Override is active
    if (isFamilyOverride) {
      if (familySafe === false) {
        return false;
      }
      if (BLOCKED_CHILDREN_CATEGORIES.includes(category)) {
        return false;
      }
    }

    // 3. Passenger manual filters (custom blocked categories)
    if (customBlocked.length > 0) {
      if (customBlocked.some((blocked: string) => category.includes(blocked.toLowerCase()))) {
        return false;
      }
    }

    // Default: allowed
    return true;
  });
}
