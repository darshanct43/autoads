import React, { useState, useRef } from 'react';
import { 
  FileText, Upload, Camera, PenTool, CheckCircle, Clock, XCircle, 
  Wallet as WalletIcon, RefreshCw, Send, ArrowUpRight, ShieldCheck 
} from 'lucide-react';

export default function DriverPortal() {
  // Step workflow
  const [step, setStep] = useState<'REGISTER' | 'LOGIN' | 'DOCUMENT_UPLOAD' | 'SELFIE' | 'SIGNATURE' | 'DASHBOARD'>('REGISTER');
  
  // States
  const [driverName, setDriverName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [aadhaarUrl, setAadhaarUrl] = useState<string | null>(null);
  const [licenseUrl, setLicenseUrl] = useState<string | null>(null);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'PENDING' | 'VERIFIED' | 'REJECTED'>('PENDING');

  // Wallet
  const [walletBalance, setWalletBalance] = useState(1250);
  const [creditsAssigned, setCreditsAssigned] = useState(500);
  const [withdrawals, setWithdrawals] = useState([
    { id: 'W-9092', amount: 350, timestamp: Date.now() - 3600000 * 24, status: 'APPROVED' as const },
    { id: 'W-9093', amount: 200, timestamp: Date.now() - 3600000 * 6, status: 'PENDING' as const }
  ]);
  const [withdrawInput, setWithdrawInput] = useState('');

  // Signature states
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Drag-and-drop feedback
  const [aadhaarDrag, setAadhaarDrag] = useState(false);
  const [licenseDrag, setLicenseDrag] = useState(false);

  // Sign helper
  const handleSignatureSave = () => {
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL();
      setSignatureUrl(dataUrl);
      setStep('DASHBOARD');
      setVerificationStatus('PENDING');
    } else {
      // Fallback
      setSignatureUrl('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40"><text x="10" y="25" fill="black">Signed</text></svg>');
      setStep('DASHBOARD');
      setVerificationStatus('PENDING');
    }
  };

  const clearCanvas = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        setSignatureUrl(null);
      }
    }
  };

  // Canvas drawing handlers for signature
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#eab308'; // Amber

    const rect = canvasRef.current.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const triggerSelfieCapture = () => {
    // Simulated capture
    setSelfieUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250');
    setTimeout(() => {
      setStep('SIGNATURE');
    }, 1000);
  };

  const handleWithdrawRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawInput);
    if (isNaN(amount) || amount <= 0 || amount > walletBalance) return;

    const newRequest = {
      id: `W-${Math.floor(1000 + Math.random() * 9000)}`,
      amount,
      timestamp: Date.now(),
      status: 'PENDING' as const
    };

    setWithdrawals([newRequest, ...withdrawals]);
    setWalletBalance(prev => prev - amount);
    setWithdrawInput('');
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-6 px-4" id="driver_portal_root">
      {/* Step banner / Title */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold font-display text-zinc-100 flex items-center justify-center gap-2">
          <ShieldCheck className="w-6 h-6 text-yellow-500" /> AutoAds Auto-Driver Portal
        </h1>
        <p className="text-zinc-400 text-sm mt-1">Get certified, display ads on your auto-rickshaw, and earn passive income.</p>
      </div>

      <div className="bg-[#18181b] border border-[#27272a] rounded-2xl shadow-xl overflow-hidden p-6">
        
        {/* Step 1: Registration */}
        {step === 'REGISTER' && (
          <div id="register_step_view">
            <h2 className="text-lg font-semibold text-zinc-200 mb-4 font-display">Driver Registration</h2>
            <form onSubmit={(e) => { e.preventDefault(); setStep('LOGIN'); }} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">FULL NAME (As on Aadhaar)</label>
                <input 
                  type="text" 
                  required
                  value={driverName} 
                  onChange={e => setDriverName(e.target.value)} 
                  placeholder="Enter full name" 
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500 text-zinc-100"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">PHONE NUMBER</label>
                  <input 
                    type="tel" 
                    required
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    placeholder="Enter 10-digit mobile number" 
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500 text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">AUTO REGISTRATION NUMBER</label>
                  <input 
                    type="text" 
                    required
                    value={vehicleNo} 
                    onChange={e => setVehicleNo(e.target.value)} 
                    placeholder="e.g. KA-02-AB-1234" 
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500 text-zinc-100"
                  />
                </div>
              </div>
              <button 
                type="submit" 
                className="w-full bg-[#EAB308] hover:bg-yellow-500 text-[#09090b] font-semibold py-3.5 rounded-xl transition duration-200 cursor-pointer text-sm mt-4 min-h-[44px]"
              >
                Register & Proceed to Agreement
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Login / Agreement Acceptance */}
        {step === 'LOGIN' && (
          <div id="agreement_step_view">
            <h2 className="text-lg font-semibold text-zinc-200 mb-2 font-display">Driver Portal Service Agreement</h2>
            <p className="text-xs text-zinc-400 mb-4">Please read and accept the conditions below to set up your display ads.</p>
            
            <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-4 h-48 overflow-y-scroll text-xs text-zinc-400 space-y-3 mb-4">
              <p className="font-semibold text-zinc-300">1. PARTIES & SCOPE</p>
              <p>This agreement outlines terms between the Driver Partner ("you") and AutoAds Fleet Systems. By accepting, you consent to mount a secure programmatic display panel on the back of your auto-rickshaw.</p>
              <p className="font-semibold text-zinc-300">2. AD DISPLAY REQUIREMENTS</p>
              <p>You agree to keep the display active during operating hours (minimum 4 hours active daily) and report any physical device damage immediately.</p>
              <p className="font-semibold text-[#EAB308]">3. DATA POLICY (AADHAAR & LICENSE)</p>
              <p>We process Aadhaar card verification solely for identity and safe service integration. Personal data will be securely vaulted.</p>
            </div>

            <div className="flex items-start gap-3 p-3 bg-[#09090b] rounded-xl border border-[#27272a] mb-6">
              <input 
                type="checkbox" 
                id="agree_check"
                checked={agreementAccepted} 
                onChange={e => setAgreementAccepted(e.target.checked)} 
                className="mt-1 w-5 h-5 rounded cursor-pointer accent-yellow-500" 
              />
              <label htmlFor="agree_check" className="text-xs text-zinc-400 select-none cursor-pointer">
                I accept all requirements above, consenting to identity audit, digital sign, and device installation.
              </label>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setStep('REGISTER')} 
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-xl transition duration-200 text-sm min-h-[44px]"
              >
                Back
              </button>
              <button 
                disabled={!agreementAccepted}
                onClick={() => setStep('DOCUMENT_UPLOAD')} 
                className="flex-1 bg-[#EAB308] disabled:bg-zinc-700 disabled:text-zinc-500 hover:bg-yellow-500 text-black font-semibold py-3 rounded-xl transition duration-200 text-sm min-h-[44px] cursor-pointer"
              >
                Accept & Upload Cards
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Identity Cards Upload */}
        {step === 'DOCUMENT_UPLOAD' && (
          <div id="identity_upload_view">
            <h2 className="text-lg font-semibold text-zinc-200 mb-4 font-display">Aadhaar & License Registration</h2>
            
            <div className="space-y-6">
              {/* Aadhaar File Upload Box */}
              <div>
                <span className="block text-xs font-semibold text-zinc-400 mb-2">AADHAAR CARD IMAGE (FRONT)</span>
                <div 
                  className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-colors duration-150 cursor-pointer ${
                    aadhaarUrl ? 'border-emerald-500/50 bg-emerald-500/5' : 
                    aadhaarDrag ? 'border-yellow-500 bg-yellow-500/5' : 'border-[#27272a] bg-[#09090b]'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setAadhaarDrag(true); }}
                  onDragLeave={() => setAadhaarDrag(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setAadhaarDrag(false);
                    setAadhaarUrl('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40"><text x="10" y="25" fill="green">Aadhaar_Uploaded.jpg</text></svg>');
                  }}
                  onClick={() => setAadhaarUrl('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40"><text x="10" y="25" fill="green">Aadhaar_Uploaded.jpg</text></svg>')}
                >
                  <Upload className={`w-8 h-8 mb-2 ${aadhaarUrl ? 'text-emerald-400' : 'text-zinc-500'}`} />
                  <p className="text-xs text-zinc-400 text-center">
                    {aadhaarUrl ? '✓ Aadhaar Front upload saved successfully!' : 'Drag & drop your Aadhaar Front Card here, or click to attach'}
                  </p>
                </div>
              </div>

              {/* Driving License Box */}
              <div>
                <span className="block text-xs font-semibold text-zinc-400 mb-2">DRIVING LICENSE CARD</span>
                <div 
                  className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-colors duration-150 cursor-pointer ${
                    licenseUrl ? 'border-emerald-500/50 bg-emerald-500/5' : 
                    licenseDrag ? 'border-yellow-500 bg-yellow-500/5' : 'border-[#27272a] bg-[#09090b]'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setLicenseDrag(true); }}
                  onDragLeave={() => setLicenseDrag(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setLicenseDrag(false);
                    setLicenseUrl('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40"><text x="10" y="25" fill="green">License_Uploaded.jpg</text></svg>');
                  }}
                  onClick={() => setLicenseUrl('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40"><text x="10" y="25" fill="green">License_Uploaded.jpg</text></svg>')}
                >
                  <Upload className={`w-8 h-8 mb-2 ${licenseUrl ? 'text-emerald-400' : 'text-zinc-500'}`} />
                  <p className="text-xs text-zinc-400 text-center">
                    {licenseUrl ? '✓ Driving License upload saved successfully!' : 'Drag & drop your Driving License Card, or click to attach'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button 
                onClick={() => setStep('LOGIN')} 
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-xl transition duration-200 text-sm min-h-[44px]"
              >
                Back
              </button>
              <button 
                disabled={!aadhaarUrl || !licenseUrl}
                onClick={() => setStep('SELFIE')} 
                className="flex-1 bg-[#EAB308] disabled:bg-zinc-700 disabled:text-zinc-500 hover:bg-yellow-500 text-black font-semibold py-3 rounded-xl transition duration-200 text-sm min-h-[44px]"
              >
                Proceed to Selfie Verification
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Selfie Capture */}
        {step === 'SELFIE' && (
          <div id="selfie_capture_view" className="text-center">
            <h2 className="text-lg font-semibold text-zinc-200 mb-2 font-display">Selfie Authentication</h2>
            <p className="text-xs text-zinc-400 mb-6">Position your face within the frame. This selfie will be recorded in your digital service panel.</p>

            <div className="max-w-xs mx-auto aspect-square rounded-2xl bg-[#09090b] border-2 border-zinc-800 flex flex-col items-center justify-center p-4 relative overflow-hidden mb-6">
              {selfieUrl ? (
                <img src={selfieUrl} alt="Selfie preview" className="w-full h-full object-cover" />
              ) : (
                <>
                  <div className="absolute inset-4 border-2 border-dashed border-zinc-700 rounded-full animate-pulse flex items-center justify-center">
                    <Camera className="w-12 h-12 text-zinc-600" />
                  </div>
                  <span className="text-xs text-zinc-500 mt-24">Camera Standby</span>
                </>
              )}
            </div>

            <div className="flex gap-4 max-w-sm mx-auto">
              <button 
                onClick={() => setStep('DOCUMENT_UPLOAD')} 
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-xl transition duration-200 text-sm min-h-[44px]"
              >
                Back
              </button>
              <button 
                onClick={triggerSelfieCapture} 
                className="flex-1 bg-[#EAB308] hover:bg-yellow-500 text-black font-semibold py-3 rounded-xl transition duration-200 text-sm min-h-[44px] flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" /> Capture Photo
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Digital Signature Pad */}
        {step === 'SIGNATURE' && (
          <div id="signature_pad_view">
            <h2 className="text-lg font-semibold text-zinc-200 mb-2 font-display font-medium">Digital Signature</h2>
            <p className="text-xs text-zinc-400 mb-4">Please draw your signature using screen touch or mouse on the canvas below to seal the contract PDF.</p>

            <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-2 mb-6">
              <canvas 
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onMouseMove={draw}
                onTouchStart={startDrawing}
                onTouchEnd={stopDrawing}
                onTouchMove={draw}
                width={360}
                height={150}
                className="w-full bg-zinc-950 border border-zinc-900 rounded-lg touch-none"
              />
              <div className="flex justify-end gap-2 mt-2">
                <button 
                  onClick={clearCanvas} 
                  className="px-3 py-1.5 text-xs text-zinc-400 bg-zinc-900 hover:bg-zinc-800 rounded-lg"
                >
                  Clear Sketch
                </button>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setStep('SELFIE')} 
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-xl transition duration-200 text-sm min-h-[44px]"
              >
                Back
              </button>
              <button 
                onClick={handleSignatureSave} 
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold py-3 rounded-xl transition duration-200 text-sm min-h-[44px] flex items-center justify-center gap-1"
              >
                <PenTool className="w-4 h-4" /> Seal & Finalize Agreement
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Main Dashboard */}
        {step === 'DASHBOARD' && (
          <div id="main_dashboard_view" className="space-y-6">
            
            {/* Status indicators banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#09090b] border border-[#27272a] p-4 rounded-xl flex items-center gap-3">
                {verificationStatus === 'PENDING' ? (
                  <>
                    <Clock className="w-8 h-8 text-yellow-500 flex-shrink-0" />
                    <div>
                      <span className="block text-xs text-zinc-400 font-semibold uppercase leading-none">VERIFICATION STATUS</span>
                      <strong className="text-yellow-500 text-sm mt-1 block">In Progress (Pending Review)</strong>
                    </div>
                  </>
                ) : verificationStatus === 'VERIFIED' ? (
                  <>
                    <CheckCircle className="w-8 h-8 text-emerald-500 flex-shrink-0" />
                    <div>
                      <span className="block text-xs text-zinc-400 font-semibold uppercase leading-none">VERIFICATION STATUS</span>
                      <strong className="text-emerald-500 text-sm mt-1 block">Verified & Approved</strong>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
                    <div>
                      <span className="block text-xs text-zinc-400 font-semibold uppercase leading-none">VERIFICATION STATUS</span>
                      <strong className="text-red-500 text-sm mt-1 block">Rejected / Re-submit</strong>
                    </div>
                  </>
                )}
              </div>

              {/* Vehicle configuration */}
              <div className="bg-[#09090b] border border-[#27272a] p-4 rounded-xl flex items-center gap-3">
                <div className="w-8 h-8 bg-[#EAB308]/10 rounded-lg flex items-center justify-center text-yellow-500 border border-yellow-500/10">
                  <span className="text-xs font-mono font-bold">REG</span>
                </div>
                <div>
                  <span className="block text-xs text-zinc-400 font-semibold">VEHICLE ASSIGNED</span>
                  <strong className="text-zinc-200 text-sm font-mono mt-1 block">{vehicleNo || 'KA-51-EF-4351'}</strong>
                </div>
              </div>

              {/* Active display units */}
              <div className="bg-[#09090b] border border-[#27272a] p-4 rounded-xl flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400 border border-emerald-500/10">
                  <span className="text-xs font-mono font-bold">IOT</span>
                </div>
                <div>
                  <span className="block text-xs text-zinc-400 font-semibold">TERMINAL MOUNT STATUS</span>
                  <strong className="text-[#EAB308] text-sm mt-1 block">Active online sync</strong>
                </div>
              </div>
            </div>

            {/* Wallet System View */}
            <div className="border border-[#27272a] bg-[#09090b] rounded-2xl p-6" id="wallet_sub_view">
              <div className="flex items-center justify-between border-b border-[#27272a] pb-4 mb-4">
                <h3 className="font-semibold font-display text-zinc-200 flex items-center gap-2">
                  <WalletIcon className="w-5 h-5 text-yellow-500" /> AutoAds Wallet Ledger
                </h3>
                <span className="text-xs font-mono text-zinc-500">ID: DL-{phone || '9123456789'}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <span className="text-xs text-zinc-500">NET DRIVER EARNING BALANCE</span>
                  <div className="text-3xl font-bold font-display text-zinc-100 mt-1">₹{walletBalance.toFixed(2)}</div>
                  <span className="text-xs text-emerald-400 mt-1 block font-mono">⚡ Credits Assigned: ₹{creditsAssigned}</span>
                </div>

                <form onSubmit={handleWithdrawRequest} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">WITHDRAW TO SAVINGS BANK</label>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        value={withdrawInput}
                        onChange={e => setWithdrawInput(e.target.value)}
                        placeholder="₹ Amount (max wallet balance)" 
                        className="flex-1 bg-zinc-900 border border-[#27272a] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-yellow-500 text-zinc-100 placeholder-zinc-600"
                        min="1"
                        max={walletBalance}
                      />
                      <button 
                        type="submit" 
                        className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3 h-3" /> Withdraw
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Withdrawal requests log */}
              <div className="mt-6">
                <span className="block text-xs font-semibold text-zinc-400 mb-3 uppercase font-mono">Priced Payout & Withdraw History</span>
                <div className="space-y-2">
                  {withdrawals.map((withdraw) => (
                    <div key={withdraw.id} className="bg-zinc-900/50 border border-[#27272a] p-3 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-zinc-200 text-xs font-mono font-medium">{withdraw.id}</strong>
                        <span className="text-zinc-500 ml-2">{new Date(withdraw.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <strong className="text-zinc-300">₹{withdraw.amount}</strong>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold font-mono ${
                          withdraw.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/10'
                        }`}>
                          {withdraw.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Agreement Vault */}
            <div className="border border-[#27272a] bg-[#09090b] rounded-2xl p-6" id="agreement_vault_view">
              <h3 className="font-semibold font-display text-zinc-200 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-yellow-500" /> Digital Agreement Vault
              </h3>

              <div className="bg-zinc-900/50 border border-[#27272a] p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                <div>
                  <h4 className="font-semibold text-zinc-200 mb-1 font-display">Auto-Rickshaw IoT Mounting Agreement</h4>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <span>Registered Under: {driverName || 'Darshan CT'}</span>
                    <span>•</span>
                    <span>License: {phone || '9876543210'}</span>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    alert('PDF Contract compiled successfully!\nSelfie and E-Signature are embedded into contract payload.');
                  }}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" /> Download Contract PDF
                </button>
              </div>
            </div>

            {/* Back to registry controls */}
            <div className="mt-8 pt-4 border-t border-[#27272a] text-center">
              <button 
                onClick={() => {
                  setStep('REGISTER');
                  setAadhaarUrl(null);
                  setLicenseUrl(null);
                  setSelfieUrl(null);
                  setSignatureUrl(null);
                  setAgreementAccepted(false);
                }} 
                className="text-xs text-yellow-500 hover:text-yellow-400 flex items-center gap-1 mx-auto bg-zinc-900 hover:bg-zinc-800 px-4 py-2.5 rounded-xl cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Re-Register & Simulate Uploads
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
