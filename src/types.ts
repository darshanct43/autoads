export type UserRole = 
  | 'CUSTOMER' 
  | 'DRIVER' 
  | 'ADMIN' 
  | 'SUPPORT' 
  | 'STAFF' 
  | 'DEVICE' 
  | 'FRANCHISE_OWNER' 
  | 'FRANCHISE_STAFF'
  | 'SUPPORT_MANAGER' 
  | 'SUPPORT_AGENT'
  | 'HQ_ADMIN'
  | 'HQ_SUPPORT'
  | 'SUPPORT_TEAM';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  stateId?: string;
  territoryId?: string;
  cityId?: string;
  franchiseId?: string;
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
  stateId?: string;
  territoryId?: string;
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
  territoryIds?: string[]; // Phase 4 targeting
  franchiseId?: string; // Scoping franchise ID
  categoryTags?: string[];
  safeContent?: boolean;
  kidsSafe?: boolean;
  mediaSource?: 'UPLOAD' | 'CANVA';
  mediaAssetId?: string;
  paymentStatus?: string;
  spend?: number;
  description?: string;
  type?: 'PLAN' | 'CAMPAIGN';
}

export interface AutoDevice {
  id: string;
  deviceId: string;
  serialNumber?: string;
  imei?: string;
  simNumber?: string;
  firmwareVersion?: string;
  driverId: string | null;
  vehicleId?: string | null;
  location: { lat: number; lng: number };
  status: 'IN_STOCK' | 'ASSIGNED' | 'ACTIVE' | 'OFFLINE' | 'MAINTENANCE' | 'RETIRED' | 'PENDING' | 'REPAIR';
  currentAdId?: string;
  todayRides: number;
  earnings: number;
  cityId?: string; // Scoped city
  territoryId?: string;
  franchiseId?: string; // Scoped franchise
  approvedBy?: string;
  autoNumber?: string;
  driverName?: string;
  remoteUrl?: string;
  vncSessionId?: string;
  screenVersion?: string;
  batteryLevel?: number;
  healthScore?: number;
  lastHeartbeat?: string;
  appVersion?: string;
  storageUsedPercent?: number;
  ramUsedPercent?: number;
  cpuUsagePercent?: number;
  deviceTemperature?: number;
  chargingStatus?: string;
  networkType?: string;
  signalStrength?: number;
}

export interface Vehicle {
  vehicleId: string;
  registrationNumber: string;
  vehicleType: string;
  ownerName: string;
  ownerPhone: string;
  territoryId: string | null;
  franchiseId: string | null;
  assignedDriverId: string | null;
  assignedDeviceId: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'RETIRED';
  createdAt: string;
  updatedAt: string;
}

export interface DeploymentAudit {
  deploymentId: string;
  campaignId: string;
  territoryId: string;
  deviceId: string;
  status: 'SUCCESS' | 'FAILED' | 'RETRY';
  failureReason?: string;
  deployedAt: string;
}

export interface DeviceTelemetry {
  deviceId: string;
  timestamp: string;
  batteryLevel: number;
  cpuUsagePercent: number;
  ramUsedPercent: number;
  storageUsedPercent: number;
  temperature: number;
  networkType: string;
  signalStrength: number;
}

