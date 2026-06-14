import React, { useState, useEffect, Suspense, lazy } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth } from './lib/firebase';
import { firebaseService } from './services/firebaseService';
import { UserRole } from './types';

// Component Imports
import Auth from './components/Auth';
import BootAnimation from './components/common/BootAnimation';
import AutoLoader from './components/common/AutoLoader';

// Lazy Loaded Portals for Performance Optimization
const AdminPortal = lazy(() => import('./components/portals/AdminPortal'));
const CustomerPortal = lazy(() => import('./components/portals/CustomerPortal'));
const DevicePortal = lazy(() => import('./components/portals/DevicePortal'));
const DriverPortal = lazy(() => import('./components/portals/DriverPortal'));
const SupportPortal = lazy(() => import('./components/portals/SupportPortal'));

import DriverQuotesExtension from './components/portals/DriverQuotesExtension';
import FranchisePortal from './components/portals/FranchisePortal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { PWAInstallPrompt } from './components/common/PWAInstallPrompt';

// Safe storage helpers for platform sandbox resilience
const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn("[Storage] Read access blocked or unsupported in this container", e);
    return null;
  }
};

const safeSetItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn("[Storage] Write access blocked or unsupported in this container", e);
  }
};

const safeRemoveItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn("[Storage] Delete access blocked or unsupported in this container", e);
  }
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBoot, setShowBoot] = useState(true);

  console.log("[FORENSIC] [App] Rendering app with state:", { userExists: !!user, email: user?.email, userRole, loading, showBoot });

  useEffect(() => {
    // Safety Force Start: If still stuck in boot or loading after 3.5 seconds, force continue
    console.log("[FORENSIC] [App] Registering 3.5s safety load timeout hook");
    const timer = setTimeout(() => {
      if (showBoot || loading) {
        console.warn("[FORENSIC] [App] SAFETY TRIGGERED: Loading had stalled. Forcing main interface activation!");
        setShowBoot(false);
        setLoading(false);
      }
    }, 3500);
    return () => clearTimeout(timer);
  }, [showBoot, loading]);

  useEffect(() => {
    console.log("[FORENSIC] [App] Initialization hook launched");
    // Check for offline debug bypass session
    const isOffline = safeGetItem('auto_ads_offline_mode') === 'true';
    if (isOffline) {
      const offlineRole = (safeGetItem('auto_ads_offline_role') as UserRole) || 'CUSTOMER';
      console.log("[FORENSIC] [App] BYPASS ACTIVED: Offline mode enabled for role:", offlineRole);
      setUser({ uid: 'OFFLINE_UID', email: `${offlineRole.toLowerCase()}@autoads.in` } as any);
      setUserRole(offlineRole);
      setLoading(false);
      setShowBoot(false);
      return;
    }

    console.log("[FORENSIC] [App] Registering Firebase Auth state change subscriber");
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      console.log("[FORENSIC] [App] Firebase Auth state changed event received. User authenticated:", !!firebaseUser, firebaseUser?.email);
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const emailLower = firebaseUser.email?.toLowerCase() || '';
          
          console.log("[FORENSIC] [App] Profile check task starting for user UID:", firebaseUser.uid);
          const profile = await firebaseService.getUserProfile(firebaseUser.uid);
          const driverProfile = await firebaseService.getDriverProfile(firebaseUser.uid);
          console.log("[FORENSIC] [App] User records fetched. Applet system profile role:", profile?.role, "Driver record exists:", !!driverProfile);
          
          let role: UserRole = 'CUSTOMER';
          
          if (profile?.role === 'ADMIN' || emailLower === 'admin@autoads.in' || emailLower === 'darshanct43@gmail.com') {
            role = 'ADMIN';
          } else if (profile?.role === 'SUPPORT' || profile?.role === 'SUPPORT_AGENT' || profile?.role === 'SUPPORT_MANAGER' || profile?.role === 'SUPPORT_TEAM' || profile?.role === 'STAFF' || emailLower.includes('support')) {
            role = 'SUPPORT_TEAM';
          } else if (profile?.role === 'FRANCHISE_STAFF') {
            role = 'FRANCHISE_STAFF';
          } else if (profile?.role === 'FRANCHISE_OWNER') {
            role = 'FRANCHISE_OWNER';
          } else if (emailLower === 'franchise@autoads.in' || emailLower.includes('franchise')) {
            role = 'FRANCHISE_OWNER';
          } else if (profile?.role === 'DRIVER' || driverProfile) {
            role = 'DRIVER';
          } else if (profile?.role) {
            role = profile.role as UserRole;
          }

          if (safeGetItem('auto_ads_is_terminal') === 'true') {
            console.log("[FORENSIC] [App] Overriding role to DEVICE due to is_terminal flat");
            role = 'DEVICE';
          }
          
          console.log("[FORENSIC] [App] Determined role outcome:", role);
          setUserRole(role);
        } catch (err) {
          console.error("[FORENSIC] [App] Non-fatal error while fetching profile, falling back gracefully to CUSTOMER:", err);
          setUserRole('CUSTOMER');
        }
      } else {
        console.log("[FORENSIC] [App] No authenticated user detected, cleaning role state");
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => {
      console.log("[FORENSIC] [App] Cleanup hook triggered, unsubscribing from auth state updates");
      unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      safeRemoveItem('auto_ads_is_terminal');
      safeRemoveItem('auto_ads_offline_mode');
      safeRemoveItem('auto_ads_offline_role');
      await signOut(auth).catch(() => {});
      setUser(null);
      setUserRole(null);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const handleRoleJump = (role: UserRole) => {
    setUserRole(role);
  };

  // Render components according to user auth state and role
  return (
    <ErrorBoundary componentName="Network Core">
      {showBoot ? (
        <BootAnimation onComplete={() => setShowBoot(false)} />
      ) : loading ? (
        <div id="app-root-loader" className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
          <AutoLoader />
        </div>
      ) : !user || !userRole ? (
        <Auth onLogin={(role: UserRole) => setUserRole(role)} />
      ) : (
        <React.Fragment>
          <PWAInstallPrompt />
          <Suspense fallback={
            <div id="portal-lazy-loader" className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
              <AutoLoader />
            </div>
          }>
            {userRole === 'ADMIN' && (
              <AdminPortal onLogout={handleLogout} onRoleJump={handleRoleJump} />
            )}
            {['SUPPORT', 'SUPPORT_AGENT', 'SUPPORT_MANAGER', 'SUPPORT_TEAM'].includes(userRole) && (
              <SupportPortal onLogout={handleLogout} onRoleJump={handleRoleJump} />
            )}
            {userRole === 'DRIVER' && (
              <React.Fragment>
                <DriverPortal onLogout={handleLogout} />
                <DriverQuotesExtension />
              </React.Fragment>
            )}
            {userRole === 'CUSTOMER' && (
              <CustomerPortal onLogout={handleLogout} />
            )}
            {userRole === 'DEVICE' && (
              <DevicePortal onLogout={handleLogout} />
            )}
            {/* Fallback standard route */}
            {!['ADMIN', 'SUPPORT', 'SUPPORT_AGENT', 'SUPPORT_MANAGER', 'SUPPORT_TEAM', 'DRIVER', 'CUSTOMER', 'DEVICE'].includes(userRole) && (
              <CustomerPortal onLogout={handleLogout} />
            )}
          </Suspense>
        </React.Fragment>
      )}
    </ErrorBoundary>
  );
}
