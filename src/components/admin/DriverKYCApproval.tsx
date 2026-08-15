import { useState, useEffect } from 'react';
import { firebaseService } from '@/services/firebaseService';
import { DriverProfile } from '@/types';

export default function DriverKYCApproval() {
  const [drivers, setDrivers] = useState<any[]>([]);

  useEffect(() => {
    // Admin/Support view should see all drivers (isHQ: true)
    const unsub = firebaseService.subscribeToDrivers(setDrivers, undefined, true);
    return unsub;
  }, []);

  const handleStatusChange = async (driverId: string, status: 'APPROVED' | 'REJECTED') => {
    await firebaseService.updateDriverProfile(driverId, {
      kycStatus: status,
      payoutEnabled: status === 'APPROVED',
      adminApproved: status === 'APPROVED',
      documentStatus: status === 'APPROVED' ? 'APPROVED' : 'REJECTED',
      supportApproval: status === 'APPROVED' ? 'APPROVED' : 'REJECTED'
    });
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
      <h2 className="text-xl font-black mb-6">Driver KYC Approval</h2>
      <div className="space-y-4">
        {drivers.map(driver => (
          <div key={driver.uid} className="p-6 border border-slate-200 rounded-3xl flex flex-col gap-6 bg-slate-50">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-lg font-black uppercase text-slate-900">{driver.name}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Status: {driver.kycStatus || 'PENDING'}</p>
              </div>
              {(!driver.kycStatus || driver.kycStatus === 'PENDING' || driver.kycStatus === 'UNDER_REVIEW') && (
                <div className="flex gap-2">
                  <button onClick={() => handleStatusChange(driver.uid, 'APPROVED')} className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-emerald-500/20">Approve</button>
                  <button onClick={() => handleStatusChange(driver.uid, 'REJECTED')} className="px-5 py-2.5 bg-rose-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 transition-all active:scale-95 shadow-lg shadow-rose-500/20">Reject</button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Aadhaar', url: driver.aadharPhoto || driver.documents?.aadhaar },
                { label: 'Driving License', url: driver.dlPhoto || driver.documents?.drivingLicense },
                { label: 'Selfie', url: driver.selfiePhoto || driver.documents?.selfie }
              ].map(doc => (
                <div key={doc.label} className="space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">{doc.label}</p>
                  <div className="aspect-video bg-white rounded-2xl border border-slate-200 overflow-hidden relative group">
                    {doc.url ? (
                      <img src={doc.url} alt={doc.label} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[8px] font-black text-slate-300 uppercase tracking-widest bg-slate-50 italic">
                        Not Uploaded
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
