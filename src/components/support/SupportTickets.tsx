import React, { useState } from 'react';
import { 
  Ticket, 
  Filter, 
  MoreVertical,
  MapPin,
  X,
  Plus,
  Send,
  MessageSquare,
  AlertCircle,
  Clock,
  User,
  ShieldAlert,
  Tag,
  CheckCircle2,
  ListFilter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SupportTicket } from '@/types';
import { doc, updateDoc, arrayUnion, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { copyToClipboard } from '@/lib/utils';

interface SupportTicketsProps {
  tickets: SupportTicket[];
  onUpdateStatus: (id: string, status: any) => void;
  onEscalate?: (id: string) => void;
}

export default function SupportTickets({ tickets, onUpdateStatus, onEscalate }: SupportTicketsProps) {
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [filterType, setFilterType] = useState<'CUSTOMER' | 'DRIVER' | 'SUPPORT_TEAM' | 'ESCALATED'>('SUPPORT_TEAM');
  const [copiedId, setCopiedId] = useState(false);

  // Sync selectedTicket with updated tickets prop to support real-time send & receive chat!
  React.useEffect(() => {
    if (selectedTicket) {
      const updated = tickets.find(t => t.id === selectedTicket.id);
      if (updated) {
        setSelectedTicket(updated);
      }
    }
  }, [tickets, selectedTicket?.id]);

  // Create ticket form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTicketType, setNewTicketType] = useState<'DRIVER' | 'CUSTOMER' | 'SUPPORT_TEAM'>('DRIVER');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState('HARDWARE');
  const [ticketPriority, setTicketPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [requesterName, setRequesterName] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Chat message send state
  const [chatMessage, setChatMessage] = useState('');
  const [sendLoading, setSendLoading] = useState(false);

  let filteredTickets = tickets;
  if (filterType === 'ESCALATED') {
    filteredTickets = tickets.filter(t => t.assignedToHQ);
  } else {
    filteredTickets = tickets.filter(t => t.type === filterType);
  }

  // Handle support ticket creation
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim() || !requesterName.trim()) return;

    setCreateLoading(true);
    try {
      const generatedNumber = `TCK-${Math.floor(100000 + Math.random() * 900000)}`;
      const currentUid = auth.currentUser?.uid || 'HQ_SERVICE';
      
      const newTicketData = {
        userId: currentUid,
        createdBy: currentUid,
        type: newTicketType,
        subject: ticketSubject.trim(),
        message: ticketMessage.trim(),
        description: ticketMessage.trim(),
        status: 'OPEN',
        priority: ticketPriority,
        createdAt: new Date().toISOString(), // Fallback
        updatedAt: new Date().toISOString(),
        cityId: 'KA-01 (Bangalore East)',
        franchiseId: 'FRN-KA-01-BLR',
        driverName: newTicketType === 'DRIVER' ? requesterName.trim() : '',
        customerName: newTicketType === 'CUSTOMER' ? requesterName.trim() : '',
        driverId: newTicketType === 'DRIVER' ? 'DRV-GEN-' + Math.floor(1000 + Math.random() * 9000) : '',
        customerId: newTicketType === 'CUSTOMER' ? 'CUS-GEN-' + Math.floor(1000 + Math.random() * 9000) : '',
        category: ticketCategory,
        ticketNumber: generatedNumber,
        messages: [
          {
            role: 'system',
            senderName: 'System Core',
            content: `Support Ticket initialized via Manager Dashboard. Subject: ${ticketSubject.trim()}`,
            timestamp: new Date().toISOString()
          },
          {
            role: 'client',
            senderName: requesterName.trim(),
            content: ticketMessage.trim(),
            timestamp: new Date().toISOString()
          }
        ]
      };

      await addDoc(collection(db, 'supportTickets'), newTicketData);
      
      // Close modal and reset fields
      setShowCreateModal(false);
      setTicketSubject('');
      setTicketMessage('');
      setRequesterName('');
    } catch (err) {
      console.error("Error creating ticket:", err);
    } finally {
      setCreateLoading(false);
    }
  };

  // Handle Live Chat Message Send
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !selectedTicket) return;

    setSendLoading(true);
    try {
      const senderName = auth.currentUser?.email?.split('@')[0] || 'Support Manager';
      const messageObj = {
        role: 'admin',
        senderName: senderName,
        content: chatMessage.trim(),
        timestamp: new Date().toISOString()
      };

      const ticketRef = doc(db, 'supportTickets', selectedTicket.id);
      await updateDoc(ticketRef, {
        messages: arrayUnion(messageObj),
        updatedAt: serverTimestamp()
      });

      // Update local detailed state immediately
      const updatedMessages = [...(selectedTicket.messages || []), messageObj];
      setSelectedTicket({
        ...selectedTicket,
        messages: updatedMessages
      });
      setChatMessage('');
    } catch (err) {
      console.error("Error sending communication response:", err);
    } finally {
      setSendLoading(false);
    }
  };

  // Safe Date string parsing
  const formatTicketDate = (ts: any) => {
    if (!ts) return 'Just now';
    if (ts.toDate && typeof ts.toDate === "function") {
      return new Date(ts.toDate()).toLocaleString();
    }
    if (ts.seconds) {
      return new Date(ts.seconds * 1000).toLocaleString();
    }
    return new Date(ts).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Upper header section */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight leading-none">Support Tickets</h2>
          <p className="text-sm font-medium text-gray-500 mt-2">Managing Support Queue Lifecycle</p>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={() => setShowCreateModal(true)}
             className="px-4 py-2 bg-emerald-600 border border-emerald-500 text-sm font-medium text-white rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-sm shadow-emerald-100"
             id="create-new-ticket-button"
           >
              <Plus size={16} />
              Open New Ticket
           </button>
           <button className="px-4 py-2 bg-white border border-gray-200 text-sm font-medium text-gray-700 rounded-xl hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm">
              <Filter size={16} className="text-gray-400" />
              Filters
           </button>
         </div>
      </div>

      {/* Categories filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
         {['CUSTOMER', 'DRIVER', 'SUPPORT_TEAM', 'ESCALATED'].map((t) => (
            <button 
              key={t}
              onClick={() => setFilterType(t as any)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap shadow-sm border ${
                filterType === t 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                  : 'bg-white text-gray-600 border-gray-200 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {t === 'SUPPORT_TEAM' ? 'Support Team' : t} Tickets
            </button>
         ))}
      </div>

      {/* Tickets stream board table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Identity</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Context</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status & Priority</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-20 text-gray-500 font-medium bg-gray-50/50">
                    <Ticket size={32} className="mx-auto mb-3 opacity-30 text-gray-400" />
                    No support tickets match the current queue parameters.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50 transition-all group cursor-pointer" onClick={() => setSelectedTicket(ticket)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border text-xs font-bold ${
                          ticket.type === 'DRIVER' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          ticket.type === 'CUSTOMER' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          'bg-teal-50 text-teal-600 border-teal-100'
                        }`}>
                          {ticket.type?.substring(0, 3)}
                        </div>
                        <div>
                          <p className="font-bold sm:text-sm text-slate-900 font-mono leading-none tracking-tight">
                            {ticket.ticketNumber || `TCK-GEN-${ticket.id?.substring(0, 6).toUpperCase()}`}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono mt-1 font-bold">
                            UID: <span className="font-extrabold text-slate-500">{ticket.id}</span>
                          </p>
                          <p className="text-[9px] text-slate-400 font-bold mt-1.5 uppercase font-mono">
                            {formatTicketDate(ticket.createdAt)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-gray-400" />
                          <div>
                              <p className="text-sm font-semibold text-gray-900">{ticket.cityId || 'REGIONAL'}</p>
                              <p className="text-xs font-medium text-gray-500">{ticket.franchiseId || 'HQ CONTROL'}</p>
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <p className="text-sm font-semibold text-gray-900 leading-snug">{ticket.subject}</p>
                       <p className="text-xs text-gray-500 truncate w-48 mt-1">{ticket.message || ticket.description}</p>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex flex-col gap-2 font-sans">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold w-fit border ${
                            ticket.priority === 'HIGH' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-gray-100 text-gray-650 border-gray-200'
                          }`}>
                             {ticket.priority} PRIORITY
                          </span>
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
                            ticket.status === 'CLOSED' ? 'text-gray-500' : 'text-teal-650 font-sans'
                          }`}>
                             <div className={`w-1.5 h-1.5 rounded-full ${ticket.status === 'CLOSED' ? 'bg-gray-400' : 'bg-teal-500'}`}></div>
                             {ticket.status}
                          </span>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button className="p-2 text-gray-400 hover:text-gray-700 transition-colors">
                          <MoreVertical size={16} />
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dynamic Interaction & Conversation Modal overlay */}
      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
             <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="w-full max-w-2xl bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[85vh] text-gray-800"
               id="ticket-detailed-chat-modal"
             >
                {/* Modal Header */}
                <div className="p-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                   <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                         <Ticket size={20} />
                      </div>
                      <div className="flex flex-col text-left">
                         <h3 className="text-base font-black text-slate-900 font-mono leading-tight">
                            {selectedTicket.ticketNumber || `TCK-GEN-${selectedTicket.id?.substring(0, 6).toUpperCase()}`}
                         </h3>
                         <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">
                               UID: <span className="text-slate-650 font-black">{selectedTicket.id}</span>
                            </span>
                            <button
                              onClick={() => {
                                copyToClipboard(selectedTicket.id || "");
                                setCopiedId(true);
                                setTimeout(() => setCopiedId(false), 2000);
                              }}
                              className="text-[8px] bg-white hover:bg-slate-100 text-slate-600 font-bold font-mono px-1.5 py-0.5 rounded border border-slate-200 uppercase transition-colors"
                            >
                              {copiedId ? "Copied!" : "Copy ID"}
                            </button>
                         </div>
                      </div>
                   </div>
                   <button onClick={() => setSelectedTicket(null)} className="p-2 text-gray-400 hover:text-gray-650 hover:bg-gray-100 rounded-lg transition-all"><X size={18} /></button>
                </div>

                {/* Main scrollable body split into metadata and messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/50">
                   {/* Meta cards */}
                   <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                         <p className="text-[9px] font-black uppercase text-gray-400">Requester Name</p>
                         <p className="text-xs font-bold text-gray-900 mt-1 flex items-center gap-1">
                           <User size={12} className="text-slate-400" />
                           {selectedTicket.driverName || selectedTicket.customerName || 'Staff Member'}
                         </p>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                         <p className="text-[9px] font-black uppercase text-gray-400">Category Node</p>
                         <p className="text-xs font-bold text-indigo-600 mt-1 uppercase flex items-center gap-1">
                           <Tag size={12} className="text-indigo-400" />
                           {selectedTicket.category || 'GENERAL'}
                         </p>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                         <p className="text-[9px] font-black uppercase text-gray-400">Territory Scoping</p>
                         <p className="text-xs font-bold text-emerald-600 mt-1 flex items-center gap-1">
                           <MapPin size={12} className="text-emerald-400" />
                           {selectedTicket.cityId || 'Platform Control'}
                         </p>
                      </div>
                   </div>

                   {/* Initial submissions note */}
                   <div className="bg-white p-4 rounded-xl border border-gray-150 space-y-1 mt-2">
                      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-slate-400">
                         <AlertCircle size={11} className="text-blue-500" />
                         <span>Submission Context Summary</span>
                      </div>
                      <p className="text-xs text-gray-700 italic font-semibold pl-4 border-l-2 border-slate-200">
                         "{selectedTicket.message || selectedTicket.description || 'No descriptive payload submitted.'}"
                      </p>
                   </div>

                   {/* REAL CONVERSATION STREAM */}
                   <div className="space-y-4 pt-2">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                         <MessageSquare size={12} />
                         Conversation Logs
                      </h4>
                      
                      <div className="space-y-3 p-4 bg-white rounded-2xl border border-gray-150 h-56 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                        {(!selectedTicket.messages || selectedTicket.messages.length === 0) ? (
                          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-400">
                             <MessageSquare size={24} className="opacity-30 mb-1" />
                             <p className="text-xs font-semibold">No direct messages logged.</p>
                             <p className="text-[9px] mt-0.5">Initialize the dialog by typing below.</p>
                          </div>
                        ) : (
                          selectedTicket.messages.map((msg: any, idx: number) => {
                            const isSystem = msg.role === 'system';
                            const isAdmin = msg.role === 'admin';
                            
                            if (isSystem) {
                              return (
                                <div key={idx} className="self-center bg-gray-100 border border-gray-200 text-[10px] text-gray-600 font-bold px-3 py-1 rounded-full text-center">
                                  {msg.content} <span className="text-[8px] text-gray-400 font-mono ml-1">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                              );
                            }
                            
                            return (
                              <div 
                                key={idx} 
                                className={`flex flex-col max-w-[75%] gap-0.5 ${
                                  isAdmin ? 'self-end items-end' : 'self-start items-start'
                                }`}
                              >
                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
                                  {msg.senderName || (isAdmin ? 'Support desk' : 'Client')}
                                </span>
                                <div className={`p-3 rounded-2xl text-xs font-semibold ${
                                  isAdmin 
                                    ? 'bg-blue-600 text-white rounded-tr-none' 
                                    : 'bg-slate-100 text-gray-800 rounded-tl-none'
                                }`}>
                                   <p>{msg.content}</p>
                                </div>
                                <span className="text-[7px] text-gray-400 font-mono mt-0.5">
                                   {msg.timestamp ? new Date(msg.timestamp).toLocaleString() : 'Just now'}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                   </div>

                   {/* LIVE CHAT RESPONSE FORM */}
                   <form onSubmit={handleSendChatMessage} className="bg-white border border-gray-200 rounded-xl p-2 flex gap-2 items-center shadow-inner">
                      <input 
                         type="text"
                         value={chatMessage}
                         onChange={(e) => setChatMessage(e.target.value)}
                         placeholder="Type your response to client dialog..."
                         className="flex-1 text-xs px-3 py-2 bg-transparent outline-none font-semibold text-gray-800"
                         disabled={sendLoading}
                      />
                      <button 
                         type="submit"
                         disabled={sendLoading || !chatMessage.trim()}
                         className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                      >
                         <Send size={15} />
                      </button>
                   </form>

                   {/* Action row commands */}
                   <section className="space-y-3 pt-4 border-t border-gray-200">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Lifecycle Operations Center</p>
                      <div className="grid grid-cols-2 gap-3">
                         <button 
                           onClick={() => {
                             onUpdateStatus(selectedTicket.id, 'IN_PROGRESS');
                             setSelectedTicket(prev => prev ? {...prev, status: 'IN_PROGRESS'} : null);
                           }}
                           className="py-2.5 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-all shadow-sm"
                         >
                            Mark Active (In Progress)
                         </button>
                         <button 
                           onClick={() => {
                             onUpdateStatus(selectedTicket.id, 'CLOSED');
                             setSelectedTicket(prev => prev ? {...prev, status: 'CLOSED'} : null);
                           }}
                           className="py-2.5 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-green-600 hover:bg-green-50 transition-all shadow-sm"
                         >
                            Mark Resolved
                         </button>
                         {!selectedTicket.assignedToHQ ? (
                            <button 
                              onClick={() => {
                                onEscalate?.(selectedTicket.id);
                                setSelectedTicket(prev => prev ? {...prev, assignedToHQ: true} : null);
                              }}
                              className="col-span-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs tracking-wider uppercase hover:translate-y-[-1px] transition-all shadow-md shadow-red-200/50"
                            >
                                Escalate Ticket to HQ
                            </button>
                         ) : null}
                      </div>
                   </section>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE NEW TICKET MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
             <motion.div
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xl flex flex-col text-gray-800"
               id="support-ticket-create-modal"
             >
                {/* Header */}
                <div className="p-5 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                   <div className="flex items-center gap-2.5">
                      <Ticket className="text-emerald-600" size={20} />
                      <h3 className="text-base font-bold text-gray-900 font-sans uppercase tracking-tight">Open Support Ticket</h3>
                   </div>
                   <button onClick={() => setShowCreateModal(false)} className="p-1.5 text-gray-400 hover:text-gray-650 hover:bg-gray-100 rounded-lg transition-all"><X size={18} /></button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
                   <div className="grid grid-cols-2 gap-3">
                      <div>
                         <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Source Channel Type</label>
                         <select
                           value={newTicketType}
                           onChange={(e) => setNewTicketType(e.target.value as any)}
                           className="w-full mt-1.5 text-xs font-semibold text-gray-700 bg-slate-55 bg-white border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500"
                         >
                            <option value="DRIVER">Driver Node</option>
                            <option value="CUSTOMER">Customer Account</option>
                            <option value="SUPPORT_TEAM">Support Team Desk</option>
                         </select>
                      </div>
                      <div>
                         <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Queue Priority</label>
                         <select
                           value={ticketPriority}
                           onChange={(e) => setTicketPriority(e.target.value as any)}
                           className="w-full mt-1.5 text-xs font-semibold text-gray-700 bg-slate-55 bg-white border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500"
                         >
                            <option value="LOW">Low Queue</option>
                            <option value="MEDIUM">Medium Queue</option>
                            <option value="HIGH">High Priority (Urgent)</option>
                         </select>
                      </div>
                   </div>

                   <div>
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Category / Topic Area</label>
                      <select
                        value={ticketCategory}
                        onChange={(e) => setTicketCategory(e.target.value)}
                        className="w-full mt-1.5 text-xs font-semibold text-gray-700 bg-slate-55 bg-white border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500"
                      >
                         <option value="HARDWARE">Hardware & Screen Connectivity</option>
                         <option value="REVENUE">Wallet & Earnings Payouts</option>
                         <option value="CAMPAIGN">Campaign Plays & Media Errors</option>
                         <option value="KYC">KYC & Document Verification</option>
                         <option value="GENERAL">General Operational Issues</option>
                      </select>
                   </div>

                   <div>
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Client Identity / Name</label>
                      <input 
                         type="text"
                         value={requesterName}
                         onChange={(e) => setRequesterName(e.target.value)}
                         placeholder="Enter driver name or customer name"
                         className="w-full mt-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500"
                         required
                      />
                   </div>

                   <div>
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Subject Title</label>
                      <input 
                         type="text"
                         value={ticketSubject}
                         onChange={(e) => setTicketSubject(e.target.value)}
                         placeholder="Brief title summarizing the issue"
                         className="w-full mt-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500"
                         required
                      />
                   </div>

                   <div>
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Primary Submission Statement</label>
                      <textarea
                         value={ticketMessage}
                         onChange={(e) => setTicketMessage(e.target.value)}
                         placeholder="Provide descriptive details of the problem..."
                         className="w-full mt-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl px-3 py-2.5 h-24 outline-none resize-none focus:border-blue-500"
                         required
                      />
                   </div>

                   <button
                      type="submit"
                      disabled={createLoading}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-emerald-100 disabled:opacity-50 cursor-pointer active:scale-95"
                   >
                      {createLoading ? 'Initializing Ticket...' : 'Deploy Support Ticket'}
                   </button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
