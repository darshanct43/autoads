import { useState } from 'react';
import { motion } from 'motion/react';
import { CloudUpload, User, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { storageService } from '@/services/storageService';
import { firebaseService } from '@/services/firebaseService';
import { cn } from '@/lib/utils';
import { DriverProfile, DriverDocument } from '@/types';

interface DriverKYCProps {
  driverId: string;
  onSuccess: () => void;
}

export default function DriverKYC({ driverId, onSuccess }: DriverKYCProps) {
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
        kycStatus: 'UNDER_REVIEW',
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
    <div className="p-6 bg-white rounded-[2rem] shadow-xl border border-slate-100 max-w-2xl mx-auto space-y-8">
      <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">Driver KYC Verification</h2>
      
      <div className="space-y-4">
          <p className="text-sm font-bold text-slate-500">Document Uploads</p>
          {(['aadhaar', 'drivingLicense', 'selfie'] as const).map(doc => (
            <div key={doc} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
               <span className="font-bold text-slate-700 capitalize">{doc.replace(/([A-Z])/g, ' $1')}</span>
               <input type="file" onChange={(e) => e.target.files && handleUpload(doc, e.target.files[0])} className="hidden" id={doc} />
               <label htmlFor={doc} className={cn("p-3 rounded-xl cursor-pointer", documents[doc] ? "bg-green-100 text-green-600" : "bg-slate-200")}>
                  <CloudUpload size={20} />
               </label>
            </div>
          ))}
      </div>
      
      <div className="space-y-4">
          <input placeholder="Enter UPI ID" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={upiId} onChange={e => setUpiId(e.target.value)} />
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-2 text-rose-800 font-bold text-xs uppercase tracking-tight">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <button onClick={handleSubmit} disabled={loading} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black">{loading ? 'Saving...' : 'Submit for Review'}</button>
      </div>
    </div>
  );
}
