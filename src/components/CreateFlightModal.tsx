import React, { useState, useEffect } from 'react';
import { X, Plane, Calendar, Clock, MapPin, Hash, Tag, Globe } from 'lucide-react';
import { FlightData, FlightStatus, FlightLog, Airline, AircraftDatabaseEntry } from '../types';
import { useTheme } from '../contexts/ThemeContext';

const createNewLog = (type: FlightLog['type'], message: string, author: string): FlightLog => ({
    id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
    timestamp: new Date(),
    type,
    message,
    author
});

interface CreateFlightModalProps {
  onClose: () => void;
  onCreate: (flight: Partial<FlightData>) => Promise<void>;
  airlines: Airline[];
  aircraftDb: AircraftDatabaseEntry[];
}

export const CreateFlightModal: React.FC<CreateFlightModalProps> = ({ onClose, onCreate, airlines, aircraftDb }) => {
  const { isDarkMode } = useTheme();
  const [formData, setFormData] = useState({
    airlineName: '',
    registration: '',
    model: '',
    flightNumber: '', // Chegada
    eta: '',
    departureFlightNumber: '', // Saída
    destination: '', // ICAO
    positionId: '',
    etd: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value.toUpperCase() };
      
      // Auto-fill logic based on Registration (Prefixo)
      if (name === 'registration') {
        const selectedAircraft = aircraftDb.find(a => a.registration === value.toUpperCase());
        if (selectedAircraft) {
          newData.model = selectedAircraft.model;
          const airline = airlines.find(a => a.iata === selectedAircraft.airlineIata);
          if (airline) {
            newData.airlineName = airline.name;
          }
        }
      }

      // Auto-fill flight number prefix based on airline
      if (name === 'airlineName' || (name === 'registration' && newData.airlineName !== prev.airlineName)) {
        const airlineNameInput = newData.airlineName.toUpperCase();
        const airline = airlines.find(a => 
          a.name.toUpperCase() === airlineNameInput || 
          a.iata === airlineNameInput || 
          a.icao === airlineNameInput
        );
        
        if (airline) {
          const prefix = `${airline.iata}-`;
          // Only auto-fill if the field is empty or just contains a prefix
          if (!newData.flightNumber || /^[A-Z0-9]{2,3}-?$/.test(newData.flightNumber)) {
            newData.flightNumber = prefix;
          }
          if (!newData.departureFlightNumber || /^[A-Z0-9]{2,3}-?$/.test(newData.departureFlightNumber)) {
            newData.departureFlightNumber = prefix;
          }
        }
      }

      return newData;
    });
  };

  const handleCreate = () => {
    // Basic validation
    if (!formData.registration || !formData.airlineName || !formData.departureFlightNumber || !formData.etd || !formData.flightNumber) return;

    const airlineNameInput = formData.airlineName.toUpperCase();
    // Find airline by exact name match first, then by IATA, then by ICAO
    let airline = airlines.find(a => a.name.toUpperCase() === airlineNameInput);
    if (!airline) {
        airline = airlines.find(a => a.iata === airlineNameInput || a.icao === airlineNameInput);
    }
    
    const airlineName = airline ? airline.name : formData.airlineName.toUpperCase();
    const finalAirlineCode = airline ? airline.iata : 'UNK';

    const newFlight: Partial<FlightData> = {
      airline: airlineName,
      airlineCode: finalAirlineCode,
      registration: formData.registration.toUpperCase(),
      model: formData.model.toUpperCase(),
      flightNumber: formData.flightNumber.toUpperCase(),
      eta: formData.eta,
      departureFlightNumber: formData.departureFlightNumber.toUpperCase(),
      destination: formData.destination.toUpperCase(),
      positionId: formData.positionId,
      etd: formData.etd,
      origin: 'SBGL', // Default
      fuelStatus: 0,
      status: FlightStatus.CHEGADA, // Default status
      logs: [createNewLog('SISTEMA', 'Voo criado manualmente pelo gestor.', 'GESTOR_MESA')],
      messages: []
    };

    onCreate(newFlight);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCreate();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        // If an input is focused, let it handle its own Enter
        if (document.activeElement?.tagName === 'INPUT') return;
        handleCreate();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formData, onCreate, onClose]);

  // Helper to calculate if priority queue warning is needed
  const isPriority = () => {
    if (!formData.etd) return false;
    const now = new Date();
    const [h, m] = formData.etd.split(':').map(Number);
    const etdDate = new Date();
    etdDate.setHours(h, m, 0, 0);
    const diffMins = (etdDate.getTime() - now.getTime()) / 60000;
    return diffMins < 60;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
      <div className={`w-full max-w-xl ${isDarkMode ? 'bg-slate-900 border-emerald-500/30' : 'bg-white border-slate-200'} border-[0.5px] rounded-[8px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200`}>
        
        {/* Header */}
        <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-[#2C864C] bg-[#2C864C]'} flex justify-between items-center`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 flex items-center justify-center shrink-0 ${isDarkMode ? 'text-emerald-500' : 'text-emerald-100'}`}>
              <Plane size={20} />
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-tight">Criar Voo Manual</h3>
          </div>
          <button onClick={onClose} className={`transition-colors p-1 rounded-full ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-emerald-100 hover:text-white hover:bg-emerald-700'}`}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          <div className="grid grid-cols-3 gap-4">
            {/* Linha 1 */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">
                Comp. (Cia) <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                 <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 <input 
                  name="airlineName"
                  value={formData.airlineName}
                  onChange={handleChange}
                  placeholder="GOL, LATAM..."
                  list="airlines-list"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 uppercase placeholder:text-slate-300 transition-all"
                  required
                />
                {formData.airlineName && (
                  <button 
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, airlineName: '' }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">
                Prefixo <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                 <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 <input 
                  name="registration"
                  value={formData.registration}
                  onChange={handleChange}
                  placeholder="PR-..."
                  list="prefixos-list"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 uppercase placeholder:text-slate-300 transition-all"
                  required
                />
                {formData.registration && (
                  <button 
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, registration: '' }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">Modelo</label>
              <div className="relative">
                 <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 <input 
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  placeholder="B738"
                  list="modelos-list"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 uppercase placeholder:text-slate-300 transition-all"
                />
              </div>
            </div>

            {/* Linha 2 */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">Nº Voo (Chegada)</label>
              <div className="relative">
                 <Plane size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 <input 
                  name="flightNumber"
                  value={formData.flightNumber}
                  onChange={handleChange}
                  placeholder="LA-1234"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 uppercase placeholder:text-slate-300 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">ETA (Chegada)</label>
              <div className="relative">
                 <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 <input 
                  type="time"
                  name="eta"
                  value={formData.eta}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 uppercase transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">Posição</label>
              <div className="relative">
                 <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 <input 
                  name="positionId"
                  value={formData.positionId}
                  onChange={handleChange}
                  placeholder="000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 uppercase placeholder:text-slate-300 transition-all"
                />
              </div>
            </div>

            {/* Linha 3 */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">
                Nº Voo (Saída) <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                 <Plane size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transform rotate-45" />
                 <input 
                  name="departureFlightNumber"
                  value={formData.departureFlightNumber}
                  onChange={handleChange}
                  placeholder="LA-..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 uppercase placeholder:text-slate-300 transition-all"
                  required
                />
                {formData.departureFlightNumber && (
                  <button 
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, departureFlightNumber: '' }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">ICAO</label>
              <div className="relative">
                 <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 <input 
                  name="destination"
                  value={formData.destination}
                  onChange={handleChange}
                  placeholder="SB..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 uppercase placeholder:text-slate-300 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">
                ETD (Partida) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                 <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 <input 
                  type="time"
                  name="etd"
                  value={formData.etd}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 uppercase transition-all"
                  required
                />
              </div>
            </div>
          </div>

          {/* Datalists for suggestions */}
          <datalist id="airlines-list">
            {(() => {
              // Deduplicate airlines by IATA code to prevent multiple entries for the same airline
              const uniqueAirlines = Array.from(new Map(airlines.map(a => [a.iata, a])).values());
              return uniqueAirlines.map(a => (
                <option key={a.id} value={a.name}>{a.iata}</option>
              ));
            })()}
          </datalist>
          <datalist id="prefixos-list">
            {(() => {
              const airlineNameInput = formData.airlineName.toUpperCase();
              let selectedAirline = airlines.find(a => a.name.toUpperCase() === airlineNameInput);
              if (!selectedAirline) {
                  selectedAirline = airlines.find(a => a.iata === airlineNameInput || a.icao === airlineNameInput);
              }
              const iataFilter = selectedAirline ? selectedAirline.iata : null;
              const filteredAircraft = aircraftDb.filter(a => !iataFilter || a.airlineIata === iataFilter);
              
              // Deduplicate by registration
              const uniqueRegs = Array.from(new Set(filteredAircraft.map(a => a.registration)));
              
              return uniqueRegs.map(reg => {
                const ac = filteredAircraft.find(a => a.registration === reg);
                return <option key={reg} value={reg}>{ac?.model}</option>;
              });
            })()}
          </datalist>
          <datalist id="modelos-list">
            {(() => {
              const airlineNameInput = formData.airlineName.toUpperCase();
              let selectedAirline = airlines.find(a => a.name.toUpperCase() === airlineNameInput);
              if (!selectedAirline) {
                  selectedAirline = airlines.find(a => a.iata === airlineNameInput || a.icao === airlineNameInput);
              }
              const iataFilter = selectedAirline ? selectedAirline.iata : null;
              const filteredAircraft = aircraftDb.filter(a => !iataFilter || a.airlineIata === iataFilter);
              
              // Deduplicate by model
              const uniqueModels = Array.from(new Set(filteredAircraft.map(a => a.model)));
              
              return uniqueModels.map(model => (
                <option key={model} value={model} />
              ));
            })()}
          </datalist>

          {isPriority() && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-xl text-amber-600">
                <Clock size={16} />
              </div>
              <div>
                <h4 className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Atenção: Prioridade Automática</h4>
                <p className="text-[10px] text-amber-600/80 leading-relaxed font-medium">
                   Voos criados com ETD menor que 1h entrarão automaticamente na FILA de prioridade.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-4 border-t border-slate-100">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-slate-200 hover:text-slate-900 transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex-1 px-4 py-3 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20"
            >
              Criar Voo
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
