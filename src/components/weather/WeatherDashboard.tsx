import React, { useEffect, useState } from 'react';
import { Cloud, Loader2, RefreshCw } from 'lucide-react';
import { 
  fetchWeatherForecast, 
  getWeatherInfo, 
  getWindDirection,
  isToday,
  type WeatherData 
} from '../../services/weatherService';
import { fetchMultiSourceWeather, WEATHER_SOURCES, type MultiSourceWeather, type DailyForecast } from '../../services/multiSourceWeather';
import { fetchAgronomicData, type AgronomicResult } from '../../services/agronomicService';
import { AgronomicIntelligenceCard } from '../agronomic/AgronomicIntelligenceCard';

// Novos módulos
import { WeatherCurrentHeader } from './modules/WeatherCurrentHeader';
import { WeatherDailyGrid } from './modules/WeatherDailyGrid';
import { WeatherPrecipitationChart } from './modules/WeatherPrecipitationChart';
import { WeatherTemperatureChart } from './modules/WeatherTemperatureChart';
import { WeatherSourceComparison } from './modules/WeatherSourceComparison';
import { WeatherSourcesInfo } from './modules/WeatherSourcesInfo';
import { WeatherForecastModal } from './modules/WeatherForecastModal';

interface WeatherDashboardProps {
  latitude: number;
  longitude: number;
  farmName?: string;
}

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
  const [agronomic, setAgronomic] = useState<AgronomicResult | null>(null);
  const [loadingAgro, setLoadingAgro] = useState(false);

  const loadWeather = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load Open-Meteo Agronomic Data
      setLoadingAgro(true);
      fetchAgronomicData(latitude, longitude)
        .then(setAgronomic)
        .catch(err => console.error('Error fetching agronomic data:', err))
        .finally(() => setLoadingAgro(false));

      const data = await fetchWeatherForecast(latitude, longitude);
      
      if (data) {
        setWeather(data);
        const comparisonDates = data.daily.time.slice(0, 14);

        // Load multi-source comparison
        setLoadingMulti(true);
        const multiData = await fetchMultiSourceWeather(latitude, longitude);
        
        // Prepare Open-Meteo source
        const omDays: DailyForecast[] = data.daily.time.slice(0, 14).map((date, i) => ({
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
        setOpenMeteoDays(omDays);

        const openMeteoSource: MultiSourceWeather = {
          source: 'openmeteo',
          sourceName: 'Open-Meteo',
          icon: '🌐',
          logo: '/assets/weather-logos/OpenMeteo.png',
          origin: 'Alemanha/UE',
          daily: omDays,
          confidence: 'high'
        };
        
        const combined = [openMeteoSource, ...multiData];
        const sorted = combined.sort((a, b) => {
          const orderA = WEATHER_SOURCES.findIndex(s => s.name === a.sourceName);
          const orderB = WEATHER_SOURCES.findIndex(s => s.name === b.sourceName);
          return (orderA === -1 ? 99 : orderA) - (orderB === -1 ? 99 : orderB);
        });
        
        setMultiSource(sorted);
        
        // Calculate Consensus
        try {
          const consensusData: DailyForecast[] = comparisonDates.map((date, dayIdx) => {
            const sourcesForDay = sorted.filter(s => {
              if (!s.daily) return false;
              const dayData = s.daily.find(d => d.date === date);
              if (dayIdx === 0 && dayData?.isPartial) return false;
              return !!dayData;
            });

            if (sourcesForDay.length === 0) return omDays[dayIdx];

            const dayForecasts = sourcesForDay.map(s => s.daily.find(d => d.date === date)!).filter(Boolean);
            const tempsMin = dayForecasts.map(f => f.tempMin).filter(v => v !== undefined && v !== null && !isNaN(v));
            const tempsMax = dayForecasts.map(f => f.tempMax).filter(v => v !== undefined && v !== null && !isNaN(v));
            const precips = dayForecasts.map(f => f.precipitation).filter(v => v !== undefined && v !== null && !isNaN(v));
            const probs = dayForecasts.map(f => f.precipProbability || 0).filter(v => v !== undefined && v !== null && !isNaN(v));

            const omDay = omDays[dayIdx];

            return {
              date,
              precipitation: precips.length > 0 ? precips.reduce((a, b) => a + b, 0) / precips.length : omDay.precipitation,
              precipProbability: probs.length > 0 ? Math.round(probs.reduce((a, b) => a + b, 0) / probs.length) : omDay.precipProbability,
              tempMin: tempsMin.length > 0 ? Math.min(...tempsMin) : omDay.tempMin,
              tempMax: tempsMax.length > 0 ? Math.max(...tempsMax) : omDay.tempMax,
              avgTempMin: tempsMin.length > 0 ? tempsMin.reduce((a, b) => a + b, 0) / tempsMin.length : omDay.tempMin,
              avgTempMax: tempsMax.length > 0 ? tempsMax.reduce((a, b) => a + b, 0) / tempsMax.length : omDay.tempMax,
              humidity: dayForecasts[0]?.humidity || omDay.humidity,
              windSpeed: dayForecasts.reduce((a, b) => a + (b.windSpeed || 0), 0) / dayForecasts.length,
              windDir: dayForecasts[0]?.windDir || omDay.windDir,
              condition: dayForecasts[0]?.condition || omDay.condition,
              icon: dayForecasts[0]?.icon || omDay.icon
            } as DailyForecast & { avgTempMin: number, avgTempMax: number };
          });
          setConsensus(consensusData);
        } catch (consensusErr) {
          console.error('Error calculating consensus:', consensusErr);
          setConsensus(omDays);
        }
        
        setLoadingMulti(false);
      } else {
        setError('Não foi possível carregar os dados meteorológicos');
      }
    } catch (err) {
      console.error('Weather fetch error:', err);
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

  const comparisonDates = weather.daily.time.slice(0, 14);

  return (
    <div className="space-y-4 pb-24">
      {/* 1. Header with current conditions */}
      <WeatherCurrentHeader 
        weather={weather}
        latitude={latitude}
        longitude={longitude}
        farmName={farmName}
        onRefresh={loadWeather}
      />

      {/* 2. 7-day cards */}
      <WeatherDailyGrid 
        weather={weather}
        consensus={consensus}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        onShow14Days={() => setShow14Days(true)}
      />

      {/* 3. Agronomic Intelligence Section */}
      <AgronomicIntelligenceCard 
        agronomic={agronomic} 
        loading={loadingAgro} 
        onRetry={loadWeather}
      />

      {/* 4. Precipitation forecast */}
      <WeatherPrecipitationChart 
        consensus={consensus}
        openMeteoDays={openMeteoDays}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
      />

      {/* 5. Temperature Variation Chart */}
      <WeatherTemperatureChart 
        consensus={consensus}
        openMeteoDays={openMeteoDays}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
      />

      {/* 6. Multi-Source Comparison */}
      <WeatherSourceComparison 
        multiSource={multiSource}
        comparisonDates={comparisonDates}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        loadingMulti={loadingMulti}
      />

      {/* 7. Sources Attribution Info */}
      <WeatherSourcesInfo />

      {/* 8. 14-day Detailed Modal */}
      <WeatherForecastModal 
        show={show14Days}
        onClose={() => setShow14Days(false)}
        consensus={consensus}
        openMeteoDays={openMeteoDays}
        multiSourceCount={multiSource.length}
      />
    </div>
  );
}
