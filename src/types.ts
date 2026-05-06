export type UserRole = 'CUSTOMER' | 'DRIVER' | 'ADMIN' | 'SUPPORT' | 'STAFF' | 'DEVICE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface AdCampaign {
  id: string;
  title: string;
  clientName?: string;
  mediaUrl: string;
  mediaType: 'VIDEO' | 'IMAGE';
  status: 'PENDING' | 'ACTIVE' | 'REJECTED';
  createdBy: string; // User ID
  approvedBy?: string; // Admin User ID
  assignedDrivers: string[]; // Driver IDs
  createdAt: string;
}

export interface AutoDevice {
  id: string;
  driverId: string;
  location: { lat: number; lng: number };
  status: 'ONLINE' | 'OFFLINE' | 'REPAIR';
  currentAdId?: string;
  todayRides: number;
  earnings: number;
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  message: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
}
