import React, { useState } from "react";
import { motion } from "motion/react";
import { Check, X, Wallet, AlertCircle, Calendar, Clock, User } from "lucide-react";

interface WithdrawRequest {
  id?: string;
  requestId?: string;
  driverId: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  upiId: string;
  createdAt: any;
  processedAt?: any;
}

interface WithdrawalsTabProps {
  withdrawRequests: WithdrawRequest[];
  driverPayments: any[];
  drivers: any[];
  onApprove: (req: any) => void | Promise<void>;
  onReject: (req: any) => void | Promise<void>;
}

export const WithdrawalsTab: React.FC<WithdrawalsTabProps> = ({
  withdrawRequests,
  driverPayments,
  drivers,
  onApprove,
  onReject,
}) => {
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Helper to format date
  const formatTimestamp = (ts: any) => {
    if (!ts) return "N/A";
    let date: Date;
    if (ts.toDate && typeof ts.toDate === "function") {
      date = ts.toDate();
    } else if (ts.seconds) {
      date = new Date(ts.seconds * 1000);
    } else {
      date = new Date(ts);
    }
    return isNaN(date.getTime()) ? "N/A" : date.toLocaleString();
  };

  // 1. Calculations for Metrics Bar
  const pendingRequests = withdrawRequests.filter((r) => r.status === "pending");
  const pendingCount = pendingRequests.length;
  
  const outstandingDebt = pendingRequests.reduce(
    (sum, r) => sum + (Number(r.amount) || 0),
    0
  );

  const completedSum = withdrawRequests
    .filter((r) => r.status === "approved")
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  // Helper to get driver details
  const getDriverInfo = (driverId: string) => {
    const d = drivers.find((drv) => drv.id === driverId || drv.uid === driverId);
    return d || { name: "Unknown Driver", phone: "N/A", vNo: "N/A" };
  };

  const handleApproveAction = async (req: WithdrawRequest) => {
    if (!req.id) return;
    setProcessingId(req.id);
    try {
      await onApprove(req);
    } catch (e) {
      console.error("Failed to approve", e);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectAction = async (req: WithdrawRequest) => {
    if (!req.id) return;
    setProcessingId(req.id);
    try {
      await onReject(req);
    } catch (e) {
      console.error("Failed to reject", e);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Title Header Card */}
      <div className="bg-amber-500 p-6 md:p-8 rounded-[2rem] shadow-xl shadow-amber-500/10 text-slate-950 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 blur-3xl rounded-full -mr-16 -mt-16" />
        <div className="relative z-10 font-sans">
          <h2 className="text-2xl md:text-5xl font-black italic uppercase leading-none">
            Payout Control Desk
          </h2>
          <p className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.3em] mt-3 opacity-60">
            Real-Time Settlement & Withdrawal Verification
          </p>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric 1 */}
        <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Pending Requests
            </p>
            <h4 className="text-3xl font-black text-slate-900 mt-2 font-mono">
              {pendingCount}
            </h4>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
            <Clock size={24} />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Outstanding Debt
            </p>
            <h4 className="text-3xl font-black text-slate-900 mt-2 font-mono">
              ₹ {outstandingDebt.toLocaleString()}
            </h4>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
            <Wallet size={24} />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Completed Payouts
            </p>
            <h4 className="text-3xl font-black text-slate-900 mt-2 font-mono">
              ₹ {completedSum.toLocaleString()}
            </h4>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
            <Check size={24} />
          </div>
        </div>
      </div>

      {/* Active Requests Queue */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6">
          Pending Settlement Queue ({pendingCount})
        </h3>

        {pendingCount === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-400">
              <Check size={32} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900 uppercase">
                All Cleared!
              </p>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                There are currently no pending driver transfer requests needing manual validation.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((req) => {
              const driver = getDriverInfo(req.driverId);
              const isProcessing = processingId === req.id;

              return (
                <motion.div
                  key={req.id || req.requestId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-amber-500/20 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-amber-500 mt-1">
                      <User size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-black text-slate-900 uppercase">
                          {driver.name}
                        </h4>
                        {driver.vNo && (
                          <span className="text-[10px] font-bold font-mono px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md">
                            {driver.vNo}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-1">
                        UPI: <span className="text-slate-900 font-bold">{req.upiId}</span>
                      </p>
                      {driver.phone && (
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                          Phone: <span className="font-mono">{driver.phone}</span>
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium font-mono mt-2">
                        <Calendar size={12} />
                        <span>{formatTimestamp(req.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-200/60 pt-3 md:pt-0">
                    <div className="text-left md:text-right pr-4">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        Amount Due
                      </p>
                      <p className="text-xl font-black text-slate-900 font-mono">
                        ₹ {(req.amount || 0).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRejectAction(req)}
                        disabled={isProcessing}
                        className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-[10px] tracking-wider hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleApproveAction(req)}
                        disabled={isProcessing}
                        className="px-4 py-2.5 bg-amber-500 text-slate-950 rounded-xl font-black uppercase text-[10px] tracking-wider hover:bg-amber-400 transition-all disabled:opacity-50"
                      >
                        Approve & Pay
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
