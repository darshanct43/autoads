/**
 * Adaptive Ride Content Engine for AutoAds
 * Manages specialized engagement playlists to replace unsafe ads with high-value safe content.
 */

export interface RideContentItem {
  id: string;
  title: string;
  category: 'kids-entertainment' | 'education' | 'safe-ads' | 'family-utility' | 'quiet-ambient' | 'night-lullaby' | 'general';
  type: 'IMAGE' | 'VIDEO' | 'INTERACTIVE';
  url: string;
  duration: number; // in seconds
  safeForChildren: boolean;
  familySafe: boolean;
  tagline?: string;
  bgColor?: string; // For CSS styled dynamic cards
  moralFact?: string; // For science / moral stories content
  primaryColor?: string;
  audioClass?: string; // Quiet/Night specific triggers
}

// 👶 Category 1 & 2: Kids Entertainment & School/Kids Learning Snippets
export const KIDS_ENTERTAINMENT_COLLECTION: RideContentItem[] = [
  {
    id: "kids_cartoon_01",
    title: "Chuggington Train Ride Adventure 🚂",
    category: "kids-entertainment",
    type: "VIDEO",
    url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    duration: 15,
    safeForChildren: true,
    familySafe: true,
    tagline: "Choo Choo! Let's explore the virtual railway station together!"
  },
  {
    id: "kids_funny_02",
    title: "Funny Mascot Forest Run 🐿️",
    category: "kids-entertainment",
    type: "VIDEO",
    url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    duration: 12,
    safeForChildren: true,
    familySafe: true,
    tagline: "Follow Woody the Squirrel on an adventure!"
  },
  {
    id: "kids_edu_01",
    title: "Awesome Science Fact: The Blue Sky! 🌌",
    category: "education",
    type: "IMAGE",
    url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop",
    duration: 10,
    safeForChildren: true,
    familySafe: true,
    tagline: "Did you know? Sunlight reaches Earth's atmosphere and is scattered in all directions by gases, creating our blue sky!",
    moralFact: "Science is magic that works!"
  },
  {
    id: "kids_edu_02",
    title: "Moral Story: The Helper Ant 🐜",
    category: "education",
    type: "IMAGE",
    url: "https://images.unsplash.com/photo-1578116922645-3976907a7671?q=80&w=800&auto=format&fit=crop",
    duration: 12,
    safeForChildren: true,
    familySafe: true,
    tagline: "No act of kindness, no matter how small, is ever wasted. Always help your fellow passengers!",
    moralFact: "Kindness is contagious"
  },
  {
    id: "kids_edu_03",
    title: "Alphabet Quest: 'A' is for Apple! 🍎",
    category: "education",
    type: "IMAGE",
    url: "https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?q=80&w=800&auto=format&fit=crop",
    duration: 8,
    safeForChildren: true,
    familySafe: true,
    tagline: "Let's learn together: Ant, Apple, Airplane start with Letter A!"
  }
];

// 🛍 Category 3: Kids-Safe & Family-Safe Advertisements
export const KIDS_SAFE_ADS_COLLECTION: RideContentItem[] = [
  {
    id: "safe_ad_toys",
    title: "WonderKids Smart Blocks 🧱",
    category: "safe-ads",
    type: "IMAGE",
    url: "https://images.unsplash.com/photo-1587654780291-39c9404d746b?q=80&w=800&auto=format&fit=crop",
    duration: 10,
    safeForChildren: true,
    familySafe: true,
    tagline: "Fueling imagination & cognitive logic, block by block!"
  },
  {
    id: "safe_ad_milk",
    title: "PureFarm Organic Kid Milk 🥛",
    category: "safe-ads",
    type: "IMAGE",
    url: "https://images.unsplash.com/photo-1563636619-e9143da7973b?q=80&w=800&auto=format&fit=crop",
    duration: 10,
    safeForChildren: true,
    familySafe: true,
    tagline: "Strong bones, sharp minds. Rich in Calcium & natural Vitamin D!"
  },
  {
    id: "safe_ad_school",
    title: "St. Joseph's Play Academy 🎒",
    category: "safe-ads",
    type: "IMAGE",
    url: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=800&auto=format&fit=crop",
    duration: 10,
    safeForChildren: true,
    familySafe: true,
    tagline: "Admissions open for Pre-KG to Grade 5. Nurturing future leaders!"
  }
];

