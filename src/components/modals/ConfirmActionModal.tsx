import React from 'react';
import { X, AlertTriangle, Play, UserCheck, CheckCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface ConfirmActionModalProps {
    type: 'cancel' | 'start' | 'remove' | 'finish';
    flightNumber: string;
    registration?: string;
    onConfirm: () => void;
    onClose: () => void;
}

export const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
    type,
    flightNumber,
    registration,
    onConfirm,
    onClose
}) => {
    const { isDarkMode } = useTheme();
    let config = {
        title: '',
        icon: <AlertTriangle size={32} className="text-red-500" />,
        iconBg: 'bg-red-500/10 border-red-500/20',
        description: <></>,
        confirmText: '',
        confirmBg: 'bg-red-600 hover:bg-red-500 shadow-red-600/20'
    };

    switch (type) {
        case 'cancel':
            config = {
                title: 'Confirmar Cancelamento',
                icon: <AlertTriangle size={32} className="text-red-500" />,
                iconBg: 'bg-red-500/10 border-red-500/20',
                description: (
                    <>Você optou por <span className="text-red-400 font-bold">CANCELAR</span> o voo <span className={`${isDarkMode ? 'text-white' : 'text-slate-900'} font-mono font-bold`}>{flightNumber}</span> {registration}. Deseja seguir com a ação?</>
                ),
                confirmText: 'Sim, Cancelar',
                confirmBg: 'bg-red-600 hover:bg-red-500 shadow-red-600/20'
            };
            break;
        case 'start':
            config = {
                title: 'Iniciar Abastecimento',
                icon: <Play size={32} className="text-blue-500" />,
                iconBg: 'bg-blue-500/10 border-blue-500/20',
                description: (
                    <>Registrar início do abastecimento para o voo <span className={`${isDarkMode ? 'text-white' : 'text-slate-900'} font-mono font-bold`}>{flightNumber}</span>?</>
                ),
                confirmText: 'Sim, Iniciar',
                confirmBg: 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
            };
            break;
        case 'remove':
            config = {
                title: 'Cancelar Designação',
                icon: <UserCheck size={32} className="text-amber-500" />,
                iconBg: 'bg-amber-500/10 border-amber-500/20',
                description: (
                    <>Deseja remover o operador deste voo?</>
                ),
                confirmText: 'Sim, Remover',
                confirmBg: 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20 btn-confirm-remove'
            };
            break;
        case 'finish':
            config = {
                title: 'Finalizar Abastecimento',
                icon: <CheckCircle size={32} className="text-emerald-500" />,
                iconBg: 'bg-emerald-500/10 border-emerald-500/20',
                description: (
                    <>Deseja Finalizar o abastecimento deste voo?</>
                ),
                confirmText: 'Sim, Finalizar',
                confirmBg: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
            };
            break;
    }

    return (
        <div className="absolute inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center animate-in fade-in zoom-in-95 duration-200">
            <div className={`${isDarkMode ? 'bg-slate-900 border-emerald-500/30' : 'bg-white border-slate-200'} border-[0.5px] rounded-[8px] w-[450px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden`}>
                <div className={`${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-[#2C864C] border-[#2C864C]'} p-4 border-b flex justify-between items-center`}>
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest">{config.title}</h3>
                    <button onClick={onClose} className={`${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-emerald-100 hover:text-white'} transition-colors`}>
                        <X size={18} />
                    </button>
                </div>
                <div className="p-8">
                    <div className="flex flex-col items-center text-center mb-8">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 border ${config.iconBg}`}>
                            {config.icon}
                        </div>
                        <h3 className={`text-xl font-black uppercase tracking-tighter mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{config.title}</h3>
                        <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {config.description}
                        </p>
                    </div>
                    
                    <div className="flex gap-4">
                        <button 
                            onClick={onConfirm}
                            className={`flex-1 flex items-center justify-center gap-2 text-white px-6 py-4 rounded-lg shadow-lg transition-all active:scale-95 ${config.confirmBg}`}
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest">{config.confirmText}</span>
                        </button>
                        <button 
                            onClick={onClose}
                            className={`flex-1 font-black py-4 rounded-lg uppercase tracking-widest text-[10px] transition-all active:scale-95 ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                        >
                            Não, Voltar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
