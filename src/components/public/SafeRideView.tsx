import React, { useState, useEffect } from 'react';
import { firebaseService } from '../../services/firebaseService';
import { Shield, Flag, Baby, Users, School, VolumeX } from 'lucide-react';

interface SafeRideViewProps {
  terminalId: string;
}

export default function SafeRideView({ terminalId }: SafeRideViewProps) {
  const [deviceData, setDeviceData] = useState<any>(null);
  const [driverData, setDriverData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pendingMode, setPendingMode] = useState<'KIDS' | 'SCHOOL' | 'FAMILY' | 'QUIET' | null>(null);

  const handleSelectCabinMode = async (mode: 'KIDS' | 'SCHOOL' | 'FAMILY' | 'QUIET') => {
    if (!deviceData) return;
    setSubmitting(true);
    setPendingMode(null);

    const now = new Date();
    const expires = new Date(now.getTime() + 15 * 60 * 1000);

    let payload: any = {
      rideId: `ride_${Date.now()}`,
      deviceId: terminalId,
      childrenPresent: mode === 'KIDS' || mode === 'SCHOOL',
      familyMode: mode === 'KIDS' || mode === 'SCHOOL' || mode === 'FAMILY',
      muteAds: mode === 'QUIET',
      blockedCategories: mode === 'KIDS' ? ['alcohol', 'betting', 'gambling', 'political'] :
                         mode === 'SCHOOL' ? ['alcohol', 'gambling', 'political', 'dating', 'adult'] :
                         mode === 'FAMILY' ? ['alcohol', 'political'] : [],
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      driverOverrideMode: mode === 'KIDS' ? 'CHILDREN' : mode === 'SCHOOL' ? 'SCHOOL_TRIP' : mode === 'FAMILY' ? 'FAMILY' : 'SILENT'
    };

    try {
      await firebaseService.saveRidePreference(payload);
      alert(`${mode} mode activated`);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        let device = await firebaseService.getDevice(terminalId);
        if (!device) {
          device = await firebaseService.getTerminal(terminalId);
        }

        setDeviceData(device);
        if (device && (device as any).driverId) {
            const driver = await firebaseService.getDriverProfile((device as any).driverId);
            setDriverData(driver);
        }
      } catch (err) {
        console.error("Failed to load device info", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [terminalId]);

  if (loading) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading...</div>;
  if (!deviceData) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 text-center">Vehicle information unavailable.</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 font-sans max-w-md mx-auto">
        <header className="flex items-center justify-between mb-6">
            <h1 className="text-sm font-black text-amber-500 uppercase tracking-widest">
                AUTOADS VERIFIED
            </h1>
            <Shield size={20} className="text-amber-500" />
        </header>

        {/* Verification */}
        <section className="bg-slate-900 p-5 rounded-3xl mb-6 border border-slate-800 flex items-center gap-3">
                <Flag size={20} className='text-emerald-500'/>
                <span className='font-bold text-sm'>Ride Verified</span>
        </section>

        {/* Actions */}
        <div className='grid grid-cols-2 gap-3 mb-6'>
            <button 
                disabled={submitting}
                onClick={() => setPendingMode('KIDS')}
                className='py-4 bg-slate-800 text-white rounded-2xl font-bold uppercase tracking-widest text-[11px] flex flex-col items-center justify-center gap-2 transition-all hover:bg-slate-700'>
                <Baby size={20} /> KIDS MODE
            </button>
            <button 
                disabled={submitting}
                onClick={() => setPendingMode('SCHOOL')}
                className='py-4 bg-slate-800 text-white rounded-2xl font-bold uppercase tracking-widest text-[11px] flex flex-col items-center justify-center gap-2 transition-all hover:bg-slate-700'>
                <School size={20} /> SCHOOL TRIP
            </button>
            <button 
                disabled={submitting}
                onClick={() => setPendingMode('FAMILY')}
                className='py-4 bg-slate-800 text-white rounded-2xl font-bold uppercase tracking-widest text-[11px] flex flex-col items-center justify-center gap-2 transition-all hover:bg-slate-700'>
                <Users size={20} /> FAMILY SAFE
            </button>
            <button 
                disabled={submitting}
                onClick={() => setPendingMode('QUIET')}
                className='py-4 bg-slate-800 text-white rounded-2xl font-bold uppercase tracking-widest text-[11px] flex flex-col items-center justify-center gap-2 transition-all hover:bg-slate-700'>
                <VolumeX size={20} /> QUIET RIDE
            </button>
        </div>

        {/* Confirmation Modal */}
        {pendingMode && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm text-center">
              <h2 className="text-lg font-black text-white uppercase tracking-widest mb-2">Activate {pendingMode === 'KIDS' ? 'Children' : pendingMode === 'SCHOOL' ? 'School Trip' : pendingMode === 'FAMILY' ? 'Family Safe' : 'Quiet'} Ride</h2>
              <p className="text-slate-400 text-xs mb-6">This terminal will switch to {pendingMode === 'KIDS' ? 'Children' : pendingMode === 'SCHOOL' ? 'School Trip' : pendingMode === 'FAMILY' ? 'Family Safe' : 'Quiet'} mode for this trip.</p>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setPendingMode(null)}
                  className="py-3 bg-slate-800 text-white rounded-2xl font-bold text-xs uppercase tracking-widest">
                  Cancel
                </button>
                <button 
                  onClick={() => handleSelectCabinMode(pendingMode)}
                  className="py-3 bg-amber-500 text-slate-950 rounded-2xl font-bold text-xs uppercase tracking-widest">
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
