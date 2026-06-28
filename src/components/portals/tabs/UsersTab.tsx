import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  Shield,
  MapPin,
  Building2,
  Mail,
  Phone,
  Search,
  Filter,
  Lock,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  UserCheck,
  Briefcase,
  Terminal,
  Grid,
  Info,
  Calendar,
  Layers,
  ChevronRight,
  Settings,
  Activity,
  Edit,
  UserX,
  AlertOctagon,
  RefreshCw,
  FileText,
  Copy,
  Link as LinkIcon
} from "lucide-react";
import { UserRole, User } from "@/types";
import { INITIAL_FRANCHISES, INITIAL_CITIES, getCityName } from "@/modules/cityManagement/cities";
import { PERMISSIONS_BY_ROLE } from "@/modules/rbac/permissions";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { firebaseService } from "@/services/firebaseService";

interface UsersTabProps {
  users: User[];
  showToast: (msg: string, type: 'success' | 'error') => void;
}

type DirectoryView = "USERS" | "FRANCHISES" | "STAFF" | "PERMISSIONS" | "INVITE_STAFF";

export const UsersTab: React.FC<UsersTabProps> = ({ users = [], showToast }) => {
  const [activeSubView, setActiveSubView] = useState<DirectoryView>("USERS");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Staff Access Whitelist State
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFullName, setInviteFullName] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteRole, setInviteRole] = useState<"SUPPORT_MANAGER" | "SUPPORT_AGENT" | "SUPPORT_TEAM">("SUPPORT_TEAM");
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [whitelist, setWhitelist] = useState<any[]>([]);

  // Real-time whitelist listener
  useEffect(() => {
    if (activeSubView === "INVITE_STAFF") {
      const unsubscribe = firebaseService.subscribeToStaffWhitelist((data) => {
        setWhitelist(data);
      });
      return () => unsubscribe();
    }
  }, [activeSubView]);

  const handleAddWhitelist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !invitePassword || !inviteFullName) {
      showToast("Email, Password and Full Name are required", "error");
      return;
    }
    setIsSubmittingInvite(true);
    try {
      const { initializeApp } = await import('firebase/app');
      const { getAuth, createUserWithEmailAndPassword } = await import('firebase/auth');
      const { doc, setDoc } = await import('firebase/firestore');
      
      // Initialize a secondary app just to create the user without logging admin out
      const secondaryApp = initializeApp({
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
      }, 'SecondaryApp' + Date.now());
      
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, inviteEmail, invitePassword);
      
      // We can use the primary db to write to the users collection
      // since the admin is authenticated there.
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const defaultPermissions: Record<string, boolean> = {
        viewTickets: true,
        replyTickets: true,
        viewDrivers: true,
        approveDriverKyc: true,
        viewCampaigns: true,
        viewDevices: true,
        managePlans: false,
        approveCampaigns: false,
        approveDevices: false,
        viewPayments: false,
        approveWithdrawals: false,
        manageSupportTeam: false,
        systemSettings: false,
        removeTestData: false,
        purgeNetworkData: false
      };

      await setDoc(userDocRef, {
        email: inviteEmail,
        fullName: inviteFullName,
        role: 'SUPPORT_TEAM' as const,
        status: 'ACTIVE',
        permissions: defaultPermissions,
        createdAt: new Date().toISOString()
      });
      
      showToast(`Account created: ${inviteEmail}`, 'success');
      setInviteEmail("");
      setInviteFullName("");
      setInvitePassword("");
    } catch (err: any) {
      showToast(err.message || "Operation failed.", 'error');
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  const handleRemoveWhitelist = async (email: string) => {
    if (!window.confirm(`Revoke access for ${email}?`)) return;
    try {
      await firebaseService.removeFromStaffWhitelist(email);
      showToast(`Access revoked for ${email}`, 'success');
    } catch (err) {
      showToast("Operation failed.", 'error');
    }
  };

  // Phase 1B Interactive Administrative States
  const [inspectorTab, setInspectorTab] = useState<"INFO" | "CONTROL" | "AUDIT">("INFO");
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("CUSTOMER");
  const [editStatus, setEditStatus] = useState<string>("ACTIVE");
  const [editPermissions, setEditPermissions] = useState<Record<string, boolean>>({});
  const [isMutating, setIsMutating] = useState(false);
  const [mutationMessage, setMutationMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Real-time activity/audit logs for selected profile
  const [targetLogs, setTargetLogs] = useState<any[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);

  // Authenticated operator security references
  const currentUserId = auth.currentUser?.uid;
  const currentUserRecord = users.find(u => u.id === currentUserId);
  const currentUserRole = currentUserRecord?.role || "ADMIN"; // Fallback to ADMIN if loading
  const isCurrentUserAdmin = currentUserRole === "ADMIN";
  const isCurrentUserSupportManager = currentUserRole === "SUPPORT_MANAGER";

  // Form initialization on item focus
  useEffect(() => {
    if (selectedUser) {
      setEditName(selectedUser.name || "");
      setEditPhone(selectedUser.phone || "");
      setEditRole(selectedUser.role || "CUSTOMER");
      setEditStatus(selectedUser.status || ((selectedUser as any).isApproved !== false ? "ACTIVE" : "PENDING_APPROVAL"));
      setEditPermissions(selectedUser.permissions || {});
      setMutationMessage(null);
      setInspectorTab("INFO");
    }
  }, [selectedUser]);

  // Real-time audit subscription
  useEffect(() => {
    if (!selectedUser?.id) {
      setTargetLogs([]);
      return;
    }
    setIsLogsLoading(true);
    const logsQuery = query(
      collection(db, "activityLogs"),
      where("targetId", "==", selectedUser.id),
      orderBy("timestamp", "desc")
    );
    const unsubscribe = onSnapshot(logsQuery, (snap) => {
      const items = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTargetLogs(items);
      setIsLogsLoading(false);
    }, (err) => {
      console.warn("[UsersTab] Failed to stream audit trace logs:", err);
      setIsLogsLoading(false);
    });
    return () => unsubscribe();
  }, [selectedUser?.id]);

  // Log action helper
  const logAdminAction = async (action: string, targetId: string, details: string) => {
    try {
      const operator = auth.currentUser;
      await addDoc(collection(db, "activityLogs"), {
        action,
        performedBy: operator?.uid || "SYSTEM",
        performedByName: operator?.email || "System Daemon",
        targetId,
        cityId: "global",
        franchiseId: "global",
        timestamp: serverTimestamp(),
        details
      });
    } catch (err) {
      console.warn("Audit logger issue:", err);
    }
  };

  // Mutate Profile Details
  const handleMutateProfileAndStatus = async () => {
    if (!selectedUser) return;
    
    // Safety assertions check
    if (!isCurrentUserAdmin && !isCurrentUserSupportManager) {
      setMutationMessage({ type: "error", text: "Operation Denied: Insufficient authorization." });
      return;
    }

    if (!editName.trim()) {
      setMutationMessage({ type: "error", text: "Validation Failed: Name field cannot be left blank." });
      return;
    }

    if (editName.length > 50) {
      setMutationMessage({ type: "error", text: "Validation Failed: Name cannot exceed 50 characters." });
      return;
    }

    setIsMutating(true);
    setMutationMessage(null);

    try {
      const isApprovedValue = editStatus === "ACTIVE";
      const updateData: any = {
        name: editName.trim(),
        phone: editPhone.trim(),
        status: editStatus,
        isApproved: isApprovedValue,
        role: editRole,
      };
      
      if (editRole === 'SUPPORT_TEAM') {
        updateData.permissions = editPermissions;
      }

      await firebaseService.updateUserProfile(selectedUser.id, updateData);

      // Audit the action
      await logAdminAction(
        "PROFILE_MUTATION",
        selectedUser.id,
        `Modified display fields. Name: "${editName.trim()}", Role: "${editRole}", Status: "${editStatus}".`
      );

      setMutationMessage({ type: "success", text: "User profile details updated successfully!" });
      
      showToast("Profile Details Synchronized", "success");
    } catch (e: any) {
      console.error(e);
      setMutationMessage({ type: "error", text: e.message || "Failed to submit modifications." });
    } finally {
      setIsMutating(false);
    }
  };

  // Mutate User Role
  const handleMutateSecurityRole = async () => {
    if (!selectedUser) return;

    // Safety check matching guidelines
    if (!isCurrentUserAdmin && !isCurrentUserSupportManager) {
      setMutationMessage({ type: "error", text: "Operation Denied: Insufficient authorization." });
      return;
    }

    // SUPPORT_MANAGER cannot create ADMIN or self-elevate to ADMIN
    if (isCurrentUserSupportManager && editRole === "ADMIN") {
      setMutationMessage({ type: "error", text: "Security Boundary: Support Managers cannot assign Admin roles." });
      return;
    }

    // Role cannot target ADMIN if the selected user itself was an Admin and operator has less permissions
    if (selectedUser.role === "ADMIN" && !isCurrentUserAdmin) {
      setMutationMessage({ type: "error", text: "Security Boundary: Cannot modify Role of an existing Admin." });
      return;
    }

    setIsMutating(true);
    setMutationMessage(null);

    try {
      await firebaseService.updateUserRole(selectedUser.id, editRole);

      // Log to audit trails
      await logAdminAction(
        "ROLE_MUTATION",
        selectedUser.id,
        `Altered Security classification from [${selectedUser.role}] to [${editRole}].`
      );

      setMutationMessage({ type: "success", text: `User promoted to ${editRole} security classification.` });

      showToast(`Role Updated to ${editRole}`, "success");
    } catch (e: any) {
      console.error(e);
      setMutationMessage({ type: "error", text: e.message || "Failed to elevate permissions classification." });
    } finally {
      setIsMutating(false);
    }
  };

  const handleInviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingInvite(true);
    try {
      const inviteId = `INV-STAFF-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      await firebaseService.saveInvitation({
        id: inviteId,
        ownerEmail: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        specialization: "OPERATIONS_STAFF"
      });
      showToast(`Staff invitation sent to ${inviteEmail}`, "success");
      setInviteEmail("");
    } catch (e: any) {
      console.error(e);
      showToast(e.message || "Invitation failed", "error");
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  // Safe Timestamp Formatter
  const formatTimestamp = (ts: any) => {
    if (!ts) return "N/A";
    let date: Date;
    if (ts.seconds) {
      date = new Date(ts.seconds * 1000);
    } else if (ts.toDate && typeof ts.toDate === "function") {
      date = ts.toDate();
    } else if (ts instanceof Date) {
      date = ts;
    } else {
      date = new Date(ts);
    }
    return isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  // Determine if a role belongs to the corporate staff directory
  const isStaffRole = (role?: UserRole) => {
    if (!role) return false;
    return ["ADMIN", "SUPPORT_MANAGER", "SUPPORT_AGENT", "SUPPORT_TEAM", "SUPPORT", "STAFF"].includes(role);
  };

  // 1. Calculations for upper Metrics Bar
  const totalUsersCount = users.length;
  
  const franchiseOwnersCount = users.filter(
    (u) => u.role === "FRANCHISE_OWNER"
  ).length;

  const staffCount = users.filter((u) => isStaffRole(u.role)).length;

  const driverCount = users.filter((u) => u.role === "DRIVER").length;
  const customerCount = users.filter((u) => u.role === "CUSTOMER").length;

  // Filters for directories
  const filteredUsersList = users.filter((u) => {
    const matchesSearch =
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.id?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (activeSubView === "STAFF") {
      return isStaffRole(u.role);
    }

    if (roleFilter !== "ALL") {
      return u.role === roleFilter;
    }

    return true;
  });

  // Get visually distinct badge colors for roles
  const getRoleStyle = (role?: UserRole) => {
    if (!role) {
      return {
        bg: "bg-slate-50 text-slate-700 border-slate-200",
        pill: "bg-slate-500 text-white",
        label: "User",
      };
    }
    switch (role) {
      case "ADMIN":
        return {
          bg: "bg-red-50 text-red-700 border-red-200",
          pill: "bg-red-500 text-white",
          label: "Administrator",
        };
      case "SUPPORT_MANAGER":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          pill: "bg-amber-500 text-white",
          label: "Support Manager",
        };
      case "SUPPORT_TEAM":
        return {
          bg: "bg-amber-100 text-amber-800 border-amber-200",
          pill: "bg-amber-500 text-white",
          label: "Support Team Core",
        };
      case "SUPPORT_AGENT":
      case "SUPPORT":
        return {
          bg: "bg-orange-50 text-orange-700 border-orange-200",
          pill: "bg-orange-500 text-white",
          label: "Support Dispatcher",
        };
      case "STAFF":
        return {
          bg: "bg-indigo-50 text-indigo-700 border-indigo-200",
          pill: "bg-indigo-500 text-white",
          label: "HQ Operations",
        };
      case "FRANCHISE_OWNER":
        return {
          bg: "bg-purple-50 text-purple-700 border-purple-200",
          pill: "bg-purple-500 text-white",
          label: "Franchise Partner",
        };
      case "DRIVER":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          pill: "bg-emerald-500 text-white",
          label: "Device Driver",
        };
      case "CUSTOMER":
        return {
          bg: "bg-blue-50 text-blue-700 border-blue-200",
          pill: "bg-blue-500 text-white",
          label: "Advertiser Partner",
        };
      case "DEVICE":
        return {
          bg: "bg-slate-50 text-slate-700 border-slate-200",
          pill: "bg-slate-500 text-white",
          label: "Hardware node",
        };
      default:
        return {
          bg: "bg-slate-50 text-slate-700 border-slate-200",
          pill: "bg-slate-500 text-white",
          label: role || "External client",
        };
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans" id="users-directory-root">
      {/* Banner Segment */}
      <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-[2rem] shadow-xl text-white relative overflow-hidden" id="users-header-banner">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 blur-3xl rounded-full -mr-16 -mt-16 animate-pulse" />
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-violet-500/5 blur-2xl rounded-full -ml-8 -mb-8" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-5xl font-black uppercase leading-none tracking-tight">
              User & Staff Directory
            </h2>
            <p className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.25em] mt-3 text-indigo-400">
              Manage Registered Users and Staff Accounts
            </p>
          </div>
          <div className="flex gap-2">
            <span className="text-[10px] font-bold uppercase font-mono px-3 py-1.5 bg-slate-800 border border-slate-700 text-emerald-400 rounded-xl flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Connected
            </span>
          </div>
        </div>
      </div>

      {/* Directory Selector Buttons */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-2xl max-w-max border border-slate-200/50" id="directory-selectors">
        {[
          { id: "USERS", label: "User Accounts", icon: Users },
          { id: "INVITE_STAFF", label: "Staff Access Whitelist", icon: Mail },
        ].map((btn) => {
          const Icon = btn.icon;
          const active = activeSubView === btn.id;
          return (
            <button
              key={btn.id}
              onClick={() => {
                setActiveSubView(btn.id as DirectoryView);
                setSelectedUser(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                active
                  ? "bg-white text-slate-900 shadow-md border-b-2 border-indigo-600 scale-[1.02]"
                  : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
              }`}
            >
              <Icon size={14} className={active ? "text-indigo-600" : "text-slate-400"} />
              {btn.label}
            </button>
          );
        })}
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="users-metrics-panel">
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Total Registers</p>
            <h4 className="text-3xl font-black mt-1 font-mono text-slate-800">{totalUsersCount}</h4>
          </div>
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Active Staff</p>
            <h4 className="text-3xl font-black mt-1 font-mono text-slate-800">{staffCount}</h4>
          </div>
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
            <Shield size={20} />
          </div>
        </div>
      </div>

      {/* Main Board viewports */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="directory-content-grid">
        
        {/* Dynamic Column Left (List & Tables) */}
        <div className={`bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm flex flex-col min-h-[500px] ${
          activeSubView === "PERMISSIONS" ? "lg:col-span-12" : "lg:col-span-7"
        }`}>
          {activeSubView !== "PERMISSIONS" && (
            <div className="flex flex-col md:flex-row gap-3 justify-between pb-4 border-b border-slate-100 mb-4">
              {/* Search Element */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search profiles by name, email, credentials, phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Roles filtered drop-down */}
              {activeSubView === "USERS" && (
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-slate-400" />
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-slate-600 rounded-xl py-2.5 px-3 text-xs font-bold focus:outline-none"
                  >
                    <option value="ALL">All Roles ({users.length})</option>
                    <option value="ADMIN">Administrators</option>
                    <option value="SUPPORT_MANAGER">Support Managers</option>
                    <option value="SUPPORT_AGENT">Support Agents</option>
                    <option value="SUPPORT">Legacy Support</option>
                    <option value="STAFF">HQ Staff</option>
                    <option value="FRANCHISE_OWNER">Franchise Owners</option>
                    <option value="DRIVER">Drivers</option>
                    <option value="CUSTOMER">Advertisers</option>
                    <option value="DEVICE">Hardware displays</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* SubView renders */}
          <div className="flex-1 overflow-y-auto max-h-[55vh]" id="directory-viewframe">
            {activeSubView === "USERS" && (
              <div className="space-y-3">
                {filteredUsersList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Info size={32} className="mb-2 text-slate-300" />
                    <p className="text-xs font-black uppercase tracking-wider">No corresponding profiles found</p>
                  </div>
                ) : (
                  filteredUsersList.map((user) => {
                    const roleCfg = getRoleStyle(user.role);
                    const isSelected = selectedUser?.id === user.id;
                    return (
                      <div
                        key={user.id}
                        onClick={() => setSelectedUser(user)}
                        className={`p-4 border rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? "bg-indigo-50/50 border-indigo-200 shadow-sm"
                            : "bg-white border-slate-100 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-mono font-black border ${
                            isSelected ? "bg-indigo-100 border-indigo-200 text-indigo-700" : "bg-slate-100 border-slate-200 text-slate-600"
                          }`}>
                            {user.name ? user.name.slice(0, 2).toUpperCase() : "US"}
                          </div>
                          <div>
                            <div className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                              {user.name || "Unnamed user"}
                              <span className={`text-[9px] font-semibold border px-2 py-0.5 rounded-full ${roleCfg.bg}`}>
                                {roleCfg.label}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-bold mt-0.5">{user.email || "No email"}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <ChevronRight size={16} className={`transition-transform ${isSelected ? "text-indigo-500 translate-x-1" : "text-slate-300"}`} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeSubView === "STAFF" && (
              <div className="space-y-3">
                {filteredUsersList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Info size={32} className="mb-2 text-slate-300" />
                    <p className="text-xs font-black uppercase tracking-wider">No matching staff accounts detected</p>
                  </div>
                ) : (
                  filteredUsersList.map((st) => {
                    const roleCfg = getRoleStyle(st.role);
                    const isSelected = selectedUser?.id === st.id;
                    return (
                      <div
                        key={st.id}
                        onClick={() => setSelectedUser(st)}
                        className={`p-4 border rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                          isSelected ? "bg-indigo-50/50 border-indigo-200 shadow-sm" : "bg-white border-slate-100 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white text-xs font-mono font-black">
                            {st.name?.slice(0, 2).toUpperCase() || "ST"}
                          </div>
                          <div>
                            <div className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                              {st.name || "Staff Member"}
                              <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${roleCfg.bg}`}>
                                {roleCfg.label}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{st.email}</div>
                          </div>
                        </div>
                        <ChevronRight size={16} className={isSelected ? "text-indigo-500" : "text-slate-300"} />
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeSubView === "FRANCHISES" && (
              <div className="space-y-4">
                {INITIAL_FRANCHISES.filter(f => 
                  f.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  f.cityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  f.id.toLowerCase().includes(searchTerm.toLowerCase())
                ).map((fc) => {
                  return (
                    <div
                      key={fc.id}
                      className="p-5 bg-white border border-slate-150 rounded-[1.5rem] hover:border-indigo-200 transition-all shadow-sm relative overflow-hidden"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
                        <div className="flex items-center gap-2">
                          <Building2 size={18} className="text-indigo-500" />
                          <div>
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{fc.cityName} Cluster</h4>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">ID: {fc.id} • Region</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.15em] px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg max-w-max">
                          {fc.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Franchise Owner</p>
                          <p className="font-bold text-slate-800 mt-0.5">{fc.ownerName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{fc.ownerEmail}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Devices</p>
                          <p className="font-bold text-slate-850 mt-0.5 font-mono text-sm text-indigo-600">{fc.totalDevices} Screens</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Registered Drivers</p>
                          <p className="font-bold text-slate-850 mt-0.5 font-mono text-sm text-slate-700">{fc.totalDrivers} Operators</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Split Structure</p>
                          <p className="font-bold text-amber-600 mt-0.5 uppercase text-[10px] tracking-wider bg-amber-50 border border-amber-100 px-2 py-0.5 rounded max-w-max font-black">{fc.revenueModel}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeSubView === "INVITE_STAFF" && (
              <div className="max-w-md mx-auto p-8 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-6">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-slate-800">Add Staff Member</h3>
                  <p className="text-[11px] text-slate-400 mt-1 uppercase font-black tracking-wider">
                    Create a new account for Support Team.
                  </p>
                </div>
                <form onSubmit={handleAddWhitelist} className="space-y-4">
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Staff Full Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Jane Doe"
                      value={inviteFullName}
                      onChange={(e) => setInviteFullName(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Staff Email Address</label>
                    <input 
                      type="email" 
                      required
                      placeholder="staff@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Define Password (Admin Assigned)</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Enter a temporary password"
                      value={invitePassword}
                      onChange={(e) => setInvitePassword(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-xl text-xs font-semibold bg-slate-50 focus:bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Assign Authorization Role</label>
                    <div className="w-full p-3 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 text-slate-800">
                      Support Team Core (SUPPORT_TEAM)
                    </div>
                  </div>
                  <button 
                    type="submit"
                    disabled={isSubmittingInvite}
                    className="w-full p-3 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg"
                  >
                    {isSubmittingInvite ? "Adding..." : "Create Account"}
                  </button>
                </form>

                {whitelist.length > 0 && (
                  <div className="pt-6 border-t border-slate-100 space-y-4">
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800">Whitelisted Staff</h4>
                      <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">Authorized emails for support portal access</p>
                    </div>
                    <div className="space-y-2">
                       {whitelist.map(item => (
                         <div key={item.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between group">
                           <div>
                             <p className="text-[9px] font-black text-slate-900">{item.email}</p>
                             <div className="flex items-center gap-2 mt-0.5">
                               <p className="text-[8px] font-bold text-indigo-500 uppercase">{item.role?.replace('_', ' ')}</p>
                               <span className="text-[7px] text-slate-300">•</span>
                               <p className="text-[8px] font-medium text-slate-400 uppercase italic">Added {new Date(item.createdAt).toLocaleDateString()}</p>
                             </div>
                           </div>
                           <button
                             onClick={() => handleRemoveWhitelist(item.email)}
                             className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                             title="Revoke Permission"
                           >
                             <UserX size={14} />
                           </button>
                         </div>
                       ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeSubView === "PERMISSIONS" && (
              <div className="overflow-x-auto border border-slate-100 rounded-2xl bg-slate-50/50">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200">
                      <th className="p-4 font-black uppercase tracking-wider text-slate-500">Operation / Capability</th>
                      <th className="p-4 font-black uppercase tracking-wider text-red-650 text-center">Admin</th>
                      <th className="p-4 font-black uppercase tracking-wider text-amber-600 text-center">Support Mgr</th>
                      <th className="p-4 font-black uppercase tracking-wider text-orange-600 text-center">Agent</th>
                      <th className="p-4 font-black uppercase tracking-wider text-purple-600 text-center">Fr Owner</th>
                      <th className="p-4 font-black uppercase tracking-wider text-emerald-600 text-center">Driver</th>
                      <th className="p-4 font-black uppercase tracking-wider text-blue-600 text-center">Client</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {[
                      { key: "canApproveDrivers", label: "Approve Driver KYC & Uploads" },
                      { key: "canApproveCampaigns", label: "Moderate & Unfreeze Campaigns" },
                      { key: "canApproveDevices", label: "Approve Hardware Terminals" },
                      { key: "canManageSupportTeams", label: "Manage Diagnostics & Staff" },
                      { key: "canViewGlobalAnalytics", label: "View Unrestricted Analytics" },
                      { key: "canManageFranchises", label: "Provision Dynamic Cities" },
                      { key: "canAccessSystemsAudit", label: "Read Internal Activity Log" },
                      { key: "canDischargeFinances", label: "Discharge Large Financial Requests" },
                    ].map((row) => {
                      return (
                        <tr key={row.key} className="hover:bg-slate-50">
                          <td className="p-4 font-black text-slate-700">{row.label}</td>
                          <td className="p-4 text-center">
                            {PERMISSIONS_BY_ROLE.ADMIN[row.key as keyof typeof PERMISSIONS_BY_ROLE.ADMIN] ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 bg-emerald-150 text-emerald-750 font-black rounded-full text-[10px]">✓</span>
                            ) : (
                              <span className="text-slate-350">—</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {PERMISSIONS_BY_ROLE.SUPPORT_MANAGER[row.key as keyof typeof PERMISSIONS_BY_ROLE.SUPPORT_MANAGER] ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 bg-emerald-150 text-emerald-750 font-black rounded-full text-[10px]">✓</span>
                            ) : (
                              <span className="text-slate-350">—</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {PERMISSIONS_BY_ROLE.SUPPORT_AGENT[row.key as keyof typeof PERMISSIONS_BY_ROLE.SUPPORT_AGENT] ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 bg-emerald-150 text-emerald-750 font-black rounded-full text-[10px]">✓</span>
                            ) : (
                              <span className="text-slate-350">—</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {PERMISSIONS_BY_ROLE.FRANCHISE_OWNER[row.key as keyof typeof PERMISSIONS_BY_ROLE.FRANCHISE_OWNER] ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 bg-emerald-150 text-emerald-750 font-black rounded-full text-[10px]">✓</span>
                            ) : (
                              <span className="text-slate-350">—</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {PERMISSIONS_BY_ROLE.DRIVER[row.key as keyof typeof PERMISSIONS_BY_ROLE.DRIVER] ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 bg-emerald-150 text-emerald-750 font-black rounded-full text-[10px]">✓</span>
                            ) : (
                              <span className="text-slate-350">—</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {PERMISSIONS_BY_ROLE.CUSTOMER[row.key as keyof typeof PERMISSIONS_BY_ROLE.CUSTOMER] ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 bg-emerald-150 text-emerald-750 font-black rounded-full text-[10px]">✓</span>
                            ) : (
                              <span className="text-slate-350">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Column Right (Inspection Details Pane) */}
        {activeSubView !== "PERMISSIONS" && (
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-xl text-white flex flex-col justify-between" id="directory-detail-pane">
            <AnimatePresence mode="wait">
              {selectedUser ? (
                <motion.div
                  key={selectedUser.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-5 flex-1 flex flex-col justify-between"
                >
                  <div className="space-y-5">
                    {/* User Profile Visual Header */}
                    <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                      <div className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center text-xl font-mono font-black italic shadow-lg shadow-indigo-600/30 text-white">
                        {selectedUser.name?.slice(0, 2).toUpperCase() || "US"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-black tracking-tight truncate">{selectedUser.name || "Default Record"}</h3>
                        <p className="text-[10px] font-mono tracking-wider text-indigo-400 mt-0.5 flex items-center gap-1.5 truncate">
                          <Terminal size={10} />
                          UID: {selectedUser.id}
                        </p>
                      </div>
                    </div>

                    {/* Segmented Sub-Tab Navigator */}
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 text-[11px] font-bold">
                      <button
                        onClick={() => {
                          setInspectorTab("INFO");
                          setMutationMessage(null);
                        }}
                        className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${
                          inspectorTab === "INFO" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Info size={12} />
                        Info
                      </button>
                      <button
                        onClick={() => {
                          setInspectorTab("CONTROL");
                          setMutationMessage(null);
                        }}
                        className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${
                          inspectorTab === "CONTROL" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Settings size={12} />
                        Control
                      </button>
                      <button
                        onClick={() => {
                          setInspectorTab("AUDIT");
                          setMutationMessage(null);
                        }}
                        className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer relative ${
                          inspectorTab === "AUDIT" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Activity size={12} />
                        Audits
                        {targetLogs.length > 0 && (
                          <span className="absolute top-1 right-2 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                        )}
                      </button>
                    </div>

                    {/* Sub-Tab Rendering Pane */}
                    <div className="flex-1">
                      {inspectorTab === "INFO" && (
                        <div className="space-y-4">
                          {/* Detailed Metadata fields */}
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3 text-xs">
                            <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl">
                              <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider flex items-center gap-1.5">
                                <Mail size={12} className="text-indigo-400" /> Web Address
                              </span>
                              <span className="font-semibold select-all font-mono truncate max-w-[180px]">{selectedUser.email || "N/A"}</span>
                            </div>

                            <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl">
                              <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider flex items-center gap-1.5">
                                <Phone size={12} className="text-indigo-400" /> Phone Line
                              </span>
                              <span className="font-semibold select-all font-mono">{selectedUser.phone || "N/A"}</span>
                            </div>

                            <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl">
                              <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider flex items-center gap-1.5">
                                <Briefcase size={12} className="text-indigo-400" /> Security Role
                              </span>
                              <span className="font-black text-rose-400 uppercase tracking-wider">{selectedUser.role}</span>
                            </div>

                            <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl">
                              <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider flex items-center gap-1.5">
                                <Calendar size={12} className="text-indigo-400" /> Enrolled Time
                              </span>
                              <span className="font-semibold text-slate-300 font-mono text-[10px]">{formatTimestamp(selectedUser.createdAt)}</span>
                            </div>

                            {selectedUser.cityId && (
                              <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl">
                                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider flex items-center gap-1.5">
                                  <MapPin size={12} className="text-indigo-400" /> Geofence Scope
                                </span>
                                <span className="font-black uppercase text-indigo-300">{getCityName(selectedUser.cityId)}</span>
                              </div>
                            )}

                            <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl">
                              <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider flex items-center gap-1.5">
                                <RefreshCw size={12} className="text-indigo-400" /> Account Status
                              </span>
                              <span className={`font-black uppercase text-[10px] px-2 py-0.5 rounded-lg ${
                                (selectedUser.status as string) === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400" :
                                (selectedUser.status as string) === "SUSPENDED" ? "bg-rose-500/10 text-rose-400" :
                                (selectedUser.status as string) === "INACTIVE" ? "bg-slate-500/20 text-slate-400" :
                                "bg-amber-500/10 text-amber-400"
                              }`}>
                                {selectedUser.status || ((selectedUser as any).isApproved !== false ? "ACTIVE" : "PENDING_APPROVAL")}
                              </span>
                            </div>
                          </div>

                          {/* Display Declarative Permissions */}
                          <div className="space-y-2">
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Assigned Operational Roles</p>
                            <div className="grid grid-cols-1 gap-1.5 max-h-[150px] overflow-y-auto pr-1">
                              {Object.entries(selectedUser.role ? (PERMISSIONS_BY_ROLE[selectedUser.role] || {}) : {}).map(([key, value]) => {
                                return (
                                  <div key={key} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 text-[10px]">
                                    <span className="text-slate-300 capitalize">{key.replace("can", "").replace(/([A-Z])/g, " $1")}</span>
                                    {value ? (
                                      <span className="text-[9px] uppercase font-bold text-emerald-400">Granted</span>
                                    ) : (
                                      <span className="text-[9px] uppercase font-bold text-slate-500">Off</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {inspectorTab === "CONTROL" && (
                        <div className="space-y-4">
                          {/* Authorization Guard Widget */}
                          {(!isCurrentUserAdmin && !isCurrentUserSupportManager) ? (
                            <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                              <AlertOctagon size={16} className="mt-0.5 shrink-0" />
                              <div className="space-y-1">
                                <p className="font-bold">Privilege Bounds Policy Active</p>
                                <p className="text-[10px] text-amber-300/80 leading-relaxed">
                                  Your current administrative role ({currentUserRole}) is not cleared to issue directory mutations.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {/* Feedback Banner */}
                              {mutationMessage && (
                                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                                  mutationMessage.type === "success" 
                                    ? "bg-emerald-500/15 border-emerald-500/20 text-emerald-400" 
                                    : "bg-rose-500/15 border-rose-500/20 text-rose-400"
                                }`}>
                                  {mutationMessage.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                                  <span>{mutationMessage.text}</span>
                                </div>
                              )}

                              {/* Form 1: Profile display name & phone form */}
                              <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-3">
                                <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                                  <FileText size={12} /> Profile Properties
                                </h4>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Display Name</label>
                                  <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-white"
                                    placeholder="Enter full name..."
                                    disabled={isMutating}
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone Line</label>
                                  <input
                                    type="text"
                                    value={editPhone}
                                    onChange={(e) => setEditPhone(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-white font-mono"
                                    placeholder="Enter phone number..."
                                    disabled={isMutating}
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Account Directory Status</label>
                                  <select
                                    value={editStatus}
                                    onChange={(e) => setEditStatus(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-white cursor-pointer"
                                    disabled={isMutating}
                                  >
                                    <option value="ACTIVE" className="bg-slate-900">ACTIVE (Approved)</option>
                                    <option value="INACTIVE" className="bg-slate-900">INACTIVE</option>
                                    <option value="SUSPENDED" className="bg-slate-900">SUSPENDED</option>
                                    <option value="PENDING_APPROVAL" className="bg-slate-900">PENDING_APPROVAL (Under-Review)</option>
                                  </select>
                                </div>

                                <button
                                  onClick={handleMutateProfileAndStatus}
                                  disabled={isMutating}
                                  className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                  {isMutating ? "Writing Operations..." : "Update Profile Fields"}
                                </button>
                              </div>

                              {/* Form 2: Role modulation logic */}
                              <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-3">
                                <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                                  <Shield size={12} /> Policy Classification Role
                                </h4>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Security Role</label>
                                  <select
                                    value={editRole}
                                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-rose-400 font-bold uppercase cursor-pointer"
                                    disabled={isMutating || (selectedUser.role === "ADMIN" && !isCurrentUserAdmin)}
                                  >
                                    <option value="CUSTOMER" className="text-white bg-slate-900">CUSTOMER</option>
                                    <option value="DRIVER" className="text-white bg-slate-900">DRIVER</option>
                                    <option value="FRANCHISE_OWNER" className="text-white bg-slate-900">FRANCHISE_OWNER</option>
                                    <option value="SUPPORT_TEAM" className="text-white bg-slate-900">SUPPORT_TEAM</option>
                                    <option value="STAFF" className="text-white bg-slate-900">STAFF</option>
                                    <option value="SUPPORT" className="text-white bg-slate-900">SUPPORT (Legacy)</option>
                                    {isCurrentUserAdmin && (
                                      <option value="ADMIN" className="text-rose-400 bg-slate-900 font-black">ADMIN</option>
                                    )}
                                  </select>
                                </div>

                                <button
                                  onClick={handleMutateSecurityRole}
                                  disabled={isMutating || (selectedUser.role === "ADMIN" && !isCurrentUserAdmin)}
                                  className="w-full mt-2 bg-rose-600 hover:bg-rose-500 text-white py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                  {isMutating ? "Writing Operations..." : "Mutate Security Role"}
                                </button>
                              </div>

                              {editRole === 'SUPPORT_TEAM' && (
                                <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-3">
                                  <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                                    <Shield size={12} /> Assigned Permissions
                                  </h4>
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Driver Operations</p>
                                      {[
                                        { key: 'viewDrivers', label: 'View Drivers' },
                                        { key: 'approveDriverKyc', label: 'Approve Driver KYC' },
                                        { key: 'suspendDrivers', label: 'Suspend Drivers' }
                                      ].map(p => (
                                        <label key={p.key} className="flex items-center gap-2 text-[10px] text-slate-300">
                                          <input type="checkbox" checked={!!editPermissions[p.key]} onChange={e => setEditPermissions({...editPermissions, [p.key]: e.target.checked})} className="rounded bg-black/40 border-white/10" />
                                          {p.label}
                                        </label>
                                      ))}
                                    </div>
                                    <div className="space-y-2">
                                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Campaign Operations</p>
                                      {[
                                        { key: 'viewCampaigns', label: 'View Campaigns' },
                                        { key: 'approveCampaigns', label: 'Approve Campaigns' },
                                        { key: 'startCampaigns', label: 'Start Campaigns' },
                                        { key: 'stopCampaigns', label: 'Stop Campaigns' },
                                        { key: 'rejectCampaigns', label: 'Reject Campaigns' }
                                      ].map(p => (
                                        <label key={p.key} className="flex items-center gap-2 text-[10px] text-slate-300">
                                          <input type="checkbox" checked={!!editPermissions[p.key]} onChange={e => setEditPermissions({...editPermissions, [p.key]: e.target.checked})} className="rounded bg-black/40 border-white/10" />
                                          {p.label}
                                        </label>
                                      ))}
                                    </div>
                                    <div className="space-y-2">
                                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Terminal Operations</p>
                                      {[
                                        { key: 'viewDevices', label: 'View Devices' },
                                        { key: 'approveDevices', label: 'Approve Devices' },
                                        { key: 'remoteDeviceAccess', label: 'Remote Device Access' }
                                      ].map(p => (
                                        <label key={p.key} className="flex items-center gap-2 text-[10px] text-slate-300">
                                          <input type="checkbox" checked={!!editPermissions[p.key]} onChange={e => setEditPermissions({...editPermissions, [p.key]: e.target.checked})} className="rounded bg-black/40 border-white/10" />
                                          {p.label}
                                        </label>
                                      ))}
                                    </div>
                                    <div className="space-y-2">
                                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Support Operations</p>
                                      {[
                                        { key: 'viewTickets', label: 'View Tickets' },
                                        { key: 'replyTickets', label: 'Reply Tickets' },
                                        { key: 'closeTickets', label: 'Close Tickets' }
                                      ].map(p => (
                                        <label key={p.key} className="flex items-center gap-2 text-[10px] text-slate-300">
                                          <input type="checkbox" checked={!!editPermissions[p.key]} onChange={e => setEditPermissions({...editPermissions, [p.key]: e.target.checked})} className="rounded bg-black/40 border-white/10" />
                                          {p.label}
                                        </label>
                                      ))}
                                    </div>
                                    <div className="space-y-2">
                                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Financial Operations</p>
                                      {[
                                        { key: 'viewPayments', label: 'View Payments' },
                                        { key: 'approveWithdrawals', label: 'Approve Withdrawals' }
                                      ].map(p => (
                                        <label key={p.key} className="flex items-center gap-2 text-[10px] text-slate-300">
                                          <input type="checkbox" checked={!!editPermissions[p.key]} onChange={e => setEditPermissions({...editPermissions, [p.key]: e.target.checked})} className="rounded bg-black/40 border-white/10" />
                                          {p.label}
                                        </label>
                                      ))}
                                    </div>
                                    <div className="space-y-2">
                                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Administration</p>
                                      {[
                                        { key: 'createStaff', label: 'Create Staff Members' },
                                        { key: 'editStaffPermissions', label: 'Edit Staff Permissions' },
                                        { key: 'manageSupportTeam', label: 'Manage Support Team' },
                                        { key: 'managePlans', label: 'Manage Package Plans' }
                                      ].map(p => (
                                        <label key={p.key} className="flex items-center gap-2 text-[10px] text-slate-300">
                                          <input type="checkbox" checked={!!editPermissions[p.key]} onChange={e => setEditPermissions({...editPermissions, [p.key]: e.target.checked})} className="rounded bg-black/40 border-white/10" />
                                          {p.label}
                                        </label>
                                      ))}
                                    </div>
                                    <div className="space-y-2">
                                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">System Operations</p>
                                      {[
                                        { key: 'systemSettings', label: 'Access System Settings' },
                                        { key: 'removeTestData', label: 'Remove Test Data' },
                                        { key: 'purgeNetworkData', label: 'Purge Network Data' }
                                      ].map(p => (
                                        <label key={p.key} className="flex items-center gap-2 text-[10px] text-slate-300">
                                          <input type="checkbox" checked={!!editPermissions[p.key]} onChange={e => setEditPermissions({...editPermissions, [p.key]: e.target.checked})} className="rounded bg-black/40 border-white/10" />
                                          {p.label}
                                        </label>
                                      ))}
                                    </div>
                                  </div>

                                  <button
                                    onClick={handleMutateProfileAndStatus}
                                    disabled={isMutating}
                                    className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                  >
                                    {isMutating ? "Writing Operations..." : "Update Permissions"}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {inspectorTab === "AUDIT" && (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center bg-black/30 border border-white/5 py-1 px-3 rounded-lg text-[9px] font-mono text-slate-400 tracking-wider">
                            <span>[TRACER CONNECTION: LIVE]</span>
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                          </div>

                          {/* Monospace scrollable log container */}
                          <div className="h-[280px] overflow-y-auto bg-black p-3 rounded-2xl border border-white/5 font-mono text-[10px] text-slate-300 space-y-2.5 scrollbar-thin scrollbar-thumb-white/10">
                            {isLogsLoading ? (
                              <div className="text-slate-550 italic animate-pulse flex items-center justify-center h-full gap-2">
                                <Terminal size={14} className="animate-spin text-indigo-400" />
                                <span>Scanning blockchain logs...</span>
                              </div>
                            ) : targetLogs.length === 0 ? (
                              <div className="text-slate-550 italic flex flex-col items-center justify-center h-full text-center space-y-2">
                                <Terminal size={24} className="text-slate-600" />
                                <span>No activity log traces recorded for this UID.</span>
                              </div>
                            ) : (
                              targetLogs.map((log) => {
                                const logTime = formatTimestamp(log.timestamp);
                                return (
                                  <div key={log.id} className="border-b border-white/5 pb-2 space-y-1">
                                    <div className="flex justify-between text-[9px] text-slate-500">
                                      <span>{logTime}</span>
                                      <span className="text-indigo-400 truncate max-w-[130px]">{log.performedByName || "SYSTEM"}</span>
                                    </div>
                                    <p className="text-[10px]">
                                      <span className={`font-black ${
                                        log.action === "ROLE_MUTATION" ? "text-amber-400" : "text-sky-400"
                                      }`}>
                                        [{log.action}]
                                      </span>{" "}
                                      {log.details}
                                    </p>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-4 mt-4 flex justify-between items-center text-slate-400 text-[10px]">
                    <span className="italic flex items-center gap-1.5 select-none">
                      <Shield size={12} className="text-indigo-400" /> Secure Admin Session
                    </span>
                    <span className="font-bold select-none text-[9px] text-slate-500">Staff Audit Verified</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty-panel"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center text-center space-y-4 my-auto py-12"
                >
                  <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center text-slate-400 animate-pulse">
                    <Grid size={32} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-wider text-slate-300">Detailed Inspector</h4>
                    <p className="text-[10px] text-slate-500 max-w-[250px] mx-auto mt-1 leading-relaxed">
                      Select a user record from the main list panel to review detailed security credentials, operational scopes, and role permissions.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
