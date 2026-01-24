/**
 * Multi-Source Weather Service
 * Fetches weather data from multiple APIs for comparison
 */

// API Keys
const OPENWEATHER_API_KEY = '18bfba36773741d02f842edbe584bb72';
const WEATHERAPI_KEY = '0aac2f689aa54d0891e211705262001';
const TOMORROW_API_KEY = 'GBkWjn9jdhGinof0aOFIdgIZZfui8Q3N';
const METEOBLUE_API_KEY = 'YcqeR6nfZgNHGbX0';

// Cache Configuration (45 minutes)
const CACHE_TTL = 45 * 60 * 1000;

export interface DailyForecast {
  date: string;
  precipitation: number;
  precipProbability?: number;
  tempMin: number;
  tempMax: number;
  humidity: number;
  windSpeed: number;
  windDir: string;
  condition: string;
  icon: string;
  isPartial?: boolean; // Indicates if this is only for the remainder of the day
}

export interface MultiSourceWeather {
  source: string;
  sourceName: string;
  icon: string;
  logo?: string;
  origin: string;
  daily: DailyForecast[];
  confidence: 'high' | 'medium' | 'low';
}

// Helper function
function getWindDir(degrees: number): string {
  if (degrees === undefined || degrees === null || isNaN(degrees)) return '';
  const directions = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

// 1. OpenWeatherMap (5-day forecast, 3-hour intervals)
export async function fetchOpenWeatherMap(lat: number, lng: number): Promise<MultiSourceWeather | null> {
  try {
    const response = await fetchWithTimeout(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=pt_br`
    );
    
    if (!response.ok) {
      if (response.status === 429) console.warn('OpenWeatherMap: Too Many Requests (Rate Limit)');
      else console.log('OpenWeatherMap response not ok:', response.status);
      return null;
    }
    const data = await response.json();
    
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
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
        isPartial: date === todayStr // OpenWeatherMap free: today is only remaining intervals
      });
    });

    return {
      source: 'openweathermap',
      sourceName: 'OpenWeather',
      icon: '🌤️',
      logo: '/assets/weather-logos/OpenWeatherMap.png',
      origin: 'EUA',
      daily: daily.slice(0, 6), // OpenWeatherMap free tier: 6 days
      confidence: 'high'
    };
  } catch (e) {
    console.error('OpenWeatherMap error:', e);
    return null;
  }
}

// 2. YR.no (Met.no) - Norwegian Meteorological Institute
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
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
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
      
      // Sum precipitation from next_1_hours OR next_6_hours (for later days)
      const precip = items.reduce((sum: number, i: any) => {
        const p1h = i.data.next_1_hours?.details?.precipitation_amount;
        const p6h = i.data.next_6_hours?.details?.precipitation_amount;
        // Use 1h if available, otherwise use 6h divided by 6 (to avoid duplicates)
        return sum + (p1h ?? (p6h ? p6h / 6 : 0));
      }, 0);
      
      // Calculate probability from precipitation amounts
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
        isPartial: date === todayStr // YR.no: today is only remaining hours
      });
    });

    return {
      source: 'yrno',
      sourceName: 'YR.no',
      icon: '🇳🇴',
      logo: '/assets/weather-logos/YR.png',
      origin: 'Noruega',
      daily: daily.slice(0, 10), // YR.no provides 10 days
      confidence: 'high'
    };
  } catch (e) {
    console.error('YR.no error:', e);
    return null;
  }
}

// 3. WeatherAPI.com
export async function fetchWeatherAPI(lat: number, lng: number): Promise<MultiSourceWeather | null> {
  try {
    const response = await fetchWithTimeout(
      `https://api.weatherapi.com/v1/forecast.json?key=${WEATHERAPI_KEY}&q=${lat},${lng}&days=14&lang=pt`,
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
      // Get wind direction from hourly data
      const middayHour = day.hour?.[12] || day.hour?.[0];
      const windDir = middayHour?.wind_dir || '';
      
      // Convert wind direction abbreviation to Portuguese
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

// 4. Tomorrow.io - Using hourly data to calculate daily precipitation
export async function fetchTomorrow(lat: number, lng: number): Promise<MultiSourceWeather | null> {
  try {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    // Use timelines endpoint with hourly data for more accurate precipitation
    const response = await fetchWithTimeout(
      `https://api.tomorrow.io/v4/timelines?location=${lat},${lng}&fields=precipitationIntensity,precipitationProbability,temperature,humidity,windSpeed,windDirection,weatherCode&timesteps=1d&units=metric&apikey=${TOMORROW_API_KEY}`,
      {},
      8000
    );
    
    if (!response.ok) {
      if (response.status === 429) {
        console.warn('Tomorrow.io: Too Many Requests (429). Attempting fallback...');
      } else {
        console.log('Tomorrow.io response not ok:', response.status);
      }
      // Try alternative endpoint
      return await fetchTomorrowFallback(lat, lng);
    }
    
    const data = await response.json();
    
    if (!data.data?.timelines?.[0]?.intervals) {
      return await fetchTomorrowFallback(lat, lng);
    }

    const intervals = data.data.timelines[0].intervals;
    
    const daily: DailyForecast[] = intervals.slice(0, 6).map((interval: any) => { // Tomorrow.io: 6 days
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

// Fallback for Tomorrow.io using the forecast endpoint
async function fetchTomorrowFallback(lat: number, lng: number): Promise<MultiSourceWeather | null> {
  try {
    const response = await fetch(
      `https://api.tomorrow.io/v4/weather/forecast?location=${lat},${lng}&apikey=${TOMORROW_API_KEY}&units=metric`
    );
    
    if (!response.ok) return null;
    const data = await response.json();
    
    if (!data.timelines?.daily) return null;

    const daily: DailyForecast[] = data.timelines.daily.slice(0, 6).map((day: any) => { // Tomorrow.io: 6 days
      // For free tier, precipitation accumulation might not be available
      // Just show 0 if not available to avoid wrong values
      return {
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
      };
    });

    return {
      source: 'tomorrow',
      sourceName: 'Tomorrow.io',
      icon: '⏰',
      logo: '/assets/weather-logos/Tomorrow.png',
      origin: 'EUA',
      daily,
      confidence: 'medium' // Lower confidence since precip not available
    };
  } catch {
    return null;
  }
}

// 5. MeteoBlue
export async function fetchMeteoBlue(lat: number, lng: number): Promise<MultiSourceWeather | null> {
  try {
    // MeteoBlue requires a different endpoint structure
    const response = await fetch(
      `https://my.meteoblue.com/packages/basic-day?apikey=${METEOBLUE_API_KEY}&lat=${lat}&lon=${lng}&format=json`
    );
    
    if (!response.ok) {
      console.log('MeteoBlue response not ok:', response.status);
      return null;
    }
    const data = await response.json();
    
    if (!data.data_day) return null;

    const daily: DailyForecast[] = data.data_day.time.slice(0, 7).map((date: string, i: number) => ({ // MeteoBlue basic-day: 7 days max
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

// Helper for fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 5000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// Fetch all sources with individual error handling and timeouts
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
        // Individual provider timeout (8 seconds)
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

// Helper: Convert English wind direction to Portuguese
function convertWindDir(dir: string): string {
  const mapping: Record<string, string> = {
    'N': 'N', 'NNE': 'NNE', 'NE': 'NE', 'ENE': 'ENE',
    'E': 'L', 'ESE': 'LSE', 'SE': 'SE', 'SSE': 'SSE',
    'S': 'S', 'SSW': 'SSO', 'SW': 'SO', 'WSW': 'OSO',
    'W': 'O', 'WNW': 'ONO', 'NW': 'NO', 'NNW': 'NNO'
  };
  return mapping[dir] || dir;
}

// Helper functions for weather icons
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

// Export sources info for the attribution table (ordered by days coverage)
export const WEATHER_SOURCES = [
  { name: 'Open-Meteo', icon: '🌐', logo: '/assets/weather-logos/OpenMeteo.png', origin: 'Alemanha/UE', type: 'Gratuita', url: 'open-meteo.com', days: 16 },
  { name: 'WeatherAPI', icon: '🌍', logo: '/assets/weather-logos/WeatherAPI.png', origin: 'Reino Unido', type: 'API Key', url: 'weatherapi.com', days: 14 },
  { name: 'YR.no', icon: '🇳🇴', logo: '/assets/weather-logos/YR.png', origin: 'Noruega', type: 'Gratuita', url: 'yr.no', days: 10 },
  { name: 'MeteoBlue', icon: '🔵', logo: '/assets/weather-logos/MeteoBlue.png', origin: 'Suíça', type: 'API Key', url: 'meteoblue.com', days: 7 },
  { name: 'Tomorrow.io', icon: '⏰', logo: '/assets/weather-logos/Tomorrow.png', origin: 'EUA', type: 'API Key', url: 'tomorrow.io', days: 6 },
  { name: 'OpenWeather', icon: '🌤️', logo: '/assets/weather-logos/OpenWeatherMap.png', origin: 'EUA', type: 'API Key', url: 'openweathermap.org', days: 6 }
];
