import React from 'react';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export const Switch = ({ checked, onCheckedChange }: SwitchProps) => {
  return (
    <button
      className={`w-10 h-6 rounded-full transition-colors ${checked ? 'bg-slate-900' : 'bg-slate-300'}`}
      onClick={() => onCheckedChange(!checked)}
    >
      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
    </button>
  );
};
