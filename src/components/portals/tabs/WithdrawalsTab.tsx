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
  onInitiatePayout?: (driverId: string, amount: number, upiId: string) => void | Promise<void>;
}

export const WithdrawalsTab: React.FC<WithdrawalsTabProps> = ({
  withdrawRequests,
  driverPayments,
  drivers,
  onApprove,
  onReject,
  onInitiatePayout,
}) => {
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Manual payout modal states
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [amount, setAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);

  const handleSubmitPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!selectedDriverId) {
      setModalError("Please select a driver");
      return;
    }
    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setModalError("Please enter a valid amount greater than 0");
      return;
    }
    
    // Check if driver has sufficient balance
    const selectedDriver = drivers.find(d => d.id === selectedDriverId || d.uid === selectedDriverId);
    if (selectedDriver && (selectedDriver.walletBalance || 0) < numericAmount) {
      setModalError(`Sufficient wallet balance not available. Driver balance: ₹${selectedDriver.walletBalance || 0}`);
      return;
    }

    if (!upiId || !upiId.includes("@")) {
      setModalError("Please enter a valid UPI ID (e.g. name@upi)");
      return;
    }

    setIsSubmittingModal(true);
    try {
      if (onInitiatePayout) {
        await onInitiatePayout(selectedDriverId, numericAmount, upiId);
      }
      setShowPayoutModal(false);
      setSelectedDriverId("");
      setAmount("");
      setUpiId("");
    } catch (err: any) {
      setModalError(err.message || "Failed to initiate payout");
    } finally {
      setIsSubmittingModal(false);
    }
  };

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
    return d ? { name: d.fullName || d.name || "Unknown Driver", phone: d.phone || "N/A", vNo: d.vNo || d.vehicleNo || d.vehicleNumber || "N/A" } : { name: "Unknown Driver", phone: "N/A", vNo: "N/A" };
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
            Pending Settlement Queue ({pendingCount})
          </h3>
          <button
            onClick={() => {
              setModalError(null);
              setSelectedDriverId("");
              setAmount("");
              setUpiId("");
              setShowPayoutModal(true);
            }}
            className="px-4 py-2 bg-slate-900 text-amber-400 rounded-xl font-black uppercase text-[10px] tracking-wider hover:bg-slate-800 transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            <Wallet size={12} />
            Create Manual Payout
          </button>
        </div>

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

      {/* Manual Payout Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2rem] border border-slate-100 p-6 md:p-8 w-full max-w-lg shadow-2xl relative font-sans"
          >
            <button
              onClick={() => setShowPayoutModal(false)}
              className="absolute right-6 top-6 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
                <Wallet size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black italic uppercase text-slate-900 leading-none">
                  Manual Driver Payout
                </h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-1">
                  Initiate Settlement On Behalf of Driver
                </p>
              </div>
            </div>

            {modalError && (
              <div className="p-4 mb-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-start gap-2 text-xs font-semibold leading-relaxed">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitPayout} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                  Select Partner Driver
                </label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => {
                    const drvId = e.target.value;
                    setSelectedDriverId(drvId);
                    const drv = drivers.find(d => d.id === drvId || d.uid === drvId);
                    if (drv) {
                      setUpiId(drv.upiId || "");
                      setAmount(drv.walletBalance ? drv.walletBalance.toString() : "");
                    } else {
                      setUpiId("");
                      setAmount("");
                    }
                  }}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-amber-500 font-medium text-sm text-slate-800"
                >
                  <option value="">-- Choose Driver --</option>
                  {drivers.map(d => (
                    <option key={d.id || d.uid} value={d.id || d.uid}>
                      {d.name?.toUpperCase()} ({d.vNo || d.vehicleNumber || "No Vehicle"}) - Bal: ₹{d.walletBalance || 0}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                  Payout Amount (INR)
                </label>
                <input
                  type="number"
                  placeholder="₹ Amount to pay out"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  min="1"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-amber-500 font-mono text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                  Driver UPI ID
                </label>
                <input
                  type="text"
                  placeholder="driver@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-amber-500 font-mono text-sm text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  disabled={isSubmittingModal}
                  className="px-5 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-wider hover:bg-slate-200 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingModal}
                  className="px-5 py-3 bg-amber-500 text-slate-950 rounded-2xl font-black uppercase text-[10px] tracking-wider hover:bg-amber-400 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingModal ? "Initiating..." : "Initiate Payout"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
