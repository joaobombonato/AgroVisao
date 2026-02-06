import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Undo2, Map as MapIcon, Layers, Maximize2, MousePointerClick, Loader2, MousePointer2, Circle as CircleIcon, Wand2, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { calculateAreaHectares, pointsToGeoJSON, circleToPolygon, clipPolygonToBoundary, subtractPolygons, clipGeoJSONToBoundary, subtractGeoJSON, multiPartsToGeoJSON } from '../utils/mapHelpers';
import * as turf from '@turf/turf';
import { ConfirmModal } from '../../../components/ui/Shared';
import { MapToolbar } from './MapToolbar';
import { StatsPanel } from './StatsPanel';
import { MapLegend } from './DrawingLegend';
import { TalhaoEditorHeader } from './TalhaoEditorHeader';
import { editIcon, TILE_LAYERS } from '../config/mapConfig';
import { useTalhaoActions } from '../hooks/useTalhaoActions';

interface TalhaoMapEditorProps {
    farmGeoJSON: any;
    initialGeoJSON?: any;
    existingTalhoes?: any[];
    onSave: (data: { geojson: any; areaHectares: number }) => void;
    onClose: () => void;
}

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

        // Usa TILE_LAYERS do config
        const tileConfig = TILE_LAYERS[mapType];
        L.tileLayer(tileConfig.url, { attribution: tileConfig.attribution }).addTo(map);

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
            if (finalGeo && existingTalhoes?.length > 0) {
                // console.log('DEBUG: Iniciando subtração. Vizinhos totais:', existingTalhoes.length);
                const normalize = (id: any) => id ? String(id).replace('temp-asset-', '').toLowerCase() : null;
                const editId = normalize(initialGeoJSON?.id) || normalize(initialGeoJSON?.talhao_id) || 
                               normalize(initialGeoJSON?.properties?.id) || normalize(initialGeoJSON?.properties?.talhao_id);
                
                const others = existingTalhoes.filter(t => {
                    const tid = normalize(t.id) || normalize(t.talhao_id) || 
                                normalize(t.properties?.id) || normalize(t.properties?.talhao_id);
                    if (!editId || !tid) return true;
                    return tid !== editId;
                });
                
                // console.log('DEBUG: Vizinhos válidos para subtração:', others.length);

                const subtracted = subtractGeoJSON(finalGeo, others);
                if (subtracted) {
                    finalGeo = subtracted;
                } else {
                    console.warn('DEBUG: Subtração retornou nulo (falha ou sem intersecção). Mantendo original.');
                }
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

    // Hook com as ações do editor
    const {
        handleClear,
        confirmClear,
        handleUndo,
        handleNewPart,
        handleSimplify,
        handleSave
    } = useTalhaoActions({
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
    });

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
            <TalhaoEditorHeader 
                onUndo={handleUndo}
                onClose={onClose}
                canUndo={allParts.length > 0}
            />

            {/* Map Area */}
            <div className="flex-1 relative">
                <div ref={mapRef} className="w-full h-full z-0" />
                
                {/* Floating Controls */}
                {/* Floating Controls */}
                <div className="absolute top-4 left-4 flex flex-col gap-3 z-10 w-[180px]">
                    <MapToolbar
                        drawMode={drawMode}
                        setDrawMode={setDrawMode}
                        canAddPart={allParts[activePartIndex]?.length >= 3}
                        onAddPart={handleNewPart}
                        canSimplify={allParts.length > 1 || (allParts[0]?.length > 10)}
                        onSimplify={handleSimplify}
                        onResetCircle={() => { circleCenterRef.current = null; }}
                    />
                    <MapLegend />
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
                            const tileConfig = TILE_LAYERS[newType];
                            L.tileLayer(tileConfig.url, { attribution: tileConfig.attribution }).addTo(mapInstanceRef.current);
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
                <StatsPanel
                    areaHectares={areaHectares}
                    onClear={handleClear}
                    onSave={handleSave}
                />
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
