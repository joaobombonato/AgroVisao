/**
 * YR.no (Met.no) Provider - Norwegian Meteorological Institute
 */
import { 
  DailyForecast, 
  MultiSourceWeather, 
  getWindDir, 
  fetchWithTimeout,
  getTodayStr 
} from './helpers';

// Helper: YR.no symbol code to emoji
function getYrEmoji(code?: string): string {
  if (!code) return '🌤️';
  if (code.includes('thunder')) return '⛈️';
  if (code.includes('rain') || code.includes('shower')) return '🌧️';
  if (code.includes('snow') || code.includes('sleet')) return '❄️';
  if (code.includes('fog')) return '🌫️';
  if (code.includes('clear')) return '☀️';
  if (code.includes('cloudy')) return '☁️';
  if (code.includes('fair') || code.includes('partly')) return '⛅';
  return '🌤️';
}

// Helper: YR.no symbol code to condition text
function getYrCondition(code?: string): string {
  if (!code) return 'Desconhecido';
  if (code.includes('thunder')) return 'Tempestade';
  if (code.includes('heavyrain')) return 'Chuva forte';
  if (code.includes('rain')) return 'Chuva';
  if (code.includes('snow')) return 'Neve';
  if (code.includes('fog')) return 'Nevoeiro';
  if (code.includes('clearsky')) return 'Céu limpo';
  if (code.includes('cloudy')) return 'Nublado';
  if (code.includes('fair') || code.includes('partly')) return 'Parcialmente nublado';
  return 'Variável';
}

export async function fetchYrNo(lat: number, lng: number): Promise<MultiSourceWeather | null> {
  try {
    const response = await fetchWithTimeout(
      `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}`,
      {
        headers: {
          'User-Agent': 'AgroVisao/1.0 github.com/agrovisao'
        }
      },
      8000
    );
    
    if (!response.ok) return null;
    const data = await response.json();
    const timeseries = data.properties?.timeseries;
    const todayStr = getTodayStr();
    
    if (!timeseries) return null;

    // Group by day
    const dayMap = new Map<string, any[]>();
    timeseries.forEach((item: any) => {
      const date = item.time.split('T')[0];
      if (!dayMap.has(date)) dayMap.set(date, []);
      dayMap.get(date)!.push(item);
    });

    const daily: DailyForecast[] = [];
    dayMap.forEach((items, date) => {
      const temps = items.map((i: any) => i.data.instant.details.air_temperature);
      
      // Sum precipitation from next_1_hours OR next_6_hours
      const precip = items.reduce((sum: number, i: any) => {
        const p1h = i.data.next_1_hours?.details?.precipitation_amount;
        const p6h = i.data.next_6_hours?.details?.precipitation_amount;
        return sum + (p1h ?? (p6h ? p6h / 6 : 0));
      }, 0);
      
      const hasRain = precip > 0.5;
      const midday = items[Math.floor(items.length/2)];
      
      daily.push({
        date,
        precipitation: precip,
        precipProbability: hasRain ? Math.min(90, Math.round(precip * 10)) : 0,
        tempMin: Math.min(...temps),
        tempMax: Math.max(...temps),
        humidity: midday.data.instant.details.relative_humidity || 0,
        windSpeed: (midday.data.instant.details.wind_speed || 0) * 3.6,
        windDir: getWindDir(midday.data.instant.details.wind_from_direction || 0),
        condition: getYrCondition(midday.data.next_1_hours?.summary?.symbol_code || midday.data.next_6_hours?.summary?.symbol_code),
        icon: getYrEmoji(midday.data.next_1_hours?.summary?.symbol_code || midday.data.next_6_hours?.summary?.symbol_code),
        isPartial: date === todayStr
      });
    });

    return {
      source: 'yrno',
      sourceName: 'YR.no',
      icon: '🇳🇴',
      logo: '/assets/weather-logos/YR.png',
      origin: 'Noruega',
      daily: daily.slice(0, 10),
      confidence: 'high'
    };
  } catch (e) {
    console.error('YR.no error:', e);
    return null;
  }
}
