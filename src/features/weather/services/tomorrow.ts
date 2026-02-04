/**
 * Tomorrow.io Provider
 */
import { 
  DailyForecast, 
  MultiSourceWeather, 
  WEATHER_API_KEYS, 
  getWindDir, 
  fetchWithTimeout,
  getTodayStr 
} from './helpers';

// Helper: Tomorrow.io weather code to emoji
function getTomorrowEmoji(code: number): string {
  if ([8000].includes(code)) return '⛈️';
  if ([4000, 4001, 4200, 4201].includes(code)) return '🌧️';
  if ([5000, 5001, 5100, 5101].includes(code)) return '❄️';
  if ([2000, 2100].includes(code)) return '🌫️';
  if ([1000].includes(code)) return '☀️';
  if ([1100, 1101].includes(code)) return '⛅';
  if ([1001, 1102].includes(code)) return '☁️';
  return '🌤️';
}

// Helper: Tomorrow.io weather code to condition text
function getTomorrowCondition(code: number): string {
  const conditions: Record<number, string> = {
    0: 'Desconhecido',
    1000: 'Céu limpo',
    1100: 'Principalmente limpo',
    1101: 'Parcialmente nublado',
    1102: 'Muito nublado',
    1001: 'Nublado',
    2000: 'Nevoeiro',
    2100: 'Nevoeiro leve',
    4000: 'Garoa',
    4001: 'Chuva',
    4200: 'Chuva leve',
    4201: 'Chuva forte',
    5000: 'Neve',
    5001: 'Neve intensa',
    5100: 'Neve leve',
    5101: 'Neve forte',
    8000: 'Tempestade'
  };
  return conditions[code] || 'Variável';
}

// Fallback endpoint
async function fetchTomorrowFallback(lat: number, lng: number): Promise<MultiSourceWeather | null> {
  try {
    const response = await fetch(
      `https://api.tomorrow.io/v4/weather/forecast?location=${lat},${lng}&apikey=${WEATHER_API_KEYS.TOMORROW}&units=metric`
    );
    
    if (!response.ok) return null;
    const data = await response.json();
    
    if (!data.timelines?.daily) return null;

    const daily: DailyForecast[] = data.timelines.daily.slice(0, 6).map((day: any) => ({
      date: day.time.split('T')[0],
      precipitation: 0, // Not reliable in free tier
      precipProbability: Math.round(day.values.precipitationProbabilityMax || 0),
      tempMin: day.values.temperatureMin,
      tempMax: day.values.temperatureMax,
      humidity: Math.round(day.values.humidityAvg || 0),
      windSpeed: (day.values.windSpeedMax || 0) * 3.6,
      windDir: getWindDir(day.values.windDirectionAvg || 0),
      condition: getTomorrowCondition(day.values.weatherCodeMax),
      icon: getTomorrowEmoji(day.values.weatherCodeMax)
    }));

    return {
      source: 'tomorrow',
      sourceName: 'Tomorrow.io',
      icon: '⏰',
      logo: '/assets/weather-logos/Tomorrow.png',
      origin: 'EUA',
      daily,
      confidence: 'medium'
    };
  } catch {
    return null;
  }
}

export async function fetchTomorrow(lat: number, lng: number): Promise<MultiSourceWeather | null> {
  try {
    const todayStr = getTodayStr();
    
    const response = await fetchWithTimeout(
      `https://api.tomorrow.io/v4/timelines?location=${lat},${lng}&fields=precipitationIntensity,precipitationProbability,temperature,humidity,windSpeed,windDirection,weatherCode&timesteps=1d&units=metric&apikey=${WEATHER_API_KEYS.TOMORROW}`,
      {},
      8000
    );
    
    if (!response.ok) {
      if (response.status === 429) {
        console.warn('Tomorrow.io: Too Many Requests (429). Attempting fallback...');
      } else {
        console.log('Tomorrow.io response not ok:', response.status);
      }
      return await fetchTomorrowFallback(lat, lng);
    }
    
    const data = await response.json();
    
    if (!data.data?.timelines?.[0]?.intervals) {
      return await fetchTomorrowFallback(lat, lng);
    }

    const intervals = data.data.timelines[0].intervals;
    
    const daily: DailyForecast[] = intervals.slice(0, 6).map((interval: any) => {
      const values = interval.values;
      const date = interval.startTime.split('T')[0];
      
      return {
        date,
        precipitation: values.precipitationIntensity || 0,
        precipProbability: Math.round(values.precipitationProbability || (values.precipitationIntensity > 0 ? 70 : 0)),
        tempMin: values.temperatureMin || values.temperature || 0,
        tempMax: values.temperatureMax || values.temperature || 0,
        humidity: Math.round(values.humidity || 0),
        windSpeed: (values.windSpeed || 0) * 3.6,
        windDir: getWindDir(values.windDirection || 0),
        condition: getTomorrowCondition(values.weatherCode),
        icon: getTomorrowEmoji(values.weatherCode),
        isPartial: date === todayStr
      };
    });

    return {
      source: 'tomorrow',
      sourceName: 'Tomorrow.io',
      icon: '⏰',
      logo: '/assets/weather-logos/Tomorrow.png',
      origin: 'EUA',
      daily,
      confidence: 'high'
    };
  } catch (e) {
    console.error('Tomorrow.io error:', e);
    return null;
  }
}
