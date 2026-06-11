import React, { useState } from 'react';
import { 
  Ticket, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  Shield,
  ChevronRight,
  ArrowUpRight,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SupportTicket } from '@/types';

interface FranchiseTicketsProps {
  tickets: SupportTicket[];
  onCreateTicket: (ticket: any) => void;
  onUpdateStatus: (id: string, status: any) => void;
}

export default function FranchiseTickets({ tickets, onCreateTicket, onUpdateStatus }: FranchiseTicketsProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL'|'OPEN'|'RESOLVED'>('ALL');

  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM' as const,
    category: 'FRANCHISE'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateTicket(newTicket);
    setShowCreateModal(false);
    setNewTicket({ title: '', description: '', priority: 'MEDIUM', category: 'FRANCHISE' });
  };

  const filteredTickets = tickets.filter(t => {
    if (filterMode === 'OPEN' && t.status !== 'OPEN' && t.status !== 'IN_PROGRESS' && t.status !== 'open' && t.status !== 'in_progress') return false;
    if (filterMode === 'RESOLVED' && t.status !== 'CLOSED' && t.status !== 'resolved') return false;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!t.title?.toLowerCase().includes(term) && !t.ticketNumber?.toLowerCase().includes(term) && !t.id.toLowerCase().includes(term)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Support Tickets</h2>
          <p className="text-sm text-gray-500 mt-1">Formalized communication channel for all operational issues.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors shadow-sm flex items-center gap-2"
        >
          <Plus size={16} />
          Create New Ticket
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by ticket number or subject..."
            className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 pl-10 pr-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 px-2 md:border-l border-gray-200">
           <button onClick={() => setFilterMode('ALL')} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${filterMode === 'ALL' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}>All Tickets</button>
           <button onClick={() => setFilterMode('OPEN')} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${filterMode === 'OPEN' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}>Open</button>
           <button onClick={() => setFilterMode('RESOLVED')} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${filterMode === 'RESOLVED' ? 'bg-green-50 text-green-700' : 'text-gray-500 hover:bg-gray-50'}`}>Resolved</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filteredTickets.length === 0 ? (
          <div className="py-20 text-center bg-white border border-gray-200 rounded-xl shadow-sm">
             <Ticket size={48} className="mx-auto text-gray-300 mb-4" />
             <p className="text-sm font-medium text-gray-900">No operational tickets found</p>
             <p className="text-xs text-gray-500 mt-1">Clean slate. System performing within optimal parameters.</p>
          </div>
        ) : (
          filteredTickets.map((ticket, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={ticket.id}
              onClick={() => setSelectedTicket(ticket)}
              className="bg-white border border-gray-200 p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-shadow cursor-pointer shadow-sm group"
            >
              <div className="flex items-start gap-4 flex-1">
                <div className={`p-2.5 rounded-lg border ${
                  ticket.status === 'CLOSED' || ticket.status === 'resolved' 
                    ? 'bg-gray-50 border-gray-200 text-gray-400' 
                    : 'bg-blue-50 border-blue-100 text-blue-600'
                }`}>
                  <Ticket size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                      {ticket.ticketNumber || `TCK-${ticket.id.substring(0, 6).toUpperCase()}`}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      ticket.priority === 'HIGH' ? 'bg-red-50 text-red-700 border border-red-200' :
                      ticket.priority === 'MEDIUM' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                      'bg-gray-50 text-gray-600 border border-gray-200'
                    }`}>
                      {ticket.priority}
                    </span>
                  </div>
                  <h4 className="text-base font-semibold text-gray-900 truncate">{ticket.title || ticket.subject || 'Support Request'}</h4>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-xs font-medium text-gray-500">
                    <span className="flex items-center gap-1.5"><Clock size={14} /> {ticket.createdAt ? new Date(ticket.createdAt?.toMillis?.() || ticket.createdAt).toLocaleDateString() : 'Unknown'}</span>
                    <span className="flex items-center gap-1.5"><Shield size={14} /> {ticket.category || ticket.type || 'SYSTEM'}</span>
                    {ticket.assignedToHQ && (
                      <span className="flex items-center gap-1 text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
                        <ArrowUpRight size={12} /> Escalated to HQ
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-4 md:pt-0 border-gray-100">
                <div className="text-right">
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</p>
                   <div className="flex items-center gap-2 justify-end">
                      <div className={`w-2 h-2 rounded-full ${
                        ticket.status === 'CLOSED' || ticket.status === 'resolved' ? 'bg-gray-400' : 
                        ticket.status === 'IN_PROGRESS' || ticket.status === 'in_progress' ? 'bg-blue-500' : 'bg-yellow-500'
                      }`}></div>
                      <span className={`text-xs font-bold uppercase ${
                        ticket.status === 'CLOSED' || ticket.status === 'resolved' ? 'text-gray-500' : 'text-gray-900'
                      }`}>{ticket.status}</span>
                   </div>
                </div>
                <button className="p-2 text-gray-400 group-hover:text-gray-900 transition-colors bg-gray-50 rounded-lg">
                  <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Create Support Ticket</h3>
                  <p className="text-sm text-gray-500 mt-1">Submit a request to HQ Operations</p>
                </div>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Subject</label>
                  <input 
                    required
                    value={newTicket.title}
                    onChange={(e) => setNewTicket({...newTicket, title: e.target.value})}
                    placeholder="Briefly describe the issue..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-4 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Priority</label>
                    <select 
                      value={newTicket.priority}
                      onChange={(e: any) => setNewTicket({...newTicket, priority: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-4 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    >
                      <option value="LOW">LOW - Routine inquiry</option>
                      <option value="MEDIUM">MEDIUM - Need assistance</option>
                      <option value="HIGH">HIGH - Urgent blocker</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Category</label>
                    <select 
                      value={newTicket.category}
                      onChange={(e: any) => setNewTicket({...newTicket, category: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-4 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    >
                      <option value="FRANCHISE">FRANCHISE OPERATIONS</option>
                      <option value="DEVICE">DEVICE HARDWARE</option>
                      <option value="DRIVER">DRIVER MANAGEMENT</option>
                      <option value="CUSTOMER">CUSTOMER COMPLAINT</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Detailed Description</label>
                  <textarea 
                    required
                    rows={4}
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                    placeholder="Provide full context for HQ Support..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-3 px-4 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition-colors mt-2 shadow-sm"
                >
                  Submit Ticket
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
