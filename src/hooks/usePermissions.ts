import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function usePermissions() {
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setRole(data.role);
          setPermissions(data.permissions || {});
        }
      } catch (err) {
        console.error("Failed to fetch permissions:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPermissions();
  }, []);

  const hasPermission = (permKey: string) => {
    if (role === 'SUPPORT_MANAGER' || role === 'ADMIN') return true;
    if (role === 'SUPPORT_TEAM') {
      if (!permissions || Object.keys(permissions).length === 0) {
        const defaults: Record<string, boolean> = {
          viewTickets: true,
          replyTickets: true,
          viewDrivers: true,
          approveDriverKyc: true,
          viewCampaigns: true,
          viewDevices: true,
          managePlans: false,
          approveCampaigns: false,
          approveDevices: false,
          viewPayments: false,
          approveWithdrawals: false,
          manageSupportTeam: false,
          systemSettings: false,
          removeTestData: false,
          purgeNetworkData: false
        };
        return !!defaults[permKey];
      }
      return !!permissions[permKey];
    }
    return true; // Default true for legacy roles
  };

  return { hasPermission, isLoading };
}
