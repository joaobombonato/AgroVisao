import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon
const defaultIcon = L.icon({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = defaultIcon;

interface FarmMapProps {
  latitude?: number;
  longitude?: number;
  geojson?: any;
  onLocationChange?: (lat: number, lng: number) => void;
  editable?: boolean;
  height?: string;
  showManualInput?: boolean;
}

export default function FarmMap({ 
  latitude, 
  longitude, 
  onLocationChange,
  editable = true,
  height = '300px',
  showManualInput = true
}: FarmMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(
    latitude && longitude ? { lat: latitude, lng: longitude } : null
  );
  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Tile layers
  const tileLayers = {
    street: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri, Maxar, Earthstar Geographics'
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const defaultCenter: L.LatLngExpression = coords 
      ? [coords.lat, coords.lng] 
      : [-15.7801, -47.9292]; // Brasília

    const defaultZoom = coords ? 14 : 4;

    const map = L.map(mapRef.current).setView(defaultCenter, defaultZoom);

    // Add initial tile layer
    tileLayerRef.current = L.tileLayer(tileLayers[mapType].url, {
      attribution: tileLayers[mapType].attribution,
      maxZoom: 19
    }).addTo(map);

    // Add marker if we have coords
    if (coords) {
      markerRef.current = L.marker([coords.lat, coords.lng])
        .addTo(map)
        .bindPopup(`📍 ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
    }

    // Click handler
    if (editable) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
          markerRef.current.setPopupContent(`📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } else {
          markerRef.current = L.marker([lat, lng])
            .addTo(map)
            .bindPopup(`📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }

        setCoords({ lat, lng });
        setManualLat(lat.toFixed(6));
        setManualLng(lng.toFixed(6));
        onLocationChange?.(lat, lng);
      });
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  // Switch tile layer when mapType changes
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    mapInstanceRef.current.removeLayer(tileLayerRef.current);
    tileLayerRef.current = L.tileLayer(tileLayers[mapType].url, {
      attribution: tileLayers[mapType].attribution,
      maxZoom: 19
    }).addTo(mapInstanceRef.current);
  }, [mapType]);

  // Update map when external coords change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    
    if (latitude && longitude) {
      mapInstanceRef.current.setView([latitude, longitude], 14);
      
      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
        markerRef.current.setPopupContent(`📍 ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      } else {
        markerRef.current = L.marker([latitude, longitude])
          .addTo(mapInstanceRef.current)
          .bindPopup(`📍 ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      }
      
      setCoords({ lat: latitude, lng: longitude });
      setManualLat(latitude.toFixed(6));
      setManualLng(longitude.toFixed(6));
    }
  }, [latitude, longitude]);

  // Handle manual coordinate input
  const handleManualSubmit = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    
    if (isNaN(lat) || isNaN(lng)) return;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 14);
      
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
        markerRef.current.setPopupContent(`📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      } else {
        markerRef.current = L.marker([lat, lng])
          .addTo(mapInstanceRef.current)
          .bindPopup(`📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    }

    setCoords({ lat, lng });
    onLocationChange?.(lat, lng);
  };

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      {/* Map Type Toggle */}
      <div className="bg-gray-100 px-3 py-2 flex items-center justify-between border-b">
        <span className="text-xs font-medium text-gray-600">Tipo de Mapa:</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMapType('street')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
              mapType === 'street' 
                ? 'bg-green-600 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            🗺️ Mapa
          </button>
          <button
            type="button"
            onClick={() => setMapType('satellite')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
              mapType === 'satellite' 
                ? 'bg-green-600 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            🛰️ Satélite
          </button>
        </div>
      </div>

      {/* Map */}
      <div 
        ref={mapRef} 
        style={{ height, width: '100%' }}
        className="z-0"
      />

      {/* Manual Input & Status */}
      {editable && (
        <div className="bg-gray-50 px-3 py-2 border-t space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            {coords 
              ? `Localização: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
              : 'Clique no mapa ou digite as coordenadas'
            }
          </div>
          
          {showManualInput && (
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Latitude</label>
                <input
                  type="text"
                  placeholder="-17.21741"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border rounded-lg focus:ring-1 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Longitude</label>
                <input
                  type="text"
                  placeholder="-46.87075"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border rounded-lg focus:ring-1 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <button
                type="button"
                onClick={handleManualSubmit}
                className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                Ir
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Geocoding helper function using Nominatim (OpenStreetMap)
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number; display_name: string } | null> {
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
  }
}

// Reverse geocoding (coordinates to address)
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
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
  }
}
