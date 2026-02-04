import React from 'react';
import { MousePointerClick } from 'lucide-react';

export function MapLegend() {
  return (
    <div className="bg-white/90 backdrop-blur-sm p-4 rounded-3xl shadow-xl border border-white/50 flex flex-col gap-3">
      <h3 className="text-[9px] font-black uppercase text-gray-400 tracking-[0.2em] border-b border-gray-50 pb-2">Legenda</h3>
      <div className="flex flex-col gap-2.5">
        <div className="flex gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1 shrink-0" />
          <p className="text-[9px] text-gray-500 font-bold leading-tight uppercase tracking-tighter"><b>Polígono:</b> Desenho livre para contornos.</p>
        </div>
        <div className="flex gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 shrink-0" />
          <p className="text-[9px] text-gray-500 font-bold leading-tight uppercase tracking-tighter"><b>Nova Parte:</b> Para áreas totalmente separadas, que pertencem ao mesmo talhão.</p>
        </div>
        <div className="flex gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1 shrink-0" />
          <p className="text-[9px] text-gray-500 font-bold leading-tight uppercase tracking-tighter"><b>Mágica:</b> Limpa pontos e melhora o ajuste.</p>
        </div>
        <div className="pt-1 border-t border-gray-50 flex items-center gap-2">
          <MousePointerClick className="w-3 h-3 text-gray-400" />
          <p className="text-[8px] text-gray-400 font-black uppercase leading-none">Clique duplo ou Botão direito:<br/>Apagar ponto</p>
        </div>
      </div>
    </div>
  );
}
