import React, { useRef, useState } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { storageService } from '@/services/storageService';

interface FileUploadProps {
  onUpload: (file: File) => void;
  isUploading: boolean;
  progress: number;
  accept?: string;
  label?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onUpload, isUploading, progress, accept = "image/*,video/*", label = "Upload Media" }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = (file: File) => {
    onUpload(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div 
      className={cn(
        "relative border-2 border-dashed rounded-2xl p-6 transition-all",
        dragActive ? "border-amber-500 bg-amber-50" : "border-slate-200 hover:border-slate-300 bg-white"
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input 
        ref={inputRef}
        type="file" 
        className="hidden" 
        accept={accept}
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <div className="flex flex-col items-center gap-3 text-center">
        <Upload className={cn("text-slate-400", isUploading && "animate-bounce")} size={24} />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
        <button 
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="px-4 py-2 bg-slate-90 hover:bg-slate-800 text-white rounded-lg text-[9px] font-black uppercase transition-all"
        >
          {isUploading ? "Uploading..." : "Browse Files"}
        </button>
      </div>
      {progress > 0 && (
        <div className="absolute bottom-2 left-2 right-2 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
};
