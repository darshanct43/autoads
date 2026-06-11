import React from 'react';
import { Bell, Inbox } from 'lucide-react';

export default function SupportNotifications() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 tracking-tight leading-none">System Alerts</h2>
        <p className="text-sm font-medium text-gray-500 mt-2 font-sans">Desk Signals & Global Syncs</p>
      </div>

      <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
        <Bell size={48} className="text-gray-300 mb-4" />
        <p className="text-sm font-semibold text-gray-600">Signal Inbox Empty</p>
        <p className="text-xs text-gray-500 mt-2 text-center max-w-sm">
          No new platform alerts to review at this time.
        </p>
      </div>
    </div>
  );
}
