import React from 'react';
import { Layers, ChevronLeft, ChevronRight, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { isToday, formatWeekday, formatShortDate } from '../../../services/weatherService';
import { type MultiSourceWeather } from '../../../services/multiSourceWeather';
import { formatBR } from '../../../utils/weatherUtils';

interface WeatherSourceComparisonProps {
  multiSource: MultiSourceWeather[];
  comparisonDates: string[];
  selectedDay: number;
  onSelectDay: (index: number) => void;
  loadingMulti: boolean;
}

export const WeatherSourceComparison: React.FC<WeatherSourceComparisonProps> = ({
  multiSource,
  comparisonDates,
  selectedDay,
  onSelectDay,
  loadingMulti,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <div className="bg-gradient-to-r from-sky-400 to-blue-500 text-white p-3">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Layers className="w-4 h-4" />
          Comparativo de Fontes
        </h3>
        <p className="text-xs text-sky-100 mt-0.5">
          {multiSource.length} fontes · 14 dias de comparativo
        </p>
      </div>
      
      {/* Day navigation */}
      <div className="flex items-center justify-between bg-sky-50 border-b p-2">
        <button 
          onClick={() => onSelectDay(Math.max(0, selectedDay - 1))}
          disabled={selectedDay === 0}
          className="p-1 rounded hover:bg-sky-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5 text-sky-700" />
        </button>
        <div className="text-center">
          <span className="font-bold text-sky-800">
            {isToday(comparisonDates[selectedDay]) ? 'Hoje' : formatWeekday(comparisonDates[selectedDay])}
          </span>
          <span className="text-sm text-sky-600 ml-2">
            {formatShortDate(comparisonDates[selectedDay])}
          </span>
        </div>
        <button 
          onClick={() => onSelectDay(Math.min(13, selectedDay + 1))}
          disabled={selectedDay === 13}
          className="p-1 rounded hover:bg-sky-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-5 h-5 text-sky-700" />
        </button>
      </div>
      
      {loadingMulti ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
          <span className="ml-2 text-sm text-gray-500">Carregando fontes...</span>
        </div>
      ) : multiSource.length > 0 ? (
        <div className="p-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-1 font-medium text-gray-500">Fonte</th>
                <th className="text-center py-2 px-1 font-medium text-gray-500">🌧️</th>
                <th className="text-center py-2 px-1 font-medium text-gray-500">🌡️</th>
                <th className="text-center py-2 px-1 font-medium text-gray-500">💨</th>
                <th className="text-center py-2 px-1 font-medium text-gray-500">☁️</th>
                <th className="text-center py-2 px-1 font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody>
              {multiSource.map((source, i) => {
                const targetDate = comparisonDates[selectedDay];
                const dayData = source.daily.find(d => d.date === targetDate);
                const hasData = dayData !== undefined;
                if (!hasData) return null;
                
                const isHighPrecip = dayData.precipitation > 10;
                const isRainy = (dayData.precipProbability || 0) > 60;
                
                return (
                  <tr 
                    key={source.source} 
                    className={`${i % 2 === 0 ? 'bg-gray-50' : ''} ${isRainy ? 'bg-blue-50' : ''}`}
                  >
                    <td className="py-2 px-1">
                      <div className="flex items-center gap-1.5">
                        {source.logo ? (
                          <img src={source.logo} alt={source.sourceName} className="w-5 h-5 object-contain" />
                        ) : (
                          <span className="text-base">{source.icon}</span>
                        )}
                        <span className="font-medium text-gray-700 text-[11px]">{source.sourceName}</span>
                        {dayData.isPartial && <span className="text-amber-500 font-bold ml-0.5" title="Previsão parcial (apenas restante do dia)">*</span>}
                      </div>
                    </td>
                    <td className={`text-center py-2 px-1 ${
                      isHighPrecip ? 'bg-blue-100 rounded' : ''
                    }`}>
                      <div className="font-bold text-gray-700">{formatBR(dayData.precipitation)}</div>
                      {dayData.precipProbability !== undefined && dayData.precipProbability > 0 && (
                        <div className="text-[9px] text-blue-500">{dayData.precipProbability}%</div>
                      )}
                    </td>
                    <td className="text-center py-2 px-1 text-gray-700">
                      <span className="text-blue-500">{Math.round(dayData.tempMin)}°</span>
                      <span className="text-gray-300">/</span>
                      <span className="text-red-500">{Math.round(dayData.tempMax)}°</span>
                    </td>
                    <td className="text-center py-2 px-1 text-gray-600">
                      <div>{Math.round(dayData.windSpeed)}</div>
                      {dayData.windDir && <div className="text-[9px] text-gray-400">{dayData.windDir}</div>}
                    </td>
                    <td className="text-center py-2 px-1">
                      <span title={dayData.condition}>{dayData.icon}</span>
                    </td>
                    <td className="text-center py-2 px-1">
                      {source.confidence === 'high' && <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />}
                      {source.confidence === 'medium' && <AlertTriangle className="w-4 h-4 text-yellow-500 mx-auto" />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
           {/* Legend */}
           <div className="mt-3 pt-2 border-t flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-gray-400">
             <span>🌧️ Chuva (mm)</span>
             <span>🌡️ Temp (°C)</span>
             <span>💨 Vento (km/h)</span>
             <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> Confiável</span>
             {multiSource.some(s => {
               const targetDate = comparisonDates[selectedDay];
               const dayData = s.daily.find(d => d.date === targetDate);
               return dayData?.isPartial;
             }) && (
               <span className="text-amber-600 font-medium ml-auto">* Previsão apenas do período restante (Hoje)</span>
             )}
           </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center py-4">
          Nenhuma fonte adicional disponível
        </p>
      )}
    </div>
  );
};
