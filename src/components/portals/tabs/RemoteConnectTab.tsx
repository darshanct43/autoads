import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, RefreshCw, Monitor, Link as LinkIcon, MapPin, Cpu, Battery, Wifi, Server } from 'lucide-react';
import { AutoDevice } from '../../../types';
import { cn } from '../../../lib/utils';
import { firebaseService } from '../../../services/firebaseService';

export const RemoteConnectTab: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [devices, setDevices] = useState<AutoDevice[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const data = await firebaseService.getDevices();
      setDevices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const filteredDevices = devices.filter((d) => 
    d.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.autoNumber && d.autoNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (d.driverName && d.driverName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-8 p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black italic uppercase text-slate-900">Remote Connect Center</h2>
        <button onClick={loadDevices} className="p-2 bg-slate-900 text-amber-500 rounded-xl shadow-lg hover:scale-105 transition-all">
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="SEARCH TERMINAL OR DRIVER..."
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-amber-500"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[10px]">
            <thead>
              <tr className="text-slate-400 uppercase font-black tracking-widest border-b border-slate-100">
                <th className="p-3">Device/Terminal ID</th>
                <th className="p-3">Driver/Vehicle</th>
                <th className="p-3">Status/Health</th>
                <th className="p-3">Last Seen</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.map((d) => (
                <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="p-3 font-mono font-bold">{d.id}</td>
                  <td className="p-3">
                    <p className="font-bold">{d.driverName || 'N/A'}</p>
                    <p className="text-slate-500">{d.autoNumber || 'N/A'}</p>
                  </td>
                  <td className="p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("w-1.5 h-1.5 rounded-full", d.status === 'ONLINE' ? 'bg-green-500' : 'bg-red-500')} />
                      {d.status}
                    </div>
                    <div className="flex gap-2 text-slate-500">
                      <span className="flex items-center gap-0.5"><Battery size={9}/> {d.batteryLevel ?? 'N/A'}%</span>
                      <span className="flex items-center gap-0.5"><Wifi size={9}/> {d.signalStrength ?? 'N/A'}dB</span>
                    </div>
                  </td>
                  <td className="p-3 text-slate-500">{d.lastHeartbeat || 'Never'}</td>
                  <td className="p-3 text-right flex gap-3 justify-end">
                    <button className="text-slate-500 hover:text-amber-500" title="Device Details"><Monitor size={14}/></button>
                    <button 
                      disabled={!d.remoteUrl}
                      onClick={() => d.remoteUrl && window.open(d.remoteUrl, "_blank")}
                      className={cn("text-slate-500 hover:text-amber-500", !d.remoteUrl && "opacity-30")}
                      title={d.remoteUrl ? "Remote Connect" : "Remote Agent Not Installed"}
                    >
                      <LinkIcon size={14}/>
                    </button>
                    <button className="text-slate-500 hover:text-amber-500" title="View Location"><MapPin size={14}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
