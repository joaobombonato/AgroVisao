/**
 * Map Configuration - Constantes e Configurações do Mapa
 * 
 * Centraliza ícones, tiles e outras configurações estáticas do Leaflet.
 */
import L from 'leaflet';

// Ícone padrão para marcadores
export const defaultIcon = L.icon({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Ícone para marcadores de edição (pontos do polígono)
export const editIcon = L.divIcon({
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

// Camadas de tiles disponíveis
export const TILE_LAYERS = {
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

// Aplica o ícone padrão globalmente
L.Marker.prototype.options.icon = defaultIcon;
