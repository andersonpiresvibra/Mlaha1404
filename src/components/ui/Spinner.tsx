import React from 'react';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: number;
  className?: string;
  text?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 24, className = '', text }) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <Loader2 size={size} className="animate-spin text-emerald-500" />
      {text && <p className="text-sm font-medium text-slate-400 animate-pulse">{text}</p>}
    </div>
  );
};
