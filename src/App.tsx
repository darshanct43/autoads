/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { UserRole } from './types';
import Auth from './components/Auth';
import AdminPortal from './components/portals/AdminPortal';
import DriverPortal from './components/portals/DriverPortal';
import CustomerPortal from './components/portals/CustomerPortal';
import StaffPortal from './components/portals/StaffPortal';
import BootAnimation from './components/common/BootAnimation';
import Onboarding from './components/common/Onboarding';
import ChatBot from './components/common/ChatBot';
import { AnimatePresence, motion } from 'motion/react';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function App() {
  const [systemState, setSystemState] = useState<'BOOT' | 'ONBOARDING' | 'AUTH' | 'PORTAL'>('BOOT');
  const [role, setRole] = useState<UserRole | null>(null);

  const handleLogin = (selectedRole: UserRole) => {
    setRole(selectedRole);
    setSystemState('PORTAL');
  };

  const handleLogout = () => {
    setRole(null);
    setSystemState('AUTH');
  };

  return (
    <div className="min-h-screen font-sans selection:bg-amber-500/30 overflow-x-hidden">
      <AnimatePresence mode="wait">
        {systemState === 'BOOT' && (
          <BootAnimation onComplete={() => setSystemState('ONBOARDING')} />
        )}

        {systemState === 'ONBOARDING' && (
          <Onboarding onComplete={() => setSystemState('AUTH')} />
        )}

        {systemState === 'AUTH' && (
          <motion.div
            key="auth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Auth onLogin={handleLogin} />
          </motion.div>
        )}

        {systemState === 'PORTAL' && role && (
          <motion.div
            key="portal"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="relative"
          >
            {/* Session Management */}
            <button
               onClick={handleLogout}
               className={cn(
                "fixed top-4 right-4 z-[70] p-2.5 rounded-xl transition-all group border shadow-sm",
                role === 'ADMIN' ? "bg-slate-900 border-slate-700 text-slate-400 hover:text-white" : "bg-white border-slate-200 text-slate-400 hover:text-slate-900"
               )}
               title="End Session"
            >
               <LogOut size={18} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>

            {role === 'ADMIN' && <AdminPortal />}
            {role === 'DRIVER' && <DriverPortal />}
            {role === 'CUSTOMER' && <CustomerPortal />}
            {role === 'STAFF' && <StaffPortal />}
            
            {/* Global Features */}
            {(role === 'CUSTOMER' || role === 'DRIVER') && <ChatBot />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
