import React from 'react';
import { Maximize2, Check } from 'lucide-react';

interface StatsPanelProps {
  areaHectares: number;
  onClear: () => void;
  onSave: () => void;
}

export function StatsPanel({ areaHectares, onClear, onSave }: StatsPanelProps) {
  return (
    <div className="absolute bottom-6 left-6 right-6 z-10">
      <div className="bg-white/95 backdrop-blur-md p-5 rounded-[2rem] shadow-2xl border border-white/50 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-green-600 w-12 h-12 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg shadow-green-100">
            <span className="text-[10px] font-black uppercase opacity-80 leading-none">HA</span>
            <Maximize2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">Área Calculada</p>
            <p className="text-2xl font-black text-gray-800 tracking-tighter">
              {(areaHectares || 0).toFixed(2)} <span className="text-sm text-gray-400 font-bold ml-1">HECTARES</span>
            </p>
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={onClear}
            className="flex-1 px-6 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold text-sm tracking-tight hover:bg-gray-200 transition-all active:scale-95"
          >
            Limpar
          </button>
          <button 
            onClick={onSave}
            className="flex-[2] px-8 py-4 bg-green-600 text-white rounded-2xl font-black text-sm tracking-tighter shadow-xl shadow-green-200 hover:bg-green-700 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" /> CONFIRMAR ÁREA
          </button>
        </div>
      </div>
    </div>
  );
}
