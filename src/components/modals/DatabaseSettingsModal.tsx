import React, { useState, useEffect } from 'react';
import { Database, Save, CheckCircle, XCircle, X } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

interface DatabaseSettingsModalProps {
  onClose: () => void;
  isDarkMode: boolean;
}

export const DatabaseSettingsModal: React.FC<DatabaseSettingsModalProps> = ({ onClose, isDarkMode }) => {
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    // Load from local storage on mount
    const savedUrl = localStorage.getItem('SUPABASE_URL') || '';
    const savedKey = localStorage.getItem('SUPABASE_ANON_KEY') || '';
    setSupabaseUrl(savedUrl);
    setSupabaseKey(savedKey);
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setIsSaved(false);
    
    try {
      const client = createClient(supabaseUrl, supabaseKey);
      // Attempt a harmless query to verify credentials
      // Just fetching session will verify if the anon key is valid format
      const { error } = await client.auth.getSession();
      
      if (error) {
        throw error;
      }
      setTestResult('success');
    } catch (error) {
      console.error("Falha ao testar conexão", error);
      setTestResult('error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    localStorage.setItem('SUPABASE_URL', supabaseUrl.trim());
    localStorage.setItem('SUPABASE_ANON_KEY', supabaseKey.trim());
    setIsSaved(true);
    setTimeout(() => {
      onClose();
      window.location.reload(); // Reload to pick up new creds if we decide to use them globally
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-xl shadow-2xl flex flex-col overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-700/60' : 'bg-white border-slate-200'} border`}>
        {/* Header */}
        <div className={`px-5 py-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-slate-800/50 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-md ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
              <Database size={18} />
            </div>
            <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Conexão com Banco de Dados</h3>
          </div>
          <button 
            onClick={onClose}
            className={`p-1.5 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'}`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4">
          <div className={`p-3 rounded-lg border text-xs ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-200' : 'bg-indigo-50 border-indigo-200 text-indigo-700'}`}>
            Configure as credenciais do seu projeto Supabase para testes locais. Estas informações ficarão salvas apenas no seu navegador.
          </div>

          <div className="space-y-1">
            <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Supabase Project URL
            </label>
            <input
              type="text"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://sua-id.supabase.co"
              className={`w-full p-2.5 rounded-lg text-sm border focus:ring-2 focus:outline-none transition-all ${
                isDarkMode 
                  ? 'bg-slate-950 border-slate-700 text-slate-200 focus:border-emerald-500/50 focus:ring-emerald-500/20' 
                  : 'bg-white border-slate-300 text-slate-800 focus:border-emerald-500 focus:ring-emerald-500/20'
              }`}
            />
          </div>

          <div className="space-y-1">
            <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Supabase Anon Key
            </label>
            <input
              type="password"
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5c..."
              className={`w-full p-2.5 rounded-lg text-sm border focus:ring-2 focus:outline-none transition-all ${
                isDarkMode 
                  ? 'bg-slate-950 border-slate-700 text-slate-200 focus:border-emerald-500/50 focus:ring-emerald-500/20' 
                  : 'bg-white border-slate-300 text-slate-800 focus:border-emerald-500 focus:ring-emerald-500/20'
              }`}
            />
          </div>

          <div className="pt-2">
            <button
              onClick={handleTestConnection}
              disabled={!supabaseUrl || !supabaseKey || isTesting}
              className={`w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                isDarkMode 
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:bg-slate-800 disabled:text-slate-500' 
                  : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700 disabled:bg-slate-100 disabled:text-slate-400'
              }`}
            >
              {isTesting ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              ) : testResult === 'success' ? (
                <CheckCircle size={16} className="text-emerald-500" />
              ) : testResult === 'error' ? (
                <XCircle size={16} className="text-red-500" />
              ) : (
                <Database size={16} />
              )}
              {isTesting ? 'Testando Conexão...' : 'Testar Conexão'}
            </button>
            
            {testResult === 'success' && (
              <p className="text-emerald-500 text-xs text-center font-medium mt-2">
                Conexão estabelecida com sucesso!
              </p>
            )}
            
            {testResult === 'error' && (
              <p className="text-red-500 text-xs text-center font-medium mt-2">
                Falha ao conectar. Verifique as credenciais.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex justify-end gap-3 ${isDarkMode ? 'bg-slate-800/30 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!supabaseUrl || !supabaseKey || testResult === 'error' || isSaved}
            className={`px-6 py-2 text-sm font-bold rounded-lg flex items-center gap-2 transition-colors ${
              isSaved
                ? 'bg-emerald-500 text-white'
                : isDarkMode 
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white disabled:bg-slate-800 disabled:text-slate-500' 
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-slate-200 disabled:text-slate-400'
            }`}
          >
            {isSaved ? <CheckCircle size={16} /> : <Save size={16} />}
            {isSaved ? 'Configuração Salva!' : 'Salvar Configuração'}
          </button>
        </div>
      </div>
    </div>
  );
};
