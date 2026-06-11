import React from 'react';
import { ShieldAlert, ArrowUpRight, Clock8 } from 'lucide-react';
import { SupportTicket } from '@/types';

interface SupportEscalationsProps {
  tickets: SupportTicket[];
}

export default function SupportEscalations({ tickets }: SupportEscalationsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Escalations</h2>
        <p className="text-sm font-medium text-gray-500 mt-2">Priority Support Tickets</p>
      </div>

      {tickets.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
          <ShieldAlert size={48} className="text-gray-300 mb-4" />
          <p className="text-sm font-semibold text-gray-600">No HQ Escalations</p>
          <p className="text-xs font-medium text-gray-500 mt-2 text-center max-w-sm">
            All systems nominal. There are no tickets requiring emergency escalation at this moment.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 font-sans">
          {tickets.map(ticket => (
            <div key={ticket.id} className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-md transition-all cursor-pointer shadow-sm group flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-50 rounded-lg text-red-655">
                  <ShieldAlert size={24} />
                </div>
                <div>
                   <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold uppercase tracking-wider text-red-700 bg-red-100 px-2 py-0.5 rounded border border-red-200">
                         HQ Escalated
                      </span>
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                         {ticket.ticketNumber || `TCK-${ticket.id.substring(0,6).toUpperCase()}`}
                      </span>
                   </div>
                   <h3 className="text-lg font-bold text-gray-900 tracking-tight leading-none mt-1.5">{ticket.title || ticket.subject || 'Support Request'}</h3>
                   <div className="flex items-center gap-3 mt-2 text-xs font-medium text-gray-500">
                      <span className="flex items-center gap-1.5"><Clock8 size={14} className="text-amber-500" /> {ticket.createdAt?.toMillis ? new Date(ticket.createdAt.toMillis()).toLocaleString() : 'Unknown Date'}</span>
                   </div>
                 </div>
               </div>
              <button className="flex items-center justify-center gap-2 px-6 py-2 bg-white text-gray-750 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 text-sm font-medium shadow-sm">
                RESOLVE INCIDENT <ArrowUpRight size={16} className="text-amber-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
