/**
 * Weather Service - Shared Types and Helpers
 */

// API Keys (centralized)
export const WEATHER_API_KEYS = {
  OPENWEATHER: '18bfba36773741d02f842edbe584bb72',
  WEATHERAPI: '0aac2f689aa54d0891e211705262001',
  TOMORROW: 'GBkWjn9jdhGinof0aOFIdgIZZfui8Q3N',
  METEOBLUE: 'YcqeR6nfZgNHGbX0'
};

// Cache Configuration (45 minutes)
export const CACHE_TTL = 45 * 60 * 1000;

// Types
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
  isPartial?: boolean;
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

// Helper: Convert degrees to wind direction
export function getWindDir(degrees: number): string {
  if (degrees === undefined || degrees === null || isNaN(degrees)) return '';
  const directions = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

// Helper: Convert English wind direction to Portuguese
export function convertWindDir(dir: string): string {
  const mapping: Record<string, string> = {
    'N': 'N', 'NNE': 'NNE', 'NE': 'NE', 'ENE': 'ENE',
    'E': 'L', 'ESE': 'LSE', 'SE': 'SE', 'SSE': 'SSE',
    'S': 'S', 'SSW': 'SSO', 'SW': 'SO', 'WSW': 'OSO',
    'W': 'O', 'WNW': 'ONO', 'NW': 'NO', 'NNW': 'NNO'
  };
  return mapping[dir] || dir;
}

// Helper: Fetch with timeout
export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 5000): Promise<Response> {
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

// Helper: Get today's date string
export function getTodayStr(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}
