import React from 'react';
import { Satellite, BookOpen, AlertTriangle, Droplets } from 'lucide-react';

interface TelemetryCardProps {
  activeTab: 'map' | 'analysis';
}

export const TelemetryCard: React.FC<TelemetryCardProps> = ({ activeTab }) => {
  if (activeTab !== 'analysis') return null;

  return (
    <div className="bg-white p-4 mt-3 rounded-2xl border border-gray-200 shadow-sm space-y-4 animate-in slide-in-from-top-2">
        <div className="flex items-center justify-between pb-3 border-b border-gray-50">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-green-50 rounded-xl">
                    <Satellite className="w-5 h-5 text-green-600" />
                </div>
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Telemetria Orbital</p>
                    <p className="text-sm font-black text-gray-800 tracking-tight">Sentinel-2 L2A | AgroVisão</p>
                </div>
            </div>
            <div className="bg-green-600 text-[9px] font-black px-2.5 py-1 rounded-full text-white uppercase shadow-sm">
                Alta Resolução
            </div>
        </div>

        {/* GUIA TÉCNICO DOS ÍNDICES */}
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-green-700" />
                <h3 className="text-[11px] font-black text-gray-800 uppercase tracking-wider">Dicionário de Índices</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                {/* SAVI */}
                <div className="flex gap-2.5 items-start">
                    <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center shrink-0 border border-orange-100">
                        <span className="text-[8px] font-black text-orange-700">SAVI</span>
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-black text-gray-700 leading-none">Índice de Vegetação Ajustado ao Solo</p>
                        <p className="text-[9px] text-gray-500 font-medium leading-tight italic">Essenciais para monitorar o início do desenvolvimento das culturas, pois extrai o vigor ignorando o solo exposto.</p>
                    </div>
                </div>

                {/* NDVI */}
                <div className="flex gap-2.5 items-start">
                    <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center shrink-0 border border-green-100">
                        <span className="text-[8px] font-black text-green-700">NDVI</span>
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-black text-gray-700 leading-none">Índice de Vegetação por Diferença Normalizada</p>
                        <p className="text-[9px] text-gray-500 font-medium leading-tight italic">Monitoramento geral da saúde da vegetação e biomassa. Excelente para a maior parte do ciclo da cultura. Mede vigor e fotossíntese em tempo real.</p>
                    </div>
                </div>

                {/* EVI */}
                <div className="flex gap-2.5 items-start">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
                        <span className="text-[8px] font-black text-emerald-700">EVI</span>
                    </div>
                    <div className="space-y-0.5">
                          <p className="text-[10px] font-black text-gray-700 leading-none">Índice de Vegetação Aprimorado</p>
                          <p className="text-[9px] text-gray-500 font-medium leading-tight italic">Alta precisão em lavouras densas e fechadas (soja/milho no auge).</p>
                    </div>
                </div>

                {/* NDRE */}
                <div className="flex gap-2.5 items-start">
                    <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
                        <span className="text-[8px] font-black text-red-700">NDRE</span>
                    </div>
                    <div className="space-y-0.5">
                          <p className="text-[10px] font-black text-gray-700 leading-none">Índice de Diferença Normalizada da Borda do Vermelho (Nutrição)</p>
                          <p className="text-[9px] text-gray-500 font-medium leading-tight italic">Ideal em plantações muito densas (como milho/cana no auge). Detecta níveis de Nitrogênio e estresse nutricional.</p>
                    </div>
                </div>

                {/* NDMI */}
                <div className="flex gap-2.5 items-start">
                    <div className="w-7 h-7 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0 border border-cyan-100">
                        <span className="text-[8px] font-black text-cyan-700">NDMI</span>
                    </div>
                    <div className="space-y-0.5">
                          <p className="text-[10px] font-black text-gray-700 leading-none">Índice de Umidade da Vegetação (Sede)</p>
                          <p className="text-[9px] text-gray-500 font-medium leading-tight italic">Mede a umidade na folhagem, identificando o estresse hídrico antes do murchamento. É excelente para manejo de pivô central.</p>
                    </div>
                </div>

                {/* NDWI / ÁGUA */}
                <div className="flex gap-2.5 items-start">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100">
                        <Droplets className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                    <div className="space-y-0.5">
                          <p className="text-[10px] font-black text-gray-700 leading-none">Lagoas (Azul)</p>
                          <p className="text-[9px] text-gray-500 font-medium leading-tight italic">O NDWI (Índice de Diferença Normalizada da Água) identifica água automaticamente para não confundir com falhas na planta.</p>
                    </div>
                </div>
            </div>
        </div>

        <div className="flex items-start gap-2 bg-amber-50 p-3 rounded-xl border border-dashed border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-900 font-bold leading-tight italic">
                Nota Técnica: Áreas obstruídas por nuvens ou sombras naturais podem ocorrer impedindo a leitura espectral. Nestes casos, os índices podem apresentar valores nulos. Recomenda-se validar visualmente através do mapa "REAL".
            </p>
        </div>
    </div>
  );
};
