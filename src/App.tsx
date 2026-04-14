import React, { useState, useEffect, Suspense, lazy } from 'react';
import { ViewState, FlightData, Vehicle } from './types';
import { MOCK_FLIGHTS, MOCK_TEAM_PROFILES } from './data/mockData';
import { MOCK_VEHICLES } from './data/mockVehicleData';
import { MeshFlight, INITIAL_MESH_FLIGHTS } from './data/operationalMesh';
import { DashboardHeader } from './components/DashboardHeader';
import { Spinner } from './components/ui/Spinner';
import { useTheme } from './contexts/ThemeContext';
import { Table, X } from 'lucide-react';
import { OperatorProfile } from './types';
import { ShiftOperatorsSection } from './components/ShiftOperatorsSection';

const GridOps = lazy(() => import('./components/GridOps').then(m => ({ default: m.GridOps })));

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('GRID_OPS');
  const [pendingAction, setPendingAction] = useState<'CREATE' | 'IMPORT' | null>(null);

  // === ESTADO CENTRALIZADO (A VERDADE ÚNICA) ===
  const [globalFlights, setGlobalFlights] = useState<FlightData[]>(MOCK_FLIGHTS);
  const [globalVehicles, setGlobalVehicles] = useState<Vehicle[]>(MOCK_VEHICLES);
  const [globalOperators, setGlobalOperators] = useState<OperatorProfile[]>(MOCK_TEAM_PROFILES);
  const [meshFlights, setMeshFlights] = useState<MeshFlight[]>(() => {
    const saved = localStorage.getItem('meshFlights');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse meshFlights from localStorage', e);
      }
    }
    return INITIAL_MESH_FLIGHTS;
  });

  useEffect(() => {
    localStorage.setItem('meshFlights', JSON.stringify(meshFlights));
  }, [meshFlights]);

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

  // === SIMULAÇÃO DE VAZÃO DINÂMICA (5 SEGUNDOS) ===
  useEffect(() => {
    const flowTimer = setInterval(() => {
      setGlobalFlights(prev => prev.map(f => {
        if (f.status === 'ABASTECENDO') {
          const baseFlow = f.maxFlowRate || 1000;
          let nextFlow = f.currentFlowRate ?? baseFlow;

          if (nextFlow > 0) {
            // Flutuação natural de +/- 5%
            const fluctuation = (Math.random() - 0.5) * 0.05 * baseFlow;
            nextFlow = Math.max(100, Math.min(baseFlow, nextFlow + fluctuation));

            // Chance de 3% de pausar o abastecimento
            if (Math.random() < 0.03) nextFlow = 0;
          } else {
            // Chance de 15% de retomar o abastecimento
            if (Math.random() < 0.15) nextFlow = baseFlow * 0.7;
          }

          return { ...f, currentFlowRate: Math.round(nextFlow) };
        }
        return f;
      }));
    }, 5000);
    return () => clearInterval(flowTimer);
  }, []);

  return (
    <div className={`${isDarkMode ? 'dark bg-slate-950' : 'bg-slate-50'} ${isPseudoFullscreen ? 'fixed inset-0 z-[9999]' : 'h-screen w-screen'} overflow-hidden flex flex-col`}>
      <DashboardHeader 
        isDarkMode={isDarkMode} 
        toggleDarkMode={toggleDarkMode} 
        isFullscreen={isPseudoFullscreen} 
        onToggleFullscreen={toggleFullscreen} 
        globalSearchTerm={globalSearchTerm}
        setGlobalSearchTerm={setGlobalSearchTerm}
      />
      
      <div id="subheader-portal-target" className="w-full shrink-0 z-[60] relative"></div>

      <div className={`flex flex-1 w-full ${isDarkMode ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-800'} transition-colors duration-500 font-sans overflow-hidden relative`}>

        <main className="flex-1 flex flex-col overflow-hidden relative w-full">
          <div className="flex-1 overflow-hidden relative">
              <Suspense fallback={<div className="flex items-center justify-center h-full w-full"><Spinner size={48} text="Carregando módulo..." /></div>}>
                {view === 'GRID_OPS' && (
                  <GridOps 
                    flights={globalFlights} 
                    onUpdateFlights={setGlobalFlights} 
                    vehicles={globalVehicles}
                    operators={globalOperators}
                    initialTab={gridOpsInitialTab}
                    globalSearchTerm={globalSearchTerm}
                    meshFlights={meshFlights}
                    setMeshFlights={setMeshFlights}
                    onOpenShiftOperators={() => setView('SHIFT_OPERATORS')}
                    pendingAction={pendingAction}
                    setPendingAction={setPendingAction}
                  />
                )}
                {view === 'SHIFT_OPERATORS' && (
                  <ShiftOperatorsSection 
                    onClose={() => setView('GRID_OPS')}
                    operators={globalOperators}
                    onUpdateOperators={setGlobalOperators}
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
    </div>
  );
};

export default App;
