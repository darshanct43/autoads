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
import ChatBot from './components/common/ChatBot';
import { AnimatePresence, motion } from 'motion/react';
import { LogOut, Layout } from 'lucide-react';
import { cn } from '@/lib/utils';

import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { firebaseService } from '@/services/firebaseService';

import StrictVerificationSystem from './components/common/StrictVerificationSystem';
import { offlineStorageService } from './services/offlineStorageService';

export default function App() {
  const [role, setRole] = useState<UserRole | null>(() => {
    // Initial check for device simulator session
    if (typeof window !== 'undefined' && localStorage.getItem('auto_ads_device_uid')) {
      return 'DEVICE';
    }
    return null;
  });
  const [systemState, setSystemState] = useState<'BOOT' | 'INTRO' | 'AUTH' | 'PORTAL'>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('auto_ads_device_uid')) {
      return 'PORTAL';
    }
    return 'BOOT';
  });
  const [authReady, setAuthReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isOfflineVerified, setIsOfflineVerified] = useState(false);

  const checkOfflineVerification = async () => {
    const sessionUid = auth.currentUser?.uid || localStorage.getItem('auto_ads_device_uid');
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
      const sessionUid = auth.currentUser?.uid || localStorage.getItem('auto_ads_device_uid');
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
      console.log("[App] Auth State Changed:", user ? "USER PRESENT" : "NO USER");
      
      await checkOfflineVerification();
      
      // Do not overwrite role if we are in Device Simulator mode
      if (localStorage.getItem('auto_ads_device_uid')) {
        setRole('DEVICE');
        setSystemState('PORTAL');
        setAuthReady(true);
        setIsInitializing(false);
        return;
      }

      if (user) {
        const emailLower = user.email?.toLowerCase() || '';
        
        // Immediate Admin Lock-in for recognized accounts
        if (emailLower === 'darshanct43@gmail.com') {
          console.log("[App] Super Admin detected:", emailLower);
          setRole('ADMIN');
          setSystemState('PORTAL');
          setAuthReady(true);
          setIsInitializing(false);
          return;
        }

        try {
          const profile = await firebaseService.getUserProfile(user.uid);
          const driverProfile = await firebaseService.getDriverProfile(user.uid);
          
          let userRole: UserRole = 'CUSTOMER';
          
          if (emailLower === 'admin@autoads.in' || emailLower === 'darshanct43@gmail.com') {
            userRole = profile?.role as UserRole || 'ADMIN';
          } else if (emailLower === 'vijayathrishu@gmail.com' || emailLower.includes('support') || emailLower.includes('staff') || emailLower.includes('agent')) {
            userRole = 'SUPPORT';
          } else if (profile?.role === 'DRIVER' || driverProfile || emailLower.includes('driver')) {
            userRole = 'DRIVER';
          } else if (profile?.role === 'STAFF' || profile?.role === 'SUPPORT') {
            userRole = profile?.role as UserRole;
          }
          
          // If driver profile is missing critical details, redirect to profile setup in Auth
          if (userRole === 'DRIVER' && !driverProfile) {
            console.log("[App] Driver record missing, redirecting to Auth setup");
            setSystemState('AUTH');
            setRole(userRole);
            return;
          }

          setRole(userRole);
          setSystemState('PORTAL');
        } catch (e) {
          console.warn("[App] Session recovery silent failure:", e);
          if (emailLower === 'admin@autoads.in') {
            setRole('ADMIN');
            setSystemState('PORTAL');
          }
        }
      }
      
      setAuthReady(true);
      setIsInitializing(false);
    });

    return () => unsub();
  }, [systemState]);

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
      localStorage.removeItem('auto_ads_device_uid');
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
          <BootAnimation onComplete={() => setSystemState('INTRO')} />
        )}

        {systemState === 'INTRO' && (
          <BrandIntroduction onComplete={() => setSystemState('AUTH')} />
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
            {role === 'ADMIN' && <AdminPortal onRoleJump={handleRoleJump} onLogout={handleLogout} />}
            {role === 'DRIVER' && <DriverPortal onLogout={handleLogout} />}
            {role === 'CUSTOMER' && <CustomerPortal onLogout={handleLogout} />}
            {(role === 'STAFF' || role === 'SUPPORT') && <SupportPortal onRoleJump={handleRoleJump} onLogout={handleLogout} />}
            {role === 'DEVICE' && <DevicePortal onLogout={handleLogout} />}
            
            {/* Brand Popup (Mayaan) */}
            <BrandPopup />
            
            {/* Global Features */}
            {(role === 'CUSTOMER' || role === 'DRIVER') && <ChatBot />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
