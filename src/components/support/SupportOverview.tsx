import React from 'react';
import { 
  Ticket, 
  ShieldAlert,
  Clock,
  CheckCircle,
  Inbox
} from 'lucide-react';
import { motion } from 'motion/react';
import { SupportTicket } from '@/types';
import { auth } from '@/lib/firebase';

interface SupportOverviewProps {
  tickets: SupportTicket[];
}

export default function SupportOverview({ tickets }: SupportOverviewProps) {
  const currentUserId = auth.currentUser?.uid;

  const openTickets = tickets.filter(t => t.status !== 'CLOSED' && t.status !== 'resolved');
  const resolvedTickets = tickets.filter(t => t.status === 'CLOSED' || t.status === 'resolved');
  const escalatedTickets = tickets.filter(t => t.assignedToHQ);
  const myAssignedTickets = tickets.filter(t => (t.status !== 'CLOSED' && t.status !== 'resolved') && ((t as any).assignedTo === currentUserId || t.userId === currentUserId));

  const cards = [
    { label: 'My Assigned Tickets', value: myAssignedTickets.length, icon: Ticket, color: 'indigo' },
    { label: 'Open Tickets', value: openTickets.length, icon: Clock, color: 'teal' },
    { label: 'Resolved Tickets', value: resolvedTickets.length, icon: CheckCircle, color: 'blue' },
    { label: 'Escalated Tickets', value: escalatedTickets.length, icon: ShieldAlert, color: 'rose' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Support Overview</h2>
        <p className="text-sm font-medium text-gray-500 mt-1">Live System Telemetry</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          const colorClass = 
            card.color === 'teal' ? 'bg-teal-55 text-teal-650 group-hover:text-teal-700' :
            card.color === 'blue' ? 'bg-blue-50 text-blue-600 group-hover:text-blue-700' :
            card.color === 'rose' ? 'bg-red-50 text-red-600 group-hover:text-red-700' :
            card.color === 'indigo' ? 'bg-indigo-50 text-indigo-600 group-hover:text-indigo-700' :
            'bg-amber-50 text-amber-600 group-hover:text-amber-700';

          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              key={card.label}
              className="bg-white border border-gray-200 p-6 rounded-xl relative overflow-hidden group hover:shadow-md transition-all cursor-pointer shadow-sm"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-lg transition-colors ${colorClass}`}>
                  <Icon size={20} />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-500">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
            </motion.div>
          );
        })}
      </div>

      {tickets.length === 0 && (
        <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
          <Inbox size={48} className="text-gray-300 mb-4" />
          <p className="text-sm font-semibold text-gray-600">No Support Data</p>
          <p className="text-xs font-medium text-gray-500 mt-2 text-center max-w-sm">
            There are currently no tickets logged in the system matching your scope.
          </p>
        </div>
      )}
    </div>
  );
}
