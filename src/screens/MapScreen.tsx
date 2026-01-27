import React, { useState, useEffect, useRef } from 'react';
import { Satellite, Maximize2, Layers, Loader2, Plus, Check, X, Undo2, ChevronDown, MousePointerClick, Locate, Scan, Download, CloudRain, AlertTriangle, BookOpen, Droplets, Calendar, ChevronRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { toast } from 'react-hot-toast';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  getNDVIImage,
  getTrueColorImage,
  getEVIImage,
  getSAVIImage,
  getNDREImage,
  getNDMIImage,
  getAvailableDates
} from '../services/satelliteService';
import { calculateAreaHectares, pointsToGeoJSON, type OverlayType } from '../utils/mapHelpers';
import { handleExportPNG } from '../utils/mapExportPNG';
import { MapLegend } from '../components/map/MapLegend';
import { SatelliteCalendar } from '../components/map/SatelliteCalendar';
import { MapHeader } from '../components/map/MapHeader';
import { TelemetryCard } from '../components/map/TelemetryCard';
import { AgronomicIntelligenceCard } from '../components/agronomic/AgronomicIntelligenceCard';
import { fetchAgronomicData, type AgronomicResult } from '../services/agronomicService';

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

const editIcon = L.divIcon({
  className: 'custom-edit-marker',
  html: `<div style="
    background-color: white;
    border: 2px solid #16a34a;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

const TILE_LAYERS = {
  street: {
    name: 'Mapa',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap'
  },
  satellite: {
    name: 'Satélite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri'
  }
};


export default function MapScreen() {
  const { state, setTela, fazendaSelecionada, genericUpdate } = useAppContext();
  const { userRole, permissions } = state;
  const rolePermissions = permissions?.[userRole || ''] || permissions?.['Operador'];
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const polygonLayerRef = useRef<L.Polygon | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const mainMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const imageOverlayRef = useRef<L.ImageOverlay | null>(null);
  const maskLayerRef = useRef<L.Polygon | null>(null);
  
  const isDrawingRef = useRef(false);
  const drawPointsRef = useRef<L.LatLng[]>([]);
  
  const [mapType, setMapType] = useState<'street' | 'satellite'>('satellite');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState<L.LatLng[]>([]);
  const [areaHectares, setAreaHectares] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [geojsonData, setGeojsonData] = useState<any>(null);
  
  const [activeTab, setActiveTab] = useState<'map' | 'analysis'>(fazendaSelecionada?.geojson ? 'analysis' : 'map');
  const [overlayType, setOverlayType] = useState<OverlayType>('none');
  const [availableImages, setAvailableImages] = useState<{ date: string, cloudCover: number }[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [loadingImages, setLoadingImages] = useState(false);
  const [currentOverlayUrl, setCurrentOverlayUrl] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  
  // Cache para evitar requisições redundantes (Economia de PUs)
  const overlayCacheRef = useRef<Record<string, string>>({});

  // Estado para dados agronômicos (Solo)
  const [agronomic, setAgronomic] = useState<AgronomicResult | null>(null);

  const latitude = fazendaSelecionada?.latitude;
  const longitude = fazendaSelecionada?.longitude;
  const existingGeojson = fazendaSelecionada?.geojson;

  // Buscar dados agronômicos quando tiver coordenadas
  useEffect(() => {
    if (!latitude || !longitude) return;
    fetchAgronomicData(latitude, longitude).then(setAgronomic).catch(console.error);
  }, [latitude, longitude]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const defaultCenter: L.LatLngExpression = latitude && longitude 
      ? [latitude, longitude] 
      : [-15.7801, -47.9292];

    const defaultZoom = latitude && longitude ? 14 : 4;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      doubleClickZoom: false,
      attributionControl: false,
      zoomSnap: 0.1
    }).setView(defaultCenter, defaultZoom);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const layer = TILE_LAYERS[mapType];
    tileLayerRef.current = L.tileLayer(layer.url, {
      attribution: layer.attribution,
      maxZoom: 19
    }).addTo(map);

    if (existingGeojson) {
      try {
        const geoLayer = L.geoJSON(existingGeojson, {
          style: {
            color: '#16a34a',
            fillColor: 'transparent', 
            fillOpacity: 0,
            weight: 3
          }
        });
        
        geoLayer.eachLayer((layer) => {
          if (layer instanceof L.Polygon) {
            polygonLayerRef.current = layer;
            map.addLayer(layer);
            
            // @ts-ignore
             const farmCoords = layer.getLatLngs()[0].map((p: any) => [p.lat, p.lng]);
            const worldCoords = [[90, -180], [90, 180], [-90, 180], [-90, -180]];
            
            const maskEffect = L.polygon([worldCoords, farmCoords] as any, {
              color: 'transparent',
              fillColor: '#000000',
              fillOpacity: 0.7,
              interactive: false
            }).addTo(map);
            
            maskLayerRef.current = maskEffect;
          }
        });

        const geom = existingGeojson.geometry || existingGeojson;
        if (geom?.type === 'Polygon' && geom.coordinates?.[0]) {
          const latlngs = geom.coordinates[0].slice(0, -1).map((c: number[]) => L.latLng(c[1], c[0]));
          setAreaHectares(calculateAreaHectares(latlngs));
        }
        
        const bounds = geoLayer.getBounds();
        if (bounds.isValid()) {
             map.fitBounds(bounds, { paddingTopLeft: [20, 0], paddingBottomRight: [20, 40] });
        }
        
        setGeojsonData(existingGeojson);
      } catch (e) {
        console.error('Error loading GeoJSON:', e);
      }
    }

    if (latitude && longitude) {
      mainMarkerRef.current = L.marker([latitude, longitude], { icon: defaultIcon })
        .addTo(map)
        .bindPopup(`📍 ${fazendaSelecionada?.nome || 'Fazenda'}`);
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      polygonLayerRef.current = null;
      markersRef.current = [];
      polylineRef.current = null;
    };
  }, []);

  // Sync Tabs/MapType
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    let syncHandler: any = null;

    if (activeTab === 'analysis') {
      if (mainMarkerRef.current) map.removeLayer(mainMarkerRef.current);
      if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
      const layer = TILE_LAYERS['satellite'];
      tileLayerRef.current = L.tileLayer(layer.url, { attribution: layer.attribution }).addTo(map);
      tileLayerRef.current.bringToBack();
      
      if (overlayType === 'none') setOverlayType('ndvi'); 
      if (maskLayerRef.current) maskLayerRef.current.setStyle({ fillOpacity: 1, fillColor: '#000000' }); 
      
      if (polygonLayerRef.current) {
        const bounds = polygonLayerRef.current.getBounds();
        // Enquadra a fazenda respeitando o espaço da legenda (40px na base)
        map.fitBounds(bounds, { paddingTopLeft: [20, 0], paddingBottomRight: [20, 40] });
        
        // Define o zoom mínimo e o comportamento de sincronização (re-centralizar sempre no zoom out)
        setTimeout(() => {
          const minZ = map.getZoom();
          map.setMinZoom(minZ);
          
          syncHandler = () => {
             // Se o zoom atingir o mínimo, força o enquadramento perfeito como no botão "Centralizar"
             if (map.getZoom() <= minZ + 0.01) {
                map.fitBounds(bounds, { paddingTopLeft: [20, 0], paddingBottomRight: [20, 40], animate: true });
             }
          };
          
          map.on('zoomend', syncHandler);
          map.on('moveend', syncHandler);
        }, 500);
      }

    } else {
      if (mainMarkerRef.current) map.addLayer(mainMarkerRef.current);
      // Libera o zoom na aba de mapa e edição
      map.setMinZoom(0);
      
      if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
      const layer = TILE_LAYERS[mapType];
      tileLayerRef.current = L.tileLayer(layer.url, { attribution: layer.attribution }).addTo(map);
      tileLayerRef.current.bringToBack();

      if (maskLayerRef.current) maskLayerRef.current.setStyle({ fillOpacity: 0.7, fillColor: '#000000' });
      if (polygonLayerRef.current) map.fitBounds(polygonLayerRef.current.getBounds(), { paddingTopLeft: [20, 0], paddingBottomRight: [20, 40] });
    }

    return () => {
      if (syncHandler) {
         map.off('zoomend', syncHandler);
         map.off('moveend', syncHandler);
      }
    };
  }, [mapType, activeTab]);

  // Overlay Logic com Cache Inteligente e Alerta de Nuvens
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
    const cacheKey = `${selectedImage.date}_${overlayType}_${fazendaSelecionada?.id || 'temp'}`;

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
        const mapSize = map.getSize();
        const width = Math.min(mapSize.x, 1024);
        const height = Math.min(mapSize.y, 1024);
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
  useEffect(() => {
    if (geojsonData && !loadingImages && availableImages.length === 0) {
      const loadDates = async () => {
        setLoadingImages(true);
        try { 
          const images = await getAvailableDates(geojsonData, 400); 
          setAvailableImages(images); 
        } 
        catch (e) { console.error(e); } 
        finally { setLoadingImages(false); }
      };
      loadDates();
    }
  }, [geojsonData, availableImages.length]);

  useEffect(() => { isDrawingRef.current = isDrawing; }, [isDrawing]);
  useEffect(() => { drawPointsRef.current = drawPoints; }, [drawPoints]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const handleClick = (e: L.LeafletMouseEvent) => {
      if (!isDrawingRef.current) return;
      const newPoint = e.latlng;
      const currentPoints = drawPointsRef.current;
      const newPoints = [...currentPoints, newPoint];
      drawPointsRef.current = newPoints;
      setDrawPoints(newPoints);
      createDraggableMarker(newPoint, newPoints.length - 1, map);
      updatePreview(newPoints, map);
    };
    map.on('click', handleClick);
    return () => { map.off('click', handleClick); };
  }, []);

  const createDraggableMarker = (latlng: L.LatLng, index: number, map: L.Map) => {
    const marker = L.marker(latlng, { icon: editIcon, draggable: true }).addTo(map);
    marker.on('drag', (e) => {
      const newPos = (e.target as L.Marker).getLatLng();
      const currentPts = [...drawPointsRef.current];
      currentPts[index] = newPos;
      drawPointsRef.current = currentPts;
      setDrawPoints(currentPts);
      updatePreview(currentPts, map);
    });
    markersRef.current.push(marker);
  };

  const updatePreview = (points: L.LatLng[], map: L.Map) => {
    if (polylineRef.current) map.removeLayer(polylineRef.current);
    if (polygonLayerRef.current) map.removeLayer(polygonLayerRef.current);
    if (maskLayerRef.current) map.removeLayer(maskLayerRef.current);
    if (points.length > 1) {
      polylineRef.current = L.polyline(points, { color: '#ffffff', weight: 3, dashArray: '10, 10' }).addTo(map);
      const tempPolygon = L.polygon(points, { color: '#16a34a', fillColor: '#22c55e', fillOpacity: 0.2, weight: 2 }).addTo(map);
      polygonLayerRef.current = tempPolygon;
    }
  };

  // Actions
  const startDrawing = () => { if (mapInstanceRef.current) { handleClear(); setIsDrawing(true); setDrawPoints([]); drawPointsRef.current = []; toast('Clique no mapa para marcar pontos', { icon: '📍' }); } };
  const startEditing = () => {
    const map = mapInstanceRef.current;
    if (!map || !geojsonData) return;
    if (polygonLayerRef.current) map.removeLayer(polygonLayerRef.current);
    if (maskLayerRef.current) map.removeLayer(maskLayerRef.current);
    markersRef.current.forEach(m => map.removeLayer(m)); markersRef.current = [];
    const coords = geojsonData.geometry.coordinates[0].slice(0, -1);
    const points = coords.map((c: number[]) => L.latLng(c[1], c[0]));
    drawPointsRef.current = points; setDrawPoints(points); setIsDrawing(true); isDrawingRef.current = true;
    points.forEach((p: L.LatLng, i: number) => createDraggableMarker(p, i, map));
    updatePreview(points, map);
    map.fitBounds(L.latLngBounds(points), { paddingTopLeft: [20, 0], paddingBottomRight: [20, 40] });
    toast('Modo de edição: arraste os pontos', { icon: '✏️' });
  };

  const finishDrawing = () => {
    if (drawPoints.length < 3) return toast.error('Marque pelo menos 3 pontos');
    const map = mapInstanceRef.current;
    if (!map) return;
    markersRef.current.forEach(m => map.removeLayer(m)); markersRef.current = [];
    if (polylineRef.current) { map.removeLayer(polylineRef.current); polylineRef.current = null; }
    const polygon = L.polygon(drawPoints, { color: '#16a34a', fillColor: 'transparent', fillOpacity: 0, weight: 4 }).addTo(map);
    // @ts-ignore
    const farmCoords = drawPoints.map(p => [p.lat, p.lng]);
    const worldCoords = [[90, -180], [90, 180], [-90, 180], [-90, -180]];
    const mask = L.polygon([worldCoords, farmCoords] as any, { color: 'transparent', fillColor: '#000000', fillOpacity: 0.7, interactive: false }).addTo(map);
    maskLayerRef.current = mask; polygonLayerRef.current = polygon;
    const area = calculateAreaHectares(drawPoints);
    setAreaHectares(area); setGeojsonData(pointsToGeoJSON(drawPoints)); setHasChanges(true); setIsDrawing(false); isDrawingRef.current = false;
    map.fitBounds(polygon.getBounds(), { paddingTopLeft: [20, 0], paddingBottomRight: [20, 40] });
    toast.success('Área definida com sucesso!');
  };

  const cancelDrawing = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    markersRef.current.forEach(m => map.removeLayer(m));
    if (polylineRef.current) map.removeLayer(polylineRef.current);
    setIsDrawing(false); isDrawingRef.current = false; setDrawPoints([]);
    if (geojsonData) {
        const geoLayer = L.geoJSON(geojsonData, { style: { color: '#16a34a', fillOpacity: 0, weight: 4 } });
        const layer = geoLayer.getLayers()[0] as L.Polygon;
        if(layer) { polygonLayerRef.current = layer; map.addLayer(layer); 
             // @ts-ignore
             const farmCoords = layer.getLatLngs()[0].map((p: any) => [p.lat, p.lng]);
             const worldCoords = [[90, -180], [90, 180], [-90, 180], [-90, -180]];
             const mask = L.polygon([worldCoords, farmCoords] as any, { color: 'transparent', fillColor: '#000000', fillOpacity: 0.7, interactive: false }).addTo(map);
             maskLayerRef.current = mask;
        }
    } else { setGeojsonData(null); }
    toast('Edição cancelada');
  };

  const handleClear = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (polygonLayerRef.current) { map.removeLayer(polygonLayerRef.current); polygonLayerRef.current = null; }
    if (maskLayerRef.current) { map.removeLayer(maskLayerRef.current); maskLayerRef.current = null; }
    setAreaHectares(null); setGeojsonData(null); setHasChanges(false);
  };

  const handleSave = async () => {
    if (!fazendaSelecionada?.id || !geojsonData) return;
    setSaving(true);
    try { await genericUpdate('fazendas', fazendaSelecionada.id, { geojson: geojsonData }); setHasChanges(false); toast.success('Mapa da fazenda salvo!'); } 
    catch (e) { console.error(e); toast.error('Erro ao salvar'); } finally { setSaving(false); }
  };

  const handleLocateMe = () => {
     if (!mapInstanceRef.current) return;
     mapInstanceRef.current.locate({ setView: true, maxZoom: 16 });
     toast('Buscando sua localização...', { icon: '📍' });
  };

  const onExportPNG = () => handleExportPNG({
    currentOverlayUrl,
    geojsonData,
    overlayType,
    areaHectares,
    availableImages,
    selectedImageIndex,
    fazendaNome: fazendaSelecionada?.nome || 'Fazenda',
    setLoadingImages,
  });

  const handleFocusArea = () => {
    if (!mapInstanceRef.current || !polygonLayerRef.current) return toast('Nenhuma área demarcada');
    mapInstanceRef.current.fitBounds(polygonLayerRef.current.getBounds(), { paddingTopLeft: [20, 0], paddingBottomRight: [20, 40] });
  };

  return (
    <div className="space-y-4 p-4 pb-24 font-inter min-h-screen relative">
    <MapHeader 
      hasChanges={hasChanges} 
      saving={saving} 
      onSave={handleSave} 
      onBack={() => setTela('principal')} 
      fazendaNome={fazendaSelecionada?.nome}
      recCode={fazendaSelecionada?.config?.regional?.rec}
    />
      
      {showCalendar && (
        <SatelliteCalendar
          calendarMonth={calendarMonth}
          setCalendarMonth={setCalendarMonth}
          availableImages={availableImages}
          selectedImageIndex={selectedImageIndex}
          setSelectedImageIndex={setSelectedImageIndex}
          setShowCalendar={setShowCalendar}
        />
      )}

      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
        <button onClick={() => setActiveTab('map')} className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${activeTab === 'map' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          <Layers className="w-4 h-4" /> Mapa e Edição
        </button>
        <button onClick={() => setActiveTab('analysis')} disabled={!geojsonData} className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${activeTab === 'analysis' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700 disabled:opacity-50'}`}>
          <Satellite className="w-4 h-4" /> Análise de Satélite
        </button>
      </div>

            {activeTab === 'analysis' && (
        <div className="space-y-3 animate-in slide-in-from-top-2">
            <div className="grid grid-cols-2 gap-3">
                {/* 1. AREA CARD */}
                <div className="bg-white h-12 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center px-3">
                    <div className="flex items-center gap-1 text-green-600 mb-0.5">
                        <Maximize2 className="w-2.5 h-2.5" />
                        <span className="text-[7.5px] font-black uppercase tracking-widest">Área Monitorada</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-[13px] font-black text-gray-800">
                            {areaHectares ? areaHectares.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : '--'}
                        </span>
                        <span className="text-[8px] font-black text-green-600/70 uppercase">ha</span>
                    </div>
                </div>

                {/* 2. DATE SELECTOR CARD */}
                <div 
                onClick={() => availableImages.length > 0 && setShowCalendar(true)}
                className={`bg-white h-12 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center relative transition-all active:scale-95 px-3 ${availableImages.length > 0 ? 'cursor-pointer hover:bg-green-50/50 hover:border-green-100' : ''}`}
                >
                {availableImages.length > 0 ? (
                    <>
                    <div className="flex flex-col items-center justify-center w-full">
                         <div className="flex items-center gap-1 text-green-600 mb-0.5">
                            <Calendar className="w-2.5 h-2.5" />
                            <span className="text-[7.5px] font-black uppercase tracking-widest">Histórico</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-[13px] font-black text-gray-800">
                                {availableImages[selectedImageIndex]?.date ? 
                                availableImages[selectedImageIndex].date.split('-').reverse().join('/') : 
                                '--/--/----'}
                            </span>
                            <div className="bg-green-50 rounded-full p-0.5">
                                <ChevronDown className="w-2.5 h-2.5 text-green-700" />
                            </div>
                        </div>
                    </div>
                    {loadingImages && <div className="absolute top-1 right-1"><Loader2 className="w-2 h-2 animate-spin text-green-500" /></div>}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400">
                        <div className="flex items-center gap-1">
                            {loadingImages ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Calendar className="w-2.5 h-2.5" />}
                            <span className="text-[8px] font-medium">{loadingImages ? '...' : 'Vazio'}</span>
                        </div>
                    </div>
                )}
                </div>
            </div>

        </div>
      )}
 
       {activeTab === 'map' && (
         <div className="space-y-3 animate-in slide-in-from-top-2 mb-3">
             <div className="grid grid-cols-2 gap-3">
                 {/* 1. AREA CARD */}
                 <div className="bg-white h-12 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center px-3">
                     <div className="flex items-center gap-1 text-green-600 mb-0.5">
                         <Maximize2 className="w-2.5 h-2.5" />
                         <span className="text-[7.5px] font-black uppercase tracking-widest">Área Monitorada</span>
                     </div>
                     <div className="flex items-center gap-1">
                         <span className="text-[13px] font-black text-gray-800">
                             {areaHectares ? areaHectares.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : '--'}
                         </span>
                         <span className="text-[8px] font-black text-green-600/70 uppercase">ha</span>
                     </div>
                 </div>
 
                 {/* 2. MODIFY ACTION CARD */}
                 {!isDrawing && rolePermissions?.actions?.mapa_edicao !== false && (
                   geojsonData ? (
                     <div 
                       onClick={startEditing}
                       className="bg-white h-12 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center relative transition-all active:scale-95 px-3 cursor-pointer hover:bg-green-50/50 hover:border-green-100"
                     >
                       <div className="flex flex-col items-center justify-center w-full">
                           <div className="flex items-center gap-1 text-green-600 mb-0.5">
                               <Maximize2 className="w-2.5 h-2.5" />
                               <span className="text-[7.5px] font-black uppercase tracking-widest">Ajustes</span>
                           </div>
                           <div className="flex items-center gap-1">
                               <span className="text-[13px] font-black text-green-700">Modificar</span>
                               <div className="bg-green-50 rounded-full p-0.5 ml-1">
                                   <ChevronRight className="w-2.5 h-2.5 text-green-700" />
                               </div>
                           </div>
                       </div>
                     </div>
                   ) : (
                     <div 
                       onClick={startDrawing}
                       className="bg-green-600 h-12 rounded-xl border border-green-500 shadow-md flex flex-col items-center justify-center relative transition-all active:scale-95 px-3 cursor-pointer hover:bg-green-700"
                     >
                       <div className="flex flex-col items-center justify-center w-full text-white">
                           <div className="flex items-center gap-1 mb-0.5">
                             <Plus className="w-3 h-3" />
                             <span className="text-[7.5px] font-black uppercase tracking-widest">Delimitar Divisa</span>
                           </div>
                           <span className="text-[13px] font-black uppercase">Desenhar Área</span>
                       </div>
                     </div>
                   )
                 )}
             </div>
         </div>
       )}
 

      <div className="flex-1 w-full flex flex-col h-[calc(100vh-14rem)]">
        <div className="bg-white rounded-t-xl border-t border-x border-gray-200 px-3 sm:px-6 py-4 flex items-center justify-between z-10 relative">
            <div className="flex items-center gap-3 w-full justify-between">
                {activeTab === 'map' ? (
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-4">
                            <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
                                {(['street', 'satellite'] as const).map(t => (
                                    <button key={t} onClick={() => setMapType(t)} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${mapType === t ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
                                    {t === 'street' ? 'Mapa' : 'Satélite'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-2">
                             <button onClick={handleLocateMe} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="Minha Localização">
                                <Locate className="w-5 h-5" />
                             </button>
                        </div>
                     </div>
                ) : (
                    <div className="flex flex-col w-full gap-1.5">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Índices Visuais</span>
                            <div className="h-px flex-1 bg-gray-100 ml-3 hidden sm:block" />
                        </div>
                        <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5 overflow-x-auto no-scrollbar">
                            {[
                                { id: 'savi', label: 'SAVI' },
                                { id: 'ndvi', label: 'NDVI' },
                                { id: 'evi', label: 'EVI' },
                                { id: 'ndre', label: 'NDRE' },
                                { id: 'ndmi', label: 'NDMI' },
                                { id: 'truecolor', label: 'REAL' }
                            ].map(idx => (
                                <button 
                                  key={idx.id} 
                                  onClick={() => setOverlayType(idx.id as OverlayType)} 
                                  className={`flex-1 min-w-[48px] px-1 py-1.5 text-[9px] font-black rounded-lg transition-all whitespace-nowrap ${overlayType === idx.id ? 'bg-green-600 shadow-sm text-white' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                {idx.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>

        <div className="relative isolate z-0 overflow-hidden bg-gray-100 border border-gray-200 shadow-sm h-[500px] rounded-xl">
            <div ref={mapRef} className="absolute inset-0 z-0" style={{ cursor: isDrawing ? 'crosshair' : 'default' }} />
            
            {/* Focus Area Button */}
            {geojsonData && (
                <div className="absolute bottom-20 right-2.5 flex flex-col gap-2 z-[900]">
                    {activeTab === 'analysis' && currentOverlayUrl && (
                        <button 
                          onClick={onExportPNG}
                          disabled={loadingImages}
                          className="bg-green-600 p-2 rounded-md shadow-md hover:bg-green-700 text-white transition-colors disabled:opacity-50"
                          title="Exportar PNG (Área Demarcada)"
                        >
                          {loadingImages ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        </button>
                    )}
                    <button 
                      onClick={handleFocusArea}
                      className="bg-white p-2 rounded-md shadow-md hover:bg-gray-50 border border-gray-300 text-gray-700 transition-colors"
                      title="Centralizar Área Demarcada"
                    >
                      <Scan className="w-4 h-4" />
                    </button>
                </div>
            )}

            {isDrawing && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-green-100 flex items-center gap-4 z-[1000] animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-2 text-green-800 text-sm font-bold"><MousePointerClick className="w-4 h-4" /><span>{drawPoints.length} pontos</span></div>
                    <div className="h-4 w-px bg-gray-300" />
                    <div className="flex items-center gap-1">
                        <button onClick={finishDrawing} className="p-1.5 bg-green-600 text-white rounded-full hover:bg-green-700 transition" title="Finalizar"><Check className="w-4 h-4" /></button>
                        <button onClick={() => { const pts = [...drawPoints]; pts.pop(); markersRef.current.pop()?.remove(); setDrawPoints(pts); drawPointsRef.current = pts; updatePreview(pts, mapInstanceRef.current!); }} className="p-1.5 bg-gray-200 text-gray-600 rounded-full hover:bg-gray-300 transition" title="Desfazer"><Undo2 className="w-4 h-4" /></button>
                        <button onClick={cancelDrawing} className="p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition" title="Cancelar"><X className="w-4 h-4" /></button>
                    </div>
                </div>
            )}
            {activeTab === 'analysis' && showOverlay && <MapLegend type={overlayType} />}
            {loadingImages && <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-lg flex items-center gap-3 z-[1000] border border-gray-100"><Loader2 className="w-4 h-4 animate-spin text-green-600" /><span className="text-xs font-bold text-gray-600">Processando...</span></div>}
        </div>




      </div>

      {/* 3. TELEMETRY CARD - Dicionário de Índices */}
      <TelemetryCard activeTab={activeTab} />

      {/* 4. AGRONOMIC INTELLIGENCE CARD - Inteligência Agronômica */}
      {activeTab === 'analysis' && (
        <AgronomicIntelligenceCard 
          agronomic={agronomic} 
          loading={false} 
        />
      )}


       <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .leaflet-container { background: #f3f4f6 !important; }
        .leaflet-top.leaflet-left { display: none !important; }
      `}</style>
    </div>
  );
}
