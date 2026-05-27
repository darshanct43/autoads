export type UserRole = 
  | 'CUSTOMER' 
  | 'DRIVER' 
  | 'ADMIN' 
  | 'SUPPORT' 
  | 'STAFF' 
  | 'DEVICE' 
  | 'FRANCHISE_OWNER' 
  | 'SUPPORT_MANAGER' 
  | 'SUPPORT_AGENT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  cityId?: string; // scoping for multi-city
  franchiseId?: string; // scoping for franchise-owner
  status?: 'PENDING' | 'VERIFIED' | 'APPROVED' | 'ACTIVE' | 'SUSPENDED';
  approvedBy?: string;
  createdAt?: string;
}

export type KYCStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

export interface DriverDocument {
  aadhaar: string;
  drivingLicense: string;
  selfie: string;
}

export interface DriverProfile {
  driverId: string;
  cityId?: string;
  franchiseId?: string;
  kycStatus: KYCStatus;
  payoutEnabled: boolean;
  adminApproved: boolean;
  status: 'PENDING' | 'VERIFIED' | 'APPROVED' | 'ACTIVE' | 'SUSPENDED';
  approvedBy?: string;
  documents: DriverDocument;
  upiId?: string;
}

export interface AdCampaign {
  id: string;
  title: string;
  clientName?: string;
  mediaUrl: string;
  mediaType: 'VIDEO' | 'IMAGE';
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'PENDING_VERIFICATION' | 'APPROVED' | 'LIVE' | 'AWAITING_PAYPORTAL';
  createdBy: string; // User ID
  approvedBy?: string; // Admin User ID/Support Agent ID
  assignedDrivers: string[]; // Driver IDs
  createdAt: string;
  cityId?: string; // Targeted city for franchise filtering
  franchiseId?: string; // Scoping franchise ID
  categoryTags?: string[];
  safeContent?: boolean;
  kidsSafe?: boolean;
}

export interface AutoDevice {
  id: string;
  driverId: string;
  location: { lat: number; lng: number };
  status: 'ONLINE' | 'OFFLINE' | 'REPAIR' | 'PENDING' | 'ACTIVE';
  currentAdId?: string;
  todayRides: number;
  earnings: number;
  cityId?: string; // Scoped city
  franchiseId?: string; // Scoped franchise
  approvedBy?: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  message: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
  cityId?: string;
  franchiseId?: string;
}
