/**
 * WeatherAPI.com Provider
 */
import { 
  DailyForecast, 
  MultiSourceWeather, 
  WEATHER_API_KEYS, 
  convertWindDir, 
  fetchWithTimeout 
} from './helpers';

// Helper: WeatherAPI condition code to emoji
function getConditionEmoji(code: number): string {
  if ([1000].includes(code)) return '☀️';
  if ([1003].includes(code)) return '⛅';
  if ([1006, 1009].includes(code)) return '☁️';
  if ([1030, 1135, 1147].includes(code)) return '🌫️';
  if ([1063, 1180, 1183, 1186, 1189, 1192, 1195, 1240, 1243, 1246].includes(code)) return '🌧️';
  if ([1087, 1273, 1276, 1279, 1282].includes(code)) return '⛈️';
  if ([1066, 1114, 1210, 1213, 1216, 1219, 1222, 1225].includes(code)) return '❄️';
  return '🌤️';
}

export async function fetchWeatherAPI(lat: number, lng: number): Promise<MultiSourceWeather | null> {
  try {
    const response = await fetchWithTimeout(
      `https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEYS.WEATHERAPI}&q=${lat},${lng}&days=14&lang=pt`,
      {},
      7000
    );
    
    if (!response.ok) {
      if (response.status === 429) console.warn('WeatherAPI: Rate Limit reached');
      return null;
    }
    const data = await response.json();
    
    if (!data.forecast?.forecastday) return null;

    const daily: DailyForecast[] = data.forecast.forecastday.map((day: any) => {
      const middayHour = day.hour?.[12] || day.hour?.[0];
      const windDir = middayHour?.wind_dir || '';
      const windDirPt = convertWindDir(windDir);
      
      return {
        date: day.date,
        precipitation: day.day.totalprecip_mm,
        precipProbability: day.day.daily_chance_of_rain,
        tempMin: day.day.mintemp_c,
        tempMax: day.day.maxtemp_c,
        humidity: day.day.avghumidity,
        windSpeed: day.day.maxwind_kph,
        windDir: windDirPt,
        condition: day.day.condition.text,
        icon: getConditionEmoji(day.day.condition.code)
      };
    });

    return {
      source: 'weatherapi',
      sourceName: 'WeatherAPI',
      icon: '🌍',
      logo: '/assets/weather-logos/WeatherAPI.png',
      origin: 'Reino Unido',
      daily,
      confidence: 'high'
    };
  } catch (e) {
    console.error('WeatherAPI error:', e);
    return null;
  }
}
