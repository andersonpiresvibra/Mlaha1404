
import React, { useState } from 'react';
import { MOCK_TEAM_PROFILES } from '../data/mockData';
import { User } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface OperatorCellProps {
  operatorName?: string;
  className?: string;
  showName?: boolean;
}

export const OperatorCell: React.FC<OperatorCellProps> = ({ 
  operatorName, 
  className = "",
  showName = true 
}) => {
  const [imageError, setImageError] = useState(false);
  const { isDarkMode } = useTheme();

  if (!operatorName) return <span className={isDarkMode ? "text-slate-500" : "text-slate-400"}>---</span>;

  const profile = MOCK_TEAM_PROFILES.find(p => p.warName === operatorName);
  
  return (
    <div className={`flex items-center justify-start gap-2 ${className}`}>
      <div className={`w-6 h-8 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'} border rounded overflow-hidden shrink-0 flex items-end justify-center`}>
        {profile?.photoUrl && !imageError ? (
          <img 
            src={profile.photoUrl} 
            alt={operatorName} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
          />
        ) : (
          <User size={20} className={isDarkMode ? "text-slate-600" : "text-slate-400/50"} />
        )}
      </div>
      {showName && (
        <span className={`${isDarkMode ? 'text-slate-300' : 'text-slate-700'} uppercase tracking-tight truncate text-[10px] font-bold leading-none mt-0.5`}>
          {operatorName}
        </span>
      )}
    </div>
  );
};
