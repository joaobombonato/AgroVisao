import React from 'react';
import { CloudRain } from 'lucide-react';
import { isToday, formatShortDate } from '../../../services/weatherService';
import { type DailyForecast } from '../../../services/multiSourceWeather';

interface WeatherPrecipitationChartProps {
  consensus: DailyForecast[];
  openMeteoDays: DailyForecast[];
  selectedDay: number;
  onSelectDay: (index: number) => void;
}

export const WeatherPrecipitationChart: React.FC<WeatherPrecipitationChartProps> = ({
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
          <CloudRain className="w-4 h-4 text-blue-500" />
          Precipitação Prevista
        </h3>
        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium border border-blue-100 italic">Consenso Médio</span>
      </div>
      <div className="space-y-2">
        {displayDays.slice(0, 7).map((day, i) => {
          const precip = day.precipitation;
          const prob = day.precipProbability;
          const maxPrecip = Math.max(...displayDays.slice(0, 7).map((d: any) => d.precipitation), 1);
          const percentage = (precip / maxPrecip) * 100;
          const today = isToday(day.date);
          const isSelected = selectedDay === i;
          
          return (
            <div 
              key={day.date} 
              className={`flex items-center gap-3 p-1 rounded-lg cursor-pointer transition-all ${
                isSelected ? 'bg-green-50 border border-green-200' : 'hover:bg-gray-50'
              }`}
              onClick={() => onSelectDay(i)}
            >
              <span className={`w-12 text-xs font-medium ${
                isSelected ? 'text-green-600' : today ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {formatShortDate(day.date)}
              </span>
              <div className="flex-1 bg-gray-100 rounded-full h-4 relative overflow-hidden">
                <div 
                  className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                    isSelected 
                      ? 'bg-gradient-to-r from-green-400 to-green-600' 
                      : 'bg-gradient-to-r from-blue-400 to-blue-600'
                  }`}
                  style={{ width: `${Math.max(percentage, precip > 0 ? 5 : 0)}%` }}
                />
              </div>
              <span className="w-20 text-xs text-right">
                <span className="font-bold text-gray-700">{precip.toFixed(1)}mm</span>
                {prob !== undefined && prob > 0 && (
                  <span className="text-blue-500 ml-1">({prob}%)</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
