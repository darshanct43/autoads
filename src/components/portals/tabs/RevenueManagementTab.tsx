import React, { useState, useEffect } from 'react';
import { firebaseService } from '@/services/firebaseService';
import { Coins, Download, Filter, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

export const RevenueManagementTab = () => {
    const [ledger, setLedger] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = firebaseService.subscribeToRevenueLedger((data) => {
            setLedger(data);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const totalRevenue = ledger.reduce((acc, curr) => acc + (curr.grossRevenue || 0), 0);
    const hqRevenue = ledger.reduce((acc, curr) => acc + (curr.platformRevenue || 0), 0);
    const franchiseRevenue = ledger.reduce((acc, curr) => acc + (curr.franchiseRevenue || 0), 0);

    const handleSettlement = async (id: string, ref: string) => {
        await firebaseService.updateRevenueSettlement(id, {
            status: 'PAID',
            referenceNumber: ref,
            paidAt: new Date().toISOString()
        });
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950/50 border border-slate-800 p-6 rounded-2xl">
                    <span className="text-slate-400 text-xs block">Total Revenue</span>
                    <span className="text-2xl font-black text-white">₹{totalRevenue.toLocaleString()}</span>
                </div>
                <div className="bg-slate-950/50 border border-slate-800 p-6 rounded-2xl">
                    <span className="text-indigo-400 text-xs block">HQ Share</span>
                    <span className="text-2xl font-black text-indigo-400">₹{hqRevenue.toLocaleString()}</span>
                </div>
                <div className="bg-slate-950/50 border border-slate-800 p-6 rounded-2xl">
                    <span className="text-amber-500 text-xs block">Franchise Share</span>
                    <span className="text-2xl font-black text-amber-500">₹{franchiseRevenue.toLocaleString()}</span>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-white">Revenue Ledger</h3>
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white transition">
                        <Download size={14} /> Export CSV
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                        <thead>
                            <tr className="text-slate-500 uppercase">
                                <th className="pb-4">Campaign</th>
                                <th className="pb-4">Source</th>
                                <th className="pb-4">Gross</th>
                                <th className="pb-4">Franchise Share</th>
                                <th className="pb-4">Status</th>
                                <th className="pb-4">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ledger.map((item) => (
                                <tr key={item.id} className="border-t border-slate-800">
                                    <td className="py-4 font-semibold text-white">{item.campaignName}</td>
                                    <td className="py-4">{item.source}</td>
                                    <td className="py-4">₹{item.grossRevenue.toLocaleString()}</td>
                                    <td className="py-4 text-emerald-400">₹{item.franchiseRevenue.toLocaleString()}</td>
                                    <td className="py-4">
                                        {item.status === 'PAID' ? <span className="text-emerald-500 flex items-center gap-1"><CheckCircle size={12}/> Paid</span> : <span className="text-amber-500 flex items-center gap-1"><Clock size={12}/> Pending</span>}
                                    </td>
                                    <td className="py-4">
                                        {item.status !== 'PAID' && (
                                            <button 
                                                onClick={() => handleSettlement(item.id, 'REF-' + Math.random().toString(36).substring(7).toUpperCase())}
                                                className="px-3 py-1 bg-amber-500/20 text-amber-500 rounded-lg hover:bg-amber-500/30">
                                                Settle
                                            </button>
                                        )}
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
