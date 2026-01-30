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
 * Converte um círculo (centro e raio) em um polígono aproximado.
 */
export function circleToPolygon(center: L.LatLng, radiusMeters: number, segments: number = 64): L.LatLng[] {
  const points: L.LatLng[] = [];
  const km = radiusMeters / 1000;
  const radiusLat = (km / 6371) * (180 / Math.PI);
  const radiusLng = radiusLat / Math.cos(center.lat * (Math.PI / 180));

  for (let i = 0; i < segments; i++) {
    const theta = (i / segments) * (2 * Math.PI);
    const lat = center.lat + radiusLat * Math.sin(theta);
    const lng = center.lng + radiusLng * Math.cos(theta);
    points.push(L.latLng(lat, lng));
  }
  return points;
}

import * as turf from '@turf/turf';

/**
 * Recorta um polígono para que fique dentro do limite da fazenda.
 */
export function clipPolygonToBoundary(polygonPoints: L.LatLng[], farmGeoJSON: any): L.LatLng[] {
  if (!farmGeoJSON || polygonPoints.length < 3) return polygonPoints;

  try {
    // Criar polígono do talhão (precisa ser fechado para o turf)
    const coords = polygonPoints.map(p => [p.lng, p.lat]);
    coords.push([polygonPoints[0].lng, polygonPoints[0].lat]);
    const poly1 = turf.polygon([coords]);

    // Extrair geometria da fazenda
    let poly2: any;
    if (farmGeoJSON.type === 'FeatureCollection') {
      poly2 = farmGeoJSON.features[0];
    } else if (farmGeoJSON.type === 'Feature') {
      poly2 = farmGeoJSON;
    } else if (farmGeoJSON.geometry) {
      poly2 = turf.feature(farmGeoJSON.geometry);
    } else {
      poly2 = turf.feature(farmGeoJSON);
    }

    // Intersecção
    const intersection = turf.intersect(turf.featureCollection([poly1, poly2]));
    
    if (!intersection) {
      return []; // Totalmente fora
    }

    // Converter resultado de volta para LatLng[]
    const geom = intersection.geometry;
    if (geom.type === 'Polygon') {
      return geom.coordinates[0].slice(0, -1).map((c: any) => L.latLng(c[1], c[0]));
    } else if (geom.type === 'MultiPolygon') {
      // Se fragmentar, pegamos o maior pedaço ou o primeiro
      const firstPart = geom.coordinates[0][0];
      return firstPart.slice(0, -1).map((c: any) => L.latLng(c[1], c[0]));
    }
  } catch (err) {
    console.error("Erro ao recortar talhão:", err);
  }

  return polygonPoints;
}

/**
 * Subtrai uma lista de polígonos de um polígono alvo.
 * Útil para evitar sobreposição de talhões.
 */
export function subtractPolygons(targetPoints: L.LatLng[], existingTalhoes: any[]): L.LatLng[] {
  if (!existingTalhoes || existingTalhoes.length === 0 || targetPoints.length < 3) return targetPoints;

  try {
    const targetCoords = targetPoints.map(p => [p.lng, p.lat]);
    targetCoords.push([targetPoints[0].lng, targetPoints[0].lat]);
    let targetPoly = turf.polygon([targetCoords]);

    for (const talhao of existingTalhoes) {
      if (!talhao.geometry) continue;

      try {
        // Normaliza a geometria existente (pode ser Polygon, MultiPolygon ou Feature)
        const existingFeature = turf.feature(talhao.geometry.geometry || talhao.geometry);
        
        if (!existingFeature.geometry || (existingFeature.geometry.type !== 'Polygon' && existingFeature.geometry.type !== 'MultiPolygon')) {
            continue;
        }

        // Subtrai a área do talhão existente do nosso novo talhão
        const diff = turf.difference(turf.featureCollection([targetPoly, existingFeature as any]));
        
        if (!diff) {
          return []; // Foi totalmente "engolido" por um talhão existente
        }
        targetPoly = diff as any;
      } catch (err) {
        console.warn("Falha ao processar talhão para subtração:", err);
        continue;
      }
    }

    // Converter resultado de volta para LatLng[]
    const geom = targetPoly.geometry as any;
    if (geom.type === 'Polygon') {
      return geom.coordinates[0].slice(0, -1).map((c: any) => L.latLng(c[1], c[0]));
    } else if (geom.type === 'MultiPolygon') {
      // Pega a maior parte em caso de fragmentação
      const allParts = geom.coordinates.map((poly: any) => poly[0]);
      let largestPart = allParts[0];
      let maxArea = 0;
      
      allParts.forEach((part: any) => {
          const area = turf.area(turf.polygon([part]));
          if (area > maxArea) {
              maxArea = area;
              largestPart = part;
          }
      });
      
      return largestPart.slice(0, -1).map((c: any) => L.latLng(c[1], c[0]));
    }
  } catch (err) {
    console.error("Erro fatal ao subtrair talhões:", err);
  }

  return targetPoints;
}

/**
 * Tipo para os overlays de índices de vegetação.
 */
export type OverlayType = 'none' | 'ndvi' | 'truecolor' | 'savi' | 'evi' | 'ndre' | 'ndmi';
