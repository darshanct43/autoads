import React from "react";
import { motion, AnimatePresence } from "motion/react";
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
  MessageSquare,
  X,
  Plus,
} from "lucide-react";
import { SupportTicket } from "@/types";
import { firebaseService } from "@/services/firebaseService";
import { usePermissions } from "@/hooks/usePermissions";

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
  const { hasPermission } = usePermissions();
  const filteredTickets = tickets.filter(t => {
     // Normalization
     const status = (t.status || 'open').toLowerCase();
     return status === 'open' || status === 'in_progress' || status === 'resolved' || status === 'closed';
  });

  // Then use filteredTickets for rendering loops...
  const [newMessage, setNewMessage] = React.useState("");
  const [messages, setMessages] = React.useState<any[]>([]);
  const [isSending, setIsSending] = React.useState(false);

  // New Ticket Creation Modal States
  const [isNewTicketOpen, setIsNewTicketOpen] = React.useState(false);
  const [newSubject, setNewSubject] = React.useState("");
  const [newDescription, setNewDescription] = React.useState("");
  const [newCategory, setNewCategory] = React.useState("Technical Support");
  const [newPriority, setNewPriority] = React.useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [newType, setNewType] = React.useState<"CUSTOMER" | "DRIVER" | "FRANCHISE">("DRIVER");
  const [newRequesterName, setNewRequesterName] = React.useState("");
  const [newRequesterPhone, setNewRequesterPhone] = React.useState("");
  const [newRequesterId, setNewRequesterId] = React.useState("");
  const [isCreatingTicket, setIsCreatingTicket] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Subscribe to real-time chat messages
  React.useEffect(() => {
    if (!activeTicketId) {
      setMessages([]);
      return;
    }
    const unsub = firebaseService.subscribeToMessages(activeTicketId, (msgs) => {
      setMessages(msgs);
    });
    return () => unsub();
  }, [activeTicketId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeTicketId) return;
    setIsSending(true);
    try {
      await firebaseService.sendTicketChatMessage(activeTicketId, {
        senderId: "HQ_ADMIN",
        senderName: "HQ Coordinator",
        senderRole: "admin",
        text: newMessage.trim(),
        content: newMessage.trim(),
      });
      setNewMessage("");
    } catch (err) {
      console.error("Failed to send message: ", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newDescription.trim() || !newRequesterName.trim()) {
      alert("Please fill in all required fields (Subject, Description, and Requester Name)");
      return;
    }
    setIsCreatingTicket(true);
    try {
      const payload: any = {
        subject: newSubject.trim(),
        description: newDescription.trim(),
        priority: newPriority,
        category: newCategory,
        type: newType,
        assignedToHQ: true,
      };

      if (newType === "DRIVER") {
        payload.driverName = newRequesterName.trim();
        payload.driverPhone = newRequesterPhone.trim();
        payload.driverId = newRequesterId.trim() || "DRV-" + Math.floor(1000 + Math.random() * 9000);
      } else {
        payload.customerName = newRequesterName.trim();
        payload.customerPhone = newRequesterPhone.trim();
        payload.customerId = newRequesterId.trim() || "CUS-" + Math.floor(1000 + Math.random() * 9000);
      }

      const generatedId = await firebaseService.createSupportTicket(payload);
      
      const lowercaseRole = newType === "DRIVER" ? "driver" : newType === "CUSTOMER" ? "customer" : "staff";

      // Auto-send initial description as first msg
      await firebaseService.sendTicketChatMessage(generatedId, {
        senderId: payload.driverId || payload.customerId,
        senderName: newRequesterName.trim(),
        senderRole: lowercaseRole,
        text: newDescription.trim(),
        content: newDescription.trim(),
      });

      alert("Support Ticket raised successfully! Ticket ID: " + generatedId);
      setActiveTicketId(generatedId);
      setIsNewTicketOpen(false);
      
      // Clear Form
      setNewSubject("");
      setNewDescription("");
      setNewRequesterName("");
      setNewRequesterPhone("");
      setNewRequesterId("");
    } catch (err) {
      console.error(err);
      alert("Error creating ticket: " + err);
    } finally {
      setIsCreatingTicket(false);
    }
  };

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
    <div className="space-y-6 pb-12 font-sans" id="support-tickets-tab-system">
      {/* Banner / Premium Section */}
      <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-[2rem] shadow-xl text-white relative overflow-hidden" id="tickets-tab-banner">
        <div className="absolute right-0 top-0 w-96 h-96 bg-rose-500/10 blur-3xl rounded-full -mr-16 -mt-16" />
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-amber-500/5 blur-2xl rounded-full -ml-8 -mb-8" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-5xl font-bold tracking-tight">
              Support Hub
            </h2>
            <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.15em] mt-3 text-slate-400">
              Coordinators Audit Office • Live Support Center
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => setIsNewTicketOpen(true)}
              className="flex items-center gap-2 text-[10px] md:text-xs font-bold uppercase px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl transition-all shadow-md cursor-pointer hover:scale-102 active:scale-98"
            >
              <PlusCircle size={14} /> Raise Ticket
            </button>
            <span className="text-[10px] font-bold uppercase px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl">
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
            <h4 className="text-4xl font-bold mt-2 text-rose-600">
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
            <h4 className="text-4xl font-bold mt-2 text-amber-500">
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
            <h4 className="text-4xl font-bold mt-2 text-emerald-600">
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
        {/* Column 1: Ticket List viewport (col-span-4) */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-[2rem] p-5 shadow-sm flex flex-col min-h-[500px]" id="ticket-list-viewport">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4" id="ticket-list-header">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
              <Inbox size={14} className="text-amber-500" /> Active Signals ({tickets.length})
            </h3>
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg border border-emerald-100">
               <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[8px] font-black uppercase tracking-widest">Live Sync</span>
            </div>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[calc(100vh-320px)] pr-1 custom-scrollbar" id="ticket-items-container">
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
              tickets.sort((a, b) => {
                const timeA = (a.updatedAt || a.createdAt)?.toMillis?.() || 0;
                const timeB = (b.updatedAt || b.createdAt)?.toMillis?.() || 0;
                return timeB - timeA;
              }).map((t, idx) => {
                const isActive = t.id === activeTicketId;
                const statusInfo = getStatusStyle(t.status);
                const priorityInfo = getPriorityStyle(t.priority);
                const isDeviceType = t.type === "DEVICE";
                const lastTime = t.updatedAt || t.createdAt;

                return (
                  <button
                    key={t.id || `tkt-${idx}`}
                    onClick={() => setActiveTicketId(t.id || null)}
                    className={`w-full text-left p-4 rounded-3xl border transition-all flex flex-col gap-2 relative overflow-hidden group ${
                      isActive
                        ? "bg-slate-950 border-slate-950 text-white shadow-2xl scale-[1.02] z-10"
                        : "bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200"
                    }`}
                    id={`ticket-card-${t.id || idx}`}
                  >
                    {isActive && <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl -mr-16 -mt-16" />}
                    
                    {/* Status Dot / Flag line */}
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 rounded-full h-2 ${statusInfo.dot}`} />
                        <span className={`text-[8px] font-black uppercase tracking-widest ${isActive ? "text-slate-400" : "text-slate-500"}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {t.updatedAt && (
                          <span className="text-[7px] font-black text-amber-500 animate-pulse uppercase">Recent</span>
                        )}
                        <span className={priorityInfo}>
                          {t.priority || "MEDIUM"}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h4 className={`text-[11px] font-black uppercase tracking-tight line-clamp-1 group-hover:text-amber-500 transition-colors relative z-10 ${isActive ? "text-white" : "text-slate-900"}`}>
                      {t.subject || t.title || "Inbound Msg"}
                    </h4>

                    {/* Meta Section */}
                    <div className="flex items-center justify-between mt-1 relative z-10">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded-md flex items-center gap-1 text-[8px] font-black uppercase ${
                          isDeviceType
                            ? (isActive ? "bg-slate-800 text-blue-400" : "bg-blue-50 text-blue-700")
                            : (isActive ? "bg-slate-800 text-purple-400" : "bg-purple-50 text-purple-700")
                        }`}>
                          {isDeviceType ? <Smartphone size={10} /> : <User size={10} />}
                          {t.type || "CUSTOMER"}
                        </span>
                        <span className={`text-[9px] font-bold uppercase truncate max-w-[100px] ${isActive ? "text-slate-400" : "text-slate-600"}`}>
                          {t.driverName || t.customerName || "Ext Node"}
                        </span>
                      </div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">
                        {lastTime ? formatTimestamp(lastTime) : '...'}
                      </span>
                    </div>

                    {/* Description Snippet */}
                    <p className={`text-[10px] line-clamp-1 border-l-2 pl-2 italic mt-1 relative z-10 ${isActive ? "text-slate-400 border-slate-700" : "text-slate-400 border-slate-100"}`}>
                      {t.lastMessage || t.description || "No supplemental details."}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Column 2: Ticket Details viewport (col-span-8) */}
        <div className="lg:col-span-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm flex flex-col h-[600px] lg:h-[calc(100vh-200px)] overflow-hidden sticky top-20" id="ticket-action-viewport">
          {!activeTicket ? (
            /* Empty State Details Placeholder */
            <div className="h-full flex flex-col items-center justify-center text-center p-8" id="details-unselected-placeholder">
              <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-300">
                <AlertCircle size={36} />
              </div>
              <div className="mt-4">
                <p className="text-sm font-black text-slate-900 uppercase">Audit Hub Idle</p>
                <p className="text-[10px] text-slate-400 max-w-sm mt-1 uppercase font-bold">
                  Select a live inbound support ticket or hardware alerting signal to interact.
                </p>
              </div>
            </div>
          ) : (
            /* Ticket Active Details View - FIXED COMPONENT PARTS */
            <div className="flex flex-col h-full bg-slate-50/10" id={`ticket-details-active-${activeTicket.id}`}>
              {/* Header section (Fixed) */}
              <div className="shrink-0 p-5 border-b border-slate-100 bg-white" id="details-section-header">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 border rounded-md ${getStatusStyle(activeTicket.status).bg}`}>
                    {getStatusStyle(activeTicket.status).label}
                  </span>

                  <div className="flex gap-2">
                    <span className={getPriorityStyle(activeTicket.priority)}>
                      {activeTicket.priority || "MEDIUM"}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase font-mono tracking-tighter">
                      #{activeTicket.ticketNumber || activeTicket.id?.substring(0,6).toUpperCase()}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-black uppercase text-slate-900 tracking-tight line-clamp-1">
                    {activeTicket.subject || activeTicket.title || "Inbound Query Channel"}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[8px] text-slate-400 mt-0.5 font-mono uppercase tracking-widest font-black">
                    <Clock size={10} className="text-slate-300" />
                    <span>Registered: {formatTimestamp(activeTicket.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Central Information Body (Scrolling Messages) */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar" id="details-section-body">
                {/* Meta details grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col gap-0.5 shadow-sm">
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">Requester</span>
                    <span className="text-[9px] font-black text-slate-900 uppercase flex items-center gap-1 truncate">
                      <User size={10} className="text-amber-500" />
                      {activeTicket.driverName || activeTicket.customerName || "Channel Node"}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-100 flex flex-col gap-0.5 shadow-sm">
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">Category</span>
                    <span className="text-[9px] font-black text-slate-900 uppercase flex items-center gap-1 truncate">
                      <Tag size={10} className="text-amber-500" />
                      {activeTicket.category || "General Support"}
                    </span>
                  </div>
                </div>

                {/* Main Description */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-100 text-[10px] text-slate-600 leading-relaxed font-bold italic shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-1 opacity-60">Submission:</span>
                    "{activeTicket.description || 'No message recorded.'}"
                </div>

                {/* Real-time Live Message Board */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Transmission Logs</span>
                    <span className="text-[8px] font-bold text-emerald-500 uppercase flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      Live Feed
                    </span>
                  </div>

                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-8 opacity-40">
                        <MessageSquare size={24} className="mx-auto text-slate-300 mb-2" />
                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                          Silence on channel. Awaiting handshake.
                        </span>
                      </div>
                    ) : (
                      messages.map((m, mIdx) => {
                        const isHQ = m.senderRole === "HQ" || m.senderId === "HQ_ADMIN" || m.senderRole === 'admin';
                        return (
                          <div
                            key={m.id || `msg-${mIdx}`}
                            className={`flex flex-col max-w-[92%] ${
                              isHQ ? "ml-auto items-end" : "mr-auto items-start"
                            }`}
                          >
                            <div
                              className={`p-3 rounded-2xl text-[11px] leading-snug font-black shadow-sm ${
                                isHQ
                                  ? "bg-slate-900 text-white rounded-tr-none shadow-md shadow-slate-200"
                                  : "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
                              }`}
                            >
                              {m.text || m.content}
                            </div>
                            <span className="text-[7px] text-slate-400 mt-1 px-1 font-mono uppercase tracking-widest font-black">
                              {m.senderName || (isHQ ? "COMMAND_HUB" : "NODE")} • {m.timestamp ? formatTimestamp(m.timestamp) : "..."}
                            </span>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
              </div>

              {/* Action Operations Control panel footer (Fixed) */}
              <div className="shrink-0 p-4 border-t border-slate-100 bg-white" id="details-section-actions">
                {/* Send reply input */}
                {hasPermission('replyTickets') && (
                  <form onSubmit={handleSendMessage} className="flex gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800 shadow-xl mb-3" id="live-reply-form">
                      <input
                        type="text"
                        value={newMessage}
                        required
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type reply message..."
                        className="flex-1 px-3 py-2 bg-slate-800 border-none rounded-lg text-[10px] font-black text-white focus:outline-none placeholder:text-slate-500 font-mono"
                      />
                      <button
                        type="submit"
                        disabled={isSending || !newMessage.trim()}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase text-[9px] tracking-widest rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-1 cursor-pointer active:scale-95"
                      >
                        Send
                      </button>
                  </form>
                )}

                <div className="flex items-center justify-between gap-4">
                  {/* Status Change Selector buttons */}
                  {hasPermission('closeTickets') && (
                    <div className="flex items-center gap-2">
                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Status:</span>
                      <div className="flex items-center gap-1 p-1 bg-slate-50 border border-slate-100 rounded-xl">
                        <button
                          onClick={() => handleStatusChange(activeTicket.id!, "open")}
                          className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all ${
                            activeTicket.status?.toLowerCase() === "open"
                              ? "bg-rose-600 text-white shadow-sm"
                              : "text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          Open
                        </button>
                        <button
                          onClick={() => handleStatusChange(activeTicket.id!, "in_progress")}
                          className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all ${
                            activeTicket.status?.toLowerCase() === "in_progress"
                              ? "bg-amber-500 text-slate-900 shadow-sm"
                              : "text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          Active
                        </button>
                        <button
                          onClick={() => handleStatusChange(activeTicket.id!, "resolved")}
                          className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all ${
                            activeTicket.status?.toLowerCase() === "resolved"
                              ? "bg-emerald-600 text-white shadow-sm"
                              : "text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Absolute Purge Danger Button */}
                  {hasPermission('closeTickets') && (
                    <button
                      onClick={() => {
                          if(window.confirm("Terminate thread?")) {
                              handleDeleteTicket(activeTicket.id!);
                              setActiveTicketId(null);
                          }
                      }}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1"
                    >
                      <Trash2 size={12} /> Terminate
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manual Support Ticket Dialog/Modal Modal */}
      <AnimatePresence>
        {isNewTicketOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewTicketOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-xl bg-white border border-slate-100 p-6 md:p-8 rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div>
                  <h3 className="text-lg font-bold uppercase text-slate-900 leading-none">
                    Raise Support Ticket
                  </h3>
                  <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider mt-1.5">
                    Manual Coordinator Intake Console
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewTicketOpen(false)}
                  className="p-1.5 hover:bg-slate-50 border border-transparent hover:border-slate-100 text-slate-400 hover:text-slate-900 rounded-xl transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="space-y-4 text-left">
                {/* Type Selection */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                    Account Profile Type *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["DRIVER", "CUSTOMER", "FRANCHISE"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setNewType(t)}
                        className={`py-2 px-3 text-[10px] font-black uppercase rounded-xl border transition-all cursor-pointer text-center ${
                          newType === t
                            ? "bg-slate-900 border-slate-900 text-white"
                            : "bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                    Support Subject / Warning Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="e.g. Speed Limit Breached or Payment Plan Query"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all font-sans"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Requester Name */}
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                      Requester Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newRequesterName}
                      onChange={(e) => setNewRequesterName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                    />
                  </div>

                  {/* Requester Phone */}
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                      Requester Phone Number
                    </label>
                    <input
                      type="text"
                      value={newRequesterPhone}
                      onChange={(e) => setNewRequesterPhone(e.target.value)}
                      placeholder="e.g. +91 9876543210"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Requester UID */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                    Reference Account UID (Optional)
                  </label>
                  <input
                    type="text"
                    value={newRequesterId}
                    onChange={(e) => setNewRequesterId(e.target.value)}
                    placeholder="Provide unique Firestore ID if known"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Category */}
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                      Category
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-950 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                    >
                      <option value="Technical Support">Technical Support</option>
                      <option value="Billing & Pricing">Billing & Pricing</option>
                      <option value="Hardware Failures">Hardware Failures</option>
                      <option value="Policy & Agreements">Policy & Agreements</option>
                      <option value="General Check">General Check</option>
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                      Priority Level
                    </label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as any)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-950 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                    </select>
                  </div>
                </div>

                {/* Original Description */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                    Original Incident Logs / Description *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Describe the incident warnings or physical device faults completely..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all font-sans resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCreatingTicket}
                  className="w-full py-3 md:py-4 bg-slate-900 duration-150 hover:bg-slate-800 text-amber-500 font-bold uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 mt-2"
                >
                  {isCreatingTicket ? "Filing Inquiry..." : "Submit Support Ticket"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
