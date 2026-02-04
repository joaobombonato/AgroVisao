/**
 * OpenWeatherMap Provider (5-day forecast, 3-hour intervals)
 */
import { 
  DailyForecast, 
  MultiSourceWeather, 
  WEATHER_API_KEYS, 
  getWindDir, 
  fetchWithTimeout,
  getTodayStr 
} from './helpers';

// Helper: OpenWeatherMap weather code to emoji
function getWeatherEmoji(code: number): string {
  if (code >= 200 && code < 300) return '⛈️';
  if (code >= 300 && code < 400) return '🌧️';
  if (code >= 500 && code < 600) return '🌧️';
  if (code >= 600 && code < 700) return '❄️';
  if (code >= 700 && code < 800) return '🌫️';
  if (code === 800) return '☀️';
  if (code > 800) return '⛅';
  return '🌤️';
}

export async function fetchOpenWeatherMap(lat: number, lng: number): Promise<MultiSourceWeather | null> {
  try {
    const response = await fetchWithTimeout(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${WEATHER_API_KEYS.OPENWEATHER}&units=metric&lang=pt_br`
    );
    
    if (!response.ok) {
      if (response.status === 429) console.warn('OpenWeatherMap: Too Many Requests (Rate Limit)');
      else console.log('OpenWeatherMap response not ok:', response.status);
      return null;
    }
    const data = await response.json();
    
    const todayStr = getTodayStr();
    
    if (!data.list || data.list.length === 0) {
      console.log('OpenWeatherMap no data');
      return null;
    }

    // Group by day
    const dayMap = new Map<string, any[]>();
    data.list.forEach((item: any) => {
      const date = item.dt_txt.split(' ')[0];
      if (!dayMap.has(date)) dayMap.set(date, []);
      dayMap.get(date)!.push(item);
    });

    const daily: DailyForecast[] = [];
    dayMap.forEach((items, date) => {
      const temps = items.map((i: any) => i.main.temp);
      const precips = items.map((i: any) => (i.pop || 0) * 100);
      const rain = items.reduce((sum: number, i: any) => sum + (i.rain?.['3h'] || 0), 0);
      const midItem = items[Math.floor(items.length/2)];
      
      daily.push({
        date,
        precipitation: rain,
        precipProbability: Math.round(Math.max(...precips)),
        tempMin: Math.min(...temps),
        tempMax: Math.max(...temps),
        humidity: midItem.main.humidity,
        windSpeed: midItem.wind.speed * 3.6,
        windDir: getWindDir(midItem.wind.deg),
        condition: midItem.weather[0].description,
        icon: getWeatherEmoji(midItem.weather[0].id),
        isPartial: date === todayStr
      });
    });

    return {
      source: 'openweathermap',
      sourceName: 'OpenWeather',
      icon: '🌤️',
      logo: '/assets/weather-logos/OpenWeatherMap.png',
      origin: 'EUA',
      daily: daily.slice(0, 6),
      confidence: 'high'
    };
  } catch (e) {
    console.error('OpenWeatherMap error:', e);
    return null;
  }
}
