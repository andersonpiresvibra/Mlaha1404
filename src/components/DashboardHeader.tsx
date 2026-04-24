import React, { useState, useEffect } from 'react';
import { Sun, Moon, User, Edit2, Maximize, Minimize, Plane, Search, RefreshCw, X, Settings, Plus, UserPlus, Database } from 'lucide-react';

import { ViewState } from '../types';

interface DashboardHeaderProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  globalSearchTerm: string;
  setGlobalSearchTerm: (term: string) => void;
  onSync: () => void;
  currentView?: ViewState;
  onViewChange?: (view: ViewState) => void;
  onOpenCreateFlight?: () => void;
  onOpenShiftOperators?: () => void;
  onOpenDatabaseSettings?: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ 
  isDarkMode, 
  toggleDarkMode, 
  isFullscreen, 
  onToggleFullscreen, 
  globalSearchTerm, 
  setGlobalSearchTerm,
  onSync,
  currentView,
  onViewChange,
  onOpenCreateFlight,
  onOpenShiftOperators,
  onOpenDatabaseSettings
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [editingField, setEditingField] = useState<'density' | 'temperature' | null>(null);
  const [densityN, setDensityN] = useState(0.803);
  const [temperature, setTemperature] = useState(24.5);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', 'H');
  };

  const formatDate = (date: Date) => {
    const weekday = date.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase().replace('.', '');
    const dayMonth = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return `${weekday} - ${dayMonth}`;
  };

  return (
    <>
      <header className={`h-20 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-[#2C864C] border-white/10'} border-b flex items-center justify-between px-6 z-[100] relative transition-colors duration-500`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 p-2 rounded-lg shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              <Plane className="text-white" size={20} />
            </div>
            <span className="font-black text-sm tracking-tighter text-white uppercase">
              MALHA
            </span>
          </div>

          <div className="w-px h-10 bg-white/20"></div>

          <div className="flex items-center gap-2 group cursor-pointer">
              <div className="w-11 h-11 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center group-hover:border-white/40 transition-colors">
                  <User size={18} className="text-white" />
              </div>
              <div className="text-left hidden sm:block">
                  <span className="text-sm font-bold text-white group-hover:text-emerald-200 transition-colors uppercase">OPERADOR_ADMIN</span>
                  <span className="text-[10px] text-emerald-200 font-black tracking-widest uppercase block">Líder de Solo</span>
              </div>
          </div>

          <div className="w-px h-10 bg-white/20"></div>

          <div className="flex flex-col items-center">
              <h1 className="text-4xl font-bold tracking-tighter font-mono text-white leading-none">{formatTime(currentTime)}</h1>
              <p className="text-xs text-emerald-100 font-bold tracking-widest">{formatDate(currentTime)}</p>
          </div>

          <div className="w-px h-10 bg-white/20"></div>

          <div className="flex items-center gap-3">
              <div className="text-sm">
                  <div className="flex items-center gap-1">
                      <span className="text-emerald-100/70 font-bold text-xs uppercase w-10">DENS.</span>
                      {editingField === 'density' ? (
                          <input 
                              type="text"
                              inputMode="decimal"
                              value={densityN} 
                              onChange={(e) => {
                                  const val = e.target.value.replace(',', '.');
                                  if (!isNaN(Number(val)) || val === '' || val === '.') {
                                      setDensityN(val as any);
                                  }
                              }}
                              onBlur={() => {
                                  setEditingField(null);
                                  setDensityN(Number(densityN) || 0.803);
                              }}
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                      setEditingField(null);
                                      setDensityN(Number(densityN) || 0.803);
                                  }
                              }}
                              autoFocus
                              className="w-16 bg-white/10 text-white font-mono font-bold text-lg rounded px-1 outline-none"
                          />
                      ) : (
                          <span 
                              className="font-mono font-bold text-white text-lg cursor-pointer hover:text-emerald-200 transition-colors w-16 inline-block"
                              onClick={() => setEditingField('density')}
                          >
                              {Number(densityN).toFixed(3)}
                          </span>
                      )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-emerald-100/70 font-bold text-xs uppercase w-10">TEMP.</span>
                      {editingField === 'temperature' ? (
                          <input 
                              type="text"
                              inputMode="decimal"
                              value={temperature} 
                              onChange={(e) => {
                                  const val = e.target.value.replace(',', '.');
                                  if (!isNaN(Number(val)) || val === '' || val === '-' || val === '.') {
                                      setTemperature(val as any);
                                  }
                              }}
                              onBlur={() => {
                                  setEditingField(null);
                                  setTemperature(Number(temperature) || 24.5);
                              }}
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                      setEditingField(null);
                                      setTemperature(Number(temperature) || 24.5);
                                  }
                              }}
                              autoFocus
                              className="w-16 bg-white/10 text-white font-mono font-bold text-lg rounded px-1 outline-none"
                          />
                      ) : (
                          <span 
                              className="font-mono font-bold text-white text-lg cursor-pointer hover:text-emerald-200 transition-colors w-16 inline-block"
                              onClick={() => setEditingField('temperature')}
                          >
                              {Number(temperature).toFixed(1)}°C
                          </span>
                      )}
                  </div>
              </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-48 h-9 group hidden md:block">
              <div className="absolute inset-0 bg-white border border-white/20 rounded-md flex items-center transition-all">
                  <Search size={14} className="shrink-0 text-slate-900 ml-2" />
                  <input 
                      type="text" 
                      placeholder="BUSCAR VOO..." 
                      className="bg-transparent border-none outline-none text-[10px] text-slate-900 placeholder:text-slate-500 font-mono uppercase w-full pl-2 pr-6 transition-all h-full rounded-md"
                      value={globalSearchTerm}
                      onChange={(e) => setGlobalSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                              (e.target as HTMLInputElement).blur();
                          }
                      }}
                  />
                  {globalSearchTerm && (
                      <button 
                          onClick={() => setGlobalSearchTerm('')}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                          <X size={14} />
                      </button>
                  )}
              </div>
          </div>

          <button 
            onClick={() => {
              onSync();
              const btn = document.activeElement as HTMLElement;
              if (btn) btn.blur();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-bold text-[10px] uppercase tracking-wider transition-colors shadow-sm"
          >
            <RefreshCw size={12} />
            Sinc
          </button>

          <button 
            onClick={onToggleFullscreen} 
            className="p-2 text-emerald-100 hover:text-white hover:bg-white/10 transition-all rounded-md"
          >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
          <button 
            onClick={toggleDarkMode} 
            className="p-2 text-emerald-100 hover:text-white hover:bg-white/10 transition-all rounded-md"
          >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          <div className="w-px h-8 bg-white/20 mx-1"></div>

          <div className="relative">
            <button 
              onClick={() => setShowOptions(!showOptions)}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-md font-bold text-[11px] uppercase tracking-wider transition-colors shadow-md"
            >
              <Settings size={16} />
              Opções
            </button>
            {showOptions && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-[200] p-1">
                 <button 
                   onClick={() => { onViewChange?.('MALHA_BASE'); setShowOptions(false); }}
                   className="w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold text-slate-200 hover:bg-slate-700 rounded-md transition-colors uppercase tracking-wider"
                 >
                   <Plane size={14} />
                   Malha Base
                 </button>
                 <button 
                   onClick={() => { onOpenCreateFlight?.(); setShowOptions(false); }}
                   className="w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold text-slate-200 hover:bg-slate-700 rounded-md transition-colors uppercase tracking-wider"
                 >
                   <Plus size={14} />
                   Criar Voo
                 </button>
                 <button 
                   onClick={() => { onOpenShiftOperators?.(); setShowOptions(false); }}
                   className="w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold text-slate-200 hover:bg-slate-700 rounded-md transition-colors uppercase tracking-wider"
                 >
                   <UserPlus size={14} />
                   Operadores do Turno
                 </button>
                 <div className="w-full h-px bg-slate-700 my-1"></div>
                 <button 
                   onClick={() => { onOpenDatabaseSettings?.(); setShowOptions(false); }}
                   className="w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold text-emerald-400 hover:bg-slate-700 rounded-md transition-colors uppercase tracking-wider"
                 >
                   <Database size={14} />
                   Conexões e Banco
                 </button>
                 <div id="header-options-portal-target"></div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
};
