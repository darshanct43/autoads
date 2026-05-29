import React, { useState } from 'react';
import { Search, SlidersHorizontal, Lock, Flame, Sparkles, TrendingUp, X, ChevronLeft, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStudio } from './StudioContext';
import { useDynamicStudio } from './StudioDynamicContext';

export const AssetPanel: React.FC<{ activeCategory: string; onClose: () => void }> = ({ activeCategory, onClose }) => {
  const [selectedCat, setSelectedCat] = useState('All');
  const { canAccess, loadTemplate, openUpgradeModal, userRole } = useStudio();
  const { templates: dynamicTemplates, categories: dynamicCategories, aiModels, editingTools } = useDynamicStudio();
  
  const hasPremium = canAccess('premium_templates');
  const isAdminOrStaff = userRole === 'ADMIN' || userRole === 'STAFF';

  // Extract category names from the dynamic categories
  const categoryNames = ['All', ...dynamicCategories.map(c => c.name)];

  // Fallback items if dynamic lists are empty
  const defaultTemplates = [
    { id: '1', name: 'Mega Sale', category: 'Offer', isPremium: false, thumbnail: 'https://picsum.photos/seed/offer1/400/500' }
  ];

  const templatesList = dynamicTemplates.length > 0 
    ? dynamicTemplates.map(t => ({ id: t.id!, name: t.name, category: t.category || 'Uncategorized', isPremium: false, thumbnail: t.imageUrl || 'https://picsum.photos/seed/pol1/400/500' })) 
    : defaultTemplates;

  const filteredTemplates = templatesList.filter(t => 
    selectedCat === 'All' || t.category === selectedCat
  );

  const renderActiveCategoryContent = () => {
    if (activeCategory === 'templates') {
      return (
        <>
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 relative">
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none" />
            
            {categoryNames.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-200 border",
                  selectedCat === cat 
                    ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/10" 
                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-900"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 pb-24">
            {filteredTemplates.map(template => (
              <div 
                key={template.id} 
                className="group relative cursor-pointer"
                onClick={() => {
                  if (template.isPremium && !hasPremium && !isAdminOrStaff) {
                     openUpgradeModal();
                  } else {
                     loadTemplate(template.thumbnail);
                  }
                }}
              >
                <div className="aspect-[4/5] bg-slate-100 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 relative transition-all duration-300 group-hover:shadow-xl group-hover:shadow-slate-900/10 group-hover:-translate-y-1">
                  <img 
                    src={template.thumbnail}
                    alt={template.name}
                    className="w-full h-full object-cover"
                  />
                  
                  {template.isPremium && !hasPremium && !isAdminOrStaff && (
                    <div className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm">
                      <Lock size={12} className="text-amber-500" />
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] font-black text-white uppercase tracking-widest truncate">{template.name}</p>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredTemplates.length === 0 && (
               <div className="col-span-2 text-center text-slate-400 py-10 font-bold text-xs uppercase tracking-widest">
                 No templates found
               </div>
            )}
          </div>
        </>
      );
    }
    
    if (activeCategory === 'ai') {
      return (
        <div className="space-y-4 pb-24">
           {aiModels.map(model => (
              <button key={model.id} className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col items-start gap-2 hover:border-amber-500 hover:shadow-md transition-all text-left group">
                 <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                   <Wand2 size={16} />
                 </div>
                 <h3 className="text-xs font-black uppercase text-slate-900 tracking-widest">{model.name}</h3>
                 <p className="text-[10px] text-slate-500 leading-relaxed">{model.description}</p>
              </button>
           ))}
           {aiModels.length === 0 && (
              <div className="text-center text-slate-400 py-10 font-bold text-xs uppercase tracking-widest border border-dashed border-slate-200 rounded-2xl">
                 No AI Models Configured
              </div>
           )}
        </div>
      );
    }

    if (activeCategory === 'text' || activeCategory === 'elements') {
      return (
        <div className="space-y-4 pb-24">
           {editingTools.filter(t => t.category?.toLowerCase() === activeCategory).map(tool => (
             <button key={tool.id} className="w-full py-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors uppercase tracking-widest">
               {tool.name}
             </button>
           ))}
           {editingTools.filter(t => t.category?.toLowerCase() === activeCategory).length === 0 && (
             <div className="text-center text-slate-400 py-10 font-bold text-xs uppercase tracking-widest border border-dashed border-slate-200 rounded-2xl">
                No tools of type '{activeCategory}' configured
             </div>
           )}
        </div>
      );
    }

    // Default fallback
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-slate-200 rounded-[2rem]">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-4 shadow-inner">
          <Sparkles size={24} />
        </div>
        <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">{activeCategory} Library</p>
        <p className="text-[10px] text-slate-400">Explore dynamic {activeCategory} options</p>
      </div>
    );
  };

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

        {/* Dynamic Content */}
        {renderActiveCategoryContent()}

        {/* Action Promo */}
        {!hasPremium && !isAdminOrStaff && (
          <div 
            onClick={() => openUpgradeModal()}
            className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-5 text-slate-900 shadow-xl relative overflow-hidden group cursor-pointer hover:shadow-amber-900/40 transition-all mt-4"
          >
             <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-80 border-b border-black/20 pb-1 inline-block">Starter Pack</p>
                <h4 className="font-bold text-sm mb-3">Unlock Premium Access</h4>
                <button className="w-full bg-slate-900 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors pointer-events-none">
                  Upgrade Now
                </button>
             </div>
             <Flame className="absolute -right-4 -bottom-4 w-20 h-20 text-black/10 group-hover:text-black/20 transition-all group-hover:scale-110" />
          </div>
        )}
      </div>
    </div>
  );
};
