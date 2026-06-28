import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CloudUpload, User, FileText, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { storageService } from '@/services/storageService';
import { firebaseService } from '@/services/firebaseService';
import { cn } from '@/lib/utils';
import { DriverProfile, DriverDocument } from '@/types';
import { db } from '@/lib/firebase';
import { onSnapshot, doc } from 'firebase/firestore';

interface DriverKYCProps {
  driverId: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function DriverKYC({ driverId, onSuccess, onCancel }: DriverKYCProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Partial<DriverDocument>>({});
  const [upiId, setUpiId] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverData, setDriverData] = useState<any>(null);

  useEffect(() => {
    if (!driverId) return;
    
    // Subscribe to driver profile to load existing data
    const unsub = onSnapshot(doc(db, 'drivers', driverId), (snap: any) => {
      if (snap.exists()) {
        const data = snap.data();
        setDriverData(data);
        setDocuments({
          aadhaar: data.aadharPhoto || '',
          drivingLicense: data.dlPhoto || '',
          selfie: data.selfiePhoto || '',
          rc: data.rcPhoto || ''
        });
        setUpiId(data.upiId || '');
        setVehicleNumber(data.vehicleNumber || '');
      }
    });
    return unsub;
  }, [driverId]);

  const handleUpload = async (docKey: keyof DriverDocument, file: File) => {
    setLoading(true);
    setError(null);
    try {
      const extension = file.name.split('.').pop() || 'jpg';
      const customName = `${docKey}-${Date.now()}.${extension}`;
      const url = await storageService.uploadFile(
        file,
        undefined,
        customName,
        `drivers/${driverId}`
      );
      setDocuments(prev => ({ ...prev, [docKey]: url }));
    } catch (e: any) {
      console.error(e);
      setError("Failed to upload " + docKey + ": " + (e.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    if (!documents.aadhaar || !documents.drivingLicense || !documents.selfie || !documents.rc) {
      setError("Please upload all four required documents (Aadhaar, Driving License, Selfie, and RC).");
      return;
    }
    
    if (!vehicleNumber.trim()) {
      setError("Please enter your vehicle number.");
      return;
    }
    
    setLoading(true);
    try {
      const profile: any = {
        kycStatus: 'PENDING',
        documentStatus: 'PENDING',
        payoutEnabled: false,
        adminApproved: false,
        documents: documents as DriverDocument,
        aadharPhoto: documents.aadhaar,
        dlPhoto: documents.drivingLicense,
        profileImage: documents.selfie,
        selfiePhoto: documents.selfie,
        rcPhoto: documents.rc,
        upiId: upiId,
        vehicleNumber: vehicleNumber.trim()
      };
      await firebaseService.updateDriverProfile(driverId, profile);
      onSuccess();
    } catch (e: any) {
      setError("Failed to save KYC details: " + (e.message || "Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 bg-white rounded-[2rem] shadow-xl border border-slate-100 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        {onCancel && (
          <button 
            onClick={onCancel}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 active:scale-95 rounded-xl text-slate-600 transition-all border border-slate-100"
            title="Go Back"
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <h2 className="text-xl font-black italic uppercase tracking-tighter text-slate-900">Driver KYC Verification</h2>
      </div>
      
      <div className="space-y-4">
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Required Documents</p>
          {(['aadhaar', 'drivingLicense', 'selfie', 'rc'] as const).map(doc => (
            <div key={doc} className="flex flex-col gap-2 p-4 bg-white rounded-2xl border border-slate-200">
               <div className="flex items-center justify-between">
                 <span className="text-sm font-bold text-slate-800 capitalize">{doc.replace(/([A-Z])/g, ' $1').replace('rc', 'RC (Registration Certificate)')}</span>
                 <input type="file" onChange={(e) => e.target.files && handleUpload(doc, e.target.files[0])} className="hidden" id={doc} />
                 <label htmlFor={doc} className={cn("px-6 py-3 rounded-2xl cursor-pointer text-[10px] font-black uppercase tracking-widest transition-all shadow-sm border active:scale-95 flex items-center gap-2", documents[doc] ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-slate-900 text-amber-500 border-slate-800")}>
                    <CloudUpload size={14} />
                    {documents[doc] ? "Update Doc" : "Upload Document"}
                 </label>
               </div>
               {documents[doc] && (
                 <div className="mt-2">
                   <img src={documents[doc]} alt={doc} className="w-full h-32 object-cover rounded-lg border border-slate-200" />
                 </div>
               )}
            </div>
          ))}
      </div>
      
      <div className="space-y-3">
          <input 
            placeholder="Enter Vehicle Number (e.g. KA 01 AB 1234)" 
            className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm focus:outline-none focus:border-amber-500 transition-all uppercase" 
            value={vehicleNumber} 
            onChange={e => setVehicleNumber(e.target.value)} 
          />
          <input 
            placeholder="Enter UPI ID" 
            className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm focus:outline-none focus:border-amber-500 transition-all" 
            value={upiId} 
            onChange={e => setUpiId(e.target.value)} 
          />
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-2 text-rose-800 font-bold text-[10px] uppercase tracking-tight">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <button 
            onClick={handleSubmit} 
            disabled={loading} 
            className="w-full py-4.5 bg-slate-900 text-amber-500 rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Submit for Review'}
          </button>
      </div>
    </div>
  );
}
