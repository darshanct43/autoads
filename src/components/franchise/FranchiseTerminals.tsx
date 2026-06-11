import React, { useState } from 'react';
import { 
  Tablet, 
  Search, 
  Settings, 
  Battery, 
  Wifi, 
  Zap,
  Monitor,
  MoreVertical
} from 'lucide-react';
import { motion } from 'motion/react';

interface FranchiseTerminalsProps {
  terminals: any[];
}

export default function FranchiseTerminals({ terminals }: FranchiseTerminalsProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTerminals = terminals.filter(t => 
    t.deviceId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.id.includes(searchTerm) ||
    t.driverName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Hardware Inventory</h2>
          <p className="text-sm text-gray-500 mt-1">Monitor and manage AD-Terminals in your territory.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg text-sm hover:bg-gray-50 transition-colors shadow-sm">
             Audit Hardware
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Total Terminals</p>
            <p className="text-2xl font-bold text-gray-900">{terminals.length}</p>
         </div>
         <div className="bg-green-50 border border-green-100 p-5 rounded-xl shadow-sm">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-widest mb-1">Online</p>
            <p className="text-2xl font-bold text-green-600">
               {terminals.filter(t => t.status === 'ACTIVE' || t.status === 'ONLINE').length}
            </p>
         </div>
         <div className="bg-gray-50 border border-gray-200 p-5 rounded-xl shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Offline / Service</p>
            <p className="text-2xl font-bold text-gray-700">
               {terminals.filter(t => t.status !== 'ACTIVE' && t.status !== 'ONLINE').length}
            </p>
         </div>
      </div>

      <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Search by terminal ID or driver name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 pl-10 pr-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-gray-500 uppercase">Terminal ID</th>
                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-gray-500 uppercase">Telemetry</th>
                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-gray-500 uppercase">Driver Linked</th>
                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-gray-500 uppercase text-right">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTerminals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-500">
                    <Tablet size={32} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-sm font-medium text-gray-900">No terminals found</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {searchTerm ? 'Adjust search parameters' : 'No hardware nodes registered to this franchise'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTerminals.map((node) => (
                  <tr key={node.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                          <Tablet size={18} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{node.deviceId || node.id}</p>
                          <p className="text-xs text-gray-500 mt-0.5">v{node.appVersion || '1.0.0'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                         node.status === 'ACTIVE' || node.status === 'ONLINE' ? 'bg-green-100 text-green-800' : 
                         'bg-gray-100 text-gray-700'
                       }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${node.status === 'ACTIVE' || node.status === 'ONLINE' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                          {node.status || 'OFFLINE'}
                       </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       <div className="flex items-center gap-3 text-gray-500">
                          <div className="flex items-center gap-1 text-xs">
                             <Battery size={14} className={node.batteryLevel < 20 ? 'text-red-500' : 'text-green-500'} />
                             <span className="font-medium">{node.batteryLevel || 100}%</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                             <Wifi size={14} className="text-blue-500" />
                             <span className="font-medium">{node.signalStrength || '-dBm'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                             <Zap size={14} className={node.chargingStatus === 'charging' ? 'text-yellow-500' : 'text-gray-400'} />
                             <span className="font-medium text-gray-400">{node.chargingStatus === 'charging' ? 'CHG' : 'BATT'}</span>
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       <div className="text-sm font-semibold text-gray-900">
                          {node.driverName || 'UNASSIGNED'}
                       </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                       <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 bg-white border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
                             <Monitor size={16} />
                          </button>
                          <button className="p-2 bg-white border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
                             <Settings size={16} />
                          </button>
                       </div>
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
