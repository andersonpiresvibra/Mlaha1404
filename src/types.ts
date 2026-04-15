
export enum FlightStatus {
  CHEGADA = 'CHEGADA',         // Monitoramento (ETA > 1h ou recém pousado)
  FILA = 'FILA',               // Prioridade (ETD < 1h, Sem Operador)
  DESIGNADO = 'DESIGNADO',     // Operador atribuído
  AGUARDANDO = 'AGUARDANDO',   // Aguardando liberação/calço
  ABASTECENDO = 'ABASTECENDO', // Fluxo ativo
  FINALIZADO = 'FINALIZADO',   // Concluído
  CANCELADO = 'CANCELADO'      // Voo cancelado ou não abastecido
}

export type OperatorStatus = 'DISPONÍVEL' | 'OCUPADO' | 'INTERVALO' | 'DESCONECTADO' | 'ENCHIMENTO' | 'DESIGNADO';
export type VehicleType = 'SERVIDOR' | 'CTA';
export type VehicleStatus = 'DISPONÍVEL' | 'OCUPADO' | 'INATIVO' | 'ENCHIMENTO';

export interface Vehicle {
  id: string; // Número do frota
  type: VehicleType;
  manufacturer: string;
  status: VehicleStatus;
  maxFlowRate: number; // L/min
  hasPlatform: boolean;
  operatorName?: string;
  currentPosition?: string;
  lastPosition?: string;
  capacity?: number; // Litros (relevante para CTA)
  currentVolume?: number; // Volume Atual em Litros
  counterInitial?: number; // Contador Inicial (9 dígitos)
    counterFinal?: number; // Contador Final (9 dígitos)
  isActive?: boolean;
  observations?: string;
}

export interface PitData {
  id: string;
  isActive: boolean;
  lastMaintenance?: Date;
  notes?: string;
}

export interface Operator {
  id: string;
  name: string;
  status: OperatorStatus;
  vehicleId?: string;
  vehicleType?: VehicleType;
  shiftStart?: Date;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
  isManager: boolean;
}

export type ShiftCycle = 'MANHÃ' | 'TARDE' | 'NOITE' | 'GERAL';
export type OperatorCategory = 'AERODROMO' | 'VIP' | 'ILHA';

export interface OperatorProfile {
  id: string;
  fullName: string;
  warName: string;
  companyId: string;
  gruId: string;
  vestNumber: string;
  photoUrl: string;
  status: OperatorStatus;
  category: OperatorCategory;
  lastPosition: string;
  fleetCapability?: 'CTA' | 'SRV';
  lastFlightEnd?: Date;
  assignedVehicle?: string; // Propriedade adicionada para o HUD de equipe
  shift: {
    cycle: ShiftCycle;
    start: string;
    end: string;
  };
  airlines: string[];
  ratings: {
    speed: number;
    safety: number;
    airlineSpecific: Record<string, number>;
  };
  expertise: {
    servidor: number;
    cta: number;
  };
  stats: {
    flightsWeekly: number;
    flightsMonthly: number;
    volumeWeekly: number;
    volumeMonthly: number;
  };
}

export interface TankData {
  id: string;
  capacity: number;
  currentLevel: number;
  temperature: number;
  density: number;
  status: 'ATIVO' | 'ISOLADO' | 'RECEBENDO' | 'DRENAGEM';
}

export interface PumpData {
  id: string;
  status: 'RUNNING' | 'STANDBY' | 'MAINTENANCE' | 'OFFLINE';
  rpm: number;
  pressure: number;
  flow: number;
}

export type LogType = 'SISTEMA' | 'MANUAL' | 'OBSERVACAO' | 'ALERTA' | 'ATRASO';

export interface FlightLog {
  id: string;
  timestamp: Date;
  type: LogType;
  message: string;
  author: string; // 'SISTEMA' ou Nome do Gestor
}

export interface FlightData {
  id: string;
  flightNumber: string; // V. Cheg
  departureFlightNumber?: string; // V. Saida
  airline: string;
  airlineCode: string;
  model: string;
  registration: string;
  origin: string;
  destination: string;
  eta: string;
  etd: string;
  actualArrivalTime?: string; // Horário de Calço (ATA)
  positionId: string;
  positionType?: 'SRV' | 'CTA';
  pitId?: string;
  wingSide?: 'LEFT' | 'RIGHT';
  fuelStatus: number;
  status: FlightStatus;
  operator?: string;
  supportOperator?: string;
  fleet?: string;
  fleetType?: 'SRV' | 'CTA';
  vehicleType?: VehicleType;
  volume?: number;
  messages?: ChatMessage[];
  
  // Novos campos de controle lógico
  isOnGround?: boolean; // Se já pousou (Status SOLO)
  isStandby?: boolean; // Se está em espera (Manutenção, etc)
  standbyReason?: string; // Motivo da espera
  designationTime?: Date; // Hora que foi designado (para calcular "A Caminho")
  startTime?: Date; // Hora que iniciou abastecimento
  endTime?: Date; // Hora que finalizou abastecimento (Para TAB)
  maxFlowRate?: number; // Vazão máxima registrada (L/min)
  currentFlowRate?: number; // Vazão atual (L/min)
  
  // Caixa Preta e Justificativas
  logs: FlightLog[]; 
  observations?: string; // Mantido para compatibilidade, mas idealmente derivado de logs
  delayJustification?: string; // Justificativa de atraso se ETD estourado
  isPinned?: boolean; // Se o voo está fixado no topo
  isHiddenFromGrid?: boolean; // Se foi limpo do grid mas deve permanecer no relatório
  isMeshFlight?: boolean; // Se é um voo da malha base não ativado
}

export interface MalhaBaseEntry {
  id: string;
  comp: string;
  prefixo: string;
  modelo: string;
  vCheg: string;
  eta: string;
  vSaida: string;
  icao: string;
  cid: string;
  pos: string;
  etd: string;
}

export type ViewState = 'GRID_OPS' | 'SHIFT_OPERATORS' | 'MALHA_BASE';

export interface AircraftType {
  id: string;
  manufacturer: string;
  model: string;
  prefix: string;
  airline: string;
}

export interface StaticFlight {
  id: string;
  airline: string;
  flightNumber: string;
  destination: string;
  city: string;
}

export interface Airline {
  id: string;
  name: string;
  iata: string;
  icao: string;
  logoUrl?: string;
  allowedModels?: string[];
}

export interface AircraftDatabaseEntry {
  id: string;
  registration: string;
  model: string;
  airlineIata: string;
}

export interface FleetRegistry {
  id: string;
  fleetNumber: string;
  type: 'SRV' | 'CTA';
  brand: string;
}

export type DetailedVehicleStatus = 'OPERACIONAL' | 'EM MANUTENÇÃO' | 'INATIVO';

export interface MaintenanceRecord {
  id: string;
  date: Date;
  type: string;
  description: string;
  technician: string;
}

export interface DetailedVehicle {
  id: string;
  manufacturer: string;
  model: string;
  type: VehicleType;
  plate: string;
  fleetNumber: string;
  atve: string;
  atveExpiry: Date;
  inspectionWeekly: Date;
  inspectionMonthly: Date;
  inspectionSemiannual: Date;
  inspectionAnnual: Date;
  status: DetailedVehicleStatus;
  maxFlowRate: number;
  hasPlatform: boolean;
  counterInitial: number;
  counterFinal: number;
  maintenanceHistory: MaintenanceRecord[];
  nextMaintenance: Date;
  mileage: number;
  engineHours: number;
  fuelLevel: number;
  tirePressure: number;
  batteryLevel: number;
  observations?: string;
}
