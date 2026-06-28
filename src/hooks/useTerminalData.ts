import * as React from 'react';
import { firebaseService, AdCampaign } from '../services/firebaseService';
import { DriverRideMode, RidePreference } from '../components/smartAds/SmartAdEngine';

export interface TerminalData {
  terminalId: string;
  driverId: string;
  vehicleNumber: string;
  campaigns: AdCampaign[];
  currentMode: DriverRideMode;
  passengerPreference: RidePreference | null;
  online: boolean;
}

export function useTerminalData(terminalId: string | null) {
  const [data, setData] = React.useState<TerminalData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!terminalId) {
      setLoading(false);
      return;
    }

    let unsubTerminal: (() => void) | undefined;
    let unsubPreference: (() => void) | undefined;

    async function init() {
      if (!terminalId) return;
      try {
        console.log("[useTerminalData] Initializing for", terminalId);
        
        // 1. Get Terminal/Device Data
        const deviceData = await firebaseService.getDevice(terminalId) as any;
        const driverId = deviceData?.assignedDriverId || 'unknown';
        const vehicleNumber = deviceData?.vNo || 'unknown';

        // 2. Initial Campaigns (Static or Dynamic)
        const allCampaigns = await firebaseService.getCampaigns();
        const activeCampaigns = allCampaigns.filter((c: any) => 
          c.status === 'ACTIVE' || c.status === 'LIVE' || c.status === 'APPROVED'
        );

        // 3. Subscribe to Live Status & Commands
        unsubTerminal = firebaseService.subscribeToTerminalCommands(terminalId, (terminal: any) => {
          console.log("[useTerminalData] Terminal command update", terminal);
          setData(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              currentMode: (terminal.mode as DriverRideMode) || 'NORMAL'
            };
          });
        });

        // 4. Subscribe to Passenger Preferences
        unsubPreference = firebaseService.subscribeToSafeRideSession(terminalId, (session: any) => {
          console.log("[useTerminalData] Passenger preference update", session);
          setData(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              passengerPreference: session
            };
          });
        });

        setData({
          terminalId,
          driverId,
          vehicleNumber,
          campaigns: activeCampaigns,
          currentMode: 'NORMAL',
          passengerPreference: null,
          online: true
        });
      } catch (err) {
        console.error("[useTerminalData] Init failed", err);
      } finally {
        setLoading(false);
      }
    }

    init();

    return () => {
      if (typeof unsubTerminal === 'function') unsubTerminal();
      if (typeof unsubPreference === 'function') unsubPreference();
    };
  }, [terminalId]);

  return { data, loading };
}
