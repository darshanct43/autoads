import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Settings,
  MoreVertical,
  User
} from 'lucide-react';
import { motion } from 'motion/react';

interface FranchisePersonnelProps {
  staff: any[];
  onInvite: (data: any) => void;
  onUpdateStatus: (id: string, status: any) => void;
  isOwner: boolean;
}

export default function FranchisePersonnel({ staff, onInvite, onUpdateStatus, isOwner }: FranchisePersonnelProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    specialization: 'OPERATIONS_STAFF' as const
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onInvite(formData);
    setShowInviteModal(false);
    setFormData({ name: '', email: '', specialization: 'OPERATIONS_STAFF' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Personnel Center</h2>
          <p className="text-sm text-gray-500 mt-1">Manage operational staff and internal roles.</p>
        </div>
        <button 
          onClick={() => setShowInviteModal(true)}
          disabled={!isOwner}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <UserPlus size={16} />
          Invite Staff
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
         {staff.length === 0 ? (
           <div className="py-20 text-center">
              <Users size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-900">No staff members enlisted.</p>
              <p className="text-xs text-gray-500 mt-1">Invite personnel to delegate franchise operations.</p>
           </div>
         ) : (
           <div className="divide-y divide-gray-200">
             {staff.map((member) => (
                <div key={member.id} className="p-5 flex items-center justify-between group hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                      <User size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">{member.name || 'Staff Member'}</h4>
                      <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <Mail size={12} /> {member.email}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-md border border-gray-200">
                          {member.specialization?.replace('_', ' ') || 'GENERAL STAFF'}
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-md border ${
                          member.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {member.status || 'PENDING'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"><Settings size={18} /></button>
                    <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"><MoreVertical size={18} /></button>
                  </div>
                </div>
             ))}
           </div>
         )}
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
           <motion.div 
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-2xl"
           >
              <h3 className="text-xl font-bold text-gray-900 mb-6">Invite Personnel</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Full Name</label>
                  <input 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-4 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Work Email</label>
                  <input 
                    required
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-4 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Role / Specialization</label>
                  <select 
                    value={formData.specialization}
                    onChange={(e: any) => setFormData({...formData, specialization: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-4 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  >
                    <option value="OPERATIONS_STAFF">Operations Management</option>
                    <option value="DRIVER_VERIFICATION_STAFF">Driver Verification</option>
                    <option value="SUPPORT_STAFF">Support Associate</option>
                    <option value="FINANCE_STAFF">Finance</option>
                  </select>
                </div>
                <div className="flex gap-3 mt-6 pt-2">
                   <button 
                     type="button" 
                     onClick={() => setShowInviteModal(false)}
                     className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                   >
                     Cancel
                   </button>
                   <button 
                     type="submit"
                     className="flex-1 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                   >
                     Send Invite
                   </button>
                </div>
              </form>
           </motion.div>
        </div>
      )}
    </div>
  );
}
