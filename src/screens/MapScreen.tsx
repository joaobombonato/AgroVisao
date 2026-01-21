import React, { useState, useEffect, useRef } from 'react';
import { Satellite, Save, Maximize2, ArrowLeft, Layers, Loader2, Plus, Check, X, Undo2, Calendar, ChevronLeft, ChevronRight, MousePointerClick, MapPinned, Locate, Scan } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { toast } from 'react-hot-toast'; // Restaurando Toast
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  getNDVIImage,
  getTrueColorImage,
  getEVIImage,
  getAvailableDates
} from '../services/satelliteService';

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

type OverlayType = 'none' | 'ndvi' | 'truecolor' | 'falsecolor' | 'evi';

function calculateAreaHectares(latlngs: L.LatLng[]): number {
  if (latlngs.length < 3) return 0;
  const EARTH_RADIUS = 6378137;
  const toRad = (deg: number) => deg * Math.PI / 180;
  let total = 0;
  const n = latlngs.length;
  for (let i = 0; i < n; i++) {
    const p1 = latlngs[i];
    const p2 = latlngs[(i + 1) % n];
    total += toRad(p2.lng - p1.lng) * (2 + Math.sin(toRad(p1.lat)) + Math.sin(toRad(p2.lat)));
  }
  const area = Math.abs(total * EARTH_RADIUS * EARTH_RADIUS / 2);
  return area / 10000;
}

function pointsToGeoJSON(points: L.LatLng[]): any {
  if (points.length < 3) return null;
  const coordinates = points.map(p => [p.lng, p.lat]);
  coordinates.push(coordinates[0]);
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [coordinates]
    }
  };
}

