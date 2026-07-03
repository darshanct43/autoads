import React from 'react';

export const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => {
  return <input className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-slate-500" {...props} />;
};
