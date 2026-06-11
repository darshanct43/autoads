import React from 'react';
import { User } from 'lucide-react';
import { auth } from '@/lib/firebase';

interface SupportSettingsProps {
  userProfile: any;
}

export default function SupportSettings({ userProfile }: SupportSettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 tracking-tight leading-none">Support Settings</h2>
        <p className="text-sm font-medium text-gray-500 mt-2 font-sans">Role Configuration & Account Info</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-8 max-w-2xl shadow-sm">
         <div className="flex items-center gap-4 border-b border-gray-100 pb-8 mb-8">
            <div className="w-16 h-16 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center text-gray-400">
               <User size={32} />
            </div>
            <div>
               <h3 className="text-lg font-bold text-gray-900 leading-tight font-sans">{userProfile?.name || 'Support Agent'}</h3>
               <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1 font-sans">Role: {userProfile?.role || 'SUPPORT_OPERATOR'}</p>
            </div>
         </div>

         <div className="space-y-6">
            <div>
               <p className="text-sm font-semibold text-gray-700 mb-2">Access Privileges</p>
               <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className="text-sm font-semibold text-gray-800">Support Desk Operator Workstation</p>
               </div>
            </div>
            <div>
               <p className="text-sm font-semibold text-gray-700 mb-2">User UID</p>
               <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className="text-sm font-mono text-gray-600">{auth.currentUser?.uid || 'Unknown'}</p>
               </div>
            </div>
            <div>
               <p className="text-sm font-semibold text-gray-700 mb-2">Email Address</p>
               <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className="text-sm font-mono text-gray-600">{auth.currentUser?.email || 'Unknown'}</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
