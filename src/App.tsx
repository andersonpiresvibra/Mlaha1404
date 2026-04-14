import React, { useState, useEffect, Suspense, lazy } from 'react';
import { ViewState, FlightData, Vehicle, OperatorProfile, Airline, AircraftDatabaseEntry } from './types';
import { DashboardHeader } from './components/DashboardHeader';
import { Spinner } from './components/ui/Spinner';
import { useTheme } from './contexts/ThemeContext';
import { X } from 'lucide-react';
import { ShiftOperatorsSection } from './components/ShiftOperatorsSection';
import { db, auth } from './firebase';
import { collection, onSnapshot, query, orderBy, doc, setDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { handleFirestoreError, OperationType } from './lib/firestoreErrorHandler';

const GridOps = lazy(() => import('./components/GridOps').then(m => ({ default: m.GridOps })));

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('GRID_OPS');
  const [pendingAction, setPendingAction] = useState<'CREATE' | 'IMPORT' | null>(null);

  // === ESTADO CENTRALIZADO (SINCRONIZADO COM FIREBASE) ===
  const [globalFlights, setGlobalFlights] = useState<FlightData[]>([]);
  const [globalVehicles, setGlobalVehicles] = useState<Vehicle[]>([]);
  const [globalOperators, setGlobalOperators] = useState<OperatorProfile[]>([]);
  const [globalAirlines, setGlobalAirlines] = useState<Airline[]>([]);
  const [globalAircraftDb, setGlobalAircraftDb] = useState<AircraftDatabaseEntry[]>([]);
  const [meshFlights, setMeshFlights] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      setAuthError(null);
    } catch (error: any) {
      console.error("Erro no login Google:", error);
      setAuthError("Falha no login com Google. Verifique se o provedor está habilitado.");
    }
  };

  // Autenticação anônima para garantir que as regras funcionem
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setAuthError(null);
      } else {
        signInAnonymously(auth).catch((error: any) => {
          console.error("Erro na autenticação anônima:", error);
          if (error.code === 'auth/admin-restricted-operation') {
            setAuthError("A autenticação anônima está desativada no console do Firebase. Por favor, faça login com Google ou habilite o provedor 'Anônimo'.");
          } else {
            setAuthError("Erro de autenticação: " + error.message);
          }
        });
      }
    });
    return unsub;
  }, []);

  // Listeners do Firebase
  useEffect(() => {
    if (!user) return;

    const qFlights = query(collection(db, 'flights'), orderBy('etd', 'asc'));
    const unsubFlights = onSnapshot(qFlights, (snapshot) => {
      const flights = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as FlightData));
      setGlobalFlights(flights);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'flights');
      setIsLoading(false);
    });

    const unsubOperators = onSnapshot(collection(db, 'operators'), (snapshot) => {
      const operators = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as OperatorProfile));
      setGlobalOperators(operators);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'operators');
    });

    const unsubAirlines = onSnapshot(collection(db, 'airlines'), (snapshot) => {
      const airlines = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Airline));
      setGlobalAirlines(airlines);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'airlines');
    });

    const unsubAircraftDb = onSnapshot(collection(db, 'aircraft_database'), (snapshot) => {
      const aircraft = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AircraftDatabaseEntry));
      setGlobalAircraftDb(aircraft);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'aircraft_database');
    });

    // Seeding inicial se estiver vazio (apenas para demonstração)
    const seedInitialData = async () => {
      // Usamos um flag no localStorage para não tentar seedar toda vez que o app carrega se o onSnapshot demorar
      if (localStorage.getItem('jetfuel_seeded')) return;

      // Esperar um pouco para o onSnapshot carregar
      setTimeout(async () => {
        if (globalAirlines.length === 0) {
          const initialAirlines = [
            { name: 'GOL', iata: 'G3', icao: 'GLO' },
            { name: 'LATAM', iata: 'LA', icao: 'TAM' },
            { name: 'AZUL', iata: 'AD', icao: 'AZU' },
            { name: 'TAP', iata: 'TP', icao: 'TAP' }
          ];
          for (const a of initialAirlines) {
            await addDoc(collection(db, 'airlines'), a);
          }
        }
        
        if (globalAircraftDb.length === 0) {
          const initialAircraft = [
            { registration: 'PR-XMA', model: 'B737-8', airlineIata: 'G3' },
            { registration: 'PR-XMB', model: 'B737-8', airlineIata: 'G3' },
            { registration: 'PT-MZA', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-YRA', model: 'A320neo', airlineIata: 'AD' }
          ];
          for (const a of initialAircraft) {
            await addDoc(collection(db, 'aircraft_database'), a);
          }
        }
        localStorage.setItem('jetfuel_seeded', 'true');
      }, 5000);
    };
    
    seedInitialData();

    return () => {
      unsubFlights();
      unsubOperators();
      unsubAirlines();
      unsubAircraftDb();
    };
  }, [user]);

  // Funções de Persistência
  const persistFlight = async (flight: Partial<FlightData>) => {
    try {
      if (!flight.id) {
        await addDoc(collection(db, 'flights'), { ...flight, createdAt: serverTimestamp() });
      } else {
        const { id, ...data } = flight;
        await setDoc(doc(db, 'flights', id), data, { merge: true });
      }
    } catch (error) {
      handleFirestoreError(error, flight.id ? OperationType.UPDATE : OperationType.CREATE, `flights/${flight.id || ''}`);
    }
  };

  const persistOperator = async (operator: Partial<OperatorProfile>) => {
    try {
      if (!operator.id) {
        await addDoc(collection(db, 'operators'), { ...operator, createdAt: serverTimestamp() });
      } else {
        const { id, ...data } = operator;
        await setDoc(doc(db, 'operators', id), data, { merge: true });
      }
    } catch (error) {
      handleFirestoreError(error, operator.id ? OperationType.UPDATE : OperationType.CREATE, `operators/${operator.id || ''}`);
    }
  };

  const removeOperator = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'operators', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `operators/${id}`);
    }
  };

  const finalizeFlight = async (flight: FlightData) => {
    try {
      // 1. Salvar na coleção de finalizados (Caixa Preta)
      await addDoc(collection(db, 'finalized_flights'), {
        flightId: flight.id,
        flightData: flight,
        finalizedAt: serverTimestamp()
      });
      // 2. Remover da malha ativa
      await deleteDoc(doc(db, 'flights', flight.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `finalized_flights/${flight.id}`);
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
    <div className={`${isDarkMode ? 'dark bg-slate-950' : 'bg-slate-50'} ${isPseudoFullscreen ? 'fixed inset-0 z-[9999]' : 'h-screen w-screen'} overflow-hidden flex flex-col`}>
      {authError && !user && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/90 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 p-8 rounded-2xl max-w-md w-full shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <X size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Erro de Autenticação</h2>
            <p className="text-slate-400 mb-8 leading-relaxed">
              {authError}
            </p>
            <div className="space-y-4">
              <button 
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-bold py-3 px-6 rounded-xl transition-all active:scale-95"
              >
                <img src="https://www.gstatic.com/firebase/explore/google.svg" alt="Google" className="w-5 h-5" />
                Entrar com Google
              </button>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                Ou habilite "Anonymous Auth" no Console do Firebase
              </p>
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
                    meshFlights={meshFlights}
                    setMeshFlights={setMeshFlights}
                    onOpenShiftOperators={() => setView('SHIFT_OPERATORS')}
                    pendingAction={pendingAction}
                    setPendingAction={setPendingAction}
                    onFinalizeFlight={finalizeFlight}
                  />
                )}
                {view === 'SHIFT_OPERATORS' && (
                  <ShiftOperatorsSection 
                    onClose={() => setView('GRID_OPS')}
                    operators={globalOperators}
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
