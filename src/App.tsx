import React, { useState, Suspense, lazy, useEffect } from 'react';
import { ViewState, FlightData, Vehicle, OperatorProfile, Airline, AircraftDatabaseEntry } from './types';
import { DashboardHeader } from './components/DashboardHeader';
import { Spinner } from './components/ui/Spinner';
import { useTheme } from './contexts/ThemeContext';
import { X, Database } from 'lucide-react';
import { ShiftOperatorsSection } from './components/ShiftOperatorsSection';
import { MalhaBase } from './components/MalhaBase';
import { DatabaseSettingsModal } from './components/modals/DatabaseSettingsModal';
import { useSupabaseData } from './lib/supabaseHooks';
import { getSupabaseClient } from './supabase';

const GridOps = lazy(() => import('./components/GridOps').then(m => ({ default: m.GridOps })));

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('GRID_OPS');
  const [pendingAction, setPendingAction] = useState<'CREATE' | 'IMPORT' | null>(null);
  const [showDatabaseSettings, setShowDatabaseSettings] = useState(false);

  // === ESTADO CENTRALIZADO (SINCRONIZADO COM SUPABASE) ===
  const {
    globalFlights,
    globalVehicles,
    globalOperators,
    globalAirlines,
    globalAircraftDb,
    globalFleet,
    globalMalhaBase,
    isLoading,
    authError
  } = useSupabaseData();

  const handleOpenDatabaseSettings = () => {
    setShowDatabaseSettings(true);
  };
  const persistFlight = async (flight: Partial<FlightData>) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      if (!flight.id) {
        await supabase.from('flights').insert({ ...flight, createdAt: new Date().toISOString() });
      } else {
        const { id, ...data } = flight;
        await supabase.from('flights').update(data).eq('id', id);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const persistOperator = async (operator: Partial<OperatorProfile>) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      if (!operator.id) {
        await supabase.from('operators').insert({ ...operator, createdAt: new Date().toISOString() });
      } else {
        const { id, ...data } = operator;
        await supabase.from('operators').update(data).eq('id', id);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const removeOperator = async (id: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      await supabase.from('operators').delete().eq('id', id);
    } catch (error) {
      console.error(error);
    }
  };

  const finalizeFlight = async (flight: FlightData) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      await supabase.from('finalized_flights').insert({
        flightId: flight.id,
        flightData: flight,
        finalizedAt: new Date().toISOString()
      });
      await supabase.from('flights').delete().eq('id', flight.id);
    } catch (error) {
      console.error(error);
    }
  };

  const { isDarkMode, toggleDarkMode } = useTheme();
  const [gridOpsInitialTab, setGridOpsInitialTab] = useState<'GERAL' | 'CHEGADA' | 'FILA' | 'DESIGNADOS' | 'ABASTECENDO' | 'FINALIZADO'>('GERAL');
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');

  const toggleFullscreen = () => {
    const doc = document as any;
    const element = document.documentElement as any;

    const isNativeFull = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);

    if (!isNativeFull) {
      const requestMethod = element.requestFullscreen || element.webkitRequestFullscreen || element.mozRequestFullScreen || element.msRequestFullscreen;
      if (requestMethod) {
        requestMethod.call(element).catch(() => {
          // Fallback para pseudo-fullscreen se o nativo falhar (comum em iframes)
          setIsPseudoFullscreen(true);
        });
      } else {
        setIsPseudoFullscreen(true);
      }
    } else {
      const exitMethod = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
      if (exitMethod) {
        exitMethod.call(doc);
      }
      setIsPseudoFullscreen(false);
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      const doc = document as any;
      const isNativeFull = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
      if (!isNativeFull) setIsPseudoFullscreen(false);
    };
    
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('mozfullscreenchange', onFullscreenChange);
    document.addEventListener('MSFullscreenChange', onFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      document.removeEventListener('mozfullscreenchange', onFullscreenChange);
      document.removeEventListener('MSFullscreenChange', onFullscreenChange);
    };
  }, []);



  const handleSync = async () => {
    console.log("Sincronizando com o banco de dados...");
    // A sincronização real acontece via onSnapshot, 
    // mas aqui poderíamos forçar um refresh ou disparar um job no backend.
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950">
        <Spinner size={48} text="Conectando à MALHA..." />
      </div>
    );
  }

  return (
    <div className={`${isDarkMode ? 'dark bg-slate-950' : 'bg-slate-50'} fixed inset-0 overflow-hidden flex flex-col`}>
      {authError && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/90 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 p-8 rounded-2xl max-w-md w-full shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Database size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Conexão Necessária</h2>
            <p className="text-slate-400 mb-8 leading-relaxed">
              {authError}
            </p>
            <div className="space-y-4">
              <button 
                onClick={handleOpenDatabaseSettings}
                className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all"
              >
                <Database size={20} />
                Configurar Supabase
              </button>
            </div>
          </div>
        </div>
      )}
      <DashboardHeader 
        isDarkMode={isDarkMode} 
        toggleDarkMode={toggleDarkMode} 
        isFullscreen={isPseudoFullscreen} 
        onToggleFullscreen={toggleFullscreen} 
        globalSearchTerm={globalSearchTerm}
        setGlobalSearchTerm={setGlobalSearchTerm}
        onSync={handleSync}
        currentView={view}
        onViewChange={setView}
        onOpenCreateFlight={() => setPendingAction('CREATE')}
        onOpenShiftOperators={() => setView('SHIFT_OPERATORS')}
        onOpenDatabaseSettings={() => setShowDatabaseSettings(true)}
      />
      
      <div id="subheader-portal-target" className="w-full shrink-0 z-[60] relative"></div>

      <div className={`flex flex-1 w-full ${isDarkMode ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-800'} transition-colors duration-500 font-sans overflow-hidden relative`}>

        <main className="flex-1 flex flex-col overflow-hidden relative w-full">
          <div className="flex-1 overflow-hidden relative">
              <Suspense fallback={<div className="flex items-center justify-center h-full w-full"><Spinner size={48} text="Carregando módulo..." /></div>}>
                {view === 'GRID_OPS' && (
                  <GridOps 
                    flights={globalFlights} 
                    onUpdateFlights={persistFlight} 
                    vehicles={globalVehicles}
                    operators={globalOperators}
                    airlines={globalAirlines}
                    aircraftDb={globalAircraftDb}
                    initialTab={gridOpsInitialTab}
                    globalSearchTerm={globalSearchTerm}
                    onOpenShiftOperators={() => setView('SHIFT_OPERATORS')}
                    onOpenMalhaBase={() => setView('MALHA_BASE')}
                    pendingAction={pendingAction}
                    setPendingAction={setPendingAction}
                    onFinalizeFlight={finalizeFlight}
                  />
                )}
                {view === 'SHIFT_OPERATORS' && (
                  <ShiftOperatorsSection 
                    onClose={() => setView('GRID_OPS')}
                    operators={globalOperators}
                    fleet={globalFleet}
                    onUpdateOperators={persistOperator}
                    onRemoveOperator={removeOperator}
                    onOpenCreateModal={() => {
                        setPendingAction('CREATE');
                        setView('GRID_OPS');
                    }}
                    onOpenImportModal={() => {
                        setPendingAction('IMPORT');
                        setView('GRID_OPS');
                    }}
                    globalSearchTerm={globalSearchTerm}
                  />
                )}
                {view === 'MALHA_BASE' && (
                  <MalhaBase 
                    entries={globalMalhaBase}
                    onClose={() => setView('GRID_OPS')}
                    isDarkMode={isDarkMode}
                  />
                )}
              </Suspense>
          </div>
        </main>
      </div>
      {isPseudoFullscreen && (
        <button 
          onClick={() => setIsPseudoFullscreen(false)}
          className="fixed bottom-4 right-4 bg-slate-800/80 hover:bg-slate-700 text-white p-2 rounded-full shadow-lg z-[10000] border border-slate-700 transition-all"
          title="Sair do modo tela cheia"
        >
          <X size={20} />
        </button>
      )}

      {showDatabaseSettings && (
        <DatabaseSettingsModal 
          onClose={() => setShowDatabaseSettings(false)}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};

export default App;
