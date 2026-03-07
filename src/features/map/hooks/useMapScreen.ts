/**
 * useMapScreen — Hook de lógica de negócio da tela de Mapa.
 * Extraído de MapScreen.tsx para facilitar manutenção por IA.
 * 
 * Responsabilidades:
 * - Refs do Leaflet (mapa, camadas, marcadores)
 * - Estado (mapType, drawing, geojson, tabs)
 * - Efeitos de inicialização e sincronização
 * - Handlers de desenho, edição, salvamento e exportação
 */
import { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { toast } from 'react-hot-toast';
import L from 'leaflet';
import { calculateAreaHectares, pointsToGeoJSON } from '../utils/mapHelpers';
import { handleExportPNG } from '../utils/mapExportPNG';
import { fetchAgronomicData, type AgronomicResult } from '../../../services/agronomicService';
import { defaultIcon, editIcon, TILE_LAYERS } from '../config/mapConfig';
import { useSatelliteOverlay } from '../hooks/useSatelliteOverlay';

export default function useMapScreen() {
  const { state, setTela, fazendaSelecionada, genericUpdate } = useAppContext();
  const { userRole, permissions } = state;
  const rolePermissions = permissions?.[userRole || ''] || permissions?.['Operador'];

  // ==========================================
  // REFS
  // ==========================================
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const polygonLayerRef = useRef<L.Polygon | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const mainMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const maskLayerRef = useRef<L.Polygon | null>(null);
  const isDrawingRef = useRef(false);
  const drawPointsRef = useRef<L.LatLng[]>([]);

  // ==========================================
  // ESTADO
  // ==========================================
  const [mapType, setMapType] = useState<'street' | 'satellite'>('satellite');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState<L.LatLng[]>([]);
  const [areaHectares, setAreaHectares] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [geojsonData, setGeojsonData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'analysis'>(fazendaSelecionada?.geojson ? 'analysis' : 'map');
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // ==========================================
  // SATELLITE OVERLAY HOOK
  // ==========================================
  const satellite = useSatelliteOverlay({
    mapInstanceRef,
    polygonLayerRef,
    geojsonData,
    activeTab,
    fazendaId: fazendaSelecionada?.id
  });

  // ==========================================
  // DADOS AGRONÔMICOS
  // ==========================================
  const [agronomic, setAgronomic] = useState<AgronomicResult | null>(null);
  const latitude = fazendaSelecionada?.latitude;
  const longitude = fazendaSelecionada?.longitude;
  const existingGeojson = fazendaSelecionada?.geojson;

  useEffect(() => {
    if (!latitude || !longitude) return;
    fetchAgronomicData(latitude, longitude).then(setAgronomic).catch(console.error);
  }, [latitude, longitude]);

  // ==========================================
  // INICIALIZAÇÃO DO MAPA
  // ==========================================
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
    tileLayerRef.current = L.tileLayer(layer.url, { attribution: layer.attribution, maxZoom: 19 }).addTo(map);

    if (existingGeojson) {
      try {
        const geoLayer = L.geoJSON(existingGeojson, {
          style: { color: '#16a34a', fillColor: 'transparent', fillOpacity: 0, weight: 3 }
        });
        
        geoLayer.eachLayer((layer) => {
          if (layer instanceof L.Polygon) {
            polygonLayerRef.current = layer;
            map.addLayer(layer);
            // @ts-ignore
            const farmCoords = layer.getLatLngs()[0].map((p: any) => [p.lat, p.lng]);
            const worldCoords = [[90, -180], [90, 180], [-90, 180], [-90, -180]];
            const maskEffect = L.polygon([worldCoords, farmCoords] as any, {
              color: 'transparent', fillColor: '#000000', fillOpacity: 0.7, interactive: false
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
      } catch (e) { console.error('Error loading GeoJSON:', e); }
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

  // ==========================================
  // SINCRONIZAÇÃO TABS / MAP TYPE
  // ==========================================
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    let syncHandler: any = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (activeTab === 'analysis') {
      if (mainMarkerRef.current) map.removeLayer(mainMarkerRef.current);
      if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
      const layer = TILE_LAYERS['satellite'];
      tileLayerRef.current = L.tileLayer(layer.url, { attribution: layer.attribution }).addTo(map);
      tileLayerRef.current.bringToBack();
      
      if (satellite.overlayType === 'none') satellite.setOverlayType('ndvi'); 
      if (maskLayerRef.current) maskLayerRef.current.setStyle({ fillOpacity: 1, fillColor: '#000000' }); 
      
      if (polygonLayerRef.current) {
        const bounds = polygonLayerRef.current.getBounds();
        map.fitBounds(bounds, { paddingTopLeft: [20, 0], paddingBottomRight: [20, 40] });
        
        timeoutId = setTimeout(() => {
          if (!mapInstanceRef.current) return;
          const minZ = map.getZoom();
          map.setMinZoom(minZ);
          
          let debounceTimeout: ReturnType<typeof setTimeout> | null = null;
          let isAnimating = false;
          
          syncHandler = () => {
             if (isAnimating) return;
             if (debounceTimeout) clearTimeout(debounceTimeout);
             debounceTimeout = setTimeout(() => {
                if (map.getZoom() <= minZ + 0.2) {
                   isAnimating = true;
                   map.fitBounds(bounds, { paddingTopLeft: [20, 0], paddingBottomRight: [20, 40], animate: true });
                   setTimeout(() => { isAnimating = false; }, 800);
                }
             }, 300);
          };
          map.on('zoomend', syncHandler);
        }, 800);
      }

    } else {
      if (mainMarkerRef.current) map.addLayer(mainMarkerRef.current);
      map.setMinZoom(0);
      if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
      const layer = TILE_LAYERS[mapType];
      tileLayerRef.current = L.tileLayer(layer.url, { attribution: layer.attribution }).addTo(map);
      tileLayerRef.current.bringToBack();
      if (maskLayerRef.current) maskLayerRef.current.setStyle({ fillOpacity: 0.7, fillColor: '#000000' });
      if (polygonLayerRef.current) map.fitBounds(polygonLayerRef.current.getBounds(), { paddingTopLeft: [20, 0], paddingBottomRight: [20, 40] });
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (syncHandler) {
         map.off('zoomend', syncHandler);
         map.off('moveend', syncHandler);
      }
    };
  }, [mapType, activeTab]);

  // ==========================================
  // DRAWING SYNC + CLICK HANDLER
  // ==========================================
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

  // ==========================================
  // HELPERS DE DESENHO
  // ==========================================
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
      const tempPolygon = L.polygon(points, { color: '#16a34a', fillColor: '#16a34a', fillOpacity: 0.25, weight: 2 }).addTo(map);
      polygonLayerRef.current = tempPolygon;
    }
  };

  // ==========================================
  // ACTIONS
  // ==========================================
  const startDrawing = () => { if (mapInstanceRef.current) { handleClear(); setIsDrawing(true); setDrawPoints([]); drawPointsRef.current = []; toast('Clique no mapa para marcar pontos', { icon: '📍' }); } };
  
  const startEditing = () => {
    const map = mapInstanceRef.current;
    if (!map || !geojsonData) return;
    if (satellite.imageOverlayRef.current) { map.removeLayer(satellite.imageOverlayRef.current); satellite.imageOverlayRef.current = null; }
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
    if (satellite.imageOverlayRef.current) { map.removeLayer(satellite.imageOverlayRef.current); satellite.imageOverlayRef.current = null; }
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
    currentOverlayUrl: satellite.currentOverlayUrl,
    geojsonData,
    overlayType: satellite.overlayType,
    areaHectares,
    availableImages: satellite.availableImages,
    selectedImageIndex: satellite.selectedImageIndex,
    fazendaNome: fazendaSelecionada?.nome || 'Fazenda',
    setLoadingImages: satellite.setLoadingImages,
  });

  const handleFocusArea = () => {
    if (!mapInstanceRef.current || !polygonLayerRef.current) return toast('Nenhuma área demarcada');
    mapInstanceRef.current.fitBounds(polygonLayerRef.current.getBounds(), { paddingTopLeft: [20, 0], paddingBottomRight: [20, 40] });
  };

  const handleUndo = () => {
    const pts = [...drawPoints]; 
    pts.pop(); 
    markersRef.current.pop()?.remove(); 
    setDrawPoints(pts); 
    drawPointsRef.current = pts; 
    updatePreview(pts, mapInstanceRef.current!);
  };

  return {
    // Refs
    mapRef,
    mapInstanceRef,
    // State
    mapType, setMapType,
    isDrawing,
    drawPoints,
    areaHectares,
    hasChanges,
    saving,
    geojsonData,
    activeTab, setActiveTab,
    showCalendar, setShowCalendar,
    calendarMonth, setCalendarMonth,
    // Satellite
    satellite,
    // Agronomic
    agronomic,
    // Permissions
    rolePermissions,
    // Context
    setTela,
    fazendaSelecionada,
    // Handlers
    startDrawing,
    startEditing,
    finishDrawing,
    cancelDrawing,
    handleSave,
    handleLocateMe,
    onExportPNG,
    handleFocusArea,
    handleUndo
  };
}
