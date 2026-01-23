import React, { useEffect, useState } from 'react';
import { CloudRain, Thermometer, Wind, Loader2, ArrowRight, Droplets } from 'lucide-react';
import { fetchWeatherForecast, getWeatherInfo, isToday, type WeatherData } from '../../services/weatherService';
import { fetchMultiSourceWeather, type DailyForecast } from '../../services/multiSourceWeather';

interface WeatherMiniWidgetProps {
  latitude: number;
  longitude: number;
  farmName?: string;
  onClick: () => void;
}

export default function WeatherMiniWidget({ latitude, longitude, farmName, onClick }: WeatherMiniWidgetProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const basic = await fetchWeatherForecast(latitude, longitude);
        if (!basic) return;

        // Try to get multi-source for today's consensus if possible, but keep it fast
        const multi = await fetchMultiSourceWeather(latitude, longitude);
        
        // Simple consensus for today (Day 0)
        const sources = multi.filter(s => s.daily && s.daily[0]);
        let today: any = {
            tempMin: basic.daily.temperature_2m_min[0],
            tempMax: basic.daily.temperature_2m_max[0],
            precipitation: basic.daily.precipitation_sum[0],
            windSpeed: basic.daily.windspeed_10m_max[0],
            condition: getWeatherInfo(basic.daily.weathercode[0]).description,
            icon: getWeatherInfo(basic.daily.weathercode[0]).icon,
            precipProbability: basic.daily.precipitation_probability_max[0]
        };

        if (sources.length > 0) {
            // Filter only sources that provide FULL 24h data for today's consensus
            const fullDaySources = sources.filter(s => !s.daily[0].isPartial);
            
            if (fullDaySources.length > 0) {
                const allToday = fullDaySources.map(s => s.daily[0]);
                const tempsMin = [today.tempMin, ...allToday.map(f => f.tempMin)].filter(v => v !== undefined);
                const tempsMax = [today.tempMax, ...allToday.map(f => f.tempMax)].filter(v => v !== undefined);
                const precips = [today.precipitation, ...allToday.map(f => f.precipitation)].filter(v => v !== undefined);
                const winds = [today.windSpeed, ...allToday.map(f => f.windSpeed)].filter(v => (v !== undefined && v !== null));
                
                today.tempMin = Math.min(...tempsMin);
                today.tempMax = Math.max(...tempsMax);
                today.precipitation = precips.reduce((a, b) => a + b, 0) / (precips.length);
                if (winds.length > 0) {
                    today.windSpeed = winds.reduce((a, b) => a + b, 0) / (winds.length);
                }
            }
        }

        setData(today);
      } catch (err) {
        console.error('Error loading mini weather:', err);
      } finally {
        setLoading(false);
      }
    };

    if (latitude && longitude) {
      loadSummary();
    }
  }, [latitude, longitude]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-center h-24">
        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div 
      onClick={onClick}
      className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg cursor-pointer hover:shadow-xl transition-all active:scale-95 group"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{data.icon}</span>
          <div>
            <h3 className="text-sm font-bold leading-tight">
                Clima Dia Todo {farmName ? `· ${farmName}` : ''}
            </h3>
            <p className="text-[10px] text-blue-100 uppercase font-medium">Consenso Multi-Fonte</p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-blue-200 group-hover:translate-x-1 transition-transform" />
      </div>

      <div className="grid grid-cols-4 gap-1 sm:gap-2">
        <div className="flex flex-col">
          <span className="text-[9px] text-blue-100 flex items-center gap-0.5 uppercase font-medium">
            <Thermometer className="w-2.5 h-2.5" /> Temp
          </span>
          <span className="text-sm font-semibold whitespace-nowrap">{Math.round(data.tempMin)}°/{Math.round(data.tempMax)}°</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] text-blue-100 flex items-center gap-0.5 uppercase font-medium">
            <Wind className="w-2.5 h-2.5" /> Vento
          </span>
          <span className="text-sm font-semibold whitespace-nowrap">{Math.round(data.windSpeed || 0)} <small className="text-[10px] font-normal">km/h</small></span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] text-blue-100 flex items-center gap-0.5 uppercase font-medium">
            <CloudRain className="w-2.5 h-2.5" /> Chuva
          </span>
          <span className="text-sm font-semibold whitespace-nowrap">{data.precipitation.toFixed(1)}<small className="text-[10px] font-normal">mm</small></span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] text-blue-100 flex items-center gap-0.5 uppercase font-medium">
             <Droplets className="w-2.5 h-2.5" /> Prob.
          </span>
          <span className="text-sm font-semibold whitespace-nowrap">{data.precipProbability}%</span>
        </div>
      </div>
      
      <div className="mt-3 pt-2 border-t border-white/20 text-[11px] flex justify-between items-center italic text-blue-50">
        <span className="font-normal opacity-90">{data.condition}</span>
        <span className="font-semibold underline uppercase tracking-tight">Ver Detalhes</span>
      </div>
    </div>
  );
}
