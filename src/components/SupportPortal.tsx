import React, { useState } from 'react';
import { 
  FileCheck2, Coins, TrendingUp, Cpu, Landmark, User, ShieldAlert, RefreshCw 
} from 'lucide-react';

export default function SupportPortal() {
  const [activeTab, setActiveTab] = useState<'LEDGER' | 'PAYMENTS' | 'SYNC'>('LEDGER');
  const [income, setIncome] = useState(24500);
  const [expense, setExpense] = useState(8700);

  const [transactions, setTransactions] = useState([
    { id: 'TXN-8801', type: 'INCOME' as const, category: 'Campaign Revenue', amount: 5000, timestamp: Date.now() - 60000 * 5, description: 'Uber Ads Campaign payout credit' },
    { id: 'TXN-8802', type: 'EXPENSE' as const, category: 'Device Mounting', amount: 1200, timestamp: Date.now() - 60000 * 45, description: 'Terminal unit bracket installation' },
    { id: 'TXN-8803', type: 'INCOME' as const, category: 'Ad Revenue', amount: 15400, timestamp: Date.now() - 3600000 * 4, description: 'Swiggy Instamart active device credits' },
    { id: 'TXN-8804', type: 'EXPENSE' as const, category: 'SIM Telemetry', amount: 350, timestamp: Date.now() - 3600000 * 12, description: 'Airtel IoT SIM active package billing' }
  ]);

  // Devices & heartbeats
  const [devices, setDevices] = useState([
    { id: 'IOT-M1', driver: 'Rahul Sharma', lastSynced: Date.now() - 15000, status: 'ONLINE' }, // < 60s
    { id: 'IOT-M2', driver: 'Karan Singh', lastSynced: Date.now() - 45000, status: 'ONLINE' },  // < 60s
    { id: 'IOT-M3', driver: 'Sanjay Dutt', lastSynced: Date.now() - 120000, status: 'OFFLINE' }  // > 60s
  ]);

  const [isSyncing, setIsSyncing] = useState(false);

  const triggerLiveSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      // Simulate adding a real-time transaction
      const randomAmount = Math.floor(100 + Math.random() * 900) * 5;
      const types = ['INCOME', 'EXPENSE'] as const;
      const selectedType = types[Math.floor(Math.random() * types.length)];
      
      const newTxn = {
        id: `TXN-${Math.floor(8000 + Math.random() * 1000)}`,
        type: selectedType,
        category: selectedType === 'INCOME' ? 'Ad Space Credit' : 'Fleet Operations',
        amount: randomAmount,
        timestamp: Date.now(),
        description: selectedType === 'INCOME' ? 'Real-time payment credit sync' : 'System proxy telemetry renewal'
      };

      setTransactions([newTxn, ...transactions]);
      if (selectedType === 'INCOME') {
        setIncome(prev => prev + randomAmount);
      } else {
        setExpense(prev => prev + randomAmount);
      }

      // Update devices lastSynced time
      setDevices(devices.map(d => {
        if (Math.random() > 0.5) {
          return { ...d, lastSynced: Date.now() };
        }
        return d;
      }));

      setIsSyncing(false);
    }, 1200);
  };

  const getSyncStateClass = (timeDiff: number) => {
    // 60 seconds (60000ms) is our target limit
    return timeDiff < 60000 
      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' 
      : 'bg-zinc-800/80 text-zinc-500 border border-zinc-700';
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-6 px-4" id="support_portal_root">
      
      {/* Title */}
      <div className="mb-6">
        <h2 className="text-xl font-bold font-display text-zinc-100 flex items-center gap-2">
          <Landmark className="w-5 h-5 text-yellow-500" /> AutoAds Support Operations Portal
        </h2>
        <p className="text-zinc-500 text-xs mt-1">Manage real-time transactions ledger, configure payouts, and track online fleet units sync status.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#27272a] mb-6 gap-2">
        {(['LEDGER', 'PAYMENTS', 'SYNC'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-semibold uppercase font-mono tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === tab 
                ? 'border-[#EAB308] text-yellow-500' 
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab === 'LEDGER' ? 'Income Ledger' : tab === 'PAYMENTS' ? 'Payments Gateway' : 'IoT sync logs'}
          </button>
        ))}
      </div>

      <div className="bg-[#18181b] border border-[#27272a] rounded-2xl shadow-xl p-6">
        
        {/* Ledger view */}
        {activeTab === 'LEDGER' && (
          <div className="space-y-6" id="ledger_subview">
            {/* Cards row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#09090b] border border-[#27272a] p-4 rounded-xl">
                <span className="text-xs text-zinc-500 block">TOTAL CAMPAIGN INCOME</span>
                <strong className="text-2xl font-bold font-display text-emerald-400 mt-1 block">₹{income.toFixed(2)}</strong>
                <span className="text-[10px] text-zinc-500 uppercase mt-2 block">Accrued Ad Credits</span>
              </div>
              <div className="bg-[#09090b] border border-[#27272a] p-4 rounded-xl">
                <span className="text-xs text-zinc-500 block">TOTAL SERVICE EXPENSE</span>
                <strong className="text-2xl font-bold font-display text-rose-400 mt-1 block">₹{expense.toFixed(2)}</strong>
                <span className="text-[10px] text-zinc-500 uppercase mt-2 block">Mount brackets & SIMs</span>
              </div>
              <div className="bg-[#09090b] border border-[#27272a] p-4 rounded-xl">
                <span className="text-xs text-zinc-500 block">RECONCILED SURPLUS</span>
                <strong className="text-2xl font-bold font-display text-yellow-500 mt-1 block">₹{(income - expense).toFixed(2)}</strong>
                <span className="text-[10px] text-zinc-500 uppercase mt-2 block">System Operating Cash</span>
              </div>
            </div>

            {/* Sync control row */}
            <div className="flex items-center justify-between bg-zinc-900/40 p-4 rounded-xl border border-zinc-800">
              <span className="text-xs text-zinc-400">Firebase Real-time payment subscription and transaction stream:</span>
              <button 
                onClick={triggerLiveSync}
                disabled={isSyncing}
                className="bg-yellow-500 hover:bg-yellow-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer max-h-10"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} /> 
                {isSyncing ? 'Syncing...' : 'Sync Payments Now'}
              </button>
            </div>

            {/* Transactions log list */}
            <div>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase font-mono tracking-wider mb-3">Live transactions stream</h3>
              <div className="space-y-2">
                {transactions.map((txn) => (
                  <div key={txn.id} className="bg-[#09090b] border border-[#27272a] p-4 rounded-xl flex items-center justify-between text-xs transition duration-200 hover:border-zinc-700">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-zinc-200 font-mono font-medium">{txn.id}</strong>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          txn.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {txn.type}
                        </span>
                        <span className="text-zinc-400 font-medium">{txn.category}</span>
                      </div>
                      <p className="text-zinc-500">{txn.description}</p>
                    </div>
                    <div className="text-right">
                      <strong className={`text-sm ${
                        txn.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {txn.type === 'INCOME' ? '+' : '-'} ₹{txn.amount}
                      </strong>
                      <span className="block text-[10px] text-zinc-500 mt-1 uppercase font-mono">
                        {new Date(txn.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Payments Gateway tab */}
        {activeTab === 'PAYMENTS' && (
          <div className="space-y-6" id="payments_subview">
            <h3 className="text-sm font-semibold text-zinc-200 font-semibold mb-2 font-display">Razorpay Gateway Integration Hub</h3>
            <p className="text-xs text-zinc-400">Review payout settlement rules. AutoAds distributes programmatic ad revenues to driver nodes on completion of daily display targets.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#09090b] border border-[#27272a] p-4 rounded-xl">
                <h4 className="text-xs font-semibold text-zinc-300 font-display flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-yellow-500" /> Instant Settlement Rules
                </h4>
                <p className="text-xs text-zinc-500 mt-2">Driver withdrawals settle directly via IMC UPI callback routing. High-performance Razorpay live synchronization keeps latency below 2 seconds.</p>
              </div>

              <div className="bg-[#09090b] border border-[#27272a] p-4 rounded-xl">
                <h4 className="text-xs font-semibold text-zinc-300 font-display flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-emerald-400" /> Security Clearing Gate
                </h4>
                <p className="text-xs text-zinc-500 mt-2">Before payout settlement, the system audits GPS telemetry tracking history to confirm active media views and prevent fraudulent location spoofing.</p>
              </div>
            </div>
          </div>
        )}

        {/* IoT Active Units Status */}
        {activeTab === 'SYNC' && (
          <div className="space-y-6" id="telemetry_sync_subview">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-200 font-display">Active IoT Units Status Checks</h3>
                <p className="text-xs text-zinc-400 mt-1">Displays active screens currently mounted on operations fleet</p>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-zinc-500 font-mono">ACTIVE LIMIT CRITERIA</span>
                <span className="block text-xs font-bold text-yellow-500 font-mono">Heartbeat &lt; 60 seconds</span>
              </div>
            </div>

            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#09090b] border-b border-[#27272a] text-zinc-400 font-mono text-[10px]">
                    <th className="p-3">UNIT IDENTIFIER</th>
                    <th className="p-3">DRIVER NODE</th>
                    <th className="p-3 text-right">LAST SYNC TIME</th>
                    <th className="p-3 text-center">HEARTBEAT STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a]">
                  {devices.map((dev) => {
                    const timeDiff = Date.now() - dev.lastSynced;
                    const isOnline = timeDiff < 60000;
                    return (
                      <tr key={dev.id} className="hover:bg-zinc-900/50">
                        <td className="p-3 font-mono font-bold text-zinc-200 flex items-center gap-2">
                          <Cpu className="w-3.5 h-3.5 text-zinc-500" /> {dev.id}
                        </td>
                        <td className="p-3 text-zinc-400">{dev.driver}</td>
                        <td className="p-3 text-right text-zinc-400 font-mono">{(timeDiff / 1000).toFixed(0)}s ago</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${getSyncStateClass(timeDiff)}`}>
                            {isOnline ? '● ONLINE' : '○ OFFLINE'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
