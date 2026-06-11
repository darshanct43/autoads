import React, { useState } from 'react';
import { Map, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function TerritoryMonitor() {
  const [territories] = useState([]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Territory Monitor</h1>
          <p className="text-sm text-gray-400 mt-1">Geographic network health and franchise assignments</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900 p-6 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm font-bold uppercase">Healthy Domains</p>
            <p className="text-3xl font-black text-emerald-400 mt-1">0</p>
          </div>
          <CheckCircle2 className="w-10 h-10 text-emerald-500/50" />
        </div>
        <div className="bg-slate-900 p-6 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm font-bold uppercase">At Risk</p>
            <p className="text-3xl font-black text-amber-400 mt-1">0</p>
          </div>
          <ShieldAlert className="w-10 h-10 text-amber-500/50" />
        </div>
        <div className="bg-slate-900 p-6 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm font-bold uppercase">Critical</p>
            <p className="text-3xl font-black text-red-500 mt-1">0</p>
          </div>
          <AlertIcon className="w-10 h-10 text-red-500/50" />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mt-8">
        <div className="p-6 border-b border-gray-100 flex items-center space-x-3 bg-gray-50/50">
          <Map className="w-5 h-5 text-indigo-500" />
          <h2 className="text-lg font-bold text-gray-900">Territory Command Grid</h2>
        </div>
        <div className="p-8 text-center text-gray-500">
          Loading geographic sectors...
        </div>
      </div>
    </div>
  );
}

function AlertIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  )
}