// 👨‍👩‍👧 Family offers, Shopping, Restaurants, Travel & Supermarkets
export const FAMILY_CONTENT_COLLECTION: RideContentItem[] = [
  {
    id: "family_offer_grocery",
    title: "SuperMarket Family Saver Packs 🛒",
    category: "family-utility",
    type: "IMAGE",
    url: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800&auto=format&fit=crop",
    duration: 10,
    safeForChildren: true,
    familySafe: true,
    tagline: "Flat 20% off on all monthly bundles & organic fresh greens!"
  },
  {
    id: "family_restaurant",
    title: "Gourmet Garden Grill: Kids Eat Free! 🍕",
    category: "family-utility",
    type: "IMAGE",
    url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800&auto=format&fit=crop",
    duration: 12,
    safeForChildren: true,
    familySafe: true,
    tagline: "Dine with family every Sunday. Free scoop of natural ice-cream!"
  },
  {
    id: "family_wellness",
    title: "Apollo Family Health Shield 🩺",
    category: "family-utility",
    type: "IMAGE",
    url: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=800&auto=format&fit=crop",
    duration: 10,
    safeForChildren: true,
    familySafe: true,
    tagline: "Full body health screening for 4 members starting at ₹1,499."
  }
];

// 🔇 Quiet Room calming and subtle animation slide collection
export const QUIET_CONTENT_COLLECTION: RideContentItem[] = [
  {
    id: "quiet_ocean",
    title: "Serene Waves & Calming Breeze 🌊",
    category: "quiet-ambient",
    type: "VIDEO",
    url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    duration: 15,
    safeForChildren: true,
    familySafe: true,
    tagline: "Peaceful environment activated filter. Sit back, relax, and enjoy your time."
  },
  {
    id: "quiet_forest",
    title: "Calm Mountain Wilderness ⛰️",
    category: "quiet-ambient",
    type: "IMAGE",
    url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800&auto=format&fit=crop",
    duration: 12,
    safeForChildren: true,
    familySafe: true,
    tagline: "Subtle noise dampening on. Take a deep breath."
  }
];

// 🌙 Night Mode dark-adapted, low-blue light slides
export const NIGHT_CONTENT_COLLECTION: RideContentItem[] = [
  {
    id: "night_stars",
    title: "Deep Space Cosmos Visuals 🌌",
    category: "night-lullaby",
    type: "IMAGE",
    url: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=80&w=800&auto=format&fit=crop",
    duration: 15,
    safeForChildren: true,
    familySafe: true,
    tagline: "Night safety mode. Low brightness configured automatically.",
    primaryColor: "#030712"
  },
  {
    id: "night_peace",
    title: "Gentle Cozy Moonlight 🌖",
    category: "night-lullaby",
    type: "IMAGE",
    url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=800&auto=format&fit=crop",
    duration: 12,
    safeForChildren: true,
    familySafe: true,
    tagline: "Thank you for riding with AutoAds tonight. Sweet dreams!",
    primaryColor: "#020617"
  }
];

/**
 * Adaptive Content Playlist Coordinator
 * Rebuilds the media queue and ratios as defined by current user/driver state parameters
 */
