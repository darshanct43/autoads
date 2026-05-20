/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { UserRole } from './types';
import Auth from './components/Auth';
import AdminPortal from './components/portals/AdminPortal';
import DriverPortal from './components/portals/DriverPortal';
import CustomerPortal from './components/portals/CustomerPortal';
import SupportPortal from './components/portals/SupportPortal';
import DevicePortal from './components/portals/DevicePortal';
import BootAnimation from './components/common/BootAnimation';
import BrandIntroduction from './components/common/BrandIntroduction';
import BrandPopup from './components/common/BrandPopup';
import AdminAssistant from './components/common/AdminAssistant';
import { AnimatePresence, motion } from 'motion/react';
import { LogOut, Layout, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from './components/common/ErrorBoundary';

import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { firebaseService } from '@/services/firebaseService';

import StrictVerificationSystem from './components/common/StrictVerificationSystem';
import { offlineStorageService } from './services/offlineStorageService';

export default function App() {
  const [role, setRole] = useState<UserRole | null>(() => {
    // Initial check for device simulator session
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      // Only default to DEVICE if explicitly in terminal mode
      if (params.has('terminalId') || localStorage.getItem('auto_ads_is_terminal') === 'true') {
        return 'DEVICE';
      }
    }
    return null;
  });
  const [systemState, setSystemState] = useState<'BOOT' | 'INTRO' | 'AUTH' | 'PORTAL'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      // If we have a terminal session, skip the intros and go straight to Portal
      if (params.has('terminalId') || localStorage.getItem('auto_ads_is_terminal') === 'true') {
        return 'PORTAL';
      }
    }
    return 'BOOT';
  });
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isOfflineVerified, setIsOfflineVerified] = useState(false);

  const handleBootComplete = () => {
    setSystemState(prev => {
      if (prev === 'BOOT') return 'INTRO';
      return prev;
    });
  };

  const handleIntroComplete = () => {
    setSystemState(prev => {
      // If onAuthStateChanged already set us to PORTAL, don't revert to AUTH
      if (prev === 'INTRO') return 'AUTH';
      return prev;
    });
  };

  const checkOfflineVerification = async () => {
    const sessionUid = auth.currentUser?.uid || localStorage.getItem('auto_ads_terminal_id');
    if (sessionUid) {
      try {
        const meta = await offlineStorageService.getMeta(sessionUid);
        const isVerified = meta.rc === 'uploaded' && meta.dl === 'uploaded' && meta.aadhar === 'uploaded' && meta.selfie === 'uploaded';
        setIsOfflineVerified(isVerified);
      } catch (err) {
        console.warn("[App] Offline meta check failed:", err);
      }
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      console.log("[App] Hash Change detected:", hash);
      if (hash === 'auth' || hash === '') {
        setSystemState('AUTH');
        setRole(null);
        setIsOfflineVerified(false);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (systemState === 'AUTH' && role === null) {
      if (window.location.hash !== '#auth') window.location.hash = 'auth';
    } else if (systemState === 'PORTAL' && role) {
      if (window.location.hash !== `#${role.toLowerCase()}`) window.location.hash = role.toLowerCase();
    }
  }, [systemState, role]);

  useEffect(() => {
    // Watch for online status to trigger sync
    const handleOnline = () => {
      const sessionUid = auth.currentUser?.uid || localStorage.getItem('auto_ads_terminal_id');
      if (sessionUid && isOfflineVerified) {
        offlineStorageService.syncDocuments(sessionUid);
      }
    };

    window.addEventListener('online', handleOnline);
    
    // Periodic sync check (background worker simulation)
    const interval = setInterval(() => {
      handleOnline();
    }, 60000); // Check every minute

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, [isOfflineVerified]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      console.log("[App] Auth State Changed:", user ? `USER: ${user.email}` : "NO USER");
      
      await checkOfflineVerification();
      
      // Only force DEVICE mode if explicitly in terminal mode via toggle
      if (localStorage.getItem('auto_ads_is_terminal') === 'true') {
        setRole('DEVICE');
        setSystemState('PORTAL');
        setAuthReady(true);
        setIsInitializing(false);
        return;
      }

      if (user) {
        setLoading(true);
        const emailLower = user.email?.toLowerCase() || '';
        
        try {
          const profile = await firebaseService.getUserProfile(user.uid);
          const driverProfile = await firebaseService.getDriverProfile(user.uid);
          
          let userRole: UserRole = 'CUSTOMER';
          
          // Role Priority Resolution (Trust Firestore Profile First)
          if (profile?.role === 'ADMIN' || emailLower === 'admin@autoads.in' || emailLower === 'darshanct43@gmail.com') {
            userRole = 'ADMIN';
          } else if (profile?.role === 'SUPPORT' || profile?.role === 'STAFF' || emailLower === 'vijayathrishu@gmail.com' || emailLower.includes('support')) {
            userRole = 'SUPPORT';
          } else if (emailLower === '8861574729@autoads.in' || profile?.role === 'DRIVER' || driverProfile || emailLower.includes('driver')) {
            userRole = 'DRIVER'; 
          } else if (profile?.role) {
            userRole = profile.role as UserRole;
          }
          
          // Final check for terminal switch
          if (localStorage.getItem('auto_ads_is_terminal') === 'true') {
            userRole = 'DEVICE';
          }
          
          console.log("[App] Final Resolved Role:", userRole, "from profile:", profile?.role);
          
          // If driver profile is missing critical details, redirect to profile setup in Auth
          // DEMO BYPASS: Never force profile setup for the demo user
          if (userRole === 'DRIVER' && !driverProfile && emailLower !== '8861574729@autoads.in') {
            console.log("[App] Driver record missing, redirecting to Auth setup");
            setRole(userRole);
            setSystemState('AUTH');
          } else {
            setRole(userRole);
            setSystemState('PORTAL');
          }
        } catch (e) {
          console.warn("[App] Session recovery failure details:", e);
          const isAdminEmail = emailLower === 'admin@autoads.in' || emailLower === 'darshanct43@gmail.com';
          const isStaffEmail = emailLower === 'vijayathrishu@gmail.com';
          
          if (isAdminEmail) {
            console.log("[App] Rescuing admin session via email fallback");
            setRole('ADMIN');
            setSystemState('PORTAL');
          } else if (isStaffEmail) {
            console.log("[App] Rescuing staff session via email fallback");
            setRole('SUPPORT');
            setSystemState('PORTAL');
          }
        }
      } else {
        setRole(null);
        if (systemState === 'PORTAL') setSystemState('AUTH');
      }
      
      setAuthReady(true);
      setIsInitializing(false);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleLogin = (selectedRole: UserRole) => {
    checkOfflineVerification();
    setRole(selectedRole);
    setSystemState('PORTAL');
  };

  const handleRoleJump = (newRole: UserRole) => {
    setRole(newRole);
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('auto_ads_terminal_id');
      localStorage.removeItem('auto_ads_is_terminal');
      localStorage.removeItem('auto_ads_access_key');
      await signOut(auth);
      setRole(null);
      setSystemState('AUTH');
      setIsOfflineVerified(false);
    } catch (e) {
      console.error("Sign out error", e);
      setRole(null);
      setSystemState('AUTH');
    }
  };

  return (
    <div className="min-h-screen font-sans selection:bg-amber-500/30 overflow-x-hidden">
      <AnimatePresence mode="wait">
        {systemState === 'BOOT' && (
          <BootAnimation onComplete={handleBootComplete} />
        )}

        {systemState === 'INTRO' && (
          <BrandIntroduction onComplete={handleIntroComplete} />
        )}

        {systemState === 'AUTH' && (
          <motion.div
            key="auth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Auth onLogin={handleLogin} />
          </motion.div>
        )}

        {systemState === 'PORTAL' && role && (
          <motion.div
            key="portal"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="relative"
          >
            <ErrorBoundary componentName={`${role} Portal`}>
              {role === 'ADMIN' && <AdminPortal onRoleJump={handleRoleJump} onLogout={handleLogout} />}
              {role === 'DRIVER' && <DriverPortal onLogout={handleLogout} />}
              {role === 'CUSTOMER' && <CustomerPortal onLogout={handleLogout} />}
              {(role === 'STAFF' || role === 'SUPPORT') && <SupportPortal onRoleJump={handleRoleJump} onLogout={handleLogout} />}
              {role === 'DEVICE' && <DevicePortal onLogout={handleLogout} />}
            </ErrorBoundary>
            
            {/* Brand Popup (Mayaan) */}
            <BrandPopup />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
