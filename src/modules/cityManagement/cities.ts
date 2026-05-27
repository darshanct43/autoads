export interface CityFranchise {
  id: string; // e.g. "fr-blr-01"
  cityId: string; // e.g. "bangalore"
  cityName: string; // e.g. "Bangalore"
  ownerName: string;
  ownerEmail: string;
  status: 'ACTIVE' | 'PENDING' | 'DISABLED';
  totalDevices: number;
  totalDrivers: number;
  revenueModel: string; // e.g. "70/30 share"
  createdAt: string;
}

export const INITIAL_CITIES = [
  { id: 'bangalore', name: 'Bangalore', description: 'Tech Capital Region Tier-1' },
  { id: 'mysore', name: 'Mysore', description: 'Heritage Smart Grid Tier-2' },
  { id: 'mangalore', name: 'Mangalore', description: 'Coastal Transit Hub Tier-2' }
];

export const INITIAL_FRANCHISES: CityFranchise[] = [
  {
    id: 'fr-blr-01',
    cityId: 'bangalore',
    cityName: 'Bangalore',
    ownerName: 'Venkatesh Rao',
    ownerEmail: 'finance.blr@autoads.in',
    status: 'ACTIVE',
    totalDevices: 45,
    totalDrivers: 60,
    revenueModel: '75/25 split',
    createdAt: '2026-01-15T08:00:00Z'
  },
  {
    id: 'fr-mys-01',
    cityId: 'mysore',
    cityName: 'Mysore',
    ownerName: 'Darshan C.T.',
    ownerEmail: 'darshanct43@gmail.com',
    status: 'ACTIVE',
    totalDevices: 22,
    totalDrivers: 30,
    revenueModel: '70/30 split',
    createdAt: '2026-03-20T10:30:00Z'
  },
  {
    id: 'fr-mng-01',
    cityId: 'mangalore',
    cityName: 'Mangalore',
    ownerName: 'Kiran Shenoy',
    ownerEmail: 'kiran.mng@autoads.in',
    status: 'ACTIVE',
    totalDevices: 12,
    totalDrivers: 15,
    revenueModel: '80/20 split',
    createdAt: '2026-04-01T14:15:00Z'
  }
];

export function getCityName(cityId?: string): string {
  if (!cityId) return 'Global';
  const found = INITIAL_CITIES.find(c => c.id === cityId.toLowerCase());
  return found ? found.name : cityId.charAt(0).toUpperCase() + cityId.slice(1);
}

export function getFranchiseName(franchiseId?: string): string {
  if (!franchiseId) return 'Direct Corp';
  const found = INITIAL_FRANCHISES.find(f => f.id === franchiseId);
  return found ? `${found.cityName} (${found.id})` : franchiseId;
}
