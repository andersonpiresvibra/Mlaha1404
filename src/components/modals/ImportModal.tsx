import React, { useState } from 'react';
import { X, Upload } from 'lucide-react';

interface ImportModalProps {
    isDarkMode: boolean;
    onClose: () => void;
    onImport: (file: File) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isDarkMode, onClose, onImport }) => {
    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center animate-in fade-in">
            <div className={`w-full max-w-md rounded-xl shadow-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} overflow-hidden animate-in zoom-in-95 duration-200`}>
                <div className={`flex justify-between items-center p-6 border-b ${isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-[#2C864C] bg-[#2C864C]'}`}>
                    <div>
                        <h3 className="text-lg font-bold text-white uppercase tracking-wider">Importar Malha</h3>
                        <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-emerald-100'}`}>Carregue dados de voos em lote</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className={`${isDarkMode ? 'text-slate-500 hover:text-white' : 'text-emerald-100 hover:text-white'} transition-colors`}
                    >
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6 space-y-6">
                    <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                        <h4 className={`text-sm font-bold mb-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Instruções de Importação</h4>
                        <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mb-3`}>
                            Você pode importar dados da malha utilizando os seguintes formatos de arquivo:
                        </p>
                        <ul className={`text-xs space-y-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} list-disc pl-4`}>
                            <li><span className="font-bold">Excel (.xlsx, .xls)</span> - Formato padrão de planilhas.</li>
                            <li><span className="font-bold">CSV (.csv)</span> - Valores separados por vírgula.</li>
                            <li><span className="font-bold">PDF (.pdf)</span> - Extração automática de tabelas (experimental).</li>
                        </ul>
                    </div>

                    <div className="flex justify-center">
                        <input 
                            type="file" 
                            id="file-upload" 
                            className="hidden" 
                            accept=".xlsx, .xls, .csv, .pdf"
                            onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                    onImport(e.target.files[0]);
                                }
                            }}
                        />
                        <label 
                            htmlFor="file-upload"
                            className="cursor-pointer flex items-center gap-2 px-6 py-3 rounded-md text-sm font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-600 transition-colors shadow-sm"
                        >
                            <Upload size={18} />
                            Selecionar Arquivo e Importar
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};
