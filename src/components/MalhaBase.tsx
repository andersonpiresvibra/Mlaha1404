import React, { useState, useRef } from 'react';
import { MalhaBaseEntry, FlightData, FlightStatus } from '../types';
import { Upload, Trash2, Plus, Save, Play, Check } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, writeBatch, updateDoc } from 'firebase/firestore';
import { read, utils } from 'xlsx';

interface MalhaBaseProps {
  entries: MalhaBaseEntry[];
  onClose: () => void;
}

export const MalhaBase: React.FC<MalhaBaseProps> = ({ entries, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPopulating, setIsPopulating] = useState(false);
  const [editingCell, setEditingCell] = useState<{ id: string, field: keyof MalhaBaseEntry } | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleEditClick = (id: string, field: keyof MalhaBaseEntry, value: string) => {
    setEditingCell({ id, field });
    setEditValue(value);
  };

  const handleSaveEdit = async () => {
    if (!editingCell) return;
    
    try {
      await updateDoc(doc(db, 'malha_base', editingCell.id), {
        [editingCell.field]: editValue
      });
    } catch (error) {
      console.error("Erro ao atualizar célula:", error);
    } finally {
      setEditingCell(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const parsedData = utils.sheet_to_json<any[]>(sheet, { header: 1, raw: false });
        
        if (parsedData.length === 0) return;

        // Try to detect headers in the first row
        const firstRow = (parsedData[0] || []).map(h => String(h || '').toUpperCase().trim());
        const hasHeaders = firstRow.some(h => ['COMP', 'PREFIXO', 'MODELO', 'ETA', 'ETD', 'ICAO', 'POS'].some(k => h.includes(k)));
        
        const colMap = {
          comp: firstRow.findIndex(h => h.includes('COMP') || h.includes('CIA')),
          prefixo: firstRow.findIndex(h => h.includes('PREFIXO') || h.includes('MATR') || h.includes('REG')),
          modelo: firstRow.findIndex(h => h.includes('MODELO') || h.includes('EQUIP') || h.includes('TIPO')),
          vCheg: firstRow.findIndex(h => h.includes('V.CHEG') || h.includes('VOO CHEG') || h.includes('FLIGHT IN')),
          eta: firstRow.findIndex(h => h.includes('ETA') || h.includes('POUSO') || h.includes('PREV')),
          vSaida: firstRow.findIndex(h => h.includes('V.SAIDA') || h.includes('VOO SAI') || h.includes('FLIGHT OUT')),
          icao: firstRow.findIndex(h => h.includes('ICAO') || h.includes('ORIGEM') || h.includes('PROC')),
          cid: firstRow.findIndex(h => h.includes('CID') || h.includes('DESTINO')),
          pos: firstRow.findIndex(h => h.includes('POS') || h.includes('BOX') || h.includes('STAND')),
          etd: firstRow.findIndex(h => h.includes('ETD') || h.includes('DECO') || h.includes('PARTIDA'))
        };

        // Helper to get index with fallback
        const getIdx = (key: keyof typeof colMap, defaultIdx: number) => colMap[key] === -1 ? defaultIdx : colMap[key];

        // Helper to format values and handle Excel serial times
        const formatVal = (val: any, isTime: boolean = false) => {
          if (val === undefined || val === null) return '';
          const s = String(val).trim();
          
          // Detect Excel serial time (decimal between 0 and 1)
          // We apply this if isTime is true OR if it's a very long decimal (likely raw serial)
          if (/^0\.\d+$/.test(s) && (isTime || s.length > 10)) {
            const num = parseFloat(s);
            const totalMinutes = Math.round(num * 24 * 60);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
          }
          return s;
        };

        let batch = writeBatch(db);
        let count = 0;

        // Start from row 1 if headers detected, otherwise row 0
        const startRow = hasHeaders ? 1 : 0;

        for (let i = startRow; i < parsedData.length; i++) {
          const row = parsedData[i];
          if (!row || row.length === 0) continue;

          const comp = formatVal(row[getIdx('comp', 0)]);
          const prefixo = formatVal(row[getIdx('prefixo', 1)]);
          const modelo = formatVal(row[getIdx('modelo', 2)]);
          const vCheg = formatVal(row[getIdx('vCheg', 3)]);
          const eta = formatVal(row[getIdx('eta', 4)], true);
          const vSaida = formatVal(row[getIdx('vSaida', 5)]);
          const icao = formatVal(row[getIdx('icao', 6)]);
          const cid = formatVal(row[getIdx('cid', 7)]);
          const pos = formatVal(row[getIdx('pos', 8)]);
          const etd = formatVal(row[getIdx('etd', 9)], true);

          // Skip if all fields are empty
          if (!comp && !prefixo && !vCheg && !vSaida && !eta && !etd) continue;

          const newDocRef = doc(collection(db, 'malha_base'));
          batch.set(newDocRef, {
            comp,
            prefixo,
            modelo,
            vCheg,
            eta,
            vSaida,
            icao,
            cid,
            pos,
            etd
          });
          count++;

          if (count >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }

        if (count > 0) {
          await batch.commit();
        }
      } catch (error) {
        console.error("Erro ao processar arquivo:", error);
        alert("Erro ao processar o arquivo. Verifique o formato.");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'malha_base', id));
    } catch (error) {
      console.error("Erro ao excluir linha:", error);
    }
  };

  const handleClearAll = async () => {
    setIsUploading(true);
    try {
      let batch = writeBatch(db);
      let count = 0;
      for (const entry of entries) {
        batch.delete(doc(db, 'malha_base', entry.id));
        count++;
        if (count >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) {
        await batch.commit();
      }
    } catch (error) {
      console.error("Erro ao limpar malha base:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePopulateAttendance = async () => {
    setIsPopulating(true);
    try {
      let batch = writeBatch(db);
      let count = 0;
      
      for (const entry of entries) {
        const newFlightRef = doc(collection(db, 'flights'));
        const flightData: Partial<FlightData> = {
          flightNumber: entry.vCheg || 'N/A',
          departureFlightNumber: entry.vSaida || '',
          airline: entry.comp || 'N/A',
          airlineCode: entry.comp || 'N/A',
          model: entry.modelo || 'N/A',
          registration: entry.prefixo || 'N/A',
          origin: entry.icao || 'N/A',
          destination: entry.cid || 'N/A',
          eta: entry.eta || '00:00',
          etd: entry.etd || '00:00',
          positionId: entry.pos || 'N/A',
          status: FlightStatus.CHEGADA,
          fuelStatus: 0,
          logs: []
        };
        
        batch.set(newFlightRef, flightData);
        count++;
        
        if (count >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      
      if (count > 0) {
        await batch.commit();
      }
      
      alert('Dados enviados com sucesso!');
      onClose(); // Voltar para a aba de atendimento
    } catch (error) {
      console.error("Erro ao popular atendimento:", error);
      alert('Erro ao enviar dados.');
    } finally {
      setIsPopulating(false);
    }
  };

  const renderCell = (entry: MalhaBaseEntry, field: keyof MalhaBaseEntry, className: string = "") => {
    const isEditing = editingCell?.id === entry.id && editingCell?.field === field;
    
    if (isEditing) {
      return (
        <td className={`px-2 py-1 border-r border-slate-700/50 ${className}`}>
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full bg-slate-900 border border-emerald-500 text-white px-1 py-0.5 rounded text-xs outline-none"
          />
        </td>
      );
    }

    return (
      <td 
        className={`px-4 py-2 border-r border-slate-700/50 cursor-pointer hover:bg-slate-600/50 transition-colors ${className}`}
        onClick={() => handleEditClick(entry.id, field, String(entry[field] || ''))}
      >
        {entry[field]}
      </td>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200">
      <div className="flex items-center justify-between p-3 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white">Malha Base</h2>
        <div className="flex gap-2">
          <button
            onClick={handlePopulateAttendance}
            disabled={isPopulating || isUploading || entries.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors disabled:opacity-50 text-xs font-bold"
          >
            <Check size={14} />
            {isPopulating ? 'Enviando...' : 'Enviar/Atualizar'}
          </button>
          <input
            type="file"
            accept=".csv, .xlsx, .xls"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isPopulating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 text-xs"
          >
            <Upload size={14} />
            {isUploading ? 'Importando...' : 'Importar Planilha'}
          </button>
          <button
            onClick={handleClearAll}
            disabled={isUploading || isPopulating || entries.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50 text-xs"
          >
            <Trash2 size={14} />
            Limpar Tudo
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors text-xs"
          >
            Voltar
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3">
        <div className="bg-slate-800 rounded shadow overflow-hidden border border-slate-700">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="text-[10px] text-slate-400 uppercase bg-slate-900/50 border-b border-slate-700">
              <tr>
                <th className="px-3 py-2 border-r border-slate-700">COMP</th>
                <th className="px-3 py-2 border-r border-slate-700">PREFIXO</th>
                <th className="px-3 py-2 border-r border-slate-700">MODELO</th>
                <th className="px-3 py-2 border-r border-slate-700">V.CHEG</th>
                <th className="px-3 py-2 border-r border-slate-700">ETA</th>
                <th className="px-3 py-2 border-r border-slate-700">V.SAÍDA</th>
                <th className="px-3 py-2 border-r border-slate-700">ICAO</th>
                <th className="px-3 py-2 border-r border-slate-700">CID</th>
                <th className="px-3 py-2 border-r border-slate-700">POS</th>
                <th className="px-3 py-2 border-r border-slate-700">ETD</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  {renderCell(entry, 'comp', 'px-3')}
                  {renderCell(entry, 'prefixo', 'px-3 font-mono text-blue-400')}
                  {renderCell(entry, 'modelo', 'px-3')}
                  {renderCell(entry, 'vCheg', 'px-3 font-mono')}
                  {renderCell(entry, 'eta', 'px-3 font-mono text-amber-400')}
                  {renderCell(entry, 'vSaida', 'px-3 font-mono')}
                  {renderCell(entry, 'icao', 'px-3')}
                  {renderCell(entry, 'cid', 'px-3')}
                  {renderCell(entry, 'pos', 'px-3 font-bold')}
                  {renderCell(entry, 'etd', 'px-3 font-mono text-emerald-400')}
                  <td className="px-3 py-1.5 text-right">
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-400/10 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-3 py-6 text-center text-slate-500">
                    Nenhum dado na malha base. Importe um arquivo para começar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
