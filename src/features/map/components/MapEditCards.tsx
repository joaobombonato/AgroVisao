import React from 'react';
import { Maximize2, Plus, ChevronRight } from 'lucide-react';

interface MapEditCardsProps {
  areaHectares: number | null;
  isDrawing: boolean;
  geojsonData: any;
  canEdit: boolean;
  onStartDrawing: () => void;
  onStartEditing: () => void;
}

/**
 * Cards de ação exibidos na aba "Mapa e Edição".
 * Mostra a área monitorada e o botão de ação (Desenhar/Modificar).
 */
export function MapEditCards({
  areaHectares,
  isDrawing,
  geojsonData,
  canEdit,
  onStartDrawing,
  onStartEditing
}: MapEditCardsProps) {
  return (
    <div className="space-y-3 animate-in slide-in-from-top-2 mb-3">
      <div className="grid grid-cols-2 gap-3">
        {/* 1. AREA CARD */}
        <div className="bg-white h-12 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center px-3">
          <div className="flex items-center gap-1 text-green-600 mb-0.5">
            <Maximize2 className="w-2.5 h-2.5" />
            <span className="text-[7.5px] font-black uppercase tracking-widest">Área Monitorada</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[13px] font-black text-gray-800">
              {areaHectares ? areaHectares.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : '--'}
            </span>
            <span className="text-[8px] font-black text-green-600/70 uppercase">ha</span>
          </div>
        </div>

        {/* 2. MODIFY ACTION CARD */}
        {!isDrawing && canEdit && (
          geojsonData ? (
            <div 
              onClick={onStartEditing}
              className="bg-white h-12 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center relative transition-all active:scale-95 px-3 cursor-pointer hover:bg-green-50/50 hover:border-green-100"
            >
              <div className="flex flex-col items-center justify-center w-full">
                <div className="flex items-center gap-1 text-green-600 mb-0.5">
                  <Maximize2 className="w-2.5 h-2.5" />
                  <span className="text-[7.5px] font-black uppercase tracking-widest">Ajustes</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[13px] font-black text-green-700">Modificar</span>
                  <div className="bg-green-50 rounded-full p-0.5 ml-1">
                    <ChevronRight className="w-2.5 h-2.5 text-green-700" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div 
              onClick={onStartDrawing}
              className="bg-green-600 h-12 rounded-xl border border-green-500 shadow-md flex flex-col items-center justify-center relative transition-all active:scale-95 px-3 cursor-pointer hover:bg-green-700"
            >
              <div className="flex flex-col items-center justify-center w-full text-white">
                <div className="flex items-center gap-1 mb-0.5">
                  <Plus className="w-3 h-3" />
                  <span className="text-[7.5px] font-black uppercase tracking-widest">Delimitar Divisa</span>
                </div>
                <span className="text-[13px] font-black uppercase">Desenhar Área</span>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
