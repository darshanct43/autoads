import { UserRole } from '@/types';

export interface RolePermissions {
  canApproveDrivers: boolean;
  canApproveCampaigns: boolean;
  canApproveDevices: boolean;
  canManageSupportTeams: boolean;
  canViewGlobalAnalytics: boolean;
  canManageFranchises: boolean;
  canAccessSystemsAudit: boolean;
  canDischargeFinances: boolean;
}

export const PERMISSIONS_BY_ROLE: Record<UserRole, RolePermissions> = {
  ADMIN: { // SUPER ADMIN
    canApproveDrivers: true,
    canApproveCampaigns: true,
    canApproveDevices: true,
    canManageSupportTeams: true,
    canViewGlobalAnalytics: true,
    canManageFranchises: true,
    canAccessSystemsAudit: true,
    canDischargeFinances: true
  },
  SUPPORT_MANAGER: {
    canApproveDrivers: true,
    canApproveCampaigns: true,
    canApproveDevices: true,
    canManageSupportTeams: true,
    canViewGlobalAnalytics: false,
    canManageFranchises: false,
    canAccessSystemsAudit: true,
    canDischargeFinances: false
  },
  SUPPORT_AGENT: {
    canApproveDrivers: true,
    canApproveCampaigns: true,
    canApproveDevices: true,
    canManageSupportTeams: false,
    canViewGlobalAnalytics: false,
    canManageFranchises: false,
    canAccessSystemsAudit: false,
    canDischargeFinances: false
  },
  SUPPORT: { // Legacy SUPPORT role maps to agent
    canApproveDrivers: true,
    canApproveCampaigns: true,
    canApproveDevices: true,
    canManageSupportTeams: false,
    canViewGlobalAnalytics: false,
    canManageFranchises: false,
    canAccessSystemsAudit: false,
    canDischargeFinances: false
  },
  STAFF: { // Legacy STAFF role maps to agent
    canApproveDrivers: true,
    canApproveCampaigns: true,
    canApproveDevices: true,
    canManageSupportTeams: false,
    canViewGlobalAnalytics: false,
    canManageFranchises: false,
    canAccessSystemsAudit: false,
    canDischargeFinances: false
  },
  FRANCHISE_OWNER: {
    canApproveDrivers: true, // Switched on for local drivers
    canApproveCampaigns: false, // Campaign review is a support moderation system
    canApproveDevices: false, // Device provisioning goes through support/admin
    canManageSupportTeams: false,
    canViewGlobalAnalytics: false, // Scoped to their cityId
    canManageFranchises: false,
    canAccessSystemsAudit: false,
    canDischargeFinances: false
  },
  FRANCHISE_STAFF: {
    canApproveDrivers: true, // Switched on for local drivers
    canApproveCampaigns: false,
    canApproveDevices: false,
    canManageSupportTeams: false,
    canViewGlobalAnalytics: false, // Scoped to their cityId
    canManageFranchises: false,
    canAccessSystemsAudit: false,
    canDischargeFinances: false
  },
  CUSTOMER: {
    canApproveDrivers: false,
    canApproveCampaigns: false,
    canApproveDevices: false,
    canManageSupportTeams: false,
    canViewGlobalAnalytics: false,
    canManageFranchises: false,
    canAccessSystemsAudit: false,
    canDischargeFinances: false
  },
  DRIVER: {
    canApproveDrivers: false,
    canApproveCampaigns: false,
    canApproveDevices: false,
    canManageSupportTeams: false,
    canViewGlobalAnalytics: false,
    canManageFranchises: false,
    canAccessSystemsAudit: false,
    canDischargeFinances: false
  },
  DEVICE: {
    canApproveDrivers: false,
    canApproveCampaigns: false,
    canApproveDevices: false,
    canManageSupportTeams: false,
    canViewGlobalAnalytics: false,
    canManageFranchises: false,
    canAccessSystemsAudit: false,
    canDischargeFinances: false
  }
};

/**
 * Validates permission action for a given role.
 */
export function hasPermission(role: UserRole | null | undefined, permission: keyof RolePermissions): boolean {
  if (!role) return false;
  const perms = PERMISSIONS_BY_ROLE[role];
  return perms ? perms[permission] : false;
}

/**
 * Helper to determine if a role can act on another city/franchise scope.
 */
export function satisfiesScope(
  userRole: UserRole,
  userCityId?: string,
  targetCityId?: string
): boolean {
  if (userRole === 'ADMIN') return true; // Super Admin has unrestricted scope
  if (!targetCityId) return true; // Unscoped operations are open if valid
  return userCityId === targetCityId; // Otherwise must match exactly
}
