import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, RefreshCw, Monitor, Link as LinkIcon, MapPin, Cpu, Battery, Wifi, Server, Plus, X, Laptop, ShieldCheck } from 'lucide-react';
import { AutoDevice } from '../../../types';
import { cn } from '../../../lib/utils';
import { firebaseService } from '../../../services/firebaseService';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export const RemoteConnectTab: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [devices, setDevices] = useState<AutoDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    terminalId: '',
    remoteTool: 'TeamViewer',
    remoteId: '',
    password: '',
    driverName: '',
    notes: ''
  });

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

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'remoteConnections'), {
        ...formData,
        status: 'Offline',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setIsModalOpen(false);
      setFormData({
        terminalId: '',
        remoteTool: 'TeamViewer',
        remoteId: '',
        password: '',
        driverName: '',
        notes: ''
      });
      loadDevices();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
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
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-500 shadow-lg transition-all"
          >
            <Plus size={16} /> Manual Connection
          </button>
          <button onClick={loadDevices} className="p-2.5 bg-slate-900 text-amber-500 rounded-xl shadow-lg hover:scale-105 transition-all">
            <RefreshCw size={16} />
          </button>
        </div>
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
                      <span className={cn("w-1.5 h-1.5 rounded-full", d.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500')} />
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

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg relative z-[5010] shadow-2xl border border-slate-100"
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute right-8 top-8 text-slate-400 hover:text-slate-900 transition-colors"
              >
                <X size={24} />
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <Laptop size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase text-slate-900 tracking-tight">Manual Remote Entry</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Direct terminal control configuration</p>
                </div>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Terminal ID</label>
                    <input
                      required
                      placeholder="e.g. TRM-001"
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-black focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                      value={formData.terminalId}
                      onChange={e => setFormData({...formData, terminalId: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Remote Tool</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-black focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                      value={formData.remoteTool}
                      onChange={e => setFormData({...formData, remoteTool: e.target.value})}
                    >
                      <option value="TeamViewer">TeamViewer</option>
                      <option value="AnyDesk">AnyDesk</option>
                      <option value="RustDesk">RustDesk</option>
                      <option value="Custom">Other Agent</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Partner ID</label>
                    <input
                      required
                      placeholder="9-digit ID"
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-black focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                      value={formData.remoteId}
                      onChange={e => setFormData({...formData, remoteId: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Password</label>
                    <input
                      placeholder="Secure Key"
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-black focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Driver Reference</label>
                  <input
                    placeholder="Subject driver name..."
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-black focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                    value={formData.driverName}
                    onChange={e => setFormData({...formData, driverName: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Admin Notes</label>
                  <textarea
                    placeholder="Observation notes..."
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-black h-24 resize-none outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-5 bg-slate-900 text-emerald-500 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-slate-900/10 flex items-center justify-center gap-3 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                >
                  <ShieldCheck size={18} />
                  {isSubmitting ? "ESTABLISHING LINK..." : "AUTHORIZED CONNECTION"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
