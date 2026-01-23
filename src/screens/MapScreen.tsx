import React, { useState, useEffect, useRef } from 'react';
import { Satellite, Save, Maximize2, ArrowLeft, Layers, Loader2, Plus, Check, X, Undo2, Calendar, ChevronLeft, ChevronRight, ChevronDown, MousePointerClick, MapPinned, Locate, Scan, Download, CloudRain, AlertTriangle, BookOpen, Droplets } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { toast } from 'react-hot-toast'; // Restaurando Toast
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

type OverlayType = 'none' | 'ndvi' | 'truecolor' | 'savi' | 'evi' | 'ndre' | 'ndmi';

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

  const handleExportPNG = async () => {
    if (!currentOverlayUrl || !geojsonData) return toast.error('Carregue uma imagem primeiro');
    
    setLoadingImages(true);
    try {
      // 1. CARREGAR IMAGENS
      const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = reject;
      });

      const [satImg, logoImg, devImg] = await Promise.all([
        loadImage(currentOverlayUrl),
        loadImage('/logo-full.png'),
        loadImage('/logo-full-praticoapp.png')
      ]);
      
      // CONFIGURAÇÕES DO RELATÓRIO
      const headerHeight = 110;
      const footerHeight = 110;
      const padding = 50;
      const canvasWidth = satImg.width + (padding * 2);
      const canvasHeight = satImg.height + headerHeight + footerHeight;

      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // FUNDO TRANSPARENTE (Não preenchemos com branco)
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      // 1. CABEÇALHO (INVERTIDO: INFO À ESQUERDA, LOGO À DIREITA)
      const dateRaw = availableImages[selectedImageIndex]?.date || 'Data';
      const [year, month, day] = dateRaw.split('-');
      const dateBR = `${day}/${month}/${year}`;
      const dateFile = `${day}-${month}-${year}`;
      
      // Dados discretos (Esquerda)
      ctx.textAlign = 'left';
      ctx.fillStyle = '#374151'; // Cinza escuro elegante
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(fazendaSelecionada?.nome || 'Fazenda', padding, 60);
      
      const displayType = overlayType === 'truecolor' ? 'REAL' : overlayType.toUpperCase();
      
      ctx.font = 'normal 13px sans-serif';
      ctx.fillStyle = '#6b7280';
      const areaText = areaHectares ? areaHectares.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00';
      ctx.fillText(`ANÁLISE: ${displayType}  |  IMAGEM: ${dateBR}`, padding, 82);
      ctx.fillText(`ÁREA MONITORADA: ${areaText} ha`, padding, 100);

      // Logo AgroVisão (Direita)
      const logoW = 150; 
      const logoH = (logoImg.height / logoImg.width) * logoW;
      ctx.drawImage(logoImg, canvasWidth - padding - logoW, 40, logoW, logoH);

      ctx.textAlign = 'left';

      // 2. MAPA (RECORTE + FUNDO INTERNO BRANCO)
      ctx.save();
      ctx.translate(padding, headerHeight);

      ctx.beginPath();
      const coords = geojsonData.geometry?.coordinates[0] || geojsonData.coordinates[0];
      const lngs = coords.map((c: any) => c[0]);
      const lats = coords.map((c: any) => c[1]);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const wLng = maxLng - minLng;
      const hLat = maxLat - minLat;
      
      coords.forEach((c: any, i: number) => {
        const x = ((c[0] - minLng) / wLng) * satImg.width;
        const y = (1 - (c[1] - minLat) / hLat) * satImg.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      
      // AQUI ESTÁ O TRUQUE: Preencher com branco ANTES do satélite
      // Assim, onde tiver nuvem (transparência), aparecerá o branco por baixo
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Clip e desenho
      ctx.save();
      ctx.clip();
      ctx.drawImage(satImg, 0, 0);
      ctx.restore();

      // Contorno Marrom Café Técnico (Elegante)
      ctx.strokeStyle = '#5d4037';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // 3. ASSINATURA PRÁTICO APP (CANTO DIREITO)
      const devW = 85; 
      const devH = (devImg.height / devImg.width) * devW;
      
      ctx.textAlign = 'right';
      ctx.fillStyle = '#9ca3af';
      ctx.font = 'normal 9px sans-serif';
      ctx.fillText('DESENVOLVIDO POR:', canvasWidth - padding, canvasHeight - footerHeight - devH - 5);
      
      ctx.globalAlpha = 0.9;
      ctx.drawImage(devImg, canvasWidth - padding - devW, canvasHeight - footerHeight - devH + 5, devW, devH);
      ctx.globalAlpha = 1.0;

      // 4. RODAPÉ E LEGENDA (APENAS SE NÃO FOR REAL)
      if (overlayType !== 'truecolor') {
        ctx.beginPath();
        
        const legendW = 300;
        const legendH = 12;
        const legendX = (canvasWidth / 2) - (legendW / 2);
        const legendY = canvasHeight - 65;

        ctx.fillStyle = '#6b7280';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('MENOR DENSIDADE', legendX, legendY - 12);
        
        ctx.textAlign = 'right';
        ctx.fillText('MAIOR DENSIDADE', legendX + legendW, legendY - 12);

        const grad = ctx.createLinearGradient(legendX, 0, legendX + legendW, 0);
        grad.addColorStop(0, '#8B4513');
        grad.addColorStop(0.2, '#CD4F39');
        grad.addColorStop(0.4, '#FFD700');
        grad.addColorStop(0.7, '#32CD32');
        grad.addColorStop(1, '#006400');
        
        ctx.fillStyle = grad;
        if (ctx.roundRect) {
           ctx.roundRect(legendX, legendY, legendW, legendH, 6);
           ctx.fill();
        } else {
           ctx.fillRect(legendX, legendY, legendW, legendH);
        }
      }
      
      // Watermark técnica (CENTRALIZADA NO FINAL)
      ctx.textAlign = 'center';
      ctx.font = 'italic 10px sans-serif';
      ctx.fillStyle = '#9ca3af';
      ctx.fillText('Processamento Técnico via Sentinel-2 | AgroVisão', canvasWidth / 2, canvasHeight - 25);
      
      ctx.textAlign = 'left'; // Reset final

      // 4. DOWNLOAD INTELIGENTE
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const fileName = `AgroVisão ${displayType} ${dateFile} - ${fazendaSelecionada?.nome || 'Fazenda'}.png`;

        try {
          if ('showSaveFilePicker' in window) {
            // @ts-ignore
            const h = await window.showSaveFilePicker({ suggestedName: fileName, types: [{ description: 'PNG', accept: { 'image/png': ['.png'] } }] });
            const w = await h.createWritable();
            await w.write(blob);
            await w.close();
            return;
          }
          if (navigator.share) {
            await navigator.share({ files: [new File([blob], fileName, { type: 'image/png' })], title: fileName });
            return;
          }
          const u = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = u; a.download = fileName; a.click();
          setTimeout(() => URL.revokeObjectURL(u), 2000);
        } catch (err: any) {
           if (err.name !== 'AbortError') console.error(err);
        }
      }, 'image/png');
      
    } catch (e) {
      console.error(e);
      toast.error('Erro ao exportar');
    } finally {
      setLoadingImages(false);
    }
  };

  const handleFocusArea = () => {
    if (!mapInstanceRef.current || !polygonLayerRef.current) return toast('Nenhuma área demarcada');
    mapInstanceRef.current.fitBounds(polygonLayerRef.current.getBounds(), { paddingTopLeft: [20, 0], paddingBottomRight: [20, 40] });
  };

  const SatelliteCalendar = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    
    // Limites de navegação (13 meses)
    const today = new Date();
    const minDate = new Date();
    minDate.setMonth(today.getMonth() - 13);
    
    const isAtMax = year >= today.getFullYear() && month >= today.getMonth();
    const isAtMin = year <= minDate.getFullYear() && month <= minDate.getMonth();
    
    // Função para navegar entre os meses
    const prevMonth = () => !isAtMin && setCalendarMonth(new Date(year, month - 1, 1));
    const nextMonth = () => !isAtMax && setCalendarMonth(new Date(year, month + 1, 1));
    
    // Nome do mês formatado
    const monthName = new Date(year, month).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    
    return (
      <div className="absolute inset-0 z-[1001] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-white/20">
          <div className="bg-green-700 p-6 text-white flex justify-between items-center bg-gradient-to-br from-green-700 to-green-800">
             <div>
                <h3 className="text-lg font-black tracking-tight capitalize">{monthName}</h3>
                <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Selecione uma imagem
                </p>
             </div>
             <div className="flex gap-1">
                <button onClick={prevMonth} disabled={isAtMin} className={`p-2 rounded-xl transition-colors ${isAtMin ? 'opacity-20 cursor-default' : 'hover:bg-white/20'}`}><ChevronLeft className="w-5 h-5" /></button>
                <button onClick={nextMonth} disabled={isAtMax} className={`p-2 rounded-xl transition-colors ${isAtMax ? 'opacity-20 cursor-default' : 'hover:bg-white/20'}`}><ChevronRight className="w-5 h-5" /></button>
                <button onClick={() => setShowCalendar(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors ml-1"><X className="w-5 h-5" /></button>
             </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-7 gap-1 text-center mb-4">
               {['D','S','T','Q','Q','S','S'].map((d, i) => <span key={`${d}-${i}`} className="text-[10px] font-black text-gray-400 uppercase">{d}</span>)}
            </div>
            
            <div className="grid grid-cols-7 gap-2 text-center">
               {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
               {Array.from({ length: days }).map((_, i) => {
                 const day = i + 1;
                 const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                 const imgInfo = availableImages.find(img => img.date === dateStr);
                 const hasImage = !!imgInfo;
                 const isSelected = availableImages[selectedImageIndex]?.date === dateStr;
                 
                 return (
                   <button 
                     key={day}
                     disabled={!hasImage}
                     onClick={() => {
                        const idx = availableImages.findIndex(img => img.date === dateStr);
                        if (idx !== -1) {
                           setSelectedImageIndex(idx);
                           setShowCalendar(false);
                        }
                     }}
                     className={`
                       relative aspect-square flex items-center justify-center rounded-xl text-xs font-bold transition-all
                       ${hasImage ? 'hover:scale-110 active:scale-95 shadow-sm' : 'text-gray-200 cursor-default pointer-events-none'}
                       ${isSelected ? 'bg-green-600 text-white shadow-lg shadow-green-200 ring-2 ring-green-100' : hasImage ? 'bg-green-50 text-green-700 border border-green-100' : ''}
                     `}
                   >
                     {day}
                     {hasImage && !isSelected && (
                        <div className="absolute bottom-1 w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                     )}
                   </button>
                 );
               })}
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 border-t flex items-center justify-center gap-5 border-dashed">
             <div className="flex items-center gap-1.5 font-bold text-[9px] text-gray-500 uppercase tracking-widest">
                <div className="w-2 h-2 bg-green-500 rounded-full shadow-sm shadow-green-200" /> Disponível
             </div>
             <div className="flex items-center gap-1.5 font-bold text-[9px] text-gray-500 uppercase tracking-widest">
                <div className="w-2 h-2 bg-gray-200 rounded-full" /> Indisponível
             </div>
          </div>
        </div>
      </div>
    );
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
    if (type === 'none' || type === 'truecolor') return null;
    
    // Cores padronizadas para cada tipo de índice
    const gradients: Record<string, string> = {
      savi: 'from-[#8B4513] via-[#FFD700] to-[#228B22]', // SAVI: Solo a Verde
      ndvi: 'from-[#8B4513] via-[#FFD700] to-[#006400]', // NDVI: Padrão
      evi: 'from-[#8B4513] via-[#FFD700] to-[#006400]',  // EVI: Padrão
      ndre: 'from-[#8B4513] via-[#FF8C00] to-[#006400]', // NDRE: Nitrogênio
      ndmi: 'from-[#FF4500] via-[#F0E68C] to-[#0000FF]', // NDMI: Seco -> Úmido (Laranja -> Amarelo -> Azul)
    };

    const labels: Record<string, [string, string]> = {
      ndmi: ['Estresse Hídrico', 'Solo Úmido'],
      default: ['Menor Densidade', 'Maior Densidade']
    };

    const currentLabels = labels[type] || labels.default;

    return (
      <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-md px-3 py-2 rounded-xl z-[900] flex flex-col gap-1 w-[260px] border border-white/10 shadow-xl pointer-events-none animate-in fade-in slide-in-from-left-2">
        <div className="flex justify-between text-[7px] text-white/50 font-black px-0.5 tracking-wider uppercase">
          <span>{currentLabels[0]}</span>
          <span>{currentLabels[1]}</span>
        </div>
        <div className={`h-1.5 w-full rounded-full bg-gradient-to-r ${gradients[type] || gradients.ndvi}`} />
      </div>
    );
  };

  return (
    <div className="space-y-4 p-4 pb-24 font-inter min-h-screen relative">
      <Header />
      
      {showCalendar && <SatelliteCalendar />}

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
                 {!isDrawing && (
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
                             <span className="text-[7.5px] font-black uppercase tracking-widest">Novo Talhão</span>
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
                          onClick={handleExportPNG}
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
            {activeTab === 'analysis' && showOverlay && <Legend type={overlayType} />}
            {loadingImages && <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-lg flex items-center gap-3 z-[1000] border border-gray-100"><Loader2 className="w-4 h-4 animate-spin text-green-600" /><span className="text-xs font-bold text-gray-600">Processando...</span></div>}
        </div>




      </div>

      {/* 3. TELEMETRY & SOURCE CARD (FORA DO BOX PRINCIPAL) */}
      {activeTab === 'analysis' && (
          <div className="bg-white p-4 mt-3 rounded-2xl border border-gray-200 shadow-sm space-y-4 animate-in slide-in-from-top-2">
              <div className="flex items-center justify-between pb-3 border-b border-gray-50">
                  <div className="flex items-center gap-2">
                      <div className="p-2 bg-green-50 rounded-xl">
                          <Satellite className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Telemetria Orbital</p>
                          <p className="text-sm font-black text-gray-800 tracking-tight">Sentinel-2 L2A | AgroVisão</p>
                      </div>
                  </div>
                  <div className="bg-green-600 text-[9px] font-black px-2.5 py-1 rounded-full text-white uppercase shadow-sm">
                      Alta Resolução
                  </div>
              </div>

              {/* GUIA TÉCNICO DOS ÍNDICES */}
              <div className="space-y-3">
                  <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-green-700" />
                      <h3 className="text-[11px] font-black text-gray-800 uppercase tracking-wider">Dicionário de Índices</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                      {/* SAVI */}
                      <div className="flex gap-2.5 items-start">
                          <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center shrink-0 border border-orange-100">
                              <span className="text-[8px] font-black text-orange-700">SAVI</span>
                          </div>
                          <div className="space-y-0.5">
                              <p className="text-[10px] font-black text-gray-700 leading-none">Índice de Vegetação Ajustado ao Solo</p>
                              <p className="text-[9px] text-gray-500 font-medium leading-tight italic">Essenciais para monitorar o início do desenvolvimento das culturas, pois extrai o vigor ignorando o solo exposto.</p>
                          </div>
                      </div>

                      {/* NDVI */}
                      <div className="flex gap-2.5 items-start">
                          <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center shrink-0 border border-green-100">
                              <span className="text-[8px] font-black text-green-700">NDVI</span>
                          </div>
                          <div className="space-y-0.5">
                              <p className="text-[10px] font-black text-gray-700 leading-none">Índice de Vegetação por Diferença Normalizada</p>
                              <p className="text-[9px] text-gray-500 font-medium leading-tight italic">Monitoramento geral da saúde da vegetação e biomassa. Excelente para a maior parte do ciclo da cultura. Mede vigor e fotossíntese em tempo real.</p>
                          </div>
                      </div>

                      {/* EVI */}
                      <div className="flex gap-2.5 items-start">
                          <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
                              <span className="text-[8px] font-black text-emerald-700">EVI</span>
                          </div>
                          <div className="space-y-0.5">
                               <p className="text-[10px] font-black text-gray-700 leading-none">Índice de Vegetação Aprimorado</p>
                               <p className="text-[9px] text-gray-500 font-medium leading-tight italic">Alta precisão em lavouras densas e fechadas (soja/milho no auge).</p>
                          </div>
                      </div>

                      {/* NDRE */}
                      <div className="flex gap-2.5 items-start">
                          <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
                              <span className="text-[8px] font-black text-red-700">NDRE</span>
                          </div>
                          <div className="space-y-0.5">
                               <p className="text-[10px] font-black text-gray-700 leading-none">Índice de Diferença Normalizada da Borda do Vermelho (Nutrição)</p>
                               <p className="text-[9px] text-gray-500 font-medium leading-tight italic">Ideal em plantações muito densas (como milho/cana no auge). Detecta níveis de Nitrogênio e estresse nutricional.</p>
                          </div>
                      </div>

                      {/* NDMI */}
                      <div className="flex gap-2.5 items-start">
                          <div className="w-7 h-7 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0 border border-cyan-100">
                              <span className="text-[8px] font-black text-cyan-700">NDMI</span>
                          </div>
                          <div className="space-y-0.5">
                               <p className="text-[10px] font-black text-gray-700 leading-none">Índice de Umidade da Vegetação (Sede)</p>
                               <p className="text-[9px] text-gray-500 font-medium leading-tight italic">Mede a umidade na folhagem, identificando o estresse hídrico antes do murchamento. É excelente para manejo de pivô central.</p>
                          </div>
                      </div>

                      {/* NDWI / ÁGUA */}
                      <div className="flex gap-2.5 items-start">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100">
                              <Droplets className="w-3.5 h-3.5 text-indigo-600" />
                          </div>
                          <div className="space-y-0.5">
                               <p className="text-[10px] font-black text-gray-700 leading-none">Lagoas (Azul)</p>
                               <p className="text-[9px] text-gray-500 font-medium leading-tight italic">O NDWI (Índice de Diferença Normalizada da Água) identifica água automaticamente para não confundir com falhas na planta.</p>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="flex items-start gap-2 bg-amber-50 p-3 rounded-xl border border-dashed border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-900 font-bold leading-tight italic">
                      Nota Técnica: Áreas obstruídas por nuvens ou sombras naturais podem ocorrer impedindo a leitura espectral. Nestes casos, os índices podem apresentar valores nulos. Recomenda-se validar visualmente através do mapa "REAL".
                  </p>
              </div>
          </div>
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
