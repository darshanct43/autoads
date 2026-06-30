import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import Auth from './components/Auth';
import AdminPortal from './components/portals/AdminPortal';
import CustomerPortal from './components/portals/CustomerPortal';
import SupportPortal from './components/portals/SupportPortal';
import FranchisePortal from './components/portals/FranchisePortal';
import DriverPortal from './components/portals/DriverPortal';
import SafeRideView from './components/public/SafeRideView';
import DevicePortal from './components/portals/DevicePortal';
import LoaderPage from './components/public/LoaderPage';
import BrandIntroduction from './components/common/BrandIntroduction';
import BootAnimation from './components/common/BootAnimation';
import { UserRole } from './types';
import { firebaseService } from './services/firebaseService';
import { MotionConfig } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBoot, setShowBoot] = useState(true);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    // Robust offline-first recovery: check if offline session is active
    const isOfflineMode = localStorage.getItem('auto_ads_offline_mode') === 'true';
    console.log("[FORENSIC] App useEffect - isOfflineMode:", isOfflineMode);
    if (isOfflineMode) {
      console.log("[FORENSIC] [Bypass] Recovering active offline-mode session on boot/refresh");
      const offlineRole = localStorage.getItem('auto_ads_offline_role') as UserRole || 'CUSTOMER';
      const isTerminalStored = localStorage.getItem('auto_ads_is_terminal') === 'true';
      
      setUser({ uid: 'offline_mock_device_uuid', email: 'offline-device@autoads.in' });
      setRole(offlineRole === 'DEVICE' || (offlineRole === 'DRIVER' && isTerminalStored) ? 'DEVICE' : offlineRole);
      setLoading(false);
      return () => {};
    }

    // Dynamic Firebase Auth bypass strategy for raw Chrome/WebView 66 compatibility validation
    const bypassFirebase = (typeof window !== 'undefined') && (
      window.location.search.indexOf('bypass_firebase=true') !== -1 ||
      localStorage.getItem('auto_ads_bypass_firebase') === 'true'
    );

    if (bypassFirebase) {
      console.log("[FORENSIC] [Bypass] Bypassing Firebase Auth entirely for old WebView/MXQ");
      // Load a direct, responsive mock simulation
      setUser({ uid: 'legacy_mock_device_uuid', email: 'legacy-device@autoads.in' });
      setRole('DEVICE'); // Directly boot to DevicePortal (IoT active-status player)
      setLoading(false);
      return () => {};
    }

    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    const safeRideMatch = path.match(/^\/(?:safe-ride|ride)\/([^/]+)/);

    if (safeRideMatch) {
       console.log("[FORENSIC] [App] Public path detected. Skipping Auth listener.");
       setUser({ uid: 'public_view_user' });
       setLoading(false);
       return () => {};
    }

    console.log("[TRACE 5] Before onAuthStateChanged");
    
    // Check path for safe ride routes early to skip auth if not needed
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const isRidePath = /^\/(?:safe-ride|ride|family-ride)\//.test(currentPath);
    console.log("[FORENSIC] [App] Initial path for Auth check:", currentPath, "isRidePath:", isRidePath);
    
    if (isRidePath) {
       console.log("[FORENSIC] [App] Public path detected during Auth setup. Skipping Auth listener.");
       setUser({ uid: 'public_view_user' });
       setLoading(false);
       return () => {};
    }

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("[TRACE 5.1] onAuthStateChanged callback triggered. User authenticated?", !!firebaseUser);
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          // Resolve role strictly from Firestore
          let resolvedRole: UserRole | null = null;
          try {
            const profile = await firebaseService.getUserProfile(firebaseUser.uid);
            const email = firebaseUser.email?.toLowerCase() || '';
            
            if (profile && profile.role) {
                resolvedRole = profile.role as UserRole;
                console.log("[AUTH] Firestore role found:", resolvedRole);
            } else {
                // Known administrative overrides
                if (email === 'admin@autoads.in' || email === 'darshanct43@gmail.com' || email === 'dashanct43@gmail.com') {
                    resolvedRole = 'ADMIN';
                } else if (email === 'vijayathrishu@gmail.com') {
                    resolvedRole = 'SUPPORT_MANAGER';
                } else {
                    console.warn("[AUTH] No role found for user:", firebaseUser.uid);
                    resolvedRole = 'NO_ROLE';
                }
            }

            // Terminal override
            if (localStorage.getItem('auto_ads_is_terminal') === 'true') {
              resolvedRole = 'DEVICE';
            }

            // Audit logging
            console.log("LOGIN_UID=", firebaseUser.uid);
            console.log("PHONE=", firebaseUser.phoneNumber);
            console.log("ROLE=", resolvedRole);
            console.log("ROUTE_SELECTED=", resolvedRole);

            setRole(resolvedRole);
          } catch (e) {
            console.error("[AUTH] Profile fetch failed:", e);
            setRole('NO_ROLE');
          }
        } catch (err: any) {
          console.error("Auth role resolution failed:", err);
          setRole('NO_ROLE');
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });
    console.log("[TRACE 6] After onAuthStateChanged registration");
    return unsub;
  }, []);

  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  console.log("[FORENSIC] [App] Current Pathname:", path);

  // Consolidated path detection
  // Try both path and fallback
  const safeRideMatch = path.match(/^\/(?:safe-ride|ride|family-ride)\/([^/?#]+)/) || 
                        window.location.hash.match(/(?:safe-ride|ride|family-ride)\/([^/?#]+)/) ||
                        window.location.search.match(/[?&]terminalId=([^&]+)/);
  const terminalId = safeRideMatch ? decodeURIComponent(safeRideMatch[1]) : null;
  console.log("[FORENSIC] [App] Detected terminalId:", terminalId, "from path:", path);

  if (loading) return <div className="text-white bg-[#0b0f19] min-h-screen flex items-center justify-center font-mono text-xs">Verifying Security Session...</div>;

  const handleLogout = async () => {
    console.log("[FORENSIC] App handleLogout started");
    localStorage.removeItem('auto_ads_is_terminal');
    localStorage.removeItem('auto_ads_terminal_id');
    localStorage.removeItem('auto_ads_access_key');
    localStorage.removeItem('auto_ads_offline_mode');
    localStorage.removeItem('auto_ads_offline_role');
    localStorage.removeItem('auto_ads_last_role');
    localStorage.removeItem('auto_ads_tv_mode');
    localStorage.removeItem('auto_ads_device_mode');
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("[FORENSIC] App signOut failed/timed out, forcing client cleanup:", e);
    }
    console.log("[FORENSIC] App handleLogout finished, setting state");
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/');
    }
    setRole(null);
    setUser(null);
  };

  const content = (() => {
    console.log("[FORENSIC RUNTIME MATRIX LOG]");
    console.log("ROLE =", role);
    console.log("PATH =", path);
    console.log("loading =", loading);
    console.log("isTerminalStored =", localStorage.getItem('auto_ads_is_terminal'));

    if (path === '/loader') {
      console.log("ACTUAL_COMPONENT_RENDERED = LoaderPage");
      return <LoaderPage />;
    }

    if (terminalId) {
       console.log("[FORENSIC] Returning SafeRideView");
       console.log("ACTUAL_COMPONENT_RENDERED = SafeRideView");
       return <SafeRideView terminalId={terminalId} />;
    }

    // Require Auth for all other routes
    if (!user || !role) {
       if (showBoot) {
          console.log("ACTUAL_COMPONENT_RENDERED = BootAnimation");
          return <BootAnimation onComplete={() => setShowBoot(false)} />;
       }
       console.log("[FORENSIC] No user/role, checking showIntro:", showIntro);
       if (showIntro) {
          console.log("ACTUAL_COMPONENT_RENDERED = BrandIntroduction");
          return (
            <BrandIntroduction 
              onComplete={() => {
                localStorage.setItem('auto_ads_intro_completed', 'true');
                setShowIntro(false);
              }} 
            />
          );
       }
       console.log("[FORENSIC] No user/role, returning Auth");
       console.log("ACTUAL_COMPONENT_RENDERED = Auth");
       return <Auth onLogin={(r) => setRole(r)} />;
    }

    // Role-based routing for other authenticated users
    console.log("[FORENSIC] App routing. TOGGLE =", localStorage.getItem("auto_ads_is_terminal"), "ROLE =", role, "PATH =", path);
    
    // Strict Route Guards
    if (path === '/customer' && role === 'DRIVER') { window.location.replace('/driver'); return null; }
    if (path === '/driver' && role === 'CUSTOMER') { window.location.replace('/customer'); return null; }

    if (path === '/support' && (role === 'SUPPORT_TEAM' || role === 'SUPPORT' || role === 'SUPPORT_AGENT' || role === 'SUPPORT_MANAGER' || role === 'HQ_SUPPORT' || role === 'STAFF')) {
      console.log("ACTUAL_COMPONENT_RENDERED = SupportPortal");
      return <SupportPortal onLogout={handleLogout} />;
    }
    if (path === '/admin' && (role === 'ADMIN' || role === 'HQ_ADMIN')) {
      console.log("ACTUAL_COMPONENT_RENDERED = AdminPortal");
      return <AdminPortal onLogout={handleLogout} />;
    }
    if (path === '/driver' && role === 'DRIVER') {
      console.log("ACTUAL_COMPONENT_RENDERED = DriverPortal");
      return <DriverPortal onLogout={handleLogout} />;
    }
    if (path === '/customer' && role === 'CUSTOMER') {
      console.log("ACTUAL_COMPONENT_RENDERED = CustomerPortal");
      return <CustomerPortal onLogout={handleLogout} />;
    }
    if (path === '/franchise' && (role === 'FRANCHISE_OWNER' || role === 'FRANCHISE_STAFF')) {
      console.log("ACTUAL_COMPONENT_RENDERED = FranchisePortal");
      return <FranchisePortal onLogout={handleLogout} />;
    }

    switch(role) {
      case 'ADMIN':
      case 'HQ_ADMIN':
        window.history.replaceState({}, '', '/admin'); 
        console.log("ACTUAL_COMPONENT_RENDERED = AdminPortal");
        return <AdminPortal onLogout={handleLogout} />;
      case 'SUPPORT':
      case 'SUPPORT_AGENT':
      case 'SUPPORT_MANAGER':
      case 'STAFF':
      case 'SUPPORT_TEAM':
      case 'HQ_SUPPORT':
        window.history.replaceState({}, '', '/support'); 
        console.log("ACTUAL_COMPONENT_RENDERED = SupportPortal");
        return <SupportPortal onLogout={handleLogout} />;
      case 'FRANCHISE_OWNER':
      case 'FRANCHISE_STAFF': 
        window.history.replaceState({}, '', '/franchise'); 
        console.log("ACTUAL_COMPONENT_RENDERED = FranchisePortal");
        return <FranchisePortal onLogout={handleLogout} />;
      case 'DRIVER': 
        if (typeof window !== 'undefined' && localStorage.getItem('auto_ads_is_terminal') === 'true') {
          window.history.replaceState({}, '', '/terminal');
          console.log("ACTUAL_COMPONENT_RENDERED = DevicePortal (via Driver)");
          return <DevicePortal onLogout={handleLogout} />;
        }
        window.history.replaceState({}, '', '/driver'); 
        console.log("ACTUAL_COMPONENT_RENDERED = DriverPortal");
        return <DriverPortal onLogout={handleLogout} />;
      case 'DEVICE':
        window.history.replaceState({}, '', '/terminal');
        console.log("ACTUAL_COMPONENT_RENDERED = DevicePortal");
        return <DevicePortal onLogout={handleLogout} />;
      case 'CUSTOMER': 
        window.history.replaceState({}, '', '/customer'); 
        console.log("ACTUAL_COMPONENT_RENDERED = CustomerPortal");
        return <CustomerPortal onLogout={handleLogout} />;
      case 'NO_ROLE':
      default: 
        console.log("ACTUAL_COMPONENT_RENDERED = AccessRestrictedScreen");
        return (
          <div className="text-white bg-[#0b0f19] min-h-screen flex flex-col items-center justify-center gap-6 p-4 text-center">
            <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl max-w-sm w-full">
              <h2 className="text-lg font-black uppercase tracking-widest text-red-500 mb-2">ACCESS RESTRICTED</h2>
              <p className="text-slate-400 text-xs font-bold leading-relaxed mb-8 uppercase tracking-widest">
                Account role not configured. Contact administrator.
              </p>
              
              <button 
                onClick={handleLogout}
                className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-slate-200 transition-all cursor-pointer"
              >
                Sign Out
              </button>
            </div>
            
            <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.4em]">Autoads Enterprise Distribution</p>
          </div>
        );
    }
  })();

  return (
    content
  );
}
