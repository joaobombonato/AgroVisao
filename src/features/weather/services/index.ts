/**
 * Multi-Source Weather Service - Consolidated Exports
 * 
 * This module fetches weather data from multiple APIs for comparison.
 * Each provider is now in its own file for easier maintenance.
 */

// Re-export types
export type { 
  DailyForecast, 
  MultiSourceWeather 
} from './helpers';

export { CACHE_TTL } from './helpers';

// Re-export individual providers
export { fetchOpenWeatherMap } from './openWeather';
export { fetchYrNo } from './yrNo';
export { fetchWeatherAPI } from './weatherAPI';
export { fetchTomorrow } from './tomorrow';
export { fetchMeteoBlue } from './meteoBlue';

// Import for internal use
import { MultiSourceWeather, CACHE_TTL } from './helpers';
import { fetchOpenWeatherMap } from './openWeather';
import { fetchYrNo } from './yrNo';
import { fetchWeatherAPI } from './weatherAPI';
import { fetchTomorrow } from './tomorrow';
import { fetchMeteoBlue } from './meteoBlue';

/**
 * Fetch weather data from all sources with caching
 */
export async function fetchMultiSourceWeather(lat: number, lng: number): Promise<MultiSourceWeather[]> {
  const cacheKey = `weather_cache_${lat.toFixed(3)}_${lng.toFixed(3)}`;
  
  // 1. Try to load from cache
  try {
    const cachedStr = localStorage.getItem(cacheKey);
    if (cachedStr) {
      const cached = JSON.parse(cachedStr);
      const isExpired = Date.now() - cached.timestamp > CACHE_TTL;
      
      if (!isExpired && cached.data && cached.data.length > 0) {
        console.log(`[Cache] Usando dados climáticos memorizados para ${lat.toFixed(3)}, ${lng.toFixed(3)}`);
        return cached.data;
      }
    }
  } catch (err) {
    console.warn('Falha ao ler cache de clima:', err);
  }

  const providers = [
    { name: 'YR.no', fetch: () => fetchYrNo(lat, lng) },
    { name: 'WeatherAPI', fetch: () => fetchWeatherAPI(lat, lng) },
    { name: 'MeteoBlue', fetch: () => fetchMeteoBlue(lat, lng) },
    { name: 'OpenWeather', fetch: () => fetchOpenWeatherMap(lat, lng) },
    { name: 'Tomorrow.io', fetch: () => fetchTomorrow(lat, lng) }
  ];

  // Try each provider independently
  const results = await Promise.all(
    providers.map(async (p) => {
      try {
        const result = await p.fetch();
        return result;
      } catch (err) {
        console.warn(`Weather provider ${p.name} failed:`, err);
        return null;
      }
    })
  );
  
  const finalData = results.filter((r): r is MultiSourceWeather => r !== null);

  // 2. Save to cache if we have results
  if (finalData.length > 0) {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        timestamp: Date.now(),
        data: finalData
      }));
    } catch (err) {
      console.warn('Falha ao salvar cache de clima:', err);
    }
  }
  
  return finalData;
}

// Export sources info for the attribution table
export const WEATHER_SOURCES = [
  { name: 'Open-Meteo', icon: '🌐', logo: '/assets/weather-logos/OpenMeteo.png', origin: 'Alemanha/UE', type: 'Gratuita', url: 'open-meteo.com', days: 16 },
  { name: 'YR.no', icon: '🇳🇴', logo: '/assets/weather-logos/YR.png', origin: 'Noruega', type: 'Gratuita', url: 'yr.no', days: 10 },
  { name: 'MeteoBlue', icon: '🔵', logo: '/assets/weather-logos/MeteoBlue.png', origin: 'Suíça', type: 'API Key', url: 'meteoblue.com', days: 7 },
  { name: 'Tomorrow.io', icon: '⏰', logo: '/assets/weather-logos/Tomorrow.png', origin: 'EUA', type: 'API Key', url: 'tomorrow.io', days: 6 },
  { name: 'OpenWeather', icon: '🌤️', logo: '/assets/weather-logos/OpenWeatherMap.png', origin: 'EUA', type: 'API Key', url: 'openweathermap.org', days: 6 },
  { name: 'WeatherAPI', icon: '🌍', logo: '/assets/weather-logos/WeatherAPI.png', origin: 'Reino Unido', type: 'API Key', url: 'weatherapi.com', days: 3 }
];
