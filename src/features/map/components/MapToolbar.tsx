import React from 'react';
import { MousePointer2, Circle as CircleIcon, Sparkles, Wand2 } from 'lucide-react';

interface MapToolbarProps {
  drawMode: 'poly' | 'circle';
  setDrawMode: (mode: 'poly' | 'circle') => void;
  canAddPart: boolean;
  onAddPart: () => void;
  canSimplify: boolean;
  onSimplify: () => void;
  onResetCircle: () => void;
}

export function MapToolbar({
  drawMode,
  setDrawMode,
  canAddPart,
  onAddPart,
  canSimplify,
  onSimplify,
  onResetCircle
}: MapToolbarProps) {
  return (
    <div className="bg-white/95 backdrop-blur-md p-1.5 rounded-2xl shadow-xl border border-gray-100 flex flex-col gap-1">
      <button 
        onClick={() => setDrawMode('poly')}
        className={`p-3 rounded-xl flex items-center gap-3 transition-all ${drawMode === 'poly' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
      >
        <MousePointer2 className="w-5 h-5" />
        <span className="text-[10px] font-black uppercase tracking-widest">Polígono</span>
      </button>
      
      <button 
        onClick={() => {
          setDrawMode('circle');
          onResetCircle();
        }}
        className={`p-3 rounded-xl flex items-center gap-3 transition-all ${drawMode === 'circle' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
      >
        <CircleIcon className="w-5 h-5" />
        <span className="text-[10px] font-black uppercase tracking-widest">Pivô (Círculo)</span>
      </button>
      
      {canAddPart && (
        <button 
          onClick={onAddPart}
          className="p-3 rounded-xl flex items-center gap-3 text-blue-600 hover:bg-blue-50 transition-all border-t border-gray-100"
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-widest text-left leading-tight">Nova Parte</span>
        </button>
      )}

      {canSimplify && (
        <button 
          onClick={onSimplify}
          className="p-3 rounded-xl flex items-center gap-3 text-amber-600 hover:bg-amber-50 transition-all border-t border-gray-100"
        >
          <Wand2 className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-widest">Mágica</span>
        </button>
      )}
    </div>
  );
}
