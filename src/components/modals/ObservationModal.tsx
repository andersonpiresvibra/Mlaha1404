import React from 'react';
import { X } from 'lucide-react';
import { FlightData } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

interface ObservationModalProps {
    flight: FlightData;
    newObservation: string;
    setNewObservation: (obs: string) => void;
    onClose: () => void;
    onSave: () => void;
}

export const ObservationModal: React.FC<ObservationModalProps> = ({
    flight,
    newObservation,
    setNewObservation,
    onClose,
    onSave
}) => {
    const { isDarkMode } = useTheme();
    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center animate-in fade-in">
            <div className={`${isDarkMode ? 'bg-slate-900 border-emerald-500/30' : 'bg-white border-slate-200'} border-[0.5px] rounded-[8px] shadow-2xl w-full max-w-lg relative overflow-hidden m-4`}>
                <div className={`flex justify-between items-center p-6 border-b ${isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-[#2C864C] bg-[#2C864C]'}`}>
                    <div>
                        <h3 className="text-base font-black text-white uppercase tracking-tighter">Registrar Observação</h3>
                        <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-emerald-100'}`}>Voo <span className="font-bold text-emerald-400">{flight.flightNumber}</span> / Prefixo <span className="font-bold text-emerald-400">{flight.registration}</span></p>
                    </div>
                    <button onClick={onClose} className={`p-1 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-emerald-700'}`}>
                        <X size={18} className={isDarkMode ? 'text-slate-500' : 'text-emerald-100'} />
                    </button>
                </div>
                
                <div className="p-6">
                    <textarea
                        value={newObservation}
                        onChange={(e) => setNewObservation(e.target.value)}
                        placeholder="Digite a observação para a caixa preta do voo..."
                        className={`w-full h-32 border rounded-md p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all custom-scrollbar ${isDarkMode ? 'bg-slate-950 border-slate-700 text-slate-300 placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'}`}
                    />

                    <div className="mt-6 flex justify-end gap-3">
                        <button 
                            onClick={onClose}
                            className={`px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={onSave}
                            disabled={!newObservation.trim()}
                            className={`px-4 py-2 rounded-md text-white text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500' : 'bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400'} disabled:cursor-not-allowed`}
                        >
                            Salvar Registro
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
