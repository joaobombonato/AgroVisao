import L from 'leaflet';

/**
 * Calcula a área em hectares de um polígono definido por pontos LatLng.
 * Usa a fórmula esférica para cálculo preciso.
 */
export function calculateAreaHectares(latlngs: L.LatLng[]): number {
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

/**
 * Converte pontos LatLng para formato GeoJSON Feature (Polygon).
 */
export function pointsToGeoJSON(points: L.LatLng[]): any {
  if (points.length < 3) return null;
  const coordinates = points.map(p => [p.lng, p.lat]);
  coordinates.push(coordinates[0]); // Fechar o polígono
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [coordinates]
    }
  };
}

/**
 * Tipo para os overlays de índices de vegetação.
 */
export type OverlayType = 'none' | 'ndvi' | 'truecolor' | 'savi' | 'evi' | 'ndre' | 'ndmi';
