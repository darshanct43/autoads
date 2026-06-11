import React from 'react';
import { 
  Users, 
  TrendingUp, 
  Activity, 
  DollarSign,
  Tablet,
  ChevronRight,
  ArrowUpRight,
  MessageSquare,
  Truck
} from 'lucide-react';
import { motion } from 'motion/react';
import { SupportTicket } from '@/types';

interface FranchiseOverviewProps {
  drivers: any[];
  campaigns: any[];
  terminals: any[];
  tickets: SupportTicket[];
}

export default function FranchiseOverview({ drivers, campaigns, terminals, tickets }: FranchiseOverviewProps) {
  const onlineDrivers = drivers.filter(d => d.status === 'ACTIVE').length;
  const activeCampaigns = campaigns.filter(c => c.status === 'LIVE' || c.status === 'ACTIVE').length;
  const openTickets = tickets.filter(t => t.status === 'OPEN' || t.status === 'open').length;

  const cards = [
    { 
      label: 'Driver Network', 
      value: `${onlineDrivers}/${drivers.length}`, 
      sub: 'Active / Total Registered',
      icon: Users, 
      color: 'blue' 
    },
    { 
      label: 'Fleet Reach', 
      value: terminals.length.toString(), 
      sub: 'Terminals Provisioned',
      icon: Tablet, 
      color: 'amber' 
    },
    { 
      label: 'Ad Exposure', 
      value: activeCampaigns.toString(), 
      sub: 'Active Campaigns',
      icon: TrendingUp, 
      color: 'emerald' 
    },
    { 
      label: 'Open Tickets', 
      value: openTickets.toString(), 
      sub: 'Require Attention',
      icon: MessageSquare, 
      color: 'red' 
    },
  ];

  // Derive real activity from the passed live objects
  const recentActivities: { id: string; text: string; time: number; type: string }[] = [];
  
  // Add newest drivers
  drivers?.forEach(d => {
    if (d.createdAt) {
      const time = d.createdAt.toMillis?.() || (typeof d.createdAt === 'number' ? d.createdAt : Date.now());
      recentActivities.push({
        id: `drv-${d.id}`,
        text: `Driver ${d.name || d.id} joined`,
        time,
        type: 'driver'
      });
    }
  });

  // Add newest tickets
  tickets?.forEach(t => {
    if (t.createdAt) {
      const time = t.createdAt.toMillis?.() || (typeof t.createdAt === 'number' ? t.createdAt : Date.now());
      recentActivities.push({
        id: `tkt-${t.id}`,
        text: `Ticket ${t.ticketNumber || `TCK-${t.id.substring(0,6).toUpperCase()}`} opened: ${t.title || 'Support Request'}`,
        time,
        type: 'ticket'
      });
    }
  });

  recentActivities.sort((a, b) => b.time - a.time);
  const displayActivities = recentActivities.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Executive Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">Real-time operational overview of your territory.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={card.label}
              className="bg-white border border-gray-200 p-6 rounded-xl hover:shadow-md transition-all shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg bg-${card.color}-50 text-${card.color}-600`}>
                  <Icon size={20} />
                </div>
              </div>

              <p className="text-sm font-medium text-gray-500">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
              <p className="text-xs text-gray-500 mt-1">{card.sub}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-6">Network Health</h3>
          <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 text-center p-6">
             <Activity className="w-10 h-10 text-gray-300 mx-auto mb-3" />
             <p className="text-sm font-medium text-gray-600">No active network health events to display</p>
             <p className="text-xs text-gray-500 mt-1">Telemetry will appear here when available</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {displayActivities.length > 0 ? (
              displayActivities.map(activity => (
                <div key={activity.id} className="flex gap-4 items-start pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex-shrink-0 flex items-center justify-center">
                    {activity.type === 'ticket' ? (
                      <MessageSquare size={14} className="text-blue-600" />
                    ) : (
                      <Truck size={14} className="text-blue-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 leading-snug">{activity.text}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(activity.time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">No recent operational activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
