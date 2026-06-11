import React, { useState, useEffect } from 'react';
import { IndianRupee, ArrowUpRight, ArrowDownRight, Clock, AlertTriangle, CheckCircle2, TrendingUp, RefreshCw, Layers } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

interface PaymentRecord {
  id: string;
  transactionId?: string;
  amount: number;
  paymentMethod?: string;
  status: string;
  customerId?: string;
  campaignId?: string;
  createdAt?: any;
  type?: string;
}

export default function RevenueCenter() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [driverPayments, setDriverPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Subscribe to payments (Income)
    const qPayments = query(collection(db, 'payments'), orderBy('createdAt', 'desc'));
    const unsubPayments = onSnapshot(qPayments, (snap) => {
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PaymentRecord[];
      setPayments(list);
    }, (err) => {
      console.error("Error subscribing to payments:", err);
    });

    // 2. Subscribe to driverPayments (Expensing/Payouts)
    const qDriverPayments = query(collection(db, 'driverPayments'), orderBy('createdAt', 'desc'));
    const unsubDriverPayments = onSnapshot(qDriverPayments, (snap) => {
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDriverPayments(list);
      setLoading(false);
    }, (err) => {
      console.error("Error subscribing to driverPayments:", err);
      setLoading(false);
    });

    return () => {
      unsubPayments();
      unsubDriverPayments();
    };
  }, []);

  // Format Helper
  const formatAmount = (num: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return "Just now";
    if (ts.toDate && typeof ts.toDate === "function") {
      return ts.toDate().toLocaleString();
    }
    if (ts.seconds) {
      return new Date(ts.seconds * 1000).toLocaleString();
    }
    return new Date(ts).toLocaleString();
  };

  // Safe status normalizer
  const normalizeStatus = (status: string) => {
    if (!status) return 'pending';
    const s = status.toLowerCase();
    if (s === 'success' || s === 'paid' || s === 'settled') return 'success';
    if (s === 'failed' || s === 'cancelled') return 'failed';
    if (s === 'processing' || s === 'payout_processing') return 'processing';
    return 'pending';
  };

  const isTestPayment = (p: any) => {
    if (!p) return false;
    if (p.isTest === true) return true;
    if (p.isTest === false) return false;
    
    const idStr = String(p.id || '').toLowerCase();
    const txIdStr = String(p.transactionId || p.upiTransactionId || p.paymentId || '').toLowerCase();
    const orderIdStr = String(p.orderId || '').toLowerCase();
    const descStr = String(p.description || '').toLowerCase();
    const campaignStr = String(p.campaignId || '').toLowerCase();
    
    const markers = ['test', 'demo', 'fake', 'dummy', 'pay_test', 'sandbox'];
    for (const marker of markers) {
      if (idStr.includes(marker)) return true;
      if (txIdStr.includes(marker)) return true;
      if (orderIdStr.includes(marker)) return true;
      if (descStr.includes(marker)) return true;
      if (campaignStr.includes(marker)) return true;
    }
    return false;
  };

  // Combine lists for total distributions flow
  const allTransactions = [
    ...payments.map(p => ({
      ...p,
      flowType: 'INCOME',
      category: 'Campaign payment',
      displayId: p.transactionId || `TXN-${p.id.substring(0, 8).toUpperCase()}`,
      normalizedStatus: normalizeStatus(p.status)
    })),
    ...driverPayments.map(p => ({
      ...p,
      flowType: 'EXPENSE',
      category: p.type === 'withdrawal' ? 'Driver withdrawal' : 'Driver earning',
      displayId: p.upiTransactionId || `PAY-${p.id.substring(0, 8).toUpperCase()}`,
      normalizedStatus: normalizeStatus(p.status)
    }))
  ]
  .filter(tx => {
    return !isTestPayment(tx);
  })
  .sort((a, b) => {
    const timeA = a.createdAt?.seconds || (a.createdAt ? new Date(a.createdAt).getTime() : 0) || 0;
    const timeB = b.createdAt?.seconds || (b.createdAt ? new Date(b.createdAt).getTime() : 0) || 0;
    return timeB - timeA;
  });

  // Calculate stats
  const settledSum = allTransactions
    .filter(t => t.normalizedStatus === 'success')
    .reduce((sum, t) => sum + (t.flowType === 'INCOME' ? t.amount : -t.amount), 0);

  const pendingSum = allTransactions
    .filter(t => t.normalizedStatus === 'pending')
    .reduce((sum, t) => sum + t.amount, 0);

  const processingSum = allTransactions
    .filter(t => t.normalizedStatus === 'processing')
    .reduce((sum, t) => sum + t.amount, 0);

  const failedSum = allTransactions
    .filter(t => t.normalizedStatus === 'failed')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-left">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight font-sans">REVENUE CENTER</h1>
          <p className="text-sm text-slate-400 mt-1">Live digital transactions and settlement distributions flow</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 font-mono uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Ledger Synced
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric 1: Pending */}
        <div className="bg-amber-50 rounded-2xl border border-amber-100 p-6 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
          <div>
            <Clock className="w-5 h-5 text-amber-500 mb-4" />
            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest font-mono">Pending Ledger</p>
            <p className="text-2xl font-black text-amber-900 mt-1 font-mono">{formatAmount(pendingSum)}</p>
          </div>
        </div>

        {/* Metric 2: Processing */}
        <div className="bg-blue-50 rounded-2xl border border-blue-100 p-6 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-16 h-16 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
          <div>
            <RefreshCw className="w-5 h-5 text-blue-500 mb-4" />
            <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest font-mono">In Progress</p>
            <p className="text-2xl font-black text-blue-900 mt-1 font-mono">{formatAmount(processingSum)}</p>
          </div>
        </div>

        {/* Metric 3: Settled Ledger */}
        <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-6 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
          <div>
            <TrendingUp className="w-5 h-5 text-emerald-500 mb-4" />
            <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest font-mono">Real Balance (Ledger)</p>
            <p className="text-2xl font-black text-emerald-950 mt-1 font-mono">{formatAmount(settledSum)}</p>
          </div>
        </div>

        {/* Metric 4: Failed */}
        <div className="bg-rose-50 rounded-2xl border border-rose-100 p-6 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-16 h-16 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
          <div>
            <AlertTriangle className="w-5 h-5 text-rose-500 mb-4" />
            <p className="text-[10px] font-black text-rose-700 uppercase tracking-widest font-mono">Failed Audit sum</p>
            <p className="text-2xl font-black text-rose-900 mt-1 font-mono">{formatAmount(failedSum)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mt-8">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div>
            <h2 className="text-base font-black text-slate-800 tracking-tight uppercase font-mono">AUDIT HISTORY LEDGER</h2>
            <p className="text-xs text-slate-400 mt-1 leading-none font-medium">Full listing of income collections and driver distributions</p>
          </div>
          <span className="text-[9px] font-black text-slate-400 bg-white border border-slate-100 px-2.5 py-1 rounded-lg font-mono">
            COUNT: {allTransactions.length} RECORD(S)
          </span>
        </div>

        {loading ? (
          <div className="p-20 text-center text-slate-500 font-mono text-xs flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
            <span>RETRIEVING LIVE FIRESTORE LEDGER...</span>
          </div>
        ) : allTransactions.length === 0 ? (
          <div className="p-20 text-center text-slate-500 font-mono text-xs flex flex-col items-center justify-center gap-3 bg-slate-50/20">
            <Layers className="text-slate-350 w-8 h-8" />
            <span>No receipts or settlements recorded in current Firestore billing cycle.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-wider font-mono">
                  <th className="px-6 py-4">Transaction Details</th>
                  <th className="px-6 py-4">Type / Flow</th>
                  <th className="px-6 py-4">Amount (INR)</th>
                  <th className="px-6 py-4">Payment Method</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-mono font-bold text-slate-700">
                {allTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-slate-900 font-black">{tx.displayId}</p>
                      <p className="text-[10px] text-slate-400 font-mono uppercase mt-0.5">{tx.category}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black font-mono border ${
                        tx.flowType === 'INCOME' 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                          : 'bg-rose-50 text-rose-600 border-rose-100'
                      }`}>
                        {tx.flowType === 'INCOME' ? (
                          <>
                            <ArrowUpRight className="w-3 h-3" />
                            <span>INCOME</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownRight className="w-3 h-3" />
                            <span>EXPENSE</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className={`px-6 py-4 font-black text-sm ${
                      tx.flowType === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {tx.flowType === 'INCOME' ? '+' : '-'}{formatAmount(tx.amount)}
                    </td>
                    <td className="px-6 py-4 text-slate-500 uppercase font-bold text-[10px]">
                      {tx.paymentMethod || 'Razorpay Gateway'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide border ${
                        tx.normalizedStatus === 'success' ? 'bg-emerald-50 text-emerald-650 border-emerald-150' :
                        tx.normalizedStatus === 'failed' ? 'bg-rose-50 text-rose-650 border-rose-150' :
                        tx.normalizedStatus === 'processing' ? 'bg-blue-50 text-blue-650 border-blue-150' :
                        'bg-amber-50 text-amber-650 border-amber-150'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          tx.normalizedStatus === 'success' ? 'bg-emerald-500' :
                          tx.normalizedStatus === 'failed' ? 'bg-rose-500' :
                          tx.normalizedStatus === 'processing' ? 'bg-blue-400 animate-pulse' :
                          'bg-amber-400 animate-pulse'
                        }`} />
                        {tx.normalizedStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-medium text-[10px]">
                      {formatTimestamp(tx.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
