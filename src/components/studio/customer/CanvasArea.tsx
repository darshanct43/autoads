import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { 
  AlignLeft, AlignCenter, AlignRight, FlipHorizontal, 
  FlipVertical, Lock, Trash2, Layers, ChevronLeft, 
  ChevronRight, ZoomIn, Grid, Maximize, Minus, Plus,
  Sun, Monitor, Smartphone, Video as VideoIcon, Layout
} from 'lucide-react';
import { useStudio } from './StudioContext';
import { cn } from '@/lib/utils';

export const CanvasArea: React.FC = () => {
  const { state, setAspectRatio, setSafeZone, openUpgradeModal } = useStudio();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvas = useRef<fabric.Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    fabricCanvas.current = new fabric.Canvas(canvasRef.current, {
      width: 500,
      height: 500,
      backgroundColor: '#f8fafc',
      preserveObjectStacking: true,
    });

    // Initial item to show it works
    const text = new fabric.IText('AUTOADS STUDIO', {
      left: 100,
      top: 100,
      fontFamily: 'Inter',
      fontSize: 40,
      fontWeight: 'bold',
      fill: '#1e293b'
    });
    fabricCanvas.current.add(text);
    fabricCanvas.current.centerObject(text);
    fabricCanvas.current.renderAll();

    return () => {
      fabricCanvas.current?.dispose();
    };
  }, []);

  useEffect(() => {
    const handleLoadTemplate = (e: any) => {
      const url = e.detail.url;
      if (fabricCanvas.current) {
        fabric.Image.fromURL(url, (img) => {
          // Clear current content before loading new template? 
          // fabricCanvas.current?.clear(); 
          // Actually let's just add it as a full bg scale
          const canvasWidth = fabricCanvas.current!.getWidth();
          const canvasHeight = fabricCanvas.current!.getHeight();
          
          img.set({
            scaleX: canvasWidth / (img.width || 1),
            scaleY: canvasHeight / (img.height || 1),
            selectable: true,
            hasControls: true
          });
          
          fabricCanvas.current?.add(img);
          fabricCanvas.current?.sendToBack(img);
          fabricCanvas.current?.setActiveObject(img);
          fabricCanvas.current?.renderAll();
        });
      }
    };

    window.addEventListener('load_template', handleLoadTemplate);
    return () => window.removeEventListener('load_template', handleLoadTemplate);
  }, []);

  // Handle aspect ratio updates
  useEffect(() => {
    if (!fabricCanvas.current) return;
    
    let width = 500;
    let height = 500;

    switch (state.aspectRatio) {
      case '16:9': height = (width * 9) / 16; break;
      case '9:16': width = (height * 9) / 16; break;
      case '19-INCH': 
        width = 600; 
        height = 337.5; // ~16:9 for large monitors 
        break;
      case '1:1': width = 500; height = 500; break;
    }

    fabricCanvas.current.setDimensions({ width, height });
    fabricCanvas.current.renderAll();
  }, [state.aspectRatio]);

  const addImageTemplate = (url: string) => {
    fabric.Image.fromURL(url, (img) => {
      img.scaleToWidth(fabricCanvas.current?.getWidth() || 500);
      fabricCanvas.current?.add(img);
      fabricCanvas.current?.sendToBack(img);
      fabricCanvas.current?.renderAll();
    });
  };

  return (
    <div className="flex-1 bg-[#0f172a] relative flex flex-col overflow-hidden">
      {/* Dynamic Toolbar */}
      <div className="h-14 bg-[#1e293b] border-b border-white/5 backdrop-blur-md flex items-center justify-between px-6 shrink-0 shadow-lg z-20">
        <div className="flex items-center gap-6">
           <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-800">
             {(['1:1', '16:9', '9:16', '19-INCH'] as const).map((r) => (
               <button 
                 key={r}
                 onClick={() => setAspectRatio(r)}
                 className={cn(
                   "px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest transition-all",
                   state.aspectRatio === r ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                 )}
               >
                 {r}
               </button>
             ))}
           </div>
           
           <div className="h-6 w-px bg-white/10" />

           <div className="flex items-center gap-2 text-slate-400">
             <button className="p-2 hover:bg-white/10 rounded transition-colors" title="Align Left"><AlignLeft size={18} /></button>
             <button className="p-2 hover:bg-white/10 rounded transition-colors" title="Align Center"><AlignCenter size={18} /></button>
             <button className="p-2 hover:bg-white/10 rounded transition-colors" title="Align Right"><AlignRight size={18} /></button>
           </div>

           <div className="h-6 w-px bg-white/10" />

           <div className="flex items-center gap-2 text-slate-400">
             <button 
                onClick={() => setSafeZone(!state.safeZone)}
                className={cn("p-2 rounded transition-colors", state.safeZone ? "bg-blue-500/20 text-blue-400" : "hover:bg-white/10")}
                title="Toggle Safe Zone"
             >
                <Grid size={18} />
             </button>
             <button className="p-2 hover:bg-white/10 rounded transition-colors text-rose-500/80 hover:text-rose-500" title="Delete Selection"><Trash2 size={18} /></button>
           </div>
        </div>

        <div className="flex items-center gap-4">
           <button className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-white transition-colors">
              <Sun size={14} />
              Brightness: <span className="text-blue-400">{state.brightness}%</span>
           </button>
        </div>
      </div>

      {/* Main Working Area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto flex items-center justify-center p-20 cursor-default no-scrollbar bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] relative"
      >
        {state.plan === 'FREE' && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-8 bg-black/10 backdrop-blur-[1px]">
             <div className="bg-[#1e293b]/90 border border-slate-700 p-6 rounded-2xl shadow-2xl backdrop-blur-md max-w-sm text-center">
                 <Lock className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                 <h3 className="text-sm font-black text-white uppercase tracking-widest mb-1">Editing Locked</h3>
                 <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">You are in Read-Only Viewer mode. Upgrade to a premium plan to edit and add elements.</p>
                 <button 
                   onClick={(e) => { e.stopPropagation(); openUpgradeModal(); }}
                   className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase tracking-[0.1em] transition-all"
                 >
                   Upgrade Now
                 </button>
             </div>
          </div>
        )}
        <div 
          className={cn("relative shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] group transition-all", state.plan === 'FREE' && "pointer-events-none opacity-50 grayscale-[0.3]")}
        >
          {/* Canvas Wrapper */}
          <div 
            className="overflow-hidden bg-white rounded-sm ring-1 ring-white/10"
            style={{ 
              filter: `brightness(${state.brightness / 100}) ${state.outdoorMode ? 'contrast(1.2) saturate(1.1)' : ''}`,
            }}
          >
            <canvas ref={canvasRef} />
            
            {/* Safe Zone Overlay */}
            {state.safeZone && (
              <div className="absolute inset-0 pointer-events-none border-[20px] border-blue-500/10 z-10 flex items-center justify-center">
                 <div className="w-full h-full border border-blue-500/20 border-dashed" />
                 <div className="absolute top-2 left-2 text-[8px] font-bold text-blue-500/40 uppercase tracking-widest">Safe Area (70%)</div>
              </div>
            )}
          </div>

          {/* Add Page Control */}
          <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-3 scale-90 opacity-80 hover:opacity-100 hover:scale-100 transition-all">
             <button className="bg-[#1e293b] border border-white/10 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 group shadow-2xl">
               <Plus size={14} className="group-hover:rotate-90 transition-transform text-blue-400" />
               New Layer
             </button>
             <button className="p-2.5 bg-[#1e293b] border border-white/10 text-slate-400 rounded-xl hover:text-white transition-all shadow-2xl">
               <Layers size={18} />
             </button>
          </div>
        </div>
      </div>

      {/* Bottom Bar Tools */}
      <div className="h-12 bg-[#1e293b]/80 backdrop-blur-xl border-t border-white/5 flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Scale</span>
              <div className="w-32 bg-slate-900 rounded-full h-1.5 relative group cursor-pointer overflow-hidden">
                 <div className="absolute inset-y-0 left-0 w-3/4 bg-blue-500 group-hover:bg-blue-400 transition-all" />
              </div>
              <span className="text-[10px] font-bold text-blue-500">75%</span>
           </div>
        </div>

        <div className="flex items-center gap-4 text-slate-500">
           <div className="flex items-center gap-1.5 bg-slate-900/50 p-1 rounded-lg border border-slate-800">
             <button className="p-1.5 hover:text-white transition-colors"><Monitor size={14} /></button>
             <button className="p-1.5 hover:text-white transition-colors"><Smartphone size={14} /></button>
             <button className="p-1.5 hover:text-white transition-colors"><VideoIcon size={14} /></button>
           </div>
           
           <div className="flex items-center gap-1.5">
             <button className="p-1.5 hover:text-white bg-slate-900/50 rounded-lg border border-slate-800 transition-colors"><Maximize size={16} /></button>
             <button className="p-1.5 hover:text-white bg-slate-900/50 rounded-lg border border-slate-800 transition-colors" title="Zoom In"><ZoomIn size={16} /></button>
           </div>
        </div>
      </div>
    </div>
  );
};
