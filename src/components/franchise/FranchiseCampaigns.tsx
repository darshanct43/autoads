import React from 'react';
import { 
  TrendingUp, 
  MapPin, 
  Calendar,
  Layers,
  ArrowUpRight,
  ExternalLink,
  DollarSign,
  Image as ImageIcon,
  Video
} from 'lucide-react';
import { motion } from 'motion/react';

interface FranchiseCampaignsProps {
  campaigns: any[];
}

export default function FranchiseCampaigns({ campaigns }: FranchiseCampaignsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Campaign Operations</h2>
        <p className="text-sm text-gray-500 mt-1">Monitor active marketing deployments in your assigned territory.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {campaigns.length === 0 ? (
          <div className="col-span-full py-16 bg-white border border-gray-200 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
            <TrendingUp size={40} className="mb-4 text-gray-300" />
            <p className="text-base font-semibold text-gray-900">No active campaigns</p>
            <p className="text-sm text-gray-500 mt-1">There are no operational campaigns running in this territory yet.</p>
          </div>
        ) : (
          campaigns.map((camp, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={camp.id} 
              className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow group shadow-sm flex flex-col"
            >
              <div className="aspect-video bg-gray-100 relative overflow-hidden flex-shrink-0">
                {camp.mediaUrl ? (
                  <img src={camp.mediaUrl} alt={camp.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    {camp.mediaType === 'VIDEO' ? <Video size={48} /> : <ImageIcon size={48} />}
                  </div>
                )}
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-md shadow-sm border ${
                    camp.status === 'LIVE' ? 'bg-green-50 z-10 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}>
                    {camp.status || 'LIVE'}
                  </span>
                  <span className="px-2.5 py-1 bg-white/90 backdrop-blur-sm text-gray-700 text-xs font-semibold rounded-md shadow-sm border border-gray-200">
                    {camp.mediaType || 'VIDEO'}
                  </span>
                </div>
              </div>
              
              <div className="p-5 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-base font-bold text-gray-900">{camp.title}</h4>
                    <p className="text-xs text-gray-500 mt-1">Client: {camp.clientName || 'Direct Network'}</p>
                  </div>
                  <button className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors">
                    <ExternalLink size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-100 mt-auto">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                      <DollarSign size={14} className="text-green-600" />
                      Budget Share
                    </div>
                    <p className="text-sm font-bold text-gray-900">₹{(camp.budget || camp.franchiseShare || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                      <Layers size={14} className="text-blue-600" />
                      Fleet Load
                    </div>
                    <p className="text-sm font-bold text-gray-900">{camp.assignedDrivers?.length || 0} Drivers</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                   <div className="flex items-center gap-1.5">
                      <Calendar size={14} />
                      {camp.createdAt ? new Date(camp.createdAt).toLocaleDateString() : 'Unknown Date'}
                   </div>
                   <div className="flex items-center gap-1 text-green-600 font-medium">
                      <ArrowUpRight size={14} />
                      Active Performance
                   </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