export class AdaptiveRideContentEngine {
  /**
   * Generates a fully compiled active playlist according to the customized mode logic & ratios
   */
  static generatePlaylist(
    rawAdvertisements: any[],
    overrideMode: 'CHILDREN' | 'FAMILY' | 'SILENT' | 'SCHOOL_TRIP' | 'NORMAL' | 'KIDS' | 'QUIET' | 'NIGHT',
    isSchoolTime: boolean,
    customBlockedCategories: string[] = []
  ): RideContentItem[] {
    const finalMode = overrideMode.toUpperCase();

    // 1. If Kids Mode is selected (either CHILDREN, SCHOOL_TRIP, or KIDS override)
    if (finalMode === 'CHILDREN' || finalMode === 'SCHOOL_TRIP' || finalMode === 'KIDS') {
      const filteredRaw = rawAdvertisements.filter(ad => {
        const cat = (ad.category || ad.metadata?.category || '').toLowerCase().trim();
        const safeChild = ad.safeForChildren === true || ad.metadata?.safeForChildren === true;
        
        // Block explicit categories
        if (['alcohol', 'betting', 'gambling', 'adult', 'political'].includes(cat)) {
          return false;
        }
        return safeChild;
      });

      // Ratios: 70% Kids Entertainment, 30% Safe Ads
      const poolEntertainment = [...KIDS_ENTERTAINMENT_COLLECTION];
      const poolSafeAds = [...KIDS_SAFE_ADS_COLLECTION, ...filteredRaw.map(this.mapRawAdToItem)];
      
      const combined: RideContentItem[] = [];
      const maxLength = 8; // Maintain balanced loop for quick rotation
      
      for (let i = 0; i < maxLength; i++) {
        // Ratio selection pattern
        const useEntertainment = i % 10 < 7;
        if (useEntertainment && poolEntertainment.length > 0) {
          const index = i % poolEntertainment.length;
          combined.push(poolEntertainment[index]);
        } else if (poolSafeAds.length > 0) {
          const index = i % poolSafeAds.length;
          combined.push(poolSafeAds[index]);
        } else if (poolEntertainment.length > 0) {
          const index = i % poolEntertainment.length;
          combined.push(poolEntertainment[index]);
        }
      }
      return combined.length > 0 ? combined : KIDS_ENTERTAINMENT_COLLECTION;
    }

    // 2. If Family Mode is selected
    if (finalMode === 'FAMILY') {
      // Ratios: 40% family offers, 30% restaurants, 20% shopping, 10% entertainment
      // Filter raw ads to exclude explicit ones
      const filteredRaw = rawAdvertisements.filter(ad => {
        const cat = (ad.category || ad.metadata?.category || '').toLowerCase().trim();
        return !['alcohol', 'gambling', 'betting', 'political'].includes(cat) && ad.familySafe !== false;
      });

      const poolFamily = [...FAMILY_CONTENT_COLLECTION];
      const poolRawMapped = filteredRaw.map(this.mapRawAdToItem);
      
      // Merge with proportional structure
      const list: RideContentItem[] = [];
      const rounds = 8;
      
      for (let i = 0; i < rounds; i++) {
        if (i % 2 === 0 && poolFamily.length > 0) {
          list.push(poolFamily[i % poolFamily.length]);
        } else if (poolRawMapped.length > 0) {
          list.push(poolRawMapped[i % poolRawMapped.length]);
        } else if (poolFamily.length > 0) {
          list.push(poolFamily[i % poolFamily.length]);
        }
      }
      return list.length > 0 ? list : FAMILY_CONTENT_COLLECTION;
    }

    // 3. If Quiet/Silent Ride is selected
    if (finalMode === 'SILENT' || finalMode === 'QUIET') {
      // Subdued display, prefer calm visuals
      const filteredRaw = rawAdvertisements.filter(ad => {
        const cat = (ad.category || ad.metadata?.category || '').toLowerCase().trim();
        // Skip loud ads
        return ad.type !== 'VIDEO' || ad.muted === true;
      }).map(this.mapRawAdToItem);

      return [...QUIET_CONTENT_COLLECTION, ...filteredRaw].slice(0, 8);
    }

    // 4. If Night Mode is selected
    if (finalMode === 'NIGHT') {
      // Redundant dark adaptive playlist
      return [...NIGHT_CONTENT_COLLECTION];
    }

    // 5. Normal Mode or Default Scheduler School Mode
    if (isSchoolTime) {
      // Re-trigger School children prioritisation logic automatically
      return [...KIDS_ENTERTAINMENT_COLLECTION, ...KIDS_SAFE_ADS_COLLECTION].slice(0, 8);
    }

    // Fallback: Default mapped raw ad list to keep continuous streaming alive
    if (rawAdvertisements.length > 0) {
      return rawAdvertisements.map(this.mapRawAdToItem);
    }

    // Complete fallback if queue completely empty (Avoids blank client screen)
    return [
      ...KIDS_ENTERTAINMENT_COLLECTION,
      ...FAMILY_CONTENT_COLLECTION
    ];
  }

  /**
   * Helper to parse any raw Firestore campaign advertisement structures nicely
   */
  private static mapRawAdToItem(rawAd: any): RideContentItem {
    return {
      id: rawAd.id || `raw_ad_${Math.random().toString(36).substr(2, 9)}`,
      title: rawAd.title || "AutoAds Smart Spotlight",
      category: (rawAd.category || "general") as any,
      type: rawAd.type === 'VIDEO' ? 'VIDEO' : 'IMAGE',
      url: rawAd.url || rawAd.assetUrl || rawAd.mediaUrl || "",
      duration: rawAd.duration || 10,
      safeForChildren: rawAd.safeForChildren ?? true,
      familySafe: rawAd.familySafe ?? true,
      tagline: rawAd.tagline || rawAd.description || "Proudly riding with AutoAds Smart screens"
    };
  }
}
