import React, { useState } from 'react';
import { Search, SlidersHorizontal, Lock, Flame, Sparkles, TrendingUp, X, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStudio } from './StudioContext';

const CATEGORIES = [
  'All', 'Offer', 'Food', 'Political', 
  'Real Estate', 'Festival', 'Business', 'Local Store', 'Events'
];

interface Template {
  id: string;
  name: string;
  category: string;
  isPremium: boolean;
  thumbnail: string;
}

const TEMPLATES: Template[] = [
  { id: '1', name: 'Mega Sale', category: 'Offer', isPremium: false, thumbnail: '/ad_template_mega.png' },
  { id: '2', name: 'Summer Special', category: 'Offer', isPremium: true, thumbnail: '/ad_template_offer.png' },
  { id: '3', name: 'Burger Night', category: 'Food', isPremium: false, thumbnail: 'https://picsum.photos/seed/food1/400/500' },
  { id: '4', name: 'Vote Now', category: 'Political', isPremium: true, thumbnail: 'https://picsum.photos/seed/pol1/400/500' },
  { id: '5', name: 'Luxury Villa', category: 'Real Estate', isPremium: true, thumbnail: 'https://picsum.photos/seed/re1/400/500' },
  { id: '6', name: 'Diwali Special', category: 'Festival', isPremium: false, thumbnail: 'https://picsum.photos/seed/fest1/400/500' },
  { id: '7', name: 'Grand Opening', category: 'Business', isPremium: true, thumbnail: 'https://picsum.photos/seed/biz1/400/500' },
  { id: '8', name: 'Shop Local', category: 'Local Store', isPremium: false, thumbnail: 'https://picsum.photos/seed/local1/400/500' },
];

export const AssetPanel: React.FC<{ activeCategory: string; onClose: () => void }> = ({ activeCategory, onClose }) => {
  const [selectedCat, setSelectedCat] = useState('All');
  const { canAccess, loadTemplate, openUpgradeModal } = useStudio();
  const hasPremium = canAccess('premium_templates');

  const filteredTemplates = TEMPLATES.filter(t => 
    selectedCat === 'All' || t.category === selectedCat
  );

  return (
    <div className="w-[320px] h-full bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto no-scrollbar z-10 shadow-2xl relative">
      <button 
        onClick={onClose}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-white border border-slate-200 border-l-0 rounded-r-lg flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors z-30"
      >
        <ChevronLeft size={16} />
      </button>

      <div className="p-5 space-y-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">{activeCategory}</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded text-slate-400"><X size={16} /></button>
        </div>
        {/* Search */}
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors" size={16} />
          <input 
            type="text" 
            placeholder={`Search ${activeCategory}...`} 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500/50 transition-all font-medium shadow-inner"
          />
          <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
            <SlidersHorizontal size={14} />
          </button>
        </div>

        {/* Dynamic Content Based on Category */}
        {activeCategory === 'templates' && (
          <>
            {/* Categories Bar */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 border-b border-white/5">
              {CATEGORIES.map((cat) => (
                <button 
                  key={cat} 
                  onClick={() => setSelectedCat(cat)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all",
                    selectedCat === cat 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50" 
                      : "bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Dynamic Template Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp size={12} className="text-blue-400" />
                  {selectedCat} Templates
                </h3>
                <span className="text-[10px] font-bold text-slate-600">{filteredTemplates.length} matches</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {filteredTemplates.map((template) => (
                  <div 
                    key={template.id} 
                    onClick={() => {
                      if (template.isPremium && !hasPremium) return;
                      loadTemplate(template.thumbnail);
                    }}
                    className={cn(
                      "aspect-[4/5] bg-slate-900 rounded-2xl border border-slate-700/50 overflow-hidden group cursor-pointer relative transition-all duration-300",
                      "hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]",
                      template.isPremium && !hasPremium && "opacity-60 grayscale-[0.5]"
                    )}
                  >
                    <img 
                      src={template.thumbnail} 
                      alt={template.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                    />
                    
                    {/* Overlay Metadata */}
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent translate-y-2 group-hover:translate-y-0 transition-transform opacity-0 group-hover:opacity-100">
                      <p className="text-[10px] font-bold text-white truncate">{template.name}</p>
                      <p className="text-[8px] font-medium text-slate-400 uppercase tracking-wider">{template.category}</p>
                    </div>

                    {/* Premium Gating Icon */}
                    {template.isPremium && (
                      <div className={cn(
                        "absolute top-2 right-2 w-6 h-6 rounded-lg flex items-center justify-center shadow-lg",
                        hasPremium ? "bg-blue-500/80 text-white" : "bg-amber-500 text-white"
                      )}>
                        {hasPremium ? <Sparkles size={12} /> : <Lock size={12} />}
                      </div>
                    )}

                    {/* Lock Overlay for non-premium users */}
                    {template.isPremium && !hasPremium && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity p-4 text-center">
                          <div className="w-10 h-10 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mb-2">
                            <Lock size={18} />
                          </div>
                          <p className="text-[10px] font-black text-white uppercase tracking-widest leading-tight">Upgrade to Premium</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeCategory !== 'templates' && (
          <div className="flex flex-col items-center justify-center h-48 space-y-4 text-center">
             <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-slate-600 shadow-inner">
                 <Sparkles size={24} />
             </div>
             <div>
                <p className="text-xs font-black text-white uppercase tracking-widest leading-none mb-2">{activeCategory} Library</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Connect Premium Account to edit items</p>
             </div>
          </div>
        )}

        {/* Action Promo */}
        {!hasPremium && (
          <div 
            onClick={() => openUpgradeModal()}
            className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden group cursor-pointer hover:shadow-blue-900/40 transition-all mt-4"
          >
             <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-80 underline decoration-blue-300">Starter Pack</p>
                <h4 className="font-bold text-sm mb-3">Unlock 500+ Premium Layouts</h4>
                <button className="w-full bg-white text-blue-600 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 transition-colors pointer-events-none">
                  Upgrade Now
                </button>
             </div>
             <Flame className="absolute -right-4 -bottom-4 w-20 h-20 text-white/10 group-hover:text-white/20 transition-all group-hover:scale-110" />
          </div>
        )}
      </div>
    </div>
  );
};
