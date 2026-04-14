import React from 'react';
import { FlightStatus } from '../types';

interface StatusBadgeProps {
  status: FlightStatus;
  isDarkMode?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, isDarkMode = true }) => {
  const getStatusConfig = (s: FlightStatus) => {
    switch (s) {
      case FlightStatus.CHEGADA: return { 
        label: 'CHEGADA', 
        color: isDarkMode ? 'text-blue-400 bg-blue-500/10 border-blue-400/50' : 'text-blue-600 bg-blue-50 border-blue-200' 
      };
      case FlightStatus.FILA: return { 
        label: 'FILA', 
        color: isDarkMode ? 'text-amber-500 bg-amber-500/10 border-amber-500/50' : 'text-amber-600 bg-amber-50 border-amber-200' 
      };
      case FlightStatus.DESIGNADO: return { 
        label: 'DESIGNADO', 
        color: isDarkMode ? 'text-indigo-400 bg-indigo-500/10 border-indigo-400/50' : 'text-indigo-600 bg-indigo-50 border-indigo-200' 
      };
      case FlightStatus.ABASTECENDO: return { 
        label: 'ABASTECENDO', 
        color: isDarkMode ? 'text-emerald-400 bg-emerald-500/10 border-emerald-400/50 animate-pulse' : 'text-emerald-700 bg-emerald-50 border-emerald-500 animate-pulse' 
      };
      case FlightStatus.FINALIZADO: return { 
        label: 'FINALIZADO', 
        color: isDarkMode ? 'text-slate-400 bg-slate-800 border-slate-700' : 'text-slate-600 bg-slate-100 border-slate-300' 
      };
      case FlightStatus.CANCELADO: return { 
        label: 'CANCELADO', 
        color: isDarkMode ? 'text-red-500 bg-red-500/10 border-red-500/50' : 'text-red-600 bg-red-50 border-red-200' 
      };
      default: return { 
        label: s, 
        color: isDarkMode ? 'text-slate-400 bg-slate-800 border-slate-700' : 'text-slate-600 bg-slate-100 border-slate-300' 
      };
    }
  };

  const config = getStatusConfig(status);

  return (
    <div className={`flex items-center justify-center w-full h-[28px] px-2 rounded text-[9px] font-black uppercase tracking-[0.1em] border ${config.color}`}>
      {config.label}
    </div>
  );
};
