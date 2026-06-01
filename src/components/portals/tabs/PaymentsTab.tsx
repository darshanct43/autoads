import React from "react";
import { motion } from "motion/react";
import {
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  TrendingUp,
} from "lucide-react";

interface Payment {
  id?: string;
  transactionId: string;
  amount: number;
  paymentMethod: string;
  status: string;
  customerId: string;
  customerPhone?: string;
  campaignId: string;
  driverId?: string;
  createdAt?: any;
  timestamp?: any;
}

interface DriverPayment {
  id?: string;
  paymentId?: string;
  driverId: string;
  amount: number;
  type: 'earning' | 'withdrawal';
  status: 'pending' | 'success' | 'failed';
  paymentMethod: string;
  upiApp?: string;
  upiTransactionId?: string;
  screenshotUrl?: string;
  campaignId?: string;
  createdAt: any;
  updatedAt: any;
  timestamp?: any;
}

interface PaymentsTabProps {
  payments: Payment[];
  driverPayments: DriverPayment[];
  paymentSubTab: "INCOME" | "EXPENSE";
  setPaymentSubTab: (tab: "INCOME" | "EXPENSE") => void;
  drivers?: any[];
  campaigns?: any[];
}

export const PaymentsTab: React.FC<PaymentsTabProps> = ({
  payments = [],
  driverPayments = [],
  paymentSubTab,
  setPaymentSubTab,
  drivers = [],
  campaigns = [],
}) => {
  // Safe Timestamp Formatter
  const formatTimestamp = (ts: any) => {
    if (!ts) return "N/A";
    let date: Date;
    if (ts.toDate && typeof ts.toDate === "function") {
      date = ts.toDate();
    } else if (ts.seconds) {
      date = new Date(ts.seconds * 1000);
    } else if (ts instanceof Date) {
      date = ts;
    } else {
      date = new Date(ts);
    }
    return isNaN(date.getTime()) ? "N/A" : date.toLocaleString();
  };

  // 1. Calculations for Metrics Bar
  // Successful customer payments represent Revenue (Income)
  const totalRevenue = payments
    .filter((p) => p.status?.toLowerCase() === "success")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // Successful driver payments represent Expenses (Payouts & Earnings)
  const totalExpense = driverPayments
    .filter((p) => p.status?.toLowerCase() === "success")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const ledgerBalance = totalRevenue - totalExpense;

  // Helper to fetch Driver Display Name
  const getDriverName = (driverId?: string) => {
    if (!driverId) return "Unknown Driver";
    const d = drivers.find((drv) => drv.id === driverId || drv.uid === driverId);
    return d ? d.name : `Driver (${driverId.substring(0, 6)})`;
  };

  // Helper to fetch Campaign Banner/Name
  const getCampaignName = (campaignId?: string) => {
    if (!campaignId) return "Unknown Campaign";
    const c = campaigns.find((cmp) => cmp.id === campaignId);
    return c ? c.name : `Campaign (${campaignId.substring(0, 6)})`;
  };

  return (
    <div className="space-y-6 max-h-[85vh] overflow-y-auto pr-2 pb-12 font-sans" id="payments-registry-view">
      {/* Visual Header Banner */}
      <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-[2rem] shadow-xl text-white relative overflow-hidden" id="payments-header-banner">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 blur-3xl rounded-full -mr-16 -mt-16" />
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-amber-500/5 blur-2xl rounded-full -ml-8 -mb-8" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-5xl font-black italic uppercase leading-none tracking-tight">
              Payments Registry
            </h2>
            <p className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.25em] mt-3 text-slate-400">
              Audit Office • Customer Payments & Driver Remissions Ledger
            </p>
          </div>
          <div className="flex gap-2">
            <span className="text-[10px] font-bold uppercase font-mono px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl">
              Live Feed Connected
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="payments-metrics-dashboard">
        {/* Metric 1: Revenue (Income) */}
        <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm flex items-center justify-between" id="metric-revenue-card">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Total Revenue (Income)
            </p>
            <h4 className="text-3xl font-black text-slate-900 mt-2 font-mono text-emerald-600">
              ₹ {totalRevenue.toLocaleString()}
            </h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
              From {payments.filter((p) => p.status?.toLowerCase() === "success").length} successful payments
            </p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
            <ArrowUpRight size={24} />
          </div>
        </div>

        {/* Metric 2: Expenses (Outgoings) */}
        <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm flex items-center justify-between" id="metric-expense-card">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Total Expense (Payouts)
            </p>
            <h4 className="text-3xl font-black text-slate-900 mt-2 font-mono text-rose-600">
              ₹ {totalExpense.toLocaleString()}
            </h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
              Paid to drivers across {driverPayments.filter((p) => p.status?.toLowerCase() === "success").length} settlements
            </p>
          </div>
          <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500">
            <ArrowDownRight size={24} />
          </div>
        </div>

        {/* Metric 3: Ledger Net Balance */}
        <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm flex items-center justify-between" id="metric-balance-card">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Ledger Net Balance
            </p>
            <h4 className={`text-3xl font-black mt-2 font-mono ${ledgerBalance >= 0 ? "text-slate-900" : "text-amber-600"}`}>
              ₹ {ledgerBalance.toLocaleString()}
            </h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
              Current Treasury Account Margin
            </p>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${ledgerBalance >= 0 ? "bg-slate-950 text-amber-400" : "bg-amber-50 text-amber-500"}`}>
            <Wallet size={24} />
          </div>
        </div>
      </div>

      {/* Tabs / Toggle Header Controller */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-slate-100 p-4 rounded-[2rem] shadow-sm" id="ledger-tab-controller">
        <div className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-100 rounded-2xl w-full md:w-auto">
          <button
            id="toggle-income-tab"
            onClick={() => setPaymentSubTab("INCOME")}
            className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all flex items-center justify-center gap-2 ${
              paymentSubTab === "INCOME"
                ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100/50"
            }`}
          >
            <ArrowUpRight size={14} className={paymentSubTab === "INCOME" ? "text-emerald-400" : ""} />
            Income Ledger
          </button>
          <button
            id="toggle-expense-tab"
            onClick={() => setPaymentSubTab("EXPENSE")}
            className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all flex items-center justify-center gap-2 ${
              paymentSubTab === "EXPENSE"
                ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100/50"
            }`}
          >
            <ArrowDownRight size={14} className={paymentSubTab === "EXPENSE" ? "text-rose-400" : ""} />
            Expense Ledger
          </button>
        </div>

        <div className="text-right">
          <span className="text-[9px] font-extrabold uppercase font-mono bg-slate-100 px-3 py-1.5 rounded-lg text-slate-500">
            SHOWING TOTAL {paymentSubTab === "INCOME" ? payments.length : driverPayments.length} LOGS
          </span>
        </div>
      </div>

      {/* Ledger Feed Sub-view */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm" id="ledger-feed-viewport">
        {paymentSubTab === "INCOME" ? (
          /* ================== INCOME LEDGER (payments collection) ================== */
          <div className="space-y-4" id="income-ledger-container">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
              <Receipt size={14} /> Customer Campaigns Checkout Stream
            </h3>

            {payments.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center justify-center space-y-3 bg-slate-50/55 rounded-2xl" id="income-empty-state">
                <div className="w-16 h-16 bg-slate-100/70 rounded-3xl flex items-center justify-center text-slate-400">
                  <CreditCard size={28} />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900 uppercase">No Income Document Records</p>
                  <p className="text-[10px] text-slate-400 max-w-xs mt-1">No customer or advertiser deposit payments were received in the system yet.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {payments.map((p, idx) => {
                  const isSuccess = p.status?.toLowerCase() === "success" || p.status?.toLowerCase() === "completed";
                  const isFailed = p.status?.toLowerCase() === "failed";
                  
                  return (
                    <div
                      key={p.id || `inc-${idx}`}
                      className="bg-slate-50/60 border border-slate-100 hover:border-slate-200 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all"
                      id={`income-item-${p.id || idx}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSuccess ? "bg-emerald-50 text-emerald-500" : isFailed ? "bg-rose-50 text-rose-500" : "bg-amber-50 text-amber-500"} mt-1 flex-shrink-0`}>
                          <ArrowUpRight size={20} />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[9px] font-black font-mono px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md">
                              TX: {p.transactionId || "N/A"}
                            </span>
                            {p.paymentMethod && (
                              <span className="text-[9px] font-bold font-sans uppercase px-2 py-0.5 bg-slate-900 text-amber-400 rounded-md">
                                {p.paymentMethod}
                              </span>
                            )}
                          </div>

                          <h4 className="text-sm font-black text-slate-900 uppercase mt-2">
                            {getCampaignName(p.campaignId)}
                          </h4>

                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[10px] text-slate-400 font-bold uppercase">
                            <span>Phone: <span className="text-slate-700 font-mono">{p.customerPhone || "N/A"}</span></span>
                            <span>Client ID: <span className="text-slate-700 font-mono">{p.customerId?.substring(0, 8) || "N/A"}</span></span>
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium font-mono mt-2">
                            <Calendar size={12} />
                            <span>{formatTimestamp(p.createdAt || p.timestamp)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                        <div className="text-left md:text-right pr-2">
                          <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                            Deposit Received
                          </p>
                          <p className="text-lg font-black text-slate-900 font-mono">
                            ₹ {(p.amount || 0).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex-shrink-0">
                          {isSuccess ? (
                            <span className="flex items-center gap-1 text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                              <CheckCircle2 size={12} /> Success
                            </span>
                          ) : isFailed ? (
                            <span className="flex items-center gap-1 text-[9px] font-black uppercase text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100">
                              <XCircle size={12} /> Failed
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[9px] font-black uppercase text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100">
                              <Clock size={12} /> {p.status || "Pending"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ================== EXPENSE LEDGER (driverPayments collection) ================== */
          <div className="space-y-4" id="expense-ledger-container">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
              <Wallet size={14} /> Driver Earnings & Withdrawal Settlement Feed
            </h3>

            {driverPayments.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center justify-center space-y-3 bg-slate-50/55 rounded-2xl" id="expense-empty-state">
                <div className="w-16 h-16 bg-slate-100/70 rounded-3xl flex items-center justify-center text-slate-400">
                  <Wallet size={28} />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900 uppercase">No Expense Ledger Records</p>
                  <p className="text-[10px] text-slate-400 max-w-xs mt-1">No payout, bonus earning, or withdrawal ledger writes were synced yet.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {driverPayments.map((p, idx) => {
                  const isSuccess = p.status?.toLowerCase() === "success" || p.status?.toLowerCase() === "completed";
                  const isFailed = p.status?.toLowerCase() === "failed";
                  const isWithdrawal = p.type?.toLowerCase() === "withdrawal";
                  
                  return (
                    <div
                      key={p.id || `exp-${idx}`}
                      className="bg-slate-50/60 border border-slate-100 hover:border-slate-200 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all"
                      id={`expense-item-${p.id || idx}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSuccess ? "bg-rose-50 text-rose-500" : isFailed ? "bg-slate-100 text-slate-400" : "bg-amber-50 text-amber-500"} mt-1 flex-shrink-0`}>
                          <ArrowDownRight size={20} />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[9px] font-black font-mono px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md">
                              ID: {p.paymentId || p.id?.substring(0, 10) || "N/A"}
                            </span>
                            <span className={`text-[9px] font-black font-sans uppercase px-2 py-0.5 rounded-md ${isWithdrawal ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                              {p.type || "Earning"}
                            </span>
                            {p.paymentMethod && (
                              <span className="text-[9px] font-bold font-sans uppercase px-2 py-0.5 bg-slate-900 text-slate-200 rounded-md">
                                {p.paymentMethod} {p.upiApp ? `(${p.upiApp})` : ""}
                              </span>
                            )}
                          </div>

                          <h4 className="text-sm font-black text-slate-900 uppercase mt-2">
                            {getDriverName(p.driverId)}
                          </h4>

                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[10px] text-slate-400 font-bold uppercase">
                            {p.upiTransactionId && (
                              <span>UPI TXID: <span className="text-slate-700 font-mono">{p.upiTransactionId}</span></span>
                            )}
                            {p.campaignId && (
                              <span>MAPPED CAMPAIGN: <span className="text-slate-700">{getCampaignName(p.campaignId)}</span></span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium font-mono mt-2">
                            <Calendar size={12} />
                            <span>{formatTimestamp(p.createdAt || p.updatedAt || p.timestamp)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                        <div className="text-left md:text-right pr-2">
                          <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                            Debit Amount
                          </p>
                          <p className="text-lg font-black text-rose-600 font-mono">
                            ₹ {(p.amount || 0).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex-shrink-0">
                          {isSuccess ? (
                            <span className="flex items-center gap-1 text-[9px] font-black uppercase text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100">
                              <CheckCircle2 size={12} /> Disbursed
                            </span>
                          ) : isFailed ? (
                            <span className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                              <XCircle size={12} /> Failed
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[9px] font-black uppercase text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100">
                              <Clock size={12} /> {p.status || "Processing"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
