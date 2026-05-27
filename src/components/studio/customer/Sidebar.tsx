import React from 'react';
import { 
  LayoutTemplate, Shapes, Upload, Type, Image as ImageIcon, 
  Sticker, Box, Hash, Palette, Layers, ChevronLeft,
  Video as VideoIcon, Sparkles, Wand2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStudio } from './StudioContext';

const mainNavItems = [
  { id: 'templates', icon: LayoutTemplate, label: 'Templates' },
  { id: 'elements', icon: Shapes, label: 'Elements' },
  { id: 'uploads', icon: Upload, label: 'Uploads' },
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'ai', icon: Wand2, label: 'AI Tools', premium: true },
  { id: 'video', icon: VideoIcon, label: 'Video', premium: true },
];

const secondaryItems = [
  { id: 'photos', icon: ImageIcon, label: 'Photos' },
  { id: 'background', icon: Palette, label: 'BG' },
  { id: 'layers', icon: Layers, label: 'Layers' },
];

export const Sidebar: React.FC<{ active: string; onSelect: (id: string) => void }> = ({ active, onSelect }) => {
  const { canAccess, setActiveCanvas } = useStudio();

  const handleSelect = (id: string) => {
    if (id === 'video') {
       setActiveCanvas('VIDEO');
       onSelect(id);
       return;
    }

    if (id === 'ai') {
       setActiveCanvas('DESIGN');
       onSelect(id);
       return;
    }

    setActiveCanvas('DESIGN');
    onSelect(id);
  };

  return (
    <div className="w-[84px] bg-slate-50 border-r border-slate-200 flex flex-col items-center py-6 gap-2 shrink-0 z-[1050] shadow-sm">
      <div className="flex-1 w-full space-y-1">
        {mainNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleSelect(item.id)}
            className={cn(
              "w-full px-1 flex flex-col items-center gap-1.5 py-4 transition-all group relative",
              active === item.id ? "text-slate-900 bg-white shadow-sm" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            )}
          >
            {active === item.id && (
              <div
                className="absolute left-0 top-2 bottom-2 w-1 bg-amber-500 rounded-r shadow-[0_0_15px_rgba(245,158,11,0.5)]" 
              />
            )}
            <div className="relative">
              <item.icon size={24} strokeWidth={active === item.id ? 2.5 : 1.5} className="group-hover:scale-110 transition-transform" />
              {item.premium && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 border border-[#0f172a] rounded-full" />
              )}
            </div>
            <span className={cn(
              "text-[9px] font-black uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity",
              active === item.id && "opacity-100"
            )}>
              {item.label}
            </span>
          </button>
        ))}
      </div>

      <div className="w-full flex flex-col items-center gap-1 pt-6 border-t border-slate-800">
        {secondaryItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleSelect(item.id)}
            className={cn(
              "w-full flex flex-col items-center gap-1 py-3 transition-colors group opacity-60 hover:opacity-100",
              active === item.id ? "text-white opacity-100" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <item.icon size={18} strokeWidth={2} />
          </button>
        ))}
        
        <button className="mt-4 p-3 text-slate-500 hover:text-white transition-all hover:bg-white/5 rounded-full">
          <ChevronLeft size={20} />
        </button>
      </div>
    </div>
  );
};

import { motion } from 'motion/react';
