import { useState } from 'react';
import { motion } from 'motion/react';
import { CloudUpload, User, FileText, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { storageService } from '@/services/storageService';
import { firebaseService } from '@/services/firebaseService';
import { cn } from '@/lib/utils';
import { DriverProfile, DriverDocument } from '@/types';

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
    if (!documents.aadhaar || !documents.drivingLicense || !documents.selfie) {
      setError("Please upload all three required documents (Aadhaar, Driving License, and Selfie).");
      return;
    }
    
    setLoading(true);
    try {
      const profile: any = {
        kycStatus: 'PENDING',
        payoutEnabled: false,
        adminApproved: false,
        documents: documents as DriverDocument,
        aadharPhoto: documents.aadhaar,
        dlPhoto: documents.drivingLicense,
        profileImage: documents.selfie,
        selfiePhoto: documents.selfie,
        upiId: upiId
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
      
      <div className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Document Uploads</p>
          {(['aadhaar', 'drivingLicense', 'selfie'] as const).map(doc => (
            <div key={doc} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
               <span className="text-xs font-bold text-slate-700 capitalize">{doc.replace(/([A-Z])/g, ' $1')}</span>
               <input type="file" onChange={(e) => e.target.files && handleUpload(doc, e.target.files[0])} className="hidden" id={doc} />
               <label htmlFor={doc} className={cn("p-2.5 rounded-xl cursor-pointer transition-all active:scale-95", documents[doc] ? "bg-green-100 text-green-600" : "bg-slate-200 hover:bg-slate-300")}>
                  <CloudUpload size={18} />
               </label>
            </div>
          ))}
      </div>
      
      <div className="space-y-3">
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
