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

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBoot, setShowBoot] = useState(true);

  console.log("[DEBUG] App render state:", { user: user?.email, userRole, loading, showBoot });

  useEffect(() => {
    // Safety Force Start: If still stuck in boot or loading after 7 seconds, force continue
    const timer = setTimeout(() => {
      if (showBoot || loading) {
        console.warn("[DEBUG] Safety timeout triggered: forcing showBoot=false, loading=false");
        setShowBoot(false);
        setLoading(false);
      }
    }, 7000);
    return () => clearTimeout(timer);
  }, [showBoot, loading]);

  useEffect(() => {
    // Check for offline debug bypass session
    console.log("[DEBUG] App initialization hook started");
    const isOffline = localStorage.getItem('auto_ads_offline_mode') === 'true';
    if (isOffline) {
      console.log("[DEBUG] Offline mode detected");
      const offlineRole = (localStorage.getItem('auto_ads_offline_role') as UserRole) || 'CUSTOMER';
      setUser({ uid: 'OFFLINE_UID', email: `${offlineRole.toLowerCase()}@autoads.in` } as any);
      setUserRole(offlineRole);
      setLoading(false);
      setShowBoot(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      console.log("[DEBUG] Auth state changed:", firebaseUser?.email || "No user");
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const emailLower = firebaseUser.email?.toLowerCase() || '';
          
          console.log("[DEBUG] Fetching profile for:", firebaseUser.uid);
          const profile = await firebaseService.getUserProfile(firebaseUser.uid);
          const driverProfile = await firebaseService.getDriverProfile(firebaseUser.uid);
          console.log("[DEBUG] Profile fetched:", profile?.role, "Driver profile:", !!driverProfile);
          
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

          if (localStorage.getItem('auto_ads_is_terminal') === 'true') {
            role = 'DEVICE';
          }
          
          setUserRole(role);
        } catch (err) {
          console.error("Error fetching user profile or determining role:", err);
          setUserRole('CUSTOMER');
        }
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      localStorage.removeItem('auto_ads_is_terminal');
      localStorage.removeItem('auto_ads_offline_mode');
      localStorage.removeItem('auto_ads_offline_role');
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
