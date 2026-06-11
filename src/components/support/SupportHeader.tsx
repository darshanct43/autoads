import React from 'react';
import { 
  Bell, 
  Search, 
  User as UserIcon,
  Globe,
  Settings,
  HelpCircle
} from 'lucide-react';

interface SupportHeaderProps {
  userProfile: any;
}

export default function SupportHeader({ userProfile }: SupportHeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between sticky top-0 z-40 bg-opacity-95 backdrop-blur-sm">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-200">
          <Globe size={14} className="text-blue-600" />
          <span className="text-xs font-semibold text-gray-750">
            AUTOADS SUPPORT
            <span className="text-gray-400 font-medium ml-2 border-l border-gray-200 pl-2">
              Team Desk
            </span>
          </span>
        </div>
        
        <div className="hidden lg:flex relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Search Tickets..."
            className="bg-gray-50 border border-gray-200 rounded-xl py-1.5 pl-10 pr-4 text-sm font-medium text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-72 transition-all placeholder:text-gray-400 font-sans"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 border-r border-gray-200 pr-4">
          <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
            <HelpCircle size={18} />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
            <Settings size={18} />
          </button>
        </div>

        <button className="relative p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
          <Bell size={20} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 border-2 border-white bg-red-500 rounded-full"></span>
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-gray-900 leading-none">{userProfile?.name || 'Support Agent'}</p>
            <p className="text-xs font-semibold text-gray-400 uppercase mt-1 tracking-wider">{userProfile?.specialization || 'System Advisor'}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-gray-50 border border-gray-250 flex items-center justify-center text-gray-605 group cursor-pointer hover:bg-gray-100 hover:border-blue-500 transition-all shadow-sm">
            <UserIcon size={18} />
          </div>
        </div>
      </div>
    </header>
  );
}
