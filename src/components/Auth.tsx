import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, Lock, ChevronRight, CheckCircle, ShieldCheck, Truck, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types';

interface AuthProps {
  onLogin: (role: UserRole) => void;
}

export default function Auth({ onLogin }: AuthProps) {
  const [authMode, setAuthMode] = useState<'CREDENTIALS' | 'OTP' | 'SET_PASSWORD' | 'DRIVER_PROFILE'>('CREDENTIALS');
  const [isRegistering, setIsRegistering] = useState(false);
  const [role, setRole] = useState<UserRole>('CUSTOMER');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  // Driver Profile State
  const [driverProfile, setDriverProfile] = useState({
    name: '',
    location: '',
    address: '',
    aadhar: '',
    rc: '',
    vehicleNumber: '',
    license: '',
    agreed: false,
    photo: null as string | null
  });

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const input = (email || phone).trim().toLowerCase();

    // Check Admin
    if (input === 'admin@43' && password === 'Hospital@43') {
      onLogin('ADMIN');
      return;
    }

    // Check Staff
    if (input === 'supportteam@123' && password === 'Autoads123') {
      onLogin('STAFF');
      return;
    }

    // Check existing Driver
    const driverPass = localStorage.getItem(`auth_DRIVER_${input}`);
    if (driverPass && password === driverPass) {
      onLogin('DRIVER');
      return;
    }

    // Check existing Customer
    const customerPass = localStorage.getItem(`auth_CUSTOMER_${input}`);
    if (customerPass && password === customerPass) {
      onLogin('CUSTOMER');
      return;
    }

    if (driverPass || customerPass) {
      setError('Incorrect Password');
    } else {
      setError('Credentials not found. Please register first.');
    }
  };

  const handleOTPComplete = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setAuthMode('SET_PASSWORD');
    }, 1500);
  };

  const handleSetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 4) {
      setError('Password too short');
      return;
    }
    localStorage.setItem(`auth_${role}_${phone}`, password);
    if (role === 'DRIVER') {
      setAuthMode('DRIVER_PROFILE');
    } else {
      onLogin(role);
    }
  };

  const handleDriverProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverProfile.agreed) {
      setError('You must agree to the Terms and Policy');
      return;
    }
    if (!driverProfile.photo) {
      setError('Please provide a live photo');
      return;
    }
    // Save profile logic here (demo)
    localStorage.setItem(`profile_DRIVER_${phone}`, JSON.stringify(driverProfile));
    onLogin('DRIVER');
  };

  const startRegistration = (selectedRole: UserRole) => {
    if (!phone) {
      setError('Please enter mobile number for registration');
      return;
    }
    setRole(selectedRole);
    setAuthMode('OTP');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className={cn(
          "max-w-md w-full glass-card overflow-hidden rounded-[3rem] border border-slate-200 shadow-2xl transition-all duration-500",
          authMode === 'DRIVER_PROFILE' && "max-w-2xl"
        )}
      >
        <div className="bg-slate-900 p-8 text-white relative">
           <div className="flex items-center gap-4 mb-2">
             <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-slate-900 font-bold overflow-hidden shadow-lg shadow-amber-500/20">
               <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
                 <path d="M4 14h16m-2 0l2 6H6l2-6M8 8L6 4h12l-2 4" />
               </svg>
             </div>
             <div>
               <h2 className="text-2xl font-black italic uppercase tracking-tighter text-amber-500 leading-none">
                 AutoAds
               </h2>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Professional Login Page</p>
             </div>
           </div>
        </div>

        <div className="p-10 space-y-8 bg-white">
          {error && <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-[10px] font-bold uppercase tracking-widest text-center">{error}</div>}

           {authMode === 'CREDENTIALS' && (
            <div className="space-y-6">
               <div className="flex bg-slate-50 p-1.5 rounded-2xl mb-2">
                 <button 
                  onClick={() => setIsRegistering(false)}
                  className={cn("flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all", !isRegistering ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600")}
                 >
                   Secure Sign In
                 </button>
                 <button 
                  onClick={() => setIsRegistering(true)}
                  className={cn("flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all", isRegistering ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600")}
                 >
                   New Enrollment
                 </button>
               </div>

               <form onSubmit={handleLoginSubmit} className="space-y-6">
                <div className="space-y-4">
                   <div>
                     <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Username / Mobile / Email</label>
                     <input 
                       type="text" 
                       value={email || phone}
                       onChange={(e) => {
                         const val = e.target.value;
                         if (/^\d+$/.test(val)) setPhone(val.slice(0, 10));
                         else setEmail(val);
                       }}
                       className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl px-5 py-4 text-xs font-bold tracking-tight focus:ring-1 focus:ring-amber-500 focus:outline-none"
                       placeholder="ENTER_ID"
                       required 
                     />
                   </div>

                   {!isRegistering && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">System Secure Key</label>
                      <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[#f8fafc] border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold tracking-tight focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        placeholder="••••••••"
                        required 
                      />
                    </motion.div>
                   )}
                </div>

                {!isRegistering ? (
                  <button type="submit" className="w-full py-5 bg-slate-900 text-amber-500 font-black rounded-2xl text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:scale-[1.02] active:scale-95 transition-all">
                    Access Portal
                  </button>
                ) : (
                  <div className="space-y-4">
                    <p className="text-[10px] text-center font-bold text-slate-400 uppercase tracking-widest">Enrollment Category</p>
                    <div className="flex gap-3">
                      <button 
                        type="button"
                        onClick={() => startRegistration('DRIVER')}
                        className="flex-1 py-4 bg-white border-2 border-slate-100 text-slate-900 font-black rounded-2xl text-[9px] uppercase tracking-widest hover:border-amber-500 transition-all flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Truck size={14} className="text-amber-500" /> Driver
                      </button>
                      <button 
                        type="button"
                        onClick={() => startRegistration('CUSTOMER')}
                        className="flex-1 py-4 bg-white border-2 border-slate-100 text-slate-900 font-black rounded-2xl text-[9px] uppercase tracking-widest hover:border-amber-500 transition-all flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Target size={14} className="text-amber-500" /> Customer
                      </button>
                    </div>
                  </div>
                )}
               </form>
            </div>
          )}

          {authMode === 'OTP' && (
            <div className="space-y-8 text-center">
               <div className="space-y-2">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Ownership Verification</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">A critical key was sent to +91 {phone}</p>
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
                        if (e.target.value && i < 3) {
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
                  Verify Key
               </button>
            </div>
          )}

          {authMode === 'SET_PASSWORD' && (
            <form onSubmit={handleSetPassword} className="space-y-6">
               <div className="space-y-2 text-center mb-4">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Establish Security</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Create a permanent password for +91 {phone}</p>
               </div>

               <div>
                 <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">New System Password</label>
                 <input 
                   type="password" 
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   className="w-full bg-[#f8fafc] border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold tracking-tight focus:ring-1 focus:ring-amber-500 focus:outline-none shadow-inner"
                   placeholder="MIN_4_CHARS"
                   required 
                 />
               </div>

               <button type="submit" className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all">
                  Next Step
               </button>
            </form>
          )}

          {authMode === 'DRIVER_PROFILE' && (
            <form onSubmit={handleDriverProfileSubmit} className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                     <div>
                       <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Full Name (As per Aadhar)</label>
                       <input 
                         type="text" 
                         value={driverProfile.name}
                         onChange={(e) => setDriverProfile({...driverProfile, name: e.target.value})}
                         className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-bold uppercase tracking-tight"
                         placeholder="Legal Name"
                         required 
                       />
                     </div>
                     <div>
                       <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Primary Operating Location</label>
                       <input 
                         type="text" 
                         value={driverProfile.location}
                         onChange={(e) => setDriverProfile({...driverProfile, location: e.target.value})}
                         className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-bold uppercase tracking-tight"
                         placeholder="e.g. MG Road, Bangalore"
                         required 
                       />
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Vehicle No</label>
                          <input 
                            type="text" 
                            value={driverProfile.vehicleNumber}
                            onChange={(e) => setDriverProfile({...driverProfile, vehicleNumber: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-bold tracking-tight"
                            placeholder="KA-13-..."
                            required 
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">RC Number</label>
                          <input 
                            type="text" 
                            value={driverProfile.rc}
                            onChange={(e) => setDriverProfile({...driverProfile, rc: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-bold tracking-tight"
                            placeholder="RC_NUM"
                            required 
                          />
                        </div>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Aadhar Card</label>
                          <input 
                            type="text" 
                            value={driverProfile.aadhar}
                            onChange={(e) => setDriverProfile({...driverProfile, aadhar: e.target.value.replace(/\D/g, '').slice(0, 12)})}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-bold tracking-tight"
                            placeholder="12 Digits"
                            required 
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">DL Number</label>
                          <input 
                            type="text" 
                            value={driverProfile.license}
                            onChange={(e) => setDriverProfile({...driverProfile, license: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-bold tracking-tight"
                            placeholder="DL_NUM"
                            required 
                          />
                        </div>
                     </div>
                     <div>
                       <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Home Address</label>
                       <textarea 
                         value={driverProfile.address}
                         onChange={(e) => setDriverProfile({...driverProfile, address: e.target.value})}
                         className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-bold tracking-tight min-h-[60px]"
                         placeholder="Full Residential Address"
                         required 
                       />
                     </div>
                     <div>
                        <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Capture Live Photo</label>
                        <div 
                          onClick={() => setDriverProfile({...driverProfile, photo: 'CAPTURED_IMAGE_DATA'})}
                          className="w-full h-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-all"
                        >
                           {driverProfile.photo ? (
                             <span className="text-[9px] text-green-600 font-extrabold">✓ PHOTO CAPTURED</span>
                           ) : (
                             <>
                               <div className="w-8 h-8 bg-slate-200 rounded-full mb-1" />
                               <span className="text-[8px] font-bold text-slate-400 tracking-widest uppercase text-center px-4">Take Live Photo for Verification</span>
                             </>
                           )}
                        </div>
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

               <button type="submit" className="w-full py-5 bg-slate-900 text-amber-500 font-black rounded-2xl text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:scale-[1.02] transition-all">
                  Finalize Enrollment
               </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
