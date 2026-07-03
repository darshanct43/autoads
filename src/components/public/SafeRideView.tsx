import React, { useState, useEffect } from 'react';
import { firebaseService } from '../../services/firebaseService';
import { Shield, Flag, Baby, Users, School, VolumeX } from 'lucide-react';

interface SafeRideViewProps {
  terminalId: string;
}

export default function SafeRideView({ terminalId }: SafeRideViewProps) {
  const [deviceData, setDeviceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);

  const applyMode = async () => {
    if (selectedMode) {
      try {
        const now = new Date();
        const expires = new Date(now.getTime() + 6 * 60 * 60 * 1000); // 6 hours
        
        let payload: any = {
          rideId: `ride_${Date.now()}`,
          deviceId: terminalId,
          childrenPresent: false,
          familyMode: false,
          muteAds: false,
          blockedCategories: [] as string[],
          nightMode: false,
          createdAt: now.toISOString(),
          expiresAt: expires.toISOString(),
          driverOverrideMode: 'NORMAL'
        };

        if (selectedMode === 'KIDS') {
          payload.childrenPresent = true;
          payload.familyMode = true;
          payload.blockedCategories = ['alcohol', 'betting', 'gambling', 'political'];
          payload.driverOverrideMode = 'CHILDREN';
        } else if (selectedMode === 'SCHOOL') {
          payload.childrenPresent = true;
          payload.familyMode = true;
          payload.blockedCategories = ['alcohol', 'gambling', 'political', 'dating', 'adult'];
          payload.driverOverrideMode = 'SCHOOL_TRIP';
        } else if (selectedMode === 'FAMILY') {
          payload.familyMode = true;
          payload.blockedCategories = ['alcohol', 'political'];
          payload.driverOverrideMode = 'FAMILY';
        } else if (selectedMode === 'QUIET') {
          payload.muteAds = true;
          payload.driverOverrideMode = 'SILENT';
        } else if (selectedMode === 'NIGHT') {
          payload.nightMode = true;
          payload.muteAds = true;
          payload.driverOverrideMode = 'SILENT';
        }

        await firebaseService.saveRidePreference(payload);
        alert(`Mode ${selectedMode} applied!`);
      } catch (err) {
        console.error("Error applying mode:", err);
        alert("Error applying mode. Please try again.");
      }
    }
  };

  useEffect(() => {
    console.log("SafeRideView: Mounted with terminalId:", terminalId);
    async function loadData() {
      setLoading(true);
      try {
        console.log("SafeRideView: Loading data");
        const terminal = await firebaseService.getTerminal(terminalId);
        setDeviceData(terminal || { id: terminalId, name: `Terminal ${terminalId}` });
      } catch (err) {
        console.error("SafeRideView: Error", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [terminalId]);

  if (loading) return <div className="text-white">Loading...</div>;
  if (!deviceData) return <div className="text-white">Ride Not Found (Terminal: {terminalId})</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <h1 className="text-2xl font-bold mb-4">Ride Viewer</h1>
      <p className="mb-6">Terminal: {deviceData.id}</p>
      <div className='grid grid-cols-2 gap-3'>
            <button onClick={() => setSelectedMode('BELOW 18')} className={`py-4 rounded-2xl ${selectedMode === 'BELOW 18' ? 'bg-amber-600' : 'bg-slate-800'}`}>BELOW 18 ADS</button>
            <button onClick={() => setSelectedMode('SCHOOL')} className={`py-4 rounded-2xl ${selectedMode === 'SCHOOL' ? 'bg-amber-600' : 'bg-slate-800'}`}>SCHOOL TRIP</button>
            <button onClick={() => setSelectedMode('FAMILY')} className={`py-4 rounded-2xl ${selectedMode === 'FAMILY' ? 'bg-amber-600' : 'bg-slate-800'}`}>FAMILY RIDE</button>
            <button onClick={() => setSelectedMode('QUIET')} className={`py-4 rounded-2xl ${selectedMode === 'QUIET' ? 'bg-amber-600' : 'bg-slate-800'}`}>QUIET RIDE</button>
      </div>
      <button 
        onClick={applyMode} 
        disabled={!selectedMode}
        className="w-full mt-6 py-4 bg-emerald-600 rounded-2xl font-bold uppercase disabled:opacity-50"
      >
        Apply
      </button>
    </div>
  );
}
