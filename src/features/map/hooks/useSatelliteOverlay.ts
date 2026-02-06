import { useState, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import L from 'leaflet';
import { toast } from 'react-hot-toast';
import { 
  getNDVIImage,
  getTrueColorImage,
  getEVIImage,
  getSAVIImage,
  getNDREImage,
  getNDMIImage,
  getAvailableDates
} from '../services/satelliteService';
import type { OverlayType } from '../utils/mapHelpers';

interface UseSatelliteOverlayProps {
  mapInstanceRef: React.RefObject<L.Map | null>;
  polygonLayerRef: React.RefObject<L.Polygon | null>;
  geojsonData: any;
  activeTab: 'map' | 'analysis';
  fazendaId?: string;
}

interface UseSatelliteOverlayReturn {
  overlayType: OverlayType;
  setOverlayType: (type: OverlayType) => void;
  availableImages: { date: string; cloudCover: number }[];
  selectedImageIndex: number;
  setSelectedImageIndex: Dispatch<SetStateAction<number>>;
  loadingImages: boolean;
  setLoadingImages: (loading: boolean) => void;
  currentOverlayUrl: string | null;
  showOverlay: boolean;
  setShowOverlay: (show: boolean) => void;
  dateError: boolean;
  loadDates: () => Promise<void>;
  imageOverlayRef: React.MutableRefObject<L.ImageOverlay | null>;
}

/**
 * Hook para gerenciar o overlay de satélite com cache inteligente.
 * Extrai toda a lógica de carregamento de imagens de satélite do MapScreen.
 */
export function useSatelliteOverlay({
  mapInstanceRef,
  polygonLayerRef,
  geojsonData,
  activeTab,
  fazendaId
}: UseSatelliteOverlayProps): UseSatelliteOverlayReturn {
  
  const [overlayType, setOverlayType] = useState<OverlayType>('none');
  const [availableImages, setAvailableImages] = useState<{ date: string, cloudCover: number }[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [loadingImages, setLoadingImages] = useState(false);
  const [currentOverlayUrl, setCurrentOverlayUrl] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [dateError, setDateError] = useState(false);
  
  // Cache para evitar requisições redundantes (Economia de PUs)
  const overlayCacheRef = useRef<Record<string, string>>({});
  const imageOverlayRef = useRef<L.ImageOverlay | null>(null);

  // Overlay Logic com Cache Inteligente
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !polygonLayerRef.current) return;
    
    // Remove overlay anterior do mapa sem revogar a URL (para permitir cache)
    if (imageOverlayRef.current) { 
      map.removeLayer(imageOverlayRef.current); 
      imageOverlayRef.current = null; 
    }
    
    if (overlayType === 'none' || !showOverlay || !geojsonData || activeTab !== 'analysis') return;
    if (availableImages.length === 0) return;
    
    const selectedImage = availableImages[selectedImageIndex];
    if (!selectedImage) return;

    // Chave única para o cache
    const cacheKey = `${selectedImage.date}_${overlayType}_${fazendaId || 'temp'}`;

    const loadOverlayImage = async () => {
      // 1. Verificar Cache (Instantâneo e Grátis)
      if (overlayCacheRef.current[cacheKey]) {
        const cachedUrl = overlayCacheRef.current[cacheKey];
        setCurrentOverlayUrl(cachedUrl);
        imageOverlayRef.current = L.imageOverlay(cachedUrl, polygonLayerRef.current!.getBounds(), { opacity: 0.9, interactive: false }).addTo(map);
        imageOverlayRef.current.bringToFront();
        polygonLayerRef.current!.bringToFront();
        return;
      }

      // 2. Solicitar ao Satélite (Custo de PUs)
      setLoadingImages(true);
      try {
        // Calcular aspect ratio geográfico real para evitar imagem "esticada"
        const bounds = polygonLayerRef.current!.getBounds();
        const dLat = Math.abs(bounds.getNorth() - bounds.getSouth());
        const dLng = Math.abs(bounds.getEast() - bounds.getWest());
        const midLat = (bounds.getNorth() + bounds.getSouth()) / 2;
        const cosLat = Math.cos(midLat * Math.PI / 180);
        
        const geoRatio = (dLng * cosLat) / dLat;
        
        // Define o maior lado como 1024px e calcula o outro proporcionalmente
        let width = 1024;
        let height = 1024;
        if (geoRatio > 1) {
          height = Math.max(Math.round(1024 / geoRatio), 256);
        } else {
          width = Math.max(Math.round(1024 * geoRatio), 256);
        }
        
        let imageUrl = null;
        
        if (overlayType === 'ndvi') imageUrl = await getNDVIImage(geojsonData, selectedImage.date, width, height);
        else if (overlayType === 'evi') imageUrl = await getEVIImage(geojsonData, selectedImage.date, width, height);
        else if (overlayType === 'savi') imageUrl = await getSAVIImage(geojsonData, selectedImage.date, width, height);
        else if (overlayType === 'ndre') imageUrl = await getNDREImage(geojsonData, selectedImage.date, width, height);
        else if (overlayType === 'ndmi') imageUrl = await getNDMIImage(geojsonData, selectedImage.date, width, height);
        else if (overlayType === 'truecolor') imageUrl = await getTrueColorImage(geojsonData, selectedImage.date, width, height);

        if (imageUrl) {
          overlayCacheRef.current[cacheKey] = imageUrl; // Salva no cache
          setCurrentOverlayUrl(imageUrl);
          imageOverlayRef.current = L.imageOverlay(imageUrl, polygonLayerRef.current!.getBounds(), { opacity: 0.9, interactive: false }).addTo(map);
          imageOverlayRef.current.bringToFront();
          polygonLayerRef.current!.bringToFront();
        }
      } catch (error) { 
        console.error(error); 
        toast.error('Erro ao carregar imagem'); 
      } finally { 
        setLoadingImages(false); 
      }
    };
    loadOverlayImage();
  }, [overlayType, selectedImageIndex, showOverlay, availableImages, geojsonData, activeTab]);

  // Load Dates
  const loadDates = async () => {
    if (!geojsonData || loadingImages) return;
    setLoadingImages(true);
    setDateError(false);
    try { 
      const images = await getAvailableDates(geojsonData, 400); 
      if (images.length === 0) setDateError(true);
      setAvailableImages(images); 
    } 
    catch (e) { 
      console.error(e); 
      setDateError(true);
    } 
    finally { setLoadingImages(false); }
  };

  // Auto-load dates when geojsonData is available
  useEffect(() => {
    if (geojsonData && availableImages.length === 0 && !loadingImages) {
      loadDates();
    }
  }, [geojsonData]);

  return {
    overlayType,
    setOverlayType,
    availableImages,
    selectedImageIndex,
    setSelectedImageIndex,
    loadingImages,
    setLoadingImages,
    currentOverlayUrl,
    showOverlay,
    setShowOverlay,
    dateError,
    loadDates,
    imageOverlayRef
  };
}
