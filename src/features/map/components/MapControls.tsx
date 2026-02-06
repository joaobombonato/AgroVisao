import React from 'react';
import { Locate } from 'lucide-react';

interface MapControlsProps {
  mapType: 'street' | 'satellite';
  setMapType: (type: 'street' | 'satellite') => void;
  onLocateMe: () => void;
}

/**
 * Barra de controles do mapa (toggle Mapa/Satélite e botão de localização).
 * Exibida na aba "Mapa e Edição".
 */
export function MapControls({ mapType, setMapType, onLocateMe }: MapControlsProps) {
  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-4">
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          {(['street', 'satellite'] as const).map(t => (
            <button 
              key={t} 
              onClick={() => setMapType(t)} 
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${mapType === t ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t === 'street' ? 'Mapa' : 'Satélite'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button 
          onClick={onLocateMe} 
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" 
          title="Minha Localização"
        >
          <Locate className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
