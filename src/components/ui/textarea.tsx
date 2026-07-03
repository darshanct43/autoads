import React from 'react';

export const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => {
  return <textarea className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-slate-500" {...props} />;
};
