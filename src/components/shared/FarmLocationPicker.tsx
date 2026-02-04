/**
 * FarmLocationPicker - Componente reutilizável para seleção de localização
 * 
 * Encapsula o hook useGeocoding com UI para busca e seleção no mapa
 */
import React, { useState, Suspense } from 'react';
import { MapPin, Search, Loader2, Navigation, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useGeocoding } from '../../hooks';

// Lazy load do mapa
const FarmMap = React.lazy(() => import('../../features/map/components/FarmMap'));

interface FarmLocationPickerProps {
  cidade: string;
  estado: string;
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number, lng: number) => void;
  onClose?: () => void;
  isOpen?: boolean;
  color?: string;
}

export function FarmLocationPicker({
  cidade,
  estado,
  latitude,
  longitude,
  onLocationChange,
  onClose,
  isOpen = true,
  color = 'green'
}: FarmLocationPickerProps) {
  const [showMap, setShowMap] = useState(false);
  const { geocodeAddress, getCurrentLocation, loading } = useGeocoding();

  const handleGeocode = async () => {
    if (!cidade || !estado) {
      toast.error('Preencha cidade e estado primeiro');
      return;
    }

    const address = `${cidade}, ${estado}, Brasil`;
    const result = await geocodeAddress(address);
    
    if (result) {
      onLocationChange(result.lat, result.lng);
      setShowMap(true);
      toast.success('Localização encontrada! Ajuste no mapa se necessário.');
    } else {
      toast.error('Localização não encontrada. Tente clicar manualmente no mapa.');
      setShowMap(true);
    }
  };

  const handleCurrentLocation = async () => {
    const result = await getCurrentLocation();
    if (result) {
      onLocationChange(result.lat, result.lng);
      setShowMap(true);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    onLocationChange(lat, lng);
  };

  if (!isOpen) return null;

  return (
    <div className="space-y-3">
      {/* Botões de Ação */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleGeocode}
          disabled={loading || !cidade || !estado}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-${color}-50 text-${color}-700 rounded-xl border border-${color}-200 font-bold text-sm hover:bg-${color}-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          Buscar no Mapa
        </button>

        <button
          type="button"
          onClick={handleCurrentLocation}
          disabled={loading}
          className={`flex items-center justify-center gap-2 py-3 px-4 bg-blue-50 text-blue-700 rounded-xl border border-blue-200 font-bold text-sm hover:bg-blue-100 transition-colors disabled:opacity-50`}
        >
          <Navigation className="w-4 h-4" />
          Usar GPS
        </button>
      </div>

      {/* Coordenadas Atuais */}
      {latitude && longitude && (
        <div className={`bg-${color}-50 border border-${color}-200 rounded-xl p-3 flex items-center gap-3`}>
          <MapPin className={`w-5 h-5 text-${color}-600`} />
          <div className="flex-1">
            <p className="text-xs font-bold text-gray-600 uppercase">Coordenadas Selecionadas</p>
            <p className="text-sm font-mono text-gray-800">
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowMap(true)}
            className={`text-xs font-bold text-${color}-600 hover:underline`}
          >
            Ajustar
          </button>
        </div>
      )}

      {/* Modal do Mapa */}
      {showMap && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className={`flex items-center justify-between p-4 bg-${color}-50 border-b`}>
              <h3 className={`font-bold text-${color}-800 flex items-center gap-2`}>
                <MapPin className="w-5 h-5" />
                Selecione a Localização
              </h3>
              <button
                type="button"
                onClick={() => setShowMap(false)}
                className={`p-1 rounded-full hover:bg-${color}-100 text-${color}-600`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="h-[400px]">
              <Suspense fallback={
                <div className="h-full flex items-center justify-center bg-gray-100">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              }>
                <FarmMap
                  latitude={latitude || -15.7801}
                  longitude={longitude || -47.9292}
                  onLocationChange={handleMapClick}
                />
              </Suspense>
            </div>

            <div className="p-4 border-t bg-gray-50">
              <button
                type="button"
                onClick={() => setShowMap(false)}
                className={`w-full py-3 bg-${color}-600 text-white font-bold rounded-xl hover:bg-${color}-700 transition-colors`}
              >
                Confirmar Localização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
