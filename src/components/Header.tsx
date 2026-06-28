import React from 'react';
import { ShieldCheck, UserCheck } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  driverName?: string;
  isVerified?: boolean;
}

export default function Header({ activeTab, setActiveTab, driverName = "Darshan CT", isVerified = true }: HeaderProps) {
  return (
    <header className="bg-[#18181b] border-b border-[#27272a] sticky top-0 z-50 px-4 py-3" id="main_header">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Logos container */}
        <div className="flex items-center gap-4" id="logos_container">
          {/* App Icon: Yellow background, auto icon representation */}
          <div 
            className="w-10 h-10 bg-[#EAB308] rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/10 border border-yellow-400"
            id="app_icon_logo"
            title="AutoAds App Icon"
          >
            {/* SVG representation of an Auto Rickshaw */}
            <svg className="w-6 h-6 text-black" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 12h-2V7h1.5A1.5 1.5 0 0 1 20 8.5v2.5a1 1 0 0 1-1 1M5 12H3a1 1 0 0 1-1-1V8.5A1.5 1.5 0 0 1 3.5 7H5v5m7-5v5h-2V7h2m5-3v2H7V4h10M6 13h12a1 1 0 0 1 1 1v2.5a2.5 2.5 0 0 1-5 0V15H10v1.5a2.5 2.5 0 0 1-5 0V14a1 1 0 0 1 1-1m-1 5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m14 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>
            </svg>
          </div>

          <div className="h-6 w-[1px] bg-[#27272a]" />

          {/* Mayaan Logo: Black design on yellow/white tag */}
          <div 
            className="bg-[#FFFFFF] text-black px-3 py-1 rounded-lg font-bold font-display text-xs tracking-wider flex items-center" 
            id="mayaan_logo"
          >
            MAYAAN
          </div>
          
          <span className="text-sm font-display font-medium text-yellow-500 tracking-tight hidden md:inline ml-1">
            Driver & Fleet Portal
          </span>
        </div>

        {/* Navigation tabs */}
        <nav className="flex items-center flex-wrap gap-1 bg-[#09090b] p-1 rounded-xl border border-[#27272a]" id="portal_navigation">
          {(['driver', 'support', 'admin', 'terminal'] as const).map((tab) => {
            const labels: Record<string, string> = {
              driver: 'Driver Portal',
              support: 'Support Hub',
              admin: 'Admin Center',
              terminal: 'Terminal Unit'
            };
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                id={`tab_${tab}`}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? 'bg-[#EAB308] text-[#09090b] font-semibold shadow-md shadow-yellow-500/10' 
                    : 'text-[#a1a1aa] hover:text-[#e4e4e7] hover:bg-[#18181b]'
                }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </nav>

        {/* Driver Status Widget */}
        <div className="flex items-center gap-3 bg-[#09090b] px-3 py-1.5 rounded-xl border border-[#27272a]" id="user_widget">
          <div className="flex flex-col items-end">
            <span className="text-[11px] font-mono text-zinc-400">SESSION ID</span>
            <span className="text-xs font-semibold text-zinc-200">{driverName}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

      </div>
    </header>
  );
}
