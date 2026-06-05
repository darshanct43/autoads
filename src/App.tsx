import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth } from './lib/firebase.js';
import { firebaseService } from './services/firebaseService.js';
import { UserRole } from './types.js';

// Component Imports
import Auth from './components/Auth.js';
import BootAnimation from './components/common/BootAnimation.js';
import AutoLoader from './components/common/AutoLoader.js';
import AdminPortal from './components/portals/AdminPortal.js';
import CustomerPortal from './components/portals/CustomerPortal.js';
import DevicePortal from './components/portals/DevicePortal.js';
import DriverPortal from './components/portals/DriverPortal.js';
import FranchisePortal from './components/portals/FranchisePortal.js';
import SupportPortal from './components/portals/SupportPortal.js';
import { ErrorBoundary } from './components/common/ErrorBoundary.js';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBoot, setShowBoot] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const emailLower = firebaseUser.email?.toLowerCase() || '';
          
          // Fetch additional profile elements to determine the precise role
          const profile = await firebaseService.getUserProfile(firebaseUser.uid);
          const driverProfile = await firebaseService.getDriverProfile(firebaseUser.uid);
          
          let role: UserRole = 'CUSTOMER';
          
          if (profile?.role === 'ADMIN' || emailLower === 'admin@autoads.in' || emailLower === 'darshanct43@gmail.com') {
            role = 'ADMIN';
          } else if (profile?.role === 'SUPPORT' || profile?.role === 'STAFF' || emailLower === 'vijayathrishu@gmail.com' || emailLower.includes('support')) {
            role = 'SUPPORT';
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
      await signOut(auth);
      setUser(null);
      setUserRole(null);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const handleRoleJump = (role: UserRole) => {
    setUserRole(role);
  };

  // If boot animation is active, show the majestic Rickshaw animation
  if (showBoot) {
    return <BootAnimation onComplete={() => setShowBoot(false)} />;
  }

  // Loader screen after boot, while verifying user identity
  if (loading) {
    return (
      <div id="app-root-loader" className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <AutoLoader />
      </div>
    );
  }

  // Render components according to user auth state and role
  return (
    <ErrorBoundary>
      {!user || !userRole ? (
        <Auth onLogin={(role: UserRole) => setUserRole(role)} />
      ) : (
        <React.Fragment>
          {userRole === 'ADMIN' && (
            <AdminPortal onLogout={handleLogout} onRoleJump={handleRoleJump} />
          )}
          {userRole === 'SUPPORT' && (
            <SupportPortal onLogout={handleLogout} onRoleJump={handleRoleJump} />
          )}
          {userRole === 'FRANCHISE_OWNER' && (
            <FranchisePortal onLogout={handleLogout} />
          )}
          {userRole === 'FRANCHISE_STAFF' && (
            <FranchisePortal onLogout={handleLogout} />
          )}
          {userRole === 'DRIVER' && (
            <DriverPortal onLogout={handleLogout} />
          )}
          {userRole === 'CUSTOMER' && (
            <CustomerPortal onLogout={handleLogout} />
          )}
          {userRole === 'DEVICE' && (
            <DevicePortal onLogout={handleLogout} />
          )}
          {/* Fallback standard route */}
          {!['ADMIN', 'SUPPORT', 'FRANCHISE_OWNER', 'FRANCHISE_STAFF', 'DRIVER', 'CUSTOMER', 'DEVICE'].includes(userRole) && (
            <CustomerPortal onLogout={handleLogout} />
          )}
        </React.Fragment>
      )}
    </ErrorBoundary>
  );
}
