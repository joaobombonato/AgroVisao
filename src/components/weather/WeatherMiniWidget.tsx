import React, { useEffect, useState } from 'react';
import { CloudRain, Thermometer, Wind, Loader2, ArrowRight, Droplets, Waves, Sprout, AlertTriangle } from 'lucide-react';
import { fetchWeatherForecast, getWeatherInfo, type WeatherData } from '../../services/weatherService';
import { fetchMultiSourceWeather } from '../../services/multiSourceWeather';
import { fetchAgronomicData, type AgronomicResult } from '../../services/agronomicService';

interface WeatherMiniWidgetProps {
  latitude: number;
  longitude: number;
  farmName?: string;
  onClick: () => void;
}

export default function WeatherMiniWidget({ latitude, longitude, farmName, onClick }: WeatherMiniWidgetProps) {
  const [data, setData] = useState<any>(null);
  const [agronomic, setAgronomic] = useState<AgronomicResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Load weather and agronomic data in parallel
        const [basic, agro] = await Promise.all([
          fetchWeatherForecast(latitude, longitude),
          fetchAgronomicData(latitude, longitude)
        ]);

        if (!basic) return;
        setAgronomic(agro);

        // Consensus logic for weather
        const multi = await fetchMultiSourceWeather(latitude, longitude);
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
            const fullDaySources = sources.filter(s => !s.daily[0].isPartial);
            if (fullDaySources.length > 0) {
                const allToday = fullDaySources.map(s => s.daily[0]);
                today.tempMin = Math.min(...allToday.map(f => f.tempMin || today.tempMin));
                today.tempMax = Math.max(...allToday.map(f => f.tempMax || today.tempMax));
                today.precipitation = allToday.reduce((a, b) => a + (b.precipitation || 0), 0) / (allToday.length);
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
      loadData();
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

  const vpdStress = agronomic ? agronomic.current.vpd > 1.5 : false;

  return (
    <div 
      onClick={onClick}
      className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-4 text-white shadow-lg cursor-pointer hover:shadow-xl transition-all active:scale-95 group relative overflow-hidden"
    >
      {/* Decorative background intensity based on stress */}
      {vpdStress && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500 opacity-10 blur-3xl -mr-10 -mt-10 animate-pulse" />
      )}

      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl drop-shadow-md">{data.icon}</span>
          <div>
            <h3 className="text-sm font-black leading-tight tracking-tight uppercase">
                {farmName || 'Fazenda AgroVisão'}
            </h3>
            <p className="text-[10px] text-blue-100 uppercase font-bold tracking-widest opacity-80">Painel Operacional 24h</p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-blue-200 group-hover:translate-x-1 transition-transform" />
      </div>

      <div className="space-y-3">
        {/* Weather Grid */}
        <div className="grid grid-cols-4 gap-2">
          <div className="flex flex-col">
            <span className="text-[8px] text-blue-100 flex items-center gap-0.5 uppercase font-black tracking-tighter">
              <Thermometer className="w-2 h-2 text-red-300" /> Temp
            </span>
            <span className="text-xs font-bold whitespace-nowrap">{Math.round(data.tempMin)}°/{Math.round(data.tempMax)}°</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] text-blue-100 flex items-center gap-0.5 uppercase font-black tracking-tighter">
              <CloudRain className="w-2 h-2 text-blue-300" /> Chuva
            </span>
            <span className="text-xs font-bold whitespace-nowrap">{data.precipitation.toFixed(1)}mm</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] text-blue-100 flex items-center gap-0.5 uppercase font-black tracking-tighter">
              <Wind className="w-2 h-2 text-gray-300" /> Vento
            </span>
            <span className="text-xs font-bold whitespace-nowrap">{Math.round(data.windSpeed || 0)}<small className="text-[8px] ml-0.5 opacity-80">km/h</small></span>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] text-blue-100 flex items-center gap-0.5 uppercase font-black tracking-tighter">
               <Droplets className="w-2 h-2 text-blue-200" /> Prob.
            </span>
            <span className="text-xs font-bold whitespace-nowrap">{data.precipProbability}%</span>
          </div>
        </div>

        {/* Agronomic Quick Insights */}
        {agronomic && (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
            <div className="bg-white/10 rounded-lg py-1 px-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <Droplets className="w-3 h-3 text-cyan-300 shrink-0" />
                <span className="text-[8px] font-black uppercase tracking-tighter text-blue-50">Trend 21d</span>
              </div>
              <span className="text-[10px] font-black leading-none">
                {agronomic.periodSummary.finalBalance > 0 ? '+' : ''}{agronomic.periodSummary.finalBalance.toFixed(1)}<small className="text-[8px] ml-0.5">mm</small>
              </span>
            </div>
            <div className={`rounded-lg py-1 px-2 flex items-center justify-between transition-colors ${vpdStress ? 'bg-orange-500/20' : 'bg-green-500/20'}`}>
              <div className="flex items-center gap-1.5 overflow-hidden">
                {vpdStress ? (
                  <AlertTriangle className="w-3 h-3 text-orange-400 shrink-0" />
                ) : (
                  <Sprout className="w-3 h-3 text-green-300 shrink-0" />
                )}
                <span className="text-[8px] font-black uppercase tracking-tighter text-blue-50">Bioclima</span>
              </div>
              <span className="text-[9px] font-black leading-none uppercase">{vpdStress ? 'Atenção' : 'Ideal'}</span>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-3 pt-2 border-t border-white/20 text-[10px] flex justify-between items-center italic text-blue-100/80 font-medium">
        <span className="truncate max-w-[70%]">{data.condition}</span>
        <span className="font-black uppercase tracking-tighter flex items-center gap-0.5">Detalhes <ArrowRight className="w-2.5 h-2.5" /></span>
      </div>
    </div>
  );
}
