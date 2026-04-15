
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FlightStatus, FlightData, FlightLog, LogType, OperatorProfile, Vehicle, Airline, AircraftDatabaseEntry } from '../types';
import { db } from '../firebase';
import { doc, addDoc, collection, deleteDoc } from 'firebase/firestore';

import { FlightDetailsModal } from './FlightDetailsModal';
import { StatusBadge } from './SharedStats';
import { OperatorCell } from './OperatorCell';
import { AirlineLogo } from './AirlineLogo';
import { Spinner } from './ui/Spinner';

import { 
  LayoutGrid, Clock, UserCheck, Droplet, CheckCircle, 
  ArrowUp, ArrowDown, ArrowUpDown, 
  MessageSquare, FileText, Plane, Pen, BusFront,
  PlaneLanding, ListOrdered, AlertTriangle, Play, Pause, XCircle, Plus, Anchor,
  MapPin, Eye, CheckCheck, X, Save, History, TimerOff, UserPlus, Building2, Bell, Zap,
  MessageCircle, MoreVertical, Search, Settings, Upload, RefreshCw, Network
} from 'lucide-react';

type Tab = 'GERAL' | 'CHEGADA' | 'FILA' | 'DESIGNADOS' | 'ABASTECENDO' | 'FINALIZADO';
type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  key: keyof FlightData | null;
  direction: SortDirection;
}

interface ToastNotification {
    id: string;
    title: string;
    message: string;
    type: 'success' | 'info' | 'warning';
}

import { CreateFlightModal } from './CreateFlightModal';
import { DesigOpr } from './DesigOpr';
import { DelayJustificationModal } from './modals/DelayJustificationModal';
import { ObservationModal } from './modals/ObservationModal';
import { ConfirmActionModal } from './modals/ConfirmActionModal';
import { ImportModal } from './modals/ImportModal';

import { useTheme } from '../contexts/ThemeContext';

interface GridOpsProps {
    flights: FlightData[];
    onUpdateFlights: (flight: Partial<FlightData>) => Promise<void>;
    onFinalizeFlight: (flight: FlightData) => Promise<void>;
    vehicles: Vehicle[];
    operators: OperatorProfile[];
    airlines: Airline[];
    aircraftDb: AircraftDatabaseEntry[];
    initialTab?: Tab;
    globalSearchTerm?: string;
    onOpenShiftOperators?: () => void;
    onOpenMalhaBase?: () => void;
    pendingAction?: 'CREATE' | 'IMPORT' | null;
    setPendingAction?: (action: 'CREATE' | 'IMPORT' | null) => void;
}

const parseTime = (timeStr: string) => {
    if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) {
        return new Date(NaN); // Return invalid date
    }
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
};

// Função para calcular diferença em minutos entre uma hora (HH:MM) e o momento atual
const getMinutesDiff = (targetTimeStr: string) => {
    const target = parseTime(targetTimeStr);
    const current = new Date();
    return (target.getTime() - current.getTime()) / 60000;
};
const ICAO_CITIES: Record<string, string> = {
  'SBGL': 'GALEÃO',
  'SBGR': 'GUARULHOS',
  'SBSP': 'CONGONHAS',
  'SBRJ': 'ST. DUMONT',
  'SBKP': 'VIRACOPOS',
  'SBNT': 'NATAL',
  'SBSV': 'SALVADOR',
  'SBPA': 'PTO ALEGRE',
  'SBCT': 'CURITIBA',
  'LPPT': 'LISBOA',
  'EDDF': 'FRANKFURT',
  'LIRF': 'FIUMICINO',
  'KMIA': 'MIAMI',
  'KATL': 'ATLANTA',
  'MPTO': 'TOCUMEN',
  'SCEL': 'SANTIAGO',
  'SUMU': 'MONTEVIDÉU',
  'SAEZ': 'EZEIZA',
};

const DELAY_REASONS = [
    "Atraso Chegada Aeronave (Late Arrival)",
    "Solicitação Cia Aérea (Abastecimento Parcial)",
    "Manutenção Equipamento Abastecimento",
    "Manutenção Aeronave (Mecânica)",
    "Indisponibilidade de Posição/Balizamento",
    "Restrição Meteorológica (Raios)",
    "Atraso Operacional (Equipe)",
    "Fluxo Lento / Pressão Hidrante Baixa"
];

const calculateLandingETA = (blockTime: string) => {
    if (!blockTime || blockTime === '--:--') return '--:--';
    try {
        const date = parseTime(blockTime);
        if (isNaN(date.getTime())) return '--:--';
        date.setMinutes(date.getMinutes() - 15);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return '--:--';
    }
};

// Helper para converter datas do Firebase (Timestamp ou String) para Date
const parseDate = (dateVal: any): Date | null => {
    if (!dateVal) return null;
    if (dateVal instanceof Date) return dateVal;
    if (typeof dateVal.toDate === 'function') return dateVal.toDate();
    if (typeof dateVal === 'string' || typeof dateVal === 'number') return new Date(dateVal);
    return null;
};

// Verifica se houve atraso REAL (Hora Finalização > ETD)
const checkIsDelayed = (flight: FlightData) => {
    const endTime = parseDate(flight.endTime);
    if (!endTime || !flight.etd) return false;
    const [h, m] = flight.etd.split(':').map(Number);
    const etdDate = new Date(endTime); 
    etdDate.setHours(h, m, 0, 0);
    // Se EndTime for maior que ETD, houve atraso
    return endTime.getTime() > etdDate.getTime();
};

