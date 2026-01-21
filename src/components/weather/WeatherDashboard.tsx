import React, { useEffect, useState } from 'react';
import { 
  Cloud, 
  Droplets, 
  Wind, 
  Thermometer, 
  Sun,
  CloudRain,
  Loader2,
  RefreshCw,
  MapPin,
  ExternalLink,
  Calendar,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  AlertTriangle,
  Layers,
  Info
} from 'lucide-react';
import { 
  fetchWeatherForecast, 
  getWeatherInfo, 
  getWindDirection,
  formatWeekday,
  formatShortDate,
  isToday,
  type WeatherData 
} from '../../services/weatherService';
import { fetchMultiSourceWeather, WEATHER_SOURCES, type MultiSourceWeather, type DailyForecast } from '../../services/multiSourceWeather';

interface WeatherDashboardProps {
  latitude: number;
  longitude: number;
  farmName?: string;
}

// Helper: Format number with Brazilian comma
const formatBR = (num: number, decimals: number = 1): string => {
  return num.toFixed(decimals).replace('.', ',');
};

export default function WeatherDashboard({ latitude, longitude, farmName }: WeatherDashboardProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [show14Days, setShow14Days] = useState(false);
  const [multiSource, setMultiSource] = useState<MultiSourceWeather[]>([]);
  const [loadingMulti, setLoadingMulti] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [consensus, setConsensus] = useState<DailyForecast[]>([]);
  const [openMeteoDays, setOpenMeteoDays] = useState<DailyForecast[]>([]);

  const loadWeather = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchWeatherForecast(latitude, longitude);
      
      if (data) {
        setWeather(data);
        
        // Load multi-source comparison
        setLoadingMulti(true);
        const multiData = await fetchMultiSourceWeather(latitude, longitude);
        
        // Add Open-Meteo as primary source
        const openMeteoDays: DailyForecast[] = data.daily.time.slice(0, 14).map((date, i) => ({
          date,
          precipitation: data.daily.precipitation_sum[i],
          precipProbability: data.daily.precipitation_probability_max[i],
          tempMin: data.daily.temperature_2m_min[i],
          tempMax: data.daily.temperature_2m_max[i],
          humidity: i === 0 ? data.current.humidity : 0,
          windSpeed: data.daily.windspeed_10m_max[i],
          windDir: getWindDirection(data.daily.winddirection_10m_dominant[i]),
          condition: getWeatherInfo(data.daily.weathercode[i]).description,
          icon: getWeatherInfo(data.daily.weathercode[i]).icon
        }));
        
        setOpenMeteoDays(openMeteoDays);
        
        const openMeteoSource: MultiSourceWeather = {
          source: 'openmeteo',
          sourceName: 'Open-Meteo',
          icon: '🌐',
          logo: '/assets/weather-logos/OpenMeteo.png',
          origin: 'Alemanha/UE',
          daily: openMeteoDays,
          confidence: 'high'
        };
        
        // Combine and sort by the same order as WEATHER_SOURCES
        const combined = [openMeteoSource, ...multiData];
        const sorted = combined.sort((a, b) => {
          const orderA = WEATHER_SOURCES.findIndex(s => s.name === a.sourceName);
          const orderB = WEATHER_SOURCES.findIndex(s => s.name === b.sourceName);
          return orderA - orderB;
        });
        
        setMultiSource(sorted);
        
        // Calculate Consensus (Daily average/min/max from all sources)
        try {
          const consensusData: DailyForecast[] = comparisonDates.map((date, dayIdx) => {
            const sourcesForDay = sorted.filter(s => s.daily && s.daily[dayIdx]);
            if (sourcesForDay.length === 0) return openMeteoDays[dayIdx];

            const dayForecasts = sourcesForDay.map(s => s.daily[dayIdx]);
            const tempsMin = dayForecasts.map(f => f.tempMin).filter(v => v !== undefined && !isNaN(v));
            const tempsMax = dayForecasts.map(f => f.tempMax).filter(v => v !== undefined && !isNaN(v));
            const precips = dayForecasts.map(f => f.precipitation).filter(v => v !== undefined && !isNaN(v));
            const probs = dayForecasts.map(f => f.precipProbability || 0).filter(v => v !== undefined && !isNaN(v));

            return {
              date,
              precipitation: precips.length > 0 ? precips.reduce((a, b) => a + b, 0) / precips.length : 0,
              precipProbability: probs.length > 0 ? Math.round(probs.reduce((a, b) => a + b, 0) / probs.length) : 0,
              tempMin: tempsMin.length > 0 ? Math.min(...tempsMin) : openMeteoDays[dayIdx].tempMin,
              tempMax: tempsMax.length > 0 ? Math.max(...tempsMax) : openMeteoDays[dayIdx].tempMax,
              avgTempMin: tempsMin.length > 0 ? tempsMin.reduce((a, b) => a + b, 0) / tempsMin.length : openMeteoDays[dayIdx].tempMin,
              avgTempMax: tempsMax.length > 0 ? tempsMax.reduce((a, b) => a + b, 0) / tempsMax.length : openMeteoDays[dayIdx].tempMax,
              humidity: dayForecasts[0]?.humidity || 0,
              windSpeed: dayForecasts.reduce((a, b) => a + (b.windSpeed || 0), 0) / dayForecasts.length,
              windDir: dayForecasts[0]?.windDir || '',
              condition: dayForecasts[0]?.condition || '',
              icon: dayForecasts[0]?.icon || ''
            } as DailyForecast & { avgTempMin: number, avgTempMax: number };
          });
          setConsensus(consensusData);
        } catch (consensusErr) {
          console.error('Error calculating consensus:', consensusErr);
          setConsensus(openMeteoDays); // Fallback to primary source
        }
        setLoadingMulti(false);
      } else {
        setError('Não foi possível carregar os dados meteorológicos');
      }
    } catch (err) {
      setError('Erro ao buscar previsão do tempo');
    }
    
    setLoading(false);
  };

  useEffect(() => {
    if (latitude && longitude) {
      loadWeather();
    }
  }, [latitude, longitude]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-gray-500">Carregando previsão do tempo...</p>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="bg-white rounded-2xl p-8 flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <Cloud className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">{error || 'Dados não disponíveis'}</p>
          <button 
            onClick={loadWeather}
            className="text-blue-500 hover:text-blue-600 font-medium flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" /> Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const currentInfo = getWeatherInfo(weather.current.weathercode);
  const comparisonDates = weather.daily.time.slice(0, 14);

  return (
    <div className="space-y-4 pb-24">
      {/* Header with current conditions */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 text-blue-100 text-sm mb-1">
              <MapPin className="w-4 h-4" />
              {farmName || `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`}
            </div>
            <div className="text-5xl font-light mb-1">
              {Math.round(weather.current.temperature)}°C
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{currentInfo.icon}</span>
              <span className="text-blue-100">{currentInfo.description}</span>
            </div>
          </div>
          <button 
            onClick={loadWeather}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Atualizar"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Current metrics */}
        <div className="grid grid-cols-4 gap-2 pt-4 border-t border-white/20">
          <div className="text-center">
            <Droplets className="w-4 h-4 mx-auto mb-1 text-blue-200" />
            <div className="text-base font-semibold">{weather.current.humidity}%</div>
            <div className="text-[10px] text-blue-200">Umidade</div>
          </div>
          <div className="text-center">
            <Wind className="w-4 h-4 mx-auto mb-1 text-blue-200" />
            <div className="text-base font-semibold">{Math.round(weather.current.windspeed)}</div>
            <div className="text-[10px] text-blue-200">km/h {getWindDirection(weather.current.winddirection)}</div>
          </div>
          <div className="text-center">
            <CloudRain className="w-4 h-4 mx-auto mb-1 text-blue-200" />
            <div className="text-base font-semibold">{weather.current.precipitation}</div>
            <div className="text-[10px] text-blue-200">mm</div>
          </div>
          <div className="text-center">
            <Thermometer className="w-4 h-4 mx-auto mb-1 text-blue-200" />
            <div className="text-base font-semibold">
              {Math.round(weather.daily.temperature_2m_max[0])}°/{Math.round(weather.daily.temperature_2m_min[0])}°
            </div>
            <div className="text-[10px] text-blue-200">Máx/Mín</div>
          </div>
        </div>
      </div>

      {/* 7-day cards */}
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
            onClick={() => setShow14Days(true)}
            className="text-xs text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1"
          >
            Ver 14 dias <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {consensus.length > 0 ? consensus.slice(0, 7).map((day, i) => {
            const today = isToday(day.date);
            // Use averages for the card display
            const dayAvgMin = (day as any).avgTempMin ?? day.tempMin;
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
                onClick={() => setSelectedDay(i)}
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
                onClick={() => setSelectedDay(i)}
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

      {/* Precipitation forecast */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <CloudRain className="w-4 h-4 text-blue-500" />
            Precipitação Prevista
          </h3>
          <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium border border-blue-100 italic">Consenso Médio</span>
        </div>
        <div className="space-y-2">
          {(consensus.length > 0 ? consensus : openMeteoDays).slice(0, 7).map((day: any, i: number) => {
            const precip = day.precipitation;
            const prob = day.precipProbability;
            const maxPrecip = Math.max(...(consensus.length > 0 ? consensus : openMeteoDays).slice(0, 7).map((d: any) => d.precipitation), 1);
            const percentage = (precip / maxPrecip) * 100;
            const today = isToday(day.date);
            const isSelected = selectedDay === i;
            
            return (
              <div 
                key={day.date} 
                className={`flex items-center gap-3 p-1 rounded-lg cursor-pointer transition-all ${
                  isSelected ? 'bg-green-50 border border-green-200' : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedDay(i)}
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

      {/* Temperature Variation Chart */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-red-500" />
            Variação de Temperatura
          </h3>
          <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium border border-blue-100 italic">Consenso Médio</span>
        </div>
        <div className="space-y-2">
          {(consensus.length > 0 ? consensus : openMeteoDays).slice(0, 7).map((day: any, i: number) => {
            const min = day.tempMin; // Consensus absolute min
            const max = day.tempMax; // Consensus absolute max
            const avgMin = (day as any).avgTempMin ?? min;
            const avgMax = (day as any).avgTempMax ?? max;
            const today = isToday(day.date);
            const isSelected = selectedDay === i;
            
            const globalMin = Math.min(...(consensus.length > 0 ? consensus : openMeteoDays).slice(0, 7).map((d: any) => d.tempMin));
            const globalMax = Math.max(...(consensus.length > 0 ? consensus : openMeteoDays).slice(0, 7).map((d: any) => d.tempMax));
            const range = globalMax - globalMin || 1;
            const leftPos = ((min - globalMin) / range) * 100;
            const width = ((max - min) / range) * 100;
            
            return (
              <div 
                key={day.date} 
                className={`flex items-center gap-3 p-1 rounded-lg cursor-pointer transition-all ${
                  isSelected ? 'bg-green-50 border border-green-200' : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedDay(i)}
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

      {/* Multi-Source Comparison - Light Blue Theme */}
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
            onClick={() => setSelectedDay(Math.max(0, selectedDay - 1))}
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
            onClick={() => setSelectedDay(Math.min(13, selectedDay + 1))}
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
                  const dayData = source.daily[selectedDay];
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
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            Nenhuma fonte adicional disponível
          </p>
        )}
      </div>

      {/* Sources Attribution Table */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border">
        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-500" />
          Fontes de Dados Meteorológicos
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left py-2 px-2 font-semibold text-gray-600">Fonte</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600">Origem</th>
                <th className="text-center py-2 px-2 font-semibold text-gray-600">Dias</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-600">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {WEATHER_SOURCES.map((source, i) => (
                <tr key={source.name} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      {source.logo ? (
                        <img src={source.logo} alt={source.name} className="w-6 h-6 object-contain" />
                      ) : (
                        <span className="text-base">{source.icon}</span>
                      )}
                      <a 
                        href={`https://${source.url}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {source.name}
                      </a>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-gray-600">{source.origin}</td>
                  <td className="py-2 px-2 text-center">
                    <span className="font-bold text-sky-600">{source.days}</span>
                  </td>
                  <td className="py-2 px-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      source.type === 'Gratuita' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {source.type}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-gray-400 mt-2 text-center">
          Dados atualizados em tempo real de múltiplas fontes internacionais
        </p>
      </div>

      {/* 14-day Modal */}
      {show14Days && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShow14Days(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden">
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <h2 className="font-bold">Previsão 14 Dias</h2>
              </div>
              <button onClick={() => setShow14Days(false)} className="p-1 hover:bg-white/20 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-[60vh] p-4">
              <div className="space-y-2">
                {(consensus.length > 0 ? consensus : openMeteoDays).map((day: any, i: number) => {
                  const today = isToday(day.date);
                  const precip = day.precipitation;
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
              Dados baseados no <strong>Consenso Multi-Fonte</strong> (Média das {multiSource.length} fontes disponíveis)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
