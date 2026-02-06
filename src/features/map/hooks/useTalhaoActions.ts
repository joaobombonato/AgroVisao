/**
 * useTalhaoActions - Hook com ações do editor de talhões
 * 
 * Encapsula as funções de manipulação do editor de talhões.
 * Recebe refs e estados como parâmetros para manter o encapsulamento.
 */
import { toast } from 'react-hot-toast';
import L from 'leaflet';
import * as turf from '@turf/turf';
import { multiPartsToGeoJSON, clipGeoJSONToBoundary, subtractGeoJSON } from '../utils/mapHelpers';

interface UseTalhaoActionsParams {
    // Refs
    mapInstanceRef: React.MutableRefObject<L.Map | null>;
    markersRef: React.MutableRefObject<L.Marker[]>;
    polylineRef: React.MutableRefObject<L.Polyline | null>;
    talhaoLayerRef: React.MutableRefObject<L.Polygon | null>;
    tempCircleRef: React.MutableRefObject<L.Circle | null>;
    circleCenterRef: React.MutableRefObject<L.LatLng | null>;
    allPartsRef: React.MutableRefObject<L.LatLng[][]>;
    activePartIndexRef: React.MutableRefObject<number>;
    // Estados
    allParts: L.LatLng[][];
    setAllParts: React.Dispatch<React.SetStateAction<L.LatLng[][]>>;
    activePartIndex: number;
    setActivePartIndex: React.Dispatch<React.SetStateAction<number>>;
    setAreaHectares: React.Dispatch<React.SetStateAction<number>>;
    setShowClearConfirm: React.Dispatch<React.SetStateAction<boolean>>;
    // Props
    farmGeoJSON: any;
    existingTalhoes: any[];
    initialGeoJSON?: any;
    onSave: (data: { geojson: any; areaHectares: number }) => void;
    onClose: () => void;
    // Callbacks
    updatePreview: (parts: L.LatLng[][], map: L.Map) => void;
    addDraggableMarker: (latlng: L.LatLng, partIndex: number, pointIndex: number, map: L.Map) => void;
}

export function useTalhaoActions({
    mapInstanceRef,
    markersRef,
    polylineRef,
    talhaoLayerRef,
    tempCircleRef,
    circleCenterRef,
    allPartsRef,
    activePartIndexRef,
    allParts,
    setAllParts,
    activePartIndex,
    setActivePartIndex,
    setAreaHectares,
    setShowClearConfirm,
    farmGeoJSON,
    existingTalhoes,
    initialGeoJSON,
    onSave,
    onClose,
    updatePreview,
    addDraggableMarker
}: UseTalhaoActionsParams) {

    const handleClear = () => {
        if (allParts.length > 0) {
            setShowClearConfirm(true);
        } else {
            confirmClear();
        }
    };

    const confirmClear = () => {
        const map = mapInstanceRef.current;
        if (!map) return;
        
        allPartsRef.current = [];
        activePartIndexRef.current = 0;
        
        setAllParts([]);
        setActivePartIndex(0);
        setAreaHectares(0);
        circleCenterRef.current = null;
        markersRef.current.forEach(m => map.removeLayer(m));
        markersRef.current = [];
        if (polylineRef.current) map.removeLayer(polylineRef.current);
        if (talhaoLayerRef.current) map.removeLayer(talhaoLayerRef.current);
        if (tempCircleRef.current) map.removeLayer(tempCircleRef.current);
        setShowClearConfirm(false);
    };

    const handleUndo = () => {
        const map = mapInstanceRef.current;
        if (!map || allParts.length === 0) return;
        
        const currentPart = allParts[activePartIndex] || [];
        if (currentPart.length > 0) {
            const lastMarker = markersRef.current.pop();
            if (lastMarker) map.removeLayer(lastMarker);

            setAllParts(prev => {
                const next = [...prev];
                next[activePartIndex] = next[activePartIndex].slice(0, -1);
                if (next[activePartIndex].length === 0) {
                    next.splice(activePartIndex, 1);
                    setActivePartIndex(Math.max(0, activePartIndex - 1));
                }
                updatePreview(next, map);
                return next;
            });
        }
    };

    const handleNewPart = () => {
        if (allParts[activePartIndex]?.length >= 3) {
            setActivePartIndex(allParts.length);
            toast.success("Iniciando nova parte do talhão");
        } else {
            toast.error("Feche a parte atual antes de iniciar uma nova");
        }
    };

    const handleSimplify = () => {
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
                setActivePartIndex(parts.length - 1);
                markersRef.current.forEach(m => map.removeLayer(m));
                markersRef.current = [];
                parts.forEach((pArray, pIdx) => {
                    pArray.forEach((p, i) => addDraggableMarker(p, pIdx, i, map));
                });
                updatePreview(parts, map);
                toast.success("Mágica realizada!");
            }
        } catch (e) {
            toast.error("Não foi possível simplificar.");
        }
    };

    const handleSave = () => {
        const validParts = allParts.filter(p => p.length >= 3);
        if (validParts.length === 0) {
            toast.error("Desenhe pelo menos 3 pontos para formar uma parte do talhão.");
            return;
        }

        const initialGeo = multiPartsToGeoJSON(allParts);
        if (!initialGeo) return;
        
        let finalGeo = clipGeoJSONToBoundary(initialGeo, farmGeoJSON);
        
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

        if (!finalGeo) {
            toast.error("O talhão deve estar dentro do limite e não pode sobrepor outras áreas.");
            return;
        }

        const areaM2 = turf.area(finalGeo);
        const areaHA = parseFloat((areaM2 / 10000).toFixed(2));

        onSave({ geojson: finalGeo, areaHectares: areaHA });
        onClose();
    };

    return {
        handleClear,
        confirmClear,
        handleUndo,
        handleNewPart,
        handleSimplify,
        handleSave
    };
}