export default function MapScreen() {
  const { setTela, fazendaSelecionada, genericUpdate } = useAppContext();
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const polygonLayerRef = useRef<L.Polygon | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
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
  
  const [activeTab, setActiveTab] = useState<'map' | 'analysis'>('map');
  const [overlayType, setOverlayType] = useState<OverlayType>('none');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [loadingImages, setLoadingImages] = useState(false);
  const [currentOverlayUrl, setCurrentOverlayUrl] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);

  const latitude = fazendaSelecionada?.latitude;
  const longitude = fazendaSelecionada?.longitude;
  const existingGeojson = fazendaSelecionada?.geojson;

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
      attributionControl: false
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
             map.fitBounds(bounds, { padding: [50, 50] });
        }
        
        setGeojsonData(existingGeojson);
      } catch (e) {
        console.error('Error loading GeoJSON:', e);
      }
    }

    if (latitude && longitude) {
      L.marker([latitude, longitude], { icon: defaultIcon })
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

    if (activeTab === 'analysis') {
      if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
      const layer = TILE_LAYERS['satellite'];
      tileLayerRef.current = L.tileLayer(layer.url, { attribution: layer.attribution }).addTo(map);
      tileLayerRef.current.bringToBack();
      
      if (overlayType === 'none') setOverlayType('ndvi'); 
      if (maskLayerRef.current) maskLayerRef.current.setStyle({ fillOpacity: 1, fillColor: '#000000' }); 
      if (polygonLayerRef.current) map.fitBounds(polygonLayerRef.current.getBounds(), { padding: [20, 20] });

    } else {
      if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
      const layer = TILE_LAYERS[mapType];
      tileLayerRef.current = L.tileLayer(layer.url, { attribution: layer.attribution }).addTo(map);
      tileLayerRef.current.bringToBack();

      if (maskLayerRef.current) maskLayerRef.current.setStyle({ fillOpacity: 0.7, fillColor: '#000000' });
      if (polygonLayerRef.current) map.fitBounds(polygonLayerRef.current.getBounds(), { padding: [50, 50] });
    }
  }, [mapType, activeTab]);

  // Overlay Logic
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !polygonLayerRef.current) return;
    if (imageOverlayRef.current) { map.removeLayer(imageOverlayRef.current); imageOverlayRef.current = null; }
    if (currentOverlayUrl) { URL.revokeObjectURL(currentOverlayUrl); setCurrentOverlayUrl(null); }
    if (overlayType === 'none' || !showOverlay || !geojsonData || activeTab !== 'analysis') return;
    if (availableDates.length === 0) return;
    const selectedDate = availableDates[selectedDateIndex];
    if (!selectedDate) return;

    const loadOverlayImage = async () => {
      setLoadingImages(true);
      try {
        const mapSize = map.getSize();
        const width = Math.min(mapSize.x, 1024);
        const height = Math.min(mapSize.y, 1024);
        let imageUrl = null;
        if (overlayType === 'ndvi') imageUrl = await getNDVIImage(geojsonData, selectedDate, width, height);
        else if (overlayType === 'evi') imageUrl = await getEVIImage(geojsonData, selectedDate, width, height);
        else if (overlayType === 'truecolor') imageUrl = await getTrueColorImage(geojsonData, selectedDate, width, height);

        if (imageUrl) {
          setCurrentOverlayUrl(imageUrl);
          imageOverlayRef.current = L.imageOverlay(imageUrl, polygonLayerRef.current!.getBounds(), { opacity: 0.9, interactive: false }).addTo(map);
          imageOverlayRef.current.bringToFront();
          polygonLayerRef.current!.bringToFront();
        }
      } catch (error) { console.error(error); toast.error('Erro ao carregar imagem'); } 
      finally { setLoadingImages(false); }
    };
    loadOverlayImage();
  }, [overlayType, selectedDateIndex, showOverlay, availableDates, geojsonData, activeTab]);

  // Load Dates
  useEffect(() => {
    if (geojsonData && !loadingImages && availableDates.length === 0) {
      const loadDates = async () => {
        setLoadingImages(true);
        try { const dates = await getAvailableDates(geojsonData, 60); setAvailableDates(dates); } 
        catch (e) { console.error(e); } 
        finally { setLoadingImages(false); }
      };
      loadDates();
    }
  }, [geojsonData]);

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
    map.fitBounds(L.latLngBounds(points), { padding: [50, 50] });
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
    map.fitBounds(polygon.getBounds(), { padding: [50, 50] });
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

  const handleFocusArea = () => {
    if (!mapInstanceRef.current || !polygonLayerRef.current) return toast('Nenhuma área demarcada');
    mapInstanceRef.current.fitBounds(polygonLayerRef.current.getBounds(), { padding: [0, 0] });
  };

  const Header = () => (
    <div className="flex items-center justify-between mb-4 pb-2 border-b pl-2 pr-2">
      <div className="flex items-center gap-2">
         <MapPinned className="w-7 h-7 text-green-700" />
         <h1 className="text-xl font-bold text-gray-800">Mapas e Satélite</h1>
      </div>
      <div className="flex items-center gap-2">
         {hasChanges && (
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-full transition-colors shadow-sm disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
            </button>
         )}
         <button onClick={() => setTela('principal')} className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-blue-600 bg-gray-100 px-3 py-1.5 rounded-full transition-colors">
            <ArrowLeft className="w-4 h-4 ml-1" /> Voltar
         </button>
      </div>
    </div>
  );

  const Legend = ({ type }: { type: OverlayType }) => {
    if (type === 'none' || type === 'truecolor' || type === 'falsecolor') return null;
    return (
      <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-md px-3 py-2 rounded-xl z-[900] flex flex-col gap-1 w-[300px] border border-white/10 shadow-xl pointer-events-none">
        <div className="flex justify-between text-[8px] text-gray-300 font-bold px-0.5 tracking-wider uppercase">
          <span>Menor Densidade</span>
          <span>Maior Densidade</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-[#8B4513] via-[#FFD700] to-[#006400]" />
      </div>
    );
  };

  return (
    <div className="space-y-4 p-4 pb-24 font-inter min-h-screen">
      <Header />
      
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
        <button onClick={() => setActiveTab('map')} className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${activeTab === 'map' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          <Layers className="w-4 h-4" /> Mapa e Edição
        </button>
        <button onClick={() => setActiveTab('analysis')} disabled={!geojsonData} className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${activeTab === 'analysis' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700 disabled:opacity-50'}`}>
          <Satellite className="w-4 h-4" /> Análise de Satélite
        </button>
      </div>

      {activeTab === 'analysis' && (
        <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2">
            {/* 1. AREA CARD - COMPACT */}
            <div className="bg-white py-2 px-3 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center">
                 <div className="flex items-center gap-1.5 mb-0.5">
                    <Maximize2 className="w-3 h-3 text-green-600" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Área Monitorada</span>
                 </div>
                 <span className="text-lg font-black text-gray-800">
                    {areaHectares ? areaHectares.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : '--'} <span className="text-[10px] font-medium text-gray-500">ha</span>
                 </span>
            </div>

            {/* 2. DATE SELECTOR CARD - COMPACT */}
            <div className="bg-white py-1 px-2 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center relative">
               {availableDates.length > 0 ? (
                 <>
                   <div className="flex items-center justify-between w-full">
                      <button onClick={() => setSelectedDateIndex(Math.min(availableDates.length-1, selectedDateIndex+1))} disabled={selectedDateIndex>=availableDates.length-1} className="p-1 hover:bg-gray-100 rounded-lg disabled:opacity-20"><ChevronLeft className="w-4 h-4 text-gray-500" /></button>
                      <div className="text-center">
                         <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                             <Calendar className="w-3 h-3" /> Data Imagem
                         </div>
                         <div className="text-sm font-black text-green-700 leading-tight">
                             {new Date(availableDates[selectedDateIndex]).toLocaleDateString('pt-BR')}
                         </div>
                      </div>
                      <button onClick={() => setSelectedDateIndex(Math.max(0, selectedDateIndex-1))} disabled={selectedDateIndex<=0} className="p-1 hover:bg-gray-100 rounded-lg disabled:opacity-20"><ChevronRight className="w-4 h-4 text-gray-500" /></button>
                   </div>
                   {loadingImages && <div className="absolute top-1 right-1"><Loader2 className="w-2.5 h-2.5 animate-spin text-green-500" /></div>}
                 </>
               ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 py-1">
                      <div className="flex items-center gap-1.5">
                          {loadingImages ? <Loader2 className="w-3 h-3 animate-spin" /> : <Calendar className="w-3 h-3" />}
                          <span className="text-[10px] font-medium">{loadingImages ? 'Buscando...' : 'Sem imagens'}</span>
                      </div>
                  </div>
               )}
            </div>
        </div>
      )}

      <div className="flex-1 w-full flex flex-col h-[calc(100vh-14rem)]">
        <div className="bg-white rounded-t-xl border-t border-x border-gray-200 px-6 py-4 flex items-center justify-between z-10 relative">
            <div className="flex items-center gap-3 w-full justify-between">
                {activeTab === 'map' ? (
                     <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-4">
                            {areaHectares !== null && (
                                <div className="text-xs font-bold text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-100 flex items-center gap-1">
                                <Maximize2 className="w-3 h-3" />
                                {areaHectares.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ha
                                </div>
                            )}
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
                             {!isDrawing && (
                                 geojsonData ? (
                                    <button onClick={startEditing} className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors font-bold text-sm">
                                        <Maximize2 className="w-4 h-4" /> Modificar
                                    </button>
                                    ) : (
                                    <button onClick={startDrawing} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 shadow-sm transition-all">
                                        <Plus className="w-4 h-4" /> Desenhar
                                    </button>
                                    )
                             )}
                        </div>
                     </div>
                ) : (
                    <div className="flex items-center justify-center w-full gap-4">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest hidden sm:block">Índice Visual</span>
                        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
                            {[
                                { id: 'ndvi', label: 'NDVI' },
                                { id: 'evi', label: 'EVI' },
                                { id: 'truecolor', label: 'Real' }
                            ].map(idx => (
                                <button key={idx.id} onClick={() => setOverlayType(idx.id as OverlayType)} className={`px-6 py-1.5 text-xs font-bold rounded-md transition-all ${overlayType === idx.id ? 'bg-green-600 shadow text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                                {idx.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>

        <div className={`flex-1 relative isolate z-0 overflow-hidden bg-gray-100 border border-gray-200 shadow-sm ${isDrawing ? 'rounded-xl' : 'rounded-b-xl'}`}>
            <div ref={mapRef} className="absolute inset-0 z-0" style={{ cursor: isDrawing ? 'crosshair' : 'default' }} />
            
            {/* Focus Area Button */}
            {geojsonData && (
                <button 
                  onClick={handleFocusArea}
                  className="absolute bottom-20 right-2.5 bg-white p-2 rounded-md shadow-md hover:bg-gray-50 border border-gray-300 z-[900] text-gray-700 transition-colors"
                  title="Centralizar Área Demarcada"
                >
                  <Scan className="w-4 h-4" />
                </button>
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
            {activeTab === 'analysis' && showOverlay && <Legend type={overlayType} />}
            {loadingImages && <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-lg flex items-center gap-3 z-[1000] border border-gray-100"><Loader2 className="w-4 h-4 animate-spin text-green-600" /><span className="text-xs font-bold text-gray-600">Processando...</span></div>}
        </div>
      </div>

       <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .leaflet-container { background: #f3f4f6 !important; }
      `}</style>
    </div>
  );
}
