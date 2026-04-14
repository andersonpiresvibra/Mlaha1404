
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FlightData, FlightLog, OperatorProfile, Vehicle, FlightStatus } from '../types';
import { MOCK_TEAM_PROFILES } from '../data/mockData';
import useOnClickOutside from '../hooks/useOnClickOutside';
import { DesigOpr } from './DesigOpr';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Plane, X, MapPin, Clock, Hash, BusFront, Droplet, 
  UserPlus, RefreshCw, Pen, Anchor, Calendar, Tag, Activity, Users, AlertCircle, Globe, GripHorizontal,
  MessageCircle, UserCheck, Plus, FileText, History, PlaneTakeoff, CheckCircle
} from 'lucide-react';

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

interface FlightDetailsModalProps {
  flight: FlightData;
  onClose: () => void;
  onUpdate: (updatedFlight: FlightData) => void;
  vehicles: Vehicle[];
  operators: OperatorProfile[];
  onOpenAssignSupport?: (flight: FlightData) => void;
}

export const FlightDetailsModal: React.FC<FlightDetailsModalProps> = ({ flight, onClose, onUpdate, vehicles, operators, onOpenAssignSupport }) => {
  const { isDarkMode } = useTheme();
  const [localFlight, setLocalFlight] = useState<FlightData>(flight);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const currentVehicle = useMemo(() => {
    if (!vehicles) return null;
    return vehicles.find(v => v.id === localFlight.fleet) || null;
  }, [vehicles, localFlight.fleet]);

  const vehicleForModal = useMemo(() => {
    if (currentVehicle) return currentVehicle;
    return {
      id: localFlight.fleet || "N/A",
      type: localFlight.vehicleType || 'SERVIDOR',
      status: 'DISPONÍVEL',
      manufacturer: '',
      maxFlowRate: 0,
      hasPlatform: false
    } as Vehicle;
  }, [currentVehicle, localFlight.vehicleType, localFlight.fleet]);

  const handleAssignOperator = (operatorId: string) => {
    const operator = operators.find(op => op.id === operatorId);
    if (!operator) return;
    
    const updatedFlight = {
      ...localFlight,
      operator: operator.warName,
      fleet: operator.assignedVehicle,
      fleetType: operator.fleetCapability as any,
      status: FlightStatus.DESIGNADO,
      designationTime: new Date(),
    };
    
    const newLog: FlightLog = {
      id: Date.now().toString(),
      timestamp: new Date(),
      type: 'MANUAL',
      message: `Operador ${operator.warName} designado via modal.`,
      author: 'GESTOR_MESA'
    };
    updatedFlight.logs = [...(updatedFlight.logs || []), newLog];

    setLocalFlight(updatedFlight);
    onUpdate(updatedFlight);
    setIsAssignModalOpen(false);
  };
  
  // Window Position State for Draggable Popup - Lazy Initialization to prevent jumping
  const [position, setPosition] = useState(() => {
      if (typeof window !== 'undefined') {
          return { 
              x: Math.max(0, window.innerWidth / 2 - 220),
              y: Math.max(20, window.innerHeight / 2 - 180)
          };
      }
      return { x: 0, y: 0 };
  });

  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);
  const designationRef = useRef<HTMLDivElement>(null);

  // Editing States
  const [isEditingDest, setIsEditingDest] = useState(false);
  const [destInput, setDestInput] = useState(flight.destination);

  const [isEditingReg, setIsEditingReg] = useState(false);
  const [regInput, setRegInput] = useState(flight.registration);

  const [isEditingPos, setIsEditingPos] = useState(false);
  const [posInput, setPosInput] = useState(flight.positionId);
  const [posTypeInput, setPosTypeInput] = useState<'SRV' | 'CTA' | undefined>(flight.positionType);
  
  const [isEditingEta, setIsEditingEta] = useState(false);
  const [etaInput, setEtaInput] = useState(flight.eta);

  const [isEditingEtd, setIsEditingEtd] = useState(false);
  const [etdInput, setEtdInput] = useState(flight.etd); 

  const [isEditingDepFlight, setIsEditingDepFlight] = useState(false);
  const [depFlightInput, setDepFlightInput] = useState(flight.departureFlightNumber || '');

  const [isEditingChock, setIsEditingChock] = useState(false);
  const [chockInput, setChockInput] = useState(flight.actualArrivalTime || ''); 

  const [isEditingOperator, setIsEditingOperator] = useState(false);
  const [operatorInput, setOperatorInput] = useState(flight.operator || '');

  const [isEditingSupport, setIsEditingSupport] = useState(false);
  const [supportInput, setSupportInput] = useState(flight.supportOperator || '');

  const [showOperatorList, setShowOperatorList] = useState(false);
  const [showSupportOperatorList, setShowSupportOperatorList] = useState(false);

  const availableOperators = useMemo(() => {
    const isRemote = flight.positionId.startsWith('5') || flight.positionId.startsWith('6') || flight.positionId.startsWith('7');

    return MOCK_TEAM_PROFILES
      .filter(op => {
        if (op.status !== 'DISPONÍVEL') return false;
        if (isRemote && op.category !== 'ILHA' && op.category !== 'VIP') return false; // Simplificado para ILHA/VIP em remotas
        return true;
      })
      .sort((a, b) => {
        // Lógica de Sorteio: por enquanto, apenas alfabética.
        return a.warName.localeCompare(b.warName);
      });
  }, [flight.positionId]);

  useOnClickOutside(designationRef, () => {
    setShowOperatorList(false);
    setShowSupportOperatorList(false);
  });

  useEffect(() => {
    setLocalFlight(flight);
    setDestInput(flight.destination);
    setRegInput(flight.registration);
    setPosInput(flight.positionId);
    setEtaInput(flight.eta);
    setEtdInput(flight.etd);
    setDepFlightInput(flight.departureFlightNumber || '');
    setChockInput(flight.actualArrivalTime || '');
    setOperatorInput(flight.operator || '');
    setSupportInput(flight.supportOperator || '');
  }, [flight]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        // If an input is focused, let it handle its own Enter
        if (document.activeElement?.tagName === 'INPUT') return;
        onUpdate(localFlight);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [localFlight, onUpdate, onClose]);

  // DRAG LOGIC
  const handleMouseDown = (e: React.MouseEvent) => {
    if (windowRef.current) {
        isDragging.current = true;
        dragOffset.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      setPosition({
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y
      });
  };

  const handleMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
  };

  // Helper para gerar log de auditoria
  const generateAuditLog = (field: string, oldValue: string | number | undefined, newValue: string | number | undefined): FlightLog => ({
      id: Date.now().toString(),
      timestamp: new Date(),
      type: 'MANUAL',
      message: `${field} alterado manualmente: ${oldValue || '--'} > ${newValue || '--'}`,
      author: 'GESTOR_MESA'
  });

  const handleSaveDest = () => {
    const formatted = destInput.toUpperCase().slice(0, 4);
    if (formatted === localFlight.destination) { setIsEditingDest(false); return; }

    const newLog = generateAuditLog('Destino', localFlight.destination, formatted);
    const updated = { 
        ...localFlight, 
        destination: formatted,
        logs: [...localFlight.logs, newLog]
    };
    
    setLocalFlight(updated);
    onUpdate(updated);
    setIsEditingDest(false);
  };

  const handleSaveDepFlight = () => {
    const formatted = depFlightInput.toUpperCase();
    if (formatted === localFlight.departureFlightNumber) { setIsEditingDepFlight(false); return; }

    const newLog = generateAuditLog('Nº Voo (Saída)', localFlight.departureFlightNumber || '--', formatted);
    const updated = { 
        ...localFlight, 
        departureFlightNumber: formatted,
        logs: [...localFlight.logs, newLog]
    };
    
    setLocalFlight(updated);
    onUpdate(updated);
    setIsEditingDepFlight(false);
  };

  const handleSaveReg = () => {
    if (regInput === localFlight.registration) { setIsEditingReg(false); return; }

    const newLog = generateAuditLog('Prefixo', localFlight.registration, regInput);
    const updated = { 
        ...localFlight, 
        registration: regInput,
        logs: [...localFlight.logs, newLog]
    };

    setLocalFlight(updated);
    onUpdate(updated);
    setIsEditingReg(false);
  };

  const handleSaveEta = () => {
      if (etaInput === localFlight.eta) { setIsEditingEta(false); return; }

      const newLog = generateAuditLog('ETA', localFlight.eta, etaInput);
      const updated = { 
          ...localFlight, 
          eta: etaInput,
          logs: [...localFlight.logs, newLog]
      };

      setLocalFlight(updated);
      onUpdate(updated);
      setIsEditingEta(false);
  };

  const handleSaveChock = () => {
      if (chockInput === localFlight.actualArrivalTime) { setIsEditingChock(false); return; }

      const newLog = generateAuditLog('Horário Calço', localFlight.actualArrivalTime || '--', chockInput);
      const updated = { 
          ...localFlight, 
          actualArrivalTime: chockInput,
          logs: [...localFlight.logs, newLog]
      };

      setLocalFlight(updated);
      onUpdate(updated);
      setIsEditingChock(false);
  };

  const handleSaveEtd = () => {
    if (etdInput === localFlight.etd) { setIsEditingEtd(false); return; }

    const newLog = generateAuditLog('ETD', localFlight.etd, etdInput);
    const updated = { 
        ...localFlight, 
        etd: etdInput,
        logs: [...localFlight.logs, newLog]
    };

    setLocalFlight(updated);
    onUpdate(updated);
    setIsEditingEtd(false);
  };

  const handleSaveOperator = () => {
    if (operatorInput === localFlight.operator) { setIsEditingOperator(false); return; }

    const newLog = generateAuditLog('Operador (Líder)', localFlight.operator, operatorInput);
    const updated = { 
        ...localFlight, 
        operator: operatorInput,
        logs: [...localFlight.logs, newLog]
    };

    setLocalFlight(updated);
    onUpdate(updated);
    setIsEditingOperator(false);
  };

  const handleSaveSupport = () => {
    if (supportInput === localFlight.supportOperator) { setIsEditingSupport(false); return; }

    const newLog = generateAuditLog('Apoio Técnico', localFlight.supportOperator, supportInput);
    const updated = { 
        ...localFlight, 
        supportOperator: supportInput,
        logs: [...localFlight.logs, newLog]
    };

    setLocalFlight(updated);
    onUpdate(updated);
    setIsEditingSupport(false);
  };

  const isFinished = localFlight.status === FlightStatus.FINALIZADO || localFlight.status === FlightStatus.CANCELADO;

  return (
    <>
    <motion.div 
        ref={windowRef}
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        style={{ left: position.x, top: position.y }}
        className={`fixed z-[100] w-full max-w-[440px] flex flex-col rounded-[8px] shadow-2xl border-[0.5px] ${isDarkMode ? 'border-emerald-500/30 bg-slate-900/95' : 'border-slate-200 bg-white/95'} backdrop-blur-xl overflow-hidden`}
    >
        {/* HEADER COMPACT & SOPHISTICATED */}
        <div 
            onMouseDown={handleMouseDown}
            className={`${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-[#2C864C] border-[#2C864C]'} p-4 flex justify-between items-center cursor-move select-none border-b`}
        >
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                    <img 
                        src={`https://images.kiwi.com/airlines/64/${localFlight.airlineCode === 'RG' ? 'G3' : localFlight.airlineCode}.png`}
                        alt={localFlight.airline}
                        className="w-full h-full object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                        referrerPolicy="no-referrer"
                    />
                </div>
                <div>
                    <div className="flex items-center gap-2 leading-none mb-1">
                        <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest">
                            {localFlight.airline} • {localFlight.model}
                        </span>
                    </div>
                    <h2 className="text-xl font-bold text-white font-mono tracking-tight leading-none">
                        {localFlight.flightNumber}
                    </h2>
                </div>
            </div>

            <button 
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 text-white transition-all"
            >
                <X size={20} className="border border-white rounded-[5px]" />
            </button>
        </div>

        {/* CONTENT: TIGHT GRID */}
        <div className="p-6 space-y-8 bg-white">
            <section>
                <div className="flex items-center gap-3 mb-5">
                    <h3 className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-[0.2em] border border-emerald-100">
                        DADOS DO VOO
                    </h3>
                    <div className="h-px flex-1 bg-slate-100" />
                </div>
                
                <div className="grid grid-cols-3 gap-x-6 gap-y-6">
                    {/* LINHA 1 */}
                    {/* Nº Voo (saída) */}
                    <div className="space-y-1.5 group">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <PlaneTakeoff size={12} className="text-slate-300" /> Nº Voo (Saída)
                        </label>
                        {isEditingDepFlight ? (
                            <input 
                                autoFocus
                                className="w-full bg-slate-50 border border-emerald-200 text-slate-900 text-sm px-2 py-1.5 rounded-lg font-mono outline-none uppercase focus:ring-4 focus:ring-emerald-500/5 transition-all"
                                value={depFlightInput}
                                onChange={e => setDepFlightInput(e.target.value.toUpperCase())}
                                onBlur={handleSaveDepFlight}
                                onKeyDown={e => e.key === 'Enter' && handleSaveDepFlight()}
                            />
                        ) : (
                            <div onClick={() => setIsEditingDepFlight(true)} className="flex items-center gap-2 cursor-pointer group/item">
                                <span className="text-lg font-mono text-[#0C9E6D] font-bold tracking-tight">
                                    {localFlight.departureFlightNumber || '--'}
                                </span>
                                <Pen size={10} className="text-slate-300 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                            </div>
                        )}
                    </div>

                    {/* DESTINO */}
                    <div className="space-y-1.5 group">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Globe size={12} className="text-slate-300" /> Destino
                        </label>
                        {isEditingDest ? (
                            <input 
                                autoFocus
                                className="w-full bg-slate-50 border border-emerald-200 text-slate-900 text-sm px-2 py-1.5 rounded-lg font-mono outline-none uppercase focus:ring-4 focus:ring-emerald-500/5 transition-all"
                                value={destInput}
                                onChange={e => setDestInput(e.target.value.toUpperCase().slice(0, 4))}
                                onBlur={handleSaveDest}
                                onKeyDown={e => e.key === 'Enter' && handleSaveDest()}
                                maxLength={4}
                            />
                        ) : (
                            <div onClick={() => setIsEditingDest(true)} className="flex items-center gap-2 cursor-pointer group/item">
                                <span className="text-lg font-mono text-[#0C9E6D] font-bold tracking-tight">
                                    {localFlight.destination}
                                </span>
                                <Pen size={10} className="text-slate-300 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                            </div>
                        )}
                    </div>

                    {/* CID (cidade) */}
                    <div className="space-y-1.5 group">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <MapPin size={12} className="text-slate-300" /> Cidade
                        </label>
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-mono text-[#0C9E6D] font-bold tracking-tight uppercase">
                                {ICAO_CITIES[localFlight.destination] || 'EXTERIOR'}
                            </span>
                        </div>
                    </div>

                    {/* LINHA 2 */}
                    {/* PREFIXO */}
                    <div className="space-y-1.5 group">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Hash size={12} className="text-slate-300" /> Prefixo
                        </label>
                        {isEditingReg ? (
                            <input 
                                autoFocus
                                className="w-full bg-slate-50 border border-indigo-200 text-slate-900 text-sm px-2 py-1.5 rounded-lg font-mono outline-none uppercase focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                value={regInput}
                                onChange={e => setRegInput(e.target.value.toUpperCase())}
                                onBlur={handleSaveReg}
                                onKeyDown={e => e.key === 'Enter' && handleSaveReg()}
                            />
                        ) : (
                            <div onClick={() => setIsEditingReg(true)} className="flex items-center gap-2 cursor-pointer group/item">
                                <span className="text-lg font-mono text-[#0C9E6D] font-bold tracking-tight">
                                    {localFlight.registration}
                                </span>
                                <Pen size={10} className="text-slate-300 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                            </div>
                        )}
                    </div>

                    {/* POSIÇÃO */}
                    <div className="space-y-1.5 group">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <MapPin size={12} className="text-slate-300" /> Posição
                        </label>
                        {isEditingPos ? (
                            <div className="flex flex-col gap-2">
                                <input 
                                    autoFocus
                                    className="w-full bg-slate-50 border border-indigo-200 text-slate-900 text-sm px-2 py-1.5 rounded-lg font-mono outline-none uppercase focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                    placeholder="Ex: 101"
                                    value={posInput}
                                    onChange={e => setPosInput(e.target.value.toUpperCase())}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            if (!posInput) return;
                                            const newLog = generateAuditLog('Posição', 
                                                `${localFlight.positionId} (${localFlight.positionType || 'N/A'})`, 
                                                `${posInput} (${posTypeInput || 'SRV'})`
                                            );
                                            const updatedFlight = { 
                                                ...localFlight, 
                                                positionId: posInput,
                                                positionType: posTypeInput || 'SRV',
                                                logs: [...(localFlight.logs || []), newLog]
                                            };
                                            setLocalFlight(updatedFlight);
                                            setIsEditingPos(false);
                                            onUpdate(updatedFlight);
                                        }
                                    }}
                                />
                                <div className="flex gap-1">
                                    {['SRV', 'CTA'].map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => {
                                                if (!posInput) return;
                                                const newLog = generateAuditLog('Posição', 
                                                    `${localFlight.positionId} (${localFlight.positionType || 'N/A'})`, 
                                                    `${posInput} (${type})`
                                                );
                                                const updatedFlight = { 
                                                    ...localFlight, 
                                                    positionId: posInput,
                                                    positionType: type as 'SRV' | 'CTA',
                                                    logs: [...(localFlight.logs || []), newLog]
                                                };
                                                setLocalFlight(updatedFlight);
                                                setPosTypeInput(type as 'SRV' | 'CTA');
                                                setIsEditingPos(false);
                                            }}
                                            className={`flex-1 py-1.5 text-[10px] font-bold rounded border transition-all ${
                                                posTypeInput === type 
                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                                                : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-200 hover:text-indigo-600'
                                            }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div onClick={() => setIsEditingPos(true)} className="flex items-center gap-2 cursor-pointer group/item">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-mono text-[#0C9E6D] font-bold tracking-tight">
                                        {localFlight.positionId}
                                    </span>
                                    {localFlight.positionType && (
                                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm border ${
                                            localFlight.positionType === 'CTA' 
                                            ? 'bg-yellow-400 border-yellow-500 text-slate-900' 
                                            : 'bg-slate-100 border-slate-200 text-slate-600'
                                        }`}>
                                            {localFlight.positionType}
                                        </span>
                                    )}
                                </div>
                                <Pen size={10} className="text-slate-300 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                            </div>
                        )}
                    </div>

                    {/* ETD */}
                    <div className="space-y-1.5 group">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Clock size={12} className="text-slate-300" /> ETD
                        </label>
                        {isEditingEtd ? (
                            <input 
                                autoFocus
                                type="time"
                                className="w-full bg-slate-50 border border-amber-200 text-slate-900 text-sm px-2 py-1.5 rounded-lg font-mono outline-none focus:ring-4 focus:ring-amber-500/5 transition-all"
                                value={etdInput}
                                onChange={e => setEtdInput(e.target.value)}
                                onBlur={handleSaveEtd}
                                onKeyDown={e => e.key === 'Enter' && handleSaveEtd()}
                            />
                        ) : (
                            <div onClick={() => setIsEditingEtd(true)} className="flex items-center gap-2 cursor-pointer group/item">
                                <span className="text-lg font-mono text-emerald-700 bg-emerald-50 border border-emerald-100 font-bold tracking-tight px-1.5 rounded">
                                    {localFlight.etd}
                                </span>
                                <Pen size={10} className="text-slate-300 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                            </div>
                        )}
                    </div>

                    {/* LINHA 3 */}
                    {/* ETA */}
                    <div className="space-y-1.5 group">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Calendar size={12} className="text-slate-300" /> ETA
                        </label>
                        {isEditingEta ? (
                            <input 
                                autoFocus
                                type="time"
                                className="w-full bg-slate-50 border border-emerald-200 text-slate-900 text-sm px-2 py-1.5 rounded-lg font-mono outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all"
                                value={etaInput}
                                onChange={e => setEtaInput(e.target.value)}
                                onBlur={handleSaveEta}
                                onKeyDown={e => e.key === 'Enter' && handleSaveEta()}
                            />
                        ) : (
                            <div onClick={() => setIsEditingEta(true)} className="flex items-center gap-2 cursor-pointer group/item">
                                <span className="text-lg font-mono text-[#0C9E6D] font-bold tracking-tight">
                                    {localFlight.eta}
                                </span>
                                <Pen size={10} className="text-slate-300 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                            </div>
                        )}
                    </div>

                    {/* CALÇO */}
                    <div className="space-y-1.5 group">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Anchor size={12} className="text-slate-300" /> Calço
                        </label>
                        {isEditingChock ? (
                            <input 
                                autoFocus
                                type="time"
                                className="w-full bg-slate-50 border border-indigo-200 text-slate-900 text-sm px-2 py-1.5 rounded-lg font-mono outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                value={chockInput}
                                onChange={e => setChockInput(e.target.value)}
                                onBlur={handleSaveChock}
                                onKeyDown={e => e.key === 'Enter' && handleSaveChock()}
                            />
                        ) : (
                            <div onClick={() => setIsEditingChock(true)} className="flex items-center gap-2 cursor-pointer group/item">
                                <span className="text-lg font-mono text-[#0C9E6D] font-bold tracking-tight">
                                    {chockInput || '--:--'}
                                </span>
                                <Pen size={10} className="text-slate-300 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                            </div>
                        )}
                    </div>

                    {/* STATUS */}
                    <div className="space-y-1.5 group">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <CheckCircle size={12} className="text-slate-300" /> Status
                        </label>
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-mono text-emerald-600 font-bold tracking-tight uppercase">
                                {localFlight.status}
                            </span>
                        </div>
                    </div>
                </div>
            </section>
        </div>

        {/* FOOTER: ACTION ORIENTED DESIGNATION */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 text-[9px]">
            {!isFinished && (
                <div className="grid grid-cols-2 gap-4">
                    {/* OPERADOR */}
                    <div className="space-y-2.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <UserPlus size={12} className="text-indigo-500" /> Operador
                        </label>
                        {localFlight.operator ? (
                            <div className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-xl group hover:border-indigo-300 transition-all shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold border border-indigo-100">
                                        {localFlight.operator.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-bold text-slate-900 uppercase leading-none">{localFlight.operator} {localFlight.fleet ? `| ${localFlight.fleet}` : ''}</div>
                                        <div className="text-[8px] text-slate-400 mt-1 font-bold uppercase tracking-widest">
                                            {localFlight.vehicleType || 'S/ TIPO'}
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsAssignModalOpen(true)}
                                    className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                >
                                    <RefreshCw size={12} />
                                </button>
                            </div>
                        ) : (
                            <button 
                                onClick={() => setIsAssignModalOpen(true)}
                                className="w-full h-[48px] bg-white border border-dashed border-slate-300 rounded-xl text-[10px] font-bold text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                            >
                                <UserPlus size={16} /> Designar
                            </button>
                        )}
                    </div>

                    {/* OP. APOIO */}
                    <div className="space-y-2.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Users size={12} className="text-emerald-500" /> Op. Apoio
                        </label>
                        {localFlight.operator ? (
                            <div className="relative">
                                {localFlight.supportOperator ? (
                                    <div className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-xl group hover:border-emerald-300 transition-all shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold border border-emerald-100">
                                                {localFlight.supportOperator.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-[11px] font-bold text-slate-900 uppercase leading-none">
                                                    {localFlight.supportOperator} 
                                                    {operators.find(op => op.warName === localFlight.supportOperator)?.assignedVehicle ? ` | ${operators.find(op => op.warName === localFlight.supportOperator)?.assignedVehicle}` : ''}
                                                </div>
                                                <div className="text-[8px] text-slate-400 mt-1 font-bold uppercase tracking-widest">Auxiliar</div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                const newLog = generateAuditLog('Op. Apoio', localFlight.supportOperator, undefined);
                                                const updated = { ...localFlight, supportOperator: undefined, logs: [...localFlight.logs, newLog] };
                                                setLocalFlight(updated);
                                                onUpdate(updated);
                                            }}
                                            className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => onOpenAssignSupport && onOpenAssignSupport(localFlight)}
                                        className="w-full h-[48px] bg-white border border-dashed border-slate-300 rounded-xl text-[10px] font-bold text-slate-400 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                                    >
                                        <Plus size={16} /> Adicionar
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="w-full h-[48px] bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                                Aguardando
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Ações (Cancelar / OK) */}
            <div className="flex gap-4 pt-0 border-none mt-0">
                <button 
                    onClick={() => {
                        if (isFinished) {
                            const newLog: FlightLog = {
                                id: Date.now().toString(),
                                timestamp: new Date(),
                                type: 'MANUAL',
                                message: 'Voo arquivado da visão geral pelo gestor.',
                                author: 'GESTOR_MESA'
                            };
                            const updatedFlight = {
                                ...localFlight,
                                isHiddenFromGrid: true,
                                logs: [...(localFlight.logs || []), newLog]
                            };
                            onUpdate(updatedFlight);
                        }
                        onClose();
                    }}
                    className="flex-1 px-4 py-3.5 bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-700 transition-all active:scale-95"
                >
                    {isFinished ? 'Limpar da Fila' : 'Cancelar'}
                </button>
                <button 
                    onClick={() => {
                        onUpdate(localFlight);
                        onClose();
                    }}
                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-4 rounded-lg shadow-lg shadow-indigo-600/20 transition-all active:scale-95 btn-confirm-flight"
                >
                    <span className="text-[10px] font-black uppercase tracking-widest">Confirmar</span>
                </button>
            </div>
        </div>
    </motion.div>

    <DesigOpr 
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        flight={localFlight}
        operators={operators}
        onConfirm={handleAssignOperator}
    />
  </>
);
};
