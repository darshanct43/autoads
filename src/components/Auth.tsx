import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Truck, Target, Smartphone, Truck as TruckIcon, User, Settings, LogOut, ChevronRight, CheckCircle, ShieldCheck, AlertCircle, Smartphone as DeviceIcon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, googleLogin } from '@/lib/firebase';
import { firebaseService } from '@/services/firebaseService';
import { ErrorBoundary } from './common/ErrorBoundary';

interface AuthProps {
  onLogin: (role: UserRole) => void;
}

export default function Auth({ onLogin }: AuthProps) {
  const [authMode, setAuthMode] = useState<'CREDENTIALS' | 'OTP' | 'SET_PASSWORD' | 'DRIVER_PROFILE' | 'FORGOT_PASSWORD' | 'RECOVERY_OTP' | 'RECOVERY_SET_PASSWORD' | 'TERMINAL_LOGIN'>('CREDENTIALS');
  const [isRegistering, setIsRegistering] = useState(false);
  const [role, setRole] = useState<UserRole>('CUSTOMER');
  const [authEmail, setAuthEmail] = useState('');
  const [recoverySent, setRecoverySent] = useState(false);
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [terminalId, setTerminalId] = useState('');
  const [terminalKey, setTerminalKey] = useState('');
  const [userName, setUserName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  useEffect(() => {
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
          }
          if (userRole === 'DRIVER') {
            const driverProfile = await firebaseService.getDriverProfile(user.uid);
            if (!driverProfile) setAuthMode('DRIVER_PROFILE');
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
      let userRole: UserRole = 'CUSTOMER';
      const emailLower = user.email?.toLowerCase() || '';

      if (emailLower === 'admin@autoads.in' || emailLower === 'darshanct43@gmail.com') {
        userRole = 'ADMIN';
      } else if (emailLower === 'vijayathrishu@gmail.com' || emailLower.includes('support')) {
        userRole = 'SUPPORT';
      } else {
        const profile = await firebaseService.getUserProfile(user.uid);
        if (profile?.role) userRole = profile.role as UserRole;
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

    const inputEmail = authEmail.trim();
    const inputPassword = password.trim();

    try {
      let finalEmail = inputEmail;
      if (/^\d{10}$/.test(inputEmail)) {
        finalEmail = `${inputEmail}@autoads.in`;
      }

      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, finalEmail, inputPassword);
      } catch (authErr: any) {
        const isInvalidCredential = 
          authErr.code === 'auth/invalid-credential' || 
          authErr.code === 'auth/user-not-found' || 
          authErr.code === 'auth/wrong-password' || 
          (authErr.message && authErr.message.toLowerCase().includes('invalid-credential'));

        if (isInvalidCredential) {
          const isSupportDemo = (inputEmail.toLowerCase() === 'support@autoads.in' || inputEmail.toLowerCase() === 'support') && inputPassword === 'autoads123';
          if (isSupportDemo || /^\d{10}$/.test(inputEmail) || inputEmail.toLowerCase().includes('driver')) {
            userCredential = await createUserWithEmailAndPassword(auth, finalEmail, inputPassword);
            const user = userCredential.user;
            let initialRole: UserRole = 'CUSTOMER';
            const lowerIn = inputEmail.toLowerCase();
            if (lowerIn.includes('support')) initialRole = 'SUPPORT';
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
          } else {
            throw new Error("Invalid credentials. Please check your account ID and password.");
          }
        } else {
          throw authErr;
        }
      }
      
      const user = userCredential!.user;
      let userRole: UserRole = 'CUSTOMER';
      const emailLower = user.email?.toLowerCase() || '';
      
      if (emailLower === 'admin@autoads.in' || emailLower === 'darshanct43@gmail.com') {
        userRole = 'ADMIN';
      } else if (emailLower === 'vijayathrishu@gmail.com') {
        userRole = 'SUPPORT';
      } else {
        const profile = await firebaseService.getUserProfile(user.uid);
        if (profile?.role) userRole = profile.role as UserRole;
      }
      
      if (userRole === 'DRIVER') {
        const dProfile = await firebaseService.getDriverProfile(user.uid);
        if (!dProfile) {
          setAuthMode('DRIVER_PROFILE');
          setRole('DRIVER');
          setLoading(false);
          return;
        }
      }
      onLogin(userRole); 
    } catch (err: any) {
      setError(err.message || 'Authentication Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTerminalLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const terminals = await firebaseService.getTerminals() as any[];
      const terminal = terminals.find(t => 
        t.id?.toUpperCase() === terminalId.trim().toUpperCase() && 
        t.accessKey === terminalKey.trim()
      );

      if (terminal) {
        localStorage.setItem('auto_ads_terminal_id', terminal.id);
        localStorage.setItem('auto_ads_access_key', terminal.accessKey);
        onLogin('DEVICE' as any);
      } else {
        setError('Invalid Terminal ID or Access Key');
      }
    } catch (err: any) {
      setError(err.message || 'Terminal connection failed');
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
      await firebaseService.saveDriverProfile({
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
      await firebaseService.saveUserProfile(user.uid, driverProfile.name, phone || '0000000000', 'DRIVER');
      onLogin('DRIVER');
    } catch (err: any) {
      setError(err.message || 'Failed to initialize driver profile');
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
                <div className="flex bg-slate-50 p-1.5 rounded-2xl">
                  <button onClick={() => setIsRegistering(false)} className={cn("flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all", !isRegistering ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600")}>Sign In</button>
                  <button onClick={() => setIsRegistering(true)} className={cn("flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all", isRegistering ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600")}>Register</button>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-6">
                  {!isRegistering ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 ml-1">Account Mobile / ID</label>
                        <input type="text" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-sm font-black tracking-tight focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none transition-all placeholder:text-slate-300" placeholder="e.g. 9876543210" required />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 ml-1">Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-sm font-black tracking-tight focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none transition-all placeholder:text-slate-300" placeholder="••••••••" required />
                      </div>
                      <button type="submit" disabled={loading} className="w-full py-5 bg-slate-950 text-amber-500 font-black rounded-2xl text-[12px] uppercase tracking-[0.25em] shadow-2xl hover:scale-[1.01] transition-all disabled:opacity-50">{loading ? 'Processing...' : 'Sign In'}</button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Registration Mobile</label>
                        <div className="flex gap-2">
                          <div className="bg-slate-100 border border-slate-200 rounded-2xl px-4 py-5 text-xs font-black text-slate-500">+91</div>
                          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-sm font-black tracking-tight focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none transition-all" placeholder="10-Digit Mobile" required />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <p className="text-[10px] text-center font-black text-slate-400 uppercase tracking-[0.2em] italic">Join MayaanAds as</p>
                        <div className="flex gap-4">
                          <button type="button" onClick={() => { setRole('DRIVER'); setIsRegistering(false); setLoading(true); handleLoginSubmit({preventDefault: () => {}} as any); }} className="flex-1 py-5 bg-white border-2 border-slate-100 text-slate-950 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:border-amber-500 transition-all flex flex-col items-center gap-2"><Truck size={20} className="text-amber-500" /> Auto Driver</button>
                          <button type="button" onClick={() => { setRole('CUSTOMER'); setIsRegistering(false); setLoading(true); handleLoginSubmit({preventDefault: () => {}} as any); }} className="flex-1 py-5 bg-white border-2 border-slate-100 text-slate-950 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:border-amber-500 transition-all flex flex-col items-center gap-2"><Target size={20} className="text-amber-500" /> Campaign</button>
                        </div>
                      </div>
                    </div>
                  )}
                </form>

                <div className="grid grid-cols-1 gap-3">
                  <button onClick={handleGoogleLogin} className="py-5 bg-white border border-slate-200 text-slate-800 font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] hover:bg-slate-50 transition-all flex items-center justify-center gap-3">
                    <svg viewBox="0 0 24 24" className="w-4 h-4"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Continue with Google
                  </button>
                  <button onClick={() => setAuthMode('TERMINAL_LOGIN')} className="py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors flex items-center justify-center gap-2">
                    <Smartphone size={14} /> Connect Terminal / Device
                  </button>
                </div>
              </div>
            )}

            {authMode === 'TERMINAL_LOGIN' && (
              <div className="space-y-6">
                <div className="space-y-2 text-center">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest italic">Terminal Connection</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Enter Hardware ID and Access Key</p>
                </div>
                <form onSubmit={handleTerminalLogin} className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 ml-1">Terminal ID</label>
                      <input type="text" value={terminalId} onChange={(e) => setTerminalId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-sm font-black tracking-tight focus:outline-none transition-all placeholder:text-slate-300" placeholder="e.g. DEVICE-0001" required />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 ml-1">Access Key</label>
                      <input type="password" value={terminalKey} onChange={(e) => setTerminalKey(e.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-sm font-black tracking-tight focus:outline-none transition-all placeholder:text-slate-300" placeholder="4-6 Digit Key" required />
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full py-5 bg-slate-900 text-amber-500 font-black rounded-2xl text-[11px] uppercase tracking-[0.2em] shadow-xl transition-all disabled:opacity-50">{loading ? 'Connecting...' : 'Initialize Tab'}</button>
                </form>
                <button onClick={() => setAuthMode('CREDENTIALS')} className="w-full py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">Back to Main Door</button>
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
