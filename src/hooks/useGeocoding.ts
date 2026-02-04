/**
 * useGeocoding - Hook para geocodificação de endereços
 * 
 * Encapsula a lógica de:
 * - Busca de coordenadas por endereço (geocode)
 * - Busca de endereço por coordenadas (reverse geocode)
 * - Obtenção da localização atual via GPS
 */
import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';

interface GeocodeResult {
  lat: number;
  lng: number;
  display_name: string;
}

interface UseGeocodingReturn {
  loading: boolean;
  geocodeAddress: (address: string) => Promise<GeocodeResult | null>;
  reverseGeocode: (lat: number, lng: number) => Promise<string | null>;
  getCurrentLocation: () => Promise<{ lat: number; lng: number } | null>;
}

export function useGeocoding(): UseGeocodingReturn {
  const [loading, setLoading] = useState(false);

  // Busca coordenadas por endereço
  const geocodeAddress = useCallback(async (address: string): Promise<GeocodeResult | null> => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=br`,
        {
          headers: {
            'Accept-Language': 'pt-BR',
            'User-Agent': 'AgroVisao/1.0'
          }
        }
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          display_name: data[0].display_name
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Busca endereço por coordenadas
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string | null> => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        {
          headers: {
            'Accept-Language': 'pt-BR',
            'User-Agent': 'AgroVisao/1.0'
          }
        }
      );
      const data = await response.json();
      
      if (data && data.address) {
        const { city, town, village, municipality, state } = data.address;
        const cityName = city || town || village || municipality || '';
        return cityName && state ? `${cityName}, ${state}` : data.display_name;
      }
      return null;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Obter localização atual via GPS
  const getCurrentLocation = useCallback((): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        toast.error("Geolocalização não suportada no seu navegador.");
        resolve(null);
        return;
      }

      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setLoading(false);
          toast.success("Localização atual capturada!");
          resolve({ lat: latitude, lng: longitude });
        },
        (err) => {
          console.error(err);
          setLoading(false);
          toast.error("Não foi possível obter sua localização.");
          resolve(null);
        },
        { enableHighAccuracy: true }
      );
    });
  }, []);

  return {
    loading,
    geocodeAddress,
    reverseGeocode,
    getCurrentLocation
  };
}
