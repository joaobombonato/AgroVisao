import React from 'react';
import type { OverlayType } from '../../utils/mapHelpers';

interface MapLegendProps {
  type: OverlayType;
}

/**
 * Componente de legenda para os índices de vegetação no mapa.
 * Exibe gradiente de cores e labels correspondentes ao tipo de índice selecionado.
 */
export const MapLegend: React.FC<MapLegendProps> = ({ type }) => {
  if (type === 'none' || type === 'truecolor') return null;
  
  // Cores padronizadas para cada tipo de índice
  const gradients: Record<string, string> = {
    savi: 'from-[#8B4513] via-[#FFD700] to-[#228B22]', // SAVI: Solo a Verde
    ndvi: 'from-[#8B4513] via-[#FFD700] to-[#006400]', // NDVI: Padrão
    evi: 'from-[#8B4513] via-[#FFD700] to-[#006400]',  // EVI: Padrão
    ndre: 'from-[#8B4513] via-[#FF8C00] to-[#006400]', // NDRE: Nitrogênio
    ndmi: 'from-[#FF4500] via-[#F0E68C] to-[#0000FF]', // NDMI: Seco -> Úmido
  };

  const labels: Record<string, [string, string]> = {
    ndmi: ['Estresse Hídrico', 'Solo Úmido'],
    default: ['Menor Densidade', 'Maior Densidade']
  };

  const currentLabels = labels[type] || labels.default;

  return (
    <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-md px-3 py-2 rounded-xl z-[900] flex flex-col gap-1 w-[260px] border border-white/10 shadow-xl pointer-events-none animate-in fade-in slide-in-from-left-2">
      <div className="flex justify-between text-[7px] text-white/50 font-black px-0.5 tracking-wider uppercase">
        <span>{currentLabels[0]}</span>
        <span>{currentLabels[1]}</span>
      </div>
      <div className={`h-1.5 w-full rounded-full bg-gradient-to-r ${gradients[type] || gradients.ndvi}`} />
    </div>
  );
};
