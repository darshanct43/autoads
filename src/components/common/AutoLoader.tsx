import { Loader2 } from 'lucide-react';

export default function AutoLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-6 space-y-2">
      <Loader2 className="w-8 h-8 text-slate-400 animate-spin" strokeWidth={1.5} />
      <span className="text-xs font-medium text-slate-400 tracking-wider uppercase">
        Loading...
      </span>
    </div>
  );
}

