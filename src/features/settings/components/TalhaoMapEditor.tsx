import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Undo2, Map as MapIcon, Layers, Maximize2, MousePointerClick, Loader2, MousePointer2, Circle as CircleIcon, Wand2, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { calculateAreaHectares, pointsToGeoJSON, circleToPolygon, clipPolygonToBoundary, subtractPolygons, clipGeoJSONToBoundary, subtractGeoJSON, multiPartsToGeoJSON } from '../../../utils/mapHelpers';
import * as turf from '@turf/turf';
import { ConfirmModal } from '../../../components/ui/Shared';

interface TalhaoMapEditorProps {
    farmGeoJSON: any;
    initialGeoJSON?: any;
    existingTalhoes?: any[];
    onSave: (data: { geojson: any; areaHectares: number }) => void;
    onClose: () => void;
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

export default function TalhaoMapEditor({ farmGeoJSON, initialGeoJSON, existingTalhoes = [], onSave, onClose }: TalhaoMapEditorProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const farmLayerRef = useRef<L.GeoJSON | null>(null);
    const talhaoLayerRef = useRef<L.Polygon | null>(null);
    const markersRef = useRef<L.Marker[]>([]);
    const polylineRef = useRef<L.Polyline | null>(null);
    
    const [allParts, setAllParts] = useState<L.LatLng[][]>([]);
    const [activePartIndex, setActivePartIndex] = useState<number>(0);
    const [areaHectares, setAreaHectares] = useState<number>(0);
    const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
    const [mapType, setMapType] = useState<'street' | 'satellite'>('satellite');
    const [drawMode, setDrawMode] = useState<'poly' | 'circle'>('poly');
    
    // Refs para evitar stale closures nos handlers do Leaflet
    const drawModeRef = useRef(drawMode);
    useEffect(() => { drawModeRef.current = drawMode; }, [drawMode]);
    
    const activePartIndexRef = useRef(activePartIndex);
    useEffect(() => { activePartIndexRef.current = activePartIndex; }, [activePartIndex]);
    
    const allPartsRef = useRef(allParts);
    useEffect(() => { allPartsRef.current = allParts; }, [allParts]);

    // Refs para desenho de círculo
    const circleCenterRef = useRef<L.LatLng | null>(null);
    const tempCircleRef = useRef<L.Circle | null>(null);

    useEffect(() => {
        if (!mapRef.current) return;

        const map = L.map(mapRef.current, {
            zoomControl: false,
            attributionControl: false
        }).setView([-15, -50], 4);

        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Esri'
        });
        const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: 'OpenStreetMap'
        });

        if (mapType === 'satellite') satelliteLayer.addTo(map);
        else streetLayer.addTo(map);

        // Adicionar limite da fazenda se existir
        if (farmGeoJSON) {
            try {
                const geoLayer = L.geoJSON(farmGeoJSON, {
                    style: {
                        color: '#ffffff',
                        weight: 3,
                        dashArray: '5, 10',
                        fillOpacity: 0.1,
                        fillColor: '#ffffff'
                    }
                }).addTo(map);
                farmLayerRef.current = geoLayer;
                const bounds = geoLayer.getBounds();
                if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [20, 20] });
                }
            } catch (err) {
                console.error("Erro ao carregar GeoJSON da fazenda:", err);
            }
        }

        mapInstanceRef.current = map;

        // Click handler para desenhar
        map.on('click', (e: L.LeafletMouseEvent) => {
            const currentMode = drawModeRef.current;
            const currentActiveIndex = activePartIndexRef.current;

            if (currentMode === 'poly') {
                // CRÍTICO: Usar allPartsRef.current para garantir que temos os pontos mais recentes
                const currentParts = [...allPartsRef.current];
                if (!currentParts[currentActiveIndex]) currentParts[currentActiveIndex] = [];
                currentParts[currentActiveIndex] = [...currentParts[currentActiveIndex], e.latlng];
                
                // Atualiza a ref imediatamente
                allPartsRef.current = currentParts;
                
                // Atualiza o estado do React
                setAllParts(currentParts);
                
                updatePreview(currentParts, map);
                addDraggableMarker(e.latlng, currentActiveIndex, currentParts[currentActiveIndex].length - 1, map);
            } else if (currentMode === 'circle') {
                if (!circleCenterRef.current) {
                    circleCenterRef.current = e.latlng;
                    const marker = L.marker(e.latlng, { icon: editIcon }).addTo(map);
                    markersRef.current.push(marker);
                    toast.success("Centro definido. Mova o mouse para ajustar o raio.");
                } else {
                    // Finaliza o círculo
                    if (tempCircleRef.current) {
                        const radius = tempCircleRef.current.getRadius();
                        let points = circleToPolygon(circleCenterRef.current, radius);
                        
                        // Recorta para ficar dentro da fazenda
                        points = clipPolygonToBoundary(points, farmGeoJSON);

                        // Evita sobreposição com talhões existentes
                        if (existingTalhoes.length > 0) {
                            // Filtra o talhão que estamos editando (se for o caso) do cálculo de sobreposição
                            const others = existingTalhoes.filter(t => t.id !== initialGeoJSON?.id);
                            points = subtractPolygons(points, others);
                        }

                        if (points.length === 0) {
                            toast.error("O pivô está totalmente sobreposto ou fora do limite.");
                        } else {
                            setAllParts(prev => {
                                const updated = [...prev];
                                updated[activePartIndex] = points;
                                
                                // Limpa marcadores antigos e recria para todos
                                markersRef.current.forEach(m => map.removeLayer(m));
                                markersRef.current = [];
                                updated.forEach((pArray, pIdx) => {
                                    pArray.forEach((p, i) => addDraggableMarker(p, pIdx, i, map));
                                });
                                
                                updatePreview(updated, map);
                                return updated;
                            });
                            toast.success("Pivô criado, ajustado ao limite e sem sobreposições!");
                        }

                        // Limpa refs de desenho temporário
                        circleCenterRef.current = null;
                        if (tempCircleRef.current) map.removeLayer(tempCircleRef.current);
                        tempCircleRef.current = null;
                    }
                }
            }
        });

        map.on('mousemove', (e: L.LeafletMouseEvent) => {
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
                } catch (err) {
                    console.warn("Erro ao renderizar círculo temporário:", err);
                }
            }
        });

        // Carregar geometry inicial se houver
        if (initialGeoJSON) {
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
                    // CRÍTICO: Atualizar as refs IMEDIATAMENTE para evitar stale closures
                    allPartsRef.current = parts;
                    activePartIndexRef.current = parts.length - 1;
                    
                    setAllParts(parts);
                    setActivePartIndex(parts.length - 1);
                    updatePreview(parts, map);
                    parts.forEach((pArray, pIdx) => {
                        pArray.forEach((p, i) => addDraggableMarker(p, pIdx, i, map));
                    });
                    
                    // NOVO: Desenha o contorno "fantasma" do original para referência
                    try {
                        const geom = initialGeoJSON.geometry || initialGeoJSON;
                        L.geoJSON(geom, {
                            style: {
                                color: '#ff6b00', // Laranja mais vivo
                                weight: 4,        // Linha mais grossa
                                fillOpacity: 0.1, // Leve preenchimento para destacar
                                fillColor: '#ff6b00',
                                dashArray: '10, 6',
                                opacity: 1        // Opacidade total
                            }
                        }).addTo(map);
                    } catch (e) {
                        console.warn("Erro ao desenhar fantasma original:", e);
                    }
                }
            } catch (err) {
                console.error("Erro ao carregar geometria inicial:", err);
            }
        }

        return () => {
            map.remove();
        };
    }, []);

    // Efeito para renderizar talhões vizinhos (cinza)
    const neighborsLayerRef = useRef<L.LayerGroup | null>(null);
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map || !existingTalhoes) return;

        // Limpa camada anterior
        if (neighborsLayerRef.current) map.removeLayer(neighborsLayerRef.current);
        neighborsLayerRef.current = L.layerGroup().addTo(map);

        existingTalhoes.forEach(t => {
            // Não desenha o talhão que estamos editando (se houver id)
            if (initialGeoJSON?.id && t.id === initialGeoJSON.id) return;
            if (!t.geometry) return;

            try {
                const layer = L.geoJSON(t.geometry, {
                    style: {
                        color: '#64748b',
                        weight: 2,
                        fillColor: '#94a3b8',
                        fillOpacity: 0.2,
                        dashArray: '3, 3'
                    }
                }).addTo(neighborsLayerRef.current!);

                // Adiciona rótulo centralizado
                if (t.nome) {
                    const bounds = layer.getBounds();
                    if (bounds.isValid()) {
                        L.tooltip({
                            permanent: true,
                            direction: 'center',
                            className: 'talhao-label'
                        })
                        .setContent(t.nome)
                        .setLatLng(bounds.getCenter())
                        .addTo(neighborsLayerRef.current!);
                    }
                }
            } catch (err) {
                console.warn("Erro ao renderizar talhão vizinho:", err);
            }
        });
    }, [existingTalhoes, initialGeoJSON?.id]);

    const addDraggableMarker = (latlng: L.LatLng, partIndex: number, pointIndex: number, map: L.Map) => {
        const marker = L.marker(latlng, { icon: editIcon, draggable: true }).addTo(map);
        
        marker.on('drag', (e) => {
            const newPos = (e.target as L.Marker).getLatLng();
            
            // CRÍTICO: Usar allPartsRef.current para garantir sincronização
            const currentParts = [...allPartsRef.current];
            if (currentParts[partIndex] && currentParts[partIndex][pointIndex]) {
                const updatedPart = [...currentParts[partIndex]];
                updatedPart[pointIndex] = newPos;
                currentParts[partIndex] = updatedPart;
                
                // Atualiza ref imediatamente
                allPartsRef.current = currentParts;
                
                setAllParts(currentParts);
                updatePreview(currentParts, map);
            }
        });

        // Suporte a exclusão por botão direito OU clique duplo
        const deleteHandler = (e: any) => {
            L.DomEvent.stopPropagation(e);
            if (e.type === 'contextmenu') L.DomEvent.preventDefault(e);
            
            // CRÍTICO: Usar refs para garantir sincronização
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
            
            // Atualiza ref imediatamente
            allPartsRef.current = currentParts;
            setAllParts(currentParts);
            
            // Limpeza e recriação para manter sincronia de índices
            markersRef.current.forEach(m => map.removeLayer(m));
            markersRef.current = [];
            currentParts.forEach((pArray, pIdx) => {
                pArray.forEach((ll, i) => addDraggableMarker(ll, pIdx, i, map));
            });
            
            updatePreview(currentParts, map);
        };

        marker.on('contextmenu', deleteHandler);
        marker.on('dblclick', deleteHandler);

        markersRef.current.push(marker);
    };

    const updatePreview = (parts: L.LatLng[][], map: L.Map) => {
        if (!map) return;
        if (polylineRef.current) map.removeLayer(polylineRef.current);
        if (talhaoLayerRef.current) map.removeLayer(talhaoLayerRef.current);

        const currentGeo = multiPartsToGeoJSON(parts);
        if (!currentGeo) {
            setAreaHectares(0);
            return;
        }

        try {
            // 2. Recorta para o limite da fazenda
            let finalGeo = clipGeoJSONToBoundary(currentGeo, farmGeoJSON);
            
            // 3. Subtrai vizinhos (Filtro Robusto de ID)
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

            if (finalGeo) {
                // @ts-ignore
                talhaoLayerRef.current = L.geoJSON(finalGeo, {
                    style: { color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.3, weight: 3 }
                }).addTo(map);
                
                const netArea = turf.area(finalGeo);
                const grossArea = turf.area(currentGeo);
                
                // SANITY CHECK: Se a área líquida for quase zero (<1%) mas a bruta for grande, 
                // e estivermos em modo edição, provavelmente é erro de auto-subtração.
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

        // Desenha a linha auxiliar (traçado bruto) para a parte ativa
        const currentIdx = activePartIndexRef.current;
        const activePoints = parts[currentIdx] || [];
        if (activePoints.length > 0) {
             polylineRef.current = L.polyline(activePoints.length > 2 ? [...activePoints, activePoints[0]] : activePoints, { 
                color: '#ffffff', 
                weight: 2, 
                dashArray: '5, 5' 
            }).addTo(map);
        }

        // Otimização de marcadores
        const totalPoints = parts.reduce((acc, p) => acc + p.length, 0);
        if (totalPoints > 1000) {
            markersRef.current.forEach(m => map.removeLayer(m));
            markersRef.current = [];
        }
    };


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
        
        // Atualiza refs e estado
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

        // 1. Inicia com GeoJSON de todas as partes combinadas
        const initialGeo = multiPartsToGeoJSON(allParts);
        if (!initialGeo) return;
        
        // 2. Recorta para ficar dentro da fazenda
        let finalGeo = clipGeoJSONToBoundary(initialGeo, farmGeoJSON);
        
        // 3. Remove áreas sobrepostas com outros talhões (Filtro Robusto)
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

        // Calcula área total (Hectares) de todas as partes do MultiPolygon resultante
        const areaM2 = turf.area(finalGeo);
        const areaHA = parseFloat((areaM2 / 10000).toFixed(2));

        onSave({ geojson: finalGeo, areaHectares: areaHA });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[1500] bg-white flex flex-col animate-in fade-in zoom-in-95">
            <style>{`
                .talhao-label {
                    background: transparent;
                    border: none;
                    box-shadow: none;
                    color: white;
                    font-weight: 800;
                    font-size: 10px;
                    text-transform: uppercase;
                    text-shadow: 0 1px 4px rgba(0,0,0,0.8);
                    pointer-events: none;
                }
                .talhao-label::before { display: none; }
            `}</style>
            {/* Header */}
            <div className="bg-white p-4 flex items-center justify-between border-b shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                        <MapIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="font-bold text-gray-800 tracking-tight">Desenhar Talhão</h2>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase">
                            <MousePointerClick className="w-3 h-3" /> Clique no mapa para marcar os pontos
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handleUndo}
                        disabled={allParts.length === 0}
                        className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 disabled:opacity-30 transition-all active:scale-95"
                    >
                        <Undo2 className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={onClose}
                        className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 transition-all active:scale-95"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Map Area */}
            <div className="flex-1 relative">
                <div ref={mapRef} className="w-full h-full z-0" />
                
                {/* Floating Controls */}
                <div className="absolute top-4 left-4 flex flex-col gap-3 z-10 w-[180px]">
                    <div className="bg-white/95 backdrop-blur-md p-1.5 rounded-2xl shadow-xl border border-gray-100 flex flex-col gap-1">
                        <button 
                            onClick={() => setDrawMode('poly')}
                            className={`p-3 rounded-xl flex items-center gap-3 transition-all ${drawMode === 'poly' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <MousePointer2 className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Polígono</span>
                        </button>
                        <button 
                            onClick={() => {
                                setDrawMode('circle');
                                circleCenterRef.current = null;
                            }}
                            className={`p-3 rounded-xl flex items-center gap-3 transition-all ${drawMode === 'circle' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <CircleIcon className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Pivô (Círculo)</span>
                        </button>
                        
                        {allParts[activePartIndex]?.length >= 3 && (
                            <button 
                                onClick={handleNewPart}
                                className="p-3 rounded-xl flex items-center gap-3 text-blue-600 hover:bg-blue-50 transition-all border-t border-gray-100"
                            >
                                <Sparkles className="w-5 h-5" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-left leading-tight">Nova Parte</span>
                            </button>
                        )}

                        {(allParts.length > 1 || (allParts[0]?.length > 10)) && (
                            <button 
                                onClick={handleSimplify}
                                className="p-3 rounded-xl flex items-center gap-3 text-amber-600 hover:bg-amber-50 transition-all border-t border-gray-100"
                            >
                                <Wand2 className="w-5 h-5" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Mágica</span>
                            </button>
                        )}
                    </div>

                    {/* Legend Card */}
                    <div className="bg-white/90 backdrop-blur-sm p-4 rounded-3xl shadow-xl border border-white/50 flex flex-col gap-3">
                        <h3 className="text-[9px] font-black uppercase text-gray-400 tracking-[0.2em] border-b border-gray-50 pb-2">Legenda</h3>
                        <div className="flex flex-col gap-2.5">
                            <div className="flex gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1 shrink-0" />
                                <p className="text-[9px] text-gray-500 font-bold leading-tight uppercase tracking-tighter"><b>Polígono:</b> Desenho livre para contornos.</p>
                            </div>
                            <div className="flex gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 shrink-0" />
                                <p className="text-[9px] text-gray-500 font-bold leading-tight uppercase tracking-tighter"><b>Nova Parte:</b> Para áreas totalmente separadas, que pertencem ao mesmo talhão.</p>
                            </div>
                            <div className="flex gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1 shrink-0" />
                                <p className="text-[9px] text-gray-500 font-bold leading-tight uppercase tracking-tighter"><b>Mágica:</b> Limpa pontos e melhora o ajuste.</p>
                            </div>
                            <div className="pt-1 border-t border-gray-50 flex items-center gap-2">
                                <MousePointerClick className="w-3 h-3 text-gray-400" />
                                <p className="text-[8px] text-gray-400 font-black uppercase leading-none">Clique duplo ou Botão direito:<br/>Apagar ponto</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                    <button 
                        onClick={() => {
                            if (!mapInstanceRef.current) return;
                            const newType = mapType === 'satellite' ? 'street' : 'satellite';
                            setMapType(newType);
                            mapInstanceRef.current.eachLayer(l => {
                                if (l instanceof L.TileLayer) mapInstanceRef.current?.removeLayer(l);
                            });
                            L.tileLayer(newType === 'satellite' ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstanceRef.current);
                        }}
                        className="bg-white p-3 rounded-2xl shadow-lg border border-gray-100 flex items-center gap-2 hover:bg-gray-50 transition-all active:scale-95"
                    >
                        <Layers className="w-5 h-5 text-gray-600" />
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-tighter">
                            {mapType === 'satellite' ? 'Mapa' : 'Satélite'}
                        </span>
                    </button>
                </div>

                {/* Bottom Stats Card */}
                <div className="absolute bottom-6 left-6 right-6 z-10">
                    <div className="bg-white/95 backdrop-blur-md p-5 rounded-[2rem] shadow-2xl border border-white/50 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="bg-green-600 w-12 h-12 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg shadow-green-100">
                                <span className="text-[10px] font-black uppercase opacity-80 leading-none">HA</span>
                                <Maximize2 className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">Área Calculada</p>
                                <p className="text-2xl font-black text-gray-800 tracking-tighter">
                                    {(areaHectares || 0).toFixed(2)} <span className="text-sm text-gray-400 font-bold ml-1">HECTARES</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2 w-full md:w-auto">
                            <button 
                                onClick={handleClear}
                                className="flex-1 px-6 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold text-sm tracking-tight hover:bg-gray-200 transition-all active:scale-95"
                            >
                                Limpar
                            </button>
                            <button 
                                onClick={handleSave}
                                className="flex-[2] px-8 py-4 bg-green-600 text-white rounded-2xl font-black text-sm tracking-tighter shadow-xl shadow-green-200 hover:bg-green-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Check className="w-5 h-5" /> CONFIRMAR ÁREA
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={showClearConfirm}
                onClose={() => setShowClearConfirm(false)}
                onConfirm={confirmClear}
                title="Limpar Desenho"
                message="Tem certeza que deseja limpar todo o desenho atual? Esta ação não pode ser desfeita e você perderá o progresso do traçado."
                confirmText="Limpar Tudo"
                cancelText="Cancelar"
                variant="danger"
                icon="warning"
            />
        </div>
    );
}
