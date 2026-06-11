
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, Edit2, Link as LinkIcon, Laptop } from 'lucide-react';
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export default function RemoteConnectCenter() {
  const [connections, setConnections] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ terminalId: '', deviceId: '', driverName: '', vehicleNumber: '', phoneNumber: '', remoteTool: 'TeamViewer', remoteId: '', password: '', status: 'Offline', notes: '' });

  useEffect(() => {
    const q = query(collection(db, 'remoteConnections'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => setConnections(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'remoteConnections'), { ...formData, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    setIsModalOpen(false);
    setFormData({ terminalId: '', deviceId: '', driverName: '', vehicleNumber: '', phoneNumber: '', remoteTool: 'TeamViewer', remoteId: '', password: '', status: 'Offline', notes: '' });
  };

  return (
    <div className="bg-[#040609] p-6 rounded-3xl border border-white/5 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-black text-white italic tracking-tight">Remote Connect Center</h2>
        <button onClick={() => setIsModalOpen(true)} className="px-5 py-2.5 bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-500 flex items-center gap-2 transition-all">
            <Plus size={16}/> Manual Entry
        </button>
      </div>
      
      <div className="border border-white/10 rounded-2xl overflow-hidden bg-slate-900/50">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] font-mono text-slate-300">
                <thead className="bg-white/5">
                    <tr>
                        <th className="py-4 px-4 uppercase text-slate-500">Terminal & Driver</th>
                        <th className="py-4 px-4 uppercase text-slate-500">Tool / ID</th>
                        <th className="py-4 px-4 uppercase text-slate-500">Status</th>
                        <th className="py-4 px-4 uppercase text-slate-500 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {connections.map(c => (
                        <tr key={c.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-4 px-4">
                                <div className="font-bold text-white">{c.terminalId}</div>
                                <div className="text-slate-500">{c.driverName || 'No Driver'}</div>
                            </td>
                            <td className="py-4 px-4">
                                <div className="text-white">{c.remoteTool}</div>
                                <div className="text-indigo-400">{c.remoteId}</div>
                            </td>
                            <td className="py-4 px-4">
                                <span className={c.status === 'Online' ? 'text-emerald-400 font-bold' : 'text-slate-600'}>
                                   {c.status}
                                </span>
                            </td>
                            <td className="py-4 px-4 text-right flex items-center justify-end gap-3">
                               <button onClick={() => updateDoc(doc(db, 'remoteConnections', c.id), { status: 'Online' })} className="text-indigo-400 hover:text-indigo-300">Connect</button>
                               <button onClick={() => deleteDoc(doc(db, 'remoteConnections', c.id))} className="text-red-500 hover:text-red-400"><Trash2 size={14}/></button>
                            </td>
                        </tr>
                    ))}
                    {connections.length === 0 && (
                        <tr>
                            <td colSpan={4} className="py-10 text-center text-slate-500 italic">No remote connections found.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

       {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <form onSubmit={handleSubmit} className="bg-slate-900 p-6 rounded-xl border border-white/10 space-y-4 w-full max-w-lg">
                <h3 className="text-white font-bold mb-4">Manual Remote Entry</h3>
                <input type="text" placeholder="Terminal ID *" className="w-full bg-slate-800 p-2 text-white rounded" required onChange={e => setFormData({...formData, terminalId: e.target.value})} />
                <input type="text" placeholder="Remote ID *" className="w-full bg-slate-800 p-2 text-white rounded" required onChange={e => setFormData({...formData, remoteId: e.target.value})} />
                <input type="text" placeholder="Driver Name" className="w-full bg-slate-800 p-2 text-white rounded" onChange={e => setFormData({...formData, driverName: e.target.value})} />
                <div className="flex gap-2">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-700 text-white p-2 rounded">Cancel</button>
                    <button type="submit" className="flex-1 bg-emerald-600 text-white p-2 rounded">Save Entry</button>
                </div>
            </form>
        </div>
       )}
    </div>
  );
}
