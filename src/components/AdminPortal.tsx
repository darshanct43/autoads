import React, { useState } from 'react';
import { 
  Building, MapPin, Users, Award, ShieldAlert, Layers, BarChart3, AlertCircle 
} from 'lucide-react';

export default function AdminPortal() {
  const [activeRole, setActiveRole] = useState<'ADMIN' | 'MANAGER' | 'OPERATOR'>('ADMIN');
  const [activeCampaignStatus, setActiveCampaignStatus] = useState<'ACTIVE' | 'PAUSED'>('ACTIVE');

  // Multi-role permissions config
  const rolePermissions = {
    ADMIN: ['System Configuration', 'Deploy Campaigns', 'Access Revenue API', 'Financial Reconciliation', 'Root Level IoT commands'],
    MANAGER: ['Deploy Campaigns', 'Manage Support Relays', 'Re-assign Driver Nodes', 'Access limited financial logs'],
    OPERATOR: ['Manage Support Relays', 'Audit driver credentials', 'Check active SIM status']
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-6 px-4" id="admin_portal_root">
      
      {/* Title */}
      <div className="mb-6">
        <h2 className="text-xl font-bold font-display text-zinc-100 flex items-center gap-2">
          <Building className="w-5 h-5 text-yellow-500" /> AutoAds Command Admin Portal
        </h2>
        <p className="text-zinc-500 text-xs mt-1">Configure active system roles, inspect campaign room telemetry maps, and analyze revenue allocation logs.</p>
      </div>

      <div className="bg-[#18181b] border border-[#27272a] rounded-2xl shadow-xl overflow-hidden p-6 space-y-6">
        
        {/* Row 1: System Status & Permissions switcher */}
        <div className="flex flex-col md:flex-row items-start justify-between gap-4 border-b border-[#27272a] pb-6">
          <div>
            <h3 className="text-sm font-semibold text-zinc-200 font-display">System Operations Privilege Class</h3>
            <p className="text-xs text-zinc-500 mt-1">Authorized access routes are strictly isolated based on cryptography-backed roles.</p>
          </div>

          <div className="flex gap-1.5 bg-[#09090b] p-1 rounded-xl border border-[#27272a]">
            {(['ADMIN', 'MANAGER', 'OPERATOR'] as const).map((role) => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className={`px-3 py-1.5 text-[10px] font-bold font-mono tracking-wider rounded-lg transition-all cursor-pointer ${
                  activeRole === role 
                    ? 'bg-yellow-500 text-zinc-950 shadow shadow-yellow-500/10' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* Role Privileges list */}
        <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-4">
          <h4 className="text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wider mb-3">Privileges Enabled for {activeRole}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rolePermissions[activeRole].map((permission, index) => (
              <div key={index} className="flex items-center gap-2.5 text-xs text-zinc-400">
                <div className="w-1.5 h-1.5 bg-yellow-500/80 rounded-full" />
                <span>{permission}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Campaign Room & Cluster Map simulation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="border border-[#27272a] bg-[#09090b] rounded-2xl p-4">
            <h4 className="text-xs font-semibold text-zinc-300 font-mono uppercase tracking-widest mb-3">Live Fleet Clusters Map Overlay</h4>
            
            {/* Visual simulation of a leafet map cluster */}
            <div className="bg-zinc-950 border border-zinc-900 h-48 rounded-xl relative overflow-hidden flex items-center justify-center">
              {/* Fake styling matching Leaflet Map styling */}
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#eab308_1px,transparent_1px)] [background-size:16px_16px]" />
              
              {/* Map grid simulation lines */}
              <div className="absolute w-[1px] h-full bg-zinc-900 border-dashed left-1/3" />
              <div className="absolute w-[1px] h-full bg-zinc-900 border-dashed left-2/3" />
              <div className="absolute w-full h-[1px] bg-zinc-900 border-dashed top-1/2" />

              {/* Fake Clusters */}
              <div className="absolute top-1/4 left-1/3 bg-yellow-500 text-zinc-950 font-bold w-8 h-8 rounded-full flex items-center justify-center text-[10px] animate-pulse border border-yellow-400 shadow-lg shadow-yellow-500/20">
                24
              </div>
              <div className="absolute top-2/3 left-1/2 bg-yellow-500 text-zinc-950 font-bold w-6 h-6 rounded-full flex items-center justify-center text-[10px] border border-yellow-400">
                8
              </div>
              <div className="absolute top-1/2 left-2/3 bg-emerald-500 text-zinc-950 font-bold w-10 h-10 rounded-full flex items-center justify-center text-[10px] border border-emerald-400 shadow-lg shadow-emerald-500/20">
                42
              </div>

              {/* Status bar */}
              <div className="absolute bottom-2 left-2 right-2 bg-[#09090b]/90 border border-zinc-800 rounded px-2.5 py-1.5 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-red-500" /> Karnataka Zone Hub
                </span>
                <span className="text-emerald-400 text-xs font-bold">● GPS ONLINE</span>
              </div>
            </div>
          </div>

          <div className="border border-[#27272a] bg-[#09090b] rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-semibold text-zinc-300 font-mono uppercase tracking-widest mb-3">Revenue Hub Analytics</h4>
              <p className="text-xs text-zinc-400">Manage campaign pricing allocation and financial reconciliation across active channels.</p>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">PROGRAMMATIC CPM INDEX</span>
                  <strong className="text-zinc-300 font-mono">₹450.00 / 1K video views</strong>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">FLEET REVENUE RETENTION RATE</span>
                  <strong className="text-zinc-300 font-mono">82.5%</strong>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">ACTIVE CAMPAIGNS REGISTERED</span>
                  <strong className="text-zinc-300 font-mono">14 Active Ads</strong>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#27272a] mt-4 flex items-center justify-between">
              <span className="text-[10px] font-mono text-zinc-500">CAMPAIGN RUNNER STATE</span>
              <button 
                onClick={() => setActiveCampaignStatus(prev => prev === 'ACTIVE' ? 'PAUSED' : 'ACTIVE')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer ${
                  activeCampaignStatus === 'ACTIVE' 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                }`}
              >
                {activeCampaignStatus === 'ACTIVE' ? '⏸ PAUSE CAMPMAP' : '▶ RUN CAMPMAP'}
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
