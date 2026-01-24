import React from 'react';
import { Calendar, X, Wind, Droplets } from 'lucide-react';
import { isToday, formatWeekday, formatShortDate } from '../../../services/weatherService';
import { type DailyForecast, type MultiSourceWeather } from '../../../services/multiSourceWeather';

interface WeatherForecastModalProps {
  show: boolean;
  onClose: () => void;
  consensus: DailyForecast[];
  openMeteoDays: DailyForecast[];
  multiSourceCount: number;
}

export const WeatherForecastModal: React.FC<WeatherForecastModalProps> = ({
  show,
  onClose,
  consensus,
  openMeteoDays,
  multiSourceCount,
}) => {
  if (!show) return null;

  const displayDays = consensus.length > 0 ? consensus : openMeteoDays;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden">
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <h2 className="font-bold">Previsão 14 Dias</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="overflow-y-auto max-h-[60vh] p-4">
          <div className="space-y-2">
            {displayDays.map((day: any, i: number) => {
              const today = isToday(day.date);
              const prob = day.precipProbability;
              // For the modal, show consensus range
              const min = (day as any).avgTempMin ?? day.tempMin;
              const max = (day as any).avgTempMax ?? day.tempMax;
              
              return (
                <div 
                  key={day.date} 
                  className={`flex items-center gap-3 p-3 rounded-xl ${today ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}
                >
                  <div className="w-16 text-center">
                    <div className={`text-xs font-bold ${today ? 'text-blue-600' : 'text-gray-700'}`}>
                      {today ? 'Hoje' : formatWeekday(day.date)}
                    </div>
                    <div className="text-[10px] text-gray-500">{formatShortDate(day.date)}</div>
                  </div>
                  <div className="text-2xl">{day.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-red-500 font-bold">{Math.round(max)}°</span>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-400 to-red-400"
                          style={{
                            marginLeft: `${Math.max(0, ((min - 10) / 40) * 100)}%`,
                            width: `${((max - min) / 40) * 100}%`
                          }}
                        />
                      </div>
                      <span className="text-blue-500 font-bold">{Math.round(min)}°</span>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">{day.condition}</div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="flex items-center gap-1 text-gray-500">
                      <Wind className="w-3 h-3" />
                      {Math.round(day.windSpeed)}
                    </div>
                    {(prob ?? 0) > 30 && (
                      <div className="flex items-center gap-1 text-blue-500">
                        <Droplets className="w-3 h-3" />
                        {prob}%
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="sticky bottom-0 bg-gray-50 border-t p-3 text-center text-[10px] text-gray-400">
          Dados baseados no <strong>Consenso Multi-Fonte</strong> (Média das {multiSourceCount} fontes disponíveis)
        </div>
      </div>
    </div>
  );
};
