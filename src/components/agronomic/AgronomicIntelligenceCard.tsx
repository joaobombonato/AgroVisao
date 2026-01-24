import React, { useState } from 'react';
import { Sprout, Droplets, RefreshCw, Thermometer, Info, Loader2, Gauge, Waves, BookOpen, AlertTriangle } from 'lucide-react';
import type { AgronomicResult } from '../../services/agronomicService';

interface AgronomicIntelligenceCardProps {
  agronomic: AgronomicResult | null;
  loading?: boolean;
  onRetry?: () => void;
}

const CheckCircle2 = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
);

export const AgronomicIntelligenceCard: React.FC<AgronomicIntelligenceCardProps> = ({
  agronomic,
  loading = false,
  onRetry,
}) => {
  const [showLegend, setShowLegend] = useState(false);

  if (loading && !agronomic) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border p-8 text-center animate-pulse">
        <Loader2 className="w-10 h-10 animate-spin text-green-500 mx-auto mb-4 opacity-20" />
        <p className="text-sm text-gray-500">Sincronizando dados agrometeorológicos...</p>
      </div>
    );
  }

  if (!agronomic) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border p-4 text-center">
        <p className="text-sm text-gray-500 mb-2">Dados agronômicos indisponíveis</p>
        {onRetry && (
          <button onClick={onRetry} className="text-xs text-green-600 hover:underline">Tentar carregar</button>
        )}
      </div>
    );
  }

  const { current, periodSummary, todayIndex = 7 } = agronomic;
  
  // Stress logic (Atmospheric and Soil)
  const isAtmosphericStress = current.vpd > 1.5; // kPa > 1.5 is stressful for most crops
  const isHydricDebt = current.cumulativeBalance < 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden transition-all duration-300">
      {/* Header with status badges */}
      <div className="bg-gradient-to-r from-emerald-600 to-green-700 text-white p-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Sprout className="w-5 h-5 text-emerald-200" />
              Inteligência Agronômica
            </h3>
            <p className="text-[10px] text-emerald-100 mt-0.5 tracking-widest font-bold">
              Análise de Solo e Bioclima
            </p>
          </div>
          <div className="flex gap-2">
            {isAtmosphericStress ? (
              <span className="bg-orange-500/20 text-[8px] font-bold px-3 py-1 rounded-full border border-orange-400/30 flex items-center gap-1">
                <Gauge className="w-2.5 h-2.5" /> ESTRESSE ATM.
              </span>
            ) : (
              <span className="bg-emerald-400/20 text-[8px] font-bold px-3 py-1 rounded-full border border-emerald-300/30 flex items-center gap-1 text-emerald-50">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> UMIDADE PARA PLANTA
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Row 1: Soil Profile (Advanced 4 Levels) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter flex items-center gap-1">
              <Waves className="w-3 h-3 text-emerald-500" /> Perfil Hídrico do Solo
            </h4>
            <span className="text-[9px] text-gray-400">Umidade Volumétrica (m³/m³)</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: '0-1cm', val: current.soilMoisture0to1cm, color: 'emerald' },
              { label: '2-10cm', val: current.soilMoisture3to9cm, color: 'green' },
              { label: '10-40cm', val: current.soilMoisture9to27cm, color: 'blue' },
              { label: '41-80cm', val: current.soilMoisture27to81cm, color: 'indigo' },
            ].map((s) => (
              <div key={s.label} className={`bg-${s.color}-50 border border-${s.color}-100 rounded-xl p-2 text-center shadow-sm`}>
                <div className={`text-[8px] font-black text-${s.color}-700 uppercase mb-1`}>{s.label}</div>
                <div className={`text-sm font-black text-${s.color}-900`}>{s.val.toFixed(2)}</div>
                <div className={`w-full bg-${s.color}-200 h-1.5 rounded-full mt-1.5 overflow-hidden`}>
                  <div 
                    className={`bg-${s.color}-500 h-full transition-all duration-1000`} 
                    style={{ width: `${Math.min(s.val * 200, 100)}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Row 2: Atmospheric & Bio Metrics */}
        <div className="grid grid-cols-3 gap-3">
          {/* VPD - Atmospheric Stress */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-1.5 text-gray-500 mb-1">
              <Gauge className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase">Déficit VPD</span>
            </div>
            <div className={`text-xl font-black ${isAtmosphericStress ? 'text-orange-600' : 'text-gray-900'}`}>
              {current.vpd.toFixed(2)}<small className="text-[10px] font-normal ml-0.5">kPa</small>
            </div>
            <div className="text-[8px] text-gray-400 mt-1 leading-tight font-medium">
              {isAtmosphericStress ? 'Planta fechando estômatos' : 'Transpiração ideal'}
            </div>
          </div>

          {/* ET0 */}
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-1.5 text-orange-700 mb-1">
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="text-[9px] font-black uppercase tracking-tighter">Evaporação (ET0)</span>
            </div>
            <div className="text-xl font-black text-orange-900 font-mono">
              {current.evapotranspiration.toFixed(1)}<small className="text-xs font-normal ml-0.5 tracking-normal">mm</small>
            </div>
            <div className="text-[8px] text-orange-600 font-medium mt-1">Perda diária estimada</div>
          </div>

          {/* GDD */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-1.5 text-emerald-700 mb-1">
              <Thermometer className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase tracking-tighter">GDD (Ciclo)</span>
            </div>
            <div className="text-xl font-black text-emerald-900 font-mono">
              {Math.round(current.accumulatedGdd)}
            </div>
            <div className="text-[8px] text-emerald-600 font-medium mt-1">Acúmulo Biológico</div>
          </div>
        </div>

        {/* Row 3: Cumulative Water Balance */}
        <div className={`rounded-xl p-3 border shadow-sm transition-colors ${isHydricDebt ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-tighter flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5" /> Tendência Hídrica (Histórico + 14 dias)
            </h4>
            <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg bg-white/50 border ${isHydricDebt ? 'text-amber-700 border-amber-200' : 'text-blue-700 border-blue-200'}`}>
              {periodSummary.finalBalance > 0 ? '+' : ''}{periodSummary.finalBalance.toFixed(1)} mm
            </span>
          </div>
          
          <div className="flex gap-1.5 h-10 px-1 items-end">
            {agronomic.daily.map((d, idx) => {
              const balance = d.waterBalance;
              const maxAbsBalance = Math.max(...agronomic.daily.map(day => Math.abs(day.waterBalance)), 1);
              const height = (Math.abs(balance) / maxAbsBalance) * 100;
              const isToday = idx === todayIndex;
              const isPast = idx < todayIndex;
              
              return (
                <div key={idx} className={`flex-1 flex flex-col justify-end group relative h-full ${isToday ? 'border-x border-gray-300 px-0.5' : ''}`}>
                  <div 
                    className={`w-full rounded-sm transition-all hover:opacity-80 duration-500 ${balance >= 0 ? 'bg-cyan-500' : 'bg-amber-500'} ${isPast ? 'opacity-30' : ''} ${isToday ? 'ring-2 ring-offset-1 ring-emerald-500 scale-x-125 z-10' : ''}`}
                    style={{ height: `${Math.max(height, 8)}%` }}
                  />
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-[8px] py-1 px-2 rounded whitespace-nowrap z-50 shadow-xl border border-gray-700">
                    {new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}: {balance > 0 ? '+' : ''}{balance.toFixed(1)} mm
                    {isToday ? ' (Hoje)' : isPast ? ' (Histórico)' : ' (Previsão)'}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-2.5 flex items-center justify-between text-[9px] text-gray-500 font-bold">
             <div className="flex items-center gap-2 italic font-medium">
               <Info className="w-3 h-3 shrink-0 text-gray-400" />
               <span>{isHydricDebt ? 'Carga hídrica em declínio.' : 'Solo com boa carga hídrica acumulada.'}</span>
             </div>
             <div className="flex gap-3">
                <span className="flex items-center gap-1 opacity-50 uppercase tracking-tighter"><div className="w-2 h-2 bg-gray-300 rounded-px" /> Histórico</span>
                <span className="flex items-center gap-1 uppercase tracking-tighter"><div className="w-2 h-2 bg-cyan-500 rounded-px" /> Saldo Positivo</span>
                <span className="flex items-center gap-1 uppercase tracking-tighter"><div className="w-2 h-2 bg-amber-500 rounded-px" /> Saldo Negativo</span>
             </div>
          </div>
        </div>

        {/* Action Button & Info Text */}
        <div className="pt-2 flex flex-col items-center gap-3">
          <button 
            onClick={() => setShowLegend(!showLegend)}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black rounded-xl shadow-lg shadow-emerald-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-widest border-b-4 border-emerald-800"
          >
            <BookOpen className="w-4 h-4" />
            {showLegend ? 'Ocultar Guia Técnico' : 'Abrir Guia Técnico e Dicionário'}
          </button>
          
          <div className="flex items-center gap-2 px-2 text-[10px] text-gray-400 font-medium text-center italic">
            <span>Estes dados ajudam a identificar o estresse hídrico e a planejar a janela ideal para plantio ou colheita.</span>
          </div>
        </div>

        {/* DICIONÁRIO TÉCNICO (Expandable) */}
        {showLegend && (
          <div className="pt-4 border-t border-gray-100 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-700" />
                <h3 className="text-[11px] font-black text-gray-800 uppercase tracking-widest leading-none">Dicionário Agronômico</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Perfil de Solo */}
                <div className="space-y-2 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                   <p className="text-[10px] font-black text-emerald-800 uppercase flex items-center gap-1.5">
                     <Waves className="w-3 h-3" /> Perfil de Solo (Grãos)
                   </p>
                   <ul className="space-y-1.5 text-[9px] text-gray-600 font-medium">
                     <li><strong className="text-emerald-700">0-1cm (Superficial):</strong> Status para germinação e emergência (crucial na semeadura).</li>
                     <li><strong className="text-green-700">2-10cm (Arranque):</strong> Camada de arranque inicial e raízes secundárias.</li>
                     <li><strong className="text-blue-700">10-40cm (Zona Radicular Ativa):</strong> Onde a mágica acontece. A planta busca o máximo de água para produzir.</li>
                     <li><strong className="text-indigo-700">41-80cm (Reserva):</strong> Estratégica. Indica resistência a veranicos prolongados.</li>
                   </ul>
                </div>

                {/* Bioclima */}
                <div className="space-y-2 bg-orange-50/50 p-3 rounded-xl border border-orange-100">
                   <p className="text-[10px] font-black text-orange-800 uppercase flex items-center gap-1.5">
                     <Gauge className="w-3 h-3" /> Inteligência Bio-Climática
                   </p>
                   <ul className="space-y-2 text-[9px] text-gray-600 font-medium">
                     <li>
                        <strong className="text-orange-700">VPD (Déficit de Pressão):</strong> Monitor de estresse. Se &gt; 1.5 kPa, o ar muito seco "rouba" água rápido demais e a planta pode estar fechando estômatos, travando o crescimento para se proteger, mesmo com água no solo.  
                     </li>
                     <li>
                        <strong className="text-emerald-700">GDD (Graus-Dia):</strong> Fórmula ((Tmax+Tmin)/2)-10°C. Acumula energia biológica para prever o avanço das fases da safra e previsão de colheita.
                     </li>
                     <li>
                        <strong className="text-blue-700">Balanço Hídrico:</strong> Saldo entre Chuva Acumulada e Evaporação Total. O gráfico integra o **passado recente (7 dias)** e o futuro, indicando se o solo está ganhando ou perdendo água.
                     </li>
                   </ul>
                </div>
            </div>

            <div className="flex items-start gap-2 bg-blue-50 p-3 rounded-xl border border-dashed border-blue-200">
                <AlertTriangle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-blue-900 font-bold leading-tight italic">
                    Nota: Os cálculos utilizam a base térmica de 10°C e a equação FAO-56 (Penman-Monteith) para Estimativa de Evaporação. Estes dados são ferramentas de apoio e não substituem o monitoramento técnico presencial.
                </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
