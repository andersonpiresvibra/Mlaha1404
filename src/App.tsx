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
  const [globalFleet, setGlobalFleet] = useState<any[]>([]); // Added fleet state
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

    const unsubFleet = onSnapshot(collection(db, 'fleet'), (snapshot) => {
      const fleet = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setGlobalFleet(fleet);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'fleet');
    });

    // Seeding inicial se estiver vazio (apenas para demonstração)
    const seedInitialData = async () => {
      // Usamos um flag no localStorage para não tentar seedar toda vez que o app carrega se o onSnapshot demorar
      if (localStorage.getItem('jetfuel_seeded_v7')) return;

      // Esperar um pouco para o onSnapshot carregar
      setTimeout(async () => {
        if (globalAirlines.length === 0 || !globalAirlines.find(a => a.iata === 'DL')) {
          const initialAirlines = [
            { name: 'GOL LINHAS AEREAS', iata: 'RG', icao: 'GLO', allowedModels: ['B737-7', 'B737-8'] },
            { name: 'LATAM AIRLINES', iata: 'LA', icao: 'TAM', allowedModels: ['A319', 'A320', 'A321', 'B777', 'B787'] },
            { name: 'AZUL', iata: 'AD', icao: 'AZU', allowedModels: ['A320neo', 'A330', 'E195'] },
            { name: 'TAP AIR PORTUGAL', iata: 'TP', icao: 'TAP', allowedModels: ['A330', 'A330-900', 'A321LR'] },
            { name: 'COPA AIRLINES', iata: 'CM', icao: 'CMP', allowedModels: ['B-737'] },
            { name: 'AMERICAN AIRLINES', iata: 'AA', icao: 'AAL', allowedModels: ['B777', 'B787'] },
            { name: 'DELTA AIRLINES', iata: 'DL', icao: 'DAL', allowedModels: ['A350'] }
          ];
          for (const a of initialAirlines) {
            // Only add if it doesn't exist to prevent duplicates during re-seeding
            if (!globalAirlines.find(existing => existing.iata === a.iata)) {
                try {
                  await addDoc(collection(db, 'airlines'), a);
                } catch (e) {
                  console.error("Failed to seed airline:", e);
                }
            }
          }
        }
        
        if (globalAircraftDb.length === 0 || !globalAircraftDb.find(a => a.airlineIata === 'LA')) {
          const golAircraft = [
            { registration: 'PR-GEA', model: 'B737-7', airlineIata: 'RG' },
            { registration: 'PR-GEC', model: 'B737-7', airlineIata: 'RG' },
            { registration: 'PR-GED', model: 'B737-7', airlineIata: 'RG' },
            { registration: 'PR-GEH', model: 'B737-7', airlineIata: 'RG' },
            { registration: 'PR-GEI', model: 'B737-7', airlineIata: 'RG' },
            { registration: 'PR-GEJ', model: 'B737-7', airlineIata: 'RG' },
            { registration: 'PR-GEK', model: 'B737-7', airlineIata: 'RG' },
            { registration: 'PR-GEQ', model: 'B737-7', airlineIata: 'RG' },
            { registration: 'PR-GIH', model: 'B737-7', airlineIata: 'RG' },
            { registration: 'PR-GOQ', model: 'B737-7', airlineIata: 'RG' },
            { registration: 'PR-GOR', model: 'B737-7', airlineIata: 'RG' },
            { registration: 'PR-VBQ', model: 'B737-7', airlineIata: 'RG' },
            { registration: 'PR-GGE', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GGF', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GGH', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GGL', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GGM', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GGP', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GGQ', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GGR', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GGX', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GKA', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GKB', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GKC', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GKD', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GKE', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GTC', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GTE', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GTG', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GTH', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GTL', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GTM', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GUB', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GUC', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GUE', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GUF', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GUH', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GUI', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GUJ', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GUK', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GUL', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GUM', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GUN', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GUP', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GUR', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GUT', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GUU', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GUV', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GUX', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GUY', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GUZ', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GXA', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GXB', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GXC', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GXD', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GXE', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GXH', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GXI', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GXJ', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GXL', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GXM', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GXN', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GXP', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GXQ', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GXR', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GXT', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GXU', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GXV', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GXW', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GXX', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GYA', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GYD', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GZH', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GZI', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GZS', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GZU', model: 'B737-8', airlineIata: 'RG' },
            { registration: 'PR-GZV', model: 'B737-8', airlineIata: 'RG' }
          ];
          
          const latamAircraft = [
            { registration: 'PR-MBU', model: 'A319', airlineIata: 'LA' },
            { registration: 'PR-MBV', model: 'A319', airlineIata: 'LA' },
            { registration: 'PR-MBW', model: 'A319', airlineIata: 'LA' },
            { registration: 'PR-MYC', model: 'A319', airlineIata: 'LA' },
            { registration: 'PR-MYL', model: 'A319', airlineIata: 'LA' },
            { registration: 'PR-MYM', model: 'A319', airlineIata: 'LA' },
            { registration: 'PT-TMA', model: 'A319', airlineIata: 'LA' },
            { registration: 'PT-TMB', model: 'A319', airlineIata: 'LA' },
            { registration: 'PT-TMC', model: 'A319', airlineIata: 'LA' },
            { registration: 'PT-TMD', model: 'A319', airlineIata: 'LA' },
            { registration: 'PT-TME', model: 'A319', airlineIata: 'LA' },
            { registration: 'PT-TMG', model: 'A319', airlineIata: 'LA' },
            { registration: 'PT-TMI', model: 'A319', airlineIata: 'LA' },
            { registration: 'PT-TML', model: 'A319', airlineIata: 'LA' },
            { registration: 'PT-TMO', model: 'A319', airlineIata: 'LA' },
            { registration: 'PT-TMT', model: 'A319', airlineIata: 'LA' },
            { registration: 'PT-TPA', model: 'A319', airlineIata: 'LA' },
            { registration: 'PT-TPB', model: 'A319', airlineIata: 'LA' },
            { registration: 'PR-MAG', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MAK', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MBA', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MBF', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MBG', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MBH', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MHA', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MHE', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MHF', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MHG', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MHI', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MHJ', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MHK', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MHM', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MHP', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MHQ', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MHR', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MHU', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MHW', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MHX', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MHZ', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MYA', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MYH', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MYI', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MYJ', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MYK', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MYN', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MYO', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MYP', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MYQ', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MYR', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MYT', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MYV', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MYW', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MYX', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MYY', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-MYZ', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-TQB', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-TQC', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-TYA', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-TYD', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-TYF', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-TYH', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-TYI', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-TYJ', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-TYK', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-TYL', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-TYM', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-TYN', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-TYO', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-TYP', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-TYQ', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-TYR', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-TYS', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-TYT', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-TYU', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-TYV', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-XBA', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-XBB', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-XBC', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-XBD', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-XBE', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-XBF', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-XBG', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-XBH', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-XBI', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-XBJ', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-XBK', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-XBL', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-XBM', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-XBN', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-XBO', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-XBP', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-XBQ', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-XBR', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-XBS', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-XBT', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-XBU', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-XBW', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-XBX', model: 'A320', airlineIata: 'LA' },
            { registration: 'PR-XBZ', model: 'A320', airlineIata: 'LA' },
            { registration: 'PS-LHB', model: 'A320', airlineIata: 'LA' },
            { registration: 'PS-LHC', model: 'A320', airlineIata: 'LA' },
            { registration: 'PT-MXA', model: 'A321', airlineIata: 'LA' },
            { registration: 'PT-MXB', model: 'A321', airlineIata: 'LA' },
            { registration: 'PT-MXC', model: 'A321', airlineIata: 'LA' },
            { registration: 'PT-MXD', model: 'A321', airlineIata: 'LA' },
            { registration: 'PT-MXE', model: 'A321', airlineIata: 'LA' },
            { registration: 'PT-MXF', model: 'A321', airlineIata: 'LA' },
            { registration: 'PT-MXG', model: 'A321', airlineIata: 'LA' },
            { registration: 'PT-MXH', model: 'A321', airlineIata: 'LA' },
            { registration: 'PT-MXI', model: 'A321', airlineIata: 'LA' },
            { registration: 'PT-MXJ', model: 'A321', airlineIata: 'LA' },
            { registration: 'PT-MXL', model: 'A321', airlineIata: 'LA' },
            { registration: 'PT-MXM', model: 'A321', airlineIata: 'LA' },
            { registration: 'PT-MXN', model: 'A321', airlineIata: 'LA' },
            { registration: 'PT-MXO', model: 'A321', airlineIata: 'LA' },
            { registration: 'PT-MXP', model: 'A321', airlineIata: 'LA' },
            { registration: 'PT-MXQ', model: 'A321', airlineIata: 'LA' },
            { registration: 'PT-XPA', model: 'A321', airlineIata: 'LA' },
            { registration: 'PT-XPB', model: 'A321', airlineIata: 'LA' },
            { registration: 'PT-XPC', model: 'A321', airlineIata: 'LA' },
            { registration: 'PT-XPD', model: 'A321', airlineIata: 'LA' },
            { registration: 'PT-XPE', model: 'A321', airlineIata: 'LA' },
            { registration: 'PT-XPF', model: 'A321', airlineIata: 'LA' },
            { registration: 'PT-XPG', model: 'A321', airlineIata: 'LA' },
            { registration: 'PT-XPH', model: 'A321', airlineIata: 'LA' },
            { registration: 'PT-XPI', model: 'A321', airlineIata: 'LA' },
            { registration: 'PT-XPJ', model: 'A321', airlineIata: 'LA' },
            { registration: 'PT-XPL', model: 'A321', airlineIata: 'LA' },
            { registration: 'PT-XPM', model: 'A321', airlineIata: 'LA' },
            { registration: 'PT-XPN', model: 'A321', airlineIata: 'LA' },
            { registration: 'PT-XPO', model: 'A321', airlineIata: 'LA' },
            { registration: 'PT-XPQ', model: 'A321', airlineIata: 'LA' },
            { registration: 'PS-LBA', model: 'A321', airlineIata: 'LA' },
            { registration: 'PS-LBB', model: 'A321', airlineIata: 'LA' },
            { registration: 'PS-LBC', model: 'A321', airlineIata: 'LA' },
            { registration: 'PS-LBD', model: 'A321', airlineIata: 'LA' },
            { registration: 'PS-LBE', model: 'A321', airlineIata: 'LA' },
            { registration: 'PS-LBF', model: 'A321', airlineIata: 'LA' },
            { registration: 'PS-LBG', model: 'A321', airlineIata: 'LA' },
            { registration: 'PS-LBH', model: 'A321', airlineIata: 'LA' },
            { registration: 'PS-LBI', model: 'A321', airlineIata: 'LA' },
            { registration: 'PS-LBJ', model: 'A321', airlineIata: 'LA' },
            { registration: 'PS-LBK', model: 'A321', airlineIata: 'LA' },
            { registration: 'PS-LBL', model: 'A321', airlineIata: 'LA' },
            { registration: 'PS-LBM', model: 'A321', airlineIata: 'LA' },
            { registration: 'PS-LBN', model: 'A321', airlineIata: 'LA' },
            { registration: 'PT-MUA', model: 'B777', airlineIata: 'LA' },
            { registration: 'PT-MUB', model: 'B777', airlineIata: 'LA' },
            { registration: 'PT-MUC', model: 'B777', airlineIata: 'LA' },
            { registration: 'PT-MUD', model: 'B777', airlineIata: 'LA' },
            { registration: 'PT-MUE', model: 'B777', airlineIata: 'LA' },
            { registration: 'PT-MUF', model: 'B777', airlineIata: 'LA' },
            { registration: 'PT-MUG', model: 'B777', airlineIata: 'LA' },
            { registration: 'PT-MUH', model: 'B777', airlineIata: 'LA' },
            { registration: 'PT-MUI', model: 'B777', airlineIata: 'LA' },
            { registration: 'PT-MUJ', model: 'B777', airlineIata: 'LA' },
            { registration: 'PS-LAA', model: 'B787', airlineIata: 'LA' }
          ];

          const copaAircraft = [
            { registration: 'HP-1376', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1377', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1378', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1520', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1521', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1524', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1525', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1530', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1531', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1526', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1533', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1534', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1538', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1539', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1716', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1717', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1718', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1719', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1720', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1721', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1722', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1723', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1724', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1725', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1726', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1727', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1728', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1729', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1730', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1821', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1822', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1823', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1824', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1825', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1826', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1827', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1828', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1829', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1830', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1831', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1832', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1833', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1834', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1835', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1836', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1837', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1838', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1839', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1840', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1841', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1842', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1843', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1844', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1845', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1846', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1847', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1848', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1849', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1850', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1851', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1852', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1853', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1854', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1855', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1856', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-1857', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9801', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9802', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9803', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9804', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9805', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9806', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9807', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9808', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9809', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9810', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9811', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9812', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9813', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9814', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9815', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9816', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9817', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9818', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9819', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9820', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9901', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9902', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9903', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9904', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9905', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9906', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9907', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9908', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9909', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9910', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9911', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9912', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9913', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9914', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9915', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9916', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9917', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9918', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9919', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9920', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9921', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9922', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9923', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9924', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9925', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9926', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9927', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9928', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9929', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9930', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9931', model: 'B-737', airlineIata: 'CM' },
            { registration: 'HP-9932', model: 'B-737', airlineIata: 'CM' }
          ];

          const americanAircraft = [
            { registration: '8AK', model: 'B777', airlineIata: 'AA' },
            { registration: '7LA', model: 'B777', airlineIata: 'AA' },
            { registration: '7AA', model: 'B777', airlineIata: 'AA' },
            { registration: '8LW', model: 'B777', airlineIata: 'AA' },
            { registration: '8BL', model: 'B777', airlineIata: 'AA' },
            { registration: '7BM', model: 'B777', airlineIata: 'AA' },
            { registration: '7BE', model: 'B777', airlineIata: 'AA' },
            { registration: '8LT', model: 'B777', airlineIata: 'AA' },
            { registration: '8LD', model: 'B777', airlineIata: 'AA' },
            { registration: '8BN', model: 'B777', airlineIata: 'AA' },
            { registration: '7LN', model: 'B777', airlineIata: 'AA' },
            { registration: '7LW', model: 'B777', airlineIata: 'AA' },
            { registration: '7LS', model: 'B777', airlineIata: 'AA' },
            { registration: '7AF', model: 'B777', airlineIata: 'AA' },
            { registration: '8LS', model: 'B777', airlineIata: 'AA' },
            { registration: '8AG', model: 'B777', airlineIata: 'AA' },
            { registration: '7LR', model: 'B777', airlineIata: 'AA' },
            { registration: '8LC', model: 'B777', airlineIata: 'AA' },
            { registration: '8AC', model: 'B777', airlineIata: 'AA' },
            { registration: '8BM', model: 'B777', airlineIata: 'AA' },
            { registration: '7BC', model: 'B777', airlineIata: 'AA' },
            { registration: '8LY', model: 'B777', airlineIata: 'AA' },
            { registration: '8BP', model: 'B777', airlineIata: 'AA' },
            { registration: '7LT', model: 'B777', airlineIata: 'AA' },
            { registration: '7BK', model: 'B777', airlineIata: 'AA' },
            { registration: '8AT', model: 'B777', airlineIata: 'AA' },
            { registration: '7BH', model: 'B777', airlineIata: 'AA' },
            { registration: '8AB', model: 'B777', airlineIata: 'AA' },
            { registration: '8AE', model: 'B777', airlineIata: 'AA' },
            { registration: '8LE', model: 'B777', airlineIata: 'AA' },
            { registration: '8BH', model: 'B777', airlineIata: 'AA' },
            { registration: '7LV', model: 'B777', airlineIata: 'AA' },
            { registration: '8LR', model: 'B777', airlineIata: 'AA' },
            { registration: '8LX', model: 'B777', airlineIata: 'AA' },
            { registration: '8AL', model: 'B777', airlineIata: 'AA' },
            { registration: '8LK', model: 'B777', airlineIata: 'AA' },
            { registration: '8BF', model: 'B777', airlineIata: 'AA' },
            { registration: '8LV', model: 'B777', airlineIata: 'AA' },
            { registration: '7LG', model: 'B777', airlineIata: 'AA' },
            { registration: '8LH', model: 'B777', airlineIata: 'AA' },
            { registration: '8AR', model: 'B777', airlineIata: 'AA' },
            { registration: '8BE', model: 'B777', airlineIata: 'AA' },
            { registration: '7LD', model: 'B777', airlineIata: 'AA' },
            { registration: '8LG', model: 'B777', airlineIata: 'AA' },
            { registration: '8LU', model: 'B777', airlineIata: 'AA' },
            { registration: '7AM', model: 'B777', airlineIata: 'AA' }
          ];

          const deltaAircraft = [
            { registration: 'N801NW', model: 'A350', airlineIata: 'DL' },
            { registration: 'N802NW', model: 'A350', airlineIata: 'DL' },
            { registration: 'N803NW', model: 'A350', airlineIata: 'DL' },
            { registration: 'N804NW', model: 'A350', airlineIata: 'DL' },
            { registration: 'N805NW', model: 'A350', airlineIata: 'DL' },
            { registration: 'N806NW', model: 'A350', airlineIata: 'DL' },
            { registration: 'N807NW', model: 'A350', airlineIata: 'DL' },
            { registration: 'N808NW', model: 'A350', airlineIata: 'DL' },
            { registration: 'N809NW', model: 'A350', airlineIata: 'DL' },
            { registration: 'N810NW', model: 'A350', airlineIata: 'DL' },
            { registration: 'N811NW', model: 'A350', airlineIata: 'DL' },
            { registration: 'N812NW', model: 'A350', airlineIata: 'DL' },
            { registration: 'N813NW', model: 'A350', airlineIata: 'DL' },
            { registration: 'N814NW', model: 'A350', airlineIata: 'DL' },
            { registration: 'N815NW', model: 'A350', airlineIata: 'DL' },
            { registration: 'N819NW', model: 'A350', airlineIata: 'DL' },
            { registration: 'N820NW', model: 'A350', airlineIata: 'DL' },
            { registration: 'N821NW', model: 'A350', airlineIata: 'DL' },
            { registration: 'N822NW', model: 'A350', airlineIata: 'DL' },
            { registration: 'N823NW', model: 'A350', airlineIata: 'DL' },
            { registration: 'N824NW', model: 'A350', airlineIata: 'DL' },
            { registration: 'N825NW', model: 'A350', airlineIata: 'DL' },
            { registration: 'N826NW', model: 'A350', airlineIata: 'DL' },
            { registration: 'N851NW', model: 'A350', airlineIata: 'DL' },
            { registration: 'N857NW', model: 'A350', airlineIata: 'DL' },
            { registration: 'N858NW', model: 'A350', airlineIata: 'DL' },
            { registration: 'N859NW', model: 'A350', airlineIata: 'DL' },
            { registration: 'N860NW', model: 'A350', airlineIata: 'DL' },
            { registration: 'N861NW', model: 'A350', airlineIata: 'DL' },
            { registration: 'N862NW', model: 'A350', airlineIata: 'DL' },
            { registration: 'N405DX', model: 'A350', airlineIata: 'DL' },
            { registration: 'N407DX', model: 'A350', airlineIata: 'DL' },
            { registration: 'N408DX', model: 'A350', airlineIata: 'DL' },
            { registration: 'N415DX', model: 'A350', airlineIata: 'DL' },
            { registration: 'N420DX', model: 'A350', airlineIata: 'DL' },
            { registration: 'N421DX', model: 'A350', airlineIata: 'DL' },
            { registration: 'N422DX', model: 'A350', airlineIata: 'DL' },
            { registration: 'N503DN', model: 'A350', airlineIata: 'DL' },
            { registration: 'N505DN', model: 'A350', airlineIata: 'DL' },
            { registration: 'N506DN', model: 'A350', airlineIata: 'DL' },
            { registration: 'N507DN', model: 'A350', airlineIata: 'DL' },
            { registration: 'N508DN', model: 'A350', airlineIata: 'DL' },
            { registration: 'N509DN', model: 'A350', airlineIata: 'DL' },
            { registration: 'N510DN', model: 'A350', airlineIata: 'DL' },
            { registration: 'N511DN', model: 'A350', airlineIata: 'DL' },
            { registration: 'N512DN', model: 'A350', airlineIata: 'DL' },
            { registration: 'N513DN', model: 'A350', airlineIata: 'DL' },
            { registration: 'N514DN', model: 'A350', airlineIata: 'DL' },
            { registration: 'N515DN', model: 'A350', airlineIata: 'DL' },
            { registration: 'N516DN', model: 'A350', airlineIata: 'DL' },
            { registration: 'N517DN', model: 'A350', airlineIata: 'DL' },
            { registration: 'N518DN', model: 'A350', airlineIata: 'DL' },
            { registration: 'N519DN', model: 'A350', airlineIata: 'DL' },
            { registration: 'N520DN', model: 'A350', airlineIata: 'DL' },
            { registration: 'N521DN', model: 'A350', airlineIata: 'DL' },
            { registration: 'N522DN', model: 'A350', airlineIata: 'DL' },
            { registration: 'N523DN', model: 'A350', airlineIata: 'DL' },
            { registration: 'N524DN', model: 'A350', airlineIata: 'DL' },
            { registration: 'N525DN', model: 'A350', airlineIata: 'DL' },
            { registration: 'N526DN', model: 'A350', airlineIata: 'DL' },
            { registration: 'N527DN', model: 'A350', airlineIata: 'DL' },
            { registration: 'N568DZ', model: 'A350', airlineIata: 'DL' },
            { registration: 'N569DZ', model: 'A350', airlineIata: 'DL' },
            { registration: 'N572DZ', model: 'A350', airlineIata: 'DL' },
            { registration: 'N573DZ', model: 'A350', airlineIata: 'DL' },
            { registration: 'N574DZ', model: 'A350', airlineIata: 'DL' },
            { registration: 'N575DZ', model: 'A350', airlineIata: 'DL' },
            { registration: 'N576DZ', model: 'A350', airlineIata: 'DL' },
            { registration: 'N577DZ', model: 'A350', airlineIata: 'DL' },
            { registration: 'N578DZ', model: 'A350', airlineIata: 'DL' },
            { registration: 'N579DZ', model: 'A350', airlineIata: 'DL' },
            { registration: 'N580DZ', model: 'A350', airlineIata: 'DL' }
          ];

          const tapAircraft = [
            { registration: 'CS-TOU', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TOV', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TOW', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TOX', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TOY', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TOZ', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TOA', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TOB', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TOC', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TOD', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TOE', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TOF', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TOG', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TOH', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TOI', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TOJ', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TOK', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TOL', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TOM', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TON', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TOO', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TOP', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TOQ', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TOR', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TOS', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TOT', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TUA', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TUB', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TUC', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TUD', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TUE', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TUF', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TUG', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TUH', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TUI', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TUJ', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TUK', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TUL', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TUM', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TUN', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TUO', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TUP', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TUQ', model: 'A330', airlineIata: 'TP' },
            { registration: 'CS-TUR', model: 'A330', airlineIata: 'TP' }
          ];

          for (const a of [...golAircraft, ...latamAircraft, ...copaAircraft, ...americanAircraft, ...deltaAircraft, ...tapAircraft]) {
             if (!globalAircraftDb.find(existing => existing.registration === a.registration)) {
                try {
                  await addDoc(collection(db, 'aircraft_database'), a);
                } catch (e) {
                  console.error("Failed to seed aircraft:", e);
                }
             }
          }
        }

        if (globalFleet.length === 0) {
          const initialFleet = [
            { fleetNumber: '1001', type: 'SRV', brand: 'Mercedes' },
            { fleetNumber: '1002', type: 'SRV', brand: 'Ford' },
            { fleetNumber: '2001', type: 'CTA', brand: 'VW' },
            { fleetNumber: '2002', type: 'CTA', brand: 'VW' }
          ];
          for (const f of initialFleet) {
            try {
              await addDoc(collection(db, 'fleet'), f);
            } catch (e) {
              console.error("Failed to seed fleet:", e);
            }
          }
        }

        // Seed fixed flights if none exist
        if (globalFlights.length === 0) {
          const fixedFlights = [
            { flightNumber: 'RG1554', destination: 'SBSG', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG1556', destination: 'SBFZ', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG1558', destination: 'SBFZ', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG1560', destination: 'SBRF', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG1566', destination: 'SBSL', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG1570', destination: 'SBVC', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG1578', destination: 'SBJU', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG1580', destination: 'SBJU', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG1586', destination: 'SBRF', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG1588', destination: 'SBSG', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG1642', destination: 'SBJP', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG1644', destination: 'SBJP', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG1652', destination: 'SBAR', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG1654', destination: 'SBAR', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG1658', destination: 'SBPS', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG1668', destination: 'SBMO', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG1670', destination: 'SBMO', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG1672', destination: 'SBMO', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG1676', destination: 'SBSG', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG1678', destination: 'SBSG', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG1680', destination: 'SBSG', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG1690', destination: 'SBSV', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG1692', destination: 'SBSV', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG1774', destination: 'SBFN', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG7230', destination: 'SVMI', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG7480', destination: 'SGAS', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG7486', destination: 'SAME', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG7630', destination: 'SUMU', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG7638', destination: 'SLVR', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG7640', destination: 'SABE', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG7642', destination: 'SABE', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG7644', destination: 'SABE', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG7648', destination: 'SABE', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG7726', destination: 'SAAR', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG9096', destination: 'SBSV', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG9275', destination: 'SBFI', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG9600', destination: 'SBGO', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG9604', destination: 'SBPA', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG9608', destination: 'SBCY', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG9610', destination: 'SBBE', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG9612', destination: 'SBSV', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG9616', destination: 'SBVT', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG9618', destination: 'SBSV', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG9619', destination: 'SBVT', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG9620', destination: 'SBBR', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG9631', destination: 'SBMO', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG9632', destination: 'SBRF', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG9634', destination: 'SBCY', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG9636', destination: 'SBBR', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG9639', destination: 'SBJP', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'RG9640', destination: 'SBVT', airline: 'GOL LINHAS AEREAS', airlineCode: 'RG', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' }
          ];

          const latamFlights = [
            { flightNumber: 'LA0604', destination: 'SCEL', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA0608', destination: 'SCEL', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA0610', destination: 'SCEL', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA0629', destination: 'SCEL', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA0714', destination: 'LEMD', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA0715', destination: 'SCEL', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA0753', destination: 'SCEL', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA0762', destination: 'SUMU', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA0763', destination: 'SCEL', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA1300', destination: 'SGAS', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA1304', destination: 'SGAS', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA2425', destination: 'SPJC', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA2429', destination: 'SPJC', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3020', destination: 'SBFZ', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3044', destination: 'SBSG', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3105', destination: 'SBCG', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3128', destination: 'SBCG', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3134', destination: 'SBFL', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3147', destination: 'SBPA', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3194', destination: 'SBTE', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3196', destination: 'SBTE', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3200', destination: 'SBFI', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3202', destination: 'SBFI', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3204', destination: 'SBFI', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3206', destination: 'SBFI', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3207', destination: 'SBAR', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3208', destination: 'SBUL', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3210', destination: 'SBUL', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3216', destination: 'SBMG', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3218', destination: 'SBPA', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3222', destination: 'SBVT', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3228', destination: 'SBBE', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3230', destination: 'SBBE', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3232', destination: 'SBBE', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3239', destination: 'SBSL', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3240', destination: 'SBPS', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3244', destination: 'SBPS', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3254', destination: 'SBIL', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3257', destination: 'SBBR', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3261', destination: 'SBSV', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3263', destination: 'SBBR', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3265', destination: 'SBBR', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3266', destination: 'SBGO', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3270', destination: 'SBCY', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3276', destination: 'SBCH', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3282', destination: 'SBCT', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3284', destination: 'SBCT', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3286', destination: 'SBCT', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3288', destination: 'SBCT', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3296', destination: 'SBEG', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3300', destination: 'SBFL', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3302', destination: 'SBFL', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3304', destination: 'SBNF', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3306', destination: 'SBSV', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3314', destination: 'SBPS', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3316', destination: 'SBFZ', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3330', destination: 'SBVT', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3332', destination: 'SBVT', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3334', destination: 'SBVT', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3336', destination: 'SBVT', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3340', destination: 'SBGL', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3344', destination: 'SBCF', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3346', destination: 'SBSV', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3350', destination: 'SBSV', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3352', destination: 'SBGL', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3354', destination: 'SBSV', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3366', destination: 'SBGL', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3372', destination: 'SBGO', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3374', destination: 'SBRF', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3376', destination: 'SBRF', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3378', destination: 'SBRF', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3380', destination: 'SBRF', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3388', destination: 'SBPL', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3394', destination: 'SBPJ', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3396', destination: 'SBPS', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3398', destination: 'SBMK', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3401', destination: 'SBCA', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3404', destination: 'SBNF', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3408', destination: 'SBNF', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3416', destination: 'SBPA', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3418', destination: 'SBPA', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3420', destination: 'SBPA', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3422', destination: 'SBPA', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3424', destination: 'SBPA', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3438', destination: 'SBSG', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3440', destination: 'SBSG', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3446', destination: 'SBMO', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3448', destination: 'SBMO', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3450', destination: 'SBMO', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3452', destination: 'SBMO', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3458', destination: 'SBRF', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3470', destination: 'SBJE', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3506', destination: 'SBFZ', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3514', destination: 'SBPF', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3518', destination: 'SBGO', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3521', destination: 'SBDO', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3529', destination: 'SBBR', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3534', destination: 'SBCG', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3538', destination: 'SBVC', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3544', destination: 'SBGO', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3545', destination: 'SBCF', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3546', destination: 'SBGO', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3550', destination: 'SBRJ', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3552', destination: 'SBCF', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3556', destination: 'SBCF', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3560', destination: 'SBEG', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3562', destination: 'SBEG', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3568', destination: 'SBPV', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3576', destination: 'SBCY', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3604', destination: 'SBBE', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3612', destination: 'SBSL', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3618', destination: 'SBUL', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3620', destination: 'SBCY', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3636', destination: 'SBJP', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3638', destination: 'SBCY', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3652', destination: 'SBSV', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3664', destination: 'SBSI', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3670', destination: 'SBBR', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3676', destination: 'SBRF', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3690', destination: 'SBLO', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3698', destination: 'SBGL', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3707', destination: 'SBMO', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3744', destination: 'SBAR', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3765', destination: 'SBFZ', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3790', destination: 'SBCF', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3828', destination: 'SBFN', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3830', destination: 'SBJU', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3832', destination: 'SBPJ', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3834', destination: 'SBSG', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3836', destination: 'SBSR', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3838', destination: 'SBCX', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3842', destination: 'SBTE', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3872', destination: 'SBBE', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3874', destination: 'SBGL', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3880', destination: 'SBRP', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3960', destination: 'SBIZ', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA3974', destination: 'SBRJ', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA4518', destination: 'SBFL', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA4522', destination: 'SBPL', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA4524', destination: 'SBPA', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA4531', destination: 'SBLO', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA4536', destination: 'SBJP', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA4540', destination: 'SBCF', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA4548', destination: 'SBGL', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA4549', destination: 'SBMG', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA4550', destination: 'SBCT', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA4596', destination: 'SBBE', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA4602', destination: 'SBIL', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA4662', destination: 'SBJV', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA4672', destination: 'SBGL', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA4676', destination: 'SBBR', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA4702', destination: 'SBAR', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA4703', destination: 'SBBR', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA4708', destination: 'SBCT', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA4726', destination: 'SBJP', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA4742', destination: 'SBSL', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA4770', destination: 'SBJA', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA4776', destination: 'SBFZ', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA4904', destination: 'SKBO', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA4908', destination: 'SKBO', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA8016', destination: 'SUMU', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA8019', destination: 'SAME', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA8032', destination: 'SABE', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA8034', destination: 'SABE', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA8038', destination: 'SCEL', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA8048', destination: 'SACO', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA8058', destination: 'FAOR', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA8068', destination: 'LFPG', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA8070', destination: 'EDDF', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA8072', destination: 'LIMC', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA8076', destination: 'LEMD', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA8078', destination: 'EHAM', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA8084', destination: 'EGLL', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA8086', destination: 'KLAX', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA8098', destination: 'SPJC', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA8104', destination: 'SCEL', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA8110', destination: 'SUMU', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA8112', destination: 'MMMX', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA8120', destination: 'LIRF', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA8122', destination: 'SPJC', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA8126', destination: 'KMCO', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA8130', destination: 'SAEZ', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA8140', destination: 'SABE', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA8142', destination: 'SABE', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA8146', destination: 'LPPT', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA8176', destination: 'KJFK', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA8180', destination: 'KJFK', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA8186', destination: 'KMCO', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA8190', destination: 'KMIA', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA8192', destination: 'SABE', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA8194', destination: 'KMIA', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA9400', destination: 'SBGR', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'LA9437', destination: 'SBTC', airline: 'LATAM AIRLINES', airlineCode: 'LA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' }
          ];

          const copaFlights = [
            { flightNumber: 'CM0702', destination: 'MPTO', airline: 'COPA AIRLINES', airlineCode: 'CM', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'CM0744', destination: 'MPTO', airline: 'COPA AIRLINES', airlineCode: 'CM', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'CM0758', destination: 'MPTO', airline: 'COPA AIRLINES', airlineCode: 'CM', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'CM0774', destination: 'MPTO', airline: 'COPA AIRLINES', airlineCode: 'CM', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'CM0811', destination: 'MPTO', airline: 'COPA AIRLINES', airlineCode: 'CM', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'CM0841', destination: 'MPTO', airline: 'COPA AIRLINES', airlineCode: 'CM', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' }
          ];

          const americanFlights = [
            { flightNumber: 'AA0906', destination: 'KMIA', airline: 'AMERICAN AIRLINES', airlineCode: 'AA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'AA0930', destination: 'KMIA', airline: 'AMERICAN AIRLINES', airlineCode: 'AA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'AA0950', destination: 'KJFK', airline: 'AMERICAN AIRLINES', airlineCode: 'AA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'AA0858', destination: 'KMIA', airline: 'AMERICAN AIRLINES', airlineCode: 'AA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'AA0962', destination: 'KDFW', airline: 'AMERICAN AIRLINES', airlineCode: 'AA', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' }
          ];

          const deltaFlights = [
            { flightNumber: 'DL0104', destination: 'KATL', airline: 'DELTA AIRLINES', airlineCode: 'DL', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'DL0226', destination: 'KJFK', airline: 'DELTA AIRLINES', airlineCode: 'DL', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'DL0268', destination: 'KATL', airline: 'DELTA AIRLINES', airlineCode: 'DL', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'DL9926', destination: 'KJFK', airline: 'DELTA AIRLINES', airlineCode: 'DL', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' }
          ];

          const tapFlights = [
            { flightNumber: 'TP0082', destination: 'LPPT', airline: 'TAP AIR PORTUGAL', airlineCode: 'TP', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'TP0084', destination: 'LPPT', airline: 'TAP AIR PORTUGAL', airlineCode: 'TP', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'TP0088', destination: 'LPPT', airline: 'TAP AIR PORTUGAL', airlineCode: 'TP', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' },
            { flightNumber: 'TP0094', destination: 'LPPR', airline: 'TAP AIR PORTUGAL', airlineCode: 'TP', status: 'CHEGADA', fuelStatus: 0, origin: 'SBGL' }
          ];

          for (const f of [...fixedFlights, ...latamFlights, ...copaFlights, ...americanFlights, ...deltaFlights, ...tapFlights]) {
            try {
              await addDoc(collection(db, 'flights'), f);
            } catch (e) {
              console.error("Failed to seed fixed flight:", e);
            }
          }
        }

        localStorage.setItem('jetfuel_seeded_v3', 'true');
      }, 5000);
    };
    
    seedInitialData();

    return () => {
      unsubFlights();
      unsubOperators();
      unsubAirlines();
      unsubAircraftDb();
      unsubFleet();
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
