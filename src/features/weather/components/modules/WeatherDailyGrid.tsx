import React from 'react';
import { Sun, ChevronRight, Wind } from 'lucide-react';
import { 
  type WeatherData, 
  getWeatherInfo, 
  formatWeekday, 
  formatShortDate, 
  isToday 
} from '../../services/weatherService';
import { type DailyForecast } from '../../services/multiSourceWeather';

interface WeatherDailyGridProps {
  weather: WeatherData;
  consensus: DailyForecast[];
  selectedDay: number;
  onSelectDay: (index: number) => void;
  onShow14Days: () => void;
}

export const WeatherDailyGrid: React.FC<WeatherDailyGridProps> = ({
  weather,
  consensus,
  selectedDay,
  onSelectDay,
  onShow14Days,
}) => {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-col">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <Sun className="w-4 h-4 text-yellow-500" />
            Próximos 7 Dias
          </h3>
          <span className="text-[10px] text-blue-500 font-medium ml-6">Consenso Multi-Fonte (Média)</span>
        </div>
        <button 
          onClick={onShow14Days}
          className="text-xs text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1"
        >
          Ver 14 dias <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {consensus.length > 0 ? consensus.slice(0, 7).map((day, i) => {
          const today = isToday(day.date);
          // Use averages for the card display
          const dayAvgMax = (day as any).avgTempMax ?? day.tempMax;
          
          return (
            <div 
              key={day.date} 
              className={`text-center p-1.5 rounded-lg cursor-pointer transition-all ${
                selectedDay === i 
                  ? 'bg-green-100 border-2 border-green-500 scale-105' 
                  : today 
                    ? 'bg-blue-50 border border-blue-200' 
                    : 'hover:bg-gray-50'
              }`}
              onClick={() => onSelectDay(i)}
            >
              <div className={`text-[10px] font-medium ${
                selectedDay === i ? 'text-green-700' : today ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {today ? 'Hoje' : formatWeekday(day.date)}
              </div>
              <div className={`text-[9px] ${
                selectedDay === i ? 'text-green-600' : today ? 'text-blue-500' : 'text-gray-400'
              }`}>
                {formatShortDate(day.date)}
              </div>
              <div className="text-xl my-0.5">{day.icon}</div>
              <div className="text-xs font-bold text-gray-800">
                {Math.round(dayAvgMax)}°
              </div>
              <div className="text-[9px] text-gray-400 flex items-center justify-center gap-0.5 mt-0.5">
                <Wind className="w-2.5 h-2.5" />
                {Math.round(day.windSpeed)}
              </div>
            </div>
          );
        }) : weather.daily.time.slice(0, 7).map((date, i) => {
          const info = getWeatherInfo(weather.daily.weathercode[i]);
          const today = isToday(date);
          return (
            <div 
              key={date} 
              className={`text-center p-1.5 rounded-lg cursor-pointer transition-all ${
                selectedDay === i 
                  ? 'bg-green-100 border-2 border-green-500 scale-105' 
                  : today 
                    ? 'bg-blue-50 border border-blue-200' 
                    : 'hover:bg-gray-50'
              }`}
              onClick={() => onSelectDay(i)}
            >
              <div className={`text-[10px] font-medium ${
                selectedDay === i ? 'text-green-700' : today ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {today ? 'Hoje' : formatWeekday(date)}
              </div>
              <div className={`text-[9px] ${
                selectedDay === i ? 'text-green-600' : today ? 'text-blue-500' : 'text-gray-400'
              }`}>
                {formatShortDate(date)}
              </div>
              <div className="text-xl my-0.5">{info.icon}</div>
              <div className="text-xs font-bold text-gray-800">
                {Math.round(weather.daily.temperature_2m_max[i])}°
              </div>
              <div className="text-[9px] text-gray-400 flex items-center justify-center gap-0.5 mt-0.5">
                <Wind className="w-2.5 h-2.5" />
                {Math.round(weather.daily.windspeed_10m_max[i])}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
