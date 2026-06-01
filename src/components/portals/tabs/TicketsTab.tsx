import React from "react";
import { motion } from "motion/react";
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  Trash2,
  User,
  MapPin,
  Tag,
  Flame,
  PlusCircle,
  Inbox,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  Smartphone,
  Briefcase,
} from "lucide-react";
import { SupportTicket } from "@/services/firebaseService";

interface TicketsTabProps {
  tickets: SupportTicket[];
  activeTicketId: string | null;
  setActiveTicketId: (id: string | null) => void;
  handleStatusChange: (ticketId: string, status: 'open' | 'in_progress' | 'resolved') => void;
  handleDeleteTicket: (ticketId: string) => void;
}

export const TicketsTab: React.FC<TicketsTabProps> = ({
  tickets = [],
  activeTicketId,
  setActiveTicketId,
  handleStatusChange,
  handleDeleteTicket,
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

  // 1. Calculations for upper Metrics Bar
  const openCount = tickets.filter(
    (t) => t.status?.toLowerCase() === "open"
  ).length;

  const inProgressCount = tickets.filter(
    (t) => t.status?.toLowerCase() === "in_progress"
  ).length;

  const resolvedCount = tickets.filter(
    (t) => t.status?.toLowerCase() === "resolved"
  ).length;

  // Active Selected Ticket matching
  const activeTicket = tickets.find((t) => t.id === activeTicketId);

  // Status visual configurations mapping
  const getStatusStyle = (statusStr: string = "") => {
    const s = statusStr.toLowerCase();
    if (s === "open") {
      return {
        bg: "bg-rose-50 text-rose-600 border-rose-100",
        pill: "bg-rose-600 text-white",
        dot: "bg-rose-500",
        label: "Open / Alerting",
      };
    } else if (s === "in_progress") {
      return {
        bg: "bg-amber-50 text-amber-600 border-amber-100",
        pill: "bg-amber-500 text-white",
        dot: "bg-amber-500",
        label: "In Progress",
      };
    } else if (s === "resolved") {
      return {
        bg: "bg-emerald-50 text-emerald-600 border-emerald-100",
        pill: "bg-emerald-600 text-white",
        dot: "bg-emerald-500",
        label: "Resolved • Archived",
      };
    }
    return {
      bg: "bg-slate-50 text-slate-500 border-slate-100",
      pill: "bg-slate-500 text-white",
      dot: "bg-slate-400",
      label: statusStr || "Unknown Status",
    };
  };

  // Priority styling selection
  const getPriorityStyle = (priorityStr: string = "") => {
    const p = priorityStr.toUpperCase();
    if (p === "HIGH") {
      return "bg-rose-100 text-rose-700 border-rose-200 uppercase text-[9px] font-black tracking-wider px-2 py-0.5 rounded";
    } else if (p === "MEDIUM") {
      return "bg-amber-100 text-amber-700 border-amber-200 uppercase text-[9px] font-black tracking-wider px-2 py-0.5 rounded";
    }
    return "bg-slate-100 text-slate-600 border-slate-200 uppercase text-[9px] font-black tracking-wider px-2 py-0.5 rounded";
  };

  return (
    <div className="space-y-6 max-h-[85vh] overflow-y-auto pr-2 pb-12 font-sans" id="support-tickets-tab-system">
      {/* Banner / Premium Section */}
      <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-[2rem] shadow-xl text-white relative overflow-hidden" id="tickets-tab-banner">
        <div className="absolute right-0 top-0 w-96 h-96 bg-rose-500/10 blur-3xl rounded-full -mr-16 -mt-16" />
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-amber-500/5 blur-2xl rounded-full -ml-8 -mb-8" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-5xl font-black italic uppercase leading-none tracking-tight">
              Support Hub
            </h2>
            <p className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.25em] mt-3 text-slate-400">
              Coordinators Audit Office • Live Driver & Advertiser Issue Center
            </p>
          </div>
          <div className="flex gap-2">
            <span className="text-[10px] font-bold uppercase font-mono px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl">
              Ticket Channels Connected
            </span>
          </div>
        </div>
      </div>

      {/* 3 Metric Card Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="tickets-metrics-dashboard">
        {/* Metric 1: Open Tickets */}
        <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm flex items-center justify-between" id="metric-open-card">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Open (Alerting) Tickets
            </p>
            <h4 className="text-4xl font-black mt-2 font-mono text-rose-600">
              {openCount}
            </h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
              Require immediate coordination
            </p>
          </div>
          <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500">
            <ShieldAlert size={24} />
          </div>
        </div>

        {/* Metric 2: In Progress Tickets */}
        <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm flex items-center justify-between" id="metric-progress-card">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              In Progress Tickets
            </p>
            <h4 className="text-4xl font-black mt-2 font-mono text-amber-500">
              {inProgressCount}
            </h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
              Active diagnostic follow-ups
            </p>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
            <Clock size={24} />
          </div>
        </div>

        {/* Metric 3: Resolved Tickets */}
        <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm flex items-center justify-between" id="metric-resolved-card">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Resolved & Archived
            </p>
            <h4 className="text-4xl font-black mt-2 font-mono text-emerald-600">
              {resolvedCount}
            </h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
              Successfully satisfied issues
            </p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
            <CheckCircle2 size={24} />
          </div>
        </div>
      </div>

      {/* Main Double-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="tickets-double-column-flow">
        {/* Column 1: Ticket List viewport (col-span-5) */}
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm flex flex-col h-[75vh]" id="ticket-list-viewport">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4" id="ticket-list-header">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
              <Inbox size={14} /> Inbox Stream ({tickets.length})
            </h3>
            <span className="text-[10px] font-black uppercase font-mono bg-slate-100 text-slate-500 px-2 py-1 rounded">
              Sync Real-time
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar" id="ticket-items-container">
            {tickets.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center space-y-3" id="tickets-empty-state">
                <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300">
                  <Inbox size={28} />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900 uppercase">No Support Tickets Found</p>
                  <p className="text-[10px] text-slate-400 max-w-xs mt-1 px-4">There are currently no open or submitted inquiry channels in the database.</p>
                </div>
              </div>
            ) : (
              tickets.map((t, idx) => {
                const isActive = t.id === activeTicketId;
                const statusInfo = getStatusStyle(t.status);
                const priorityInfo = getPriorityStyle(t.priority);
                const isDeviceType = t.type === "DEVICE";

                return (
                  <button
                    key={t.id || `tkt-${idx}`}
                    onClick={() => setActiveTicketId(t.id || null)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col gap-2 relative overflow-hidden group ${
                      isActive
                        ? "bg-slate-900 border-slate-900 text-white shadow-lg"
                        : "bg-slate-50/60 hover:bg-slate-100/50 border-slate-100 hover:border-slate-200"
                    }`}
                    id={`ticket-card-${t.id || idx}`}
                  >
                    {/* Status Dot / Flag line */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${statusInfo.dot}`} />
                        <span className={`text-[9px] font-black uppercase tracking-wider ${isActive ? "text-slate-300" : "text-slate-500"}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <span className={priorityInfo}>
                        {t.priority || "MEDIUM"}
                      </span>
                    </div>

                    {/* Title */}
                    <h4 className={`text-xs font-black uppercase tracking-tight line-clamp-1 group-hover:text-amber-500 transition-colors ${isActive ? "text-amber-400" : "text-slate-900"}`}>
                      {t.subject || t.title || "Untitled Signal"}
                    </h4>

                    {/* Meta Section */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] font-bold uppercase mt-1">
                      <span className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${
                        isDeviceType
                          ? (isActive ? "bg-blue-900/40 text-blue-300" : "bg-blue-100 text-blue-700")
                          : (isActive ? "bg-purple-900/40 text-purple-300" : "bg-purple-100 text-purple-700")
                      }`}>
                        {isDeviceType ? <Smartphone size={10} /> : <User size={10} />}
                        {t.type || "CUSTOMER"}
                      </span>
                      <span className={isActive ? "text-slate-400" : "text-slate-500"}>
                        {t.driverName || t.customerName || "External Node"}
                      </span>
                    </div>

                    {/* Description Snippet */}
                    <p className={`text-[10px] line-clamp-1 border-l-2 pl-2 italic mt-1 ${isActive ? "text-slate-400 border-slate-800" : "text-slate-500 border-slate-200"}`}>
                      {t.lastMessage || t.description || "No supplemental details."}
                    </p>

                    {/* Timestamp Footer */}
                    <div className={`text-[8px] font-mono mt-2 self-end ${isActive ? "text-slate-400" : "text-slate-400"}`}>
                      {formatTimestamp(t.createdAt)}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Column 2: Ticket Details viewport sticky layout (col-span-7) */}
        <div className="lg:col-span-7 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm flex flex-col h-[75vh]" id="ticket-action-viewport">
          {!activeTicket ? (
            /* Empty State Details Placeholder */
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4" id="details-unselected-placeholder">
              <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-300">
                <AlertCircle size={36} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 uppercase">Audit Dashboard Idle</p>
                <p className="text-[10px] text-slate-400 max-w-sm mt-1">
                  Select a live inbound support ticket or hardware alerting signal on the left checklist panel to interact.
                </p>
              </div>
            </div>
          ) : (
            /* Ticket Active Details View */
            <div className="flex flex-col h-full justify-between" id={`ticket-details-active-${activeTicket.id}`}>
              {/* Header section */}
              <div className="space-y-4 border-b border-slate-100 pb-5" id="details-section-header">
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-black uppercase tracking-wider px-3 py-1 border rounded-lg ${getStatusStyle(activeTicket.status).bg}`}>
                    STATUS: {getStatusStyle(activeTicket.status).label}
                  </span>

                  <div className="flex gap-2">
                    <span className={getPriorityStyle(activeTicket.priority)}>
                      {activeTicket.priority || "MEDIUM"}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">
                      ID: {activeTicket.id}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-base md:text-lg font-black uppercase text-slate-900 tracking-tight">
                    {activeTicket.subject || activeTicket.title || "Inbound Query Channel"}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-1">
                    <Clock size={12} />
                    <span>Registered: {formatTimestamp(activeTicket.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Central Information Body */}
              <div className="flex-1 overflow-y-auto py-5 space-y-6 scrollbar-none" id="details-section-body">
                {/* Meta details grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl flex flex-col gap-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Requester Name</span>
                    <span className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5 mt-1">
                      <User size={14} className="text-slate-500" />
                      {activeTicket.driverName || activeTicket.customerName || "External Client"}
                    </span>
                    <span className="text-[8px] font-mono text-slate-400 mt-1">
                      UID: {activeTicket.driverId || "N/A"}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl flex flex-col gap-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Inquiry Type / Category</span>
                    <span className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5 mt-1">
                      <Tag size={14} className="text-slate-500" />
                      {activeTicket.category || "Unassigned Category"}
                    </span>
                    <span className="text-[8px] font-bold text-indigo-400 mt-1 uppercase">
                      CHANNEL_NODE: {activeTicket.type || "CUSTOMER"}
                    </span>
                  </div>
                </div>

                {/* Main Description */}
                <div className="space-y-2">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Original Ticket Submission</span>
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-xs text-slate-700 leading-relaxed font-semibold italic">
                    "{activeTicket.description || 'No primary message payload recorded.'}"
                  </div>
                </div>

                {/* GPS and Extra Info (if present) */}
                {(activeTicket.lat || activeTicket.lng || activeTicket.campaignId) && (
                  <div className="bg-amber-50/40 border border-amber-100 p-4 rounded-2xl space-y-2">
                    <span className="text-[8px] font-black text-amber-700 uppercase tracking-widest block">Signal Telemetry & Diagnostics</span>
                    <div className="flex flex-col gap-1.5 text-[10px] text-slate-600 font-bold uppercase">
                      {activeTicket.campaignId && (
                        <span className="flex items-center gap-1">
                          <Briefcase size={12} className="text-amber-600" /> Targeted Campaign: <span className="text-slate-900 font-mono">{activeTicket.campaignId}</span>
                        </span>
                      )}
                      {(activeTicket.lat || activeTicket.lng) && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} className="text-amber-600" /> Ping Coordinates: <span className="text-slate-900 font-mono">{activeTicket.lat}, {activeTicket.lng}</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Operations Control panel footer */}
              <div className="border-t border-slate-100 pt-5 space-y-4" id="details-section-actions">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  {/* Status Change Selector buttons */}
                  <div className="space-y-1.5">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Change Status Mode</span>
                    <div className="flex items-center gap-2 p-1 bg-slate-50 border border-slate-100 rounded-xl">
                      <button
                        id="set-status-open"
                        onClick={() => handleStatusChange(activeTicket.id!, "open")}
                        className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                          activeTicket.status?.toLowerCase() === "open"
                            ? "bg-rose-600 text-white shadow-sm"
                            : "text-slate-500 hover:text-slate-950 hover:bg-slate-100"
                        }`}
                      >
                        Open
                      </button>
                      <button
                        id="set-status-progress"
                        onClick={() => handleStatusChange(activeTicket.id!, "in_progress")}
                        className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                          activeTicket.status?.toLowerCase() === "in_progress"
                            ? "bg-amber-500 text-black shadow-sm"
                            : "text-slate-500 hover:text-slate-950 hover:bg-slate-100"
                        }`}
                      >
                        In Progress
                      </button>
                      <button
                        id="set-status-resolved"
                        onClick={() => handleStatusChange(activeTicket.id!, "resolved")}
                        className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                          activeTicket.status?.toLowerCase() === "resolved"
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "text-slate-500 hover:text-slate-950 hover:bg-slate-100"
                        }`}
                      >
                        Resolved
                      </button>
                    </div>
                  </div>

                  {/* Absolute Purge Danger Button */}
                  <div className="sm:self-end">
                    <button
                      id="purge-ticket-button"
                      onClick={() => {
                        handleDeleteTicket(activeTicket.id!);
                        setActiveTicketId(null);
                      }}
                      className="w-full sm:w-auto px-5 py-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 hover:text-rose-800 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                    >
                      <Trash2 size={13} /> Delete Ticket
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
