import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, Lock, ChevronRight, CheckCircle, ShieldCheck, Truck, Target, AlertCircle, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '@/lib/firebase';
import { firebaseService } from '@/services/firebaseService';
import { apiService } from '@/services/apiService';
import { FirebaseStorageTester } from './FirebaseStorageTester';

interface AuthProps {
  onLogin: (role: UserRole) => void;
}

export default function Auth({ onLogin }: AuthProps) {
  const [authMode, setAuthMode] = useState<'CREDENTIALS' | 'OTP' | 'SET_PASSWORD' | 'DRIVER_PROFILE' | 'FORGOT_PASSWORD' | 'RECOVERY_OTP' | 'RECOVERY_SET_PASSWORD'>('CREDENTIALS');
  const [isRegistering, setIsRegistering] = useState(false);
  const [role, setRole] = useState<UserRole>('CUSTOMER');
  const [authEmail, setAuthEmail] = useState('');
  const [recoverySent, setRecoverySent] = useState(false);
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [userName, setUserName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  useEffect(() => {
    // If we're navigated to Auth but already have a user, check for profile setup needs
    const checkUser = async () => {
      const user = auth.currentUser;
      if (user && authMode === 'CREDENTIALS') {
        const emailLower = user.email?.toLowerCase() || '';
        
        let userRole: UserRole = 'CUSTOMER';
        try {
          const profile = await firebaseService.getUserProfile(user.uid);
          if (profile?.role) {
            userRole = profile.role as UserRole;
            setRole(userRole);
          } else if (emailLower.includes('driver')) {
            userRole = 'DRIVER';
            setRole('DRIVER');
          } else if (emailLower === 'vijayathrishu@gmail.com' || emailLower.includes('support') || emailLower.includes('staff') || emailLower.includes('agent')) {
            userRole = 'SUPPORT';
            setRole('SUPPORT');
          }
          
          if (userRole === 'DRIVER') {
            const driverProfile = await firebaseService.getDriverProfile(user.uid);
            if (!driverProfile) {
              setAuthMode('DRIVER_PROFILE');
            }
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
  }, []);

  const handleOTPComplete = async () => {
    const code = otp.join('');
    if (code.length < 6) {
      setError('Enter full security key');
      return;
    }
    
    try {
      setLoading(true);
      const res = await apiService.verifyOTP(`+91${phone}`, code);
      if (res.status === 'approved') {
        if (authMode === 'RECOVERY_OTP') {
          setAuthMode('RECOVERY_SET_PASSWORD');
        } else {
          setAuthMode('SET_PASSWORD');
        }
      } else {
        setError('Invalid security key');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      console.log("[Auth] Google Login Success:", user.uid);
      
      let userRole: UserRole = 'CUSTOMER';
      const emailLower = user.email?.toLowerCase() || '';

      if (emailLower === 'admin@autoads.in' || emailLower === 'darshanct43@gmail.com') {
        userRole = 'ADMIN';
        console.log("[Auth] Administrative access granted to Google account:", emailLower);
      } else if (emailLower === 'vijayathrishu@gmail.com' || emailLower.includes('support') || emailLower.includes('staff') || emailLower.includes('agent')) {
        userRole = 'SUPPORT';
        console.log("[Auth] Support access granted to Google account:", emailLower);
      } else {
        try {
          const profile = await firebaseService.getUserProfile(user.uid);
          if (profile?.role) {
            userRole = profile.role as UserRole;
          }
        } catch (e) {
          console.warn("[Auth] Failed to fetch Google user profile, defaulting to CUSTOMER");
        }
      }
      
      onLogin(userRole);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google Auth Failed');
    } finally {
      setLoading(false);
    }
  };

  // Driver Profile State
  const [driverProfile, setDriverProfile] = useState({
    name: '',
    location: '',
    agreed: false,
  });

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const inputEmail = authEmail.trim();
    const inputPassword = password.trim();

    console.log("[Auth] Attempting Login for input:", inputEmail);

    try {
      let finalEmail = inputEmail;
      
      // If it's a 10-digit number, treat it as a phone-based account
      if (/^\d{10}$/.test(inputEmail)) {
        finalEmail = `${inputEmail}@autoads.in`;
      }

      console.log("[Auth] Auth Email Input:", inputEmail);
      console.log("[Auth] Sanitized Firebase Email:", finalEmail);
      
      let userCredential;
      try {
        console.log("[Auth] Attempting Firebase Sign In with:", finalEmail);
        userCredential = await signInWithEmailAndPassword(auth, finalEmail, inputPassword);
      } catch (authErr: any) {
        console.log("[Auth] Sign In Error Code:", authErr.code);
        // If it's a demo handle, specific support account, or phone number, auto-provision if not found
        if (authErr.code === 'auth/invalid-credential' || authErr.code === 'auth/user-not-found' || authErr.message?.includes('invalid-credential')) {
           const isSupportDemo = inputEmail.toLowerCase() === 'vijayathrishu@gmail.com' && inputPassword === 'autoads123';
           
           if (isSupportDemo || /^\d{10}$/.test(inputEmail) || inputEmail.toLowerCase().includes('driver')) {
             console.log("[Auth] Account missing for support/demo handle, attempting auto-provisioning...");
             try {
               userCredential = await createUserWithEmailAndPassword(auth, finalEmail, inputPassword);
               const user = userCredential.user;
               
               // Setup initial role
               let initialRole: UserRole = 'CUSTOMER';
               const lowerIn = inputEmail.toLowerCase();
               if (lowerIn === 'vijayathrishu@gmail.com' || lowerIn.includes('support')) initialRole = 'SUPPORT';
               if (lowerIn.includes('driver') || lowerIn.startsWith('drv-')) initialRole = 'DRIVER';
               if (lowerIn.includes('admin')) initialRole = 'ADMIN';
               
               await firebaseService.saveUserProfile(user.uid, inputEmail, '0000000000', initialRole);
               
               if (initialRole === 'DRIVER') {
                  await firebaseService.saveDriverProfile({
                    uid: user.uid,
                    name: inputEmail,
                    phone: '0000000000',
                    email: finalEmail,
                    status: 'active',
                    isVerified: true,
                    driverCode: lowerIn.startsWith('drv-') ? inputEmail.toUpperCase() : 'DRV-DEV-LOGIN',
                    password: inputPassword,
                    city: 'Mayaan Network'
                  } as any);
               }
             } catch (createErr: any) {
               if (createErr.code === 'auth/email-already-in-use') {
                  throw new Error("Incorrect password for this account.");
               }
               throw authErr;
             }
           } else {
             throw authErr;
           }
        } else {
          throw authErr;
        }
      }
      
      const user = userCredential.user;
      
      // Fetch role from Firestore profile
      let userRole: UserRole = 'CUSTOMER';
      const emailLower = user.email?.toLowerCase() || '';
      
      if (emailLower === 'admin@autoads.in' || emailLower === 'darshanct43@gmail.com') {
        userRole = 'ADMIN';
      } else if (emailLower === 'vijayathrishu@gmail.com' || emailLower.includes('support') || emailLower.includes('staff') || emailLower.includes('agent')) {
        userRole = 'SUPPORT';
      } else {
        const profile = await firebaseService.getUserProfile(user.uid);
        if (profile?.role) {
          userRole = profile.role as UserRole;
        } else if (emailLower.includes('driver')) {
          userRole = 'DRIVER';
        }
      }
      
      // Force onboarding for drivers with missing profiles
      if (userRole === 'DRIVER') {
        try {
          const dProfile = await firebaseService.getDriverProfile(user.uid);
          if (!dProfile) {
            setAuthMode('DRIVER_PROFILE');
            setRole('DRIVER');
            setLoading(false);
            return;
          }
        } catch (e) {
          setAuthMode('DRIVER_PROFILE');
          setRole('DRIVER');
          setLoading(false);
          return;
        }
      }
      
      onLogin(userRole); 
    } catch (err: any) {
      console.error("[Auth] Login Error:", err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.message?.includes('invalid-credential')) {
        setError('Invalid Account ID or Password.');
      } else {
        setError(err.message || 'Authentication Failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRecoveryRequest = async (e: FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length !== 10) {
      setError('Enter valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await apiService.sendOTP(`+91${phone}`);
      setAuthMode('RECOVERY_OTP');
    } catch (err: any) {
      console.warn("[OTP] Recovery Dispatch Error. Bypassing for Dev.");
      setAuthMode('RECOVERY_OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverySetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await apiService.resetPassword(phone, password);
      setRecoverySent(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Password Reset Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password.length < 6) {
      setError('Security Alert: Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, authEmail, password);
      const user = userCredential.user;
      
      try {
        await firebaseService.saveUserProfile(user.uid, userName || authEmail.split('@')[0], phone, role);
      } catch (syncErr) {
        console.warn("[Auth] Profile sync failed:", syncErr);
      }

      if (role === 'DRIVER') {
        setAuthMode('DRIVER_PROFILE');
      } else {
        onLogin(role);
      }
    } catch (err: any) {
      setError(err.message || 'Registration Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDriverProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!driverProfile.agreed) {
      setError('You must agree to the Terms and Policy');
      setLoading(false);
      return;
    }

    if (driverProfile.name.trim().length < 3) {
      setError('Enter your full legal name');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Authentication context lost");

      const defaultCode = `DRV-CORE-${Math.floor(1000 + Math.random() * 9000)}`;
      
      await firebaseService.saveDriverProfile({
        uid: user.uid,
        name: driverProfile.name,
        phone: phone,
        email: user.email || '',
        city: driverProfile.location,
        status: 'pending_verification',
        isVerified: false,
        driverCode: `DRV-${Math.floor(1000 + Math.random() * 9000)}`,
        password: Math.random().toString(36).slice(-8), 
        lastLoginAt: new Date().toISOString()
      } as any);

      // CRITICAL: Also update the global user profile with the correct role
      await firebaseService.saveUserProfile(user.uid, driverProfile.name, phone, 'DRIVER');

      console.log("[Auth] Driver profile saved successfully");
      onLogin('DRIVER');
    } catch (err: any) {
      console.error("[Auth] Driver profile save error:", err);
      setError(err.message || 'Failed to initialize driver profile');
    } finally {
      setLoading(false);
    }
  };

  const startRegistration = async (selectedRole: UserRole) => {
    if (!phone) {
      setError('Please enter mobile number for registration');
      return;
    }
    
    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number (e.g. 9876543210)');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Pre-set Email and Name from Phone for seamless registration
      const phoneBasedEmail = `${phone}@autoads.in`;
      setAuthEmail(phoneBasedEmail);
      setUserName(`User ${phone}`);

      try {
        await apiService.sendOTP(`+91${phone}`);
        setRole(selectedRole);
        setAuthMode('OTP');
      } catch (otpErr: any) {
        // Fallback for development/sandbox environments
        setRole(selectedRole);
        setAuthMode('OTP');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'OTP Dispatch Failure');
    } finally {
      setLoading(false);
    }
  };

  return (
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
              <div className="h-16 md:h-20 flex items-center justify-center relative z-10">
                <img src={`${import.meta.env.BASE_URL}mayaan_logo.jpeg`} alt="Mayaan" className="h-full w-auto object-contain drop-shadow-lg" />
              </div>
             <div>
               <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-amber-500 leading-none">
                 AutoAds
               </h2>
               <p className="text-[9px] md:text-[11px] font-black text-slate-500 uppercase tracking-widest mt-1 italic">Mayaan Group Gateway</p>
             </div>
           </div>
        </div>

        <div className="p-6 md:p-10 space-y-6 md:space-y-8 bg-white">
          {error && <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-[10px] font-bold uppercase tracking-widest text-center leading-tight">{error}</div>}

            {authMode === 'CREDENTIALS' && (
            <div className="space-y-6">
               <div className="flex bg-slate-50 p-1.5 rounded-2xl mb-2">
                 <button 
                  onClick={() => setIsRegistering(false)}
                  className={cn("flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all", !isRegistering ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600")}
                 >
                   Sign In
                 </button>
                 <button 
                  onClick={() => setIsRegistering(true)}
                  className={cn("flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all", isRegistering ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600")}
                 >
                   Register
                 </button>
               </div>

               <form onSubmit={handleLoginSubmit} className="space-y-6">
                <div className="space-y-5">
                  {!isRegistering && (
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 ml-1">Account Mobile / ID</label>
                      <input 
                        type="text" 
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 md:px-6 md:py-5 text-sm font-black tracking-tight focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none transition-all placeholder:text-slate-300"
                        placeholder="e.g. 9876543210"
                        required 
                      />
                    </div>
                  )}

                  {isRegistering && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-2"
                    >
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 ml-1">Registration Mobile</label>
                      <div className="flex gap-3">
                         <div className="flex-[0.25] bg-slate-100 border border-slate-200 rounded-2xl px-4 py-5 text-xs font-black text-slate-500 flex items-center justify-center">
                            +91
                         </div>
                         <input 
                           type="tel" 
                           value={phone}
                           onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                           className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-sm font-black tracking-tight focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none transition-all"
                           placeholder="10-Digit Mobile"
                           required 
                         />
                      </div>
                    </motion.div>
                  )}

                   {!isRegistering && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 ml-1">Password</label>
                      <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 md:px-6 md:py-5 text-sm font-black tracking-tight focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none transition-all placeholder:text-slate-300"
                        placeholder="••••••••"
                        required 
                      />
                      <div className="flex justify-end mt-3">
                        <button 
                          type="button"
                          onClick={() => setAuthMode('FORGOT_PASSWORD')}
                          className="text-[10px] font-black text-amber-600 uppercase tracking-widest hover:text-amber-700 transition-colors"
                        >
                          Forgot Password?
                        </button>
                      </div>
                    </motion.div>
                   )}
                </div>

                {!isRegistering ? (
                   <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-4 md:py-5 bg-slate-950 text-amber-500 font-black rounded-2xl text-[11px] md:text-[12px] uppercase tracking-[0.2em] md:tracking-[0.25em] shadow-2xl shadow-slate-200 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 relative overflow-hidden group"
                   >
                     <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors" />
                     {loading ? 'Signing In...' : 'Sign In'}
                   </button>
                 ) : (
                    <div className="pt-2 flex flex-col gap-6 text-center">
                       <div className="space-y-4">
                          <p className="text-[10px] text-center font-black text-slate-400 uppercase tracking-[0.2em] mb-2 italic">Join MayaanAds as</p>
                          <div className="flex gap-4">
                            <button 
                              type="button"
                              disabled={loading}
                              onClick={() => startRegistration('DRIVER')}
                              className="flex-1 py-5 bg-white border-2 border-slate-100 text-slate-950 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:border-amber-500 hover:shadow-xl hover:shadow-amber-500/10 transition-all flex flex-col items-center justify-center gap-2 disabled:opacity-50"
                            >
                              <Truck size={20} className="text-amber-500 mb-1" /> {loading ? '...' : 'Auto Driver'}
                            </button>
                            <button 
                              type="button"
                              disabled={loading}
                              onClick={() => startRegistration('CUSTOMER')}
                              className="flex-1 py-5 bg-white border-2 border-slate-100 text-slate-950 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:border-amber-500 hover:shadow-xl hover:shadow-amber-500/10 transition-all flex flex-col items-center justify-center gap-2 disabled:opacity-50"
                            >
                              <Target size={20} className="text-amber-500 mb-1" /> {loading ? '...' : 'Campaign'}
                            </button>
                          </div>
                       </div>
                    </div>
                 )}
               </form>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-100"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
                    <span className="bg-white px-4 text-slate-300">Quick Access</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="py-4 md:py-5 bg-white border border-slate-200 text-slate-800 font-black rounded-2xl text-[9px] md:text-[10px] uppercase tracking-[0.15em] md:tracking-[0.2em] shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                  </button>
                </div>
            </div>
          )}

          {authMode === 'FORGOT_PASSWORD' && (
            <div className="space-y-6">
               <div className="space-y-2 text-center">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest italic">Forgot Password</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Enter registered mobile number</p>
               </div>

               {!recoverySent ? (
                 <form onSubmit={handleRecoveryRequest} className="space-y-4">
                    <div className="flex gap-3">
                       <div className="flex-[0.25] bg-slate-100 border border-slate-200 rounded-2xl px-4 py-5 text-xs font-black text-slate-500 flex items-center justify-center">
                          +91
                       </div>
                       <input 
                         type="tel" 
                         value={phone}
                         onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                         className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-sm font-black tracking-tight focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none transition-all"
                         placeholder="10-Digit Mobile"
                         required 
                       />
                    </div>
                    <button 
                     type="submit" 
                     disabled={loading}
                     className="w-full py-5 bg-slate-900 text-amber-500 font-black rounded-2xl text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-slate-200 transition-all disabled:opacity-50"
                    >
                      {loading ? 'Sending...' : 'Send OTP'}
                    </button>
                 </form>
               ) : (
                 <div className="text-center space-y-6">
                    <div className="p-8 bg-green-50 border border-green-100 rounded-3xl space-y-4">
                        <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600 mx-auto">
                          <CheckCircle size={24} />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Password Reset!</h4>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Your password has been updated. Please sign in with your new credentials.</p>
                        </div>
                    </div>
                 </div>
               )}

               <button 
                 onClick={() => {
                   setAuthMode('CREDENTIALS');
                   setRecoverySent(false);
                   setError('');
                 }}
                 className="w-full py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
               >
                 Back to Login
               </button>
            </div>
          )}

          {(authMode === 'OTP' || authMode === 'RECOVERY_OTP') && (
            <div className="space-y-8 text-center">
               <div className="space-y-2">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">OTP Verification</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">A code was sent to +91 {phone}</p>
               </div>
               
               <div className="flex justify-center gap-3">
                  {otp.map((digit, i) => (
                    <input 
                      key={i}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => {
                        const newOtp = [...otp];
                        newOtp[i] = e.target.value.replace(/\D/g, '');
                        setOtp(newOtp);
                        if (e.target.value && i < 5) {
                           (e.target.nextSibling as HTMLInputElement)?.focus();
                        }
                      }}
                      className="w-12 h-16 bg-[#f8fafc] border border-slate-200 rounded-xl text-center text-xl font-black text-slate-900 focus:ring-1 focus:ring-amber-500 focus:outline-none shadow-inner"
                    />
                  ))}
               </div>

               <button 
                onClick={handleOTPComplete} 
                className="w-full py-5 bg-amber-500 text-slate-900 font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-xl shadow-amber-200/50 hover:bg-amber-600 transition-all"
               >
                  Verify OTP
               </button>

               <button 
                 onClick={() => {
                   setAuthMode('CREDENTIALS');
                   setError('');
                 }}
                 className="w-full py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
               >
                 Back to Login
               </button>
            </div>
          )}

          {(authMode === 'SET_PASSWORD' || authMode === 'RECOVERY_SET_PASSWORD') && (
            <form onSubmit={authMode === 'RECOVERY_SET_PASSWORD' ? handleRecoverySetPassword : handleSetPassword} className="space-y-6">
               <div className="space-y-2 text-center mb-4">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Set New Password</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                    {authMode === 'RECOVERY_SET_PASSWORD' ? `Reset password for +91 ${phone}` : `Create a password for ${authEmail}`}
                  </p>
               </div>

               <div>
                 <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">New Password</label>
                 <input 
                   type="password" 
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   className="w-full bg-[#f8fafc] border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold tracking-tight focus:ring-1 focus:ring-amber-500 focus:outline-none shadow-inner"
                   placeholder="MIN_6_CHARS"
                   required 
                 />
               </div>

               <button 
                type="submit" 
                disabled={loading}
                className="w-full py-5 bg-slate-950 text-white font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all disabled:opacity-50"
               >
                  {loading ? 'Updating...' : 'Set Password'}
               </button>

               <button 
                 type="button"
                 onClick={() => {
                   setAuthMode('CREDENTIALS');
                   setError('');
                 }}
                 className="w-full py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
               >
                 Back to Login
               </button>
            </form>
          )}

          {authMode === 'DRIVER_PROFILE' && (
            <form onSubmit={handleDriverProfileSubmit} className="space-y-6 mt-4">
               <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-4">
                     <div>
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 ml-1">Full Name</label>
                       <input 
                         type="text" 
                         value={driverProfile.name}
                         onChange={(e) => setDriverProfile({...driverProfile, name: e.target.value})}
                         className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-sm font-black tracking-tight focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none transition-all placeholder:text-slate-300"
                         placeholder="Legal Name"
                         required 
                       />
                     </div>
                     <div>
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 ml-1">Primary Operating City</label>
                       <input 
                         type="text" 
                         value={driverProfile.location}
                         onChange={(e) => setDriverProfile({...driverProfile, location: e.target.value})}
                         className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-sm font-black tracking-tight focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none transition-all placeholder:text-slate-300"
                         placeholder="e.g. Bangalore"
                         required 
                       />
                     </div>
                  </div>
               </div>

               <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                  <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Terms of Service & Liability</h4>
                  <div className="h-24 overflow-y-auto text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed space-y-2 border-y border-slate-200 py-2">
                     <p>1. THE HARDWARE UNIT (DISPLAY) REMAINS THE SOLE PROPERTY OF AUTOAD PRO.</p>
                     <p>2. IF THE DRIVER STOPS RUNNING ADS OR THE COMPANY RETIRES THE MODEL, THE UNIT MUST BE RETURNED WITHIN 48 HOURS.</p>
                     <p>3. FAILURE TO RETURN THE UNIT WILL RESULT IN A PENALTY EQUAL TO THE FULL MARKET COST OF THE HARDWARE UNIT.</p>
                     <p>4. THE DRIVER AGREES TO ALLOW THE UNIT TO DRAW POWER FROM THE VEHICLE BATTERY. AUTOAD PRO IS NOT LIABLE FOR ANY VEHICLE BREAKDOWN OR BATTERY DAMAGE.</p>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                     <input 
                      type="checkbox" 
                      checked={driverProfile.agreed}
                      onChange={(e) => setDriverProfile({...driverProfile, agreed: e.target.checked})}
                      className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                     />
                     <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter italic">I explicitly agree to all terms above</span>
                  </label>
               </div>

               <button 
                type="submit" 
                disabled={!driverProfile.agreed || loading}
                className={cn(
                  "w-full py-6 font-black rounded-[1.75rem] text-[11px] uppercase tracking-[0.25em] shadow-2xl transition-all relative overflow-hidden",
                  (driverProfile.agreed) 
                    ? "bg-slate-950 text-amber-500 shadow-slate-200 hover:scale-[1.02] active:scale-95" 
                    : "bg-slate-100 text-slate-300 border border-slate-100 cursor-not-allowed opacity-80"
                )}
               >
                  {loading ? 'Processing...' : 'Finalize Enrollment'}
               </button>

               <button 
                 type="button"
                 onClick={() => {
                   setAuthMode('CREDENTIALS');
                   setError('');
                 }}
                 className="w-full py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
               >
                 Back to Login
               </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
