import React from 'react';
import { MapPin, RefreshCw, Droplets, Wind, CloudRain, Thermometer } from 'lucide-react';
import { type WeatherData, getWindDirection, getWeatherInfo } from '../../services/weatherService';

interface WeatherCurrentHeaderProps {
  weather: WeatherData;
  latitude: number;
  longitude: number;
  farmName?: string;
  onRefresh: () => void;
}

export const WeatherCurrentHeader: React.FC<WeatherCurrentHeaderProps> = ({
  weather,
  latitude,
  longitude,
  farmName,
  onRefresh,
}) => {
  const currentInfo = getWeatherInfo(weather.current.weathercode);

  return (
    <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden">
      {/* Top bar: Farm and Refresh */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 text-blue-100 text-xs font-normal">
          <MapPin className="w-3.5 h-3.5" />
          {farmName || `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`}
        </div>
        <button 
          onClick={onRefresh}
          className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          title="Atualizar"
        >
          <RefreshCw className="w-4 h-4 opacity-75" />
        </button>
      </div>

      {/* Temperature & Condition Row */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-5xl font-light tracking-tighter leading-none mb-1">
            {Math.round(weather.current.temperature)}°C
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xl">{currentInfo.icon}</span>
            <span className="text-sm font-medium opacity-90">{currentInfo.description}</span>
          </div>
        </div>
        
        {/* Source Box - Legible and clean */}
        <div className="bg-white/95 px-2.5 py-2 rounded-xl text-[8px] font-medium uppercase tracking-wider text-blue-900 flex flex-col items-center justify-center leading-tight shadow-md">
          <div className="flex items-center gap-1 mb-0.5 text-green-600">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            TEMPO REAL
          </div>
          <span className="text-gray-500 lowercase opacity-80 italic text-[7.5px]">exclusivo open-meteo</span>
        </div>
      </div>

      {/* Current metrics */}
      <div className="grid grid-cols-4 gap-0.5 pt-3 border-t border-white/10">
        <div className="text-center">
          <Droplets className="w-4 h-4 mx-auto mb-1 text-blue-200" />
          <div className="text-sm font-medium">{weather.current.humidity}%</div>
          <div className="text-[10px] text-blue-200 uppercase tracking-tighter">Umidade</div>
        </div>
        <div className="text-center">
          <Wind className="w-4 h-4 mx-auto mb-1 text-blue-200" />
          <div className="text-sm font-medium">{Math.round(weather.current.windspeed)}</div>
          <div className="text-[10px] text-blue-200 uppercase tracking-tighter">km/h {getWindDirection(weather.current.winddirection)}</div>
        </div>
        <div className="text-center">
          <CloudRain className="w-4 h-4 mx-auto mb-1 text-blue-200" />
          <div className="text-sm font-medium">{weather.current.precipitation}</div>
          <div className="text-[10px] text-blue-200 uppercase tracking-tighter">mm</div>
        </div>
        <div className="text-center">
          <Thermometer className="w-4 h-4 mx-auto mb-1 text-blue-200" />
          <div className="text-sm font-medium">
            {Math.round(weather.daily.temperature_2m_max[0])}°/{Math.round(weather.daily.temperature_2m_min[0])}°
          </div>
          <div className="text-[10px] text-blue-200 uppercase tracking-tighter">Máx/Mín</div>
        </div>
      </div>
    </div>
  );
};
