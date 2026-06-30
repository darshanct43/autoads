export type UserRole = 'ADMIN' | 'CUSTOMER' | 'SUPPORT_TEAM' | 'FRANCHISE_STAFF' | 'FRANCHISE_OWNER' | 'DRIVER' | 'DEVICE' | 'SUPPORT_MANAGER' | 'SUPPORT_AGENT' | 'SUPPORT' | 'STAFF' | 'HQ_ADMIN' | 'HQ_SUPPORT' | 'NO_ROLE';

export interface Driver {
  id: string;
  uid?: string;
  phone: string;
  name: string;
  email?: string;
  vehicleNo?: string;
  vehicleNumber?: string;
  vNo?: string;
  aadhaarNo?: string;
  aadharNumber?: string;
  aadhaarUrl?: string;
  aadharPhoto?: string;
  licenseNo?: string;
  dlNumber?: string;
  licenseUrl?: string;
  dlPhoto?: string;
  selfieUrl?: string;
  selfiePhoto?: string;
  signatureUrl?: string;
  rcUrl?: string;
  rcNumber?: string;
  rcPhoto?: string;
  panUrl?: string;
  panPhoto?: string;
  insuranceUrl?: string;
  profileImage?: string;
  driverCode?: string;
  password?: string;
  deviceId?: string;
  gpsId?: string;
  bio?: string;
  isRegistered?: boolean;
  isLoggedIn?: boolean;
  isVerified?: boolean;
  agreementAccepted?: boolean;
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  accountStatus: 'ACTIVE' | 'INACTIVE';
  documentStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  agreementStatus: 'PENDING' | 'SIGNED';
  paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED';
  supportApproval: 'PENDING' | 'APPROVED' | 'REJECTED';
  terminalStatus: 'LOCKED' | 'UNLOCKED';
  provisionStatus?: 'IDLE' | 'PROVISIONED' | 'ACTIVE';
  status?: 'active' | 'blocked' | 'pending_verification' | string;
  subscriptionTier?: 'FREE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  terminalId?: string;
  accessKey?: string;
  kycStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW';
  createdAt?: any;
  lastLoginAt?: any;
  city?: string;
  cityId?: string;
  franchiseId?: string;
}

export type DriverProfile = Driver;

export interface DriverDocument {
  aadhaar?: string;
  drivingLicense?: string;
  selfie?: string;
  rc?: string;
  pan?: string;
  insurance?: string;
}

export interface Wallet {
  driverId: string;
  balance: number;
  creditsAssigned: number;
  withdrawals: WithdrawalRequest[];
}

export interface WithdrawalRequest {
  id: string;
  amount: number;
  timestamp: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface IoTDevice {
  id: string;
  name: string;
  activeStatus: 'ONLINE' | 'OFFLINE';
  lastSyncedAt: number;
  metrics: {
    lat: number;
    lng: number;
    speed: number;
    battery: number;
  };
}

export interface Transaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  amount: number;
  timestamp: number;
  description: string;
}

export interface ChatMessage {
  id?: string;
  text?: string;
  senderId?: string;
  senderName: string;
  senderRole?: string;
  timestamp: any;
  role?: string;
  content?: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber?: string;
  type: 'DRIVER' | 'CUSTOMER' | 'SUPPORT_TEAM' | string;
  createdAt: any;
  updatedAt?: any;
  cityId?: string;
  franchiseId?: string;
  subject?: string;
  message?: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | string;
  messages?: ChatMessage[];
  userId?: string;
  requesterName?: string;
  requesterPhone?: string;
  territoryId?: string;
  designApprovalLink?: string;
  designPreviewUrl?: string;
  title?: string;
  customerName?: string;
  driverName?: string;
  assignedToHQ?: boolean;
  category?: string;
  lastMessage?: string;
  driverId?: string;
  customerId?: string;
  campaignId?: string;
  lat?: number;
  lng?: number;
  stateId?: string;
}

export interface DriverQuote {
  id: string;
  quote: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  submittedAt: string;
  approvedAt?: string | null;
  driverId: string;
  driverName?: string;
  rejectedReason?: string;
  approvedBy?: string;
  month?: string;
  terminalId?: string;
}

export interface AutoDevice {
  id: string;
  status: string;
  driverName?: string;
  autoNumber?: string;
  batteryLevel?: number;
  signalStrength?: string;
  franchiseId?: string;
  lastHeartbeat?: any;
  remoteUrl?: string;
}

export type Device = AutoDevice;

export interface User {
  id: string;
  uid?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  status?: string;
  isApproved?: boolean;
  createdAt?: any;
  cityId?: string;
  permissions?: Record<string, boolean>;
}

export interface Settlement {
  settlementId?: string;
  driverId: string;
  amount: number;
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED' | string;
  createdAt?: any;
  paymentReference?: string;
}
