import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, RefreshCw, AlertTriangle, Battery, Cpu, Wifi, Link, MapPin, Trash2, LayoutGrid, List } from 'lucide-react';
import { AutoDevice } from '../../../types';
import { cn } from '../../../lib/utils';
import { firebaseService } from '../../../services/firebaseService';

export const DeviceHealthCenterTab: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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
    <div className="space-y-4 pb-8 p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black italic uppercase text-slate-900 leading-tight">Device Health Center</h2>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="SEARCH..."
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-amber-500"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={() => setViewMode('grid')} className={cn("p-2 rounded-xl", viewMode === 'grid' ? "bg-slate-200" : "bg-slate-50")}><LayoutGrid size={16}/></button>
          <button onClick={() => setViewMode('list')} className={cn("p-2 rounded-xl", viewMode === 'list' ? "bg-slate-200" : "bg-slate-50")}><List size={16}/></button>
          <button onClick={loadDevices} className="p-2 bg-slate-900 text-amber-500 rounded-xl shadow-lg hover:scale-105 transition-all">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className={cn("grid gap-2", viewMode === 'grid' ? "grid-cols-2 md:grid-cols-4 xl:grid-cols-6" : "grid-cols-1")}>
        {filteredDevices.map((d) => (
          <motion.div
            key={d.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn("bg-white p-2 rounded-xl border border-slate-100 shadow-sm transition-all text-[9px]", viewMode === 'grid' ? "h-[120px] flex flex-col justify-between" : "flex items-center gap-4 h-[60px]")}
          >
            <div className="flex justify-between items-start">
              <h3 className="font-mono font-bold truncate">ID: {d.id}</h3>
              <div className={cn("w-1.5 h-1.5 rounded-full", d.status === 'ONLINE' ? 'bg-green-500' : 'bg-red-500')} />
            </div>
            
            <div className="space-y-0.5 text-slate-500">
              <p className="truncate">Driver: <span className="text-slate-900">{d.driverName || 'N/A'}</span></p>
              <p className="truncate">Auto: <span className="text-slate-900">{d.autoNumber || 'N/A'}</span></p>
              <div className="flex gap-2">
                <span className="flex items-center gap-0.5"><Battery size={9}/> {d.batteryLevel ?? 'N/A'}%</span>
                <span className="flex items-center gap-0.5"><Wifi size={9}/> {d.signalStrength ?? 'N/A'}</span>
              </div>
            </div>
            
            <div className="border-t pt-1 flex justify-between gap-1">
              <Link size={12} className="cursor-pointer hover:text-amber-600"/>
              <MapPin size={12} className="cursor-pointer hover:text-amber-600"/>
              <Wifi size={12} className="cursor-pointer hover:text-amber-600"/>
              <Trash2 size={12} className="cursor-pointer hover:text-red-600"/>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
