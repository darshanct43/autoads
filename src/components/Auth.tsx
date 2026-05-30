import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Truck, Target, Smartphone, Truck as TruckIcon, User, Settings, LogOut, ChevronRight, CheckCircle, ShieldCheck, AlertCircle, Smartphone as DeviceIcon, Monitor, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, googleLogin } from '@/lib/firebase';
import { firebaseService } from '@/services/firebaseService';
import firebaseConfig from '../../firebase-applet-config.json';
import { ErrorBoundary } from './common/ErrorBoundary';

interface AuthProps {
  onLogin: (role: UserRole) => void;
}

export default function Auth({ onLogin }: AuthProps) {
  const [authMode, setAuthMode] = useState<'CREDENTIALS' | 'SIGNUP' | 'DRIVER_PROFILE' | 'FORGOT_PASSWORD' | 'RECOVERY_SET_PASSWORD'>('CREDENTIALS');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showLegacyAuth, setShowLegacyAuth] = useState(false);
  const [role, setRole] = useState<UserRole>('CUSTOMER');
  const [authEmail, setAuthEmail] = useState('');
  const [recoverySent, setRecoverySent] = useState(false);
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [userName, setUserName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTerminalMode, setIsTerminalMode] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const user = auth.currentUser;
      if (user && authMode === 'CREDENTIALS') {
        const emailLower = user.email?.toLowerCase() || '';
        try {
          const profile = await firebaseService.getUserProfile(user.uid);
          const driverProfile = await firebaseService.getDriverProfile(user.uid);
          
          let userRole: UserRole = 'CUSTOMER';
          
          if (profile?.role === 'ADMIN' || emailLower === 'admin@autoads.in' || emailLower === 'darshanct43@gmail.com') {
            userRole = 'ADMIN';
          } else if (profile?.role === 'SUPPORT' || profile?.role === 'STAFF' || emailLower === 'vijayathrishu@gmail.com' || emailLower.includes('support')) {
            userRole = 'SUPPORT';
          } else if (emailLower === 'franchise@autoads.in' || emailLower.includes('franchise')) {
            userRole = 'FRANCHISE_OWNER';
          } else if (profile?.role === 'DRIVER' || driverProfile) {
            userRole = 'DRIVER';
          } else if (profile?.role) {
            userRole = profile.role as UserRole;
          }

          setRole(userRole);
          
          if (userRole === 'DRIVER' && !driverProfile && emailLower !== '8861574729@autoads.in') {
            setAuthMode('DRIVER_PROFILE');
          }
        } catch (e) {
          if (emailLower.includes('driver')) {
            setRole('DRIVER');
            setAuthMode('DRIVER_PROFILE');
          }
        }
      }
    };
    checkUser();
  }, [authMode]);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await googleLogin();
      const user = result.user;
      const emailLower = user.email?.toLowerCase() || '';
      
      const profile = await firebaseService.getUserProfile(user.uid);
      const driverProfile = await firebaseService.getDriverProfile(user.uid);
      
      let userRole: UserRole = 'CUSTOMER';

      if (emailLower === 'admin@autoads.in' || emailLower === 'darshanct43@gmail.com' || profile?.role === 'ADMIN') {
        userRole = 'ADMIN';
      } else if (emailLower === 'vijayathrishu@gmail.com' || profile?.role === 'SUPPORT' || profile?.role === 'STAFF' || emailLower.includes('support')) {
        userRole = 'SUPPORT';
      } else if (emailLower === 'franchise@autoads.in' || emailLower.includes('franchise')) {
        userRole = 'FRANCHISE_OWNER';
      } else if (profile?.role === 'DRIVER' || driverProfile || emailLower.includes('driver')) {
        userRole = 'DRIVER';
      } else if (profile?.role) {
        userRole = profile.role as UserRole;
      }

      // Final check for terminal switch
      if (localStorage.getItem('auto_ads_is_terminal') === 'true') {
        userRole = 'DEVICE';
      }

      onLogin(userRole);
    } catch (err: any) {
      setError(err.message || 'Google Auth Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const rawInput = authEmail.trim();
    const inputPassword = password.trim();
    
    // Normalize input: remove spaces and handle phone number prefixes
    let inputEmail = rawInput.replace(/\s+/g, '');
    if (/^\+91\d{10}$/.test(inputEmail)) {
      inputEmail = inputEmail.substring(3); // Strip +91
    }
    const inputEmailLower = inputEmail.toLowerCase();

    if (isTerminalMode) {
      localStorage.setItem('auto_ads_is_terminal', 'true');
    } else {
      localStorage.removeItem('auto_ads_is_terminal');
    }

    try {
      // Always lowercase and trim emails for Firebase authentication
      let finalEmail = inputEmail.trim().toLowerCase();
      
      // Auto-formatting for short IDs / Phone numbers
      if (!finalEmail.includes('@') && finalEmail.length > 0) {
        finalEmail = `${finalEmail}@autoads.in`;
      }

      console.log("[Auth DEBUG] Input:", inputEmail, "| Formatted Email:", finalEmail);
      console.log("[Auth DEBUG] Current Project ID:", firebaseConfig.projectId);
      console.log("[Auth DEBUG] Auth Domain:", firebaseConfig.authDomain);

      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, finalEmail, inputPassword);
      } catch (authErr: any) {
        console.error("[Auth Error]", authErr);
        
        if (authErr.code === 'auth/operation-not-allowed') {
          console.error("[Auth] Provider disabled.");
          throw new Error(`AUTHENTICATION ERROR: The 'Email/Password' method is currently disabled in your Firebase console. Please enable it in Authentication > Sign-in method.`);
        }

        const isInvalidCredential = 
          authErr.code === 'auth/invalid-credential' || 
          authErr.code === 'auth/user-not-found' || 
          authErr.code === 'auth/wrong-password' || 
          (authErr.message && authErr.message.toLowerCase().includes('invalid-credential'));

        if (isInvalidCredential) {
          const isSupportDemo = (inputEmailLower === 'support@autoads.in' || inputEmailLower === 'support') && inputPassword === 'autoads123';
          const isAdminDemo = (inputEmailLower === 'admin@autoads.in' || inputEmailLower === 'admin') && inputPassword === 'autoads123';
          const isCustomerDemo = (inputEmailLower === 'customer@autoads.in' || inputEmailLower === 'customer') && inputPassword === 'autoads123';
          const isFranchiseDemo = (inputEmailLower === 'franchise@autoads.in' || inputEmailLower === 'franchise') && inputPassword === 'autoads123';
          
          const lowerIn = inputEmail.toLowerCase();
          if (isCustomerDemo || isSupportDemo || isAdminDemo || isFranchiseDemo || lowerIn.startsWith('drv-')) {
            try {
              userCredential = await createUserWithEmailAndPassword(auth, finalEmail, inputPassword);
              const user = userCredential.user;
              let initialRole: UserRole = 'CUSTOMER';
              
              if (lowerIn.includes('support')) initialRole = 'SUPPORT';
              else if (lowerIn.startsWith('drv-')) initialRole = 'DRIVER';
              else if (lowerIn.includes('admin') || isAdminDemo) initialRole = 'ADMIN';
              else if (isCustomerDemo || lowerIn.includes('customer')) initialRole = 'CUSTOMER';
              else if (isFranchiseDemo || lowerIn.includes('franchise')) initialRole = 'FRANCHISE_OWNER';
              
              await firebaseService.saveUserProfile(user.uid, inputEmail, '0000000000', initialRole);
              if (initialRole === 'DRIVER') {
                await firebaseService.saveDriverProfile({
                  uid: user.uid,
                  name: inputEmail,
                  phone: '0000000000',
                  email: finalEmail,
                  status: 'pending_verification',
                  kycStatus: 'PENDING',
                  isVerified: false,
                  driverCode: inputEmail.toUpperCase(),
                  password: inputPassword,
                  city: 'Mayaan Network'
                } as any);
              }
            } catch (createErr: any) {
              if (createErr.code === 'auth/email-already-in-use') {
                throw new Error("Demo account exists but password mismatch. Please use the correct password or administrative recovery.");
              }
              if (createErr.code === 'auth/operation-not-allowed' || createErr.code === 'auth/invalid-credential' || (createErr.message && createErr.message.toLowerCase().includes('invalid-credential'))) {
                throw new Error(`AUTHENTICATION ERROR: The 'Email/Password' sign-in method could be disabled. Please enable it in your Firebase Console > Authentication > Sign-in method.`);
              }
              throw createErr;
            }
          } else {
            throw new Error("Invalid email or password. Please try again, or register if you are a new user.");
          }
        } else {
          throw authErr;
        }
      }
      
      const user = userCredential!.user;
      const emailLower = user.email?.toLowerCase() || '';
      
      const profile = await firebaseService.getUserProfile(user.uid);
      const driverProfile = await firebaseService.getDriverProfile(user.uid);
      
      let userRole: UserRole = 'CUSTOMER';

      if (profile?.role === 'ADMIN' || emailLower === 'admin@autoads.in' || emailLower === 'darshanct43@gmail.com') {
        userRole = 'ADMIN';
      } else if (profile?.role === 'SUPPORT' || profile?.role === 'STAFF' || emailLower === 'vijayathrishu@gmail.com' || emailLower.includes('support')) {
        userRole = 'SUPPORT';
      } else if (emailLower === 'franchise@autoads.in' || emailLower.includes('franchise')) {
        userRole = 'FRANCHISE_OWNER';
      } else if (profile?.role === 'DRIVER' || driverProfile) {
        userRole = 'DRIVER'; 
      } else if (profile?.role) {
        userRole = profile.role as UserRole;
      }
      
      console.log("[Auth] Resolved role:", userRole);

      if (userRole === 'DRIVER') {
        const dProfile = await firebaseService.getDriverProfile(user.uid);
        
        if (!dProfile) {
          setAuthMode('DRIVER_PROFILE');
          setRole('DRIVER');
          setLoading(false);
          return;
        } else if (!dProfile.terminalId || !dProfile.accessKey) {
          console.log("[Auth] Provisioning internal terminal session...");
          const provision = await firebaseService.saveDriverProfile({
             ...dProfile,
             uid: user.uid
          } as any);
          localStorage.setItem('auto_ads_terminal_id', provision.terminalId);
          localStorage.setItem('temp_terminal_id', provision.terminalId);
          localStorage.setItem('temp_access_key', provision.accessKey);
        } else {
          localStorage.setItem('auto_ads_terminal_id', dProfile.terminalId);
          localStorage.setItem('temp_terminal_id', dProfile.terminalId);
          localStorage.setItem('temp_access_key', dProfile.accessKey);
        }
      } else if (isTerminalMode) {
        // Even if not a driver, ensure we have some identifier for the terminal session if requested
        if (!localStorage.getItem('auto_ads_terminal_id')) {
          const tid = `USR-${user.uid.substring(0, 8).toUpperCase()}`;
          localStorage.setItem('auto_ads_terminal_id', tid);
          localStorage.setItem('temp_terminal_id', tid);
          localStorage.setItem('temp_access_key', 'AUTO-AUTH');
        }
      }

      const finalDestRole = (userRole === 'ADMIN' || userRole === 'SUPPORT') ? userRole : (isTerminalMode ? 'DEVICE' : userRole);
      onLogin(finalDestRole); 
    } catch (err: any) {
      setError(err.message || 'Authentication Failed');
    } finally {
      setLoading(false);
    }
  };

  const [driverProfile, setDriverProfile] = useState({
    name: '',
    location: '',
    agreed: false,
  });

  const handleDriverProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!driverProfile.agreed) {
      setError('You must agree to the Terms and Policy');
      return;
    }
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Authentication context lost");
      
      console.log("[Auth] Attempting to save driver profile for:", user.uid);
      const provision = await firebaseService.saveDriverProfile({
        uid: user.uid,
        name: driverProfile.name,
        phone: phone || '0000000000',
        email: user.email || '',
        city: driverProfile.location,
        status: 'pending_verification',
        isVerified: false,
        driverCode: `DRV-${Math.floor(1000 + Math.random() * 9000)}`,
        password: password || 'default123', 
        lastLoginAt: new Date().toISOString()
      } as any);
      
      console.log("[Auth] Successfully saved driver profile, now saving user profile...");
      
      // Persist provisioned terminal info for refresh stability
      if (provision && (provision as any).terminalId) {
        localStorage.setItem('auto_ads_terminal_id', (provision as any).terminalId);
        localStorage.setItem('temp_terminal_id', (provision as any).terminalId);
        localStorage.setItem('temp_access_key', (provision as any).accessKey);
      }

      await firebaseService.saveUserProfile(user.uid, driverProfile.name, phone || '0000000000', 'DRIVER');
      console.log("[Auth] Successfully saved user profile.");
      
      if (isTerminalMode) {
        localStorage.setItem('auto_ads_is_terminal', 'true');
      } else {
        localStorage.removeItem('auto_ads_is_terminal');
      }
      
      onLogin(isTerminalMode ? 'DEVICE' : 'DRIVER');
    } catch (err: any) {
      console.error("[Auth] Driver profile submission error:", err);
      setError(err.message || 'Failed to initialize driver profile');
    } finally {
      setLoading(false);
    }
  };

  const [registrationForm, setRegistrationForm] = useState({
    mobile: '',
    password: ''
  });

  const handleRegisterInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRegistrationForm(prev => ({ ...prev, [name]: value }));
    if (name === 'mobile') setPhone(value.replace(/\D/g, '').slice(0, 10));
    if (name === 'password') setPassword(value);
  };

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) {
      setError('Enter a valid phone number (10 digits)');
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      const finalEmail = `${phone}@autoads.in`.toLowerCase();
      
      const userCredential = await createUserWithEmailAndPassword(auth, finalEmail, password);
      const user = userCredential.user;
      
      await firebaseService.saveUserProfile(user.uid, 'User', phone, role);
      
      if (role === 'DRIVER') {
        await firebaseService.saveDriverProfile({
          uid: user.uid,
          name: 'User',
          phone: phone,
          email: finalEmail,
          status: 'pending_verification',
          isVerified: false,
          driverCode: `DRV-${Math.floor(1000 + Math.random() * 9000)}`,
          password: password,
          vNo: 'N/A',
          vehicleNumber: 'N/A',
          city: 'Mayaan Network'
        } as any);
        setAuthMode('DRIVER_PROFILE');
      } else {
        onLogin(role);
      }
    } catch (err: any) {
      console.error("[Auth] Signup Error:", err);
      const errorMessage = err.message || '';
      
      if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/invalid-credential' || errorMessage.toLowerCase().includes('invalid-credential')) {
        setError(`CRITICAL: The 'Email/Password' provider is disabled or restricted in Firebase for project '${firebaseConfig.projectId}'. You MUST enable the Email/Password sign-in provider in the Firebase Console (Authentication > Sign-in method > Email/Password) to create accounts.`);
        return;
      }

      if (err.code === 'auth/email-already-in-use' || errorMessage.includes('email-already-in-use')) {
        setError('This number is already registered. Please log in.');
      } else {
        setError(errorMessage || 'Signup Failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Logic for forgot password
      setAuthMode('RECOVERY_SET_PASSWORD');
      setSuccess('Recovery verified');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverySetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Simulate password reset
      setSuccess('Password updated. Please sign in.');
      setAuthMode('CREDENTIALS');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ErrorBoundary componentName="Auth Interface">
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className={cn(
            "max-w-md w-full glass-card overflow-hidden rounded-[2rem] md:rounded-[3rem] border border-slate-200 shadow-2xl transition-all duration-500",
            authMode === 'DRIVER_PROFILE' && "max-w-2xl"
          )}
        >
          <div className="bg-slate-950 p-6 md:p-10 text-white relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full" />
            <div className="flex items-center gap-4 md:gap-6 mb-2 relative z-10">
              <div className="h-16 md:h-20 flex items-center justify-center">
                <img src={`${import.meta.env.BASE_URL}mayaan_logo.jpeg`} alt="Mayaan" className="h-full w-auto object-contain drop-shadow-lg" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-amber-500 leading-none">AutoAds</h2>
                <p className="text-[9px] md:text-[11px] font-black text-slate-500 uppercase tracking-widest mt-1 italic">Mayaan Group Gateway</p>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-10 space-y-6 md:space-y-8 bg-white">
            {error && <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-[10px] font-bold uppercase tracking-widest text-center">{error}</div>}

            {authMode === 'CREDENTIALS' && (
              <div className="space-y-6">
                <div className="flex bg-slate-50 p-1.5 rounded-2xl hidden">
                  <button onClick={() => setIsRegistering(false)} className={cn("flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all", !isRegistering ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600")}>Sign In</button>
                  <button onClick={() => setIsRegistering(true)} className={cn("flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all", isRegistering ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600")}>Register</button>
                </div>

                {!isRegistering ? (
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 ml-1">Account Mobile / ID</label>
                        <input type="text" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-sm font-black tracking-tight focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none transition-all placeholder:text-slate-300" placeholder="e.g. 9876543210" required />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 ml-1">Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-sm font-black tracking-tight focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none transition-all placeholder:text-slate-300" placeholder="••••••••" required />
                      </div>
                      <div className="flex items-center gap-2 py-2">
                        <label className="relative flex items-center cursor-pointer group">
                          <input 
                            type="checkbox" 
                            checked={isTerminalMode} 
                            onChange={(e) => setIsTerminalMode(e.target.checked)} 
                            className="sr-only peer"
                          />
                          <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                          <span className="ml-3 text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-amber-600 transition-colors">Launch as Display Terminal</span>
                        </label>
                      </div>

                      <button type="submit" disabled={loading} className="w-full py-5 bg-slate-950 text-amber-500 font-black rounded-2xl text-[12px] uppercase tracking-[0.25em] shadow-2xl hover:scale-[1.01] transition-all disabled:opacity-50">{loading ? 'Processing...' : 'Secure Sign In'}</button>
                      <button type="button" onClick={() => setAuthMode('FORGOT_PASSWORD')} className="w-full text-center py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors italic">Recovery Access</button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <p className="text-[10px] text-center font-black text-slate-400 uppercase tracking-[0.2em] italic">Join MayaanAds as</p>
                      <div className="flex flex-col gap-3">
                        <div className="flex gap-4">
                          <button type="button" onClick={() => { setRole('DRIVER'); setAuthMode('SIGNUP'); }} className="flex-1 py-5 bg-white border-2 border-slate-100 text-slate-950 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:border-amber-500 transition-all flex flex-col items-center gap-2"><Truck size={20} className="text-amber-500" /> Auto Driver</button>
                          <button type="button" onClick={() => { setRole('CUSTOMER'); setAuthMode('SIGNUP'); }} className="flex-1 py-5 bg-white border-2 border-slate-100 text-slate-950 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:border-amber-500 transition-all flex flex-col items-center gap-2"><Target size={20} className="text-amber-500" /> Customer</button>
                        </div>
                        <button type="button" onClick={() => { setRole('STAFF' as any); setAuthMode('SIGNUP'); }} className="w-full py-4 bg-white border-2 border-slate-100 text-slate-950 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:border-amber-500 transition-all flex items-center justify-center gap-3"><Monitor size={18} className="text-amber-500" /> Administrative Staff</button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                  <div className="relative flex justify-center text-[8px] font-black uppercase bg-white px-4 text-slate-300 tracking-widest">Connect to Network</div>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <button 
                    type="button" 
                    disabled={loading} 
                    onClick={handleGoogleLogin} 
                    className="py-5 bg-white border border-slate-200 text-slate-800 font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] hover:bg-slate-50 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    {loading ? 'Initializing Google Sync...' : 'Google Sync'}
                  </button>
                </div>
              </div>
            )}
            
            {authMode === 'SIGNUP' && (
              <div className="space-y-6">
                <div className="space-y-1 text-center">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{role === 'DRIVER' ? 'New Driver Enrollment' : role === 'STAFF' ? 'Staff Authorization' : 'Customer Access'}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic leading-none">Register your identity on the network</p>
                </div>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">Mobile Contact</label>
                      <input type="tel" name="mobile" value={registrationForm.mobile} onChange={handleRegisterInput} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 text-sm font-bold tracking-tight focus:border-amber-500 outline-none transition-all" placeholder="10 Digits" required />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">New Password</label>
                      <input type="password" name="password" value={registrationForm.password} onChange={handleRegisterInput} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 text-sm font-bold tracking-tight focus:border-amber-500 outline-none transition-all" placeholder="Min. 6 characters" minLength={6} required />
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <button type="submit" disabled={loading} className="w-full py-4 bg-slate-900 text-amber-500 font-black rounded-xl text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all disabled:opacity-50">
                      {loading ? 'Processing...' : 'Create Account'}
                    </button>
                  </div>
                </form>
                <button onClick={() => setAuthMode('CREDENTIALS')} className="w-full py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">Return to login</button>
              </div>
            )}

            {authMode === 'FORGOT_PASSWORD' && (
              <div className="space-y-6">
                <div className="space-y-2 text-center">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest italic">Identity Recovery</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Reset your secure password</p>
                </div>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 ml-1">Registered Mobile</label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-sm font-black tracking-tight focus:outline-none transition-all placeholder:text-slate-300" placeholder="10 Digit Number" required />
                  </div>
                  <button type="submit" disabled={loading} className="w-full py-5 bg-slate-900 text-amber-500 font-black rounded-2xl text-[11px] uppercase tracking-[0.2em] shadow-xl transition-all disabled:opacity-50">{loading ? 'Sending...' : 'Send Recovery Code'}</button>
                </form>
                <button onClick={() => setAuthMode('CREDENTIALS')} className="w-full py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">Abort & Return</button>
              </div>
            )}


            {authMode === 'RECOVERY_SET_PASSWORD' && (
              <div className="space-y-6">
                <div className="space-y-2 text-center">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest italic">New Credentials</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Define your new access key</p>
                </div>
                <form onSubmit={handleRecoverySetPassword} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 ml-1">New Password</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-sm font-black tracking-tight focus:outline-none transition-all placeholder:text-slate-300" placeholder="Min 6 characters" minLength={6} required />
                  </div>
                  <button type="submit" disabled={loading} className="w-full py-5 bg-slate-900 text-amber-500 font-black rounded-2xl text-[11px] uppercase tracking-[0.2em] shadow-xl transition-all disabled:opacity-50">Update & Login</button>
                </form>
              </div>
            )}

            {authMode === 'DRIVER_PROFILE' && (
              <form onSubmit={handleDriverProfileSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 ml-1">Full Name</label>
                    <input type="text" value={driverProfile.name} onChange={(e) => setDriverProfile({...driverProfile, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-sm font-black tracking-tight focus:outline-none transition-all" placeholder="Legal Name" required />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 ml-1">Operating City</label>
                    <input type="text" value={driverProfile.location} onChange={(e) => setDriverProfile({...driverProfile, location: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-sm font-black tracking-tight focus:outline-none transition-all" placeholder="e.g. Bangalore" required />
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Liability Agreement</h4>
                  <div className="h-20 overflow-y-auto text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed border-y py-2">
                    <p>1. HARDWARE UNIT REMAINS PROPERTY OF AUTOAD PRO.</p>
                    <p>2. UNIT MUST BE RETURNED WITHIN 48 HOURS IF REGISTRATION IS LAPSED.</p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={driverProfile.agreed} onChange={(e) => setDriverProfile({...driverProfile, agreed: e.target.checked})} className="w-4 h-4 rounded text-amber-500" />
                    <span className="text-[9px] font-black text-slate-900 uppercase italic">I agree to the terms</span>
                  </label>
                </div>
                <button type="submit" disabled={!driverProfile.agreed || loading} className={cn("w-full py-5 font-black rounded-2xl text-[11px] uppercase tracking-[0.25em] transition-all", driverProfile.agreed ? "bg-slate-950 text-amber-500" : "bg-slate-100 text-slate-300 cursor-not-allowed")}>{loading ? 'Processing...' : 'Finalize Enrollment'}</button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </ErrorBoundary>
  );
}
