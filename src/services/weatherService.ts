/**
 * Open-Meteo Weather Service
 * Free API - No key required
 * Docs: https://open-meteo.com/
 */

export interface WeatherData {
  latitude: number;
  longitude: number;
  timezone: string;
  current: {
    time: string;
    temperature: number;
    humidity: number;
    precipitation: number;
    weathercode: number;
    windspeed: number;
    winddirection: number;
    is_day: boolean;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    precipitation: number[];
    precipitation_probability: number[];
    weathercode: number[];
    cloudcover: number[];
    windspeed_10m: number[];
    winddirection_10m: number[];
    windgusts_10m: number[];
  };
  daily: {
    time: string[];
    weathercode: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    windspeed_10m_max: number[];
    winddirection_10m_dominant: number[];
    sunrise: string[];
    sunset: string[];
  };
}

// Weather code descriptions and icons
export const weatherCodes: { [key: number]: { description: string; icon: string } } = {
  0: { description: 'Céu limpo', icon: '☀️' },
  1: { description: 'Principalmente limpo', icon: '🌤️' },
  2: { description: 'Parcialmente nublado', icon: '⛅' },
  3: { description: 'Nublado', icon: '☁️' },
  45: { description: 'Nevoeiro', icon: '🌫️' },
  48: { description: 'Nevoeiro com geada', icon: '🌫️' },
  51: { description: 'Garoa leve', icon: '🌧️' },
  53: { description: 'Garoa moderada', icon: '🌧️' },
  55: { description: 'Garoa intensa', icon: '🌧️' },
  56: { description: 'Garoa congelante', icon: '🌧️' },
  57: { description: 'Garoa congelante intensa', icon: '🌧️' },
  61: { description: 'Chuva leve', icon: '🌧️' },
  63: { description: 'Chuva moderada', icon: '🌧️' },
  65: { description: 'Chuva forte', icon: '🌧️' },
  66: { description: 'Chuva congelante', icon: '🌧️' },
  67: { description: 'Chuva congelante forte', icon: '🌧️' },
  71: { description: 'Neve leve', icon: '❄️' },
  73: { description: 'Neve moderada', icon: '❄️' },
  75: { description: 'Neve forte', icon: '❄️' },
  77: { description: 'Grãos de neve', icon: '❄️' },
  80: { description: 'Pancadas leves', icon: '🌦️' },
  81: { description: 'Pancadas moderadas', icon: '🌦️' },
  82: { description: 'Pancadas fortes', icon: '🌦️' },
  85: { description: 'Neve leve', icon: '🌨️' },
  86: { description: 'Neve forte', icon: '🌨️' },
  95: { description: 'Tempestade', icon: '⛈️' },
  96: { description: 'Tempestade com granizo leve', icon: '⛈️' },
  99: { description: 'Tempestade com granizo forte', icon: '⛈️' },
};

export function getWeatherInfo(code: number): { description: string; icon: string } {
  return weatherCodes[code] || { description: 'Desconhecido', icon: '❓' };
}

// Format wind direction to cardinal
export function getWindDirection(degrees: number): string {
  const directions = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

// Fetch weather forecast from Open-Meteo
export async function fetchWeatherForecast(lat: number, lng: number): Promise<WeatherData | null> {
  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lng.toString(),
      current: 'temperature_2m,relative_humidity_2m,precipitation,weathercode,windspeed_10m,winddirection_10m,is_day',
      hourly: 'temperature_2m,relative_humidity_2m,precipitation,precipitation_probability,weathercode,cloudcover,windspeed_10m,winddirection_10m,windgusts_10m',
      daily: 'weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,windspeed_10m_max,winddirection_10m_dominant,sunrise,sunset',
      timezone: 'America/Sao_Paulo',
      forecast_days: '14'
    });

    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();

    // Transform to our interface
    return {
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
      current: {
        time: data.current.time,
        temperature: data.current.temperature_2m,
        humidity: data.current.relative_humidity_2m,
        precipitation: data.current.precipitation,
        weathercode: data.current.weathercode,
        windspeed: data.current.windspeed_10m,
        winddirection: data.current.winddirection_10m,
        is_day: data.current.is_day === 1
      },
      hourly: {
        time: data.hourly.time,
        temperature_2m: data.hourly.temperature_2m,
        relative_humidity_2m: data.hourly.relative_humidity_2m,
        precipitation: data.hourly.precipitation,
        precipitation_probability: data.hourly.precipitation_probability,
        weathercode: data.hourly.weathercode,
        cloudcover: data.hourly.cloudcover,
        windspeed_10m: data.hourly.windspeed_10m,
        winddirection_10m: data.hourly.winddirection_10m,
        windgusts_10m: data.hourly.windgusts_10m
      },
      daily: {
        time: data.daily.time,
        weathercode: data.daily.weathercode,
        temperature_2m_max: data.daily.temperature_2m_max,
        temperature_2m_min: data.daily.temperature_2m_min,
        precipitation_sum: data.daily.precipitation_sum,
        precipitation_probability_max: data.daily.precipitation_probability_max,
        windspeed_10m_max: data.daily.windspeed_10m_max,
        winddirection_10m_dominant: data.daily.winddirection_10m_dominant,
        sunrise: data.daily.sunrise,
        sunset: data.daily.sunset
      }
    };
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return null;
  }
}

// Format date to weekday name in Portuguese
export function formatWeekday(dateString: string): string {
  // Add time to avoid timezone offset issues
  const date = new Date(dateString + 'T12:00:00');
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return weekdays[date.getDay()];
}

// Format date to short format (dd/mm)
export function formatShortDate(dateString: string): string {
  // Add time to avoid timezone offset issues
  const date = new Date(dateString + 'T12:00:00');
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
}

// Check if date is today
export function isToday(dateString: string): boolean {
  const date = new Date(dateString + 'T12:00:00');
  const today = new Date();
  return date.getDate() === today.getDate() && 
         date.getMonth() === today.getMonth() && 
         date.getFullYear() === today.getFullYear();
}
