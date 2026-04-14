import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface AirlineLogoProps {
  airlineCode: string;
  className?: string;
}

const AIRLINE_INFO: Record<string, { iata: string, name: string }> = {
  'RG': { iata: 'G3', name: 'GOL' },
  'LA': { iata: 'LA', name: 'LATAM' },
  'AD': { iata: 'AD', name: 'AZUL' },
  'TP': { iata: 'TP', name: 'TAP' },
  'AF': { iata: 'AF', name: 'AIR FR' },
  'LH': { iata: 'LH', name: 'LUFTH' },
  'CM': { iata: 'CM', name: 'COPA' },
  'UA': { iata: 'UA', name: 'UNITED' },
  'AA': { iata: 'AA', name: 'AMERIC' },
  'KL': { iata: 'KL', name: 'KLM' },
  'DL': { iata: 'DL', name: 'DELTA' },
  'TT': { iata: 'TT', name: 'TOTAL' },
};

export const AirlineLogo: React.FC<AirlineLogoProps> = ({ airlineCode, className = "" }) => {
  const [imgError, setImgError] = useState(false);
  const { isDarkMode } = useTheme();
  
  const info = AIRLINE_INFO[airlineCode] || { iata: airlineCode, name: airlineCode };
  
  // A API da Kiwi fornece ícones consistentes de 64x64 (geralmente o símbolo/cauda da aeronave)
  const iconUrl = `https://images.kiwi.com/airlines/64/${info.iata}.png`;

  return (
    <div className={`flex items-center gap-3 pl-1 ${className}`}>
      <div className="w-8 h-8 flex items-center justify-center shrink-0">
        {!imgError ? (
          <img 
            src={iconUrl} 
            alt={info.name} 
            className="w-full h-full object-contain drop-shadow-[2px_2px_2px_rgba(0,0,0,0.4)] hover:scale-110 transition-transform duration-300"
            onError={() => setImgError(true)}
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{info.iata}</span>
        )}
      </div>
      <span className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'} tracking-wider uppercase truncate`}>
        {info.name}
      </span>
    </div>
  );
};