export interface Territory {
  territoryId: string;
  territoryName: string;
  stateId: string;
  district?: string;
  managedBy: 'HQ' | 'FRANCHISE';
  franchiseId: string | null;
  franchiseIds?: string[]; // Multiple mapping if needed
  status: 'ACTIVE' | 'INACTIVE';
  activeDrivers?: number;
  activeDevices?: number;
  activeCampaigns?: number;
  totalRevenue?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Settlement {
  settlementId: string;
  stateId?: string;
  territoryId: string;
  franchiseId: string | null;
  grossRevenue: number;
  franchiseShare: number;
  hqShare: number;
  status: 'PENDING' | 'PROCESSING' | 'SETTLED' | 'FAILED';
  createdAt: string;
  settledAt?: string;
}

export interface RevenueDistribution {
  distributionId: string;
  campaignId: string;
  amount: number;
  hqShare: number;
  franchiseShare: number;
  driverShare: number;
  territoryId: string;
  status: 'PENDING' | 'PROCESSED';
  createdAt: string;
}

export interface TerritoryMetrics {
  territoryId: string;
  territoryName: string;
  managedBy?: 'HQ' | 'FRANCHISE';
  franchiseId: string | null;
  healthStatus?: 'HEALTHY' | 'AT_RISK' | 'CRITICAL';
  driversCount?: number;
  customersCount?: number;
  campaignsCount?: number;
  workersCount?: number;
  openTicketsCount?: number;
  totalRevenue: number;
  lastActivityAt?: string;
  drivers?: { total: number; active: number; inactive: number; pendingApproval: number; };
  campaigns?: { total: number; active: number; completed: number; rejected: number; };
  settlements?: { pending: number; processing: number; settled: number; failed: number; };
  support?: { open: number; resolved: number; escalated: number; };
  revenue?: { gross: number; hqShare: number; franchiseShare: number; };
  devices?: { online: number; offline: number; };
  updatedAt?: string;
}

export interface FranchiseMetrics {
  franchiseId: string;
  franchiseName: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
  territoriesAssigned: number;
  drivers: { total: number; active: number; };
  campaigns: { total: number; active: number; completed: number; };
  revenue: { gross: number; pending: number; settled: number; };
  support: { openTickets: number; };
  healthScore: number;
  updatedAt: string;
}

export interface DriverMetrics {
  territoryId: string;
  totalDrivers: number;
  activeDrivers: number;
  inactiveDrivers: number;
  pendingApproval: number;
  deviceAssigned: number;
  deviceUnassigned: number;
  driverApprovalRate: number;
  activeDriverRate: number;
  updatedAt: string;
}

export interface CampaignMetrics {
  territoryId: string;
  draft: number;
  pendingApproval: number;
  active: number;
  completed: number;
  rejected: number;
  expired: number;
  grossRevenue: number;
  averageCPM: number;
  totalImpressions: number;
  campaignCompletionRate: number;
  updatedAt: string;
}

export interface SettlementMetrics {
  territoryId: string;
  pending: number;
  processing: number;
  settled: number;
  failed: number;
  pendingRevenue: number;
  settledRevenue: number;
  settlementSuccessRate: number;
  oldestPendingSettlementAgeDays: number;
  updatedAt: string;
}

export interface DeviceMetrics {
  territoryId: string;
  totalDevices?: number;
  totalInventory?: number;
  inStock?: number;
  assigned?: number;
  active?: number;
  offline?: number;
  maintenance?: number;
  retired?: number;
  online?: number;
  heartbeatFailures?: number;
  provisioningFailures?: number;
  deviceHealthScore?: number;
  averageHealthScore?: number;
  updatedAt: string;
}

export interface FleetMetrics {
  territoryId: string;
  totalVehicles: number;
  activeVehicles: number;
  inactiveVehicles: number;
  updatedAt: string;
}

export interface CampaignAnalytics {
  campaignId: string;
  advertiserId: string;
  territoryIds: string[];
  impressions: number;
  reach: number;
  spend: number;
  cpi: number; 
  effectiveCpm: number;
  utilizationRate: number;
  uptimeRate: number;
  completionRate: number;
  roiPercentage: number;
  updatedAt: string;
}

export interface AdvertiserAnalytics {
  advertiserId: string;
  activeCampaigns: number;
  completedCampaigns: number;
  totalSpend: number;
  totalImpressions: number;
  totalReach: number;
  averageRoi: number;
  bestPerformingTerritoryId: string;
  updatedAt: string;
}

export interface RevenueAnalytics {
  periodId: string;
  territoryId: string | 'global';
  grossRevenue: number;
  hqShare: number;
  franchiseShare: number;
  pendingSettlements: number;
  settledRevenue: number;
  revenueGrowthRate: number;
  updatedAt: string;
}

export interface FranchiseTerritory {
  territoryId: string;
  territoryName: string;
  franchiseId: string | null;
  franchiseName: string | null;
  ownershipStatus: 'HQ' | 'ASSIGNED' | 'SUSPENDED';
  assignedAt?: string;
  assignedBy?: string;
}

export interface SupportTicket {
  id: string;
  userId?: string;
  subject?: string;
  title?: string;
  description?: string;
  message?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'resolved' | 'open' | 'in_progress';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: any;
  updatedAt?: any;
  stateId?: string;
  territoryId?: string;
  cityId?: string;
  franchiseId?: string | null;
  type?: 'CUSTOMER' | 'DRIVER' | 'FRANCHISE' | 'DEVICE';
  ticketNumber?: string;
  assignedToHQ?: boolean;
  driverId?: string;
  driverName?: string;
  lat?: number;
  lng?: number;
  customerId?: string;
  customerName?: string;
  category?: string;
  lastMessage?: string;
  campaignId?: string;
  migrationStatus?: string;
  messages?: any[];
}

export interface DriverPayment {
  id: string;
  driverId: string;
  amount: number;
  type: 'earning' | 'withdrawal';
  status: 'pending' | 'success' | 'failed';
  paymentMethod: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
  stateId: string;
  territoryId: string;
  cityId: string;
  franchiseId: string | null;
}

export interface DriverQuote {
  id: string;
  driverId: string;
  driverName: string;
  terminalId: string;
  quote: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedReason?: string;
  month: string; // YYYY-MM
}

