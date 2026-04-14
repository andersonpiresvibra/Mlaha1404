import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
    // Tenta parsear o erro se for o nosso JSON de Firestore
    try {
      const parsed = JSON.parse(error.message);
      if (parsed.error) {
        this.setState({ errorInfo: JSON.stringify(parsed, null, 2) });
      }
    } catch (e) {
      // Não é um JSON, ignoramos
    }
  }

  public render() {
    if (this.state.hasError) {
      const isFirestoreError = this.state.error?.message.includes('operationType');
      let errorMessage = "Ocorreu um erro inesperado na aplicação.";
      let details = this.state.error?.message;

      if (isFirestoreError) {
        try {
          const parsed = JSON.parse(this.state.error!.message);
          errorMessage = `Erro no Banco de Dados: ${parsed.operationType.toUpperCase()}`;
          details = parsed.error;
        } catch (e) {}
      }

      return (
        <div className="fixed inset-0 z-[99999] bg-slate-950 flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-2xl w-full shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-2xl flex items-center justify-center">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Ops! Algo deu errado</h2>
                <p className="text-slate-400 text-sm font-medium">O sistema encontrou uma falha crítica.</p>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 mb-8 overflow-hidden">
              <p className="text-red-400 font-mono text-xs mb-2 font-bold uppercase tracking-widest">Detalhes do Erro:</p>
              <div className="max-h-48 overflow-y-auto custom-scrollbar">
                <pre className="text-slate-300 font-mono text-[10px] whitespace-pre-wrap leading-relaxed">
                  {this.state.errorInfo || details}
                </pre>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => window.location.reload()}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 px-6 rounded-xl transition-all active:scale-95 text-xs uppercase tracking-widest"
              >
                <RefreshCw size={16} />
                Recarregar Sistema
              </button>
              <button 
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="px-6 py-3 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 font-black rounded-xl transition-all text-xs uppercase tracking-widest"
              >
                Ignorar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
