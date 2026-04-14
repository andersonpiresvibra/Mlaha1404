import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { OperatorProfile, FlightData, Vehicle } from '../types';
import { UserPlus, AlertTriangle, X, Check, User, Clock, Briefcase } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface DesigOprProps {
    isOpen: boolean;
    onClose: () => void;
    flight?: FlightData | null;
    vehicle?: Vehicle | null;
    operators: OperatorProfile[];
    onConfirm: (operatorId: string) => void;
    onOpenOperators?: () => void;
}

type Tab = 'TODOS' | 'SRV' | 'CTA';

export const DesigOpr: React.FC<DesigOprProps> = ({ isOpen, onClose, flight, vehicle, operators, onConfirm, onOpenOperators }) => {
    const { isDarkMode } = useTheme();
    const [selectedOperatorId, setSelectedOperatorId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'SRV' | 'CTA'>('SRV');

    // Auto-select tab and reset state when opening
    useEffect(() => {
        if (isOpen) {
            if (flight?.positionType) {
                setActiveTab(flight.positionType === 'CTA' ? 'CTA' : 'SRV');
            } else {
                setActiveTab('SRV');
            }
            setSelectedOperatorId(null);
        }
    }, [isOpen, flight?.positionType]);

    const handleConfirm = () => {
        if (selectedOperatorId) {
            onConfirm(selectedOperatorId);
            setSelectedOperatorId(null);
        }
    };

    const handleClose = () => {
        setSelectedOperatorId(null);
        onClose();
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && isOpen && selectedOperatorId) {
                handleConfirm();
            }
            if (e.key === 'Escape' && isOpen) {
                handleClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedOperatorId, handleConfirm]);

    const availableOperators = useMemo(() => {
        // Mostra todos os operadores passados (já filtrados por elegibilidade no GridOps)
        return operators;
    }, [operators]);

    const categorizedOperators = useMemo(() => {
        return {
            SRV: availableOperators.filter(op => op.fleetCapability === 'SRV'),
            CTA: availableOperators.filter(op => op.fleetCapability === 'CTA'),
        };
    }, [availableOperators]);

    const isOperatorDisabled = (op: OperatorProfile) => {
        if (!flight) return false;
        // Se a posição for CTA, inabilitar SRVs
        if (flight.positionType === 'CTA' && op.fleetCapability === 'SRV') return true;
        return false;
    };

    // Fallback logic if statuses aren't exactly matching, or to ensure everyone is somewhere
const OperatorImage = ({ op, isSelected, isDisabled }: { op: OperatorProfile, isSelected: boolean, isDisabled: boolean }) => {
    const [error, setError] = useState(false);
    return (
        <div className={`w-9 h-12 rounded-lg flex items-end justify-center text-sm font-black border overflow-hidden shrink-0 ${
            isDisabled
                ? 'bg-slate-50 text-slate-300 border-slate-100 opacity-50'
                : isSelected 
                    ? 'bg-indigo-100 text-indigo-600 border-indigo-200' 
                    : 'bg-slate-100 text-slate-400 border-slate-200 group-hover:border-slate-300'
        }`}>
            {op.photoUrl && !error ? (
                <img src={op.photoUrl} alt={op.warName} className={`w-full h-full object-cover ${isDisabled ? 'grayscale opacity-50' : ''}`} onError={() => setError(true)} referrerPolicy="no-referrer" />
            ) : (
                <User size={24} className={`${isDisabled ? 'text-slate-200' : isSelected ? 'text-indigo-300' : 'text-slate-300'} mb-1`} />
            )}
        </div>
    );
};

    const currentList = categorizedOperators[activeTab];

    const renderOperatorItem = (op: OperatorProfile) => {
        const isSelected = selectedOperatorId === op.id;
        const isDisabled = isOperatorDisabled(op);
        
        let statusColor = 'text-emerald-600 bg-emerald-50 border-emerald-100';
        if (op.status === 'DESIGNADO') statusColor = 'text-blue-600 bg-blue-50 border-blue-100';
        if (op.status === 'OCUPADO' || op.status === 'ENCHIMENTO') statusColor = 'text-amber-600 bg-amber-50 border-amber-100';

        return (
            <button 
                key={op.id}
                onClick={() => !isDisabled && setSelectedOperatorId(op.id)}
                disabled={isDisabled}
                className={`group w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all relative overflow-hidden active:scale-[0.98] ${
                    isDisabled
                        ? 'bg-slate-50 border-slate-100 cursor-not-allowed opacity-60'
                        : isSelected 
                            ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/50'
                }`}
            >
                <div className="flex items-center gap-4 relative z-10">
                    <OperatorImage op={op} isSelected={isSelected} isDisabled={isDisabled} />
                    <div className="text-left">
                        <div className={`text-sm font-bold uppercase tracking-tight ${isDisabled ? 'text-slate-400' : isSelected ? 'text-indigo-900' : 'text-slate-900'}`}>
                            {op.warName} {op.assignedVehicle ? `| ${op.assignedVehicle}` : ''}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${isDisabled ? 'bg-slate-100 text-slate-400 border-slate-200' : isSelected ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : statusColor}`}>
                                {op.status}
                            </span>
                            {op.fleetCapability && (
                                <span className={`text-[9px] font-mono font-bold ${isDisabled ? 'text-slate-300' : isSelected ? 'text-indigo-400' : 'text-slate-500'}`}>
                                    {op.fleetCapability}
                                </span>
                            )}
                            {isDisabled && (
                                <span className="text-[8px] font-black text-red-500 uppercase tracking-tighter bg-red-50 px-1 rounded border border-red-100">
                                    Incompatível
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                
                {isSelected && (
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 z-10">
                        <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <Check size={16} strokeWidth={3} />
                        </div>
                    </div>
                )}
            </button>
        );
    };

    if (!isOpen || (!flight && !vehicle)) return null;

    const title = "Designação de Operador";
    let subtitle = "";
    const isCtaPosition = flight?.positionType === 'CTA';

    if (flight) {
        subtitle = `Voo ${flight.flightNumber} • POS: ${flight.positionId} (${flight.positionType || 'GERAL'})`;
    } else if (vehicle) {
        subtitle = `Frota ${vehicle.id} • ${vehicle.type}`;
    }

    return (
        <div 
            className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200"
            onClick={handleClose}
        >
            <div 
                className={`${isDarkMode ? 'bg-slate-900 border-emerald-500/30' : 'bg-white border-slate-200'} border-[0.5px] w-full max-w-md rounded-[8px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200`}
                onClick={e => e.stopPropagation()}
            >
                {/* HEADER FINO */}
                <div className={`flex items-center justify-between px-6 py-4 border-b ${isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-[#2C864C] bg-[#2C864C]'}`}>
                    <div className="flex items-center gap-4">
                <div className={`w-10 h-10 flex items-center justify-center shrink-0 ${isDarkMode ? 'text-indigo-400' : 'text-emerald-100'}`}>
                    <UserPlus size={24} />
                </div>
                        <div>
                            <h3 className="text-lg font-bold text-white uppercase tracking-tight leading-none">{title}</h3>
                            <div className="flex items-center gap-2 mt-1.5">
                                <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-emerald-100'}`}>
                                    {subtitle}
                                </p>
                                {onOpenOperators && (
                                    <>
                                        <span className="w-1 h-1 rounded-full bg-white/30"></span>
                                        <button 
                                            onClick={() => { onClose(); onOpenOperators(); }}
                                            className="text-[9px] font-black text-white bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded transition-all uppercase tracking-tighter"
                                        >
                                            Gerenciar Equipe
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={handleClose}
                        className={`transition-colors p-2 rounded-full ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-emerald-100 hover:text-white hover:bg-emerald-700'}`}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* TABS */}
                <div className={`flex border-b ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50/50'}`}>
                    <button 
                        onClick={() => setActiveTab('SRV')}
                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${
                            activeTab === 'SRV' 
                            ? 'text-emerald-600' 
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Briefcase size={14} />
                            SERVIDORES (SRV)
                            <span className={`px-1.5 py-0.5 rounded-full text-[8px] ${activeTab === 'SRV' ? 'bg-emerald-100' : 'bg-slate-200 text-slate-500'}`}>
                                {categorizedOperators.SRV.length}
                            </span>
                        </div>
                        {activeTab === 'SRV' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />}
                    </button>
                    <button 
                        onClick={() => setActiveTab('CTA')}
                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${
                            activeTab === 'CTA' 
                            ? 'text-amber-600' 
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Clock size={14} />
                            TANQUES (CTA)
                            <span className={`px-1.5 py-0.5 rounded-full text-[8px] ${activeTab === 'CTA' ? 'bg-amber-100' : 'bg-slate-200 text-slate-500'}`}>
                                {categorizedOperators.CTA.length}
                            </span>
                        </div>
                        {activeTab === 'CTA' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />}
                    </button>
                </div>

                {/* LISTA DE OPERADORES */}
                <div className="flex-1 p-4 min-h-[300px] max-h-[50vh] overflow-y-auto custom-scrollbar bg-white">
                    <div className="space-y-2">
                        {operators.length === 0 ? (
                            <div className="h-[300px] flex flex-col items-center justify-center text-slate-400 gap-4 py-12">
                                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100">
                                    <User size={32} className="opacity-20" />
                                </div>
                                <div className="text-center">
                                    <span className="text-[10px] font-bold uppercase tracking-widest block">Nenhum operador disponível</span>
                                    {onOpenOperators && (
                                        <button 
                                            onClick={() => { onClose(); onOpenOperators(); }}
                                            className="mt-4 text-[10px] font-black text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg border border-indigo-100 transition-all uppercase tracking-widest flex items-center gap-2 mx-auto"
                                        >
                                            <UserPlus size={14} />
                                            Configurar Equipe
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : currentList.length > 0 ? (
                            currentList.map(op => renderOperatorItem(op))
                        ) : (
                            <div className="h-[300px] flex flex-col items-center justify-center text-slate-400 gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100">
                                    <User size={32} className="opacity-20" />
                                </div>
                                <div className="text-center">
                                    <span className="text-[10px] font-bold uppercase tracking-widest block">Nenhum operador {activeTab} disponível</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* FOOTER */}
                <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-4">
                    <button 
                        onClick={handleClose}
                        className="flex-1 py-3.5 rounded-lg border border-slate-200 bg-white text-slate-500 font-bold text-[10px] hover:bg-slate-100 hover:text-slate-900 transition-all uppercase tracking-widest active:scale-95"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleConfirm}
                        disabled={!selectedOperatorId}
                        className="flex-1 py-3.5 rounded-lg bg-indigo-600 text-white font-bold text-[10px] hover:bg-indigo-500 transition-all uppercase tracking-widest shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
                    >
                        <span>Confirmar Designação</span>
                        <Check size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};
