import React from 'react';
import { MousePointerClick, Check, Undo2, X } from 'lucide-react';
import L from 'leaflet';

interface DrawingToolbarProps {
  drawPoints: L.LatLng[];
  onFinish: () => void;
  onUndo: () => void;
  onCancel: () => void;
}

/**
 * Toolbar flutuante exibida durante o desenho de polígonos.
 * Mostra a contagem de pontos e ações de finalizar, desfazer e cancelar.
 */
export function DrawingToolbar({ drawPoints, onFinish, onUndo, onCancel }: DrawingToolbarProps) {
  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-green-100 flex items-center gap-4 z-[1000] animate-in slide-in-from-top-4">
      <div className="flex items-center gap-2 text-green-800 text-sm font-bold">
        <MousePointerClick className="w-4 h-4" />
        <span>{drawPoints.length} pontos</span>
      </div>
      <div className="h-4 w-px bg-gray-300" />
      <div className="flex items-center gap-1">
        <button 
          onClick={onFinish} 
          className="p-1.5 bg-green-700 text-white rounded-full hover:bg-green-800 transition" 
          title="Finalizar"
        >
          <Check className="w-4 h-4" />
        </button>
        <button 
          onClick={onUndo} 
          className="p-1.5 bg-gray-200 text-gray-600 rounded-full hover:bg-gray-300 transition" 
          title="Desfazer"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button 
          onClick={onCancel} 
          className="p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition" 
          title="Cancelar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
