import { useState, useRef, useEffect, useCallback } from 'react';
import L from 'leaflet';
import * as turf from '@turf/turf';
import { toast } from 'react-hot-toast';
import { 
  calculateAreaHectares, 
  pointsToGeoJSON, 
  circleToPolygon, 
  clipPolygonToBoundary, 
  subtractPolygons, 
  clipGeoJSONToBoundary, 
  subtractGeoJSON, 
  multiPartsToGeoJSON 
} from '../utils/mapHelpers';

interface UsePolygonEditorParams {
  farmGeoJSON: any;
  initialGeoJSON?: any;
  existingTalhoes?: any[];
  onSave: (data: { geojson: any; areaHectares: number }) => void;
  editable?: boolean;
}

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

export function usePolygonEditor({ farmGeoJSON, initialGeoJSON, existingTalhoes = [], onSave, editable = true }: UsePolygonEditorParams) {
  // Estado
  const [allParts, setAllParts] = useState<L.LatLng[][]>([]);
  const [activePartIndex, setActivePartIndex] = useState<number>(0);
  const [areaHectares, setAreaHectares] = useState<number>(0);
  const [drawMode, setDrawMode] = useState<'poly' | 'circle'>('poly');
  const [isDirty, setIsDirty] = useState(false);
  
  // Refs
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const talhaoLayerRef = useRef<L.Polygon | null>(null);
  
  // Refs para closures
  const allPartsRef = useRef(allParts);
  const activePartIndexRef = useRef(activePartIndex);
  const drawModeRef = useRef(drawMode);
  const editableRef = useRef(editable);
  
  // Refs Círculo
  const circleCenterRef = useRef<L.LatLng | null>(null);
  const tempCircleRef = useRef<L.Circle | null>(null);

  // Sincronização de Refs
  useEffect(() => { allPartsRef.current = allParts; }, [allParts]);
  useEffect(() => { activePartIndexRef.current = activePartIndex; }, [activePartIndex]);
  useEffect(() => { drawModeRef.current = drawMode; }, [drawMode]);
  useEffect(() => { editableRef.current = editable; }, [editable]);

  // Controle de Visibilidade dos Marcadores
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (editable) {
        if (markersRef.current.length === 0 && allParts.length > 0) {
           rebuildMarkers(allParts, map);
        }
    } else {
        markersRef.current.forEach(m => map.removeLayer(m));
        markersRef.current = [];
        if (polylineRef.current) map.removeLayer(polylineRef.current);
        if (tempCircleRef.current) map.removeLayer(tempCircleRef.current);
    }
  }, [editable, allParts]); // Dependência editable e allParts

  // --- Funções Auxiliares ---

  const addDraggableMarker = useCallback((latlng: L.LatLng, partIndex: number, pointIndex: number, map: L.Map) => {
    const marker = L.marker(latlng, { icon: editIcon, draggable: true }).addTo(map);
    
    marker.on('drag', (e) => {
      const newPos = (e.target as L.Marker).getLatLng();
      const currentParts = [...allPartsRef.current];
      
      if (currentParts[partIndex] && currentParts[partIndex][pointIndex]) {
        const updatedPart = [...currentParts[partIndex]];
        updatedPart[pointIndex] = newPos;
        currentParts[partIndex] = updatedPart;
        
        allPartsRef.current = currentParts;
        setAllParts(currentParts);
        setIsDirty(true);
        updatePreview(currentParts, map);
      }
    });

    const deleteHandler = (e: any) => {
      L.DomEvent.stopPropagation(e);
      if (e.type === 'contextmenu') L.DomEvent.preventDefault(e);
      
      const currentParts = [...allPartsRef.current];
      if (currentParts[partIndex]) {
        const updatedPart = currentParts[partIndex].filter((_, i) => i !== pointIndex);
        if (updatedPart.length === 0) {
          currentParts.splice(partIndex, 1);
          const currentActiveIdx = activePartIndexRef.current;
          if (currentActiveIdx >= currentParts.length) {
            const newIdx = Math.max(0, currentParts.length - 1);
            activePartIndexRef.current = newIdx;
            setActivePartIndex(newIdx);
          }
        } else {
          currentParts[partIndex] = updatedPart;
        }
      }
      
      allPartsRef.current = currentParts;
      setAllParts(currentParts);
      setIsDirty(true);
      
      // Rebuild markers
      rebuildMarkers(currentParts, map);
      updatePreview(currentParts, map);
    };

    marker.on('contextmenu', deleteHandler);
    marker.on('dblclick', deleteHandler);

    if (editableRef.current) {
        markersRef.current.push(marker);
    } else {
        map.removeLayer(marker);
    }
  }, []); 

  const rebuildMarkers = useCallback((parts: L.LatLng[][], map: L.Map) => {
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
    parts.forEach((pArray, pIdx) => {
      pArray.forEach((ll, i) => addDraggableMarker(ll, pIdx, i, map));
    });
  }, [addDraggableMarker]);

  const updatePreview = useCallback((parts: L.LatLng[][], map: L.Map) => {
    if (!map) return;
    if (polylineRef.current) map.removeLayer(polylineRef.current);
    if (talhaoLayerRef.current) map.removeLayer(talhaoLayerRef.current);

    const currentGeo = multiPartsToGeoJSON(parts);
    if (!currentGeo) {
      setAreaHectares(0);
      return;
    }

    try {
      // 1. Recorta
      let finalGeo = clipGeoJSONToBoundary(currentGeo, farmGeoJSON);
      
      // 2. Subtrai Vizinhos (Lógica robusta)
      if (finalGeo && existingTalhoes.length > 0) {
        const normalize = (id: any) => id ? String(id).replace('temp-asset-', '').toLowerCase() : null;
        const editId = normalize(initialGeoJSON?.id) || normalize(initialGeoJSON?.talhao_id) || 
                       normalize(initialGeoJSON?.properties?.id) || normalize(initialGeoJSON?.properties?.talhao_id);
        
        const others = existingTalhoes.filter(t => {
            const tid = normalize(t.id) || normalize(t.talhao_id) || 
                        normalize(t.properties?.id) || normalize(t.properties?.talhao_id);
            if (!editId || !tid) return true;
            return tid !== editId;
        });
        
        const subtracted = subtractGeoJSON(finalGeo, others);
        if (subtracted) finalGeo = subtracted;
      }

      // Renderiza
      if (finalGeo) {
        // @ts-ignore
        talhaoLayerRef.current = L.geoJSON(finalGeo, {
          style: { color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.3, weight: 3 }
        }).addTo(map);
        
        const netArea = turf.area(finalGeo);
        const grossArea = turf.area(currentGeo);
        
        // Sanity Check
        if (initialGeoJSON && netArea < (grossArea * 0.01) && grossArea > 100) {
          setAreaHectares(grossArea / 10000);
        } else {
          setAreaHectares(netArea / 10000);
        }
      } else {
        setAreaHectares(turf.area(currentGeo) / 10000);
      }
    } catch (err) {
      console.warn("Erro no preview:", err);
      setAreaHectares(turf.area(currentGeo) / 10000);
    }

    // Linha auxiliar ativa
    const currentIdx = activePartIndexRef.current;
    const activePoints = parts[currentIdx] || [];
    if (activePoints.length > 0 && editableRef.current) {
      polylineRef.current = L.polyline(activePoints.length > 2 ? [...activePoints, activePoints[0]] : activePoints, { 
        color: '#ffffff', 
        weight: 2, 
        dashArray: '5, 5' 
      }).addTo(map);
    }

    // Otimização
    const totalPoints = parts.reduce((acc, p) => acc + p.length, 0);
    if (totalPoints > 1000) {
      markersRef.current.forEach(m => map.removeLayer(m));
      markersRef.current = [];
    }
  }, [farmGeoJSON, initialGeoJSON, existingTalhoes]);

  // --- Handlers Públicos ---

  const handleUndo = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || allPartsRef.current.length === 0) return;
    
    const currentIdx = activePartIndexRef.current;
    
    setAllParts(prev => {
      const next = [...prev];
      const currentPart = next[currentIdx] || [];
      
      if (currentPart.length > 0) {
         next[currentIdx] = currentPart.slice(0, -1);
         if (next[currentIdx].length === 0) {
             next.splice(currentIdx, 1);
             const newIdx = Math.max(0, currentIdx - 1);
             setActivePartIndex(newIdx);
             activePartIndexRef.current = newIdx;
         }
      }
      
      allPartsRef.current = next;
      rebuildMarkers(next, map); 
      updatePreview(next, map);
      setIsDirty(true);
      return next;
    });
  }, [rebuildMarkers, updatePreview]);

  const handleClear = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    
    allPartsRef.current = [];
    activePartIndexRef.current = 0;
    setAllParts([]);
    setActivePartIndex(0);
    setAreaHectares(0);
    setIsDirty(true);
    
    circleCenterRef.current = null;
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
    if (polylineRef.current) map.removeLayer(polylineRef.current);
    if (talhaoLayerRef.current) map.removeLayer(talhaoLayerRef.current);
    if (tempCircleRef.current) map.removeLayer(tempCircleRef.current);
  }, []);

  const handleNewPart = useCallback(() => {
    if (allParts[activePartIndex]?.length >= 3) {
      setActivePartIndex(allParts.length);
      activePartIndexRef.current = allParts.length;
      toast.success("Iniciando nova parte do talhão");
    } else {
      toast.error("Feche a parte atual antes de iniciar uma nova");
    }
  }, [allParts, activePartIndex]);

  const handleSimplify = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || allParts.length === 0) return;

    try {
      const feat = multiPartsToGeoJSON(allParts);
      if (!feat) return;

      const simplified = turf.simplify(feat, { tolerance: 0.0001, highQuality: true });
      let parts: L.LatLng[][] = [];
      const geom = simplified.geometry;
      
      if (geom.type === 'Polygon') {
        parts = [geom.coordinates[0].slice(0, -1).map((c: any) => L.latLng(c[1], c[0]))];
      } else if (geom.type === 'MultiPolygon') {
        parts = geom.coordinates.map((poly: any) => 
          poly[0].slice(0, -1).map((c: any) => L.latLng(c[1], c[0]))
        );
      }

      if (parts.length > 0) {
        setAllParts(parts);
        allPartsRef.current = parts;
        setActivePartIndex(parts.length - 1);
        activePartIndexRef.current = parts.length - 1;
        rebuildMarkers(parts, map);
        updatePreview(parts, map);
        setIsDirty(true);
        toast.success("Mágica realizada!");
      }
    } catch (e) {
      toast.error("Não foi possível simplificar.");
    }
  }, [allParts, rebuildMarkers, updatePreview]);

  const handleSaveInternal = useCallback(() => {
    const validParts = allParts.filter(p => p.length >= 3);
    if (validParts.length === 0) {
      toast.error("Desenhe pelo menos 3 pontos.");
      return;
    }

    const initialGeo = multiPartsToGeoJSON(allParts);
    if (!initialGeo) return;
    
    let finalGeo = clipGeoJSONToBoundary(initialGeo, farmGeoJSON);
    
    if (finalGeo && existingTalhoes.length > 0) {
      // Mesma lógica de subtração do updatePreview...
      const normalize = (id: any) => id ? String(id).replace('temp-asset-', '').toLowerCase() : null;
        const editId = normalize(initialGeoJSON?.id) || normalize(initialGeoJSON?.talhao_id) || 
                       normalize(initialGeoJSON?.properties?.id) || normalize(initialGeoJSON?.properties?.talhao_id);
        
        const others = existingTalhoes.filter(t => {
            const tid = normalize(t.id) || normalize(t.talhao_id) || 
                        normalize(t.properties?.id) || normalize(t.properties?.talhao_id);
            if (!editId || !tid) return true;
            return tid !== editId;
        });
      
      const subtracted = subtractGeoJSON(finalGeo, others);
      if (subtracted) finalGeo = subtracted;
    }

    if (!finalGeo) {
      toast.error("O talhão deve estar dentro do limite.");
      return;
    }

    const areaM2 = turf.area(finalGeo);
    const areaHA = parseFloat((areaM2 / 10000).toFixed(2));

    onSave({ geojson: finalGeo, areaHectares: areaHA });
    setIsDirty(false); // Salvo, limpa flag
  }, [allParts, farmGeoJSON, existingTalhoes, initialGeoJSON, onSave]);

  // Inicialização do Mapa e Eventos
  const initMap = useCallback((map: L.Map) => {
    mapInstanceRef.current = map;

    // Load Initial
    if (initialGeoJSON && allParts.length === 0) { // Só carrega se estiver vazio
        try {
            const geom = initialGeoJSON.geometry || initialGeoJSON;
            let parts: L.LatLng[][] = [];
            
            if (geom.type === 'Polygon' && geom.coordinates?.[0]) {
                parts = [geom.coordinates[0].slice(0, -1).map((c: number[]) => L.latLng(c[1], c[0]))];
            } else if (geom.type === 'MultiPolygon' && geom.coordinates) {
                parts = geom.coordinates.map((poly: any) => 
                    poly[0].slice(0, -1).map((c: number[]) => L.latLng(c[1], c[0]))
                );
            }

            if (parts.length > 0) {
                allPartsRef.current = parts;
                activePartIndexRef.current = parts.length - 1;
                setAllParts(parts);
                setActivePartIndex(parts.length - 1);
                
                if (editableRef.current) rebuildMarkers(parts, map);
                updatePreview(parts, map);
                setIsDirty(false); // Carga inicial
            }
        } catch (err) {
            console.error("Erro load geometry", err);
        }
    }

    // Events
    const clickHandler = (e: L.LeafletMouseEvent) => {
        if (!editableRef.current) return; // Bloqueia clique se não editável

        const currentMode = drawModeRef.current;
        const currentActiveIndex = activePartIndexRef.current;

        if (currentMode === 'poly') {
            const currentParts = [...allPartsRef.current];
            if (!currentParts[currentActiveIndex]) currentParts[currentActiveIndex] = [];
            currentParts[currentActiveIndex] = [...currentParts[currentActiveIndex], e.latlng];
            
            allPartsRef.current = currentParts;
            setAllParts(currentParts);
            setIsDirty(true);
            
            updatePreview(currentParts, map);
            addDraggableMarker(e.latlng, currentActiveIndex, currentParts[currentActiveIndex].length - 1, map);
        } else if (currentMode === 'circle') {
            if (!circleCenterRef.current) {
                circleCenterRef.current = e.latlng;
                const marker = L.marker(e.latlng, { icon: editIcon }).addTo(map);
                
                 if (editableRef.current) markersRef.current.push(marker);
                 else map.removeLayer(marker);
                 
                toast.success("Centro definido. Mova para ajustar raio.");
            } else {
                // Finaliza Círculo
                 if (tempCircleRef.current) {
                    const radius = tempCircleRef.current.getRadius();
                    let points = circleToPolygon(circleCenterRef.current, radius);
                    points = clipPolygonToBoundary(points, farmGeoJSON);
                    
                    if (existingTalhoes.length > 0) {
                         const normalize = (id: any) => id ? String(id).replace('temp-asset-', '').toLowerCase() : null;
                        const editId = normalize(initialGeoJSON?.id) || normalize(initialGeoJSON?.talhao_id) || 
                                    normalize(initialGeoJSON?.properties?.id) || normalize(initialGeoJSON?.properties?.talhao_id);
                        const others = existingTalhoes.filter(t => {
                                const tid = normalize(t.id) || normalize(t.talhao_id) || 
                                            normalize(t.properties?.id) || normalize(t.properties?.talhao_id);
                                if (!editId || !tid) return true;
                                return tid !== editId;
                        });
                        points = subtractPolygons(points, others);
                    }

                    if (points.length === 0) {
                        toast.error("Sobreposição total ou fora do limite.");
                    } else {
                         setAllParts(prev => {
                            const updated = [...prev];
                            updated[activePartIndexRef.current] = points;
                            allPartsRef.current = updated;
                            if (editableRef.current) rebuildMarkers(updated, map);
                            updatePreview(updated, map);
                            setIsDirty(true);
                            return updated;
                        });
                        toast.success("Pivô criado!");
                    }
                    
                    circleCenterRef.current = null;
                    if (tempCircleRef.current) map.removeLayer(tempCircleRef.current);
                    tempCircleRef.current = null;
                 }
            }
        }
    };
    map.on('click', clickHandler);

    const moveHandler = (e: L.LeafletMouseEvent) => {
        if (!editableRef.current) return;
        if (drawModeRef.current === 'circle' && circleCenterRef.current && e.latlng) {
            if (tempCircleRef.current) map.removeLayer(tempCircleRef.current);
            try {
                const radius = circleCenterRef.current.distanceTo(e.latlng);
                tempCircleRef.current = L.circle(circleCenterRef.current, {
                    radius,
                    color: '#22c55e',
                    weight: 2,
                    dashArray: '5, 5',
                    fillOpacity: 0.1
                }).addTo(map);
            } catch (err) {}
        }
    };
    map.on('mousemove', moveHandler);

  }, [addDraggableMarker, rebuildMarkers, updatePreview, farmGeoJSON, initialGeoJSON, existingTalhoes]);

  return {
    allParts,
    activePartIndex,
    areaHectares,
    drawMode,
    setDrawMode,
    handleUndo,
    handleClear,
    handleNewPart,
    handleSimplify,
    handleSave: handleSaveInternal,
    initMap,
    mapInstanceRef,
    isDirty
  };
}
