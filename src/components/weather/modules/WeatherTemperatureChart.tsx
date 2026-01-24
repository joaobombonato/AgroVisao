import React from 'react';
import { Thermometer } from 'lucide-react';
import { isToday, formatWeekday, formatShortDate } from '../../../services/weatherService';
import { type DailyForecast } from '../../../services/multiSourceWeather';

interface WeatherTemperatureChartProps {
  consensus: DailyForecast[];
  openMeteoDays: DailyForecast[];
  selectedDay: number;
  onSelectDay: (index: number) => void;
}

export const WeatherTemperatureChart: React.FC<WeatherTemperatureChartProps> = ({
  consensus,
  openMeteoDays,
  selectedDay,
  onSelectDay,
}) => {
  const displayDays = consensus.length > 0 ? consensus : openMeteoDays;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <Thermometer className="w-4 h-4 text-red-500" />
          Variação de Temperatura
        </h3>
        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium border border-blue-100 italic">Consenso Médio</span>
      </div>
      <div className="space-y-2">
        {displayDays.slice(0, 7).map((day: any, i: number) => {
          const min = day.tempMin; // Consensus absolute min
          const max = day.tempMax; // Consensus absolute max
          const avgMin = day.avgTempMin ?? min;
          const avgMax = day.avgTempMax ?? max;
          const today = isToday(day.date);
          const isSelected = selectedDay === i;
          
          const globalMin = Math.min(...displayDays.slice(0, 7).map((d: any) => d.tempMin));
          const globalMax = Math.max(...displayDays.slice(0, 7).map((d: any) => d.tempMax));
          const range = globalMax - globalMin || 1;
          const leftPos = ((min - globalMin) / range) * 100;
          const width = ((max - min) / range) * 100;
          
          return (
            <div 
              key={day.date} 
              className={`flex items-center gap-3 p-1 rounded-lg cursor-pointer transition-all ${
                isSelected ? 'bg-green-50 border border-green-200' : 'hover:bg-gray-50'
              }`}
              onClick={() => onSelectDay(i)}
            >
              <div className="w-12">
                <span className={`text-xs font-medium block ${
                  isSelected ? 'text-green-600' : today ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {formatShortDate(day.date)}
                </span>
                <span className="text-[8px] text-gray-400 uppercase">{formatWeekday(day.date).slice(0, 3)}</span>
              </div>
              <div className="flex-1 bg-gray-100 rounded-full h-4 relative overflow-hidden">
                {/* Total variation (consensus) as a subtle shadow */}
                <div 
                  className="absolute inset-y-0 bg-gray-200 rounded-full transition-all"
                  style={{ left: `${leftPos}%`, width: `${Math.max(width, 2)}%` }}
                />
                {/* Average range with colorful gradient */}
                <div 
                  className={`absolute inset-y-0.5 rounded-full transition-all ${
                    isSelected 
                      ? 'bg-gradient-to-r from-green-400 via-yellow-400 to-orange-400' 
                      : 'bg-gradient-to-r from-blue-400 via-yellow-400 to-red-400'
                  }`}
                  style={{ 
                    left: `${((avgMin - globalMin) / range) * 100}%`, 
                    width: `${Math.max(((avgMax - avgMin) / range) * 100, 5)}%` 
                  }}
                />
              </div>
              <span className="w-24 text-xs text-right leading-tight">
                <div className="font-bold">
                  <span className="text-blue-600">{Math.round(avgMin)}°</span>
                  <span className="text-gray-300 mx-1">-</span>
                  <span className="text-red-600">{Math.round(avgMax)}°</span>
                </div>
                <div className="text-[9px] text-gray-400">Var: {Math.round(min)}°/{Math.round(max)}°</div>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
