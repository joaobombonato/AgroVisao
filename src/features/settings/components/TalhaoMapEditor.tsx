import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Undo2, Map as MapIcon, Layers, Maximize2, MousePointerClick, Loader2, MousePointer2, Circle as CircleIcon, Wand2, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { calculateAreaHectares, pointsToGeoJSON, circleToPolygon, clipPolygonToBoundary, subtractPolygons } from '../../../utils/mapHelpers';

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
    
    const [drawPoints, setDrawPoints] = useState<L.LatLng[]>([]);
    const [areaHectares, setAreaHectares] = useState<number>(0);
    const [mapType, setMapType] = useState<'street' | 'satellite'>('satellite');
    const [drawMode, setDrawMode] = useState<'poly' | 'circle'>('poly');
    
    // Refs para evitar stale closures nos handlers do Leaflet
    const drawModeRef = useRef(drawMode);
    useEffect(() => { drawModeRef.current = drawMode; }, [drawMode]);

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

            if (currentMode === 'poly') {
                setDrawPoints(prev => {
                    const newPoints = [...prev, e.latlng];
                    updatePreview(newPoints, map);
                    addDraggableMarker(e.latlng, newPoints.length - 1, map);
                    return newPoints;
                });
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
                            setDrawPoints(points);
                            updatePreview(points, map);
                            // Limpa marcadores antigos (caso de redesenho)
                            markersRef.current.forEach(m => map.removeLayer(m));
                            markersRef.current = [];
                            // Adiciona marcadores para edição manual
                            points.forEach((p, i) => addDraggableMarker(p, i, map));
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
            if (drawModeRef.current === 'circle' && circleCenterRef.current) {
                if (tempCircleRef.current) map.removeLayer(tempCircleRef.current);
                const radius = circleCenterRef.current.distanceTo(e.latlng);
                tempCircleRef.current = L.circle(circleCenterRef.current, {
                    radius,
                    color: '#22c55e',
                    weight: 2,
                    dashArray: '5, 5',
                    fillOpacity: 0.1
                }).addTo(map);
            }
        });

        // Carregar geometry inicial se houver
        if (initialGeoJSON) {
            try {
                const geom = initialGeoJSON.geometry || initialGeoJSON;
                if (geom.type === 'Polygon' && geom.coordinates?.[0]) {
                    const points = geom.coordinates[0].slice(0, -1).map((c: number[]) => L.latLng(c[1], c[0]));
                    setDrawPoints(points);
                    updatePreview(points, map);
                    points.forEach((p: L.LatLng, i: number) => addDraggableMarker(p, i, map));
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

    const addDraggableMarker = (latlng: L.LatLng, index: number, map: L.Map) => {
        const marker = L.marker(latlng, { icon: editIcon, draggable: true }).addTo(map);
        marker.on('drag', (e) => {
            const newPos = (e.target as L.Marker).getLatLng();
            setDrawPoints(prev => {
                const newPoints = [...prev];
                newPoints[index] = newPos;
                updatePreview(newPoints, map);
                return newPoints;
            });
        });
        markersRef.current.push(marker);
    };

    const updatePreview = (points: L.LatLng[], map: L.Map) => {
        if (polylineRef.current) map.removeLayer(polylineRef.current);
        if (talhaoLayerRef.current) map.removeLayer(talhaoLayerRef.current);

        if (points.length > 0) {
            polylineRef.current = L.polyline(points.length > 2 ? [...points, points[0]] : points, { 
                color: '#ffffff', 
                weight: 2, 
                dashArray: '5, 5' 
            }).addTo(map);
        }
        if (points.length >= 3) {
            talhaoLayerRef.current = L.polygon(points, {
                color: '#22c55e',
                fillColor: '#22c55e',
                fillOpacity: 0.3,
                weight: 3
            }).addTo(map);
            setAreaHectares(calculateAreaHectares(points));
        } else {
            setAreaHectares(0);
        }
    };


    const handleClear = () => {
        const map = mapInstanceRef.current;
        if (!map) return;
        setDrawPoints([]);
        setAreaHectares(0);
        circleCenterRef.current = null;
        markersRef.current.forEach(m => map.removeLayer(m));
        markersRef.current = [];
        if (polylineRef.current) map.removeLayer(polylineRef.current);
        if (talhaoLayerRef.current) map.removeLayer(talhaoLayerRef.current);
        if (tempCircleRef.current) map.removeLayer(tempCircleRef.current);
    };

    const handleUndo = () => {
        const map = mapInstanceRef.current;
        if (!map || drawPoints.length === 0) return;
        
        const lastMarker = markersRef.current.pop();
        if (lastMarker) map.removeLayer(lastMarker);

        setDrawPoints(prev => {
            const newPoints = prev.slice(0, -1);
            updatePreview(newPoints, map);
            return newPoints;
        });
    };

    const handleSave = () => {
        if (drawPoints.length < 3) {
            toast.error("Desenhe pelo menos 3 pontos para formar o talhão.");
            return;
        }

        // 1. Garante que o polígono final está dentro da fazenda
        let finalPoints = clipPolygonToBoundary(drawPoints, farmGeoJSON);
        
        // 2. Remove áreas sobrepostas com outros talhões
        if (existingTalhoes.length > 0) {
            const others = existingTalhoes.filter(t => t.id !== initialGeoJSON?.id);
            finalPoints = subtractPolygons(finalPoints, others);
        }

        if (finalPoints.length < 3) {
            toast.error("O talhão deve estar dentro do limite e não pode sobrepor outras áreas.");
            return;
        }

        const geojson = pointsToGeoJSON(finalPoints);
        onSave({ geojson, areaHectares: parseFloat(calculateAreaHectares(finalPoints).toFixed(2)) });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-in fade-in zoom-in-95">
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
                        disabled={drawPoints.length === 0}
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
                <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                    <div className="bg-white/90 backdrop-blur-sm p-1.5 rounded-2xl shadow-xl border border-gray-100 flex flex-col gap-1">
                        <button 
                            onClick={() => setDrawMode('poly')}
                            className={`p-3 rounded-xl flex items-center gap-2 transition-all ${drawMode === 'poly' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <MousePointer2 className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Polígono</span>
                        </button>
                        <button 
                            onClick={() => {
                                setDrawMode('circle');
                                circleCenterRef.current = null;
                            }}
                            className={`p-3 rounded-xl flex items-center gap-2 transition-all ${drawMode === 'circle' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <CircleIcon className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Pivô (Círculo)</span>
                        </button>
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
                                    {areaHectares.toFixed(2)} <span className="text-sm text-gray-400 font-bold ml-1">HECTARES</span>
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
        </div>
    );
}
