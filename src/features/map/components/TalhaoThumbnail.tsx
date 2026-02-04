import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Props {
  geometry: any;
  color?: string;
  size?: number;
}

/**
 * Componente que renderiza um mini-mapa (thumbnail) de um Talhão usando Leaflet.
 * Exibe a imagem de satélite real (Esri) como fundo.
 */
export const TalhaoThumbnail: React.FC<Props> = ({ geometry, color = '#10b981', size = 160 }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || !geometry) return;

    // Inicializa o mapa se não existir
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        scrollWheelZoom: false,
        boxZoom: false,
        keyboard: false
      });

      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;

    // Limpa camadas anteriores (exceto o tileLayer)
    map.eachLayer((layer) => {
      if (layer instanceof L.GeoJSON) {
        map.removeLayer(layer);
      }
    });

    try {
      // Adiciona o polígono do talhão
      const geoLayer = L.geoJSON(geometry, {
        style: {
          color: color,
          weight: 3,
          fillOpacity: 0
        }
      }).addTo(map);

      // Ajusta o zoom para enquadrar o talhão
      const bounds = geoLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [10, 10] });
      }
    } catch (err) {
      console.error("Erro ao renderizar geometria no thumbnail:", err);
    }

    // Cleanup opcional: não destruímos o mapa para evitar flickering em re-renders rápidos,
    // mas se o componente for desmontado definitivamente, o Leaflet cuida ou podemos adicionar aqui.
    return () => {
      // Se quiser destruir sempre:
      // map.remove();
      // mapInstanceRef.current = null;
    };
  }, [geometry, color]);

  return (
    <div 
      ref={mapContainerRef} 
      style={{ 
        width: size, 
        height: size, 
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid #e5e7eb',
        backgroundColor: '#f3f4f6'
      }}
      className="shadow-inner pointer-events-none"
    />
  );
};
