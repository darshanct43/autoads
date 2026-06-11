import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  UserCheck, 
  Tablet,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  Car
} from 'lucide-react';
import { motion } from 'motion/react';

interface FranchiseDriversProps {
  drivers: any[];
}

export default function FranchiseDrivers({ drivers }: FranchiseDriversProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDrivers = drivers.filter(d => 
    d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.id.includes(searchTerm) ||
    d.phone?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Driver Network</h2>
          <p className="text-sm text-gray-500 mt-1">Manage and monitor verified driver fleet.</p>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Search by name, ID or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 pl-10 pr-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
        <button className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all">
          <Filter size={18} />
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-gray-500 uppercase">Driver & ID</th>
                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-gray-500 uppercase">Verification</th>
                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-gray-500 uppercase">Device</th>
                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-gray-500 uppercase">Earnings</th>
                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-gray-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    <Users size={32} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-sm font-medium text-gray-900">No drivers found</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {searchTerm ? 'Try adjusting your search filters' : 'No drivers are registered in this territory'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDrivers.map((drv) => (
                  <tr key={drv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                          <Car size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{drv.name || 'Unnamed Driver'}</p>
                          <p className="text-xs text-gray-500 font-mono mt-0.5">
                            DRV-{drv.id.substring(0, 6).toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        drv.kycStatus === 'APPROVED' ? 'bg-green-100 text-green-800' :
                        drv.kycStatus === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {drv.kycStatus === 'APPROVED' ? <CheckCircle size={12} /> : 
                         drv.kycStatus === 'REJECTED' ? <XCircle size={12} /> : <Clock size={12} />}
                        {drv.kycStatus || 'PENDING'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                         <div className={`w-2 h-2 rounded-full ${drv.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                         <span className="text-xs font-medium text-gray-700">{drv.status || 'OFFLINE'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       <div className="flex items-center gap-1.5 text-gray-600">
                          <Tablet size={14} />
                          <span className="text-xs font-medium text-gray-900">{drv.deviceId || 'Unassigned'}</span>
                       </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-semibold text-gray-900">₹{(drv.earnings || 0).toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button className="p-2 text-gray-400 hover:text-gray-900 rounded-md hover:bg-gray-100 transition-colors">
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
