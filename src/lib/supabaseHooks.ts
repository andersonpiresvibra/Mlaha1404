import { useState, useEffect } from 'react';
import { getSupabaseClient } from '../supabase';
import { FlightData, Vehicle, OperatorProfile, Airline, AircraftDatabaseEntry } from '../types';

export function useSupabaseData() {
  const [globalFlights, setGlobalFlights] = useState<FlightData[]>([]);
  const [globalVehicles, setGlobalVehicles] = useState<Vehicle[]>([]);
  const [globalOperators, setGlobalOperators] = useState<OperatorProfile[]>([]);
  const [globalAirlines, setGlobalAirlines] = useState<Airline[]>([]);
  const [globalAircraftDb, setGlobalAircraftDb] = useState<AircraftDatabaseEntry[]>([]);
  const [globalFleet, setGlobalFleet] = useState<any[]>([]);
  const [globalMalhaBase, setGlobalMalhaBase] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setAuthError('Supabase não configurado. Por favor, configure as credenciais no menu "Conexões e Banco" (ícone de banco de dados).');
      setIsLoading(false);
      return;
    }
    
    setAuthError(null);

    const fetchData = async () => {
      try {
        const [flightsRes, opsRes, airlinesRes, aircraftRes, fleetRes, malhaRes] = await Promise.all([
          supabase.from('flights').select('*').order('etd', { ascending: true }),
          supabase.from('operators').select('*'),
          supabase.from('airlines').select('*'),
          supabase.from('aircraft_database').select('*'),
          supabase.from('fleet').select('*'),
          supabase.from('malha_base').select('*')
        ]);
        
        if (flightsRes.data) setGlobalFlights(flightsRes.data as any[]);
        if (opsRes.data) setGlobalOperators(opsRes.data as any[]);
        if (airlinesRes.data) setGlobalAirlines(airlinesRes.data as any[]);
        if (aircraftRes.data) setGlobalAircraftDb(aircraftRes.data as any[]);
        if (fleetRes.data) setGlobalFleet(fleetRes.data);
        if (malhaRes.data) setGlobalMalhaBase(malhaRes.data);
      } catch (error: any) {
        setAuthError('Erro ao buscar dados do Supabase: ' + error.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
    
    // Subscribe to all changes
    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'flights' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'operators' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'airlines' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'aircraft_database' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fleet' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'malha_base' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    globalFlights, setGlobalFlights,
    globalVehicles, setGlobalVehicles,
    globalOperators, setGlobalOperators,
    globalAirlines, setGlobalAirlines,
    globalAircraftDb, setGlobalAircraftDb,
    globalFleet, setGlobalFleet,
    globalMalhaBase, setGlobalMalhaBase,
    isLoading,
    authError,
    setAuthError
  };
}
