export type UserRole = 'CUSTOMER' | 'DRIVER' | 'ADMIN' | 'STAFF';

export interface User {
  id: string;
  name: string;
  phoneNumber: string;
  role: UserRole;
  avatar?: string;
}

export interface AdCampaign {
  id: string;
  title: string;
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REJECTED';
  budget: number;
  area: string;
  views: number;
  duration: number; // in days
  type: 'VIDEO' | 'IMAGE';
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
