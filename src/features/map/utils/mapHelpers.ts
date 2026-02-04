import L from 'leaflet';

/**
 * Calcula a área em hectares de um polígono definido por pontos LatLng.
 * Usa a fórmula esférica para cálculo preciso.
 */
export function calculateAreaHectares(latlngs: L.LatLng[]): number {
  if (!latlngs || latlngs.length < 3) return 0;
  
  // Limpeza preventiva: remove pontos inválidos
  const validPoints = latlngs.filter(p => p && typeof p.lat === 'number' && typeof p.lng === 'number');
  if (validPoints.length < 3) return 0;

  const EARTH_RADIUS = 6378137;
  const toRad = (deg: number) => deg * Math.PI / 180;
  let total = 0;
  const n = validPoints.length;
  for (let i = 0; i < n; i++) {
    const p1 = validPoints[i];
    const p2 = validPoints[(i + 1) % n];
    total += toRad(p2.lng - p1.lng) * (2 + Math.sin(toRad(p1.lat)) + Math.sin(toRad(p2.lat)));
  }
  const area = Math.abs(total * EARTH_RADIUS * EARTH_RADIUS / 2);
  return area / 10000;
}

/**
 * Converte pontos LatLng para formato GeoJSON Feature (Polygon).
 */
export function pointsToGeoJSON(points: L.LatLng[]): any {
  if (!points || points.length < 3) return null;
  const validPoints = points.filter(p => p && typeof p.lat === 'number' && typeof p.lng === 'number');
  if (validPoints.length < 3) return null;

  const coordinates = validPoints.map(p => [p.lng, p.lat]);
  coordinates.push(coordinates[0]); // Fechar o polígono
  return turf.polygon([coordinates]);
}

/**
 * Converte várias listas de pontos em um único MultiPolygon GeoJSON
 */
export function multiPartsToGeoJSON(parts: L.LatLng[][]): any {
  if (!parts || parts.length === 0) return null;

  try {
    const polygons = parts
      .map(p => {
        if (!p || p.length < 3) return null;
        
        // Remove pontos duplicados adjacentes
        const coords: number[][] = [];
        p.forEach(pt => {
          if (coords.length === 0 || pt.lng !== coords[coords.length - 1][0] || pt.lat !== coords[coords.length - 1][1]) {
            coords.push([pt.lng, pt.lat]);
          }
        });

        // Fecha o polígono se necessário
        if (coords.length >= 3 && (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1])) {
          coords.push([coords[0][0], coords[0][1]]);
        }

        // Validação mínima para o Turf (4 pontos para um polígono fechado)
        if (coords.length < 4) return null;
        
        return [coords];
      })
      .filter((p): p is number[][][] => p !== null);

    if (polygons.length === 0) return null;
    if (polygons.length === 1) return turf.polygon(polygons[0]);
    return turf.multiPolygon(polygons);
  } catch (err) {
    console.error("Erro ao converter múltiplas partes para GeoJSON:", err);
    return null;
  }
}

/**
 * Converte um círculo (centro e raio) em um polígono aproximado.
 */
