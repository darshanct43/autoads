import { useState, useEffect } from 'react';
import { firebaseService } from '@/services/firebaseService';
import { DriverProfile } from '@/types';

export default function DriverKYCApproval() {
  const [drivers, setDrivers] = useState<any[]>([]);

  useEffect(() => {
    // Need a service to fetch all drivers, or just fetch directly if needed
    const unsub = firebaseService.subscribeToDrivers(setDrivers);
    return unsub;
  }, []);

  const handleStatusChange = async (driverId: string, status: 'APPROVED' | 'REJECTED') => {
    await firebaseService.updateDriverProfile(driverId, {
      kycStatus: status,
      payoutEnabled: status === 'APPROVED',
      adminApproved: status === 'APPROVED'
    });
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
      <h2 className="text-xl font-black mb-6">Driver KYC Approval</h2>
      <div className="space-y-4">
        {drivers.map(driver => (
          <div key={driver.uid} className="p-4 border rounded-xl flex justify-between items-center">
            <div>
              <p className="font-bold">{driver.name}</p>
              <p className="text-sm text-slate-500">Status: {driver.kycStatus || 'PENDING'}</p>
            </div>
            {(!driver.kycStatus || driver.kycStatus === 'PENDING' || driver.kycStatus === 'UNDER_REVIEW') && (
              <div className="space-x-2">
                <button onClick={() => handleStatusChange(driver.uid, 'APPROVED')} className="px-4 py-2 bg-green-500 text-white rounded-lg font-bold">Approve</button>
                <button onClick={() => handleStatusChange(driver.uid, 'REJECTED')} className="px-4 py-2 bg-red-500 text-white rounded-lg font-bold">Reject</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
