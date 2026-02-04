/**
 * Multi-Source Weather Service
 * 
 * REFATORADO: Este arquivo agora re-exporta do módulo modularizado.
 * A implementação está dividida em arquivos na pasta ./weather/
 * 
 * - helpers.ts: Tipos e funções utilitárias compartilhadas
 * - openWeather.ts: Provider OpenWeatherMap
 * - yrNo.ts: Provider YR.no (Met.no)
 * - weatherAPI.ts: Provider WeatherAPI.com
 * - tomorrow.ts: Provider Tomorrow.io
 * - meteoBlue.ts: Provider MeteoBlue
 * - index.ts: Consolidação e exportação
 */

export {
  // Types
  type DailyForecast,
  type MultiSourceWeather,
  
  // Individual providers
  fetchOpenWeatherMap,
  fetchYrNo,
  fetchWeatherAPI,
  fetchTomorrow,
  fetchMeteoBlue,
  
  // Main function
  fetchMultiSourceWeather,
  
  // Constants
  WEATHER_SOURCES
} from './index';
