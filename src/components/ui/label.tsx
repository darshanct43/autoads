import React from 'react';

export const Label = (props: React.LabelHTMLAttributes<HTMLLabelElement>) => {
  return <label className="text-sm font-medium text-slate-700" {...props} />;
};
