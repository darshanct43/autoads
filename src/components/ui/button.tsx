import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive';
  size?: 'default' | 'sm';
}

export const Button = ({ variant = 'default', size = 'default', className = '', ...props }: ButtonProps) => {
  const baseClass = "px-4 py-2 rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variantClass = variant === 'destructive' ? "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500" : "bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-500";
  const sizeClass = size === 'sm' ? "px-2 py-1 text-sm" : "";
  
  return <button className={`${baseClass} ${variantClass} ${sizeClass} ${className}`} {...props} />;
};