export function circleToPolygon(center: L.LatLng, radiusMeters: number, segments: number = 64): L.LatLng[] {
  if (!center || typeof center.lat !== 'number' || typeof center.lng !== 'number') return [];
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
 * Recorta um polígono (GeoJSON) para que fique dentro do limite da fazenda.
 * Retorna uma Feature GeoJSON (Polygon ou MultiPolygon).
 */
export function clipGeoJSONToBoundary(targetFeature: any, farmGeoJSON: any): any {
  if (!farmGeoJSON || !targetFeature) return targetFeature;

  try {
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

    // Limpa coordenadas e trunca para evitar erros de precisão flutuante
    const cleanTarget = turf.truncate(turf.cleanCoords(targetFeature), { precision: 7 });
    const cleanBoundary = turf.truncate(turf.cleanCoords(poly2), { precision: 7 });
    
    const intersection = turf.intersect(turf.featureCollection([cleanTarget, cleanBoundary]));
    
    if (!intersection) return null;

    // Simplificação para evitar excesso de vértices em curvas de pivô
    return turf.simplify(intersection, { tolerance: 0.00001, highQuality: true });
  } catch (err) {
    console.error("Erro ao recortar GeoJSON:", err);
    return targetFeature;
  }
}

/**
 * Subtrai uma lista de talhões de uma geometria alvo.
 * Suporta preservação de furos e fragmentos (MultiPolygon).
 */
export function subtractGeoJSON(targetFeature: any, existingTalhoes: any[]): any {
  try {
    if (!existingTalhoes || existingTalhoes.length === 0 || !targetFeature) return targetFeature;

    // Proteção inicial: Valida geometria alvo
    let result: any;
    try {
        result = turf.truncate(turf.cleanCoords(targetFeature), { precision: 7 });
    } catch (e) {
        // console.warn('Erro ao limpar targetFeature, usando original:', e);
        result = targetFeature;
    }

    if (!result) return targetFeature;

    for (const talhao of existingTalhoes) {
      if (!talhao.geometry) continue;
      try {
        const shieldGeom = talhao.geometry.geometry || talhao.geometry;
        
        // Proteção: Ignora geometrias inválidas ou vazias no escudo
        if (!shieldGeom || !shieldGeom.coordinates || shieldGeom.coordinates.length === 0) continue;
        if (shieldGeom.type === 'Polygon' && shieldGeom.coordinates[0]?.length < 4) continue;
        if (shieldGeom.type === 'MultiPolygon' && shieldGeom.coordinates[0]?.[0]?.length < 4) continue;
        
        // Proteção na criação do escudo
        let shield: any;
        try {
             shield = turf.truncate(turf.cleanCoords(turf.feature(shieldGeom)), { precision: 7 });
        } catch(e) { continue; }
        
        // Tenta a subtração
        const diff = turf.difference(turf.featureCollection([result, shield as any]));
        
        // Validação rigorosa do resultado da diferença
        if (diff && diff.geometry) {
            // Verifica se a geometria resultante é válida antes de aceitar
            const geom = diff.geometry;
            if (geom.type === 'Polygon' && geom.coordinates[0]?.length < 4) {
                 // Resultado degenerou, ignora essa subtração specific
                 continue;
            }
            result = diff;
        }
      } catch (e) {
        // Erros matemáticos do Turf em casos de borda devem ser ignorados para não abortar todo o processo
        // console.warn('Pulo de subtração (safe):', e);
      }
    }

    if (result) {
        try {
            const finalClean = turf.truncate(turf.cleanCoords(result), { precision: 6 });
            return finalClean;
        } catch (e) {
            return result;
        }
    }
    return null;
  } catch (err) {
    console.error("Erro fatal na subtração GeoJSON (Retornando original):", err);
    return targetFeature;
  }
}

export function clipPolygonToBoundary(polygonPoints: L.LatLng[], farmGeoJSON: any): L.LatLng[] {
  if (!farmGeoJSON || polygonPoints.length < 3) return polygonPoints;
  const poly = pointsToGeoJSON(polygonPoints);
  const clipped = clipGeoJSONToBoundary(poly, farmGeoJSON);
  if (!clipped) return [];
  
  const geom = clipped.geometry;
  if (geom.type === 'Polygon') {
    return geom.coordinates[0].slice(0, -1).map((c: any) => L.latLng(c[1], c[0]));
  } else if (geom.type === 'MultiPolygon') {
    const largest = geom.coordinates.reduce((a: any, b: any) => 
      turf.area(turf.polygon([a[0]])) > turf.area(turf.polygon([b[0]])) ? a : b
    );
    return largest[0].slice(0, -1).map((c: any) => L.latLng(c[1], c[0]));
  }
  return polygonPoints;
}

/**
 * Subtrai uma lista de polígonos de um polígono alvo.
 * Útil para evitar sobreposição de talhões.
 */
export function subtractPolygons(targetPoints: L.LatLng[], existingTalhoes: any[]): L.LatLng[] {
  if (!existingTalhoes || existingTalhoes.length === 0 || targetPoints.length < 3) return targetPoints;
  const poly = pointsToGeoJSON(targetPoints);
  const diff = subtractGeoJSON(poly, existingTalhoes);
  if (!diff) return [];

  const geom = diff.geometry;
  if (geom.type === 'Polygon') {
    return geom.coordinates[0].slice(0, -1).map((c: any) => L.latLng(c[1], c[0]));
  } else if (geom.type === 'MultiPolygon') {
    const largest = geom.coordinates.reduce((a: any, b: any) => 
      turf.area(turf.polygon([a[0]])) > turf.area(turf.polygon([b[0]])) ? a : b
    );
    return largest[0].slice(0, -1).map((c: any) => L.latLng(c[1], c[0]));
  }
  return targetPoints;
}

/**
 * Tipo para os overlays de índices de vegetação.
 */
export type OverlayType = 'none' | 'ndvi' | 'truecolor' | 'savi' | 'evi' | 'ndre' | 'ndmi';