const calculateTAB = (flight: FlightData) => {
    const desigTime = parseDate(flight.designationTime);
    const endTime = parseDate(flight.endTime);
    if (!desigTime || !endTime) return "--:--";
    const diffMs = endTime.getTime() - desigTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

const createNewLog = (type: LogType, message: string, author: string = 'GESTOR_MESA'): FlightLog => ({
    id: Date.now().toString(),
    timestamp: new Date(),
    type,
    message,
    author
});

export const GridOps: React.FC<GridOpsProps> = ({ 
    flights, 
    onUpdateFlights, 
    onFinalizeFlight,
    vehicles, 
    operators,
    airlines,
    aircraftDb,
    initialTab = 'GERAL', 
    globalSearchTerm = '',
    onOpenShiftOperators,
    onOpenMalhaBase,
    pendingAction,
    setPendingAction
}) => {
  const { isDarkMode } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  
  useEffect(() => {
    // Simulate data fetching
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
      if (initialTab) {
          setActiveTab(initialTab);
      }
  }, [initialTab]);

  const [selectedFlight, setSelectedFlight] = useState<FlightData | null>(null);

  // Keep selectedFlight in sync with global flights
  useEffect(() => {
      if (selectedFlight) {
          const updated = flights.find(f => f.id === selectedFlight.id);
          if (updated && JSON.stringify(updated) !== JSON.stringify(selectedFlight)) {
              setSelectedFlight(updated);
          }
      }
  }, [flights, selectedFlight]);

  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: null });
  
  // Estado para controlar visualização de finalizados na aba GERAL
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set());
  
  // Modals e Toasts
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [standbyModalFlightId, setStandbyModalFlightId] = useState<string | null>(null);
  const [standbyReason, setStandbyReason] = useState('');
  const [observationModalFlight, setObservationModalFlight] = useState<FlightData | null>(null);
  const [newObservation, setNewObservation] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Delay Justification Modal States
  const [delayModalFlightId, setDelayModalFlightId] = useState<string | null>(null);
  const [delayReasonCode, setDelayReasonCode] = useState('');
  const [delayReasonDetail, setDelayReasonDetail] = useState('');

  // Assign Operator Modal State
  const [assignModalFlight, setAssignModalFlight] = useState<FlightData | null>(null);
  const [assignSupportModalFlight, setAssignSupportModalFlight] = useState<FlightData | null>(null);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number, left: number } | null>(null);
  const [cancelModalFlight, setCancelModalFlight] = useState<FlightData | null>(null);
  
  // New Confirmation Modals
  const [confirmStartModalFlight, setConfirmStartModalFlight] = useState<FlightData | null>(null);
  const [confirmRemoveOperatorFlight, setConfirmRemoveOperatorFlight] = useState<FlightData | null>(null);
  const [confirmFinishModalFlight, setConfirmFinishModalFlight] = useState<FlightData | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  const handleCreateFlight = async (newFlight: Partial<FlightData>) => {
    await onUpdateFlights(newFlight);
    addToast('VOO CRIADO', `Voo ${newFlight.flightNumber} criado com sucesso.`, 'success');
    setIsCreateModalOpen(false);
  };

  // Notifications Logic
  const allNotifications = useMemo(() => {
      const msgs = flights.flatMap(f => (f.messages || []).map(m => ({ ...m, flight: f })));
      // Filtra mensagens que não são do gestor (mensagens recebidas)
      return msgs.filter(m => !m.isManager).sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [flights]);

  // Auto-Update Logic (Usando o state setter global)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
        flights.forEach(f => {
            const minutesToETD = getMinutesDiff(f.etd);
            // LÓGICA DE AUTOMATIZAÇÃO PARA FILA:
            // Só move para fila se NÃO tiver operador e estiver no prazo crítico
            if (f.status === FlightStatus.CHEGADA && minutesToETD < 60 && !f.operator) {
                const newLog = createNewLog('SISTEMA', 'Voo movido para FILA automaticamente (ETD < 60min).', 'SISTEMA');
                onUpdateFlights({ 
                    id: f.id, 
                    status: FlightStatus.FILA,
                    logs: [...(f.logs || []), newLog]
                });
            }
        });
    }, 5000);
    return () => clearInterval(interval);
  }, [flights, onUpdateFlights]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (observationModalFlight && newObservation.trim()) {
            handleSaveObservation();
        } else if (delayModalFlightId && delayReasonCode) {
            handleSubmitDelay();
        } else if (cancelModalFlight) {
            confirmCancelFlight();
        } else if (confirmStartModalFlight) {
            handleConfirmStart();
        } else if (confirmFinishModalFlight) {
            handleConfirmFinish();
        } else if (confirmRemoveOperatorFlight) {
            handleConfirmRemoveOperator();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
      observationModalFlight, newObservation, 
      delayModalFlightId, delayReasonCode, 
      cancelModalFlight, confirmStartModalFlight, 
      confirmFinishModalFlight, confirmRemoveOperatorFlight
  ]);

  const addToast = (title: string, message: string, type: 'success' | 'info' | 'warning' = 'info') => {
      const id = Date.now().toString();
      setToasts(prev => [...prev, { id, title, message, type }]);
      setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id));
      }, 5000);
  };

  const removeToast = (id: string) => {
      setToasts(prev => prev.filter(t => t.id !== id));
  };

  const visibleFlights = useMemo(() => flights.filter(f => !f.isHiddenFromGrid), [flights]);

  const stats = useMemo(() => ({
    total: visibleFlights.length,
    chegada: visibleFlights.filter(f => {
        const minutesToEta = getMinutesDiff(f.eta);
        return f.status === FlightStatus.CHEGADA && !(f.isOnGround && f.positionId) && minutesToEta <= 120;
    }).length,
    // Correção: Fila conta apenas quem está no status FILA e SEM operador (segurança redundante)
    fila: visibleFlights.filter(f => f.status === FlightStatus.FILA && !f.operator).length,
    designados: visibleFlights.filter(f => f.status === FlightStatus.DESIGNADO).length,
    abastecendo: visibleFlights.filter(f => f.status === FlightStatus.ABASTECENDO).length,
    finalizados: visibleFlights.filter(f => f.status === FlightStatus.FINALIZADO || f.status === FlightStatus.CANCELADO).length,
  }), [visibleFlights]);

  const tabs: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'GERAL', label: 'MALHA GERAL', icon: LayoutGrid, count: stats.total },
    { id: 'CHEGADA', label: 'CHEGADA', icon: PlaneLanding, count: stats.chegada },
    { id: 'FILA', label: 'FILA', icon: ListOrdered, count: stats.fila },
    { id: 'DESIGNADOS', label: 'DESIGNADOS', icon: UserCheck, count: stats.designados },
    { id: 'ABASTECENDO', label: 'ABASTECENDO', icon: Droplet, count: stats.abastecendo },
    { id: 'FINALIZADO', label: 'FINALIZADOS', icon: CheckCircle, count: stats.finalizados },
  ];

  const filteredData = useMemo(() => {
    let base = visibleFlights;
    
    switch (activeTab) {
      case 'CHEGADA': 
        base = visibleFlights.filter(f => {
            const minutesToEta = getMinutesDiff(f.eta);
            return f.status === FlightStatus.CHEGADA && 
                   !(f.isOnGround && f.positionId) && 
                   minutesToEta <= 120;
        });
        break;
      case 'FILA': 
        // REGRA DE OURO: ABA FILA NÃO PODE TER OPERADOR
        base = visibleFlights.filter(f => f.status === FlightStatus.FILA && !f.operator);
        break;
      case 'DESIGNADOS': base = visibleFlights.filter(f => f.status === FlightStatus.DESIGNADO); break;
      case 'ABASTECENDO': base = visibleFlights.filter(f => f.status === FlightStatus.ABASTECENDO); break;
      case 'FINALIZADO': base = visibleFlights.filter(f => f.status === FlightStatus.FINALIZADO || f.status === FlightStatus.CANCELADO); break;
      case 'GERAL': 
        base = visibleFlights.filter(f => {
            if (f.status === FlightStatus.FINALIZADO || f.status === FlightStatus.CANCELADO) {
                return false;
            }
            return true;
        });
        break;
      default: base = visibleFlights;
    }

    if (!globalSearchTerm) return base;

    const lowerTerm = globalSearchTerm.toLowerCase().replace(/[^a-z0-9]/g, '');
    return base.filter(f => {
        const searchString = [
            f.flightNumber, f.registration, f.positionId, f.airline, f.operator, 
            f.eta, f.etd, f.vehicleType, f.origin, f.destination, f.status, f.fleet, f.model
        ].map(val => String(val || '').toLowerCase().replace(/[^a-z0-9]/g, '')).join(' ');
        
        return searchString.includes(lowerTerm);
    });
  }, [activeTab, visibleFlights, archivedIds, globalSearchTerm]);

  const isStreamlinedView = ['FILA', 'DESIGNADOS', 'ABASTECENDO'].includes(activeTab);
  const isFinishedView = activeTab === 'FINALIZADO';

  const handleSort = (key: keyof FlightData) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    else if (sortConfig.key === key && sortConfig.direction === 'desc') direction = null;
    setSortConfig({ key: direction ? key : null, direction });
  };

  const sortedData = useMemo(() => {
    let data = [...filteredData];
    
    // Default sort by isPinned
    if (!sortConfig.key || !sortConfig.direction) {
        return data.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return 0;
        });
    }
    
    return data.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      const aValue = (a[sortConfig.key!] ?? '').toString();
      const bValue = (b[sortConfig.key!] ?? '').toString();
      return sortConfig.direction === 'asc' 
        ? aValue.localeCompare(bValue) 
        : bValue.localeCompare(aValue);
    });
  }, [filteredData, sortConfig]);

  // --- ACTIONS HANDLERS (ATUALIZANDO ESTADO GLOBAL) ---
  const handleMoveToQueue = (flight: FlightData, e: React.MouseEvent) => {
      e.stopPropagation();
      
      // TRAVA LÓGICA: Se tem operador, não pode ir para fila.
      if (flight.operator) {
          addToast('AÇÃO NEGADA', 'Voo com operador designado não pode ir para a fila.', 'warning');
          return;
      }

      const newLog = createNewLog('MANUAL', 'Voo movido para FILA manualmente.', 'GESTOR_MESA');
      onUpdateFlights({ 
          id: flight.id, 
          status: FlightStatus.FILA,
          logs: [...(flight.logs || []), newLog]
      });
      addToast('VOO NA FILA', `Voo ${flight.flightNumber} adicionado à fila de prioridade.`, 'success');
  };

  const handleManualStart = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const flight = flights.find(f => f.id === id);
      if (!flight) return;

      const newLog = createNewLog('SISTEMA', 'Início de abastecimento confirmado.', 'GESTOR_MESA');
      onUpdateFlights({ 
          id: id, 
          status: FlightStatus.ABASTECENDO, 
          startTime: new Date(),
          logs: [...(flight.logs || []), newLog]
      });
  };

  const handleManualFinish = (flight: FlightData, e: React.MouseEvent) => {
      e.stopPropagation();
      const minutesToETD = getMinutesDiff(flight.etd);
      if (minutesToETD < 0) {
          setDelayModalFlightId(flight.id);
          setDelayReasonCode('');
          setDelayReasonDetail('');
          return;
      }
      confirmFinish(flight.id, flight.flightNumber);
  };

  const handleCancelFlight = (flight: FlightData, e: React.MouseEvent) => {
      e.stopPropagation();
      setCancelModalFlight(flight);
      setOpenMenuId(null);
  };

  const confirmCancelFlight = () => {
      if (!cancelModalFlight) return;
      
      const newLog = createNewLog('MANUAL', 'Voo CANCELADO manualmente pelo gestor.', 'GESTOR_MESA');
      onUpdateFlights({ 
          id: cancelModalFlight.id, 
          status: FlightStatus.CANCELADO,
          logs: [...(cancelModalFlight.logs || []), newLog]
      });
      
      addToast('VOO CANCELADO', `Voo ${cancelModalFlight.flightNumber} foi cancelado.`, 'info');
      setCancelModalFlight(null);
  };

  const handleReportCalco = (flight: FlightData, e: React.MouseEvent) => {
      e.stopPropagation();
      const newLog = createNewLog('MANUAL', 'Calço reportado manualmente pelo gestor.', 'GESTOR_MESA');
      onUpdateFlights({ 
          id: flight.id,
          isOnGround: true,
          logs: [...(flight.logs || []), newLog]
      });
      addToast('CALÇO REPORTADO', `Aeronave ${flight.registration} (Voo ${flight.flightNumber}) em calço.`, 'success');
      setOpenMenuId(null);
  };

  const confirmFinish = (id: string, flightNumber: string, delayJustification?: string) => {
      const flight = flights.find(f => f.id === id);
      if (!flight) return;

      let newLog: FlightLog;
      if (delayJustification) {
          newLog = createNewLog('ATRASO', `Finalizado com ATRASO. Justificativa: ${delayJustification}`, 'GESTOR_MESA');
      } else {
          newLog = createNewLog('SISTEMA', 'Abastecimento finalizado no horário.', 'GESTOR_MESA');
      }
      
      const updatedFlight = { 
          ...flight, 
          status: FlightStatus.FINALIZADO, 
          endTime: new Date(),
          delayJustification: delayJustification,
          logs: [...(flight.logs || []), newLog]
      };

      onFinalizeFlight(updatedFlight);

      addToast(
          delayJustification ? 'ATRASO REGISTRADO' : 'OPERAÇÃO CONCLUÍDA', 
          `Voo ${flightNumber} finalizado${delayJustification ? ' com relatório de atraso' : ''}.`, 
          delayJustification ? 'warning' : 'success'
      );
      setDelayModalFlightId(null);
  };

  const handleSubmitDelay = () => {
      if (delayModalFlightId && delayReasonCode) {
          const flight = flights.find(f => f.id === delayModalFlightId);
          if (flight) {
              const justification = `${delayReasonCode}${delayReasonDetail ? ` - ${delayReasonDetail}` : ''}`;
              confirmFinish(delayModalFlightId, flight.flightNumber, justification);
          }
      }
  };
  
  const handleRemoveStandby = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const flight = flights.find(f => f.id === id);
      if (!flight) return;

      const newLog = createNewLog('MANUAL', 'Removido de Standby. Retomando prioridade.', 'GESTOR_MESA');
      onUpdateFlights({ 
          id: id, 
          isStandby: false, 
          standbyReason: null as any,
          logs: [...(flight.logs || []), newLog]
      });
  };

  const handleConfirmVisual = (id: string, flightNumber: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const flight = flights.find(f => f.id === id);
      if (!flight) return;

      setArchivedIds(prev => new Set(prev).add(id));
      
      const newLog = createNewLog('MANUAL', 'Voo arquivado da visão geral pelo gestor.', 'GESTOR_MESA');
      onUpdateFlights({
          id: id,
          isHiddenFromGrid: true,
          logs: [...(flight.logs || []), newLog]
      });
      
      addToast('ARQUIVADO', `Voo ${flightNumber} movido para histórico.`, 'info');
  };

  const handleClearFinished = () => {
      flights.forEach(f => {
          if (f.status === FlightStatus.FINALIZADO || f.status === FlightStatus.CANCELADO) {
              onUpdateFlights({ id: f.id, isHiddenFromGrid: true });
          }
      });
      addToast('HISTÓRICO LIMPO', 'Voos finalizados e cancelados foram arquivados.', 'success');
  };

  const handlePinFlight = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const flight = flights.find(f => f.id === id);
      if (!flight) return;

      const newLog = createNewLog('MANUAL', flight.isPinned ? 'Voo desfixado do topo pelo gestor.' : 'Voo fixado no topo pelo gestor.', 'GESTOR_MESA');
      onUpdateFlights({ 
          id: id, 
          isPinned: !flight.isPinned, 
          logs: [...(flight.logs || []), newLog] 
      });
      setOpenMenuId(null);
  };

  const handleReforco = (flight: FlightData, e: React.MouseEvent) => {
      e.stopPropagation();
      const newLog = createNewLog('MANUAL', 'Voo redirecionado para REFORÇO (Fila).', 'GESTOR_MESA');
      onUpdateFlights({ 
          id: flight.id, 
          status: FlightStatus.FILA,
          operator: null as any,
          designationTime: null as any,
          logs: [...(flight.logs || []), newLog]
      });
      addToast('REFORÇO', `Voo ${flight.flightNumber} retornado para a fila.`, 'success');
      setOpenMenuId(null);
  };

  const handleConfirmStart = () => {
      if (!confirmStartModalFlight) return;
      handleManualStart(confirmStartModalFlight.id, { stopPropagation: () => {} } as React.MouseEvent);
      addToast('ABASTECIMENTO INICIADO', `Voo ${confirmStartModalFlight.flightNumber} em abastecimento.`, 'success');
      setConfirmStartModalFlight(null);
  };

  const handleConfirmRemoveOperator = () => {
      if (!confirmRemoveOperatorFlight) return;
      const newLog = createNewLog('MANUAL', 'Operador removido. Voo retornou para a fila.', 'GESTOR_MESA');
      onUpdateFlights({ 
          id: confirmRemoveOperatorFlight.id, 
          status: FlightStatus.FILA,
          operator: null as any,
          designationTime: null as any,
          logs: [...(confirmRemoveOperatorFlight.logs || []), newLog]
      });
      addToast('OPERADOR REMOVIDO', `Operador removido do voo ${confirmRemoveOperatorFlight.flightNumber}.`, 'info');
      setConfirmRemoveOperatorFlight(null);
  };

  const handleConfirmFinish = () => {
      if (!confirmFinishModalFlight) return;
      handleManualFinish(confirmFinishModalFlight, { stopPropagation: () => {} } as React.MouseEvent);
      setConfirmFinishModalFlight(null);
  };

  // --- ASSIGNMENT LOGIC ---
  const openAssignModal = (flight: FlightData, e: React.MouseEvent) => {
      e.stopPropagation();
      setAssignModalFlight(flight);
      setSelectedOperatorId(null);
  };

  const confirmAssignment = (opId?: string) => {
      const idToUse = opId || selectedOperatorId;
      if (assignModalFlight && idToUse) {
          const operator = operators.find(op => op.id === idToUse);
          if (!operator) return;

          const newLog = createNewLog('MANUAL', `Operador ${operator.warName} designado manualmente.`, 'GESTOR_MESA');
          
          // IMPORTANTE: Ao designar, o status vai para DESIGNADO, removendo automaticamente da FILA
          onUpdateFlights({ 
              id: assignModalFlight.id, 
              status: FlightStatus.DESIGNADO, 
              operator: operator.warName,
              fleet: operator.assignedVehicle,
              fleetType: operator.fleetCapability as any,
              designationTime: new Date(),
              logs: [...(assignModalFlight.logs || []), newLog]
          });

          addToast('DESIGNADO', `Operador ${operator.warName} assumiu voo ${assignModalFlight.flightNumber}.`, 'success');
          setAssignModalFlight(null);
          setSelectedOperatorId(null);
      }
  };

  const confirmSupportAssignment = (opId?: string) => {
      const idToUse = opId || selectedOperatorId;
      if (assignSupportModalFlight && idToUse) {
          const operator = operators.find(op => op.id === idToUse);
          if (!operator) return;

          const newLog = createNewLog('MANUAL', `Op. Apoio ${operator.warName} designado manualmente.`, 'GESTOR_MESA');
          
          onUpdateFlights({ 
              id: assignSupportModalFlight.id, 
              supportOperator: operator.warName,
              logs: [...(assignSupportModalFlight.logs || []), newLog]
          });

          addToast('APOIO DESIGNADO', `Operador ${operator.warName} assumiu como apoio no voo ${assignSupportModalFlight.flightNumber}.`, 'success');
          setAssignSupportModalFlight(null);
          setSelectedOperatorId(null);
      }
  };

  // Filters operators based on Vehicle Compatibility (SRV vs CTA)
  const getEligibleOperators = (flight: FlightData, isSupport: boolean = false) => {
      // Get all active missions to determine status
      const activeMissions = flights.filter(f => f.status !== 'FINALIZADO' && f.status !== 'CANCELADO');

      return operators.map(op => {
          // Find if operator has an active mission
          const mission = activeMissions.find(m => m.operator?.toLowerCase() === op.warName.toLowerCase() || m.supportOperator?.toLowerCase() === op.warName.toLowerCase());
          
          let dynamicStatus = op.status;
          if (mission) {
              if (mission.status === 'ABASTECENDO') dynamicStatus = 'OCUPADO'; 
              else if (mission.status === 'DESIGNADO') dynamicStatus = 'DESIGNADO';
              else dynamicStatus = 'OCUPADO';
          }
          
          return { ...op, status: dynamicStatus };
      });
  };

  // OBSERVATION HANDLERS
  const handleOpenObservationModal = (flight: FlightData, e: React.MouseEvent) => {
    e.stopPropagation();
    setObservationModalFlight(flight);
    setNewObservation(''); 
    setOpenMenuId(null);
  };

  const handleSaveObservation = () => {
    if (observationModalFlight && newObservation.trim()) {
      const newLog = createNewLog('OBSERVACAO', newObservation.trim(), 'GESTOR_MESA');
      onUpdateFlights({ 
        id: observationModalFlight.id, 
        logs: [...(observationModalFlight.logs || []), newLog] 
      });
      addToast('OBSERVAÇÃO REGISTRADA', `Nota adicionada ao voo ${observationModalFlight.flightNumber}.`, 'success');
      setObservationModalFlight(null);
      setNewObservation('');
    }
  };

  // --- HELPER RENDERS ---
  const getDynamicStatus = (f: FlightData) => {
    const minutesToETA = getMinutesDiff(f.eta);
    const minutesToETD = getMinutesDiff(f.etd);

    if (f.status === FlightStatus.FINALIZADO || f.status === FlightStatus.CANCELADO) {
        if (activeTab === 'FINALIZADO') {
            if (f.status === FlightStatus.CANCELADO) return { 
                label: 'CANCELADO', 
                color: isDarkMode ? 'text-red-400 bg-red-500/10 border-red-500/30' : 'text-red-600 bg-red-50 border-red-200' 
            };
            const hasSwap = f.logs.some(l => l.message.toLowerCase().includes('troca') || l.message.toLowerCase().includes('swap'));
            if (hasSwap) return { 
                label: 'COM TROCA', 
                color: isDarkMode ? 'text-purple-400 bg-purple-500/10 border-purple-500/30' : 'text-purple-600 bg-purple-50 border-purple-200' 
            };
            if (checkIsDelayed(f) || f.delayJustification) return { 
                label: 'COM ATRASO', 
                color: isDarkMode ? 'text-amber-500 bg-amber-500/10 border-amber-500/30' : 'text-amber-600 bg-amber-50 border-amber-200' 
            };
            return { 
                label: 'COM SUCESSO', 
                color: isDarkMode ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-emerald-600 bg-emerald-50 border-emerald-200' 
            };
        }
        if (activeTab === 'GERAL' && f.status === FlightStatus.FINALIZADO) {
            return { 
                label: 'FINALIZADO', 
                color: isDarkMode ? 'text-emerald-300 bg-emerald-500/20 border-emerald-500' : 'text-emerald-700 bg-emerald-50 border-emerald-500' 
            };
        }
    }

    if (f.status === FlightStatus.CHEGADA) {
        if (f.isOnGround && f.positionId) return { 
            label: 'CALÇADA', 
            color: isDarkMode ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-emerald-600 bg-emerald-50 border-emerald-200' 
        };
        if (f.isOnGround || f.eta === '--:--' || isNaN(minutesToETA)) return { 
            label: 'SOLO', 
            color: isDarkMode ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' : 'text-indigo-600 bg-indigo-50 border-indigo-200' 
        };
        if (minutesToETA < 10) return { 
            label: 'APROXIMAÇÃO', 
            color: isDarkMode ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' : 'text-amber-600 bg-amber-50 border-amber-200' 
        };
        const h = Math.floor(minutesToETA / 60);
        const m = Math.floor(minutesToETA % 60);
        return { 
            label: `${h}H ${m}M`, 
            color: isDarkMode ? 'text-slate-400 bg-slate-800/50 border-slate-700' : 'text-slate-600 bg-slate-100 border-slate-300' 
        };
    }

    if (f.status === FlightStatus.FILA) {
        if (f.isStandby) return { 
            label: 'STAND-BY', 
            color: isDarkMode ? 'text-slate-400 bg-slate-800 border-slate-600' : 'text-slate-600 bg-slate-100 border-slate-300' 
        };
        if (isNaN(minutesToETD)) return {
            label: 'AGUARDANDO',
            color: isDarkMode ? 'text-slate-300 bg-slate-800 border-slate-600' : 'text-slate-600 bg-slate-100 border-slate-300'
        };
        if (minutesToETD < 20) return { 
            label: '-20M CRÍTICO', 
            color: isDarkMode ? 'text-red-500 bg-red-500/20 border-red-500' : 'text-red-700 bg-red-50 border-red-500' 
        };
        if (minutesToETD < 25) return { 
            label: '-25M ALERTA', 
            color: isDarkMode ? 'text-amber-500 bg-amber-500/20 border-amber-500' : 'text-amber-700 bg-amber-50 border-amber-500' 
        };
        if (minutesToETD < 30) return { 
            label: '-30M', 
            color: isDarkMode ? 'text-amber-400 bg-amber-500/10 border-amber-400/50' : 'text-amber-600 bg-amber-50 border-amber-200' 
        };
        if (minutesToETD < 45) return { 
            label: '-45M', 
            color: isDarkMode ? 'text-yellow-200 bg-yellow-500/10 border-yellow-200/30' : 'text-yellow-700 bg-yellow-50 border-yellow-200' 
        };
        return { 
            label: '-1H', 
            color: isDarkMode ? 'text-slate-300 bg-slate-800 border-slate-600' : 'text-slate-600 bg-slate-100 border-slate-300' 
        };
    }

    if (f.status === FlightStatus.DESIGNADO) {
        const desigTime = parseDate(f.designationTime);
        const elapsed = desigTime ? (new Date().getTime() - desigTime.getTime()) / 60000 : 0;
        if (elapsed > 15) return { 
            label: 'AGUARDANDO', 
            color: isDarkMode ? 'text-amber-500 bg-amber-500/10 border-amber-500' : 'text-amber-600 bg-amber-50 border-amber-200' 
        };
        if (elapsed > 10) return { 
            label: 'ACOPLANDO', 
            color: isDarkMode ? 'text-blue-400 bg-blue-500/10 border-blue-400' : 'text-blue-600 bg-blue-50 border-blue-200' 
        };
        return { 
            label: 'A CAMINHO', 
            color: isDarkMode ? 'text-indigo-400 bg-indigo-500/10 border-indigo-400' : 'text-indigo-600 bg-indigo-50 border-indigo-200' 
        };
    }

    if (f.status === FlightStatus.ABASTECENDO) {
        const isDelayed = minutesToETD <= 0;
        const isPausado = (f.currentFlowRate ?? 0) === 0;
        // Finalizando se: faltam menos de 10 min OU se já passou de 90% do volume
        const isFinalizando = (minutesToETD < 10 && minutesToETD > 0) || (f.fuelStatus > 90);
        
        let label = 'ABASTECENDO';
        let color = isDarkMode ? 'text-blue-400 bg-blue-500/20 border-blue-500/30' : 'text-blue-600 bg-blue-50 border-blue-200';
        
        if (isPausado) {
            label = 'PAUSADO';
            color = isDarkMode ? 'text-amber-500 bg-amber-500/20 border-amber-500' : 'text-amber-600 bg-amber-50 border-amber-200';
        } else if (isFinalizando) {
            label = 'FINALIZANDO';
            color = isDarkMode ? 'text-blue-300 bg-blue-500/20 border-blue-300' : 'text-blue-700 bg-blue-50 border-blue-300';
        }
        
        if (isDelayed) {
            color = isDarkMode ? 'text-white bg-red-600 border-red-500' : 'text-white bg-red-700 border-red-600';
        }
        
        return { label, color };
    }

    return null;
  };

  const SortableHeader = ({ label, columnKey, className = "" }: { label: string, columnKey: keyof FlightData, className?: string }) => {
    const isActive = sortConfig.key === columnKey;
    return (
      <th 
        className={`px-3 py-3 sticky top-0 cursor-pointer select-none transition-all group z-50 first:rounded-l-[4px] last:rounded-r-[4px] grid-ops-header-th border-y ${isDarkMode ? 'bg-slate-950 border-slate-700/50 shadow-sm' : 'bg-white border-slate-200 shadow-none'} ${className}`}
        onClick={() => handleSort(columnKey)}
      >
        <div className={`flex items-center gap-1.5 ${className.includes('text-center') ? 'justify-center' : 'justify-start'}`}>
          <span className={`font-black text-[9px] uppercase tracking-wider transition-colors ${isActive ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-600') : (isDarkMode ? 'text-white' : 'text-slate-700')}`}>
            {label}
          </span>
          <div className="flex items-center justify-center transition-all">
            {isActive ? (
                sortConfig.direction === 'asc' ? <ArrowUp size={10} className={isDarkMode ? "text-emerald-500" : "text-emerald-600"} /> : <ArrowDown size={10} className={isDarkMode ? "text-emerald-500" : "text-emerald-600"} />
            ) : <ArrowUpDown size={8} className={isDarkMode ? "text-white/20 group-hover:text-white/60" : "text-slate-400 group-hover:text-slate-600"} />}
          </div>
        </div>
      </th>
    );
  };

  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [optionsPortalTarget, setOptionsPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortalTarget(document.getElementById('subheader-portal-target'));
    setOptionsPortalTarget(document.getElementById('header-options-portal-target'));
  }, []);

  useEffect(() => {
      if (pendingAction === 'CREATE') {
          setIsCreateModalOpen(true);
          if (setPendingAction) setPendingAction(null);
      } else if (pendingAction === 'IMPORT') {
          setIsImportModalOpen(true);
          if (setPendingAction) setPendingAction(null);
      }
  }, [pendingAction, setPendingAction]);

  if (isLoading) {
    return (
      <div className={`w-full h-full flex items-center justify-center ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <Spinner size={48} text="Sincronizando Malha..." />
      </div>
    );
  }

  const optionsDropdownItems = (
    <>
        <button 
            onClick={() => {
                setIsCreateModalOpen(true);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-all ${isDarkMode ? 'text-slate-300 hover:bg-indigo-500/10 hover:text-indigo-400' : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'}`}
        >
            <Plus size={14} />
            Criar Voo
        </button>
        <button 
            onClick={() => {
                setIsImportModalOpen(true);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-all ${isDarkMode ? 'text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-400' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-600'}`}
        >
            <Upload size={14} />
            Importar
        </button>
        <button 
            onClick={() => {
                if (onOpenShiftOperators) onOpenShiftOperators();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-all ${isDarkMode ? 'text-slate-300 hover:bg-blue-500/10 hover:text-blue-400' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'}`}
        >
            <UserPlus size={14} />
            Operadores do Turno
        </button>
    </>
  );

  const subheaderContent = (
      <div className={`px-6 h-16 shrink-0 flex items-center justify-between border-b ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-[#2C864C] border-white/10'} z-[60] w-full`}>
        <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-sm font-black text-white tracking-tighter uppercase leading-none">Malha Geral</h2>
                </div>
            </div>
        </div>
      </div>
  );

  return (
    <div className={`w-full h-full flex flex-col ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'} overflow-hidden selection:bg-emerald-500/30 font-sans relative`}>
      
      {/* HEADER E TABS */}
      {portalTarget ? createPortal(subheaderContent, portalTarget) : subheaderContent}
      {optionsPortalTarget ? createPortal(optionsDropdownItems, optionsPortalTarget) : null}
      <div className={`h-12 shrink-0 flex border-b ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'} z-30 overflow-hidden`}>
        <nav className="flex w-full">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            data-active={isActive ? "true" : "false"}
                            className={`
                                table-tab-btn
                                flex-1 h-full px-2 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-r ${isDarkMode ? 'border-slate-950/20' : 'border-slate-200'} last:border-r-0
                                ${isActive 
                                    ? (isDarkMode ? 'bg-slate-950 text-emerald-400 border-b-2 border-emerald-500' : 'bg-emerald-600 text-white border-b-2 border-emerald-700')
                                    : (isDarkMode ? 'text-slate-500 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')}
                            `}
                        >
                            {tab.label}
                            {tab.count !== undefined && (
                                <span className={`flex items-center justify-center px-1.5 min-w-[18px] h-4 text-[9px] font-black rounded-sm ${isActive ? (isDarkMode ? 'bg-emerald-500 text-slate-950' : 'bg-white text-emerald-600') : (isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>
          </div>

      {/* GRID CONTAINER */}
      <div className={`flex-1 overflow-hidden relative ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'} pt-2`}>
            <div className="w-full h-full overflow-auto custom-scrollbar relative">
              <table className="w-full text-left border-separate border-spacing-x-0 border-spacing-y-1 px-2 grid-ops-table -mt-1">
                  <thead className="grid-ops-thead relative z-50">
                      <tr id="grid-header-container" className="h-12">
                    {/* LAYOUT CONDICIONAL DE COLUNAS */}
                    {isStreamlinedView ? (
                        <>
                            <SortableHeader label="COMP." columnKey="airlineCode" className="text-center w-24" />
                            <SortableHeader label="V.SAÍDA" columnKey="departureFlightNumber" className="text-center" />
                            <SortableHeader label="ICAO" columnKey="destination" className="text-center" />
                            <SortableHeader label="CID" columnKey="destination" className="text-center" />
                            <SortableHeader label="PREFIXO" columnKey="registration" className="text-center" />
                            <SortableHeader label="POS" columnKey="positionId" className="text-center" />
                            <SortableHeader label="CALÇO" columnKey="actualArrivalTime" className="text-center" />
                            <SortableHeader label="ETD" columnKey="etd" className="text-center" />
                            <SortableHeader label="OPERADOR" columnKey="operator" className="" />
                            <SortableHeader label="FROTA" columnKey="fleet" className="text-center" />
                            <SortableHeader label="FRT.TIPO" columnKey="fleet" className="text-center" />
                            {activeTab === 'ABASTECENDO' && (
                                <SortableHeader label="VAZÃO" columnKey="maxFlowRate" className="text-center" />
                            )}
                        </>
                    ) : isFinishedView ? (
                        <>
                            <SortableHeader label="COMP." columnKey="airlineCode" className="text-center w-24" />
                            <SortableHeader label="PREFIXO" columnKey="registration" className="text-center" />
                            <SortableHeader label="V.SAÍDA" columnKey="departureFlightNumber" className="text-center" />
                            <SortableHeader label="ICAO" columnKey="destination" className="text-center" />
                            <SortableHeader label="CID" columnKey="destination" className="text-center" />
                            <SortableHeader label="POS" columnKey="positionId" className="text-center" />
                            <SortableHeader label="CALÇO" columnKey="actualArrivalTime" className="text-center" />
                            <SortableHeader label="ETD" columnKey="etd" className="text-center" />
                            <SortableHeader label="OPERADOR" columnKey="operator" className="" />
                            <SortableHeader label="FROTA" columnKey="fleet" className="text-center" />
                            <SortableHeader label="FRT.TIPO" columnKey="fleet" className="text-center" />
                            <th className={`px-3 py-3 sticky top-0 text-center z-50 grid-ops-header-th border-y ${isDarkMode ? 'bg-slate-950 border-slate-700/50 shadow-sm' : 'bg-white border-slate-200 shadow-none'}`}>
                                <div className="flex items-center justify-center gap-1.5">
                                    <span className={`font-black text-[9px] uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                                        TAB
                                    </span>
                                </div>
                            </th>
                            <SortableHeader label="VAZÃO" columnKey="maxFlowRate" className="text-center" />
                        </>
                    ) : (
                        <>
                            <SortableHeader label="COMP." columnKey="airlineCode" className="text-center w-24" />
                            <SortableHeader label="PREFIXO" columnKey="registration" className="text-center" />
                            <SortableHeader label="MODELO" columnKey="model" className="text-center" />
                            <SortableHeader label="V.CHEG" columnKey="flightNumber" className="text-center" />
                            <SortableHeader label="ETA" columnKey="eta" className="text-center" />
                            <SortableHeader label="V.SAÍDA" columnKey="departureFlightNumber" className="text-center" />
                            <SortableHeader label="ICAO" columnKey="destination" className="text-center" />
                            <SortableHeader label="CID" columnKey="destination" className="text-center" />
                            <SortableHeader label="POS" columnKey="positionId" className="text-center" />
                            <SortableHeader label="CALÇO" columnKey="actualArrivalTime" className="text-center" />
                            <SortableHeader label="ETD" columnKey="etd" className="text-center" />
                            <SortableHeader label="OPERADOR" columnKey="operator" className="" />
                            <SortableHeader label="FROTA" columnKey="fleet" className="text-center" />
                            <SortableHeader label="FRT.TIPO" columnKey="fleet" className="text-center" />
                            {activeTab === 'GERAL' && (
                                <SortableHeader label="VAZÃO" columnKey="maxFlowRate" className="text-center" />
                            )}
                        </>
                    )}
                      
                      <SortableHeader label="STATUS" columnKey="status" className="text-center" />

                      <th className={`px-3 py-3 sticky top-0 text-center z-50 grid-ops-header-th border-y ${isDarkMode ? 'bg-slate-950 border-slate-700/50 shadow-sm' : 'bg-white border-slate-200 shadow-none'} last:rounded-r-[4px] group`}>
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={`font-black text-[9px] uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                            AÇÕES
                          </span>
                        </div>
                      </th>
                  </tr>
              </thead>
              <tbody className="text-[11px] font-bold">
                  {sortedData.map((row) => {
                      const dynamicStatus = getDynamicStatus(row);
                      return (
                      <tr 
                          key={row.id} 
                          onClick={() => setSelectedFlight(row)}
                          className={`h-12 cursor-pointer transition-all active:scale-[0.99] group shadow-sm rounded-[4px] ${isDarkMode ? '' : 'hover:bg-slate-50'}`}
                      >
                          {/* AIRLINE */}
                          <td className={`px-3 text-left first:rounded-l-[4px] border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all`}>
                              <AirlineLogo airlineCode={row.airlineCode} />
                          </td>

                          {/* RENDERIZAÇÃO CONDICIONAL DAS CÉLULAS */}
                          {isStreamlinedView ? (
                            <>
                                {/* FLIGHT OUT */}
                                <td className={`px-2 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all text-center ${isDarkMode ? 'text-white' : 'text-slate-900'} font-mono tracking-tighter`}>{row.departureFlightNumber || '--'}</td>

                                {/* ICAO */}
                                <td className={`px-2 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all text-center font-mono text-emerald-500 font-bold text-[10px]`}>
                                    {row.destination}
                                </td>

                                {/* CITY */}
                                <td className={`px-2 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all text-center font-black text-[9px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-tight`}>
                                    {ICAO_CITIES[row.destination] || 'EXTERIOR'}
                                </td>

                                {/* REGISTRATION */}
                                <td className={`px-2 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all text-center font-mono text-emerald-500 tracking-tighter uppercase`}>{row.registration}</td>

                                {/* POSITION */}
                                <td className={`px-2 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all text-center`}>
                                    <span className={`${
                                        row.positionType === 'CTA' 
                                        ? 'bg-yellow-400 border-yellow-500 text-slate-900 font-black' 
                                        : (isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600')
                                    } border px-2.5 py-1.5 font-mono text-[12px] rounded shadow-sm`}>
                                        {row.positionId}
                                    </span>
                                </td>

                                {/* CALÇO (ATA) */}
                                <td className={`px-2 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all text-center font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'} font-black`}>
                                    {row.actualArrivalTime || '--'}
                                </td>

                                {/* ETD */}
                                <td className={`px-2 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all text-center font-mono ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{row.etd}</td>

                                {/* OPERATOR (WITH ASSIGN BUTTON) */}
                                <td className={`px-3 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all truncate`}>
                                    {row.operator ? (
                                        <div className="flex items-center justify-between">
                                            <OperatorCell operatorName={row.operator} operators={operators} />
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={(e) => openAssignModal(row, e)}
                                            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg shadow-lg shadow-indigo-600/20 transition-all active:scale-95 btn-designar"
                                        >
                                            <UserPlus size={14} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Designar</span>
                                        </button>
                                    )}
                                </td>

                                {/* FLEET */}
                                <td className={`px-2 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all text-center font-mono text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    {row.fleet || '--'}
                                </td>

                                {/* FLEET TYPE */}
                                <td className={`px-2 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all text-center font-mono text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    {row.fleetType || '--'}
                                </td>

                                {/* VAZÃO (Apenas ABASTECENDO) */}
                                {activeTab === 'ABASTECENDO' && (
                                    <td className={`px-2 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all text-center font-mono ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} tracking-tight`}>
                                        {row.maxFlowRate?.toLocaleString('pt-BR') || '--'}
                                    </td>
                                )}
                            </>
                          ) : isFinishedView ? (
                            <>
                                {/* REGISTRATION */}
                                <td className={`px-2 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all text-center font-mono text-emerald-500 tracking-tighter uppercase`}>{row.registration}</td>

                                {/* FLIGHT OUT */}
                                <td className={`px-2 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all text-center ${isDarkMode ? 'text-white' : 'text-slate-900'} font-mono tracking-tighter`}>{row.departureFlightNumber || '--'}</td>

                                {/* ICAO */}
                                <td className={`px-2 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all text-center font-mono text-emerald-500 font-bold text-[10px]`}>
                                    {row.destination}
                                </td>

                                {/* CITY */}
                                <td className={`px-2 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all text-center font-black text-[9px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-tight`}>
                                    {ICAO_CITIES[row.destination] || 'EXTERIOR'}
                                </td>

                                {/* POSITION */}
                                <td className={`px-2 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all text-center`}>
                                    <span className={`${
                                        row.positionType === 'CTA' 
                                        ? 'bg-yellow-400 border-yellow-500 text-slate-900 font-black' 
                                        : (isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600')
                                    } border px-2.5 py-1.5 font-mono text-[12px] rounded shadow-sm`}>
                                        {row.positionId}
                                    </span>
                                </td>

                                {/* CALÇO (ATA) */}
                                <td className={`px-2 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all text-center font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'} font-black`}>
                                    {row.actualArrivalTime || '--'}
                                </td>

                                {/* ETD */}
                                <td className={`px-2 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all text-center font-mono ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{row.etd}</td>
                                
                                {/* OPERATOR (WITH ASSIGN BUTTON & MESSAGE DOT) */}
                                <td className={`px-3 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all truncate`}>
                                    {row.operator ? (
                                        <OperatorCell operatorName={row.operator} operators={operators} />
                                    ) : <span className={`${isDarkMode ? 'text-slate-700' : 'text-slate-400'} italic uppercase text-[9px] pl-2`}>--</span>}
                                </td>

                                {/* FLEET */}
                                <td className={`px-2 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all text-center font-mono text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    {row.fleet || '--'}
                                </td>

                                {/* FLEET TYPE */}
                                <td className={`px-2 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all text-center font-mono text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    {row.fleetType || '--'}
                                </td>

                                {/* TAB (Exclusivo Finalizados) */}
                                <td className={`px-2 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all text-center font-mono ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                    {calculateTAB(row)}
                                </td>

                                {/* VAZÃO (Exclusivo Finalizados) */}
                                <td className={`px-2 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all text-center font-mono ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} tracking-tight`}>
                                    {row.maxFlowRate?.toLocaleString('pt-BR') || '--'}
                                </td>
                            </>
                          ) : (
                            <>
                                {/* REGISTRATION */}
                                <td className={`px-2 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all text-center font-mono text-emerald-500 tracking-tighter uppercase`}>{row.registration}</td>

                                {/* MODEL */}
                                <td className={`px-2 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-mono text-[10px] font-bold`}>
                                    {row.model.split('-')[0]}
                                </td>

                                {/* FLIGHT IN */}
                                <td className={`px-2 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all text-center ${isDarkMode ? 'text-white' : 'text-slate-900'} font-mono tracking-tighter`}>{row.flightNumber}</td>

                                {/* ETA (POUSO ESTIMADO) */}
                                <td className={`px-2 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all text-center font-mono ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    {calculateLandingETA(row.eta)}
                                </td>

                                {/* FLIGHT OUT */}
                                <td className={`px-2 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all text-center ${isDarkMode ? 'text-white' : 'text-slate-900'} font-mono tracking-tighter`}>{row.departureFlightNumber || '--'}</td>

                                {/* ICAO */}
                                <td className={`px-2 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all text-center font-mono text-emerald-500 font-bold text-[10px]`}>
                                    {row.destination}
                                </td>

                                {/* CITY */}
                                <td className={`px-2 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all text-center font-black text-[9px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-tight`}>
                                    {ICAO_CITIES[row.destination] || 'EXTERIOR'}
                                </td>

                                {/* POSITION */}
                                <td className={`px-2 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all text-center`}>
                                    <span className={`${
                                        row.positionType === 'CTA' 
                                        ? 'bg-yellow-400 border-yellow-500 text-slate-900 font-black' 
                                        : (isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600')
                                    } border px-2.5 py-1.5 font-mono text-[12px] rounded shadow-sm`}>
                                        {row.positionId}
                                    </span>
                                </td>

                                {/* CALÇO (ATA) */}
                                <td className={`px-2 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all text-center font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'} font-black`}>
                                    {row.actualArrivalTime || '--'}
                                </td>

                                {/* ETD */}
                                <td className={`px-2 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all text-center font-mono ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{row.etd}</td>

                                {/* OPERATOR (WITH ASSIGN BUTTON) */}
                                <td className={`px-3 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all truncate`}>
                                    {row.operator ? (
                                        <div className="flex items-center justify-between">
                                            <OperatorCell operatorName={row.operator} operators={operators} />
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={(e) => openAssignModal(row, e)}
                                            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg shadow-lg shadow-indigo-600/20 transition-all active:scale-95 btn-designar"
                                        >
                                            <UserPlus size={14} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Designar</span>
                                        </button>
                                    )}
                                </td>

                                {/* FLEET */}
                                <td className={`px-2 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all text-center font-mono text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    {row.fleet || '--'}
                                </td>

                                {/* FLEET TYPE */}
                                <td className={`px-2 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all text-center font-mono text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    {row.fleetType || '--'}
                                </td>

                                {/* VAZÃO (Apenas GERAL) */}
                                {activeTab === 'GERAL' && (
                                    <td className={`px-2 border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all text-center font-mono ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} tracking-tight`}>
                                        {row.maxFlowRate?.toLocaleString('pt-BR') || '--'}
                                    </td>
                                )}
                            </>
                          )}
                          
                          {/* STATUS (PILL DESIGN RESTORED) - MOVED OUTSIDE CONDITIONAL */}
                          <td className={`px-3 text-center border-y border-l ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all`}>
                              {dynamicStatus ? (
                                  <div className={`flex items-center justify-center w-full h-[28px] px-2 rounded text-[9px] font-black uppercase tracking-[0.1em] border ${dynamicStatus.color}`}>
                                      {dynamicStatus.label}
                                  </div>
                              ) : (
                                  <StatusBadge status={row.status} isDarkMode={isDarkMode} />
                              )}
                              {row.isStandby && (
                                  <span className="block text-[7px] text-amber-500 uppercase mt-1 text-center font-bold tracking-widest">{row.standbyReason}</span>
                              )}
                          </td>
                          
                          <td className={`px-3 text-center last:rounded-r-[4px] border-y border-l border-r ${isDarkMode ? 'border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/80 group-hover:from-slate-700 group-hover:to-slate-800' : 'border-slate-200 bg-white group-hover:bg-slate-50'} transition-all`}>
                              <div className="relative">
                                  <>
                                      <button onClick={(e) => { 
                                          e.stopPropagation(); 
                                          if (openMenuId === row.id) {
                                              setOpenMenuId(null);
                                          } else {
                                              const rect = e.currentTarget.getBoundingClientRect();
                                              setMenuPosition({ top: rect.bottom, left: rect.right - 224 });
                                              setOpenMenuId(row.id);
                                          }
                                      }} className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all btn-action-menu shadow-lg shadow-indigo-600/20 active:scale-95">
                                          <MoreVertical size={16} />
                                      </button>

                                          {openMenuId === row.id && menuPosition && createPortal(
                                              <div 
                                                  ref={actionMenuRef} 
                                                  style={{ top: menuPosition.top, left: menuPosition.left }}
                                                  className={`fixed mt-1 w-56 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border rounded-md shadow-2xl z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-2`}
                                              >
                                                  <div className={`p-2 border-b ${isDarkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-100 bg-slate-50/50'}`}>
                                                      <p className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-bold uppercase tracking-wider`}>Ações - Voo {row.flightNumber}</p>
                                                  </div>
                                                  <div className="flex flex-col text-xs p-1">
                                                      {(() => {
                                                          const btnClass = `w-full text-left px-3 py-2 ${isDarkMode ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'} rounded flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`;
                                                          const cancelBtnClass = "w-full text-left px-3 py-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
                                                          const separator = <div className={`h-px ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'} my-1`} />;

                                                          const obsBtn = (
                                                              <button onClick={(e) => handleOpenObservationModal(row, e)} className={btnClass}>
                                                                  <Pen size={14} /> Observações
                                                              </button>
                                                          );

                                                          const cancelBtn = (
                                                              <button onClick={(e) => handleCancelFlight(row, e)} className={cancelBtnClass}>
                                                                  <XCircle size={14} /> Cancelar Voo
                                                              </button>
                                                          );

                                                          const pinBtn = (
                                                              <button onClick={(e) => handlePinFlight(row.id, e)} className={btnClass}>
                                                                  <Anchor size={14} /> {row.isPinned ? 'Desfixar do topo' : 'Fixar no topo'}
                                                              </button>
                                                          );

                                                          const moveToQueueBtn = (
                                                              <button onClick={(e) => handleMoveToQueue(row, e)} className={btnClass} disabled={!!row.operator}>
                                                                  <ListOrdered size={14} /> Mover para Fila
                                                              </button>
                                                          );

                                                          if (activeTab === 'GERAL') {
                                                              return (
                                                                  <>
                                                                      {moveToQueueBtn}
                                                                      {pinBtn}
                                                                      <button 
                                                                          onClick={(e) => { handleConfirmVisual(row.id, row.flightNumber, e); setOpenMenuId(null); }} 
                                                                          className={btnClass} 
                                                                          disabled={row.status !== FlightStatus.FINALIZADO && row.status !== FlightStatus.CANCELADO}
                                                                      >
                                                                          <CheckCheck size={14} /> Limpar da Lista
                                                                      </button>
                                                                      {cancelBtn}
                                                                      {obsBtn}
                                                                  </>
                                                              );
                                                          }

                                                          if (activeTab === 'CHEGADA') {
                                                              return (
                                                                  <>
                                                                      {moveToQueueBtn}
                                                                      {pinBtn}
                                                                      {cancelBtn}
                                                                      {obsBtn}
                                                                  </>
                                                              );
                                                          }

                                                          if (activeTab === 'FILA') {
                                                              return (
                                                                  <>
                                                                      {pinBtn}
                                                                      {cancelBtn}
                                                                      {obsBtn}
                                                                  </>
                                                              );
                                                          }

                                                          if (activeTab === 'DESIGNADOS') {
                                                              return (
                                                                  <>
                                                                      <button onClick={(e) => { e.stopPropagation(); setConfirmStartModalFlight(row); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-slate-300 hover:bg-blue-600 hover:text-white hover:shadow-[0_0_15px_rgba(37,99,235,0.5)] hover:scale-105 active:scale-95 rounded flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                                                          <Play size={14} /> Abastecendo
                                                                      </button>
                                                                      <button onClick={(e) => { e.stopPropagation(); setConfirmRemoveOperatorFlight(row); setOpenMenuId(null); }} className={btnClass}>
                                                                          <UserCheck size={14} /> Cancelar Designação
                                                                      </button>
                                                                      {obsBtn}
                                                                      {cancelBtn}
                                                                  </>
                                                              );
                                                          }

                                                          if (activeTab === 'ABASTECENDO') {
                                                              return (
                                                                  <>
                                                                      {pinBtn}
                                                                      <button onClick={(e) => { e.stopPropagation(); setConfirmFinishModalFlight(row); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-slate-300 hover:bg-emerald-600 hover:text-white hover:shadow-[0_0_15px_rgba(16,185,129,0.5)] hover:scale-105 active:scale-95 rounded flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                                                          <CheckCircle size={14} /> Finalizar
                                                                      </button>
                                                                      {obsBtn}
                                                                  </>
                                                              );
                                                          }

                                                          if (activeTab === 'FINALIZADO') {
                                                              return (
                                                                  <>
                                                                      <button onClick={(e) => handleReforco(row, e)} className={btnClass}>
                                                                          <History size={14} /> Reforço
                                                                      </button>
                                                                      {obsBtn}
                                                                  </>
                                                              );
                                                          }

                                                          return null;
                                                      })()}
                                                  </div>
                                              </div>
                                          , document.body)}
                                  </>
                              </div>
                          </td>
                      </tr>
                  )})}
              </tbody>
          </table>
        </div>
      </div>

      {/* TOAST NOTIFICATION CONTAINER */}
      <div className="absolute bottom-6 right-6 z-[60] flex flex-col gap-2 pointer-events-none">
          {toasts.map(toast => (
              <div 
                  key={toast.id}
                  className={`pointer-events-auto min-w-[300px] bg-slate-900 border-l-4 p-4 rounded-md shadow-2xl animate-in slide-in-from-right duration-300 flex items-start gap-3 ${
                      toast.type === 'success' ? 'border-emerald-500' :
                      toast.type === 'info' ? 'border-blue-500' :
                      'border-amber-500'
                  }`}
              >
                  <div className={`p-1.5 rounded-full shrink-0 ${
                      toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-500' :
                      toast.type === 'info' ? 'bg-blue-500/20 text-blue-500' :
                      'bg-amber-500/20 text-amber-500'
                  }`}>
                      {toast.type === 'success' ? <CheckCircle size={16} /> : <Eye size={16} />}
                  </div>
                  <div className="flex-1">
                      <h4 className={`text-xs font-black uppercase tracking-widest mb-1 ${
                          toast.type === 'success' ? 'text-emerald-500' :
                          toast.type === 'info' ? 'text-blue-500' :
                          'text-amber-500'
                      }`}>
                          {toast.title}
                      </h4>
                      <p className="text-[11px] text-slate-300 leading-tight">{toast.message}</p>
                  </div>
                  <button onClick={() => removeToast(toast.id)} className="text-slate-500 hover:text-white transition-colors">
                      <X size={14} />
                  </button>
              </div>
          ))}
      </div>

      {selectedFlight && (
        <FlightDetailsModal 
          flight={selectedFlight} 
          onClose={() => setSelectedFlight(null)} 
          onUpdate={(updatedFlight) => onUpdateFlights(updatedFlight)}
          vehicles={vehicles}
          operators={operators}
          onOpenAssignSupport={(flight) => setAssignSupportModalFlight(flight)}
        />
      )}


      {/* Observation Modal */}
      {observationModalFlight && (
        <ObservationModal
          flight={observationModalFlight}
          newObservation={newObservation}
          setNewObservation={setNewObservation}
          onSave={handleSaveObservation}
          onClose={() => setObservationModalFlight(null)}
        />
      )}

      {/* MODAL DE DESIGNAÇÃO DE OPERADOR */}
      <DesigOpr 
          isOpen={!!assignModalFlight}
          onClose={() => { setAssignModalFlight(null); setSelectedOperatorId(null); }}
          flight={assignModalFlight}
          operators={assignModalFlight ? getEligibleOperators(assignModalFlight, false) : []}
          onConfirm={(operatorId) => {
              confirmAssignment(operatorId);
          }}
          onOpenOperators={onOpenShiftOperators}
      />

      {/* MODAL DE DESIGNAÇÃO DE APOIO */}
      <DesigOpr 
          isOpen={!!assignSupportModalFlight}
          onClose={() => { setAssignSupportModalFlight(null); setSelectedOperatorId(null); }}
          flight={assignSupportModalFlight}
          operators={assignSupportModalFlight ? getEligibleOperators(assignSupportModalFlight, true) : []}
          onConfirm={(operatorId) => {
              confirmSupportAssignment(operatorId);
          }}
          onOpenOperators={onOpenShiftOperators}
      />

      {/* MODAL DE JUSTIFICATIVA DE ATRASO (SLA COMPLIANCE) */}
      {delayModalFlightId && (
        <DelayJustificationModal
          delayReasonCode={delayReasonCode}
          setDelayReasonCode={setDelayReasonCode}
          delayReasonDetail={delayReasonDetail}
          setDelayReasonDetail={setDelayReasonDetail}
          onSubmit={handleSubmitDelay}
          onClose={() => setDelayModalFlightId(null)}
        />
      )}

      {/* CREATE FLIGHT MODAL */}
      {isCreateModalOpen && (
        <CreateFlightModal 
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateFlight}
          airlines={airlines}
          aircraftDb={aircraftDb}
        />
      )}

      {/* IMPORT MODAL */}
      {isImportModalOpen && (
        <ImportModal
          isDarkMode={isDarkMode}
          onClose={() => setIsImportModalOpen(false)}
          onImport={(file) => {
            setIsLoading(true);
            setIsImportModalOpen(false);
            setTimeout(() => {
                setIsLoading(false);
                addToast(`Arquivo ${file.name} importado com sucesso!`, 'success');
            }, 1500);
          }}
        />
      )}

      {/* CANCEL FLIGHT CONFIRMATION MODAL */}
      {cancelModalFlight && (
        <ConfirmActionModal
          type="cancel"
          flightNumber={cancelModalFlight.flightNumber}
          registration={cancelModalFlight.registration}
          onConfirm={confirmCancelFlight}
          onClose={() => setCancelModalFlight(null)}
        />
      )}

      {/* CONFIRM START MODAL */}
      {confirmStartModalFlight && (
        <ConfirmActionModal
          type="start"
          flightNumber={confirmStartModalFlight.flightNumber}
          onConfirm={handleConfirmStart}
          onClose={() => setConfirmStartModalFlight(null)}
        />
      )}

      {/* CONFIRM REMOVE OPERATOR MODAL */}
      {confirmRemoveOperatorFlight && (
        <ConfirmActionModal
          type="remove"
          flightNumber={confirmRemoveOperatorFlight.flightNumber}
          onConfirm={handleConfirmRemoveOperator}
          onClose={() => setConfirmRemoveOperatorFlight(null)}
        />
      )}

      {/* CONFIRM FINISH MODAL */}
      {confirmFinishModalFlight && (
        <ConfirmActionModal
          type="finish"
          flightNumber={confirmFinishModalFlight.flightNumber}
          onConfirm={handleConfirmFinish}
          onClose={() => setConfirmFinishModalFlight(null)}
        />
      )}
    </div>
  );
};
