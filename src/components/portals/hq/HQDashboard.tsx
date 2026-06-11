import React, { useState, useEffect } from 'react';
import { Activity, BarChart3, Database, Globe, MapPin, MonitorPlay, Users } from 'lucide-react';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export default function HQDashboard() {
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState({
    territories: 0,
    franchises: 0,
    activeDrivers: 0,
    revenue: 0,
    campaigns: 0
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">HQ Command Center</h1>
          <p className="text-sm text-gray-400 mt-1">National Operations & Strategy Overview</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-2">
            <Globe className="w-5 h-5 text-indigo-500" />
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Territories</h3>
          </div>
          <p className="text-4xl font-black text-gray-900">{metrics.territories}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-2">
            <Users className="w-5 h-5 text-blue-500" />
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Active Drivers</h3>
          </div>
          <p className="text-4xl font-black text-gray-900">{metrics.activeDrivers}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-2">
            <BarChart3 className="w-5 h-5 text-green-500" />
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Campaigns</h3>
          </div>
          <p className="text-4xl font-black text-gray-900">{metrics.campaigns}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-2">
            <Activity className="w-5 h-5 text-red-500" />
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">National Revenue</h3>
          </div>
          <p className="text-4xl font-black text-gray-900">₹{metrics.revenue.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-3xl p-8 mt-8">
        <h2 className="text-xl font-bold text-white mb-6">Operations Matrix</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <MapPin className="w-6 h-6 text-indigo-400 mb-3" />
            <h3 className="text-white font-bold mb-1">Territory Health</h3>
            <p className="text-slate-400 text-sm">Monitor SLA compliance and operational blockages across assigned territories.</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <MonitorPlay className="w-6 h-6 text-blue-400 mb-3" />
            <h3 className="text-white font-bold mb-1">Fleet & Devices</h3>
            <p className="text-slate-400 text-sm">Hardware telemetry, offline status, and maintenance workflow tracking.</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <Database className="w-6 h-6 text-green-400 mb-3" />
            <h3 className="text-white font-bold mb-1">Settlement Engine</h3>
            <p className="text-slate-400 text-sm">Review processing, pending, and settled disbursements across the network.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
