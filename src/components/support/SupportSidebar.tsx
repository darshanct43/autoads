import React from 'react';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import { 
  LayoutDashboard, Send, ClipboardCheck, Radio, Database, FileText, 
  Sliders, Sparkles, Users, Link, ShieldAlert, Monitor, Cpu, 
  Globe, DollarSign, Bell, ShieldCheck, LogOut, Ticket, AlertCircle, ChevronLeft, ChevronRight
} from 'lucide-react';

interface SupportSidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  onLogout: () => void;
  userRole?: string;
  userEmail?: string;
  badgeCounts?: Record<string, number>;
  hasPermission?: (key: string) => boolean;
}

export default function SupportSidebar({ activeTab, setActiveTab, onLogout, userRole, userEmail, badgeCounts = {}, hasPermission = () => true }: SupportSidebarProps) {
  const isManager = userRole === 'SUPPORT_MANAGER' || userRole === 'SUPPORT_TEAM' || userRole === 'ADMIN' || auth.currentUser?.email?.toLowerCase() === 'vijayathrishu@gmail.com' || userEmail?.toLowerCase() === 'vijayathrishu@gmail.com';
  const isAdmin = userRole === 'ADMIN';
  const [isExpanded, setIsExpanded] = React.useState(true);

  const managerGroups = [
    { title: 'Operations', items: [
      { id: 'DASHBOARD', title: 'Dashboard', icon: LayoutDashboard },
      { id: 'THOUGHT_OF_THE_DAY', title: 'Thought of the Day', icon: Sparkles },
      ...(hasPermission('viewPayments') ? [{ id: 'TRANSACTIONS', title: 'Transactions Registry', icon: DollarSign }] : []),
      ...(hasPermission('viewDevices') ? [{ id: 'TERMINAL_HUB', title: 'Terminal Fleet Control', icon: Cpu }] : []),
      ...(hasPermission('managePlans') ? [{ id: 'PLAN_MANAGEMENT', title: 'Plan Management', icon: Sliders }] : []),
      // Restricted Items (Admin only)
      ...(isAdmin ? [
        { id: 'REVENUE_CENTER', title: 'Revenue Hub', icon: DollarSign },
        { id: 'TERRITORY_MONITOR', title: 'Regional Map', icon: Globe },
      ] : []),
    ]},
    { title: 'Inbound', items: [
      ...(hasPermission('viewTickets') ? [{ id: 'SUPPORT_RELAY', title: 'Support Hub', icon: Ticket }] : []),
      { id: 'FRAUD_ALERTS', title: 'Security & Anomalies', icon: ShieldAlert },
    ]},
    { title: 'Distribution', items: [
      ...(hasPermission('startCampaigns') ? [{ id: 'COMPOSE_CAMPAIGN', title: 'Campaign Composer', icon: Send }] : []),
      ...(hasPermission('viewCampaigns') ? [{ id: 'LIVE_CAMPAIGNS', title: 'Live Campaigns', icon: Radio }] : []),
      ...(hasPermission('approveCampaigns') ? [{ id: 'MONITOR_QUEUE', title: 'Monitor Queue', icon: ClipboardCheck }] : []),
      ...(hasPermission('viewCampaigns') ? [{ id: 'GLOBAL_OFFERS', title: 'Global Offers', icon: Sparkles }] : []),
    ]},
    { title: 'Registry', items: [
      ...(hasPermission('viewDrivers') ? [{ id: 'DRIVER_KYC_BUREAU', title: 'Driver KYC Bureau', icon: Users }] : []),
      ...(hasPermission('viewDrivers') ? [{ id: 'QUOTES_REVIEW', title: 'Driver Quotes Review', icon: Sparkles }] : []),
    ]},
  ];

  const standardItems = [
    { id: 'OVERVIEW', title: 'Overview', icon: LayoutDashboard },
    { id: 'TICKETS', title: 'Tickets', icon: Ticket },
    { id: 'ESCALATIONS', title: 'Escalations', icon: AlertCircle },
    { id: 'QUALITY_CONTROL', title: 'Quality Control', icon: ClipboardCheck },
    { id: 'NOTIFICATIONS', title: 'Notifications', icon: Bell },
    { id: 'SETTINGS', title: 'Settings', icon: ShieldCheck }
  ];

  const sidebarGroups = isManager ? managerGroups : [{ title: 'Main', items: standardItems }];

  return (
    <div className={cn(
      "h-screen bg-white border-r border-slate-200 flex flex-col transition-all duration-300 z-50 shrink-0",
      isExpanded ? "w-64" : "w-16"
    )}>
      <div className="h-16 flex items-center px-4 border-b border-slate-100 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0 shadow-sm">
          <span className="font-bold text-amber-500">A</span>
        </div>
        {isExpanded && <span className="ml-3 font-bold text-slate-800 tracking-tight">Operations</span>}
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-5 custom-scrollbar">
        {sidebarGroups.map(group => (
          <div key={group.title} className="px-3 space-y-0.5">
            {isExpanded && <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{group.title}</p>}
            {group.items.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center w-full p-2 px-3 rounded-xl transition-all duration-200",
                    isActive ? "bg-slate-900 text-amber-500 shadow-lg font-bold" : "text-slate-500 hover:text-slate-950 hover:bg-slate-50"
                  )}
                  title={isExpanded ? "" : tab.title}
                >
                  <tab.icon size={16} className="shrink-0" />
                  {isExpanded && <span className="ml-3 text-[11px] font-semibold tracking-tight">{tab.title}</span>}
                  {badgeCounts[tab.id] > 0 && (
                    <span className={cn(
                      "text-[9px] font-bold px-1.5 py-0.5 rounded-lg ml-auto min-w-[18px] text-center",
                      isActive ? "bg-amber-500 text-slate-950" : "bg-rose-500 text-white"
                    )}>
                      {badgeCounts[tab.id]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-slate-100 shrink-0">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center w-full p-2 rounded-lg text-slate-500 hover:bg-slate-50 mb-1"
        >
          {isExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          {isExpanded && <span className="ml-3 text-[10px] font-black uppercase tracking-widest">Collapse</span>}
        </button>
        <button
          onClick={onLogout}
          className="flex items-center w-full p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <LogOut size={16} className="shrink-0" />
          {isExpanded && <span className="ml-3 text-[10px] font-bold uppercase tracking-widest">Sign Out</span>}
        </button>
      </div>
    </div>
  );
}
