import React from 'react';
import { 
  Building2, 
  MapPin, 
  Mail,
  User
} from 'lucide-react';

interface FranchiseSettingsProps {
  franchiseDoc: any;
  userProfile: any;
}

export default function FranchiseSettings({ franchiseDoc, userProfile }: FranchiseSettingsProps) {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Franchise Profile</h2>
        <p className="text-sm text-gray-500 mt-1">Review your franchise details and assigned territory.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100 flex items-center gap-4 bg-gray-50/50">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm border border-blue-200">
            <Building2 size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{franchiseDoc?.name || 'Franchise Partner'}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                 franchiseDoc?.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
               }`}>
                 <div className={`w-1.5 h-1.5 rounded-full ${franchiseDoc?.status === 'ACTIVE' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                 {franchiseDoc?.status || 'PENDING'}
               </span>
               <span className="text-xs text-gray-500 font-mono">ID: {franchiseDoc?.id || 'UNASSIGNED'}</span>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Operational Territory</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <MapPin size={16} />
                <span className="text-xs font-semibold uppercase tracking-wider">Territory ID</span>
              </div>
              <p className="text-sm font-bold text-gray-900">{franchiseDoc?.territoryId || 'T-UNASSIGNED'}</p>
            </div>
            
            <div className="space-y-1.5">
               <div className="flex items-center gap-2 text-gray-500 mb-1">
                 <MapPin size={16} />
                 <span className="text-xs font-semibold uppercase tracking-wider">City</span>
               </div>
               <p className="text-sm font-bold text-gray-900">{franchiseDoc?.cityName || 'Unassigned'}</p>
            </div>

            <div className="space-y-1.5">
               <div className="flex items-center gap-2 text-gray-500 mb-1">
                 <MapPin size={16} />
                 <span className="text-xs font-semibold uppercase tracking-wider">State</span>
               </div>
               <p className="text-sm font-bold text-gray-900">{franchiseDoc?.stateId || 'Unassigned'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Your Profile</h4>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <User size={16} />
                <span className="text-xs font-semibold uppercase tracking-wider">Name</span>
              </div>
              <p className="text-sm font-bold text-gray-900">{userProfile?.name || 'Unset'}</p>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Mail size={16} />
                <span className="text-xs font-semibold uppercase tracking-wider">Contact Email</span>
              </div>
              <p className="text-sm font-bold text-gray-900">{userProfile?.email || 'Unset'}</p>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-100">
             <p className="text-xs text-gray-500 leading-relaxed max-w-2xl">
               To make changes to the operating territory, network capabilities, or fundamental franchise data, please submit an escalation ticket to Headquarters through the Support module.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
