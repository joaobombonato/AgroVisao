/**
 * MeteoBlue Provider
 */
import { 
  DailyForecast, 
  MultiSourceWeather, 
  WEATHER_API_KEYS, 
  getWindDir 
} from './helpers';

// Helper: MeteoBlue pictocode to emoji
function getMeteoBlueEmoji(code?: number): string {
  if (!code) return '🌤️';
  if (code <= 3) return '☀️';
  if (code <= 5) return '⛅';
  if (code <= 7) return '☁️';
  if (code <= 9) return '🌧️';
  if (code <= 12) return '🌧️';
  if (code <= 14) return '❄️';
  if (code <= 17) return '⛈️';
  return '🌤️';
}

// Helper: MeteoBlue pictocode to condition text
function getMeteoBlueCondition(code?: number): string {
  if (!code) return 'Desconhecido';
  if (code <= 2) return 'Céu limpo';
  if (code <= 3) return 'Poucas nuvens';
  if (code <= 5) return 'Parcialmente nublado';
  if (code <= 7) return 'Nublado';
  if (code <= 9) return 'Nevoeiro';
  if (code <= 12) return 'Chuva';
  if (code <= 14) return 'Neve';
  if (code <= 17) return 'Tempestade';
  return 'Variável';
}

export async function fetchMeteoBlue(lat: number, lng: number): Promise<MultiSourceWeather | null> {
  try {
    const response = await fetch(
      `https://my.meteoblue.com/packages/basic-day?apikey=${WEATHER_API_KEYS.METEOBLUE}&lat=${lat}&lon=${lng}&format=json`
    );
    
    if (!response.ok) {
      console.log('MeteoBlue response not ok:', response.status);
      return null;
    }
    const data = await response.json();
    
    if (!data.data_day) return null;

    const daily: DailyForecast[] = data.data_day.time.slice(0, 7).map((date: string, i: number) => ({
      date,
      precipitation: data.data_day.precipitation?.[i] || 0,
      precipProbability: data.data_day.precipitation_probability?.[i] || 0,
      tempMin: data.data_day.temperature_min?.[i] || 0,
      tempMax: data.data_day.temperature_max?.[i] || 0,
      humidity: data.data_day.relativehumidity_mean?.[i] || 0,
      windSpeed: data.data_day.windspeed_mean?.[i] || 0,
      windDir: getWindDir(data.data_day.winddirection?.[i] || 0),
      condition: getMeteoBlueCondition(data.data_day.pictocode?.[i]),
      icon: getMeteoBlueEmoji(data.data_day.pictocode?.[i])
    }));

    return {
      source: 'meteoblue',
      sourceName: 'MeteoBlue',
      icon: '🔵',
      logo: '/assets/weather-logos/MeteoBlue.png',
      origin: 'Suíça',
      daily,
      confidence: 'high'
    };
  } catch (e) {
    console.error('MeteoBlue error:', e);
    return null;
  }
}
